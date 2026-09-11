import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const to = url.searchParams.get("to") || "bankhaothi@skylineschool.edu.vn";
    
    console.log("[test-du-gio-mail] Attempting to send test email to:", to);
    
    const result = await sendEmail({
      from: "HỆ THỐNG DỰ GIỜ SKY-LINE",
      to,
      subject: `[Skyline Test Direct] Kiểm tra gửi email lúc ${new Date().toLocaleTimeString("vi-VN")}`,
      html: `<h2>Email Test từ Vercel Serverless Function</h2>
             <p>Thời gian gửi: ${new Date().toISOString()}</p>
             <p>Gửi tới: ${to}</p>`
    });
    
    return NextResponse.json({
      status: "COMPLETED",
      result,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "ERROR",
      error: err?.message || String(err),
      stack: err?.stack
    }, { status: 500 });
  }
}
