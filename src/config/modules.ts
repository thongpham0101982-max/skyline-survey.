import { 
  Shield, 
  Users, 
  Building2, 
  GraduationCap, 
  Users2, 
  BookOpen, 
  Calendar, 
  Layers, 
  Layout, 
  ClipboardList, 
  FileSpreadsheet, 
  UserPlus, 
  PieChart,
  Settings,
  Briefcase
} from "lucide-react"

export const APP_CATEGORIES = [
  {
    id: "SYSTEM",
    name: "H? th?ng",
    color: "violet",
    icon: Settings,
    modules: [
      { code: "ROLES", name: "Qu?n l? Nhóm quy?n", icon: Shield, href: "/admin/roles", requiresAdmin: true },
      { code: "USERS", name: "Tài kho?n Nhân s?", icon: Users, href: "/admin/users", requiresAdmin: true },
    ]
  },
  {
    id: "TRAINING",
    name: "Qu?n l? Ðào t?o",
    color: "blue",
    icon: GraduationCap,
    modules: [
      { code: "FACILITIES", name: "Qu?n l? Cõ s?", icon: Building2, href: "/admin/campuses", requiresAdmin: true },
      { code: "TEACHERS", name: "Qu?n l? Giáo viên", icon: GraduationCap, href: "/admin/teachers" },
      { code: "DEPARTMENTS", name: "T? chuyên môn", icon: Users2, href: "/admin/departments" },
      { code: "SUBJECTS", name: "Qu?n l? môn h?c", icon: BookOpen, href: "/admin/subjects" },
      { code: "ACADEMIC_YEARS", name: "Nãm h?c & H?c k?", icon: Calendar, href: "/admin/academic-years" },
      { code: "MANAGE_CLASSES", name: "Qu?n l? L?p h?c", icon: Layers, href: "/admin/classes" },
      { code: "ASSIGNMENTS", name: "Phân công gi?ng d?y", icon: Layout, href: "/admin/teaching-assignments" },
    ]
  },
  {
    id: "ASSESSMENT",
    name: "Kh?o thí",
    color: "emerald",
    icon: ClipboardList,
    modules: [
      { code: "INPUT_ASSESSMENTS", name: "Qu?n l? KSNL Ð?u vào", icon: ClipboardList, href: "/admin/input-assessments" },
      { code: "STUDENT_ACHIEVEMENTS", name: "Thành tích H?c sinh", icon: GraduationCap, href: "/admin/achievements" },
    ]
  },
  {
    id: "SURVEY",
    name: "Kh?o sát",
    color: "amber",
    icon: FileSpreadsheet,
    modules: [
      { code: "MANAGE_SURVEYS", name: "Qu?n l? Kh?o sát", icon: FileSpreadsheet, href: "/admin/surveys" },
      { code: "SURVEY_CATALOG", name: "Danh m?c Kh?o sát", icon: Layers, href: "/admin/categories" },
      { code: "PARENTS", name: "Tài kho?n PHHS", icon: UserPlus, href: "/admin/parents" },
      { code: "FEEDBACK", name: "Theo d?i Ph?n h?i", icon: PieChart, href: "/admin/reports" },
    ]
  },
  {
    id: "OTHER",
    name: "Công vi?c khác",
    color: "slate",
    icon: Briefcase,
    modules: [
      { code: "TASKS", name: "Ði?u hành Công vi?c", icon: ClipboardList, href: "/admin/tasks" },
      { code: "WEEKLY_REPORTS", name: "Báo cáo Tu?n", icon: FileSpreadsheet, href: "/admin/weekly-reports" },
    ]
  }
];

export const ALL_APP_MODULES = APP_CATEGORIES.flatMap(c => c.modules);
 
