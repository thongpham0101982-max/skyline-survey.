import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { resolveAccountGradebookScope } from "@/lib/gradebook/subjectPermissions";
import {
  compareCtqtClasses,
  extractCtqtGradeNumber,
  isCtqtClass,
} from "@/lib/ctqt/config";
import {
  CtqtPeriodicCode,
  generateCtqtPeriodicWorkbook,
  getCtqtPeriodicMeta,
  normalizeSubjectCode,
} from "@/lib/ctqt/periodicExportService";

function parseBoolParam(val: string | null, defaultValue: boolean): boolean {
  if (val === null || val === undefined || val === "") return defaultValue;
  return val === "1" || val.toLowerCase() === "true";
}

function sanitizeFileSegment(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const academicYearId = (searchParams.get("academicYearId") || "").trim();
    const campusId = (searchParams.get("campusId") || "").trim();
    const periodParam = (searchParams.get("period") || "HK1").trim().toUpperCase();
    const gradesParam = (searchParams.get("grades") || "").trim();
    const subjectsParam = (searchParams.get("subjects") || "").trim();

    const includeOverview = parseBoolParam(searchParams.get("includeOverview"), true);
    const includeSummary = parseBoolParam(searchParams.get("includeSummary"), true);
    const includeComments = parseBoolParam(searchParams.get("includeComments"), true);
    const includeCompetencies = parseBoolParam(searchParams.get("includeCompetencies"), false);
    const includeAllScoreCols = parseBoolParam(searchParams.get("includeAllCols"), false);

    if (!academicYearId) {
      return NextResponse.json({ success: false, error: "Thiếu năm học (academicYearId)" }, { status: 400 });
    }

    const periodMeta = getCtqtPeriodicMeta(periodParam);

    const parsedGrades = gradesParam
      ? gradesParam
          .split(",")
          .map(s => parseInt(s.trim(), 10))
          .filter(n => !isNaN(n) && n >= 1 && n <= 12)
      : [];

    let requestedSubjects = subjectsParam
      ? subjectsParam
          .split(",")
          .map(s => normalizeSubjectCode(s))
          .filter(Boolean)
      : [];

    // Enforce subject-scoped permissions if applicable
    const scope = await resolveAccountGradebookScope(
      (session.user as any)?.id,
      (session.user as any)?.role,
      academicYearId
    );

    if (scope.isSubjectScoped && scope.allowedCtqtSubjectCodes.length > 0) {
      const allowedSet = new Set(scope.allowedCtqtSubjectCodes.map(normalizeSubjectCode));
      if (requestedSubjects.length > 0) {
        requestedSubjects = requestedSubjects.filter(code => allowedSet.has(code));
      } else {
        requestedSubjects = Array.from(allowedSet);
      }
      if (requestedSubjects.length === 0) {
        return NextResponse.json(
          { success: false, error: "Tài khoản không có quyền xuất các môn học đã chọn." },
          { status: 403 }
        );
      }
    }

    const [academicYear, campus, rawClasses] = await Promise.all([
      prisma.academicYear.findUnique({
        where: { id: academicYearId },
        select: { id: true, name: true },
      }),
      campusId && campusId !== "ALL"
        ? prisma.campus.findUnique({
            where: { id: campusId },
            select: { id: true, campusCode: true, campusName: true },
          })
        : Promise.resolve(null),
      prisma.class.findMany({
        where: {
          status: "ACTIVE",
          ...(campusId && campusId !== "ALL" ? { campusId } : {}),
        },
        include: {
          campus: { select: { id: true, campusCode: true, campusName: true } },
        },
        orderBy: { className: "asc" },
      }),
    ]);

    // Filter to CTQT classes matching academicYear (with fallback if class has no yearId) and selected grades
    const ctqtClassesInYear = rawClasses.filter(c => {
      if (!isCtqtClass(c.className, c.educationSystem || undefined, c.level, c.grade)) return false;
      if (c.academicYearId && c.academicYearId !== academicYearId) return false;
      return true;
    });

    const filteredClasses = ctqtClassesInYear
      .filter(c => {
        if (parsedGrades.length === 0) return true;
        const gNum = extractCtqtGradeNumber(c.className, c.grade);
        return parsedGrades.includes(gNum);
      })
      .sort(compareCtqtClasses);

    if (filteredClasses.length === 0) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy lớp CTQT nào phù hợp với bộ lọc cơ sở và khối đã chọn." },
        { status: 404 }
      );
    }

    const classIds = filteredClasses.map(c => c.id);

    // Build subject filter for Prisma (remember DB may store MATH or MAT)
    const prismaSubjectCodes =
      requestedSubjects.length > 0
        ? Array.from(
            new Set(
              requestedSubjects.flatMap(code => (code === "MAT" ? ["MAT", "MATH"] : [code]))
            )
          )
        : undefined;

    const [students, grades, competencies, assignments] = await Promise.all([
      prisma.student.findMany({
        where: {
          classId: { in: classIds },
          status: "ACTIVE",
        },
        select: {
          id: true,
          classId: true,
          studentCode: true,
          studentName: true,
          englishName: true,
          dateOfBirth: true,
          gender: true,
        },
      }),
      prisma.ctqtGradeEntry.findMany({
        where: {
          academicYearId,
          semester: periodMeta.semester,
          classId: { in: classIds },
          ...(prismaSubjectCodes ? { subjectCode: { in: prismaSubjectCodes } } : {}),
        },
        select: {
          classId: true,
          studentId: true,
          subjectCode: true,
          progressScores: true,
          midTermScore: true,
          endTermScore: true,
          gpaScore: true,
          assessmentContentEn: true,
          assessmentContentVi: true,
          ieltsScore: true,
          commentEn: true,
          commentVi: true,
          reviewStatus: true,
        },
      }),
      includeCompetencies
        ? prisma.ctqtCompetencyEntry.findMany({
            where: {
              academicYearId,
              semester: periodMeta.semester,
              classId: { in: classIds },
            },
            select: {
              classId: true,
              studentId: true,
              communication: true,
              collaboration: true,
              responsibility: true,
              criticalThinking: true,
              creativity: true,
              problemSolving: true,
            },
          })
        : Promise.resolve([]),
      prisma.ctqtTeachingAssignment.findMany({
        where: {
          academicYearId,
          semester: periodMeta.semester,
          classId: { in: classIds },
          ...(prismaSubjectCodes ? { subjectCode: { in: prismaSubjectCodes } } : {}),
        },
        select: {
          classId: true,
          subjectCode: true,
          primaryTeacher: { select: { teacherName: true } },
          delegatedTeacher: { select: { teacherName: true } },
        },
      }),
    ]);

    const academicYearName = academicYear?.name || academicYearId;
    const campusLabel = campus ? campus.campusName : "Tất cả Cơ sở";

    const buffer = generateCtqtPeriodicWorkbook({
      academicYearName,
      campusLabel,
      periodCode: periodMeta.code as CtqtPeriodicCode,
      selectedGrades: parsedGrades,
      selectedSubjectCodes: requestedSubjects,
      classes: filteredClasses.map(c => ({
        id: c.id,
        className: c.className,
        grade: c.grade,
        level: c.level,
        campusName: c.campus?.campusName || "",
        campusCode: c.campus?.campusCode || "",
      })),
      students: students
        .filter(s => Boolean(s.classId))
        .map(s => ({
          id: s.id,
          classId: s.classId as string,
          studentCode: s.studentCode,
          studentName: s.studentName,
          englishName: s.englishName,
          dateOfBirth: s.dateOfBirth,
          gender: s.gender,
        })),
      grades,
      competencies,
      assignments: assignments.map(a => ({
        classId: a.classId,
        subjectCode: a.subjectCode,
        primaryTeacherName: a.primaryTeacher?.teacherName || null,
        delegatedTeacherName: a.delegatedTeacher?.teacherName || null,
      })),
      options: {
        includeOverview,
        includeSummary,
        includeComments,
        includeCompetencies,
        includeAllScoreCols,
      },
    });

    const campusPart = campus ? sanitizeFileSegment(campus.campusCode || campus.campusName) : "TatCaCS";
    const gradePart =
      parsedGrades.length > 0
        ? `Khoi${parsedGrades.slice().sort((a, b) => a - b).join("-")}`
        : "TatCaKhoi";
    const subjectPart =
      requestedSubjects.length > 0 && requestedSubjects.length <= 4
        ? requestedSubjects.join("-")
        : requestedSubjects.length > 4
        ? `${requestedSubjects.length}Mon`
        : "TatCaMon";
    const yearPart = sanitizeFileSegment(academicYearName);

    const fileName = `BangDiem_CTQT_${periodMeta.shortLabel}_${campusPart}_${gradePart}_${subjectPart}_${yearPart}.xlsx`;

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("Error in CTQT periodic Excel export GET:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Lỗi hệ thống khi xuất bảng điểm định kỳ" },
      { status: 500 }
    );
  }
}
