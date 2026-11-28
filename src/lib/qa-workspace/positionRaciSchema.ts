import { prisma } from "@/lib/db"
import {
  KTDBCL_ACCOUNTABLE_POSITION,
  KTDBCL_POSITION_CATALOG,
  KTDBCL_UNIT_SCOPE,
  parseCsvMatrix,
  ParsedPositionTaskTemplate,
  parseKtdbclRaciMatrixRows,
  RaciRoleCode,
} from "./positionRaciParser"
import { KTDBCL_RACI_CSV_RAW } from "./positionRaciCsvData"

export interface PositionStaffMapping {
  positionCode: string
  userId: string
  fullName: string
  email: string | null
  isPrimary: boolean
}

export interface PositionTaskTemplateRecord {
  id: string
  unitScope: string
  itemCode: string
  stt: number
  functionGroup: string
  mainTask: string
  detailTask: string
  title: string
  frequency: string
  reportCadences: Array<"WEEKLY" | "MONTHLY" | "SEMESTER" | "YEARLY" | "EVENT">
  deliverables: string
  kpiTarget: string
  completionCriteria: string
  accountablePositionCode: string
  adminNote: string | null
  isActive: boolean
  version: number
  updatedByName: string | null
  updatedAt: string | null
  raciLinks: Array<{ positionCode: string; raciRole: RaciRoleCode }>
  rPositions: string[]
  cPositions: string[]
  iPositions: string[]
  recommendedScopeFields: Array<"CAMPUS" | "ACADEMIC_YEAR" | "EXAM_PERIOD" | "SURVEY_WAVE">
}

export interface PositionTemplateSnapshot {
  templateId: string
  itemCode: string
  version: number
  title: string
  detailTask: string
  mainTask: string
  functionGroup: string
  frequency: string
  reportCadences: string[]
  deliverables: string
  kpiTarget: string
  completionCriteria: string
  accountablePositionCode: string
  rPositions: string[]
  cPositions: string[]
  iPositions: string[]
  selectedPositionCode?: string | null
  capturedAt: string
}

let posRaciInitPromise: Promise<void> | null = null

const POSITION_RACI_DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS "qa_position_catalog" (
    "positionCode" TEXT NOT NULL PRIMARY KEY,
    "positionName" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "unitScope" TEXT NOT NULL DEFAULT 'BAN_KT_DBCL',
    "taskGroupName" TEXT NOT NULL DEFAULT 'KT&ĐBCL',
    "description" TEXT NOT NULL DEFAULT '',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isManagedPosition" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "qa_position_staff_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "positionCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isPrimary" INTEGER NOT NULL DEFAULT 0,
    "assignedByName" TEXT,
    "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("positionCode", "userId")
  )`,
  `CREATE INDEX IF NOT EXISTS "qa_pos_staff_pos_idx" ON "qa_position_staff_assignments"("positionCode")`,
  `CREATE TABLE IF NOT EXISTS "qa_position_task_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitScope" TEXT NOT NULL DEFAULT 'BAN_KT_DBCL',
    "itemCode" TEXT NOT NULL,
    "stt" INTEGER NOT NULL DEFAULT 0,
    "functionGroup" TEXT NOT NULL DEFAULT '',
    "mainTask" TEXT NOT NULL DEFAULT '',
    "detailTask" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "frequency" TEXT NOT NULL DEFAULT '',
    "reportCadencesJson" TEXT NOT NULL DEFAULT '[]',
    "deliverables" TEXT NOT NULL DEFAULT '',
    "kpiTarget" TEXT NOT NULL DEFAULT '',
    "completionCriteria" TEXT NOT NULL DEFAULT '',
    "accountablePositionCode" TEXT NOT NULL DEFAULT 'VT123',
    "adminNote" TEXT,
    "recommendedScopeFieldsJson" TEXT NOT NULL DEFAULT '[]',
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedByName" TEXT,
    "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("unitScope", "itemCode")
  )`,
  `CREATE INDEX IF NOT EXISTS "qa_pos_tpl_unit_idx" ON "qa_position_task_templates"("unitScope", "isActive")`,
  `CREATE TABLE IF NOT EXISTS "qa_position_template_raci" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "positionCode" TEXT NOT NULL,
    "raciRole" TEXT NOT NULL,
    UNIQUE("templateId", "positionCode")
  )`,
  `CREATE INDEX IF NOT EXISTS "qa_pos_raci_pos_idx" ON "qa_position_template_raci"("positionCode", "raciRole")`,
]

export async function ensurePositionRaciSchema(): Promise<void> {
  if (!posRaciInitPromise) {
    posRaciInitPromise = (async () => {
      const pAny = prisma as any
      if (typeof pAny.$executeRawUnsafe !== "function") return
      for (const ddl of POSITION_RACI_DDL) {
        try {
          await pAny.$executeRawUnsafe(ddl)
        } catch (err) {
          console.warn("[ensurePositionRaciSchema] DDL warning:", err)
        }
      }
    })().catch((err) => {
      posRaciInitPromise = null
      console.error("[ensurePositionRaciSchema] Init error:", err)
    })
  }
  return posRaciInitPromise
}

export function loadCanonicalRaciTemplatesFromDisk(): ParsedPositionTaskTemplate[] {
  const rows = parseCsvMatrix(KTDBCL_RACI_CSV_RAW)
  return parseKtdbclRaciMatrixRows(rows)
}

/**
 * Idempotent seed/upsert for 07 KT&ĐBCL positions (+ VT123 A) and 78 unique RACI task templates.
 * Running this repeatedly keeps the exact same count of templates and preserves existing staff mappings.
 */
export async function seedKtdbclPositionRaciCatalog(options?: {
  forceUpdateExisting?: boolean
  actorName?: string
}): Promise<{
  positionsCount: number
  templatesCount: number
  raciLinksCount: number
}> {
  await ensurePositionRaciSchema()
  const pAny = prisma as any
  if (typeof pAny.$executeRawUnsafe !== "function") {
    return { positionsCount: 0, templatesCount: 0, raciLinksCount: 0 }
  }

  const nowIso = new Date().toISOString()
  const actorName = options?.actorName || "SYSTEM_RACI_SEED"

  // 1. Upsert 07 managed positions + VT123 (A)
  const allPositions = [...KTDBCL_POSITION_CATALOG, KTDBCL_ACCOUNTABLE_POSITION]
  for (const pos of allPositions) {
    await pAny.$executeRawUnsafe(
      `INSERT INTO "qa_position_catalog"
        ("positionCode", "positionName", "shortCode", "unitScope", "taskGroupName", "description", "displayOrder", "isManagedPosition", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT("positionCode") DO UPDATE SET
        "positionName" = excluded."positionName",
        "shortCode" = excluded."shortCode",
        "taskGroupName" = excluded."taskGroupName",
        "description" = excluded."description",
        "displayOrder" = excluded."displayOrder",
        "isManagedPosition" = excluded."isManagedPosition",
        "updatedAt" = excluded."updatedAt"`,
      pos.positionCode,
      pos.positionName,
      pos.shortCode,
      pos.unitScope,
      pos.taskGroupName,
      pos.description,
      pos.displayOrder,
      pos.isManagedPosition ? 1 : 0,
      nowIso
    )
  }

  // 2. Parse canonical 78 templates & upsert by (unitScope, itemCode)
  const parsed = loadCanonicalRaciTemplatesFromDisk()
  let raciLinksCount = 0

  for (const tpl of parsed) {
    const deterministicId = `tpl_${tpl.unitScope.toLowerCase()}_${tpl.itemCode.replace(/\./g, "_")}`

    if (options?.forceUpdateExisting) {
      await pAny.$executeRawUnsafe(
        `INSERT INTO "qa_position_task_templates"
          ("id", "unitScope", "itemCode", "stt", "functionGroup", "mainTask", "detailTask", "title", "frequency", "reportCadencesJson", "deliverables", "kpiTarget", "completionCriteria", "accountablePositionCode", "adminNote", "recommendedScopeFieldsJson", "isActive", "version", "updatedByName", "updatedAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
         ON CONFLICT("unitScope", "itemCode") DO UPDATE SET
          "stt" = excluded."stt",
          "functionGroup" = excluded."functionGroup",
          "mainTask" = excluded."mainTask",
          "detailTask" = excluded."detailTask",
          "title" = excluded."title",
          "frequency" = excluded."frequency",
          "reportCadencesJson" = excluded."reportCadencesJson",
          "deliverables" = excluded."deliverables",
          "kpiTarget" = excluded."kpiTarget",
          "completionCriteria" = excluded."completionCriteria",
          "accountablePositionCode" = excluded."accountablePositionCode",
          "adminNote" = COALESCE("qa_position_task_templates"."adminNote", excluded."adminNote"),
          "recommendedScopeFieldsJson" = excluded."recommendedScopeFieldsJson",
          "updatedByName" = excluded."updatedByName",
          "updatedAt" = excluded."updatedAt"`,
        deterministicId,
        tpl.unitScope,
        tpl.itemCode,
        tpl.stt,
        tpl.functionGroup,
        tpl.mainTask,
        tpl.detailTask,
        tpl.title,
        tpl.frequency,
        JSON.stringify(tpl.reportCadences),
        tpl.deliverables,
        tpl.kpiTarget,
        tpl.completionCriteria,
        tpl.accountablePositionCode,
        tpl.adminNote,
        JSON.stringify(tpl.recommendedScopeFields),
        actorName,
        nowIso
      )
    } else {
      await pAny.$executeRawUnsafe(
        `INSERT OR IGNORE INTO "qa_position_task_templates"
          ("id", "unitScope", "itemCode", "stt", "functionGroup", "mainTask", "detailTask", "title", "frequency", "reportCadencesJson", "deliverables", "kpiTarget", "completionCriteria", "accountablePositionCode", "adminNote", "recommendedScopeFieldsJson", "isActive", "version", "updatedByName", "updatedAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
        deterministicId,
        tpl.unitScope,
        tpl.itemCode,
        tpl.stt,
        tpl.functionGroup,
        tpl.mainTask,
        tpl.detailTask,
        tpl.title,
        tpl.frequency,
        JSON.stringify(tpl.reportCadences),
        tpl.deliverables,
        tpl.kpiTarget,
        tpl.completionCriteria,
        tpl.accountablePositionCode,
        tpl.adminNote,
        JSON.stringify(tpl.recommendedScopeFields),
        actorName,
        nowIso
      )
    }

    // Lookup actual stored templateId (in case row already existed)
    const idRows: any[] = await pAny.$queryRawUnsafe(
      `SELECT "id" FROM "qa_position_task_templates" WHERE "unitScope" = ? AND "itemCode" = ? LIMIT 1`,
      tpl.unitScope,
      tpl.itemCode
    )
    const actualTemplateId = idRows?.[0]?.id || deterministicId

    for (const link of tpl.raciLinks) {
      const linkId = `raci_${actualTemplateId}_${link.positionCode}`
      await pAny.$executeRawUnsafe(
        `INSERT INTO "qa_position_template_raci" ("id", "templateId", "positionCode", "raciRole")
         VALUES (?, ?, ?, ?)
         ON CONFLICT("templateId", "positionCode") DO UPDATE SET "raciRole" = excluded."raciRole"`,
        linkId,
        actualTemplateId,
        link.positionCode,
        link.raciRole
      )
      raciLinksCount++
    }
  }

  return {
    positionsCount: KTDBCL_POSITION_CATALOG.length,
    templatesCount: parsed.length,
    raciLinksCount,
  }
}

export async function getPositionRaciCatalogData() {
  await ensurePositionRaciSchema()
  const pAny = prisma as any
  if (typeof pAny.$queryRawUnsafe !== "function") {
    return {
      positions: KTDBCL_POSITION_CATALOG,
      staffMappings: [] as PositionStaffMapping[],
      templates: [] as PositionTaskTemplateRecord[],
    }
  }

  // Auto-seed idempotently if catalog is empty
  const countRows: any[] = await pAny.$queryRawUnsafe(
    `SELECT COUNT(*) AS cnt FROM "qa_position_task_templates" WHERE "unitScope" = ?`,
    KTDBCL_UNIT_SCOPE
  )
  if (Number(countRows?.[0]?.cnt || 0) === 0) {
    await seedKtdbclPositionRaciCatalog({ forceUpdateExisting: false })
  }

  const [posRows, staffRows, tplRows, raciRows] = await Promise.all([
    pAny.$queryRawUnsafe(
      `SELECT * FROM "qa_position_catalog" WHERE "unitScope" = ? AND "isManagedPosition" = 1 ORDER BY "displayOrder" ASC`,
      KTDBCL_UNIT_SCOPE
    ),
    pAny.$queryRawUnsafe(`SELECT * FROM "qa_position_staff_assignments" ORDER BY "isPrimary" DESC, "updatedAt" DESC`),
    pAny.$queryRawUnsafe(
      `SELECT * FROM "qa_position_task_templates" WHERE "unitScope" = ? ORDER BY "stt" ASC`,
      KTDBCL_UNIT_SCOPE
    ),
    pAny.$queryRawUnsafe(`SELECT * FROM "qa_position_template_raci"`),
  ])

  // Enrich staff mappings with User names/emails
  const staffUserIds = Array.from(
    new Set((staffRows || []).map((r: any) => String(r.userId)).filter(Boolean))
  ) as string[]
  const users =
    staffUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: staffUserIds } },
          select: { id: true, fullName: true, email: true },
        })
      : []
  const userMap = new Map(users.map((u) => [u.id, u]))

  const staffMappings: PositionStaffMapping[] = (staffRows || [])
    .filter((r: any) => userMap.has(String(r.userId)))
    .map((r: any) => {
      const u = userMap.get(String(r.userId))!
      return {
        positionCode: String(r.positionCode),
        userId: u.id,
        fullName: u.fullName || "Nhân sự",
        email: u.email || null,
        isPrimary: Boolean(Number(r.isPrimary)),
      }
    })

  // Group RACI links by templateId
  const raciByTpl = new Map<string, Array<{ positionCode: string; raciRole: RaciRoleCode }>>()
  for (const r of raciRows || []) {
    const tid = String(r.templateId)
    if (!raciByTpl.has(tid)) raciByTpl.set(tid, [])
    raciByTpl.get(tid)!.push({
      positionCode: String(r.positionCode),
      raciRole: String(r.raciRole).toUpperCase() as RaciRoleCode,
    })
  }

  const safeJson = <T,>(raw: any, fb: T): T => {
    try {
      return raw ? (JSON.parse(String(raw)) as T) : fb
    } catch {
      return fb
    }
  }

  const templates: PositionTaskTemplateRecord[] = (tplRows || []).map((t: any) => {
    const links = raciByTpl.get(String(t.id)) || []
    const rPositions = links.filter((l) => l.raciRole === "R").map((l) => l.positionCode)
    const cPositions = links.filter((l) => l.raciRole === "C").map((l) => l.positionCode)
    const iPositions = links.filter((l) => l.raciRole === "I").map((l) => l.positionCode)

    return {
      id: String(t.id),
      unitScope: String(t.unitScope || KTDBCL_UNIT_SCOPE),
      itemCode: String(t.itemCode),
      stt: Number(t.stt || 0),
      functionGroup: String(t.functionGroup || ""),
      mainTask: String(t.mainTask || ""),
      detailTask: String(t.detailTask || ""),
      title: String(t.title || ""),
      frequency: String(t.frequency || ""),
      reportCadences: safeJson(t.reportCadencesJson, ["MONTHLY"]),
      deliverables: String(t.deliverables || ""),
      kpiTarget: String(t.kpiTarget || ""),
      completionCriteria: String(t.completionCriteria || ""),
      accountablePositionCode: String(t.accountablePositionCode || "VT123"),
      adminNote: t.adminNote ? String(t.adminNote) : null,
      isActive: Boolean(Number(t.isActive ?? 1)),
      version: Number(t.version || 1),
      updatedByName: t.updatedByName ? String(t.updatedByName) : null,
      updatedAt: t.updatedAt ? String(t.updatedAt) : null,
      raciLinks: links,
      rPositions,
      cPositions,
      iPositions,
      recommendedScopeFields: safeJson(t.recommendedScopeFieldsJson, ["ACADEMIC_YEAR"]),
    }
  })

  const positions =
    (posRows || []).length > 0
      ? posRows.map((p: any) => ({
          positionCode: String(p.positionCode),
          positionName: String(p.positionName),
          shortCode: String(p.shortCode),
          unitScope: String(p.unitScope),
          taskGroupName: String(p.taskGroupName || "KT&ĐBCL"),
          description: String(p.description || ""),
          displayOrder: Number(p.displayOrder || 0),
          isManagedPosition: Boolean(Number(p.isManagedPosition ?? 1)),
        }))
      : KTDBCL_POSITION_CATALOG

  return {
    positions,
    staffMappings,
    templates,
  }
}

export function buildTemplateSnapshot(
  template: PositionTaskTemplateRecord,
  selectedPositionCode?: string | null
): PositionTemplateSnapshot {
  return {
    templateId: template.id,
    itemCode: template.itemCode,
    version: template.version,
    title: template.title,
    detailTask: template.detailTask,
    mainTask: template.mainTask,
    functionGroup: template.functionGroup,
    frequency: template.frequency,
    reportCadences: template.reportCadences,
    deliverables: template.deliverables,
    kpiTarget: template.kpiTarget,
    completionCriteria: template.completionCriteria,
    accountablePositionCode: template.accountablePositionCode,
    rPositions: template.rPositions,
    cPositions: template.cPositions,
    iPositions: template.iPositions,
    selectedPositionCode: selectedPositionCode || template.rPositions[0] || null,
    capturedAt: new Date().toISOString(),
  }
}
