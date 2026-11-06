import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ensureTriPartyTables } from "@/lib/advisory/triparty-sync"
import {
  resolveAdvisoryCaller,
  isManagementRole,
  resolveTeacherAssignedClassIds
} from "@/lib/advisory/rbac-guard"
import { matchCategoryKey } from "@/lib/advisory/advisoryWeights"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  return res
}

export async function GET(req: Request) {
  try {
    await ensureTriPartyTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated || (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN")) {
      return jsonResponse({ error: "Không có quyền truy cập bảng theo dõi tiến độ" }, 403)
    }

    const { searchParams } = new URL(req.url)
    const academicYearId = searchParams.get("academicYearId") || ""
    const term = searchParams.get("term") || "HK1"
    const campusId = searchParams.get("campusId") || "ALL"
    const gradeLevel = searchParams.get("gradeLevel") || "ALL"
    const classId = searchParams.get("classId") || "ALL"

    const isManager = caller.actorRole === "ADMIN" || isManagementRole(caller.rawRole)
    let allowedClassIds: string[] | null = null

    if (!isManager) {
      allowedClassIds = await resolveTeacherAssignedClassIds(caller)
      if (allowedClassIds.length === 0) {
        return jsonResponse({
          rows: [],
          hierarchySummary: { campuses: [], grades: [], classes: [] },
          reportSummary: {}
        })
      }
    }

    const classWhere: any = {}
    if (academicYearId) classWhere.academicYearId = academicYearId
    if (campusId && campusId !== "ALL") classWhere.campusId = campusId
    if (gradeLevel && gradeLevel !== "ALL") classWhere.grade = gradeLevel
    if (classId && classId !== "ALL") {
      if (allowedClassIds && !allowedClassIds.includes(classId)) {
        return jsonResponse({ error: "Bạn không được phân công phụ trách lớp này" }, 403)
      }
      classWhere.id = classId
    } else if (allowedClassIds) {
      classWhere.id = { in: allowedClassIds }
    }

    const classes = await prisma.class
      .findMany({
        where: classWhere,
        include: {
          campus: { select: { id: true, campusName: true, campusCode: true } },
          teachers: {
            include: {
              teacher: { select: { id: true, teacherName: true, teacherCode: true } }
            }
          }
        },
        orderBy: { className: "asc" },
        take: isManager && classId === "ALL" ? 60 : 30
      })
      .catch(() => [])

    const targetClassIds = classes.map(c => c.id)
    if (targetClassIds.length === 0) {
      return jsonResponse({
        rows: [],
        hierarchySummary: { campuses: [], grades: [], classes: [] },
        reportSummary: {}
      })
    }

    // Resolve homeroom teachers for classes
    const hmIds = Array.from(
      new Set(classes.map((c: any) => c.homeroomTeacherId).filter(Boolean))
    ) as string[]
    const hmTeachers =
      hmIds.length > 0
        ? await prisma.teacher
            .findMany({
              where: {
                OR: [{ id: { in: hmIds } }, { teacherCode: { in: hmIds } }]
              },
              select: { id: true, teacherCode: true, teacherName: true }
            })
            .catch(() => [])
        : []
    const hmMap = new Map<string, string>()
    for (const t of hmTeachers) {
      hmMap.set(t.id, t.teacherName)
      if (t.teacherCode) hmMap.set(t.teacherCode, t.teacherName)
    }

    const classMap = new Map<string, any>()
    for (const c of classes) {
      const hmAssignment = c.teachers?.find((ta: any) => ta.isHomeroom && ta.teacher?.teacherName)
      const hmName =
        (c.homeroomTeacherId && hmMap.get(c.homeroomTeacherId)) ||
        hmAssignment?.teacher?.teacherName ||
        "GVCN phụ trách"
      classMap.set(c.id, {
        ...c,
        homeroomTeacherName: hmName,
        campusName: c.campus?.campusName || "Sky-Line"
      })
    }

    const students = await prisma.student
      .findMany({
        where: {
          classId: { in: targetClassIds },
          status: { not: "TRANSFERRED_OUT" }
        },
        select: {
          id: true,
          studentCode: true,
          studentName: true,
          classId: true
        },
        orderBy: { studentName: "asc" },
        take: 450
      })
      .catch(() => [])

    const studentIds = students.map(s => s.id)
    if (studentIds.length === 0) {
      return jsonResponse({
        rows: [],
        hierarchySummary: { campuses: [], grades: [], classes: [] },
        reportSummary: {}
      })
    }

    const placeholders = studentIds.map(() => "?").join(",")

    const [
      goals,
      goalMetas,
      consultations,
      consultMetas,
      feedbacks,
      legacyReflections,
      companionTasks,
      orientationRecords,
      termEvaluations,
      auditLogs
    ] = await Promise.all([
      prisma.studentGoal
        .findMany({
          where: { studentId: { in: studentIds } },
          orderBy: { createdAt: "asc" }
        })
        .catch(() => []),
      prisma
        .$queryRawUnsafe<any[]>(
          `SELECT * FROM "StudentGoalMeta" WHERE "studentId" IN (${placeholders})`,
          ...studentIds
        )
        .catch(() => []),
      prisma.academicConsultationLog
        .findMany({
          where: { studentId: { in: studentIds } },
          include: { teacher: { select: { teacherName: true } } },
          orderBy: { meetingDate: "desc" }
        })
        .catch(() => []),
      prisma
        .$queryRawUnsafe<any[]>(
          `SELECT * FROM "AdvisoryConsultationMeta" WHERE "studentId" IN (${placeholders})`,
          ...studentIds
        )
        .catch(() => []),
      prisma
        .$queryRawUnsafe<any[]>(
          `SELECT * FROM "StudentAdvisoryFeedback" WHERE "studentId" IN (${placeholders}) ORDER BY "createdAt" DESC`,
          ...studentIds
        )
        .catch(() => []),
      prisma.studentReflection
        .findMany({
          where: { studentId: { in: studentIds } },
          orderBy: { createdAt: "desc" }
        })
        .catch(() => []),
      prisma
        .$queryRawUnsafe<any[]>(
          `SELECT * FROM "SubjectTeacherAdvisoryTask" WHERE "studentId" IN (${placeholders}) ORDER BY "createdAt" DESC`,
          ...studentIds
        )
        .catch(() => []),
      prisma
        .$queryRawUnsafe<any[]>(
          `SELECT * FROM "OrientationAdvisoryRecord" WHERE "studentId" IN (${placeholders})`,
          ...studentIds
        )
        .catch(() => []),
      prisma.advisoryTermEvaluation
        .findMany({
          where: { studentId: { in: studentIds } },
          orderBy: { updatedAt: "desc" }
        })
        .catch(() => []),
      prisma
        .$queryRawUnsafe<any[]>(
          `SELECT * FROM "AdvisoryAuditLog" WHERE "studentId" IN (${placeholders}) ORDER BY "createdAt" DESC LIMIT 400`,
          ...studentIds
        )
        .catch(() => [])
    ])

    // Index data by studentId
    const goalMetaById = new Map<string, any>()
    for (const gm of goalMetas) goalMetaById.set(gm.goalId, gm)

    const consultMetaById = new Map<string, any>()
    for (const cm of consultMetas) consultMetaById.set(cm.consultationId, cm)

    const goalsByStudent = new Map<string, any[]>()
    for (const g of goals) {
      if (!g.targetText) continue
      const arr = goalsByStudent.get(g.studentId) || []
      const meta = goalMetaById.get(g.id) || null
      arr.push({
        id: g.id,
        category: g.category,
        categoryKey: matchCategoryKey(g.category),
        targetText: g.targetText,
        status: g.status,
        signedByTeacher: Boolean(g.signedByTeacher),
        signedByParent: Boolean(g.signedByParent),
        teacherComment: meta?.advisorComment || g.teacherComment || "",
        basisText: meta?.basisText || "Dữ liệu học tập & nguyện vọng cá nhân",
        baselineValue: meta?.baselineValue || "Đầu kỳ",
        targetValue: meta?.targetValue || g.targetText,
        currentResultText: meta?.currentResultText || "",
        evidenceText: meta?.evidenceText || "",
        deadlineDate: meta?.deadlineDate || "",
        actionPlanText: meta?.actionPlanText || g.smartSpecific || "",
        assigneeName: meta?.assigneeName || "Học sinh",
        updateMilestone: meta?.updateMilestone || "Định kỳ 2 tuần",
        companionTeacherId: meta?.companionTeacherId || null,
        companionTeacherName: meta?.companionTeacherName || "",
        nextStepNote: meta?.nextStepNote || "",
        progressOutcome:
          meta?.progressOutcome ||
          (g.achievementLevel === "DAT"
            ? "ACHIEVED"
            : g.signedByTeacher
              ? "MAKING_PROGRESS"
              : "INSUFFICIENT_DATA"),
        evaluatedByName: meta?.evaluatedByName || "",
        evaluatedTerm: meta?.evaluatedTerm || term,
        progressUpdatedAt: meta?.progressUpdatedAt || g.updatedAt
      })
      goalsByStudent.set(g.studentId, arr)
    }

    const consultsByStudent = new Map<string, any[]>()
    for (const c of consultations) {
      const notes = (c.notes || "").toLowerCase()
      if (notes.includes("[gradeperiod:")) continue
      const meta = consultMetaById.get(c.id) || null
      const arr = consultsByStudent.get(c.studentId) || []
      arr.push({
        id: c.id,
        meetingDate: c.meetingDate,
        content: c.content,
        difficulties: c.difficulties || "",
        nextActions: c.nextActions || "",
        deadline: c.deadline,
        evaluatorName: c.teacher?.teacherName || "GVCN / CVHT",
        studentReflection: c.studentReflection || "",
        consultationStatus: meta?.consultationStatus || (c.status === "PENDING" ? "SCHEDULED" : "COMPLETED"),
        studentFeedbackStatus:
          meta?.studentFeedbackStatus ||
          (c.studentReflection ? "SUBMITTED" : "NOT_REQUESTED")
      })
      consultsByStudent.set(c.studentId, arr)
    }

    const feedbacksByStudent = new Map<string, any[]>()
    for (const fb of feedbacks) {
      const arr = feedbacksByStudent.get(fb.studentId) || []
      arr.push(fb)
      feedbacksByStudent.set(fb.studentId, arr)
    }
    for (const ref of legacyReflections) {
      const arr = feedbacksByStudent.get(ref.studentId) || []
      if (!arr.some(x => x.id === ref.id)) {
        arr.push({
          id: ref.id,
          feedbackType: "GOAL_SELF_ASSESSMENT",
          actionsTakenText: ref.reflectionText,
          difficultiesText: ref.difficulties || "",
          supportNeededText: ref.helpNeededText || "",
          advisorProcessStatus: "PENDING",
          needsAttention: Boolean(ref.difficulties || ref.helpNeededText),
          createdAt: ref.createdAt
        })
      }
      feedbacksByStudent.set(ref.studentId, arr)
    }

    const tasksByStudent = new Map<string, any[]>()
    for (const t of companionTasks) {
      const arr = tasksByStudent.get(t.studentId) || []
      arr.push(t)
      tasksByStudent.set(t.studentId, arr)
    }

    const orientByStudent = new Map<string, any>()
    for (const o of orientationRecords) {
      orientByStudent.set(o.studentId, o)
    }

    const evalsByStudent = new Map<string, any[]>()
    for (const ev of termEvaluations) {
      const arr = evalsByStudent.get(ev.studentId) || []
      arr.push(ev)
      evalsByStudent.set(ev.studentId, arr)
    }

    const auditsByStudent = new Map<string, any[]>()
    for (const a of auditLogs) {
      const arr = auditsByStudent.get(a.studentId) || []
      arr.push(a)
      auditsByStudent.set(a.studentId, arr)
    }

    const rows = students.map(st => {
      const cls = classMap.get(st.classId || "")
      const stGoals = goalsByStudent.get(st.id) || []
      const stConsults = consultsByStudent.get(st.id) || []
      const stFeedbacks = feedbacksByStudent.get(st.id) || []
      const stTasks = tasksByStudent.get(st.id) || []
      const stOrient = orientByStudent.get(st.id) || null
      const stEvals = evalsByStudent.get(st.id) || []
      const stAudits = auditsByStudent.get(st.id) || []

      // Column 2: Mục tiêu
      const totalGoals = stGoals.length
      const confirmedGoals = stGoals.filter(g => g.signedByTeacher).length
      const goalCategories = Array.from(new Set(stGoals.map(g => g.categoryKey)))

      // Column 3: Tư vấn 1:1
      const completedConsults = stConsults.filter(c => c.consultationStatus !== "DRAFT" && c.consultationStatus !== "SCHEDULED")
      const scheduledConsults = stConsults.filter(c => c.consultationStatus === "SCHEDULED")
      const waitingStudentFeedbackConsult = stConsults.some(c => c.studentFeedbackStatus === "PENDING")

      // Column 4: Tự đánh giá và phản hồi HS
      const pendingFeedbacks = stFeedbacks.filter(f => f.advisorProcessStatus !== "PROCESSED")
      const needsAttentionFeedback = stFeedbacks.some(f => Boolean(Number(f.needsAttention)) && f.advisorProcessStatus !== "PROCESSED")

      // Column 5: GVBM đánh giá (số đã gửi/tổng số cần gửi và người còn chờ; không có phân công -> "Không áp dụng")
      const gvbmTasks = stTasks.filter(t => (t.companionType || "GVBM") === "GVBM")
      const gvbmSubmittedTasks = gvbmTasks.filter(t =>
        ["GVBM_RESPONDED", "CHO_XAC_NHAN", "APPROVED_FOR_PARENT", "PARENT_ACKNOWLEDGED", "DA_HOAN_THANH"].includes(t.status)
      )
      const gvbmPendingTeachers = Array.from(
        new Set(
          gvbmTasks
            .filter(t => !["GVBM_RESPONDED", "CHO_XAC_NHAN", "APPROVED_FOR_PARENT", "PARENT_ACKNOWLEDGED", "DA_HOAN_THANH"].includes(t.status))
            .map(t => t.assignedToTeacherName || "GVBM")
        )
      )
      const hasOverdueGvbm = gvbmTasks.some(
        t =>
          !["APPROVED_FOR_PARENT", "PARENT_ACKNOWLEDGED", "DA_HOAN_THANH"].includes(t.status) &&
          t.dueDate &&
          new Date(t.dueDate).getTime() < Date.now()
      )

      // Column 6: GV TLHN đánh giá khi có phân công (không có phân công -> "Không áp dụng")
      const tlhnTasks = stTasks.filter(t => t.companionType === "TLHN")
      const hasTlhnAssignment = Boolean(stOrient?.assignedTlhnTeacherId || tlhnTasks.length > 0)
      const tlhnTeacherName = stOrient?.assignedTlhnTeacherName || tlhnTasks[0]?.assignedToTeacherName || ""
      const tlhnWorkflowStatus = stOrient?.workflowStatus || (tlhnTasks.length > 0 ? "CHO_TIEP_NHAN" : "NOT_APPLICABLE")
      const tlhnSubmittedCount = tlhnTasks.filter(t =>
        ["GVBM_RESPONDED", "CHO_XAC_NHAN", "APPROVED_FOR_PARENT", "PARENT_ACKNOWLEDGED", "DA_HOAN_THANH"].includes(t.status)
      ).length + (stOrient?.workflowStatus === "DA_TU_VAN" && tlhnTasks.length === 0 ? 1 : 0)
      const tlhnTotalCount = Math.max(tlhnTasks.length, hasTlhnAssignment ? 1 : 0)

      // Column 7: GVCN/CVHT đánh giá
      const termEval = stEvals.find(e => !e.term || e.term === term) || stEvals[0] || null
      const advisorEvaluated = Boolean(termEval || (totalGoals > 0 && confirmedGoals === totalGoals))

      // Column 8: Kết quả tiến bộ (4 trạng thái chuẩn Section IX)
      let overallProgressOutcome: "INSUFFICIENT_DATA" | "NO_PROGRESS" | "MAKING_PROGRESS" | "ACHIEVED" = "INSUFFICIENT_DATA"
      if (totalGoals === 0) {
        overallProgressOutcome = "INSUFFICIENT_DATA"
      } else if (stGoals.every(g => g.progressOutcome === "ACHIEVED") || (termEval && Number(termEval.goalCompletionLevel) >= 4)) {
        overallProgressOutcome = "ACHIEVED"
      } else if (
        stGoals.some(g => g.progressOutcome === "MAKING_PROGRESS" || g.progressOutcome === "ACHIEVED") ||
        completedConsults.length > 0 ||
        (termEval && Number(termEval.goalCompletionLevel) >= 3)
      ) {
        overallProgressOutcome = "MAKING_PROGRESS"
      } else if (stGoals.some(g => g.progressOutcome === "NO_PROGRESS")) {
        overallProgressOutcome = "NO_PROGRESS"
      }

      // Column 9: Bước tiếp theo (Next Best Action)
      let nextStepLabel = "Theo dõi định kỳ"
      let nextStepTab = "goals_plan"
      if (totalGoals === 0) {
        nextStepLabel = "Thiết lập mục tiêu & kế hoạch"
        nextStepTab = "goals_plan"
      } else if (confirmedGoals < totalGoals) {
        nextStepLabel = "CVHT xác nhận mục tiêu"
        nextStepTab = "goals_plan"
      } else if (completedConsults.length === 0) {
        nextStepLabel = "Tổ chức tư vấn 1:1"
        nextStepTab = "consultations"
      } else if (pendingFeedbacks.length > 0) {
        nextStepLabel = `Xử lý ${pendingFeedbacks.length} phản hồi HS`
        nextStepTab = "student_feedback"
      } else if (gvbmPendingTeachers.length > 0) {
        nextStepLabel = `Đôn đốc GVBM (${gvbmPendingTeachers[0]})`
        nextStepTab = "companion_support"
      } else if (stOrient && stOrient.workflowStatus === "CHO_PHAN_CONG") {
        nextStepLabel = "Phân công GV Tổ TLHN tư vấn Holland"
        nextStepTab = "companion_support"
      } else if (!termEval) {
        nextStepLabel = "Hoàn thiện đánh giá & tiến bộ kỳ"
        nextStepTab = "evaluation_progress"
      } else {
        nextStepLabel = "Duy trì đồng hành & chuẩn bị kỳ mới"
        nextStepTab = "evaluation_progress"
      }

      const isOverdue = hasOverdueGvbm

      return {
        studentId: st.id,
        studentCode: st.studentCode || "",
        studentName: st.studentName,
        classId: st.classId || "",
        className: cls?.className || "",
        gradeLevel: cls?.grade || "",
        campusId: cls?.campusId || "",
        campusName: cls?.campusName || "Sky-Line",
        homeroomTeacherName: cls?.homeroomTeacherName || "GVCN",
        term,
        // Col 2
        goalsSummary: {
          total: totalGoals,
          confirmed: confirmedGoals,
          categories: goalCategories,
          items: stGoals
        },
        // Col 3
        consultationSummary: {
          completedCount: completedConsults.length,
          scheduledCount: scheduledConsults.length,
          latestDate: stConsults[0]?.meetingDate || null,
          waitingStudentFeedback: waitingStudentFeedbackConsult,
          items: stConsults
        },
        // Col 4
        studentFeedbackSummary: {
          totalCount: stFeedbacks.length,
          pendingProcessCount: pendingFeedbacks.length,
          needsAttention: needsAttentionFeedback,
          waitingStudentFeedback: waitingStudentFeedbackConsult && stFeedbacks.length === 0,
          items: stFeedbacks
        },
        // Col 5
        gvbmEvaluationSummary: {
          applicable: gvbmTasks.length > 0,
          submittedCount: gvbmSubmittedTasks.length,
          totalCount: gvbmTasks.length,
          pendingTeachers: gvbmPendingTeachers,
          hasOverdue: hasOverdueGvbm,
          items: gvbmTasks
        },
        // Col 6
        tlhnEvaluationSummary: {
          applicable: hasTlhnAssignment,
          workflowStatus: tlhnWorkflowStatus,
          hollandCode: stOrient?.hollandCode || null,
          hasHollandSurvey: Boolean(stOrient?.hollandCode),
          teacherName: tlhnTeacherName,
          submittedCount: tlhnSubmittedCount,
          totalCount: tlhnTotalCount,
          record: stOrient
        },
        // Col 7
        advisorEvaluationSummary: {
          evaluated: advisorEvaluated,
          rubricScore: termEval
            ? Math.round(
                ((Number(termEval.goalCompletionLevel || 0) +
                  Number(termEval.initiativeLevel || 0) +
                  Number(termEval.participationAttitude || 0)) /
                  3) *
                  10
              ) / 10
            : null,
          overallComment: termEval?.overallAssessment || stGoals[0]?.teacherComment || "",
          termEval
        },
        // Col 8
        progressOutcome: overallProgressOutcome,
        // Col 9
        nextStep: {
          label: nextStepLabel,
          targetTab: nextStepTab
        },
        isOverdue,
        needsSupport: needsAttentionFeedback || hasOverdueGvbm || overallProgressOutcome === "NO_PROGRESS",
        timelineHistory: stAudits
      }
    })

    // Build Section XI Hierarchical Rollup (Hệ thống -> Cơ sở -> Khối -> Lớp) & Report Summary
    const campusMap = new Map<string, any>()
    const gradeMap = new Map<string, any>()
    const classSummaryMap = new Map<string, any>()

    for (const r of rows) {
      const cKey = r.campusName || "Sky-Line"
      if (!campusMap.has(cKey)) {
        campusMap.set(cKey, {
          campusName: cKey,
          totalStudents: 0,
          withGoals: 0,
          consulted: 0,
          withProgress: 0,
          achieved: 0,
          overdue: 0
        })
      }
      const cItem = campusMap.get(cKey)
      cItem.totalStudents++
      if (r.goalsSummary.total > 0) cItem.withGoals++
      if (r.consultationSummary.completedCount > 0) cItem.consulted++
      if (r.progressOutcome === "MAKING_PROGRESS" || r.progressOutcome === "ACHIEVED") cItem.withProgress++
      if (r.progressOutcome === "ACHIEVED") cItem.achieved++
      if (r.isOverdue) cItem.overdue++

      const gKey = r.gradeLevel || "Khối"
      if (!gradeMap.has(gKey)) {
        gradeMap.set(gKey, {
          gradeLevel: gKey,
          totalStudents: 0,
          withGoals: 0,
          consulted: 0,
          withProgress: 0,
          achieved: 0
        })
      }
      const gItem = gradeMap.get(gKey)
      gItem.totalStudents++
      if (r.goalsSummary.total > 0) gItem.withGoals++
      if (r.consultationSummary.completedCount > 0) gItem.consulted++
      if (r.progressOutcome === "MAKING_PROGRESS" || r.progressOutcome === "ACHIEVED") gItem.withProgress++
      if (r.progressOutcome === "ACHIEVED") gItem.achieved++

      const clsKey = r.classId
      if (!classSummaryMap.has(clsKey)) {
        classSummaryMap.set(clsKey, {
          classId: r.classId,
          className: r.className,
          campusName: r.campusName,
          gradeLevel: r.gradeLevel,
          homeroomTeacherName: r.homeroomTeacherName,
          totalStudents: 0,
          withGoals: 0,
          consulted: 0,
          feedbackProcessed: 0,
          withProgress: 0,
          achieved: 0,
          overdue: 0
        })
      }
      const clsItem = classSummaryMap.get(clsKey)
      clsItem.totalStudents++
      if (r.goalsSummary.total > 0) clsItem.withGoals++
      if (r.consultationSummary.completedCount > 0) clsItem.consulted++
      if (r.studentFeedbackSummary.totalCount > 0 && r.studentFeedbackSummary.pendingProcessCount === 0) {
        clsItem.feedbackProcessed++
      }
      if (r.progressOutcome === "MAKING_PROGRESS" || r.progressOutcome === "ACHIEVED") clsItem.withProgress++
      if (r.progressOutcome === "ACHIEVED") clsItem.achieved++
      if (r.isOverdue) clsItem.overdue++
    }

    const reportSummary = {
      totalStudents: rows.length,
      goalSetupCount: rows.filter(r => r.goalsSummary.total > 0).length,
      consulted1on1Count: rows.filter(r => r.consultationSummary.completedCount > 0).length,
      feedbackTotalCount: rows.reduce((acc, r) => acc + r.studentFeedbackSummary.totalCount, 0),
      feedbackPendingCount: rows.reduce((acc, r) => acc + r.studentFeedbackSummary.pendingProcessCount, 0),
      gvbmAssignedStudents: rows.filter(r => r.gvbmEvaluationSummary.applicable).length,
      gvbmCompletedStudents: rows.filter(
        r => r.gvbmEvaluationSummary.applicable && r.gvbmEvaluationSummary.pendingTeachers.length === 0
      ).length,
      tlhnAssignedStudents: rows.filter(r => r.tlhnEvaluationSummary.applicable).length,
      tlhnCompletedStudents: rows.filter(r => r.tlhnEvaluationSummary.workflowStatus === "DA_TU_VAN").length,
      advisorEvaluatedCount: rows.filter(r => r.advisorEvaluationSummary.evaluated).length,
      hollandCompletedCount: rows.filter(r => r.tlhnEvaluationSummary.hasHollandSurvey).length,
      outcomeCounts: {
        INSUFFICIENT_DATA: rows.filter(r => r.progressOutcome === "INSUFFICIENT_DATA").length,
        NO_PROGRESS: rows.filter(r => r.progressOutcome === "NO_PROGRESS").length,
        MAKING_PROGRESS: rows.filter(r => r.progressOutcome === "MAKING_PROGRESS").length,
        ACHIEVED: rows.filter(r => r.progressOutcome === "ACHIEVED").length
      }
    }

    return jsonResponse({
      rows,
      hierarchySummary: {
        campuses: Array.from(campusMap.values()),
        grades: Array.from(gradeMap.values()),
        classes: Array.from(classSummaryMap.values())
      },
      reportSummary
    })
  } catch (error: any) {
    console.error("GET /api/advisory/progress-matrix error:", error)
    return jsonResponse({ error: error.message || "Lỗi tải bảng theo dõi tiến độ học sinh" }, 500)
  }
}
