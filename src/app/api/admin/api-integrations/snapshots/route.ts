import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ensureApiIntegrationTables } from "@/lib/api-auth"
import { ensureHandoverTable } from "@/lib/api-handover"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const role = ((session?.user as any)?.role || "").toUpperCase().trim()
    if (!["ADMIN", "SUPER_ADMIN", "SUPERADMIN"].includes(role)) {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 })
    }

    await ensureApiIntegrationTables().catch(() => {})
    await ensureHandoverTable().catch(() => {})

    const pAny = prisma as any

    const teacherStats: any[] = await pAny.$queryRawUnsafe(
      `SELECT COUNT(*) as count, MAX(lastSyncedAt) as lastSyncedAt FROM "api_snapshot_teachers"`
    ).catch(() => [{ count: 0, lastSyncedAt: null }])

    const studentStats: any[] = await pAny.$queryRawUnsafe(
      `SELECT COUNT(*) as count, MAX(lastSyncedAt) as lastSyncedAt FROM "api_snapshot_students"`
    ).catch(() => [{ count: 0, lastSyncedAt: null }])

    return NextResponse.json({
      success: true,
      data: {
        teachers: {
          count: Number(teacherStats[0]?.count || 0),
          lastSyncedAt: teacherStats[0]?.lastSyncedAt || null,
        },
        students: {
          count: Number(studentStats[0]?.count || 0),
          lastSyncedAt: studentStats[0]?.lastSyncedAt || null,
        },
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Lỗi nạp thống kê Snapshot" },
      { status: 500 }
    )
  }
}
