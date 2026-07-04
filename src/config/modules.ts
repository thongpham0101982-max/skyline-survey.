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
  Baby,
  RefreshCcw,
  UserCheck,
  CheckCircle2,
  MessageSquare,
  Award
} from "lucide-react"

export const APP_CATEGORIES = [
  {
    id: "SYSTEM",
    name: "Hệ thống",
    color: "violet",
    icon: Settings,
    modules: [
      { code: "AUDIT_LOGS", name: "Nhật ký Hệ thống", icon: ClipboardList, href: "/admin/logs" },
      { code: "ROLES", name: "Quản lý Nhóm quyền", icon: Shield, href: "/admin/roles", requiresAdmin: true },
      { code: "USERS", name: "Tài khoản Nhân sự", icon: Users, href: "/admin/users", requiresAdmin: true },
      { code: "CAMPUSES", name: "Quản lý Cơ sở", icon: Building2, href: "/admin/campuses", requiresAdmin: true },
      { code: "PARENTS", name: "Tài khoản PHHS", icon: UserPlus, href: "/admin/parents" },
      { code: "CHATBOT_CONFIGS", name: "Cấu hình Chatbot", icon: MessageSquare, href: "/admin/chatbot-configs", requiresAdmin: true },
    ]
  },
  {
    id: "KTDBCL",
    name: "Khảo thí & ĐBCL",
    color: "sky",
    icon: Shield,
    modules: [
      {
        code: "KTDBCL_EXAMS",
        name: "QL Thành tích",
        icon: Award,
        href: "/admin/ktdbcl/categories",
        subModules: [
          { code: "KTDBCL_EXAM_CATEGORIES", name: "Quản lý danh mục", href: "/admin/ktdbcl/categories" },
          { code: "KTDBCL_EXAM_ROUNDS", name: "Vòng thi", href: "/admin/ktdbcl/rounds" },
          { code: "KTDBCL_EXAM_ACHIEVEMENTS", name: "Thành tích", href: "/admin/ktdbcl/achievements" },
          { code: "KTDBCL_EXAM_LIST", name: "Danh sách Kỳ thi", href: "/admin/ktdbcl/exams" },
          { code: "KTDBCL_EXAM_STUDENTS", name: "Đăng ký Dự thi", href: "/admin/ktdbcl/students" },
          { code: "KTDBCL_EXAM_RESULTS", name: "Nhập điểm & Kết quả", href: "/admin/ktdbcl/results" },
        ]
      }
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
      { code: "EXPERIENTIAL_ACTIVITIES", name: "Hoạt động trải nghiệm", icon: Award, href: "/admin/experiential-activities/catalog", subModules: [ { code: "EXP_ACT_CONFIG", name: "Cấu hình", href: "/admin/experiential-activities/config" }, { code: "EXP_ACT_CATEGORIES", name: "Danh mục", href: "/admin/experiential-activities/categories" }, { code: "EXP_ACT_CATALOG", name: "Hoạt động mẫu", href: "/admin/experiential-activities/catalog" } ] },
    ]
  },
  {
    id: "ASSESSMENT",
    name: "Khảo sát đầu vào",
    color: "emerald",
    icon: ClipboardList,
    modules: [
      {
        code: "CAU_HINH_KHAO_SAT",
        name: "Cấu hình Khảo sát",
        icon: Settings,
        href: "/admin/cau-hinh-khao-sat",
        subModules: [
          { code: "PRESCHOOL_INPUT_ASSESSMENTS", name: "KSNL Đầu vào Mầm non" },
          { code: "INPUT_ASSESSMENTS", name: "Phổ thông K-12" },
          { code: "INPUT_ASSESSMENTS_PERIODS", name: "Kỳ KS" },
          { code: "INPUT_ASSESSMENTS_CATEGORIES", name: "Danh mục" },
          { code: "INPUT_ASSESSMENTS_SUBJECTS", name: "Môn KS" },
          { code: "INPUT_ASSESSMENTS_MAPPING", name: "Cấu hình" },
          { code: "INPUT_ASSESSMENTS_STUDENTS", name: "Học sinh" },
          { code: "INPUT_ASSESSMENTS_ASSIGNMENTS", name: "Phân công" },
          { code: "INPUT_ASSESSMENTS_REPORTS", name: "Tổng hợp KQKS" },
        ]
      },
      { code: "INPUT_ASSESSMENT_REPORTS", name: "Xuất báo cáo", icon: FileSpreadsheet, href: "/admin/input-assessments/reports" },
      { code: "STUDENT_INFO", name: "Nhập TT HS, KQKS", icon: Users2, href: "/admin/student-info" },
      {
        code: "PHAN_CONG_KHAO_SAT",
        name: "Phân công khảo sát",
        icon: UserCheck,
        href: "/admin/phan-cong-khao-sat",
        subModules: [
          { code: "PHAN_CONG_K12", name: "Phân công K-12" },
          { code: "PHAN_CONG_MAM_NON", name: "Phân công Mầm non" }
        ]
      },
      {
        code: "XET_DUYET_KET_QUA",
        name: "Xét duyệt Kết quả",
        icon: CheckCircle2,
        href: "/admin/xet-duyet-ket-qua",
        subModules: [
          { code: "INPUT_ASSESSMENTS_REPORTS", name: "Xét duyệt K-12" },
          { code: "XET_DUYET_MAM_NON", name: "Xét duyệt Mầm non" }
        ]
      }
    ]
  },
  {
    id: "SURVEY",
    name: "Khảo sát",
    color: "amber",
    icon: FileSpreadsheet,
    modules: [
      { 
        code: "MANAGE_SURVEYS", 
        name: "Quản lý Khảo sát", 
        icon: FileSpreadsheet, 
        href: "/admin/surveys",
        subModules: [
          { code: "SURVEY_LIST", name: "Quản lý Khảo sát", href: "/admin/surveys" },
          { code: "SURVEY_CATALOG", name: "Danh mục Khảo sát", href: "/admin/categories" },
          { code: "SURVEY_RESULTS", name: "Kết quả KS", href: "/admin/surveys/results" },
          { code: "NPS_ANALYSIS", name: "Phân tích NPS", href: "/admin/nps" },
          { code: "FEEDBACK", name: "Theo dõi Phản hồi", href: "/admin/reports" }
        ]
      }
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

export const ALL_APP_MODULES = APP_CATEGORIES.flatMap(c => {
  return c.modules.flatMap((m: any) => {
    if (m.subModules) {
      return [m, ...m.subModules];
    }
    return [m];
  });
}).filter((m: any) => !!m.code);
