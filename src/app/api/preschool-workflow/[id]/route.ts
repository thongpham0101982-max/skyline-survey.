import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireStaffSession } from "@/lib/security-guard"
import {
  appendPreschoolAuditLog,
  ensurePreschoolWorkflowSchema,
  generateId,
  getStudentAuditLogs,
  getStudentRounds,
  getWorkflowStudentRow,
} from "@/lib/preschool-workflow-db"
import {
  PRESCHOOL_FORM_REGISTRY,
  canViewSensitiveHealth,
  canViewSensitivePsychology,
  evaluatePreApprovalGate,
  getNormalizedRoles,
  sanitizeRoundForViewer,
  suggestPreschoolForm,
  validateFollowUpBusinessDays,
} from "@/lib/preschool-workflow"
import {
  generatePreschoolB10ApprovalEmailHtml,
  renderPreschoolPsychologyScreeningEmailHtml,
} from "@/lib/preschool-approval-service"
import { sendEmail } from "@/lib/mail"
import { executeEntranceWorkflowAction } from "@/lib/entrance-progress/entranceProgressEngine"

const ADMIN_OR_KT = new Set(["ADMIN", "SUPER_ADMIN", "SUPERADMIN", "KTDBCL", "KT_DBCL", "KHAO_THI"])
const REVIEWER_ROLES = new Set([...ADMIN_OR_KT, "BGH", "BGH_MN", "NHOM_TRUONG_MN", "GDCS", "BGH_CS"])
const APPROVER_ROLES = new Set([...ADMIN_OR_KT, "GDCS", "GD_CS", "GĐCS", "GĐ_CS"])
const GIAOVU_ROLES = new Set([...ADMIN_OR_KT, "GIAO_VU", "GIAOVU", "GIAO_VU_CS", "BGH_MN", "NHOM_TRUONG_MN", "GDCS"])
const TUVAN_ROLES = new Set([...ADMIN_OR_KT, "TU_VAN", "TU_VAN_TUYEN_SINH", "TUYENSINH", "GIAO_VU", "GIAO_VU_CS"])
const MEDICAL_ROLES = new Set([...ADMIN_OR_KT, "Y_TE", "BGH_MN", "NHOM_TRUONG_MN", "GDCS"])

function hasAnyRole(roles: string[], allowed: Set<string>): boolean {
  return roles.some((r) => allowed.has(r))
}

async function ensureActiveRound(student: any): Promise<any> {
  const rounds = await getStudentRounds(student.id)
  if (rounds.length > 0) return rounds[rounds.length - 1]

  const nowIso = new Date().toISOString()
  const roundId = generateId("ps_rnd")
  const intakeMode = student.intakeMode === "HOC_TRAI_NGHIEM" ? "HOC_TRAI_NGHIEM" : "KHAO_SAT_MOI"
  const suggestion = suggestPreschoolForm({
    dateOfBirth: student.dateOfBirth,
    surveyDate: student.appointmentAt || student.createdAt,
    grade: student.grade,
    surveySystem: student.surveySystem,
  })

  await prisma.$executeRawUnsafe(
    `INSERT INTO "PreschoolAssessmentRound"
      ("id", "studentId", "roundNumber", "roundType", "status", "scheduledAt", "campusName",
       "suggestedFormCode", "formCode", "formVersion", "isAgeBoundary", "ageBoundaryReason",
       "createdAt", "updatedAt")
     VALUES (?, ?, 1, ?, 'SCHEDULED', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    roundId,
    student.id,
    intakeMode,
    student.appointmentAt || student.createdAt || nowIso,
    student.registeredCampus || student.admissionCampus || null,
    suggestion.suggestedFormCode,
    suggestion.isAgeBoundary ? null : suggestion.suggestedFormCode,
    suggestion.formVersion,
    suggestion.isAgeBoundary ? 1 : 0,
    suggestion.boundaryReason,
    nowIso,
    nowIso
  )

  const created = await getStudentRounds(student.id)
  return created[created.length - 1]
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireStaffSession()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await context.params
    await ensurePreschoolWorkflowSchema()

    const studentRaw = await getWorkflowStudentRow(id)
    if (!studentRaw) {
      return NextResponse.json({ error: "Không tìm thấy hồ sơ trẻ." }, { status: 404 })
    }

    // Derive accurate legacy status & approved outcome for pre-existing records
    const legacyScoresList = await (prisma as any).preschoolDevScore.findMany({
      where: { studentId: id },
      include: { criteria: { include: { area: true } } },
    }).catch(() => [])
    const hasLegacyScores = legacyScoresList.length > 0

    // Extract height/weight & counts from PreschoolDevScore for unified B4A & B5/B4B visibility
    let legacyHeightCm: number | null = null
    let legacyWeightKg: number | null = null
    let legacyDatCount = 0
    let legacyKhongDatCount = 0
    let legacyChuaTheHienCount = 0
    for (const sc of legacyScoresList) {
      const cCode = String(sc.criteria?.code || "").toUpperCase()
      const cName = String(sc.criteria?.name || "").toLowerCase()
      if (cCode.endsWith("_01") || cName.includes("chiều cao")) {
        const rawPart = sc.note?.includes("|") ? sc.note.split("|")[0] : sc.note || ""
        const num = parseFloat(String(rawPart).replace(/[^\d.]/g, ""))
        if (!isNaN(num) && num > 0) legacyHeightCm = num
      } else if (cCode.endsWith("_02") || cName.includes("cân nặng")) {
        const rawPart = sc.note?.includes("|") ? sc.note.split("|")[0] : sc.note || ""
        const num = parseFloat(String(rawPart).replace(/[^\d.]/g, ""))
        if (!isNaN(num) && num > 0) legacyWeightKg = num
      }
      if (sc.result === "DAT") legacyDatCount++
      else if (sc.result === "KHONG_DAT") legacyKhongDatCount++
      else legacyChuaTheHienCount++
    }

    // Fetch batch/period teacher & medical assignments for this student
    const batchAssignments = studentRaw.periodId
      ? await (prisma as any).preschoolInputAssessmentTeacherAssignment.findMany({
          where: {
            periodId: studentRaw.periodId,
            OR: studentRaw.batchId ? [{ batchId: studentRaw.batchId }, { batchId: null }] : [{ batchId: null }],
          },
          include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
        }).catch(() => [])
      : []

    const normGrade = String(studentRaw.grade || "").toLowerCase().trim()
    const batchMedicalNames: string[] = []
    const batchTeacherNames: string[] = []
    for (const a of batchAssignments) {
      const ag = String(a.grade || "").trim()
      const uName = a.user?.fullName
      if (!uName) continue
      if (ag === "Y_TE_B4A") {
        if (!batchMedicalNames.includes(uName)) batchMedicalNames.push(uName)
      } else {
        const agLow = ag.toLowerCase()
        const matched =
          !normGrade ||
          agLow === normGrade ||
          (normGrade.includes("12") && agLow.includes("12")) ||
          (normGrade.includes("18") && agLow.includes("18")) ||
          (normGrade.includes("24") && agLow.includes("24")) ||
          ((normGrade.includes("3") || normGrade.includes("bé")) && (agLow.includes("3") || agLow.includes("bé"))) ||
          ((normGrade.includes("4") || normGrade.includes("nhỡ")) && (agLow.includes("4") || agLow.includes("nhỡ"))) ||
          ((normGrade.includes("5") || normGrade.includes("lớn")) && (agLow.includes("5") || agLow.includes("lớn")))
        if (matched && !batchTeacherNames.includes(uName)) batchTeacherNames.push(uName)
      }
    }

    // Categorized staff directory: GVCN / Mầm non, Tổ Y tế, Tổ Tâm lý (khi cần), Khác
    const rawUsers = await (prisma as any).user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        teacher: {
          select: {
            id: true,
            teacherName: true,
            departmentRel: { select: { name: true } },
            classes: {
              select: { className: true, grade: true },
              take: 2,
            },
          },
        },
      },
      orderBy: { fullName: "asc" },
    }).catch(() => [])

    const homeroomTeachers: any[] = []
    const medicalStaff: any[] = []
    const psychologyStaff: any[] = []
    const otherStaff: any[] = []

    for (const u of rawUsers) {
      const deptName = String(u.teacher?.departmentRel?.name || "").trim()
      const deptNorm = deptName.toLowerCase().normalize("NFC")
      const roleNorm = String(u.role || "").toUpperCase()
      const hrClasses = (u.teacher?.classes || []).map((c: any) => c.className).filter(Boolean)
      const entry = {
        id: u.id,
        fullName: u.fullName || u.teacher?.teacherName || u.email,
        email: u.email || "",
        role: u.role || "",
        departmentName: deptName,
        homeroomClasses: hrClasses,
      }
      if (roleNorm === "Y_TE" || deptNorm.includes("y tế") || deptNorm.includes("y te") || deptNorm.includes("sức khỏe")) {
        medicalStaff.push(entry)
      } else if (roleNorm === "TAM_LY" || deptNorm.includes("tâm lý") || deptNorm.includes("tam ly") || deptNorm.includes("tham vấn")) {
        psychologyStaff.push(entry)
      } else if (
        hrClasses.length > 0 ||
        deptNorm.includes("mầm non") ||
        deptNorm.includes("nhà trẻ") ||
        deptNorm.includes("mẫu giáo") ||
        roleNorm === "TEACHER" ||
        roleNorm === "GVCN" ||
        roleNorm === "BGH_MN"
      ) {
        homeroomTeachers.push(entry)
      } else {
        otherStaff.push(entry)
      }
    }
    const admNorm = String(studentRaw.admissionResult || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .trim()
    let derivedOutcome = studentRaw.finalApprovedOutcome || null
    if (!derivedOutcome && studentRaw.gdcsApprovalStatus) {
      const g = String(studentRaw.gdcsApprovalStatus).toUpperCase()
      derivedOutcome = g === "KHONG_DAT" || g === "CHUA_DAT" ? "CHUA_DAT" : "DAT"
    } else if (!derivedOutcome && admNorm && !admNorm.includes("CHUA DUYET") && !admNorm.includes("CHO DUYET")) {
      if (admNorm.includes("KHONG DAT") || admNorm.includes("CHUA DAT")) derivedOutcome = "CHUA_DAT"
      else if (admNorm.includes("DAT") || admNorm.includes("MIEN HOC THU") || admNorm.includes("SAU HOC THU")) derivedOutcome = "DAT"
    }
    let derivedStatus = studentRaw.workflowStatus || "DA_HEN"
    if (derivedStatus === "DA_HEN") {
      if (studentRaw.archivedAt) derivedStatus = "DA_LUU_HO_SO"
      else if (studentRaw.resultDeliveredAt) derivedStatus = "DA_TRA_KET_QUA"
      else if (derivedOutcome) derivedStatus = "DA_DUYET"
      else if (studentRaw.bghApprovalStatus) derivedStatus = "CHO_DUYET"
      else if (studentRaw.devAssessmentResult || studentRaw.devProfessionalComment || hasLegacyScores) derivedStatus = "DANG_DANH_GIA"
    }
    const student = {
      ...studentRaw,
      workflowStatus: derivedStatus,
      finalApprovedOutcome: derivedOutcome,
      surveySystem: studentRaw.surveySystem || studentRaw.surveyFormType || "Hệ S",
    }

    const activeRoundRaw = await ensureActiveRound(student)
    const allRoundsRaw = await getStudentRounds(id)
    const rawAuditLogs = await getStudentAuditLogs(id)
    const userRoles = getNormalizedRoles(ctx.role, ctx.roles)

    // Tổng hợp đầy đủ lược sử từ cả PreschoolWorkflowAuditLog và dữ liệu thực tế trên hồ sơ (tiếp nhận, phân công, chấm điểm, học trải nghiệm, BGH/GĐCS duyệt)
    const existingActions = new Set(rawAuditLogs.map((l: any) => String(l.action || "").toUpperCase()))
    const synthesizedLogs: any[] = []

    if (student.createdAt && !existingActions.has("CREATE_INTAKE")) {
      synthesizedLogs.push({
        id: `syn-intake-${student.id}`,
        action: "CREATE_INTAKE",
        fromStatus: null,
        toStatus: "DA_HEN",
        actorName: student.ownerUserName || "Tuyển sinh / Giáo vụ",
        actorRole: "TU_VAN",
        source: "PORTAL",
        detailText: `Tiếp nhận hồ sơ trẻ ${student.fullName} (${student.studentCode}) · Cơ sở ${student.registeredCampus || student.admissionCampus || "—"} · ${student.grade || "—"} (${student.surveySystem || "Hệ S"})`,
        createdAt: student.createdAt,
      })
    }

    if ((batchTeacherNames.length > 0 || batchMedicalNames.length > 0) && !existingActions.has("ASSIGN_STAFF")) {
      const assignDates = batchAssignments.map((a: any) => a.createdAt).filter(Boolean).sort()
      const parts: string[] = []
      if (batchTeacherNames.length > 0) parts.push(`GV đánh giá: ${batchTeacherNames.join(", ")}`)
      if (batchMedicalNames.length > 0) parts.push(`Tổ Y tế (B4A): ${batchMedicalNames.join(", ")}`)
      synthesizedLogs.push({
        id: `syn-assign-${student.id}`,
        action: "ASSIGN_STAFF",
        fromStatus: null,
        toStatus: null,
        actorName: "Giáo vụ cơ sở",
        actorRole: "GIAO_VU",
        source: "PORTAL",
        detailText: parts.join(" · "),
        createdAt: assignDates[assignDates.length - 1] || student.createdAt || new Date().toISOString(),
      })
    }

    if (legacyScoresList.length > 0 && !existingActions.has("SUBMIT_EVALUATION")) {
      const scoreDates = legacyScoresList
        .map((sc: any) => sc.updatedAt || sc.createdAt)
        .filter(Boolean)
        .map((d: any) => new Date(d).getTime())
        .filter((t: number) => !isNaN(t))
      const latestScoreTs = scoreDates.length > 0 ? new Date(Math.max(...scoreDates)).toISOString() : student.updatedAt || student.createdAt
      const cmtSnippet = student.devProfessionalComment
        ? ` · Nhận xét: "${String(student.devProfessionalComment).trim().slice(0, 120)}${String(student.devProfessionalComment).trim().length > 120 ? "…" : ""}"`
        : ""
      synthesizedLogs.push({
        id: `syn-eval-${student.id}`,
        action: "SUBMIT_EVALUATION",
        fromStatus: "DA_HEN",
        toStatus: "DANG_DANH_GIA",
        actorName: activeRoundRaw?.assignedTeacherName || batchTeacherNames[0] || "Giáo viên khảo sát",
        actorRole: "TEACHER",
        source: "PORTAL",
        detailText: `Đã chấm ${legacyScoresList.length} tiêu chí: ${legacyDatCount} Đạt · ${legacyChuaTheHienCount} Chưa thể hiện${legacyKhongDatCount > 0 ? ` · ${legacyKhongDatCount} Không đạt` : ""}${cmtSnippet}`,
        createdAt: latestScoreTs || new Date().toISOString(),
      })
    }

    if (student.probationaryTeacher || student.probationaryClass) {
      synthesizedLogs.push({
        id: `syn-trial-assign-${student.id}`,
        action: "ASSIGN_TRIAL",
        fromStatus: null,
        toStatus: null,
        actorName: "Giáo vụ / BGH Mầm non",
        actorRole: "GIAO_VU",
        source: "PORTAL",
        detailText: `Phân lớp học trải nghiệm: ${student.probationaryClass || "—"} · GV phụ trách: ${student.probationaryTeacher || "—"}`,
        createdAt: student.updatedAt || student.createdAt || new Date().toISOString(),
      })
    }

    if (student.bghApprovalStatus && !existingActions.has("REVIEW_B6_B9A")) {
      synthesizedLogs.push({
        id: `syn-bgh-${student.id}`,
        action: "REVIEW_B6_B9A",
        fromStatus: "DANG_DANH_GIA",
        toStatus: "CHO_DUYET",
        actorName: student.bghApprovalUser || "BGH Mầm non",
        actorRole: "BGH_MN",
        source: "PORTAL",
        detailText: `Kết quả BGH MN duyệt: ${student.bghApprovalStatus}${student.bghApprovalComment ? ` · "${student.bghApprovalComment}"` : ""}`,
        createdAt: student.bghApprovalDate || student.updatedAt || student.createdAt || new Date().toISOString(),
      })
    }

    if (student.probationaryBghStatus) {
      synthesizedLogs.push({
        id: `syn-trial-bgh-${student.id}`,
        action: "BGH_TRIAL_APPROVE",
        fromStatus: null,
        toStatus: null,
        actorName: student.probationaryBghUser || "BGH Mầm non",
        actorRole: "BGH_MN",
        source: "PORTAL",
        detailText: `BGH duyệt kết quả học trải nghiệm: ${student.probationaryBghStatus}${student.probationaryBghComment ? ` · "${student.probationaryBghComment}"` : ""}`,
        createdAt: student.probationaryBghDate || student.updatedAt || student.createdAt || new Date().toISOString(),
      })
    }

    if (student.gdcsApprovalStatus && !existingActions.has("APPROVE_B10")) {
      synthesizedLogs.push({
        id: `syn-gdcs-${student.id}`,
        action: "APPROVE_B10",
        fromStatus: "CHO_DUYET",
        toStatus: "DA_DUYET",
        actorName: student.gdcsApprovalUser || "Giám đốc Cơ sở",
        actorRole: "GDCS",
        source: "PORTAL",
        detailText: `GĐCS phê duyệt: ${student.gdcsApprovalStatus}${student.gdcsApprovalComment ? ` · "${student.gdcsApprovalComment}"` : ""}`,
        createdAt: student.gdcsApprovalDate || student.updatedAt || student.createdAt || new Date().toISOString(),
      })
    }

    const auditLogs = [...rawAuditLogs, ...synthesizedLogs].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )

    const hasTrial = Boolean(
      student.probationaryClass ||
        student.probationaryTeacher ||
        student.probationaryResult ||
        student.probationaryBghStatus
    )
    const hasPsychology = Boolean(
      Number(student.trialPsychologyScreening || 0) === 1 ||
        student.trialPsychologistName ||
        student.trialPsychologyStatus ||
        activeRoundRaw?.psychologyRequired ||
        activeRoundRaw?.psychologistSubmittedAt ||
        activeRoundRaw?.psychologyPayloadJson
    )

    // Đồng bộ fallback kết quả B6/B9A & B10 từ hồ sơ student (nếu đã lưu từ Phiếu đánh giá phát triển)
    const mapStudentBghToReview = (s?: string | null) => {
      const v = String(s || "").toUpperCase().trim()
      if (v === "DE_XUAT_DAT" || v === "DAT" || v === "DAT_MIEN_HOC_THU") return "DE_XUAT_DAT"
      if (v === "DE_XUAT_CHUA_DAT" || v === "KHONG_DAT" || v === "CHUA_DAT") return "DE_XUAT_CHUA_DAT"
      if (v === "HEN_TRAI_NGHIEM" || v === "DAT_HOC_THU") return "HEN_TRAI_NGHIEM_BO_SUNG"
      return null
    }
    const mapStudentGdcsToDecision = (s?: string | null) => {
      const v = String(s || "").toUpperCase().trim()
      if (v === "DAT" || v === "DAT_MIEN_HOC_THU" || v === "DAT_HOC_THU") return "DAT"
      if (v === "KHONG_DAT" || v === "CHUA_DAT") return "CHUA_DAT"
      return null
    }

    const enrichedActiveRoundRaw = activeRoundRaw
      ? {
          ...activeRoundRaw,
          reviewDecision: activeRoundRaw.reviewDecision || mapStudentBghToReview(student.bghApprovalStatus),
          reviewComment: activeRoundRaw.reviewComment || student.bghApprovalComment || null,
          reviewedByName: activeRoundRaw.reviewedByName || student.bghApprovalUser || null,
          reviewedAt: activeRoundRaw.reviewedAt || student.bghApprovalDate || null,
          gdcsDecision: activeRoundRaw.gdcsDecision || mapStudentGdcsToDecision(student.gdcsApprovalStatus),
          gdcsComment: activeRoundRaw.gdcsComment || student.gdcsApprovalComment || null,
          gdcsUserName: activeRoundRaw.gdcsUserName || student.gdcsApprovalUser || null,
          gdcsApprovedAt: activeRoundRaw.gdcsApprovedAt || student.gdcsApprovalDate || null,
        }
      : null

    const rounds = allRoundsRaw.map((r) => {
      const merged =
        enrichedActiveRoundRaw && r.id === enrichedActiveRoundRaw.id ? enrichedActiveRoundRaw : r
      return sanitizeRoundForViewer(merged, { userId: ctx.userId, role: ctx.role, roles: ctx.roles })
    })
    const activeRound = rounds[rounds.length - 1] || null
    const gate = evaluatePreApprovalGate(enrichedActiveRoundRaw, {
      hasLegacyScores,
      hasTrial,
      hasPsychology,
      studentBghStatus: student.bghApprovalStatus,
    })

    const suggestion = suggestPreschoolForm({
      dateOfBirth: student.dateOfBirth,
      surveyDate: activeRoundRaw?.scheduledAt || student.appointmentAt || student.createdAt,
      grade: student.grade,
      surveySystem: student.surveySystem,
    })

    const canEditHealth =
      hasAnyRole(userRoles, MEDICAL_ROLES) || activeRoundRaw?.assignedMedicalId === ctx.userId
    const canEditEvaluation =
      hasAnyRole(userRoles, REVIEWER_ROLES) ||
      userRoles.includes("TEACHER") ||
      activeRoundRaw?.assignedTeacherId === ctx.userId
    const canEditPsychology =
      hasAnyRole(userRoles, REVIEWER_ROLES) ||
      activeRoundRaw?.assignedPsychologistId === ctx.userId ||
      activeRoundRaw?.assignedTeacherId === ctx.userId

    const viewerPermissions = {
      canConfirmIntake: hasAnyRole(userRoles, GIAOVU_ROLES) || hasAnyRole(userRoles, TUVAN_ROLES),
      canAssignStaff: hasAnyRole(userRoles, GIAOVU_ROLES),
      canViewHealth: canViewSensitiveHealth({
        userId: ctx.userId,
        role: ctx.role,
        roles: ctx.roles,
        assignedMedicalId: activeRoundRaw?.assignedMedicalId,
        assignedTeacherId: activeRoundRaw?.assignedTeacherId,
      }),
      canEditHealth,
      canEditEvaluation,
      canViewPsychology: canViewSensitivePsychology({
        userId: ctx.userId,
        role: ctx.role,
        roles: ctx.roles,
        assignedPsychologistId: activeRoundRaw?.assignedPsychologistId,
      }),
      canEditPsychology,
      canReviewB6B9A: hasAnyRole(userRoles, REVIEWER_ROLES),
      canScheduleFollowUp: hasAnyRole(userRoles, TUVAN_ROLES) || hasAnyRole(userRoles, REVIEWER_ROLES),
      canApproveB10: hasAnyRole(userRoles, APPROVER_ROLES),
      canIssueLetter: hasAnyRole(userRoles, GIAOVU_ROLES) || hasAnyRole(userRoles, TUVAN_ROLES),
      canConfirmDelivery: hasAnyRole(userRoles, TUVAN_ROLES),
      canArchive: hasAnyRole(userRoles, GIAOVU_ROLES) || hasAnyRole(userRoles, ADMIN_OR_KT),
    }

    return NextResponse.json({
      student,
      rounds,
      activeRound,
      auditLogs,
      suggestion,
      preApprovalGate: gate,
      viewerPermissions,
      staffDirectory: {
        homeroomTeachers,
        medicalStaff,
        psychologyStaff,
        otherStaff,
      },
      legacyDevSummary: {
        totalScored: legacyScoresList.length,
        datCount: legacyDatCount,
        khongDatCount: legacyKhongDatCount,
        chuaTheHienCount: legacyChuaTheHienCount,
        pctDat: legacyScoresList.length > 0 ? Math.round((legacyDatCount / legacyScoresList.length) * 100) : 0,
        heightCm: legacyHeightCm,
        weightKg: legacyWeightKg,
        assignedTeachersFromBatch: batchTeacherNames,
        assignedMedicalFromBatch: batchMedicalNames,
        scores: legacyScoresList.map((sc: any) => ({
          id: sc.id,
          criteriaCode: sc.criteria?.code || "",
          criteriaName: sc.criteria?.name || "",
          areaName: sc.criteria?.area?.name || "",
          result: sc.result || "",
          note: sc.note || "",
        })),
      },
    })
  } catch (err: any) {
    console.error("GET /api/preschool-workflow/[id] error:", err)
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireStaffSession()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await context.params
    await ensurePreschoolWorkflowSchema()

    const studentRaw = await getWorkflowStudentRow(id)
    if (!studentRaw) {
      return NextResponse.json({ error: "Không tìm thấy hồ sơ trẻ." }, { status: 404 })
    }

    // Derive accurate legacy status & approved outcome for pre-existing records
    const legacyScoresList = await (prisma as any).preschoolDevScore.findMany({
      where: { studentId: id },
      include: { criteria: { include: { area: true } } },
    }).catch(() => [])
    const hasLegacyScores = legacyScoresList.length > 0

    // Extract height/weight & counts from PreschoolDevScore for unified B4A & B5/B4B visibility
    let legacyHeightCm: number | null = null
    let legacyWeightKg: number | null = null
    let legacyDatCount = 0
    let legacyKhongDatCount = 0
    let legacyChuaTheHienCount = 0
    for (const sc of legacyScoresList) {
      const cCode = String(sc.criteria?.code || "").toUpperCase()
      const cName = String(sc.criteria?.name || "").toLowerCase()
      if (cCode.endsWith("_01") || cName.includes("chiều cao")) {
        const rawPart = sc.note?.includes("|") ? sc.note.split("|")[0] : sc.note || ""
        const num = parseFloat(String(rawPart).replace(/[^\d.]/g, ""))
        if (!isNaN(num) && num > 0) legacyHeightCm = num
      } else if (cCode.endsWith("_02") || cName.includes("cân nặng")) {
        const rawPart = sc.note?.includes("|") ? sc.note.split("|")[0] : sc.note || ""
        const num = parseFloat(String(rawPart).replace(/[^\d.]/g, ""))
        if (!isNaN(num) && num > 0) legacyWeightKg = num
      }
      if (sc.result === "DAT") legacyDatCount++
      else if (sc.result === "KHONG_DAT") legacyKhongDatCount++
      else legacyChuaTheHienCount++
    }

    // Fetch batch/period teacher & medical assignments for this student
    const batchAssignments = studentRaw.periodId
      ? await (prisma as any).preschoolInputAssessmentTeacherAssignment.findMany({
          where: {
            periodId: studentRaw.periodId,
            OR: studentRaw.batchId ? [{ batchId: studentRaw.batchId }, { batchId: null }] : [{ batchId: null }],
          },
          include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
        }).catch(() => [])
      : []

    const normGrade = String(studentRaw.grade || "").toLowerCase().trim()
    const batchMedicalNames: string[] = []
    const batchTeacherNames: string[] = []
    for (const a of batchAssignments) {
      const ag = String(a.grade || "").trim()
      const uName = a.user?.fullName
      if (!uName) continue
      if (ag === "Y_TE_B4A") {
        if (!batchMedicalNames.includes(uName)) batchMedicalNames.push(uName)
      } else {
        const agLow = ag.toLowerCase()
        const matched =
          !normGrade ||
          agLow === normGrade ||
          (normGrade.includes("12") && agLow.includes("12")) ||
          (normGrade.includes("18") && agLow.includes("18")) ||
          (normGrade.includes("24") && agLow.includes("24")) ||
          ((normGrade.includes("3") || normGrade.includes("bé")) && (agLow.includes("3") || agLow.includes("bé"))) ||
          ((normGrade.includes("4") || normGrade.includes("nhỡ")) && (agLow.includes("4") || agLow.includes("nhỡ"))) ||
          ((normGrade.includes("5") || normGrade.includes("lớn")) && (agLow.includes("5") || agLow.includes("lớn")))
        if (matched && !batchTeacherNames.includes(uName)) batchTeacherNames.push(uName)
      }
    }

    // Categorized staff directory: GVCN / Mầm non, Tổ Y tế, Tổ Tâm lý (khi cần), Khác
    const rawUsers = await (prisma as any).user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        teacher: {
          select: {
            id: true,
            teacherName: true,
            departmentRel: { select: { name: true } },
            classes: {
              select: { className: true, grade: true },
              take: 2,
            },
          },
        },
      },
      orderBy: { fullName: "asc" },
    }).catch(() => [])

    const homeroomTeachers: any[] = []
    const medicalStaff: any[] = []
    const psychologyStaff: any[] = []
    const otherStaff: any[] = []

    for (const u of rawUsers) {
      const deptName = String(u.teacher?.departmentRel?.name || "").trim()
      const deptNorm = deptName.toLowerCase().normalize("NFC")
      const roleNorm = String(u.role || "").toUpperCase()
      const hrClasses = (u.teacher?.classes || []).map((c: any) => c.className).filter(Boolean)
      const entry = {
        id: u.id,
        fullName: u.fullName || u.teacher?.teacherName || u.email,
        email: u.email || "",
        role: u.role || "",
        departmentName: deptName,
        homeroomClasses: hrClasses,
      }
      if (roleNorm === "Y_TE" || deptNorm.includes("y tế") || deptNorm.includes("y te") || deptNorm.includes("sức khỏe")) {
        medicalStaff.push(entry)
      } else if (roleNorm === "TAM_LY" || deptNorm.includes("tâm lý") || deptNorm.includes("tam ly") || deptNorm.includes("tham vấn")) {
        psychologyStaff.push(entry)
      } else if (
        hrClasses.length > 0 ||
        deptNorm.includes("mầm non") ||
        deptNorm.includes("nhà trẻ") ||
        deptNorm.includes("mẫu giáo") ||
        roleNorm === "TEACHER" ||
        roleNorm === "GVCN" ||
        roleNorm === "BGH_MN"
      ) {
        homeroomTeachers.push(entry)
      } else {
        otherStaff.push(entry)
      }
    }
    const admNorm = String(studentRaw.admissionResult || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .trim()
    let derivedOutcome = studentRaw.finalApprovedOutcome || null
    if (!derivedOutcome && studentRaw.gdcsApprovalStatus) {
      const g = String(studentRaw.gdcsApprovalStatus).toUpperCase()
      derivedOutcome = g === "KHONG_DAT" || g === "CHUA_DAT" ? "CHUA_DAT" : "DAT"
    } else if (!derivedOutcome && admNorm && !admNorm.includes("CHUA DUYET") && !admNorm.includes("CHO DUYET")) {
      if (admNorm.includes("KHONG DAT") || admNorm.includes("CHUA DAT")) derivedOutcome = "CHUA_DAT"
      else if (admNorm.includes("DAT") || admNorm.includes("MIEN HOC THU") || admNorm.includes("SAU HOC THU")) derivedOutcome = "DAT"
    }
    let derivedStatus = studentRaw.workflowStatus || "DA_HEN"
    if (derivedStatus === "DA_HEN") {
      if (studentRaw.archivedAt) derivedStatus = "DA_LUU_HO_SO"
      else if (studentRaw.resultDeliveredAt) derivedStatus = "DA_TRA_KET_QUA"
      else if (derivedOutcome) derivedStatus = "DA_DUYET"
      else if (studentRaw.bghApprovalStatus) derivedStatus = "CHO_DUYET"
      else if (studentRaw.devAssessmentResult || studentRaw.devProfessionalComment || hasLegacyScores) derivedStatus = "DANG_DANH_GIA"
    }
    const student = {
      ...studentRaw,
      workflowStatus: derivedStatus,
      finalApprovedOutcome: derivedOutcome,
      surveySystem: studentRaw.surveySystem || studentRaw.surveyFormType || "Hệ S",
    }

    const body = await req.json()
    const action = String(body.action || "").trim()
    const userRoles = getNormalizedRoles(ctx.role, ctx.roles)
    const actorName = ctx.user?.fullName || ctx.user?.name || ctx.userEmail || "Cán bộ SSM"
    const nowIso = new Date().toISOString()

    const activeRound = await ensureActiveRound(student)
    const targetRoundId = body.roundId || activeRound.id

    // 1. B3: Xác nhận đón trẻ & hình thức ("KHAO_SAT_MOI" | "HOC_TRAI_NGHIEM")
    if (action === "CONFIRM_INTAKE") {
      if (!hasAnyRole(userRoles, GIAOVU_ROLES) && !hasAnyRole(userRoles, TUVAN_ROLES)) {
        return NextResponse.json({ error: "Bạn không có quyền xác nhận đón trẻ." }, { status: 403 })
      }
      const intakeMode = body.intakeMode === "HOC_TRAI_NGHIEM" ? "HOC_TRAI_NGHIEM" : "KHAO_SAT_MOI"
      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolInputAssessmentStudent"
         SET "intakeMode" = ?, "workflowStatus" = 'DANG_DANH_GIA', "updatedAt" = ?
         WHERE "id" = ?`,
        intakeMode,
        nowIso,
        id
      )
      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolAssessmentRound"
         SET "roundType" = ?, "status" = 'IN_PROGRESS', "actualAt" = ?, "updatedAt" = ?
         WHERE "id" = ?`,
        intakeMode,
        nowIso,
        nowIso,
        targetRoundId
      )
      await appendPreschoolAuditLog({
        studentId: id,
        roundId: targetRoundId,
        action: "CONFIRM_INTAKE",
        fromStatus: student.workflowStatus,
        toStatus: "DANG_DANH_GIA",
        actorId: ctx.userId,
        actorName,
        actorRole: ctx.role,
        detail: { intakeMode },
      })
      return NextResponse.json({ success: true, workflowStatus: "DANG_DANH_GIA", intakeMode })
    }

    // 2. Phân công nhân sự (GV, Y tế, Tâm lý, Người phụ trách)
    if (action === "ASSIGN_STAFF") {
      if (!hasAnyRole(userRoles, GIAOVU_ROLES)) {
        return NextResponse.json({ error: "Bạn không có quyền phân công nhân sự khảo sát." }, { status: 403 })
      }
      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolAssessmentRound"
         SET "assignedTeacherId" = ?, "assignedTeacherName" = ?,
             "assignedMedicalId" = ?, "assignedMedicalName" = ?,
             "assignedPsychologistId" = ?, "assignedPsychologistName" = ?,
             "updatedAt" = ?
         WHERE "id" = ?`,
        body.assignedTeacherId ?? activeRound.assignedTeacherId ?? null,
        body.assignedTeacherName ?? activeRound.assignedTeacherName ?? null,
        body.assignedMedicalId ?? activeRound.assignedMedicalId ?? null,
        body.assignedMedicalName ?? activeRound.assignedMedicalName ?? null,
        body.assignedPsychologistId ?? activeRound.assignedPsychologistId ?? null,
        body.assignedPsychologistName ?? activeRound.assignedPsychologistName ?? null,
        nowIso,
        targetRoundId
      )
      if (body.ownerUserId !== undefined || body.ownerUserName !== undefined) {
        await prisma.$executeRawUnsafe(
          `UPDATE "PreschoolInputAssessmentStudent"
           SET "ownerUserId" = ?, "ownerUserName" = ?, "updatedAt" = ?
           WHERE "id" = ?`,
          body.ownerUserId || null,
          body.ownerUserName || null,
          nowIso,
          id
        )
      }
      await appendPreschoolAuditLog({
        studentId: id,
        roundId: targetRoundId,
        action: "ASSIGN_STAFF",
        fromStatus: student.workflowStatus,
        toStatus: student.workflowStatus,
        actorId: ctx.userId,
        actorName,
        actorRole: ctx.role,
        detail: {
          assignedTeacherName: body.assignedTeacherName,
          assignedMedicalName: body.assignedMedicalName,
          assignedPsychologistName: body.assignedPsychologistName,
        },
      })
      return NextResponse.json({ success: true })
    }

    // 3. B4A: Y tế kiểm tra thể chất
    if (action === "SAVE_HEALTH_CHECK") {
      const allowed = hasAnyRole(userRoles, MEDICAL_ROLES) || activeRound.assignedMedicalId === ctx.userId
      if (!allowed) {
        return NextResponse.json({ error: "Chỉ bộ phận Y tế hoặc nhân sự được giao mới được nhập thông tin sức khỏe." }, { status: 403 })
      }
      const heightCm = body.heightCm !== "" && body.heightCm != null ? Number(body.heightCm) : null
      const weightKg = body.weightKg !== "" && body.weightKg != null ? Number(body.weightKg) : null
      if (heightCm == null || weightKg == null || isNaN(heightCm) || isNaN(weightKg) || heightCm <= 0 || weightKg <= 0) {
        return NextResponse.json({ error: "Vui lòng nhập chiều cao (cm) và cân nặng (kg) hợp lệ." }, { status: 400 })
      }
      const heightM = heightCm / 100
      const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10
      const physicalStatus = String(body.physicalStatus || "BINH_THUONG")
      const physicalNote = String(body.physicalNote || "").trim() || null

      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolAssessmentRound"
         SET "heightCm" = ?, "weightKg" = ?, "bmi" = ?, "physicalStatus" = ?, "physicalNote" = ?,
             "medicalUserId" = ?, "medicalUserName" = ?, "medicalCheckedAt" = ?, "status" = 'IN_PROGRESS', "updatedAt" = ?
         WHERE "id" = ?`,
        heightCm,
        weightKg,
        bmi,
        physicalStatus,
        physicalNote,
        ctx.userId,
        actorName,
        nowIso,
        nowIso,
        targetRoundId
      )

      // Đồng bộ Chiều cao & Cân nặng sang PreschoolDevScore (nếu đã có tiêu chí Thể chất tương ứng)
      try {
        const existingScores = await (prisma as any).preschoolDevScore.findMany({
          where: { studentId: id },
          include: { criteria: true },
        })
        for (const sc of existingScores) {
          const cCode = String(sc.criteria?.code || "").toUpperCase()
          const cName = String(sc.criteria?.name || "").toLowerCase()
          if (cCode.endsWith("_01") || cName.includes("chiều cao")) {
            const obs = sc.note?.includes("|") ? sc.note.split("|")[1] : ""
            const newNote = obs ? `${heightCm} cm|${obs}` : `${heightCm} cm`
            await (prisma as any).preschoolDevScore.update({
              where: { id: sc.id },
              data: { note: newNote, result: sc.result || "DAT" },
            })
          } else if (cCode.endsWith("_02") || cName.includes("cân nặng")) {
            const obs = sc.note?.includes("|") ? sc.note.split("|")[1] : ""
            const newNote = obs ? `${weightKg} kg|${obs}` : `${weightKg} kg`
            await (prisma as any).preschoolDevScore.update({
              where: { id: sc.id },
              data: { note: newNote, result: sc.result || "DAT" },
            })
          }
        }
      } catch {}

      const nextStatus = student.workflowStatus === "DA_HEN" ? "DANG_DANH_GIA" : student.workflowStatus
      if (nextStatus !== student.workflowStatus) {
        await prisma.$executeRawUnsafe(
          `UPDATE "PreschoolInputAssessmentStudent" SET "workflowStatus" = ?, "updatedAt" = ? WHERE "id" = ?`,
          nextStatus,
          nowIso,
          id
        )
      }

      await appendPreschoolAuditLog({
        studentId: id,
        roundId: targetRoundId,
        action: "SAVE_HEALTH_CHECK",
        fromStatus: student.workflowStatus,
        toStatus: nextStatus,
        actorId: ctx.userId,
        actorName,
        actorRole: ctx.role,
        detail: { heightCm, weightKg, bmi, physicalStatus },
      })
      return NextResponse.json({ success: true, bmi, workflowStatus: nextStatus })
    }

    // 4. Xác nhận mẫu phiếu BM.KTĐBCL (bắt buộc với mốc tuổi giáp ranh)
    if (action === "CONFIRM_FORM") {
      const formCode = String(body.formCode || "").trim()
      const def = PRESCHOOL_FORM_REGISTRY[formCode]
      if (!def) {
        return NextResponse.json({ error: `Mã biểu mẫu không hợp lệ: ${formCode}` }, { status: 400 })
      }
      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolAssessmentRound"
         SET "formCode" = ?, "formVersion" = ?, "formConfirmedBy" = ?, "formConfirmedAt" = ?, "updatedAt" = ?
         WHERE "id" = ?`,
        def.code,
        def.version,
        actorName,
        nowIso,
        nowIso,
        targetRoundId
      )
      await appendPreschoolAuditLog({
        studentId: id,
        roundId: targetRoundId,
        action: "CONFIRM_FORM",
        fromStatus: student.workflowStatus,
        toStatus: student.workflowStatus,
        actorId: ctx.userId,
        actorName,
        actorRole: ctx.role,
        detail: { formCode: def.code, formVersion: def.version },
      })
      return NextResponse.json({ success: true, formCode: def.code, formVersion: def.version })
    }

    // 5. B5 / B4B / B8: Giáo viên lưu phiếu đánh giá hoặc quan sát học trải nghiệm
    if (action === "SAVE_EVALUATION") {
      const allowed =
        hasAnyRole(userRoles, REVIEWER_ROLES) ||
        userRoles.includes("TEACHER") ||
        activeRound.assignedTeacherId === ctx.userId
      if (!allowed) {
        return NextResponse.json({ error: "Bạn không có quyền nhập đánh giá khảo sát." }, { status: 403 })
      }
      const rt = activeRound.roundType || "KHAO_SAT_MOI"
      if (rt === "KHAO_SAT_MOI") {
        const chosenForm = body.formCode || activeRound.formCode
        if (!chosenForm || !PRESCHOOL_FORM_REGISTRY[chosenForm]) {
          return NextResponse.json({ error: "Vui lòng chọn và xác nhận mã biểu mẫu (BM.KTĐBCL) trước khi lưu." }, { status: 400 })
        }
        if (activeRound.isAgeBoundary && !activeRound.formConfirmedAt && !body.confirmBoundaryNow) {
          return NextResponse.json({ error: "Hồ sơ thuộc mốc tuổi giáp ranh — vui lòng xác nhận mẫu phiếu trước khi lưu." }, { status: 400 })
        }
        const formDef = PRESCHOOL_FORM_REGISTRY[chosenForm]
        const payload = {
          formCode: formDef.code,
          formVersion: formDef.version,
          criteria: Array.isArray(body.criteria) ? body.criteria : [],
          teacherConfirmation: actorName,
          submittedAt: nowIso,
        }
        await prisma.$executeRawUnsafe(
          `UPDATE "PreschoolAssessmentRound"
           SET "formCode" = ?, "formVersion" = ?,
               "formConfirmedBy" = COALESCE("formConfirmedBy", ?),
               "formConfirmedAt" = COALESCE("formConfirmedAt", ?),
               "criteriaPayloadJson" = ?, "generalComment" = ?,
               "teacherSubmittedAt" = ?, "teacherSubmittedBy" = ?,
               "status" = 'IN_PROGRESS', "updatedAt" = ?
           WHERE "id" = ?`,
          formDef.code,
          formDef.version,
          actorName,
          nowIso,
          JSON.stringify(payload),
          String(body.generalComment || "").trim() || null,
          nowIso,
          actorName,
          nowIso,
          targetRoundId
        )
      } else {
        // B4B (HOC_TRAI_NGHIEM) or B8 (TRAI_NGHIEM_BO_SUNG)
        const obs = String(body.experienceObservation || "").trim()
        if (!obs) {
          return NextResponse.json({ error: "Vui lòng nhập nội dung quan sát tại lớp." }, { status: 400 })
        }
        await prisma.$executeRawUnsafe(
          `UPDATE "PreschoolAssessmentRound"
           SET "experienceObservation" = ?, "generalComment" = ?,
               "teacherSubmittedAt" = ?, "teacherSubmittedBy" = ?,
               "status" = 'IN_PROGRESS', "updatedAt" = ?
           WHERE "id" = ?`,
          obs,
          String(body.generalComment || "").trim() || null,
          nowIso,
          actorName,
          nowIso,
          targetRoundId
        )
      }

      const nextStatus =
        student.workflowStatus === "DA_HEN" || student.workflowStatus === "CHO_TRAI_NGHIEM"
          ? "DANG_DANH_GIA"
          : student.workflowStatus
      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolInputAssessmentStudent"
         SET "workflowStatus" = ?, "devProfessionalComment" = ?, "updatedAt" = ?
         WHERE "id" = ?`,
        nextStatus,
        String(body.generalComment || body.experienceObservation || "").trim() || null,
        nowIso,
        id
      )

      await appendPreschoolAuditLog({
        studentId: id,
        roundId: targetRoundId,
        action: "SAVE_EVALUATION",
        fromStatus: student.workflowStatus,
        toStatus: nextStatus,
        actorId: ctx.userId,
        actorName,
        actorRole: ctx.role,
        detail: { roundType: rt, formCode: body.formCode || activeRound.formCode },
      })
      return NextResponse.json({ success: true, workflowStatus: nextStatus })
    }

    // 6. B7: Cập nhật kết quả khảo sát tâm lý từ GV Tâm lý (BM.KTĐBCL.09)
    if (action === "SAVE_PSYCHOLOGY") {
      const allowed =
        hasAnyRole(userRoles, REVIEWER_ROLES) ||
        userRoles.includes("TAM_LY") ||
        activeRound.assignedPsychologistId === ctx.userId ||
        student.trialPsychologistId === ctx.userId ||
        activeRound.assignedTeacherId === ctx.userId
      if (!allowed) {
        return NextResponse.json({ error: "Chỉ GV Tâm lý phụ trách hoặc cấp quản lý mới được cập nhật kết quả khảo sát tâm lý." }, { status: 403 })
      }
      const conclusionNote = String(body.conclusionNote || "").trim()
      const psyPayload = {
        formCode: "BM.KTĐBCL.09",
        formVersion: PRESCHOOL_FORM_REGISTRY["BM.KTĐBCL.09"].version,
        criteria: Array.isArray(body.criteria) ? body.criteria : [],
        conclusionNote,
        submittedBy: actorName,
        submittedAt: nowIso,
      }

      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolAssessmentRound"
         SET "roundType" = 'PHONG_VAN_TAM_LY',
             "formCode" = 'BM.KTĐBCL.09',
             "formVersion" = ?,
             "psychologyPayloadJson" = ?,
             "psychologistSubmittedAt" = ?,
             "psychologistSubmittedBy" = ?,
             "status" = 'IN_PROGRESS',
             "updatedAt" = ?
         WHERE "id" = ?`,
        PRESCHOOL_FORM_REGISTRY["BM.KTĐBCL.09"].version,
        JSON.stringify(psyPayload),
        nowIso,
        actorName,
        nowIso,
        targetRoundId
      )

      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolInputAssessmentStudent"
         SET "devPsychologyComment" = ?,
             "trialPsychologyStatus" = 'COMPLETED',
             "trialPsychologyFeedback" = COALESCE(NULLIF(?, ''), "trialPsychologyFeedback"),
             "trialPsychologyConclusion" = COALESCE(NULLIF(?, ''), "trialPsychologyConclusion"),
             "trialPsychologistName" = COALESCE("trialPsychologistName", ?),
             "trialPsychologyConfirmedAt" = COALESCE("trialPsychologyConfirmedAt", ?),
             "workflowStatus" = 'DANG_DANH_GIA',
             "updatedAt" = ?
         WHERE "id" = ?`,
        conclusionNote || null,
        conclusionNote,
        conclusionNote,
        actorName,
        nowIso,
        nowIso,
        id
      )

      await appendPreschoolAuditLog({
        studentId: id,
        roundId: targetRoundId,
        action: "SAVE_PSYCHOLOGY",
        fromStatus: student.workflowStatus,
        toStatus: "DANG_DANH_GIA",
        actorId: ctx.userId,
        actorName,
        actorRole: ctx.role,
        detail: { formCode: "BM.KTĐBCL.09", psychologist: actorName },
      })
      return NextResponse.json({ success: true, workflowStatus: "DANG_DANH_GIA" })
    }

    // 7. B6 / B9A: Nhóm trưởng Mầm non rà soát & chuyển bước
    if (action === "REVIEW_B6_B9A") {
      if (!hasAnyRole(userRoles, REVIEWER_ROLES)) {
        return NextResponse.json({ error: "Chỉ Nhóm trưởng Mầm non / BGH MN / GĐCS mới có quyền rà soát bước B6/B9A." }, { status: 403 })
      }
      const reviewDecision = String(body.reviewDecision || "").trim()
      const reviewComment = String(body.reviewComment || "").trim() || null
      if (!["DE_XUAT_DAT", "DE_XUAT_CHUA_DAT", "CAN_TAM_LY", "HEN_TRAI_NGHIEM_BO_SUNG"].includes(reviewDecision)) {
        return NextResponse.json({ error: "Quyết định rà soát không hợp lệ." }, { status: 400 })
      }

      // If forwarding to GĐCS (CHO_DUYET), validate pre-approval gate with this review applied
      if (reviewDecision === "DE_XUAT_DAT" || reviewDecision === "DE_XUAT_CHUA_DAT") {
        const simulated = {
          ...activeRound,
          reviewDecision,
          reviewedAt: nowIso,
        }
        const gate = evaluatePreApprovalGate(simulated)
        if (!gate.ready) {
          return NextResponse.json(
            { error: "Chưa đủ điều kiện trình duyệt GĐCS.", missing: gate.missing },
            { status: 400 }
          )
        }
      }

      let nextStatus = "CHO_DUYET"
      if (reviewDecision === "CAN_TAM_LY") {
        nextStatus = "CHO_PHONG_VAN_TAM_LY"
      } else if (reviewDecision === "HEN_TRAI_NGHIEM_BO_SUNG") {
        nextStatus = "CHO_TRAI_NGHIEM"
      }

      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolAssessmentRound"
         SET "reviewDecision" = ?, "reviewComment" = ?, "reviewedBy" = ?, "reviewedByName" = ?, "reviewedAt" = ?, "updatedAt" = ?
         WHERE "id" = ?`,
        reviewDecision,
        reviewComment,
        ctx.userId,
        actorName,
        nowIso,
        nowIso,
        targetRoundId
      )

      // If transitioning to immediate psychology interview (B7A), create a dedicated round keeping the previous round intact
      let createdRoundId: string | null = null
      if (reviewDecision === "CAN_TAM_LY") {
        const allRounds = await getStudentRounds(id)
        const nextRoundNum = (allRounds[allRounds.length - 1]?.roundNumber || 1) + 1
        createdRoundId = generateId("ps_rnd")
        await prisma.$executeRawUnsafe(
          `UPDATE "PreschoolAssessmentRound" SET "status" = 'COMPLETED', "updatedAt" = ? WHERE "id" = ?`,
          nowIso,
          targetRoundId
        )
        await prisma.$executeRawUnsafe(
          `INSERT INTO "PreschoolAssessmentRound"
            ("id", "studentId", "roundNumber", "roundType", "status", "scheduledAt", "campusName",
             "assignedPsychologistId", "assignedPsychologistName", "suggestedFormCode", "formCode", "formVersion",
             "createdAt", "updatedAt")
           VALUES (?, ?, ?, 'PHONG_VAN_TAM_LY', 'SCHEDULED', ?, ?, ?, ?, 'BM.KTĐBCL.09', 'BM.KTĐBCL.09', ?, ?, ?)`,
          createdRoundId,
          id,
          nextRoundNum,
          nowIso,
          activeRound.campusName || student.registeredCampus || null,
          body.assignedPsychologistId || activeRound.assignedPsychologistId || null,
          body.assignedPsychologistName || activeRound.assignedPsychologistName || null,
          PRESCHOOL_FORM_REGISTRY["BM.KTĐBCL.09"].version,
          nowIso,
          nowIso
        )
      }

      const legacyBgh =
        reviewDecision === "DE_XUAT_DAT"
          ? "DE_XUAT_DAT"
          : reviewDecision === "DE_XUAT_CHUA_DAT"
            ? "DE_XUAT_CHUA_DAT"
            : reviewDecision === "HEN_TRAI_NGHIEM_BO_SUNG"
              ? "HEN_TRAI_NGHIEM"
              : null

      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolInputAssessmentStudent"
         SET "workflowStatus" = ?,
             "bghApprovalStatus" = COALESCE(?, "bghApprovalStatus"),
             "bghApprovalComment" = COALESCE(?, "bghApprovalComment"),
             "bghApprovalUser" = ?,
             "bghApprovalDate" = ?,
             "updatedAt" = ?
         WHERE "id" = ?`,
        nextStatus,
        legacyBgh,
        reviewComment,
        actorName,
        nowIso,
        nowIso,
        id
      )

      await appendPreschoolAuditLog({
        studentId: id,
        roundId: createdRoundId || targetRoundId,
        action: "REVIEW_B6_B9A",
        fromStatus: student.workflowStatus,
        toStatus: nextStatus,
        actorId: ctx.userId,
        actorName,
        actorRole: ctx.role,
        detail: { reviewDecision, reviewComment, createdRoundId },
      })

      return NextResponse.json({ success: true, workflowStatus: nextStatus, createdRoundId })
    }

    // 8. B7B: Hẹn trải nghiệm kết hợp quan sát tâm lý (>= 2 ngày làm việc) — tạo Lần mới giữ nguyên lịch sử
    if (action === "SCHEDULE_FOLLOWUP" || action === "SCHEDULE_FOLLOW_UP") {
      if (!hasAnyRole(userRoles, TUVAN_ROLES) && !hasAnyRole(userRoles, REVIEWER_ROLES)) {
        return NextResponse.json({ error: "Bạn không có quyền hẹn lịch trải nghiệm bổ sung." }, { status: 403 })
      }
      const scheduledAt = body.scheduledAt
      const baseDate = activeRound.actualAt || activeRound.scheduledAt || new Date()
      const check = validateFollowUpBusinessDays(baseDate, scheduledAt, 2)
      if (!check.valid) {
        return NextResponse.json(
          { error: check.message, earliestDate: check.earliestDate.toISOString() },
          { status: 400 }
        )
      }

      const allRounds = await getStudentRounds(id)
      const nextRoundNum = (allRounds[allRounds.length - 1]?.roundNumber || 1) + 1
      const newRoundId = generateId("ps_rnd")

      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolAssessmentRound" SET "status" = 'COMPLETED', "updatedAt" = ? WHERE "id" = ?`,
        nowIso,
        activeRound.id
      )

      await prisma.$executeRawUnsafe(
        `INSERT INTO "PreschoolAssessmentRound"
          ("id", "studentId", "roundNumber", "roundType", "status", "scheduledAt", "campusName",
           "assignedTeacherId", "assignedTeacherName", "assignedPsychologistId", "assignedPsychologistName",
           "suggestedFormCode", "formCode", "formVersion", "createdAt", "updatedAt")
         VALUES (?, ?, ?, 'TRAI_NGHIEM_BO_SUNG', 'SCHEDULED', ?, ?, ?, ?, ?, ?, 'BM.KTĐBCL.09', 'BM.KTĐBCL.09', ?, ?, ?)`,
        newRoundId,
        id,
        nextRoundNum,
        new Date(scheduledAt).toISOString(),
        body.campusName || activeRound.campusName || student.registeredCampus || null,
        body.assignedTeacherId || null,
        body.assignedTeacherName || null,
        body.assignedPsychologistId || null,
        body.assignedPsychologistName || null,
        PRESCHOOL_FORM_REGISTRY["BM.KTĐBCL.09"].version,
        nowIso,
        nowIso
      )

      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolInputAssessmentStudent"
         SET "workflowStatus" = 'CHO_TRAI_NGHIEM', "appointmentAt" = ?, "updatedAt" = ?
         WHERE "id" = ?`,
        new Date(scheduledAt).toISOString(),
        nowIso,
        id
      )

      await appendPreschoolAuditLog({
        studentId: id,
        roundId: newRoundId,
        action: "SCHEDULE_FOLLOWUP",
        fromStatus: student.workflowStatus,
        toStatus: "CHO_TRAI_NGHIEM",
        actorId: ctx.userId,
        actorName,
        actorRole: ctx.role,
        detail: {
          roundNumber: nextRoundNum,
          scheduledAt: new Date(scheduledAt).toISOString(),
          note: body.note || null,
        },
      })

      return NextResponse.json({
        success: true,
        workflowStatus: "CHO_TRAI_NGHIEM",
        roundId: newRoundId,
        roundNumber: nextRoundNum,
      })
    }

    // 9. Gửi Email trình duyệt 1 chạm tới GĐCS (B10)
    if (action === "SEND_APPROVAL_EMAIL") {
      if (!hasAnyRole(userRoles, REVIEWER_ROLES) && !hasAnyRole(userRoles, GIAOVU_ROLES)) {
        return NextResponse.json({ error: "Bạn không có quyền gửi email trình duyệt." }, { status: 403 })
      }
      const hasTrialFlag = Boolean(
        student.probationaryClass ||
          student.probationaryTeacher ||
          student.probationaryResult ||
          student.probationaryBghStatus
      )
      const hasPsyFlag = Boolean(
        Number(student.trialPsychologyScreening || 0) === 1 ||
          student.trialPsychologistName ||
          student.trialPsychologyStatus ||
          activeRound?.psychologyRequired ||
          activeRound?.psychologistSubmittedAt ||
          activeRound?.psychologyPayloadJson
      )
      const gate = evaluatePreApprovalGate(activeRound, {
        hasLegacyScores,
        hasTrial: hasTrialFlag,
        hasPsychology: hasPsyFlag,
        studentBghStatus: student.bghApprovalStatus,
      })
      if (!gate.ready) {
        return NextResponse.json(
          { error: "Chưa đủ điều kiện bắt buộc để trình duyệt GĐCS.", missing: gate.missing },
          { status: 400 }
        )
      }
      const recipientEmail = String(body.recipientEmail || "").trim()
      const recipientName = String(body.recipientName || "Giám đốc Điều hành Cơ sở").trim()
      if (!recipientEmail) {
        return NextResponse.json({ error: "Vui lòng nhập email Giám đốc Điều hành Cơ sở." }, { status: 400 })
      }

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXTAUTH_URL ||
        req.nextUrl.origin

      const subject =
        (typeof body.customSubject === "string" && body.customSubject.trim()) ||
        `[Sky-Line SSM · Mầm non] Trình phê duyệt B10 — Bé ${student.fullName} (${student.studentCode})`

      const html = generatePreschoolB10ApprovalEmailHtml({
        student,
        round: activeRound,
        recipientEmail,
        recipientName,
        baseUrl,
      })

      if (body.previewOnly) {
        return NextResponse.json({
          preview: true,
          to: recipientEmail,
          recipientName,
          subject,
          html,
        })
      }

      const mailRes = await sendEmail({
        to: recipientEmail,
        subject,
        html,
      })

      await appendPreschoolAuditLog({
        studentId: id,
        roundId: activeRound.id,
        action: "SEND_APPROVAL_EMAIL",
        fromStatus: student.workflowStatus,
        toStatus: student.workflowStatus,
        actorId: ctx.userId,
        actorName,
        actorRole: ctx.role,
        detail: { recipientEmail, recipientName, sent: Boolean(mailRes?.success) },
      })

      return NextResponse.json({
        success: Boolean(mailRes?.success),
        error: mailRes?.success ? undefined : mailRes?.error || "Không thể gửi email SMTP.",
      })
    }

    // 10. B10: Giám đốc Điều hành Cơ sở phê duyệt Đạt / Chưa đạt
    if (action === "APPROVE_B10") {
      if (!hasAnyRole(userRoles, APPROVER_ROLES)) {
        return NextResponse.json({ error: "Chỉ Giám đốc Điều hành Cơ sở (GĐCS) / Quản trị mới có quyền phê duyệt B10." }, { status: 403 })
      }
      const hasTrialFlag = Boolean(
        student.probationaryClass ||
          student.probationaryTeacher ||
          student.probationaryResult ||
          student.probationaryBghStatus
      )
      const hasPsyFlag = Boolean(
        Number(student.trialPsychologyScreening || 0) === 1 ||
          student.trialPsychologistName ||
          student.trialPsychologyStatus ||
          activeRound?.psychologyRequired ||
          activeRound?.psychologistSubmittedAt ||
          activeRound?.psychologyPayloadJson
      )
      const gate = evaluatePreApprovalGate(activeRound, {
        hasLegacyScores,
        hasTrial: hasTrialFlag,
        hasPsychology: hasPsyFlag,
        studentBghStatus: student.bghApprovalStatus,
      })
      if (!gate.ready) {
        return NextResponse.json(
          { error: "Chưa đủ điều kiện bắt buộc của nhánh hiện tại để phê duyệt.", missing: gate.missing },
          { status: 400 }
        )
      }
      const decision = body.decision === "DAT" ? "DAT" : body.decision === "CHUA_DAT" ? "CHUA_DAT" : null
      if (!decision) {
        return NextResponse.json({ error: "Vui lòng chọn kết luận Đạt hoặc Chưa đạt." }, { status: 400 })
      }
      const gdcsComment = String(body.comment || "").trim() || null
      const legacyGdcs = decision === "DAT" ? "DAT" : "KHONG_DAT"
      const admissionResult = decision === "DAT" ? "Đạt" : "Chưa đạt"

      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolAssessmentRound"
         SET "gdcsDecision" = ?, "gdcsComment" = ?, "gdcsUserId" = ?, "gdcsUserName" = ?, "gdcsApprovedAt" = ?,
             "status" = 'COMPLETED', "updatedAt" = ?
         WHERE "id" = ?`,
        decision,
        gdcsComment,
        ctx.userId,
        actorName,
        nowIso,
        nowIso,
        activeRound.id
      )

      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolInputAssessmentStudent"
         SET "workflowStatus" = 'DA_DUYET',
             "finalApprovedOutcome" = ?,
             "gdcsApprovalStatus" = ?,
             "gdcsApprovalComment" = ?,
             "gdcsApprovalUser" = ?,
             "gdcsApprovalDate" = ?,
             "admissionResult" = ?,
             "updatedAt" = ?
         WHERE "id" = ?`,
        decision,
        legacyGdcs,
        gdcsComment,
        actorName,
        nowIso,
        admissionResult,
        nowIso,
        id
      )

      await appendPreschoolAuditLog({
        studentId: id,
        roundId: activeRound.id,
        action: "APPROVE_B10",
        fromStatus: student.workflowStatus,
        toStatus: "DA_DUYET",
        actorId: ctx.userId,
        actorName,
        actorRole: ctx.role,
        detail: { decision, comment: gdcsComment },
      })

      try {
        if (student.periodId) {
          await executeEntranceWorkflowAction({
            action: "CONFIRM",
            targetScope: student.batchId ? "BATCH" : "STUDENT",
            periodId: student.periodId,
            batchId: student.batchId || null,
            studentId: student.id,
            isPreschool: true,
            stageNumber: 6,
            status: "COMPLETED",
            note: `GĐCS phê duyệt B10 cho bé ${student.fullName}: ${admissionResult}`,
            actor: { id: ctx.userId, fullName: actorName, role: ctx.role, isSuperAdmin: hasAnyRole(userRoles, ADMIN_OR_KT) },
          })
        }
      } catch {
        // Non-blocking sync
      }

      return NextResponse.json({
        success: true,
        workflowStatus: "DA_DUYET",
        finalApprovedOutcome: decision,
        admissionResult,
      })
    }

    // 11. B6: Lưu phân công học trải nghiệm, kết quả đánh giá học trải nghiệm & Sàng lọc tâm lý (gửi email GV Tâm lý)
    if (action === "SAVE_TRIAL_WORKFLOW") {
      if (!hasAnyRole(userRoles, GIAOVU_ROLES) && !hasAnyRole(userRoles, REVIEWER_ROLES) && !userRoles.includes("TEACHER")) {
        return NextResponse.json({ error: "Bạn không có quyền cập nhật thông tin học trải nghiệm." }, { status: 403 })
      }

      const probationaryClass = body.probationaryClass !== undefined ? (String(body.probationaryClass || "").trim() || null) : student.probationaryClass || null
      const probationaryTeacher = body.probationaryTeacher !== undefined ? (String(body.probationaryTeacher || "").trim() || null) : student.probationaryTeacher || null
      const probationaryPeriod = body.probationaryPeriod !== undefined ? (String(body.probationaryPeriod || "").trim() || null) : student.probationaryPeriod || null
      const probationaryResult = body.probationaryResult !== undefined ? (String(body.probationaryResult || "").trim() || null) : student.probationaryResult || null
      const probationaryComment = body.probationaryComment !== undefined ? (String(body.probationaryComment || "").trim() || null) : student.probationaryComment || null
      const probationaryBghStatus = body.probationaryBghStatus !== undefined ? (String(body.probationaryBghStatus || "").trim() || null) : student.probationaryBghStatus || null
      const probationaryBghComment = body.probationaryBghComment !== undefined ? (String(body.probationaryBghComment || "").trim() || null) : student.probationaryBghComment || null

      const trialPsychologyScreening = Boolean(body.trialPsychologyScreening)
      const trialPsychologistId = trialPsychologyScreening ? (String(body.trialPsychologistId || "").trim() || null) : null
      const trialPsychologistName = trialPsychologyScreening ? (String(body.trialPsychologistName || "").trim() || null) : null
      const trialPsychologistEmail = trialPsychologyScreening ? (String(body.trialPsychologistEmail || "").trim() || null) : null
      const trialPsychologyCriteriaJson =
        body.trialCriteriaPayload !== undefined
          ? JSON.stringify(body.trialCriteriaPayload)
          : student.trialPsychologyCriteriaJson || null

      const bghChanged = body.probationaryBghStatus !== undefined && body.probationaryBghStatus !== student.probationaryBghStatus
      let emailSent = false
      let emailSentAt = student.trialPsychologyEmailSentAt || null
      let nextPsyStatus = student.trialPsychologyStatus || (trialPsychologyScreening ? "PENDING" : null)

      if (trialPsychologyScreening && body.sendPsychologyEmail && trialPsychologistEmail && trialPsychologistEmail.includes("@")) {
        const host = req.headers.get("host") || "ssm.skylineschool.edu.vn"
        const protocol = req.headers.get("x-forwarded-proto") || "https"
        const baseUrl = `${protocol}://${host}`
        const flaggedNames: string[] = Array.isArray(body.flaggedCriteriaNames) ? body.flaggedCriteriaNames : []
        const html = renderPreschoolPsychologyScreeningEmailHtml({
          student: {
            id: student.id,
            fullName: student.fullName,
            studentCode: student.studentCode,
            grade: student.grade,
            admissionCampus: student.admissionCampus || student.registeredCampus,
            probationaryClass,
            probationaryTeacher,
            probationaryPeriod,
          },
          psychologistId: trialPsychologistId || undefined,
          psychologistName: trialPsychologistName || trialPsychologistEmail,
          psychologistEmail: trialPsychologistEmail,
          flaggedCriteriaNames: flaggedNames,
          note: String(body.psychologyNote || probationaryComment || ""),
          assignedByName: actorName,
          baseUrl,
        })
        await sendEmail({
          to: trialPsychologistEmail,
          subject: `[Sky-Line SSM] Yêu cầu Sàng lọc tâm lý (Học trải nghiệm Mầm non) — Bé ${student.fullName} (${student.studentCode})`,
          html,
          replyTo: "ktdbcl@skylineschool.edu.vn",
        })
        emailSent = true
        emailSentAt = nowIso
        if (!nextPsyStatus || nextPsyStatus === "NONE") nextPsyStatus = "PENDING"
      }

      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolInputAssessmentStudent"
         SET "probationaryClass" = ?,
             "probationaryTeacher" = ?,
             "probationaryPeriod" = ?,
             "probationaryResult" = ?,
             "probationaryComment" = ?,
             "probationaryBghStatus" = ?,
             "probationaryBghComment" = ?,
             "probationaryBghUser" = ?,
             "probationaryBghDate" = ?,
             "trialPsychologyScreening" = ?,
             "trialPsychologistId" = ?,
             "trialPsychologistName" = ?,
             "trialPsychologistEmail" = ?,
             "trialPsychologyEmailSentAt" = ?,
             "trialPsychologyStatus" = ?,
             "trialPsychologyCriteriaJson" = ?,
             "updatedAt" = ?
         WHERE "id" = ?`,
        probationaryClass,
        probationaryTeacher,
        probationaryPeriod,
        probationaryResult,
        probationaryComment,
        probationaryBghStatus,
        probationaryBghComment,
        bghChanged ? actorName : student.probationaryBghUser || null,
        bghChanged ? nowIso : student.probationaryBghDate || null,
        trialPsychologyScreening ? 1 : 0,
        trialPsychologistId,
        trialPsychologistName,
        trialPsychologistEmail,
        emailSentAt,
        nextPsyStatus,
        trialPsychologyCriteriaJson,
        nowIso,
        id
      )

      if (trialPsychologyScreening && trialPsychologistId) {
        await prisma.$executeRawUnsafe(
          `UPDATE "PreschoolAssessmentRound"
           SET "assignedPsychologistId" = ?, "assignedPsychologistName" = ?, "updatedAt" = ?
           WHERE "id" = ?`,
          trialPsychologistId,
          trialPsychologistName,
          nowIso,
          targetRoundId
        )
      }

      await appendPreschoolAuditLog({
        studentId: id,
        roundId: targetRoundId,
        action: emailSent ? "SEND_PSYCHOLOGY_SCREENING_EMAIL" : "ASSIGN_TRIAL",
        fromStatus: student.workflowStatus,
        toStatus: student.workflowStatus,
        actorId: ctx.userId,
        actorName,
        actorRole: ctx.role,
        detail: {
          probationaryClass,
          probationaryTeacher,
          probationaryResult,
          probationaryBghStatus,
          trialPsychologyScreening,
          trialPsychologistName,
          emailSent,
        },
      })

      return NextResponse.json({ success: true, emailSent, trialPsychologyStatus: nextPsyStatus })
    }

    // 11. B11B: Ghi nhận nội dung trao đổi với phụ huynh (bắt buộc khi Chưa đạt trước khi xuất BM.KTĐBCL.04)
    if (action === "RECORD_PARENT_CONSULTATION") {
      if (!hasAnyRole(userRoles, TUVAN_ROLES) && !hasAnyRole(userRoles, REVIEWER_ROLES)) {
        return NextResponse.json({ error: "Bạn không có quyền ghi nhận trao đổi phụ huynh." }, { status: 403 })
      }
      const note = String(body.note || "").trim()
      if (!note) {
        return NextResponse.json({ error: "Vui lòng ghi nhận nội dung trao đổi với phụ huynh." }, { status: 400 })
      }
      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolInputAssessmentStudent"
         SET "parentConsultationNote" = ?, "parentConsultationAt" = ?, "parentConsultationBy" = ?, "updatedAt" = ?
         WHERE "id" = ?`,
        note,
        nowIso,
        actorName,
        nowIso,
        id
      )
      await appendPreschoolAuditLog({
        studentId: id,
        roundId: activeRound.id,
        action: "RECORD_PARENT_CONSULTATION",
        fromStatus: student.workflowStatus,
        toStatus: student.workflowStatus,
        actorId: ctx.userId,
        actorName,
        actorRole: ctx.role,
        detail: { note },
      })
      return NextResponse.json({ success: true })
    }

    // 12. B11A / B11B: Ghi nhận xuất thư BM.KTĐBCL.17 (Đạt) hoặc BM.KTĐBCL.04 (Chưa đạt)
    if (action === "ISSUE_LETTER") {
      if (!hasAnyRole(userRoles, GIAOVU_ROLES) && !hasAnyRole(userRoles, TUVAN_ROLES)) {
        return NextResponse.json({ error: "Bạn không có quyền xuất thư kết quả." }, { status: 403 })
      }
      if (!student.finalApprovedOutcome) {
        return NextResponse.json({ error: "Hồ sơ chưa được GĐCS phê duyệt (B10)." }, { status: 400 })
      }
      const expectedCode = student.finalApprovedOutcome === "DAT" ? "BM.KTĐBCL.17" : "BM.KTĐBCL.04"
      if (expectedCode === "BM.KTĐBCL.04" && !student.parentConsultationNote?.trim()) {
        return NextResponse.json(
          { error: "Bắt buộc ghi nhận nội dung trao đổi với phụ huynh trước khi xuất Thư cảm ơn (BM.KTĐBCL.04)." },
          { status: 400 }
        )
      }
      const def = PRESCHOOL_FORM_REGISTRY[expectedCode]
      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolAssessmentRound"
         SET "issuedLetterCode" = ?, "issuedLetterVersion" = ?, "issuedLetterAt" = ?, "issuedLetterBy" = ?, "updatedAt" = ?
         WHERE "id" = ?`,
        def.code,
        def.version,
        nowIso,
        actorName,
        nowIso,
        activeRound.id
      )
      await appendPreschoolAuditLog({
        studentId: id,
        roundId: activeRound.id,
        action: "ISSUE_LETTER",
        fromStatus: student.workflowStatus,
        toStatus: student.workflowStatus,
        actorId: ctx.userId,
        actorName,
        actorRole: ctx.role,
        detail: { letterCode: def.code, letterVersion: def.version },
      })
      return NextResponse.json({ success: true, letterCode: def.code, letterVersion: def.version })
    }

    // 13. B12: Tư vấn xác nhận đã trả kết quả cho phụ huynh
    if (action === "CONFIRM_DELIVERY") {
      if (!hasAnyRole(userRoles, TUVAN_ROLES)) {
        return NextResponse.json({ error: "Chỉ bộ phận Tư vấn / Quản trị mới được xác nhận đã trả kết quả." }, { status: 403 })
      }
      if (!student.finalApprovedOutcome) {
        return NextResponse.json({ error: "Chỉ xác nhận trả kết quả sau khi hồ sơ đã được phê duyệt." }, { status: 400 })
      }
      if (student.finalApprovedOutcome === "CHUA_DAT" && !student.parentConsultationNote?.trim()) {
        return NextResponse.json({ error: "Hồ sơ Chưa đạt cần ghi nhận trao đổi phụ huynh trước khi trả kết quả." }, { status: 400 })
      }
      const deliveryNote = String(body.note || "").trim() || null
      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolInputAssessmentStudent"
         SET "workflowStatus" = 'DA_TRA_KET_QUA',
             "resultDeliveredAt" = ?,
             "resultDeliveredBy" = ?,
             "resultDeliveryNote" = ?,
             "updatedAt" = ?
         WHERE "id" = ?`,
        nowIso,
        actorName,
        deliveryNote,
        nowIso,
        id
      )
      await appendPreschoolAuditLog({
        studentId: id,
        roundId: activeRound.id,
        action: "CONFIRM_DELIVERY",
        fromStatus: student.workflowStatus,
        toStatus: "DA_TRA_KET_QUA",
        actorId: ctx.userId,
        actorName,
        actorRole: ctx.role,
        detail: { note: deliveryNote },
      })
      return NextResponse.json({ success: true, workflowStatus: "DA_TRA_KET_QUA" })
    }

    // 14. B13: Giáo vụ hoặc Khảo thí hoàn tất lưu hồ sơ
    if (action === "ARCHIVE_RECORD") {
      if (!hasAnyRole(userRoles, GIAOVU_ROLES) && !hasAnyRole(userRoles, ADMIN_OR_KT)) {
        return NextResponse.json({ error: "Chỉ Giáo vụ hoặc Khảo thí (KT&ĐBCL) mới được hoàn tất lưu hồ sơ." }, { status: 403 })
      }
      if (student.workflowStatus !== "DA_TRA_KET_QUA" && student.workflowStatus !== "DA_LUU_HO_SO") {
        return NextResponse.json({ error: "Cần Tư vấn xác nhận đã trả kết quả (B12) trước khi lưu hồ sơ (B13)." }, { status: 400 })
      }
      const archiveNote = String(body.note || "").trim() || null
      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolInputAssessmentStudent"
         SET "workflowStatus" = 'DA_LUU_HO_SO',
             "archivedAt" = ?,
             "archivedBy" = ?,
             "archiveNote" = ?,
             "updatedAt" = ?
         WHERE "id" = ?`,
        nowIso,
        actorName,
        archiveNote,
        nowIso,
        id
      )
      await appendPreschoolAuditLog({
        studentId: id,
        roundId: activeRound.id,
        action: "ARCHIVE_RECORD",
        fromStatus: student.workflowStatus,
        toStatus: "DA_LUU_HO_SO",
        actorId: ctx.userId,
        actorName,
        actorRole: ctx.role,
        detail: { note: archiveNote },
      })
      return NextResponse.json({ success: true, workflowStatus: "DA_LUU_HO_SO" })
    }

    return NextResponse.json({ error: `Hành động không hợp lệ: ${action}` }, { status: 400 })
  } catch (err: any) {
    console.error("PATCH /api/preschool-workflow/[id] error:", err)
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireStaffSession()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const userRoles = getNormalizedRoles(ctx.role, ctx.roles)
    if (!hasAnyRole(userRoles, ADMIN_OR_KT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const { id } = await context.params
    await ensurePreschoolWorkflowSchema()
    await prisma.$executeRawUnsafe(`DELETE FROM "PreschoolInputAssessmentStudent" WHERE "id" = ?`, id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 })
  }
}
