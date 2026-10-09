export type SupportedLang = "en" | "vi";

export interface Translations {
  // Common & Header
  moduleBadge: string;
  officialWalkthroughBadge: string;
  moduleTitle: string;
  moduleSubtitle: string;
  langEn: string;
  langVi: string;
  
  // Navigation Tabs
  tabWalkthrough: string;
  tabHistory: string;
  tabQuota: string;

  // Form Header & Metadata
  formCardTitle: string;
  formCardSubtitle: string;
  formCardBadge: string;

  // Form Fields
  observedFacultyLabel: string;
  allFacultiesOption: string;
  primaryFacultyOption: string;
  secondaryFacultyOption: string;
  expatFacultyOption: string;
  earlyYearsFacultyOption: string;

  observedTeacherLabel: string;
  selectTeacherPlaceholder: string;
  observerLabel: string;
  subjectLabel: string;
  subjectPlaceholder: string;
  classLabel: string;
  selectCampusFirst: string;
  selectClassPlaceholder: string;
  dateLabel: string;
  topicLabel: string;
  topicPlaceholder: string;
  studentsCountLabel: string;
  studentsCountPlaceholder: string;
  durationLabel: string;
  durationPlaceholder: string;
  campusLabel: string;
  selectCampusPlaceholder: string;
  periodRoomLabel: string;
  roomPlaceholder: string;

  // Target Skills
  targetSkillsTitle: string;

  // Approach & Rating Scale Banner
  approachTitle: string;
  approachQuote: string;
  ratingScaleTitle: string;

  // Indicator Sections
  indicatorsCountSuffix: string;
  evidenceLabel: string;
  evidencePlaceholder: string;
  evidenceQuickHint: string;
  impactLabel: string;
  impactPlaceholder: string;
  impactQuickHint: string;

  // Teacher Voice (Post-Lesson Discussion)
  teacherVoiceTitle: string;
  teacherVoiceSubtitle: string;
  tvQ1: string;
  tvQ1Placeholder: string;
  tvQ2: string;
  tvQ2Placeholder: string;
  tvQ3: string;
  tvQ3Placeholder: string;
  tvQ4: string;
  tvQ4Placeholder: string;

  // Summary & Action Plan
  summaryTitle: string;
  summarySubtitle: string;
  autoSummaryBtn: string;
  keyStrengthsLabel: string;
  keyStrengthsPlaceholder: string;
  keyChallengesLabel: string;
  keyChallengesPlaceholder: string;
  agreedActionsLabel: string;
  agreedActionsPlaceholder: string;

  // Sticky Action Bar
  overallRatingLabel: string;
  scoreLabel: string;
  saveDraftBtn: string;
  submitBtn: string;
  submittingText: string;

  // History Tab
  historyBannerBadge: string;
  historyBannerSubBadge: string;
  historyTitle: string;
  historySubtitle: string;
  exportExcelBtn: string;
  newObservationBtn: string;

  // KPI Cards
  kpiTotalTitle: string;
  kpiTotalUnit: string;
  kpiAvgScoreLabel: string;
  kpiStrongTitle: string;
  kpiStrongUnit: string;
  kpiStrongDesc: string;
  kpiEffectiveTitle: string;
  kpiEffectiveUnit: string;
  kpiEffectiveDesc: string;
  kpiSupportTitle: string;
  kpiSupportUnit: string;
  kpiSupportDesc: string;

  // Filter Toolbar
  searchPlaceholder: string;
  allAcademicYears: string;
  allCampuses: string;
  allRatings: string;
  allSemesters: string;
  allMonths: string;
  clearFiltersBtn: string;
  filterResultsCount: string;

  // Records Table
  colNo: string;
  colDatePeriod: string;
  colCampusClass: string;
  colHostTeacher: string;
  colObserver: string;
  colTopic: string;
  colRatingScore: string;
  colActions: string;
  viewDetailsBtn: string;
  printBtn: string;
  emptyRecordsTitle: string;
  emptyRecordsDesc: string;

  // Detail Modal
  modalBadge: string;
  modalTitle: string;
  modalApproachTitle: string;
  modalApproachQuote: string;
  modalHeaderInfoTitle: string;
  modalTeacher: string;
  modalObserver: string;
  modalSubject: string;
  modalClass: string;
  modalDate: string;
  modalLessonTopic: string;
  modalStudents: string;
  modalDuration: string;
  modalCampus: string;
  modalPeriod: string;
  modalRoom: string;
  modalOverallRating: string;
  modalPrintTooltip: string;
  modalCloseTooltip: string;
  notAssigned: string;

  // Quota & KPI Tab
  quotaTitle: string;
  quotaSubtitle: string;
  hostTeacherQuotaTitle: string;
  hostTeacherQuotaUnit: string;
  targetUnit: string;
  hostTeacherQuotaDesc: string;
  observerQuotaTitle: string;
  observerQuotaUnit: string;
  observerQuotaDesc: string;

  // Toasts & Alerts
  toastSaveDraftSuccess: string;
  toastSubmitSuccess: string;
  toastSaveError: string;
  validationSelectTeacher: string;
  validationSelectCampus: string;
}

export const TRANSLATIONS: Record<SupportedLang, Translations> = {
  en: {
    // Common & Header
    moduleBadge: "CAMBRIDGE & INTERNATIONAL FRAMEWORK • SY2026-2027",
    officialWalkthroughBadge: "Instructional Walkthrough",
    moduleTitle: "Classroom Observation & Instructional Support",
    moduleSubtitle: "International teaching standards & continuous instructional coaching framework across all English faculties (Early Years, Primary, Secondary & International Faculty).",
    langEn: "English",
    langVi: "Tiếng Việt",

    // Navigation Tabs
    tabWalkthrough: "Walkthrough Form",
    tabHistory: "Observation Records",
    tabQuota: "Quotas & Annual KPI",

    // Form Header & Metadata
    formCardTitle: "CLASSROOM OBSERVATION & INSTRUCTIONAL COACHING FORM",
    formCardSubtitle: "Purpose: To understand instructional effectiveness, student progress, curriculum implementation, and targeted teacher support.",
    formCardBadge: "SY2026-2027 • Official Template",

    // Form Fields
    observedFacultyLabel: "English Faculty / Department",
    allFacultiesOption: "-- All English Faculties (%s Teachers) --",
    primaryFacultyOption: "Primary English Faculty",
    secondaryFacultyOption: "Secondary English Faculty",
    expatFacultyOption: "International Curriculum & Expat Faculty",
    earlyYearsFacultyOption: "Early Years / Kindergarten English Faculty",

    observedTeacherLabel: "Observed Host Teacher",
    selectTeacherPlaceholder: "-- Select Host Teacher (%s Available) * --",
    observerLabel: "Observer / Instructional Coach",
    subjectLabel: "Subject / Programme",
    subjectPlaceholder: "e.g. English (ESL), Phonics, ELA, Cambridge English",
    classLabel: "Class / Grade Level",
    selectCampusFirst: "-- Please select Campus first --",
    selectClassPlaceholder: "-- Select Class (%s Classes) --",
    dateLabel: "Date of Observation",
    topicLabel: "Lesson / Unit / Topic",
    topicPlaceholder: "e.g. Unit 4: Healthy Habits - Communicative Speaking",
    studentsCountLabel: "Class Size / Attendance",
    studentsCountPlaceholder: "e.g. 24 students",
    durationLabel: "Lesson Duration",
    durationPlaceholder: "e.g. 40 minutes / 45 mins",
    campusLabel: "Campus",
    selectCampusPlaceholder: "-- Select Campus * --",
    periodRoomLabel: "Period & Classroom",
    roomPlaceholder: "Classroom / Room",

    // Target Skills
    targetSkillsTitle: "Target Skills & Instructional Focus",

    // Approach & Rating Scale Banner
    approachTitle: "Observation Approach & Guiding Principle",
    approachQuote: "Focus on observable evidence and measurable impact on student learning.",
    ratingScaleTitle: "Instructional Rating Scale (4-Level Cambridge Standard):",

    // Indicator Sections
    indicatorsCountSuffix: "Indicators",
    evidenceLabel: "Observable Evidence & Teacher Actions",
    evidencePlaceholder: "Describe specific teacher actions, instructional staging, pacing, and learning activities observed...",
    evidenceQuickHint: "Quick-insert evidence tags:",
    impactLabel: "Student Impact & Learning Outcomes",
    impactPlaceholder: "Describe how students responded, produced target language, collaborated, or demonstrated understanding...",
    impactQuickHint: "Quick-insert student impact tags:",

    // Teacher Voice
    teacherVoiceTitle: "Post-Observation Reflection & Teacher Voice",
    teacherVoiceSubtitle: "Collaborative post-lesson debrief between the Observer and the Host Teacher",
    tvQ1: "1. Did the lesson unfold as planned? What instructional strategies worked well?",
    tvQ1Placeholder: "e.g. Students showed high engagement during guided speaking practice; transitions were seamless...",
    tvQ2: "2. What learning challenges or obstacles did you or the students encounter?",
    tvQ2Placeholder: "e.g. A small group struggled with sentence production; pacing in the free production stage was tight...",
    tvQ3: "3. Is the curriculum pacing realistic and appropriate for this cohort?",
    tvQ3Placeholder: "e.g. Pacing is realistic; suggest an extra consolidation session prior to the unit review...",
    tvQ4: "4. What instructional resources or coaching support would be beneficial?",
    tvQ4Placeholder: "e.g. Leveled reading materials; co-teaching strategies for lower-band learners...",

    // Summary & Action Plan
    summaryTitle: "Observation Summary & Action Plan",
    summarySubtitle: "Agreed professional outcomes and actionable support commitments",
    autoSummaryBtn: "Auto-Generate Summary",
    keyStrengthsLabel: "Key Strengths & Effective Pedagogical Practices",
    keyStrengthsPlaceholder: "Highlight exemplary teacher delivery, positive rapport, student engagement...",
    keyChallengesLabel: "Key Instructional & Learning Challenges",
    keyChallengesPlaceholder: "Identify focus areas, misconceptions, or student support opportunities...",
    agreedActionsLabel: "Agreed Follow-up Actions & Coaching Next Steps",
    agreedActionsPlaceholder: "1. Specific action item 1\n2. Specific action item 2\n3. Follow-up coaching timeline...",

    // Sticky Action Bar
    overallRatingLabel: "Overall Rating:",
    scoreLabel: "Average Score:",
    saveDraftBtn: "Save Draft",
    submitBtn: "Complete & Submit Observation",
    submittingText: "Submitting...",

    // History Tab
    historyBannerBadge: "Instructional Walkthrough",
    historyBannerSubBadge: "Official Evaluation Archive",
    historyTitle: "ESL & International Observation Records",
    historySubtitle: "Comprehensive database of instructional walkthrough records, rubric evaluations, and coaching feedback aligned with Cambridge standards.",
    exportExcelBtn: "Export to Excel (.xlsx)",
    newObservationBtn: "+ New Walkthrough Form",

    // KPI Cards
    kpiTotalTitle: "Total Walkthroughs",
    kpiTotalUnit: "evaluations",
    kpiAvgScoreLabel: "System Average:",
    kpiStrongTitle: "Strong Practice",
    kpiStrongUnit: "exemplary lessons",
    kpiStrongDesc: "Level 4: Exemplary practice, model for peer sharing.",
    kpiEffectiveTitle: "Effective Practice",
    kpiEffectiveUnit: "proficient lessons",
    kpiEffectiveDesc: "Level 3: Meets expected international standards.",
    kpiSupportTitle: "Developing & Support",
    kpiSupportUnit: "(Dev / Needs Support)",
    kpiSupportDesc: "Levels 2 & 1: Targeted instructional coaching needed.",

    // Filter Toolbar
    searchPlaceholder: "Search by teacher, topic, class, or room...",
    allAcademicYears: "All Academic Years",
    allCampuses: "All Campuses",
    allRatings: "All Rating Bands",
    allSemesters: "All Semesters",
    allMonths: "All Months",
    clearFiltersBtn: "Clear Filters",
    filterResultsCount: "Showing %s observation records",

    // Records Table
    colNo: "#",
    colDatePeriod: "Date & Period",
    colCampusClass: "Campus & Class",
    colHostTeacher: "Host Teacher",
    colObserver: "Observer",
    colTopic: "Lesson / Topic",
    colRatingScore: "Rating & Score",
    colActions: "Actions",
    viewDetailsBtn: "View Details",
    printBtn: "Print Form",
    emptyRecordsTitle: "No Observation Records Found",
    emptyRecordsDesc: "No observation walkthroughs match the selected filter criteria.",

    // Detail Modal
    modalBadge: "Official Instructional Walkthrough",
    modalTitle: "CLASSROOM OBSERVATION & INSTRUCTIONAL COACHING RECORD",
    modalApproachTitle: "Observation Approach & Guiding Principle",
    modalApproachQuote: "Focus on observable evidence and measurable impact on student learning.",
    modalHeaderInfoTitle: "Observation Header Information",
    modalTeacher: "Host Teacher",
    modalObserver: "Observer / Coach",
    modalSubject: "Subject / Programme",
    modalClass: "Class / Grade",
    modalDate: "Date Observed",
    modalLessonTopic: "Lesson / Topic",
    modalStudents: "Class Size",
    modalDuration: "Duration",
    modalCampus: "Campus",
    modalPeriod: "Teaching Period",
    modalRoom: "Classroom",
    modalOverallRating: "Overall Rating",
    modalPrintTooltip: "Print this record",
    modalCloseTooltip: "Close modal",
    notAssigned: "Not assigned",

    // Quota & KPI Tab
    quotaTitle: "Annual Observation Quotas & Progress",
    quotaSubtitle: "Track your required instructional hours as Host Teacher and Observer in accordance with academic year standards.",
    hostTeacherQuotaTitle: "Host Teaching (Observed)",
    hostTeacherQuotaUnit: "ESL lessons",
    targetUnit: "target lessons",
    hostTeacherQuotaDesc: "Aggregated across all faculties: Early Years, K-12, and International Curriculum.",
    observerQuotaTitle: "Instructional Observation (Observer)",
    observerQuotaUnit: "completed walkthroughs",
    observerQuotaDesc: "Official evaluations submitted and published to host teachers.",

    // Toasts & Alerts
    toastSaveDraftSuccess: "Draft observation record saved successfully!",
    toastSubmitSuccess: "Observation walkthrough submitted and published successfully!",
    toastSaveError: "Unable to save observation record. Please try again.",
    validationSelectTeacher: "Please select an observed Host Teacher before submitting.",
    validationSelectCampus: "Please select a Campus before submitting."
  },

  vi: {
    // Common & Header
    moduleBadge: "KHUNG CHUẨN CAMBRIDGE & QUỐC TẾ • SY2026-2027",
    officialWalkthroughBadge: "Dự giờ Chuyên môn Chính thức",
    moduleTitle: "Quan sát Lớp học & Hỗ trợ Giảng dạy",
    moduleSubtitle: "Khung Quan sát Lớp học & Hỗ trợ Giảng dạy Chuyên môn Tổ Tiếng Anh (Mầm non, Tiểu học, Trung học, Quốc tế & GVNN) theo chuẩn Cambridge và Hệ thống Giáo dục Sky-Line.",
    langEn: "English",
    langVi: "Tiếng Việt",

    // Navigation Tabs
    tabWalkthrough: "Walkthrough Form",
    tabHistory: "Lược sử phiếu",
    tabQuota: "Chỉ tiêu & KPI",

    // Form Header & Metadata
    formCardTitle: "PHIẾU DỰ GIỜ & HỖ TRỢ GIẢNG DẠY CHUYÊN MÔN",
    formCardSubtitle: "Mục đích: Nắm bắt hiệu quả giảng dạy, sự tiến bộ của học sinh, việc thực hiện chương trình và hỗ trợ chuyên môn cần thiết.",
    formCardBadge: "SY2026-2027 • Biểu Mẫu Chuẩn",

    // Form Fields
    observedFacultyLabel: "Tổ Chuyên Môn Tiếng Anh",
    allFacultiesOption: "-- Tất cả Tổ Tiếng Anh (%s Giáo viên) --",
    primaryFacultyOption: "Tổ Tiếng Anh Tiểu học",
    secondaryFacultyOption: "Tổ Tiếng Anh Trung học",
    expatFacultyOption: "Tổ Tiếng Anh Quốc tế & GVNN",
    earlyYearsFacultyOption: "Tổ Tiếng Anh Mầm non",

    observedTeacherLabel: "Giáo viên được dự (Host Teacher)",
    selectTeacherPlaceholder: "-- Chọn Giáo Viên (%s GV) * --",
    observerLabel: "Người dự giờ (Observer)",
    subjectLabel: "Môn học / Chương trình",
    subjectPlaceholder: "Ví dụ: Tiếng Anh (ESL), Phonics, ELA, Cambridge English",
    classLabel: "Lớp / Khối học",
    selectCampusFirst: "-- Vui lòng chọn Cơ sở trước --",
    selectClassPlaceholder: "-- Chọn Lớp (%s lớp) --",
    dateLabel: "Ngày dự giờ",
    topicLabel: "Chủ đề / Bài dạy (Lesson / Topic)",
    topicPlaceholder: "Ví dụ: Unit 4: Food - Speaking Practice",
    studentsCountLabel: "Sĩ số học sinh",
    studentsCountPlaceholder: "Ví dụ: 24 học sinh",
    durationLabel: "Thời lượng tiết dạy",
    durationPlaceholder: "Ví dụ: 40 phút / 45 phút",
    campusLabel: "Cơ sở",
    selectCampusPlaceholder: "-- Chọn Cơ Sở * --",
    periodRoomLabel: "Tiết dạy & Phòng học",
    roomPlaceholder: "Phòng học",

    // Target Skills
    targetSkillsTitle: "Kỹ năng trọng tâm & Định hướng ngôn ngữ",

    // Approach & Rating Scale Banner
    approachTitle: "Phương pháp tiếp cận dự giờ",
    approachQuote: "Tập trung vào minh chứng thực tế và tác động đến sự tiến bộ của học sinh.",
    ratingScaleTitle: "Thang đánh giá 5 mức theo chuẩn:",

    // Indicator Sections
    indicatorsCountSuffix: "Tiêu chí",
    evidenceLabel: "Minh chứng ghi nhận & Hành động của GV",
    evidencePlaceholder: "Mô tả cụ thể hoạt động của giáo viên, tiến trình bài dạy, nhịp độ và phương pháp...",
    evidenceQuickHint: "Gợi ý chèn nhanh minh chứng:",
    impactLabel: "Tác động lên học sinh & Kết quả học tập",
    impactPlaceholder: "Mô tả phản ứng của học sinh, mức độ sử dụng ngôn ngữ mục tiêu, sự tự tin và hợp tác...",
    impactQuickHint: "Gợi ý chèn nhanh tác động:",

    // Teacher Voice
    teacherVoiceTitle: "Ý kiến giáo viên & Thảo luận sau tiết dạy",
    teacherVoiceSubtitle: "Buổi trao đổi chuyên môn mang tính hỗ trợ và phát triển giữa Người dự và Giáo viên đứng lớp",
    tvQ1: "1. Tiết dạy có diễn ra đúng kế hoạch không? Điểm nào đã thực hiện tốt?",
    tvQ1Placeholder: "Ví dụ: Học sinh tham gia hào hứng trong các trò chơi luyện nói; bài dạy đi đúng các bước...",
    tvQ2: "2. Giáo viên hoặc học sinh đã gặp phải những khó khăn/thách thức nào?",
    tvQ2Placeholder: "Ví dụ: Một nhóm nhỏ học sinh chưa nắm chắc cấu trúc ngữ pháp; thời gian luyện tập tự do hơi gấp...",
    tvQ3: "3. Tiến độ chương trình có phù hợp và thực tế với học sinh lớp này không?",
    tvQ3Placeholder: "Ví dụ: Tiến độ phù hợp; đề xuất thêm thời gian ôn tập củng cố trước bài kiểm tra định kỳ...",
    tvQ4: "4. Giáo viên cần hỗ trợ thêm nguồn lực, tài liệu hoặc hỗ trợ chuyên môn nào?",
    tvQ4Placeholder: "Ví dụ: Bổ sung bộ thẻ từ vựng; hướng dẫn thêm kỹ năng quản lý lớp cho giáo viên trợ giảng...",

    // Summary & Action Plan
    summaryTitle: "Tổng kết buổi dự & Kế hoạch hành động",
    summarySubtitle: "Cam kết hỗ trợ và các giải pháp sư phạm đã thống nhất giữa hai bên",
    autoSummaryBtn: "Tự động tạo tóm tắt",
    keyStrengthsLabel: "Điểm mạnh nổi bật trong giảng dạy",
    keyStrengthsPlaceholder: "Ghi nhận các điểm sáng về phương pháp, phong thái sư phạm, tương tác học sinh...",
    keyChallengesLabel: "Thách thức trọng tâm cần cải thiện",
    keyChallengesPlaceholder: "Ghi nhận các nội dung cần lưu ý hoặc khắc phục trong các tiết tiếp theo...",
    agreedActionsLabel: "Kế hoạch hành động & Hỗ trợ chuyên môn thống nhất",
    agreedActionsPlaceholder: "1. Kế hoạch hành động 1\n2. Kế hoạch hành động 2\n3. Lịch hỗ trợ tiếp theo...",

    // Sticky Action Bar
    overallRatingLabel: "Xếp loại chung:",
    scoreLabel: "Điểm trung bình:",
    saveDraftBtn: "Lưu bản nháp",
    submitBtn: "Hoàn tất & Nộp phiếu dự giờ",
    submittingText: "Đang lưu...",

    // History Tab
    historyBannerBadge: "Giáo viên nước ngoài Walkthrough",
    historyBannerSubBadge: "Hồ sơ Đánh giá Chính thức",
    historyTitle: "Lược sử Kết quả Đánh giá Tiết dạy GVNN (ESL)",
    historySubtitle: "Theo dõi, tra cứu toàn bộ biên bản Walkthrough và kết quả đánh giá giáo viên tiếng Anh & giáo viên nước ngoài theo chuẩn khung rubric quốc tế.",
    exportExcelBtn: "Xuất Excel (.xlsx)",
    newObservationBtn: "+ Tạo phiếu Walkthrough mới",

    // KPI Cards
    kpiTotalTitle: "Tổng số lượt dự",
    kpiTotalUnit: "lượt đánh giá",
    kpiAvgScoreLabel: "Điểm TB toàn bộ:",
    kpiStrongTitle: "Strong Practice",
    kpiStrongUnit: "tiết xuất sắc",
    kpiStrongDesc: "Mức 4: Thực hành xuất sắc, có thể nhân rộng chia sẻ.",
    kpiEffectiveTitle: "Effective Practice",
    kpiEffectiveUnit: "tiết đạt chuẩn",
    kpiEffectiveDesc: "Mức 3: Đạt chuẩn hiệu quả chương trình quốc tế.",
    kpiSupportTitle: "Developing & Hỗ trợ",
    kpiSupportUnit: "(Dev / Cần hỗ trợ)",
    kpiSupportDesc: "Mức 2 & Mức 1: Cần theo dõi và hỗ trợ chuyên môn trọng tâm.",

    // Filter Toolbar
    searchPlaceholder: "Tìm theo tên GV, chủ đề bài dạy, lớp, phòng học...",
    allAcademicYears: "Tất cả năm học",
    allCampuses: "Tất cả cơ sở",
    allRatings: "Tất cả xếp loại",
    allSemesters: "Tất cả học kỳ",
    allMonths: "Tất cả tháng",
    clearFiltersBtn: "Xóa bộ lọc",
    filterResultsCount: "Hiển thị %s biên bản dự giờ",

    // Records Table
    colNo: "STT",
    colDatePeriod: "Ngày & Tiết",
    colCampusClass: "Cơ sở & Lớp",
    colHostTeacher: "Giáo viên được dự (Host)",
    colObserver: "Người dự (Observer)",
    colTopic: "Chủ đề / Bài dạy",
    colRatingScore: "Xếp loại & Điểm",
    colActions: "Thao tác",
    viewDetailsBtn: "Xem chi tiết",
    printBtn: "In phiếu",
    emptyRecordsTitle: "Không tìm thấy biên bản dự giờ",
    emptyRecordsDesc: "Chưa có biên bản dự giờ nào phù hợp với các tiêu chí bộ lọc đã chọn.",

    // Detail Modal
    modalBadge: "Biên bản Walkthrough Chính thức",
    modalTitle: "PHIẾU DỰ GIỜ & HỖ TRỢ GIẢNG DẠY CHUYÊN MÔN",
    modalApproachTitle: "Phương pháp tiếp cận dự giờ",
    modalApproachQuote: "Tập trung vào minh chứng thực tế và tác động đến học sinh.",
    modalHeaderInfoTitle: "Thông tin buổi dự giờ (Observation Header Information)",
    modalTeacher: "Giáo viên được dự",
    modalObserver: "Người dự giờ",
    modalSubject: "Môn học",
    modalClass: "Lớp học",
    modalDate: "Ngày dự",
    modalLessonTopic: "Chủ đề / Bài dạy",
    modalStudents: "Sĩ số",
    modalDuration: "Thời lượng",
    modalCampus: "Cơ sở",
    modalPeriod: "Tiết dạy",
    modalRoom: "Phòng học",
    modalOverallRating: "Xếp loại chung",
    modalPrintTooltip: "In phiếu này",
    modalCloseTooltip: "Đóng hộp thoại",
    notAssigned: "Chưa gán",

    // Quota & KPI Tab
    quotaTitle: "Chỉ tiêu & Tiến độ Dự giờ Chuyên môn Tổ Tiếng Anh",
    quotaSubtitle: "Đồng bộ trực tiếp theo quy định năm học cho Tiết Giảng Dạy (Host) và Tiết Đi Dự Giờ (Observer).",
    hostTeacherQuotaTitle: "Tiết Giảng Dạy (Host Teacher)",
    hostTeacherQuotaUnit: "tiết ESL",
    targetUnit: "tiết chỉ tiêu",
    hostTeacherQuotaDesc: "Tổng hợp từ tất cả các danh mục: Mầm non, K-12, và ESL.",
    observerQuotaTitle: "Tiết Đi Dự Giờ (Observer)",
    observerQuotaUnit: "tiết đã hoàn tất",
    observerQuotaDesc: "Đã hoàn thành đánh giá và nộp phiếu nhận xét chính thức.",

    // Toasts & Alerts
    toastSaveDraftSuccess: "Đã lưu bản nháp phiếu dự giờ thành công!",
    toastSubmitSuccess: "Đã hoàn tất và nộp phiếu dự giờ thành công!",
    toastSaveError: "Không thể lưu phiếu dự giờ. Vui lòng thử lại.",
    validationSelectTeacher: "Vui lòng chọn Giáo viên được dự trước khi nộp phiếu.",
    validationSelectCampus: "Vui lòng chọn Cơ sở trước khi nộp phiếu."
  }
};
