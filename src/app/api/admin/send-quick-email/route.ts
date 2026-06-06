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
    const totalStudents = students.length;
    const totalPassed = students.filter(s => { const r = (s.admissionResult || "").trim(); return r.includes("Dat") || r.includes("DAT") || r.includes("MIEN"); }).length;
    const totalPendingOrFailed = totalStudents - totalPassed;

    const rowsHtml = students.map((s, idx) => {
      const dob = s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "—";
      const r = (s.admissionResult || "").trim();
      let resText = r || "Chua xet duyet";
      let resColor = "#4b5563", resBg = "#f3f4f6", resBorder = "#e5e7eb";
      if (r.includes("Dat") && r.includes("cam ket")) { resText = "DAT - CAM KET"; resColor = "#b45309"; resBg = "#fef3c7"; resBorder = "#fde68a"; }
      else if (r.includes("Dat") || r.includes("DAT") || r.includes("MIEN")) { resText = r.toUpperCase(); resColor = "#047857"; resBg = "#ecfdf5"; resBorder = "#a7f3d0"; }
      else if (r.includes("Khong dat") || r.includes("KHONG DAT")) { resText = "KHONG DAT"; resColor = "#b91c1c"; resBg = "#fef2f2"; resBorder = "#fecaca"; }
      else if (r.includes("Hoc thu")) { resText = "HOC THU"; resColor = "#4338ca"; resBg = "#e0e7ff"; resBorder = "#c7d2fe"; }
      const isPassed = r.includes("Dat") || r.includes("DAT") || r.includes("MIEN");
      const attachTd = showAttachments ? `<td style="padding:12px 10px;text-align:center;">${isPassed ? `<a href="${baseUrl}/admin/input-assessments?studentId=${s.id}&print=chuc_mung" style="display:inline-block;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:bold;color:#fff;background:#00A6A9;text-decoration:none;">Tai file</a>` : "—"}</td>` : "";
      return `<tr style="border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? "#fff" : "#f8fafc"};"><td style="padding:12px 10px;text-align:center;font-size:13px;font-weight:600;color:#64748b;">${idx + 1}</td><td style="padding:12px 10px;font-size:13px;font-weight:700;color:#1E1B4B;">${s.fullName || "—"}</td><td style="padding:12px 10px;text-align:center;font-size:13px;color:#334155;">K${s.grade || "—"}</td><td style="padding:12px 10px;text-align:center;font-size:13px;color:#334155;">${dob}</td><td style="padding:12px 10px;text-align:center;"><span style="display:inline-block;padding:4px 10px;border-radius:50px;font-size:10px;font-weight:700;color:${resColor};background:${resBg};border:1px solid ${resBorder};text-transform:uppercase;">${resText}</span></td><td style="padding:12px 10px;font-size:13px;font-weight:600;color:#00A6A9;">${s.admissionCampus || "—"}</td>${attachTd}</tr>`;
    }).join("");

    const attachHeader = showAttachments ? `<th style="padding:13px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;">File tai</th>` : "";

    const emailHtml = buildEmailHtml(subject, periodName, batchName, totalStudents, totalPassed, totalPendingOrFailed, rowsHtml, attachHeader);

    const mailAttachments = [];
    if (showAttachments && Array.isArray(pdfAttachments) && pdfAttachments.length > 0) {
      for (const att of pdfAttachments) {
        if (att.base64) { mailAttachments.push({ filename: att.filename, content: Buffer.from(att.base64, "base64"), contentType: "application/pdf" }); }
      }
    }

    try {
      await sendEmail({ to, cc, subject, html: emailHtml, attachments: mailAttachments });
      return NextResponse.json({ success: true, sent: true });
    } catch (err) {
      console.error("SMTP SEND ERROR:", err);
      return NextResponse.json({ success: true, sent: false, error: err.message || "SMTP error", html: emailHtml });
    }
  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

function buildEmailHtml(subject, periodName, batchName, totalStudents, totalPassed, totalPendingOrFailed, rowsHtml, attachHeader) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${subject}</title>
<style>
body{margin:0;padding:0;background:#f1f5f9;font-family:'Outfit','Inter',Arial,sans-serif;}
*{box-sizing:border-box;}
</style>
</head>
<body>
<div style="padding:32px 12px;background:#f1f5f9;">
  <div style="max-width:860px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,122,135,.1);border:1px solid #e2e8f0;">

    <!-- HEADER -->
    <div style="background:linear-gradient(135deg,#1E1B4B 0%,#00A6A9 100%);padding:36px 32px;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,.15);padding:5px 16px;border-radius:50px;margin-bottom:14px;border:1px solid rgba(255,255,255,.3);">
        <span style="color:#fff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:2px;">Sky-Line Education System</span>
      </div>
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;text-transform:uppercase;">Bao cao Ket qua Khao sat Dau vao KSNL</h1>
      <p style="margin:8px 0 0;color:#cffafe;font-size:13px;font-weight:500;">He thong Quan ly Khao sat &amp; Danh gia Nang luc</p>
    </div>

    <!-- KY & DOT -->
    <div style="padding:20px 32px;background:#fafbfc;border-bottom:1px solid #f1f5f9;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="50%" style="vertical-align:middle;padding-right:12px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-right:12px;vertical-align:middle;"><div style="background:#e0f2fe;width:44px;height:44px;border-radius:10px;text-align:center;line-height:44px;font-size:20px;">&#128197;</div></td>
                <td style="vertical-align:middle;">
                  <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;">Ky Khao sat</div>
                  <div style="font-size:16px;font-weight:800;color:#1E1B4B;margin-top:3px;">${periodName}</div>
                </td>
              </tr>
            </table>
          </td>
          <td width="50%" style="vertical-align:middle;text-align:right;">
            <table cellpadding="0" cellspacing="0" border="0" align="right">
              <tr>
                <td style="padding-right:12px;vertical-align:middle;"><div style="background:#ccfbf1;width:44px;height:44px;border-radius:10px;text-align:center;line-height:44px;font-size:20px;">&#128640;</div></td>
                <td style="vertical-align:middle;">
                  <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;">Dot Khao sat</div>
                  <div style="font-size:16px;font-weight:800;color:#1E1B4B;margin-top:3px;">${batchName}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <!-- THONG KE -->
    <div style="padding:20px 32px 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="33%" style="padding-right:10px;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;text-align:center;">
              <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Tong so HS</div>
              <div style="font-size:28px;font-weight:800;color:#1E1B4B;margin-top:6px;">${totalStudents}</div>
            </div>
          </td>
          <td width="33%" style="padding-right:10px;">
            <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:14px;padding:18px;text-align:center;">
              <div style="font-size:10px;font-weight:700;color:#0f766e;text-transform:uppercase;">Dat / Trung tuyen</div>
              <div style="font-size:28px;font-weight:800;color:#00A6A9;margin-top:6px;">${totalPassed}</div>
            </div>
          </td>
          <td width="33%">
            <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:14px;padding:18px;text-align:center;">
              <div style="font-size:10px;font-weight:700;color:#be123c;text-transform:uppercase;">Chua dat / Khac</div>
              <div style="font-size:28px;font-weight:800;color:#e11d48;margin-top:6px;">${totalPendingOrFailed}</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- BANG CHI TIET -->
    <div style="padding:16px 32px 36px;">
      <h2 style="font-size:16px;font-weight:800;color:#1E1B4B;border-left:4px solid #00A6A9;padding-left:12px;margin:0 0 16px;">Danh sach ket qua chi tiet</h2>
      <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
          <thead>
            <tr style="background:#00A6A9;">
              <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;">STT</th>
              <th style="padding:12px 10px;text-align:left;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;">Ho va Ten</th>
              <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;">Khoi</th>
              <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;">Ngay sinh</th>
              <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;">Ket qua</th>
              <th style="padding:12px 10px;text-align:left;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;">Co so nhan</th>
              ${attachHeader}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="background:#f8fafc;padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0;">
      <img src="https://skyline-survey-rh4k.vercel.app/images/logo.png" alt="Sky-Line" style="height:32px;margin-bottom:10px;" onerror="this.style.display='none'">
      <p style="margin:0;font-size:13px;font-weight:700;color:#1E1B4B;text-transform:uppercase;letter-spacing:.5px;">He thong Giao duc Sky-Line</p>
      <p style="margin:5px 0 0;font-size:12px;color:#94a3b8;">Noi hoc sinh hoc cach yeu thuong, chia se, tu lap &amp; co trach nhiem.</p>
      <p style="margin:6px 0 0;font-size:11px;color:#cbd5e1;">Email tu dong tu he thong khao sat tuyen sinh Sky-Line</p>
    </div>
  </div>
</div>
</body>
</html>`;
}
