import { prisma } from "@/lib/db";
import { ensureSkylineJourneyTables } from "./schemaInit";
import {
  GRADE_DIFFERENTIATION_PROFILES,
  TC02S_STAGES,
  TC02S_ZONES,
  TC02SStageDefinition,
  getTC02SStageByLessonCode
} from "./tc02s-catalog";
import {
  GRADE_CURRICULUM_BUNDLES,
  getAnyStageByLessonCode,
  getGradeCurriculumBundle,
  normalizeElementaryGrade
} from "./multi-grade-catalog";
import {
  StageActionPayload,
  StageProgressStatus,
  StageValidationResult,
  validateStageSubmission
} from "./validator";

export interface JourneyIslandSummary {
  islandId: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  curriculumCode: string | null;
  grade: string;
  educationSystem: string;
  configStatus: "ACTIVE_APPROVED" | "DISABLED_BY_ADMIN" | "UNCONFIGURED";
  statusMessage: string;
  themeColor: string;
  icon: string;
  totalCurriculumStages: number;
  assignedStagesCount: number;
  completedStagesCount: number;
  waitingConfirmationCount: number;
  needsRevisionCount: number;
  feathersEarned: number;
}

export interface StudentRankingEntry {
  rank: number;
  studentId: string;
  studentCode: string;
  fullName: string;
  className: string;
  grade: string;
  campusName: string;
  characterId: string;
  characterName: string;
  shieldsEarnedCount: number;
  completedStagesCount: number;
  teacherConfirmedCount: number;
  totalFeathers: number;
  badgeCount: number;
  totalStageScore: number;
  avgScorePercent: number;
  totalCompletionSeconds: number;
  avgCompletionSeconds: number;
  completionTimeFormatted: string;
  speedBonusPoints: number;
  rankingScore: number;
  honorTitle: string;
  isCurrentUser: boolean;
  lastPlayedAt: string | null;
}

export interface StudentStageView {
  periodIndex: number;
  lessonId: string;
  lessonCode: string;
  lessonName: string;
  topicId: string;
  topicCode: string;
  officialTopicName: string;
  creativeZoneName: string;
  isProject: boolean;
  feathersReward: number;
  badgeCode?: string;
  badgeName?: string;
  mapCoordinates: { x: number; y: number };
  criteria: Array<{
    id?: string;
    code: string;
    level: string;
    competencyGroup: string;
    description: string;
  }>;
  interactive: TC02SStageDefinition["interactive"];
  // Dynamic status & progress
  status: StageProgressStatus;
  isAssignedByTeacher: boolean;
  isExempted: boolean;
  teacherGuidance: string | null;
  hasPlayed: boolean;
  autoChallengePassed: boolean;
  teacherConfirmed: boolean;
  attemptsCount: number;
  savedActionPayload: any | null;
  worldState: any | null;
  studentReflection: string | null;
  teacherFeedback: string | null;
  flagPlanted: boolean;
  feathersEarned: number;
  lastPlayedAt: string | null;
  completedAt: string | null;
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const SUBJECT_ISLAND_VISUALS: Record<string, { icon: string; color: string; islandTitle: string }> = {
  FIN_EDU: {
    icon: "🪙",
    color: "#0D9488",
    islandTitle: "Đảo Tài Chính Thông Thái"
  },
  CXXH: {
    icon: "💚",
    color: "#16A34A",
    islandTitle: "Đảo Cảm Xúc – Xã Hội"
  },
  GDGT: {
    icon: "🛡️",
    color: "#2563EB",
    islandTitle: "Đảo Giáo Dục Giới Tính"
  },
  GDHN: {
    icon: "🧭",
    color: "#7C3AED",
    islandTitle: "Đảo Hướng Nghiệp"
  },
  STEAM: {
    icon: "🤖",
    color: "#0284C7",
    islandTitle: "Đảo Sáng Tạo STEAM"
  }
};

/**
 * Determine whether a class's grade & system matches the approved Primary FIN_EDU programs (TC01S..TC05S)
 */
export function isFinEduApplicableForClass(grade: string, educationSystem?: string | null): boolean {
  const normGrade = normalizeElementaryGrade(grade);
  if (!["1", "2", "3", "4", "5"].includes(normGrade)) return false;
  const normSys = String(educationSystem || "HNS").trim().toUpperCase();
  return ["HNS", "S", "HE_S", "STANDARD", "HNC", "HNI", ""].includes(normSys);
}

export function isTC02SApplicableForClass(grade: string, educationSystem?: string | null): boolean {
  return isFinEduApplicableForClass(grade, educationSystem);
}

/**
 * Ensure default approved TC01S..TC05S config rows exist in `skyline_journey_configs`
 */
async function ensureDefaultTC02SConfig(academicYearId: string) {
  await ensureSkylineJourneyTables();
  const existingRows = (await prisma.$queryRawUnsafe(
    `SELECT grade FROM skyline_journey_configs WHERE academicYearId = ? AND subjectId = 'spec_sub_fin_edu' AND (campusId IS NULL OR campusId = 'ALL') AND (classId IS NULL OR classId = 'ALL')`,
    academicYearId
  )) as Array<{ grade: string }>;

  const existingGrades = new Set(existingRows.map((r) => String(r.grade)));
  const now = new Date().toISOString();

  for (const g of ["1", "2", "3", "4", "5"]) {
    if (!existingGrades.has(g)) {
      const bundle = getGradeCurriculumBundle(g);
      await prisma.$executeRawUnsafe(
        `INSERT OR IGNORE INTO skyline_journey_configs
          (id, academicYearId, campusId, classId, grade, educationSystem, subjectId, curriculumCode, versionId, isEnabled, approvalStatus, approvedAt, configJson, createdAt, updatedAt)
         VALUES (?, ?, 'ALL', 'ALL', ?, 'HNS', 'spec_sub_fin_edu', ?, 'spec_ver_fin_v1_0', 1, 'APPROVED', ?, ?, ?, ?)`,
        `sjc_${bundle.curriculumCode.toLowerCase()}_${academicYearId}`,
        academicYearId,
        g,
        bundle.curriculumCode,
        now,
        JSON.stringify({ programCode: bundle.curriculumCode, defaultUnlockedStages: [1, 2, 3] }),
        now,
        now
      );
    }
  }
}

/**
 * Check if Sky-Line Journey is enabled for a given academicYear, campus, class, grade, subject
 */
async function resolveJourneyConfigForClass(params: {
  academicYearId: string;
  campusId: string;
  classId: string;
  grade: string;
  educationSystem: string;
  subjectId: string;
  subjectCode: string;
}): Promise<{
  configStatus: "ACTIVE_APPROVED" | "DISABLED_BY_ADMIN" | "UNCONFIGURED";
  curriculumCode: string | null;
  statusMessage: string;
  defaultUnlockedStages: number[];
}> {
  await ensureDefaultTC02SConfig(params.academicYearId);
  const normGrade = normalizeElementaryGrade(params.grade);
  const bundle = getGradeCurriculumBundle(normGrade);

  const configs = (await prisma.$queryRawUnsafe(
    `SELECT * FROM skyline_journey_configs
     WHERE academicYearId = ? AND subjectId = ? AND grade = ?
     ORDER BY
       CASE WHEN classId = ? THEN 1 WHEN campusId = ? THEN 2 ELSE 3 END ASC,
       updatedAt DESC`,
    params.academicYearId,
    params.subjectId,
    normGrade,
    params.classId,
    params.campusId
  )) as Array<any>;

  if (configs.length > 0) {
    const top = configs[0];
    if (Number(top.isEnabled) === 0) {
      return {
        configStatus: "DISABLED_BY_ADMIN",
        curriculumCode: top.curriculumCode || bundle.curriculumCode,
        statusMessage: "Chức năng Hành trình Sky-Line cho lớp/cơ sở này đang tạm khóa bởi Quản lý.",
        defaultUnlockedStages: []
      };
    }
    if (
      top.approvalStatus === "APPROVED" &&
      params.subjectCode === "FIN_EDU" &&
      isFinEduApplicableForClass(normGrade, params.educationSystem)
    ) {
      const parsed = safeJsonParse<{ defaultUnlockedStages?: number[] }>(top.configJson, {});
      return {
        configStatus: "ACTIVE_APPROVED",
        curriculumCode: bundle.curriculumCode,
        statusMessage: `Chương trình ${bundle.curriculumTitle} đã được duyệt và kích hoạt.`,
        defaultUnlockedStages: parsed.defaultUnlockedStages || [1, 2, 3]
      };
    }
  }

  if (
    params.subjectCode === "FIN_EDU" &&
    isFinEduApplicableForClass(normGrade, params.educationSystem)
  ) {
    return {
      configStatus: "ACTIVE_APPROVED",
      curriculumCode: bundle.curriculumCode,
      statusMessage: `Chương trình ${bundle.curriculumTitle} đang hoạt động.`,
      defaultUnlockedStages: [1, 2, 3]
    };
  }

  return {
    configStatus: "UNCONFIGURED",
    curriculumCode: null,
    statusMessage: `Chưa cấu hình chương trình game được duyệt cho Khối ${params.grade} (${params.subjectCode}).`,
    defaultUnlockedStages: []
  };
}

/**
 * Fetch student's complete Sky-Line Journey overview (Map, Islands, 15 TC02S Stages, Passport)
 */
export async function getStudentJourneyOverview(studentId: string, gradeOverride?: string) {
  await ensureSkylineJourneyTables();

  const student: any = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: {
        include: {
          campus: true,
          academicYear: true
        }
      },
      campus: true
    }
  });

  if (!student || !student.class) {
    throw new Error("STUDENT_NOT_FOUND");
  }

  const cls = student.class;
  const rawClassName = String(cls.className || cls.name || "");
  const parsedGradeFromClass = (rawClassName.match(/^(\d{1,2})/) || [])[1] || "2";
  const nativeGrade = String(cls.grade || parsedGradeFromClass).replace(/^K/i, "").trim();
  const normalizedOverride = String(gradeOverride || "").replace(/^K/i, "").trim();
  const grade = ["1", "2", "3", "4", "5"].includes(normalizedOverride)
    ? normalizedOverride
    : nativeGrade;
  const educationSystem = String(cls.educationSystem || "HNS").trim();
  const academicYearId = cls.academicYearId || student.academicYearId || "ay_2025_2026";
  const studentCodeVal = String(student.studentCode || student.code || "");
  const studentNameVal = String(student.studentName || student.fullName || "");
  const classNameVal = String(cls.className || cls.name || "");
  const campusNameVal = String(
    cls.campus?.campusName || cls.campus?.name || student.campus?.campusName || ""
  );

  const isElementary = ["1", "2", "3", "4", "5"].includes(grade);
  const gradeProfile = isElementary
    ? (GRADE_DIFFERENTIATION_PROFILES[grade] || GRADE_DIFFERENTIATION_PROFILES["1"])
    : null;
  const gradeBundle = isElementary ? getGradeCurriculumBundle(grade) : getGradeCurriculumBundle("1");

  // 1. Find all special subjects assigned to this student's class
  const specialAssignments: any[] = await prisma.specialTeachingAssignment.findMany({
    where: {
      classId: cls.id,
      status: "ACTIVE"
    },
    include: {
      subject: true,
      teacher: true
    }
  });

  const assignedSubjectsMap = new Map<
    string,
    {
      subjectId: string;
      subjectCode: string;
      subjectName: string;
      teacherName: string | null;
    }
  >();

  for (const sa of specialAssignments) {
    if (sa.subject && !assignedSubjectsMap.has(sa.subject.id)) {
      assignedSubjectsMap.set(sa.subject.id, {
        subjectId: sa.subject.id,
        subjectCode: sa.subject.code,
        subjectName: sa.subject.name,
        teacherName: sa.teacher?.teacherName || sa.teacher?.fullName || null
      });
    }
  }

  // For Primary classes (Grades 1–5), ensure FIN_EDU island is present
  if (
    ["1", "2", "3", "4", "5"].includes(grade) &&
    !Array.from(assignedSubjectsMap.values()).some((s) => s.subjectCode === "FIN_EDU")
  ) {
    assignedSubjectsMap.set("spec_sub_fin_edu", {
      subjectId: "spec_sub_fin_edu",
      subjectCode: "FIN_EDU",
      subjectName: "Giáo dục tài chính cá nhân",
      teacherName: null
    });
  }

  // Load student's progress rows & reward ledger rows
  const progressRows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM skyline_quest_progress WHERE studentId = ?`,
    student.id
  )) as Array<any>;

  const rewardRows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM skyline_reward_ledger WHERE studentId = ? ORDER BY awardedAt DESC`,
    student.id
  )) as Array<any>;

  const assignmentRows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM skyline_quest_assignments WHERE classId = ?`,
    cls.id
  )) as Array<any>;

  const islands: JourneyIslandSummary[] = [];
  let activeStagesView: StudentStageView[] = [];

  // Game islands are strictly supported for Primary education (Grades 1–5)
  if (isElementary) {
    for (const subj of Array.from(assignedSubjectsMap.values())) {
    const visual = SUBJECT_ISLAND_VISUALS[subj.subjectCode] || {
      icon: "🏝️",
      color: "#0284C7",
      islandTitle: `Đảo ${subj.subjectName}`
    };

    const cfg = await resolveJourneyConfigForClass({
      academicYearId,
      campusId: cls.campusId,
      classId: cls.id,
      grade,
      educationSystem,
      subjectId: subj.subjectId,
      subjectCode: subj.subjectCode
    });

    if (cfg.configStatus === "ACTIVE_APPROVED" && subj.subjectCode === "FIN_EDU") {
      // Query SpecialLesson & SpecialAssessmentCriterion for the student's grade FIN_EDU
      const dbLessons: any[] = await prisma.specialLesson
        .findMany({
          where: {
            grade: String(grade),
            topic: {
              version: {
                curriculum: {
                  subjectId: subj.subjectId
                }
              }
            }
          },
          include: {
            topic: true,
            criteria: {
              orderBy: { code: "asc" }
            }
          },
          orderBy: { periodIndex: "asc" }
        })
        .catch(() => []);

      const dbLessonByPeriod = new Map<number, any>(
        dbLessons.map((l: any) => [Number(l.periodIndex), l])
      );
      const progressByCode = new Map<string, any>(
        progressRows
          .filter((p) => p.subjectId === subj.subjectId)
          .map((p) => [String(p.lessonCode).toUpperCase(), p])
      );
      const teacherAssignByCode = new Map<string, any>(
        assignmentRows
          .filter((a) => a.subjectId === subj.subjectId)
          .map((a) => [String(a.lessonCode).toUpperCase(), a])
      );

      const stagesCatalog = gradeBundle.stages;
      const stagesBuilt: StudentStageView[] = [];
      for (let idx = 0; idx < stagesCatalog.length; idx++) {
        const stageDef = stagesCatalog[idx];
        const codeKey = stageDef.lessonCode.toUpperCase();
        const dbLesson = dbLessonByPeriod.get(stageDef.periodIndex);
        const prog = progressByCode.get(codeKey);
        const tAssign = teacherAssignByCode.get(codeKey);

        const prevStageView = idx > 0 ? stagesBuilt[idx - 1] : null;
        const unlockedByPrevious =
          prevStageView &&
          (prevStageView.status === "COMPLETED" ||
            prevStageView.status === "WAITING_CONFIRMATION" ||
            prevStageView.autoChallengePassed);

        const explicitlyLockedByTeacher = tAssign && Number(tAssign.isUnlocked) === 0;
        const explicitlyUnlockedByTeacher = tAssign && Number(tAssign.isUnlocked) === 1;
        const isDefaultUnlocked = cfg.defaultUnlockedStages.includes(stageDef.periodIndex);

        const isUnlocked =
          !explicitlyLockedByTeacher &&
          Boolean(
            idx === 0 ||
              isDefaultUnlocked ||
              explicitlyUnlockedByTeacher ||
              unlockedByPrevious ||
              prog
          );

        let status: StageProgressStatus = "LOCKED";
        if (prog?.status && prog.status !== "LOCKED") {
          status = prog.status as StageProgressStatus;
          if (explicitlyLockedByTeacher && status === "READY") {
            status = "LOCKED";
          }
        } else if (isUnlocked) {
          status = "READY";
        }

        const criteriaList =
          dbLesson && Array.isArray(dbLesson.criteria) && dbLesson.criteria.length > 0
            ? dbLesson.criteria.map((c: any) => ({
                id: c.id,
                code: c.code,
                level: c.programLevel || c.level || "Mức 2",
                competencyGroup: c.competencyGroup || "Biết",
                description: c.description || c.name || ""
              }))
            : stageDef.criteria;

        stagesBuilt.push({
          periodIndex: stageDef.periodIndex,
          lessonId: dbLesson?.id || stageDef.lessonId,
          lessonCode: stageDef.lessonCode,
          lessonName: dbLesson?.lessonName || dbLesson?.name || stageDef.lessonName,
          topicId: stageDef.topicId || dbLesson?.topicId,
          topicCode: stageDef.topicCode || dbLesson?.topic?.code,
          officialTopicName: stageDef.officialTopicName || dbLesson?.topic?.name,
          creativeZoneName: stageDef.creativeZoneName,
          isProject: Boolean(dbLesson?.isProject ?? stageDef.isProject),
          feathersReward: stageDef.feathersReward,
          badgeCode: stageDef.badgeCode,
          badgeName: stageDef.badgeName,
          mapCoordinates: stageDef.mapCoordinates,
          criteria: criteriaList,
          interactive: stageDef.interactive,
          status,
          isAssignedByTeacher: Boolean(isUnlocked),
          isExempted: false,
          teacherGuidance: tAssign?.customGuidance || null,
          hasPlayed: Boolean(prog && Number(prog.hasPlayed) === 1),
          autoChallengePassed: Boolean(prog && Number(prog.autoChallengePassed) === 1),
          teacherConfirmed: Boolean(prog && Number(prog.teacherConfirmed) === 1),
          attemptsCount: Number(prog?.attemptsCount || 0),
          savedActionPayload: safeJsonParse(prog?.actionPayloadJson, null),
          worldState: safeJsonParse(prog?.worldStateJson, null),
          studentReflection: prog?.studentReflection || null,
          teacherFeedback: prog?.teacherFeedback || null,
          flagPlanted: Boolean(prog && Number(prog.flagPlanted) === 1),
          feathersEarned: Number(prog?.feathersEarned || 0),
          lastPlayedAt: prog?.lastPlayedAt || null,
          completedAt: prog?.completedAt || null
        });
      }

      activeStagesView = stagesBuilt;

      const assignedCount = stagesBuilt.filter((s) => s.status !== "LOCKED").length;
      const completedCount = stagesBuilt.filter((s) => s.status === "COMPLETED").length;
      const waitingCount = stagesBuilt.filter((s) => s.status === "WAITING_CONFIRMATION").length;
      const revisionCount = stagesBuilt.filter((s) => s.status === "NEEDS_REVISION").length;
      const islandFeathers = rewardRows
        .filter((r) => r.subjectId === subj.subjectId)
        .reduce((sum, r) => sum + Number(r.feathers || 0), 0);

      islands.push({
        islandId: `island_${subj.subjectCode}_g${grade}`,
        subjectId: subj.subjectId,
        subjectCode: subj.subjectCode,
        subjectName: subj.subjectName,
        curriculumCode: gradeBundle.curriculumCode,
        grade,
        educationSystem,
        configStatus: "ACTIVE_APPROVED",
        statusMessage: cfg.statusMessage,
        themeColor: visual.color,
        icon: visual.icon,
        totalCurriculumStages: stagesBuilt.length,
        assignedStagesCount: assignedCount,
        completedStagesCount: completedCount,
        waitingConfirmationCount: waitingCount,
        needsRevisionCount: revisionCount,
        feathersEarned: islandFeathers
      });
    } else if (subj.subjectCode === "FIN_EDU") {
      islands.push({
        islandId: `island_${subj.subjectCode}_g${grade}`,
        subjectId: subj.subjectId,
        subjectCode: subj.subjectCode,
        subjectName: subj.subjectName,
        curriculumCode: cfg.curriculumCode,
        grade,
        educationSystem,
        configStatus: cfg.configStatus,
        statusMessage: cfg.statusMessage,
        themeColor: visual.color,
        icon: visual.icon,
        totalCurriculumStages: 0,
        assignedStagesCount: 0,
        completedStagesCount: 0,
        waitingConfirmationCount: 0,
        needsRevisionCount: 0,
        feathersEarned: 0
      });
    }
  }
}

  const needsRevisionStages = activeStagesView.filter((s) => s.status === "NEEDS_REVISION");
  const continueStage =
    needsRevisionStages[0] ||
    activeStagesView.find((s) => s.status === "IN_PROGRESS") ||
    activeStagesView.find((s) => s.status === "READY") ||
    activeStagesView[activeStagesView.length - 1] ||
    null;

  const totalFeathers = rewardRows.reduce((sum, r) => sum + Number(r.feathers || 0), 0);
  const welcomeSurveyRow = rewardRows.find(
    (r) =>
      r.rewardCode === `WELCOME_SURVEY_${gradeBundle.curriculumCode}` ||
      r.rewardCode === "WELCOME_SURVEY_TC02S"
  );
  const welcomeSurvey = welcomeSurveyRow
    ? safeJsonParse<{
        interestLevel: string;
        interestLabel: string;
        favoriteActivities?: string[];
        note?: string;
        characterId?: string;
        characterName?: string;
        submittedAt: string;
      } | null>(welcomeSurveyRow.metadataJson, null)
    : null;

  const badges = rewardRows
    .filter((r) => Boolean(r.badgeCode))
    .map((r) => ({
      id: r.id,
      badgeCode: r.badgeCode,
      badgeName: r.badgeName,
      title: r.title,
      awardedAt: r.awardedAt
    }));

  const shields = activeStagesView
    .filter((s) => s.flagPlanted || s.autoChallengePassed)
    .map((s) => ({
      shieldCode: `SHIELD_${s.lessonCode}`,
      periodIndex: s.periodIndex,
      lessonCode: s.lessonCode,
      lessonName: s.lessonName,
      title: `Khiên Danh Dự Chặng ${s.periodIndex}: ${s.lessonName}`,
      locationName: s.interactive.worldLocationName,
      awardedAt: s.completedAt || s.lastPlayedAt
    }));

  const studentWorks = activeStagesView
    .filter((s) => Boolean(s.studentReflection) || Boolean(s.teacherFeedback) || s.flagPlanted)
    .map((s) => ({
      periodIndex: s.periodIndex,
      lessonCode: s.lessonCode,
      lessonName: s.lessonName,
      status: s.status,
      studentReflection: s.studentReflection,
      teacherFeedback: s.teacherFeedback,
      teacherConfirmed: s.teacherConfirmed,
      completedAt: s.completedAt || s.lastPlayedAt
    }));

  const assignedStagesCount = activeStagesView.filter((s) => s.status !== "LOCKED").length;
  const completedAssignedCount = activeStagesView.filter(
    (s) => s.status === "COMPLETED" && !s.isExempted
  ).length;
  const passedAutoCount = activeStagesView.filter((s) => s.autoChallengePassed).length;

  // Build real-time Class & Grade Learning Leaderboards from actual students & progress
  const leaderboard = await buildJourneyLeaderboards({
    currentStudentId: student.id,
    currentStudentFallback: {
      id: student.id,
      studentCode: studentCodeVal,
      studentName: studentNameVal,
      classId: cls.id,
      class: {
        id: cls.id,
        className: classNameVal,
        grade,
        campus: {
          campusName: campusNameVal
        }
      }
    },
    classId: cls.id,
    grade,
    academicYearId
  });

  return {
    isElementary: Boolean(isElementary),
    student: {
      id: student.id,
      code: studentCodeVal,
      fullName: studentNameVal,
      grade,
      educationSystem,
      classId: cls.id,
      className: classNameVal,
      campusId: cls.campusId,
      campusName: campusNameVal,
      academicYearId,
      academicYearName: cls.academicYear?.name || ""
    },
    gradeProfile,
    islands,
    activeIsland:
      islands.find((i) => i.configStatus === "ACTIVE_APPROVED") || islands[0] || null,
    zones: isElementary ? gradeBundle.zones : [],
    stages: activeStagesView,
    continueStage,
    needsRevisionStages,
    welcomeSurvey,
    leaderboard,
    progressMetrics: {
      assignedStagesCount,
      completedAssignedCount,
      assignedProgressPercent:
        assignedStagesCount > 0
          ? Math.round((completedAssignedCount / assignedStagesCount) * 100)
          : 0,
      totalCurriculumStages: activeStagesView.length,
      completedCurriculumCount: completedAssignedCount,
      curriculumProgressPercent:
        activeStagesView.length > 0
          ? Math.round((completedAssignedCount / activeStagesView.length) * 100)
          : 0,
      hasPlayedCount: activeStagesView.filter((s) => s.hasPlayed).length,
      autoChallengePassedCount: passedAutoCount,
      teacherConfirmedCount: activeStagesView.filter((s) => s.teacherConfirmed).length
    },
    passport: {
      passportCode: `SKY-PASS-${studentCodeVal}`,
      totalFeathers,
      flagsPlantedCount: activeStagesView.filter((s) => s.flagPlanted).length,
      shieldsEarnedCount: shields.length,
      shields,
      selectedCharacterId: welcomeSurvey?.characterId || "SKYLINE_EXPLORER",
      selectedCharacterName: welcomeSurvey?.characterName || "Chim Non Bồ Câu Sky-Line",
      badges,
      studentWorks,
      recentRewards: rewardRows.slice(0, 12)
    }
  };
}

function formatDurationVi(seconds: number): string {
  if (!seconds || seconds <= 0) return "—";
  const rounded = Math.max(1, Math.round(seconds));
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  if (mins === 0) return `${secs}s`;
  if (mins < 60) return `${mins}p ${secs < 10 ? `0${secs}` : secs}s`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}g ${remMins}p`;
}

/**
 * Compute Top Learning Leaderboard for a student's Class and Grade
 */
async function buildJourneyLeaderboards(params: {
  currentStudentId?: string;
  currentStudentFallback?: any;
  classId: string;
  grade: string;
  academicYearId: string;
}): Promise<{
  classLeaderboard: StudentRankingEntry[];
  gradeLeaderboard: StudentRankingEntry[];
  myClassRank: number | null;
  myGradeRank: number | null;
  totalClassStudents: number;
  totalGradeStudents: number;
}> {
  const normGrade = normalizeElementaryGrade(params.grade);

  // Fetch all active students in the same Grade (which includes the student's class)
  let gradeStudents: any[] = [];
  try {
    const found = await prisma.student.findMany?.({
      where: {
        status: "ACTIVE",
        class: {
          grade: { in: [normGrade, `K${normGrade}`, `Khối ${normGrade}`] },
          ...(params.academicYearId ? { academicYearId: params.academicYearId } : {})
        }
      },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        classId: true,
        class: {
          select: {
            id: true,
            className: true,
            grade: true,
            campus: {
              select: {
                campusName: true
              }
            }
          }
        }
      },
      orderBy: [{ studentName: "asc" }]
    });
    if (Array.isArray(found)) gradeStudents = [...found];
  } catch {
    gradeStudents = [];
  }

  // Ensure students of the current class are included even if grade string format differs
  const existingIds = new Set(gradeStudents.map((s) => s.id));
  let classOnlyStudents: any[] = [];
  try {
    const foundClass = await prisma.student.findMany?.({
      where: {
        classId: params.classId,
        status: "ACTIVE"
      },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        classId: true,
        class: {
          select: {
            id: true,
            className: true,
            grade: true,
            campus: {
              select: {
                campusName: true
              }
            }
          }
        }
      },
      orderBy: [{ studentName: "asc" }]
    });
    if (Array.isArray(foundClass)) classOnlyStudents = foundClass;
  } catch {
    classOnlyStudents = [];
  }

  for (const cs of classOnlyStudents) {
    if (!existingIds.has(cs.id)) {
      gradeStudents.push(cs);
      existingIds.add(cs.id);
    }
  }
  if (params.currentStudentFallback?.id && !existingIds.has(params.currentStudentFallback.id)) {
    gradeStudents.push(params.currentStudentFallback);
    existingIds.add(params.currentStudentFallback.id);
  }

  let allProgRows: Array<any> = [];
  let allRewardRows: Array<any> = [];
  try {
    const [pRows, rRows] = await Promise.all([
      prisma.$queryRawUnsafe(
        `SELECT studentId, lessonCode, status, hasPlayed, autoChallengePassed, teacherConfirmed, flagPlanted, feathersEarned, worldStateJson, startedAt, completedAt, createdAt, lastPlayedAt, updatedAt
         FROM skyline_quest_progress
         WHERE subjectId = 'spec_sub_fin_edu'`
      ) as Promise<Array<any>>,
      prisma.$queryRawUnsafe(
        `SELECT studentId, rewardType, feathers, badgeCode, metadataJson
         FROM skyline_reward_ledger
         WHERE subjectId = 'spec_sub_fin_edu'`
      ) as Promise<Array<any>>
    ]);
    if (Array.isArray(pRows)) allProgRows = pRows;
    if (Array.isArray(rRows)) allRewardRows = rRows;
  } catch {
    allProgRows = [];
    allRewardRows = [];
  }

  const progByStudent = new Map<string, Array<any>>();
  for (const p of allProgRows) {
    const sid = String(p.studentId || "");
    if (!sid) continue;
    if (!progByStudent.has(sid)) progByStudent.set(sid, []);
    progByStudent.get(sid)!.push(p);
  }

  const rewardStatsByStudent = new Map<
    string,
    {
      totalFeathers: number;
      badgeCount: number;
      characterId: string;
      characterName: string;
    }
  >();

  for (const r of allRewardRows) {
    const sid = String(r.studentId || "");
    if (!sid) continue;
    const prev = rewardStatsByStudent.get(sid) || {
      totalFeathers: 0,
      badgeCount: 0,
      characterId: "SKYLINE_EXPLORER",
      characterName: "Chiến Binh Chim Sky-Line"
    };
    prev.totalFeathers += Number(r.feathers || 0);
    if (r.badgeCode) {
      prev.badgeCount += 1;
    }
    if (r.rewardType === "WELCOME_SURVEY" && r.metadataJson) {
      const meta = safeJsonParse<any>(r.metadataJson, null);
      if (meta?.characterId) prev.characterId = meta.characterId;
      if (meta?.characterName) prev.characterName = meta.characterName;
    }
    rewardStatsByStudent.set(sid, prev);
  }

  const buildUnrankedEntry = (stu: any): Omit<StudentRankingEntry, "rank" | "honorTitle"> => {
    const progs = progByStudent.get(stu.id) || [];
    const rw = rewardStatsByStudent.get(stu.id) || {
      totalFeathers: 0,
      badgeCount: 0,
      characterId: "SKYLINE_EXPLORER",
      characterName: "Chiến Binh Chim Sky-Line"
    };

    const shieldsEarnedCount = progs.filter(
      (p) => Number(p.flagPlanted) === 1 || Number(p.autoChallengePassed) === 1
    ).length;
    const completedStagesCount = progs.filter((p) => p.status === "COMPLETED").length;
    const teacherConfirmedCount = progs.filter((p) => Number(p.teacherConfirmed) === 1).length;

    const scoredStages = progs.filter((p) => Number(p.hasPlayed) === 1);
    let scoreSum = 0;
    let totalCompletionSeconds = 0;
    let timedStagesCount = 0;
    let speedBonusPoints = 0;
    let lastPlayedAt: string | null = null;

    for (const p of scoredStages) {
      const ws = safeJsonParse<any>(p.worldStateJson, {});
      const sc =
        typeof ws?.scorePercent === "number"
          ? ws.scorePercent
          : Number(p.autoChallengePassed) === 1
          ? 100
          : 0;
      scoreSum += sc;

      // Extract completion duration in seconds (from worldStateJson or timestamp diff fallback)
      let stageDurSec = 0;
      if (typeof ws?.durationSeconds === "number" && ws.durationSeconds > 0) {
        stageDurSec = Math.min(1800, Math.max(5, Math.round(ws.durationSeconds)));
      } else if (Number(p.autoChallengePassed) === 1 || Number(p.flagPlanted) === 1) {
        const startStr = p.startedAt || p.createdAt;
        const endStr = p.completedAt || p.lastPlayedAt || p.updatedAt;
        if (startStr && endStr) {
          const diffSec = Math.round(
            (new Date(endStr).getTime() - new Date(startStr).getTime()) / 1000
          );
          stageDurSec = diffSec >= 5 && diffSec <= 1800 ? diffSec : 55;
        } else {
          stageDurSec = 55;
        }
      }

      if (stageDurSec > 0 && (Number(p.autoChallengePassed) === 1 || Number(p.flagPlanted) === 1)) {
        totalCompletionSeconds += stageDurSec;
        timedStagesCount += 1;
        // Speed bonus: up to +30 pts per passed stage when completed under 180s
        const stageSpeedBonus = Math.max(5, Math.min(30, Math.round((200 - stageDurSec) / 6)));
        speedBonusPoints += stageSpeedBonus;
      }

      const t = p.completedAt || p.lastPlayedAt || p.updatedAt || null;
      if (t && (!lastPlayedAt || t > lastPlayedAt)) {
        lastPlayedAt = t;
      }
    }

    const totalStageScore = Math.round(scoreSum);
    const avgScorePercent =
      scoredStages.length > 0 ? Math.round(scoreSum / scoredStages.length) : 0;
    const avgCompletionSeconds =
      timedStagesCount > 0 ? Math.round(totalCompletionSeconds / timedStagesCount) : 0;
    const completionTimeFormatted =
      totalCompletionSeconds > 0 ? formatDurationVi(totalCompletionSeconds) : "—";

    // Composite learning score:
    // + Total Stage Score (0-100 pts per stage)
    // + 100 pts per Shield earned
    // + 50 pts per Teacher confirmation
    // + 15 pts per Feather
    // + 40 pts per Zone Badge
    // + Speed Bonus Points (for fast completion)
    const rankingScore =
      totalStageScore +
      shieldsEarnedCount * 100 +
      teacherConfirmedCount * 50 +
      rw.totalFeathers * 15 +
      rw.badgeCount * 40 +
      speedBonusPoints;

    return {
      studentId: stu.id,
      studentCode: String(stu.studentCode || ""),
      fullName: String(stu.studentName || "Học sinh"),
      className: String(stu.class?.className || ""),
      grade: String(stu.class?.grade || normGrade),
      campusName: String(stu.class?.campus?.campusName || "Sky-Line"),
      characterId: rw.characterId,
      characterName: rw.characterName,
      shieldsEarnedCount,
      completedStagesCount,
      teacherConfirmedCount,
      totalFeathers: rw.totalFeathers,
      badgeCount: rw.badgeCount,
      totalStageScore,
      avgScorePercent,
      totalCompletionSeconds,
      avgCompletionSeconds,
      completionTimeFormatted,
      speedBonusPoints,
      rankingScore,
      isCurrentUser: Boolean(params.currentStudentId && stu.id === params.currentStudentId),
      lastPlayedAt
    };
  };

  const sortAndAssignRanks = (
    rawList: Array<Omit<StudentRankingEntry, "rank" | "honorTitle">>
  ): StudentRankingEntry[] => {
    const sorted = [...rawList].sort((a, b) => {
      if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
      if (b.totalStageScore !== a.totalStageScore) return b.totalStageScore - a.totalStageScore;
      if (b.shieldsEarnedCount !== a.shieldsEarnedCount)
        return b.shieldsEarnedCount - a.shieldsEarnedCount;
      // Faster completion time wins when both have completed stages
      if (a.totalCompletionSeconds > 0 && b.totalCompletionSeconds > 0) {
        if (a.totalCompletionSeconds !== b.totalCompletionSeconds) {
          return a.totalCompletionSeconds - b.totalCompletionSeconds;
        }
      }
      if (b.completedStagesCount !== a.completedStagesCount)
        return b.completedStagesCount - a.completedStagesCount;
      if (b.totalFeathers !== a.totalFeathers) return b.totalFeathers - a.totalFeathers;
      if (b.avgScorePercent !== a.avgScorePercent) return b.avgScorePercent - a.avgScorePercent;
      return a.fullName.localeCompare(b.fullName, "vi");
    });

    return sorted.map((item, index) => {
      const rank = index + 1;
      const hasActivity = item.shieldsEarnedCount > 0 || item.totalFeathers > 0 || item.avgScorePercent > 0;
      let honorTitle = "🌱 Tân Binh Đảo Học Tập";
      if (rank === 1 && hasActivity) {
        honorTitle = "👑 Quán Quân Đảo Tài Chính";
      } else if (rank === 2 && hasActivity) {
        honorTitle = "🥈 Á Quân Khiên Vàng";
      } else if (rank === 3 && hasActivity) {
        honorTitle = "🥉 Thủ Lĩnh Thông Thái";
      } else if (item.shieldsEarnedCount >= 10) {
        honorTitle = "🛡️ Đại Sứ Khiên Danh Dự";
      } else if (item.shieldsEarnedCount >= 5) {
        honorTitle = "🌟 Nhà Thám Hiểm Xuất Sắc";
      } else if (hasActivity) {
        honorTitle = "🧭 Chiến Binh Khởi Hành";
      }

      return {
        ...item,
        rank,
        honorTitle
      };
    });
  };

  const allGradeEntries = gradeStudents.map(buildUnrankedEntry);
  const fullGradeRanked = sortAndAssignRanks(allGradeEntries);
  const classEntries = allGradeEntries.filter((e) => {
    const stuObj = gradeStudents.find((s) => s.id === e.studentId);
    return stuObj?.classId === params.classId;
  });
  const fullClassRanked = sortAndAssignRanks(classEntries);

  const myClassRank =
    fullClassRanked.find((e) => e.studentId === params.currentStudentId)?.rank || null;
  const myGradeRank =
    fullGradeRanked.find((e) => e.studentId === params.currentStudentId)?.rank || null;

  return {
    classLeaderboard: fullClassRanked,
    gradeLeaderboard: fullGradeRanked.slice(0, 30),
    myClassRank,
    myGradeRank,
    totalClassStudents: fullClassRanked.length,
    totalGradeStudents: fullGradeRanked.length
  };
}

/**
 * Save or update Student's Game Opening & Subject Interest Survey + Character Selection
 * ("Mở đầu Game: Chọn nhân vật đồng hành, Chào mừng đến với Game & Khảo sát yêu thích")
 */
export async function submitStudentWelcomeSurvey(
  studentId: string,
  input: {
    interestLevel: string;
    interestLabel: string;
    favoriteActivities?: string[];
    note?: string;
    characterId?: string;
    characterName?: string;
  }
) {
  const overview = await getStudentJourneyOverview(studentId);
  const now = new Date().toISOString();
  const programCode = overview.activeIsland?.curriculumCode || "TC02S";
  const rewardCode = `WELCOME_SURVEY_${programCode}`;
  const metadataJson = JSON.stringify({
    interestLevel: input.interestLevel || "VERY_LOVE",
    interestLabel: input.interestLabel || "Rất yêu thích",
    favoriteActivities: Array.isArray(input.favoriteActivities) ? input.favoriteActivities : [],
    note: String(input.note || "").trim(),
    characterId: input.characterId || overview.welcomeSurvey?.characterId || "SKYLINE_EXPLORER",
    characterName:
      input.characterName || overview.welcomeSurvey?.characterName || "Chiến Binh Chim Sky-Line",
    submittedAt: now
  });

  const existing = (await prisma.$queryRawUnsafe(
    `SELECT id FROM skyline_reward_ledger WHERE studentId = ? AND (rewardCode = ? OR rewardCode = 'WELCOME_SURVEY_TC02S') LIMIT 1`,
    studentId,
    rewardCode
  )) as Array<{ id: string }>;

  const title = "Khởi hành Hành trình Sky-Line & Khảo sát yêu thích môn học";
  const desc = `Phản hồi khảo sát đầu game (${programCode}): ${input.interestLabel}${
    input.note ? ` — "${input.note}"` : ""
  }`;

  if (existing.length === 0) {
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO skyline_reward_ledger
        (id, idempotencyKey, studentId, classId, academicYearId, subjectId, lessonCode, periodIndex, rewardType, rewardCode, milestoneCode, title, rewardTitle, description, feathers, feathersEarned, badgeCode, badgeName, metadataJson, awardedAt)
       VALUES (?, ?, ?, ?, ?, 'spec_sub_fin_edu', ?, 0, 'WELCOME_SURVEY', ?, ?, ?, ?, ?, 1, 1, 'BADGE_SKYLINE_STARTER', 'Nhà Thám Hiểm Khởi Hành', ?, ?)`,
      makeId("srl"),
      `${studentId}_${rewardCode}`,
      studentId,
      overview.student.classId,
      overview.student.academicYearId,
      `${programCode}.00`,
      rewardCode,
      rewardCode,
      title,
      title,
      desc,
      metadataJson,
      now
    );
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE skyline_reward_ledger
       SET description = ?,
           metadataJson = ?,
           awardedAt = ?
       WHERE id = ?`,
      desc,
      metadataJson,
      now,
      existing[0].id
    );
  }

  return {
    saved: true,
    firstTimeBonus: existing.length === 0,
    feathersGranted: existing.length === 0 ? 1 : 0
  };
}

/**
 * Save in-progress draft state for cross-device continuity
 */
export async function saveStudentStageDraft(
  studentId: string,
  input: {
    lessonCode: string;
    actionPayload: any;
    studentReflection?: string;
  }
) {
  const overview = await getStudentJourneyOverview(studentId);
  const stage = overview.stages.find(
    (s) => s.lessonCode.toUpperCase() === String(input.lessonCode || "").trim().toUpperCase()
  );

  if (!stage) {
    throw new Error("STAGE_NOT_FOUND_OR_UNASSIGNED");
  }
  if (stage.status === "LOCKED") {
    throw new Error("STAGE_LOCKED");
  }

  const now = new Date().toISOString();
  const programCode = overview.activeIsland?.curriculumCode || "TC02S";
  const existing = (await prisma.$queryRawUnsafe(
    `SELECT * FROM skyline_quest_progress WHERE studentId = ? AND lessonId = ? LIMIT 1`,
    studentId,
    stage.lessonId
  )) as Array<any>;

  const preservedStatus =
    existing[0]?.status === "COMPLETED" || existing[0]?.status === "WAITING_CONFIRMATION"
      ? existing[0].status
      : "IN_PROGRESS";

  if (existing.length === 0) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO skyline_quest_progress
        (id, studentId, studentCode, studentName, classId, campusId, academicYearId, programCode, subjectId, topicId, lessonId, lessonCode, periodIndex,
         status, hasPlayed, autoChallengePassed, teacherConfirmed, attemptsCount,
         actionPayloadJson, studentReflection, lastPlayedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'spec_sub_fin_edu', ?, ?, ?, ?, ?, 1, 0, 0, 1, ?, ?, ?, ?, ?)`,
      makeId("sqp"),
      studentId,
      overview.student.code,
      overview.student.fullName,
      overview.student.classId,
      overview.student.campusId,
      overview.student.academicYearId,
      programCode,
      stage.topicId,
      stage.lessonId,
      stage.lessonCode,
      stage.periodIndex,
      preservedStatus,
      JSON.stringify(input.actionPayload || {}),
      input.studentReflection ?? null,
      now,
      now,
      now
    );
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE skyline_quest_progress
       SET status = ?,
           studentCode = COALESCE(?, studentCode),
           studentName = COALESCE(?, studentName),
           campusId = COALESCE(?, campusId),
           programCode = COALESCE(?, programCode),
           hasPlayed = 1,
           actionPayloadJson = ?,
           studentReflection = COALESCE(?, studentReflection),
           lastPlayedAt = ?,
           updatedAt = ?
       WHERE id = ?`,
      preservedStatus,
      overview.student.code,
      overview.student.fullName,
      overview.student.campusId,
      programCode,
      JSON.stringify(input.actionPayload || {}),
      input.studentReflection ?? null,
      now,
      now,
      existing[0].id
    );
  }

  return {
    saved: true,
    lessonCode: stage.lessonCode,
    status: preservedStatus,
    lastPlayedAt: now
  };
}

/**
 * Submit a student's stage action -> Server-side validate -> Update state & idempotently grant feathers/badges
 */
export async function submitStudentStageAction(
  studentId: string,
  input: {
    lessonCode: string;
    actionPayload: StageActionPayload;
    studentReflection?: string;
    durationSeconds?: number;
  }
) {
  const overview = await getStudentJourneyOverview(studentId);
  const stage = overview.stages.find(
    (s) => s.lessonCode.toUpperCase() === String(input.lessonCode || "").trim().toUpperCase()
  );

  if (!stage) {
    throw new Error("STAGE_NOT_FOUND_OR_UNASSIGNED");
  }
  if (stage.status === "LOCKED") {
    throw new Error("STAGE_LOCKED");
  }

  const stageDef = getAnyStageByLessonCode(stage.lessonCode) || getTC02SStageByLessonCode(stage.lessonCode);
  if (!stageDef) {
    throw new Error("STAGE_CATALOG_MISSING");
  }

  const mergedPayload: any = {
    ...(input.actionPayload || {}),
    practicalNote:
      input.studentReflection ??
      (input.actionPayload as any)?.practicalNote ??
      stage.studentReflection ??
      ""
  };

  const validation: StageValidationResult = validateStageSubmission(stageDef, mergedPayload);
  const now = new Date().toISOString();
  const programCode = overview.activeIsland?.curriculumCode || "TC02S";
  const gradeBundle = getGradeCurriculumBundle(overview.student.grade);

  const existingRows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM skyline_quest_progress WHERE studentId = ? AND lessonId = ? LIMIT 1`,
    studentId,
    stage.lessonId
  )) as Array<any>;
  const existing = existingRows[0];

  // Rule: "Không trừ thành tích đã đạt khi trả lời sai"
  const prevAutoPassed = Boolean(existing && Number(existing.autoChallengePassed) === 1);
  const prevTeacherConfirmed = Boolean(existing && Number(existing.teacherConfirmed) === 1);
  const prevFlagPlanted = Boolean(existing && Number(existing.flagPlanted) === 1);
  const prevFeathers = Number(existing?.feathersEarned || 0);

  const finalAutoPassed = prevAutoPassed || validation.autoChallengePassed;
  const finalTeacherConfirmed = prevTeacherConfirmed;

  let finalStatus: StageProgressStatus = validation.nextStatus;
  if (existing?.status === "COMPLETED") {
    finalStatus = "COMPLETED";
  } else if (existing?.status === "WAITING_CONFIRMATION" && !validation.isValid) {
    finalStatus = "WAITING_CONFIRMATION";
  }

  const flagPlanted = prevFlagPlanted || validation.autoChallengePassed;
  const feathersEarned = validation.autoChallengePassed
    ? Math.max(prevFeathers, stageDef.feathersReward)
    : prevFeathers;
  const completedAt =
    finalStatus === "COMPLETED" ? existing?.completedAt || now : existing?.completedAt || null;

  const prevWorldState = safeJsonParse<any>(existing?.worldStateJson, {});
  const rawInputDur = Number(
    input.durationSeconds ?? (input.actionPayload as any)?.durationSeconds ?? 0
  );
  const clampedNewDur =
    rawInputDur > 0 ? Math.min(1800, Math.max(5, Math.round(rawInputDur))) : 55;
  const bestDurationSeconds =
    prevAutoPassed && typeof prevWorldState?.durationSeconds === "number" && prevWorldState.durationSeconds > 0
      ? Math.min(prevWorldState.durationSeconds, clampedNewDur)
      : clampedNewDur;

  const worldStateWithScore = {
    ...(validation.worldStateEffect || {}),
    scorePercent: validation.autoChallengePassed
      ? Math.max(Number(prevWorldState?.scorePercent || 0), validation.scorePercent)
      : validation.scorePercent,
    durationSeconds: bestDurationSeconds,
    mechanic: validation.mechanic,
    evaluationMode: validation.evaluationMode
  };

  if (!existing) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO skyline_quest_progress
        (id, studentId, studentCode, studentName, classId, campusId, academicYearId, programCode, subjectId, topicId, lessonId, lessonCode, periodIndex,
         status, hasPlayed, autoChallengePassed, teacherConfirmed, attemptsCount,
         actionPayloadJson, worldStateJson, criteriaResultJson, studentReflection,
         feathersEarned, flagPlanted, lastPlayedAt, completedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'spec_sub_fin_edu', ?, ?, ?, ?, ?, 1, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      makeId("sqp"),
      studentId,
      overview.student.code,
      overview.student.fullName,
      overview.student.classId,
      overview.student.campusId,
      overview.student.academicYearId,
      programCode,
      stage.topicId,
      stage.lessonId,
      stage.lessonCode,
      stage.periodIndex,
      finalStatus,
      finalAutoPassed ? 1 : 0,
      finalTeacherConfirmed ? 1 : 0,
      JSON.stringify(mergedPayload),
      JSON.stringify(worldStateWithScore),
      JSON.stringify(validation.achievedCriterionCodes),
      mergedPayload.practicalNote || null,
      feathersEarned,
      flagPlanted ? 1 : 0,
      now,
      completedAt,
      now,
      now
    );
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE skyline_quest_progress
       SET status = ?,
           studentCode = COALESCE(?, studentCode),
           studentName = COALESCE(?, studentName),
           campusId = COALESCE(?, campusId),
           programCode = COALESCE(?, programCode),
           hasPlayed = 1,
           autoChallengePassed = ?,
           teacherConfirmed = ?,
           attemptsCount = COALESCE(attemptsCount, 0) + 1,
           actionPayloadJson = ?,
           worldStateJson = ?,
           criteriaResultJson = ?,
           studentReflection = COALESCE(?, studentReflection),
           feathersEarned = ?,
           flagPlanted = ?,
           lastPlayedAt = ?,
           completedAt = ?,
           updatedAt = ?
       WHERE id = ?`,
      finalStatus,
      overview.student.code,
      overview.student.fullName,
      overview.student.campusId,
      programCode,
      finalAutoPassed ? 1 : 0,
      finalTeacherConfirmed ? 1 : 0,
      JSON.stringify(mergedPayload),
      JSON.stringify(worldStateWithScore),
      JSON.stringify(validation.achievedCriterionCodes),
      mergedPayload.practicalNote || null,
      feathersEarned,
      flagPlanted ? 1 : 0,
      now,
      completedAt,
      now,
      existing.id
    );
  }

  const newRewardsGranted: Array<{ rewardCode: string; title: string; feathers: number; badgeName?: string }> = [];

  if (validation.autoChallengePassed) {
    const stageRewardCode = `STAGE_CLEAR_${stage.lessonCode}`;
    const existingReward = (await prisma.$queryRawUnsafe(
      `SELECT id FROM skyline_reward_ledger WHERE studentId = ? AND rewardCode = ? LIMIT 1`,
      studentId,
      stageRewardCode
    )) as Array<{ id: string }>;

    if (existingReward.length === 0) {
      const rewardTitle = `Cắm cờ & Nhận Khiên Chặng ${stage.periodIndex}: ${stage.lessonName}`;
      await prisma.$executeRawUnsafe(
        `INSERT OR IGNORE INTO skyline_reward_ledger
          (id, idempotencyKey, studentId, classId, academicYearId, subjectId, lessonCode, periodIndex, rewardType, rewardCode, milestoneCode, title, rewardTitle, description, feathers, feathersEarned, badgeCode, badgeName, sourceLessonId, awardedAt)
         VALUES (?, ?, ?, ?, ?, 'spec_sub_fin_edu', ?, ?, 'STAGE_CLEAR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        makeId("srl"),
        `${studentId}_${stageRewardCode}`,
        studentId,
        overview.student.classId,
        overview.student.academicYearId,
        stage.lessonCode,
        stage.periodIndex,
        stageRewardCode,
        stageRewardCode,
        rewardTitle,
        rewardTitle,
        `Vượt qua thử thách tại ${stageDef.interactive.worldLocationName} và nhận Khiên Danh Dự Chặng ${stage.periodIndex}`,
        stageDef.feathersReward,
        stageDef.feathersReward,
        stageDef.badgeCode || `SHIELD_${stage.lessonCode}`,
        stageDef.badgeName || `Khiên Danh Dự Chặng ${stage.periodIndex}`,
        stage.lessonId,
        now
      );
      newRewardsGranted.push({
        rewardCode: stageRewardCode,
        title: rewardTitle,
        feathers: stageDef.feathersReward,
        badgeName: stageDef.badgeName || `Khiên Danh Dự Chặng ${stage.periodIndex}`
      });
    }

    const zone = gradeBundle.zones.find(
      (z) => z.topicCode === stage.topicCode || z.topicId === stage.topicId
    );
    if (zone) {
      const totalStagesInZone = gradeBundle.stages.filter(
        (s) => s.topicCode === zone.topicCode || s.topicId === zone.topicId
      ).length;
      const zonePassedRows = (await prisma.$queryRawUnsafe(
        `SELECT COUNT(DISTINCT lessonCode) as cnt FROM skyline_quest_progress
         WHERE studentId = ? AND topicId = ? AND autoChallengePassed = 1`,
        studentId,
        stage.topicId
      )) as Array<{ cnt: number }>;

      if (totalStagesInZone > 0 && Number(zonePassedRows[0]?.cnt || 0) >= totalStagesInZone) {
        const zoneRewardCode = `ZONE_MASTER_${zone.topicCode}`;
        const existingZoneReward = (await prisma.$queryRawUnsafe(
          `SELECT id FROM skyline_reward_ledger WHERE studentId = ? AND rewardCode = ? LIMIT 1`,
          studentId,
          zoneRewardCode
        )) as Array<{ id: string }>;

        if (existingZoneReward.length === 0) {
          const zoneTitle = `Chinh phục ${zone.creativeZoneName}`;
          await prisma.$executeRawUnsafe(
            `INSERT OR IGNORE INTO skyline_reward_ledger
              (id, idempotencyKey, studentId, classId, academicYearId, subjectId, lessonCode, periodIndex, rewardType, rewardCode, milestoneCode, title, rewardTitle, description, feathers, feathersEarned, badgeCode, badgeName, sourceLessonId, awardedAt)
             VALUES (?, ?, ?, ?, ?, 'spec_sub_fin_edu', ?, ?, 'TOPIC_MASTER', ?, ?, ?, ?, ?, 5, 5, ?, ?, ?, ?)`,
            makeId("srl"),
            `${studentId}_${zoneRewardCode}`,
            studentId,
            overview.student.classId,
            overview.student.academicYearId,
            stage.lessonCode,
            stage.periodIndex,
            zoneRewardCode,
            zoneRewardCode,
            zoneTitle,
            zoneTitle,
            `Hoàn thành trọn vẹn ${totalStagesInZone} chặng của ${zone.officialTopicName}`,
            zone.badgeCode,
            zone.badgeName,
            stage.lessonId,
            now
          );
          newRewardsGranted.push({
            rewardCode: zoneRewardCode,
            title: `Huy hiệu Vùng: ${zone.badgeName}`,
            feathers: 5,
            badgeName: zone.badgeName
          });
        }
      }
    }
  }

  return {
    validation,
    stageStatus: finalStatus,
    flagPlanted,
    feathersEarned,
    durationSeconds: bestDurationSeconds,
    speedBonusPoints: validation.autoChallengePassed
      ? Math.max(5, Math.min(30, Math.round((200 - bestDurationSeconds) / 6)))
      : 0,
    newRewardsGranted
  };
}

/**
 * Verify if a teacher/admin session has permission over a specific class
 */
export async function verifyTeacherClassAccess(params: {
  userId: string;
  role: string;
  teacherId?: string | null;
  classId: string;
  subjectId?: string;
}): Promise<{ allowed: boolean; isGVCN: boolean; isSubjectTeacher: boolean; isAdmin: boolean }> {
  if (["ADMIN", "DIRECTOR", "PRINCIPAL", "VICE_PRINCIPAL"].includes(params.role)) {
    return { allowed: true, isGVCN: false, isSubjectTeacher: true, isAdmin: true };
  }

  let teacherId = params.teacherId;
  if (!teacherId) {
    const t = await prisma.teacher.findUnique({ where: { userId: params.userId } });
    teacherId = t?.id || null;
  }
  if (!teacherId) {
    return { allowed: false, isGVCN: false, isSubjectTeacher: false, isAdmin: false };
  }

  const [specialAssign, regularAssign, clsObj] = await Promise.all([
    prisma.specialTeachingAssignment.findFirst({
      where: {
        teacherId,
        classId: params.classId,
        status: "ACTIVE",
        ...(params.subjectId ? { subjectId: params.subjectId } : {})
      }
    }),
    prisma.teachingAssignment.findFirst({
      where: {
        teacherId,
        classId: params.classId
      }
    }),
    prisma.class.findUnique({
      where: { id: params.classId }
    })
  ]);

  const isSubjectTeacher = Boolean(specialAssign);
  const isGVCN = Boolean(regularAssign || (clsObj && (clsObj as any).homeroomTeacherId === teacherId));
  return {
    allowed: isSubjectTeacher || isGVCN,
    isGVCN,
    isSubjectTeacher,
    isAdmin: false
  };
}

/**
 * Teacher & GVCN Dashboard: Get assigned classes, 15 stages status, and student progress matrix
 */
export async function getTeacherJourneyDashboard(params: {
  userId: string;
  role: string;
  teacherId?: string | null;
  classId?: string;
  academicYearId?: string;
}) {
  await ensureSkylineJourneyTables();

  let teacherId = params.teacherId;
  const isAdmin = ["ADMIN", "DIRECTOR", "PRINCIPAL", "VICE_PRINCIPAL"].includes(params.role);

  if (!teacherId && !isAdmin) {
    const t = await prisma.teacher.findUnique({ where: { userId: params.userId } });
    teacherId = t?.id || null;
  }

  const accessibleClassIds: string[] = [];
  const roleByClass = new Map<string, "SPECIAL_TEACHER" | "GVCN" | "ADMIN">();

  if (isAdmin) {
    const primaryClasses: any[] = await prisma.class.findMany({
      where: {
        grade: { in: ["1", "2", "3", "4", "5"] },
        ...(params.academicYearId ? { academicYearId: params.academicYearId } : {})
      },
      orderBy: [{ grade: "asc" }, { className: "asc" }],
      take: 60
    });
    for (const c of primaryClasses) {
      accessibleClassIds.push(c.id);
      roleByClass.set(c.id, "ADMIN");
    }
  } else if (teacherId) {
    const [specAssigns, homeroomAssigns, homeroomClasses] = await Promise.all([
      prisma.specialTeachingAssignment.findMany({
        where: {
          teacherId,
          status: "ACTIVE"
        }
      }),
      prisma.teachingAssignment.findMany({
        where: {
          teacherId
        },
        include: { class: true }
      }),
      prisma.class.findMany({
        where: {
          homeroomTeacherId: teacherId,
          grade: { in: ["1", "2", "3", "4", "5"] }
        }
      })
    ]);

    for (const sa of specAssigns) {
      if (!accessibleClassIds.includes(sa.classId)) {
        accessibleClassIds.push(sa.classId);
      }
      roleByClass.set(sa.classId, "SPECIAL_TEACHER");
    }
    for (const ha of homeroomAssigns) {
      if (["1", "2", "3", "4", "5"].includes(String(ha.class?.grade || ""))) {
        if (!accessibleClassIds.includes(ha.classId)) {
          accessibleClassIds.push(ha.classId);
        }
        if (!roleByClass.has(ha.classId)) {
          roleByClass.set(ha.classId, "GVCN");
        }
      }
    }
    for (const hc of homeroomClasses) {
      if (!accessibleClassIds.includes(hc.id)) {
        accessibleClassIds.push(hc.id);
      }
      if (!roleByClass.has(hc.id)) {
        roleByClass.set(hc.id, "GVCN");
      }
    }
  }

  const classes: any[] = await prisma.class.findMany({
    where: { id: { in: accessibleClassIds } },
    include: {
      campus: true,
      academicYear: true,
      _count: { select: { students: true } }
    },
    orderBy: [{ grade: "asc" }, { className: "asc" }]
  });

  const selectedClass =
    classes.find((c) => c.id === params.classId) ||
    classes.find((c) => String(c.grade) === "2") ||
    classes[0] ||
    null;

  if (!selectedClass) {
    return {
      classes: [],
      selectedClass: null,
      classRole: null,
      stages: [],
      students: [],
      statusSummary: {
        notStarted: 0,
        inProgress: 0,
        waitingConfirmation: 0,
        needsRevision: 0,
        completed: 0
      }
    };
  }

  const students: any[] = await prisma.student.findMany({
    where: { classId: selectedClass.id, status: "ACTIVE" },
    orderBy: [{ studentName: "asc" }],
    select: {
      id: true,
      studentCode: true,
      studentName: true,
      gender: true
    }
  });

  const selectedClassGrade = normalizeElementaryGrade(selectedClass.grade);
  const selectedClassBundle = getGradeCurriculumBundle(selectedClassGrade);
  const classStagesCatalog = selectedClassBundle.stages;

  const [assignmentRows, progressRows, rewardRows, welcomeSurveyRows] = await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT * FROM skyline_quest_assignments WHERE classId = ? AND subjectId = 'spec_sub_fin_edu'`,
      selectedClass.id
    ) as Promise<Array<any>>,
    prisma.$queryRawUnsafe(
      `SELECT * FROM skyline_quest_progress WHERE classId = ? AND subjectId = 'spec_sub_fin_edu' ORDER BY COALESCE(lastPlayedAt, updatedAt) DESC`,
      selectedClass.id
    ) as Promise<Array<any>>,
    prisma.$queryRawUnsafe(
      `SELECT studentId, SUM(feathers) as totalFeathers, COUNT(badgeCode) as badgeCount
       FROM skyline_reward_ledger
       WHERE subjectId = 'spec_sub_fin_edu'
       GROUP BY studentId`
    ) as Promise<Array<any>>,
    prisma.$queryRawUnsafe(
      `SELECT studentId, metadataJson FROM skyline_reward_ledger WHERE classId = ? AND rewardType = 'WELCOME_SURVEY'`,
      selectedClass.id
    ) as Promise<Array<any>>
  ]);

  const assignByCode = new Map(
    assignmentRows.map((a) => [String(a.lessonCode).toUpperCase(), a])
  );
  const rewardByStudent = new Map(
    rewardRows.map((r) => [
      r.studentId,
      {
        totalFeathers: Number(r.totalFeathers || 0),
        badgeCount: Number(r.badgeCount || 0)
      }
    ])
  );
  const surveyByStudent = new Map(
    welcomeSurveyRows.map((w) => [
      w.studentId,
      safeJsonParse<{ interestLevel: string; interestLabel: string; note?: string } | null>(
        w.metadataJson,
        null
      )
    ])
  );

  const stagesSummary = classStagesCatalog.map((st) => {
    const a = assignByCode.get(st.lessonCode.toUpperCase());
    const isUnlocked = a ? Number(a.isUnlocked) === 1 : st.periodIndex <= 3;
    const stageProgs = progressRows.filter(
      (p) => String(p.lessonCode).toUpperCase() === st.lessonCode.toUpperCase()
    );

    const completedCount = stageProgs.filter((p) => p.status === "COMPLETED").length;
    const waitingCount = stageProgs.filter((p) => p.status === "WAITING_CONFIRMATION").length;
    const revisionCount = stageProgs.filter((p) => p.status === "NEEDS_REVISION").length;
    const inProgressCount = stageProgs.filter((p) => p.status === "IN_PROGRESS").length;
    const notStartedCount = Math.max(
      0,
      students.length - (completedCount + waitingCount + revisionCount + inProgressCount)
    );

    return {
      periodIndex: st.periodIndex,
      lessonId: st.lessonId,
      lessonCode: st.lessonCode,
      lessonName: st.lessonName,
      topicCode: st.topicCode,
      officialTopicName: st.officialTopicName,
      creativeZoneName: st.creativeZoneName,
      mechanic: st.interactive.mechanic,
      evaluationMode: st.interactive.evaluationMode,
      storyBrief: st.interactive.storyBrief,
      practicalPrompt: st.interactive.practicalPrompt || null,
      criteria: st.criteria,
      isUnlocked,
      customGuidance: a?.customGuidance || null,
      dueDate: a?.dueDate || null,
      counts: {
        notStarted: notStartedCount,
        inProgress: inProgressCount,
        waitingConfirmation: waitingCount,
        needsRevision: revisionCount,
        completed: completedCount
      }
    };
  });

  const studentById = new Map(students.map((s) => [s.id, s]));

  const recentClassResults = progressRows.slice(0, 30).map((p) => {
    const stu = studentById.get(p.studentId);
    const stDef = getAnyStageByLessonCode(String(p.lessonCode || ""));
    const ws = safeJsonParse<any>(p.worldStateJson, {});
    const cr = safeJsonParse<string[]>(p.criteriaResultJson, []);
    return {
      id: p.id,
      studentId: p.studentId,
      studentCode: stu?.studentCode || p.studentCode || "",
      studentName: stu?.studentName || p.studentName || "",
      periodIndex: Number(p.periodIndex || stDef?.periodIndex || 0),
      lessonCode: p.lessonCode,
      lessonName: stDef?.lessonName || p.lessonCode,
      status: p.status as StageProgressStatus,
      scorePercent: typeof ws?.scorePercent === "number" ? ws.scorePercent : p.autoChallengePassed ? 100 : 0,
      achievedCriteriaCount: Array.isArray(cr) ? cr.length : 0,
      totalCriteriaCount: stDef?.criteria?.length || 0,
      feathersEarned: Number(p.feathersEarned || 0),
      attemptsCount: Number(p.attemptsCount || 1),
      studentReflection: p.studentReflection || null,
      teacherFeedback: p.teacherFeedback || null,
      lastPlayedAt: p.lastPlayedAt || p.updatedAt || null
    };
  });

  const studentMatrix = students.map((stu) => {
    const stuProgs = progressRows.filter((p) => p.studentId === stu.id);
    const progByCode = new Map(
      stuProgs.map((p) => [String(p.lessonCode).toUpperCase(), p])
    );
    const rw = rewardByStudent.get(stu.id) || { totalFeathers: 0, badgeCount: 0 };
    const welcomeSurvey = surveyByStudent.get(stu.id) || null;

    return {
      studentId: stu.id,
      studentCode: stu.studentCode || stu.code || "",
      fullName: stu.studentName || stu.fullName || "",
      totalFeathers: rw.totalFeathers,
      badgeCount: rw.badgeCount,
      welcomeSurvey,
      completedStagesCount: stuProgs.filter((p) => p.status === "COMPLETED").length,
      waitingConfirmationCount: stuProgs.filter((p) => p.status === "WAITING_CONFIRMATION").length,
      needsRevisionCount: stuProgs.filter((p) => p.status === "NEEDS_REVISION").length,
      stages: classStagesCatalog.map((st) => {
        const p = progByCode.get(st.lessonCode.toUpperCase());
        const ws = safeJsonParse<any>(p?.worldStateJson, {});
        const cr = safeJsonParse<string[]>(p?.criteriaResultJson, []);
        return {
          periodIndex: st.periodIndex,
          lessonCode: st.lessonCode,
          status: (p?.status || "NOT_STARTED") as StageProgressStatus | "NOT_STARTED",
          hasPlayed: Boolean(p && Number(p.hasPlayed) === 1),
          autoChallengePassed: Boolean(p && Number(p.autoChallengePassed) === 1),
          teacherConfirmed: Boolean(p && Number(p.teacherConfirmed) === 1),
          attemptsCount: Number(p?.attemptsCount || 0),
          scorePercent:
            typeof ws?.scorePercent === "number"
              ? ws.scorePercent
              : p && Number(p.autoChallengePassed) === 1
              ? 100
              : null,
          achievedCriteriaCount: Array.isArray(cr) ? cr.length : 0,
          totalCriteriaCount: st.criteria.length,
          feathersEarned: Number(p?.feathersEarned || 0),
          studentReflection: p?.studentReflection || null,
          teacherFeedback: p?.teacherFeedback || null,
          lastPlayedAt: p?.lastPlayedAt || null
        };
      })
    };
  });

  const leaderboard = await buildJourneyLeaderboards({
    classId: selectedClass.id,
    grade: selectedClass.grade,
    academicYearId: selectedClass.academicYearId
  });

  return {
    classes: classes.map((c) => {
      const cBundle = getGradeCurriculumBundle(c.grade);
      return {
        id: c.id,
        name: c.className || c.name || "",
        grade: c.grade,
        curriculumCode: cBundle.curriculumCode,
        educationSystem: c.educationSystem,
        campusName: c.campus?.campusName || c.campus?.name || "",
        academicYearId: c.academicYearId,
        academicYearName: c.academicYear?.name || "",
        studentCount: c._count?.students || 0,
        accessRole: roleByClass.get(c.id) || "SPECIAL_TEACHER"
      };
    }),
    selectedClass: {
      id: selectedClass.id,
      name: selectedClass.className || selectedClass.name || "",
      grade: selectedClass.grade,
      curriculumCode: selectedClassBundle.curriculumCode,
      curriculumTitle: selectedClassBundle.curriculumTitle,
      educationSystem: selectedClass.educationSystem,
      campusName: selectedClass.campus?.campusName || selectedClass.campus?.name || "",
      academicYearId: selectedClass.academicYearId,
      isTC02SApplicable: isFinEduApplicableForClass(
        selectedClass.grade,
        selectedClass.educationSystem
      )
    },
    classRole: roleByClass.get(selectedClass.id) || "SPECIAL_TEACHER",
    stages: stagesSummary,
    students: studentMatrix,
    recentClassResults,
    leaderboard
  };
}

/**
 * Teacher unlocks/locks a stage or sets guidance for their assigned class
 */
export async function assignOrToggleStageByTeacher(
  sessionUser: { id: string; role: string; teacherId?: string | null },
  input: {
    classId: string;
    lessonCode: string;
    isUnlocked: boolean;
    customGuidance?: string;
    dueDate?: string | null;
  }
) {
  await ensureSkylineJourneyTables();

  const access = await verifyTeacherClassAccess({
    userId: sessionUser.id,
    role: sessionUser.role,
    teacherId: sessionUser.teacherId,
    classId: input.classId,
    subjectId: "spec_sub_fin_edu"
  });

  if (!access.allowed || (!access.isSubjectTeacher && !access.isAdmin)) {
    throw new Error("FORBIDDEN_TEACHER_CLASS_SCOPE");
  }

  const cls = await prisma.class.findUnique({ where: { id: input.classId } });
  if (!cls) throw new Error("CLASS_NOT_FOUND");

  const stageDef = getAnyStageByLessonCode(input.lessonCode) || getTC02SStageByLessonCode(input.lessonCode);
  if (!stageDef) throw new Error("STAGE_NOT_FOUND");

  const now = new Date().toISOString();
  const existing = (await prisma.$queryRawUnsafe(
    `SELECT id FROM skyline_quest_assignments WHERE classId = ? AND lessonId = ? LIMIT 1`,
    cls.id,
    stageDef.lessonId
  )) as Array<{ id: string }>;

  if (existing.length === 0) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO skyline_quest_assignments
        (id, academicYearId, classId, subjectId, topicId, lessonId, lessonCode, periodIndex, isUnlocked, assignedById, assignedAt, dueDate, customGuidance, createdAt, updatedAt)
       VALUES (?, ?, ?, 'spec_sub_fin_edu', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      makeId("sqa"),
      cls.academicYearId,
      cls.id,
      stageDef.topicId,
      stageDef.lessonId,
      stageDef.lessonCode,
      stageDef.periodIndex,
      input.isUnlocked ? 1 : 0,
      sessionUser.id,
      now,
      input.dueDate || null,
      input.customGuidance || null,
      now,
      now
    );
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE skyline_quest_assignments
       SET isUnlocked = ?,
           customGuidance = COALESCE(?, customGuidance),
           dueDate = COALESCE(?, dueDate),
           assignedById = ?,
           updatedAt = ?
       WHERE id = ?`,
      input.isUnlocked ? 1 : 0,
      input.customGuidance ?? null,
      input.dueDate ?? null,
      sessionUser.id,
      now,
      existing[0].id
    );
  }

  return {
    success: true,
    classId: cls.id,
    lessonCode: stageDef.lessonCode,
    isUnlocked: input.isUnlocked
  };
}

/**
 * Teacher reviews a student's stage submission (CONFIRM or REQUEST_REVISION)
 */
export async function reviewStudentStageByTeacher(
  sessionUser: { id: string; role: string; teacherId?: string | null },
  input: {
    studentId: string;
    lessonCode: string;
    decision: "CONFIRM" | "REQUEST_REVISION";
    teacherFeedback: string;
    syncToGradeEntry?: boolean;
  }
) {
  await ensureSkylineJourneyTables();

  const student: any = await prisma.student.findUnique({
    where: { id: input.studentId },
    include: { class: true }
  });
  if (!student || !student.class) {
    throw new Error("STUDENT_NOT_FOUND");
  }

  const access = await verifyTeacherClassAccess({
    userId: sessionUser.id,
    role: sessionUser.role,
    teacherId: sessionUser.teacherId,
    classId: student.class.id,
    subjectId: "spec_sub_fin_edu"
  });

  if (!access.allowed || (!access.isSubjectTeacher && !access.isAdmin)) {
    throw new Error("FORBIDDEN_TEACHER_CLASS_SCOPE");
  }

  const stageDef = getAnyStageByLessonCode(input.lessonCode) || getTC02SStageByLessonCode(input.lessonCode);
  if (!stageDef) throw new Error("STAGE_NOT_FOUND");
  const studentBundle = getGradeCurriculumBundle(student.class.grade);

  const now = new Date().toISOString();
  const nextStatus: StageProgressStatus =
    input.decision === "CONFIRM" ? "COMPLETED" : "NEEDS_REVISION";
  const teacherConfirmed = input.decision === "CONFIRM" ? 1 : 0;

  const existing = (await prisma.$queryRawUnsafe(
    `SELECT * FROM skyline_quest_progress WHERE studentId = ? AND lessonId = ? LIMIT 1`,
    student.id,
    stageDef.lessonId
  )) as Array<any>;

  if (existing.length === 0) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO skyline_quest_progress
        (id, studentId, studentCode, studentName, classId, campusId, academicYearId, programCode, subjectId, topicId, lessonId, lessonCode, periodIndex,
         status, hasPlayed, autoChallengePassed, teacherConfirmed, attemptsCount,
         teacherFeedback, teacherReviewedById, teacherReviewedAt,
         feathersEarned, flagPlanted, completedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'spec_sub_fin_edu', ?, ?, ?, ?, ?, 1, 1, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      makeId("sqp"),
      student.id,
      student.studentCode || student.code || "",
      student.studentName || student.fullName || "",
      student.class.id,
      student.class.campusId || "",
      student.class.academicYearId,
      studentBundle.curriculumCode,
      stageDef.topicId,
      stageDef.lessonId,
      stageDef.lessonCode,
      stageDef.periodIndex,
      nextStatus,
      teacherConfirmed,
      input.teacherFeedback,
      sessionUser.id,
      now,
      input.decision === "CONFIRM" ? stageDef.feathersReward : 0,
      input.decision === "CONFIRM" ? 1 : 0,
      input.decision === "CONFIRM" ? now : null,
      now,
      now
    );
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE skyline_quest_progress
       SET status = ?,
           teacherConfirmed = ?,
           teacherFeedback = ?,
           teacherReviewedById = ?,
           teacherReviewedAt = ?,
           flagPlanted = CASE WHEN ? = 1 THEN 1 ELSE flagPlanted END,
           completedAt = CASE WHEN ? = 'COMPLETED' THEN COALESCE(completedAt, ?) ELSE completedAt END,
           updatedAt = ?
       WHERE id = ?`,
      nextStatus,
      teacherConfirmed,
      input.teacherFeedback,
      sessionUser.id,
      now,
      teacherConfirmed,
      nextStatus,
      now,
      now,
      existing[0].id
    );
  }

  if (input.decision === "CONFIRM") {
    const starCode = `TEACHER_STAR_${stageDef.lessonCode}`;
    const starTitle = `Sao Thực Hành: ${stageDef.lessonName}`;
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO skyline_reward_ledger
        (id, idempotencyKey, studentId, classId, academicYearId, subjectId, lessonCode, periodIndex, rewardType, rewardCode, milestoneCode, title, rewardTitle, description, feathers, feathersEarned, sourceLessonId, awardedAt)
       VALUES (?, ?, ?, ?, ?, 'spec_sub_fin_edu', ?, ?, 'TEACHER_STAR', ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
      makeId("srl"),
      `${student.id}_${starCode}`,
      student.id,
      student.class.id,
      student.class.academicYearId,
      stageDef.lessonCode,
      stageDef.periodIndex,
      starCode,
      starCode,
      starTitle,
      starTitle,
      input.teacherFeedback || "Giáo viên xác nhận hoàn thành nhiệm vụ thực hành",
      stageDef.lessonId,
      now
    );
  }

  return {
    success: true,
    studentId: student.id,
    lessonCode: stageDef.lessonCode,
    status: nextStatus,
    teacherConfirmed: Boolean(teacherConfirmed),
    teacherFeedback: input.teacherFeedback
  };
}

/**
 * Parent Portal View: Strictly verify `ParentStudentLink` and return child's journey & companion tips
 */
export async function getParentJourneyView(params: {
  parentUserId: string;
  requestedStudentId?: string | null;
}) {
  await ensureSkylineJourneyTables();

  const parentRecord = await (prisma as any).parent
    ?.findUnique?.({ where: { userId: params.parentUserId } })
    .catch(() => null);

  const links: any[] = await prisma.parentStudentLink.findMany({
    where: parentRecord?.id
      ? { OR: [{ parentId: parentRecord.id }, { parentId: params.parentUserId }] }
      : { parentId: params.parentUserId },
    include: {
      student: {
        include: {
          class: {
            include: { campus: true, academicYear: true }
          }
        }
      }
    }
  });

  if (links.length === 0) {
    return {
      linkedChildren: [],
      selectedChildOverview: null
    };
  }

  if (params.requestedStudentId) {
    const isLinked = links.some((l) => l.studentId === params.requestedStudentId);
    if (!isLinked) {
      throw new Error("FORBIDDEN_CHILD_ACCESS");
    }
  }

  const targetLink =
    links.find((l) => l.studentId === params.requestedStudentId) || links[0];

  const overview = await getStudentJourneyOverview(targetLink.studentId);

  const parentSafeStages = overview.stages.map((s) => ({
    periodIndex: s.periodIndex,
    lessonCode: s.lessonCode,
    lessonName: s.lessonName,
    officialTopicName: s.officialTopicName,
    creativeZoneName: s.creativeZoneName,
    status: s.status,
    flagPlanted: s.flagPlanted,
    feathersEarned: s.feathersEarned,
    teacherConfirmed: s.teacherConfirmed,
    studentSharedReflection: s.studentReflection,
    teacherFeedback: s.teacherFeedback,
    parentCompanionTip: s.interactive.parentCompanionTip,
    completedAt: s.completedAt
  }));

  return {
    linkedChildren: links.map((l) => ({
      studentId: l.student.id,
      studentCode: l.student.studentCode || l.student.code || "",
      fullName: l.student.studentName || l.student.fullName || "",
      relationship: l.relationship,
      grade: l.student.class?.grade || "",
      className: l.student.class?.className || l.student.class?.name || "",
      campusName: l.student.class?.campus?.campusName || l.student.class?.campus?.name || ""
    })),
    selectedChild: overview.student,
    islands: overview.islands,
    progressMetrics: overview.progressMetrics,
    passport: overview.passport,
    stages: parentSafeStages
  };
}

/**
 * Admin / Management Overview: Configs, version approvals, coverage, and stages needing support
 */
export async function getAdminJourneyOverview(filters?: {
  academicYearId?: string;
  campusId?: string;
  grade?: string;
}) {
  await ensureSkylineJourneyTables();

  const activeYear = filters?.academicYearId
    ? await prisma.academicYear.findUnique({ where: { id: filters.academicYearId } })
    : await prisma.academicYear.findFirst({
        where: { status: "ACTIVE", isOff: false },
        orderBy: { startDate: "desc" }
      });

  const academicYearId = activeYear?.id || "ay_2025_2026";
  await ensureDefaultTC02SConfig(academicYearId);

  const [campuses, primaryClasses, configs, progressRows, finAssignments] =
    await Promise.all([
      prisma.campus.findMany({ orderBy: { campusCode: "asc" } }),
      prisma.class.findMany({
        where: {
          academicYearId,
          grade: filters?.grade ? filters.grade : { in: ["1", "2", "3", "4", "5"] },
          ...(filters?.campusId ? { campusId: filters.campusId } : {})
        },
        include: {
          campus: true,
          _count: { select: { students: true } }
        },
        orderBy: [{ grade: "asc" }, { className: "asc" }]
      }),
      prisma.$queryRawUnsafe(
        `SELECT * FROM skyline_journey_configs WHERE academicYearId = ? ORDER BY grade ASC, updatedAt DESC`,
        academicYearId
      ) as Promise<Array<any>>,
      prisma.$queryRawUnsafe(
        `SELECT * FROM skyline_quest_progress ORDER BY COALESCE(lastPlayedAt, updatedAt) DESC`
      ) as Promise<Array<any>>,
      prisma.specialTeachingAssignment.findMany({
        where: {
          status: "ACTIVE",
          subject: { code: "FIN_EDU" }
        },
        include: {
          teacher: true
        }
      })
    ]);

  const gradeCatalogStatus = ["1", "2", "3", "4", "5"].map((g) => {
    const bundle = getGradeCurriculumBundle(g);
    const totalCriteria = bundle.stages.reduce((acc, s) => acc + s.criteria.length, 0);
    const cfg = configs.find(
      (c) =>
        String(c.grade) === g &&
        (!c.campusId || c.campusId === "ALL") &&
        (!c.classId || c.classId === "ALL")
    );
    const classesInGrade = (primaryClasses as any[]).filter((c) => String(c.grade) === g);
    const assignedClassesCount = classesInGrade.filter((c) =>
      (finAssignments as any[]).some((fa) => fa.classId === c.id)
    ).length;

    return {
      grade: g,
      label: GRADE_DIFFERENTIATION_PROFILES[g]?.label || `Khối ${g}`,
      curriculumCode: bundle.curriculumCode,
      versionCode: `v1.0 (${bundle.stages.length} chặng - ${totalCriteria} YCCĐ)`,
      approvalStatus: cfg?.approvalStatus || "APPROVED",
      isEnabled: cfg ? Number(cfg.isEnabled) === 1 : true,
      totalClasses: classesInGrade.length,
      assignedFinClasses: assignedClassesCount
    };
  });

  const targetGradesForAnalytics = filters?.grade ? [filters.grade] : ["1", "2", "3", "4", "5"];
  const analyticsStagesCatalog = targetGradesForAnalytics.flatMap(
    (g) => getGradeCurriculumBundle(g).stages.map((st) => ({ ...st, grade: g }))
  );

  const stageAnalytics = analyticsStagesCatalog.map((st) => {
    const rows = progressRows.filter(
      (p) => String(p.lessonCode).toUpperCase() === st.lessonCode.toUpperCase()
    );
    const completedCount = rows.filter((p) => p.status === "COMPLETED").length;
    const waitingCount = rows.filter((p) => p.status === "WAITING_CONFIRMATION").length;
    const needsRevisionCount = rows.filter((p) => p.status === "NEEDS_REVISION").length;
    const multipleAttemptsCount = rows.filter((p) => Number(p.attemptsCount || 0) >= 2).length;

    return {
      grade: st.grade,
      periodIndex: st.periodIndex,
      lessonCode: st.lessonCode,
      lessonName: st.lessonName,
      topicCode: st.topicCode,
      mechanic: st.interactive.mechanic,
      evaluationMode: st.interactive.evaluationMode,
      totalPlayers: rows.length,
      completedCount,
      waitingCount,
      needsRevisionCount,
      multipleAttemptsCount,
      supportNeedScore: needsRevisionCount * 2 + multipleAttemptsCount
    };
  });

  const classById = new Map((primaryClasses as any[]).map((c) => [c.id, c]));
  const teacherByClassId = new Map<string, string>();
  for (const fa of finAssignments as any[]) {
    if (fa.classId && fa.teacher) {
      teacherByClassId.set(
        fa.classId,
        fa.teacher.teacherName || fa.teacher.fullName || "GVBM Tài chính"
      );
    }
  }

  // Enrich missing student names if older progress rows did not store studentName
  const missingStudentIds = Array.from(
    new Set(
      progressRows
        .filter((p) => !p.studentName && p.studentId)
        .map((p) => String(p.studentId))
    )
  );
  const lookedUpStudents =
    missingStudentIds.length > 0
      ? await prisma.student.findMany({
          where: { id: { in: missingStudentIds } },
          select: { id: true, studentCode: true, studentName: true }
        })
      : [];
  const studentLookupMap = new Map(lookedUpStudents.map((s) => [s.id, s]));

  const filteredProgressRows = progressRows.filter((p) => {
    if (!filters?.campusId && !filters?.grade) return true;
    return classById.has(p.classId);
  });

  const recentStudentResults = filteredProgressRows.slice(0, 50).map((p) => {
    const cls = classById.get(p.classId);
    const stuLookup = studentLookupMap.get(p.studentId);
    const stDef = getAnyStageByLessonCode(String(p.lessonCode || ""));
    const ws = safeJsonParse<any>(p.worldStateJson, {});
    const cr = safeJsonParse<string[]>(p.criteriaResultJson, []);
    const gradeVal = String(cls?.grade || "2");
    const bundle = getGradeCurriculumBundle(gradeVal);

    return {
      id: p.id,
      studentId: p.studentId,
      studentCode: p.studentCode || stuLookup?.studentCode || "",
      studentName: p.studentName || stuLookup?.studentName || "Học sinh",
      classId: p.classId,
      className: cls?.className || cls?.name || "",
      grade: gradeVal,
      campusName: cls?.campus?.campusName || cls?.campus?.name || "",
      curriculumCode: p.programCode || bundle.curriculumCode,
      assignedTeacherName: teacherByClassId.get(p.classId) || "Theo phân công khối",
      periodIndex: Number(p.periodIndex || stDef?.periodIndex || 0),
      lessonCode: p.lessonCode,
      lessonName: stDef?.lessonName || p.lessonCode,
      status: p.status as StageProgressStatus,
      scorePercent:
        typeof ws?.scorePercent === "number"
          ? ws.scorePercent
          : Number(p.autoChallengePassed) === 1
          ? 100
          : 0,
      achievedCriteriaCount: Array.isArray(cr) ? cr.length : 0,
      totalCriteriaCount: stDef?.criteria?.length || 0,
      feathersEarned: Number(p.feathersEarned || 0),
      attemptsCount: Number(p.attemptsCount || 1),
      studentReflection: p.studentReflection || null,
      teacherFeedback: p.teacherFeedback || null,
      lastPlayedAt: p.lastPlayedAt || p.updatedAt || null
    };
  });

  const classDrilldown = (primaryClasses as any[]).map((cls) => {
    const classProgs = progressRows.filter((p) => p.classId === cls.id);
    const fa = (finAssignments as any[]).find((a) => a.classId === cls.id);
    const classCfg = configs.find((c) => c.classId === cls.id);
    const campusCfg = configs.find((c) => c.campusId === cls.campusId && !c.classId);
    const bundle = getGradeCurriculumBundle(cls.grade);

    const isEnabled = classCfg
      ? Number(classCfg.isEnabled) === 1
      : campusCfg
      ? Number(campusCfg.isEnabled) === 1
      : true;

    return {
      classId: cls.id,
      className: cls.className || cls.name || "",
      grade: cls.grade,
      curriculumCode: bundle.curriculumCode,
      educationSystem: cls.educationSystem,
      campusId: cls.campusId,
      campusName: cls.campus?.campusName || cls.campus?.name || "",
      studentCount: cls._count?.students || 0,
      teacherName: fa?.teacher?.teacherName || fa?.teacher?.fullName || "Theo phân công khối",
      hasFinAssignment: Boolean(fa),
      isTC02SApplicable: isFinEduApplicableForClass(cls.grade, cls.educationSystem),
      isEnabled,
      activePlayersCount: new Set(classProgs.map((p) => p.studentId)).size,
      completedStageEntries: classProgs.filter((p) => p.status === "COMPLETED").length,
      waitingConfirmationEntries: classProgs.filter(
        (p) => p.status === "WAITING_CONFIRMATION"
      ).length,
      needsRevisionEntries: classProgs.filter((p) => p.status === "NEEDS_REVISION").length
    };
  });

  return {
    academicYear: activeYear,
    campuses: (campuses as any[]).map((c) => ({
      id: c.id,
      code: c.campusCode || c.code || "",
      name: c.campusName || c.name || ""
    })),
    gradeCatalogStatus,
    stageAnalytics,
    recentStudentResults,
    classDrilldown,
    configs
  };
}

/**
 * Admin toggles enablement or updates approval status by grade / campus / class
 */
export async function updateAdminJourneyConfig(
  adminUserId: string,
  input: {
    academicYearId: string;
    grade: string;
    educationSystem?: string;
    campusId?: string | null;
    classId?: string | null;
    isEnabled: boolean;
    approvalStatus?: "APPROVED" | "DRAFT" | "UNCONFIGURED";
  }
) {
  await ensureSkylineJourneyTables();

  const normGrade = normalizeElementaryGrade(input.grade);
  const bundle = getGradeCurriculumBundle(normGrade);

  const now = new Date().toISOString();
  const campusVal = input.campusId || "ALL";
  const classVal = input.classId || "ALL";
  const existing = (await prisma.$queryRawUnsafe(
    `SELECT id FROM skyline_journey_configs
     WHERE academicYearId = ? AND grade = ? AND subjectId = 'spec_sub_fin_edu'
       AND COALESCE(campusId, 'ALL') = ?
       AND COALESCE(classId, 'ALL') = ?
     LIMIT 1`,
    input.academicYearId,
    normGrade,
    campusVal,
    classVal
  )) as Array<{ id: string }>;

  if (existing.length === 0) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO skyline_journey_configs
        (id, academicYearId, campusId, classId, grade, educationSystem, subjectId, curriculumCode, versionId, isEnabled, approvalStatus, approvedById, approvedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'spec_sub_fin_edu', ?, 'spec_ver_fin_v1_0', ?, ?, ?, ?, ?, ?)`,
      makeId("sjc"),
      input.academicYearId,
      campusVal,
      classVal,
      normGrade,
      input.educationSystem || "HNS",
      bundle.curriculumCode,
      input.isEnabled ? 1 : 0,
      input.approvalStatus || "APPROVED",
      adminUserId,
      now,
      now,
      now
    );
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE skyline_journey_configs
       SET isEnabled = ?,
           curriculumCode = COALESCE(?, curriculumCode),
           approvalStatus = COALESCE(?, approvalStatus),
           approvedById = ?,
           approvedAt = ?,
           updatedAt = ?
       WHERE id = ?`,
      input.isEnabled ? 1 : 0,
      bundle.curriculumCode,
      input.approvalStatus || null,
      adminUserId,
      now,
      now,
      existing[0].id
    );
  }

  return {
    success: true,
    grade: normGrade,
    curriculumCode: bundle.curriculumCode,
    campusId: input.campusId || null,
    classId: input.classId || null,
    isEnabled: input.isEnabled
  };
}
