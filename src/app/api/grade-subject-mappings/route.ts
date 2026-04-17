import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: any) {
  try {
    const { searchParams } = new URL(req.url);
    const gradesParam = searchParams.get("grades");
    const eduParam = searchParams.get("eduSystems");
    const grades = gradesParam ? gradesParam.split(",").filter(Boolean) : [];
    const eduSystems = eduParam ? eduParam.split(",").filter(Boolean) : [];
    const where: any = {};
    if (grades.length) where.grade = { in: grades };
    if (eduSystems.length) where.educationSystem = { in: eduSystems };
    const mappings = await (prisma as any).gradeSubjectMapping.findMany({ where, include: { subject: true }, orderBy: { createdAt: 'asc' } });
    return NextResponse.json(mappings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: any) {
  try {
    const body = await req.json();
    const grades = body.grades || [];
    const eduSystems = body.eduSystems || [];
    const subjectId = body.subjectId;
    if (!grades.length || !eduSystems.length || !subjectId) return NextResponse.json({ error: "Thieu thong tin" }, { status: 400 });
    let created = 0;
    for (const grade of grades) {
      for (const edu of eduSystems) {
        const existing = await (prisma as any).gradeSubjectMapping.findFirst({ where: { grade, educationSystem: edu, subjectId } });
        if (!existing) { await (prisma as any).gradeSubjectMapping.create({ data: { grade, educationSystem: edu, subjectId } }); created++; }
      }
    }
    return NextResponse.json({ success: true, created });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: any) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const subjectId = searchParams.get("subjectId");
    const gradesParam = searchParams.get("grades");
    const eduParam = searchParams.get("eduSystems");
    if (id) { await (prisma as any).gradeSubjectMapping.delete({ where: { id } }); }
    else if (subjectId && gradesParam && eduParam) {
      const grades = gradesParam.split(",").filter(Boolean);
      const eduSystems = eduParam.split(",").filter(Boolean);
      await (prisma as any).gradeSubjectMapping.deleteMany({ where: { subjectId, grade: { in: grades }, educationSystem: { in: eduSystems } } });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}