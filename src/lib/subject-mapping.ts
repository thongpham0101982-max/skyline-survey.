/**
 * Module quản lý ánh xạ Mã môn & Tên môn giữa Quản lý Môn học (Subject) và Môn Khảo sát (AssessmentSubject).
 */

export interface SubjectMappingConfig {
  mainCode: string;
  mainName: string;
  assessmentCode: string;
  assessmentName: string;
  isSubSubject: boolean;
  parentCode?: string;
}

export const SUBJECT_MAPPING_LIST: SubjectMappingConfig[] = [
  { mainCode: "TOA", mainName: "Toán học", assessmentCode: "TOA", assessmentName: "Toán học", isSubSubject: false },
  { mainCode: "TVI", mainName: "Tiếng Việt", assessmentCode: "TVI", assessmentName: "Tiếng Việt", isSubSubject: false },
  { mainCode: "NVA", mainName: "Ngữ Văn", assessmentCode: "NVA", assessmentName: "Ngữ Văn", isSubSubject: false },
  { mainCode: "TLY", mainName: "Tâm lý", assessmentCode: "TLY", assessmentName: "Tâm lý", isSubSubject: false },
  { mainCode: "TAv", mainName: "Tiếng Anh (viết)", assessmentCode: "TAv", assessmentName: "Tiếng Anh (viết)", isSubSubject: true, parentCode: "TAV" },
  { mainCode: "TAvd", mainName: "Tiếng Anh (vấn đáp)", assessmentCode: "TAvd", assessmentName: "Tiếng Anh (vấn đáp)", isSubSubject: true, parentCode: "TAV" },
];

/**
 * Lấy Mã môn mẹ (Main Subject Code) từ Mã môn khảo sát (Assessment Subject Code).
 * Ví dụ: 'TAv' -> 'TAV', 'TAvd' -> 'TAV', 'TOA' -> 'TOA'
 */
export function getParentSubjectCode(assessmentCode: string): string {
  if (!assessmentCode) return "";
  const code = assessmentCode.trim();
  const found = SUBJECT_MAPPING_LIST.find(
    (item) => item.assessmentCode.toLowerCase() === code.toLowerCase()
  );
  if (found && found.parentCode) {
    return found.parentCode;
  }
  return code.toUpperCase();
}

/**
 * Lấy danh sách các Mã môn khảo sát thuộc 1 Mã môn chính.
 * Ví dụ: 'TAV' -> ['TAv', 'TAvd'], 'TOA' -> ['TOA']
 */
export function getAssessmentCodesForMainSubject(mainCode: string): string[] {
  if (!mainCode) return [];
  const code = mainCode.trim().toUpperCase();
  if (code === "TAV" || code === "ENG") {
    return ["TAv", "TAvd"];
  }
  const match = SUBJECT_MAPPING_LIST.filter(
    (item) =>
      item.mainCode.toUpperCase() === code ||
      (item.parentCode && item.parentCode.toUpperCase() === code)
  );
  if (match.length > 0) {
    return match.map((m) => m.assessmentCode);
  }
  return [mainCode];
}

/**
 * Đã chuẩn hóa mã môn chưa? Trả về config đầy đủ nếu tìm thấy.
 */
export function getSubjectMappingInfo(code: string): SubjectMappingConfig | undefined {
  if (!code) return undefined;
  const clean = code.trim();
  return SUBJECT_MAPPING_LIST.find(
    (item) =>
      item.assessmentCode.toLowerCase() === clean.toLowerCase() ||
      item.mainCode.toLowerCase() === clean.toLowerCase()
  );
}

/**
 * Trích xuất và chuẩn hóa danh sách Môn Cam kết / Môn kiểm tra lại từ Ghi chú của Giám đốc/BGH.
 * Tự động phân tách 'Tiếng Anh' chung thành ['Tiếng Anh (vấn đáp)', 'Tiếng Anh (viết)'].
 */

/**
 * Trích xuất và chuẩn hóa danh sách Môn Cam kết cho Hỗ trợ học tập & Phân công giáo viên.
 * Gom các môn Tiếng Anh (viết/vấn đáp) thành 1 môn duy nhất 'Tiếng Anh' (Mã: TA / TAV).
 */
export function parseCommittedSubjects(note?: string | null, resultStr?: string | null): string[] {
  const text = `${note || ""} ${resultStr || ""}`.trim();
  if (!text) return [];

  let rawSubs: string[] = [];
  const match = text.match(/(?:Môn cam kết|Mon cam ket|Cam kết|Môn kiểm tra lại):\s*\[?([^\]\r\n]+)\]?/i);
  if (match && match[1]) {
    rawSubs = match[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  }

  if (rawSubs.length === 0) {
    if (/Toán|Math/i.test(text)) rawSubs.push("Toán học");
    if (/Tiếng Việt|TN-XH|Tự nhiên/i.test(text)) rawSubs.push("Tiếng Việt");
    if (/Ngữ văn|Literature|Văn/i.test(text) && !/Tiếng Việt/i.test(text)) rawSubs.push("Ngữ Văn");
    if (/Anh|English|ESL/i.test(text)) rawSubs.push("Tiếng Anh");
    if (/Tâm lý|Psychology/i.test(text)) rawSubs.push("Tâm lý");
  }

  const finalSubs: string[] = [];
  rawSubs.forEach((s) => {
    const clean = s.trim();
    const lower = clean.toLowerCase();
    if (lower.includes("anh") || lower.includes("english") || lower.includes("esl")) {
      if (!finalSubs.includes("Tiếng Anh")) finalSubs.push("Tiếng Anh");
    } else if (lower.includes("toán") || lower.includes("toan") || lower.includes("math")) {
      if (!finalSubs.includes("Toán")) finalSubs.push("Toán học");
    } else if (lower.includes("tiếng việt") || lower.includes("tieng viet")) {
      if (!finalSubs.includes("Tiếng Việt")) finalSubs.push("Tiếng Việt");
    } else if (lower.includes("ngữ văn") || lower.includes("ngu van") || lower.includes("literature") || lower === "văn") {
      if (!finalSubs.includes("Ngữ Văn")) finalSubs.push("Ngữ Văn");
    } else if (lower.includes("tâm lý") || lower.includes("tam ly") || lower.includes("psychology")) {
      if (!finalSubs.includes("Tâm lý")) finalSubs.push("Tâm lý");
    } else {
      if (!finalSubs.includes(clean)) finalSubs.push(clean);
    }
  });

  return finalSubs;
}
