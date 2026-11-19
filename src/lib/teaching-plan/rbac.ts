import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { hasModulePermission } from "@/lib/permissions"
import { getAdminSession, type AdminSession } from "@/lib/session"

export class TeachingPlanAccessError extends Error {
  public readonly status: number
  public readonly code:
    | "UNAUTHENTICATED"
    | "FORBIDDEN"
    | "SCOPE_VIOLATION"
    | "CONFLICT"
    | "NOT_FOUND"
    | "VALIDATION_ERROR"

  constructor(
    message: string,
    code:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "SCOPE_VIOLATION"
      | "CONFLICT"
      | "NOT_FOUND"
      | "VALIDATION_ERROR" = "FORBIDDEN",
    status?: number
  ) {
    super(message)
    this.name = "TeachingPlanAccessError"
    this.code = code
    this.status =
      status ??
      (code === "UNAUTHENTICATED"
        ? 401
        : code === "NOT_FOUND"
        ? 404
        : code === "CONFLICT"
        ? 409
        : code === "VALIDATION_ERROR"
        ? 400
        : 403)
  }
}

export interface TeachingPlanAuthContext {
  userId: string
  actorName: string
  role: string
  teacherId: string | null
  teacherCampusId: string | null
  allowedCampusIds: string[]
  isFullAccess: boolean
  canManage: boolean
  canApprove: boolean
  isTeacherOnly: boolean
  adminSession: AdminSession
}

const SYSTEM_ROLES = new Set([
  "ADMIN",
  "ADMINISTRATOR",
  "SUPER_ADMIN",
  "SUPERADMIN",
  "BAN_DHCM",
  "TB_DHCM",
  "TRUONG_BAN_DHCM",
  "PHO_BAN_DHCM",
  "DHCM",
])

const APPROVER_ROLES = new Set([
  ...SYSTEM_ROLES,
  "BGH",
  "BGH_MN",
  "GDCS",
  "GĐCS",
  "PGDCS",
  "QLCM",
  "QUAN_LY_CM",
  "TBP",
  "TTCM",
  "TO_TRUONG",
])

const EDITOR_ROLES = new Set([
  ...APPROVER_ROLES,
  "TPCM",
  "TO_PHO",
  "GV_PHU_TRACH_MON",
])

function isApproverPosition(pos?: string | null): boolean {
  const p = (pos || "").toLowerCase().trim()
  if (!p) return false
  return (
    p.includes("trưởng ban") ||
    p.includes("phó ban") ||
    p.includes("ban đhcm") ||
    p.includes("ban giám hiệu") ||
    p.includes("giám đốc cơ sở") ||
    p.includes("phó giám đốc") ||
    p.includes("tổ trưởng") ||
    p.includes("trưởng bộ phận") ||
    p.includes("quản lý cm") ||
    p.includes("ttcm")
  )
}

function isEditorPosition(pos?: string | null): boolean {
  if (isApproverPosition(pos)) return true
  const p = (pos || "").toLowerCase().trim()
  if (!p) return false
  return p.includes("tổ phó") || p.includes("phó bộ phận") || p.includes("tpcm")
}

export async function getTeachingPlanAuthContext(): Promise<TeachingPlanAuthContext> {
  const [rawAuth, adminSession] = await Promise.all([auth(), getAdminSession()])
  const userId = adminSession.userId || (rawAuth?.user as any)?.id || ""
  const role = (adminSession.role || (rawAuth?.user as any)?.role || "").trim()

  if (!userId || !role) {
    throw new TeachingPlanAccessError(
      "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      "UNAUTHENTICATED",
      401
    )
  }

  const upperRole = role.toUpperCase().replace(/\s+/g, "_")
  const teacher = await prisma.teacher
    .findUnique({
      where: { userId },
      select: {
        id: true,
        teacherName: true,
        position: true,
        campusId: true,
        departmentAssignments: { select: { position: true } },
      },
    })
    .catch(() => null)

  const positions = [
    teacher?.position || "",
    ...(teacher?.departmentAssignments || []).map((d) => d.position || ""),
  ]

  const [permCreate, permUpdate, permDelete] = await Promise.all([
    hasModulePermission(role, ["TEACHING_PLAN", "DU_GIO_K12"], "canCreate").catch(() => false),
    hasModulePermission(role, ["TEACHING_PLAN", "DU_GIO_K12"], "canUpdate").catch(() => false),
    hasModulePermission(role, ["TEACHING_PLAN"], "canDelete").catch(() => false),
  ])

  const isFullAccess =
    adminSession.isFullAccess ||
    adminSession.isSuperAdmin ||
    adminSession.isHeadOfAcademic ||
    SYSTEM_ROLES.has(upperRole)

  const canApprove =
    isFullAccess ||
    APPROVER_ROLES.has(upperRole) ||
    positions.some((p) => isApproverPosition(p)) ||
    Boolean(permDelete)

  const canManage =
    canApprove ||
    EDITOR_ROLES.has(upperRole) ||
    positions.some((p) => isEditorPosition(p)) ||
    Boolean(permCreate || permUpdate)

  const allowedCampusSet = new Set<string>(adminSession.allowedCampusIds || [])
  if (teacher?.campusId) allowedCampusSet.add(teacher.campusId)

  const actorName =
    teacher?.teacherName ||
    (rawAuth?.user as any)?.name ||
    (rawAuth?.user as any)?.email ||
    userId

  return {
    userId,
    actorName: String(actorName),
    role,
    teacherId: teacher?.id || null,
    teacherCampusId: teacher?.campusId || null,
    allowedCampusIds: Array.from(allowedCampusSet),
    isFullAccess,
    canManage,
    canApprove,
    isTeacherOnly: !canManage,
    adminSession,
  }
}

export function assertCanManagePlan(
  ctx: TeachingPlanAuthContext,
  scopeType: "SYSTEM" | "CAMPUS",
  campusId?: string | null
) {
  if (!ctx.canManage) {
    throw new TeachingPlanAccessError(
      "Bạn không có quyền lập hoặc chỉnh sửa Kế hoạch dạy học.",
      "FORBIDDEN",
      403
    )
  }

  if (scopeType === "SYSTEM") {
    // System-wide plans require system access or approver/TCM lead role
    if (!ctx.isFullAccess && !ctx.canApprove) {
      throw new TeachingPlanAccessError(
        "Chỉ Ban ĐHCM / Quản trị hoặc Tổ trưởng chuyên môn được phân quyền mới được chỉnh sửa kế hoạch phạm vi toàn hệ thống.",
        "SCOPE_VIOLATION",
        403
      )
    }
    return
  }

  if (scopeType === "CAMPUS") {
    if (!campusId) {
      throw new TeachingPlanAccessError(
        "Kế hoạch phạm vi cơ sở bắt buộc phải chọn cơ sở áp dụng.",
        "VALIDATION_ERROR",
        400
      )
    }
    if (!ctx.isFullAccess && !ctx.allowedCampusIds.includes(campusId)) {
      throw new TeachingPlanAccessError(
        "Bạn không có quyền thao tác Kế hoạch dạy học thuộc cơ sở ngoài phạm vi phụ trách.",
        "SCOPE_VIOLATION",
        403
      )
    }
  }
}

export function assertCanApprovePlan(
  ctx: TeachingPlanAuthContext,
  scopeType: "SYSTEM" | "CAMPUS",
  campusId?: string | null
) {
  if (!ctx.canApprove) {
    throw new TeachingPlanAccessError(
      "Bạn không có quyền duyệt hoặc công bố Kế hoạch dạy học.",
      "FORBIDDEN",
      403
    )
  }
  if (
    scopeType === "CAMPUS" &&
    campusId &&
    !ctx.isFullAccess &&
    !ctx.allowedCampusIds.includes(campusId)
  ) {
    throw new TeachingPlanAccessError(
      "Bạn không có quyền duyệt kế hoạch thuộc cơ sở ngoài phạm vi phụ trách.",
      "SCOPE_VIOLATION",
      403
    )
  }
}

/**
 * Enforces that a teacher can only link periods to classes & subjects they are actually assigned to
 * (unless the actor is an authorized manager/approver within the class's campus scope).
 */
export async function assertCanLinkClassSubject(params: {
  ctx: TeachingPlanAuthContext
  classId: string
  subjectId: string
  academicYearId: string
  campusId?: string | null
}) {
  const { ctx, classId, subjectId, academicYearId, campusId } = params

  if (ctx.isFullAccess) return

  if (ctx.canManage) {
    if (campusId && !ctx.allowedCampusIds.includes(campusId)) {
      throw new TeachingPlanAccessError(
        "Lớp học thuộc cơ sở ngoài phạm vi quản lý của bạn.",
        "SCOPE_VIOLATION",
        403
      )
    }
    return
  }

  if (!ctx.teacherId) {
    throw new TeachingPlanAccessError(
      "Không tìm thấy hồ sơ giáo viên để xác thực phân công giảng dạy.",
      "FORBIDDEN",
      403
    )
  }

  // Check TeachingAssignment, TimetableSlot, or homeroomTeacher
  const [assignment, timetableSlot, homeroomClass] = await Promise.all([
    prisma.teachingAssignment.findFirst({
      where: {
        teacherId: ctx.teacherId,
        classId,
        subjectId,
        academicYearId,
      },
      select: { id: true },
    }),
    prisma.timetableSlot.findFirst({
      where: {
        classId,
        subjectId,
        status: "ACTIVE",
        OR: [
          { teacherId: ctx.teacherId },
          { coTeacherId: ctx.teacherId },
          { altTeacherId: ctx.teacherId },
        ],
      },
      select: { id: true },
    }),
    prisma.class.findFirst({
      where: {
        id: classId,
        homeroomTeacherId: ctx.teacherId,
        academicYearId,
      },
      select: { id: true, level: true },
    }),
  ])

  const isPrimaryHomeroom =
    Boolean(homeroomClass) &&
    (homeroomClass?.level || "").toLowerCase().includes("tiểu học")

  if (!assignment && !timetableSlot && !isPrimaryHomeroom) {
    throw new TeachingPlanAccessError(
      "Bạn không được phân công giảng dạy lớp và môn học này nên không thể gắn tiết kế hoạch dạy học.",
      "FORBIDDEN",
      403
    )
  }
}
