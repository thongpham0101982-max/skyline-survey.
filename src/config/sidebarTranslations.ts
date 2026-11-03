export type SupportedLanguage = "vi" | "en";

export interface SidebarTranslations {
  categories: Record<string, { vi: string; en: string }>;
  modules: Record<string, { vi: string; en: string }>;
  teacherNav: Record<string, { vi: string; en: string }>;
  parentNav: Record<string, { vi: string; en: string }>;
  common: Record<string, { vi: string; en: string }>;
}

export const SIDEBAR_TRANSLATIONS: SidebarTranslations = {
  categories: {
    SYSTEM_KPIS: { vi: "KPIs Hệ thống", en: "System KPIs" },
    SYSTEM: { vi: "Hệ thống", en: "System Administration" },
    KTDBCL: { vi: "Khảo thí & ĐBCL", en: "Testing & Quality Assurance" },
    SPECIAL_SUBJECTS: { vi: "Môn học đặc thù Sky-Line", en: "Special Subjects Management" },
    EXPERIENTIAL: { vi: "Hoạt động trải nghiệm", en: "Experiential Activities" },
    LEARNING_RESOURCES: { vi: "Học liệu", en: "Learning Resources" },
    TRAINING: { vi: "Quản lý Đào tạo", en: "Academic Management" },
    STUDENT_LOOKUP: { vi: "Tra cứu Học sinh", en: "Student Lookup" },
    ALUMNI_MANAGEMENT: { vi: "Quản lý Cựu học sinh (Alumni)", en: "Sky-Line Alumni Management" },
    ASSESSMENT: { vi: "Khảo sát đầu vào", en: "Entrance Assessment" },
    SURVEY: { vi: "Khảo sát", en: "Surveys & Feedback" },
    OBSERVATION: { vi: "Dự giờ & Phát triển chuyên môn", en: "Observation & Growth" },
    OTHER: { vi: "QA WORKSPACE KT&ĐBCL", en: "QA WORKSPACE KT&ĐBCL" },
  },
  modules: {
    // SYSTEM_KPIS
    KPI_PHAM_CHAT_TU_HAO: {
      vi: "Phẩm chất HS & Tự hào Sky-Line",
      en: "Student Qualities (IP2.1) & Pride NPS",
    },

    // SYSTEM
    AUDIT_LOGS: { vi: "Nhật ký Hệ thống", en: "System Audit Logs" },
    MAINTENANCE: { vi: "Sao lưu & Bảo trì", en: "Backup & Maintenance" },
    ROLES: { vi: "Quản lý Nhóm quyền", en: "Role Permissions" },
    USERS: { vi: "Tài khoản Nhân sự", en: "Staff Accounts" },
    CAMPUSES: { vi: "Quản lý Cơ sở", en: "Campus Management" },
    PARENTS: { vi: "Tài khoản PHHS", en: "Parent Accounts" },
    STUDENT_PORTAL_CONFIG: { vi: "Cổng ảnh học sinh", en: "Student Photo Portal" },

    // KTDBCL
    KTDBCL_CONNECT: { vi: "KT&ĐBCL Connect", en: "QA & Testing Connect" },
    KTDBCL_KTS_NOTIFICATIONS: { vi: "9. Thông báo Khảo thí", en: "9. Exam Notifications" },
    KTDBCL_HOP_PHU_HUYNH: { vi: "Họp Phụ huynh số", en: "Digital Parent Meeting" },
    KTDBCL_HPH_OVERVIEW: { vi: "1. Dashboard Chất lượng (11 KPI)", en: "1. Quality Dashboard (11 KPIs)" },
    KTDBCL_HPH_MEETINGS: { vi: "2. Quản lý Lịch họp & Phê duyệt", en: "2. Meeting Schedule & Approval" },
    KTDBCL_HPH_FEEDBACK: { vi: "3. Giám sát Ý kiến & SLA", en: "3. Feedback & SLA Monitoring" },
    KTDBCL_HPH_MINUTES: { vi: "4. Duyệt Biên bản & Nhiệm vụ", en: "4. Minutes & Post-Meeting Tasks" },
    KTDBCL_CONNECT_DASHBOARD: { vi: "1. Kênh tiếp nhận & Xử lý", en: "1. Request Inbox & Handling" },
    KTDBCL_CONNECT_ANNOUNCEMENTS: { vi: "2. Thông báo nghiệp vụ", en: "2. Official Announcements" },
    KTDBCL_CONNECT_KNOWLEDGE: { vi: "3. Kho tri thức & Hướng dẫn", en: "3. Knowledge Base & FAQ" },
    KTDBCL_CONNECT_METRICS: { vi: "4. Dashboard & Thống kê", en: "4. Dashboard & Analytics" },
    KTDBCL_EXAMS: { vi: "QL Thành tích", en: "Achievements & Competitions" },
    KTDBCL_EXAM_CATEGORIES: { vi: "Quản lý danh mục", en: "Category Management" },
    KTDBCL_EXAM_ROUNDS: { vi: "Vòng thi", en: "Competition Rounds" },
    KTDBCL_EXAM_ACHIEVEMENTS: { vi: "Thành tích", en: "Achievements" },
    KTDBCL_EXAM_LIST: { vi: "Danh sách Kỳ thi", en: "Competitions List" },
    KTDBCL_EXAM_STUDENTS: { vi: "Đăng ký Dự thi", en: "Student Registration" },
    KTDBCL_EXAM_RESULTS: { vi: "Nhập điểm & Kết quả", en: "Results & Scores" },
    KTDBCL_INTERNATIONAL_EXAMS: { vi: "Khảo thí Quốc tế & Chứng chỉ", en: "International Exams & Certificates" },
    KTDBCL_INTL_DASHBOARDS: { vi: "1. Dashboard Chuyên biệt (5 Chuẩn)", en: "1. Specialized Dashboards (5 Standards)" },
    KTDBCL_INTL_RESULTS: { vi: "2. Sổ Kết quả & Thành phần", en: "2. Results & Components Ledger" },
    KTDBCL_INTL_CERTIFICATES: { vi: "3. Kho Lưu trữ Chứng chỉ", en: "3. Certificates Vault" },
    KTDBCL_INTL_IMPORT: { vi: "4. Import Excel & Đối soát HS", en: "4. Historical Excel Import & Reconcile" },
    KTDBCL_HUONG_NGHIEP: { vi: "QL Hướng nghiệp", en: "Career Guidance" },
    KTDBCL_SUPPORT: { vi: "Hỗ trợ học tập", en: "Academic Support" },
    KTDBCL_GRADE_REMARKS: { vi: "QL Điểm/Nhận xét", en: "Grades & Remarks" },
    KTDBCL_GRADE_CTQT: { vi: "Quản lý Điểm CTQT", en: "International Gradebook" },
    KTDBCL_THONG_KE_BAO_CAO: { vi: "Thống kê báo cáo", en: "Statistics & Reports" },
    KTDBCL_TK_DIEM_TB: { vi: "1. ĐTB các môn & Phổ điểm", en: "1. Subject Averages & Distribution" },
    KTDBCL_TK_TIEN_DO: { vi: "2. Giám sát: Tiến độ nhập điểm", en: "2. Grade Entry Progress" },
    KTDBCL_TK_DUYET_MO_SO: { vi: "3. Duyệt yêu cầu mở sổ điểm", en: "3. Gradebook Unlock Requests" },
    KTDBCL_TK_PHAN_HOI: { vi: "4. Tổng hợp: Phản hồi PHHS & Trao đổi", en: "4. Parent Feedback & Dialogue" },
    KTDBCL_PHAN_TICH_THKQ: { vi: "Phân tích THKQ", en: "Integrated Results Analytics" },
    QL_DGNL: { vi: "QL ĐGNL", en: "Competency Assessment" },
    COMPETENCY_IMPORT: { vi: "Import ĐGNL (Radar)", en: "Import Assessment (Radar)" },
    COMPETENCY_ALIASES: { vi: "Từ điển Alias Môn & NL", en: "Subject & Competency Aliases" },
    COMPETENCY_HISTORY: { vi: "Lịch sử Import ĐGNL", en: "Import History" },
    KTDBCL_IMPORT_KQHT: { vi: "Import KQHT", en: "Import Academic Results" },

    // SPECIAL_SUBJECTS
    SPECIAL_SUBJECTS_ROOT: { vi: "Môn học đặc thù", en: "Special Subjects" },
    SPEC_SUB_DASHBOARD: { vi: "1. Dashboard & Báo cáo", en: "1. Dashboard & Reports" },
    SPEC_SUB_CATALOGS: { vi: "2. Danh mục Môn đặc thù", en: "2. Subject Catalogs" },
    SPEC_SUB_CURRICULUMS: { vi: "3. Khung chương trình", en: "3. Curriculums & Lessons" },
    SPEC_SUB_ASSIGNMENTS: { vi: "4. Phân công giảng dạy", en: "4. Teaching Assignments" },
    SPEC_SUB_CXXH: { vi: "5. Giám sát GD Cảm xúc (1–9)", en: "5. Monitor Emotion Education (1–9)" },
    SPEC_SUB_GDGT: { vi: "6. Giám sát GD Giới tính (6–9)", en: "6. Monitor Sex Education (6–9)" },
    SPEC_SUB_FIN_EDU: { vi: "7. Giám sát GD Tài chính (2–9)", en: "7. Monitor Financial Education (2–9)" },
    SPEC_SUB_GDHN: { vi: "8. Giám sát GD Hướng nghiệp (6–12)", en: "8. Monitor Career Guidance (6–12)" },

    // EXPERIENTIAL
    EXPERIENTIAL_ACTIVITIES: { vi: "Hoạt động trải nghiệm", en: "Experiential Activities" },
    EXP_ACT_CATALOGS: { vi: "1. Danh mục HĐTN & Ngoại khóa", en: "1. Activity Catalog" },
    EXP_ACT_MANAGE: { vi: "2. Quản lý Triển khai & Đánh giá", en: "2. Implementation & Assessment" },
    EXP_ACT_THEMES: { vi: "3. Chủ đề giáo dục", en: "3. Educational Themes" },
    EXP_ACT_REPORTS: { vi: "4. Dashboard Giám sát Tiến độ", en: "4. Progress Dashboard" },

    // LEARNING RESOURCES
    TEXTBOOKS: { vi: "Sách giáo khoa", en: "Textbooks" },
    TEXTBOOK_LIST: { vi: "Thư viện SGK", en: "Textbook Library" },
    TEXTBOOK_MY_BOOKS: { vi: "Học liệu của tôi", en: "My Resources" },
    TEXTBOOK_CATEGORIES: { vi: "Bộ sách & NXB", en: "Curricula & Publishers" },
    TEXTBOOK_SOURCES: { vi: "Nguồn Whitelist", en: "Whitelisted Sources" },
    NAMEPLATES_PHHS: { vi: "In bảng tên Họp PHHS", en: "Parent Meeting Nameplates" },

    // TRAINING
    TEACHERS: { vi: "Quản lý Giáo viên", en: "Teacher Management" },
    CO_VAN_HOC_TAP: { vi: "QL Cố vấn học tập", en: "Academic Advising" },
    CO_VAN_PRESETS: { vi: "QL Phiếu mẫu Mục tiêu", en: "Goal Templates" },
    CO_VAN_DASHBOARD: { vi: "Dashboard Theo dõi", en: "Advisory Dashboard" },
    CO_VAN_CONSULTATIONS: { vi: "Báo cáo tổng hợp", en: "Advisory Summary Reports" },
    DEPARTMENTS: { vi: "Tổ chuyên môn", en: "Academic Departments" },
    SUBJECTS: { vi: "Quản lý môn học", en: "Subject Management" },
    ACADEMIC_YEARS: { vi: "Năm học & Học kỳ", en: "Academic Years & Semesters" },
    MANAGE_CLASSES: { vi: "Quản lý Lớp học", en: "Class Management" },
    ASSIGNMENTS: { vi: "Phân công giảng dạy", en: "Teaching Assignments" },
    TIMETABLE: { vi: "Thời khóa biểu (Kéo & Thả)", en: "Timetable (Drag & Drop)" },
    STUDENT_TRANSFERS: { vi: "Quản lý HS lưu chuyển", en: "Student Transfers" },
    MONTHLY_ENROLLMENT: { vi: "Theo dõi Sỹ số Tháng", en: "Monthly Enrollment" },
    DESTINATION_SCHOOLS: { vi: "Danh mục Trường học", en: "Partner Schools" },
    TEACHER_TRANSFERS: { vi: "Kết chuyển Nhân sự", en: "Staff Transfers" },

    // STUDENT LOOKUP
    TRA_CUU_HO_SO: { vi: "1. Tra cứu Hồ sơ", en: "1. Student Profiles" },
    TRA_CUU_KQHT: { vi: "2. Tra cứu Kết quả học tập", en: "2. Academic Results" },
    TRA_CUU_XEP_LOAI: { vi: "3. Tra cứu Xếp loại học tập", en: "3. Academic Classification" },
    TRA_CUU_THANH_TICH: { vi: "4. Tra cứu Thành tích", en: "4. Student Achievements" },

    // ALUMNI_MANAGEMENT
    ALUMNI_DASHBOARD: { vi: "1. Tổng quan Alumni", en: "1. Alumni Overview" },
    ALUMNI_LIST: { vi: "2. Danh sách cựu học sinh", en: "2. Alumni Directory" },
    ALUMNI_QR: { vi: "3. Quản lý mã QR", en: "3. QR Code Management" },
    ALUMNI_SUBMISSIONS: { vi: "4. Tiếp nhận cập nhật", en: "4. Update Submissions" },
    ALUMNI_JOURNEY: { vi: "5. Hành trình học tập & nghề nghiệp", en: "5. Education & Career Journey" },
    ALUMNI_REPORTS: { vi: "6. Báo cáo và phân tích", en: "6. Reports & Analytics" },
    ALUMNI_CONFIG: { vi: "7. Cấu hình và phân quyền", en: "7. Configuration & Access" },

    // ASSESSMENT
    DIEU_HANH_KHAO_SAT: { vi: "Điều hành & Tiến độ KSĐV", en: "Entrance Progress & Operations" },
    CAU_HINH_KHAO_SAT: { vi: "Cấu hình Khảo sát", en: "Assessment Configuration" },
    CAU_HINH_FILE_DIEM_KSDV: { vi: "Cấu hình File điểm KSĐV", en: "Score Sheet Template" },
    INPUT_ASSESSMENT_REPORTS: { vi: "Xuất báo cáo", en: "Export Reports" },
    STUDENT_INFO: { vi: "Danh sách Khảo sát", en: "Survey Roster" },
    STUDENT_INFO_K12: { vi: "Phổ thông K-12", en: "K-12 General" },
    STUDENT_INFO_MAM_NON: { vi: "Mầm non", en: "Preschool" },
    KET_QUA_KHAO_SAT: { vi: "Kết quả khảo sát", en: "Survey Results" },
    KQKS_K12: { vi: "Phổ thông K-12", en: "K-12 Results" },
    KQKS_MAM_NON: { vi: "Mầm non", en: "Preschool Results" },
    ADMIN_STUDENT_PROFILES: { vi: "Hồ sơ Học sinh", en: "Student Records" },
    PHAN_CONG_KHAO_SAT: { vi: "Phân công khảo sát", en: "Assessment Assignment" },
    PHAN_CONG_K12: { vi: "Phân công K-12", en: "K-12 Assignment" },
    PHAN_CONG_MAM_NON: { vi: "Phân công Mầm non", en: "Preschool Assignment" },
    XET_DUYET_KET_QUA: { vi: "Xét duyệt Kết quả", en: "Result Approval" },
    INPUT_ASSESSMENTS_REPORTS: { vi: "Xét duyệt K-12", en: "K-12 Approval" },
    XET_DUYET_MAM_NON: { vi: "Xét duyệt Mầm non", en: "Preschool Approval" },

    // SURVEY
    MANAGE_SURVEYS: { vi: "Quản lý Khảo sát", en: "Survey Management" },
    SURVEY_LIST: { vi: "Quản lý Khảo sát", en: "Survey List" },
    SURVEY_CATALOG: { vi: "Danh mục Khảo sát", en: "Survey Categories" },
    SURVEY_RESULTS: { vi: "Kết quả KS", en: "Survey Results" },
    NPS_ANALYSIS: { vi: "Phân tích NPS", en: "NPS Analysis" },
    FEEDBACK: { vi: "Theo dõi Phản hồi", en: "Feedback Tracking" },

    // OBSERVATION
    DU_GIO_K12: { vi: "Khối Phổ thông", en: "K-12 Observation" },
    AI_GROWTH: { vi: "AI Growth – Đổi mới Tiết dạy", en: "AI Growth – Lesson Innovation" },
    DU_GIO_MAM_NON: { vi: "Khối Mầm non", en: "Preschool Observation" },
    DU_GIO_GVNN: { vi: "Giáo viên nước ngoài", en: "Foreign Teacher Observation" },
    TONG_HOP_DU_GIO: { vi: "Tổng hợp kết quả", en: "Observation Summary" },
    TONG_HOP_DU_GIO_K12: { vi: "Phổ thông K-12", en: "K-12 Observation Summary" },
    TONG_HOP_DU_GIO_MN: { vi: "Mầm non", en: "Preschool Observation Summary" },
    TONG_HOP_DU_GIO_DIEU_HANH: { vi: "Điều hành", en: "Leadership Overview" },
    MA_TRAN_DU_GIO_TTCM: { vi: "Ma trận dự giờ TTCM", en: "HOD Observation Matrix" },
    XET_DUYET_DANH_GIA_LAI: { vi: "Xét duyệt đánh giá lại", en: "Re-evaluation Approval" },

    // OTHER
    TASKS: { vi: "Điều hành Công việc", en: "Task Operations" },
    WEEKLY_REPORTS: { vi: "Báo cáo Tuần", en: "Weekly Reports" },
  },
  teacherNav: {
    overview: { vi: "Tổng quan", en: "Overview" },
    my_tasks: { vi: "Nhiệm vụ của tôi", en: "My Tasks" },
    ktdbcl_connect: { vi: "KT&ĐBCL Connect", en: "QA Connect & Support" },
    homeroom_section: { vi: "Chủ nhiệm & Học sinh", en: "Homeroom & Students" },
    homeroom_class: { vi: "Lớp chủ nhiệm", en: "Homeroom Class" },
    homeroom_surveys: { vi: "NPS & Phản hồi PHHS", en: "NPS & Parent Feedback" },
    homeroom_advisor: { vi: "Cố vấn học tập", en: "Academic Advising" },
    homeroom_profiles: { vi: "Hồ sơ học tập", en: "Student Academic Profile" },
    homeroom_nameplates: { vi: "In bảng tên Họp PHHS", en: "Parent Meeting Nameplates" },
    homeroom_support: { vi: "Phụ đạo & Bồi dưỡng", en: "Academic Support & Tutoring" },
    homeroom_grades: { vi: "Điểm lớp chủ nhiệm", en: "Homeroom Grades" },

    subject_section: { vi: "Giảng dạy & Chuyên môn", en: "Teaching & Academics" },
    input_assessments: { vi: "Khảo sát đầu vào", en: "Entrance Assessment" },
    input_assessments_k12: { vi: "Khảo sát đầu vào (K-12)", en: "Entrance Assessment (K-12)" },
    input_assessments_preschool: { vi: "Khảo sát đầu vào (Mầm non)", en: "Entrance Assessment (Preschool)" },
    subject_textbooks: { vi: "Học liệu – SGK", en: "Textbooks & Resources" },
    subject_experiential: { vi: "Sổ theo dõi Hoạt động trải nghiệm", en: "Experiential Activity Log" },
    subject_gradebook: { vi: "Sổ điểm – Nhận xét (CT Bộ)", en: "MOET Gradebook & Remarks" },
    subject_intl_gradebook: { vi: "Sổ điểm CTQT", en: "International Gradebook" },
    subject_quality: { vi: "Phân tích chất lượng", en: "Quality Analytics" },
    subject_assignments: { vi: "Phân công giảng dạy", en: "Teaching Assignments" },
    subject_tutoring: { vi: "Phụ đạo & Bồi dưỡng", en: "Tutoring & Support" },
    subject_timetable: { vi: "Thời khóa biểu", en: "Timetable" },

    observation_section: { vi: "Dự giờ & PTCM", en: "Observation & Growth" },
    obs_k12: { vi: "Khối Phổ thông", en: "K-12 Observation" },
    obs_ai_growth: { vi: "AI Growth – Đổi mới", en: "AI Growth – Lesson Innovation" },
    obs_ai_growth_tag: { vi: "Mới", en: "New" },
    obs_preschool: { vi: "Khối Mầm non", en: "Preschool Observation" },
    obs_foreign: { vi: "Giáo viên nước ngoài", en: "Foreign Teacher Observation" },
  },
  parentNav: {
    overview: { vi: "Tổng quan", en: "Overview" },
    notifications: { vi: "Thông báo & Liên lạc", en: "Notifications & Inbox" },
    meetings: { vi: "Họp Phụ huynh", en: "Parent Meetings" },
    surveys: { vi: "Khảo sát định kỳ", en: "Periodic Surveys" },
    grades: { vi: "Điểm kiểm tra", en: "Assessment Grades" },
    profile: { vi: "Hồ sơ học sinh", en: "Student Profile" },
    advisory: { vi: "Cố vấn học tập", en: "Academic Advisory" },
  },
  common: {
    dashboard: { vi: "Dashboard", en: "Dashboard" },
    collapse: { vi: "Thu gọn", en: "Collapse" },
    expand: { vi: "Mở rộng", en: "Expand" },
    signout: { vi: "Đăng xuất", en: "Sign out" },
    loading: { vi: "Đang tải...", en: "Loading..." },
    language: { vi: "Ngôn ngữ", en: "Language" },
  }
};

export function getCategoryName(catId: string, defaultName: string, lang: SupportedLanguage): string {
  if (lang === "en" && SIDEBAR_TRANSLATIONS.categories[catId]?.en) {
    return SIDEBAR_TRANSLATIONS.categories[catId].en;
  }
  return SIDEBAR_TRANSLATIONS.categories[catId]?.vi || defaultName;
}

export function getModuleName(code: string, defaultName: string, lang: SupportedLanguage): string {
  if (lang === "en" && SIDEBAR_TRANSLATIONS.modules[code]?.en) {
    return SIDEBAR_TRANSLATIONS.modules[code].en;
  }
  return SIDEBAR_TRANSLATIONS.modules[code]?.vi || defaultName;
}
