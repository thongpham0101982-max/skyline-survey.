import { Sidebar } from "@/components/Sidebar"
import { NotificationBell } from "@/components/NotificationBell"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let session: any = null;
  try {
    session = await auth()
  } catch (e) {
    console.error("Auth fail in AdminLayout:", e);
  }
  
  const roleCode = (session?.user as any)?.role || "ADMIN"
  
  let readableModules: string[] = []
  let taskCount = 0

  try {
    const pAny = prisma as any;
    if (pAny && pAny.permission) {
      const permissions = await pAny.permission.findMany({ where: { roleCode } }).catch(() => [])
      readableModules = permissions.filter((p: any) => p.canRead).map((p: any) => p.module)
    }

    if (pAny && pAny.workTask) {
      const currentUserId = (session?.user as any)?.id || ""
      taskCount = await pAny.workTask.count({
        where: {
          OR: [
            { assignedToUserId: currentUserId, progress: { in: ["PENDING", "IN_PROGRESS"] } },
            { assignedToRole: roleCode, assignedToUserId: null, progress: { in: ["PENDING", "IN_PROGRESS"] } }
          ]
        }
      }).catch(() => 0)
    }
  } catch (error) {
    console.error("Admin layout DB error:", error)
  }
  
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="ADMIN" permissionModules={readableModules} actualRole={roleCode} taskCount={taskCount} />
      <main className="flex-1 p-4 sm:p-6 md:p-8 pt-16 md:pt-8 relative">
        <NotificationBell />
        {children}
      </main>
    </div>
  )
}
