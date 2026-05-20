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
  Briefcase,
  ArrowRightLeft,
  Baby
} from "lucide-react"

export const APP_CATEGORIES = [
  {
    id: "SYSTEM",
    name: "Hệ thống",
    color: "violet",
    icon: Settings,
    modules: [
      { code: "ROLES", name: "Quản lý Nhóm quyền", icon: Shield, href: "/admin/roles", requiresAdmin: true },
      { code: "USERS", name: "Tài khoản Nhân sự", icon: Users, href: "/admin/users", requiresAdmin: true },
      { code: "CAMPUSES", name: "Quản lý Cơ sở", icon: Building2, href: "/admin/campuses", requiresAdmin: true },
    ]
  },
  {
    id: "TRAINING",
    name: "Quản lý Đào tạo",
    color: "blue",
    icon: GraduationCap,
    modules: [
      { code: "TEACHERS", name: "Quản lý Giáo viên", icon: GraduationCap, href: "/admin/teachers" },
      { code: "DEPARTMENTS", name: "Tổ chuyên môn", icon: Users2, href: "/admin/departments" },
      { code: "SUBJECTS", name: "Quản lý môn học", icon: BookOpen, href: "/admin/subjects" },
      { code: "ACADEMIC_YEARS", name: "Năm học & Học kỳ", icon: Calendar, href: "/admin/academic-years" },
      { code: "MANAGE_CLASSES", name: "Quản lý Lớp học", icon: Layers, href: "/admin/classes" },
      { code: "ASSIGNMENTS", name: "Phân công giảng dạy", icon: Layout, href: "/admin/teaching-assignments" },
      { code: "STUDENT_TRANSFERS", name: "Quản lý HS lưu chuyển", icon: ArrowRightLeft, href: "/admin/student-transfers" },
    ]
  },
  {
    id: "ASSESSMENT",
    name: "Khảo thí",
    color: "emerald",
    icon: ClipboardList,
    modules: [
      { code: "PRESCHOOL_INPUT_ASSESSMENTS", name: "KSNL Đầu vào Mầm non", icon: Baby, href: "/admin/preschool-input-assessments" },
      { code: "INPUT_ASSESSMENTS", name: "Quản lý KSNL Đầu vào", icon: ClipboardList, href: "/admin/input-assessments" },
      { code: "STUDENT_ACHIEVEMENTS", name: "Thành tích Học sinh", icon: GraduationCap, href: "/admin/achievements" },
    ]
  },
  {
    id: "SURVEY",
    name: "Khảo sát",
    color: "amber",
    icon: FileSpreadsheet,
    modules: [
      { code: "MANAGE_SURVEYS", name: "Quản lý Khảo sát", icon: FileSpreadsheet, href: "/admin/surveys" },
      { code: "NPS_ANALYSIS", name: "Phân tích NPS", icon: PieChart, href: "/admin/nps" },
      { code: "SURVEY_CATALOG", name: "Danh mục Khảo sát", icon: Layers, href: "/admin/categories" },
      { code: "PARENTS", name: "Tài khoản PHHS", icon: UserPlus, href: "/admin/parents" },
      { code: "FEEDBACK", name: "Theo dõi Phản hồi", icon: PieChart, href: "/admin/reports" },
    ]
  },
  {
    id: "OTHER",
    name: "Công việc khác",
    color: "slate",
    icon: Briefcase,
    modules: [
      { code: "TASKS", name: "Điều hành Công việc", icon: ClipboardList, href: "/admin/tasks" },
      { code: "WEEKLY_REPORTS", name: "Báo cáo Tuần", icon: FileSpreadsheet, href: "/admin/weekly-reports" },
    ]
  }
];

export const ALL_APP_MODULES = APP_CATEGORIES.flatMap(c => c.modules).filter((m: any) => !!m.code);
