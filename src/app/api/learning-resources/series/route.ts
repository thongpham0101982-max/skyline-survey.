import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const publisherId = searchParams.get("publisherId");

    const where: any = {};
    if (publisherId && publisherId !== "ALL") {
      where.publisherId = publisherId;
    }

    const series = await prisma.textbookSeries.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        publisher: { select: { id: true, name: true, code: true } },
        _count: { select: { textbooks: true } }
      }
    });

    return NextResponse.json({ success: true, data: series });
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
    const publisherId = String(body.publisherId || "").trim();
    const description = body.description ? String(body.description).trim() : null;

    if (!name || !code || !publisherId) {
      return NextResponse.json({ error: "Vui lòng nhập Tên, Mã bộ sách và chọn Nhà xuất bản." }, { status: 400 });
    }

    const existing = await prisma.textbookSeries.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: `Mã bộ sách '${code}' đã tồn tại.` }, { status: 409 });
    }

    const s = await prisma.textbookSeries.create({
      data: { name, code, publisherId, description, status: "ACTIVE" },
      include: { publisher: true }
    });

    const currentUserId = (session.user as any).id || "SYSTEM";
    const currentUserEmail = session.user.email || "system@skylineschool.edu.vn";
    await logActivity(currentUserId, currentUserEmail, "SERIES_CREATE", "TextbookSeries", s.id, null, s);

    return NextResponse.json({ success: true, data: s });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
