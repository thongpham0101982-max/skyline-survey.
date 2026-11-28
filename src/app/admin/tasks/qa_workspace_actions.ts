"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { getOperationalScope } from "@/lib/session"
import {
  appendQaTaskAuditLog,
  ensureQaWorkspaceSchema,
  getQaMetadataMapForTasks,
  getQaTaskAuditLogs,
  getRecentQaReminders,
  QA_META_SELECT_COLUMNS,
  recordQaReminderIfNotExists,
  upsertQaTaskMetadata,
} from "@/lib/qa-workspace/schemaInit"
import {
  buildRecurrenceInstanceKey,
  canCompleteChecklistStep,
  computeChecklistMetrics,
  computeTaskDeadlineStatus,
  validateWorkflowTransition,
  WORKFLOW_STATUS_CONFIG,
} from "@/lib/qa-workspace/workflowEngine"
import {
  QaAssignmentMode,
  QaChecklistStep,
  QaEvidenceLink,
  QaPriority,
  QaRecurrenceRule,
  QaReviewRating,
  QaSourceModuleCode,
  QaTaskScopeMeta,
  QaWorkflowStatus,
} from "@/lib/qa-workspace/types"
import {
  sendQaSmartReminderDigestEmail,
  sendQaTaskAssignmentEmails,
  sendQaTaskConfirmationFeedbackEmail,
  sendQaWorkflowTransitionEmails,
} from "@/lib/qa-workspace/emailService"
import { ensureCoordinationTables } from "@/lib/coordination/schemaInit"

export interface CreateQaTaskInput {
  title: string
  description?: string
  category: string
  taskGroupId?: string | null
  workspaceCardKey?: string | null
  assignmentMode: QaAssignmentMode
  assignedToRole?: string
  assignedToUserId?: string | null
  assignedToUserIds?: string[] // Dùng khi MULTI_INDIVIDUAL
  coordinatorUserId?: string | null
  collaboratorUserIds?: string[]
  collaboratorsText?: string | null
  reviewerUserId?: string | null
  requiresApproval?: boolean
  startDate: string
  endDate: string
  reviewDueDate?: string | null
  priority?: QaPriority
  workflowStatus?: "DRAFT" | "ASSIGNED"
  isDraft?: boolean
  sendEmailNotification?: boolean
  deliverables?: string
  completionCriteria?: string
  requiredEvidences?: string
  checklist?: QaChecklistStep[]
  checklistSteps?: QaChecklistStep[]
  scopeMeta?: QaTaskScopeMeta
  scopeCampusId?: string | null
  scopeGradeLevel?: string | null
  scopeClassId?: string | null
  scopeSubject?: string | null
  scopeSurveyPeriod?: string | null
  sourceModule?: QaSourceModuleCode | null
  sourceRecordId?: string | null
  sourceUrl?: string | null
  externalSyncKey?: string | null
  recurrenceRule?: QaRecurrenceRule | null
  academicYearId?: string | null
  positionCodes?: string[]
  templateSnapshot?: Record<string, any> | null
}

function buildNormalizedScopeMeta(
  input: Partial<CreateQaTaskInput>,
  fallback?: QaTaskScopeMeta
): QaTaskScopeMeta {
  const base: any = { ...(fallback || {}), ...(input.scopeMeta || {}) }
  if (input.scopeCampusId !== undefined) base.campusId = input.scopeCampusId || null
  if (input.academicYearId !== undefined) base.academicYearId = input.academicYearId || null
  if (input.scopeGradeLevel !== undefined) {
    base.grade = input.scopeGradeLevel || null
    base.gradeLevel = input.scopeGradeLevel || null
  }
  if (input.scopeClassId !== undefined) {
    base.classId = input.scopeClassId || null
    base.classCode = input.scopeClassId || null
  }
  if (input.scopeSubject !== undefined) {
    base.subjectName = input.scopeSubject || null
    base.subjectCode = input.scopeSubject || null
  }
  if (input.scopeSurveyPeriod !== undefined) {
    base.periodCode = input.scopeSurveyPeriod || null
    base.surveyPeriod = input.scopeSurveyPeriod || null
  }
  if (input.positionCodes && input.positionCodes.length > 0) {
    base.positionCodes = input.positionCodes
  }
  if (input.templateSnapshot) {
    base.templateId = input.templateSnapshot.templateId || null
    base.templateItemCode = input.templateSnapshot.itemCode || null
    base.templateVersion = input.templateSnapshot.version || 1
    base.reportCadences = input.templateSnapshot.reportCadences || []
    base.positionCodes =
      input.positionCodes && input.positionCodes.length > 0
        ? input.positionCodes
        : input.templateSnapshot.rPositions || []
    base.templateSnapshot = input.templateSnapshot
  }
  return base
}

/**
 * Tạo nhiệm vụ mới trên QA Workspace (Hỗ trợ 4 chế độ: Nhóm, Cá nhân, Nhiều cá nhân độc lập, Việc định kỳ)
 * Đảm bảo quy tắc: Mỗi nhiệm vụ luôn có một người chịu trách nhiệm chính (assignedToUserId).
 */
export async function createQaWorkspaceTask(input: CreateQaTaskInput) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Vui lòng đăng nhập để giao việc." }
    }
    await ensureQaWorkspaceSchema()

    const actorId = String(session.user.id)
    const actorName = String(
      (session.user as any).fullName || (session.user as any).name || session.user.email || "Ban Điều Hành"
    )
    const actorRole = String((session.user as any).role || "ADMIN")

    if (!input.title || !input.title.trim()) {
      return { success: false, error: "Vui lòng nhập tên công việc." }
    }
    if (!input.category || !input.category.trim()) {
      return { success: false, error: "Vui lòng chọn nhóm nghiệp vụ / danh mục công việc." }
    }
    if (!input.startDate || !input.endDate) {
      return { success: false, error: "Vui lòng chọn ngày bắt đầu và hạn thực hiện." }
    }

    // Xác định danh sách người chịu trách nhiệm chính cho từng phiếu được sinh ra
    let targetPrimaryUserIds: string[] = []
    let coordinatorId = input.coordinatorUserId || null
    let groupMemberUserIds: string[] = []
    let taskGroupName: string | null = null

    if (input.taskGroupId) {
      const grp = await prisma.taskGroup
        .findUnique({
          where: { id: input.taskGroupId },
          select: { leaderUserId: true, memberUserIds: true, name: true },
        })
        .catch(() => null)
      if (grp) {
        taskGroupName = grp.name
        if (grp.memberUserIds) {
          try {
            const parsed = JSON.parse(grp.memberUserIds)
            if (Array.isArray(parsed)) groupMemberUserIds = parsed.filter(Boolean)
          } catch {}
        }
        if (input.assignmentMode === "GROUP") {
          if (!coordinatorId && grp.leaderUserId) coordinatorId = grp.leaderUserId
        }
      }
    }

    if (input.assignmentMode === "MULTI_INDIVIDUAL") {
      const multiIds = (input.assignedToUserIds || []).filter(Boolean)
      if (multiIds.length === 0 && input.assignedToUserId) {
        targetPrimaryUserIds = [input.assignedToUserId]
      } else {
        targetPrimaryUserIds = Array.from(new Set(multiIds))
      }
      if (targetPrimaryUserIds.length === 0) {
        return {
          success: false,
          error: "Chế độ 'Giao cùng yêu cầu cho nhiều cá nhân' cần chọn ít nhất 1 cá nhân nhận việc.",
        }
      }
    } else if (input.assignmentMode === "GROUP") {
      let primaryId = input.assignedToUserId || coordinatorId || null
      if (!primaryId && groupMemberUserIds.length > 0) {
        primaryId = groupMemberUserIds[0]
      }
      if (!primaryId) {
        return {
          success: false,
          error:
            "Mỗi nhiệm vụ luôn phải có 1 người chịu trách nhiệm chính (Người điều phối nhóm). Vui lòng chọn Người điều phối chịu trách nhiệm chính.",
        }
      }
      targetPrimaryUserIds = [primaryId]
      if (!coordinatorId) coordinatorId = primaryId
    } else {
      // INDIVIDUAL hoặc RECURRING
      const primaryId = input.assignedToUserId || null
      if (!primaryId) {
        return {
          success: false,
          error: "Mỗi nhiệm vụ luôn phải có một người chịu trách nhiệm chính. Vui lòng chọn người phụ trách chính.",
        }
      }
      targetPrimaryUserIds = [primaryId]
    }

    // Chống tạo trùng nếu có externalSyncKey
    if (input.externalSyncKey) {
      const pAny = prisma as any
      if (typeof pAny.$queryRawUnsafe === "function") {
        const existingSync: any[] = await pAny.$queryRawUnsafe(
          `SELECT "taskId" FROM "qa_task_metadata" WHERE "externalSyncKey" = ? LIMIT 1`,
          input.externalSyncKey
        )
        if (existingSync && existingSync.length > 0) {
          return {
            success: true,
            alreadySynced: true,
            deduplicated: true,
            taskId: existingSync[0].taskId,
            createdCount: 0,
            emailsSentCount: 0,
            message: "Hồ sơ nguồn này đã được liên kết nhiệm vụ trước đó (không tạo trùng).",
          }
        }
      }
    }

    const batchCode =
      input.assignmentMode === "MULTI_INDIVIDUAL" && targetPrimaryUserIds.length > 1
        ? `BATCH_${Date.now().toString().slice(-6)}`
        : null

    const collaboratorIds = Array.from(
      new Set((input.collaboratorUserIds || []).filter(Boolean))
    )

    // Giải quyết tên người phối hợp
    let collaboratorsStr = input.collaboratorsText || null
    if (!collaboratorsStr && collaboratorIds.length > 0) {
      const colUsers = await prisma.user.findMany({
        where: { id: { in: collaboratorIds } },
        select: { fullName: true },
      })
      collaboratorsStr = colUsers.map((u) => u.fullName).join(", ")
    }

    const initialWorkflow: QaWorkflowStatus =
      input.isDraft || input.workflowStatus === "DRAFT" ? "DRAFT" : "ASSIGNED"
    const priority: QaPriority = input.priority || "MEDIUM"
    const requiresApproval = input.requiresApproval !== undefined ? input.requiresApproval : true
    const resolvedChecklist = Array.isArray(input.checklist)
      ? input.checklist
      : Array.isArray(input.checklistSteps)
      ? input.checklistSteps
      : []
    const clMetrics = computeChecklistMetrics(resolvedChecklist)
    const normalizedScopeMeta = buildNormalizedScopeMeta(input)
    const normalizedRecurrenceRule = input.recurrenceRule
      ? {
          ...input.recurrenceRule,
          isActive: input.recurrenceRule.isActive !== false,
          autoPublish:
            input.recurrenceRule.autoPublish ??
            input.recurrenceRule.approvedForAutoRelease ??
            true,
        }
      : null

    const createdTasks: any[] = []
    let totalEmailsSent = 0
    const allEmailRecipients = new Set<string>()

    for (let idx = 0; idx < targetPrimaryUserIds.length; idx++) {
      const uid = targetPrimaryUserIds[idx]

      // Kiểm tra chống sinh trùng cho việc định kỳ
      let recurrenceInstanceKey: string | null = null
      if (input.assignmentMode === "RECURRING" && normalizedRecurrenceRule) {
        const tplKey = `${input.title.trim().toLowerCase().slice(0, 40)}_${uid}`
        recurrenceInstanceKey = buildRecurrenceInstanceKey(
          tplKey,
          normalizedRecurrenceRule,
          new Date(input.startDate)
        )
        const pAny = prisma as any
        if (typeof pAny.$queryRawUnsafe === "function") {
          const dupRec: any[] = await pAny.$queryRawUnsafe(
            `SELECT "taskId" FROM "qa_task_metadata" WHERE "recurrenceInstanceKey" = ? LIMIT 1`,
            recurrenceInstanceKey
          )
          if (dupRec && dupRec.length > 0) {
            continue
          }
        }
      }

      const task = await prisma.workTask.create({
        data: {
          category: input.category.trim(),
          title: input.title.trim(),
          description: input.description || "",
          assignedToRole: input.assignedToRole || "KT&ĐBCL",
          assignedToUserId: uid,
          assignedById: actorId,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          progress: "PENDING",
          acceptanceStatus: "WAITING_CONFIRMATION",
          month: new Date(input.endDate).getMonth() + 1,
          academicYearId: input.academicYearId || normalizedScopeMeta?.academicYearId || null,
          isImportant: priority === "HIGH" || priority === "URGENT",
          collaborators: collaboratorsStr,
          taskGroupId: input.taskGroupId || null,
          department: input.assignedToRole === "KT_DBCL" ? "KT&ĐBCL" : input.assignedToRole || "KT&ĐBCL",
          priority,
        },
      })

      const effectiveReviewerId = input.reviewerUserId || actorId

      await upsertQaTaskMetadata({
        taskId: task.id,
        workflowStatus: initialWorkflow,
        assignmentMode: input.assignmentMode,
        workspaceCardKey: input.workspaceCardKey || null,
        coordinatorUserId: coordinatorId,
        reviewerUserId: effectiveReviewerId,
        collaboratorUserIds: collaboratorIds,
        requiresApproval,
        reviewDueDate: input.reviewDueDate || null,
        deliverables: input.deliverables || null,
        completionCriteria: input.completionCriteria || null,
        requiredEvidences: input.requiredEvidences || null,
        checklist: resolvedChecklist,
        currentStepLabel: clMetrics.currentStep?.title || "Tiếp nhận & triển khai",
        nextStepLabel: clMetrics.nextStep?.title || (requiresApproval ? "Gửi duyệt nghiệm thu" : "Hoàn thành"),
        scopeMeta: normalizedScopeMeta,
        sourceModule: (input.sourceModule as QaSourceModuleCode) || "MANUAL",
        sourceRecordId: input.sourceRecordId || null,
        sourceUrl: input.sourceUrl || null,
        externalSyncKey: idx === 0 ? input.externalSyncKey || null : null,
        batchCode,
        recurrenceRule: normalizedRecurrenceRule,
        recurrenceTemplateId: input.assignmentMode === "RECURRING" ? task.id : null,
        recurrenceInstanceKey,
        version: 1,
      })

      await appendQaTaskAuditLog({
        taskId: task.id,
        actorUserId: actorId,
        actorName,
        actorRole,
        action: "CREATE",
        fromStatus: null,
        toStatus: initialWorkflow,
        reason: `Khởi tạo phiếu giao việc (${input.assignmentMode})`,
        changes: {
          assignedToUserId: uid,
          collaboratorUserIds: collaboratorIds,
          endDate: input.endDate,
          reviewDueDate: input.reviewDueDate || null,
          priority,
        },
      })

      // Chỉ gửi thông báo in-app & Email khi phiếu đã phát hành (ASSIGNED), không gửi khi đang lưu Nháp (DRAFT)
      if (initialWorkflow === "ASSIGNED") {
        const dueStr = new Date(input.endDate).toLocaleDateString("vi-VN")

        // 1. Thông báo In-App đến Người chịu trách nhiệm chính
        if (uid !== actorId) {
          await prisma.notification
            .create({
              data: {
                userId: uid,
                title: `${priority === "URGENT" || priority === "HIGH" ? "[ƯU TIÊN] " : ""}[Yêu cầu xác nhận nhận việc] ${input.title.trim()}`,
                message: `${actorName} đã giao nhiệm vụ mới cho bạn (Hạn bàn giao: ${dueStr}). Vui lòng kiểm tra và xác nhận tiếp nhận nhiệm vụ.`,
                isRead: false,
                link: `/admin/tasks?taskId=${task.id}&action=confirm`,
              },
            })
            .catch(() => {})
        }

        // 2. Thông báo In-App đến Người phối hợp & Thành viên Nhóm (nếu giao theo GROUP)
        const relatedMemberIds = Array.from(
          new Set([
            ...collaboratorIds,
            ...(input.assignmentMode === "GROUP" ? groupMemberUserIds : []),
          ])
        ).filter((mId) => mId && mId !== uid && mId !== actorId)

        for (const colId of relatedMemberIds) {
          await prisma.notification
            .create({
              data: {
                userId: colId,
                title: `[Phối hợp công việc KT&ĐBCL] ${input.title.trim()}`,
                message: `${actorName} đã phân công bạn tham gia phối hợp thực hiện nhiệm vụ "${input.title.trim()}" (Hạn: ${dueStr}).`,
                isRead: false,
                link: `/admin/tasks?taskId=${task.id}`,
              },
            })
            .catch(() => {})
        }

        // 3. Thông báo In-App đến Người duyệt nghiệm thu (nếu khác Người giao & khác Người nhận)
        if (
          requiresApproval &&
          effectiveReviewerId &&
          effectiveReviewerId !== actorId &&
          effectiveReviewerId !== uid &&
          !relatedMemberIds.includes(effectiveReviewerId)
        ) {
          await prisma.notification
            .create({
              data: {
                userId: effectiveReviewerId,
                title: `[Phân công nghiệm thu] ${input.title.trim()}`,
                message: `${actorName} đã chỉ định bạn duyệt nghiệm thu kết quả nhiệm vụ "${input.title.trim()}".`,
                isRead: false,
                link: `/admin/tasks?taskId=${task.id}&tab=review`,
              },
            })
            .catch(() => {})
        }

        // 4. Gửi Email tự động đến toàn bộ thành viên liên quan
        if (input.sendEmailNotification !== false) {
          try {
            const mailRes = await sendQaTaskAssignmentEmails({
              taskId: task.id,
              title: input.title.trim(),
              description: input.description || "",
              category: input.category.trim(),
              taskGroupName,
              assignmentMode: input.assignmentMode,
              priority,
              startDate: input.startDate,
              endDate: input.endDate,
              reviewDueDate: input.reviewDueDate || null,
              requiresApproval,
              deliverables: input.deliverables || null,
              completionCriteria: input.completionCriteria || null,
              requiredEvidences: input.requiredEvidences || null,
              checklist: resolvedChecklist,
              assignerUserId: actorId,
              assignerName: actorName,
              primaryAssigneeId: uid,
              collaboratorUserIds: collaboratorIds,
              groupMemberUserIds: input.assignmentMode === "GROUP" ? groupMemberUserIds : [],
              reviewerUserId: effectiveReviewerId,
            })
            totalEmailsSent += mailRes.sentCount
            mailRes.recipients.forEach((r) => allEmailRecipients.add(r))
          } catch (mailErr) {
            console.warn("[createQaWorkspaceTask] Email dispatch warning:", mailErr)
          }
        }
      }

      createdTasks.push(task)
    }

    revalidatePath("/admin/tasks")
    revalidatePath("/teacher/tasks")
    return {
      success: true,
      createdCount: createdTasks.length,
      primaryTaskId: createdTasks[0]?.id || null,
      batchCode,
      emailsSentCount: totalEmailsSent,
      emailRecipients: Array.from(allEmailRecipients),
    }
  } catch (err: any) {
    console.error("[createQaWorkspaceTask] Error:", err)
    return { success: false, error: err?.message || "Lỗi khi tạo phiếu giao việc" }
  }
}

/**
 * Cập nhật thông tin phiếu giao việc (kèm lưu lịch sử đổi người chịu trách nhiệm, đổi hạn, chống ghi đè & gửi lại mail khi đổi người/phát hành nháp)
 */
export async function updateQaWorkspaceTask(
  taskId: string,
  input: Partial<CreateQaTaskInput> & { expectedVersion?: number; changeReason?: string }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" }
    await ensureQaWorkspaceSchema()

    const actorId = String(session.user.id)
    const actorName = String(
      (session.user as any).fullName || (session.user as any).name || session.user.email || "Quản lý"
    )
    const actorRole = String((session.user as any).role || "ADMIN")

    const existingTask = await prisma.workTask.findUnique({
      where: { id: taskId },
      include: { taskGroup: { select: { id: true, name: true, memberUserIds: true } } },
    })
    if (!existingTask) return { success: false, error: "Không tìm thấy nhiệm vụ" }

    if (input.assignedToUserId !== undefined && !input.assignedToUserId) {
      return {
        success: false,
        error: "Mỗi nhiệm vụ luôn phải có 1 người chịu trách nhiệm chính.",
      }
    }

    const metaMap = await getQaMetadataMapForTasks([existingTask])
    const currentMeta = metaMap.get(taskId)!

    const resolvedChecklist =
      input.checklist !== undefined
        ? input.checklist
        : input.checklistSteps !== undefined
        ? input.checklistSteps
        : currentMeta.checklist
    const clMetrics = computeChecklistMetrics(resolvedChecklist)

    const nextWorkflowStatus: QaWorkflowStatus =
      input.isDraft !== undefined
        ? input.isDraft
          ? "DRAFT"
          : currentMeta.workflowStatus === "DRAFT"
          ? "ASSIGNED"
          : currentMeta.workflowStatus
        : input.workflowStatus || currentMeta.workflowStatus

    const nextCollaboratorIds =
      input.collaboratorUserIds !== undefined
        ? Array.from(new Set(input.collaboratorUserIds.filter(Boolean)))
        : currentMeta.collaboratorUserIds || []

    const nextScopeMeta = buildNormalizedScopeMeta(input, currentMeta.scopeMeta)

    const metaRes = await upsertQaTaskMetadata(
      {
        taskId,
        workflowStatus: nextWorkflowStatus,
        assignmentMode: input.assignmentMode || currentMeta.assignmentMode,
        workspaceCardKey:
          input.workspaceCardKey !== undefined ? input.workspaceCardKey : currentMeta.workspaceCardKey,
        coordinatorUserId:
          input.coordinatorUserId !== undefined ? input.coordinatorUserId : currentMeta.coordinatorUserId,
        reviewerUserId:
          input.reviewerUserId !== undefined ? input.reviewerUserId : currentMeta.reviewerUserId,
        collaboratorUserIds: nextCollaboratorIds,
        requiresApproval:
          input.requiresApproval !== undefined ? input.requiresApproval : currentMeta.requiresApproval,
        reviewDueDate:
          input.reviewDueDate !== undefined ? input.reviewDueDate : currentMeta.reviewDueDate,
        deliverables:
          input.deliverables !== undefined ? input.deliverables : currentMeta.deliverables,
        completionCriteria:
          input.completionCriteria !== undefined
            ? input.completionCriteria
            : currentMeta.completionCriteria,
        requiredEvidences:
          input.requiredEvidences !== undefined
            ? input.requiredEvidences
            : currentMeta.requiredEvidences,
        checklist: resolvedChecklist,
        currentStepLabel: clMetrics.currentStep?.title || currentMeta.currentStepLabel,
        nextStepLabel: clMetrics.nextStep?.title || currentMeta.nextStepLabel,
        scopeMeta: nextScopeMeta,
        sourceModule: (input.sourceModule as QaSourceModuleCode) || currentMeta.sourceModule,
        sourceRecordId:
          input.sourceRecordId !== undefined ? input.sourceRecordId : currentMeta.sourceRecordId,
        sourceUrl: input.sourceUrl !== undefined ? input.sourceUrl : currentMeta.sourceUrl,
        recurrenceRule:
          input.recurrenceRule !== undefined ? input.recurrenceRule : currentMeta.recurrenceRule,
      },
      { expectedVersion: input.expectedVersion }
    )

    if (!metaRes.success) {
      return {
        success: false,
        conflict: metaRes.conflict,
        error: metaRes.error,
      }
    }

    let collaboratorsStr = existingTask.collaborators
    if (input.collaboratorsText !== undefined) {
      collaboratorsStr = input.collaboratorsText
    } else if (input.collaboratorUserIds !== undefined) {
      if (nextCollaboratorIds.length > 0) {
        const colUsers = await prisma.user.findMany({
          where: { id: { in: nextCollaboratorIds } },
          select: { fullName: true },
        })
        collaboratorsStr = colUsers.map((u) => u.fullName).join(", ")
      } else {
        collaboratorsStr = null
      }
    }

    const newAssigneeId =
      input.assignedToUserId !== undefined ? input.assignedToUserId : existingTask.assignedToUserId
    const newEndDate = input.endDate ? new Date(input.endDate) : existingTask.endDate
    const assigneeChanged = existingTask.assignedToUserId !== newAssigneeId
    const draftPublished =
      currentMeta.workflowStatus === "DRAFT" && nextWorkflowStatus === "ASSIGNED"

    await prisma.workTask.update({
      where: { id: taskId },
      data: {
        title: input.title ? input.title.trim() : existingTask.title,
        description: input.description !== undefined ? input.description : existingTask.description,
        category: input.category ? input.category.trim() : existingTask.category,
        taskGroupId: input.taskGroupId !== undefined ? input.taskGroupId || null : existingTask.taskGroupId,
        assignedToUserId: newAssigneeId,
        acceptanceStatus: assigneeChanged ? "WAITING_CONFIRMATION" : existingTask.acceptanceStatus,
        acceptedAt: assigneeChanged ? null : existingTask.acceptedAt,
        startDate: input.startDate ? new Date(input.startDate) : existingTask.startDate,
        endDate: newEndDate,
        priority: input.priority || existingTask.priority,
        isImportant:
          (input.priority || existingTask.priority) === "HIGH" ||
          (input.priority || existingTask.priority) === "URGENT",
        collaborators: collaboratorsStr,
        academicYearId:
          input.academicYearId !== undefined ? input.academicYearId : existingTask.academicYearId,
      },
    })

    // Ghi lịch sử nếu đổi người phụ trách hoặc đổi hạn
    const prevEndYmd = new Date(existingTask.endDate).toISOString().slice(0, 10)
    const nextEndYmd = new Date(newEndDate).toISOString().slice(0, 10)
    if (assigneeChanged) {
      await appendQaTaskAuditLog({
        taskId,
        actorUserId: actorId,
        actorName,
        actorRole,
        action: "CHANGE_ASSIGNEE",
        fromStatus: currentMeta.workflowStatus,
        toStatus: nextWorkflowStatus,
        reason: input.changeReason || "Điều chuyển người chịu trách nhiệm chính",
        changes: {
          fromUserId: existingTask.assignedToUserId,
          toUserId: newAssigneeId,
        },
      })
    }

    if (prevEndYmd !== nextEndYmd || input.reviewDueDate !== currentMeta.reviewDueDate) {
      await appendQaTaskAuditLog({
        taskId,
        actorUserId: actorId,
        actorName,
        actorRole,
        action: "CHANGE_DEADLINE",
        fromStatus: currentMeta.workflowStatus,
        toStatus: nextWorkflowStatus,
        reason: input.changeReason || "Điều chỉnh thời hạn thực hiện / hạn duyệt",
        changes: {
          fromEndDate: prevEndYmd,
          toEndDate: nextEndYmd,
          fromReviewDueDate: currentMeta.reviewDueDate,
          toReviewDueDate: input.reviewDueDate,
        },
      })
    }

    let emailsSentCount = 0
    if (
      newAssigneeId &&
      nextWorkflowStatus !== "DRAFT" &&
      (assigneeChanged || draftPublished || input.sendEmailNotification === true)
    ) {
      const dueStr = new Date(newEndDate).toLocaleDateString("vi-VN")
      if (newAssigneeId !== actorId) {
        await prisma.notification
          .create({
            data: {
              userId: newAssigneeId,
              title: `[Cập nhật phân công & Yêu cầu xác nhận] ${input.title ? input.title.trim() : existingTask.title}`,
              message: `${actorName} đã phân công/cập nhật nhiệm vụ cho bạn (Hạn: ${dueStr}). Vui lòng kiểm tra và xác nhận.`,
              isRead: false,
              link: `/admin/tasks?taskId=${taskId}&action=confirm`,
            },
          })
          .catch(() => {})
      }

      try {
        const mailRes = await sendQaTaskAssignmentEmails({
          taskId,
          title: input.title ? input.title.trim() : existingTask.title,
          description: input.description !== undefined ? input.description : existingTask.description,
          category: input.category ? input.category.trim() : existingTask.category,
          taskGroupName: existingTask.taskGroup?.name || null,
          assignmentMode: input.assignmentMode || currentMeta.assignmentMode,
          priority: (input.priority || existingTask.priority) as any,
          startDate: input.startDate || existingTask.startDate,
          endDate: newEndDate,
          reviewDueDate:
            input.reviewDueDate !== undefined ? input.reviewDueDate : currentMeta.reviewDueDate,
          requiresApproval:
            input.requiresApproval !== undefined
              ? input.requiresApproval
              : currentMeta.requiresApproval,
          deliverables:
            input.deliverables !== undefined ? input.deliverables : currentMeta.deliverables,
          completionCriteria:
            input.completionCriteria !== undefined
              ? input.completionCriteria
              : currentMeta.completionCriteria,
          requiredEvidences:
            input.requiredEvidences !== undefined
              ? input.requiredEvidences
              : currentMeta.requiredEvidences,
          checklist: resolvedChecklist,
          assignerUserId: actorId,
          assignerName: actorName,
          primaryAssigneeId: newAssigneeId,
          collaboratorUserIds: nextCollaboratorIds,
          reviewerUserId:
            input.reviewerUserId !== undefined ? input.reviewerUserId : currentMeta.reviewerUserId,
          isReassignment: assigneeChanged && !draftPublished,
        })
        emailsSentCount = mailRes.sentCount
      } catch (mailErr) {
        console.warn("[updateQaWorkspaceTask] Email dispatch warning:", mailErr)
      }
    }

    revalidatePath("/admin/tasks")
    revalidatePath("/teacher/tasks")
    return { success: true, newVersion: metaRes.newVersion, emailsSentCount }
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi cập nhật nhiệm vụ" }
  }
}

/**
 * Chuyển trạng thái luồng thực hiện và duyệt (Mục V):
 * Nháp → Đã giao → Đang thực hiện → Chờ duyệt → Hoàn thành
 * Hỗ trợ: Cần bổ sung → sửa và gửi lại; Tạm dừng, hủy, mở lại kèm lý do;
 * Chống cập nhật đè bằng expectedVersion.
 */
export async function transitionTaskWorkflow(
  taskId: string,
  payload: {
    toStatus: QaWorkflowStatus
    reason?: string
    resultSummary?: string
    evidenceLinks?: QaEvidenceLink[]
    reviewComment?: string
    reviewRating?: QaReviewRating
    expectedVersion?: number
  }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" }
    await ensureQaWorkspaceSchema()

    const actorId = String(session.user.id)
    const actorName = String(
      (session.user as any).fullName || (session.user as any).name || session.user.email || "Nhân sự"
    )
    const actorRole = String((session.user as any).role || "STAFF")
    const opScope = await getOperationalScope()

    const task = await prisma.workTask.findUnique({
      where: { id: taskId },
      include: {
        taskGroup: { select: { leaderUserId: true, name: true, memberUserIds: true } },
      },
    })
    if (!task) return { success: false, error: "Không tìm thấy nhiệm vụ" }

    const metaMap = await getQaMetadataMapForTasks([task])
    const currentMeta = metaMap.get(taskId)!
    const fromStatus = currentMeta.workflowStatus
    const toStatus = payload.toStatus

    let groupMemberIds: string[] = []
    if (task.taskGroup?.memberUserIds) {
      try {
        const parsed = JSON.parse(task.taskGroup.memberUserIds)
        if (Array.isArray(parsed)) groupMemberIds = parsed.filter(Boolean)
      } catch {}
    }

    const isReviewerOrManager =
      opScope.isManager ||
      actorRole === "ADMIN" ||
      actorRole === "SUPERADMIN" ||
      task.assignedById === actorId ||
      currentMeta.reviewerUserId === actorId ||
      currentMeta.coordinatorUserId === actorId ||
      task.taskGroup?.leaderUserId === actorId

    const isAssigneeOrCollaborator =
      task.assignedToUserId === actorId ||
      (currentMeta.collaboratorUserIds || []).includes(actorId) ||
      groupMemberIds.includes(actorId)

    if (!isReviewerOrManager && !isAssigneeOrCollaborator) {
      return { success: false, error: "Bạn không có quyền xử lý nhiệm vụ này." }
    }

    const validation = validateWorkflowTransition(fromStatus, toStatus, {
      requiresApproval: currentMeta.requiresApproval,
      isReviewerOrManager,
      reason: payload.reason || payload.reviewComment,
    })
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    const nowIso = new Date().toISOString()
    const wasWaitingConfirmation = task.acceptanceStatus === "WAITING_CONFIRMATION"

    // Đồng bộ trạng thái sang WorkTask.progress & WorkTask.acceptanceStatus để tương thích 100% dữ liệu cũ
    let mappedProgress = task.progress
    let mappedAcceptance = task.acceptanceStatus
    let completedAt: Date | null = task.completedAt

    if (toStatus === "DRAFT" || toStatus === "ASSIGNED") {
      mappedProgress = "PENDING"
    } else if (toStatus === "IN_PROGRESS") {
      mappedProgress = "IN_PROGRESS"
      mappedAcceptance = "ACCEPTED"
      if (fromStatus === "COMPLETED") completedAt = null
    } else if (toStatus === "PENDING_REVIEW") {
      // Đã gửi duyệt KHÔNG đồng nghĩa đã hoàn thành! Giữ progress = IN_PROGRESS trên bảng cũ
      mappedProgress = "IN_PROGRESS"
      mappedAcceptance = "ACCEPTED"
    } else if (toStatus === "NEEDS_REVISION") {
      mappedProgress = "IN_PROGRESS"
      mappedAcceptance = "ACCEPTED"
      completedAt = null
    } else if (toStatus === "COMPLETED") {
      mappedProgress = "COMPLETED"
      mappedAcceptance = "ACCEPTED"
      completedAt = new Date()
    } else if (toStatus === "CANCELLED") {
      mappedProgress = "CANCELLED"
    }

    const metaUpdate: Partial<typeof currentMeta> & { taskId: string } = {
      taskId,
      workflowStatus: toStatus,
      statusReason: payload.reason || currentMeta.statusReason,
    }

    if (payload.resultSummary !== undefined) {
      metaUpdate.resultSummary = payload.resultSummary
    }
    if (payload.evidenceLinks !== undefined) {
      metaUpdate.evidenceLinks = payload.evidenceLinks.map((item: any, idx: number) =>
        typeof item === "string"
          ? { id: `ev_${idx + 1}`, title: item, label: item, url: item, uploadedAt: nowIso }
          : item
      )
    }
    if (toStatus === "IN_PROGRESS") {
      metaUpdate.currentStepLabel = "Đang triển khai thực hiện"
      metaUpdate.nextStepLabel = currentMeta.requiresApproval
        ? "Nộp sản phẩm & Gửi duyệt kết quả"
        : "Xác nhận hoàn thành tiến độ"
    }
    if (toStatus === "PENDING_REVIEW") {
      metaUpdate.submittedForReviewAt = nowIso
      metaUpdate.currentStepLabel = "Đang chờ người duyệt nghiệm thu"
      metaUpdate.nextStepLabel = "Phê duyệt hoàn thành hoặc phản hồi bổ sung"
    }
    if (toStatus === "NEEDS_REVISION") {
      metaUpdate.reviewedAt = nowIso
      metaUpdate.reviewComment = payload.reviewComment || payload.reason || null
      metaUpdate.reviewRating = "CAN_BO_SUNG"
      metaUpdate.currentStepLabel = "Cần bổ sung theo yêu cầu người duyệt"
      metaUpdate.nextStepLabel = "Hoàn thiện bổ sung và gửi duyệt lại"
    }
    if (toStatus === "COMPLETED") {
      metaUpdate.reviewedAt = nowIso
      if (payload.reviewComment !== undefined) metaUpdate.reviewComment = payload.reviewComment
      if (payload.reviewRating !== undefined) metaUpdate.reviewRating = payload.reviewRating
      metaUpdate.currentStepLabel = "Đã hoàn thành nghiệm thu"
      metaUpdate.nextStepLabel = null
    }

    const upsertRes = await upsertQaTaskMetadata(metaUpdate, {
      expectedVersion: payload.expectedVersion,
    })
    if (!upsertRes.success) {
      return {
        success: false,
        conflict: upsertRes.conflict,
        error: upsertRes.error,
      }
    }

    await prisma.workTask.update({
      where: { id: taskId },
      data: {
        progress: mappedProgress,
        acceptanceStatus: mappedAcceptance,
        acceptedAt:
          (toStatus === "IN_PROGRESS" || toStatus === "PENDING_REVIEW" || toStatus === "COMPLETED") &&
          !task.acceptedAt
            ? new Date()
            : task.acceptedAt,
        completedAt,
        staffNote: payload.resultSummary || task.staffNote,
        staffUpdatedAt: new Date(),
      },
    })

    const actionCode =
      toStatus === "PENDING_REVIEW"
        ? "SUBMIT_REVIEW"
        : toStatus === "COMPLETED"
        ? "APPROVE"
        : toStatus === "NEEDS_REVISION"
        ? "REQUEST_REVISION"
        : toStatus === "PAUSED"
        ? "PAUSE"
        : toStatus === "CANCELLED"
        ? "CANCEL"
        : fromStatus === "COMPLETED" || fromStatus === "CANCELLED" || fromStatus === "PAUSED"
        ? "REOPEN"
        : "TRANSITION"

    await appendQaTaskAuditLog({
      taskId,
      actorUserId: actorId,
      actorName,
      actorRole,
      action: actionCode,
      fromStatus,
      toStatus,
      reason: payload.reason || payload.reviewComment || null,
      changes: {
        reviewRating: payload.reviewRating || null,
        resultSummary: payload.resultSummary ? payload.resultSummary.slice(0, 120) : undefined,
      },
    })

    // 1. Thông báo In-App đến đúng đối tượng liên quan
    const managerTargets = Array.from(
      new Set(
        [currentMeta.reviewerUserId, task.assignedById, currentMeta.coordinatorUserId].filter(
          (id): id is string => Boolean(id && id !== actorId)
        )
      )
    )
    const memberTargets = Array.from(
      new Set(
        [task.assignedToUserId, ...(currentMeta.collaboratorUserIds || [])].filter(
          (id): id is string => Boolean(id && id !== actorId)
        )
      )
    )

    if (toStatus === "PENDING_REVIEW") {
      for (const mId of managerTargets) {
        await prisma.notification
          .create({
            data: {
              userId: mId,
              title: `[Chờ duyệt hoàn thành] ${task.title}`,
              message: `${actorName} đã nộp báo cáo kết quả và minh chứng nhiệm vụ "${task.title}". Vui lòng kiểm tra và nghiệm thu.`,
              isRead: false,
              link: `/admin/tasks?taskId=${task.id}&tab=review`,
            },
          })
          .catch(() => {})
      }
    } else if (toStatus === "NEEDS_REVISION") {
      for (const uId of memberTargets) {
        await prisma.notification
          .create({
            data: {
              userId: uId,
              title: `[Cần bổ sung kết quả] ${task.title}`,
              message: `${actorName} yêu cầu bổ sung kết quả nhiệm vụ "${task.title}": ${payload.reviewComment || payload.reason || ""}`,
              isRead: false,
              link: `/admin/tasks?taskId=${task.id}&tab=review`,
            },
          })
          .catch(() => {})
      }
    } else if (toStatus === "COMPLETED") {
      const completeNotifyTargets = Array.from(new Set([...memberTargets, ...managerTargets]))
      for (const uId of completeNotifyTargets) {
        await prisma.notification
          .create({
            data: {
              userId: uId,
              title: `[Đã xác nhận hoàn thành] ${task.title}`,
              message: `${actorName} đã xác nhận hoàn thành nhiệm vụ "${task.title}".`,
              isRead: false,
              link: `/admin/tasks?taskId=${task.id}&tab=review`,
            },
          })
          .catch(() => {})
      }
    } else if (fromStatus === "ASSIGNED" && toStatus === "IN_PROGRESS" && wasWaitingConfirmation) {
      for (const mId of managerTargets) {
        await prisma.notification
          .create({
            data: {
              userId: mId,
              title: `[Đã xác nhận nhận việc] ${task.title}`,
              message: `${actorName} đã xác nhận tiếp nhận và bắt đầu thực hiện nhiệm vụ "${task.title}".`,
              isRead: false,
              link: `/admin/tasks?taskId=${task.id}`,
            },
          })
          .catch(() => {})
      }
    }

    // 2. Gửi Email đồng bộ theo từng bước chuyển trạng thái
    let emailsSentCount = 0
    try {
      if (fromStatus === "DRAFT" && toStatus === "ASSIGNED" && task.assignedToUserId) {
        const assignRes = await sendQaTaskAssignmentEmails({
          taskId: task.id,
          title: task.title,
          description: task.description,
          category: task.category,
          taskGroupName: task.taskGroup?.name || null,
          assignmentMode: currentMeta.assignmentMode,
          priority: task.priority || "MEDIUM",
          startDate: task.startDate,
          endDate: task.endDate,
          reviewDueDate: currentMeta.reviewDueDate,
          requiresApproval: currentMeta.requiresApproval,
          deliverables: currentMeta.deliverables,
          completionCriteria: currentMeta.completionCriteria,
          requiredEvidences: currentMeta.requiredEvidences,
          checklist: currentMeta.checklist,
          assignerUserId: task.assignedById,
          assignerName: actorName,
          primaryAssigneeId: task.assignedToUserId,
          collaboratorUserIds: currentMeta.collaboratorUserIds || [],
          groupMemberUserIds: groupMemberIds,
          reviewerUserId: currentMeta.reviewerUserId,
        })
        emailsSentCount += assignRes.sentCount
      } else if (fromStatus === "ASSIGNED" && toStatus === "IN_PROGRESS" && wasWaitingConfirmation) {
        const confRes = await sendQaTaskConfirmationFeedbackEmail({
          taskId: task.id,
          taskTitle: task.title,
          category: task.category,
          endDate: task.endDate,
          actorUserId: actorId,
          actorName,
          accepted: true,
          assignerUserId: task.assignedById,
          coordinatorUserId: currentMeta.coordinatorUserId,
          reviewerUserId: currentMeta.reviewerUserId,
        })
        emailsSentCount += confRes.sentCount
      } else {
        const clStats = computeChecklistMetrics(currentMeta.checklist || [])
        const wfMailRes = await sendQaWorkflowTransitionEmails({
          taskId: task.id,
          taskTitle: task.title,
          category: task.category,
          endDate: task.endDate,
          reviewDueDate: currentMeta.reviewDueDate,
          fromStatus,
          toStatus,
          actorUserId: actorId,
          actorName,
          assignerUserId: task.assignedById,
          primaryAssigneeId: task.assignedToUserId,
          coordinatorUserId: currentMeta.coordinatorUserId,
          reviewerUserId: currentMeta.reviewerUserId,
          collaboratorUserIds: currentMeta.collaboratorUserIds || [],
          resultSummary: payload.resultSummary ?? currentMeta.resultSummary,
          evidenceLinks: (payload.evidenceLinks ?? currentMeta.evidenceLinks) as any,
          reviewComment: payload.reviewComment ?? currentMeta.reviewComment,
          reviewRating: payload.reviewRating ?? currentMeta.reviewRating,
          reason: payload.reason,
          checklistCompleted: clStats.completedSteps,
          checklistTotal: clStats.totalSteps,
        })
        emailsSentCount += wfMailRes.sentCount
      }
    } catch (mailErr) {
      console.warn("[transitionTaskWorkflow] Email dispatch warning:", mailErr)
    }

    revalidatePath("/admin/tasks")
    revalidatePath("/teacher/tasks")
    return {
      success: true,
      workflowStatus: toStatus,
      newVersion: upsertRes.newVersion,
      emailsSentCount,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi chuyển trạng thái nhiệm vụ" }
  }
}

/**
 * Xác nhận tiếp nhận nhiệm vụ & bắt đầu triển khai (Hợp nhất WorkTask + QA Governance + Báo Email cho Người giao)
 */
export async function confirmAndAcceptQaTask(taskId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" }
    await ensureQaWorkspaceSchema()

    const actorId = String(session.user.id)
    const actorName = String(
      (session.user as any).fullName || (session.user as any).name || session.user.email || "Nhân sự"
    )
    const actorRole = String((session.user as any).role || "STAFF")
    const opScope = await getOperationalScope()

    const task = await prisma.workTask.findUnique({
      where: { id: taskId },
      include: { taskGroup: { select: { leaderUserId: true, memberUserIds: true } } },
    })
    if (!task) return { success: false, error: "Không tìm thấy nhiệm vụ" }

    const metaMap = await getQaMetadataMapForTasks([task])
    const currentMeta = metaMap.get(taskId)!

    let groupMemberIds: string[] = []
    if (task.taskGroup?.memberUserIds) {
      try {
        const parsed = JSON.parse(task.taskGroup.memberUserIds)
        if (Array.isArray(parsed)) groupMemberIds = parsed.filter(Boolean)
      } catch {}
    }

    const isAuthorized =
      !task.assignedToUserId ||
      task.assignedToUserId === actorId ||
      task.assignedById === actorId ||
      (currentMeta.collaboratorUserIds || []).includes(actorId) ||
      groupMemberIds.includes(actorId) ||
      opScope.isManager ||
      actorRole === "ADMIN" ||
      actorRole === "SUPERADMIN"

    if (!isAuthorized) {
      return { success: false, error: "Bạn không có quyền xác nhận nhiệm vụ này." }
    }

    const nextWf: QaWorkflowStatus =
      currentMeta.workflowStatus === "ASSIGNED" || currentMeta.workflowStatus === "DRAFT"
        ? "IN_PROGRESS"
        : currentMeta.workflowStatus

    const metaRes = await upsertQaTaskMetadata({
      taskId,
      workflowStatus: nextWf,
      currentStepLabel: "Đã xác nhận nhận việc — Đang triển khai",
      nextStepLabel: currentMeta.requiresApproval
        ? "Thực hiện & Gửi duyệt kết quả"
        : "Thực hiện & Xác nhận hoàn thành",
    })

    await prisma.workTask.update({
      where: { id: taskId },
      data: {
        acceptanceStatus: "ACCEPTED",
        acceptedAt: new Date(),
        rejectionReason: null,
        progress: task.progress === "PENDING" ? "IN_PROGRESS" : task.progress,
      },
    })

    await appendQaTaskAuditLog({
      taskId,
      actorUserId: actorId,
      actorName,
      actorRole,
      action: "CONFIRM_ACCEPTANCE",
      fromStatus: currentMeta.workflowStatus,
      toStatus: nextWf,
      reason: "Thành viên xác nhận tiếp nhận công việc và bắt đầu triển khai",
    })

    const notifyTargets = Array.from(
      new Set(
        [task.assignedById, currentMeta.coordinatorUserId, currentMeta.reviewerUserId].filter(
          (id): id is string => Boolean(id && id !== actorId)
        )
      )
    )
    for (const uid of notifyTargets) {
      await prisma.notification
        .create({
          data: {
            userId: uid,
            title: `[Đã xác nhận nhận việc] ${task.title}`,
            message: `${actorName} đã xác nhận tiếp nhận nhiệm vụ "${task.title}" và bắt đầu thực hiện.`,
            isRead: false,
            link: `/admin/tasks?taskId=${task.id}`,
          },
        })
        .catch(() => {})
    }

    let emailsSentCount = 0
    try {
      const mailRes = await sendQaTaskConfirmationFeedbackEmail({
        taskId: task.id,
        taskTitle: task.title,
        category: task.category,
        endDate: task.endDate,
        actorUserId: actorId,
        actorName,
        accepted: true,
        assignerUserId: task.assignedById,
        coordinatorUserId: currentMeta.coordinatorUserId,
        reviewerUserId: currentMeta.reviewerUserId,
      })
      emailsSentCount = mailRes.sentCount
    } catch (mailErr) {
      console.warn("[confirmAndAcceptQaTask] Email warning:", mailErr)
    }

    revalidatePath("/admin/tasks")
    revalidatePath("/teacher/tasks")
    return {
      success: true,
      workflowStatus: nextWf,
      newVersion: metaRes.newVersion,
      emailsSentCount,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi xác nhận nhận việc" }
  }
}

/**
 * Gửi phản hồi / Đề xuất điều chỉnh khi nhận việc (Lưu lịch sử + Báo Email ngay cho Người giao)
 */
export async function rejectOrFeedbackQaTask(taskId: string, reason: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" }
    if (!reason || !reason.trim()) {
      return { success: false, error: "Vui lòng nhập rõ lý do hoặc nội dung đề xuất điều chỉnh." }
    }
    await ensureQaWorkspaceSchema()

    const actorId = String(session.user.id)
    const actorName = String(
      (session.user as any).fullName || (session.user as any).name || session.user.email || "Nhân sự"
    )
    const actorRole = String((session.user as any).role || "STAFF")
    const opScope = await getOperationalScope()

    const task = await prisma.workTask.findUnique({ where: { id: taskId } })
    if (!task) return { success: false, error: "Không tìm thấy nhiệm vụ" }

    const metaMap = await getQaMetadataMapForTasks([task])
    const currentMeta = metaMap.get(taskId)!

    const isAuthorized =
      !task.assignedToUserId ||
      task.assignedToUserId === actorId ||
      task.assignedById === actorId ||
      (currentMeta.collaboratorUserIds || []).includes(actorId) ||
      opScope.isManager ||
      actorRole === "ADMIN" ||
      actorRole === "SUPERADMIN"

    if (!isAuthorized) {
      return { success: false, error: "Bạn không có quyền gửi phản hồi cho nhiệm vụ này." }
    }

    await prisma.workTask.update({
      where: { id: taskId },
      data: {
        acceptanceStatus: "REJECTED",
        rejectionReason: reason.trim(),
        staffNote: `Phản hồi nhận việc: ${reason.trim()}`,
        staffUpdatedAt: new Date(),
      },
    })

    await upsertQaTaskMetadata({
      taskId,
      statusReason: reason.trim(),
      currentStepLabel: "Thành viên gửi phản hồi đề xuất điều chỉnh",
    })

    await appendQaTaskAuditLog({
      taskId,
      actorUserId: actorId,
      actorName,
      actorRole,
      action: "FEEDBACK_ASSIGNMENT",
      fromStatus: currentMeta.workflowStatus,
      toStatus: currentMeta.workflowStatus,
      reason: reason.trim(),
    })

    const notifyTargets = Array.from(
      new Set(
        [task.assignedById, currentMeta.coordinatorUserId, currentMeta.reviewerUserId].filter(
          (id): id is string => Boolean(id && id !== actorId)
        )
      )
    )
    for (const uid of notifyTargets) {
      await prisma.notification
        .create({
          data: {
            userId: uid,
            title: `[Phản hồi nhận việc] ${task.title}`,
            message: `${actorName} gửi phản hồi về nhiệm vụ "${task.title}": ${reason.trim()}`,
            isRead: false,
            link: `/admin/tasks?taskId=${task.id}`,
          },
        })
        .catch(() => {})
    }

    let emailsSentCount = 0
    try {
      const mailRes = await sendQaTaskConfirmationFeedbackEmail({
        taskId: task.id,
        taskTitle: task.title,
        category: task.category,
        endDate: task.endDate,
        actorUserId: actorId,
        actorName,
        accepted: false,
        reason: reason.trim(),
        assignerUserId: task.assignedById,
        coordinatorUserId: currentMeta.coordinatorUserId,
        reviewerUserId: currentMeta.reviewerUserId,
      })
      emailsSentCount = mailRes.sentCount
    } catch (mailErr) {
      console.warn("[rejectOrFeedbackQaTask] Email warning:", mailErr)
    }

    revalidatePath("/admin/tasks")
    revalidatePath("/teacher/tasks")
    return { success: true, emailsSentCount }
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi gửi phản hồi nhận việc" }
  }
}

/**
 * Gửi lại Email thông báo giao việc & yêu cầu xác nhận đến tất cả thành viên liên quan của nhiệm vụ
 */
export async function resendQaTaskAssignmentEmail(taskId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" }
    await ensureQaWorkspaceSchema()

    const actorId = String(session.user.id)
    const actorName = String(
      (session.user as any).fullName || (session.user as any).name || session.user.email || "Quản lý"
    )
    const actorRole = String((session.user as any).role || "ADMIN")

    const task = await prisma.workTask.findUnique({
      where: { id: taskId },
      include: {
        assignedBy: { select: { fullName: true } },
        taskGroup: { select: { name: true, memberUserIds: true } },
      },
    })
    if (!task) return { success: false, error: "Không tìm thấy nhiệm vụ" }
    if (!task.assignedToUserId) {
      return { success: false, error: "Nhiệm vụ chưa có người chịu trách nhiệm chính để gửi email." }
    }

    const metaMap = await getQaMetadataMapForTasks([task])
    const currentMeta = metaMap.get(taskId)!

    let groupMemberIds: string[] = []
    if (task.taskGroup?.memberUserIds) {
      try {
        const parsed = JSON.parse(task.taskGroup.memberUserIds)
        if (Array.isArray(parsed)) groupMemberIds = parsed.filter(Boolean)
      } catch {}
    }

    const mailRes = await sendQaTaskAssignmentEmails({
      taskId: task.id,
      title: task.title,
      description: task.description,
      category: task.category,
      taskGroupName: task.taskGroup?.name || null,
      assignmentMode: currentMeta.assignmentMode,
      priority: task.priority || "MEDIUM",
      startDate: task.startDate,
      endDate: task.endDate,
      reviewDueDate: currentMeta.reviewDueDate,
      requiresApproval: currentMeta.requiresApproval,
      deliverables: currentMeta.deliverables,
      completionCriteria: currentMeta.completionCriteria,
      requiredEvidences: currentMeta.requiredEvidences,
      checklist: currentMeta.checklist,
      assignerUserId: task.assignedById,
      assignerName: task.assignedBy?.fullName || actorName,
      primaryAssigneeId: task.assignedToUserId,
      collaboratorUserIds: currentMeta.collaboratorUserIds || [],
      groupMemberUserIds: currentMeta.assignmentMode === "GROUP" ? groupMemberIds : [],
      reviewerUserId: currentMeta.reviewerUserId,
    })

    await appendQaTaskAuditLog({
      taskId,
      actorUserId: actorId,
      actorName,
      actorRole,
      action: "SEND_EMAIL_NOTIFICATION",
      fromStatus: currentMeta.workflowStatus,
      toStatus: currentMeta.workflowStatus,
      reason: `Gửi thông báo email phiếu giao việc (${mailRes.sentCount} người nhận)`,
      changes: { recipients: mailRes.recipients },
    })

    revalidatePath("/admin/tasks")
    return {
      success: true,
      sentCount: mailRes.sentCount,
      failedCount: mailRes.failedCount,
      recipients: mailRes.recipients,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi gửi email thông báo nhiệm vụ" }
  }
}

/**
 * Đánh dấu hoàn thành / mở lại từng bước công việc con (Checklist) có kiểm tra phụ thuộc bước (dependsOnStepId)
 * Tiến độ checklist hoàn toàn tách biệt với đánh giá chất lượng kết quả của người duyệt.
 */
export async function toggleTaskChecklistStep(
  taskId: string,
  stepId: string,
  completed: boolean,
  expectedVersion?: number
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" }
    await ensureQaWorkspaceSchema()

    const actorId = String(session.user.id)
    const actorName = String(
      (session.user as any).fullName || (session.user as any).name || session.user.email || "Nhân sự"
    )

    const task = await prisma.workTask.findUnique({ where: { id: taskId } })
    if (!task) return { success: false, error: "Không tìm thấy nhiệm vụ" }

    const metaMap = await getQaMetadataMapForTasks([task])
    const currentMeta = metaMap.get(taskId)!
    const checklist = [...(currentMeta.checklist || [])]

    if (completed) {
      const depCheck = canCompleteChecklistStep(stepId, checklist)
      if (!depCheck.allowed) {
        return {
          success: false,
          error: `Chưa thể hoàn thành bước này vì bước phụ thuộc trước đó ("${depCheck.blockerStepTitle}") chưa hoàn thành.`,
        }
      }
    }

    const updatedChecklist = checklist.map((s) =>
      s.id === stepId
        ? {
            ...s,
            completed,
            completedAt: completed ? new Date().toISOString() : null,
          }
        : s
    )

    const metrics = computeChecklistMetrics(updatedChecklist)
    const res = await upsertQaTaskMetadata(
      {
        taskId,
        checklist: updatedChecklist,
        currentStepLabel: metrics.currentStep?.title || "Đã hoàn tất các bước checklist",
        nextStepLabel:
          metrics.nextStep?.title ||
          (currentMeta.requiresApproval ? "Gửi duyệt nghiệm thu" : "Hoàn thành nhiệm vụ"),
      },
      { expectedVersion }
    )

    if (!res.success) {
      return { success: false, conflict: res.conflict, error: res.error }
    }

    await appendQaTaskAuditLog({
      taskId,
      actorUserId: actorId,
      actorName,
      action: "UPDATE_CHECKLIST",
      fromStatus: currentMeta.workflowStatus,
      toStatus: currentMeta.workflowStatus,
      reason: `${completed ? "Hoàn thành" : "Mở lại"} bước công việc con (${metrics.completedSteps}/${metrics.totalSteps})`,
    })

    revalidatePath("/admin/tasks")
    return {
      success: true,
      checklist: updatedChecklist,
      metrics,
      newVersion: res.newVersion,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi cập nhật checklist" }
  }
}

/**
 * Lấy lịch sử xử lý (Audit Log) và metadata mới nhất của nhiệm vụ
 */
export async function getTaskFullGovernanceDetails(taskId: string) {
  try {
    await ensureQaWorkspaceSchema()
    const task = await prisma.workTask.findUnique({ where: { id: taskId } })
    if (!task) return { success: false, error: "Không tìm thấy nhiệm vụ" }

    const [metaMap, auditLogs] = await Promise.all([
      getQaMetadataMapForTasks([task]),
      getQaTaskAuditLogs(taskId),
    ])

    const qaMeta = metaMap.get(taskId) || null
    const deadlineInfo = qaMeta
      ? computeTaskDeadlineStatus({
          workflowStatus: qaMeta.workflowStatus,
          endDate: task.endDate,
          reviewDueDate: qaMeta.reviewDueDate,
          completedAt: task.completedAt,
          submittedForReviewAt: qaMeta.submittedForReviewAt,
          checklist: qaMeta.checklist,
        })
      : null
    const checklistStats = computeChecklistMetrics(qaMeta?.checklist || [])

    return {
      success: true,
      qaMeta,
      metadata: qaMeta,
      deadlineInfo,
      checklistStats,
      auditLogs,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message,
      qaMeta: null,
      metadata: null,
      deadlineInfo: null,
      checklistStats: computeChecklistMetrics([]),
      auditLogs: [],
    }
  }
}

/**
 * Phát hành tự động các việc định kỳ (Tuần/Tháng) theo quy tắc đã được phê duyệt,
 * chống sinh trùng tuyệt đối bằng recurrenceInstanceKey.
 */
export async function triggerApprovedRecurringTasks() {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" }
    await ensureQaWorkspaceSchema()

    const pAny = prisma as any
    if (typeof pAny.$queryRawUnsafe !== "function") {
      return { success: true, generatedCount: 0, spawnedCount: 0, skippedCount: 0 }
    }

    const rows: any[] = await pAny.$queryRawUnsafe(
      `SELECT ${QA_META_SELECT_COLUMNS} FROM "qa_task_metadata" WHERE "assignmentMode" = 'RECURRING' AND "recurrenceRuleJson" IS NOT NULL`
    )

    let generatedCount = 0
    let skippedCount = 0
    const now = new Date()

    for (const r of rows || []) {
      let rule: QaRecurrenceRule | null = null
      try {
        rule = JSON.parse(r.recurrenceRuleJson)
      } catch {}
      const isApprovedRule =
        rule &&
        rule.isActive !== false &&
        (rule.autoPublish === true || rule.approvedForAutoRelease === true)
      if (!isApprovedRule || !rule) continue

      const templateTask = await prisma.workTask.findUnique({
        where: { id: String(r.taskId) },
        include: {
          assignedBy: { select: { fullName: true } },
          taskGroup: { select: { name: true } },
        },
      })
      if (!templateTask || !templateTask.assignedToUserId) continue

      const tplKey = `${templateTask.title.trim().toLowerCase().slice(0, 40)}_${templateTask.assignedToUserId}`
      const periodInstanceKey = buildRecurrenceInstanceKey(tplKey, rule, now)

      const existingInst: any[] = await pAny.$queryRawUnsafe(
        `SELECT "taskId" FROM "qa_task_metadata" WHERE "recurrenceInstanceKey" = ? LIMIT 1`,
        periodInstanceKey
      )
      if (existingInst && existingInst.length > 0) {
        skippedCount++
        continue // Đã phát hành kỳ này, chống sinh trùng!
      }

      const durationMs = Math.max(
        24 * 3600 * 1000,
        new Date(templateTask.endDate).getTime() - new Date(templateTask.startDate).getTime()
      )
      const newStart = now
      const newEnd = new Date(now.getTime() + durationMs)

      const newTask = await prisma.workTask.create({
        data: {
          category: templateTask.category,
          title: templateTask.title,
          description: templateTask.description,
          assignedToRole: templateTask.assignedToRole,
          assignedToUserId: templateTask.assignedToUserId,
          assignedById: templateTask.assignedById,
          startDate: newStart,
          endDate: newEnd,
          progress: "PENDING",
          acceptanceStatus: "WAITING_CONFIRMATION",
          month: newEnd.getMonth() + 1,
          academicYearId: templateTask.academicYearId,
          isImportant: templateTask.isImportant,
          collaborators: templateTask.collaborators,
          taskGroupId: templateTask.taskGroupId,
          department: templateTask.department,
          priority: templateTask.priority,
        },
      })

      let colIds: string[] = []
      try {
        if (r.collaboratorUserIdsJson) colIds = JSON.parse(r.collaboratorUserIdsJson)
      } catch {}

      await upsertQaTaskMetadata({
        taskId: newTask.id,
        workflowStatus: "ASSIGNED",
        assignmentMode: "RECURRING",
        workspaceCardKey: r.workspaceCardKey,
        coordinatorUserId: r.coordinatorUserId,
        reviewerUserId: r.reviewerUserId,
        collaboratorUserIds: colIds,
        requiresApproval: Boolean(Number(r.requiresApproval)),
        deliverables: r.deliverables,
        completionCriteria: r.completionCriteria,
        requiredEvidences: r.requiredEvidences,
        recurrenceRule: rule,
        recurrenceTemplateId: templateTask.id,
        recurrenceInstanceKey: periodInstanceKey,
        version: 1,
      })

      await prisma.notification
        .create({
          data: {
            userId: templateTask.assignedToUserId,
            title: `[Nhiệm vụ định kỳ — Yêu cầu xác nhận] ${newTask.title}`,
            message: `Hệ thống đã phát hành nhiệm vụ định kỳ mới (Hạn: ${newEnd.toLocaleDateString("vi-VN")}). Vui lòng xác nhận tiếp nhận.`,
            isRead: false,
            link: `/admin/tasks?taskId=${newTask.id}&action=confirm`,
          },
        })
        .catch(() => {})

      await sendQaTaskAssignmentEmails({
        taskId: newTask.id,
        title: newTask.title,
        description: newTask.description,
        category: newTask.category,
        taskGroupName: templateTask.taskGroup?.name || null,
        assignmentMode: "RECURRING",
        priority: newTask.priority || "MEDIUM",
        startDate: newStart,
        endDate: newEnd,
        requiresApproval: Boolean(Number(r.requiresApproval)),
        deliverables: r.deliverables,
        completionCriteria: r.completionCriteria,
        requiredEvidences: r.requiredEvidences,
        assignerUserId: templateTask.assignedById,
        assignerName: templateTask.assignedBy?.fullName || "Ban KT&ĐBCL",
        primaryAssigneeId: templateTask.assignedToUserId,
        collaboratorUserIds: colIds,
        reviewerUserId: r.reviewerUserId,
      }).catch(() => {})

      generatedCount++
    }

    if (generatedCount > 0) revalidatePath("/admin/tasks")
    return {
      success: true,
      generatedCount,
      spawnedCount: generatedCount,
      skippedCount,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message,
      generatedCount: 0,
      spawnedCount: 0,
      skippedCount: 0,
    }
  }
}

/**
 * Hệ thống nhắc việc thông minh theo 6 trạng thái (Mục VII):
 * 1. Chưa bắt đầu (NOT_STARTED)
 * 2. Sắp đến hạn (DUE_SOON)
 * 3. Quá hạn thực hiện / Quá hạn duyệt (OVERDUE_EXECUTION / OVERDUE_REVIEW)
 * 4. Chờ duyệt (PENDING_REVIEW -> nhắc Người duyệt)
 * 5. Cần bổ sung (NEEDS_REVISION -> nhắc Người thực hiện)
 * 6. Vướng mắc chưa được phản hồi (UNRESOLVED_BLOCKER -> nhắc Người điều phối / Người duyệt)
 * Gộp thông báo phù hợp, chống gửi trùng trong ngày (dedupKey) và lưu lịch sử.
 */
export async function dispatchSmartQaReminders(options?: {
  enabledTypes?: string[]
  taskGroupId?: string
}) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" }
    await ensureQaWorkspaceSchema()

    const enabled = new Set(
      options?.enabledTypes || [
        "NOT_STARTED",
        "DUE_SOON",
        "OVERDUE_EXECUTION",
        "OVERDUE_REVIEW",
        "PENDING_REVIEW",
        "NEEDS_REVISION",
        "UNRESOLVED_BLOCKER",
      ]
    )

    const tasks = await prisma.workTask.findMany({
      where: options?.taskGroupId && options.taskGroupId !== "ALL" ? { taskGroupId: options.taskGroupId } : {},
      include: {
        assignedToUser: { select: { id: true, fullName: true } },
        assignedBy: { select: { id: true, fullName: true } },
        taskGroup: { select: { id: true, name: true, leaderUserId: true } },
        comments: { select: { id: true, commentType: true, actionStatus: true, actionAssigneeId: true, content: true } },
      },
    })

    const metaMap = await getQaMetadataMapForTasks(tasks)
    const now = new Date()
    const todayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now)

    // Gộp thông báo theo người nhận để chống spam
    const digestByRecipient = new Map<
      string,
      Array<{
        taskId: string
        taskTitle: string
        reminderType: any
        roleType: "ASSIGNEE" | "COORDINATOR" | "REVIEWER"
        detail: string
        dedupKey: string
      }>
    >()

    const queueReminder = (
      recipientUserId: string | null | undefined,
      item: {
        taskId: string
        taskTitle: string
        reminderType: any
        roleType: "ASSIGNEE" | "COORDINATOR" | "REVIEWER"
        detail: string
      }
    ) => {
      if (!recipientUserId || !enabled.has(item.reminderType)) return
      const dedupKey = `REM:${item.reminderType}:${item.taskId}:${recipientUserId}:${todayKey}`
      if (!digestByRecipient.has(recipientUserId)) {
        digestByRecipient.set(recipientUserId, [])
      }
      digestByRecipient.get(recipientUserId)!.push({ ...item, dedupKey })
    }

    for (const t of tasks) {
      const meta = metaMap.get(t.id)!
      const wf = meta.workflowStatus
      if (wf === "COMPLETED" || wf === "CANCELLED" || wf === "PAUSED" || wf === "DRAFT") continue

      const dl = computeTaskDeadlineStatus(
        {
          endDate: t.endDate,
          completedAt: t.completedAt,
          workflowStatus: wf,
          reviewDueDate: meta.reviewDueDate,
          submittedForReviewAt: meta.submittedForReviewAt,
          checklist: meta.checklist,
        },
        now
      )

      const assigneeId = t.assignedToUserId || meta.coordinatorUserId || t.taskGroup?.leaderUserId
      const reviewerId = meta.reviewerUserId || t.assignedById
      const coordinatorId = meta.coordinatorUserId || t.taskGroup?.leaderUserId || t.assignedById

      // 1. Chưa bắt đầu
      if (wf === "ASSIGNED" && t.acceptanceStatus === "WAITING_CONFIRMATION") {
        queueReminder(assigneeId, {
          taskId: t.id,
          taskTitle: t.title,
          reminderType: "NOT_STARTED",
          roleType: "ASSIGNEE",
          detail: `Chưa xác nhận bắt đầu thực hiện (Hạn: ${new Date(t.endDate).toLocaleDateString("vi-VN")})`,
        })
      }

      // 2. Sắp đến hạn
      if (dl.isDueSoon && wf !== "PENDING_REVIEW") {
        queueReminder(assigneeId, {
          taskId: t.id,
          taskTitle: t.title,
          reminderType: "DUE_SOON",
          roleType: "ASSIGNEE",
          detail: `Sắp đến hạn thực hiện (${dl.hoursRemaining ?? 24}h còn lại)`,
        })
      }

      // 3a. Quá hạn thực hiện
      if (dl.isOverdueExecution) {
        queueReminder(assigneeId, {
          taskId: t.id,
          taskTitle: t.title,
          reminderType: "OVERDUE_EXECUTION",
          roleType: "ASSIGNEE",
          detail: `Đang chậm tiến độ thực hiện (Hạn: ${new Date(t.endDate).toLocaleDateString("vi-VN")})`,
        })
      }

      // 3b. Quá hạn duyệt -> nhắc Người duyệt
      if (dl.isOverdueReview) {
        queueReminder(reviewerId, {
          taskId: t.id,
          taskTitle: t.title,
          reminderType: "OVERDUE_REVIEW",
          roleType: "REVIEWER",
          detail: `Đang chậm duyệt kết quả nghiệm thu`,
        })
      }

      // 4. Chờ duyệt -> nhắc đúng Người duyệt
      if (wf === "PENDING_REVIEW" && !dl.isOverdueReview) {
        queueReminder(reviewerId, {
          taskId: t.id,
          taskTitle: t.title,
          reminderType: "PENDING_REVIEW",
          roleType: "REVIEWER",
          detail: `Nhiệm vụ đang chờ duyệt kết quả & minh chứng`,
        })
      }

      // 5. Cần bổ sung -> nhắc đúng Người thực hiện
      if (wf === "NEEDS_REVISION") {
        queueReminder(assigneeId, {
          taskId: t.id,
          taskTitle: t.title,
          reminderType: "NEEDS_REVISION",
          roleType: "ASSIGNEE",
          detail: `Cần chỉnh sửa, bổ sung minh chứng và gửi duyệt lại`,
        })
      }

      // 6. Vướng mắc chưa phản hồi -> nhắc Người điều phối / Người được giao gỡ vướng mắc
      const unresolvedBlockers = (t.comments || []).filter(
        (c: any) => c.commentType === "BLOCKER" && c.actionStatus !== "RESOLVED"
      )
      if (unresolvedBlockers.length > 0) {
        const blockerTarget = unresolvedBlockers[0].actionAssigneeId || coordinatorId
        queueReminder(blockerTarget, {
          taskId: t.id,
          taskTitle: t.title,
          reminderType: "UNRESOLVED_BLOCKER",
          roleType: "COORDINATOR",
          detail: `Có ${unresolvedBlockers.length} vướng mắc cần quyết định tháo gỡ`,
        })
      }
    }

    let sentNotifications = 0
    let sentEmails = 0
    let recordedItems = 0

    for (const [recipientId, items] of digestByRecipient.entries()) {
      const freshItems: typeof items = []
      for (const item of items) {
        const recorded = await recordQaReminderIfNotExists({
          taskId: item.taskId,
          recipientUserId: recipientId,
          recipientRoleType: item.roleType,
          reminderType: item.reminderType,
          dedupKey: item.dedupKey,
          channel: "IN_APP+EMAIL",
          title: `[Nhắc việc QA] ${item.taskTitle}`,
          message: item.detail,
        })
        if (recorded) {
          freshItems.push(item)
          recordedItems++
        }
      }

      if (freshItems.length === 0) continue

      // Gộp thông báo nếu cùng 1 người nhận có nhiều mục nhắc trong đợt
      if (freshItems.length === 1) {
        const single = freshItems[0]
        await prisma.notification
          .create({
            data: {
              userId: recipientId,
              title: `[Nhắc việc KT&ĐBCL] ${single.taskTitle}`,
              message: single.detail,
              isRead: false,
              link: `/admin/tasks?taskId=${single.taskId}`,
            },
          })
          .catch(() => {})
        sentNotifications++
      } else {
        const summaryLines = freshItems
          .slice(0, 4)
          .map((i) => `• ${i.taskTitle} (${i.detail})`)
          .join(" | ")
        await prisma.notification
          .create({
            data: {
              userId: recipientId,
              title: `[Tổng hợp Nhắc việc KT&ĐBCL] Bạn có ${freshItems.length} nhiệm vụ cần xử lý`,
              message: summaryLines,
              isRead: false,
              link: `/admin/tasks?taskId=${freshItems[0].taskId}`,
            },
          })
          .catch(() => {})
        sentNotifications++
      }

      // Gửi thêm Email tổng hợp nhắc việc (chống spam nhờ dedupKey theo ngày)
      try {
        const mailSent = await sendQaSmartReminderDigestEmail({
          recipientUserId: recipientId,
          items: freshItems,
        })
        if (mailSent) sentEmails++
      } catch (mailErr) {
        console.warn("[dispatchSmartQaReminders] Digest email warning:", mailErr)
      }
    }

    revalidatePath("/admin/tasks")
    const recentLogs = await getRecentQaReminders(30)
    return {
      success: true,
      sentNotifications,
      sentEmails,
      recordedItems,
      recentLogs,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi gửi nhắc việc" }
  }
}

/**
 * Quản lý Hành động Cải tiến Chất lượng (CAPA) theo đúng 5 bước (Mục VIII):
 * Ghi nhận vấn đề (OPEN) → Xác minh/nguyên nhân (ROOT_CAUSE_VERIFIED) → Giao hành động (IN_PROGRESS)
 * → Kiểm tra kết quả/hiệu quả (PENDING_VERIFICATION) → Đóng hoặc bổ sung hành động (VERIFIED_EFFECTIVE / NEEDS_FOLLOWUP / CLOSED).
 * Tách biệt rõ "Hoàn thành hành động" khỏi "Xác nhận hiệu quả".
 */
export async function upsertCapaImprovementAction(payload: {
  id?: string
  academicYearId: string
  campusId: string
  sourceType?: string
  title: string
  content: string
  verifiedRootCause: string
  actionPlan: string
  assigneeUserId: string
  assigneeName?: string
  dueDate: string
  status?: string
  evidenceUrl?: string
  evidenceNote?: string
  verificationResult?: string
  postImprovementEffectiveness?: string
  createLinkedWorkTask?: boolean
  taskGroupId?: string
}) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" }
    await ensureCoordinationTables()
    await ensureQaWorkspaceSchema()

    const actorId = String(session.user.id)

    let record: any
    if (payload.id) {
      const nextStatus = payload.status || "IN_PROGRESS"
      const isVerifyingEffectiveness =
        nextStatus === "VERIFIED_EFFECTIVE" || nextStatus === "CLOSED"

      record = await prisma.qualityImprovementAction.update({
        where: { id: payload.id },
        data: {
          title: payload.title.trim(),
          content: payload.content.trim(),
          verifiedRootCause: payload.verifiedRootCause.trim(),
          actionPlan: payload.actionPlan.trim(),
          assigneeUserId: payload.assigneeUserId,
          assigneeName: payload.assigneeName || null,
          dueDate: new Date(payload.dueDate),
          status: nextStatus,
          evidenceUrl: payload.evidenceUrl || null,
          evidenceNote: payload.evidenceNote || null,
          verificationResult: payload.verificationResult || null,
          postImprovementEffectiveness: payload.postImprovementEffectiveness || null,
          verifiedByUserId: isVerifyingEffectiveness ? actorId : undefined,
          verifiedAt: isVerifyingEffectiveness ? new Date() : undefined,
        },
      })
    } else {
      const issueCode = `CAPA-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`
      record = await prisma.qualityImprovementAction.create({
        data: {
          issueCode,
          academicYearId: payload.academicYearId,
          campusId: payload.campusId,
          sourceType: payload.sourceType || "QA_AUDIT",
          title: payload.title.trim(),
          content: payload.content.trim(),
          verifiedRootCause: payload.verifiedRootCause.trim(),
          actionPlan: payload.actionPlan.trim(),
          assigneeUserId: payload.assigneeUserId,
          assigneeName: payload.assigneeName || null,
          assignedByUserId: actorId,
          dueDate: new Date(payload.dueDate),
          status: payload.status || "OPEN",
          evidenceUrl: payload.evidenceUrl || null,
          evidenceNote: payload.evidenceNote || null,
        },
      })
    }

    // Tự động liên kết tạo phiếu giao việc nếu người dùng chọn
    if (payload.createLinkedWorkTask && record?.id) {
      await createQaWorkspaceTask({
        title: `[Hành động Cải tiến ${record.issueCode}] ${record.title}`,
        description: `Nguyên nhân gốc rễ: ${record.verifiedRootCause}\nKế hoạch hành động: ${record.actionPlan}`,
        category: "Đảm bảo chất lượng",
        taskGroupId: payload.taskGroupId || null,
        workspaceCardKey: "DBCL",
        assignmentMode: "INDIVIDUAL",
        assignedToUserId: record.assigneeUserId,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(record.dueDate).toISOString().slice(0, 10),
        priority: "HIGH",
        deliverables: record.actionPlan,
        completionCriteria: "Thực hiện xong hành động khắc phục, nộp minh chứng và được xác nhận hiệu quả sau cải tiến.",
        requiredEvidences: "Báo cáo kết quả & minh chứng sau cải tiến",
        sourceModule: "CAI_TIEN_CHAT_LUONG",
        sourceRecordId: record.id,
        sourceUrl: "/admin/ktdbcl/chat-luong-phoi-hop?tab=improvements",
        externalSyncKey: `SYNC:CAI_TIEN_CHAT_LUONG:${record.id}`,
        academicYearId: record.academicYearId,
      })
    }

    revalidatePath("/admin/tasks")
    return { success: true, action: JSON.parse(JSON.stringify(record)) }
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi lưu hành động cải tiến chất lượng" }
  }
}
