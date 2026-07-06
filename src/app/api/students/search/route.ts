import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get('academicYearId');
    const q = searchParams.get('q');

    if (!academicYearId) {
      return NextResponse.json({ error: "Missing academicYearId" }, { status: 400 });
    }

    const where: any = {
      academicYearId,
      status: 'ACTIVE'
    };

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
      take: 20,
      orderBy: { studentName: 'asc' }
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error("Error searching students:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}