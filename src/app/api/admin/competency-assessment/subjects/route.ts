import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { normalizeKey, DGNL_SUBJECT_CATALOG } from "@/lib/competency-service";

const PURE_KSDV_CODES = new Set(["EPT", "NLTD", "TAv", "TAvd"]);

/**
 * Đồng bộ tên môn ĐGNL (dạng chữ, KHÔNG bao giờ ghi mã DG_* sang SubjectAlias).
 * Toàn bộ mã DG_* chỉ lưu duy nhất trong bảng CompetencySubjectCatalog (Danh mục Mã môn ĐGNL).
 */
async function syncSubjectNameAliasOnly(subjectId: string, dgnlName: string) {
  const trimmedName = dgnlName.trim();
  if (!trimmedName || /^DG_/i.test(trimmedName)) return;
  const normalizedKey = normalizeKey(trimmedName);
  if (!normalizedKey) return;
  await prisma.subjectAlias.upsert({
    where: { aliasPattern: trimmedName },
    create: { subjectId, aliasPattern: trimmedName, normalizedKey },
    update: { subjectId, normalizedKey },
  });
}

export async function GET() {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [allSubjects, competencies, existingItems] = await Promise.all([
      prisma.subject.findMany({
        select: { id: true, subjectCode: true, subjectName: true, category: true, evaluationType: true },
        orderBy: { subjectCode: "asc" },
      }),
      prisma.subjectCompetency.findMany({
        select: { id: true, subjectId: true, code: true, name: true },
        orderBy: { displayOrder: "asc" },
      }),
      prisma.competencySubjectCatalog.findMany({
        include: {
          subject: {
            select: { id: true, subjectCode: true, subjectName: true, category: true },
          },
        },
        orderBy: [{ displayOrder: "asc" }, { dgnlCode: "asc" }],
      }),
    ]);

    const subjects = allSubjects.filter((s) => !PURE_KSDV_CODES.has(s.subjectCode));
    const compBySubjectId = new Map<string, Array<{ id: string; code: string; name: string }>>();
    for (const c of competencies) {
      const arr = compBySubjectId.get(c.subjectId) || [];
      arr.push({ id: c.id, code: c.code, name: c.name });
      compBySubjectId.set(c.subjectId, arr);
    }

    const items = existingItems.map((item) => {
      const comps = compBySubjectId.get(item.subjectId) || [];
      return {
        ...item,
        competencyCount: comps.length,
        competencies: comps,
      };
    });

    // Suggested DG_* presets for SSM subjects not yet in catalog
    const suggestedBySsmCode: Record<string, { dgnlCode: string; dgnlName: string; programGroup: string }> = {};
    for (const preset of DGNL_SUBJECT_CATALOG) {
      if (!suggestedBySsmCode[preset.ssmSubjectCode]) {
        suggestedBySsmCode[preset.ssmSubjectCode] = {
          dgnlCode: preset.dgnlCode,
          dgnlName: preset.dgnlName,
          programGroup: preset.programGroup,
        };
      }
    }

    return NextResponse.json({
      success: true,
      items,
      subjects,
      suggestedBySsmCode,
    });
  } catch (error: any) {
    console.error("GET competency subjects error:", error);
    return NextResponse.json({ error: error.message || "Lỗi tải danh mục mã môn ĐGNL" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "KTDBCL" && user.role !== "BGH")) {
      return NextResponse.json({ error: "Không có quyền thực hiện" }, { status: 403 });
    }

    const body = await req.json();
    const rawCode = String(body.dgnlCode || "").trim().toUpperCase();
    const dgnlName = String(body.dgnlName || "").trim();
    const subjectId = String(body.subjectId || "").trim();
    const programGroup = String(body.programGroup || "MOET").trim();
    const mappingType = String(body.mappingType || "DIRECT").trim();
    const isActive = body.isActive !== false;
    const note = body.note ? String(body.note).trim() : null;

    if (!rawCode || !dgnlName || !subjectId) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ Mã môn ĐGNL, Tên môn ĐGNL và chọn Môn học chuẩn trên SSM" },
        { status: 400 }
      );
    }

    // Verify canonical SSM subject exists (NEVER create new Subject rows!)
    const ssmSubject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!ssmSubject) {
      return NextResponse.json({ error: "Môn học chuẩn SSM không tồn tại" }, { status: 400 });
    }

    const duplicate = await prisma.competencySubjectCatalog.findUnique({
      where: { dgnlCode: rawCode },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: `Mã môn ĐGNL "${rawCode}" đã tồn tại trong danh mục (${duplicate.dgnlName})` },
        { status: 400 }
      );
    }

    const maxOrderAgg = await prisma.competencySubjectCatalog.aggregate({
      _max: { displayOrder: true },
    });
    const displayOrder =
      typeof body.displayOrder === "number" && body.displayOrder > 0
        ? body.displayOrder
        : (maxOrderAgg._max.displayOrder || 0) + 1;

    const created = await prisma.competencySubjectCatalog.create({
      data: {
        dgnlCode: rawCode,
        dgnlName,
        subjectId,
        programGroup,
        mappingType,
        isActive,
        displayOrder,
        note,
      },
      include: {
        subject: { select: { id: true, subjectCode: true, subjectName: true } },
      },
    });

    if (isActive) {
      await syncSubjectNameAliasOnly(subjectId, dgnlName);
    }

    return NextResponse.json({ success: true, item: created });
  } catch (error: any) {
    console.error("POST competency subject error:", error);
    return NextResponse.json({ error: error.message || "Lỗi thêm mã môn ĐGNL" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "KTDBCL" && user.role !== "BGH")) {
      return NextResponse.json({ error: "Không có quyền thực hiện" }, { status: 403 });
    }

    const body = await req.json();
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Thiếu ID bản ghi" }, { status: 400 });
    }

    const existing = await prisma.competencySubjectCatalog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy mã môn ĐGNL" }, { status: 404 });
    }

    const rawCode = body.dgnlCode !== undefined ? String(body.dgnlCode).trim().toUpperCase() : existing.dgnlCode;
    const dgnlName = body.dgnlName !== undefined ? String(body.dgnlName).trim() : existing.dgnlName;
    const subjectId = body.subjectId !== undefined ? String(body.subjectId).trim() : existing.subjectId;
    const programGroup = body.programGroup !== undefined ? String(body.programGroup).trim() : existing.programGroup;
    const mappingType = body.mappingType !== undefined ? String(body.mappingType).trim() : existing.mappingType;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive;
    const displayOrder = body.displayOrder !== undefined ? Number(body.displayOrder) : existing.displayOrder;
    const note = body.note !== undefined ? (body.note ? String(body.note).trim() : null) : existing.note;

    if (!rawCode || !dgnlName || !subjectId) {
      return NextResponse.json({ error: "Mã môn ĐGNL, Tên môn và Môn chuẩn SSM không được để trống" }, { status: 400 });
    }

    if (rawCode !== existing.dgnlCode) {
      const dup = await prisma.competencySubjectCatalog.findUnique({ where: { dgnlCode: rawCode } });
      if (dup && dup.id !== id) {
        return NextResponse.json({ error: `Mã môn ĐGNL "${rawCode}" đã tồn tại` }, { status: 400 });
      }
    }

    const updated = await prisma.competencySubjectCatalog.update({
      where: { id },
      data: {
        dgnlCode: rawCode,
        dgnlName,
        subjectId,
        programGroup,
        mappingType,
        isActive,
        displayOrder,
        note,
      },
      include: {
        subject: { select: { id: true, subjectCode: true, subjectName: true } },
      },
    });

    if (existing.dgnlCode !== rawCode) {
      await prisma.subjectAlias.deleteMany({ where: { aliasPattern: existing.dgnlCode } });
    }
    if (isActive) {
      await syncSubjectNameAliasOnly(subjectId, dgnlName);
    }

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    console.error("PUT competency subject error:", error);
    return NextResponse.json({ error: error.message || "Lỗi cập nhật mã môn ĐGNL" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "KTDBCL" && user.role !== "BGH")) {
      return NextResponse.json({ error: "Không có quyền thực hiện" }, { status: 403 });
    }

    const body = await req.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids.map((v: any) => String(v).trim()).filter(Boolean) : [];
    const isActive = Boolean(body.isActive);

    if (ids.length === 0) {
      return NextResponse.json({ error: "Danh sách mã môn cần cập nhật trống" }, { status: 400 });
    }

    await prisma.competencySubjectCatalog.updateMany({
      where: { id: { in: ids } },
      data: { isActive },
    });

    return NextResponse.json({ success: true, updatedCount: ids.length, isActive });
  } catch (error: any) {
    console.error("PATCH competency subjects error:", error);
    return NextResponse.json({ error: error.message || "Lỗi cập nhật trạng thái tick ĐGNL" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "KTDBCL")) {
      return NextResponse.json({ error: "Không có quyền xóa" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Thiếu ID cần xóa" }, { status: 400 });
    }

    const existing = await prisma.competencySubjectCatalog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy bản ghi" }, { status: 404 });
    }

    await prisma.competencySubjectCatalog.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE competency subject error:", error);
    return NextResponse.json({ error: error.message || "Lỗi xóa mã môn ĐGNL" }, { status: 500 });
  }
}
