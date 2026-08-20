import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get('academicYearId');
    const isGVCNOnly = searchParams.get('isGVCN') === 'true';

    let activeYearId = academicYearId;
    if (!activeYearId || activeYearId === 'all') {
      const activeYear = await prisma.academicYear.findFirst({ where: { status: 'ACTIVE' } });
      activeYearId = activeYear?.id;
    }

    const whereCondition: any = { status: 'ACTIVE' };
    if (activeYearId) {
      whereCondition.academicYearId = activeYearId;
    }

    // STRICT GVCN FILTERING WHEN isGVCN=true OR WHEN TEACHER LOGGED IN
    if (session && session.user && isGVCNOnly) {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (teacher) {
        const homeroomClasses = await prisma.class.findMany({
          where: {
            ...whereCondition,
            OR: [
              { homeroomTeacherId: teacher.id },
              { homeroomTeacherId: { contains: teacher.id } },
              { teachers: { some: { teacherId: teacher.id, roleInClass: "GVCN" } } }
            ]
          },
          include: { campus: true },
          orderBy: [
            { level: 'asc' },
            { grade: 'asc' },
            { className: 'asc' }
          ]
        });

        // Strictly return ONLY homeroom classes of this teacher (No fallback to other classes)
        return NextResponse.json(homeroomClasses);
      }
    }

    // Default general query (for Admin or system dropdowns)
    const classes = await prisma.class.findMany({
      where: whereCondition,
      include: { campus: true },
      orderBy: [
        { level: 'asc' },
        { grade: 'asc' },
        { className: 'asc' }
      ]
    });

    return NextResponse.json(classes);
  } catch (error: any) {
    console.error("Error fetching classes:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
