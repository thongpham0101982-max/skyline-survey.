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
    const assignmentId = searchParams.get("assignmentId");
    const lessonId = searchParams.get("lessonId");
    const evalScope = searchParams.get("evalScope") || "LESSON";

    if (!assignmentId) {
      return NextResponse.json({ error: "Thiếu mã phân công giảng dạy (assignmentId)" }, { status: 400 });
    }

    // 1. Fetch assignment details
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
            level: true,
            campusId: true,
            campus: { select: { campusCode: true, campusName: true } }
          }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: "Không tìm thấy thông tin phân công" }, { status: 404 });
    }

    // Security check: teacher can only access their own assignment unless admin/manager
    const canAccessAll = session.isFullAccess || session.isSuperAdmin || session.isHeadOfAcademic || session.isGDCS || session.isTTCM;
    if (!canAccessAll && session.teacherId && assignment.teacherId !== session.teacherId) {
      return NextResponse.json({ error: "Forbidden: Bạn không có quyền truy cập sổ đánh giá của lớp này" }, { status: 403 });
    }

    // 2. Fetch all curriculum lessons for this grade
    const classGrade = assignment.class.grade;
    const lessons = await (prisma as any).specialLesson.findMany({
      where: {
        grade: classGrade,
        version: {
          curriculum: {
            subjectId: assignment.subjectId
          }
        }
      },
      orderBy: { periodIndex: "asc" },
      include: {
        topic: { select: { id: true, name: true, code: true } }
      }
    });

    // 3. Fetch active students in class
    const students = await prisma.student.findMany({
      where: {
        classId: assignment.classId,
        academicYearId: assignment.academicYearId,
        status: "ACTIVE"
      },
      orderBy: { studentName: "asc" },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        gender: true,
        dateOfBirth: true
      }
    });

    // 4. Fetch grade entries for target lesson / scope
    const targetLessonId = lessonId || (lessons.length > 0 ? lessons[0].id : null);

    const gradeEntries = targetLessonId
      ? await (prisma as any).specialGradeEntry.findMany({
          where: {
            assignmentId,
            lessonId: targetLessonId,
            evalScope
          }
        })
      : [];

    return NextResponse.json({
      assignment,
      lessons,
      selectedLessonId: targetLessonId,
      students,
      gradeEntries
    });
  } catch (error: any) {
    console.error("[SpecialGradebook GET Error]:", error);
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
    const { assignmentId, lessonId, evalScope = "LESSON", isFinalSubmit = false, entries } = body;

    if (!assignmentId || !entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: "Thiếu dữ liệu cập nhật sổ điểm" }, { status: 400 });
    }

    // Verify assignment
    const assignment = await (prisma as any).specialTeachingAssignment.findUnique({
      where: { id: assignmentId }
    });

    if (!assignment) {
      return NextResponse.json({ error: "Không tìm thấy phân công giảng dạy" }, { status: 404 });
    }

    const canAccessAll = session.isFullAccess || session.isSuperAdmin || session.isHeadOfAcademic || session.isGDCS || session.isTTCM;
    if (!canAccessAll && session.teacherId && assignment.teacherId !== session.teacherId) {
      return NextResponse.json({ error: "Forbidden: Bạn không có quyền nhập sổ điểm cho lớp này" }, { status: 403 });
    }

    const targetStatus = isFinalSubmit ? "COMPLETED" : "DRAFT";
    let updatedCount = 0;

    for (const item of entries) {
      if (!item.studentId) continue;

      // Existing check for audit
      const existing = await (prisma as any).specialGradeEntry.findUnique({
        where: {
          assignmentId_studentId_lessonId_evalScope: {
            assignmentId,
            studentId: item.studentId,
            lessonId: lessonId || null,
            evalScope
          }
        }
      });

      // Upsert entry
      const entry = await (prisma as any).specialGradeEntry.upsert({
        where: {
          assignmentId_studentId_lessonId_evalScope: {
            assignmentId,
            studentId: item.studentId,
            lessonId: lessonId || null,
            evalScope
          }
        },
        update: {
          evalResult: item.evalResult || null,
          numericScore: typeof item.numericScore === "number" ? item.numericScore : null,
          rubricDetails: item.rubricDetails ? JSON.stringify(item.rubricDetails) : null,
          teacherFeedback: item.teacherFeedback || null,
          studentProductUrl: item.studentProductUrl || null,
          attendanceStatus: item.attendanceStatus || "PRESENT",
          status: targetStatus,
          lastUpdatedById: session.userId
        },
        create: {
          assignmentId,
          studentId: item.studentId,
          lessonId: lessonId || null,
          evalScope,
          evalResult: item.evalResult || null,
          numericScore: typeof item.numericScore === "number" ? item.numericScore : null,
          rubricDetails: item.rubricDetails ? JSON.stringify(item.rubricDetails) : null,
          teacherFeedback: item.teacherFeedback || null,
          studentProductUrl: item.studentProductUrl || null,
          attendanceStatus: item.attendanceStatus || "PRESENT",
          status: targetStatus,
          lastUpdatedById: session.userId
        }
      });

      // Audit log if modified an already completed entry
      if (existing && existing.status === "COMPLETED" && (existing.evalResult !== item.evalResult || existing.teacherFeedback !== item.teacherFeedback)) {
        await (prisma as any).specialGradeAudit.create({
          data: {
            gradeEntryId: entry.id,
            actorUserId: session.userId,
            action: "UPDATE",
            oldValue: JSON.stringify({ evalResult: existing.evalResult, teacherFeedback: existing.teacherFeedback }),
            newValue: JSON.stringify({ evalResult: item.evalResult, teacherFeedback: item.teacherFeedback }),
            reason: item.editReason || "Cập nhật kết quả đánh giá"
          }
        }).catch(() => {});
      }

      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: isFinalSubmit ? "Đã hoàn tất đánh giá thành công" : "Đã lưu nháp kết quả thành công",
      updatedCount
    });
  } catch (error: any) {
    console.error("[SpecialGradebook POST Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
