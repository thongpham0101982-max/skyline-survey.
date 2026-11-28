import type { PrismaClient } from "@prisma/client"

export type ParentGradePeriodCode = "KSĐN" | "GK1" | "CK1" | "GK2" | "CK2"

export interface ParentGradePeriodMeta {
  code: ParentGradePeriodCode
  label: string
  shortLabel: string
  description: string
  defaultLocked: boolean
}

export interface ParentGradeVisibilityItem {
  period: ParentGradePeriodCode
  label: string
  shortLabel: string
  description: string
  isLocked: boolean
  isDefault: boolean
  updatedBy: string | null
  updatedAt: string | null
  reason: string | null
}

export const PARENT_GRADE_VISIBILITY_CATEGORY = "PARENT_GRADE_VISIBILITY"

export const PARENT_GRADE_PERIODS: ParentGradePeriodMeta[] = [
  {
    code: "KSĐN",
    label: "Khảo sát đầu năm",
    shortLabel: "KSĐN",
    description: "Kết quả khảo sát chất lượng đầu năm học",
    defaultLocked: false,
  },
  {
    code: "GK1",
    label: "Giữa kỳ 1",
    shortLabel: "GK1",
    description: "Điểm kiểm tra định kỳ Giữa học kỳ 1",
    defaultLocked: true,
  },
  {
    code: "CK1",
    label: "Cuối kỳ 1",
    shortLabel: "CK1",
    description: "Điểm kiểm tra định kỳ Cuối học kỳ 1",
    defaultLocked: false,
  },
  {
    code: "GK2",
    label: "Giữa kỳ 2",
    shortLabel: "GK2",
    description: "Điểm kiểm tra định kỳ Giữa học kỳ 2",
    defaultLocked: true,
  },
  {
    code: "CK2",
    label: "Cuối kỳ 2",
    shortLabel: "CK2",
    description: "Điểm kiểm tra định kỳ Cuối học kỳ 2",
    defaultLocked: false,
  },
]

export const DEFAULT_PARENT_GRADE_LOCKS: Record<ParentGradePeriodCode, boolean> = {
  KSĐN: false,
  GK1: true,
  CK1: false,
  GK2: true,
  CK2: false,
}

export function normalizeParentGradePeriod(raw?: string | null): ParentGradePeriodCode | null {
  if (!raw) return null
  const upper = String(raw).trim().toUpperCase()
  if (!upper) return null

  if (upper === "KSĐN" || upper === "KSDN" || upper.includes("ĐẦU NĂM") || upper.includes("DAU NAM")) {
    return "KSĐN"
  }
  if (
    upper === "GK1" ||
    upper === "GIUA_KY_1" ||
    upper === "GIUA_KI_1" ||
    upper.includes("GIỮA KỲ 1") ||
    upper.includes("GIỮA KÌ 1") ||
    upper.includes("GIUA KY 1")
  ) {
    return "GK1"
  }
  if (
    upper === "CK1" ||
    upper === "CUOI_KY_1" ||
    upper === "CUOI_KI_1" ||
    upper.includes("CUỐI KỲ 1") ||
    upper.includes("CUỐI KÌ 1") ||
    upper.includes("CUOI KY 1")
  ) {
    return "CK1"
  }
  if (
    upper === "GK2" ||
    upper === "GIUA_KY_2" ||
    upper === "GIUA_KI_2" ||
    upper.includes("GIỮA KỲ 2") ||
    upper.includes("GIỮA KÌ 2") ||
    upper.includes("GIUA KY 2")
  ) {
    return "GK2"
  }
  if (
    upper === "CK2" ||
    upper === "CUOI_KY_2" ||
    upper === "CUOI_KI_2" ||
    upper.includes("CUỐI KỲ 2") ||
    upper.includes("CUỐI KÌ 2") ||
    upper.includes("CUOI KY 2")
  ) {
    return "CK2"
  }

  return null
}

function parseVisibilityPayload(rawName?: string | null): {
  isLocked?: boolean
  updatedBy?: string | null
  updatedAt?: string | null
  reason?: string | null
} | null {
  if (!rawName) return null
  try {
    const parsed = JSON.parse(rawName)
    if (parsed && typeof parsed === "object") {
      return {
        isLocked: typeof parsed.isLocked === "boolean" ? parsed.isLocked : undefined,
        updatedBy: typeof parsed.updatedBy === "string" ? parsed.updatedBy : null,
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
        reason: typeof parsed.reason === "string" ? parsed.reason : null,
      }
    }
  } catch {
    if (rawName === "LOCKED" || rawName === "true") return { isLocked: true }
    if (rawName === "OPEN" || rawName === "false") return { isLocked: false }
  }
  return null
}

export function buildParentGradeVisibilityMap(
  records: Array<{ code: string; name: string; academicYearId: string | null }>,
  academicYearId?: string | null
): Record<ParentGradePeriodCode, ParentGradeVisibilityItem> {
  const result = {} as Record<ParentGradePeriodCode, ParentGradeVisibilityItem>

  for (const meta of PARENT_GRADE_PERIODS) {
    result[meta.code] = {
      period: meta.code,
      label: meta.label,
      shortLabel: meta.shortLabel,
      description: meta.description,
      isLocked: meta.defaultLocked,
      isDefault: true,
      updatedBy: null,
      updatedAt: null,
      reason: meta.defaultLocked
        ? "Mặc định khóa hiển thị điểm giữa kỳ đối với Phụ huynh học sinh"
        : null,
    }
  }

  // Apply global (academicYearId === null) records first, then year-specific records
  const sorted = [...records].sort((a, b) => {
    const aSpec = academicYearId && a.academicYearId === academicYearId ? 1 : 0
    const bSpec = academicYearId && b.academicYearId === academicYearId ? 1 : 0
    return aSpec - bSpec
  })

  for (const rec of sorted) {
    const period = normalizeParentGradePeriod(rec.code)
    if (!period) continue
    const payload = parseVisibilityPayload(rec.name)
    if (!payload || typeof payload.isLocked !== "boolean") continue

    result[period] = {
      ...result[period],
      isLocked: payload.isLocked,
      isDefault: false,
      updatedBy: payload.updatedBy ?? null,
      updatedAt: payload.updatedAt ?? null,
      reason: payload.reason ?? null,
    }
  }

  return result
}

export async function getParentGradeVisibilityMap(
  db: Pick<PrismaClient, "assessmentConfig">,
  academicYearId?: string | null
): Promise<Record<ParentGradePeriodCode, ParentGradeVisibilityItem>> {
  try {
    const where = academicYearId
      ? {
          categoryType: PARENT_GRADE_VISIBILITY_CATEGORY,
          OR: [{ academicYearId }, { academicYearId: null }],
        }
      : {
          categoryType: PARENT_GRADE_VISIBILITY_CATEGORY,
          academicYearId: null,
        }

    const records = await db.assessmentConfig.findMany({
      where,
      select: {
        code: true,
        name: true,
        academicYearId: true,
      },
    })

    return buildParentGradeVisibilityMap(records, academicYearId)
  } catch (err) {
    console.error("Failed to fetch parent grade visibility config:", err)
    return buildParentGradeVisibilityMap([], academicYearId)
  }
}

export function isParentGradePeriodLocked(
  visibilityMap: Record<ParentGradePeriodCode, ParentGradeVisibilityItem>,
  rawPeriod?: string | null
): boolean {
  const normalized = normalizeParentGradePeriod(rawPeriod)
  if (!normalized) return false
  return Boolean(visibilityMap[normalized]?.isLocked)
}

export function getLockedParentGradePeriods(
  visibilityMap: Record<ParentGradePeriodCode, ParentGradeVisibilityItem>
): ParentGradePeriodCode[] {
  return PARENT_GRADE_PERIODS.filter((p) => Boolean(visibilityMap[p.code]?.isLocked)).map(
    (p) => p.code
  )
}
