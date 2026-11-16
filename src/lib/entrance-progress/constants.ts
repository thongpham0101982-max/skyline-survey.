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
    badgeClass: "bg-teal-50 text-[#00736E] border-teal-200",
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
    badgeClass: "bg-amber-50 text-amber-800 border-amber-300",
  },
  SPECIAL_EXCEPTION: {
    label: "Trường hợp ngoại lệ",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
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

// ============================================================================
// CHUẨN HÓA NHÓM QUYỀN NGHIỆP VỤ KHẢO SÁT ĐẦU VÀO (4 BỘ PHẬN + GIÁO VIÊN)
// ============================================================================

export function normalizeEntranceRole(role?: string | null): string {
  return String(role || "").toUpperCase().trim();
}

export function isSuperAdminRole(role?: string | null): boolean {
  const norm = normalizeEntranceRole(role);
  return ["ADMIN", "ADMINISTRATOR", "SUPERADMIN", "SUPER_ADMIN"].includes(norm);
}

export function isKtdbclEntranceRole(role?: string | null): boolean {
  const norm = normalizeEntranceRole(role);
  if (!norm) return false;
  return ["KHAO_THI", "KT_DBCL", "KTDBCL", "TB_DHCM", "BAN_DHCM"].some(
    (r) => norm === r || norm.includes(r)
  );
}

/**
 * Giám đốc Cơ sở / Ban Giám hiệu (Tách bạch hoàn toàn với Giáo vụ Cơ sở)
 */
export function isGdcsOrBghEntranceRole(role?: string | null): boolean {
  const norm = normalizeEntranceRole(role);
  if (!norm) return false;
  if (norm.includes("GIAO_VU")) return false;
  return [
    "GDCS",
    "GĐCS",
    "GD_CS",
    "GĐ_CS",
    "BGH",
    "BGH_CS",
    "BGH_MN",
    "BGH MN",
    "BGH_MAM_NON",
    "BGH MẦM NON",
    "BGH MÂM NON",
  ].some((r) => norm === r || norm.includes(r));
}

export function isGiaoVuEntranceRole(role?: string | null): boolean {
  const norm = normalizeEntranceRole(role);
  if (!norm) return false;
  return ["GIAO_VU", "GIAO_VU_CS", "GVU"].some(
    (r) => norm === r || norm.includes(r)
  );
}

export function isTuVanEntranceRole(role?: string | null): boolean {
  const norm = normalizeEntranceRole(role);
  if (!norm) return false;
  return ["TVAN", "TU_VAN", "TVTS", "TUYEN_SINH"].some(
    (r) => norm === r || norm.includes(r)
  );
}

export function isTeacherEntranceRole(role?: string | null): boolean {
  const norm = normalizeEntranceRole(role);
  if (!norm) return false;
  return ["TEACHER", "GV", "GV_MN", "GVNN", "GIAO_VIEN"].includes(norm);
}

/**
 * Các vai trò vận hành tại Cơ sở cần tự động khoanh vùng dữ liệu theo Cơ sở phụ trách
 */
export function isCampusScopedEntranceRole(role?: string | null): boolean {
  if (isSuperAdminRole(role) || isKtdbclEntranceRole(role)) return false;
  return (
    isGdcsOrBghEntranceRole(role) ||
    isGiaoVuEntranceRole(role) ||
    isTuVanEntranceRole(role)
  );
}

/**
 * Thẩm quyền phê duyệt & ký kết luận chính thức ở Bước 6
 */
export function canApproveEntranceConclusion(
  role?: string | null,
  isSuperAdmin?: boolean
): boolean {
  if (isSuperAdmin || isSuperAdminRole(role) || isKtdbclEntranceRole(role)) {
    return true;
  }
  return isGdcsOrBghEntranceRole(role);
}

export const ENTRANCE_WORKFLOW_STAGES: EntranceStageDefinition[] = [
  {
    stageNumber: 1,
    code: "STAGE_1_BATCH",
    shortName: "1. Tạo đợt KS",
    name: "Tạo đợt khảo sát",
    description: "Khởi tạo kỳ khảo sát, đợt/ca khảo sát, thời hạn và phân công giáo vụ phụ trách đợt.",
    responsibleRoles: [
      "ADMIN",
      "KHAO_THI",
      "KT_DBCL",
      "KTDBCL",
      "TB_DHCM",
      "BAN_DHCM",
      "GIAO_VU",
      "GIAO_VU_CS",
    ],
    responsibleLabel: "Ban KT&ĐBCL • Giáo vụ",
    confirmButtonLabel: "Xác nhận khởi tạo đợt",
    defaultHrefK12: "/admin/student-info?tab=general&subTab=periods",
    defaultHrefPreschool: "/admin/student-info?tab=preschool&subTab=periods",
    milestoneGroup: "WORK",
  },
  {
    stageNumber: 2,
    code: "STAGE_2_ROSTER",
    shortName: "2. Nhập & Bàn giao DS",
    name: "Nhập danh sách & bàn giao Giáo vụ",
    description: "Tiếp nhận, import danh sách học sinh dự khảo sát và bàn giao danh sách tới Giáo vụ cơ sở.",
    responsibleRoles: [
      "ADMIN",
      "KHAO_THI",
      "KT_DBCL",
      "KTDBCL",
      "TB_DHCM",
      "BAN_DHCM",
      "GIAO_VU",
      "GIAO_VU_CS",
      "TVAN",
      "TU_VAN",
      "TVTS",
      "TUYEN_SINH",
    ],
    responsibleLabel: "Tư vấn • Giáo vụ • KT&ĐBCL",
    confirmButtonLabel: "Xác nhận danh sách HS",
    defaultHrefK12: "/admin/student-info?tab=general&subTab=students",
    defaultHrefPreschool: "/admin/student-info?tab=preschool&subTab=students",
    milestoneGroup: "WORK",
  },
  {
    stageNumber: 3,
    code: "STAGE_3_ASSIGNMENT",
    shortName: "3. Phân công GV",
    name: "Giáo vụ phân công & xác nhận phân công",
    description: "Phân công giáo viên chấm/khảo sát theo môn, khối, hệ và xác nhận công bố nhiệm vụ cho GV.",
    responsibleRoles: [
      "ADMIN",
      "KHAO_THI",
      "KT_DBCL",
      "KTDBCL",
      "TB_DHCM",
      "BAN_DHCM",
      "GIAO_VU",
      "GIAO_VU_CS",
    ],
    responsibleLabel: "Giáo vụ Cơ sở • KT&ĐBCL",
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
    responsibleRoles: [
      "TEACHER",
      "GV",
      "GV_MN",
      "GVNN",
      "GIAO_VIEN",
      "ADMIN",
      "KHAO_THI",
      "KT_DBCL",
      "KTDBCL",
      "TB_DHCM",
      "BAN_DHCM",
      "GIAO_VU",
      "GIAO_VU_CS",
    ],
    responsibleLabel: "Giáo viên khảo sát • Giáo vụ",
    confirmButtonLabel: "Xác nhận hoàn thành đánh giá",
    defaultHrefK12: "/admin/ket-qua-khao-sat?tab=general&subTab=batch",
    defaultHrefPreschool: "/admin/ket-qua-khao-sat?tab=preschool&subTab=batch",
    milestoneGroup: "WORK",
  },
  {
    stageNumber: 5,
    code: "STAGE_5_ORIENTATION",
    shortName: "5. Bản định hướng",
    name: "Hoàn thành bản định hướng kết quả",
    description: "Phỏng vấn học sinh, trao đổi PHHS, tham vấn tâm lý (nếu có) và hoàn thiện bản định hướng.",
    responsibleRoles: [
      "TEACHER",
      "GV",
      "GV_MN",
      "GIAO_VIEN",
      "GIAO_VU",
      "GIAO_VU_CS",
      "GDCS",
      "GĐCS",
      "GD_CS",
      "GĐ_CS",
      "BGH",
      "BGH_CS",
      "BGH_MN",
      "ADMIN",
      "KHAO_THI",
      "KT_DBCL",
      "KTDBCL",
      "TB_DHCM",
      "BAN_DHCM",
    ],
    responsibleLabel: "GV Định hướng • Hội đồng",
    confirmButtonLabel: "Xác nhận hoàn thành định hướng",
    defaultHrefK12: "/admin/ket-qua-khao-sat?tab=general&subTab=batch&focus=orientation",
    defaultHrefPreschool: "/admin/ket-qua-khao-sat?tab=preschool&subTab=batch&focus=orientation",
    milestoneGroup: "WORK",
  },
  {
    stageNumber: 6,
    code: "STAGE_6_APPROVAL",
    shortName: "6. Thẩm định & Duyệt",
    name: "Thẩm định, xét duyệt và kết luận",
    description: "Thẩm định kết quả khảo sát + bản định hướng, phê duyệt kết luận tuyển sinh (Đạt / Cam kết / Không đạt / KS lại).",
    responsibleRoles: [
      "GDCS",
      "GĐCS",
      "GD_CS",
      "GĐ_CS",
      "BGH",
      "BGH_CS",
      "BGH_MN",
      "BGH_MAM_NON",
      "ADMIN",
      "KHAO_THI",
      "KT_DBCL",
      "KTDBCL",
      "TB_DHCM",
      "BAN_DHCM",
    ],
    responsibleLabel: "Giám đốc Cơ sở • BGH",
    confirmButtonLabel: "Phê duyệt kết luận",
    defaultHrefK12: "/admin/xet-duyet-ket-qua?tab=k12",
    defaultHrefPreschool: "/admin/xet-duyet-ket-qua?tab=preschool",
    milestoneGroup: "APPROVAL",
  },
  {
    stageNumber: 7,
    code: "STAGE_7_HANDOVER",
    shortName: "7. Văn bản & Bàn giao",
    name: "Xuất văn bản & bàn giao Tư vấn",
    description: "Chuẩn bị văn bản (Thư chúc mừng / Bản cam kết / Thông báo KQ), bàn giao Tư vấn gửi PHHS & theo dõi nhập học.",
    responsibleRoles: [
      "ADMIN",
      "KHAO_THI",
      "KT_DBCL",
      "KTDBCL",
      "TB_DHCM",
      "BAN_DHCM",
      "GIAO_VU",
      "GIAO_VU_CS",
      "GDCS",
      "GĐCS",
      "GD_CS",
      "GĐ_CS",
      "TVAN",
      "TU_VAN",
      "TVTS",
      "TUYEN_SINH",
    ],
    responsibleLabel: "Giáo vụ • KT&ĐBCL • Tư vấn",
    confirmButtonLabel: "Xác nhận bàn giao Tư vấn",
    defaultHrefK12: "/admin/input-assessments/reports?tab=k12",
    defaultHrefPreschool: "/admin/input-assessments/reports?tab=preschool",
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
 * Định tuyến Liên kết Xử lý Trực tiếp thông minh theo Vai trò & giữ nguyên Bộ lọc ngữ cảnh
 */
export function resolveEntranceStageHref(params: {
  stageNumber: number;
  isPreschool?: boolean;
  userRole?: string | null;
  isSuperAdmin?: boolean;
  periodId?: string | null;
  batchId?: string | null;
  campusCode?: string | null;
  grade?: string | null;
  studentCode?: string | null;
  studentId?: string | null;
}): string {
  const {
    stageNumber,
    isPreschool = false,
    userRole,
    isSuperAdmin = false,
    periodId,
    batchId,
    campusCode,
    grade,
    studentCode,
    studentId,
  } = params;

  const isPureTeacher =
    !isSuperAdmin &&
    isTeacherEntranceRole(userRole) &&
    !isKtdbclEntranceRole(userRole) &&
    !isGiaoVuEntranceRole(userRole) &&
    !isGdcsOrBghEntranceRole(userRole);
  const isTuVan = !isSuperAdmin && isTuVanEntranceRole(userRole);

  let baseUrl = "";
  switch (stageNumber) {
    case 1:
      baseUrl = isPreschool
        ? "/admin/student-info?tab=preschool&subTab=periods"
        : "/admin/student-info?tab=general&subTab=periods";
      break;
    case 2:
      baseUrl = isPreschool
        ? "/admin/student-info?tab=preschool&subTab=students"
        : "/admin/student-info?tab=general&subTab=students";
      break;
    case 3:
      if (isTuVan) {
        baseUrl = isPreschool
          ? "/admin/student-info?tab=preschool&subTab=handover"
          : "/admin/student-info?tab=general&subTab=handover";
      } else {
        baseUrl = isPreschool
          ? "/admin/phan-cong-khao-sat?tab=preschool"
          : "/admin/phan-cong-khao-sat?tab=k12";
      }
      break;
    case 4:
      if (isPureTeacher) {
        baseUrl = isPreschool
          ? "/teacher/input-assessments?type=preschool"
          : "/teacher/input-assessments?type=general";
      } else {
        baseUrl = isPreschool
          ? "/admin/ket-qua-khao-sat?tab=preschool&subTab=batch"
          : "/admin/ket-qua-khao-sat?tab=general&subTab=batch";
      }
      break;
    case 5:
      if (isPureTeacher) {
        baseUrl = isPreschool
          ? "/teacher/input-assessments?type=preschool"
          : "/teacher/input-assessments?type=general";
      } else {
        baseUrl = isPreschool
          ? "/admin/ket-qua-khao-sat?tab=preschool&subTab=batch&focus=orientation"
          : "/admin/ket-qua-khao-sat?tab=general&subTab=batch&focus=orientation";
      }
      break;
    case 6:
      if (isTuVan) {
        baseUrl = isPreschool
          ? "/admin/ket-qua-khao-sat?tab=preschool&subTab=result"
          : "/admin/ket-qua-khao-sat?tab=general&subTab=result";
      } else {
        baseUrl = isPreschool
          ? "/admin/xet-duyet-ket-qua?tab=preschool"
          : "/admin/xet-duyet-ket-qua?tab=k12";
      }
      break;
    case 7:
    default:
      if (isTuVan) {
        baseUrl = isPreschool
          ? "/admin/ket-qua-khao-sat?tab=preschool&subTab=result"
          : "/admin/ket-qua-khao-sat?tab=general&subTab=result";
      } else {
        baseUrl = isPreschool
          ? "/admin/input-assessments/reports?tab=preschool"
          : "/admin/input-assessments/reports?tab=k12";
      }
      break;
  }

  const [pathname, existingQuery = ""] = baseUrl.split("?");
  const qs = new URLSearchParams(existingQuery);
  const appendIfValid = (key: string, val?: string | null) => {
    const clean = String(val || "").trim();
    if (clean && clean !== "ALL") {
      qs.set(key, clean);
    }
  };

  appendIfValid("periodId", periodId);
  appendIfValid("batchId", batchId);
  appendIfValid("campusCode", campusCode);
  appendIfValid("grade", grade);
  appendIfValid("studentCode", studentCode);
  appendIfValid("studentId", studentId);

  const queryStr = qs.toString();
  return queryStr ? `${pathname}?${queryStr}` : pathname;
}

/**
 * Kiểm tra phân quyền vai trò thực hiện xác nhận từng công đoạn tại Backend & Frontend
 */
export function canUserConfirmStage(
  userRole?: string | null,
  stageNumber?: number,
  isSuperAdmin?: boolean
): boolean {
  if (isSuperAdmin || isSuperAdminRole(userRole) || isKtdbclEntranceRole(userRole)) {
    return true;
  }
  const norm = normalizeEntranceRole(userRole);
  if (!norm) return false;

  // Quy tắc cứng: Bước 6 (Thẩm định & Phê duyệt kết luận) tuyệt đối không cấp cho Giáo vụ hoặc Tư vấn
  if (stageNumber === 6) {
    return isGdcsOrBghEntranceRole(norm);
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
