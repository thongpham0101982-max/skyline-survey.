import {
  analyzeStudentAcademicAndRegulation,
  type AdmissionRegulationConfig,
  type StudentAcademicInsight,
} from "@/lib/admissionRegulationEngine";

export type CompletenessStatus = "READY" | "INCOMPLETE" | "NO_SCORES";

export interface SubjectCompletenessItem {
  subjectName: string;
  canonicalKey: string;
  completed: boolean;
  scoreDisplay?: string;
  teacherName?: string;
}

export interface StudentCompletenessResult {
  status: CompletenessStatus;
  requiredSubjects: string[];
  completedSubjects: SubjectCompletenessItem[];
  missingSubjects: string[];
  exemptedSubjects: string[];
  extraCompletedSubjects: SubjectCompletenessItem[];
  completedCount: number;
  requiredCount: number;
  regulationStatus: StudentAcademicInsight["regulationStatus"];
  regulationBadgeLabel: string;
  hasAnyScore: boolean;
}

export function normalizeSubjectCanonicalKey(rawName: string, rawCode?: string): string {
  const code = String(rawCode || "").toLowerCase().trim();
  if (code.includes("tci") || code.includes("cpt")) return "K1_STANDARDS";
  if (code.includes("tly") || code.includes("psy")) return "PSYCHOLOGY";
  if (code.includes("nltd")) return "THINKING";
  if (code === "ept") return "EPT";
  if (code === "esl") return "ESL_SPEAKING";

  const low = String(rawName || "")
    .toLowerCase()
    .normalize("NFC")
    .trim();
  if (!low) return "UNKNOWN";

  if (low.includes("tâm lý") || low.includes("tam ly") || low.includes("sàng lọc") || low.includes("psychology")) {
    return "PSYCHOLOGY";
  }
  if (low.includes("bộ chuẩn") || low.includes("bo chuan") || low.includes("5-6 tuổi") || low.includes("5–6 tuổi") || low.includes("16 tiêu chí") || low.includes("tci")) {
    return "K1_STANDARDS";
  }
  if (low.includes("tư duy") || low.includes("tu duy") || low.includes("logic")) {
    return "THINKING";
  }
  if (low.includes("toán") || low.includes("toan") || low.includes("math")) {
    return "MATH";
  }
  if (low.includes("ngữ văn") || low.includes("ngu van") || low.includes("tiếng việt") || low.includes("tieng viet") || low === "văn" || low.includes("literature")) {
    return "LITERATURE";
  }
  if (low.includes("ept")) {
    return "EPT";
  }
  if (low.includes("esl")) {
    return "ESL_SPEAKING";
  }
  if (
    (low.includes("tiếng anh") || low.includes("tieng anh") || low.includes("english") || low.includes("anh văn") || low.includes("ta nói")) &&
    (low.includes("vấn đáp") || low.includes("van dap") || low.includes("nói") || low.includes("noi") || low.includes("speaking") || low.includes("oral") || low.includes("giao tiếp"))
  ) {
    return "ENGLISH_SPEAKING";
  }
  if (low.includes("tiếng anh") || low.includes("tieng anh") || low.includes("english") || low.includes("anh văn")) {
    return "ENGLISH_WRITTEN";
  }
  return `OTHER:${low}`;
}

function parseJsonOrArrayValues(raw: any): string[] {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v ?? "").trim()).filter(Boolean);
  }
  const str = String(raw).trim();
  if (!str || str === "[]" || str === "{}") return [];
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => String(v ?? "").trim()).filter(Boolean);
    }
    if (parsed && typeof parsed === "object") {
      return Object.values(parsed)
        .map((v) => (v !== null && v !== undefined ? String(v).trim() : ""))
        .filter(Boolean);
    }
    return parsed !== null && parsed !== undefined && String(parsed).trim() !== ""
      ? [String(parsed).trim()]
      : [];
  } catch {
    return [str];
  }
}

function hasRecordedScoreEntry(sc: any): boolean {
  if (!sc) return false;
  if (sc.score !== null && sc.score !== undefined && String(sc.score).trim() !== "") return true;
  if (parseJsonOrArrayValues(sc.scores).length > 0) return true;
  if (parseJsonOrArrayValues(sc.comments).length > 0) return true;
  if (sc.detailedScores) {
    const raw = typeof sc.detailedScores === "string" ? sc.detailedScores.trim() : JSON.stringify(sc.detailedScores);
    if (raw && raw !== "{}" && raw !== "[]") return true;
  }
  if (sc.comment && String(sc.comment).trim().length > 0) return true;
  return false;
}

function formatScoreDisplay(sc: any): string {
  if (!sc) return "";
  if (sc.score !== null && sc.score !== undefined && String(sc.score).trim() !== "") {
    return String(sc.score);
  }
  const vals = parseJsonOrArrayValues(sc.scores);
  if (vals.length > 0) return vals[0];
  return "Đã nhận xét";
}

function getScalarFallback(student: any, canonicalKey: string): string | null {
  if (!student) return null;
  const isVal = (v: any) => v !== null && v !== undefined && String(v).trim() !== "";
  switch (canonicalKey) {
    case "MATH":
      return isVal(student.mathScore) ? String(student.mathScore) : null;
    case "LITERATURE":
      return isVal(student.literatureScore) ? String(student.literatureScore) : null;
    case "ENGLISH_WRITTEN":
      return isVal(student.writtenEnglishScore) ? String(student.writtenEnglishScore) : null;
    case "ENGLISH_SPEAKING":
      return isVal(student.oralEnglishScore) ? String(student.oralEnglishScore) : null;
    case "EPT":
      return isVal(student.eptScore) ? String(student.eptScore) : null;
    case "PSYCHOLOGY":
      return isVal(student.psychologyScore) ? String(student.psychologyScore) : null;
    default:
      return null;
  }
}

/**
 * Kiểm tra đầy đủ các nội dung khảo sát bắt buộc theo Quy chế tuyển sinh Sky-Line
 * cho một học sinh K-12 dựa trên `recommendedSubjectNames` và điểm đã nhập thực tế.
 */
export function checkStudentAssessmentCompleteness(
  student: any,
  regConfig?: AdmissionRegulationConfig
): StudentCompletenessResult {
  const insight = analyzeStudentAcademicAndRegulation(student, regConfig);

  // Loại bỏ các mục chỉ mang tính định hướng / phiếu phụ huynh không phải môn GV chấm bắt buộc
  const rawRequired = (insight.recommendedSubjectNames || []).filter((name) => {
    const low = String(name || "").toLowerCase();
    return low.length > 0 && !low.includes("phiếu định hướng");
  });

  // Khử trùng lặp theo canonicalKey
  const seenReqKeys = new Set<string>();
  const requiredSubjects: string[] = [];
  for (const subj of rawRequired) {
    const key = normalizeSubjectCanonicalKey(subj);
    if (!seenReqKeys.has(key)) {
      seenReqKeys.add(key);
      requiredSubjects.push(subj);
    }
  }

  // Gom các điểm đã ghi nhận từ student.scores[]
  const scoreMap = new Map<string, { scoreDisplay: string; teacherName?: string; rawName: string }>();
  const rawScores = Array.isArray(student?.scores) ? student.scores : [];
  for (const sc of rawScores) {
    if (!hasRecordedScoreEntry(sc)) continue;
    const rawName = sc?.subject?.name || sc?.subjectName || "";
    const rawCode = sc?.subject?.code || sc?.subjectCode || "";
    const key = normalizeSubjectCanonicalKey(rawName, rawCode);
    if (!scoreMap.has(key)) {
      scoreMap.set(key, {
        scoreDisplay: formatScoreDisplay(sc),
        teacherName: sc?.teacherName || sc?.user?.fullName || undefined,
        rawName,
      });
    }
  }

  const completedSubjects: SubjectCompletenessItem[] = [];
  const missingSubjects: string[] = [];

  for (const reqName of requiredSubjects) {
    const key = normalizeSubjectCanonicalKey(reqName);
    let fromScores = scoreMap.get(key);
    // ESL (vấn đáp) chấp nhận cả điểm Tiếng Anh (vấn đáp) / TA nói khi chấm cùng đầu điểm nói
    if (!fromScores && key === "ESL_SPEAKING") {
      fromScores = scoreMap.get("ENGLISH_SPEAKING");
    }
    const fromScalar = !fromScores
      ? getScalarFallback(student, key === "ESL_SPEAKING" ? "ENGLISH_SPEAKING" : key)
      : null;
    const isCompleted = Boolean(fromScores || fromScalar);

    if (isCompleted) {
      completedSubjects.push({
        subjectName: reqName,
        canonicalKey: key,
        completed: true,
        scoreDisplay: fromScores?.scoreDisplay || fromScalar || "",
        teacherName: fromScores?.teacherName,
      });
    } else {
      missingSubjects.push(reqName);
    }
  }

  // Các môn đã chấm thêm ngoài danh sách bắt buộc (ví dụ: Tâm lý khi GV phát hiện hoặc môn định hướng)
  const extraCompletedSubjects: SubjectCompletenessItem[] = [];
  for (const [key, val] of scoreMap.entries()) {
    if (!seenReqKeys.has(key)) {
      extraCompletedSubjects.push({
        subjectName: val.rawName || key,
        canonicalKey: key,
        completed: true,
        scoreDisplay: val.scoreDisplay,
        teacherName: val.teacherName,
      });
    }
  }

  const requiredCount = requiredSubjects.length;
  const completedCount = completedSubjects.length;
  const hasAnyScore = completedCount > 0 || extraCompletedSubjects.length > 0;

  let status: CompletenessStatus = "NO_SCORES";
  if (requiredCount === 0) {
    // Tuyển thẳng / xét học bạ không cần khảo sát thêm môn bắt buộc
    status = "READY";
  } else if (missingSubjects.length === 0) {
    status = "READY";
  } else if (completedCount > 0 || extraCompletedSubjects.length > 0) {
    status = "INCOMPLETE";
  } else {
    status = "NO_SCORES";
  }

  return {
    status,
    requiredSubjects,
    completedSubjects,
    missingSubjects,
    exemptedSubjects: insight.exemptedSubjectNames || [],
    extraCompletedSubjects,
    completedCount,
    requiredCount,
    regulationStatus: insight.regulationStatus,
    regulationBadgeLabel: insight.regulationBadgeLabel,
    hasAnyScore,
  };
}
