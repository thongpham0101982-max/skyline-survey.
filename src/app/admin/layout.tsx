export const dynamic = "force-dynamic"
import { ChatBotWidget } from "@/components/ChatBotWidget"
import { redirect } from "next/navigation"
import Link from "next/link"
import { GraduationCap } from "lucide-react"

import { Sidebar } from "@/components/Sidebar"
import { MobileMenuTrigger } from "@/components/MobileMenuTrigger"
import { NotificationBell } from "@/components/NotificationBell"
import { auth } from "@/lib/auth"
import { UserMenu } from "@/components/UserMenu"
import { AcademicYearSelector } from "@/components/AcademicYearSelector"
import { prisma } from "@/lib/db"
import { APP_CATEGORIES } from "@/config/modules"
import { getRoleReadableModules } from "@/lib/permissions"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let session: any = null
  try {
    session = await auth()
  } catch (e) {
    console.error("Auth fail in AdminLayout:", e)
  }

  if (!session?.user) {
    redirect("/login")
  }

  const roleCode = (session?.user as any)?.role || "PARENT"
  const upperRole = (roleCode || "").toUpperCase().trim()
  let readableModules: string[] = []
  let taskCount = 0
  let isTTCM = false
  let hasTeacherProfile = false

  try {
    const pAny = prisma as any
    readableModules = await getRoleReadableModules(roleCode)
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
        select: { position: true, id: true }
      }).catch(() => null)
      if (teacher) {
        hasTeacherProfile = true
        isTTCM = teacher?.position === "TTCM"
      }
    }
  } catch (error) {
    console.error("Admin layout DB error:", error)
  }

  const isTeacherUser = ["TEACHER", "GV_MN", "GVNN", "GV", "GIAO_VIEN"].includes(upperRole) || hasTeacherProfile;

  // Redirect teachers without specific admin permissions to the teacher workspace
  if (["TEACHER", "GV_MN", "GVNN", "GV", "GIAO_VIEN"].includes(upperRole) && !["ADMIN", "SUPER_ADMIN"].includes(upperRole)) {
    const adminOnlyModules = readableModules.filter(m => !["TASKS", "WEEKLY_REPORTS"].includes(m))
    if (adminOnlyModules.length === 0) {
      redirect("/teacher")
    }
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
              <span className="text-[#48BFE3] font-bold">Admin</span>
              <span className="mx-2">/</span>
              <span>Workspace</span>
            </div>
            {isTeacherUser && (
              <Link 
                href="/teacher" 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-[#1E8B87] hover:bg-teal-100/80 font-bold text-xs transition-all shadow-xs"
              >
                <GraduationCap className="w-4 h-4 text-[#1E8B87]" />
                <span>Giao diện Giáo viên</span>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4">
            <AcademicYearSelector />
            <NotificationBell />
            <UserMenu session={session} permissionModules={readableModules} />
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
