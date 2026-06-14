// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { periodId, batchId, gdcsEmail, isPreschool } = await req.json();
    if (!periodId || !batchId || !gdcsEmail) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    let periodName = "Kỳ khảo sát";
    let batchName = "Tất cả các đợt";
    let students = [];

    if (isPreschool) {
      const periodObj = await prisma.preschoolInputAssessmentPeriod.findUnique({
        where: { id: periodId }
      });
      if (periodObj) periodName = periodObj.name;

      if (batchId !== "all") {
        const batchObj = await prisma.preschoolInputAssessmentBatch.findUnique({
          where: { id: batchId }
        });
        if (batchObj) batchName = batchObj.name;
      }

      const whereClause = { periodId };
      if (batchId && batchId !== "all") {
        whereClause.batchId = batchId;
      }
      students = await prisma.preschoolInputAssessmentStudent.findMany({
        where: whereClause,
        orderBy: { fullName: "asc" }
      });
    } else {
      const periodObj = await prisma.inputAssessmentPeriod.findUnique({
        where: { id: periodId }
      });
      if (periodObj) periodName = periodObj.name;

      if (batchId !== "all") {
        const batchObj = await prisma.inputAssessmentBatch.findUnique({
          where: { id: batchId }
        });
        if (batchObj) batchName = batchObj.name;
      }

      const whereClause = { periodId };
      if (batchId && batchId !== "all") {
        whereClause.batchId = batchId;
      }
      students = await prisma.inputAssessmentStudent.findMany({
        where: whereClause,
        orderBy: { fullName: "asc" }
      });
    }

    const totalStudents = students.length;
    let passedCount = 0;
    let failedCount = 0;
    let committedCount = 0;
    let pendingCount = 0;

    if (isPreschool) {
      passedCount = students.filter(s => s.admissionResult && (s.admissionResult.toUpperCase().includes("ĐẠT") || s.admissionResult === "Học thử")).length;
      failedCount = students.filter(s => s.admissionResult && s.admissionResult.toUpperCase().includes("KHÔNG")).length;
      pendingCount = totalStudents - passedCount - failedCount;
    } else {
      passedCount = students.filter(s => s.admissionResult === "Đạt" || s.admissionResult === "Học thử").length;
      failedCount = students.filter(s => s.admissionResult === "Không đạt" || s.admissionResult === "Không đạt - Kiểm tra lại" || s.admissionResult === "Không đạt - Không kiểm tra lại").length;
      committedCount = students.filter(s => s.admissionResult === "Đạt cam kết").length;
      pendingCount = totalStudents - passedCount - failedCount - committedCount;
    }

    const host = req.headers.get("host") || "skyline-survey-rh4k.vercel.app";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;

    const rowsHtml = students.map((s, idx) => {
      const dob = s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "—";
      let resultText = s.admissionResult || "Chưa xét duyệt";
      let resColor = "#4b5563", resBg = "#f3f4f6", resBorder = "#e5e7eb";

      if (isPreschool) {
        if (resultText.toUpperCase().includes("ĐẠT")) {
          resColor = "#047857"; resBg = "#ecfdf5"; resBorder = "#a7f3d0";
        } else if (resultText.toUpperCase().includes("KHÔNG")) {
          resColor = "#b91c1c"; resBg = "#fef2f2"; resBorder = "#fecaca";
        } else if (resultText === "Học thử") {
          resColor = "#4338ca"; resBg = "#e0e7ff"; resBorder = "#c7d2fe";
        }
      } else {
        if (resultText === "Đạt") {
          resColor = "#047857"; resBg = "#ecfdf5"; resBorder = "#a7f3d0";
        } else if (resultText === "Đạt cam kết") {
          resColor = "#b45309"; resBg = "#fef3c7"; resBorder = "#fde68a";
        } else if (resultText.includes("Không đạt")) {
          resColor = "#b91c1c"; resBg = "#fef2f2"; resBorder = "#fecaca";
        } else if (resultText === "Học thử") {
          resColor = "#4338ca"; resBg = "#e0e7ff"; resBorder = "#c7d2fe";
        }
      }

      let detailNote = "";
      if (isPreschool) {
        detailNote = s.devAssessmentResult || s.devImportantNote || s.directorNote || "—";
      } else {
        detailNote = s.directorNote || "—";
      }
      if (detailNote.length > 50) {
        detailNote = detailNote.substring(0, 47) + "...";
      }

      return `
        <tr style="border-bottom:1px solid #f1f5f9; background:${idx % 2 === 0 ? "#fff" : "#f8fafc"};">
          <td style="padding:12px 10px; text-align:center; font-size:13px; font-weight:600; color:#64748b;">${idx + 1}</td>
          <td style="padding:12px 10px; font-size:13px; font-weight:700; color:#1E1B4B;">${s.fullName || "—"}</td>
          <td style="padding:12px 10px; text-align:center; font-size:13px; color:#334155;">${s.studentCode || "—"}</td>
          <td style="padding:12px 10px; text-align:center; font-size:13px; color:#334155;">K${s.grade || "—"}</td>
          <td style="padding:12px 10px; text-align:center; font-size:13px; color:#334155;">${dob}</td>
          <td style="padding:12px 10px; text-align:center;">
            <span style="display:inline-block; padding:4px 10px; border-radius:50px; font-size:10px; font-weight:700; color:${resColor}; background:${resBg}; border:1px solid ${resBorder}; text-transform:uppercase;">
              ${resultText}
            </span>
          </td>
          <td style="padding:12px 10px; font-size:13px; color:#4b5563;">${detailNote}</td>
        </tr>
      `;
    }).join("");

    const emailHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Yêu cầu xét duyệt Đợt khảo sát</title>
<style>
body{margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}
*{box-sizing:border-box;}
</style>
</head>
<body>
<div style="padding:32px 12px;background:#f1f5f9;">
  <div style="max-width:860px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,122,135,.1);border:1px solid #e2e8f0;">

    <!-- HEADER -->
    <div style="background: linear-gradient(135deg, #00A6A9 0%, #007A87 100%); padding: 35px 30px; text-align: center; border-bottom: 3px solid #007A87;">
      <div style="display:inline-block;background:rgba(255,255,255,0.15);padding:5px 16px;border-radius:50px;margin-bottom:14px;border:1px solid rgba(255,255,255,0.2);">
        <span style="color:#fff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:2px;">Sky-Line Education System</span>
      </div>
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:-0.5px;">Yêu cầu xét duyệt kết quả khảo sát</h1>
      <p style="margin:8px 0 0;color:#e0f7fa;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
        ${isPreschool ? "Bậc Mầm non" : "Bậc Phổ thông (K-12)"} - CỔNG THÔNG TIN KHẢO SÁT
      </p>
    </div>

    <!-- GREETINGS & DESCR -->
    <div style="padding:30px 32px 15px 32px;">
      <p style="margin:0;font-size:15px;font-weight:700;color:#1e293b;">Kính gửi Thầy/Cô Giám đốc Cơ sở,</p>
      <p style="margin:10px 0 0;font-size:14px;color:#475569;line-height:1.6;">
        Hội đồng Tuyển sinh kính gửi báo cáo kết quả khảo sát năng lực đầu vào và đề xuất Thầy/Cô thực hiện xem xét, phê duyệt cho các học sinh thuộc Đợt khảo sát sau:
      </p>
    </div>

    <!-- KY & DOT INFO -->
    <div style="padding:0 32px 20px 32px;">
      <div style="padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="50%" style="vertical-align:middle;padding-right:12px;">
              <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;">Kỳ Khảo sát</div>
              <div style="font-size:16px;font-weight:800;color:#1E1B4B;margin-top:3px;">${periodName}</div>
            </td>
            <td width="50%" style="vertical-align:middle;text-align:right;">
              <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;text-align:right;">Đợt Khảo sát</div>
              <div style="font-size:16px;font-weight:800;color:#1E1B4B;margin-top:3px;text-align:right;">${batchName}</div>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- STATS CARDS -->
    <div style="padding:0 32px 20px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="20%" style="padding-right:8px;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center;">
              <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;">Tổng số HS</div>
              <div style="font-size:20px;font-weight:800;color:#1E1B4B;margin-top:4px;">${totalStudents}</div>
            </div>
          </td>
          <td width="20%" style="padding-right:8px;">
            <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:12px;text-align:center;">
              <div style="font-size:9px;font-weight:700;color:#047857;text-transform:uppercase;">Đạt / Học thử</div>
              <div style="font-size:20px;font-weight:800;color:#059669;margin-top:4px;">${passedCount}</div>
            </div>
          </td>
          ${!isPreschool ? `
          <td width="20%" style="padding-right:8px;">
            <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:12px;text-align:center;">
              <div style="font-size:9px;font-weight:700;color:#b45309;text-transform:uppercase;">Đạt cam kết</div>
              <div style="font-size:20px;font-weight:800;color:#d97706;margin-top:4px;">${committedCount}</div>
            </div>
          </td>
          ` : ""}
          <td width="20%" style="padding-right:8px;">
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px;text-align:center;">
              <div style="font-size:9px;font-weight:700;color:#b91c1c;text-transform:uppercase;">Không đạt</div>
              <div style="font-size:20px;font-weight:800;color:#dc2626;margin-top:4px;">${failedCount}</div>
            </div>
          </td>
          <td width="20%">
            <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:10px;padding:12px;text-align:center;">
              <div style="font-size:9px;font-weight:700;color:#d97706;text-transform:uppercase;">Chưa duyệt</div>
              <div style="font-size:20px;font-weight:800;color:#b45309;margin-top:4px;">${pendingCount}</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- STUDENT TABLE -->
    <div style="padding:10px 32px 30px 32px;">
      <h2 style="font-size:15px;font-weight:800;color:#1E1B4B;border-left:4px solid #00A6A9;padding-left:12px;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.5px;">Danh sách kết quả học sinh</h2>
      <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
          <thead>
            <tr style="background:#00A6A9;">
              <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;width:7%;">STT</th>
              <th style="padding:12px 10px;text-align:left;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;">Họ và Tên</th>
              <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;width:15%;">Mã HS</th>
              <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;width:10%;">Khối</th>
              <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;width:15%;">Ngày sinh</th>
              <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;width:20%;">Đề xuất</th>
              <th style="padding:12px 10px;text-align:left;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;width:20%;">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ACTION BUTTON -->
    <div style="padding: 10px 32px 30px 32px; text-align: center;">
      <p style="margin: 0 0 15px 0; font-size: 13px; color: #64748b; font-style: italic;">
        Vui lòng truy cập cổng thông tin quản lý để thực hiện phê duyệt chính thức kết quả khảo sát cho đợt tuyển sinh này.
      </p>
      <a href="${baseUrl}/admin/xet-duyet-ket-qua" style="display: inline-block; padding: 12px 28px; border-radius: 12px; font-size: 14px; font-weight: bold; color: #ffffff; background-color: #00A6A9; text-decoration: none; border: 1px solid #007A87; box-shadow: 0 4px 6px -1px rgba(0, 166, 169, 0.2);">
        Phê Duyệt Kết Quả Khảo Sát
      </a>
    </div>

    <!-- FOOTER -->
    <div style="background:#f8fafc;padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0;">
      <img src="${baseUrl}/images/logo.png" alt="Sky-Line" style="height:32px;margin-bottom:10px;" onerror="this.style.display='none'">
      <p style="margin:0;font-size:13px;font-weight:700;color:#1E1B4B;text-transform:uppercase;letter-spacing:.5px;">Hệ thống Giáo dục Sky-Line</p>
      <p style="margin:5px 0 0;font-size:12px;color:#94a3b8;">Nơi học sinh học cách yêu thương, chia sẻ, tự lập &amp; có trách nhiệm.</p>
      <p style="margin:6px 0 0;font-size:11px;color:#cbd5e1;">Email tự động gửi từ Hệ thống Khảo sát Tuyển sinh Sky-Line</p>
    </div>
  </div>
</div>
</body>
</html>`;

    await sendEmail({
      to: gdcsEmail,
      subject: `[Sky-Line] Yêu cầu xét duyệt Đợt khảo sát: ${batchName} (${periodName})`,
      html: emailHtml,
      replyTo: "bankhaothi@skylineschool.edu.vn"
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Batch email send error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
