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
