import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" }
    });
    return NextResponse.json(departments);
  } catch (error: any) {
    console.error("Error fetching departments:", error);
    return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, name, description, blockCM, teamsWebhookUrl } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Mã Tổ và Tên Tổ là bắt buộc" }, { status: 400 });
    }

    const trimmedCode = String(code).trim().toUpperCase();
    const trimmedName = String(name).trim();

    const existing = await prisma.department.findFirst({
      where: {
        OR: [
          { code: trimmedCode },
          { name: trimmedName }
        ]
      }
    });

    if (existing) {
      if (existing.code === trimmedCode) {
        return NextResponse.json({ error: `Mã Tổ "${trimmedCode}" đã tồn tại.` }, { status: 400 });
      }
      return NextResponse.json({ error: `Tên Tổ "${trimmedName}" đã tồn tại.` }, { status: 400 });
    }

    const department = await prisma.department.create({
      data: {
        code: trimmedCode,
        name: trimmedName,
        description: description ? String(description).trim() : null,
        blockCM: blockCM ? String(blockCM).trim() : null,
        teamsWebhookUrl: teamsWebhookUrl ? String(teamsWebhookUrl).trim() : null,
        status: "ACTIVE"
      }
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error: any) {
    console.error("Error creating department:", error);
    return NextResponse.json({ error: error.message || "Failed to create department" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, code, name, description, blockCM, teamsWebhookUrl } = body;

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID Tổ chuyên môn" }, { status: 400 });
    }

    if (!code || !name) {
      return NextResponse.json({ error: "Mã Tổ và Tên Tổ là bắt buộc" }, { status: 400 });
    }

    const trimmedCode = String(code).trim().toUpperCase();
    const trimmedName = String(name).trim();

    const duplicate = await prisma.department.findFirst({
      where: {
        id: { not: id },
        OR: [
          { code: trimmedCode },
          { name: trimmedName }
        ]
      }
    });

    if (duplicate) {
      if (duplicate.code === trimmedCode) {
        return NextResponse.json({ error: `Mã Tổ "${trimmedCode}" đã được sử dụng ở tổ khác.` }, { status: 400 });
      }
      return NextResponse.json({ error: `Tên Tổ "${trimmedName}" đã được sử dụng ở tổ khác.` }, { status: 400 });
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        code: trimmedCode,
        name: trimmedName,
        description: description ? String(description).trim() : null,
        blockCM: blockCM ? String(blockCM).trim() : null,
        teamsWebhookUrl: teamsWebhookUrl ? String(teamsWebhookUrl).trim() : null
      }
    });

    return NextResponse.json(department);
  } catch (error: any) {
    console.error("Error updating department:", error);
    return NextResponse.json({ error: error.message || "Failed to update department" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const ids = searchParams.get("ids");

    let idList = [];
    if (ids) {
      idList = ids.split(",").map(i => i.trim()).filter(Boolean);
    } else if (id) {
      idList = [id.trim()];
    }

    if (idList.length === 0) {
      return NextResponse.json({ error: "Thiếu ID để xóa" }, { status: 400 });
    }

    // Unlink teachers referencing these departments
    await prisma.teacher.updateMany({
      where: { departmentId: { in: idList } },
      data: { departmentId: null }
    });

    // Delete departments (cascade will clean up assignments)
    await prisma.department.deleteMany({
      where: { id: { in: idList } }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting department:", error);
    return NextResponse.json({ error: error.message || "Failed to delete department" }, { status: 500 });
  }
}
