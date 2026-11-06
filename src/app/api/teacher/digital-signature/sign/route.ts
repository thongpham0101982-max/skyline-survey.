import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SignatureService } from "@/lib/digital-signature/signature-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const teacher = await (prisma as any).teacher.findUnique({
      where: { userId },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Không tìm thấy hồ sơ giáo viên" }, { status: 404 });
    }

    const body = await req.json();
    const { documentId, provider } = body;

    if (!documentId) {
      return NextResponse.json({ error: "Thiếu mã tài liệu cần ký" }, { status: 400 });
    }

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await SignatureService.initiateDocumentSignature({
      documentId,
      teacherId: teacher.id,
      teacherName: teacher.teacherName,
      teacherCode: teacher.teacherCode,
      provider,
      actorIp: clientIp,
      actorUserAgent: userAgent,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Lỗi khởi tạo ký số:", err);
    return NextResponse.json({ error: err.message || "Lỗi xử lý yêu cầu ký số" }, { status: 400 });
  }
}
