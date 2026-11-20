import { prisma } from "@/lib/db"
import { parseRawStudentTestStatus } from "@/lib/ktdbcl/thkqPeriodicReportEngine"
import { generateEntranceCommitmentReport } from "@/lib/ktdbcl/entranceCommitmentReportEngine"
import { ResolvedDashboardContext, resolveBenchmarkScore } from "./baseContext"
import {
  computeNextReviewDate,
  isApprovedAdmissionPass,
  isConfirmedEnrollment,
  isDateInMonth,
  isInternalSkylineTransfer,
  matchesLevelFilter,
  normalizePsychologyOutcome,
  round1,
} from "./stats"
import {
  AcademicSupportItem,
  AchievementExamRow,
  AchievementsCertsTabPayload,
  AdmissionsBatchGradeRow,
  AdmissionsMobilityTabPayload,
  CampusQualityAccessScope,
  EvaluationPeriodCode,
  MobilityDetailRow,
  ObservationDeptTeacherRow,
  ObservationTabPayload,
  PsychologyTrackingItem,
  StudentSupportTabPayload,
} from "./types"

function formatDateVi(d: Date | null | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return "—"
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

// ============================================================================
// TAB 2: TUYỂN SINH & ĐẦU VÀO + BIẾN ĐỘNG HỌC SINH
// ============================================================================
export async function getAdmissionsMobilityTab(
  ctx: ResolvedDashboardContext,
  _scope: CampusQualityAccessScope
): Promise<AdmissionsMobilityTabPayload> {
  const { academicYearId } = ctx
  const campusIdFilter = ctx.allowedCampusFilter ? { in: ctx.allowedCampusFilter } : undefined

  const [k12Admissions, preschoolAdmissions, transfers] = await Promise.all([
    prisma.inputAssessmentStudent.findMany({
      where: {
        period: {
          academicYearId,
          ...(campusIdFilter ? { campusId: campusIdFilter } : {}),
        },
      },
      include: {
        batch: { select: { id: true, name: true, startDate: true } },
        enrollmentClass: {
          select: { className: true, campus: { select: { campusName: true } } },
        },
      },
    }),
    prisma.preschoolInputAssessmentStudent.findMany({
      where: {
        period: {
          academicYearId,
          ...(campusIdFilter ? { campusId: campusIdFilter } : {}),
        },
      },
      include: {
        batch: { select: { id: true, name: true, startDate: true } },
        enrollmentClass: {
          select: { className: true, campus: { select: { campusName: true } } },
        },
      },
    }),
    prisma.studentTransfer.findMany({
      where: { student: { academicYearId } },
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            studentName: true,
            classId: true,
            campusId: true,
            campus: { select: { campusName: true } },
            class: { select: { className: true, grade: true, level: true } },
          },
        },
      },
      orderBy: { transferDate: "desc" },
    }),
  ])

  const combined = [
    ...k12Admissions.map((a) => ({ ...a, block: "K12" as const })),
    ...preschoolAdmissions.map((a) => ({ ...a, block: "MAM_NON" as const })),
  ].filter((a) => {
    const lvl = a.block === "MAM_NON" ? "MAM_NON" : undefined
    if (!matchesLevelFilter(lvl, a.grade, ctx.level)) return false
    if (ctx.grade !== "ALL" && String(a.grade || "").trim() !== ctx.grade) return false
    return true
  })

  const groupMap = new Map<string, AdmissionsBatchGradeRow>()
  let totalSurveyed = 0
  let totalPassed = 0
  let totalEnrolled = 0
  let pendingCurrentMonthCount = 0

  const mobilityRows: MobilityDetailRow[] = []

  for (const adm of combined) {
    const batchId = adm.batchId || "NO_BATCH"
    const batchName = adm.batch?.name || "Đợt chung"
    const targetGrade = String(adm.grade || "Chưa rõ").trim()
    const key = `${adm.block}::${batchId}::${targetGrade}`
    const row = groupMap.get(key) || {
      rowKey: key,
      batchId,
      batchName,
      blockType: adm.block,
      targetGrade,
      surveyedCount: 0,
      passedCount: 0,
      committedCount: 0,
      enrolledCount: 0,
      pendingCount: 0,
      passRate: null,
      enrollmentRate: null,
    }

    const st = isApprovedAdmissionPass(adm.admissionResult)
    const enrolled = isConfirmedEnrollment(
      adm.enrollmentStatus,
      adm.enrollmentClassId,
      adm.enrollmentDate
    )

    if (!adm.isAbsent) {
      row.surveyedCount++
      totalSurveyed++
    }
    if (st.isPassed) {
      row.passedCount++
      totalPassed++
      if (st.isCommitted) row.committedCount++
    }
    if (!adm.isAbsent && st.isPending) {
      row.pendingCount++
      const refDate = adm.batch?.startDate || adm.createdAt
      if (isDateInMonth(refDate, ctx.currentSystemMonthKey)) {
        pendingCurrentMonthCount++
      }
    }
    if (enrolled) {
      row.enrolledCount++
      totalEnrolled++
      mobilityRows.push({
        id: `NEW_${adm.id}`,
        studentCode: adm.enrollmentCode || adm.studentCode,
        studentName: adm.fullName,
        className: adm.enrollmentClass?.className || `Dự kiến K${targetGrade}`,
        campusName: adm.enrollmentClass?.campus?.campusName || adm.admissionCampus || "—",
        movementType: "NEW_ENROLLMENT",
        movementLabel: "Nhập học mới",
        effectiveDate: formatDateVi(adm.enrollmentDate || adm.updatedAt),
        counterpartySchoolOrCampus: adm.oldSchoolName || "Tuyển sinh mới",
        reason: adm.admissionResult || "Đã xác nhận nhập học",
      })
    }

    groupMap.set(key, row)
  }

  const batchGradeRows = Array.from(groupMap.values())
    .map((r) => ({
      ...r,
      passRate: r.surveyedCount > 0 ? round1((r.passedCount / r.surveyedCount) * 100) : null,
      enrollmentRate: r.passedCount > 0 ? round1((r.enrolledCount / r.passedCount) * 100) : null,
    }))
    .sort((a, b) => a.batchName.localeCompare(b.batchName, "vi") || a.targetGrade.localeCompare(b.targetGrade, "vi", { numeric: true }))

  // Mobility transfers: paired detection for internal Sky-Line transfers
  const transfersByCode = new Map<string, typeof transfers>()
  for (const t of transfers) {
    const code = t.student?.studentCode || t.studentId
    const list = transfersByCode.get(code) || []
    list.push(t)
    transfersByCode.set(code, list)
  }

  const hasPaired = (t: (typeof transfers)[number]) => {
    const code = t.student?.studentCode || t.studentId
    const siblings = transfersByCode.get(code) || []
    const opp = t.type === "OUT" ? "IN" : t.type === "IN" ? "OUT" : ""
    if (!opp) return false
    return siblings.some(
      (s) =>
        s.id !== t.id &&
        s.type === opp &&
        Math.abs(s.transferDate.getTime() - t.transferDate.getTime()) <= 31 * 86400000
    )
  }

  let externalIn = 0
  let externalOut = 0
  let internalIn = 0
  let internalOut = 0
  let sysInternalIn = 0
  let sysInternalOut = 0

  for (const t of transfers) {
    if (t.type !== "IN" && t.type !== "OUT") continue
    const internal = isInternalSkylineTransfer(t.destinationSchool, t.reason, hasPaired(t))
    if (internal) {
      if (t.type === "IN") sysInternalIn++
      if (t.type === "OUT") sysInternalOut++
    }

    const st = t.student
    const inCampus = !ctx.allowedCampusFilter || (st?.campusId && ctx.allowedCampusFilter.includes(st.campusId))
    const inClass = ctx.classId === "ALL" || st?.classId === ctx.classId
    const inLevel = matchesLevelFilter(st?.class?.level, st?.class?.grade, ctx.level)
    const inGrade = ctx.grade === "ALL" || st?.class?.grade === ctx.grade
    if (!inCampus || !inClass || !inLevel || !inGrade) continue

    let movementType: MobilityDetailRow["movementType"]
    let movementLabel: string
    if (t.type === "IN") {
      if (internal) {
        internalIn++
        movementType = "INTERNAL_IN"
        movementLabel = "Chuyển đến (Nội bộ Sky-Line)"
      } else {
        externalIn++
        movementType = "EXTERNAL_IN"
        movementLabel = "Chuyển đến (Trường ngoài)"
      }
    } else {
      if (internal) {
        internalOut++
        movementType = "INTERNAL_OUT"
        movementLabel = "Chuyển đi (Nội bộ Sky-Line)"
      } else {
        externalOut++
        movementType = "EXTERNAL_OUT"
        movementLabel = "Chuyển đi (Trường ngoài)"
      }
    }

    mobilityRows.push({
      id: t.id,
      studentCode: st?.studentCode || "",
      studentName: st?.studentName || "—",
      className: st?.class?.className || "—",
      campusName: st?.campus?.campusName || "—",
      movementType,
      movementLabel,
      effectiveDate: formatDateVi(t.transferDate),
      counterpartySchoolOrCampus: t.destinationSchool || (internal ? "Cơ sở Sky-Line" : "Chưa ghi nhận"),
      reason: t.reason || "—",
    })
  }

  return {
    summary: {
      surveyedCount: totalSurveyed,
      passedCount: totalPassed,
      enrolledCount: totalEnrolled,
      pendingCurrentMonthCount,
      currentMonthLabel: ctx.currentSystemMonthLabel,
    },
    batchGradeRows,
    mobilitySummary: {
      newEnrollments: totalEnrolled,
      externalIn,
      externalOut,
      internalIn,
      internalOut,
      systemInternalNet: sysInternalIn - sysInternalOut,
    },
    mobilityRows: mobilityRows.slice(0, 300),
  }
}

// ============================================================================
// TAB 3: THÀNH TÍCH & CHỨNG CHỈ
// ============================================================================
export async function getAchievementsCertsTab(
  ctx: ResolvedDashboardContext,
  _scope: CampusQualityAccessScope
): Promise<AchievementsCertsTabPayload> {
  const { academicYearId, scopedClassIds } = ctx
  const classIdFilter = scopedClassIds.length > 0 ? { in: scopedClassIds } : { in: ["__NONE__"] }

  const [domesticExams, intlSessions] = await Promise.all([
    prisma.exam.findMany({
      where: { academicYearId },
      include: {
        category: { select: { name: true } },
        students: {
          where: { student: { classId: classIdFilter } },
          include: {
            student: {
              select: {
                id: true,
                studentCode: true,
                studentName: true,
                class: { select: { className: true, grade: true } },
              },
            },
          },
        },
        achievements: {
          include: {
            teacher: { select: { teacherName: true } },
            students: {
              where: { student: { classId: classIdFilter } },
              include: {
                student: {
                  select: {
                    id: true,
                    studentCode: true,
                    studentName: true,
                    class: { select: { className: true, grade: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.intlExamSession.findMany({
      where: {
        OR: [{ academicYearId }, { academicYearText: ctx.academicYearName }],
      },
      include: {
        results: {
          include: { certificate: true, skillResults: true },
        },
      },
    }),
  ])

  const uniqueParticipants = new Set<string>()
  const uniqueAwarded = new Set<string>()
  let totalSittings = 0
  let totalAwards = 0
  let certificatesIssued = 0

  const exams: AchievementExamRow[] = []

  // Domestic exams
  for (const ex of domesticExams) {
    if (ex.students.length === 0 && ex.achievements.every((a) => a.students.length === 0)) continue

    const achByStudent = new Map<string, { award: string; owner: string; isCert: boolean }>()
    for (const ach of ex.achievements) {
      for (const sa of ach.students) {
        uniqueAwarded.add(sa.studentId)
        totalAwards++
        const isCert = ach.category === "CHUNG_NHAN"
        if (isCert) certificatesIssued++
        achByStudent.set(sa.studentId, {
          award: `${ach.name} (${ach.level})`,
          owner: ach.teacher?.teacherName || ach.teacherName || "GV bồi dưỡng",
          isCert,
        })
      }
    }

    const gradeClassMap = new Map<
      string,
      AchievementExamRow["gradeClassBreakdown"][number]
    >()

    let hasResultCount = 0
    let awardedCount = 0
    let certCount = 0

    for (const es of ex.students) {
      uniqueParticipants.add(es.studentId)
      totalSittings++
      const st = es.student
      const grade = st.class?.grade || "—"
      const className = st.class?.className || "—"
      const key = `${grade}::${className}`
      const grp = gradeClassMap.get(key) || {
        grade,
        className,
        registeredCount: 0,
        satCount: 0,
        awardedCount: 0,
        certificatesIssuedCount: 0,
        students: [],
      }
      grp.registeredCount++
      grp.satCount++
      const achInfo = achByStudent.get(es.studentId)
      if (es.score !== null && es.score !== undefined) hasResultCount++
      if (achInfo) {
        grp.awardedCount++
        awardedCount++
        if (achInfo.isCert) {
          grp.certificatesIssuedCount++
          certCount++
        }
      }
      grp.students.push({
        studentId: st.id,
        studentCode: st.studentCode,
        studentName: st.studentName,
        className,
        awardOrLevel: achInfo?.award || "Tham dự",
        scoreOrBand: es.score !== null && es.score !== undefined ? String(es.score) : "—",
        certificateStatus: achInfo?.isCert ? "Đã cấp chứng nhận" : "—",
        ownerTeacher: achInfo?.owner || "—",
      })
      gradeClassMap.set(key, grp)
    }

    exams.push({
      examId: ex.id,
      examName: ex.name,
      source: "DOMESTIC_EXAM",
      categoryLabel: ex.category?.name || "Kỳ thi học thuật / Phong trào",
      registeredCount: ex.students.length,
      satCount: ex.students.length,
      hasResultCount,
      awardedCount,
      metTargetCount: awardedCount,
      certificatesIssuedCount: certCount,
      gradeClassBreakdown: Array.from(gradeClassMap.values()).sort((a, b) =>
        a.grade.localeCompare(b.grade, "vi", { numeric: true }) || a.className.localeCompare(b.className, "vi")
      ),
    })
  }

  // International Exam Sessions
  for (const sess of intlSessions) {
    const scoped = sess.results.filter((r) => {
      if (
        ctx.allowedCampusFilter &&
        r.campusIdSnapshot &&
        !ctx.allowedCampusFilter.includes(r.campusIdSnapshot)
      ) {
        return false
      }
      if (ctx.grade !== "ALL" && r.gradeSnapshot && r.gradeSnapshot !== ctx.grade) return false
      if (ctx.classId !== "ALL" && r.classIdSnapshot && r.classIdSnapshot !== ctx.classId) return false
      if (!matchesLevelFilter(undefined, r.gradeSnapshot, ctx.level)) return false
      return true
    })
    if (scoped.length === 0) continue

    const gradeClassMap = new Map<
      string,
      AchievementExamRow["gradeClassBreakdown"][number]
    >()
    let satCount = 0
    let hasResultCount = 0
    let awardedCount = 0
    let metTargetCount = 0
    let certCount = 0

    for (const r of scoped) {
      const stKey = r.studentId || r.id
      const sat = r.sittingStatus !== "ABSENT" && r.sittingStatus !== "WITHDRAWN"
      if (sat) {
        satCount++
        uniqueParticipants.add(stKey)
        totalSittings++
      }
      if (r.sittingStatus === "COMPLETED") hasResultCount++

      const metTarget = Boolean(
        r.yleMeetsInternalTarget ||
          r.camMeetsTargetLevel ||
          (r.ieltsOverallBand && r.ieltsOverallBand >= 6.0)
      )
      if (metTarget) {
        metTargetCount++
        awardedCount++
        uniqueAwarded.add(stKey)
        totalAwards++
      }

      const certIssued = Boolean(
        r.certificate &&
          ["RECEIVED_AT_SCHOOL", "ISSUED_TO_STUDENT", "DIGITAL_VERIFIED"].includes(
            r.certificate.certificateStatus
          )
      )
      if (certIssued) {
        certCount++
        certificatesIssued++
      }

      const grade = r.gradeSnapshot || "—"
      const className = r.classNameSnapshot || "—"
      const key = `${grade}::${className}`
      const grp = gradeClassMap.get(key) || {
        grade,
        className,
        registeredCount: 0,
        satCount: 0,
        awardedCount: 0,
        certificatesIssuedCount: 0,
        students: [],
      }
      grp.registeredCount++
      if (sat) grp.satCount++
      if (metTarget) grp.awardedCount++
      if (certIssued) grp.certificatesIssuedCount++

      const scoreOrBand =
        r.yleTotalShields !== null && r.yleTotalShields !== undefined
          ? `${r.yleTotalShields}/15 khiên`
          : r.camOverallScale !== null && r.camOverallScale !== undefined
            ? `Scale ${r.camOverallScale} (${r.camCefrLevel || "—"})`
            : r.ieltsOverallBand !== null && r.ieltsOverallBand !== undefined
              ? `Band ${r.ieltsOverallBand.toFixed(1)}`
              : r.skillResults[0]?.officialBandLabel || "—"

      grp.students.push({
        studentId: stKey,
        studentCode: r.studentCodeSnapshot || "—",
        studentName: r.studentNameSnapshot,
        className,
        awardOrLevel: r.camOfficialGrade || r.ieltsCefrLevel || (metTarget ? "Đạt mục tiêu" : "Hoàn thành"),
        scoreOrBand,
        certificateStatus: certIssued ? "Đã cấp chứng chỉ" : r.certificate?.certificateStatus || "Chưa cấp",
        ownerTeacher: "Tổ Ngoại ngữ / CTQT",
      })
      gradeClassMap.set(key, grp)
    }

    exams.push({
      examId: sess.id,
      examName: sess.sessionName,
      source: "INTL_EXAM",
      categoryLabel: `Khảo thí Quốc tế (${sess.examFamily.replace(/_/g, " ")})`,
      registeredCount: scoped.length,
      satCount,
      hasResultCount,
      awardedCount,
      metTargetCount,
      certificatesIssuedCount: certCount,
      gradeClassBreakdown: Array.from(gradeClassMap.values()).sort((a, b) =>
        a.grade.localeCompare(b.grade, "vi", { numeric: true }) || a.className.localeCompare(b.className, "vi")
      ),
    })
  }

  return {
    summary: {
      uniqueParticipants: uniqueParticipants.size,
      totalSittings,
      uniqueAwarded: uniqueAwarded.size,
      totalAwards,
      certificatesIssued,
    },
    exams,
  }
}

// ============================================================================
// TAB 4: DỰ GIỜ & PHÁT TRIỂN CHUYÊN MÔN
// ============================================================================
export async function getObservationTab(
  ctx: ResolvedDashboardContext,
  scope: CampusQualityAccessScope
): Promise<ObservationTabPayload> {
  const { academicYearId, monthKey } = ctx
  const campusIdFilter = ctx.allowedCampusFilter ? { in: ctx.allowedCampusFilter } : undefined

  const [teachers, targets, slots] = await Promise.all([
    prisma.teacher.findMany({
      where: {
        status: "ACTIVE",
        ...(campusIdFilter ? { campusId: campusIdFilter } : {}),
        ...(scope.roleTier === "DEPARTMENT_HEAD" && scope.assignedDepartmentIds.length > 0
          ? { departmentId: { in: scope.assignedDepartmentIds } }
          : {}),
        ...(scope.roleTier === "TEACHER_SCOPED" && scope.teacherId ? { id: scope.teacherId } : {}),
      },
      include: {
        departmentRel: { select: { id: true, name: true } },
        campus: { select: { campusName: true } },
      },
      orderBy: { teacherName: "asc" },
    }),
    prisma.teacherAcademicYearTarget.findMany({
      where: { academicYearId },
      select: { teacherId: true, requiredTaught: true },
    }),
    prisma.observationSlot.findMany({
      where: {
        academicYearId,
        ...(campusIdFilter ? { campusId: campusIdFilter } : {}),
      },
      include: {
        registrations: { include: { evaluation: true } },
      },
    }),
  ])

  const targetByTeacher = new Map(targets.map((t) => [t.teacherId, t.requiredTaught || 0]))
  const monthSlots = slots.filter(
    (s) =>
      isDateInMonth(s.date, monthKey) &&
      matchesLevelFilter(s.level, s.grade, ctx.level) &&
      (ctx.grade === "ALL" || s.grade === ctx.grade) &&
      (ctx.classId === "ALL" || !s.classId || s.classId === ctx.classId)
  )

  const slotsByTeacher = new Map<string, typeof monthSlots>()
  for (const s of monthSlots) {
    const list = slotsByTeacher.get(s.teacherId) || []
    list.push(s)
    slotsByTeacher.set(s.teacherId, list)
  }

  const deptMap = new Map<string, ObservationDeptTeacherRow>()
  const unobservedTeachersList: ObservationTabPayload["unobservedTeachersList"] = []

  let totalObservedLessons = 0
  let totalPlannedLessons = 0
  let totalObservedTeachers = 0
  let totalPlannedTeachers = 0
  let totalCompliant = 0
  let totalEvaluated = 0
  let totalPendingForms = 0

  for (const t of teachers) {
    const deptId = t.departmentRel?.id || "NO_DEPT"
    const deptName = t.departmentRel?.name || "Chưa gán tổ chuyên môn"
    const dept = deptMap.get(deptId) || {
      departmentId: deptId,
      departmentName: deptName,
      teacherCount: 0,
      observedTeacherCount: 0,
      unobservedTeacherCount: 0,
      observedLessons: 0,
      plannedLessons: 0,
      compliantTeachers: 0,
      evaluatedTeachers: 0,
      pendingForms: 0,
      teachers: [],
    }

    const planned = targetByTeacher.get(t.id) || 0
    totalPlannedLessons += planned
    if (planned > 0) totalPlannedTeachers++
    dept.teacherCount++
    dept.plannedLessons += planned

    const tSlots = slotsByTeacher.get(t.id) || []
    let tObsLessons = 0
    let tPending = 0
    const approvedEvals: Array<{ rating: string | null; score: number | null }> = []

    for (const sl of tSlots) {
      const approvedRegs = sl.registrations.filter((r) => r.isApproved)
      tPending += sl.registrations.filter((r) => !r.isApproved).length
      const evals = approvedRegs
        .map((r) => r.evaluation)
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
      for (const ev of evals) {
        if (ev.reEvaluationStatus === "PENDING" || ev.supplementalStatus === "PENDING") tPending++
        if (ev.reEvaluationStatus !== "DRAFT") {
          approvedEvals.push({ rating: ev.overallRating, score: ev.totalScore })
        }
      }
      if (evals.length > 0 || sl.status === "COMPLETED") {
        tObsLessons++
      }
    }

    totalObservedLessons += tObsLessons
    totalPendingForms += tPending
    dept.observedLessons += tObsLessons
    dept.pendingForms += tPending

    const isObserved = tObsLessons > 0
    if (isObserved) {
      totalObservedTeachers++
      dept.observedTeacherCount++
    } else {
      dept.unobservedTeacherCount++
      unobservedTeachersList.push({
        teacherId: t.id,
        teacherCode: t.teacherCode,
        teacherName: t.teacherName,
        departmentName: deptName,
        campusName: t.campus?.campusName || "—",
        plannedLessons: planned,
        ownerLabel: `TTCM ${deptName}`,
      })
    }

    let compliantStatus: "COMPLIANT" | "NON_COMPLIANT" | "NO_EVAL" = "NO_EVAL"
    if (approvedEvals.length > 0) {
      totalEvaluated++
      dept.evaluatedTeachers++
      const allPass = approvedEvals.every((ev) => {
        if (ev.rating) {
          return ["Tốt", "Khá", "Đạt", "Giỏi"].some((k) =>
            ev.rating!.toLowerCase().includes(k.toLowerCase())
          )
        }
        if (ev.score !== null && ev.score !== undefined) return ev.score >= 14
        return true
      })
      compliantStatus = allPass ? "COMPLIANT" : "NON_COMPLIANT"
      if (allPass) {
        totalCompliant++
        dept.compliantTeachers++
      }
    }

    const latest = approvedEvals[approvedEvals.length - 1]
    dept.teachers.push({
      teacherId: t.id,
      teacherCode: t.teacherCode,
      teacherName: t.teacherName,
      observedLessons: tObsLessons,
      plannedLessons: planned,
      status: isObserved ? "OBSERVED" : "UNOBSERVED",
      compliantStatus,
      latestRating: latest?.rating || (latest?.score !== null && latest?.score !== undefined ? `${latest.score} đ` : "—"),
      latestScore: latest?.score ?? null,
      pendingForms: tPending,
    })

    deptMap.set(deptId, dept)
  }

  return {
    monthKey,
    monthLabel: ctx.monthLabel,
    summary: {
      observedLessons: totalObservedLessons,
      plannedLessons: totalPlannedLessons,
      observedTeachers: totalObservedTeachers,
      plannedTeachers: totalPlannedTeachers || teachers.length,
      unobservedTeachers: unobservedTeachersList.length,
      compliantTeachers: totalCompliant,
      evaluatedTeachers: totalEvaluated,
      pendingReviewForms: totalPendingForms,
    },
    departments: Array.from(deptMap.values()).sort((a, b) =>
      a.departmentName.localeCompare(b.departmentName, "vi")
    ),
    unobservedTeachersList,
  }
}

// ============================================================================
// TAB 5: HỖ TRỢ HỌC SINH (HỌC TẬP · CAM KẾT ĐẦU VÀO · THEO DÕI TÂM LÝ)
// ============================================================================
export async function getStudentSupportTab(
  ctx: ResolvedDashboardContext,
  scope: CampusQualityAccessScope
): Promise<StudentSupportTabPayload> {
  const { academicYearId, scopedClassIds, evaluationPeriod, supportFilterMode, monthKey } = ctx
  const scopedClassMap = new Map(ctx.scopedClasses.map((c) => [c.id, c]))
  const classIdFilter = scopedClassIds.length > 0 ? { in: scopedClassIds } : { in: ["__NONE__"] }

  const [
    benchmarks,
    allYearGrades,
    teachingAssignments,
    academicSupportTargets,
    advisoryStatuses,
    psychTargets,
    homeroomTeachers,
    commitmentReport,
  ] = await Promise.all([
    prisma.subjectBenchmarkConfig.findMany({
      where: { academicYearId },
      select: {
        evaluationPeriod: true,
        level: true,
        grade: true,
        subjectId: true,
        benchmarkScore: true,
      },
    }),
    prisma.subjectGradeEntry.findMany({
      where: { academicYearId, classId: classIdFilter },
      include: {
        student: { select: { id: true, studentCode: true, studentName: true, classId: true } },
        subject: { select: { id: true, subjectName: true } },
      },
    }),
    prisma.teachingAssignment.findMany({
      where: { academicYearId, classId: classIdFilter },
      include: { teacher: { select: { teacherName: true } } },
    }),
    prisma.learningSupportTarget.findMany({
      where: { academicYearId, supportType: "ACADEMIC", student: { classId: classIdFilter } },
      include: { evaluations: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.studentAdvisoryStatus.findMany({
      where: { academicYearId, student: { classId: classIdFilter } },
      select: { studentId: true },
    }),
    scope.canViewPsychology
      ? prisma.learningSupportTarget.findMany({
          where: { academicYearId, supportType: "PSYCHOLOGICAL", student: { classId: classIdFilter } },
          include: {
            student: {
              select: {
                id: true,
                studentCode: true,
                studentName: true,
                classId: true,
                campus: { select: { campusName: true } },
                class: { select: { className: true, grade: true, homeroomTeacherId: true } },
              },
            },
            assignments: { include: { teacher: { select: { id: true, teacherName: true } } } },
            evaluations: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        })
      : Promise.resolve([]),
    prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, teacherName: true },
    }),
    generateEntranceCommitmentReport(
      {
        academicYearId,
        campusId: ctx.campusId !== "ALL" ? ctx.campusId : undefined,
        classId: ctx.classId !== "ALL" ? ctx.classId : undefined,
      },
      scope
    ).catch(() => null),
  ])

  const benchmarkItems = benchmarks.map((b) => ({
    evaluationPeriod: b.evaluationPeriod,
    level: b.level || "ALL",
    grade: b.grade || "ALL",
    subjectId: b.subjectId || "ALL",
    benchmarkScore: b.benchmarkScore,
  }))

  const teacherNameById = new Map(homeroomTeachers.map((t) => [t.id, t.teacherName]))
  const teacherByClassSubject = new Map<string, string>()
  for (const ta of teachingAssignments) {
    teacherByClassSubject.set(`${ta.classId}::${ta.subjectId}`, ta.teacher?.teacherName || "—")
  }
  const supportTargetByStudent = new Map(academicSupportTargets.map((t) => [t.studentId, t]))
  const advisoryStudentSet = new Set(advisoryStatuses.map((a) => a.studentId))

  // Evaluate below-benchmark across periods per student×subject
  const periodOrder: EvaluationPeriodCode[] = ["GK1", "CK1", "GK2", "CK2"]
  const belowByStudentPeriod = new Map<string, Set<string>>() // studentId::subjectId -> periods below SKL
  const belowSubjectsInCurrentPeriod = new Map<string, number>() // studentId -> count of subjects below SKL

  const currentPeriodRows: Array<{
    entry: (typeof allYearGrades)[number]
    score: number
    bm: number | null
    below5: boolean
    belowSkl: boolean
  }> = []

  for (const g of allYearGrades) {
    const cls = scopedClassMap.get(g.classId)
    if (!cls) continue
    if (ctx.subjectId !== "ALL" && g.subjectId !== ctx.subjectId) continue
    const parsed = parseRawStudentTestStatus({
      rawScoreVal: g.compositeScore,
      remarkText: g.remark,
      ratingText: g.ratingValue,
    })
    if (parsed.statusInTest !== "VALID_SCORE" || parsed.officialScore === null) continue
    const bm = resolveBenchmarkScore(
      benchmarkItems,
      g.evaluationPeriod,
      cls.normalizedLevel,
      cls.grade,
      g.subjectId
    )
    const belowSkl = bm !== null && parsed.officialScore < bm
    if (belowSkl) {
      const k = `${g.studentId}::${g.subjectId}`
      const set = belowByStudentPeriod.get(k) || new Set<string>()
      set.add(g.evaluationPeriod)
      belowByStudentPeriod.set(k, set)
    }

    if (g.evaluationPeriod === evaluationPeriod) {
      if (belowSkl) {
        belowSubjectsInCurrentPeriod.set(
          g.studentId,
          (belowSubjectsInCurrentPeriod.get(g.studentId) || 0) + 1
        )
      }
      currentPeriodRows.push({
        entry: g,
        score: parsed.officialScore,
        bm,
        below5: parsed.officialScore < 5.0,
        belowSkl,
      })
    }
  }

  const hasConsecutiveBelow = (studentId: string, subjectId: string) => {
    const set = belowByStudentPeriod.get(`${studentId}::${subjectId}`)
    if (!set || set.size < 2) return false
    for (let i = 0; i < periodOrder.length - 1; i++) {
      if (set.has(periodOrder[i]) && set.has(periodOrder[i + 1])) return true
    }
    return false
  }

  const academicSupportItems: AcademicSupportItem[] = []
  const uniqueAcademicSupportStudents = new Set<string>()

  for (const row of currentPeriodRows) {
    let include = false
    let triggerReason = ""
    if (supportFilterMode === "BELOW_5" && row.below5) {
      include = true
      triggerReason = "Dưới trung bình (< 5,0)"
    } else if (supportFilterMode === "BELOW_SKL" && row.belowSkl) {
      include = true
      triggerReason = `Dưới chuẩn Sky-Line (< ${row.bm})`
    } else if (
      supportFilterMode === "MULTI_SUBJECT" &&
      row.belowSkl &&
      (belowSubjectsInCurrentPeriod.get(row.entry.studentId) || 0) >= 2
    ) {
      include = true
      triggerReason = `Dưới chuẩn ${belowSubjectsInCurrentPeriod.get(row.entry.studentId)} môn`
    } else if (
      supportFilterMode === "CONSECUTIVE_PERIODS" &&
      hasConsecutiveBelow(row.entry.studentId, row.entry.subjectId)
    ) {
      include = true
      triggerReason = "Dưới chuẩn từ 2 kỳ liên tiếp"
    }

    if (!include) continue
    uniqueAcademicSupportStudents.add(row.entry.studentId)
    const cls = scopedClassMap.get(row.entry.classId)!
    const sup = supportTargetByStudent.get(row.entry.studentId)
    const latestEval = sup?.evaluations[0] || null
    const nextReview = sup
      ? formatDateVi(computeNextReviewDate(sup.startDate, latestEval?.createdAt || null, latestEval?.periodType))
      : "Chưa lập lịch rà soát"

    academicSupportItems.push({
      rowKey: `${row.entry.studentId}::${row.entry.subjectId}`,
      studentId: row.entry.studentId,
      studentCode: row.entry.student.studentCode,
      studentName: row.entry.student.studentName,
      className: cls.className,
      grade: cls.grade,
      subjectName: row.entry.subject.subjectName,
      score: row.score,
      benchmarkScore: row.bm,
      benchmarkLabel: row.bm !== null ? `Chuẩn ${row.bm}` : "Chưa cấu hình ngưỡng",
      triggerReason,
      teacherName: teacherByClassSubject.get(`${row.entry.classId}::${row.entry.subjectId}`) || "Chưa phân công",
      nextReviewDate: nextReview,
      latestResult: latestEval?.comment || sup?.outcome || "Chưa cập nhật tiến độ",
      hasTutoringLink: Boolean(sup),
      tutoringHref: `/admin/ktdbcl/support?studentCode=${encodeURIComponent(row.entry.student.studentCode)}`,
      hasAdvisoryLink: advisoryStudentSet.has(row.entry.studentId),
      advisoryHref: `/admin/co-van-hoc-tap?studentCode=${encodeURIComponent(row.entry.student.studentCode)}`,
    })
  }

  // Entrance commitment rows (reusing official SSM engine)
  const commitmentRows =
    commitmentReport?.classGroups?.flatMap((g) =>
      g.rows.map((r) => ({
        stt: r.stt,
        studentCode: r.studentCode,
        studentName: r.studentName,
        className: r.className,
        committedSubject: r.committedSubject,
        ksdn: { display: r.scores["KSĐN"].display, arrow: r.scores["KSĐN"].arrow, score: r.scores["KSĐN"].score },
        gk1: { display: r.scores["GK1"].display, arrow: r.scores["GK1"].arrow, score: r.scores["GK1"].score },
        ck1: { display: r.scores["CK1"].display, arrow: r.scores["CK1"].arrow, score: r.scores["CK1"].score },
        gk2: { display: r.scores["GK2"].display, arrow: r.scores["GK2"].arrow, score: r.scores["GK2"].score },
        ck2: { display: r.scores["CK2"].display, arrow: r.scores["CK2"].arrow, score: r.scores["CK2"].score },
      }))
    ) || []

  // Psychology tracking
  const psychItems: PsychologyTrackingItem[] = []
  let psychActive = 0
  let psychDue = 0
  let psychAchieved = 0

  for (const t of psychTargets) {
    const latestEval = t.evaluations[0] || null
    const outcome = normalizePsychologyOutcome(t.outcome, latestEval?.trackingLevel, t.terminationStatus)
    const nextReview = computeNextReviewDate(t.startDate, latestEval?.createdAt || null, latestEval?.periodType)
    const isDue = !outcome.isGoalAchieved && (isDateInMonth(nextReview, monthKey) || nextReview <= new Date())

    if (outcome.isGoalAchieved) psychAchieved++
    else if (t.status === "ACTIVE") psychActive++
    if (isDue) psychDue++

    const primaryOwner = t.assignments[0]?.teacher?.teacherName || "Chưa phân công chuyên viên"
    const homeroomName = t.student.class?.homeroomTeacherId
      ? teacherNameById.get(t.student.class.homeroomTeacherId) || "—"
      : "—"

    psychItems.push({
      id: t.id,
      studentId: t.student.id,
      studentCode: t.student.studentCode,
      studentName: t.student.studentName,
      className: t.student.class?.className || "—",
      grade: t.student.class?.grade || "—",
      campusName: t.student.campus?.campusName || "—",
      primaryOwnerName: primaryOwner,
      homeroomTeacherName: homeroomName,
      status: t.status,
      statusLabel: outcome.isGoalAchieved ? "Đã kết thúc / Đạt mục tiêu" : "Đang theo dõi",
      reviewDate: formatDateVi(nextReview),
      isDueInMonth: isDue,
      latestOutcomeCode: outcome.code,
      latestOutcomeLabel: outcome.label,
      latestComment: latestEval?.comment || t.notes || "—",
      ssmHref: `/admin/ktdbcl/support?type=PSYCHOLOGICAL&studentCode=${encodeURIComponent(t.student.studentCode)}`,
    })
  }

  return {
    academicSupport: {
      filterMode: supportFilterMode,
      uniqueStudentCount: uniqueAcademicSupportStudents.size,
      totalRows: academicSupportItems.length,
      items: academicSupportItems.slice(0, 400),
    },
    entranceCommitment: {
      studentCount: commitmentReport?.summary?.totalDistinctStudents || 0,
      rowCount: commitmentRows.length,
      rows: commitmentRows,
    },
    psychologyTracking: {
      canView: scope.canViewPsychology,
      groupBy: ctx.psychologyGroupBy,
      activeCount: psychActive,
      dueForReviewCount: psychDue,
      achievedGoalCount: psychAchieved,
      items: psychItems,
    },
  }
}
