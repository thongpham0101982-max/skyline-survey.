import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOperationalScope } from "@/lib/session"
import { hasModulePermission } from "@/lib/permissions"
import { isUserAuthorizedForKtdbclWorkHub } from "@/lib/qa-workspace/weeklyReportSchema"
import type { WorkHubActorScope, WorkHubRoleTier } from "./types"

export class WorkHubForbiddenError extends Error {
  statusCode = 403
  constructor(message = "Bạn không có quyền thực hiện thao tác này hoặc truy cập dữ liệu ngoài phạm vi quản lý.") {
    super(message)
    this.name = "WorkHubForbiddenError"
  }
}

export class WorkHubValidationError extends Error {
  statusCode = 400
  constructor(message: string) {
    super(message)
    this.name = "WorkHubValidationError"
  }
}

/**
 * Xác thực phiên đăng nhập và phân giải phạm vi dữ liệu WorkHub thực tế từ CSDL (Backend RBAC)
 */
export async function resolveWorkHubActorScope(): Promise<WorkHubActorScope | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const userId = String(session.user.id)
  const rawRole = String((session.user as any).role || "STAFF")
  const upperRole = rawRole.toUpperCase().trim()

  // Chốt chặn quyền truy cập: WorkHub • Quản lý công việc & KPI CHỈ dành riêng cho các tài khoản thuộc nhóm quyền Ban KT&ĐBCL
  const isKtdbclAllowed = await isUserAuthorizedForKtdbclWorkHub(userId, rawRole)
  if (!isKtdbclAllowed) {
    return null
  }

  const opScope = await getOperationalScope()

  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      campusAssignments: { select: { campusId: true } },
      teacher: {
        select: {
          id: true,
          email: true,
          position: true,
          campusId: true,
          campus: { select: { id: true, campusName: true } },
          departmentId: true,
          departmentRel: { select: { id: true, name: true } },
          departmentAssignments: {
            where: { isPrimary: true },
            select: { department: { select: { id: true, name: true } } },
          },
        },
      },
    },
  })

  if (!userRecord || userRecord.role === "PARENT") {
    return null
  }

  const email = userRecord.teacher?.email || userRecord.email || null
  const primaryDept =
    userRecord.teacher?.departmentAssignments?.[0]?.department ||
    userRecord.teacher?.departmentRel ||
    null
  const primaryCampus = userRecord.teacher?.campus || null

  const isSuperAdmin = opScope.isSuperAdmin
  const isExecutive =
    isSuperAdmin ||
    opScope.isHeadOfAcademic ||
    ["BAN_GD", "BGD", "TRUONG_BAN", "TB_DHCM"].includes(upperRole)

  const isCampusHead = !isExecutive && Boolean(opScope.session.isGDCS)
  const isDepartmentHead =
    !isExecutive && Boolean(opScope.isTBP || opScope.isTTCM || opScope.isManager)

  let roleTier: WorkHubRoleTier = "INDIVIDUAL"
  if (isExecutive) roleTier = "EXECUTIVE"
  else if (isCampusHead) roleTier = "CAMPUS_HEAD"
  else if (isDepartmentHead) roleTier = "DEPARTMENT_HEAD"

  // Resolve campus & user boundaries for Campus Heads (GĐCS) if not already unrestricted
  let managedCampusIds: string[] | null = isExecutive ? null : []
  let managedDepartmentIds: string[] | null = isExecutive
    ? null
    : opScope.scopedDepartmentIds || []
  let scopedUserIds: string[] | null = isExecutive ? null : opScope.scopedUserIds || [userId]

  if (isCampusHead) {
    const cIds = new Set<string>(opScope.session.allowedCampusIds || [])
    userRecord.campusAssignments?.forEach((ca) => cIds.add(ca.campusId))
    if (userRecord.teacher?.campusId) cIds.add(userRecord.teacher.campusId)
    managedCampusIds = Array.from(cIds)

    if (managedCampusIds.length > 0) {
      const [teachersInCampus, campusAssignedUsers] = await Promise.all([
        prisma.teacher.findMany({
          where: { campusId: { in: managedCampusIds }, status: "ACTIVE" },
          select: { userId: true, departmentId: true },
        }),
        prisma.userCampusAssignment.findMany({
          where: { campusId: { in: managedCampusIds } },
          select: { userId: true },
        }),
      ])
      const uSet = new Set<string>(scopedUserIds || [])
      uSet.add(userId)
      teachersInCampus.forEach((t) => {
        uSet.add(t.userId)
      })
      campusAssignedUsers.forEach((ca) => uSet.add(ca.userId))
      scopedUserIds = Array.from(uSet)

      const dSet = new Set<string>(managedDepartmentIds || [])
      teachersInCampus.forEach((t) => {
        if (t.departmentId) dSet.add(t.departmentId)
      })
      managedDepartmentIds = Array.from(dSet)
    }
  } else if (!isExecutive) {
    const cIds = new Set<string>()
    userRecord.campusAssignments?.forEach((ca) => cIds.add(ca.campusId))
    if (userRecord.teacher?.campusId) cIds.add(userRecord.teacher.campusId)
    managedCampusIds = Array.from(cIds)
  }

  const explicitSettingsPerm = await hasModulePermission(
    rawRole,
    ["WORKHUB_SETTINGS", "WORKHUB_KPIS"],
    "canUpdate"
  ).catch(() => false)

  const canManageSettings = isExecutive || explicitSettingsPerm
  const canManageKpiDefinitions = isExecutive || isDepartmentHead || isCampusHead || explicitSettingsPerm
  const canViewOrgTracking = isExecutive || isCampusHead || isDepartmentHead
  const canAssignTasks =
    isExecutive ||
    isCampusHead ||
    isDepartmentHead ||
    ["KT_DBCL", "KTDBCL", "KHAO_THI", "GIAO_VU", "GIAO_VU_CS"].includes(upperRole)

  return {
    userId,
    userName: userRecord.fullName || email || "Người dùng",
    email,
    roleCode: rawRole,
    roleTier,
    isSuperAdmin,
    isExecutive,
    isDepartmentHead,
    isCampusHead,
    canAssignTasks,
    canViewOrgTracking,
    canManageSettings,
    canManageKpiDefinitions,
    primaryDepartmentId: primaryDept?.id || null,
    primaryDepartmentName: primaryDept?.name || null,
    primaryCampusId: primaryCampus?.id || userRecord.teacher?.campusId || null,
    primaryCampusName: primaryCampus?.campusName || null,
    managedDepartmentIds,
    managedCampusIds,
    scopedUserIds,
  }
}

export async function requireWorkHubActor(): Promise<WorkHubActorScope> {
  const actor = await resolveWorkHubActorScope()
  if (!actor) {
    throw new WorkHubForbiddenError("Phiên đăng nhập không hợp lệ hoặc không có quyền truy cập WorkHub.")
  }
  return actor
}

/**
 * Kiểm tra quyền xem một công việc cụ thể
 */
export function canActorViewTask(
  actor: WorkHubActorScope,
  task: {
    assignedToUserId?: string | null
    assignedById?: string | null
    reviewerUserId?: string | null
    collaboratorIds?: string[]
    departmentId?: string | null
    campusId?: string | null
  }
): boolean {
  if (actor.isExecutive) return true
  if (
    task.assignedToUserId === actor.userId ||
    task.assignedById === actor.userId ||
    task.reviewerUserId === actor.userId ||
    (task.collaboratorIds && task.collaboratorIds.includes(actor.userId))
  ) {
    return true
  }
  if (actor.scopedUserIds && task.assignedToUserId && actor.scopedUserIds.includes(task.assignedToUserId)) {
    return true
  }
  if (
    (actor.isDepartmentHead || actor.isCampusHead) &&
    task.departmentId &&
    actor.managedDepartmentIds?.includes(task.departmentId)
  ) {
    return true
  }
  if (actor.isCampusHead && task.campusId && actor.managedCampusIds?.includes(task.campusId)) {
    return true
  }
  return false
}

/**
 * Kiểm tra quyền cập nhật tiến độ, kết quả và minh chứng của người thực hiện
 */
export function canActorUpdateExecution(
  actor: WorkHubActorScope,
  task: {
    assignedToUserId?: string | null
    collaboratorIds?: string[]
  }
): boolean {
  if (actor.isExecutive) return true
  if (task.assignedToUserId === actor.userId) return true
  if (task.collaboratorIds && task.collaboratorIds.includes(actor.userId)) return true
  return false
}

/**
 * Kiểm tra quyền nghiệm thu hoàn thành / yêu cầu bổ sung (CHỈ người nghiệm thu hoặc cấp quản lý trực tiếp trong phạm vi)
 */
export function canActorReviewTask(
  actor: WorkHubActorScope,
  task: {
    assignedToUserId?: string | null
    assignedById?: string | null
    reviewerUserId?: string | null
    departmentId?: string | null
    campusId?: string | null
  }
): boolean {
  if (actor.isExecutive) return true
  if (task.reviewerUserId && task.reviewerUserId === actor.userId) return true
  if (!task.reviewerUserId && task.assignedById === actor.userId && task.assignedToUserId !== actor.userId) {
    return true
  }
  if (actor.isDepartmentHead || actor.isCampusHead) {
    if (actor.scopedUserIds && task.assignedToUserId && actor.scopedUserIds.includes(task.assignedToUserId)) {
      // Nếu người thực hiện chính là trưởng bộ phận thì phải do người giao / cấp trên nghiệm thu (trừ khi tự giao nội bộ không người duyệt khác)
      if (task.assignedToUserId === actor.userId && task.reviewerUserId && task.reviewerUserId !== actor.userId) {
        return false
      }
      return true
    }
  }
  return false
}

/**
 * Kiểm tra quyền giao lại, đổi hạn, tạm dừng hoặc hủy công việc
 */
export function canActorManageTaskLifecycle(
  actor: WorkHubActorScope,
  task: {
    assignedById?: string | null
    reviewerUserId?: string | null
    assignedToUserId?: string | null
    departmentId?: string | null
    campusId?: string | null
  }
): boolean {
  if (actor.isExecutive) return true
  if (task.assignedById === actor.userId || task.reviewerUserId === actor.userId) return true
  if (
    (actor.isDepartmentHead || actor.isCampusHead) &&
    actor.scopedUserIds &&
    task.assignedToUserId &&
    actor.scopedUserIds.includes(task.assignedToUserId)
  ) {
    return true
  }
  return false
}

/**
 * Kiểm tra quyền xem dữ liệu của một cá nhân / phòng ban / cơ sở cụ thể (Chống truy cập chéo trái phép)
 */
export function canActorAccessTargetScope(
  actor: WorkHubActorScope,
  target: {
    targetScope: "INDIVIDUAL" | "DEPARTMENT" | "CAMPUS"
    targetId: string
    departmentId?: string | null
    campusId?: string | null
  }
): boolean {
  if (actor.isExecutive) return true

  if (target.targetScope === "INDIVIDUAL") {
    if (target.targetId === actor.userId) return true
    if ((actor.isDepartmentHead || actor.isCampusHead) && actor.scopedUserIds?.includes(target.targetId)) {
      return true
    }
    return false
  }

  if (target.targetScope === "DEPARTMENT") {
    if (target.targetId === actor.primaryDepartmentId) {
      return actor.isDepartmentHead || actor.isCampusHead
    }
    if (actor.managedDepartmentIds?.includes(target.targetId)) return true
    return false
  }

  if (target.targetScope === "CAMPUS") {
    if (actor.isCampusHead && actor.managedCampusIds?.includes(target.targetId)) return true
    return false
  }

  return false
}

/**
 * Ghi nhật ký kiểm toán hệ thống (AuditLog chuẩn của SSM) cho các thao tác quan trọng trên WorkHub
 */
export async function recordWorkHubSystemAudit(params: {
  actor: Pick<WorkHubActorScope, "userId" | "email" | "userName">
  action: string
  targetTable: string
  targetId: string
  oldValues?: Record<string, any> | null
  newValues?: Record<string, any> | null
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.actor.userId,
        userEmail: params.actor.email || params.actor.userName || "workhub@skylineschool.edu.vn",
        action: `WORKHUB_${params.action}`,
        targetTable: params.targetTable,
        targetId: params.targetId,
        oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
        newValues: params.newValues ? JSON.stringify(params.newValues) : null,
      },
    })
  } catch (err) {
    console.warn("[recordWorkHubSystemAudit] warning:", err)
  }
}
