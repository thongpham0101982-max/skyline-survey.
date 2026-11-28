import { prisma } from "@/lib/db";
import {
  ENTRANCE_WORKFLOW_STAGES,
  EntranceStageStatus,
  CompletionMilestone,
  NotificationDeliveryStatus,
  EntranceExceptionType,
  DeadlineAlertLevel,
  canUserConfirmStage,
  getStageDefinition,
  isApprovedPassResult,
  isOfficiallyApprovedConclusion,
  resolveEntranceStageHref,
  isCampusScopedEntranceRole,
  isSuperAdminRole,
} from "./constants";
import { ensureEntranceProgressSchema } from "./schemaInit";

export interface StageStateItem {
  stageNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  code: string;
  shortName: string;
  name: string;
  status: EntranceStageStatus;
  responsibleLabel: string;
  assignedNames?: string[];
  assignedSummary?: string | null;
  assignedTooltip?: string | null;
  detailText: string;
  actionHref: string;
  confirmedByName?: string | null;
  confirmedByRole?: string | null;
  confirmedAt?: string | null;
  note?: string | null;
}

export interface StageAssigneesContext {
  sessionCreatorName?: string | null;
  sessionExaminerItems?: {
    userId?: string | null;
    fullName: string;
    subjectName?: string | null;
    role?: string | null;
  }[];
  campusGiaoVuNames?: string[];
  campusTuVanNames?: string[];
  campusGdcsNames?: string[];
  campusBghPreschoolNames?: string[];
  preschoolAssessorNames?: string[];
}

export interface DeadlineAlertInfo {
  level: DeadlineAlertLevel;
  hoursRemaining: number | null;
  daysDiff: number | null;
  label: string;
  dueDateStr: string | null;
}

export interface StudentProgressRow {
  id: string;
  studentCode: string;
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  grade: string;
  educationSystem: string;
  campusCode: string;
  campusName: string;
  isPreschool: boolean;
  periodId: string;
  periodName: string;
  batchId: string | null;
  batchName: string;
  batchStartDate: string | null;
  batchEndDate: string | null;
  isAbsent: boolean;
  admissionCriteria: string | null;
  admissionResult: string | null;
  directorNote: string | null;
  signatureName: string | null;
  exceptionType: EntranceExceptionType;
  isRetest: boolean;
  retestCount: number;
  assignedTeachersCount: number;
  assignedSubjectsCount: number;
  evaluatedSubjectsCount: number;
  assignedTeacherNames: string[];
  orientationStatus: string;
  orientationInterviewer: string | null;
  proposedEduSystem: string | null;
  stages: StageStateItem[];
  currentStageNumber: number;
  currentStageName: string;
  overallProgressPct: number;
  // Phân biệt 3 mốc hoàn thành
  isWorkCompleted: boolean;
  isApprovalCompleted: boolean;
  isNotificationCompleted: boolean;
  completionMilestone: CompletionMilestone;
  // Tách trạng thái Đã gửi vs PHHS đã nhận/đọc
  deliveryStatus: NotificationDeliveryStatus;
  isNotificationSent: boolean;
  isParentRead: boolean;
  parentReadAt: string | null;
  canIssueCongratulation: boolean;
  handoverDocuments: string[];
  deadlineAlert: DeadlineAlertInfo;
}

export interface BatchProgressRow {
  id: string;
  periodId: string;
  periodCode: string;
  periodName: string;
  batchNumber: number;
  batchName: string;
  isPreschool: boolean;
  campusId: string | null;
  campusCode: string;
  campusName: string;
  assignedUserId: string | null;
  assignedUserName: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  totalStudents: number;
  workCompletedCount: number;
  approvalCompletedCount: number;
  notificationSentCount: number;
  parentReadCount: number;
  needsAdjustmentCount: number;
  exemptOrExceptionCount: number;
  retestCount: number;
  overallProgressPct: number;
  deadlineAlert: DeadlineAlertInfo;
  stageSummaries: {
    stageNumber: number;
    shortName: string;
    status: EntranceStageStatus;
    completedCount: number;
    inProgressCount: number;
    needsAdjustmentCount: number;
    notStartedCount: number;
    notApplicableCount: number;
    completionPct: number;
    confirmedByName?: string | null;
    confirmedAt?: string | null;
  }[];
}

export interface AssigneeTaskRow {
  assigneeKey: string;
  userId: string;
  fullName: string;
  role: string;
  roleLabel: string;
  campusName: string;
  stageNumber: number;
  stageName: string;
  periodId: string;
  periodName: string;
  batchId: string | null;
  batchName: string;
  isPreschool: boolean;
  scopeDescription: string;
  totalStudents: number;
  completedStudents: number;
  inProgressStudents: number;
  needsAdjustmentStudents: number;
  notStartedStudents: number;
  completionPct: number;
  isConfirmedComplete: boolean;
  confirmedAt: string | null;
  deadlineAlert: DeadlineAlertInfo;
  actionHref: string;
}

export interface BacklogItem {
  id: string;
  studentId: string;
  studentCode: string;
  fullName: string;
  isPreschool: boolean;
  grade: string;
  educationSystem: string;
  campusName: string;
  periodId: string;
  periodName: string;
  batchId: string | null;
  batchName: string;
  bottleneckStageNumber: number;
  bottleneckStageName: string;
  stageStatus: EntranceStageStatus;
  reason: string;
  responsibleRoleLabel: string;
  assigneeNames: string;
  deadlineAlert: DeadlineAlertInfo;
  exceptionType: EntranceExceptionType;
  actionHref: string;
}

// ============================================================================
// 1. PURE HELPER FUNCTIONS (HÀM THUẦN TÚY DÙNG CHO CẢ ENGINE & UNIT TESTS)
// ============================================================================

/**
 * Tính toán cảnh báo hạn (Đúng hạn / Gần hạn <= 48h / Quá hạn / Hoàn thành)
 */
export function computeDeadlineAlert(
  startDate?: Date | string | null,
  endDate?: Date | string | null,
  isCompleted: boolean = false,
  now: Date = new Date()
): DeadlineAlertInfo {
  if (isCompleted) {
    return {
      level: "COMPLETED",
      hoursRemaining: null,
      daysDiff: 0,
      label: "Đã hoàn tất",
      dueDateStr: endDate ? new Date(endDate).toISOString() : null,
    };
  }

  if (!endDate) {
    return {
      level: "ON_TRACK",
      hoursRemaining: null,
      daysDiff: null,
      label: "Trong hạn",
      dueDateStr: null,
    };
  }

  const endObj = new Date(endDate);
  if (isNaN(endObj.getTime())) {
    return {
      level: "ON_TRACK",
      hoursRemaining: null,
      daysDiff: null,
      label: "Trong hạn",
      dueDateStr: null,
    };
  }

  // Đặt hạn cuối ngày (23:59:59) nếu endDate chỉ có phần ngày
  const endEndOfDay = new Date(endObj);
  if (
    endEndOfDay.getHours() === 0 &&
    endEndOfDay.getMinutes() === 0 &&
    endEndOfDay.getSeconds() === 0
  ) {
    endEndOfDay.setHours(23, 59, 59, 999);
  }

  const diffMs = endEndOfDay.getTime() - now.getTime();
  const hoursRemaining = Math.round(diffMs / (1000 * 60 * 60));
  const daysDiff = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    const overdueDays = Math.max(1, Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24))));
    return {
      level: "OVERDUE",
      hoursRemaining,
      daysDiff,
      label: `Quá hạn ${overdueDays} ngày`,
      dueDateStr: endEndOfDay.toISOString(),
    };
  }

  // Gần hạn: còn <= 48 giờ (2 ngày)
  if (hoursRemaining <= 48) {
    return {
      level: "DUE_SOON",
      hoursRemaining,
      daysDiff,
      label: hoursRemaining <= 24 ? `Gần hạn (${Math.max(1, hoursRemaining)}h)` : "Gần hạn (≤ 2 ngày)",
      dueDateStr: endEndOfDay.toISOString(),
    };
  }

  return {
    level: "ON_TRACK",
    hoursRemaining,
    daysDiff,
    label: `Còn ${daysDiff} ngày`,
    dueDateStr: endEndOfDay.toISOString(),
  };
}

/**
 * Kiểm tra xem học sinh có đủ điều kiện phát hành Thư chúc mừng hay không.
 * QUY TẮC KIỂM SOÁT BẮT BUỘC:
 * - Không phát hành thư chúc mừng khi chưa có kết luận Đạt đã phê duyệt (Bước 6 phải COMPLETED và kết luận thuộc nhóm Đạt).
 */
export function canIssueCongratulationLetter(
  admissionResult?: string | null,
  stage6Status?: EntranceStageStatus
): boolean {
  if (stage6Status !== "COMPLETED") return false;
  return isApprovedPassResult(admissionResult);
}

/**
 * Kiểm tra điều kiện hợp lệ trước khi thực hiện xác nhận từng công đoạn tại Backend.
 */
export function validateWorkflowActionRules(params: {
  stageNumber: number;
  action: "CONFIRM" | "REQUEST_ADJUSTMENT" | "SET_EXCEPTION" | "UPDATE_DELIVERY";
  userRole: string;
  isSuperAdmin?: boolean;
  admissionResult?: string | null;
  documentTypes?: string[];
  deliveryStatus?: NotificationDeliveryStatus;
  stage4Status?: EntranceStageStatus;
  stage5Status?: EntranceStageStatus;
  stage6Status?: EntranceStageStatus;
  exceptionType?: EntranceExceptionType;
  hasAssignments?: boolean;
  hasScores?: boolean;
}): { valid: boolean; error?: string } {
  const {
    stageNumber,
    action,
    userRole,
    isSuperAdmin,
    admissionResult,
    documentTypes = [],
    stage6Status,
    exceptionType,
    hasAssignments,
    hasScores,
  } = params;

  // 1. Kiểm tra phân quyền vai trò
  if (!canUserConfirmStage(userRole, stageNumber, isSuperAdmin)) {
    const stageDef = getStageDefinition(stageNumber);
    return {
      valid: false,
      error: `Vai trò "${userRole || "Không xác định"}" không có thẩm quyền xác nhận tại công đoạn "${stageDef.name}" (Yêu cầu: ${stageDef.responsibleLabel}).`,
    };
  }

  // 2. Nếu là yêu cầu điều chỉnh hoặc thiết lập ngoại lệ thì cho phép nếu đúng quyền
  if (action === "REQUEST_ADJUSTMENT" || action === "SET_EXCEPTION") {
    return { valid: true };
  }

  // 3. Kiểm tra quy tắc riêng của từng công đoạn khi CONFIRM / UPDATE_DELIVERY
  if (stageNumber === 3 && hasAssignments === false) {
    return {
      valid: false,
      error: "Chưa có phân công giáo viên khảo sát nào trong đợt để xác nhận công bố.",
    };
  }

  if (stageNumber === 4 && hasScores === false && exceptionType !== "EXEMPT") {
    return {
      valid: false,
      error: "Giáo viên chưa nhập điểm/nhận xét đánh giá cho học sinh nên chưa thể xác nhận hoàn thành đánh giá.",
    };
  }

  if (stageNumber === 6) {
    // Không cho phép tự động phê duyệt chỉ vì GV đã nhập đủ điểm: bắt buộc phải có kết luận tuyển sinh rõ ràng
    if (!isOfficiallyApprovedConclusion(admissionResult)) {
      return {
        valid: false,
        error: "Không được phép phê duyệt khi chưa chọn Kết luận tuyển sinh chính thức (Đạt / Đạt cam kết / Học thử / Miễn KS / Không đạt). Hệ thống không tự động phê duyệt chỉ dựa trên điểm GV đã nhập.",
      };
    }
  }

  if (stageNumber === 7 || stageNumber === 8) {
    const approved = stage6Status === "COMPLETED" && isOfficiallyApprovedConclusion(admissionResult);
    if (!approved) {
      return {
        valid: false,
        error: "Hồ sơ học sinh chưa có Kết luận xét duyệt được phê duyệt ở Công đoạn 6. Không thể bàn giao văn bản hoặc gửi thông báo kết quả.",
      };
    }

    const wantsCongratLetter = documentTypes.some(
      (d) =>
        d === "CONGRATULATION_LETTER" ||
        d.toLowerCase().includes("chúc mừng") ||
        d.toLowerCase().includes("chuc mung")
    );
    if (wantsCongratLetter && !canIssueCongratulationLetter(admissionResult, stage6Status)) {
      return {
        valid: false,
        error: `Không được phép phát hành Thư chúc mừng khi học sinh chưa có kết luận ĐẠT đã phê duyệt (Kết luận hiện tại: "${admissionResult || "Chưa duyệt"}").`,
      };
    }
  }

  return { valid: true };
}

/**
 * Chuẩn hóa tên khối để so khớp phân công K-12
 */
function normalizeGradeNum(g?: string | null): string {
  if (!g) return "";
  return String(g).toLowerCase().replace("khối", "").replace("khoi", "").replace("k", "").trim();
}

/**
 * So khớp khối Mầm non
 */
function matchesPreschoolGradeSimple(stGrade?: string | null, taGrade?: string | null): boolean {
  const st = String(stGrade || "").toLowerCase().trim();
  const ta = String(taGrade || "").toLowerCase().trim();
  if (!ta || ta === "tất cả" || ta === "all") return true;
  if (!st) return false;
  if (st === ta || st.includes(ta) || ta.includes(st)) return true;
  return false;
}

const GENERIC_ROLE_LABELS = new Set([
  "kt&đbcl",
  "ban kt&đbcl",
  "giáo vụ",
  "giáo vụ cơ sở",
  "tư vấn",
  "tư vấn tuyển sinh",
  "giáo viên",
  "giáo viên khảo sát",
  "gv định hướng",
  "gđcs",
  "bgh",
  "cán bộ điều hành",
  "hệ thống",
]);

function normalizePersonComparisonKey(rawName: string): string {
  return rawName
    .toLowerCase()
    .normalize("NFC")
    .replace(/^(thầy|cô|ông|bà|mr\.?|ms\.?|mrs\.?)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericRolePlaceholder(rawName: string): boolean {
  const norm = rawName.toLowerCase().normalize("NFC").trim();
  if (!norm || norm === "—") return true;
  if (GENERIC_ROLE_LABELS.has(norm)) return true;
  if (
    norm.startsWith("giáo vụ /") ||
    norm.startsWith("gđcs /") ||
    norm.startsWith("giám đốc cơ sở ") ||
    norm.includes("•")
  ) {
    return true;
  }
  return false;
}

/**
 * Chuẩn hóa & khử trùng lặp danh sách Họ tên GV / Cán bộ phụ trách (ưu tiên tên thật trước nhãn bộ phận)
 */
export function dedupePersonNames(candidates: Array<string | null | undefined>): string[] {
  const realNames: string[] = [];
  const fallbackLabels: string[] = [];
  const seenKeys = new Set<string>();

  for (const item of candidates) {
    const cleaned = String(item || "").replace(/\s+/g, " ").trim();
    if (!cleaned || cleaned === "—") continue;
    const key = normalizePersonComparisonKey(cleaned);
    if (!key || seenKeys.has(key)) continue;
    seenKeys.add(key);

    if (isGenericRolePlaceholder(cleaned)) {
      fallbackLabels.push(cleaned);
    } else {
      realNames.push(cleaned);
    }
  }

  return realNames.length > 0 ? realNames : fallbackLabels;
}

export function formatAssigneeSummary(names: string[]): string | null {
  if (!names || names.length === 0) return null;
  if (names.length === 1) return names[0];
  return `${names[0]} (+${names.length - 1})`;
}

function isOrientationAssignmentSubject(subj: any): boolean {
  const code = String(subj?.code || "").toUpperCase().trim();
  const name = String(subj?.name || "").toLowerCase().normalize("NFC");
  return (
    ["DH", "PV", "PVDH", "PDHDV", "DINH_HUONG", "KSDH", "TDTD"].includes(code) ||
    name.includes("định hướng") ||
    name.includes("phỏng vấn")
  );
}

function isPsychologyAssignmentSubject(subj: any): boolean {
  const code = String(subj?.code || "").toUpperCase().trim();
  const name = String(subj?.name || "").toLowerCase().normalize("NFC");
  return code === "TLY" || name.includes("tâm lý");
}

export function matchesEducationSystemCodeOrName(
  stSysRaw?: string | null,
  assignSysRaw?: string | null,
  aliasMap?: Map<string, Iterable<string>>
): boolean {
  const st = String(stSysRaw || "").toLowerCase().normalize("NFC").trim();
  const asg = String(assignSysRaw || "").toLowerCase().normalize("NFC").trim();
  if (!asg || asg === "tất cả" || asg === "all" || !st) return true;
  if (st === asg || st.includes(asg) || asg.includes(st)) return true;

  // Đối chiếu bí danh mã Hệ đào tạo phổ biến của Sky-Line (HNS, HNG, SN, HNQT, QT...)
  const builtinGroups = [
    ["hns", "hội nhập chuẩn", "hệ hội nhập chuẩn", "hội nhập sky-line", "tiêu chuẩn"],
    ["hng", "hội nhập toàn cầu", "hệ hội nhập toàn cầu"],
    ["hnqt", "hội nhập quốc tế"],
    ["sn", "song ngữ"],
    ["sl", "song bằng", "hệ song bằng"],
    ["qt", "quốc tế", "chương trình quốc tế"],
  ];
  for (const grp of builtinGroups) {
    const stIn = grp.some((k) => st === k || st.includes(k));
    const asgIn = grp.some((k) => asg === k || asg.includes(k));
    if (stIn && asgIn) return true;
  }

  if (aliasMap) {
    const aliases = aliasMap.get(asg);
    if (aliases) {
      for (const al of aliases) {
        if (st === al || st.includes(al) || al.includes(st)) return true;
      }
    }
  }
  return false;
}

/**
 * Nhận diện loại ngoại lệ của học sinh từ dữ liệu thực tế + bản ghi xác nhận
 */
export function detectStudentExceptionType(
  student: any,
  confirmationsMap: Map<string, any>,
  studentCodeCountMap: Map<string, number>,
  hasPendingUnlockRequest: boolean
): { exceptionType: EntranceExceptionType; isRetest: boolean; retestCount: number } {
  const sCode = String(student.studentCode || "").trim().toUpperCase();
  const codeCount = sCode ? studentCodeCountMap.get(sCode) || 1 : 1;
  const noteLower = String(student.directorNote || "").toLowerCase();
  const resLower = String(student.admissionResult || "").toLowerCase();
  const criteriaLower = String(student.admissionCriteria || student.targetType || "").toLowerCase();

  // Kiểm tra override ngoại lệ từ bảng xác nhận
  for (let stg = 1; stg <= 8; stg++) {
    const conf = confirmationsMap.get(`STUDENT_${student.id}_${stg}`);
    if (conf?.exceptionType && conf.exceptionType !== "NONE") {
      const isRetestFlag =
        conf.exceptionType === "RETEST" ||
        codeCount > 1 ||
        noteLower.includes("kiểm tra lại") ||
        resLower.includes("kiểm tra lại");
      return {
        exceptionType: conf.exceptionType as EntranceExceptionType,
        isRetest: isRetestFlag,
        retestCount: Math.max(codeCount, isRetestFlag ? 2 : 1),
      };
    }
  }

  const isRetest =
    codeCount > 1 ||
    noteLower.includes("kiểm tra lại") ||
    noteLower.includes("khảo sát lại") ||
    resLower.includes("kiểm tra lại") ||
    resLower.includes("khảo sát lại");

  if (student.isAbsent) {
    return { exceptionType: "ABSENT", isRetest, retestCount: codeCount };
  }

  if (
    criteriaLower.includes("miễn") ||
    criteriaLower.includes("mien") ||
    criteriaLower.includes("tuyển thẳng") ||
    resLower.includes("miễn")
  ) {
    return { exceptionType: "EXEMPT", isRetest, retestCount: codeCount };
  }

  if (hasPendingUnlockRequest || resLower.includes("điều chỉnh")) {
    return { exceptionType: "AMENDMENT", isRetest, retestCount: codeCount };
  }

  if (isRetest) {
    return { exceptionType: "RETEST", isRetest: true, retestCount: Math.max(2, codeCount) };
  }

  return { exceptionType: "NONE", isRetest: false, retestCount: 1 };
}

/**
 * Đánh giá trạng thái 8 công đoạn của 1 học sinh từ dữ liệu thực tế SSM + bảng xác nhận
 */
export function evaluateStudent8Stages(params: {
  student: any;
  isPreschool: boolean;
  period: any;
  batch: any;
  campusName: string;
  campusCode: string;
  matchedAssignments: any[];
  orientationRecord: any;
  preschoolDevScoresCount: number;
  confirmationsMap: Map<string, any>;
  studentCodeCountMap: Map<string, number>;
  stageAssigneesContext?: StageAssigneesContext;
  viewerRole?: string | null;
  isSuperAdmin?: boolean;
  now?: Date;
}): StudentProgressRow {
  const {
    student,
    isPreschool,
    period,
    batch,
    campusName,
    campusCode,
    matchedAssignments,
    orientationRecord,
    preschoolDevScoresCount,
    confirmationsMap,
    studentCodeCountMap,
    stageAssigneesContext,
    viewerRole = null,
    isSuperAdmin = false,
    now = new Date(),
  } = params;

  const getConf = (stageNum: number) =>
    confirmationsMap.get(`STUDENT_${student.id}_${stageNum}`) ||
    (batch?.id ? confirmationsMap.get(`BATCH_${batch.id}_${stageNum}`) : null) ||
    confirmationsMap.get(`PERIOD_${period?.id}_${stageNum}`);

  const getStudentOnlyConf = (stageNum: number) =>
    confirmationsMap.get(`STUDENT_${student.id}_${stageNum}`);

  const hasPendingUnlock = matchedAssignments.some(
    (a) => a.unlockRequestStatus === "PENDING"
  );

  const { exceptionType, isRetest, retestCount } = detectStudentExceptionType(
    student,
    confirmationsMap,
    studentCodeCountMap,
    hasPendingUnlock
  );

  const isExempt = exceptionType === "EXEMPT";
  const eduSystem =
    student.surveyFormType ||
    student.surveySystem ||
    (isPreschool ? "Mầm non" : "Tiêu chuẩn");
  const gradeStr = student.grade ? String(student.grade) : isPreschool ? "Mầm non" : "—";

  // --- CÔNG ĐOẠN 1: TẠO ĐỢT KHẢO SÁT ---
  const conf1 = getConf(1);
  let stage1Status: EntranceStageStatus = "COMPLETED";
  if (conf1?.status === "NEEDS_ADJUSTMENT") {
    stage1Status = "NEEDS_ADJUSTMENT";
  } else if (!period?.id) {
    stage1Status = "NOT_STARTED";
  } else if (!batch?.id && !period?.startDate) {
    stage1Status = "IN_PROGRESS";
  }

  // --- CÔNG ĐOẠN 2: NHẬP DANH SÁCH HỌC SINH ---
  const conf2 = getConf(2);
  const hasBasicInfo = Boolean(
    student.fullName &&
      student.studentCode &&
      (student.grade || isPreschool)
  );
  let stage2Status: EntranceStageStatus = hasBasicInfo ? "COMPLETED" : "IN_PROGRESS";
  if (conf2?.status === "NEEDS_ADJUSTMENT") {
    stage2Status = "NEEDS_ADJUSTMENT";
  } else if (conf2?.status === "COMPLETED") {
    stage2Status = "COMPLETED";
  }

  // --- CÔNG ĐOẠN 3: GIÁO VỤ PHÂN CÔNG & XÁC NHẬN HOÀN THÀNH PHÂN CÔNG ---
  const conf3 = getConf(3);
  const sessionExaminerItems = stageAssigneesContext?.sessionExaminerItems || [];
  const allAssignedUserIds = new Set<string>();
  for (const a of matchedAssignments) {
    if (a.delegatedUserId) allAssignedUserIds.add(a.delegatedUserId);
    else if (a.userId) allAssignedUserIds.add(a.userId);
  }
  for (const ex of sessionExaminerItems) {
    if (ex.userId) allAssignedUserIds.add(ex.userId);
    else if (ex.fullName) allAssignedUserIds.add(ex.fullName);
  }

  const assignedTeachersCount = allAssignedUserIds.size;
  const assignedSubjectsCount = isPreschool
    ? matchedAssignments.length > 0 || sessionExaminerItems.length > 0
      ? 1
      : 0
    : Math.max(
        new Set(matchedAssignments.map((a) => a.subjectId).filter(Boolean)).size,
        sessionExaminerItems.length > 0 ? 1 : 0
      );
  const assignedTeacherNames = dedupePersonNames([
    ...matchedAssignments.map(
      (a) => a.delegatedUser?.fullName || a.user?.fullName || a.teacherName
    ),
    ...matchedAssignments.map((a) => a.user?.fullName),
    ...sessionExaminerItems.map((ex) => ex.fullName),
  ]);

  let stage3Status: EntranceStageStatus = "NOT_STARTED";
  if (isExempt) {
    stage3Status = "NOT_APPLICABLE";
  } else if (conf3?.status === "NEEDS_ADJUSTMENT") {
    stage3Status = "NEEDS_ADJUSTMENT";
  } else if (conf3?.status === "COMPLETED") {
    stage3Status = assignedTeachersCount > 0 ? "COMPLETED" : "IN_PROGRESS";
  } else if (assignedTeachersCount > 0) {
    // Đã có bản ghi phân công GV trong hệ thống
    stage3Status = "COMPLETED";
  }

  // --- CÔNG ĐOẠN 4: GIÁO VIÊN NHẬP KẾT QUẢ & XÁC NHẬN HOÀN THÀNH ĐÁNH GIÁ ---
  const conf4 = getStudentOnlyConf(4) || getConf(4);
  const studentScores = Array.isArray(student.scores) ? student.scores : [];
  let validScoredSubjectCount = 0;

  let hasInProgressSubject = false;
  const scoredSubIds = new Set<string>();
  if (!isPreschool) {
    for (const sc of studentScores) {
      let hasVal = false;
      let isTciSubjectRecord = false;
      let isTciSignedCompleted = false;

      // Kiểm tra metadata môn TCI (16 tiêu chí + bắt buộc ký xác nhận mới tính Hoàn thành)
      if (sc.comments) {
        try {
          const parsedComments = JSON.parse(sc.comments || "[]");
          if (Array.isArray(parsedComments)) {
            for (const cItem of parsedComments) {
              if (typeof cItem === "string" && cItem.includes('"_tciMeta"')) {
                const metaObj = JSON.parse(cItem);
                if (metaObj?._tciMeta) {
                  isTciSubjectRecord = true;
                  isTciSignedCompleted =
                    metaObj._tciMeta.signatureStatus === "SIGNED" &&
                    metaObj._tciMeta.evaluationStatus === "COMPLETED" &&
                    Number(metaObj._tciMeta.countEvaluated || 0) >= 16;
                }
              }
            }
          }
        } catch {
          // ignore
        }
      }

      try {
        const parsed = JSON.parse(sc.scores || "[]");
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        const nonEmptyCount = arr.filter(
          (x) => x !== null && x !== undefined && String(x).trim() !== ""
        ).length;
        hasVal = nonEmptyCount > 0;
        if (!isTciSubjectRecord && arr.length === 16) {
          const looksLikeTci = arr.some(
            (x) => x === "Đạt" || x === "Không đạt" || x === "Không làm"
          );
          if (looksLikeTci) {
            isTciSubjectRecord = true;
            isTciSignedCompleted = nonEmptyCount === 16;
          }
        }
      } catch {
        hasVal = Boolean(sc.scores && String(sc.scores).trim() !== "");
      }

      if (isTciSubjectRecord) {
        if (isTciSignedCompleted && sc.subjectId) {
          scoredSubIds.add(sc.subjectId);
        } else if (hasVal) {
          hasInProgressSubject = true;
        }
      } else if (hasVal && sc.subjectId) {
        scoredSubIds.add(sc.subjectId);
      }
    }
    // Ngoài bảng StudentAssessmentScore, kiểm tra các cột điểm trực tiếp trên InputAssessmentStudent
    const directScoresCount = [
      student.mathScore,
      student.literatureScore,
      student.writtenEnglishScore,
      student.oralEnglishScore,
      student.psychologyScore,
    ].filter((v) => v !== null && v !== undefined && String(v).trim() !== "").length;

    validScoredSubjectCount = Math.max(scoredSubIds.size, directScoresCount);
  } else {
    const hasPreschoolEval =
      preschoolDevScoresCount > 0 ||
      Boolean(student.devAssessmentResult) ||
      Boolean(student.devProfessionalComment) ||
      Boolean(student.probationaryResult);
    validScoredSubjectCount = hasPreschoolEval ? 1 : 0;
  }

  const requiredSubCount = Math.max(1, assignedSubjectsCount);
  let stage4Status: EntranceStageStatus = "NOT_STARTED";
  if (isExempt) {
    stage4Status = "NOT_APPLICABLE";
  } else if (student.isAbsent || conf4?.status === "NEEDS_ADJUSTMENT" || hasPendingUnlock) {
    stage4Status = "NEEDS_ADJUSTMENT";
  } else if (hasInProgressSubject && validScoredSubjectCount < requiredSubCount) {
    stage4Status = "IN_PROGRESS";
  } else if (conf4?.status === "COMPLETED" && validScoredSubjectCount > 0 && !hasInProgressSubject) {
    stage4Status = "COMPLETED";
  } else if (validScoredSubjectCount >= requiredSubCount && validScoredSubjectCount > 0) {
    stage4Status = "COMPLETED";
  } else if (validScoredSubjectCount > 0 || hasInProgressSubject) {
    stage4Status = "IN_PROGRESS";
  }

  // --- CÔNG ĐOẠN 5: HOÀN THÀNH BẢN ĐỊNH HƯỚNG KẾT QUẢ ---
  const conf5 = getStudentOnlyConf(5);
  let stage5Status: EntranceStageStatus = "NOT_STARTED";
  let orientationStatusLabel = "Chưa tạo";
  let orientationInterviewer: string | null = null;
  let proposedEduSystem: string | null = null;

  if (conf5?.status === "NOT_APPLICABLE") {
    stage5Status = "NOT_APPLICABLE";
    orientationStatusLabel = "Không áp dụng";
  } else if (conf5?.status === "NEEDS_ADJUSTMENT") {
    stage5Status = "NEEDS_ADJUSTMENT";
    orientationStatusLabel = "Cần điều chỉnh";
  } else if (!isPreschool) {
    if (orientationRecord) {
      orientationInterviewer = orientationRecord.interviewerName || null;
      proposedEduSystem = orientationRecord.proposedEduSystem || null;
      const isPsychPending = orientationRecord.psychologyReferralStatus === "REQUESTED";
      const hasCoreOrientationContent = Boolean(
        orientationRecord.studentStrengths ||
          orientationRecord.interviewerGeneralRemark ||
          orientationRecord.proposedEduSystem ||
          orientationRecord.proposedClassPlacement ||
          orientationRecord.parentExpectations
      );
      if (isPsychPending) {
        stage5Status = "IN_PROGRESS";
        orientationStatusLabel = "Chờ tham vấn Tâm lý";
      } else if (
        orientationRecord.status === "COMPLETED" ||
        conf5?.status === "COMPLETED" ||
        hasCoreOrientationContent
      ) {
        stage5Status = "COMPLETED";
        orientationStatusLabel = "Đã hoàn thành";
      } else {
        stage5Status = "IN_PROGRESS";
        orientationStatusLabel = "Đang soạn (Nháp)";
      }
    } else if (conf5?.status === "COMPLETED") {
      stage5Status = "COMPLETED";
      orientationStatusLabel = "Đã xác nhận";
    } else if (isExempt) {
      stage5Status = "NOT_APPLICABLE";
      orientationStatusLabel = "Miễn khảo sát";
    }
  } else {
    // Mầm non: Bản định hướng tích hợp trong nhận xét chuyên môn & tâm lý phát triển của trẻ
    const hasPreschoolOrientation = Boolean(
      student.devProfessionalComment ||
        student.devPsychologyComment ||
        student.devAssessmentResult ||
        student.probationaryComment
    );
    if (conf5?.status === "COMPLETED" || hasPreschoolOrientation) {
      stage5Status = "COMPLETED";
      orientationStatusLabel = "Đã hoàn thành (MN)";
    } else if (preschoolDevScoresCount > 0) {
      stage5Status = "IN_PROGRESS";
      orientationStatusLabel = "Đang tổng hợp nhận xét";
    }
  }

  // --- CÔNG ĐOẠN 6: THẨM ĐỊNH, XÉT DUYỆT VÀ KẾT LUẬN ---
  // QUY TẮC KIỂM SOÁT: Không cho phép tự động phê duyệt Bước 6 chỉ vì GV đã nhập đủ điểm!
  const conf6 = getStudentOnlyConf(6);
  const effectiveStudentResult =
    student.admissionResult ||
    (isPreschool
      ? student.devAssessmentResult || (student.probationaryResult === "DAT" ? "Đạt" : null)
      : null);
  const hasApprovedConclusion =
    isOfficiallyApprovedConclusion(effectiveStudentResult) ||
    (isPreschool && (student.gdcsApprovalStatus === "APPROVED" || student.bghApprovalStatus === "APPROVED"));

  // ĐỒNG BỘ LOGIC PHỄU (FUNNEL CONSISTENCY):
  // Đối với các hồ sơ lịch sử / xét tuyển thẳng / chuyển ngang ĐÃ có kết luận phê duyệt chính thức ở Bước 6
  // nhưng trước đó không đi qua bảng phân công / bản định hướng trực tuyến (trạng thái đang là NOT_STARTED,
  // KHÔNG can thiệp nếu đang NEEDS_ADJUSTMENT hoặc Vắng khảo sát), chuẩn hóa sang NOT_APPLICABLE / COMPLETED
  // để tránh hiện tượng "Đã duyệt 67% nhưng Hoàn thành chuyên môn chỉ 14%".
  if (hasApprovedConclusion && conf6?.status !== "NEEDS_ADJUSTMENT") {
    if (stage3Status === "NOT_STARTED") {
      stage3Status = validScoredSubjectCount > 0 ? "COMPLETED" : "NOT_APPLICABLE";
    }
    if (stage4Status === "NOT_STARTED" && !student.isAbsent) {
      stage4Status = validScoredSubjectCount > 0 ? "COMPLETED" : "NOT_APPLICABLE";
    }
    if (stage5Status === "NOT_STARTED") {
      stage5Status = "NOT_APPLICABLE";
      orientationStatusLabel = "Theo hồ sơ xét duyệt";
    }
  }

  // Kiểm tra mốc: Hoàn thành công việc chuyên môn (Bước 1 -> 5)
  // Đủ kết quả (Bước 4 COMPLETED/NOT_APPLICABLE) và bản định hướng (Bước 5 COMPLETED/NOT_APPLICABLE) -> Chuyển thẩm định
  const isStage4Done = stage4Status === "COMPLETED" || stage4Status === "NOT_APPLICABLE";
  const isStage5Done = stage5Status === "COMPLETED" || stage5Status === "NOT_APPLICABLE";
  const isWorkCompleted =
    stage1Status === "COMPLETED" &&
    stage2Status === "COMPLETED" &&
    (stage3Status === "COMPLETED" || stage3Status === "NOT_APPLICABLE") &&
    isStage4Done &&
    isStage5Done;

  let stage6Status: EntranceStageStatus = "NOT_STARTED";
  if (conf6?.status === "NEEDS_ADJUSTMENT") {
    stage6Status = "NEEDS_ADJUSTMENT";
  } else if (hasApprovedConclusion) {
    stage6Status = "COMPLETED";
  } else if (isWorkCompleted || validScoredSubjectCount > 0) {
    // Đủ kết quả & định hướng -> Tự động chuyển sang trạng thái "Chờ thẩm định" (IN_PROGRESS), KHÔNG tự động COMPLETED!
    stage6Status = "IN_PROGRESS";
  }

  const isApprovalCompleted = stage6Status === "COMPLETED";
  const canIssueCongratulation = canIssueCongratulationLetter(
    effectiveStudentResult,
    stage6Status
  );

  // --- CÔNG ĐOẠN 7: BÀN GIAO KẾT QUẢ, VĂN BẢN CHO TƯ VẤN ---
  const conf7 = getStudentOnlyConf(7) || (isApprovalCompleted ? confirmationsMap.get(`BATCH_${batch?.id}_7`) : null);
  let stage7Status: EntranceStageStatus = "NOT_STARTED";
  let handoverDocuments: string[] = [];

  const mapDocLabel = (raw: string): string => {
    const trimmed = String(raw || "").trim();
    if (trimmed === "CONGRATULATION_LETTER") return "Thư chúc mừng";
    if (trimmed === "COMMITMENT_LETTER") return "Bản cam kết";
    if (trimmed === "RESULT_NOTICE") return "Thông báo kết quả khảo sát";
    return trimmed;
  };

  if (conf7?.documentTypes) {
    try {
      const parsed = JSON.parse(conf7.documentTypes);
      handoverDocuments = (Array.isArray(parsed) ? parsed : [parsed]).map(mapDocLabel).filter(Boolean);
    } catch {
      handoverDocuments = String(conf7.documentTypes).split(",").map(mapDocLabel).filter(Boolean);
    }
  } else if (isApprovalCompleted) {
    if (canIssueCongratulation) {
      handoverDocuments =
        String(effectiveStudentResult || "").toLowerCase().includes("cam kết")
          ? ["Thư chúc mừng", "Bản cam kết", "Phiếu kết quả"]
          : ["Thư chúc mừng", "Phiếu kết quả"];
    } else {
      handoverDocuments = ["Thông báo kết quả khảo sát"];
    }
  }

  if (conf7?.status === "NEEDS_ADJUSTMENT") {
    stage7Status = "NEEDS_ADJUSTMENT";
  } else if (conf7?.status === "COMPLETED") {
    stage7Status = "COMPLETED";
  } else if (isApprovalCompleted && student.enrollmentStatus) {
    // Nếu HS đã chuyển sang trạng thái tiếp nhận/nhập học thì công đoạn bàn giao Tư vấn đã hoàn thành
    stage7Status = "COMPLETED";
  } else if (isApprovalCompleted) {
    // Phê duyệt kết luận -> Cho phép chuẩn bị, bàn giao văn bản phù hợp
    stage7Status = "IN_PROGRESS";
  }

  // --- CÔNG ĐOẠN 8: TƯ VẤN GỬI THÔNG BÁO, THƯ CHÚC MỪNG/THƯ MỜI & XÁC NHẬN HOÀN THÀNH GỬI ---
  const conf8 = getStudentOnlyConf(8);
  let deliveryStatus: NotificationDeliveryStatus = "NOT_SENT";
  let parentReadAt: string | null = conf8?.parentReadAt || conf7?.parentReadAt || null;

  if (conf8?.deliveryStatus && conf8.deliveryStatus !== "NOT_SENT") {
    deliveryStatus = conf8.deliveryStatus as NotificationDeliveryStatus;
  } else if (conf7?.deliveryStatus && conf7.deliveryStatus !== "NOT_SENT") {
    deliveryStatus = conf7.deliveryStatus as NotificationDeliveryStatus;
  } else if (conf8?.status === "COMPLETED" || conf7?.status === "COMPLETED") {
    deliveryStatus = "SENT";
  } else if (student.enrollmentStatus === "ENROLLED" || student.enrollmentClassId) {
    deliveryStatus = "CONFIRMED";
  }

  let stage8Status: EntranceStageStatus = "NOT_STARTED";
  if (conf8?.status === "NEEDS_ADJUSTMENT") {
    stage8Status = "NEEDS_ADJUSTMENT";
  } else if (
    isApprovalCompleted &&
    (conf8?.status === "COMPLETED" ||
      deliveryStatus === "SENT" ||
      deliveryStatus === "DELIVERED" ||
      deliveryStatus === "READ" ||
      deliveryStatus === "CONFIRMED")
  ) {
    stage8Status = "COMPLETED";
  } else if (stage7Status === "COMPLETED") {
    stage8Status = "IN_PROGRESS";
  }

  const isNotificationSent =
    stage7Status === "COMPLETED" ||
    (stage8Status === "COMPLETED" &&
      ["SENT", "DELIVERED", "READ", "CONFIRMED"].includes(deliveryStatus));
  const isParentRead = ["READ", "CONFIRMED"].includes(deliveryStatus);
  const isNotificationCompleted = stage7Status === "COMPLETED" || isNotificationSent;

  // Xác định mốc hoàn thành tổng thể (Phân biệt hoàn thành công việc, hoàn thành xét duyệt và hoàn thành thông báo)
  let completionMilestone: CompletionMilestone = "PENDING_WORK";
  if (isNotificationCompleted) {
    completionMilestone = "NOTIFICATION_COMPLETED";
  } else if (isApprovalCompleted) {
    completionMilestone = "APPROVAL_COMPLETED";
  } else if (isWorkCompleted) {
    completionMilestone = "WORK_COMPLETED";
  }

  const buildStageLink = (stageNum: number) =>
    resolveEntranceStageHref({
      stageNumber: stageNum,
      isPreschool,
      userRole: viewerRole,
      isSuperAdmin,
      periodId: period?.id || student.periodId,
      batchId: batch?.id || student.batchId || null,
      campusCode,
      grade: gradeStr !== "—" ? gradeStr : null,
      studentCode: student.studentCode || null,
      studentId: student.id,
    });

  // --- XÁC ĐỊNH HỌ TÊN GV / NGƯỜI PHỤ TRÁCH THEO PHÂN CÔNG GÁN CHO TỪNG CÔNG ĐOẠN (B1 -> B7) ---
  const sortedMatchedAssignments = [...matchedAssignments].sort((a, b) => {
    const aBatchMatch = student.batchId && a.batchId === student.batchId ? 1 : 0;
    const bBatchMatch = student.batchId && b.batchId === student.batchId ? 1 : 0;
    return bBatchMatch - aBatchMatch;
  });

  // Bước 1: Tạo đợt khảo sát
  const stage1AssignedNames = dedupePersonNames([
    conf1?.confirmedByName,
    stageAssigneesContext?.sessionCreatorName,
    batch?.assignedUser?.fullName,
    period?.assignedUser?.fullName,
    ...(stageAssigneesContext?.campusGiaoVuNames || []),
  ]);

  // Bước 2: Nhập danh sách & bàn giao Giáo vụ
  const stage2AssignedNames = dedupePersonNames([
    conf2?.confirmedByName,
    ...(stageAssigneesContext?.campusTuVanNames || []),
    batch?.assignedUser?.fullName,
    stageAssigneesContext?.sessionCreatorName,
    ...(stageAssigneesContext?.campusGiaoVuNames || []),
    period?.assignedUser?.fullName,
  ]);

  // Bước 3: Giáo vụ phân công & xác nhận phân công
  const stage3Coordinators = dedupePersonNames([
    conf3?.confirmedByName,
    batch?.assignedUser?.fullName,
    ...(stageAssigneesContext?.campusGiaoVuNames || []),
    period?.assignedUser?.fullName,
  ]);
  const stage3AssignedNames =
    stage3Status === "NOT_APPLICABLE"
      ? []
      : stage3Coordinators.length > 0
      ? stage3Coordinators
      : assignedTeacherNames;
  const stage3AssignedTooltip =
    stage3Status === "NOT_APPLICABLE"
      ? null
      : stage3Coordinators.length > 0 && assignedTeacherNames.length > 0
      ? `Phụ trách phân công: ${stage3Coordinators.join(", ")} • GV đã gán: ${assignedTeacherNames.join(", ")}`
      : assignedTeacherNames.length > 0
      ? `GV đã gán: ${assignedTeacherNames.join(", ")}`
      : stage3Coordinators.length > 0
      ? `Phụ trách phân công: ${stage3Coordinators.join(", ")}`
      : null;

  // Bước 4: Giáo viên nhập kết quả & xác nhận đánh giá
  let stage4AssignedNames: string[] = [];
  let stage4AssignedTooltip: string | null = null;
  if (stage4Status !== "NOT_APPLICABLE") {
    if (!isPreschool) {
      const evalSpecific = sortedMatchedAssignments.filter(
        (a) => !isOrientationAssignmentSubject(a.subject)
      );
      const effectiveEvalList =
        evalSpecific.length > 0 ? evalSpecific : sortedMatchedAssignments;

      stage4AssignedNames = dedupePersonNames([
        ...effectiveEvalList.map((a) => a.user?.fullName || a.teacherName),
        ...sessionExaminerItems.map((ex) => ex.fullName),
        ...studentScores.map((sc: any) => sc.teacherName),
        conf4?.confirmedByName,
      ]);

      const evalDetailParts: string[] = [];
      const seenPair = new Set<string>();
      for (const a of effectiveEvalList) {
        const tName = String(a.user?.fullName || a.teacherName || "").trim();
        if (!tName) continue;
        const subName = a.subject?.name || "Môn KS";
        const pairKey = `${tName}__${a.subjectId || subName}`;
        if (seenPair.has(pairKey)) continue;
        seenPair.add(pairKey);
        const isScored = a.subjectId ? scoredSubIds.has(a.subjectId) : false;
        evalDetailParts.push(
          `${tName} (${subName} - ${isScored ? "Đã chấm" : "Chưa chấm"})`
        );
      }
      for (const ex of sessionExaminerItems) {
        const tName = String(ex.fullName || "").trim();
        if (!tName) continue;
        const pairKey = `${tName}__${ex.subjectName || "EX"}`;
        if (seenPair.has(pairKey)) continue;
        seenPair.add(pairKey);
        evalDetailParts.push(
          ex.subjectName ? `${tName} (${ex.subjectName})` : tName
        );
      }
      for (const sc of studentScores) {
        const tName = String(sc.teacherName || "").trim();
        if (!tName) continue;
        const subName = sc.subject?.name || "Đã chấm";
        const pairKey = `${tName}__${sc.subjectId || subName}`;
        if (seenPair.has(pairKey)) continue;
        seenPair.add(pairKey);
        evalDetailParts.push(`${tName} (${subName} - Đã chấm)`);
      }
      stage4AssignedTooltip =
        evalDetailParts.length > 0
          ? evalDetailParts.join(", ")
          : stage4AssignedNames.join(", ") || null;
    } else {
      stage4AssignedNames = dedupePersonNames([
        ...sortedMatchedAssignments.map(
          (a) => a.delegatedUser?.fullName || a.user?.fullName || a.teacherName
        ),
        ...sortedMatchedAssignments.map((a) => a.user?.fullName),
        ...sessionExaminerItems.map((ex) => ex.fullName),
        ...(stageAssigneesContext?.preschoolAssessorNames || []),
        student.probationaryTeacher,
        conf4?.confirmedByName,
      ]);
      const mnParts: string[] = [];
      for (const a of sortedMatchedAssignments) {
        if (
          a.delegatedUser?.fullName &&
          a.user?.fullName &&
          a.delegatedUser.fullName !== a.user.fullName
        ) {
          mnParts.push(
            `${a.delegatedUser.fullName} (Nhận ủy quyền từ ${a.user.fullName})`
          );
        } else if (a.user?.fullName) {
          mnParts.push(a.user.fullName);
        }
      }
      stage4AssignedTooltip =
        mnParts.length > 0
          ? mnParts.join(", ")
          : stage4AssignedNames.join(", ") || null;
    }
  }

  // Bước 5: Hoàn thành bản định hướng kết quả
  let stage5AssignedNames: string[] = [];
  let stage5AssignedTooltip: string | null = null;
  if (stage5Status !== "NOT_APPLICABLE") {
    if (!isPreschool) {
      const psychTeachers = dedupePersonNames([
        orientationRecord?.psychologyTeacherName,
        ...sortedMatchedAssignments
          .filter((a) => isPsychologyAssignmentSubject(a.subject))
          .map((a) => a.user?.fullName || a.teacherName),
      ]);
      const orientSubjTeachers = dedupePersonNames(
        sortedMatchedAssignments
          .filter((a) => isOrientationAssignmentSubject(a.subject))
          .map((a) => a.user?.fullName || a.teacherName)
      );
      const fallbackOrientTeachers = dedupePersonNames([
        ...sortedMatchedAssignments
          .filter((a) => !isPsychologyAssignmentSubject(a.subject))
          .map((a) => a.user?.fullName || a.teacherName),
        ...sessionExaminerItems.map((ex) => ex.fullName),
      ]);
      const resolvedOrientPool =
        orientSubjTeachers.length > 0
          ? orientSubjTeachers
          : fallbackOrientTeachers;

      if (orientationRecord?.psychologyReferralStatus === "REQUESTED") {
        stage5AssignedNames = dedupePersonNames([
          ...psychTeachers,
          orientationInterviewer,
          conf5?.confirmedByName,
          ...resolvedOrientPool,
        ]);
        stage5AssignedTooltip = [
          psychTeachers.length > 0
            ? `GV Tâm lý phụ trách: ${psychTeachers.join(", ")}`
            : null,
          orientationInterviewer || resolvedOrientPool.length > 0
            ? `GV Định hướng: ${
                orientationInterviewer || resolvedOrientPool.join(", ")
              }`
            : null,
        ]
          .filter(Boolean)
          .join(" • ");
      } else {
        stage5AssignedNames = dedupePersonNames([
          orientationInterviewer,
          conf5?.confirmedByName,
          ...resolvedOrientPool,
          ...(orientationRecord?.psychologyTeacherName
            ? [orientationRecord.psychologyTeacherName]
            : []),
        ]);
        stage5AssignedTooltip = stage5AssignedNames.join(", ") || null;
      }
    } else {
      stage5AssignedNames = dedupePersonNames([
        conf5?.confirmedByName,
        ...sortedMatchedAssignments.map(
          (a) => a.delegatedUser?.fullName || a.user?.fullName || a.teacherName
        ),
        ...(stageAssigneesContext?.preschoolAssessorNames || []),
        student.probationaryTeacher,
      ]);
      stage5AssignedTooltip = stage5AssignedNames.join(", ") || null;
    }
  }

  // Bước 6: Thẩm định, xét duyệt và kết luận
  const campusApprovers = isPreschool
    ? [
        ...(stageAssigneesContext?.campusBghPreschoolNames || []),
        ...(stageAssigneesContext?.campusGdcsNames || []),
      ]
    : stageAssigneesContext?.campusGdcsNames || [];
  const actualStage6Signer = hasApprovedConclusion
    ? isPreschool
      ? student.gdcsApprovalUser || student.bghApprovalUser || student.signatureName
      : student.signatureName
    : null;
  const stage6AssignedNames = dedupePersonNames([
    conf6?.confirmedByName,
    actualStage6Signer,
    ...campusApprovers,
  ]);

  // Bước 7: Xuất văn bản & bàn giao Tư vấn
  const stage7AssignedNames = dedupePersonNames([
    conf7?.confirmedByName,
    batch?.assignedUser?.fullName,
    ...(stageAssigneesContext?.campusGiaoVuNames || []),
    ...(stageAssigneesContext?.campusTuVanNames || []),
    period?.assignedUser?.fullName,
  ]);

  const stages: StageStateItem[] = [
    {
      stageNumber: 1,
      code: "STAGE_1_BATCH",
      shortName: "1. Tạo đợt KS",
      name: "Tạo đợt khảo sát",
      status: stage1Status,
      responsibleLabel: "Ban KT&ĐBCL • Giáo vụ",
      assignedNames: stage1AssignedNames,
      assignedSummary: formatAssigneeSummary(stage1AssignedNames),
      assignedTooltip: stage1AssignedNames.join(", ") || null,
      detailText: batch?.name ? `${period?.name || ""} • ${batch.name}` : period?.name || "Đã tạo kỳ KS",
      actionHref: buildStageLink(1),
      confirmedByName: conf1?.confirmedByName || period?.assignedUser?.fullName || null,
      confirmedByRole: conf1?.confirmedByRole || null,
      confirmedAt: conf1?.confirmedAt || period?.createdAt || null,
      note: conf1?.note || null,
    },
    {
      stageNumber: 2,
      code: "STAGE_2_ROSTER",
      shortName: "2. Nhập & Bàn giao DS",
      name: "Nhập danh sách & bàn giao Giáo vụ",
      status: stage2Status,
      responsibleLabel: "Tư vấn • Giáo vụ • KT&ĐBCL",
      assignedNames: stage2AssignedNames,
      assignedSummary: formatAssigneeSummary(stage2AssignedNames),
      assignedTooltip: stage2AssignedNames.join(", ") || null,
      detailText: `${student.studentCode} • Khối ${gradeStr} (${eduSystem})`,
      actionHref: buildStageLink(2),
      confirmedByName: conf2?.confirmedByName || null,
      confirmedByRole: conf2?.confirmedByRole || null,
      confirmedAt: conf2?.confirmedAt || student.createdAt || null,
      note: conf2?.note || null,
    },
    {
      stageNumber: 3,
      code: "STAGE_3_ASSIGNMENT",
      shortName: "3. Phân công GV",
      name: "Giáo vụ phân công & xác nhận phân công",
      status: stage3Status,
      responsibleLabel: "Giáo vụ Cơ sở • KT&ĐBCL",
      assignedNames: stage3AssignedNames,
      assignedSummary: formatAssigneeSummary(stage3AssignedNames),
      assignedTooltip: stage3AssignedTooltip,
      detailText:
        stage3Status === "NOT_APPLICABLE"
          ? isExempt
            ? "Miễn khảo sát"
            : "Theo hồ sơ xét duyệt"
          : assignedTeachersCount > 0
          ? `${assignedTeachersCount} GV (${assignedSubjectsCount} môn)`
          : "Chưa phân công GV",
      actionHref: buildStageLink(3),
      confirmedByName: conf3?.confirmedByName || null,
      confirmedByRole: conf3?.confirmedByRole || null,
      confirmedAt: conf3?.confirmedAt || null,
      note: conf3?.note || null,
    },
    {
      stageNumber: 4,
      code: "STAGE_4_EVALUATION",
      shortName: "4. GV đánh giá",
      name: "Giáo viên nhập kết quả & xác nhận đánh giá",
      status: stage4Status,
      responsibleLabel: "Giáo viên khảo sát • Giáo vụ",
      assignedNames: stage4AssignedNames,
      assignedSummary: formatAssigneeSummary(stage4AssignedNames),
      assignedTooltip: stage4AssignedTooltip,
      detailText:
        stage4Status === "NOT_APPLICABLE"
          ? isExempt
            ? "Miễn khảo sát"
            : "Theo hồ sơ xét duyệt"
          : student.isAbsent
          ? "Vắng khảo sát"
          : `${validScoredSubjectCount}/${requiredSubCount} môn có KQ`,
      actionHref: buildStageLink(4),
      confirmedByName:
        conf4?.confirmedByName ||
        studentScores[0]?.teacherName ||
        stage4AssignedNames[0] ||
        null,
      confirmedByRole: conf4?.confirmedByRole || "TEACHER",
      confirmedAt: conf4?.confirmedAt || studentScores[0]?.updatedAt || null,
      note: conf4?.note || null,
    },
    {
      stageNumber: 5,
      code: "STAGE_5_ORIENTATION",
      shortName: "5. Bản định hướng",
      name: "Hoàn thành bản định hướng kết quả",
      status: stage5Status,
      responsibleLabel: "GV Định hướng • Hội đồng",
      assignedNames: stage5AssignedNames,
      assignedSummary: formatAssigneeSummary(stage5AssignedNames),
      assignedTooltip: stage5AssignedTooltip,
      detailText: orientationStatusLabel + (proposedEduSystem ? ` • Đề xuất: ${proposedEduSystem}` : ""),
      actionHref: buildStageLink(5),
      confirmedByName: conf5?.confirmedByName || orientationInterviewer || null,
      confirmedByRole: conf5?.confirmedByRole || null,
      confirmedAt: conf5?.confirmedAt || orientationRecord?.updatedAt || null,
      note: conf5?.note || null,
    },
    {
      stageNumber: 6,
      code: "STAGE_6_APPROVAL",
      shortName: "6. Thẩm định & Duyệt",
      name: "Thẩm định, xét duyệt và kết luận",
      status: stage6Status,
      responsibleLabel: "Giám đốc Cơ sở • BGH",
      assignedNames: stage6AssignedNames,
      assignedSummary: formatAssigneeSummary(stage6AssignedNames),
      assignedTooltip: stage6AssignedNames.join(", ") || null,
      detailText: hasApprovedConclusion
        ? `Kết luận: ${effectiveStudentResult || student.admissionResult}`
        : stage6Status === "IN_PROGRESS"
        ? "Chờ GĐCS/BGH thẩm định"
        : "Chưa đủ ĐK thẩm định",
      actionHref: buildStageLink(6),
      confirmedByName: conf6?.confirmedByName || actualStage6Signer || null,
      confirmedByRole: conf6?.confirmedByRole || "GDCS",
      confirmedAt: conf6?.confirmedAt || student.gdcsApprovalDate || null,
      note: conf6?.note || student.directorNote || null,
    },
    {
      stageNumber: 7,
      code: "STAGE_7_HANDOVER",
      shortName: "7. Văn bản & Bàn giao",
      name: "Xuất văn bản & bàn giao Tư vấn",
      status: stage7Status,
      responsibleLabel: "Giáo vụ • KT&ĐBCL • Tư vấn",
      assignedNames: stage7AssignedNames,
      assignedSummary: formatAssigneeSummary(stage7AssignedNames),
      assignedTooltip: stage7AssignedNames.join(", ") || null,
      detailText:
        stage7Status === "COMPLETED"
          ? `Đã bàn giao (${handoverDocuments.join(", ") || "Hồ sơ KQ"})`
          : stage7Status === "IN_PROGRESS"
          ? `Sẵn sàng bàn giao (${handoverDocuments.join(", ")})`
          : "Chờ kết luận phê duyệt",
      actionHref: buildStageLink(7),
      confirmedByName: conf7?.confirmedByName || null,
      confirmedByRole: conf7?.confirmedByRole || null,
      confirmedAt: conf7?.confirmedAt || null,
      note: conf7?.note || null,
    },
  ];

  // Tính % tiến độ trên các bước có áp dụng
  const applicableStages = stages.filter((s) => s.status !== "NOT_APPLICABLE");
  const completedStagesCount = applicableStages.filter((s) => s.status === "COMPLETED").length;
  const overallProgressPct =
    applicableStages.length > 0
      ? Math.round((completedStagesCount / applicableStages.length) * 100)
      : 100;

  // Tìm công đoạn hiện tại đang xử lý hoặc bị nghẽn
  const activeStage =
    stages.find((s) => s.status === "NEEDS_ADJUSTMENT") ||
    stages.find((s) => s.status === "IN_PROGRESS") ||
    stages.find((s) => s.status === "NOT_STARTED") ||
    stages[stages.length - 1];

  const deadlineAlert = computeDeadlineAlert(
    batch?.startDate || period?.startDate,
    batch?.endDate || period?.endDate,
    isNotificationCompleted,
    now
  );

  return {
    id: student.id,
    studentCode: student.studentCode || "—",
    fullName: student.fullName || "—",
    dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString() : null,
    gender: student.gender || null,
    grade: gradeStr,
    educationSystem: eduSystem,
    campusCode,
    campusName,
    isPreschool,
    periodId: period?.id || student.periodId,
    periodName: period?.name || "Kỳ khảo sát",
    batchId: batch?.id || student.batchId || null,
    batchName: batch?.name || "Đợt chung",
    batchStartDate: batch?.startDate
      ? new Date(batch.startDate).toISOString()
      : period?.startDate
      ? new Date(period.startDate).toISOString()
      : null,
    batchEndDate: batch?.endDate
      ? new Date(batch.endDate).toISOString()
      : period?.endDate
      ? new Date(period.endDate).toISOString()
      : null,
    isAbsent: Boolean(student.isAbsent),
    admissionCriteria: student.admissionCriteria || student.targetType || null,
    admissionResult: student.admissionResult || null,
    directorNote: student.directorNote || null,
    signatureName: student.signatureName || student.gdcsApprovalUser || null,
    exceptionType,
    isRetest,
    retestCount,
    assignedTeachersCount,
    assignedSubjectsCount,
    evaluatedSubjectsCount: validScoredSubjectCount,
    assignedTeacherNames: dedupePersonNames([
      ...assignedTeacherNames,
      ...stage4AssignedNames,
      ...stage5AssignedNames,
    ]),
    orientationStatus: orientationStatusLabel,
    orientationInterviewer,
    proposedEduSystem,
    stages,
    currentStageNumber: activeStage.stageNumber,
    currentStageName: activeStage.shortName,
    overallProgressPct,
    isWorkCompleted,
    isApprovalCompleted,
    isNotificationCompleted,
    completionMilestone,
    deliveryStatus,
    isNotificationSent,
    isParentRead,
    parentReadAt,
    canIssueCongratulation,
    handoverDocuments,
    deadlineAlert,
  };
}

// ============================================================================
// 2. SERVICE TỔNG HỢP DỮ LIỆU DASHBOARD ĐIỀU HÀNH TỪ CSDL THỰC TẾ
// ============================================================================

export async function getEntranceProgressDashboardData(filters: {
  academicYearId?: string;
  level?: "ALL" | "K12" | "PRESCHOOL";
  periodId?: string;
  batchId?: string;
  campusCode?: string;
  educationSystem?: string;
  grade?: string;
  stageNumber?: number;
  stageStatus?: string;
  milestoneFilter?: string;
  alertFilter?: string;
  search?: string;
  viewerRole?: string | null;
  isSuperAdmin?: boolean;
  allowedCampusCodes?: string[];
}) {
  await ensureEntranceProgressSchema();
  const pAny = prisma as any;
  const now = new Date();
  const allowedCampusSet =
    Array.isArray(filters.allowedCampusCodes) && filters.allowedCampusCodes.length > 0
      ? new Set(
          filters.allowedCampusCodes
            .map((c) => String(c || "").toUpperCase().trim())
            .filter(Boolean)
        )
      : null;

  // 1. Lấy Năm học mặc định nếu chưa truyền
  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
  });
  const activeAcademicYearId =
    filters.academicYearId ||
    academicYears.find((y) => !y.isOff && y.status === "ACTIVE")?.id ||
    academicYears[0]?.id ||
    "";

  const campuses: any[] = await pAny.campus
    .findMany({
      where: { status: "ACTIVE" },
      include: {
        manager: { select: { id: true, fullName: true, role: true } },
        userAssignments: {
          include: {
            user: { select: { id: true, fullName: true, role: true } },
          },
        },
      },
      orderBy: { campusCode: "asc" },
    })
    .catch(() =>
      prisma.campus.findMany({
        where: { status: "ACTIVE" },
        orderBy: { campusCode: "asc" },
      })
    );
  const campusById = new Map<string, any>();
  const campusByCode = new Map<string, any>();
  for (const c of campuses) {
    campusById.set(c.id, c);
    if (c.campusCode) campusByCode.set(c.campusCode.toUpperCase(), c);
  }

  const resolveCampusInfo = (
    rawCampusId?: string | null,
    rawCampusStr?: string | null,
    fallbackText?: string | null
  ): { campusCode: string; campusName: string } => {
    if (rawCampusId && campusById.has(rawCampusId)) {
      const c = campusById.get(rawCampusId);
      return { campusCode: c.campusCode || "CS", campusName: c.campusName || c.campusCode };
    }
    const combined = `${rawCampusStr || ""} ${fallbackText || ""}`.toUpperCase();
    for (const [code, c] of campusByCode.entries()) {
      if (combined.includes(code) || (c.campusName && combined.includes(c.campusName.toUpperCase()))) {
        return { campusCode: code, campusName: c.campusName };
      }
    }
    if (combined.includes("RIVERSIDE") || combined.includes("CS1")) {
      return { campusCode: "CS1", campusName: "Sky-Line Riverside (CS1)" };
    }
    if (combined.includes("CENTRAL") || combined.includes("CS2")) {
      return { campusCode: "CS2", campusName: "Sky-Line Central (CS2)" };
    }
    if (combined.includes("GLOBAL") || combined.includes("CS3")) {
      return { campusCode: "CS3", campusName: "Sky-Line Global (CS3)" };
    }
    if (combined.includes("HILL") || combined.includes("CS4")) {
      return { campusCode: "CS4", campusName: "Sky-Line Hill (CS4)" };
    }
    if (combined.includes("BEACH") || combined.includes("CS5")) {
      return { campusCode: "CS5", campusName: "Sky-Line Beach (CS5)" };
    }
    return {
      campusCode: rawCampusStr || "ALL",
      campusName: rawCampusStr || "Toàn hệ thống",
    };
  };

  // 2. Truy vấn dữ liệu K-12 và Mầm non theo năm học
  const includeK12 = !filters.level || filters.level === "ALL" || filters.level === "K12";
  const includePreschool = !filters.level || filters.level === "ALL" || filters.level === "PRESCHOOL";

  const [
    k12Periods,
    preschoolPeriods,
    k12Students,
    preschoolStudents,
    k12Assignments,
    preschoolAssignments,
    orientationRecords,
    preschoolDevScoresGrouped,
    activeTeachers,
    eduSystemsList,
    assessmentSubjects,
    k12Sessions,
    preschoolSessions,
    preschoolScoreAssessors,
  ] = await Promise.all([
    includeK12
      ? pAny.inputAssessmentPeriod.findMany({
          where: activeAcademicYearId ? { academicYearId: activeAcademicYearId } : {},
          include: {
            campus: true,
            assignedUser: { select: { id: true, fullName: true, role: true, email: true } },
            batches: {
              include: {
                campus: true,
                assignedUser: { select: { id: true, fullName: true, role: true, email: true } },
              },
              orderBy: { batchNumber: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    includePreschool
      ? pAny.preschoolInputAssessmentPeriod.findMany({
          where: activeAcademicYearId ? { academicYearId: activeAcademicYearId } : {},
          include: {
            campus: true,
            assignedUser: { select: { id: true, fullName: true, role: true, email: true } },
            batches: {
              include: {
                campus: true,
                assignedUser: { select: { id: true, fullName: true, role: true, email: true } },
              },
              orderBy: { batchNumber: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    includeK12
      ? pAny.inputAssessmentStudent.findMany({
          where: activeAcademicYearId ? { period: { academicYearId: activeAcademicYearId } } : {},
          include: {
            scores: { include: { subject: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    includePreschool
      ? pAny.preschoolInputAssessmentStudent.findMany({
          where: activeAcademicYearId ? { period: { academicYearId: activeAcademicYearId } } : {},
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    includeK12
      ? pAny.inputAssessmentTeacherAssignment.findMany({
          where: activeAcademicYearId ? { period: { academicYearId: activeAcademicYearId } } : {},
          include: {
            user: { select: { id: true, fullName: true, role: true, email: true } },
            subject: { select: { id: true, code: true, name: true } },
          },
        })
      : Promise.resolve([]),
    includePreschool
      ? pAny.preschoolInputAssessmentTeacherAssignment.findMany({
          where: activeAcademicYearId ? { period: { academicYearId: activeAcademicYearId } } : {},
          include: {
            user: { select: { id: true, fullName: true, role: true, email: true } },
            delegatedUser: { select: { id: true, fullName: true, role: true, email: true } },
          },
        })
      : Promise.resolve([]),
    includeK12
      ? pAny.studentOrientationRecord
          .findMany({
            where: activeAcademicYearId
              ? { student: { period: { academicYearId: activeAcademicYearId } } }
              : {},
          })
          .catch(() => [])
      : Promise.resolve([]),
    includePreschool
      ? pAny.preschoolDevScore
          .groupBy({
            by: ["studentId"],
            _count: { id: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
    pAny.teacher
      ?.findMany({
        where: { status: "ACTIVE" },
        include: {
          campus: { select: { id: true, campusCode: true } },
          departmentRel: { select: { code: true, name: true } },
          user: { select: { id: true, fullName: true, role: true } },
        },
      })
      ?.catch(() => []) ?? Promise.resolve([]),
    pAny.educationSystem
      ?.findMany({
        where: activeAcademicYearId ? { academicYearId: activeAcademicYearId } : {},
        select: { code: true, name: true },
      })
      ?.catch(() => []) ?? Promise.resolve([]),
    pAny.assessmentSubject
      ?.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, code: true, name: true },
      })
      ?.catch(() => []) ?? Promise.resolve([]),
    includeK12
      ? pAny.inputAssessmentSession
          ?.findMany({
            where: activeAcademicYearId ? { academicYearId: activeAcademicYearId } : {},
            include: {
              examiners: {
                include: {
                  user: { select: { id: true, fullName: true, role: true } },
                },
              },
              studentSessions: { select: { studentId: true } },
            },
          })
          ?.catch(() => []) ?? Promise.resolve([])
      : Promise.resolve([]),
    includePreschool
      ? pAny.preschoolInputAssessmentSession
          ?.findMany({
            where: activeAcademicYearId ? { academicYearId: activeAcademicYearId } : {},
            include: {
              examiners: {
                include: {
                  user: { select: { id: true, fullName: true, role: true } },
                },
              },
              studentSessions: { select: { studentId: true } },
            },
          })
          ?.catch(() => []) ?? Promise.resolve([])
      : Promise.resolve([]),
    includePreschool
      ? pAny.preschoolDevScore
          ?.findMany({
            where: { assessorId: { not: null } },
            select: { studentId: true, assessorId: true },
            distinct: ["studentId", "assessorId"],
          })
          ?.catch(() => []) ?? Promise.resolve([])
      : Promise.resolve([]),
  ]);

  // Tra cứu Họ tên người tạo buổi khảo sát & GV nhập điểm Mầm non (nếu có ID người dùng)
  const extraUserIds = new Set<string>();
  for (const sess of [...(k12Sessions || []), ...(preschoolSessions || [])]) {
    if (sess?.createdById) extraUserIds.add(String(sess.createdById));
  }
  for (const row of preschoolScoreAssessors || []) {
    if (row?.assessorId) extraUserIds.add(String(row.assessorId));
  }
  const extraUserMap = new Map<string, string>();
  if (extraUserIds.size > 0 && pAny.user?.findMany) {
    const lookedUpUsers: any[] = await pAny.user
      .findMany({
        where: { id: { in: Array.from(extraUserIds) } },
        select: { id: true, fullName: true },
      })
      .catch(() => []);
    for (const u of lookedUpUsers || []) {
      if (u?.id && u?.fullName) extraUserMap.set(u.id, u.fullName);
    }
  }

  // Xây dựng bản đồ ánh xạ mã <-> tên hệ đào tạo (ví dụ: HNS <-> Hội nhập chuẩn, HNG <-> Hội nhập toàn cầu)
  const eduSystemAliasMap = new Map<string, string[]>();
  const registerEduAlias = (aRaw?: string | null, bRaw?: string | null) => {
    const a = String(aRaw || "").toLowerCase().trim();
    const b = String(bRaw || "").toLowerCase().trim();
    if (!a || !b) return;
    eduSystemAliasMap.set(a, Array.from(new Set([...(eduSystemAliasMap.get(a) || []), a, b])));
    eduSystemAliasMap.set(b, Array.from(new Set([...(eduSystemAliasMap.get(b) || []), b, a])));
  };
  registerEduAlias("hns", "hội nhập chuẩn");
  registerEduAlias("hns", "hệ hội nhập chuẩn");
  registerEduAlias("hng", "hội nhập toàn cầu");
  registerEduAlias("hng", "hệ hội nhập toàn cầu");
  registerEduAlias("sl", "song bằng");
  registerEduAlias("uk", "quốc tế anh");
  registerEduAlias("clc", "chất lượng cao");
  for (const sys of eduSystemsList || []) {
    registerEduAlias(sys?.code, sys?.name);
  }

  // Xây dựng danh mục môn khảo sát theo mã/tên để tra cứu cho Session Examiner
  const subjectByCodeOrName = new Map<string, { id: string; code: string; name: string }>();
  for (const subj of assessmentSubjects || []) {
    if (subj?.code) subjectByCodeOrName.set(String(subj.code).toUpperCase().trim(), subj);
    if (subj?.name) subjectByCodeOrName.set(String(subj.name).toUpperCase().trim(), subj);
  }

  // Xây dựng danh sách nhân sự phụ trách theo phân công Cơ sở (GĐCS, BGH MN, Giáo vụ, Tư vấn)
  const campusRoleRosterByCode = new Map<
    string,
    {
      gdcsNames: string[];
      bghPreschoolNames: string[];
      giaoVuNames: string[];
      tuVanNames: string[];
    }
  >();
  for (const c of campuses) {
    const code = String(c.campusCode || "").toUpperCase().trim();
    if (!code) continue;
    const gdcsRaw: Array<string | null | undefined> = [c.manager?.fullName];
    const bghMnRaw: Array<string | null | undefined> = [];
    const giaoVuRaw: Array<string | null | undefined> = [];
    const tuVanRaw: Array<string | null | undefined> = [];

    for (const ua of c.userAssignments || []) {
      const uName = ua?.user?.fullName;
      const uRole = String(ua?.user?.role || "").toUpperCase().trim();
      if (!uName) continue;
      if (["GDCS", "GIAM_DOC_CO_SO"].includes(uRole)) gdcsRaw.push(uName);
      if (["BGH_MN", "HIEU_TRUONG_MN", "BGH"].includes(uRole)) bghMnRaw.push(uName);
      if (["GIAO_VU", "GIAO_VU_CS", "KT_DBCL"].includes(uRole)) giaoVuRaw.push(uName);
      if (["TU_VAN", "TU_VAN_CS", "TUYEN_SINH"].includes(uRole)) tuVanRaw.push(uName);
    }

    for (const t of activeTeachers || []) {
      const tCampusCode = String(t.campus?.campusCode || "").toUpperCase().trim();
      if (tCampusCode !== code) continue;
      const tName = t.user?.fullName || t.fullName;
      if (!tName) continue;
      const tRole = String(t.user?.role || "").toUpperCase().trim();
      const deptText = `${t.departmentRel?.code || ""} ${t.departmentRel?.name || ""} ${t.department || ""}`.toLowerCase();

      if (["GDCS", "GIAM_DOC_CO_SO"].includes(tRole)) gdcsRaw.push(tName);
      if (["BGH_MN", "HIEU_TRUONG_MN", "BGH"].includes(tRole)) bghMnRaw.push(tName);
      if (
        ["GIAO_VU", "GIAO_VU_CS"].includes(tRole) ||
        deptText.includes("giáo vụ") ||
        deptText.includes("giao_vu")
      ) {
        giaoVuRaw.push(tName);
      }
      if (
        ["TU_VAN", "TU_VAN_CS", "TUYEN_SINH"].includes(tRole) ||
        deptText.includes("tư vấn") ||
        deptText.includes("tuyển sinh") ||
        deptText.includes("tu_van")
      ) {
        tuVanRaw.push(tName);
      }
    }

    if (c.manager?.fullName) bghMnRaw.push(c.manager.fullName);

    campusRoleRosterByCode.set(code, {
      gdcsNames: dedupePersonNames(gdcsRaw),
      bghPreschoolNames: dedupePersonNames(bghMnRaw),
      giaoVuNames: dedupePersonNames(giaoVuRaw),
      tuVanNames: dedupePersonNames(tuVanRaw),
    });
  }

  // Bản đồ giám khảo buổi khảo sát (Session Examiners) & Người tạo buổi KS
  const mapSessionsToLookup = (sessions: any[]) => {
    const byStudentId = new Map<string, any[]>();
    const byBatchId = new Map<string, any[]>();
    for (const sess of sessions || []) {
      if (sess?.batchId) {
        const arr = byBatchId.get(sess.batchId) || [];
        arr.push(sess);
        byBatchId.set(sess.batchId, arr);
      }
      for (const ss of sess?.studentSessions || []) {
        if (!ss?.studentId) continue;
        const arr = byStudentId.get(ss.studentId) || [];
        arr.push(sess);
        byStudentId.set(ss.studentId, arr);
      }
    }
    return { byStudentId, byBatchId };
  };

  const k12SessionLookup = mapSessionsToLookup(k12Sessions || []);
  const preschoolSessionLookup = mapSessionsToLookup(preschoolSessions || []);

  const extractSessionAssigneeInfo = (sessions: any[]) => {
    let sessionCreatorName: string | null = null;
    const examinerItems: NonNullable<StageAssigneesContext["sessionExaminerItems"]> = [];
    const seenKey = new Set<string>();
    for (const sess of sessions || []) {
      if (!sessionCreatorName && sess?.createdById && extraUserMap.has(sess.createdById)) {
        sessionCreatorName = extraUserMap.get(sess.createdById) || null;
      }
      for (const ex of sess?.examiners || []) {
        const fullName = ex?.user?.fullName || (ex?.userId ? extraUserMap.get(ex.userId) : null);
        if (!fullName) continue;
        const rawCode = String(ex?.subjectCode || "").trim();
        const matchedSubj = rawCode
          ? subjectByCodeOrName.get(rawCode.toUpperCase())
          : undefined;
        const key = `${ex?.userId || fullName}__${matchedSubj?.id || rawCode}`;
        if (seenKey.has(key)) continue;
        seenKey.add(key);
        examinerItems.push({
          userId: ex?.userId || null,
          fullName,
          subjectId: matchedSubj?.id || null,
          subjectCode: matchedSubj?.code || rawCode || null,
          subjectName: matchedSubj?.name || rawCode || null,
        });
      }
    }
    return { sessionCreatorName, sessionExaminerItems: examinerItems };
  };

  const preschoolAssessorsByStudentId = new Map<string, string[]>();
  for (const row of preschoolScoreAssessors || []) {
    const name = row?.assessorId ? extraUserMap.get(row.assessorId) : null;
    if (!row?.studentId || !name) continue;
    const prev = preschoolAssessorsByStudentId.get(row.studentId) || [];
    if (!prev.includes(name)) {
      prev.push(name);
      preschoolAssessorsByStudentId.set(row.studentId, prev);
    }
  }

  // 3. Truy vấn bảng xác nhận & audit logs
  let rawConfirmations: any[] = [];
  let rawAuditLogs: any[] = [];
  try {
    rawConfirmations = await pAny.$queryRawUnsafe(
      `SELECT * FROM "entrance_workflow_confirmations" ORDER BY "updatedAt" DESC`
    );
    rawAuditLogs = await pAny.$queryRawUnsafe(
      `SELECT * FROM "entrance_workflow_audit_logs" ORDER BY "createdAt" DESC LIMIT 500`
    );
  } catch (err) {
    console.warn("[getEntranceProgressDashboardData] Query confirmations warning:", err);
  }

  const confirmationsMap = new Map<string, any>();
  for (const c of rawConfirmations || []) {
    if (c.studentId) {
      const key = `STUDENT_${c.studentId}_${c.stageNumber}`;
      if (!confirmationsMap.has(key)) confirmationsMap.set(key, c);
    } else if (c.assignmentId) {
      const key = `ASSIGNMENT_${c.assignmentId}_${c.stageNumber}`;
      if (!confirmationsMap.has(key)) confirmationsMap.set(key, c);
    } else if (c.batchId) {
      const key = `BATCH_${c.batchId}_${c.stageNumber}`;
      if (!confirmationsMap.has(key)) confirmationsMap.set(key, c);
    } else if (c.periodId) {
      const key = `PERIOD_${c.periodId}_${c.stageNumber}`;
      if (!confirmationsMap.has(key)) confirmationsMap.set(key, c);
    }
  }

  // Bản đồ đếm số lần xuất hiện của studentCode để phát hiện hồ sơ khảo sát lại
  const studentCodeCountMap = new Map<string, number>();
  for (const s of [...k12Students, ...preschoolStudents]) {
    const code = String(s.studentCode || "").trim().toUpperCase();
    if (code) {
      studentCodeCountMap.set(code, (studentCodeCountMap.get(code) || 0) + 1);
    }
  }

  const orientationByStudentId = new Map<string, any>();
  for (const o of orientationRecords || []) {
    orientationByStudentId.set(o.studentId, o);
  }

  const preschoolScoreCountByStudentId = new Map<string, number>();
  for (const row of preschoolDevScoresGrouped || []) {
    preschoolScoreCountByStudentId.set(row.studentId, row._count?.id || 0);
  }

  const periodMap = new Map<string, { period: any; isPreschool: boolean }>();
  const batchMap = new Map<string, { batch: any; period: any; isPreschool: boolean }>();

  for (const p of k12Periods) {
    periodMap.set(p.id, { period: p, isPreschool: false });
    for (const b of p.batches || []) {
      batchMap.set(b.id, { batch: b, period: p, isPreschool: false });
    }
  }
  for (const p of preschoolPeriods) {
    periodMap.set(p.id, { period: p, isPreschool: true });
    for (const b of p.batches || []) {
      batchMap.set(b.id, { batch: b, period: p, isPreschool: true });
    }
  }

  // 4. Đánh giá tiến độ 8 bước cho từng học sinh
  const allStudentRows: StudentProgressRow[] = [];

  for (const st of k12Students) {
    const pEntry = periodMap.get(st.periodId);
    const bEntry = st.batchId ? batchMap.get(st.batchId) : null;
    const period = pEntry?.period;
    const batch = bEntry?.batch;
    const campusInfo = resolveCampusInfo(
      batch?.campusId || period?.campusId,
      st.admissionCampus || st.registeredCampus,
      `${batch?.name || ""} ${period?.name || ""}`
    );

    const stGradeNorm = normalizeGradeNum(st.grade);
    const stSysNorm = String(st.surveyFormType || st.surveySystem || "").toLowerCase().trim();

    let matchedAssignments = k12Assignments.filter((a: any) => {
      if (a.periodId !== st.periodId) return false;
      if (a.batchId && st.batchId && a.batchId !== st.batchId) return false;
      const aGradeNorm = normalizeGradeNum(a.grade);
      if (aGradeNorm && aGradeNorm !== "tất cả" && stGradeNorm && aGradeNorm !== stGradeNorm) {
        return false;
      }
      if (!matchesEducationSystemCodeOrName(stSysNorm, a.educationSystem, eduSystemAliasMap)) {
        return false;
      }
      return true;
    });

    // Dự phòng cho các đợt "Khảo sát lẻ" tạo riêng cho học sinh (batchId khớp trực tiếp)
    if (matchedAssignments.length === 0 && st.batchId) {
      matchedAssignments = k12Assignments.filter((a: any) => {
        if (a.periodId !== st.periodId || a.batchId !== st.batchId) return false;
        const aGradeNorm = normalizeGradeNum(a.grade);
        if (aGradeNorm && aGradeNorm !== "tất cả" && stGradeNorm && aGradeNorm !== stGradeNorm) {
          return false;
        }
        return true;
      });
    }

    const stuSessions =
      k12SessionLookup.byStudentId.get(st.id) ||
      (st.batchId ? k12SessionLookup.byBatchId.get(st.batchId) || [] : []);
    const { sessionCreatorName, sessionExaminerItems } = extractSessionAssigneeInfo(stuSessions);
    const campusRoster = campusRoleRosterByCode.get(
      String(campusInfo.campusCode || "").toUpperCase().trim()
    );

    const row = evaluateStudent8Stages({
      student: st,
      isPreschool: false,
      period,
      batch,
      campusName: campusInfo.campusName,
      campusCode: campusInfo.campusCode,
      matchedAssignments,
      orientationRecord: orientationByStudentId.get(st.id) || null,
      preschoolDevScoresCount: 0,
      confirmationsMap,
      studentCodeCountMap,
      stageAssigneesContext: {
        campusGdcsNames: campusRoster?.gdcsNames || [],
        campusBghPreschoolNames: campusRoster?.bghPreschoolNames || [],
        campusGiaoVuNames: campusRoster?.giaoVuNames || [],
        campusTuVanNames: campusRoster?.tuVanNames || [],
        sessionCreatorName,
        sessionExaminerItems,
      },
      viewerRole: filters.viewerRole,
      isSuperAdmin: filters.isSuperAdmin,
      now,
    });
    allStudentRows.push(row);
  }

  for (const st of preschoolStudents) {
    const pEntry = periodMap.get(st.periodId);
    const bEntry = st.batchId ? batchMap.get(st.batchId) : null;
    const period = pEntry?.period;
    const batch = bEntry?.batch;
    const campusInfo = resolveCampusInfo(
      batch?.campusId || period?.campusId,
      st.admissionCampus,
      `${batch?.name || ""} ${period?.name || ""}`
    );

    let matchedAssignments = preschoolAssignments.filter((a: any) => {
      if (a.periodId !== st.periodId) return false;
      if (a.batchId && st.batchId && a.batchId !== st.batchId) return false;
      return matchesPreschoolGradeSimple(st.grade, a.grade);
    });
    if (matchedAssignments.length === 0 && st.batchId) {
      matchedAssignments = preschoolAssignments.filter(
        (a: any) => a.periodId === st.periodId && a.batchId === st.batchId
      );
    }

    const stuSessions =
      preschoolSessionLookup.byStudentId.get(st.id) ||
      (st.batchId ? preschoolSessionLookup.byBatchId.get(st.batchId) || [] : []);
    const { sessionCreatorName, sessionExaminerItems } = extractSessionAssigneeInfo(stuSessions);
    const campusRoster = campusRoleRosterByCode.get(
      String(campusInfo.campusCode || "").toUpperCase().trim()
    );

    const row = evaluateStudent8Stages({
      student: st,
      isPreschool: true,
      period,
      batch,
      campusName: campusInfo.campusName,
      campusCode: campusInfo.campusCode,
      matchedAssignments,
      orientationRecord: null,
      preschoolDevScoresCount: preschoolScoreCountByStudentId.get(st.id) || 0,
      confirmationsMap,
      studentCodeCountMap,
      stageAssigneesContext: {
        campusGdcsNames: campusRoster?.gdcsNames || [],
        campusBghPreschoolNames: campusRoster?.bghPreschoolNames || [],
        campusGiaoVuNames: campusRoster?.giaoVuNames || [],
        campusTuVanNames: campusRoster?.tuVanNames || [],
        sessionCreatorName,
        sessionExaminerItems,
        preschoolAssessorNames: preschoolAssessorsByStudentId.get(st.id) || [],
      },
      viewerRole: filters.viewerRole,
      isSuperAdmin: filters.isSuperAdmin,
      now,
    });
    allStudentRows.push(row);
  }

  // Khoanh vùng theo Cơ sở phụ trách đối với tài khoản GĐCS / Giáo vụ / Tư vấn Cơ sở
  const campusScopedStudentRows = allowedCampusSet
    ? allStudentRows.filter(
        (r) =>
          r.campusCode === "ALL" ||
          allowedCampusSet.has(String(r.campusCode || "").toUpperCase().trim())
      )
    : allStudentRows;

  // 5. Áp dụng Bộ lọc trên danh sách Học sinh
  const filteredStudentRows = campusScopedStudentRows.filter((row) => {
    if (filters.periodId && filters.periodId !== "ALL" && row.periodId !== filters.periodId) {
      return false;
    }
    if (filters.batchId && filters.batchId !== "ALL" && row.batchId !== filters.batchId) {
      return false;
    }
    if (
      filters.campusCode &&
      filters.campusCode !== "ALL" &&
      row.campusCode.toUpperCase() !== filters.campusCode.toUpperCase()
    ) {
      return false;
    }
    if (
      filters.educationSystem &&
      filters.educationSystem !== "ALL" &&
      !row.educationSystem.toLowerCase().includes(filters.educationSystem.toLowerCase())
    ) {
      return false;
    }
    if (
      filters.grade &&
      filters.grade !== "ALL" &&
      normalizeGradeNum(row.grade) !== normalizeGradeNum(filters.grade) &&
      row.grade !== filters.grade
    ) {
      return false;
    }
    if (filters.stageNumber && filters.stageNumber >= 1 && filters.stageNumber <= 8) {
      const stg = row.stages.find((s) => s.stageNumber === filters.stageNumber);
      if (filters.stageStatus && filters.stageStatus !== "ALL") {
        if (stg?.status !== filters.stageStatus) return false;
      } else {
        // Nếu bấm chọn 1 công đoạn trên thanh Pipeline mà không chọn stageStatus cụ thể -> hiển thị tất cả hoặc ưu tiên đang thực hiện/cần điều chỉnh
      }
    } else if (filters.stageStatus && filters.stageStatus !== "ALL") {
      const hasMatchingStage = row.stages.some((s) => s.status === filters.stageStatus);
      if (!hasMatchingStage) return false;
    }

    if (filters.milestoneFilter && filters.milestoneFilter !== "ALL") {
      if (filters.milestoneFilter === "WORK_COMPLETED" && !row.isWorkCompleted) return false;
      if (filters.milestoneFilter === "APPROVAL_COMPLETED" && !row.isApprovalCompleted) return false;
      if (filters.milestoneFilter === "NOTIFICATION_SENT" && !row.isNotificationSent) return false;
      if (filters.milestoneFilter === "PARENT_READ" && !row.isParentRead) return false;
      if (filters.milestoneFilter === "EXCEPTION" && row.exceptionType === "NONE" && !row.isRetest) return false;
    }

    if (filters.alertFilter && filters.alertFilter !== "ALL") {
      if (row.deadlineAlert.level !== filters.alertFilter) return false;
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const matchName = row.fullName.toLowerCase().includes(q);
      const matchCode = row.studentCode.toLowerCase().includes(q);
      const matchTeacher =
        row.assignedTeacherNames.some((t) => t.toLowerCase().includes(q)) ||
        row.stages.some((st) =>
          (st.assignedNames || []).some((n) => n.toLowerCase().includes(q))
        );
      const matchBatch = row.batchName.toLowerCase().includes(q) || row.periodName.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchTeacher && !matchBatch) return false;
    }

    return true;
  });

  // 6. Tổng hợp cấp độ Đợt khảo sát (BatchProgressRow)
  const batchProgressRows: BatchProgressRow[] = [];
  const allPeriodsCombined = [
    ...k12Periods.map((p: any) => ({ period: p, isPreschool: false })),
    ...preschoolPeriods.map((p: any) => ({ period: p, isPreschool: true })),
  ];

  for (const { period, isPreschool } of allPeriodsCombined) {
    if (filters.periodId && filters.periodId !== "ALL" && period.id !== filters.periodId) continue;

    const batchesToProcess =
      Array.isArray(period.batches) && period.batches.length > 0
        ? period.batches
        : [
            {
              id: `period_only_${period.id}`,
              periodId: period.id,
              batchNumber: 1,
              name: "Đợt mặc định",
              startDate: period.startDate,
              endDate: period.endDate,
              status: period.status,
              campusId: period.campusId,
              assignedUserId: period.assignedUserId,
              assignedUser: period.assignedUser,
              isVirtual: true,
            },
          ];

    for (const b of batchesToProcess) {
      if (filters.batchId && filters.batchId !== "ALL" && b.id !== filters.batchId) continue;
      const campusInfo = resolveCampusInfo(
        b.campusId || period.campusId,
        b.campus?.campusCode || period.campus?.campusCode,
        `${b.name || ""} ${period.name || ""}`
      );
      if (
        allowedCampusSet &&
        campusInfo.campusCode !== "ALL" &&
        !allowedCampusSet.has(String(campusInfo.campusCode || "").toUpperCase().trim())
      ) {
        continue;
      }
      if (
        filters.campusCode &&
        filters.campusCode !== "ALL" &&
        campusInfo.campusCode !== "ALL" &&
        campusInfo.campusCode.toUpperCase() !== filters.campusCode.toUpperCase()
      ) {
        continue;
      }

      const bStudents = filteredStudentRows.filter(
        (s) =>
          s.periodId === period.id &&
          (b.isVirtual ? !s.batchId : s.batchId === b.id)
      );

      const totalStudents = bStudents.length;
      const workCompletedCount = bStudents.filter((s) => s.isWorkCompleted).length;
      const approvalCompletedCount = bStudents.filter((s) => s.isApprovalCompleted).length;
      const notificationSentCount = bStudents.filter((s) => s.isNotificationSent).length;
      const parentReadCount = bStudents.filter((s) => s.isParentRead).length;
      const needsAdjustmentCount = bStudents.filter((s) =>
        s.stages.some((st) => st.status === "NEEDS_ADJUSTMENT")
      ).length;
      const exemptOrExceptionCount = bStudents.filter((s) => s.exceptionType !== "NONE").length;
      const retestCount = bStudents.filter((s) => s.isRetest).length;

      const stageSummaries = ENTRANCE_WORKFLOW_STAGES.map((stgDef) => {
        const stgNum = stgDef.stageNumber;
        const batchConf =
          confirmationsMap.get(`BATCH_${b.id}_${stgNum}`) ||
          confirmationsMap.get(`PERIOD_${period.id}_${stgNum}`);

        if (totalStudents === 0) {
          const isStg1 = stgNum === 1;
          const stStatus: EntranceStageStatus =
            batchConf?.status || (isStg1 ? "COMPLETED" : "NOT_STARTED");
          return {
            stageNumber: stgNum,
            shortName: stgDef.shortName,
            status: stStatus,
            completedCount: stStatus === "COMPLETED" ? 1 : 0,
            inProgressCount: 0,
            needsAdjustmentCount: 0,
            notStartedCount: stStatus === "COMPLETED" ? 0 : 1,
            notApplicableCount: 0,
            completionPct: stStatus === "COMPLETED" ? 100 : 0,
            confirmedByName: batchConf?.confirmedByName || null,
            confirmedAt: batchConf?.confirmedAt || null,
          };
        }

        let completedCount = 0;
        let inProgressCount = 0;
        let adjCount = 0;
        let notStartedCount = 0;
        let naCount = 0;

        for (const s of bStudents) {
          const stStage = s.stages[stgNum - 1];
          if (!stStage) continue;
          if (stStage.status === "COMPLETED") completedCount++;
          else if (stStage.status === "IN_PROGRESS") inProgressCount++;
          else if (stStage.status === "NEEDS_ADJUSTMENT") adjCount++;
          else if (stStage.status === "NOT_APPLICABLE") naCount++;
          else notStartedCount++;
        }

        const applicable = totalStudents - naCount;
        const completionPct =
          applicable > 0 ? Math.round((completedCount / applicable) * 100) : 100;

        let batchStageStatus: EntranceStageStatus = "NOT_STARTED";
        if (adjCount > 0) batchStageStatus = "NEEDS_ADJUSTMENT";
        else if (applicable === 0) batchStageStatus = "NOT_APPLICABLE";
        else if (completedCount === applicable || batchConf?.status === "COMPLETED") {
          batchStageStatus = "COMPLETED";
        } else if (completedCount > 0 || inProgressCount > 0) {
          batchStageStatus = "IN_PROGRESS";
        }

        let latestStuConfirmedByName: string | null = null;
        let latestStuConfirmedAt: string | null = null;
        for (const s of bStudents) {
          const stStage = s.stages[stgNum - 1];
          if (stStage?.confirmedAt) {
            if (
              !latestStuConfirmedAt ||
              new Date(stStage.confirmedAt).getTime() > new Date(latestStuConfirmedAt).getTime()
            ) {
              latestStuConfirmedAt = stStage.confirmedAt;
              latestStuConfirmedByName =
                stStage.confirmedByName || stStage.assignedSummary || null;
            }
          } else if (
            (stStage?.confirmedByName || stStage?.assignedSummary) &&
            !latestStuConfirmedByName
          ) {
            latestStuConfirmedByName =
              stStage.confirmedByName || stStage.assignedSummary || null;
          }
        }

        return {
          stageNumber: stgNum,
          shortName: stgDef.shortName,
          status: batchStageStatus,
          completedCount,
          inProgressCount,
          needsAdjustmentCount: adjCount,
          notStartedCount,
          notApplicableCount: naCount,
          completionPct,
          confirmedByName: batchConf?.confirmedByName || latestStuConfirmedByName || null,
          confirmedAt: batchConf?.confirmedAt || latestStuConfirmedAt || null,
        };
      });

      const overallProgressPct =
        stageSummaries.length > 0
          ? Math.round(
              stageSummaries.reduce((acc, s) => acc + s.completionPct, 0) /
                stageSummaries.length
            )
          : 0;

      const isBatchAllDone =
        b.status === "COMPLETED" ||
        (totalStudents > 0 && notificationSentCount === totalStudents);

      const batchCampusRoster = campusRoleRosterByCode.get(
        String(campusInfo.campusCode || "").toUpperCase().trim()
      );
      const batchCoordinatorFallback =
        formatAssigneeSummary(batchCampusRoster?.giaoVuNames || []) ||
        "Giáo vụ / Ban KT&ĐBCL";

      batchProgressRows.push({
        id: b.isVirtual ? period.id : b.id,
        periodId: period.id,
        periodCode: period.code,
        periodName: period.name,
        batchNumber: b.batchNumber || 1,
        batchName: b.name,
        isPreschool,
        campusId: b.campusId || period.campusId || null,
        campusCode: campusInfo.campusCode,
        campusName: campusInfo.campusName,
        assignedUserId: b.assignedUserId || period.assignedUserId || null,
        assignedUserName:
          b.assignedUser?.fullName ||
          period.assignedUser?.fullName ||
          batchCoordinatorFallback,
        startDate: b.startDate ? new Date(b.startDate).toISOString() : null,
        endDate: b.endDate ? new Date(b.endDate).toISOString() : null,
        status: b.status || "ACTIVE",
        totalStudents,
        workCompletedCount,
        approvalCompletedCount,
        notificationSentCount,
        parentReadCount,
        needsAdjustmentCount,
        exemptOrExceptionCount,
        retestCount,
        overallProgressPct,
        deadlineAlert: computeDeadlineAlert(b.startDate, b.endDate, isBatchAllDone, now),
        stageSummaries,
      });
    }
  }

  // 7. Tổng hợp Bảng nhiệm vụ theo Giáo viên / Người phụ trách (AssigneeTaskRow)
  const assigneeMap = new Map<string, AssigneeTaskRow>();

  // 7a. Nhiệm vụ của Giáo viên khảo sát (Công đoạn 4)
  for (const a of k12Assignments) {
    const pEntry = periodMap.get(a.periodId);
    if (!pEntry) continue;
    const bEntry = a.batchId ? batchMap.get(a.batchId) : null;
    if (filters.periodId && filters.periodId !== "ALL" && a.periodId !== filters.periodId) continue;
    if (filters.batchId && filters.batchId !== "ALL" && a.batchId !== filters.batchId) continue;

    const aGradeNorm = normalizeGradeNum(a.grade);

    const matchedStudents = filteredStudentRows.filter((s) => {
      if (s.isPreschool || s.periodId !== a.periodId) return false;
      if (a.batchId && s.batchId && a.batchId !== s.batchId) return false;
      if (aGradeNorm && aGradeNorm !== "tất cả" && normalizeGradeNum(s.grade) !== aGradeNorm) {
        return false;
      }
      if (!matchesEducationSystemCodeOrName(s.educationSystem, a.educationSystem, eduSystemAliasMap)) {
        if (!(a.batchId && s.batchId && a.batchId === s.batchId)) {
          return false;
        }
      }
      return true;
    });

    if (matchedStudents.length === 0) continue;

    const key = `GV_K12_${a.userId}_${a.periodId}_${a.batchId || "ALL"}_${a.subjectId}`;
    const existing = assigneeMap.get(key);
    const completedCnt = matchedStudents.filter(
      (s) => s.stages[3]?.status === "COMPLETED" || s.stages[3]?.status === "NOT_APPLICABLE"
    ).length;
    const inProgressCnt = matchedStudents.filter((s) => s.stages[3]?.status === "IN_PROGRESS").length;
    const adjCnt = matchedStudents.filter((s) => s.stages[3]?.status === "NEEDS_ADJUSTMENT").length;
    const notStartedCnt = matchedStudents.filter((s) => s.stages[3]?.status === "NOT_STARTED").length;
    const totalCnt = matchedStudents.length;
    const pct = totalCnt > 0 ? Math.round((completedCnt / totalCnt) * 100) : 100;

    const assignConf = confirmationsMap.get(`ASSIGNMENT_${a.id}_4`);
    const batchObj = bEntry?.batch;
    const periodObj = pEntry.period;

    if (!existing) {
      assigneeMap.set(key, {
        assigneeKey: key,
        userId: a.userId,
        fullName: a.user?.fullName || "Giáo viên khảo sát",
        role: a.user?.role || "TEACHER",
        roleLabel: "Giáo viên khảo sát (K-12)",
        campusName: matchedStudents[0]?.campusName || "Toàn hệ thống",
        stageNumber: 4,
        stageName: "4. GV nhập KQ & xác nhận đánh giá",
        periodId: a.periodId,
        periodName: periodObj.name,
        batchId: a.batchId || null,
        batchName: batchObj?.name || "Tất cả đợt",
        isPreschool: false,
        scopeDescription: `${a.subject?.name || "Môn KS"} • Khối ${a.grade || "Tất cả"} (${a.educationSystem || "Tất cả"})`,
        totalStudents: totalCnt,
        completedStudents: completedCnt,
        inProgressStudents: inProgressCnt,
        needsAdjustmentStudents: adjCnt,
        notStartedStudents: notStartedCnt,
        completionPct: pct,
        isConfirmedComplete: Boolean(assignConf?.status === "COMPLETED" || pct === 100),
        confirmedAt: assignConf?.confirmedAt || null,
        deadlineAlert: computeDeadlineAlert(
          batchObj?.startDate || periodObj.startDate,
          batchObj?.endDate || periodObj.endDate,
          pct === 100,
          now
        ),
        actionHref: `/teacher/input-assessments?type=general&periodId=${a.periodId}&batchId=${a.batchId || ""}`,
      });
    }
  }

  // 7b. Nhiệm vụ của Giáo viên Mầm non (Công đoạn 4)
  for (const a of preschoolAssignments) {
    const pEntry = periodMap.get(a.periodId);
    if (!pEntry) continue;
    const bEntry = a.batchId ? batchMap.get(a.batchId) : null;
    if (filters.periodId && filters.periodId !== "ALL" && a.periodId !== filters.periodId) continue;
    if (filters.batchId && filters.batchId !== "ALL" && a.batchId !== filters.batchId) continue;

    const matchedStudents = filteredStudentRows.filter((s) => {
      if (!s.isPreschool || s.periodId !== a.periodId) return false;
      if (a.batchId && s.batchId && a.batchId !== s.batchId) return false;
      return matchesPreschoolGradeSimple(s.grade, a.grade);
    });
    if (matchedStudents.length === 0) continue;

    const effectiveUserId = a.delegatedUserId || a.userId;
    const effectiveFullName =
      a.delegatedUser?.fullName || a.user?.fullName || "Giáo viên Mầm non";
    const key = `GV_MN_${effectiveUserId}_${a.periodId}_${a.batchId || "ALL"}_${a.grade}`;
    const completedCnt = matchedStudents.filter(
      (s) => s.stages[3]?.status === "COMPLETED"
    ).length;
    const inProgressCnt = matchedStudents.filter((s) => s.stages[3]?.status === "IN_PROGRESS").length;
    const adjCnt = matchedStudents.filter((s) => s.stages[3]?.status === "NEEDS_ADJUSTMENT").length;
    const notStartedCnt = matchedStudents.filter((s) => s.stages[3]?.status === "NOT_STARTED").length;
    const totalCnt = matchedStudents.length;
    const pct = totalCnt > 0 ? Math.round((completedCnt / totalCnt) * 100) : 100;
    const assignConf = confirmationsMap.get(`ASSIGNMENT_${a.id}_4`);
    const batchObj = bEntry?.batch;
    const periodObj = pEntry.period;

    if (!assigneeMap.has(key)) {
      assigneeMap.set(key, {
        assigneeKey: key,
        userId: effectiveUserId,
        fullName: effectiveFullName,
        role: a.delegatedUser?.role || a.user?.role || "GV_MN",
        roleLabel: "Giáo viên khảo sát (Mầm non)",
        campusName: matchedStudents[0]?.campusName || "Mầm non",
        stageNumber: 4,
        stageName: "4. GV nhập KQ & xác nhận đánh giá",
        periodId: a.periodId,
        periodName: periodObj.name,
        batchId: a.batchId || null,
        batchName: batchObj?.name || "Tất cả đợt",
        isPreschool: true,
        scopeDescription: `Đánh giá trẻ • Nhóm lớp ${a.grade || "Tất cả"}`,
        totalStudents: totalCnt,
        completedStudents: completedCnt,
        inProgressStudents: inProgressCnt,
        needsAdjustmentStudents: adjCnt,
        notStartedStudents: notStartedCnt,
        completionPct: pct,
        isConfirmedComplete: Boolean(assignConf?.status === "COMPLETED" || pct === 100),
        confirmedAt: assignConf?.confirmedAt || null,
        deadlineAlert: computeDeadlineAlert(
          batchObj?.startDate || periodObj.startDate,
          batchObj?.endDate || periodObj.endDate,
          pct === 100,
          now
        ),
        actionHref: `/teacher/input-assessments?type=preschool&periodId=${a.periodId}&batchId=${a.batchId || ""}`,
      });
    }
  }

  // 7c. Nhiệm vụ của Người phụ trách đợt / Giáo vụ & Giám đốc cơ sở & Tư vấn theo từng Đợt có học sinh
  for (const bRow of batchProgressRows) {
    if (bRow.totalStudents === 0) continue;
    const bCampusRoster = campusRoleRosterByCode.get(
      String(bRow.campusCode || "").toUpperCase().trim()
    );

    // Giáo vụ phụ trách Phân công (Công đoạn 3)
    const stg3 = bRow.stageSummaries.find((s) => s.stageNumber === 3);
    if (stg3) {
      const gvKey = `GIAO_VU_${bRow.id}_3`;
      const resolvedGiaoVuName =
        (bRow.assignedUserName && bRow.assignedUserName !== "Giáo vụ / Ban KT&ĐBCL"
          ? bRow.assignedUserName
          : null) ||
        formatAssigneeSummary(bCampusRoster?.giaoVuNames || []) ||
        `Giáo vụ ${bRow.campusName}`;
      assigneeMap.set(gvKey, {
        assigneeKey: gvKey,
        userId: bRow.assignedUserId || "giao_vu",
        fullName: resolvedGiaoVuName,
        role: "GIAO_VU_CS",
        roleLabel: "Giáo vụ Cơ sở / Điều phối đợt",
        campusName: bRow.campusName,
        stageNumber: 3,
        stageName: "3. Giáo vụ phân công & xác nhận phân công",
        periodId: bRow.periodId,
        periodName: bRow.periodName,
        batchId: bRow.id,
        batchName: bRow.batchName,
        isPreschool: bRow.isPreschool,
        scopeDescription: `Điều phối phân công GV đợt ${bRow.batchName}`,
        totalStudents: bRow.totalStudents,
        completedStudents: stg3.completedCount,
        inProgressStudents: stg3.inProgressCount,
        needsAdjustmentStudents: stg3.needsAdjustmentCount,
        notStartedStudents: stg3.notStartedCount,
        completionPct: stg3.completionPct,
        isConfirmedComplete: stg3.status === "COMPLETED",
        confirmedAt: stg3.confirmedAt || null,
        deadlineAlert: computeDeadlineAlert(
          bRow.startDate,
          bRow.endDate,
          stg3.status === "COMPLETED",
          now
        ),
        actionHref: resolveEntranceStageHref({
          stageNumber: 3,
          isPreschool: bRow.isPreschool,
          userRole: filters.viewerRole,
          isSuperAdmin: filters.isSuperAdmin,
          periodId: bRow.periodId,
          batchId: bRow.id,
          campusCode: bRow.campusCode,
        }),
      });
    }

    // Giám đốc Cơ sở / BGH phụ trách Thẩm định & Xét duyệt (Công đoạn 6)
    const stg6 = bRow.stageSummaries.find((s) => s.stageNumber === 6);
    if (stg6 && (stg6.inProgressCount > 0 || stg6.completedCount > 0 || stg6.needsAdjustmentCount > 0)) {
      const gdKey = `GDCS_${bRow.id}_6`;
      const campusObj = campuses.find((c) => c.campusCode === bRow.campusCode);
      const resolvedGdcsName =
        stg6.confirmedByName ||
        formatAssigneeSummary(
          bRow.isPreschool
            ? [
                ...(bCampusRoster?.bghPreschoolNames || []),
                ...(bCampusRoster?.gdcsNames || []),
              ]
            : bCampusRoster?.gdcsNames || []
        ) ||
        campusObj?.manager?.fullName ||
        `GĐCS / BGH (${bRow.campusName})`;
      assigneeMap.set(gdKey, {
        assigneeKey: gdKey,
        userId: campusObj?.managerId || "gdcs",
        fullName: resolvedGdcsName,
        role: "GDCS",
        roleLabel: "Giám đốc Cơ sở / BGH",
        campusName: bRow.campusName,
        stageNumber: 6,
        stageName: "6. Thẩm định, xét duyệt và kết luận",
        periodId: bRow.periodId,
        periodName: bRow.periodName,
        batchId: bRow.id,
        batchName: bRow.batchName,
        isPreschool: bRow.isPreschool,
        scopeDescription: `Xét duyệt kết quả đợt ${bRow.batchName}`,
        totalStudents: bRow.totalStudents,
        completedStudents: stg6.completedCount,
        inProgressStudents: stg6.inProgressCount,
        needsAdjustmentStudents: stg6.needsAdjustmentCount,
        notStartedStudents: stg6.notStartedCount,
        completionPct: stg6.completionPct,
        isConfirmedComplete: stg6.status === "COMPLETED",
        confirmedAt: stg6.confirmedAt || null,
        deadlineAlert: computeDeadlineAlert(
          bRow.startDate,
          bRow.endDate,
          stg6.status === "COMPLETED",
          now
        ),
        actionHref: resolveEntranceStageHref({
          stageNumber: 6,
          isPreschool: bRow.isPreschool,
          userRole: filters.viewerRole,
          isSuperAdmin: filters.isSuperAdmin,
          periodId: bRow.periodId,
          batchId: bRow.id,
          campusCode: bRow.campusCode,
        }),
      });
    }

    // Bàn giao kết quả, văn bản cho Tư vấn (Công đoạn 7)
    const stg7 = bRow.stageSummaries.find((s) => s.stageNumber === 7);
    if (stg7 && bRow.approvalCompletedCount > 0) {
      const tvKey = `HANDOVER_${bRow.id}_7`;
      const resolvedHandoverName =
        stg7.confirmedByName ||
        formatAssigneeSummary([
          ...(bCampusRoster?.giaoVuNames || []),
          ...(bCampusRoster?.tuVanNames || []),
        ]) ||
        (bRow.assignedUserName && bRow.assignedUserName !== "Giáo vụ / Ban KT&ĐBCL"
          ? bRow.assignedUserName
          : null) ||
        `Giáo vụ / Ban KT&ĐBCL (${bRow.campusName})`;
      assigneeMap.set(tvKey, {
        assigneeKey: tvKey,
        userId: "giao_vu_ban_giao",
        fullName: resolvedHandoverName,
        role: "GIAO_VU",
        roleLabel: "Giáo vụ • KT&ĐBCL • Tư vấn",
        campusName: bRow.campusName,
        stageNumber: 7,
        stageName: "7. Xuất văn bản & bàn giao Tư vấn",
        periodId: bRow.periodId,
        periodName: bRow.periodName,
        batchId: bRow.id,
        batchName: bRow.batchName,
        isPreschool: bRow.isPreschool,
        scopeDescription: `Chuẩn bị văn bản & bàn giao hồ sơ đợt ${bRow.batchName} cho Tư vấn`,
        totalStudents: bRow.approvalCompletedCount,
        completedStudents: stg7.completedCount,
        inProgressStudents: Math.max(0, bRow.approvalCompletedCount - stg7.completedCount),
        needsAdjustmentStudents: stg7.needsAdjustmentCount,
        notStartedStudents: 0,
        completionPct:
          bRow.approvalCompletedCount > 0
            ? Math.round((stg7.completedCount / bRow.approvalCompletedCount) * 100)
            : 0,
        isConfirmedComplete:
          bRow.approvalCompletedCount > 0 &&
          stg7.completedCount >= bRow.approvalCompletedCount,
        confirmedAt: stg7.confirmedAt || null,
        deadlineAlert: computeDeadlineAlert(
          bRow.startDate,
          bRow.endDate,
          stg7.completedCount >= bRow.approvalCompletedCount,
          now
        ),
        actionHref: resolveEntranceStageHref({
          stageNumber: 7,
          isPreschool: bRow.isPreschool,
          userRole: filters.viewerRole,
          isSuperAdmin: filters.isSuperAdmin,
          periodId: bRow.periodId,
          batchId: bRow.id,
          campusCode: bRow.campusCode,
        }),
      });
    }
  }

  const assigneeRows = Array.from(assigneeMap.values()).sort((a, b) => {
    const alertWeight = (lvl: DeadlineAlertLevel) =>
      lvl === "OVERDUE" ? 0 : lvl === "DUE_SOON" ? 1 : lvl === "ON_TRACK" ? 2 : 3;
    const diff = alertWeight(a.deadlineAlert.level) - alertWeight(b.deadlineAlert.level);
    if (diff !== 0) return diff;
    return a.completionPct - b.completionPct;
  });

  // 8. Xây dựng Danh sách Hồ sơ đang tồn đọng (BacklogItems)
  const backlogItems: BacklogItem[] = [];
  for (const s of filteredStudentRows) {
    if (s.stages[6]?.status === "COMPLETED") continue;

    // Xác định bước đang nghẽn (bottleneck)
    const bottleneckStage =
      s.stages.find((st) => st.status === "NEEDS_ADJUSTMENT") ||
      s.stages.find((st) => st.status === "IN_PROGRESS") ||
      s.stages.find((st) => st.status === "NOT_STARTED");

    if (!bottleneckStage) continue;

    let reason = bottleneckStage.detailText;
    if (bottleneckStage.stageNumber === 3) {
      reason = "Chưa phân công giáo viên khảo sát cho khối/hệ của học sinh";
    } else if (bottleneckStage.stageNumber === 4) {
      reason = s.isAbsent
        ? "Học sinh vắng khảo sát - Cần xếp lịch khảo sát bổ sung"
        : `Giáo viên chưa hoàn tất nhập điểm/xác nhận đánh giá (${s.evaluatedSubjectsCount}/${Math.max(1, s.assignedSubjectsCount)} môn)`;
    } else if (bottleneckStage.stageNumber === 5) {
      reason = `Bản định hướng kết quả chưa hoàn tất (${s.orientationStatus})`;
    } else if (bottleneckStage.stageNumber === 6) {
      reason = s.isWorkCompleted
        ? "Đã đủ kết quả & bản định hướng - Đang chờ GĐCS/BGH thẩm định phê duyệt"
        : "Chưa có kết luận thẩm định xét duyệt";
    } else if (bottleneckStage.stageNumber === 7) {
      reason = `Đã có kết luận "${s.admissionResult}" - Chờ chuẩn bị văn bản & bàn giao Tư vấn`;
    } else if (bottleneckStage.stageNumber === 8) {
      reason = "Đã bàn giao hồ sơ - Chờ Tư vấn gửi thông báo/thư chúc mừng cho PHHS";
    }

    backlogItems.push({
      id: `backlog_${s.id}_${bottleneckStage.stageNumber}`,
      studentId: s.id,
      studentCode: s.studentCode,
      fullName: s.fullName,
      isPreschool: s.isPreschool,
      grade: s.grade,
      educationSystem: s.educationSystem,
      campusName: s.campusName,
      periodId: s.periodId,
      periodName: s.periodName,
      batchId: s.batchId,
      batchName: s.batchName,
      bottleneckStageNumber: bottleneckStage.stageNumber,
      bottleneckStageName: bottleneckStage.shortName,
      stageStatus: bottleneckStage.status,
      reason,
      responsibleRoleLabel: bottleneckStage.responsibleLabel,
      assigneeNames:
        bottleneckStage.assignedNames && bottleneckStage.assignedNames.length > 0
          ? bottleneckStage.assignedNames.join(", ")
          : bottleneckStage.stageNumber === 4 && s.assignedTeacherNames.length > 0
          ? s.assignedTeacherNames.join(", ")
          : bottleneckStage.responsibleLabel,
      deadlineAlert: s.deadlineAlert,
      exceptionType: s.exceptionType,
      actionHref: bottleneckStage.actionHref,
    });
  }

  backlogItems.sort((a, b) => {
    const alertOrder = (lvl: DeadlineAlertLevel) =>
      lvl === "OVERDUE" ? 0 : lvl === "DUE_SOON" ? 1 : lvl === "ON_TRACK" ? 2 : 3;
    const d = alertOrder(a.deadlineAlert.level) - alertOrder(b.deadlineAlert.level);
    if (d !== 0) return d;
    if (a.stageStatus === "NEEDS_ADJUSTMENT" && b.stageStatus !== "NEEDS_ADJUSTMENT") return -1;
    if (b.stageStatus === "NEEDS_ADJUSTMENT" && a.stageStatus !== "NEEDS_ADJUSTMENT") return 1;
    return b.bottleneckStageNumber - a.bottleneckStageNumber;
  });

  // 9. Tổng hợp Biểu đồ Tiến độ từng Giai đoạn (8 Công đoạn) & KPI Tổng hợp
  const stageChartData = ENTRANCE_WORKFLOW_STAGES.map((stgDef) => {
    const num = stgDef.stageNumber;
    let completed = 0;
    let inProgress = 0;
    let needsAdjustment = 0;
    let notStarted = 0;
    let notApplicable = 0;

    for (const s of filteredStudentRows) {
      const st = s.stages[num - 1]?.status || "NOT_STARTED";
      if (st === "COMPLETED") completed++;
      else if (st === "IN_PROGRESS") inProgress++;
      else if (st === "NEEDS_ADJUSTMENT") needsAdjustment++;
      else if (st === "NOT_APPLICABLE") notApplicable++;
      else notStarted++;
    }

    const applicable = filteredStudentRows.length - notApplicable;
    const completionPct = applicable > 0 ? Math.round((completed / applicable) * 100) : 0;

    return {
      stageNumber: num,
      code: stgDef.code,
      shortName: stgDef.shortName,
      name: stgDef.name,
      responsibleLabel: stgDef.responsibleLabel,
      confirmButtonLabel: stgDef.confirmButtonLabel,
      defaultHrefK12: stgDef.defaultHrefK12,
      defaultHrefPreschool: stgDef.defaultHrefPreschool,
      milestoneGroup: stgDef.milestoneGroup,
      completed,
      inProgress,
      needsAdjustment,
      notStarted,
      notApplicable,
      total: filteredStudentRows.length,
      completionPct,
    };
  });

  const totalStudents = filteredStudentRows.length;
  const workCompletedTotal = filteredStudentRows.filter((s) => s.isWorkCompleted).length;
  const approvalCompletedTotal = filteredStudentRows.filter((s) => s.isApprovalCompleted).length;
  const approvedPassTotal = filteredStudentRows.filter((s) => s.canIssueCongratulation).length;
  const notificationSentTotal = filteredStudentRows.filter((s) => s.isNotificationSent).length;
  const parentReadTotal = filteredStudentRows.filter((s) => s.isParentRead).length;
  const dueSoonTotal = filteredStudentRows.filter((s) => s.deadlineAlert.level === "DUE_SOON").length;
  const overdueTotal = filteredStudentRows.filter((s) => s.deadlineAlert.level === "OVERDUE").length;
  const needsAdjustmentTotal = filteredStudentRows.filter((s) =>
    s.stages.some((st) => st.status === "NEEDS_ADJUSTMENT")
  ).length;
  const exceptionTotal = filteredStudentRows.filter(
    (s) => s.exceptionType !== "NONE" || s.isRetest
  ).length;

  const kpis = {
    totalBatches: batchProgressRows.length,
    totalStudents,
    // 1. Hoàn thành công việc chuyên môn (Bước 1-5)
    workCompletedCount: workCompletedTotal,
    workCompletedPct: totalStudents > 0 ? Math.round((workCompletedTotal / totalStudents) * 100) : 0,
    // 2. Hoàn thành xét duyệt (Bước 6)
    approvalCompletedCount: approvalCompletedTotal,
    approvalCompletedPct: totalStudents > 0 ? Math.round((approvalCompletedTotal / totalStudents) * 100) : 0,
    approvedPassCount: approvedPassTotal,
    pendingApprovalCount: filteredStudentRows.filter(
      (s) => s.isWorkCompleted && !s.isApprovalCompleted
    ).length,
    // 3. Hoàn thành thông báo PHHS (Bước 7-8) - Tách Đã gửi vs PHHS đã nhận/đọc
    handoverCompletedCount: filteredStudentRows.filter(
      (s) => s.stages[6]?.status === "COMPLETED"
    ).length,
    notificationSentCount: notificationSentTotal,
    notificationSentPct:
      totalStudents > 0 ? Math.round((notificationSentTotal / totalStudents) * 100) : 0,
    parentReadCount: parentReadTotal,
    parentReadPct:
      notificationSentTotal > 0 ? Math.round((parentReadTotal / notificationSentTotal) * 100) : 0,
    // 4. Cảnh báo & Tồn đọng
    backlogCount: backlogItems.length,
    dueSoonCount: dueSoonTotal,
    overdueCount: overdueTotal,
    needsAdjustmentCount: needsAdjustmentTotal,
    exceptionCount: exceptionTotal,
  };

  // Danh mục phục vụ bộ lọc
  const visibleCampusesForFilter = allowedCampusSet
    ? campuses.filter((c) =>
        allowedCampusSet.has(String(c.campusCode || "").toUpperCase().trim())
      )
    : campuses;
  const filterOptions = {
    academicYears: academicYears.map((y) => ({ id: y.id, name: y.name, status: y.status })),
    activeAcademicYearId,
    campuses: visibleCampusesForFilter.map((c) => ({
      id: c.id,
      campusCode: c.campusCode,
      campusName: c.campusName,
    })),
    periods: allPeriodsCombined.map(({ period, isPreschool }) => ({
      id: period.id,
      code: period.code,
      name: period.name,
      isPreschool,
      batches: (period.batches || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        batchNumber: b.batchNumber,
      })),
    })),
    grades: Array.from(new Set(campusScopedStudentRows.map((s) => s.grade).filter(Boolean))).sort(),
    educationSystems: Array.from(
      new Set(campusScopedStudentRows.map((s) => s.educationSystem).filter(Boolean))
    ).sort(),
  };

  // 10. Tổng hợp Lược sử đã thực hiện (Kết hợp Audit Logs + các công đoạn thực tế đã thực hiện của Học sinh & Đợt)
  const filteredStudentIdSet = new Set(filteredStudentRows.map((s) => s.id));
  const filteredBatchIdSet = new Set(batchProgressRows.map((b) => b.id));
  const filteredPeriodIdSet = new Set(batchProgressRows.map((b) => b.periodId));

  const hasActiveScopeFilter = Boolean(
    (filters.periodId && filters.periodId !== "ALL") ||
      (filters.batchId && filters.batchId !== "ALL") ||
      (filters.campusCode && filters.campusCode !== "ALL") ||
      (filters.educationSystem && filters.educationSystem !== "ALL") ||
      (filters.grade && filters.grade !== "ALL") ||
      (filters.level && filters.level !== "ALL") ||
      (filters.search && filters.search.trim())
  );

  const combinedAuditLogs: any[] = (rawAuditLogs || []).filter((l: any) => {
    if (
      filters.stageNumber &&
      filters.stageNumber >= 1 &&
      filters.stageNumber <= 8 &&
      Number(l.stageNumber) !== Number(filters.stageNumber)
    ) {
      return false;
    }
    if (filters.milestoneFilter === "NOTIFICATION_SENT" && Number(l.stageNumber) !== 7 && Number(l.stageNumber) !== 8) {
      return false;
    }
    if (hasActiveScopeFilter) {
      if (l.studentId && !filteredStudentIdSet.has(l.studentId)) return false;
      if (!l.studentId && l.batchId && !filteredBatchIdSet.has(l.batchId)) return false;
      if (!l.studentId && !l.batchId && l.periodId && !filteredPeriodIdSet.has(l.periodId)) return false;
    }
    return true;
  });

  const existingLogKeys = new Set<string>(
    combinedAuditLogs.map(
      (l) => `${l.studentId || l.batchId || l.periodId}_${l.stageNumber}`
    )
  );

  // Lược sử thực hiện cấp Đợt khảo sát (Bước 1, 2, 3, 7)
  for (const bRow of batchProgressRows) {
    for (const stgSum of bRow.stageSummaries) {
      if (
        filters.stageNumber &&
        filters.stageNumber >= 1 &&
        filters.stageNumber <= 8 &&
        stgSum.stageNumber !== filters.stageNumber
      ) {
        continue;
      }
      if (filters.milestoneFilter === "NOTIFICATION_SENT" && stgSum.stageNumber !== 7) {
        continue;
      }
      if (
        (stgSum.stageNumber <= 3 || stgSum.stageNumber === 7) &&
        (stgSum.status === "COMPLETED" || stgSum.completedCount > 0)
      ) {
        const key = `${bRow.id}_${stgSum.stageNumber}`;
        if (!existingLogKeys.has(key)) {
          existingLogKeys.add(key);
          combinedAuditLogs.push({
            id: `derived_batch_${bRow.id}_stg_${stgSum.stageNumber}`,
            academicYearId: activeAcademicYearId,
            isPreschool: bRow.isPreschool ? 1 : 0,
            periodId: bRow.periodId,
            batchId: bRow.id,
            studentId: null,
            studentCode: null,
            studentName: `${bRow.periodName} • ${bRow.batchName} (${bRow.totalStudents} HS)`,
            stageNumber: stgSum.stageNumber,
            action: stgSum.stageNumber === 7 ? "BÀN GIAO TƯ VẤN" : stgSum.confirmedByName ? "XÁC NHẬN" : "THỰC HIỆN",
            previousStatus: "IN_PROGRESS",
            newStatus: stgSum.status,
            actorName: stgSum.confirmedByName || bRow.assignedUserName || "Giáo vụ / Ban KT&ĐBCL",
            actorRole: stgSum.stageNumber === 1 ? "KTDBCL" : "GIAO_VU",
            reasonOrNote:
              stgSum.stageNumber === 1
                ? `Khởi tạo đợt khảo sát (${bRow.campusName})`
                : stgSum.stageNumber === 2
                ? `Đã nhập danh sách ${bRow.totalStudents} học sinh khảo sát`
                : stgSum.stageNumber === 3
                ? `Đã phân công giáo viên khảo sát cho ${stgSum.completedCount}/${bRow.totalStudents} học sinh`
                : `Đã bàn giao kết quả & văn bản Tư vấn cho ${stgSum.completedCount}/${bRow.totalStudents} học sinh (${bRow.campusName})`,
            createdAt: stgSum.confirmedAt || bRow.startDate || now.toISOString(),
            isDerived: true,
          });
        }
      }
    }
  }

  // Lược sử thực hiện trên từng Học sinh (Bước 2 -> Bước 7)
  for (const sRow of filteredStudentRows) {
    for (const stg of sRow.stages) {
      if (
        filters.stageNumber &&
        filters.stageNumber >= 1 &&
        filters.stageNumber <= 8 &&
        stg.stageNumber !== filters.stageNumber
      ) {
        continue;
      }
      if (filters.milestoneFilter === "NOTIFICATION_SENT" && stg.stageNumber !== 7) {
        continue;
      }
      if (
        stg.stageNumber >= 2 &&
        (stg.status === "COMPLETED" ||
          stg.status === "NEEDS_ADJUSTMENT" ||
          Boolean(stg.confirmedByName) ||
          (stg.stageNumber >= 4 && stg.status === "IN_PROGRESS" && sRow.evaluatedSubjectsCount > 0))
      ) {
        const key = `${sRow.id}_${stg.stageNumber}`;
        if (!existingLogKeys.has(key)) {
          existingLogKeys.add(key);
          combinedAuditLogs.push({
            id: `derived_stu_${sRow.id}_stg_${stg.stageNumber}`,
            academicYearId: activeAcademicYearId,
            isPreschool: sRow.isPreschool ? 1 : 0,
            periodId: sRow.periodId,
            batchId: sRow.batchId,
            studentId: sRow.id,
            studentCode: sRow.studentCode,
            studentName: sRow.fullName,
            stageNumber: stg.stageNumber,
            action:
              stg.stageNumber === 7 && stg.status === "COMPLETED"
                ? "BÀN GIAO TƯ VẤN"
                : stg.confirmedByName
                ? "XÁC NHẬN"
                : "CẬP NHẬT DỮ LIỆU",
            previousStatus: "IN_PROGRESS",
            newStatus:
              stg.stageNumber === 6 && sRow.admissionResult
                ? `${stg.status} (${sRow.admissionResult})`
                : stg.stageNumber === 7 && stg.status === "COMPLETED"
                ? `${stg.status} (Đã bàn giao Tư vấn)`
                : stg.status,
            actorName: stg.confirmedByName || stg.responsibleLabel,
            actorRole:
              stg.confirmedByRole ||
              (stg.stageNumber === 4
                ? "TEACHER"
                : stg.stageNumber === 5
                ? "GV_DINH_HUONG"
                : stg.stageNumber === 6
                ? "GDCS"
                : "GIAO_VU"),
            reasonOrNote: stg.note
              ? `${stg.detailText} — Ghi chú: ${stg.note}`
              : stg.detailText,
            createdAt: stg.confirmedAt || sRow.batchStartDate || now.toISOString(),
            isDerived: true,
          });
        }
      }
    }
  }

  combinedAuditLogs.sort((a, b) => {
    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (tB !== tA) return tB - tA;
    return Number(b.stageNumber || 0) - Number(a.stageNumber || 0);
  });

  return {
    kpis,
    stageChartData,
    batchProgressRows,
    studentRows: filteredStudentRows,
    assigneeRows,
    backlogItems,
    auditLogs: combinedAuditLogs.slice(0, 300),
    filterOptions,
  };
}

// ============================================================================
// 3. HÀM XỬ LÝ XÁC NHẬN & ĐỒNG BỘ TRẠNG THÁI TẠI BACKEND
// ============================================================================

export async function executeEntranceWorkflowAction(params: {
  action: "CONFIRM" | "REQUEST_ADJUSTMENT" | "SET_EXCEPTION" | "UPDATE_DELIVERY";
  targetScope: "BATCH" | "STUDENT" | "ASSIGNMENT";
  academicYearId?: string;
  isPreschool?: boolean;
  periodId: string;
  batchId?: string | null;
  studentIds?: string[];
  assignmentId?: string | null;
  stageNumber: number;
  status?: EntranceStageStatus;
  deliveryStatus?: NotificationDeliveryStatus;
  exceptionType?: EntranceExceptionType;
  admissionResult?: string | null;
  directorNote?: string | null;
  documentTypes?: string[];
  note?: string | null;
  actor: {
    id: string;
    fullName: string;
    role: string;
    isSuperAdmin?: boolean;
  };
}) {
  await ensureEntranceProgressSchema();
  const pAny = prisma as any;
  const {
    action,
    targetScope,
    academicYearId,
    isPreschool = false,
    periodId,
    batchId = null,
    studentIds = [],
    assignmentId = null,
    stageNumber,
    status = "COMPLETED",
    deliveryStatus = "NOT_SENT",
    exceptionType = "NONE",
    admissionResult,
    directorNote,
    documentTypes = [],
    note = null,
    actor,
  } = params;

  const stageDef = getStageDefinition(stageNumber);
  const nowIso = new Date().toISOString();

  // 1. Kiểm tra dữ liệu thực tế cho Công đoạn 3 (Phân công) nếu xác nhận cấp Đợt
  let hasAssignments = true;
  if (stageNumber === 3 && action === "CONFIRM") {
    let count = isPreschool
      ? await pAny.preschoolInputAssessmentTeacherAssignment.count({
          where: { periodId, ...(batchId ? { batchId } : {}) },
        })
      : await pAny.inputAssessmentTeacherAssignment.count({
          where: { periodId, ...(batchId ? { batchId } : {}) },
        });
    if (count === 0 && batchId) {
      const sessionExaminerCount = isPreschool
        ? (await pAny.preschoolInputAssessmentSessionExaminer
            ?.count({ where: { session: { batchId } } })
            ?.catch(() => 0)) || 0
        : (await pAny.inputAssessmentSessionExaminer
            ?.count({ where: { session: { batchId } } })
            ?.catch(() => 0)) || 0;
      count += sessionExaminerCount;
    }
    hasAssignments = count > 0;
  }

  // 2. Xử lý danh sách học sinh (nếu xác nhận cấp STUDENT hoặc đồng bộ cho học sinh)
  const targetStudentIds =
    studentIds && studentIds.length > 0 ? studentIds : [];

  if (targetStudentIds.length > 0) {
    const studentsList = isPreschool
      ? await pAny.preschoolInputAssessmentStudent.findMany({
          where: { id: { in: targetStudentIds } },
        })
      : await pAny.inputAssessmentStudent.findMany({
          where: { id: { in: targetStudentIds } },
          include: { scores: true, orientationRecord: true },
        });

    for (const st of studentsList) {
      const rawStResult =
        st.admissionResult ||
        (isPreschool
          ? st.devAssessmentResult || (st.probationaryResult === "DAT" ? "Đạt" : null)
          : null);
      const effectiveAdmissionResult =
        admissionResult !== undefined && admissionResult !== null
          ? admissionResult
          : rawStResult;

      const hasScores = isPreschool
        ? Boolean(st.devAssessmentResult || st.devProfessionalComment || st.probationaryResult) ||
          (await pAny.preschoolDevScore.count({ where: { studentId: st.id } })) > 0
        : (Array.isArray(st.scores) && st.scores.length > 0) ||
          Boolean(
            st.mathScore !== null ||
              st.literatureScore !== null ||
              st.writtenEnglishScore !== null ||
              st.oralEnglishScore !== null ||
              st.psychologyScore !== null
          ) ||
          Boolean(st.orientationRecord?.psychologyData) ||
          Boolean(st.orientationRecord?.id);

      const isPreschoolApproved =
        isPreschool && (st.gdcsApprovalStatus === "APPROVED" || st.bghApprovalStatus === "APPROVED");

      const currentStage6Status: EntranceStageStatus =
        isOfficiallyApprovedConclusion(effectiveAdmissionResult) || isPreschoolApproved
          ? "COMPLETED"
          : "IN_PROGRESS";

      const validation = validateWorkflowActionRules({
        stageNumber,
        action,
        userRole: actor.role,
        isSuperAdmin: actor.isSuperAdmin,
        admissionResult: effectiveAdmissionResult,
        documentTypes,
        deliveryStatus,
        stage6Status: currentStage6Status,
        exceptionType,
        hasAssignments,
        hasScores,
      });

      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
    }

    // Thực thi cập nhật cho từng học sinh
    let processedCount = 0;
    for (const st of studentsList) {
      const confId = `ewc_stu_${st.id}_${stageNumber}`;
      const finalStatus: EntranceStageStatus =
        action === "REQUEST_ADJUSTMENT" ? "NEEDS_ADJUSTMENT" : status;
      const finalDeliveryStatus: NotificationDeliveryStatus =
        stageNumber === 7 || stageNumber === 8
          ? deliveryStatus !== "NOT_SENT"
            ? deliveryStatus
            : finalStatus === "COMPLETED"
            ? "SENT"
            : "NOT_SENT"
          : "NOT_SENT";

      const parentReadAtVal =
        finalDeliveryStatus === "READ" || finalDeliveryStatus === "CONFIRMED" ? nowIso : null;

      await pAny.$executeRawUnsafe(
        `INSERT INTO "entrance_workflow_confirmations" (
          "id", "targetScope", "academicYearId", "isPreschool", "periodId", "batchId",
          "studentId", "assignmentId", "stageNumber", "stageCode", "status",
          "deliveryStatus", "exceptionType", "documentTypes",
          "confirmedByUserId", "confirmedByName", "confirmedByRole", "confirmedAt",
          "parentReadAt", "note", "updatedAt"
        ) VALUES (?, 'STUDENT', ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT("id") DO UPDATE SET
          "status" = excluded."status",
          "deliveryStatus" = excluded."deliveryStatus",
          "exceptionType" = CASE WHEN excluded."exceptionType" != 'NONE' THEN excluded."exceptionType" ELSE "entrance_workflow_confirmations"."exceptionType" END,
          "documentTypes" = COALESCE(excluded."documentTypes", "entrance_workflow_confirmations"."documentTypes"),
          "confirmedByUserId" = excluded."confirmedByUserId",
          "confirmedByName" = excluded."confirmedByName",
          "confirmedByRole" = excluded."confirmedByRole",
          "confirmedAt" = excluded."confirmedAt",
          "parentReadAt" = COALESCE(excluded."parentReadAt", "entrance_workflow_confirmations"."parentReadAt"),
          "note" = excluded."note",
          "updatedAt" = excluded."updatedAt"`,
        confId,
        academicYearId || null,
        isPreschool ? 1 : 0,
        st.periodId || periodId,
        st.batchId || batchId || null,
        st.id,
        stageNumber,
        stageDef.code,
        finalStatus,
        finalDeliveryStatus,
        exceptionType,
        documentTypes.length > 0 ? JSON.stringify(documentTypes) : null,
        actor.id,
        actor.fullName,
        actor.role,
        nowIso,
        parentReadAtVal,
        note || directorNote || null,
        nowIso
      );

      // ĐỒNG BỘ LIÊN THÔNG SANG BẢNG NGHIỆP VỤ GỐC (KHÔNG TẠO DỮ LIỆU TRÙNG LẶP)
      // - Công đoạn 4: Khi GVBM xác nhận hoàn thành đánh giá (B4), tự động gán chữ ký điện tử vào Mẫu phiếu đánh giá tâm lý cùng Họ tên GV
      if (stageNumber === 4 && finalStatus === "COMPLETED") {
        try {
          const nowFormatted = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
          const sigHash = `SQMS-SIGN-TLY-${st.studentCode || st.id.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;

          const isPsychSubject = (note && String(note).toLowerCase().includes("tâm lý")) ||
            (assignmentId && String(note || "").toLowerCase().includes("tly")) ||
            st.scores?.some((sc: any) => sc.subjectId && (sc.subject?.code === "TLY" || String(sc.subject?.name || "").toLowerCase().includes("tâm lý")));

          if (isPsychSubject || (st.orientationRecord && (st.orientationRecord.psychologyData || st.orientationRecord.psychologyTeacherName))) {
            const existingRec = st.orientationRecord || await pAny.studentOrientationRecord.findUnique({
              where: { studentId: st.id }
            });

            let psychDataObj: any = {};
            if (existingRec?.psychologyData) {
              try {
                psychDataObj = typeof existingRec.psychologyData === "string"
                  ? JSON.parse(existingRec.psychologyData)
                  : existingRec.psychologyData;
              } catch (e) {}
            }

            // Gán chữ ký điện tử chính thức của GVBM
            psychDataObj.digitalSignature = {
              isSigned: true,
              signedBy: actor.fullName,
              signerId: actor.id,
              signerRole: "Giáo viên Tâm lý học đường",
              signedAt: nowIso,
              signedAtFormatted: nowFormatted,
              signatureHash: sigHash,
              status: "VERIFIED",
              stage: "STAGE_4_EVALUATED"
            };

            await pAny.studentOrientationRecord.upsert({
              where: { studentId: st.id },
              create: {
                studentId: st.id,
                psychologyTeacherId: actor.id,
                psychologyTeacherName: actor.fullName,
                psychologyReferralStatus: "COMPLETED",
                psychologyData: JSON.stringify(psychDataObj),
                status: "IN_PROGRESS"
              },
              update: {
                psychologyTeacherId: actor.id,
                psychologyTeacherName: actor.fullName,
                psychologyData: JSON.stringify(psychDataObj),
                updatedAt: new Date()
              }
            });
          }

          try {
            await pAny.inputAssessmentStudent.update({
              where: { id: st.id },
              data: { signatureName: actor.fullName }
            });
          } catch (eSigName) {}
        } catch (eSig) {
          console.warn("Tự động gán chữ ký điện tử B4 warning:", eSig);
        }
      }

      // - Công đoạn 5: Đồng bộ StudentOrientationRecord.status
      if (stageNumber === 5 && !isPreschool && finalStatus === "COMPLETED") {
        try {
          if (st.orientationRecord) {
            await pAny.studentOrientationRecord.update({
              where: { studentId: st.id },
              data: { status: "COMPLETED", updatedAt: new Date() },
            });
          }
        } catch (e) {
          console.warn("Sync orientation status warning:", e);
        }
      }

      // - Công đoạn 6: Đồng bộ kết luận phê duyệt vào InputAssessmentStudent / PreschoolInputAssessmentStudent
      if (stageNumber === 6 && finalStatus === "COMPLETED" && admissionResult) {
        const studentUpdateData: any = {
          admissionResult,
          signatureName: actor.fullName,
          directorNote:
            directorNote ||
            note ||
            `Phê duyệt kết luận "${admissionResult}" bởi ${actor.fullName} lúc ${new Date().toLocaleString("vi-VN")}`,
        };
        if (isPreschool) {
          studentUpdateData.gdcsApprovalStatus = "APPROVED";
          studentUpdateData.gdcsApprovalUser = actor.fullName;
          studentUpdateData.gdcsApprovalDate = new Date();
          studentUpdateData.gdcsApprovalComment = note || directorNote || null;
          await pAny.preschoolInputAssessmentStudent.update({
            where: { id: st.id },
            data: studentUpdateData,
          });
        } else {
          await pAny.inputAssessmentStudent.update({
            where: { id: st.id },
            data: studentUpdateData,
          });
        }
      }

      // - Nếu thiết lập ngoại lệ Miễn khảo sát (EXEMPT), cập nhật admissionCriteria
      if (action === "SET_EXCEPTION" && exceptionType === "EXEMPT") {
        if (isPreschool) {
          await pAny.preschoolInputAssessmentStudent.update({
            where: { id: st.id },
            data: { admissionCriteria: "Miễn khảo sát" },
          });
        } else {
          await pAny.inputAssessmentStudent.update({
            where: { id: st.id },
            data: { admissionCriteria: "Miễn khảo sát" },
          });
        }
      }

      // Ghi Audit Log
      const logId = `ewal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const auditActionLabel =
        stageNumber === 7 && action === "CONFIRM"
          ? finalDeliveryStatus === "SENT"
            ? "GỬI EMAIL BÀN GIAO TƯ VẤN"
            : "XÁC NHẬN BÀN GIAO TƯ VẤN"
          : action;
      const auditNewStatusLabel =
        stageNumber === 7 && finalStatus === "COMPLETED"
          ? `${finalStatus} (Đã bàn giao Tư vấn)`
          : stageNumber === 8 && finalDeliveryStatus !== "NOT_SENT"
          ? `${finalStatus} (${finalDeliveryStatus})`
          : stageNumber === 6 && admissionResult
          ? `${finalStatus} (${admissionResult})`
          : finalStatus;

      await pAny.$executeRawUnsafe(
        `INSERT INTO "entrance_workflow_audit_logs" (
          "id", "academicYearId", "isPreschool", "periodId", "batchId",
          "studentId", "studentCode", "studentName", "assignmentId",
          "stageNumber", "action", "previousStatus", "newStatus",
          "actorUserId", "actorName", "actorRole", "reasonOrNote", "metadataJson", "createdAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        logId,
        academicYearId || null,
        isPreschool ? 1 : 0,
        st.periodId || periodId,
        st.batchId || batchId || null,
        st.id,
        st.studentCode || "",
        st.fullName || "",
        stageNumber,
        auditActionLabel,
        st.admissionResult || st.devAssessmentResult || "IN_PROGRESS",
        auditNewStatusLabel,
        actor.id,
        actor.fullName,
        actor.role,
        note || directorNote || null,
        JSON.stringify({ documentTypes, deliveryStatus: finalDeliveryStatus, exceptionType }),
        nowIso
      );

      processedCount++;
    }

    return {
      success: true,
      processedCount,
      message: `Đã cập nhật và đồng bộ trạng thái công đoạn "${stageDef.name}" cho ${processedCount} học sinh.`,
    };
  }

  // 3. Xử lý xác nhận cấp Đợt khảo sát (BATCH / PERIOD) hoặc Nhiệm vụ GV (ASSIGNMENT)
  const validation = validateWorkflowActionRules({
    stageNumber,
    action,
    userRole: actor.role,
    isSuperAdmin: actor.isSuperAdmin,
    hasAssignments,
    hasScores: true,
  });

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const confId = assignmentId
    ? `ewc_asg_${assignmentId}_${stageNumber}`
    : batchId
    ? `ewc_btc_${batchId}_${stageNumber}`
    : `ewc_prd_${periodId}_${stageNumber}`;

  const finalStatus: EntranceStageStatus =
    action === "REQUEST_ADJUSTMENT" ? "NEEDS_ADJUSTMENT" : status;

  await pAny.$executeRawUnsafe(
    `INSERT INTO "entrance_workflow_confirmations" (
      "id", "targetScope", "academicYearId", "isPreschool", "periodId", "batchId",
      "studentId", "assignmentId", "stageNumber", "stageCode", "status",
      "deliveryStatus", "exceptionType", "documentTypes",
      "confirmedByUserId", "confirmedByName", "confirmedByRole", "confirmedAt",
      "parentReadAt", "note", "updatedAt"
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    ON CONFLICT("id") DO UPDATE SET
      "status" = excluded."status",
      "confirmedByUserId" = excluded."confirmedByUserId",
      "confirmedByName" = excluded."confirmedByName",
      "confirmedByRole" = excluded."confirmedByRole",
      "confirmedAt" = excluded."confirmedAt",
      "note" = excluded."note",
      "updatedAt" = excluded."updatedAt"`,
    confId,
    targetScope,
    academicYearId || null,
    isPreschool ? 1 : 0,
    periodId,
    batchId || null,
    assignmentId || null,
    stageNumber,
    stageDef.code,
    finalStatus,
    deliveryStatus,
    exceptionType,
    documentTypes.length > 0 ? JSON.stringify(documentTypes) : null,
    actor.id,
    actor.fullName,
    actor.role,
    nowIso,
    note || null,
    nowIso
  );

  // ĐỒNG BỘ CÔNG ĐOẠN 3: Giáo vụ xác nhận hoàn thành phân công -> Công bố nhiệm vụ khảo sát cho giáo viên
  let publishedTeacherCount = 0;
  if (stageNumber === 3 && finalStatus === "COMPLETED") {
    try {
      const assignmentsToNotify = isPreschool
        ? await pAny.preschoolInputAssessmentTeacherAssignment.findMany({
            where: { periodId, ...(batchId ? { batchId } : {}) },
            include: { period: true, batch: true },
          })
        : await pAny.inputAssessmentTeacherAssignment.findMany({
            where: { periodId, ...(batchId ? { batchId } : {}) },
            include: { period: true, batch: true, subject: true },
          });

      const uniqueTeacherIds = Array.from(
        new Set(assignmentsToNotify.map((a: any) => a.userId).filter(Boolean))
      ) as string[];

      const periodName = assignmentsToNotify[0]?.period?.name || "Kỳ khảo sát đầu vào";
      const batchName = assignmentsToNotify[0]?.batch?.name || "Đợt khảo sát";
      const linkUrl = isPreschool
        ? `/teacher/input-assessments?type=preschool&periodId=${periodId}&batchId=${batchId || ""}`
        : `/teacher/input-assessments?type=general&periodId=${periodId}&batchId=${batchId || ""}`;

      const periodStudentsForNotify = isPreschool
        ? await pAny.preschoolInputAssessmentStudent.findMany({
            where: { periodId, ...(batchId ? { batchId } : {}) },
            select: { id: true, grade: true, admissionResult: true },
          })
        : await pAny.inputAssessmentStudent.findMany({
            where: { periodId, ...(batchId ? { batchId } : {}) },
            select: { id: true, grade: true, surveyFormType: true },
          });

      const levelLabel = isPreschool ? "Phỏng vấn định hướng Mầm non" : "Phỏng vấn định hướng Phổ thông";

      for (const teacherUserId of uniqueTeacherIds) {
        const teacherAssigns = assignmentsToNotify.filter((a: any) => a.userId === teacherUserId);
        const matchedStudentIds = new Set<string>();
        for (const ta of teacherAssigns) {
          const taGrade = String(ta.grade || "").replace(/^Khối\s+/i, "").trim().toLowerCase();
          periodStudentsForNotify.forEach((st: any) => {
            const stGrade = String(st.grade || "").replace(/^Khối\s+/i, "").trim().toLowerCase();
            if (!taGrade || taGrade === "tất cả" || stGrade === taGrade || stGrade.includes(taGrade) || taGrade.includes(stGrade)) {
              matchedStudentIds.add(st.id);
            }
          });
        }
        const studentCount = matchedStudentIds.size > 0 ? matchedStudentIds.size : periodStudentsForNotify.length;

        await prisma.notification.create({
          data: {
            userId: teacherUserId,
            title: `[Phân công ${levelLabel}] ${batchName} - ${periodName}`,
            message: `Thầy/Cô được phân công ${levelLabel} • Kỳ: ${periodName} • Đợt: ${batchName} • Số lượng: ${studentCount} HS khảo sát. Giáo vụ (${actor.fullName}) đã xác nhận phân công, kính mời Thầy/Cô truy cập thực hiện đánh giá đúng hạn.`,
            link: linkUrl,
            type: "TASK_ASSIGNED",
            category: "INPUT_ASSESSMENT",
            priority: "HIGH",
            sourceModule: "DIEU_HANH_KHAO_SAT",
            sourceId: batchId || periodId,
          },
        });
        publishedTeacherCount++;
      }
    } catch (notifyErr) {
      console.warn("Publish notification to teachers warning:", notifyErr);
    }
  }

  // Ghi Audit Log
  const logId = `ewal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await pAny.$executeRawUnsafe(
    `INSERT INTO "entrance_workflow_audit_logs" (
      "id", "academicYearId", "isPreschool", "periodId", "batchId",
      "studentId", "studentCode", "studentName", "assignmentId",
      "stageNumber", "action", "previousStatus", "newStatus",
      "actorUserId", "actorName", "actorRole", "reasonOrNote", "metadataJson", "createdAt"
    ) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, 'IN_PROGRESS', ?, ?, ?, ?, ?, ?, ?)`,
    logId,
    academicYearId || null,
    isPreschool ? 1 : 0,
    periodId,
    batchId || null,
    targetScope === "BATCH" ? "Xác nhận cấp Đợt khảo sát" : "Xác nhận nhiệm vụ GV",
    assignmentId || null,
    stageNumber,
    action,
    finalStatus,
    actor.id,
    actor.fullName,
    actor.role,
    note ||
      (publishedTeacherCount > 0
        ? `Đã xác nhận hoàn thành phân công và công bố nhiệm vụ cho ${publishedTeacherCount} giáo viên.`
        : null),
    JSON.stringify({ targetScope, publishedTeacherCount }),
    nowIso
  );

  return {
    success: true,
    publishedTeacherCount,
    message:
      stageNumber === 3 && publishedTeacherCount > 0
        ? `Đã xác nhận hoàn thành phân công và công bố nhiệm vụ khảo sát cho ${publishedTeacherCount} giáo viên!`
        : `Đã xác nhận hoàn thành công đoạn "${stageDef.name}" thành công!`,
  };
}

/**
 * Xác định phạm vi Cơ sở phụ trách & vai trò người xem cho Dashboard Điều hành KSĐV
 */
export async function resolveEntranceViewerScope(user: any): Promise<{
  viewerRole: string;
  isSuperAdmin: boolean;
  liveCampusIds: string[];
  allowedCampusCodes: string[];
}> {
  const viewerRole = String(user?.role || "").trim();
  const isSuperAdmin = Boolean(user?.isSuperAdmin || isSuperAdminRole(viewerRole));
  let liveCampusIds: string[] = Array.isArray(user?.campusIds)
    ? [...user.campusIds]
    : [];

  const pAny = prisma as any;
  try {
    if (user?.id && pAny?.userCampusAssignment) {
      const dbAssigns = await pAny.userCampusAssignment.findMany({
        where: { userId: user.id },
        select: { campusId: true },
      });
      if (Array.isArray(dbAssigns) && dbAssigns.length > 0) {
        liveCampusIds = dbAssigns.map((a: any) => a.campusId).filter(Boolean);
      }
    }
  } catch {
    // ignore fallback
  }

  let allowedCampusCodes: string[] = [];
  if (!isSuperAdmin && isCampusScopedEntranceRole(viewerRole) && liveCampusIds.length > 0) {
    try {
      const campusRows = await prisma.campus.findMany({
        where: { id: { in: liveCampusIds } },
        select: { campusCode: true },
      });
      allowedCampusCodes = campusRows
        .map((c) => String(c.campusCode || "").toUpperCase().trim())
        .filter(Boolean);
    } catch {
      allowedCampusCodes = [];
    }
  }

  return {
    viewerRole,
    isSuperAdmin,
    liveCampusIds,
    allowedCampusCodes,
  };
}
