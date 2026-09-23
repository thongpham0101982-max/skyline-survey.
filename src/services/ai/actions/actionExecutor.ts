import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { AIUserContext } from "../types";
import { logAIAudit } from "../audit/auditLogger";
import { ActionExecutionResult } from "./actionTypes";

/**
 * Executes a previously proposed AI Action after explicit Human Confirmation.
 */
export async function executeAction(
  actionId: string,
  context: AIUserContext
): Promise<ActionExecutionResult> {
  const startTime = Date.now();
  const traceId = `ai_act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Fetch pending action from database
  const pendingAction = await prisma.aIPendingAction.findUnique({
    where: { id: actionId }
  });

  if (!pendingAction) {
    return {
      success: false,
      actionId,
      actionType: "ACTION_SEND_ADVISORY_EMAIL" as any,
      message: "Không tìm thấy yêu cầu hành động hoặc yêu cầu đã bị hủy.",
      timestamp: new Date().toISOString()
    };
  }

  // 2. Validate status and expiry
  if (pendingAction.status === "EXECUTED") {
    return {
      success: false,
      actionId,
      actionType: pendingAction.actionType as any,
      message: "Hành động này đã được thực thi trước đó (ngăn chặn thao tác trùng lặp).",
      timestamp: new Date().toISOString()
    };
  }

  if (pendingAction.status !== "PENDING") {
    return {
      success: false,
      actionId,
      actionType: pendingAction.actionType as any,
      message: `Hành động đang ở trạng thái '${pendingAction.status}' và không thể thực thi.`,
      timestamp: new Date().toISOString()
    };
  }

  if (new Date() > pendingAction.expiresAt) {
    await prisma.aIPendingAction.update({
      where: { id: actionId },
      data: { status: "EXPIRED" }
    });
    return {
      success: false,
      actionId,
      actionType: pendingAction.actionType as any,
      message: "Yêu cầu hành động đã hết hạn (quá thời hạn xác nhận 10 phút). Vui lòng tạo yêu cầu mới.",
      timestamp: new Date().toISOString()
    };
  }

  // 3. Security: Caller must match proposer or be ADMIN
  if (
    context.role !== "ADMIN" &&
    pendingAction.proposedByUserId !== "system_user" &&
    context.userId !== pendingAction.proposedByUserId
  ) {
    return {
      success: false,
      actionId,
      actionType: pendingAction.actionType as any,
      message: "Bạn không có quyền thực thi hành động được tạo bởi tài khoản khác.",
      timestamp: new Date().toISOString()
    };
  }

  // 4. Execute based on actionType
  try {
    const payload = JSON.parse(pendingAction.payloadJson);
    let resultMessage = "Thực hiện thành công.";

    // Action A: Send Advisory Email
    if (pendingAction.actionType === "ACTION_SEND_ADVISORY_EMAIL") {
      const emailRes = await sendEmail({
        to: payload.recipientEmail,
        subject: payload.subject,
        html: payload.htmlContent,
        text: payload.plainText
      });

      resultMessage = `Đã gửi thành công email cố vấn học tập đến: ${payload.recipientEmail}`;
    }

    // Action B: Send Gradebook Reminder Email
    else if (pendingAction.actionType === "ACTION_SEND_GRADEBOOK_REMINDER") {
      const emailRes = await sendEmail({
        to: payload.recipientEmail,
        subject: payload.subject,
        html: payload.htmlContent,
        text: payload.plainText
      });

      resultMessage = `Đã gửi email nhắc nhở hạn nộp sổ điểm đến: ${payload.recipientEmail}`;
    }

    // Action C: Send Observation Reminder Email
    else if (pendingAction.actionType === "ACTION_SEND_OBSERVATION_REMINDER") {
      const emailRes = await sendEmail({
        to: payload.recipientEmail,
        subject: payload.subject,
        html: payload.htmlContent,
        text: payload.plainText
      });

      resultMessage = `Đã gửi email nhắc nhở chỉ tiêu dự giờ đến: ${payload.recipientEmail}`;
    } else {
      throw new Error(`Loại hành động '${pendingAction.actionType}' không có hàm thực thi.`);
    }

    // 5. Update status to EXECUTED
    await prisma.aIPendingAction.update({
      where: { id: actionId },
      data: {
        status: "EXECUTED",
        executedAt: new Date(),
        resultSummary: resultMessage
      }
    });

    const latencyMs = Date.now() - startTime;

    // Log to AI Audit
    logAIAudit({
      traceId,
      userId: context.userId,
      role: context.role,
      intent: "GENERAL_INQUIRY",
      toolCalled: pendingAction.actionType,
      permissionDecision: "APPROVED",
      latencyMs,
      isSuccess: true,
      modelUsed: "human-confirmed-executor"
    });

    return {
      success: true,
      actionId,
      actionType: pendingAction.actionType as any,
      message: resultMessage,
      timestamp: new Date().toISOString()
    };
  } catch (err: any) {
    console.error("Action execution failed:", err);
    return {
      success: false,
      actionId,
      actionType: pendingAction.actionType as any,
      message: `Lỗi khi thực thi hành động: ${err.message || "Lỗi hệ thống"}`,
      timestamp: new Date().toISOString()
    };
  }
}
