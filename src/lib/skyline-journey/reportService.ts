import { prisma } from "@/lib/db";
import { ensureSkylineJourneyTables } from "./schemaInit";
import {
  getAnyStageByLessonCode,
  getGradeCurriculumBundle,
  normalizeElementaryGrade
} from "./multi-grade-catalog";

export type EducationLevelCode = "PRIMARY" | "SECONDARY";

export interface SurveyDistribution {
  VERY_LOVE: number;
  LOVE: number;
  NORMAL: number;
  NEED_SUPPORT: number;
  OTHER: number;
  positiveCount: number;
  positiveRatePercent: number;
}

export interface GamificationMetricsSummary {
  totalClasses: number;
  enrolledStudents: number;
  surveyedStudents: number;
  surveyRatePercent: number;
  playedStudents: number;
  participationRatePercent: number;
  totalStagePlays: number;
  completedStages: number;
  waitingConfirmStages: number;
  inProgressStages: number;
  needsRevisionStages: number;
  completionRatePercent: number;
  avgScorePercent: number;
  totalFeathers: number;
  surveyDistribution: SurveyDistribution;
}

export interface LevelReportRow extends GamificationMetricsSummary {
  levelCode: EducationLevelCode;
  levelName: string;
  gradeRange: string;
  gamificationStatus: "ACTIVE" | "PLANNED";
  gamificationStatusLabel: string;
}

export interface GradeReportRow extends GamificationMetricsSummary {
  grade: string;
  levelCode: EducationLevelCode;
  levelName: string;
  curriculumCode: string;
  totalCatalogStages: number;
  gamificationStatus: "ACTIVE" | "PLANNED";
}

export interface ClassReportRow extends GamificationMetricsSummary {
  classId: string;
  className: string;
  grade: string;
  levelCode: EducationLevelCode;
  levelName: string;
  educationSystem: string;
  campusId: string;
  campusCode: string;
  campusName: string;
  teacherName: string;
}

export interface StageReportRow {
  grade: string;
  levelCode: EducationLevelCode;
  levelName: string;
  curriculumCode: string;
  periodIndex: number;
  lessonCode: string;
  lessonName: string;
  mechanic: string;
  totalPlayers: number;
  completedCount: number;
  waitingCount: number;
  inProgressCount: number;
  needsRevisionCount: number;
  completionRatePercent: number;
  avgScorePercent: number;
  avgAttempts: number;
  totalCriteriaCount: number;
  avgAchievedCriteria: number;
}

export interface StudentGameDetailRow {
  id: string;
  lessonCode: string;
  lessonName: string;
  periodIndex: number;
  curriculumCode: string;
  status: string;
  scorePercent: number;
  achievedCriteriaCount: number;
  totalCriteriaCount: number;
  attemptsCount: number;
  feathersEarned: number;
  durationSeconds: number | null;
  studentReflection: string | null;
  teacherFeedback: string | null;
  lastPlayedAt: string | null;
  completedAt: string | null;
}

export interface StudentGameSummaryRow {
  studentId: string;
  studentCode: string;
  studentName: string;
  classId: string;
  className: string;
  grade: string;
  levelCode: EducationLevelCode;
  levelName: string;
  campusId: string;
  campusName: string;
  teacherName: string;
  hasSurveyed: boolean;
  surveyInterestLevel: string | null;
  surveyInterestLabel: string | null;
  surveyFavoriteActivities: string[];
  surveyNote: string | null;
  surveySubmittedAt: string | null;
  characterName: string | null;
  playedGamesCount: number;
  completedGamesCount: number;
  waitingConfirmCount: number;
  inProgressCount: number;
  needsRevisionCount: number;
  completionRatePercent: number;
  avgScorePercent: number;
  totalAttempts: number;
  totalFeathers: number;
  lastPlayedAt: string | null;
  games: StudentGameDetailRow[];
}

export interface FinEduGamificationReportData {
  academicYear: { id: string; name: string } | null;
  academicYears: Array<{ id: string; name: string; status: string }>;
  campuses: Array<{ id: string; code: string; name: string }>;
  overview: GamificationMetricsSummary;
  levelSummary: LevelReportRow[];
  gradeSummary: GradeReportRow[];
  classSummary: ClassReportRow[];
  stageResults: StageReportRow[];
  studentGameResults: StudentGameSummaryRow[];
  generatedAt: string;
}

export function roundPercent(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function normalizeGradeNumber(rawGrade: string | null | undefined): string {
  const cleaned = String(rawGrade || "").trim().toUpperCase();
  const match = cleaned.match(/(\d{1,2})/);
  return match ? match[1] : cleaned;
}

export function getEducationLevelFromGrade(grade: string): {
  levelCode: EducationLevelCode;
  levelName: string;
  gradeRange: string;
} {
  const num = parseInt(normalizeGradeNumber(grade), 10);
  if (num >= 1 && num <= 5) {
    return {
      levelCode: "PRIMARY",
      levelName: "Tiểu học",
      gradeRange: "Khối 1–5"
    };
  }
  return {
    levelCode: "SECONDARY",
    levelName: "THCS",
    gradeRange: "Khối 6–9"
  };
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

interface RawProgressRow {
  id?: string;
  studentId?: string;
  studentCode?: string | null;
  studentName?: string | null;
  classId?: string;
  academicYearId?: string;
  programCode?: string | null;
  lessonCode?: string | null;
  periodIndex?: number | null;
  status?: string | null;
  hasPlayed?: number | boolean | null;
  autoChallengePassed?: number | boolean | null;
  attemptsCount?: number | null;
  worldStateJson?: string | null;
  criteriaResultJson?: string | null;
  studentReflection?: string | null;
  teacherFeedback?: string | null;
  feathersEarned?: number | null;
  lastPlayedAt?: string | null;
  completedAt?: string | null;
  updatedAt?: string | null;
}

interface RawSurveyRow {
  id?: string;
  studentId?: string;
  classId?: string;
  academicYearId?: string;
  lessonCode?: string | null;
  rewardType?: string | null;
  metadataJson?: string | null;
  awardedAt?: string | null;
}

export function extractStageScorePercent(row: {
  worldStateJson?: string | null;
  autoChallengePassed?: number | boolean | null;
}): number {
  const ws = safeJsonParse<{ scorePercent?: unknown }>(row.worldStateJson, {});
  if (typeof ws?.scorePercent === "number" && Number.isFinite(ws.scorePercent)) {
    return Math.max(0, Math.min(100, Math.round(ws.scorePercent)));
  }
  return Number(row.autoChallengePassed) === 1 ? 100 : 0;
}

export function computeSurveyDistribution(
  surveyItems: Array<{ interestLevel: string | null }>
): SurveyDistribution {
  const dist: SurveyDistribution = {
    VERY_LOVE: 0,
    LOVE: 0,
    NORMAL: 0,
    NEED_SUPPORT: 0,
    OTHER: 0,
    positiveCount: 0,
    positiveRatePercent: 0
  };

  for (const item of surveyItems) {
    const lv = String(item.interestLevel || "").trim().toUpperCase();
    if (lv === "VERY_LOVE") dist.VERY_LOVE += 1;
    else if (lv === "LOVE") dist.LOVE += 1;
    else if (lv === "NORMAL") dist.NORMAL += 1;
    else if (lv === "NEED_SUPPORT") dist.NEED_SUPPORT += 1;
    else dist.OTHER += 1;
  }

  const total = surveyItems.length;
  dist.positiveCount = dist.VERY_LOVE + dist.LOVE;
  dist.positiveRatePercent = roundPercent(dist.positiveCount, total);
  return dist;
}

export function aggregateMetrics(params: {
  totalClasses: number;
  enrolledStudents: number;
  surveyItems: Array<{ studentId: string; interestLevel: string | null }>;
  progressRows: Array<{
    studentId?: string;
    status?: string | null;
    hasPlayed?: number | boolean | null;
    attemptsCount?: number | null;
    feathersEarned?: number | null;
    worldStateJson?: string | null;
    autoChallengePassed?: number | boolean | null;
  }>;
}): GamificationMetricsSummary {
  const uniqueSurveyed = new Map<string, { interestLevel: string | null }>();
  for (const s of params.surveyItems) {
    if (!uniqueSurveyed.has(s.studentId)) {
      uniqueSurveyed.set(s.studentId, { interestLevel: s.interestLevel });
    }
  }

  const playedRows = params.progressRows.filter(
    (p) =>
      Number(p.hasPlayed) === 1 ||
      Number(p.attemptsCount || 0) > 0 ||
      ["IN_PROGRESS", "WAITING_CONFIRMATION", "NEEDS_REVISION", "COMPLETED"].includes(
        String(p.status || "")
      )
  );

  const uniquePlayedStudentIds = new Set(
    playedRows.map((p) => String(p.studentId || "")).filter(Boolean)
  );

  let completedStages = 0;
  let waitingConfirmStages = 0;
  let inProgressStages = 0;
  let needsRevisionStages = 0;
  let scoreSum = 0;
  let totalFeathers = 0;

  for (const row of playedRows) {
    const st = String(row.status || "");
    if (st === "COMPLETED") completedStages += 1;
    else if (st === "WAITING_CONFIRMATION") waitingConfirmStages += 1;
    else if (st === "NEEDS_REVISION") needsRevisionStages += 1;
    else inProgressStages += 1;

    scoreSum += extractStageScorePercent(row);
    totalFeathers += Number(row.feathersEarned || 0);
  }

  const surveyedStudents = uniqueSurveyed.size;
  const playedStudents = uniquePlayedStudentIds.size;
  const totalStagePlays = playedRows.length;

  return {
    totalClasses: params.totalClasses,
    enrolledStudents: params.enrolledStudents,
    surveyedStudents,
    surveyRatePercent: roundPercent(surveyedStudents, params.enrolledStudents),
    playedStudents,
    participationRatePercent: roundPercent(playedStudents, params.enrolledStudents),
    totalStagePlays,
    completedStages,
    waitingConfirmStages,
    inProgressStages,
    needsRevisionStages,
    completionRatePercent: roundPercent(completedStages, totalStagePlays),
    avgScorePercent:
      totalStagePlays > 0 ? Math.round((scoreSum / totalStagePlays) * 10) / 10 : 0,
    totalFeathers,
    surveyDistribution: computeSurveyDistribution(Array.from(uniqueSurveyed.values()))
  };
}

const FIN_EDU_GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export async function getFinEduGamificationReport(filters?: {
  academicYearId?: string;
  level?: string; // ALL | PRIMARY | SECONDARY
  campusId?: string;
  grade?: string;
  classId?: string;
}): Promise<FinEduGamificationReportData> {
  await ensureSkylineJourneyTables();

  const [academicYears, campuses] = await Promise.all([
    prisma.academicYear.findMany({
      select: { id: true, name: true, status: true, isOff: true, startDate: true },
      orderBy: { startDate: "desc" }
    }),
    prisma.campus.findMany({
      orderBy: { campusCode: "asc" }
    })
  ]);

  const activeYear =
    (filters?.academicYearId
      ? academicYears.find((y) => y.id === filters.academicYearId)
      : academicYears.find((y) => y.status === "ACTIVE" && !y.isOff)) ||
    academicYears[0] ||
    null;

  const academicYearId = activeYear?.id || "ay_2025_2026";

  // Fetch FIN_EDU assignments, classes (grades 1-9), active students, game progress, and welcome surveys
  const [finAssignments, allFinGradeClasses, rawProgressRows, rawSurveyRows] = await Promise.all([
    prisma.specialTeachingAssignment.findMany({
      where: {
        status: "ACTIVE",
        subject: { code: "FIN_EDU" },
        class: { academicYearId }
      },
      include: {
        teacher: { select: { id: true, teacherName: true } }
      }
    }),
    prisma.class.findMany({
      where: {
        academicYearId,
        grade: { in: FIN_EDU_GRADES }
      },
      include: {
        campus: true,
        students: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            studentCode: true,
            studentName: true,
            classId: true
          },
          orderBy: { studentName: "asc" }
        }
      },
      orderBy: [{ grade: "asc" }, { className: "asc" }]
    }),
    prisma.$queryRawUnsafe(
      `SELECT id, studentId, studentCode, studentName, classId, academicYearId, programCode,
              lessonCode, periodIndex, status, hasPlayed, autoChallengePassed, attemptsCount,
              worldStateJson, criteriaResultJson, studentReflection, teacherFeedback,
              feathersEarned, lastPlayedAt, completedAt, updatedAt
       FROM skyline_quest_progress
       WHERE academicYearId = ?
       ORDER BY COALESCE(lastPlayedAt, updatedAt) DESC`,
      academicYearId
    ) as Promise<Array<RawProgressRow>>,
    prisma.$queryRawUnsafe(
      `SELECT id, studentId, classId, academicYearId, lessonCode, rewardType, metadataJson, awardedAt
       FROM skyline_reward_ledger
       WHERE academicYearId = ? AND rewardType = 'WELCOME_SURVEY'
       ORDER BY awardedAt DESC`,
      academicYearId
    ) as Promise<Array<RawSurveyRow>>
  ]);

  const assignedClassIds = new Set(finAssignments.map((a) => a.classId));
  const teacherByClassId = new Map<string, string>();
  for (const a of finAssignments) {
    if (a.classId && a.teacher?.teacherName) {
      teacherByClassId.set(a.classId, a.teacher.teacherName);
    }
  }

  const activityClassIds = new Set<string>();
  for (const p of rawProgressRows) {
    if (p.classId) activityClassIds.add(String(p.classId));
  }
  for (const s of rawSurveyRows) {
    if (s.classId) activityClassIds.add(String(s.classId));
  }

  // Keep classes that have FIN_EDU teaching assignment OR have game/survey activity
  const finClassesAll = allFinGradeClasses.filter(
    (c) => assignedClassIds.has(c.id) || activityClassIds.has(c.id)
  );

  // Apply user filters (level, campusId, grade, classId)
  const levelFilter =
    filters?.level && filters.level !== "ALL"
      ? (filters.level.toUpperCase() as EducationLevelCode)
      : null;
  const campusFilter = filters?.campusId && filters.campusId !== "ALL" ? filters.campusId : null;
  const gradeFilter =
    filters?.grade && filters.grade !== "ALL" ? normalizeGradeNumber(filters.grade) : null;
  const classFilter = filters?.classId && filters.classId !== "ALL" ? filters.classId : null;

  const filteredClasses = finClassesAll.filter((c) => {
    const g = normalizeGradeNumber(c.grade);
    const lv = getEducationLevelFromGrade(g).levelCode;
    if (levelFilter && lv !== levelFilter) return false;
    if (campusFilter && c.campusId !== campusFilter) return false;
    if (gradeFilter && g !== gradeFilter) return false;
    if (classFilter && c.id !== classFilter) return false;
    return true;
  });

  const filteredClassMap = new Map(filteredClasses.map((c) => [c.id, c]));

  // Map students in filtered classes
  const studentMap = new Map<
    string,
    {
      studentId: string;
      studentCode: string;
      studentName: string;
      classId: string;
      className: string;
      grade: string;
      levelCode: EducationLevelCode;
      levelName: string;
      campusId: string;
      campusName: string;
      teacherName: string;
    }
  >();

  for (const cls of filteredClasses) {
    const g = normalizeGradeNumber(cls.grade);
    const lv = getEducationLevelFromGrade(g);
    const campusName = cls.campus?.campusName || "";
    const teacherName = teacherByClassId.get(cls.id) || "Chưa phân công";
    for (const stu of cls.students) {
      studentMap.set(stu.id, {
        studentId: stu.id,
        studentCode: stu.studentCode || "",
        studentName: stu.studentName || "Học sinh",
        classId: cls.id,
        className: cls.className || "",
        grade: g,
        levelCode: lv.levelCode,
        levelName: lv.levelName,
        campusId: cls.campusId,
        campusName,
        teacherName
      });
    }
  }

  // Filter progress & survey rows to the filtered classes
  const filteredProgress = rawProgressRows.filter((p) => filteredClassMap.has(String(p.classId)));
  const filteredSurveys = rawSurveyRows
    .filter((s) => filteredClassMap.has(String(s.classId)))
    .map((s) => {
      const meta = safeJsonParse<{
        interestLevel?: unknown;
        interestLabel?: unknown;
        favoriteActivities?: unknown;
        note?: unknown;
        characterName?: unknown;
        submittedAt?: unknown;
      }>(s.metadataJson, {});
      return {
        studentId: String(s.studentId),
        classId: String(s.classId),
        interestLevel: meta?.interestLevel ? String(meta.interestLevel) : null,
        interestLabel: meta?.interestLabel ? String(meta.interestLabel) : null,
        favoriteActivities: Array.isArray(meta?.favoriteActivities)
          ? meta.favoriteActivities.map(String)
          : [],
        note: meta?.note ? String(meta.note) : null,
        characterName: meta?.characterName ? String(meta.characterName) : null,
        submittedAt: (meta?.submittedAt ? String(meta.submittedAt) : null) || s.awardedAt || null
      };
    });

  // Lookup any student who played/surveyed in filteredClasses but wasn't in ACTIVE students list
  const extraStudentIds = Array.from(
    new Set([
      ...filteredProgress.map((p) => String(p.studentId)),
      ...filteredSurveys.map((s) => String(s.studentId))
    ])
  ).filter((sid) => !studentMap.has(sid));

  if (extraStudentIds.length > 0) {
    const extraStudents = await prisma.student.findMany({
      where: { id: { in: extraStudentIds } },
      select: { id: true, studentCode: true, studentName: true, classId: true }
    });
    for (const stu of extraStudents) {
      const cls = filteredClassMap.get(stu.classId);
      if (!cls) continue;
      const g = normalizeGradeNumber(cls.grade);
      const lv = getEducationLevelFromGrade(g);
      studentMap.set(stu.id, {
        studentId: stu.id,
        studentCode: stu.studentCode || "",
        studentName: stu.studentName || "Học sinh",
        classId: cls.id,
        className: cls.className || "",
        grade: g,
        levelCode: lv.levelCode,
        levelName: lv.levelName,
        campusId: cls.campusId,
        campusName: cls.campus?.campusName || "",
        teacherName: teacherByClassId.get(cls.id) || "Chưa phân công"
      });
    }
  }

  // 1. Overview KPI summary
  const totalEnrolledStudents = filteredClasses.reduce((sum, c) => sum + c.students.length, 0);
  const overview = aggregateMetrics({
    totalClasses: filteredClasses.length,
    enrolledStudents: totalEnrolledStudents,
    surveyItems: filteredSurveys,
    progressRows: filteredProgress
  });

  // 2. Level Summary (Bậc học: Tiểu học 1–5, THCS 6–9)
  const levelsConfig: Array<{
    levelCode: EducationLevelCode;
    levelName: string;
    gradeRange: string;
    grades: string[];
    gamificationStatus: "ACTIVE" | "PLANNED";
    gamificationStatusLabel: string;
  }> = [
    {
      levelCode: "PRIMARY",
      levelName: "Tiểu học",
      gradeRange: "Khối 1–5",
      grades: ["1", "2", "3", "4", "5"],
      gamificationStatus: "ACTIVE",
      gamificationStatusLabel: "Đang triển khai Game hóa (Hành trình Sky-Line)"
    },
    {
      levelCode: "SECONDARY",
      levelName: "THCS",
      gradeRange: "Khối 6–9",
      grades: ["6", "7", "8", "9"],
      gamificationStatus: "PLANNED",
      gamificationStatusLabel: "Học chương trình GDTC (Chưa kích hoạt Game)"
    }
  ];

  const levelSummary: LevelReportRow[] = levelsConfig
    .filter((cfg) => !levelFilter || cfg.levelCode === levelFilter)
    .map((cfg) => {
      const lvClasses = filteredClasses.filter((c) =>
        cfg.grades.includes(normalizeGradeNumber(c.grade))
      );
      const lvClassIds = new Set(lvClasses.map((c) => c.id));
      const lvEnrolled = lvClasses.reduce((sum, c) => sum + c.students.length, 0);
      const lvSurveys = filteredSurveys.filter((s) => lvClassIds.has(s.classId));
      const lvProgress = filteredProgress.filter((p) => lvClassIds.has(String(p.classId)));
      const metrics = aggregateMetrics({
        totalClasses: lvClasses.length,
        enrolledStudents: lvEnrolled,
        surveyItems: lvSurveys,
        progressRows: lvProgress
      });
      const hasAnyActivity = metrics.playedStudents > 0 || metrics.surveyedStudents > 0;
      return {
        ...metrics,
        levelCode: cfg.levelCode,
        levelName: cfg.levelName,
        gradeRange: cfg.gradeRange,
        gamificationStatus: hasAnyActivity ? "ACTIVE" : cfg.gamificationStatus,
        gamificationStatusLabel: hasAnyActivity
          ? "Đang triển khai Game hóa (Hành trình Sky-Line)"
          : cfg.gamificationStatusLabel
      };
    });

  // 3. Grade Summary (Khối 1 -> 9)
  const gradeSummary: GradeReportRow[] = FIN_EDU_GRADES.filter((g) => {
    if (gradeFilter && g !== gradeFilter) return false;
    if (levelFilter && getEducationLevelFromGrade(g).levelCode !== levelFilter) return false;
    return true;
  }).map((g) => {
    const lv = getEducationLevelFromGrade(g);
    const grClasses = filteredClasses.filter((c) => normalizeGradeNumber(c.grade) === g);
    const grClassIds = new Set(grClasses.map((c) => c.id));
    const grEnrolled = grClasses.reduce((sum, c) => sum + c.students.length, 0);
    const grSurveys = filteredSurveys.filter((s) => grClassIds.has(s.classId));
    const grProgress = filteredProgress.filter((p) => grClassIds.has(String(p.classId)));
    const isPrimary = lv.levelCode === "PRIMARY";
    const bundle = isPrimary ? getGradeCurriculumBundle(normalizeElementaryGrade(g)) : null;

    const metrics = aggregateMetrics({
      totalClasses: grClasses.length,
      enrolledStudents: grEnrolled,
      surveyItems: grSurveys,
      progressRows: grProgress
    });

    return {
      ...metrics,
      grade: g,
      levelCode: lv.levelCode,
      levelName: lv.levelName,
      curriculumCode: bundle ? bundle.curriculumCode : `TC0${g}`,
      totalCatalogStages: bundle ? bundle.stages.length : 0,
      gamificationStatus: isPrimary || metrics.playedStudents > 0 ? "ACTIVE" : "PLANNED"
    };
  });

  // 4. Class Summary (Cơ sở & Lớp học)
  const classSummary: ClassReportRow[] = filteredClasses.map((cls) => {
    const g = normalizeGradeNumber(cls.grade);
    const lv = getEducationLevelFromGrade(g);
    const clsSurveys = filteredSurveys.filter((s) => s.classId === cls.id);
    const clsProgress = filteredProgress.filter((p) => String(p.classId) === cls.id);
    const metrics = aggregateMetrics({
      totalClasses: 1,
      enrolledStudents: cls.students.length,
      surveyItems: clsSurveys,
      progressRows: clsProgress
    });
    return {
      ...metrics,
      classId: cls.id,
      className: cls.className || "",
      grade: g,
      levelCode: lv.levelCode,
      levelName: lv.levelName,
      educationSystem: cls.educationSystem || "HNS",
      campusId: cls.campusId,
      campusCode: cls.campus?.campusCode || "",
      campusName: cls.campus?.campusName || "",
      teacherName: teacherByClassId.get(cls.id) || "Chưa phân công"
    };
  });

  // 5. Stage / Game Lesson Results
  const primaryGradesInScope = ["1", "2", "3", "4", "5"].filter((g) => {
    if (levelFilter && levelFilter !== "PRIMARY") return false;
    if (gradeFilter && g !== gradeFilter) return false;
    return true;
  });

  const stageMap = new Map<
    string,
    {
      grade: string;
      curriculumCode: string;
      periodIndex: number;
      lessonCode: string;
      lessonName: string;
      mechanic: string;
      totalCriteriaCount: number;
      rows: Array<RawProgressRow>;
    }
  >();

  for (const g of primaryGradesInScope) {
    const bundle = getGradeCurriculumBundle(g);
    for (const st of bundle.stages) {
      stageMap.set(st.lessonCode.toUpperCase(), {
        grade: g,
        curriculumCode: bundle.curriculumCode,
        periodIndex: st.periodIndex,
        lessonCode: st.lessonCode,
        lessonName: st.lessonName,
        mechanic: st.interactive.mechanic,
        totalCriteriaCount: st.criteria.length,
        rows: []
      });
    }
  }

  for (const p of filteredProgress) {
    const code = String(p.lessonCode || "").toUpperCase();
    if (!code) continue;
    if (!stageMap.has(code)) {
      const cls = filteredClassMap.get(String(p.classId));
      const g = normalizeGradeNumber(cls?.grade || "2");
      const stDef = getAnyStageByLessonCode(code);
      stageMap.set(code, {
        grade: g,
        curriculumCode: String(p.programCode || `TC0${g}S`),
        periodIndex: Number(p.periodIndex || stDef?.periodIndex || 0),
        lessonCode: String(p.lessonCode || code),
        lessonName: stDef?.lessonName || String(p.lessonCode || code),
        mechanic: stDef?.interactive?.mechanic || "GAME",
        totalCriteriaCount: stDef?.criteria?.length || 0,
        rows: []
      });
    }
    stageMap.get(code)!.rows.push(p);
  }

  const stageResults: StageReportRow[] = Array.from(stageMap.values())
    .map((entry) => {
      const lv = getEducationLevelFromGrade(entry.grade);
      const played = entry.rows.filter(
        (p) =>
          Number(p.hasPlayed) === 1 ||
          Number(p.attemptsCount || 0) > 0 ||
          ["IN_PROGRESS", "WAITING_CONFIRMATION", "NEEDS_REVISION", "COMPLETED"].includes(
            String(p.status || "")
          )
      );
      const totalPlayers = played.length;
      const completedCount = played.filter((p) => p.status === "COMPLETED").length;
      const waitingCount = played.filter((p) => p.status === "WAITING_CONFIRMATION").length;
      const needsRevisionCount = played.filter((p) => p.status === "NEEDS_REVISION").length;
      const inProgressCount =
        totalPlayers - completedCount - waitingCount - needsRevisionCount;

      let scoreSum = 0;
      let attemptsSum = 0;
      let criteriaSum = 0;
      for (const p of played) {
        scoreSum += extractStageScorePercent(p);
        attemptsSum += Number(p.attemptsCount || 1);
        const cr = safeJsonParse<string[]>(p.criteriaResultJson, []);
        criteriaSum += Array.isArray(cr) ? cr.length : 0;
      }

      return {
        grade: entry.grade,
        levelCode: lv.levelCode,
        levelName: lv.levelName,
        curriculumCode: entry.curriculumCode,
        periodIndex: entry.periodIndex,
        lessonCode: entry.lessonCode,
        lessonName: entry.lessonName,
        mechanic: entry.mechanic,
        totalPlayers,
        completedCount,
        waitingCount,
        inProgressCount,
        needsRevisionCount,
        completionRatePercent: roundPercent(completedCount, totalPlayers),
        avgScorePercent:
          totalPlayers > 0 ? Math.round((scoreSum / totalPlayers) * 10) / 10 : 0,
        avgAttempts:
          totalPlayers > 0 ? Math.round((attemptsSum / totalPlayers) * 10) / 10 : 0,
        totalCriteriaCount: entry.totalCriteriaCount,
        avgAchievedCriteria:
          totalPlayers > 0 ? Math.round((criteriaSum / totalPlayers) * 10) / 10 : 0
      };
    })
    .sort((a, b) => {
      if (b.totalPlayers !== a.totalPlayers) return b.totalPlayers - a.totalPlayers;
      if (a.grade !== b.grade) return Number(a.grade) - Number(b.grade);
      return a.periodIndex - b.periodIndex;
    });

  // 6. Per-Student Game & Survey Results
  const surveyByStudent = new Map<string, (typeof filteredSurveys)[number]>();
  for (const s of filteredSurveys) {
    if (!surveyByStudent.has(s.studentId)) {
      surveyByStudent.set(s.studentId, s);
    }
  }

  const progressByStudent = new Map<string, Array<RawProgressRow>>();
  for (const p of filteredProgress) {
    const sid = String(p.studentId);
    if (!progressByStudent.has(sid)) progressByStudent.set(sid, []);
    progressByStudent.get(sid)!.push(p);
  }

  const studentGameResults: StudentGameSummaryRow[] = Array.from(studentMap.values())
    .map((stu) => {
      const sv = surveyByStudent.get(stu.studentId) || null;
      const rawProgs = progressByStudent.get(stu.studentId) || [];
      const playedProgs = rawProgs.filter(
        (p) =>
          Number(p.hasPlayed) === 1 ||
          Number(p.attemptsCount || 0) > 0 ||
          ["IN_PROGRESS", "WAITING_CONFIRMATION", "NEEDS_REVISION", "COMPLETED"].includes(
            String(p.status || "")
          )
      );

      const games: StudentGameDetailRow[] = playedProgs
        .map((p) => {
          const stDef = getAnyStageByLessonCode(String(p.lessonCode || ""));
          const ws = safeJsonParse<{ durationSeconds?: unknown }>(p.worldStateJson, {});
          const cr = safeJsonParse<string[]>(p.criteriaResultJson, []);
          return {
            id: String(p.id),
            lessonCode: String(p.lessonCode || ""),
            lessonName: stDef?.lessonName || String(p.lessonCode || ""),
            periodIndex: Number(p.periodIndex || stDef?.periodIndex || 0),
            curriculumCode: String(p.programCode || `TC0${stu.grade}S`),
            status: String(p.status || "IN_PROGRESS"),
            scorePercent: extractStageScorePercent(p),
            achievedCriteriaCount: Array.isArray(cr) ? cr.length : 0,
            totalCriteriaCount: stDef?.criteria?.length || 0,
            attemptsCount: Number(p.attemptsCount || 1),
            feathersEarned: Number(p.feathersEarned || 0),
            durationSeconds:
              typeof ws?.durationSeconds === "number" ? Math.round(ws.durationSeconds) : null,
            studentReflection: p.studentReflection || null,
            teacherFeedback: p.teacherFeedback || null,
            lastPlayedAt: p.lastPlayedAt || p.updatedAt || null,
            completedAt: p.completedAt || null
          };
        })
        .sort((a, b) => a.periodIndex - b.periodIndex);

      const playedGamesCount = games.length;
      const completedGamesCount = games.filter((g) => g.status === "COMPLETED").length;
      const waitingConfirmCount = games.filter((g) => g.status === "WAITING_CONFIRMATION").length;
      const needsRevisionCount = games.filter((g) => g.status === "NEEDS_REVISION").length;
      const inProgressCount =
        playedGamesCount - completedGamesCount - waitingConfirmCount - needsRevisionCount;

      const avgScorePercent =
        playedGamesCount > 0
          ? Math.round(
              (games.reduce((acc, g) => acc + g.scorePercent, 0) / playedGamesCount) * 10
            ) / 10
          : 0;
      const totalAttempts = games.reduce((acc, g) => acc + g.attemptsCount, 0);
      const totalFeathers = games.reduce((acc, g) => acc + g.feathersEarned, 0);

      let lastPlayedAt: string | null = null;
      for (const g of games) {
        const ts = g.completedAt || g.lastPlayedAt;
        if (ts && (!lastPlayedAt || ts > lastPlayedAt)) {
          lastPlayedAt = ts;
        }
      }

      return {
        studentId: stu.studentId,
        studentCode: stu.studentCode,
        studentName: stu.studentName,
        classId: stu.classId,
        className: stu.className,
        grade: stu.grade,
        levelCode: stu.levelCode,
        levelName: stu.levelName,
        campusId: stu.campusId,
        campusName: stu.campusName,
        teacherName: stu.teacherName,
        hasSurveyed: Boolean(sv),
        surveyInterestLevel: sv?.interestLevel || null,
        surveyInterestLabel: sv?.interestLabel || null,
        surveyFavoriteActivities: sv?.favoriteActivities || [],
        surveyNote: sv?.note || null,
        surveySubmittedAt: sv?.submittedAt || null,
        characterName: sv?.characterName || null,
        playedGamesCount,
        completedGamesCount,
        waitingConfirmCount,
        inProgressCount,
        needsRevisionCount,
        completionRatePercent: roundPercent(completedGamesCount, playedGamesCount),
        avgScorePercent,
        totalAttempts,
        totalFeathers,
        lastPlayedAt,
        games
      };
    })
    .sort((a, b) => {
      // Prioritize students with game plays, then surveyed, then by class & name
      if (b.playedGamesCount !== a.playedGamesCount) return b.playedGamesCount - a.playedGamesCount;
      if (Number(b.hasSurveyed) !== Number(a.hasSurveyed))
        return Number(b.hasSurveyed) - Number(a.hasSurveyed);
      if (a.className !== b.className) return a.className.localeCompare(b.className, "vi");
      return a.studentName.localeCompare(b.studentName, "vi");
    });

  return {
    academicYear: activeYear ? { id: activeYear.id, name: activeYear.name } : null,
    academicYears: academicYears.map((y) => ({ id: y.id, name: y.name, status: y.status })),
    campuses: campuses.map((c) => ({
      id: c.id,
      code: c.campusCode || "",
      name: c.campusName || ""
    })),
    overview,
    levelSummary,
    gradeSummary,
    classSummary,
    stageResults,
    studentGameResults,
    generatedAt: new Date().toISOString()
  };
}
