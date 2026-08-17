import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get('academicYearId');
    const q = searchParams.get('q');
    const classId = searchParams.get('classId');
    const grade = searchParams.get('grade');

    const where: any = {};

    if (classId) {
      where.classId = classId;
    } else if (grade) {
      where.class = { grade };
      if (academicYearId) {
        where.class.academicYearId = academicYearId;
      }
    } else if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    if (q) {
      where.OR = [
        { studentName: { contains: q } },
        { studentCode: { contains: q } }
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        class: true
      },
      take: (classId || grade) ? 1000 : 100,
      orderBy: { studentName: 'asc' }
    });

    return NextResponse.json(students.map(s => ({
      ...s,
      name: s.studentName,
      fullName: s.studentName,
      code: s.studentCode,
      studentCode: s.studentCode,
      className: s.class?.className || ''
    })));
  } catch (error: any) {
    console.error("Error searching students:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
