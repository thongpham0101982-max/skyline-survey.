import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get('academicYearId');

    const where: any = {};
    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    const classes = await prisma.class.findMany({
      where,
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