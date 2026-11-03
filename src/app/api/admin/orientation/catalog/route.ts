import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gradeGroup = searchParams.get("gradeGroup") || undefined;
    const status = searchParams.get("status") || "ACTIVE";

    const pAny = prisma as any;
    const where: any = {};
    if (status !== "ALL") {
      where.status = status;
    }
    if (gradeGroup && gradeGroup !== "ALL") {
      where.gradeGroup = { in: [gradeGroup, "ALL"] };
    }

    const list = await pAny.orientationQuestionCatalog.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });

    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    console.error("GET /api/admin/orientation/catalog error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { gradeGroup, grade, category, categoryLabel, questionText, suggestedGuideline, sortOrder } = body;

    if (!gradeGroup || !category || !questionText) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const pAny = prisma as any;
    const created = await pAny.orientationQuestionCatalog.create({
      data: {
        gradeGroup,
        grade: grade || "ALL",
        category,
        categoryLabel: categoryLabel || "",
        questionText,
        suggestedGuideline: suggestedGuideline || "",
        sortOrder: Number(sortOrder) || 0,
        status: "ACTIVE"
      }
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    console.error("POST /api/admin/orientation/catalog error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, gradeGroup, grade, category, categoryLabel, questionText, suggestedGuideline, sortOrder, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID câu hỏi" }, { status: 400 });
    }

    const pAny = prisma as any;
    const updated = await pAny.orientationQuestionCatalog.update({
      where: { id },
      data: {
        ...(gradeGroup ? { gradeGroup } : {}),
        ...(grade !== undefined ? { grade } : {}),
        ...(category ? { category } : {}),
        ...(categoryLabel !== undefined ? { categoryLabel } : {}),
        ...(questionText ? { questionText } : {}),
        ...(suggestedGuideline !== undefined ? { suggestedGuideline } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
        ...(status ? { status } : {}),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("PUT /api/admin/orientation/catalog error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID câu hỏi" }, { status: 400 });
    }

    const pAny = prisma as any;
    await pAny.orientationQuestionCatalog.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Đã xóa câu hỏi" });
  } catch (error: any) {
    console.error("DELETE /api/admin/orientation/catalog error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
