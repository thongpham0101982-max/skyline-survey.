import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminOrLeadershipSession } from "@/lib/security-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const subjects = await prisma.subject.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        subjectCode: true,
        subjectName: true,
        level: true,
        category: true,
      },
      orderBy: { subjectName: "asc" }
    });

    return NextResponse.json(subjects);
  } catch (error: any) {
    console.error("Error fetching subjects:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAdminOrLeadershipSession();
    if (!ctx) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const rawName = String(body.subjectName || "").trim();
    if (!rawName) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập tên môn học" }, { status: 400 });
    }
    const rawCode = String(body.subjectCode || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_") || rawName.slice(0, 6).toUpperCase().replace(/\s+/g, "_");
    const level = String(body.level || "ALL").trim();
    const category = String(body.category || "INTERNATIONAL").trim();

    const existing = await prisma.subject.findUnique({
      where: { subjectCode: rawCode },
    });
    if (existing) {
      const updated = await prisma.subject.update({
        where: { id: existing.id },
        data: {
          subjectName: rawName,
          level,
          category,
          status: "ACTIVE",
        },
      });
      return NextResponse.json({ success: true, subject: updated });
    }

    const created = await prisma.subject.create({
      data: {
        subjectCode: rawCode,
        subjectName: rawName,
        level,
        category,
        status: "ACTIVE",
      },
    });
    return NextResponse.json({ success: true, subject: created });
  } catch (error: any) {
    console.error("Error creating subject:", error);
    return NextResponse.json({ success: false, error: error.message || "Không thể thêm môn học" }, { status: 500 });
  }
}
