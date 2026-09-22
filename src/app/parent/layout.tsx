import { ParentMobileBottomNav } from "@/components/ParentMobileBottomNav"
import { Sidebar } from "@/components/Sidebar"
import { MobileMenuTrigger } from "@/components/MobileMenuTrigger"
import { NotificationBell } from "@/components/NotificationBell"
import { auth } from "@/lib/auth"
import { UserMenu } from "@/components/UserMenu"
import { AcademicYearSelector } from "@/components/AcademicYearSelector"
export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  let session: any = null;
  try {
    session = await auth()
  } catch (e) {
    console.error("Auth fail in ParentLayout:", e);
  }
  const roleCode = (session?.user as any)?.role || "PARENT"
  return (
    <div className="flex min-h-screen text-xs font-semibold">
      <Sidebar role="PARENT" actualRole={roleCode} />
      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden bg-slate-50/50">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200/90 bg-white/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <MobileMenuTrigger />
            <div className="flex items-center gap-2.5">
              <img 
                src="/logo.png" 
                alt="Sky-Line" 
                className="h-7 w-auto object-contain md:hidden" 
              />
              <div className="flex flex-col">
                <span className="text-xs md:text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                  <span className="text-[#0284C7] font-semibold uppercase tracking-wide">SQMS</span>
                  <span className="hidden md:inline text-xs font-bold text-slate-400">• Phụ huynh</span>
                </span>
                <span className="md:hidden text-[9px] text-[#48BFE3] font-bold leading-none">Cổng thông tin</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
             <AcademicYearSelector />
             <NotificationBell />
             <UserMenu session={session} />
          </div>
        </header>
        <div className="p-3.5 sm:p-6 md:p-8 pb-24 md:pb-12 flex-1 overflow-x-auto overflow-y-auto text-xs font-semibold">
          {children}
        </div>
        <ParentMobileBottomNav />
      </main>
    </div>
  )
}
