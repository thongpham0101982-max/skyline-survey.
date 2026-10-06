import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateCtqtTemplate, parseCtqtExcel } from "@/lib/ctqt/excelService";

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

    if (!classId) {
      return NextResponse.json({ success: false, error: "Thiếu classId" }, { status: 400 });
    }

    const targetClass = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!targetClass) {
      return NextResponse.json({ success: false, error: "Không tìm thấy lớp" }, { status: 404 });
    }

    // Fetch active students
    const students = await prisma.student.findMany({
      where: { classId, status: "ACTIVE" },
      orderBy: { studentName: "asc" },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        englishName: true,
        dateOfBirth: true,
        gender: true,
      },
    });

    const studentIds = students.map(s => s.id);

    // Fetch existing grades & competencies if academicYearId provided
    let existingGrades: any[] = [];
    let existingCompetencies: any[] = [];

    if (academicYearId) {
      existingGrades = await prisma.ctqtGradeEntry.findMany({
        where: {
          classId,
          academicYearId,
          semester,
          studentId: { in: studentIds },
        },
      });

      existingCompetencies = await prisma.ctqtCompetencyEntry.findMany({
        where: {
          classId,
          academicYearId,
          semester,
          studentId: { in: studentIds },
        },
      });
    }

    const subjectCode = searchParams.get("subjectCode") || undefined;

    const buffer = generateCtqtTemplate(
      targetClass.className,
      targetClass.grade,
      targetClass.level,
      students.map(s => ({
        id: s.id,
        studentCode: s.studentCode,
        studentName: s.studentName,
        englishName: s.englishName,
        dateOfBirth: s.dateOfBirth,
        gender: s.gender,
        className: targetClass.className,
      })),
      {
        grades: existingGrades,
        competencies: existingCompetencies,
      },
      subjectCode
    );

    const safeClassName = targetClass.className.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = subjectCode
      ? `${safeClassName}_${subjectCode}_HK${semester}.xlsx`
      : `${safeClassName}_CTQT_HK${semester}.xlsx`;

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("Error in CTQT Excel template GET:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const classId = formData.get("classId") as string;
    const academicYearId = formData.get("academicYearId") as string;
    const semester = parseInt((formData.get("semester") as string) || "1", 10);

    if (!file || !classId || !academicYearId) {
      return NextResponse.json({ success: false, error: "Thiếu file, classId hoặc academicYearId" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel workbook
    const parsed = parseCtqtExcel(buffer);

    // Match students in database by studentCode
    const classStudents = await prisma.student.findMany({
      where: { classId, status: "ACTIVE" },
      select: { id: true, studentCode: true, studentName: true },
    });

    const codeToStudentMap = new Map<string, string>();
    classStudents.forEach(s => {
      codeToStudentMap.set(s.studentCode.trim(), s.id);
    });

    let updatedGradesCount = 0;
    let updatedCompCount = 0;
    let updatedNamesCount = 0;

    // 1. Update English Names
    for (const enItem of parsed.englishNames) {
      const studentId = codeToStudentMap.get(enItem.studentCode);
      if (studentId && enItem.englishName) {
        await prisma.student.update({
          where: { id: studentId },
          data: { englishName: enItem.englishName },
        });
        updatedNamesCount++;
      }
    }

    // 2. Upsert Grades
    for (const g of parsed.grades) {
      const studentId = codeToStudentMap.get(g.studentCode);
      if (!studentId) continue;

      await prisma.ctqtGradeEntry.upsert({
        where: {
          academicYearId_semester_classId_studentId_subjectCode: {
            academicYearId,
            semester,
            classId,
            studentId,
            subjectCode: g.subjectCode,
          },
        },
        update: {
          ...(g.progressScores ? { progressScores: g.progressScores } : {}),
          ...(g.midTermScore !== undefined && g.midTermScore !== null ? { midTermScore: g.midTermScore } : {}),
          ...(g.endTermScore !== undefined && g.endTermScore !== null ? { endTermScore: g.endTermScore } : {}),
          ...(g.gpaScore !== undefined && g.gpaScore !== null ? { gpaScore: g.gpaScore } : {}),
          ...(g.ieltsScore !== undefined && g.ieltsScore !== null ? { ieltsScore: g.ieltsScore } : {}),
          ...(g.commentEn ? { commentEn: g.commentEn } : {}),
          ...(g.commentVi ? { commentVi: g.commentVi } : {}),
        },
        create: {
          academicYearId,
          semester,
          classId,
          studentId,
          subjectCode: g.subjectCode,
          progressScores: g.progressScores || null,
          midTermScore: g.midTermScore || null,
          endTermScore: g.endTermScore || null,
          gpaScore: g.gpaScore || null,
          ieltsScore: g.ieltsScore || null,
          commentEn: g.commentEn || null,
          commentVi: g.commentVi || null,
          reviewStatus: "DRAFT",
        },
      });
      updatedGradesCount++;
    }

    // 3. Upsert Competencies
    for (const c of parsed.competencies) {
      const studentId = codeToStudentMap.get(c.studentCode);
      if (!studentId) continue;

      await prisma.ctqtCompetencyEntry.upsert({
        where: {
          academicYearId_semester_classId_studentId: {
            academicYearId,
            semester,
            classId,
            studentId,
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
          semester,
          classId,
          studentId,
          communication: c.communication || "E",
          collaboration: c.collaboration || "E",
          responsibility: c.responsibility || "E",
          criticalThinking: c.criticalThinking || "E",
          creativity: c.creativity || "E",
          problemSolving: c.problemSolving || "E",
        },
      });
      updatedCompCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Đã nạp thành công: ${updatedGradesCount} bản ghi điểm, ${updatedCompCount} bản ghi năng lực cốt lõi, cập nhật ${updatedNamesCount} tên tiếng Anh.`,
      stats: {
        grades: updatedGradesCount,
        competencies: updatedCompCount,
        englishNames: updatedNamesCount,
      },
    });
  } catch (error: any) {
    console.error("Error in CTQT Excel upload POST:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
