import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isKtdbclOfficer, sendInAppNotifications } from "@/lib/ktdbcl/connectService"

export const dynamic = "force-dynamic"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { content, attachments = [], isInternalNote = false } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Nội dung phản hồi không được để trống" }, { status: 400 })
    }

    const p = prisma as any
    const userRole = (session.user as any)?.role || "TEACHER"
    const isOfficer = isKtdbclOfficer(userRole)

    const request = await p.ktdbclRequest.findUnique({ where: { id } })
    if (!request) {
      return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 })
    }

    // Kiểm tra quyền
    if (!isOfficer && request.senderId !== session.user.id) {
      return NextResponse.json({ error: "Không có quyền gửi phản hồi trong yêu cầu này" }, { status: 403 })
    }

    // Chỉ cán bộ KT&ĐBCL mới được gửi ghi chú nội bộ
    const safeIsInternal = isOfficer ? Boolean(isInternalNote) : false
    const senderRole = isOfficer ? "SPECIALIST" : "TEACHER"

    const attachmentsJson = Array.isArray(attachments) ? JSON.stringify(attachments) : String(attachments || "[]")

    const message = await p.ktdbclMessage.create({
      data: {
        requestId: id,
        senderId: session.user.id,
        senderName: session.user.name || (isOfficer ? "Chuyên viên KT&ĐBCL" : "Giáo viên"),
        senderRole,
        content: content.trim(),
        attachments: attachmentsJson,
        isInternalNote: safeIsInternal
      }
    })

    // Tự động cập nhật trạng thái yêu cầu nếu là tin nhắn chính thức (không phải note nội bộ)
    const updateData: any = { updatedAt: new Date() }
    if (!safeIsInternal) {
      if (isOfficer) {
        // Chuyên viên phản hồi -> chuyển sang ĐÃ PHẢN HỒI
        updateData.status = "ANSWERED"
        if (!request.assignedToId) {
          updateData.assignedToId = session.user.id
          updateData.assignedToName = session.user.name || "Chuyên viên KT&ĐBCL"
        }
      } else {
        // Giáo viên gửi thêm tin -> chuyển về ĐANG XỬ LÝ nếu trước đó là ANSWERED
        if (request.status === "ANSWERED") {
          updateData.status = "IN_PROGRESS"
        }
      }
    }

    await p.ktdbclRequest.update({
      where: { id },
      data: updateData
    })

    // Ghi audit log
    await p.ktdbclAuditLog.create({
      data: {
        requestId: id,
        action: safeIsInternal ? "INTERNAL_NOTE" : "REPLIED",
        actorId: session.user.id,
        actorName: session.user.name || (isOfficer ? "Chuyên viên KT&ĐBCL" : "Giáo viên"),
        notes: safeIsInternal ? "Thêm ghi chú nội bộ KT&ĐBCL" : `Phản hồi mới: ${content.trim().slice(0, 80)}`
      }
    })

    // Gửi thông báo cho đối phương
    if (!safeIsInternal) {
      if (isOfficer) {
        // Báo cho giáo viên
        await sendInAppNotifications({
          userIds: [request.senderId],
          title: `[KT&ĐBCL Connect] Phản hồi mới cho yêu cầu ${request.requestCode}`,
          message: `${session.user.name || "Chuyên viên KT&ĐBCL"}: ${content.trim().slice(0, 100)}`,
          link: `/teacher/ktdbcl-connect?requestId=${request.id}`
        })
      } else {
        // Báo cho chuyên viên phụ trách hoặc toàn ban
        const targetIds = request.assignedToId ? [request.assignedToId] : []
        if (targetIds.length > 0) {
          await sendInAppNotifications({
            userIds: targetIds,
            title: `[KT&ĐBCL Connect] Giáo viên phản hồi yêu cầu ${request.requestCode}`,
            message: `${session.user.name || "Giáo viên"}: ${content.trim().slice(0, 100)}`,
            link: `/admin/ktdbcl/connect?requestId=${request.id}`
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message,
      requestStatus: updateData.status || request.status
    })
  } catch (error: any) {
    console.error("[KTDBCL Connect POST Message Error]:", error)
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 })
  }
}
