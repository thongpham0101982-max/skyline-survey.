import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: any) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryType = searchParams.get("categoryType");
    const academicYearId = searchParams.get("academicYearId");
    const where: any = {};
    if (categoryType) where.categoryType = categoryType;
    if (academicYearId) where.academicYearId = academicYearId;
    const configs = await (prisma as any).assessmentConfig.findMany({
      where,
      include: { academicYear: true },
      orderBy: [{ categoryType: 'asc' }, { sortOrder: 'asc' }]
    });
    return NextResponse.json(configs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: any) {
  try {
    const { categoryType, code, name, academicYearId } = await req.json();
    if (!categoryType || !code || !name) return NextResponse.json({ error: "Thieu thong tin" }, { status: 400 });
    const count = await (prisma as any).assessmentConfig.count({ where: { categoryType } });
    const data: any = { categoryType, code, name, sortOrder: count };
    if (academicYearId) data.academicYearId = academicYearId;
    const result = await (prisma as any).assessmentConfig.create({ data, include: { academicYear: true } });
    return NextResponse.json(result);
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: "Ma da ton tai" }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: any) {
  try {
    const { id, name, code } = await req.json();
    if (!id) return NextResponse.json({ error: "Thieu ID" }, { status: 400 });
    const data: any = {};
    if (name) data.name = name;
    if (code) data.code = code;
    const result = await (prisma as any).assessmentConfig.update({ where: { id }, data });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: any) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Thieu ID" }, { status: 400 });
    await (prisma as any).assessmentConfig.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}