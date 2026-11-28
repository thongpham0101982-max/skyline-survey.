import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getAdminSession } from "@/lib/session"
import { resolveCampusQualityScope, resolveEffectiveCampusIds } from "@/lib/campus-quality/scope"
import { ensureTeacherQualitySchema } from "@/lib/teacher-quality/schemaEnsure"
import {
  aggregateMonthlyObservationRows,
  formatMonthLabelVi,
  getCurrentVietnamMonthKey,
  getVietnamMonthKey,
  normalizeLevelCategory,
  type EngineObservationSlotInput,
  type EngineTargetInput,
  type EngineTeacherInput,
  type EngineTeachingLogInput,
  type EngineTimetableSlotInput,
} from "@/lib/teacher-quality/monthlyObservationEngine"
import type { LinkedCoachingSummary, MonthlyObservationResponse } from "@/lib/teacher-quality/types"

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
    // Fallback: 12 months around current month
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
    const search = (sp.get("search") || "").trim()
    const statusFilter = sp.get("statusFilter") || "ALL"

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

    const scope = await resolveCampusQualityScope(userId, roleCode, activeAy.id)
    const canAccess =
      scope.canViewReport ||
      adminSession.isSuperAdmin ||
      adminSession.isHeadOfAcademic ||
      adminSession.isTBP ||
      adminSession.isTTCM ||
      adminSession.isGDCS

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền truy cập phân hệ Quản trị chất lượng giáo viên" },
        { status: 403 }
      )
    }

    const { campusIdParam, allowedCampusFilter } = resolveEffectiveCampusIds(
      requestedCampusId || (scope.isCampusRestricted ? scope.defaultCampusId : "ALL"),
      scope
    )

    const currentMonthKey = getCurrentVietnamMonthKey()
    const monthKey = /^\d{4}-\d{2}$/.test(requestedMonth) ? requestedMonth : currentMonthKey

    const [campuses, departments, rawTeachers, targets, rawSlots, rawTimetableVersions, rawTeachingLogs] =
      await Promise.all([
        prisma.campus.findMany({
          where: {
            status: "ACTIVE",
            ...(scope.isCampusRestricted && scope.allowedCampusIds.length > 0
              ? { id: { in: scope.allowedCampusIds } }
              : {}),
          },
          select: { id: true, campusCode: true, campusName: true },
          orderBy: { campusCode: "asc" },
        }),
        prisma.department.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, name: true, blockCM: true },
          orderBy: { name: "asc" },
        }),
        prisma.teacher.findMany({
          where: {
            status: "ACTIVE",
            ...(allowedCampusFilter ? { campusId: { in: allowedCampusFilter } } : {}),
            ...(requestedDeptId && requestedDeptId !== "ALL"
              ? {
                  OR: [
                    { departmentId: requestedDeptId },
                    { departmentAssignments: { some: { departmentId: requestedDeptId } } },
                  ],
                }
              : {}),
          },
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
          where: {
            academicYearId: activeAy.id,
          },
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
            include: {
              assignment: { select: { teacherId: true, academicYearId: true } },
            },
          })
          .catch(() => []),
      ])

    // Read joinDate safely via raw SQL (works seamlessly even before Prisma client DLL reload)
    const joinDateRows = (await prisma
      .$queryRawUnsafe(`SELECT "id", "joinDate" FROM "Teacher" WHERE "joinDate" IS NOT NULL`)
      .catch(() => [])) as Array<{ id: string; joinDate: string | null }>
    const joinDateByTeacherId = new Map<string, string | null>(
      joinDateRows.map((r) => [r.id, r.joinDate])
    )

    // Read TeacherDevelopmentPlan rows safely via raw SQL
    const coachingRows = (await prisma
      .$queryRawUnsafe(
        `SELECT "id", "teacherId", "observationEvaluationId", "sourceMonth", "improvementNeeds", "developmentActivity", "mentorName", "dueDate", "status", "postCoachingNotes", "outcomeRating", "completedAt", "createdAt"
         FROM "TeacherDevelopmentPlan"
         ORDER BY "createdAt" DESC`
      )
      .catch(() => [])) as Array<{
      id: string
      teacherId: string
      observationEvaluationId: string | null
      sourceMonth: string | null
      improvementNeeds: string
      developmentActivity: string
      mentorName: string | null
      dueDate: string | null
      status: string
      postCoachingNotes: string | null
      outcomeRating: string | null
      completedAt: string | null
      createdAt: string
    }>

    const coachingByEvaluationId = new Map<string, LinkedCoachingSummary>()
    const coachingCountByTeacherId = new Map<string, number>()

    for (const c of coachingRows) {
      if (c.observationEvaluationId && !coachingByEvaluationId.has(c.observationEvaluationId)) {
        coachingByEvaluationId.set(c.observationEvaluationId, {
          id: c.id,
          status:
            c.status === "COMPLETED"
              ? "COMPLETED"
              : c.status === "IN_PROGRESS"
                ? "IN_PROGRESS"
                : "NOT_STARTED",
          activityType: null,
          developmentActivity: c.developmentActivity,
          mentorName: c.mentorName,
          dueDate: c.dueDate,
          applicationNotes: c.postCoachingNotes,
          nextSupportNeeds: null,
          postCoachingNotes: c.postCoachingNotes,
          outcomeRating: c.outcomeRating,
          completedAt: c.completedAt,
          improvementNeeds: c.improvementNeeds,
          createdAt: c.createdAt,
        })
      }
      if (!c.sourceMonth || c.sourceMonth === monthKey) {
        coachingCountByTeacherId.set(c.teacherId, (coachingCountByTeacherId.get(c.teacherId) || 0) + 1)
      }
    }

    // Pick best TimetableVersion per (campusId, levelCode): prefer PUBLISHED > APPROVED > PENDING_APPROVAL > DRAFT
    const versionRank: Record<string, number> = {
      PUBLISHED: 4,
      APPROVED: 3,
      PENDING_APPROVAL: 2,
      DRAFT: 1,
    }
    const chosenVersionIds: string[] = []
    const bestByScope = new Map<string, { id: string; rank: number }>()
    for (const v of rawTimetableVersions) {
      const rank = versionRank[String(v.status || "").toUpperCase()] || 0
      if (rank === 0) continue
      const key = `${v.campusId}::${v.levelCode}`
      const existing = bestByScope.get(key)
      if (!existing || rank > existing.rank) {
        bestByScope.set(key, { id: v.id, rank })
      }
    }
    for (const val of bestByScope.values()) chosenVersionIds.push(val.id)

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

    // Filter teachers by level if requestedLevel !== ALL
    const filteredTeachers: EngineTeacherInput[] = rawTeachers
      .map((t) => {
        const primaryDept = t.departmentRel || t.departmentAssignments?.[0]?.department || null
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
          joinDate: joinDateByTeacherId.get(t.id) || null,
        }
      })
      .filter((t) => {
        if (requestedLevel === "ALL") return true
        const divMatches = (t.divisionCodes || []).some(
          (code) => normalizeLevelCategory(code, t.departmentBlockCM) === requestedLevel
        )
        if (divMatches) return true
        if (
          requestedLevel === "MAM_NON" &&
          normalizeLevelCategory("", t.departmentBlockCM) === "MAM_NON"
        ) {
          return true
        }
        // Also check if teacher has observation slots or timetable slots in that level
        const hasSlotInLevel = rawSlots.some(
          (s) =>
            (s.teacherId === t.id || s.registrations.some((r) => r.teacherId === t.id)) &&
            normalizeLevelCategory(s.level, t.departmentBlockCM) === requestedLevel
        )
        if (hasSlotInLevel) return true
        const hasTtInLevel = rawTimetableSlots.some(
          (tt) =>
            (tt.teacherId === t.id || tt.coTeacherId === t.id || tt.altTeacherId === t.id) &&
            normalizeLevelCategory(tt.level, t.departmentBlockCM) === requestedLevel
        )
        return hasTtInLevel
      })

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

    const aggregated = aggregateMonthlyObservationRows({
      monthKey,
      teachers: filteredTeachers,
      targets: engineTargets,
      slots: engineSlots,
      timetableSlots: engineTimetableSlots,
      teachingLogs: engineTeachingLogs,
      coachingByEvaluationId,
      coachingCountByTeacherId,
    })

    // Apply search & status filter on rows while keeping summary accurate to the filtered scope
    const cleanText = (v: string) =>
      v
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")

    const q = cleanText(search)
    const filteredRows = aggregated.rows.filter((row) => {
      if (q) {
        const hay = cleanText(
          `${row.teacherName} ${row.teacherCode} ${row.departmentName} ${row.campusName} ${row.position}`
        )
        if (!hay.includes(q)) return false
      }
      if (statusFilter === "UNOBSERVED") return row.observingCompliance.code === "UNOBSERVED"
      if (statusFilter === "SHORTFALL") return row.observingCompliance.code === "SHORTFALL"
      if (statusFilter === "COMPLIANT") return row.observingCompliance.code === "COMPLIANT"
      if (statusFilter === "HAS_PENDING") return row.pendingFormsCount > 0
      if (statusFilter === "NEEDS_COACHING")
        return row.teachingCompliance.code === "NEEDS_IMPROVEMENT"
      return true
    })

    // Build available months list (academic year months + any months present in observation slots)
    const ayMonths = buildAcademicYearMonths(activeAy.startDate, activeAy.endDate, currentMonthKey)
    const monthSet = new Map(ayMonths.map((m) => [m.value, m.label]))
    for (const s of rawSlots) {
      const mk = getVietnamMonthKey(s.date)
      if (mk && !monthSet.has(mk)) {
        monthSet.set(mk, formatMonthLabelVi(mk))
      }
    }
    const availableMonths = Array.from(monthSet.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([value, label]) => ({ value, label }))

    const canCreateCoaching = Boolean(
      adminSession.isSuperAdmin ||
        adminSession.isHeadOfAcademic ||
        adminSession.isTBP ||
        adminSession.isTTCM ||
        adminSession.isGDCS ||
        scope.roleTier === "SYSTEM_QA_EXEC" ||
        scope.roleTier === "CAMPUS_MANAGER" ||
        scope.roleTier === "DEPARTMENT_HEAD"
    )

    // Mentors list for the Coaching Plan modal
    const mentors = rawTeachers.map((t) => ({
      id: t.id,
      teacherCode: t.teacherCode,
      teacherName: t.teacherName,
      position: t.position || "GV",
      departmentName: t.departmentRel?.name || "—",
      campusName: t.campus?.campusName || "—",
    }))

    const payload: MonthlyObservationResponse = {
      success: true,
      month: monthKey,
      monthLabel: formatMonthLabelVi(monthKey),
      periodSourceSummary: aggregated.periodSourceSummary,
      filters: {
        academicYearId: activeAy.id,
        month: monthKey,
        campusId: campusIdParam,
        level: requestedLevel,
        departmentId: requestedDeptId,
        search,
        statusFilter,
      },
      availableFilters: {
        academicYears: academicYears.map((y) => ({ id: y.id, name: y.name, status: y.status })),
        campuses,
        levels: LEVEL_OPTIONS,
        departments,
        months: availableMonths,
      },
      scope: {
        roleDisplayLabel: scope.roleDisplayLabel,
        isCampusRestricted: scope.isCampusRestricted,
        canCreateCoaching,
        canManageCoaching: canCreateCoaching,
      },
      summary: aggregated.summary,
      rows: filteredRows,
      mentors,
      computedAt: new Date().toISOString(),
    }

    return NextResponse.json(payload)
  } catch (err: any) {
    console.error("[GET /api/admin/teacher-quality/monthly-observations] Error:", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi tải dữ liệu dự giờ theo tháng" },
      { status: 500 }
    )
  }
}
