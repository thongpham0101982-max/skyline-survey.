import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import {
  getAdminJourneyOverview,
  updateAdminJourneyConfig
} from "@/lib/skyline-journey/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session?.user || !["ADMIN", "DIRECTOR", "PRINCIPAL", "VICE_PRINCIPAL"].includes(session.user.role)) {
      return NextResponse.json({ error: "Không có quyền truy cập quản trị" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId") || undefined;
    const campusId = searchParams.get("campusId") || undefined;
    const grade = searchParams.get("grade") || undefined;

    const data = await getAdminJourneyOverview({
      academicYearId,
      campusId,
      grade
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[GET /api/skyline-journey/admin] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Lỗi tải dữ liệu quản trị Hành trình Sky-Line" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session?.user || !["ADMIN", "DIRECTOR", "PRINCIPAL", "VICE_PRINCIPAL"].includes(session.user.role)) {
      return NextResponse.json({ error: "Không có quyền truy cập quản trị" }, { status: 403 });
    }

    const body = await req.json();
    const res = await updateAdminJourneyConfig(session.user.id, {
      academicYearId: String(body.academicYearId || "ay_2025_2026"),
      grade: String(body.grade || "2"),
      educationSystem: body.educationSystem,
      campusId: body.campusId || null,
      classId: body.classId || null,
      isEnabled: Boolean(body.isEnabled),
      approvalStatus: body.approvalStatus
    });

    return NextResponse.json(res);
  } catch (error: any) {
    if (error?.message === "CANNOT_APPROVE_UNCONFIGURED_GRADE_CURRICULUM") {
      return NextResponse.json(
        {
          error:
            "Khối học này chưa có dữ liệu chương trình game chính thức được nhập nên không thể chuyển sang trạng thái Đã duyệt."
        },
        { status: 400 }
      );
    }
    console.error("[POST /api/skyline-journey/admin] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Lỗi cập nhật cấu hình Hành trình Sky-Line" },
      { status: 500 }
    );
  }
}
