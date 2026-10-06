import {
  Activity, 
  ClipboardCheck,
  Eye,
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
  Award,
  Globe,
  FileText,
  Compass,
  Sparkles,
  Grid3X3,
  Database,
  BarChart3,
  Search,
  Trophy,
  TrendingUp
} from "lucide-react"

export const APP_CATEGORIES = [
  {
    id: "SYSTEM",
    name: "Hệ thống",
    color: "violet",
    icon: Settings,
    modules: [
      { code: "AUDIT_LOGS", name: "Nhật ký Hệ thống", icon: ClipboardList, href: "/admin/logs" },
      { code: "MAINTENANCE", name: "Sao lưu & Bảo trì", icon: Database, href: "/admin/maintenance", requiresAdmin: true },
      { code: "ROLES", name: "Quản lý Nhóm quyền", icon: Shield, href: "/admin/roles", requiresAdmin: true },
      { code: "USERS", name: "Tài khoản Nhân sự", icon: Users, href: "/admin/users", requiresAdmin: true },
      { code: "CAMPUSES", name: "Quản lý Cơ sở", icon: Building2, href: "/admin/campuses", requiresAdmin: true },
      { code: "PARENTS", name: "Tài khoản PHHS", icon: UserPlus, href: "/admin/parents" },
      { code: "STUDENT_PORTAL_CONFIG", name: "Cổng ảnh học sinh", icon: Globe, href: "/admin/student-portal", requiresAdmin: true },
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
      },
      {
        code: "KTDBCL_HUONG_NGHIEP",
        name: "QL Hướng nghiệp",
        icon: Compass,
        href: "/admin/ktdbcl/huong-nghiep"
      },
      {
        code: "KTDBCL_SUPPORT",
        name: "Hỗ trợ học tập",
        icon: FileText,
        href: "/admin/ktdbcl/support"
      },
      {
        code: "KTDBCL_GRADE_REMARKS",
        name: "QL Điểm/Nhận xét",
        icon: ClipboardList,
        href: "/admin/ktdbcl/diem-nhan-xet"
      },
      {
        code: "KTDBCL_GRADE_CTQT",
        name: "Quản lý Điểm CTQT",
        icon: Globe,
        href: "/admin/ktdbcl/diem-ctqt"
      },
      {
        code: "KTDBCL_THONG_KE_BAO_CAO",
        name: "Thống kê báo cáo",
        icon: BarChart3,
        href: "/admin/ktdbcl/thong-ke-bao-cao",
        subModules: [
          { code: "KTDBCL_TK_DIEM_TB", name: "1. ĐTB các môn & Phổ điểm", href: "/admin/ktdbcl/thong-ke-bao-cao?tab=analytics" },
          { code: "KTDBCL_TK_TIEN_DO", name: "2. Giám sát: Tiến độ nhập điểm", href: "/admin/ktdbcl/thong-ke-bao-cao?tab=progress" },
          { code: "KTDBCL_TK_DUYET_MO_SO", name: "3. Duyệt yêu cầu mở sổ điểm", href: "/admin/ktdbcl/thong-ke-bao-cao?tab=requests" },
          { code: "KTDBCL_TK_PHAN_HOI", name: "4. Tổng hợp: Phản hồi PHHS & Trao đổi", href: "/admin/ktdbcl/thong-ke-bao-cao?tab=feedback" },
        ]
      },
      {
        code: "KTDBCL_PHAN_TICH_THKQ",
        name: "Phân tích THKQ",
        icon: TrendingUp,
        href: "/admin/ktdbcl/phan-tich-thkq"
      },
            {
        code: "QL_DGNL",
        name: "QL ĐGNL",
        icon: Sparkles,
        href: "/admin/competency-assessment/import",
        subModules: [
          { code: "COMPETENCY_IMPORT", name: "Import ĐGNL (Radar)", href: "/admin/competency-assessment/import" },
          { code: "COMPETENCY_ALIASES", name: "Từ điển Alias Môn & NL", href: "/admin/competency-assessment/aliases" },
          { code: "COMPETENCY_HISTORY", name: "Lịch sử Import ĐGNL", href: "/admin/competency-assessment/history" },
        ]
      },
      {
        code: "KTDBCL_IMPORT_KQHT",
        name: "Import KQHT",
        icon: FileSpreadsheet,
        href: "/admin/ktdbcl/import-kqht?v=2.1"
      }
    ]
  },
  {
    id: "EXPERIENTIAL",
    name: "Hoạt động trải nghiệm",
    color: "emerald",
    icon: Award,
    modules: [
      {
        code: "EXPERIENTIAL_ACTIVITIES",
        name: "Hoạt động trải nghiệm",
        icon: Award,
        href: "/admin/experiential-activities/catalogs",
        subModules: [
          { code: "EXP_ACT_CATALOGS", name: "1. Danh mục HĐTN & Ngoại khóa", href: "/admin/experiential-activities/catalogs" },
          { code: "EXP_ACT_MANAGE", name: "2. Quản lý Triển khai & Đánh giá", href: "/admin/experiential-activities" },
          { code: "EXP_ACT_THEMES", name: "3. Chủ đề giáo dục", href: "/admin/experiential-activities/catalogs?tab=themes" },
          { code: "EXP_ACT_REPORTS", name: "4. Dashboard Giám sát Tiến độ", href: "/admin/experiential-activities/reports" }
        ]
      }
    ]
  },
  {
    id: "LEARNING_RESOURCES",
    name: "Học liệu",
    color: "teal",
    icon: BookOpen,
    modules: [
      {
        code: "TEXTBOOKS",
        name: "Sách giáo khoa",
        icon: BookOpen,
        href: "/learning-resources/textbooks",
        subModules: [
          { code: "TEXTBOOK_LIST", name: "Thư viện SGK", href: "/learning-resources/textbooks" },
          { code: "TEXTBOOK_MY_BOOKS", name: "Học liệu của tôi", href: "/learning-resources/textbooks?tab=my-books" },
          { code: "TEXTBOOK_CATEGORIES", name: "Bộ sách & NXB", href: "/learning-resources/textbooks/categories" },
          { code: "TEXTBOOK_SOURCES", name: "Nguồn Whitelist", href: "/learning-resources/textbooks/sources" }
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
      {
        code: "CO_VAN_HOC_TAP",
        name: "QL Cố vấn học tập",
        icon: Compass,
        href: "/admin/co-van-hoc-tap",
        subModules: [
          { code: "CO_VAN_PRESETS", name: "QL Phiếu mẫu Mục tiêu", href: "/admin/co-van-hoc-tap?tab=presets" },
          { code: "CO_VAN_DASHBOARD", name: "Dashboard Theo dõi", href: "/admin/co-van-hoc-tap?tab=dashboard" },
          { code: "CO_VAN_CONSULTATIONS", name: "Theo dõi hoạt động tư vấn", href: "/admin/co-van-hoc-tap?tab=consultations" },
        ]
      },
      { code: "DEPARTMENTS", name: "Tổ chuyên môn", icon: Users2, href: "/admin/departments" },
      { code: "SUBJECTS", name: "Quản lý môn học", icon: BookOpen, href: "/admin/subjects" },
      { code: "ACADEMIC_YEARS", name: "Năm học & Học kỳ", icon: Calendar, href: "/admin/academic-years" },
      { code: "MANAGE_CLASSES", name: "Quản lý Lớp học", icon: Layers, href: "/admin/classes" },
      { code: "ASSIGNMENTS", name: "Phân công giảng dạy", icon: Layout, href: "/admin/teaching-assignments" },
      { code: "TIMETABLE", name: "Thời khóa biểu (Kéo & Thả)", icon: Calendar, href: "/admin/thoi-khoa-bieu" },
      { code: "STUDENT_TRANSFERS", name: "Quản lý HS lưu chuyển", icon: ArrowRightLeft, href: "/admin/student-transfers" },
      { code: "DESTINATION_SCHOOLS", name: "Danh mục Trường học", icon: Building2, href: "/admin/truong-lien-ket" },
      { code: "TEACHER_TRANSFERS", name: "Kết chuyển Nhân sự", icon: RefreshCcw, href: "/admin/teacher-transfers" },
    ]
  },
  {
    id: "STUDENT_LOOKUP",
    name: "Tra cứu Học sinh",
    color: "teal",
    icon: Search,
    modules: [
      { code: "TRA_CUU_HO_SO", name: "1. Tra cứu Hồ sơ", icon: Users, href: "/admin/tra-cuu-hoc-sinh/ho-so" },
      { code: "TRA_CUU_KQHT", name: "2. Tra cứu Kết quả học tập", icon: FileText, href: "/admin/tra-cuu-hoc-sinh/ket-qua" },
      { code: "TRA_CUU_XEP_LOAI", name: "3. Tra cứu Xếp loại học tập", icon: CheckCircle2, href: "/admin/tra-cuu-hoc-sinh/xep-loai" },
      { code: "TRA_CUU_THANH_TICH", name: "4. Tra cứu Thành tích", icon: Trophy, href: "/admin/tra-cuu-hoc-sinh/thanh-tich" },
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
      {
        code: "STUDENT_INFO",
        name: "Nhập TT HS, KQKS",
        icon: Users2,
        href: "/admin/student-info",
        subModules: [
          { code: "STUDENT_INFO_K12", name: "Phổ thông K-12", href: "/admin/student-info?tab=general" },
          { code: "STUDENT_INFO_MAM_NON", name: "Mầm non", href: "/admin/student-info?tab=preschool" }
        ]
      },
      {
        code: "ADMIN_STUDENT_PROFILES",
        name: "Hồ sơ Học sinh",
        icon: Users,
        href: "/admin/ho-so-hoc-sinh?v=2.1"
      },
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
    id: "OBSERVATION",
    name: "Dự giờ & Phát triển chuyên môn",
    color: "teal",
    icon: ClipboardCheck,
    modules: [
      { code: "DU_GIO_K12", name: "Khối Phổ thông", icon: ClipboardCheck, href: "/admin/du-gio" },
      { code: "AI_GROWTH", name: "AI Growth – Đổi mới Tiết dạy", icon: Sparkles, href: "/teacher/ai-growth" },
      { code: "DU_GIO_MAM_NON", name: "Khối Mầm non", icon: Baby, href: "/admin/du-gio-mam-non" },
      { code: "DU_GIO_GVNN", name: "Giáo viên nước ngoài", icon: Globe, href: "/admin/du-gio-gvnn" },
      {
        code: "TONG_HOP_DU_GIO",
        name: "Tổng hợp kết quả",
        icon: PieChart,
        href: "/admin/tong-hop-du-gio",
        subModules: [
          { code: "TONG_HOP_DU_GIO_K12", name: "Phổ thông K-12", href: "/admin/tong-hop-du-gio?block=k12" },
          { code: "TONG_HOP_DU_GIO_MN", name: "Mầm non", href: "/admin/tong-hop-du-gio?block=mammon" },
          { code: "TONG_HOP_DU_GIO_DIEU_HANH", name: "Điều hành", href: "/admin/tong-hop-du-gio?block=dieuhan" },
        ]
      },
      {
        code: "MA_TRAN_DU_GIO_TTCM",
        name: "Ma trận dự giờ TTCM",
        icon: Grid3X3,
        href: "/admin/tong-hop-du-gio?tab=ma-tran"
      },
      { code: "XET_DUYET_DANH_GIA_LAI", name: "Xét duyệt đánh giá lại", icon: RefreshCcw, href: "/admin/du-gio?tab=xet-duyet-danh-gia-lai" }
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
