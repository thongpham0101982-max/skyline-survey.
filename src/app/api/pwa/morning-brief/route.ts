import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { aggregateUserTasks } from "@/services/taskEngine"
import { sendPushNotificationToUser } from "@/lib/webpush"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const userRole = (session.user as any)?.role || "TEACHER"

    const { tasks, counts } = await aggregateUserTasks(userId, userRole)

    // Format Morning Brief
    const todayStr = new Date().toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit"
    })

    const duGioToday = tasks.filter(t => t.sourceModule === "DU_GIO" && t.deadline === "Hôm nay").length
    const urgentCount = counts.overdue
    const actionToday = counts.today

    const lines: string[] = [
      `☀️ SSM Morning Brief - ${todayStr}`,
      "",
      `Hôm nay của Thầy/Cô:`,
      urgentCount > 0 ? `🔴 ${urgentCount} việc khẩn cấp / quá hạn` : "✅ Không có việc quá hạn",
      actionToday > 0 ? `🟠 ${actionToday} việc cần giải quyết hôm nay` : "👍 Các đầu việc đúng tiến độ",
      duGioToday > 0 ? `🔵 ${duGioToday} lịch dự giờ / thao giảng hôm nay` : "🔵 Không có lịch dự giờ hôm nay",
    ]

    const summaryText = lines.filter(Boolean).join("\n")

    return NextResponse.json({
      success: true,
      brief: {
        date: todayStr,
        title: "☀️ SSM Morning Brief",
        urgentCount,
        actionToday,
        duGioToday,
        summaryText,
        deepLink: "/teacher"
      }
    })
  } catch (error) {
    console.error("[API Morning Brief GET Error]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const userRole = (session.user as any)?.role || "TEACHER"

    const { tasks, counts } = await aggregateUserTasks(userId, userRole)

    const urgentCount = counts.overdue
    const actionToday = counts.today
    const duGioToday = tasks.filter(t => t.sourceModule === "DU_GIO" && t.deadline === "Hôm nay").length

    const bodyText = [
      urgentCount > 0 ? `🔴 ${urgentCount} việc khẩn` : "✅ Đúng hạn",
      actionToday > 0 ? `🟠 ${actionToday} việc hôm nay` : null,
      duGioToday > 0 ? `🔵 ${duGioToday} tiết dự giờ` : null
    ].filter(Boolean).join(" · ")

    const todayDateKey = new Date().toISOString().split("T")[0]

    const result = await sendPushNotificationToUser(userId, {
      title: "☀️ SSM Morning Brief",
      body: bodyText || "Chúc Thầy/Cô một ngày làm việc tràn đầy năng lượng!",
      deepLink: "/teacher",
      tag: `ssm-morning-brief-${todayDateKey}`,
      actions: [{ action: "open_today", title: "Mở SSM Today" }]
    })

    return NextResponse.json({
      success: true,
      message: "Đã gửi bản tóm tắt Morning Brief đến thiết bị",
      result
    })
  } catch (error) {
    console.error("[API Morning Brief POST Error]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
