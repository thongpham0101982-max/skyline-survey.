import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

function getIpAddress(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  const realIp = req.headers.get("x-real-ip")
  if (realIp) return realIp.trim()
  return "127.0.0.1"
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const currentDeviceId = req.headers.get("x-device-id") || ""

    const sessions = await prisma.deviceSession.findMany({
      where: { userId },
      orderBy: { lastActiveAt: "desc" },
      take: 20
    })

    const formattedSessions = sessions.map(s => ({
      id: s.id,
      deviceId: s.deviceId,
      deviceName: s.deviceName,
      deviceType: s.deviceType || "MOBILE",
      browser: s.browser || "Trình duyệt web",
      os: s.os || "Hệ điều hành",
      ipAddress: s.ipAddress || "Ẩn danh",
      lastActiveAt: s.lastActiveAt,
      status: s.status,
      isCurrent: Boolean(currentDeviceId && s.deviceId === currentDeviceId)
    }))

    return NextResponse.json({
      success: true,
      currentDeviceId,
      devices: formattedSessions
    })
  } catch (err: any) {
    console.error("[PWA_DEVICES_GET] Error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const body = await req.json().catch(() => ({}))
    const { deviceId, deviceName, deviceType, browser, os } = body

    if (!deviceId) {
      return NextResponse.json({ error: "Thiếu mã thiết bị (deviceId)" }, { status: 400 })
    }

    const ipAddress = getIpAddress(req)
    const userAgent = req.headers.get("user-agent") || ""

    // Kiểm tra xem thiết bị này đã bị REVOKED chưa
    const existing = await prisma.deviceSession.findUnique({
      where: {
        userId_deviceId: { userId, deviceId }
      }
    })

    if (existing && existing.status === "REVOKED") {
      return NextResponse.json({
        revoked: true,
        message: "Phiên đăng nhập trên thiết bị này đã bị thu hồi từ xa. Vui lòng đăng nhập lại."
      }, { status: 403 })
    }

    // Upsert session
    const resolvedName = deviceName || (deviceType === "MOBILE" ? "Điện thoại thông minh" : "Máy tính cá nhân")

    const saved = await prisma.deviceSession.upsert({
      where: {
        userId_deviceId: { userId, deviceId }
      },
      update: {
        deviceName: resolvedName,
        deviceType: deviceType || "MOBILE",
        browser: browser || null,
        os: os || null,
        ipAddress,
        userAgent,
        status: "ACTIVE",
        lastActiveAt: new Date()
      },
      create: {
        userId,
        deviceId,
        deviceName: resolvedName,
        deviceType: deviceType || "MOBILE",
        browser: browser || null,
        os: os || null,
        ipAddress,
        userAgent,
        status: "ACTIVE",
        lastActiveAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      device: saved
    })
  } catch (err: any) {
    console.error("[PWA_DEVICES_POST] Error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
