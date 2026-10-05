import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { CTQT_LEVEL_CONFIGS, detectCtqtLevel } from "@/lib/ctqt/config";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const userId = (session?.user as any)?.id;
    const userRole = ((session?.user as any)?.role || "").toUpperCase();
    const isSuperAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

    let teacher = null;
    if (userId) {
      teacher = await prisma.teacher.findUnique({ where: { userId } });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const academicYearId = searchParams.get("academicYearId") || "";
    const semester = parseInt(searchParams.get("semester") || "1", 10);
    const classId = searchParams.get("classId") || "";
    const subjectCode = searchParams.get("subjectCode") || "";

    // Action 1: Get Teacher CTQT Assignments
    if (action === "getTeacherAssignments") {
      let primaryAssignments: any[] = [];
      let delegatedAssignments: any[] = [];

      if (teacher || isSuperAdmin) {
        const teacherWhere = isSuperAdmin ? {} : { primaryTeacherId: teacher?.id };
        const delegWhere = isSuperAdmin ? {} : { delegatedTeacherId: teacher?.id };

        primaryAssignments = await prisma.ctqtTeachingAssignment.findMany({
          where: {
            ...(academicYearId ? { academicYearId } : {}),
            semester,
            ...teacherWhere,
          },
          include: {
            class: { select: { id: true, className: true, grade: true, level: true } },
            delegatedTeacher: { select: { id: true, teacherName: true } },
          },
        });

        delegatedAssignments = await prisma.ctqtTeachingAssignment.findMany({
          where: {
            ...(academicYearId ? { academicYearId } : {}),
            semester,
            ...delegWhere,
          },
          include: {
            class: { select: { id: true, className: true, grade: true, level: true } },
            primaryTeacher: { select: { id: true, teacherName: true } },
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          teacher: teacher ? { id: teacher.id, teacherName: teacher.teacherName } : null,
          primaryAssignments,
          delegatedAssignments,
        },
      });
    }

    // Action 2: Get Subject Grades for Class
    if (!classId || !subjectCode) {
      return NextResponse.json({ success: false, error: "Thiếu classId hoặc subjectCode" }, { status: 400 });
    }

    const targetClass = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!targetClass) {
      return NextResponse.json({ success: false, error: "Không tìm thấy lớp" }, { status: 404 });
    }

    const level = detectCtqtLevel(targetClass.className, targetClass.grade, targetClass.level);
    const config = CTQT_LEVEL_CONFIGS[level];
    const subjectDef = config.subjects.find(s => s.code === subjectCode);

    const students = await prisma.student.findMany({
      where: { classId, status: "ACTIVE" },
      orderBy: { studentName: "asc" },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        englishName: true,
        gender: true,
        dateOfBirth: true,
      },
    });

    const studentIds = students.map(s => s.id);

    const entries = await prisma.ctqtGradeEntry.findMany({
      where: {
        classId,
        academicYearId,
        semester,
        subjectCode,
        studentId: { in: studentIds },
      },
    });

    const assignment = await prisma.ctqtTeachingAssignment.findFirst({
      where: {
        classId,
        academicYearId,
        semester,
        subjectCode,
      },
      include: {
        primaryTeacher: { select: { id: true, teacherName: true } },
        delegatedTeacher: { select: { id: true, teacherName: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        class: targetClass,
        level,
        subjectDef,
        students,
        entries,
        assignment,
      },
    });
  } catch (error: any) {
    console.error("Error in teacher CTQT grades GET:", error);
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
    const { action, academicYearId, semester, classId, subjectCode, entries } = body;

    if (!academicYearId || !semester || !classId || !subjectCode) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const isSubmitReview = action === "submitReview";
    const nextStatus = isSubmitReview ? "PENDING_REVIEW" : undefined;

    if (Array.isArray(entries) && entries.length > 0) {
      await prisma.$transaction(
        entries.map((e: any) =>
          prisma.ctqtGradeEntry.upsert({
            where: {
              academicYearId_semester_classId_studentId_subjectCode: {
                academicYearId,
                semester: parseInt(semester, 10),
                classId,
                studentId: e.studentId,
                subjectCode,
              },
            },
            update: {
              progressScores: e.progressScores || null,
              midTermScore: e.midTermScore !== undefined && e.midTermScore !== null ? parseFloat(e.midTermScore) : null,
              endTermScore: e.endTermScore !== undefined && e.endTermScore !== null ? parseFloat(e.endTermScore) : null,
              gpaScore: e.gpaScore !== undefined && e.gpaScore !== null ? parseFloat(e.gpaScore) : null,
              assessmentContentEn: e.assessmentContentEn || null,
              assessmentContentVi: e.assessmentContentVi || null,
              ieltsScore: e.ieltsScore !== undefined && e.ieltsScore !== null ? parseFloat(e.ieltsScore) : null,
              commentEn: e.commentEn || null,
              commentVi: e.commentVi || null,
              ...(nextStatus ? { reviewStatus: nextStatus } : {}),
            },
            create: {
              academicYearId,
              semester: parseInt(semester, 10),
              classId,
              studentId: e.studentId,
              subjectCode,
              progressScores: e.progressScores || null,
              midTermScore: e.midTermScore !== undefined && e.midTermScore !== null ? parseFloat(e.midTermScore) : null,
              endTermScore: e.endTermScore !== undefined && e.endTermScore !== null ? parseFloat(e.endTermScore) : null,
              gpaScore: e.gpaScore !== undefined && e.gpaScore !== null ? parseFloat(e.gpaScore) : null,
              assessmentContentEn: e.assessmentContentEn || null,
              assessmentContentVi: e.assessmentContentVi || null,
              ieltsScore: e.ieltsScore !== undefined && e.ieltsScore !== null ? parseFloat(e.ieltsScore) : null,
              commentEn: e.commentEn || null,
              commentVi: e.commentVi || null,
              reviewStatus: nextStatus || "DRAFT",
            },
          })
        )
      );
    }

    return NextResponse.json({
      success: true,
      message: isSubmitReview ? "Đã gửi sổ điểm thành công cho GVTA rà soát" : "Đã lưu nháp sổ điểm thành công",
    });
  } catch (error: any) {
    console.error("Error in teacher CTQT grades POST:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
