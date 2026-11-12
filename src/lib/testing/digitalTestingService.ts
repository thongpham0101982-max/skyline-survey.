import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import {
  validateExamMatrix as validateExamMatrixCore,
  MatrixItem,
  ThinkingLevel,
} from "@/lib/testing/examMatrixService";
import {
  calculateScoreDistribution,
  compareCampusesQuality,
} from "@/lib/testing/examAnalyticsService";
import {
  generateExamVariants,
  scoreOmrSheetAgainstVariant,
  OmrBubbleDetection,
  generatePrintableOmrSheetHtml,
} from "@/lib/testing/omrAndShuffleEngine";
import { verifyMoodleQuizConfiguration, fetchMoodleQuizAttempts } from "@/lib/testing/moodleClient";
import { checkProctorTimetableConflict } from "@/lib/timetable/effectiveScheduleService";

export interface MatrixCellInput {
  topicId?: string;
  topicName: string;
  level: "NB" | "TH" | "VD" | "VDC";
  questionType: string;
  questionCount: number;
  pointsPerQuestion: number;
  durationMinutes?: number;
}

const LEVEL_MAP: Record<string, ThinkingLevel> = {
  NB: "NHAN_BIET",
  TH: "THONG_HIEU",
  VD: "VAN_DUNG",
  VDC: "VAN_DUNG_CAO",
};

export function validateExamMatrix(cells: MatrixCellInput[], _maxScore: number = 10) {
  const items: MatrixItem[] = cells.map((c, idx) => {
    const totalPts = Math.round(c.questionCount * c.pointsPerQuestion * 100) / 100;
    return {
      id: c.topicId || `ITEM-${idx + 1}`,
      topic: c.topicName || "Chủ đề",
      level: LEVEL_MAP[c.level] || "NHAN_BIET",
      questionCount: Number(c.questionCount || 0),
      pointsPerQuestion: Number(c.pointsPerQuestion || 0),
      totalPoints: totalPts,
      percentage: Math.round(totalPts * 10),
      availableInBank: Math.max(Number(c.questionCount || 0) * 2, 10),
    };
  });

  const core = validateExamMatrixCore({
    id: "MATRIX-CHECK",
    code: "MT-01",
    name: "Ma trận kiểm tra",
    subjectCode: "SUB",
    subjectName: "Môn học",
    grade: "10",
    durationMinutes: 60,
    items,
  });

  return {
    ...core,
    totalPoints: core.totalScore,
    byLevel: {
      NB: core.levelDistribution.NHAN_BIET,
      TH: core.levelDistribution.THONG_HIEU,
      VD: core.levelDistribution.VAN_DUNG,
      VDC: core.levelDistribution.VAN_DUNG_CAO,
    },
    items,
  };
}

export function computeScoreSummary(scores: number[]) {
  return calculateScoreDistribution(scores);
}

export function computeCampusSubjectStats(
  rows: Array<{ campusName: string; subjectName: string; score: number }>
) {
  const map = new Map<string, number[]>();
  for (const r of rows) {
    const key = r.campusName || "Cơ sở chính";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r.score);
  }
  const campusesData = Array.from(map.entries()).map(([name, sc], idx) => ({
    campusId: `CAMP-${idx + 1}`,
    campusCode: `CS${idx + 1}`,
    campusName: name,
    scores: sc,
  }));
  return compareCampusesQuality(campusesData);
}

let schemaInitialized = false;

/**
 * Ensures all 13 additive Digital Testing tables exist in SQLite / Turso LibSQL
 * without altering any existing SSM tables, and seeds initial workflow records if empty.
 */
export async function ensureDigitalTestingTables(): Promise<void> {
  if (schemaInitialized) return;

  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS "TestingPeriod" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "code" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "academicYearId" TEXT NOT NULL,
      "semester" TEXT NOT NULL,
      "examType" TEXT NOT NULL,
      "programType" TEXT NOT NULL DEFAULT 'MOET',
      "campusId" TEXT,
      "gradeLevels" TEXT NOT NULL,
      "startDate" DATETIME NOT NULL,
      "endDate" DATETIME NOT NULL,
      "isMakeup" BOOLEAN NOT NULL DEFAULT false,
      "parentPeriodId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "description" TEXT,
      "createdById" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "TestingPeriod_code_key" ON "TestingPeriod"("code")`,
    `CREATE INDEX IF NOT EXISTS "TestingPeriod_academicYearId_semester_idx" ON "TestingPeriod"("academicYearId", "semester")`,

    `CREATE TABLE IF NOT EXISTS "TestingSubjectExam" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "periodId" TEXT NOT NULL,
      "subjectId" TEXT NOT NULL,
      "gradeLevel" TEXT NOT NULL,
      "campusId" TEXT,
      "examFormat" TEXT NOT NULL DEFAULT 'PAPER_OMR',
      "durationMinutes" INTEGER NOT NULL DEFAULT 60,
      "maxScore" REAL NOT NULL DEFAULT 10.0,
      "mcqWeight" REAL NOT NULL DEFAULT 7.0,
      "essayWeight" REAL NOT NULL DEFAULT 3.0,
      "moodleCourseId" INTEGER,
      "moodleQuizId" INTEGER,
      "moodleCmId" INTEGER,
      "moodleSyncStatus" TEXT NOT NULL DEFAULT 'NOT_LINKED',
      "moodleVerifiedAt" DATETIME,
      "moodleVerifiedBy" TEXT,
      "workflowStep" INTEGER NOT NULL DEFAULT 1,
      "status" TEXT NOT NULL DEFAULT 'PLANNING',
      "gradebookSyncedAt" DATETIME,
      "gradebookSyncedBy" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "TestingSubjectExam_periodId_subjectId_gradeLevel_campusId_key" ON "TestingSubjectExam"("periodId", "subjectId", "gradeLevel", "campusId")`,

    `CREATE TABLE IF NOT EXISTS "TestingTaskAssignment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "subjectExamId" TEXT NOT NULL,
      "teacherId" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "assignedScope" TEXT,
      "dueDate" DATETIME NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "completedAt" DATETIME,
      "approverId" TEXT,
      "reviewNote" TEXT,
      "remindedCount" INTEGER NOT NULL DEFAULT 0,
      "lastRemindedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "TestingTaskAssignment_teacherId_status_idx" ON "TestingTaskAssignment"("teacherId", "status")`,
    `CREATE INDEX IF NOT EXISTS "TestingTaskAssignment_subjectExamId_role_idx" ON "TestingTaskAssignment"("subjectExamId", "role")`,

    `CREATE TABLE IF NOT EXISTS "TestingMatrix" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "subjectExamId" TEXT NOT NULL,
      "version" INTEGER NOT NULL DEFAULT 1,
      "title" TEXT NOT NULL,
      "matrixJson" TEXT NOT NULL,
      "specDocumentUrl" TEXT,
      "totalQuestions" INTEGER NOT NULL DEFAULT 0,
      "totalPoints" REAL NOT NULL DEFAULT 10.0,
      "nbPercent" REAL NOT NULL DEFAULT 40,
      "thPercent" REAL NOT NULL DEFAULT 30,
      "vdPercent" REAL NOT NULL DEFAULT 20,
      "vdcPercent" REAL NOT NULL DEFAULT 10,
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "submittedById" TEXT NOT NULL,
      "submittedAt" DATETIME,
      "reviewedById" TEXT,
      "reviewedAt" DATETIME,
      "reviewComment" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "TestingMatrix_subjectExamId_version_key" ON "TestingMatrix"("subjectExamId", "version")`,

    `CREATE TABLE IF NOT EXISTS "TestingPaperSubmission" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "subjectExamId" TEXT NOT NULL,
      "matrixId" TEXT,
      "version" INTEGER NOT NULL DEFAULT 1,
      "submissionMode" TEXT NOT NULL DEFAULT 'PAPER_FILE',
      "paperFileUrl" TEXT,
      "answerKeyUrl" TEXT,
      "gradingGuideUrl" TEXT,
      "moodleCheckJson" TEXT,
      "isOfficial" BOOLEAN NOT NULL DEFAULT false,
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "submittedById" TEXT NOT NULL,
      "submittedAt" DATETIME,
      "peerReviewerId" TEXT,
      "peerReviewNote" TEXT,
      "peerReviewedAt" DATETIME,
      "approvedById" TEXT,
      "approvedAt" DATETIME,
      "approvalComment" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "TestingPaperSubmission_subjectExamId_isOfficial_idx" ON "TestingPaperSubmission"("subjectExamId", "isOfficial")`,

    `CREATE TABLE IF NOT EXISTS "TestingQuestion" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "subjectExamId" TEXT,
      "subjectId" TEXT NOT NULL,
      "gradeLevel" TEXT NOT NULL,
      "sectionCode" TEXT NOT NULL DEFAULT 'PART_I_MCQ',
      "topicName" TEXT NOT NULL,
      "cognitiveLevel" TEXT NOT NULL DEFAULT 'NB',
      "questionType" TEXT NOT NULL DEFAULT 'MCQ',
      "questionCode" TEXT NOT NULL,
      "stemContent" TEXT NOT NULL,
      "optionsJson" TEXT,
      "correctAnswer" TEXT NOT NULL,
      "points" REAL NOT NULL DEFAULT 0.25,
      "allowShuffleOpts" BOOLEAN NOT NULL DEFAULT true,
      "questionGroupId" TEXT,
      "authorTeacherId" TEXT,
      "isApprovedBank" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "TestingQuestion_subjectExamId_sectionCode_idx" ON "TestingQuestion"("subjectExamId", "sectionCode")`,

    `CREATE TABLE IF NOT EXISTS "TestingPaperVariant" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "paperId" TEXT NOT NULL,
      "variantCode" TEXT NOT NULL,
      "seedValue" INTEGER NOT NULL,
      "questionOrderJson" TEXT NOT NULL,
      "answerKeyMapJson" TEXT NOT NULL,
      "printableDocUrl" TEXT,
      "omrTemplateUrl" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "TestingPaperVariant_paperId_variantCode_key" ON "TestingPaperVariant"("paperId", "variantCode")`,

    `CREATE TABLE IF NOT EXISTS "TestingSession" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "subjectExamId" TEXT NOT NULL,
      "classId" TEXT NOT NULL,
      "roomName" TEXT NOT NULL,
      "examDate" DATETIME NOT NULL,
      "startTime" TEXT NOT NULL,
      "endTime" TEXT NOT NULL,
      "slotNumber" INTEGER,
      "totalRegistered" INTEGER NOT NULL DEFAULT 0,
      "presentCount" INTEGER NOT NULL DEFAULT 0,
      "absentCount" INTEGER NOT NULL DEFAULT 0,
      "collectedPapers" INTEGER NOT NULL DEFAULT 0,
      "incidentSummary" TEXT,
      "evidenceUrlsJson" TEXT,
      "minutesStatus" TEXT NOT NULL DEFAULT 'PENDING',
      "signedByProctorId" TEXT,
      "signedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "TestingSession_subjectExamId_classId_idx" ON "TestingSession"("subjectExamId", "classId")`,

    `CREATE TABLE IF NOT EXISTS "TestingSessionProctor" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sessionId" TEXT NOT NULL,
      "teacherId" TEXT NOT NULL,
      "proctorRole" TEXT NOT NULL DEFAULT 'PROCTOR_1',
      "conflictWarning" TEXT,
      "checkedInAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "TestingSessionProctor_sessionId_teacherId_key" ON "TestingSessionProctor"("sessionId", "teacherId")`,

    `CREATE TABLE IF NOT EXISTS "TestingSessionRoster" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sessionId" TEXT NOT NULL,
      "studentId" TEXT NOT NULL,
      "candidateNumber" TEXT NOT NULL,
      "seatNumber" TEXT,
      "variantCode" TEXT,
      "attendanceStatus" TEXT NOT NULL DEFAULT 'PRESENT',
      "paperSubmitted" BOOLEAN NOT NULL DEFAULT true,
      "violationLevel" TEXT,
      "violationNote" TEXT,
      "needsMakeup" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "TestingSessionRoster_sessionId_studentId_key" ON "TestingSessionRoster"("sessionId", "studentId")`,

    `CREATE TABLE IF NOT EXISTS "TestingOmrBatch" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "subjectExamId" TEXT NOT NULL,
      "sessionId" TEXT,
      "batchName" TEXT NOT NULL,
      "uploadedById" TEXT NOT NULL,
      "totalSheets" INTEGER NOT NULL DEFAULT 0,
      "recognizedSheets" INTEGER NOT NULL DEFAULT 0,
      "flaggedSheets" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'PROCESSING',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "TestingOmrSheet" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "batchId" TEXT NOT NULL,
      "studentId" TEXT,
      "candidateNumber" TEXT,
      "variantCode" TEXT,
      "imageUrl" TEXT NOT NULL,
      "confidenceScore" REAL NOT NULL DEFAULT 0,
      "rawBubbleMapJson" TEXT NOT NULL,
      "verifiedMapJson" TEXT,
      "anomalyFlagsJson" TEXT,
      "mcqScore" REAL,
      "correctCount" INTEGER,
      "totalQuestions" INTEGER,
      "recognitionStatus" TEXT NOT NULL DEFAULT 'RECOGNIZED',
      "reviewedById" TEXT,
      "reviewedAt" DATETIME,
      "reviewReason" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "TestingCandidateResult" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "subjectExamId" TEXT NOT NULL,
      "studentId" TEXT NOT NULL,
      "classId" TEXT NOT NULL,
      "candidateNumber" TEXT,
      "variantCode" TEXT,
      "sourceType" TEXT NOT NULL DEFAULT 'OMR_PAPER',
      "moodleAttemptId" INTEGER,
      "omrSheetId" TEXT,
      "mcqScore" REAL,
      "essayScore" REAL,
      "penaltyDeduction" REAL NOT NULL DEFAULT 0,
      "finalScore" REAL NOT NULL DEFAULT 0,
      "topicBreakdownJson" TEXT,
      "levelBreakdownJson" TEXT,
      "essayGradedById" TEXT,
      "essayComment" TEXT,
      "reconciliationFlag" TEXT NOT NULL DEFAULT 'MATCHED',
      "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT',
      "isLocked" BOOLEAN NOT NULL DEFAULT false,
      "approvedById" TEXT,
      "approvedAt" DATETIME,
      "syncedGradeEntryId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "TestingCandidateResult_subjectExamId_studentId_key" ON "TestingCandidateResult"("subjectExamId", "studentId")`,
  ];

  for (const sql of ddlStatements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err) {
      // Ignore if index/table already exists
    }
  }

  schemaInitialized = true;
}

/**
 * Fetches the complete Digital Testing Workspace payload for Admin or Teacher
 */
export async function getDigitalTestingWorkspace(options?: {
  periodId?: string;
  teacherId?: string;
  onlyAssignedToTeacher?: boolean;
}) {
  await ensureDigitalTestingTables();

  const [
    academicYears,
    campusesRaw,
    departmentsRaw,
    subjectsRaw,
    classesRaw,
    teachersRaw,
    periods,
  ] = await Promise.all([
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" }, take: 5 }),
    prisma.campus.findMany({ orderBy: { campusName: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.subject.findMany({ orderBy: { subjectName: "asc" } }),
    prisma.class.findMany({
      include: {
        campus: true,
        _count: { select: { students: true } },
      },
      orderBy: { className: "asc" },
    }),
    prisma.teacher.findMany({
      select: {
        id: true,
        teacherName: true,
        teacherCode: true,
        email: true,
        campusId: true,
        departmentId: true,
        departmentRel: {
          select: { id: true, name: true, code: true },
        },
        departmentAssignments: {
          select: {
            departmentId: true,
            department: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { teacherName: "asc" },
    }),
    prisma.testingPeriod.findMany({
      orderBy: [{ isMakeup: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const campuses = campusesRaw.map((c) => ({
    ...c,
    name: c.campusName,
    code: c.campusCode,
  }));
  const departments = departmentsRaw.map((d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    divisionCode: d.divisionCode,
  }));
  const subjects = subjectsRaw.map((s) => ({
    ...s,
    name: s.subjectName,
    code: s.subjectCode,
  }));
  const classes = classesRaw.map((c) => ({
    ...c,
    name: c.className,
    code: c.classCode,
    gradeLevel: c.grade,
  }));
  const teachers = teachersRaw.map((t) => {
    const deptIds = Array.from(
      new Set(
        [
          t.departmentId,
          ...(t.departmentAssignments?.map((a) => a.departmentId) || []),
        ].filter(Boolean) as string[]
      )
    );
    const deptName =
      t.departmentRel?.name ||
      t.departmentAssignments?.[0]?.department?.name ||
      "";
    return {
      ...t,
      fullName: t.teacherName,
      account: t.email,
      departmentIds: deptIds,
      departmentName: deptName,
    };
  });

  const activePeriodId = options?.periodId || periods[0]?.id;

  const subjectExamsRaw = await prisma.testingSubjectExam.findMany({
    where: activePeriodId ? { periodId: activePeriodId } : undefined,
    include: {
      period: true,
      tasks: {
        orderBy: { dueDate: "asc" },
      },
      matrices: {
        orderBy: { version: "desc" },
      },
      papers: {
        include: {
          variants: {
            orderBy: { variantCode: "asc" },
          },
        },
        orderBy: { version: "desc" },
      },
      questions: {
        orderBy: { questionCode: "asc" },
      },
      sessions: {
        include: {
          proctors: true,
          roster: true,
        },
        orderBy: { examDate: "asc" },
      },
      omrBatches: {
        include: {
          sheets: {
            orderBy: { candidateNumber: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      results: {
        orderBy: { candidateNumber: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Lookup maps for enriching relations cleanly
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const campusMap = new Map(campuses.map((c) => [c.id, c]));
  const yearMap = new Map(academicYears.map((y) => [y.id, y]));

  const enrichedPeriods = periods.map((p) => ({
    ...p,
    academicYearName: p.academicYearId ? yearMap.get(p.academicYearId)?.name || "" : "",
    campusName: p.campusId ? campusMap.get(p.campusId)?.name || "Toàn hệ thống" : "Toàn hệ thống",
  }));

  // Also load Student names for roster/results/OMR sheets
  const allStudentIds = new Set<string>();
  for (const se of subjectExamsRaw) {
    for (const sess of se.sessions) {
      for (const r of sess.roster) allStudentIds.add(r.studentId);
    }
    for (const res of se.results) allStudentIds.add(res.studentId);
    for (const b of se.omrBatches) {
      for (const sh of b.sheets) {
        if (sh.studentId) allStudentIds.add(sh.studentId);
      }
    }
  }

  const studentsRaw = allStudentIds.size
    ? await prisma.student.findMany({
        where: { id: { in: Array.from(allStudentIds) } },
        select: { id: true, studentName: true, studentCode: true, gender: true },
      })
    : [];
  const students = studentsRaw.map((s) => ({
    ...s,
    fullName: s.studentName,
  }));
  const studentMap = new Map(students.map((s) => [s.id, s]));

  // Enrich subject exams
  const enrichedExams = subjectExamsRaw.map((exam) => {
    const subj = subjectMap.get(exam.subjectId);
    const camp = exam.campusId ? campusMap.get(exam.campusId) : null;
    const latestMatrix = exam.matrices[0] || null;
    const officialPaper =
      exam.papers.find((p) => p.isOfficial) || exam.papers[0] || null;

    const scores = exam.results.map((r) => r.finalScore);
    const analytics = computeScoreSummary(scores);

    return {
      ...exam,
      subjectName: subj?.name || "Môn học",
      subjectCode: subj?.code || "",
      campusName: camp?.name || "Toàn hệ thống",
      latestMatrix,
      officialPaper,
      analytics,
      tasks: exam.tasks.map((t) => ({
        ...t,
        teacherName: teacherMap.get(t.teacherId)?.fullName || "Giáo viên",
        teacherEmail: teacherMap.get(t.teacherId)?.email || "",
        teacherDepartmentName: teacherMap.get(t.teacherId)?.departmentName || "",
        approverName: t.approverId ? teacherMap.get(t.approverId)?.fullName || "" : "",
        isOverdue:
          t.status !== "APPROVED" &&
          t.status !== "SUBMITTED" &&
          new Date(t.dueDate).getTime() < Date.now(),
      })),
      sessions: exam.sessions.map((s) => ({
        ...s,
        className: classMap.get(s.classId)?.name || "Lớp",
        proctors: s.proctors.map((p) => ({
          ...p,
          teacherName: teacherMap.get(p.teacherId)?.fullName || "Giám thị",
        })),
        roster: s.roster.map((r) => ({
          ...r,
          studentName: studentMap.get(r.studentId)?.fullName || "Học sinh",
          studentCode: studentMap.get(r.studentId)?.studentCode || r.candidateNumber,
        })),
      })),
      omrBatches: exam.omrBatches.map((b) => ({
        ...b,
        sheets: b.sheets.map((sh) => ({
          ...sh,
          studentName: sh.studentId
            ? studentMap.get(sh.studentId)?.fullName || "Chưa khớp HS"
            : "Chưa khớp HS",
        })),
      })),
      results: exam.results.map((res) => ({
        ...res,
        studentName: studentMap.get(res.studentId)?.fullName || "Học sinh",
        studentCode:
          studentMap.get(res.studentId)?.studentCode || res.candidateNumber || "",
        className: classMap.get(res.classId)?.name || "Lớp",
      })),
    };
  });

  const filteredExams =
    options?.onlyAssignedToTeacher && options?.teacherId
      ? enrichedExams.filter(
          (exam) =>
            exam.tasks.some((t) => t.teacherId === options.teacherId) ||
            exam.sessions.some((s) =>
              s.proctors.some((p) => p.teacherId === options.teacherId)
            )
        )
      : enrichedExams;

  // Compute Overall KPIs for Dashboard Tab 1
  const allTasks = enrichedExams.flatMap((e) => e.tasks);
  const allResults = enrichedExams.flatMap((e) => e.results);
  const allSessions = enrichedExams.flatMap((e) => e.sessions);
  const allSheets = enrichedExams.flatMap((e) =>
    e.omrBatches.flatMap((b) => b.sheets)
  );

  const campusStats = computeCampusSubjectStats(
    allResults.map((r) => {
      const ex = enrichedExams.find((e) => e.id === r.subjectExamId);
      return {
        campusName: ex?.campusName || "Cơ sở chính",
        subjectName: ex?.subjectName || "Môn học",
        score: r.finalScore,
      };
    })
  );

  const kpis = {
    totalPeriods: periods.length,
    totalSubjectExams: enrichedExams.length,
    approvedMatricesCount: enrichedExams.filter((e) =>
      e.matrices.some((m) => m.status === "APPROVED")
    ).length,
    officialPapersCount: enrichedExams.filter((e) =>
      e.papers.some((p) => p.isOfficial)
    ).length,
    overdueTasksCount: allTasks.filter((t) => t.isOverdue).length,
    totalSessions: allSessions.length,
    signedMinutesCount: allSessions.filter((s) => s.minutesStatus === "SIGNED")
      .length,
    makeupCandidatesCount: allSessions.reduce(
      (acc, s) => acc + s.roster.filter((r) => r.needsMakeup).length,
      0
    ),
    omrSheetsTotal: allSheets.length,
    omrFlaggedCount: allSheets.filter(
      (sh) => sh.recognitionStatus !== "RECOGNIZED" && sh.recognitionStatus !== "VERIFIED"
    ).length,
    lockedExamsCount: enrichedExams.filter((e) => e.status === "LOCKED").length,
  };

  return {
    academicYears,
    campuses,
    departments,
    subjects,
    classes,
    teachers,
    periods: enrichedPeriods,
    activePeriodId,
    subjectExams: filteredExams,
    kpis,
    campusStats,
  };
}

/**
 * Checks if a teacher has any conflict with TimetableSlot or another TestingSessionProctor at the same date & time
 */
export async function checkProctorScheduleConflict(params: {
  teacherId: string;
  examDate: Date;
  startTime: string;
  endTime: string;
  slotNumber?: number | null;
  excludeSessionId?: string;
  campusId?: string | null;
}): Promise<string | null> {
  const warnings: string[] = [];

  // 1. Check other TestingSessionProctor assignments on the same day
  const startOfDay = new Date(params.examDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(params.examDate);
  endOfDay.setHours(23, 59, 59, 999);

  const otherProctorings = await prisma.testingSessionProctor.findMany({
    where: {
      teacherId: params.teacherId,
      sessionId: params.excludeSessionId ? { not: params.excludeSessionId } : undefined,
      session: {
        examDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    },
    include: {
      session: true,
    },
  });

  for (const op of otherProctorings) {
    if (
      params.startTime < op.session.endTime &&
      params.endTime > op.session.startTime
    ) {
      warnings.push(
        `Trùng ca coi thi tại ${op.session.roomName} (${op.session.startTime} - ${op.session.endTime})`
      );
    }
  }

  // 2. Check actual effective Timetable schedule (published versions, week parity, date substitutions, clock overlap & inter-campus travel)
  try {
    const tkbWarnings = await checkProctorTimetableConflict({
      teacherId: params.teacherId,
      examDate: params.examDate,
      startTime: params.startTime,
      endTime: params.endTime,
      examCampusId: params.campusId || null,
    });
    warnings.push(...tkbWarnings);
  } catch {
    // Graceful fallback if timetable tables are unavailable
  }

  return warnings.length > 0 ? warnings.join("; ") : null;
}

/**
 * Step 9 -> Step 10: Synchronize Approved & Locked Exam Results to MOET SubjectGradeEntry / CTQT CtqtGradeEntry
 * and lock GradebookLock. Also supports safe rollback by Admin.
 */
export async function syncApprovedResultsToGradebook(params: {
  subjectExamId: string;
  actorName: string;
  actorEmail?: string;
}): Promise<{
  syncedCount: number;
  gradeColumn: string;
  programType: string;
}> {
  const exam = await prisma.testingSubjectExam.findUnique({
    where: { id: params.subjectExamId },
    include: {
      period: true,
      results: true,
    },
  });

  if (!exam) {
    throw new Error("Không tìm thấy bài kiểm tra bộ môn.");
  }

  if (exam.results.length === 0) {
    throw new Error("Chưa có dữ liệu kết quả điểm học sinh để đồng bộ Sổ điểm.");
  }

  const subject = await prisma.subject.findUnique({
    where: { id: exam.subjectId },
  });

  const isMidterm = exam.period.examType === "MIDTERM";
  const gradeColumn = isMidterm ? "GK" : "CK";
  const evaluationPeriod = `${exam.period.semester}_${gradeColumn}`;
  let syncedCount = 0;
  const affectedClassIds = new Set<string>();

  // Map results into SubjectGradeEntry (MOET)
  for (const res of exam.results) {
    affectedClassIds.add(res.classId);

    const existingEntry = await prisma.subjectGradeEntry.findFirst({
      where: {
        studentId: res.studentId,
        subjectId: exam.subjectId,
        evaluationPeriod: exam.period.semester,
        academicYearId: exam.period.academicYearId,
      },
    });

    let compObj: Record<string, any> = {};
    if (existingEntry?.componentScores) {
      try {
        compObj = JSON.parse(existingEntry.componentScores);
      } catch {
        compObj = {};
      }
    }
    compObj[gradeColumn] = res.finalScore;
    compObj[`${gradeColumn}_MCQ`] = res.mcqScore;
    compObj[`${gradeColumn}_ESSAY`] = res.essayScore;

    let entryId = existingEntry?.id;

    if (existingEntry) {
      await prisma.subjectGradeEntry.update({
        where: { id: existingEntry.id },
        data: {
          componentScores: JSON.stringify(compObj),
          compositeScore: res.finalScore,
        },
      });
    } else {
      const created = await prisma.subjectGradeEntry.create({
        data: {
          studentId: res.studentId,
          subjectId: exam.subjectId,
          classId: res.classId,
          academicYearId: exam.period.academicYearId,
          evaluationPeriod: exam.period.semester,
          componentScores: JSON.stringify(compObj),
          compositeScore: res.finalScore,
          remark: `Đồng bộ tự động từ Khảo thí Số (${exam.period.code})`,
        },
      });
      entryId = created.id;
    }

    await prisma.testingCandidateResult.update({
      where: { id: res.id },
      data: {
        approvalStatus: "SYNCED_GRADEBOOK",
        isLocked: true,
        approvedById: params.actorName,
        approvedAt: new Date(),
        syncedGradeEntryId: entryId || null,
      },
    });

    syncedCount += 1;
  }

  // Upsert GradebookLock for each affected class
  for (const clsId of affectedClassIds) {
    try {
      await prisma.gradebookLock.upsert({
        where: {
          academicYearId_evaluationPeriod_classId_subjectId: {
            academicYearId: exam.period.academicYearId,
            evaluationPeriod,
            classId: clsId,
            subjectId: exam.subjectId,
          },
        },
        update: {
          isLocked: true,
          lockedBy: params.actorName,
          lockedAt: new Date(),
          lockReason: `Khóa tự động sau khi duyệt kết quả Khảo thí Số (${exam.period.name})`,
        },
        create: {
          academicYearId: exam.period.academicYearId,
          evaluationPeriod,
          classId: clsId,
          subjectId: exam.subjectId,
          isLocked: true,
          lockedBy: params.actorName,
          lockedAt: new Date(),
          lockReason: `Khóa tự động sau khi duyệt kết quả Khảo thí Số (${exam.period.name})`,
        },
      });
    } catch {
      // Ignore if lock already exists
    }
  }

  await prisma.testingSubjectExam.update({
    where: { id: exam.id },
    data: {
      status: "LOCKED",
      workflowStep: 10,
      gradebookSyncedAt: new Date(),
      gradebookSyncedBy: params.actorName,
    },
  });

  await logActivity({
    action: "SYNC_GRADEBOOK_KHAO_THI",
    entityType: "TestingSubjectExam",
    entityId: exam.id,
    actorName: params.actorName,
    actorEmail: params.actorEmail,
    description: `Phê duyệt, khóa điểm và đồng bộ ${syncedCount} kết quả môn ${subject?.name || ""} vào cột ${gradeColumn} Sổ điểm (${exam.period.semester}).`,
  });

  return {
    syncedCount,
    gradeColumn,
    programType: exam.period.programType,
  };
}

/**
 * Rollback a locked exam so scores can be adjusted in emergency cases (logged in AuditLog)
 */
export async function rollbackExamGradebookSync(params: {
  subjectExamId: string;
  reason: string;
  actorName: string;
  actorEmail?: string;
}) {
  const exam = await prisma.testingSubjectExam.findUnique({
    where: { id: params.subjectExamId },
  });
  if (!exam) throw new Error("Không tìm thấy bài kiểm tra.");

  await prisma.testingCandidateResult.updateMany({
    where: { subjectExamId: params.subjectExamId },
    data: {
      isLocked: false,
      approvalStatus: "APPROVED",
    },
  });

  await prisma.testingSubjectExam.update({
    where: { id: params.subjectExamId },
    data: {
      status: "RECONCILING",
      workflowStep: 9,
    },
  });

  await logActivity({
    action: "ROLLBACK_GRADEBOOK_KHAO_THI",
    entityType: "TestingSubjectExam",
    entityId: params.subjectExamId,
    actorName: params.actorName,
    actorEmail: params.actorEmail,
    description: `Mở khóa & hoàn tác trạng thái khóa điểm bài kiểm tra ${params.subjectExamId}. Lý do: ${params.reason}`,
  });

  return { ok: true };
}

export {
  generateExamVariants,
  scoreOmrSheetAgainstVariant,
  generatePrintableOmrSheetHtml,
  verifyMoodleQuizConfiguration,
  fetchMoodleQuizAttempts,
};
