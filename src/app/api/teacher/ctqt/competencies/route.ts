import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

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

    const students = await prisma.student.findMany({
      where: { classId, status: "ACTIVE" },
      orderBy: { studentName: "asc" },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        englishName: true,
      },
    });

    const studentIds = students.map(s => s.id);

    const competencies = await prisma.ctqtCompetencyEntry.findMany({
      where: {
        classId,
        academicYearId,
        semester,
        studentId: { in: studentIds },
      },
    });

    return NextResponse.json({ success: true, data: { students, competencies } });
  } catch (error: any) {
    console.error("Error in CTQT competencies GET:", error);
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
    const { classId, academicYearId, semester, competencies } = body;

    if (!classId || !academicYearId || !semester || !Array.isArray(competencies)) {
      return NextResponse.json({ success: false, error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const evaluatorName = session?.user?.name || "GV Đánh giá";

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
            evaluatedBy: evaluatorName,
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
            evaluatedBy: evaluatorName,
          },
        })
      )
    );

    return NextResponse.json({ success: true, message: "Lưu đánh giá Năng lực cốt lõi thành công" });
  } catch (error: any) {
    console.error("Error in CTQT competencies POST:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
