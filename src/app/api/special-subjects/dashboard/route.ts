import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId") || "AY-2026";
    const campusId = searchParams.get("campusId");
    const grade = searchParams.get("grade");
    const subjectId = searchParams.get("subjectId") || "spec_sub_fin_edu";

    // 1. Where clause for assignments
    const assignWhere: any = {
      academicYearId,
      subjectId
    };

    if (campusId && campusId !== "ALL") {
      assignWhere.class = { campusId };
    }
    if (grade && grade !== "ALL") {
      assignWhere.class = { ...(assignWhere.class || {}), grade };
    }

    if (!session.isFullAccess && !session.isSuperAdmin && !session.isHeadOfAcademic && !session.isGDCS && !session.isTTCM) {
      if (session.teacherId) {
        assignWhere.teacherId = session.teacherId;
      }
    } else if (session.isGDCS && session.allowedCampusIds?.length > 0) {
      assignWhere.class = { campusId: { in: session.allowedCampusIds } };
    }

    // 2. Fetch assignments matching filter
    const assignments = await (prisma as any).specialTeachingAssignment.findMany({
      where: assignWhere,
      include: {
        class: {
          select: {
            id: true,
            className: true,
            grade: true,
            campusId: true,
            campus: { select: { campusCode: true, campusName: true } },
            _count: { select: { students: true } }
          }
        },
        teacher: { select: { id: true, teacherName: true } },
        gradeEntries: {
          select: { id: true, evalResult: true, status: true, lessonId: true, studentId: true }
        }
      }
    });

    const totalClasses = assignments.length;
    let totalStudents = 0;
    let totalCompletedEntries = 0;
    let totalDraftEntries = 0;

    const distribution = {
      TOT: 0,
      DAT: 0,
      CAN_CO_GANG: 0
    };

    const studentAlertsMap = new Map();

    for (const a of assignments) {
      totalStudents += a.class._count.students;
      for (const ge of a.gradeEntries) {
        if (ge.status === "COMPLETED") {
          totalCompletedEntries++;
          if (ge.evalResult === "TOT") distribution.TOT++;
          else if (ge.evalResult === "DAT") distribution.DAT++;
          else if (ge.evalResult === "CAN_CO_GANG") {
            distribution.CAN_CO_GANG++;
            // Alert student
            const count = (studentAlertsMap.get(ge.studentId) || 0) + 1;
            studentAlertsMap.set(ge.studentId, count);
          }
        } else if (ge.status === "DRAFT") {
          totalDraftEntries++;
        }
      }
    }

    // Fetch details of students needing support
    const alertStudentIds = Array.from(studentAlertsMap.keys()).slice(0, 15);
    const alertStudents = alertStudentIds.length > 0
      ? await prisma.student.findMany({
          where: { id: { in: alertStudentIds } },
          select: {
            id: true,
            studentCode: true,
            studentName: true,
            class: { select: { className: true } }
          }
        })
      : [];

    const formattedAlerts = alertStudents.map(s => ({
      id: s.id,
      studentCode: s.studentCode,
      studentName: s.studentName,
      className: s.class?.className || "",
      needSupportCount: studentAlertsMap.get(s.id) || 1
    }));

    return NextResponse.json({
      totalClasses,
      totalStudents,
      totalCompletedEntries,
      totalDraftEntries,
      distribution,
      alerts: formattedAlerts,
      assignmentsCount: assignments.length
    });
  } catch (error: any) {
    console.error("[SpecialDashboard GET Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
