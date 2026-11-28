import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

/**
 * Chuẩn hóa mã vai trò để so khớp nhất quán trên toàn hệ thống SSM Sky-Line.
 * Giải quyết triệt để tình trạng lệch mã vai trò giữa `KT_DBCL` (mã legacy trong code)
 * và `KHAO_THI`, `ĐBCL` (mã thực tế trong bảng Role của CSDL).
 */
export function normalizeRoleCode(role?: string | null): string {
  return String(role || "")
    .trim()
    .normalize("NFC")
    .toUpperCase()
}

export function normalizeRoleCodeAscii(role?: string | null): string {
  return normalizeRoleCode(role)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Đ/g, "D")
    .replace(/\s+/g, "_")
}

export const ADMIN_ROLE_CODES = new Set([
  "ADMIN",
  "ADMINISTRATOR",
  "SUPER_ADMIN",
  "SUPERADMIN",
])

/**
 * Tất cả biến thể mã vai trò thuộc Ban Khảo thí & Đảm bảo Chất lượng (Ban KT&ĐBCL).
 */
export const KTDBCL_ROLE_CODES = new Set([
  "KT_DBCL",
  "KTDBCL",
  "KHAO_THI",
  "KHAOTHI",
  "ĐBCL",
  "DBCL",
  "BAN_KT_DBCL",
  "KT_VA_DBCL",
])

export function isAdminRole(role?: string | null): boolean {
  const norm = normalizeRoleCodeAscii(role)
  return ADMIN_ROLE_CODES.has(norm)
}

export function isKtdbclRole(role?: string | null): boolean {
  const norm = normalizeRoleCode(role)
  const ascii = normalizeRoleCodeAscii(role)
  return (
    KTDBCL_ROLE_CODES.has(norm) ||
    KTDBCL_ROLE_CODES.has(ascii) ||
    ascii.includes("KT_DBCL") ||
    ascii.includes("KTDBCL") ||
    ascii.includes("KHAO_THI") ||
    ascii === "DBCL"
  )
}

export function isAdminOrKtdbclRole(role?: string | null): boolean {
  return isAdminRole(role) || isKtdbclRole(role)
}

export function isParentRole(role?: string | null): boolean {
  return normalizeRoleCodeAscii(role) === "PARENT"
}

export function isStudentRole(role?: string | null): boolean {
  return normalizeRoleCodeAscii(role) === "STUDENT"
}

export function isManagementRole(role?: string | null): boolean {
  if (isAdminOrKtdbclRole(role)) return true
  const ascii = normalizeRoleCodeAscii(role)
  return [
    "GDCS",
    "GD_CS",
    "BGH",
    "BGH_MN",
    "TB_DHCM",
    "DHCM",
    "TBP",
    "TTCM",
    "TA&CTQT",
    "GIAO_VU",
    "GIAO_VU_CS",
  ].some((code) => ascii === code || ascii.includes(code))
}

export function isTeacherOrStaffPortalRole(role?: string | null): boolean {
  if (isAdminOrKtdbclRole(role) || isManagementRole(role)) return true
  const ascii = normalizeRoleCodeAscii(role)
  return [
    "TEACHER",
    "GV_MN",
    "GVNN",
    "GV",
    "GIAO_VIEN",
    "CTHS",
    "TVAN",
    "NS",
  ].some((code) => ascii === code || ascii.includes(code))
}

export interface ApiAccessOptions {
  /** Danh sách vai trò cho phép (nếu bỏ trống: chỉ cần đã đăng nhập) */
  allowedRoles?: string[]
  /** Tự động cho phép ADMIN & toàn bộ nhóm Ban KT&ĐBCL (`KHAO_THI`, `ĐBCL`, `KT_DBCL`) */
  allowKtdbcl?: boolean
  /** Chỉ cho phép nhân sự/giáo viên (chặn PARENT & STUDENT) */
  staffOnly?: boolean
}

export type ApiAccessResult =
  | {
      ok: true
      session: any
      userId: string
      role: string
    }
  | {
      ok: false
      response: NextResponse
    }

/**
 * Helper kiểm tra xác thực & phân quyền tập trung cho API Routes (Single Source of Truth).
 */
export async function requireApiAccess(
  options: ApiAccessOptions = {}
): Promise<ApiAccessResult> {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  const role = String((session?.user as any)?.role || "").trim()

  if (!session?.user || !userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized: Vui lòng đăng nhập" },
        { status: 401 }
      ),
    }
  }

  if (isAdminRole(role)) {
    return { ok: true, session, userId, role }
  }

  if (options.staffOnly && (isParentRole(role) || isStudentRole(role))) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden: Tài khoản không có quyền truy cập chức năng nội bộ" },
        { status: 403 }
      ),
    }
  }

  if (options.allowedRoles && options.allowedRoles.length > 0) {
    const userNorm = normalizeRoleCodeAscii(role)
    const allowedNormalized = options.allowedRoles.map(normalizeRoleCodeAscii)
    const matchedExplicit = allowedNormalized.includes(userNorm)
    const matchedKtdbcl =
      (options.allowKtdbcl || allowedNormalized.includes("KT_DBCL")) &&
      isKtdbclRole(role)

    if (!matchedExplicit && !matchedKtdbcl) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Forbidden: Bạn không có quyền thực hiện thao tác này" },
          { status: 403 }
        ),
      }
    }
  } else if (options.allowKtdbcl && !isKtdbclRole(role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden: Chỉ Ban KT&ĐBCL hoặc Quản trị viên mới có quyền truy cập" },
        { status: 403 }
      ),
    }
  }

  return { ok: true, session, userId, role }
}
