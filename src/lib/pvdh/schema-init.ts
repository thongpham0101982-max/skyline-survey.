import path from "path";
import { createClient } from "@libsql/client";
import { prisma } from "@/lib/db";
import { PVDH_SEED_TEMPLATES, classifyAssessmentContentCategory } from "./constants";

let pvdhSchemaInitialized = false;
let pvdhSchemaPromise: Promise<void> | null = null;
let fallbackLibsqlClient: ReturnType<typeof createClient> | null = null;

function getFallbackClient() {
  if (!fallbackLibsqlClient) {
    const dbPath = path.resolve(process.cwd(), "local.db");
    fallbackLibsqlClient = createClient({
      url: process.env.TURSO_DATABASE_URL || `file:${dbPath}`,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return fallbackLibsqlClient;
}

const PVDH_DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "pvdh_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contentCategory" TEXT NOT NULL DEFAULT 'ORIENTATION_INTERVIEW',
    "gradeGroup" TEXT NOT NULL,
    "gradesJson" TEXT NOT NULL DEFAULT '[]',
    "educationSystemsJson" TEXT NOT NULL DEFAULT '["ALL"]',
    "campusIdsJson" TEXT NOT NULL DEFAULT '["ALL"]',
    "periodIdsJson" TEXT NOT NULL DEFAULT '["ALL"]',
    "effectiveFrom" TEXT,
    "effectiveTo" TEXT,
    "priorityOrder" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "currentVersionCode" TEXT NOT NULL DEFAULT 'v1.0',
    "sourceNote" TEXT DEFAULT 'Mẫu đề xuất phục vụ triển khai',
    "createdById" TEXT,
    "createdByName" TEXT,
    "updatedById" TEXT,
    "updatedByName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_pvdh_templates_status_prio" ON "pvdh_templates"("status", "priorityOrder")`,
  `CREATE INDEX IF NOT EXISTS "idx_pvdh_templates_group_status" ON "pvdh_templates"("gradeGroup", "status")`,

  `CREATE TABLE IF NOT EXISTS "pvdh_template_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "templateCode" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "versionCode" TEXT NOT NULL DEFAULT 'v1.0',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "nameSnapshot" TEXT NOT NULL,
    "purposeText" TEXT,
    "gradesJson" TEXT NOT NULL DEFAULT '[]',
    "educationSystemsJson" TEXT NOT NULL DEFAULT '["ALL"]',
    "campusIdsJson" TEXT NOT NULL DEFAULT '["ALL"]',
    "periodIdsJson" TEXT NOT NULL DEFAULT '["ALL"]',
    "effectiveFrom" TEXT,
    "effectiveTo" TEXT,
    "priorityOrder" INTEGER NOT NULL DEFAULT 100,
    "sectionsJson" TEXT NOT NULL DEFAULT '[]',
    "fieldsJson" TEXT NOT NULL DEFAULT '[]',
    "exportLayoutJson" TEXT NOT NULL DEFAULT '{}',
    "changeSummary" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "publishedAt" DATETIME,
    "publishedById" TEXT,
    "publishedByName" TEXT,
    "deactivatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "uq_pvdh_tpl_ver_code_num" ON "pvdh_template_versions"("templateCode", "versionNumber")`,
  `CREATE INDEX IF NOT EXISTS "idx_pvdh_tpl_ver_tpl_status" ON "pvdh_template_versions"("templateId", "status")`,

  `CREATE TABLE IF NOT EXISTS "pvdh_assessment_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "studentCode" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "batchId" TEXT,
    "campusId" TEXT,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "isLatestAttempt" BOOLEAN NOT NULL DEFAULT 1,
    "gradeAtCreation" TEXT NOT NULL,
    "educationSystemAtCreation" TEXT DEFAULT 'ALL',
    "templateId" TEXT NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "templateCode" TEXT NOT NULL,
    "templateVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "templateVersionCode" TEXT NOT NULL DEFAULT 'v1.0',
    "interviewDate" TEXT,
    "studentInterviewerUserId" TEXT,
    "studentInterviewerName" TEXT,
    "studentInterviewerTitle" TEXT,
    "studentInterviewDate" TEXT,
    "studentSectionStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "studentCompletedAt" DATETIME,
    "parentFullName" TEXT,
    "parentRelationship" TEXT,
    "parentContactChannel" TEXT,
    "parentInterviewerUserId" TEXT,
    "parentInterviewerName" TEXT,
    "parentInterviewerTitle" TEXT,
    "parentInterviewDate" TEXT,
    "parentSectionStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "parentCompletedAt" DATETIME,
    "studentResponsesJson" TEXT NOT NULL DEFAULT '{}',
    "obsStrengthsInterests" TEXT,
    "obsCommunicationStyle" TEXT,
    "obsParticipationLevel" TEXT,
    "obsSupportNeeds" TEXT,
    "teacherSectionStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "parentResponsesJson" TEXT NOT NULL DEFAULT '{}',
    "teacherSummaryJson" TEXT NOT NULL DEFAULT '{}',
    "planStrengthsPriority" TEXT,
    "planGoalsActionsText" TEXT,
    "followUpActionsJson" TEXT NOT NULL DEFAULT '[]',
    "planCoordinator" TEXT,
    "planReviewDate" TEXT,
    "planFurtherTopicsJson" TEXT NOT NULL DEFAULT '[]',
    "planFurtherOtherText" TEXT,
    "planReferralReason" TEXT,
    "planReferralReceiver" TEXT,
    "planHandoverNotes" TEXT,
    "internalSensitiveNotes" TEXT,
    "orientationSectionStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "workflowStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "isLocked" BOOLEAN NOT NULL DEFAULT 0,
    "confirmationType" TEXT,
    "confirmedByUserId" TEXT,
    "confirmedByName" TEXT,
    "confirmedByRole" TEXT,
    "signatureImageBase64" TEXT,
    "confirmedAt" DATETIME,
    "confirmedSnapshotJson" TEXT,
    "confirmedSnapshotHash" TEXT,
    "returnReason" TEXT,
    "returnedByUserId" TEXT,
    "returnedByName" TEXT,
    "returnedAt" DATETIME,
    "reopenReason" TEXT,
    "reopenedByUserId" TEXT,
    "reopenedByName" TEXT,
    "reopenedAt" DATETIME,
    "templateMigrationHistoryJson" TEXT NOT NULL DEFAULT '[]',
    "publishedForParentSummary" TEXT,
    "isPublishedToParent" BOOLEAN NOT NULL DEFAULT 0,
    "lockVersion" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "uq_pvdh_record_student_period_attempt" ON "pvdh_assessment_records"("studentId", "periodId", "attemptNumber")`,
  `CREATE INDEX IF NOT EXISTS "idx_pvdh_record_student_latest" ON "pvdh_assessment_records"("studentId", "isLatestAttempt")`,
  `CREATE INDEX IF NOT EXISTS "idx_pvdh_record_period_campus_status" ON "pvdh_assessment_records"("periodId", "campusId", "workflowStatus")`,
  `CREATE INDEX IF NOT EXISTS "idx_pvdh_record_student_interviewer" ON "pvdh_assessment_records"("studentInterviewerUserId")`,
  `CREATE INDEX IF NOT EXISTS "idx_pvdh_record_parent_interviewer" ON "pvdh_assessment_records"("parentInterviewerUserId")`,

  `CREATE TABLE IF NOT EXISTS "pvdh_review_histories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "reasonOrNote" TEXT,
    "beforeSnapshotJson" TEXT,
    "afterSnapshotJson" TEXT,
    "actorUserId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_pvdh_review_record" ON "pvdh_review_histories"("recordId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "idx_pvdh_review_student" ON "pvdh_review_histories"("studentId", "createdAt")`,

  `CREATE TABLE IF NOT EXISTS "pvdh_generated_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "templateCode" TEXT NOT NULL,
    "templateVersionCode" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "documentStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "format" TEXT NOT NULL DEFAULT 'PDF',
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileSha256" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "snapshotJson" TEXT NOT NULL,
    "generatedByUserId" TEXT NOT NULL,
    "generatedByName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_pvdh_doc_record" ON "pvdh_generated_documents"("recordId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "idx_pvdh_doc_student_period" ON "pvdh_generated_documents"("studentId", "periodId")`,

  `CREATE TABLE IF NOT EXISTS "pvdh_handovers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrolledStudentId" TEXT,
    "studentCode" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "campusId" TEXT,
    "targetClassId" TEXT NOT NULL,
    "targetClassName" TEXT NOT NULL,
    "targetGvcnTeacherId" TEXT,
    "targetGvcnUserId" TEXT,
    "targetGvcnName" TEXT,
    "handoverSnapshotJson" TEXT NOT NULL,
    "includeSensitiveNotes" BOOLEAN NOT NULL DEFAULT 0,
    "handoverNote" TEXT,
    "handedOverByUserId" TEXT NOT NULL,
    "handedOverByName" TEXT NOT NULL,
    "handedOverAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receiveStatus" TEXT NOT NULL DEFAULT 'PENDING_RECEIPT',
    "acknowledgedByUserId" TEXT,
    "acknowledgedByName" TEXT,
    "acknowledgedAt" DATETIME,
    "gvcnFeedbackNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_pvdh_handover_record" ON "pvdh_handovers"("recordId")`,
  `CREATE INDEX IF NOT EXISTS "idx_pvdh_handover_class_status" ON "pvdh_handovers"("targetClassId", "receiveStatus")`,
  `CREATE INDEX IF NOT EXISTS "idx_pvdh_handover_gvcn_status" ON "pvdh_handovers"("targetGvcnUserId", "receiveStatus")`,
  `CREATE INDEX IF NOT EXISTS "idx_pvdh_handover_student_code" ON "pvdh_handovers"("studentCode")`,

  `CREATE TABLE IF NOT EXISTS "pvdh_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "studentId" TEXT,
    "recordId" TEXT,
    "templateCode" TEXT,
    "versionCode" TEXT,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT,
    "summary" TEXT,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_pvdh_audit_entity" ON "pvdh_audit_logs"("entityType", "entityId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "idx_pvdh_audit_student" ON "pvdh_audit_logs"("studentId", "createdAt")`,

  `CREATE TABLE IF NOT EXISTS "ksdv_file_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resultType" TEXT NOT NULL,
    "contentCategory" TEXT NOT NULL DEFAULT 'SUBJECT_SCORE',
    "subjectId" TEXT,
    "subjectCode" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL DEFAULT 'ALL',
    "periodIdsJson" TEXT NOT NULL DEFAULT '["ALL"]',
    "educationSystemsJson" TEXT NOT NULL DEFAULT '["ALL"]',
    "campusIdsJson" TEXT NOT NULL DEFAULT '["ALL"]',
    "gradesJson" TEXT NOT NULL DEFAULT '["ALL"]',
    "effectiveFrom" TEXT,
    "effectiveTo" TEXT,
    "priorityOrder" INTEGER NOT NULL DEFAULT 100,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "versionCode" TEXT NOT NULL DEFAULT 'v1.0',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "schemaConfigJson" TEXT NOT NULL DEFAULT '{}',
    "exportFormat" TEXT NOT NULL DEFAULT 'HTML_PDF',
    "pageSize" TEXT NOT NULL DEFAULT 'A4',
    "pageOrientation" TEXT NOT NULL DEFAULT 'PORTRAIT',
    "copyCount" INTEGER NOT NULL DEFAULT 1,
    "signatureBlocksJson" TEXT NOT NULL DEFAULT '[]',
    "fileNamePattern" TEXT NOT NULL DEFAULT '{subjectCode}_{studentCode}_{periodCode}_v{version}',
    "sampleFileMetaJson" TEXT,
    "sourceVerified" BOOLEAN NOT NULL DEFAULT 1,
    "missingSourceNote" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "uq_ksdv_file_tpl_code_ver" ON "ksdv_file_templates"("code", "versionNumber")`,
  `CREATE INDEX IF NOT EXISTS "idx_ksdv_file_tpl_subject_status" ON "ksdv_file_templates"("subjectCode", "status")`,
  `CREATE INDEX IF NOT EXISTS "idx_ksdv_file_tpl_type_status" ON "ksdv_file_templates"("resultType", "status")`,

  `CREATE TABLE IF NOT EXISTS "ksdv_export_mappings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileTemplateId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "targetFormat" TEXT NOT NULL DEFAULT 'HTML_PDF',
    "targetRef" TEXT NOT NULL,
    "dataType" TEXT NOT NULL DEFAULT 'TEXT',
    "formatPattern" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT 0,
    "emptyValuePolicy" TEXT NOT NULL DEFAULT 'KEEP_BLANK',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "uq_ksdv_export_map_target" ON "ksdv_export_mappings"("fileTemplateId", "targetFormat", "targetRef")`,
  `CREATE INDEX IF NOT EXISTS "idx_ksdv_export_map_tpl_order" ON "ksdv_export_mappings"("fileTemplateId", "sortOrder")`,
];

const BOOLEAN_COLS = new Set([
  "isLatestAttempt",
  "isLocked",
  "isPublishedToParent",
  "includeSensitiveNotes",
  "sourceVerified",
  "isRequired",
]);

const DATE_COLS = new Set([
  "createdAt",
  "updatedAt",
  "publishedAt",
  "deactivatedAt",
  "studentCompletedAt",
  "parentCompletedAt",
  "confirmedAt",
  "returnedAt",
  "reopenedAt",
  "handedOverAt",
  "acknowledgedAt",
]);

const NUMBER_COLS = new Set([
  "priorityOrder",
  "currentVersionNumber",
  "versionNumber",
  "attemptNumber",
  "templateVersionNumber",
  "lockVersion",
  "fileSizeBytes",
  "copyCount",
  "sortOrder",
]);

const NO_UPDATED_AT_TABLES = new Set([
  "pvdh_review_histories",
  "pvdh_generated_documents",
  "pvdh_audit_logs",
]);

function genId(prefix = "pvdh"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function serializeValue(val: any): any {
  if (val === undefined || val === null) return null;
  if (typeof val === "boolean") return val ? 1 : 0;
  if (val instanceof Date) return val.toISOString();
  return val;
}

function normalizeRow(row: any): any {
  if (!row || typeof row !== "object") return row;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (BOOLEAN_COLS.has(k)) {
      out[k] = v === 1 || v === "1" || v === true;
    } else if (DATE_COLS.has(k) && v != null) {
      out[k] = v instanceof Date ? v : new Date(String(v));
    } else if (NUMBER_COLS.has(k) && v != null) {
      out[k] = typeof v === "bigint" ? Number(v) : Number(v);
    } else {
      out[k] = typeof v === "bigint" ? Number(v) : v;
    }
  }
  return out;
}

function buildWhereClause(where: Record<string, any> | undefined, params: any[]): string {
  if (!where || Object.keys(where).length === 0) return "1=1";
  const parts: string[] = [];

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;
    if (key === "AND" && Array.isArray(value)) {
      const sub = value.map((item) => `(${buildWhereClause(item, params)})`).filter(Boolean);
      if (sub.length > 0) parts.push(sub.join(" AND "));
      continue;
    }
    if (key === "OR" && Array.isArray(value)) {
      const sub = value.map((item) => `(${buildWhereClause(item, params)})`).filter(Boolean);
      if (sub.length > 0) parts.push(`(${sub.join(" OR ")})`);
      continue;
    }
    if (value === null) {
      parts.push(`"${key}" IS NULL`);
      continue;
    }
    if (typeof value === "object" && !(value instanceof Date) && !Array.isArray(value)) {
      if ("in" in value && Array.isArray(value.in)) {
        if (value.in.length === 0) {
          parts.push("1=0");
        } else {
          const ph = value.in.map((v: any) => {
            params.push(serializeValue(v));
            return "?";
          });
          parts.push(`"${key}" IN (${ph.join(", ")})`);
        }
        continue;
      }
      if ("not" in value) {
        if (value.not === null) {
          parts.push(`"${key}" IS NOT NULL`);
        } else {
          params.push(serializeValue(value.not));
          parts.push(`"${key}" != ?`);
        }
        continue;
      }
    }
    params.push(serializeValue(value));
    parts.push(`"${key}" = ?`);
  }

  return parts.length > 0 ? parts.join(" AND ") : "1=1";
}

function buildOrderByClause(orderBy: any): string {
  if (!orderBy) return "";
  const list = Array.isArray(orderBy) ? orderBy : [orderBy];
  const items: string[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    for (const [col, dir] of Object.entries(entry)) {
      if (typeof dir === "string") {
        const safeDir = dir.toUpperCase() === "DESC" ? "DESC" : "ASC";
        items.push(`"${col}" ${safeDir}`);
      }
    }
  }
  return items.length > 0 ? ` ORDER BY ${items.join(", ")}` : "";
}

async function queryRawRows(sql: string, params: any[] = []): Promise<any[]> {
  try {
    const rows = (await (prisma as any).$queryRawUnsafe(sql, ...params)) as any[];
    return (rows || []).map(normalizeRow);
  } catch {
    const client = getFallbackClient();
    const res = await client.execute({ sql, args: params });
    return (res.rows || []).map((r: any) => normalizeRow({ ...r }));
  }
}

async function executeRawSql(sql: string, params: any[] = []): Promise<void> {
  try {
    await (prisma as any).$executeRawUnsafe(sql, ...params);
  } catch {
    const client = getFallbackClient();
    await client.execute({ sql, args: params });
  }
}

function createTableDelegate(tableName: string, idPrefix: string) {
  return {
    async findMany(args?: { where?: any; orderBy?: any; take?: number; skip?: number; select?: any }) {
      const params: any[] = [];
      const whereSql = buildWhereClause(args?.where, params);
      const orderSql = buildOrderByClause(args?.orderBy);
      const limitSql = typeof args?.take === "number" ? ` LIMIT ${Math.max(0, Math.floor(args.take))}` : "";
      const offsetSql = typeof args?.skip === "number" ? ` OFFSET ${Math.max(0, Math.floor(args.skip))}` : "";
      const sql = `SELECT * FROM "${tableName}" WHERE ${whereSql}${orderSql}${limitSql}${offsetSql}`;
      return queryRawRows(sql, params);
    },

    async findFirst(args?: { where?: any; orderBy?: any; select?: any }) {
      const rows = await this.findMany({ ...args, take: 1 });
      return rows[0] || null;
    },

    async findUnique(args: { where: any; select?: any }) {
      const rows = await this.findMany({ where: args.where, take: 1 });
      return rows[0] || null;
    },

    async count(args?: { where?: any }) {
      const params: any[] = [];
      const whereSql = buildWhereClause(args?.where, params);
      const rows = await queryRawRows(`SELECT COUNT(*) as cnt FROM "${tableName}" WHERE ${whereSql}`, params);
      return Number(rows[0]?.cnt || 0);
    },

    async create(args: { data: Record<string, any> }) {
      const nowIso = new Date().toISOString();
      const data: Record<string, any> = { ...args.data };
      if (!data.id) data.id = genId(idPrefix);
      if (!data.createdAt) data.createdAt = nowIso;
      if (!NO_UPDATED_AT_TABLES.has(tableName) && !data.updatedAt) {
        data.updatedAt = nowIso;
      }

      const cols: string[] = [];
      const ph: string[] = [];
      const params: any[] = [];

      for (const [k, v] of Object.entries(data)) {
        if (v === undefined) continue;
        cols.push(`"${k}"`);
        ph.push("?");
        params.push(serializeValue(v));
      }

      const sql = `INSERT INTO "${tableName}" (${cols.join(", ")}) VALUES (${ph.join(", ")})`;
      await executeRawSql(sql, params);
      return this.findFirst({ where: { id: data.id } });
    },

    async update(args: { where: Record<string, any>; data: Record<string, any> }) {
      const existing = await this.findFirst({ where: args.where });
      if (!existing) return null;

      const data: Record<string, any> = { ...args.data };
      if (!NO_UPDATED_AT_TABLES.has(tableName)) {
        data.updatedAt = new Date().toISOString();
      }

      const sets: string[] = [];
      const params: any[] = [];

      for (const [k, v] of Object.entries(data)) {
        if (v === undefined || k === "id") continue;
        sets.push(`"${k}" = ?`);
        params.push(serializeValue(v));
      }

      if (sets.length > 0) {
        params.push(existing.id);
        await executeRawSql(`UPDATE "${tableName}" SET ${sets.join(", ")} WHERE "id" = ?`, params);
      }

      return this.findFirst({ where: { id: existing.id } });
    },

    async delete(args: { where: Record<string, any> }) {
      const existing = await this.findFirst({ where: args.where });
      if (!existing) return null;
      await executeRawSql(`DELETE FROM "${tableName}" WHERE "id" = ?`, [existing.id]);
      return existing;
    },

    async deleteMany(args?: { where?: Record<string, any> }) {
      const params: any[] = [];
      const whereSql = buildWhereClause(args?.where, params);
      await executeRawSql(`DELETE FROM "${tableName}" WHERE ${whereSql}`, params);
      return { count: 1 };
    },
  };
}

export function getPvdhDb() {
  return {
    pvdhTemplate: createTableDelegate("pvdh_templates", "pvdhtpl"),
    pvdhTemplateVersion: createTableDelegate("pvdh_template_versions", "pvdhver"),
    pvdhAssessmentRecord: createTableDelegate("pvdh_assessment_records", "pvdhrec"),
    pvdhReviewHistory: createTableDelegate("pvdh_review_histories", "pvdhrev"),
    pvdhGeneratedDocument: createTableDelegate("pvdh_generated_documents", "pvdhdoc"),
    pvdhHandover: createTableDelegate("pvdh_handovers", "pvdhhnd"),
    pvdhAuditLog: createTableDelegate("pvdh_audit_logs", "pvdhaud"),
    ksdvFileTemplate: createTableDelegate("ksdv_file_templates", "ksdvtpl"),
    ksdvExportMapping: createTableDelegate("ksdv_export_mappings", "ksdvmap"),
  };
}

/**
 * Khởi tạo an toàn các bảng PVDH + Cấu hình File điểm KSDV và seed 5 mẫu đề xuất PVDH-01..PVDH-05.
 * Tuyệt đối KHÔNG chạm vào dữ liệu thực hay sinh học sinh/giáo viên/đợt khảo sát giả.
 */
export async function ensurePvdhSchema(): Promise<void> {
  if (pvdhSchemaInitialized) return;
  if (pvdhSchemaPromise) return pvdhSchemaPromise;

  pvdhSchemaPromise = (async () => {
    try {
      for (const ddl of PVDH_DDL_STATEMENTS) {
        await executeRawSql(ddl);
      }

      // Bổ sung cột phân loại nội dung trên AssessmentSubject nếu chưa có
      try {
        await executeRawSql(`ALTER TABLE "AssessmentSubject" ADD COLUMN "contentCategory" TEXT`);
      } catch {
        // Cột đã tồn tại
      }

      // Bổ sung cột teacherSummaryJson (D01..D04 + Trạng thái phiếu + Đề nghị phỏng vấn tâm lí) nếu DB đã tạo trước đó
      try {
        await executeRawSql(
          `ALTER TABLE "pvdh_assessment_records" ADD COLUMN "teacherSummaryJson" TEXT NOT NULL DEFAULT '{}'`
        );
      } catch {
        // Cột đã tồn tại
      }

      // Cập nhật phân loại Môn khảo sát vs Nội dung phỏng vấn định hướng trên danh mục hiện có
      try {
        const subjects = await queryRawRows(`SELECT "id", "code", "name", "subjectType", "contentCategory" FROM "AssessmentSubject"`);
        for (const s of subjects) {
          const cat = classifyAssessmentContentCategory(s);
          if (s.contentCategory !== cat) {
            await executeRawSql(
              `UPDATE "AssessmentSubject" SET "contentCategory" = ? WHERE "id" = ?`,
              [cat, s.id]
            );
          }
        }
      } catch {
        // Bỏ qua nếu bảng AssessmentSubject chưa sẵn sàng
      }

      const db = getPvdhDb();
      const nowIso = new Date().toISOString();

      const slugifyCode = (raw: string) =>
        raw
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/đ/g, "d")
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");

      const syncFileTemplateAndMappings = async (
        fileTplId: string,
        def: (typeof PVDH_SEED_TEMPLATES)[number]
      ) => {
        const existingFileTpl = await db.ksdvFileTemplate.findFirst({ where: { id: fileTplId } });
        const parentQCount = def.fields.filter(
          (f) => f.sectionCode === "IV_PARENT" || f.sectionCode === "C_PARENT_GRADE"
        ).length;
        const tplPayload = {
          code: `FILE_${def.code}`,
          name: `${def.name} (Bản in A4 / PDF)`,
          resultType: "ORIENTATION",
          contentCategory: "ORIENTATION_INTERVIEW",
          subjectCode: "PDHDV",
          subjectName: "Phiếu định hướng đầu vào",
          academicYearId: "ALL",
          periodIdsJson: JSON.stringify(["ALL"]),
          educationSystemsJson: JSON.stringify(["ALL"]),
          campusIdsJson: JSON.stringify(["ALL"]),
          gradesJson: JSON.stringify(def.grades),
          priorityOrder: def.priorityOrder,
          versionNumber: 1,
          versionCode: "v1.0",
          status: "ACTIVE",
          schemaConfigJson: JSON.stringify({
            pvdhTemplateCode: def.code,
            layoutVariant: def.exportLayout.layoutVariant || "PVDH_PROPOSED_V1",
            hasNumericScore: false,
            hasTotalScore: false,
            autoAdmissionDecision: false,
            sectionsCount: def.sections.length,
            studentQuestionGroups: def.fields.filter((f) => f.sectionCode === "II_STUDENT").length,
            parentQuestionGroups: parentQCount,
          }),
          exportFormat: "HTML_PDF",
          pageSize: "A4",
          pageOrientation: "PORTRAIT",
          copyCount: 1,
          signatureBlocksJson: JSON.stringify(def.exportLayout.signatureColumns),
          fileNamePattern: `${slugifyCode(def.code).toUpperCase()}_{studentCode}_{periodCode}_v{version}.pdf`,
          sourceVerified: true,
        };

        if (!existingFileTpl) {
          await db.ksdvFileTemplate.create({
            data: {
              id: fileTplId,
              ...tplPayload,
              createdByName: "Hệ thống SSM Sky-Line",
              publishedAt: nowIso,
              createdAt: nowIso,
              updatedAt: nowIso,
            },
          });
        } else {
          await db.ksdvFileTemplate.update({
            where: { id: existingFileTpl.id },
            data: tplPayload,
          });
          await db.ksdvExportMapping.deleteMany({ where: { fileTemplateId: existingFileTpl.id } });
        }

        let mapOrder = 1;
        for (const f of def.fields) {
          const mapDataType =
            f.dataType === "DATE"
              ? "DATE"
              : f.dataType === "ACTION_LIST"
              ? "ACTION_LIST"
              : f.dataType === "BOOLEAN_CHECKBOX"
              ? "BOOLEAN"
              : "TEXT";
          await db.ksdvExportMapping.create({
            data: {
              id: `ksdvmap_${slugifyCode(def.code)}_${f.fieldKey}`,
              fileTemplateId: fileTplId,
              fieldKey: f.fieldKey,
              sourcePath: f.exportMappingKey,
              targetFormat: "HTML_PDF",
              targetRef: `{{${f.fieldKey}}}`,
              dataType: mapDataType,
              formatPattern: f.dataType === "DATE" ? "dd/MM/yyyy" : null,
              isRequired: f.requiredOnComplete,
              emptyValuePolicy:
                f.dataType === "INTERVIEW_GROUP" || f.allowNotRecorded ? "EXPLICIT_STATUS_LABEL" : "KEEP_BLANK",
              sortOrder: mapOrder++,
            },
          });
        }
      };

      // Đồng bộ chuẩn hóa mẫu Khối 1 (PVDH-01 -> BM.KTĐBCL.31), Khối 2 (PVDH-02 -> BM.KTĐBCL.32) và Khối 3–5 (PVDH-03)
      const legacyUpgrades: Array<{
        legacyCode: string;
        legacyFileTplId: string;
        def: (typeof PVDH_SEED_TEMPLATES)[number];
        sourceNote: string;
      }> = [
        {
          legacyCode: "PVDH-01",
          legacyFileTplId: "ksdvtpl_pvdh_01_v1",
          def: PVDH_SEED_TEMPLATES[0],
          sourceNote: "Biểu mẫu BM.KTĐBCL.31 – Ban Khảo thí & Đảm bảo chất lượng",
        },
        {
          legacyCode: "PVDH-02",
          legacyFileTplId: "ksdvtpl_pvdh_02_v1",
          def: PVDH_SEED_TEMPLATES[1],
          sourceNote: "Biểu mẫu BM.KTĐBCL.32 – Ban Khảo thí & Đảm bảo chất lượng",
        },
      ];

      for (const upg of legacyUpgrades) {
        const legacyTpl = await db.pvdhTemplate.findFirst({ where: { code: upg.legacyCode } });
        const targetTpl = await db.pvdhTemplate.findFirst({ where: { code: upg.def.code } });
        if (legacyTpl && !targetTpl) {
          const lockedCnt = await db.pvdhAssessmentRecord.count({
            where: { templateId: legacyTpl.id, isLocked: true },
          });
          if (lockedCnt === 0) {
            await db.pvdhTemplate.update({
              where: { id: legacyTpl.id },
              data: {
                code: upg.def.code,
                name: upg.def.name,
                description: upg.def.description,
                gradeGroup: upg.def.gradeGroup,
                gradesJson: JSON.stringify(upg.def.grades),
                sourceNote: upg.sourceNote,
              },
            });
            const v1 = await db.pvdhTemplateVersion.findFirst({
              where: { templateId: legacyTpl.id, versionNumber: 1 },
            });
            if (v1) {
              await db.pvdhTemplateVersion.update({
                where: { id: v1.id },
                data: {
                  templateCode: upg.def.code,
                  nameSnapshot: upg.def.name,
                  purposeText: upg.def.exportLayout.purposeLine,
                  gradesJson: JSON.stringify(upg.def.grades),
                  sectionsJson: JSON.stringify(upg.def.sections),
                  fieldsJson: JSON.stringify(upg.def.fields),
                  exportLayoutJson: JSON.stringify(upg.def.exportLayout),
                  changeSummary: `Cập nhật chuẩn biểu mẫu ${upg.def.code} của Ban Khảo thí & Đảm bảo chất lượng`,
                },
              });
            }
            const draftRecords = await db.pvdhAssessmentRecord.findMany({
              where: { templateId: legacyTpl.id, isLocked: false },
            });
            for (const rec of draftRecords) {
              if (upg.legacyCode === "PVDH-02" && String(rec.gradeAtCreation).trim() === "3") {
                const tpl03 = await db.pvdhTemplate.findFirst({ where: { code: "PVDH-03" } });
                const ver03 = tpl03
                  ? await db.pvdhTemplateVersion.findFirst({
                      where: { templateId: tpl03.id, status: "ACTIVE" },
                    })
                  : null;
                if (tpl03 && ver03) {
                  await db.pvdhAssessmentRecord.update({
                    where: { id: rec.id },
                    data: {
                      templateId: tpl03.id,
                      templateVersionId: ver03.id,
                      templateCode: tpl03.code,
                      templateVersionNumber: ver03.versionNumber,
                      templateVersionCode: ver03.versionCode,
                    },
                  });
                  continue;
                }
              }
              await db.pvdhAssessmentRecord.update({
                where: { id: rec.id },
                data: { templateCode: upg.def.code },
              });
            }
            await syncFileTemplateAndMappings(upg.legacyFileTplId, upg.def);
          } else {
            // Bảo toàn lịch sử bản ghi đã khóa trên mẫu cũ, ngừng áp dụng mẫu cũ để mẫu mới được kích hoạt
            await db.pvdhTemplate.update({
              where: { id: legacyTpl.id },
              data: { status: "INACTIVE" },
            });
          }
        } else if (targetTpl) {
          const lockedTargetCnt = await db.pvdhAssessmentRecord.count({
            where: { templateId: targetTpl.id, isLocked: true },
          });
          if (lockedTargetCnt === 0) {
            const v1Target = await db.pvdhTemplateVersion.findFirst({
              where: { templateId: targetTpl.id, versionNumber: 1 },
            });
            if (v1Target && String(v1Target.fieldsJson || "").includes('"promptQuestion":""')) {
              await db.pvdhTemplateVersion.update({
                where: { id: v1Target.id },
                data: {
                  sectionsJson: JSON.stringify(upg.def.sections),
                  fieldsJson: JSON.stringify(upg.def.fields),
                  exportLayoutJson: JSON.stringify(upg.def.exportLayout),
                },
              });
            }
          }
        }
      }

      // Seed các mẫu PVDH / BM.KTĐBCL (BM.KTĐBCL.31 .. BM.KTĐBCL.36, PVDH-04, PVDH-05) nếu chưa tồn tại
      for (const def of PVDH_SEED_TEMPLATES) {
        const existingTpl = await db.pvdhTemplate.findFirst({ where: { code: def.code } });
        if (!existingTpl) {
          const slug = slugifyCode(def.code);
          const tplId = `pvdhtpl_${slug}`;
          const verId = `pvdhver_${slug}_v1`;
          const isBm = def.exportLayout.layoutVariant === "BM_KTDBCL_ABCD";

          await db.pvdhTemplate.create({
            data: {
              id: tplId,
              code: def.code,
              name: def.name,
              description: def.description,
              contentCategory: "ORIENTATION_INTERVIEW",
              gradeGroup: def.gradeGroup,
              gradesJson: JSON.stringify(def.grades),
              educationSystemsJson: JSON.stringify(["ALL"]),
              campusIdsJson: JSON.stringify(["ALL"]),
              periodIdsJson: JSON.stringify(["ALL"]),
              effectiveFrom: null,
              effectiveTo: null,
              priorityOrder: def.priorityOrder,
              status: "ACTIVE",
              currentVersionNumber: 1,
              currentVersionCode: "v1.0",
              sourceNote: isBm
                ? `Biểu mẫu ${def.code} – Ban Khảo thí & Đảm bảo chất lượng`
                : "Mẫu đề xuất phục vụ triển khai (Phieu_phong_van_dinh_huong_HS_PHHS_Khoi_1_12)",
              createdByName: "Hệ thống SSM Sky-Line",
              createdAt: nowIso,
              updatedAt: nowIso,
            },
          });

          await db.pvdhTemplateVersion.create({
            data: {
              id: verId,
              templateId: tplId,
              templateCode: def.code,
              versionNumber: 1,
              versionCode: "v1.0",
              status: "ACTIVE",
              nameSnapshot: def.name,
              purposeText: def.exportLayout.purposeLine,
              gradesJson: JSON.stringify(def.grades),
              educationSystemsJson: JSON.stringify(["ALL"]),
              campusIdsJson: JSON.stringify(["ALL"]),
              periodIdsJson: JSON.stringify(["ALL"]),
              effectiveFrom: null,
              effectiveTo: null,
              priorityOrder: def.priorityOrder,
              sectionsJson: JSON.stringify(def.sections),
              fieldsJson: JSON.stringify(def.fields),
              exportLayoutJson: JSON.stringify(def.exportLayout),
              changeSummary: isBm
                ? `Khởi tạo phiên bản v1.0 theo biểu mẫu ${def.code}`
                : "Khởi tạo phiên bản v1.0 từ bộ mẫu đề xuất phục vụ triển khai (Khối 7–12)",
              createdByName: "Hệ thống SSM Sky-Line",
              publishedAt: nowIso,
              publishedByName: "Hệ thống SSM Sky-Line",
              createdAt: nowIso,
              updatedAt: nowIso,
            },
          });

          await syncFileTemplateAndMappings(`ksdvtpl_${slug}_v1`, def);
        }
      }

      // Chuyển tiếp toàn bộ các mẫu đề xuất cũ PVDH-01..PVDH-05 sang trọn bộ biểu mẫu BM.KTĐBCL.31..BM.KTĐBCL.42 (Khối 1..12)
      const legacyGroupCodes: Array<{ code: string; defaultGrade: number; fileIds: string[] }> = [
        { code: "PVDH-01", defaultGrade: 1, fileIds: ["ksdvtpl_pvdh_01_v1", "FILE_PVDH-01", "FILE_PVDH_01"] },
        { code: "PVDH-02", defaultGrade: 2, fileIds: ["ksdvtpl_pvdh_02_v1", "FILE_PVDH-02", "FILE_PVDH_02"] },
        { code: "PVDH-03", defaultGrade: 3, fileIds: ["ksdvtpl_pvdh_03_v1", "FILE_PVDH-03", "FILE_PVDH_03"] },
        { code: "PVDH-04", defaultGrade: 7, fileIds: ["ksdvtpl_pvdh_04_v1", "FILE_PVDH-04", "FILE_PVDH_04"] },
        { code: "PVDH-05", defaultGrade: 10, fileIds: ["ksdvtpl_pvdh_05_v1", "FILE_PVDH-05", "FILE_PVDH_05"] },
      ];

      for (const leg of legacyGroupCodes) {
        const existingLegacy = await db.pvdhTemplate.findFirst({ where: { code: leg.code } });
        if (!existingLegacy) continue;

        const draftRecs = await db.pvdhAssessmentRecord.findMany({
          where: { templateId: existingLegacy.id, isLocked: false },
        });
        for (const rec of draftRecs) {
          const parsedG = Number(String(rec.gradeAtCreation || "").replace(/\D/g, ""));
          const g = parsedG >= 1 && parsedG <= 12 ? parsedG : leg.defaultGrade;
          const targetBmCode = `BM.KTĐBCL.${30 + g}`;
          const targetBmTpl = await db.pvdhTemplate.findFirst({ where: { code: targetBmCode } });
          const targetBmVer = targetBmTpl
            ? await db.pvdhTemplateVersion.findFirst({
                where: { templateId: targetBmTpl.id, status: "ACTIVE" },
              })
            : null;
          if (targetBmTpl && targetBmVer) {
            await db.pvdhAssessmentRecord.update({
              where: { id: rec.id },
              data: {
                templateId: targetBmTpl.id,
                templateVersionId: targetBmVer.id,
                templateCode: targetBmTpl.code,
                templateVersionNumber: targetBmVer.versionNumber,
                templateVersionCode: targetBmVer.versionCode,
              },
            });
          }
        }

        const remainingCnt = await db.pvdhAssessmentRecord.count({
          where: { templateId: existingLegacy.id },
        });
        if (remainingCnt === 0) {
          await db.pvdhTemplateVersion.deleteMany({ where: { templateId: existingLegacy.id } });
          await db.pvdhTemplate.delete({ where: { id: existingLegacy.id } });
          const oldFile = await db.ksdvFileTemplate.findFirst({
            where: {
              OR: [
                { id: leg.fileIds[0] },
                { code: leg.fileIds[1] },
                { code: leg.fileIds[2] },
              ],
            },
          });
          if (oldFile) {
            await db.ksdvExportMapping.deleteMany({ where: { fileTemplateId: oldFile.id } });
            await db.ksdvFileTemplate.delete({ where: { id: oldFile.id } });
          }
        } else if (existingLegacy.status === "ACTIVE") {
          await db.pvdhTemplate.update({
            where: { id: existingLegacy.id },
            data: { status: "INACTIVE" },
          });
        }
      }

      // Seed cấu hình File mẫu TCI (16 tiêu chí Khối 1 + mapping Câu 16 / STT 61) nếu chưa có
      const existingTciFileTpl = await db.ksdvFileTemplate.findFirst({
        where: { code: "FILE_TCI_K1" },
      });
      if (!existingTciFileTpl) {
        const tciTplId = "ksdvtpl_tci_k1_v1";
        await db.ksdvFileTemplate.create({
          data: {
            id: tciTplId,
            code: "FILE_TCI_K1",
            name: "Phiếu khảo sát TCI – Bộ chuẩn phát triển trẻ em 5–6 tuổi (Khối 1)",
            resultType: "CRITERIA",
            contentCategory: "SUBJECT_CRITERIA",
            subjectCode: "TCI",
            subjectName: "Bộ chuẩn phát triển trẻ em 5–6 tuổi",
            academicYearId: "ALL",
            periodIdsJson: JSON.stringify(["ALL"]),
            educationSystemsJson: JSON.stringify(["ALL"]),
            campusIdsJson: JSON.stringify(["ALL"]),
            gradesJson: JSON.stringify(["1"]),
            priorityOrder: 100,
            versionNumber: 1,
            versionCode: "v1.0",
            status: "ACTIVE",
            schemaConfigJson: JSON.stringify({
              criteriaCount: 16,
              allowedChoices: ["DAT", "KHONG_DAT", "KHONG_LAM"],
              emptyState: "NOT_ENTERED",
              hasTotalScore: false,
              autoThresholdConclusion: false,
              evidenceCriterionId: "TCI_C16",
              evidenceIndicatorCode: "61",
            }),
            exportFormat: "HTML_PDF",
            pageSize: "A4",
            pageOrientation: "PORTRAIT",
            copyCount: 1,
            signatureBlocksJson: JSON.stringify([
              { key: "examiner", title: "Giáo viên khảo sát", subtitle: "Ký, ghi rõ họ tên" },
            ]),
            fileNamePattern: "TCI_{studentCode}_{periodCode}_v{version}.pdf",
            sourceVerified: true,
            createdByName: "Hệ thống SSM Sky-Line",
            publishedAt: nowIso,
            createdAt: nowIso,
            updatedAt: nowIso,
          },
        });

        const tciDefaultMappings = [
          { key: "student_code", src: "student.studentCode", ref: "{{student_code}}", type: "TEXT", req: true },
          { key: "student_name", src: "student.fullName", ref: "{{student_name}}", type: "TEXT", req: true },
          { key: "tci_criteria_1_16", src: "tci.criteriaResults", ref: "section:tci_criteria_table", type: "TEXT", req: true },
          { key: "tci_summary_counts", src: "tci.summaryCounts", ref: "section:tci_summary_strip", type: "TEXT", req: true },
          { key: "tci_c16_stt61_images", src: "tci.evidences.indicator_61", ref: "frame:tci_c16_images", type: "IMAGE_LIST", req: false },
          { key: "tci_teacher_signature", src: "tci.signature", ref: "section:tci_signature_box", type: "IMAGE_LIST", req: false },
        ];
        for (let i = 0; i < tciDefaultMappings.length; i++) {
          const m = tciDefaultMappings[i];
          await db.ksdvExportMapping.create({
            data: {
              id: `ksdvmap_tci_${m.key}`,
              fileTemplateId: tciTplId,
              fieldKey: m.key,
              sourcePath: m.src,
              targetFormat: "HTML_PDF",
              targetRef: m.ref,
              dataType: m.type,
              isRequired: m.req,
              emptyValuePolicy: "EXPLICIT_STATUS_LABEL",
              sortOrder: i + 1,
            },
          });
        }
      }

      pvdhSchemaInitialized = true;
    } finally {
      pvdhSchemaPromise = null;
    }
  })();

  return pvdhSchemaPromise;
}
