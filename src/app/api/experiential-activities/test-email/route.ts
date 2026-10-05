// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/mail";
import { ACTIVITY_STRANDS } from "@/lib/experiential/constants";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      testEmail,
      activityName = "Hoạt động trải nghiệm",
      activityCode = "HDTN-SAMPLE",
      strand = "BAN_THAN",
      activityTypeName = "Sự kiện / Lễ hội",
      subjectName,
      date,
      timeRange,
      location,
      deadline,
      senderName = "Tổ CTHS - Ban HĐNGLL",
      senderEmail,
      replyTo,
      customMessage = "Thầy cô vui lòng thực hiện đánh giá vai trò của Học sinh lớp.",
      assignedClasses = []
    } = body;

    const emailTo = testEmail || session.user.email;
    if (!emailTo) {
      return NextResponse.json({ error: "Vui lòng cung cấp email nhận thư thử nghiệm" }, { status: 400 });
    }

    const strandObj = ACTIVITY_STRANDS.find(s => s.id === strand);
    const strandLabel = strandObj ? strandObj.name : "Hướng vào bản thân";
    const displaySender = senderName || "Tổ CTHS - Ban HĐNGLL";
    const fromAddr = senderEmail ? `"${displaySender}" <${senderEmail}>` : `"${displaySender}" <bankhaothi@skylineschool.edu.vn>`;
    const formattedDate = date ? new Date(date).toLocaleDateString("vi-VN") : "Theo lịch công tác";
    const classNames = assignedClasses.map((c: any) => c.className).join(", ") || "Các lớp phân công";

    const appUrl = process.env.NEXTAUTH_URL || "https://skylineschool.edu.vn";
    const activityUrl = `${appUrl}/teacher/experiential-activities`;

    const testHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thông Báo Hoạt Động Trải Nghiệm - Sky-Line</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1E293B;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F1F5F9" style="table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 660px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0;">
          
          <!-- TEST NOTICE BANNER -->
          <tr>
            <td bgcolor="#FEF3C7" style="background-color: #FEF3C7; color: #92400E; padding: 10px 16px; text-align: center; font-size: 12px; font-weight: 800; border-bottom: 1px solid #FDE68A;">
              ⚠️ ĐÂY LÀ EMAIL THỬ NGHIỆM TỪ HỆ THỐNG SKY-LINE
            </td>
          </tr>

          <!-- HEADER BANNER -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; background: linear-gradient(135deg, #003B3A 0%, #005B58 60%, #00A19A 100%); padding: 30px 24px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <span style="display: inline-block; padding: 4px 14px; background-color: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                      🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
                    </span>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-size: 21px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px; line-height: 1.3; text-transform: uppercase;">
                      QUẢN LÝ HOẠT ĐỘNG TRẢI NGHIỆM
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 6px;">
                    <div style="font-size: 13px; font-weight: 600; color: #CCFBF1; letter-spacing: 0.3px;">
                      ${displaySender.toUpperCase()}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <span style="display: inline-block; background-color: rgba(0, 161, 154, 0.25); border: 1px solid rgba(204, 251, 241, 0.4); padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; color: #FFFFFF;">
                      Mã kế hoạch: <strong style="color: #FDE047;">${activityCode || "HDTN-SAMPLE"}</strong>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN CONTENT BODY -->
          <tr>
            <td style="padding: 28px 24px; color: #1E293B;">
              <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: 700; color: #003B3A;">
                Kính gửi Quý Thầy/Cô,
              </p>
              
              <p style="font-size: 14px; line-height: 1.65; color: #334155; margin: 0 0 18px 0;">
                Lớp chủ nhiệm của Thầy/Cô vừa nhận được kế hoạch <strong>Hoạt động trải nghiệm</strong> từ <strong>${displaySender}</strong>.
              </p>

              <!-- MANDATORY ROLE EVALUATION CALLOUT -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F0FDFA" style="background-color: #F0FDFA; border-left: 4px solid #00A19A; border-radius: 10px; margin: 0 0 22px 0; border: 1px solid #CCFBF1; border-left: 4px solid #00A19A;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <div style="font-size: 13px; font-weight: 800; color: #003B3A; margin-bottom: 6px;">
                      📌 YÊU CẦU TRỌNG TÂM DÀNH CHO GVCN & GVBM:
                    </div>
                    <div style="font-size: 13px; line-height: 1.6; color: #134E4A;">
                      <strong>"Thầy cô vui lòng thực hiện đánh giá vai trò của Học sinh lớp."</strong><br/>
                      ${customMessage}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- ACTIVITY DETAILS TABLE -->
              <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #003B3A; letter-spacing: 0.5px; margin: 24px 0 10px 0; border-bottom: 2px solid #E2E8F0; padding-bottom: 6px;">
                THÔNG TIN & PHÂN LOẠI HOẠT ĐỘNG
              </div>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 24px; font-size: 13.5px; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
                <tr style="background-color: #F8FAFC;">
                  <td width="35%" style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">🎯 Tên hoạt động:</td>
                  <td width="65%" style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #003B3A;">${activityName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">🏷️ Mạch hoạt động:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #0F766E;">${strandLabel} (${activityTypeName})</td>
                </tr>
                ${subjectName ? `
                <tr style="background-color: #F8FAFC;">
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">📚 Môn học:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #003B3A;">${subjectName}</td>
                </tr>
                ` : ""}
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">🗓️ Thời gian:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #1E293B;">${formattedDate} ${timeRange ? `(${timeRange})` : ""}</td>
                </tr>
                <tr style="background-color: #F8FAFC;">
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">📍 Địa điểm:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #1E293B;">${location || "Tại các cơ sở Sky-Line"}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">👥 Lớp phụ trách:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #003B3A;">${classNames}</td>
                </tr>
                <tr style="background-color: #F8FAFC;">
                  <td style="padding: 10px 14px; font-weight: 700; color: #475569;">⏰ Hạn nộp đánh giá:</td>
                  <td style="padding: 10px 14px; color: #047857; font-weight: 800; font-size: 14px;">${deadline || "Theo kế hoạch nhà trường"}</td>
                </tr>
              </table>

              <!-- BULLETPROOF CTA BUTTON -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 28px auto; border-collapse: separate;">
                <tr>
                  <td align="center" bgcolor="#00A19A" style="border-radius: 10px; background-color: #00A19A;">
                    <a href="${activityUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13.5px; color: #FFFFFF; font-weight: 800; text-decoration: none; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #00A19A;">
                      TRUY CẬP VÀ ĐÁNH GIÁ VAI TRÒ HỌC SINH &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- INSTRUCTION NOTE -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFBEB; border: 1px solid #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px; margin-top: 20px;">
                <tr>
                  <td style="padding: 14px 16px; font-size: 12.5px; color: #92400E; line-height: 1.55;">
                    <strong style="color: #78350F;">💡 Hướng dẫn thao tác cho Thầy/Cô:</strong><br/>
                    1. Nhấp vào nút bấm phía trên hoặc đăng nhập cổng Quản trị Giáo viên Sky-Line.<br/>
                    2. Chọn mục <strong>"Hoạt động trải nghiệm"</strong> &rarr; Mở hoạt động <strong>"${activityName}"</strong>.<br/>
                    3. Chọn lớp phụ trách, chấm vai trò học sinh (Trưởng nhóm, Thành viên,...), điểm tiêu chí và nhấn <strong>"Lưu đánh giá"</strong>.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- OFFICIAL BRAND FOOTER -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 24px 24px; text-align: center; border-top: 3px solid #00A19A;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
              </p>
              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 600; color: #CCFBF1;">
                BAN ĐÀO TẠO & KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11px; color: rgba(255, 255, 255, 0.75);">
                Đơn vị gửi: <strong style="color: #FFFFFF;">${displaySender}</strong> ${senderEmail ? `(${senderEmail})` : ""}
              </p>
              <p style="margin: 0; font-size: 10px; color: rgba(255, 255, 255, 0.65); line-height: 1.5;">
                Email hỗ trợ: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #FDE047; text-decoration: none; font-weight: 600;">bankhaothi@skylineschool.edu.vn</a> • Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #FDE047; text-decoration: none; font-weight: 600;">skylineschool.edu.vn</a>
              </p>
              <p style="margin: 6px 0 0 0; font-size: 10px; color: rgba(255, 255, 255, 0.4);">
                Email này được gửi thử nghiệm từ hệ thống SSM Quản lý Hoạt động Trải nghiệm Sky-Line.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await sendEmail({
      from: fromAddr,
      to: emailTo,
      replyTo: replyTo || undefined,
      subject: `[Sky-line SMS - THỬ NGHIỆM] Kế hoạch Hoạt động Trải nghiệm: ${activityName}`,
      html: testHtml
    });

    return NextResponse.json({
      success: true,
      message: `Đã gửi email thử nghiệm thành công tới ${emailTo}`
    });
  } catch (error: any) {
    console.error("POST /api/experiential-activities/test-email error:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
