import { AIUserContext, AIAssistantResponse, AIIntent } from "../types";
import { sanitizePrompt } from "../guardrails/promptSanitizer";
import { logAIAudit } from "../audit/auditLogger";
import { classifyIntent } from "./intentClassifier";
import { retrieveKnowledge } from "../rag/retriever";
import { getStudentExamAnalysis, getClassExamAnalysis } from "../tools/examAnalysisTool";
import { getTeacherObservationAnalysis } from "../tools/observationAnalysisTool";
import { getStudentAdvisoryAnalysis } from "../tools/advisoryAnalysisTool";
import { generateSmartStudentComment, CommentStyle } from "../tools/smartCommentTool";
import { generateExecutiveReport, ReportType } from "../tools/executiveReportTool";
import { calculateStudentHealthIndex, calculateClassHealthMatrix } from "../analytics/healthIndexEngine";
import { PERSONAS } from "@/lib/assistant/personas";


export async function processAIOptimizedQuery(
  rawQuery: string,
  userContext: AIUserContext,
  currentPath: string = ""
): Promise<AIAssistantResponse> {
  const startTime = Date.now();
  const traceId = `ai_trc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const persona = PERSONAS[userContext.role] || PERSONAS.TEACHER;

  // 1. Guardrail Check: Prompt Sanitization
  const sanitization = sanitizePrompt(rawQuery);
  if (!sanitization.isSafe) {
    const latencyMs = Date.now() - startTime;
    logAIAudit({
      traceId,
      userId: userContext.userId,
      role: userContext.role,
      intent: "GENERAL_INQUIRY",
      permissionDecision: "DENIED",
      latencyMs,
      isSuccess: false,
      modelUsed: "enterprise-guardrail",
      errorMessage: sanitization.violationReason
    });

    return {
      success: false,
      text: `⚠️ **Thông báo an toàn**: ${sanitization.violationReason}`,
      intent: "GENERAL_INQUIRY",
      role: userContext.role,
      personaName: persona.name,
      badge: persona.badge,
      primaryColor: persona.primaryColor,
      traceId,
      latencyMs
    };
  }

  const query = sanitization.cleanText;
  const intent: AIIntent = classifyIntent(query, currentPath);

  let responseText = "";
  let sources: any[] = [];
  let toolsUsed: string[] = [];
  let analyticsContext: any = undefined;
  let pendingAction: any = undefined;
  let decision: "APPROVED" | "DENIED" | "SCOPE_RESTRICTED" = "APPROVED";

  try {
    // ========================================================================
    // WAVE 2: ACTION REQUEST (Soạn thảo Email / Báo cáo có Human Confirmation)
    // ========================================================================
    if (intent === "ACTION_REQUEST") {
      toolsUsed.push("draftActionProposal");
      const { draftAction } = await import("../actions/actionDrafter");

      let actionType: any = "ACTION_SEND_ADVISORY_EMAIL";
      if (query.includes("sổ điểm") || query.includes("vào điểm") || query.includes("hạn nộp")) {
        actionType = "ACTION_SEND_GRADEBOOK_REMINDER";
      } else if (query.includes("dự giờ") || query.includes("chỉ tiêu")) {
        actionType = "ACTION_SEND_OBSERVATION_REMINDER";
      }

      const draftResult = await draftAction(userContext, actionType, {
        studentId: userContext.studentId,
        classId: userContext.classId
      });

      if (draftResult.success && draftResult.proposal) {
        pendingAction = draftResult.proposal;
        responseText = `⚡ **Yêu Cầu Xác Nhận Hành Động (Human Confirmation Required)**\n\n` +
          `Tôi đã chuẩn bị xong bản thảo: **${draftResult.proposal.title}**.\n\n` +
          `Theo chính sách an toàn của Sky-Line, hệ thống **không bao giờ tự động gửi email mà chưa có sự đồng ý của Thầy/Cô**.\n` +
          `Kính mời Thầy/Cô xem thông tin dự thảo bên dưới và bấm nút **[Xác Nhận Thực Hiện]** để hệ thống gửi đi.`;
      } else {
        responseText = `⚠️ **Không thể khởi tạo hành động**: ${draftResult.error || "Dữ liệu không đủ điều kiện."}`;
        decision = "DENIED";
      }
    }

    // ========================================================================
    // PRIORITY 1: KNOWLEDGE RAG QUERIES (Quy chế, quy trình, hướng dẫn)
    // ========================================================================
    else if (intent === "KNOWLEDGE_SEARCH") {
      toolsUsed.push("searchKnowledge");
      const ragResult = await retrieveKnowledge(query, userContext);
      responseText = ragResult.content;
      sources = ragResult.citations;
    }

    // ========================================================================
    // PRIORITY 2: EXAM & GRADEBOOK ANALYSIS (Kiểm tra & Sổ điểm)
    // ========================================================================
    else if (intent === "EXAM_ANALYSIS") {
      toolsUsed.push(userContext.role === "STUDENT" ? "getStudentExamAnalysis" : "getClassExamAnalysis");

      if (userContext.role === "STUDENT") {
        if (!userContext.studentId) {
          responseText = "⚠️ Em cần đăng nhập vào Cổng học sinh để xem dữ liệu điểm kiểm tra cá nhân.";
          decision = "SCOPE_RESTRICTED";
        } else {
          const res = await getStudentExamAnalysis(userContext.studentId, userContext);
          responseText = res.markdown;
          analyticsContext = { module: "EXAM_ANALYSIS", metrics: res.metrics };
        }
      } else if (userContext.classId) {
        const res = await getClassExamAnalysis(userContext.classId, userContext);
        responseText = res.markdown;
        analyticsContext = { module: "EXAM_ANALYSIS", metrics: res.metrics };
      } else {
        // Schoolwide or homeroom default
        responseText = `### 📊 Hướng Dẫn Phân Tích Điểm Kiểm Tra\nThầy/Cô có thể chỉ định lớp học hoặc tên học sinh cụ thể để xem thống kê phổ điểm và tỷ lệ đạt chuẩn Benchmark.\n\n*Ví dụ: "Phân tích điểm lớp 8.1" hoặc "Xem kết quả kiểm tra của học sinh".*`;
      }
    }

    // ========================================================================
    // PRIORITY 3: OBSERVATION ANALYSIS (Dự giờ & Phát triển chuyên môn)
    // ========================================================================
    else if (intent === "OBSERVATION_ANALYSIS") {
      toolsUsed.push("getTeacherObservationAnalysis");
      const res = await getTeacherObservationAnalysis(
        userContext,
        userContext.teacherId,
        userContext.departmentId
      );
      responseText = res.markdown;
      analyticsContext = { module: "OBSERVATION_ANALYSIS", metrics: res.metrics };
    }

    // ========================================================================
    // PRIORITY 4: ADVISORY & SMART GOALS (Cố vấn học tập & Sổ mục tiêu)
    // ========================================================================
    else if (intent === "ADVISORY_ANALYSIS") {
      toolsUsed.push("getStudentAdvisoryAnalysis");
      const res = await getStudentAdvisoryAnalysis(
        userContext,
        userContext.studentId,
        userContext.classId
      );
      responseText = res.markdown;
      analyticsContext = { module: "ADVISORY_ANALYSIS", metrics: res.metrics };
    }

    // ========================================================================
    // WAVE 3: AI SMART COMMENT GENERATOR (Nhận xét học bạ 360°)
    // ========================================================================
    else if (intent === "SMART_COMMENT") {
      toolsUsed.push("generateSmartStudentComment");

      let style: CommentStyle = "ENCOURAGING";
      if (query.includes("khen thưởng") || query.includes("bứt phá") || query.includes("xuất sắc")) {
        style = "COMMENDATORY";
      } else if (query.includes("nghiêm túc") || query.includes("rèn luyện") || query.includes("kỷ luật")) {
        style = "CONSTRUCTIVE";
      }

      // Tách tên học sinh từ truy vấn nếu có
      let studentIdentifier = userContext.studentId || "";
      const cleanName = query.replace(/(soạn|gợi ý|thảo|viết|nhận xét|học bạ|học kỳ|cho|học sinh|em|bạn|phong cách|khích lệ|khen thưởng|bứt phá|nghiêm túc|rèn luyện|đồng hành)/gi, "").trim();

      if (cleanName.length >= 2) {
        studentIdentifier = cleanName;
      }

      if (!studentIdentifier) {
        responseText = `### ✍️ Trợ Lý Soạn Thảo Nhận Xét Học Bạ 360°\n\nThầy/Cô vui lòng nhập kèm **Tên** hoặc **Mã số** của học sinh cần soạn nhận xét.\n\n*Ví dụ: "Soạn nhận xét cho học sinh Nguyễn Văn A phong cách khích lệ" hoặc "Gợi ý nhận xét cho mã HS 24001".*`;
      } else {
        const commentRes = await generateSmartStudentComment(studentIdentifier, userContext, style);
        responseText = commentRes.markdown;
        analyticsContext = { module: "SMART_COMMENT", style: commentRes.styleUsed, metrics: commentRes.metricsSummary };
      }
    }

    // ========================================================================
    // WAVE 3: ONE-CLICK EXECUTIVE PDF / REPORT EXPORT
    // ========================================================================
    else if (intent === "EXECUTIVE_REPORT") {
      toolsUsed.push("generateExecutiveReport");

      let reportType: ReportType = "CLASS_ACADEMIC_REPORT";
      if (query.includes("dự giờ") || query.includes("tiêu chí") || query.includes("tiết dạy")) {
        reportType = "OBSERVATION_MATRIX_REPORT";
      } else if (query.includes("rủi ro") || query.includes("sức khỏe") || query.includes("audit") || query.includes("ews")) {
        reportType = "HOLISTIC_HEALTH_AUDIT_REPORT";
      }

      const targetId = userContext.classId || userContext.teacherId || "";
      if (!targetId && reportType !== "OBSERVATION_MATRIX_REPORT") {
        responseText = `### 📑 Trợ Lý Xuất Báo Cáo Điều Hành\n\nVui lòng chọn một lớp học cụ thể hoặc chỉ định mã lớp để xuất báo cáo phân tích chuẩn Sky-Line.\n\n*Ví dụ: Thầy/Cô có thể vào trang Lớp chủ nhiệm hoặc Sổ điểm rồi nhấn yêu cầu.*`;
      } else {
        const reportRes = await generateExecutiveReport(reportType, targetId, userContext);
        responseText = reportRes.markdown;
        analyticsContext = { module: "EXECUTIVE_REPORT", type: reportRes.reportType, printUrl: reportRes.printUrl };
      }
    }

    // ========================================================================
    // WAVE 3: AI EARLY WARNING SYSTEM (EWS) & STUDENT HEALTH INDEX
    // ========================================================================
    else if (intent === "HEALTH_INDEX") {
      toolsUsed.push(userContext.studentId ? "calculateStudentHealthIndex" : "calculateClassHealthMatrix");

      if (userContext.studentId) {
        const health = await calculateStudentHealthIndex(userContext.studentId);
        if (!health) {
          responseText = "⚠️ Không tìm thấy dữ liệu sức khỏe học tập của học sinh.";
        } else {
          responseText =
            `### 🛡️ Chỉ Số Sức Khỏe Học Tập Toàn Diện (HHI) — ${health.studentName} (${health.className})\n\n` +
            `- **Điểm Tổng Hợp HHI**: **${health.hhiScore} / 100** — ${health.tierLabel}\n\n` +
            `#### 📊 Phân Rã 4 Trọng Số Cốt Lõi:\n` +
            `| Trọng số | Trụ cột đánh giá | Điểm số | Trạng thái |\n` +
            `| :--- | :--- | :--- | :--- |\n` +
            `| 40% | 📚 Điểm Học Lực & Benchmark | **${health.components.academicScore}/100** | ĐTB: ${health.rawMetrics.avgScore || "N/A"} (${health.rawMetrics.belowBenchmarkCount} môn dưới chuẩn) |\n` +
            `| 25% | 🎯 Khoảng Cách Mục Tiêu GAP | **${health.components.gapScore}/100** | Tỷ lệ đạt: ${Math.round(health.rawMetrics.completedGoalsRatio * 100)}% |\n` +
            `| 20% | ⏳ Tiến Độ Gỡ Rào Cản 7 Ngày | **${health.components.barrierScore}/100** | Hoàn thành: ${Math.round(health.rawMetrics.resolvedBarriersRatio * 100)}% |\n` +
            `| 15% | 🤝 Tương Tác & Cảm Xúc Hỗ Trợ | **${health.components.wellbeingScore}/100** | SOS chưa xử lý: ${health.rawMetrics.pendingUrgentHelpCount} |\n\n` +
            `---\n\n` +
            `#### 💡 Đề Xuất Phác Đồ Can Thiệp:\n` +
            `${health.insights.recommendedIntervention}\n`;
        }
      } else if (userContext.classId) {
        const matrix = await calculateClassHealthMatrix(userContext.classId);
        if (!matrix) {
          responseText = "⚠️ Không thể phân tích ma trận sức khỏe học sinh của lớp.";
        } else {
          const redList = matrix.students.filter(s => s.tier === "RED").map(s => `- 🔴 **${s.studentName}** (\`${s.studentCode}\`): HHI **${s.hhiScore}/100**`).join("\n");
          const yellowList = matrix.students.filter(s => s.tier === "YELLOW").slice(0, 5).map(s => `- 🟡 **${s.studentName}** (\`${s.studentCode}\`): HHI **${s.hhiScore}/100**`).join("\n");

          responseText =
            `### 🛡️ Ma Trận Sức Khỏe Học Tập (HHI) — ${matrix.className}\n\n` +
            `> 📊 **Điểm Sức Khỏe Trung Bình Của Lớp**: **${matrix.averageHHI} / 100** | **Tổng sĩ số**: ${matrix.totalStudents} HS\n\n` +
            `#### 🚦 Phân Bố Theo Mức Độ Rủi Ro:\n` +
            `- 🟢 **Xanh (Tự chủ tốt)**: **${matrix.distribution.greenCount} HS** (${matrix.distribution.greenPercent}%)\n` +
            `- 🟡 **Vàng (Cần lưu tâm)**: **${matrix.distribution.yellowCount} HS** (${matrix.distribution.yellowPercent}%)\n` +
            `- 🔴 **Đỏ (Nguy cơ tụt dốc)**: **${matrix.distribution.redCount} HS** (${matrix.distribution.redPercent}%)\n\n` +
            (redList ? `#### 🚨 Học Sinh Nhóm Đỏ (Cần hành động khẩn cấp):\n${redList}\n\n` : "") +
            (yellowList ? `#### ⚠️ Học Sinh Nhóm Vàng (Đang theo dõi):\n${yellowList}\n\n` : "") +
            `Thầy/Cô có thể gõ *"Xuất báo cáo kiểm toán rủi ro"* để lấy bản in PDF chi tiết cho Ban Giám Hiệu.`;
        }
      } else {
        responseText = `### 🛡️ Trợ Lý Hệ Thống Cảnh Báo Sớm (EWS)\n\nThầy/Cô vui lòng chỉ định lớp học để phân tích Ma trận Sức khỏe Học tập Toàn diện (HHI) dựa trên 4 trọng số thực tế.`;
      }
    }

    // ========================================================================
    // GENERAL INQUIRY (Chào hỏi, Nghiệp vụ chung & Native Fallback)
    // ========================================================================
    else {
      try {
        const { processNativeAssistantQuery } = await import("@/lib/assistant/nativeEngine");
        const nativeResponse = await processNativeAssistantQuery(
          query,
          {
            userId: userContext.userId,
            userName: userContext.userName,
            role: userContext.role,
            campusId: userContext.campusId,
            scopedDepartmentIds: userContext.allowedCampusIds,
            departmentId: userContext.departmentId,
            managedDepartmentIds: userContext.managedDepartmentIds,
            managedDivisions: userContext.managedDivisions,
            isHeadOfAcademic: userContext.isHeadOfAcademic,
            isTBP: userContext.isTBP,
            isTTCM: userContext.isTTCM,
            teacherId: userContext.teacherId,
            studentId: userContext.studentId,
            classId: userContext.classId
          },
          currentPath
        );

        if (nativeResponse && !nativeResponse.includes("Thầy/Cô và các bạn có thể bấm vào các gợi ý nhanh phía dưới")) {
          responseText = nativeResponse;
          toolsUsed.push("nativeEngineFallback");
        } else {
          responseText = `Xin chào! Tôi là **${persona.name}** (${persona.badge}) của Hệ thống Giáo dục Sky-Line.\n\nTôi sẵn sàng đồng hành cùng Thầy/Cô và Em với các nhóm năng lực nâng cao:\n` +
            `1. 📖 **Tra cứu Quy chế & Quy trình SSM**: Benchmark chất lượng, 11 tiêu chí dự giờ, quy trình mở khóa sổ điểm.\n` +
            `2. 📈 **Phân tích Kiểm tra & Sổ điểm**: Phổ điểm, tỷ lệ đạt chuẩn, cảnh báo nộp trễ hạn.\n` +
            `3. 🎯 **Cố vấn & Sức khỏe Học tập (HHI)**: Chỉ số 0-100, kế hoạch 7 ngày, phát hiện sớm nguy cơ Xanh/Vàng/Đỏ.\n` +
            `4. ✍️ **Sinh Nhận Xét Học Bạ 360°**: Cá nhân hóa theo 3 phong cách (Khích lệ, Khen thưởng, Rèn luyện).\n` +
            `5. 📑 **Xuất Báo Cáo Điều Hành PDF**: Báo cáo phổ điểm, ma trận dự giờ và rà soát rủi ro toàn diện.\n\n` +
            `Thầy/Cô và Em có thể chọn nhanh một câu hỏi gợi ý bên dưới hoặc nhập câu hỏi trực tiếp!`;
        }
      } catch {
        responseText = `Xin chào! Tôi là **${persona.name}** (${persona.badge}) của Hệ thống Giáo dục Sky-Line.\n\nTôi sẵn sàng đồng hành cùng Thầy/Cô và Em với các nhóm năng lực nâng cao:\n` +
          `1. 📖 **Tra cứu Quy chế & Quy trình SSM**: Benchmark chất lượng, 11 tiêu chí dự giờ, quy trình mở khóa sổ điểm.\n` +
          `2. 📈 **Phân tích Kiểm tra & Sổ điểm**: Phổ điểm, tỷ lệ đạt chuẩn, cảnh báo nộp trễ hạn.\n` +
          `3. 🎯 **Cố vấn & Sức khỏe Học tập (HHI)**: Chỉ số 0-100, kế hoạch 7 ngày, phát hiện sớm nguy cơ Xanh/Vàng/Đỏ.\n` +
          `4. ✍️ **Sinh Nhận Xét Học Bạ 360°**: Cá nhân hóa theo 3 phong cách (Khích lệ, Khen thưởng, Rèn luyện).\n` +
          `5. 📑 **Xuất Báo Cáo Điều Hành PDF**: Báo cáo phổ điểm, ma trận dự giờ và rà soát rủi ro toàn diện.\n\n` +
          `Thầy/Cô và Em có thể chọn nhanh một câu hỏi gợi ý bên dưới hoặc nhập câu hỏi trực tiếp!`;
      }
    }

  } catch (err: any) {
    console.error("AI Orchestrator Error:", err);
    responseText = `⚠️ Đã xảy ra lỗi trong quá trình xử lý: ${err.message || "Vui lòng thử lại sau ít phút."}`;
    decision = "DENIED";
  }

  const latencyMs = Date.now() - startTime;

  // Audit Logging
  logAIAudit({
    traceId,
    userId: userContext.userId,
    role: userContext.role,
    intent,
    toolCalled: toolsUsed.join(", "),
    permissionDecision: decision,
    latencyMs,
    isSuccess: true,
    modelUsed: "enterprise-orchestrator-wave1"
  });

  return {
    success: true,
    text: responseText,
    intent,
    role: userContext.role,
    personaName: persona.name,
    badge: persona.badge,
    primaryColor: persona.primaryColor,
    sources,
    toolsUsed,
    analyticsContext,
    pendingAction,
    traceId,
    latencyMs
  };
}
