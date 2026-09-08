// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendReportForDepartment } from "@/lib/services/ttcm-report";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Vercel cron or secure secret
    }

    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "true";

    // 1. Fetch enabled config
    const enabledConfig = await prisma.assessmentConfig.findFirst({
      where: {
        categoryType: "SYSTEM_SETTING",
        code: "DU_GIO_AUTO_EMAIL_TTCM_ENABLED"
      }
    });

    const isEnabled = enabledConfig?.name === "true";

    if (!isEnabled && !force) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "Tính năng tự động gửi email báo cáo TTCM đang ở trạng thái TẮT (OFF)."
      });
    }

    // 2. Check Vietnam timezone (GMT+7) date
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const vnDate = new Date(utc + 7 * 3600000);

    const yyyy = vnDate.getFullYear();
    const mm = vnDate.getMonth(); // 0-11
    const lastDay = new Date(yyyy, mm + 1, 0).getDate();
    const isLastDay = vnDate.getDate() === lastDay;

    const currentMonth = `${yyyy}-${String(mm + 1).padStart(2, "0")}`;

    if (!isLastDay && !force) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: `Hôm nay là ngày ${vnDate.getDate()}/${mm + 1}/${yyyy}, chưa phải ngày cuối cùng của tháng (ngày ${lastDay}).`
      });
    }

    // 3. Check if already sent this month
    const lastSentMonthConfig = await prisma.assessmentConfig.findFirst({
      where: {
        categoryType: "SYSTEM_SETTING",
        code: "DU_GIO_AUTO_EMAIL_TTCM_LAST_SENT_MONTH"
      }
    });

    if (lastSentMonthConfig?.name === currentMonth && !force) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: `Báo cáo tháng ${currentMonth} đã được gửi tự động trước đó vào ngày cuối tháng.`
      });
    }

    // 4. Proceed to send report to all departments
    const host = request.headers.get("host") || "skyline-survey.vercel.app";
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;

    const activeYear = await prisma.academicYear.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { startDate: "desc" }
    });

    const departments = await prisma.department.findMany({
      where: { status: "ACTIVE" }
    });

    let sentCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    for (const dept of departments) {
      const res = await sendReportForDepartment({
        departmentId: dept.id,
        academicYearId: activeYear?.id,
        month: currentMonth,
        baseUrl,
        notes: `Báo cáo tự động định kỳ cuối tháng ${mm + 1}/${yyyy} từ Ban Khảo thí & ĐBCL Hệ thống Giáo dục Sky-Line.`
      });

      if (res.success) {
        sentCount++;
        results.push({ deptName: dept.name, email: res.ttcmEmail, status: "SUCCESS" });
      } else {
        failedCount++;
        results.push({ deptName: dept.name, error: res.error, status: "FAILED" });
      }
    }

    const logSummary = `Tự động gửi ngày ${vnDate.toLocaleDateString("vi-VN")}: Thành công ${sentCount}/${departments.length} Tổ CM`;

    // 5. Update last sent records
    await saveConfig("DU_GIO_AUTO_EMAIL_TTCM_LAST_SENT_MONTH", currentMonth);
    await saveConfig("DU_GIO_AUTO_EMAIL_TTCM_LAST_SENT_AT", new Date().toISOString());
    await saveConfig("DU_GIO_AUTO_EMAIL_TTCM_LAST_LOG", logSummary);

    return NextResponse.json({
      success: true,
      executed: true,
      month: currentMonth,
      total: departments.length,
      sentCount,
      failedCount,
      results
    });
  } catch (error: any) {
    console.error("[Cron send-monthly-ttcm-report] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
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
