export type MeetingTypeCode = "DINH_KY" | "CHUYEN_DE" | "DOT_XUAT" | "CA_NHAN";

export type MeetingStatusCode =
    | "DRAFT"
    | "PENDING_APPROVAL"
    | "PUBLISHED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED";

export type RsvpStatusCode = "PENDING" | "CONFIRMED" | "ABSENT" | "DELEGATED";

export type AttendeeRoleCode =
    | "BO"
    | "ME"
    | "NGUOI_GIAM_HO"
    | "NGUOI_DAI_DIEN"
    | "CA_BO_VA_ME";

export type ManualCheckInReasonCode =
    | "NO_PHONE"
    | "QR_ERROR"
    | "NO_INTERNET"
    | "TWO_GUARDIANS"
    | "DELEGATE"
    | "LATE_ARRIVAL"
    | "OTHER";

export type FeedbackStageCode = "PRE_MEETING" | "DURING_MEETING" | "POST_MEETING";

export type FeedbackTopicGroupCode =
    | "KET_QUA_HOC_TAP"
    | "CHAT_LUONG_MON_HOC"
    | "CO_VAN_HOC_TAP"
    | "PHOI_HOP_GVCN_GVBM"
    | "HOAT_DONG_GIAO_DUC"
    | "MOI_TRUONG_DICH_VU"
    | "KIEN_NGHI_KHAC";

export type FeedbackBusinessStatusCode =
    | "NEW"
    | "IN_PROGRESS"
    | "WAITING_COORDINATION"
    | "RESPONDED"
    | "COMPLETED";

export type FeedbackVisibilityCode = "PRIVATE" | "CLASS_SHARED_ANONYMOUS" | "ESCALATED";

export type MinutesStatusCode =
    | "DRAFT"
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "PUBLISHED"
    | "REJECTED";

export type MeetingTaskStatusCode =
    | "NEW"
    | "IN_PROGRESS"
    | "WAITING_COORDINATION"
    | "COMPLETED"
    | "CANCELLED";

export type MeetingTaskPriorityCode = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export const MEETING_TYPES: Record<
    MeetingTypeCode,
    { labelVi: string; labelEn: string; badgeClass: string }
> = {
    DINH_KY: {
        labelVi: "Họp định kỳ",
        labelEn: "Periodic Meeting",
        badgeClass: "bg-teal-50 text-teal-800 border-teal-200",
    },
    CHUYEN_DE: {
        labelVi: "Họp chuyên đề",
        labelEn: "Thematic Workshop",
        badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
    },
    DOT_XUAT: {
        labelVi: "Họp đột xuất",
        labelEn: "Ad-hoc Meeting",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    },
    CA_NHAN: {
        labelVi: "Họp cá nhân 1-1",
        labelEn: "Individual Consultation",
        badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
    },
};

export const MEETING_STATUS_CONFIG: Record<
    MeetingStatusCode,
    { labelVi: string; labelEn: string; badgeClass: string }
> = {
    DRAFT: {
        labelVi: "Nháp",
        labelEn: "Draft",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    },
    PENDING_APPROVAL: {
        labelVi: "Chờ duyệt",
        labelEn: "Pending Approval",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    },
    PUBLISHED: {
        labelVi: "Đã công bố",
        labelEn: "Published",
        badgeClass: "bg-teal-50 text-teal-800 border-teal-200",
    },
    IN_PROGRESS: {
        labelVi: "Đang diễn ra",
        labelEn: "In Progress",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
    },
    COMPLETED: {
        labelVi: "Đã kết thúc",
        labelEn: "Completed",
        badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
    },
    CANCELLED: {
        labelVi: "Đã hủy",
        labelEn: "Cancelled",
        badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
    },
};

export const RSVP_STATUS_CONFIG: Record<
    RsvpStatusCode,
    { labelVi: string; labelEn: string; badgeClass: string }
> = {
    PENDING: {
        labelVi: "Chờ xác nhận",
        labelEn: "Pending RSVP",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    },
    CONFIRMED: {
        labelVi: "Xác nhận tham dự",
        labelEn: "Confirmed",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    DELEGATED: {
        labelVi: "Cử người đại diện",
        labelEn: "Delegated",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    },
    ABSENT: {
        labelVi: "Báo vắng",
        labelEn: "Excused Absent",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    },
};

export const ATTENDEE_ROLES: Record<
    AttendeeRoleCode,
    { labelVi: string; labelEn: string; defaultHeadcount: number }
> = {
    BO: { labelVi: "Bố", labelEn: "Father", defaultHeadcount: 1 },
    ME: { labelVi: "Mẹ", labelEn: "Mother", defaultHeadcount: 1 },
    NGUOI_GIAM_HO: { labelVi: "Người giám hộ", labelEn: "Legal Guardian", defaultHeadcount: 1 },
    NGUOI_DAI_DIEN: { labelVi: "Người đại diện thay thế", labelEn: "Authorized Delegate", defaultHeadcount: 1 },
    CA_BO_VA_ME: { labelVi: "Cả Bố và Mẹ (2 người)", labelEn: "Both Parents (2 attendees)", defaultHeadcount: 2 },
};

export const MANUAL_CHECKIN_REASONS: Record<
    ManualCheckInReasonCode,
    { labelVi: string; labelEn: string }
> = {
    NO_PHONE: {
        labelVi: "PHHS không mang điện thoại",
        labelEn: "Parent did not bring phone",
    },
    QR_ERROR: {
        labelVi: "Không mở được mã QR trên thiết bị",
        labelEn: "Unable to open QR code on device",
    },
    NO_INTERNET: {
        labelVi: "Mạng Internet bị gián đoạn",
        labelEn: "Internet connection interrupted",
    },
    TWO_GUARDIANS: {
        labelVi: "Có 2 người giám hộ cùng tham dự",
        labelEn: "Two guardians attending together",
    },
    DELEGATE: {
        labelVi: "Người đại diện thay thế tham dự",
        labelEn: "Substitute representative attending",
    },
    LATE_ARRIVAL: {
        labelVi: "Điểm danh bổ sung (đến trễ)",
        labelEn: "Late arrival check-in",
    },
    OTHER: {
        labelVi: "Lý do khác",
        labelEn: "Other reason",
    },
};

export const FEEDBACK_TOPIC_GROUPS: Record<
    FeedbackTopicGroupCode,
    {
        labelVi: string;
        labelEn: string;
        coordinationTopicCode: string;
        slaHours: number;
    }
> = {
    KET_QUA_HOC_TAP: {
        labelVi: "Kết quả học tập",
        labelEn: "Academic Results",
        coordinationTopicCode: "HOC_TAP_TIEN_BO",
        slaHours: 24,
    },
    CHAT_LUONG_MON_HOC: {
        labelVi: "Chất lượng môn học",
        labelEn: "Subject Quality",
        coordinationTopicCode: "BAI_TAP_KIEM_TRA",
        slaHours: 24,
    },
    CO_VAN_HOC_TAP: {
        labelVi: "Cố vấn học tập",
        labelEn: "Academic Advisory",
        coordinationTopicCode: "TAM_LY_CAM_XUC",
        slaHours: 24,
    },
    PHOI_HOP_GVCN_GVBM: {
        labelVi: "Phối hợp GVCN/GVBM",
        labelEn: "GVCN/Subject Teacher Coordination",
        coordinationTopicCode: "CHUYEN_CAN_NE_NEP",
        slaHours: 24,
    },
    HOAT_DONG_GIAO_DUC: {
        labelVi: "Hoạt động giáo dục",
        labelEn: "Educational Activities",
        coordinationTopicCode: "HOAT_DONG_SU_KIEN",
        slaHours: 36,
    },
    MOI_TRUONG_DICH_VU: {
        labelVi: "Môi trường và dịch vụ",
        labelEn: "Environment & Services",
        coordinationTopicCode: "GOP_Y_DICH_VU_CSVC",
        slaHours: 36,
    },
    KIEN_NGHI_KHAC: {
        labelVi: "Kiến nghị khác",
        labelEn: "Other Suggestions",
        coordinationTopicCode: "DE_XUAT_KHAC",
        slaHours: 48,
    },
};

export const FEEDBACK_BUSINESS_STATUS: Record<
    FeedbackBusinessStatusCode,
    { labelVi: string; labelEn: string; badgeClass: string; coordinationStatus: string }
> = {
    NEW: {
        labelVi: "Mới tiếp nhận",
        labelEn: "Newly Received",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
        coordinationStatus: "NEW",
    },
    IN_PROGRESS: {
        labelVi: "Đang xử lý",
        labelEn: "In Progress",
        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
        coordinationStatus: "IN_PROGRESS",
    },
    WAITING_COORDINATION: {
        labelVi: "Chờ phối hợp",
        labelEn: "Awaiting Coordination",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
        coordinationStatus: "WAITING_COORDINATOR",
    },
    RESPONDED: {
        labelVi: "Đã phản hồi",
        labelEn: "Responded",
        badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
        coordinationStatus: "RESOLVED",
    },
    COMPLETED: {
        labelVi: "Hoàn tất",
        labelEn: "Completed",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
        coordinationStatus: "CLOSED",
    },
};

export const FEEDBACK_STAGE_LABELS: Record<
    FeedbackStageCode,
    { labelVi: string; labelEn: string }
> = {
    PRE_MEETING: { labelVi: "Trước cuộc họp", labelEn: "Pre-meeting" },
    DURING_MEETING: { labelVi: "Trong cuộc họp", labelEn: "During meeting" },
    POST_MEETING: { labelVi: "Sau cuộc họp", labelEn: "Post-meeting" },
};

export const MINUTES_STATUS_CONFIG: Record<
    MinutesStatusCode,
    { labelVi: string; labelEn: string; badgeClass: string }
> = {
    DRAFT: {
        labelVi: "Bản nháp",
        labelEn: "Draft",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    },
    PENDING_APPROVAL: {
        labelVi: "Chờ phê duyệt",
        labelEn: "Pending Approval",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    },
    APPROVED: {
        labelVi: "Đã phê duyệt",
        labelEn: "Approved",
        badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
    },
    PUBLISHED: {
        labelVi: "Đã công bố PHHS",
        labelEn: "Published to Parents",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
    REJECTED: {
        labelVi: "Yêu cầu chỉnh sửa",
        labelEn: "Revision Requested",
        badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
    },
};

export const MEETING_TASK_STATUS_CONFIG: Record<
    MeetingTaskStatusCode,
    { labelVi: string; labelEn: string; badgeClass: string }
> = {
    NEW: {
        labelVi: "Mới giao",
        labelEn: "New",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    },
    IN_PROGRESS: {
        labelVi: "Đang thực hiện",
        labelEn: "In Progress",
        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    WAITING_COORDINATION: {
        labelVi: "Chờ phối hợp",
        labelEn: "Waiting Coordination",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    },
    COMPLETED: {
        labelVi: "Đã hoàn thành",
        labelEn: "Completed",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
    CANCELLED: {
        labelVi: "Đã hủy",
        labelEn: "Cancelled",
        badgeClass: "bg-slate-100 text-slate-600 border-slate-300",
    },
};

/**
 * Overdue is a dynamic warning flag computed from deadline (`dueAt`) and non-terminal business status,
 * not a mutually exclusive business status (Module 5 specification).
 */
export function isFeedbackOverdue(
    businessStatus: string,
    dueAt: Date | string | null | undefined,
    referenceNow: Date = new Date()
): boolean {
    if (!dueAt) return false;
    if (businessStatus === "COMPLETED") return false;
    const dueTime = typeof dueAt === "string" ? new Date(dueAt).getTime() : dueAt.getTime();
    if (Number.isNaN(dueTime)) return false;
    return referenceNow.getTime() > dueTime;
}

export function isTaskOverdue(
    status: string,
    dueAt: Date | string | null | undefined,
    referenceNow: Date = new Date()
): boolean {
    if (!dueAt) return false;
    if (status === "COMPLETED" || status === "CANCELLED") return false;
    const dueTime = typeof dueAt === "string" ? new Date(dueAt).getTime() : dueAt.getTime();
    if (Number.isNaN(dueTime)) return false;
    return referenceNow.getTime() > dueTime;
}
