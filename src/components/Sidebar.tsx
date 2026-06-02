"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { 
  LogOut, 
  LayoutDashboard, 
  Layers, 
  FileText, 
  PieChart, 
  MessageSquare, 
  ClipboardCheck, 
  Menu, 
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
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
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hasPreschool, setHasPreschool] = useState(false)
  const [hasGeneral, setHasGeneral] = useState(false)
  const [loadingAssignments, setLoadingAssignments] = useState(true)

  useEffect(() => {
    if (role === "TEACHER") {
      fetch("/api/teacher-assessments?action=getAssignments")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const hasPre = data.some((a) => a.isPreschool || a.subjectId === "preschool");
            const hasGen = data.some((a) => !(a.isPreschool || a.subjectId === "preschool"));
            setHasPreschool(hasPre);
            setHasGeneral(hasGen);
          }
          setLoadingAssignments(false);
        })
        .catch(() => setLoadingAssignments(false));
    } else {
      setLoadingAssignments(false);
    }
  }, [role])

  let title = "Portal"
  if (role === "ADMIN") title = ""
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
    <>
      {/* Mobile Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-3 bg-slate-900 text-white rounded-2xl shadow-lg border border-slate-800 hover:bg-slate-800 transition-all duration-300 focus:outline-none active:scale-95"
      >
        {isOpen ? <X className="w-5 h-5 text-[#1E8B87]" /> : <Menu className="w-5 h-5 text-[#1E8B87]" />}
      </button>

      {/* Mobile Dark Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300 animate-in fade-in"
        />
      )}

      {/* Sidebar Content */}
      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-white p-6 flex flex-col shadow-xl fixed md:sticky inset-y-0 left-0 z-40 h-screen transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-2'} mb-8`}>
          <img src="/logo.png" alt="Sky-Line Logo" className={`h-8 w-auto object-contain brightness-0 invert opacity-90 transition-all ${isCollapsed ? 'scale-75' : ''}`} />
          {!isCollapsed && <div className="font-bold text-lg tracking-tight leading-none whitespace-nowrap overflow-hidden">{title}</div>}
        </div>

        <nav className="flex flex-col space-y-1 flex-grow overflow-y-auto pr-2 custom-scrollbar">
          {role !== "TEACHER" && (
            <Link 
              href={role === "ADMIN" ? "/admin" : "/parent"}
              onClick={() => setIsOpen(false)}
              className={`group flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                pathname === (role === "ADMIN" ? "/admin" : "/parent") 
                  ? "bg-[#135E5B]/20 text-white border border-[#135E5B]/30 shadow-[0_0_15px_-3px_rgba(19,94,91,0.2)]" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} ${pathname === (role === "ADMIN" ? "/admin" : "/parent") ? "text-[#1E8B87]" : "text-slate-500 group-hover:text-[#1E8B87]"}`} />
              {!isCollapsed && <span>Dashboard</span>}
            </Link>
          )}

          {role === "ADMIN" && APP_CATEGORIES.map((cat) => {
            const visibleModules = cat.modules.filter((m) => checkPermission(m.code, m.requiresAdmin))
            if (visibleModules.length === 0) return null

            // Detect if any module in this category is currently active
            const hasActiveChild = visibleModules.some((m) => pathname === m.href)

            return (
              <div 
                key={cat.id} 
                className="pt-2 group/cat border-b border-slate-800/10 pb-2 transition-all duration-300"
              >
                {/* Category Header */}
                <div className="px-3 py-2.5 cursor-pointer select-none flex items-center justify-between text-slate-500 hover:text-slate-300 transition-colors group">
                  {!isCollapsed ? (<span className="text-[10.5px] font-bold uppercase tracking-[0.12em] group-hover:text-slate-300 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    {cat.name}
                  </span>) : (<span className="w-full text-center text-slate-600 block text-xs">•••</span>)}
                  <ChevronDown 
                    className={`w-3.5 h-3.5 text-slate-600 group-hover/cat:text-slate-400 transition-transform duration-300 ${
                      hasActiveChild ? 'rotate-180 text-[#1E8B87]' : 'group-hover/cat:rotate-180'
                    }`} 
                  />
                </div>

                {/* Sub-items Container (Expanded on Hover, or if it has an Active Child) */}
                <div 
                  className={`overflow-hidden transition-all duration-350 ease-in-out space-y-0.5 pl-1.5 ${
                    hasActiveChild 
                      ? "max-h-[500px] opacity-100 visible" 
                      : "max-h-0 opacity-0 invisible group-hover/cat:max-h-[500px] group-hover/cat:opacity-100 group-hover/cat:visible"
                  }`}
                >
                  {visibleModules.map((m) => {
                    const isActive = pathname === m.href
                    return (
                      <Link 
                        key={m.code} 
                        href={m.href}
                        onClick={() => setIsOpen(false)}
                        className={`group/item flex items-center ${isCollapsed ? 'justify-center px-1' : 'justify-between px-3'} py-2 rounded-xl transition-all duration-200 text-sm font-medium ${
                          isActive 
                            ? "bg-[#135E5B]/20 text-white border border-[#135E5B]/30 shadow-[0_0_15px_-3px_rgba(19,94,91,0.2)] font-semibold" 
                            : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <m.icon className={`w-4 h-4 ${isActive ? "text-[#1E8B87]" : "text-slate-500 group-item-hover:text-[#1E8B87] transition-colors"}`} />
                          {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{m.name}</span>}
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
              </div>
            )
          })}

          {role === "TEACHER" && (
            <>
              <div className="pt-4">
                <div className="px-3 py-2">
                  {!isCollapsed ? <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">Lớp học</span> : <span className="w-full text-center text-slate-600 block text-xs">•••</span>}
                </div>
                <Link href="/teacher/classes" onClick={() => setIsOpen(false)} className={`group flex items-center px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${pathname.includes('/teacher/classes') ? "bg-[#135E5B]/20 text-white border border-[#135E5B]/30" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                  <Layers className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} ${pathname.includes('/teacher/classes') ? "text-[#1E8B87]" : "text-slate-500 group-hover:text-[#1E8B87]"}`} />
                  {!isCollapsed && <span>Lớp học của tôi</span>}
                </Link>
              </div>
              
              {checkPermission("INPUT_ASSESSMENTS") && (
                <div className="pt-4">
                  <div className="px-3 py-2">
                    {!isCollapsed ? <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">Khảo thí</span> : <span className="w-full text-center text-slate-600 block text-xs">•••</span>}
                  </div>
                  {loadingAssignments ? (
                    <Link href="/teacher/input-assessments" onClick={() => setIsOpen(false)} className={`group flex items-center px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${pathname.includes('/teacher/input-assessments') ? "bg-[#135E5B]/20 text-white border border-[#135E5B]/30" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                      <ClipboardCheck className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} ${pathname.includes('/teacher/input-assessments') ? "text-[#1E8B87]" : "text-slate-500 group-hover:text-[#1E8B87]"}`} />
                      {!isCollapsed && <span>Đang tải khảo thí...</span>}
                    </Link>
                  ) : (
                    <>
                      {hasPreschool && (
                        <Link href="/teacher/input-assessments" onClick={() => setIsOpen(false)} className={`group flex items-center px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${pathname.includes('/teacher/input-assessments') && pathname.includes('preschool') ? "bg-[#135E5B]/20 text-white border border-[#135E5B]/30" : "text-slate-400 hover:text-white hover:bg-slate-800"} mb-1`}>
                          <ClipboardCheck className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} ${pathname.includes('/teacher/input-assessments') ? "text-[#1E8B87]" : "text-slate-500 group-hover:text-[#1E8B87]"}`} />
                          {!isCollapsed && <span>KSNL Đầu vào Mầm non</span>}
                        </Link>
                      )}
                      {hasGeneral && (
                        <Link href="/teacher/input-assessments" onClick={() => setIsOpen(false)} className={`group flex items-center px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${pathname.includes('/teacher/input-assessments') && !pathname.includes('preschool') ? "bg-[#135E5B]/20 text-white border border-[#135E5B]/30" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                          <ClipboardCheck className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} ${pathname.includes('/teacher/input-assessments') ? "text-[#1E8B87]" : "text-slate-500 group-hover:text-[#1E8B87]"}`} />
                          {!isCollapsed && <span>KSNL đầu vào Phổ thông</span>}
                        </Link>
                      )}
                      {!hasPreschool && !hasGeneral && (
                        <Link href="/teacher/input-assessments" onClick={() => setIsOpen(false)} className={`group flex items-center px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${pathname.includes('/teacher/input-assessments') ? "bg-[#135E5B]/20 text-white border border-[#135E5B]/30" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                          <ClipboardCheck className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} ${pathname.includes('/teacher/input-assessments') ? "text-[#1E8B87]" : "text-slate-500 group-hover:text-[#1E8B87]"}`} />
                          {!isCollapsed && <span>KSNL đầu vào Phổ thông</span>}
                        </Link>
                      )}
                    </>
                  )}
                </div>
              )}
              
              <div className="pt-4">
                <div className="px-3 py-2">
                  {!isCollapsed ? <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">Khảo sát</span> : <span className="w-full text-center text-slate-600 block text-xs">•••</span>}
                </div>
                <Link href="/teacher/surveys" onClick={() => setIsOpen(false)} className={`group flex items-center px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${pathname.includes('/teacher/surveys') ? "bg-[#135E5B]/20 text-white border border-[#135E5B]/30" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                  <FileText className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} ${pathname.includes('/teacher/surveys') ? "text-[#1E8B87]" : "text-slate-500 group-hover:text-[#1E8B87]"}`} />
                  {!isCollapsed && <span>Quản lý Khảo sát</span>}
                </Link>
                <Link href="/teacher/nps" onClick={() => setIsOpen(false)} className={`group flex items-center px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${pathname.includes('/teacher/nps') ? "bg-[#135E5B]/20 text-white border border-[#135E5B]/30" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                  <PieChart className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} ${pathname.includes('/teacher/nps') ? "text-[#1E8B87]" : "text-slate-500 group-hover:text-[#1E8B87]"}`} />
                  {!isCollapsed && <span>Phân tích NPS</span>}
                </Link>
                <Link href="/teacher/feedback" onClick={() => setIsOpen(false)} className={`group flex items-center px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${pathname.includes('/teacher/feedback') ? "bg-[#135E5B]/20 text-white border border-[#135E5B]/30" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                  <MessageSquare className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} ${pathname.includes('/teacher/feedback') ? "text-[#1E8B87]" : "text-slate-500 group-hover:text-[#1E8B87]"}`} />
                  {!isCollapsed && <span>Theo dõi Phản hồi</span>}
                </Link>
              </div>
            </>
          )}
        </nav>
        
        <div className="mt-auto pt-4 flex flex-col gap-2">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`hidden md:flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all duration-200 text-sm font-semibold group w-full`}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" /> : (
              <>
                <ChevronLeft className="w-4 h-4 mr-3 text-slate-500 group-hover:text-white transition-colors" />
                <span className="whitespace-nowrap">Thu gọn</span>
              </>
            )}
          </button>
          <div className="border-t border-slate-800/50 pt-4" />
          <button 
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={`flex items-center w-full ${isCollapsed ? 'justify-center' : 'px-4'} py-3 text-slate-400 hover:text-white hover:bg-red-500/10 rounded-xl transition-all duration-200 text-sm font-semibold group`}
          >
            <LogOut className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} text-slate-600 group-hover:text-red-400 transition-colors`} />
            {!isCollapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
