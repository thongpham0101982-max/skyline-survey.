"use client"
import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
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
  ChevronRight,
  Compass,
  BookOpen
} from "lucide-react"
import { APP_CATEGORIES } from "@/config/modules"

interface SidebarProps {
  role: "ADMIN" | "TEACHER" | "PARENT"
  permissionModules?: string[]
  actualRole?: string
  taskCount?: number
  isTTCM?: boolean
  isGVCN?: boolean
}

function SidebarContent({ role, permissionModules, actualRole, taskCount = 0, isTTCM = false, isGVCN = false }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const typeParam = searchParams?.get("type")
  const isSuperAdmin = actualRole === "ADMIN" || !permissionModules
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hasPreschool, setHasPreschool] = useState(false)
  const [hasGeneral, setHasGeneral] = useState(false)
  const [loadingAssignments, setLoadingAssignments] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !(prev[catId] ?? false)
    }))
  }

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

  let title = ""

  const checkPermission = (module?: string, requiresAdmin?: boolean, subModules?: any[]) => {
    if (requiresAdmin && !isSuperAdmin) return false
    if (!isSuperAdmin && module) {
      const hasParent = permissionModules?.includes(module) || false
      if (hasParent) return true
      if (subModules && subModules.length > 0) {
        return subModules.some((sub) => permissionModules?.includes(sub.code))
      }
      return false
    }
    return true
  }

  // Keep active category expanded on load or pathname change
  useEffect(() => {
    APP_CATEGORIES.forEach((cat) => {
      const visibleModules = cat.modules.filter((m: any) => checkPermission(m.code, m.requiresAdmin, m.subModules))
      const hasActiveChild = visibleModules.some((m: any) => {
        if (pathname === m.href) return true;
        if (m.subModules && m.subModules.some((sub: any) => pathname === sub.href || (sub.href && pathname.startsWith(sub.href + "/")))) return true;
        return false;
      })
      if (hasActiveChild) {
        setExpandedCategories(prev => ({ ...prev, [cat.id]: true }))
      }
    })
  }, [pathname, permissionModules, actualRole])

  return (
    <>
      {/* Mobile Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-3 bg-[#003B3A] text-white rounded-2xl shadow-lg border border-slate-800 hover:bg-white/10 transition-all duration-300 focus:outline-none active:scale-95"
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
      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-[#003B3A] text-white p-6 flex flex-col shadow-xl fixed md:sticky inset-y-0 left-0 z-40 h-screen transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
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
                  ? "bg-white/20 text-white border border-[#135E5B]/30 shadow-[0_0_15px_-3px_rgba(19,94,91,0.2)]" 
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} ${pathname === (role === "ADMIN" ? "/admin" : "/parent") ? "text-[#1E8B87]" : "text-white/60 group-hover:text-[#1E8B87]"}`} />
              {!isCollapsed && <span>Dashboard</span>}
            </Link>
          )}
          {role === "ADMIN" && (isTTCM || isSuperAdmin) && (
            <Link 
              href="/admin/tong-hop-du-gio"
              onClick={() => setIsOpen(false)}
              className={`group flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                pathname.startsWith("/admin/tong-hop-du-gio") 
                  ? "bg-white/20 text-white border border-[#135E5B]/30 shadow-[0_0_15px_-3px_rgba(19,94,91,0.2)] font-semibold" 
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <PieChart className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} ${pathname.startsWith("/admin/tong-hop-du-gio") ? "text-[#1E8B87]" : "text-white/60 group-hover:text-[#1E8B87]"}`} />
              {!isCollapsed && <span>Tổng hợp dự giờ</span>}
            </Link>
          )}

          {role === "ADMIN" && APP_CATEGORIES.map((cat) => {
            const visibleModules = cat.modules.filter((m: any) => checkPermission(m.code, m.requiresAdmin, m.subModules))
            if (visibleModules.length === 0) return null

            // Detect if any module in this category is currently active
            const hasActiveChild = visibleModules.some((m: any) => {
              if (pathname === m.href) return true;
              if (m.subModules && m.subModules.some((sub: any) => pathname === sub.href || (sub.href && pathname.startsWith(sub.href + "/")))) return true;
              return false;
            })

            return (
              <div 
                key={cat.id} 
                className="pt-2 group/cat border-b border-white/10 pb-2 transition-all duration-300"
              >
                {/* Category Header */}
                <div 
                  onClick={() => toggleCategory(cat.id)}
                  className="px-3 py-2.5 cursor-pointer select-none flex items-center justify-between text-white/60 hover:text-white/90 transition-colors group"
                >
                  {!isCollapsed ? (
                    <div className="flex items-center gap-3">
                      <cat.icon className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] group-hover:text-white/90 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                        {cat.name}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full flex justify-center">
                      <cat.icon className="w-4 h-4 text-white/50" />
                    </div>
                  )}
                  {!isCollapsed && (
                    <ChevronDown 
                      className={`w-3.5 h-3.5 text-white/50 group-hover/cat:text-white/70 transition-transform duration-300 ${
                        hasActiveChild ? 'rotate-180 text-[#1E8B87]' : 'group-hover/cat:rotate-180'
                      }`} 
                    />
                  )}
                </div>

                {/* Sub-items Container (Expanded on click, hover or if it has an Active Child) */}
                <div 
                  className={`overflow-hidden transition-all duration-350 ease-in-out space-y-0.5 pl-1.5 ${
                    (expandedCategories[cat.id] ?? hasActiveChild)
                      ? "max-h-[500px] opacity-100 visible" 
                      : "max-h-0 opacity-0 invisible group-hover/cat:max-h-[500px] group-hover/cat:opacity-100 group-hover/cat:visible"
                  }`}
                >
                  {visibleModules.map((m: any) => {
                    const isActive = pathname === m.href || (m.subModules && m.subModules.some((sub: any) => pathname === sub.href || (sub.href && pathname.startsWith(sub.href + "/"))))
                    return (
                      <Link 
                        key={m.code} 
                        href={m.href}
                        onClick={() => setIsOpen(false)}
                        className={`group/item flex items-center ${isCollapsed ? 'justify-center px-1' : 'justify-between px-3'} py-2 rounded-xl transition-all duration-200 text-sm font-medium ${
                          isActive 
                            ? "bg-white/20 text-white border border-[#135E5B]/30 shadow-[0_0_15px_-3px_rgba(19,94,91,0.2)] font-semibold" 
                            : "text-white/70 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <m.icon className={`w-4 h-4 ${isActive ? "text-[#1E8B87]" : "text-white/60 group-item-hover:text-[#1E8B87] transition-colors"}`} />
                          {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{m.name}</span>}
                        </div>
                        {m.code === "TASKS" && taskCount > 0 && (
                          <span className="text-[9px] font-black text-white min-w-[18px] text-center shadow-lg shadow-red-500/40 text-xs font-semibold">
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
              {/* Category A. Công tác GVCN - Only show if isGVCN is true */}
              {isGVCN && (
                <div className="pt-4 border-b border-white/10 pb-4">
                  <div className="px-3 py-2">
                    {!isCollapsed ? (
                      <span className="text-[10px] font-extrabold text-[#00A99D] uppercase tracking-[0.1em]">
                        A. Công tác GVCN
                      </span>
                    ) : (
                      <span className="w-full text-center text-[#00A99D] block text-[10px] font-bold">A</span>
                    )}
                  </div>
                  
                  {/* 1. Lớp chủ nhiệm */}
                  <Link 
                    href="/teacher/classes" 
                    onClick={() => setIsOpen(false)} 
                    className={`group flex items-center px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${
                      pathname.includes('/teacher/classes') 
                        ? "bg-white/20 text-white border border-[#135E5B]/30" 
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    } mb-1`}
                  >
                    <Layers className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} ${pathname.includes('/teacher/classes') ? "text-[#1E8B87]" : "text-white/60 group-hover:text-[#1E8B87]"}`} />
                    {!isCollapsed && <span>1. Lớp chủ nhiệm</span>}
                  </Link>

                  {/* 2. NSP Khảo sát */}
                  <Link 
                    href="/teacher/surveys" 
                    onClick={() => setIsOpen(false)} 
                    className={`group flex items-center px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${
                      (pathname.includes('/teacher/surveys') || pathname.includes('/teacher/nps') || pathname.includes('/teacher/feedback')) 
                        ? "bg-white/20 text-white border border-[#135E5B]/30" 
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    } mb-1`}
                  >
                    <FileText className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} ${(pathname.includes('/teacher/surveys') || pathname.includes('/teacher/nps') || pathname.includes('/teacher/feedback')) ? "text-[#1E8B87]" : "text-white/60 group-hover:text-[#1E8B87]"}`} />
                    {!isCollapsed && <span>2. NSP Khảo sát</span>}
                  </Link>

                  {/* 3. Nhận xét nổi bật */}
                  <Link 
                    href="/teacher/nhan-xet-noi-bat" 
                    onClick={() => setIsOpen(false)} 
                    className={`group flex items-center px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${
                      pathname.includes('/teacher/nhan-xet-noi-bat') 
                        ? "bg-white/20 text-white border border-[#135E5B]/30" 
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    } mb-1`}
                  >
                    <MessageSquare className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} ${pathname.includes('/teacher/nhan-xet-noi-bat') ? "text-[#1E8B87]" : "text-white/60 group-hover:text-[#1E8B87]"}`} />
                    {!isCollapsed && <span>3. Nhận xét nổi bật</span>}
                  </Link>

                  {/* 4. Hồ sơ Học sinh */}
                  <Link 
                    href="/teacher/ho-so-hoc-sinh" 
                    onClick={() => setIsOpen(false)} 
                    className={`group flex items-center px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${
                      pathname.includes('/teacher/ho-so-hoc-sinh') 
                        ? "bg-white/20 text-white border border-[#135E5B]/30" 
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <ClipboardCheck className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} ${pathname.includes('/teacher/ho-so-hoc-sinh') ? "text-[#1E8B87]" : "text-white/60 group-hover:text-[#1E8B87]"}`} />
                    {!isCollapsed && <span>4. Hồ sơ Học sinh</span>}
                  </Link>
                </div>
              )}

              {/* Category B. Công tác GVBM */}
              <div className="pt-4 border-t border-white/10 mt-2">
                <div className="px-3 py-2">
                  {!isCollapsed ? (
                    <span className="text-[10px] font-extrabold text-[#00A99D] uppercase tracking-[0.12em]">
                      B. Công tác GVBM
                    </span>
                  ) : (
                    <span className="w-full text-center text-[#00A99D] block text-[10px] font-bold">B</span>
                  )}
                </div>

                {/* 1. Khảo sát đầu vào */}
                {checkPermission("INPUT_ASSESSMENTS") && (
                  <div className="mb-1.5">
                    {loadingAssignments ? (
                      <Link 
                        href="/teacher/input-assessments?type=general" 
                        onClick={() => setIsOpen(false)} 
                        className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold ${
                          pathname.includes('/teacher/input-assessments') && typeParam !== 'preschool'
                            ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10"
                            : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                          pathname.includes('/teacher/input-assessments') && typeParam !== 'preschool'
                            ? "bg-amber-500/20 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                            : "bg-white/5 border border-white/10 group-hover:border-amber-500/30"
                        }`}>
                          <ClipboardCheck className={`w-4 h-4 transition-all ${
                            pathname.includes('/teacher/input-assessments') && typeParam !== 'preschool' ? "text-amber-400" : "text-slate-400 group-hover:text-amber-400 group-hover:scale-110"
                          }`} />
                        </div>
                        {!isCollapsed && <span>1. Đang tải...</span>}
                      </Link>
                    ) : (
                      <>
                        {hasPreschool && (
                          <Link 
                            href="/teacher/input-assessments?type=preschool" 
                            onClick={() => setIsOpen(false)} 
                            className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold mb-1 ${
                              pathname.includes('/teacher/input-assessments') && typeParam === 'preschool'
                                ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10"
                                : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                              pathname.includes('/teacher/input-assessments') && typeParam === 'preschool'
                                ? "bg-amber-500/20 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                                : "bg-white/5 border border-white/10 group-hover:border-amber-500/30"
                            }`}>
                              <ClipboardCheck className={`w-4 h-4 transition-all ${
                                pathname.includes('/teacher/input-assessments') && typeParam === 'preschool' ? "text-amber-400" : "text-slate-400 group-hover:text-amber-400 group-hover:scale-110"
                              }`} />
                            </div>
                            {!isCollapsed && <span>1. Mầm non</span>}
                          </Link>
                        )}
                        {hasGeneral && (
                          <Link 
                            href="/teacher/input-assessments?type=general" 
                            onClick={() => setIsOpen(false)} 
                            className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold ${
                              pathname.includes('/teacher/input-assessments') && typeParam !== 'preschool'
                                ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10"
                                : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                              pathname.includes('/teacher/input-assessments') && typeParam !== 'preschool'
                                ? "bg-amber-500/20 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                                : "bg-white/5 border border-white/10 group-hover:border-amber-500/30"
                            }`}>
                              <ClipboardCheck className={`w-4 h-4 transition-all ${
                                pathname.includes('/teacher/input-assessments') && typeParam !== 'preschool' ? "text-amber-400" : "text-slate-400 group-hover:text-amber-400 group-hover:scale-110"
                              }`} />
                            </div>
                            {!isCollapsed && <span>1. Khảo sát đầu vào</span>}
                          </Link>
                        )}
                        {!hasPreschool && !hasGeneral && (
                          <Link 
                            href="/teacher/input-assessments?type=general" 
                            onClick={() => setIsOpen(false)} 
                            className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold ${
                              pathname.includes('/teacher/input-assessments') && typeParam !== 'preschool'
                                ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10"
                                : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                              pathname.includes('/teacher/input-assessments') && typeParam !== 'preschool'
                                ? "bg-amber-500/20 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                                : "bg-white/5 border border-white/10 group-hover:border-amber-500/30"
                            }`}>
                              <ClipboardCheck className={`w-4 h-4 transition-all ${
                                pathname.includes('/teacher/input-assessments') && typeParam !== 'preschool' ? "text-amber-400" : "text-slate-400 group-hover:text-amber-400 group-hover:scale-110"
                              }`} />
                            </div>
                            {!isCollapsed && <span>1. Khảo sát đầu vào</span>}
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* 2. Dự giờ Giáo viên */}
                <Link 
                  href="/teacher/du-gio" 
                  onClick={() => setIsOpen(false)} 
                  className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold mb-1.5 ${
                    pathname.includes('/teacher/du-gio')
                      ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10"
                      : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                    pathname.includes('/teacher/du-gio')
                      ? "bg-indigo-500/20 border border-indigo-500/40 shadow-[0_0_8px_rgba(99,102,241,0.25)]"
                      : "bg-white/5 border border-white/10 group-hover:border-indigo-500/30"
                  }`}>
                    <ClipboardCheck className={`w-4 h-4 transition-all ${
                      pathname.includes('/teacher/du-gio') ? "text-indigo-400" : "text-slate-400 group-hover:text-indigo-400 group-hover:scale-110"
                    }`} />
                  </div>
                  {!isCollapsed && <span>2. Dự giờ Giáo viên</span>}
                </Link>

                {/* 3. Đánh giá nhận xét: Hướng nghiệp */}
                <Link 
                  href="/teacher/orientation" 
                  onClick={() => setIsOpen(false)} 
                  className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold mb-1.5 ${
                    pathname.includes('/teacher/orientation')
                      ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10"
                      : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                    pathname.includes('/teacher/orientation')
                      ? "bg-cyan-500/20 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.25)]"
                      : "bg-white/5 border border-white/10 group-hover:border-cyan-500/30"
                  }`}>
                    <Compass className={`w-4 h-4 transition-all ${
                      pathname.includes('/teacher/orientation') ? "text-cyan-400" : "text-slate-400 group-hover:text-cyan-400 group-hover:scale-110"
                    }`} />
                  </div>
                  {!isCollapsed && <span>3. Hướng nghiệp</span>}
                </Link>

                {/* 4. Dự án & Trải nghiệm */}
                <Link 
                  href="/teacher/du-an-trai-nghiem" 
                  onClick={() => setIsOpen(false)} 
                  className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold mb-1.5 ${
                    pathname.includes('/teacher/du-an-trai-nghiem')
                      ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10"
                      : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                    pathname.includes('/teacher/du-an-trai-nghiem')
                      ? "bg-emerald-500/20 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                      : "bg-white/5 border border-white/10 group-hover:border-emerald-500/30"
                  }`}>
                    <BookOpen className={`w-4 h-4 transition-all ${
                      pathname.includes('/teacher/du-an-trai-nghiem') ? "text-emerald-400" : "text-slate-400 group-hover:text-emerald-400 group-hover:scale-110"
                    }`} />
                  </div>
                  {!isCollapsed && <span>4. Dự án & Trải nghiệm</span>}
                </Link>

                {/* 5. Cam kết học tập */}
                <Link 
                  href="/teacher/cam-ket-hoc-tap" 
                  onClick={() => setIsOpen(false)} 
                  className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold ${
                    pathname.includes('/teacher/cam-ket-hoc-tap')
                      ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10"
                      : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                    pathname.includes('/teacher/cam-ket-hoc-tap')
                      ? "bg-rose-500/20 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.25)]"
                      : "bg-white/5 border border-white/10 group-hover:border-rose-500/30"
                  }`}>
                    <FileText className={`w-4 h-4 transition-all ${
                      pathname.includes('/teacher/cam-ket-hoc-tap') ? "text-rose-400" : "text-slate-400 group-hover:text-rose-400 group-hover:scale-110"
                    }`} />
                  </div>
                  {!isCollapsed && <span>5. Cam kết học tập</span>}
                </Link>
              </div>
            </>
          )}
        </nav>
        
        <div className="mt-auto pt-4 flex flex-col gap-2">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`hidden md:flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-3 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 text-sm font-semibold group w-full`}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" /> : (
              <>
                <ChevronLeft className="w-4 h-4 mr-3 text-white/60 group-hover:text-white transition-colors" />
                <span className="whitespace-nowrap">Thu gọn</span>
              </>
            )}
          </button>
          <div className="border-t border-white/20 pt-4" />
          <button 
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={`flex items-center w-full ${isCollapsed ? 'justify-center' : 'px-4'} py-3 text-white/70 hover:text-white hover:bg-red-500/10 rounded-xl transition-all duration-200 text-sm font-semibold group`}
          >
            <LogOut className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} text-white/50 group-hover:text-red-400 transition-colors`} />
            {!isCollapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>
    </>
  )
}


export function Sidebar(props: SidebarProps) {
  return (
    <Suspense fallback={<aside className="w-64 bg-[#003B3A] h-screen shrink-0" />}>
      <SidebarContent {...props} />
    </Suspense>
  );
}
