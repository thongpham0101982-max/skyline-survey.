import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

const modelMap: any = {
  grade: "assessmentGrade",
  system: "assessmentSystem",
  subject: "assessmentSubject"
};

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    if (!type || !modelMap[type]) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    const items = await (prisma as any)[modelMap[type]].findMany({ orderBy: { sortOrder: 'asc' } });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { type, data } = await req.json();
    if (!type || !modelMap[type]) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    const count = await (prisma as any)[modelMap[type]].count();
    const result = await (prisma as any)[modelMap[type]].create({
      data: { ...data, sortOrder: count + 1 }
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { type, id, data } = await req.json();
    if (!type || !modelMap[type]) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    const result = await (prisma as any)[modelMap[type]].update({ where: { id }, data });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");
    if (!type || !modelMap[type] || !id) return NextResponse.json({ error: "Missing params" }, { status: 400 });

    await (prisma as any)[modelMap[type]].delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}