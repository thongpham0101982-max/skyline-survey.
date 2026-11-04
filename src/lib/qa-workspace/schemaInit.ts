import { prisma } from "@/lib/db"
import {
  QaTaskMetadataRecord,
  QaTaskAuditLogItem,
  QaReminderLogItem,
  QaWorkflowStatus,
  QaAssignmentMode,
  QaSourceModuleCode,
  QaReviewRating,
} from "./types"

let initializedPromise: Promise<void> | null = null

const DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "qa_task_metadata" (
    "taskId" TEXT NOT NULL PRIMARY KEY,
    "workflowStatus" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "assignmentMode" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "workspaceCardKey" TEXT,
    "coordinatorUserId" TEXT,
    "reviewerUserId" TEXT,
    "requiresApproval" INTEGER NOT NULL DEFAULT 1,
    "reviewDueDate" DATETIME,
    "submittedForReviewAt" DATETIME,
    "reviewedAt" DATETIME,
    "reviewComment" TEXT,
    "reviewRating" TEXT,
    "deliverables" TEXT,
    "completionCriteria" TEXT,
    "requiredEvidences" TEXT,
    "resultSummary" TEXT,
    "evidenceLinksJson" TEXT NOT NULL DEFAULT '[]',
    "checklistJson" TEXT NOT NULL DEFAULT '[]',
    "currentStepLabel" TEXT,
    "nextStepLabel" TEXT,
    "scopeMetaJson" TEXT NOT NULL DEFAULT '{}',
    "sourceModule" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceRecordId" TEXT,
    "sourceUrl" TEXT,
    "externalSyncKey" TEXT,
    "batchCode" TEXT,
    "recurrenceRuleJson" TEXT,
    "recurrenceTemplateId" TEXT,
    "recurrenceInstanceKey" TEXT,
    "statusReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("taskId") REFERENCES "WorkTask"("id") ON DELETE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "qa_task_meta_sync_key_uq" ON "qa_task_metadata"("externalSyncKey") WHERE "externalSyncKey" IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "qa_task_meta_rec_inst_uq" ON "qa_task_metadata"("recurrenceInstanceKey") WHERE "recurrenceInstanceKey" IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS "qa_task_meta_workflow_idx" ON "qa_task_metadata"("workflowStatus")`,
  `CREATE INDEX IF NOT EXISTS "qa_task_meta_reviewer_idx" ON "qa_task_metadata"("reviewerUserId", "workflowStatus")`,
  `CREATE INDEX IF NOT EXISTS "qa_task_meta_source_idx" ON "qa_task_metadata"("sourceModule", "sourceRecordId")`,

  `CREATE TABLE IF NOT EXISTS "qa_task_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "reason" TEXT,
    "changesJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("taskId") REFERENCES "WorkTask"("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "qa_task_audit_task_idx" ON "qa_task_audit_logs"("taskId", "createdAt" DESC)`,

  `CREATE TABLE IF NOT EXISTS "qa_task_reminders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "recipientName" TEXT,
    "recipientRoleType" TEXT NOT NULL DEFAULT 'ASSIGNEE',
    "reminderType" TEXT NOT NULL,
    "dedupKey" TEXT NOT NULL UNIQUE,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("taskId") REFERENCES "WorkTask"("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "qa_task_reminders_task_idx" ON "qa_task_reminders"("taskId", "createdAt" DESC)`,
  `CREATE INDEX IF NOT EXISTS "qa_task_reminders_user_idx" ON "qa_task_reminders"("recipientUserId", "createdAt" DESC)`,
]

export async function ensureQaWorkspaceSchema(): Promise<void> {
  if (!initializedPromise) {
    initializedPromise = (async () => {
      const pAny = prisma as any
      if (typeof pAny.$executeRawUnsafe !== "function") return
      for (const ddl of DDL_STATEMENTS) {
        try {
          await pAny.$executeRawUnsafe(ddl)
        } catch (err) {
          console.warn("[ensureQaWorkspaceSchema] DDL warning:", err)
        }
      }
    })().catch((err) => {
      initializedPromise = null
      console.error("[ensureQaWorkspaceSchema] Init failed:", err)
    })
  }
  return initializedPromise
}

function safeParseJson<T>(raw: any, fallback: T): T {
  if (!raw) return fallback
  if (typeof raw === "object") return raw as T
  try {
    return JSON.parse(String(raw)) as T
  } catch {
    return fallback
  }
}

export function deriveFallbackWorkflowStatus(task: {
  progress?: string | null
  acceptanceStatus?: string | null
}): QaWorkflowStatus {
  const prog = (task.progress || "PENDING").toUpperCase()
  const acc = (task.acceptanceStatus || "WAITING_CONFIRMATION").toUpperCase()
  if (prog === "COMPLETED") return "COMPLETED"
  if (prog === "CANCELLED") return "CANCELLED"
  if (acc === "REJECTED") return "NEEDS_REVISION"
  if (prog === "IN_PROGRESS" || acc === "ACCEPTED") return "IN_PROGRESS"
  return "ASSIGNED"
}

export function normalizeTaskMetadataRow(
  row: any,
  fallbackTask?: { id: string; progress?: string | null; acceptanceStatus?: string | null }
): QaTaskMetadataRecord {
  const taskId = row?.taskId || fallbackTask?.id || ""
  const workflowStatus: QaWorkflowStatus =
    (row?.workflowStatus as QaWorkflowStatus) ||
    (fallbackTask ? deriveFallbackWorkflowStatus(fallbackTask) : "ASSIGNED")

  const parsedChecklist = safeParseJson(row?.checklistJson, [])
  const parsedScopeMeta = safeParseJson(row?.scopeMetaJson, {})

  return {
    taskId,
    workflowStatus,
    assignmentMode: (row?.assignmentMode as QaAssignmentMode) || "INDIVIDUAL",
    workspaceCardKey: row?.workspaceCardKey || null,
    coordinatorUserId: row?.coordinatorUserId || null,
    reviewerUserId: row?.reviewerUserId || null,
    requiresApproval: row?.requiresApproval !== undefined ? Boolean(Number(row.requiresApproval)) : true,
    reviewDueDate: row?.reviewDueDate ? String(row.reviewDueDate) : null,
    submittedForReviewAt: row?.submittedForReviewAt ? String(row.submittedForReviewAt) : null,
    reviewedAt: row?.reviewedAt ? String(row.reviewedAt) : null,
    reviewComment: row?.reviewComment || null,
    reviewRating: (row?.reviewRating as QaReviewRating) || null,
    deliverables: row?.deliverables || null,
    completionCriteria: row?.completionCriteria || null,
    requiredEvidences: row?.requiredEvidences || null,
    resultSummary: row?.resultSummary || null,
    evidenceLinks: safeParseJson(row?.evidenceLinksJson, []),
    checklist: parsedChecklist,
    checklistJson: parsedChecklist,
    currentStepLabel: row?.currentStepLabel || null,
    nextStepLabel: row?.nextStepLabel || null,
    scopeMeta: parsedScopeMeta,
    scopeCampusId: parsedScopeMeta?.campusId || null,
    scopeGradeLevel: parsedScopeMeta?.gradeLevel || null,
    scopeClassId: parsedScopeMeta?.classCode || null,
    scopeSubject: parsedScopeMeta?.subjectCode || null,
    scopeSurveyPeriod: parsedScopeMeta?.periodCode || null,
    sourceModule: (row?.sourceModule as QaSourceModuleCode) || "MANUAL",
    sourceRecordId: row?.sourceRecordId || null,
    sourceUrl: row?.sourceUrl || null,
    externalSyncKey: row?.externalSyncKey || null,
    batchCode: row?.batchCode || null,
    recurrenceRule: safeParseJson(row?.recurrenceRuleJson, null),
    recurrenceTemplateId: row?.recurrenceTemplateId || null,
    recurrenceInstanceKey: row?.recurrenceInstanceKey || null,
    statusReason: row?.statusReason || null,
    version: Number(row?.version) > 0 ? Number(row.version) : 1,
    updatedAt: row?.updatedAt ? String(row.updatedAt) : undefined,
  }
}

export async function getQaMetadataMapForTasks(
  tasks: Array<{ id: string; progress?: string | null; acceptanceStatus?: string | null }>
): Promise<Map<string, QaTaskMetadataRecord>> {
  const map = new Map<string, QaTaskMetadataRecord>()
  if (!tasks || tasks.length === 0) return map

  await ensureQaWorkspaceSchema()
  const pAny = prisma as any
  if (typeof pAny.$queryRawUnsafe === "function") {
    try {
      const ids = tasks.map((t) => t.id)
      const placeholders = ids.map(() => "?").join(",")
      const rows: any[] = await pAny.$queryRawUnsafe(
        `SELECT * FROM "qa_task_metadata" WHERE "taskId" IN (${placeholders})`,
        ...ids
      )
      const rowByTaskId = new Map<string, any>()
      for (const r of rows || []) {
        if (r?.taskId) rowByTaskId.set(String(r.taskId), r)
      }
      for (const t of tasks) {
        map.set(t.id, normalizeTaskMetadataRow(rowByTaskId.get(t.id), t))
      }
      return map
    } catch (err) {
      console.warn("[getQaMetadataMapForTasks] Query fallback:", err)
    }
  }

  for (const t of tasks) {
    map.set(t.id, normalizeTaskMetadataRow(null, t))
  }
  return map
}

export async function upsertQaTaskMetadata(
  meta: Partial<QaTaskMetadataRecord> & { taskId: string },
  options?: { expectedVersion?: number }
): Promise<{ success: boolean; conflict?: boolean; newVersion: number; error?: string }> {
  await ensureQaWorkspaceSchema()
  const pAny = prisma as any
  if (typeof pAny.$queryRawUnsafe !== "function" || typeof pAny.$executeRawUnsafe !== "function") {
    return { success: true, newVersion: 1 }
  }

  try {
    const existingRows: any[] = await pAny.$queryRawUnsafe(
      `SELECT * FROM "qa_task_metadata" WHERE "taskId" = ? LIMIT 1`,
      meta.taskId
    )
    const existing = existingRows?.[0] || null
    const currentVersion = existing ? Number(existing.version || 1) : 0

    if (
      options?.expectedVersion !== undefined &&
      existing &&
      currentVersion !== Number(options.expectedVersion)
    ) {
      return {
        success: false,
        conflict: true,
        newVersion: currentVersion,
        error: `Nhiệm vụ vừa được người dùng khác cập nhật (Phiên bản hiện tại: v${currentVersion}). Vui lòng tải lại để tránh ghi đè dữ liệu.`,
      }
    }

    const merged = normalizeTaskMetadataRow({
      ...(existing || {}),
      ...meta,
      evidenceLinksJson:
        meta.evidenceLinks !== undefined
          ? JSON.stringify(meta.evidenceLinks)
          : existing?.evidenceLinksJson || "[]",
      checklistJson:
        meta.checklist !== undefined
          ? JSON.stringify(meta.checklist)
          : existing?.checklistJson || "[]",
      scopeMetaJson:
        meta.scopeMeta !== undefined
          ? JSON.stringify(meta.scopeMeta)
          : existing?.scopeMetaJson || "{}",
      recurrenceRuleJson:
        meta.recurrenceRule !== undefined
          ? meta.recurrenceRule
            ? JSON.stringify(meta.recurrenceRule)
            : null
          : existing?.recurrenceRuleJson || null,
    })

    const nextVersion = currentVersion + 1
    const nowIso = new Date().toISOString()

    await pAny.$executeRawUnsafe(
      `INSERT INTO "qa_task_metadata" (
        "taskId", "workflowStatus", "assignmentMode", "workspaceCardKey",
        "coordinatorUserId", "reviewerUserId", "requiresApproval", "reviewDueDate",
        "submittedForReviewAt", "reviewedAt", "reviewComment", "reviewRating",
        "deliverables", "completionCriteria", "requiredEvidences", "resultSummary",
        "evidenceLinksJson", "checklistJson", "currentStepLabel", "nextStepLabel",
        "scopeMetaJson", "sourceModule", "sourceRecordId", "sourceUrl",
        "externalSyncKey", "batchCode", "recurrenceRuleJson", "recurrenceTemplateId",
        "recurrenceInstanceKey", "statusReason", "version", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT("taskId") DO UPDATE SET
        "workflowStatus" = excluded."workflowStatus",
        "assignmentMode" = excluded."assignmentMode",
        "workspaceCardKey" = excluded."workspaceCardKey",
        "coordinatorUserId" = excluded."coordinatorUserId",
        "reviewerUserId" = excluded."reviewerUserId",
        "requiresApproval" = excluded."requiresApproval",
        "reviewDueDate" = excluded."reviewDueDate",
        "submittedForReviewAt" = excluded."submittedForReviewAt",
        "reviewedAt" = excluded."reviewedAt",
        "reviewComment" = excluded."reviewComment",
        "reviewRating" = excluded."reviewRating",
        "deliverables" = excluded."deliverables",
        "completionCriteria" = excluded."completionCriteria",
        "requiredEvidences" = excluded."requiredEvidences",
        "resultSummary" = excluded."resultSummary",
        "evidenceLinksJson" = excluded."evidenceLinksJson",
        "checklistJson" = excluded."checklistJson",
        "currentStepLabel" = excluded."currentStepLabel",
        "nextStepLabel" = excluded."nextStepLabel",
        "scopeMetaJson" = excluded."scopeMetaJson",
        "sourceModule" = excluded."sourceModule",
        "sourceRecordId" = excluded."sourceRecordId",
        "sourceUrl" = excluded."sourceUrl",
        "externalSyncKey" = excluded."externalSyncKey",
        "batchCode" = excluded."batchCode",
        "recurrenceRuleJson" = excluded."recurrenceRuleJson",
        "recurrenceTemplateId" = excluded."recurrenceTemplateId",
        "recurrenceInstanceKey" = excluded."recurrenceInstanceKey",
        "statusReason" = excluded."statusReason",
        "version" = excluded."version",
        "updatedAt" = excluded."updatedAt"`,
      merged.taskId,
      merged.workflowStatus,
      merged.assignmentMode,
      merged.workspaceCardKey,
      merged.coordinatorUserId,
      merged.reviewerUserId,
      merged.requiresApproval ? 1 : 0,
      merged.reviewDueDate,
      merged.submittedForReviewAt,
      merged.reviewedAt,
      merged.reviewComment,
      merged.reviewRating,
      merged.deliverables,
      merged.completionCriteria,
      merged.requiredEvidences,
      merged.resultSummary,
      JSON.stringify(merged.evidenceLinks || []),
      JSON.stringify(merged.checklist || []),
      merged.currentStepLabel,
      merged.nextStepLabel,
      JSON.stringify(merged.scopeMeta || {}),
      merged.sourceModule,
      merged.sourceRecordId,
      merged.sourceUrl,
      merged.externalSyncKey,
      merged.batchCode,
      merged.recurrenceRule ? JSON.stringify(merged.recurrenceRule) : null,
      merged.recurrenceTemplateId,
      merged.recurrenceInstanceKey,
      merged.statusReason,
      nextVersion,
      nowIso
    )

    return { success: true, newVersion: nextVersion }
  } catch (err: any) {
    console.error("[upsertQaTaskMetadata] Error:", err)
    return { success: false, newVersion: 1, error: err?.message || "Lỗi cập nhật metadata nhiệm vụ" }
  }
}

export async function appendQaTaskAuditLog(entry: {
  taskId: string
  actorUserId: string
  actorName: string
  actorRole?: string | null
  action: string
  fromStatus?: string | null
  toStatus?: string | null
  reason?: string | null
  changes?: Record<string, any> | null
}): Promise<void> {
  await ensureQaWorkspaceSchema()
  const pAny = prisma as any
  if (typeof pAny.$executeRawUnsafe !== "function") return

  const id = `qalog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const nowIso = new Date().toISOString()
  try {
    await pAny.$executeRawUnsafe(
      `INSERT INTO "qa_task_audit_logs" (
        "id", "taskId", "actorUserId", "actorName", "actorRole",
        "action", "fromStatus", "toStatus", "reason", "changesJson", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      entry.taskId,
      entry.actorUserId,
      entry.actorName,
      entry.actorRole || null,
      entry.action,
      entry.fromStatus || null,
      entry.toStatus || null,
      entry.reason || null,
      entry.changes ? JSON.stringify(entry.changes) : null,
      nowIso
    )
  } catch (err) {
    console.warn("[appendQaTaskAuditLog] Warning:", err)
  }
}

export async function getQaTaskAuditLogs(taskId: string): Promise<QaTaskAuditLogItem[]> {
  await ensureQaWorkspaceSchema()
  const pAny = prisma as any
  if (typeof pAny.$queryRawUnsafe !== "function") return []
  try {
    const rows: any[] = await pAny.$queryRawUnsafe(
      `SELECT * FROM "qa_task_audit_logs" WHERE "taskId" = ? ORDER BY "createdAt" DESC LIMIT 100`,
      taskId
    )
    return (rows || []).map((r) => ({
      id: String(r.id),
      taskId: String(r.taskId),
      actorUserId: String(r.actorUserId),
      actorName: String(r.actorName),
      actorRole: r.actorRole ? String(r.actorRole) : null,
      action: String(r.action),
      fromStatus: r.fromStatus ? String(r.fromStatus) : null,
      toStatus: r.toStatus ? String(r.toStatus) : null,
      reason: r.reason ? String(r.reason) : null,
      changesJson: r.changesJson ? String(r.changesJson) : null,
      createdAt: String(r.createdAt),
    }))
  } catch {
    return []
  }
}

export async function recordQaReminderIfNotExists(reminder: {
  taskId: string
  recipientUserId: string
  recipientName?: string | null
  recipientRoleType: "ASSIGNEE" | "COORDINATOR" | "REVIEWER"
  reminderType: QaReminderLogItem["reminderType"]
  dedupKey: string
  channel: string
  title: string
  message: string
}): Promise<boolean> {
  await ensureQaWorkspaceSchema()
  const pAny = prisma as any
  if (typeof pAny.$queryRawUnsafe !== "function" || typeof pAny.$executeRawUnsafe !== "function") {
    return false
  }
  try {
    const existing: any[] = await pAny.$queryRawUnsafe(
      `SELECT "id" FROM "qa_task_reminders" WHERE "dedupKey" = ? LIMIT 1`,
      reminder.dedupKey
    )
    if (existing && existing.length > 0) return false

    const id = `qarem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const nowIso = new Date().toISOString()
    await pAny.$executeRawUnsafe(
      `INSERT INTO "qa_task_reminders" (
        "id", "taskId", "recipientUserId", "recipientName", "recipientRoleType",
        "reminderType", "dedupKey", "channel", "title", "message", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      reminder.taskId,
      reminder.recipientUserId,
      reminder.recipientName || null,
      reminder.recipientRoleType,
      reminder.reminderType,
      reminder.dedupKey,
      reminder.channel,
      reminder.title,
      reminder.message,
      nowIso
    )
    return true
  } catch {
    return false
  }
}

export async function getRecentQaReminders(limit = 50): Promise<QaReminderLogItem[]> {
  await ensureQaWorkspaceSchema()
  const pAny = prisma as any
  if (typeof pAny.$queryRawUnsafe !== "function") return []
  try {
    const rows: any[] = await pAny.$queryRawUnsafe(
      `SELECT * FROM "qa_task_reminders" ORDER BY "createdAt" DESC LIMIT ?`,
      limit
    )
    return (rows || []).map((r) => ({
      id: String(r.id),
      taskId: String(r.taskId),
      recipientUserId: String(r.recipientUserId),
      recipientName: r.recipientName ? String(r.recipientName) : null,
      recipientRoleType: (r.recipientRoleType as any) || "ASSIGNEE",
      reminderType: r.reminderType as any,
      dedupKey: String(r.dedupKey),
      channel: String(r.channel || "IN_APP"),
      title: String(r.title),
      message: String(r.message),
      createdAt: String(r.createdAt),
    }))
  } catch {
    return []
  }
}
