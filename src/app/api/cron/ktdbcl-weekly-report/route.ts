import { NextResponse } from "next/server"
import { getVietnamDateParts } from "@/lib/qa-workspace/weeklyReportSchema"
import {
  dispatchDirectorSummaryReport,
  dispatchKtdbclWednesdayReminders,
} from "@/lib/qa-workspace/weeklyReportEmailService"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const mode = (url.searchParams.get("mode") || "auto").toLowerCase()
    const force = url.searchParams.get("force") === "true"
    const vn = getVietnamDateParts(new Date())
    const lastDayOfCurrentMonth = new Date(Date.UTC(vn.year, vn.month, 0, 12, 0, 0)).getUTCDate()
    const isLastDayOfMonth = vn.day === lastDayOfCurrentMonth

    const executed: Record<string, any> = {}

    // 1. Nhắc nộp báo cáo tuần cho thành viên Ban KT&ĐBCL (Định kỳ Thứ Tư 14:00 giờ Việt Nam)
    if (
      mode === "wednesday_reminder" ||
      (mode === "auto" && vn.dayOfWeek === 3 && vn.hour >= 13 && vn.hour <= 15)
    ) {
      executed.wednesdayReminder = await dispatchKtdbclWednesdayReminders({
        force,
        triggeredBy: "SYSTEM_CRON_WED_14H",
      })
    }

    // 2. Tự động gửi Báo cáo Tuần cho Giám đốc Ban KT&ĐBCL
    if (
      mode === "director_weekly" ||
      (mode === "auto" && vn.dayOfWeek === 5 && vn.hour >= 15)
    ) {
      executed.directorWeekly = await dispatchDirectorSummaryReport({
        scopeType: "WEEKLY",
        force,
        triggeredBy: "SYSTEM_CRON_WEEKLY_DIRECTOR",
      })
    }

    // 3. Tự động gửi Báo cáo Tháng cho Giám đốc Ban KT&ĐBCL
    if (
      mode === "director_monthly" ||
      (mode === "auto" && isLastDayOfMonth && vn.hour >= 16)
    ) {
      if (mode === "director_monthly" && !force && !isLastDayOfMonth) {
        executed.directorMonthly = {
          skipped: true,
          reason: `Hôm nay (${vn.day}/${vn.month}/${vn.year}) chưa phải ngày cuối tháng (${lastDayOfCurrentMonth}/${vn.month}).`,
        }
      } else {
        executed.directorMonthly = await dispatchDirectorSummaryReport({
          scopeType: "MONTHLY",
          month: vn.month,
          year: vn.year,
          force,
          triggeredBy: "SYSTEM_CRON_MONTHLY_DIRECTOR",
        })
      }
    }

    return NextResponse.json({
      success: true,
      mode,
      vietnamTime: vn,
      executed,
    })
  } catch (error: any) {
    console.error("[CRON ktdbcl-weekly-report] Error:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Lỗi thực thi Cron Ban KT&ĐBCL" },
      { status: 500 }
    )
  }
}
