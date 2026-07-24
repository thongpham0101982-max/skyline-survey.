import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get('academicYearId');

    let classes: any[] = [];
    if (academicYearId) {
      classes = await prisma.class.findMany({
        where: { academicYearId },
        orderBy: [
          { level: 'asc' },
          { grade: 'asc' },
          { className: 'asc' }
        ]
      });
    }

    if (!classes || classes.length === 0) {
      classes = await prisma.class.findMany({
        orderBy: [
          { level: 'asc' },
          { grade: 'asc' },
          { className: 'asc' }
        ]
      });
    }

    return NextResponse.json(classes);
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
