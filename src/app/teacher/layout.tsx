export const dynamic = "force-dynamic"
import { ChatBotWidget } from "@/components/ChatBotWidget"
import { MobileMenuTrigger } from "@/components/MobileMenuTrigger"
import { Sidebar } from "@/components/Sidebar"
import { auth } from "@/lib/auth"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { AcademicYearSelector } from "@/components/AcademicYearSelector"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  let session: any = null;
  try {
    session = await auth()
  } catch (e) {
    console.error("Auth fail in TeacherLayout:", e);
  }

  if (!session) {
    redirect("/login")
  }

  const roleCode = (session?.user as any)?.role || "TEACHER"

  let isGVCN = false
  let readableModules: string[] = []
  try {
    const pAny = prisma as any
    if (pAny && pAny.permission) {
      const normRole = (roleCode || "").trim()
      const roleVariants = Array.from(new Set([
        normRole,
        normRole.toUpperCase(),
        normRole.toLowerCase(),
        normRole.replace(/\s+/g, "_"),
        normRole.replace(/_/g, " "),
        normRole.toUpperCase().replace(/\s+/g, "_"),
        normRole.toUpperCase().replace(/_/g, " ")
      ]))

      const permissions = await pAny.permission.findMany({ 
        where: { roleCode: { in: roleVariants } } 
      }).catch(() => [])
      readableModules = permissions.filter((p: any) => p.canRead).map((p: any) => p.module)

      const { APP_CATEGORIES: categories } = require("@/config/modules")
      categories.forEach((cat: any) => {
        cat.modules.forEach((m: any) => {
          if (m.subModules && m.subModules.length > 0) {
            const hasReadableSub = m.subModules.some((sub: any) => readableModules.includes(sub.code))
            if (hasReadableSub && !readableModules.includes(m.code)) {
              readableModules.push(m.code)
            }
          }
        })
      })
    }
  } catch (err) {
    console.error("Teacher layout permission DB error:", err)
  }

  if (session?.user?.id) {
    try {
      const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } }).catch(() => null)
      if (teacher) {
        const homeroomClassesCount = await prisma.class.count({
          where: {
            OR: [
              { homeroomTeacherId: teacher.id },
              { homeroomTeacherId: { contains: teacher.id } }
            ]
          }
        }).catch(() => 0)
        isGVCN = homeroomClassesCount > 0
      }
    } catch (err) {
      console.error("Error querying isGVCN in layout:", err)
    }
  }

  return (
    <div className="flex min-h-screen text-xs font-semibold">
      <Sidebar role="TEACHER" permissionModules={readableModules} actualRole={roleCode} isGVCN={isGVCN} isPreschoolTeacher={isPreschoolTeacher} />
      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <MobileMenuTrigger />
            <div className="hidden md:flex text-sm font-medium text-slate-500">
              <span className="text-[#48BFE3] font-bold">Giáo viên</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <AcademicYearSelector />
             <NotificationBell />
             <UserMenu session={session} />
          </div>
        </header>
        <div className="p-4 sm:p-6 md:p-8 flex-1 overflow-x-hidden overflow-y-auto text-xs font-semibold">
          {children}
        </div>
        
        <ChatBotWidget role="TEACHER" />
      </main>
    </div>
  )
}
