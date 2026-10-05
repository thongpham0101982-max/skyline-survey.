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
      let resText = r || "Chưa xét duyệt";
      let resColor = "#4b5563", resBg = "#f3f4f6", resBorder = "#e5e7eb";
      if (r.includes("Dat") && r.includes("cam ket") || r.includes("Đạt") && r.includes("cam kết")) { resText = "ĐẠT - CAM KẾT"; resColor = "#b45309"; resBg = "#fef3c7"; resBorder = "#fde68a"; }
      else if (r.includes("Dat") || r.includes("DAT") || r.includes("Đạt") || r.includes("ĐẠT") || r.includes("MIEN") || r.includes("MIỄN")) { resText = r.toUpperCase(); resColor = "#047857"; resBg = "#ecfdf5"; resBorder = "#a7f3d0"; }
      else if (r.includes("Khong dat") || r.includes("KHONG DAT") || r.includes("Không đạt") || r.includes("KHÔNG ĐẠT")) { resText = "KHÔNG ĐẠT"; resColor = "#b91c1c"; resBg = "#fef2f2"; resBorder = "#fecaca"; }
      else if (r.includes("Hoc thu") || r.includes("Học thử")) { resText = "HỌC THỬ"; resColor = "#0284c7"; resBg = "#f0f9ff"; resBorder = "#bae6fd"; }
      const isPassed = r.includes("Dat") || r.includes("DAT") || r.includes("Đạt") || r.includes("ĐẠT") || r.includes("MIEN") || r.includes("MIỄN");
      const attachTd = showAttachments ? `<td align="center" style="padding:10px 8px; border-bottom:1px solid #e2e8f0;">${isPassed ? `<a href="${baseUrl}/admin/preschool-assessments?studentId=${s.id}&print=chuc_mung" target="_blank" style="display:inline-block; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:700; color:#FFFFFF; background-color:#00A19A; text-decoration:none;">Tải file</a>` : "—"}</td>` : "";
      return `<tr bgcolor="${idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC"}" style="border-bottom:1px solid #e2e8f0;"><td align="center" style="padding:10px 8px; font-size:12px; font-weight:700; color:#64748b; border-bottom:1px solid #e2e8f0;">${idx + 1}</td><td style="padding:10px 10px; font-size:13px; font-weight:700; color:#003B3A; border-bottom:1px solid #e2e8f0;">${s.fullName || "—"}</td><td align="center" style="padding:10px 8px; font-size:12px; font-weight:600; color:#334155; border-bottom:1px solid #e2e8f0;">${s.grade || "MN"}</td><td align="center" style="padding:10px 8px; font-size:12px; color:#475569; border-bottom:1px solid #e2e8f0;">${dob}</td><td align="center" style="padding:10px 8px; border-bottom:1px solid #e2e8f0;"><span style="display:inline-block; padding:3px 10px; border-radius:50px; font-size:10px; font-weight:800; color:${resColor}; background-color:${resBg}; border:1px solid ${resBorder}; text-transform:uppercase;">${resText}</span></td><td style="padding:10px 10px; font-size:12px; font-weight:700; color:#00A19A; border-bottom:1px solid #e2e8f0;">${s.admissionCampus || "—"}</td>${attachTd}</tr>`;
    }).join("");

    const attachHeader = showAttachments ? `<th style="padding:10px 8px; text-align:center; font-size:11px; font-weight:800; color:#FFFFFF; text-transform:uppercase;">File KQ</th>` : "";

    const emailHtml = buildEmailHtml(subject, periodName, batchName, totalStudents, totalPassed, totalPendingOrFailed, rowsHtml, attachHeader);

    const mailAttachments = [];
    if (showAttachments && Array.isArray(pdfAttachments) && pdfAttachments.length > 0) {
      for (const att of pdfAttachments) {
        if (att.base64) { mailAttachments.push({ filename: att.filename, content: Buffer.from(att.base64, "base64"), contentType: "application/pdf" }); }
      }
    }

    try {
      const mailRes = await sendEmail({ to, cc, subject, html: emailHtml, attachments: mailAttachments });
      if (!mailRes.success) {
        return NextResponse.json({ success: false, sent: false, error: mailRes.error || "SMTP error", html: emailHtml });
      }
      return NextResponse.json({ success: true, sent: true, messageId: mailRes.messageId });
    } catch (err) {
      console.error("SMTP SEND ERROR:", err);
      return NextResponse.json({ success: false, sent: false, error: err.message || "SMTP error", html: emailHtml });
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
</head>
<body style="margin:0; padding:0; background-color:#F1F5F9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F1F5F9" style="background-color:#F1F5F9; padding:24px 0;">
  <tr>
    <td align="center">
      <table width="760" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="max-width:760px; width:100%; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 4px 16px rgba(0,59,58,0.12); border:1px solid #CBD5E1;">
        
        <!-- HEADER -->
        <tr>
          <td bgcolor="#003B3A" style="background-color:#003B3A; background:linear-gradient(135deg, #003B3A 0%, #064E3B 60%, #00A19A 100%); padding:28px 32px; color:#FFFFFF; border-bottom:4px solid #00A19A; text-align:center;">
            <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 10px auto;">
              <tr>
                <td bgcolor="#0B4A47" style="background-color:#0B4A47; border:1px solid #00A19A; border-radius:20px; padding:3px 12px; font-size:10.5px; font-weight:800; color:#5EEAD4; letter-spacing:1px; text-transform:uppercase;">
                  🏫 BẬC MẦM NON • HỆ THỐNG GIÁO DỤC SKY-LINE
                </td>
              </tr>
            </table>
            <h1 style="margin:0; font-size:21px; font-weight:900; line-height:1.3; color:#FFFFFF; text-transform:uppercase;">
              BÁO CÁO KẾT QUẢ KHẢO SÁT ĐẦU VÀO MẦM NON
            </h1>
            <div style="font-size:12.5px; color:#E0F2FE; margin-top:6px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">
              HỆ THỐNG KHẢO SÁT NĂNG LỰC ĐẦU VÀO SKY-LINE
            </div>
          </td>
        </tr>

        <!-- KY & DOT -->
        <tr>
          <td style="padding:18px 32px; background-color:#F8FAFC; border-bottom:1px solid #E2E8F0;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="vertical-align:middle;">
                  <table border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-right:12px; vertical-align:middle;">
                        <div style="background-color:#CCFBF1; width:40px; height:40px; border-radius:10px; text-align:center; line-height:40px; font-size:18px;">📅</div>
                      </td>
                      <td style="vertical-align:middle;">
                        <div style="font-size:10px; font-weight:800; color:#64748B; text-transform:uppercase;">Kỳ Khảo Sát</div>
                        <div style="font-size:15px; font-weight:800; color:#003B3A; margin-top:2px;">${periodName}</div>
                      </td>
                    </tr>
                  </table>
                </td>
                <td width="50%" align="right" style="vertical-align:middle;">
                  <table border="0" cellpadding="0" cellspacing="0" align="right">
                    <tr>
                      <td style="padding-right:12px; vertical-align:middle;">
                        <div style="background-color:#F0FDF4; width:40px; height:40px; border-radius:10px; text-align:center; line-height:40px; font-size:18px;">🚀</div>
                      </td>
                      <td style="vertical-align:middle; text-align:left;">
                        <div style="font-size:10px; font-weight:800; color:#64748B; text-transform:uppercase;">Đợt Khảo Sát</div>
                        <div style="font-size:15px; font-weight:800; color:#003B3A; margin-top:2px;">${batchName}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- THONG KE (3-Column KPI cards) -->
        <tr>
          <td style="padding:22px 32px 12px 32px; background-color:#FFFFFF;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td width="32%" bgcolor="#F0FDFA" style="padding:14px 10px; background-color:#F0FDFA; border-radius:12px; border:1px solid #CCFBF1; text-align:center;">
                  <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#0F766E;">Tổng Số Bé</div>
                  <div style="font-size:24px; font-weight:900; color:#003B3A; margin-top:4px;">${totalStudents}</div>
                  <div style="font-size:10px; color:#14B8A6; font-weight:600;">học sinh</div>
                </td>
                <td width="2%"></td>
                <td width="32%" bgcolor="#ECFDF5" style="padding:14px 10px; background-color:#ECFDF5; border-radius:12px; border:1px solid #A7F3D0; text-align:center;">
                  <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#065F46;">Đạt / Trúng Tuyển</div>
                  <div style="font-size:24px; font-weight:900; color:#047857; margin-top:4px;">${totalPassed}</div>
                  <div style="font-size:10px; color:#10B981; font-weight:600;">học sinh</div>
                </td>
                <td width="2%"></td>
                <td width="32%" bgcolor="#FEF2F2" style="padding:14px 10px; background-color:#FEF2F2; border-radius:12px; border:1px solid #FECACA; text-align:center;">
                  <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#991B1B;">Chưa Đạt / Khác</div>
                  <div style="font-size:24px; font-weight:900; color:#DC2626; margin-top:4px;">${totalPendingOrFailed}</div>
                  <div style="font-size:10px; color:#EF4444; font-weight:600;">học sinh</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BANG CHI TIET -->
        <tr>
          <td style="padding:16px 32px 28px 32px; background-color:#FFFFFF;">
            <h2 style="font-size:14px; font-weight:800; color:#003B3A; border-left:4px solid #00A19A; padding-left:10px; margin:0 0 14px 0; text-transform:uppercase; letter-spacing:0.5px;">
              Danh Sách Kết Quả Chi Tiết (${totalStudents} Bé)
            </h2>
            <div style="border:1px solid #CBD5E1; border-radius:8px; overflow:hidden;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <thead>
                  <tr bgcolor="#003B3A" style="background-color:#003B3A; color:#FFFFFF;">
                    <th style="padding:10px 8px; text-align:center; font-size:11px; font-weight:800; color:#FFFFFF; text-transform:uppercase; width:40px; border-right:1px solid #065F46;">STT</th>
                    <th style="padding:10px 10px; text-align:left; font-size:11px; font-weight:800; color:#FFFFFF; text-transform:uppercase; border-right:1px solid #065F46;">Họ và Tên</th>
                    <th style="padding:10px 8px; text-align:center; font-size:11px; font-weight:800; color:#FFFFFF; text-transform:uppercase; width:60px; border-right:1px solid #065F46;">Lớp/Độ tuổi</th>
                    <th style="padding:10px 8px; text-align:center; font-size:11px; font-weight:800; color:#FFFFFF; text-transform:uppercase; width:95px; border-right:1px solid #065F46;">Ngày Sinh</th>
                    <th style="padding:10px 8px; text-align:center; font-size:11px; font-weight:800; color:#FFFFFF; text-transform:uppercase; width:120px; border-right:1px solid #065F46;">Kết Quả</th>
                    <th style="padding:10px 10px; text-align:left; font-size:11px; font-weight:800; color:#FFFFFF; text-transform:uppercase;">Cơ Sở Nhận</th>
                    ${attachHeader}
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td bgcolor="#003B3A" style="background-color:#003B3A; border-top:3px solid #00A19A; padding:22px 28px; text-align:center; font-size:11px; color:#CCFBF1; line-height:1.6;">
            <div style="font-weight:800; color:#FFFFFF; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">
              HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
            </div>
            <div style="color:#99F6E4; font-weight:600; margin-top:3px;">
              BAN ĐÀO TẠO &amp; KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
            </div>
            <div style="color:#5EEAD4; margin-top:6px; font-size:10.5px;">
              Email hỗ trợ: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color:#FDE047; text-decoration:none; font-weight:700;">bankhaothi@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" style="color:#FDE047; text-decoration:none; font-weight:700;">skylineschool.edu.vn</a>
            </div>
            <div style="color:#64748B; margin-top:8px; font-size:10px;">
              &copy; ${new Date().getFullYear()} Sky-Line School System. All rights reserved. &bull; Thư thông báo tự động từ Hệ thống Khảo sát Tuyển sinh Sky-Line
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
