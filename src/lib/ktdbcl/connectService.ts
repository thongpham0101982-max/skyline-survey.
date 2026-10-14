import { prisma } from "@/lib/db"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const KTDBCL_ROLES = [
  "ADMIN",
  "SUPER_ADMIN",
  "ADMINISTRATOR",
  "KHAO_THI",
  "ĐBCL",
  "DBCL",
  "KT_DBCL",
  "KTDBCL"
]

export function isKtdbclOfficer(role?: string | null): boolean {
  if (!role) return false
  const r = role.toUpperCase().trim()
  return KTDBCL_ROLES.some(k => r.includes(k) || r === k)
}

export const CATEGORY_LABELS: Record<string, string> = {
  SO_DIEM_NHAN_XET: "Sổ điểm & Đánh giá nhận xét",
  KHAO_THI_DE_THI: "Khảo thí & Công tác đề thi",
  DGNL_RADAR: "Đánh giá Năng lực (Radar)",
  DU_GIO_TIET_DAY: "Dự giờ & Đổi mới tiết dạy",
  PHUC_KHAO: "Phúc khảo & Đề nghị rà soát",
  KHAC: "Câu hỏi & Kiến nghị khác"
}

export const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  NEW: {
    label: "Mới tiếp nhận",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200"
  },
  IN_PROGRESS: {
    label: "Đang xử lý",
    color: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-200"
  },
  ANSWERED: {
    label: "Đã phản hồi",
    color: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200"
  },
  RESOLVED: {
    label: "Hoàn tất",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200"
  },
  CLOSED: {
    label: "Đã đóng",
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-200"
  }
}

export const ANNOUNCEMENT_CATEGORY_LABELS: Record<string, string> = {
  QUY_CHE_KHAO_THI: "Quy chế & Nghiệp vụ Khảo thí",
  TIEN_DO_SO_DIEM: "Tiến độ Nhập điểm & Sổ học bạ",
  HUONG_DAN_CHUYEN_MON: "Hướng dẫn Chuyên môn",
  LICH_DU_GIO: "Lịch Dự giờ & Phát triển Chuyên môn",
  THONG_BAO_CHUNG: "Thông báo Chung"
}

/**
 * Lấy thông tin hồ sơ giáo viên đang đăng nhập
 */
export async function getTeacherProfileByUserId(userId: string) {
  try {
    const p = prisma as any
    const teacher = await p.teacher.findUnique({
      where: { userId },
      include: {
        campus: true,
        departmentRel: true
      }
    })
    if (teacher) {
      return {
        teacherId: teacher.id,
        teacherCode: teacher.teacherCode,
        teacherName: teacher.teacherName,
        phone: teacher.phone,
        email: teacher.email,
        campusId: teacher.campusId,
        campusCode: teacher.campus?.campusCode || "CS1",
        campusName: teacher.campus?.campusName || "",
        departmentId: teacher.departmentId,
        departmentName: teacher.departmentRel?.name || ""
      }
    }
    const user = await p.user.findUnique({
      where: { id: userId },
      include: { campusAssignments: { include: { campus: true } } }
    })
    const campus = user?.campusAssignments?.[0]?.campus
    return {
      teacherId: null,
      teacherCode: null,
      teacherName: user?.fullName || "Người dùng",
      phone: null,
      email: user?.email,
      campusId: campus?.id || null,
      campusCode: campus?.campusCode || "CS1",
      campusName: campus?.campusName || "",
      departmentId: null,
      departmentName: null
    }
  } catch (err) {
    console.error("Error getTeacherProfileByUserId:", err)
    return null
  }
}

/**
 * Sinh mã phiếu yêu cầu tự động KTC-YYYY-XXXX
 */
export async function generateRequestCode(): Promise<string> {
  const p = prisma as any
  const year = new Date().getFullYear()
  const prefix = `KTC-${year}-`
  try {
    const last = await p.ktdbclRequest.findFirst({
      where: { requestCode: { startsWith: prefix } },
      orderBy: { createdAt: "desc" }
    })
    if (!last || !last.requestCode) {
      return `${prefix}0001`
    }
    const lastNumStr = last.requestCode.replace(prefix, "")
    const lastNum = parseInt(lastNumStr, 10) || 0
    const nextNum = lastNum + 1
    return `${prefix}${String(nextNum).padStart(4, "0")}`
  } catch {
    return `${prefix}${Date.now().toString().slice(-4)}`
  }
}

/**
 * Sinh mã thông báo tự động TB-YYYY-XXXX
 */
export async function generateAnnouncementCode(): Promise<string> {
  const p = prisma as any
  const year = new Date().getFullYear()
  const prefix = `TB-${year}-`
  try {
    const last = await p.ktdbclAnnouncement.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { createdAt: "desc" }
    })
    if (!last || !last.code) {
      return `${prefix}001`
    }
    const lastNumStr = last.code.replace(prefix, "")
    const lastNum = parseInt(lastNumStr, 10) || 0
    const nextNum = lastNum + 1
    return `${prefix}${String(nextNum).padStart(3, "0")}`
  } catch {
    return `${prefix}${Date.now().toString().slice(-3)}`
  }
}

/**
 * AI phân loại yêu cầu & đánh giá mức độ khẩn cấp
 */
export async function analyzeRequestWithAI(title: string, content: string): Promise<{
  suggestedCategory: string;
  urgencyScore: number;
  summary: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) {
    // Fallback phân loại dựa trên từ khóa nếu chưa có API key
    let cat = "KHAC"
    const text = `${title} ${content}`.toLowerCase()
    if (text.includes("sổ điểm") || text.includes("nhập điểm") || text.includes("mở sổ") || text.includes("cột điểm") || text.includes("làm tròn")) {
      cat = "SO_DIEM_NHAN_XET"
    } else if (text.includes("khảo thí") || text.includes("đề thi") || text.includes("ma trận") || text.includes("bản đặc tả") || text.includes("kỳ thi")) {
      cat = "KHAO_THI_DE_THI"
    } else if (text.includes("năng lực") || text.includes("radar") || text.includes("đgnl")) {
      cat = "DGNL_RADAR"
    } else if (text.includes("dự giờ") || text.includes("phiếu dự giờ") || text.includes("tiết dạy")) {
      cat = "DU_GIO_TIET_DAY"
    } else if (text.includes("phúc khảo") || text.includes("chấm lại") || text.includes("khiếu nại")) {
      cat = "PHUC_KHAO"
    }
    const isUrgent = text.includes("gấp") || text.includes("khẩn") || text.includes("hết hạn") || text.includes("sắp đóng")
    return {
      suggestedCategory: cat,
      urgencyScore: isUrgent ? 85 : 30,
      summary: title.slice(0, 100)
    }
  }

  try {
    const ai = new GoogleGenerativeAI(apiKey)
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" })
    const prompt = `Bạn là trợ lý AI chuyên nghiệp của Ban Khảo thí & Đảm bảo Chất lượng (KT&ĐBCL) Sky-Line Education.
Hãy phân tích nội dung câu hỏi/yêu cầu sau của giáo viên:
Tiêu đề: "${title}"
Nội dung: "${content}"

Yêu cầu phân loại vào 1 trong các chuyên mục:
- SO_DIEM_NHAN_XET (Sổ điểm, mở sổ, nhập điểm, nhận xét)
- KHAO_THI_DE_THI (Ma trận, đặc tả, nộp đề, đề thi, lịch thi)
- DGNL_RADAR (Đánh giá năng lực học sinh, biểu đồ radar)
- DU_GIO_TIET_DAY (Dự giờ, phiếu đánh giá tiết dạy, phát triển chuyên môn)
- PHUC_KHAO (Phúc khảo bài thi, khiếu nại điểm)
- KHAC (Vấn đề khác)

Và chấm điểm mức độ khẩn cấp (thang điểm 1-100, >70 là khẩn cấp như sắp khóa sổ, phụ huynh phản ánh gấp).

Trả về ĐÚNG định dạng JSON sau:
{
  "suggestedCategory": "SO_DIEM_NHAN_XET",
  "urgencyScore": 75,
  "summary": "Tóm tắt ngắn gọn 1 câu yêu cầu của giáo viên"
}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const cleanJson = text.replace(/^```json/, "").replace(/```$/, "").trim()
    const parsed = JSON.parse(cleanJson)
    return {
      suggestedCategory: parsed.suggestedCategory || "KHAC",
      urgencyScore: Number(parsed.urgencyScore) || 30,
      summary: parsed.summary || title
    }
  } catch (err) {
    console.error("AI Analysis error:", err)
    return {
      suggestedCategory: "KHAC",
      urgencyScore: 30,
      summary: title
    }
  }
}

/**
 * AI đề xuất câu trả lời chuẩn hóa cho chuyên viên dựa trên Kho tri thức & Quy chế đã duyệt
 */
export async function generateAiDraftResponse(requestId: string): Promise<string> {
  const p = prisma as any
  const request = await p.ktdbclRequest.findUnique({
    where: { id: requestId },
    include: { messages: { orderBy: { createdAt: "asc" } } }
  })
  if (!request) return ""

  // Lấy các bài viết liên quan trong Kho tri thức
  const knowledgeItems = await p.ktdbclKnowledgeItem.findMany({
    where: { isPublished: true },
    take: 10
  })

  const kbContext = knowledgeItems.map((k: any) => `[HƯỚNG DẪN: ${k.title}] (${k.category}):\nQ: ${k.question}\nA: ${k.answer}`).join("\n\n")

  const conversationHistory = request.messages.map((m: any) => `${m.senderRole === "TEACHER" ? "Giáo viên" : "Chuyên viên"}: ${m.content}`).join("\n")

  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) {
    // Fallback phản hồi chuẩn hóa sư phạm nếu chưa cấu hình AI
    return `Kính chào Thầy/Cô ${request.senderName},\n\nBan KT&ĐBCL đã tiếp nhận nội dung yêu cầu "${request.title}" từ Thầy/Cô.\n\nĐối với nội dung này, theo quy chế chuyên môn và khảo thí Sky-Line:\n- Ban KT&ĐBCL đang phối hợp kiểm tra dữ liệu trên hệ thống SSM.\n- Chúng tôi sẽ cập nhật trạng thái xử lý chi tiết đến Thầy/Cô trong thời gian sớm nhất.\n\nNếu có thêm tài liệu hoặc minh chứng cần bổ sung, Thầy/Cô vui lòng gửi trực tiếp tại hội thoại này.\n\nTrân trọng cảm ơn Thầy/Cô!`
  }

  try {
    const ai = new GoogleGenerativeAI(apiKey)
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" })
    const prompt = `Bạn là Trợ lý AI Chuyên môn của Ban Khảo thí & Đảm bảo Chất lượng (KT&ĐBCL) Sky-Line Education.
Nhiệm vụ của bạn là SOẠN THẢO BẢN DỰ THẢO CÂU TRẢ LỜI để chuyên viên KT&ĐBCL xem duyệt, chỉnh sửa trước khi gửi cho giáo viên.

Yêu cầu ngôn phong:
- Chuẩn mực sư phạm, đồng hành, tôn trọng và tận tình hỗ trợ giáo viên ("Kính chào Thầy/Cô...", "Trân trọng cảm ơn...").
- Rõ ràng từng bước giải quyết, trích dẫn đúng quy chế hoặc hướng dẫn của Sky-Line nếu phù hợp.
- Trả lời đúng trọng tâm câu hỏi của giáo viên.

DỮ LIỆU KHO TRI THỨC VÀ QUY CHẾ ĐÃ PHÊ DUYỆT CỦA SKY-LINE:
${kbContext}

THÔNG TIN PHIẾU YÊU CẦU:
- Mã yêu cầu: ${request.requestCode}
- Người gửi: Thầy/Cô ${request.senderName} (${request.campusCode || "Toàn hệ thống"})
- Chuyên mục: ${CATEGORY_LABELS[request.category] || request.category}
- Tiêu đề: ${request.title}
- Nội dung ban đầu: ${request.content}

LỊCH SỬ HỘI THOẠI ĐÃ TRAO ĐỔI:
${conversationHistory || "Chưa có phản hồi trước đó."}

Hãy soạn thảo câu trả lời hoàn chỉnh, trình bày bằng Markdown đẹp mắt để chuyên viên có thể sao chép hoặc chỉnh sửa gửi ngay:`

    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  } catch (err) {
    console.error("AI Draft Response error:", err)
    return `Kính chào Thầy/Cô ${request.senderName},\n\nBan KT&ĐBCL đã tiếp nhận yêu cầu "${request.title}". Chuyên viên phụ trách đang kiểm tra hệ thống và sẽ phản hồi kết quả xử lý đến Thầy/Cô sớm nhất.\n\nTrân trọng!`
  }
}

/**
 * Gửi thông báo trong ứng dụng (In-app Notification) cho một hoặc nhiều người dùng
 */
export async function sendInAppNotifications({
  userIds,
  title,
  message,
  link
}: {
  userIds: string[];
  title: string;
  message: string;
  link: string;
}) {
  const p = prisma as any
  const uniqueIds = Array.from(new Set(userIds)).filter(Boolean)
  if (uniqueIds.length === 0) return

  try {
    for (const uid of uniqueIds) {
      await p.notification.create({
        data: {
          userId: uid,
          title,
          message,
          link,
          type: "KTDBCL_CONNECT",
          category: "KTDBCL",
          priority: "HIGH",
          isRead: false
        }
      })
    }
  } catch (err) {
    console.error("sendInAppNotifications error:", err)
  }
}

/**
 * Lấy danh sách ID của các chuyên viên Ban KT&ĐBCL và Quản trị viên
 */
export async function getKtdbclOfficerUserIds(): Promise<string[]> {
  const p = prisma as any
  try {
    const users = await p.user.findMany({
      where: {
        OR: [
          { role: { in: ["ADMIN", "SUPER_ADMIN", "KHAO_THI", "ĐBCL", "KT_DBCL", "KTDBCL"] } },
          { role: { contains: "KHAO_THI" } },
          { role: { contains: "DBCL" } },
          { role: { contains: "ĐBCL" } }
        ]
      },
      select: { id: true }
    })
    return users.map((u: any) => u.id)
  } catch {
    return []
  }
}
