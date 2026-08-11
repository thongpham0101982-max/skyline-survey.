export const dynamic = "force-dynamic"
import { ChatBotWidget } from "@/components/ChatBotWidget"
import { redirect } from "next/navigation"

import { Sidebar } from "@/components/Sidebar"
import { NotificationBell } from "@/components/NotificationBell"
import { auth } from "@/lib/auth"
import { UserMenu } from "@/components/UserMenu"
import { AcademicYearSelector } from "@/components/AcademicYearSelector"
import { prisma } from "@/lib/db"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let session: any = null
  try {
    session = await auth()
  } catch (e) {
    console.error("Auth fail in AdminLayout:", e)
  }

  const roleCode = (session?.user as any)?.role || "ADMIN"
  let readableModules: string[] = []
  let taskCount = 0
  let isTTCM = false

  try {
    const pAny = prisma as any
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
    if (session?.user?.id) {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: session.user.id },
        select: { position: true }
      }).catch(() => null)
      isTTCM = teacher?.position === "TTCM"
    }
  } catch (error) {
    console.error("Admin layout DB error:", error)
  }

  // Redirect teachers without admin permissions to the teacher workspace
  const isTeacher = ['TEACHER', 'GV_MN'].includes(roleCode);
  if (isTeacher && roleCode !== "ADMIN" && readableModules.length === 0) {
    redirect("/teacher")
  }

  return (
    <div className="flex min-h-screen text-xs font-semibold">
      <Sidebar 
        role="ADMIN" 
        permissionModules={readableModules} 
        actualRole={roleCode} 
        taskCount={taskCount} 
        isTTCM={isTTCM} 
      />
      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="hidden md:flex text-sm font-medium text-slate-500">
              <span className="text-[#00A99D] font-bold">Admin</span>
              <span className="mx-2">/</span>
              <span>Workspace</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <AcademicYearSelector />
            <UserMenu session={session} />
          </div>
        </header>
        <div className="p-4 sm:p-6 md:p-8 flex-1 overflow-x-hidden overflow-y-auto text-xs font-semibold">
          {children}
        </div>
        
        <ChatBotWidget role="ADMIN" />
      </main>
    </div>
  )
}
