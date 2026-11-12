"use client"
// @ts-nocheck
import {
  Activity, useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { signOut } from "next-auth/react"
// imports updated
import {
  BarChart3,
  Award,
  Sparkles,
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
  Calendar,
  RotateCcw,
  Baby,
  Globe,
  Grid3X3,
  Heart,
  Coins,
  Shield,
  QrCode,
  PenTool,
  FileCheck,
  Users
} from "lucide-react"
import { APP_CATEGORIES } from "@/config/modules"
import {
  SIDEBAR_TRANSLATIONS,
  SupportedLanguage,
  getCategoryName,
  getModuleName
} from "@/config/sidebarTranslations"
import { VietnamFlag, UKFlag } from "@/components/LanguageSwitcher"

interface SidebarProps {
  role: "ADMIN" | "TEACHER" | "PARENT"
  permissionModules?: string[]
  actualRole?: string
  taskCount?: number
  isTTCM?: boolean
  isGVCN?: boolean
  isPreschoolTeacher?: boolean
  assignedSpecialSubjects?: string[]
}

function SidebarContent({ role, permissionModules, actualRole, taskCount = 0, isTTCM = false, isGVCN = false, isPreschoolTeacher = false, assignedSpecialSubjects }: SidebarProps) {
  const rawPathname = usePathname()
  const pathname = rawPathname || ""
  const searchParams = useSearchParams()
  const typeParam = searchParams?.get("type")
  const subjectParam = searchParams?.get("subject")?.toUpperCase()
  const isSuperAdmin = actualRole === "ADMIN" || actualRole === "Admin"
  const normalizedRole = (actualRole || "").toUpperCase()
  const isGDCS = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS", "BGH", "BGH_CS", "BGH_MN", "BGH MN", "BGH_MAM_NON"].some(r => normalizedRole.includes(r)) || normalizedRole.includes("GDCS") || normalizedRole.includes("GĐCS")
  
  const [lang, setLang] = useState<SupportedLanguage>("vi")
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hasPreschool, setHasPreschool] = useState(false)
  const [hasGeneral, setHasGeneral] = useState(false)
  const [specialSubjectCodes, setSpecialSubjectCodes] = useState<string[]>(assignedSpecialSubjects || [])
  const [loadingAssignments, setLoadingAssignments] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ SYSTEM_KPIS: true, SPECIAL_SUBJECTS: true, STUDENT_LOOKUP: true, KTDBCL: true, ASSESSMENT: true, TRAINING: true, SYSTEM: true })
  const [pendingSignatureCount, setPendingSignatureCount] = useState<number>(0)
  const [expandedTeacherGroups, setExpandedTeacherGroups] = useState<Record<string, boolean>>({
    GROUP_01: true,
    SKYLINE_CONNECT: true,
    GROUP_02: true,
    GROUP_03: true,
    GROUP_05: false,
    GROUP_06: true,
    GROUP_07: true,
    GROUP_10: false,
    GROUP_11: false,
    GROUP_12: false,
  })

  const toggleTeacherGroup = (groupId: string) => {
    setExpandedTeacherGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = (localStorage.getItem("ssm_lang") || localStorage.getItem("ssm_gvnn_lang")) as SupportedLanguage;
      if (saved === "en" || saved === "vi") {
        setLang(saved);
      } else if (pathname.includes("du-gio-gvnn") || normalizedRole.includes("GVNN") || normalizedRole.includes("FOREIGN")) {
        setLang("en");
      }
    }

    const handleLangEvent = (e: any) => {
      const newL = e.detail;
      if (newL === "en" || newL === "vi") {
        setLang(newL);
      }
    };

    window.addEventListener("ssm_language_change", handleLangEvent);
    return () => window.removeEventListener("ssm_language_change", handleLangEvent);
  }, [pathname, normalizedRole]);

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLang(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("ssm_lang", newLang);
      localStorage.setItem("ssm_gvnn_lang", newLang);
      window.dispatchEvent(new CustomEvent("ssm_language_change", { detail: newLang }));
    }
  };
  const [observesExpanded, setObservesExpanded] = useState(pathname.startsWith("/admin/du-gio"))
  const [expandedSubModules, setExpandedSubModules] = useState<Record<string, boolean>>({ QL_DGNL: true, KTDBCL_EXAMS: false, KTDBCL_INTERNATIONAL_EXAMS: true, COMPETENCY_ASSESSMENT: true })

  const checkPermission = (module?: string, requiresAdmin?: boolean, subModules?: any[]) => {
    if (isSuperAdmin) return true
    if (requiresAdmin) return false
    if (!module) return false
    
    let hasParent = permissionModules?.includes(module) || false
    if (module === "KTDBCL_EXAMS") {
      hasParent = hasParent || permissionModules?.includes("KTDBCL_EXAM_CONFIG") || false
    }
    if (module === "KTDBCL_INTERNATIONAL_EXAMS") {
      hasParent = hasParent || permissionModules?.includes("KTDBCL_EXAMS") || permissionModules?.includes("KTDBCL_EXAM_CONFIG") || permissionModules?.includes("KTDBCL_GRADE_CTQT") || false
    }
    if (module === "KTDBCL_THONG_KE_BAO_CAO") {
      hasParent = hasParent || permissionModules?.includes("KTDBCL_GRADE_REMARKS") || permissionModules?.includes("KTDBCL_PHAN_TICH_THKQ") || false
    }
    if (module === "TEACHER_TRANSFERS") {
      hasParent = hasParent || permissionModules?.includes("TEACHERS") || permissionModules?.includes("STUDENT_TRANSFERS") || false
    }
    if (module === "KPI_IP21_REFLECTION_PRIDE") {
      hasParent =
        hasParent ||
        isGDCS ||
        normalizedRole.includes("KTDBCL") ||
        normalizedRole.includes("DBCL") ||
        permissionModules?.includes("SURVEY_PERIODS") ||
        permissionModules?.includes("COMPETENCY_ASSESSMENT") ||
        false
    }
    if (module === "DIEU_HANH_KHAO_SAT") {
      hasParent =
        hasParent ||
        isGDCS ||
        normalizedRole.includes("KTDBCL") ||
        normalizedRole.includes("DBCL") ||
        normalizedRole.includes("GIAO_VU") ||
        normalizedRole.includes("TU_VAN") ||
        permissionModules?.includes("CAU_HINH_KHAO_SAT") ||
        permissionModules?.includes("STUDENT_INFO") ||
        permissionModules?.includes("PHAN_CONG_KHAO_SAT") ||
        permissionModules?.includes("KET_QUA_KHAO_SAT") ||
        permissionModules?.includes("XET_DUYET_KET_QUA") ||
        permissionModules?.includes("INPUT_ASSESSMENTS") ||
        false
    }
    if (hasParent) return true
    if (subModules && subModules.length > 0) {
      return subModules.some((sub) => permissionModules?.includes(sub.code))
    }
    return false
  }

  const isPreschoolRole = isPreschoolTeacher || ['GV_MN', 'BGH_MN', 'MN', 'MAM_NON', 'BGH MAM NON', 'BGH_MAM_NON'].includes(normalizedRole);
  const showPreschoolObservation = isPreschoolRole || hasPreschool || isSuperAdmin || checkPermission("DU_GIO_MAM_NON");
  const showK12Observation = (!isPreschoolRole && !hasPreschool) || hasGeneral || isSuperAdmin || checkPermission("DU_GIO_K12");

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
    if (Array.isArray(assignedSpecialSubjects)) {
      setSpecialSubjectCodes(assignedSpecialSubjects.map(c => String(c || "").toUpperCase().trim()).filter(Boolean))
    }
  }, [assignedSpecialSubjects])

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

      if (assignedSpecialSubjects === undefined) {
        fetch("/api/special-subjects/assignments?scope=TEACHER")
          .then(res => res.json())
          .then(json => {
            if (Array.isArray(json?.assignedSubjects)) {
              setSpecialSubjectCodes(
                json.assignedSubjects.map((s: any) => String(s.code || "").toUpperCase().trim()).filter(Boolean)
              );
            } else if (Array.isArray(json?.assignments)) {
              const codes = Array.from(
                new Set(
                  json.assignments.map((a: any) => String(a.subject?.code || "").toUpperCase().trim()).filter(Boolean)
                )
              ) as string[];
              setSpecialSubjectCodes(codes);
            }
          })
          .catch(() => {});
      }
    } else {
      setLoadingAssignments(false);
    }
  }, [role, assignedSpecialSubjects])

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

  // Auto-expand active group for Teacher Navigation
  useEffect(() => {
    if (role === "TEACHER") {
      fetch("/api/teacher/digital-signature/documents")
        .then(res => {
          if (!res.ok) return null;
          return res.json();
        })
        .then(data => {
          if (data?.stats?.pending !== undefined) {
            setPendingSignatureCount(Number(data.stats.pending));
          }
        })
        .catch(() => {});

      if (pathname.startsWith("/teacher/skyline-connect")) {
        setExpandedTeacherGroups(prev => ({ ...prev, SKYLINE_CONNECT: true }));
      } else if (
        pathname === "/teacher" ||
        pathname.startsWith("/teacher/tasks") ||
        pathname.startsWith("/teacher/phan-cong-giang-day") ||
        pathname.startsWith("/teacher/thoi-khoa-bieu") ||
        pathname.startsWith("/teacher/ban-tin-thong-bao") ||
        pathname.startsWith("/teacher/ktdbcl-connect")
      ) {
        setExpandedTeacherGroups(prev => ({ ...prev, GROUP_01: true }));
      } else if (
        pathname.startsWith("/teacher/ho-so-hoc-sinh") ||
        pathname.startsWith("/teacher/trao-doi-ho-tro")
      ) {
        setExpandedTeacherGroups(prev => ({ ...prev, GROUP_02: true }));
      } else if (
        pathname.startsWith("/teacher/classes") ||
        pathname.startsWith("/teacher/diem-lop-chu-nhiem") ||
        pathname.startsWith("/teacher/nps-tu-hao-skl")
      ) {
        setExpandedTeacherGroups(prev => ({ ...prev, GROUP_03: true }));
      } else if (
        pathname.startsWith("/teacher/input-assessments") ||
        pathname.startsWith("/teacher/khao-thi-so")
      ) {
        setExpandedTeacherGroups(prev => ({ ...prev, GROUP_05: true }));
      } else if (
        pathname.startsWith("/teacher/special-subjects") &&
        !pathname.includes("skyline-journey")
      ) {
        setExpandedTeacherGroups(prev => ({ ...prev, GROUP_06: true }));
      } else if (
        pathname.startsWith("/teacher/so-diem-nhan-xet") ||
        pathname.startsWith("/teacher/so-diem-ctqt") ||
        pathname.startsWith("/teacher/phan-tich-chat-luong")
      ) {
        setExpandedTeacherGroups(prev => ({ ...prev, GROUP_07: true }));
      } else if (
        pathname.startsWith("/teacher/du-gio") ||
        pathname.includes("skyline-journey")
      ) {
        setExpandedTeacherGroups(prev => ({ ...prev, GROUP_10: true }));
      } else if (
        pathname.startsWith("/teacher/phoi-hop-giao-duc") ||
        pathname.startsWith("/teacher/hop-phu-huynh") ||
        pathname.startsWith("/teacher/surveys") ||
        pathname.startsWith("/teacher/nps") ||
        pathname.startsWith("/teacher/feedback") ||
        pathname.startsWith("/teacher/bang-ten-phhs")
      ) {
        setExpandedTeacherGroups(prev => ({ ...prev, GROUP_11: true }));
      } else if (
        pathname.startsWith("/teacher/chu-ky-so") ||
        pathname.startsWith("/teacher/ho-so-cho-ky") ||
        pathname.startsWith("/teacher/profile/chu-ky-so")
      ) {
        setExpandedTeacherGroups(prev => ({ ...prev, GROUP_12: true }));
      }
    }
  }, [pathname, role]);

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
          <div className="flex items-center">
            <Link href="/teacher" className="inline-block transition-transform hover:scale-105 active:scale-95" title="Trang chủ - Tổng quan cá nhân">
              <img src="/logo.png" alt="Sky-Line" className={`h-8 w-auto object-contain brightness-0 invert opacity-95 transition-all ${isCollapsed ? 'scale-75' : ''}`} />
            </Link>
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
                      <span className="text-[11px] font-semibold text-[#5EEAD4] tracking-tight group-hover:text-teal-200 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                        {getCategoryName(cat.id, cat.name, lang)}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full flex justify-center">
                      <span className="w-full text-center text-[#5EEAD4] block text-[11px] font-semibold">
                        {getCategoryName(cat.id, cat.name, lang).charAt(0)}
                      </span>
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
                      ? "max-h-[1400px] opacity-100 visible mt-1" 
                      : "max-h-0 opacity-0 invisible"
                  }`}
                >
                  {visibleModules.map((m: any, index: number) => {
                    const isActive = pathname === m.href || (m.subModules && m.subModules.some((sub: any) => pathname === sub.href || (sub.href && pathname.startsWith(sub.href + "/"))))
                    
                    // Uniform Sky-Line Brand Theme
                    const v = {
                      activeBg: "bg-[#48BFE3]/20",
                      activeBorder: "border-[#48BFE3]/50",
                      activeShadow: "shadow-[0_0_10px_rgba(72,191,227,0.25)]",
                      activeText: "text-[#48BFE3]",
                      hoverBorder: "group-hover:border-teal-400/40",
                      hoverText: "group-hover:text-[#48BFE3]"
                    };

                    const rawSubModules = m.subModules || [];
                    const permittedSubModules = isSuperAdmin
                      ? rawSubModules
                      : rawSubModules.filter((sub: any) => permissionModules?.includes(sub.code));
                    const effectiveSubModules = permittedSubModules.length > 0 ? permittedSubModules : rawSubModules;
                    const hasSubModules = !isCollapsed && effectiveSubModules.length > 0;
                    const effectiveHref =
                      !isSuperAdmin && permittedSubModules.length > 0 && permittedSubModules.length < rawSubModules.length
                        ? permittedSubModules[0]?.href || m.href
                        : m.href;
                    const isSubExpanded = expandedSubModules[m.code] ?? (isActive || m.code === "QL_DGNL" || m.code === "COMPETENCY_ASSESSMENT");

                    return (
                      <div key={m.code} className="space-y-1 mb-1.5">
                        <div className="flex items-center">
                          <Link 
                            href={effectiveHref}
                            onClick={() => {
                              if (!hasSubModules) setIsOpen(false);
                            }}
                            className={`flex-1 group relative flex items-center justify-between ${isCollapsed ? 'px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
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
                              {!isCollapsed && (
                                <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                                  {index + 1}. {getModuleName(m.code, m.name, lang)}
                                </span>
                              )}
                            </div>
                            {m.code === "TASKS" && taskCount > 0 && !isCollapsed && (
                              <span className="text-[9px] font-medium text-white min-w-[18px] text-center shadow-lg shadow-red-500/40 bg-red-500 rounded-full px-1.5 py-0.5">
                                {taskCount}
                              </span>
                            )}
                          </Link>
                          {hasSubModules && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setExpandedSubModules(prev => ({ ...prev, [m.code]: !isSubExpanded }));
                              }}
                              className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg ml-1 transition-all"
                            >
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isSubExpanded ? 'rotate-180 text-teal-400' : ''}`} />
                            </button>
                          )}
                        </div>

                        {/* Render SubModules dropdown */}
                        {hasSubModules && isSubExpanded && (
                          <div className="pl-9 pr-1 space-y-1 py-1 border-l-2 border-teal-500/30 ml-4 animate-in fade-in slide-in-from-top-1 duration-200">
                            {effectiveSubModules.map((sub: any) => {
                              const currentTab = searchParams?.get("tab");
                              const isSubActive =
                                pathname === sub.href ||
                                (sub.href && sub.href !== m.href && !sub.href.includes("?") && pathname.startsWith(sub.href + "/")) ||
                                (sub.href?.includes("?") && pathname === sub.href.split("?")[0] && currentTab && sub.href.includes(`tab=${currentTab}`));
                              return (
                                <Link
                                  key={sub.code}
                                  href={sub.href || m.href}
                                  onClick={() => setIsOpen(false)}
                                  className={`block px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                                    isSubActive
                                      ? "bg-teal-500/25 text-teal-300 font-medium border border-teal-500/30 shadow-xs"
                                      : "text-white/65 hover:text-white hover:bg-white/10"
                                  }`}
                                >
                                  • {getModuleName(sub.code, sub.name, lang)}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {role === "TEACHER" && (
            <div className="space-y-3 pb-6">
              {/* =========================================================================
                  01. TỔNG QUAN & NHIỆM VỤ
                  ========================================================================= */}
              <div className="border-t border-white/10 pt-2">
                <div
                  onClick={() => toggleTeacherGroup("GROUP_01")}
                  className="px-3 py-1.5 cursor-pointer select-none flex items-center justify-between text-white/60 hover:text-white/90 transition-colors group"
                >
                  {!isCollapsed ? (
                    <span className="text-[11px] font-semibold text-[#5EEAD4] tracking-tight group-hover:text-teal-200 transition-colors">
                      {SIDEBAR_TRANSLATIONS.teacherNav.group_01?.[lang] || "01. Tổng quan & Nhiệm vụ"}
                    </span>
                  ) : (
                    <span className="w-full text-center text-[#5EEAD4] block text-[11px] font-semibold">01</span>
                  )}
                  {!isCollapsed && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#5EEAD4]/60 group-hover:text-[#5EEAD4] transition-transform duration-300 ${
                        expandedTeacherGroups.GROUP_01 ? "rotate-180 text-[#5EEAD4]" : ""
                      }`}
                    />
                  )}
                </div>

                <div
                  className={`overflow-hidden transition-all duration-300 space-y-1 ${
                    expandedTeacherGroups.GROUP_01 || isCollapsed ? "max-h-[800px] opacity-100 visible mt-1" : "max-h-0 opacity-0 invisible"
                  }`}
                >
                  {/* 1. Tổng quan cá nhân */}
                  <Link
                    href="/teacher"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname === "/teacher"
                        ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                        : "text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname === "/teacher"
                        ? "bg-teal-500/30 border border-teal-400/50 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.35)]"
                        : "bg-white/10 border border-white/15 text-slate-300 group-hover:text-teal-300 group-hover:scale-110"
                    }`}>
                      <LayoutDashboard className="w-4 h-4" />
                    </div>
                    {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "Personal Overview" : "Tổng quan cá nhân"}</span>}
                  </Link>

                  {/* 2. Nhiệm vụ của tôi */}
                  <Link
                    href="/teacher/tasks"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.startsWith("/teacher/tasks")
                        ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                        : "text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.startsWith("/teacher/tasks")
                        ? "bg-teal-500/30 border border-teal-400/50 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.35)]"
                        : "bg-white/10 border border-white/15 text-slate-300 group-hover:text-teal-300 group-hover:scale-110"
                    }`}>
                      <ClipboardList className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                      <div className="flex items-center justify-between flex-1 gap-2 min-w-0">
                        <span className="break-words leading-tight py-0.5">{lang === "en" ? "My Tasks" : "Nhiệm vụ của tôi"}</span>
                        {taskCount > 0 ? (
                          <span className="text-[10px] bg-[#00A19A] text-white px-2 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0 tabular-nums shadow-xs">
                            {taskCount}
                          </span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-teal-400/80 shrink-0" />
                        )}
                      </div>
                    )}
                  </Link>

                  {/* 3. Phân công giảng dạy */}
                  <Link
                    href="/teacher/phan-cong-giang-day"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.includes("/teacher/phan-cong-giang-day")
                        ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                        : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.includes("/teacher/phan-cong-giang-day")
                        ? "bg-teal-500/25 border border-teal-400/50 text-teal-200 shadow-[0_0_8px_rgba(45,212,191,0.3)]"
                        : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-teal-200 group-hover:scale-110"
                    }`}>
                      <BookMarked className="w-4 h-4" />
                    </div>
                    {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "Teaching Assignments" : "Phân công giảng dạy"}</span>}
                  </Link>

                  {/* 4. Thời khóa biểu */}
                  <Link
                    href="/teacher/thoi-khoa-bieu"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.includes("/teacher/thoi-khoa-bieu")
                        ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                        : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.includes("/teacher/thoi-khoa-bieu")
                        ? "bg-amber-500/25 border border-amber-400/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                        : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-amber-300 group-hover:scale-110"
                    }`}>
                      <Calendar className="w-4 h-4" />
                    </div>
                    {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "Timetable" : "Thời khóa biểu"}</span>}
                  </Link>

                  {/* 5. Trung tâm Thông báo */}
                  <Link
                    href="/teacher/ban-tin-thong-bao"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.startsWith("/teacher/ban-tin-thong-bao")
                        ? "bg-gradient-to-r from-teal-500/35 to-emerald-500/20 border border-teal-400/50 text-white shadow-md shadow-black/10"
                        : "text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.startsWith("/teacher/ban-tin-thong-bao")
                        ? "bg-teal-500/30 border border-teal-400/60 text-teal-200 shadow-[0_0_8px_rgba(45,212,191,0.4)]"
                        : "bg-white/10 border border-white/15 text-slate-300 group-hover:text-teal-200 group-hover:scale-110"
                    }`}>
                      <Bell className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="break-words leading-tight py-0.5">{lang === "en" ? "Notification Center" : "Trung tâm Thông báo"}</span>
                        <span className="text-[9px] bg-teal-500/30 text-teal-200 px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0">
                          GVCN•BM
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* 6. KT&ĐBCL Connect */}
                  <Link
                    href="/teacher/ktdbcl-connect"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.startsWith("/teacher/ktdbcl-connect")
                        ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                        : "text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.startsWith("/teacher/ktdbcl-connect")
                        ? "bg-teal-500/30 border border-teal-400/50 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.35)]"
                        : "bg-white/10 border border-white/15 text-slate-300 group-hover:text-teal-300 group-hover:scale-110"
                    }`}>
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="break-words leading-tight py-0.5">{lang === "en" ? "QA Connect & Support" : "KT&ĐBCL Connect"}</span>
                        <span className="text-[9px] bg-teal-500/30 text-teal-200 px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0">
                          2-Chiều
                        </span>
                      </div>
                    )}
                  </Link>
                </div>
              </div>

              {/* =========================================================================
                  SKY-LINE CONNECT (MẠNG XÃ HỘI SÁNG TẠO GIÁO VIÊN)
                  ========================================================================= */}
              <div className="border-t border-white/10 pt-2">
                <div
                  onClick={() => toggleTeacherGroup("SKYLINE_CONNECT")}
                  className="px-3 py-1.5 cursor-pointer select-none flex items-center justify-between text-white/60 hover:text-white/90 transition-colors group"
                >
                  {!isCollapsed ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-[#5EEAD4] tracking-tight group-hover:text-teal-200 transition-colors">
                        {SIDEBAR_TRANSLATIONS.teacherNav.skyline_connect?.[lang] || "Sky-Line Connect"}
                      </span>
                      <span className="text-[10px] bg-[#159EAA]/35 text-[#5EEAD4] border border-[#159EAA]/50 px-1.5 py-0.2 rounded-full font-semibold">
                        AI Wall
                      </span>
                    </div>
                  ) : (
                    <span className="w-full text-center text-[#5EEAD4] block text-[11px] font-semibold">SC</span>
                  )}
                  {!isCollapsed && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#5EEAD4]/60 group-hover:text-[#5EEAD4] transition-transform duration-300 ${
                        expandedTeacherGroups.SKYLINE_CONNECT ? "rotate-180 text-[#5EEAD4]" : ""
                      }`}
                    />
                  )}
                </div>

                <div
                  className={`overflow-hidden transition-all duration-300 space-y-1 ${
                    expandedTeacherGroups.SKYLINE_CONNECT || isCollapsed ? "max-h-[800px] opacity-100 visible mt-1" : "max-h-0 opacity-0 invisible"
                  }`}
                >
                  {/* 1. Bức tường ý tưởng AI */}
                  <Link
                    href="/teacher/skyline-connect"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname === "/teacher/skyline-connect" || pathname.startsWith("/teacher/skyline-connect/posts")
                        ? "bg-gradient-to-r from-[#159EAA]/40 to-teal-500/20 border border-[#159EAA]/50 text-white shadow-md shadow-black/10"
                        : "text-white/85 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname === "/teacher/skyline-connect" || pathname.startsWith("/teacher/skyline-connect/posts")
                        ? "bg-[#159EAA]/35 border border-teal-300/60 text-teal-200 shadow-[0_0_8px_rgba(21,158,170,0.4)]"
                        : "bg-white/10 border border-white/15 text-slate-300 group-hover:text-teal-200 group-hover:scale-110"
                    }`}>
                      <Sparkles className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                      <span className="break-words leading-tight py-0.5">
                        {SIDEBAR_TRANSLATIONS.teacherNav.slc_wall?.[lang] || "Bức tường ý tưởng AI"}
                      </span>
                    )}
                  </Link>

                  {/* 2. Khám phá sáng tạo */}
                  <Link
                    href="/teacher/skyline-connect/explore"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.startsWith("/teacher/skyline-connect/explore") || pathname.startsWith("/teacher/skyline-connect/products")
                        ? "bg-gradient-to-r from-[#159EAA]/40 to-teal-500/20 border border-[#159EAA]/50 text-white shadow-md shadow-black/10"
                        : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.startsWith("/teacher/skyline-connect/explore") || pathname.startsWith("/teacher/skyline-connect/products")
                        ? "bg-[#159EAA]/35 border border-teal-300/60 text-teal-200"
                        : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-teal-200 group-hover:scale-110"
                    }`}>
                      <Compass className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                      <span className="break-words leading-tight py-0.5">
                        {SIDEBAR_TRANSLATIONS.teacherNav.slc_explore?.[lang] || "Khám phá sáng tạo"}
                      </span>
                    )}
                  </Link>

                  {/* 3. Nhóm & Dự án */}
                  <Link
                    href="/teacher/skyline-connect/groups-projects"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.startsWith("/teacher/skyline-connect/groups-projects") || pathname.startsWith("/teacher/skyline-connect/projects")
                        ? "bg-gradient-to-r from-[#159EAA]/40 to-teal-500/20 border border-[#159EAA]/50 text-white shadow-md shadow-black/10"
                        : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.startsWith("/teacher/skyline-connect/groups-projects") || pathname.startsWith("/teacher/skyline-connect/projects")
                        ? "bg-[#159EAA]/35 border border-teal-300/60 text-teal-200"
                        : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-teal-200 group-hover:scale-110"
                    }`}>
                      <Users className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                      <span className="break-words leading-tight py-0.5">
                        {SIDEBAR_TRANSLATIONS.teacherNav.slc_groups_projects?.[lang] || "Nhóm & Dự án"}
                      </span>
                    )}
                  </Link>

                  {/* 4. Bảng vàng sáng tạo */}
                  <Link
                    href="/teacher/skyline-connect/hall-of-fame"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.startsWith("/teacher/skyline-connect/hall-of-fame")
                        ? "bg-gradient-to-r from-amber-500/30 to-teal-500/20 border border-amber-400/50 text-white shadow-md shadow-black/10"
                        : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.startsWith("/teacher/skyline-connect/hall-of-fame")
                        ? "bg-amber-500/30 border border-amber-300/60 text-amber-200"
                        : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-amber-300 group-hover:scale-110"
                    }`}>
                      <Award className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                      <span className="break-words leading-tight py-0.5">
                        {SIDEBAR_TRANSLATIONS.teacherNav.slc_hall_of_fame?.[lang] || "Bảng vàng sáng tạo"}
                      </span>
                    )}
                  </Link>

                  {/* 5. Không gian của tôi */}
                  <Link
                    href="/teacher/skyline-connect/my-space"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.startsWith("/teacher/skyline-connect/my-space") || pathname.startsWith("/teacher/skyline-connect/profile")
                        ? "bg-gradient-to-r from-[#159EAA]/40 to-teal-500/20 border border-[#159EAA]/50 text-white shadow-md shadow-black/10"
                        : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.startsWith("/teacher/skyline-connect/my-space") || pathname.startsWith("/teacher/skyline-connect/profile")
                        ? "bg-[#159EAA]/35 border border-teal-300/60 text-teal-200"
                        : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-teal-200 group-hover:scale-110"
                    }`}>
                      <BookOpen className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                      <span className="break-words leading-tight py-0.5">
                        {SIDEBAR_TRANSLATIONS.teacherNav.slc_my_space?.[lang] || "Không gian của tôi"}
                      </span>
                    )}
                  </Link>
                </div>
              </div>

              {/* =========================================================================
                  02. HỒ SƠ & ĐỒNG HÀNH HỌC SINH
                  ========================================================================= */}
              <div className="border-t border-white/10 pt-2">
                <div
                  onClick={() => toggleTeacherGroup("GROUP_02")}
                  className="px-3 py-1.5 cursor-pointer select-none flex items-center justify-between text-white/60 hover:text-white/90 transition-colors group"
                >
                  {!isCollapsed ? (
                    <span className="text-[11px] font-semibold text-[#5EEAD4] tracking-tight group-hover:text-teal-200 transition-colors">
                      {SIDEBAR_TRANSLATIONS.teacherNav.group_02?.[lang] || "02. Hồ sơ & Đồng hành Học sinh"}
                    </span>
                  ) : (
                    <span className="w-full text-center text-[#5EEAD4] block text-[11px] font-semibold">02</span>
                  )}
                  {!isCollapsed && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#5EEAD4]/60 group-hover:text-[#5EEAD4] transition-transform duration-300 ${
                        expandedTeacherGroups.GROUP_02 ? "rotate-180 text-[#5EEAD4]" : ""
                      }`}
                    />
                  )}
                </div>

                <div
                  className={`overflow-hidden transition-all duration-300 space-y-1 ${
                    expandedTeacherGroups.GROUP_02 || isCollapsed ? "max-h-[800px] opacity-100 visible mt-1" : "max-h-0 opacity-0 invisible"
                  }`}
                >
                  {/* Hồ sơ học sinh (A4) */}
                  <Link
                    href="/teacher/ho-so-hoc-sinh?tab=cv"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.includes("/teacher/ho-so-hoc-sinh") && (!searchParams?.get("tab") || searchParams.get("tab") === "cv")
                        ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                        : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.includes("/teacher/ho-so-hoc-sinh") && (!searchParams?.get("tab") || searchParams.get("tab") === "cv")
                        ? "bg-fuchsia-500/25 border border-fuchsia-400/50 text-fuchsia-300 shadow-[0_0_8px_rgba(217,70,239,0.3)]"
                        : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-fuchsia-300 group-hover:scale-110"
                    }`}>
                      <Users className="w-4 h-4" />
                    </div>
                    {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "Student Records" : "Hồ sơ học sinh"}</span>}
                  </Link>

                  {/* Hồ sơ học tập */}
                  <Link
                    href="/teacher/ho-so-hoc-sinh?tab=academic"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.includes("/teacher/ho-so-hoc-sinh") && searchParams?.get("tab") === "academic"
                        ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                        : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.includes("/teacher/ho-so-hoc-sinh") && searchParams?.get("tab") === "academic"
                        ? "bg-teal-500/25 border border-teal-400/50 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.3)]"
                        : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-teal-300 group-hover:scale-110"
                    }`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "Academic Profile" : "Hồ sơ học tập"}</span>}
                  </Link>

                  {/* Thành tích học sinh */}
                  <Link
                    href="/teacher/ho-so-hoc-sinh?tab=achievements"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.includes("/teacher/ho-so-hoc-sinh") && searchParams?.get("tab") === "achievements"
                        ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                        : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.includes("/teacher/ho-so-hoc-sinh") && searchParams?.get("tab") === "achievements"
                        ? "bg-amber-500/25 border border-amber-400/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                        : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-amber-300 group-hover:scale-110"
                    }`}>
                      <Award className="w-4 h-4" />
                    </div>
                    {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "Student Achievements" : "Thành tích học sinh"}</span>}
                  </Link>

                  {/* Trao đổi & Hỗ trợ Học sinh (GVBM) */}
                  <Link
                    href="/teacher/trao-doi-ho-tro"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.startsWith("/teacher/trao-doi-ho-tro")
                        ? "bg-gradient-to-r from-teal-500/35 to-emerald-500/20 border border-teal-400/50 text-white shadow-md shadow-black/10"
                        : "text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.startsWith("/teacher/trao-doi-ho-tro")
                        ? "bg-teal-500/30 border border-teal-400/60 text-teal-200 shadow-[0_0_8px_rgba(45,212,191,0.4)]"
                        : "bg-white/5 border border-white/10 text-slate-300 group-hover:text-teal-200 group-hover:scale-110"
                    }`}>
                      <MessageSquare className="w-4 h-4" />
                    </div>
                      {!isCollapsed && (
                        <div className="flex items-center justify-between flex-1 min-w-0">
                          <span className="break-words leading-tight py-0.5">{lang === "en" ? "Student Exchange & Support" : "Trao đổi & Hỗ trợ Học sinh"}</span>
                          <span className="text-[9px] bg-teal-500/30 text-teal-200 px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0">
                            GVBM
                          </span>
                        </div>
                      )}
                    </Link>

                    {/* Đồng hành & Hỗ trợ Cố vấn học tập (GVBM & Tổ TLHN) */}
                    <Link
                      href="/teacher/co-van-hoc-tap?tab=companion_support"
                      onClick={() => setIsOpen(false)}
                      className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                        pathname.startsWith("/teacher/co-van-hoc-tap") && searchParams?.get("tab") === "companion_support"
                          ? "bg-gradient-to-r from-teal-500/35 to-emerald-500/20 border border-teal-400/50 text-white shadow-md shadow-black/10"
                          : "text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-1"
                      }`}
                    >
                      <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                        pathname.startsWith("/teacher/co-van-hoc-tap") && searchParams?.get("tab") === "companion_support"
                          ? "bg-teal-500/30 border border-teal-400/60 text-teal-200 shadow-[0_0_8px_rgba(45,212,191,0.4)]"
                          : "bg-white/5 border border-white/10 text-slate-300 group-hover:text-teal-200 group-hover:scale-110"
                      }`}>
                        <Compass className="w-4 h-4" />
                      </div>
                      {!isCollapsed && (
                        <div className="flex items-center justify-between flex-1 min-w-0">
                          <span className="break-words leading-tight py-0.5">{lang === "en" ? "Companion & Support" : "Đồng hành & Hỗ trợ"}</span>
                          <span className="text-[9px] bg-teal-500/30 text-teal-200 px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0">
                            GVBM•TLHN
                          </span>
                        </div>
                      )}
                    </Link>
                  </div>
                </div>

              {/* =========================================================================
                  03. CHỦ NHIỆM & PHÁT TRIỂN LỚP HỌC (CHỈ HIỂN THỊ KHI ISGVCN)
                  ========================================================================= */}
              {isGVCN && (
                <div className="border-t border-white/10 pt-2">
                  <div
                    onClick={() => toggleTeacherGroup("GROUP_03")}
                    className="px-3 py-1.5 cursor-pointer select-none flex items-center justify-between text-white/60 hover:text-white/90 transition-colors group"
                  >
                    {!isCollapsed ? (
                      <span className="text-[11px] font-semibold text-[#5EEAD4] tracking-tight group-hover:text-teal-200 transition-colors">
                        {SIDEBAR_TRANSLATIONS.teacherNav.group_03?.[lang] || "03. Chủ nhiệm & Phát triển Lớp học"}
                      </span>
                    ) : (
                      <span className="w-full text-center text-[#5EEAD4] block text-[11px] font-semibold">03</span>
                    )}
                    {!isCollapsed && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#5EEAD4]/60 group-hover:text-[#5EEAD4] transition-transform duration-300 ${
                          expandedTeacherGroups.GROUP_03 ? "rotate-180 text-[#5EEAD4]" : ""
                        }`}
                      />
                    )}
                  </div>

                  <div
                    className={`overflow-hidden transition-all duration-300 space-y-1 ${
                      expandedTeacherGroups.GROUP_03 || isCollapsed ? "max-h-[800px] opacity-100 visible mt-1" : "max-h-0 opacity-0 invisible"
                    }`}
                  >
                    {/* 1. Lớp chủ nhiệm */}
                    <Link
                      href="/teacher/classes"
                      onClick={() => setIsOpen(false)}
                      className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                        pathname.includes("/teacher/classes")
                          ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                          : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                      }`}
                    >
                      <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                        pathname.includes("/teacher/classes")
                          ? "bg-teal-500/25 border border-teal-400/50 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.25)]"
                          : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-teal-300 group-hover:scale-110"
                      }`}>
                        <Layers className="w-4 h-4" />
                      </div>
                      {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "Homeroom Class" : "Lớp chủ nhiệm"}</span>}
                    </Link>

                    {/* 2. Điểm lớp chủ nhiệm */}
                    <Link
                      href="/teacher/diem-lop-chu-nhiem"
                      onClick={() => setIsOpen(false)}
                      className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                        pathname.includes("/teacher/diem-lop-chu-nhiem")
                          ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                          : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                      }`}
                    >
                      <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                        pathname.includes("/teacher/diem-lop-chu-nhiem")
                          ? "bg-teal-500/25 border border-teal-400/50 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.25)]"
                          : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-teal-300 group-hover:scale-110"
                      }`}>
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "Homeroom Grades" : "Điểm lớp chủ nhiệm"}</span>}
                    </Link>

                    {/* 3. NPS Tự hào Học sinh SKL */}
                    <Link
                      href="/teacher/nps-tu-hao-skl"
                      onClick={() => setIsOpen(false)}
                      className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                        pathname.startsWith("/teacher/nps-tu-hao-skl")
                          ? "bg-gradient-to-r from-teal-500/35 to-emerald-500/20 border border-teal-400/50 text-white shadow-md shadow-black/10"
                          : "text-white/85 hover:text-white hover:bg-white/10 hover:translate-x-1"
                      }`}
                    >
                      <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                        pathname.startsWith("/teacher/nps-tu-hao-skl")
                          ? "bg-teal-500/30 border border-teal-400/60 text-amber-200 shadow-[0_0_8px_rgba(45,212,191,0.4)]"
                          : "bg-white/5 border border-white/10 text-teal-200 group-hover:text-amber-200 group-hover:scale-110"
                      }`}>
                        <Award className="w-4 h-4" />
                      </div>
                      {!isCollapsed && (
                        <div className="flex items-center justify-between flex-1 min-w-0">
                          <span className="break-words leading-tight py-0.5">{lang === "en" ? "Student Pride NPS (IP2.1)" : "NPS Tự hào Học sinh SKL"}</span>
                          <span className="text-[9px] bg-amber-400/25 text-amber-200 px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0">
                            IP2.1
                          </span>
                        </div>
                      )}
                    </Link>

                    {/* 4. Cố vấn học tập (Đặt trong Công tác chủ nhiệm theo đặc tả Mục II) */}
                    <Link
                      href="/teacher/co-van-hoc-tap"
                      onClick={() => setIsOpen(false)}
                      className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                        pathname.includes("/teacher/co-van-hoc-tap") && searchParams?.get("tab") !== "companion_support"
                          ? "bg-gradient-to-r from-teal-500/35 to-emerald-500/20 border border-teal-400/50 text-white shadow-md shadow-black/10"
                          : "text-white/85 hover:text-white hover:bg-white/10 hover:translate-x-1"
                      }`}
                    >
                      <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                        pathname.includes("/teacher/co-van-hoc-tap") && searchParams?.get("tab") !== "companion_support"
                          ? "bg-teal-500/30 border border-teal-400/60 text-teal-200 shadow-[0_0_8px_rgba(45,212,191,0.4)]"
                          : "bg-white/5 border border-white/10 text-teal-200 group-hover:text-teal-100 group-hover:scale-110"
                      }`}>
                        <Compass className="w-4 h-4" />
                      </div>
                      {!isCollapsed && (
                        <div className="flex items-center justify-between flex-1 min-w-0">
                          <span className="break-words leading-tight py-0.5">{lang === "en" ? "Academic Advisory" : "Cố vấn học tập"}</span>
                          <span className="text-[9px] bg-teal-500/30 text-teal-200 px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0">
                            GVCN
                          </span>
                        </div>
                      )}
                    </Link>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  04. CỐ VẤN HỌC TẬP (CHO CVHT / TỔ TLHN KHÔNG PHẢI GVCN)
                  ========================================================================= */}
              {!isGVCN && (
                <div className="border-t border-white/10 pt-2">
                  <Link
                    href="/teacher/co-van-hoc-tap"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.includes("/teacher/co-van-hoc-tap")
                        ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                        : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.includes("/teacher/co-van-hoc-tap")
                        ? "bg-teal-500/25 border border-teal-400/50 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.25)]"
                        : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-teal-300 group-hover:scale-110"
                    }`}>
                      <Compass className="w-4 h-4" />
                    </div>
                    {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "04. Academic Advisory" : "04. Cố vấn học tập"}</span>}
                  </Link>
                </div>
              )}

              {/* =========================================================================
                  05. KHẢO THÍ & ĐÁNH GIÁ
                  ========================================================================= */}
              <div className="border-t border-white/10 pt-2">
                <div
                  onClick={() => toggleTeacherGroup("GROUP_05")}
                  className="px-3 py-1.5 cursor-pointer select-none flex items-center justify-between text-white/60 hover:text-white/90 transition-colors group"
                >
                  {!isCollapsed ? (
                    <span className="text-[11px] font-semibold text-[#5EEAD4] tracking-tight group-hover:text-teal-200 transition-colors">
                      {SIDEBAR_TRANSLATIONS.teacherNav.group_05?.[lang] || "05. Khảo thí & Đánh giá"}
                    </span>
                  ) : (
                    <span className="w-full text-center text-[#5EEAD4] block text-[11px] font-semibold">05</span>
                  )}
                  {!isCollapsed && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#5EEAD4]/60 group-hover:text-[#5EEAD4] transition-transform duration-300 ${
                        expandedTeacherGroups.GROUP_05 ? "rotate-180 text-[#5EEAD4]" : ""
                      }`}
                    />
                  )}
                </div>

                <div
                  className={`overflow-hidden transition-all duration-300 space-y-1 ${
                    expandedTeacherGroups.GROUP_05 || isCollapsed ? "max-h-[800px] opacity-100 visible mt-1" : "max-h-0 opacity-0 invisible"
                  }`}
                >
                  {/* Khảo sát định hướng đầu vào */}
                  {hasPreschool && !hasGeneral ? (
                    <Link
                      href="/teacher/input-assessments?type=preschool"
                      onClick={() => setIsOpen(false)}
                      className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                        pathname.includes("/teacher/input-assessments")
                          ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                          : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                      }`}
                    >
                      <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                        pathname.includes("/teacher/input-assessments")
                          ? "bg-amber-500/25 border border-amber-400/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                          : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-amber-300 group-hover:scale-110"
                      }`}>
                        <ClipboardCheck className="w-4 h-4" />
                      </div>
                      {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "Entrance Orientation (Preschool)" : "Khảo sát định hướng đầu vào (Mầm non)"}</span>}
                    </Link>
                  ) : (
                    <Link
                      href="/teacher/input-assessments?type=general"
                      onClick={() => setIsOpen(false)}
                      className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                        pathname.includes("/teacher/input-assessments")
                          ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                          : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                      }`}
                    >
                      <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                        pathname.includes("/teacher/input-assessments")
                          ? "bg-amber-500/25 border border-amber-400/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                          : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-amber-300 group-hover:scale-110"
                      }`}>
                        <ClipboardCheck className="w-4 h-4" />
                      </div>
                      {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "Entrance Orientation Assessment" : "Khảo sát định hướng đầu vào"}</span>}
                    </Link>
                  )}

                  {/* Khảo thí Số */}
                  <Link
                    href="/teacher/khao-thi-so"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.startsWith("/teacher/khao-thi-so")
                        ? "bg-gradient-to-r from-teal-500/35 to-emerald-500/20 border border-teal-400/50 text-white shadow-md shadow-black/10"
                        : "text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.startsWith("/teacher/khao-thi-so")
                        ? "bg-teal-500/30 border border-teal-400/60 text-teal-200 shadow-[0_0_8px_rgba(45,212,191,0.4)]"
                        : "bg-white/10 border border-white/15 text-slate-300 group-hover:text-teal-200 group-hover:scale-110"
                    }`}>
                      <QrCode className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="break-words leading-tight py-0.5">{lang === "en" ? "Digital Testing" : "Khảo thí Số"}</span>
                        <span className="text-[9px] bg-teal-500/30 text-teal-200 px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0">
                          OMR•LMS
                        </span>
                      </div>
                    )}
                  </Link>
                </div>
              </div>

              {/* =========================================================================
                  06. CÁC MÔN ĐẶC THÙ SKY-LINE (CHỈ HIỂN THỊ MÔN ĐƯỢC PHÂN CÔNG THỰC TẾ)
                  ========================================================================= */}
              {(specialSubjectCodes.includes("CXXH") ||
                specialSubjectCodes.includes("FIN_EDU") ||
                specialSubjectCodes.includes("GDHN") ||
                specialSubjectCodes.includes("GDGT")) && (
                <div className="border-t border-white/10 pt-2">
                  <div
                    onClick={() => toggleTeacherGroup("GROUP_06")}
                    className="px-3 py-1.5 cursor-pointer select-none flex items-center justify-between text-white/60 hover:text-white/90 transition-colors group"
                  >
                    {!isCollapsed ? (
                      <span className="text-[11px] font-semibold text-[#5EEAD4] tracking-tight group-hover:text-teal-200 transition-colors">
                        {SIDEBAR_TRANSLATIONS.teacherNav.group_06?.[lang] || "06. Các môn đặc thù Sky-Line"}
                      </span>
                    ) : (
                      <span className="w-full text-center text-[#5EEAD4] block text-[11px] font-semibold">06</span>
                    )}
                    {!isCollapsed && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#5EEAD4]/60 group-hover:text-[#5EEAD4] transition-transform duration-300 ${
                          expandedTeacherGroups.GROUP_06 ? "rotate-180 text-[#5EEAD4]" : ""
                        }`}
                      />
                    )}
                  </div>

                  <div
                    className={`overflow-hidden transition-all duration-300 space-y-1 ${
                      expandedTeacherGroups.GROUP_06 || isCollapsed ? "max-h-[800px] opacity-100 visible mt-1" : "max-h-0 opacity-0 invisible"
                    }`}
                  >
                    {/* Đánh giá GD Cảm xúc xã hội */}
                    {specialSubjectCodes.includes("CXXH") && (
                      <Link
                        href="/teacher/special-subjects/eval?subject=CXXH"
                        onClick={() => setIsOpen(false)}
                        className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                          pathname.includes("/teacher/special-subjects") && subjectParam === "CXXH"
                            ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                            : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                        }`}
                      >
                        <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                          pathname.includes("/teacher/special-subjects") && subjectParam === "CXXH"
                            ? "bg-rose-500/25 border border-rose-400/50 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.25)]"
                            : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-rose-300 group-hover:scale-110"
                        }`}>
                          <Heart className="w-4 h-4" />
                        </div>
                        {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "SEL Assessment" : "Đánh giá GD Cảm xúc xã hội"}</span>}
                      </Link>
                    )}

                    {/* Giáo dục tài chính cá nhân */}
                    {specialSubjectCodes.includes("FIN_EDU") && (
                      <Link
                        href="/teacher/special-subjects/eval?subject=FIN_EDU"
                        onClick={() => setIsOpen(false)}
                        className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                          pathname.includes("/teacher/special-subjects") && subjectParam === "FIN_EDU"
                            ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                            : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                        }`}
                      >
                        <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                          pathname.includes("/teacher/special-subjects") && subjectParam === "FIN_EDU"
                            ? "bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                            : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-emerald-300 group-hover:scale-110"
                        }`}>
                          <Coins className="w-4 h-4" />
                        </div>
                        {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "Financial Literacy" : "Giáo dục tài chính cá nhân"}</span>}
                      </Link>
                    )}

                    {/* Sổ theo dõi Hướng nghiệp */}
                    {specialSubjectCodes.includes("GDHN") && (
                      <Link
                        href="/teacher/special-subjects/eval?subject=GDHN"
                        onClick={() => setIsOpen(false)}
                        className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                          pathname.includes("/teacher/special-subjects") && subjectParam === "GDHN"
                            ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                            : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                        }`}
                      >
                        <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                          pathname.includes("/teacher/special-subjects") && subjectParam === "GDHN"
                            ? "bg-amber-500/25 border border-amber-400/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                            : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-amber-300 group-hover:scale-110"
                        }`}>
                          <Compass className="w-4 h-4" />
                        </div>
                        {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "Career Orientation Log" : "Sổ theo dõi Hướng nghiệp"}</span>}
                      </Link>
                    )}

                    {/* Đánh giá GD Giới tính */}
                    {specialSubjectCodes.includes("GDGT") && (
                      <Link
                        href="/teacher/special-subjects/eval?subject=GDGT"
                        onClick={() => setIsOpen(false)}
                        className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                          pathname.includes("/teacher/special-subjects") && subjectParam === "GDGT"
                            ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                            : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                        }`}
                      >
                        <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                          pathname.includes("/teacher/special-subjects") && subjectParam === "GDGT"
                            ? "bg-pink-500/25 border border-pink-400/50 text-pink-300 shadow-[0_0_8px_rgba(236,72,153,0.25)]"
                            : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-pink-300 group-hover:scale-110"
                        }`}>
                          <Shield className="w-4 h-4" />
                        </div>
                        {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "Sex Education" : "Đánh giá GD Giới tính"}</span>}
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* =========================================================================
                  07. CHẤT LƯỢNG & TIẾN BỘ HỌC TẬP
                  ========================================================================= */}
              <div className="border-t border-white/10 pt-2">
                <div
                  onClick={() => toggleTeacherGroup("GROUP_07")}
                  className="px-3 py-1.5 cursor-pointer select-none flex items-center justify-between text-white/60 hover:text-white/90 transition-colors group"
                >
                  {!isCollapsed ? (
                    <span className="text-[11px] font-semibold text-[#5EEAD4] tracking-tight group-hover:text-teal-200 transition-colors">
                      {SIDEBAR_TRANSLATIONS.teacherNav.group_07?.[lang] || "07. Chất lượng & Tiến bộ Học tập"}
                    </span>
                  ) : (
                    <span className="w-full text-center text-[#5EEAD4] block text-[11px] font-semibold">07</span>
                  )}
                  {!isCollapsed && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#5EEAD4]/60 group-hover:text-[#5EEAD4] transition-transform duration-300 ${
                        expandedTeacherGroups.GROUP_07 ? "rotate-180 text-[#5EEAD4]" : ""
                      }`}
                    />
                  )}
                </div>

                <div
                  className={`overflow-hidden transition-all duration-300 space-y-1 ${
                    expandedTeacherGroups.GROUP_07 || isCollapsed ? "max-h-[800px] opacity-100 visible mt-1" : "max-h-0 opacity-0 invisible"
                  }`}
                >
                  {/* Sổ điểm – Nhận xét (CT Bộ) */}
                  <Link
                    href="/teacher/so-diem-nhan-xet"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.includes("/teacher/so-diem-nhan-xet")
                        ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                        : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.includes("/teacher/so-diem-nhan-xet")
                        ? "bg-teal-500/25 border border-teal-400/50 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.25)]"
                        : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-teal-300 group-hover:scale-110"
                    }`}>
                      <ClipboardList className="w-4 h-4" />
                    </div>
                    {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "MOET Gradebook & Remarks" : "Sổ điểm – Nhận xét (CT Bộ)"}</span>}
                  </Link>

                  {/* Sổ điểm CTQT */}
                  <Link
                    href="/teacher/so-diem-ctqt"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.includes("/teacher/so-diem-ctqt")
                        ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                        : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.includes("/teacher/so-diem-ctqt")
                        ? "bg-teal-500/25 border border-teal-400/50 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.25)]"
                        : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-teal-300 group-hover:scale-110"
                    }`}>
                      <Globe className="w-4 h-4" />
                    </div>
                    {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "International Gradebook" : "Sổ điểm CTQT"}</span>}
                  </Link>

                  {/* Phân tích chất lượng */}
                  <Link
                    href="/teacher/phan-tich-chat-luong"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.includes("/teacher/phan-tich-chat-luong")
                        ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                        : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.includes("/teacher/phan-tich-chat-luong")
                        ? "bg-sky-500/25 border border-sky-400/50 text-sky-300 shadow-[0_0_8px_rgba(14,165,233,0.25)]"
                        : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-sky-300 group-hover:scale-110"
                    }`}>
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "Quality Analytics" : "Phân tích chất lượng"}</span>}
                  </Link>
                </div>
              </div>

              {/* =========================================================================
                  08. HỖ TRỢ & BỒI DƯỠNG HỌC TẬP (NHÓM ĐƠN - DẪN TRỰC TIẾP ĐẾN TRANG)
                  ========================================================================= */}
              <div className="border-t border-white/10 pt-2">
                <Link
                  href="/teacher/ho-tro-hoc-tap"
                  onClick={() => setIsOpen(false)}
                  className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                    pathname.includes("/teacher/ho-tro-hoc-tap")
                      ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                      : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                  }`}
                >
                  <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                    pathname.includes("/teacher/ho-tro-hoc-tap")
                      ? "bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                      : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-emerald-300 group-hover:scale-110"
                  }`}>
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "08. Tutoring & Support" : "08. Phụ đạo & Bồi dưỡng"}</span>}
                </Link>
              </div>

              {/* =========================================================================
                  09. HOẠT ĐỘNG TRẢI NGHIỆM (NHÓM ĐƠN - DẪN TRỰC TIẾP ĐẾN TRANG)
                  ========================================================================= */}
              <div className="border-t border-white/10 pt-2">
                <Link
                  href="/teacher/experiential-activities"
                  onClick={() => setIsOpen(false)}
                  className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                    pathname.startsWith("/teacher/experiential-activities")
                      ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                      : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                  }`}
                >
                  <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                    pathname.startsWith("/teacher/experiential-activities")
                      ? "bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                      : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-emerald-300 group-hover:scale-110"
                  }`}>
                    <Award className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "09. Experiential Activity Log" : "09. Sổ theo dõi Hoạt động trải nghiệm"}</span>}
                </Link>
              </div>

              {/* =========================================================================
                  10. DỰ GIỜ & PHÁT TRIỂN CHUYÊN MÔN
                  ========================================================================= */}
              <div className="border-t border-white/10 pt-2">
                <div
                  onClick={() => toggleTeacherGroup("GROUP_10")}
                  className="px-3 py-1.5 cursor-pointer select-none flex items-center justify-between text-white/60 hover:text-white/90 transition-colors group"
                >
                  {!isCollapsed ? (
                    <span className="text-[11px] font-semibold text-[#5EEAD4] tracking-tight group-hover:text-teal-200 transition-colors">
                      {SIDEBAR_TRANSLATIONS.teacherNav.group_10?.[lang] || "10. Dự giờ & Phát triển Chuyên môn"}
                    </span>
                  ) : (
                    <span className="w-full text-center text-[#5EEAD4] block text-[11px] font-semibold">10</span>
                  )}
                  {!isCollapsed && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#5EEAD4]/60 group-hover:text-[#5EEAD4] transition-transform duration-300 ${
                        expandedTeacherGroups.GROUP_10 ? "rotate-180 text-[#5EEAD4]" : ""
                      }`}
                    />
                  )}
                </div>

                <div
                  className={`overflow-hidden transition-all duration-300 space-y-1 ${
                    expandedTeacherGroups.GROUP_10 || isCollapsed ? "max-h-[800px] opacity-100 visible mt-1" : "max-h-0 opacity-0 invisible"
                  }`}
                >
                  {/* Khối Phổ thông */}
                  <Link
                    href="/teacher/du-gio"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname === "/teacher/du-gio" ||
                      (pathname.startsWith("/teacher/du-gio") &&
                        !pathname.startsWith("/teacher/du-gio-mam-non") &&
                        !pathname.startsWith("/teacher/du-gio-gvnn"))
                        ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                        : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname === "/teacher/du-gio" &&
                      !pathname.startsWith("/teacher/du-gio-mam-non") &&
                      !pathname.startsWith("/teacher/du-gio-gvnn")
                        ? "bg-teal-500/25 border border-teal-400/50 text-teal-200 shadow-[0_0_8px_rgba(45,212,191,0.25)]"
                        : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-teal-200 group-hover:scale-110"
                    }`}>
                      <ClipboardCheck className="w-4 h-4" />
                    </div>
                    {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "K-12 Observation" : "Khối Phổ thông"}</span>}
                  </Link>

                  {/* Khối Mầm non */}
                  <Link
                    href="/teacher/du-gio-mam-non"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.startsWith("/teacher/du-gio-mam-non")
                        ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                        : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.startsWith("/teacher/du-gio-mam-non")
                        ? "bg-amber-500/25 border border-amber-400/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                        : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-amber-300 group-hover:scale-110"
                    }`}>
                      <Baby className="w-4 h-4" />
                    </div>
                    {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "Preschool Observation" : "Khối Mầm non"}</span>}
                  </Link>

                  {/* Tiếng Anh – Chương trình Song ngữ (ĐỔI TỪ: "Giáo viên nước ngoài") */}
                  <Link
                    href="/teacher/du-gio-gvnn"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.startsWith("/teacher/du-gio-gvnn")
                        ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                        : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.startsWith("/teacher/du-gio-gvnn")
                        ? "bg-sky-500/25 border border-sky-400/50 text-sky-300 shadow-[0_0_8px_rgba(14,165,233,0.25)]"
                        : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-sky-300 group-hover:scale-110"
                    }`}>
                      <Globe className="w-4 h-4" />
                    </div>
                    {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "English – Bilingual Program" : "Tiếng Anh – Chương trình Song ngữ"}</span>}
                  </Link>

                  {/* Hành trình Sky-Line */}
                  <Link
                    href="/teacher/special-subjects/skyline-journey"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.startsWith("/teacher/special-subjects/skyline-journey")
                        ? "bg-gradient-to-r from-amber-500/25 via-teal-500/15 to-transparent border border-amber-400/50 text-white shadow-md shadow-black/10"
                        : "text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.startsWith("/teacher/special-subjects/skyline-journey")
                        ? "bg-amber-500/25 border border-amber-400/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                        : "bg-white/5 border border-white/10 text-amber-300/80 group-hover:text-amber-300 group-hover:scale-110"
                    }`}>
                      <Compass className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="break-words leading-tight py-0.5">{lang === "en" ? "Sky-Line Journey" : "Hành trình Sky-Line"}</span>
                        <span className="text-[9px] bg-amber-500/25 text-amber-200 px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0">
                          1–5
                        </span>
                      </div>
                    )}
                  </Link>
                </div>
              </div>

              {/* =========================================================================
                  11. PHỐI HỢP GIA ĐÌNH – NHÀ TRƯỜNG
                  ========================================================================= */}
              <div className="border-t border-white/10 pt-2">
                <div
                  onClick={() => toggleTeacherGroup("GROUP_11")}
                  className="px-3 py-1.5 cursor-pointer select-none flex items-center justify-between text-white/60 hover:text-white/90 transition-colors group"
                >
                  {!isCollapsed ? (
                    <span className="text-[11px] font-semibold text-[#5EEAD4] tracking-tight group-hover:text-teal-200 transition-colors">
                      {SIDEBAR_TRANSLATIONS.teacherNav.group_11?.[lang] || "11. Phối hợp Gia đình – Nhà trường"}
                    </span>
                  ) : (
                    <span className="w-full text-center text-[#5EEAD4] block text-[11px] font-semibold">11</span>
                  )}
                  {!isCollapsed && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#5EEAD4]/60 group-hover:text-[#5EEAD4] transition-transform duration-300 ${
                        expandedTeacherGroups.GROUP_11 ? "rotate-180 text-[#5EEAD4]" : ""
                      }`}
                    />
                  )}
                </div>

                <div
                  className={`overflow-hidden transition-all duration-300 space-y-1 ${
                    expandedTeacherGroups.GROUP_11 || isCollapsed ? "max-h-[800px] opacity-100 visible mt-1" : "max-h-0 opacity-0 invisible"
                  }`}
                >
                  {/* Phối hợp Giáo dục (Chỉ GVCN) */}
                  {isGVCN && (
                    <Link
                      href="/teacher/phoi-hop-giao-duc"
                      onClick={() => setIsOpen(false)}
                      className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                        pathname.startsWith("/teacher/phoi-hop-giao-duc")
                          ? "bg-gradient-to-r from-teal-500/35 to-emerald-500/20 border border-teal-400/50 text-white shadow-md shadow-black/10"
                          : "text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-1"
                      }`}
                    >
                      <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                        pathname.startsWith("/teacher/phoi-hop-giao-duc")
                          ? "bg-teal-500/30 border border-teal-400/60 text-teal-200 shadow-[0_0_8px_rgba(45,212,191,0.4)]"
                          : "bg-white/5 border border-white/10 text-slate-300 group-hover:text-teal-200 group-hover:scale-110"
                      }`}>
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      {!isCollapsed && (
                        <div className="flex items-center justify-between flex-1 min-w-0">
                          <span className="break-words leading-tight py-0.5">{lang === "en" ? "Educational Coordination" : "Phối hợp Giáo dục"}</span>
                          <span className="text-[9px] bg-teal-500/30 text-teal-200 px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0">
                            GVCN
                          </span>
                        </div>
                      )}
                    </Link>
                  )}

                  {/* Họp Phụ huynh số */}
                  <Link
                    href="/teacher/hop-phu-huynh"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.startsWith("/teacher/hop-phu-huynh")
                        ? "bg-gradient-to-r from-teal-500/35 to-emerald-500/20 border border-teal-400/50 text-white shadow-md shadow-black/10"
                        : "text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.startsWith("/teacher/hop-phu-huynh")
                        ? "bg-teal-500/30 border border-teal-400/60 text-teal-200 shadow-[0_0_8px_rgba(20,184,166,0.4)]"
                        : "bg-white/5 border border-white/10 text-slate-300 group-hover:text-teal-200 group-hover:scale-110"
                    }`}>
                      <QrCode className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="break-words leading-tight py-0.5">{lang === "en" ? "Digital Parent Meeting" : "Họp Phụ huynh số"}</span>
                        <span className="text-[9px] bg-teal-500/30 text-teal-200 px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0">
                          {isGVCN ? "GVCN" : "GVBM"}
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* NPS & Phản hồi PHHS */}
                  <Link
                    href="/teacher/surveys"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.includes("/teacher/surveys") ||
                      pathname.includes("/teacher/nps") ||
                      pathname.includes("/teacher/feedback")
                        ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                        : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.includes("/teacher/surveys") ||
                      pathname.includes("/teacher/nps") ||
                      pathname.includes("/teacher/feedback")
                        ? "bg-sky-500/25 border border-sky-400/50 text-sky-300 shadow-[0_0_8px_rgba(14,165,233,0.25)]"
                        : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-sky-300 group-hover:scale-110"
                    }`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    {!isCollapsed && <span className="break-words leading-tight py-0.5">{lang === "en" ? "NPS & Parent Feedback" : "NPS & Phản hồi PHHS"}</span>}
                  </Link>

                  {/* In bảng tên họp PHHS */}
                  <Link
                    href="/teacher/bang-ten-phhs"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.startsWith("/teacher/bang-ten-phhs")
                        ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                        : "text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.startsWith("/teacher/bang-ten-phhs")
                        ? "bg-teal-500/25 border border-teal-400/50 text-teal-200 shadow-[0_0_8px_rgba(45,212,191,0.3)]"
                        : "bg-white/5 border border-white/10 text-slate-400 group-hover:text-teal-200 group-hover:scale-110"
                    }`}>
                      <QrCode className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="break-words leading-tight py-0.5">{lang === "en" ? "Parent Meeting Nameplates" : "In bảng tên họp PHHS"}</span>
                        <span className="text-[9px] bg-teal-500/30 text-teal-200 px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0">
                          A4
                        </span>
                      </div>
                    )}
                  </Link>
                </div>
              </div>

              {/* =========================================================================
                  12. TIỆN ÍCH & CHỮ KÝ SỐ
                  ========================================================================= */}
              <div className="border-t border-white/10 pt-2">
                <div
                  onClick={() => toggleTeacherGroup("GROUP_12")}
                  className="px-3 py-1.5 cursor-pointer select-none flex items-center justify-between text-white/60 hover:text-white/90 transition-colors group"
                >
                  {!isCollapsed ? (
                    <span className="text-[11px] font-semibold text-[#5EEAD4] tracking-tight group-hover:text-teal-200 transition-colors">
                      {SIDEBAR_TRANSLATIONS.teacherNav.group_12?.[lang] || "12. Tiện ích & Chữ ký số"}
                    </span>
                  ) : (
                    <span className="w-full text-center text-[#5EEAD4] block text-[11px] font-semibold">12</span>
                  )}
                  {!isCollapsed && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#5EEAD4]/60 group-hover:text-[#5EEAD4] transition-transform duration-300 ${
                        expandedTeacherGroups.GROUP_12 ? "rotate-180 text-[#5EEAD4]" : ""
                      }`}
                    />
                  )}
                </div>

                <div
                  className={`overflow-hidden transition-all duration-300 space-y-1 ${
                    expandedTeacherGroups.GROUP_12 || isCollapsed ? "max-h-[800px] opacity-100 visible mt-1" : "max-h-0 opacity-0 invisible"
                  }`}
                >
                  {/* Chữ ký số & Hồ sơ chờ ký (Mục gộp mới với 2 tab, có badge số lượng hồ sơ chờ ký) */}
                  <Link
                    href="/teacher/chu-ky-so"
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2 rounded-xl transition-all duration-300 text-xs font-medium ${
                      pathname.startsWith("/teacher/chu-ky-so") ||
                      pathname.startsWith("/teacher/ho-so-cho-ky") ||
                      pathname.startsWith("/teacher/profile/chu-ky-so")
                        ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/20 border border-teal-500/40 text-white shadow-md shadow-black/10"
                        : "text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-1"
                    }`}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${isCollapsed ? "mx-auto" : "mr-2.5"} ${
                      pathname.startsWith("/teacher/chu-ky-so") ||
                      pathname.startsWith("/teacher/ho-so-cho-ky") ||
                      pathname.startsWith("/teacher/profile/chu-ky-so")
                        ? "bg-teal-500/30 border border-teal-400/50 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.35)]"
                        : "bg-white/10 border border-white/15 text-slate-300 group-hover:text-teal-300 group-hover:scale-110"
                    }`}>
                      <PenTool className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="break-words leading-tight py-0.5">{lang === "en" ? "Digital Signature & Pending" : "Chữ ký số & Hồ sơ chờ ký"}</span>
                        {pendingSignatureCount > 0 ? (
                          <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold ml-1 shrink-0 tabular-nums shadow-xs">
                            {pendingSignatureCount}
                          </span>
                        ) : (
                          <span className="text-[9px] bg-teal-500/30 text-teal-200 px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0">
                            CA
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                </div>
              </div>
            </div>
          )}
                    {role === "PARENT" && (
            <div className="space-y-1">
              <Link 
                href="/parent" 
                onClick={() => setIsOpen(false)} 
                className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl transition-all text-xs font-medium ${
                  pathname === '/parent' ? "bg-white/20 text-white border border-[#135E5B]/30" : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 mr-2.5 text-teal-300 shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{SIDEBAR_TRANSLATIONS.parentNav.overview[lang]}</span>}
              </Link>

              <Link 
                href="/parent/thoi-khoa-bieu" 
                onClick={() => setIsOpen(false)} 
                className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl transition-all text-xs font-medium ${
                  pathname.startsWith('/parent/thoi-khoa-bieu') ? "bg-teal-500/35 text-white border border-teal-400/60" : "text-white/85 hover:text-white hover:bg-white/10"
                }`}
              >
                <Calendar className="w-4 h-4 mr-2.5 text-teal-300 shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{SIDEBAR_TRANSLATIONS.parentNav.timetable?.[lang] || (lang === "en" ? "Timetable" : "Thời khóa biểu")}</span>}
              </Link>

              <Link 
                href="/parent/hanh-trinh-skyline" 
                onClick={() => setIsOpen(false)} 
                className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl transition-all text-xs font-medium ${
                  pathname.startsWith('/parent/hanh-trinh-skyline') ? "bg-amber-500/30 text-white border border-amber-400/60" : "text-white/85 hover:text-white hover:bg-white/10"
                }`}
              >
                <Compass className="w-4 h-4 mr-2.5 text-amber-300 shrink-0" />
                {!isCollapsed && (
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                    {lang === "en" ? "Sky-Line Learning Journey" : "Hành trình Sky-Line của con"}
                  </span>
                )}
              </Link>

              <Link 
                href="/parent/thong-bao" 
                onClick={() => setIsOpen(false)} 
                className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl transition-all text-xs font-medium ${
                  pathname.startsWith('/parent/thong-bao') ? "bg-teal-500/35 text-white border border-teal-400/60" : "text-white/85 hover:text-white hover:bg-white/10"
                }`}
              >
                <Bell className="w-4 h-4 mr-2.5 text-teal-300 shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{SIDEBAR_TRANSLATIONS.parentNav.notifications?.[lang] || (lang === "en" ? "Notifications & Inbox" : "Thông báo & Liên lạc")}</span>}
              </Link>

              <Link 
                href="/parent/surveys" 
                onClick={() => setIsOpen(false)} 
                className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl transition-all text-xs font-medium ${
                  pathname.startsWith('/parent/surveys') ? "bg-white/20 text-white border border-[#135E5B]/30" : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <ClipboardList className="w-4 h-4 mr-2.5 text-amber-400 shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{SIDEBAR_TRANSLATIONS.parentNav.surveys[lang]}</span>}
              </Link>

              <Link 
                href="/parent/grades" 
                onClick={() => setIsOpen(false)} 
                className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl transition-all text-xs font-medium ${
                  pathname.startsWith('/parent/grades') ? "bg-white/20 text-white border border-[#135E5B]/30" : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Award className="w-4 h-4 mr-2.5 text-amber-300 shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{SIDEBAR_TRANSLATIONS.parentNav.grades[lang]}</span>}
              </Link>

              <Link 
                href="/parent/children/profile" 
                onClick={() => setIsOpen(false)} 
                className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl transition-all text-xs font-medium ${
                  pathname.startsWith('/parent/children/profile') ? "bg-white/20 text-white border border-[#135E5B]/30" : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <GraduationCap className="w-4 h-4 mr-2.5 text-sky-300 shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{SIDEBAR_TRANSLATIONS.parentNav.profile[lang]}</span>}
              </Link>

              <Link 
                href="/parent/children/advisory" 
                onClick={() => setIsOpen(false)} 
                className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl transition-all text-xs font-medium ${
                  pathname.startsWith('/parent/children/advisory') ? "bg-white/20 text-white border border-[#135E5B]/30" : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Compass className="w-4 h-4 mr-2.5 text-emerald-300 shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{SIDEBAR_TRANSLATIONS.parentNav.advisory[lang]}</span>}
              </Link>

              <Link 
                href="/parent/trao-doi-dong-hanh" 
                onClick={() => setIsOpen(false)} 
                className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl transition-all text-xs font-medium ${
                  pathname.startsWith('/parent/trao-doi-dong-hanh') ? "bg-teal-500/30 text-white border border-teal-400/50" : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <MessageSquare className="w-4 h-4 mr-2.5 text-teal-300 shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{lang === "en" ? "Exchange & Companion" : "Trao đổi & Đồng hành"}</span>}
              </Link>

              <Link 
                href="/parent/hop-phu-huynh" 
                onClick={() => setIsOpen(false)} 
                className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl transition-all text-xs font-medium ${
                  pathname.startsWith('/parent/hop-phu-huynh') ? "bg-teal-500/30 text-white border border-teal-400/50" : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <QrCode className="w-4 h-4 mr-2.5 text-teal-300 shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{SIDEBAR_TRANSLATIONS.parentNav.meetings?.[lang] || (lang === "en" ? "Parent Meetings" : "Họp Phụ huynh")}</span>}
              </Link>
            </div>
          )}
        </nav>
        
        <div className="mt-auto pt-3 flex flex-col gap-2">
          {/* Language Switcher */}
          <div className={`flex items-center ${isCollapsed ? 'justify-center p-1.5' : 'justify-between px-3 py-1.5'} bg-white/5 border border-white/10 rounded-xl transition-all`}>
            {!isCollapsed && (
              <span className="text-[11px] text-white/70 font-medium flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-teal-400" />
                <span>{SIDEBAR_TRANSLATIONS.common.language[lang]}</span>
              </span>
            )}
            <div className={`flex items-center gap-1 ${isCollapsed ? 'flex-col' : ''}`}>
              <button
                type="button"
                onClick={() => handleLanguageChange("vi")}
                className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  lang === "vi"
                    ? "bg-[#48BFE3] text-slate-900 shadow-xs"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
                title="Tiếng Việt"
              >
                <span className="inline-flex shrink-0 overflow-hidden rounded-[2px] border border-black/10">
                  <VietnamFlag className="w-[14px] h-[9px]" />
                </span>
                <span>VI</span>
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange("en")}
                className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  lang === "en"
                    ? "bg-[#48BFE3] text-slate-900 shadow-xs"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
                title="English"
              >
                <span className="inline-flex shrink-0 overflow-hidden rounded-[2px] border border-black/10">
                  <UKFlag className="w-[14px] h-[9px]" />
                </span>
                <span>EN</span>
              </button>
            </div>
          </div>

          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`hidden md:flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 text-sm font-medium group w-full`}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" /> : (
              <>
                <ChevronLeft className="w-4 h-4 mr-3 text-white/60 group-hover:text-white transition-colors" />
                <span className="whitespace-nowrap">{SIDEBAR_TRANSLATIONS.common.collapse[lang]}</span>
              </>
            )}
          </button>
          <div className="border-t border-white/20 pt-2" />
          <button 
            onClick={async () => {
              try {
                await signOut({ redirect: false })
              } catch (e) {
                console.error(e)
              } finally {
                window.location.href = "/login"
              }
            }}
            className={`flex items-center w-full ${isCollapsed ? 'justify-center' : 'px-4'} py-2.5 text-white/70 hover:text-white hover:bg-red-500/10 rounded-xl transition-all duration-200 text-sm font-medium group`}
          >
            <LogOut className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} text-white/50 group-hover:text-red-400 transition-colors`} />
            {!isCollapsed && <span>{SIDEBAR_TRANSLATIONS.common.signout[lang]}</span>}
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
