import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SignatureService } from "@/lib/digital-signature/signature-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const { requestId, otpCode } = body;

    if (!requestId) {
      return NextResponse.json({ error: "Thiếu mã yêu cầu ký số (requestId)" }, { status: 400 });
    }

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await SignatureService.confirmDocumentSignature({
      requestId,
      otpCode,
      actorIp: clientIp,
      actorUserAgent: userAgent,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Lỗi xác nhận ký số:", err);
    return NextResponse.json({ error: err.message || "Lỗi xác nhận chữ ký số" }, { status: 400 });
  }
}
