import { AdminMobileBottomNav } from "@/components/AdminMobileBottomNav"
export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import Link from "next/link"
import { GraduationCap } from "lucide-react"

import { Sidebar } from "@/components/Sidebar"
import { MobileMenuTrigger } from "@/components/MobileMenuTrigger"
import { NotificationBell } from "@/components/NotificationBell"
import { auth } from "@/lib/auth"
import { UserMenu } from "@/components/UserMenu"
import { AcademicYearSelector } from "@/components/AcademicYearSelector"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
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
    <div className="admin-layout-wrapper flex min-h-dvh text-xs font-medium text-slate-800 bg-[#F8FAFC]">
      <Sidebar 
        role="ADMIN" 
        permissionModules={readableModules} 
        actualRole={roleCode} 
        taskCount={taskCount} 
        isTTCM={isTTCM} 
      />
      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden bg-[#F8FAFC]">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <MobileMenuTrigger />
            <div className="flex items-center gap-2.5">
              <img 
                src="/logo.png" 
                alt="Sky-Line" 
                className="h-7 w-auto object-contain md:hidden" 
              />
              <div className="flex flex-col">
                <span className="text-xs md:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#003B3A] text-white text-[11px] font-bold tracking-normal">
                    SQMS
                  </span>
                  <span className="hidden md:inline text-xs font-semibold text-slate-600">Quản trị hệ thống</span>
                </span>
                <span className="md:hidden text-[9px] text-[#00736E] font-semibold leading-none mt-0.5">Quản trị</span>
              </div>
            </div>
            {isTeacherUser && (
              <Link 
                href="/teacher" 
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-[#00736E] hover:bg-[#CCFBF1]/60 font-semibold text-xs transition-all shrink-0"
              >
                <GraduationCap className="w-4 h-4 text-[#00A19A]" />
                <span>Không gian Giáo viên</span>
              </Link>
            )}

            {/* Container cho các thẻ Giáo viên • CS1 và Cơ sở: Hill | Global | Hệ thống */}
            <div id="teacher-top-header-slot" className="hidden sm:flex items-center gap-2 ml-1 sm:ml-2 flex-wrap" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <AcademicYearSelector />
            <NotificationBell />
            <UserMenu session={session} permissionModules={readableModules} />
          </div>
        </header>
        <div className="p-3.5 sm:p-6 md:p-8 pb-24 md:pb-12 flex-1 overflow-x-auto overflow-y-auto text-xs font-medium text-slate-800">
          {children}
        </div>
        
        <AdminMobileBottomNav />

      </main>
    </div>
  )
}
