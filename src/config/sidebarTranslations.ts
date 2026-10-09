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
    SYSTEM: { vi: "Hệ thống", en: "System Administration" },
    KTDBCL: { vi: "Khảo thí & ĐBCL", en: "Testing & Quality Assurance" },
    EXPERIENTIAL: { vi: "Hoạt động trải nghiệm", en: "Experiential Activities" },
    LEARNING_RESOURCES: { vi: "Học liệu", en: "Learning Resources" },
    TRAINING: { vi: "Quản lý Đào tạo", en: "Academic Management" },
    STUDENT_LOOKUP: { vi: "Tra cứu Học sinh", en: "Student Lookup" },
    ASSESSMENT: { vi: "Khảo sát đầu vào", en: "Entrance Assessment" },
    SURVEY: { vi: "Khảo sát", en: "Surveys & Feedback" },
    OBSERVATION: { vi: "Dự giờ & Phát triển chuyên môn", en: "Observation & Growth" },
    OTHER: { vi: "Công việc khác", en: "General Operations" },
  },
  modules: {
    // SYSTEM
    AUDIT_LOGS: { vi: "Nhật ký Hệ thống", en: "System Audit Logs" },
    MAINTENANCE: { vi: "Sao lưu & Bảo trì", en: "Backup & Maintenance" },
    ROLES: { vi: "Quản lý Nhóm quyền", en: "Role Permissions" },
    USERS: { vi: "Tài khoản Nhân sự", en: "Staff Accounts" },
    CAMPUSES: { vi: "Quản lý Cơ sở", en: "Campus Management" },
    PARENTS: { vi: "Tài khoản PHHS", en: "Parent Accounts" },
    STUDENT_PORTAL_CONFIG: { vi: "Cổng ảnh học sinh", en: "Student Photo Portal" },

    // KTDBCL
    KTDBCL_EXAMS: { vi: "QL Thành tích", en: "Achievements & Competitions" },
    KTDBCL_EXAM_CATEGORIES: { vi: "Quản lý danh mục", en: "Category Management" },
    KTDBCL_EXAM_ROUNDS: { vi: "Vòng thi", en: "Competition Rounds" },
    KTDBCL_EXAM_ACHIEVEMENTS: { vi: "Thành tích", en: "Achievements" },
    KTDBCL_EXAM_LIST: { vi: "Danh sách Kỳ thi", en: "Competitions List" },
    KTDBCL_EXAM_STUDENTS: { vi: "Đăng ký Dự thi", en: "Student Registration" },
    KTDBCL_EXAM_RESULTS: { vi: "Nhập điểm & Kết quả", en: "Results & Scores" },
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

    // ASSESSMENT
    CAU_HINH_KHAO_SAT: { vi: "Cấu hình Khảo sát", en: "Assessment Configuration" },
    CAU_HINH_FILE_DIEM_KSDV: { vi: "Cấu hình File điểm KSĐV", en: "Score Sheet Template" },
    INPUT_ASSESSMENT_REPORTS: { vi: "Xuất báo cáo", en: "Export Reports" },
    STUDENT_INFO: { vi: "Nhập TT HS, KQKS", en: "Student Info & Scores" },
    STUDENT_INFO_K12: { vi: "Phổ thông K-12", en: "K-12 General" },
    STUDENT_INFO_MAM_NON: { vi: "Mầm non", en: "Preschool" },
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
    homeroom_section: { vi: "A. Công tác GVCN", en: "A. Homeroom Teacher" },
    homeroom_class: { vi: "1. Lớp chủ nhiệm", en: "1. Homeroom Class" },
    homeroom_surveys: { vi: "2. NSP Khảo sát", en: "2. Surveys & Feedback" },
    homeroom_advisor: { vi: "3. Cố vấn Học tập & Check-in", en: "3. Academic Advisor & Check-in" },
    homeroom_profiles: { vi: "4. Hồ sơ học tập HS", en: "4. Student Academic Profile" },
    homeroom_support: { vi: "5. Phụ đạo, bồi dưỡng Học sinh", en: "5. Academic Support & Tutoring" },
    homeroom_orientation: { vi: "6. Sổ theo dõi Hướng nghiệp", en: "6. Career Guidance Log" },
    homeroom_grades: { vi: "7. Điểm lớp chủ nhiệm", en: "7. Homeroom Grades" },

    subject_section: { vi: "B. Công tác GVBM", en: "B. Subject Teacher" },
    input_assessments: { vi: "1. Khảo sát đầu vào", en: "1. Entrance Assessment" },
    observation_section: { vi: "DỰ GIỜ & PHÁT TRIỂN CHUYÊN MÔN", en: "OBSERVATION & PROFESSIONAL GROWTH" },
    obs_k12: { vi: "1. Khối Phổ thông", en: "1. K-12 Observation" },
    obs_ai_growth: { vi: "2. AI Growth – Đổi mới", en: "2. AI Growth – Lesson Innovation" },
    obs_ai_growth_tag: { vi: "Mới", en: "New" },
    obs_preschool: { vi: "2. Khối Mầm non", en: "2. Preschool Observation" },
    obs_foreign: { vi: "3. Giáo viên nước ngoài", en: "3. Foreign Teacher Observation" },
    subject_orientation: { vi: "3. Sổ theo dõi Hướng nghiệp", en: "3. Career Guidance Log" },
    subject_experiential: { vi: "4. Hoạt động trải nghiệm", en: "4. Experiential Activities" },
    subject_textbooks: { vi: "Học liệu - Sách giáo khoa", en: "Textbooks & Learning Resources" },
    subject_gradebook: { vi: "5. Sổ điểm/nhận xét", en: "5. Gradebook & Remarks" },
    subject_intl_gradebook: { vi: "6. Sổ điểm CTQT (Song ngữ)", en: "6. International Gradebook" },
    subject_quality: { vi: "6. Phân tích chất lượng môn học", en: "7. Subject Quality Analytics" },
    subject_assignments: { vi: "7. Phân công giảng dạy", en: "8. Teaching Assignments" },
    subject_tutoring: { vi: "8. Phụ đạo, bồi dưỡng Học sinh", en: "9. Academic Support & Tutoring" },
    subject_timetable: { vi: "9. Thời khóa biểu", en: "10. Timetable & Schedule" },
  },
  parentNav: {
    overview: { vi: "Tổng quan", en: "Overview" },
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
