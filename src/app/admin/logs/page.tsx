import { prisma } from "@/lib/db"
import { LogsClient } from "./client"
import { getAdminSession } from "@/lib/session"

export const metadata = { title: "Nhật ký Hệ thống | Admin Portal" }
export const dynamic = "force-dynamic"

export default async function LogsPage({ searchParams }: { searchParams: any }) {
  const session = await getAdminSession() // Enforce admin session verification
  
  const params = await searchParams;
  const page = parseInt(params.page) || 1
  const limit = 10 // Show 10 rows per page as requested
  const search = params.search || ""
  const action = params.action || ""
  const roleFilter = params.role || ""

  const where: any = {}
  
  if (search) {
    where.OR = [
      { userEmail: { contains: search } },
      { targetTable: { contains: search } },
      { action: { contains: search } },
      { newValues: { contains: search } }
    ]
  }
  
  if (action) {
    where.action = action
  }

  // Fetch all roles to map codes to names
  const roles = await prisma.role.findMany({
    select: { code: true, name: true }
  })
  const roleMap = new Map(roles.map(r => [r.code, r.name]))

  // If filtering by role, we find matching userIds and userEmails to catch all logs for all accounts of that group
  if (roleFilter) {
    const usersWithRole = await prisma.user.findMany({
      where: { role: roleFilter },
      select: { id: true, email: true }
    })
    const userIds = usersWithRole.map(u => u.id)
    const userEmails = usersWithRole.map(u => u.email).filter(Boolean)
    
    where.OR = [
      { userId: { in: userIds } },
      { userEmail: { in: userEmails } }
    ]
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.auditLog.count({ where })
  ])

  // Fetch users for the current page logs to match roles and full names
  const logUserIds = Array.from(new Set(logs.map(l => l.userId).filter(id => id && id !== "N/A" && id !== "SYSTEM")))
  const users = await prisma.user.findMany({
    where: { id: { in: logUserIds } },
    select: { id: true, role: true, fullName: true }
  })
  const userRoleMap = new Map(users.map(u => [u.id, u.role]))
  const userFullNameMap = new Map(users.map(u => [u.id, u.fullName]))

  const mappedLogs = logs.map(log => {
    let roleCode = userRoleMap.get(log.userId) || null
    let fullName = userFullNameMap.get(log.userId) || null
    
    // Fallback detection from email/actions
    if (!roleCode && log.userEmail) {
      if (log.userEmail.includes("teacher")) {
        roleCode = "TEACHER";
      } else if (log.userEmail === "admin@skyline.edu") {
        roleCode = "ADMIN";
        fullName = "System Admin";
      }
    }

    return {
      ...log,
      roleCode,
      roleName: roleCode ? (roleMap.get(roleCode) || roleCode) : "Hệ thống / Khách",
      userFullName: fullName || "—"
    }
  })

  // Get distinct actions for filtering list
  const actionsResult = await prisma.auditLog.groupBy({
    by: ['action']
  })

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Nhật ký Hệ thống (Audit Logs)</h1>
        <p className="text-slate-500 mt-1">Theo dõi hoạt động đăng nhập, thay đổi dữ liệu của tài khoản nhân sự và giáo viên.</p>
      </div>
      <LogsClient 
        initialLogs={mappedLogs} 
        total={total} 
        page={page} 
        limit={limit} 
        search={search} 
        selectedAction={action} 
        selectedRole={roleFilter}
        actions={actionsResult.map(a => a.action).filter(Boolean)} 
        roles={roles}
      />
    </div>
  )
}
