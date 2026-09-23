import { prisma } from "@/lib/db";
import { AIUserContext } from "../types";
import { authorizeAIAction } from "../gateway";
import { calcBasicStats, calcBenchmarkDistribution } from "../analytics/statsEngine";

export interface ExamAnalysisResult {
  error?: string;
  markdown: string;
  metrics?: Record<string, any>;
}

export async function getStudentExamAnalysis(
  studentId: string,
  context: AIUserContext,
  examPeriod?: string
): Promise<ExamAnalysisResult> {
  // 1. Permission Check
  const authCheck = await authorizeAIAction(context, "getStudentExamAnalysis", { studentId });
  if (!authCheck.authorized) {
    return { markdown: `⚠️ ${authCheck.reason || "Bạn không có thẩm quyền xem kết quả học tập của học sinh này."}` };
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: { select: { id: true, name: true, grade: true, campus: { select: { name: true } } } }
      }
    });

    if (!student) {
      return { markdown: "⚠️ Không tìm thấy hồ sơ học sinh trên hệ thống." };
    }

    const whereClause: any = { studentId };
    if (examPeriod) {
      whereClause.period = examPeriod;
    }

    const grades = await prisma.subjectGradeEntry.findMany({
      where: whereClause,
      include: {
        subject: { select: { name: true, code: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    if (grades.length === 0) {
      return {
        markdown: `Hiện tại chưa có dữ liệu điểm kiểm tra nào được cập nhật trên hệ thống cho học sinh **${student.fullName}** (${student.class?.name || "Chưa phân lớp"}).`
      };
    }

    // Mathematical evaluation using deterministic analytics
    const validScores = grades
      .map(g => (g.compositeScore !== null && g.compositeScore !== undefined ? Number(g.compositeScore) : null))
      .filter((s): s is number => s !== null && !isNaN(s));

    const benchmark = student.class?.grade && student.class.grade <= 5 ? 7.0 : 6.0;
    const stats = calcBasicStats(validScores);
    const benchmarkDist = calcBenchmarkDistribution(validScores, benchmark);

    let md = `### 📊 Báo Cáo Phân Tích Kết Quả Kiểm Tra — ${student.fullName}\n`;
    md += `- **Lớp**: **${student.class?.name || "N/A"}** • Cơ sở: **${student.class?.campus?.name || "Sky-Line"}**\n`;
    md += `- **Điểm trung bình các môn**: **${stats.mean}** • Điểm cao nhất: **${stats.max}** • Điểm thấp nhất: **${stats.min}**\n`;
    md += `- **Tỷ lệ đạt chuẩn Benchmark (${benchmark}.0)**: **${benchmarkDist.aboveBenchmarkRate + benchmarkDist.atBenchmarkRate}%** (${benchmarkDist.aboveBenchmarkCount + benchmarkDist.atBenchmarkCount}/${benchmarkDist.total} môn)\n\n`;

    md += `| Môn học | Kỳ kiểm tra | Điểm tổng kết | Chuẩn Benchmark | Đánh giá đạt chuẩn |\n`;
    md += `| :--- | :--- | :---: | :---: | :--- |\n`;

    grades.forEach(g => {
      const score = g.compositeScore !== null ? Number(g.compositeScore) : null;
      let statusTag = "Chưa có điểm";
      if (score !== null) {
        if (score >= benchmark + 2.0) statusTag = "⭐ Vượt trội";
        else if (score >= benchmark) statusTag = "✅ Đạt chuẩn";
        else statusTag = "⚠️ Dưới chuẩn";
      }
      md += `| **${g.subject?.name || "Môn học"}** | ${g.period || "Chung"} | **${score !== null ? score : "Chưa có"}** | ${benchmark}.0 | ${statusTag} |\n`;
    });

    return {
      markdown: md,
      metrics: {
        mean: stats.mean,
        median: stats.median,
        min: stats.min,
        max: stats.max,
        benchmarkScore: benchmark,
        benchmarkPassRate: benchmarkDist.aboveBenchmarkRate + benchmarkDist.atBenchmarkRate,
        totalSubjects: grades.length
      }
    };
  } catch (err: any) {
    console.error("getStudentExamAnalysis error:", err);
    return { markdown: `⚠️ Đã xảy ra lỗi khi trích xuất dữ liệu kết quả kiểm tra: ${err.message}` };
  }
}

export async function getClassExamAnalysis(
  classId: string,
  context: AIUserContext,
  subjectId?: string
): Promise<ExamAnalysisResult> {
  const authCheck = await authorizeAIAction(context, "getClassExamAnalysis", { classId, subjectId });
  if (!authCheck.authorized) {
    return { markdown: `⚠️ ${authCheck.reason || "Bạn không có quyền xem phân tích điểm của lớp học này."}` };
  }

  try {
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        campus: { select: { name: true } }
      }
    });

    if (!classRecord) {
      return { markdown: "⚠️ Không tìm thấy lớp học được chỉ định." };
    }

    const whereClause: any = {
      student: { classId }
    };
    if (subjectId) {
      whereClause.subjectId = subjectId;
    }

    const entries = await prisma.subjectGradeEntry.findMany({
      where: whereClause,
      include: {
        student: { select: { fullName: true, studentCode: true } },
        subject: { select: { name: true } }
      }
    });

    if (entries.length === 0) {
      return {
        markdown: `Hiện tại lớp **${classRecord.name}** chưa có dữ liệu điểm thi nào được cập nhật trên hệ thống.`
      };
    }

    const validScores = entries
      .map(e => (e.compositeScore !== null && e.compositeScore !== undefined ? Number(e.compositeScore) : null))
      .filter((s): s is number => s !== null && !isNaN(s));

    const benchmark = classRecord.grade && classRecord.grade <= 5 ? 7.0 : 6.0;
    const stats = calcBasicStats(validScores);
    const dist = calcBenchmarkDistribution(validScores, benchmark);

    let md = `### 📈 Phân Tích Chất Lượng Điểm Thi — Lớp ${classRecord.name}\n`;
    md += `- **Cơ sở**: ${classRecord.campus?.name || "Sky-Line"} • **Khối**: ${classRecord.grade || "N/A"}\n`;
    md += `- **Tổng số đầu điểm đã vào**: **${entries.length}** • **Sĩ số tham gia**: **${new Set(entries.map(e => e.studentId)).size}** học sinh\n`;
    md += `- **Điểm trung bình toàn lớp**: **${stats.mean}** (Trung vị: ${stats.median} • Độ lệch chuẩn: ${stats.stdDev})\n`;
    md += `- **Điểm cao nhất**: ${stats.max} • **Điểm thấp nhất**: ${stats.min}\n`;
    md += `- **Tỷ lệ đạt chuẩn Benchmark (${benchmark}.0)**: **${dist.aboveBenchmarkRate + dist.atBenchmarkRate}%** (${dist.aboveBenchmarkCount + dist.atBenchmarkCount} đầu điểm đạt/vượt chuẩn)\n`;
    md += `- **Tỷ lệ dưới chuẩn**: **${dist.belowBenchmarkRate}%** (${dist.belowBenchmarkCount} đầu điểm cần bồi dưỡng)\n\n`;

    // Highlight students below benchmark
    const belowList = entries.filter(e => e.compositeScore !== null && Number(e.compositeScore) < benchmark);
    if (belowList.length > 0) {
      md += `#### ⚠️ Danh Sách Điểm Dưới Chuẩn Cần Lưu Ý:\n`;
      md += `| Học sinh | Môn | Điểm | Lời dặn của GV |\n`;
      md += `| :--- | :--- | :---: | :--- |\n`;
      belowList.slice(0, 10).forEach(b => {
        md += `| **${b.student?.fullName}** | ${b.subject?.name} | **${b.compositeScore}** | ${b.teacherRemark || "Chưa có"} |\n`;
      });
      if (belowList.length > 10) {
        md += `\n*...và còn ${belowList.length - 10} đầu điểm dưới chuẩn khác.*`;
      }
    } else {
      md += `> ✅ **Chúc mừng Thầy/Cô**: Toàn bộ điểm số hiện tại của lớp đều đạt hoặc vượt mức chuẩn Benchmark!`;
    }

    return {
      markdown: md,
      metrics: {
        classMean: stats.mean,
        classMedian: stats.median,
        stdDev: stats.stdDev,
        benchmarkPassRate: dist.aboveBenchmarkRate + dist.atBenchmarkRate,
        belowBenchmarkCount: dist.belowBenchmarkCount
      }
    };
  } catch (err: any) {
    console.error("getClassExamAnalysis error:", err);
    return { markdown: `⚠️ Lỗi khi phân tích điểm lớp: ${err.message}` };
  }
}
