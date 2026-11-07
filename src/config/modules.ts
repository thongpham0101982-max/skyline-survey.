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
  TrendingUp,
  QrCode,
  LayoutDashboard,
  KeyRound,
  PenTool
} from "lucide-react"

export const APP_CATEGORIES = [
  {
    id: "SYSTEM_KPIS",
    name: "KPIs Hệ thống",
    color: "violet",
    icon: BarChart3,
    modules: [
      {
        code: "KPI_PHAM_CHAT_TU_HAO",
        name: "Phẩm chất HS & Tự hào Sky-Line",
        icon: Award,
        href: "/admin/kpis/pham-chat-tu-hao",
      },
    ],
  },
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
      { code: "API_INTEGRATIONS", name: "Kết nối API", icon: KeyRound, href: "/admin/api-integrations", requiresAdmin: true },
      { code: "DIGITAL_SIGNATURES", name: "Cấu hình Chữ ký số", icon: PenTool, href: "/admin/chu-ky-so", requiresAdmin: true },
    ]
  },
  {
    id: "KTDBCL",
    name: "Khảo thí & ĐBCL",
    color: "sky",
    icon: Shield,
    modules: [
      {
        code: "KTDBCL_KHAO_THI_SO",
        name: "Khảo thí Số (OMR & LMS)",
        icon: QrCode,
        href: "/admin/ktdbcl/khao-thi-so",
        subModules: [
          { code: "KTDBCL_KTS_OVERVIEW", name: "1. Tổng quan Khảo thí", href: "/admin/ktdbcl/khao-thi-so?tab=overview" },
          { code: "KTDBCL_KTS_PERIODS", name: "2. Kỳ kiểm tra & Thi bù", href: "/admin/ktdbcl/khao-thi-so?tab=periods" },
          { code: "KTDBCL_KTS_ASSIGNMENTS", name: "3. Phân công Khảo thí", href: "/admin/ktdbcl/khao-thi-so?tab=assignments" },
          { code: "KTDBCL_KTS_PAPERS", name: "4. Ma trận & Hồ sơ đề", href: "/admin/ktdbcl/khao-thi-so?tab=papers" },
          { code: "KTDBCL_KTS_SESSIONS", name: "5. Lịch & Coi kiểm tra", href: "/admin/ktdbcl/khao-thi-so?tab=sessions" },
          { code: "KTDBCL_KTS_GRADING", name: "6. Chấm bài (OMR & LMS)", href: "/admin/ktdbcl/khao-thi-so?tab=grading" },
          { code: "KTDBCL_KTS_RESULTS", name: "7. Kết quả & Duyệt điểm", href: "/admin/ktdbcl/khao-thi-so?tab=results" },
          { code: "KTDBCL_KTS_REPORTS", name: "8. Báo cáo & Lưu trữ", href: "/admin/ktdbcl/khao-thi-so?tab=reports" },
          { code: "KTDBCL_KTS_NOTIFICATIONS", name: "9. Thông báo Khảo thí", href: "/admin/ktdbcl/khao-thi-so?tab=notifications" },
        ]
      },
      {
        code: "KTDBCL_CONNECT",
        name: "KT&ĐBCL Connect",
        icon: MessageSquare,
        href: "/admin/ktdbcl/connect",
        subModules: [
          { code: "KTDBCL_CONNECT_DASHBOARD", name: "1. Kênh tiếp nhận & Xử lý", href: "/admin/ktdbcl/connect?tab=tickets" },
          { code: "KTDBCL_CONNECT_ANNOUNCEMENTS", name: "2. Thông báo nghiệp vụ", href: "/admin/ktdbcl/connect?tab=announcements" },
          { code: "KTDBCL_CONNECT_KNOWLEDGE", name: "3. Kho tri thức & Hướng dẫn", href: "/admin/ktdbcl/connect?tab=knowledge" },
          { code: "KTDBCL_CONNECT_METRICS", name: "4. Dashboard & Thống kê", href: "/admin/ktdbcl/connect?tab=dashboard" }
        ]
      },
      {
        code: "KTDBCL_CHAT_LUONG_PHOI_HOP",
        name: "Chất lượng Phối hợp Giáo dục",
        icon: Users,
        href: "/admin/ktdbcl/chat-luong-phoi-hop",
        subModules: [
          { code: "KTDBCL_CLPH_DASHBOARD", name: "1. Dashboard Tổng quan (10 KPI)", href: "/admin/ktdbcl/chat-luong-phoi-hop?tab=overview" },
          { code: "KTDBCL_CLPH_CASES", name: "2. Quản lý Yêu cầu & SLA", href: "/admin/ktdbcl/chat-luong-phoi-hop?tab=cases" },
          { code: "KTDBCL_CLPH_NPS", name: "3. Quản lý NPS GVCN & GVBM", href: "/admin/ktdbcl/chat-luong-phoi-hop?tab=nps" },
          { code: "KTDBCL_CLPH_IMPROVEMENTS", name: "4. Quản lý Cải tiến Chất lượng", href: "/admin/ktdbcl/chat-luong-phoi-hop?tab=improvements" },
        ]
      },
      {
        code: "KTDBCL_HOP_PHU_HUYNH",
        name: "Họp Phụ huynh số",
        icon: QrCode,
        href: "/admin/ktdbcl/hop-phu-huynh",
        subModules: [
          { code: "KTDBCL_HPH_OVERVIEW", name: "1. Dashboard Chất lượng (11 KPI)", href: "/admin/ktdbcl/hop-phu-huynh?tab=overview" },
          { code: "KTDBCL_HPH_MEETINGS", name: "2. Quản lý Lịch họp & Phê duyệt", href: "/admin/ktdbcl/hop-phu-huynh?tab=meetings" },
          { code: "KTDBCL_HPH_FEEDBACK", name: "3. Giám sát Ý kiến & SLA", href: "/admin/ktdbcl/hop-phu-huynh?tab=feedback" },
          { code: "KTDBCL_HPH_MINUTES", name: "4. Duyệt Biên bản & Nhiệm vụ", href: "/admin/ktdbcl/hop-phu-huynh?tab=minutes" },
          { code: "NAMEPLATES_PHHS", name: "5. In bảng tên Họp PHHS", href: "/teacher/bang-ten-phhs" },
        ]
      },
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
        code: "KTDBCL_INTERNATIONAL_EXAMS",
        name: "Khảo thí Quốc tế & Chứng chỉ",
        icon: Globe,
        href: "/admin/ktdbcl/international-exams"
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
    id: "SPECIAL_SUBJECTS",
    name: "Môn học đặc thù Sky-Line",
    color: "teal",
    icon: Sparkles,
    modules: [
      {
        code: "SPECIAL_SUBJECTS_ROOT",
        name: "Môn học đặc thù",
        icon: Sparkles,
        href: "/admin/special-subjects",
        subModules: [
          { code: "SPEC_SUB_DASHBOARD", name: "1. Dashboard & Báo cáo", href: "/admin/special-subjects" },
          { code: "SPEC_SUB_CATALOGS", name: "2. Danh mục Môn đặc thù", href: "/admin/special-subjects/catalogs" },
          { code: "SPEC_SUB_CURRICULUMS", name: "3. Khung chương trình", href: "/admin/special-subjects/curriculums" },
          { code: "SPEC_SUB_ASSIGNMENTS", name: "4. Phân công giảng dạy", href: "/admin/special-subjects/assignments" },
          { code: "SPEC_SUB_CXXH", name: "5. Giám sát GD Cảm xúc (1–9)", href: "/admin/special-subjects/monitor?subject=CXXH" },
          { code: "SPEC_SUB_GDGT", name: "6. Giám sát GD Giới tính (6–9)", href: "/admin/special-subjects/monitor?subject=GDGT" },
          { code: "SPEC_SUB_FIN_EDU", name: "7. Giám sát GD Tài chính (1–9)", href: "/admin/special-subjects/monitor?subject=FIN_EDU" },
          { code: "SPEC_SUB_GDHN", name: "8. Giám sát GD Hướng nghiệp (6–12)", href: "/admin/special-subjects/monitor?subject=GDHN" },
        ]
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
          { code: "CO_VAN_CONSULTATIONS", name: "Báo cáo tổng hợp", href: "/admin/co-van-hoc-tap?tab=consultations" },
        ]
      },
      { code: "DEPARTMENTS", name: "Tổ chuyên môn", icon: Users2, href: "/admin/departments" },
      { code: "SUBJECTS", name: "Quản lý môn học", icon: BookOpen, href: "/admin/subjects" },
      { code: "ACADEMIC_YEARS", name: "Năm học & Học kỳ", icon: Calendar, href: "/admin/academic-years" },
      { code: "MANAGE_CLASSES", name: "Quản lý Lớp học", icon: Layers, href: "/admin/classes" },
      { code: "ASSIGNMENTS", name: "Phân công giảng dạy", icon: Layout, href: "/admin/teaching-assignments" },
      { code: "TIMETABLE", name: "Thời khóa biểu (Kéo & Thả)", icon: Calendar, href: "/admin/thoi-khoa-bieu" },
      { code: "STUDENT_TRANSFERS", name: "Quản lý HS lưu chuyển", icon: ArrowRightLeft, href: "/admin/student-transfers" },
      { code: "MONTHLY_ENROLLMENT", name: "Theo dõi Sỹ số Tháng", icon: TrendingUp, href: "/admin/sy-so" },
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
    id: "ALUMNI_MANAGEMENT",
    name: "Quản lý Cựu học sinh (Alumni)",
    color: "amber",
    icon: GraduationCap,
    modules: [
      { code: "ALUMNI_DASHBOARD", name: "1. Tổng quan Alumni", icon: LayoutDashboard, href: "/admin/alumni" },
      { code: "ALUMNI_LIST", name: "2. Danh sách cựu học sinh", icon: Users, href: "/admin/alumni/danh-sach" },
      { code: "ALUMNI_QR", name: "3. Quản lý mã QR", icon: QrCode, href: "/admin/alumni/ma-qr" },
      { code: "ALUMNI_SUBMISSIONS", name: "4. Tiếp nhận cập nhật", icon: ClipboardCheck, href: "/admin/alumni/tiep-nhan" },
      { code: "ALUMNI_JOURNEY", name: "5. Hành trình học tập & nghề nghiệp", icon: Compass, href: "/admin/alumni/hanh-trinh" },
      { code: "ALUMNI_REPORTS", name: "6. Báo cáo và phân tích", icon: BarChart3, href: "/admin/alumni/bao-cao" },
      { code: "ALUMNI_CONFIG", name: "7. Cấu hình và phân quyền", icon: Settings, href: "/admin/alumni/cau-hinh", requiresAdmin: true },
    ]
  },
  {
    id: "ASSESSMENT",
    name: "Khảo sát đầu vào",
    color: "emerald",
    icon: ClipboardList,
    modules: [
      {
        code: "DIEU_HANH_KHAO_SAT",
        name: "Điều hành & Tiến độ KSĐV",
        icon: Activity,
        href: "/admin/dieu-hanh-khao-sat"
      },
      {
        code: "CAU_HINH_KHAO_SAT",
        name: "Cấu hình Khảo sát",
        icon: Settings,
        href: "/admin/cau-hinh-khao-sat"
      },
      {
        code: "CAU_HINH_FILE_DIEM_KSDV",
        name: "Cấu hình File điểm KSĐV",
        icon: FileSpreadsheet,
        href: "/admin/cau-hinh-file-diem-ksdv",
      },
      { code: "INPUT_ASSESSMENT_REPORTS", name: "Xuất báo cáo", icon: FileSpreadsheet, href: "/admin/input-assessments/reports" },
      {
        code: "STUDENT_INFO",
        name: "Danh sách Khảo sát",
        icon: Users2,
        href: "/admin/student-info",
        subModules: [
          { code: "STUDENT_INFO_K12", name: "Phổ thông K-12", href: "/admin/student-info?tab=general" },
          { code: "STUDENT_INFO_MAM_NON", name: "Mầm non", href: "/admin/student-info?tab=preschool" }
        ]
      },
      {
        code: "KET_QUA_KHAO_SAT",
        name: "Kết quả khảo sát",
        icon: Award,
        href: "/admin/ket-qua-khao-sat",
        subModules: [
          { code: "KQKS_K12", name: "Phổ thông K-12", href: "/admin/ket-qua-khao-sat?tab=general" },
          { code: "KQKS_MAM_NON", name: "Mầm non", href: "/admin/ket-qua-khao-sat?tab=preschool" }
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
          { code: "PHAN_CONG_K12", name: "Phân công K-12", href: "/admin/phan-cong-khao-sat?tab=k12" },
          { code: "PHAN_CONG_MAM_NON", name: "Phân công Mầm non", href: "/admin/phan-cong-khao-sat?tab=preschool" }
        ]
      },
      {
        code: "XET_DUYET_KET_QUA",
        name: "Xét duyệt Kết quả",
        icon: CheckCircle2,
        href: "/admin/xet-duyet-ket-qua",
        subModules: [
          { code: "INPUT_ASSESSMENTS_REPORTS", name: "Xét duyệt K-12", href: "/admin/xet-duyet-ket-qua?tab=k12" },
          { code: "XET_DUYET_MAM_NON", name: "Xét duyệt Mầm non", href: "/admin/xet-duyet-ket-qua?tab=preschool" }
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
      { code: "DU_GIO_MAM_NON", name: "Khối Mầm non", icon: Baby, href: "/admin/du-gio-mam-non" },
      { code: "DU_GIO_GVNN", name: "Tiếng Anh – Chương trình Song ngữ", icon: Globe, href: "/admin/du-gio-gvnn" },
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
    name: "QA WORKSPACE KT&ĐBCL",
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
