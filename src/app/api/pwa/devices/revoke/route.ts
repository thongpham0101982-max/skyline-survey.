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

    const userId = session.user.id
    const body = await req.json().catch(() => ({}))
    const { deviceId, revokeAllOthers, currentDeviceId } = body

    if (revokeAllOthers) {
      const targetDeviceId = currentDeviceId || req.headers.get("x-device-id") || ""
      
      const result = await prisma.deviceSession.updateMany({
        where: {
          userId,
          ...(targetDeviceId ? { deviceId: { not: targetDeviceId } } : {}),
          status: "ACTIVE"
        },
        data: {
          status: "REVOKED",
          updatedAt: new Date()
        }
      })

      await prisma.auditLog.create({
        data: {
          userId,
          userEmail: session.user.email || "N/A",
          action: "REVOKE_OTHER_DEVICE_SESSIONS",
          targetTable: "DeviceSession",
          targetId: userId,
          newValues: `Đã thu hồi ${result.count} thiết bị khác`,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1"
        }
      }).catch(() => {})

      return NextResponse.json({
        success: true,
        message: `Đã đăng xuất thành công ${result.count} thiết bị khác.`,
        count: result.count
      })
    }

    if (deviceId) {
      await prisma.deviceSession.updateMany({
        where: {
          userId,
          deviceId
        },
        data: {
          status: "REVOKED",
          updatedAt: new Date()
        }
      })

      await prisma.auditLog.create({
        data: {
          userId,
          userEmail: session.user.email || "N/A",
          action: "REVOKE_DEVICE_SESSION",
          targetTable: "DeviceSession",
          targetId: deviceId,
          newValues: `Đã thu hồi phiên thiết bị: ${deviceId}`,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1"
        }
      }).catch(() => {})

      return NextResponse.json({
        success: true,
        message: "Đã thu hồi phiên thiết bị thành công."
      })
    }

    return NextResponse.json({ error: "Tham số không hợp lệ" }, { status: 400 })
  } catch (err: any) {
    console.error("[PWA_DEVICES_REVOKE] Error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
