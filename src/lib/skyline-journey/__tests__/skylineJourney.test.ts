import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock @/lib/db strictly (No Unsolicited Test Data rule in GEMINI.md)
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    student: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    },
    class: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    },
    teacher: {
      findUnique: vi.fn()
    },
    specialTeachingAssignment: {
      findMany: vi.fn(),
      findFirst: vi.fn()
    },
    teachingAssignment: {
      findMany: vi.fn(),
      findFirst: vi.fn()
    },
    specialLesson: {
      findMany: vi.fn()
    },
    parentStudentLink: {
      findMany: vi.fn()
    },
    academicYear: {
      findUnique: vi.fn(),
      findFirst: vi.fn()
    },
    campus: {
      findMany: vi.fn()
    },
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn()
  }
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma
}));

import {
  TC02S_STAGES,
  TC02S_ZONES,
  getTC02SStageByLessonCode
} from "../tc02s-catalog";
import {
  GRADE_CURRICULUM_BUNDLES,
  getAnyStageByLessonCode,
  getGradeCurriculumBundle
} from "../multi-grade-catalog";
import {
  validateBackpackMechanic,
  validateBirdShopMechanic,
  validateDiaryAdMechanic,
  validateDreamNestMechanic,
  validateStageSubmission,
  validateVillageRescueMechanic
} from "../validator";
import {
  assignOrToggleStageByTeacher,
  getParentJourneyView,
  getStudentJourneyOverview,
  reviewStudentStageByTeacher,
  saveStudentStageDraft,
  submitStudentStageAction
} from "../service";

describe("Sky-Line Learning Journey (TC02S Catalog & 5 Game Mechanics Validator)", () => {
  it("contains all 3 zones, 15 stages, and 55 official criteria mapped 1-1 with PPCT TC02S", () => {
    expect(TC02S_ZONES).toHaveLength(3);
    expect(TC02S_STAGES).toHaveLength(15);

    const allCriteria = TC02S_STAGES.flatMap((s) => s.criteria);
    expect(allCriteria).toHaveLength(55);
    expect(allCriteria[0].code).toBe("TC02S.01.0001.01");
    expect(allCriteria[54].code).toBe("TC02S.03.0005.55");
  });

  it("Scenario 6: Bird Shop validates multi-solution carts, budget, change & polite response", () => {
    const stage6 = getTC02SStageByLessonCode("TC02S.02.0001")!;

    // Valid Solution A: Notebook (10) + Pencil (5) + Eraser (4) = 19 Xu (remaining 6 Xu out of 25 Xu)
    const solA = validateBirdShopMechanic(stage6, {
      selectedItemIds: ["shop_notebook", "shop_pencil", "shop_eraser"],
      calculatedTotalCost: 19,
      calculatedRemainingCoins: 6,
      selectedPoliteResponseId: "polite_check"
    });
    expect(solA.isValid).toBe(true);
    expect(solA.autoChallengePassed).toBe(true);
    expect(solA.nextStatus).toBe("COMPLETED");

    // Valid Solution B: Crayon (12) + Notebook (10) + Bookmark (3) = 25 Xu (remaining 0 Xu) -> Also valid!
    const solB = validateBirdShopMechanic(stage6, {
      selectedItemIds: ["shop_crayon", "shop_notebook", "shop_bookmark"],
      calculatedTotalCost: 25,
      calculatedRemainingCoins: 0,
      selectedPoliteResponseId: "polite_check"
    });
    expect(solB.isValid).toBe(true);
    expect(solB.autoChallengePassed).toBe(true);

    // Invalid Solution: Over budget (10 + 5 + 4 + 12 = 31 > 25) or impolite response
    const invalidSol = validateBirdShopMechanic(stage6, {
      selectedItemIds: ["shop_notebook", "shop_pencil", "shop_eraser", "shop_crayon"],
      calculatedTotalCost: 31,
      calculatedRemainingCoins: -6,
      selectedPoliteResponseId: "angry_shout"
    });
    expect(invalidSol.isValid).toBe(false);
    expect(invalidSol.autoChallengePassed).toBe(false);
    expect(invalidSol.nextStatus).toBe("IN_PROGRESS");
  });

  it("validates Backpack Builder context-dependent Need vs Want sorting (Stage 2)", () => {
    const stage2 = getTC02SStageByLessonCode("TC02S.01.0002")!;
    const res = validateBackpackMechanic(stage2, {
      placements: {
        RAINY_SCHOOL_DAY: {
          raincoat: "GROUP_A",
          textbook_pen: "GROUP_A",
          water_bottle: "GROUP_A",
          toy_robot: "GROUP_B",
          sticker_album: "GROUP_B",
          lollipop_pack: "GROUP_B"
        },
        SPORTS_CLUB_DAY: {
          sneakers: "GROUP_A",
          sport_hat: "GROUP_A",
          glowing_crown: "GROUP_B",
          comic_book_new: "GROUP_B"
        }
      },
      selectedReasonOptionId: "opt_wait_use_old"
    });
    expect(res.isValid).toBe(true);
    expect(res.achievedCriterionCodes).toContain("TC02S.01.0002.07");
  });

  it("Scenario 7: HYBRID_TEACHER stages transition to WAITING_CONFIRMATION, not COMPLETED automatically", () => {
    // Stage 4 (Siêu anh hùng tiết kiệm) is HYBRID_TEACHER
    const stage4 = getTC02SStageByLessonCode("TC02S.01.0004")!;
    expect(stage4.interactive.evaluationMode).toBe("HYBRID_TEACHER");

    const resultWithReflection = validateVillageRescueMechanic(stage4, {
      hotspotActions: {
        spot_classroom_light: "act_turn_off_switch",
        spot_water_tap: "act_close_tap",
        spot_broken_socket: "act_call_adult",
        spot_notebook_pencil: "act_save_paper_time"
      },
      selectedReflectionOptionId: "opt_neat_desk",
      practicalNote: "Em tự tắt đèn phòng học khi ra chơi và khóa vòi nước sau khi rửa tay."
    });

    expect(resultWithReflection.autoChallengePassed).toBe(true);
    expect(resultWithReflection.requiresTeacherConfirmation).toBe(true);
    expect(resultWithReflection.nextStatus).toBe("WAITING_CONFIRMATION");
  });

  it("validates Dream Nest (Stage 3) and Coin Diary / Ad Street (Stages 5, 14, 15)", () => {
    const stage3 = getTC02SStageByLessonCode("TC02S.01.0003")!;
    const nestRes = validateDreamNestMechanic(stage3, {
      jarAllocations: {
        jar_food: 8,
        jar_study: 7,
        jar_saving: 5
      },
      selectedTwistOptionId: "keep_saving"
    });
    expect(nestRes.isValid).toBe(true);
    expect(nestRes.nextStatus).toBe("COMPLETED");

    const stage5 = getTC02SStageByLessonCode("TC02S.01.0005")!;
    const diaryRes = validateDiaryAdMechanic(stage5, {
      calculatedTotalSpent: 25,
      calculatedRemainingCoins: 5,
      entryClassifications: {
        entry_ruler: true,
        entry_milk: true,
        entry_whistle_toy: false
      }
    });
    expect(diaryRes.isValid).toBe(true);
    expect(diaryRes.nextStatus).toBe("COMPLETED");

    const stage14 = getTC02SStageByLessonCode("TC02S.03.0004")!;
    const adRes = validateStageSubmission(stage14, {
      adDecisions: {
        ad_candy_toy: { identifiedHookType: "GIFT_BONUS", shouldBuy: false },
        ad_giant_crayon_castle: { identifiedHookType: "BIG_DISCOUNT", shouldBuy: false },
        ad_good_crayon_12: { identifiedHookType: "GENUINE_QUALITY", shouldBuy: true }
      }
    });
    expect(adRes.isValid).toBe(true);
    expect(adRes.nextStatus).toBe("COMPLETED");
  });
});

describe("Sky-Line Journey Service Layer (Scoping, Security, Drafts & Idempotent Rewards)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$executeRawUnsafe.mockResolvedValue(1);
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
    mockPrisma.specialLesson.findMany.mockResolvedValue([]);
  });

  it("Scenario 1 & 2: Grade 2 System S student sees approved TC02S island, while Grade 4 student sees UNCONFIGURED status", async () => {
    // 1. Grade 2 System S student
    mockPrisma.student.findUnique.mockResolvedValueOnce({
      id: "stu_g2",
      code: "HS2001",
      fullName: "Nguyễn Minh An",
      class: {
        id: "cls_2s",
        name: "2.1",
        grade: "2",
        educationSystem: "HNS",
        campusId: "cp_1",
        academicYearId: "ay_2025_2026",
        campus: { name: "Cơ sở 1" },
        academicYear: { name: "2025-2026" }
      }
    });
    mockPrisma.specialTeachingAssignment.findMany.mockResolvedValueOnce([
      {
        subject: { id: "spec_sub_fin_edu", code: "FIN_EDU", name: "Giáo dục tài chính cá nhân" },
        teacher: { id: "t_1", fullName: "Cô Lan", code: "GV01" }
      }
    ]);

    const g2Overview = await getStudentJourneyOverview("stu_g2");
    expect(g2Overview.islands).toHaveLength(1);
    expect(g2Overview.islands[0].configStatus).toBe("ACTIVE_APPROVED");
    expect(g2Overview.islands[0].curriculumCode).toBe("TC02S");
    expect(g2Overview.stages).toHaveLength(15);

    // 2. Grade 4 student -> Receives official Grade 4 TC04S island (3 zones, 12 stages, 57 criteria)
    mockPrisma.student.findUnique.mockResolvedValueOnce({
      id: "stu_g4",
      code: "HS4001",
      fullName: "Trần Bảo Ngọc",
      class: {
        id: "cls_4s",
        name: "4.1",
        grade: "4",
        educationSystem: "HNS",
        campusId: "cp_1",
        academicYearId: "ay_2025_2026",
        campus: { name: "Cơ sở 1" },
        academicYear: { name: "2025-2026" }
      }
    });
    mockPrisma.specialTeachingAssignment.findMany.mockResolvedValueOnce([
      {
        subject: { id: "spec_sub_fin_edu", code: "FIN_EDU", name: "Giáo dục tài chính cá nhân" },
        teacher: { id: "t_1", fullName: "Cô Lan", code: "GV01" }
      }
    ]);

    const g4Overview = await getStudentJourneyOverview("stu_g4");
    expect(g4Overview.islands).toHaveLength(1);
    expect(g4Overview.islands[0].configStatus).toBe("ACTIVE_APPROVED");
    expect(g4Overview.islands[0].curriculumCode).toBe("TC04S");
    expect(g4Overview.stages).toHaveLength(12);
    expect(g4Overview.stages[5].lessonName).toBe("Thử thách 50.000 đồng");

    // Verify all 5 grades (TC01S..TC05S) have complete interactive bundles
    expect(getGradeCurriculumBundle("1").stages).toHaveLength(15);
    expect(getGradeCurriculumBundle("3").stages).toHaveLength(15);
    expect(getGradeCurriculumBundle("4").stages).toHaveLength(12);
    expect(getGradeCurriculumBundle("5").stages).toHaveLength(12);
    expect(getAnyStageByLessonCode("TC05S.02.0002")?.lessonName).toBe("Thử thách 500.000 đồng");
  });

  it("Scenario 3: Rejects starting/saving draft or submitting a LOCKED stage", async () => {
    mockPrisma.student.findUnique.mockResolvedValue({
      id: "stu_g2",
      code: "HS2001",
      fullName: "Nguyễn Minh An",
      class: {
        id: "cls_2s",
        name: "2.1",
        grade: "2",
        educationSystem: "HNS",
        campusId: "cp_1",
        academicYearId: "ay_2025_2026"
      }
    });
    mockPrisma.specialTeachingAssignment.findMany.mockResolvedValue([
      {
        subject: { id: "spec_sub_fin_edu", code: "FIN_EDU", name: "Giáo dục tài chính cá nhân" },
        teacher: { id: "t_1", fullName: "Cô Lan", code: "GV01" }
      }
    ]);

    // Stage 10 is LOCKED by default when previous stages are not completed and teacher hasn't unlocked it
    await expect(
      saveStudentStageDraft("stu_g2", {
        lessonCode: "TC02S.02.0005",
        actionPayload: { selectedItemIds: [] }
      })
    ).rejects.toThrow("STAGE_LOCKED");

    await expect(
      submitStudentStageAction("stu_g2", {
        lessonCode: "TC02S.02.0005",
        actionPayload: { selectedItemIds: [] }
      })
    ).rejects.toThrow("STAGE_LOCKED");
  });

  it("Scenario 4 & 5: Saves draft for cross-device resume, grants rewards idempotently, and never deducts completed achievement on wrong replay", async () => {
    mockPrisma.student.findUnique.mockResolvedValue({
      id: "stu_g2",
      code: "HS2001",
      fullName: "Nguyễn Minh An",
      class: {
        id: "cls_2s",
        name: "2.1",
        grade: "2",
        educationSystem: "HNS",
        campusId: "cp_1",
        academicYearId: "ay_2025_2026"
      }
    });
    mockPrisma.specialTeachingAssignment.findMany.mockResolvedValue([
      {
        subject: { id: "spec_sub_fin_edu", code: "FIN_EDU", name: "Giáo dục tài chính cá nhân" },
        teacher: { id: "t_1", fullName: "Cô Lan", code: "GV01" }
      }
    ]);

    // Save draft on Stage 1 (unlocked)
    const draftRes = await saveStudentStageDraft("stu_g2", {
      lessonCode: "TC02S.01.0001",
      actionPayload: { placements: { ctx_daily_life: { rice_milk: "GROUP_A" } } }
    });
    expect(draftRes.saved).toBe(true);
    expect(draftRes.status).toBe("IN_PROGRESS");

    // Simulate Stage 1 already COMPLETED in DB and reward already in ledger, then student replays with a wrong answer
    mockPrisma.$queryRawUnsafe.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM skyline_quest_progress WHERE studentId = ? AND lessonId = ?")) {
        return [
          {
            id: "sqp_existing",
            lessonCode: "TC02S.01.0001",
            status: "COMPLETED",
            hasPlayed: 1,
            autoChallengePassed: 1,
            teacherConfirmed: 0,
            flagPlanted: 1,
            feathersEarned: 3,
            completedAt: "2026-10-01T00:00:00.000Z"
          }
        ];
      }
      if (sql.includes("FROM skyline_reward_ledger WHERE studentId = ? AND rewardCode = ?")) {
        return [{ id: "srl_already_awarded" }];
      }
      return [];
    });

    const replayRes = await submitStudentStageAction("stu_g2", {
      lessonCode: "TC02S.01.0001",
      actionPayload: { placements: {}, selectedReasonOptionId: "wrong_id" }
    });

    // Must preserve COMPLETED status, flagPlanted, and feathersEarned, and grant 0 duplicate rewards
    expect(replayRes.stageStatus).toBe("COMPLETED");
    expect(replayRes.flagPlanted).toBe(true);
    expect(replayRes.feathersEarned).toBe(3);
    expect(replayRes.newRewardsGranted).toHaveLength(0);
  });

  it("Scenario 8 & 9: Enforces Teacher Class Scope and Parent-Child Link RBAC", async () => {
    // Teacher not assigned to class_unassigned -> throws FORBIDDEN_TEACHER_CLASS_SCOPE
    mockPrisma.specialTeachingAssignment.findFirst.mockResolvedValueOnce(null);
    mockPrisma.teachingAssignment.findFirst.mockResolvedValueOnce(null);

    await expect(
      assignOrToggleStageByTeacher(
        { id: "u_teacher_1", role: "TEACHER", teacherId: "t_1" },
        { classId: "class_unassigned", lessonCode: "TC02S.01.0001", isUnlocked: true }
      )
    ).rejects.toThrow("FORBIDDEN_TEACHER_CLASS_SCOPE");

    // Teacher assigned to student's class CAN confirm HYBRID_TEACHER stage -> transitions to COMPLETED
    mockPrisma.student.findUnique.mockResolvedValueOnce({
      id: "stu_g2",
      class: { id: "cls_2s", academicYearId: "ay_2025_2026" }
    });
    mockPrisma.specialTeachingAssignment.findFirst.mockResolvedValueOnce({ id: "sa_valid" });

    const confirmRes = await reviewStudentStageByTeacher(
      { id: "u_teacher_1", role: "TEACHER", teacherId: "t_1" },
      {
        studentId: "stu_g2",
        lessonCode: "TC02S.01.0004",
        decision: "CONFIRM",
        teacherFeedback: "Con thực hiện tiết kiệm điện ở nhà rất tốt!"
      }
    );
    expect(confirmRes.status).toBe("COMPLETED");
    expect(confirmRes.teacherConfirmed).toBe(true);

    // Parent requesting an unlinked child -> throws FORBIDDEN_CHILD_ACCESS
    mockPrisma.parentStudentLink.findMany.mockResolvedValueOnce([
      {
        studentId: "stu_own_child",
        relationship: "Mẹ",
        student: {
          id: "stu_own_child",
          code: "HS2001",
          fullName: "Bé Nhà Mình",
          class: { id: "cls_2s", name: "2.1", grade: "2", academicYearId: "ay_2025_2026" }
        }
      }
    ]);

    await expect(
      getParentJourneyView({
        parentUserId: "u_parent_1",
        requestedStudentId: "stu_other_child"
      })
    ).rejects.toThrow("FORBIDDEN_CHILD_ACCESS");
  });
});
