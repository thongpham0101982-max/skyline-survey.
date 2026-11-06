export type LoginLang = "vi" | "en";

export const LOGIN_TRANSLATIONS = {
  vi: {
    pageTitle: "Đăng nhập",
    roles: {
      STAFF: "CBGV",
      PARENT: "Phụ huynh",
      STUDENT: "Học sinh"
    },
    accountPlaceholders: {
      STAFF: "Email hoặc Tên đăng nhập",
      PARENT: "Mã phụ huynh / Số điện thoại",
      STUDENT: "Mã số học sinh"
    },
    passwordPlaceholder: "Mật khẩu",
    hidePassword: "Ẩn mật khẩu",
    showPassword: "Hiện mật khẩu",
    defaultStudentPasswordNote: "* Mật khẩu mặc định là mã học sinh",
    rememberMe: "Ghi nhớ đăng nhập",
    forgotPassword: "Quên mật khẩu?",
    submitBtn: "Đăng nhập",
    submittingBtn: "Đang đăng nhập...",
    modalTitle: "Đang đăng nhập",
    stepAuthenticating: "Đang xác thực tài khoản...",
    stepAuthenticatingStudent: "Đang xác thực thông tin học sinh...",
    stepProcessingStudent: "Bắt đầu xử lý đăng nhập Học sinh...",
    stepSuccess: "Đăng nhập thành công! Đang chuyển trang...",
    errors: {
      emptyIdentifier: "Vui lòng nhập tài khoản.",
      emptyPassword: "Vui lòng nhập mật khẩu.",
      invalidStudent: "Thông tin mã học sinh không hợp lệ.",
      lockedAccount: "Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động.",
      dbError: "Lỗi kết nối cơ sở dữ liệu hệ thống. Đang kết nối lại...",
      invalidCredentials: "Sai tên đăng nhập hoặc mật khẩu.",
      connectionError: "Sai tên đăng nhập hoặc mật khẩu, hoặc lỗi kết nối. Vui lòng kiểm tra lại."
    },
    forgotModal: {
      title: "Quên Mật Khẩu",
      subtitle: "Nhập Email hoặc Mã cán bộ / Mã phụ huynh để nhận liên kết đặt lại mật khẩu qua email.",
      placeholder: "Nhập Email hoặc Mã cán bộ / Mã phụ huynh",
      emptyIdentifier: "Vui lòng nhập Email hoặc Mã tài khoản.",
      cancel: "Hủy",
      submit: "Gửi liên kết khôi phục",
      sending: "Đang gửi...",
      errorFailed: "Gửi yêu cầu thất bại. Vui lòng thử lại.",
      errorServer: "Lỗi kết nối máy chủ. Vui lòng thử lại sau.",
      understood: "Đã hiểu & Đóng"
    },
    featureDrawer: {
      button: "Khám phá 12 phân hệ SSM / SQMS",
      modules: [
        { index: "01", title: "Khảo thí Số & Đảm bảo Chất lượng", description: "Khảo thí số OMR & LMS, sổ điểm MOET (TT27/TT22) & CTQT, chứng chỉ quốc tế (IELTS, Cambridge, Edexcel) và phân tích phổ điểm." },
        { index: "02", title: "Hồ sơ Học sinh 360° & Tra cứu", description: "Học bạ điện tử tích lũy xuyên suốt K-12, Bản đồ năng lực Radar 360°, bảng vàng thành tích và xuất in PDF chuẩn A4." },
        { index: "03", title: "Cố vấn Học tập, Tâm lý & SGSI", description: "Sổ mục tiêu SMART, phân tích khoảng cách mục tiêu (GAP), chỉ số phát triển SGSI, cảnh báo sớm 3 màu và phụ đạo/bồi dưỡng." },
        { index: "04", title: "Dự giờ & Phát triển Chuyên môn", description: "Quản lý dự giờ K-12, Mầm non, Giáo viên nước ngoài (Song ngữ), ma trận dự giờ TTCM và trợ lý AI Growth đổi mới tiết dạy." },
        { index: "05", title: "Môn học Đặc thù Sky-Line", description: "Quản lý chương trình và đánh giá chuyên biệt 4 môn: GD Cảm xúc (CXXH), GD Giới tính, GD Tài chính và GD Hướng nghiệp." },
        { index: "06", title: "Hoạt động Trải nghiệm & Dự án", description: "Triển khai và đánh giá hoạt động trải nghiệm theo 4 mạch GDPT 2018, chủ đề tháng và kết xuất sổ sự kiện PDF." },
        { index: "07", title: "Khảo sát Đầu vào & Tuyển sinh", description: "Tổ chức khảo sát đầu vào Phổ thông K-12 & Mầm non, đánh giá 5 lĩnh vực phát triển, xét duyệt AI và gửi kết quả tự động." },
        { index: "08", title: "Quản lý Đào tạo & Thời khóa biểu", description: "Quản lý lớp học, phân công giảng dạy, xếp Thời khóa biểu Kéo & Thả thông minh, theo dõi sỹ số tháng và học sinh lưu chuyển." },
        { index: "09", title: "In bảng tên Họp PHHS & QR", description: "Tiện ích thiết kế và in bảng tên học sinh gập chữ A phục vụ Họp Phụ huynh kèm mã QR định danh bảo mật." },
        { index: "10", title: "Mạng lưới Cựu học sinh (Alumni)", description: "Kế thừa hồ sơ tốt nghiệp, cấp mã QR định danh bảo mật, cổng tự cập nhật OTP và theo dõi hành trình Đại học & Sự nghiệp." },
        { index: "11", title: "Khảo sát Định kỳ & Đo lường NPS", description: "Khảo sát đa chiều Phụ huynh – Học sinh – Giáo viên, phân tích chỉ số hài lòng NPS và theo dõi xử lý phản hồi 2 chiều." },
        { index: "12", title: "Điều hành Công việc, AI & PWA", description: "Giao việc Kanban/Timeline, báo cáo tuần, Sổ giáo viên tự động gom việc, trợ lý SSM AI (RAG) và ứng dụng di động PWA." }
      ]
    },
    footerVersion: "SQMS Portal v2.5",
    brandTagline: "Sky-Line Education System"
  },
  en: {
    pageTitle: "Sign In",
    roles: {
      STAFF: "Staff",
      PARENT: "Parent",
      STUDENT: "Student"
    },
    accountPlaceholders: {
      STAFF: "Email or Username",
      PARENT: "Parent Code / Phone number",
      STUDENT: "Student ID Number"
    },
    passwordPlaceholder: "Password",
    hidePassword: "Hide password",
    showPassword: "Show password",
    defaultStudentPasswordNote: "* Default password is the student ID",
    rememberMe: "Remember me",
    forgotPassword: "Forgot password?",
    submitBtn: "Sign In",
    submittingBtn: "Signing in...",
    modalTitle: "Signing In",
    stepAuthenticating: "Authenticating account credentials...",
    stepAuthenticatingStudent: "Verifying student credentials...",
    stepProcessingStudent: "Processing student login...",
    stepSuccess: "Sign in successful! Redirecting...",
    errors: {
      emptyIdentifier: "Please enter your account / email.",
      emptyPassword: "Please enter your password.",
      invalidStudent: "Invalid student ID or credentials.",
      lockedAccount: "Your account has been locked or suspended.",
      dbError: "System database connection error. Reconnecting...",
      invalidCredentials: "Incorrect username or password.",
      connectionError: "Incorrect username/password or connection issue. Please check again."
    },
    forgotModal: {
      title: "Forgot Password",
      subtitle: "Enter your Email or Staff / Parent Code to receive a password reset link via email.",
      placeholder: "Enter Email or Staff / Parent Code",
      emptyIdentifier: "Please enter your Email or Account Code.",
      cancel: "Cancel",
      submit: "Send Reset Link",
      sending: "Sending...",
      errorFailed: "Request failed. Please try again.",
      errorServer: "Server connection error. Please try again later.",
      understood: "Got it & Close"
    },
    featureDrawer: {
      button: "Explore 12 SSM / SQMS Modules",
      modules: [
        { index: "01", title: "Digital Testing & Quality Assurance", description: "OMR & LMS digital testing, MOET & International gradebooks, global certificates (IELTS, Cambridge, Edexcel), and analytics." },
        { index: "02", title: "Student 360° Portfolio & Lookup", description: "Cumulative K-12 e-Portfolio, 360° Competency Radar charts, honor rolls, and international-standard A4 PDF publishing." },
        { index: "03", title: "Academic Advisory, Counseling & SGSI", description: "SMART goals, deterministic GAP analysis, SGSI sustainability index, 3-tier early warning, and tutoring/gifted support." },
        { index: "04", title: "Classroom Observation & AI Growth", description: "K-12, Preschool, and Foreign Teacher bilingual observations, HOD matrix, and AI Growth pedagogical coaching." },
        { index: "05", title: "Sky-Line Special Subjects", description: "Curriculum & assessment for Emotion Education (SEL), Sex Education, Financial Literacy, and Career Guidance." },
        { index: "06", title: "Experiential Learning & Projects", description: "Manage experiential activities across 4 core streams, monthly themes, student participation, and PDF event books." },
        { index: "07", title: "Entrance Assessment & Admissions", description: "K-12 & Preschool diagnostic assessments, 5-domain child development tracking, AI admission review, and automated emails." },
        { index: "08", title: "Academic Management & Timetable", description: "Class & teacher management, intelligent Drag & Drop Timetable solver, monthly enrollment, and student transfers." },
        { index: "09", title: "Parent Meeting QR Nameplates", description: "Instant A4 Parent Meeting foldable nameplate designer with secure dynamic QR code verification." },
        { index: "10", title: "Sky-Line Alumni Network", description: "Graduation profile inheritance, secure QR tokens, OTP self-service portal, and global university & career tracking." },
        { index: "11", title: "Periodic Surveys & NPS Analytics", description: "Multi-stakeholder surveys for Parents, Students, and Staff with real-time Net Promoter Score (NPS) and feedback tracking." },
        { index: "12", title: "Task Operations, SSM AI & PWA", description: "Kanban/Timeline task management, weekly reports, unified teacher task engine, RAG AI Assistant, and Mobile PWA." }
      ]
    },
    footerVersion: "SQMS Portal v2.5",
    brandTagline: "Sky-Line Education System"
  }
};
