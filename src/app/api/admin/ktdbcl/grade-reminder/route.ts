// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { sendEmail } from "@/lib/mail"

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
    const userName = (session?.user as any)?.name || (session?.user as any)?.fullName || "Ban Khảo thí & ĐBCL"
    
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

Vui lòng đăng nhập Cổng thông tin Giáo viên Sky-Line SIS để kiểm tra và hoàn thành trước thời hạn khóa sổ điểm.

Trân trọng cảm ơn sự phối hợp của Thầy/Cô!`

      const finalMessage = customMessage ? `${customMessage}\n\n(Môn: ${subjectName} - Lớp: ${className} - Kỳ: ${evaluationPeriod})` : (item.message || defaultMsg)

      let emailSent = false
      let emailError = null

      if (shouldSendEmail && email && email.includes("@")) {
        try {
          const emailSubject = `[Sky-Line SIS] Nhắc nhở nhập điểm: ${subjectName} - Lớp ${className} (${evaluationPeriod})`
          const htmlContent = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px; text-align: center; color: white;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">HỆ THỐNG GIÁO DỤC SKY-LINE</h2>
                <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Ban Khảo thí & Đảm bảo Chất lượng Giáo dục</p>
              </div>
              <div style="padding: 28px 24px; background-color: #ffffff;">
                <p style="font-size: 15px; margin-top: 0;">Kính gửi Thầy/Cô <strong>${teacherName}</strong>,</p>
                <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                  Hệ thống ghi nhận việc nhập điểm và nhận xét cho lớp phân công của Thầy/Cô hiện chưa hoàn tất:
                </p>
                
                <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 4px 0; color: #64748b; width: 130px;">Môn học:</td>
                      <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${subjectName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #64748b;">Lớp giảng dạy:</td>
                      <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${className}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #64748b;">Kỳ khảo sát:</td>
                      <td style="padding: 4px 0; font-weight: 600; color: #0284c7;">${evaluationPeriod}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #64748b;">Thời gian gửi:</td>
                      <td style="padding: 4px 0; color: #334155;">${now.toLocaleString("vi-VN")}</td>
                    </tr>
                  </table>
                </div>

                <div style="white-space: pre-line; font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
                  ${finalMessage}
                </div>

                <div style="text-align: center; margin: 30px 0 20px 0;">
                  <a href="https://skyline-survey.vercel.app/teacher/grade-entries" 
                     style="background-color: #0284c7; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.3);">
                    Truy cập Cổng Nhập Điểm Giáo Viên
                  </a>
                </div>

                <p style="font-size: 13px; color: #64748b; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-bottom: 0;">
                  <em>Lưu ý: Sau thời hạn quy định, Hệ thống sẽ thực hiện Khóa sổ điểm để phục vụ công tác thống kê & phân tích chất lượng.</em>
                </p>
              </div>
              <div style="background-color: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b;">
                Email này được gửi tự động từ Hệ thống Quản trị Khảo thí & ĐBCL Sky-Line.
              </div>
            </div>
          `;

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
