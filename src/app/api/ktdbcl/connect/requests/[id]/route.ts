import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isKtdbclOfficer, sendInAppNotifications } from "@/lib/ktdbcl/connectService"

export const dynamic = "force-dynamic"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 })
    }

    const { id } = await params
    const p = prisma as any
    const userRole = (session.user as any)?.role || "TEACHER"
    const isOfficer = isKtdbclOfficer(userRole)

    const request = await p.ktdbclRequest.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" }
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 20
        }
      }
    })

    if (!request) {
      return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 })
    }

    // Bảo mật: Nếu không phải cán bộ KT&ĐBCL và không phải người tạo -> Chặn truy cập
    if (!isOfficer && request.senderId !== session.user.id) {
      return NextResponse.json({ error: "Không có quyền xem yêu cầu này" }, { status: 403 })
    }

    // Ẩn các ghi chú nội bộ (isInternalNote) đối với giáo viên
    if (!isOfficer && request.messages) {
      request.messages = request.messages.filter((m: any) => !m.isInternalNote)
    }

    return NextResponse.json({
      success: true,
      request,
      isOfficer
    })
  } catch (error: any) {
    console.error("[KTDBCL Connect GET Request Detail Error]:", error)
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { action, status, assignedToId, assignedToName, rating, ratingFeedback, notes } = body

    const p = prisma as any
    const userRole = (session.user as any)?.role || "TEACHER"
    const isOfficer = isKtdbclOfficer(userRole)

    const existing = await p.ktdbclRequest.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 })
    }

    // Kiểm tra quyền theo từng action
    const dataUpdate: any = {}
    let auditAction = "STATUS_CHANGED"
    let auditNote = notes || ""

    if (action === "ASSIGN") {
      if (!isOfficer) {
        return NextResponse.json({ error: "Chỉ Ban KT&ĐBCL mới có quyền phân công chuyên viên" }, { status: 403 })
      }
      dataUpdate.assignedToId = assignedToId
      dataUpdate.assignedToName = assignedToName
      dataUpdate.assignedAt = new Date()
      if (existing.status === "NEW") {
        dataUpdate.status = "IN_PROGRESS"
      }
      auditAction = "ASSIGNED"
      auditNote = `Phân công chuyên viên phụ trách: ${assignedToName}`

      // Thông báo cho chuyên viên được phân công
      if (assignedToId && assignedToId !== session.user.id) {
        await sendInAppNotifications({
          userIds: [assignedToId],
          title: `[KT&ĐBCL Connect] Bạn được phân công xử lý yêu cầu ${existing.requestCode}`,
          message: `${existing.title}`,
          link: `/admin/ktdbcl/connect?requestId=${existing.id}`
        })
      }
    } else if (action === "UPDATE_STATUS") {
      if (!isOfficer && action !== "REOPEN") {
        return NextResponse.json({ error: "Chỉ Ban KT&ĐBCL mới có quyền thay đổi trạng thái này" }, { status: 403 })
      }
      dataUpdate.status = status
      if (status === "RESOLVED" || status === "CLOSED") {
        dataUpdate.resolvedAt = new Date()
      }
      auditNote = `Thay đổi trạng thái từ [${existing.status}] sang [${status}]. ${notes || ""}`

      // Thông báo cho giáo viên
      await sendInAppNotifications({
        userIds: [existing.senderId],
        title: `[KT&ĐBCL Connect] Cập nhật trạng thái yêu cầu ${existing.requestCode}`,
        message: `Yêu cầu "${existing.title.slice(0, 80)}" hiện có trạng thái: ${status}`,
        link: `/teacher/ktdbcl-connect?requestId=${existing.id}`
      })
    } else if (action === "REOPEN") {
      // Giáo viên hoặc chuyên viên mở lại yêu cầu
      dataUpdate.status = "IN_PROGRESS"
      dataUpdate.reopenedAt = new Date()
      auditAction = "REOPENED"
      auditNote = `Mở lại yêu cầu xử lý. Lý do: ${notes || "Giáo viên cần hỗ trợ thêm"}`

      // Thông báo cho chuyên viên nếu có
      if (existing.assignedToId) {
        await sendInAppNotifications({
          userIds: [existing.assignedToId],
          title: `[KT&ĐBCL Connect] Yêu cầu ${existing.requestCode} đã được mở lại`,
          message: notes || "Giáo viên cần hỗ trợ bổ sung",
          link: `/admin/ktdbcl/connect?requestId=${existing.id}`
        })
      }
    } else if (action === "RATE") {
      // Giáo viên đánh giá mức độ hài lòng
      if (existing.senderId !== session.user.id) {
        return NextResponse.json({ error: "Chỉ người gửi mới có quyền đánh giá" }, { status: 403 })
      }
      dataUpdate.rating = Number(rating) || 5
      dataUpdate.ratingFeedback = ratingFeedback || null
      dataUpdate.status = "RESOLVED"
      auditAction = "RATED"
      auditNote = `Giáo viên đánh giá ${rating}/5 sao: ${ratingFeedback || "Hài lòng"}`
    }

    const updated = await p.ktdbclRequest.update({
      where: { id },
      data: dataUpdate
    })

    // Ghi audit log
    await p.ktdbclAuditLog.create({
      data: {
        requestId: id,
        action: auditAction,
        actorId: session.user.id,
        actorName: session.user.name || "Người dùng",
        oldValue: existing.status,
        newValue: dataUpdate.status || existing.status,
        notes: auditNote
      }
    })

    return NextResponse.json({
      success: true,
      request: updated,
      message: "Cập nhật yêu cầu thành công"
    })
  } catch (error: any) {
    console.error("[KTDBCL Connect PATCH Request Error]:", error)
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 })
  }
}
