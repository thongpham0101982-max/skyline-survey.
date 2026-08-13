import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  getUserUnreadBadges,
  markFeatureBadgeAsRead,
  triggerFeatureBadgeUpdate,
} from "@/lib/badge-service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const unreadBadges = await getUserUnreadBadges(userId)
    return NextResponse.json({ badges: unreadBadges })
  } catch (error) {
    console.error("GET /api/teacher/unread-badges error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { featureKey, action = "markRead", badgeType = "NEW", title } = body

    if (action === "triggerMock") {
      await triggerFeatureBadgeUpdate({
        userIds: [userId],
        featureKey: featureKey || "GVCN_CLASSES",
        badgeType,
        title,
      })
      const updated = await getUserUnreadBadges(userId)
      return NextResponse.json({ success: true, badges: updated })
    }

    if (!featureKey) {
      return NextResponse.json({ error: "featureKey is required" }, { status: 400 })
    }

    await markFeatureBadgeAsRead(userId, featureKey)
    const updatedBadges = await getUserUnreadBadges(userId)
    return NextResponse.json({ success: true, badges: updated })
  } catch (error) {
    console.error("POST /api/teacher/unread-badges error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}