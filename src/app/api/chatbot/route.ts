import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  getTeacherObservationStats, 
  getDeptObservationStats, 
  getInputAssessmentSummary, 
  searchStudentInputScore 
} from "@/lib/chatbot/tools";

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Vui lòng cấu hình GEMINI_API_KEY trong file .env" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      tools: [{
        functionDeclarations: [
          {
            name: "getTeacherObservationStats",
            description: "Thống kê kết quả dự giờ, tổng số tiết dạy, tiết dự và số lượng xếp loại (Giỏi/Khá...) của giáo viên cụ thể theo Tên hoặc Mã GV.",
            parameters: {
              type: "OBJECT",
              properties: {
                teacherNameOrCode: { type: "STRING", description: "Tên giáo viên hoặc mã số giáo viên cần tra cứu." }
              },
              required: ["teacherNameOrCode"]
            }
          },
          {
            name: "getDeptObservationStats",
            description: "Thống kê tình hình dự giờ, số giáo viên, tổng tiết dạy và bảng tóm tắt xếp loại của một Tổ chuyên môn cụ thể theo Tên tổ.",
            parameters: {
              type: "OBJECT",
              properties: {
                deptName: { type: "STRING", description: "Tên tổ chuyên môn cần thống kê (ví dụ: Tổ 1, Tổ 2, Tổ Ngoại Ngữ...)." }
              },
              required: ["deptName"]
            }
          },
          {
            name: "getInputAssessmentSummary",
            description: "Thống kê tóm tắt đợt khảo sát đầu vào (Input Assessment) gồm tổng số học sinh, tỷ lệ Đạt/Chưa đạt/Cam kết, và điểm trung bình các môn học.",
            parameters: {
              type: "OBJECT",
              properties: {
                periodSearch: { type: "STRING", description: "Tên đợt khảo sát đầu vào cần tra cứu (ví dụ: Khảo sát lớp 1, Mầm non 2026...)." }
              },
              required: ["periodSearch"]
            }
          },
          {
            name: "searchStudentInputScore",
            description: "Tìm kiếm thông tin điểm số khảo sát đầu vào (Toán, Văn, Anh, Tâm lý, Mầm non), trạng thái trúng tuyển, nhập học của một học sinh cụ thể theo Tên hoặc Mã học sinh.",
            parameters: {
              type: "OBJECT",
              properties: {
                studentSearch: { type: "STRING", description: "Tên học sinh hoặc mã học sinh cần tìm kiếm." }
              },
              required: ["studentSearch"]
            }
          }
        ]
      }],
      systemInstruction: "Bạn là Trợ lý ảo Chuyên môn của Trường Skyline. Bạn có nhiệm vụ hỗ trợ Ban giám hiệu, Tổ trưởng chuyên môn và các cán bộ quản trị truy vấn dữ liệu Dự giờ (dự giờ tiết dạy, xếp loại giáo viên) và Khảo sát đầu vào (kết quả điểm số, trạng thái trúng tuyển của học sinh mới). Hãy trả lời ngắn gọn, trực quan, chuyên nghiệp và lịch sự bằng Tiếng Việt. Định dạng câu trả lời rõ ràng bằng markdown, bảng biểu hoặc gạch đầu dòng khi thích hợp."
    });

    const chat = model.startChat({ history });
    let result = await chat.sendMessage(message);
    const functionCalls = result.response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      let toolResult;

      try {
        if (call.name === "getTeacherObservationStats") {
          toolResult = await getTeacherObservationStats(call.args.teacherNameOrCode as string);
        } else if (call.name === "getDeptObservationStats") {
          toolResult = await getDeptObservationStats(call.args.deptName as string);
        } else if (call.name === "getInputAssessmentSummary") {
          toolResult = await getInputAssessmentSummary(call.args.periodSearch as string);
        } else if (call.name === "searchStudentInputScore") {
          toolResult = await searchStudentInputScore(call.args.studentSearch as string);
        }

        // Trả kết quả của tool về cho Gemini để sinh văn bản trả lời tự nhiên
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
              response: { error: `Lỗi trong quá trình chạy hàm: ${e.message}` }
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
