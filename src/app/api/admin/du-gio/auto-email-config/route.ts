// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendReportForDepartment } from "@/lib/services/ttcm-report";

function getLastDayOfMonth(date: Date = new Date()): { dateStr: string; isToday: boolean } {
  // Use Vietnam timezone GMT+7
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const vnDate = new Date(utc + 7 * 3600000);

  const yyyy = vnDate.getFullYear();
  const mm = vnDate.getMonth(); // 0-11
  const lastDay = new Date(yyyy, mm + 1, 0).getDate();

  const isToday = vnDate.getDate() === lastDay;
  const dateStr = `${String(lastDay).padStart(2, "0")}/${String(mm + 1).padStart(2, "0")}/${yyyy}`;

  return { dateStr, isToday };
}

function getCurrentMonthStr(date: Date = new Date()): string {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const vnDate = new Date(utc + 7 * 3600000);
  const yyyy = vnDate.getFullYear();
  const mm = String(vnDate.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roleCode = (session.user as any)?.role || "";
    const isAdmin = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(roleCode);

    if (!isAdmin) {
      return NextResponse.json({ error: "Bạn không có quyền xem cấu hình này" }, { status: 403 });
    }

    // Fetch configs
    const configs = await prisma.assessmentConfig.findMany({
      where: {
        categoryType: "SYSTEM_SETTING",
        code: {
          in: [
            "DU_GIO_AUTO_EMAIL_TTCM_ENABLED",
            "DU_GIO_AUTO_EMAIL_TTCM_LAST_SENT_MONTH",
            "DU_GIO_AUTO_EMAIL_TTCM_LAST_SENT_AT",
            "DU_GIO_AUTO_EMAIL_TTCM_LAST_LOG"
          ]
        }
      }
    });

    const configMap: Record<string, string> = {};
    configs.forEach(c => {
      configMap[c.code] = c.name;
    });

    const enabled = configMap["DU_GIO_AUTO_EMAIL_TTCM_ENABLED"] === "true";
    const lastSentMonth = configMap["DU_GIO_AUTO_EMAIL_TTCM_LAST_SENT_MONTH"] || "";
    const lastSentAt = configMap["DU_GIO_AUTO_EMAIL_TTCM_LAST_SENT_AT"] || "";
    const lastLog = configMap["DU_GIO_AUTO_EMAIL_TTCM_LAST_LOG"] || "";

    const { dateStr: nextRunDate, isToday: isRunDay } = getLastDayOfMonth();
    const currentMonth = getCurrentMonthStr();

    // Fetch active departments and their TTCM for preview
    const departments = await prisma.department.findMany({
      where: { status: "ACTIVE" },
      include: {
        departmentAssignments: {
          where: { position: "TTCM" },
          include: { teacher: true }
        }
      },
      orderBy: { name: "asc" }
    });

    const deptsPreview = departments.map(d => {
      const assignmentTTCM = d.departmentAssignments?.[0]?.teacher;
      return {
        id: d.id,
        name: d.name,
        blockCM: d.blockCM,
        ttcmName: assignmentTTCM?.teacherName || null,
        ttcmEmail: assignmentTTCM?.email || null,
        hasValidEmail: !!(assignmentTTCM?.email && assignmentTTCM.email.includes("@"))
      };
    });

    return NextResponse.json({
      enabled,
      currentMonth,
      nextRunDate,
      isRunDay,
      lastSentMonth,
      lastSentAt,
      lastLog,
      departments: deptsPreview
    });
  } catch (error: any) {
    console.error("GET Auto Email Config Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roleCode = (session.user as any)?.role || "";
    const isAdmin = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(roleCode);

    if (!isAdmin) {
      return NextResponse.json({ error: "Bạn không có quyền thay đổi cấu hình này" }, { status: 403 });
    }

    const body = await req.json();
    const { enabled, triggerNow } = body;

    // If triggerNow is requested, run manual test run for current month
    if (triggerNow) {
      const host = req.headers.get("host") || "skyline-survey.vercel.app";
      const protocol = req.headers.get("x-forwarded-proto") || "https";
      const baseUrl = `${protocol}://${host}`;
      const currentMonth = getCurrentMonthStr();

      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { startDate: "desc" }
      });

      const departments = await prisma.department.findMany({
        where: { status: "ACTIVE" }
      });

      let sentCount = 0;
      let failedCount = 0;
      const details: any[] = [];

      for (const dept of departments) {
        const result = await sendReportForDepartment({
          departmentId: dept.id,
          academicYearId: activeYear?.id,
          month: currentMonth,
          baseUrl,
          notes: "Báo cáo thử nghiệm theo lệnh của Quản trị viên hệ thống."
        });

        if (result.success) {
          sentCount++;
          details.push({ deptName: dept.name, email: result.ttcmEmail, status: "SUCCESS" });
        } else {
          failedCount++;
          details.push({ deptName: dept.name, error: result.error, status: "FAILED" });
        }
      }

      const logSummary = `Chạy thử nghiệm bởi ${session.user.name || session.user.email} lúc ${new Date().toLocaleString("vi-VN")}: Thành công ${sentCount}/${departments.length} Tổ CM`;

      // Update log
      await saveConfig("DU_GIO_AUTO_EMAIL_TTCM_LAST_LOG", logSummary);
      await saveConfig("DU_GIO_AUTO_EMAIL_TTCM_LAST_SENT_AT", new Date().toISOString());

      return NextResponse.json({
        success: true,
        message: `Đã hoàn tất chạy thử: ${sentCount} gửi thành công, ${failedCount} thất bại.`,
        sentCount,
        failedCount,
        total: departments.length,
        details
      });
    }

    // Otherwise, toggle enabled setting
    if (typeof enabled === "boolean") {
      await saveConfig("DU_GIO_AUTO_EMAIL_TTCM_ENABLED", String(enabled));
      return NextResponse.json({
        success: true,
        enabled,
        message: enabled
          ? "Đã BẬT tính năng tự động gửi email báo cáo TTCM vào ngày cuối tháng."
          : "Đã TẮT tính năng tự động gửi email báo cáo TTCM."
      });
    }

    return NextResponse.json({ error: "Tham số không hợp lệ" }, { status: 400 });
  } catch (error: any) {
    console.error("POST Auto Email Config Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi hệ thống" }, { status: 500 });
  }
}

async function saveConfig(code: string, value: string) {
  const existing = await prisma.assessmentConfig.findFirst({
    where: {
      categoryType: "SYSTEM_SETTING",
      code
    }
  });

  if (existing) {
    await prisma.assessmentConfig.update({
      where: { id: existing.id },
      data: { name: value }
    });
  } else {
    await prisma.assessmentConfig.create({
      data: {
        categoryType: "SYSTEM_SETTING",
        code,
        name: value,
        status: "ACTIVE",
        sortOrder: 0
      }
    });
  }
}
