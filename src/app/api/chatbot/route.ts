import { prisma } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/lib/auth";
import { 
  getTeacherOwnFeedback,
  checkTeacherObservationQuota,
  getObservationCriteriaGuidelines,
  getTeacherActivityInMonth,
  getLowestAverageScoreTaughtPeriod,
  getDepartmentObservationStatsSummary,
  getCriteriaExtremeFrequencies
} from "@/lib/chatbot/tools";

// Simple in-memory rate limiting map to prevent abuse/spam of Gemini API
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 10;

export async function POST(req: Request) {
  try {
    // Rate Limiting Check
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
          { error: "Thầy/Cô đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút." },
          { status: 429 }
        );
      }
    }

    const { message, history, chatbotCode } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Vui lòng cấu hình GEMINI_API_KEY trong project settings." },
        { status: 500 }
      );
    }

    // Lấy thông tin user hiện tại từ session
    let session: any = null;
    try {
      session = await auth();
    } catch (e) {
      console.error("Auth helper error in chatbot route:", e);
    }
    const currentUser = session?.user;

    // Xác định code chatbot phù hợp dựa trên role nếu không truyền lên
    const codeToFind = chatbotCode || (currentUser?.role === "ADMIN" ? "ADMIN_ASSISTANT" : "TEACHER_ASSISTANT");

    // Lấy cấu hình từ database
    let dbInstruction = "";
    try {
      const config = await prisma.chatbotConfig.findUnique({
        where: { code: codeToFind }
      });

      if (config && config.isActive) {
        // Kiểm tra phân quyền
        const allowedRoles = config.allowedRoles ? config.allowedRoles.split(",") : [];
        const userRole = currentUser?.role || "GIAO_VIEN";
        
        const hasAccess = allowedRoles.some(r => r.trim().toUpperCase() === userRole.toUpperCase());
        if (!hasAccess && allowedRoles.length > 0) {
          return Response.json(
            { error: "Thầy/Cô không có quyền truy cập vào trợ lý ảo này." },
            { status: 403 }
          );
        }
        
        dbInstruction = config.systemInstruction;
      }
    } catch (e) {
      console.error("Failed to query chatbot config from DB:", e);
    }

    // Fallback nếu không có trong database hoặc lỗi
    if (!dbInstruction) {
      dbInstruction = codeToFind === "ADMIN_ASSISTANT"
        ? "Bạn là Trợ lý ảo Chuyên môn của Trường Skyline hỗ trợ Quản trị viên và Ban giám hiệu. Bạn hỗ trợ thống kê hoạt động dạy/dự của giáo viên, tìm các tiết học điểm thấp, tổng hợp tổ chuyên môn, phân tích tần số các tiêu chí tốt/cần cải thiện nhất."
        : "Bạn là Trợ lý ảo Chuyên môn của Trường Skyline hỗ trợ Giáo viên. Bạn có nhiệm vụ hỗ trợ Giáo viên tra cứu lịch sử nhận xét các tiết dạy của họ, kiểm tra chỉ tiêu số tiết dự giờ cá nhân (chỉ tiêu là 2 tiết/tháng), và hướng dẫn tiêu chí chấm điểm.";
    }

    // Thêm thông tin ngữ cảnh người dùng
    dbInstruction += `\n\nThông tin người dùng hiện tại đang gửi tin nhắn:\n- ID người dùng: ${currentUser?.id || "Chưa đăng nhập"}\n- Họ tên: ${currentUser?.name || "Khách"}\n- Quyền hạn (Role): ${currentUser?.role || "GIAO_VIEN"}\n\nHãy trả lời ngắn gọn, trực quan, chuyên nghiệp và lịch sự bằng Tiếng Việt. Định dạng câu trả lời rõ ràng bằng markdown, bảng biểu hoặc gạch đầu dòng khi thích hợp.`;

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: [{
        functionDeclarations: [
          // 1. Cho Giáo viên
          {
            name: "getTeacherOwnFeedback",
            description: "Xem nhận xét ưu điểm/góp ý của các tiết dạy tôi (giáo viên hiện tại đang đăng nhập) đã đứng lớp dạy.",
            parameters: {
              type: "OBJECT",
              properties: {}
            }
          },
          {
            name: "checkTeacherObservationQuota",
            description: "Kiểm tra xem tôi (giáo viên hiện tại đang đăng nhập) đã đi dự giờ đủ số tiết bắt buộc (chỉ tiêu 2 tiết) trong tháng này chưa.",
            parameters: {
              type: "OBJECT",
              properties: {}
            }
          },
          {
            name: "getObservationCriteriaGuidelines",
            description: "Xem và hướng dẫn các tiêu chí chấm điểm, chuẩn đánh giá dự giờ của Phổ thông (Y1-Y11) và Mầm non (T1-T5).",
            parameters: {
              type: "OBJECT",
              properties: {}
            }
          },
          // 2. Cho Admin
          {
            name: "getTeacherActivityInMonth",
            description: "Thống kê số tiết dạy và số tiết dự giờ của một giáo viên cụ thể bất kỳ trong tháng hiện tại.",
            parameters: {
              type: "OBJECT",
              properties: {
                teacherNameOrCode: { type: "STRING", description: "Tên giáo viên hoặc mã số giáo viên cần tra cứu." }
              },
              required: ["teacherNameOrCode"]
            }
          },
          {
            name: "getLowestAverageScoreTaughtPeriod",
            description: "Tìm giáo viên có tiết dạy đạt điểm trung bình (ĐTB) thấp nhất trong hệ thống.",
            parameters: {
              type: "OBJECT",
              properties: {}
            }
          },
          {
            name: "getDepartmentObservationStatsSummary",
            description: "Thống kê số lượng giáo viên, tổng số tiết dạy và tổng số tiết đi dự giờ của một Tổ chuyên môn cụ thể theo Tên tổ.",
            parameters: {
              type: "OBJECT",
              properties: {
                deptName: { type: "STRING", description: "Tên tổ chuyên môn cần thống kê (ví dụ: Tổ 1, Tổ 2, Tổ Ngoại Ngữ...)." }
              },
              required: ["deptName"]
            }
          },
          {
            name: "getCriteriaExtremeFrequencies",
            description: "Thống kê xem Tiêu chí nào (trong Y1-Y11) có điểm thấp nhất có tần số xuất hiện nhiều nhất và Tiêu chí nào có điểm cao nhất thường xuyên nhất.",
            parameters: {
              type: "OBJECT",
              properties: {}
            }
          }
        ]
      }],
      systemInstruction: dbInstruction
    });

    // Đảm bảo tin nhắn đầu tiên trong lịch sử gửi lên Gemini bắt đầu bằng vai trò 'user'
    let cleanHistory = Array.isArray(history) ? [...history] : [];
    while (cleanHistory.length > 0 && cleanHistory[0].role === "model") {
      cleanHistory.shift();
    }

    const chat = model.startChat({ history: cleanHistory });
    let result = await chat.sendMessage(message);
    const calls = typeof result.response.functionCalls === "function"
      ? result.response.functionCalls()
      : (result.response.functionCalls || []);

    if (calls && calls.length > 0) {
      const call = calls[0];
      let toolResult;

      try {
        if (call.name === "getTeacherOwnFeedback") {
          if (!currentUser?.id) {
            toolResult = { error: "Vui lòng đăng nhập để xem nhận xét cá nhân." };
          } else {
            toolResult = await getTeacherOwnFeedback(currentUser.id);
          }
        } else if (call.name === "checkTeacherObservationQuota") {
          if (!currentUser?.id) {
            toolResult = { error: "Vui lòng đăng nhập để kiểm tra chỉ tiêu." };
          } else {
            toolResult = await checkTeacherObservationQuota(currentUser.id);
          }
        } else if (call.name === "getObservationCriteriaGuidelines") {
          toolResult = await getObservationCriteriaGuidelines();
        } else if (call.name === "getTeacherActivityInMonth") {
          const isAdmin = ["ADMIN", "ADMINISTRATOR", "KT_DBCL"].includes(currentUser?.role || "");
          if (!isAdmin) {
            toolResult = { error: "Bạn không có quyền xem thông tin thống kê hoạt động của giáo viên khác." };
          } else {
            toolResult = await getTeacherActivityInMonth(call.args.teacherNameOrCode as string);
          }
        } else if (call.name === "getLowestAverageScoreTaughtPeriod") {
          const isAdmin = ["ADMIN", "ADMINISTRATOR", "KT_DBCL"].includes(currentUser?.role || "");
          if (!isAdmin) {
            toolResult = { error: "Bạn không có quyền truy cập thông tin tiết dạy có điểm thấp nhất." };
          } else {
            toolResult = await getLowestAverageScoreTaughtPeriod();
          }
        } else if (call.name === "getDepartmentObservationStatsSummary") {
          const isAdmin = ["ADMIN", "ADMINISTRATOR", "KT_DBCL"].includes(currentUser?.role || "");
          if (!isAdmin) {
            toolResult = { error: "Bạn không có quyền xem thống kê tổ chuyên môn." };
          } else {
            toolResult = await getDepartmentObservationStatsSummary(call.args.deptName as string);
          }
        } else if (call.name === "getCriteriaExtremeFrequencies") {
          const isAdmin = ["ADMIN", "ADMINISTRATOR", "KT_DBCL"].includes(currentUser?.role || "");
          if (!isAdmin) {
            toolResult = { error: "Bạn không có quyền truy cập phân tích tần số tiêu chí đánh giá." };
          } else {
            toolResult = await getCriteriaExtremeFrequencies();
          }
        }

        // Gửi kết quả về Gemini
        result = await chat.sendMessage([
          {
            functionResponse: {
              name: call.name,
              response: toolResult || { error: "Không lấy được dữ liệu." }
            }
          }
        ]);
      } catch (e: any) {
        result = await chat.sendMessage([
          {
            functionResponse: {
              name: call.name,
              response: { error: `Lỗi khi gọi hàm: ${e.message}` }
            }
          }
        ]);
      }
    }

    return Response.json({ text: result.response.text() });
  } catch (error: any) {
    console.error("ChatBot API error:", error);
    return Response.json(
      { error: "Đã xảy ra lỗi hệ thống. Vui lòng liên hệ quản trị viên." },
      { status: 500 }
    );
  }
}
