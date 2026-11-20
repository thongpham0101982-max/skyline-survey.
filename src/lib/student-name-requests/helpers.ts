import { prisma } from "@/lib/db"
import { getRolePermissions } from "@/lib/permissions"

export type NameChangeStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface NameChangeValidationResult {
  valid: boolean
  error?: string
  cleanedNewName?: string
  cleanedReason?: string
}

/**
 * Validates the input payload for creating or updating a student name change request.
 */
export function validateNameChangeInput(params: {
  oldName: string
  newName: string
  reason: string
}): NameChangeValidationResult {
  const cleanedNewName = String(params.newName || "")
    .replace(/\s+/g, " ")
    .trim()
  const cleanedOldName = String(params.oldName || "")
    .replace(/\s+/g, " ")
    .trim()
  const cleanedReason = String(params.reason || "").trim()

  if (!cleanedNewName) {
    return { valid: false, error: "Vui lòng nhập tên mới của học sinh." }
  }
  if (cleanedNewName.length < 2) {
    return { valid: false, error: "Tên mới của học sinh quá ngắn (tối thiểu 2 ký tự)." }
  }
  if (cleanedNewName.length > 150) {
    return { valid: false, error: "Tên mới của học sinh không được vượt quá 150 ký tự." }
  }
  if (cleanedNewName === cleanedOldName) {
    return { valid: false, error: "Tên mới trùng khớp hoàn toàn với họ tên hiện tại của học sinh." }
  }
  if (!cleanedReason) {
    return { valid: false, error: "Vui lòng nhập lý do đổi tên học sinh." }
  }
  if (cleanedReason.length > 1000) {
    return { valid: false, error: "Lý do đổi tên không được vượt quá 1000 ký tự." }
  }

  return {
    valid: true,
    cleanedNewName,
    cleanedReason,
  }
}

/**
 * Checks if a request status allows editing or deletion.
 */
export function canModifyRequestStatus(status: string): boolean {
  return status === "PENDING" || status === "REJECTED"
}

/**
 * Natural sort order for grade names (Mầm non -> Khối 1..12 -> others).
 */
export function sortGradeValues(grades: string[]): string[] {
  const unique = Array.from(new Set(grades.map((g) => String(g || "").trim()).filter(Boolean)))
  return unique.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ""), 10)
    const numB = parseInt(b.replace(/\D/g, ""), 10)
    const isNumA = !Number.isNaN(numA) && /^\D*\d+\D*$/.test(a)
    const isNumB = !Number.isNaN(numB) && /^\D*\d+\D*$/.test(b)

    const isMnA = a.toLowerCase().includes("mầm") || a.toLowerCase().includes("nhà trẻ") || a.toLowerCase().includes("mẫu giáo") || a.toLowerCase().includes("mn")
    const isMnB = b.toLowerCase().includes("mầm") || b.toLowerCase().includes("nhà trẻ") || b.toLowerCase().includes("mẫu giáo") || b.toLowerCase().includes("mn")

    if (isMnA && !isMnB) return -1
    if (!isMnA && isMnB) return 1
    if (isNumA && isNumB && numA !== numB) return numA - numB
    return a.localeCompare(b, "vi")
  })
}

const APPROVER_ROLES = new Set([
  "ADMIN",
  "SUPER_ADMIN",
  "SUPERADMIN",
  "BGH",
  "BGH_PT",
  "BGH_MN",
  "GDCS",
  "GIAO_VU",
  "GVU",
  "KTDBCL",
  "TRUONG_BAN",
  "LANH_DAO",
])

interface PermissionRecord {
  module?: string
  canRead?: boolean
  canUpdate?: boolean
}

export async function canUserApproveNameChange(roleCode?: string | null): Promise<boolean> {
  if (!roleCode) return false
  const norm = roleCode.toUpperCase().trim().replace(/\s+/g, "_")
  if (APPROVER_ROLES.has(norm)) return true

  try {
    const perms = (await getRolePermissions(roleCode)) as PermissionRecord[]
    return perms.some(
      (p) =>
        (p.module === "STUDENT_NAME_REQUESTS" || p.module === "MANAGE_CLASSES" || p.module === "STUDENT_TRANSFERS") &&
        Boolean(p.canUpdate)
    )
  } catch {
    return false
  }
}

export async function canUserAccessNameChange(roleCode?: string | null): Promise<boolean> {
  if (!roleCode) return false
  const norm = roleCode.toUpperCase().trim().replace(/\s+/g, "_")
  if (norm === "PARENT" || norm === "STUDENT") return false
  if (APPROVER_ROLES.has(norm) || norm === "TEACHER" || norm === "GV" || norm === "GVCN") return true

  try {
    const perms = (await getRolePermissions(roleCode)) as PermissionRecord[]
    return perms.some(
      (p) =>
        (p.module === "STUDENT_NAME_REQUESTS" || p.module === "MANAGE_CLASSES" || p.module === "STUDENT_TRANSFERS") &&
        Boolean(p.canRead)
    )
  } catch {
    return false
  }
}

/**
 * Syncs approved student name change to entrance assessment tables if a matching studentCode exists.
 */
export async function syncStudentNameAcrossTables(studentCode: string, newName: string): Promise<void> {
  const codeUpper = String(studentCode || "").trim().toUpperCase()
  if (!codeUpper) return

  const pDyn = prisma as unknown as {
    inputAssessmentStudent?: { updateMany: (args: Record<string, unknown>) => Promise<unknown> }
    preschoolInputAssessmentStudent?: { updateMany: (args: Record<string, unknown>) => Promise<unknown> }
  }
  try {
    if (pDyn.inputAssessmentStudent) {
      await pDyn.inputAssessmentStudent.updateMany({
        where: { studentCode: codeUpper },
        data: { fullName: newName },
      })
    }
    if (pDyn.preschoolInputAssessmentStudent) {
      await pDyn.preschoolInputAssessmentStudent.updateMany({
        where: { studentCode: codeUpper },
        data: { fullName: newName },
      })
    }
  } catch (err) {
    console.error("[StudentNameChange] Sync assessment student name error:", err)
  }
}
