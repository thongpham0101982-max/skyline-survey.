import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireStaffSession } from "@/lib/security-guard"
import {
  appendPreschoolAuditLog,
  ensurePreschoolWorkflowSchema,
  generateId,
} from "@/lib/preschool-workflow-db"
import {
  DOC_TT_02_PENDING_RULES,
  PRESCHOOL_FORM_REGISTRY,
  PRESCHOOL_WORKFLOW_STATUSES,
  formatPreschoolSystemLabel,
  getNormalizedRoles,
  normalizePreschoolSystem,
  sanitizeRoundForViewer,
  suggestPreschoolForm,
} from "@/lib/preschool-workflow"

const SYSTEM_WIDE_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "SUPERADMIN", "KTDBCL", "KT_DBCL", "KHAO_THI"])

function deriveLegacyWorkflowStatus(row: any): string {
  if (row.workflowStatus && PRESCHOOL_WORKFLOW_STATUSES.includes(row.workflowStatus)) {
    return row.workflowStatus
  }
  if (row.archivedAt) return "DA_LUU_HO_SO"
  if (row.resultDeliveredAt) return "DA_TRA_KET_QUA"
  if (row.finalApprovedOutcome || row.gdcsApprovalStatus) return "DA_DUYET"
  if (row.bghApprovalStatus) return "CHO_DUYET"
  if (row.devAssessmentResult || row.devProfessionalComment) return "DANG_DANH_GIA"
  return "DA_HEN"
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireStaffSession()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await ensurePreschoolWorkflowSchema()

    const { searchParams } = new URL(req.url)
    const campusFilter = (searchParams.get("campus") || "").trim()
    const fromDate = (searchParams.get("fromDate") || "").trim()
    const toDate = (searchParams.get("toDate") || "").trim()
    const systemFilter = (searchParams.get("system") || "").trim()
    const intakeModeFilter = (searchParams.get("intakeMode") || "").trim()
    const statusFilter = (searchParams.get("status") || "").trim()
    const search = (searchParams.get("search") || "").trim().toLowerCase()

    const userRoles = getNormalizedRoles(ctx.role, ctx.roles)
    const isSystemWide = userRoles.some((r) => SYSTEM_WIDE_ROLES.has(r))
    const actorFullName = ctx.user?.fullName || ctx.user?.name || ctx.userEmail

    // Fetch campuses for campus-scoping and filters
    const campusesRaw = await prisma.campus.findMany({
      select: { id: true, campusCode: true, campusName: true },
      orderBy: { campusCode: "asc" },
    })
    const campuses = campusesRaw.map((c) => ({
      id: c.id,
      code: c.campusCode,
      name: c.campusName,
    }))
    const allowedCampusNames = new Set<string>()
    if (!isSystemWide && ctx.allowedCampusIds.length > 0) {
      for (const c of campuses) {
        if (ctx.allowedCampusIds.includes(c.id)) {
          allowedCampusNames.add(c.id)
          if (c.code) allowedCampusNames.add(c.code.toUpperCase())
          if (c.name) allowedCampusNames.add(c.name.toLowerCase())
        }
      }
    }

    const [studentsRaw, roundsRaw, periods, staffUsers] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "PreschoolInputAssessmentStudent" ORDER BY "createdAt" DESC LIMIT 500`
      ),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "PreschoolAssessmentRound" ORDER BY "roundNumber" ASC`
      ),
      (prisma as any).preschoolInputAssessmentPeriod.findMany({
        select: { id: true, code: true, name: true, status: true, campusId: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.user.findMany({
        select: { id: true, fullName: true, email: true, role: true },
        orderBy: { fullName: "asc" },
        take: 300,
      }),
    ])

    const roundsByStudent = new Map<string, any[]>()
    for (const r of roundsRaw) {
      const sanitized = sanitizeRoundForViewer(r, {
        userId: ctx.userId,
        role: ctx.role,
        roles: ctx.roles,
      })
      const list = roundsByStudent.get(r.studentId) || []
      list.push(sanitized)
      roundsByStudent.set(r.studentId, list)
    }

    const isTeacherOnly =
      !isSystemWide &&
      userRoles.every((r) => r === "TEACHER" || r === "Y_TE")

    const mapped = studentsRaw
      .map((s) => {
        const rounds = roundsByStudent.get(s.id) || []
        const latestRound = rounds.length > 0 ? rounds[rounds.length - 1] : null
        const workflowStatus = deriveLegacyWorkflowStatus(s)
        const systemNormalized = normalizePreschoolSystem(s.surveySystem)
        const campusDisplay = s.registeredCampus || s.admissionCampus || latestRound?.campusName || ""
        const appointmentAt = latestRound?.scheduledAt || s.appointmentAt || s.createdAt

        // Column "Kết quả" only shows Đạt / Chưa đạt AFTER GĐCS approval (DA_DUYET+)
        const isApprovedStage =
          workflowStatus === "DA_DUYET" ||
          workflowStatus === "DA_TRA_KET_QUA" ||
          workflowStatus === "DA_LUU_HO_SO"
        let approvedOutcome: "DAT" | "CHUA_DAT" | null = null
        if (isApprovedStage) {
          if (s.finalApprovedOutcome === "DAT" || s.finalApprovedOutcome === "CHUA_DAT") {
            approvedOutcome = s.finalApprovedOutcome
          } else if (s.gdcsApprovalStatus) {
            approvedOutcome =
              s.gdcsApprovalStatus === "KHONG_DAT" || s.gdcsApprovalStatus === "CHUA_DAT"
                ? "CHUA_DAT"
                : "DAT"
          }
        }

        const suggestion = suggestPreschoolForm({
          dateOfBirth: s.dateOfBirth,
          surveyDate: appointmentAt,
          grade: s.grade,
          surveySystem: s.surveySystem,
        })

        return {
          id: s.id,
          studentCode: s.studentCode,
          fullName: s.fullName,
          dateOfBirth: s.dateOfBirth,
          gender: s.gender,
          grade: s.grade,
          surveySystem: formatPreschoolSystemLabel(s.surveySystem),
          systemCode: systemNormalized,
          campus: campusDisplay,
          periodId: s.periodId,
          batchId: s.batchId,
          ownerUserId: s.ownerUserId,
          ownerUserName: s.ownerUserName,
          intakeMode: s.intakeMode || latestRound?.roundType || "KHAO_SAT_MOI",
          appointmentAt,
          workflowStatus,
          approvedOutcome,
          roundCount: rounds.length,
          latestRound,
          suggestedFormCode: latestRound?.formCode || suggestion.suggestedFormCode,
          isAgeBoundary: latestRound ? Boolean(latestRound.isAgeBoundary) : suggestion.isAgeBoundary,
          createdAt: s.createdAt,
        }
      })
      .filter((item) => {
        // Campus scoping
        if (!isSystemWide && allowedCampusNames.size > 0 && item.campus) {
          const cLower = item.campus.toLowerCase()
          const cUpper = item.campus.toUpperCase()
          const matched = Array.from(allowedCampusNames).some(
            (ac) => cLower.includes(ac.toLowerCase()) || cUpper.includes(ac.toUpperCase())
          )
          if (!matched) return false
        }
        // Strict assignment scoping for pure TEACHER / Y_TE
        if (isTeacherOnly) {
          const assignedToMe =
            item.ownerUserId === ctx.userId ||
            item.latestRound?.assignedTeacherId === ctx.userId ||
            item.latestRound?.assignedMedicalId === ctx.userId ||
            item.latestRound?.assignedPsychologistId === ctx.userId
          if (!assignedToMe) return false
        }
        if (campusFilter && campusFilter !== "ALL") {
          if (!item.campus.toLowerCase().includes(campusFilter.toLowerCase())) return false
        }
        if (systemFilter && systemFilter !== "ALL") {
          if (item.systemCode !== systemFilter) return false
        }
        if (intakeModeFilter && intakeModeFilter !== "ALL") {
          if (item.intakeMode !== intakeModeFilter) return false
        }
        if (statusFilter && statusFilter !== "ALL") {
          if (item.workflowStatus !== statusFilter) return false
        }
        if (fromDate && item.appointmentAt) {
          const d = new Date(item.appointmentAt)
          if (!isNaN(d.getTime()) && d < new Date(fromDate)) return false
        }
        if (toDate && item.appointmentAt) {
          const d = new Date(item.appointmentAt)
          const end = new Date(toDate)
          end.setHours(23, 59, 59, 999)
          if (!isNaN(d.getTime()) && d > end) return false
        }
        if (search) {
          const hay = `${item.fullName} ${item.studentCode} ${item.campus} ${item.grade || ""} ${item.ownerUserName || ""}`.toLowerCase()
          if (!hay.includes(search)) return false
        }
        return true
      })

    // KPI counts across all 8 statuses
    const statusCounts: Record<string, number> = {}
    for (const st of PRESCHOOL_WORKFLOW_STATUSES) statusCounts[st] = 0
    let approvedPass = 0
    let approvedFail = 0
    for (const item of mapped) {
      statusCounts[item.workflowStatus] = (statusCounts[item.workflowStatus] || 0) + 1
      if (item.approvedOutcome === "DAT") approvedPass++
      else if (item.approvedOutcome === "CHUA_DAT") approvedFail++
    }

    return NextResponse.json({
      items: mapped,
      summary: {
        total: mapped.length,
        statusCounts,
        approvedPass,
        approvedFail,
        passRate:
          approvedPass + approvedFail > 0
            ? Math.round((approvedPass / (approvedPass + approvedFail)) * 1000) / 10
            : 0,
      },
      meta: {
        campuses,
        periods,
        staffUsers,
        forms: Object.values(PRESCHOOL_FORM_REGISTRY),
        docTt02PendingRules: DOC_TT_02_PENDING_RULES,
        viewer: {
          userId: ctx.userId,
          fullName: actorFullName,
          role: ctx.role,
          roles: userRoles,
          isSystemWide,
        },
      },
    })
  } catch (err: any) {
    console.error("GET /api/preschool-workflow error:", err)
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireStaffSession()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const actorFullName = ctx.user?.fullName || ctx.user?.name || ctx.userEmail

    const userRoles = getNormalizedRoles(ctx.role, ctx.roles)
    const canCreate = userRoles.some((r) =>
      [
        "ADMIN",
        "SUPER_ADMIN",
        "SUPERADMIN",
        "KTDBCL",
        "KT_DBCL",
        "KHAO_THI",
        "GDCS",
        "BGH",
        "BGH_MN",
        "NHOM_TRUONG_MN",
        "GIAO_VU",
        "GIAOVU",
        "GIAO_VU_CS",
        "TU_VAN",
        "TU_VAN_TUYEN_SINH",
        "TUYENSINH",
      ].includes(r)
    )
    if (!canCreate) {
      return NextResponse.json({ error: "Bạn không có quyền tiếp nhận hồ sơ khảo sát Mầm non." }, { status: 403 })
    }

    await ensurePreschoolWorkflowSchema()
    const body = await req.json()

    const fullName = String(body.fullName || "").trim()
    if (!fullName) {
      return NextResponse.json({ error: "Vui lòng nhập họ tên trẻ." }, { status: 400 })
    }

    // Resolve periodId (use selected or latest active PreschoolInputAssessmentPeriod)
    let periodId = body.periodId ? String(body.periodId) : ""
    if (!periodId) {
      const latestPeriod = await (prisma as any).preschoolInputAssessmentPeriod.findFirst({
        orderBy: { createdAt: "desc" },
        select: { id: true },
      })
      if (!latestPeriod) {
        return NextResponse.json(
          { error: "Chưa có Kỳ khảo sát Mầm non nào trong hệ thống. Vui lòng tạo Kỳ khảo sát trước." },
          { status: 400 }
        )
      }
      periodId = latestPeriod.id
    }

    const nowIso = new Date().toISOString()
    const studentId = generateId("ps_stu")
    const studentCode =
      String(body.studentCode || "").trim() ||
      `MN${new Date().getFullYear().toString().slice(-2)}${Math.floor(10000 + Math.random() * 90000)}`
    const dateOfBirthIso = body.dateOfBirth ? new Date(body.dateOfBirth).toISOString() : null
    const appointmentIso = body.appointmentAt ? new Date(body.appointmentAt).toISOString() : nowIso
    const intakeMode = body.intakeMode === "HOC_TRAI_NGHIEM" ? "HOC_TRAI_NGHIEM" : "KHAO_SAT_MOI"
    const surveySystem = formatPreschoolSystemLabel(body.surveySystem)
    const grade = String(body.grade || "").trim() || "Mẫu giáo bé"
    const registeredCampus = String(body.registeredCampus || body.campus || "").trim() || null
    const ownerUserId = body.ownerUserId || ctx.userId
    const ownerUserName = body.ownerUserName || actorFullName || "Cán bộ tiếp nhận"

    await prisma.$executeRawUnsafe(
      `INSERT INTO "PreschoolInputAssessmentStudent"
        ("id", "studentCode", "fullName", "dateOfBirth", "gender", "grade", "surveySystem", "periodId", "batchId",
         "admissionCampus", "registeredCampus", "ownerUserId", "ownerUserName", "intakeMode", "appointmentAt",
         "workflowStatus", "isAbsent", "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DA_HEN', false, ?, ?)`,
      studentId,
      studentCode,
      fullName,
      dateOfBirthIso,
      body.gender || null,
      grade,
      surveySystem,
      periodId,
      body.batchId || null,
      registeredCampus,
      registeredCampus,
      ownerUserId,
      ownerUserName,
      intakeMode,
      appointmentIso,
      nowIso,
      nowIso
    )

    const suggestion = suggestPreschoolForm({
      dateOfBirth: dateOfBirthIso,
      surveyDate: appointmentIso,
      grade,
      surveySystem,
    })

    const roundId = generateId("ps_rnd")
    await prisma.$executeRawUnsafe(
      `INSERT INTO "PreschoolAssessmentRound"
        ("id", "studentId", "roundNumber", "roundType", "status", "scheduledAt", "campusName",
         "assignedTeacherId", "assignedTeacherName", "assignedMedicalId", "assignedMedicalName",
         "suggestedFormCode", "formCode", "formVersion", "isAgeBoundary", "ageBoundaryReason",
         "createdAt", "updatedAt")
       VALUES (?, ?, 1, ?, 'SCHEDULED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      roundId,
      studentId,
      intakeMode,
      appointmentIso,
      registeredCampus,
      body.assignedTeacherId || null,
      body.assignedTeacherName || null,
      body.assignedMedicalId || null,
      body.assignedMedicalName || null,
      suggestion.suggestedFormCode,
      suggestion.isAgeBoundary ? null : suggestion.suggestedFormCode,
      suggestion.formVersion,
      suggestion.isAgeBoundary ? 1 : 0,
      suggestion.boundaryReason,
      nowIso,
      nowIso
    )

    await appendPreschoolAuditLog({
      studentId,
      roundId,
      action: "CREATE_INTAKE",
      fromStatus: null,
      toStatus: "DA_HEN",
      actorId: ctx.userId,
      actorName: actorFullName,
      actorRole: ctx.role,
      source: "WEB_UI",
      detail: {
        studentCode,
        fullName,
        grade,
        surveySystem,
        registeredCampus,
        intakeMode,
        appointmentAt: appointmentIso,
        suggestedFormCode: suggestion.suggestedFormCode,
        isAgeBoundary: suggestion.isAgeBoundary,
      },
    })

    return NextResponse.json({
      success: true,
      id: studentId,
      studentCode,
      roundId,
      suggestion,
    })
  } catch (err: any) {
    console.error("POST /api/preschool-workflow error:", err)
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 })
  }
}
