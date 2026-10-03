// @ts-nocheck
"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { LEVEL_TIERS, calculateLevelFromPoints } from "./utils"

// ==========================================
// 1. GET TEACHER GROWTH PROFILE
// ==========================================
export async function getTeacherGrowthProfile() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Chưa đăng nhập" };
    }

    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          { email: session.user.email || "" }
        ]
      },
      include: {
        campus: true,
        departmentRel: true
      }
    });

    if (!teacher) {
      return { success: false, error: "Không tìm thấy hồ sơ giáo viên" };
    }

    // Points Log sum
    const pointsLogs = await prisma.inspirationPointsLog.findMany({
      where: { teacherId: teacher.id }
    });
    const totalPoints = pointsLogs.reduce((acc, log) => acc + log.points, 0);
    const levelInfo = calculateLevelFromPoints(totalPoints);

    // Active Quest
    const activeQuest = await prisma.teacherChallenge.findFirst({
      where: {
        teacherId: teacher.id,
        status: { in: ["ACCEPTED", "IN_PROGRESS"] }
      },
      include: {
        challenge: true,
        observationSlot: true
      },
      orderBy: { createdAt: "desc" }
    });

    // Recent Completed Quests
    const completedQuests = await prisma.teacherChallenge.findMany({
      where: {
        teacherId: teacher.id,
        status: { in: ["COMPLETED", "RECOGNIZED"] }
      },
      include: {
        challenge: true,
        observations: {
          include: { observer: true }
        },
        wowMoments: true,
        shares: true
      },
      orderBy: { completedAt: "desc" },
      take: 10
    });

    // Streak
    const streakRecord = await prisma.teacherGrowthStreak.findUnique({
      where: { teacherId: teacher.id }
    });

    // Badges
    const badges = await prisma.teacherBadge.findMany({
      where: { teacherId: teacher.id }
    });

    // WOW moments count received
    const totalWowCount = await prisma.aiGrowthWowMoment.count({
      where: {
        teacherChallenge: { teacherId: teacher.id }
      }
    });

    return {
      success: true,
      teacher: {
        id: teacher.id,
        name: teacher.teacherName,
        code: teacher.teacherCode,
        department: teacher.departmentRel?.name || "Toàn trường",
        campus: teacher.campus?.campusName || "Sky-Line"
      },
      stats: {
        totalPoints,
        levelInfo,
        currentStreak: streakRecord?.currentStreak || 0,
        totalCompleted: completedQuests.length,
        totalWowCount
      },
      activeQuest,
      completedQuests,
      badges: badges.map(b => b.badgeCode)
    };
  } catch (error) {
    console.error("Error in getTeacherGrowthProfile:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 2. DRAW 3 MYSTIC CHALLENGE CARDS
// ==========================================
export async function drawRandomCards(subjectCode?: string, grade?: string) {
  try {
    const session = await auth();
    let excludeIds: string[] = [];

    if (session?.user?.id) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          OR: [{ userId: session.user.id }, { email: session.user.email || "" }]
        }
      });
      if (teacher) {
        const recent = await prisma.teacherChallenge.findMany({
          where: {
            teacherId: teacher.id,
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          },
          select: { challengeId: true }
        });
        excludeIds = recent.map(r => r.challengeId);
      }
    }

    let allChallenges = await prisma.aiGrowthChallenge.findMany({
      where: {
        status: "ACTIVE",
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {})
      }
    });

    // Fallback if not enough non-recent challenges
    if (allChallenges.length < 3) {
      allChallenges = await prisma.aiGrowthChallenge.findMany({
        where: { status: "ACTIVE" }
      });
    }

    // Shuffle and pick 3
    const shuffled = [...allChallenges].sort(() => 0.5 - Math.random());
    const pickedCards = shuffled.slice(0, 3);

    return {
      success: true,
      cards: pickedCards
    };
  } catch (error) {
    console.error("Error in drawRandomCards:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 3. ACCEPT CHALLENGE QUEST
// ==========================================
export async function acceptChallengeQuest(challengeId: string, slotId?: string, plannedLessonDate?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" };

    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [{ userId: session.user.id }, { email: session.user.email || "" }]
      }
    });
    if (!teacher) return { success: false, error: "Không tìm thấy giáo viên" };

    // Check if there is already an active quest
    const existingActive = await prisma.teacherChallenge.findFirst({
      where: {
        teacherId: teacher.id,
        status: { in: ["ACCEPTED", "IN_PROGRESS"] }
      }
    });

    if (existingActive) {
      return { success: false, error: "Thầy/Cô đang có một thử thách chưa hoàn thành. Hãy hoàn thành hoặc đổi thử thách trước khi nhận thử thách mới!" };
    }

    const challenge = await prisma.aiGrowthChallenge.findUnique({
      where: { id: challengeId }
    });
    if (!challenge) return { success: false, error: "Không tìm thấy thử thách" };

    // Link ObservationSlot if given
    let slotData = null;
    if (slotId) {
      slotData = await prisma.observationSlot.findUnique({
        where: { id: slotId }
      });
    }

    const quest = await prisma.teacherChallenge.create({
      data: {
        teacherId: teacher.id,
        challengeId: challenge.id,
        status: "ACCEPTED",
        observationSlotId: slotId || null,
        campusId: slotData?.campusId || teacher.campusId,
        classId: slotData?.classId || null,
        className: slotData?.className || null,
        subjectName: slotData?.subjectName || null,
        plannedLessonDate: plannedLessonDate ? new Date(plannedLessonDate) : (slotData?.date || null)
      }
    });

    // Award +10 Inspiration Points for accepting
    await prisma.inspirationPointsLog.create({
      data: {
        teacherId: teacher.id,
        points: 10,
        reason: "ACCEPT_CHALLENGE",
        sourceRefId: quest.id
      }
    });

    revalidatePath("/teacher/ai-growth");
    revalidatePath("/teacher/du-gio");

    return {
      success: true,
      quest,
      message: "Chúc mừng Thầy/Cô đã nhận thử thách mới! (+10 Inspiration Points)"
    };
  } catch (error) {
    console.error("Error in acceptChallengeQuest:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 4. ABANDON CHALLENGE QUEST
// ==========================================
export async function abandonChallengeQuest(teacherChallengeId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" };

    await prisma.teacherChallenge.update({
      where: { id: teacherChallengeId },
      data: { status: "ABANDONED" }
    });

    revalidatePath("/teacher/ai-growth");
    revalidatePath("/teacher/du-gio");
    return { success: true };
  } catch (error) {
    console.error("Error in abandonChallengeQuest:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 5. OBSERVER RECORDS CHEER KUDOS & WOW MOMENT
// ==========================================
export async function recordCheerKudos(payload: {
  teacherChallengeId: string;
  isImplemented: boolean;
  isEffective: boolean;
  shouldSpread: boolean;
  observerNote?: string;
  wowCategory?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" };

    const observerTeacher = await prisma.teacher.findFirst({
      where: {
        OR: [{ userId: session.user.id }, { email: session.user.email || "" }]
      }
    });
    if (!observerTeacher) return { success: false, error: "Không tìm thấy hồ sơ người dự" };

    const quest = await prisma.teacherChallenge.findUnique({
      where: { id: payload.teacherChallengeId },
      include: { challenge: true, teacher: true }
    });
    if (!quest) return { success: false, error: "Không tìm thấy thử thách" };

    // 1. Record or update Observation
    await prisma.challengeObservation.upsert({
      where: {
        teacherChallengeId_observerTeacherId: {
          teacherChallengeId: quest.id,
          observerTeacherId: observerTeacher.id
        }
      },
      create: {
        teacherChallengeId: quest.id,
        observerTeacherId: observerTeacher.id,
        isImplemented: payload.isImplemented,
        isEffective: payload.isEffective,
        shouldSpread: payload.shouldSpread,
        observerNote: payload.observerNote || null
      },
      update: {
        isImplemented: payload.isImplemented,
        isEffective: payload.isEffective,
        shouldSpread: payload.shouldSpread,
        observerNote: payload.observerNote || null
      }
    });

    let earnedPoints = 0;

    // If implemented, mark quest as completed
    if (payload.isImplemented) {
      const baseQuestPoints = quest.challenge.basePoints || 100;
      earnedPoints += baseQuestPoints;

      await prisma.teacherChallenge.update({
        where: { id: quest.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          recognizedAt: new Date()
        }
      });

      await prisma.inspirationPointsLog.create({
        data: {
          teacherId: quest.teacherId,
          points: baseQuestPoints,
          reason: quest.challenge.isAiChallenge ? "AI_CHALLENGE_BONUS" : "COMPLETE_CHALLENGE",
          sourceRefId: quest.id
        }
      });

      // Update Streak
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const streakRecord = await prisma.teacherGrowthStreak.findUnique({
        where: { teacherId: quest.teacherId }
      });

      if (!streakRecord) {
        await prisma.teacherGrowthStreak.create({
          data: {
            teacherId: quest.teacherId,
            currentStreak: 1,
            highestStreak: 1,
            lastActiveMonth: currentMonth,
            lastActiveYear: currentYear
          }
        });
      } else {
        const isSameMonth = streakRecord.lastActiveMonth === currentMonth && streakRecord.lastActiveYear === currentYear;
        const isNextMonth = (streakRecord.lastActiveMonth === 12 && currentMonth === 1 && currentYear === streakRecord.lastActiveYear + 1) ||
                            (currentMonth === streakRecord.lastActiveMonth + 1 && currentYear === streakRecord.lastActiveYear);

        if (!isSameMonth) {
          const newStreak = isNextMonth ? streakRecord.currentStreak + 1 : 1;
          await prisma.teacherGrowthStreak.update({
            where: { teacherId: quest.teacherId },
            data: {
              currentStreak: newStreak,
              highestStreak: Math.max(newStreak, streakRecord.highestStreak),
              lastActiveMonth: currentMonth,
              lastActiveYear: currentYear
            }
          });
        }
      }
    }

    // 2. Extra bonus for "Should Spread"
    if (payload.shouldSpread) {
      earnedPoints += 50;
      await prisma.inspirationPointsLog.create({
        data: {
          teacherId: quest.teacherId,
          points: 50,
          reason: "SPREAD_RECOMMENDED",
          sourceRefId: quest.id
        }
      });
    }

    // 3. WOW Moment
    if (payload.wowCategory) {
      earnedPoints += 30;
      await prisma.aiGrowthWowMoment.create({
        data: {
          teacherChallengeId: quest.id,
          observerTeacherId: observerTeacher.id,
          category: payload.wowCategory,
          aiCelebrationQuote: "Khoảnh khắc tuyệt vời: Người dự vinh danh điểm sáng '" + payload.wowCategory + "' trong tiết dạy!"
        }
      });

      await prisma.inspirationPointsLog.create({
        data: {
          teacherId: quest.teacherId,
          points: 30,
          reason: "WOW_MOMENT",
          sourceRefId: quest.id
        }
      });
    }

    // Update quest earnedPoints
    await prisma.teacherChallenge.update({
      where: { id: quest.id },
      data: { earnedPoints: { increment: earnedPoints } }
    });

    // Generate AI After-Class Insight asynchronously
    generateAfterClassInsight(quest.id).catch(console.error);

    revalidatePath("/teacher/ai-growth");
    revalidatePath("/teacher/du-gio");

    return {
      success: true,
      earnedPoints,
      message: "Đã gửi lời cổ vũ thành công! Đồng nghiệp nhận thêm +" + earnedPoints + " Inspiration Points."
    };
  } catch (error) {
    console.error("Error in recordCheerKudos:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 6. GENERATE AI AFTER-CLASS INSIGHT
// ==========================================
export async function generateAfterClassInsight(teacherChallengeId: string) {
  try {
    const quest = await prisma.teacherChallenge.findUnique({
      where: { id: teacherChallengeId },
      include: {
        challenge: true,
        teacher: true,
        observations: { include: { observer: true } },
        wowMoments: true
      }
    });

    if (!quest) return null;

    const obs = quest.observations[0];
    const wow = quest.wowMoments[0];
    const teacherName = quest.teacher.teacherName;
    const challengeTitle = quest.challenge.title;
    const note = obs?.observerNote || "";

    let insightText = "";
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = "Bạn là AI Đồng hành Chuyên môn (Pedagogical Mentor) của Sky-Line School.\n" +
          "Hãy viết một đoạn phản hồi ngắn (tối đa 3-4 câu) gửi riêng cho Thầy/Cô " + teacherName + " sau tiết dạy đã thực hiện thử thách: '" + challengeTitle + "'.\n" +
          "Ngữ cảnh ghi nhận từ người dự:\n" +
          "- Đã thực hiện: " + (obs?.isImplemented ? "Có" : "Đang nỗ lực") + "\n" +
          "- Có hiệu quả: " + (obs?.isEffective ? "Có" : "Bình thường") + "\n" +
          "- Nên lan tỏa: " + (obs?.shouldSpread ? "Có" : "Không") + "\n" +
          "- Khoảnh khắc WOW: " + (wow?.category || "Chưa chọn") + "\n" +
          "- Lời nhắn người dự: '" + note + "'\n\n" +
          "Quy tắc:\n" +
          "1. Giọng văn: Ấm áp, tôn trọng, ghi nhận nỗ lực sáng tạo sư phạm.\n" +
          "2. Tuyệt đối KHÔNG chấm điểm, KHÔNG đánh giá năng lực, KHÔNG so sánh.\n" +
          "3. Cấu trúc 3 ý: Ghi nhận nỗ lực -> Điểm sáng được người dự ấn tượng -> Một gợi ý nhỏ vui vẻ để thử tiếp lần sau.";

        const res = await model.generateContent(prompt);
        insightText = res.response.text();
      } catch (e) {
        console.warn("Gemini call error, using pedagogical template fallback:", e.message);
      }
    }

    // Robust pedagogical template fallback
    if (!insightText) {
      const wowNote = wow ? " Đặc biệt, khoảnh khắc '" + wow.category + "' đã để lại ấn tượng sâu sắc." : "";
      const obsNote = note ? " Người dự gửi lời chia sẻ: '" + note + "'." : "";
      insightText = "Thầy/Cô đã rất nỗ lực thử nghiệm '" + challengeTitle + "' trong tiết học hôm nay, mang lại luồng sinh khí mới mẻ cho học sinh." + wowNote + obsNote + " Lần tới, Thầy/Cô có thể thử mở rộng thêm hoạt động phản biện nhóm nhỏ để học sinh chủ động hơn nữa!";
    }

    await prisma.teacherChallenge.update({
      where: { id: quest.id },
      data: { afterClassInsight: insightText }
    });

    return insightText;
  } catch (error) {
    console.error("Error generating after-class insight:", error);
    return null;
  }
}

// ==========================================
// 7. SHARE CARD TO INSPIRATION DECK
// ==========================================
export async function shareToInspirationDeck(teacherChallengeId: string, title: string, description: string, tags?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" };

    const teacher = await prisma.teacher.findFirst({
      where: { OR: [{ userId: session.user.id }, { email: session.user.email || "" }] }
    });
    if (!teacher) return { success: false, error: "Không tìm thấy giáo viên" };

    const quest = await prisma.teacherChallenge.findUnique({
      where: { id: teacherChallengeId }
    });
    if (!quest) return { success: false, error: "Không tìm thấy thử thách" };

    const share = await prisma.inspirationShare.create({
      data: {
        teacherChallengeId: quest.id,
        teacherId: teacher.id,
        challengeId: quest.challengeId,
        title,
        description,
        tags: tags || "[]",
        isPublic: true
      }
    });

    // Award +30 IP for sharing
    await prisma.inspirationPointsLog.create({
      data: {
        teacherId: teacher.id,
        points: 30,
        reason: "SHARE_IDEA",
        sourceRefId: share.id
      }
    });

    revalidatePath("/teacher/ai-growth");
    return {
      success: true,
      message: "Chúc mừng Thầy/Cô đã lan tỏa ý tưởng thành công! (+30 Inspiration Points)"
    };
  } catch (error) {
    console.error("Error in shareToInspirationDeck:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 8. ADOPT SHARED CARD ("TÔI CŨNG MUỐN THỬ")
// ==========================================
export async function adoptSharedChallenge(shareId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" };

    const adopter = await prisma.teacher.findFirst({
      where: { OR: [{ userId: session.user.id }, { email: session.user.email || "" }] }
    });
    if (!adopter) return { success: false, error: "Không tìm thấy giáo viên" };

    const share = await prisma.inspirationShare.findUnique({
      where: { id: shareId },
      include: { teacher: true, challenge: true }
    });
    if (!share) return { success: false, error: "Không tìm thấy thẻ ý tưởng" };

    if (share.teacherId === adopter.id) {
      return { success: false, error: "Thầy/Cô không thể tự nhận ý tưởng của chính mình!" };
    }

    // Check existing active quest
    const existingActive = await prisma.teacherChallenge.findFirst({
      where: {
        teacherId: adopter.id,
        status: { in: ["ACCEPTED", "IN_PROGRESS"] }
      }
    });
    if (existingActive) {
      return { success: false, error: "Thầy/Cô đang có thử thách chưa hoàn thành. Hãy hoàn thành trước khi nhận thử thách mới!" };
    }

    // Clone quest for adopter
    const clonedQuest = await prisma.teacherChallenge.create({
      data: {
        teacherId: adopter.id,
        challengeId: share.challengeId,
        status: "ACCEPTED"
      }
    });

    // Record adoption
    await prisma.challengeAdoption.upsert({
      where: {
        shareId_adopterTeacherId: {
          shareId: share.id,
          adopterTeacherId: adopter.id
        }
      },
      create: {
        shareId: share.id,
        adopterTeacherId: adopter.id,
        clonedChallengeId: clonedQuest.id
      },
      update: {
        clonedChallengeId: clonedQuest.id
      }
    });

    // Increment adoptionCount
    await prisma.inspirationShare.update({
      where: { id: share.id },
      data: { adoptionCount: { increment: 1 } }
    });

    // Award +20 IP to original author
    await prisma.inspirationPointsLog.create({
      data: {
        teacherId: share.teacherId,
        points: 20,
        reason: "PEER_ADOPTED",
        sourceRefId: share.id
      }
    });

    // Award +10 IP to adopter
    await prisma.inspirationPointsLog.create({
      data: {
        teacherId: adopter.id,
        points: 10,
        reason: "ACCEPT_CHALLENGE",
        sourceRefId: clonedQuest.id
      }
    });

    revalidatePath("/teacher/ai-growth");
    return {
      success: true,
      message: "Đã nhận thử thách từ " + share.teacher.teacherName + "! Chúc Thầy/Cô có một tiết dạy tràn đầy cảm hứng."
    };
  } catch (error) {
    console.error("Error in adoptSharedChallenge:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 9. GET INSPIRATION BOARD (HALL OF FAME)
// ==========================================
export async function getInspirationBoardData() {
  try {
    // 1. Top Teachers by Points
    const logs = await prisma.inspirationPointsLog.groupBy({
      by: ["teacherId"],
      _sum: { points: true },
      orderBy: { _sum: { points: "desc" } },
      take: 10
    });

    const teacherIds = logs.map(l => l.teacherId);
    const teachers = await prisma.teacher.findMany({
      where: { id: { in: teacherIds } },
      select: {
        id: true,
        teacherName: true,
        campus: { select: { campusName: true } },
        departmentRel: { select: { name: true } }
      }
    });

    const teacherMap = new Map(teachers.map(t => [t.id, t]));
    const leaderboard = logs.map((l, index) => {
      const t = teacherMap.get(l.teacherId);
      const points = l._sum.points || 0;
      const level = calculateLevelFromPoints(points);
      return {
        rank: index + 1,
        teacherId: l.teacherId,
        teacherName: t?.teacherName || "Thầy/Cô Sky-Line",
        campusName: t?.campus?.campusName || "Sky-Line",
        departmentName: t?.departmentRel?.name || "Tổ chuyên môn",
        points,
        levelName: level.levelName,
        levelIcon: level.levelIcon
      };
    });

    // 2. Shared Inspiration Library (Cards)
    const sharedCards = await prisma.inspirationShare.findMany({
      where: { isPublic: true },
      include: {
        teacher: {
          select: {
            id: true,
            teacherName: true,
            campus: { select: { campusName: true } }
          }
        },
        challenge: true
      },
      orderBy: { createdAt: "desc" },
      take: 8
    });

    return {
      success: true,
      leaderboard,
      sharedCards
    };
  } catch (error) {
    console.error("Error in getInspirationBoardData:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 10. CHECK TEACHER ACTIVE CHALLENGE STATUS
// ==========================================
export async function checkTeacherActiveChallenge() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { hasActive: false };

    const teacher = await prisma.teacher.findFirst({
      where: { OR: [{ userId: session.user.id }, { email: session.user.email || "" }] }
    });
    if (!teacher) return { hasActive: false };

    const activeQuest = await prisma.teacherChallenge.findFirst({
      where: {
        teacherId: teacher.id,
        status: { in: ["ACCEPTED", "IN_PROGRESS"] }
      },
      include: { challenge: true }
    });

    return {
      hasActive: !!activeQuest,
      activeQuest
    };
  } catch (e) {
    return { hasActive: false };
  }
}
