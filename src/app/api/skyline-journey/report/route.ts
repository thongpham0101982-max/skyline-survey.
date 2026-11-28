import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { getFinEduGamificationReport } from "@/lib/skyline-journey/reportService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Không có quyền truy cập báo cáo quản trị" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId") || undefined;
    const level = searchParams.get("level") || undefined;
    const campusId = searchParams.get("campusId") || undefined;
    const grade = searchParams.get("grade") || undefined;
    const classId = searchParams.get("classId") || undefined;

    const data = await getFinEduGamificationReport({
      academicYearId,
      level,
      campusId,
      grade,
      classId
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("[GET /api/skyline-journey/report] Error:", error);
    const msg =
      error instanceof Error
        ? error.message
        : "Lỗi tải báo cáo hoạt động game hóa môn Giáo dục Tài chính";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
