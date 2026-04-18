import { Sidebar } from "@/components/Sidebar"
import { NotificationBell } from "@/components/NotificationBell"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const roleCode = (session?.user as any)?.role || "ADMIN"
  
  let readableModules: string[] = []
  let taskCount = 0

  try {
    const permissions = await prisma.permission.findMany({ where: { roleCode } })
    readableModules = permissions.filter(p => p.canRead).map(p => p.module)

    const currentUserId = (session?.user as any)?.id || ""
    taskCount = await prisma.workTask.count({
      where: {
        OR: [
          { assignedToUserId: currentUserId, progress: { in: ["PENDING", "IN_PROGRESS"] } },
          { assignedToRole: roleCode, assignedToUserId: null, progress: { in: ["PENDING", "IN_PROGRESS"] } }
        ]
      }
    })
  } catch (error) {
    console.error("Admin layout DB error:", error)
  }
  
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="ADMIN" permissionModules={readableModules} actualRole={roleCode} taskCount={taskCount} />
      <main className="flex-1 p-8 relative">
        <NotificationBell />
        {children}
      </main>
    </div>
  )
}
