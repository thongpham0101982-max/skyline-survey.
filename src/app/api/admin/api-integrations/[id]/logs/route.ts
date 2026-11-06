import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: applicationId } = await params
    const pAny = prisma as any

    const logs = await pAny.apiAccessLog.findMany({
      where: { applicationId },
      take: 50,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, logs })
  } catch (error: any) {
    console.error("Lỗi lấy nhật ký truy cập API:", error)
    return NextResponse.json({ success: false, error: "Không thể lấy nhật ký truy cập" }, { status: 500 })
  }
}
