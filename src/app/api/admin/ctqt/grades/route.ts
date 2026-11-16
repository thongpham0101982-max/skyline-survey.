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

function toNullableFloat(val: any): number | null {
  if (val === undefined || val === null || String(val).trim() === "") return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

function normalizeReviewStatus(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const upper = String(raw).trim().toUpperCase();
  if (upper === "SUBMITTED") return "PENDING_REVIEW";
  if (upper === "REVISION_REQUESTED") return "CHANGES_REQUESTED";
  return upper;
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

    const semInt = parseInt(String(semester), 10);

    // Save grades
    if (Array.isArray(grades) && grades.length > 0) {
      const englishNameUpdates = grades
        .filter((g: any) => g.studentId && g.englishName !== undefined)
        .map((g: any) =>
          prisma.student.update({
            where: { id: g.studentId },
            data: {
              englishName: g.englishName && String(g.englishName).trim() !== "" ? String(g.englishName).trim() : null,
            },
          })
        );

      await prisma.$transaction([
        ...englishNameUpdates,
        ...grades
          .filter((g: any) => Boolean(g.studentId && g.subjectCode))
          .map((g: any) => {
            const resolvedStatus = normalizeReviewStatus(g.reviewStatus || g.status);
            const midTermScore = toNullableFloat(g.midTermScore);
            const endTermScore = toNullableFloat(g.endTermScore);
            const gpaScore = toNullableFloat(g.gpaScore);
            const ieltsScore = toNullableFloat(g.ieltsScore);

            return prisma.ctqtGradeEntry.upsert({
              where: {
                academicYearId_semester_classId_studentId_subjectCode: {
                  academicYearId,
                  semester: semInt,
                  classId,
                  studentId: g.studentId,
                  subjectCode: g.subjectCode,
                },
              },
              update: {
                progressScores: g.progressScores || null,
                midTermScore,
                endTermScore,
                gpaScore,
                assessmentContentEn: g.assessmentContentEn || null,
                assessmentContentVi: g.assessmentContentVi || null,
                ieltsScore,
                commentEn: g.commentEn || null,
                commentVi: g.commentVi || null,
                ...(resolvedStatus ? { reviewStatus: resolvedStatus } : {}),
              },
              create: {
                academicYearId,
                semester: semInt,
                classId,
                studentId: g.studentId,
                subjectCode: g.subjectCode,
                progressScores: g.progressScores || null,
                midTermScore,
                endTermScore,
                gpaScore,
                assessmentContentEn: g.assessmentContentEn || null,
                assessmentContentVi: g.assessmentContentVi || null,
                ieltsScore,
                commentEn: g.commentEn || null,
                commentVi: g.commentVi || null,
                reviewStatus: resolvedStatus || "DRAFT",
              },
            });
          }),
      ]);
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
