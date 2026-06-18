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

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

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

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
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
      systemInstruction: `Bạn là Trợ lý ảo Chuyên môn của Trường Skyline. Bạn có nhiệm vụ hỗ trợ Giáo viên tra cứu lịch sử nhận xét của họ, kiểm tra chỉ tiêu số tiết dự giờ cá nhân, và hướng dẫn tiêu chí chấm điểm. Đối với Ban giám hiệu và Admin, bạn hỗ trợ thống kê hoạt động dạy/dự của giáo viên, tìm các tiết học điểm thấp, tổng hợp tổ chuyên môn, phân tích tần số các tiêu chí tốt/cần cải thiện nhất.
Hãy trả lời ngắn gọn, trực quan, chuyên nghiệp và lịch sự bằng Tiếng Việt. Định dạng câu trả lời rõ ràng bằng markdown, bảng biểu hoặc gạch đầu dòng khi thích hợp.

Thông tin người dùng hiện tại đang gửi tin nhắn:
- ID người dùng: ${currentUser?.id || "Chưa đăng nhập"}
- Họ tên: ${currentUser?.name || "Khách"}
- Quyền hạn (Role): ${currentUser?.role || "GIAO_VIEN"}`
    });

    const chat = model.startChat({ history });
    let result = await chat.sendMessage(message);
    const functionCalls = result.response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
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
          toolResult = await getTeacherActivityInMonth(call.args.teacherNameOrCode as string);
        } else if (call.name === "getLowestAverageScoreTaughtPeriod") {
          toolResult = await getLowestAverageScoreTaughtPeriod();
        } else if (call.name === "getDepartmentObservationStatsSummary") {
          toolResult = await getDepartmentObservationStatsSummary(call.args.deptName as string);
        } else if (call.name === "getCriteriaExtremeFrequencies") {
          toolResult = await getCriteriaExtremeFrequencies();
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
      { error: "Đã xảy ra lỗi hệ thống: " + error.message },
      { status: 500 }
    );
  }
}
