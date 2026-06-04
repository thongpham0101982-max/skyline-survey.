import { Sidebar } from "@/components/Sidebar"
import { NotificationBell } from "@/components/NotificationBell"
import { auth } from "@/lib/auth"
import { UserMenu } from "@/components/UserMenu"
import { AcademicYearSelector } from "@/components/AcademicYearSelector"
export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  let session: any = null;
  try {
    session = await auth()
  } catch (e) {
    console.error("Auth fail in TeacherLayout:", e);
  }
  const roleCode = (session?.user as any)?.role || "TEACHER"
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="TEACHER" actualRole={roleCode} />
      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="hidden md:flex text-sm font-medium text-slate-500">
              <span className="text-[#00A19A] font-bold">Giáo viên</span>
              <span className="mx-2">/</span>
              <span>Cổng thông tin</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <AcademicYearSelector />
             <UserMenu session={session} />
          </div>
        </header>
        <div className="p-4 sm:p-6 md:p-8 flex-1 overflow-x-hidden overflow-y-auto bg-slate-50/50">
          {children}
        </div>
      </main>
    </div>
  )
}
