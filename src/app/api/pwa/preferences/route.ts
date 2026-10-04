import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pref = await prisma.userPreference.findUnique({
      where: { userId: session.user.id }
    }).catch(() => null)

    return NextResponse.json({
      success: true,
      preferences: pref || {
        morningBriefEnabled: true,
        morningBriefTime: "07:00",
        pushNotifications: true,
        themePreference: "LIGHT"
      }
    })
  } catch (error) {
    console.error("[API Preferences GET Error]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { morningBriefEnabled, morningBriefTime, pushNotifications, themePreference } = body

    const updated = await prisma.userPreference.upsert({
      where: { userId: session.user.id },
      update: {
        ...(morningBriefEnabled !== undefined && { morningBriefEnabled }),
        ...(morningBriefTime && { morningBriefTime }),
        ...(pushNotifications !== undefined && { pushNotifications }),
        ...(themePreference && { themePreference }),
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        morningBriefEnabled: morningBriefEnabled ?? true,
        morningBriefTime: morningBriefTime || "07:00",
        pushNotifications: pushNotifications ?? true,
        themePreference: themePreference || "LIGHT"
      }
    })

    return NextResponse.json({ success: true, preferences: updated })
  } catch (error) {
    console.error("[API Preferences PUT Error]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
