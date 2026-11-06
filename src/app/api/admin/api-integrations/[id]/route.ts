import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/mail"
import { renderSkylineEmail } from "@/lib/email-templates"

export async function PATCH(
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
    const body = await request.json()
    const pAny = prisma as any

    const {
      name,
      description,
      contactPerson,
      departmentId,
      departmentName,
      teacherId,
      teacherName,
      recipientEmail,
      sendNotificationEmail = true,
      permissions,
      allowedCampusIds,
      allowedClassIds,
      allowedDataScope,
      expiresAt,
      rateLimitRpm,
      status,
    } = body

    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (status !== undefined) updateData.status = status
    if (permissions !== undefined) {
      updateData.permissions = typeof permissions === "string" ? permissions : JSON.stringify(permissions)
    }
    if (allowedCampusIds !== undefined) {
      updateData.allowedCampusIds = typeof allowedCampusIds === "string" ? allowedCampusIds : JSON.stringify(allowedCampusIds)
    }
    if (allowedClassIds !== undefined) {
      updateData.allowedClassIds = typeof allowedClassIds === "string" ? allowedClassIds : JSON.stringify(allowedClassIds)
    }
    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt ? new Date(expiresAt) : null
    }
    if (rateLimitRpm !== undefined) updateData.rateLimitRpm = Number(rateLimitRpm)

    // Cập nhật cấu hình chuyên môn và email
    let finalDataScope = allowedDataScope
    if (departmentId || teacherId || recipientEmail) {
      finalDataScope = JSON.stringify({
        departmentId: departmentId || null,
        departmentName: departmentName || null,
        teacherId: teacherId || null,
        teacherName: teacherName || null,
        recipientEmail: recipientEmail || null,
        originalScope: allowedDataScope === "ALL" ? "ALL" : allowedDataScope,
      })
      updateData.allowedDataScope = finalDataScope
    } else if (allowedDataScope !== undefined) {
      updateData.allowedDataScope = allowedDataScope
    }

    const finalContact =
      contactPerson?.trim() ||
      (teacherName
        ? `${teacherName}${departmentName ? ` (${departmentName})` : ""}${recipientEmail ? ` - ${recipientEmail}` : ""}`
        : null)

    if (finalContact) {
      updateData.contactPerson = finalContact
    }

    const updated = await pAny.apiApplication.update({
      where: { id },
      data: updateData,
      include: {
        apiKeys: {
          select: {
            id: true,
            name: true,
            keyId: true,
            keyPrefix: true,
            status: true,
            expiresAt: true,
            lastUsedAt: true,
            revokedAt: true,
            revokedReason: true,
            createdAt: true,
          },
        },
      },
    })

    // Gửi email thông báo cập nhật nếu có email
    let emailSent = false
    let emailError: string | null = null

    if (recipientEmail && sendNotificationEmail) {
      try {
        let permList = "Chưa cấp quyền thao tác dữ liệu"
        if (permissions) {
          const arr = typeof permissions === "string" ? JSON.parse(permissions) : permissions
          if (Array.isArray(arr) && arr.length > 0) permList = arr.join(", ")
        } else if (updated.permissions) {
          try {
            const arr = JSON.parse(updated.permissions)
            if (Array.isArray(arr) && arr.length > 0) permList = arr.join(", ")
          } catch (_) {}
        }

        const appName = updated.name || name || "Ứng dụng kết nối"
        const emailHtml = renderSkylineEmail({
          headerBadge: "CẤP QUYỀN KẾT NỐI API",
          headerTitle: "Thông Báo Cập Nhật & Bàn Giao API SSM",
          headerSubtitle: "Hệ thống Quản lý Giáo dục Sky-Line SSM",
          headerTheme: "teal",
          recipientName: teacherName ? `Thầy/Cô ${teacherName}` : "Thầy/Cô phụ trách Tổ chuyên môn",
          greetingPrefix: "Kính gửi",
          introMessage: `Hệ thống Sky-Line SSM vừa cập nhật thông tin ứng dụng tích hợp API <strong>"${appName}"</strong>, được gán cho ${teacherName ? `Thầy/Cô <strong>${teacherName}</strong>` : "bộ phận"} thuộc <strong>${departmentName || "Tổ chuyên môn"}</strong>.`,
          detailsTitle: "Thông số Cấu hình & Phạm vi Phân quyền Mới",
          details: [
            { label: "Tên ứng dụng", value: appName, highlight: true },
            { label: "Tổ chuyên môn", value: departmentName || "Ban KT&ĐBCL / Toàn trường" },
            { label: "Người phụ trách", value: `${teacherName || "Chưa chọn cụ thể"} (${recipientEmail})` },
            { label: "Quyền truy cập", value: permList, color: "#00A19A", highlight: true },
            { label: "Hạn ngạch", value: `${updated.rateLimitRpm || rateLimitRpm || 60} yêu cầu/phút (RPM)` },
            { label: "Mô tả kết nối", value: updated.description || description?.trim() || "Không có" },
            { label: "Thời gian cập nhật", value: new Date().toLocaleString("vi-VN") },
          ],
          noticeBox: {
            type: "info",
            title: "Quy trình Bàn giao Khóa API & Kết nối",
            content: "Để bắt đầu kết nối, Quản trị viên hệ thống sẽ khởi tạo Khóa API bí mật (API Key) và bàn giao an toàn. Thầy/Cô và đối tác kỹ thuật có thể tra cứu tài liệu OpenAPI chi tiết tại đường link bên dưới."
          },
          button: {
            text: "Tra cứu Tài liệu Hướng dẫn API (OpenAPI)",
            url: "https://ssm.skylineschool.edu.vn/api-docs.html",
          },
          secondaryNote: "Mọi thắc mắc kỹ thuật vui lòng liên hệ Ban Công nghệ Thông tin & Ban Khảo thí - Đảm bảo Chất lượng Sky-Line."
        })

        const mailRes = await sendEmail({
          to: recipientEmail,
          subject: `[Sky-line SMS] Thông báo Cấp quyền Tích hợp API: ${appName}`,
          html: emailHtml,
        })
        emailSent = mailRes.success
        if (!mailRes.success) emailError = mailRes.error || mailRes.reason || "Lỗi gửi thư"
      } catch (err: any) {
        console.error("Lỗi khi gửi email cập nhật API:", err)
        emailError = err?.message || "Không thể gửi email"
      }
    }

    return NextResponse.json({
      success: true,
      application: updated,
      emailSent,
      emailError,
    })
  } catch (error: any) {
    console.error("Lỗi cập nhật ứng dụng API:", error)
    return NextResponse.json({ success: false, error: "Không thể cập nhật ứng dụng" }, { status: 500 })
  }
}

export async function DELETE(
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
    const pAny = prisma as any

    // Soft delete / revoke
    const revoked = await pAny.apiApplication.update({
      where: { id },
      data: { status: "REVOKED" },
    })

    // Also revoke all associated active keys
    await pAny.apiKey.updateMany({
      where: { applicationId: id, status: "ACTIVE" },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedReason: "Thu hồi toàn bộ ứng dụng",
      },
    })

    return NextResponse.json({ success: true, application: revoked })
  } catch (error: any) {
    console.error("Lỗi thu hồi ứng dụng API:", error)
    return NextResponse.json({ success: false, error: "Không thể thu hồi ứng dụng" }, { status: 500 })
  }
}
