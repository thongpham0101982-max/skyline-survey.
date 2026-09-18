// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { sendEmail } from "@/lib/mail"
import { renderGradeReminderEmail } from "@/lib/email-templates"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get("academicYearId") || ""
    const evaluationPeriod = searchParams.get("evaluationPeriod") || ""
    const classId = searchParams.get("classId")
    const subjectId = searchParams.get("subjectId")

    const where: any = {}
    if (academicYearId) where.academicYearId = academicYearId
    if (evaluationPeriod) where.evaluationPeriod = evaluationPeriod
    if (classId) where.classId = classId
    if (subjectId) where.subjectId = subjectId

    const reminders = await prisma.gradeEntryReminder.findMany({
      where,
      orderBy: { remindedAt: "desc" },
      take: 100
    })

    return NextResponse.json({
      success: true,
      reminders
    })
  } catch (error: any) {
    console.error("Lỗi lấy lịch sử nhắc nhở nhập điểm:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized: Vui lòng đăng nhập" }, { status: 401 })
    }
    const role = ((session.user as any)?.role || "").toUpperCase().trim()
    const isAllowed = ["ADMIN", "ADMINISTRATOR", "SUPER_ADMIN", "SUPERADMIN", "KT_DBCL", "KHAO_THI", "TB_DHCM", "GDCS"].includes(role)
    if (!isAllowed) {
      return NextResponse.json({ success: false, error: "Forbidden: Bạn không có quyền gửi nhắc nhở nhập điểm" }, { status: 403 })
    }

    const userName = (session.user as any)?.name || (session.user as any)?.fullName || "Ban Khảo thí & ĐBCL"
    
    const body = await request.json()
    const {
      academicYearId,
      evaluationPeriod = "KSĐN",
      reminders = [], // Array<{ classId, className, subjectId, subjectName, teacherId, teacherName, recipientEmail, message }>
      sendEmail: shouldSendEmail = true,
      customMessage = ""
    } = body

    if (!academicYearId) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin năm học" }, { status: 400 })
    }

    if (!Array.isArray(reminders) || reminders.length === 0) {
      return NextResponse.json({ success: false, error: "Danh sách nhắc nhở trống" }, { status: 400 })
    }

    const now = new Date()
    const results = []
    let emailSuccessCount = 0
    let emailFailCount = 0

    for (const item of reminders) {
      if (!item.classId || !item.subjectId) continue

      const teacherName = item.teacherName || "Quý Thầy/Cô"
      const subjectName = item.subjectName || "Môn học"
      const className = item.className || "Lớp"
      const email = (item.recipientEmail || "").trim()

      const defaultMsg = `Kính gửi Thầy/Cô ${teacherName},

Bộ phận Khảo thí & Đảm bảo Chất lượng Giáo dục Hệ thống Giáo dục Sky-Line xin trân trọng thông báo và đề nghị Thầy/Cô khẩn trương hoàn thành việc nhập Sổ điểm và Nhận xét cho môn ${subjectName} - Lớp ${className} trong Kỳ ${evaluationPeriod}.

Vui lòng đăng nhập Cổng thông tin Giáo viên Sky-line SMS để kiểm tra và hoàn thành trước thời hạn khóa sổ điểm.

Trân trọng cảm ơn sự phối hợp của Thầy/Cô!`

      const finalMessage = customMessage ? `${customMessage}\n\n(Môn: ${subjectName} - Lớp: ${className} - Kỳ: ${evaluationPeriod})` : (item.message || defaultMsg)

      let emailSent = false
      let emailError = null

      if (shouldSendEmail && email && email.includes("@")) {
        try {
          const emailSubject = `[Sky-line SMS] Nhắc nhở nhập điểm: ${subjectName} - Lớp ${className} (${evaluationPeriod})`
          const htmlContent = renderGradeReminderEmail({
            teacherName,
            subjectName,
            className,
            evaluationPeriod,
            sentTime: now.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
            customMessage: customMessage || undefined,
            directLink: `${process.env.NEXTAUTH_URL || "https://ssm.skylineschool.edu.vn"}/teacher/so-diem-nhan-xet`
          })

          const emailRes = await sendEmail({
            to: email,
            subject: emailSubject,
            html: htmlContent,
            text: finalMessage,
            from: "Ban Khảo thí & ĐBCL Sky-Line <bankhaothi@skylineschool.edu.vn>"
          });

          if (emailRes.success) {
            emailSent = true;
            emailSuccessCount++;
          } else {
            emailError = emailRes.error || "Lỗi gửi email";
            emailFailCount++;
          }
        } catch (e: any) {
          emailError = e.message;
          emailFailCount++;
        }
      }

      // Record reminder in database
      const reminderRecord = await prisma.gradeEntryReminder.create({
        data: {
          academicYearId,
          evaluationPeriod,
          classId: item.classId,
          subjectId: item.subjectId,
          teacherId: item.teacherId || null,
          teacherName: teacherName,
          recipientEmail: email || null,
          remindedBy: userName,
          remindedAt: now,
          message: finalMessage,
          channel: emailSent ? "EMAIL" : (email ? "EMAIL_FAILED" : "SYSTEM")
        }
      });

      results.push({
        id: reminderRecord.id,
        classId: item.classId,
        subjectId: item.subjectId,
        teacherName,
        email,
        emailSent,
        emailError,
        remindedAt: now
      });
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      emailSuccessCount,
      emailFailCount,
      results
    });
  } catch (error: any) {
    console.error("Lỗi gửi nhắc nhở nhập điểm:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
