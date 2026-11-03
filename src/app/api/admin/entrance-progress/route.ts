import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getEntranceProgressDashboardData,
  executeEntranceWorkflowAction,
} from "@/lib/entrance-progress/entranceProgressEngine";
import {
  EntranceStageStatus,
  NotificationDeliveryStatus,
  EntranceExceptionType,
} from "@/lib/entrance-progress/constants";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId") || undefined;
    const levelParam = (searchParams.get("level") || "ALL").toUpperCase();
    const level =
      levelParam === "K12" || levelParam === "PRESCHOOL"
        ? (levelParam as "K12" | "PRESCHOOL")
        : "ALL";
    const periodId = searchParams.get("periodId") || undefined;
    const batchId = searchParams.get("batchId") || undefined;
    const campusCode = searchParams.get("campusCode") || undefined;
    const educationSystem = searchParams.get("educationSystem") || undefined;
    const grade = searchParams.get("grade") || undefined;
    const stageNumberRaw = searchParams.get("stageNumber");
    const stageNumber = stageNumberRaw ? parseInt(stageNumberRaw, 10) : undefined;
    const stageStatus = searchParams.get("stageStatus") || undefined;
    const milestoneFilter = searchParams.get("milestoneFilter") || undefined;
    const alertFilter = searchParams.get("alertFilter") || undefined;
    const search = searchParams.get("search") || undefined;

    const data = await getEntranceProgressDashboardData({
      academicYearId,
      level,
      periodId,
      batchId,
      campusCode,
      educationSystem,
      grade,
      stageNumber: stageNumber && !isNaN(stageNumber) ? stageNumber : undefined,
      stageStatus,
      milestoneFilter,
      alertFilter,
      search,
    });

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    console.error("[GET /api/admin/entrance-progress] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Lỗi truy xuất dữ liệu tiến độ khảo sát đầu vào.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = session.user as any;
    const body = await req.json();

    const {
      action = "CONFIRM",
      targetScope = "STUDENT",
      academicYearId,
      isPreschool = false,
      periodId,
      batchId = null,
      studentId,
      studentIds,
      assignmentId = null,
      stageNumber,
      status = "COMPLETED",
      deliveryStatus = "NOT_SENT",
      exceptionType = "NONE",
      admissionResult,
      directorNote,
      documentTypes = [],
      note = null,
    } = body;

    if (!periodId || !stageNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "Thiếu thông tin kỳ khảo sát (periodId) hoặc số thứ tự công đoạn (stageNumber).",
        },
        { status: 400 }
      );
    }

    const resolvedStudentIds: string[] = Array.isArray(studentIds)
      ? studentIds.filter(Boolean)
      : studentId
      ? [studentId]
      : [];

    const result = await executeEntranceWorkflowAction({
      action,
      targetScope,
      academicYearId,
      isPreschool: Boolean(isPreschool),
      periodId,
      batchId,
      studentIds: resolvedStudentIds,
      assignmentId,
      stageNumber: Number(stageNumber),
      status: status as EntranceStageStatus,
      deliveryStatus: deliveryStatus as NotificationDeliveryStatus,
      exceptionType: exceptionType as EntranceExceptionType,
      admissionResult,
      directorNote,
      documentTypes: Array.isArray(documentTypes) ? documentTypes : [],
      note,
      actor: {
        id: user.id || "system",
        fullName: user.fullName || user.name || user.email || "Cán bộ điều hành",
        role: (user.role || "TEACHER").toUpperCase(),
        isSuperAdmin: Boolean(user.isSuperAdmin || (user.role || "").toUpperCase() === "ADMIN"),
      },
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 403 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[POST /api/admin/entrance-progress] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Lỗi xử lý xác nhận công đoạn khảo sát đầu vào.",
      },
      { status: 500 }
    );
  }
}
