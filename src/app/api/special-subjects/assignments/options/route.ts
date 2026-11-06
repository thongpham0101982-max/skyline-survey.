import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get("campusId");
    let academicYearId = searchParams.get("academicYearId");

    // Resolve active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { status: "ACTIVE" }
    });

    if (!academicYearId || academicYearId === "ACTIVE" || academicYearId === "CURRENT") {
      academicYearId = activeYear?.id || "cmnseevbh0000wjbmoigji2zd";
    }

    const [teachers, departments, classesRaw, subjects, academicYears, campusesRaw] = await Promise.all([
      prisma.teacher.findMany({
        where: {
          status: "ACTIVE",
          campusId: campusId && campusId !== "ALL" ? campusId : undefined
        },
        select: {
          id: true,
          teacherCode: true,
          teacherName: true,
          email: true,
          phone: true,
          campusId: true,
          departmentId: true,
          departmentRel: { select: { id: true, code: true, name: true } },
          campus: { select: { campusCode: true, campusName: true } }
        },
        orderBy: { teacherName: "asc" }
      }),
      prisma.department.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, code: true, name: true, blockCM: true },
        orderBy: { name: "asc" }
      }),
      prisma.class.findMany({
        where: {
          status: "ACTIVE",
          academicYearId,
          campusId: campusId && campusId !== "ALL" ? campusId : undefined
        },
        select: {
          id: true,
          classCode: true,
          className: true,
          grade: true,
          educationSystem: true,
          campusId: true,
          homeroomTeacherId: true,
          campus: { select: { campusCode: true, campusName: true } }
        },
        orderBy: [{ grade: "asc" }, { className: "asc" }]
      }),
      (prisma as any).specialSubject.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          code: true,
          name: true,
          color: true,
          curriculums: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              code: true,
              name: true,
              level: true,
              targetGrades: true,
              versions: {
                where: { status: "PUBLISHED" },
                select: { id: true, versionCode: true, status: true }
              }
            }
          }
        }
      }),
      prisma.academicYear.findMany({
        orderBy: { startDate: "desc" },
        select: { id: true, name: true, status: true }
      }),
      prisma.campus.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, campusCode: true, campusName: true, address: true },
        orderBy: { campusCode: "asc" }
      })
    ]);

    // Resolve homeroom teachers for all classes
    const gvcnIds = Array.from(new Set(classesRaw.map(c => c.homeroomTeacherId).filter(Boolean))) as string[];
    const gvcnTeachers = await prisma.teacher.findMany({
      where: { id: { in: gvcnIds } },
      select: {
        id: true,
        teacherCode: true,
        teacherName: true,
        email: true,
        phone: true,
        campusId: true,
        departmentId: true,
        departmentRel: { select: { id: true, code: true, name: true } }
      }
    });
    const gvcnMap = new Map(gvcnTeachers.map(t => [t.id, t]));

    const classes = classesRaw.map(c => ({
      ...c,
      homeroomTeacher: c.homeroomTeacherId ? gvcnMap.get(c.homeroomTeacherId) || null : null
    }));

    const campuses = [
      { code: "ALL", name: "Tất cả cơ sở" },
      ...campusesRaw.map(c => ({
        code: c.id,
        name: `${c.campusCode} - ${c.address ? c.address.trim() : c.campusName}`
      }))
    ];

    return NextResponse.json({
      teachers,
      departments,
      classes,
      subjects,
      academicYears,
      campuses,
      activeAcademicYear: activeYear || { id: academicYearId, name: "2026-2027" }
    });
  } catch (error: any) {
    console.error("[SpecialAssignmentOptions Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
