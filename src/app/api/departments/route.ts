import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET - list all departments
export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(departments);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Loi server" }, { status: 500 });
  }
}

// POST - create new department
export async function POST(req: NextRequest) {
  try {
    const { code, name, description } = await req.json();
    if (!code || !name) {
      return NextResponse.json({ error: "Ma To va Ten To khong duoc de trong" }, { status: 400 });
    }
    const dept = await prisma.department.create({
      data: { code: code.trim().toUpperCase(), name: name.trim(), description: description?.trim() || null },
    });
    return NextResponse.json(dept, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Ma To da ton tai, vui long chon ma khac" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Loi server" }, { status: 500 });
  }
}

// PUT - update department
export async function PUT(req: NextRequest) {
  try {
    const { id, code, name, description } = await req.json();
    if (!id || !code || !name) {
      return NextResponse.json({ error: "Thieu thong tin cap nhat" }, { status: 400 });
    }
    const dept = await prisma.department.update({
      where: { id },
      data: { code: code.trim().toUpperCase(), name: name.trim(), description: description?.trim() || null },
    });
    return NextResponse.json(dept);
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Ma To da ton tai" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Loi server" }, { status: 500 });
  }
}

// DELETE - delete one or many
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const ids = searchParams.get("ids");

    if (ids) {
      const idList = ids.split(",").filter(Boolean);
      await prisma.department.updateMany({
        where: { id: { in: idList } },
        data: { status: "DELETED" },
      });
      return NextResponse.json({ deleted: idList.length });
    }

    if (id) {
      await prisma.department.update({
        where: { id },
        data: { status: "DELETED" },
      });
      return NextResponse.json({ deleted: 1 });
    }

    return NextResponse.json({ error: "Thieu id" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Loi server" }, { status: 500 });
  }
}
