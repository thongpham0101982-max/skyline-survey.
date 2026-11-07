export const SLC_MODULE_CODE = "SKYLINE_CONNECT_ADMIN"

export const SLC_POST_TYPES = [
  { value: "IDEA", label: "Ý tưởng dạy học", badgeLabel: "Ý tưởng", color: "#D6A74A" },
  { value: "AI_PRODUCT", label: "Sản phẩm AI", badgeLabel: "Sản phẩm AI", color: "#159EAA" },
  { value: "PROJECT", label: "Dự án hợp tác", badgeLabel: "Dự án", color: "#2878D9" },
  { value: "EXPERIENCE", label: "Trải nghiệm & Học liệu", badgeLabel: "Học liệu & Trải nghiệm", color: "#059669" },
  { value: "GENERAL", label: "Chia sẻ thông thường", badgeLabel: "Chia sẻ", color: "#123E4A" },
] as const

export type SlcPostType = (typeof SLC_POST_TYPES)[number]["value"]

export const SLC_VISIBILITY_OPTIONS = [
  { value: "SYSTEM", label: "Toàn hệ thống Sky-Line", desc: "Mọi giáo viên trên toàn hệ thống đều xem và tương tác được" },
  { value: "CAMPUS", label: "Trong cơ sở của tôi", desc: "Chỉ giáo viên cùng cơ sở biên chế mới xem được" },
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
  { value: "RECEIVED", label: "Đã tiếp nhận", badgeClass: "bg-sky-50 text-[#2878D9] border-sky-200" },
  { value: "IN_PROGRESS", label: "Đang thực hiện", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "APPLIED", label: "Đã áp dụng", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "NOT_IMPLEMENTED", label: "Chưa triển khai", badgeClass: "bg-slate-100 text-slate-600 border-slate-300" },
] as const

export type SlcFeedbackStatus = (typeof SLC_FEEDBACK_STATUSES)[number]["value"]

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
  { code: "TOAN", name: "Toán" },
  { code: "NGU_VAN", name: "Ngữ văn / Tiếng Việt" },
  { code: "TIENG_ANH", name: "Tiếng Anh" },
  { code: "KHTN", name: "Khoa học tự nhiên" },
  { code: "VAT_LI", name: "Vật lí" },
  { code: "HOA_HOC", name: "Hóa học" },
  { code: "SINH_HOC", name: "Sinh học" },
  { code: "LICH_SU_DIA_LI", name: "Lịch sử & Địa lí" },
  { code: "TIN_HOC", name: "Tin học & AI" },
  { code: "NGHE_THUAT", name: "Nghệ thuật / Âm nhạc / Mỹ thuật" },
  { code: "HDTN", name: "Hoạt động trải nghiệm & Kỹ năng" },
  { code: "MAM_NON", name: "Phát triển Mầm non" },
  { code: "CHU_NHIEM", name: "Công tác chủ nhiệm & Tư vấn" },
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
