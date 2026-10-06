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

    const sources = await prisma.textbookSource.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { textbooks: true } }
      }
    });

    return NextResponse.json({ success: true, data: sources });
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
    const sourceName = String(body.sourceName || "").trim();
    const sourceType = String(body.sourceType || "PUBLISHER_PORTAL").trim();
    const baseUrl = String(body.baseUrl || "").trim();
    const allowedDomains = Array.isArray(body.allowedDomains)
      ? JSON.stringify(body.allowedDomains)
      : typeof body.allowedDomains === "string"
      ? body.allowedDomains
      : "[]";
    const downloadAllowed = Boolean(body.downloadAllowed);
    const aiIndexAllowed = Boolean(body.aiIndexAllowed ?? true);
    const syncEnabled = Boolean(body.syncEnabled);

    if (!sourceName || !baseUrl) {
      return NextResponse.json({ error: "Vui lòng nhập Tên nguồn và URL gốc (Base URL)." }, { status: 400 });
    }

    const src = await prisma.textbookSource.create({
      data: {
        sourceName,
        sourceType,
        baseUrl,
        allowedDomains,
        downloadAllowed,
        aiIndexAllowed,
        syncEnabled,
        status: "ACTIVE"
      }
    });

    const currentUserId = (session.user as any).id || "SYSTEM";
    const currentUserEmail = session.user.email || "system@skylineschool.edu.vn";
    await logActivity(currentUserId, currentUserEmail, "SOURCE_CREATE", "TextbookSource", src.id, null, src);

    return NextResponse.json({ success: true, data: src });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
