import { prisma } from "@/lib/db";
import { AIUserContext } from "../types";
import { authorizeAIAction } from "../gateway";
import { normalizeSubjectName } from "../analytics/subjectNormalizer";
import { evaluateStudentGAP } from "../analytics/gapEngine";

export interface AdvisoryAnalysisResult {
  markdown: string;
  metrics?: Record<string, any>;
}

export async function getStudentAdvisoryAnalysis(
  context: AIUserContext,
  targetStudentId?: string,
  targetClassId?: string
): Promise<AdvisoryAnalysisResult> {
  // 1. Permission Check
  const authCheck = await authorizeAIAction(context, "getStudentAdvisoryAnalysis", {
    studentId: targetStudentId,
    classId: targetClassId
  });

  if (!authCheck.authorized) {
    return { markdown: `⚠️ ${authCheck.reason || "Bạn không có quyền truy cập hồ sơ cố vấn học tập này."}` };
  }

  try {
    const studentIdToQuery = targetStudentId || (context.role === "STUDENT" ? context.studentId : undefined);

    // Case A: Query for a specific student
    if (studentIdToQuery) {
      const student = await prisma.student.findUnique({
        where: { id: studentIdToQuery },
        include: {
          class: { select: { name: true, grade: true } },
          goals: {
            include: { unlocks: true },
            orderBy: { createdAt: "desc" }
          },
          advisoryStatuses: {
            orderBy: { createdAt: "desc" },
            take: 1
          },
          helpRequests: {
            where: { status: { in: ["PENDING", "PROCESSING"] } }
          }
        }
      });

      if (!student) {
        return { markdown: "⚠️ Không tìm thấy hồ sơ học sinh được chỉ định." };
      }

      const latestStatus = student.advisoryStatuses[0]?.status || "GREEN";
      const statusIcon = latestStatus === "RED" ? "🔴 ĐỎ (Nguy cơ cao)" : latestStatus === "YELLOW" ? "🟡 VÀNG (Cần lưu ý)" : "🟢 XANH (Bình thường)";

      let md = `### 🎯 Phân Tích Hồ Sơ Cố Vấn & Mục Tiêu SMART — ${student.fullName}\n`;
      md += `- **Lớp**: **${student.class?.name || "N/A"}** • **Trạng thái cảnh báo**: **${statusIcon}**\n`;
      md += `- **Số mục tiêu đã thiết lập**: **${student.goals.length}** mục tiêu • **Yêu cầu hỗ trợ mở**: **${student.helpRequests.length}** yêu cầu\n\n`;

      if (student.goals.length === 0) {
        md += `> ℹ️ *Học sinh hiện chưa thiết lập mục tiêu SMART nào trong học kỳ này.*\n`;
      } else {
        md += `| Môn học | Điểm mục tiêu | Điểm hiện tại | Khoảng chênh GAP | Đánh giá & Khuyến nghị |\n`;
        md += `| :--- | :---: | :---: | :---: | :--- |\n`;

        student.goals.forEach(g => {
          const normSubject = normalizeSubjectName(g.subject || "");
          const target = Number(g.targetScore || 8.0);
          const current = g.currentScore !== null ? Number(g.currentScore) : target;
          const gapResult = evaluateStudentGAP(current, target);

          md += `| **${normSubject?.standardName || g.subject}** | ${target} | ${current} | **${gapResult.gap > 0 ? `+${gapResult.gap}` : gapResult.gap}** | ${gapResult.categoryLabel} |\n`;
        });
      }

      // Check 7-day barrier removal plan
      const activeUnlocks = student.goals.flatMap(g => g.unlocks || []).filter(u => u.status === "ACTIVE" || u.status === "PENDING");
      if (activeUnlocks.length > 0) {
        md += `\n#### ⚡ Kế Hoạch 7 Ngày Gỡ Rào Cản Đang Kích Hoạt:\n`;
        activeUnlocks.forEach(u => {
          md += `- **Khó khăn**: ${u.reason || "Cần tháo gỡ khó khăn môn học"}\n`;
          md += `  *Cam kết hành động*: ${u.actionPlan || "Đang thực hiện kế hoạch 7 ngày"}\n`;
        });
      }

      return {
        markdown: md,
        metrics: {
          totalGoals: student.goals.length,
          advisoryStatus: latestStatus,
          pendingHelpRequests: student.helpRequests.length
        }
      };
    }

    // Case B: Query class-wide advisory status (GVCN or BGH)
    const classIdToQuery = targetClassId || context.classId;
    if (classIdToQuery) {
      const classRecord = await prisma.class.findUnique({
        where: { id: classIdToQuery },
        include: {
          students: {
            include: {
              advisoryStatuses: { orderBy: { createdAt: "desc" }, take: 1 },
              goals: true,
              helpRequests: { where: { status: "PENDING" } }
            }
          }
        }
      });

      if (!classRecord) {
        return { markdown: "⚠️ Không tìm thấy lớp học được chỉ định." };
      }

      let greenCount = 0;
      let yellowCount = 0;
      let redCount = 0;
      const atRiskStudents: Array<{ name: string; status: string; reason: string }> = [];

      classRecord.students.forEach(s => {
        const st = s.advisoryStatuses[0]?.status || "GREEN";
        if (st === "RED") {
          redCount++;
          atRiskStudents.push({ name: s.fullName, status: "ĐỎ", reason: s.advisoryStatuses[0]?.reason || "Nguy cơ học tập cao" });
        } else if (st === "YELLOW") {
          yellowCount++;
          atRiskStudents.push({ name: s.fullName, status: "VÀNG", reason: s.advisoryStatuses[0]?.reason || "Cần lưu ý bồi dưỡng" });
        } else {
          greenCount++;
        }
      });

      let md = `### 🛡️ Báo Cáo Cố Vấn Học Tập & Cảnh Báo Sớm — Lớp ${classRecord.name}\n`;
      md += `- **Sĩ số lớp**: **${classRecord.students.length}** học sinh\n`;
      md += `- **Phân loại trạng thái**: 🟢 **Xanh (Bình thường)**: ${greenCount} | 🟡 **Vàng (Cần lưu ý)**: ${yellowCount} | 🔴 **Đỏ (Nguy cơ cao)**: ${redCount}\n\n`;

      if (atRiskStudents.length > 0) {
        md += `#### ⚠️ Danh Sách Học Sinh Diện Cần Hỗ Trợ Đặc Biệt:\n`;
        md += `| Học sinh | Trạng thái | Ghi chú từ Cố vấn / GVCN |\n`;
        md += `| :--- | :---: | :--- |\n`;
        atRiskStudents.forEach(st => {
          md += `| **${st.name}** | **${st.status}** | ${st.reason} |\n`;
        });
        md += `\n> 💡 *Khuyến nghị GVCN và Thầy/Cô bộ môn tiến hành phiên cố vấn 1-1 và kích hoạt kế hoạch 7 ngày gỡ khó cho các em diện Vàng/Đỏ.*`;
      } else {
        md += `> ✅ **Tuyệt vời**: Tất cả học sinh trong lớp hiện đều duy trì trạng thái Xanh ổn định!`;
      }

      return {
        markdown: md,
        metrics: {
          totalStudents: classRecord.students.length,
          green: greenCount,
          yellow: yellowCount,
          red: redCount
        }
      };
    }

    return {
      markdown: "Vui lòng chỉ định rõ tên học sinh hoặc mã lớp cần phân tích hồ sơ cố vấn học tập."
    };
  } catch (err: any) {
    console.error("getStudentAdvisoryAnalysis error:", err);
    return { markdown: `⚠️ Đã xảy ra lỗi khi phân tích hồ sơ cố vấn: ${err.message}` };
  }
}
