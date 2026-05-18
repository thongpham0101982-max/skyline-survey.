// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/mail";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { to, subject, periodName, batchName, students, attachLetters, pdfAttachments } = await req.json();

    if (!to || !students || !Array.isArray(students)) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const host = req.headers.get("host") || "skyline-survey-rh4k.vercel.app";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;

    const showAttachments = attachLetters === true;

    // Build the gorgeous HTML email body
    const rowsHtml = students.map((s, idx) => {
      const dob = s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "—";
      const gender = s.gender === "M" || s.gender === "Nam" ? "Nam" : s.gender === "F" || s.gender === "Nữ" ? "Nữ" : s.gender || "—";
      const resultColor = s.admissionResult === "Đạt" ? "#059669" : s.admissionResult === "Đạt cam kết" ? "#d97706" : s.admissionResult === "Không đạt" ? "#dc2626" : "#4b5563";
      const resultBg = s.admissionResult === "Đạt" ? "#ecfdf5" : s.admissionResult === "Đạt cam kết" ? "#fef3c7" : s.admissionResult === "Không đạt" ? "#fef2f2" : "#f3f4f6";
      
      let attachmentsHtml = "—";
      if (s.admissionResult === "Đạt" || s.admissionResult === "Đạt cam kết") {
        attachmentsHtml = `
          <a href="${baseUrl}/admin/input-assessments?studentId=${s.id}&print=chuc_mung" style="display: inline-block; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; color: #ffffff; background-color: #059669; text-decoration: none; white-space: nowrap; border: 1px solid #047857; text-shadow: 0 1px 1px rgba(0,0,0,0.1);">
            Thư chúc mừng
          </a>
        `;
      }

      const attachmentsTd = showAttachments ? `
        <td style="padding: 12px; text-align: center; vertical-align: middle;">
          ${attachmentsHtml}
        </td>
      ` : "";

      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; text-align: center; font-size: 13px; color: #64748b;">${idx + 1}</td>
          <td style="padding: 12px; font-weight: bold; font-size: 13px; color: #1e293b;">${s.fullName || "—"}</td>
          <td style="padding: 12px; text-align: center; font-size: 13px; color: #334155;">K${s.grade || "—"}</td>
          <td style="padding: 12px; text-align: center; font-size: 13px; color: #334155;">${gender}</td>
          <td style="padding: 12px; text-align: center; font-size: 13px; color: #334155;">${dob}</td>
          <td style="padding: 12px; font-size: 12px; color: #475569; font-weight: 500;">${s.surveyFormType || "—"}</td>
          <td style="padding: 12px; text-align: center;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; color: ${resultColor}; background-color: ${resultBg};">
              ${s.admissionResult || "Chưa xét duyệt"}
            </span>
          </td>
          <td style="padding: 12px; font-size: 12px; font-weight: 600; color: #4f46e5;">${s.admissionCampus || "—"}</td>
          ${attachmentsTd}
        </tr>
      `;
    }).join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 20px 0;">
          <tr>
            <td align="center">
              <table width="750" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">BÁO CÁO KẾT QUẢ KHẢO SÁT ĐẦU VÀO</h1>
                    <p style="margin: 5px 0 0 0; color: #c7d2fe; font-size: 14px; font-weight: 500;">Hệ thống Khảo sát & Đánh giá năng lực Skyline</p>
                  </td>
                </tr>
                <!-- Info Section -->
                <tr>
                  <td style="padding: 24px; border-bottom: 1px solid #e2e8f0; background-color: #f1f5f9;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%" style="vertical-align: top;">
                          <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; tracking-wider: 1px;">Kỳ Khảo sát</div>
                          <div style="font-size: 15px; font-weight: bold; color: #0f172a; margin-top: 4px;">${periodName}</div>
                        </td>
                        <td width="50%" style="vertical-align: top;">
                          <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; tracking-wider: 1px;">Đợt Khảo sát</div>
                          <div style="font-size: 15px; font-weight: bold; color: #0f172a; margin-top: 4px;">${batchName}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Content / Table -->
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #1e293b; border-left: 4px solid #4f46e5; padding-left: 10px;">
                      Danh sách Học sinh đã có kết quả xét tuyển (${students.length} học sinh)
                    </h3>
                    
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; min-width: 100%;">
                      <thead>
                        <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                          <th style="padding: 12px 8px; text-align: center; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase;">STT</th>
                          <th style="padding: 12px 8px; text-align: left; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase;">Họ và Tên</th>
                          <th style="padding: 12px 8px; text-align: center; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase;">Khối</th>
                          <th style="padding: 12px 8px; text-align: center; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase;">Phái</th>
                          <th style="padding: 12px 8px; text-align: center; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase;">Ngày sinh</th>
                          <th style="padding: 12px 8px; text-align: left; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase;">Hệ Khảo sát</th>
                          <th style="padding: 12px 8px; text-align: center; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase;">Kết quả</th>
                          <th style="padding: 12px 8px; text-align: left; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase;">Cơ sở nhận</th>
                          ${showAttachments ? `<th style="padding: 12px 8px; text-align: center; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase;">Hồ sơ đính kèm</th>` : ""}
                        </tr>
                      </thead>
                      <tbody>
                        ${rowsHtml}
                      </tbody>
                    </table>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                    <p style="margin: 0;">Email gửi tự động từ Hệ thống Khảo sát Tuyển sinh Skyline.</p>
                    <p style="margin: 4px 0 0 0; font-weight: bold; color: #475569;">Trường Tiểu học, THCS và THPT Sky-Line</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Process PDF attachments - supports direct client-side pre-compiled base64 PDFs
    const mailAttachments = [];
    if (showAttachments && Array.isArray(pdfAttachments) && pdfAttachments.length > 0) {
      let hasBase64 = false;
      for (const att of pdfAttachments) {
        if (att.base64) {
          hasBase64 = true;
          mailAttachments.push({
            filename: att.filename,
            content: Buffer.from(att.base64, "base64"),
            contentType: "application/pdf"
          });
        }
      }

      // Fallback to server-side Puppeteer ONLY if HTML is passed without base64 pre-compilation
      if (!hasBase64) {
        let puppeteer;
        try {
          puppeteer = require("puppeteer");
        } catch (e) {
          console.error("Puppeteer import failed:", e);
        }

        if (puppeteer) {
          try {
            const browser = await puppeteer.launch({
              headless: true,
              args: ["--no-sandbox", "--disable-setuid-sandbox"]
            });
            
            for (const att of pdfAttachments) {
              if (att.html) {
                try {
                  const page = await browser.newPage();
                  await page.emulateMediaType("screen");
                  await page.setContent(att.html, { waitUntil: "networkidle0", timeout: 15000 });
                  
                  const pdfBuffer = await page.pdf({
                    format: "A4",
                    printBackground: true,
                    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" }
                  });
                  
                  mailAttachments.push({
                    filename: att.filename,
                    content: pdfBuffer,
                    contentType: "application/pdf"
                  });
                } catch (err) {
                  console.error(`Failed to generate PDF for ${att.filename}:`, err);
                }
              }
            }
            await browser.close();
          } catch (launchErr) {
            console.error("Failed to launch Puppeteer:", launchErr);
          }
        }
      }
    }

    try {
      await sendEmail({
        to,
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
