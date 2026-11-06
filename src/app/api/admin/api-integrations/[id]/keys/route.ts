import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateCryptoApiKey } from "@/lib/api-auth"
import { sendEmail } from "@/lib/mail"
import { renderSkylineEmail } from "@/lib/email-templates"
import { generateDeliveryPasscode, createHandoverPackage } from "@/lib/api-handover"

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

    const { id: applicationId } = await params
    const body = await request.json()
    const {
      name,
      expiresAt,
      sendEmail: shouldSendEmail = true,
      requirePasscode = true,
      deliveryPasscode,
    } = body

    const pAny = prisma as any
    const application = await pAny.apiApplication.findUnique({
      where: { id: applicationId },
    })

    if (!application) {
      return NextResponse.json({ success: false, error: "Ứng dụng không tồn tại" }, { status: 404 })
    }

    if (application.status === "REVOKED") {
      return NextResponse.json({ success: false, error: "Không thể tạo khóa cho ứng dụng đã bị thu hồi" }, { status: 400 })
    }

    // Generate cryptographic key
    const generated = generateCryptoApiKey()

    const newKey = await pAny.apiKey.create({
      data: {
        applicationId,
        name: name?.trim() || "Khóa chính",
        keyId: generated.keyId,
        keyPrefix: generated.keyPrefix,
        keyHash: generated.keyHash,
        status: "ACTIVE",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    // Tìm email người nhận từ cấu hình ứng dụng
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

    let handoverPackage: any = null
    const finalPasscode = (deliveryPasscode?.trim() || generateDeliveryPasscode()).toUpperCase()

    if (requirePasscode) {
      handoverPackage = await createHandoverPackage({
        applicationId,
        appName: application.name,
        recipientEmail: targetEmail,
        keyId: generated.keyId,
        keyPrefix: generated.keyPrefix,
        rawKey: generated.rawKey,
        passcode: finalPasscode,
        hoursValid: 72,
      })
    }

    let emailSent = false
    if (targetEmail && shouldSendEmail) {
      try {
        const unlockUrl = handoverPackage
          ? `https://ssm.skylineschool.edu.vn${handoverPackage.handoverUrl}`
          : "https://ssm.skylineschool.edu.vn/api-docs.html"

        const keyInfoBox = handoverPackage
          ? `
          <div style="background-color: #0F172A; border-radius: 8px; padding: 16px; margin: 14px 0; color: #F8FAFC;">
            <div style="color: #38BDF8; font-family: monospace; font-size: 13px; font-weight: bold; margin-bottom: 6px;">
              Mã khóa: ${generated.keyId} (${generated.keyPrefix})
            </div>
            <div style="background-color: rgba(0, 161, 154, 0.15); border: 1px solid rgba(0, 161, 154, 0.3); border-radius: 6px; padding: 10px 12px; margin-top: 8px; font-size: 12px; color: #E6F4F3;">
              🔒 <strong>Khóa API đã được bảo vệ bằng Mật khẩu bàn giao (Passcode).</strong><br/>
              Mã khóa không gửi công khai qua email để bảo mật theo Nghị định 13/2023/NĐ-CP. Thầy/Cô vui lòng nhập Mật khẩu do Quản trị viên gửi qua kênh liên lạc riêng để xem mã khóa.
            </div>
          </div>
        `
          : `
          <div style="background-color: #0F172A; border-radius: 8px; padding: 14px 16px; margin: 12px 0; color: #38BDF8; font-family: monospace; font-size: 13px; word-break: break-all;">
            ${generated.rawKey}
          </div>
        `

        const emailHtml = renderSkylineEmail({
          headerBadge: "CẤP KHÓA KẾT NỐI API",
          headerTitle: "Thông Báo Khởi Tạo Khóa API & Bàn Giao Bảo Mật",
          headerSubtitle: "Hệ thống Quản lý Giáo dục Sky-Line SSM",
          headerTheme: "teal",
          recipientName: teacherName ? `Thầy/Cô ${teacherName}` : "Thầy/Cô phụ trách",
          greetingPrefix: "Kính gửi",
          introMessage: `Hệ thống vừa khởi tạo thành công khóa API mới cho ứng dụng tích hợp <strong>"${application.name}"</strong> thuộc <strong>${departmentName || "Tổ chuyên môn"}</strong>.`,
          detailsTitle: "Thông số Khóa API được cấp",
          details: [
            { label: "Ứng dụng", value: application.name, highlight: true },
            { label: "Tên nhãn khóa", value: newKey.name || "Khóa chính" },
            { label: "Mã định danh (Key ID)", value: newKey.keyId },
            { label: "Tiền tố hiển thị", value: newKey.keyPrefix },
            { label: "Thời hạn hiệu lực", value: newKey.expiresAt ? new Date(newKey.expiresAt).toLocaleDateString("vi-VN") : "Vô thời hạn" },
            { label: "Cơ chế bảo vệ", value: handoverPackage ? "Được bảo vệ bằng Mật khẩu bàn giao (Passcode)" : "Mặc định", highlight: true },
            { label: "Thời gian khởi tạo", value: new Date().toLocaleString("vi-VN") },
          ],
          noticeBox: {
            type: "warning",
            title: "Bảo Mật Giao Nhận Khóa 2 Lớp",
            content: "Nhấn nút 'Mở Khóa API Bằng Mật Khẩu Bàn Giao' bên dưới và nhập Mật khẩu bảo vệ do Ban Quản trị cung cấp qua SMS / Zalo / Trực tiếp."
          },
          extraHtml: keyInfoBox,
          button: {
            text: handoverPackage ? "🔑 Mở Khóa API Bằng Mật Khẩu Bàn Giao" : "Xem Hướng dẫn Tích hợp & n8n Workflow",
            url: unlockUrl,
          },
          secondaryNote: "Nếu không yêu cầu cấp khóa này hoặc nghi ngờ bị lộ thông tin, vui lòng liên hệ ngay Quản trị viên để thu hồi khóa."
        })

        const mailRes = await sendEmail({
          to: targetEmail,
          subject: `[Sky-line SMS] Thông báo Khởi tạo Khóa API: ${application.name} (${newKey.name})`,
          html: emailHtml,
        })
        emailSent = mailRes.success
      } catch (mErr) {
        console.error("Lỗi gửi email cấp khóa API:", mErr)
      }
    }

    return NextResponse.json(
      {
        success: true,
        key: {
          id: newKey.id,
          keyId: newKey.keyId,
          name: newKey.name,
          keyPrefix: newKey.keyPrefix,
          status: newKey.status,
          expiresAt: newKey.expiresAt,
          createdAt: newKey.createdAt,
        },
        rawKey: generated.rawKey,
        deliveryPasscode: handoverPackage ? finalPasscode : null,
        handoverUrl: handoverPackage ? handoverPackage.handoverUrl : null,
        emailSent,
        recipientEmail: targetEmail,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Lỗi tạo API Key:", error)
    return NextResponse.json({ success: false, error: "Không thể khởi tạo khóa API mới" }, { status: 500 })
  }
}
