import { prisma } from "@/lib/db";
import { AIUserContext } from "../types";

export type CommentStyle = "ENCOURAGING" | "COMMENDATORY" | "CONSTRUCTIVE";

export interface SmartCommentResult {
  success: boolean;
  studentId?: string;
  studentName?: string;
  studentCode?: string;
  className?: string;
  styleUsed: CommentStyle;
  metricsSummary: {
    averageScore: number | null;
    totalSubjects: number;
    highestSubject: { name: string; score: number } | null;
    lowestSubject: { name: string; score: number } | null;
    goalsTotal: number;
    goalsCompleted: number;
    benchmarkComplianceRate: number;
  };
  generatedComment: string;
  styleVariants: {
    encouraging: string;
    commendatory: string;
    constructive: string;
  };
  markdown: string;
  error?: string;
}

/**
 * Sinh nhận xét học bạ 360° cá nhân hóa dựa trên dữ liệu học tập thực tế của Sky-Line
 */
export async function generateSmartStudentComment(
  studentIdentifier: string,
  userContext: AIUserContext,
  requestedStyle: CommentStyle = "ENCOURAGING"
): Promise<SmartCommentResult> {
  try {
    // 1. Tìm kiếm học sinh theo Mã học sinh hoặc Tên học sinh
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { studentCode: studentIdentifier },
          { id: studentIdentifier },
          { studentName: { contains: studentIdentifier } }
        ]
      },
      include: {
        class: true,
        campus: true,
        subjectGradeEntries: {
          include: { subject: true }
        },
        goals: {
          include: { unlocks: true },
          orderBy: { createdAt: "desc" }
        },
        reflections: {
          orderBy: { createdAt: "desc" },
          take: 3
        },
        competencyAssessments: {
          include: { competency: true },
          take: 6
        }
      }
    });

    if (!student) {
      return {
        success: false,
        styleUsed: requestedStyle,
        metricsSummary: {
          averageScore: null,
          totalSubjects: 0,
          highestSubject: null,
          lowestSubject: null,
          goalsTotal: 0,
          goalsCompleted: 0,
          benchmarkComplianceRate: 0
        },
        generatedComment: "",
        styleVariants: { encouraging: "", commendatory: "", constructive: "" },
        markdown: `⚠️ Không tìm thấy học sinh nào phù hợp với từ khóa **"${studentIdentifier}"** trong phạm vi trường. Thầy/Cô vui lòng kiểm tra lại Họ tên hoặc Mã học sinh.`,
        error: "STUDENT_NOT_FOUND"
      };
    }

    // 2. SBAC Check (Scope-based Access Control)
    if (userContext.role === "STUDENT" && userContext.studentId !== student.id) {
      return {
        success: false,
        styleUsed: requestedStyle,
        metricsSummary: { averageScore: null, totalSubjects: 0, highestSubject: null, lowestSubject: null, goalsTotal: 0, goalsCompleted: 0, benchmarkComplianceRate: 0 },
        generatedComment: "",
        styleVariants: { encouraging: "", commendatory: "", constructive: "" },
        markdown: `🔒 **Từ chối truy cập**: Em chỉ có thể xem nhận xét của chính bản thân mình.`,
        error: "ACCESS_DENIED"
      };
    }

    if (userContext.role === "PARENT") {
      // Phụ huynh chỉ được xem con em mình
      const isLinkedChild = await prisma.parentStudentLink.findFirst({
        where: {
          studentId: student.id,
          parent: { userId: userContext.userId }
        }
      });
      if (!isLinkedChild) {
        return {
          success: false,
          styleUsed: requestedStyle,
          metricsSummary: { averageScore: null, totalSubjects: 0, highestSubject: null, lowestSubject: null, goalsTotal: 0, goalsCompleted: 0, benchmarkComplianceRate: 0 },
          generatedComment: "",
          styleVariants: { encouraging: "", commendatory: "", constructive: "" },
          markdown: `🔒 **Từ chối truy cập**: Quý Phụ huynh chỉ có thể xem dữ liệu và nhận xét của con em mình.`,
          error: "ACCESS_DENIED"
        };
      }
    }

    // 3. Khai thác dữ liệu thực tế
    const validScores: { subject: string; score: number }[] = [];
    const benchmarkStandard = 7.0;
    let metBenchmarkCount = 0;

    student.subjectGradeEntries.forEach(g => {
      if (typeof g.compositeScore === "number" && !isNaN(g.compositeScore) && g.subject?.name) {
        validScores.push({ subject: g.subject.name, score: g.compositeScore });
        if (g.compositeScore >= benchmarkStandard) {
          metBenchmarkCount++;
        }
      }
    });

    validScores.sort((a, b) => b.score - a.score);

    const highestSubject = validScores.length > 0 ? validScores[0] : null;
    const lowestSubject = validScores.length > 0 ? validScores[validScores.length - 1] : null;
    const avgScore = validScores.length > 0
      ? parseFloat((validScores.reduce((acc, curr) => acc + curr.score, 0) / validScores.length).toFixed(2))
      : null;

    const complianceRate = validScores.length > 0
      ? Math.round((metBenchmarkCount / validScores.length) * 100)
      : 0;

    const completedGoals = student.goals.filter(
      g => g.status === "COMPLETED" || g.achievementLevel === "DAT"
    ).length;

    // Ghi nhận cảm xúc gần nhất
    const recentReflection = student.reflections.length > 0 ? student.reflections[0] : null;
    const emotionalState = recentReflection?.feeling || "Bình thường";

    // 4. Xây dựng 3 phong cách nhận xét chuẩn mực sư phạm Sky-Line
    const studentName = student.studentName;
    const className = student.class?.className || "Lớp";

    // A. PHONG CÁCH 1: KHÍCH LỆ - ĐỒNG HÀNH (ENCOURAGING)
    const encouragingComment =
      `Em ${studentName} thể hiện thái độ học tập tích cực, có nhiều nỗ lực và ý thức kỷ luật tốt trong các giờ học.` +
      (highestSubject ? ` Môn ${highestSubject.subject} là điểm sáng nổi bật của em với kết quả rất đáng khen ngợi (${highestSubject.score} điểm).` : "") +
      (lowestSubject && lowestSubject.score < benchmarkStandard
        ? ` Đối với môn ${lowestSubject.subject} (${lowestSubject.score} điểm), em cần dành thêm thời gian ôn tập và mạnh dạn trao đổi với Thầy Cô bộ môn khi gặp bài khó.`
        : "") +
      (completedGoals > 0 ? ` Em đã hoàn thành ${completedGoals}/${student.goals.length} mục tiêu SMART đã đăng ký.` : "") +
      ` Thầy Cô tin tưởng rằng với tinh thần kiên trì và kế hoạch học tập khoa học, em sẽ tiếp tục bứt phá mạnh mẽ hơn nữa trong học kỳ tới!`;

    // B. PHONG CÁCH 2: KHEN THƯỞNG - BỨT PHÁ (COMMENDATORY)
    const commendatoryComment =
      `Em ${studentName} là một học sinh gương mẫu, có tư duy nhạy bén và tinh thần tự học rất cao tại tập thể ${className}.` +
      (avgScore ? ` Điểm trung bình học tập đạt mức xuất sắc (${avgScore}), với ${complianceRate}% các môn vượt chuẩn Benchmark chất lượng cao.` : "") +
      (highestSubject ? ` Năng lực vượt trội ở môn ${highestSubject.subject} (${highestSubject.score} điểm) cho thấy em có tiềm năng lớn để tham gia các dự án nghiên cứu hoặc đội tuyển giao lưu học thuật.` : "") +
      ` Nhà trường và Thầy Cô tuyên dương tinh thần học tập trách nhiệm của em; mong em tiếp tục giữ vững ngọn lửa đam mê và lan tỏa năng lượng tích cực đến bạn bè xung quanh!`;

    // C. PHONG CÁCH 3: NGHIÊM TÚC - RÈN LUYỆN (CONSTRUCTIVE)
    const constructiveComment =
      `Em ${studentName} có tố chất tiếp thu tốt nhưng chưa thực sự tập trung và duy trì đều đặn nhịp độ học tập qua các tuần.` +
      (lowestSubject ? ` Kết quả môn ${lowestSubject.subject} (${lowestSubject.score} điểm) hiện đang ở mức cần báo động, chưa đạt chuẩn yêu cầu.` : "") +
      (student.goals.length > 0 ? ` Tiến độ thực hiện mục tiêu sổ tay Cố vấn còn chậm (mới đạt ${completedGoals}/${student.goals.length} mục tiêu).` : "") +
      ` Yêu cầu em nghiêm túc chấn chỉnh lại thời gian biểu tự học ở nhà, chủ động tham gia các buổi phụ đạo và hoàn thành đầy đủ các hành động gỡ rào cản 7 ngày theo đúng cam kết với GVCN.`;

    // Chọn phong cách trả về chính
    let generatedComment = encouragingComment;
    if (requestedStyle === "COMMENDATORY") generatedComment = commendatoryComment;
    if (requestedStyle === "CONSTRUCTIVE") generatedComment = constructiveComment;

    // 5. Tạo định dạng Markdown trực quan
    const markdown =
      `### ✍️ Đề Xuất Nhận Xét Học Bạ 360° — ${studentName} (${className})\n\n` +
      `> 🏫 **Cơ sở**: ${student.campus?.campusName || "Sky-Line System"} | **Mã HS**: \`${student.studentCode}\`\n\n` +
      `#### 📊 Tóm Tắt Dữ Liệu Thực Tế:\n` +
      `- **Điểm Trung Bình (ĐTB)**: **${avgScore !== null ? avgScore : "Chưa đủ cột điểm"}** | **Tỷ lệ đạt Benchmark**: **${complianceRate}%**\n` +
      `- **Môn thế mạnh**: ${highestSubject ? `**${highestSubject.subject}** (${highestSubject.score} điểm)` : "Chưa có"}\n` +
      `- **Môn cần phụ đạo**: ${lowestSubject ? `**${lowestSubject.subject}** (${lowestSubject.score} điểm)` : "Chưa có"}\n` +
      `- **Tiến độ Mục tiêu SMART**: **${completedGoals}/${student.goals.length} mục tiêu đạt**\n` +
      `- **Tâm lý phản tư gần nhất**: ${emotionalState}\n\n` +
      `---\n\n` +
      `#### 💬 Lời Nhận Xét Được Đề Xuất (Phong cách: *${
        requestedStyle === "COMMENDATORY" ? "Khen Thưởng - Bứt Phá" :
        requestedStyle === "CONSTRUCTIVE" ? "Nghiêm Túc - Rèn Luyện" : "Khích Lệ - Đồng Hành"
      }*):\n\n` +
      `\`\`\`text\n${generatedComment}\n\`\`\`\n\n` +
      `💡 *Thầy/Cô có thể nhấp vào khối văn bản trên để copy hoặc dùng các tùy chọn phong cách khác bên dưới:*\n\n` +
      `<details>\n<summary><b>👉 Xem bản thảo phong cách Khen thưởng - Bứt phá</b></summary>\n\n> "${commendatoryComment}"\n</details>\n\n` +
      `<details>\n<summary><b>👉 Xem bản thảo phong cách Nghiêm túc - Rèn luyện</b></summary>\n\n> "${constructiveComment}"\n</details>\n\n` +
      `<details>\n<summary><b>👉 Xem bản thảo phong cách Khích lệ - Đồng hành</b></summary>\n\n> "${encouragingComment}"\n</details>\n`;

    return {
      success: true,
      studentId: student.id,
      studentName: student.studentName,
      studentCode: student.studentCode,
      className,
      styleUsed: requestedStyle,
      metricsSummary: {
        averageScore: avgScore,
        totalSubjects: validScores.length,
        highestSubject,
        lowestSubject,
        goalsTotal: student.goals.length,
        goalsCompleted: completedGoals,
        benchmarkComplianceRate: complianceRate
      },
      generatedComment,
      styleVariants: {
        encouraging: encouragingComment,
        commendatory: commendatoryComment,
        constructive: constructiveComment
      },
      markdown
    };
  } catch (error: any) {
    console.error("Error in generateSmartStudentComment:", error);
    return {
      success: false,
      styleUsed: requestedStyle,
      metricsSummary: { averageScore: null, totalSubjects: 0, highestSubject: null, lowestSubject: null, goalsTotal: 0, goalsCompleted: 0, benchmarkComplianceRate: 0 },
      generatedComment: "",
      styleVariants: { encouraging: "", commendatory: "", constructive: "" },
      markdown: `⚠️ Đã có lỗi xảy ra trong quá trình tổng hợp nhận xét: ${error.message}`,
      error: error.message
    };
  }
}
