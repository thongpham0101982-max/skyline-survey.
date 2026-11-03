export type NotificationCategoryCode =
  | "EXAM"
  | "TEACHER"
  | "ACADEMIC_RESULT"
  | "SYSTEM"
  | "ADVISORY"
  | "EXPERIENTIAL"
  | "PARENT_MEETING"
  | "COMPETENCY";

export type NotificationSubTypeCode =
  | "EXAM_SCHEDULE"
  | "EXAM_LMS_GUIDE"
  | "EXAM_SCHEDULE_CHANGE"
  | "EXAM_MAKEUP"
  | "EXAM_ABSENT"
  | "EXAM_RESULT"
  | "GVCN_ANNOUNCEMENT"
  | "GVCN_EXAM_REMINDER"
  | "GVCN_PREPARATION"
  | "GVBM_STUDY_GUIDE"
  | "GVBM_REVIEW_TOPICS"
  | "GVBM_MATERIALS"
  | "SYSTEM_ANNOUNCEMENT"
  | "ADVISORY_UPDATE"
  | "EXPERIENTIAL_EVENT"
  | "PARENT_MEETING_INVITE"
  | "COMPETENCY_REPORT";

export type NotificationPriorityCode = "NORMAL" | "IMPORTANT" | "URGENT";

export type NotificationWorkflowStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "SCHEDULED"
  | "SENDING"
  | "PUBLISHED"
  | "PARTIALLY_FAILED"
  | "CANCELLED"
  | "RECALLED";

export type AutomatedExamEventType =
  | "EVENT_EXAM_SCHEDULE_PUBLISHED"
  | "EVENT_EXAM_REMINDER"
  | "EVENT_EXAM_SCHEDULE_CHANGED"
  | "EVENT_EXAM_STUDENT_ABSENT"
  | "EVENT_EXAM_RESULT_PUBLISHED"
  | "EVENT_EXAM_MAKEUP_SCHEDULED";

export const NOTIFICATION_CATEGORIES: Record<
  NotificationCategoryCode,
  {
    code: NotificationCategoryCode;
    labelVi: string;
    labelEn: string;
    badgeBg: string;
    badgeText: string;
    iconName: string;
  }
> = {
  EXAM: {
    code: "EXAM",
    labelVi: "Khảo thí",
    labelEn: "Examinations",
    badgeBg: "bg-purple-100 border-purple-200",
    badgeText: "text-purple-800",
    iconName: "CalendarCheck",
  },
  TEACHER: {
    code: "TEACHER",
    labelVi: "Giáo viên",
    labelEn: "Teachers",
    badgeBg: "bg-teal-100 border-teal-200",
    badgeText: "text-teal-800",
    iconName: "GraduationCap",
  },
  ACADEMIC_RESULT: {
    code: "ACADEMIC_RESULT",
    labelVi: "Học tập & Kết quả",
    labelEn: "Academic Results",
    badgeBg: "bg-indigo-100 border-indigo-200",
    badgeText: "text-indigo-800",
    iconName: "Award",
  },
  SYSTEM: {
    code: "SYSTEM",
    labelVi: "Hệ thống",
    labelEn: "System",
    badgeBg: "bg-slate-100 border-slate-200",
    badgeText: "text-slate-700",
    iconName: "ShieldCheck",
  },
  ADVISORY: {
    code: "ADVISORY",
    labelVi: "Cố vấn học tập",
    labelEn: "Academic Advisory",
    badgeBg: "bg-emerald-100 border-emerald-200",
    badgeText: "text-emerald-800",
    iconName: "Compass",
  },
  EXPERIENTIAL: {
    code: "EXPERIENTIAL",
    labelVi: "Hoạt động trải nghiệm",
    labelEn: "Experiential",
    badgeBg: "bg-amber-100 border-amber-200",
    badgeText: "text-amber-800",
    iconName: "Sparkles",
  },
  PARENT_MEETING: {
    code: "PARENT_MEETING",
    labelVi: "Họp Phụ huynh",
    labelEn: "Parent Meeting",
    badgeBg: "bg-sky-100 border-sky-200",
    badgeText: "text-sky-800",
    iconName: "Users",
  },
  COMPETENCY: {
    code: "COMPETENCY",
    labelVi: "Đánh giá năng lực",
    labelEn: "Competency",
    badgeBg: "bg-fuchsia-100 border-fuchsia-200",
    badgeText: "text-fuchsia-800",
    iconName: "Activity",
  },
};

export const NOTIFICATION_PRIORITIES: Record<
  NotificationPriorityCode,
  { code: NotificationPriorityCode; labelVi: string; labelEn: string; colorClass: string }
> = {
  NORMAL: {
    code: "NORMAL",
    labelVi: "Thông thường",
    labelEn: "Normal",
    colorClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  IMPORTANT: {
    code: "IMPORTANT",
    labelVi: "Quan trọng",
    labelEn: "Important",
    colorClass: "bg-purple-100 text-purple-800 border-purple-300",
  },
  URGENT: {
    code: "URGENT",
    labelVi: "Khẩn cấp",
    labelEn: "Urgent",
    colorClass: "bg-rose-100 text-rose-800 border-rose-300",
  },
};

export const NOTIFICATION_WORKFLOW_STATUSES: Record<
  NotificationWorkflowStatus,
  { code: NotificationWorkflowStatus; labelVi: string; labelEn: string; badgeClass: string }
> = {
  DRAFT: {
    code: "DRAFT",
    labelVi: "Bản nháp",
    labelEn: "Draft",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  PENDING_APPROVAL: {
    code: "PENDING_APPROVAL",
    labelVi: "Chờ phê duyệt",
    labelEn: "Pending Approval",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
  },
  APPROVED: {
    code: "APPROVED",
    labelVi: "Đã duyệt",
    labelEn: "Approved",
    badgeClass: "bg-sky-100 text-sky-800 border-sky-300",
  },
  SCHEDULED: {
    code: "SCHEDULED",
    labelVi: "Hẹn giờ phát hành",
    labelEn: "Scheduled",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-300",
  },
  SENDING: {
    code: "SENDING",
    labelVi: "Đang gửi",
    labelEn: "Sending",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300",
  },
  PUBLISHED: {
    code: "PUBLISHED",
    labelVi: "Đã phát hành",
    labelEn: "Published",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  PARTIALLY_FAILED: {
    code: "PARTIALLY_FAILED",
    labelVi: "Gửi lỗi một phần",
    labelEn: "Partially Failed",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-300",
  },
  CANCELLED: {
    code: "CANCELLED",
    labelVi: "Đã hủy",
    labelEn: "Cancelled",
    badgeClass: "bg-slate-200 text-slate-600 border-slate-300",
  },
  RECALLED: {
    code: "RECALLED",
    labelVi: "Đã thu hồi / Đính chính",
    labelEn: "Recalled",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
  },
};

export const AUTOMATED_EXAM_EVENTS: Record<
  AutomatedExamEventType,
  {
    code: AutomatedExamEventType;
    labelVi: string;
    descriptionVi: string;
    category: NotificationCategoryCode;
    subType: NotificationSubTypeCode;
    defaultPriority: NotificationPriorityCode;
    requireAcknowledge: boolean;
  }
> = {
  EVENT_EXAM_SCHEDULE_PUBLISHED: {
    code: "EVENT_EXAM_SCHEDULE_PUBLISHED",
    labelVi: "Công bố Lịch kiểm tra chính thức",
    descriptionVi: "Tự động gửi lịch, phòng thi, giờ thi và hình thức kiểm tra khi kỳ thi được phê duyệt.",
    category: "EXAM",
    subType: "EXAM_SCHEDULE",
    defaultPriority: "IMPORTANT",
    requireAcknowledge: true,
  },
  EVENT_EXAM_REMINDER: {
    code: "EVENT_EXAM_REMINDER",
    labelVi: "Nhắc lịch kiểm tra tự động (Trước 3 ngày / 1 ngày)",
    descriptionVi: "Nhắc PHHS và học sinh chuẩn bị trước ngày kiểm tra theo cấu hình.",
    category: "EXAM",
    subType: "EXAM_SCHEDULE",
    defaultPriority: "NORMAL",
    requireAcknowledge: false,
  },
  EVENT_EXAM_SCHEDULE_CHANGED: {
    code: "EVENT_EXAM_SCHEDULE_CHANGED",
    labelVi: "Thông báo Thay đổi lịch / phòng / hình thức kiểm tra",
    descriptionVi: "Chỉ gửi đến đối tượng bị ảnh hưởng, nêu rõ thông tin Trước và Sau điều chỉnh.",
    category: "EXAM",
    subType: "EXAM_SCHEDULE_CHANGE",
    defaultPriority: "URGENT",
    requireAcknowledge: true,
  },
  EVENT_EXAM_STUDENT_ABSENT: {
    code: "EVENT_EXAM_STUDENT_ABSENT",
    labelVi: "Thông báo Học sinh vắng kiểm tra",
    descriptionVi: "Gửi thông báo riêng biệt tới PHHS của học sinh vắng mặt sau khi giám thị xác nhận biên bản.",
    category: "EXAM",
    subType: "EXAM_ABSENT",
    defaultPriority: "URGENT",
    requireAcknowledge: true,
  },
  EVENT_EXAM_RESULT_PUBLISHED: {
    code: "EVENT_EXAM_RESULT_PUBLISHED",
    labelVi: "Thông báo Công bố Kết quả kiểm tra (Khi đã duyệt)",
    descriptionVi: "Gửi thông báo khi điểm đã duyệt. Không đính kèm điểm chi tiết trên push notification, yêu cầu đăng nhập để xem.",
    category: "ACADEMIC_RESULT",
    subType: "EXAM_RESULT",
    defaultPriority: "IMPORTANT",
    requireAcknowledge: false,
  },
  EVENT_EXAM_MAKEUP_SCHEDULED: {
    code: "EVENT_EXAM_MAKEUP_SCHEDULED",
    labelVi: "Thông báo Lịch kiểm tra bổ sung / Kiểm tra bù",
    descriptionVi: "Gửi lịch kiểm tra bù cho các học sinh có danh sách thi bù được duyệt.",
    category: "EXAM",
    subType: "EXAM_MAKEUP",
    defaultPriority: "IMPORTANT",
    requireAcknowledge: true,
  },
};

export interface BuiltInNotificationTemplate {
  code: string;
  name: string;
  category: NotificationCategoryCode;
  subType: NotificationSubTypeCode;
  allowedRoles: string[];
  defaultPriority: NotificationPriorityCode;
  requireAcknowledge: boolean;
  allowReply: boolean;
  titleTemplate: string;
  contentTemplate: string;
}

export const BUILTIN_NOTIFICATION_TEMPLATES: BuiltInNotificationTemplate[] = [
  {
    code: "TPL_EXAM_SCHEDULE",
    name: "[KT&ĐBCL] Thông báo Lịch kiểm tra định kỳ",
    category: "EXAM",
    subType: "EXAM_SCHEDULE",
    allowedRoles: ["KT_DBCL", "ADMIN", "SUPER_ADMIN"],
    defaultPriority: "IMPORTANT",
    requireAcknowledge: true,
    allowReply: false,
    titleTemplate: "[Thông báo Khảo thí] Lịch kiểm tra {{periodName}} - {{subjectName}}",
    contentTemplate: `<p>Kính gửi Quý Phụ huynh và các em Học sinh,</p>
<p>Ban Khảo thí &amp; Đảm bảo Chất lượng Trường Sky-Line trân trọng thông báo lịch kiểm tra chính thức của kỳ <strong>{{periodName}}</strong>:</p>
<ul>
  <li><strong>Môn kiểm tra:</strong> {{subjectName}}</li>
  <li><strong>Thời gian:</strong> {{examTime}} ({{durationMinutes}} phút)</li>
  <li><strong>Phòng kiểm tra / Địa điểm:</strong> {{roomName}}</li>
  <li><strong>Hình thức làm bài:</strong> {{examFormatLabel}}</li>
</ul>
<p>Quý Phụ huynh vui lòng nhắc nhở học sinh có mặt trước giờ kiểm tra 15 phút và chuẩn bị đầy đủ dụng cụ học tập theo quy định.</p>`,
  },
  {
    code: "TPL_EXAM_LMS_GUIDE",
    name: "[KT&ĐBCL] Hướng dẫn tham gia kiểm tra trực tuyến trên LMS",
    category: "EXAM",
    subType: "EXAM_LMS_GUIDE",
    allowedRoles: ["KT_DBCL", "ADMIN", "SUPER_ADMIN"],
    defaultPriority: "IMPORTANT",
    requireAcknowledge: true,
    allowReply: true,
    titleTemplate: "[Hướng dẫn LMS] Quy định & Đường dẫn làm bài kiểm tra {{subjectName}} trên hệ thống LMS",
    contentTemplate: `<p>Kính gửi Quý Phụ huynh và các em Học sinh,</p>
<p>Để chuẩn bị tốt nhất cho bài kiểm tra trực tuyến trên hệ thống LMS Sky-Line môn <strong>{{subjectName}}</strong> thuộc kỳ <strong>{{periodName}}</strong>, học sinh lưu ý:</p>
<ol>
  <li>Đăng nhập tài khoản học sinh trước giờ mở đề ít nhất 10 phút.</li>
  <li>Kiểm tra kết nối mạng và thiết bị theo đúng quy chế khảo thí số.</li>
  <li>Nhấn vào nút <strong>Mở bài kiểm tra LMS</strong> bên dưới khi đến giờ làm bài.</li>
</ol>`,
  },
  {
    code: "TPL_EXAM_SCHEDULE_CHANGE",
    name: "[KT&ĐBCL] Thông báo Điều chỉnh lịch / phòng / hình thức kiểm tra",
    category: "EXAM",
    subType: "EXAM_SCHEDULE_CHANGE",
    allowedRoles: ["KT_DBCL", "ADMIN", "SUPER_ADMIN"],
    defaultPriority: "URGENT",
    requireAcknowledge: true,
    allowReply: false,
    titleTemplate: "[KHẨN - Điều chỉnh Lịch thi] Thay đổi thông tin kiểm tra môn {{subjectName}} ({{periodName}})",
    contentTemplate: `<p>Kính gửi Quý Phụ huynh và các em Học sinh thuộc diện điều chỉnh lịch thi,</p>
<p>Ban KT&amp;ĐBCL thông báo điều chỉnh thông tin ca kiểm tra môn <strong>{{subjectName}}</strong> như sau:</p>
<ul>
  <li><strong>Thông tin trước điều chỉnh:</strong> {{beforeChangeSummary}}</li>
  <li><strong>Thông tin chính thức sau điều chỉnh:</strong> {{afterChangeSummary}}</li>
</ul>
<p>Quý Phụ huynh vui lòng bấm <strong>Xác nhận đã xem</strong> để nhà trường ghi nhận thông tin.</p>`,
  },
  {
    code: "TPL_GVCN_EXAM_REMINDER",
    name: "[GVCN] Nhắc lịch kiểm tra & Chuẩn bị cho học sinh lớp chủ nhiệm",
    category: "TEACHER",
    subType: "GVCN_EXAM_REMINDER",
    allowedRoles: ["GVCN", "TEACHER", "ADMIN"],
    defaultPriority: "IMPORTANT",
    requireAcknowledge: true,
    allowReply: true,
    titleTemplate: "[GVCN Nhắc lịch] Chuẩn bị cho kỳ kiểm tra {{periodName}} - Lớp {{className}}",
    contentTemplate: `<p>Kính gửi Quý Phụ huynh lớp <strong>{{className}}</strong>,</p>
<p>Giáo viên chủ nhiệm xin gửi lời nhắc lịch kiểm tra đã được phê duyệt của lớp trong tuần này. Mong Quý Phụ huynh phối hợp nhắc nhở các con ôn tập theo đề cương bộ môn, ngủ nghỉ đúng giờ và mang đầy đủ thẻ học sinh, bút chì 2B (đối với bài thi OMR) hoặc thiết bị đã sạc đầy (đối với bài thi LMS).</p>`,
  },
  {
    code: "TPL_GVBM_STUDY_GUIDE",
    name: "[GVBM] Nội dung ôn tập & Dụng cụ chuẩn bị trước kỳ kiểm tra",
    category: "TEACHER",
    subType: "GVBM_STUDY_GUIDE",
    allowedRoles: ["GVBM", "TEACHER", "ADMIN"],
    defaultPriority: "NORMAL",
    requireAcknowledge: false,
    allowReply: true,
    titleTemplate: "[Bộ môn {{subjectName}}] Hướng dẫn ôn tập & Chuẩn bị kiểm tra - Lớp {{className}}",
    contentTemplate: `<p>Chào các em học sinh và kính gửi Quý Phụ huynh lớp <strong>{{className}}</strong>,</p>
<p>Giáo viên bộ môn <strong>{{subjectName}}</strong> gửi nội dung trọng tâm cần ôn tập và danh mục tài liệu/dụng cụ học tập cần chuẩn bị trước kỳ kiểm tra:</p>
<ul>
  <li><strong>Nội dung trọng tâm:</strong> Ôn tập theo ma trận kiến thức đã hướng dẫn trên lớp.</li>
  <li><strong>Dụng cụ cần mang theo:</strong> Bút bi xanh, bút chì 2B, tẩy, thước kẻ, máy tính bỏ túi không có thẻ nhớ (nếu môn học cho phép).</li>
</ul>
<p>Nếu có câu hỏi về nội dung ôn tập, Phụ huynh và Học sinh có thể gửi phản hồi trực tiếp dưới thông báo này.</p>`,
  },
];

/**
 * Sanitizes HTML content to prevent XSS attacks (<script>, javascript:, inline event handlers, iframes, etc.)
 */
export function sanitizeNotificationHtml(rawHtml: string): string {
  if (!rawHtml) return "";
  return rawHtml
    // Strip script, iframe, object, embed, form, meta, style tags and their contents
    .replace(/<(script|iframe|object|embed|applet|form|meta|style|link)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|iframe|object|embed|applet|form|meta|style|link)[^>]*\/?>/gi, "")
    // Strip inline event handlers like onerror=, onload=, onclick=, onmouseover=
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // Strip javascript:, vbscript:, data:text/html protocols in href or src
    .replace(/(href|src|xlink:href|action)\s*=\s*(?:"\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^"]*"|'\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^']*')/gi, '$1="#"');
}

const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
]);

const BLOCKED_EXECUTABLE_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".ps1",
  ".vbs",
  ".js",
  ".msi",
  ".scr",
  ".php",
  ".html",
  ".htm",
  ".svg",
]);

export const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export function validateNotificationAttachment(att: {
  fileName: string;
  fileType?: string;
  fileSize?: number;
  fileUrl?: string;
}): { valid: boolean; reason?: string } {
  const fileName = (att.fileName || "").trim();
  if (!fileName) {
    return { valid: false, reason: "Tên tệp đính kèm không được để trống." };
  }

  const lower = fileName.toLowerCase();
  const dotIdx = lower.lastIndexOf(".");
  const ext = dotIdx >= 0 ? lower.slice(dotIdx) : "";

  for (const blocked of BLOCKED_EXECUTABLE_EXTENSIONS) {
    if (lower.endsWith(blocked) || lower.includes(`${blocked}.`)) {
      return {
        valid: false,
        reason: `Định dạng tệp "${ext}" bị chặn vì lý do an toàn bảo mật.`,
      };
    }
  }

  if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      reason: `Định dạng tệp "${ext || "không xác định"}" không nằm trong danh sách cho phép (PDF, Word, Excel, PowerPoint, Ảnh).`,
    };
  }

  if (typeof att.fileSize === "number" && att.fileSize > MAX_ATTACHMENT_SIZE_BYTES) {
    return {
      valid: false,
      reason: "Dung lượng tệp vượt quá giới hạn tối đa 15MB.",
    };
  }

  if (att.fileUrl && /^\s*javascript:/i.test(att.fileUrl)) {
    return {
      valid: false,
      reason: "Đường dẫn tệp đính kèm không hợp lệ.",
    };
  }

  return { valid: true };
}
