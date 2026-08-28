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

    const whereCondition: any = {};
    if (activeYearId && activeYearId !== 'all') {
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
            include: {
              campus: true,
              academicYear: true,
              teachers: {
                where: { roleInClass: "GVCN" },
                include: { teacher: { select: { id: true, teacherName: true, email: true } } }
              },
              _count: { select: { students: true } }
            },
            orderBy: [{ level: 'asc' }, { grade: 'asc' }, { className: 'asc' }]
          });

          return NextResponse.json(homeroomClasses.map(c => ({
            ...c,
            isHomeroom: true,
            homeroomTeacher: { id: teacher.id, teacherName: teacher.teacherName, email: teacher.email }
          })));
        }

        // Scope: my_teaching_classes (both homeroom + subject classes)
        const [homeroomClasses, subjectClasses] = await Promise.all([
          prisma.class.findMany({
            where: {
              ...whereCondition,
              OR: [
                { homeroomTeacherId: teacher.id },
                { homeroomTeacherId: { contains: teacher.id } },
                { teachers: { some: { teacherId: teacher.id, roleInClass: "GVCN" } } }
              ]
            },
            include: {
              campus: true,
              academicYear: true,
              _count: { select: { students: true } }
            }
          }),
          prisma.teachingAssignment.findMany({
            where: {
              teacherId: teacher.id,
              ...(activeYearId && activeYearId !== 'all' ? { academicYearId: activeYearId } : {})
            },
            include: {
              class: {
                include: {
                  campus: true,
                  academicYear: true,
                  _count: { select: { students: true } }
                }
              },
              subject: true
            }
          })
        ]);

        const classMap = new Map();
        homeroomClasses.forEach(c => {
          classMap.set(c.id, {
            ...c,
            isHomeroom: true,
            homeroomTeacher: { id: teacher.id, teacherName: teacher.teacherName, email: teacher.email },
            subjects: []
          });
        });

        subjectClasses.forEach(ta => {
          if (ta.class) {
            const existing = classMap.get(ta.class.id) || {
              ...ta.class,
              isHomeroom: false,
              subjects: []
            };
            if (ta.subject) {
              existing.subjects.push({
                id: ta.subject.id,
                subjectCode: ta.subject.subjectCode,
                subjectName: ta.subject.subjectName
              });
            }
            classMap.set(ta.class.id, existing);
          }
        });

        return NextResponse.json(Array.from(classMap.values()));
      }
    }

    // Default general query (for Admin, Teacher Wizard or system dropdowns)
    let classes = await prisma.class.findMany({
      where: Object.keys(whereCondition).length > 0 ? whereCondition : undefined,
      include: {
        campus: true,
        academicYear: true,
        teachers: {
          include: { teacher: { select: { id: true, teacherName: true, email: true } } }
        },
        teachingAssignments: {
          include: {
            subject: { select: { id: true, subjectName: true, subjectCode: true } },
            teacher: { select: { id: true, teacherName: true, email: true } }
          }
        }
      },
      orderBy: [
        { level: 'asc' },
        { grade: 'asc' },
        { className: 'asc' }
      ]
    });

    // Fallback: If filtered classes is empty, query all classes across all years
    if (classes.length === 0) {
      classes = await prisma.class.findMany({
        include: {
          campus: true,
          academicYear: true,
          teachers: {
            include: { teacher: { select: { id: true, teacherName: true, email: true } } }
          },
          teachingAssignments: {
            include: {
              subject: { select: { id: true, subjectName: true, subjectCode: true } },
              teacher: { select: { id: true, teacherName: true, email: true } }
            }
          }
        },
        orderBy: [
          { level: 'asc' },
          { grade: 'asc' },
          { className: 'asc' }
        ]
      });
    }

    // Load teacher names for homeroomTeacherId lookup
    const allTeachers = await prisma.teacher.findMany({
      select: { id: true, teacherName: true, email: true }
    });
    const teacherMap = new Map(allTeachers.map(t => [t.id, t]));

    const formattedClasses = classes.map(c => {
      const gvcnFromAssignment = (c.teachers || []).find(t => t.roleInClass === 'GVCN')?.teacher;
      const gvcnFromId = c.homeroomTeacherId ? teacherMap.get(c.homeroomTeacherId) : null;
      const homeroomTeacher = gvcnFromAssignment || gvcnFromId || (c.homeroomTeacherId ? { id: c.homeroomTeacherId, teacherName: 'GVCN', email: '' } : null);

      return {
        ...c,
        homeroomTeacher
      };
    });

    return NextResponse.json(formattedClasses);
  } catch (error: any) {
    console.error("Error fetching classes:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
