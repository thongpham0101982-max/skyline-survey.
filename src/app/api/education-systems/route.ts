import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req) {
  try {
    const { code, name, academicYearId } = await req.json();
    const existing = await (prisma as any).educationSystem.findFirst({
      where: { code, academicYearId }
    });
    if (existing) return NextResponse.json({ error: "Hệ học " + code + " đã tồn tại trong năm học này." }, { status: 400 });

    const result = await (prisma as any).educationSystem.create({
      data: { code, name, academicYearId }
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Thiếu ID" }, { status: 400 });
    await (prisma as any).educationSystem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}