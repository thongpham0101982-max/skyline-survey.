import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getAdminSession } from "@/lib/session"
import { resolveCampusQualityScope, resolveEffectiveCampusIds } from "@/lib/campus-quality/scope"
import { ensureTeacherQualitySchema } from "@/lib/teacher-quality/schemaEnsure"
import {
  aggregateMonthlyObservationRows,
  classifyObservationRecord,
  formatMonthLabelVi,
  formatVietnamDate,
  getCurrentVietnamMonthKey,
  getVietnamMonthKey,
  normalizeLevelCategory,
  resolveObservationSourceRoute,
  type EngineObservationSlotInput,
  type EngineTargetInput,
  type EngineTeacherInput,
  type EngineTeachingLogInput,
  type EngineTimetableSlotInput,
} from "@/lib/teacher-quality/monthlyObservationEngine"
import {
  buildGroupReportSummary,
  computeDueFlags,
  computeNpsScore,
  deduplicateCompetitionCount,
  normalizeCoachingStatus,
  resolveSeniorityReferenceDate,
} from "@/lib/teacher-quality/recognitionEngine"
import type {
  FollowUpObservationOption,
  LinkedCoachingSummary,
  RecognitionGroupType,
  RecognitionRecordItem,
  TeacherDevelopmentPlanItem,
  TeacherMonthlyHistoryPoint,
  TeacherNpsPeriodRow,
  TeacherOverviewRow,
  TeacherQualityRoleTier,
  TeacherQualityWorkspaceResponse,
} from "@/lib/teacher-quality/types"

export const dynamic = "force-dynamic"

const LEVEL_OPTIONS = [
  { value: "ALL", label: "Tất cả bậc học" },
  { value: "MAM_NON", label: "Mầm non" },
  { value: "TIEU_HOC", label: "Tiểu học" },
  { value: "THCS", label: "THCS" },
  { value: "THPT", label: "THPT" },
  { value: "SONG_NGU", label: "Tiếng Anh – Song ngữ" },
]

function buildAcademicYearMonths(startDate?: Date | null, endDate?: Date | null, currentMonth?: string) {
  const keys = new Set<string>()
  const nowKey = currentMonth || getCurrentVietnamMonthKey()
  keys.add(nowKey)

  if (startDate && endDate && startDate <= endDate) {
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
    let guard = 0
    while (cur <= end && guard < 18) {
      keys.add(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`)
      cur.setMonth(cur.getMonth() + 1)
      guard++
    }
  } else {
    const [y, m] = nowKey.split("-").map(Number)
    for (let i = -5; i <= 6; i++) {
      const d = new Date(y, (m || 1) - 1 + i, 1)
      keys.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
    }
  }

  return Array.from(keys)
    .sort((a, b) => b.localeCompare(a))
    .map((value) => ({ value, label: formatMonthLabelVi(value) }))
}

function cleanText(v: string) {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 })
    }

    await ensureTeacherQualitySchema()

    const adminSession = await getAdminSession()
    const userId = (session.user as any)?.id || adminSession.userId
    const roleCode = (session.user as any)?.role || adminSession.role || ""

    const sp = req.nextUrl.searchParams
    const requestedAyId = sp.get("academicYearId") || ""
    const requestedMonth = sp.get("month") || ""
    const requestedCampusId = sp.get("campusId") || ""
    const requestedLevel = sp.get("level") || "ALL"
    const requestedDeptId = sp.get("departmentId") || "ALL"
    const requestedTeacherId = sp.get("teacherId") || "ALL"
    const search = (sp.get("search") || "").trim()
    const observingStatusFilter = sp.get("observingStatusFilter") || "ALL"
    const teachingStatusFilter = sp.get("teachingStatusFilter") || "ALL"

    const academicYears = await prisma.academicYear.findMany({
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
      select: { id: true, name: true, status: true, startDate: true, endDate: true },
    })

    const activeAy =
      academicYears.find((y) => y.id === requestedAyId) ||
      academicYears.find((y) => y.status === "ACTIVE") ||
      academicYears[0]

    if (!activeAy) {
      return NextResponse.json({ success: false, error: "Chưa có dữ liệu năm học" }, { status: 400 })
    }

    const baseScope = await resolveCampusQualityScope(userId, roleCode, activeAy.id)

    // Determine 4-tier Teacher Quality role
    let roleTier: TeacherQualityRoleTier = "GV"
    let roleDisplayLabel = "Giáo viên (Hồ sơ cá nhân)"

    if (
      adminSession.isSuperAdmin ||
      adminSession.isHeadOfAcademic ||
      adminSession.isTBP ||
      baseScope.roleTier === "SYSTEM_QA_EXEC"
    ) {
      roleTier = "BAN_DHCM_KTDBCL"
      roleDisplayLabel = "Ban ĐHCM / KT&ĐBCL"
    } else if (adminSession.isGDCS || baseScope.roleTier === "CAMPUS_MANAGER") {
      roleTier = "GDCS"
      roleDisplayLabel = "Giám đốc Cơ sở (GĐCS)"
    } else if (adminSession.isTTCM || baseScope.roleTier === "DEPARTMENT_HEAD") {
      roleTier = "TTCM"
      roleDisplayLabel = "TTCM / Nhóm trưởng CM"
    } else if (baseScope.teacherId) {
      roleTier = "GV"
      roleDisplayLabel = "Giáo viên (Hồ sơ cá nhân)"
    } else {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền truy cập phân hệ Thành tích & Bồi dưỡng GV" },
        { status: 403 }
      )
    }

    const { campusIdParam, allowedCampusFilter } = resolveEffectiveCampusIds(
      requestedCampusId || (baseScope.isCampusRestricted ? baseScope.defaultCampusId : "ALL"),
      baseScope
    )

    const currentMonthKey = getCurrentVietnamMonthKey()
    const monthKey = /^\d{4}-\d{2}$/.test(requestedMonth) ? requestedMonth : currentMonthKey

    const { referenceDate: seniorityRefDate, isEnded: isAyEnded } = resolveSeniorityReferenceDate({
      status: activeAy.status,
      endDate: activeAy.endDate,
    })

    // Teacher visibility filter by role tier
    const teacherWhere: any = { status: "ACTIVE" }
    if (roleTier === "GV" && baseScope.teacherId) {
      teacherWhere.id = baseScope.teacherId
    } else {
      if (allowedCampusFilter) {
        teacherWhere.campusId = { in: allowedCampusFilter }
      }
      if (roleTier === "TTCM" && baseScope.assignedDepartmentIds.length > 0 && requestedDeptId === "ALL") {
        teacherWhere.OR = [
          { departmentId: { in: baseScope.assignedDepartmentIds } },
          { departmentAssignments: { some: { departmentId: { in: baseScope.assignedDepartmentIds } } } },
        ]
      }
      if (requestedDeptId && requestedDeptId !== "ALL") {
        teacherWhere.OR = [
          { departmentId: requestedDeptId },
          { departmentAssignments: { some: { departmentId: requestedDeptId } } },
        ]
      }
    }

    const [
      campuses,
      departments,
      rawTeachers,
      allActiveMentors,
      targets,
      rawSlots,
      rawTimetableVersions,
      rawTeachingLogs,
      rawAchievements,
      rawNpsResponses,
      rawWowMoments,
    ] = await Promise.all([
      prisma.campus.findMany({
        where: {
          status: "ACTIVE",
          ...(baseScope.isCampusRestricted && baseScope.allowedCampusIds.length > 0
            ? { id: { in: baseScope.allowedCampusIds } }
            : {}),
        },
        select: { id: true, campusCode: true, campusName: true },
        orderBy: { campusCode: "asc" },
      }),
      prisma.department.findMany({
        where: {
          status: "ACTIVE",
          ...(roleTier === "TTCM" && baseScope.assignedDepartmentIds.length > 0
            ? { id: { in: baseScope.assignedDepartmentIds } }
            : {}),
        },
        select: { id: true, name: true, blockCM: true },
        orderBy: { name: "asc" },
      }),
      prisma.teacher.findMany({
        where: teacherWhere,
        include: {
          campus: { select: { id: true, campusName: true } },
          departmentRel: { select: { id: true, name: true, blockCM: true } },
          departmentAssignments: {
            include: { department: { select: { id: true, name: true, blockCM: true } } },
          },
          divisionAssignments: { select: { divisionCode: true } },
        },
        orderBy: { teacherName: "asc" },
      }),
      prisma.teacher.findMany({
        where: {
          status: "ACTIVE",
          ...(allowedCampusFilter ? { campusId: { in: allowedCampusFilter } } : {}),
        },
        select: {
          id: true,
          teacherCode: true,
          teacherName: true,
          position: true,
          campus: { select: { campusName: true } },
          departmentRel: { select: { name: true } },
        },
        orderBy: { teacherName: "asc" },
      }),
      prisma.teacherAcademicYearTarget.findMany({
        where: { academicYearId: activeAy.id },
        select: {
          teacherId: true,
          observerType: true,
          observeeType: true,
          requiredObserved: true,
          observedUnit: true,
          requiredTaught: true,
          taughtUnit: true,
          confirmed: true,
        },
      }),
      prisma.observationSlot.findMany({
        where: { academicYearId: activeAy.id },
        include: {
          teacher: { select: { id: true, teacherName: true } },
          registrations: {
            include: {
              teacher: { select: { id: true, teacherName: true } },
              evaluation: true,
            },
          },
        },
      }),
      prisma.timetableVersion.findMany({
        where: {
          academicYearId: activeAy.id,
          ...(allowedCampusFilter ? { campusId: { in: allowedCampusFilter } } : {}),
        },
        select: { id: true, status: true, campusId: true, levelCode: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.specialTeachingLog
        .findMany({
          include: { assignment: { select: { teacherId: true, academicYearId: true } } },
        })
        .catch(() => []),
      prisma.achievement
        .findMany({
          where: { academicYearId: activeAy.id, teacherId: { not: null } },
          include: {
            exam: { include: { category: { select: { name: true } } } },
            students: { select: { studentId: true } },
          },
        })
        .catch(() => []),
      prisma.npsSurveyResponse
        .findMany({
          where: { academicYearId: activeAy.id },
          include: {
            period: { select: { id: true, title: true, semester: true } },
          },
        })
        .catch(() => []),
      prisma.aiGrowthWowMoment
        .findMany({
          orderBy: { createdAt: "desc" },
          take: 200,
        })
        .catch(() => []),
    ])

    // Read joinDate & joinYear safely via raw SQL
    const seniorityRows = (await prisma
      .$queryRawUnsafe(`SELECT "id", "joinDate", "joinYear" FROM "Teacher"`)
      .catch(() => [])) as Array<{ id: string; joinDate: string | null; joinYear: number | null }>
    const seniorityMetaByTeacher = new Map(
      seniorityRows.map((r) => [r.id, { joinDate: r.joinDate, joinYear: r.joinYear }])
    )

    // Read manual TeacherRecognition records
    const rawManualRecognitions = (await prisma
      .$queryRawUnsafe(
        `SELECT * FROM "TeacherRecognition" WHERE "academicYearId" = ? ORDER BY "createdAt" DESC`,
        activeAy.id
      )
      .catch(() => [])) as any[]

    // Read TeacherDevelopmentPlan records
    const rawCoachingPlans = (await prisma
      .$queryRawUnsafe(
        `SELECT * FROM "TeacherDevelopmentPlan" WHERE ("academicYearId" = ? OR "academicYearId" IS NULL) ORDER BY "createdAt" DESC`,
        activeAy.id
      )
      .catch(() => [])) as any[]

    // Pick best TimetableVersion per (campusId, levelCode)
    const versionRank: Record<string, number> = {
      PUBLISHED: 4,
      APPROVED: 3,
      PENDING_APPROVAL: 2,
      DRAFT: 1,
    }
    const bestByScope = new Map<string, { id: string; rank: number }>()
    for (const v of rawTimetableVersions) {
      const rank = versionRank[String(v.status || "").toUpperCase()] || 0
      if (rank === 0) continue
      const key = `${v.campusId}::${v.levelCode}`
      const existing = bestByScope.get(key)
      if (!existing || rank > existing.rank) bestByScope.set(key, { id: v.id, rank })
    }
    const chosenVersionIds = Array.from(bestByScope.values()).map((x) => x.id)

    const rawTimetableSlots = await prisma.timetableSlot.findMany({
      where: {
        status: "ACTIVE",
        academicYearId: activeAy.id,
        ...(chosenVersionIds.length > 0
          ? { OR: [{ versionId: { in: chosenVersionIds } }, { versionId: null }] }
          : {}),
      },
      select: {
        teacherId: true,
        coTeacherId: true,
        altTeacherId: true,
        dayOfWeek: true,
        weekType: true,
        level: true,
      },
    })

    // Build filtered teacher list (apply level + teacherId filter)
    const allScopedTeachers: EngineTeacherInput[] = rawTeachers
      .map((t) => {
        const primaryDept = t.departmentRel || t.departmentAssignments?.[0]?.department || null
        const sen = seniorityMetaByTeacher.get(t.id)
        return {
          id: t.id,
          teacherCode: t.teacherCode,
          teacherName: t.teacherName,
          position: t.position,
          positions: t.positions,
          campusId: t.campusId,
          campusName: t.campus?.campusName || "—",
          departmentId: primaryDept?.id || t.departmentId || null,
          departmentName: primaryDept?.name || "Chưa gán tổ chuyên môn",
          departmentBlockCM: primaryDept?.blockCM || null,
          divisionCodes: (t.divisionAssignments || []).map((d) => d.divisionCode),
          joinDate: sen?.joinDate || null,
          joinYear: sen?.joinYear ?? null,
        }
      })
      .filter((t) => {
        if (requestedLevel !== "ALL") {
          const divMatch = (t.divisionCodes || []).some(
            (code) => normalizeLevelCategory(code, t.departmentBlockCM) === requestedLevel
          )
          const blockMatch =
            requestedLevel === "MAM_NON" &&
            normalizeLevelCategory("", t.departmentBlockCM) === "MAM_NON"
          const slotMatch = rawSlots.some(
            (s) =>
              (s.teacherId === t.id || s.registrations.some((r) => r.teacherId === t.id)) &&
              normalizeLevelCategory(s.level, t.departmentBlockCM) === requestedLevel
          )
          const ttMatch = rawTimetableSlots.some(
            (tt) =>
              (tt.teacherId === t.id || tt.coTeacherId === t.id || tt.altTeacherId === t.id) &&
              normalizeLevelCategory(tt.level, t.departmentBlockCM) === requestedLevel
          )
          if (!divMatch && !blockMatch && !slotMatch && !ttMatch) return false
        }
        return true
      })

    const effectiveTeachers =
      requestedTeacherId && requestedTeacherId !== "ALL"
        ? allScopedTeachers.filter((t) => t.id === requestedTeacherId)
        : allScopedTeachers

    const scopedTeacherMap = new Map(effectiveTeachers.map((t) => [t.id, t]))
    const mentorNameMap = new Map(allActiveMentors.map((m) => [m.id, m.teacherName]))

    // Map slots & evaluations for coaching links + follow-up options
    const evalLookup = new Map<
      string,
      {
        slot: (typeof rawSlots)[number]
        observerName: string
        overallRating: string | null
        totalScore: number | null
      }
    >()
    const followUpOptionsByTeacher: Record<string, FollowUpObservationOption[]> = {}

    for (const s of rawSlots) {
      for (const r of s.registrations) {
        if (!r.evaluation) continue
        const ev = r.evaluation
        const observerName = r.teacher?.teacherName || "Người dự"
        evalLookup.set(ev.id, {
          slot: s,
          observerName,
          overallRating: ev.overallRating,
          totalScore: ev.totalScore,
        })
        const cls = classifyObservationRecord(s, {
          isApproved: r.isApproved,
          evaluation: {
            id: ev.id,
            registrationId: ev.registrationId,
            slotId: ev.slotId,
            evaluatorId: ev.evaluatorId,
            overallRating: ev.overallRating,
            totalScore: ev.totalScore,
            strengths: ev.strengths,
            improvements: ev.improvements,
            generalComment: ev.generalComment,
            submittedAt: ev.submittedAt,
            reEvaluationStatus: ev.reEvaluationStatus,
            isSupplemental: ev.isSupplemental,
            supplementalStatus: ev.supplementalStatus,
            supplementalReviewedAt: ev.supplementalReviewedAt,
          },
        })
        if (cls.isCountedOfficial && scopedTeacherMap.has(s.teacherId)) {
          const list = followUpOptionsByTeacher[s.teacherId] || []
          list.push({
            evaluationId: ev.id,
            slotId: s.id,
            teacherId: s.teacherId,
            actualDateVi: formatVietnamDate(s.date),
            subjectName: s.subjectName,
            className: s.className || s.grade,
            topic: s.topic,
            observerName,
            overallRating: ev.overallRating,
            totalScore: ev.totalScore,
          })
          followUpOptionsByTeacher[s.teacherId] = list
        }
      }
    }

    // Build coaching plans list scoped to effectiveTeachers
    const now = new Date()
    const coachingByEvaluationId = new Map<string, LinkedCoachingSummary>()
    const coachingCountByTeacherId = new Map<string, number>()

    const coachingPlans: TeacherDevelopmentPlanItem[] = rawCoachingPlans
      .filter((p) => scopedTeacherMap.has(p.teacherId))
      .map((p) => {
        const t = scopedTeacherMap.get(p.teacherId)!
        const status = normalizeCoachingStatus(p.status)
        const dueFlags = computeDueFlags(p.dueDate, status, now)
        const srcEv = p.observationEvaluationId ? evalLookup.get(p.observationEvaluationId) : null
        const folEv = p.followUpEvaluationId ? evalLookup.get(p.followUpEvaluationId) : null

        const item: TeacherDevelopmentPlanItem = {
          id: p.id,
          teacherId: p.teacherId,
          teacherCode: t.teacherCode,
          teacherName: t.teacherName,
          campusId: t.campusId,
          campusName: t.campusName,
          departmentId: t.departmentId,
          departmentName: t.departmentName,
          academicYearId: p.academicYearId || activeAy.id,
          observationSlotId: p.observationSlotId || srcEv?.slot.id || null,
          observationEvaluationId: p.observationEvaluationId || null,
          sourceMonth: p.sourceMonth || (srcEv?.slot.date ? getVietnamMonthKey(srcEv.slot.date) : null),
          requestSource:
            p.requestSource === "OBSERVATION" || p.requestSource === "TEACHER_PROPOSAL"
              ? p.requestSource
              : p.observationEvaluationId
                ? "OBSERVATION"
                : "DIRECT",
          batchGroupId: p.batchGroupId || null,
          activityType: p.activityType || null,
          improvementNeeds: p.improvementNeeds || "",
          developmentActivity: p.developmentActivity || "",
          mentorTeacherId: p.mentorTeacherId || null,
          mentorName:
            p.mentorName || (p.mentorTeacherId ? mentorNameMap.get(p.mentorTeacherId) || null : null),
          dueDate: p.dueDate ? new Date(p.dueDate).toISOString() : null,
          isDueSoon: dueFlags.isDueSoon,
          isOverdue: dueFlags.isOverdue,
          status,
          postCoachingNotes: p.postCoachingNotes || null,
          applicationNotes: p.applicationNotes || p.postCoachingNotes || null,
          nextSupportNeeds: p.nextSupportNeeds || null,
          followUpSlotId: p.followUpSlotId || folEv?.slot.id || null,
          followUpEvaluationId: p.followUpEvaluationId || null,
          outcomeRating: p.outcomeRating || null,
          completedAt: p.completedAt ? new Date(p.completedAt).toISOString() : null,
          createdByName: p.createdByName || null,
          createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : now.toISOString(),
          updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : now.toISOString(),
          sourceObservation: srcEv
            ? {
                actualDateVi: formatVietnamDate(srcEv.slot.date),
                campusName: srcEv.slot.campusName || t.campusName,
                className: srcEv.slot.className || srcEv.slot.grade || "—",
                subjectName: srcEv.slot.subjectName || "—",
                topic: srcEv.slot.topic || "—",
                observerName: srcEv.observerName,
                overallRating: srcEv.overallRating,
                totalScore: srcEv.totalScore,
                sourceRoute: resolveObservationSourceRoute(srcEv.slot),
              }
            : null,
          followUpObservation: folEv
            ? {
                actualDateVi: formatVietnamDate(folEv.slot.date),
                campusName: folEv.slot.campusName || t.campusName,
                className: folEv.slot.className || folEv.slot.grade || "—",
                subjectName: folEv.slot.subjectName || "—",
                topic: folEv.slot.topic || "—",
                observerName: folEv.observerName,
                overallRating: folEv.overallRating,
                totalScore: folEv.totalScore,
                sourceRoute: resolveObservationSourceRoute(folEv.slot),
              }
            : null,
        }

        if (item.observationEvaluationId && !coachingByEvaluationId.has(item.observationEvaluationId)) {
          coachingByEvaluationId.set(item.observationEvaluationId, {
            id: item.id,
            status: item.status,
            activityType: item.activityType,
            developmentActivity: item.developmentActivity,
            mentorName: item.mentorName,
            dueDate: item.dueDate,
            applicationNotes: item.applicationNotes,
            nextSupportNeeds: item.nextSupportNeeds,
            postCoachingNotes: item.postCoachingNotes,
            outcomeRating: item.outcomeRating,
            completedAt: item.completedAt,
            improvementNeeds: item.improvementNeeds,
            createdAt: item.createdAt,
          })
        }

        if (!item.sourceMonth || item.sourceMonth === monthKey) {
          coachingCountByTeacherId.set(
            item.teacherId,
            (coachingCountByTeacherId.get(item.teacherId) || 0) + 1
          )
        }
        return item
      })

    // Engine inputs for monthly observation
    const engineTargets: EngineTargetInput[] = targets.map((tg) => ({
      teacherId: tg.teacherId,
      observerType: tg.observerType,
      observeeType: tg.observeeType,
      requiredObserved: tg.requiredObserved,
      observedUnit: tg.observedUnit,
      requiredTaught: tg.requiredTaught,
      taughtUnit: tg.taughtUnit,
      confirmed: tg.confirmed,
    }))

    const engineSlots: EngineObservationSlotInput[] = rawSlots.map((s) => ({
      id: s.id,
      teacherId: s.teacherId,
      teacherName: s.teacher?.teacherName || null,
      subjectName: s.subjectName,
      level: s.level,
      grade: s.grade,
      className: s.className,
      campusId: s.campusId,
      campusName: s.campusName,
      topic: s.topic,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      isDoublePeriod: s.isDoublePeriod,
      status: s.status,
      requestOrigin: s.requestOrigin,
      registrations: s.registrations.map((r) => ({
        id: r.id,
        slotId: r.slotId,
        teacherId: r.teacherId,
        teacherName: r.teacher?.teacherName || null,
        isApproved: r.isApproved,
        approvedAt: r.approvedAt,
        evaluation: r.evaluation
          ? {
              id: r.evaluation.id,
              registrationId: r.evaluation.registrationId,
              slotId: r.evaluation.slotId,
              evaluatorId: r.evaluation.evaluatorId,
              overallRating: r.evaluation.overallRating,
              totalScore: r.evaluation.totalScore,
              strengths: r.evaluation.strengths,
              improvements: r.evaluation.improvements,
              generalComment: r.evaluation.generalComment,
              submittedAt: r.evaluation.submittedAt,
              reEvaluationStatus: r.evaluation.reEvaluationStatus,
              isSupplemental: r.evaluation.isSupplemental,
              supplementalStatus: r.evaluation.supplementalStatus,
              supplementalReviewedAt: r.evaluation.supplementalReviewedAt,
            }
          : null,
      })),
    }))

    const engineTimetableSlots: EngineTimetableSlotInput[] = rawTimetableSlots.map((tt) => ({
      teacherId: tt.teacherId,
      coTeacherId: tt.coTeacherId,
      altTeacherId: tt.altTeacherId,
      dayOfWeek: tt.dayOfWeek,
      weekType: tt.weekType,
      level: tt.level,
    }))

    const engineTeachingLogs: EngineTeachingLogInput[] = rawTeachingLogs
      .filter((l: any) => l.assignment?.teacherId && l.assignment?.academicYearId === activeAy.id)
      .map((l: any) => ({
        teacherId: l.assignment.teacherId,
        lessonDate: l.taughtDate || l.createdAt,
        periods: 1,
      }))

    // Aggregate current selected month
    const aggregatedMonth = aggregateMonthlyObservationRows({
      monthKey,
      teachers: effectiveTeachers,
      targets: engineTargets,
      slots: engineSlots,
      timetableSlots: engineTimetableSlots,
      teachingLogs: engineTeachingLogs,
      coachingByEvaluationId,
      coachingCountByTeacherId,
      referenceDate: seniorityRefDate,
    })

    // Build available months & yearly monthly history per teacher
    const ayMonths = buildAcademicYearMonths(activeAy.startDate, activeAy.endDate, currentMonthKey)
    const monthSet = new Map(ayMonths.map((m) => [m.value, m.label]))
    for (const s of rawSlots) {
      const mk = getVietnamMonthKey(s.date)
      if (mk && !monthSet.has(mk)) monthSet.set(mk, formatMonthLabelVi(mk))
    }
    const availableMonths = Array.from(monthSet.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([value, label]) => ({ value, label }))

    // Compute per-month history for all months that have observation activity (plus selected month)
    const activeSlotMonths = Array.from(
      new Set([monthKey, ...rawSlots.map((s) => getVietnamMonthKey(s.date)).filter(Boolean)])
    ).sort((a, b) => a.localeCompare(b))

    const historyByTeacher = new Map<string, TeacherMonthlyHistoryPoint[]>()
    for (const mk of activeSlotMonths) {
      const mRes =
        mk === monthKey
          ? aggregatedMonth
          : aggregateMonthlyObservationRows({
              monthKey: mk,
              teachers: effectiveTeachers,
              targets: engineTargets,
              slots: engineSlots,
              timetableSlots: [],
              teachingLogs: [],
              coachingByEvaluationId: new Map(),
              coachingCountByTeacherId: new Map(),
              referenceDate: seniorityRefDate,
            })
      for (const r of mRes.rows) {
        const list = historyByTeacher.get(r.teacherId) || []
        list.push({
          monthKey: mk,
          monthLabel: formatMonthLabelVi(mk),
          taughtObserved: r.taughtObservedOfficial,
          observed: r.observedOfficial,
          observedQuota: r.observedQuota,
          pendingCount: r.pendingFormsCount,
          observingStatusLabel: r.observingCompliance.label,
          teachingStatusLabel: r.teachingCompliance.label,
        })
        historyByTeacher.set(r.teacherId, list)
      }
    }

    // ===== BUILD 5-GROUP RECOGNITIONS =====
    const recognitions: RecognitionRecordItem[] = []
    const canEditAllRecognitions = roleTier !== "GV"

    // 1. Manual direct-save records
    for (const rec of rawManualRecognitions) {
      const t = scopedTeacherMap.get(rec.teacherId)
      if (!t) continue
      const isSelfAiTech =
        roleTier === "GV" && rec.teacherId === baseScope.teacherId && rec.groupType === "AI_TECH"
      recognitions.push({
        id: rec.id,
        teacherId: rec.teacherId,
        teacherCode: t.teacherCode,
        teacherName: t.teacherName,
        campusId: t.campusId,
        campusName: t.campusName,
        departmentId: t.departmentId,
        departmentName: t.departmentName,
        academicYearId: rec.academicYearId,
        groupType: rec.groupType as RecognitionGroupType,
        sourceType: "MANUAL",
        sourceLabel: "Nhập trực tiếp",
        title: rec.title,
        issuingAuthority: rec.issuingAuthority || null,
        awardScope: rec.awardScope || null,
        eventBatch: rec.eventBatch || null,
        teacherRole: rec.teacherRole || null,
        participantCount: rec.participantCount ?? null,
        resultSummary: rec.resultSummary || null,
        recordedDate: rec.recordedDate || null,
        dedupKey: rec.dedupKey || null,
        notes: rec.notes || null,
        canEdit: canEditAllRecognitions || isSelfAiTech,
        createdAt: rec.createdAt ? new Date(rec.createdAt).toISOString() : now.toISOString(),
      })
    }

    // 2. Auto-linked Student Competitions from Achievement (Thành tích HS)
    for (const ach of rawAchievements) {
      if (!ach.teacherId || !scopedTeacherMap.has(ach.teacherId)) continue
      const t = scopedTeacherMap.get(ach.teacherId)!
      const studentCount = ach.students?.length || 1
      recognitions.push({
        id: `linked_ach_${ach.id}`,
        teacherId: ach.teacherId,
        teacherCode: t.teacherCode,
        teacherName: t.teacherName,
        campusId: t.campusId,
        campusName: t.campusName,
        departmentId: t.departmentId,
        departmentName: t.departmentName,
        academicYearId: ach.academicYearId,
        groupType: "STUDENT_COMPETITION",
        sourceType: "LINKED",
        sourceLabel: "Thành tích HS",
        title: ach.exam?.name || ach.name,
        issuingAuthority: ach.exam?.category?.name || ach.category || null,
        awardScope: ach.type === "DONG_DOI" ? "Đồng đội" : "Cá nhân",
        eventBatch: ach.exam?.grade || null,
        teacherRole: "GV bồi dưỡng",
        participantCount: studentCount,
        resultSummary: `${ach.name} (${ach.level}) · ${studentCount} HS đạt giải`,
        recordedDate: ach.createdAt ? formatVietnamDate(ach.createdAt) : null,
        dedupKey: `ACH_${ach.id}`,
        notes: null,
        canEdit: false,
        createdAt: ach.createdAt ? new Date(ach.createdAt).toISOString() : now.toISOString(),
      })
    }

    // 3. Auto-linked AI Growth Wow Moments into AI_TECH
    for (const wow of rawWowMoments) {
      const tid = wow.observerTeacherId
      if (!tid || !scopedTeacherMap.has(tid)) continue
      const t = scopedTeacherMap.get(tid)!
      recognitions.push({
        id: `linked_wow_${wow.id}`,
        teacherId: tid,
        teacherCode: t.teacherCode,
        teacherName: t.teacherName,
        campusId: t.campusId,
        campusName: t.campusName,
        departmentId: t.departmentId,
        departmentName: t.departmentName,
        academicYearId: activeAy.id,
        groupType: "AI_TECH",
        sourceType: "LINKED",
        sourceLabel: "AI Growth",
        title: wow.category || "Ứng dụng AI trong giảng dạy",
        issuingAuthority: "Đổi mới phương pháp giảng dạy",
        awardScope: "Lớp / Tổ chuyên môn",
        eventBatch: null,
        teacherRole: "GV thực hiện",
        participantCount: null,
        resultSummary: wow.aiCelebrationQuote || null,
        recordedDate: wow.createdAt ? formatVietnamDate(wow.createdAt) : null,
        dedupKey: null,
        notes: null,
        canEdit: false,
        createdAt: wow.createdAt ? new Date(wow.createdAt).toISOString() : now.toISOString(),
      })
    }

    // 4. Auto-linked NPS PHHS (grouped by teacher + period + roleType GVCN/GVBM)
    const npsAcc = new Map<
      string,
      {
        teacherId: string
        periodId: string
        periodTitle: string
        semester: string
        roleType: "GVCN" | "GVBM" | "ALL"
        validResponses: number
        promoters: number
        passives: number
        detractors: number
      }
    >()

    for (const resp of rawNpsResponses) {
      if (!scopedTeacherMap.has(resp.teacherId)) continue
      const rt =
        resp.roleType === "GVCN" ? "GVCN" : resp.roleType === "GVBM" ? "GVBM" : "ALL"
      const key = `${resp.teacherId}::${resp.periodId}::${rt}`
      const cur = npsAcc.get(key) || {
        teacherId: resp.teacherId,
        periodId: resp.periodId,
        periodTitle: resp.period?.title || "Đợt khảo sát NPS",
        semester: resp.period?.semester || "",
        roleType: rt,
        validResponses: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
      }
      cur.validResponses++
      if (resp.npsGroup === "PROMOTER") cur.promoters++
      else if (resp.npsGroup === "DETRACTOR") cur.detractors++
      else cur.passives++
      npsAcc.set(key, cur)
    }

    const npsRows: TeacherNpsPeriodRow[] = Array.from(npsAcc.entries()).map(([key, v]) => {
      const t = scopedTeacherMap.get(v.teacherId)!
      return {
        id: key,
        teacherId: v.teacherId,
        teacherCode: t.teacherCode,
        teacherName: t.teacherName,
        campusName: t.campusName,
        departmentName: t.departmentName,
        periodId: v.periodId,
        periodTitle: v.periodTitle,
        semester: v.semester,
        roleType: v.roleType,
        roleLabel: v.roleType === "GVCN" ? "GVCN" : v.roleType === "GVBM" ? "GVBM" : "Chung",
        validResponses: v.validResponses,
        promoters: v.promoters,
        passives: v.passives,
        detractors: v.detractors,
        npsScore: computeNpsScore(v.promoters, v.detractors, v.validResponses),
      }
    })

    // Apply search + observing/teaching status filters on monthlyRows & overviewRows
    const q = cleanText(search)
    const matchesSearch = (name: string, code: string, dept: string, campus: string, pos: string) => {
      if (!q) return true
      return cleanText(`${name} ${code} ${dept} ${campus} ${pos}`).includes(q)
    }

    const filteredMonthlyRows = aggregatedMonth.rows.filter((row) => {
      if (!matchesSearch(row.teacherName, row.teacherCode, row.departmentName, row.campusName, row.position)) {
        return false
      }
      if (observingStatusFilter !== "ALL") {
        if (observingStatusFilter === "HAS_PENDING") {
          if (row.pendingFormsCount <= 0) return false
        } else if (row.observingCompliance.code !== observingStatusFilter) {
          return false
        }
      }
      if (teachingStatusFilter !== "ALL") {
        if (row.teachingCompliance.code !== teachingStatusFilter) return false
      }
      return true
    })

    // Build TeacherOverviewRow for Tab 1 (Tổng quan GV) & Tab 5 (Báo cáo chi tiết theo GV)
    const overviewRows: TeacherOverviewRow[] = aggregatedMonth.rows
      .filter((r) =>
        matchesSearch(r.teacherName, r.teacherCode, r.departmentName, r.campusName, r.position)
      )
      .map((r) => {
        const tRecs = recognitions.filter((rec) => rec.teacherId === r.teacherId)
        const tNps = npsRows.filter((n) => n.teacherId === r.teacherId)
        const tCoaching = coachingPlans.filter((c) => c.teacherId === r.teacherId)

        const gvcnNps = tNps.filter((n) => n.roleType === "GVCN")
        const gvbmNps = tNps.filter((n) => n.roleType === "GVBM")

        const gvcnResp = gvcnNps.reduce((s, n) => s + n.validResponses, 0)
        const gvcnScore =
          gvcnResp > 0
            ? computeNpsScore(
                gvcnNps.reduce((s, n) => s + n.promoters, 0),
                gvcnNps.reduce((s, n) => s + n.detractors, 0),
                gvcnResp
              )
            : null

        const gvbmResp = gvbmNps.reduce((s, n) => s + n.validResponses, 0)
        const gvbmScore =
          gvbmResp > 0
            ? computeNpsScore(
                gvbmNps.reduce((s, n) => s + n.promoters, 0),
                gvbmNps.reduce((s, n) => s + n.detractors, 0),
                gvbmResp
              )
            : null

        const latestApplied = tCoaching.find((c) => c.applicationNotes || c.postCoachingNotes)

        return {
          teacherId: r.teacherId,
          teacherCode: r.teacherCode,
          teacherName: r.teacherName,
          position: r.position,
          positions: r.positions,
          campusId: r.campusId,
          campusName: r.campusName,
          departmentId: r.departmentId,
          departmentName: r.departmentName,
          levels: r.levels,
          joinDate: r.joinDate,
          joinYear: r.joinYear,
          seniorityLabel: r.seniorityLabel,

          deptAwardCount: tRecs.filter((x) => x.groupType === "DEPT_AWARD").length,
          systemAwardCount: tRecs.filter((x) => x.groupType === "SYSTEM_AWARD").length,
          studentCompetitionCount: tRecs.filter((x) => x.groupType === "STUDENT_COMPETITION").length,
          aiTechCount: tRecs.filter((x) => x.groupType === "AI_TECH").length,
          npsGvcnScore: gvcnScore,
          npsGvcnResponses: gvcnResp,
          npsGvbmScore: gvbmScore,
          npsGvbmResponses: gvbmResp,
          totalRecognitionCount: tRecs.length,

          monthTaughtObserved: r.taughtObservedOfficial,
          monthObservedDisplay: r.observedQuotaDisplay,
          monthPendingForms: r.pendingFormsCount,
          observingCompliance: r.observingCompliance,
          teachingCompliance: r.teachingCompliance,

          coachingTotalCount: tCoaching.length,
          coachingActiveCount: tCoaching.filter((c) => c.status !== "COMPLETED").length,
          coachingCompletedCount: tCoaching.filter((c) => c.status === "COMPLETED").length,
          coachingOverdueCount: tCoaching.filter((c) => c.isOverdue).length,
          coachingDueSoonCount: tCoaching.filter((c) => c.isDueSoon).length,
          latestApplicationSummary: latestApplied?.applicationNotes || null,

          monthlyHistory: historyByTeacher.get(r.teacherId) || [],
        }
      })

    // Group reports (with deduplicated student competitions!)
    const reportsByCampus = buildGroupReportSummary({
      groupBy: "campus",
      monthlyRows: aggregatedMonth.rows,
      recognitions,
      npsRows,
      coachingPlans,
    })
    const reportsByDepartment = buildGroupReportSummary({
      groupBy: "department",
      monthlyRows: aggregatedMonth.rows,
      recognitions,
      npsRows,
      coachingPlans,
    })

    const payload: TeacherQualityWorkspaceResponse = {
      success: true,
      academicYear: {
        id: activeAy.id,
        name: activeAy.name,
        status: activeAy.status,
        startDate: activeAy.startDate ? activeAy.startDate.toISOString() : null,
        endDate: activeAy.endDate ? activeAy.endDate.toISOString() : null,
        isEnded: isAyEnded,
      },
      month: monthKey,
      monthLabel: formatMonthLabelVi(monthKey),
      periodSourceSummary: aggregatedMonth.periodSourceSummary,
      filters: {
        academicYearId: activeAy.id,
        month: monthKey,
        campusId: campusIdParam,
        level: requestedLevel,
        departmentId: requestedDeptId,
        teacherId: requestedTeacherId,
        search,
        observingStatusFilter,
        teachingStatusFilter,
      },
      availableFilters: {
        academicYears: academicYears.map((y) => ({ id: y.id, name: y.name, status: y.status })),
        campuses,
        levels: LEVEL_OPTIONS,
        departments,
        teachers: allScopedTeachers.map((t) => ({
          id: t.id,
          teacherCode: t.teacherCode,
          teacherName: t.teacherName,
          campusId: t.campusId,
          departmentId: t.departmentId,
        })),
        months: availableMonths,
      },
      scope: {
        roleTier,
        roleDisplayLabel,
        currentTeacherId: baseScope.teacherId,
        isCampusRestricted: baseScope.isCampusRestricted,
        canEditRecognitions: roleTier !== "GV",
        canSelfAddAiTech: Boolean(baseScope.teacherId),
        canProposeCoaching: Boolean(baseScope.teacherId) || roleTier !== "GV",
        canAssignCoaching: roleTier !== "GV",
        canUpdateOwnCoaching: Boolean(baseScope.teacherId) || roleTier !== "GV",
        canExportReport: roleTier !== "GV",
      },
      overviewSummary: {
        totalTeachers: overviewRows.length,
        totalRecognitions: recognitions.length,
        dedupStudentCompetitions: deduplicateCompetitionCount(recognitions),
        observedCompliantCount: aggregatedMonth.summary.observedCompliantCount,
        unobservedCount: aggregatedMonth.summary.unobservedCount,
        shortfallCount: aggregatedMonth.summary.shortfallCount,
        noQuotaCount: aggregatedMonth.summary.noQuotaCount,
        coachingActiveCount: coachingPlans.filter((c) => c.status !== "COMPLETED").length,
        coachingCompletedCount: coachingPlans.filter((c) => c.status === "COMPLETED").length,
        coachingOverdueCount: coachingPlans.filter((c) => c.isOverdue).length,
        coachingDueSoonCount: coachingPlans.filter((c) => c.isDueSoon).length,
      },
      overviewRows,
      recognitions,
      npsRows,
      monthlySummary: aggregatedMonth.summary,
      monthlyRows: filteredMonthlyRows,
      coachingPlans,
      followUpOptionsByTeacher,
      reports: {
        byCampus: reportsByCampus,
        byDepartment: reportsByDepartment,
      },
      mentors: allActiveMentors.map((m) => ({
        id: m.id,
        teacherCode: m.teacherCode,
        teacherName: m.teacherName,
        position: m.position || "GV",
        departmentName: m.departmentRel?.name || "—",
        campusName: m.campus?.campusName || "—",
      })),
      computedAt: now.toISOString(),
    }

    return NextResponse.json(payload)
  } catch (err: any) {
    console.error("[GET /api/admin/teacher-quality/workspace] Error:", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi tải dữ liệu Thành tích & Bồi dưỡng GV" },
      { status: 500 }
    )
  }
}
