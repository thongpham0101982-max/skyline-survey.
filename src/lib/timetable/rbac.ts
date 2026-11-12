import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { hasModulePermission } from "@/lib/permissions"
import { getAdminSession, type AdminSession } from "@/lib/session"
import { doesClassBelongToScope, inferScopeGroupForClass } from "./scopeResolver"
import type { ManageableScopeGroup, ScopeGroup } from "./types"

export class TimetableAccessError extends Error {
  public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "SCOPE_VIOLATION" | "CONFLICT"

  constructor(
    message: string,
    code: "UNAUTHENTICATED" | "FORBIDDEN" | "SCOPE_VIOLATION" | "CONFLICT" = "FORBIDDEN"
  ) {
    super(message)
    this.name = "TimetableAccessError"
    this.code = code
  }
}

export interface TimetableAuthContext {
  adminSession: AdminSession
  actorId: string
  actorName: string
  actorRole: string
  isFullAccess: boolean
  allowedCampusIds: string[]
}

/**
 * Verifies module permission + campus scope at the server action boundary.
 * Never trusts client-provided role, campusId, or level.
 */
export async function requireTimetablePermission(
  action: "canRead" | "canCreate" | "canUpdate" | "canDelete",
  options?: {
    subModuleCode?: string
    campusIds?: string[]
    scopeGroup?: ScopeGroup
    allowLienCap?: boolean
  }
): Promise<TimetableAuthContext> {
  const [rawAuth, adminSession] = await Promise.all([auth(), getAdminSession()])

  if (!adminSession.userId || !adminSession.role) {
    throw new TimetableAccessError(
      "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      "UNAUTHENTICATED"
    )
  }

  const modulesToCheck = ["TIMETABLE"]
  if (options?.subModuleCode) {
    modulesToCheck.push(options.subModuleCode)
  }

  const hasPerm = await hasModulePermission(adminSession.role, modulesToCheck, action)
  if (!hasPerm) {
    throw new TimetableAccessError(
      "Tài khoản của bạn không có quyền thực hiện thao tác này trên phân hệ Thời khóa biểu.",
      "FORBIDDEN"
    )
  }

  if (options?.scopeGroup === "LIEN_CAP" && !options?.allowLienCap) {
    throw new TimetableAccessError(
      "Chế độ 'Liên cấp' chỉ dùng để xem và tra cứu tổng hợp, không lưu trực tiếp như một cấp học.",
      "SCOPE_VIOLATION"
    )
  }

  const unrestrictedCampus =
    adminSession.isFullAccess ||
    adminSession.isSuperAdmin ||
    adminSession.isHeadOfAcademic

  if (!unrestrictedCampus) {
    if (adminSession.allowedCampusIds.length === 0) {
      throw new TimetableAccessError(
        "Tài khoản chưa được phân quyền phạm vi cơ sở.",
        "FORBIDDEN"
      )
    }

    if (options?.campusIds && options.campusIds.length > 0) {
      const unauthorized = options.campusIds.filter(
        (cid) => cid && !adminSession.allowedCampusIds.includes(cid)
      )
      if (unauthorized.length > 0) {
        throw new TimetableAccessError(
          "Bạn không có quyền truy cập hoặc thao tác dữ liệu của cơ sở ngoài phạm vi được phân công.",
          "SCOPE_VIOLATION"
        )
      }
    }
  }

  const actorName =
    (rawAuth?.user as any)?.name ||
    (rawAuth?.user as any)?.email ||
    adminSession.userId

  return {
    adminSession,
    actorId: adminSession.userId,
    actorName: String(actorName),
    actorRole: adminSession.role,
    isFullAccess: unrestrictedCampus,
    allowedCampusIds: adminSession.allowedCampusIds,
  }
}

export function assertCampusAllowed(ctx: TimetableAuthContext, campusId: string) {
  if (!campusId) {
    throw new TimetableAccessError("Thiếu thông tin cơ sở (campusId).", "SCOPE_VIOLATION")
  }
  if (!ctx.isFullAccess && !ctx.allowedCampusIds.includes(campusId)) {
    throw new TimetableAccessError(
      "Cơ sở được chọn nằm ngoài phạm vi quyền hạn của tài khoản.",
      "SCOPE_VIOLATION"
    )
  }
}

/**
 * Verifies from DB that every target class belongs to the expected academicYearId, campusId, and scopeGroup.
 */
export async function verifyClassesBelongToScope(params: {
  classIds: string[]
  academicYearId: string
  campusId: string
  scopeGroup: ManageableScopeGroup
}) {
  const uniqueIds = Array.from(new Set(params.classIds.filter(Boolean)))
  if (uniqueIds.length === 0) return new Map<string, any>()

  const [campus, classes] = await Promise.all([
    prisma.campus.findUnique({ where: { id: params.campusId } }),
    prisma.class.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        className: true,
        campusId: true,
        academicYearId: true,
        level: true,
        grade: true,
        educationSystem: true,
        homeroomTeacherId: true,
        status: true,
      },
    }),
  ])

  if (!campus) {
    throw new TimetableAccessError("Không tìm thấy cơ sở trong hệ thống.", "SCOPE_VIOLATION")
  }

  const map = new Map<string, (typeof classes)[number]>()
  for (const c of classes) {
    map.set(c.id, c)
  }

  for (const cid of uniqueIds) {
    const cls = map.get(cid)
    if (!cls) {
      throw new TimetableAccessError(`Lớp học (${cid}) không tồn tại trong hệ thống.`, "SCOPE_VIOLATION")
    }
    if (cls.campusId !== params.campusId) {
      throw new TimetableAccessError(
        `Lớp ${cls.className} không thuộc cơ sở đang chọn — chặn ghi chéo cơ sở.`,
        "SCOPE_VIOLATION"
      )
    }
    if (cls.academicYearId !== params.academicYearId) {
      throw new TimetableAccessError(
        `Lớp ${cls.className} không thuộc năm học đang chọn.`,
        "SCOPE_VIOLATION"
      )
    }
    if (!doesClassBelongToScope(cls, campus, params.scopeGroup, "ALL")) {
      const actualScope = inferScopeGroupForClass(cls, campus)
      throw new TimetableAccessError(
        `Lớp ${cls.className} (${cls.level}) thuộc bộ TKB ${actualScope || "khác"}, không thuộc bộ TKB ${params.scopeGroup}.`,
        "SCOPE_VIOLATION"
      )
    }
  }

  return map
}

export async function verifyEditableVersion(
  ctx: TimetableAuthContext,
  versionId: string,
  expectedRevision?: number
) {
  const version = await prisma.timetableVersion.findUnique({
    where: { id: versionId },
  })
  if (!version) {
    throw new TimetableAccessError("Không tìm thấy phiên bản thời khóa biểu.", "SCOPE_VIOLATION")
  }

  assertCampusAllowed(ctx, version.campusId)

  if (version.status !== "DRAFT") {
    throw new TimetableAccessError(
      `Phiên bản "${version.name}" đang ở trạng thái ${version.status}. Chỉ được phép chỉnh sửa trực tiếp bản Nháp (DRAFT); nếu lịch đã ban hành vui lòng tạo phiên bản mới.`,
      "FORBIDDEN"
    )
  }

  if (
    typeof expectedRevision === "number" &&
    expectedRevision > 0 &&
    version.revision !== expectedRevision
  ) {
    throw new TimetableAccessError(
      `Phiên bản đã được người dùng khác cập nhật (revision hiện tại: ${version.revision}, bản đang mở: ${expectedRevision}). Vui lòng tải lại trước khi lưu để tránh ghi đè.`,
      "CONFLICT"
    )
  }

  return version
}
