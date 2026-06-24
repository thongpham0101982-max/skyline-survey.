import { ChatBotWidget } from "@/components/ChatBotWidget"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/Sidebar"
import { auth } from "@/lib/auth"
import { UserMenu } from "@/components/UserMenu"
import { AcademicYearSelector } from "@/components/AcademicYearSelector"
import { prisma } from "@/lib/db"

export default async function KTDCBLLayout({ children }: { children: React.ReactNode }) {
  let session: any = null
  try {
    session = await auth()
  } catch (e) {
    console.error("Auth fail in KTDBCL Layout:", e)
  }

  if (!session) {
    redirect("/login")
  }

  const roleCode = (session?.user as any)?.role || "KT_DBCL"
  let readableModules: string[] = []

  try {
    const pAny = prisma as any
    if (pAny && pAny.permission) {
      const permissions = await pAny.permission.findMany({ where: { roleCode } }).catch(() => [])
      readableModules = permissions.filter((p: any) => p.canRead).map((p: any) => p.module)
    }
  } catch (error) {
    console.error("KTDBCL layout DB error:", error)
  }

  const hasKTDBCLPermission = roleCode === "ADMIN" || readableModules.includes("KTDBCL_EXAMS")
  if (!hasKTDBCLPermission) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen text-xs font-semibold">
      <Sidebar 
        role="ADMIN" 
        permissionModules={readableModules} 
        actualRole={roleCode} 
      />
      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="hidden md:flex text-sm font-medium text-slate-500">
              <span className="text-[#00B5E2] font-bold">Khảo thí & ĐBCL</span>
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
