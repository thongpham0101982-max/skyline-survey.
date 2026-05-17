"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { LogOut, LayoutDashboard, Layers, FileText, PieChart, MessageSquare, ClipboardCheck } from "lucide-react"
import { APP_CATEGORIES } from "@/config/modules"

interface SidebarProps {
  role: "ADMIN" | "TEACHER" | "PARENT"
  permissionModules?: string[]
  actualRole?: string
  taskCount?: number
}

export function Sidebar({ role, permissionModules, actualRole, taskCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const isSuperAdmin = actualRole === "ADMIN" || !permissionModules

  let title = "Portal"
  if (role === "ADMIN") title = "Cổng Quản trị"
  else if (role === "TEACHER") title = "Cổng Giáo viên"
  else if (role === "PARENT") title = "Cổng Phụ huynh"

  const checkPermission = (module?: string, requiresAdmin?: boolean) => {
    if (requiresAdmin && !isSuperAdmin) return false
    if (!isSuperAdmin && module) {
      return permissionModules?.includes(module) || false
    }
    return true
  }

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen p-6 flex flex-col shadow-xl sticky top-0 h-screen">
      <div className="flex items-center gap-3 mb-8 px-2">
        <img src="/logo-skyline.png" alt="Sky-Line Logo" className="h-8 w-auto object-contain brightness-0 invert opacity-90" />
        <div className="font-bold text-xl tracking-tight leading-none">{title}</div>
      </div>

      <nav className="flex flex-col space-y-1 flex-grow overflow-y-auto pr-2 custom-scrollbar">
        {role !== "TEACHER" && (
          <Link 
            href={role === "ADMIN" ? "/admin" : "/parent"}
            className={`group flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
              pathname === (role === "ADMIN" ? "/admin" : "/parent") 
                ? "bg-[#135E5B]/20 text-white border border-[#135E5B]/30 shadow-[0_0_15px_-3px_rgba(19,94,91,0.2)]" 
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 mr-3 ${pathname === (role === "ADMIN" ? "/admin" : "/parent") ? "text-[#1E8B87]" : "text-slate-500 group-hover:text-[#1E8B87]"}`} />
            Dashboard
          </Link>
        )}

        {role === "ADMIN" && APP_CATEGORIES.map((cat) => {
          const visibleModules = cat.modules.filter((m: any) => checkPermission(m.code, m.requiresAdmin))
          if (visibleModules.length === 0) return null

          return (
            <div key={cat.id} className="pt-4 first:pt-0">
              <div className="px-3 py-2 cursor-default select-none group">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] group-hover:text-slate-400 transition-colors">
                  {cat.name}
                </span>
              </div>
              {visibleModules.map((m) => {
                const isActive = pathname === m.href
                return (
                  <Link 
                    key={m.code} 
                    href={m.href}
                    className={`group flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${
                      isActive 
                        ? "bg-[#135E5B]/20 text-white border border-[#135E5B]/30 shadow-[0_0_15px_-3px_rgba(19,94,91,0.2)]" 
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <m.icon className={`w-4 h-4 ${isActive ? "text-[#1E8B87]" : "text-slate-500 group-hover:text-[#1E8B87] transition-colors"}`} />
                      <span>{m.name}</span>
                    </div>
                    {m.code === "TASKS" && taskCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-black bg-red-500 text-white rounded-full min-w-[18px] text-center shadow-lg shadow-red-500/40">
                        {taskCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}

                {role === "TEACHER" && (
          <>
            <div className="pt-4">
              <div className="px-3 py-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">Lớp học</span>
              </div>
              <Link href="/teacher/classes" className={`group flex items-center px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${pathname.includes('/teacher/classes') ? "bg-[#135E5B]/20 text-white border border-[#135E5B]/30" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                <Layers className={`w-4 h-4 mr-3 ${pathname.includes('/teacher/classes') ? "text-[#1E8B87]" : "text-slate-500 group-hover:text-[#1E8B87]"}`} />
                Lớp học của tôi
              </Link>
            </div>
            
            
            {checkPermission("INPUT_ASSESSMENTS") && (
              <div className="pt-4">
                <div className="px-3 py-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">Khảo thí</span>
                </div>
                <Link href="/teacher/input-assessments" className={`group flex items-center px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${pathname.includes('/teacher/input-assessments') ? "bg-[#135E5B]/20 text-white border border-[#135E5B]/30" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                  <ClipboardCheck className={`w-4 h-4 mr-3 ${pathname.includes('/teacher/input-assessments') ? "text-[#1E8B87]" : "text-slate-500 group-hover:text-[#1E8B87]"}`} />
                  Quản lý KSNL Đầu vào
                </Link>
              </div>
            )}
            
            <div className="pt-4">
              <div className="px-3 py-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">Khảo sát</span>
              </div>
              <Link href="/teacher/surveys" className={`group flex items-center px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${pathname.includes('/teacher/surveys') ? "bg-[#135E5B]/20 text-white border border-[#135E5B]/30" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                <FileText className={`w-4 h-4 mr-3 ${pathname.includes('/teacher/surveys') ? "text-[#1E8B87]" : "text-slate-500 group-hover:text-[#1E8B87]"}`} />
                Quản lý Khảo sát
              </Link>
              <Link href="/teacher/nps" className={`group flex items-center px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${pathname.includes('/teacher/nps') ? "bg-[#135E5B]/20 text-white border border-[#135E5B]/30" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                <PieChart className={`w-4 h-4 mr-3 ${pathname.includes('/teacher/nps') ? "text-[#1E8B87]" : "text-slate-500 group-hover:text-[#1E8B87]"}`} />
                Phân tích NPS
              </Link>
              <Link href="/teacher/feedback" className={`group flex items-center px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${pathname.includes('/teacher/feedback') ? "bg-[#135E5B]/20 text-white border border-[#135E5B]/30" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                <MessageSquare className={`w-4 h-4 mr-3 ${pathname.includes('/teacher/feedback') ? "text-[#1E8B87]" : "text-slate-500 group-hover:text-[#1E8B87]"}`} />
                Theo dõi Phản hồi
              </Link>
            </div>
          </>
        )}
      </nav>
      
      <div className="mt-auto border-t border-slate-800/50 pt-6">
        <button 
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center w-full px-4 py-3 text-slate-400 hover:text-white hover:bg-red-500/10 rounded-xl transition-all duration-200 text-sm font-semibold group"
        >
          <LogOut className="w-4 h-4 mr-3 text-slate-600 group-hover:text-red-400 transition-colors" />
          Đăng xuất
        </button>
      </div>
    </aside>
  )
}
