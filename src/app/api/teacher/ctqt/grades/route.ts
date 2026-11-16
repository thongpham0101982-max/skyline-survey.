import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { CTQT_LEVEL_CONFIGS, detectCtqtLevel } from "@/lib/ctqt/config";

function toNullableFloat(val: any): number | null {
  if (val === undefined || val === null || String(val).trim() === "") return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const userId = (session?.user as any)?.id;
    const userEmail = session?.user?.email || "";
    const userRole = ((session?.user as any)?.role || "").toUpperCase();
    const isSuperAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

    let teacher = null;
    if (userId) {
      teacher = await prisma.teacher.findUnique({ where: { userId } });
    }
    if (!teacher && userEmail) {
      teacher = await prisma.teacher.findFirst({
        where: {
          OR: [{ email: userEmail }, { teacherCode: userEmail.split("@")[0] }],
        },
      });
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

    const semInt = parseInt(String(semester), 10);
    const isSubmitReview = action === "submitReview";
    const nextStatus = isSubmitReview ? "PENDING_REVIEW" : undefined;

    if (Array.isArray(entries) && entries.length > 0) {
      const englishNameUpdates = entries
        .filter((e: any) => e.studentId && e.englishName !== undefined)
        .map((e: any) =>
          prisma.student.update({
            where: { id: e.studentId },
            data: {
              englishName: e.englishName && String(e.englishName).trim() !== "" ? String(e.englishName).trim() : null,
            },
          })
        );

      const gradeUpserts = entries
        .filter((e: any) => Boolean(e.studentId))
        .map((e: any) => {
          const midTermScore = toNullableFloat(e.midTermScore);
          const endTermScore = toNullableFloat(e.endTermScore);
          const gpaScore = toNullableFloat(e.gpaScore);
          const ieltsScore = toNullableFloat(e.ieltsScore);

          return prisma.ctqtGradeEntry.upsert({
            where: {
              academicYearId_semester_classId_studentId_subjectCode: {
                academicYearId,
                semester: semInt,
                classId,
                studentId: e.studentId,
                subjectCode,
              },
            },
            update: {
              progressScores: e.progressScores || null,
              midTermScore,
              endTermScore,
              gpaScore,
              assessmentContentEn: e.assessmentContentEn || null,
              assessmentContentVi: e.assessmentContentVi || null,
              ieltsScore,
              commentEn: e.commentEn || null,
              commentVi: e.commentVi || null,
              ...(nextStatus ? { reviewStatus: nextStatus } : {}),
            },
            create: {
              academicYearId,
              semester: semInt,
              classId,
              studentId: e.studentId,
              subjectCode,
              progressScores: e.progressScores || null,
              midTermScore,
              endTermScore,
              gpaScore,
              assessmentContentEn: e.assessmentContentEn || null,
              assessmentContentVi: e.assessmentContentVi || null,
              ieltsScore,
              commentEn: e.commentEn || null,
              commentVi: e.commentVi || null,
              reviewStatus: nextStatus || "DRAFT",
            },
          });
        });

      const assignmentStatusOps = isSubmitReview
        ? [
            prisma.ctqtTeachingAssignment.updateMany({
              where: {
                academicYearId,
                semester: semInt,
                classId,
                subjectCode,
              },
              data: {
                status: "SUBMITTED",
              },
            }),
          ]
        : [];

      await prisma.$transaction([
        ...englishNameUpdates,
        ...gradeUpserts,
        ...assignmentStatusOps,
      ]);
    }

    return NextResponse.json({
      success: true,
      message: isSubmitReview ? "Đã hoàn tất gửi duyệt sổ điểm môn học" : "Đã lưu sổ điểm môn học thành công",
    });
  } catch (error: any) {
    console.error("Error in teacher CTQT grades POST:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
