import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { normalizeKey } from "@/lib/competency-service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
  const user = session?.user;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [subjects, competencies, subjectAliases, compAliases] = await Promise.all([
      prisma.subject.findMany({
        select: { id: true, subjectCode: true, subjectName: true },
        orderBy: { subjectName: "asc" },
      }),
      prisma.subjectCompetency.findMany({
        include: { subject: { select: { subjectName: true, subjectCode: true } } },
        orderBy: [{ subjectId: "asc" }, { displayOrder: "asc" }],
      }),
      prisma.subjectAlias.findMany({
        include: { subject: { select: { subjectName: true, subjectCode: true } } },
      }),
      prisma.subjectCompetencyAlias.findMany({
        include: {
          competency: {
            select: {
              name: true,
              code: true,
              subject: { select: { subjectName: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      subjects,
      competencies,
      subjectAliases,
      competencyAliases: compAliases,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi tải aliases" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
  const user = session?.user;
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, targetId, aliasPattern, newCompetency } = body;

    if (type === "NEW_COMPETENCY" && newCompetency) {
      const { subjectId, code, name, displayOrder, weight } = newCompetency;
      const comp = await prisma.subjectCompetency.create({
        data: {
          subjectId,
          code: code || "NL_" + normalizeKey(name).toUpperCase(),
          name,
          displayOrder: displayOrder || 1,
          weight: weight || 1.0,
        },
      });
      return NextResponse.json({ success: true, competency: comp });
    }

    if (type === "SUBJECT_ALIAS") {
      if (!targetId || !aliasPattern) {
        return NextResponse.json({ error: "Thiếu thông tin alias môn học" }, { status: 400 });
      }
      const norm = normalizeKey(aliasPattern);
      const alias = await prisma.subjectAlias.upsert({
        where: { aliasPattern },
        create: { subjectId: targetId, aliasPattern, normalizedKey: norm },
        update: { subjectId: targetId, normalizedKey: norm },
      });
      return NextResponse.json({ success: true, alias });
    }

    if (type === "COMPETENCY_ALIAS") {
      if (!targetId || !aliasPattern) {
        return NextResponse.json({ error: "Thiếu thông tin alias năng lực" }, { status: 400 });
      }
      const norm = normalizeKey(aliasPattern);
      const alias = await prisma.subjectCompetencyAlias.upsert({
        where: { aliasPattern },
        create: { competencyId: targetId, aliasPattern, normalizedKey: norm },
        update: { competencyId: targetId, normalizedKey: norm },
      });
      return NextResponse.json({ success: true, alias });
    }

    return NextResponse.json({ error: "Type không hợp lệ" }, { status: 400 });
  } catch (error: any) {
    console.error("Alias create error:", error);
    return NextResponse.json({ error: error.message || "Lỗi lưu alias" }, { status: 500 });
  }
}