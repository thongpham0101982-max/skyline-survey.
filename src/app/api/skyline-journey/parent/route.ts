import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { getParentJourneyView } from "@/lib/skyline-journey/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || undefined;

    const data = await getParentJourneyView({
      parentUserId: session.user.id,
      requestedStudentId: studentId
    });

    return NextResponse.json(data);
  } catch (error: any) {
    if (error?.message === "FORBIDDEN_CHILD_ACCESS") {
      return NextResponse.json(
        { error: "Phụ huynh chỉ được xem hành trình của con đã được liên kết với tài khoản." },
        { status: 403 }
      );
    }
    console.error("[GET /api/skyline-journey/parent] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Lỗi tải dữ liệu Hành trình Sky-Line cho Phụ huynh" },
      { status: 500 }
    );
  }
}
