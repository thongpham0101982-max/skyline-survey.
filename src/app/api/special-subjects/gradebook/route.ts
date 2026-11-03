import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Formula 1: Most Frequent / Tần suất đa số
function calculateLessonResult(rubricDetailsObj: Record<string, string>, totalCriteria: number, explicitResult?: string): string {
  if (explicitResult && ["TOT", "HOAN_THANH", "CAN_CO_GANG", "CHUA_DANH_GIA", "VANG"].includes(explicitResult)) {
    return explicitResult;
  }

  const values = Object.values(rubricDetailsObj || {}).filter(v => Boolean(v) && v !== "CHUA_DANH_GIA");
  if (values.length === 0) return "CHUA_DANH_GIA";

  let totCount = 0;
  let hoanThanhCount = 0;
  let canCoGangCount = 0;

  values.forEach(v => {
    if (v === "TOT") totCount++;
    else if (v === "HOAN_THANH") hoanThanhCount++;
    else if (v === "CAN_CO_GANG") canCoGangCount++;
  });

  // Rule 1: Nếu từ 50% tiêu chuẩn xếp loại Cần cố gắng -> Cần cố gắng
  if (canCoGangCount >= totalCriteria / 2) {
    return "CAN_CO_GANG";
  }

  // Rule 2: Tần suất Tốt >= Hoàn thành -> Tốt
  if (totCount >= hoanThanhCount && totCount > 0) {
    return "TOT";
  }

  // Rule 3: Còn lại -> Hoàn thành
  return "HOAN_THANH";
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("assignmentId");
    const lessonId = searchParams.get("lessonId");
    const subjectCode = searchParams.get("subjectCode");
    const classId = searchParams.get("classId");

    let resolvedAssignmentId = assignmentId;

    // If assignmentId is not given, find it via subjectCode + classId
    if (!resolvedAssignmentId && subjectCode && classId) {
      const activeYear = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } });
      const assign = await (prisma as any).specialTeachingAssignment.findFirst({
        where: {
          subject: { code: subjectCode.toUpperCase() },
          classId: classId,
          ...(activeYear ? { academicYearId: activeYear.id } : {})
        }
      });
      if (assign) resolvedAssignmentId = assign.id;
    }

    if (!resolvedAssignmentId) {
      return NextResponse.json({ error: "Thiếu mã phân công giảng dạy (assignmentId)" }, { status: 400 });
    }

    // 1. Fetch assignment details
    const assignment = await (prisma as any).specialTeachingAssignment.findUnique({
      where: { id: resolvedAssignmentId },
      include: {
        subject: { select: { id: true, code: true, name: true, color: true, icon: true } },
        teacher: { select: { id: true, teacherCode: true, teacherName: true, email: true } },
        class: {
          select: {
            id: true,
            classCode: true,
            className: true,
            grade: true,
            level: true,
            campusId: true,
            homeroomTeacherId: true,
            campus: { select: { campusCode: true, campusName: true } },
            students: {
              where: { status: "ACTIVE" },
              select: { id: true, studentCode: true, studentName: true, gender: true, status: true },
              orderBy: [{ studentName: "asc" }]
            }
          }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: "Không tìm thấy thông tin phân công" }, { status: 404 });
    }

    // Scoping check
    const isPrivileged = session.isFullAccess || session.isSuperAdmin || session.isHeadOfAcademic || session.isGDCS || session.isTTCM;
    if (!isPrivileged && session.teacherId && assignment.teacherId !== session.teacherId) {
      return NextResponse.json({ error: "Forbidden: Bạn không có quyền truy cập sổ đánh giá của lớp này" }, { status: 403 });
    }

    // 2. Fetch all curriculum lessons for this grade and subject
    const classGrade = assignment.class.grade;
    const lessons = await (prisma as any).specialLesson.findMany({
      where: {
        grade: classGrade.toString(),
        version: {
          curriculum: {
            subjectId: assignment.subjectId
          }
        }
      },
      orderBy: { periodIndex: "asc" },
      include: {
        topic: { select: { id: true, name: true, code: true } },
        criteria: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });

    const activeLesson = lessonId
      ? lessons.find((l: any) => l.id === lessonId) || lessons[0]
      : lessons[0];

    if (!activeLesson) {
      return NextResponse.json({
        assignment,
        lessons: [],
        lesson: null,
        students: [],
        message: `Chưa có bài học cho môn ${assignment.subject.name} - Khối ${classGrade}`
      });
    }

    // 3. Fetch existing grade entries for this lesson & assignment
    const existingEntries = await (prisma as any).specialGradeEntry.findMany({
      where: {
        assignmentId: assignment.id,
        lessonId: activeLesson.id
      },
      include: {
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });

    const entryMap = new Map<string, any>(existingEntries.map((e: any) => [e.studentId, e]));

    let completedCount = 0;
    let draftCount = 0;
    let lockedCount = 0;

    const studentsData = (assignment.class.students || []).map((st: any) => {
      const entry = entryMap.get(st.id);
      let parsedRubric: Record<string, string> = {};
      if (entry?.rubricDetails) {
        try {
          parsedRubric = JSON.parse(entry.rubricDetails);
        } catch {
          parsedRubric = {};
        }
      }

      if (entry?.status === "COMPLETED") completedCount++;
      else if (entry?.status === "DRAFT") draftCount++;
      else if (entry?.status === "LOCKED") lockedCount++;

      return {
        studentId: st.id,
        studentCode: st.studentCode,
        studentName: st.studentName,
        gender: st.gender,
        attendanceStatus: entry?.attendanceStatus || "PRESENT",
        evalResult: entry?.evalResult || null,
        rubricDetails: parsedRubric,
        teacherFeedback: entry?.teacherFeedback || "",
        status: entry?.status || "NOT_STARTED",
        entryId: entry?.id || null,
        updatedAt: entry?.updatedAt || null,
        auditLogs: entry?.auditLogs || []
      };
    });

    let sessionStatus = "NOT_STARTED";
    if (lockedCount > 0) sessionStatus = "LOCKED";
    else if (completedCount > 0 && completedCount === studentsData.length) sessionStatus = "COMPLETED";
    else if (completedCount > 0 || draftCount > 0) sessionStatus = "DRAFT";

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        subject: assignment.subject,
        teacher: assignment.teacher,
        class: {
          id: assignment.class.id,
          classCode: assignment.class.classCode,
          className: assignment.class.className,
          grade: assignment.class.grade,
          campus: assignment.class.campus,
          homeroomTeacherId: assignment.class.homeroomTeacherId,
          totalStudents: studentsData.length
        }
      },
      lessons: lessons.map((l: any) => ({
        id: l.id,
        periodIndex: l.periodIndex,
        lessonName: l.lessonName,
        topicName: l.topic?.name,
        criteriaCount: l.criteria?.length || 0
      })),
      lesson: {
        id: activeLesson.id,
        lessonName: activeLesson.lessonName,
        periodIndex: activeLesson.periodIndex,
        grade: activeLesson.grade,
        topicName: activeLesson.topic?.name,
        criteriaCount: activeLesson.criteria?.length || 0,
        criteria: (activeLesson.criteria || []).map((c: any) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          description: c.description,
          programLevel: c.programLevel || null,
          competencyGroup: c.competencyGroup || "Chung",
          sortOrder: c.sortOrder
        }))
      },
      sessionStatus,
      isLocked: sessionStatus === "LOCKED",
      students: studentsData
    });
  } catch (error: any) {
    console.error("[Universal Gradebook GET Error]:", error);
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
      assignmentId, 
      lessonId, 
      status = "DRAFT", // DRAFT | COMPLETED
      entries,
      actionReason
    } = body;

    if (!assignmentId || !lessonId || !Array.isArray(entries)) {
      return NextResponse.json({ error: "Dữ liệu yêu cầu không hợp lệ" }, { status: 400 });
    }

    // 1. Verify Assignment & Scoping
    const assignment = await (prisma as any).specialTeachingAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        class: { select: { id: true, className: true, grade: true } }
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: "Không tìm thấy phân công lớp" }, { status: 404 });
    }

    const isPrivileged = session.isFullAccess || session.isSuperAdmin || session.isHeadOfAcademic || session.isGDCS || session.isTTCM;
    if (!isPrivileged && session.teacherId && assignment.teacherId !== session.teacherId) {
      return NextResponse.json({ error: "Forbidden: Bạn không có quyền chấm điểm cho lớp này" }, { status: 403 });
    }

    // 2. Fetch lesson criteria count for summary calculation
    const lesson = await (prisma as any).specialLesson.findUnique({
      where: { id: lessonId },
      include: { criteria: true }
    });

    const totalCriteria = lesson?.criteria?.length || 3;

    // 3. Check if session is locked
    const existingLocked = await (prisma as any).specialGradeEntry.findFirst({
      where: {
        assignmentId,
        lessonId,
        status: "LOCKED"
      }
    });

    if (existingLocked && !isPrivileged) {
      return NextResponse.json({ 
        error: "Phiên đánh giá bài học này đã bị KHÓA. Vui lòng liên hệ Quản trị viên hoặc BGH để mở khóa." 
      }, { status: 423 });
    }

    const savedEntries = [];

    // Process each student entry
    for (const item of entries) {
      const {
        studentId,
        rubricDetails = {},
        evalResult: explicitResult,
        teacherFeedback = "",
        attendanceStatus = "PRESENT"
      } = item;

      if (!studentId) continue;

      const rubricStr = JSON.stringify(rubricDetails || {});
      const calculatedResult = attendanceStatus === "ABSENT" 
        ? "VANG" 
        : calculateLessonResult(rubricDetails, totalCriteria, explicitResult);

      const existingEntry = await (prisma as any).specialGradeEntry.findUnique({
        where: {
          assignmentId_studentId_lessonId_evalScope: {
            assignmentId,
            studentId,
            lessonId,
            evalScope: "LESSON"
          }
        }
      });

      let entry;
      if (existingEntry) {
        const hasResultChanged = existingEntry.evalResult !== calculatedResult;
        const hasFeedbackChanged = (existingEntry.teacherFeedback || "") !== teacherFeedback;

        entry = await (prisma as any).specialGradeEntry.update({
          where: { id: existingEntry.id },
          data: {
            evalResult: calculatedResult,
            rubricDetails: rubricStr,
            teacherFeedback,
            attendanceStatus,
            status,
            lastUpdatedById: session.userId,
            updatedAt: new Date()
          }
        });

        // Audit Log
        if (hasResultChanged || (actionReason && hasFeedbackChanged)) {
          await (prisma as any).specialGradeAudit.create({
            data: {
              gradeEntryId: entry.id,
              actorUserId: session.userId,
              action: existingEntry.status === "DRAFT" && status === "COMPLETED" ? "SUBMIT_FINAL" : "UPDATE_SCORE",
              oldValue: existingEntry.evalResult || "NONE",
              newValue: calculatedResult,
              reason: actionReason || (hasResultChanged ? `Cập nhật kết quả: ${existingEntry.evalResult || 'Trống'} -> ${calculatedResult}` : "Lưu kết quả đánh giá")
            }
          });
        }
      } else {
        entry = await (prisma as any).specialGradeEntry.create({
          data: {
            assignmentId,
            studentId,
            lessonId,
            evalScope: "LESSON",
            evalResult: calculatedResult,
            rubricDetails: rubricStr,
            teacherFeedback,
            attendanceStatus,
            status,
            lastUpdatedById: session.userId
          }
        });

        await (prisma as any).specialGradeAudit.create({
          data: {
            gradeEntryId: entry.id,
            actorUserId: session.userId,
            action: status === "COMPLETED" ? "SUBMIT_FINAL" : "CREATE_DRAFT",
            oldValue: null,
            newValue: calculatedResult,
            reason: actionReason || "Đánh giá lần đầu"
          }
        });
      }

      savedEntries.push(entry);
    }

    return NextResponse.json({
      success: true,
      message: status === "COMPLETED" ? "Đã lưu và hoàn thành đánh giá bài học" : "Đã lưu nháp kết quả thành công",
      savedCount: savedEntries.length,
      sessionStatus: status
    });
  } catch (error: any) {
    console.error("[Universal Gradebook POST Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi lưu kết quả" }, { status: 500 });
  }
}
