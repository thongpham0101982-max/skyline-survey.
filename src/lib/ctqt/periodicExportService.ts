import * as XLSX from "xlsx";
import {
  CTQT_LEVEL_CONFIGS,
  CORE_COMPETENCIES_DEF,
  CtqtLevel,
  CtqtSubjectDef,
  detectCtqtLevel,
  extractCtqtGradeNumber,
} from "./config";

export type CtqtPeriodicCode = "GK1" | "CK1" | "HK1" | "GK2" | "CK2" | "HK2";

export interface CtqtPeriodicOption {
  code: CtqtPeriodicCode;
  label: string;
  shortLabel: string;
  semester: 1 | 2;
  mode: "MIDTERM" | "ENDTERM" | "FULL";
  description: string;
}

export const CTQT_PERIODIC_OPTIONS: CtqtPeriodicOption[] = [
  {
    code: "GK1",
    label: "Giữa học kỳ 1 (GK1)",
    shortLabel: "GK1",
    semester: 1,
    mode: "MIDTERM",
    description: "Điểm kiểm tra định kỳ Giữa HK1 (THPT gồm Điểm số / IELTS Band)",
  },
  {
    code: "CK1",
    label: "Cuối học kỳ 1 (CK1)",
    shortLabel: "CK1",
    semester: 1,
    mode: "ENDTERM",
    description: "Điểm kiểm tra định kỳ Cuối HK1 & ĐTB Môn (THCS)",
  },
  {
    code: "HK1",
    label: "Học kỳ 1 (Đầy đủ các cột điểm)",
    shortLabel: "HK1",
    semester: 1,
    mode: "FULL",
    description: "Đầy đủ KTTX, Giữa kỳ, Cuối kỳ, ĐTB Môn của HK1",
  },
  {
    code: "GK2",
    label: "Giữa học kỳ 2 (GK2)",
    shortLabel: "GK2",
    semester: 2,
    mode: "MIDTERM",
    description: "Điểm kiểm tra định kỳ Giữa HK2 (THPT gồm Điểm số / IELTS Band)",
  },
  {
    code: "CK2",
    label: "Cuối học kỳ 2 (CK2)",
    shortLabel: "CK2",
    semester: 2,
    mode: "ENDTERM",
    description: "Điểm kiểm tra định kỳ Cuối HK2 & ĐTB Môn (THCS)",
  },
  {
    code: "HK2",
    label: "Học kỳ 2 (Đầy đủ các cột điểm)",
    shortLabel: "HK2",
    semester: 2,
    mode: "FULL",
    description: "Đầy đủ KTTX, Giữa kỳ, Cuối kỳ, ĐTB Môn của HK2",
  },
];

export function getCtqtPeriodicMeta(code?: string | null): CtqtPeriodicOption {
  const norm = (code || "HK1").toUpperCase().trim() as CtqtPeriodicCode;
  return CTQT_PERIODIC_OPTIONS.find(p => p.code === norm) || CTQT_PERIODIC_OPTIONS[2];
}

export interface CtqtExportSubjectItem {
  code: string;
  nameVi: string;
  nameEn: string;
  sheetName: string;
  isQualitative: boolean;
  levels: CtqtLevel[];
}

const SUBJECT_DISPLAY_ORDER = ["ENG", "SCI", "MAT", "GLOBAL_STUDIES", "AE", "IELTS", "AR"];

/**
 * Aggregate unique CTQT subjects across a set of educational levels.
 */
export function getUniqueCtqtSubjectsForLevels(levels: CtqtLevel[]): CtqtExportSubjectItem[] {
  const activeLevels: CtqtLevel[] = levels.length > 0 ? levels : ["PRIMARY", "MIDDLE", "HIGH"];
  const map = new Map<string, CtqtExportSubjectItem>();

  for (const lvl of activeLevels) {
    const cfg = CTQT_LEVEL_CONFIGS[lvl];
    if (!cfg) continue;
    for (const sub of cfg.subjects) {
      const code = normalizeSubjectCode(sub.code);
      const existing = map.get(code);
      if (existing) {
        if (!existing.levels.includes(lvl)) {
          existing.levels.push(lvl);
        }
      } else {
        map.set(code, {
          code,
          nameVi: code === "MAT" ? "Toán quốc tế" : sub.nameVi,
          nameEn: sub.nameEn,
          sheetName: sub.sheetName,
          isQualitative: Boolean(sub.isQualitative),
          levels: [lvl],
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const ia = SUBJECT_DISPLAY_ORDER.indexOf(a.code);
    const ib = SUBJECT_DISPLAY_ORDER.indexOf(b.code);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

export function normalizeSubjectCode(code?: string | null): string {
  const upper = (code || "").toUpperCase().trim();
  if (upper === "MATH") return "MAT";
  return upper;
}

export interface PeriodicExportClass {
  id: string;
  className: string;
  grade: string;
  level: string;
  campusName: string;
  campusCode?: string;
}

export interface PeriodicExportStudent {
  id: string;
  classId: string;
  studentCode: string;
  studentName: string;
  englishName?: string | null;
  dateOfBirth?: string | Date | null;
  gender?: string | null;
}

export interface PeriodicExportGradeEntry {
  classId: string;
  studentId: string;
  subjectCode: string;
  progressScores?: string | null;
  midTermScore?: number | null;
  endTermScore?: number | null;
  gpaScore?: number | null;
  assessmentContentEn?: string | null;
  assessmentContentVi?: string | null;
  ieltsScore?: number | null;
  commentEn?: string | null;
  commentVi?: string | null;
  reviewStatus?: string | null;
}

export interface PeriodicExportCompetencyEntry {
  classId: string;
  studentId: string;
  communication?: string | null;
  collaboration?: string | null;
  responsibility?: string | null;
  criticalThinking?: string | null;
  creativity?: string | null;
  problemSolving?: string | null;
}

export interface PeriodicExportAssignment {
  classId: string;
  subjectCode: string;
  primaryTeacherName?: string | null;
  delegatedTeacherName?: string | null;
}

export interface CtqtPeriodicExportInput {
  academicYearName: string;
  campusLabel: string;
  periodCode: CtqtPeriodicCode;
  selectedGrades: number[];
  selectedSubjectCodes: string[];
  classes: PeriodicExportClass[];
  students: PeriodicExportStudent[];
  grades: PeriodicExportGradeEntry[];
  competencies: PeriodicExportCompetencyEntry[];
  assignments: PeriodicExportAssignment[];
  options?: {
    includeOverview?: boolean;
    includeSummary?: boolean;
    includeComments?: boolean;
    includeCompetencies?: boolean;
    includeAllScoreCols?: boolean;
  };
}

function formatDateVi(d: any): string {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(d);
  }
}

function formatGender(g?: string | null): string {
  const norm = (g || "").toLowerCase().trim();
  if (norm === "nu" || norm === "nữ" || norm === "f" || norm === "female") return "Nữ";
  if (norm === "nam" || norm === "m" || norm === "male") return "Nam";
  return g || "";
}

function formatReviewStatus(status?: string | null): string {
  switch ((status || "").toUpperCase()) {
    case "APPROVED":
      return "Đã duyệt";
    case "PENDING_REVIEW":
      return "Chờ duyệt";
    case "CHANGES_REQUESTED":
      return "Cần chỉnh sửa";
    case "DRAFT":
      return "Nháp";
    default:
      return "Chưa nhập";
  }
}

function parseProgressScores(raw?: string | null): (number | string)[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function sanitizeSheetName(raw: string, usedNames: Set<string>): string {
  const cleaned = raw.replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "Sheet";
  let candidate = cleaned;
  let suffix = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    const tail = ` (${suffix})`;
    candidate = `${cleaned.slice(0, 31 - tail.length)}${tail}`;
    suffix++;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function getLevelShortVi(level: CtqtLevel): string {
  if (level === "PRIMARY") return "Tiểu học";
  if (level === "MIDDLE") return "THCS";
  return "THPT";
}

function getSubjectDefForLevel(level: CtqtLevel, subjectCode: string): CtqtSubjectDef | undefined {
  const norm = normalizeSubjectCode(subjectCode);
  return CTQT_LEVEL_CONFIGS[level].subjects.find(s => normalizeSubjectCode(s.code) === norm);
}

/**
 * Determine the primary numeric score for statistics based on period mode and level.
 */
function getPrimaryNumericScore(
  grade: PeriodicExportGradeEntry | undefined,
  level: CtqtLevel,
  subjectCode: string,
  periodMode: "MIDTERM" | "ENDTERM" | "FULL"
): number | null {
  if (!grade) return null;
  const norm = normalizeSubjectCode(subjectCode);
  if (norm === "GLOBAL_STUDIES" || norm === "AR") return null;

  if (level === "HIGH") {
    if (norm === "IELTS") {
      return typeof grade.ieltsScore === "number" && !isNaN(grade.ieltsScore) ? grade.ieltsScore : null;
    }
    return typeof grade.midTermScore === "number" && !isNaN(grade.midTermScore) ? grade.midTermScore : null;
  }

  if (periodMode === "MIDTERM") {
    return typeof grade.midTermScore === "number" && !isNaN(grade.midTermScore) ? grade.midTermScore : null;
  }
  if (periodMode === "ENDTERM") {
    if (typeof grade.endTermScore === "number" && !isNaN(grade.endTermScore)) return grade.endTermScore;
    if (typeof grade.gpaScore === "number" && !isNaN(grade.gpaScore)) return grade.gpaScore;
    return null;
  }
  // FULL: prefer gpaScore -> endTermScore -> midTermScore
  if (typeof grade.gpaScore === "number" && !isNaN(grade.gpaScore)) return grade.gpaScore;
  if (typeof grade.endTermScore === "number" && !isNaN(grade.endTermScore)) return grade.endTermScore;
  if (typeof grade.midTermScore === "number" && !isNaN(grade.midTermScore)) return grade.midTermScore;
  return null;
}

function hasAnyEntryForPeriod(
  grade: PeriodicExportGradeEntry | undefined,
  level: CtqtLevel,
  subjectCode: string,
  periodMode: "MIDTERM" | "ENDTERM" | "FULL"
): boolean {
  if (!grade) return false;
  const norm = normalizeSubjectCode(subjectCode);
  if (norm === "GLOBAL_STUDIES" || norm === "AR") {
    return Boolean((grade.commentEn && grade.commentEn.trim()) || (grade.commentVi && grade.commentVi.trim()));
  }
  const num = getPrimaryNumericScore(grade, level, norm, periodMode);
  if (num !== null) return true;
  if (periodMode === "FULL") {
    const prog = parseProgressScores(grade.progressScores);
    if (prog.some(v => v !== "" && v !== null && v !== undefined)) return true;
  }
  return false;
}

interface SheetColumnSpec {
  key: string;
  header: string;
  width: number;
  extract: (grade: PeriodicExportGradeEntry | undefined, level: CtqtLevel) => string | number;
}

function buildSubjectScoreColumns(
  subjectCode: string,
  presentLevels: CtqtLevel[],
  periodMeta: CtqtPeriodicOption,
  includeAllScoreCols: boolean
): SheetColumnSpec[] {
  const norm = normalizeSubjectCode(subjectCode);
  if (norm === "GLOBAL_STUDIES" || norm === "AR") {
    return [];
  }

  const hasPrimary = presentLevels.includes("PRIMARY");
  const hasMiddle = presentLevels.includes("MIDDLE");
  const hasHigh = presentLevels.includes("HIGH");
  const showFull = periodMeta.mode === "FULL" || includeAllScoreCols;

  const cols: SheetColumnSpec[] = [];

  if (norm === "IELTS") {
    cols.push({
      key: "ieltsScore",
      header: `IELTS Band (${periodMeta.shortLabel})`,
      width: 16,
      extract: g => (g?.ieltsScore !== undefined && g?.ieltsScore !== null ? g.ieltsScore : ""),
    });
    return cols;
  }

  if (hasHigh && !hasPrimary && !hasMiddle) {
    if (showFull) {
      cols.push(
        {
          key: "assessmentContentEn",
          header: "Nội dung đánh giá (EN)",
          width: 24,
          extract: g => g?.assessmentContentEn || "",
        },
        {
          key: "assessmentContentVi",
          header: "Nội dung kiểm tra (VI)",
          width: 24,
          extract: g => g?.assessmentContentVi || "",
        }
      );
    }
    cols.push({
      key: "highMark",
      header: `Điểm số (${periodMeta.shortLabel})`,
      width: 15,
      extract: g => (g?.midTermScore !== undefined && g?.midTermScore !== null ? g.midTermScore : ""),
    });
    return cols;
  }

  // Primary / Middle (or mixed with High for SCI / MAT)
  if (showFull) {
    const maxProgress =
      norm === "ENG"
        ? hasMiddle
          ? 4
          : hasPrimary
          ? 1
          : 0
        : hasMiddle
        ? 2
        : 0;

    for (let i = 0; i < maxProgress; i++) {
      cols.push({
        key: `progress_${i}`,
        header: maxProgress === 1 ? "KTTX" : `KTTX ${i + 1}`,
        width: 10,
        extract: (g, lvl) => {
          if (lvl === "HIGH") return "";
          const arr = parseProgressScores(g?.progressScores);
          return arr[i] !== undefined && arr[i] !== null ? arr[i] : "";
        },
      });
    }

    cols.push({
      key: "midTermScore",
      header: hasHigh ? `Giữa kỳ (GK) / Điểm THPT` : `Giữa kỳ (GK${periodMeta.semester})`,
      width: hasHigh ? 20 : 15,
      extract: g => (g?.midTermScore !== undefined && g?.midTermScore !== null ? g.midTermScore : ""),
    });

    cols.push({
      key: "endTermScore",
      header: `Cuối kỳ (CK${periodMeta.semester})`,
      width: 15,
      extract: (g, lvl) => {
        if (lvl === "HIGH") return "";
        return g?.endTermScore !== undefined && g?.endTermScore !== null ? g.endTermScore : "";
      },
    });

    if (hasMiddle) {
      cols.push({
        key: "gpaScore",
        header: `ĐTB Môn (HK${periodMeta.semester})`,
        width: 15,
        extract: (g, lvl) => {
          if (lvl !== "MIDDLE") return "";
          return g?.gpaScore !== undefined && g?.gpaScore !== null ? g.gpaScore : "";
        },
      });
    }
  } else if (periodMeta.mode === "MIDTERM") {
    cols.push({
      key: "midTermScore",
      header: hasHigh ? `Điểm ${periodMeta.shortLabel} / Điểm THPT` : `Điểm ${periodMeta.shortLabel} (Giữa kỳ)`,
      width: 18,
      extract: g => (g?.midTermScore !== undefined && g?.midTermScore !== null ? g.midTermScore : ""),
    });
  } else {
    // ENDTERM (CK1 / CK2)
    cols.push({
      key: "endTermScore",
      header: hasHigh ? `Điểm ${periodMeta.shortLabel} / Điểm THPT` : `Điểm ${periodMeta.shortLabel} (Cuối kỳ)`,
      width: 18,
      extract: (g, lvl) => {
        if (lvl === "HIGH") {
          return g?.midTermScore !== undefined && g?.midTermScore !== null ? g.midTermScore : "";
        }
        return g?.endTermScore !== undefined && g?.endTermScore !== null ? g.endTermScore : "";
      },
    });
    if (hasMiddle) {
      cols.push({
        key: "gpaScore",
        header: `ĐTB Môn (HK${periodMeta.semester})`,
        width: 16,
        extract: (g, lvl) => {
          if (lvl !== "MIDDLE") return "";
          return g?.gpaScore !== undefined && g?.gpaScore !== null ? g.gpaScore : "";
        },
      });
    }
  }

  return cols;
}

/**
 * Generate a multi-sheet periodic CTQT gradebook workbook filtered by grades & subjects.
 */
export function generateCtqtPeriodicWorkbook(input: CtqtPeriodicExportInput): Buffer {
  const {
    academicYearName,
    campusLabel,
    periodCode,
    selectedGrades,
    selectedSubjectCodes,
    classes,
    students,
    grades,
    competencies,
    assignments,
    options = {},
  } = input;

  const includeOverview = options.includeOverview !== false;
  const includeSummary = options.includeSummary !== false;
  const includeComments = options.includeComments !== false;
  const includeCompetencies = Boolean(options.includeCompetencies);
  const includeAllScoreCols = Boolean(options.includeAllScoreCols);

  const periodMeta = getCtqtPeriodicMeta(periodCode);
  const wb = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();

  // Index data for fast lookup
  const studentsByClass = new Map<string, PeriodicExportStudent[]>();
  for (const st of students) {
    const list = studentsByClass.get(st.classId) || [];
    list.push(st);
    studentsByClass.set(st.classId, list);
  }
  for (const list of studentsByClass.values()) {
    list.sort((a, b) => a.studentName.localeCompare(b.studentName, "vi", { sensitivity: "base" }));
  }

  const gradeMap = new Map<string, PeriodicExportGradeEntry>();
  for (const g of grades) {
    const normCode = normalizeSubjectCode(g.subjectCode);
    gradeMap.set(`${g.classId}_${g.studentId}_${normCode}`, g);
  }

  const compMap = new Map<string, PeriodicExportCompetencyEntry>();
  for (const c of competencies) {
    compMap.set(`${c.classId}_${c.studentId}`, c);
  }

  const assignmentMap = new Map<string, PeriodicExportAssignment>();
  for (const a of assignments) {
    const normCode = normalizeSubjectCode(a.subjectCode);
    assignmentMap.set(`${a.classId}_${normCode}`, a);
  }

  const enrichedClasses = classes.map(cls => {
    const level = detectCtqtLevel(cls.className, cls.grade, cls.level);
    const gradeNum = extractCtqtGradeNumber(cls.className, cls.grade);
    const classStudents = studentsByClass.get(cls.id) || [];
    return {
      ...cls,
      ctqtLevel: level,
      gradeNum,
      gradeLabel: gradeNum >= 1 && gradeNum <= 12 ? `Khối ${gradeNum}` : cls.grade || "",
      students: classStudents,
    };
  });

  const presentLevels = Array.from(new Set(enrichedClasses.map(c => c.ctqtLevel)));
  const availableSubjects = getUniqueCtqtSubjectsForLevels(presentLevels);
  const normalizedSelectedCodes = selectedSubjectCodes.map(normalizeSubjectCode);
  const activeSubjects =
    normalizedSelectedCodes.length > 0
      ? availableSubjects.filter(s => normalizedSelectedCodes.includes(s.code))
      : availableSubjects;

  const totalStudentsCount = enrichedClasses.reduce((acc, c) => acc + c.students.length, 0);
  const nowStr = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const gradeSummaryText =
    selectedGrades.length > 0
      ? selectedGrades
          .slice()
          .sort((a, b) => a - b)
          .map(g => `K${g}`)
          .join(", ")
      : "Tất cả khối CTQT";

  // =========================================================================
  // SHEET 1: TỔNG QUAN & THỐNG KÊ ĐỊNH KỲ
  // =========================================================================
  if (includeOverview) {
    const overviewRows: any[][] = [
      ["HỆ THỐNG GIÁO DỤC SKY-LINE — BẢNG ĐIỂM CHI TIẾT ĐỊNH KỲ CTQT"],
      ["Năm học:", academicYearName, "", "Kỳ đánh giá:", periodMeta.label],
      ["Cơ sở:", campusLabel, "", "Thời gian xuất:", nowStr],
      [
        "Phạm vi khối:",
        gradeSummaryText,
        "",
        "Phạm vi môn:",
        activeSubjects.map(s => `${s.nameVi} (${s.code})`).join(", "),
      ],
      ["Tổng số lớp:", enrichedClasses.length, "", "Tổng sĩ số:", totalStudentsCount],
      [],
      ["I. THỐNG KÊ TỔNG HỢP THEO KHỐI & MÔN HỌC"],
      [
        "Khối",
        "Cấp học",
        "Mã môn",
        "Tên môn học",
        "Số lớp",
        "Tổng sĩ số",
        "Đã có điểm/NX",
        "Chưa nhập",
        "Tỷ lệ hoàn thành (%)",
        "Điểm TB",
        "Cao nhất",
        "Thấp nhất",
      ],
    ];

    const distinctGradeNums = Array.from(new Set(enrichedClasses.map(c => c.gradeNum))).sort((a, b) => a - b);

    for (const gNum of distinctGradeNums) {
      const gradeClasses = enrichedClasses.filter(c => c.gradeNum === gNum);
      if (gradeClasses.length === 0) continue;
      const lvl = gradeClasses[0].ctqtLevel;

      for (const sub of activeSubjects) {
        if (!getSubjectDefForLevel(lvl, sub.code)) continue;
        let total = 0;
        let filled = 0;
        const scores: number[] = [];

        for (const cls of gradeClasses) {
          for (const st of cls.students) {
            total++;
            const entry = gradeMap.get(`${cls.id}_${st.id}_${sub.code}`);
            if (hasAnyEntryForPeriod(entry, lvl, sub.code, periodMeta.mode)) {
              filled++;
            }
            const num = getPrimaryNumericScore(entry, lvl, sub.code, periodMeta.mode);
            if (num !== null) scores.push(num);
          }
        }

        const missing = Math.max(0, total - filled);
        const rate = total > 0 ? Number(((filled / total) * 100).toFixed(1)) : 0;
        const avg = scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : "";
        const max = scores.length > 0 ? Math.max(...scores) : "";
        const min = scores.length > 0 ? Math.min(...scores) : "";

        overviewRows.push([
          gNum >= 1 && gNum <= 12 ? `Khối ${gNum}` : `Khác`,
          getLevelShortVi(lvl),
          sub.code,
          sub.nameVi,
          gradeClasses.length,
          total,
          filled,
          missing,
          rate,
          avg,
          max,
          min,
        ]);
      }
    }

    overviewRows.push([]);
    overviewRows.push(["II. THỐNG KÊ CHI TIẾT THEO LỚP & MÔN HỌC"]);
    overviewRows.push([
      "Cơ sở",
      "Khối",
      "Lớp",
      "Mã môn",
      "Tên môn học",
      "GV giảng dạy",
      "Sĩ số",
      "Đã có điểm/NX",
      "Chưa nhập",
      "Tỷ lệ (%)",
      "Điểm TB",
      "Đã duyệt",
    ]);

    for (const cls of enrichedClasses) {
      for (const sub of activeSubjects) {
        if (!getSubjectDefForLevel(cls.ctqtLevel, sub.code)) continue;
        const assign = assignmentMap.get(`${cls.id}_${sub.code}`);
        let total = 0;
        let filled = 0;
        let approved = 0;
        const scores: number[] = [];

        for (const st of cls.students) {
          total++;
          const entry = gradeMap.get(`${cls.id}_${st.id}_${sub.code}`);
          if (hasAnyEntryForPeriod(entry, cls.ctqtLevel, sub.code, periodMeta.mode)) {
            filled++;
          }
          if (entry?.reviewStatus === "APPROVED") {
            approved++;
          }
          const num = getPrimaryNumericScore(entry, cls.ctqtLevel, sub.code, periodMeta.mode);
          if (num !== null) scores.push(num);
        }

        const missing = Math.max(0, total - filled);
        const rate = total > 0 ? Number(((filled / total) * 100).toFixed(1)) : 0;
        const avg = scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : "";

        overviewRows.push([
          cls.campusName,
          cls.gradeLabel,
          cls.className,
          sub.code,
          sub.nameVi,
          assign?.primaryTeacherName || "Chưa phân công",
          total,
          filled,
          missing,
          rate,
          avg,
          approved,
        ]);
      }
    }

    const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);
    wsOverview["!cols"] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 16 },
      { wch: 22 },
      { wch: 22 },
      { wch: 24 },
      { wch: 10 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, wsOverview, sanitizeSheetName("Tổng quan", usedSheetNames));
  }

  // =========================================================================
  // SHEET 2: TỔNG HỢP ĐA MÔN (ALL SELECTED GRADES & SUBJECTS)
  // =========================================================================
  if (includeSummary) {
    const summaryHeaders: string[] = [
      "STT",
      "Cơ sở",
      "Khối",
      "Lớp",
      "Mã học sinh",
      "Họ và tên",
      "English Name",
      "Ngày sinh",
      "Giới tính",
    ];

    const summaryColWidths: { wch: number }[] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 26 },
      { wch: 18 },
      { wch: 13 },
      { wch: 10 },
    ];

    const subjectColSpecsMap = new Map<string, SheetColumnSpec[]>();

    for (const sub of activeSubjects) {
      const subLevels = presentLevels.filter(lvl => Boolean(getSubjectDefForLevel(lvl, sub.code)));
      const specs = buildSubjectScoreColumns(sub.code, subLevels, periodMeta, includeAllScoreCols);
      subjectColSpecsMap.set(sub.code, specs);

      for (const spec of specs) {
        summaryHeaders.push(`[${sub.code}] ${sub.nameVi} - ${spec.header}`);
        summaryColWidths.push({ wch: Math.max(spec.width, 16) });
      }
      if (includeComments || sub.isQualitative) {
        summaryHeaders.push(`[${sub.code}] Nhận xét EN`, `[${sub.code}] Nhận xét VI`);
        summaryColWidths.push({ wch: 32 }, { wch: 32 });
      }
    }

    if (includeCompetencies) {
      for (const cc of CORE_COMPETENCIES_DEF) {
        summaryHeaders.push(`${cc.labelVi} (${cc.labelEn})`);
        summaryColWidths.push({ wch: 18 });
      }
    }

    const summaryRows: any[][] = [summaryHeaders];
    let stt = 1;

    for (const cls of enrichedClasses) {
      for (const st of cls.students) {
        const row: any[] = [
          stt++,
          cls.campusName,
          cls.gradeLabel,
          cls.className,
          st.studentCode,
          st.studentName,
          st.englishName || "",
          formatDateVi(st.dateOfBirth),
          formatGender(st.gender),
        ];

        for (const sub of activeSubjects) {
          const applicable = Boolean(getSubjectDefForLevel(cls.ctqtLevel, sub.code));
          const entry = applicable ? gradeMap.get(`${cls.id}_${st.id}_${sub.code}`) : undefined;
          const specs = subjectColSpecsMap.get(sub.code) || [];

          for (const spec of specs) {
            row.push(applicable ? spec.extract(entry, cls.ctqtLevel) : "");
          }
          if (includeComments || sub.isQualitative) {
            row.push(applicable ? entry?.commentEn || "" : "", applicable ? entry?.commentVi || "" : "");
          }
        }

        if (includeCompetencies) {
          const comp = compMap.get(`${cls.id}_${st.id}`);
          row.push(
            comp?.communication || "",
            comp?.collaboration || "",
            comp?.responsibility || "",
            comp?.criticalThinking || "",
            comp?.creativity || "",
            comp?.problemSolving || ""
          );
        }

        summaryRows.push(row);
      }
    }

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary["!cols"] = summaryColWidths;
    XLSX.utils.book_append_sheet(wb, wsSummary, sanitizeSheetName("TỔNG HỢP", usedSheetNames));
  }

  // =========================================================================
  // SHEETS 3..N: CHI TIẾT TỪNG MÔN HỌC
  // =========================================================================
  for (const sub of activeSubjects) {
    const subClasses = enrichedClasses.filter(cls => Boolean(getSubjectDefForLevel(cls.ctqtLevel, sub.code)));
    if (subClasses.length === 0) continue;

    const subLevels = Array.from(new Set(subClasses.map(c => c.ctqtLevel)));
    const scoreSpecs = buildSubjectScoreColumns(sub.code, subLevels, periodMeta, includeAllScoreCols);

    const headers: string[] = [
      "STT",
      "Cơ sở",
      "Khối",
      "Lớp",
      "Mã học sinh",
      "Họ và tên",
      "English Name",
      "Ngày sinh",
      "Giới tính",
      "GV giảng dạy",
    ];
    const colWidths: { wch: number }[] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 26 },
      { wch: 18 },
      { wch: 13 },
      { wch: 10 },
      { wch: 24 },
    ];

    for (const spec of scoreSpecs) {
      headers.push(spec.header);
      colWidths.push({ wch: spec.width });
    }

    headers.push("Trạng thái duyệt");
    colWidths.push({ wch: 15 });

    if (includeComments || sub.isQualitative) {
      headers.push("Nhận xét tiếng Anh (Comment EN)", "Nhận xét tiếng Việt (Nhận xét VI)");
      colWidths.push({ wch: 36 }, { wch: 36 });
    }

    const rows: any[][] = [
      [`BẢNG ĐIỂM CHI TIẾT MÔN: ${sub.nameVi.toUpperCase()} (${sub.code}) — ${periodMeta.label.toUpperCase()}`],
      [`Năm học: ${academicYearName} | Cơ sở: ${campusLabel} | Khối: ${gradeSummaryText}`],
      [],
      headers,
    ];

    let stt = 1;
    for (const cls of subClasses) {
      const assign = assignmentMap.get(`${cls.id}_${sub.code}`);
      const teacherName = assign?.primaryTeacherName || "";

      for (const st of cls.students) {
        const entry = gradeMap.get(`${cls.id}_${st.id}_${sub.code}`);
        const row: any[] = [
          stt++,
          cls.campusName,
          cls.gradeLabel,
          cls.className,
          st.studentCode,
          st.studentName,
          st.englishName || "",
          formatDateVi(st.dateOfBirth),
          formatGender(st.gender),
          teacherName,
        ];

        for (const spec of scoreSpecs) {
          row.push(spec.extract(entry, cls.ctqtLevel));
        }

        row.push(formatReviewStatus(entry?.reviewStatus));

        if (includeComments || sub.isQualitative) {
          row.push(entry?.commentEn || "", entry?.commentVi || "");
        }

        rows.push(row);
      }
    }

    const wsSub = XLSX.utils.aoa_to_sheet(rows);
    wsSub["!cols"] = colWidths;
    const sheetTitle = sanitizeSheetName(`${sub.code} - ${sub.nameVi}`, usedSheetNames);
    XLSX.utils.book_append_sheet(wb, wsSub, sheetTitle);
  }

  // =========================================================================
  // OPTIONAL SHEET: CORE COMPETENCIES
  // =========================================================================
  if (includeCompetencies) {
    const compHeaders = [
      "STT",
      "Cơ sở",
      "Khối",
      "Lớp",
      "Mã học sinh",
      "Họ và tên",
      "English Name",
      "Ngày sinh",
      "Giới tính",
      ...CORE_COMPETENCIES_DEF.map(cc => `${cc.labelVi} (${cc.labelEn})`),
    ];

    const compRows: any[][] = [
      [`ĐÁNH GIÁ NĂNG LỰC CỐT LÕI (CORE COMPETENCIES) — ${periodMeta.label.toUpperCase()}`],
      [`Năm học: ${academicYearName} | Cơ sở: ${campusLabel} | Khối: ${gradeSummaryText}`],
      [],
      compHeaders,
    ];

    let stt = 1;
    for (const cls of enrichedClasses) {
      for (const st of cls.students) {
        const comp = compMap.get(`${cls.id}_${st.id}`);
        compRows.push([
          stt++,
          cls.campusName,
          cls.gradeLabel,
          cls.className,
          st.studentCode,
          st.studentName,
          st.englishName || "",
          formatDateVi(st.dateOfBirth),
          formatGender(st.gender),
          comp?.communication || "",
          comp?.collaboration || "",
          comp?.responsibility || "",
          comp?.criticalThinking || "",
          comp?.creativity || "",
          comp?.problemSolving || "",
        ]);
      }
    }

    compRows.push([]);
    compRows.push(["", "", "", "", "", "Chú thích: E = Excellent (Tốt), S = Satisfactory (Đạt), N = Needs improvement (Cần cải thiện), U = Unsatisfactory (Chưa đạt)"]);

    const wsComp = XLSX.utils.aoa_to_sheet(compRows);
    wsComp["!cols"] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 26 },
      { wch: 18 },
      { wch: 13 },
      { wch: 10 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 22 },
      { wch: 18 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsComp, sanitizeSheetName("Core Competencies", usedSheetNames));
  }

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
