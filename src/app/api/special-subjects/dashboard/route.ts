import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subjectCode = (searchParams.get("subjectCode") || "FIN_EDU").toUpperCase().trim();
    const campusId = searchParams.get("campusId");
    const grade = searchParams.get("grade");

    const activeYear = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } });
    const academicYearId = activeYear?.id || "cmnseevbh0000wjbmoigji2zd";

    // 1. Fetch Subject
    const subject = await (prisma as any).specialSubject.findFirst({
      where: { code: subjectCode }
    });

    if (!subject) {
      return NextResponse.json({ error: "Không tìm thấy môn học" }, { status: 404 });
    }

    // 2. Fetch Assignments with Class, Students, and GradeEntries
    const assignmentWhere: any = {
      subjectId: subject.id,
      academicYearId
    };

    if (campusId && campusId !== "ALL") {
      assignmentWhere.class = { campusId };
    }
    if (grade && grade !== "ALL") {
      assignmentWhere.class = { ...(assignmentWhere.class || {}), grade: grade.toString() };
    }

    const assignments = await (prisma as any).specialTeachingAssignment.findMany({
      where: assignmentWhere,
      include: {
        teacher: { select: { id: true, teacherName: true, teacherCode: true } },
        class: {
          select: {
            id: true,
            className: true,
            grade: true,
            campusId: true,
            campus: { select: { campusName: true } },
            students: {
              where: { status: "ACTIVE" },
              select: { id: true, studentCode: true, studentName: true }
            }
          }
        },
        gradeEntries: {
          select: {
            id: true,
            studentId: true,
            lessonId: true,
            evalResult: true,
            rubricDetails: true,
            status: true,
            attendanceStatus: true,
            student: {
              select: {
                id: true,
                studentName: true,
                studentCode: true
              }
            }
          }
        },
        teachingLogs: {
          select: {
            id: true,
            lessonId: true,
            status: true,
            taughtDate: true
          }
        }
      }
    });

    // 3. Lessons count by grade
    const lessonsByGrade = await (prisma as any).specialLesson.findMany({
      where: {
        version: {
          curriculum: {
            subjectId: subject.id
          }
        }
      },
      select: {
        id: true,
        grade: true,
        periodIndex: true,
        lessonName: true,
        criteria: {
          select: {
            id: true,
            competencyGroup: true
          }
        }
      }
    });

    const gradeLessonCountMap = new Map<string, number>();
    const criterionCompetencyMap = new Map<string, string[]>();

    lessonsByGrade.forEach((l: any) => {
      const g = l.grade.toString();
      gradeLessonCountMap.set(g, (gradeLessonCountMap.get(g) || 0) + 1);
      (l.criteria || []).forEach((c: any) => {
        const comps: string[] = [];
        const raw = (c.competencyGroup || "").toLowerCase();
        if (raw.includes("hiểu") || raw.includes("hieu")) comps.push("Hiểu");
        if (raw.includes("biết") || raw.includes("biet")) comps.push("Biết");
        if (raw.includes("vận dụng") || raw.includes("van dung")) comps.push("Vận dụng");
        if (comps.length === 0) comps.push("Vận dụng");
        criterionCompetencyMap.set(c.id, comps);
      });
    });

    // 4. Summarize statistics
    let totalStudentsAll = 0;
    let totalGradeEntries = 0;
    let totalCompletedEntries = 0;
    let totalDraftEntries = 0;
    let totCount = 0;
    let hoanThanhCount = 0;
    let canCoGangCount = 0;
    let vangCount = 0;

    // Competency breakdown
    const competencyStats = {
      hieu: { tot: 0, hoanThanh: 0, canCoGang: 0, total: 0 },
      biet: { tot: 0, hoanThanh: 0, canCoGang: 0, total: 0 },
      vanDung: { tot: 0, hoanThanh: 0, canCoGang: 0, total: 0 }
    };

    const studentAlertsMap = new Map<string, any>();

    const classStats = assignments.map((a: any) => {
      const studentCount = a.class.students?.length || 0;
      totalStudentsAll += studentCount;

      const entries = a.gradeEntries || [];
      totalGradeEntries += entries.length;

      const evaluatedStudentIds = new Set<string>();

      let cTot = 0, cHoanThanh = 0, cCanCoGang = 0, cVang = 0;
      entries.forEach((e: any) => {
        if (e.studentId) evaluatedStudentIds.add(e.studentId);

        if (e.status === "COMPLETED" || e.status === "PUBLISHED") {
          totalCompletedEntries++;
        } else {
          totalDraftEntries++;
        }

        if (e.evalResult === "TOT") { totCount++; cTot++; }
        else if (e.evalResult === "HOAN_THANH" || e.evalResult === "DAT") { hoanThanhCount++; cHoanThanh++; }
        else if (e.evalResult === "CAN_CO_GANG") { 
          canCoGangCount++; 
          cCanCoGang++; 
          if (e.student) {
            if (!studentAlertsMap.has(e.student.id)) {
              studentAlertsMap.set(e.student.id, {
                id: e.student.id,
                studentName: e.student.studentName,
                studentCode: e.student.studentCode,
                className: a.class?.className || "N/A",
                grade: a.class?.grade || "N/A",
                campusName: a.class?.campus?.campusName || "N/A",
                needSupportCount: 1,
                reason: "Có tiêu chí đánh giá Cần cố gắng"
              });
            } else {
              studentAlertsMap.get(e.student.id).needSupportCount += 1;
            }
          }
        }
        else if (e.evalResult === "VANG" || e.attendanceStatus === "ABSENT") { 
          vangCount++; 
          cVang++; 
        }

        // Parse rubric details for competency breakdown
        if (e.rubricDetails) {
          try {
            const rubrics = JSON.parse(e.rubricDetails);
            Object.entries(rubrics).forEach(([critId, val]) => {
              const comps = criterionCompetencyMap.get(critId) || ["Vận dụng"];
              comps.forEach((comp: string) => {
                const target = comp === "Hiểu" ? competencyStats.hieu : (comp === "Biết" ? competencyStats.biet : competencyStats.vanDung);
                target.total++;
                if (val === "TOT") target.tot++;
                else if (val === "HOAN_THANH" || val === "DAT") target.hoanThanh++;
                else if (val === "CAN_CO_GANG") target.canCoGang++;
              });
            });
          } catch {}
        }
      });

      const totalLessonsForGrade = gradeLessonCountMap.get(a.class.grade.toString()) || 12;
      
      // Calculate teaching progress (PPCT Completion Rate)
      const taughtLogsCount = (a.teachingLogs || []).filter((l: any) => l.status === "COMPLETED").length;
      // Also check distinct lessons evaluated
      const distinctEvaluatedLessons = new Set(entries.map((e: any) => e.lessonId).filter(Boolean)).size;
      const effectiveTaughtLessons = Math.max(taughtLogsCount, distinctEvaluatedLessons);
      const ppctCompletionRate = Math.min(100, Math.round((effectiveTaughtLessons / totalLessonsForGrade) * 100));

      // Assessment Coverage (% of students with at least 1 entry)
      const coverageRate = studentCount > 0 ? Math.min(100, Math.round((evaluatedStudentIds.size / studentCount) * 100)) : 0;

      return {
        assignmentId: a.id,
        classId: a.class.id,
        className: a.class.className,
        grade: a.class.grade,
        campusName: a.class.campus?.campusName || "N/A",
        teacherName: a.teacher?.teacherName || "Chưa phân công",
        studentCount,
        evaluatedStudentsCount: evaluatedStudentIds.size,
        coverageRate,
        totalLessons: totalLessonsForGrade,
        taughtLessons: effectiveTaughtLessons,
        ppctCompletionRate,
        entryCount: entries.length,
        totCount: cTot,
        datCount: cHoanThanh,
        hoanThanhCount: cHoanThanh,
        canCoGangCount: cCanCoGang,
        vangCount: cVang
      };
    });

    const alerts = Array.from(studentAlertsMap.values()).slice(0, 30);

    // Overall metrics
    const overallPpctRate = classStats.length > 0 
      ? Math.round(classStats.reduce((sum, c) => sum + c.ppctCompletionRate, 0) / classStats.length)
      : 0;

    const overallCoverageRate = totalStudentsAll > 0
      ? Math.round((classStats.reduce((sum, c) => sum + c.evaluatedStudentsCount, 0) / totalStudentsAll) * 100)
      : 0;

    return NextResponse.json({
      subject: {
        id: subject.id,
        code: subject.code,
        name: subject.name,
        color: subject.color
      },
      academicYearId,
      totalClasses: assignments.length,
      totalStudents: totalStudentsAll,
      totalLessons: lessonsByGrade.length,
      totalGradeEntries,
      totalCompletedEntries,
      totalDraftEntries,
      overallPpctRate,
      overallCoverageRate,
      distribution: {
        tot: totCount,
        hoanThanh: hoanThanhCount,
        canCoGang: canCoGangCount,
        vang: vangCount,
        TOT: totCount,
        DAT: hoanThanhCount,
        HOAN_THANH: hoanThanhCount,
        CAN_CO_GANG: canCoGangCount,
        VANG: vangCount
      },
      competencyStats: {
        hieu: {
          ...competencyStats.hieu,
          totRate: competencyStats.hieu.total > 0 ? Math.round((competencyStats.hieu.tot / competencyStats.hieu.total) * 100) : 0,
          datRate: competencyStats.hieu.total > 0 ? Math.round((competencyStats.hieu.hoanThanh / competencyStats.hieu.total) * 100) : 0,
          ccgRate: competencyStats.hieu.total > 0 ? Math.round((competencyStats.hieu.canCoGang / competencyStats.hieu.total) * 100) : 0,
        },
        biet: {
          ...competencyStats.biet,
          totRate: competencyStats.biet.total > 0 ? Math.round((competencyStats.biet.tot / competencyStats.biet.total) * 100) : 0,
          datRate: competencyStats.biet.total > 0 ? Math.round((competencyStats.biet.hoanThanh / competencyStats.biet.total) * 100) : 0,
          ccgRate: competencyStats.biet.total > 0 ? Math.round((competencyStats.biet.canCoGang / competencyStats.biet.total) * 100) : 0,
        },
        vanDung: {
          ...competencyStats.vanDung,
          totRate: competencyStats.vanDung.total > 0 ? Math.round((competencyStats.vanDung.tot / competencyStats.vanDung.total) * 100) : 0,
          datRate: competencyStats.vanDung.total > 0 ? Math.round((competencyStats.vanDung.hoanThanh / competencyStats.vanDung.total) * 100) : 0,
          ccgRate: competencyStats.vanDung.total > 0 ? Math.round((competencyStats.vanDung.canCoGang / competencyStats.vanDung.total) * 100) : 0,
        }
      },
      alerts,
      classStats
    });
  } catch (error: any) {
    console.error("[Special Subject Dashboard Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
