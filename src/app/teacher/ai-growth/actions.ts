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
// 1.1 K-12 CRITERIA METADATA FOR SYNTHESIS
// ==========================================
const K12_CRITERIA_META = [
  { key: "score1", code: "Y1", name: "Mục tiêu bài dạy (YCCĐ GDPT 2018)", max: 1.5, section: "Kế hoạch & Học liệu" },
  { key: "score2", code: "Y2", name: "Thiết bị dạy học & học liệu số", max: 1.5, section: "Kế hoạch & Học liệu" },
  { key: "score3", code: "Y3", name: "Mức độ phù hợp của nội dung bài học", max: 2.0, section: "Tổ chức hoạt động học" },
  { key: "score4", code: "Y4", name: "Phân bổ thời gian hoạt động học tập", max: 1.5, section: "Tổ chức hoạt động học" },
  { key: "score5", code: "Y5", name: "Phương pháp & kỹ thuật dạy học tích cực", max: 1.5, section: "Tổ chức hoạt động học" },
  { key: "score6", code: "Y6", name: "Tổ chức, chuyển giao nhiệm vụ cho HS", max: 2.0, section: "Tổ chức hoạt động học" },
  { key: "score7", code: "Y7", name: "Hoạt động & khả năng làm chủ của học sinh", max: 3.0, section: "Hoạt động của học sinh" },
  { key: "score8", code: "Y8", name: "Ứng dụng CNTT, AI & chuyển đổi số", max: 2.0, section: "Tổ chức hoạt động học" },
  { key: "score9", code: "Y9", name: "Tương tác, đánh giá thường xuyên & phản hồi", max: 1.5, section: "Hoạt động của học sinh" },
  { key: "score10", code: "Y10", name: "Năng lực tự chủ, hợp tác & phản biện của HS", max: 2.0, section: "Hoạt động của học sinh" },
  { key: "score11", code: "Y11", name: "Không khí giờ dạy & mức độ đạt mục tiêu", max: 1.5, section: "Hoạt động của học sinh" }
];

// ==========================================
// 1.2 GET TEACHER OBSERVATION SYNTHESIS (AI PEDAGOGICAL PROFILE)
// ==========================================
export async function getTeacherObservationSynthesis(targetTeacherId?: string) {
  try {
    const session = await auth();
    let teacher = null;

    if (targetTeacherId) {
      teacher = await prisma.teacher.findUnique({
        where: { id: targetTeacherId },
        include: { campus: true, departmentRel: true }
      });
    } else if (session?.user?.id) {
      teacher = await prisma.teacher.findFirst({
        where: {
          OR: [{ userId: session.user.id }, { email: session.user.email || "" }]
        },
        include: { campus: true, departmentRel: true }
      });
    }

    if (!teacher) {
      return { success: false, error: "Không tìm thấy hồ sơ giáo viên" };
    }

    // Fetch observation slots and evaluations for this teacher
    const slots = await prisma.observationSlot.findMany({
      where: {
        teacherId: teacher.id,
        status: { notIn: ["CANCELLED"] }
      },
      include: {
        registrations: {
          include: {
            evaluation: true,
            teacher: { select: { id: true, teacherName: true } }
          }
        }
      },
      orderBy: { date: "desc" }
    });

    const evaluations = [];
    for (const slot of slots) {
      for (const reg of slot.registrations) {
        if (reg.evaluation) {
          evaluations.push({
            ...reg.evaluation,
            slotTopic: slot.topic,
            slotSubject: slot.subjectName,
            slotClass: slot.className,
            slotDate: slot.date,
            slotLevel: slot.level,
            observerName: reg.teacher?.teacherName || "Đồng nghiệp dự giờ"
          });
        }
      }
    }

    const totalEvaluatedSlots = slots.filter(s => s.registrations.some(r => r.evaluation)).length;
    const totalEvaluations = evaluations.length;

    let scoreSum = 0;
    let scoredCount = 0;
    const ratingStats = { Giỏi: 0, Khá: 0, "Trung bình": 0, "Chưa đạt": 0, Khác: 0 };
    const strengthsList = [];
    const improvementsList = [];

    // Analyze criteria scores
    const criteriaSums = Array(11).fill(0);
    const criteriaCounts = Array(11).fill(0);

    for (const ev of evaluations) {
      if (ev.totalScore !== null && ev.totalScore !== undefined) {
        scoreSum += Number(ev.totalScore);
        scoredCount++;
      }

      const rating = ev.overallRating || "";
      if (rating === "Giỏi" || rating === "Tốt") ratingStats.Giỏi++;
      else if (rating === "Khá") ratingStats.Khá++;
      else if (rating === "Trung bình" || rating === "Đạt") ratingStats["Trung bình"]++;
      else if (rating === "Chưa đạt") ratingStats["Chưa đạt"]++;
      else if (rating) ratingStats.Khác++;

      if (ev.strengths && ev.strengths.trim()) {
        strengthsList.push({
          text: ev.strengths.trim(),
          observer: ev.observerName,
          topic: ev.slotTopic,
          date: ev.slotDate ? new Date(ev.slotDate).toLocaleDateString("vi-VN") : ""
        });
      }
      if (ev.improvements && ev.improvements.trim()) {
        improvementsList.push({
          text: ev.improvements.trim(),
          observer: ev.observerName,
          topic: ev.slotTopic,
          date: ev.slotDate ? new Date(ev.slotDate).toLocaleDateString("vi-VN") : ""
        });
      }

      for (let i = 1; i <= 11; i++) {
        const val = ev[`score${i}`];
        if (val !== null && val !== undefined) {
          criteriaSums[i - 1] += Number(val);
          criteriaCounts[i - 1]++;
        }
      }
    }

    const avgScore = scoredCount > 0 ? Number((scoreSum / scoredCount).toFixed(2)) : 0;

    const criteriaStats = K12_CRITERIA_META.map((meta, idx) => {
      const count = criteriaCounts[idx];
      const avg = count > 0 ? Number((criteriaSums[idx] / count).toFixed(2)) : 0;
      const percent = meta.max > 0 ? Number(((avg / meta.max) * 100).toFixed(1)) : 0;
      return {
        code: meta.code,
        name: meta.name,
        max: meta.max,
        avg,
        percent,
        count,
        section: meta.section
      };
    });

    // Top strengths criteria & Growth opportunities
    const scoredCriteria = criteriaStats.filter(c => c.count > 0);
    const sortedCriteria = [...scoredCriteria].sort((a, b) => b.percent - a.percent);
    const topStrengthsCriteria = sortedCriteria.slice(0, 3);
    const growthCriteria = sortedCriteria.slice(-3).reverse();

    // Analyze text themes
    const textBlob = improvementsList.map(i => i.text).join(" ").toLowerCase();
    const detectedThemes = [];
    const recommendedChallengeCodes = [];

    if (/phân hóa|nâng cao|hoàn thành sớm|nhóm khá|bù đắp|gap|chậm|đối tượng/.test(textBlob) || growthCriteria.some(g => g.code === "Y7" || g.code === "Y10")) {
      detectedThemes.push({
        theme: "DẠY HỌC PHÂN HÓA",
        desc: "Thiết kế các mức độ nhiệm vụ khác nhau theo định hướng GDPT 2018 (hỗ trợ nhóm chậm, mở rộng cho nhóm hoàn thành sớm).",
        icon: "Target"
      });
      recommendedChallengeCodes.push("CHAL_3_TIER_QUESTIONS", "CHAL_ONE_TASK_THREE_LEVELS", "CHAL_EXTEND_CHALLENGE", "CHAL_GAP_SUPPORT");
    }

    if (/chủ động|thụ động|giảm thời gian gv|tự học|làm chủ|nói nhiều|thảo luận|hoạt động nhóm/.test(textBlob) || growthCriteria.some(g => g.code === "Y6" || g.code === "Y7")) {
      detectedThemes.push({
        theme: "PHÁT HUY TÍNH TÍCH CỰC & LÀM CHỦ",
        desc: "Chuyển trọng tâm từ truyền thụ một chiều sang học sinh tích cực kiến tạo và tự chủ chiếm lĩnh tri thức.",
        icon: "Users"
      });
      recommendedChallengeCodes.push("CHAL_5MIN_NO_TALK", "CHAL_THINK_PAIR_SHARE", "CHAL_STUDENT_AS_TEACHER", "CHAL_LEARNING_STATION");
    }

    if (/công nghệ|cntt|ai|slide|máy chiếu|font|hình ảnh|app|phần mềm|video|trực quan/.test(textBlob) || growthCriteria.some(g => g.code === "Y8" || g.code === "Y2")) {
      detectedThemes.push({
        theme: "ỨNG DỤNG CÔNG NGHỆ & EDTECH",
        desc: "Tích hợp công cụ số, AI hỗ trợ học liệu và tương tác trực quan nâng cao sự tập trung của học sinh.",
        icon: "Bot"
      });
      recommendedChallengeCodes.push("CHAL_AI_HOOK", "CHAL_AI_VISUAL", "CHAL_EXIT_TICKET", "CHAL_WOW_MOMENT");
    }

    if (/câu hỏi|hỏi đáp|tương tác|phản biện|tranh luận|tranh biện|suy nghĩ|thắc mắc/.test(textBlob) || growthCriteria.some(g => g.code === "Y9" || g.code === "Y5")) {
      detectedThemes.push({
        theme: "KỸ THUẬT ĐẶT CÂU HỎI & PHẢN BIỆN",
        desc: "Khai thác câu hỏi mở, kích hoạt tư duy phản biện và rèn luyện kỹ năng tranh luận học thuật.",
        icon: "Sparkles"
      });
      recommendedChallengeCodes.push("CHAL_OPEN_QUESTION", "CHAL_REVERSE_QA", "CHAL_MINI_DEBATE", "CHAL_60S_THINKING");
    }

    if (/thời gian|tiến trình|cháy giáo án|gộp|nhịp độ|phân bổ/.test(textBlob) || growthCriteria.some(g => g.code === "Y4")) {
      detectedThemes.push({
        theme: "QUẢN LÝ TIẾN TRÌNH & THỜI GIAN",
        desc: "Tối ưu hóa thời gian các hoạt động, chuyển giao nhiệm vụ dứt khoát để không bị quá tải cuối giờ.",
        icon: "Clock"
      });
      recommendedChallengeCodes.push("CHAL_60S_THINKING", "CHAL_EXIT_TICKET", "CHAL_5MIN_NO_TALK");
    }

    // Default themes if teacher has few evaluations
    if (detectedThemes.length === 0) {
      detectedThemes.push(
        { theme: "ĐỔI MỚI PHƯƠNG PHÁP GDPT 2018", desc: "Tăng cường hoạt động trải nghiệm, làm việc nhóm và phát triển năng lực tự chủ.", icon: "Sparkles" },
        { theme: "ỨNG DỤNG CÔNG NGHỆ TRONG DẠY HỌC", desc: "Sử dụng công cụ trực quan và AI để tạo cảm hứng mở đầu tiết học.", icon: "Bot" }
      );
      recommendedChallengeCodes.push("CHAL_5MIN_NO_TALK", "CHAL_AI_HOOK", "CHAL_OPEN_QUESTION", "CHAL_THINK_PAIR_SHARE");
    }

    // Construct AI Pedagogical Consultation Text
    const primaryStrength = topStrengthsCriteria[0] ? `${topStrengthsCriteria[0].name} (${topStrengthsCriteria[0].percent}%)` : "tiến trình chuẩn mực";
    const primaryGrowth = growthCriteria[0] ? `${growthCriteria[0].name}` : "tăng tính chủ động của học sinh";
    const themeTitles = detectedThemes.map(t => t.theme).join(" • ");

    const aiConsultation = {
      summary: `Thầy/Cô ${teacher.teacherName} có phong cách sư phạm vững vàng, đặc biệt nổi trội ở ${primaryStrength}. Dựa trên các phiếu dự giờ đã qua, dư địa đổi mới sáng tạo nằm ở ${primaryGrowth}.`,
      gdptOrientation: "Bám sát Chương trình GDPT 2018: Thầy/Cô được khuyến khích áp dụng dạy học phân hóa và chuyển giao quyền làm chủ cho học sinh, giúp các em tự tin trình bày và giải quyết vấn đề thực tiễn.",
      edtechOrientation: "Ứng dụng Công nghệ & AI: Tận dụng các công cụ AI và nền tảng số để thiết kế tình huống mở đầu bất ngờ, tạo câu hỏi phân tầng và thu thập phản hồi Exit Ticket nhanh chóng.",
      highlightThemes: themeTitles
    };

    return {
      success: true,
      teacher: {
        id: teacher.id,
        name: teacher.teacherName,
        code: teacher.teacherCode,
        campus: teacher.campus?.campusName || "Sky-Line",
        department: teacher.departmentRel?.name || "Tổ chuyên môn"
      },
      stats: {
        totalEvaluatedSlots,
        totalEvaluations,
        avgScore,
        ratingStats
      },
      criteriaStats,
      topStrengthsCriteria,
      growthCriteria,
      strengthsList: strengthsList.slice(0, 10),
      improvementsList: improvementsList.slice(0, 10),
      detectedThemes,
      aiConsultation,
      recommendedChallengeCodes: Array.from(new Set(recommendedChallengeCodes))
    };
  } catch (error) {
    console.error("Error in getTeacherObservationSynthesis:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 2. DRAW SMART PERSONALIZED CHALLENGE CARDS
// ==========================================
export async function drawSmartPersonalizedCards(subjectCode?: string, grade?: string) {
  try {
    const session = await auth();
    let teacher = null;
    let excludeIds = [];

    if (session?.user?.id) {
      teacher = await prisma.teacher.findFirst({
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

    // Get Teacher's Observation Synthesis to extract growth areas
    let synthesis = null;
    if (teacher) {
      synthesis = await getTeacherObservationSynthesis(teacher.id);
    }

    const recommendedCodes = synthesis?.success && synthesis.recommendedChallengeCodes?.length > 0
      ? synthesis.recommendedChallengeCodes
      : [];

    let recommendedChallenges = [];
    if (recommendedCodes.length > 0) {
      recommendedChallenges = await prisma.aiGrowthChallenge.findMany({
        where: {
          status: "ACTIVE",
          code: { in: recommendedCodes },
          ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {})
        }
      });
    }

    let allActiveChallenges = await prisma.aiGrowthChallenge.findMany({
      where: {
        status: "ACTIVE",
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {})
      }
    });

    if (allActiveChallenges.length < 3) {
      allActiveChallenges = await prisma.aiGrowthChallenge.findMany({
        where: { status: "ACTIVE" }
      });
    }

    // Pick 3 diverse cards: prioritize 1-2 recommended + 1 AI/Creative card
    const pickedMap = new Map();

    // 1. First priority: Recommended from teacher synthesis
    const shuffledRecommended = [...recommendedChallenges].sort(() => 0.5 - Math.random());
    for (const c of shuffledRecommended) {
      if (pickedMap.size >= 2) break;
      pickedMap.set(c.id, {
        ...c,
        isPersonalized: true,
        recommendationReason: `💡 Dựa trên góp ý dự giờ gần đây của Thầy/Cô và định hướng GDPT 2018, thử thách này giúp Thầy/Cô hoàn thiện kỹ năng "${c.pedagogicalGoal}".`
      });
    }

    // 2. Fill remaining cards from pool
    const shuffledAll = [...allActiveChallenges].sort(() => 0.5 - Math.random());
    for (const c of shuffledAll) {
      if (pickedMap.size >= 3) break;
      if (!pickedMap.has(c.id)) {
        pickedMap.set(c.id, {
          ...c,
          isPersonalized: false,
          recommendationReason: `✨ Gợi ý đổi mới phương pháp và ứng dụng công nghệ: "${c.pedagogicalGoal}".`
        });
      }
    }

    const cards = Array.from(pickedMap.values()).map(c => ({
      ...c,
      isSubCriterion: true,
      subCriterionNotice: "🌟 Tiêu chí phụ tự nguyện - Tích lũy Điểm Cảm Hứng (Hoàn toàn không tính vào điểm số đánh giá 20/20 của tiết dạy)"
    }));

    return {
      success: true,
      cards,
      synthesisInfo: synthesis?.success ? {
        topStrengths: synthesis.topStrengthsCriteria?.map(s => s.name),
        growthAreas: synthesis.growthCriteria?.map(g => g.name),
        themes: synthesis.detectedThemes?.map(t => t.theme)
      } : null
    };
  } catch (error) {
    console.error("Error in drawSmartPersonalizedCards:", error);
    return { success: false, error: error.message };
  }
}

// Keep backward-compatible drawRandomCards calling drawSmartPersonalizedCards
export async function drawRandomCards(subjectCode?: string, grade?: string) {
  return drawSmartPersonalizedCards(subjectCode, grade);
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

    // Fetch observation evaluations for this slot if linked
    let evalStrengths = "";
    let evalImprovements = "";
    let evalRating = "";
    if (quest.observationSlotId) {
      try {
        const evals = await prisma.observationEvaluation.findMany({
          where: { slotId: quest.observationSlotId },
          take: 3
        });
        if (evals.length > 0) {
          evalStrengths = evals.map(e => e.strengths).filter(Boolean).join(". ");
          evalImprovements = evals.map(e => e.improvements).filter(Boolean).join(". ");
          evalRating = evals[0].overallRating || "";
        }
      } catch (err) {
        console.warn("Could not load slot evaluations for insight:", err);
      }
    }

    let insightText = "";
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = "Bạn là AI Đồng hành Chuyên môn (Pedagogical Mentor) của Sky-Line School.\n" +
          "Hãy viết một đoạn phản hồi ngắn (tối đa 3-4 câu) gửi riêng cho Thầy/Cô " + teacherName + " sau tiết dạy đã thực hiện thử thách đổi mới: '" + challengeTitle + "'.\n" +
          "Ngữ cảnh từ người dự giờ:\n" +
          "- Thử thách đã thực hiện: " + (obs?.isImplemented ? "Có" : "Đang nỗ lực") + "\n" +
          "- Đánh giá hiệu quả: " + (obs?.isEffective ? "Có hiệu quả cao" : "Bình thường") + "\n" +
          "- Khuyến nghị lan tỏa: " + (obs?.shouldSpread ? "Nên nhân rộng trong TCM" : "Chưa") + "\n" +
          "- Điểm sáng WOW: " + (wow?.category || "Chưa chọn") + "\n" +
          "- Lời nhắn từ người dự: '" + note + "'\n" +
          (evalStrengths ? "- Điểm mạnh tiết dạy: '" + evalStrengths + "'\n" : "") +
          (evalImprovements ? "- Góp ý chuyên môn: '" + evalImprovements + "'\n" : "") +
          (evalRating ? "- Xếp loại tiết dạy: " + evalRating + "\n" : "") +
          "\nQuy tắc:\n" +
          "1. Giọng văn: Ấm áp, trân trọng, ghi nhận tinh thần dám đổi mới sáng tạo sư phạm.\n" +
          "2. Thử thách là tiêu chí phụ khuyến khích giáo viên, tuyệt đối KHÔNG trừ điểm hay chỉ trích.\n" +
          "3. Cấu trúc 3 ý: Ghi nhận nỗ lực thử nghiệm -> Kết nối với điểm sáng được người dự ấn tượng -> Một gợi ý nhỏ nhẹ nhàng cho tiết dạy tiếp theo theo định hướng GDPT 2018.";

        const res = await model.generateContent(prompt);
        insightText = res.response.text();
      } catch (e) {
        console.warn("Gemini call error, using pedagogical template fallback:", e.message);
      }
    }

    // Robust pedagogical template fallback
    if (!insightText) {
      const wowNote = wow ? ` Điểm sáng đặc biệt: '${wow.category}' đã để lại ấn tượng sâu sắc cho người dự.` : "";
      const obsNote = note ? ` Người dự nhắn nhủ: '${note}'.` : "";
      const strengthPart = evalStrengths ? ` Tiết dạy ghi nhận nhiều ưu điểm: ${evalStrengths.slice(0, 120)}...` : "";
      insightText = `Thầy/Cô đã rất nỗ lực thử nghiệm thử thách '${challengeTitle}', mang lại luồng sinh khí mới mẻ cho học sinh.${strengthPart}${wowNote}${obsNote} Ở tiết tới, Thầy/Cô có thể tiếp tục phát huy tinh thần làm chủ của học sinh theo định hướng GDPT 2018!`;
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


// ==========================================
// 11. GET TEACHER'S UPCOMING OBSERVATION SLOTS
// ==========================================
export async function getTeacherUpcomingSlots() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" };

    const teacher = await prisma.teacher.findFirst({
      where: { OR: [{ userId: session.user.id }, { email: session.user.email || "" }] }
    });
    if (!teacher) return { success: false, error: "Không tìm thấy hồ sơ giáo viên" };

    const slots = await prisma.observationSlot.findMany({
      where: {
        teacherId: teacher.id,
        status: { notIn: ["CANCELLED"] }
      },
      include: {
        campus: true,
        registrations: {
          select: { id: true, observerTeacherId: true }
        }
      },
      orderBy: { date: "desc" },
      take: 25
    });

    return {
      success: true,
      slots: slots.map(s => ({
        id: s.id,
        topic: s.topic,
        subjectName: s.subjectName,
        className: s.className,
        date: s.date ? s.date.toISOString() : null,
        period: s.period,
        campusName: s.campus?.campusName || "",
        status: s.status,
        observerCount: s.registrations.length
      }))
    };
  } catch (error) {
    console.error("Error in getTeacherUpcomingSlots:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 12. LINK CHALLENGE TO OBSERVATION SLOT
// ==========================================
export async function linkChallengeToSlot(teacherChallengeId: string, slotId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" };

    const teacher = await prisma.teacher.findFirst({
      where: { OR: [{ userId: session.user.id }, { email: session.user.email || "" }] }
    });
    if (!teacher) return { success: false, error: "Không tìm thấy giáo viên" };

    const slot = await prisma.observationSlot.findUnique({
      where: { id: slotId }
    });
    if (!slot) return { success: false, error: "Không tìm thấy tiết dạy dự giờ" };

    const updated = await prisma.teacherChallenge.update({
      where: { id: teacherChallengeId },
      data: {
        observationSlotId: slot.id,
        campusId: slot.campusId || teacher.campusId,
        classId: slot.classId || null,
        className: slot.className || null,
        subjectName: slot.subjectName || null,
        plannedLessonDate: slot.date || null
      },
      include: {
        challenge: true,
        observationSlot: true
      }
    });

    revalidatePath("/teacher/ai-growth");
    revalidatePath("/teacher/du-gio");

    return {
      success: true,
      quest: updated,
      message: `Đã gắn mục tiêu vào tiết dạy "${slot.topic}" thành công!`
    };
  } catch (error) {
    console.error("Error in linkChallengeToSlot:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 13. UNLINK CHALLENGE FROM SLOT
// ==========================================
export async function unlinkChallengeFromSlot(teacherChallengeId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" };

    const updated = await prisma.teacherChallenge.update({
      where: { id: teacherChallengeId },
      data: {
        observationSlotId: null
      },
      include: {
        challenge: true
      }
    });

    revalidatePath("/teacher/ai-growth");
    revalidatePath("/teacher/du-gio");

    return {
      success: true,
      quest: updated,
      message: "Đã gỡ gắn tiết dạy thành công!"
    };
  } catch (error) {
    console.error("Error in unlinkChallengeFromSlot:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 14. GET SLOT CHALLENGE INFO FOR EVALUATION MODAL
// ==========================================
export async function getSlotChallengeInfo(slotId: string, teacherId?: string) {
  try {
    const session = await auth();
    const observerTeacher = session?.user?.id
      ? await prisma.teacher.findFirst({
          where: { OR: [{ userId: session.user.id }, { email: session.user.email || "" }] }
        })
      : null;

    let quest = await prisma.teacherChallenge.findFirst({
      where: {
        observationSlotId: slotId,
        status: { in: ["ACCEPTED", "IN_PROGRESS", "COMPLETED"] }
      },
      include: {
        challenge: true,
        observations: {
          include: {
            observer: {
              select: { id: true, teacherName: true }
            }
          }
        },
        wowMoments: {
          include: {
            observer: {
              select: { id: true, teacherName: true }
            }
          }
        }
      }
    });

    if (!quest && teacherId) {
      quest = await prisma.teacherChallenge.findFirst({
        where: {
          teacherId: teacherId,
          status: { in: ["ACCEPTED", "IN_PROGRESS"] }
        },
        include: {
          challenge: true,
          observations: {
            include: {
              observer: {
                select: { id: true, teacherName: true }
              }
            }
          },
          wowMoments: {
            include: {
              observer: {
                select: { id: true, teacherName: true }
              }
            }
          }
        }
      });
    }

    if (!quest) {
      return { success: true, hasChallenge: false };
    }

    const myCheer = observerTeacher
      ? quest.observations.find(o => o.observerTeacherId === observerTeacher.id)
      : null;

    return {
      success: true,
      hasChallenge: true,
      quest,
      myCheer: myCheer || null,
      cheerCount: quest.observations.length,
      wowMoments: quest.wowMoments
    };
  } catch (error) {
    console.error("Error in getSlotChallengeInfo:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 15. GET ALL CHALLENGES TRACKING (LEADERBOARD & TRACKING BOARD)
// ==========================================
export async function getAllChallengesTracking(params?: {
  campusId?: string;
  departmentId?: string;
  status?: string;
  search?: string;
}) {
  try {
    const where: any = {};
    if (params?.status && params.status !== "ALL") {
      where.status = params.status;
    }
    if (params?.campusId && params.campusId !== "ALL") {
      where.campusId = params.campusId;
    }

    const challenges = await prisma.teacherChallenge.findMany({
      where,
      include: {
        teacher: {
          include: {
            campus: true,
            departmentRel: true
          }
        },
        challenge: true,
        observationSlot: true,
        observations: {
          include: {
            observer: {
              select: { id: true, teacherName: true }
            }
          }
        },
        wowMoments: {
          include: {
            observer: {
              select: { id: true, teacherName: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    let filtered = challenges;
    if (params?.departmentId && params.departmentId !== "ALL") {
      filtered = filtered.filter(c => c.teacher?.departmentId === params.departmentId || c.teacher?.departmentRel?.id === params.departmentId);
    }
    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(c =>
        c.teacher?.teacherName?.toLowerCase().includes(q) ||
        c.teacher?.teacherCode?.toLowerCase().includes(q) ||
        c.challenge?.title?.toLowerCase().includes(q) ||
        c.subjectName?.toLowerCase().includes(q) ||
        c.className?.toLowerCase().includes(q)
      );
    }

    const records = filtered.map(c => {
      const isImplemented = c.observations.some(o => o.isImplemented);
      const isEffective = c.observations.some(o => o.isEffective);
      const shouldSpread = c.observations.some(o => o.shouldSpread);
      const observers = c.observations.map(o => o.observer?.teacherName).filter(Boolean);

      return {
        id: c.id,
        teacherId: c.teacherId,
        teacherName: c.teacher?.teacherName || "Giáo viên",
        teacherCode: c.teacher?.teacherCode || "",
        campusName: c.teacher?.campus?.campusName || "Sky-Line",
        departmentName: c.teacher?.departmentRel?.name || "Tổ chuyên môn",
        slotId: c.observationSlotId,
        topic: c.observationSlot?.topic || c.challenge.title,
        subjectName: c.subjectName || c.observationSlot?.subjectName || "Môn học",
        className: c.className || c.observationSlot?.className || "Lớp",
        lessonDate: c.plannedLessonDate ? c.plannedLessonDate.toISOString() : c.observationSlot?.date ? c.observationSlot.date.toISOString() : null,
        challenge: {
          id: c.challenge.id,
          code: c.challenge.code,
          title: c.challenge.title,
          category: c.challenge.category,
          rarityTier: c.challenge.rarityTier,
          pedagogicalGoal: c.challenge.pedagogicalGoal,
          basePoints: c.challenge.basePoints,
          isAiChallenge: c.challenge.isAiChallenge
        },
        status: c.status,
        earnedPoints: c.earnedPoints || (c.status === "COMPLETED" ? c.challenge.basePoints : 0),
        isImplemented,
        isEffective,
        shouldSpread,
        observerCount: c.observations.length,
        observers,
        wowMoments: c.wowMoments.map(w => ({
          category: w.category,
          observerName: w.observer?.teacherName
        })),
        afterClassInsight: c.afterClassInsight,
        completedAt: c.completedAt ? c.completedAt.toISOString() : null,
        createdAt: c.createdAt.toISOString()
      };
    });

    return {
      success: true,
      records,
      totalCount: records.length
    };
  } catch (error) {
    console.error("Error in getAllChallengesTracking:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 16. GET SCHOOL GAMIFICATION STATS & HALL OF FAME
// ==========================================
export async function getSchoolGamificationStats(campusId?: string) {
  try {
    // 1. Leaderboard: Top Teachers by IP
    const logs = await prisma.inspirationPointsLog.groupBy({
      by: ["teacherId"],
      _sum: { points: true },
      orderBy: { _sum: { points: "desc" } },
      take: 10
    });

    const teacherIds = logs.map(l => l.teacherId);
    const teachers = await prisma.teacher.findMany({
      where: { id: { in: teacherIds } },
      include: { campus: true, departmentRel: true }
    });
    const teacherMap = new Map(teachers.map(t => [t.id, t]));

    const topTeachers = logs.map((l, idx) => {
      const t = teacherMap.get(l.teacherId);
      const points = l._sum.points || 0;
      const level = calculateLevelFromPoints(points);
      return {
        rank: idx + 1,
        teacherId: l.teacherId,
        teacherName: t?.teacherName || "Thầy/Cô Sky-Line",
        campusName: t?.campus?.campusName || "Sky-Line",
        departmentName: t?.departmentRel?.name || "Tổ chuyên môn",
        points,
        levelName: level.levelName,
        levelIcon: level.levelIcon
      };
    });

    // 2. Top WOW Ambassadors
    const wowGroup = await prisma.aiGrowthWowMoment.groupBy({
      by: ["teacherChallengeId"],
      _count: { id: true }
    });

    const wowChallengeIds = wowGroup.map(w => w.teacherChallengeId);
    const wowQuests = await prisma.teacherChallenge.findMany({
      where: { id: { in: wowChallengeIds } },
      include: { teacher: { include: { campus: true } } }
    });

    const teacherWowMap = new Map();
    for (const q of wowQuests) {
      const tid = q.teacherId;
      const count = (teacherWowMap.get(tid)?.count || 0) + 1;
      teacherWowMap.set(tid, {
        teacherName: q.teacher?.teacherName || "Giáo viên",
        campusName: q.teacher?.campus?.campusName || "Sky-Line",
        count
      });
    }

    const topWowTeachers = Array.from(teacherWowMap.entries())
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 3. Overall School Metrics
    const totalChallengesAttempted = await prisma.teacherChallenge.count();
    const totalCompleted = await prisma.teacherChallenge.count({
      where: { status: { in: ["COMPLETED", "RECOGNIZED"] } }
    });
    const totalWowMoments = await prisma.aiGrowthWowMoment.count();
    const allLogs = await prisma.inspirationPointsLog.aggregate({
      _sum: { points: true }
    });
    const totalPointsAwarded = allLogs._sum.points || 0;

    return {
      success: true,
      topTeachers,
      topWowTeachers,
      metrics: {
        totalChallengesAttempted,
        totalCompleted,
        totalWowMoments,
        totalPointsAwarded
      }
    };
  } catch (error) {
    console.error("Error in getSchoolGamificationStats:", error);
    return { success: false, error: error.message };
  }
}

