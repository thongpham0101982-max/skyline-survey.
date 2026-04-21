import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { GraduationCap, LogOut, Layout } from "lucide-react"
import Link from "next/link"

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const role = (session?.user as any)?.role

  if (!session || role !== "STUDENT") {
    // If not a student, but is an admin, maybe allow? 
    // No, strictly student for this portal for now or redirect to login.
    if (role !== "ADMIN" && role !== "KT_DBCL") {
       redirect("/login")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Student Nav */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-[#BE1E2E] p-2 rounded-xl">
                 <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                 <span className="text-xl font-black text-slate-900 tracking-tight">SKYLINE</span>
                 <span className="ml-2 px-2 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-500 rounded uppercase">Học Sinh</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Học sinh</p>
                 <p className="text-sm font-bold text-slate-700">{session?.user?.name}</p>
              </div>
              <Link href="/api/auth/signout" className="p-2 text-slate-400 hover:text-[#BE1E2E] hover:bg-red-50 rounded-xl transition-all">
                 <LogOut className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="py-10 text-center text-slate-400 text-xs font-medium">
         © 2026 Skyline Education Group • Student Survey Portal
      </footer>
    </div>
  )
}
