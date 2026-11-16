import { prisma } from "@/lib/db"
import { createClient } from "@libsql/client"
import fs from "fs"
import path from "path"

let schemaEnsuredVersion = 0
const CURRENT_SCHEMA_VERSION = 4
let schemaPromise: Promise<void> | null = null

const FALLBACK_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "slc_feature_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL DEFAULT 'DEFAULT',
    "isEnabled" BOOLEAN NOT NULL DEFAULT 1,
    "pilotMode" BOOLEAN NOT NULL DEFAULT 0,
    "allowedCampusIdsJson" TEXT NOT NULL DEFAULT '["ALL"]',
    "allowedUserIdsJson" TEXT NOT NULL DEFAULT '[]',
    "allowedRolesJson" TEXT NOT NULL DEFAULT '["ALL"]',
    "maxImageSizeMb" INTEGER NOT NULL DEFAULT 10,
    "maxDocSizeMb" INTEGER NOT NULL DEFAULT 25,
    "maxFilesPerPost" INTEGER NOT NULL DEFAULT 5,
    "allowedMimeTypesJson" TEXT NOT NULL DEFAULT '["image/jpeg","image/png","image/webp","image/gif","application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.presentationml.presentation","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]',
    "workingDaysJson" TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
    "holidaysJson" TEXT NOT NULL DEFAULT '[]',
    "bumpCooldownMinutes" INTEGER NOT NULL DEFAULT 30,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "slc_feature_configs_key_key" ON "slc_feature_configs"("key")`,
]

const ADDITIVE_COCREATE_STATEMENTS: string[] = [
  `ALTER TABLE "slc_feature_configs" ADD COLUMN "bumpCooldownMinutes" INTEGER NOT NULL DEFAULT 30;`,
  `ALTER TABLE "slc_posts" ADD COLUMN "lastBumpedAt" DATETIME NOT NULL DEFAULT '2026-01-01T00:00:00.000Z';`,
  `UPDATE "slc_posts" SET "lastBumpedAt" = COALESCE("publishedAt", "createdAt") WHERE "lastBumpedAt" = '2026-01-01T00:00:00.000Z';`,
  `ALTER TABLE "slc_posts" ADD COLUMN "bumpEventsJson" TEXT NOT NULL DEFAULT '[]';`,
  `CREATE INDEX IF NOT EXISTS "slc_posts_status_visibility_lastBumpedAt_id_idx" ON "slc_posts"("status", "visibility", "lastBumpedAt", "id");`,
  `ALTER TABLE "slc_comments" ADD COLUMN "contributionType" TEXT NOT NULL DEFAULT 'NONE';`,
  `ALTER TABLE "slc_comments" ADD COLUMN "linksJson" TEXT NOT NULL DEFAULT '[]';`,
  `ALTER TABLE "slc_comments" ADD COLUMN "linkedProjectId" TEXT;`,
  `ALTER TABLE "slc_comments" ADD COLUMN "developmentItemNote" TEXT;`,
  `ALTER TABLE "slc_comments" ADD COLUMN "appliedChangeNote" TEXT;`,
  `ALTER TABLE "slc_comments" ADD COLUMN "helpRequestId" TEXT;`,
  `ALTER TABLE "slc_comments" ADD COLUMN "statusHistoryJson" TEXT NOT NULL DEFAULT '[]';`,
  `CREATE TABLE IF NOT EXISTS "slc_help_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorAvatar" TEXT,
    "campusId" TEXT,
    "campusName" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "supportType" TEXT NOT NULL DEFAULT 'EXPERIMENT',
    "subjectCode" TEXT,
    "gradeLevel" TEXT,
    "expectedTimeframe" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "connectedUserId" TEXT,
    "connectedUserName" TEXT,
    "connectedCommentId" TEXT,
    "connectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "slc_help_requests_postId_fkey" FOREIGN KEY ("postId") REFERENCES "slc_posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "slc_help_requests_postId_status_createdAt_idx" ON "slc_help_requests"("postId", "status", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "slc_help_requests_status_supportType_createdAt_idx" ON "slc_help_requests"("status", "supportType", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "slc_help_requests_authorId_idx" ON "slc_help_requests"("authorId");`,
  // v4: Cộng đồng sáng tạo & Skills môn học
  `ALTER TABLE "slc_posts" ADD COLUMN "departmentId" TEXT;`,
  `ALTER TABLE "slc_posts" ADD COLUMN "departmentName" TEXT;`,
  `ALTER TABLE "slc_posts" ADD COLUMN "videoUrl" TEXT;`,
  `ALTER TABLE "slc_posts" ADD COLUMN "demoUrl" TEXT;`,
  `ALTER TABLE "slc_posts" ADD COLUMN "topicName" TEXT;`,
  `ALTER TABLE "slc_posts" ADD COLUMN "previousStatus" TEXT;`,
  `ALTER TABLE "slc_posts" ADD COLUMN "deletedAt" DATETIME;`,
  `ALTER TABLE "slc_posts" ADD COLUMN "deletedById" TEXT;`,
  `ALTER TABLE "slc_posts" ADD COLUMN "collaboratorIdsJson" TEXT NOT NULL DEFAULT '[]';`,
  `ALTER TABLE "slc_posts" ADD COLUMN "collaboratorNamesJson" TEXT NOT NULL DEFAULT '[]';`,
  `ALTER TABLE "slc_posts" ADD COLUMN "linkedSkillId" TEXT;`,
  `ALTER TABLE "slc_posts" ADD COLUMN "appliedCount" INTEGER NOT NULL DEFAULT 0;`,
  `CREATE INDEX IF NOT EXISTS "slc_posts_departmentId_status_idx" ON "slc_posts"("departmentId", "status");`,
  `CREATE TABLE IF NOT EXISTS "slc_skills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "postId" TEXT,
    "parentSkillId" TEXT,
    "originalAuthorId" TEXT,
    "originalAuthorName" TEXT,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "campusId" TEXT,
    "campusName" TEXT,
    "departmentId" TEXT,
    "departmentName" TEXT,
    "collaboratorsJson" TEXT NOT NULL DEFAULT '[]',
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "workCategory" TEXT NOT NULL DEFAULT 'ACTIVITY_DESIGN',
    "subjectCode" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "gradeLevelsJson" TEXT NOT NULL DEFAULT '[]',
    "topicOrLesson" TEXT,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "prerequisites" TEXT,
    "inputFieldsJson" TEXT NOT NULL DEFAULT '[]',
    "aiSystemPrompt" TEXT NOT NULL,
    "workflowStepsJson" TEXT NOT NULL DEFAULT '[]',
    "principlesAndLimits" TEXT,
    "outputStructure" TEXT,
    "evaluationCriteria" TEXT,
    "referencesJson" TEXT NOT NULL DEFAULT '[]',
    "samplePrompt" TEXT,
    "sampleOutput" TEXT,
    "compatiblePlatformsJson" TEXT NOT NULL DEFAULT '["SSM_INTERNAL","GEMINI","CHATGPT"]',
    "usageGuide" TEXT,
    "isExecutableOnSsm" BOOLEAN NOT NULL DEFAULT 0,
    "packageAttachmentId" TEXT,
    "packageMetaJson" TEXT NOT NULL DEFAULT '{}',
    "externalUrl" TEXT,
    "currentVersion" TEXT NOT NULL DEFAULT '1.0',
    "publishedVersionId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'SYSTEM',
    "groupId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "previousStatus" TEXT,
    "creationSource" TEXT NOT NULL DEFAULT 'FORM',
    "evidenceBriefId" TEXT,
    "assignedReviewerId" TEXT,
    "assignedReviewerName" TEXT,
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" DATETIME,
    "publishedAt" DATETIME,
    "appliedCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "avgRating" REAL NOT NULL DEFAULT 0,
    "validRatingCount" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" DATETIME,
    "deletedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "slc_skills_code_key" ON "slc_skills"("code");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "slc_skills_postId_key" ON "slc_skills"("postId");`,
  `CREATE INDEX IF NOT EXISTS "slc_skills_status_visibility_workCategory_idx" ON "slc_skills"("status", "visibility", "workCategory");`,
  `CREATE INDEX IF NOT EXISTS "slc_skills_subjectCode_status_idx" ON "slc_skills"("subjectCode", "status");`,
  `CREATE INDEX IF NOT EXISTS "slc_skills_authorId_status_idx" ON "slc_skills"("authorId", "status");`,
  `CREATE INDEX IF NOT EXISTS "slc_skills_campusId_status_idx" ON "slc_skills"("campusId", "status");`,
  `CREATE INDEX IF NOT EXISTS "slc_skills_departmentId_status_idx" ON "slc_skills"("departmentId", "status");`,
  `CREATE TABLE IF NOT EXISTS "slc_skill_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skillId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "changelog" TEXT NOT NULL,
    "snapshotJson" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "reviewerId" TEXT,
    "reviewerName" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "slc_skill_versions_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "slc_skills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "slc_skill_versions_skillId_createdAt_idx" ON "slc_skill_versions"("skillId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "slc_skill_versions_skillId_status_idx" ON "slc_skill_versions"("skillId", "status");`,
  `CREATE TABLE IF NOT EXISTS "slc_skill_work_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "slc_skill_work_categories_code_key" ON "slc_skill_work_categories"("code");`,
  `CREATE TABLE IF NOT EXISTS "slc_skill_evidence_briefs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "campusId" TEXT,
    "departmentId" TEXT,
    "academicYearId" TEXT NOT NULL,
    "academicYearName" TEXT,
    "evaluationPeriod" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "subjectId" TEXT,
    "subjectCode" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "topicOrLesson" TEXT,
    "sourcesStatusJson" TEXT NOT NULL DEFAULT '[]',
    "deterministicStatsJson" TEXT NOT NULL DEFAULT '{}',
    "aiInterpretationJson" TEXT NOT NULL DEFAULT '{}',
    "proposedActionsJson" TEXT NOT NULL DEFAULT '[]',
    "teacherConfirmedJson" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'REVIEWED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "slc_skill_evidence_briefs_userId_createdAt_idx" ON "slc_skill_evidence_briefs"("userId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "slc_skill_evidence_briefs_classId_subjectCode_academicYearId_idx" ON "slc_skill_evidence_briefs"("classId", "subjectCode", "academicYearId");`,
  `CREATE TABLE IF NOT EXISTS "slc_skill_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skillId" TEXT NOT NULL,
    "skillVersion" TEXT NOT NULL DEFAULT '1.0',
    "runnerUserId" TEXT NOT NULL,
    "runnerName" TEXT NOT NULL,
    "runnerCampusId" TEXT,
    "academicYearId" TEXT,
    "evaluationPeriod" TEXT,
    "classId" TEXT,
    "className" TEXT,
    "subjectCode" TEXT,
    "inputValuesJson" TEXT NOT NULL DEFAULT '{}',
    "boundContextSummaryJson" TEXT NOT NULL DEFAULT '{}',
    "outputText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "errorMessage" TEXT,
    "aiModel" TEXT,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" REAL NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "clientRequestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "slc_skill_runs_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "slc_skills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "slc_skill_runs_runnerUserId_clientRequestId_key" ON "slc_skill_runs"("runnerUserId", "clientRequestId");`,
  `CREATE INDEX IF NOT EXISTS "slc_skill_runs_skillId_createdAt_idx" ON "slc_skill_runs"("skillId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "slc_skill_runs_runnerUserId_createdAt_idx" ON "slc_skill_runs"("runnerUserId", "createdAt");`,
  `CREATE TABLE IF NOT EXISTS "slc_applied_confirmations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "postId" TEXT,
    "skillId" TEXT,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "campusId" TEXT,
    "campusName" TEXT,
    "classOrGrade" TEXT,
    "subjectCode" TEXT,
    "feedbackText" TEXT,
    "evidenceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "slc_applied_confirmations_targetType_targetId_userId_key" ON "slc_applied_confirmations"("targetType", "targetId", "userId");`,
  `CREATE INDEX IF NOT EXISTS "slc_applied_confirmations_targetType_targetId_idx" ON "slc_applied_confirmations"("targetType", "targetId");`,
  `CREATE INDEX IF NOT EXISTS "slc_applied_confirmations_userId_createdAt_idx" ON "slc_applied_confirmations"("userId", "createdAt");`,
]

interface SqliteTableConfig {
  tableName: string
  hasUpdatedAt: boolean
  booleanColumns?: string[]
  numberColumns?: string[]
  defaults?: Record<string, any>
}

function generateSlcId(prefix = "slc"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

function toSqlValue(val: any): any {
  if (val === undefined || val === null) return null
  if (typeof val === "boolean") return val ? 1 : 0
  if (val instanceof Date) return val.toISOString()
  if (typeof val === "object") return JSON.stringify(val)
  return val
}

function normalizeRow(
  row: any,
  config: SqliteTableConfig,
  select?: Record<string, any>
): any {
  if (!row) return null
  const out: Record<string, any> = { ...row }
  for (const col of config.booleanColumns || []) {
    if (col in out) {
      out[col] = Boolean(
        out[col] === true || out[col] === 1 || out[col] === "1" || out[col] === "true"
      )
    }
  }
  for (const col of config.numberColumns || []) {
    if (col in out) {
      out[col] = out[col] === null || out[col] === undefined ? 0 : Number(out[col])
    }
  }
  if (select && typeof select === "object") {
    const picked: Record<string, any> = {}
    for (const [k, v] of Object.entries(select)) {
      if (v) picked[k] = out[k]
    }
    return picked
  }
  return out
}

const PRISMA_FILTER_OPERATORS = new Set([
  "equals",
  "in",
  "notIn",
  "not",
  "contains",
  "startsWith",
  "endsWith",
  "gt",
  "gte",
  "lt",
  "lte",
])

function buildWhereClause(where: any): { sql: string; params: any[] } {
  if (!where || typeof where !== "object" || Object.keys(where).length === 0) {
    return { sql: "1=1", params: [] }
  }

  const clauses: string[] = []
  const params: any[] = []

  for (const [key, val] of Object.entries(where)) {
    if (val === undefined) continue

    if (key === "OR" && Array.isArray(val)) {
      const subClauses: string[] = []
      for (const item of val) {
        const sub = buildWhereClause(item)
        if (sub.sql && sub.sql !== "1=1") {
          subClauses.push(`(${sub.sql})`)
          params.push(...sub.params)
        }
      }
      if (subClauses.length > 0) {
        clauses.push(`(${subClauses.join(" OR ")})`)
      }
      continue
    }

    if (key === "AND" && Array.isArray(val)) {
      const subClauses: string[] = []
      for (const item of val) {
        const sub = buildWhereClause(item)
        if (sub.sql && sub.sql !== "1=1") {
          subClauses.push(`(${sub.sql})`)
          params.push(...sub.params)
        }
      }
      if (subClauses.length > 0) {
        clauses.push(`(${subClauses.join(" AND ")})`)
      }
      continue
    }

    if (key === "NOT" && val && typeof val === "object") {
      const sub = buildWhereClause(val)
      if (sub.sql && sub.sql !== "1=1") {
        clauses.push(`NOT (${sub.sql})`)
        params.push(...sub.params)
      }
      continue
    }

    if (val === null) {
      clauses.push(`"${key}" IS NULL`)
      continue
    }

    if (typeof val === "object" && !(val instanceof Date) && !Array.isArray(val)) {
      const valObj = val as Record<string, any>
      const keys = Object.keys(valObj)
      const isOperatorObj = keys.some((k) => PRISMA_FILTER_OPERATORS.has(k))

      if (isOperatorObj) {
        if ("equals" in valObj) {
          if (valObj.equals === null) {
            clauses.push(`"${key}" IS NULL`)
          } else {
            clauses.push(`"${key}" = ?`)
            params.push(toSqlValue(valObj.equals))
          }
        }
        if ("in" in valObj && Array.isArray(valObj.in)) {
          if (valObj.in.length === 0) {
            clauses.push("1=0")
          } else {
            clauses.push(`"${key}" IN (${valObj.in.map(() => "?").join(", ")})`)
            params.push(...valObj.in.map(toSqlValue))
          }
        }
        if ("notIn" in valObj && Array.isArray(valObj.notIn)) {
          if (valObj.notIn.length > 0) {
            clauses.push(`"${key}" NOT IN (${valObj.notIn.map(() => "?").join(", ")})`)
            params.push(...valObj.notIn.map(toSqlValue))
          }
        }
        if ("not" in valObj) {
          if (valObj.not === null) {
            clauses.push(`"${key}" IS NOT NULL`)
          } else {
            clauses.push(`"${key}" != ?`)
            params.push(toSqlValue(valObj.not))
          }
        }
        if ("contains" in valObj) {
          clauses.push(`LOWER(COALESCE("${key}", '')) LIKE LOWER(?)`)
          params.push(`%${String(valObj.contains ?? "")}%`)
        }
        if ("startsWith" in valObj) {
          clauses.push(`LOWER(COALESCE("${key}", '')) LIKE LOWER(?)`)
          params.push(`${String(valObj.startsWith ?? "")}%`)
        }
        if ("endsWith" in valObj) {
          clauses.push(`LOWER(COALESCE("${key}", '')) LIKE LOWER(?)`)
          params.push(`%${String(valObj.endsWith ?? "")}`)
        }
        if ("gt" in valObj) {
          clauses.push(`"${key}" > ?`)
          params.push(toSqlValue(valObj.gt))
        }
        if ("gte" in valObj) {
          clauses.push(`"${key}" >= ?`)
          params.push(toSqlValue(valObj.gte))
        }
        if ("lt" in valObj) {
          clauses.push(`"${key}" < ?`)
          params.push(toSqlValue(valObj.lt))
        }
        if ("lte" in valObj) {
          clauses.push(`"${key}" <= ?`)
          params.push(toSqlValue(valObj.lte))
        }
      } else {
        // Compound unique key object (e.g. runnerUserId_clientRequestId or targetType_targetId_userId)
        const compound = buildWhereClause(valObj)
        if (compound.sql && compound.sql !== "1=1") {
          clauses.push(compound.sql)
          params.push(...compound.params)
        }
      }
      continue
    }

    clauses.push(`"${key}" = ?`)
    params.push(toSqlValue(val))
  }

  return {
    sql: clauses.length > 0 ? clauses.join(" AND ") : "1=1",
    params,
  }
}

function buildOrderByClause(orderBy: any): string {
  if (!orderBy) return ""
  const list = Array.isArray(orderBy) ? orderBy : [orderBy]
  const parts: string[] = []
  for (const item of list) {
    if (item && typeof item === "object") {
      for (const [col, dir] of Object.entries(item)) {
        if (!dir) continue
        const direction = String(dir).toUpperCase() === "ASC" ? "ASC" : "DESC"
        parts.push(`"${col}" ${direction}`)
      }
    }
  }
  return parts.length > 0 ? `ORDER BY ${parts.join(", ")}` : ""
}

export function createSqliteTableDelegate(prismaClient: any, config: SqliteTableConfig) {
  const delegate = {
    async create(args: { data: Record<string, any>; select?: Record<string, any> }) {
      const nowIso = new Date().toISOString()
      const merged: Record<string, any> = {
        ...(config.defaults || {}),
        ...(args?.data || {}),
      }
      if (!merged.id) {
        merged.id = generateSlcId()
      }
      if (!merged.createdAt) {
        merged.createdAt = nowIso
      }
      if (config.hasUpdatedAt && !merged.updatedAt) {
        merged.updatedAt = nowIso
      }

      const cols: string[] = []
      const params: any[] = []
      for (const [k, v] of Object.entries(merged)) {
        if (v === undefined) continue
        cols.push(k)
        params.push(toSqlValue(v))
      }

      const sql = `INSERT INTO "${config.tableName}" (${cols
        .map((c) => `"${c}"`)
        .join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`

      await prismaClient.$executeRawUnsafe(sql, ...params)

      if (typeof prismaClient.$queryRawUnsafe === "function") {
        const rows = await prismaClient
          .$queryRawUnsafe(
            `SELECT * FROM "${config.tableName}" WHERE "id" = ? LIMIT 1`,
            merged.id
          )
          .catch(() => null)
        if (Array.isArray(rows) && rows.length > 0) {
          return normalizeRow(rows[0], config, args?.select)
        }
      }
      return normalizeRow(merged, config, args?.select)
    },

    async findUnique(args: { where: Record<string, any>; select?: Record<string, any> }) {
      if (!args?.where) return null
      const { sql: whereSql, params } = buildWhereClause(args.where)
      const rows = await prismaClient.$queryRawUnsafe(
        `SELECT * FROM "${config.tableName}" WHERE ${whereSql} LIMIT 1`,
        ...params
      )
      return Array.isArray(rows) && rows.length > 0
        ? normalizeRow(rows[0], config, args?.select)
        : null
    },

    async findFirst(args?: {
      where?: Record<string, any>
      orderBy?: any
      select?: Record<string, any>
    }) {
      const { sql: whereSql, params } = buildWhereClause(args?.where)
      const orderSql = buildOrderByClause(args?.orderBy)
      const rows = await prismaClient.$queryRawUnsafe(
        `SELECT * FROM "${config.tableName}" WHERE ${whereSql} ${orderSql} LIMIT 1`,
        ...params
      )
      return Array.isArray(rows) && rows.length > 0
        ? normalizeRow(rows[0], config, args?.select)
        : null
    },

    async findMany(args?: {
      where?: Record<string, any>
      orderBy?: any
      take?: number
      skip?: number
      select?: Record<string, any>
    }) {
      const { sql: whereSql, params } = buildWhereClause(args?.where)
      const orderSql = buildOrderByClause(args?.orderBy)
      let limitOffsetSql = ""
      if (typeof args?.take === "number") {
        limitOffsetSql += ` LIMIT ${Math.max(0, Math.floor(args.take))}`
      }
      if (typeof args?.skip === "number") {
        if (!limitOffsetSql) limitOffsetSql += " LIMIT -1"
        limitOffsetSql += ` OFFSET ${Math.max(0, Math.floor(args.skip))}`
      }
      const rows = await prismaClient.$queryRawUnsafe(
        `SELECT * FROM "${config.tableName}" WHERE ${whereSql} ${orderSql}${limitOffsetSql}`,
        ...params
      )
      return Array.isArray(rows)
        ? rows.map((r: any) => normalizeRow(r, config, args?.select))
        : []
    },

    async update(args: {
      where: Record<string, any>
      data: Record<string, any>
      select?: Record<string, any>
    }) {
      const setClauses: string[] = []
      const setParams: any[] = []

      for (const [col, val] of Object.entries(args?.data || {})) {
        if (val === undefined) continue
        if (val && typeof val === "object" && !(val instanceof Date) && !Array.isArray(val)) {
          if ("increment" in val) {
            setClauses.push(`"${col}" = COALESCE("${col}", 0) + ?`)
            setParams.push(Number(val.increment || 0))
            continue
          }
          if ("decrement" in val) {
            setClauses.push(`"${col}" = MAX(0, COALESCE("${col}", 0) - ?)`)
            setParams.push(Number(val.decrement || 0))
            continue
          }
        }
        setClauses.push(`"${col}" = ?`)
        setParams.push(toSqlValue(val))
      }

      if (config.hasUpdatedAt && !("updatedAt" in (args?.data || {}))) {
        setClauses.push(`"updatedAt" = ?`)
        setParams.push(new Date().toISOString())
      }

      const { sql: whereSql, params: whereParams } = buildWhereClause(args.where)
      if (setClauses.length > 0) {
        await prismaClient.$executeRawUnsafe(
          `UPDATE "${config.tableName}" SET ${setClauses.join(", ")} WHERE ${whereSql}`,
          ...setParams,
          ...whereParams
        )
      }

      const rows = await prismaClient
        .$queryRawUnsafe(
          `SELECT * FROM "${config.tableName}" WHERE ${whereSql} LIMIT 1`,
          ...whereParams
        )
        .catch(() => null)
      return Array.isArray(rows) && rows.length > 0
        ? normalizeRow(rows[0], config, args?.select)
        : normalizeRow({ ...(args?.where || {}), ...(args?.data || {}) }, config, args?.select)
    },

    async updateMany(args: { where?: Record<string, any>; data: Record<string, any> }) {
      const setClauses: string[] = []
      const setParams: any[] = []

      for (const [col, val] of Object.entries(args?.data || {})) {
        if (val === undefined) continue
        if (val && typeof val === "object" && !(val instanceof Date) && !Array.isArray(val)) {
          if ("increment" in val) {
            setClauses.push(`"${col}" = COALESCE("${col}", 0) + ?`)
            setParams.push(Number(val.increment || 0))
            continue
          }
          if ("decrement" in val) {
            setClauses.push(`"${col}" = MAX(0, COALESCE("${col}", 0) - ?)`)
            setParams.push(Number(val.decrement || 0))
            continue
          }
        }
        setClauses.push(`"${col}" = ?`)
        setParams.push(toSqlValue(val))
      }

      if (config.hasUpdatedAt && !("updatedAt" in (args?.data || {}))) {
        setClauses.push(`"updatedAt" = ?`)
        setParams.push(new Date().toISOString())
      }

      const { sql: whereSql, params: whereParams } = buildWhereClause(args?.where)
      let count = 0
      if (setClauses.length > 0) {
        count = Number(
          (await prismaClient.$executeRawUnsafe(
            `UPDATE "${config.tableName}" SET ${setClauses.join(", ")} WHERE ${whereSql}`,
            ...setParams,
            ...whereParams
          )) || 0
        )
      }
      return { count }
    },

    async upsert(args: {
      where: Record<string, any>
      create: Record<string, any>
      update: Record<string, any>
      select?: Record<string, any>
    }) {
      const existing = await delegate.findUnique({ where: args.where })
      if (existing) {
        return delegate.update({
          where: { id: existing.id },
          data: args.update,
          select: args?.select,
        })
      }
      return delegate.create({
        data: args.create,
        select: args?.select,
      })
    },

    async delete(args: { where: Record<string, any> }) {
      const existing = await delegate.findUnique({ where: args.where })
      const { sql: whereSql, params } = buildWhereClause(args.where)
      await prismaClient.$executeRawUnsafe(
        `DELETE FROM "${config.tableName}" WHERE ${whereSql}`,
        ...params
      )
      return existing
    },

    async deleteMany(args?: { where?: Record<string, any> }) {
      const { sql: whereSql, params } = buildWhereClause(args?.where)
      const count = Number(
        (await prismaClient.$executeRawUnsafe(
          `DELETE FROM "${config.tableName}" WHERE ${whereSql}`,
          ...params
        )) || 0
      )
      return { count }
    },

    async count(args?: { where?: Record<string, any> }) {
      const { sql: whereSql, params } = buildWhereClause(args?.where)
      const rows = await prismaClient.$queryRawUnsafe(
        `SELECT COUNT(*) as cnt FROM "${config.tableName}" WHERE ${whereSql}`,
        ...params
      )
      return Number(rows?.[0]?.cnt ?? 0)
    },
  }

  return delegate
}

const SLC_RUNTIME_MODEL_CONFIGS: Record<string, SqliteTableConfig> = {
  slcSkill: {
    tableName: "slc_skills",
    hasUpdatedAt: true,
    booleanColumns: ["isExecutableOnSsm"],
    numberColumns: ["appliedCount", "saveCount", "runCount", "avgRating", "validRatingCount"],
    defaults: {
      collaboratorsJson: "[]",
      workCategory: "ACTIVITY_DESIGN",
      gradeLevelsJson: "[]",
      tagsJson: "[]",
      inputFieldsJson: "[]",
      workflowStepsJson: "[]",
      referencesJson: "[]",
      compatiblePlatformsJson: '["SSM_INTERNAL","GEMINI","CHATGPT"]',
      isExecutableOnSsm: false,
      packageMetaJson: "{}",
      currentVersion: "1.0",
      visibility: "SYSTEM",
      status: "DRAFT",
      creationSource: "FORM",
      appliedCount: 0,
      saveCount: 0,
      runCount: 0,
      avgRating: 0,
      validRatingCount: 0,
    },
  },
  slcSkillVersion: {
    tableName: "slc_skill_versions",
    hasUpdatedAt: false,
    defaults: {
      snapshotJson: "{}",
      status: "DRAFT",
    },
  },
  slcSkillWorkCategory: {
    tableName: "slc_skill_work_categories",
    hasUpdatedAt: true,
    booleanColumns: ["isActive"],
    numberColumns: ["sortOrder"],
    defaults: {
      sortOrder: 0,
      isActive: true,
    },
  },
  slcSkillEvidenceBrief: {
    tableName: "slc_skill_evidence_briefs",
    hasUpdatedAt: true,
    defaults: {
      sourcesStatusJson: "[]",
      deterministicStatsJson: "{}",
      aiInterpretationJson: "{}",
      proposedActionsJson: "[]",
      teacherConfirmedJson: "{}",
      status: "REVIEWED",
    },
  },
  slcSkillRun: {
    tableName: "slc_skill_runs",
    hasUpdatedAt: false,
    numberColumns: ["promptTokens", "completionTokens", "estimatedCostUsd", "durationMs"],
    defaults: {
      skillVersion: "1.0",
      inputValuesJson: "{}",
      boundContextSummaryJson: "{}",
      status: "COMPLETED",
      promptTokens: 0,
      completionTokens: 0,
      estimatedCostUsd: 0,
      durationMs: 0,
    },
  },
  slcAppliedConfirmation: {
    tableName: "slc_applied_confirmations",
    hasUpdatedAt: true,
    defaults: {},
  },
  slcHelpRequest: {
    tableName: "slc_help_requests",
    hasUpdatedAt: true,
    defaults: {
      supportType: "EXPERIMENT",
      status: "OPEN",
    },
  },
}

const SLC_POST_V4_COLUMNS = [
  "departmentId",
  "departmentName",
  "videoUrl",
  "demoUrl",
  "topicName",
  "previousStatus",
  "deletedAt",
  "deletedById",
  "collaboratorIdsJson",
  "collaboratorNamesJson",
  "linkedSkillId",
  "appliedCount",
] as const

const SLC_POST_SQL_CONFIG: SqliteTableConfig = {
  tableName: "slc_posts",
  hasUpdatedAt: true,
  booleanColumns: ["isPinned", "hasStudentDataPiiChecked"],
  numberColumns: [
    "reactionCount",
    "commentCount",
    "shareCount",
    "saveCount",
    "viewCount",
    "appliedCount",
  ],
  defaults: {
    postType: "GENERAL",
    visibility: "SYSTEM",
    status: "PUBLISHED",
    isPinned: false,
    subjectCodesJson: "[]",
    gradeLevelsJson: "[]",
    purposeTagsJson: "[]",
    tagsJson: "[]",
    mentionedUserIdsJson: "[]",
    collaboratorIdsJson: "[]",
    collaboratorNamesJson: "[]",
    hasStudentDataPiiChecked: true,
    reactionCount: 0,
    commentCount: 0,
    shareCount: 0,
    saveCount: 0,
    viewCount: 0,
    appliedCount: 0,
    bumpEventsJson: "[]",
    publishedAt: new Date().toISOString(),
    lastBumpedAt: new Date().toISOString(),
  },
}

function createSafeSlcPostWrapper(prismaClient: any): any {
  if (!prismaClient || typeof prismaClient.$queryRawUnsafe !== "function") {
    return prismaClient?.slcPost
  }
  const postDel = prismaClient.slcPost
  const sqlPostDelegate = createSqliteTableDelegate(prismaClient, SLC_POST_SQL_CONFIG)

  // If postDel is missing or was previously mutated with __v4Patched, use direct SQL delegate to prevent any recursion
  if (!postDel || postDel.__v4Patched) {
    return sqlPostDelegate
  }

  async function saveV4ColumnsOnPost(postId: string, v4Data: Record<string, any>) {
    const setClauses: string[] = []
    const params: any[] = []
    for (const [k, v] of Object.entries(v4Data)) {
      if (v === undefined) continue
      if (v && typeof v === "object" && !(v instanceof Date) && "increment" in v) {
        setClauses.push(`"${k}" = COALESCE("${k}", 0) + ?`)
        params.push(Number(v.increment || 0))
      } else {
        setClauses.push(`"${k}" = ?`)
        params.push(toSqlValue(v))
      }
    }
    if (setClauses.length === 0) return
    params.push(postId)
    await prismaClient
      .$executeRawUnsafe(
        `UPDATE "slc_posts" SET ${setClauses.join(", ")} WHERE "id" = ?`,
        ...params
      )
      .catch(() => null)
  }

  async function enrichPostsWithV4Columns(rows: any[]): Promise<any[]> {
    if (!Array.isArray(rows) || rows.length === 0) return rows
    if (rows[0] && "linkedSkillId" in rows[0] && "appliedCount" in rows[0]) {
      return rows
    }
    const ids = rows.map((r) => r?.id).filter(Boolean)
    if (ids.length === 0) return rows
    const v4Rows = await prismaClient
      .$queryRawUnsafe(
        `SELECT "id", ${SLC_POST_V4_COLUMNS.map((c) => `"${c}"`).join(", ")} FROM "slc_posts" WHERE "id" IN (${ids
          .map(() => "?")
          .join(", ")})`,
        ...ids
      )
      .catch(() => null)
    if (!Array.isArray(v4Rows)) return rows
    const byId = new Map<string, any>()
    for (const r of v4Rows) {
      if (r?.id) byId.set(r.id, r)
    }
    return rows.map((r) => {
      const extra = r?.id ? byId.get(r.id) : null
      if (!extra) return r
      return {
        ...r,
        ...extra,
        appliedCount: Number(extra.appliedCount ?? r.appliedCount ?? 0),
      }
    })
  }

  // IMPORTANT: Never assign this wrapper back to prismaClient.slcPost!
  return {
    async create(args: any) {
      try {
        return await postDel.create(args)
      } catch (err: any) {
        if (err instanceof RangeError) {
          return sqlPostDelegate.create(args)
        }
        const msg = String(err?.message || "")
        if (!msg.includes("Unknown argument") && !msg.includes("Unknown field")) {
          throw err
        }
        const baseData: Record<string, any> = { ...(args?.data || {}) }
        const v4Data: Record<string, any> = {}
        for (const col of SLC_POST_V4_COLUMNS) {
          if (col in baseData) {
            v4Data[col] = baseData[col]
            delete baseData[col]
          }
        }
        const created = await postDel.create({ ...args, data: baseData })
        if (created?.id && Object.keys(v4Data).length > 0) {
          await saveV4ColumnsOnPost(created.id, v4Data)
        }
        return {
          collaboratorIdsJson: "[]",
          collaboratorNamesJson: "[]",
          appliedCount: 0,
          ...created,
          ...v4Data,
        }
      }
    },

    async update(args: any) {
      try {
        return await postDel.update(args)
      } catch (err: any) {
        if (err instanceof RangeError) {
          return sqlPostDelegate.update(args)
        }
        const msg = String(err?.message || "")
        if (!msg.includes("Unknown argument") && !msg.includes("Unknown field")) {
          throw err
        }
        const baseData: Record<string, any> = { ...(args?.data || {}) }
        const v4Data: Record<string, any> = {}
        for (const col of SLC_POST_V4_COLUMNS) {
          if (col in baseData) {
            v4Data[col] = baseData[col]
            delete baseData[col]
          }
        }
        let updated: any = null
        if (Object.keys(baseData).length > 0) {
          updated = await postDel.update({ ...args, data: baseData })
        } else if (args?.where) {
          updated = await postDel.findUnique({ where: args.where })
        }
        const postId = updated?.id || args?.where?.id
        if (postId && Object.keys(v4Data).length > 0) {
          await saveV4ColumnsOnPost(postId, v4Data)
        }
        return {
          ...updated,
          ...v4Data,
        }
      }
    },

    async findUnique(args: any) {
      try {
        const row = await postDel.findUnique(args)
        if (!row || args?.select) return row
        const enriched = await enrichPostsWithV4Columns([row])
        return enriched[0] || row
      } catch (err: any) {
        if (err instanceof RangeError) {
          return sqlPostDelegate.findUnique(args)
        }
        throw err
      }
    },

    async findFirst(args: any) {
      try {
        const row = await postDel.findFirst(args)
        if (!row || args?.select) return row
        const enriched = await enrichPostsWithV4Columns([row])
        return enriched[0] || row
      } catch (err: any) {
        if (err instanceof RangeError) {
          return sqlPostDelegate.findFirst(args)
        }
        throw err
      }
    },

    async findMany(args: any) {
      try {
        const rows = await postDel.findMany(args)
        if (!Array.isArray(rows) || rows.length === 0 || args?.select) return rows
        return enrichPostsWithV4Columns(rows)
      } catch (err: any) {
        if (err instanceof RangeError) {
          return sqlPostDelegate.findMany(args)
        }
        throw err
      }
    },

    async count(args?: any) {
      try {
        return await postDel.count(args)
      } catch (err: any) {
        if (err instanceof RangeError) {
          return sqlPostDelegate.count(args)
        }
        throw err
      }
    },

    async delete(args: any) {
      return sqlPostDelegate.delete(args)
    },

    async deleteMany(args?: any) {
      return sqlPostDelegate.deleteMany(args)
    },
  }
}

const localDelegatesCache: Record<string, any> = {}

export function attachRuntimeSlcDelegates(prismaClient: any = prisma): void {
  if (!prismaClient) return

  const g = globalThis as any
  if (!g.__ssmRuntimeDelegatesV2) {
    g.__ssmRuntimeDelegatesV2 = {}
  }

  for (const [modelName, config] of Object.entries(SLC_RUNTIME_MODEL_CONFIGS)) {
    if (!localDelegatesCache[modelName]) {
      localDelegatesCache[modelName] = createSqliteTableDelegate(prismaClient, config)
    }
    const delegate = localDelegatesCache[modelName]
    g.__ssmRuntimeDelegatesV2[modelName] = delegate
  }
}

export function getSlcDb(): any {
  attachRuntimeSlcDelegates(prisma)
  const g = globalThis as any
  const delegates = g.__ssmRuntimeDelegatesV2 || localDelegatesCache
  return new Proxy(prisma as any, {
    get(target, prop: string | symbol) {
      if (prop === "slcPost" && typeof target.$queryRawUnsafe === "function") {
        return createSafeSlcPostWrapper(target)
      }
      const val = target[prop]
      if (val !== undefined) return val
      if (typeof prop === "string") {
        return delegates[prop] ?? localDelegatesCache[prop]
      }
      return undefined
    },
  })
}

export async function ensureSlcSchema(): Promise<void> {
  attachRuntimeSlcDelegates(prisma)

  if (schemaEnsuredVersion >= CURRENT_SCHEMA_VERSION) return
  if (schemaPromise) return schemaPromise

  schemaPromise = (async () => {
    try {
      const migrationPath = path.resolve(
        process.cwd(),
        "prisma/migrations/20261107_skyline_connect/migration.sql"
      )
      let sqlContent = ""
      if (fs.existsSync(migrationPath)) {
        sqlContent = fs.readFileSync(migrationPath, "utf-8")
      }

      const rawStatements = sqlContent
        ? sqlContent
            .split(/;\s*\r?\n/)
            .map((s) =>
              s
                .split(/\r?\n/)
                .filter((line) => !line.trim().startsWith("--"))
                .join("\n")
                .trim()
            )
            .filter(Boolean)
        : FALLBACK_STATEMENTS

      const allStatements = [
        ...rawStatements.map((s) => (s.endsWith(";") ? s : `${s};`)),
        ...ADDITIVE_COCREATE_STATEMENTS,
      ]

      // 1. Execute via active Prisma client
      for (const stmt of allStatements) {
        try {
          await (prisma as any).$executeRawUnsafe(stmt)
        } catch {
          // Ignore individual statement errors if column/table already exists
        }
      }

      // 2. Also ensure local.db has all columns/tables if local.db exists on disk
      const localDbPath = path.resolve(process.cwd(), "local.db")
      if (fs.existsSync(localDbPath)) {
        try {
          const localClient = createClient({
            url: `file:${localDbPath.replace(/\\/g, "/")}`,
          })
          for (const stmt of allStatements) {
            try {
              await localClient.execute(stmt)
            } catch {
              // Ignore duplicate column / existing table
            }
          }
          localClient.close()
        } catch {
          // Ignore if mocked environment
        }
      }

      schemaEnsuredVersion = CURRENT_SCHEMA_VERSION
    } catch {
      schemaEnsuredVersion = CURRENT_SCHEMA_VERSION
    } finally {
      schemaPromise = null
    }
  })()

  return schemaPromise
}
