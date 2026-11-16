import {
  FurtherInquiryTopicCode,
  FURTHER_INQUIRY_OPTIONS,
  PvdhFieldConfig,
  PvdhFollowUpActionItem,
  PvdhInterviewItemValue,
  PvdhSectionCode,
  ResultStatusCode,
  formatFollowUpActionsToText,
} from "./constants";

export interface PvdhValidationIssue {
  fieldKey: string;
  sectionCode: PvdhSectionCode;
  label: string;
  message: string;
}

const VALID_INQUIRY_CODES = new Set<string>(FURTHER_INQUIRY_OPTIONS.map((o) => o.code));

/**
 * Đảm bảo tính loại trừ lẫn nhau giữa "KHONG" và các lựa chọn cần tìm hiểu thêm khác.
 * @param topics Mảng mã hiện tại
 * @param newlyToggled Nếu người dùng vừa bấm chọn 1 mục cụ thể, ưu tiên mục vừa chọn
 */
export function normalizeFurtherTopics(
  topics: unknown,
  newlyToggled?: FurtherInquiryTopicCode
): FurtherInquiryTopicCode[] {
  const rawArr = Array.isArray(topics)
    ? topics.map((x) => String(x || "").trim().toUpperCase()).filter((x) => VALID_INQUIRY_CODES.has(x))
    : [];

  const unique = Array.from(new Set(rawArr)) as FurtherInquiryTopicCode[];

  if (newlyToggled === "KHONG" && unique.includes("KHONG")) {
    return ["KHONG"];
  }
  if (newlyToggled && newlyToggled !== "KHONG" && unique.includes(newlyToggled)) {
    return unique.filter((c) => c !== "KHONG");
  }
  if (unique.includes("KHONG") && unique.length > 1) {
    // Mặc định nếu truyền mảng lẫn lộn từ API: nếu có lựa chọn cụ thể khác KHONG thì loại trừ KHONG,
    // hoặc giữ KHONG nếu KHONG đứng cuối cùng
    if (unique[unique.length - 1] === "KHONG") {
      return ["KHONG"];
    }
    return unique.filter((c) => c !== "KHONG");
  }
  return unique;
}

export function parseInterviewMap(raw: unknown): Record<string, PvdhInterviewItemValue> {
  let obj: any = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw || "{}");
    } catch {
      obj = {};
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const out: Record<string, PvdhInterviewItemValue> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val && typeof val === "object") {
      const v = val as any;
      out[key] = {
        responseText: typeof v.responseText === "string" ? v.responseText : "",
        notRecorded: Boolean(v.notRecorded),
        notRecordedReason: typeof v.notRecordedReason === "string" ? v.notRecordedReason : "",
        updatedByUserId: v.updatedByUserId ? String(v.updatedByUserId) : undefined,
        updatedByName: v.updatedByName ? String(v.updatedByName) : undefined,
        updatedAt: v.updatedAt ? String(v.updatedAt) : undefined,
      };
    } else if (typeof val === "string") {
      out[key] = {
        responseText: val,
        notRecorded: false,
        notRecordedReason: "",
      };
    }
  }
  return out;
}

export function parseFollowUpActions(raw: unknown): PvdhFollowUpActionItem[] {
  let arr: any = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw || "[]");
    } catch {
      arr = [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item) => item && typeof item === "object")
    .map((item, idx) => ({
      id: String(item.id || `act_${idx + 1}`),
      actionContent: String(item.actionContent || ""),
      owner: String(item.owner || ""),
      dueDate: String(item.dueDate || ""),
      progressIndicator: String(item.progressIndicator || ""),
    }));
}

export type PvdhValidationScope =
  | "STUDENT_PART"      // Mục I (ngày PV), Mục II (HS), Mục III (GV)
  | "PARENT_PART"       // Mục I (PHHS), Mục IV (PHHS)
  | "ORIENTATION_PART"  // Mục V (Thống nhất định hướng & hỗ trợ)
  | "FULL";             // Toàn bộ phiếu (Mục I -> V)

export interface PvdhRecordValidationInput {
  interviewDate?: string | null;
  studentInterviewDate?: string | null;
  parentInterviewDate?: string | null;
  parentFullName?: string | null;
  parentRelationship?: string | null;
  parentContactChannel?: string | null;
  studentResponses: Record<string, PvdhInterviewItemValue>;
  obsStrengthsInterests?: string | null;
  obsCommunicationStyle?: string | null;
  obsParticipationLevel?: string | null;
  obsSupportNeeds?: string | null;
  parentResponses: Record<string, PvdhInterviewItemValue>;
  planStrengthsPriority?: string | null;
  planGoalsActionsText?: string | null;
  followUpActions?: PvdhFollowUpActionItem[];
  planCoordinator?: string | null;
  planReviewDate?: string | null;
  planFurtherTopics: FurtherInquiryTopicCode[];
  planFurtherOtherText?: string | null;
  planReferralReason?: string | null;
  planReferralReceiver?: string | null;
  planHandoverNotes?: string | null;
}

/**
 * Kiểm tra dữ liệu Phiếu phỏng vấn định hướng dùng chung cho cả Client và Server.
 * - Khi lưu nháp (`mode === "DRAFT"`): cho phép để trống, chỉ kiểm tra giới hạn độ dài & logic loại trừ.
 * - Khi hoàn tất (`mode === "COMPLETE"`): trả về chính xác từng mục thiếu kèm `fieldKey` để điều hướng tới đúng ô nhập.
 */
export function validatePvdhRecordData(params: {
  input: PvdhRecordValidationInput;
  fields: PvdhFieldConfig[];
  mode: "DRAFT" | "COMPLETE";
  scope?: PvdhValidationScope;
}): { valid: boolean; issues: PvdhValidationIssue[] } {
  const { input, fields, mode, scope = "FULL" } = params;
  const issues: PvdhValidationIssue[] = [];

  const checkStudentPart = scope === "FULL" || scope === "STUDENT_PART";
  const checkParentPart = scope === "FULL" || scope === "PARENT_PART";
  const checkOrientationPart = scope === "FULL" || scope === "ORIENTATION_PART";

  const fieldByKey = new Map(fields.map((f) => [f.fieldKey, f]));

  const pushLengthCheck = (key: string, val: string | null | undefined) => {
    const f = fieldByKey.get(key);
    const maxLen = f?.maxLength || 3000;
    if (val && val.length > maxLen) {
      issues.push({
        fieldKey: key,
        sectionCode: f?.sectionCode || "I_GENERAL",
        label: f?.label || key,
        message: `Mục "${f?.label || key}" vượt quá giới hạn ${maxLen} ký tự.`,
      });
    }
  };

  // Kiểm tra giới hạn độ dài cơ bản cho cả nháp & hoàn tất
  for (const [k, v] of Object.entries(input.studentResponses || {})) {
    pushLengthCheck(k, v?.responseText);
    pushLengthCheck(k, v?.notRecordedReason);
  }
  for (const [k, v] of Object.entries(input.parentResponses || {})) {
    pushLengthCheck(k, v?.responseText);
    pushLengthCheck(k, v?.notRecordedReason);
  }
  pushLengthCheck("obs_strengths_interests", input.obsStrengthsInterests);
  pushLengthCheck("obs_communication_style", input.obsCommunicationStyle);
  pushLengthCheck("obs_participation_level", input.obsParticipationLevel);
  pushLengthCheck("obs_support_needs", input.obsSupportNeeds);
  pushLengthCheck("plan_strengths_priority", input.planStrengthsPriority);
  pushLengthCheck("plan_goals_actions", input.planGoalsActionsText);
  pushLengthCheck("plan_further_other_text", input.planFurtherOtherText);
  pushLengthCheck("plan_referral_reason", input.planReferralReason);
  pushLengthCheck("plan_referral_receiver", input.planReferralReceiver);
  pushLengthCheck("plan_handover_notes", input.planHandoverNotes);

  // Kiểm tra loại trừ Không vs các lựa chọn tìm hiểu thêm
  const rawTopics = Array.isArray(input.planFurtherTopics) ? input.planFurtherTopics : [];
  if (rawTopics.includes("KHONG") && rawTopics.length > 1) {
    issues.push({
      fieldKey: "plan_further_topics",
      sectionCode: "V_ORIENTATION",
      label: "Nội dung cần tìm hiểu thêm",
      message: "Lựa chọn 'Không' không thể chọn đồng thời với các nội dung cần tìm hiểu thêm khác.",
    });
  }

  if (mode === "DRAFT") {
    return { valid: issues.length === 0, issues };
  }

  // === KIỂM TRA KHI HOÀN TẤT (COMPLETE) ===
  if (checkStudentPart) {
    const effDate = (input.studentInterviewDate || input.interviewDate || "").trim();
    const dateField = fieldByKey.get("gen_interview_date");
    if (dateField?.requiredOnComplete !== false && !effDate) {
      issues.push({
        fieldKey: "gen_interview_date",
        sectionCode: "I_GENERAL",
        label: dateField?.label || "Ngày phỏng vấn",
        message: "Vui lòng chọn Ngày phỏng vấn học sinh.",
      });
    }

    const studentGroupFields = fields
      .filter((f) => f.sectionCode === "II_STUDENT")
      .sort((a, b) => a.sortOrder - b.sortOrder);

    for (const f of studentGroupFields) {
      if (!f.requiredOnComplete) continue;
      const item = input.studentResponses?.[f.fieldKey];
      if (item?.notRecorded) {
        if (!String(item.notRecordedReason || "").trim()) {
          issues.push({
            fieldKey: f.fieldKey,
            sectionCode: "II_STUDENT",
            label: `II.${f.itemNumber || ""} ${f.label}`.trim(),
            message: `Mục II.${f.itemNumber || ""} (${f.label}): Đã chọn "Chưa ghi nhận", vui lòng nhập rõ lý do.`,
          });
        }
      } else if (!String(item?.responseText || "").trim()) {
        issues.push({
          fieldKey: f.fieldKey,
          sectionCode: "II_STUDENT",
          label: `II.${f.itemNumber || ""} ${f.label}`.trim(),
          message: `Mục II.${f.itemNumber || ""} (${f.label}): Chưa nhập nội dung ghi nhận trao đổi với học sinh (hoặc chọn Chưa ghi nhận kèm lý do).`,
        });
      }
    }

    const obsChecks: Array<{ key: string; val?: string | null; fallbackLabel: string }> = [
      { key: "obs_strengths_interests", val: input.obsStrengthsInterests, fallbackLabel: "Điểm mạnh và sở thích nổi bật" },
      { key: "obs_communication_style", val: input.obsCommunicationStyle, fallbackLabel: "Cách giao tiếp" },
      { key: "obs_participation_level", val: input.obsParticipationLevel, fallbackLabel: "Mức độ tham gia" },
      { key: "obs_support_needs", val: input.obsSupportNeeds, fallbackLabel: "Nhu cầu hỗ trợ ban đầu" },
    ];
    for (const oc of obsChecks) {
      const f = fieldByKey.get(oc.key);
      if (f && !f.requiredOnComplete) continue;
      if (!String(oc.val || "").trim()) {
        issues.push({
          fieldKey: oc.key,
          sectionCode: "III_TEACHER",
          label: f?.label || oc.fallbackLabel,
          message: `Mục III (${f?.label || oc.fallbackLabel}): Vui lòng nhập ghi nhận của giáo viên phỏng vấn.`,
        });
      }
    }
  }

  if (checkParentPart) {
    const pNameField = fieldByKey.get("gen_parent_name");
    if (pNameField?.requiredOnComplete !== false && !String(input.parentFullName || "").trim()) {
      issues.push({
        fieldKey: "gen_parent_name",
        sectionCode: "I_GENERAL",
        label: pNameField?.label || "Họ tên PHHS",
        message: "Vui lòng nhập Họ tên PHHS trao đổi.",
      });
    }

    const pRelField = fieldByKey.get("gen_parent_relationship");
    if (pRelField?.requiredOnComplete !== false && !String(input.parentRelationship || "").trim()) {
      issues.push({
        fieldKey: "gen_parent_relationship",
        sectionCode: "I_GENERAL",
        label: pRelField?.label || "Quan hệ với HS",
        message: "Vui lòng nhập Quan hệ của người trao đổi với học sinh.",
      });
    }

    const parentGroupFields = fields
      .filter((f) => f.sectionCode === "IV_PARENT")
      .sort((a, b) => a.sortOrder - b.sortOrder);

    for (const f of parentGroupFields) {
      if (!f.requiredOnComplete) continue;
      const item = input.parentResponses?.[f.fieldKey];
      if (item?.notRecorded) {
        if (!String(item.notRecordedReason || "").trim()) {
          issues.push({
            fieldKey: f.fieldKey,
            sectionCode: "IV_PARENT",
            label: `IV.${f.itemNumber || ""} ${f.label}`.trim(),
            message: `Mục IV.${f.itemNumber || ""} (${f.label}): Đã chọn "Chưa ghi nhận", vui lòng nhập rõ lý do.`,
          });
        }
      } else if (!String(item?.responseText || "").trim()) {
        issues.push({
          fieldKey: f.fieldKey,
          sectionCode: "IV_PARENT",
          label: `IV.${f.itemNumber || ""} ${f.label}`.trim(),
          message: `Mục IV.${f.itemNumber || ""} (${f.label}): Chưa nhập nội dung trao đổi với PHHS (hoặc chọn Chưa ghi nhận kèm lý do).`,
        });
      }
    }
  }

  if (checkOrientationPart) {
    const f1 = fieldByKey.get("plan_strengths_priority");
    if ((!f1 || f1.requiredOnComplete) && !String(input.planStrengthsPriority || "").trim()) {
      issues.push({
        fieldKey: "plan_strengths_priority",
        sectionCode: "V_ORIENTATION",
        label: "V.1 Điểm mạnh và nhu cầu ưu tiên của học sinh",
        message: "Mục V.1: Vui lòng nhập Điểm mạnh và nhu cầu ưu tiên của học sinh.",
      });
    }

    const actionsText = formatFollowUpActionsToText(input.followUpActions || []);
    const mergedGoalsActions = String(input.planGoalsActionsText || "").trim() || actionsText;
    const f2 = fieldByKey.get("plan_goals_actions");
    if ((!f2 || f2.requiredOnComplete) && !mergedGoalsActions) {
      issues.push({
        fieldKey: "plan_goals_actions",
        sectionCode: "V_ORIENTATION",
        label: "V.2 Mục tiêu ban đầu và hành động thống nhất với HS, PHHS",
        message: "Mục V.2: Vui lòng nhập Mục tiêu ban đầu và hành động thống nhất (hoặc thêm dòng trong bảng hành động).",
      });
    }

    const topics = rawTopics;
    if (topics.length === 0) {
      issues.push({
        fieldKey: "plan_further_topics",
        sectionCode: "V_ORIENTATION",
        label: "V.4 Nội dung cần tìm hiểu thêm",
        message: "Mục V.4: Vui lòng chọn 'Không' hoặc ít nhất một nội dung cần tìm hiểu thêm.",
      });
    }

    const hasSpecificInquiry = topics.some((t) => t !== "KHONG");
    const hasCoordinator = Boolean(String(input.planCoordinator || "").trim());
    const hasActionList = (input.followUpActions || []).some((a) => String(a.actionContent || "").trim() !== "");

    if (topics.includes("KHAC") && !String(input.planFurtherOtherText || "").trim()) {
      issues.push({
        fieldKey: "plan_further_other_text",
        sectionCode: "V_ORIENTATION",
        label: "V.4 Nội dung khác cần tìm hiểu thêm",
        message: "Mục V.4: Đã chọn 'Khác', vui lòng ghi rõ nội dung cần tìm hiểu thêm.",
      });
    }

    if (hasSpecificInquiry) {
      if (!String(input.planReferralReason || "").trim()) {
        issues.push({
          fieldKey: "plan_referral_reason",
          sectionCode: "V_ORIENTATION",
          label: "V.4 Lý do đề nghị",
          message: "Mục V.4: Khi đề nghị tìm hiểu thêm / phối hợp, bắt buộc nhập rõ Lý do đề nghị.",
        });
      }
      if (!String(input.planReferralReceiver || "").trim()) {
        issues.push({
          fieldKey: "plan_referral_receiver",
          sectionCode: "V_ORIENTATION",
          label: "V.4 Người / bộ phận tiếp nhận",
          message: "Mục V.4: Khi đề nghị tìm hiểu thêm / phối hợp, bắt buộc ghi rõ Người hoặc bộ phận tiếp nhận.",
        });
      }
    }

    // Chỉ bắt buộc Mốc trao đổi lại khi có hành động tiếp nối hoặc phối hợp/tìm hiểu thêm
    const requiresReviewDate = hasSpecificInquiry || hasCoordinator || hasActionList;
    if (requiresReviewDate && !String(input.planReviewDate || "").trim()) {
      issues.push({
        fieldKey: "plan_review_date",
        sectionCode: "V_ORIENTATION",
        label: "V.3 Mốc trao đổi lại",
        message: "Mục V.3: Có hành động tiếp nối / nội dung phối hợp tìm hiểu thêm, vui lòng chọn Mốc trao đổi lại.",
      });
    }

    const f5 = fieldByKey.get("plan_handover_notes");
    if ((!f5 || f5.requiredOnComplete) && !String(input.planHandoverNotes || "").trim()) {
      issues.push({
        fieldKey: "plan_handover_notes",
        sectionCode: "V_ORIENTATION",
        label: "V.5 Nội dung bàn giao cho GVCN/bộ phận liên quan khi nhập học",
        message: "Mục V.5: Vui lòng nhập Nội dung bàn giao cho GVCN/bộ phận liên quan khi nhập học.",
      });
    }
  }

  return { valid: issues.length === 0, issues };
}

// ============================================================================
// KIỂM TRA XUNG ĐỘT PHẠM VI & THỨ TỰ ƯU TIÊN KHI PHÁT HÀNH CẤU HÌNH MẪU
// ============================================================================

export interface ScopeComparableTemplate {
  id: string;
  code: string;
  name: string;
  grades: string[];
  educationSystems: string[];
  campusIds: string[];
  periodIds: string[];
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  priorityOrder: number;
  status: string;
}

function setsOverlapWithAll(a: string[], b: string[]): boolean {
  const normA = (a && a.length > 0 ? a : ["ALL"]).map((x) => String(x).trim().toUpperCase());
  const normB = (b && b.length > 0 ? b : ["ALL"]).map((x) => String(x).trim().toUpperCase());
  if (normA.includes("ALL") || normB.includes("ALL")) return true;
  const setB = new Set(normB);
  return normA.some((item) => setB.has(item));
}

function dateRangesOverlap(
  fromA?: string | null,
  toA?: string | null,
  fromB?: string | null,
  toB?: string | null
): boolean {
  const startA = fromA ? new Date(fromA).getTime() : Number.NEGATIVE_INFINITY;
  const endA = toA ? new Date(toA).getTime() : Number.POSITIVE_INFINITY;
  const startB = fromB ? new Date(fromB).getTime() : Number.NEGATIVE_INFINITY;
  const endB = toB ? new Date(toB).getTime() : Number.POSITIVE_INFINITY;
  if (Number.isNaN(startA) || Number.isNaN(endA) || Number.isNaN(startB) || Number.isNaN(endB)) {
    return true;
  }
  return startA <= endB && startB <= endA;
}

export interface ScopeConflictCheckResult {
  canPublish: boolean;
  blockingConflicts: Array<{
    conflictingTemplateId: string;
    conflictingCode: string;
    conflictingName: string;
    priorityOrder: number;
    reason: string;
  }>;
  prioritizedOverlaps: Array<{
    conflictingTemplateId: string;
    conflictingCode: string;
    conflictingName: string;
    winnerCode: string;
    candidatePriority: number;
    existingPriority: number;
    explanation: string;
  }>;
}

export function detectTemplateScopeConflicts(
  candidate: ScopeComparableTemplate,
  existingActiveTemplates: ScopeComparableTemplate[]
): ScopeConflictCheckResult {
  const blockingConflicts: ScopeConflictCheckResult["blockingConflicts"] = [];
  const prioritizedOverlaps: ScopeConflictCheckResult["prioritizedOverlaps"] = [];

  for (const other of existingActiveTemplates) {
    if (other.id === candidate.id || other.code === candidate.code) continue;
    if (String(other.status).toUpperCase() !== "ACTIVE") continue;

    const gradeHit = setsOverlapWithAll(candidate.grades, other.grades);
    const sysHit = setsOverlapWithAll(candidate.educationSystems, other.educationSystems);
    const campusHit = setsOverlapWithAll(candidate.campusIds, other.campusIds);
    const periodHit = setsOverlapWithAll(candidate.periodIds, other.periodIds);
    const timeHit = dateRangesOverlap(
      candidate.effectiveFrom,
      candidate.effectiveTo,
      other.effectiveFrom,
      other.effectiveTo
    );

    if (gradeHit && sysHit && campusHit && periodHit && timeHit) {
      if (candidate.priorityOrder === other.priorityOrder) {
        blockingConflicts.push({
          conflictingTemplateId: other.id,
          conflictingCode: other.code,
          conflictingName: other.name,
          priorityOrder: other.priorityOrder,
          reason: `Trùng phạm vi áp dụng (Khối/Hệ/Cơ sở/Thời gian) với mẫu "${other.code} – ${other.name}" và có cùng độ ưu tiên (${other.priorityOrder}). Vui lòng chỉnh phạm vi hoặc đặt thứ tự ưu tiên khác biệt rõ ràng trước khi phát hành.`,
        });
      } else {
        const winnerCode =
          candidate.priorityOrder < other.priorityOrder ? candidate.code : other.code;
        prioritizedOverlaps.push({
          conflictingTemplateId: other.id,
          conflictingCode: other.code,
          conflictingName: other.name,
          winnerCode,
          candidatePriority: candidate.priorityOrder,
          existingPriority: other.priorityOrder,
          explanation: `Giao thoa phạm vi với ${other.code}; hệ thống ưu tiên áp dụng ${winnerCode} (số thứ tự ưu tiên nhỏ hơn được ưu tiên trước: ${candidate.code}=${candidate.priorityOrder} so với ${other.code}=${other.priorityOrder}).`,
        });
      }
    }
  }

  return {
    canPublish: blockingConflicts.length === 0,
    blockingConflicts,
    prioritizedOverlaps,
  };
}

// ============================================================================
// KIỂM TRA AN TOÀN CÔNG THỨC ĐIỂM & MAPPING FILE XUẤT (CHỐNG THỰC THI MÃ TÙY Ý)
// ============================================================================

export const ALLOWED_MAPPING_SOURCE_PREFIXES = [
  "student.",
  "period.",
  "batch.",
  "campus.",
  "score.",
  "rubric.",
  "tci.",
  "pvdh.",
  "meta.",
] as const;

/**
 * Chỉ cho phép biến [col0]..[col31], hằng số thập phân, ngoặc đơn và toán tử + - * /
 * Tuyệt đối chặn hàm, thuộc tính, dấu chấm chữ, dấu chấm phẩy, gán hoặc biểu thức JS tùy ý.
 */
export function validateSafeScoreFormula(
  formulaExpr: string,
  columnCount = 32
): { valid: boolean; error?: string } {
  const trimmed = String(formulaExpr || "").trim();
  if (!trimmed) {
    return { valid: false, error: "Công thức tùy chỉnh không được để trống." };
  }
  if (trimmed.length > 300) {
    return { valid: false, error: "Công thức vượt quá độ dài cho phép (300 ký tự)." };
  }

  // Strip valid [colN] tokens first
  const colMatches = Array.from(trimmed.matchAll(/\[col(\d+)\]/g));
  for (const m of colMatches) {
    const idx = Number(m[1]);
    if (!Number.isInteger(idx) || idx < 0 || idx >= columnCount) {
      return {
        valid: false,
        error: `Biến [col${m[1]}] nằm ngoài phạm vi số cột thành phần (0..${Math.max(0, columnCount - 1)}).`,
      };
    }
  }

  const replaced = trimmed.replace(/\[col\d+\]/g, "1");
  // Only digits, decimal dot, whitespace, + - * / ( ) are permitted
  if (!/^[0-9.+\-*/()\s]+$/.test(replaced)) {
    return {
      valid: false,
      error: "Công thức chứa ký tự hoặc từ khóa không nằm trong danh sách cho phép (chỉ cho phép [col0]..[colN], số và toán tử + - * / ( )).",
    };
  }

  // Verify balanced parentheses
  let depth = 0;
  for (const ch of replaced) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth < 0) {
      return { valid: false, error: "Dấu ngoặc đơn trong công thức không cân bằng." };
    }
  }
  if (depth !== 0) {
    return { valid: false, error: "Dấu ngoặc đơn trong công thức không cân bằng." };
  }

  // Reject consecutive binary operators like **, //, /*
  if (/\*\*|\/\/|\/\*|\*\//.test(replaced)) {
    return { valid: false, error: "Toán tử trong công thức không hợp lệ." };
  }

  return { valid: true };
}

export interface ExportMappingItemInput {
  fieldKey: string;
  sourcePath: string;
  targetFormat: "HTML_PDF" | "XLSX" | "DOCX" | string;
  targetRef: string;
  dataType: string;
  formatPattern?: string | null;
  isRequired?: boolean;
  emptyValuePolicy?: string;
}

const VALID_XLSX_CELL_REGEX = /^([A-Za-z0-9_À-ỹ\s.-]{1,31}!)?(\$?[A-Z]{1,3}\$?[1-9][0-9]{0,5}|table_row:[A-Z]{1,3})$/u;
const VALID_PLACEHOLDER_REGEX = /^(\{\{[a-zA-Z0-9_.]+\}\}|section:[a-zA-Z0-9_.-]+|frame:[a-zA-Z0-9_.-]+)$/;

export function validateExportMappings(params: {
  resultType: "SCORE" | "RUBRIC" | "CRITERIA" | "ORIENTATION" | string;
  exportFormat: "HTML_PDF" | "XLSX" | "DOCX" | string;
  mappings: ExportMappingItemInput[];
  requiredFieldKeys?: string[];
}): { valid: boolean; errors: string[]; warnings: string[] } {
  const { resultType, exportFormat, mappings, requiredFieldKeys = [] } = params;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!["HTML_PDF", "XLSX", "DOCX"].includes(exportFormat)) {
    errors.push(`Định dạng xuất "${exportFormat}" chưa được hỗ trợ thực tế (chỉ hỗ trợ HTML_PDF, XLSX, DOCX).`);
  }

  const seenFieldKeys = new Set<string>();
  const seenTargets = new Set<string>();

  for (let i = 0; i < mappings.length; i++) {
    const m = mappings[i];
    const rowLabel = `Dòng mapping #${i + 1} (${m.fieldKey || "chưa đặt key"})`;

    if (!m.fieldKey || !/^[a-zA-Z0-9_.-]{2,80}$/.test(m.fieldKey)) {
      errors.push(`${rowLabel}: fieldKey không hợp lệ (chỉ dùng chữ cái, số, _, ., -).`);
    } else if (seenFieldKeys.has(m.fieldKey)) {
      errors.push(`${rowLabel}: Trùng lặp fieldKey "${m.fieldKey}".`);
    } else {
      seenFieldKeys.add(m.fieldKey);
    }

    const src = String(m.sourcePath || "").trim();
    const hasAllowedPrefix = ALLOWED_MAPPING_SOURCE_PREFIXES.some((p) => src.startsWith(p));
    if (!hasAllowedPrefix || /[;()=`${}\\]/.test(src)) {
      errors.push(
        `${rowLabel}: Nguồn dữ liệu "${src}" không nằm trong danh sách biến cho phép hoặc chứa ký tự không an toàn.`
      );
    }

    // Không áp dụng trường Tổng điểm / Điểm số cho biểu mẫu Định hướng hoặc Tiêu chí TCI
    if (
      (resultType === "ORIENTATION" || resultType === "CRITERIA") &&
      (src.startsWith("score.composite") || src.startsWith("score.total") || m.fieldKey === "total_score")
    ) {
      errors.push(
        `${rowLabel}: Loại biểu mẫu "${resultType}" không áp dụng trường Tổng điểm số ("${src}").`
      );
    }

    const tgt = String(m.targetRef || "").trim();
    const fmt = String(m.targetFormat || exportFormat).toUpperCase();
    const targetKey = `${fmt}::${tgt}`;
    if (!tgt) {
      errors.push(`${rowLabel}: Thiếu đích xuất (targetRef).`);
    } else if (seenTargets.has(targetKey)) {
      errors.push(`${rowLabel}: Trùng đích xuất "${tgt}" trên định dạng ${fmt}.`);
    } else {
      seenTargets.add(targetKey);
    }

    if (fmt === "XLSX" && tgt && !VALID_XLSX_CELL_REGEX.test(tgt)) {
      errors.push(
        `${rowLabel}: Ô/vùng Excel "${tgt}" sai cú pháp (ví dụ hợp lệ: "PhieuDiem!C8", "B12", hoặc "table_row:D").`
      );
    }
    if ((fmt === "HTML_PDF" || fmt === "DOCX") && tgt && !VALID_PLACEHOLDER_REGEX.test(tgt)) {
      errors.push(
        `${rowLabel}: Placeholder "${tgt}" sai cú pháp (ví dụ hợp lệ: "{{student_code}}", "section:II_STUDENT", "frame:tci_c16_images").`
      );
    }

    if (!["TEXT", "NUMBER", "DATE", "BOOLEAN", "IMAGE_LIST", "ACTION_LIST"].includes(String(m.dataType || "").toUpperCase())) {
      errors.push(`${rowLabel}: Kiểu dữ liệu "${m.dataType}" không hợp lệ.`);
    }
  }

  for (const reqKey of requiredFieldKeys) {
    if (!seenFieldKeys.has(reqKey)) {
      errors.push(`Thiếu mapping bắt buộc cho trường "${reqKey}".`);
    }
  }

  if (mappings.length === 0) {
    warnings.push("Chưa khai báo dòng mapping xuất dữ liệu nào.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Bảo vệ chống Formula Injection khi xuất nội dung người dùng sang Excel / CSV
 */
export function sanitizeSpreadsheetCell(value: unknown): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Tách bạch rõ 6 trạng thái kết quả khảo sát (Tuyệt đối không biến ô trống thành 0 điểm hoặc Không đạt)
 */
export function resolveSubjectAssessmentStatus(params: {
  isApplicable?: boolean;
  isExempt?: boolean;
  isAbsentOrNotTaken?: boolean;
  rawScores?: Array<string | number | null | undefined>;
  compositeScore?: number | null;
  passScore?: number | null;
}): { status: ResultStatusCode; displayScore: string } {
  if (params.isApplicable === false) {
    return { status: "NOT_APPLICABLE", displayScore: "Không áp dụng" };
  }
  if (params.isExempt === true) {
    return { status: "EXEMPT", displayScore: "Được miễn" };
  }
  if (params.isAbsentOrNotTaken === true) {
    return { status: "NOT_TAKEN", displayScore: "Không làm" };
  }

  const rawList = Array.isArray(params.rawScores) ? params.rawScores : [];
  const nonEmpty = rawList.filter((v) => v !== null && v !== undefined && String(v).trim() !== "");

  // Nếu có ký hiệu đặc biệt lưu trong ô điểm
  const upperTokens = nonEmpty.map((v) => String(v).trim().toUpperCase());
  if (upperTokens.some((t) => ["MIEN", "MIỄN", "EXEMPT"].includes(t))) {
    return { status: "EXEMPT", displayScore: "Được miễn" };
  }
  if (upperTokens.some((t) => ["KAD", "KHONG_AP_DUNG", "KHÔNG ÁP DỤNG", "N/A"].includes(t))) {
    return { status: "NOT_APPLICABLE", displayScore: "Không áp dụng" };
  }
  if (upperTokens.some((t) => ["KL", "KHONG_LAM", "KHÔNG LÀM", "VANG", "VẮNG"].includes(t))) {
    return { status: "NOT_TAKEN", displayScore: "Không làm" };
  }

  // Chưa nhập kết quả -> giữ nguyên trạng thái NOT_ENTERED, KHÔNG gán 0 điểm hay Không đạt
  if (nonEmpty.length === 0 && (params.compositeScore === null || params.compositeScore === undefined)) {
    return { status: "NOT_ENTERED", displayScore: "Chưa nhập" };
  }

  const numericScore =
    params.compositeScore !== null && params.compositeScore !== undefined && Number.isFinite(params.compositeScore)
      ? params.compositeScore
      : (() => {
          const n = Number(String(nonEmpty[0]).replace(",", "."));
          return Number.isFinite(n) ? n : null;
        })();

  if (numericScore !== null && params.passScore !== null && params.passScore !== undefined) {
    return {
      status: numericScore >= params.passScore ? "PASSED" : "NOT_PASSED",
      displayScore: String(numericScore),
    };
  }

  return {
    status: "PASSED",
    displayScore: numericScore !== null ? String(numericScore) : String(nonEmpty[0] || ""),
  };
}
