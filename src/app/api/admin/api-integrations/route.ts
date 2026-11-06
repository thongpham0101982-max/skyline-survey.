import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ensureApiIntegrationTables } from "@/lib/api-auth"
import { sendEmail } from "@/lib/mail"
import { renderSkylineEmail } from "@/lib/email-templates"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const role = ((session?.user as any)?.role || "").toUpperCase().trim()
    if (!["ADMIN", "SUPER_ADMIN", "SUPERADMIN"].includes(role)) {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 })
    }

    await ensureApiIntegrationTables()

    const pAny = prisma as any
    const [applications, departments, staffUsers] = await Promise.all([
      pAny.apiApplication.findMany({
        orderBy: { createdAt: "desc" },
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
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      prisma.department.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, code: true, name: true, blockCM: true, divisionCode: true },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        where: { role: { not: "PARENT" }, status: "ACTIVE" },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          teacher: {
            select: {
              id: true,
              teacherCode: true,
              teacherName: true,
              email: true,
              departmentId: true,
              departmentRel: {
                select: { id: true, name: true, code: true },
              },
            },
          },
        },
        orderBy: { fullName: "asc" },
      }),
    ])

    return NextResponse.json({
      success: true,
      applications,
      departments,
      staffUsers,
    })
  } catch (error: any) {
    console.error("Lỗi lấy danh sách ứng dụng API:", error)
    return NextResponse.json({ success: false, error: "Lỗi tải dữ liệu ứng dụng kết nối" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const role = ((session?.user as any)?.role || "").toUpperCase().trim()
    if (!["ADMIN", "SUPER_ADMIN", "SUPERADMIN"].includes(role)) {
      return NextResponse.json({ success: false, error: "Chỉ Quản trị viên mới có quyền tạo ứng dụng kết nối" }, { status: 403 })
    }

    await ensureApiIntegrationTables()

    const body = await request.json()
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
      permissions = [],
      allowedCampusIds = ["*"],
      allowedClassIds = ["*"],
      allowedDataScope = "ALL",
      expiresAt,
      rateLimitRpm = 60,
    } = body

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Tên ứng dụng không được để trống" }, { status: 400 })
    }

    // Xây dựng thông tin Người phụ trách & Phạm vi chuyên môn
    const finalContact =
      contactPerson?.trim() ||
      (teacherName
        ? `${teacherName}${departmentName ? ` (${departmentName})` : ""}${recipientEmail ? ` - ${recipientEmail}` : ""}`
        : null)

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
    }

    const pAny = prisma as any
    const newApp = await pAny.apiApplication.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        contactPerson: finalContact,
        status: "ACTIVE",
        permissions: JSON.stringify(permissions),
        allowedCampusIds: JSON.stringify(allowedCampusIds),
        allowedClassIds: JSON.stringify(allowedClassIds),
        allowedDataScope: finalDataScope,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        rateLimitRpm: Number(rateLimitRpm) || 60,
        createdById: (session.user as any)?.id || null,
      },
      include: {
        apiKeys: true,
      },
    })

    // Gửi email thông báo bàn giao ứng dụng kết nối API đến GV / Tổ chuyên môn
    let emailSent = false
    let emailError: string | null = null

    if (recipientEmail && sendNotificationEmail) {
      try {
        const permList = Array.isArray(permissions) && permissions.length > 0
          ? permissions.join(", ")
          : "Chưa cấp quyền thao tác dữ liệu"

        const emailHtml = renderSkylineEmail({
          headerBadge: "CẤP QUYỀN KẾT NỐI API",
          headerTitle: "Thông Báo Cấp Quyền Tích Hợp API SSM",
          headerSubtitle: "Hệ thống Quản lý Giáo dục Sky-Line SSM",
          headerTheme: "teal",
          recipientName: teacherName ? `Thầy/Cô ${teacherName}` : "Thầy/Cô phụ trách Tổ chuyên môn",
          greetingPrefix: "Kính gửi",
          introMessage: `Hệ thống Sky-Line SSM vừa hoàn tất thiết lập ứng dụng tích hợp API <strong>"${name.trim()}"</strong>, được gán cho ${teacherName ? `Thầy/Cô <strong>${teacherName}</strong>` : "bộ phận"} thuộc <strong>${departmentName || "Tổ chuyên môn"}</strong>.`,
          detailsTitle: "Thông số Cấu hình & Phạm vi Phân quyền",
          details: [
            { label: "Tên ứng dụng", value: name.trim(), highlight: true },
            { label: "Tổ chuyên môn", value: departmentName || "Ban KT&ĐBCL / Toàn trường" },
            { label: "Người phụ trách", value: `${teacherName || "Chưa chọn cụ thể"} (${recipientEmail})` },
            { label: "Quyền truy cập", value: permList, color: "#00A19A", highlight: true },
            { label: "Phạm vi cơ sở", value: allowedCampusIds.includes("*") ? "Toàn bộ cơ sở trường Sky-Line" : "Theo cơ sở được phân quyền" },
            { label: "Hạn ngạch", value: `${rateLimitRpm || 60} yêu cầu/phút (RPM)` },
            { label: "Mục đích", value: description?.trim() || "Tích hợp dữ liệu học sinh, điểm số và khảo sát" },
            { label: "Thời gian cấp", value: new Date().toLocaleString("vi-VN") },
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
          subject: `[Sky-line SMS] Thông báo Cấp quyền Tích hợp API: ${name.trim()}`,
          html: emailHtml,
        })
        emailSent = mailRes.success
      } catch (err: any) {
        console.error("Lỗi khi gửi email thông báo API:", err)
        emailError = err?.message || "Không thể gửi email"
      }
    }

    return NextResponse.json({
      success: true,
      application: newApp,
      emailSent,
      emailError,
    }, { status: 201 })
  } catch (error: any) {
    console.error("Lỗi tạo ứng dụng API:", error)
    return NextResponse.json({ success: false, error: "Không thể tạo ứng dụng kết nối" }, { status: 500 })
  }
}
