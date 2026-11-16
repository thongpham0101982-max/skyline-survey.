import {
  CTQT_LEVEL_CONFIGS,
  CORE_COMPETENCIES_DEF,
  CORE_COMPETENCY_RATINGS,
  CtqtLevel,
  CtqtSubjectDef,
  detectCtqtLevel,
  extractCtqtGradeNumber,
  isCtqtClass,
} from "./config";

export type CtqtNormalizedStatus =
  | "APPROVED"
  | "PENDING_REVIEW"
  | "CHANGES_REQUESTED"
  | "DRAFT"
  | "UNGRADED";

export interface CtqtSubjectSemesterData {
  semester: 1 | 2;
  progressScores: number[];
  progressDisplay: string;
  midTermScore: number | null;
  endTermScore: number | null;
  gpaScore: number | null;
  ieltsScore: number | null;
  representativeScore: number | null;
  assessmentContentEn: string;
  assessmentContentVi: string;
  assessmentContentDisplay: string;
  commentEn: string;
  commentVi: string;
  reviewStatus: CtqtNormalizedStatus;
  statusLabel: string;
  teacherName: string;
  hasScore: boolean;
  hasComment: boolean;
  hasAnyData: boolean;
}

export interface CtqtSubjectPortfolioRow {
  code: string;
  nameVi: string;
  nameEn: string;
  isQualitative: boolean;
  isIelts: boolean;
  hasProgressColumn: boolean;
  sem1: CtqtSubjectSemesterData;
  sem2: CtqtSubjectSemesterData;
  annualScore: number | null;
  latestCommentEn: string;
  latestCommentVi: string;
  teacherName: string;
}

export interface CtqtCompetencyPortfolioItem {
  key: string;
  labelVi: string;
  labelEn: string;
  code: string;
  ratingLabelVi: string;
  ratingLabelEn: string;
}

export interface StudentCtqtPortfolio {
  isEligible: boolean;
  hasAnyGradeOrCompetency: boolean;
  hasSem1Data: boolean;
  hasSem2Data: boolean;
  defaultViewMode: "HK1" | "HK2" | "ALL";
  level: CtqtLevel;
  levelNameVi: string;
  levelNameEn: string;
  gradeNumber: number | null;
  className: string;
  educationSystem: string;
  subjects: CtqtSubjectPortfolioRow[];
  competenciesSem1: CtqtCompetencyPortfolioItem[] | null;
  competenciesSem2: CtqtCompetencyPortfolioItem[] | null;
  sem1ScoredCount: number;
  sem2ScoredCount: number;
  sem1AverageScore: number | null;
  sem2AverageScore: number | null;
}

function toFiniteNumber(val: unknown): number | null {
  if (val === null || val === undefined || String(val).trim() === "") return null;
  const num = Number(val);
  return Number.isFinite(num) ? Math.round(num * 10) / 10 : null;
}

export function parseCtqtProgressScores(raw?: string | number[] | null): number[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((v) => toFiniteNumber(v))
      .filter((v): v is number => v !== null);
  }
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v) => toFiniteNumber(v))
      .filter((v): v is number => v !== null);
  } catch {
    return [];
  }
}

export function normalizeCtqtStatus(
  rawStatus?: string | null,
  hasAnyData?: boolean
): { status: CtqtNormalizedStatus; label: string } {
  if (!rawStatus && !hasAnyData) {
    return { status: "UNGRADED", label: "Chưa nhập" };
  }
  const upper = String(rawStatus || "").trim().toUpperCase();
  if (upper === "APPROVED") {
    return { status: "APPROVED", label: "Đã duyệt" };
  }
  if (upper === "PENDING_REVIEW" || upper === "SUBMITTED") {
    return { status: "PENDING_REVIEW", label: "Chờ duyệt" };
  }
  if (
    upper === "CHANGES_REQUESTED" ||
    upper === "REVISION_REQUESTED" ||
    upper === "REJECTED"
  ) {
    return { status: "CHANGES_REQUESTED", label: "Cần chỉnh sửa" };
  }
  if (hasAnyData) {
    return { status: "DRAFT", label: "Bản nháp" };
  }
  return { status: "UNGRADED", label: "Chưa nhập" };
}

/**
 * Compute Middle School (Grades 6 - 9) subject GPA when not pre-saved,
 * matching DiemCtqtAdminClient & SoDiemCtqtTeacherClient:
 * (sum(progress) + 2 * midTerm + 2 * endTerm) / weightCount
 */
export function computeMiddleSubjectGpa(
  progressScores: number[],
  midTermScore: number | null,
  endTermScore: number | null
): number | null {
  const weighted: number[] = [...progressScores];
  if (midTermScore !== null) weighted.push(midTermScore, midTermScore);
  if (endTermScore !== null) weighted.push(endTermScore, endTermScore);
  if (weighted.length === 0) return null;
  const sum = weighted.reduce((acc, v) => acc + v, 0);
  return Math.round((sum / weighted.length) * 10) / 10;
}

function buildCompetencyList(rawComp: any): CtqtCompetencyPortfolioItem[] | null {
  if (!rawComp) return null;
  const hasAnyKey = CORE_COMPETENCIES_DEF.some((cc) => {
    const val = rawComp[cc.key];
    return typeof val === "string" && val.trim().length > 0;
  });
  if (!hasAnyKey) return null;

  return CORE_COMPETENCIES_DEF.map((cc) => {
    const code = String(rawComp[cc.key] || "E").trim().toUpperCase();
    const matched =
      CORE_COMPETENCY_RATINGS.find((r) => r.code === code) ||
      CORE_COMPETENCY_RATINGS[0];
    return {
      key: cc.key,
      labelVi: cc.labelVi,
      labelEn: cc.labelEn,
      code: matched.code,
      ratingLabelVi: matched.labelVi,
      ratingLabelEn: matched.labelEn,
    };
  });
}

function buildSemesterData(params: {
  semester: 1 | 2;
  level: CtqtLevel;
  sub: CtqtSubjectDef;
  entry: any;
  teacherName: string;
}): CtqtSubjectSemesterData {
  const { semester, level, sub, entry, teacherName } = params;
  const progressScores = parseCtqtProgressScores(entry?.progressScores);
  const midTermScore = toFiniteNumber(entry?.midTermScore);
  const endTermScore = toFiniteNumber(entry?.endTermScore);
  const ieltsScore = toFiniteNumber(entry?.ieltsScore);
  const savedGpa = toFiniteNumber(entry?.gpaScore);

  const isQualitative = Boolean(sub.isQualitative);
  const isIelts = sub.code === "IELTS";

  let gpaScore: number | null = savedGpa;
  if (gpaScore === null && level === "MIDDLE" && !isQualitative) {
    gpaScore = computeMiddleSubjectGpa(progressScores, midTermScore, endTermScore);
  }

  let representativeScore: number | null = null;
  if (!isQualitative) {
    if (level === "PRIMARY") {
      if (endTermScore !== null && midTermScore !== null) {
        representativeScore = Math.round(((midTermScore + endTermScore) / 2) * 10) / 10;
      } else {
        representativeScore =
          endTermScore ??
          midTermScore ??
          (progressScores.length > 0 ? progressScores[0] : null);
      }
    } else if (level === "MIDDLE") {
      representativeScore = gpaScore ?? endTermScore ?? midTermScore;
    } else if (level === "HIGH") {
      representativeScore = isIelts
        ? ieltsScore
        : midTermScore ?? gpaScore ?? endTermScore;
    }
  }

  const assessmentContentEn = entry?.assessmentContentEn
    ? String(entry.assessmentContentEn).trim()
    : "";
  const assessmentContentVi = entry?.assessmentContentVi
    ? String(entry.assessmentContentVi).trim()
    : "";
  const assessmentContentDisplay =
    assessmentContentVi ||
    assessmentContentEn ||
    (isIelts
      ? "Điểm thi IELTS Academic"
      : isQualitative
      ? "Đánh giá nghiên cứu định tính"
      : "");

  const commentEn = entry?.commentEn ? String(entry.commentEn).trim() : "";
  const commentVi = entry?.commentVi ? String(entry.commentVi).trim() : "";

  const hasScore =
    progressScores.length > 0 ||
    midTermScore !== null ||
    endTermScore !== null ||
    gpaScore !== null ||
    ieltsScore !== null;
  const hasComment = commentEn.length > 0 || commentVi.length > 0;
  const hasAnyData =
    hasScore ||
    hasComment ||
    assessmentContentEn.length > 0 ||
    assessmentContentVi.length > 0;

  const normStatus = normalizeCtqtStatus(
    entry?.reviewStatus || entry?.status,
    hasAnyData
  );

  return {
    semester,
    progressScores,
    progressDisplay: progressScores.length > 0 ? progressScores.join(" • ") : "—",
    midTermScore,
    endTermScore,
    gpaScore,
    ieltsScore,
    representativeScore,
    assessmentContentEn,
    assessmentContentVi,
    assessmentContentDisplay,
    commentEn,
    commentVi,
    reviewStatus: normStatus.status,
    statusLabel: normStatus.label,
    teacherName,
    hasScore,
    hasComment,
    hasAnyData,
  };
}

/**
 * Helper to identify Bilingual / CTQT subjects in MOET periodic/term tables
 * so they do not mix 100-point international scores into 10-point MOET tables.
 */
export function isBilingualOrCtqtSubject(
  name?: string | null,
  code?: string | null,
  category?: string | null
): boolean {
  if (String(category || "").trim().toUpperCase() === "BILINGUAL") {
    return true;
  }
  const c = String(code || "").trim().toUpperCase();
  if (
    c.startsWith("INT-") ||
    c === "MAT" ||
    c === "MATH" ||
    c === "GLOBAL_STUDIES" ||
    c === "IELTS" ||
    c === "AE" ||
    c === "AR"
  ) {
    return true;
  }
  const s = `${name || ""} ${code || ""}`.toLowerCase();
  return (
    s.includes("esl") ||
    s.includes("english") ||
    s.includes("tiếng anh tăng cường") ||
    s.includes("tav") ||
    s.includes("bilingual") ||
    s.includes("song ngữ") ||
    s.includes("math") ||
    s.includes("science") ||
    s.includes("global studies") ||
    s.includes("ielts") ||
    s.includes("academic research") ||
    s.includes("robotics")
  );
}

/**
 * Build complete CTQT & Report Card academic portfolio for a single student
 * strictly aligned with CTQT_LEVEL_CONFIGS (Grades 1-5, 6-9, 10-12).
 */
export function buildStudentCtqtPortfolio(params: {
  student: any;
  teacherByClassSemSubject?: Map<string, string>;
}): StudentCtqtPortfolio {
  const { student, teacherByClassSemSubject } = params;
  const innerStudent = student?.student || student || {};

  const className: string =
    student?.className ||
    student?.class?.className ||
    innerStudent?.class?.className ||
    innerStudent?.className ||
    "";
  const gradeRaw: string = String(
    student?.grade ??
      student?.class?.grade ??
      innerStudent?.class?.grade ??
      innerStudent?.grade ??
      ""
  );
  const levelStr: string =
    student?.class?.level ||
    innerStudent?.class?.level ||
    student?.schoolBlock ||
    "";
  const educationSystem: string =
    student?.class?.educationSystem ||
    innerStudent?.class?.educationSystem ||
    student?.educationSystem ||
    "";
  const classId: string =
    student?.classId ||
    student?.class?.id ||
    innerStudent?.classId ||
    innerStudent?.class?.id ||
    "";
  const targetYearId: string =
    student?.academicYearId ||
    student?.academicYear?.id ||
    student?.class?.academicYearId ||
    innerStudent?.academicYearId ||
    innerStudent?.class?.academicYearId ||
    "";

  const rawGrades: any[] = Array.isArray(student?.ctqtGradeEntries)
    ? student.ctqtGradeEntries
    : Array.isArray(innerStudent?.ctqtGradeEntries)
    ? innerStudent.ctqtGradeEntries
    : [];

  const rawCompetencies: any[] = Array.isArray(student?.ctqtCompetencyEntries)
    ? student.ctqtCompetencyEntries
    : Array.isArray(innerStudent?.ctqtCompetencyEntries)
    ? innerStudent.ctqtCompetencyEntries
    : [];

  // Scope entries to current student's academicYearId / classId so cross-year records don't collide
  const filterByScope = (items: any[]) => {
    if (!targetYearId && !classId) return items;
    const exactYearMatches = targetYearId
      ? items.filter((it) => !it?.academicYearId || it.academicYearId === targetYearId)
      : items;
    if (exactYearMatches.length > 0) return exactYearMatches;
    if (classId) {
      return items.filter((it) => it?.classId === classId);
    }
    return [];
  };

  const scopedGrades = filterByScope(rawGrades);
  const scopedCompetencies = filterByScope(rawCompetencies);

  // Extract teacher assignments from class.ctqtTeachingAssignments if available
  const assignmentMap = new Map<string, string>();
  if (teacherByClassSemSubject) {
    teacherByClassSemSubject.forEach((v, k) => assignmentMap.set(k, v));
  }
  const classAssignments: any[] =
    student?.class?.ctqtTeachingAssignments ||
    innerStudent?.class?.ctqtTeachingAssignments ||
    [];
  for (const ca of classAssignments) {
    if (targetYearId && ca?.academicYearId && ca.academicYearId !== targetYearId) {
      continue;
    }
    const tName =
      ca?.primaryTeacher?.teacherName ||
      ca?.primaryTeacher?.fullName ||
      ca?.teacher?.teacherName ||
      ca?.teacher?.fullName ||
      ca?.primaryTeacherName ||
      "";
    if (tName && ca?.subjectCode) {
      const cId = ca.classId || classId || "cls";
      const sem = Number(ca.semester || 1);
      const rawCode = String(ca.subjectCode).trim().toUpperCase();
      const normCode = rawCode === "MATH" ? "MAT" : rawCode;
      assignmentMap.set(`${cId}_${sem}_${normCode}`, tName);
    }
  }

  const level = detectCtqtLevel(className, gradeRaw, levelStr);
  const config = CTQT_LEVEL_CONFIGS[level] || CTQT_LEVEL_CONFIGS.PRIMARY;
  const extractedGrade = extractCtqtGradeNumber(className, gradeRaw);
  const gradeNumber = extractedGrade >= 1 && extractedGrade <= 12 ? extractedGrade : null;

  const hasAnyGradeOrCompetency =
    scopedGrades.length > 0 || scopedCompetencies.length > 0;
  const hasClassCtqtAssignments = classAssignments.some(
    (ca) => !targetYearId || !ca?.academicYearId || ca.academicYearId === targetYearId
  );
  const isEligible =
    hasAnyGradeOrCompetency ||
    hasClassCtqtAssignments ||
    isCtqtClass(className, educationSystem, levelStr, gradeRaw);

  // Build subject definitions list from grade-level config (+ any unexpected subject code in DB)
  const subjectDefs: CtqtSubjectDef[] = [...config.subjects];
  const knownCodes = new Set(subjectDefs.map((s) => s.code.toUpperCase()));
  for (const g of scopedGrades) {
    const rawCode = String(g?.subjectCode || "").trim().toUpperCase();
    const code = rawCode === "MATH" ? "MAT" : rawCode;
    if (!code || knownCodes.has(code)) continue;
    knownCodes.add(code);
    let fallbackDef: CtqtSubjectDef | undefined;
    for (const lvlCfg of Object.values(CTQT_LEVEL_CONFIGS)) {
      const found = lvlCfg.subjects.find((s) => s.code.toUpperCase() === code);
      if (found) {
        fallbackDef = found;
        break;
      }
    }
    if (fallbackDef) {
      subjectDefs.push(fallbackDef);
    }
  }

  // Index grades by `${semester}_${subjectCode}` (picking latest if multiple)
  const gradeBySemAndSub = new Map<string, any>();
  for (const g of scopedGrades) {
    const sem = Number(g?.semester) === 2 ? 2 : 1;
    const rawCode = String(g?.subjectCode || "").trim().toUpperCase();
    const code = rawCode === "MATH" ? "MAT" : rawCode;
    if (!code) continue;
    const key = `${sem}_${code}`;
    if (!gradeBySemAndSub.has(key)) {
      gradeBySemAndSub.set(key, g);
    }
  }

  const resolveTeacher = (sem: 1 | 2, code: string): string => {
    const cId = classId || "cls";
    const upper = code.toUpperCase();
    return (
      assignmentMap.get(`${cId}_${sem}_${upper}`) ||
      assignmentMap.get(`${cId}_${sem === 1 ? 2 : 1}_${upper}`) ||
      ""
    );
  };

  const subjects: CtqtSubjectPortfolioRow[] = subjectDefs.map((sub) => {
    const upperCode = sub.code.toUpperCase();
    const tSem1 = resolveTeacher(1, upperCode);
    const tSem2 = resolveTeacher(2, upperCode);

    const sem1 = buildSemesterData({
      semester: 1,
      level,
      sub,
      entry: gradeBySemAndSub.get(`1_${upperCode}`),
      teacherName: tSem1,
    });
    const sem2 = buildSemesterData({
      semester: 2,
      level,
      sub,
      entry: gradeBySemAndSub.get(`2_${upperCode}`),
      teacherName: tSem2,
    });

    let annualScore: number | null = null;
    if (!sub.isQualitative) {
      if (sem1.representativeScore !== null && sem2.representativeScore !== null) {
        annualScore =
          Math.round(
            ((sem1.representativeScore + sem2.representativeScore * 2) / 3) * 10
          ) / 10;
      } else {
        annualScore = sem2.representativeScore ?? sem1.representativeScore;
      }
    }

    const latestCommentEn = sem2.commentEn || sem1.commentEn || "";
    const latestCommentVi = sem2.commentVi || sem1.commentVi || "";

    return {
      code: sub.code,
      nameVi: sub.nameVi,
      nameEn: sub.nameEn,
      isQualitative: Boolean(sub.isQualitative),
      isIelts: sub.code === "IELTS",
      hasProgressColumn: sub.scoreColumns.some((c) =>
        c.key.startsWith("progressScores_")
      ),
      sem1,
      sem2,
      annualScore,
      latestCommentEn,
      latestCommentVi,
      teacherName: tSem2 || tSem1 || "",
    };
  });

  const compEntrySem1 = scopedCompetencies.find((c) => Number(c?.semester || 1) === 1);
  const compEntrySem2 = scopedCompetencies.find((c) => Number(c?.semester) === 2);

  const competenciesSem1 = buildCompetencyList(compEntrySem1);
  const competenciesSem2 = buildCompetencyList(compEntrySem2);

  const sem1ScoredCount = subjects.filter((s) => s.sem1.hasAnyData).length;
  const sem2ScoredCount = subjects.filter((s) => s.sem2.hasAnyData).length;

  const hasSem1Data = sem1ScoredCount > 0 || Boolean(competenciesSem1);
  const hasSem2Data = sem2ScoredCount > 0 || Boolean(competenciesSem2);

  let defaultViewMode: "HK1" | "HK2" | "ALL" = "HK1";
  if (hasSem1Data && hasSem2Data) {
    defaultViewMode = "ALL";
  } else if (hasSem2Data && !hasSem1Data) {
    defaultViewMode = "HK2";
  } else {
    defaultViewMode = "HK1";
  }

  const computeSemAvg = (semKey: "sem1" | "sem2"): number | null => {
    const vals = subjects
      .filter((s) => !s.isQualitative && !s.isIelts && s[semKey].representativeScore !== null)
      .map((s) => s[semKey].representativeScore as number);
    if (vals.length === 0) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  };

  return {
    isEligible,
    hasAnyGradeOrCompetency,
    hasSem1Data,
    hasSem2Data,
    defaultViewMode,
    level,
    levelNameVi: config.levelNameVi,
    levelNameEn: config.levelNameEn,
    gradeNumber,
    className,
    educationSystem,
    subjects,
    competenciesSem1,
    competenciesSem2,
    sem1ScoredCount,
    sem2ScoredCount,
    sem1AverageScore: computeSemAvg("sem1"),
    sem2AverageScore: computeSemAvg("sem2"),
  };
}
