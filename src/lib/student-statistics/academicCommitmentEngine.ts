/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/db"
import {
  extractGradeNumber,
  normalizeGradeColumnDefs,
} from "@/lib/grading/vnedu-config-types"
import {
  cleanNormalizedString,
  CommitmentPeriodCode,
  doesSubjectMatchCommittedSubject,
  isExplicitNonCommitmentRecord,
  parseAcademicCommittedSubjects,
  resolveConfiguredSklBenchmark,
} from "@/lib/ktdbcl/entranceCommitmentReportEngine"
import {
  extractScoreFromGradeEntry,
  parseRawStudentTestStatus,
  resolveEducationLevel,
} from "@/lib/ktdbcl/thkqPeriodicReportEngine"
import {
  buildAcademicHierarchy,
  evaluateLatestStandard,
  loadEnrolledTransferInLookup,
  resolveLatestPeriodScore,
} from "./standardEvaluator"
import {
  AcademicCommitmentAggregateRow,
  AcademicCommitmentDetailRow,
  AcademicCommitmentFilterInput,
  AcademicCommitmentReportPayload,
  EducationLevelCode,
  GK1_OUTCOME_LABELS,
  Gk1OutcomeCode,
  ReconciliationItem,
  StudentStatisticsAccessScope,
} from "./types"

const EPS = 1e-9

export function getEducationLevelLabel(level: EducationLevelCode | string): string {
  switch (level) {
    case "TIEU_HOC":
      return "Tiểu học"
    case "THCS":
      return "THCS"
    case "THPT":
      return "THPT"
    case "MAM_NON":
      return "Mầm non"
    default:
      return "Khác"
  }
}

export function resolveDetailedEducationLevel(
  rawLevel?: string | null,
  grade?: string | null,
  className?: string | null
): EducationLevelCode {
  const lvlText = cleanNormalizedString(rawLevel || "")
  if (lvlText.includes("mamnon") || lvlText.includes("preschool")) {
    return "MAM_NON"
  }
  const base = resolveEducationLevel(rawLevel, grade, className)
  if (base === "TIEU_HOC" || base === "THCS" || base === "THPT") {
    return base
  }
  return "KHAC"
}

/**
 * Xác định ngưỡng đạt chuẩn Giữa kỳ 1 (GK1):
 * - Tiểu học: >= 7,0
 * - THCS: >= 5,0
 * - Bậc học khác (THPT, Mầm non...): tra cứu ngưỡng đã xác nhận trong SubjectBenchmarkConfig; nếu không có -> null ("Chưa có cấu hình chuẩn")
 */
export function resolveGk1ProgressThreshold(params: {
  level: EducationLevelCode
  grade: string
  matchedSubjectIds: string[]
  committedSubject: string
  benchmarkConfigs: Array<{
    academicYearId?: string
    evaluationPeriod?: string | null
    level?: string | null
    grade?: string | null
    subjectId?: string | null
    benchmarkScore: number
  }>
}): {
  threshold: number | null
  source: "STANDARD_PRIMARY" | "STANDARD_MIDDLE" | "CONFIGURED" | "MISSING"
} {
  if (params.level === "TIEU_HOC") {
    return { threshold: 7.0, source: "STANDARD_PRIMARY" }
  }
  if (params.level === "THCS") {
    return { threshold: 5.0, source: "STANDARD_MIDDLE" }
  }

  // Bậc học ngoài Tiểu học / THCS: chỉ dùng ngưỡng đã xác nhận trong SubjectBenchmarkConfig
  if (params.level === "THPT") {
    const configured = resolveConfiguredSklBenchmark({
      benchmarkConfigs: params.benchmarkConfigs,
      level: "THPT",
      grade: params.grade,
      matchedSubjectIds: params.matchedSubjectIds,
      committedSubject: params.committedSubject,
      period: "GK1",
    })
    if (configured !== null && !Number.isNaN(configured)) {
      return { threshold: configured, source: "CONFIGURED" }
    }
  }

  return { threshold: null, source: "MISSING" }
}

/**
 * Phân loại kết quả Giữa kỳ 1 theo đúng 8 trạng thái chuẩn nghiệp vụ SSM:
 * - Thiếu ngưỡng cấu hình (ngoài Tiểu học / THCS) -> CHUA_CO_CAU_HINH_CHUAN (loại khỏi mẫu số tính tiến bộ)
 * - Thiếu KSĐN hoặc GK1 -> CHUA_DU_DU_LIEU (để trống chênh lệch; vẫn tính isGk1Pass nếu GK1 hợp lệ + có ngưỡng)
 * - Điểm 0 là điểm hợp lệ
 * - Chỉ ghi nhận "Đạt tiến bộ" khi GK1 >= ngưỡng và GK1 > KSĐN
 */
export function evaluateGk1Outcome(params: {
  ksdnScore: number | null | undefined
  gk1Score: number | null | undefined
  threshold: number | null | undefined
}): {
  deltaGk1Ksdn: number | null
  gk1Outcome: Gk1OutcomeCode
  gk1OutcomeLabel: string
  isGk1Pass: boolean | null
  isComparableForProgress: boolean
  isProgressAchieved: boolean
} {
  const ksdn =
    params.ksdnScore !== null &&
    params.ksdnScore !== undefined &&
    !Number.isNaN(Number(params.ksdnScore))
      ? Number(params.ksdnScore)
      : null

  const gk1 =
    params.gk1Score !== null &&
    params.gk1Score !== undefined &&
    !Number.isNaN(Number(params.gk1Score))
      ? Number(params.gk1Score)
      : null

  const threshold =
    params.threshold !== null &&
    params.threshold !== undefined &&
    !Number.isNaN(Number(params.threshold))
      ? Number(params.threshold)
      : null

  const deltaGk1Ksdn =
    ksdn !== null && gk1 !== null
      ? Math.round((gk1 - ksdn + Number.EPSILON) * 1000) / 1000
      : null

  if (threshold === null) {
    return {
      deltaGk1Ksdn,
      gk1Outcome: "CHUA_CO_CAU_HINH_CHUAN",
      gk1OutcomeLabel: GK1_OUTCOME_LABELS.CHUA_CO_CAU_HINH_CHUAN,
      isGk1Pass: null,
      isComparableForProgress: false,
      isProgressAchieved: false,
    }
  }

  const isGk1Pass = gk1 !== null ? gk1 >= threshold - EPS : null

  if (ksdn === null || gk1 === null) {
    return {
      deltaGk1Ksdn: null,
      gk1Outcome: "CHUA_DU_DU_LIEU",
      gk1OutcomeLabel: GK1_OUTCOME_LABELS.CHUA_DU_DU_LIEU,
      isGk1Pass,
      isComparableForProgress: false,
      isProgressAchieved: false,
    }
  }

  const passed = gk1 >= threshold - EPS
  let gk1Outcome: Gk1OutcomeCode

  if (gk1 > ksdn + EPS) {
    gk1Outcome = passed ? "DAT_TIEN_BO" : "TANG_CHUA_DAT_CHUAN"
  } else if (Math.abs(gk1 - ksdn) <= EPS) {
    gk1Outcome = passed ? "DAT_CHUAN_GIU_NGUYEN" : "CHUA_DAT_CHUAN_GIU_NGUYEN"
  } else {
    gk1Outcome = passed ? "DAT_CHUAN_GIAM" : "CHUA_DAT_CHUAN_GIAM"
  }

  return {
    deltaGk1Ksdn,
    gk1Outcome,
    gk1OutcomeLabel: GK1_OUTCOME_LABELS[gk1Outcome],
    isGk1Pass: passed,
    isComparableForProgress: true,
    isProgressAchieved: gk1Outcome === "DAT_TIEN_BO",
  }
}

/**
 * Giải quyết điểm chính thức từ SubjectGradeEntry với phát hiện xung đột chưa thể tự chốt.
 * Quy tắc ưu tiên chốt điểm hiện có:
 * 1) Điểm kiểm tra bù (kt_bu / makeup / diem_bu)
 * 2) Bản ghi đúng kỳ trực tiếp (VD GK1 > HK1)
 * 3) Nguồn VNEDU chính thức (với các kỳ định kỳ GK1, CK1, GK2, CK2)
 * 4) Bản ghi cập nhật mới nhất (updatedAt DESC)
 * Nếu có >= 2 bản ghi cùng thứ hạng cao nhất nhưng khác điểm -> đánh dấu ambiguousConflict = true để đưa vào danh sách đối soát.
 */
export function resolveOfficialPeriodScoreWithConflictCheck(params: {
  entries: any[]
  period: CommitmentPeriodCode
  configsByKey: Map<string, any>
  gradeNum: number | null
}): {
  score: number | null
  hasMakeupOrUpdate: boolean
  ambiguousConflict: boolean
  detailNote: string | null
} {
  const { entries, period, configsByKey, gradeNum } = params
  if (!entries || entries.length === 0) {
    return { score: null, hasMakeupOrUpdate: false, ambiguousConflict: false, detailNote: null }
  }

  const candidateEntries = entries.filter((e) => {
    const ep = String(e.evaluationPeriod || "").toUpperCase().trim()
    if (period === "KSĐN") {
      return ep === "KSĐN" || ep === "KSDN" || ep === "ĐẦU NĂM"
    }
    if (period === "GK1") return ep === "GK1" || ep === "HK1"
    if (period === "CK1") return ep === "CK1" || ep === "HK1"
    if (period === "GK2") return ep === "GK2" || ep === "HK2"
    if (period === "CK2") return ep === "CK2" || ep === "HK2"
    return false
  })

  if (candidateEntries.length === 0) {
    return { score: null, hasMakeupOrUpdate: false, ambiguousConflict: false, detailNote: null }
  }

  const scoredCandidates: Array<{
    score: number
    isDirectPeriod: boolean
    isMakeup: boolean
    isVnedu: boolean
    updatedAtMs: number
  }> = []

  for (const entry of candidateEntries) {
    const ep = String(entry.evaluationPeriod || "").toUpperCase().trim()
    const isDirectPeriod =
      ep === period || (period === "KSĐN" && (ep === "KSĐN" || ep === "KSDN"))

    const cfgKey = `${entry.subjectId}_${gradeNum ?? "ALL"}_${ep}_${entry.configType || "VNEDU"}`
    const fallbackCfgKey = `${entry.subjectId}_${gradeNum ?? "ALL"}_${period}_${entry.configType || "VNEDU"}`
    const config = configsByKey.get(cfgKey) || configsByKey.get(fallbackCfgKey) || null

    if (!isDirectPeriod && (period === "CK1" || period === "CK2")) {
      let comp: Record<string, any> = {}
      try {
        comp =
          typeof entry.componentScores === "string"
            ? JSON.parse(entry.componentScores)
            : entry.componentScores || {}
      } catch {
        comp = {}
      }
      const colDefs = config ? normalizeGradeColumnDefs(config) : []
      const ckDef = colDefs.find(
        (d) =>
          d.group === "CK" ||
          d.key === "ck" ||
          d.label.toUpperCase().includes("CK") ||
          d.label.toUpperCase().includes("ĐĐGCK")
      )
      const hasExplicitCk =
        (comp.ck !== undefined && String(comp.ck).trim() !== "") ||
        (ckDef && comp[ckDef.key] !== undefined && String(comp[ckDef.key]).trim() !== "") ||
        (comp.kt_bu !== undefined && String(comp.kt_bu).trim() !== "") ||
        (comp.makeup !== undefined && String(comp.makeup).trim() !== "")

      if (!hasExplicitCk) continue
    }

    const extracted = extractScoreFromGradeEntry(entry, period, "OFFICIAL", config)
    const parsed = parseRawStudentTestStatus({
      rawScoreVal: extracted.rawScoreVal,
      remarkText: entry.remark,
      ratingText: entry.ratingValue,
      roundingRule: extracted.roundingRule,
      maxScore: extracted.maxScore,
    })

    if (parsed.statusInTest === "VALID_SCORE" && parsed.officialScore !== null) {
      const isMakeup = extracted.columnLabel === "Điểm KT bù"
      const isVnedu =
        String(entry.sourceType || "").toUpperCase().includes("VNEDU") ||
        entry.configType === "VNEDU"
      const updatedAtMs = entry.updatedAt ? new Date(entry.updatedAt).getTime() : 0

      scoredCandidates.push({
        score: parsed.officialScore,
        isDirectPeriod,
        isMakeup,
        isVnedu,
        updatedAtMs,
      })
    }
  }

  if (scoredCandidates.length === 0) {
    return { score: null, hasMakeupOrUpdate: false, ambiguousConflict: false, detailNote: null }
  }

  scoredCandidates.sort((a, b) => {
    if (a.isMakeup !== b.isMakeup) return a.isMakeup ? -1 : 1
    if (a.isDirectPeriod !== b.isDirectPeriod) return a.isDirectPeriod ? -1 : 1
    if (period !== "KSĐN" && a.isVnedu !== b.isVnedu) return a.isVnedu ? -1 : 1
    return b.updatedAtMs - a.updatedAtMs
  })

  const best = scoredCandidates[0]
  const tiedTop = scoredCandidates.filter(
    (c) =>
      c.isMakeup === best.isMakeup &&
      c.isDirectPeriod === best.isDirectPeriod &&
      (period === "KSĐN" || c.isVnedu === best.isVnedu) &&
      c.updatedAtMs === best.updatedAtMs
  )
  const distinctTiedScores = Array.from(new Set(tiedTop.map((c) => c.score)))

  if (distinctTiedScores.length > 1) {
    return {
      score: null,
      hasMakeupOrUpdate: false,
      ambiguousConflict: true,
      detailNote: `Xung đột ${distinctTiedScores.length} bản ghi điểm cùng mức ưu tiên kỳ ${period} (${distinctTiedScores.join(", ")}); cần đối soát chốt điểm chính thức.`,
    }
  }

  const hasMultipleDistinctScores =
    scoredCandidates.length > 1 &&
    scoredCandidates.some((c) => Math.abs(c.score - best.score) > EPS)

  return {
    score: best.score,
    hasMakeupOrUpdate: best.isMakeup || hasMultipleDistinctScores,
    ambiguousConflict: false,
    detailNote: best.isMakeup
      ? `Sử dụng điểm kiểm tra bù (${best.score}) cho kỳ ${period}`
      : hasMultipleDistinctScores
        ? `Có ${scoredCandidates.length} bản ghi điểm kỳ ${period}, chốt theo điểm chính thức mới nhất (${best.score})`
        : null,
  }
}

export function aggregateAcademicRows(
  rows: AcademicCommitmentDetailRow[],
  keyFn: (r: AcademicCommitmentDetailRow) => string,
  metaFn: (r: AcademicCommitmentDetailRow) => {
    campusId: string
    campusCode: string
    campusName: string
    level?: EducationLevelCode
    levelLabel?: string
    subject?: string
  }
): AcademicCommitmentAggregateRow[] {
  const buckets = new Map<
    string,
    {
      meta: ReturnType<typeof metaFn>
      studentKeys: Set<string>
      commitmentRowCount: number
      comparableRowCount: number
      gk1PassCount: number
      progressCount: number
    }
  >()

  for (const r of rows) {
    const key = keyFn(r)
    if (!buckets.has(key)) {
      buckets.set(key, {
        meta: metaFn(r),
        studentKeys: new Set<string>(),
        commitmentRowCount: 0,
        comparableRowCount: 0,
        gk1PassCount: 0,
        progressCount: 0,
      })
    }
    const b = buckets.get(key)!
    b.studentKeys.add(r.studentCode && r.studentCode !== "-" ? r.studentCode : r.studentId)
    b.commitmentRowCount += 1
    if (r.isComparableForProgress) b.comparableRowCount += 1
    if (r.isGk1Pass === true) b.gk1PassCount += 1
    if (r.isProgressAchieved) b.progressCount += 1
  }

  return Array.from(buckets.entries()).map(([key, b]) => ({
    key,
    ...b.meta,
    distinctStudentCount: b.studentKeys.size,
    commitmentRowCount: b.commitmentRowCount,
    comparableRowCount: b.comparableRowCount,
    gk1PassCount: b.gk1PassCount,
    progressCount: b.progressCount,
    progressRate:
      b.comparableRowCount > 0
        ? Math.round((b.progressCount / b.comparableRowCount) * 1000) / 10
        : null,
  }))
}

export async function generateAcademicCommitmentStatistics(
  filters: AcademicCommitmentFilterInput,
  scope: StudentStatisticsAccessScope
): Promise<AcademicCommitmentReportPayload> {
  const asOfDateObj = filters.asOfDate ? new Date(filters.asOfDate) : new Date()
  const asOfDateIso = Number.isNaN(asOfDateObj.getTime())
    ? new Date().toISOString()
    : asOfDateObj.toISOString()

  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true },
  })

  const activeYear =
    academicYears.find((y) => y.status === "ACTIVE") || academicYears[0]

  const selectedYearId =
    filters.academicYearId &&
    academicYears.some((y) => y.id === filters.academicYearId)
      ? filters.academicYearId
      : activeYear?.id || ""

  const selectedYearObj =
    academicYears.find((y) => y.id === selectedYearId) || activeYear

  const isCampusRestricted = Boolean(scope.isCampusRestricted)
  const isClassRestricted = Boolean(
    scope.isClassRestricted && (scope.allowedClassIds || []).length > 0
  )

  const allCampuses = await prisma.campus.findMany({
    where: {
      status: "ACTIVE",
      ...(isCampusRestricted ? { id: { in: scope.allowedCampusIds } } : {}),
    },
    orderBy: { campusCode: "asc" },
    select: { id: true, campusCode: true, campusName: true },
  })

  // Chặn truy cập trực tiếp cơ sở ngoài phạm vi
  if (
    filters.campusId &&
    filters.campusId !== "ALL" &&
    isCampusRestricted &&
    !scope.allowedCampusIds.includes(filters.campusId)
  ) {
    throw new Error("FORBIDDEN_SCOPE: Tài khoản không có quyền truy cập cơ sở này.")
  }

  let selectedCampusId = filters.campusId || "ALL"
  if (isCampusRestricted && allCampuses.length === 1) {
    selectedCampusId = allCampuses[0].id
  } else if (
    selectedCampusId !== "ALL" &&
    !allCampuses.some((c) => c.id === selectedCampusId)
  ) {
    selectedCampusId =
      isCampusRestricted && allCampuses.length > 0 ? allCampuses[0].id : "ALL"
  }

  if (
    filters.classId &&
    filters.classId !== "ALL" &&
    isClassRestricted &&
    !scope.allowedClassIds.includes(filters.classId)
  ) {
    throw new Error("FORBIDDEN_SCOPE: Tài khoản không có quyền truy cập lớp học này.")
  }

  const p = prisma as any
  const [
    allClasses,
    systemStudents,
    inputPeriods,
    preschoolPeriods,
    rawSupportTargets,
    rawLearningCommitments,
    studentTransfers,
    allSubjects,
    benchmarkConfigs,
    gradeConfigs,
  ] = await Promise.all([
    prisma.class.findMany({
      where: { academicYearId: selectedYearId, status: "ACTIVE" },
      include: {
        campus: { select: { id: true, campusCode: true, campusName: true } },
      },
      orderBy: [{ grade: "asc" }, { className: "asc" }],
    }),
    prisma.student.findMany({
      where: {
        academicYearId: selectedYearId,
        status: { not: "TRANSFERRED_OUT" },
      },
      include: {
        class: {
          include: {
            campus: { select: { id: true, campusCode: true, campusName: true } },
          },
        },
        campus: { select: { id: true, campusCode: true, campusName: true } },
      },
    }),
    prisma.inputAssessmentPeriod.findMany({
      where: { academicYearId: selectedYearId },
      select: { id: true },
    }),
    p.preschoolInputAssessmentPeriod?.findMany
      ? p.preschoolInputAssessmentPeriod
          .findMany({
            where: { academicYearId: selectedYearId },
            select: { id: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
    prisma.learningSupportTarget.findMany({
      where: { academicYearId: selectedYearId },
      include: {
        student: {
          include: {
            class: {
              include: {
                campus: { select: { id: true, campusCode: true, campusName: true } },
              },
            },
          },
        },
        assignments: {
          include: {
            subject: { select: { id: true, subjectCode: true, subjectName: true } },
          },
        },
      },
    }),
    p.studentLearningCommitment?.findMany
      ? p.studentLearningCommitment
          .findMany({ where: { academicYearId: selectedYearId } })
          .catch(() => [])
      : Promise.resolve([]),
    p.studentTransfer?.findMany
      ? p.studentTransfer
          .findMany({
            where: { academicYearId: selectedYearId },
            orderBy: { createdAt: "desc" },
          })
          .catch(() => [])
      : Promise.resolve([]),
    prisma.subject.findMany({
      select: { id: true, subjectCode: true, subjectName: true },
    }),
    p.subjectBenchmarkConfig?.findMany
      ? p.subjectBenchmarkConfig
          .findMany({ where: { academicYearId: selectedYearId } })
          .catch(() => [])
      : Promise.resolve([]),
    p.subjectGradeConfig?.findMany
      ? p.subjectGradeConfig
          .findMany({ where: { academicYearId: selectedYearId, isActive: true } })
          .catch(() => [])
      : Promise.resolve([]),
  ])

  const inputPeriodIds = inputPeriods.map((x: any) => x.id)
  const preschoolPeriodIds = preschoolPeriods.map((x: any) => x.id)

  const [inputStudents, preschoolStudents] = await Promise.all([
    inputPeriodIds.length > 0
      ? prisma.inputAssessmentStudent.findMany({
          where: {
            periodId: { in: inputPeriodIds },
            OR: [
              { admissionResult: { contains: "cam kết" } },
              { admissionResult: { contains: "Cam kết" } },
              { directorNote: { contains: "Môn cam kết" } },
              { directorNote: { contains: "Mon cam ket" } },
              { directorNote: { contains: "cam kết" } },
              { directorNote: { contains: "Cam kết" } },
            ],
          },
          include: {
            enrollmentClass: {
              include: {
                campus: { select: { id: true, campusCode: true, campusName: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    preschoolPeriodIds.length > 0 && p.preschoolInputAssessmentStudent?.findMany
      ? p.preschoolInputAssessmentStudent
          .findMany({
            where: {
              periodId: { in: preschoolPeriodIds },
              OR: [
                { admissionResult: { contains: "cam kết" } },
                { admissionResult: { contains: "Cam kết" } },
                { directorNote: { contains: "Môn cam kết" } },
                { directorNote: { contains: "Mon cam ket" } },
                { directorNote: { contains: "cam kết" } },
                { directorNote: { contains: "Cam kết" } },
              ],
            },
            include: {
              enrollmentClass: {
                include: {
                  campus: { select: { id: true, campusCode: true, campusName: true } },
                },
              },
            },
          })
          .catch(() => [])
      : Promise.resolve([]),
  ])

  const reconciliationItems: ReconciliationItem[] = []
  let reconSeq = 1
  const pushRecon = (item: Omit<ReconciliationItem, "id">) => {
    reconciliationItems.push({ id: `recon_${reconSeq++}`, ...item })
  }

  const classById = new Map<string, any>(allClasses.map((c: any) => [c.id, c]))
  const studentById = new Map<string, any>(systemStudents.map((s: any) => [s.id, s]))

  // Phân lớp hiệu lực theo mốc báo cáo (chỉ lấy các lệnh chuyển lớp có hiệu lực <= asOfDate)
  const asOfMs = new Date(asOfDateIso).getTime()
  const latestTransferByStudentId = new Map<string, any>()
  for (const tr of studentTransfers) {
    const trTime = tr.effectiveDate
      ? new Date(tr.effectiveDate).getTime()
      : tr.createdAt
        ? new Date(tr.createdAt).getTime()
        : 0
    if (trTime > asOfMs) continue
    if (
      tr.studentId &&
      (!tr.status || tr.status === "APPROVED" || tr.status === "COMPLETED") &&
      !latestTransferByStudentId.has(tr.studentId)
    ) {
      latestTransferByStudentId.set(tr.studentId, tr)
    }
  }

  // Các môn đã chấm dứt cam kết
  const terminatedSubjectsByStudentId = new Map<string, Set<string>>()
  for (const t of rawSupportTargets) {
    if (t.terminationStatus === "TERMINATED" && t.studentId) {
      const st = studentById.get(t.studentId) || t.student
      const cls = st?.classId ? classById.get(st.classId) || st.class : null
      const subs = parseAcademicCommittedSubjects(
        t.reason,
        t.notes,
        cls?.className,
        cls?.grade
      )
      if (!terminatedSubjectsByStudentId.has(t.studentId)) {
        terminatedSubjectsByStudentId.set(t.studentId, new Set())
      }
      subs.forEach((s) => terminatedSubjectsByStudentId.get(t.studentId)!.add(s))
    }
  }

  interface ReconciledStudent {
    studentId: string
    studentCode: string
    studentName: string
    classObj: any
    subjects: Set<string>
  }

  const commitmentStudentsMap = new Map<string, ReconciledStudent>()
  const recordedTransferStudents = new Set<string>()

  const resolveEffectiveStudentClass = (student: any, fallbackClass?: any) => {
    const transfer = latestTransferByStudentId.get(student.id)
    if (transfer && transfer.toClassId && classById.has(transfer.toClassId)) {
      const targetCls = classById.get(transfer.toClassId)
      if (!recordedTransferStudents.has(student.id)) {
        recordedTransferStudents.add(student.id)
        const fromCls = transfer.fromClassId ? classById.get(transfer.fromClassId) : null
        pushRecon({
          type: "STUDENT_TRANSFERRED_CLASS",
          studentCode: student.studentCode,
          studentName: student.studentName,
          campusName: targetCls.campus?.campusName || "",
          className: targetCls.className,
          detail: `Học sinh chuyển từ ${fromCls?.className || transfer.fromClassId || "lớp cũ"} sang ${targetCls.className} (${targetCls.campus?.campusCode || ""}); tính 1 lần tại lớp hiệu lực.`,
        })
      }
      return targetCls
    }
    if (student.classId && classById.has(student.classId)) {
      return classById.get(student.classId)
    }
    if (student.class && student.class.id) {
      return classById.get(student.class.id) || student.class
    }
    if (fallbackClass && fallbackClass.id) {
      return classById.get(fallbackClass.id) || fallbackClass
    }
    return null
  }

  const registerStudentCommitment = (
    student: any,
    rawSubjects: string[],
    sourceLabel: string,
    fallbackClass?: any
  ) => {
    if (!student || !student.id || rawSubjects.length === 0) return
    const effectiveClass = resolveEffectiveStudentClass(student, fallbackClass)
    if (!effectiveClass || !effectiveClass.id) {
      pushRecon({
        type: "UNASSIGNED_CLASS_EXCLUDED",
        studentCode: student.studentCode || "-",
        studentName: student.studentName || "-",
        detail: `Học sinh có cam kết (${rawSubjects.join(", ")}) nhưng chưa có bản ghi phân lớp hợp lệ trong năm học.`,
      })
      return
    }

    const terminatedSet = terminatedSubjectsByStudentId.get(student.id)
    const activeSubjects = rawSubjects.filter((s) => !terminatedSet?.has(s))
    if (activeSubjects.length === 0) return

    if (!commitmentStudentsMap.has(student.id)) {
      commitmentStudentsMap.set(student.id, {
        studentId: student.id,
        studentCode: student.studentCode || "-",
        studentName: student.studentName || "-",
        classObj: effectiveClass,
        subjects: new Set(activeSubjects),
      })
    } else {
      const existing = commitmentStudentsMap.get(student.id)!
      for (const sub of activeSubjects) {
        if (existing.subjects.has(sub)) {
          pushRecon({
            type: "DUPLICATE_COMMITMENT_MERGED",
            studentCode: existing.studentCode,
            studentName: existing.studentName,
            campusName: existing.classObj.campus?.campusName || "",
            className: existing.classObj.className,
            subject: sub,
            detail: `Hợp nhất hồ sơ cam kết trùng môn ${sub} từ nguồn ${sourceLabel}.`,
          })
        } else {
          existing.subjects.add(sub)
        }
      }
    }
  }

  // Nguồn 1: InputAssessmentStudent & PreschoolInputAssessmentStudent
  for (const is of [...inputStudents, ...preschoolStudents]) {
    if (isExplicitNonCommitmentRecord(is.admissionResult, is.directorNote)) continue

    let matchingStudent = systemStudents.find(
      (ss: any) =>
        (ss.studentCode &&
          is.studentCode &&
          ss.studentCode.trim().toLowerCase() === is.studentCode.trim().toLowerCase()) ||
        (ss.studentCode &&
          is.enrollmentCode &&
          ss.studentCode.trim().toLowerCase() === is.enrollmentCode.trim().toLowerCase())
    )

    if (!matchingStudent) {
      matchingStudent = systemStudents.find((ss: any) => {
        if (cleanNormalizedString(ss.studentName) === cleanNormalizedString(is.fullName)) {
          if (!is.grade) return true
          const ssGrade = ss.class?.grade || ss.class?.className?.match(/^(\d+)/)?.[1]
          const isCleanGrade = String(is.grade).replace(/\D/g, "")
          if (!ssGrade || !isCleanGrade) return true
          return String(ssGrade) === String(isCleanGrade)
        }
        return false
      })
    }

    let fallbackClass = is.enrollmentClass || null
    if (!fallbackClass && is.enrollmentClassId) {
      fallbackClass =
        allClasses.find(
          (c: any) => c.id === is.enrollmentClassId || c.classCode === is.enrollmentClassId
        ) || null
    }
    if (!fallbackClass && is.className && !is.className.toLowerCase().includes("chưa xếp")) {
      fallbackClass =
        allClasses.find(
          (c: any) =>
            c.className.toLowerCase() === is.className.toLowerCase() ||
            c.classCode.toLowerCase() === is.className.toLowerCase()
        ) || null
    }

    const clsForParse = matchingStudent?.class || fallbackClass
    const academicSubs = parseAcademicCommittedSubjects(
      is.directorNote,
      is.admissionResult,
      clsForParse?.className || is.className,
      clsForParse?.grade || is.grade
    )
    if (academicSubs.length === 0) continue

    if (!matchingStudent) {
      pushRecon({
        type: "UNASSIGNED_CLASS_EXCLUDED",
        studentCode: is.enrollmentCode || is.studentCode || "-",
        studentName: is.fullName || "-",
        detail: `Hồ sơ khảo sát đầu vào có cam kết (${academicSubs.join(", ")}) nhưng học sinh chưa được xếp lớp chính thức.`,
      })
      continue
    }

    registerStudentCommitment(matchingStudent, academicSubs, "Khảo sát đầu vào", fallbackClass)
  }

  // Nguồn 2: LearningSupportTarget (ADMISSION)
  for (const t of rawSupportTargets) {
    if (t.terminationStatus === "TERMINATED") continue
    const isAdmissionTarget =
      t.sourceType === "ADMISSION" ||
      /cam\s*kết\s*khảo\s*sát\s*đầu\s*vào|cam\s*kết\s*đầu\s*vào|đồng\s*bộ\s*từ\s*cam\s*kết/i.test(
        String(t.notes || "")
      )
    if (!isAdmissionTarget) continue

    const st = studentById.get(t.studentId) || t.student
    if (!st || st.status === "TRANSFERRED_OUT") continue
    const cls = st.classId ? classById.get(st.classId) || st.class : st.class

    let subs = parseAcademicCommittedSubjects(t.reason, "", cls?.className, cls?.grade)
    if (subs.length === 0 && t.notes && /cam\s*kết/i.test(t.notes)) {
      const noteMatch = String(t.notes).match(
        /cam\s*kết\s*môn\s*([^\r\n.]+?)(?:\s+tại\s+kỳ|\s*\.\s*Điểm|$)/i
      )
      if (noteMatch && noteMatch[1]) {
        subs = parseAcademicCommittedSubjects(
          `Môn cam kết: [${noteMatch[1]}]`,
          "",
          cls?.className,
          cls?.grade
        )
      }
    }
    if (subs.length > 0) {
      registerStudentCommitment(st, subs, "Theo dõi HS cam kết đầu vào")
    }
  }

  // Nguồn 3: StudentLearningCommitment
  for (const lc of rawLearningCommitments) {
    if (lc.status === "TERMINATED" || lc.status === "INACTIVE") continue
    const st = studentById.get(lc.studentId)
    if (!st || st.status === "TRANSFERRED_OUT") continue
    const cls = st.classId ? classById.get(st.classId) || st.class : st.class
    const rawText = lc.committedSubjects || lc.subjects || lc.reason || lc.notes || ""
    const subs = parseAcademicCommittedSubjects(
      rawText,
      "Đạt cam kết",
      cls?.className,
      cls?.grade
    )
    if (subs.length > 0) {
      registerStudentCommitment(st, subs, "Hồ sơ cam kết học tập")
    }
  }

  // Ánh xạ môn học SSM
  const allowedSubjectIdSet = new Set(scope.allowedSubjectIds || [])
  const hasSubjectRestriction =
    Boolean(scope.isSubjectRestricted) && allowedSubjectIdSet.size > 0

  const matchedSubjectIdsByCommittedName = new Map<string, string[]>()
  const getMatchedSubjectIds = (committedSub: string): string[] => {
    if (matchedSubjectIdsByCommittedName.has(committedSub)) {
      return matchedSubjectIdsByCommittedName.get(committedSub)!
    }
    const ids = allSubjects
      .filter((s: any) => doesSubjectMatchCommittedSubject(committedSub, s))
      .map((s: any) => s.id)
    matchedSubjectIdsByCommittedName.set(committedSub, ids)
    return ids
  }

  if (
    filters.committedSubject &&
    filters.committedSubject !== "ALL" &&
    hasSubjectRestriction
  ) {
    const matchedIds = getMatchedSubjectIds(filters.committedSubject)
    if (!matchedIds.some((id) => allowedSubjectIdSet.has(id))) {
      throw new Error("FORBIDDEN_SCOPE: Tài khoản không có quyền truy cập môn học này.")
    }
  }

  // Lọc theo phân quyền
  const scopedStudents: ReconciledStudent[] = []
  for (const item of commitmentStudentsMap.values()) {
    const cls = item.classObj
    const campusId = cls.campusId || cls.campus?.id || ""
    if (isCampusRestricted && !scope.allowedCampusIds.includes(campusId)) continue
    if (isClassRestricted && !scope.allowedClassIds.includes(cls.id)) continue
    if (hasSubjectRestriction) {
      const allowedSubs = Array.from(item.subjects).filter((sub) =>
        getMatchedSubjectIds(sub).some((id) => allowedSubjectIdSet.has(id))
      )
      if (allowedSubs.length === 0) continue
      item.subjects = new Set(allowedSubs)
    }
    scopedStudents.push(item)
  }

  // Tầng bộ lọc phụ thuộc: Năm học -> Cơ sở -> Bậc học -> Khối -> Lớp -> Môn cam kết
  const afterCampus = scopedStudents.filter((item) => {
    if (selectedCampusId === "ALL") return true
    const cId = item.classObj.campusId || item.classObj.campus?.id || ""
    return cId === selectedCampusId
  })

  const levelCountMap = new Map<EducationLevelCode, number>()
  for (const item of afterCampus) {
    const lvl = resolveDetailedEducationLevel(
      item.classObj.level,
      item.classObj.grade,
      item.classObj.className
    )
    levelCountMap.set(lvl, (levelCountMap.get(lvl) || 0) + item.subjects.size)
  }
  const levelOrder: EducationLevelCode[] = ["TIEU_HOC", "THCS", "THPT", "MAM_NON", "KHAC"]
  const availableLevels = Array.from(levelCountMap.entries())
    .map(([code, count]) => ({ code, label: getEducationLevelLabel(code), count }))
    .sort((a, b) => levelOrder.indexOf(a.code) - levelOrder.indexOf(b.code))

  const selectedLevel =
    filters.level &&
    filters.level !== "ALL" &&
    availableLevels.some((l) => l.code === filters.level)
      ? filters.level
      : "ALL"

  const afterLevel = afterCampus.filter((item) => {
    if (selectedLevel === "ALL") return true
    const lvl = resolveDetailedEducationLevel(
      item.classObj.level,
      item.classObj.grade,
      item.classObj.className
    )
    return lvl === selectedLevel
  })

  const gradeCountMap = new Map<string, number>()
  for (const item of afterLevel) {
    const gNum = extractGradeNumber(item.classObj.grade || item.classObj.className)
    const gCode = gNum !== null ? String(gNum) : String(item.classObj.grade || "Khác")
    gradeCountMap.set(gCode, (gradeCountMap.get(gCode) || 0) + item.subjects.size)
  }
  const availableGrades = Array.from(gradeCountMap.entries())
    .map(([code, count]) => ({
      code,
      label: /^\d+$/.test(code) ? `Khối ${code}` : code,
      count,
    }))
    .sort((a, b) => {
      const nA = Number(a.code)
      const nB = Number(b.code)
      if (!Number.isNaN(nA) && !Number.isNaN(nB)) return nA - nB
      return a.code.localeCompare(b.code, "vi")
    })

  const selectedGrade =
    filters.grade &&
    filters.grade !== "ALL" &&
    availableGrades.some((g) => g.code === filters.grade)
      ? filters.grade
      : "ALL"

  const afterGrade = afterLevel.filter((item) => {
    if (selectedGrade === "ALL") return true
    const gNum = extractGradeNumber(item.classObj.grade || item.classObj.className)
    const gCode = gNum !== null ? String(gNum) : String(item.classObj.grade || "Khác")
    return gCode === selectedGrade
  })

  const classMap = new Map<
    string,
    {
      id: string
      classCode: string
      className: string
      grade: string
      level: EducationLevelCode
      campusId: string
      campusCode: string
      campusName: string
      displayLabel: string
      rowCount: number
    }
  >()
  for (const item of afterGrade) {
    const cls = item.classObj
    const campusId = cls.campusId || cls.campus?.id || ""
    const campusCode = cls.campus?.campusCode || ""
    const campusName = cls.campus?.campusName || campusCode
    if (!classMap.has(cls.id)) {
      classMap.set(cls.id, {
        id: cls.id,
        classCode: cls.classCode || cls.className,
        className: cls.className,
        grade: cls.grade || "",
        level: resolveDetailedEducationLevel(cls.level, cls.grade, cls.className),
        campusId,
        campusCode,
        campusName,
        displayLabel:
          selectedCampusId === "ALL" && campusCode
            ? `${cls.className} (${campusCode})`
            : cls.className,
        rowCount: 0,
      })
    }
    classMap.get(cls.id)!.rowCount += item.subjects.size
  }

  const availableClasses = Array.from(classMap.values()).sort((a, b) => {
    if (a.campusCode !== b.campusCode) return a.campusCode.localeCompare(b.campusCode, "vi")
    const gA = extractGradeNumber(a.grade || a.className) ?? 99
    const gB = extractGradeNumber(b.grade || b.className) ?? 99
    if (gA !== gB) return gA - gB
    return a.className.localeCompare(b.className, "vi", { numeric: true })
  })

  const selectedClassId =
    filters.classId &&
    filters.classId !== "ALL" &&
    availableClasses.some((c) => c.id === filters.classId)
      ? filters.classId
      : "ALL"

  const afterClass = afterGrade.filter((item) => {
    if (selectedClassId === "ALL") return true
    return item.classObj.id === selectedClassId
  })

  const subjectCountMap = new Map<string, number>()
  for (const item of afterClass) {
    for (const sub of item.subjects) {
      subjectCountMap.set(sub, (subjectCountMap.get(sub) || 0) + 1)
    }
  }
  const preferredSubjectOrder = ["Toán", "Tiếng Việt", "Ngữ văn", "Tiếng Anh"]
  const availableSubjects = Array.from(subjectCountMap.entries())
    .map(([name, rowCount]) => ({ code: name, name, rowCount }))
    .sort((a, b) => {
      const idxA = preferredSubjectOrder.indexOf(a.name)
      const idxB = preferredSubjectOrder.indexOf(b.name)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return a.name.localeCompare(b.name, "vi")
    })

  let selectedSubject = "ALL"
  if (filters.committedSubject && filters.committedSubject !== "ALL") {
    const matchedOption = availableSubjects.find(
      (s) =>
        cleanNormalizedString(s.name) === cleanNormalizedString(filters.committedSubject)
    )
    if (matchedOption) selectedSubject = matchedOption.name
  }

  // Truy vấn điểm SubjectGradeEntry
  const targetStudentIds = afterClass.map((s) => s.studentId)
  const gradeEntries =
    targetStudentIds.length > 0
      ? await prisma.subjectGradeEntry.findMany({
          where: {
            academicYearId: selectedYearId,
            studentId: { in: targetStudentIds },
          },
          include: {
            subject: { select: { id: true, subjectCode: true, subjectName: true } },
          },
        })
      : []

  const configsByKey = new Map<string, any>()
  for (const cfg of gradeConfigs) {
    const gNum = extractGradeNumber(cfg.grade)
    const ep = String(cfg.evaluationPeriod || "ALL").toUpperCase().trim()
    const cType = cfg.configType || "VNEDU"
    configsByKey.set(`${cfg.subjectId}_${gNum ?? "ALL"}_${ep}_${cType}`, cfg)
  }

  const entriesByStudentId = new Map<string, any[]>()
  for (const entry of gradeEntries) {
    if (!entriesByStudentId.has(entry.studentId)) {
      entriesByStudentId.set(entry.studentId, [])
    }
    entriesByStudentId.get(entry.studentId)!.push(entry)
  }

  // Sắp xếp ổn định theo Cơ sở -> Khối -> Lớp -> Họ tên -> Môn cam kết
  const sortedStudents = [...afterClass].sort((a, b) => {
    const cA = a.classObj
    const cB = b.classObj
    const campA = cA.campus?.campusCode || ""
    const campB = cB.campus?.campusCode || ""
    if (campA !== campB) return campA.localeCompare(campB, "vi")
    const gA = extractGradeNumber(cA.grade || cA.className) ?? 99
    const gB = extractGradeNumber(cB.grade || cB.className) ?? 99
    if (gA !== gB) return gA - gB
    if (cA.className !== cB.className) {
      return cA.className.localeCompare(cB.className, "vi", { numeric: true })
    }
    return a.studentName.localeCompare(b.studentName, "vi")
  })

  const allDetailRows: AcademicCommitmentDetailRow[] = []
  const missingBenchmarkLogged = new Set<string>()
  const periods: CommitmentPeriodCode[] = ["KSĐN", "GK1", "CK1", "GK2", "CK2"]

  for (const item of sortedStudents) {
    const cls = item.classObj
    const campusId = cls.campusId || cls.campus?.id || ""
    const campusCode = cls.campus?.campusCode || ""
    const campusName = cls.campus?.campusName || campusCode
    const level = resolveDetailedEducationLevel(cls.level, cls.grade, cls.className)
    const levelLabel = getEducationLevelLabel(level)
    const gradeNum = extractGradeNumber(cls.grade || cls.className)
    const gradeStr = cls.grade || (gradeNum !== null ? String(gradeNum) : "")

    const studentSubjects = Array.from(item.subjects)
      .filter((sub) => {
        if (selectedSubject === "ALL") return true
        return cleanNormalizedString(sub) === cleanNormalizedString(selectedSubject)
      })
      .sort((a, b) => {
        const idxA = preferredSubjectOrder.indexOf(a)
        const idxB = preferredSubjectOrder.indexOf(b)
        if (idxA !== -1 && idxB !== -1) return idxA - idxB
        if (idxA !== -1) return -1
        if (idxB !== -1) return 1
        return a.localeCompare(b, "vi")
      })

    const studentEntries = entriesByStudentId.get(item.studentId) || []

    for (const committedSub of studentSubjects) {
      const matchedSubIds = getMatchedSubjectIds(committedSub)
      const subjectEntries = studentEntries.filter(
        (e) =>
          matchedSubIds.includes(e.subjectId) ||
          (e.subject && doesSubjectMatchCommittedSubject(committedSub, e.subject))
      )

      const resolvedScores: Record<CommitmentPeriodCode, number | null> = {
        KSĐN: null,
        GK1: null,
        CK1: null,
        GK2: null,
        CK2: null,
      }
      const scoreNotes: string[] = []
      let hasAmbiguousScore = false

      for (const pCode of periods) {
        const res = resolveOfficialPeriodScoreWithConflictCheck({
          entries: subjectEntries,
          period: pCode,
          configsByKey,
          gradeNum,
        })
        resolvedScores[pCode] = res.score
        if (res.ambiguousConflict) {
          hasAmbiguousScore = true
          if (res.detailNote) {
            scoreNotes.push(res.detailNote)
            pushRecon({
              type: "AMBIGUOUS_SCORE_CONFLICT",
              studentCode: item.studentCode,
              studentName: item.studentName,
              campusName,
              className: cls.className,
              subject: committedSub,
              period: pCode,
              detail: res.detailNote,
            })
          }
        } else if (res.hasMakeupOrUpdate && res.detailNote) {
          scoreNotes.push(res.detailNote)
          pushRecon({
            type: "MAKEUP_OR_UPDATED_SCORE_USED",
            studentCode: item.studentCode,
            studentName: item.studentName,
            campusName,
            className: cls.className,
            subject: committedSub,
            period: pCode,
            detail: res.detailNote,
          })
        }
      }

      const thresholdRes = resolveGk1ProgressThreshold({
        level,
        grade: gradeStr,
        matchedSubjectIds: matchedSubIds,
        committedSubject: committedSub,
        benchmarkConfigs,
      })

      if (thresholdRes.threshold === null) {
        const key = `${level}_${gradeStr}_${committedSub}`
        if (!missingBenchmarkLogged.has(key)) {
          missingBenchmarkLogged.add(key)
          pushRecon({
            type: "MISSING_BENCHMARK_CONFIG",
            subject: committedSub,
            detail: `Chưa có cấu hình ngưỡng chuẩn GK1 cho ${committedSub} (${levelLabel}${gradeNum ? ` - Khối ${gradeNum}` : ""}); loại khỏi mẫu số tính tỷ lệ tiến bộ.`,
          })
        }
      }

      const evalRes = evaluateGk1Outcome({
        ksdnScore: resolvedScores.KSĐN,
        gk1Score: resolvedScores.GK1,
        threshold: thresholdRes.threshold,
      })

      if (evalRes.gk1Outcome === "CHUA_DU_DU_LIEU") {
        const missingParts: string[] = []
        if (resolvedScores.KSĐN === null) missingParts.push("KSĐN")
        if (resolvedScores.GK1 === null) missingParts.push("Giữa kỳ 1")
        pushRecon({
          type: "MISSING_SCORE_DATA",
          studentCode: item.studentCode,
          studentName: item.studentName,
          campusName,
          className: cls.className,
          subject: committedSub,
          detail: `Thiếu điểm ${missingParts.join(" và ")} để đối chiếu tiến bộ GK1.`,
        })
      }

      const latestInfo = resolveLatestPeriodScore({
        ksdnScore: resolvedScores.KSĐN,
        gk1Score: resolvedScores.GK1,
        ck1Score: resolvedScores.CK1,
        gk2Score: resolvedScores.GK2,
        ck2Score: resolvedScores.CK2,
      })
      const latestStd = evaluateLatestStandard({
        level,
        latestScore: latestInfo.latestScore,
        ksdnScore: resolvedScores.KSĐN,
        configuredThreshold: thresholdRes.threshold,
      })

      allDetailRows.push({
        rowKey: `${item.studentId}_${committedSub}`,
        stt: allDetailRows.length + 1,
        studentId: item.studentId,
        studentCode: item.studentCode,
        studentName: item.studentName,
        classId: cls.id,
        className: cls.className,
        classCode: cls.classCode || cls.className,
        grade: gradeStr,
        level,
        levelLabel,
        campusId,
        campusCode,
        campusName,
        committedSubject: committedSub,
        committedSubjectCode: cleanNormalizedString(committedSub).toUpperCase(),
        ksdnScore: resolvedScores.KSĐN,
        gk1Score: resolvedScores.GK1,
        ck1Score: resolvedScores.CK1,
        gk2Score: resolvedScores.GK2,
        ck2Score: resolvedScores.CK2,
        gk1Threshold: thresholdRes.threshold,
        gk1ThresholdSource: thresholdRes.source,
        deltaGk1Ksdn: evalRes.deltaGk1Ksdn,
        gk1Outcome: evalRes.gk1Outcome,
        gk1OutcomeLabel: evalRes.gk1OutcomeLabel,
        isGk1Pass: evalRes.isGk1Pass,
        isComparableForProgress: evalRes.isComparableForProgress,
        isProgressAchieved: evalRes.isProgressAchieved,
        latestPeriod: latestInfo.latestPeriod,
        latestPeriodLabel: latestInfo.latestPeriodLabel,
        latestScore: latestInfo.latestScore,
        deltaLatestVsKsdn: latestStd.deltaLatestVsKsdn,
        standardClassification: latestStd.classification,
        standardClassificationLabel: latestStd.classificationLabel,
        isStandardMet: latestStd.isStandardMet,
        isStandardBandOnly: latestStd.isStandardBandOnly,
        isOutstandingProgress: latestStd.isOutstandingProgress,
        isEligibleForStandardRate: latestStd.isEligibleForStandardRate,
        hasAmbiguousScore,
        scoreNotes,
      })
    }
  }

  // Tổng hợp cấp toàn phạm vi (tính lại từ các bản ghi gốc, đếm HS duy nhất theo mã)
  const distinctStudents = new Set<string>()
  const outcomeCounts: Record<Gk1OutcomeCode, number> = {
    DAT_TIEN_BO: 0,
    TANG_CHUA_DAT_CHUAN: 0,
    DAT_CHUAN_GIU_NGUYEN: 0,
    DAT_CHUAN_GIAM: 0,
    CHUA_DAT_CHUAN_GIU_NGUYEN: 0,
    CHUA_DAT_CHUAN_GIAM: 0,
    CHUA_DU_DU_LIEU: 0,
    CHUA_CO_CAU_HINH_CHUAN: 0,
  }
  let comparableRowCount = 0
  let gk1PassCount = 0
  let progressCount = 0

  for (const r of allDetailRows) {
    distinctStudents.add(r.studentCode && r.studentCode !== "-" ? r.studentCode : r.studentId)
    outcomeCounts[r.gk1Outcome] += 1
    if (r.isComparableForProgress) comparableRowCount += 1
    if (r.isGk1Pass === true) gk1PassCount += 1
    if (r.isProgressAchieved) progressCount += 1
  }

  // Bảng tổng hợp theo cơ sở
  const campusSummary = aggregateAcademicRows(
    allDetailRows,
    (r) => r.campusId || r.campusCode,
    (r) => ({
      campusId: r.campusId,
      campusCode: r.campusCode,
      campusName: r.campusName,
    })
  ).sort((a, b) => a.campusCode.localeCompare(b.campusCode, "vi"))

  // Bảng tổng hợp theo cơ sở, bậc và môn
  const campusLevelSubjectSummary = aggregateAcademicRows(
    allDetailRows,
    (r) => `${r.campusId}_${r.level}_${r.committedSubject}`,
    (r) => ({
      campusId: r.campusId,
      campusCode: r.campusCode,
      campusName: r.campusName,
      level: r.level,
      levelLabel: r.levelLabel,
      subject: r.committedSubject,
    })
  ).sort((a, b) => {
    if (a.campusCode !== b.campusCode) return a.campusCode.localeCompare(b.campusCode, "vi")
    const lA = levelOrder.indexOf(a.level || "KHAC")
    const lB = levelOrder.indexOf(b.level || "KHAC")
    if (lA !== lB) return lA - lB
    return (a.subject || "").localeCompare(b.subject || "", "vi")
  })

  const transferIn = await loadEnrolledTransferInLookup({
    academicYearId: selectedYearId,
    scope,
    selectedCampusId,
    selectedClassId,
  })
  const enrolledLookup = transferIn.lookup
  const hierarchy = buildAcademicHierarchy(allDetailRows, enrolledLookup)

  const selectedCampusObj = allCampuses.find((c) => c.id === selectedCampusId)
  const selectedClassObj = availableClasses.find((c) => c.id === selectedClassId)

  return {
    asOfDate: asOfDateIso,
    filters: {
      academicYearId: selectedYearId,
      academicYearName: selectedYearObj?.name || "",
      campusId: selectedCampusId,
      campusName:
        selectedCampusId === "ALL"
          ? "Toàn hệ thống"
          : selectedCampusObj?.campusName || selectedCampusObj?.campusCode || "",
      level: selectedLevel,
      levelLabel:
        selectedLevel === "ALL" ? "Tất cả bậc học" : getEducationLevelLabel(selectedLevel),
      grade: selectedGrade,
      classId: selectedClassId,
      className: selectedClassId === "ALL" ? "Tất cả lớp" : selectedClassObj?.className || "",
      committedSubject: selectedSubject,
    },
    availableFilters: {
      academicYears,
      campuses: allCampuses,
      levels: availableLevels,
      grades: availableGrades,
      classes: availableClasses,
      subjects: availableSubjects,
    },
    summary: {
      enrolledStudentCount: enrolledLookup.system,
      distinctStudentCount: distinctStudents.size,
      enrolledShareRate:
        enrolledLookup.system > 0
          ? Math.round((distinctStudents.size / enrolledLookup.system) * 1000) / 10
          : null,
      commitmentRowCount: allDetailRows.length,
      comparableRowCount,
      gk1PassCount,
      progressCount,
      progressRate:
        comparableRowCount > 0
          ? Math.round((progressCount / comparableRowCount) * 1000) / 10
          : null,
      eligibleStandardRowCount: hierarchy.eligibleRowCount,
      standardBandCount: hierarchy.standardBandCount,
      outstandingCount: hierarchy.outstandingCount,
      totalStandardMetCount: hierarchy.totalStandardMetCount,
      belowStandardCount: hierarchy.belowStandardCount,
      standardRate: hierarchy.standardRate,
      outstandingRate: hierarchy.outstandingRate,
      missingDataCount: outcomeCounts.CHUA_DU_DU_LIEU,
      missingThresholdCount: outcomeCounts.CHUA_CO_CAU_HINH_CHUAN,
      outcomeCounts,
    },
    hierarchy,
    campusSummary,
    campusLevelSubjectSummary,
    detailRows: scope.isSummaryOnly ? [] : allDetailRows,
    reconciliationItems: scope.isSummaryOnly ? [] : reconciliationItems,
    isSummaryOnly: scope.isSummaryOnly,
  }
}
