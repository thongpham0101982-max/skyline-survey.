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
  deliverables?: string
  completionCriteria?: string
  requiredEvidences?: string
  checklist?: QaChecklistStep[]
  scopeMeta?: QaTaskScopeMeta
  sourceModule?: QaSourceModuleCode
  sourceRecordId?: string | null
  sourceUrl?: string | null
  externalSyncKey?: string | null
  recurrenceRule?: QaRecurrenceRule | null
  academicYearId?: string | null
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
      let primaryId = input.assignedToUserId || input.coordinatorUserId || null
      if (!primaryId && input.taskGroupId) {
        const grp = await prisma.taskGroup.findUnique({
          where: { id: input.taskGroupId },
          select: { leaderUserId: true, memberUserIds: true, name: true },
        })
        if (grp?.leaderUserId) {
          primaryId = grp.leaderUserId
          coordinatorId = grp.leaderUserId
        } else if (grp?.memberUserIds) {
          try {
            const parsed = JSON.parse(grp.memberUserIds)
            if (Array.isArray(parsed) && parsed.length > 0) primaryId = parsed[0]
          } catch {}
        }
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
            taskId: existingSync[0].taskId,
            createdCount: 0,
            message: "Hồ sơ nguồn này đã được liên kết nhiệm vụ trước đó (không tạo trùng).",
          }
        }
      }
    }

    const batchCode =
      input.assignmentMode === "MULTI_INDIVIDUAL" && targetPrimaryUserIds.length > 1
        ? `BATCH_${Date.now().toString().slice(-6)}`
        : null

    // Giải quyết tên người phối hợp
    let collaboratorsStr = input.collaboratorsText || null
    if (!collaboratorsStr && input.collaboratorUserIds && input.collaboratorUserIds.length > 0) {
      const colUsers = await prisma.user.findMany({
        where: { id: { in: input.collaboratorUserIds } },
        select: { fullName: true },
      })
      collaboratorsStr = colUsers.map((u) => u.fullName).join(", ")
    }

    const initialWorkflow: QaWorkflowStatus =
      input.workflowStatus === "DRAFT" ? "DRAFT" : "ASSIGNED"
    const priority: QaPriority = input.priority || "MEDIUM"
    const requiresApproval = input.requiresApproval !== undefined ? input.requiresApproval : true
    const checklist = Array.isArray(input.checklist) ? input.checklist : []
    const clMetrics = computeChecklistMetrics(checklist)

    const createdTasks: any[] = []

    for (let idx = 0; idx < targetPrimaryUserIds.length; idx++) {
      const uid = targetPrimaryUserIds[idx]

      // Kiểm tra chống sinh trùng cho việc định kỳ
      let recurrenceInstanceKey: string | null = null
      if (input.assignmentMode === "RECURRING" && input.recurrenceRule) {
        const tplKey = `${input.title.trim().toLowerCase().slice(0, 40)}_${uid}`
        recurrenceInstanceKey = buildRecurrenceInstanceKey(tplKey, input.recurrenceRule, new Date(input.startDate))
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
          progress: initialWorkflow === "DRAFT" ? "PENDING" : "PENDING",
          acceptanceStatus: "WAITING_CONFIRMATION",
          month: new Date(input.endDate).getMonth() + 1,
          academicYearId: input.academicYearId || input.scopeMeta?.academicYearId || null,
          isImportant: priority === "HIGH" || priority === "URGENT",
          collaborators: collaboratorsStr,
          taskGroupId: input.taskGroupId || null,
          department: input.assignedToRole === "KT_DBCL" ? "KT&ĐBCL" : input.assignedToRole || "KT&ĐBCL",
          priority,
        },
      })

      await upsertQaTaskMetadata({
        taskId: task.id,
        workflowStatus: initialWorkflow,
        assignmentMode: input.assignmentMode,
        workspaceCardKey: input.workspaceCardKey || null,
        coordinatorUserId: coordinatorId,
        reviewerUserId: input.reviewerUserId || actorId,
        requiresApproval,
        reviewDueDate: input.reviewDueDate || null,
        deliverables: input.deliverables || null,
        completionCriteria: input.completionCriteria || null,
        requiredEvidences: input.requiredEvidences || null,
        checklist,
        currentStepLabel: clMetrics.currentStep?.title || "Tiếp nhận & triển khai",
        nextStepLabel: clMetrics.nextStep?.title || (requiresApproval ? "Gửi duyệt nghiệm thu" : "Hoàn thành"),
        scopeMeta: input.scopeMeta || {},
        sourceModule: input.sourceModule || "MANUAL",
        sourceRecordId: input.sourceRecordId || null,
        sourceUrl: input.sourceUrl || null,
        externalSyncKey: idx === 0 ? input.externalSyncKey || null : null,
        batchCode,
        recurrenceRule: input.recurrenceRule || null,
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
          endDate: input.endDate,
          reviewDueDate: input.reviewDueDate || null,
          priority,
        },
      })

      // Chỉ gửi thông báo khi phiếu đã phát hành (ASSIGNED), không gửi khi đang lưu Nháp (DRAFT)
      if (initialWorkflow === "ASSIGNED" && uid !== actorId) {
        const dueStr = new Date(input.endDate).toLocaleDateString("vi-VN")
        await prisma.notification
          .create({
            data: {
              userId: uid,
              title: `${priority === "URGENT" || priority === "HIGH" ? "[ƯU TIÊN] " : ""}[Giao việc KT&ĐBCL] ${input.title.trim()}`,
              message: `${actorName} đã giao nhiệm vụ mới cho bạn (Hạn thực hiện: ${dueStr}). Vui lòng tiếp nhận và thực hiện.`,
              isRead: false,
              link: `/admin/tasks?taskId=${task.id}`,
            },
          })
          .catch(() => {})
      }

      createdTasks.push(task)
    }

    revalidatePath("/admin/tasks")
    return {
      success: true,
      createdCount: createdTasks.length,
      primaryTaskId: createdTasks[0]?.id || null,
      batchCode,
    }
  } catch (err: any) {
    console.error("[createQaWorkspaceTask] Error:", err)
    return { success: false, error: err?.message || "Lỗi khi tạo phiếu giao việc" }
  }
}

/**
 * Cập nhật thông tin phiếu giao việc (kèm lưu lịch sử đổi người chịu trách nhiệm, đổi hạn & chống ghi đè)
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

    const existingTask = await prisma.workTask.findUnique({ where: { id: taskId } })
    if (!existingTask) return { success: false, error: "Không tìm thấy nhiệm vụ" }

    if (input.assignedToUserId !== undefined && !input.assignedToUserId) {
      return {
        success: false,
        error: "Mỗi nhiệm vụ luôn phải có 1 người chịu trách nhiệm chính.",
      }
    }

    const metaMap = await getQaMetadataMapForTasks([existingTask])
    const currentMeta = metaMap.get(taskId)!

    const checklist = input.checklist !== undefined ? input.checklist : currentMeta.checklist
    const clMetrics = computeChecklistMetrics(checklist)

    const metaRes = await upsertQaTaskMetadata(
      {
        taskId,
        assignmentMode: input.assignmentMode || currentMeta.assignmentMode,
        workspaceCardKey:
          input.workspaceCardKey !== undefined ? input.workspaceCardKey : currentMeta.workspaceCardKey,
        coordinatorUserId:
          input.coordinatorUserId !== undefined ? input.coordinatorUserId : currentMeta.coordinatorUserId,
        reviewerUserId:
          input.reviewerUserId !== undefined ? input.reviewerUserId : currentMeta.reviewerUserId,
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
        checklist,
        currentStepLabel: clMetrics.currentStep?.title || currentMeta.currentStepLabel,
        nextStepLabel: clMetrics.nextStep?.title || currentMeta.nextStepLabel,
        scopeMeta: input.scopeMeta !== undefined ? input.scopeMeta : currentMeta.scopeMeta,
        sourceModule: input.sourceModule || currentMeta.sourceModule,
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
    } else if (input.collaboratorUserIds) {
      const colUsers = await prisma.user.findMany({
        where: { id: { in: input.collaboratorUserIds } },
        select: { fullName: true },
      })
      collaboratorsStr = colUsers.map((u) => u.fullName).join(", ")
    }

    const newAssigneeId =
      input.assignedToUserId !== undefined ? input.assignedToUserId : existingTask.assignedToUserId
    const newEndDate = input.endDate ? new Date(input.endDate) : existingTask.endDate

    await prisma.workTask.update({
      where: { id: taskId },
      data: {
        title: input.title ? input.title.trim() : existingTask.title,
        description: input.description !== undefined ? input.description : existingTask.description,
        category: input.category ? input.category.trim() : existingTask.category,
        taskGroupId: input.taskGroupId !== undefined ? input.taskGroupId || null : existingTask.taskGroupId,
        assignedToUserId: newAssigneeId,
        startDate: input.startDate ? new Date(input.startDate) : existingTask.startDate,
        endDate: newEndDate,
        priority: input.priority || existingTask.priority,
        isImportant: (input.priority || existingTask.priority) === "HIGH" || (input.priority || existingTask.priority) === "URGENT",
        collaborators: collaboratorsStr,
        academicYearId:
          input.academicYearId !== undefined ? input.academicYearId : existingTask.academicYearId,
      },
    })

    // Ghi lịch sử nếu đổi người phụ trách hoặc đổi hạn
    const prevEndYmd = new Date(existingTask.endDate).toISOString().slice(0, 10)
    const nextEndYmd = new Date(newEndDate).toISOString().slice(0, 10)
    if (existingTask.assignedToUserId !== newAssigneeId) {
      await appendQaTaskAuditLog({
        taskId,
        actorUserId: actorId,
        actorName,
        actorRole,
        action: "CHANGE_ASSIGNEE",
        fromStatus: currentMeta.workflowStatus,
        toStatus: currentMeta.workflowStatus,
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
        toStatus: currentMeta.workflowStatus,
        reason: input.changeReason || "Điều chỉnh thời hạn thực hiện / hạn duyệt",
        changes: {
          fromEndDate: prevEndYmd,
          toEndDate: nextEndYmd,
          fromReviewDueDate: currentMeta.reviewDueDate,
          toReviewDueDate: input.reviewDueDate,
        },
      })
    }

    revalidatePath("/admin/tasks")
    return { success: true, newVersion: metaRes.newVersion }
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
        taskGroup: { select: { leaderUserId: true, name: true } },
      },
    })
    if (!task) return { success: false, error: "Không tìm thấy nhiệm vụ" }

    const metaMap = await getQaMetadataMapForTasks([task])
    const currentMeta = metaMap.get(taskId)!
    const fromStatus = currentMeta.workflowStatus
    const toStatus = payload.toStatus

    const isReviewerOrManager =
      opScope.isManager ||
      actorRole === "ADMIN" ||
      actorRole === "SUPERADMIN" ||
      task.assignedById === actorId ||
      currentMeta.reviewerUserId === actorId ||
      currentMeta.coordinatorUserId === actorId ||
      task.taskGroup?.leaderUserId === actorId

    const isAssignee = task.assignedToUserId === actorId
    if (!isReviewerOrManager && !isAssignee) {
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
      metaUpdate.evidenceLinks = payload.evidenceLinks
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
          toStatus === "IN_PROGRESS" && !task.acceptedAt ? new Date() : task.acceptedAt,
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

    // Thông báo đúng đối tượng
    if (toStatus === "PENDING_REVIEW") {
      const reviewerId = currentMeta.reviewerUserId || task.assignedById
      if (reviewerId && reviewerId !== actorId) {
        await prisma.notification
          .create({
            data: {
              userId: reviewerId,
              title: `[Chờ duyệt kết quả] ${task.title}`,
              message: `${actorName} đã nộp kết quả và minh chứng nhiệm vụ "${task.title}". Vui lòng kiểm tra và nghiệm thu.`,
              isRead: false,
              link: `/admin/tasks?taskId=${task.id}`,
            },
          })
          .catch(() => {})
      }
    } else if (toStatus === "NEEDS_REVISION" && task.assignedToUserId && task.assignedToUserId !== actorId) {
      await prisma.notification
        .create({
          data: {
            userId: task.assignedToUserId,
            title: `[Cần bổ sung] ${task.title}`,
            message: `${actorName} yêu cầu bổ sung kết quả nhiệm vụ "${task.title}": ${payload.reviewComment || payload.reason || ""}`,
            isRead: false,
            link: `/admin/tasks?taskId=${task.id}`,
          },
        })
        .catch(() => {})
    } else if (toStatus === "COMPLETED" && task.assignedToUserId && task.assignedToUserId !== actorId) {
      await prisma.notification
        .create({
          data: {
            userId: task.assignedToUserId,
            title: `[Đã duyệt hoàn thành] ${task.title}`,
            message: `${actorName} đã phê duyệt hoàn thành nhiệm vụ "${task.title}".`,
            isRead: false,
            link: `/admin/tasks?taskId=${task.id}`,
          },
        })
        .catch(() => {})
    }

    revalidatePath("/admin/tasks")
    return {
      success: true,
      workflowStatus: toStatus,
      newVersion: upsertRes.newVersion,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi chuyển trạng thái nhiệm vụ" }
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

    return {
      success: true,
      qaMeta: metaMap.get(taskId) || null,
      auditLogs,
    }
  } catch (err: any) {
    return { success: false, error: err?.message, qaMeta: null, auditLogs: [] }
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
      return { success: true, generatedCount: 0 }
    }

    const rows: any[] = await pAny.$queryRawUnsafe(
      `SELECT * FROM "qa_task_metadata" WHERE "assignmentMode" = 'RECURRING' AND "recurrenceRuleJson" IS NOT NULL`
    )

    let generatedCount = 0
    const now = new Date()

    for (const r of rows || []) {
      let rule: QaRecurrenceRule | null = null
      try {
        rule = JSON.parse(r.recurrenceRuleJson)
      } catch {}
      if (!rule || !rule.isActive || !rule.autoPublish) continue

      const templateTask = await prisma.workTask.findUnique({ where: { id: String(r.taskId) } })
      if (!templateTask || !templateTask.assignedToUserId) continue

      const tplKey = `${templateTask.title.trim().toLowerCase().slice(0, 40)}_${templateTask.assignedToUserId}`
      const periodInstanceKey = buildRecurrenceInstanceKey(tplKey, rule, now)

      const existingInst: any[] = await pAny.$queryRawUnsafe(
        `SELECT "taskId" FROM "qa_task_metadata" WHERE "recurrenceInstanceKey" = ? LIMIT 1`,
        periodInstanceKey
      )
      if (existingInst && existingInst.length > 0) {
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

      await upsertQaTaskMetadata({
        taskId: newTask.id,
        workflowStatus: "ASSIGNED",
        assignmentMode: "RECURRING",
        workspaceCardKey: r.workspaceCardKey,
        coordinatorUserId: r.coordinatorUserId,
        reviewerUserId: r.reviewerUserId,
        requiresApproval: Boolean(Number(r.requiresApproval)),
        deliverables: r.deliverables,
        completionCriteria: r.completionCriteria,
        requiredEvidences: r.requiredEvidences,
        recurrenceRule: rule,
        recurrenceTemplateId: templateTask.id,
        recurrenceInstanceKey: periodInstanceKey,
        version: 1,
      })

      generatedCount++
    }

    if (generatedCount > 0) revalidatePath("/admin/tasks")
    return { success: true, generatedCount }
  } catch (err: any) {
    return { success: false, error: err?.message, generatedCount: 0 }
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
          channel: "IN_APP",
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
    }

    revalidatePath("/admin/tasks")
    const recentLogs = await getRecentQaReminders(30)
    return {
      success: true,
      sentNotifications,
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
