import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  ensureTriPartyTables,
  appendAdvisoryAuditLog
} from "@/lib/advisory/triparty-sync"
import {
  resolveAdvisoryCaller,
  resolveTeacherAssignedClassIds,
  verifyStudentRelationship
} from "@/lib/advisory/rbac-guard"
import {
  ADVISORY_JOURNEY_STAGES,
  computeStudentAdvisoryJourney,
  type AdvisoryWorkQueueItem,
  type SmartAdvisoryReminder,
  type StudentJourneyEvaluationResult
} from "@/lib/advisory/advisory-journey-engine"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  return res
}

async function getReminderConfig() {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "AdvisoryReminderConfig" WHERE "id" = 'default' LIMIT 1`
    )
    if (rows && rows[0]) {
      return {
        dueSoonHours: Number(rows[0].dueSoonHours || 48),
        overdueEscalateHours: Number(rows[0].overdueEscalateHours || 24),
        cooldownHours: Number(rows[0].cooldownHours || 12),
        unupdatedProgressDays: Number(rows[0].unupdatedProgressDays || 14),
        enableInApp: Boolean(Number(rows[0].enableInApp ?? 1))
      }
    }
  } catch {}
  return {
    dueSoonHours: 48,
    overdueEscalateHours: 24,
    cooldownHours: 12,
    unupdatedProgressDays: 14,
    enableInApp: true
  }
}

export async function GET(req: Request) {
  try {
    await ensureTriPartyTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller || !caller.authenticated) {
      return jsonResponse({ error: "Chưa xác thực đăng nhập" }, 401)
    }

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId") || ""
    const classId = searchParams.get("classId") || "ALL"
    const campusId = searchParams.get("campusId") || "ALL"
    const grade = searchParams.get("grade") || "ALL"
    const academicYearId = searchParams.get("academicYearId") || ""
    const term = (searchParams.get("term") === "HK2" ? "HK2" : "HK1") as "HK1" | "HK2"
    const statusFilter = searchParams.get("statusFilter") || "ALL"
    const stageFilter = searchParams.get("stageFilter") || "ALL"
    const search = (searchParams.get("search") || "").trim().toLowerCase()

    const reminderConfig = await getReminderConfig()

    // 1. Trường hợp Học sinh hoặc Phụ huynh xem lộ trình của chính mình / con mình
    if (caller.actorRole === "STUDENT" || caller.actorRole === "PARENT") {
      const targetStudentId = caller.actorRole === "STUDENT" ? caller.studentId || studentId : studentId
      if (!targetStudentId) {
        return jsonResponse({ error: "Thiếu mã học sinh" }, 400)
      }
      const rel = await verifyStudentRelationship(caller, targetStudentId)
      if (!rel.allowed) {
        return jsonResponse({ error: rel.reason || "Không có quyền truy cập" }, 403)
      }
    }

    // 2. Xác định danh sách lớp trong phạm vi phân quyền
    let classWhere: any = { status: "ACTIVE" }
    if (academicYearId && (!classId || classId === "ALL")) {
      classWhere.academicYearId = academicYearId
    }
    if (campusId && campusId !== "ALL") classWhere.campusId = campusId
    if (grade && grade !== "ALL") classWhere.grade = grade

    if (caller.actorRole === "TEACHER") {
      const assignedClassIds = await resolveTeacherAssignedClassIds(caller)
      if (classId && classId !== "ALL") {
        classWhere.id = classId
      } else if (assignedClassIds.length > 0) {
        classWhere.id = { in: assignedClassIds }
      }
    } else if (classId && classId !== "ALL") {
      classWhere.id = classId
    }

    const classes = await prisma.class
      .findMany({
        where: classWhere,
        include: {
          campus: { select: { id: true, campusName: true, campusCode: true } },
          teachers: {
            include: {
              teacher: { select: { id: true, userId: true, teacherCode: true, teacherName: true } }
            }
          }
        },
        orderBy: { className: "asc" }
      })
      .catch(err => {
        console.error("[advisory/journey] prisma.class.findMany error:", err)
        return [] as any[]
      })

    // Resolve homeroom teachers by homeroomTeacherId or TeacherClassAssignment
    const hrRawIds = Array.from(
      new Set(
        classes
          .flatMap((c: any) => String(c.homeroomTeacherId || "").split(","))
          .map((s: string) => s.trim())
          .filter(Boolean)
      )
    )
    const hrTeachers =
      hrRawIds.length > 0
        ? await prisma.teacher
            .findMany({
              where: {
                OR: [
                  { id: { in: hrRawIds } },
                  { userId: { in: hrRawIds } },
                  { teacherCode: { in: hrRawIds } }
                ]
              },
              select: { id: true, userId: true, teacherCode: true, teacherName: true }
            })
            .catch(() => [])
        : []
    const hrTeacherNameMap = new Map<string, string>()
    for (const t of hrTeachers) {
      if (t.id) hrTeacherNameMap.set(t.id, t.teacherName)
      if (t.userId) hrTeacherNameMap.set(t.userId, t.teacherName)
      if (t.teacherCode) hrTeacherNameMap.set(t.teacherCode, t.teacherName)
    }

    const classMap = new Map<string, any>()
    for (const c of classes) {
      const hrIds = String(c.homeroomTeacherId || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean)
      const resolvedHrName =
        hrIds.map((id: string) => hrTeacherNameMap.get(id)).find(Boolean) ||
        c.teachers?.[0]?.teacher?.teacherName ||
        "GVCN phụ trách"
      classMap.set(c.id, {
        ...c,
        homeroomTeacherName: resolvedHrName
      })
    }
    const matchedClassIds = classes.map(c => c.id)

    let studentWhere: any = { status: { not: "TRANSFERRED_OUT" } }
    if (studentId && (caller.actorRole === "STUDENT" || caller.actorRole === "PARENT")) {
      studentWhere.id = studentId
    } else if (matchedClassIds.length > 0) {
      studentWhere.classId = { in: matchedClassIds }
    } else {
      return jsonResponse({
        stagesCatalog: ADVISORY_JOURNEY_STAGES,
        reminderConfig,
        dashboardSummary: {
          totalStudents: 0,
          stageDistribution: ADVISORY_JOURNEY_STAGES.map(s => ({
            stepNumber: s.stepNumber,
            code: s.code,
            shortName: s.shortName,
            count: 0,
            percent: 0
          })),
          needConsultationCount: 0,
          dueSoonCount: 0,
          overdueCount: 0,
          gvbmPendingCount: 0,
          planCompletionCount: 0,
          planCompletionRate: 0,
          termEvalCompletionCount: 0,
          termEvalCompletionRate: 0,
          classBreakdown: []
        },
        studentJourneys: [],
        selectedStudentJourney: null,
        workQueue: [],
        smartReminders: []
      })
    }

    const students = await prisma.student
      .findMany({
        where: studentWhere,
        include: {
          class: {
            select: {
              id: true,
              className: true,
              grade: true,
              campusId: true,
              homeroomTeacherId: true
            }
          }
        },
        orderBy: { studentName: "asc" },
        take: 600
      })
      .catch(err => {
        console.error("[advisory/journey] prisma.student.findMany error:", err)
        return [] as any[]
      })

    if (students.length === 0) {
      return jsonResponse({
        stagesCatalog: ADVISORY_JOURNEY_STAGES,
        reminderConfig,
        dashboardSummary: {
          totalStudents: 0,
          stageDistribution: ADVISORY_JOURNEY_STAGES.map(s => ({
            stepNumber: s.stepNumber,
            code: s.code,
            shortName: s.shortName,
            count: 0,
            percent: 0
          })),
          needConsultationCount: 0,
          dueSoonCount: 0,
          overdueCount: 0,
          gvbmPendingCount: 0,
          planCompletionCount: 0,
          planCompletionRate: 0,
          termEvalCompletionCount: 0,
          termEvalCompletionRate: 0,
          classBreakdown: []
        },
        studentJourneys: [],
        selectedStudentJourney: null,
        workQueue: [],
        smartReminders: []
      })
    }

    const studentIds = students.map(s => s.id)
    const placeholders = studentIds.map(() => "?").join(",")

    // 3. Batch query all advisory entities for these students
    const [
      statusRecords,
      goals,
      unlocks,
      actionItems,
      trackingLogs,
      consultationLogs,
      helpRequests,
      adjustmentRequests,
      reflections,
      termEvaluations,
      psychRows,
      gvbmTaskRows,
      parentExchangeRows,
      journeyStateRows
    ] = await Promise.all([
      prisma.studentAdvisoryStatus
        .findMany({
          where: { studentId: { in: studentIds } }
        })
        .catch(() => []),
      prisma.studentGoal
        .findMany({
          where: {
            studentId: { in: studentIds }
          },
          orderBy: { createdAt: "desc" }
        })
        .catch(() => []),
      prisma.studentGoalUnlock
        .findMany({
          where: {
            goal: { studentId: { in: studentIds } }
          },
          include: { goal: { select: { studentId: true } } },
          orderBy: { createdAt: "desc" }
        })
        .catch(() => []),
      (prisma as any).studentGoalAction
        ?.findMany({
          where: { studentId: { in: studentIds } },
          orderBy: { createdAt: "desc" }
        })
        ?.catch(() => []) ?? Promise.resolve([]),
      (prisma as any).studentGoalTrackingLog
        ?.findMany({
          where: {
            studentId: { in: studentIds }
          },
          orderBy: { updatedAt: "desc" }
        })
        ?.catch(() => []) ?? Promise.resolve([]),
      prisma.academicConsultationLog
        .findMany({
          where: {
            studentId: { in: studentIds }
          },
          include: { teacher: { select: { teacherName: true } } },
          orderBy: { meetingDate: "desc" }
        })
        .catch(() => []),
      prisma.studentHelpRequest
        .findMany({
          where: { studentId: { in: studentIds } },
          orderBy: { createdAt: "desc" }
        })
        .catch(() => []),
      (prisma as any).goalAdjustmentRequest
        ?.findMany({
          where: { studentId: { in: studentIds } },
          orderBy: { createdAt: "desc" }
        })
        ?.catch(() => []) ?? Promise.resolve([]),
      (prisma as any).studentReflection
        ?.findMany({
          where: { studentId: { in: studentIds } },
          orderBy: { createdAt: "desc" }
        })
        ?.catch(() => []) ?? Promise.resolve([]),
      prisma.studentTermEvaluation
        .findMany({
          where: {
            studentId: { in: studentIds }
          },
          orderBy: { updatedAt: "desc" }
        })
        .catch(() => []),
      prisma
        .$queryRawUnsafe<any[]>(
          `SELECT "id", "studentId", "testCode", "status", "primaryResultCode", "submittedAt", "updatedAt"
           FROM "StudentPsychAssessment"
           WHERE "studentId" IN (${placeholders})`,
          ...studentIds
        )
        .catch(() => []),
      prisma
        .$queryRawUnsafe<any[]>(
          `SELECT * FROM "SubjectTeacherAdvisoryTask"
           WHERE "studentId" IN (${placeholders})
           ORDER BY "createdAt" DESC`,
          ...studentIds
        )
        .catch(() => []),
      prisma
        .$queryRawUnsafe<any[]>(
          `SELECT * FROM "ParentAdvisorExchange"
           WHERE "studentId" IN (${placeholders})
           ORDER BY "createdAt" DESC`,
          ...studentIds
        )
        .catch(() => []),
      prisma
        .$queryRawUnsafe<any[]>(
          `SELECT * FROM "AdvisoryJourneyState"
           WHERE "studentId" IN (${placeholders}) AND "term" = ?`,
          ...studentIds,
          term
        )
        .catch(() => [])
    ])

    // Group by studentId
    const groupByStudent = <T extends { studentId?: string }>(arr: T[]) => {
      const map = new Map<string, T[]>()
      for (const item of arr || []) {
        const sid = item.studentId
        if (!sid) continue
        const list = map.get(sid) || []
        list.push(item)
        map.set(sid, list)
      }
      return map
    }

    const statusByStudent = new Map<string, any>()
    for (const st of statusRecords) statusByStudent.set(st.studentId, st)

    const goalsByStudent = groupByStudent(goals)
    const unlocksByStudent = new Map<string, any[]>()
    for (const u of unlocks) {
      const sid = u.goal?.studentId
      if (!sid) continue
      const list = unlocksByStudent.get(sid) || []
      list.push(u)
      unlocksByStudent.set(sid, list)
    }
    const actionsByStudent = groupByStudent(actionItems)
    const trackingByStudent = groupByStudent(trackingLogs)
    const consultsByStudent = groupByStudent(
      consultationLogs.filter((l: any) => {
        const notes = (l.notes || "").toLowerCase()
        return !notes.includes("[gradeperiod:") && !notes.includes("trao đổi giữa gvcn")
      })
    )
    const helpByStudent = groupByStudent(helpRequests)
    const adjByStudent = groupByStudent(adjustmentRequests)
    const reflByStudent = groupByStudent(reflections)
    const evalsByStudent = groupByStudent(termEvaluations)
    const psychByStudent = groupByStudent(psychRows)
    const gvbmByStudent = groupByStudent(gvbmTaskRows)
    const exchangeByStudent = groupByStudent(parentExchangeRows)

    const journeyStateByStudent = new Map<string, any>()
    for (const js of journeyStateRows || []) {
      journeyStateByStudent.set(js.studentId, js)
    }

    // 4. Compute journey for each student
    const allStudentJourneys: StudentJourneyEvaluationResult[] = []
    const allWorkQueue: AdvisoryWorkQueueItem[] = []
    const allSmartReminders: SmartAdvisoryReminder[] = []

    for (const st of students) {
      const clsObj = classMap.get(st.classId || "") || st.class
      const hrName =
        clsObj?.homeroomTeacherName ||
        "GVCN phụ trách"

      const evaluated = computeStudentAdvisoryJourney({
        student: {
          id: st.id,
          studentCode: st.studentCode || "",
          studentName: st.studentName || "Học sinh",
          classId: st.classId || "",
          className: clsObj?.className || st.class?.className || "Lớp",
          gradeLevel: String(clsObj?.grade || st.class?.grade || "K10")
        },
        homeroomTeacherName: hrName,
        academicYearId,
        term,
        statusRecord: statusByStudent.get(st.id) || null,
        psychAssessments: psychByStudent.get(st.id) || [],
        goals: goalsByStudent.get(st.id) || [],
        unlocks: unlocksByStudent.get(st.id) || [],
        actionItems: actionsByStudent.get(st.id) || [],
        trackingLogs: trackingByStudent.get(st.id) || [],
        consultationLogs: consultsByStudent.get(st.id) || [],
        gvbmTasks: gvbmByStudent.get(st.id) || [],
        helpRequests: helpByStudent.get(st.id) || [],
        adjustmentRequests: adjByStudent.get(st.id) || [],
        parentExchanges: exchangeByStudent.get(st.id) || [],
        reflections: reflByStudent.get(st.id) || [],
        termEvaluations: evalsByStudent.get(st.id) || [],
        journeyState: journeyStateByStudent.get(st.id) || null,
        reminderConfig
      })

      allStudentJourneys.push(evaluated)
      allWorkQueue.push(...evaluated.workItems)
      allSmartReminders.push(...evaluated.smartReminders)
    }

    // 5. Compute Dashboard Summary across all students in scope
    const totalStudents = allStudentJourneys.length
    const stageDistribution = ADVISORY_JOURNEY_STAGES.map(stageDef => {
      const count = allStudentJourneys.filter(
        j => j.currentStageNumber === stageDef.stepNumber
      ).length
      const completedCount = allStudentJourneys.filter(
        j => j.stages[stageDef.stepNumber - 1]?.status === "COMPLETED"
      ).length
      return {
        stepNumber: stageDef.stepNumber,
        code: stageDef.code,
        name: stageDef.name,
        shortName: stageDef.shortName,
        count,
        completedCount,
        percent: totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0
      }
    })

    const needConsultationCount = allStudentJourneys.filter(
      j =>
        j.statusColor === "RED" ||
        j.statusColor === "YELLOW" ||
        j.stages[4]?.status === "NOT_STARTED" ||
        j.stages[4]?.status === "OVERDUE"
    ).length

    const overdueCount = allWorkQueue.filter(w => w.status === "OVERDUE").length
    const dueSoonCount = allSmartReminders.filter(r => r.category === "DUE_SOON").length
    const gvbmPendingCount = gvbmTaskRows.filter(
      (t: any) => t.status === "ASSIGNED" || t.status === "RESPONDED"
    ).length
    const planCompletionCount = allStudentJourneys.filter(
      j => j.stages[2]?.status === "COMPLETED" && j.stages[3]?.status === "COMPLETED"
    ).length
    const planCompletionRate =
      totalStudents > 0 ? Math.round((planCompletionCount / totalStudents) * 100) : 0

    const termEvalCompletionCount = allStudentJourneys.filter(
      j => j.stages[6]?.status === "COMPLETED"
    ).length
    const termEvalCompletionRate =
      totalStudents > 0 ? Math.round((termEvalCompletionCount / totalStudents) * 100) : 0

    // Class Breakdown for Admin & Multi-class Teachers
    const classBreakdown = classes.map(cls => {
      const clsJourneys = allStudentJourneys.filter(j => j.classId === cls.id)
      const cTotal = clsJourneys.length
      const cPlanDone = clsJourneys.filter(
        j => j.stages[2]?.status === "COMPLETED" && j.stages[3]?.status === "COMPLETED"
      ).length
      const cEvalDone = clsJourneys.filter(j => j.stages[6]?.status === "COMPLETED").length
      const cPublished = clsJourneys.filter(j => j.journeyState.isPublishedToParent).length
      const cOverdue = allWorkQueue.filter(
        w => w.classId === cls.id && w.status === "OVERDUE"
      ).length
      const cNeedConsult = clsJourneys.filter(
        j => j.statusColor === "RED" || j.statusColor === "YELLOW" || j.stages[4]?.status === "NOT_STARTED"
      ).length

      return {
        classId: cls.id,
        className: cls.className,
        gradeLevel: cls.grade,
        campusName: cls.campus?.campusName || "Sky-Line",
        homeroomTeacherName: classMap.get(cls.id)?.homeroomTeacherName || "GVCN phụ trách",
        totalStudents: cTotal,
        planCompletionCount: cPlanDone,
        planCompletionRate: cTotal > 0 ? Math.round((cPlanDone / cTotal) * 100) : 0,
        termEvalCompletionCount: cEvalDone,
        termEvalCompletionRate: cTotal > 0 ? Math.round((cEvalDone / cTotal) * 100) : 0,
        publishedCount: cPublished,
        overdueCount: cOverdue,
        needConsultationCount: cNeedConsult
      }
    })

    // Filter workQueue according to query filters
    let filteredWorkQueue = [...allWorkQueue]
    if (studentId) {
      filteredWorkQueue = filteredWorkQueue.filter(w => w.studentId === studentId)
    }
    if (statusFilter && statusFilter !== "ALL") {
      filteredWorkQueue = filteredWorkQueue.filter(w => w.status === statusFilter)
    }
    if (stageFilter && stageFilter !== "ALL") {
      filteredWorkQueue = filteredWorkQueue.filter(
        w => String(w.stageNumber) === stageFilter || w.stageCode === stageFilter
      )
    }
    if (search) {
      filteredWorkQueue = filteredWorkQueue.filter(
        w =>
          w.studentName.toLowerCase().includes(search) ||
          w.studentCode.toLowerCase().includes(search) ||
          w.taskTitle.toLowerCase().includes(search) ||
          w.className.toLowerCase().includes(search)
      )
    }

    const priorityRank: Record<string, number> = { URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1 }
    filteredWorkQueue.sort((a, b) => {
      if (a.status === "OVERDUE" && b.status !== "OVERDUE") return -1
      if (b.status === "OVERDUE" && a.status !== "OVERDUE") return 1
      return (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0)
    })

    // Determine selectedStudentJourney
    const selectedStudentJourney =
      (studentId && allStudentJourneys.find(j => j.studentId === studentId)) ||
      allStudentJourneys.find(j => j.nextBestAction.priority === "URGENT") ||
      allStudentJourneys[0] ||
      null

    return jsonResponse({
      stagesCatalog: ADVISORY_JOURNEY_STAGES,
      reminderConfig,
      dashboardSummary: {
        totalStudents,
        stageDistribution,
        needConsultationCount,
        dueSoonCount,
        overdueCount,
        gvbmPendingCount,
        planCompletionCount,
        planCompletionRate,
        termEvalCompletionCount,
        termEvalCompletionRate,
        classBreakdown
      },
      studentJourneys: allStudentJourneys.map(j => ({
        studentId: j.studentId,
        studentCode: j.studentCode,
        studentName: j.studentName,
        classId: j.classId,
        className: j.className,
        gradeLevel: j.gradeLevel,
        statusColor: j.statusColor,
        currentStageNumber: j.currentStageNumber,
        currentStageCode: j.currentStageCode,
        currentStageName: j.currentStageName,
        completedStagesCount: j.completedStagesCount,
        overallProgressPercent: j.overallProgressPercent,
        loopCount: j.loopCount,
        nextBestAction: j.nextBestAction,
        journeyState: j.journeyState
      })),
      selectedStudentJourney,
      workQueue: filteredWorkQueue,
      smartReminders: allSmartReminders.slice(0, 50)
    })
  } catch (error: any) {
    console.error("[GET /api/advisory/journey] error:", error)
    return jsonResponse({ error: error.message || "Lỗi tải lộ trình cố vấn" }, 500)
  }
}

export async function PATCH(req: Request) {
  try {
    await ensureTriPartyTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller || !caller.authenticated) {
      return jsonResponse({ error: "Chưa xác thực đăng nhập" }, 401)
    }

    if (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN") {
      return jsonResponse({ error: "Chỉ Giáo viên và Quản trị viên mới có quyền thực hiện thao tác này" }, 403)
    }

    const body = await req.json()
    const action = String(body.action || "").trim().toUpperCase()
    const studentId = String(body.studentId || "").trim()
    const academicYearId = String(body.academicYearId || "").trim()
    const term = body.term === "HK2" ? "HK2" : "HK1"

    // 1. Admin cấu hình chu kỳ nhắc & ngưỡng cảnh báo (Mục 7)
    if (action === "UPDATE_REMINDER_CONFIG") {
      if (caller.actorRole !== "ADMIN") {
        return jsonResponse({ error: "Chỉ Admin mới có quyền cấu hình chu kỳ nhắc việc" }, 403)
      }
      const dueSoonHours = Math.max(6, Math.min(168, Number(body.dueSoonHours || 48)))
      const overdueEscalateHours = Math.max(6, Math.min(168, Number(body.overdueEscalateHours || 24)))
      const cooldownHours = Math.max(1, Math.min(72, Number(body.cooldownHours || 12)))
      const unupdatedProgressDays = Math.max(3, Math.min(60, Number(body.unupdatedProgressDays || 14)))
      const enableInApp = body.enableInApp === false ? 0 : 1

      await prisma.$executeRawUnsafe(
        `INSERT INTO "AdvisoryReminderConfig" (
          "id", "dueSoonHours", "overdueEscalateHours", "cooldownHours",
          "unupdatedProgressDays", "enableInApp", "updatedById", "updatedByName", "updatedAt"
        ) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT("id") DO UPDATE SET
          "dueSoonHours" = excluded."dueSoonHours",
          "overdueEscalateHours" = excluded."overdueEscalateHours",
          "cooldownHours" = excluded."cooldownHours",
          "unupdatedProgressDays" = excluded."unupdatedProgressDays",
          "enableInApp" = excluded."enableInApp",
          "updatedById" = excluded."updatedById",
          "updatedByName" = excluded."updatedByName",
          "updatedAt" = CURRENT_TIMESTAMP`,
        dueSoonHours,
        overdueEscalateHours,
        cooldownHours,
        unupdatedProgressDays,
        enableInApp,
        caller.userId,
        caller.actorName
      )

      return jsonResponse({
        success: true,
        message: "Đã lưu cấu hình chu kỳ nhắc việc & ngưỡng cảnh báo thành công!"
      })
    }

    // 2. Gửi thông báo nhắc việc thông minh (chống trùng lặp trong cooldownHours)
    if (action === "DISPATCH_REMINDERS") {
      const reminders: any[] = Array.isArray(body.reminders) ? body.reminders : []
      const cfg = await getReminderConfig()
      if (!cfg.enableInApp) {
        return jsonResponse({ success: true, dispatchedCount: 0, message: "Tính năng nhắc việc đang tắt." })
      }

      const cooldownCutoff = new Date(Date.now() - cfg.cooldownHours * 3600 * 1000)
      let dispatchedCount = 0

      for (const rem of reminders.slice(0, 15)) {
        const existing = await prisma.notification
          .findFirst({
            where: {
              userId: caller.userId,
              title: rem.title,
              createdAt: { gte: cooldownCutoff }
            }
          })
          .catch(() => null)

        if (!existing) {
          await prisma.notification
            .create({
              data: {
                userId: caller.userId,
                title: rem.title,
                message: rem.message,
                type: "ADVISORY_REMINDER",
                link: rem.deepLink || "/teacher/co-van-hoc-tap?tab=journey"
              }
            })
            .catch(() => null)
          dispatchedCount++
        }
      }

      return jsonResponse({
        success: true,
        dispatchedCount,
        message:
          dispatchedCount > 0
            ? `Đã đồng bộ ${dispatchedCount} thông báo nhắc việc mới vào hộp thư SSM (đã lọc chống trùng lặp ${cfg.cooldownHours}h).`
            : `Tất cả nhắc việc hiện tại đã được gửi trong vòng ${cfg.cooldownHours} giờ qua (không gửi lặp lại gây phiền nhiễu).`
      })
    }

    // 3. Các thao tác cập nhật trạng thái Lộ trình của từng học sinh
    if (!studentId) {
      return jsonResponse({ error: "Thiếu studentId" }, 400)
    }

    const rel = await verifyStudentRelationship(caller, studentId)
    if (!rel.allowed) {
      return jsonResponse({ error: rel.reason || "Không có quyền thao tác trên học sinh này" }, 403)
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        studentName: true,
        classId: true,
        parents: {
          where: { status: "ACTIVE" },
          select: { parent: { select: { userId: true } } }
        }
      }
    })
    if (!student) {
      return jsonResponse({ error: "Không tìm thấy học sinh" }, 404)
    }

    const rowId = `aj_${studentId}_${academicYearId || "cur"}_${term}`

    // Đảm bảo bản ghi AdvisoryJourneyState tồn tại
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AdvisoryJourneyState" (
        "id", "studentId", "classId", "academicYearId", "term", "updatedById", "updatedByName"
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT("studentId", "academicYearId", "term") DO NOTHING`,
      rowId,
      studentId,
      student.classId || "",
      academicYearId,
      term,
      caller.userId,
      caller.actorName
    )

    if (action === "CONFIRM_STAGE_1") {
      await prisma.$executeRawUnsafe(
        `UPDATE "AdvisoryJourneyState"
         SET "profileInitialized" = 1,
             "profileInitializedAt" = CURRENT_TIMESTAMP,
             "updatedById" = ?,
             "updatedByName" = ?,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "studentId" = ? AND "academicYearId" = ? AND "term" = ?`,
        caller.userId,
        caller.actorName,
        studentId,
        academicYearId,
        term
      )
    } else if (action === "CONFIRM_STAGE_2") {
      await prisma.$executeRawUnsafe(
        `UPDATE "AdvisoryJourneyState"
         SET "initialConsultDone" = 1,
             "initialConsultAt" = CURRENT_TIMESTAMP,
             "updatedById" = ?,
             "updatedByName" = ?,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "studentId" = ? AND "academicYearId" = ? AND "term" = ?`,
        caller.userId,
        caller.actorName,
        studentId,
        academicYearId,
        term
      )
    } else if (action === "START_NEW_FOLLOWUP_LOOP") {
      const loopNote = String(body.loopNote || "Khởi tạo vòng lặp Theo dõi → Tư vấn → Hỗ trợ mới").trim()
      await prisma.$executeRawUnsafe(
        `UPDATE "AdvisoryJourneyState"
         SET "currentLoopIndex" = COALESCE("currentLoopIndex", 1) + 1,
             "loopNotes" = ?,
             "updatedById" = ?,
             "updatedByName" = ?,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "studentId" = ? AND "academicYearId" = ? AND "term" = ?`,
        loopNote,
        caller.userId,
        caller.actorName,
        studentId,
        academicYearId,
        term
      )
    } else if (action === "APPROVE_RUBRIC_EVAL") {
      // Kiểm tra điều kiện hoàn thành Bước 7 trước khi cho phép duyệt Bước 8
      const evalRecord = await prisma.studentTermEvaluation.findFirst({
        where: {
          studentId,
          term,
          ...(academicYearId ? { academicYearId } : {})
        }
      })
      if (
        !evalRecord ||
        Number(evalRecord.goalCompletionLevel) <= 0 ||
        Number(evalRecord.initiativeLevel) <= 0 ||
        Number(evalRecord.participationAttitude) <= 0
      ) {
        return jsonResponse(
          {
            error:
              "Chưa thể duyệt: Phiếu đánh giá Rubric kỳ chưa được chấm đầy đủ cả 3 tiêu chí ở Bước 7."
          },
          400
        )
      }

      await prisma.$executeRawUnsafe(
        `UPDATE "AdvisoryJourneyState"
         SET "rubricApprovalStatus" = 'APPROVED',
             "approvedById" = ?,
             "approvedByName" = ?,
             "approvedAt" = CURRENT_TIMESTAMP,
             "approvalNote" = ?,
             "updatedById" = ?,
             "updatedByName" = ?,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "studentId" = ? AND "academicYearId" = ? AND "term" = ?`,
        caller.userId,
        caller.actorName,
        String(body.note || "Đã kiểm tra và xác nhận duyệt kết quả đánh giá kỳ."),
        caller.userId,
        caller.actorName,
        studentId,
        academicYearId,
        term
      )
    } else if (action === "PUBLISH_TERM_RESULT") {
      await prisma.$executeRawUnsafe(
        `UPDATE "AdvisoryJourneyState"
         SET "rubricApprovalStatus" = 'APPROVED',
             "isPublishedToParent" = 1,
             "publishedAt" = CURRENT_TIMESTAMP,
             "updatedById" = ?,
             "updatedByName" = ?,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "studentId" = ? AND "academicYearId" = ? AND "term" = ?`,
        caller.userId,
        caller.actorName,
        studentId,
        academicYearId,
        term
      )

      // Gửi thông báo tới Phụ huynh nếu học sinh có liên kết tài khoản Phụ huynh
      const parentUserIds = (student.parents || [])
        .map((p: any) => p.parent?.userId)
        .filter(Boolean)
      for (const pUserId of parentUserIds) {
        await prisma.notification
          .create({
            data: {
              userId: pUserId,
              title: `Kết quả Cố vấn học tập ${term} của ${student.studentName} đã được công bố`,
              message: `Thầy/Cô GVCN (${caller.actorName}) đã công bố kết quả đánh giá tổng kết Cố vấn học tập ${term}. Kính mời Quý Phụ huynh xem chi tiết và đồng hành cùng con.`,
              type: "ADVISORY_PUBLISHED",
              link: "/parent/children/advisory"
            }
          })
          .catch(() => null)
      }
    } else if (action === "PREPARE_NEXT_TERM") {
      await prisma.$executeRawUnsafe(
        `UPDATE "AdvisoryJourneyState"
         SET "nextTermPrepared" = 1,
             "nextTermPreparedAt" = CURRENT_TIMESTAMP,
             "nextTermPlanNote" = ?,
             "updatedById" = ?,
             "updatedByName" = ?,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "studentId" = ? AND "academicYearId" = ? AND "term" = ?`,
        String(body.note || "Đã khởi tạo định hướng chuyển sang học kỳ tiếp theo."),
        caller.userId,
        caller.actorName,
        studentId,
        academicYearId,
        term
      )
    } else {
      return jsonResponse({ error: `Hành động không hợp lệ: ${action}` }, 400)
    }

    await appendAdvisoryAuditLog({
      studentId,
      actorId: caller.userId,
      actorRole: caller.actorRole,
      actorName: caller.actorName,
      entityType: "ADVISORY_JOURNEY",
      entityId: rowId,
      action,
      summary: `Cập nhật lộ trình cố vấn (${term}): ${action}`
    })

    return jsonResponse({
      success: true,
      action,
      message: "Đã cập nhật trạng thái lộ trình cố vấn thành công!"
    })
  } catch (error: any) {
    console.error("[PATCH /api/advisory/journey] error:", error)
    return jsonResponse({ error: error.message || "Lỗi cập nhật lộ trình cố vấn" }, 500)
  }
}
