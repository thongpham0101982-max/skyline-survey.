import { NextResponse } from "next/server"
import { dispatchWorkHubDigestReminders } from "@/lib/workhub/dashboardAndAiEngine"

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
    const force = url.searchParams.get("force") === "true"
    const summary = await dispatchWorkHubDigestReminders({ force })

    return NextResponse.json({
      success: true,
      ...summary,
    })
  } catch (err: any) {
    console.error("[CRON workhub-reminders] Error:", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi thực thi Cron nhắc việc WorkHub" },
      { status: 500 }
    )
  }
}
