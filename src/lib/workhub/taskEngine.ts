import { prisma } from "@/lib/db"
import { ensureWorkHubSchema, makeWorkHubId, safeJsonParse } from "./schemaInit"
import {
  canActorManageTaskLifecycle,
  canActorReviewTask,
  canActorUpdateExecution,
  canActorViewTask,
  recordWorkHubSystemAudit,
  WorkHubForbiddenError,
  WorkHubValidationError,
} from "./permissions"
import type {
  WorkHubActorScope,
  WorkHubPriority,
  WorkHubTaskHistoryEntry,
  WorkHubTaskRecord,
  WorkHubTaskStatus,
} from "./types"

/**
 * Xác định trạng thái quá hạn & hoàn thành đúng hạn thuần túy từ hạn chót (endDate) và thời điểm hoàn thành (completedAt).
 * Tuyệt đối không cho phép người dùng tự đánh dấu đúng hạn.
 */
export function computeWorkHubDeadlineTruth(params: {
  workStatus: WorkHubTaskStatus
  endDate: Date | string
  completedAt?: Date | string | null
  dueSoonHours?: number
  referenceNow?: Date
}): {
  isOverdue: boolean
  completedOnTime: boolean | null
  dueSoon: boolean
} {
  const now = params.referenceNow || new Date()
  const end = new Date(params.endDate)
  // Chuẩn hóa hạn hoàn thành đến cuối ngày nếu chuỗi chỉ có ngày YYYY-MM-DD (00:00:00 UTC)
  const endMs =
    end.getUTCHours() === 0 && end.getUTCMinutes() === 0 && end.getUTCSeconds() === 0
      ? end.getTime() + (23 * 3600 + 59 * 60 + 59) * 1000
      : end.getTime()

  if (params.workStatus === "CANCELLED" || params.workStatus === "DRAFT") {
    return { isOverdue: false, completedOnTime: null, dueSoon: false }
  }

  if (params.workStatus === "COMPLETED") {
    const doneMs = params.completedAt ? new Date(params.completedAt).getTime() : now.getTime()
    const onTime = doneMs <= endMs
    return {
      isOverdue: !onTime,
      completedOnTime: onTime,
      dueSoon: false,
    }
  }

  const nowMs = now.getTime()
  const isOverdue = nowMs > endMs
  const dueSoonWindowMs = (params.dueSoonHours ?? 48) * 3600 * 1000
  const dueSoon = !isOverdue && endMs - nowMs <= dueSoonWindowMs

  return {
    isOverdue,
    completedOnTime: null,
    dueSoon,
  }
}

/**
 * Bộ lọc chống tính trùng công việc Cha – Con và chống cộng trùng cộng tác viên khi thống kê / tính KPI:
 * 1. Khử trùng theo ID công việc (một việc có 3 người phối hợp vẫn chỉ tính 1 đầu việc).
 * 2. Nếu công việc cha có ít nhất 1 công việc con (không bị hủy) nằm trong tập dữ liệu hoặc được khai báo childCount > 0,
 *    chỉ tính các công việc con (leaf tasks), không cộng trùng cả cha lẫn con.
 */
export function selectCanonicalStatisticalTasks<
  T extends {
    id: string
    parentTaskId?: string | null
    childCount?: number
    workStatus: WorkHubTaskStatus
  }
>(tasks: T[], options?: { includeCancelled?: boolean }): T[] {
  const uniqueMap = new Map<string, T>()
  for (const t of tasks) {
    if (!options?.includeCancelled && t.workStatus === "CANCELLED") continue
    if (t.workStatus === "DRAFT") continue
    uniqueMap.set(t.id, t)
  }

  const activeParentIds = new Set<string>()
  for (const t of uniqueMap.values()) {
    if (t.parentTaskId) {
      activeParentIds.add(t.parentTaskId)
    }
  }

  const canonical: T[] = []
  for (const t of uniqueMap.values()) {
    const hasChildren = activeParentIds.has(t.id) || (typeof t.childCount === "number" && t.childCount > 0)
    if (hasChildren) continue
    canonical.push(t)
  }
  return canonical
}

function deriveLegacyWorkStatus(rawTask: {
  progress?: string | null
  acceptanceStatus?: string | null
}): WorkHubTaskStatus {
  const p = String(rawTask.progress || "PENDING").toUpperCase()
  const acc = String(rawTask.acceptanceStatus || "").toUpperCase()
  if (p === "COMPLETED") return "COMPLETED"
  if (p === "CANCELLED") return "CANCELLED"
  if (p === "IN_PROGRESS" || acc === "ACCEPTED") return "IN_PROGRESS"
  return "ASSIGNED"
}

function mapWorkStatusToLegacyProgress(status: WorkHubTaskStatus): {
  progress: string
  acceptanceStatus: string
} {
  switch (status) {
    case "DRAFT":
      return { progress: "PENDING", acceptanceStatus: "DRAFT" }
    case "ASSIGNED":
      return { progress: "PENDING", acceptanceStatus: "WAITING_CONFIRMATION" }
    case "IN_PROGRESS":
      return { progress: "IN_PROGRESS", acceptanceStatus: "ACCEPTED" }
    case "PENDING_REVIEW":
      return { progress: "IN_PROGRESS", acceptanceStatus: "PENDING_REVIEW" }
    case "COMPLETED":
      return { progress: "COMPLETED", acceptanceStatus: "ACCEPTED" }
    case "PAUSED":
      return { progress: "PENDING", acceptanceStatus: "PAUSED" }
    case "CANCELLED":
      return { progress: "CANCELLED", acceptanceStatus: "CANCELLED" }
  }
}

export async function appendWorkHubTaskHistory(entry: {
  taskId: string
  actorId: string
  actorName: string
  eventType: WorkHubTaskHistoryEntry["eventType"]
  fromValue?: string | null
  toValue?: string | null
  reason?: string | null
  meta?: Record<string, any> | null
}): Promise<void> {
  await ensureWorkHubSchema()
  const pAny = prisma as any
  if (typeof pAny.$executeRawUnsafe !== "function") return

  const id = makeWorkHubId("whth")
  const nowIso = new Date().toISOString()
  await pAny.$executeRawUnsafe(
    `INSERT INTO "workhub_task_history" (
      "id", "taskId", "actorId", "actorName", "eventType",
      "fromValue", "toValue", "reason", "metaJson", "createdAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    entry.taskId,
    entry.actorId,
    entry.actorName,
    entry.eventType,
    entry.fromValue ?? null,
    entry.toValue ?? null,
    entry.reason ?? null,
    entry.meta ? JSON.stringify(entry.meta) : null,
    nowIso
  )
}

export async function getWorkHubTaskHistory(taskId: string): Promise<WorkHubTaskHistoryEntry[]> {
  await ensureWorkHubSchema()
  const pAny = prisma as any
  if (typeof pAny.$queryRawUnsafe !== "function") return []
  try {
    const rows: any[] = await pAny.$queryRawUnsafe(
      `SELECT * FROM "workhub_task_history" WHERE "taskId" = ? ORDER BY "createdAt" DESC`,
      taskId
    )
    return (rows || []).map((r) => ({
      id: String(r.id),
      taskId: String(r.taskId),
      actorId: String(r.actorId),
      actorName: String(r.actorName || ""),
      eventType: r.eventType,
      fromValue: r.fromValue || null,
      toValue: r.toValue || null,
      reason: r.reason || null,
      metaJson: r.metaJson || null,
      createdAt: String(r.createdAt),
    }))
  } catch {
    return []
  }
}

async function generateNextTaskCode(): Promise<string> {
  const year = new Date().getFullYear()
  const pAny = prisma as any
  if (typeof pAny.$queryRawUnsafe === "function") {
    try {
      const rows: any[] = await pAny.$queryRawUnsafe(
        `SELECT COUNT(*) as cnt FROM "workhub_task_meta" WHERE "taskCode" LIKE ?`,
        `WH-${year}-%`
      )
      const nextSeq = Number(rows?.[0]?.cnt || 0) + 1
      return `WH-${year}-${String(nextSeq).padStart(4, "0")}-${Math.random()
        .toString(36)
        .slice(2, 5)
        .toUpperCase()}`
    } catch {
      // Fallback below
    }
  }
  return `WH-${year}-${Date.now().toString().slice(-6)}`
}

/**
 * Tải và làm giàu danh sách công việc WorkHub theo đúng phạm vi phân quyền của người gọi
 */
export async function listScopedWorkHubTasks(
  actor: WorkHubActorScope,
  filters?: {
    academicYearId?: string
    campusId?: string
    departmentId?: string
    userId?: string
    planId?: string
    status?: string
    viewMode?: "ALL_SCOPED" | "MY_TASKS" | "ASSIGNED_BY_ME" | "PENDING_MY_REVIEW"
    search?: string
    dueSoonHours?: number
    referenceNow?: Date
  }
): Promise<WorkHubTaskRecord[]> {
  await ensureWorkHubSchema()
  const pAny = prisma as any

  const whereClause: any = {}
  if (filters?.academicYearId && filters.academicYearId !== "ALL") {
    whereClause.academicYearId = filters.academicYearId
  }

  if (!actor.isExecutive) {
    if (actor.scopedUserIds && actor.scopedUserIds.length > 0) {
      whereClause.OR = [
        { assignedToUserId: { in: actor.scopedUserIds } },
        { assignedById: actor.userId },
        { collaborators: { contains: actor.userId } },
      ]
    } else {
      whereClause.OR = [
        { assignedToUserId: actor.userId },
        { assignedById: actor.userId },
        { collaborators: { contains: actor.userId } },
      ]
    }
  }

  const [rawTasks, departments, campuses, allUsers] = await Promise.all([
    prisma.workTask.findMany({
      where: whereClause,
      include: {
        assignedBy: { select: { id: true, fullName: true } },
        assignedToUser: { select: { id: true, fullName: true } },
        attachments: { select: { id: true } },
        comments: { select: { id: true, commentType: true, actionStatus: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 600,
    }),
    prisma.department.findMany({ select: { id: true, name: true, code: true } }),
    prisma.campus.findMany({ select: { id: true, campusName: true, campusCode: true } }),
    prisma.user.findMany({
      where: { role: { not: "PARENT" } },
      select: {
        id: true,
        fullName: true,
        teacher: { select: { departmentId: true, campusId: true } },
      },
    }),
  ])

  if (rawTasks.length === 0) return []

  const taskIds = rawTasks.map((t) => t.id)
  const metaMap = new Map<string, any>()
  const planTitleMap = new Map<string, string>()
  const kpiCodeMap = new Map<string, string>()

  if (typeof pAny.$queryRawUnsafe === "function") {
    try {
      const placeholders = taskIds.map(() => "?").join(",")
      const [metaRows, planRows, kpiRows] = await Promise.all([
        pAny.$queryRawUnsafe(
          `SELECT * FROM "workhub_task_meta" WHERE "taskId" IN (${placeholders})`,
          ...taskIds
        ),
        pAny.$queryRawUnsafe(`SELECT "id", "title" FROM "workhub_plans"`).catch(() => []),
        pAny.$queryRawUnsafe(`SELECT "id", "kpiCode" FROM "workhub_kpi_definitions"`).catch(() => []),
      ])
      for (const r of metaRows || []) {
        metaMap.set(String(r.taskId), r)
      }
      for (const p of planRows || []) {
        planTitleMap.set(String(p.id), String(p.title))
      }
      for (const k of kpiRows || []) {
        kpiCodeMap.set(String(k.id), String(k.kpiCode))
      }
    } catch (err) {
      console.warn("[listScopedWorkHubTasks] meta query warning:", err)
    }
  }

  // Also check qa_task_metadata for seamless backward compatibility with existing QA Workspace tasks
  if (typeof pAny.$queryRawUnsafe === "function") {
    try {
      const placeholders = taskIds.map(() => "?").join(",")
      const qaRows: any[] = await pAny
        .$queryRawUnsafe(
          `SELECT "taskId", "workflowStatus", "reviewerUserId", "collaboratorUserIdsJson", "deliverables", "completionCriteria", "resultSummary", "evidenceLinksJson", "submittedForReviewAt", "reviewComment" FROM "qa_task_metadata" WHERE "taskId" IN (${placeholders})`,
          ...taskIds
        )
        .catch(() => [])
      for (const qr of qaRows || []) {
        if (!metaMap.has(String(qr.taskId))) {
          metaMap.set(String(qr.taskId), {
            taskId: qr.taskId,
            taskCode: `QA-${String(qr.taskId).slice(-6).toUpperCase()}`,
            workStatus: qr.workflowStatus === "NEEDS_REVISION" ? "IN_PROGRESS" : qr.workflowStatus,
            reviewerUserId: qr.reviewerUserId,
            collaboratorIdsJson: qr.collaboratorUserIdsJson || "[]",
            acceptanceCriteria: qr.completionCriteria || null,
            deliverables: qr.deliverables || null,
            progressPercent: qr.workflowStatus === "COMPLETED" ? 100 : qr.workflowStatus === "PENDING_REVIEW" ? 100 : 50,
            resultSummary: qr.resultSummary || null,
            evidenceLinksJson: qr.evidenceLinksJson || "[]",
            submittedForReviewAt: qr.submittedForReviewAt || null,
            reviewComment: qr.reviewComment || null,
          })
        }
      }
    } catch {
      // Ignore if qa_task_metadata doesn't exist
    }
  }

  const deptLookup = new Map(departments.map((d) => [d.id, d.name]))
  const deptByNameLookup = new Map(departments.map((d) => [d.name.toLowerCase(), d.id]))
  const campusLookup = new Map(campuses.map((c) => [c.id, c.campusName]))
  const userLookup = new Map(allUsers.map((u) => [u.id, u]))

  // Count non-cancelled children per parentTaskId
  const childCountMap = new Map<string, number>()
  for (const [, m] of metaMap.entries()) {
    if (m.parentTaskId && m.workStatus !== "CANCELLED") {
      const pId = String(m.parentTaskId)
      childCountMap.set(pId, (childCountMap.get(pId) || 0) + 1)
    }
  }

  const codeLookup = new Map<string, string>()
  for (const [tid, m] of metaMap.entries()) {
    if (m.taskCode) codeLookup.set(tid, String(m.taskCode))
  }

  const now = filters?.referenceNow || new Date()
  const records: WorkHubTaskRecord[] = []

  for (const t of rawTasks) {
    const m = metaMap.get(t.id)
    const workStatus: WorkHubTaskStatus =
      (m?.workStatus as WorkHubTaskStatus) || deriveLegacyWorkStatus(t)

    const collabIds: string[] = m?.collaboratorIdsJson
      ? safeJsonParse<string[]>(m.collaboratorIdsJson, [])
      : t.collaborators
      ? safeJsonParse<string[]>(
          t.collaborators,
          String(t.collaborators)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        )
      : []

    const assigneeProfile = t.assignedToUserId ? userLookup.get(t.assignedToUserId) : null
    const resolvedDeptId =
      m?.departmentId ||
      assigneeProfile?.teacher?.departmentId ||
      (t.department ? deptByNameLookup.get(t.department.toLowerCase()) || null : null)
    const resolvedCampusId = m?.campusId || assigneeProfile?.teacher?.campusId || null

    const taskCheck = {
      assignedToUserId: t.assignedToUserId,
      assignedById: t.assignedById,
      reviewerUserId: m?.reviewerUserId || null,
      collaboratorIds: collabIds,
      departmentId: resolvedDeptId,
      campusId: resolvedCampusId,
    }
    if (!canActorViewTask(actor, taskCheck)) continue

    // View mode filters
    if (filters?.viewMode === "MY_TASKS") {
      const isMine =
        t.assignedToUserId === actor.userId ||
        collabIds.includes(actor.userId) ||
        m?.reviewerUserId === actor.userId
      if (!isMine) continue
    } else if (filters?.viewMode === "ASSIGNED_BY_ME") {
      if (t.assignedById !== actor.userId && m?.reviewerUserId !== actor.userId) continue
    } else if (filters?.viewMode === "PENDING_MY_REVIEW") {
      if (
        workStatus !== "PENDING_REVIEW" ||
        (m?.reviewerUserId !== actor.userId && t.assignedById !== actor.userId && !actor.isExecutive)
      ) {
        continue
      }
    }

    if (filters?.campusId && filters.campusId !== "ALL" && resolvedCampusId !== filters.campusId) {
      continue
    }
    if (filters?.departmentId && filters.departmentId !== "ALL" && resolvedDeptId !== filters.departmentId) {
      continue
    }
    if (filters?.userId && filters.userId !== "ALL") {
      if (t.assignedToUserId !== filters.userId && !collabIds.includes(filters.userId)) continue
    }
    if (filters?.planId && filters.planId !== "ALL") {
      if (filters.planId === "ADHOC") {
        if (!Boolean(Number(m?.isAdhoc ?? (m?.planId ? 0 : 1)))) continue
      } else if (m?.planId !== filters.planId) {
        continue
      }
    }
    if (filters?.status && filters.status !== "ALL") {
      if (filters.status === "OVERDUE") {
        const dlCheck = computeWorkHubDeadlineTruth({
          workStatus,
          endDate: t.endDate,
          completedAt: t.completedAt,
          dueSoonHours: filters?.dueSoonHours,
          referenceNow: now,
        })
        if (!dlCheck.isOverdue) continue
      } else if (workStatus !== filters.status) {
        continue
      }
    }

    const taskCode = m?.taskCode || `WH-${t.id.slice(-6).toUpperCase()}`
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase()
      const hay = `${taskCode} ${t.title} ${t.description || ""} ${t.assignedToUser?.fullName || ""}`.toLowerCase()
      if (!hay.includes(q)) continue
    }

    const dl = computeWorkHubDeadlineTruth({
      workStatus,
      endDate: t.endDate,
      completedAt: t.completedAt,
      dueSoonHours: filters?.dueSoonHours,
      referenceNow: now,
    })

    const progressPercent =
      m?.progressPercent !== undefined && m?.progressPercent !== null
        ? Number(m.progressPercent)
        : workStatus === "COMPLETED"
        ? 100
        : workStatus === "IN_PROGRESS"
        ? 50
        : 0

    const reviewerId = m?.reviewerUserId || t.assignedById
    const reviewerUser = userLookup.get(reviewerId)
    const planId = m?.planId ? String(m.planId) : null
    const isAdhoc = m?.isAdhoc !== undefined ? Boolean(Number(m.isAdhoc)) : !planId
    const linkedKpiId = m?.linkedKpiId ? String(m.linkedKpiId) : null
    const blockerComments = (t.comments || []).filter(
      (c) => c.commentType === "BLOCKER" && c.actionStatus !== "RESOLVED"
    )

    records.push({
      id: t.id,
      taskCode,
      title: t.title,
      description: t.description || "",
      category: t.category || "Chuyên môn",
      planId,
      planTitle: planId ? planTitleMap.get(planId) || null : null,
      isAdhoc,
      departmentId: resolvedDeptId,
      departmentName: resolvedDeptId ? deptLookup.get(resolvedDeptId) || t.department || null : t.department || null,
      campusId: resolvedCampusId,
      campusName: resolvedCampusId ? campusLookup.get(resolvedCampusId) || null : null,
      academicYearId: t.academicYearId || null,
      assignedById: t.assignedById,
      assignedByName: t.assignedBy?.fullName || "Người giao việc",
      assignedToUserId: t.assignedToUserId || null,
      assignedToName: t.assignedToUser?.fullName || null,
      collaboratorIds: collabIds,
      collaboratorNames: collabIds
        .map((cid) => userLookup.get(cid)?.fullName || "")
        .filter(Boolean),
      reviewerUserId: reviewerId,
      reviewerName: reviewerUser?.fullName || t.assignedBy?.fullName || "Người nghiệm thu",
      parentTaskId: m?.parentTaskId ? String(m.parentTaskId) : null,
      parentTaskCode: m?.parentTaskId ? codeLookup.get(String(m.parentTaskId)) || null : null,
      childCount: childCountMap.get(t.id) || 0,
      startDate: new Date(t.startDate).toISOString(),
      endDate: new Date(t.endDate).toISOString(),
      priority: ((t.priority || "MEDIUM").toUpperCase() as WorkHubPriority),
      workStatus,
      statusReason: m?.statusReason || t.rejectionReason || null,
      acceptanceCriteria: m?.acceptanceCriteria || null,
      deliverables: m?.deliverables || null,
      progressPercent,
      resultSummary: m?.resultSummary || t.staffNote || null,
      evidenceLinks: safeJsonParse<Array<{ label: string; url: string }>>(m?.evidenceLinksJson, []),
      attachmentsCount: t.attachments?.length || 0,
      commentsCount: t.comments?.length || 0,
      unresolvedBlockerCount: blockerComments.length,
      linkedKpiId,
      linkedKpiCode: linkedKpiId ? kpiCodeMap.get(linkedKpiId) || null : null,
      productMetCriteria:
        m?.productMetCriteria === null || m?.productMetCriteria === undefined
          ? null
          : Boolean(Number(m.productMetCriteria)),
      submittedForReviewAt: m?.submittedForReviewAt ? String(m.submittedForReviewAt) : null,
      completedAt: t.completedAt ? new Date(t.completedAt).toISOString() : null,
      reviewComment: m?.reviewComment || null,
      recurrenceTemplateId: m?.recurrenceTemplateId || null,
      recurrenceInstanceKey: m?.recurrenceInstanceKey || null,
      isOverdue: dl.isOverdue,
      completedOnTime: dl.completedOnTime,
      dueSoon: dl.dueSoon,
      createdAt: new Date(t.createdAt).toISOString(),
      updatedAt: new Date(t.updatedAt).toISOString(),
    })
  }

  return records
}

/**
 * Tạo mới công việc trên WorkHub (ở trạng thái DRAFT hoặc ASSIGNED)
 */
export async function createWorkHubTask(
  actor: WorkHubActorScope,
  input: {
    title: string
    description?: string
    category?: string
    planId?: string | null
    isAdhoc?: boolean
    departmentId?: string | null
    campusId?: string | null
    academicYearId?: string | null
    assignedToUserId: string
    collaboratorIds?: string[]
    reviewerUserId?: string | null
    parentTaskId?: string | null
    startDate: string
    endDate: string
    priority?: WorkHubPriority
    acceptanceCriteria?: string
    deliverables?: string
    linkedKpiId?: string | null
    initialStatus?: "DRAFT" | "ASSIGNED"
    recurrenceTemplateId?: string | null
    recurrenceInstanceKey?: string | null
  }
): Promise<{ taskId: string; taskCode: string }> {
  await ensureWorkHubSchema()

  if (!input.title || !input.title.trim()) {
    throw new WorkHubValidationError("Tên công việc không được để trống.")
  }
  if (!input.assignedToUserId || !input.assignedToUserId.trim()) {
    throw new WorkHubValidationError("Mỗi công việc bắt buộc phải chỉ định đúng 1 người chịu trách nhiệm chính.")
  }

  // Kiểm tra quyền giao việc: Cá nhân chỉ được tự tạo việc cho bản thân (nếu không có quyền giao việc cho người khác)
  if (input.assignedToUserId !== actor.userId) {
    if (!actor.canAssignTasks) {
      throw new WorkHubForbiddenError("Bạn không có quyền giao việc cho nhân sự khác.")
    }
    if (!actor.isExecutive && actor.scopedUserIds && !actor.scopedUserIds.includes(input.assignedToUserId)) {
      throw new WorkHubForbiddenError("Không thể giao việc cho nhân sự nằm ngoài phạm vi phòng ban/cơ sở quản lý.")
    }
  }

  const startDt = new Date(input.startDate)
  const endDt = new Date(input.endDate)
  if (Number.isNaN(startDt.getTime()) || Number.isNaN(endDt.getTime())) {
    throw new WorkHubValidationError("Ngày bắt đầu và hạn hoàn thành không hợp lệ.")
  }
  if (endDt.getTime() < startDt.getTime()) {
    throw new WorkHubValidationError("Hạn hoàn thành không được nhỏ hơn ngày bắt đầu.")
  }

  const workStatus: WorkHubTaskStatus = input.initialStatus === "DRAFT" ? "DRAFT" : "ASSIGNED"
  const legacy = mapWorkStatusToLegacyProgress(workStatus)
  const taskCode = await generateNextTaskCode()
  const collabIds = Array.from(
    new Set((input.collaboratorIds || []).filter((id) => id && id !== input.assignedToUserId))
  )
  const reviewerUserId = input.reviewerUserId || actor.userId
  const planId = input.planId || null
  const isAdhoc = input.isAdhoc !== undefined ? input.isAdhoc : !planId

  // Nếu gắn vào Kế hoạch đã duyệt (APPROVED / ADJUSTED) sau ngày duyệt mà người tạo đánh dấu phát sinh, giữ nguyên cờ phát sinh
  let deptName = "Chung"
  if (input.departmentId) {
    const d = await prisma.department.findUnique({
      where: { id: input.departmentId },
      select: { name: true },
    })
    if (d?.name) deptName = d.name
  }

  const created = await prisma.workTask.create({
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || "",
      category: input.category?.trim() || "Chuyên môn",
      assignedById: actor.userId,
      assignedToUserId: input.assignedToUserId,
      assignedToRole: actor.roleCode || "STAFF",
      startDate: startDt,
      endDate: endDt,
      progress: legacy.progress,
      acceptanceStatus: legacy.acceptanceStatus,
      priority: input.priority || "MEDIUM",
      isImportant: input.priority === "URGENT" || input.priority === "HIGH",
      academicYearId: input.academicYearId || null,
      department: deptName,
      collaborators: JSON.stringify(collabIds),
      month: endDt.getMonth() + 1,
    },
  })

  const pAny = prisma as any
  await pAny.$executeRawUnsafe(
    `INSERT INTO "workhub_task_meta" (
      "taskId", "taskCode", "workStatus", "planId", "isAdhoc",
      "departmentId", "campusId", "collaboratorIdsJson", "reviewerUserId",
      "parentTaskId", "acceptanceCriteria", "deliverables", "progressPercent",
      "linkedKpiId", "recurrenceTemplateId", "recurrenceInstanceKey", "updatedAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
    created.id,
    taskCode,
    workStatus,
    planId,
    isAdhoc ? 1 : 0,
    input.departmentId || actor.primaryDepartmentId || null,
    input.campusId || actor.primaryCampusId || null,
    JSON.stringify(collabIds),
    reviewerUserId,
    input.parentTaskId || null,
    input.acceptanceCriteria?.trim() || null,
    input.deliverables?.trim() || null,
    input.linkedKpiId || null,
    input.recurrenceTemplateId || null,
    input.recurrenceInstanceKey || null,
    new Date().toISOString()
  )

  await appendWorkHubTaskHistory({
    taskId: created.id,
    actorId: actor.userId,
    actorName: actor.userName,
    eventType: workStatus === "DRAFT" ? "CREATED" : "ASSIGNED",
    fromValue: null,
    toValue: workStatus,
    meta: {
      taskCode,
      assignedToUserId: input.assignedToUserId,
      endDate: endDt.toISOString(),
    },
  })

  await recordWorkHubSystemAudit({
    actor,
    action: "TASK_CREATED",
    targetTable: "WorkTask",
    targetId: created.id,
    newValues: { taskCode, title: input.title, workStatus, assignedToUserId: input.assignedToUserId },
  })

  if (workStatus === "ASSIGNED" && input.assignedToUserId !== actor.userId) {
    await prisma.notification
      .create({
        data: {
          userId: input.assignedToUserId,
          title: `[WorkHub] Công việc mới: ${taskCode}`,
          message: `${actor.userName} đã giao cho bạn công việc "${input.title.trim()}" (Hạn: ${endDt.toLocaleDateString("vi-VN")}).`,
          link: `/admin/workhub/my-tasks?taskId=${created.id}`,
          category: "WORKHUB",
          sourceModule: "WORKHUB",
          sourceId: created.id,
        },
      })
      .catch(() => {})
  }

  return { taskId: created.id, taskCode }
}

/**
 * Xử lý chuyển trạng thái, cập nhật tiến độ, gửi nghiệm thu, yêu cầu bổ sung, nghiệm thu hoàn thành, đổi hạn, giao lại, tạm dừng, hủy
 */
export async function executeWorkHubTaskTransition(
  actor: WorkHubActorScope,
  params: {
    taskId: string
    action:
      | "PUBLISH_DRAFT"
      | "START_WORK"
      | "UPDATE_PROGRESS"
      | "SUBMIT_FOR_REVIEW"
      | "REQUEST_REVISION"
      | "APPROVE_COMPLETE"
      | "PAUSE"
      | "RESUME"
      | "CANCEL"
      | "CHANGE_DEADLINE"
      | "REASSIGN"
    progressPercent?: number
    resultSummary?: string
    evidenceLinks?: Array<{ label: string; url: string }>
    reason?: string
    reviewComment?: string
    productMetCriteria?: boolean
    newEndDate?: string
    newAssignedToUserId?: string
    newCollaboratorIds?: string[]
  }
): Promise<{ workStatus: WorkHubTaskStatus; progressPercent: number }> {
  await ensureWorkHubSchema()
  const pAny = prisma as any

  const rawTask = await prisma.workTask.findUnique({
    where: { id: params.taskId },
    include: { attachments: { select: { id: true } } },
  })
  if (!rawTask) {
    throw new WorkHubValidationError("Không tìm thấy công việc.")
  }

  const metaRows: any[] = await pAny.$queryRawUnsafe(
    `SELECT * FROM "workhub_task_meta" WHERE "taskId" = ? LIMIT 1`,
    params.taskId
  )
  const meta = metaRows?.[0] || null
  const currentStatus: WorkHubTaskStatus =
    (meta?.workStatus as WorkHubTaskStatus) || deriveLegacyWorkStatus(rawTask)
  const currentProgress = Number(meta?.progressPercent ?? 0)
  const collabIds = safeJsonParse<string[]>(meta?.collaboratorIdsJson || rawTask.collaborators, [])
  const reviewerUserId = meta?.reviewerUserId || rawTask.assignedById

  const taskCtx = {
    assignedToUserId: rawTask.assignedToUserId,
    assignedById: rawTask.assignedById,
    reviewerUserId,
    collaboratorIds: collabIds,
    departmentId: meta?.departmentId || null,
    campusId: meta?.campusId || null,
  }

  if (!canActorViewTask(actor, taskCtx)) {
    throw new WorkHubForbiddenError()
  }

  let nextStatus: WorkHubTaskStatus = currentStatus
  let nextProgress = currentProgress
  let statusReason: string | null = meta?.statusReason || null
  let reviewComment: string | null = meta?.reviewComment || null
  let productMetCriteria: number | null =
    meta?.productMetCriteria !== undefined ? meta.productMetCriteria : null
  let submittedForReviewAt: string | null = meta?.submittedForReviewAt || null
  let completedAt: Date | null = rawTask.completedAt || null
  let endDate = rawTask.endDate
  let assignedToUserId = rawTask.assignedToUserId
  let updatedCollabIds = collabIds
  const now = new Date()
  const nowIso = now.toISOString()

  switch (params.action) {
    case "PUBLISH_DRAFT": {
      if (!canActorManageTaskLifecycle(actor, taskCtx)) {
        throw new WorkHubForbiddenError("Chỉ người tạo/quản lý mới được phát hành công việc nháp.")
      }
      if (currentStatus !== "DRAFT") {
        throw new WorkHubValidationError("Chỉ công việc ở trạng thái Nháp mới có thể phát hành giao việc.")
      }
      nextStatus = "ASSIGNED"
      await appendWorkHubTaskHistory({
        taskId: rawTask.id,
        actorId: actor.userId,
        actorName: actor.userName,
        eventType: "ASSIGNED",
        fromValue: "DRAFT",
        toValue: "ASSIGNED",
      })
      break
    }

    case "START_WORK": {
      if (!canActorUpdateExecution(actor, taskCtx)) {
        throw new WorkHubForbiddenError("Chỉ người thực hiện hoặc thành viên phối hợp mới được bắt đầu công việc.")
      }
      if (currentStatus !== "ASSIGNED" && currentStatus !== "PAUSED") {
        throw new WorkHubValidationError("Trạng thái hiện tại không thể chuyển sang Đang thực hiện.")
      }
      nextStatus = "IN_PROGRESS"
      nextProgress = Math.max(nextProgress, 10)
      await appendWorkHubTaskHistory({
        taskId: rawTask.id,
        actorId: actor.userId,
        actorName: actor.userName,
        eventType: "STATUS_CHANGED",
        fromValue: currentStatus,
        toValue: "IN_PROGRESS",
      })
      break
    }

    case "UPDATE_PROGRESS": {
      if (!canActorUpdateExecution(actor, taskCtx)) {
        throw new WorkHubForbiddenError("Chỉ người thực hiện hoặc thành viên phối hợp mới được cập nhật tiến độ.")
      }
      if (currentStatus === "COMPLETED" || currentStatus === "CANCELLED") {
        throw new WorkHubValidationError("Không thể cập nhật tiến độ cho công việc đã hoàn thành hoặc đã hủy.")
      }
      const pct = Math.max(0, Math.min(100, Math.round(Number(params.progressPercent ?? currentProgress))))
      nextProgress = pct
      // QUY TẮC BẮT BUỘC: Đạt tiến độ 100% CHƯA đồng nghĩa đã hoàn thành!
      if (currentStatus === "ASSIGNED") {
        nextStatus = "IN_PROGRESS"
      } else {
        nextStatus = currentStatus === "PENDING_REVIEW" ? "PENDING_REVIEW" : "IN_PROGRESS"
      }
      await appendWorkHubTaskHistory({
        taskId: rawTask.id,
        actorId: actor.userId,
        actorName: actor.userName,
        eventType: "PROGRESS_UPDATED",
        fromValue: `${currentProgress}%`,
        toValue: `${nextProgress}%`,
        reason: params.resultSummary || null,
      })
      break
    }

    case "SUBMIT_FOR_REVIEW": {
      if (!canActorUpdateExecution(actor, taskCtx)) {
        throw new WorkHubForbiddenError("Chỉ người thực hiện mới được gửi yêu cầu nghiệm thu.")
      }
      if (currentStatus !== "IN_PROGRESS" && currentStatus !== "ASSIGNED") {
        throw new WorkHubValidationError("Chỉ công việc đang thực hiện mới có thể gửi nghiệm thu.")
      }
      const summary = (params.resultSummary ?? meta?.resultSummary ?? rawTask.staffNote ?? "").trim()
      if (!summary) {
        throw new WorkHubValidationError("Vui lòng nhập tóm tắt kết quả thực hiện trước khi gửi nghiệm thu.")
      }
      nextStatus = "PENDING_REVIEW"
      nextProgress = 100
      submittedForReviewAt = nowIso
      await appendWorkHubTaskHistory({
        taskId: rawTask.id,
        actorId: actor.userId,
        actorName: actor.userName,
        eventType: "SUBMITTED_FOR_REVIEW",
        fromValue: currentStatus,
        toValue: "PENDING_REVIEW",
        reason: summary,
      })

      if (reviewerUserId && reviewerUserId !== actor.userId) {
        await prisma.notification
          .create({
            data: {
              userId: reviewerUserId,
              title: `[WorkHub] Chờ nghiệm thu: ${meta?.taskCode || rawTask.title}`,
              message: `${actor.userName} đã gửi nghiệm thu công việc "${rawTask.title}".`,
              link: `/admin/workhub/assigned-tasks?taskId=${rawTask.id}`,
              category: "WORKHUB",
              sourceModule: "WORKHUB",
              sourceId: rawTask.id,
            },
          })
          .catch(() => {})
      }
      break
    }

    case "REQUEST_REVISION": {
      if (!canActorReviewTask(actor, taskCtx)) {
        throw new WorkHubForbiddenError("Chỉ người có quyền nghiệm thu mới được yêu cầu bổ sung.")
      }
      if (currentStatus !== "PENDING_REVIEW" && currentStatus !== "COMPLETED") {
        throw new WorkHubValidationError("Chỉ yêu cầu bổ sung đối với công việc đang chờ nghiệm thu.")
      }
      const fb = (params.reviewComment || params.reason || "").trim()
      if (!fb) {
        throw new WorkHubValidationError("Bắt buộc nhập nhận xét / nội dung cần bổ sung khi trả lại công việc.")
      }
      // QUY TẮC BẮT BUỘC: Khi yêu cầu bổ sung, trả công việc về Đang thực hiện (IN_PROGRESS) và lưu nhận xét
      nextStatus = "IN_PROGRESS"
      nextProgress = Math.min(nextProgress, 85)
      reviewComment = fb
      completedAt = null
      productMetCriteria = 0

      await prisma.taskComment.create({
        data: {
          taskId: rawTask.id,
          userId: actor.userId,
          content: `[Yêu cầu bổ sung nghiệm thu]: ${fb}`,
          commentType: "FEEDBACK",
        },
      })

      await appendWorkHubTaskHistory({
        taskId: rawTask.id,
        actorId: actor.userId,
        actorName: actor.userName,
        eventType: "REVISION_REQUESTED",
        fromValue: currentStatus,
        toValue: "IN_PROGRESS",
        reason: fb,
      })

      if (rawTask.assignedToUserId && rawTask.assignedToUserId !== actor.userId) {
        await prisma.notification
          .create({
            data: {
              userId: rawTask.assignedToUserId,
              title: `[WorkHub] Yêu cầu bổ sung công việc: ${meta?.taskCode || ""}`,
              message: `${actor.userName} yêu cầu bổ sung: "${fb.slice(0, 100)}"`,
              link: `/admin/workhub/my-tasks?taskId=${rawTask.id}`,
              category: "WORKHUB",
              sourceModule: "WORKHUB",
              sourceId: rawTask.id,
            },
          })
          .catch(() => {})
      }
      break
    }

    case "APPROVE_COMPLETE": {
      // QUY TẮC BẮT BUỘC: Chỉ người có quyền nghiệm thu mới được xác nhận hoàn thành
      if (!canActorReviewTask(actor, taskCtx)) {
        throw new WorkHubForbiddenError("Chỉ người nghiệm thu được phân công hoặc cấp quản lý có thẩm quyền mới được xác nhận Hoàn thành.")
      }
      if (currentStatus !== "PENDING_REVIEW") {
        throw new WorkHubValidationError("Công việc phải được người thực hiện gửi nghiệm thu (Chờ nghiệm thu) trước khi xác nhận Hoàn thành.")
      }
      nextStatus = "COMPLETED"
      nextProgress = 100
      completedAt = now
      reviewComment = params.reviewComment?.trim() || "Đã nghiệm thu đạt yêu cầu."
      productMetCriteria = params.productMetCriteria === false ? 0 : 1

      await appendWorkHubTaskHistory({
        taskId: rawTask.id,
        actorId: actor.userId,
        actorName: actor.userName,
        eventType: "APPROVED_COMPLETED",
        fromValue: currentStatus,
        toValue: "COMPLETED",
        reason: reviewComment,
        meta: {
          completedAt: nowIso,
          productMetCriteria: Boolean(productMetCriteria),
        },
      })

      if (rawTask.assignedToUserId && rawTask.assignedToUserId !== actor.userId) {
        await prisma.notification
          .create({
            data: {
              userId: rawTask.assignedToUserId,
              title: `[WorkHub] Đã nghiệm thu hoàn thành: ${meta?.taskCode || ""}`,
              message: `${actor.userName} đã xác nhận hoàn thành công việc "${rawTask.title}".`,
              link: `/admin/workhub/my-tasks?taskId=${rawTask.id}`,
              category: "WORKHUB",
              sourceModule: "WORKHUB",
              sourceId: rawTask.id,
            },
          })
          .catch(() => {})
      }
      break
    }

    case "PAUSE": {
      if (!canActorManageTaskLifecycle(actor, taskCtx)) {
        throw new WorkHubForbiddenError("Chỉ người giao việc hoặc cấp quản lý mới có quyền tạm dừng công việc.")
      }
      const pauseReason = (params.reason || "").trim()
      if (!pauseReason) {
        throw new WorkHubValidationError("Bắt buộc ghi rõ lý do khi chuyển công việc sang trạng thái Tạm dừng.")
      }
      nextStatus = "PAUSED"
      statusReason = pauseReason
      await appendWorkHubTaskHistory({
        taskId: rawTask.id,
        actorId: actor.userId,
        actorName: actor.userName,
        eventType: "PAUSED",
        fromValue: currentStatus,
        toValue: "PAUSED",
        reason: pauseReason,
      })
      break
    }

    case "RESUME": {
      if (!canActorManageTaskLifecycle(actor, taskCtx) && !canActorUpdateExecution(actor, taskCtx)) {
        throw new WorkHubForbiddenError("Không có quyền tiếp tục công việc đang tạm dừng.")
      }
      if (currentStatus !== "PAUSED") {
        throw new WorkHubValidationError("Công việc không ở trạng thái Tạm dừng.")
      }
      nextStatus = nextProgress > 0 ? "IN_PROGRESS" : "ASSIGNED"
      statusReason = null
      await appendWorkHubTaskHistory({
        taskId: rawTask.id,
        actorId: actor.userId,
        actorName: actor.userName,
        eventType: "STATUS_CHANGED",
        fromValue: "PAUSED",
        toValue: nextStatus,
        reason: params.reason || "Tiếp tục triển khai",
      })
      break
    }

    case "CANCEL": {
      if (!canActorManageTaskLifecycle(actor, taskCtx)) {
        throw new WorkHubForbiddenError("Chỉ người giao việc hoặc cấp quản lý mới có quyền hủy công việc.")
      }
      const cancelReason = (params.reason || "").trim()
      if (!cancelReason) {
        throw new WorkHubValidationError("Bắt buộc ghi rõ lý do khi Hủy công việc.")
      }
      nextStatus = "CANCELLED"
      statusReason = cancelReason
      await appendWorkHubTaskHistory({
        taskId: rawTask.id,
        actorId: actor.userId,
        actorName: actor.userName,
        eventType: "CANCELLED",
        fromValue: currentStatus,
        toValue: "CANCELLED",
        reason: cancelReason,
      })
      break
    }

    case "CHANGE_DEADLINE": {
      if (!canActorManageTaskLifecycle(actor, taskCtx)) {
        throw new WorkHubForbiddenError("Chỉ người giao việc hoặc cấp quản lý mới có quyền gia hạn / đổi hạn hoàn thành.")
      }
      if (!params.newEndDate) {
        throw new WorkHubValidationError("Vui lòng chọn hạn hoàn thành mới.")
      }
      const reason = (params.reason || "").trim()
      if (!reason) {
        throw new WorkHubValidationError("Bắt buộc ghi lý do khi điều chỉnh hạn hoàn thành công việc.")
      }
      const parsedNewEnd = new Date(params.newEndDate)
      if (Number.isNaN(parsedNewEnd.getTime())) {
        throw new WorkHubValidationError("Hạn hoàn thành mới không hợp lệ.")
      }
      const oldEndIso = new Date(rawTask.endDate).toISOString()
      endDate = parsedNewEnd
      await appendWorkHubTaskHistory({
        taskId: rawTask.id,
        actorId: actor.userId,
        actorName: actor.userName,
        eventType: "DEADLINE_CHANGED",
        fromValue: oldEndIso,
        toValue: parsedNewEnd.toISOString(),
        reason,
      })
      break
    }

    case "REASSIGN": {
      if (!canActorManageTaskLifecycle(actor, taskCtx)) {
        throw new WorkHubForbiddenError("Chỉ người giao việc hoặc cấp quản lý mới có quyền giao lại người phụ trách.")
      }
      if (!params.newAssignedToUserId) {
        throw new WorkHubValidationError("Phải chọn đúng 1 người chịu trách nhiệm chính mới.")
      }
      const reason = (params.reason || "").trim() || "Điều chuyển phân công thực hiện"
      const oldAssignee = rawTask.assignedToUserId || ""
      assignedToUserId = params.newAssignedToUserId
      if (Array.isArray(params.newCollaboratorIds)) {
        updatedCollabIds = Array.from(
          new Set(params.newCollaboratorIds.filter((id) => id && id !== assignedToUserId))
        )
      }
      await appendWorkHubTaskHistory({
        taskId: rawTask.id,
        actorId: actor.userId,
        actorName: actor.userName,
        eventType: "REASSIGNED",
        fromValue: oldAssignee,
        toValue: assignedToUserId,
        reason,
      })
      break
    }
  }

  const legacy = mapWorkStatusToLegacyProgress(nextStatus)
  const nextSummary =
    params.resultSummary !== undefined ? params.resultSummary.trim() : meta?.resultSummary ?? rawTask.staffNote ?? null
  const nextEvidenceJson =
    params.evidenceLinks !== undefined
      ? JSON.stringify(params.evidenceLinks)
      : meta?.evidenceLinksJson || "[]"
  const finalTaskCode = meta?.taskCode || (await generateNextTaskCode())

  await prisma.workTask.update({
    where: { id: rawTask.id },
    data: {
      progress: legacy.progress,
      acceptanceStatus: legacy.acceptanceStatus,
      completedAt,
      endDate,
      assignedToUserId,
      collaborators: JSON.stringify(updatedCollabIds),
      staffNote: nextSummary,
      staffUpdatedAt: now,
      rejectionReason: statusReason,
    },
  })

  await pAny.$executeRawUnsafe(
    `INSERT INTO "workhub_task_meta" (
      "taskId", "taskCode", "workStatus", "statusReason", "planId", "isAdhoc",
      "departmentId", "campusId", "collaboratorIdsJson", "reviewerUserId",
      "parentTaskId", "acceptanceCriteria", "deliverables", "progressPercent",
      "resultSummary", "evidenceLinksJson", "linkedKpiId", "productMetCriteria",
      "submittedForReviewAt", "reviewComment", "updatedAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT("taskId") DO UPDATE SET
      "workStatus" = excluded."workStatus",
      "statusReason" = excluded."statusReason",
      "collaboratorIdsJson" = excluded."collaboratorIdsJson",
      "progressPercent" = excluded."progressPercent",
      "resultSummary" = excluded."resultSummary",
      "evidenceLinksJson" = excluded."evidenceLinksJson",
      "productMetCriteria" = excluded."productMetCriteria",
      "submittedForReviewAt" = excluded."submittedForReviewAt",
      "reviewComment" = excluded."reviewComment",
      "updatedAt" = excluded."updatedAt"`,
    rawTask.id,
    finalTaskCode,
    nextStatus,
    statusReason,
    meta?.planId || null,
    Number(meta?.isAdhoc ?? 0),
    meta?.departmentId || null,
    meta?.campusId || null,
    JSON.stringify(updatedCollabIds),
    reviewerUserId,
    meta?.parentTaskId || null,
    meta?.acceptanceCriteria || null,
    meta?.deliverables || null,
    nextProgress,
    nextSummary,
    nextEvidenceJson,
    meta?.linkedKpiId || null,
    productMetCriteria,
    submittedForReviewAt,
    reviewComment,
    nowIso
  )

  await recordWorkHubSystemAudit({
    actor,
    action: `TASK_${params.action}`,
    targetTable: "WorkTask",
    targetId: rawTask.id,
    oldValues: { workStatus: currentStatus, progressPercent: currentProgress },
    newValues: { workStatus: nextStatus, progressPercent: nextProgress, reason: params.reason },
  })

  return { workStatus: nextStatus, progressPercent: nextProgress }
}

/**
 * Tạo mẫu công việc lặp lại theo Tuần / Tháng và phát sinh kỳ hiện tại có khóa chống tạo trùng (Idempotent)
 */
export async function createRecurrenceTemplateAndGenerateInstance(
  actor: WorkHubActorScope,
  input: {
    title: string
    description?: string
    category: string
    frequency: "WEEKLY" | "MONTHLY"
    dueOffsetDays?: number
    priority?: WorkHubPriority
    departmentId?: string | null
    campusId?: string | null
    academicYearId?: string | null
    planId?: string | null
    assignedToUserId: string
    collaboratorIds?: string[]
    reviewerUserId?: string | null
    acceptanceCriteria?: string
    deliverables?: string
    linkedKpiId?: string | null
    periodKey?: string
    periodStartDate?: string
  }
): Promise<{ templateId: string; generatedTaskId: string | null; duplicateSkipped: boolean }> {
  await ensureWorkHubSchema()
  if (!actor.canAssignTasks && input.assignedToUserId !== actor.userId) {
    throw new WorkHubForbiddenError("Bạn không có quyền tạo mẫu công việc lặp lại cho người khác.")
  }

  const pAny = prisma as any
  const templateId = makeWorkHubId("whrec")
  const templateCode = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`
  const nowIso = new Date().toISOString()

  await pAny.$executeRawUnsafe(
    `INSERT INTO "workhub_recurrence_templates" (
      "id", "templateCode", "title", "description", "category", "frequency",
      "dayOfCycle", "dueOffsetDays", "priority", "departmentId", "campusId",
      "academicYearId", "planId", "assignedById", "assignedToUserId",
      "collaboratorIdsJson", "reviewerUserId", "acceptanceCriteria", "deliverables",
      "linkedKpiId", "isActive", "createdAt", "updatedAt"
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    templateId,
    templateCode,
    input.title.trim(),
    input.description?.trim() || null,
    input.category || "Định kỳ",
    input.frequency,
    input.dueOffsetDays ?? 4,
    input.priority || "MEDIUM",
    input.departmentId || actor.primaryDepartmentId || null,
    input.campusId || actor.primaryCampusId || null,
    input.academicYearId || null,
    input.planId || null,
    actor.userId,
    input.assignedToUserId,
    JSON.stringify(input.collaboratorIds || []),
    input.reviewerUserId || actor.userId,
    input.acceptanceCriteria || null,
    input.deliverables || null,
    input.linkedKpiId || null,
    nowIso,
    nowIso
  )

  const gen = await generateTaskForRecurrencePeriod(actor, {
    templateId,
    periodKey: input.periodKey,
    periodStartDate: input.periodStartDate,
  })

  return {
    templateId,
    generatedTaskId: gen.taskId,
    duplicateSkipped: gen.duplicateSkipped,
  }
}

export async function generateTaskForRecurrencePeriod(
  actor: WorkHubActorScope,
  params: {
    templateId: string
    periodKey?: string
    periodStartDate?: string
  }
): Promise<{ taskId: string | null; duplicateSkipped: boolean; instanceKey: string }> {
  await ensureWorkHubSchema()
  const pAny = prisma as any

  const tplRows: any[] = await pAny.$queryRawUnsafe(
    `SELECT * FROM "workhub_recurrence_templates" WHERE "id" = ? LIMIT 1`,
    params.templateId
  )
  const tpl = tplRows?.[0]
  if (!tpl || !Number(tpl.isActive)) {
    throw new WorkHubValidationError("Mẫu công việc định kỳ không tồn tại hoặc đã ngưng kích hoạt.")
  }

  const startDt = params.periodStartDate ? new Date(params.periodStartDate) : new Date()
  const y = startDt.getFullYear()
  const m = String(startDt.getMonth() + 1).padStart(2, "0")
  const weekOfYear = Math.ceil(
    ((startDt.getTime() - new Date(y, 0, 1).getTime()) / 86400000 + new Date(y, 0, 1).getDay() + 1) / 7
  )
  const resolvedPeriodKey =
    params.periodKey ||
    (tpl.frequency === "MONTHLY" ? `${y}-M${m}` : `${y}-W${String(weekOfYear).padStart(2, "0")}`)

  const instanceKey = `REC_${tpl.id}_${resolvedPeriodKey}`

  // Kiểm tra chống tạo trùng kỳ
  const existingRows: any[] = await pAny.$queryRawUnsafe(
    `SELECT "taskId" FROM "workhub_task_meta" WHERE "recurrenceInstanceKey" = ? LIMIT 1`,
    instanceKey
  )
  if (existingRows && existingRows.length > 0) {
    return {
      taskId: String(existingRows[0].taskId),
      duplicateSkipped: true,
      instanceKey,
    }
  }

  const endDt = new Date(startDt.getTime() + Number(tpl.dueOffsetDays || 4) * 86400000)
  const created = await createWorkHubTask(actor, {
    title: `[${resolvedPeriodKey}] ${tpl.title}`,
    description: tpl.description || "",
    category: tpl.category || "Định kỳ",
    planId: tpl.planId || null,
    isAdhoc: !tpl.planId,
    departmentId: tpl.departmentId || null,
    campusId: tpl.campusId || null,
    academicYearId: tpl.academicYearId || null,
    assignedToUserId: String(tpl.assignedToUserId),
    collaboratorIds: safeJsonParse<string[]>(tpl.collaboratorIdsJson, []),
    reviewerUserId: tpl.reviewerUserId || String(tpl.assignedById),
    startDate: startDt.toISOString(),
    endDate: endDt.toISOString(),
    priority: (tpl.priority as WorkHubPriority) || "MEDIUM",
    acceptanceCriteria: tpl.acceptanceCriteria || undefined,
    deliverables: tpl.deliverables || undefined,
    linkedKpiId: tpl.linkedKpiId || null,
    initialStatus: "ASSIGNED",
    recurrenceTemplateId: String(tpl.id),
    recurrenceInstanceKey: instanceKey,
  })

  return {
    taskId: created.taskId,
    duplicateSkipped: false,
    instanceKey,
  }
}

export async function listScopedRecurrenceTemplates(actor: WorkHubActorScope): Promise<any[]> {
  await ensureWorkHubSchema()
  const pAny = prisma as any
  if (typeof pAny.$queryRawUnsafe !== "function") return []
  try {
    const rows: any[] = await pAny.$queryRawUnsafe(
      `SELECT * FROM "workhub_recurrence_templates" ORDER BY "createdAt" DESC`
    )
    return (rows || []).filter((r) => {
      if (actor.isExecutive) return true
      if (r.assignedById === actor.userId || r.assignedToUserId === actor.userId) return true
      if (actor.scopedUserIds && actor.scopedUserIds.includes(r.assignedToUserId)) return true
      return false
    })
  } catch {
    return []
  }
}
