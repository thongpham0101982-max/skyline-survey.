export const SLC_MODULE_CODE = "SKYLINE_CONNECT_ADMIN"

export const SLC_POST_TYPES = [
  { value: "IDEA", label: "Ý tưởng dạy học", badgeLabel: "Ý tưởng", color: "#D97706" },
  { value: "AI_PRODUCT", label: "Ứng dụng & Sản phẩm", badgeLabel: "Ứng dụng", color: "#00736E" },
  { value: "SKILL", label: "Skill môn học", badgeLabel: "Skill môn học", color: "#003B3A" },
  { value: "PROJECT", label: "Dự án hợp tác", badgeLabel: "Dự án", color: "#0284C7" },
  { value: "EXPERIENCE", label: "Trải nghiệm & Học liệu", badgeLabel: "Học liệu & Trải nghiệm", color: "#059669" },
  { value: "GENERAL", label: "Chia sẻ thông thường", badgeLabel: "Chia sẻ", color: "#123E4A" },
] as const

export type SlcPostType = (typeof SLC_POST_TYPES)[number]["value"]

export const SLC_VISIBILITY_OPTIONS = [
  { value: "SYSTEM", label: "Toàn hệ thống Sky-Line", desc: "Mọi cán bộ, giáo viên trên toàn hệ thống đều xem và tương tác được" },
  { value: "CAMPUS", label: "Trong cơ sở của tôi", desc: "Chỉ cán bộ, giáo viên cùng cơ sở biên chế mới xem được" },
  { value: "DEPARTMENT", label: "Trong tổ chuyên môn", desc: "Chỉ giáo viên cùng tổ bộ môn và quản lý chuyên môn được phân công mới xem được" },
  { value: "GROUP", label: "Trong nhóm chuyên môn", desc: "Chỉ thành viên của nhóm được chọn mới có quyền truy cập" },
] as const

export type SlcVisibility = (typeof SLC_VISIBILITY_OPTIONS)[number]["value"]

export const SLC_REACTIONS = [
  { value: "USEFUL", label: "Hữu ích", icon: "ThumbsUp" },
  { value: "INSPIRED", label: "Truyền cảm hứng", icon: "Sparkles" },
  { value: "LOVE", label: "Yêu thích", icon: "Heart" },
  { value: "SUPPORT", label: "Ủng hộ phát triển", icon: "Handshake" },
] as const

export type SlcReactionType = (typeof SLC_REACTIONS)[number]["value"]

export const SLC_FEEDBACK_STATUSES = [
  { value: "NONE", label: "Bình luận thường", badgeClass: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "RECEIVED", label: "Đã tiếp nhận", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "IN_PROGRESS", label: "Đưa vào phát triển", badgeClass: "bg-teal-50 text-[#00736E] border-teal-200" },
  { value: "APPLIED", label: "Đã áp dụng vào bản cập nhật", badgeClass: "bg-[#E6F6F5] text-[#003B3A] border-[#99DCD9]" },
  { value: "NOT_IMPLEMENTED", label: "Chưa triển khai", badgeClass: "bg-slate-100 text-slate-600 border-slate-300" },
] as const

export type SlcFeedbackStatus = (typeof SLC_FEEDBACK_STATUSES)[number]["value"]

export const SLC_CONTRIBUTION_TYPES = [
  {
    value: "METHOD",
    code: "A",
    label: "Một cách làm",
    shortDesc: "Gợi ý cách triển khai, tổ chức hiệu quả hơn.",
    fullDesc: "Đề xuất cách tổ chức, giải pháp hoặc cải tiến.",
    icon: "Lightbulb",
    cardBgClass: "bg-[#F0FAF8] hover:bg-[#E2F5F2] border-[#BCE6E1]",
    selectedCardClass: "bg-gradient-to-b from-[#0E8A85] to-[#005F5B] text-white border-[#003B3A] shadow-md ring-2 ring-[#00A19A]/30",
    badgeClass: "bg-[#E8F8F5] text-[#006B66] border-[#B2E5DF]",
    starterPrompts: [
      "Tôi đề xuất…",
      "Nếu thử cách này…",
      "Tôi đã áp dụng…",
    ],
  },
  {
    value: "MATERIAL",
    code: "B",
    label: "Học liệu",
    shortDesc: "Bổ sung tài liệu, câu hỏi, ngữ liệu, học liệu số,…",
    fullDesc: "Bổ sung tài liệu, câu hỏi, hình ảnh hoặc liên kết.",
    icon: "BookOpen",
    cardBgClass: "bg-[#FDF9EE] hover:bg-[#FAF2DC] border-[#EFE0B9]",
    selectedCardClass: "bg-gradient-to-b from-[#0E8A85] to-[#005F5B] text-white border-[#003B3A] shadow-md ring-2 ring-[#00A19A]/30",
    badgeClass: "bg-[#F0F7FF] text-[#1D5B9E] border-[#C4DDF8]",
    starterPrompts: [
      "Tôi có tài liệu có thể bổ sung…",
      "Bộ câu hỏi này có thể dùng cho…",
    ],
  },
  {
    value: "EXPERIMENT",
    code: "C",
    label: "Thử nghiệm",
    shortDesc: "Đề xuất thử nghiệm, điều chỉnh để phù hợp hơn.",
    fullDesc: "Đề nghị dùng thử trong lớp hoặc công việc.",
    icon: "FlaskConical",
    cardBgClass: "bg-[#EDF8FA] hover:bg-[#DDF1F6] border-[#BEE3EC]",
    selectedCardClass: "bg-gradient-to-b from-[#0E8A85] to-[#005F5B] text-white border-[#003B3A] shadow-md ring-2 ring-[#00A19A]/30",
    badgeClass: "bg-[#E9F9F6] text-[#0D7A6F] border-[#B3E8E1]",
    starterPrompts: [
      "Tôi có thể thử ở…",
      "Tôi muốn kiểm tra thêm…",
    ],
  },
  {
    value: "SKILL",
    code: "D",
    label: "Kỹ năng",
    shortDesc: "Chia sẻ kỹ năng, công cụ hỗ trợ triển khai.",
    fullDesc: "Đề xuất hỗ trợ chuyên môn, thiết kế hoặc công nghệ.",
    icon: "Wrench",
    cardBgClass: "bg-[#FCF6EC] hover:bg-[#F7ECD8] border-[#EAD5B3]",
    selectedCardClass: "bg-gradient-to-b from-[#0E8A85] to-[#005F5B] text-white border-[#003B3A] shadow-md ring-2 ring-[#00A19A]/30",
    badgeClass: "bg-[#FDF6E7] text-[#9A6715] border-[#ECD5A6]",
    starterPrompts: [
      "Tôi có thể hỗ trợ…",
      "Phần tôi có thể cùng làm là…",
    ],
  },
  {
    value: "CONNECTION",
    code: "E",
    label: "Kết nối",
    shortDesc: "Giới thiệu hoặc mời đồng nghiệp cùng tham gia.",
    fullDesc: "Giới thiệu hoặc mời đồng nghiệp phù hợp tham gia.",
    icon: "Users",
    cardBgClass: "bg-[#FDF2F2] hover:bg-[#FBE4E4] border-[#F2CACA]",
    selectedCardClass: "bg-gradient-to-b from-[#0E8A85] to-[#005F5B] text-white border-[#003B3A] shadow-md ring-2 ring-[#00A19A]/30",
    badgeClass: "bg-[#FDF1F2] text-[#A33348] border-[#F3C6CE]",
    starterPrompts: [
      "Tôi muốn giới thiệu đồng nghiệp…",
      "Có thể mời thêm…",
    ],
  },
] as const

export type SlcContributionType = (typeof SLC_CONTRIBUTION_TYPES)[number]["value"] | "NONE"

export const SLC_HELP_REQUEST_STATUSES = [
  { value: "OPEN", label: "Đang tìm", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "CONNECTED", label: "Đã kết nối", badgeClass: "bg-sky-50 text-[#1D5B9E] border-sky-200" },
  { value: "CLOSED", label: "Đã đóng", badgeClass: "bg-slate-100 text-slate-600 border-slate-300" },
] as const

export type SlcHelpRequestStatus = (typeof SLC_HELP_REQUEST_STATUSES)[number]["value"]

export const SLC_IDEA_STATUSES = [
  { value: "NEW_PROPOSED", label: "Mới đề xuất", badgeClass: "bg-amber-50 text-[#B07D22] border-amber-200" },
  { value: "SEEKING_COLLABORATORS", label: "Tìm cộng sự", badgeClass: "bg-sky-50 text-[#2878D9] border-sky-200" },
  { value: "PROJECT_OPENED", label: "Đã mở dự án", badgeClass: "bg-teal-50 text-[#159EAA] border-teal-200" },
] as const

export const SLC_PRODUCT_STATUSES = [
  { value: "TRIAL", label: "Dùng thử", badgeClass: "bg-sky-50 text-[#2878D9] border-sky-200" },
  { value: "READY", label: "Sẵn sàng", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "MAINTENANCE", label: "Đang bảo trì", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "DISCONTINUED", label: "Ngừng hỗ trợ", badgeClass: "bg-slate-100 text-slate-600 border-slate-300" },
] as const

export const SLC_PROJECT_STATUSES = [
  { value: "SEEKING_COLLABORATORS", label: "Tìm cộng sự", badgeClass: "bg-sky-50 text-[#2878D9] border-sky-200" },
  { value: "IN_PROGRESS", label: "Đang làm", badgeClass: "bg-teal-50 text-[#159EAA] border-teal-200" },
  { value: "HAS_PRODUCT", label: "Có sản phẩm", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "PAUSED", label: "Tạm dừng", badgeClass: "bg-slate-100 text-slate-600 border-slate-300" },
] as const

export const SLC_IDEA_STAR_DESCRIPTIONS: Record<number, { label: string; desc: string }> = {
  1: { label: "Cần làm rõ thêm", desc: "Ý tưởng còn sơ lược, chưa rõ vấn đề hoặc đối tượng học sinh hưởng lợi" },
  2: { label: "Có hướng gợi mở", desc: "Nêu được vấn đề thực tế nhưng cần điều chỉnh cách tiếp cận để khả thi" },
  3: { label: "Khả thi trong lớp học", desc: "Ý tưởng rõ ràng, có thể thử nghiệm trong phạm vi tiết học hoặc bộ môn" },
  4: { label: "Tiềm năng cao", desc: "Giải quyết đúng nhu cầu dạy học, dễ nhân rộng cho nhiều giáo viên" },
  5: { label: "Đột phá & Rất tiềm năng", desc: "Ý tưởng sáng tạo xuất sắc, mang lại giá trị sư phạm rõ rệt và bền vững" },
}

export const SLC_PRODUCT_STAR_DESCRIPTIONS: Record<number, { label: string; desc: string }> = {
  1: { label: "Chưa dùng được ngay", desc: "Sản phẩm gặp lỗi hoặc chưa đúng mục tiêu hỗ trợ giảng dạy" },
  2: { label: "Dùng thử cơ bản", desc: "Hoạt động được nhưng thao tác còn phức tạp hoặc cần chỉnh sửa nhiều" },
  3: { label: "Hữu dụng vừa phải", desc: "Đáp ứng đúng công dụng mô tả, hỗ trợ được một phần công việc dạy học" },
  4: { label: "Rất hữu dụng", desc: "Dễ sử dụng, tiết kiệm thời gian soạn giảng và học sinh tương tác tốt" },
  5: { label: "Đặc biệt hiệu quả", desc: "Sản phẩm hoàn thiện cao, áp dụng thực tế xuất sắc và truyền cảm hứng" },
}

export const SLC_RATING_CRITERIA_TAGS = [
  "Tiết kiệm thời gian",
  "Dễ sử dụng",
  "Hỗ trợ bài dạy",
  "Thu hút HS",
  "Cần cải tiến",
] as const

export const SLC_DEFAULT_SUBJECTS = [
  { code: "TOAN", name: "Toán", category: "MOET" },
  { code: "NGU_VAN", name: "Ngữ văn / Tiếng Việt", category: "MOET" },
  { code: "TIENG_ANH", name: "Tiếng Anh", category: "MOET" },
  { code: "KHTN", name: "Khoa học tự nhiên", category: "MOET" },
  { code: "VAT_LI", name: "Vật lí", category: "MOET" },
  { code: "HOA_HOC", name: "Hóa học", category: "MOET" },
  { code: "SINH_HOC", name: "Sinh học", category: "MOET" },
  { code: "LICH_SU_DIA_LI", name: "Lịch sử & Địa lí", category: "MOET" },
  { code: "TIN_HOC", name: "Tin học & AI", category: "MOET" },
  { code: "NGHE_THUAT", name: "Nghệ thuật / Âm nhạc / Mỹ thuật", category: "MOET" },
  { code: "HDTN", name: "Hoạt động trải nghiệm & Kỹ năng", category: "MOET" },
  { code: "CXXH", name: "Giáo dục Cảm xúc Xã hội (SEL - Đặc thù Sky-Line)", category: "SKL" },
  { code: "FIN_EDU", name: "Giáo dục Tài chính (Đặc thù Sky-Line)", category: "SKL" },
  { code: "GDHN", name: "Giáo dục Hướng nghiệp (Đặc thù Sky-Line)", category: "SKL" },
  { code: "GDGT", name: "Giáo dục Giới tính & Sức khỏe (Đặc thù Sky-Line)", category: "SKL" },
  { code: "STEM_ROBOTICS", name: "STEM & Robotics (Đặc thù Sky-Line)", category: "SKL" },
  { code: "CTQT_CAMBRIDGE", name: "Chương trình Quốc tế (Cambridge / Global)", category: "INTERNATIONAL" },
  { code: "MAM_NON", name: "Phát triển Mầm non", category: "MOET" },
  { code: "CHU_NHIEM", name: "Công tác chủ nhiệm & Tư vấn", category: "SKL" },
] as const

export const SLC_DEFAULT_GRADES = [
  { code: "MAM_NON", name: "Mầm non" },
  { code: "TIEU_HOC", name: "Tiểu học (Khối 1–5)" },
  { code: "THCS", name: "THCS (Khối 6–9)" },
  { code: "THPT", name: "THPT (Khối 10–12)" },
  { code: "K1", name: "Khối 1" },
  { code: "K2", name: "Khối 2" },
  { code: "K3", name: "Khối 3" },
  { code: "K4", name: "Khối 4" },
  { code: "K5", name: "Khối 5" },
  { code: "K6", name: "Khối 6" },
  { code: "K7", name: "Khối 7" },
  { code: "K8", name: "Khối 8" },
  { code: "K9", name: "Khối 9" },
  { code: "K10", name: "Khối 10" },
  { code: "K11", name: "Khối 11" },
  { code: "K12", name: "Khối 12" },
] as const

export const SLC_DEFAULT_PURPOSES = [
  { code: "SOAN_GIANG", name: "Thiết kế bài giảng & Câu hỏi" },
  { code: "ON_TAP_TRO_CHOI", name: "Trò chơi học tập & Ôn tập" },
  { code: "DANH_GIA_PHAN_HOI", name: "Chấm chữa & Phản hồi học sinh" },
  { code: "HO_TRO_CA_NHAN_HOA", name: "Cá nhân hóa & Bồi dưỡng HS" },
  { code: "QUAN_LY_LOP_HOC", name: "Công tác chủ nhiệm & Quản lý lớp" },
  { code: "HOC_LIEU_TUONG_TAC", name: "Học liệu số & Kể chuyện tương tác" },
] as const

export const SLC_ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]

export const SLC_ALLOWED_DOC_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

export const SLC_ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".pdf",
  ".docx",
  ".pptx",
  ".xlsx",
]

export interface SlcRuleParameters {
  periodType: "MONTHLY" | "YEARLY"
  minRatingsIdea: number
  minRatingsProduct: number
  minVerifiedAppsProduct: number
  minExpertReviewers: number
  bayesianM: number
  bayesianPrior: number
  capVerifiedApps: number
  ideaWeightC: number
  ideaWeightE: number
  productWeightC: number
  productWeightE: number
  productWeightU: number
}

export const DEFAULT_MONTHLY_RULE_PARAMS: SlcRuleParameters = {
  periodType: "MONTHLY",
  minRatingsIdea: 5,
  minRatingsProduct: 5,
  minVerifiedAppsProduct: 3,
  minExpertReviewers: 2,
  bayesianM: 5.0,
  bayesianPrior: 3.5,
  capVerifiedApps: 10,
  ideaWeightC: 0.60,
  ideaWeightE: 0.40,
  productWeightC: 0.50,
  productWeightE: 0.20,
  productWeightU: 0.30,
}

export const DEFAULT_YEARLY_RULE_PARAMS: SlcRuleParameters = {
  periodType: "YEARLY",
  minRatingsIdea: 10,
  minRatingsProduct: 10,
  minVerifiedAppsProduct: 5,
  minExpertReviewers: 2,
  bayesianM: 5.0,
  bayesianPrior: 3.5,
  capVerifiedApps: 20,
  ideaWeightC: 0.60,
  ideaWeightE: 0.40,
  productWeightC: 0.50,
  productWeightE: 0.20,
  productWeightU: 0.30,
}

export const SLC_SKILL_WORK_CATEGORIES = [
  {
    code: "ACTIVITY_DESIGN",
    name: "Thiết kế hoạt động",
    description: "Thiết kế hoạt động khởi động, khám phá, luyện tập hoặc dự án học tập trong tiết dạy",
    sortOrder: 1,
  },
  {
    code: "MATERIAL_CREATION",
    name: "Tạo học liệu",
    description: "Xây dựng phiếu học tập, ngữ liệu đọc hiểu, tình huống thực tiễn, bài tập minh họa",
    sortOrder: 2,
  },
  {
    code: "TASK_DIFFERENTIATION",
    name: "Phân hóa nhiệm vụ",
    description: "Chia nhiệm vụ theo các mức độ nhận thức và năng lực thực tế của từng nhóm học sinh",
    sortOrder: 3,
  },
  {
    code: "STUDENT_SUPPORT",
    name: "Hỗ trợ nội dung học sinh còn hạn chế",
    description: "Thiết kế lộ trình củng cố, giải thích lại khái niệm và bài tập bổ trợ cho học sinh cần hỗ trợ",
    sortOrder: 4,
  },
  {
    code: "ASSESSMENT_EVAL",
    name: "Kiểm tra và đánh giá",
    description: "Tạo câu hỏi kiểm tra, bảng kiểm (rubric), nhận xét đánh giá thường xuyên và định kỳ",
    sortOrder: 5,
  },
] as const

export type SlcSkillWorkCategoryCode = (typeof SLC_SKILL_WORK_CATEGORIES)[number]["code"] | string

export const SLC_SKILL_STATUSES = [
  { value: "DRAFT", label: "Bản nháp", badgeClass: "bg-slate-100 text-slate-700 border-slate-300" },
  { value: "PENDING_REVIEW", label: "Chờ duyệt", badgeClass: "bg-amber-50 text-amber-800 border-amber-200" },
  { value: "NEEDS_REVISION", label: "Cần chỉnh sửa", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "APPROVED", label: "Được duyệt", badgeClass: "bg-teal-50 text-[#00736E] border-teal-200" },
  { value: "PUBLISHED", label: "Phát hành", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "ARCHIVED", label: "Lưu trữ", badgeClass: "bg-slate-100 text-slate-500 border-slate-200" },
  { value: "DELETED", label: "Đã xóa tạm", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" },
] as const

export type SlcSkillStatus = (typeof SLC_SKILL_STATUSES)[number]["value"]

export const SLC_SKILL_PLATFORMS = [
  { code: "SSM_INTERNAL", label: "Tích hợp chạy trực tiếp trên SSM" },
  { code: "GEMINI", label: "Google Gemini / NotebookLM" },
  { code: "CHATGPT", label: "OpenAI ChatGPT" },
  { code: "CLAUDE", label: "Anthropic Claude" },
  { code: "COPILOT", label: "Microsoft Copilot" },
] as const

export const SLC_ALLOWED_SKILL_PACKAGE_EXTENSIONS = [
  ".zip",
  ".md",
  ".txt",
  ".json",
  ".pdf",
  ".docx",
]

export const SLC_FORBIDDEN_ARCHIVE_EXTENSIONS = [
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".ps1",
  ".vbs",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".py",
  ".php",
  ".rb",
  ".pl",
  ".jar",
  ".msi",
  ".dll",
  ".so",
  ".dylib",
  ".com",
  ".scr",
  ".hta",
]

