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

    const testHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 680px; margin: 24px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #003B3A 0%, #007A70 50%, #00A99D 100%); padding: 30px 24px; text-align: center; color: #ffffff; }
    .badge { display: inline-block; background: rgba(255,255,255,0.22); border: 1px solid rgba(255,255,255,0.35); padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; margin-top: 10px; color: #ffffff; }
    .body { padding: 30px 24px; }
    .mandatory-notice { background: linear-gradient(135deg, #f0fdfa 0%, #e6fffa 100%); border-left: 5px solid #00A99D; border-radius: 12px; padding: 16px 20px; margin: 18px 0; font-size: 13.5px; line-height: 1.6; color: #134e4a; font-weight: 600; }
    .table-info { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    .table-info tr:nth-child(even) { background-color: #f8fafc; }
    .table-info td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
    .table-info td.label { font-weight: 700; color: #475569; width: 35%; }
    .btn { display: inline-block; background: linear-gradient(135deg, #003B3A 0%, #00A99D 100%); color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 13.5px; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(0, 169, 157, 0.35); text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="container">
    <div style="background: #fef3c7; color: #92400e; padding: 10px 20px; text-align: center; font-size: 12px; font-weight: 800; border-bottom: 1px solid #fde68a;">
      ⚠️ ĐÂY LÀ EMAIL THỬ NGHIỆM TỪ HỆ THỐNG SKY-LINE
    </div>
    <div class="header">
      <h1 style="margin: 0; font-size: 19px; font-weight: 900; text-transform: uppercase;">HỆ THỐNG HOẠT ĐỘNG TRẢI NGHIỆM SKY-LINE</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; font-weight: 700;">${displaySender.toUpperCase()}</p>
      <div class="badge">Mã kế hoạch: ${activityCode}</div>
    </div>
    <div class="body">
      <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 12px;">Kính gửi Quý Thầy/Cô,</div>
      <p style="font-size: 13.5px; line-height: 1.6; color: #334155; margin: 0 0 12px 0;">
        Lớp chủ nhiệm của Thầy/Cô vừa nhận được kế hoạch <strong>Hoạt động trải nghiệm</strong> từ <strong>${displaySender}</strong>.
      </p>

      <div class="mandatory-notice">
        <div style="font-size: 14px; font-weight: 900; color: #003B3A; margin-bottom: 4px;">📌 YÊU CẦU TRỌNG TÂM DÀNH CHO GVCN:</div>
        <strong>"Thầy cô vui lòng thực hiện đánh giá vai trò của Học sinh lớp."</strong><br/>
        "${customMessage}"
      </div>

      <table class="table-info">
        <tr>
          <td class="label">🎯 Tên hoạt động:</td>
          <td><strong style="color: #003B3A; font-size: 14px;">${activityName}</strong></td>
        </tr>
        <tr>
          <td class="label">🏷️ Mạch hoạt động:</td>
          <td>${strandLabel} (${activityTypeName})</td>
        </tr>
        ${subjectName ? `
        <tr>
          <td class="label">📚 Môn học:</td>
          <td><strong>${subjectName}</strong></td>
        </tr>
        ` : ""}
        <tr>
          <td class="label">🗓️ Thời gian:</td>
          <td>${formattedDate} ${timeRange ? `(${timeRange})` : ""}</td>
        </tr>
        <tr>
          <td class="label">📍 Địa điểm:</td>
          <td>${location || "Tại các cơ sở Sky-Line"}</td>
        </tr>
        <tr>
          <td class="label">👥 Lớp phụ trách:</td>
          <td><strong>${classNames}</strong></td>
        </tr>
        <tr>
          <td class="label">⏰ Hạn nộp đánh giá:</td>
          <td><strong style="color: #047857;">${deadline || "Theo kế hoạch"}</strong></td>
        </tr>
      </table>

      <div style="text-align: center; margin: 26px 0 16px 0;">
        <span class="btn">
          TRUY CẬP VÀ ĐÁNH GIÁ VAI TRÒ HỌC SINH &rarr;
        </span>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    await sendEmail({
      from: fromAddr,
      to: emailTo,
      replyTo: replyTo || undefined,
      subject: `[THỬ NGHIỆM] [Sky-Line HĐTN] Kế hoạch Hoạt động Trải nghiệm: ${activityName}`,
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
