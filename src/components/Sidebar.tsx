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
  ClipboardList,
  GraduationCap,
  Menu, 
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BookMarked,
  Compass,
  BookOpen,
  Eye,
  Bell,
  UserPlus,
  Calendar
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
  const rawPathname = usePathname()
  const pathname = rawPathname || ""
  const searchParams = useSearchParams()
  const typeParam = searchParams?.get("type")
  const isSuperAdmin = actualRole === "ADMIN" || actualRole === "Admin"
  const normalizedRole = (actualRole || "").toUpperCase()
  const isGDCS = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS", "BGH", "BGH_CS", "BGH_MN", "BGH MN", "BGH_MAM_NON"].some(r => normalizedRole.includes(r)) || normalizedRole.includes("GDCS") || normalizedRole.includes("GĐCS")
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hasPreschool, setHasPreschool] = useState(false)
  const [hasGeneral, setHasGeneral] = useState(false)
  const [loadingAssignments, setLoadingAssignments] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [observesExpanded, setObservesExpanded] = useState(pathname.startsWith("/admin/du-gio"))

  useEffect(() => {
    if (pathname.startsWith("/admin/du-gio")) {
      setObservesExpanded(true)
    }
  }, [pathname])

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

  const title = ""

    const checkPermission = (module?: string, requiresAdmin?: boolean, subModules?: any[]) => {
    if (isSuperAdmin) return true
    if (requiresAdmin) return false
    if (!module) return false
    
    let hasParent = permissionModules?.includes(module) || false
    if (module === "KTDBCL_EXAMS") {
      hasParent = hasParent || permissionModules?.includes("KTDBCL_EXAM_CONFIG") || false
    }
    if (module === "TEACHER_TRANSFERS") {
      hasParent = hasParent || permissionModules?.includes("TEACHERS") || permissionModules?.includes("STUDENT_TRANSFERS") || false
    }
    if (hasParent) return true
    if (subModules && subModules.length > 0) {
      return subModules.some((sub) => permissionModules?.includes(sub.code))
    }
    return false
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

  // Listen to custom toggleSidebar event from top layout header
  useEffect(() => {
    const handleToggle = () => setIsOpen(open => !open)
    window.addEventListener("toggleSidebar", handleToggle)
    return () => window.removeEventListener("toggleSidebar", handleToggle)
  }, [])

  return (
    <>
      {/* Mobile Dark Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300 animate-in fade-in"
        />
      )}

      {/* Sidebar Content */}
      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-[#003B3A] text-white p-6 flex flex-col shadow-xl fixed md:sticky inset-y-0 left-0 z-40 h-screen transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-2'} mb-8`}>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Sky-Line Logo" className={`h-8 w-auto object-contain brightness-0 invert opacity-90 transition-all ${isCollapsed ? 'scale-75' : ''}`} />
            {!isCollapsed && <div className="font-bold text-lg tracking-tight leading-none whitespace-nowrap overflow-hidden">{title}</div>}
          </div>
          {/* Mobile close button inside the sidebar */}
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex flex-col space-y-1 flex-grow overflow-y-auto pr-2 custom-scrollbar">
          {isSuperAdmin && role !== "TEACHER" && role !== "PARENT" && (
            <Link 
              href="/admin"
              onClick={() => setIsOpen(false)}
              className={`group flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                pathname === "/admin" 
                  ? "bg-white/20 text-white border border-[#135E5B]/30 shadow-[0_0_15px_-3px_rgba(19,94,91,0.2)]" 
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} ${pathname === "/admin" ? "text-[#1E8B87]" : "text-white/60 group-hover:text-[#1E8B87]"}`} />
              {!isCollapsed && <span>Dashboard</span>}
            </Link>
          )}
          {role === "ADMIN" && (isTTCM || isSuperAdmin || isGDCS) && (
            <div className="pt-4 border-t border-white/10 mt-2">
              {/* Category Header */}
              <div className="px-3 py-2 select-none flex items-center justify-between text-white/60">
                {!isCollapsed ? (
                  <span className="text-[10px] font-extrabold text-[#48BFE3] uppercase tracking-[0.12em]">
                    QUẢN LÝ DỰ GIỜ
                  </span>
                ) : (
                  <span className="w-full text-center text-[#48BFE3] block text-[10px] font-bold">D</span>
                )}
              </div>

              {/* 1. Dự giờ đánh giá Giáo viên */}
              <Link 
                href="/admin/du-gio" 
                onClick={() => setIsOpen(false)} 
                className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold mb-1.5 ${
                  (pathname === "/admin/du-gio" || pathname.startsWith("/admin/du-gio?"))
                    ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10" 
                    : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                  (pathname === "/admin/du-gio" || pathname.startsWith("/admin/du-gio?"))
                    ? "bg-teal-500/20 border border-teal-500/40 shadow-[0_0_8px_rgba(20,184,166,0.25)]"
                    : "bg-white/5 border border-white/10 group-hover:border-teal-500/30"
                }`}>
                  <ClipboardCheck className={`w-4 h-4 transition-all ${
                    (pathname === "/admin/du-gio" || pathname.startsWith("/admin/du-gio?")) ? "text-teal-400" : "text-slate-400 group-hover:text-teal-400 group-hover:scale-110"
                  }`} />
                </div>
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">1. Dự giờ đánh giá Giáo viên</span>}
              </Link>

              {/* 2. Tổng hợp kết quả (Dropdown block) */}
              <div className="flex flex-col">
                <button 
                  onClick={() => setObservesExpanded(!observesExpanded)}
                  className={`group relative flex items-center justify-between ${isCollapsed ? 'px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold mb-1.5 text-left w-full hover:bg-white/5 outline-none ${
                    pathname.startsWith("/admin/tong-hop-du-gio") 
                      ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10" 
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                      pathname.startsWith("/admin/tong-hop-du-gio")
                        ? "bg-amber-500/20 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                        : "bg-white/5 border border-white/10 group-hover:border-amber-500/30"
                    }`}>
                      <PieChart className={`w-4 h-4 transition-all ${
                        pathname.startsWith("/admin/tong-hop-du-gio") ? "text-amber-400" : "text-slate-400 group-hover:text-amber-400 group-hover:scale-110"
                      }`} />
                    </div>
                    {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">2. Tổng hợp kết quả</span>}
                  </div>
                  {!isCollapsed && (
                    <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform duration-200 ${observesExpanded ? 'rotate-180' : ''}`} />
                  )}
                </button>
                {!isCollapsed && observesExpanded && (
                  <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-white/10 pl-3 animate-in slide-in-from-top-2 duration-200">
                    <Link href="/admin/tong-hop-du-gio?block=k12" onClick={() => setIsOpen(false)}
                      className={`group flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                        pathname.startsWith("/admin/tong-hop-du-gio") && searchParams?.get("block") !== "mammon" && searchParams?.get("block") !== "dieuhan"
                          ? "bg-indigo-500/20 text-white border border-indigo-500/30"
                          : "text-white/60 hover:text-white hover:bg-indigo-500/10"
                      }`}>
                      <span className="w-5 h-5 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[9px] font-black text-indigo-300">K</span>
                      Phổ thông K-12
                    </Link>
                    <Link href="/admin/tong-hop-du-gio?block=mammon" onClick={() => setIsOpen(false)}
                      className={`group flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                        pathname.startsWith("/admin/tong-hop-du-gio") && searchParams?.get("block") === "mammon"
                          ? "bg-amber-500/20 text-white border border-amber-500/30"
                          : "text-white/60 hover:text-white hover:bg-amber-500/10"
                      }`}>
                      <span className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-[9px] font-black text-amber-300">M</span>
                      Mầm non
                    </Link>
                    <Link href="/admin/tong-hop-du-gio?block=dieuhan" onClick={() => setIsOpen(false)}
                      className={`group flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                        pathname.startsWith("/admin/tong-hop-du-gio") && searchParams?.get("block") === "dieuhan"
                          ? "bg-teal-500/20 text-white border border-teal-500/30"
                          : "text-white/60 hover:text-white hover:bg-teal-500/10"
                      }`}>
                      <span className="w-5 h-5 rounded-md bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-[9px] font-black text-teal-300">Đ</span>
                      Điều hành
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {(role === "ADMIN" || (permissionModules && permissionModules.length > 0)) && APP_CATEGORIES.map((cat) => {
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
                className="pt-4 border-t border-white/10 mt-2 group/cat transition-all duration-300"
              >
                {/* Category Header */}
                <div 
                  onClick={() => toggleCategory(cat.id)}
                  className="px-3 py-2 cursor-pointer select-none flex items-center justify-between text-white/60 hover:text-white/90 transition-colors group"
                >
                  {!isCollapsed ? (
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-extrabold text-[#48BFE3] uppercase tracking-[0.12em] group-hover:text-teal-400 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                        {cat.name}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full flex justify-center">
                      <span className="w-full text-center text-[#48BFE3] block text-[10px] font-bold">{cat.name.charAt(0)}</span>
                    </div>
                  )}
                  {!isCollapsed && (
                    <ChevronDown 
                      className={`w-3.5 h-3.5 text-[#48BFE3]/50 group-hover:text-[#48BFE3] transition-transform duration-300 ${
                        hasActiveChild ? 'rotate-180 text-[#48BFE3]' : ''
                      }`} 
                    />
                  )}
                </div>

                {/* Sub-items Container */}
                <div 
                  className={`overflow-hidden transition-all duration-350 ease-in-out space-y-1 ${
                    (expandedCategories[cat.id] ?? hasActiveChild)
                      ? "max-h-[800px] opacity-100 visible mt-1" 
                      : "max-h-0 opacity-0 invisible"
                  }`}
                >
                  {visibleModules.map((m: any, index: number) => {
                    const isActive = pathname === m.href || (m.subModules && m.subModules.some((sub: any) => pathname === sub.href || (sub.href && pathname.startsWith(sub.href + "/"))))
                    
                    // Assign colors dynamically based on index to match Teacher styling aesthetics
                    const colorVariants = [
                      { activeBg: "bg-amber-500/20", activeBorder: "border-amber-500/40", activeShadow: "shadow-[0_0_8px_rgba(245,158,11,0.25)]", activeText: "text-amber-400", hoverBorder: "group-hover:border-amber-500/30", hoverText: "group-hover:text-amber-400" },
                      { activeBg: "bg-indigo-500/20", activeBorder: "border-indigo-500/40", activeShadow: "shadow-[0_0_8px_rgba(99,102,241,0.25)]", activeText: "text-indigo-400", hoverBorder: "group-hover:border-indigo-500/30", hoverText: "group-hover:text-indigo-400" },
                      { activeBg: "bg-teal-500/20", activeBorder: "border-teal-500/40", activeShadow: "shadow-[0_0_8px_rgba(20,184,166,0.25)]", activeText: "text-teal-400", hoverBorder: "group-hover:border-teal-500/30", hoverText: "group-hover:text-teal-400" },
                      { activeBg: "bg-sky-500/20", activeBorder: "border-sky-500/40", activeShadow: "shadow-[0_0_8px_rgba(14,165,233,0.25)]", activeText: "text-sky-400", hoverBorder: "group-hover:border-sky-500/30", hoverText: "group-hover:text-sky-400" },
                      { activeBg: "bg-fuchsia-500/20", activeBorder: "border-fuchsia-500/40", activeShadow: "shadow-[0_0_8px_rgba(217,70,239,0.25)]", activeText: "text-fuchsia-400", hoverBorder: "group-hover:border-fuchsia-500/30", hoverText: "group-hover:text-fuchsia-400" },
                      { activeBg: "bg-emerald-500/20", activeBorder: "border-emerald-500/40", activeShadow: "shadow-[0_0_8px_rgba(16,185,129,0.25)]", activeText: "text-emerald-400", hoverBorder: "group-hover:border-emerald-500/30", hoverText: "group-hover:text-emerald-400" },
                      { activeBg: "bg-rose-500/20", activeBorder: "border-rose-500/40", activeShadow: "shadow-[0_0_8px_rgba(244,63,94,0.25)]", activeText: "text-rose-400", hoverBorder: "group-hover:border-rose-500/30", hoverText: "group-hover:text-rose-400" },
                    ];
                    const v = colorVariants[index % colorVariants.length];

                    return (
                      <Link 
                        key={m.code} 
                        href={m.href}
                        onClick={() => setIsOpen(false)}
                        className={`group relative flex items-center justify-between ${isCollapsed ? 'px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold mb-1.5 ${
                          isActive 
                            ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10" 
                            : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                        }`}
                      >
                        <div className="flex items-center">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                            isActive
                              ? `${v.activeBg} border ${v.activeBorder} ${v.activeShadow}`
                              : `bg-white/5 border border-white/10 ${v.hoverBorder}`
                          }`}>
                            <m.icon className={`w-4 h-4 transition-all ${
                              isActive ? v.activeText : `text-slate-400 ${v.hoverText} group-hover:scale-110`
                            }`} />
                          </div>
                          {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{index + 1}. {m.name}</span>}
                        </div>
                        {m.code === "TASKS" && taskCount > 0 && !isCollapsed && (
                          <span className="text-[9px] font-black text-white min-w-[18px] text-center shadow-lg shadow-red-500/40 bg-red-500 rounded-full px-1.5 py-0.5">
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
              {/* Dashboard Overview Link */}
              <Link 
                href="/teacher" 
                onClick={() => setIsOpen(false)} 
                className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold mb-3 ${
                  pathname === '/teacher' 
                    ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10" 
                    : "text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-1"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                  pathname === '/teacher'
                    ? "bg-teal-500/30 border border-teal-400/50 shadow-[0_0_8px_rgba(20,184,166,0.35)]"
                    : "bg-white/10 border border-white/15 group-hover:border-teal-500/40"
                }`}>
                  <LayoutDashboard className={`w-4 h-4 transition-all ${
                    pathname === '/teacher' ? "text-teal-300" : "text-slate-300 group-hover:text-teal-300 group-hover:scale-110"
                  }`} />
                </div>
                {!isCollapsed && <span>Tổng quan</span>}
              </Link>
              {/* Category A. Công tác GVCN - Only show if isGVCN is true */}
              {isGVCN && (
                <div className="mb-4">
                  <div className="px-3 py-2">
                    {!isCollapsed ? (
                      <span className="text-[10px] font-extrabold text-[#48BFE3] uppercase tracking-[0.12em]">
                        A. Công tác GVCN
                      </span>
                    ) : (
                      <span className="w-full text-center text-[#48BFE3] block text-[10px] font-bold">A</span>
                    )}
                  </div>
                  
                  {/* 1. Lớp chủ nhiệm */}
                  <Link 
                    href="/teacher/classes" 
                    onClick={() => setIsOpen(false)} 
                    className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold mb-1.5 ${
                      pathname.includes('/teacher/classes') 
                        ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10" 
                        : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                      pathname.includes('/teacher/classes')
                        ? "bg-teal-500/20 border border-teal-500/40 shadow-[0_0_8px_rgba(20,184,166,0.25)]"
                        : "bg-white/5 border border-white/10 group-hover:border-teal-500/30"
                    }`}>
                      <Layers className={`w-4 h-4 transition-all ${
                        pathname.includes('/teacher/classes') ? "text-teal-400" : "text-slate-400 group-hover:text-teal-400 group-hover:scale-110"
                      }`} />
                    </div>
                    {!isCollapsed && <span>1. Lớp chủ nhiệm</span>}
                  </Link>

                  {/* 2. NSP Khảo sát */}
                  <Link 
                    href="/teacher/surveys" 
                    onClick={() => setIsOpen(false)} 
                    className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold mb-1.5 ${
                      (pathname.includes('/teacher/surveys') || pathname.includes('/teacher/nps') || pathname.includes('/teacher/feedback')) 
                        ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10" 
                        : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                      (pathname.includes('/teacher/surveys') || pathname.includes('/teacher/nps') || pathname.includes('/teacher/feedback'))
                        ? "bg-sky-500/20 border border-sky-500/40 shadow-[0_0_8px_rgba(14,165,233,0.25)]"
                        : "bg-white/5 border border-white/10 group-hover:border-sky-500/30"
                    }`}>
                      <FileText className={`w-4 h-4 transition-all ${
                        (pathname.includes('/teacher/surveys') || pathname.includes('/teacher/nps') || pathname.includes('/teacher/feedback')) ? "text-sky-400" : "text-slate-400 group-hover:text-sky-400 group-hover:scale-110"
                      }`} />
                    </div>
                    {!isCollapsed && <span>2. NSP Khảo sát</span>}
                  </Link>

                  {/* 3. Hồ sơ Học sinh */}
                  <Link 
                    href="/teacher/ho-so-hoc-sinh" 
                    onClick={() => setIsOpen(false)} 
                    className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold mb-1.5 ${
                      pathname.includes('/teacher/ho-so-hoc-sinh') 
                        ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10" 
                        : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                      pathname.includes('/teacher/ho-so-hoc-sinh')
                        ? "bg-fuchsia-500/20 border border-fuchsia-500/40 shadow-[0_0_8px_rgba(217,70,239,0.25)]"
                        : "bg-white/5 border border-white/10 group-hover:border-fuchsia-500/30"
                    }`}>
                      <ClipboardCheck className={`w-4 h-4 transition-all ${
                        pathname.includes('/teacher/ho-so-hoc-sinh') ? "text-fuchsia-400" : "text-slate-400 group-hover:text-fuchsia-400 group-hover:scale-110"
                      }`} />
                    </div>
                    {!isCollapsed && <span>3. Hồ sơ Học sinh</span>}
                  </Link>

                  {/* 4. Phụ đạo, bồi dưỡng Học sinh */}
                  <Link 
                    href="/teacher/ho-tro-hoc-tap" 
                    onClick={() => setIsOpen(false)} 
                    className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold ${
                      pathname.includes('/teacher/ho-tro-hoc-tap') 
                        ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10" 
                        : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                      pathname.includes('/teacher/ho-tro-hoc-tap')
                        ? "bg-emerald-500/20 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                        : "bg-white/5 border border-white/10 group-hover:border-emerald-500/30"
                    }`}>
                      <FileText className={`w-4 h-4 transition-all ${
                        pathname.includes('/teacher/ho-tro-hoc-tap') ? "text-emerald-400" : "text-slate-400 group-hover:text-emerald-400 group-hover:scale-110"
                      }`} />
                    </div>
                    {!isCollapsed && <span>4. Phụ đạo, bồi dưỡng Học sinh</span>}
                  </Link>

                  {/* 5. Sổ theo dõi Hướng nghiệp */}
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
                    {!isCollapsed && <span>5. Sổ theo dõi Hướng nghiệp</span>}
                  </Link>
                </div>
              )}

              {/* Category B. Công tác GVBM */}
              <div className="pt-4 border-t border-white/10 mt-2">
                <div className="px-3 py-2">
                  {!isCollapsed ? (
                    <span className="text-[10px] font-extrabold text-[#48BFE3] uppercase tracking-[0.12em]">
                      B. Công tác GVBM
                    </span>
                  ) : (
                    <span className="w-full text-center text-[#48BFE3] block text-[10px] font-bold">B</span>
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
                            {!isCollapsed && <span>1. Khảo sát đầu vào</span>}
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
                  {!isCollapsed && <span>2. Dự giờ đánh giá Giáo viên</span>}
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
                  {!isCollapsed && <span>3. Sổ theo dõi Hướng nghiệp</span>}
                </Link>

                {/* 4. Hoạt động trải nghiệm */}
                <Link 
                  href="/teacher/experiential-activities" 
                  onClick={() => setIsOpen(false)} 
                  className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold mb-1.5 ${
                    pathname.includes('/teacher/experiential-activities/create')
                      ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10"
                      : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                    pathname.includes('/teacher/experiential-activities/create')
                      ? "bg-emerald-500/20 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                      : "bg-white/5 border border-white/10 group-hover:border-emerald-500/30"
                  }`}>
                    <BookOpen className={`w-4 h-4 transition-all ${
                      pathname.includes('/teacher/experiential-activities/create') ? "text-emerald-400" : "text-slate-400 group-hover:text-emerald-400 group-hover:scale-110"
                    }`} />
                  </div>
                  {!isCollapsed && <span>4. Hoạt động trải nghiệm</span>}
                </Link>

                
                {/* 5. Sổ điểm/nhận xét */}
                <Link 
                  href="/teacher/so-diem-nhan-xet" 
                  onClick={() => setIsOpen(false)} 
                  className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold mb-1.5 ${
                    pathname.includes('/teacher/so-diem-nhan-xet')
                      ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10"
                      : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                    pathname.includes('/teacher/so-diem-nhan-xet')
                      ? "bg-teal-500/20 border border-teal-500/40 shadow-[0_0_8px_rgba(20,184,166,0.25)]"
                      : "bg-white/5 border border-white/10 group-hover:border-teal-500/30"
                  }`}>
                    <ClipboardCheck className={`w-4 h-4 transition-all ${
                      pathname.includes('/teacher/so-diem-nhan-xet') ? "text-teal-400" : "text-slate-400 group-hover:text-teal-400 group-hover:scale-110"
                    }`} />
                  </div>
                  {!isCollapsed && <span>5. Sổ điểm/nhận xét</span>}
                </Link>

                {/* 6. Phân công giảng dạy */}
                <Link 
                  href="/teacher/phan-cong-giang-day" 
                  onClick={() => setIsOpen(false)} 
                  className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold ${
                    pathname.includes('/teacher/phan-cong-giang-day')
                      ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10"
                      : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                    pathname.includes('/teacher/phan-cong-giang-day')
                      ? "bg-violet-500/20 border border-violet-500/40 shadow-[0_0_8px_rgba(139,92,246,0.25)]"
                      : "bg-white/5 border border-white/10 group-hover:border-violet-500/30"
                  }`}>
                    <BookMarked className={`w-4 h-4 transition-all ${
                      pathname.includes('/teacher/phan-cong-giang-day') ? "text-violet-400" : "text-slate-400 group-hover:text-violet-400 group-hover:scale-110"
                    }`} />
                  </div>
                  {!isCollapsed && <span>5. Phân công giảng dạy</span>}
                </Link>

                {/* 7. Phụ đạo, bồi dưỡng Học sinh */}
                <Link 
                  href="/teacher/ho-tro-hoc-tap" 
                  onClick={() => setIsOpen(false)} 
                  className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold ${
                    pathname.includes('/teacher/ho-tro-hoc-tap') 
                      ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10" 
                      : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                    pathname.includes('/teacher/ho-tro-hoc-tap')
                      ? "bg-emerald-500/20 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                      : "bg-white/5 border border-white/10 group-hover:border-emerald-500/30"
                  }`}>
                    <FileText className={`w-4 h-4 transition-all ${
                      pathname.includes('/teacher/ho-tro-hoc-tap') ? "text-emerald-400" : "text-slate-400 group-hover:text-emerald-400 group-hover:scale-110"
                    }`} />
                  </div>
                  {!isCollapsed && <span>6. Phụ đạo, bồi dưỡng Học sinh</span>}
                </Link>

                {/* 7. Thời khóa biểu */}
                <Link 
                  href="/teacher/thoi-khoa-bieu" 
                  onClick={() => setIsOpen(false)} 
                  className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold mt-1.5 ${
                    pathname.includes('/teacher/thoi-khoa-bieu') 
                      ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10" 
                      : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${
                    pathname.includes('/teacher/thoi-khoa-bieu')
                      ? "bg-amber-500/20 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                      : "bg-white/5 border border-white/10 group-hover:border-amber-500/30"
                  }`}>
                    <Calendar className={`w-4 h-4 transition-all ${
                      pathname.includes('/teacher/thoi-khoa-bieu') ? "text-amber-400" : "text-slate-400 group-hover:text-amber-400 group-hover:scale-110"
                    }`} />
                  </div>
                  {!isCollapsed && <span>7. Thời khóa biểu</span>}
                </Link>
              </div>
            </>
          )}
                    {role === "PARENT" && (
            <div className="space-y-1">
              <Link 
                href="/parent" 
                onClick={() => setIsOpen(false)} 
                className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl transition-all text-xs font-bold ${
                  pathname === '/parent' ? "bg-white/20 text-white border border-[#135E5B]/30" : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 mr-2.5 text-teal-300 shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">Tổng quan</span>}
              </Link>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('openLinkStudentModal'));
                  }
                }}
                className={`w-full text-left group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl transition-all text-xs font-bold text-amber-300 hover:text-white hover:bg-white/10` }
              >
                <UserPlus className="w-4 h-4 mr-2.5 text-amber-400 shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">Thêm tài khoản Học sinh</span>}
              </button>

              <Link 
                href="/parent/surveys" 
                onClick={() => setIsOpen(false)} 
                className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl transition-all text-xs font-bold ${
                  pathname.startsWith('/parent/surveys') ? "bg-white/20 text-white border border-[#135E5B]/30" : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <ClipboardList className="w-4 h-4 mr-2.5 text-amber-400 shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">Khảo sát định kỳ</span>}
              </Link>

              <Link 
                href="/parent/children/profile" 
                onClick={() => setIsOpen(false)} 
                className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl transition-all text-xs font-bold ${
                  pathname.startsWith('/parent/children/profile') ? "bg-white/20 text-white border border-[#135E5B]/30" : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <GraduationCap className="w-4 h-4 mr-2.5 text-sky-300 shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">Hồ sơ học sinh</span>}
              </Link>

              <Link 
                href="/parent/children/advisory" 
                onClick={() => setIsOpen(false)} 
                className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl transition-all text-xs font-bold ${
                  pathname.startsWith('/parent/children/advisory') ? "bg-white/20 text-white border border-[#135E5B]/30" : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Compass className="w-4 h-4 mr-2.5 text-emerald-300 shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">Cố vấn học tập</span>}
              </Link>
            </div>
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
