import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDefaultAcademicYear } from "@/lib/academicYear";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedYearId = searchParams.get("academicYearId");
    const requestedScope = searchParams.get("scope"); // 'HOMEROOM' | 'SUBJECT' | 'ALL'
    const requestedClassId = searchParams.get("classId");

    // 1. Tìm thông tin giáo viên
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: {
        campus: true,
      },
    });

    if (!teacher) {
      return NextResponse.json({
        isTeacher: false,
        error: "Không tìm thấy hồ sơ giáo viên",
      }, { status: 404 });
    }

    // 2. Xác định năm học
    let activeYear = requestedYearId
      ? await prisma.academicYear.findUnique({ where: { id: requestedYearId } })
      : await getDefaultAcademicYear(prisma);

    if (!activeYear) {
      activeYear = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } });
    }
    const academicYearId = activeYear?.id || "";

    // 3. Lấy danh sách lớp chủ nhiệm (GVCN)
    const homeroomClassesRaw = await prisma.class.findMany({
      where: {
        OR: [
          { homeroomTeacherId: teacher.id },
          { homeroomTeacherId: { contains: teacher.id } },
          ...(teacher.homeroomClass ? [{ className: teacher.homeroomClass }] : []),
        ],
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        students: {
          where: {
            NOT: { studentCode: { startsWith: "2" } },
          },
          select: { id: true },
        },
      },
      orderBy: { className: "asc" },
    });

    // 4. Lấy danh sách lớp giảng dạy bộ môn (GVBM)
    const teachingAssignmentsRaw = await prisma.teachingAssignment.findMany({
      where: {
        teacherId: teacher.id,
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        class: {
          include: {
            students: {
              where: {
                NOT: { studentCode: { startsWith: "2" } },
              },
              select: { id: true },
            },
          },
        },
        subject: {
          select: { id: true, subjectName: true, subjectCode: true },
        },
      },
      orderBy: { class: { className: "asc" } },
    });

    const isGVCN = homeroomClassesRaw.length > 0;
    const isGVBM = teachingAssignmentsRaw.length > 0;

    // Chuẩn hóa danh sách lớp
    const homeroomClasses = homeroomClassesRaw.map((c) => ({
      id: c.id,
      className: c.className,
      grade: c.grade,
      studentCount: c.students.length,
      type: "HOMEROOM" as const,
      subjectName: null,
    }));

    const subjectClassesMap = new Map<string, any>();
    teachingAssignmentsRaw.forEach((ta) => {
      if (ta.class) {
        const existing = subjectClassesMap.get(ta.class.id);
        const subjName = ta.subject?.subjectName || "Bộ môn";
        if (!existing) {
          subjectClassesMap.set(ta.class.id, {
            id: ta.class.id,
            className: ta.class.className,
            grade: ta.class.grade,
            studentCount: ta.class.students.length,
            type: "SUBJECT" as const,
            subjects: [subjName],
          });
        } else if (!existing.subjects.includes(subjName)) {
          existing.subjects.push(subjName);
        }
      }
    });

    const subjectClasses = Array.from(subjectClassesMap.values()).map((c) => ({
      id: c.id,
      className: c.className,
      grade: c.grade,
      studentCount: c.studentCount,
      type: "SUBJECT" as const,
      subjectName: c.subjects.join(", "),
    }));

    // Xác định phạm vi xem hiện tại
    const effectiveScope =
      requestedScope && ["HOMEROOM", "SUBJECT", "ALL"].includes(requestedScope)
        ? requestedScope
        : isGVCN
        ? "HOMEROOM"
        : "SUBJECT";

    let availableClasses =
      effectiveScope === "HOMEROOM"
        ? homeroomClasses
        : effectiveScope === "SUBJECT"
        ? subjectClasses
        : [...homeroomClasses, ...subjectClasses];

    if (availableClasses.length === 0) {
      // Fallback: nếu scope được chọn không có lớp thì lấy phạm vi có lớp
      availableClasses = isGVCN ? homeroomClasses : subjectClasses;
    }

    const selectedClass = requestedClassId
      ? availableClasses.find((c) => c.id === requestedClassId) || availableClasses[0] || null
      : availableClasses[0] || null;

    // 5. Thẻ A: TÍN NHIỆM PHHS
    let parentFeedbackKpi = {
      hasData: false,
      statusLabel: "Chưa có kết quả",
      reason: "Chưa có đợt khảo sát PHHS nào được ghi nhận cho lớp phụ trách trong năm học này.",
      periodName: null as string | null,
      periodCode: null as string | null,
      npsScore: null as number | null,
      averageSatisfactionScore: null as number | null,
      submittedCount: 0,
      totalInvited: selectedClass ? selectedClass.studentCount : 0,
      responseRatePercent: null as number | null,
      promotersCount: 0,
      detractorsCount: 0,
      passivesCount: 0,
      detailUrl: "/teacher/surveys",
    };

    if (selectedClass) {
      try {
        const surveyForms = await prisma.surveyForm.findMany({
          where: {
            classId: selectedClass.id,
            status: { in: ["SUBMITTED", "ĐÃ HOÀN THÀNH"] },
            ...(academicYearId ? { academicYearId } : {}),
          },
          include: {
            surveyPeriod: true,
          },
          orderBy: { submissionDateTime: "desc" },
        });

        if (surveyForms.length > 0) {
          const latestPeriod = surveyForms[0].surveyPeriod;
          const periodForms = latestPeriod
            ? surveyForms.filter((f) => f.surveyPeriodId === latestPeriod.id)
            : surveyForms;

          let promoters = 0;
          let detractors = 0;
          let passives = 0;
          let npsCount = 0;
          let totalAvgScore = 0;
          let scoreCount = 0;

          periodForms.forEach((f) => {
            if (f.npsScoreRaw !== null && f.npsScoreRaw !== undefined) {
              const score = f.npsScoreRaw;
              if (score >= 9) promoters++;
              else if (score <= 6) detractors++;
              else passives++;
              npsCount++;
            }
            if (f.overallAverageScore !== null && f.overallAverageScore !== undefined) {
              totalAvgScore += f.overallAverageScore;
              scoreCount++;
            }
          });

          const npsCalculated =
            npsCount > 0 ? Math.round(((promoters - detractors) / npsCount) * 100) : null;
          const avgSat = scoreCount > 0 ? Number((totalAvgScore / scoreCount).toFixed(2)) : null;

          const totalInvited = selectedClass.studentCount;
          const submittedCount = periodForms.length;
          const respRate =
            totalInvited > 0 ? Math.min(100, Math.round((submittedCount / totalInvited) * 100)) : null;

          parentFeedbackKpi = {
            hasData: true,
            statusLabel: "Đã có kết quả khảo sát",
            reason: "",
            periodName: latestPeriod?.name || "Khảo sát ý kiến Phụ huynh",
            periodCode: latestPeriod?.code || null,
            npsScore: npsCalculated,
            averageSatisfactionScore: avgSat,
            submittedCount,
            totalInvited,
            responseRatePercent: respRate,
            promotersCount: promoters,
            detractorsCount: detractors,
            passivesCount: passives,
            detailUrl: "/teacher/surveys",
          };
        }
      } catch (e) {
        console.error("Error loading Parent NPS KPI:", e);
      }
    }

    // 6. Thẻ B: KHẢO SÁT HỌC SINH (NPS Tự hào Học sinh SKL - IP2.1)
    let studentSurveyKpi = {
      hasData: false,
      statusLabel: "Chưa có kết quả",
      surveyName: "NPS Tự hào Học sinh SKL",
      frameworkCode: "IP2.1",
      note: "Phản hồi về mức độ tự hào & trải nghiệm học đường của học sinh tại Sky-Line (IP2.1). Không dùng làm điểm đánh giá cá nhân giáo viên.",
      reason: "Chưa có đợt khảo sát tự hào học sinh nào được công bố cho lớp trong năm học này.",
      periodName: null as string | null,
      npsScore: null as number | null,
      responsesCount: 0,
      totalStudents: selectedClass ? selectedClass.studentCount : 0,
      progressPercent: null as number | null,
      detailUrl: "/teacher/nps-tu-hao-skl",
    };

    if (selectedClass) {
      try {
        // Kiểm tra xem bảng reflection_pride_periods có tồn tại không
        const periodCheck = await prisma.$queryRawUnsafe<any[]>(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='reflection_pride_periods'`
        ).catch(() => []);

        if (periodCheck.length > 0) {
          const periods = await prisma.$queryRawUnsafe<any[]>(
            `SELECT * FROM "reflection_pride_periods" 
             WHERE "academicYearId" = ? OR "academicYearId" IS NULL
             ORDER BY "createdAt" DESC LIMIT 1`,
            academicYearId
          ).catch(() => []);

          if (periods.length > 0) {
            const period = periods[0];
            const responses = await prisma.$queryRawUnsafe<any[]>(
              `SELECT "prideNpsScore" FROM "pride_nps_anonymous_responses"
               WHERE "periodId" = ? AND "classId" = ?`,
              period.id,
              selectedClass.id
            ).catch(() => []);

            if (responses.length > 0) {
              let p = 0;
              let d = 0;
              responses.forEach((r) => {
                const s = Number(r.prideNpsScore);
                if (s >= 9) p++;
                else if (s <= 6) d++;
              });
              const prideNps = Math.round(((p - d) / responses.length) * 100);
              const totalStd = selectedClass.studentCount;
              const prog =
                totalStd > 0 ? Math.min(100, Math.round((responses.length / totalStd) * 100)) : null;

              studentSurveyKpi = {
                hasData: true,
                statusLabel: "Đã có kết quả phản hồi",
                surveyName: period.name || "NPS Tự hào Học sinh SKL",
                frameworkCode: "IP2.1",
                note: "Phản hồi về mức độ tự hào & trải nghiệm học đường của học sinh tại Sky-Line (IP2.1). Không dùng làm điểm đánh giá cá nhân giáo viên.",
                reason: "",
                periodName: period.name,
                npsScore: prideNps,
                responsesCount: responses.length,
                totalStudents: totalStd,
                progressPercent: prog,
                detailUrl: "/teacher/nps-tu-hao-skl",
              };
            } else {
              studentSurveyKpi.periodName = period.name;
              studentSurveyKpi.reason = `Đợt khảo sát "${period.name}" chưa ghi nhận lượt phản hồi nào từ học sinh lớp này.`;
            }
          }
        }
      } catch (e) {
        console.error("Error loading Student Pride KPI:", e);
      }
    }

    return NextResponse.json({
      success: true,
      teacher: {
        id: teacher.id,
        name: teacher.teacherName,
        isGVCN,
        isGVBM,
        isDualRole: isGVCN && isGVBM,
      },
      academicYear: {
        id: activeYear?.id || "",
        name: activeYear?.name || "",
      },
      scope: effectiveScope,
      classes: availableClasses,
      selectedClass,
      parentFeedbackKpi,
      studentSurveyKpi,
    });
  } catch (err: any) {
    console.error("GET /api/teacher/class-kpi error:", err);
    return NextResponse.json(
      { error: err.message || "Lỗi tải dữ liệu KPIs lớp phụ trách" },
      { status: 500 }
    );
  }
}
