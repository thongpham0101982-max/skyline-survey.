import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const toEmail = url.searchParams.get("to") || "thongpn@skylineschool.edu.vn";

  const rawUser = (process.env.SMTP_USER || "").trim();
  const rawPass = (process.env.SMTP_PASS || "").trim().replace(/\s+/g, "").replace(/^["']|["']$/g, "");
  const rawHost = (process.env.SMTP_HOST || "").trim();
  const rawPort = (process.env.SMTP_PORT || "").trim();
  const rawSecure = (process.env.SMTP_SECURE || "").trim();

  const user = rawUser || "bankhaothi@skylineschool.edu.vn";
  const pass = rawPass;

  const isSkylineDomain = user.toLowerCase().includes("@skylineschool.edu.vn") || user.toLowerCase().includes("@skyline.edu.vn");
  const host = isSkylineDomain ? "smtp.office365.com" : (rawHost || "smtp.office365.com");
  const port = isSkylineDomain ? 587 : parseInt(rawPort || "587", 10);
  const secure = isSkylineDomain ? false : (rawSecure === "true" || port === 465);

  const envSummary = {
    hasUser: !!process.env.SMTP_USER,
    userValue: user,
    hasPass: !!process.env.SMTP_PASS,
    passLength: process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0,
    passPreview: pass ? `${pass.slice(0, 3)}...${pass.slice(-3)}` : "EMPTY",
    envHost: process.env.SMTP_HOST || "(not set)",
    envPort: process.env.SMTP_PORT || "(not set)",
    envSecure: process.env.SMTP_SECURE || "(not set)",
    resolvedHost: host,
    resolvedPort: port,
    resolvedSecure: secure,
    allSmtpEnvKeys: Object.keys(process.env).filter(k => k.toUpperCase().includes("SMTP") || k.toUpperCase().includes("MAIL")),
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV || "(not on vercel)",
  };

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: {
      user,
      pass,
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  let verifyResult: any = null;
  try {
    await transporter.verify();
    verifyResult = { success: true, message: "SMTP credentials verified successfully with server!" };
  } catch (err: any) {
    verifyResult = {
      success: false,
      error: err.message,
      code: err.code,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
      stack: err.stack,
    };
  }

  let sendResult: any = null;
  if (verifyResult.success) {
    try {
      const info = await transporter.sendMail({
        from: `"HỆ THỐNG DỰ GIỜ SKY-LINE" <${user}>`,
        to: toEmail,
        subject: `[Skyline Test] Thử nghiệm gửi email từ ${user} - ${new Date().toISOString()}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #10b981; border-radius: 12px;">
            <h2 style="color: #059669;">✅ KẾT NỐI SMTP THÀNH CÔNG!</h2>
            <p>Hộp thư <strong>${user}</strong> đã gửi email thử nghiệm thành công tới <strong>${toEmail}</strong>.</p>
            <p>Thời gian: <strong>${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</strong></p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb;" />
            <p style="font-size: 12px; color: #6b7280;">Hệ thống Quản lý Dự giờ Sky-Line</p>
          </div>
        `,
      });
      sendResult = { success: true, messageId: info.messageId, to: toEmail };
    } catch (sendErr: any) {
      sendResult = {
        success: false,
        error: sendErr.message,
        code: sendErr.code,
        command: sendErr.command,
        response: sendErr.response,
      };
    }
  }

  return NextResponse.json({
    env: envSummary,
    verify: verifyResult,
    send: sendResult,
  });
}
