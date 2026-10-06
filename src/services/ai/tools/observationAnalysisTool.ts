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
                teacher: { select: { teacherName: true, teacherCode: true, departmentId: true } }
              }
            }
          }
        }
      },
      orderBy: { submittedAt: "desc" }
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

/**
 * AI Hỗ trợ Phân tích & Gợi ý Dự giờ kết hợp nội dung Sách giáo khoa (Mục XV)
 * Đối chiếu nội dung tiết học với chuẩn SGK, gợi ý sư phạm mà không thay đổi điểm số.
 */
export async function getObservationSlotPedagogicalAiAdvice(slotId: string): Promise<{
  markdown: string;
  textbookReference?: {
    bookTitle: string;
    chapter: string;
    lesson: string;
    pageStart: number;
    pageEnd: number;
  };
}> {
  try {
    const slot = await prisma.observationSlot.findUnique({
      where: { id: slotId },
      include: {
        teacher: { select: { teacherName: true, position: true } }
      }
    });

    if (!slot) {
      return { markdown: "Không tìm thấy thông tin phiên dự giờ." };
    }

    // Tìm SGK tương ứng môn và khối
    let textbook = null;
    if (slot.subjectId) {
      textbook = await prisma.textbook.findFirst({
        where: {
          subjectId: slot.subjectId,
          grade: slot.grade,
          processingStatus: "READY"
        },
        include: {
          series: true,
          chapters: { include: { lessons: true } }
        }
      });
    }

    let lessonMatch = null;
    let chapterMatch = null;

    if (textbook) {
      const topicLower = (slot.topic || "").toLowerCase();
      for (const ch of textbook.chapters) {
        for (const les of ch.lessons) {
          if (topicLower.includes(les.title.toLowerCase()) || les.title.toLowerCase().includes(topicLower)) {
            lessonMatch = les;
            chapterMatch = ch;
            break;
          }
        }
        if (lessonMatch) break;
      }
      if (!lessonMatch && textbook.chapters[0]?.lessons[0]) {
        chapterMatch = textbook.chapters[0];
        lessonMatch = textbook.chapters[0].lessons[0];
      }
    }

    let md = `### 💡 AI Gợi Ý Sư Phạm & Đối Chiếu SGK cho Tiết Dự Giờ\n\n`;
    md += `- **Giáo viên giảng dạy**: ${slot.teacher?.teacherName || "Giáo viên"}\n`;
    md += `- **Môn học**: ${slot.subjectName} | **Khối lớp**: ${slot.grade} | **Lớp**: ${slot.className || "-"}\n`;
    md += `- **Chủ đề bài dạy**: **${slot.topic || "Tiết dạy theo kế hoạch"}**\n\n`;

    if (textbook && lessonMatch) {
      md += `#### 📖 Đối chiếu Nội Dung Sách Giáo Khoa:\n`;
      md += `- **Sách tham chiếu**: ${textbook.title} (${textbook.series.name})\n`;
      md += `- **Cấu trúc**: ${chapterMatch?.chapterNumber}: ${chapterMatch?.title} • **${lessonMatch.lessonNumber}: ${lessonMatch.title}**\n`;
      md += `- **Phạm vi trang**: Từ **Trang ${lessonMatch.pageStart} đến Trang ${lessonMatch.pageEnd}**\n`;
      if (lessonMatch.summary) {
        md += `- **Kiến thức cốt lõi SGK**: ${lessonMatch.summary}\n`;
      }
      md += `\n`;
    }

    md += `#### 🎯 Gợi Ý Điểm Cần Lưu Ý Khi Dự Giờ:\n`;
    md += `1. **Bám sát mục tiêu bài học (Y1 & Y2)**: Kiểm tra học sinh có nắm chắc các khái niệm trọng tâm của bài học và vận dụng đúng phương pháp hay không.\n`;
    md += `2. **Tương tác sư phạm & Phân hóa (Y5 & Y7)**: Khuyến khích giáo viên tổ chức hoạt động nhóm nhỏ hoặc câu hỏi gợi mở cho các nhóm học sinh có tốc độ tiếp thu khác nhau.\n`;
    md += `3. **Thời lượng thực hành (Y11)**: Dành tối thiểu 15-20 phút cho học sinh luyện tập giải quyết bài tập hoặc thảo luận thực tế.\n\n`;

    md += `> 📌 *Lưu ý quan trọng: Phân tích AI chỉ đóng vai trò tham khảo sư phạm đồng hành. Điểm số và xếp loại tiết dạy do Ban giám khảo/Người dự giờ quyết định theo đúng 11 tiêu chí quy định.*`;

    return {
      markdown: md,
      textbookReference: textbook && lessonMatch ? {
        bookTitle: textbook.title,
        chapter: `${chapterMatch?.chapterNumber}: ${chapterMatch?.title}`,
        lesson: `${lessonMatch.lessonNumber}: ${lessonMatch.title}`,
        pageStart: lessonMatch.pageStart,
        pageEnd: lessonMatch.pageEnd
      } : undefined
    };
  } catch (e: any) {
    return { markdown: "Lỗi phân tích: " + e.message };
  }
}

