import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
  const user = session?.user;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const studentCode = searchParams.get("studentCode");
    const academicYearId = searchParams.get("academicYearId");
    const assessmentPeriod = searchParams.get("assessmentPeriod");
    const classId = searchParams.get("classId");

    let targetStudentId = studentId;
    if (!targetStudentId && studentCode) {
      const student = await prisma.student.findFirst({
        where: { studentCode },
      });
      if (student) targetStudentId = student.id;
    }

    const whereClause: any = {};
    if (targetStudentId) whereClause.studentId = targetStudentId;
    if (academicYearId) whereClause.academicYearId = academicYearId;
    if (assessmentPeriod) whereClause.assessmentPeriod = assessmentPeriod;
    if (classId) {
      whereClause.student = { classId };
    }

    const summaries = await prisma.studentSubjectCompetencySummary.findMany({
      where: whereClause,
      include: {
        subject: { select: { id: true, subjectCode: true, subjectName: true } },
        student: { select: { id: true, studentCode: true, studentName: true, class: { select: { className: true } } } },
      },
      orderBy: [{ studentId: "asc" }, { subjectId: "asc" }],
    });

    const parsedSummaries = summaries.map((s) => ({
      ...s,
      radarData: s.radarData ? JSON.parse(s.radarData) : [],
    }));

    return NextResponse.json({ success: true, summaries: parsedSummaries });
  } catch (error: any) {
    console.error("Summary query error:", error);
    return NextResponse.json({ error: error.message || "Lỗi truy vấn dữ liệu năng lực" }, { status: 500 });
  }
}