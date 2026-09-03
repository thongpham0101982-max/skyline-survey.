// @ts-nocheck
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

    // 1. Resolve all matching student IDs for this student (handling transfers/duplicate records)
    let candidateStudentIds: string[] = [];

    if (studentCode) {
      const matching = await prisma.student.findMany({
        where: { studentCode: studentCode.trim() },
        select: { id: true },
      });
      matching.forEach((m) => candidateStudentIds.push(m.id));
    }

    if (studentId) {
      candidateStudentIds.push(studentId);
      // Also look up student's studentCode to include any linked records
      const st = await prisma.student.findUnique({
        where: { id: studentId },
        select: { studentCode: true },
      });
      if (st?.studentCode) {
        const matching = await prisma.student.findMany({
          where: { studentCode: st.studentCode.trim() },
          select: { id: true },
        });
        matching.forEach((m) => candidateStudentIds.push(m.id));
      }
    }

    candidateStudentIds = Array.from(new Set(candidateStudentIds));

    const whereClause: any = {};
    if (candidateStudentIds.length > 0) {
      whereClause.studentId = { in: candidateStudentIds };
    }
    if (academicYearId && academicYearId !== "ALL") {
      whereClause.academicYearId = academicYearId;
    }
    if (assessmentPeriod && assessmentPeriod !== "ALL") {
      whereClause.assessmentPeriod = assessmentPeriod;
    }
    if (classId) {
      whereClause.student = { classId };
    }

    let summaries = await prisma.studentSubjectCompetencySummary.findMany({
      where: whereClause,
      include: {
        subject: { select: { id: true, subjectCode: true, subjectName: true } },
        student: { select: { id: true, studentCode: true, studentName: true } },
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
