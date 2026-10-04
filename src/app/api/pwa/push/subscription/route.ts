import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { endpoint, keys, userAgent, deviceType } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 })
    }

    // Upsert subscription
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: session.user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null,
        deviceType: deviceType || "MOBILE",
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null,
        deviceType: deviceType || "MOBILE",
        isActive: true
      }
    })

    return NextResponse.json({ success: true, message: "Đăng ký nhận thông báo thành công" })
  } catch (error) {
    console.error("[API Push Subscription POST Error]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { endpoint } = body

    if (endpoint) {
      await prisma.pushSubscription.updateMany({
        where: { endpoint, userId: session.user.id },
        data: { isActive: false }
      })
    } else {
      await prisma.pushSubscription.updateMany({
        where: { userId: session.user.id },
        data: { isActive: false }
      })
    }

    return NextResponse.json({ success: true, message: "Đã hủy đăng ký nhận thông báo" })
  } catch (error) {
    console.error("[API Push Subscription DELETE Error]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
