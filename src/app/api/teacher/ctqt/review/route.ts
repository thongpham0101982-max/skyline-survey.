import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const userId = (session?.user as any)?.id;
    const userRole = ((session?.user as any)?.role || "").toUpperCase();
    const isSuperAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

    let teacher = null;
    if (userId) {
      teacher = await prisma.teacher.findUnique({ where: { userId } });
    }

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId") || "";
    const semester = parseInt(searchParams.get("semester") || "1", 10);

    const delegWhere = isSuperAdmin ? {} : { delegatedTeacherId: teacher?.id };

    const assignedToReview = await prisma.ctqtTeachingAssignment.findMany({
      where: {
        ...(academicYearId ? { academicYearId } : {}),
        semester,
        ...delegWhere,
      },
      include: {
        class: { select: { id: true, className: true, grade: true } },
        primaryTeacher: { select: { id: true, teacherName: true } },
      },
    });

    return NextResponse.json({ success: true, data: assignedToReview });
  } catch (error: any) {
    console.error("Error in CTQT review GET:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const userId = (session?.user as any)?.id;
    let reviewerName = session?.user?.name || "GVTA Rà soát";
    if (userId) {
      const t = await prisma.teacher.findUnique({ where: { userId } });
      if (t) reviewerName = t.teacherName;
    }

    const body = await req.json();
    const { action, classId, subjectCode, academicYearId, semester, reviewerNote, entries } = body;

    if (!classId || !subjectCode || !academicYearId || !semester) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // 1. If entries (edited comments or translations) are supplied, update them
    if (Array.isArray(entries) && entries.length > 0) {
      for (const e of entries) {
        if (!e.studentId) continue;
        await prisma.ctqtGradeEntry.updateMany({
          where: {
            classId,
            subjectCode,
            academicYearId,
            semester: parseInt(semester, 10),
            studentId: e.studentId,
          },
          data: {
            ...(e.commentEn !== undefined ? { commentEn: e.commentEn } : {}),
            ...(e.commentVi !== undefined ? { commentVi: e.commentVi } : {}),
          },
        });
      }
    }

    // 2. Action: Approve or Request Changes
    const isApprove = action === "approve";
    const newStatus = isApprove ? "APPROVED" : "CHANGES_REQUESTED";

    await prisma.ctqtGradeEntry.updateMany({
      where: {
        classId,
        subjectCode,
        academicYearId,
        semester: parseInt(semester, 10),
      },
      data: {
        reviewStatus: newStatus,
        reviewedBy: reviewerName,
        reviewedAt: new Date(),
        reviewerNote: reviewerNote || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: isApprove
        ? "Đã xác nhận rà soát hoàn tất thành công (APPROVED)"
        : "Đã gửi yêu cầu chỉnh sửa kèm ghi chú cho GVBM",
    });
  } catch (error: any) {
    console.error("Error in CTQT review POST:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
