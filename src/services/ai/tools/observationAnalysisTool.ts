import { prisma } from "@/lib/db";
import { AIUserContext } from "../types";
import { authorizeAIAction } from "../gateway";
import { calcMean } from "../analytics/statsEngine";

export interface ObservationAnalysisResult {
  markdown: string;
  metrics?: Record<string, any>;
}

const CRITERIA_NAMES: Record<string, string> = {
  y1: "Y1: Mục tiêu bài dạy rõ ràng, phù hợp",
  y2: "Y2: Nội dung chính xác, khoa học",
  y3: "Y3: Phương pháp dạy học tích cực",
  y4: "Y4: Thiết bị & CNTT hiệu quả",
  y5: "Y5: Tổ chức hoạt động & tương tác",
  y6: "Y6: Quản lý lớp học & không khí sư phạm",
  y7: "Y7: Phân hóa đối tượng học sinh",
  y8: "Y8: Đánh giá quá trình & phản hồi kịp thời",
  y9: "Y9: Tác phong & ngôn ngữ sư phạm chuẩn mực",
  y10: "Y10: Học sinh chủ động & hiểu bài",
  y11: "Y11: Phân bổ thời gian hợp lý"
};

export async function getTeacherObservationAnalysis(
  context: AIUserContext,
  targetTeacherId?: string,
  targetDepartmentId?: string
): Promise<ObservationAnalysisResult> {
  // 1. Permission check
  const authCheck = await authorizeAIAction(context, "getTeacherObservationAnalysis", {
    teacherId: targetTeacherId,
    departmentId: targetDepartmentId
  });

  if (!authCheck.authorized) {
    return { markdown: `⚠️ ${authCheck.reason || "Bạn không có quyền truy cập dữ liệu dự giờ này."}` };
  }

  try {
    const isSingleTeacher = !!targetTeacherId || (context.role === "TEACHER" && !context.isTTCM && !context.isTBP);
    const teacherIdToQuery = targetTeacherId || (isSingleTeacher ? context.teacherId : undefined);

    const whereEvaluation: any = {};
    if (teacherIdToQuery) {
      whereEvaluation.registration = {
        slot: { teacherId: teacherIdToQuery }
      };
    } else if (targetDepartmentId) {
      whereEvaluation.registration = {
        slot: { departmentId: targetDepartmentId }
      };
    } else if (context.role === "TTCM" && context.managedDepartmentIds?.length) {
      whereEvaluation.registration = {
        slot: { departmentId: { in: context.managedDepartmentIds } }
      };
    }

    const evaluations = await prisma.observationEvaluation.findMany({
      where: whereEvaluation,
      include: {
        registration: {
          include: {
            slot: {
              include: {
                teacher: { select: { fullName: true, teacherCode: true } },
                department: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    if (evaluations.length === 0) {
      return {
        markdown: "Hiện tại hệ thống chưa ghi nhận phiếu đánh giá dự giờ nào trong phạm vi được yêu cầu."
      };
    }

    // 2. Statistical calculation across 11 criteria
    const totalScoreList: number[] = [];
    const criteriaSums: Record<string, number[]> = {
      y1: [], y2: [], y3: [], y4: [], y5: [], y6: [], y7: [], y8: [], y9: [], y10: [], y11: []
    };

    let totCount = 0;
    let khaCount = 0;
    let datCount = 0;
    let chuaDatCount = 0;

    evaluations.forEach(ev => {
      const score = Number(ev.totalScore || 0);
      if (score > 0) {
        totalScoreList.push(score);
        if (score >= 18.0) totCount++;
        else if (score >= 14.0) khaCount++;
        else if (score >= 10.0) datCount++;
        else chuaDatCount++;
      }

      // Collect scores for individual criteria Y1-Y11
      Object.keys(criteriaSums).forEach(k => {
        const val = Number((ev as any)[k] || 0);
        if (val > 0) criteriaSums[k].push(val);
      });
    });

    const avgTotal = calcMean(totalScoreList);

    // Calculate averages per criterion
    const criteriaAverages: Array<{ key: string; name: string; avg: number }> = Object.keys(criteriaSums).map(k => ({
      key: k,
      name: CRITERIA_NAMES[k] || k.toUpperCase(),
      avg: calcMean(criteriaSums[k])
    }));

    // Sort to find top strengths and areas to develop
    const sortedCriteria = [...criteriaAverages].sort((a, b) => b.avg - a.avg);
    const topStrengths = sortedCriteria.slice(0, 3);
    const growthAreas = sortedCriteria.slice(-3).reverse();

    let md = `### 📋 Báo Cáo Phân Tích Hoạt Động Dự Giờ Sư Phạm (11 Tiêu Chí)\n`;
    md += `- **Tổng số phiếu đánh giá đã hoàn thành**: **${evaluations.length}** phiếu\n`;
    md += `- **Điểm trung bình tiết dạy**: **${avgTotal}/20.00** điểm\n`;
    md += `- **Phân loại tiết dạy**: 🌟 **Tốt**: ${totCount} | 🟢 **Khá**: ${khaCount} | 🟡 **Đạt**: ${datCount} | 🔴 **Chưa đạt**: ${chuaDatCount}\n\n`;

    md += `#### 🌟 Điểm Mạnh Nổi Bật (Tiêu chí có điểm trung bình cao nhất):\n`;
    topStrengths.forEach(s => {
      md += `- **${s.name}**: Đạt **${s.avg}** điểm\n`;
    });

    md += `\n#### 🎯 Tiêu Chí Cần Lưu Ý & Bồi Dưỡng Thêm:\n`;
    growthAreas.forEach(g => {
      md += `- **${g.name}**: Trung bình **${g.avg}** điểm\n`;
    });

    md += `\n| Tiêu chí sư phạm | Điểm trung bình | Đánh giá chung |\n`;
    md += `| :--- | :---: | :--- |\n`;
    criteriaAverages.forEach(c => {
      let remark = "Cần cố gắng";
      if (c.avg >= 1.8) remark = "Xuất sắc";
      else if (c.avg >= 1.5) remark = "Tốt";
      else if (c.avg >= 1.2) remark = "Khá";
      md += `| ${c.name} | **${c.avg}** | ${remark} |\n`;
    });

    return {
      markdown: md,
      metrics: {
        totalEvaluations: evaluations.length,
        averageTotalScore: avgTotal,
        rankDistribution: { tot: totCount, kha: khaCount, dat: datCount, chuaDat: chuaDatCount },
        topStrengths: topStrengths.map(s => s.name),
        growthAreas: growthAreas.map(g => g.name)
      }
    };
  } catch (err: any) {
    console.error("getTeacherObservationAnalysis error:", err);
    return { markdown: `⚠️ Đã xảy ra lỗi khi trích xuất dữ liệu dự giờ: ${err.message}` };
  }
}
