import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import {
  assignOrToggleStageByTeacher,
  getTeacherJourneyDashboard,
  reviewStudentStageByTeacher
} from "@/lib/skyline-journey/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId") || undefined;
    const academicYearId = searchParams.get("academicYearId") || undefined;

    const data = await getTeacherJourneyDashboard({
      userId: session.user.id,
      role: session.user.role,
      teacherId: (session.user as any).teacherId || null,
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
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const action = String(body?.action || "").toUpperCase();

    const sessionUser = {
      id: session.user.id,
      role: session.user.role,
      teacherId: (session.user as any).teacherId || null
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
