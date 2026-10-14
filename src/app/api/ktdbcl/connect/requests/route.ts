import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  isKtdbclOfficer,
  getTeacherProfileByUserId,
  generateRequestCode,
  analyzeRequestWithAI,
  sendInAppNotifications,
  getKtdbclOfficerUserIds
} from "@/lib/ktdbcl/connectService"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const category = searchParams.get("category")
    const campusId = searchParams.get("campusId")
    const search = searchParams.get("search")?.trim() || ""

    const p = prisma as any
    const userRole = (session.user as any)?.role || "TEACHER"
    const isOfficer = isKtdbclOfficer(userRole)

    const where: any = {}

    // Nếu là giáo viên: chỉ xem yêu cầu của chính mình
    if (!isOfficer) {
      where.senderId = session.user.id
    } else {
      // Chuyên viên xem tất cả, có thể lọc
      if (campusId && campusId !== "ALL") {
        where.campusId = campusId
      }
    }

    if (status && status !== "ALL") {
      where.status = status
    }
    if (category && category !== "ALL") {
      where.category = category
    }
    if (search) {
      where.OR = [
        { requestCode: { contains: search } },
        { title: { contains: search } },
        { senderName: { contains: search } },
        { content: { contains: search } }
      ]
    }

    const [requests, totalCount, statusCounts] = await Promise.all([
      p.ktdbclRequest.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: 100,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      }),
      p.ktdbclRequest.count({ where }),
      p.ktdbclRequest.groupBy({
        by: ["status"],
        where: isOfficer ? {} : { senderId: session.user.id },
        _count: { _all: true }
      })
    ])

    const countsMap = {
      ALL: 0,
      NEW: 0,
      IN_PROGRESS: 0,
      ANSWERED: 0,
      RESOLVED: 0,
      CLOSED: 0
    }
    statusCounts.forEach((c: any) => {
      const st = c.status as keyof typeof countsMap
      if (countsMap[st] !== undefined) {
        countsMap[st] = c._count._all
      }
      countsMap.ALL += c._count._all
    })

    return NextResponse.json({
      success: true,
      requests,
      totalCount,
      countsMap,
      isOfficer
    })
  } catch (error: any) {
    console.error("[KTDBCL Connect GET Requests Error]:", error)
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 })
    }

    const body = await req.json()
    const {
      title,
      content,
      category = "KHAC",
      requestType = "CAU_HOI",
      priority = "NORMAL",
      attachments = [],
      refModule = null,
      refRecordId = null
    } = body

    if (!title || !content) {
      return NextResponse.json({ error: "Vui lòng nhập tiêu đề và nội dung yêu cầu" }, { status: 400 })
    }

    const p = prisma as any
    const profile = await getTeacherProfileByUserId(session.user.id)
    const requestCode = await generateRequestCode()

    // Phân tích AI tự động
    const aiAnalysis = await analyzeRequestWithAI(title, content)

    const attachmentsJson = Array.isArray(attachments) ? JSON.stringify(attachments) : String(attachments || "[]")

    const newRequest = await p.ktdbclRequest.create({
      data: {
        requestCode,
        title: title.trim(),
        content: content.trim(),
        category: category !== "KHAC" ? category : (aiAnalysis.suggestedCategory || "KHAC"),
        requestType,
        priority: aiAnalysis.urgencyScore >= 80 ? "URGENT" : priority,
        status: "NEW",
        attachments: attachmentsJson,
        senderId: session.user.id,
        senderName: profile?.teacherName || session.user.name || "Giáo viên",
        senderRole: (session.user as any)?.role || "TEACHER",
        senderEmail: profile?.email || session.user.email || null,
        senderPhone: profile?.phone || null,
        teacherId: profile?.teacherId || null,
        campusId: profile?.campusId || null,
        campusCode: profile?.campusCode || "CS1",
        departmentId: profile?.departmentId || null,
        departmentName: profile?.departmentName || null,
        aiCategorySuggestion: aiAnalysis.suggestedCategory,
        aiUrgencyScore: aiAnalysis.urgencyScore,
        aiSummary: aiAnalysis.summary,
        refModule,
        refRecordId
      }
    })

    // Lưu tin nhắn mở đầu vào bảng KtdbclMessage
    await p.ktdbclMessage.create({
      data: {
        requestId: newRequest.id,
        senderId: session.user.id,
        senderName: profile?.teacherName || session.user.name || "Giáo viên",
        senderRole: "TEACHER",
        content: content.trim(),
        attachments: attachmentsJson,
        isInternalNote: false
      }
    })

    // Ghi nhật ký kiểm toán Audit Log
    await p.ktdbclAuditLog.create({
      data: {
        requestId: newRequest.id,
        action: "CREATED",
        actorId: session.user.id,
        actorName: profile?.teacherName || session.user.name || "Giáo viên",
        newValue: "NEW",
        notes: `Tạo yêu cầu mới [${requestCode}]: ${title.slice(0, 100)}`
      }
    })

    // Gửi thông báo In-app cho Ban KT&ĐBCL
    const officerIds = await getKtdbclOfficerUserIds()
    await sendInAppNotifications({
      userIds: officerIds,
      title: `[KT&ĐBCL Connect] Yêu cầu mới từ ${profile?.teacherName || "Giáo viên"} (${profile?.campusCode || "Hệ thống"})`,
      message: `${requestCode}: ${title.slice(0, 120)}`,
      link: `/admin/ktdbcl/connect?requestId=${newRequest.id}`
    })

    return NextResponse.json({
      success: true,
      request: newRequest,
      message: `Tạo yêu cầu thành công với mã ${requestCode}`
    })
  } catch (error: any) {
    console.error("[KTDBCL Connect POST Request Error]:", error)
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 })
  }
}
