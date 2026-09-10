// @ts-nocheck
/**
 * session.ts - Multi-Level Scoping & Role-Based Access Control Helper
 * Supports 5 Positions: GĐCS, TB_DHCM (Trưởng Ban), TBP (Trưởng Bộ Phận), TTCM (Tổ trưởng), GV, NV
 * Supports 6 Divisions: BP_TRUNG_HOC, BP_TIEU_HOC, BP_MAM_NON, BP_STEM_ICT, BP_TA_CTQT, BP_HDNG_CTHS
 * Enforces Union Scope Principle for concurrent positions (kiêm nhiệm).
 */
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const FULL_ACCESS_ROLES = ["ADMIN", "ADMINISTRATOR", "SUPER_ADMIN", "SUPERADMIN", "KT_DBCL", "KTDBCL", "KHAO_THI"]

export interface AdminSession {
  userId: string
  teacherId?: string
  role: string
  positions: string[]
  isFullAccess: boolean
  isSuperAdmin: boolean
  isHeadOfAcademic: boolean  // Trưởng Ban ĐHCM (Xem toàn bộ 6 Bộ phận & mọi Tổ)
  isTBP: boolean             // Trưởng Bộ Phận
  isTTCM: boolean            // Tổ trưởng Chuyên môn
  isGDCS: boolean            // Giám đốc Cơ sở
  allowedCampusIds: string[] // Cơ sở của GĐCS
  managedDivisions: string[] // Danh sách các Bộ phận làm TBP: ["BP_TRUNG_HOC", "BP_TIEU_HOC", ...]
  managedDepartmentIds: string[] // Danh sách ID các Tổ làm TTCM hoặc trực thuộc
  primaryDepartmentId?: string
}

export async function getAdminSession(): Promise<AdminSession> {
  const session = await auth()
  if (!session || !session.user) {
    return {
      userId: "",
      role: "",
      positions: [],
      isFullAccess: false,
      isSuperAdmin: false,
      isHeadOfAcademic: false,
      isTBP: false,
      isTTCM: false,
      isGDCS: false,
      allowedCampusIds: [],
      managedDivisions: [],
      managedDepartmentIds: []
    }
  }

  const userId = (session.user as any)?.id || ""
  const role = (session.user as any)?.role || "PARENT"
  const upperRole = (role || "").toUpperCase().trim()
  const isSuperAdmin = ["ADMIN", "ADMINISTRATOR", "SUPER_ADMIN", "SUPERADMIN"].includes(upperRole)
  const isFullAccess = FULL_ACCESS_ROLES.includes(upperRole)

  // Fetch teacher profile, positions, department assignments & division assignments
  let teacher: any = null
  try {
    teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: {
        departmentAssignments: {
          include: { department: true }
        },
        divisionAssignments: true
      }
    })
  } catch (e) {
    console.error("Error fetching teacher profile for session:", e)
  }

  // Determine all active positions (including JSON concurrent positions)
  const positionsSet = new Set<string>()
  if (teacher?.position) positionsSet.add(teacher.position.trim())
  if (teacher?.positions) {
    try {
      const parsed = typeof teacher.positions === "string" ? JSON.parse(teacher.positions) : teacher.positions
      if (Array.isArray(parsed)) parsed.forEach((p: string) => positionsSet.add(p.trim()))
    } catch {}
  }
  if (["GDCS", "GĐCS", "GD_CS", "GĐ_CS"].some(r => upperRole.includes(r))) positionsSet.add("GĐCS")
  if (["BAN_DHCM", "DHCM", "TB_DHCM", "QLCM"].some(r => upperRole.includes(r))) positionsSet.add("TB_DHCM")

  const positions = Array.from(positionsSet)
  const upperPositions = positions.map(p => p.toUpperCase())

  const isHeadOfAcademic = isSuperAdmin || isFullAccess || upperPositions.some(p => ["TB_DHCM", "TRUONG_BAN_DHCM", "BAN_DHCM", "BAN ĐHCM", "QLCM"].includes(p))
  const isTBP = isHeadOfAcademic || upperPositions.includes("TBP") || (teacher?.divisionAssignments && teacher.divisionAssignments.length > 0)
  const isTTCM = isHeadOfAcademic || isTBP || upperPositions.includes("TTCM") || (teacher?.departmentAssignments && teacher.departmentAssignments.some((da: any) => da.position === "TTCM"))
  const isGDCS = upperPositions.includes("GĐCS") || upperPositions.includes("GDCS") || ["GDCS", "GĐCS", "GD_CS", "GĐ_CS"].some(r => upperRole.includes(r))

  // Determine Campus Scoping (GĐCS has 1 campus)
  const tokenCampusIds: string[] = (session.user as any)?.campusIds || []
  let allowedCampusIds = tokenCampusIds
  if (!allowedCampusIds.length && userId) {
    const assignments = await prisma.userCampusAssignment.findMany({ where: { userId }, select: { campusId: true } }).catch(() => [])
    allowedCampusIds = assignments.map((a: any) => a.campusId)
  }
  if (!allowedCampusIds.length && teacher?.campusId) {
    allowedCampusIds = [teacher.campusId]
  }

  // Determine Managed Divisions (TBP)
  const managedDivisionsSet = new Set<string>()
  if (teacher?.divisionAssignments) {
    teacher.divisionAssignments.forEach((da: any) => {
      if (da.divisionCode) managedDivisionsSet.add(da.divisionCode)
    })
  }

  // Determine Managed Departments (TTCM)
  const managedDepartmentIdsSet = new Set<string>()
  if (teacher?.departmentAssignments) {
    teacher.departmentAssignments.forEach((da: any) => {
      if (da.position === "TTCM" || isTBP || isHeadOfAcademic) {
        if (da.departmentId) managedDepartmentIdsSet.add(da.departmentId)
      }
    })
  }
  if (teacher?.departmentId && (isTTCM || isTBP || isHeadOfAcademic)) {
    managedDepartmentIdsSet.add(teacher.departmentId)
  }

  return {
    userId,
    teacherId: teacher?.id,
    role,
    positions,
    isFullAccess: isFullAccess || isHeadOfAcademic,
    isSuperAdmin,
    isHeadOfAcademic,
    isTBP: Boolean(isTBP),
    isTTCM: Boolean(isTTCM),
    isGDCS: Boolean(isGDCS),
    allowedCampusIds,
    managedDivisions: Array.from(managedDivisionsSet),
    managedDepartmentIds: Array.from(managedDepartmentIdsSet),
    primaryDepartmentId: teacher?.departmentId || undefined
  }
}

/**
 * Resolves all Department IDs that this session has authority to view/manage.
 * If Head of Academic / SuperAdmin -> Returns null (unrestricted)
 * Otherwise -> Returns Array of Department IDs (Union of managed divisions & direct departments)
 */
export async function getScopedDepartmentIds(session: AdminSession): Promise<string[] | null> {
  if (session.isSuperAdmin || session.isHeadOfAcademic) {
    return null // Unrestricted
  }

  const deptIds = new Set<string>(session.managedDepartmentIds)

  if (session.managedDivisions.length > 0) {
    try {
      const deptsInDivisions = await prisma.department.findMany({
        where: { divisionCode: { in: session.managedDivisions }, status: "ACTIVE" },
        select: { id: true }
      })
      deptsInDivisions.forEach(d => deptIds.add(d.id))
    } catch (e) {
      console.error("Error fetching depts in divisions:", e)
    }
  }

  return Array.from(deptIds)
}

/**
 * Filter helper for campus scoping
 */
export function campusFilter(field: string, session: AdminSession): Record<string, any> {
  if (session.isFullAccess || session.isHeadOfAcademic || session.allowedCampusIds.length === 0) return {}
  return { [field]: { in: session.allowedCampusIds } }
}
