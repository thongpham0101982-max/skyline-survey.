import { prisma } from "@/lib/db"

export type PrivacyTier =
  | "SHARED_EDUCATIONAL"
  | "PRIVATE_ADVISORY"
  | "RESTRICTED_SAFEGUARDING"

export type WorkflowStepKey =
  | "STUDENT_GOAL"
  | "ADVISOR_REVIEW"
  | "STUDENT_ACTION"
  | "REFLECTION"
  | "ADVISORY_SESSION"
  | "SHARED_FOLLOW_UP"
  | "PARENT_FEEDBACK"
  | "PROGRESS_REVIEW"

export interface AdvisoryRecordPolicyData {
  id?: string
  entityType: "GOAL" | "GOAL_ACTION" | "CONSULTATION" | "REFLECTION" | "HELP_REQUEST" | "TERM_EVAL"
  entityId: string
  studentId: string
  academicYearId?: string
  privacyTier: PrivacyTier
  shareWithParent: boolean
  advisorReviewStatus?: "PENDING_REVIEW" | "CONFIRMED" | "NEEDS_ADJUSTMENT" | null
  advisorReviewNote?: string | null
  privateAdvisorNotes?: string | null
  parentSharedSummary?: string | null
  parentAcknowledged?: boolean
  parentFeedback?: string | null
  parentFeedbackAt?: string | null
  evidenceNotes?: string | null
  sessionFormat?: "DIRECT" | "ONLINE" | null
  sessionStatus?: "SCHEDULED" | "COMPLETED" | "FOLLOW_UP_NEEDED" | null
  updatedById?: string | null
  updatedByRole?: string | null
}

let tablesInitialized = false

export async function ensureTriPartyTables() {
  if (tablesInitialized) return
  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS "AdvisoryRecordPolicy" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "entityType" TEXT NOT NULL,
      "entityId" TEXT NOT NULL,
      "studentId" TEXT NOT NULL,
      "academicYearId" TEXT NOT NULL DEFAULT '',
      "privacyTier" TEXT NOT NULL DEFAULT 'SHARED_EDUCATIONAL',
      "shareWithParent" INTEGER NOT NULL DEFAULT 1,
      "advisorReviewStatus" TEXT,
      "advisorReviewNote" TEXT,
      "privateAdvisorNotes" TEXT,
      "parentSharedSummary" TEXT,
      "parentAcknowledged" INTEGER NOT NULL DEFAULT 0,
      "parentFeedback" TEXT,
      "parentFeedbackAt" DATETIME,
      "evidenceNotes" TEXT,
      "sessionFormat" TEXT DEFAULT 'DIRECT',
      "sessionStatus" TEXT DEFAULT 'COMPLETED',
      "updatedById" TEXT,
      "updatedByRole" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("entityType", "entityId")
    );`,
    `CREATE INDEX IF NOT EXISTS "idx_adv_policy_student" ON "AdvisoryRecordPolicy" ("studentId", "entityType");`,
    `CREATE INDEX IF NOT EXISTS "idx_adv_policy_entity" ON "AdvisoryRecordPolicy" ("entityType", "entityId");`,
    `CREATE TABLE IF NOT EXISTS "ParentAdvisorExchange" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "academicYearId" TEXT NOT NULL DEFAULT '',
      "parentId" TEXT,
      "parentName" TEXT,
      "teacherId" TEXT,
      "teacherName" TEXT,
      "topic" TEXT NOT NULL DEFAULT 'PHOI_HOP_GIA_DINH',
      "message" TEXT NOT NULL,
      "homeSupportSummary" TEXT,
      "preferredTime" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "advisorResponse" TEXT,
      "respondedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "idx_parent_exchange_student" ON "ParentAdvisorExchange" ("studentId", "academicYearId");`,
    `CREATE INDEX IF NOT EXISTS "idx_parent_exchange_status" ON "ParentAdvisorExchange" ("status");`,
    `CREATE TABLE IF NOT EXISTS "AdvisoryAuditLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "actorId" TEXT NOT NULL,
      "actorRole" TEXT NOT NULL,
      "actorName" TEXT,
      "entityType" TEXT NOT NULL,
      "entityId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "privacyTier" TEXT NOT NULL DEFAULT 'SHARED_EDUCATIONAL',
      "summary" TEXT,
      "changesJson" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "idx_adv_audit_student" ON "AdvisoryAuditLog" ("studentId", "createdAt");`,
    `CREATE TABLE IF NOT EXISTS "SubjectTeacherAdvisoryTask" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "classId" TEXT,
      "academicYearId" TEXT NOT NULL DEFAULT '',
      "subjectId" TEXT,
      "subjectName" TEXT NOT NULL,
      "currentScore" REAL,
      "assignedByTeacherId" TEXT NOT NULL,
      "assignedByTeacherName" TEXT,
      "assignedToTeacherId" TEXT NOT NULL,
      "assignedToTeacherName" TEXT,
      "consultationPrompt" TEXT NOT NULL,
      "supportGoal" TEXT NOT NULL,
      "dueDate" DATETIME,
      "aiSuggestedContext" TEXT,
      "gvbmProfessionalAssessment" TEXT,
      "gvbmProposedSolutions" TEXT,
      "gvbmParentAdvice" TEXT,
      "gvbmRespondedAt" DATETIME,
      "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
      "cvhtReviewNote" TEXT,
      "publishedParentAdvice" TEXT,
      "publishedAt" DATETIME,
      "parentAcknowledged" INTEGER NOT NULL DEFAULT 0,
      "parentAcknowledgedAt" DATETIME,
      "parentFeedback" TEXT,
      "parentRequestFollowUp" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "idx_gvbm_task_student" ON "SubjectTeacherAdvisoryTask" ("studentId", "academicYearId");`,
    `CREATE INDEX IF NOT EXISTS "idx_gvbm_task_teacher" ON "SubjectTeacherAdvisoryTask" ("assignedToTeacherId", "status");`,
    `CREATE TABLE IF NOT EXISTS "StudentHollandAssessment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "studentCode" TEXT,
      "classId" TEXT,
      "academicYearId" TEXT NOT NULL DEFAULT '',
      "version" TEXT NOT NULL DEFAULT 'SKL_PSYCH v2.6.1',
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "answeredCount" INTEGER NOT NULL DEFAULT 0,
      "currentStep" INTEGER NOT NULL DEFAULT 1,
      "answersJson" TEXT NOT NULL DEFAULT '{}',
      "scoreR" INTEGER NOT NULL DEFAULT 0,
      "scoreI" INTEGER NOT NULL DEFAULT 0,
      "scoreA" INTEGER NOT NULL DEFAULT 0,
      "scoreS" INTEGER NOT NULL DEFAULT 0,
      "scoreE" INTEGER NOT NULL DEFAULT 0,
      "scoreC" INTEGER NOT NULL DEFAULT 0,
      "hollandCode" TEXT,
      "top3Json" TEXT,
      "reportSummaryJson" TEXT,
      "studentReflection" TEXT,
      "linkedGoalIdsJson" TEXT,
      "consultationRequested" INTEGER NOT NULL DEFAULT 0,
      "consultationRequestTopic" TEXT,
      "consultationRequestNote" TEXT,
      "consultationRequestStatus" TEXT NOT NULL DEFAULT 'NONE',
      "consultationScheduledDate" TEXT,
      "advisorId" TEXT,
      "advisorName" TEXT,
      "advisorReviewNote" TEXT,
      "isPublishedToParent" INTEGER NOT NULL DEFAULT 0,
      "publishedToParentAt" DATETIME,
      "parentAcknowledged" INTEGER NOT NULL DEFAULT 0,
      "parentAcknowledgedAt" DATETIME,
      "parentFeedback" TEXT,
      "submittedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "idx_holland_student" ON "StudentHollandAssessment" ("studentId", "academicYearId");`,
    `CREATE INDEX IF NOT EXISTS "idx_holland_class" ON "StudentHollandAssessment" ("classId", "status");`,
    `CREATE TABLE IF NOT EXISTS "StudentPsychAssessment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "lookupCode" TEXT,
      "studentId" TEXT NOT NULL,
      "studentCode" TEXT,
      "studentName" TEXT,
      "classId" TEXT,
      "className" TEXT,
      "campusName" TEXT,
      "gradeLevel" INTEGER,
      "academicYearId" TEXT NOT NULL DEFAULT '',
      "testCode" TEXT NOT NULL,
      "testName" TEXT,
      "version" TEXT NOT NULL DEFAULT 'SKL_PSYCH v2.6.1',
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "answeredCount" INTEGER NOT NULL DEFAULT 0,
      "totalQuestions" INTEGER NOT NULL DEFAULT 0,
      "currentStep" INTEGER NOT NULL DEFAULT 1,
      "durationSeconds" INTEGER NOT NULL DEFAULT 0,
      "answersJson" TEXT NOT NULL DEFAULT '[]',
      "primaryResultCode" TEXT,
      "primaryResultLabel" TEXT,
      "validityStatus" TEXT NOT NULL DEFAULT 'VALID',
      "scoresSummaryJson" TEXT NOT NULL DEFAULT '{}',
      "profileAnalysisJson" TEXT NOT NULL DEFAULT '{}',
      "studentReflection" TEXT,
      "linkedGoalIdsJson" TEXT,
      "consultationRequested" INTEGER NOT NULL DEFAULT 0,
      "consultationRequestTopic" TEXT,
      "consultationRequestNote" TEXT,
      "consultationRequestStatus" TEXT NOT NULL DEFAULT 'NONE',
      "consultationScheduledDate" TEXT,
      "advisorId" TEXT,
      "advisorName" TEXT,
      "advisorReviewNote" TEXT,
      "isPublishedToParent" INTEGER NOT NULL DEFAULT 1,
      "publishedToParentAt" DATETIME,
      "parentAcknowledged" INTEGER NOT NULL DEFAULT 0,
      "parentAcknowledgedAt" DATETIME,
      "parentFeedback" TEXT,
      "submittedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "idx_psych_student" ON "StudentPsychAssessment" ("studentId", "testCode", "status");`,
    `CREATE INDEX IF NOT EXISTS "idx_psych_class" ON "StudentPsychAssessment" ("classId", "testCode", "status");`,
    `CREATE INDEX IF NOT EXISTS "idx_psych_lookup" ON "StudentPsychAssessment" ("lookupCode");`,
    `CREATE TABLE IF NOT EXISTS "AdvisoryJourneyState" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "classId" TEXT,
      "academicYearId" TEXT NOT NULL DEFAULT '',
      "term" TEXT NOT NULL DEFAULT 'HK1',
      "profileInitialized" INTEGER NOT NULL DEFAULT 0,
      "profileInitializedAt" DATETIME,
      "initialConsultDone" INTEGER NOT NULL DEFAULT 0,
      "initialConsultAt" DATETIME,
      "currentLoopIndex" INTEGER NOT NULL DEFAULT 1,
      "loopNotes" TEXT,
      "rubricApprovalStatus" TEXT NOT NULL DEFAULT 'DRAFT',
      "submittedForApprovalAt" DATETIME,
      "approvedById" TEXT,
      "approvedByName" TEXT,
      "approvedAt" DATETIME,
      "approvalNote" TEXT,
      "isPublishedToParent" INTEGER NOT NULL DEFAULT 0,
      "publishedAt" DATETIME,
      "nextTermPrepared" INTEGER NOT NULL DEFAULT 0,
      "nextTermPreparedAt" DATETIME,
      "nextTermPlanNote" TEXT,
      "customDeadlinesJson" TEXT NOT NULL DEFAULT '{}',
      "updatedById" TEXT,
      "updatedByName" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("studentId", "academicYearId", "term")
    );`,
    `CREATE INDEX IF NOT EXISTS "idx_adv_journey_student" ON "AdvisoryJourneyState" ("studentId", "academicYearId", "term");`,
    `CREATE INDEX IF NOT EXISTS "idx_adv_journey_class" ON "AdvisoryJourneyState" ("classId", "term");`,
    `CREATE TABLE IF NOT EXISTS "AdvisoryReminderConfig" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "dueSoonHours" INTEGER NOT NULL DEFAULT 48,
      "overdueEscalateHours" INTEGER NOT NULL DEFAULT 24,
      "cooldownHours" INTEGER NOT NULL DEFAULT 12,
      "unupdatedProgressDays" INTEGER NOT NULL DEFAULT 14,
      "enableInApp" INTEGER NOT NULL DEFAULT 1,
      "updatedById" TEXT,
      "updatedByName" TEXT,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS "StudentGoalMeta" (
      "goalId" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "academicYearId" TEXT NOT NULL DEFAULT '',
      "term" TEXT NOT NULL DEFAULT 'HK1',
      "basisText" TEXT,
      "baselineValue" TEXT,
      "targetValue" TEXT,
      "deadlineDate" TEXT,
      "actionPlanText" TEXT,
      "assigneeName" TEXT,
      "updateMilestone" TEXT,
      "currentResultText" TEXT,
      "evidenceText" TEXT,
      "progressUpdatedAt" DATETIME,
      "companionTeacherId" TEXT,
      "companionTeacherName" TEXT,
      "advisorComment" TEXT,
      "nextStepNote" TEXT,
      "progressOutcome" TEXT NOT NULL DEFAULT 'INSUFFICIENT_DATA',
      "evaluatedById" TEXT,
      "evaluatedByName" TEXT,
      "evaluatedTerm" TEXT,
      "historyJson" TEXT NOT NULL DEFAULT '[]',
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "idx_goal_meta_student" ON "StudentGoalMeta" ("studentId", "academicYearId");`,
    `CREATE TABLE IF NOT EXISTS "AdvisoryConsultationMeta" (
      "consultationId" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "academicYearId" TEXT NOT NULL DEFAULT '',
      "term" TEXT NOT NULL DEFAULT 'HK1',
      "linkedGoalIdsJson" TEXT NOT NULL DEFAULT '[]',
      "actionAssignee" TEXT,
      "nextFollowUpDate" TEXT,
      "consultationStatus" TEXT NOT NULL DEFAULT 'COMPLETED',
      "studentFeedbackStatus" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
      "advisorProcessStatus" TEXT NOT NULL DEFAULT 'NONE',
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "idx_consult_meta_student" ON "AdvisoryConsultationMeta" ("studentId", "academicYearId");`,
    `CREATE TABLE IF NOT EXISTS "StudentAdvisoryFeedback" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "classId" TEXT,
      "academicYearId" TEXT NOT NULL DEFAULT '',
      "term" TEXT NOT NULL DEFAULT 'HK1',
      "feedbackType" TEXT NOT NULL DEFAULT 'POST_CONSULTATION',
      "consultationId" TEXT,
      "goalId" TEXT,
      "goalCategory" TEXT,
      "postConsultFeeling" TEXT,
      "listenedAndRespectedScore" INTEGER NOT NULL DEFAULT 5,
      "understoodNextSteps" INTEGER NOT NULL DEFAULT 1,
      "goalAndActionSuitability" TEXT NOT NULL DEFAULT 'PHU_HOP',
      "supportRequestText" TEXT,
      "wantsMoreDiscussion" INTEGER NOT NULL DEFAULT 0,
      "actionsTakenText" TEXT,
      "resultsAndEvidenceText" TEXT,
      "difficultiesText" TEXT,
      "supportNeededText" TEXT,
      "adjustmentProposalText" TEXT,
      "shareWithParent" INTEGER NOT NULL DEFAULT 1,
      "studentStatus" TEXT NOT NULL DEFAULT 'SUBMITTED',
      "advisorProcessStatus" TEXT NOT NULL DEFAULT 'PENDING',
      "needsAttention" INTEGER NOT NULL DEFAULT 0,
      "advisorReplyText" TEXT,
      "advisorResolutionAction" TEXT,
      "assignedSupportTeacherId" TEXT,
      "assignedSupportTeacherName" TEXT,
      "nextConsultDate" TEXT,
      "processedById" TEXT,
      "processedByName" TEXT,
      "processedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "idx_adv_feedback_student" ON "StudentAdvisoryFeedback" ("studentId", "academicYearId", "feedbackType");`,
    `CREATE INDEX IF NOT EXISTS "idx_adv_feedback_class" ON "StudentAdvisoryFeedback" ("classId", "advisorProcessStatus");`,
    `CREATE TABLE IF NOT EXISTS "OrientationAdvisoryRecord" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "classId" TEXT,
      "academicYearId" TEXT NOT NULL DEFAULT '',
      "activeAssessmentId" TEXT NOT NULL,
      "hollandCode" TEXT,
      "scoresJson" TEXT NOT NULL DEFAULT '{}',
      "topGroupsJson" TEXT NOT NULL DEFAULT '[]',
      "surveyBatch" TEXT NOT NULL DEFAULT 'Đợt 1',
      "surveyDate" DATETIME,
      "workflowStatus" TEXT NOT NULL DEFAULT 'CHO_PHAN_CONG',
      "assignedById" TEXT,
      "assignedByName" TEXT,
      "assignedTlhnTeacherId" TEXT,
      "assignedTlhnTeacherName" TEXT,
      "assignmentPrompt" TEXT,
      "expectedOutcome" TEXT,
      "dueDate" DATETIME,
      "acceptedAt" DATETIME,
      "rejectReason" TEXT,
      "tlhnDiscussionNotes" TEXT,
      "studentInterestsAndStrengths" TEXT,
      "studentConcernsAndAspirations" TEXT,
      "proposedDevelopmentGoals" TEXT,
      "agreedGoalId" TEXT,
      "agreedGoalText" TEXT,
      "linkedSpecialSubjectsJson" TEXT NOT NULL DEFAULT '[]',
      "tlhnEvidenceAndNextSteps" TEXT,
      "isPublishedToParent" INTEGER NOT NULL DEFAULT 0,
      "notifiedCoordinator" INTEGER NOT NULL DEFAULT 0,
      "completedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("studentId", "academicYearId")
    );`,
    `CREATE INDEX IF NOT EXISTS "idx_orient_record_student" ON "OrientationAdvisoryRecord" ("studentId", "academicYearId");`,
    `CREATE INDEX IF NOT EXISTS "idx_orient_record_tlhn" ON "OrientationAdvisoryRecord" ("assignedTlhnTeacherId", "workflowStatus");`
  ]

  const alterStatements = [
    `ALTER TABLE "SubjectTeacherAdvisoryTask" ADD COLUMN "companionType" TEXT NOT NULL DEFAULT 'GVBM'`,
    `ALTER TABLE "SubjectTeacherAdvisoryTask" ADD COLUMN "goalId" TEXT`,
    `ALTER TABLE "SubjectTeacherAdvisoryTask" ADD COLUMN "goalTitle" TEXT`,
    `ALTER TABLE "SubjectTeacherAdvisoryTask" ADD COLUMN "goalCategory" TEXT`,
    `ALTER TABLE "SubjectTeacherAdvisoryTask" ADD COLUMN "expectedOutcome" TEXT`,
    `ALTER TABLE "SubjectTeacherAdvisoryTask" ADD COLUMN "acceptDeadline" DATETIME`,
    `ALTER TABLE "SubjectTeacherAdvisoryTask" ADD COLUMN "updateMilestone" TEXT`,
    `ALTER TABLE "SubjectTeacherAdvisoryTask" ADD COLUMN "executionLogJson" TEXT NOT NULL DEFAULT '[]'`,
    `ALTER TABLE "SubjectTeacherAdvisoryTask" ADD COLUMN "evidenceAndProposal" TEXT`,
    `ALTER TABLE "SubjectTeacherAdvisoryTask" ADD COLUMN "declineReason" TEXT`,
    `ALTER TABLE "SubjectTeacherAdvisoryTask" ADD COLUMN "supplementRequestNote" TEXT`
  ]

  for (const sql of ddlStatements) {
    try {
      await prisma.$executeRawUnsafe(sql)
    } catch (err) {
      console.error("[TriPartySync] DDL warning:", err)
    }
  }
  for (const sql of alterStatements) {
    try {
      await prisma.$executeRawUnsafe(sql)
    } catch {
      // Column already exists
    }
  }
  tablesInitialized = true
}

export async function upsertRecordPolicy(data: AdvisoryRecordPolicyData) {
  await ensureTriPartyTables()
  const id = data.id || `pol_${data.entityType.toLowerCase()}_${data.entityId}`
  const shareInt = data.shareWithParent ? 1 : 0
  const ackInt = data.parentAcknowledged ? 1 : 0

  await prisma.$executeRawUnsafe(
    `INSERT INTO "AdvisoryRecordPolicy" (
      "id", "entityType", "entityId", "studentId", "academicYearId",
      "privacyTier", "shareWithParent", "advisorReviewStatus", "advisorReviewNote",
      "privateAdvisorNotes", "parentSharedSummary", "parentAcknowledged",
      "parentFeedback", "parentFeedbackAt", "evidenceNotes",
      "sessionFormat", "sessionStatus", "updatedById", "updatedByRole",
      "createdAt", "updatedAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT("entityType", "entityId") DO UPDATE SET
      "privacyTier" = COALESCE(excluded."privacyTier", "AdvisoryRecordPolicy"."privacyTier"),
      "shareWithParent" = excluded."shareWithParent",
      "advisorReviewStatus" = COALESCE(excluded."advisorReviewStatus", "AdvisoryRecordPolicy"."advisorReviewStatus"),
      "advisorReviewNote" = COALESCE(excluded."advisorReviewNote", "AdvisoryRecordPolicy"."advisorReviewNote"),
      "privateAdvisorNotes" = COALESCE(excluded."privateAdvisorNotes", "AdvisoryRecordPolicy"."privateAdvisorNotes"),
      "parentSharedSummary" = COALESCE(excluded."parentSharedSummary", "AdvisoryRecordPolicy"."parentSharedSummary"),
      "parentAcknowledged" = CASE WHEN excluded."parentAcknowledged" = 1 THEN 1 ELSE "AdvisoryRecordPolicy"."parentAcknowledged" END,
      "parentFeedback" = COALESCE(excluded."parentFeedback", "AdvisoryRecordPolicy"."parentFeedback"),
      "parentFeedbackAt" = COALESCE(excluded."parentFeedbackAt", "AdvisoryRecordPolicy"."parentFeedbackAt"),
      "evidenceNotes" = COALESCE(excluded."evidenceNotes", "AdvisoryRecordPolicy"."evidenceNotes"),
      "sessionFormat" = COALESCE(excluded."sessionFormat", "AdvisoryRecordPolicy"."sessionFormat"),
      "sessionStatus" = COALESCE(excluded."sessionStatus", "AdvisoryRecordPolicy"."sessionStatus"),
      "updatedById" = COALESCE(excluded."updatedById", "AdvisoryRecordPolicy"."updatedById"),
      "updatedByRole" = COALESCE(excluded."updatedByRole", "AdvisoryRecordPolicy"."updatedByRole"),
      "updatedAt" = CURRENT_TIMESTAMP`,
    id,
    data.entityType,
    data.entityId,
    data.studentId,
    data.academicYearId || "",
    data.privacyTier || "SHARED_EDUCATIONAL",
    shareInt,
    data.advisorReviewStatus ?? null,
    data.advisorReviewNote ?? null,
    data.privateAdvisorNotes ?? null,
    data.parentSharedSummary ?? null,
    ackInt,
    data.parentFeedback ?? null,
    data.parentFeedbackAt ?? null,
    data.evidenceNotes ?? null,
    data.sessionFormat ?? null,
    data.sessionStatus ?? null,
    data.updatedById ?? null,
    data.updatedByRole ?? null
  )
}

export async function getPoliciesByStudentIds(
  studentIds: string[],
  entityType?: string
): Promise<Map<string, any>> {
  const map = new Map<string, any>()
  if (!studentIds || studentIds.length === 0) return map
  await ensureTriPartyTables()

  try {
    const placeholders = studentIds.map(() => "?").join(",")
    const sql = entityType
      ? `SELECT * FROM "AdvisoryRecordPolicy" WHERE "studentId" IN (${placeholders}) AND "entityType" = ?`
      : `SELECT * FROM "AdvisoryRecordPolicy" WHERE "studentId" IN (${placeholders})`
    const args = entityType ? [...studentIds, entityType] : [...studentIds]
    const rows: any[] = await prisma.$queryRawUnsafe(sql, ...args)
    for (const r of rows || []) {
      const key = `${r.entityType}:${r.entityId}`
      map.set(key, {
        ...r,
        shareWithParent: Boolean(Number(r.shareWithParent)),
        parentAcknowledged: Boolean(Number(r.parentAcknowledged))
      })
    }
  } catch (err) {
    console.error("[TriPartySync] getPoliciesByStudentIds error:", err)
  }
  return map
}

export async function getPolicyForEntity(
  entityType: string,
  entityId: string
): Promise<any | null> {
  if (!entityId) return null
  await ensureTriPartyTables()
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "AdvisoryRecordPolicy" WHERE "entityType" = ? AND "entityId" = ? LIMIT 1`,
      entityType,
      entityId
    )
    if (rows && rows.length > 0) {
      const r = rows[0]
      return {
        ...r,
        shareWithParent: Boolean(Number(r.shareWithParent)),
        parentAcknowledged: Boolean(Number(r.parentAcknowledged))
      }
    }
  } catch (err) {
    console.error("[TriPartySync] getPolicyForEntity error:", err)
  }
  return null
}

export async function appendAdvisoryAuditLog(params: {
  studentId: string
  actorId: string
  actorRole: string
  actorName?: string
  entityType: string
  entityId: string
  action: string
  privacyTier?: PrivacyTier
  summary?: string
  changes?: Record<string, any>
}) {
  await ensureTriPartyTables()
  const id = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AdvisoryAuditLog" (
        "id", "studentId", "actorId", "actorRole", "actorName",
        "entityType", "entityId", "action", "privacyTier", "summary", "changesJson", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      id,
      params.studentId,
      params.actorId || "system",
      params.actorRole || "SYSTEM",
      params.actorName || null,
      params.entityType,
      params.entityId,
      params.action,
      params.privacyTier || "SHARED_EDUCATIONAL",
      params.summary || null,
      params.changes ? JSON.stringify(params.changes) : null
    )
  } catch (err) {
    console.error("[TriPartySync] appendAdvisoryAuditLog error:", err)
  }
}

export async function listAdvisoryAuditLogs(studentIds: string[], viewerRole: string) {
  if (!studentIds || studentIds.length === 0) return []
  await ensureTriPartyTables()
  try {
    const placeholders = studentIds.map(() => "?").join(",")
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "AdvisoryAuditLog" WHERE "studentId" IN (${placeholders}) ORDER BY "createdAt" DESC LIMIT 100`,
      ...studentIds
    )
    return (rows || []).filter(r => {
      if (viewerRole === "PARENT") {
        return r.privacyTier === "SHARED_EDUCATIONAL"
      }
      if (viewerRole === "STUDENT") {
        return r.privacyTier !== "PRIVATE_ADVISORY" || r.actorRole === "STUDENT"
      }
      return true
    })
  } catch {
    return []
  }
}

export function computeWorkflowProgress(params: {
  goals: any[]
  consultations: any[]
  reflections: any[]
  actionItems: any[]
  termEvaluations: any[]
  parentExchanges?: any[]
}) {
  const { goals = [], consultations = [], reflections = [], actionItems = [], termEvaluations = [], parentExchanges = [] } = params

  const hasGoals = goals.length > 0 && goals.some(g => g.targetText)
  const isAdvisorReviewed = goals.some(
    g => g.signedByTeacher || g.teacherComment || g.advisorReviewStatus === "CONFIRMED" || g.advisorReviewStatus === "NEEDS_ADJUSTMENT"
  )
  const hasActions =
    actionItems.length > 0 ||
    goals.some(g => Array.isArray(g.actions) && g.actions.some((a: any) => a.status === "DOING" || a.status === "DONE" || a.status === "COMPLETED"))
  const hasReflections =
    reflections.length > 0 || consultations.some(c => Boolean(c.studentReflection))
  const hasSession = consultations.length > 0
  const hasSharedFollowUp = consultations.some(
    c => c.shareWithParent !== false && (c.nextActions || c.parentSharedSummary || c.notes)
  )
  const hasParentFeedback =
    goals.some(g => g.signedByParent || g.parentMessage) ||
    consultations.some(c => c.parentAcknowledged || c.parentFeedback) ||
    parentExchanges.length > 0
  const hasProgressReview = termEvaluations.length > 0

  const steps: {
    key: WorkflowStepKey
    stepNumber: number
    label: string
    actor: string
    completed: boolean
  }[] = [
    { key: "STUDENT_GOAL", stepNumber: 1, label: "1. Học sinh lập mục tiêu SMART", actor: "STUDENT", completed: hasGoals },
    { key: "ADVISOR_REVIEW", stepNumber: 2, label: "2. CVHT xác nhận / góp ý", actor: "TEACHER", completed: isAdvisorReviewed },
    { key: "STUDENT_ACTION", stepNumber: 3, label: "3. Hành động 7 ngày & minh chứng", actor: "STUDENT", completed: hasActions },
    { key: "REFLECTION", stepNumber: 4, label: "4. Học sinh tự phản tư", actor: "STUDENT", completed: hasReflections },
    { key: "ADVISORY_SESSION", stepNumber: 5, label: "5. Phiên cố vấn 1:1", actor: "TEACHER", completed: hasSession },
    { key: "SHARED_FOLLOW_UP", stepNumber: 6, label: "6. Chia sẻ khuyến nghị PHHS", actor: "TEACHER", completed: hasSharedFollowUp },
    { key: "PARENT_FEEDBACK", stepNumber: 7, label: "7. Phụ huynh phản hồi hỗ trợ", actor: "PARENT", completed: hasParentFeedback },
    { key: "PROGRESS_REVIEW", stepNumber: 8, label: "8. Đánh giá tiến bộ định kỳ", actor: "ALL", completed: hasProgressReview }
  ]

  const completedCount = steps.filter(s => s.completed).length
  const currentStep = steps.find(s => !s.completed) || steps[steps.length - 1]

  return {
    steps,
    completedCount,
    totalSteps: steps.length,
    percent: Math.round((completedCount / steps.length) * 100),
    currentStepKey: currentStep.key,
    currentStepLabel: currentStep.label
  }
}


export const getRecordPolicy = getPolicyForEntity
