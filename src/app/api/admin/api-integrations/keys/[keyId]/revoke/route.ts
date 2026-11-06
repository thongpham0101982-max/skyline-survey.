import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const role = ((session?.user as any)?.role || "").toUpperCase().trim()
    if (!["ADMIN", "SUPER_ADMIN", "SUPERADMIN"].includes(role)) {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 })
    }

    const { keyId } = await params
    let body: any = {}
    try {
      body = await request.json()
    } catch {}

    const pAny = prisma as any
    const existing = await pAny.apiKey.findFirst({
      where: {
        OR: [{ id: keyId }, { keyId: keyId }],
      },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: "Khóa API không tồn tại" }, { status: 404 })
    }

    const revoked = await pAny.apiKey.update({
      where: { id: existing.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedReason: body.reason?.trim() || "Người quản trị thu hồi thủ công",
      },
    })

    return NextResponse.json({ success: true, key: revoked })
  } catch (error: any) {
    console.error("Lỗi thu hồi API Key:", error)
    return NextResponse.json({ success: false, error: "Không thể thu hồi khóa API" }, { status: 500 })
  }
}
