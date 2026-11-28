import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    academicYear: { findMany: vi.fn() },
    campus: { findMany: vi.fn() },
    specialTeachingAssignment: { findMany: vi.fn() },
    class: { findMany: vi.fn() },
    student: { findMany: vi.fn() },
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn()
  }
}));

vi.mock("../schemaInit", () => ({
  ensureSkylineJourneyTables: vi.fn().mockResolvedValue(undefined)
}));

import { prisma } from "@/lib/db";
import {
  aggregateMetrics,
  computeSurveyDistribution,
  extractStageScorePercent,
  getEducationLevelFromGrade,
  getFinEduGamificationReport,
  roundPercent
} from "../reportService";

describe("reportService pure helpers", () => {
  it("computes percentages safely with zero denominator", () => {
    expect(roundPercent(0, 0)).toBe(0);
    expect(roundPercent(1, 3)).toBe(33.3);
    expect(roundPercent(48, 1032)).toBe(4.7);
  });

  it("maps grades to education levels accurately", () => {
    expect(getEducationLevelFromGrade("1").levelCode).toBe("PRIMARY");
    expect(getEducationLevelFromGrade("Khối 5").levelCode).toBe("PRIMARY");
    expect(getEducationLevelFromGrade("6").levelCode).toBe("SECONDARY");
    expect(getEducationLevelFromGrade("9").levelCode).toBe("SECONDARY");
  });

  it("extracts scorePercent from worldStateJson with fallback to autoChallengePassed", () => {
    expect(
      extractStageScorePercent({
        worldStateJson: JSON.stringify({ scorePercent: 85 }),
        autoChallengePassed: 0
      })
    ).toBe(85);
    expect(extractStageScorePercent({ worldStateJson: "{}", autoChallengePassed: 1 })).toBe(100);
    expect(extractStageScorePercent({ worldStateJson: "invalid", autoChallengePassed: 0 })).toBe(0);
  });

  it("computes survey distribution and positive rate", () => {
    const dist = computeSurveyDistribution([
      { interestLevel: "VERY_LOVE" },
      { interestLevel: "VERY_LOVE" },
      { interestLevel: "LOVE" },
      { interestLevel: "NORMAL" },
      { interestLevel: "NEED_SUPPORT" }
    ]);
    expect(dist.VERY_LOVE).toBe(2);
    expect(dist.LOVE).toBe(1);
    expect(dist.NORMAL).toBe(1);
    expect(dist.NEED_SUPPORT).toBe(1);
    expect(dist.positiveCount).toBe(3);
    expect(dist.positiveRatePercent).toBe(60);
  });

  it("aggregates metrics across students, surveys, and progress rows", () => {
    const summary = aggregateMetrics({
      totalClasses: 2,
      enrolledStudents: 20,
      surveyItems: [
        { studentId: "s1", interestLevel: "VERY_LOVE" },
        { studentId: "s2", interestLevel: "NORMAL" },
        { studentId: "s1", interestLevel: "VERY_LOVE" } // duplicate should dedupe
      ],
      progressRows: [
        {
          studentId: "s1",
          status: "COMPLETED",
          hasPlayed: 1,
          attemptsCount: 1,
          feathersEarned: 3,
          worldStateJson: JSON.stringify({ scorePercent: 100 })
        },
        {
          studentId: "s1",
          status: "IN_PROGRESS",
          hasPlayed: 1,
          attemptsCount: 2,
          feathersEarned: 0,
          worldStateJson: JSON.stringify({ scorePercent: 80 })
        }
      ]
    });

    expect(summary.enrolledStudents).toBe(20);
    expect(summary.surveyedStudents).toBe(2);
    expect(summary.surveyRatePercent).toBe(10);
    expect(summary.playedStudents).toBe(1);
    expect(summary.participationRatePercent).toBe(5);
    expect(summary.totalStagePlays).toBe(2);
    expect(summary.completedStages).toBe(1);
    expect(summary.completionRatePercent).toBe(50);
    expect(summary.avgScorePercent).toBe(90);
    expect(summary.totalFeathers).toBe(3);
  });
});

describe("getFinEduGamificationReport (mocked Prisma)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds level, grade, class, stage, and student breakdowns accurately", async () => {
    (prisma.academicYear.findMany as any).mockResolvedValue([
      { id: "ay_2026", name: "2026-2027", status: "ACTIVE", isOff: false }
    ]);
    (prisma.campus.findMany as any).mockResolvedValue([
      { id: "cp1", campusCode: "CS1", campusName: "CS1 - Riverside" }
    ]);
    (prisma.specialTeachingAssignment.findMany as any).mockResolvedValue([
      { classId: "c4", teacher: { id: "t1", teacherName: "Cô Lan" } },
      { classId: "c6", teacher: { id: "t2", teacherName: "Thầy Minh" } }
    ]);
    (prisma.class.findMany as any).mockResolvedValue([
      {
        id: "c4",
        className: "4.1_CS1",
        grade: "4",
        educationSystem: "HNS",
        campusId: "cp1",
        campus: { campusCode: "CS1", campusName: "CS1 - Riverside" },
        students: [
          { id: "s1", studentCode: "HS001", studentName: "Nguyễn An", classId: "c4" },
          { id: "s2", studentCode: "HS002", studentName: "Trần Bình", classId: "c4" }
        ]
      },
      {
        id: "c6",
        className: "6.1_CS1",
        grade: "6",
        educationSystem: "HNS",
        campusId: "cp1",
        campus: { campusCode: "CS1", campusName: "CS1 - Riverside" },
        students: [
          { id: "s3", studentCode: "HS003", studentName: "Lê Chi", classId: "c6" }
        ]
      }
    ]);
    (prisma.$queryRawUnsafe as any)
      .mockResolvedValueOnce([
        {
          id: "p1",
          studentId: "s1",
          classId: "c4",
          academicYearId: "ay_2026",
          programCode: "TC04S",
          lessonCode: "TC04S.01.0001",
          periodIndex: 1,
          status: "COMPLETED",
          hasPlayed: 1,
          autoChallengePassed: 1,
          attemptsCount: 2,
          worldStateJson: JSON.stringify({ scorePercent: 100, durationSeconds: 45 }),
          criteriaResultJson: JSON.stringify(["TC04S.01.0001.01"]),
          studentReflection: "Rất vui",
          teacherFeedback: "Tốt lắm",
          feathersEarned: 3,
          lastPlayedAt: "2026-11-20T08:00:00.000Z",
          completedAt: "2026-11-20T08:00:00.000Z"
        }
      ])
      .mockResolvedValueOnce([
        {
          id: "sv1",
          studentId: "s1",
          classId: "c4",
          academicYearId: "ay_2026",
          lessonCode: "TC04S.00",
          rewardType: "WELCOME_SURVEY",
          metadataJson: JSON.stringify({
            interestLevel: "VERY_LOVE",
            interestLabel: "😍 Rất yêu thích!",
            favoriteActivities: ["Cửa hàng"],
            characterName: "Gấu Mật"
          }),
          awardedAt: "2026-11-19T08:00:00.000Z"
        }
      ]);

    const report = await getFinEduGamificationReport();

    expect(report.overview.enrolledStudents).toBe(3);
    expect(report.overview.surveyedStudents).toBe(1);
    expect(report.overview.surveyRatePercent).toBe(33.3);
    expect(report.overview.playedStudents).toBe(1);
    expect(report.overview.completedStages).toBe(1);
    expect(report.overview.avgScorePercent).toBe(100);

    const primaryLevel = report.levelSummary.find((l) => l.levelCode === "PRIMARY");
    const secondaryLevel = report.levelSummary.find((l) => l.levelCode === "SECONDARY");
    expect(primaryLevel?.enrolledStudents).toBe(2);
    expect(primaryLevel?.surveyedStudents).toBe(1);
    expect(primaryLevel?.surveyRatePercent).toBe(50);
    expect(secondaryLevel?.enrolledStudents).toBe(1);
    expect(secondaryLevel?.playedStudents).toBe(0);

    const stu1 = report.studentGameResults.find((s) => s.studentId === "s1");
    expect(stu1?.hasSurveyed).toBe(true);
    expect(stu1?.games).toHaveLength(1);
    expect(stu1?.games[0].scorePercent).toBe(100);
  });
});
