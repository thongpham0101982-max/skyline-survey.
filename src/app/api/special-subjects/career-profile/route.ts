import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { ensureTriPartyTables } from "@/lib/advisory/triparty-sync";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const classId = searchParams.get("classId");
    const grade = searchParams.get("grade");
    const campusId = searchParams.get("campusId");

    // Case 1: Query single student career development history (Khối 6–12)
    if (studentId) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          class: {
            select: {
              id: true,
              className: true,
              classCode: true,
              grade: true,
              campusId: true,
              homeroomTeacherId: true,
              campus: { select: { campusName: true } }
            }
          },
          campus: { select: { id: true, campusName: true } }
        }
      });

      if (!student) {
        return NextResponse.json({ error: "Không tìm thấy học sinh" }, { status: 404 });
      }

      // Fetch career orientations across all academic years
      const careerOrientations = await (prisma as any).studentCareerOrientation.findMany({
        where: { studentId },
        include: {
          academicYear: { select: { id: true, name: true, startDate: true, endDate: true } }
        },
        orderBy: { academicYear: { startDate: "desc" } }
      });

      // Fetch learning commitments
      const commitments = await (prisma as any).studentLearningCommitment.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" }
      });

      // Fetch project experiences
      const projectExperiences = await (prisma as any).studentProjectExperience.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" }
      });

      // Fetch GDHN lesson evaluations across all grades
      const gdhnGrades = await (prisma as any).specialGradeEntry.findMany({
        where: {
          studentId,
          assignment: {
            subject: { code: "GDHN" }
          }
        },
        include: {
          lesson: {
            select: {
              id: true,
              grade: true,
              periodIndex: true,
              lessonName: true,
              topic: { select: { name: true, code: true } }
            }
          },
          assignment: {
            select: {
              academicYearId: true,
              class: { select: { className: true, grade: true } }
            }
          }
        },
        orderBy: [
          { lesson: { grade: "asc" } },
          { lesson: { periodIndex: "asc" } }
        ]
      });

      // Fetch Holland RIASEC Assessment (SKL_PSYCH v2.6.1) as Reference Evidence Only
      await ensureTriPartyTables();
      const hollandRows = await prisma
        .$queryRawUnsafe<any[]>(
          `SELECT * FROM "StudentHollandAssessment" WHERE "studentId" = ? AND "status" = 'COMPLETED' ORDER BY "updatedAt" DESC LIMIT 1`,
          studentId
        )
        .catch(() => []);

      let hollandAssessment: any = null;
      if (hollandRows[0]) {
        const r = hollandRows[0];
        let reportSummary = null;
        try {
          reportSummary = r.reportSummaryJson ? JSON.parse(r.reportSummaryJson) : null;
        } catch {}
        hollandAssessment = {
          id: r.id,
          version: r.version || "SKL_PSYCH v2.6.1",
          hollandCode: r.hollandCode,
          scores: {
            R: Number(r.scoreR || 0),
            I: Number(r.scoreI || 0),
            A: Number(r.scoreA || 0),
            S: Number(r.scoreS || 0),
            E: Number(r.scoreE || 0),
            C: Number(r.scoreC || 0)
          },
          reportSummary,
          studentReflection: r.studentReflection || "",
          advisorReviewNote: r.advisorReviewNote || "",
          submittedAt: r.submittedAt,
          isReferenceEvidenceOnly: true,
          policyNotice:
            "Minh chứng tham khảo Cố vấn học tập — Không tự động quy đổi thành điểm đánh giá Giáo dục hướng nghiệp."
        };
      }

      return NextResponse.json({
        student: {
          id: student.id,
          studentCode: student.studentCode,
          studentName: student.studentName,
          gender: student.gender,
          dob: student.dob,
          class: student.class,
          campus: student.campus
        },
        careerOrientations,
        commitments,
        projectExperiences,
        gdhnGrades,
        hollandAssessment
      });
    }

    // Case 2: Query student list for class or filters (Khối 6–12)
    const studentWhere: any = {
      status: "ACTIVE"
    };

    if (classId && classId !== "ALL") {
      studentWhere.classId = classId;
    } else {
      const classFilters: any = {};
      if (grade && grade !== "ALL") {
        classFilters.grade = grade.toString();
      } else {
        classFilters.grade = { in: ["6", "7", "8", "9", "10", "11", "12"] };
      }
      if (campusId && campusId !== "ALL") {
        classFilters.campusId = campusId;
      }
      studentWhere.class = classFilters;
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        gender: true,
        class: {
          select: {
            id: true,
            className: true,
            grade: true,
            campus: { select: { campusName: true } }
          }
        },
        careerOrientations: {
          take: 1,
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: [
        { class: { grade: "asc" } },
        { class: { className: "asc" } },
        { studentName: "asc" }
      ],
      take: 150
    });

    return NextResponse.json({
      total: students.length,
      students
    });
  } catch (error: any) {
    console.error("[Career Profile GET Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      studentId,
      academicYearId,
      surveyResult,       // Holland RIASEC / Personality / Interests
      initialOrientation, // Student initial goal
      counselingResult,   // Counselor recommendation
      result,             // Final career target summary
      gvcnRemark,
      gvbmRemark,
      status = "DA_TU_VAN",
      notes
    } = body;

    if (!studentId) {
      return NextResponse.json({ error: "Thiếu studentId" }, { status: 400 });
    }

    let yearId = academicYearId;
    if (!yearId) {
      const activeYear = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } });
      yearId = activeYear?.id || "cmnseevbh0000wjbmoigji2zd";
    }

    const existing = await (prisma as any).studentCareerOrientation.findFirst({
      where: {
        studentId,
        academicYearId: yearId
      }
    });

    let record;
    if (existing) {
      record = await (prisma as any).studentCareerOrientation.update({
        where: { id: existing.id },
        data: {
          surveyResult: surveyResult !== undefined ? surveyResult : existing.surveyResult,
          initialOrientation: initialOrientation !== undefined ? initialOrientation : existing.initialOrientation,
          counselingResult: counselingResult !== undefined ? counselingResult : existing.counselingResult,
          result: result !== undefined ? result : existing.result,
          gvcnRemark: gvcnRemark !== undefined ? gvcnRemark : existing.gvcnRemark,
          gvbmRemark: gvbmRemark !== undefined ? gvbmRemark : existing.gvbmRemark,
          status: status !== undefined ? status : existing.status,
          notes: notes !== undefined ? notes : existing.notes,
          updatedAt: new Date()
        }
      });
    } else {
      record = await (prisma as any).studentCareerOrientation.create({
        data: {
          studentId,
          academicYearId: yearId,
          surveyResult: surveyResult || "",
          initialOrientation: initialOrientation || "",
          counselingResult: counselingResult || "",
          result: result || "",
          gvcnRemark: gvcnRemark || "",
          gvbmRemark: gvbmRemark || "",
          status: status || "DA_TU_VAN",
          notes: notes || ""
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật hồ sơ định hướng nghề nghiệp thành công",
      record
    });
  } catch (error: any) {
    console.error("[Career Profile POST Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi lưu hồ sơ hướng nghiệp" }, { status: 500 });
  }
}
