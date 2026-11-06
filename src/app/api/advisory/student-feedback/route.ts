import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  ensureTriPartyTables,
  appendAdvisoryAuditLog
} from "@/lib/advisory/triparty-sync"
import {
  resolveAdvisoryCaller,
  verifyStudentRelationship
} from "@/lib/advisory/rbac-guard"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  return res
}

function hydrateFeedbackRow(row: any, studentMap: Map<string, any>) {
  const st = studentMap.get(row.studentId)
  return {
    id: row.id,
    studentId: row.studentId,
    studentName: st?.studentName || row.studentName || "Học sinh",
    studentCode: st?.studentCode || row.studentCode || "",
    classId: row.classId || st?.classId || "",
    className: st?.class?.className || "",
    academicYearId: row.academicYearId || "",
    term: row.term || "HK1",
    feedbackType: row.feedbackType || "POST_CONSULTATION",
    consultationId: row.consultationId || null,
    goalId: row.goalId || null,
    goalCategory: row.goalCategory || "",
    postConsultFeeling: row.postConsultFeeling || "",
    listenedAndRespectedScore: Number(row.listenedAndRespectedScore || 5),
    understoodNextSteps: Boolean(Number(row.understoodNextSteps ?? 1)),
    goalAndActionSuitability: row.goalAndActionSuitability || "PHU_HOP",
    supportRequestText: row.supportRequestText || "",
    wantsMoreDiscussion: Boolean(Number(row.wantsMoreDiscussion ?? 0)),
    actionsTakenText: row.actionsTakenText || "",
    resultsAndEvidenceText: row.resultsAndEvidenceText || "",
    difficultiesText: row.difficultiesText || "",
    supportNeededText: row.supportNeededText || "",
    adjustmentProposalText: row.adjustmentProposalText || "",
    shareWithParent: Boolean(Number(row.shareWithParent ?? 1)),
    studentStatus: row.studentStatus || "SUBMITTED",
    advisorProcessStatus: row.advisorProcessStatus || "PENDING",
    needsAttention: Boolean(Number(row.needsAttention ?? 0)),
    advisorReplyText: row.advisorReplyText || "",
    advisorResolutionAction: row.advisorResolutionAction || "",
    assignedSupportTeacherId: row.assignedSupportTeacherId || null,
    assignedSupportTeacherName: row.assignedSupportTeacherName || null,
    nextConsultDate: row.nextConsultDate || null,
    processedById: row.processedById || null,
    processedByName: row.processedByName || null,
    processedAt: row.processedAt || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

export async function GET(req: Request) {
  try {
    await ensureTriPartyTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập" }, 401)
    }

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId") || (caller.actorRole === "STUDENT" ? caller.studentId : "")
    const classId = searchParams.get("classId") || ""
    const academicYearId = searchParams.get("academicYearId") || ""
    const feedbackType = searchParams.get("feedbackType") || ""
    const processStatus = searchParams.get("processStatus") || ""
    const onlyNeedsAttention = searchParams.get("needsAttention") === "1"

    let targetStudentIds: string[] = []
    const studentMap = new Map<string, any>()

    if (studentId) {
      const rel = await verifyStudentRelationship(caller, studentId)
      if (!rel.allowed) {
        return jsonResponse({ error: rel.reason || "Không có quyền truy cập dữ liệu học sinh này" }, 403)
      }
      targetStudentIds = rel.allStudentIds.length > 0 ? rel.allStudentIds : [rel.student.id]
      studentMap.set(rel.student.id, rel.student)
    } else if (classId) {
      if (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN") {
        return jsonResponse({ error: "Không có quyền truy cập theo lớp" }, 403)
      }
      const clsStudents = await prisma.student
        .findMany({
          where: { classId, status: { not: "TRANSFERRED_OUT" } },
          select: {
            id: true,
            studentName: true,
            studentCode: true,
            classId: true,
            class: { select: { className: true } }
          }
        })
        .catch(() => [])
      targetStudentIds = clsStudents.map(s => s.id)
      for (const s of clsStudents) studentMap.set(s.id, s)
    } else {
      return jsonResponse({ error: "Thiếu studentId hoặc classId" }, 400)
    }

    if (targetStudentIds.length === 0) {
      return jsonResponse({ items: [], stats: { total: 0, pending: 0, processed: 0, needsAttention: 0 } })
    }

    const placeholders = targetStudentIds.map(() => "?").join(",")
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "StudentAdvisoryFeedback"
       WHERE "studentId" IN (${placeholders})
       ${academicYearId ? `AND ("academicYearId" = ? OR "academicYearId" = '')` : ""}
       ORDER BY "createdAt" DESC`,
      ...(academicYearId ? [...targetStudentIds, academicYearId] : [...targetStudentIds])
    )

    // Merge legacy StudentReflection rows that aren't in StudentAdvisoryFeedback yet
    const legacyReflections = await prisma.studentReflection
      .findMany({
        where: {
          studentId: { in: targetStudentIds },
          ...(academicYearId ? { academicYearId } : {})
        },
        orderBy: { createdAt: "desc" },
        take: 60
      })
      .catch(() => [])

    const existingIds = new Set(rows.map(r => r.id))
    const combinedItems = rows.map(r => hydrateFeedbackRow(r, studentMap))

    for (const ref of legacyReflections) {
      const legacyId = `legacy_ref_${ref.id}`
      if (existingIds.has(legacyId) || existingIds.has(ref.id)) continue
      const st = studentMap.get(ref.studentId)
      const hasDifficultyOrHelp = Boolean(
        (ref.difficulties && ref.difficulties.trim()) ||
        (ref.helpNeededText && ref.helpNeededText.trim())
      )
      combinedItems.push({
        id: ref.id,
        studentId: ref.studentId,
        studentName: st?.studentName || "Học sinh",
        studentCode: st?.studentCode || "",
        classId: st?.classId || classId || "",
        className: st?.class?.className || "",
        academicYearId: ref.academicYearId || academicYearId,
        term: "HK1",
        feedbackType: "GOAL_SELF_ASSESSMENT",
        consultationId: null,
        goalId: null,
        goalCategory: "HOC_TAP",
        postConsultFeeling: ref.feeling || "",
        listenedAndRespectedScore: Number(ref.selfRating || 5),
        understoodNextSteps: true,
        goalAndActionSuitability: "PHU_HOP",
        supportRequestText: ref.helpNeededText || "",
        wantsMoreDiscussion: false,
        actionsTakenText: ref.reflectionText || "",
        resultsAndEvidenceText: "",
        difficultiesText: ref.difficulties || "",
        supportNeededText: ref.helpNeededText || "",
        adjustmentProposalText: "",
        shareWithParent: true,
        studentStatus: "SUBMITTED",
        advisorProcessStatus: "PENDING",
        needsAttention: hasDifficultyOrHelp,
        advisorReplyText: "",
        advisorResolutionAction: "",
        assignedSupportTeacherId: null,
        assignedSupportTeacherName: null,
        nextConsultDate: null,
        processedById: null,
        processedByName: null,
        processedAt: null,
        createdAt: ref.createdAt,
        updatedAt: ref.updatedAt
      })
    }

    let filtered = combinedItems
    if (caller.actorRole === "PARENT") {
      filtered = filtered.filter(item => item.shareWithParent)
    }
    if (feedbackType) {
      filtered = filtered.filter(item => item.feedbackType === feedbackType)
    }
    if (processStatus) {
      filtered = filtered.filter(item => item.advisorProcessStatus === processStatus)
    }
    if (onlyNeedsAttention) {
      filtered = filtered.filter(item => item.needsAttention)
    }

    const stats = {
      total: combinedItems.length,
      postConsultationCount: combinedItems.filter(i => i.feedbackType === "POST_CONSULTATION").length,
      goalSelfAssessmentCount: combinedItems.filter(i => i.feedbackType === "GOAL_SELF_ASSESSMENT").length,
      pending: combinedItems.filter(i => i.advisorProcessStatus !== "PROCESSED").length,
      processed: combinedItems.filter(i => i.advisorProcessStatus === "PROCESSED").length,
      needsAttention: combinedItems.filter(i => i.needsAttention && i.advisorProcessStatus !== "PROCESSED").length
    }

    return jsonResponse({ items: filtered, stats })
  } catch (error: any) {
    console.error("GET /api/advisory/student-feedback error:", error)
    return jsonResponse({ error: error.message || "Lỗi tải phản hồi học sinh" }, 500)
  }
}

export async function POST(req: Request) {
  try {
    await ensureTriPartyTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập" }, 401)
    }

    const body = await req.json()
    const {
      studentId,
      academicYearId = "",
      term = "HK1",
      feedbackType = "POST_CONSULTATION",
      consultationId = null,
      goalId = null,
      goalCategory = "HOC_TAP",
      postConsultFeeling = "",
      listenedAndRespectedScore = 5,
      understoodNextSteps = true,
      goalAndActionSuitability = "PHU_HOP",
      supportRequestText = "",
      wantsMoreDiscussion = false,
      actionsTakenText = "",
      resultsAndEvidenceText = "",
      difficultiesText = "",
      supportNeededText = "",
      adjustmentProposalText = "",
      shareWithParent = true
    } = body

    const targetStudentId = studentId || caller.studentId || ""
    if (!targetStudentId) {
      return jsonResponse({ error: "Thiếu định danh học sinh" }, 400)
    }

    const rel = await verifyStudentRelationship(caller, targetStudentId)
    if (!rel.allowed || !rel.student) {
      return jsonResponse({ error: rel.reason || "Không có quyền gửi phản hồi" }, 403)
    }

    const needsAttention =
      Boolean(wantsMoreDiscussion) ||
      !Boolean(understoodNextSteps) ||
      goalAndActionSuitability !== "PHU_HOP" ||
      Boolean(supportRequestText && String(supportRequestText).trim()) ||
      Boolean(supportNeededText && String(supportNeededText).trim()) ||
      Boolean(difficultiesText && String(difficultiesText).trim())

    const id = `sfb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const effectiveYearId = academicYearId || rel.student.academicYearId || ""

    await prisma.$executeRawUnsafe(
      `INSERT INTO "StudentAdvisoryFeedback" (
        "id", "studentId", "classId", "academicYearId", "term", "feedbackType",
        "consultationId", "goalId", "goalCategory",
        "postConsultFeeling", "listenedAndRespectedScore", "understoodNextSteps",
        "goalAndActionSuitability", "supportRequestText", "wantsMoreDiscussion",
        "actionsTakenText", "resultsAndEvidenceText", "difficultiesText",
        "supportNeededText", "adjustmentProposalText",
        "shareWithParent", "studentStatus", "advisorProcessStatus", "needsAttention",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', 'PENDING', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      id,
      rel.student.id,
      rel.student.classId || null,
      effectiveYearId,
      term,
      feedbackType,
      consultationId || null,
      goalId || null,
      goalCategory || "HOC_TAP",
      postConsultFeeling || null,
      Number(listenedAndRespectedScore || 5),
      understoodNextSteps ? 1 : 0,
      goalAndActionSuitability || "PHU_HOP",
      supportRequestText || null,
      wantsMoreDiscussion ? 1 : 0,
      actionsTakenText || null,
      resultsAndEvidenceText || null,
      difficultiesText || null,
      supportNeededText || null,
      adjustmentProposalText || null,
      shareWithParent ? 1 : 0,
      needsAttention ? 1 : 0
    )

    // Update consultation metadata if linked to a consultation session
    if (consultationId) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "AdvisoryConsultationMeta" (
          "consultationId", "studentId", "academicYearId", "term",
          "consultationStatus", "studentFeedbackStatus", "advisorProcessStatus", "updatedAt"
        ) VALUES (?, ?, ?, ?, 'COMPLETED', 'SUBMITTED', 'PENDING_PROCESS', CURRENT_TIMESTAMP)
        ON CONFLICT("consultationId") DO UPDATE SET
          "studentFeedbackStatus" = 'SUBMITTED',
          "advisorProcessStatus" = 'PENDING_PROCESS',
          "updatedAt" = CURRENT_TIMESTAMP`,
        consultationId,
        rel.student.id,
        effectiveYearId,
        term
      )

      // Sync summary to AcademicConsultationLog.studentReflection for backward compatibility
      const summaryText =
        postConsultFeeling ||
        `[Mức độ lắng nghe: ${listenedAndRespectedScore}/5] ${supportRequestText || ""}`.trim()
      await prisma.academicConsultationLog
        .update({
          where: { id: consultationId },
          data: { studentReflection: summaryText }
        })
        .catch(() => {})
    }

    // Notify homeroom teacher
    try {
      const hmId = rel.student.class?.homeroomTeacherId
      if (hmId) {
        const hmTeacher = await prisma.teacher.findFirst({
          where: { OR: [{ id: hmId }, { teacherCode: hmId }] },
          select: { userId: true }
        })
        if (hmTeacher?.userId) {
          await prisma.notification.create({
            data: {
              userId: hmTeacher.userId,
              title:
                feedbackType === "POST_CONSULTATION"
                  ? `[Cố vấn học tập] Học sinh ${rel.student.studentName} đã gửi phản hồi sau tư vấn`
                  : `[Cố vấn học tập] Học sinh ${rel.student.studentName} đã gửi tự đánh giá mục tiêu`,
              message: needsAttention
                ? `Học sinh có đề nghị hỗ trợ / cần trao đổi thêm (Đã đưa vào danh sách Cần quan tâm).`
                : `Vui lòng xem và xử lý phản hồi của học sinh.`,
              link: `/teacher/co-van-hoc-tap?classId=${rel.student.classId || ""}&tab=student_feedback`
            }
          })
        }
      }
    } catch {}

    await appendAdvisoryAuditLog({
      studentId: rel.student.id,
      actorId: caller.userId,
      actorRole: caller.actorRole,
      actorName: caller.actorName,
      entityType: "REFLECTION",
      entityId: id,
      action:
        feedbackType === "POST_CONSULTATION"
          ? "SUBMIT_POST_CONSULTATION_FEEDBACK"
          : "SUBMIT_GOAL_SELF_ASSESSMENT",
      privacyTier: shareWithParent ? "SHARED_EDUCATIONAL" : "PRIVATE_ADVISORY",
      summary:
        feedbackType === "POST_CONSULTATION"
          ? `Học sinh gửi phản hồi sau buổi tư vấn 1:1 (Chia sẻ PHHS: ${shareWithParent ? "Có" : "Không"})`
          : `Học sinh gửi tự đánh giá thực hiện mục tiêu (Chia sẻ PHHS: ${shareWithParent ? "Có" : "Không"})`
    })

    return jsonResponse({
      success: true,
      id,
      needsAttention
    })
  } catch (error: any) {
    console.error("POST /api/advisory/student-feedback error:", error)
    return jsonResponse({ error: error.message || "Không thể lưu phản hồi" }, 500)
  }
}

export async function PATCH(req: Request) {
  try {
    await ensureTriPartyTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated || (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN")) {
      return jsonResponse({ error: "Chỉ GVCN/CVHT mới có quyền xử lý phản hồi" }, 403)
    }

    const body = await req.json()
    const {
      id,
      studentId,
      advisorReplyText = "",
      advisorResolutionAction = "CONFIRMED",
      advisorProcessStatus = "PROCESSED",
      needsAttention,
      assignedSupportTeacherId = null,
      assignedSupportTeacherName = null,
      supportSubjectName = "Đồng hành hỗ trợ mục tiêu",
      nextConsultDate = null
    } = body

    if (!id) {
      return jsonResponse({ error: "Thiếu mã phản hồi (id)" }, 400)
    }

    const existingRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "StudentAdvisoryFeedback" WHERE "id" = ? LIMIT 1`,
      id
    )
    const existing = existingRows[0]
    const targetStudentId = existing?.studentId || studentId || ""

    if (targetStudentId) {
      const rel = await verifyStudentRelationship(caller, targetStudentId)
      if (!rel.allowed) {
        return jsonResponse({ error: rel.reason || "Không có quyền xử lý phản hồi của học sinh này" }, 403)
      }
    }

    if (existing) {
      const nextAttention =
        typeof needsAttention === "boolean"
          ? needsAttention
            ? 1
            : 0
          : advisorProcessStatus === "PROCESSED"
            ? 0
            : Number(existing.needsAttention || 0)

      await prisma.$executeRawUnsafe(
        `UPDATE "StudentAdvisoryFeedback"
         SET "advisorReplyText" = ?,
             "advisorResolutionAction" = ?,
             "advisorProcessStatus" = ?,
             "needsAttention" = ?,
             "assignedSupportTeacherId" = COALESCE(?, "assignedSupportTeacherId"),
             "assignedSupportTeacherName" = COALESCE(?, "assignedSupportTeacherName"),
             "nextConsultDate" = COALESCE(?, "nextConsultDate"),
             "processedById" = ?,
             "processedByName" = ?,
             "processedAt" = CURRENT_TIMESTAMP,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = ?`,
        advisorReplyText,
        advisorResolutionAction,
        advisorProcessStatus,
        nextAttention,
        assignedSupportTeacherId,
        assignedSupportTeacherName,
        nextConsultDate,
        caller.teacherId || caller.userId,
        caller.actorName || "GVCN / CVHT",
        id
      )

      if (existing.consultationId) {
        await prisma.$executeRawUnsafe(
          `UPDATE "AdvisoryConsultationMeta"
           SET "advisorProcessStatus" = ?,
               "updatedAt" = CURRENT_TIMESTAMP
           WHERE "consultationId" = ?`,
          advisorProcessStatus,
          existing.consultationId
        )
      }
    }

    // If GVCN chose to assign a support teacher directly from feedback processing
    if (assignedSupportTeacherId && targetStudentId) {
      const taskId = `gvt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      await prisma.$executeRawUnsafe(
        `INSERT INTO "SubjectTeacherAdvisoryTask" (
          "id", "studentId", "classId", "academicYearId",
          "subjectName", "assignedByTeacherId", "assignedByTeacherName",
          "assignedToTeacherId", "assignedToTeacherName",
          "consultationPrompt", "supportGoal", "status",
          "goalId", "companionType", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ASSIGNED', ?, 'GVBM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        taskId,
        targetStudentId,
        existing?.classId || null,
        existing?.academicYearId || "",
        supportSubjectName,
        caller.teacherId || caller.userId,
        caller.actorName || "GVCN / CVHT",
        assignedSupportTeacherId,
        assignedSupportTeacherName || "Giáo viên đồng hành",
        advisorReplyText || existing?.supportRequestText || existing?.supportNeededText || "Hỗ trợ theo phản hồi của học sinh",
        existing?.adjustmentProposalText || "Tháo gỡ khó khăn và đồng hành đạt mục tiêu",
        existing?.goalId || null
      )
    }

    // If GVCN scheduled a follow-up consultation session
    if (nextConsultDate && targetStudentId) {
      await prisma.academicConsultationLog
        .create({
          data: {
            studentId: targetStudentId,
            teacherId: caller.teacherId || caller.userId,
            academicYearId: existing?.academicYearId || "",
            meetingDate: new Date(nextConsultDate),
            content: `Lịch tư vấn tiếp theo từ phản hồi học sinh: ${advisorReplyText || "Trao đổi tháo gỡ khó khăn"}`,
            difficulties: existing?.difficultiesText || existing?.supportRequestText || "",
            nextActions: advisorReplyText || "",
            status: "PENDING"
          }
        })
        .catch(() => {})
    }

    await appendAdvisoryAuditLog({
      studentId: targetStudentId,
      actorId: caller.userId,
      actorRole: caller.actorRole,
      actorName: caller.actorName,
      entityType: "REFLECTION",
      entityId: id,
      action: "PROCESS_STUDENT_FEEDBACK",
      privacyTier: "SHARED_EDUCATIONAL",
      summary: `GVCN xử lý phản hồi học sinh (${advisorResolutionAction} • Trạng thái: ${advisorProcessStatus})`
    })

    return jsonResponse({ success: true })
  } catch (error: any) {
    console.error("PATCH /api/advisory/student-feedback error:", error)
    return jsonResponse({ error: error.message || "Không thể cập nhật xử lý phản hồi" }, 500)
  }
}
