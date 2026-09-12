import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const toEmail = (url.searchParams.get("to") || "thongpn@skylineschool.edu.vn").trim().toLowerCase();

  // Security restriction: Only allow sending test emails to internal Skyline domains
  if (!toEmail.endsWith("@skylineschool.edu.vn") && !toEmail.endsWith("@skyline.edu.vn")) {
    return NextResponse.json({ error: "Only Skyline domains are permitted for testing" }, { status: 403 });
  }

  const result = await sendEmail({
    from: "BAN KHẢO THÍ & ĐBCL SKY-LINE",
    to: toEmail,
    subject: "[Skyline Test] Thử nghiệm gửi thư từ Ban Khảo thí lúc " + new Date().toISOString(),
    html: `
      <div style="font-family: Arial, sans-serif; padding: 24px; border: 2px solid #008B82; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #008B82; margin-top: 0;">🎉 THỬ NGHIỆM GỬI EMAIL THÀNH CÔNG!</h2>
        <p>Email này được gửi tự động từ <strong>Ban Khảo thí & ĐBCL Sky-Line</strong>.</p>
        <p>Người nhận: <strong>${toEmail}</strong></p>
        <p>Thời gian gửi: <strong>${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</strong></p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <p style="font-size: 12px; color: #64748b;">Hệ thống Quản lý Dự giờ Chuyên môn Sky-Line</p>
      </div>
    `
  });

  return NextResponse.json({
    recipient: toEmail,
    result,
    env: {
      smtpUser: process.env.SMTP_USER,
      hasSmtpPass: !!process.env.SMTP_PASS,
      hasBackupPass: !!process.env.BACKUP_SMTP_PASS,
    }
  });
}
