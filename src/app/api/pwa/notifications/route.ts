import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 401 })
    }

    const userId = session.user.id
    const url = new URL(req.url)
    const category = url.searchParams.get("category") // ACTION_REQUIRED | ATTENTION | INFORMATION | COMPLETED
    const unreadOnly = url.searchParams.get("unreadOnly") === "true"

    let whereClause: any = { userId }
    if (unreadOnly) {
      whereClause.isRead = false
    }
    if (category && category !== "ALL") {
      whereClause.type = category
    }

    const [rawNotifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: 30
      }),
      prisma.notification.count({
        where: { userId, isRead: false }
      })
    ])

    // Format and classify into 4 color categories
    const formatted = rawNotifications.map(n => {
      let resolvedCategory: "ACTION_REQUIRED" | "ATTENTION" | "INFORMATION" | "COMPLETED" = "INFORMATION"
      const p = (n.priority || "NORMAL").toUpperCase()
      const t = (n.type || "").toUpperCase()

      if (t === "ACTION_REQUIRED" || p === "URGENT" || n.title.toLowerCase().includes("quá hạn") || n.title.toLowerCase().includes("chờ duyệt")) {
        resolvedCategory = "ACTION_REQUIRED"
      } else if (t === "ATTENTION" || p === "HIGH" || n.title.toLowerCase().includes("chú ý") || n.title.toLowerCase().includes("cảnh báo")) {
        resolvedCategory = "ATTENTION"
      } else if (t === "COMPLETED" || n.title.toLowerCase().includes("hoàn thành") || n.title.toLowerCase().includes("đã duyệt")) {
        resolvedCategory = "COMPLETED"
      } else {
        resolvedCategory = "INFORMATION"
      }

      return {
        id: n.id,
        userId: n.userId,
        title: n.title,
        body: n.message,
        isRead: n.isRead,
        deepLink: n.link || "/teacher",
        type: resolvedCategory,
        category: n.category || "GENERAL",
        priority: n.priority || (resolvedCategory === "ACTION_REQUIRED" ? "URGENT" : "NORMAL"),
        sourceModule: n.sourceModule || null,
        sourceId: n.sourceId || null,
        createdAt: n.createdAt.toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      notifications: formatted,
      unreadCount,
      summary: {
        actionRequired: formatted.filter(n => n.type === "ACTION_REQUIRED" && !n.isRead).length,
        attention: formatted.filter(n => n.type === "ATTENTION" && !n.isRead).length,
        information: formatted.filter(n => n.type === "INFORMATION" && !n.isRead).length,
        completed: formatted.filter(n => n.type === "COMPLETED").length,
      }
    }, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate"
      }
    })
  } catch (error) {
    console.error("[API PWA Notifications GET Error]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { notificationId, markAll } = body

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, isRead: false },
        data: { isRead: true }
      })
    } else if (notificationId) {
      await prisma.notification.updateMany({
        where: { id: notificationId, userId: session.user.id },
        data: { isRead: true }
      })
    }

    return NextResponse.json({ success: true, message: "Đã cập nhật trạng thái thông báo" })
  } catch (error) {
    console.error("[API PWA Notifications POST Error]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
