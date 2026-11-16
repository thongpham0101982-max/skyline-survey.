import { prisma } from "@/lib/db"
import { ensureWorkHubSchema, makeWorkHubId, safeJsonParse } from "./schemaInit"
import {
  recordWorkHubSystemAudit,
  WorkHubForbiddenError,
  WorkHubValidationError,
} from "./permissions"
import { listScopedWorkHubTasks, selectCanonicalStatisticalTasks } from "./taskEngine"
import type {
  WorkHubActorScope,
  WorkHubPlanObjective,
  WorkHubPlanPeriodType,
  WorkHubPlanRecord,
  WorkHubPlanStatus,
  WorkHubPlanVersionRecord,
} from "./types"

function canActorViewPlan(actor: WorkHubActorScope, planRow: any): boolean {
  if (actor.isExecutive) return true
  if (planRow.ownerUserId === actor.userId || planRow.approverUserId === actor.userId) return true
  if (actor.scopedUserIds && actor.scopedUserIds.includes(String(planRow.ownerUserId))) return true
  if (
    planRow.departmentId &&
    (planRow.departmentId === actor.primaryDepartmentId ||
      actor.managedDepartmentIds?.includes(String(planRow.departmentId)))
  ) {
    return true
  }
  if (
    planRow.campusId &&
    (planRow.campusId === actor.primaryCampusId ||
      actor.managedCampusIds?.includes(String(planRow.campusId)))
  ) {
    return true
  }
  return false
}

export async function listScopedWorkHubPlans(
  actor: WorkHubActorScope,
  filters?: {
    academicYearId?: string
    periodType?: string
    departmentId?: string
    campusId?: string
    status?: string
  }
): Promise<WorkHubPlanRecord[]> {
  await ensureWorkHubSchema()
  const pAny = prisma as any
  if (typeof pAny.$queryRawUnsafe !== "function") return []

  const [rows, departments, campuses, scopedTasks] = await Promise.all([
    pAny.$queryRawUnsafe(`SELECT * FROM "workhub_plans" ORDER BY "updatedAt" DESC`),
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.campus.findMany({ select: { id: true, campusName: true } }),
    listScopedWorkHubTasks(actor, {
      academicYearId: filters?.academicYearId,
      departmentId: filters?.departmentId,
      campusId: filters?.campusId,
    }),
  ])

  const deptMap = new Map(departments.map((d) => [d.id, d.name]))
  const campusMap = new Map(campuses.map((c) => [c.id, c.campusName]))

  const canonicalTasks = selectCanonicalStatisticalTasks(scopedTasks)
  const tasksByPlan = new Map<string, typeof canonicalTasks>()
  for (const t of canonicalTasks) {
    if (!t.planId) continue
    const arr = tasksByPlan.get(t.planId) || []
    arr.push(t)
    tasksByPlan.set(t.planId, arr)
  }

  const results: WorkHubPlanRecord[] = []
  for (const r of rows || []) {
    if (!canActorViewPlan(actor, r)) continue
    if (
      filters?.academicYearId &&
      filters.academicYearId !== "ALL" &&
      r.academicYearId !== filters.academicYearId
    ) {
      continue
    }
    if (filters?.periodType && filters.periodType !== "ALL" && r.periodType !== filters.periodType) {
      continue
    }
    if (
      filters?.departmentId &&
      filters.departmentId !== "ALL" &&
      r.departmentId !== filters.departmentId
    ) {
      continue
    }
    if (filters?.campusId && filters.campusId !== "ALL" && r.campusId !== filters.campusId) {
      continue
    }
    if (filters?.status && filters.status !== "ALL" && r.status !== filters.status) {
      continue
    }

    const planId = String(r.id)
    const linked = tasksByPlan.get(planId) || []
    const totalCanonicalTasks = linked.length
    const adhocTasksCount = linked.filter((t) => t.isAdhoc).length
    const plannedTasksCount = totalCanonicalTasks - adhocTasksCount
    const completedTasksCount = linked.filter((t) => t.workStatus === "COMPLETED").length
    const inProgressTasksCount = linked.filter(
      (t) => t.workStatus === "IN_PROGRESS" || t.workStatus === "PENDING_REVIEW"
    ).length
    const overdueTasksCount = linked.filter((t) => t.isOverdue).length

    const progressPercent =
      totalCanonicalTasks > 0
        ? Math.round(
            linked.reduce(
              (sum, t) => sum + (t.workStatus === "COMPLETED" ? 100 : t.progressPercent * 0.85),
              0
            ) / totalCanonicalTasks
          )
        : 0

    results.push({
      id: planId,
      planCode: String(r.planCode),
      title: String(r.title),
      description: r.description ? String(r.description) : null,
      periodType: (r.periodType as WorkHubPlanPeriodType) || "MONTHLY",
      periodLabel: String(r.periodLabel || ""),
      academicYearId: r.academicYearId ? String(r.academicYearId) : null,
      departmentId: r.departmentId ? String(r.departmentId) : null,
      departmentName: r.departmentId ? deptMap.get(String(r.departmentId)) || null : null,
      campusId: r.campusId ? String(r.campusId) : null,
      campusName: r.campusId ? campusMap.get(String(r.campusId)) || null : null,
      ownerUserId: String(r.ownerUserId),
      ownerName: String(r.ownerName || ""),
      approverUserId: r.approverUserId ? String(r.approverUserId) : null,
      approverName: r.approverName ? String(r.approverName) : null,
      startDate: String(r.startDate),
      endDate: String(r.endDate),
      status: (r.status as WorkHubPlanStatus) || "DRAFT",
      versionNumber: Number(r.versionNumber || 1),
      lastAdjustmentReason: r.lastAdjustmentReason ? String(r.lastAdjustmentReason) : null,
      objectives: safeJsonParse<WorkHubPlanObjective[]>(r.objectivesJson, []),
      approvedAt: r.approvedAt ? String(r.approvedAt) : null,
      createdAt: String(r.createdAt),
      updatedAt: String(r.updatedAt),
      metrics: {
        totalCanonicalTasks,
        plannedTasksCount,
        adhocTasksCount,
        completedTasksCount,
        inProgressTasksCount,
        overdueTasksCount,
        progressPercent,
      },
    })
  }

  return results
}

export async function createWorkHubPlan(
  actor: WorkHubActorScope,
  input: {
    title: string
    description?: string
    periodType: WorkHubPlanPeriodType
    periodLabel: string
    academicYearId?: string | null
    departmentId?: string | null
    campusId?: string | null
    ownerUserId?: string
    startDate: string
    endDate: string
    objectives?: WorkHubPlanObjective[]
  }
): Promise<{ planId: string; planCode: string }> {
  await ensureWorkHubSchema()
  if (!input.title?.trim()) {
    throw new WorkHubValidationError("Tên kế hoạch công tác không được để trống.")
  }

  const startDt = new Date(input.startDate)
  const endDt = new Date(input.endDate)
  if (Number.isNaN(startDt.getTime()) || Number.isNaN(endDt.getTime()) || endDt < startDt) {
    throw new WorkHubValidationError("Thời hạn bắt đầu và kết thúc kế hoạch không hợp lệ.")
  }

  let ownerUserId = actor.userId
  let ownerName = actor.userName
  if (input.ownerUserId && input.ownerUserId !== actor.userId) {
    if (!actor.canAssignTasks) {
      throw new WorkHubForbiddenError("Bạn không có quyền lập kế hoạch giao cho người khác phụ trách.")
    }
    const targetUser = await prisma.user.findUnique({
      where: { id: input.ownerUserId },
      select: { id: true, fullName: true },
    })
    if (!targetUser) throw new WorkHubValidationError("Người phụ trách kế hoạch không tồn tại.")
    ownerUserId = targetUser.id
    ownerName = targetUser.fullName || "Người phụ trách"
  }

  const id = makeWorkHubId("whplan")
  const planCode = `KH-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`
  const nowIso = new Date().toISOString()

  const pAny = prisma as any
  await pAny.$executeRawUnsafe(
    `INSERT INTO "workhub_plans" (
      "id", "planCode", "title", "description", "periodType", "periodLabel",
      "academicYearId", "departmentId", "campusId", "ownerUserId", "ownerName",
      "startDate", "endDate", "status", "versionNumber", "objectivesJson",
      "createdAt", "updatedAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', 1, ?, ?, ?)`,
    id,
    planCode,
    input.title.trim(),
    input.description?.trim() || null,
    input.periodType,
    input.periodLabel.trim(),
    input.academicYearId || null,
    input.departmentId || actor.primaryDepartmentId || null,
    input.campusId || actor.primaryCampusId || null,
    ownerUserId,
    ownerName,
    startDt.toISOString(),
    endDt.toISOString(),
    JSON.stringify(input.objectives || []),
    nowIso,
    nowIso
  )

  await recordWorkHubSystemAudit({
    actor,
    action: "PLAN_CREATED",
    targetTable: "workhub_plans",
    targetId: id,
    newValues: { planCode, title: input.title, periodType: input.periodType },
  })

  return { planId: id, planCode }
}

/**
 * Phê duyệt kế hoạch (DRAFT -> APPROVED) hoặc Điều chỉnh kế hoạch đã duyệt (APPROVED/ADJUSTED -> ADJUSTED kèm lưu phiên bản & lý do)
 */
export async function updateOrApproveWorkHubPlan(
  actor: WorkHubActorScope,
  params: {
    planId: string
    mode: "APPROVE" | "UPDATE_OR_ADJUST"
    title?: string
    description?: string
    periodLabel?: string
    startDate?: string
    endDate?: string
    objectives?: WorkHubPlanObjective[]
    adjustmentReason?: string
  }
): Promise<{ status: WorkHubPlanStatus; versionNumber: number }> {
  await ensureWorkHubSchema()
  const pAny = prisma as any

  const rows: any[] = await pAny.$queryRawUnsafe(
    `SELECT * FROM "workhub_plans" WHERE "id" = ? LIMIT 1`,
    params.planId
  )
  const existing = rows?.[0]
  if (!existing) throw new WorkHubValidationError("Không tìm thấy kế hoạch công tác.")
  if (!canActorViewPlan(actor, existing)) throw new WorkHubForbiddenError()

  const nowIso = new Date().toISOString()

  if (params.mode === "APPROVE") {
    if (!actor.isExecutive && !actor.isDepartmentHead && !actor.isCampusHead) {
      throw new WorkHubForbiddenError("Chỉ Trưởng bộ phận, Giám đốc Cơ sở hoặc Ban điều hành mới có quyền phê duyệt kế hoạch.")
    }
    const nextStatus: WorkHubPlanStatus =
      Number(existing.versionNumber || 1) > 1 ? "ADJUSTED" : "APPROVED"
    await pAny.$executeRawUnsafe(
      `UPDATE "workhub_plans"
       SET "status" = ?, "approverUserId" = ?, "approverName" = ?, "approvedAt" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
      nextStatus,
      actor.userId,
      actor.userName,
      nowIso,
      nowIso,
      params.planId
    )
    await recordWorkHubSystemAudit({
      actor,
      action: "PLAN_APPROVED",
      targetTable: "workhub_plans",
      targetId: params.planId,
      oldValues: { status: existing.status },
      newValues: { status: nextStatus, versionNumber: existing.versionNumber },
    })
    return { status: nextStatus, versionNumber: Number(existing.versionNumber || 1) }
  }

  // UPDATE_OR_ADJUST
  if (
    existing.ownerUserId !== actor.userId &&
    !actor.isExecutive &&
    !actor.isDepartmentHead &&
    !actor.isCampusHead
  ) {
    throw new WorkHubForbiddenError("Bạn không có quyền chỉnh sửa kế hoạch này.")
  }

  const currentStatus = String(existing.status) as WorkHubPlanStatus
  let nextStatus: WorkHubPlanStatus = currentStatus
  let nextVersion = Number(existing.versionNumber || 1)
  let adjustmentReason: string | null = existing.lastAdjustmentReason || null

  // Nếu kế hoạch đã duyệt (APPROVED hoặc ADJUSTED), bắt buộc lưu phiên bản cũ và ghi lý do điều chỉnh!
  if (currentStatus === "APPROVED" || currentStatus === "ADJUSTED") {
    const reason = (params.adjustmentReason || "").trim()
    if (!reason) {
      throw new WorkHubValidationError(
        "Kế hoạch đã được phê duyệt. Mọi điều chỉnh bắt buộc phải nhập lý do điều chỉnh để lưu lịch sử phiên bản."
      )
    }
    await pAny.$executeRawUnsafe(
      `INSERT INTO "workhub_plan_versions" (
        "id", "planId", "versionNumber", "statusAtSnapshot", "adjustmentReason",
        "snapshotJson", "changedByUserId", "changedByName", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      makeWorkHubId("whpv"),
      params.planId,
      nextVersion,
      currentStatus,
      reason,
      JSON.stringify({
        title: existing.title,
        description: existing.description,
        periodLabel: existing.periodLabel,
        startDate: existing.startDate,
        endDate: existing.endDate,
        objectives: safeJsonParse(existing.objectivesJson, []),
      }),
      actor.userId,
      actor.userName,
      nowIso
    )
    nextVersion += 1
    nextStatus = "ADJUSTED"
    adjustmentReason = reason
  }

  await pAny.$executeRawUnsafe(
    `UPDATE "workhub_plans"
     SET "title" = ?, "description" = ?, "periodLabel" = ?, "startDate" = ?, "endDate" = ?,
         "objectivesJson" = ?, "status" = ?, "versionNumber" = ?, "lastAdjustmentReason" = ?, "updatedAt" = ?
     WHERE "id" = ?`,
    params.title?.trim() || existing.title,
    params.description !== undefined ? params.description.trim() : existing.description,
    params.periodLabel?.trim() || existing.periodLabel,
    params.startDate ? new Date(params.startDate).toISOString() : existing.startDate,
    params.endDate ? new Date(params.endDate).toISOString() : existing.endDate,
    params.objectives !== undefined ? JSON.stringify(params.objectives) : existing.objectivesJson,
    nextStatus,
    nextVersion,
    adjustmentReason,
    nowIso,
    params.planId
  )

  await recordWorkHubSystemAudit({
    actor,
    action: nextStatus === "ADJUSTED" ? "PLAN_ADJUSTED_NEW_VERSION" : "PLAN_DRAFT_UPDATED",
    targetTable: "workhub_plans",
    targetId: params.planId,
    oldValues: { status: currentStatus, versionNumber: existing.versionNumber },
    newValues: { status: nextStatus, versionNumber: nextVersion, adjustmentReason },
  })

  return { status: nextStatus, versionNumber: nextVersion }
}

export async function getWorkHubPlanVersions(
  actor: WorkHubActorScope,
  planId: string
): Promise<WorkHubPlanVersionRecord[]> {
  await ensureWorkHubSchema()
  const pAny = prisma as any
  const planRows: any[] = await pAny.$queryRawUnsafe(
    `SELECT * FROM "workhub_plans" WHERE "id" = ? LIMIT 1`,
    planId
  )
  if (!planRows?.[0] || !canActorViewPlan(actor, planRows[0])) {
    throw new WorkHubForbiddenError()
  }
  const rows: any[] = await pAny.$queryRawUnsafe(
    `SELECT * FROM "workhub_plan_versions" WHERE "planId" = ? ORDER BY "versionNumber" DESC`,
    planId
  )
  return (rows || []).map((r) => ({
    id: String(r.id),
    planId: String(r.planId),
    versionNumber: Number(r.versionNumber),
    statusAtSnapshot: r.statusAtSnapshot,
    adjustmentReason: String(r.adjustmentReason || ""),
    snapshotJson: String(r.snapshotJson || "{}"),
    changedByUserId: String(r.changedByUserId),
    changedByName: String(r.changedByName || ""),
    createdAt: String(r.createdAt),
  }))
}
