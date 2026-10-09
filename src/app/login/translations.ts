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
      button: "Khám phá phân hệ SQMS",
      modules: [
        { index: "01", title: "Khảo sát năng lực đầu vào", description: "Tổ chức khảo sát, nhập kết quả, phân tích năng lực, hỗ trợ tuyển sinh và xếp lớp." },
        { index: "02", title: "Quản lý dự giờ giáo viên", description: "Đăng ký tiết dạy, phân công dự giờ, đánh giá, phê duyệt và theo dõi năng lực chuyên môn." },
        { index: "03", title: "Thành tích và kỳ thi học sinh", description: "Quản lý kỳ thi, cuộc thi, giải thưởng, huy chương, xếp hạng và lịch sử thành tích." },
        { index: "04", title: "Hỗ trợ học tập và tâm lý", description: "Theo dõi học sinh cần hỗ trợ, kế hoạch phụ đạo, cam kết học tập và tư vấn tâm lý." },
        { index: "05", title: "Hướng nghiệp & tài chính", description: "Quản lý hoạt động hướng nghiệp, định hướng nghề nghiệp và thông tin tài chính theo phân quyền." },
        { index: "06", title: "Kết quả học tập & dự án", description: "Tổng hợp kết quả môn học, hoạt động trải nghiệm, câu lạc bộ và mức độ tham gia." }
      ]
    },
    footerVersion: "SQMS Portal v2.5",
    brandTagline: "Sky-Line Education System"
  },
  en: {
    pageTitle: "Sign In",
    roles: {
      STAFF: "Faculty & Staff",
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
      button: "Explore SQMS Modules",
      modules: [
        { index: "01", title: "Input Competency Assessment", description: "Administer entrance tests, record scores, assess competencies, and support admission placement." },
        { index: "02", title: "Teacher Observation & Walkthroughs", description: "Schedule observation slots, assign observers, evaluate rubrics, approve, and track pedagogical growth." },
        { index: "03", title: "Student Competitions & Honors", description: "Manage academic competitions, honors, awards, medals, leaderboards, and historical achievements." },
        { index: "04", title: "Academic Support & Counseling", description: "Track students needing support, remedial tutoring plans, academic contracts, and psychological advisory." },
        { index: "05", title: "Career Guidance & Finance", description: "Manage career guidance programs, future vocational orientation, and role-based financial views." },
        { index: "06", title: "Academic Performance & Projects", description: "Synthesize course grades, experiential learning activities, student clubs, and participation rates." }
      ]
    },
    footerVersion: "SQMS Portal v2.5",
    brandTagline: "Sky-Line Education System"
  }
};
