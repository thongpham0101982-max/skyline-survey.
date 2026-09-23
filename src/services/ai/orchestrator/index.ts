import { AIUserContext, AIAssistantResponse, AIIntent } from "../types";
import { sanitizePrompt } from "../guardrails/promptSanitizer";
import { logAIAudit } from "../audit/auditLogger";
import { classifyIntent } from "./intentClassifier";
import { retrieveKnowledge } from "../rag/retriever";
import { getStudentExamAnalysis, getClassExamAnalysis } from "../tools/examAnalysisTool";
import { getTeacherObservationAnalysis } from "../tools/observationAnalysisTool";
import { getStudentAdvisoryAnalysis } from "../tools/advisoryAnalysisTool";
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
          responseText = `Xin chào! Tôi là **${persona.name}** (${persona.badge}) của Hệ thống Giáo dục Sky-Line.\n\nTrong Wave 1, tôi sẵn sàng hỗ trợ Thầy/Cô và Em 4 năng lực cốt lõi:\n` +
            `1. 📖 **Tra cứu Quy chế & Quy trình SSM**: Điểm chuẩn benchmark, định mức dự giờ 11 tiêu chí, quy trình mở khóa sổ điểm.\n` +
            `2. 📈 **Phân tích Kết quả Kiểm tra**: Phổ điểm, tỷ lệ đạt chuẩn, so sánh các kỳ kiểm tra định kỳ.\n` +
            `3. 📋 **Phân tích Hoạt động Dự giờ**: Điểm trung bình 11 tiêu chí, nhận xét ưu điểm và tiêu chí cần bồi dưỡng.\n` +
            `4. 🎯 **Hồ sơ Cố vấn & Mục tiêu SMART**: Đánh giá khoảng chênh GAP, kế hoạch 7 ngày gỡ khó, cảnh báo học sinh Xanh/Vàng/Đỏ.\n\n` +
            `Thầy/Cô và Em có thể chọn nhanh một câu hỏi gợi ý bên dưới hoặc nhập câu hỏi trực tiếp!`;
        }
      } catch {
        responseText = `Xin chào! Tôi là **${persona.name}** (${persona.badge}) của Hệ thống Giáo dục Sky-Line.\n\nTrong Wave 1, tôi sẵn sàng hỗ trợ Thầy/Cô và Em 4 năng lực cốt lõi:\n` +
          `1. 📖 **Tra cứu Quy chế & Quy trình SSM**: Điểm chuẩn benchmark, định mức dự giờ 11 tiêu chí, quy trình mở khóa sổ điểm.\n` +
          `2. 📈 **Phân tích Kết quả Kiểm tra**: Phổ điểm, tỷ lệ đạt chuẩn, so sánh các kỳ kiểm tra định kỳ.\n` +
          `3. 📋 **Phân tích Hoạt động Dự giờ**: Điểm trung bình 11 tiêu chí, nhận xét ưu điểm và tiêu chí cần bồi dưỡng.\n` +
          `4. 🎯 **Hồ sơ Cố vấn & Mục tiêu SMART**: Đánh giá khoảng chênh GAP, kế hoạch 7 ngày gỡ khó, cảnh báo học sinh Xanh/Vàng/Đỏ.\n\n` +
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
