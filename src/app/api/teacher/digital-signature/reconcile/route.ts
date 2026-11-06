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
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json({ error: "Thiếu mã yêu cầu (requestId) để đối soát" }, { status: 400 });
    }

    const userName = session?.user?.name || "Người dùng";
    const result = await SignatureService.reconcileSignature({
      requestId,
      actorId: userId,
      actorName: userName,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Lỗi đối soát chữ ký số:", err);
    return NextResponse.json({ error: err.message || "Lỗi đối soát giao dịch" }, { status: 400 });
  }
}
