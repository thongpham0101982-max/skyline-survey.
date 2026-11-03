import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { sendAssignmentNotificationEmails } from "@/lib/special-subjects/assignment-mail";

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.isFullAccess && !session.isSuperAdmin && !session.isHeadOfAcademic && !session.isGDCS && !session.isTTCM) {
      return NextResponse.json({ error: "Forbidden: Bạn không có quyền gửi email nhắc phân công" }, { status: 403 });
    }

    const body = await req.json();
    const result = await sendAssignmentNotificationEmails(body);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Đã gửi thành công email nhắc phân công cho ${result.sentCount} giáo viên.` + 
               (result.skippedCount > 0 ? ` (Bỏ qua ${result.skippedCount} GV do thiếu email: ${result.skippedTeachers.slice(0, 3).join(", ")}${result.skippedCount > 3 ? "..." : ""})` : ""),
      ...result
    });
  } catch (error: any) {
    console.error("[SpecialAssignments Notify Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ khi gửi email nhắc phân công" }, { status: 500 });
  }
}
