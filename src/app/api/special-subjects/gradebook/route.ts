import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Formula 1: Most Frequent / Tần suất đa số
function calculateLessonResult(
  rubricDetailsObj: Record<string, string>,
  totalCriteria: number,
  explicitResult?: string | null
): string {
  if (explicitResult && ["TOT", "HOAN_THANH", "CAN_CO_GANG", "CHUA_DANH_GIA", "VANG"].includes(explicitResult)) {
    // Only trust explicitResult if it's VANG or if rubricDetails is empty; otherwise compute from rubric if rubric exists
    const hasRubricValues = Object.values(rubricDetailsObj || {}).some(v => Boolean(v) && v !== "CHUA_DANH_GIA");
    if (!hasRubricValues || explicitResult === "VANG") {
      return explicitResult;
    }
  }

  const values = Object.values(rubricDetailsObj || {}).filter(v => Boolean(v) && v !== "CHUA_DANH_GIA");
  if (values.length === 0) return "CHUA_DANH_GIA";

  let totCount = 0;
  let hoanThanhCount = 0;
  let canCoGangCount = 0;

  values.forEach(v => {
    if (v === "TOT") totCount++;
    else if (v === "HOAN_THANH" || v === "DAT") hoanThanhCount++;
    else if (v === "CAN_CO_GANG") canCoGangCount++;
  });

  // Rule 1: Nếu từ 50% tiêu chuẩn xếp loại Cần cố gắng -> Cần cố gắng
  const denominator = totalCriteria > 0 ? totalCriteria : values.length;
  if (canCoGangCount > 0 && canCoGangCount >= denominator / 2) {
    return "CAN_CO_GANG";
  }

  // Rule 2: Tần suất Tốt >= Hoàn thành -> Tốt
  if (totCount >= hoanThanhCount && totCount > 0) {
    return "TOT";
  }

  // Rule 3: Còn lại -> Hoàn thành
  if (hoanThanhCount > 0 || totCount > 0) {
    return "HOAN_THANH";
  }

  return "CAN_CO_GANG";
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
          status: "ACTIVE",
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
            educationSystem: true,
            campusId: true,
            academicYearId: true,
            homeroomTeacherId: true,
            campus: { select: { campusCode: true, campusName: true } },
            academicYear: { select: { id: true, name: true } },
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
    const isPrivileged =
      session.isFullAccess ||
      session.isSuperAdmin ||
      session.isHeadOfAcademic ||
      session.isGDCS ||
      session.isTTCM;
    if (!isPrivileged && session.teacherId && assignment.teacherId !== session.teacherId) {
      return NextResponse.json(
        { error: "Forbidden: Bạn không có quyền truy cập sổ đánh giá của lớp này" },
        { status: 403 }
      );
    }

    const classGrade = String(assignment.class.grade || "1").replace(/\D/g, "") || "1";
    const eduSys = String(assignment.class.educationSystem || "HNS").toUpperCase().trim();
    const isGrade1FinEdu = assignment.subject.code === "FIN_EDU" && classGrade === "1";
    const isSystemS = eduSys === "HNS" || eduSys === "S";

    // Requirement 2: Lớp khối 1 chỉ hiển thị chương trình đúng khối và hệ đào tạo S được gán.
    // Không tự động áp dụng TC01S cho hệ khác khi chưa có chương trình tương ứng.
    if (isGrade1FinEdu && !isSystemS) {
      return NextResponse.json({
        assignment: {
          id: assignment.id,
          academicYearId: assignment.academicYearId,
          academicYearName: assignment.class.academicYear?.name || "2026-2027",
          subject: assignment.subject,
          teacher: assignment.teacher,
          class: {
            id: assignment.class.id,
            classCode: assignment.class.classCode,
            className: assignment.class.className,
            grade: classGrade,
            educationSystem: eduSys,
            campus: assignment.class.campus,
            homeroomTeacherId: assignment.class.homeroomTeacherId,
            totalStudents: assignment.class.students?.length || 0
          }
        },
        programCode: null,
        hasDurationConfig: false,
        systemMismatch: true,
        systemMismatchNotice: `Lớp ${assignment.class.className} thuộc hệ đào tạo ${eduSys}. Chương trình Giáo dục Tài chính cá nhân Khối 1 hiện cấu hình cho Hệ đào tạo S (mã chương trình TC01S, sheet KHỐI 1S); chưa áp dụng cho hệ ${eduSys}.`,
        topicsCount: 0,
        lessonsCount: 0,
        totalCriteriaCount: 0,
        lessons: [],
        lesson: null,
        sessionStatus: "NOT_STARTED",
        isLocked: false,
        students: [],
        gradeEntries: []
      });
    }

    // 2. Fetch all curriculum lessons & gradeConfig for this grade and subject
    const lessons = await (prisma as any).specialLesson.findMany({
      where: {
        grade: classGrade,
        version: {
          status: "PUBLISHED",
          curriculum: {
            subjectId: assignment.subjectId
          }
        }
      },
      orderBy: { periodIndex: "asc" },
      include: {
        version: {
          select: {
            id: true,
            versionCode: true,
            gradeConfigs: {
              where: { grade: classGrade },
              take: 1
            }
          }
        },
        topic: { select: { id: true, name: true, code: true, sortOrder: true } },
        criteria: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });

    const gradeConfig = lessons[0]?.version?.gradeConfigs?.[0] || null;
    const versionCode = lessons[0]?.version?.versionCode || "v1.0";
    const hasDurationConfig = Boolean(
      gradeConfig && Number(gradeConfig.totalPeriods) > 0 && Number(gradeConfig.periodMinutes) > 0
    );
    const gNum = parseInt(classGrade, 10) || 1;
    const programCode =
      assignment.subject.code === "FIN_EDU" && gNum >= 1 && gNum <= 5
        ? `TC0${gNum}S`
        : assignment.subject.code === "FIN_EDU"
        ? `TC0${gNum}`
        : `${assignment.subject.code}_K${gNum}`;

    const uniqueTopicIds = new Set(lessons.map((l: any) => l.topicId).filter(Boolean));
    const topicsCount = uniqueTopicIds.size;
    const totalCriteriaCount = lessons.reduce((sum: number, l: any) => sum + (l.criteria?.length || 0), 0);

    const activeLesson = lessonId
      ? lessons.find((l: any) => l.id === lessonId) || lessons[0]
      : lessons[0];

    if (!activeLesson) {
      return NextResponse.json({
        assignment,
        programCode,
        versionCode,
        hasDurationConfig,
        topicsCount: 0,
        lessonsCount: 0,
        totalCriteriaCount: 0,
        lessons: [],
        lesson: null,
        students: [],
        gradeEntries: [],
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
    let totCount = 0;
    let hoanThanhCount = 0;
    let canCoGangCount = 0;
    let absentCount = 0;
    let unassessedCount = 0;

    const studentsData = (assignment.class.students || []).map((st: any) => {
      const entry = entryMap.get(st.id);
      let parsedRubric: Record<string, string> = {};
      if (entry?.rubricDetails) {
        try {
          parsedRubric =
            typeof entry.rubricDetails === "string"
              ? JSON.parse(entry.rubricDetails)
              : entry.rubricDetails;
        } catch {
          parsedRubric = {};
        }
      }

      const attendanceStatus = entry?.attendanceStatus || "PRESENT";
      const isAbsent = attendanceStatus === "ABSENT" || attendanceStatus === "VANG" || entry?.evalResult === "VANG";

      // Distinguish "Chưa nhập" (null / CHUA_DANH_GIA) from "Cần cố gắng" (CAN_CO_GANG)
      // Absent or unassessed students are NEVER automatically given low results.
      const rawEvalResult = entry?.evalResult || null;
      const effectiveEvalResult = isAbsent
        ? "VANG"
        : rawEvalResult && rawEvalResult !== "CHUA_DANH_GIA"
        ? rawEvalResult
        : null;

      const hasAnyInput =
        isAbsent ||
        Boolean(effectiveEvalResult) ||
        Object.values(parsedRubric).some(v => Boolean(v) && v !== "CHUA_DANH_GIA") ||
        Boolean(entry?.teacherFeedback?.trim());

      const effectiveStatus = !hasAnyInput
        ? "NOT_STARTED"
        : entry?.status || "DRAFT";

      if (entry?.status === "LOCKED") lockedCount++;
      else if (effectiveStatus === "COMPLETED") completedCount++;
      else if (effectiveStatus === "DRAFT") draftCount++;

      if (isAbsent) {
        absentCount++;
      } else if (effectiveEvalResult === "TOT") {
        totCount++;
      } else if (effectiveEvalResult === "HOAN_THANH" || effectiveEvalResult === "DAT") {
        hoanThanhCount++;
      } else if (effectiveEvalResult === "CAN_CO_GANG") {
        canCoGangCount++;
      } else {
        unassessedCount++;
      }

      return {
        id: st.id,
        studentId: st.id,
        studentCode: st.studentCode,
        studentName: st.studentName,
        gender: st.gender,
        attendanceStatus: isAbsent ? "ABSENT" : "PRESENT",
        evalResult: effectiveEvalResult,
        rawEvalResult: rawEvalResult || "CHUA_DANH_GIA",
        rubricDetails: parsedRubric,
        teacherFeedback: entry?.teacherFeedback || "",
        status: effectiveStatus,
        entryId: entry?.id || null,
        updatedAt: entry?.updatedAt || null,
        auditLogs: entry?.auditLogs || []
      };
    });

    const isConfigLocked = Boolean(gradeConfig?.isLocked);
    let sessionStatus = "NOT_STARTED";
    if (lockedCount > 0 || isConfigLocked) sessionStatus = "LOCKED";
    else if (completedCount > 0 && completedCount >= studentsData.length - absentCount && studentsData.length > 0)
      sessionStatus = "COMPLETED";
    else if (completedCount > 0 || draftCount > 0) sessionStatus = "DRAFT";

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        academicYearId: assignment.academicYearId,
        academicYearName: assignment.class.academicYear?.name || "2026-2027",
        versionCode,
        programCode,
        subject: assignment.subject,
        teacher: assignment.teacher,
        class: {
          id: assignment.class.id,
          classCode: assignment.class.classCode,
          className: assignment.class.className,
          grade: classGrade,
          educationSystem: eduSys,
          campus: assignment.class.campus,
          homeroomTeacherId: assignment.class.homeroomTeacherId,
          totalStudents: studentsData.length
        }
      },
      programCode,
      versionCode,
      hasDurationConfig,
      systemMismatch: false,
      topicsCount,
      lessonsCount: lessons.length,
      totalCriteriaCount,
      lessons: lessons.map((l: any) => ({
        id: l.id,
        periodIndex: l.periodIndex,
        lessonCode: `${l.topic?.code || programCode}.${String(l.periodIndex).padStart(4, "0")}`,
        lessonName: l.lessonName,
        topicId: l.topic?.id,
        topicCode: l.topic?.code,
        topicName: l.topic?.name,
        hasDurationConfig,
        criteriaCount: l.criteria?.length || 0
      })),
      lesson: {
        id: activeLesson.id,
        lessonCode: `${activeLesson.topic?.code || programCode}.${String(activeLesson.periodIndex).padStart(4, "0")}`,
        lessonName: activeLesson.lessonName,
        periodIndex: activeLesson.periodIndex,
        grade: activeLesson.grade,
        topicId: activeLesson.topic?.id,
        topicCode: activeLesson.topic?.code,
        topicName: activeLesson.topic?.name,
        hasDurationConfig,
        criteriaCount: activeLesson.criteria?.length || 0,
        criteria: (activeLesson.criteria || []).map((c: any) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          description: c.description,
          programLevel: c.programLevel || null,
          competencyGroup: c.competencyGroup || "Chung",
          sortOrder: c.sortOrder,
          hasReviewWarning: isGrade1FinEdu && c.code === "TC01S.01.0001.25",
          reviewWarningText:
            isGrade1FinEdu && c.code === "TC01S.01.0001.25"
              ? "Nguồn KHỐI 1S ghi Mức 2 nhưng đánh dấu tại cột Vận dụng (giữ nguyên theo nguồn, cần rà soát)."
              : null
        }))
      },
      stats: {
        totalStudents: studentsData.length,
        totCount,
        hoanThanhCount,
        canCoGangCount,
        absentCount,
        unassessedCount,
        completedCount,
        draftCount,
        lockedCount
      },
      sessionStatus,
      isLocked: sessionStatus === "LOCKED",
      students: studentsData,
      gradeEntries: studentsData.map((s: any) => ({
        id: s.entryId,
        studentId: s.studentId,
        attendanceStatus: s.attendanceStatus,
        evalResult: s.evalResult,
        rubricDetails: s.rubricDetails,
        teacherFeedback: s.teacherFeedback,
        status: s.status,
        updatedAt: s.updatedAt
      }))
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
      action, // Optional: "LOCK" | "UNLOCK"
      assignmentId,
      lessonId,
      status = "DRAFT", // DRAFT | COMPLETED
      entries,
      actionReason
    } = body;

    if (!assignmentId || !lessonId) {
      return NextResponse.json({ error: "Thiếu mã phân công (assignmentId) hoặc bài học (lessonId)" }, { status: 400 });
    }

    // 1. Verify Assignment & Scoping
    const assignment = await (prisma as any).specialTeachingAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        class: {
          select: {
            id: true,
            className: true,
            grade: true,
            educationSystem: true,
            students: {
              where: { status: "ACTIVE" },
              select: { id: true }
            }
          }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: "Không tìm thấy phân công lớp" }, { status: 404 });
    }

    const isPrivileged =
      session.isFullAccess ||
      session.isSuperAdmin ||
      session.isHeadOfAcademic ||
      session.isGDCS ||
      session.isTTCM;

    // Handle LOCK / UNLOCK period action from Admin Monitor
    if (action === "LOCK" || action === "UNLOCK") {
      if (!isPrivileged) {
        return NextResponse.json({ error: "Forbidden: Chỉ Quản trị viên / BGH mới có quyền khóa/mở khóa kỳ đánh giá" }, { status: 403 });
      }

      const targetStatus = action === "LOCK" ? "LOCKED" : "COMPLETED";
      const existingLessonEntries = await (prisma as any).specialGradeEntry.findMany({
        where: { assignmentId, lessonId }
      });

      if (existingLessonEntries.length > 0) {
        await (prisma as any).specialGradeEntry.updateMany({
          where: { assignmentId, lessonId },
          data: {
            status: targetStatus,
            lastUpdatedById: session.userId,
            updatedAt: new Date()
          }
        });
      } else if (action === "LOCK" && assignment.class.students?.length > 0) {
        // Create a lock record on the first student (with CHUA_DANH_GIA) so the lesson session is marked LOCKED without fabricating grades
        const firstStudentId = assignment.class.students[0].id;
        await (prisma as any).specialGradeEntry.create({
          data: {
            assignmentId,
            studentId: firstStudentId,
            lessonId,
            evalScope: "LESSON",
            evalResult: "CHUA_DANH_GIA",
            rubricDetails: "{}",
            teacherFeedback: "",
            attendanceStatus: "PRESENT",
            status: "LOCKED",
            lastUpdatedById: session.userId
          }
        });
      }

      return NextResponse.json({
        success: true,
        isLocked: action === "LOCK",
        sessionStatus: action === "LOCK" ? "LOCKED" : "COMPLETED",
        message: action === "LOCK" ? "Đã khóa kỳ đánh giá bài học" : "Đã mở khóa kỳ đánh giá bài học"
      });
    }

    if (!Array.isArray(entries)) {
      return NextResponse.json({ error: "Dữ liệu danh sách đánh giá (entries) không hợp lệ" }, { status: 400 });
    }

    if (!isPrivileged && session.teacherId && assignment.teacherId !== session.teacherId) {
      return NextResponse.json({ error: "Forbidden: Bạn không có quyền chấm điểm cho lớp này" }, { status: 403 });
    }

    // Check Grade 1 educationSystem S constraint
    const classGrade = String(assignment.class.grade || "1").replace(/\D/g, "") || "1";
    const eduSys = String(assignment.class.educationSystem || "HNS").toUpperCase().trim();
    if (assignment.subject.code === "FIN_EDU" && classGrade === "1" && eduSys !== "HNS" && eduSys !== "S") {
      return NextResponse.json(
        { error: `Lớp ${assignment.class.className} thuộc hệ ${eduSys}, không thuộc phạm vi chương trình TC01S (Hệ đào tạo S).` },
        { status: 400 }
      );
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
      return NextResponse.json(
        {
          error: "Phiên đánh giá bài học này đã bị KHÓA. Vui lòng liên hệ Quản trị viên hoặc BGH để mở khóa."
        },
        { status: 423 }
      );
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

      const cleanRubric: Record<string, string> = {};
      Object.entries(rubricDetails || {}).forEach(([k, v]) => {
        if (v && typeof v === "string" && v !== "CHUA_DANH_GIA") {
          cleanRubric[k] = v;
        }
      });

      const isAbsent = attendanceStatus === "ABSENT" || attendanceStatus === "VANG" || explicitResult === "VANG";
      const rubricStr = JSON.stringify(cleanRubric);
      const calculatedResult = isAbsent
        ? "VANG"
        : calculateLessonResult(cleanRubric, totalCriteria, explicitResult);

      const hasActualInput =
        isAbsent ||
        calculatedResult !== "CHUA_DANH_GIA" ||
        Object.keys(cleanRubric).length > 0 ||
        Boolean(teacherFeedback && teacherFeedback.trim());

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

      // Do not fabricate rows for completely untouched students when saving
      if (!existingEntry && !hasActualInput) {
        continue;
      }

      const rowStatus = !hasActualInput ? "NOT_STARTED" : status;

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
            attendanceStatus: isAbsent ? "ABSENT" : "PRESENT",
            status: rowStatus,
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
              action: existingEntry.status === "DRAFT" && rowStatus === "COMPLETED" ? "SUBMIT_FINAL" : "UPDATE_SCORE",
              oldValue: existingEntry.evalResult || "NONE",
              newValue: calculatedResult,
              reason:
                actionReason ||
                (hasResultChanged
                  ? `Cập nhật kết quả: ${existingEntry.evalResult || "Trống"} -> ${calculatedResult}`
                  : "Lưu kết quả đánh giá")
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
            attendanceStatus: isAbsent ? "ABSENT" : "PRESENT",
            status: rowStatus,
            lastUpdatedById: session.userId
          }
        });

        await (prisma as any).specialGradeAudit.create({
          data: {
            gradeEntryId: entry.id,
            actorUserId: session.userId,
            action: rowStatus === "COMPLETED" ? "SUBMIT_FINAL" : "CREATE_DRAFT",
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
      message:
        status === "COMPLETED"
          ? "Đã lưu và hoàn thành đánh giá bài học"
          : "Đã lưu nháp kết quả thành công",
      savedCount: savedEntries.length,
      sessionStatus: status
    });
  } catch (error: any) {
    console.error("[Universal Gradebook POST Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi lưu kết quả" }, { status: 500 });
  }
}
