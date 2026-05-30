// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/mail";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { to, cc, subject, periodName, batchName, students, attachLetters, pdfAttachments } = await req.json();

    if (!to || !students || !Array.isArray(students)) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const host = req.headers.get("host") || "skyline-survey-rh4k.vercel.app";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;

    const showAttachments = attachLetters === true;

    // Build the gorgeous HTML email body for Preschool
    const totalStudents = students.length;
    const totalPassed = students.filter(s => {
      return (s.probationaryResult === "DAT" || (s.admissionResult || "").toUpperCase().includes("MIỄN") || (s.admissionResult || "").toUpperCase().includes("MIEN"));
    }).length;
    const totalPendingOrFailed = totalStudents - totalPassed;

    const rowsHtml = students.map((s, idx) => {
      const dob = s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "—";
      const gender = s.gender === "Nam" || s.gender === "M" ? "Nam" : s.gender === "Nữ" || s.gender === "F" ? "Nữ" : s.gender || "—";
      
      const isPassed = (s.probationaryResult === "DAT" || (s.admissionResult || "").toUpperCase().includes("MIỄN") || (s.admissionResult || "").toUpperCase().includes("MIEN"));
      const resultText = s.probationaryResult === "DAT" ? "ĐẠT - SAU HỌC THỬ" : isPassed ? "ĐẠT - MIỄN HỌC THỬ" : "CHƯA DUYỆT";
      
      const resColor = isPassed ? "#047857" : "#4b5563";
      const resBg = isPassed ? "#ecfdf5" : "#f3f4f6";
      const resBorder = isPassed ? "#a7f3d0" : "#e5e7eb";
      
      let attachmentsHtml = "—";
      if (isPassed) {
        attachmentsHtml = `
          <a href="${baseUrl}/admin/preschool-input-assessments?studentId=${s.id}&print=chuc_mung" style="display: inline-block; padding: 6px 12px; border-radius: 9999px; font-size: 11px; font-weight: bold; color: #ffffff; background: linear-gradient(135deg, #007a87 0%, #009ca6 100%); text-decoration: none; white-space: nowrap; border: 1px solid #005a63; box-shadow: 0 4px 6px -1px rgba(0, 122, 135, 0.2); transition: all 0.2s ease;">
            Tải mẫu thư
          </a>
        `;
      }

      const attachmentsTd = showAttachments ? `
        <td style="padding: 14px 10px; text-align: center; vertical-align: middle;">
          ${attachmentsHtml}
        </td>
      ` : "";

      return `
        <tr style="border-bottom: 1px solid #f1f5f9; background-color: ${idx % 2 === 0 ? '#ffffff' : '#fcfdfe'};">
          <td style="padding: 14px 10px; text-align: center; font-size: 13px; color: #64748b; font-weight: 600;">${idx + 1}</td>
          <td style="padding: 14px 10px; font-weight: 700; font-size: 14px; color: #0f172a;">${s.fullName || "—"}</td>
          <td style="padding: 14px 10px; text-align: center; font-size: 13px; color: #334155; font-weight: 600;">${s.grade || "—"}</td>
          <td style="padding: 14px 10px; text-align: center; font-size: 13px; color: #475569;">${gender}</td>
          <td style="padding: 14px 10px; text-align: center; font-size: 13px; color: #475569;">${dob}</td>
          <td style="padding: 14px 10px; font-size: 13px; color: #334155; font-weight: 500;">${s.surveyFormType || "—"}</td>
          <td style="padding: 14px 10px; text-align: center;">
            <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; color: ${resColor}; background-color: ${resBg}; border: 1px solid ${resBorder}; text-transform: uppercase; letter-spacing: 0.5px;">
              ${resultText}
            </span>
          </td>
          <td style="padding: 14px 10px; font-size: 13px; font-weight: 700; color: #007a87;">${s.admissionCampus || "—"}</td>
          ${attachmentsTd}
        </tr>
      `;
    }).join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap');
          body {
            font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; color: #1e293b; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table width="850" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 122, 135, 0.08), 0 8px 10px -6px rgba(0, 122, 135, 0.08); border: 1px solid #e2e8f0;">
                
                <!-- Glowing Header with brand Teal Gradient -->
                <tr>
                  <td style="background: linear-gradient(135deg, #005a63 0%, #007a87 50%, #009ca6 100%); padding: 40px 30px; text-align: center; position: relative;">
                    <div style="background-color: rgba(255,255,255,0.12); display: inline-block; padding: 6px 16px; border-radius: 9999px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.2);">
                      <span style="color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">Sky-Line Education System</span>
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1); text-transform: uppercase;">
                      Báo cáo Kết quả Khảo sát Mầm non
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #e0f2fe; font-size: 15px; font-weight: 500; opacity: 0.9;">
                      Hệ thống Quản lý Khảo sát & Đánh giá Năng lực Học sinh Mầm non Sky-Line
                    </p>
                  </td>
                </tr>

                <!-- Filter / Period Meta Section with Modern Badges -->
                <tr>
                  <td style="padding: 24px 30px; border-bottom: 1px solid #f1f5f9; background-color: #fafbfc;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%" style="vertical-align: middle;">
                          <table border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding-right: 12px; vertical-align: middle;">
                                <div style="background-color: #e0f2fe; width: 44px; height: 44px; border-radius: 12px; text-align: center; line-height: 44px; display: inline-block;">
                                  <span style="font-size: 20px; vertical-align: middle;">📅</span>
                                </div>
                              </td>
                              <td style="vertical-align: middle;">
                                <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Kỳ Khảo sát</div>
                                <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">${periodName}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="50%" style="vertical-align: middle;">
                          <table border="0" cellspacing="0" cellpadding="0" align="right">
                            <tr>
                              <td style="padding-right: 12px; vertical-align: middle;">
                                <div style="background-color: #ecfdf5; width: 44px; height: 44px; border-radius: 12px; text-align: center; line-height: 44px; display: inline-block;">
                                  <span style="font-size: 20px; vertical-align: middle;">🚀</span>
                                </div>
                              </td>
                              <td style="vertical-align: middle;">
                                <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Đợt Khảo sát</div>
                                <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">${batchName}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Stat Cards Row -->
                <tr>
                  <td style="padding: 24px 30px 10px 30px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <!-- Total Students Card -->
                        <td width="31%" style="padding-right: 15px;">
                          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; text-align: center;">
                            <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Tổng bé khảo sát</div>
                            <div style="font-size: 28px; font-weight: 800; color: #0f172a; margin-top: 4px;">${totalStudents}</div>
                          </div>
                        </td>
                        <!-- Passed Card -->
                        <td width="31%" style="padding-right: 15px;">
                          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 16px; padding: 16px; text-align: center;">
                            <div style="font-size: 10px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 1px;">Số bé Đạt</div>
                            <div style="font-size: 28px; font-weight: 800; color: #059669; margin-top: 4px;">${totalPassed}</div>
                          </div>
                        </td>
                        <!-- Failed/Pending Card -->
                        <td width="38%">
                          <div style="background-color: #fcfdfe; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; text-align: center;">
                            <div style="font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 1px;">Chưa duyệt/Khác</div>
                            <div style="font-size: 28px; font-weight: 800; color: #334155; margin-top: 4px;">${totalPendingOrFailed}</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content Area -->
                <tr>
                  <td style="padding: 20px 30px 40px 30px;">
                    <div style="margin-bottom: 20px;">
                      <table border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="width: 4px; background-color: #007a87; border-radius: 4px;"></td>
                          <td style="padding-left: 12px;">
                            <h2 style="margin: 0; font-size: 18px; font-weight: 800; color: #0f172a;">
                              Danh sách Kết quả khảo sát chi tiết
                            </h2>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- Beautiful Custom Styled Table -->
                    <div style="border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                        <thead>
                          <tr style="background-color: #007a87;">
                            <th style="padding: 14px 10px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #005a63;">STT</th>
                            <th style="padding: 14px 10px; text-align: left; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #005a63;">Họ và Tên</th>
                            <th style="padding: 14px 10px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #005a63;">Lớp/Nhóm</th>
                            <th style="padding: 14px 10px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #005a63;">Phái</th>
                            <th style="padding: 14px 10px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #005a63;">Ngày sinh</th>
                            <th style="padding: 14px 10px; text-align: left; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #005a63;">Hệ Khảo sát</th>
                            <th style="padding: 14px 10px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #005a63;">Kết quả</th>
                            <th style="padding: 14px 10px; text-align: left; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #005a63;">Cơ sở nhận</th>
                            ${showAttachments ? `<th style="padding: 14px 10px; text-align: center; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #005a63;">Hồ sơ mẫu</th>` : ""}
                          </tr>
                        </thead>
                        <tbody>
                          ${rowsHtml}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>

                <!-- Premium Footer -->
                <tr>
                  <td style="background-color: #fafbfc; padding: 30px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 13px; color: #64748b;">
                    <div style="margin-bottom: 12px;">
                      <img src="https://skyline-survey-rh4k.vercel.app/images/logo.png" alt="Sky-Line" style="height: 32px; opacity: 0.9;" onerror="this.style.display='none'">
                    </div>
                    <p style="margin: 0; line-height: 1.6;">Email báo cáo tự động từ <strong>Hệ thống Quản lý Khảo sát Tuyển sinh Sky-Line</strong>.</p>
                    <p style="margin: 4px 0 0 0; font-weight: 700; color: #007a87; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Hệ thống Giáo dục Sky-Line</p>
                    <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8;">Nơi học sinh học cách yêu thương, chia sẻ, tự lập & có trách nhiệm.</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    // Process PDF attachments
    const mailAttachments = [];
    if (showAttachments && Array.isArray(pdfAttachments) && pdfAttachments.length > 0) {
      for (const att of pdfAttachments) {
        if (att.base64) {
          mailAttachments.push({
            filename: att.filename,
            content: Buffer.from(att.base64, "base64"),
            contentType: "application/pdf"
          });
        }
      }
    }

    try {
      await sendEmail({
        to,
        cc,
        subject,
        html: emailHtml,
        attachments: mailAttachments
      });
      return NextResponse.json({ success: true, sent: true });
    } catch (err) {
      console.error("SMTP SEND ERROR:", err);
      return NextResponse.json({
        success: true,
        sent: false,
        error: err.message || "Failed to send via Office365 SMTP",
        html: emailHtml,
      });
    }
  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
