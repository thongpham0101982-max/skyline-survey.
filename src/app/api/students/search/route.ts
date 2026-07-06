import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get('academicYearId');
    const q = searchParams.get('q');
    const classId = searchParams.get('classId');

    if (!academicYearId) {
      return NextResponse.json({ error: "Missing academicYearId" }, { status: 400 });
    }

    const where: any = {
      academicYearId,
      status: 'ACTIVE'
    };

    if (classId) {
      where.classId = classId;
    }

    if (q) {
      where.OR = [
        { studentName: { contains: q, mode: 'insensitive' } },
        { studentCode: { contains: q, mode: 'insensitive' } }
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        class: true
      },
      take: classId ? 1000 : 20,
      orderBy: { studentName: 'asc' }
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error("Error searching students:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}