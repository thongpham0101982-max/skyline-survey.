/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/db"
import { extractGradeNumber } from "@/lib/grading/vnedu-config-types"
import {
  cleanNormalizedString,
  CommitmentPeriodCode,
  doesSubjectMatchCommittedSubject,
} from "@/lib/ktdbcl/entranceCommitmentReportEngine"
import {
  evaluateGk1Outcome,
  getEducationLevelLabel,
  resolveDetailedEducationLevel,
  resolveGk1ProgressThreshold,
  resolveOfficialPeriodScoreWithConflictCheck,
} from "./academicCommitmentEngine"
import {
  buildAcademicHierarchy,
  evaluateLatestStandard,
  loadEnrolledTransferInLookup,
  resolveLatestPeriodScore,
} from "./standardEvaluator"
import {
  EducationLevelCode,
  ExchangeStudentAggregateRow,
  ExchangeStudentDetailRow,
  ExchangeStudentFilterInput,
  ExchangeStudentReportPayload,
  Gk1OutcomeCode,
  ReconciliationItem,
  StudentStatisticsAccessScope,
} from "./types"

/**
 * Kiểm tra học sinh có thuộc diện Học giao lưu (studentType === "GIAO_LUU") hay không.
 */
export function isExchangeStudentRecord(student: {
  studentType?: string | null
  status?: string | null
}): boolean {
  if (!student) return false
  if (String(student.status || "").toUpperCase() === "TRANSFERRED_OUT") return false
  const st = String(student.studentType || "").toUpperCase().trim()
  return st === "GIAO_LUU" || st === "HOC_GIAO_LUU"
}

function getCoreSubjectsForLevel(level: EducationLevelCode): string[] {
  if (level === "TIEU_HOC") return ["Toán", "Tiếng Việt", "Tiếng Anh"]
  return ["Toán", "Ngữ văn", "Tiếng Anh"]
}

function aggregateExchangeRows(
  rows: ExchangeStudentDetailRow[],
  keyFn: (r: ExchangeStudentDetailRow) => string,
  metaFn: (r: ExchangeStudentDetailRow) => {
    campusId: string
    campusCode: string
    campusName: string
    level?: EducationLevelCode
    levelLabel?: string
    subject?: string
  }
): ExchangeStudentAggregateRow[] {
  const buckets = new Map<
    string,
    {
      meta: ReturnType<typeof metaFn>
      studentKeys: Set<string>
      trackedRowCount: number
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
        trackedRowCount: 0,
        comparableRowCount: 0,
        gk1PassCount: 0,
        progressCount: 0,
      })
    }
    const b = buckets.get(key)!
    const sKey = r.studentCode && r.studentCode !== "-" ? r.studentCode : r.studentId
    b.studentKeys.add(sKey)
    b.trackedRowCount += 1
    if (r.isComparableForProgress) b.comparableRowCount += 1
    if (r.isGk1Pass === true) b.gk1PassCount += 1
    if (r.isProgressAchieved) b.progressCount += 1
  }

  return Array.from(buckets.entries()).map(([key, b]) => ({
    key,
    ...b.meta,
    distinctStudentCount: b.studentKeys.size,
    trackedRowCount: b.trackedRowCount,
    comparableRowCount: b.comparableRowCount,
    gk1PassCount: b.gk1PassCount,
    progressCount: b.progressCount,
    progressRate:
      b.comparableRowCount > 0
        ? Math.round((b.progressCount / b.comparableRowCount) * 1000) / 10
        : null,
  }))
}

export async function generateExchangeStudentStatistics(
  filters: ExchangeStudentFilterInput,
  scope: StudentStatisticsAccessScope
): Promise<ExchangeStudentReportPayload> {
  const asOfDateObj = filters.asOfDate ? new Date(filters.asOfDate) : new Date()
  const asOfDateIso = Number.isNaN(asOfDateObj.getTime())
    ? new Date().toISOString()
    : asOfDateObj.toISOString()

  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true },
  })
  const activeYear = academicYears.find((y) => y.status === "ACTIVE") || academicYears[0]
  const selectedYearId =
    filters.academicYearId && academicYears.some((y) => y.id === filters.academicYearId)
      ? filters.academicYearId
      : activeYear?.id || ""
  const selectedYearObj = academicYears.find((y) => y.id === selectedYearId) || activeYear

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
    rawExchangeStudents,
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

  const reconciliationItems: ReconciliationItem[] = []
  let reconSeq = 1
  const pushRecon = (item: Omit<ReconciliationItem, "id">) => {
    reconciliationItems.push({ id: `ex_recon_${reconSeq++}`, ...item })
  }

  const classById = new Map<string, any>(allClasses.map((c: any) => [c.id, c]))
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

  const resolveEffectiveClass = (student: any) => {
    const transfer = latestTransferByStudentId.get(student.id)
    if (transfer && transfer.toClassId && classById.has(transfer.toClassId)) {
      return classById.get(transfer.toClassId)
    }
    if (student.classId && classById.has(student.classId)) return classById.get(student.classId)
    if (student.class && student.class.id) return classById.get(student.class.id) || student.class
    return null
  }

  interface ExchangeCohortStudent {
    studentId: string
    studentCode: string
    studentName: string
    studentTypeNote: string | null
    classObj: any
  }

  const scopedCohort: ExchangeCohortStudent[] = []
  for (const st of rawExchangeStudents) {
    if (!isExchangeStudentRecord(st)) continue
    const effectiveClass = resolveEffectiveClass(st)
    if (!effectiveClass || !effectiveClass.id) {
      pushRecon({
        type: "UNASSIGNED_CLASS_EXCLUDED",
        studentCode: st.studentCode || "-",
        studentName: st.studentName || "-",
        detail: "Học sinh diện Học giao lưu chưa có bản ghi phân lớp hợp lệ trong năm học.",
      })
      continue
    }

    const cId = effectiveClass.campusId || effectiveClass.campus?.id || ""
    if (isCampusRestricted && !scope.allowedCampusIds.includes(cId)) continue
    if (isClassRestricted && !scope.allowedClassIds.includes(effectiveClass.id)) continue

    scopedCohort.push({
      studentId: st.id,
      studentCode: st.studentCode || "-",
      studentName: st.studentName || "-",
      studentTypeNote: st.studentTypeNote || null,
      classObj: effectiveClass,
    })
  }

  // Ánh xạ môn học
  const allowedSubjectIdSet = new Set(scope.allowedSubjectIds || [])
  const hasSubjectRestriction =
    Boolean(scope.isSubjectRestricted) && allowedSubjectIdSet.size > 0

  const matchedSubjectIdsByName = new Map<string, string[]>()
  const getMatchedSubjectIds = (subName: string): string[] => {
    if (matchedSubjectIdsByName.has(subName)) return matchedSubjectIdsByName.get(subName)!
    const ids = allSubjects
      .filter((s: any) => doesSubjectMatchCommittedSubject(subName, s))
      .map((s: any) => s.id)
    matchedSubjectIdsByName.set(subName, ids)
    return ids
  }

  const studentIds = scopedCohort.map((s) => s.studentId)
  const gradeEntries =
    studentIds.length > 0
      ? await prisma.subjectGradeEntry.findMany({
          where: {
            academicYearId: selectedYearId,
            studentId: { in: studentIds },
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
  for (const e of gradeEntries) {
    if (!entriesByStudentId.has(e.studentId)) entriesByStudentId.set(e.studentId, [])
    entriesByStudentId.get(e.studentId)!.push(e)
  }

  // Môn theo dõi cho học sinh diện Học giao lưu: các môn cốt lõi (Toán, Tiếng Việt/Ngữ văn, Tiếng Anh)
  const studentTrackedSubjects = new Map<string, string[]>()
  for (const rec of scopedCohort) {
    const level = resolveDetailedEducationLevel(
      rec.classObj.level,
      rec.classObj.grade,
      rec.classObj.className
    )
    const baseSubs = getCoreSubjectsForLevel(level)
    const filtered = hasSubjectRestriction
      ? baseSubs.filter((sub) =>
          getMatchedSubjectIds(sub).some((id) => allowedSubjectIdSet.has(id))
        )
      : baseSubs
    studentTrackedSubjects.set(rec.studentId, filtered)
  }

  // Bộ lọc phụ thuộc: Cơ sở -> Bậc học -> Khối -> Lớp -> Môn
  const afterCampus = scopedCohort.filter((rec) => {
    if (selectedCampusId === "ALL") return true
    const cId = rec.classObj.campusId || rec.classObj.campus?.id || ""
    return cId === selectedCampusId
  })

  const levelCountMap = new Map<EducationLevelCode, number>()
  for (const rec of afterCampus) {
    const lvl = resolveDetailedEducationLevel(
      rec.classObj.level,
      rec.classObj.grade,
      rec.classObj.className
    )
    const count = (studentTrackedSubjects.get(rec.studentId) || []).length
    levelCountMap.set(lvl, (levelCountMap.get(lvl) || 0) + count)
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

  const afterLevel = afterCampus.filter((rec) => {
    if (selectedLevel === "ALL") return true
    const lvl = resolveDetailedEducationLevel(
      rec.classObj.level,
      rec.classObj.grade,
      rec.classObj.className
    )
    return lvl === selectedLevel
  })

  const gradeCountMap = new Map<string, number>()
  for (const rec of afterLevel) {
    const gNum = extractGradeNumber(rec.classObj.grade || rec.classObj.className)
    const gCode = gNum !== null ? String(gNum) : String(rec.classObj.grade || "Khác")
    const count = (studentTrackedSubjects.get(rec.studentId) || []).length
    gradeCountMap.set(gCode, (gradeCountMap.get(gCode) || 0) + count)
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

  const afterGrade = afterLevel.filter((rec) => {
    if (selectedGrade === "ALL") return true
    const gNum = extractGradeNumber(rec.classObj.grade || rec.classObj.className)
    const gCode = gNum !== null ? String(gNum) : String(rec.classObj.grade || "Khác")
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
  for (const rec of afterGrade) {
    const cls = rec.classObj
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
    classMap.get(cls.id)!.rowCount += (studentTrackedSubjects.get(rec.studentId) || []).length
  }
  const availableClasses = Array.from(classMap.values()).sort((a, b) => {
    if (a.campusCode !== b.campusCode) return a.campusCode.localeCompare(b.campusCode, "vi")
    return a.className.localeCompare(b.className, "vi", { numeric: true })
  })

  const selectedClassId =
    filters.classId &&
    filters.classId !== "ALL" &&
    availableClasses.some((c) => c.id === filters.classId)
      ? filters.classId
      : "ALL"

  const afterClass = afterGrade.filter((rec) => {
    if (selectedClassId === "ALL") return true
    return rec.classObj.id === selectedClassId
  })

  const subjectCountMap = new Map<string, number>()
  for (const rec of afterClass) {
    for (const sub of studentTrackedSubjects.get(rec.studentId) || []) {
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
  if (filters.subject && filters.subject !== "ALL") {
    const found = availableSubjects.find(
      (s) => cleanNormalizedString(s.name) === cleanNormalizedString(filters.subject)
    )
    if (found) selectedSubject = found.name
  }

  const sortedCohort = [...afterClass].sort((a, b) => {
    const campA = a.classObj.campus?.campusCode || ""
    const campB = b.classObj.campus?.campusCode || ""
    if (campA !== campB) return campA.localeCompare(campB, "vi")
    const gA = extractGradeNumber(a.classObj.grade || a.classObj.className) ?? 99
    const gB = extractGradeNumber(b.classObj.grade || b.classObj.className) ?? 99
    if (gA !== gB) return gA - gB
    if (a.classObj.className !== b.classObj.className) {
      return a.classObj.className.localeCompare(b.classObj.className, "vi", { numeric: true })
    }
    return a.studentName.localeCompare(b.studentName, "vi")
  })

  const periods: CommitmentPeriodCode[] = ["KSĐN", "GK1", "CK1", "GK2", "CK2"]
  const detailRows: ExchangeStudentDetailRow[] = []

  for (const rec of sortedCohort) {
    const cls = rec.classObj
    const campusId = cls.campusId || cls.campus?.id || ""
    const campusCode = cls.campus?.campusCode || ""
    const campusName = cls.campus?.campusName || campusCode
    const level = resolveDetailedEducationLevel(cls.level, cls.grade, cls.className)
    const levelLabel = getEducationLevelLabel(level)
    const gradeNum = extractGradeNumber(cls.grade || cls.className)
    const gradeStr = cls.grade || (gradeNum !== null ? String(gradeNum) : "")

    const subjects = (studentTrackedSubjects.get(rec.studentId) || [])
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

    const studentEntries = entriesByStudentId.get(rec.studentId) || []

    for (const subName of subjects) {
      const matchedSubIds = getMatchedSubjectIds(subName)
      const subjectEntries = studentEntries.filter(
        (e) =>
          matchedSubIds.includes(e.subjectId) ||
          (e.subject && doesSubjectMatchCommittedSubject(subName, e.subject))
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
              studentCode: rec.studentCode,
              studentName: rec.studentName,
              campusName,
              className: cls.className,
              subject: subName,
              period: pCode,
              detail: res.detailNote,
            })
          }
        } else if (res.hasMakeupOrUpdate && res.detailNote) {
          scoreNotes.push(res.detailNote)
        }
      }

      const thresholdRes = resolveGk1ProgressThreshold({
        level,
        grade: gradeStr,
        matchedSubjectIds: matchedSubIds,
        committedSubject: subName,
        benchmarkConfigs,
      })

      const evalRes = evaluateGk1Outcome({
        ksdnScore: resolvedScores.KSĐN,
        gk1Score: resolvedScores.GK1,
        threshold: thresholdRes.threshold,
      })

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

      detailRows.push({
        rowKey: `${rec.studentId}_${subName}`,
        stt: detailRows.length + 1,
        studentId: rec.studentId,
        studentCode: rec.studentCode,
        studentName: rec.studentName,
        classId: cls.id,
        className: cls.className,
        classCode: cls.classCode || cls.className,
        grade: gradeStr,
        level,
        levelLabel,
        campusId,
        campusCode,
        campusName,
        studentTypeLabel: "Học giao lưu",
        studentTypeNote: rec.studentTypeNote,
        subjectName: subName,
        subjectCode: cleanNormalizedString(subName).toUpperCase(),
        ksdnScore: resolvedScores.KSĐN,
        gk1Score: resolvedScores.GK1,
        ck1Score: resolvedScores.CK1,
        gk2Score: resolvedScores.GK2,
        ck2Score: resolvedScores.CK2,
        gk1Threshold: thresholdRes.threshold,
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

  for (const r of detailRows) {
    distinctStudents.add(r.studentCode && r.studentCode !== "-" ? r.studentCode : r.studentId)
    outcomeCounts[r.gk1Outcome] += 1
    if (r.isComparableForProgress) comparableRowCount += 1
    if (r.isGk1Pass === true) gk1PassCount += 1
    if (r.isProgressAchieved) progressCount += 1
  }

  const campusSummary = aggregateExchangeRows(
    detailRows,
    (r) => r.campusId || r.campusCode,
    (r) => ({
      campusId: r.campusId,
      campusCode: r.campusCode,
      campusName: r.campusName,
    })
  ).sort((a, b) => a.campusCode.localeCompare(b.campusCode, "vi"))

  const campusLevelSubjectSummary = aggregateExchangeRows(
    detailRows,
    (r) => `${r.campusId}_${r.level}_${r.subjectName}`,
    (r) => ({
      campusId: r.campusId,
      campusCode: r.campusCode,
      campusName: r.campusName,
      level: r.level,
      levelLabel: r.levelLabel,
      subject: r.subjectName,
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
  const hierarchy = buildAcademicHierarchy(detailRows, enrolledLookup)

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
      subject: selectedSubject,
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
      trackedRowCount: detailRows.length,
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
    detailRows: scope.isSummaryOnly ? [] : detailRows,
    reconciliationItems: scope.isSummaryOnly ? [] : reconciliationItems,
    isSummaryOnly: scope.isSummaryOnly,
  }
}
