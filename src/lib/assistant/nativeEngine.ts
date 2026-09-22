// @ts-nocheck
import { AssistantRole, PERSONAS } from "./personas";
import {
  getStudentGrades,
  getStudentCompetencies,
  getStudentGoalsAndPlans,
  getStudentTimetable,
  getStudentAdvisoryNotes
} from "./tools/studentTools";
import {
  getClassGradebookStatus,
  getBenchmarkAlerts,
  getHomeroomAtRiskStudents,
  draftStudentEvaluationComment,
  getTeacherObservationStatus
} from "./tools/teacherTools";
import {
  getParentChildren,
  getChildAcademicProgress,
  getChildGoalsAndTeacherNotes
} from "./tools/parentTools";
import {
  getSchoolwideGradebookProgress,
  getDepartmentObservationStats,
  getSystemAtRiskOverview,
  getSchoolwideSurveyNPS
} from "./tools/adminTools";
import {
  getTCMTeachers,
  getTCMSubjectQuality,
  getTCMObservationMonitoring
} from "./tools/tcmTools";
import { AssistantSecurityContext } from "./tools";
import { searchKnowledgeBase } from "./knowledgeBase";

/**
 * Native Built-In Assistant Engine
 * Không cần GEMINI_API_KEY, chạy 100% nội bộ trên máy chủ với tốc độ tức thì,
 * bám sát dữ liệu thật của cơ sở dữ liệu và bảo đảm zero hallucination.
 */
export async function processNativeAssistantQuery(
  message: string,
  context: AssistantSecurityContext,
  currentPath?: string
): Promise<string> {
  const q = message.toLowerCase().trim();
  const role = context.role;
  const persona = PERSONAS[role] || PERSONAS.TEACHER;

  // 1. Lời chào & Giới thiệu
  if (
    q === "chào" ||
    q === "xin chào" ||
    q === "hello" ||
    q === "hi" ||
    q.includes("bạn là ai") ||
    q.includes("giúp gì")
  ) {
    return `${persona.welcomeMessage}

---
### 💡 Thầy/Cô và các bạn có thể bấm vào các gợi ý nhanh phía dưới hoặc hỏi trực tiếp:
- **Tra cứu số liệu**: Nhập câu hỏi cụ thể kèm tên lớp, tên môn học hoặc tên học sinh.
- **Hỏi quy chế & chính sách**: Hỏi về điểm chuẩn benchmark, chỉ tiêu dự giờ, quy trình cảnh báo Vàng/Đỏ...
- **Dữ liệu thời gian thực**: Toàn bộ số liệu đều được trích xuất trực tiếp từ cơ sở dữ liệu hệ thống SSM.`;
  }

  // 2. Tra cứu Quy định, Cẩm nang & Hướng dẫn (Knowledge Base)
  // Ưu tiên trả lời nếu người dùng hỏi về khái niệm, quy định hoặc tiêu chuẩn
  const isAskingPolicyOrGuide =
    q.includes("quy định") ||
    q.includes("chính sách") ||
    q.includes("là gì") ||
    q.includes("như thế nào") ||
    q.includes("thế nào") ||
    q.includes("tiêu chuẩn") ||
    q.includes("hướng dẫn") ||
    q.includes("mấy tiết") ||
    q.includes("ở đâu") ||
    q.includes("quy trình");

  if (isAskingPolicyOrGuide) {
    const kbMatch = searchKnowledgeBase(message, role);
    if (kbMatch) {
      return kbMatch.content;
    }
  }

  // ==========================================================================
  // 2. NGHIỆP VỤ HỌC SINH (STUDENT)
  // ==========================================================================
  if (role === "STUDENT") {
    if (!context.studentId) {
      return "⚠️ **Thông báo**: Em cần đăng nhập vào Cổng thông tin học sinh để xem dữ liệu cá nhân của mình nhé.";
    }

    // A. Điểm số các môn
    if (q.includes("điểm") || q.includes("kết quả") || q.includes("học lực") || q.includes("bảng điểm")) {
      const res = await getStudentGrades(context.studentId);
      if (res.error) return `⚠️ ${res.error}`;
      if (!res.grades || res.grades.length === 0) {
        return `Chào em **${res.studentName}**, hiện tại Thầy/Cô chưa thấy có điểm môn học nào được cập nhật trên hệ thống cho tài khoản của em.`;
      }

      let text = `### 📊 Bảng Điểm Môn Học — ${res.studentName} (${res.className})\n\n`;
      text += `| Môn học | Kỳ đánh giá | Điểm tổng kết | Lời dặn giáo viên |\n`;
      text += `| :--- | :--- | :---: | :--- |\n`;
      res.grades.forEach(g => {
        text += `| **${g.subjectName}** | ${g.period || "Chung"} | **${g.compositeScore ?? "Chưa có"}** | ${g.teacherRemark} |\n`;
      });
      text += `\n> 💡 *Em hãy tiếp tục cố gắng phát huy các môn điểm cao và dành thêm thời gian cho các môn cần cải thiện nhé!*`;
      return text;
    }

    // B. Năng lực & Radar
    if (q.includes("năng lực") || q.includes("radar") || q.includes("kỹ năng") || q.includes("phẩm chất")) {
      const res = await getStudentCompetencies(context.studentId);
      if (res.error) return `⚠️ ${res.error}`;
      if (!res.competencies || res.competencies.length === 0) {
        return `Chào em **${res.studentName}**, hiện tại hệ thống chưa ghi nhận bảng tổng hợp đánh giá năng lực nào của em.`;
      }

      let text = `### 🎯 Báo Cáo Đánh Giá Năng Lực — ${res.studentName}\n\n`;
      res.competencies.forEach(c => {
        text += `- **${c.subject}**: Điểm đánh giá: **${c.subjectScore ?? "N/A"}** (Đã đánh giá ${c.evaluatedCount}/${c.totalCompetencies} chỉ số năng lực)\n`;
      });
      text += `\nEm có thể vào mục **Radar Năng Lực** trên thanh điều hướng để xem biểu đồ đa giác chi tiết nhé!`;
      return text;
    }

    // C. Sổ mục tiêu SMART & Kế hoạch 7 ngày
    if (q.includes("mục tiêu") || q.includes("7 ngày") || q.includes("gỡ khó") || q.includes("kế hoạch")) {
      const res = await getStudentGoalsAndPlans(context.studentId);
      if (res.error) return `⚠️ ${res.error}`;
      if (!res.goals || res.goals.length === 0) {
        return `Chào em **${res.studentName}**, em chưa đăng ký mục tiêu nào trong học kỳ này. Hãy vào mục **Sổ Mục Tiêu** để đặt mục tiêu cho mình nhé!`;
      }

      let text = `### 🎯 Sổ Mục Tiêu & Kế Hoạch — ${res.studentName} (Tổng cộng: ${res.totalGoals} mục tiêu)\n\n`;
      res.goals.forEach((g, idx) => {
        const statusBadge = g.status === "COMPLETED" ? "✅ Đã đạt" : "⏳ Đang tiến triển";
        text += `**${idx + 1}. ${g.targetText}** (${statusBadge})\n`;
        if (g.teacherComment) text += `  - 👩‍🏫 *Thầy/Cô nhận xét*: ${g.teacherComment}\n`;
        if (g.parentMessage) text += `  - 👨‍👩‍👧 *Ba mẹ nhắn nhủ*: ${g.parentMessage}\n`;
        if (g.sevenDayUnlocks && g.sevenDayUnlocks.length > 0) {
          g.sevenDayUnlocks.forEach(u => {
            text += `  - 🚀 *Kế hoạch 7 ngày gỡ khó*: ${u.sevenDayAction} (${u.status})\n`;
          });
        }
        text += `\n`;
      });
      return text;
    }

    // D. Thời khóa biểu
    if (q.includes("thời khóa biểu") || q.includes("tkb") || q.includes("lịch học") || q.includes("hôm nay học gì")) {
      const res = await getStudentTimetable(context.studentId);
      if (res.error) return `⚠️ ${res.error}`;
      if (!res.slots || res.slots.length === 0) {
        return `Hiện tại lớp **${res.className}** của em chưa có dữ liệu thời khóa biểu được cập nhật trong hệ thống.`;
      }

      let text = `### 📅 Thời Khóa Biểu — Lớp ${res.className}\n\n`;
      text += `| Thứ | Buổi | Tiết | Môn học | Giáo viên |\n`;
      text += `| :---: | :---: | :---: | :--- | :--- |\n`;
      res.slots.slice(0, 15).forEach(s => {
        text += `| ${s.dayOfWeek} | ${s.session} | Tiết ${s.periodNumber} | **${s.subjectName}** | ${s.teacherName} |\n`;
      });
      return text;
    }

    // E. Cố vấn & Hỗ trợ
    if (q.includes("cố vấn") || q.includes("hỗ trợ") || q.includes("yêu cầu") || q.includes("lời dặn")) {
      const res = await getStudentAdvisoryNotes(context.studentId);
      if (res.error) return `⚠️ ${res.error}`;

      let text = `### 🤝 Thông Tin Cố Vấn Học Tập — ${res.studentName}\n\n`;
      if (res.consultationLogs && res.consultationLogs.length > 0) {
        text += `#### 📝 Nhật ký gặp gỡ Cố vấn gần nhất:\n`;
        res.consultationLogs.forEach(l => {
          text += `- **Ngày ${l.meetingDate}** (Cùng Thầy/Cô ${l.teacherName}):\n  * Nội dung: ${l.content}\n  * Hành động tiếp theo: ${l.nextActions || "Tiếp tục rèn luyện"}\n`;
        });
      }
      if (res.helpRequests && res.helpRequests.length > 0) {
        text += `\n#### 🆘 Trạng thái các yêu cầu trợ giúp đã gửi:\n`;
        res.helpRequests.forEach(r => {
          text += `- [${r.urgency}] ${r.content} ➔ Trạng thái: **${r.status}** (${r.teacherFeedback})\n`;
        });
      }
      return text;
    }
  }

  // ==========================================================================
  // 3. NGHIỆP VỤ GIÁO VIÊN (TEACHER)
  // ==========================================================================
  if (role === "TEACHER") {
    // A. Cảnh báo học sinh nguy cơ Vàng / Đỏ lớp chủ nhiệm & Cố vấn học tập
    if (
      q.includes("vàng") ||
      q.includes("đỏ") ||
      q.includes("cảnh báo") ||
      q.includes("nguy cơ") ||
      q.includes("chủ nhiệm") ||
      q.includes("hỗ trợ") ||
      q.includes("cố vấn") ||
      q.includes("lưu ý") ||
      q.includes("yêu cầu trợ giúp") ||
      currentPath?.includes("co-van-hoc-tap")
    ) {
      const res = await getHomeroomAtRiskStudents(context.userId, currentPath);
      if (res.error) return `⚠️ ${res.error}`;

      let text = `### 🚨 Danh Sách Học Sinh Cần Lưu Ý — Lớp Chủ Nhiệm ${res.homeroomClass}\n\n`;
      text += `Tổng số học sinh thuộc diện cảnh báo: **${res.totalAtRisk} học sinh**\n\n`;

      if (res.atRiskList.length === 0) {
        text += `🎉 **Tuyệt vời**: Hiện tại lớp chủ nhiệm không có học sinh nào ở mức cảnh báo Vàng hoặc Đỏ!\n`;
      } else {
        text += `| Học sinh | Mã HS | Mức độ cảnh báo | Phân loại | Chi tiết |\n`;
        text += `| :--- | :---: | :---: | :--- | :--- |\n`;
        res.atRiskList.forEach(s => {
          text += `| **${s.studentName}** | ${s.studentCode} | **${s.color}** | ${s.category} | ${s.detail} |\n`;
        });
      }

      if (res.pendingRequests && res.pendingRequests.length > 0) {
        text += `\n#### 📩 Yêu cầu trợ giúp mới từ học sinh cần phản hồi (${res.pendingHelpRequestsCount}):\n`;
        res.pendingRequests.forEach(r => {
          text += `- **${r.studentName}** (${r.date} - Mức độ: ${r.urgency}): "${r.content}"\n`;
        });
      }
      return text;
    }

    // B. Học sinh dưới chuẩn benchmark
    if (q.includes("chuẩn") || q.includes("benchmark") || q.includes("dưới chuẩn") || q.includes("trượt")) {
      const res = await getBenchmarkAlerts(context.userId);
      if (res.error) return `⚠️ ${res.error}`;

      let text = `### 📉 Danh Sách Học Sinh Dưới Điểm Chuẩn Benchmark (${res.className})\n\n`;
      text += `- Ngưỡng chuẩn áp dụng: **${res.benchmarkStandard} điểm**\n`;
      text += `- Số học sinh chưa đạt chuẩn: **${res.totalUnderBenchmark} học sinh**\n\n`;

      if (res.students.length === 0) {
        text += `🎉 Tất cả học sinh được đánh giá đều đạt từ điểm chuẩn ${res.benchmarkStandard} trở lên!`;
      } else {
        text += `| Học sinh | Mã HS | Môn học | Điểm thực tế | Chuẩn | Chênh lệch |\n`;
        text += `| :--- | :---: | :--- | :---: | :---: | :---: |\n`;
        res.students.forEach(s => {
          text += `| **${s.studentName}** | ${s.studentCode} | ${s.subject} | **${s.score}** | ${s.benchmarkRequired} | -${s.gap} |\n`;
        });
      }
      return text;
    }

    // C. Tiến độ nhập điểm và phổ điểm lớp dạy
    if (q.includes("tiến độ") || q.includes("sổ điểm") || q.includes("phổ điểm") || q.includes("vào điểm") || q.includes("nhập điểm")) {
      const res = await getClassGradebookStatus(context.userId);
      if (res.error) return `⚠️ ${res.error}`;

      let text = `### 📋 Báo Cáo Sổ Điểm — Lớp ${res.className} (Môn: ${res.subjectName})\n\n`;
      text += `- **Sĩ số lớp**: ${res.totalStudents} học sinh\n`;
      text += `- **Đã vào điểm**: **${res.enteredCount}** / ${res.totalStudents} (${res.completionRate})\n`;
      text += `- **Còn thiếu**: **${res.missingCount}** học sinh\n`;
      text += `- **Điểm trung bình lớp**: **${res.averageScore}**\n`;
      text += `- **Điểm cao nhất**: **${res.highestScore}** | **Điểm thấp nhất**: **${res.lowestScore}**\n\n`;

      if (res.missingCount > 0) {
        text += `> ⚠️ *Thầy/Cô vui lòng hoàn thiện điểm cho ${res.missingCount} học sinh còn thiếu trước thời hạn khóa sổ điểm.*`;
      } else {
        text += `> ✅ *Lớp đã hoàn thành nhập điểm 100%!*`;
      }
      return text;
    }

    // D. Hoạt động dự giờ cá nhân
    if (q.includes("dự giờ") || q.includes("chỉ tiêu") || q.includes("tiết dạy")) {
      const res = await getTeacherObservationStatus(context.userId);
      if (res.error) return `⚠️ ${res.error}`;

      let text = `### 🏫 Hoạt Động Chuyên Môn & Dự Giờ — Thầy/Cô ${res.teacherName}\n\n`;
      text += `- **Tháng hiện tại**: Tháng ${res.month}/${res.year}\n`;
      text += `- **Số tiết đã đi dự giờ**: **${res.observedCount}** / ${res.quota} tiết chỉ tiêu\n`;
      text += `- **Trạng thái hoàn thành**: ${res.isQuotaCompleted ? "✅ Đã đạt chỉ tiêu tháng" : `⏳ Còn thiếu ${res.remainingSlots} tiết`}\n\n`;

      if (res.recentTaughtFeedbacks && res.recentTaughtFeedbacks.length > 0) {
        text += `#### 💬 Nhận xét đóng góp các tiết dạy gần nhất của Thầy/Cô:\n`;
        res.recentTaughtFeedbacks.forEach(f => {
          text += `- **Tiết: ${f.topic}** (${f.date}):\n`;
          if (f.strengths) text += `  * *Ưu điểm nổi bật*: ${f.strengths}\n`;
          if (f.improvements) text += `  * *Góp ý hoàn thiện*: ${f.improvements}\n`;
        });
      }
      return text;
    }

    // E. Soạn thảo nhận xét học sinh gợi ý
    if (q.includes("nhận xét") || q.includes("lời phê") || q.includes("dự thảo")) {
      // Tìm tên học sinh nếu có
      const cleanName = message.replace(/(soạn|thảo|nhận xét|lời phê|cho|học sinh|em|bạn)/gi, "").trim();
      if (cleanName.length > 2) {
        const res = await draftStudentEvaluationComment(cleanName);
        if (res.error) return `⚠️ ${res.error}`;

        let text = `### ✍️ Dự Thảo Lời Nhận Xét Học Kỳ — ${res.studentName} (${res.className})\n\n`;
        text += `- **Điểm trung bình các môn**: **${res.averageScore}**\n`;
        text += `- **Tiến độ mục tiêu SMART**: Đã đạt **${res.completedGoals}/${res.totalGoals}** mục tiêu\n\n`;
        text += `**Dự thảo gợi ý cho Thầy/Cô**:\n`;
        text += `> *"Em ${res.studentName} có thái độ học tập nghiêm túc, hoàn thành tốt các bài kiểm tra với điểm trung bình đạt ${res.averageScore}. Em chủ động đặt ra và nỗ lực bám sát các mục tiêu rèn luyện cá nhân. Đề nghị em tiếp tục duy trì tính tự giác, tích cực tương tác và phát huy năng lực trong các hoạt động nhóm."*\n`;
        return text;
      }
      return `Thầy/Cô vui lòng nhập kèm tên hoặc mã số của học sinh cần soạn nhận xét (Ví dụ: *"Soạn nhận xét cho học sinh Nguyễn Văn A"*).`;
    }
  }

  // ==========================================================================
  // 4. NGHIỆP VỤ TỔ TRƯỞNG CHUYÊN MÔN (TTCM)
  // ==========================================================================
  if (role === "TTCM") {
    // A. Giáo viên thuộc Tổ Chuyên Môn
    if (q.includes("giáo viên") || q.includes("thành viên") || q.includes("gv trong tổ") || q.includes("danh sách gv")) {
      const res = await getTCMTeachers(context.scopedDepartmentIds);
      if (res.error) return `⚠️ ${res.error}`;
      if (res.teachers.length === 0) return res.message || "Tổ chuyên môn hiện chưa có giáo viên nào được phân bổ.";

      let text = `### 👨‍🏫 Danh Sách Giáo Viên Thuộc Tổ Chuyên Môn (Tổng cộng: ${res.totalTeachers} Thầy/Cô)\n\n`;
      text += `| Họ và tên | Mã GV | Môn chính | Lớp CN | Cơ sở |\n`;
      text += `| :--- | :---: | :--- | :---: | :--- |\n`;
      res.teachers.forEach(t => {
        text += `| **${t.teacherName}** | ${t.teacherCode} | ${t.mainSubject} | ${t.homeroomClass} | ${t.campusName} |\n`;
      });
      return text;
    }

    // B. Chất lượng và tiến độ các bộ môn thuộc TCM
    if (q.includes("chất lượng") || q.includes("bộ môn") || q.includes("môn học") || q.includes("tiến độ") || q.includes("benchmark") || q.includes("dưới chuẩn")) {
      const res = await getTCMSubjectQuality(context.scopedDepartmentIds);
      if (res.error) return `⚠️ ${res.error}`;
      if (res.subjects.length === 0) return res.message || "Chưa có dữ liệu điểm số các môn thuộc Tổ chuyên môn.";

      let text = `### 📊 Báo Cáo Chất Lượng Các Bộ Môn Thuộc Tổ Chuyên Môn\n\n`;
      text += `| Môn học | Mã môn | Chuẩn BM | Số đầu điểm | ĐTB môn | Đạt chuẩn | Dưới chuẩn |\n`;
      text += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;
      res.subjects.forEach(s => {
        text += `| **${s.subjectName}** | ${s.subjectCode} | ${s.benchmarkStandard} | ${s.totalEntries} | **${s.averageScore}** | **${s.passRate}** | ${s.underBenchmarkCount} HS |\n`;
      });
      return text;
    }

    // C. Theo dõi hoạt động dự giờ trong TCM
    if (q.includes("dự giờ") || q.includes("chỉ tiêu") || q.includes("tiết dạy")) {
      const res = await getTCMObservationMonitoring(context.scopedDepartmentIds);
      if (res.error) return `⚠️ ${res.error}`;

      let text = `### 🏫 Tình Hình Dự Giờ Giáo Viên Trong Tổ Chuyên Môn (Tháng ${res.month}/${res.year})\n\n`;
      res.departments.forEach(d => {
        text += `#### 📌 ${d.departmentName}:\n`;
        text += `- **Sĩ số giáo viên**: ${d.totalTeachers} Thầy/Cô\n`;
        text += `- **Số tiết dạy đã tổ chức**: **${d.taughtSlotsCount}** tiết\n`;
        text += `- **Số lượt đi dự giờ**: **${d.observedCount}** / ${d.targetRequired} lượt (Tỷ lệ hoàn thành: **${d.completionRate}**)\n`;
        if (d.pendingTeachersCount > 0) {
          text += `- ⏳ **Các Thầy/Cô chưa hoàn thành chỉ tiêu tháng (${d.pendingTeachersCount})**:\n`;
          d.pendingTeachers.forEach(p => text += `  * ${p}\n`);
        } else {
          text += `- ✅ *100% giáo viên trong tổ đã đạt chỉ tiêu 2 tiết dự giờ/tháng!*\n`;
        }
      });
      return text;
    }
  }

  // ==========================================================================
  // 5. NGHIỆP VỤ TRƯỞNG BỘ PHẬN (TBP)
  // ==========================================================================
  if (role === "TBP") {
    // A. Giáo viên các Tổ chuyên môn trong Bộ Phận
    if (q.includes("giáo viên") || q.includes("danh sách gv") || q.includes("nhân sự")) {
      const res = await getTCMTeachers(context.scopedDepartmentIds);
      if (res.error) return `⚠️ ${res.error}`;

      let text = `### 👥 Danh Sách Giáo Viên Các Tổ Chuyên Môn Thuộc Bộ Phận (Tổng cộng: ${res.totalTeachers} GV)\n\n`;
      text += `| Họ và tên | Mã GV | Tổ Chuyên Môn | Môn chính | Lớp CN |\n`;
      text += `| :--- | :---: | :--- | :--- | :---: |\n`;
      res.teachers.forEach(t => {
        text += `| **${t.teacherName}** | ${t.teacherCode} | **${t.departmentName}** | ${t.mainSubject} | ${t.homeroomClass} |\n`;
      });
      return text;
    }

    // B. Chất lượng các môn học liên TCM trong Bộ Phận
    if (q.includes("chất lượng") || q.includes("tiến độ") || q.includes("môn học") || q.includes("benchmark") || q.includes("phổ điểm")) {
      const res = await getTCMSubjectQuality(context.scopedDepartmentIds);
      if (res.error) return `⚠️ ${res.error}`;

      let text = `### 📈 Báo Cáo Chất Lượng & Tiến Độ Môn Học Các Tổ Trong Bộ Phận\n\n`;
      text += `| Môn học | Mã môn | Chuẩn BM | Số điểm | ĐTB môn | Tỷ lệ đạt chuẩn | Dưới chuẩn |\n`;
      text += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;
      res.subjects.forEach(s => {
        text += `| **${s.subjectName}** | ${s.subjectCode} | ${s.benchmarkStandard} | ${s.totalEntries} | **${s.averageScore}** | **${s.passRate}** | **${s.underBenchmarkCount}** HS |\n`;
      });
      return text;
    }

    // C. Giám sát Dự giờ nhiều TCM trong Bộ Phận
    if (q.includes("dự giờ") || q.includes("chỉ tiêu") || q.includes("tiết dạy")) {
      const res = await getTCMObservationMonitoring(context.scopedDepartmentIds);
      if (res.error) return `⚠️ ${res.error}`;

      let text = `### 🏫 Giám Sát Hoạt Động Dự Giờ Các Tổ Chuyên Môn Trong Bộ Phận (Tháng ${res.month}/${res.year})\n\n`;
      text += `| Tổ Chuyên Môn | Sĩ số GV | Tiết dạy | Lượt dự | Chỉ tiêu | Tỷ lệ hoàn thành | Chưa đạt |\n`;
      text += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;
      res.departments.forEach(d => {
        text += `| **${d.departmentName}** | ${d.totalTeachers} | ${d.taughtSlotsCount} | ${d.observedCount} | ${d.targetRequired} | **${d.completionRate}** | ${d.pendingTeachersCount} GV |\n`;
      });
      return text;
    }
  }

  // ==========================================================================
  // 6. NGHIỆP VỤ PHỤ HUYNH (PARENT) — BẢO MẬT CHẶT CHẼ
  // ==========================================================================
  if (role === "PARENT") {
    // Ngăn chặn truy cập dữ liệu ngoài phạm vi con em
    if (q.includes("toàn trường") || q.includes("lớp khác") || q.includes("dự giờ") || q.includes("lương") || q.includes("giáo viên trường")) {
      return `Kính thưa Quý Phụ huynh, để bảo đảm quyền riêng tư sư phạm và an toàn thông tin học sinh, tài khoản Phụ huynh chỉ được quyền tra cứu kết quả kiểm tra và hồ sơ cố vấn của chính con em mình. Quý Phụ huynh có thể tra cứu:
1. **Kết quả kiểm tra & bảng điểm của con**
2. **Sổ mục tiêu SMART & nhận xét của Thầy/Cô cố vấn**
3. **Kế hoạch 7 ngày gỡ khó của con**`;
    }

    // A. Báo cáo kết quả kiểm tra của con
    if (q.includes("điểm") || q.includes("học tập") || q.includes("kết quả") || q.includes("kiểm tra") || q.includes("bảng điểm") || q.includes("con")) {
      const res = await getChildAcademicProgress(context.userId);
      if (res.error) return `⚠️ ${res.error}`;

      let text = `### 🎓 Kết Quả Kiểm Tra & Học Tập Của Con: ${res.studentName} (${res.className})\n\n`;
      text += `- **Điểm trung bình hiện tại**: **${res.averageScore}**\n`;
      text += `- **Số môn đã hoàn thành đánh giá**: ${res.totalSubjectsEvaluated} môn\n\n`;

      if (res.subjectDetails && res.subjectDetails.length > 0) {
        text += `| Môn học | Kỳ đánh giá | Điểm tổng kết | Lời nhắn & Nhận xét của Thầy/Cô |\n`;
        text += `| :--- | :---: | :---: | :--- |\n`;
        res.subjectDetails.forEach(s => {
          text += `| **${s.subject}** | ${s.period || "Chung"} | **${s.compositeScore ?? "Chưa có"}** | ${s.teacherRemark} |\n`;
        });
      }
      return text;
    }

    // B. Cố vấn học tập theo Học sinh & Sổ mục tiêu của con
    if (q.includes("cố vấn") || q.includes("mục tiêu") || q.includes("rèn luyện") || q.includes("lời dặn") || q.includes("thầy cô") || q.includes("7 ngày")) {
      const res = await getChildGoalsAndTeacherNotes(context.userId);
      if (res.error) return `⚠️ ${res.error}`;

      let text = `### 🌟 Sổ Mục Tiêu & Cố Vấn Học Tập Của Con: ${res.studentName}\n\n`;
      if (!res.goals || res.goals.length === 0) {
        text += `Hiện tại con chưa đăng ký mục tiêu nào trong học kỳ này.\n`;
      } else {
        res.goals.forEach((g, idx) => {
          text += `**${idx + 1}. ${g.targetText}** (Trạng thái: ${g.status})\n`;
          if (g.teacherComment) text += `  - 👩‍🏫 *Nhận xét từ GVCN*: ${g.teacherComment}\n`;
          if (g.parentSupportRequest) text += `  - 💬 *Mong muốn con gửi gắm ba mẹ*: ${g.parentSupportRequest}\n`;
          if (g.sevenDayPlan && g.sevenDayPlan.length > 0) {
            g.sevenDayPlan.forEach(p => {
              text += `  - 🚀 *Kế hoạch 7 ngày*: ${p.action} (${p.status})\n`;
            });
          }
        });
      }

      if (res.recentAdvisoryMeetings && res.recentAdvisoryMeetings.length > 0) {
        text += `\n#### 📝 Nhật ký gặp gỡ Cố vấn học tập gần nhất:\n`;
        res.recentAdvisoryMeetings.forEach(m => {
          text += `- **Ngày ${m.date}** (Cùng Thầy/Cô ${m.teacherName}):\n  * Nội dung: ${m.content}\n  * Giải pháp tiếp theo: ${m.nextActions || "Tiếp tục rèn luyện"}\n`;
        });
      }
      return text;
    }
  }

  // ==========================================================================
  // 7. NGHIỆP VỤ BAN ĐHCM & ADMIN (TOÀN QUYỀN TRUY XUẤT TOÀN BỘ HỆ THỐNG)
  // ==========================================================================
  if (role === "ADMIN") {
    // A. Tiến độ sổ điểm toàn trường
    if (q.includes("tiến độ") || q.includes("sổ điểm") || q.includes("toàn trường") || q.includes("nhập điểm")) {
      const res = await getSchoolwideGradebookProgress();
      if (res.error) return `⚠️ ${res.error}`;

      let text = `### 📊 Báo Cáo Tiến Độ Sổ Điểm Toàn Trường — Ban ĐHCM & BGH\n\n`;
      text += `- **Tổng số lớp học**: ${res.totalClasses} lớp\n`;
      text += `- **Tổng số học sinh**: ${res.totalStudents} học sinh\n`;
      text += `- **Tổng số đầu điểm đã vào**: **${res.totalGradeEntries}** điểm\n\n`;
      text += `| Lớp | Cơ sở | Khối | Sĩ số | Số điểm đã nhập |\n`;
      text += `| :--- | :--- | :---: | :---: | :---: |\n`;
      res.classesSummary.forEach(c => {
        text += `| **${c.className}** | ${c.campus || "Chưa rõ"} | ${c.grade} | ${c.studentCount} | **${c.entriesCount}** |\n`;
      });
      return text;
    }

    // B. Hoạt động dự giờ tất cả các tổ chuyên môn
    if (q.includes("tổ chuyên môn") || q.includes("dự giờ") || q.includes("chỉ tiêu tổ") || q.includes("tất cả tổ")) {
      const res = await getDepartmentObservationStats();
      if (res.error) return `⚠️ ${res.error}`;

      let text = `### 🏫 Hoạt Động Dạy & Dự Giờ Tất Cả Tổ Chuyên Môn Toàn Trường (Tháng ${res.currentMonth}/${res.currentYear})\n\n`;
      text += `| Tổ chuyên môn | Số GV | Tiết dạy | Đã dự | Chỉ tiêu | Tỷ lệ hoàn thành |\n`;
      text += `| :--- | :---: | :---: | :---: | :---: | :---: |\n`;
      res.departments.forEach(d => {
        text += `| **${d.departmentName}** | ${d.totalTeachers} | ${d.taughtSlotsCount} | ${d.observedCount} | ${d.targetRequired} | **${d.completionRate}** |\n`;
      });
      return text;
    }

    // C. Cảnh báo nguy cơ toàn trường
    if (q.includes("cảnh báo") || q.includes("nguy cơ") || q.includes("vàng") || q.includes("đỏ")) {
      const res = await getSystemAtRiskOverview();
      if (res.error) return `⚠️ ${res.error}`;

      let text = `### 🚨 Tổng Hợp Cảnh Báo Nguy Cơ Toàn Hệ Thống\n\n`;
      text += `- **Tổng số học sinh được theo dõi**: ${res.totalTrackedStudents} học sinh\n`;
      text += `- 🟢 **Xanh (Bình thường)**: ${res.greenCount} học sinh\n`;
      text += `- 🟡 **Vàng (Cần lưu ý)**: ${res.yellowCount} học sinh\n`;
      text += `- 🔴 **Đỏ (Nguy cơ cao)**: **${res.redCount}** học sinh (${res.redAlertPercentage})\n\n`;

      if (res.urgentCases && res.urgentCases.length > 0) {
        text += `#### ⚠️ Các trường hợp báo động Đỏ cần Ban Giám Hiệu & GVCN can thiệp sớm:\n`;
        res.urgentCases.forEach(c => {
          text += `- **${c.studentName}** (${c.className} - ${c.campus}): Lý do: *${c.reason}* — Chi tiết: ${c.detail}\n`;
        });
      }
      return text;
    }

    // D. Khảo sát NPS Phụ huynh
    if (q.includes("nps") || q.includes("khảo sát") || q.includes("hài lòng")) {
      const res = await getSchoolwideSurveyNPS();
      if (res.error) return `⚠️ ${res.error}`;
      if (res.message) return `ℹ️ ${res.message}`;

      let text = `### 📈 Báo Cáo Chỉ Số NPS Khảo Sát Ý Kiến PHHS\n\n`;
      text += `- **Kỳ khảo sát**: ${res.surveyPeriodName}\n`;
      text += `- **Tỷ lệ hoàn thành**: **${res.completionRate}** (${res.surveyedStudents}/${res.totalStudentsTarget} phụ huynh)\n`;
      text += `- **Điểm hài lòng trung bình**: **${res.averageSatisfactionScore}** / 5.0\n`;
      text += `- **Chỉ số NPS**: **+${res.npsValue}**\n`;
      text += `- **Phân bố**: ${res.promoters} Promoters (Ủng hộ) | ${res.passives} Passives (Trung lập) | ${res.detractors} Detractors (Chưa hài lòng)\n`;
      return text;
    }

    // E. Danh sách giáo viên toàn trường
    if (q.includes("giáo viên") || q.includes("danh sách gv")) {
      const res = await getTCMTeachers(null);
      if (res.error) return `⚠️ ${res.error}`;

      let text = `### 👥 Danh Sách Đội Ngũ Giáo Viên Toàn Trường (Tổng cộng: ${res.totalTeachers} Thầy/Cô)\n\n`;
      text += `| Họ và tên | Mã GV | Tổ Chuyên Môn | Môn chính | Lớp CN |\n`;
      text += `| :--- | :---: | :--- | :--- | :---: |\n`;
      res.teachers.slice(0, 20).forEach(t => {
        text += `| **${t.teacherName}** | ${t.teacherCode} | ${t.departmentName} | ${t.mainSubject} | ${t.homeroomClass} |\n`;
      });
      if (res.totalTeachers > 20) {
        text += `\n*(Hiển thị 20/${res.totalTeachers} Thầy/Cô tiêu biểu. Thầy/Cô có thể tìm kiếm theo tên hoặc mã GV)*`;
      }
      return text;
    }
  }

  // Fallback 1: Tra cứu trong Cẩm nang & Quy chế (Knowledge Base)
  const fallbackKbMatch = searchKnowledgeBase(message, role);
  if (fallbackKbMatch) {
    return fallbackKbMatch.content;
  }

  // Fallback 2: Nếu câu hỏi hoàn toàn chưa khớp nội dung nào
  return `Tôi đã tiếp nhận câu hỏi của Thầy/Cô: *" ${message} "*.

Hiện tại trong hệ thống SSM, Thầy/Cô có thể tra cứu nhanh các mục dữ liệu sau:
1. **Lớp chủ nhiệm có học sinh nào ở trạng thái Vàng hoặc Đỏ?**
2. **Lớp có những học sinh nào dưới điểm chuẩn benchmark?**
3. **Thống kê tiến độ nhập điểm và phổ điểm của lớp**
4. **Kiểm tra chỉ tiêu dự giờ cá nhân trong tháng**
5. **Soạn thảo gợi ý nhận xét học kỳ cho học sinh**

Thầy/Cô có thể bấm vào một trong các câu hỏi gợi ý nhanh bên dưới để xem số liệu ngay lập tức nhé!`;
}
