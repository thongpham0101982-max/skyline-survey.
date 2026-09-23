import { prisma } from "@/lib/db";
import { AIUserContext } from "../types";
import { calculateClassHealthMatrix } from "../analytics/healthIndexEngine";
import { getClassExamAnalysis } from "./examAnalysisTool";
import { getTeacherObservationAnalysis } from "./observationAnalysisTool";

export type ReportType = "CLASS_ACADEMIC_REPORT" | "OBSERVATION_MATRIX_REPORT" | "HOLISTIC_HEALTH_AUDIT_REPORT";

export interface ExecutiveReportResult {
  success: boolean;
  reportType: ReportType;
  title: string;
  generatedAt: string;
  markdown: string;
  printUrl: string;
  summaryMetrics: Record<string, any>;
  error?: string;
}

/**
 * Sinh Báo Cáo Điều Hành Chuyên Môn & Đảm Bảo Chất Lượng Giáo Dục Sky-Line
 */
export async function generateExecutiveReport(
  reportType: ReportType,
  targetId: string, // classId hoặc departmentId hoặc teacherId
  userContext: AIUserContext
): Promise<ExecutiveReportResult> {
  const generatedAt = new Date().toLocaleString("vi-VN");

  try {
    if (reportType === "CLASS_ACADEMIC_REPORT") {
      // 1. Báo cáo Phổ điểm & Học lực Lớp
      const targetClass = await prisma.class.findUnique({
        where: { id: targetId },
        include: {
          campus: true,
          students: {
            where: { status: "ACTIVE" },
            include: {
              subjectGradeEntries: { include: { subject: true } }
            }
          }
        }
      });

      if (!targetClass) {
        return {
          success: false,
          reportType,
          title: "Báo cáo Phổ điểm Lớp",
          generatedAt,
          markdown: `⚠️ Không tìm thấy thông tin lớp với mã ID: \`${targetId}\`.`,
          printUrl: "",
          summaryMetrics: {},
          error: "CLASS_NOT_FOUND"
        };
      }

      const totalStudents = targetClass.students.length;
      let totalScoresCount = 0;
      let sumScores = 0;
      let aboveBenchmarkCount = 0;
      let tierCounts = { excellent: 0, good: 0, fair: 0, average: 0, weak: 0 };

      targetClass.students.forEach(st => {
        const scores = st.subjectGradeEntries
          .map(g => g.compositeScore)
          .filter((s): s is number => typeof s === "number" && !isNaN(s));
        if (scores.length > 0) {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          sumScores += avg;
          totalScoresCount++;
          if (avg >= 7.0) aboveBenchmarkCount++;

          if (avg >= 9.0) tierCounts.excellent++;
          else if (avg >= 8.0) tierCounts.good++;
          else if (avg >= 6.5) tierCounts.fair++;
          else if (avg >= 5.0) tierCounts.average++;
          else tierCounts.weak++;
        }
      });

      const classAvg = totalScoresCount > 0 ? (sumScores / totalScoresCount).toFixed(2) : "0.00";
      const benchmarkRate = totalScoresCount > 0 ? Math.round((aboveBenchmarkCount / totalScoresCount) * 100) : 0;

      const printUrl = `/api/assistant/reports/generate?type=CLASS_ACADEMIC_REPORT&id=${targetClass.id}`;

      const markdown =
        `# 📑 BÁO CÁO PHÂN TÍCH CHẤT LƯỢNG HỌC TẬP — ${targetClass.className}\n\n` +
        `> 🏫 **Cơ sở**: ${targetClass.campus?.campusName} | **Thời điểm lập**: ${generatedAt}\n\n` +
        `### 📊 1. Chỉ Số Tổng Quan\n` +
        `- **Tổng số học sinh**: **${totalStudents}** học sinh\n` +
        `- **Điểm Trung Bình Chung**: **${classAvg} / 10**\n` +
        `- **Tỷ lệ Đạt Chuẩn Benchmark (>= 7.0)**: **${benchmarkRate}%**\n\n` +
        `### 📈 2. Phân Bố Phổ Điểm Học Lực\n` +
        `| Phân hạng | Tiêu chuẩn | Số lượng | Tỷ lệ |\n` +
        `| :--- | :--- | :--- | :--- |\n` +
        `| 🌟 Xuất sắc | ĐTB >= 9.0 | **${tierCounts.excellent}** | ${totalScoresCount > 0 ? Math.round((tierCounts.excellent / totalScoresCount) * 100) : 0}% |\n` +
        `| 🥇 Giỏi | 8.0 <= ĐTB < 9.0 | **${tierCounts.good}** | ${totalScoresCount > 0 ? Math.round((tierCounts.good / totalScoresCount) * 100) : 0}% |\n` +
        `| 🥈 Khá | 6.5 <= ĐTB < 8.0 | **${tierCounts.fair}** | ${totalScoresCount > 0 ? Math.round((tierCounts.fair / totalScoresCount) * 100) : 0}% |\n` +
        `| 🥉 Trung bình | 5.0 <= ĐTB < 6.5 | **${tierCounts.average}** | ${totalScoresCount > 0 ? Math.round((tierCounts.average / totalScoresCount) * 100) : 0}% |\n` +
        `| ⚠️ Cần phụ đạo | ĐTB < 5.0 | **${tierCounts.weak}** | ${totalScoresCount > 0 ? Math.round((tierCounts.weak / totalScoresCount) * 100) : 0}% |\n\n` +
        `---\n\n` +
        `🖨️ **Tải & In Báo Cáo Chuẩn PDF**: [Nhấp vào đây để mở bản in Executive PDF](${printUrl})\n`;

      return {
        success: true,
        reportType,
        title: `Báo cáo Phổ điểm Học tập — ${targetClass.className}`,
        generatedAt,
        markdown,
        printUrl,
        summaryMetrics: {
          className: targetClass.className,
          totalStudents,
          classAvg,
          benchmarkRate,
          tierCounts
        }
      };
    }

    if (reportType === "HOLISTIC_HEALTH_AUDIT_REPORT") {
      // 2. Báo cáo Kiểm toán Rủi ro & Sức khỏe Học tập Lớp
      const matrix = await calculateClassHealthMatrix(targetId);
      if (!matrix) {
        return {
          success: false,
          reportType,
          title: "Báo cáo Sức khỏe Học tập Lớp",
          generatedAt,
          markdown: `⚠️ Không thể tính toán ma trận sức khỏe cho lớp mã: \`${targetId}\`.`,
          printUrl: "",
          summaryMetrics: {},
          error: "CLASS_NOT_FOUND"
        };
      }

      const printUrl = `/api/assistant/reports/generate?type=HOLISTIC_HEALTH_AUDIT_REPORT&id=${targetId}`;

      const redStudents = matrix.students.filter(s => s.tier === "RED");
      const yellowStudents = matrix.students.filter(s => s.tier === "YELLOW");

      let redListMd = redStudents.length > 0
        ? redStudents.map(s => `- **${s.studentName}** (\`${s.studentCode}\`): HHI **${s.hhiScore}/100** — *Lý do: ${s.insights.risks.join("; ") || "Điểm học lực & rào cản quá hạn"}*`).join("\n")
        : "*Không có học sinh nào ở mức Đỏ.*";

      let yellowListMd = yellowStudents.length > 0
        ? yellowStudents.map(s => `- **${s.studentName}** (\`${s.studentCode}\`): HHI **${s.hhiScore}/100** — *${s.insights.risks.join("; ") || "Cần giám sát"}*`).join("\n")
        : "*Không có học sinh nào ở mức Vàng.*";

      const markdown =
        `# 🛡️ BÁO CÁO KIỂM TOÁN RỦI RO HỌC TẬP (EWS AUDIT) — ${matrix.className}\n\n` +
        `> 📅 **Thời điểm phân tích**: ${generatedAt} | **Tổng số học sinh**: ${matrix.totalStudents}\n\n` +
        `### 📊 1. Phân Bố Sức Khỏe Học Tập (HHI)\n` +
        `- 🟢 **Xanh (Tự chủ & An toàn)**: **${matrix.distribution.greenCount}** học sinh (**${matrix.distribution.greenPercent}%**)\n` +
        `- 🟡 **Vàng (Cần lưu tâm)**: **${matrix.distribution.yellowCount}** học sinh (**${matrix.distribution.yellowPercent}%**)\n` +
        `- 🔴 **Đỏ (Nguy cơ tụt dốc)**: **${matrix.distribution.redCount}** học sinh (**${matrix.distribution.redPercent}%**)\n` +
        `- **Điểm Sức Khỏe Trung Bình Của Lớp**: **${matrix.averageHHI} / 100**\n\n` +
        `### 🚨 2. Danh Sách Học Sinh Cần Can Thiệp Khẩn Cấp (Nhóm Đỏ):\n` +
        `${redListMd}\n\n` +
        `### ⚠️ 3. Danh Sách Học Sinh Cần Lưu Tâm (Nhóm Vàng):\n` +
        `${yellowListMd}\n\n` +
        `---\n\n` +
        `🖨️ **Tải & In Báo Cáo Chuẩn PDF**: [Nhấp vào đây để mở bản in Executive PDF](${printUrl})\n`;

      return {
        success: true,
        reportType,
        title: `Báo cáo Kiểm toán Rủi ro EWS — ${matrix.className}`,
        generatedAt,
        markdown,
        printUrl,
        summaryMetrics: {
          className: matrix.className,
          averageHHI: matrix.averageHHI,
          distribution: matrix.distribution,
          redCount: matrix.distribution.redCount
        }
      };
    }

    if (reportType === "OBSERVATION_MATRIX_REPORT") {
      // 3. Báo cáo Ma trận Dự giờ 11 Tiêu chí
      const teacherAnalysis = await getTeacherObservationAnalysis(targetId, userContext);
      const printUrl = `/api/assistant/reports/generate?type=OBSERVATION_MATRIX_REPORT&id=${targetId}`;

      const markdown =
        `# 📋 BÁO CÁO TỔNG KẾT DỰ GIỜ & PHÁT TRIỂN CHUYÊN MÔN\n\n` +
        `> 📅 **Thời điểm lập**: ${generatedAt}\n\n` +
        teacherAnalysis.markdown +
        `\n\n---\n\n` +
        `🖨️ **Tải & In Báo Cáo Chuẩn PDF**: [Nhấp vào đây để mở bản in Executive PDF](${printUrl})\n`;

      return {
        success: true,
        reportType,
        title: `Báo cáo Ma trận Dự giờ & Phát triển Chuyên môn`,
        generatedAt,
        markdown,
        printUrl,
        summaryMetrics: teacherAnalysis.metrics
      };
    }

    return {
      success: false,
      reportType,
      title: "Báo cáo Điều Hành",
      generatedAt,
      markdown: "⚠️ Loại báo cáo không được hỗ trợ.",
      printUrl: "",
      summaryMetrics: {},
      error: "UNSUPPORTED_REPORT_TYPE"
    };
  } catch (err: any) {
    console.error("Error in generateExecutiveReport:", err);
    return {
      success: false,
      reportType,
      title: "Báo cáo Điều Hành",
      generatedAt,
      markdown: `⚠️ Lỗi tạo báo cáo điều hành: ${err.message}`,
      printUrl: "",
      summaryMetrics: {},
      error: err.message
    };
  }
}
