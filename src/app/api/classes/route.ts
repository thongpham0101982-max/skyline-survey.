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

    // Filter by GVCN assignment if teacher is logged in or if isGVCN=true
    if (session && session.user) {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (teacher && (isGVCNOnly || (session.user as any).role === "TEACHER")) {
        // Find classes where teacher is homeroom teacher
        const homeroomClasses = await prisma.class.findMany({
          where: {
            ...whereCondition,
            OR: [
              { homeroomTeacherId: teacher.id },
              { homeroomTeacherId: { contains: teacher.id } }
            ]
          },
          orderBy: [
            { level: 'asc' },
            { grade: 'asc' },
            { className: 'asc' }
          ]
        });

        // If teacher has homeroom classes assigned, return them
        if (homeroomClasses.length > 0) {
          return NextResponse.json(homeroomClasses);
        }
      }
    }

    // Fallback: Return all classes in the academic year
    const classes = await prisma.class.findMany({
      where: whereCondition,
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
