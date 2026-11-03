// ============================================================================
// HẰNG SỐ & QUY TẮC NGHIỆP VỤ: ĐIỀU HÀNH & TIẾN ĐỘ KHẢO SÁT ĐẦU VÀO (8 CÔNG ĐOẠN)
// ============================================================================

export type EntranceStageStatus =
  | "NOT_STARTED"      // Chưa bắt đầu
  | "IN_PROGRESS"      // Đang thực hiện
  | "COMPLETED"        // Hoàn thành
  | "NEEDS_ADJUSTMENT" // Cần điều chỉnh
  | "NOT_APPLICABLE";  // Không áp dụng theo nghiệp vụ

export type CompletionMilestone =
  | "PENDING_WORK"           // Đang thực hiện công việc chuyên môn (Bước 1-5)
  | "WORK_COMPLETED"         // Hoàn thành công việc chuyên môn (Đủ kết quả & định hướng, chờ xét duyệt)
  | "APPROVAL_COMPLETED"     // Hoàn thành xét duyệt (Đã có kết luận phê duyệt, chờ bàn giao/thông báo)
  | "NOTIFICATION_COMPLETED";// Hoàn thành thông báo PHHS (Tư vấn đã gửi thông báo/thư)

export type NotificationDeliveryStatus =
  | "NOT_SENT"   // Chưa gửi
  | "SENT"       // Tư vấn đã gửi thông báo / thư
  | "DELIVERED"  // Đã chuyển tới PHHS
  | "READ"       // PHHS đã nhận / đọc
  | "CONFIRMED"; // PHHS đã xác nhận phản hồi

export type EntranceExceptionType =
  | "NONE"              // Bình thường
  | "EXEMPT"            // Miễn khảo sát
  | "RETEST"            // Khảo sát lại
  | "AMENDMENT"         // Chỉnh sửa / Cần điều chỉnh
  | "ABSENT"            // Vắng khảo sát
  | "SPECIAL_EXCEPTION";// Trường hợp ngoại lệ đặc biệt

export type DeadlineAlertLevel =
  | "ON_TRACK"  // Đúng hạn
  | "DUE_SOON"  // Gần hạn (<= 48 giờ)
  | "OVERDUE"   // Quá hạn
  | "COMPLETED";// Đã hoàn tất

export interface EntranceStageDefinition {
  stageNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  code: string;
  shortName: string;
  name: string;
  description: string;
  responsibleRoles: string[];
  responsibleLabel: string;
  confirmButtonLabel: string;
  defaultHrefK12: string;
  defaultHrefPreschool: string;
  milestoneGroup: "WORK" | "APPROVAL" | "NOTIFICATION";
}

export const ENTRANCE_STAGE_STATUS_META: Record<
  EntranceStageStatus,
  { label: string; shortLabel: string; badgeClass: string; dotClass: string; colorHex: string }
> = {
  NOT_STARTED: {
    label: "Chưa bắt đầu",
    shortLabel: "Chưa BĐ",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    dotClass: "bg-slate-400",
    colorHex: "#64748B",
  },
  IN_PROGRESS: {
    label: "Đang thực hiện",
    shortLabel: "Đang làm",
    badgeClass: "bg-teal-50 text-[#00736E] border-teal-200",
    dotClass: "bg-[#00A19A]",
    colorHex: "#00A19A",
  },
  COMPLETED: {
    label: "Hoàn thành",
    shortLabel: "Hoàn thành",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
    colorHex: "#10B981",
  },
  NEEDS_ADJUSTMENT: {
    label: "Cần điều chỉnh",
    shortLabel: "Cần ĐC",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
    colorHex: "#F43F5E",
  },
  NOT_APPLICABLE: {
    label: "Không áp dụng",
    shortLabel: "K.Áp dụng",
    badgeClass: "bg-slate-50 text-slate-400 border-slate-200/80 italic",
    dotClass: "bg-slate-300",
    colorHex: "#94A3B8",
  },
};

export const DELIVERY_STATUS_META: Record<
  NotificationDeliveryStatus,
  { label: string; badgeClass: string }
> = {
  NOT_SENT: {
    label: "Chưa gửi PHHS",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
  },
  SENT: {
    label: "Đã gửi (Chờ PHHS đọc)",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
  },
  DELIVERED: {
    label: "Đã chuyển tới PHHS",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
  },
  READ: {
    label: "PHHS đã nhận/đọc",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  CONFIRMED: {
    label: "PHHS đã xác nhận",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
};

export const EXCEPTION_TYPE_META: Record<
  EntranceExceptionType,
  { label: string; badgeClass: string }
> = {
  NONE: {
    label: "Tiêu chuẩn",
    badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
  },
  EXEMPT: {
    label: "Miễn khảo sát",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
  },
  RETEST: {
    label: "Khảo sát lại",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  AMENDMENT: {
    label: "Chỉnh sửa / Điều chỉnh",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
  ABSENT: {
    label: "Vắng khảo sát",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
  },
  SPECIAL_EXCEPTION: {
    label: "Trường hợp ngoại lệ",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
};

export const DEADLINE_ALERT_META: Record<
  DeadlineAlertLevel,
  { label: string; badgeClass: string }
> = {
  ON_TRACK: {
    label: "Đúng hạn",
    badgeClass: "bg-teal-50 text-[#00736E] border-teal-200",
  },
  DUE_SOON: {
    label: "Gần hạn",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-300",
  },
  OVERDUE: {
    label: "Quá hạn",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-300",
  },
  COMPLETED: {
    label: "Đã hoàn tất",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

export const ENTRANCE_WORKFLOW_STAGES: EntranceStageDefinition[] = [
  {
    stageNumber: 1,
    code: "STAGE_1_BATCH",
    shortName: "1. Tạo đợt KS",
    name: "Tạo đợt khảo sát",
    description: "Khởi tạo kỳ khảo sát, đợt khảo sát, thời hạn và phân công giáo vụ phụ trách đợt.",
    responsibleRoles: ["ADMIN", "KT_DBCL", "KTDBCL", "GIAO_VU", "GIAO_VU_CS"],
    responsibleLabel: "Ban KT&ĐBCL / Giáo vụ",
    confirmButtonLabel: "Xác nhận khởi tạo đợt",
    defaultHrefK12: "/admin/cau-hinh-khao-sat?tab=k12",
    defaultHrefPreschool: "/admin/cau-hinh-khao-sat?tab=preschool",
    milestoneGroup: "WORK",
  },
  {
    stageNumber: 2,
    code: "STAGE_2_ROSTER",
    shortName: "2. Nhập DS HS",
    name: "Nhập danh sách học sinh",
    description: "Tiếp nhận, import hoặc thêm mới danh sách học sinh tham gia đợt khảo sát đầu vào.",
    responsibleRoles: ["ADMIN", "KT_DBCL", "KTDBCL", "GIAO_VU", "GIAO_VU_CS", "TU_VAN", "TVTS", "TUYEN_SINH"],
    responsibleLabel: "Giáo vụ / Tư vấn / KT&ĐBCL",
    confirmButtonLabel: "Xác nhận danh sách HS",
    defaultHrefK12: "/admin/student-info?tab=general",
    defaultHrefPreschool: "/admin/student-info?tab=preschool",
    milestoneGroup: "WORK",
  },
  {
    stageNumber: 3,
    code: "STAGE_3_ASSIGNMENT",
    shortName: "3. Phân công GV",
    name: "Giáo vụ phân công & xác nhận phân công",
    description: "Phân công giáo viên chấm/khảo sát theo môn, khối, hệ và xác nhận công bố nhiệm vụ cho GV.",
    responsibleRoles: ["ADMIN", "KT_DBCL", "KTDBCL", "GIAO_VU", "GIAO_VU_CS"],
    responsibleLabel: "Giáo vụ Cơ sở / KT&ĐBCL",
    confirmButtonLabel: "Xác nhận hoàn thành phân công",
    defaultHrefK12: "/admin/phan-cong-khao-sat?tab=k12",
    defaultHrefPreschool: "/admin/phan-cong-khao-sat?tab=preschool",
    milestoneGroup: "WORK",
  },
  {
    stageNumber: 4,
    code: "STAGE_4_EVALUATION",
    shortName: "4. GV đánh giá",
    name: "Giáo viên nhập kết quả & xác nhận đánh giá",
    description: "Giáo viên nhập điểm, nhận xét chuyên môn và xác nhận hoàn thành nhiệm vụ đánh giá.",
    responsibleRoles: ["TEACHER", "GV", "GV_MN", "ADMIN", "KT_DBCL", "KTDBCL", "GIAO_VU", "GIAO_VU_CS"],
    responsibleLabel: "Giáo viên khảo sát",
    confirmButtonLabel: "Xác nhận hoàn thành đánh giá",
    defaultHrefK12: "/teacher/input-assessments?type=general",
    defaultHrefPreschool: "/teacher/input-assessments?type=preschool",
    milestoneGroup: "WORK",
  },
  {
    stageNumber: 5,
    code: "STAGE_5_ORIENTATION",
    shortName: "5. Bản định hướng",
    name: "Hoàn thành bản định hướng kết quả",
    description: "Phỏng vấn học sinh, trao đổi PHHS, tham vấn tâm lý (nếu có) và hoàn thiện bản định hướng.",
    responsibleRoles: ["TEACHER", "GV", "GV_MN", "GIAO_VU", "GIAO_VU_CS", "GDCS", "GĐCS", "BGH", "ADMIN", "KT_DBCL", "KTDBCL"],
    responsibleLabel: "GV Định hướng / Hội đồng tiếp nhận",
    confirmButtonLabel: "Xác nhận hoàn thành định hướng",
    defaultHrefK12: "/admin/ket-qua-khao-sat?tab=general",
    defaultHrefPreschool: "/admin/ket-qua-khao-sat?tab=preschool",
    milestoneGroup: "WORK",
  },
  {
    stageNumber: 6,
    code: "STAGE_6_APPROVAL",
    shortName: "6. Thẩm định & Duyệt",
    name: "Thẩm định, xét duyệt và kết luận",
    description: "Thẩm định kết quả khảo sát + bản định hướng, phê duyệt kết luận tuyển sinh (Đạt / Cam kết / Không đạt / KS lại).",
    responsibleRoles: ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "BGH", "BGH_CS", "BGH_MN", "ADMIN", "KT_DBCL", "KTDBCL"],
    responsibleLabel: "Giám đốc Cơ sở / BGH",
    confirmButtonLabel: "Phê duyệt kết luận",
    defaultHrefK12: "/admin/xet-duyet-ket-qua?tab=k12",
    defaultHrefPreschool: "/admin/xet-duyet-ket-qua?tab=preschool",
    milestoneGroup: "APPROVAL",
  },
  {
    stageNumber: 7,
    code: "STAGE_7_HANDOVER",
    shortName: "7. Bàn giao Tư vấn",
    name: "Bàn giao kết quả, văn bản cho Tư vấn",
    description: "Chuẩn bị văn bản (Thư chúc mừng / Bản cam kết / Thông báo KQ) và xác nhận bàn giao cho Tư vấn tuyển sinh.",
    responsibleRoles: ["ADMIN", "KT_DBCL", "KTDBCL", "GIAO_VU", "GIAO_VU_CS", "GDCS", "GĐCS", "TU_VAN", "TVTS", "TUYEN_SINH", "TVAN"],
    responsibleLabel: "Ban KT&ĐBCL / Giáo vụ / Tư vấn",
    confirmButtonLabel: "Xác nhận bàn giao Tư vấn",
    defaultHrefK12: "/admin/xet-duyet-ket-qua?tab=k12",
    defaultHrefPreschool: "/admin/xet-duyet-ket-qua?tab=preschool",
    milestoneGroup: "NOTIFICATION",
  },
];

export function getStageDefinition(stageNumber: number): EntranceStageDefinition {
  return (
    ENTRANCE_WORKFLOW_STAGES.find((s) => s.stageNumber === stageNumber) ||
    ENTRANCE_WORKFLOW_STAGES[0]
  );
}

/**
 * Kiểm tra phân quyền vai trò thực hiện xác nhận từng công đoạn tại Backend & Frontend
 */
export function canUserConfirmStage(
  userRole?: string | null,
  stageNumber?: number,
  isSuperAdmin?: boolean
): boolean {
  if (isSuperAdmin) return true;
  const norm = (userRole || "").toUpperCase().trim();
  if (!norm) return false;
  if (["ADMIN", "SUPERADMIN", "SUPER_ADMIN", "KT_DBCL", "KTDBCL"].includes(norm)) {
    return true;
  }

  const stageDef = getStageDefinition(stageNumber || 1);
  return stageDef.responsibleRoles.some(
    (r) => norm === r || norm.includes(r)
  );
}

/**
 * Kiểm tra kết luận tuyển sinh có thuộc nhóm ĐẠT được phép phát hành Thư chúc mừng hay không
 */
export function isApprovedPassResult(admissionResult?: string | null): boolean {
  if (!admissionResult) return false;
  const r = String(admissionResult).trim().toLowerCase();
  if (!r) return false;
  // Loại trừ tường minh "không đạt", "chờ duyệt", "chưa duyệt", "tạm hoãn"
  if (
    r.includes("không đạt") ||
    r.includes("khong dat") ||
    r.includes("chờ duyệt") ||
    r.includes("chưa duyệt") ||
    r.includes("tạm hoãn")
  ) {
    return false;
  }
  return (
    r.includes("đạt") ||
    r === "dat" ||
    r.includes("dat ") ||
    r.includes("miễn") ||
    r.includes("mien") ||
    r.includes("học thử") ||
    r.includes("hoc thu") ||
    r.includes("trúng tuyển")
  );
}

/**
 * Kiểm tra kết luận tuyển sinh đã được phê duyệt chính thức chưa (kể cả Đạt, Đạt cam kết, Không đạt, Học thử, Miễn KS)
 */
export function isOfficiallyApprovedConclusion(admissionResult?: string | null): boolean {
  if (!admissionResult) return false;
  const r = String(admissionResult).trim().toLowerCase();
  if (!r) return false;
  if (
    r === "chờ duyệt" ||
    r === "chưa duyệt" ||
    r === "chưa xét duyệt" ||
    r === "pending" ||
    r === "draft" ||
    r === "tạm hoãn"
  ) {
    return false;
  }
  return (
    r.includes("đạt") ||
    r.includes("dat") ||
    r.includes("không đạt") ||
    r.includes("khong dat") ||
    r.includes("học thử") ||
    r.includes("hoc thu") ||
    r.includes("miễn") ||
    r.includes("mien")
  );
}
