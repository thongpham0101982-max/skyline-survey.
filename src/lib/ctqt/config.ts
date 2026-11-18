export type CtqtLevel = "PRIMARY" | "MIDDLE" | "HIGH";

export interface CtqtSubjectDef {
  code: string;
  nameVi: string;
  nameEn: string;
  sheetName: string;
  isQualitative?: boolean;
  color: {
    bg: string;
    border: string;
    text: string;
    badge: string;
  };
  scoreColumns: {
    key: string;
    labelVi: string;
    labelEn: string;
    shortLabel: string;
    maxScore?: number;
    isIelts?: boolean;
  }[];
}

export interface CtqtLevelConfig {
  level: CtqtLevel;
  levelNameVi: string;
  levelNameEn: string;
  grades: string[];
  subjects: CtqtSubjectDef[];
}

export const CTQT_LEVEL_CONFIGS: Record<CtqtLevel, CtqtLevelConfig> = {
  PRIMARY: {
    level: "PRIMARY",
    levelNameVi: "Tiểu học (Khối 1 - 5)",
    levelNameEn: "Primary (Grades 1 - 5)",
    grades: ["1", "2", "3", "4", "5", "K1", "K2", "K3", "K4", "K5", "Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5"],
    subjects: [
      {
        code: "ENG",
        nameVi: "Tiếng Anh",
        nameEn: "English",
        sheetName: "Eng",
        color: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-800" },
        scoreColumns: [
          { key: "progressScores_0", labelVi: "KTTX", labelEn: "Progress Test", shortLabel: "KTTX", maxScore: 100 },
          { key: "midTermScore", labelVi: "Giữa kỳ (GK)", labelEn: "Mid Term", shortLabel: "Giữa kỳ (GK)", maxScore: 100 },
          { key: "endTermScore", labelVi: "Cuối kỳ (CK)", labelEn: "End Term", shortLabel: "Cuối kỳ (CK)", maxScore: 100 },
        ],
      },
      {
        code: "SCI",
        nameVi: "Khoa học",
        nameEn: "Science",
        sheetName: "Science",
        color: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-800" },
        scoreColumns: [
          { key: "midTermScore", labelVi: "Giữa kỳ (GK)", labelEn: "Mid Term", shortLabel: "Giữa kỳ (GK)", maxScore: 100 },
          { key: "endTermScore", labelVi: "Cuối kỳ (CK)", labelEn: "End Term", shortLabel: "Cuối kỳ (CK)", maxScore: 100 },
        ],
      },
      {
        code: "MAT",
        nameVi: "Toán quốc tế",
        nameEn: "Maths",
        sheetName: "Maths",
        color: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", badge: "bg-sky-100 text-sky-800" },
        scoreColumns: [
          { key: "midTermScore", labelVi: "Giữa kỳ (GK)", labelEn: "Mid Term", shortLabel: "Giữa kỳ (GK)", maxScore: 100 },
          { key: "endTermScore", labelVi: "Cuối kỳ (CK)", labelEn: "End Term", shortLabel: "Cuối kỳ (CK)", maxScore: 100 },
        ],
      },
    ],
  },
  MIDDLE: {
    level: "MIDDLE",
    levelNameVi: "Trung học Cơ sở (Khối 6 - 9)",
    levelNameEn: "Middle School (Grades 6 - 9)",
    grades: ["6", "7", "8", "9", "K6", "K7", "K8", "K9", "Khối 6", "Khối 7", "Khối 8", "Khối 9"],
    subjects: [
      {
        code: "ENG",
        nameVi: "Tiếng Anh",
        nameEn: "English",
        sheetName: "Eng",
        color: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-800" },
        scoreColumns: [
          { key: "progressScores_0", labelVi: "KTTX 1", labelEn: "Progress 1", shortLabel: "KTTX 1", maxScore: 100 },
          { key: "progressScores_1", labelVi: "KTTX 2", labelEn: "Progress 2", shortLabel: "KTTX 2", maxScore: 100 },
          { key: "progressScores_2", labelVi: "KTTX 3", labelEn: "Progress 3", shortLabel: "KTTX 3", maxScore: 100 },
          { key: "progressScores_3", labelVi: "KTTX 4", labelEn: "Progress 4", shortLabel: "KTTX 4", maxScore: 100 },
          { key: "midTermScore", labelVi: "Giữa kỳ (GK)", labelEn: "Mid Term", shortLabel: "Giữa kỳ (GK)", maxScore: 100 },
          { key: "endTermScore", labelVi: "Cuối kỳ (CK)", labelEn: "End Term", shortLabel: "Cuối kỳ (CK)", maxScore: 100 },
          { key: "gpaScore", labelVi: "ĐTB Môn", labelEn: "GPA / TBM", shortLabel: "ĐTB Môn", maxScore: 100 },
        ],
      },
      {
        code: "SCI",
        nameVi: "Khoa học",
        nameEn: "Science",
        sheetName: "Science",
        color: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-800" },
        scoreColumns: [
          { key: "progressScores_0", labelVi: "KTTX 1", labelEn: "Progress 1", shortLabel: "KTTX 1", maxScore: 100 },
          { key: "progressScores_1", labelVi: "KTTX 2", labelEn: "Progress 2", shortLabel: "KTTX 2", maxScore: 100 },
          { key: "midTermScore", labelVi: "Giữa kỳ (GK)", labelEn: "Mid Term", shortLabel: "Giữa kỳ (GK)", maxScore: 100 },
          { key: "endTermScore", labelVi: "Cuối kỳ (CK)", labelEn: "End Term", shortLabel: "Cuối kỳ (CK)", maxScore: 100 },
          { key: "gpaScore", labelVi: "ĐTB Môn", labelEn: "GPA / TBM", shortLabel: "ĐTB Môn", maxScore: 100 },
        ],
      },
      {
        code: "MAT",
        nameVi: "Toán quốc tế",
        nameEn: "Maths",
        sheetName: "Maths",
        color: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", badge: "bg-sky-100 text-sky-800" },
        scoreColumns: [
          { key: "progressScores_0", labelVi: "KTTX 1", labelEn: "Progress 1", shortLabel: "KTTX 1", maxScore: 100 },
          { key: "progressScores_1", labelVi: "KTTX 2", labelEn: "Progress 2", shortLabel: "KTTX 2", maxScore: 100 },
          { key: "midTermScore", labelVi: "Giữa kỳ (GK)", labelEn: "Mid Term", shortLabel: "Giữa kỳ (GK)", maxScore: 100 },
          { key: "endTermScore", labelVi: "Cuối kỳ (CK)", labelEn: "End Term", shortLabel: "Cuối kỳ (CK)", maxScore: 100 },
          { key: "gpaScore", labelVi: "ĐTB Môn", labelEn: "GPA / TBM", shortLabel: "ĐTB Môn", maxScore: 100 },
        ],
      },
      {
        code: "GLOBAL_STUDIES",
        nameVi: "Global Studies",
        nameEn: "Global Studies",
        sheetName: "Global Studies",
        isQualitative: true,
        color: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", badge: "bg-purple-100 text-purple-800" },
        scoreColumns: [],
      },
    ],
  },
  HIGH: {
    level: "HIGH",
    levelNameVi: "Trung học Phổ thông (Khối 10 - 12)",
    levelNameEn: "High School (Grades 10 - 12)",
    grades: ["10", "11", "12", "K10", "K11", "K12", "Khối 10", "Khối 11", "Khối 12"],
    subjects: [
      {
        code: "AE",
        nameVi: "Tiếng Anh Học thuật",
        nameEn: "Academic English",
        sheetName: "A.E",
        color: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-800" },
        scoreColumns: [
          { key: "midTermScore", labelVi: "Điểm số", labelEn: "Mark", shortLabel: "Điểm số", maxScore: 100 },
        ],
      },
      {
        code: "MAT",
        nameVi: "Toán",
        nameEn: "Maths",
        sheetName: "Maths",
        color: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", badge: "bg-sky-100 text-sky-800" },
        scoreColumns: [
          { key: "midTermScore", labelVi: "Điểm số", labelEn: "Mark", shortLabel: "Điểm số", maxScore: 100 },
        ],
      },
      {
        code: "SCI",
        nameVi: "Khoa học",
        nameEn: "Science",
        sheetName: "Science",
        color: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", badge: "bg-orange-100 text-orange-800" },
        scoreColumns: [
          { key: "midTermScore", labelVi: "Điểm số", labelEn: "Mark", shortLabel: "Điểm số", maxScore: 100 },
        ],
      },
      {
        code: "IELTS",
        nameVi: "IELTS",
        nameEn: "IELTS",
        sheetName: "IELTS",
        color: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", badge: "bg-indigo-100 text-indigo-800" },
        scoreColumns: [
          { key: "ieltsScore", labelVi: "IELTS Band (0-9)", labelEn: "IELTS Band", shortLabel: "IELTS Band", maxScore: 9, isIelts: true },
        ],
      },
      {
        code: "AR",
        nameVi: "Nghiên cứu Học thuật",
        nameEn: "Academic Research",
        sheetName: "A.R",
        isQualitative: true,
        color: { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", badge: "bg-teal-100 text-teal-800" },
        scoreColumns: [],
      },
    ],
  },
};

export const CORE_COMPETENCIES_DEF = [
  { key: "communication", labelVi: "Giao tiếp", labelEn: "Communication" },
  { key: "collaboration", labelVi: "Hợp tác", labelEn: "Collaboration" },
  { key: "responsibility", labelVi: "Có trách nhiệm", labelEn: "Responsibility" },
  { key: "criticalThinking", labelVi: "Tư duy phản biện", labelEn: "Critical Thinking" },
  { key: "creativity", labelVi: "Sáng tạo", labelEn: "Creativity" },
  { key: "problemSolving", labelVi: "Giải quyết vấn đề", labelEn: "Problem Solving" },
];

export const CORE_COMPETENCY_RATINGS = [
  { code: "E", labelVi: "Tốt", labelEn: "Excellent", color: "text-emerald-700 bg-emerald-100 border-emerald-300" },
  { code: "S", labelVi: "Đạt yêu cầu", labelEn: "Satisfactory", color: "text-blue-700 bg-blue-100 border-blue-300" },
  { code: "N", labelVi: "Cần cải thiện", labelEn: "Needs improvement", color: "text-amber-700 bg-amber-100 border-amber-300" },
  { code: "U", labelVi: "Chưa đạt", labelEn: "Unsatisfactory", color: "text-rose-700 bg-rose-100 border-rose-300" },
];

/**
 * Detect the CTQT educational level from class name or class grade
 */
export function detectCtqtLevel(className?: string, grade?: string, level?: string): CtqtLevel {
  const normClass = (className || "").toUpperCase().trim();
  const normGrade = (grade || "").toUpperCase().trim();
  const normLevel = (level || "").toLowerCase().trim();

  // Check 10-12
  if (
    normClass.startsWith("10") ||
    normClass.startsWith("11") ||
    normClass.startsWith("12") ||
    ["10", "11", "12", "K10", "K11", "K12"].some(g => normGrade.includes(g)) ||
    normLevel.includes("thpt") ||
    normLevel.includes("high")
  ) {
    return "HIGH";
  }

  // Check 6-9
  if (
    normClass.startsWith("6") ||
    normClass.startsWith("7") ||
    normClass.startsWith("8") ||
    normClass.startsWith("9") ||
    ["6", "7", "8", "9", "K6", "K7", "K8", "K9"].some(g => normGrade.includes(g)) ||
    normLevel.includes("thcs") ||
    normLevel.includes("trung học cơ sở") ||
    normLevel.includes("middle")
  ) {
    return "MIDDLE";
  }

  // Default to PRIMARY (1-5)
  return "PRIMARY";
}

/**
 * Check if a class is an International / Bilingual class eligible for CTQT (Grade 1 - 12)
 */
export function isCtqtClass(
  className?: string,
  educationSystem?: string,
  level?: string | null,
  grade?: string | null
): boolean {
  if (!className) return false;
  const upper = className.toUpperCase().trim();
  const eduUpper = (educationSystem || "").toUpperCase().trim();
  const levelLower = (level || "").toLowerCase().trim();

  // Exclude preschool (Mầm non) classes from CTQT K-12 gradebook
  if (levelLower.includes("mầm non") || levelLower.includes("mam non") || eduUpper.startsWith("MN")) {
    return false;
  }

  return (
    upper.includes("INT") ||
    upper.includes("UK") ||
    upper.includes("COMPASS") ||
    upper.includes("CAMBRIDGE") ||
    upper.includes("BILINGUAL") ||
    upper.includes("QUOC TE") ||
    upper.includes("QUỐC TẾ") ||
    upper.endsWith("S") ||
    eduUpper === "HNG" ||
    eduUpper === "SB" ||
    eduUpper.includes("INT") ||
    eduUpper.includes("QUỐC TẾ") ||
    eduUpper.includes("UK")
  );
}

/**
 * Extract numeric grade (1 - 12) from className or grade field for natural sorting
 */
export function extractCtqtGradeNumber(className?: string | null, grade?: string | null): number {
  const normClass = (className || "").trim();
  const classMatch = normClass.match(/^(\d{1,2})(?:\D|$)/);
  if (classMatch) {
    const num = parseInt(classMatch[1], 10);
    if (num >= 1 && num <= 12) return num;
  }

  const normGrade = (grade || "").trim();
  const gradeMatch = normGrade.match(/(\d{1,2})/);
  if (gradeMatch) {
    const num = parseInt(gradeMatch[1], 10);
    if (num >= 1 && num <= 12) return num;
  }

  return 99;
}

/**
 * Natural comparator for CTQT classes: sorts by Grade (1 -> 12), then natural className, then campus
 */
export function compareCtqtClasses(
  a: { className?: string | null; grade?: string | null; campusName?: string | null; campus?: { campusName?: string | null } | null },
  b: { className?: string | null; grade?: string | null; campusName?: string | null; campus?: { campusName?: string | null } | null }
): number {
  const gradeA = extractCtqtGradeNumber(a.className, a.grade);
  const gradeB = extractCtqtGradeNumber(b.className, b.grade);
  if (gradeA !== gradeB) return gradeA - gradeB;

  const nameCompare = (a.className || "").localeCompare(b.className || "", "vi", {
    numeric: true,
    sensitivity: "base",
  });
  if (nameCompare !== 0) return nameCompare;

  const campusA = a.campusName || a.campus?.campusName || "";
  const campusB = b.campusName || b.campus?.campusName || "";
  return campusA.localeCompare(campusB, "vi", { numeric: true });
}

