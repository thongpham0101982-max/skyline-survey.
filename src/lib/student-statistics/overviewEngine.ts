import { generateAcademicCommitmentStatistics } from "./academicCommitmentEngine"
import { generateExchangeStudentStatistics } from "./exchangeStudentEngine"
import { generateHomeschoolingStatistics } from "./homeschoolingEngine"
import { generatePsychologyCommitmentStatistics } from "./psychologyCommitmentEngine"
import { loadEnrolledTransferInLookup } from "./standardEvaluator"
import {
  HierarchyNodeMetrics,
  OverviewCohortStats,
  OverviewFilterInput,
  OverviewHierarchyNode,
  OverviewReportPayload,
  PsychHierarchyNodeMetrics,
  StudentStatisticsAccessScope,
} from "./types"

function emptyCohort(): OverviewCohortStats {
  return {
    studentCount: 0,
    shareOfEnrolledRate: null,
    standardMetCount: 0,
    standardEligibleCount: 0,
    standardRate: null,
    outstandingCount: 0,
  }
}

function fromAcademicNode(
  node: HierarchyNodeMetrics | undefined,
  enrolledCount: number
): OverviewCohortStats {
  if (!node) return emptyCohort()
  return {
    studentCount: node.distinctStudentCount,
    shareOfEnrolledRate:
      enrolledCount > 0
        ? Math.round((node.distinctStudentCount / enrolledCount) * 1000) / 10
        : null,
    standardMetCount: node.totalStandardMetCount,
    standardEligibleCount: node.eligibleRowCount,
    standardRate: node.standardRate,
    outstandingCount: node.outstandingCount,
  }
}

function fromPsychNode(
  node: PsychHierarchyNodeMetrics | undefined,
  enrolledCount: number
): OverviewCohortStats {
  if (!node) return emptyCohort()
  return {
    studentCount: node.totalStudents,
    shareOfEnrolledRate:
      enrolledCount > 0 ? Math.round((node.totalStudents / enrolledCount) * 1000) / 10 : null,
    standardMetCount: node.monthSummarizedStudents,
    standardEligibleCount: node.totalStudents,
    standardRate: node.monthSummaryRate,
    outstandingCount: 0,
  }
}

function indexHierarchyByKey<T extends { id: string; code: string; children?: T[] }>(
  root: T | null | undefined,
  keyExtractor: (node: T, parentPath: string) => string
): Map<string, T> {
  const map = new Map<string, T>()
  if (!root) return map
  const walk = (node: T, parentPath: string) => {
    const k = keyExtractor(node, parentPath)
    map.set(k, node)
    for (const ch of node.children || []) {
      walk(ch, k)
    }
  }
  walk(root, "")
  return map
}

export async function generateOverviewStatistics(
  filters: OverviewFilterInput,
  scope: StudentStatisticsAccessScope
): Promise<OverviewReportPayload> {
  const [academic, homeschooling, exchange, psychology] = await Promise.all([
    generateAcademicCommitmentStatistics(
      {
        academicYearId: filters.academicYearId,
        campusId: filters.campusId,
        asOfDate: filters.asOfDate,
      },
      scope
    ),
    generateHomeschoolingStatistics(
      {
        academicYearId: filters.academicYearId,
        campusId: filters.campusId,
        asOfDate: filters.asOfDate,
      },
      scope
    ),
    generateExchangeStudentStatistics(
      {
        academicYearId: filters.academicYearId,
        campusId: filters.campusId,
        asOfDate: filters.asOfDate,
      },
      scope
    ),
    scope.canViewPsychologyTab
      ? generatePsychologyCommitmentStatistics(
          {
            academicYearId: filters.academicYearId,
            campusId: filters.campusId,
            asOfDate: filters.asOfDate,
          },
          scope
        ).catch(() => null)
      : Promise.resolve(null),
  ])

  const keyFn = (
    node: { nodeType: string; campusId?: string; grade?: string; classId?: string; code: string }
  ) => {
    if (node.nodeType === "SYSTEM") return "SYSTEM"
    if (node.nodeType === "CAMPUS") return `C:${node.campusId || node.code}`
    if (node.nodeType === "GRADE") return `G:${node.campusId || ""}:${node.grade || node.code}`
    return `L:${node.classId || node.code}`
  }

  const acMap = indexHierarchyByKey(academic.hierarchy, (n) => keyFn(n))
  const hsMap = indexHierarchyByKey(homeschooling.hierarchy, (n) => keyFn(n))
  const exMap = indexHierarchyByKey(exchange.hierarchy, (n) => keyFn(n))
  const psMap = indexHierarchyByKey(psychology?.hierarchy || null, (n) => keyFn(n))

  // Thu thập tất cả các cơ sở / khối / lớp xuất hiện ở bất kỳ diện nào
  const campusMetaMap = new Map<
    string,
    { campusId: string; code: string; label: string; enrolled: number }
  >()
  const gradeMetaMap = new Map<
    string,
    { campusKey: string; campusId: string; grade: string; label: string; enrolled: number }
  >()
  const classMetaMap = new Map<
    string,
    {
      gradeKey: string
      campusId: string
      grade: string
      classId: string
      code: string
      label: string
      enrolled: number
    }
  >()

  const registerFromTree = (
    root:
      | {
          children?: Array<{
            campusId?: string
            code: string
            label: string
            enrolledStudentCount: number
            children?: Array<{
              campusId?: string
              grade?: string
              code: string
              label: string
              enrolledStudentCount: number
              children?: Array<{
                campusId?: string
                grade?: string
                classId?: string
                code: string
                label: string
                enrolledStudentCount: number
              }>
            }>
          }>
        }
      | null
      | undefined
  ) => {
    if (!root?.children) return
    for (const cp of root.children) {
      const cKey = `C:${cp.campusId || cp.code}`
      if (!campusMetaMap.has(cKey)) {
        campusMetaMap.set(cKey, {
          campusId: cp.campusId || cp.code,
          code: cp.code,
          label: cp.label,
          enrolled: cp.enrolledStudentCount,
        })
      } else {
        campusMetaMap.get(cKey)!.enrolled = Math.max(
          campusMetaMap.get(cKey)!.enrolled,
          cp.enrolledStudentCount
        )
      }

      for (const gr of cp.children || []) {
        const gKey = `G:${cp.campusId || ""}:${gr.grade || gr.code}`
        if (!gradeMetaMap.has(gKey)) {
          gradeMetaMap.set(gKey, {
            campusKey: cKey,
            campusId: cp.campusId || cp.code,
            grade: gr.grade || gr.code,
            label: gr.label,
            enrolled: gr.enrolledStudentCount,
          })
        } else {
          gradeMetaMap.get(gKey)!.enrolled = Math.max(
            gradeMetaMap.get(gKey)!.enrolled,
            gr.enrolledStudentCount
          )
        }

        for (const cls of gr.children || []) {
          const lKey = `L:${cls.classId || cls.code}`
          if (!classMetaMap.has(lKey)) {
            classMetaMap.set(lKey, {
              gradeKey: gKey,
              campusId: cp.campusId || cp.code,
              grade: gr.grade || gr.code,
              classId: cls.classId || cls.code,
              code: cls.code,
              label: cls.label,
              enrolled: cls.enrolledStudentCount,
            })
          } else {
            classMetaMap.get(lKey)!.enrolled = Math.max(
              classMetaMap.get(lKey)!.enrolled,
              cls.enrolledStudentCount
            )
          }
        }
      }
    }
  }

  registerFromTree(academic.hierarchy)
  registerFromTree(homeschooling.hierarchy)
  registerFromTree(exchange.hierarchy)
  registerFromTree(psychology?.hierarchy)

  // Bổ sung đầy đủ các cơ sở / khối / lớp có HS nhập học từ Lịch sử Chuyển đến (type = "IN")
  const transferIn = await loadEnrolledTransferInLookup({
    academicYearId: academic.filters.academicYearId,
    scope,
    selectedCampusId: academic.filters.campusId,
  })
  for (const cp of transferIn.campuses) {
    const cKey = `C:${cp.id}`
    const cpEnrolled = transferIn.lookup.byCampus.get(cp.id) || 0
    if (!campusMetaMap.has(cKey)) {
      campusMetaMap.set(cKey, {
        campusId: cp.id,
        code: cp.code,
        label: `${cp.name} (${cp.code})`,
        enrolled: cpEnrolled,
      })
    } else {
      campusMetaMap.get(cKey)!.enrolled = Math.max(campusMetaMap.get(cKey)!.enrolled, cpEnrolled)
    }

    for (const gradeKey of transferIn.gradesByCampus.get(cp.id) || []) {
      const gKey = `G:${cp.id}:${gradeKey}`
      const gEnrolled = transferIn.lookup.byCampusGrade.get(`${cp.id}_${gradeKey}`) || 0
      const gLabel = /^\d+$/.test(gradeKey) ? `Khối ${gradeKey}` : gradeKey
      if (!gradeMetaMap.has(gKey)) {
        gradeMetaMap.set(gKey, {
          campusKey: cKey,
          campusId: cp.id,
          grade: gradeKey,
          label: gLabel,
          enrolled: gEnrolled,
        })
      } else {
        gradeMetaMap.get(gKey)!.enrolled = Math.max(gradeMetaMap.get(gKey)!.enrolled, gEnrolled)
      }

      for (const cls of transferIn.classesByCampusGrade.get(`${cp.id}_${gradeKey}`) || []) {
        const lKey = `L:${cls.id}`
        const lEnrolled = transferIn.lookup.byClass.get(cls.id) || 0
        if (!classMetaMap.has(lKey)) {
          classMetaMap.set(lKey, {
            gradeKey: gKey,
            campusId: cp.id,
            grade: gradeKey,
            classId: cls.id,
            code: cls.className,
            label: `Lớp ${cls.className}`,
            enrolled: lEnrolled,
          })
        } else {
          classMetaMap.get(lKey)!.enrolled = Math.max(classMetaMap.get(lKey)!.enrolled, lEnrolled)
        }
      }
    }
  }

  const campusNodes: OverviewHierarchyNode[] = Array.from(campusMetaMap.entries())
    .map(([cKey, cMeta]) => {
      const gradeNodes: OverviewHierarchyNode[] = Array.from(gradeMetaMap.entries())
        .filter(([, g]) => g.campusKey === cKey)
        .map(([gKey, gMeta]) => {
          const classNodes: OverviewHierarchyNode[] = Array.from(classMetaMap.entries())
            .filter(([, cl]) => cl.gradeKey === gKey)
            .map(([lKey, clMeta]) => ({
              id: `ov_${lKey}`,
              code: clMeta.code,
              label: clMeta.label,
              nodeType: "CLASS" as const,
              campusId: clMeta.campusId,
              grade: clMeta.grade,
              classId: clMeta.classId,
              enrolledStudentCount: clMeta.enrolled,
              academicCommitment: fromAcademicNode(acMap.get(lKey), clMeta.enrolled),
              psychologyCommitment: fromPsychNode(psMap.get(lKey), clMeta.enrolled),
              homeschooling: fromAcademicNode(hsMap.get(lKey), clMeta.enrolled),
              exchange: fromAcademicNode(exMap.get(lKey), clMeta.enrolled),
            }))
            .sort((a, b) => a.code.localeCompare(b.code, "vi", { numeric: true }))

          return {
            id: `ov_${gKey}`,
            code: gMeta.grade,
            label: gMeta.label,
            nodeType: "GRADE" as const,
            campusId: gMeta.campusId,
            grade: gMeta.grade,
            enrolledStudentCount: gMeta.enrolled,
            academicCommitment: fromAcademicNode(acMap.get(gKey), gMeta.enrolled),
            psychologyCommitment: fromPsychNode(psMap.get(gKey), gMeta.enrolled),
            homeschooling: fromAcademicNode(hsMap.get(gKey), gMeta.enrolled),
            exchange: fromAcademicNode(exMap.get(gKey), gMeta.enrolled),
            children: classNodes,
          }
        })
        .sort((a, b) => {
          const nA = Number(a.code)
          const nB = Number(b.code)
          if (!Number.isNaN(nA) && !Number.isNaN(nB)) return nA - nB
          return a.code.localeCompare(b.code, "vi")
        })

      return {
        id: `ov_${cKey}`,
        code: cMeta.code,
        label: cMeta.label,
        nodeType: "CAMPUS" as const,
        campusId: cMeta.campusId,
        enrolledStudentCount: cMeta.enrolled,
        academicCommitment: fromAcademicNode(acMap.get(cKey), cMeta.enrolled),
        psychologyCommitment: fromPsychNode(psMap.get(cKey), cMeta.enrolled),
        homeschooling: fromAcademicNode(hsMap.get(cKey), cMeta.enrolled),
        exchange: fromAcademicNode(exMap.get(cKey), cMeta.enrolled),
        children: gradeNodes,
      }
    })
    .sort((a, b) => a.code.localeCompare(b.code, "vi"))

  const sysEnrolled = Math.max(
    transferIn.lookup.system,
    academic.summary.enrolledStudentCount,
    homeschooling.summary.enrolledStudentCount,
    exchange.summary.enrolledStudentCount,
    psychology?.summary.enrolledStudentCount || 0
  )

  const systemNode: OverviewHierarchyNode = {
    id: "ov_SYSTEM",
    code: "SYSTEM",
    label: "Toàn hệ thống",
    nodeType: "SYSTEM",
    enrolledStudentCount: sysEnrolled,
    academicCommitment: fromAcademicNode(acMap.get("SYSTEM"), sysEnrolled),
    psychologyCommitment: fromPsychNode(psMap.get("SYSTEM"), sysEnrolled),
    homeschooling: fromAcademicNode(hsMap.get("SYSTEM"), sysEnrolled),
    exchange: fromAcademicNode(exMap.get("SYSTEM"), sysEnrolled),
    children: campusNodes,
  }

  return {
    asOfDate: academic.asOfDate,
    filters: {
      academicYearId: academic.filters.academicYearId,
      academicYearName: academic.filters.academicYearName,
      campusId: academic.filters.campusId,
      campusName: academic.filters.campusName,
    },
    availableFilters: {
      academicYears: academic.availableFilters.academicYears,
      campuses: academic.availableFilters.campuses,
    },
    canViewPsychologyTab: scope.canViewPsychologyTab,
    hierarchy: systemNode,
  }
}
