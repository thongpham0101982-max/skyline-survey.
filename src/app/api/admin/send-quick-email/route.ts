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

    // Build the gorgeous HTML email body
    const totalStudents = students.length;
    const totalPassed = students.filter(s => {
      const r = (s.admissionResult || "").trim();
      return r.includes("Đạt") || r.includes("DAT") || r.includes("MIỄN");
    }).length;
    const totalPendingOrFailed = totalStudents - totalPassed;

    const rowsHtml = students.map((s, idx) => {
      const dob = s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "—";
      const r = (s.admissionResult || "").trim();
      let resText = r || "Chưa xét duyệt";
      let resColor = "#4b5563", resBg = "#f3f4f6", resBorder = "#e5e7eb";

      if (r.includes("Đạt") && r.includes("cam kết")) {
        resText = "ĐẠT - CAM KẾT"; resColor = "#b45309"; resBg = "#fef3c7"; resBorder = "#fde68a";
      } else if (r.includes("Đạt") || r.includes("DAT") || r.includes("MIỄN")) {
        resText = r.toUpperCase(); resColor = "#047857"; resBg = "#ecfdf5"; resBorder = "#a7f3d0";
      } else if (r.includes("Không đạt") || r.includes("KHONG DAT")) {
        resText = "KHÔNG ĐẠT"; resColor = "#b91c1c"; resBg = "#fef2f2"; resBorder = "#fecaca";
      } else if (r.includes("Học thử")) {
        resText = "HỌC THỬ"; resColor = "#4338ca"; resBg = "#e0e7ff"; resBorder = "#c7d2fe";
      }

      const attachmentsTd = showAttachments ? `
        <td style="padding: 12px 10px; text-align: center;">
          ${(r.includes("Đạt") || r.includes("DAT") || r.includes("MIỄN")) ? 
            `<a href="${baseUrl}/admin/input-assessments?studentId=${s.id}&print=chuc_mung" style="display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; color: #ffffff; background-color: #00A6A9; text-decoration: none;">Tải file</a>` 
            : "—"}
        </td>
      ` : "";

      return `
        <tr style="border-bottom: 1px solid #f1f5f9; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; color: #334155; font-size: 13px;">
          <td style="padding: 12px 10px; text-align: center; font-weight: 600;">${idx + 1}</td>
          <td style="padding: 12px 10px; font-weight: 600; color: #1E1B4B;">${s.fullName || "—"}</td>
          <td style="padding: 12px 10px; text-align: center;">K${s.grade || "—"}</td>
          <td style="padding: 12px 10px; text-align: center;">${dob}</td>
          <td style="padding: 12px 10px; text-align: center;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 50px; font-size: 10px; font-weight: 700; color: ${resColor}; background-color: ${resBg}; border: 1px solid ${resBorder}; text-transform: uppercase;">
              ${resText}
            </span>
          </td>
          <td style="padding: 12px 10px; font-weight: 600; color: #00A6A9;">${s.admissionCampus || "—"}</td>
          ${attachmentsTd}
        </tr>
      `;
    }).join("");

    const emailHtml = `      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>\${subject}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap');
          body {
            font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f1f5f9;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          table { border-collapse: collapse; }
          .container {
            max-width: 850px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 166, 169, 0.1);
            border: 1px solid #e2e8f0;
          }
          .header {
            background: linear-gradient(135deg, #1E1B4B 0%, #00A6A9 100%);
            padding: 40px 30px;
            text-align: center;
          }
          .badge {
            background-color: rgba(255, 255, 255, 0.15);
            display: inline-block;
            padding: 6px 16px;
            border-radius: 50px;
            margin-bottom: 16px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .title {
            margin: 0;
            color: #ffffff;
            font-size: 28px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .subtitle {
            margin: 10px 0 0 0;
            color: #cffafe;
            font-size: 15px;
            font-weight: 500;
          }
          .info-section {
            padding: 24px 30px;
            background-color: #fafbfc;
            border-bottom: 1px solid #f1f5f9;
          }
          .stats-section {
            padding: 24px 30px 10px 30px;
          }
          .stat-card {
            border-radius: 16px;
            padding: 20px;
            text-align: center;
          }
          .table-container {
            padding: 20px 30px 40px 30px;
          }
          .data-table {
            width: 100%;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }
          .data-table th {
            background-color: #00A6A9;
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 14px 10px;
            text-align: center;
          }
          .footer {
            background-color: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div style="padding: 40px 10px;">
          <div class="container">
            <!-- Header -->
            <div class="header">
              <div class="badge">Sky-Line Education System</div>
              <h1 class="title">Báo cáo Khảo sát Đầu vào</h1>
              <p class="subtitle">Hệ thống Quản lý Khảo sát & Đánh giá Năng lực</p>
            </div>

            <!-- Info -->
            <div class="info-section">
              <table width="100%">
                <tr>
                  <td width="50%">
                    <table>
                      <tr>
                        <td style="padding-right: 15px;">
                          <div style="background-color: #e0f2fe; width: 48px; height: 48px; border-radius: 12px; text-align: center; line-height: 48px; font-size: 22px;">📅</div>
                        </td>
                        <td>
                          <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Kỳ Khảo sát</div>
                          <div style="font-size: 16px; font-weight: 800; color: #1E1B4B; margin-top: 4px;">\${periodName}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" align="right">
                    <table>
                      <tr>
                        <td style="padding-right: 15px;">
                          <div style="background-color: #ccfbf1; width: 48px; height: 48px; border-radius: 12px; text-align: center; line-height: 48px; font-size: 22px;">🚀</div>
                        </td>
                        <td>
                          <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Đợt Khảo sát</div>
                          <div style="font-size: 16px; font-weight: 800; color: #1E1B4B; margin-top: 4px;">\${batchName}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Stats -->
            <div class="stats-section">
              <table width="100%">
                <tr>
                  <td width="33%" style="padding-right: 10px;">
                    <div class="stat-card" style="background-color: #f8fafc; border: 1px solid #e2e8f0;">
                      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Tổng số</div>
                      <div style="font-size: 28px; font-weight: 800; color: #1E1B4B; margin-top: 8px;">\${totalStudents}</div>
                    </div>
                  </td>
                  <td width="33%" style="padding-right: 10px;">
                    <div class="stat-card" style="background-color: #f0fdfa; border: 1px solid #99f6e4;">
                      <div style="font-size: 11px; font-weight: 700; color: #0f766e; text-transform: uppercase;">Đạt</div>
                      <div style="font-size: 28px; font-weight: 800; color: #00A6A9; margin-top: 8px;">\${totalPassed}</div>
                    </div>
                  </td>
                  <td width="33%">
                    <div class="stat-card" style="background-color: #fff1f2; border: 1px solid #fecdd3;">
                      <div style="font-size: 11px; font-weight: 700; color: #be123c; text-transform: uppercase;">Khác</div>
                      <div style="font-size: 28px; font-weight: 800; color: #e11d48; margin-top: 8px;">\${totalPendingOrFailed}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Table -->
            <div class="table-container">
              <h2 style="font-size: 18px; font-weight: 800; color: #1E1B4B; border-left: 4px solid #00A6A9; padding-left: 12px; margin-bottom: 20px;">Danh sách kết quả chi tiết</h2>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th style="text-align: left;">Họ và Tên</th>
                    <th>Khối</th>
                    <th>Ngày sinh</th>
                    <th>Kết quả</th>
                    <th style="text-align: left;">Cơ sở nhận</th>
                    \${showAttachments ? '<th>File tải</th>' : ''}
                  </tr>
                </thead>
                <tbody>
                  \${rowsHtml}
                </tbody>
              </table>
            </div>

            <!-- Footer -->
            <div class="footer">
              <img src="https://skyline-survey-rh4k.vercel.app/images/logo.png" style="height: 36px; margin-bottom: 12px;" />
              <p style="margin: 0; font-weight: 600; color: #1E1B4B;">HỆ THỐNG GIÁO DỤC SKY-LINE</p>
              <p style="margin: 6px 0 0 0; color: #94a3b8;">Nơi học sinh học cách yêu thương, chia sẻ, tự lập & có trách nhiệm.</p>
            </div>
          </div>
        </div>
      </body>
      </html>`;;
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
