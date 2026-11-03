import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

// Helper: Calculate Lesson Overall Result according to Phưong an 1 (Most Frequent / Tần suất nhiều nhất)
function calculateLessonResult(rubricDetailsObj: Record<string, string>, totalCriteria: number, explicitResult?: string): string {
  if (explicitResult && ["TOT", "HOAN_THANH", "CAN_CO_GANG", "CHUA_DANH_GIA"].includes(explicitResult)) {
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

    if (!assignmentId || !lessonId) {
      return NextResponse.json({ error: "Thiếu assignmentId hoặc lessonId" }, { status: 400 });
    }

    // 1. Fetch assignment and verify permissions
    const assignment = await (prisma as any).specialTeachingAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        subject: { select: { id: true, code: true, name: true, color: true } },
        teacher: { select: { id: true, teacherCode: true, teacherName: true, email: true } },
        class: {
          select: {
            id: true,
            classCode: true,
            className: true,
            grade: true,
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
      return NextResponse.json({ error: "Không tìm thấy phân công lớp" }, { status: 404 });
    }

    // RBAC: Check teacher scoping
    const isPrivileged = session.isFullAccess || session.isSuperAdmin || session.isHeadOfAcademic || session.isGDCS || session.isTTCM;
    if (!isPrivileged && session.teacherId && assignment.teacherId !== session.teacherId) {
      return NextResponse.json({ error: "Forbidden: Bạn không được phân công giảng dạy lớp này" }, { status: 403 });
    }

    // 2. Fetch lesson and its criteria
    const lesson = await (prisma as any).specialLesson.findUnique({
      where: { id: lessonId },
      include: {
        topic: { select: { id: true, name: true, code: true } },
        criteria: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });

    if (!lesson) {
      return NextResponse.json({ error: "Không tìm thấy bài học" }, { status: 404 });
    }

    // 3. Fetch existing grade entries
    const existingEntries = await (prisma as any).specialGradeEntry.findMany({
      where: {
        assignmentId,
        lessonId
      },
      include: {
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });

    const entryMap = new Map<string, any>(existingEntries.map((e: any) => [e.studentId, e]));

    // Format students with their criteria evaluations
    let completedCount = 0;
    let draftCount = 0;
    let lockedCount = 0;

    const studentsData = (assignment.class?.students || []).map((st: any) => {
      const entry = entryMap.get(st.id);
      let parsedRubric: Record<string, string> = {};
      if (entry?.rubricDetails) {
        try {
          parsedRubric = JSON.parse(entry.rubricDetails);
        } catch {
          parsedRubric = {};
        }
      }

      if (entry?.status === "LOCKED") lockedCount++;
      else if (entry?.status === "COMPLETED") completedCount++;
      else if (entry?.status === "DRAFT") draftCount++;

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

    // Session status determination
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
      lesson: {
        id: lesson.id,
        lessonName: lesson.lessonName,
        periodIndex: lesson.periodIndex,
        grade: lesson.grade,
        topicName: lesson.topic?.name,
        criteriaCount: lesson.criteria?.length || 0,
        criteria: (lesson.criteria || []).map((c: any) => ({
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
    console.error("[CXXH Gradebook GET Error]:", error);
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
        error: "Phiên đánh giá bài học này đã bị KHÓA. Vui lòng liên hệ Tổ trưởng chuyên môn hoặc Ban Giám hiệu để mở khóa trước khi chỉnh sửa." 
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

      const saved = await (prisma as any).specialGradeEntry.upsert({
        where: {
          assignmentId_studentId_lessonId_evalScope: {
            assignmentId,
            studentId,
            lessonId,
            evalScope: "LESSON"
          }
        },
        create: {
          assignmentId,
          studentId,
          lessonId,
          evalScope: "LESSON",
          evalResult: calculatedResult,
          rubricDetails: rubricStr,
          teacherFeedback: teacherFeedback || null,
          attendanceStatus,
          status,
          lastUpdatedById: session.userId
        },
        update: {
          evalResult: calculatedResult,
          rubricDetails: rubricStr,
          teacherFeedback: teacherFeedback || null,
          attendanceStatus,
          status,
          lastUpdatedById: session.userId
        }
      });

      // Audit Log
      await (prisma as any).specialGradeAudit.create({
        data: {
          gradeEntryId: saved.id,
          actorUserId: session.userId,
          action: status === "COMPLETED" ? "COMPLETE_EVALUATION" : "SAVE_DRAFT",
          newValue: calculatedResult,
          reason: actionReason || (status === "COMPLETED" ? "Hoàn tất đánh giá bài học" : "Lưu nháp đánh giá")
        }
      });

      savedEntries.push(saved);
    }

    return NextResponse.json({
      success: true,
      message: status === "COMPLETED" 
        ? `Đã hoàn tất đánh giá thành công ${savedEntries.length} học sinh` 
        : `Đã lưu nháp thành công ${savedEntries.length} học sinh`,
      savedCount: savedEntries.length,
      status
    });
  } catch (error: any) {
    console.error("[CXXH Gradebook POST Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
