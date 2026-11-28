import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  assignOrToggleStageByTeacher,
  getTeacherJourneyDashboard,
  reviewStudentStageByTeacher
} from "@/lib/skyline-journey/service";

export const dynamic = "force-dynamic";

const ADMIN_ALLOWED_ROLES = new Set([
  "ADMIN",
  "ADMINISTRATOR",
  "SUPER_ADMIN",
  "SUPERADMIN",
  "DIRECTOR",
  "PRINCIPAL",
  "VICE_PRINCIPAL",
  "KT_DBCL",
  "KTDBCL",
  "KHAO_THI"
]);

async function assertSpecialSubjectTeacherOrAdmin(session: Awaited<ReturnType<typeof getAdminSession>>) {
  const upperRole = String(session.role || "").toUpperCase().trim();
  const isAdmin =
    Boolean(session.isSuperAdmin) ||
    Boolean(session.isFullAccess) ||
    ADMIN_ALLOWED_ROLES.has(upperRole);

  if (isAdmin) {
    return { allowed: true as const, teacherId: session.teacherId || null, isAdmin: true };
  }

  let teacherId = session.teacherId || null;
  if (!teacherId && session.userId) {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.userId },
      select: { id: true }
    });
    teacherId = teacher?.id || null;
  }

  if (!teacherId) {
    return { allowed: false as const, teacherId: null, isAdmin: false };
  }

  const activeSpecialCount = await prisma.specialTeachingAssignment.count({
    where: {
      teacherId,
      status: "ACTIVE"
    }
  });

  return {
    allowed: activeSpecialCount > 0,
    teacherId,
    isAdmin: false
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const access = await assertSpecialSubjectTeacherOrAdmin(session);
    if (!access.allowed) {
      return NextResponse.json(
        { error: "Tính năng Hành trình Sky-Line chỉ dành cho GVBM được phân công dạy học các môn đặc thù." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId") || undefined;
    const academicYearId = searchParams.get("academicYearId") || undefined;

    const data = await getTeacherJourneyDashboard({
      userId: session.userId,
      role: access.isAdmin ? "ADMIN" : session.role,
      teacherId: access.teacherId,
      classId,
      academicYearId
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[GET /api/skyline-journey/teacher] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Lỗi tải dữ liệu quản lý Hành trình Sky-Line" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const access = await assertSpecialSubjectTeacherOrAdmin(session);
    if (!access.allowed) {
      return NextResponse.json(
        { error: "Tính năng Hành trình Sky-Line chỉ dành cho GVBM được phân công dạy học các môn đặc thù." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const action = String(body?.action || "").toUpperCase();

    const sessionUser = {
      id: session.userId,
      role: access.isAdmin ? "ADMIN" : session.role,
      teacherId: access.teacherId
    };

    if (action === "TOGGLE_STAGE") {
      const res = await assignOrToggleStageByTeacher(sessionUser, {
        classId: String(body.classId || ""),
        lessonCode: String(body.lessonCode || ""),
        isUnlocked: Boolean(body.isUnlocked),
        customGuidance: body.customGuidance,
        dueDate: body.dueDate
      });
      return NextResponse.json(res);
    }

    if (action === "REVIEW_STUDENT") {
      const res = await reviewStudentStageByTeacher(sessionUser, {
        studentId: String(body.studentId || ""),
        lessonCode: String(body.lessonCode || ""),
        decision: body.decision === "REQUEST_REVISION" ? "REQUEST_REVISION" : "CONFIRM",
        teacherFeedback: String(body.teacherFeedback || ""),
        syncToGradeEntry: Boolean(body.syncToGradeEntry)
      });
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
  } catch (error: any) {
    if (error?.message === "FORBIDDEN_TEACHER_CLASS_SCOPE") {
      return NextResponse.json(
        { error: "Thầy/cô chỉ được phép thao tác trên lớp/môn học được phân công." },
        { status: 403 }
      );
    }
    console.error("[POST /api/skyline-journey/teacher] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Không thể cập nhật trạng thái chặng" },
      { status: 500 }
    );
  }
}
