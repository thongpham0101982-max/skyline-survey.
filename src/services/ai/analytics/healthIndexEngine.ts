import { prisma } from "@/lib/db";

export interface StudentHealthBreakdown {
  studentId: string;
  studentName: string;
  studentCode: string;
  className: string;
  hhiScore: number; // 0 - 100
  tier: "GREEN" | "YELLOW" | "RED";
  tierLabel: string;
  components: {
    academicScore: number;  // 0 - 100 (weight: 40%)
    gapScore: number;       // 0 - 100 (weight: 25%)
    barrierScore: number;   // 0 - 100 (weight: 20%)
    wellbeingScore: number; // 0 - 100 (weight: 15%)
  };
  insights: {
    strengths: string[];
    risks: string[];
    recommendedIntervention: string;
  };
  rawMetrics: {
    avgScore: number | null;
    belowBenchmarkCount: number;
    completedGoalsRatio: number;
    resolvedBarriersRatio: number;
    pendingUrgentHelpCount: number;
  };
}

export interface ClassHealthMatrix {
  classId: string;
  className: string;
  totalStudents: number;
  averageHHI: number;
  distribution: {
    greenCount: number;
    greenPercent: number;
    yellowCount: number;
    yellowPercent: number;
    redCount: number;
    redPercent: number;
  };
  students: StudentHealthBreakdown[];
  criticalAlerts: string[];
}

/**
 * Tính toán Chỉ số Sức khỏe Học tập Toàn diện (Holistic Health Index - HHI) cho 1 học sinh
 * Thang điểm 0 - 100 dựa trên 4 trụ cột thực tế trong cơ sở dữ liệu SSM Sky-Line.
 */
export async function calculateStudentHealthIndex(
  studentId: string,
  academicYearId?: string
): Promise<StudentHealthBreakdown | null> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: true,
      subjectGradeEntries: {
        where: academicYearId ? { academicYearId } : undefined,
        include: { subject: true }
      },
      goals: {
        where: academicYearId ? { academicYearId } : undefined,
        include: { unlocks: true }
      },
      reflections: {
        where: academicYearId ? { academicYearId } : undefined,
        orderBy: { createdAt: "desc" },
        take: 3
      },
      helpRequests: {
        where: academicYearId ? { academicYearId } : undefined,
        orderBy: { createdAt: "desc" },
        take: 5
      }
    }
  });

  if (!student) return null;

  // 1. Academic Score (Trọng số 40%)
  const validScores: number[] = [];
  let belowBenchmarkCount = 0;
  const benchmarkThreshold = 7.0; // Chuẩn định mức chung Sky-Line

  for (const g of student.subjectGradeEntries) {
    if (typeof g.compositeScore === "number" && !isNaN(g.compositeScore)) {
      validScores.push(g.compositeScore);
      if (g.compositeScore < benchmarkThreshold) {
        belowBenchmarkCount++;
      }
    }
  }

  let avgScore: number | null = null;
  let academicScore = 75; // Điểm cơ sở nếu chưa có điểm

  if (validScores.length > 0) {
    avgScore = parseFloat((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2));
    // Quy đổi điểm 10 sang thang 100
    let baseAcademic = (avgScore / 10) * 100;
    // Phạt 5 điểm cho mỗi môn dưới benchmark
    baseAcademic -= belowBenchmarkCount * 5;
    academicScore = Math.max(0, Math.min(100, Math.round(baseAcademic)));
  }

  // 2. GAP & Goal Achievement Score (Trọng số 25%)
  let gapScore = 80;
  let completedGoalsCount = 0;
  const totalGoals = student.goals.length;

  if (totalGoals > 0) {
    for (const goal of student.goals) {
      if (goal.status === "COMPLETED" || goal.achievementLevel === "DAT") {
        completedGoalsCount++;
      } else if (goal.achievementLevel === "CHUA_DAT") {
        gapScore -= 10;
      }
    }
    const goalRatio = completedGoalsCount / totalGoals;
    gapScore = Math.max(20, Math.min(100, Math.round(goalRatio * 60 + 40)));
  }
  const completedGoalsRatio = totalGoals > 0 ? parseFloat((completedGoalsCount / totalGoals).toFixed(2)) : 1;

  // 3. Barriers 7-day Action Progress Score (Trọng số 20%)
  let allUnlocks: any[] = [];
  student.goals.forEach(g => {
    if (g.unlocks && g.unlocks.length > 0) {
      allUnlocks.push(...g.unlocks);
    }
  });

  let barrierScore = 85;
  let resolvedBarriersCount = 0;
  const totalBarriers = allUnlocks.length;

  if (totalBarriers > 0) {
    for (const u of allUnlocks) {
      if (u.status === "COMPLETED" || u.supportStatus === "RESOLVED") {
        resolvedBarriersCount++;
      } else if (u.status === "IN_PROGRESS" && new Date(u.endDate).getTime() < Date.now()) {
        // Quá hạn 7 ngày chưa hoàn thành
        barrierScore -= 15;
      }
    }
    barrierScore = Math.max(10, Math.min(100, Math.round((resolvedBarriersCount / totalBarriers) * 80 + 20)));
  }
  const resolvedBarriersRatio = totalBarriers > 0 ? parseFloat((resolvedBarriersCount / totalBarriers).toFixed(2)) : 1;

  // 4. Wellbeing & Help Interaction Score (Trọng số 15%)
  let wellbeingScore = 90;
  let pendingUrgentHelpCount = 0;

  for (const hr of student.helpRequests) {
    if (hr.status === "PENDING" && (hr.urgency === "HIGH" || hr.urgency === "URGENT")) {
      pendingUrgentHelpCount++;
      wellbeingScore -= 25; // Khẩn cấp chưa xử lý trừ mạnh
    } else if (hr.status === "PENDING") {
      wellbeingScore -= 10;
    }
  }

  for (const ref of student.reflections) {
    if (ref.feeling === "STRESSED") {
      wellbeingScore -= 15;
    } else if (ref.feeling === "HAPPY" || ref.feeling === "EXCITED") {
      wellbeingScore += 5;
    }
  }
  wellbeingScore = Math.max(0, Math.min(100, Math.round(wellbeingScore)));

  // TỔNG HỢP CHỈ SỐ HHI THEO 4 TRỌNG SỐ: 40% - 25% - 20% - 15%
  const hhiScore = Math.round(
    academicScore * 0.40 +
    gapScore * 0.25 +
    barrierScore * 0.20 +
    wellbeingScore * 0.15
  );

  // Phân loại Tier
  let tier: "GREEN" | "YELLOW" | "RED" = "GREEN";
  let tierLabel = "🟢 Xanh (Tự chủ & Duy trì tốt)";
  if (hhiScore < 50) {
    tier = "RED";
    tierLabel = "🔴 Đỏ (Cảnh báo Nguy cơ Cao - Cần can thiệp khẩn)";
  } else if (hhiScore < 80) {
    tier = "YELLOW";
    tierLabel = "🟡 Vàng (Cần Lưu tâm & Theo dõi sát)";
  }

  // Tự động phân tích điểm mạnh, rủi ro và phác đồ
  const strengths: string[] = [];
  const risks: string[] = [];
  let recommendedIntervention = "";

  if (avgScore !== null && avgScore >= 8.0) {
    strengths.push(`Học lực vững chắc (ĐTB: ${avgScore}), vượt chuẩn chất lượng.`);
  }
  if (completedGoalsRatio >= 0.75) {
    strengths.push("Khả năng bám sát mục tiêu học tập (SMART) rất tốt.");
  }
  if (resolvedBarriersRatio >= 0.8) {
    strengths.push("Chủ động thực thi các hành động gỡ rào cản 7 ngày đúng hạn.");
  }

  if (belowBenchmarkCount > 0) {
    risks.push(`Có ${belowBenchmarkCount} môn học dưới chuẩn Benchmark (${benchmarkThreshold}).`);
  }
  if (pendingUrgentHelpCount > 0) {
    risks.push(`Đang có ${pendingUrgentHelpCount} yêu cầu trợ giúp khẩn cấp chưa được xử lý.`);
  }
  if (totalBarriers > 0 && resolvedBarriersRatio < 0.5) {
    risks.push("Nhiều rào cản hành động 7 ngày đang tồn đọng quá hạn.");
  }

  if (tier === "RED") {
    recommendedIntervention = `⚡ **Phác đồ can thiệp cấp độ 1 (Khẩn cấp)**: GVCN cần tổ chức buổi cố vấn 1:1 trong vòng 48h, rà soát ngay môn bị hổng điểm và liên hệ gia đình để cùng giám sát kế hoạch gỡ khó 7 ngày.`;
  } else if (tier === "YELLOW") {
    recommendedIntervention = `⚠️ **Phác đồ can thiệp cấp độ 2 (Đồng hành)**: Giáo viên bộ môn hỗ trợ kèm cặp bài tập bổ trợ cho các môn dưới benchmark; đôn đốc hoàn tất các hành động nhỏ trong tuần tới.`;
  } else {
    recommendedIntervention = `✨ **Phác đồ phát triển (Khuyến khích)**: Tiếp tục duy trì phong độ; khuyến khích học sinh đăng ký các mục tiêu nâng cao hoặc tham gia dự án trải nghiệm để phát huy tối đa năng lực.`;
  }

  return {
    studentId: student.id,
    studentName: student.studentName,
    studentCode: student.studentCode,
    className: student.class?.className || "Chưa rõ",
    hhiScore,
    tier,
    tierLabel,
    components: {
      academicScore,
      gapScore,
      barrierScore,
      wellbeingScore
    },
    insights: {
      strengths,
      risks,
      recommendedIntervention
    },
    rawMetrics: {
      avgScore,
      belowBenchmarkCount,
      completedGoalsRatio,
      resolvedBarriersRatio,
      pendingUrgentHelpCount
    }
  };
}

/**
 * Tính toán Ma trận Sức khỏe Học tập cho toàn bộ học sinh trong 1 Lớp
 */
export async function calculateClassHealthMatrix(
  classId: string,
  academicYearId?: string
): Promise<ClassHealthMatrix | null> {
  const targetClass = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      students: {
        where: { status: "ACTIVE" },
        select: { id: true }
      }
    }
  });

  if (!targetClass) return null;

  const studentBreakdowns: StudentHealthBreakdown[] = [];

  for (const st of targetClass.students) {
    const res = await calculateStudentHealthIndex(st.id, academicYearId);
    if (res) {
      studentBreakdowns.push(res);
    }
  }

  // Sắp xếp theo HHI từ thấp đến cao (ưu tiên học sinh có nguy cơ cao nhất lên đầu)
  studentBreakdowns.sort((a, b) => a.hhiScore - b.hhiScore);

  const total = studentBreakdowns.length;
  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;
  let totalScore = 0;

  for (const s of studentBreakdowns) {
    totalScore += s.hhiScore;
    if (s.tier === "GREEN") greenCount++;
    else if (s.tier === "YELLOW") yellowCount++;
    else redCount++;
  }

  const averageHHI = total > 0 ? Math.round(totalScore / total) : 0;
  const criticalAlerts: string[] = [];

  if (redCount > 0) {
    criticalAlerts.push(`🚨 Có ${redCount} học sinh (${Math.round((redCount / total) * 100)}%) thuộc diện ĐỎ (Nguy cơ cao cần can thiệp gấp).`);
  }
  if (yellowCount > 0) {
    criticalAlerts.push(`⚠️ Có ${yellowCount} học sinh thuộc diện VÀNG cần giám sát tiến độ gỡ khó.`);
  }

  return {
    classId: targetClass.id,
    className: targetClass.className,
    totalStudents: total,
    averageHHI,
    distribution: {
      greenCount,
      greenPercent: total > 0 ? Math.round((greenCount / total) * 100) : 0,
      yellowCount,
      yellowPercent: total > 0 ? Math.round((yellowCount / total) * 100) : 0,
      redCount,
      redPercent: total > 0 ? Math.round((redCount / total) * 100) : 0
    },
    students: studentBreakdowns,
    criticalAlerts
  };
}
