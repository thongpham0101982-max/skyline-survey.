import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const publishers = await prisma.textbookPublisher.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { series: true, textbooks: true }
        }
      }
    });

    return NextResponse.json({ success: true, data: publishers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const name = String(body.name || "").trim();
    const code = String(body.code || "").trim().toUpperCase().replace(/\s+/g, "_");
    const website = body.website ? String(body.website).trim() : null;

    if (!name || !code) {
      return NextResponse.json({ error: "Vui lòng nhập Tên và Mã nhà xuất bản." }, { status: 400 });
    }

    const existing = await prisma.textbookPublisher.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: `Mã nhà xuất bản '${code}' đã tồn tại.` }, { status: 409 });
    }

    const pub = await prisma.textbookPublisher.create({
      data: { name, code, website, status: "ACTIVE" }
    });

    const currentUserId = (session.user as any).id || "SYSTEM";
    const currentUserEmail = session.user.email || "system@skylineschool.edu.vn";
    await logActivity(currentUserId, currentUserEmail, "PUBLISHER_CREATE", "TextbookPublisher", pub.id, null, pub);

    return NextResponse.json({ success: true, data: pub });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
