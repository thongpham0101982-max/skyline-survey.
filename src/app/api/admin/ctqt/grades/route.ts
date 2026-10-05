import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { detectCtqtLevel, CTQT_LEVEL_CONFIGS, CORE_COMPETENCIES_DEF } from "@/lib/ctqt/config";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const academicYearId = searchParams.get("academicYearId");
    const semester = parseInt(searchParams.get("semester") || "1", 10);

    if (!classId || !academicYearId) {
      return NextResponse.json({ success: false, error: "Thiếu classId hoặc academicYearId" }, { status: 400 });
    }

    const targetClass = await prisma.class.findUnique({
      where: { id: classId },
      include: { campus: true },
    });

    if (!targetClass) {
      return NextResponse.json({ success: false, error: "Không tìm thấy lớp" }, { status: 404 });
    }

    const level = detectCtqtLevel(targetClass.className, targetClass.grade, targetClass.level);
    const config = CTQT_LEVEL_CONFIGS[level];

    // Fetch students of the class
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

    // Fetch grades for these students
    const grades = await prisma.ctqtGradeEntry.findMany({
      where: {
        classId,
        academicYearId,
        semester,
        studentId: { in: studentIds },
      },
    });

    // Fetch competencies for these students
    const competencies = await prisma.ctqtCompetencyEntry.findMany({
      where: {
        classId,
        academicYearId,
        semester,
        studentId: { in: studentIds },
      },
    });

    // Fetch teaching assignments to know teachers and review status
    const assignments = await prisma.ctqtTeachingAssignment.findMany({
      where: {
        classId,
        academicYearId,
        semester,
      },
      include: {
        primaryTeacher: { select: { id: true, teacherName: true } },
        delegatedTeacher: { select: { id: true, teacherName: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        class: {
          id: targetClass.id,
          className: targetClass.className,
          campusName: targetClass.campus?.campusName || "",
          level,
        },
        config,
        students,
        grades,
        competencies,
        assignments,
      },
    });
  } catch (error: any) {
    console.error("Error in CTQT grades GET:", error);
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
    const { action, academicYearId, semester, classId, grades, competencies } = body;

    if (!academicYearId || !semester || !classId) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // Save grades
    if (Array.isArray(grades) && grades.length > 0) {
      await prisma.$transaction(
        grades.map((g: any) =>
          prisma.ctqtGradeEntry.upsert({
            where: {
              academicYearId_semester_classId_studentId_subjectCode: {
                academicYearId,
                semester: parseInt(semester, 10),
                classId,
                studentId: g.studentId,
                subjectCode: g.subjectCode,
              },
            },
            update: {
              progressScores: g.progressScores || null,
              midTermScore: g.midTermScore !== undefined && g.midTermScore !== null ? parseFloat(g.midTermScore) : null,
              endTermScore: g.endTermScore !== undefined && g.endTermScore !== null ? parseFloat(g.endTermScore) : null,
              gpaScore: g.gpaScore !== undefined && g.gpaScore !== null ? parseFloat(g.gpaScore) : null,
              assessmentContentEn: g.assessmentContentEn || null,
              assessmentContentVi: g.assessmentContentVi || null,
              ieltsScore: g.ieltsScore !== undefined && g.ieltsScore !== null ? parseFloat(g.ieltsScore) : null,
              commentEn: g.commentEn || null,
              commentVi: g.commentVi || null,
              ...(g.reviewStatus ? { reviewStatus: g.reviewStatus } : {}),
            },
            create: {
              academicYearId,
              semester: parseInt(semester, 10),
              classId,
              studentId: g.studentId,
              subjectCode: g.subjectCode,
              progressScores: g.progressScores || null,
              midTermScore: g.midTermScore !== undefined && g.midTermScore !== null ? parseFloat(g.midTermScore) : null,
              endTermScore: g.endTermScore !== undefined && g.endTermScore !== null ? parseFloat(g.endTermScore) : null,
              gpaScore: g.gpaScore !== undefined && g.gpaScore !== null ? parseFloat(g.gpaScore) : null,
              assessmentContentEn: g.assessmentContentEn || null,
              assessmentContentVi: g.assessmentContentVi || null,
              ieltsScore: g.ieltsScore !== undefined && g.ieltsScore !== null ? parseFloat(g.ieltsScore) : null,
              commentEn: g.commentEn || null,
              commentVi: g.commentVi || null,
              reviewStatus: g.reviewStatus || "DRAFT",
            },
          })
        )
      );
    }

    // Save competencies
    if (Array.isArray(competencies) && competencies.length > 0) {
      await prisma.$transaction(
        competencies.map((c: any) =>
          prisma.ctqtCompetencyEntry.upsert({
            where: {
              academicYearId_semester_classId_studentId: {
                academicYearId,
                semester: parseInt(semester, 10),
                classId,
                studentId: c.studentId,
              },
            },
            update: {
              communication: c.communication || "E",
              collaboration: c.collaboration || "E",
              responsibility: c.responsibility || "E",
              criticalThinking: c.criticalThinking || "E",
              creativity: c.creativity || "E",
              problemSolving: c.problemSolving || "E",
            },
            create: {
              academicYearId,
              semester: parseInt(semester, 10),
              classId,
              studentId: c.studentId,
              communication: c.communication || "E",
              collaboration: c.collaboration || "E",
              responsibility: c.responsibility || "E",
              criticalThinking: c.criticalThinking || "E",
              creativity: c.creativity || "E",
              problemSolving: c.problemSolving || "E",
            },
          })
        )
      );
    }

    return NextResponse.json({ success: true, message: "Lưu dữ liệu điểm CTQT thành công" });
  } catch (error: any) {
    console.error("Error in CTQT grades POST:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
