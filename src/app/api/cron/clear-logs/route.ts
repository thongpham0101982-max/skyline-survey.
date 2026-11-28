import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAdminOrLeadershipSession } from "@/lib/security-guard"

const PROTECTED_AUDIT_ACTIONS = [
  "SCORE_UPDATE",
  "APPROVE_INPUT_ASSESSMENT",
  "BATCH_APPROVE_INPUT_ASSESSMENT",
  "DELETE_INPUT_ASSESSMENT_STUDENT",
  "BULK_DELETE_INPUT_ASSESSMENT_STUDENTS",
  "CREATE_ROLE",
  "UPDATE_ROLE",
  "UPDATE_ROLE_PERMISSIONS",
  "DELETE_ROLE",
  "CREATE_USER",
  "UPDATE_USER",
  "DELETE_USER",
  "BULK_DELETE_USERS",
  "CHANGE_USER_ROLES",
  "DELETE_BACKUP"
]

/**
 * GET /api/cron/clear-logs
 * Endpoint cho cron job tự động dọn dẹp có kiểm soát lúc 19:00 hàng ngày (VN time = UTC 12:00).
 * Bắt buộc xác thực bằng CRON_SECRET hoặc phiên Admin. Hỗ trợ ?dryRun=true và giới hạn phạm vi mỗi lần chạy.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = (process.env.CRON_SECRET || "").trim()
  const hasValidCronToken = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`)

  if (!hasValidCronToken) {
    const adminCtx = await requireAdminOrLeadershipSession()
    if (!adminCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const { searchParams } = new URL(req.url)
    const dryRun = searchParams.get("dryRun") === "true"
    const retentionDays = Math.max(30, parseInt(process.env.LOG_RETENTION_DAYS || "90", 10) || 90)
    const batchLimit = Math.min(5000, Math.max(100, parseInt(searchParams.get("limit") || "2000", 10) || 2000))

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - retentionDays)

    const expiredTokenCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Find bounded batch of routine logs older than cutoff, preserving critical audit trails
    const candidateLogs = await prisma.auditLog.findMany({
      where: {
        createdAt: { lt: cutoff },
        action: { notIn: PROTECTED_AUDIT_ACTIONS }
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
      take: batchLimit
    })

    const expiredResetTokensCount = await prisma.passwordResetToken
      .count({
        where: { expiresAt: { lt: expiredTokenCutoff } }
      })
      .catch(() => 0)

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        candidateAuditLogsCount: candidateLogs.length,
        expiredResetTokensCount,
        retentionDays,
        batchLimit,
        cutoffDate: cutoff.toISOString(),
        timestamp: new Date().toISOString()
      })
    }

    let deletedLogsCount = 0
    if (candidateLogs.length > 0) {
      const result = await prisma.auditLog.deleteMany({
        where: { id: { in: candidateLogs.map((l) => l.id) } }
      })
      deletedLogsCount = result.count
    }

    const deletedTokens = await prisma.passwordResetToken
      .deleteMany({
        where: { expiresAt: { lt: expiredTokenCutoff } }
      })
      .catch(() => ({ count: 0 }))

    if (deletedLogsCount > 0 || deletedTokens.count > 0) {
      await prisma.auditLog.create({
        data: {
          userId: "SYSTEM",
          userEmail: "system@cron",
          action: "AUTO_CLEAR_LOGS",
          targetTable: "AuditLog",
          targetId: "SCHEDULED",
          newValues: JSON.stringify({
            deletedCount: deletedLogsCount,
            deletedExpiredResetTokens: deletedTokens.count,
            retentionDays,
            batchLimit,
            cutoffDate: cutoff.toISOString(),
            scheduledAt: new Date().toISOString()
          }),
          ipAddress: "CRON_JOB"
        }
      })
    }

    return NextResponse.json({
      success: true,
      dryRun: false,
      deletedCount: deletedLogsCount,
      deletedExpiredResetTokens: deletedTokens.count,
      retentionDays,
      batchLimit,
      cutoffDate: cutoff.toISOString(),
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error("[CRON] Error clearing audit logs:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
