"use client"
import Link from 'next/link'
import { signOut } from "next-auth/react"
import { LogOut, ClipboardList, ListChecks, LayoutDashboard, Layout, Users, UserCog, Calendar, GraduationCap, BookOpen, UserPlus, FileSpreadsheet, PieChart, Layers } from "lucide-react"

interface SidebarProps {
  role: 'ADMIN' | 'TEACHER' | 'PARENT'
  permissionModules?: string[]
  actualRole?: string
  taskCount?: number
}

export function Sidebar({ role, permissionModules, actualRole, taskCount = 0 }: SidebarProps) {
  let title = "Portal"
  let links: { href: string; label: string; icon: any; module?: string, requiresAdmin?: boolean, isHeader?: boolean }[]

  if (role === "ADMIN") {
    title = "Cổng Quản trị"
    links = [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/tasks", label: "Điều hành CV", icon: ClipboardList, module: "TASKS" },
      { href: "/admin/weekly-reports", label: "Báo cáo Tuần", icon: FileSpreadsheet, module: "WEEKLY_REPORTS" },
      { href: "/admin/academic-years", label: "Năm học", icon: Calendar, module: "ACADEMIC_YEARS" },
      { href: "/admin/classes", label: "Quản lý Lớp học", icon: Layers, module: "MANAGE_CLASSES" },
      
      { href: "#", label: "Hệ thống", icon: null, isHeader: true, requiresAdmin: true },
      { href: "/admin/roles", label: "Quản lý Nhóm quyền", icon: UserCog, requiresAdmin: true },
      { href: "/admin/users", label: "Tài khoản Nhân sự", icon: Users, requiresAdmin: true },
      
      { href: "#", label: "Quản lý Đào tạo", icon: null, isHeader: true },
      { href: "/admin/teachers", label: "Quản lý Giáo viên", icon: GraduationCap, module: "TEACHERS" },
      { href: "/admin/departments", label: "Tổ chuyên môn", icon: Users, module: "SUBJECTS" },
      { href: "/admin/subjects", label: "Quản lý môn học", icon: BookOpen, module: "SUBJECTS" },
      { href: "/admin/teaching-assignments", label: "Phân công giảng dạy", icon: Layout, module: "ASSIGNMENTS" },
      
      { href: "#", label: "Khảo thí", icon: null, isHeader: true },
      { href: "/admin/input-assessments", label: "Quản lý KSNL Đầu vào", icon: ClipboardList, module: "INPUT_ASSESSMENTS" },
      { href: "/admin/achievements", label: "Thành tích Học sinh", icon: GraduationCap, module: "STUDENT_ACHIEVEMENTS" },
      
      { href: "#", label: "Khảo sát", icon: null, isHeader: true },
      { href: "/admin/surveys", label: "Quản lý Khảo sát", icon: FileSpreadsheet, module: "SURVEY_CATALOG" },
      { href: "/admin/categories", label: "Danh mục Khảo sát", icon: Layers, module: "SURVEY_CATALOG" },
      { href: "/admin/parents", label: "Tài khoản PHHS", icon: UserPlus, module: "TEACHERS" },
      { href: "/admin/reports", label: "Theo dõi Phản hồi", icon: PieChart, module: "SURVEY_CATALOG" }
    ]
  } else if (role === "TEACHER") {
    title = "Cổng Giáo viên"
    links = [
      { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
      { href: "/teacher/classes", label: "Lớp học", icon: Layers },
      { href: "#", label: "Khảo sát đầu vào", icon: null, isHeader: true },
      { href: "/teacher/input-assessments", label: "Nhập điểm KS theo phân công", icon: ClipboardList }
    ]
  } else if (role === "PARENT") {
    title = "Parent Portal"
    links = [
      { href: "/parent", label: "Dashboard", icon: LayoutDashboard },
      { href: "/parent/surveys", label: "My Surveys", icon: FileSpreadsheet }
    ]
  } else {
    links = []
  }

  const isSuperAdmin = actualRole === "ADMIN" || !permissionModules;
  
  const filteredLinks = links.filter(l => {
    if (l.requiresAdmin && !isSuperAdmin) return false;
    if (!isSuperAdmin && l.module && l.module !== "ANY") {
      if (!permissionModules?.includes(l.module)) return false;
    }
    return true;
  });

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen p-6 flex flex-col shadow-xl">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/20">S</div>
        <div className="font-bold text-xl tracking-tight">{title}</div>
      </div>

      <nav className="flex flex-col space-y-1 flex-grow overflow-y-auto pr-2 custom-scrollbar">
        {filteredLinks.map((l, idx) => (
          l.isHeader ? (
            <div key={`header-${idx}`} className="pt-6 pb-2 px-3 cursor-default select-none">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">{l.label}</span>
            </div>
          ) : (
            <Link 
              key={`${l.href}-${idx}`} 
              href={l.href}
              className="group flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-800 transition-all duration-200 text-slate-300 hover:text-white"
            >
              <div className="flex items-center gap-3">
                {l.icon && <l.icon className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />}
                <span className="text-sm font-medium">{l.label}</span>
              </div>
              {l.href === "/admin/tasks" && taskCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-black bg-red-500 text-white rounded-full min-w-[20px] text-center shadow-lg shadow-red-500/40 animate-pulse">
                  {taskCount}
                </span>
              )}
            </Link>
          )
        ))}
      </nav>
      
      <div className="mt-auto border-t border-slate-800 pt-6">
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

