import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { notifications: [], unreadCount: 0 },
        { headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" } }
      )
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      })
    ])

    return NextResponse.json(
      { notifications, unreadCount },
      { headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" } }
    )
  } catch (error) {
    console.error("[API /api/notifications GET Error]:", error)
    return NextResponse.json({ notifications: [], unreadCount: 0, error: "Internal error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      // Body is optional
    }

    if (body.notificationId) {
      await prisma.notification.updateMany({
        where: { id: body.notificationId, userId: session.user.id },
        data: { isRead: true },
      })
    } else {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, isRead: false },
        data: { isRead: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[API /api/notifications POST Error]:", error)
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 })
  }
}
