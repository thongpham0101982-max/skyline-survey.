/**
 * session.ts - Helper for campus-scoped access control.
 * Non-ADMIN roles (e.g. GD_CS) can only see data for their assigned campuses.
 */
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const FULL_ACCESS_ROLES = ["ADMIN", "ADMINISTRATOR"]

export interface AdminSession {
  userId: string
  role: string
  allowedCampusIds: string[]
  isFullAccess: boolean
}

export async function getAdminSession(): Promise<AdminSession> {
  const session = await auth()
  const userId = (session?.user as any)?.id || ""
  const role = (session?.user as any)?.role || "ADMIN"
  const isFullAccess = FULL_ACCESS_ROLES.includes(role)
  if (isFullAccess) return { userId, role, allowedCampusIds: [], isFullAccess: true }

  const tokenCampusIds: string[] = (session?.user as any)?.campusIds || []
  let allowedCampusIds = tokenCampusIds
  if (!allowedCampusIds.length) {
    const assignments = await prisma.userCampusAssignment.findMany({ where: { userId }, select: { campusId: true } })
    allowedCampusIds = assignments.map((a: any) => a.campusId)
  }
  return { userId, role, allowedCampusIds, isFullAccess: false }
}

export function campusFilter(field: string, session: AdminSession): Record<string, any> {
  if (session.isFullAccess || session.allowedCampusIds.length === 0) return {}
  return { [field]: { in: session.allowedCampusIds } }
}
