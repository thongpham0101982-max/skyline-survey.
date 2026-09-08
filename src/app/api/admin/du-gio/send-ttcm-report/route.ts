// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendReportForDepartment } from "@/lib/services/ttcm-report";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roleCode = (session.user as any)?.role || "";
  const isAdmin = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(roleCode);
  
  const currentTeacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    select: { id: true, position: true, departmentAssignments: true }
  }).catch(() => null);

  const isTTCM = currentTeacher?.position === "TTCM" || (currentTeacher?.departmentAssignments || []).some((da: any) => da.position === "TTCM");

  if (!isAdmin && !isTTCM) {
    return NextResponse.json({ error: "Bạn không có quyền thực hiện chức năng này." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { departmentId, academicYearId, month, ttcmEmail, ttcmName, customCc, notes } = body;

    if (!departmentId) {
      return NextResponse.json({ error: "Thiếu thông tin Tổ chuyên môn" }, { status: 400 });
    }

    const host = req.headers.get("host") || "skyline-survey.vercel.app";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;

    const result = await sendReportForDepartment({
      departmentId,
      academicYearId,
      month,
      ttcmEmail,
      ttcmName,
      customCc,
      notes,
      baseUrl
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Gửi email thất bại" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Báo cáo dự giờ đã được gửi thành công đến ${result.ttcmEmail}`
    });

  } catch (error: any) {
    console.error("Error sending TTCM observation report:", error);
    return NextResponse.json({
      error: error.message || "Đã xảy ra lỗi trong quá trình gửi email báo cáo"
    }, { status: 500 });
  }
}
