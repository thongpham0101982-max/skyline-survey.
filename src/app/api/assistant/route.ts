import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/lib/auth";
import { getStudentSession } from "@/lib/student-session";
import { PERSONAS, AssistantRole } from "@/lib/assistant/personas";
import {
  getFunctionDeclarationsForRole,
  executeAssistantTool,
  AssistantSecurityContext
} from "@/lib/assistant/tools";

// Simple in-memory rate limiting map
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 15;

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting Check
    const ip = req.headers.get("x-forwarded-for") || "global-client";
    const now = Date.now();
    const clientLimit = rateLimitMap.get(ip) || { count: 0, lastReset: now };

    if (now - clientLimit.lastReset > RATE_LIMIT_WINDOW) {
      clientLimit.count = 1;
      clientLimit.lastReset = now;
      rateLimitMap.set(ip, clientLimit);
    } else {
      clientLimit.count++;
      rateLimitMap.set(ip, clientLimit);
      if (clientLimit.count > MAX_REQUESTS_PER_MINUTE) {
        return Response.json(
          { error: "Thầy/Cô hoặc Em đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút." },
          { status: 429 }
        );
      }
    }

    const { message, history, requestedRole, currentPath } = await req.json();

    if (!message || typeof message !== "string") {
      return Response.json({ error: "Tin nhắn không hợp lệ." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Hệ thống chưa được cấu hình GEMINI_API_KEY trong biến môi trường." },
        { status: 500 }
      );
    }

    // 2. Xác thực danh tính & Vai trò người dùng (Authentication & RBAC)
    let session: any = null;
    try {
      session = await auth();
    } catch (e) {
      console.warn("NextAuth session check warning:", e);
    }

    let studentSession: any = null;
    try {
      studentSession = await getStudentSession();
    } catch (e) {
      console.warn("Student session check warning:", e);
    }

    const nextAuthUser = session?.user;
    let resolvedRole: AssistantRole = "TEACHER";
    const securityContext: AssistantSecurityContext = {
      role: "TEACHER",
      userId: nextAuthUser?.id,
      userName: nextAuthUser?.name
    };

    if (studentSession && studentSession.studentId) {
      resolvedRole = "STUDENT";
      securityContext.role = "STUDENT";
      securityContext.studentId = studentSession.studentId;
      securityContext.userName = studentSession.studentName;
    } else if (nextAuthUser) {
      const userRole = (nextAuthUser.role || "").toUpperCase();
      if (["ADMIN", "ADMINISTRATOR", "KT_DBCL", "SUPER_ADMIN"].includes(userRole)) {
        resolvedRole = "ADMIN";
        securityContext.role = "ADMIN";
      } else if (userRole === "PARENT") {
        resolvedRole = "PARENT";
        securityContext.role = "PARENT";
      } else {
        resolvedRole = "TEACHER";
        securityContext.role = "TEACHER";
      }
    } else if (requestedRole === "STUDENT") {
      // Cho phép nếu có student session fallback
      resolvedRole = "STUDENT";
      securityContext.role = "STUDENT";
    }

    // Nếu người dùng yêu cầu vai trò thấp hơn quyền hiện có (ví dụ Admin muốn dùng thử chế độ Teacher)
    if (requestedRole && requestedRole !== resolvedRole) {
      if (securityContext.role === "ADMIN") {
        resolvedRole = requestedRole;
      }
    }

    const persona = PERSONAS[resolvedRole] || PERSONAS.TEACHER;

    // 3. Xây dựng System Instruction kèm Ngữ cảnh thời gian thực
    let fullSystemInstruction = `${persona.systemInstruction}\n\n[NGỮ CẢNH HỆ THỐNG HIỆN THỜI]
- Thời điểm hiện tại: ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
- Vai trò người dùng đang tương tác: ${resolvedRole}
- Họ tên người dùng: ${securityContext.userName || "Chưa định danh"}
- Trang người dùng đang xem: ${currentPath || "Cổng thông tin chung"}
- QUY TẮC BẢO ĐẢM TÍNH TOÀN VẸN DỮ LIỆU: BẮT BUỘC chỉ sử dụng dữ liệu thực tế được trả về từ các công cụ (Function Tools). TUYỆT ĐỐI KHÔNG BỊA ĐẶT hay phát sinh bất kỳ số liệu, điểm số, môn học hay học sinh nào không có trong database thực tế của web app SSM. Nếu chưa có dữ liệu hoặc danh sách rỗng, hãy trả lời chính xác và trung thực rằng hệ thống chưa ghi nhận dữ liệu.
- Quy tắc định dạng: Định dạng câu trả lời đẹp mắt bằng Markdown, bảng biểu rõ ràng khi có số liệu, dùng biểu tượng cảm xúc (emoji) tích cực và phù hợp với môi trường giáo dục.`;

    // 4. Khởi tạo Gemini Model với Function Declarations
    const functionDeclarations = getFunctionDeclarationsForRole(resolvedRole);

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: functionDeclarations.length > 0 ? [{ functionDeclarations: functionDeclarations as any }] : [],
      systemInstruction: fullSystemInstruction
    });

    // Chuẩn hóa lịch sử tin nhắn
    const cleanHistory = Array.isArray(history) ? [...history] : [];
    while (cleanHistory.length > 0 && cleanHistory[0].role === "model") {
      cleanHistory.shift();
    }

    const chat = model.startChat({ history: cleanHistory });
    let result = await chat.sendMessage(message);

    // 5. Kiểm tra và thực thi Function Calls (nếu AI yêu cầu dữ liệu)
    const calls = typeof result.response.functionCalls === "function"
      ? result.response.functionCalls()
      : (result.response.functionCalls || []);

    if (calls && calls.length > 0) {
      const call = calls[0];
      let toolData: any = null;

      try {
        toolData = await executeAssistantTool(call.name, call.args, securityContext);
      } catch (err: any) {
        console.error(`Tool execution error for ${call.name}:`, err);
        toolData = { error: `Lỗi khi thực thi công cụ: ${err.message}` };
      }

      // Trả kết quả dữ liệu lại cho Gemini để tổng hợp câu trả lời sư phạm
      result = await chat.sendMessage([
        {
          functionResponse: {
            name: call.name,
            response: toolData || { message: "Không có dữ liệu trả về." }
          }
        }
      ]);
    }

    const responseText = result.response.text();

    return Response.json({
      success: true,
      text: responseText,
      role: resolvedRole,
      personaName: persona.name,
      badge: persona.badge,
      primaryColor: persona.primaryColor
    });
  } catch (error: any) {
    console.error("Assistant API Error:", error);
    return Response.json(
      { error: "Đã xảy ra lỗi khi kết nối tới Trợ lý Ảo. Vui lòng thử lại sau ít phút." },
      { status: 500 }
    );
  }
}
