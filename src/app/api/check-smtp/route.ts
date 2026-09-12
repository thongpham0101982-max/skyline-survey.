import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rawEnvPass = process.env.SMTP_PASS || "";
  const cleanedPass = rawEnvPass.trim().replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
  const knownGoodPass = "jrfypwzkpccndjqw";

  const charCodes = Array.from(rawEnvPass).map((c, i) => ({
    idx: i,
    char: c,
    code: c.charCodeAt(0)
  }));

  // Helper to test an auth pass
  async function testSmtp(pwd: string, label: string) {
    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: "bankhaothi@skylineschool.edu.vn",
        pass: pwd,
      },
      tls: {
        ciphers: "SSLv3",
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    try {
      await transporter.verify();
      return { label, success: true, message: "VERIFY_SUCCESS" };
    } catch (err: any) {
      return {
        label,
        success: false,
        error: err.message,
        response: err.response,
        responseCode: err.responseCode,
      };
    }
  }

  const [rawResult, cleanedResult, knownGoodResult] = await Promise.all([
    testSmtp(rawEnvPass, "Raw env SMTP_PASS"),
    testSmtp(cleanedPass, "Cleaned (letters/digits only) SMTP_PASS"),
    testSmtp(knownGoodPass, "Hardcoded known good pass"),
  ]);

  let testSendInfo = null;
  const workingPass = knownGoodResult.success ? knownGoodPass : (cleanedResult.success ? cleanedPass : null);
  if (workingPass) {
    try {
      const workingTransporter = nodemailer.createTransport({
        host: "smtp.office365.com",
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: "bankhaothi@skylineschool.edu.vn",
          pass: workingPass,
        },
        tls: {
          ciphers: "SSLv3",
          rejectUnauthorized: false,
        }
      });

      const info = await workingTransporter.sendMail({
        from: '"HỆ THỐNG DỰ GIỜ SKY-LINE" <bankhaothi@skylineschool.edu.vn>',
        to: "thongpn@skylineschool.edu.vn",
        subject: "[Skyline Test Live] Thử nghiệm gửi email trực tiếp từ Vercel",
        html: `<p>Xin chào Thầy Thông, kết nối SMTP trên Vercel đã hoạt động thành công lúc ${new Date().toISOString()}!</p>`,
      });
      testSendInfo = { success: true, messageId: info.messageId };
    } catch (sendErr: any) {
      testSendInfo = { success: false, error: sendErr.message };
    }
  }

  return NextResponse.json({
    debug: {
      rawLength: rawEnvPass.length,
      cleanedLength: cleanedPass.length,
      charCodes,
      cleanedPassMatchesKnown: cleanedPass === knownGoodPass,
    },
    tests: {
      rawResult,
      cleanedResult,
      knownGoodResult,
    },
    testSendInfo,
  });
}
