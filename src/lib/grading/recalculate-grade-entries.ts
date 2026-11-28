import { prisma } from "@/lib/db"
import {
  computeCompositeFromComponentScores,
  shouldAutoComputeFormulaComposite,
} from "@/lib/grading/formula-calculator"
import { extractGradeNumber } from "@/lib/grading/vnedu-config-types"

function doesClassMatchConfigGrade(configGrade: string, cls: { grade?: string | null; className?: string | null }): boolean {
  const cg = String(configGrade || "").trim()
  if (!cg || cg.toUpperCase() === "ALL") return true

  const targetNum = extractGradeNumber(cg)
  const clsNum = extractGradeNumber(cls.grade || cls.className)
  if (targetNum !== null && clsNum !== null) {
    return targetNum === clsNum
  }

  const c1 = cg.toLowerCase().replace(/khối|khoi|lớp|lop|\s/g, "")
  const c2 = String(cls.grade || cls.className || "").toLowerCase().replace(/khối|khoi|lớp|lop|\s/g, "")
  return c1 !== "" && c1 === c2
}

function doesClassMatchProgram(configProgram: string | null | undefined, classSystem: string | null | undefined): boolean {
  const cp = String(configProgram || "ALL").trim().toUpperCase()
  if (!cp || cp === "ALL") return true
  const cs = String(classSystem || "").trim().toUpperCase()
  if (!cs) return false
  return cs === cp || cs.includes(cp) || cp.includes(cs)
}

/**
 * Recalculate persisted SubjectGradeEntry.compositeScore for all entries matching a saved SubjectGradeConfig.
 * Only runs for subject-specific configs that use formula-based composite calculation.
 */
export async function recalculateGradeEntriesForConfig(config: any): Promise<number> {
  if (!config || !config.academicYearId || !config.subjectId) return 0
  if (!shouldAutoComputeFormulaComposite(config, config.evaluationPeriod)) return 0

  const periodUpper = String(config.evaluationPeriod || "").toUpperCase().trim()
  const periodFilter =
    periodUpper === "ALL"
      ? { not: "CN" }
      : periodUpper === "KSĐN" || periodUpper === "KSDN"
      ? { in: ["KSĐN", "KSDN"] }
      : config.evaluationPeriod

  // Find matching classes for this academicYear + grade + program
  const yearClasses = await prisma.class.findMany({
    where: { academicYearId: config.academicYearId },
    select: { id: true, grade: true, className: true, educationSystem: true },
  })

  const matchingClassIds = yearClasses
    .filter(
      cls =>
        doesClassMatchConfigGrade(config.grade, cls) &&
        doesClassMatchProgram(config.program, cls.educationSystem)
    )
    .map(cls => cls.id)

  if (matchingClassIds.length === 0) return 0

  // If INTERNAL config is saved for a specific main period, it may also override VNEDU entries
  // (matching the override logic in GET /api/teacher/grade-entries).
  const isSpecificMainPeriod = ["GK1", "CK1", "GK2", "CK2"].includes(periodUpper)
  const configTypeFilter =
    config.configType === "INTERNAL" && isSpecificMainPeriod
      ? { in: ["INTERNAL", "VNEDU"] }
      : config.configType

  const entries = await prisma.subjectGradeEntry.findMany({
    where: {
      academicYearId: config.academicYearId,
      subjectId: config.subjectId,
      classId: { in: matchingClassIds },
      evaluationPeriod: periodFilter as any,
      configType: configTypeFilter as any,
    },
    select: {
      id: true,
      componentScores: true,
      compositeScore: true,
    },
  })

  if (entries.length === 0) return 0

  const updates: Array<{ id: string; compositeScore: number }> = []
  for (const entry of entries) {
    if (!entry.componentScores) continue
    const computed = computeCompositeFromComponentScores(entry.componentScores, config)
    if (!computed) continue
    if (entry.compositeScore === null || entry.compositeScore === undefined || Math.abs(entry.compositeScore - computed.value) > 1e-9) {
      updates.push({ id: entry.id, compositeScore: computed.value })
    }
  }

  if (updates.length === 0) return 0

  const CHUNK_SIZE = 50
  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    const chunk = updates.slice(i, i + CHUNK_SIZE)
    await prisma.$transaction(
      chunk.map(u =>
        prisma.subjectGradeEntry.update({
          where: { id: u.id },
          data: { compositeScore: u.compositeScore },
        })
      )
    )
  }

  return updates.length
}
