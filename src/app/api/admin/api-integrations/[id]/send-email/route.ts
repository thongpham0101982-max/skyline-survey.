import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/mail"
import { renderSkylineEmail } from "@/lib/email-templates"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const role = ((session?.user as any)?.role || "").toUpperCase().trim()
    if (!["ADMIN", "SUPER_ADMIN", "SUPERADMIN"].includes(role)) {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const pAny = prisma as any

    const application = await pAny.apiApplication.findUnique({
      where: { id },
      include: {
        apiKeys: {
          where: { status: "ACTIVE" },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!application) {
      return NextResponse.json({ success: false, error: "Không tìm thấy ứng dụng" }, { status: 404 })
    }

    let targetEmail = body.recipientEmail?.trim()
    let teacherName = ""
    let departmentName = ""

    if (application.allowedDataScope) {
      try {
        const parsed = JSON.parse(application.allowedDataScope)
        if (!targetEmail && parsed.recipientEmail) targetEmail = parsed.recipientEmail
        if (parsed.teacherName) teacherName = parsed.teacherName
        if (parsed.departmentName) departmentName = parsed.departmentName
      } catch (_) {}
    }

    if (!targetEmail && application.contactPerson && application.contactPerson.includes("@")) {
      const match = application.contactPerson.match(/[\w.-]+@[\w.-]+\.\w+/)
      if (match) targetEmail = match[0]
    }

    if (!targetEmail) {
      return NextResponse.json({
        success: false,
        error: "Chưa cấu hình email người nhận cho ứng dụng này. Vui lòng bấm 'Sửa thông tin' để điền email."
      }, { status: 400 })
    }

    let permList = "Chưa cấp quyền thao tác dữ liệu"
    try {
      const arr = JSON.parse(application.permissions)
      if (Array.isArray(arr) && arr.length > 0) permList = arr.join(", ")
    } catch (_) {}

    const activeKey = application.apiKeys?.[0]
    const keyInfoBox = activeKey ? `
      <div style="background-color: #0F172A; border-radius: 8px; padding: 12px 16px; margin: 12px 0; color: #38BDF8; font-family: monospace; font-size: 13px;">
        Mã khóa: <strong>${activeKey.keyId}</strong> (Tiền tố: <code>${activeKey.keyPrefix}</code>)
      </div>
    ` : ""

    const emailHtml = renderSkylineEmail({
      headerBadge: "BÀN GIAO KẾT NỐI API",
      headerTitle: "Thông Tin Bàn Giao & Hướng Dẫn Tích Hợp API SSM",
      headerSubtitle: "Hệ thống Quản lý Giáo dục Sky-Line SSM",
      headerTheme: "teal",
      recipientName: teacherName ? `Thầy/Cô ${teacherName}` : "Thầy/Cô phụ trách",
      greetingPrefix: "Kính gửi",
      introMessage: `Ban Quản trị Sky-Line SSM gửi thông tin bàn giao ứng dụng tích hợp API <strong>"${application.name}"</strong> thuộc <strong>${departmentName || "Tổ chuyên môn"}</strong>.`,
      detailsTitle: "Thông số Kỹ thuật & Quyền Truy cập",
      details: [
        { label: "Tên ứng dụng", value: application.name, highlight: true },
        { label: "Tổ chuyên môn", value: departmentName || "Ban KT&ĐBCL" },
        { label: "Người phụ trách", value: `${teacherName || "Chưa gắn"} (${targetEmail})` },
        { label: "Quyền truy cập", value: permList, color: "#00A19A", highlight: true },
        { label: "Hạn mức tần suất", value: `${application.rateLimitRpm || 60} requests/phút` },
        { label: "Trạng thái", value: application.status === "ACTIVE" ? "Đang hoạt động" : application.status },
        { label: "Thời gian gửi", value: new Date().toLocaleString("vi-VN") },
      ],
      noticeBox: {
        type: "info",
        title: "Tài liệu Kỹ thuật Tích hợp API",
        content: "Đường link tài liệu tương tác OpenAPI / Swagger và ví dụ mẫu cURL & n8n: https://ssm.skylineschool.edu.vn/api-docs.html."
      },
      extraHtml: keyInfoBox,
      button: {
        text: "Mở Tài liệu Hướng dẫn API",
        url: "https://ssm.skylineschool.edu.vn/api-docs.html",
      },
      secondaryNote: "Mọi yêu cầu hỗ trợ kỹ thuật hoặc cấp đổi khóa API xin liên hệ Ban CNTT Sky-Line."
    })

    const mailRes = await sendEmail({
      to: targetEmail,
      subject: `[Sky-line SMS] Thông tin Bàn giao Tích hợp API: ${application.name}`,
      html: emailHtml,
    })

    return NextResponse.json({
      success: mailRes.success,
      emailSent: mailRes.success,
      recipientEmail: targetEmail,
      error: mailRes.error || mailRes.reason,
    })
  } catch (error: any) {
    console.error("Lỗi gửi email bàn giao API:", error)
    return NextResponse.json({ success: false, error: "Không thể gửi email bàn giao" }, { status: 500 })
  }
}
