import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { assignmentId, lessonId, action, reason } = body; // action: 'LOCK' | 'UNLOCK' | 'REQUEST_UNLOCK'

    if (!assignmentId || !lessonId || !action) {
      return NextResponse.json({ error: "Thiếu thông tin yêu cầu" }, { status: 400 });
    }

    const isPrivileged = session.isFullAccess || session.isSuperAdmin || session.isHeadOfAcademic || session.isGDCS || session.isTTCM;

    if ((action === "LOCK" || action === "UNLOCK") && !isPrivileged) {
      return NextResponse.json({ 
        error: "Forbidden: Chỉ Tổ trưởng CM, Giám đốc cơ sở hoặc Quản trị viên mới có quyền Khóa/Mở khóa kỳ đánh giá" 
      }, { status: 403 });
    }

    if (action === "LOCK") {
      const updated = await (prisma as any).specialGradeEntry.updateMany({
        where: { assignmentId, lessonId },
        data: { status: "LOCKED", lastUpdatedById: session.userId }
      });

      if (updated.count === 0) {
        const assign = await (prisma as any).specialTeachingAssignment.findUnique({
          where: { id: assignmentId },
          include: {
            class: {
              include: {
                students: { where: { status: "ACTIVE" }, take: 1, select: { id: true } }
              }
            }
          }
        });
        const firstStudentId = assign?.class?.students?.[0]?.id;
        if (firstStudentId) {
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
      }

      return NextResponse.json({
        success: true,
        message: `Đã khóa kỳ đánh giá bài học`,
        status: "LOCKED"
      });
    }

    if (action === "UNLOCK") {
      const existing = await (prisma as any).specialGradeEntry.findMany({
        where: { assignmentId, lessonId }
      });

      for (const e of existing) {
        const isBlank = (!e.evalResult || e.evalResult === "CHUA_DANH_GIA") && (!e.rubricDetails || e.rubricDetails === "{}") && !e.teacherFeedback;
        await (prisma as any).specialGradeEntry.update({
          where: { id: e.id },
          data: { status: isBlank ? "NOT_STARTED" : "DRAFT", lastUpdatedById: session.userId }
        });
      }

      return NextResponse.json({
        success: true,
        message: `Đã mở khóa kỳ đánh giá bài học`,
        status: "DRAFT"
      });
    }

    if (action === "REQUEST_UNLOCK") {
      const entries = await (prisma as any).specialGradeEntry.findMany({
        where: { assignmentId, lessonId },
        take: 1
      });

      if (entries.length > 0) {
        await (prisma as any).specialGradeAudit.create({
          data: {
            gradeEntryId: entries[0].id,
            actorUserId: session.userId,
            action: "REQUEST_UNLOCK",
            reason: reason || "Giáo viên gửi yêu cầu mở khóa để bổ sung/sửa điểm"
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: "Đã gửi yêu cầu mở khóa đến Tổ trưởng chuyên môn và Ban Giám hiệu"
      });
    }

    return NextResponse.json({ error: "Thao tác không hợp lệ" }, { status: 400 });
  } catch (error: any) {
    console.error("[Special Gradebook Lock Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
