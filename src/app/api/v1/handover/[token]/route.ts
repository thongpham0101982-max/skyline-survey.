import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ensureApiIntegrationTables } from "@/lib/api-auth"
import { verifyAndClaimHandover } from "@/lib/api-handover"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    await ensureApiIntegrationTables()
    const { token } = await params
    const pAny = prisma as any

    const rows: any[] = await pAny.$queryRawUnsafe(
      `SELECT id, token, appName, recipientEmail, keyId, keyPrefix, expiresAt, claimedAt, attempts, maxAttempts, createdAt FROM "api_handovers" WHERE "token" = ? LIMIT 1`,
      token
    )

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: "Gói bàn giao không tồn tại hoặc liên kết không hợp lệ" }, { status: 404 })
    }

    const r = rows[0]
    const now = new Date()
    const exp = new Date(r.expiresAt)
    const isExpired = now > exp
    const isLocked = r.attempts >= r.maxAttempts

    return NextResponse.json({
      success: true,
      data: {
        token: r.token,
        appName: r.appName,
        recipientEmail: r.recipientEmail,
        keyId: r.keyId,
        keyPrefix: r.keyPrefix,
        expiresAt: r.expiresAt,
        claimedAt: r.claimedAt,
        isExpired,
        isLocked,
        attemptsLeft: Math.max(0, r.maxAttempts - r.attempts),
      },
    })
  } catch (error: any) {
    console.error("Lỗi tra cứu thông tin gói bàn giao:", error)
    return NextResponse.json({ success: false, error: "Lỗi máy chủ khi tra cứu bàn giao" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json().catch(() => ({}))
    const { passcode } = body

    if (!passcode || typeof passcode !== "string" || !passcode.trim()) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập Mật khẩu bảo vệ bàn giao" }, { status: 400 })
    }

    const result = await verifyAndClaimHandover(token, passcode)
    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          attemptsLeft: result.attemptsLeft,
        },
        { status: result.statusCode || 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        rawKey: result.rawKey,
        appName: result.appName,
        keyId: result.keyId,
        keyPrefix: result.keyPrefix,
        recipientEmail: result.recipientEmail,
        claimedAt: result.claimedAt,
      },
    })
  } catch (error: any) {
    console.error("Lỗi giải mã gói bàn giao API:", error)
    return NextResponse.json({ success: false, error: "Lỗi máy chủ khi xác thực mật khẩu" }, { status: 500 })
  }
}
