// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendReportForDepartment } from "@/lib/services/ttcm-report";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roleCode = (session.user as any)?.role || "";
    const isAdmin = [
      "ADMIN",
      "ADMINISTRATOR",
      "KT_DBCL",
      "GDCS",
      "GĐCS",
      "GD_CS",
      "GĐ_CS",
      "GIAO_VU_CS",
      "SUPER_ADMIN",
      "BGH"
    ].includes(roleCode);

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true, position: true, departmentAssignments: true }
    }).catch(() => null);

    const isTTCM =
      currentTeacher?.position === "TTCM" ||
      (currentTeacher?.departmentAssignments || []).some(
        (da: any) => da.position === "TTCM"
      );

    if (!isAdmin && !isTTCM) {
      return NextResponse.json(
        { error: "Bạn không có quyền gửi báo cáo Tổ chuyên môn" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      departmentId,
      academicYearId,
      month,
      ttcmEmail,
      ttcmName,
      customCc,
      notes
    } = body;

    if (!departmentId) {
      return NextResponse.json(
        { error: "Thiếu thông tin Tổ chuyên môn" },
        { status: 400 }
      );
    }

    const host = req.headers.get("host") || "skyline-survey.vercel.app";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      `${protocol}://${host}`;

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
      return NextResponse.json(
        { error: result.error || "Gửi báo cáo thất bại" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Đã gửi email báo cáo thành công cho TTCM ${result.ttcmName || ""} (${result.ttcmEmail || ""})`
    });
  } catch (error: any) {
    console.error("Error in send-ttcm-report route:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
