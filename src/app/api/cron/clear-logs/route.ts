import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * GET /api/cron/clear-logs
 * Endpoint cho cron job tu dong xoa logs luc 19:00 hang ngay (VN time = UTC 12:00).
 * Bao mat bang CRON_SECRET trong bien moi truong.
 * Vercel Cron config trong vercel.json: schedule = "0 12 * * *"
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || "30")
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - retentionDays)

    const result = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } }
    })

    if (result.count > 0) {
      await prisma.auditLog.create({
        data: {
          userId: "SYSTEM",
          userEmail: "system@cron",
          action: "AUTO_CLEAR_LOGS",
          targetTable: "AuditLog",
          targetId: "SCHEDULED",
          newValues: JSON.stringify({
            deletedCount: result.count,
            retentionDays,
            cutoffDate: cutoff.toISOString(),
            scheduledAt: new Date().toISOString()
          }),
          ipAddress: "CRON_JOB"
        }
      })
    }

    console.log(`[CRON] Auto-cleared ${result.count} audit logs older than ${retentionDays} days`)

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      retentionDays,
      cutoffDate: cutoff.toISOString(),
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error("[CRON] Error clearing audit logs:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
