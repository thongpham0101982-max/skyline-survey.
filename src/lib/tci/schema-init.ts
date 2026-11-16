import path from "path";
import { createClient } from "@libsql/client";
import { prisma } from "@/lib/db";
import {
    TCI_SUBJECT_CODE,
    TCI_SUBJECT_NAME,
    TCI_ASSESSMENT_TYPE,
    TCI_DEFAULT_TEMPLATE_CODE,
    TCI_DEFAULT_TEMPLATE_NAME,
    DEFAULT_TCI_CRITERIA_16,
    DEFAULT_TCI_FOOTER_CONFIG,
    DEFAULT_TCI_EXPORT_CONFIG,
} from "./constants";

let schemaInitialized = false;
let schemaInitPromise: Promise<void> | null = null;
let fallbackClient: ReturnType<typeof createClient> | null = null;

function getFallbackClient() {
    if (!fallbackClient) {
        const dbPath = path.resolve(process.cwd(), "local.db");
        fallbackClient = createClient({
            url: process.env.TURSO_DATABASE_URL || `file:${dbPath}`,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });
    }
    return fallbackClient;
}

const TCI_DDL_STATEMENTS: string[] = [
    `CREATE TABLE IF NOT EXISTS "tci_templates" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "code" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "subjectId" TEXT,
        "subjectCode" TEXT NOT NULL DEFAULT 'TCI',
        "subjectName" TEXT NOT NULL DEFAULT 'Bộ chuẩn phát triển trẻ em 5–6 tuổi',
        "academicYearId" TEXT DEFAULT 'ALL',
        "periodId" TEXT DEFAULT 'ALL',
        "educationSystemId" TEXT DEFAULT 'ALL',
        "grade" TEXT NOT NULL DEFAULT 'Khối 1',
        "versionNumber" INTEGER NOT NULL DEFAULT 1,
        "versionCode" TEXT NOT NULL DEFAULT 'v1.0',
        "parentTemplateId" TEXT,
        "status" TEXT NOT NULL DEFAULT 'DRAFT',
        "criteriaJson" TEXT NOT NULL DEFAULT '[]',
        "footerConfigJson" TEXT NOT NULL DEFAULT '{}',
        "exportConfigJson" TEXT NOT NULL DEFAULT '{}',
        "createdById" TEXT,
        "createdByName" TEXT,
        "updatedById" TEXT,
        "updatedByName" TEXT,
        "activatedAt" DATETIME,
        "activatedById" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "tci_templates_code_versionNumber_key" ON "tci_templates"("code", "versionNumber")`,
    `CREATE INDEX IF NOT EXISTS "tci_templates_subjectCode_grade_status_idx" ON "tci_templates"("subjectCode", "grade", "status")`,

    `CREATE TABLE IF NOT EXISTS "tci_assessment_records" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "studentId" TEXT NOT NULL,
        "studentCode" TEXT,
        "studentName" TEXT,
        "periodId" TEXT NOT NULL DEFAULT 'ALL',
        "batchId" TEXT,
        "campusId" TEXT,
        "grade" TEXT NOT NULL DEFAULT 'Khối 1',
        "subjectId" TEXT NOT NULL,
        "subjectCode" TEXT NOT NULL DEFAULT 'TCI',
        "assignmentId" TEXT,
        "templateId" TEXT NOT NULL,
        "templateCode" TEXT NOT NULL DEFAULT 'TCI_K1_DEFAULT',
        "templateVersionNumber" INTEGER NOT NULL DEFAULT 1,
        "templateVersionCode" TEXT NOT NULL DEFAULT 'v1.0',
        "resultVersion" INTEGER NOT NULL DEFAULT 1,
        "isLatestVersion" BOOLEAN NOT NULL DEFAULT 1,
        "previousRecordId" TEXT,
        "assessmentDate" TEXT,
        "assignedTeacherId" TEXT,
        "assignedTeacherName" TEXT,
        "assessorUserId" TEXT,
        "assessorTeacherId" TEXT,
        "assessorName" TEXT,
        "criteriaResultsJson" TEXT NOT NULL DEFAULT '{}',
        "countEvaluated" INTEGER NOT NULL DEFAULT 0,
        "countDat" INTEGER NOT NULL DEFAULT 0,
        "countKhongDat" INTEGER NOT NULL DEFAULT 0,
        "countKhongLam" INTEGER NOT NULL DEFAULT 0,
        "countChuaDanhGia" INTEGER NOT NULL DEFAULT 16,
        "generalComment" TEXT,
        "highlightsComment" TEXT,
        "supportNeededComment" TEXT,
        "teacherRecommendation" TEXT,
        "evaluationStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
        "signatureStatus" TEXT NOT NULL DEFAULT 'UNSIGNED',
        "signatureType" TEXT,
        "signerUserId" TEXT,
        "signerTeacherId" TEXT,
        "signerName" TEXT,
        "signerRole" TEXT,
        "signatureImageBase64" TEXT,
        "signedAt" DATETIME,
        "signedSnapshotJson" TEXT,
        "signedSnapshotHash" TEXT,
        "signedPdfStorageKey" TEXT,
        "signedPdfFileName" TEXT,
        "signedPdfSha256" TEXT,
        "signedPdfSizeBytes" INTEGER,
        "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
        "reviewerUserId" TEXT,
        "reviewerName" TEXT,
        "reviewedAt" DATETIME,
        "reviewNote" TEXT,
        "reopenReason" TEXT,
        "reopenedById" TEXT,
        "reopenedByName" TEXT,
        "reopenedAt" DATETIME,
        "lockVersion" INTEGER NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "tci_records_student_period_subject_version_key" ON "tci_assessment_records"("studentId", "periodId", "subjectCode", "resultVersion")`,
    `CREATE INDEX IF NOT EXISTS "tci_records_studentId_isLatestVersion_idx" ON "tci_assessment_records"("studentId", "isLatestVersion")`,
    `CREATE INDEX IF NOT EXISTS "tci_records_assignedTeacherId_isLatestVersion_idx" ON "tci_assessment_records"("assignedTeacherId", "isLatestVersion")`,

    `CREATE TABLE IF NOT EXISTS "tci_product_evidences" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "recordId" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "periodId" TEXT NOT NULL,
        "subjectId" TEXT NOT NULL,
        "assignmentId" TEXT,
        "resultVersion" INTEGER NOT NULL DEFAULT 1,
        "criterionId" TEXT NOT NULL,
        "criterionStt" INTEGER NOT NULL DEFAULT 16,
        "indicatorCode" TEXT NOT NULL DEFAULT '61',
        "fileName" TEXT NOT NULL,
        "mimeType" TEXT NOT NULL,
        "fileSizeBytes" INTEGER NOT NULL,
        "widthPx" INTEGER,
        "heightPx" INTEGER,
        "rotationDeg" INTEGER NOT NULL DEFAULT 0,
        "imageDataBase64" TEXT NOT NULL,
        "fileSha256" TEXT NOT NULL,
        "uploadedByUserId" TEXT NOT NULL,
        "uploadedByName" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "tci_evidences_recordId_criterionId_status_idx" ON "tci_product_evidences"("recordId", "criterionId", "status")`,
    `CREATE INDEX IF NOT EXISTS "tci_evidences_studentId_periodId_resultVersion_idx" ON "tci_product_evidences"("studentId", "periodId", "resultVersion")`,

    `CREATE TABLE IF NOT EXISTS "tci_audit_logs" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "entityType" TEXT NOT NULL,
        "entityId" TEXT NOT NULL,
        "studentId" TEXT,
        "recordId" TEXT,
        "templateId" TEXT,
        "action" TEXT NOT NULL,
        "actorUserId" TEXT NOT NULL,
        "actorName" TEXT NOT NULL,
        "actorRole" TEXT,
        "reason" TEXT,
        "beforeJson" TEXT,
        "afterJson" TEXT,
        "metadataJson" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "tci_audit_logs_entity_idx" ON "tci_audit_logs"("entityType", "entityId", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "tci_audit_logs_student_idx" ON "tci_audit_logs"("studentId", "createdAt")`,
];

const BOOLEAN_COLS = new Set(["isLatestVersion"]);
const DATE_COLS = new Set(["createdAt", "updatedAt", "activatedAt", "signedAt", "reviewedAt", "reopenedAt"]);
const NUMBER_COLS = new Set([
    "versionNumber",
    "templateVersionNumber",
    "resultVersion",
    "countEvaluated",
    "countDat",
    "countKhongDat",
    "countKhongLam",
    "countChuaDanhGia",
    "signedPdfSizeBytes",
    "lockVersion",
    "criterionStt",
    "fileSizeBytes",
    "widthPx",
    "heightPx",
    "rotationDeg",
]);

function genId(prefix = "tci"): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function serializeValue(val: any): any {
    if (val === undefined) return null;
    if (val === null) return null;
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
        async findMany(args?: { where?: any; orderBy?: any; take?: number; skip?: number }) {
            const params: any[] = [];
            const whereSql = buildWhereClause(args?.where, params);
            const orderSql = buildOrderByClause(args?.orderBy);
            const limitSql = typeof args?.take === "number" ? ` LIMIT ${Math.max(0, Math.floor(args.take))}` : "";
            const offsetSql = typeof args?.skip === "number" ? ` OFFSET ${Math.max(0, Math.floor(args.skip))}` : "";
            const sql = `SELECT * FROM "${tableName}" WHERE ${whereSql}${orderSql}${limitSql}${offsetSql}`;
            return queryRawRows(sql, params);
        },

        async findFirst(args?: { where?: any; orderBy?: any }) {
            const rows = await this.findMany({ ...args, take: 1 });
            return rows[0] || null;
        },

        async findUnique(args: { where: any }) {
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
            if (tableName !== "tci_audit_logs" && !data.updatedAt) {
                data.updatedAt = nowIso;
            }

            const cols: string[] = [];
            const placeholders: string[] = [];
            const params: any[] = [];

            for (const [k, v] of Object.entries(data)) {
                if (v === undefined) continue;
                cols.push(`"${k}"`);
                placeholders.push("?");
                params.push(serializeValue(v));
            }

            const sql = `INSERT INTO "${tableName}" (${cols.join(", ")}) VALUES (${placeholders.join(", ")})`;
            await executeRawSql(sql, params);
            return (await this.findUnique({ where: { id: data.id } })) || normalizeRow(data);
        },

        async update(args: { where: Record<string, any>; data: Record<string, any> }) {
            const data: Record<string, any> = { ...args.data };
            if (tableName !== "tci_audit_logs" && !data.updatedAt) {
                data.updatedAt = new Date().toISOString();
            }

            const setParts: string[] = [];
            const params: any[] = [];

            for (const [k, v] of Object.entries(data)) {
                if (v === undefined) continue;
                setParts.push(`"${k}" = ?`);
                params.push(serializeValue(v));
            }

            if (setParts.length > 0) {
                const whereParams: any[] = [];
                const whereSql = buildWhereClause(args.where, whereParams);
                const sql = `UPDATE "${tableName}" SET ${setParts.join(", ")} WHERE ${whereSql}`;
                await executeRawSql(sql, [...params, ...whereParams]);
            }

            return this.findFirst({ where: args.where });
        },

        async updateMany(args: { where?: Record<string, any>; data: Record<string, any> }) {
            const data: Record<string, any> = { ...args.data };
            if (tableName !== "tci_audit_logs" && !data.updatedAt) {
                data.updatedAt = new Date().toISOString();
            }

            const setParts: string[] = [];
            const params: any[] = [];

            for (const [k, v] of Object.entries(data)) {
                if (v === undefined) continue;
                setParts.push(`"${k}" = ?`);
                params.push(serializeValue(v));
            }

            if (setParts.length === 0) return { count: 0 };

            const whereParams: any[] = [];
            const whereSql = buildWhereClause(args.where, whereParams);
            const sql = `UPDATE "${tableName}" SET ${setParts.join(", ")} WHERE ${whereSql}`;
            await executeRawSql(sql, [...params, ...whereParams]);
            return { count: 1 };
        },

        async delete(args: { where: Record<string, any> }) {
            const existing = await this.findFirst({ where: args.where });
            const params: any[] = [];
            const whereSql = buildWhereClause(args.where, params);
            await executeRawSql(`DELETE FROM "${tableName}" WHERE ${whereSql}`, params);
            return existing;
        },
    };
}

const tciDelegates = {
    tciTemplate: createTableDelegate("tci_templates", "tcitpl"),
    tciAssessmentRecord: createTableDelegate("tci_assessment_records", "tcirec"),
    tciProductEvidence: createTableDelegate("tci_product_evidences", "tciev"),
    tciAuditLog: createTableDelegate("tci_audit_logs", "tciaud"),
};

export function getTciDb() {
    return tciDelegates;
}

/**
 * Khởi tạo bảng CSDL TCI và seed idempotent danh mục môn TCI + mẫu 16 tiêu chí mặc định
 */
export async function ensureTciSchema(): Promise<void> {
    if (schemaInitialized) return;
    if (schemaInitPromise) return schemaInitPromise;

    schemaInitPromise = (async () => {
        try {
            const localClient = getFallbackClient();
            for (const sql of TCI_DDL_STATEMENTS) {
                try {
                    await (prisma as any).$executeRawUnsafe(sql);
                } catch {
                    // ignore if prisma points elsewhere
                }
                try {
                    await localClient.execute(sql);
                } catch {
                    // ignore if already exists
                }
            }

            // 1. Seed / Chuẩn hóa idempotent danh mục môn khảo sát TCI (AssessmentSubject)
            // Đảm bảo tách riêng code = "TCI", name = "Bộ chuẩn phát triển trẻ em 5–6 tuổi", không bị nối thành "tuổiTCI"
            let tciSubject: any = null;
            try {
                tciSubject = await prisma.assessmentSubject.findUnique({
                    where: { code: TCI_SUBJECT_CODE },
                });

                if (!tciSubject) {
                    tciSubject = await prisma.assessmentSubject.create({
                        data: {
                            code: TCI_SUBJECT_CODE,
                            name: TCI_SUBJECT_NAME,
                            subjectType: TCI_ASSESSMENT_TYPE,
                            scoreColumns: 16,
                            commentColumns: 4,
                            status: "ACTIVE",
                        },
                    });
                } else {
                    const needsCleanName =
                        tciSubject.name !== TCI_SUBJECT_NAME ||
                        tciSubject.name.includes("tuổiTCI") ||
                        tciSubject.subjectType !== TCI_ASSESSMENT_TYPE ||
                        tciSubject.scoreColumns !== 16;

                    if (needsCleanName) {
                        tciSubject = await prisma.assessmentSubject.update({
                            where: { id: tciSubject.id },
                            data: {
                                code: TCI_SUBJECT_CODE,
                                name: TCI_SUBJECT_NAME,
                                subjectType: TCI_ASSESSMENT_TYPE,
                                scoreColumns: 16,
                                commentColumns: Math.max(tciSubject.commentColumns || 0, 4),
                                status: "ACTIVE",
                            },
                        });
                    }
                }
            } catch (e) {
                console.warn("[TCI Schema Init] Could not upsert AssessmentSubject TCI:", e);
            }

            // 2. Seed idempotent mẫu phiếu 16 tiêu chí TCI mặc định (v1.0) nếu chưa tồn tại
            const db = getTciDb();
            const existingDefault = await db.tciTemplate.findFirst({
                where: {
                    code: TCI_DEFAULT_TEMPLATE_CODE,
                    versionNumber: 1,
                },
            });

            if (!existingDefault) {
                const nowIso = new Date().toISOString();
                await db.tciTemplate.create({
                    data: {
                        id: "tcitpl_default_v1",
                        code: TCI_DEFAULT_TEMPLATE_CODE,
                        name: TCI_DEFAULT_TEMPLATE_NAME,
                        subjectId: tciSubject?.id || null,
                        subjectCode: TCI_SUBJECT_CODE,
                        subjectName: TCI_SUBJECT_NAME,
                        academicYearId: "ALL",
                        periodId: "ALL",
                        educationSystemId: "ALL",
                        grade: "Khối 1",
                        versionNumber: 1,
                        versionCode: "v1.0",
                        status: "ACTIVE",
                        criteriaJson: JSON.stringify(DEFAULT_TCI_CRITERIA_16),
                        footerConfigJson: JSON.stringify(DEFAULT_TCI_FOOTER_CONFIG),
                        exportConfigJson: JSON.stringify(DEFAULT_TCI_EXPORT_CONFIG),
                        createdByName: "Hệ thống Sky-Line",
                        activatedAt: nowIso,
                    },
                });
            }

            schemaInitialized = true;
        } finally {
            schemaInitPromise = null;
        }
    })();

    return schemaInitPromise;
}
