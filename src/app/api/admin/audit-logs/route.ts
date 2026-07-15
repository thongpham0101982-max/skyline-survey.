import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

const ALLOWED_ROLES = ["ADMIN", "ADMINISTRATOR"]

async function checkAdmin() {
  const session = await auth()
  if (!session) return null
  const role = (session?.user as any)?.role || ""
  if (!ALLOWED_ROLES.includes(role)) return null
  return session
}

/**
 * DELETE /api/admin/audit-logs
 * Body: { mode: "all" | "before_days" | "before_date", days?: number, date?: string }
 */
export async function DELETE(req: NextRequest) {
  const session = await checkAdmin()
  if (!session) {
    return NextResponse.json({ error: "Khong co quyen truy cap" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { mode, days, date } = body

    let where: any = {}

    if (mode === "all") {
      where = {}
    } else if (mode === "before_days" && days) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - Number(days))
      where = { createdAt: { lt: cutoff } }
    } else if (mode === "before_date" && date) {
      where = { createdAt: { lt: new Date(date) } }
    } else {
      return NextResponse.json({ error: "Tham so khong hop le" }, { status: 400 })
    }

    const result = await prisma.auditLog.deleteMany({ where })

    // Log this deletion action itself
    const userId = (session?.user as any)?.id || "SYSTEM"
    const userEmail = (session?.user as any)?.email || "system"
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail,
        action: "DELETE_AUDIT_LOGS",
        targetTable: "AuditLog",
        targetId: "BULK",
        newValues: JSON.stringify({ deletedCount: result.count, mode, days, date }),
        ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1"
      }
    })

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `Da xoa ${result.count} ban ghi nhat ky thanh cong`
    })
  } catch (error: any) {
    console.error("Error deleting audit logs:", error)
    return NextResponse.json({ error: "Loi khi xoa nhat ky: " + error.message }, { status: 500 })
  }
}

/**
 * GET /api/admin/audit-logs?days=X
 * Preview so ban ghi se bi xoa
 */
export async function GET(req: NextRequest) {
  const session = await checkAdmin()
  if (!session) {
    return NextResponse.json({ error: "Khong co quyen truy cap" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const days = searchParams.get("days")

    const total = await prisma.auditLog.count()

    let beforeCount = 0
    if (days) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - Number(days))
      beforeCount = await prisma.auditLog.count({ where: { createdAt: { lt: cutoff } } })
    }

    return NextResponse.json({ total, beforeCount })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
