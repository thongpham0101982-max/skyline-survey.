import { CommitmentPeriodCode } from "@/lib/ktdbcl/entranceCommitmentReportEngine"
import {
  EducationLevelCode,
  HierarchyNodeMetrics,
  PsychHierarchyNodeMetrics,
  STANDARD_CLASSIFICATION_LABELS,
  StandardClassificationCode,
} from "./types"

const EPS = 1e-9

export const PERIOD_LABELS_VI: Record<CommitmentPeriodCode, string> = {
  KSĐN: "KSĐN",
  GK1: "Giữa kỳ 1",
  CK1: "Cuối kỳ 1",
  GK2: "Giữa kỳ 2",
  CK2: "Cuối kỳ 2",
}

/**
 * Xác định kỳ định kỳ gần nhất có điểm hợp lệ (ưu tiên từ mới nhất về cũ nhất: CK2 -> GK2 -> CK1 -> GK1 -> KSĐN).
 * Điểm 0 là điểm hợp lệ.
 */
export function resolveLatestPeriodScore(scores: {
  ksdnScore?: number | null
  gk1Score?: number | null
  ck1Score?: number | null
  gk2Score?: number | null
  ck2Score?: number | null
}): {
  latestPeriod: CommitmentPeriodCode | null
  latestPeriodLabel: string
  latestScore: number | null
} {
  const ordered: Array<{ period: CommitmentPeriodCode; val: number | null | undefined }> = [
    { period: "CK2", val: scores.ck2Score },
    { period: "GK2", val: scores.gk2Score },
    { period: "CK1", val: scores.ck1Score },
    { period: "GK1", val: scores.gk1Score },
    { period: "KSĐN", val: scores.ksdnScore },
  ]

  for (const item of ordered) {
    if (
      item.val !== null &&
      item.val !== undefined &&
      !Number.isNaN(Number(item.val))
    ) {
      return {
        latestPeriod: item.period,
        latestPeriodLabel: PERIOD_LABELS_VI[item.period],
        latestScore: Number(item.val),
      }
    }
  }

  return {
    latestPeriod: null,
    latestPeriodLabel: "Chưa có điểm",
    latestScore: null,
  }
}

/**
 * Quy chuẩn đánh giá theo cấp học dựa trên điểm kỳ định kỳ gần nhất:
 * - Tiểu học:
 *   + Từ 9,0 đến 10: Tiến bộ vượt bậc (tính vào Đạt chuẩn)
 *   + Từ 7,0 đến < 9,0 (7–8): Đạt chuẩn
 *   + Dưới 7,0: Chưa đạt chuẩn
 * - THCS:
 *   + Từ 8,0 đến 10: Tiến bộ vượt bậc (tính vào Đạt chuẩn)
 *   + Từ 5,0 đến < 8,0 (5–7): Đạt chuẩn
 *   + Dưới 5,0: Chưa đạt chuẩn
 * - Bậc học khác (THPT...): dùng ngưỡng cấu hình `configuredThreshold` nếu có; thiếu -> Chưa có cấu hình chuẩn.
 */
export function evaluateLatestStandard(params: {
  level: EducationLevelCode
  latestScore: number | null | undefined
  ksdnScore?: number | null | undefined
  configuredThreshold?: number | null | undefined
}): {
  passThreshold: number | null
  outstandingThreshold: number | null
  classification: StandardClassificationCode
  classificationLabel: string
  isStandardMet: boolean | null // true nếu Đạt chuẩn hoặc Tiến bộ vượt bậc
  isStandardBandOnly: boolean // true nếu nằm đúng khoảng Đạt chuẩn (7–8 Tiểu học / 5–7 THCS)
  isOutstandingProgress: boolean // true nếu Tiến bộ vượt bậc (9–10 Tiểu học / 8–10 THCS)
  isEligibleForStandardRate: boolean // có đủ điểm kỳ gần nhất và có ngưỡng áp dụng
  deltaLatestVsKsdn: number | null
} {
  const score =
    params.latestScore !== null &&
    params.latestScore !== undefined &&
    !Number.isNaN(Number(params.latestScore))
      ? Number(params.latestScore)
      : null

  const ksdn =
    params.ksdnScore !== null &&
    params.ksdnScore !== undefined &&
    !Number.isNaN(Number(params.ksdnScore))
      ? Number(params.ksdnScore)
      : null

  const deltaLatestVsKsdn =
    score !== null && ksdn !== null
      ? Math.round((score - ksdn + Number.EPSILON) * 1000) / 1000
      : null

  let passThreshold: number | null = null
  let outstandingThreshold: number | null = null

  if (params.level === "TIEU_HOC") {
    passThreshold = 7.0
    outstandingThreshold = 9.0
  } else if (params.level === "THCS") {
    passThreshold = 5.0
    outstandingThreshold = 8.0
  } else if (
    params.configuredThreshold !== null &&
    params.configuredThreshold !== undefined &&
    !Number.isNaN(Number(params.configuredThreshold))
  ) {
    passThreshold = Number(params.configuredThreshold)
    outstandingThreshold = passThreshold < 8.0 ? 8.0 : null
  }

  if (passThreshold === null) {
    return {
      passThreshold: null,
      outstandingThreshold: null,
      classification: "CHUA_CO_CAU_HINH_CHUAN",
      classificationLabel: STANDARD_CLASSIFICATION_LABELS.CHUA_CO_CAU_HINH_CHUAN,
      isStandardMet: null,
      isStandardBandOnly: false,
      isOutstandingProgress: false,
      isEligibleForStandardRate: false,
      deltaLatestVsKsdn,
    }
  }

  if (score === null) {
    return {
      passThreshold,
      outstandingThreshold,
      classification: "CHUA_DU_DU_LIEU",
      classificationLabel: STANDARD_CLASSIFICATION_LABELS.CHUA_DU_DU_LIEU,
      isStandardMet: null,
      isStandardBandOnly: false,
      isOutstandingProgress: false,
      isEligibleForStandardRate: false,
      deltaLatestVsKsdn: null,
    }
  }

  if (outstandingThreshold !== null && score >= outstandingThreshold - EPS) {
    return {
      passThreshold,
      outstandingThreshold,
      classification: "TIEN_BO_VUOT_BAC",
      classificationLabel: STANDARD_CLASSIFICATION_LABELS.TIEN_BO_VUOT_BAC,
      isStandardMet: true,
      isStandardBandOnly: false,
      isOutstandingProgress: true,
      isEligibleForStandardRate: true,
      deltaLatestVsKsdn,
    }
  }

  if (score >= passThreshold - EPS) {
    return {
      passThreshold,
      outstandingThreshold,
      classification: "DAT_CHUAN",
      classificationLabel: STANDARD_CLASSIFICATION_LABELS.DAT_CHUAN,
      isStandardMet: true,
      isStandardBandOnly: true,
      isOutstandingProgress: false,
      isEligibleForStandardRate: true,
      deltaLatestVsKsdn,
    }
  }

  return {
    passThreshold,
    outstandingThreshold,
    classification: "CHUA_DAT_CHUAN",
    classificationLabel: STANDARD_CLASSIFICATION_LABELS.CHUA_DAT_CHUAN,
    isStandardMet: false,
    isStandardBandOnly: false,
    isOutstandingProgress: false,
    isEligibleForStandardRate: true,
    deltaLatestVsKsdn,
  }
}

export interface AcademicHierarchyRowInput {
  studentId: string
  studentCode: string
  campusId: string
  campusCode: string
  campusName: string
  grade: string
  classId: string
  className: string
  isEligibleForStandardRate: boolean
  isStandardMet: boolean | null
  isStandardBandOnly: boolean
  isOutstandingProgress: boolean
}

export interface EnrolledCountsLookup {
  system: number
  byCampus: Map<string, number>
  byCampusGrade: Map<string, number>
  byClass: Map<string, number>
}

function finalizeAcademicNode(
  meta: {
    id: string
    code: string
    label: string
    nodeType: "SYSTEM" | "CAMPUS" | "GRADE" | "CLASS"
    campusId?: string
    grade?: string
    classId?: string
  },
  rows: AcademicHierarchyRowInput[],
  enrolledCount: number,
  children?: HierarchyNodeMetrics[]
): HierarchyNodeMetrics {
  const distinctStudents = new Set<string>()
  let eligibleRowCount = 0
  let standardBandCount = 0
  let outstandingCount = 0
  let belowStandardCount = 0

  for (const r of rows) {
    distinctStudents.add(r.studentCode && r.studentCode !== "-" ? r.studentCode : r.studentId)
    if (r.isEligibleForStandardRate) {
      eligibleRowCount += 1
      if (r.isOutstandingProgress) outstandingCount += 1
      else if (r.isStandardBandOnly) standardBandCount += 1
      else if (r.isStandardMet === false) belowStandardCount += 1
    }
  }

  const totalStandardMetCount = standardBandCount + outstandingCount
  const distinctStudentCount = distinctStudents.size

  return {
    ...meta,
    enrolledStudentCount: enrolledCount,
    distinctStudentCount,
    enrolledShareRate:
      enrolledCount > 0 ? Math.round((distinctStudentCount / enrolledCount) * 1000) / 10 : null,
    trackedRowCount: rows.length,
    eligibleRowCount,
    standardBandCount,
    outstandingCount,
    totalStandardMetCount,
    belowStandardCount,
    standardRate:
      eligibleRowCount > 0
        ? Math.round((totalStandardMetCount / eligibleRowCount) * 1000) / 10
        : null,
    outstandingRate:
      eligibleRowCount > 0
        ? Math.round((outstandingCount / eligibleRowCount) * 1000) / 10
        : null,
    children,
  }
}

/**
 * Xây dựng cây phân cấp Toàn hệ thống -> Cơ sở -> Khối -> Lớp cho các tab điểm môn học
 * (Cam kết môn học, Homeschooling, Học giao lưu).
 */
export function buildAcademicHierarchy(
  rows: AcademicHierarchyRowInput[],
  enrolled: EnrolledCountsLookup
): HierarchyNodeMetrics {
  const byCampus = new Map<string, AcademicHierarchyRowInput[]>()
  for (const r of rows) {
    const key = r.campusId || r.campusCode || "UNKNOWN"
    if (!byCampus.has(key)) byCampus.set(key, [])
    byCampus.get(key)!.push(r)
  }

  const campusNodes: HierarchyNodeMetrics[] = Array.from(byCampus.entries())
    .map(([campusId, campusRows]) => {
      const sample = campusRows[0]
      const byGrade = new Map<string, AcademicHierarchyRowInput[]>()
      for (const r of campusRows) {
        const gKey = r.grade || "Khác"
        if (!byGrade.has(gKey)) byGrade.set(gKey, [])
        byGrade.get(gKey)!.push(r)
      }

      const gradeNodes: HierarchyNodeMetrics[] = Array.from(byGrade.entries())
        .map(([gradeKey, gradeRows]) => {
          const byClass = new Map<string, AcademicHierarchyRowInput[]>()
          for (const r of gradeRows) {
            if (!byClass.has(r.classId)) byClass.set(r.classId, [])
            byClass.get(r.classId)!.push(r)
          }

          const classNodes: HierarchyNodeMetrics[] = Array.from(byClass.entries())
            .map(([classId, classRows]) => {
              const clsSample = classRows[0]
              return finalizeAcademicNode(
                {
                  id: `cls_${classId}`,
                  code: clsSample.className,
                  label: `Lớp ${clsSample.className}`,
                  nodeType: "CLASS",
                  campusId,
                  grade: gradeKey,
                  classId,
                },
                classRows,
                enrolled.byClass.get(classId) || 0
              )
            })
            .sort((a, b) => a.code.localeCompare(b.code, "vi", { numeric: true }))

          const gradeLabel = /^\d+$/.test(gradeKey) ? `Khối ${gradeKey}` : gradeKey
          return finalizeAcademicNode(
            {
              id: `grd_${campusId}_${gradeKey}`,
              code: gradeKey,
              label: gradeLabel,
              nodeType: "GRADE",
              campusId,
              grade: gradeKey,
            },
            gradeRows,
            enrolled.byCampusGrade.get(`${campusId}_${gradeKey}`) || 0,
            classNodes
          )
        })
        .sort((a, b) => {
          const nA = Number(a.code)
          const nB = Number(b.code)
          if (!Number.isNaN(nA) && !Number.isNaN(nB)) return nA - nB
          return a.code.localeCompare(b.code, "vi")
        })

      return finalizeAcademicNode(
        {
          id: `cp_${campusId}`,
          code: sample.campusCode || campusId,
          label: `${sample.campusName} (${sample.campusCode})`,
          nodeType: "CAMPUS",
          campusId,
        },
        campusRows,
        enrolled.byCampus.get(campusId) || 0,
        gradeNodes
      )
    })
    .sort((a, b) => a.code.localeCompare(b.code, "vi"))

  return finalizeAcademicNode(
    {
      id: "SYSTEM",
      code: "SYSTEM",
      label: "Toàn hệ thống",
      nodeType: "SYSTEM",
    },
    rows,
    enrolled.system,
    campusNodes
  )
}

export interface PsychHierarchyRowInput {
  studentId: string
  studentCode: string
  campusId: string
  campusCode: string
  campusName: string
  grade: string
  classId: string
  className: string
  isUnassigned: boolean
  hasOverdue: boolean
  hasDuePending: boolean
  isCompletedAllDue: boolean
  hasMonthSummary: boolean
}

function finalizePsychNode(
  meta: {
    id: string
    code: string
    label: string
    nodeType: "SYSTEM" | "CAMPUS" | "GRADE" | "CLASS"
    campusId?: string
    grade?: string
    classId?: string
  },
  rows: PsychHierarchyRowInput[],
  enrolledCount: number,
  children?: PsychHierarchyNodeMetrics[]
): PsychHierarchyNodeMetrics {
  const totalStudents = rows.length
  const unassignedStudents = rows.filter((r) => r.isUnassigned).length
  const overdueStudents = rows.filter((r) => r.hasOverdue).length
  const duePendingStudents = rows.filter((r) => r.hasDuePending).length
  const completedAllDueStudents = rows.filter((r) => r.isCompletedAllDue).length
  const monthSummarizedStudents = rows.filter((r) => r.hasMonthSummary).length

  return {
    ...meta,
    enrolledStudentCount: enrolledCount,
    totalStudents,
    enrolledShareRate:
      enrolledCount > 0 ? Math.round((totalStudents / enrolledCount) * 1000) / 10 : null,
    unassignedStudents,
    overdueStudents,
    duePendingStudents,
    completedAllDueStudents,
    monthSummarizedStudents,
    monthSummaryRate:
      totalStudents > 0
        ? Math.round((monthSummarizedStudents / totalStudents) * 1000) / 10
        : null,
    children,
  }
}

export function buildPsychHierarchy(
  rows: PsychHierarchyRowInput[],
  enrolled: EnrolledCountsLookup
): PsychHierarchyNodeMetrics {
  const byCampus = new Map<string, PsychHierarchyRowInput[]>()
  for (const r of rows) {
    const key = r.campusId || r.campusCode || "UNKNOWN"
    if (!byCampus.has(key)) byCampus.set(key, [])
    byCampus.get(key)!.push(r)
  }

  const campusNodes: PsychHierarchyNodeMetrics[] = Array.from(byCampus.entries())
    .map(([campusId, campusRows]) => {
      const sample = campusRows[0]
      const byGrade = new Map<string, PsychHierarchyRowInput[]>()
      for (const r of campusRows) {
        const gKey = r.grade || "Khác"
        if (!byGrade.has(gKey)) byGrade.set(gKey, [])
        byGrade.get(gKey)!.push(r)
      }

      const gradeNodes: PsychHierarchyNodeMetrics[] = Array.from(byGrade.entries())
        .map(([gradeKey, gradeRows]) => {
          const byClass = new Map<string, PsychHierarchyRowInput[]>()
          for (const r of gradeRows) {
            if (!byClass.has(r.classId)) byClass.set(r.classId, [])
            byClass.get(r.classId)!.push(r)
          }

          const classNodes: PsychHierarchyNodeMetrics[] = Array.from(byClass.entries())
            .map(([classId, classRows]) => {
              const clsSample = classRows[0]
              return finalizePsychNode(
                {
                  id: `pcls_${classId}`,
                  code: clsSample.className,
                  label: `Lớp ${clsSample.className}`,
                  nodeType: "CLASS",
                  campusId,
                  grade: gradeKey,
                  classId,
                },
                classRows,
                enrolled.byClass.get(classId) || 0
              )
            })
            .sort((a, b) => a.code.localeCompare(b.code, "vi", { numeric: true }))

          const gradeLabel = /^\d+$/.test(gradeKey) ? `Khối ${gradeKey}` : gradeKey
          return finalizePsychNode(
            {
              id: `pgrd_${campusId}_${gradeKey}`,
              code: gradeKey,
              label: gradeLabel,
              nodeType: "GRADE",
              campusId,
              grade: gradeKey,
            },
            gradeRows,
            enrolled.byCampusGrade.get(`${campusId}_${gradeKey}`) || 0,
            classNodes
          )
        })
        .sort((a, b) => {
          const nA = Number(a.code)
          const nB = Number(b.code)
          if (!Number.isNaN(nA) && !Number.isNaN(nB)) return nA - nB
          return a.code.localeCompare(b.code, "vi")
        })

      return finalizePsychNode(
        {
          id: `pcp_${campusId}`,
          code: sample.campusCode || campusId,
          label: `${sample.campusName} (${sample.campusCode})`,
          nodeType: "CAMPUS",
          campusId,
        },
        campusRows,
        enrolled.byCampus.get(campusId) || 0,
        gradeNodes
      )
    })
    .sort((a, b) => a.code.localeCompare(b.code, "vi"))

  return finalizePsychNode(
    {
      id: "PSYSTEM",
      code: "SYSTEM",
      label: "Toàn hệ thống",
      nodeType: "SYSTEM",
    },
    rows,
    enrolled.system,
    campusNodes
  )
}

/**
 * Xây dựng bảng tra cứu số HS nhập học / đang theo học theo Hệ thống -> Cơ sở -> Khối -> Lớp
 * từ danh sách Student trong năm học (đã lọc theo phạm vi quyền).
 */
export function buildEnrolledCountsLookup(
  students: Array<{
    id: string
    studentCode?: string | null
    campusId?: string | null
    classId?: string | null
    class?: {
      id?: string
      campusId?: string | null
      grade?: string | null
      className?: string | null
    } | null
  }>
): EnrolledCountsLookup {
  const sysSet = new Set<string>()
  const byCampus = new Map<string, Set<string>>()
  const byCampusGrade = new Map<string, Set<string>>()
  const byClass = new Map<string, Set<string>>()

  for (const st of students) {
    const sKey = st.studentCode && st.studentCode !== "-" ? st.studentCode : st.id
    const cId = st.class?.campusId || st.campusId || ""
    const clsId = st.class?.id || st.classId || ""
    const rawGrade = st.class?.grade || st.class?.className?.match(/^(\d+)/)?.[1] || "Khác"
    const gradeKey = String(rawGrade).replace(/^khối\s*/i, "").trim() || "Khác"

    sysSet.add(sKey)
    if (cId) {
      if (!byCampus.has(cId)) byCampus.set(cId, new Set())
      byCampus.get(cId)!.add(sKey)

      const cgKey = `${cId}_${gradeKey}`
      if (!byCampusGrade.has(cgKey)) byCampusGrade.set(cgKey, new Set())
      byCampusGrade.get(cgKey)!.add(sKey)
    }
    if (clsId) {
      if (!byClass.has(clsId)) byClass.set(clsId, new Set())
      byClass.get(clsId)!.add(sKey)
    }
  }

  return {
    system: sysSet.size,
    byCampus: new Map(Array.from(byCampus.entries()).map(([k, s]) => [k, s.size])),
    byCampusGrade: new Map(Array.from(byCampusGrade.entries()).map(([k, s]) => [k, s.size])),
    byClass: new Map(Array.from(byClass.entries()).map(([k, s]) => [k, s.size])),
  }
}
