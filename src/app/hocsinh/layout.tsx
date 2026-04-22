export const dynamic = 'force-dynamic';
import { getStudentSession } from "@/lib/student-session"
import { GraduationCap, LogOut, ClipboardList } from "lucide-react"
import Link from "next/link"

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getStudentSession()

  return (
    <div className="min-h-screen" style={{ background: "#f8fafc" }}>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <Link href="/hocsinh/hs-khaosat/danh-sach" className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: "#BE1E2E" }}>
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <span className="text-xl font-black text-slate-900 tracking-tight">SKYLINE</span>
                  <span className="ml-2 px-2 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-500 rounded uppercase">Học Sinh</span>
                </div>
              </Link>
              <div className="hidden md:flex items-center gap-1">
                <Link 
                  href="/hocsinh/hs-khaosat/danh-sach"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:text-[#BE1E2E] hover:bg-red-50 transition-all"
                >
                  <ClipboardList className="w-4 h-4" />
                  Khảo sát
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {session && (
                <div className="hidden md:block text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Học sinh</p>
                  <p className="text-sm font-bold text-slate-700">{session.studentName}</p>
                </div>
              )}
              <form action="/api/hocsinh/logout" method="post">
                <button className="p-2.5 text-slate-400 hover:text-[#BE1E2E] hover:bg-red-50 rounded-xl transition-all flex items-center gap-2">
                  <span className="hidden sm:inline text-xs font-bold">Đăng xuất</span>
                  <LogOut className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      <main>
        {children}
      </main>
      <footer className="py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
         © 2026 Skyline Education Group • Student Portal
      </footer>
    </div>
  )
}
