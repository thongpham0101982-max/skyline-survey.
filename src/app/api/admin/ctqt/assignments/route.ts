import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { CTQT_LEVEL_CONFIGS, detectCtqtLevel, isCtqtClass } from "@/lib/ctqt/config";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId") || "";
    const semester = parseInt(searchParams.get("semester") || "1", 10);
    const campusId = searchParams.get("campusId") || "";
    const classId = searchParams.get("classId") || "";

    if (!academicYearId) {
      return NextResponse.json({ success: false, error: "Thiếu academicYearId" }, { status: 400 });
    }

    // Load classes
    const classWhere: any = {
      academicYearId,
      status: "ACTIVE",
    };
    if (campusId) classWhere.campusId = campusId;
    if (classId) classWhere.id = classId;

    const allClasses = await prisma.class.findMany({
      where: classWhere,
      include: {
        campus: { select: { id: true, campusCode: true, campusName: true } },
      },
      orderBy: { className: "asc" },
    });

    // Filter CTQT classes
    const ctqtClasses = allClasses.filter(c => isCtqtClass(c.className, c.educationSystem || undefined));

    const classIds = ctqtClasses.map(c => c.id);

    // Fetch existing assignments
    const assignments = await prisma.ctqtTeachingAssignment.findMany({
      where: {
        academicYearId,
        semester,
        classId: { in: classIds },
      },
      include: {
        primaryTeacher: { select: { id: true, teacherName: true, teacherCode: true } },
        delegatedTeacher: { select: { id: true, teacherName: true, teacherCode: true } },
      },
    });

    // Build assignment matrix per class
    const result = ctqtClasses.map(c => {
      const level = detectCtqtLevel(c.className, c.grade, c.level);
      const config = CTQT_LEVEL_CONFIGS[level];
      const classAssignments = assignments.filter(a => a.classId === c.id);

      const subjects = config.subjects.map(s => {
        const found = classAssignments.find(a => a.subjectCode === s.code);
        return {
          code: s.code,
          nameVi: s.nameVi,
          nameEn: s.nameEn,
          primaryTeacherId: found?.primaryTeacherId || null,
          primaryTeacherName: found?.primaryTeacher?.teacherName || null,
          delegatedTeacherId: found?.delegatedTeacherId || null,
          delegatedTeacherName: found?.delegatedTeacher?.teacherName || null,
          assignmentId: found?.id || null,
        };
      });

      return {
        classId: c.id,
        className: c.className,
        campusName: c.campus?.campusName || "",
        campusId: c.campusId,
        level,
        subjects,
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error in CTQT assignments GET:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const { action, academicYearId, semester, assignments, sourceSemester, targetSemester } = body;

    // Action: Clone from source semester to target semester
    if (action === "clone") {
      if (!academicYearId || !sourceSemester || !targetSemester) {
        return NextResponse.json({ success: false, error: "Thiếu thông tin sao chép" }, { status: 400 });
      }

      const sourceAssignments = await prisma.ctqtTeachingAssignment.findMany({
        where: { academicYearId, semester: parseInt(sourceSemester, 10) },
      });

      for (const sa of sourceAssignments) {
        await prisma.ctqtTeachingAssignment.upsert({
          where: {
            academicYearId_semester_classId_subjectCode: {
              academicYearId,
              semester: parseInt(targetSemester, 10),
              classId: sa.classId,
              subjectCode: sa.subjectCode,
            },
          },
          update: {
            primaryTeacherId: sa.primaryTeacherId,
            delegatedTeacherId: sa.delegatedTeacherId,
            status: sa.status,
          },
          create: {
            academicYearId,
            semester: parseInt(targetSemester, 10),
            classId: sa.classId,
            subjectCode: sa.subjectCode,
            primaryTeacherId: sa.primaryTeacherId,
            delegatedTeacherId: sa.delegatedTeacherId,
            status: sa.status,
          },
        });
      }

      return NextResponse.json({ success: true, message: `Đã sao chép thành công ${sourceAssignments.length} phân công sang Học kỳ ${targetSemester}` });
    }

    // Standard save / update assignments
    if (!Array.isArray(assignments) || !academicYearId || !semester) {
      return NextResponse.json({ success: false, error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    for (const item of assignments) {
      const { classId, subjectCode, primaryTeacherId, delegatedTeacherId } = item;
      if (!classId || !subjectCode) continue;

      if (!primaryTeacherId) {
        // Delete assignment if primary teacher is cleared
        await prisma.ctqtTeachingAssignment.deleteMany({
          where: {
            academicYearId,
            semester: parseInt(semester, 10),
            classId,
            subjectCode,
          },
        });
      } else {
        await prisma.ctqtTeachingAssignment.upsert({
          where: {
            academicYearId_semester_classId_subjectCode: {
              academicYearId,
              semester: parseInt(semester, 10),
              classId,
              subjectCode,
            },
          },
          update: {
            primaryTeacherId,
            delegatedTeacherId: delegatedTeacherId || null,
          },
          create: {
            academicYearId,
            semester: parseInt(semester, 10),
            classId,
            subjectCode,
            primaryTeacherId,
            delegatedTeacherId: delegatedTeacherId || null,
          },
        });
      }
    }

    return NextResponse.json({ success: true, message: "Cập nhật phân công giảng dạy & ủy quyền thành công" });
  } catch (error: any) {
    console.error("Error in CTQT assignments POST:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
