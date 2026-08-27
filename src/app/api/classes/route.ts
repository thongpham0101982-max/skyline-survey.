import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get('academicYearId');
    const isGVCNOnly = searchParams.get('isGVCN') === 'true';
    const scope = searchParams.get('scope'); // 'my_teaching_classes' | 'all'

    let activeYearId = academicYearId;
    if (!activeYearId || activeYearId === 'all') {
      const activeYear = await prisma.academicYear.findFirst({ where: { status: 'ACTIVE' } });
      activeYearId = activeYear?.id;
    }

    const whereCondition: any = { status: 'ACTIVE' };
    if (activeYearId) {
      whereCondition.academicYearId = activeYearId;
    }

    // Teacher specific classes query (GVCN + GVBM)
    if (session && session.user && (isGVCNOnly || scope === 'my_teaching_classes')) {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (teacher) {
        if (isGVCNOnly) {
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
          return NextResponse.json(homeroomClasses.map(c => ({ ...c, teacherRole: "GVCN", roleLabel: "Chủ nhiệm" })));
        }

        // Scope: my_teaching_classes (Both Homeroom + Subject teaching classes)
        const myClasses = await prisma.class.findMany({
          where: {
            ...whereCondition,
            OR: [
              { homeroomTeacherId: teacher.id },
              { homeroomTeacherId: { contains: teacher.id } },
              { teachers: { some: { teacherId: teacher.id } } },
              { teachingAssignments: { some: { teacherId: teacher.id } } }
            ]
          },
          include: {
            campus: true,
            teachingAssignments: {
              where: { teacherId: teacher.id },
              include: { subject: true }
            }
          },
          orderBy: [
            { level: 'asc' },
            { grade: 'asc' },
            { className: 'asc' }
          ]
        });

        const formatted = myClasses.map(c => {
          const isHomeroom = c.homeroomTeacherId === teacher.id || (c.homeroomTeacherId && c.homeroomTeacherId.includes(teacher.id));
          const subjects = c.teachingAssignments.map(ta => ta.subject?.subjectName).filter(Boolean);
          const roleLabel = isHomeroom 
            ? "Chủ nhiệm" 
            : (subjects.length > 0 ? `GVBM ${subjects.join(', ')}` : "Giảng dạy");

          return {
            ...c,
            isHomeroom,
            teacherRole: isHomeroom ? "GVCN" : "GVBM",
            roleLabel
          };
        });

        return NextResponse.json(formatted);
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
