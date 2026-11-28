import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureTciSchema } from "@/lib/tci/schema-init";
import { TCI_SUBJECT_CODE, TCI_SUBJECT_NAME, TCI_ASSESSMENT_TYPE } from "@/lib/tci/constants";
import { ensurePvdhSchema } from "@/lib/pvdh/schema-init";
import { classifyAssessmentContentCategory } from "@/lib/pvdh/constants";
import { requireAdminOrLeadershipSession } from "@/lib/security-guard";

const modelMap: any = {
  grade: "assessmentGrade",
  system: "assessmentSystem",
  subject: "assessmentSubject",
};

function sanitizeSubjectPayload(raw: any) {
  if (!raw || typeof raw !== "object") return raw;
  const out = { ...raw };
  if (typeof out.code === "string") {
    out.code = out.code.trim();
  }
  if (typeof out.name === "string") {
    // Đảm bảo không bao giờ lưu tên bị dính mã môn "tuổiTCI"
    out.name = out.name.replace(/tuổiTCI/gi, "tuổi").trim();
  }
  if (out.code?.toUpperCase() === TCI_SUBJECT_CODE) {
    out.code = TCI_SUBJECT_CODE;
    if (!out.name || out.name.includes("tuổiTCI")) {
      out.name = TCI_SUBJECT_NAME;
    }
    if (!out.subjectType) {
      out.subjectType = TCI_ASSESSMENT_TYPE;
    }
    out.scoreColumns = 16;
    out.commentColumns = Math.max(Number(out.commentColumns || 0), 4);
  }
  return out;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    if (!type || !modelMap[type]) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    const pAny = prisma as any;

    if (type === "subject") {
      await ensureTciSchema();
      await ensurePvdhSchema().catch(() => {});
      try {
        const items = await pAny[modelMap[type]].findMany({ orderBy: { sortOrder: "asc" } });
        return NextResponse.json(
          items.map((item: any) => ({
            ...item,
            contentCategory: classifyAssessmentContentCategory(item),
          }))
        );
      } catch (e: any) {
        if (e.message.includes("exemptCriteria") || e.message.includes("columnNames")) {
          const items = await pAny[modelMap[type]].findMany({
            select: {
              id: true,
              code: true,
              name: true,
              subjectType: true,
              scoreColumns: true,
              commentColumns: true,
              sortOrder: true,
              status: true,
              createdAt: true,
            },
            orderBy: { sortOrder: "asc" },
          });
          return NextResponse.json(items);
        }
        throw e;
      }
    }

    const items = await pAny[modelMap[type]].findMany({ orderBy: { sortOrder: "asc" } });
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAdminOrLeadershipSession();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { type, data } = await req.json();
    if (!type || !modelMap[type]) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    const pAny = prisma as any;
    const cleanData = type === "subject" ? sanitizeSubjectPayload(data) : data;

    if (type === "subject" && cleanData.code) {
      const existing = await pAny[modelMap[type]].findUnique({
        where: { code: cleanData.code },
      });
      if (existing) {
        const updated = await pAny[modelMap[type]].update({
          where: { id: existing.id },
          data: cleanData,
        });
        return NextResponse.json(updated);
      }
    }

    const count = await pAny[modelMap[type]].count();
    const result = await pAny[modelMap[type]].create({
      data: { ...cleanData, sortOrder: count + 1 },
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await requireAdminOrLeadershipSession();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { type, id, data } = await req.json();
    if (!type || !modelMap[type]) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    const pAny = prisma as any;
    const cleanData = type === "subject" ? sanitizeSubjectPayload(data) : data;
    const result = await pAny[modelMap[type]].update({ where: { id }, data: cleanData });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireAdminOrLeadershipSession();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");
    if (!type || !modelMap[type] || !id) return NextResponse.json({ error: "Missing params" }, { status: 400 });

    const pAny = prisma as any;
    await pAny[modelMap[type]].delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
