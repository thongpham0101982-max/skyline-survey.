import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get('academicYearId');

    let activeYearId = academicYearId;
    if (!activeYearId || activeYearId === 'all') {
      const activeYear = await prisma.academicYear.findFirst({ where: { status: 'ACTIVE' } });
      activeYearId = activeYear?.id;
    }

    const whereCondition: any = { status: 'ACTIVE' };
    if (activeYearId) {
      whereCondition.academicYearId = activeYearId;
    }

    const classes = await prisma.class.findMany({
      where: whereCondition,
      orderBy: [
        { level: 'asc' },
        { grade: 'asc' },
        { className: 'asc' }
      ]
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
