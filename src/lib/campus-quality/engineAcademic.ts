import { prisma } from "@/lib/db"
import { parseRawStudentTestStatus } from "@/lib/ktdbcl/thkqPeriodicReportEngine"
import { PERIOD_LABELS, ResolvedDashboardContext, resolveBenchmarkScore } from "./baseContext"
import {
  buildScoreDistributionBuckets,
  computeDiffPp,
  computeScoreStats,
  matchesLevelFilter,
  round1,
  round2,
} from "./stats"
import {
  AcademicQualityTabPayload,
  CampusQualityAccessScope,
  ClassSubjectHeatmapCell,
  EvaluationPeriodCode,
  ExtendedScoreStats,
  InternationalSubjectRow,
  PeriodTrendPoint,
  SubjectGradeRow,
  TeacherSubjectClassRow,
} from "./types"

const CTQT_SUBJECT_NAMES: Record<string, string> = {
  ENG: "English (CTQT)",
  SCI: "Science (CTQT)",
  MATH: "Mathematics (CTQT)",
  GLOBAL_STUDIES: "Global Studies",
  AE: "Academic English",
  IELTS: "IELTS Preparation",
  AR: "Accelerated Reader",
}

const ALL_PERIODS: EvaluationPeriodCode[] = ["GK1", "CK1", "GK2", "CK2"]

export async function getAcademicQualityTab(
  ctx: ResolvedDashboardContext,
  _scope: CampusQualityAccessScope
): Promise<AcademicQualityTabPayload> {
  const { academicYearId, scopedClassIds, allYearClasses, evaluationPeriod } = ctx
  const scopedClassMap = new Map(ctx.scopedClasses.map((c) => [c.id, c]))
  const allClassMap = new Map(allYearClasses.map((c) => [c.id, c]))
  const classIdFilter = scopedClassIds.length > 0 ? { in: scopedClassIds } : { in: ["__NONE__"] }

  const [
    subjects,
    benchmarks,
    gradeLocks,
    allYearGrades,
    activeStudents,
    teachingAssignments,
    ctqtEntries,
    ctqtCompetencies,
    intlResults,
  ] = await Promise.all([
    prisma.subject.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, subjectCode: true, subjectName: true },
    }),
    prisma.subjectBenchmarkConfig.findMany({
      where: { academicYearId },
      select: {
        evaluationPeriod: true,
        level: true,
        grade: true,
        subjectId: true,
        benchmarkScore: true,
      },
    }),
    prisma.gradebookLock.findMany({
      where: { academicYearId, isLocked: true },
      select: { evaluationPeriod: true, classId: true, subjectId: true },
    }),
    prisma.subjectGradeEntry.findMany({
      where: { academicYearId },
      select: {
        studentId: true,
        subjectId: true,
        classId: true,
        evaluationPeriod: true,
        compositeScore: true,
        ratingValue: true,
        remark: true,
        teacherId: true,
      },
    }),
    prisma.student.findMany({
      where: { academicYearId, status: "ACTIVE", classId: classIdFilter },
      select: { id: true, classId: true },
    }),
    prisma.teachingAssignment.findMany({
      where: { academicYearId, classId: classIdFilter },
      include: { teacher: { select: { id: true, teacherName: true } } },
    }),
    prisma.ctqtGradeEntry.findMany({
      where: { academicYearId, classId: classIdFilter },
      select: {
        id: true,
        studentId: true,
        classId: true,
        subjectCode: true,
        semester: true,
        midTermScore: true,
        endTermScore: true,
        gpaScore: true,
        ieltsScore: true,
        reviewStatus: true,
      },
    }),
    prisma.ctqtCompetencyEntry.findMany({
      where: { academicYearId, classId: classIdFilter },
      select: {
        classId: true,
        communication: true,
        collaboration: true,
        responsibility: true,
        criticalThinking: true,
        creativity: true,
        problemSolving: true,
      },
    }),
    prisma.intlExamResult.findMany({
      where: {
        session: {
          OR: [{ academicYearId }, { academicYearText: ctx.academicYearName }],
        },
      },
      include: { skillResults: true },
    }),
  ])

  const subjectMap = new Map(subjects.map((s) => [s.id, s]))
  const benchmarkItems = benchmarks.map((b) => ({
    evaluationPeriod: b.evaluationPeriod,
    level: b.level || "ALL",
    grade: b.grade || "ALL",
    subjectId: b.subjectId || "ALL",
    benchmarkScore: b.benchmarkScore,
  }))

  const isLocked = (period: string, classId: string, subjectId: string) =>
    gradeLocks.some(
      (l) =>
        l.evaluationPeriod === period &&
        (l.classId === "ALL" || l.classId === classId) &&
        (l.subjectId === "ALL" || l.subjectId === subjectId)
    )

  const classSizeMap = new Map<string, number>()
  for (const s of activeStudents) {
    classSizeMap.set(s.classId, (classSizeMap.get(s.classId) || 0) + 1)
  }

  // Teacher lookup by classId::subjectId
  const teacherByClassSubject = new Map<string, { teacherId: string; teacherName: string }>()
  for (const ta of teachingAssignments) {
    const key = `${ta.classId}::${ta.subjectId}`
    if (!teacherByClassSubject.has(key)) {
      teacherByClassSubject.set(key, {
        teacherId: ta.teacherId,
        teacherName: ta.teacher?.teacherName || "Chưa phân công",
      })
    }
  }

  // Filter grades for current evaluationPeriod
  const periodGrades = allYearGrades.filter((g) => {
    if (g.evaluationPeriod !== evaluationPeriod) return false
    if (ctx.subjectId !== "ALL" && g.subjectId !== ctx.subjectId) return false
    if (ctx.publishedOnly && !isLocked(g.evaluationPeriod, g.classId, g.subjectId)) return false
    return true
  })

  // System-wide pass rate by subjectId::grade for comparison
  const sysGroupMap = new Map<string, { valid: number; meet: number; scores: number[] }>()
  const localGroupMap = new Map<
    string,
    {
      subjectId: string
      grade: string
      level: string
      scores: number[]
      absent: number
      exempt: number
      classIds: Set<string>
    }
  >()
  const cellMap = new Map<string, { classId: string; subjectId: string; scores: number[] }>()
  const teacherRowMap = new Map<
    string,
    { teacherId: string; teacherName: string; subjectId: string; classId: string; scores: number[] }
  >()

  for (const g of periodGrades) {
    const cls = allClassMap.get(g.classId)
    if (!cls) continue
    const parsed = parseRawStudentTestStatus({
      rawScoreVal: g.compositeScore,
      remarkText: g.remark,
      ratingText: g.ratingValue,
    })
    const sgKey = `${g.subjectId}::${cls.grade}`
    const bm = resolveBenchmarkScore(
      benchmarkItems,
      evaluationPeriod,
      cls.normalizedLevel,
      cls.grade,
      g.subjectId
    )

    // System comparison pool (same year, period, grade, subject across ALL campuses)
    if (parsed.statusInTest === "VALID_SCORE" && parsed.officialScore !== null) {
      const sysBucket = sysGroupMap.get(sgKey) || { valid: 0, meet: 0, scores: [] }
      sysBucket.scores.push(parsed.officialScore)
      if (bm !== null) {
        sysBucket.valid++
        if (parsed.officialScore >= bm) sysBucket.meet++
      }
      sysGroupMap.set(sgKey, sysBucket)
    }

    if (!scopedClassMap.has(g.classId)) continue

    // Subject × Grade local bucket
    const localBucket = localGroupMap.get(sgKey) || {
      subjectId: g.subjectId,
      grade: cls.grade,
      level: cls.normalizedLevel,
      scores: [],
      absent: 0,
      exempt: 0,
      classIds: new Set<string>(),
    }
    localBucket.classIds.add(g.classId)
    if (parsed.statusInTest === "VALID_SCORE" && parsed.officialScore !== null) {
      localBucket.scores.push(parsed.officialScore)
    } else if (parsed.statusInTest === "ABSENT_MAKEUP") {
      localBucket.absent++
    } else if (parsed.statusInTest === "EXEMPT") {
      localBucket.exempt++
    }
    localGroupMap.set(sgKey, localBucket)

    // Heatmap cell Class × Subject
    const csKey = `${g.classId}::${g.subjectId}`
    const cell = cellMap.get(csKey) || { classId: g.classId, subjectId: g.subjectId, scores: [] }
    if (parsed.statusInTest === "VALID_SCORE" && parsed.officialScore !== null) {
      cell.scores.push(parsed.officialScore)
    }
    cellMap.set(csKey, cell)

    // Teacher × Subject × Class
    const assigned = teacherByClassSubject.get(csKey)
    const tId = assigned?.teacherId || g.teacherId || "UNASSIGNED"
    const tName = assigned?.teacherName || "Chưa phân công"
    const trKey = `${tId}::${g.subjectId}::${g.classId}`
    const tr = teacherRowMap.get(trKey) || {
      teacherId: tId,
      teacherName: tName,
      subjectId: g.subjectId,
      classId: g.classId,
      scores: [],
    }
    if (parsed.statusInTest === "VALID_SCORE" && parsed.officialScore !== null) {
      tr.scores.push(parsed.officialScore)
    }
    teacherRowMap.set(trKey, tr)
  }

  // Build Subject × Grade rows
  const subjectGradeRows: SubjectGradeRow[] = Array.from(localGroupMap.entries())
    .map(([rowKey, bucket]) => {
      const subj = subjectMap.get(bucket.subjectId)
      const stats = computeScoreStats(bucket.scores)
      const expectedCount = Array.from(bucket.classIds).reduce(
        (acc, cid) => acc + (classSizeMap.get(cid) || 0),
        0
      )
      const bm = resolveBenchmarkScore(
        benchmarkItems,
        evaluationPeriod,
        bucket.level,
        bucket.grade,
        bucket.subjectId
      )
      const meetCount = bm !== null ? bucket.scores.filter((s) => s >= bm).length : 0
      const belowBmCount = bm !== null ? bucket.scores.filter((s) => s < bm).length : 0
      const meetRate =
        bm !== null && stats.validCount > 0 ? round1((meetCount / stats.validCount) * 100) : null
      const belowBmRate =
        bm !== null && stats.validCount > 0 ? round1((belowBmCount / stats.validCount) * 100) : null

      const sysBucket = sysGroupMap.get(rowKey)
      const sysMeetRate =
        bm !== null && sysBucket && sysBucket.valid > 0
          ? round1((sysBucket.meet / sysBucket.valid) * 100)
          : null

      return {
        rowKey,
        subjectId: bucket.subjectId,
        subjectCode: subj?.subjectCode || bucket.subjectId,
        subjectName: subj?.subjectName || bucket.subjectId,
        grade: bucket.grade,
        level: bucket.level,
        expectedCount,
        validCount: stats.validCount,
        absentCount: bucket.absent,
        exemptCount: bucket.exempt,
        missingCount: Math.max(0, expectedCount - stats.validCount - bucket.absent - bucket.exempt),
        average: stats.average,
        median: stats.median,
        mode: stats.mode,
        rateGte7: stats.rateGte7,
        count10: stats.count10,
        stdDev: stats.stdDev,
        below5Count: stats.below5Count,
        below5Rate: stats.below5Rate,
        benchmarkScore: bm,
        benchmarkStatus: (bm !== null ? "CONFIGURED" : "UNCONFIGURED") as
          | "CONFIGURED"
          | "UNCONFIGURED",
        belowBenchmarkCount: belowBmCount,
        belowBenchmarkRate: belowBmRate,
        meetBenchmarkCount: meetCount,
        meetBenchmarkRate: meetRate,
        systemMeetBenchmarkRate: sysMeetRate,
        diffPp: computeDiffPp(meetRate, sysMeetRate),
      }
    })
    .sort((a, b) => a.grade.localeCompare(b.grade, "vi", { numeric: true }) || a.subjectName.localeCompare(b.subjectName, "vi"))

  // Build Heatmap
  const heatmapSubjectIds = Array.from(new Set(Array.from(cellMap.values()).map((c) => c.subjectId)))
  const heatmapSubjects = heatmapSubjectIds
    .map((id) => ({ id, subjectName: subjectMap.get(id)?.subjectName || id }))
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName, "vi"))

  const heatmapClasses = ctx.scopedClasses.map((c) => ({
    id: c.id,
    className: c.className,
    grade: c.grade,
  }))

  const heatmapCells: ClassSubjectHeatmapCell[] = Array.from(cellMap.values()).map((cell) => {
    const cls = scopedClassMap.get(cell.classId)!
    const subj = subjectMap.get(cell.subjectId)
    const stats = computeScoreStats(cell.scores)
    const bm = resolveBenchmarkScore(
      benchmarkItems,
      evaluationPeriod,
      cls.normalizedLevel,
      cls.grade,
      cell.subjectId
    )
    const meetRate =
      bm !== null && stats.validCount > 0
        ? round1((cell.scores.filter((s) => s >= bm).length / stats.validCount) * 100)
        : null
    const teacherName = teacherByClassSubject.get(`${cell.classId}::${cell.subjectId}`)?.teacherName || "Chưa phân công"

    return {
      classId: cell.classId,
      className: cls.className,
      grade: cls.grade,
      subjectId: cell.subjectId,
      subjectName: subj?.subjectName || cell.subjectId,
      teacherName,
      validCount: stats.validCount,
      expectedCount: classSizeMap.get(cell.classId) || 0,
      average: stats.average,
      meetBenchmarkRate: meetRate,
      benchmarkStatus: bm !== null ? "CONFIGURED" : "UNCONFIGURED",
    }
  })

  // Build 3-layer Score Distribution Comparison: Selected Class vs Same Grade at Campus vs Same Grade System-wide
  const targetClass =
    (ctx.classId !== "ALL" ? scopedClassMap.get(ctx.classId) : ctx.scopedClasses[0]) || null
  const targetGrade = ctx.grade !== "ALL" ? ctx.grade : targetClass?.grade || ""
  const targetSubjectId =
    ctx.subjectId !== "ALL"
      ? ctx.subjectId
      : subjectGradeRows[0]?.subjectId || ""
  const targetCampusId = targetClass?.campusId || (ctx.campusId !== "ALL" ? ctx.campusId : "")

  const classDistScores: number[] = []
  const campusGradeDistScores: number[] = []
  const systemGradeDistScores: number[] = []

  for (const g of periodGrades) {
    if (targetSubjectId && g.subjectId !== targetSubjectId) continue
    const cls = allClassMap.get(g.classId)
    if (!cls) continue
    if (targetGrade && cls.grade !== targetGrade) continue
    const parsed = parseRawStudentTestStatus({
      rawScoreVal: g.compositeScore,
      remarkText: g.remark,
      ratingText: g.ratingValue,
    })
    if (parsed.statusInTest !== "VALID_SCORE" || parsed.officialScore === null) continue

    systemGradeDistScores.push(parsed.officialScore)
    if (!targetCampusId || cls.campusId === targetCampusId) {
      campusGradeDistScores.push(parsed.officialScore)
    }
    if (targetClass && cls.id === targetClass.id) {
      classDistScores.push(parsed.officialScore)
    }
  }

  const distBm =
    targetClass && targetSubjectId
      ? resolveBenchmarkScore(
          benchmarkItems,
          evaluationPeriod,
          targetClass.normalizedLevel,
          targetGrade,
          targetSubjectId
        )
      : null

  const buildExtStats = (label: string, arr: number[]): ExtendedScoreStats => {
    const st = computeScoreStats(arr)
    const passRate =
      distBm !== null && st.validCount > 0
        ? round1((arr.filter((v) => v >= distBm).length / st.validCount) * 100)
        : null
    return {
      scopeLabel: label,
      validCount: st.validCount,
      average: st.average,
      median: st.median,
      mode: st.mode,
      rateGte7: st.rateGte7,
      count10: st.count10,
      stdDev: st.stdDev,
      skylinePassRate: passRate,
    }
  }

  const distributionComparison = {
    selectedClassLabel: targetClass ? `Lớp ${targetClass.className}` : "Phạm vi đang xem",
    selectedSubjectLabel: targetSubjectId
      ? subjectMap.get(targetSubjectId)?.subjectName || targetSubjectId
      : "Tất cả môn",
    selectedGradeLabel: targetGrade ? `Khối ${targetGrade}` : "Tất cả khối",
    buckets: buildScoreDistributionBuckets(
      classDistScores,
      campusGradeDistScores,
      systemGradeDistScores
    ),
    statsComparison: [
      buildExtStats(targetClass ? `Lớp ${targetClass.className}` : "Nhóm lớp đang xem", classDistScores),
      buildExtStats(
        targetGrade ? `Khối ${targetGrade} tại cơ sở` : "Toàn cơ sở",
        campusGradeDistScores
      ),
      buildExtStats(
        targetGrade ? `Khối ${targetGrade} toàn hệ thống` : "Toàn hệ thống",
        systemGradeDistScores
      ),
    ],
  }

  // Multi-period trend (GK1, CK1, GK2, CK2) with Matched Cohort mode
  const scopedYearGrades = allYearGrades.filter((g) => {
    if (!scopedClassMap.has(g.classId)) return false
    if (ctx.subjectId !== "ALL" && g.subjectId !== ctx.subjectId) return false
    if (ctx.publishedOnly && !isLocked(g.evaluationPeriod, g.classId, g.subjectId)) return false
    return true
  })

  const scoresByPeriodAndPair = new Map<EvaluationPeriodCode, Map<string, { score: number; bm: number | null }>>()
  for (const p of ALL_PERIODS) scoresByPeriodAndPair.set(p, new Map())

  for (const g of scopedYearGrades) {
    const p = g.evaluationPeriod as EvaluationPeriodCode
    if (!ALL_PERIODS.includes(p)) continue
    const cls = scopedClassMap.get(g.classId)
    if (!cls) continue
    const parsed = parseRawStudentTestStatus({
      rawScoreVal: g.compositeScore,
      remarkText: g.remark,
      ratingText: g.ratingValue,
    })
    if (parsed.statusInTest !== "VALID_SCORE" || parsed.officialScore === null) continue
    const bm = resolveBenchmarkScore(benchmarkItems, p, cls.normalizedLevel, cls.grade, g.subjectId)
    scoresByPeriodAndPair.get(p)!.set(`${g.studentId}::${g.subjectId}`, {
      score: parsed.officialScore,
      bm,
    })
  }

  // Matched cohort: student::subject pairs present in BOTH current period and previous period (or >=2 periods)
  const pairPeriodCount = new Map<string, number>()
  for (const p of ALL_PERIODS) {
    for (const k of scoresByPeriodAndPair.get(p)!.keys()) {
      pairPeriodCount.set(k, (pairPeriodCount.get(k) || 0) + 1)
    }
  }
  const matchedPairSet = new Set(
    Array.from(pairPeriodCount.entries())
      .filter(([, cnt]) => cnt >= 2)
      .map(([k]) => k)
  )

  const trendPoints: PeriodTrendPoint[] = ALL_PERIODS.map((p) => {
    const map = scoresByPeriodAndPair.get(p)!
    const entries = Array.from(map.entries())
      .filter(([k]) => (!ctx.matchedCohortOnly ? true : matchedPairSet.has(k)))
      .map(([, v]) => v)

    const scores = entries.map((e) => e.score)
    const st = computeScoreStats(scores)
    const configured = entries.filter((e) => e.bm !== null)
    const meetRate =
      configured.length > 0
        ? round1((configured.filter((e) => e.score >= e.bm!).length / configured.length) * 100)
        : null

    return {
      periodCode: p,
      periodLabel: PERIOD_LABELS[p],
      validCount: st.validCount,
      average: st.average,
      meetBenchmarkRate: meetRate,
      below5Rate: st.below5Rate,
      matchedCohortSize: ctx.matchedCohortOnly ? matchedPairSet.size : undefined,
    }
  })

  // Teacher × Subject × Class rows
  const teacherRows: TeacherSubjectClassRow[] = Array.from(teacherRowMap.entries())
    .map(([rowKey, r]) => {
      const cls = scopedClassMap.get(r.classId)!
      const subj = subjectMap.get(r.subjectId)
      const st = computeScoreStats(r.scores)
      const bm = resolveBenchmarkScore(
        benchmarkItems,
        evaluationPeriod,
        cls.normalizedLevel,
        cls.grade,
        r.subjectId
      )
      const meetRate =
        bm !== null && st.validCount > 0
          ? round1((r.scores.filter((s) => s >= bm).length / st.validCount) * 100)
          : null

      return {
        rowKey,
        teacherId: r.teacherId,
        teacherName: r.teacherName,
        subjectId: r.subjectId,
        subjectName: subj?.subjectName || r.subjectId,
        classId: r.classId,
        className: cls.className,
        grade: cls.grade,
        validCount: st.validCount,
        expectedCount: classSizeMap.get(r.classId) || 0,
        average: st.average,
        meetBenchmarkRate: meetRate,
        below5Count: st.below5Count,
        benchmarkScore: bm,
        benchmarkStatus: (bm !== null ? "CONFIGURED" : "UNCONFIGURED") as
          | "CONFIGURED"
          | "UNCONFIGURED",
      }
    })
    .sort((a, b) => a.teacherName.localeCompare(b.teacherName, "vi") || a.className.localeCompare(b.className, "vi"))

  // --- INTERNATIONAL SUBJECTS (CTQT + Intl Exam Certs) ---
  const internationalSubjects: InternationalSubjectRow[] = []

  // Group CTQT entries by program (class educationSystem) × subjectCode × grade
  const ctqtGroups = new Map<
    string,
    {
      program: string
      subjectCode: string
      grade: string
      scores: number[]
      classIds: Set<string>
    }
  >()

  for (const e of ctqtEntries) {
    const cls = scopedClassMap.get(e.classId)
    if (!cls) continue
    if (ctx.publishedOnly && e.reviewStatus !== "APPROVED") continue
    const val = e.gpaScore ?? e.endTermScore ?? e.midTermScore ?? e.ieltsScore
    if (val === null || val === undefined) continue
    const program = cls.educationSystem || "Chương trình Quốc tế (CTQT)"
    const key = `${program}::${e.subjectCode}::${cls.grade}`
    const g = ctqtGroups.get(key) || {
      program,
      subjectCode: e.subjectCode,
      grade: cls.grade,
      scores: [],
      classIds: new Set<string>(),
    }
    g.scores.push(val)
    g.classIds.add(e.classId)
    ctqtGroups.set(key, g)
  }

  for (const [rowKey, g] of ctqtGroups.entries()) {
    const isIelts = g.subjectCode === "IELTS"
    const targetVal = isIelts ? 6.0 : 70 // Original CTQT scale: 0..100 (or IELTS Band 0..9)
    const meetCount = g.scores.filter((s) => s >= targetVal).length
    const avg = g.scores.length > 0 ? round2(g.scores.reduce((a, b) => a + b, 0) / g.scores.length) : null
    const expectedCount = Array.from(g.classIds).reduce(
      (acc, cid) => acc + (classSizeMap.get(cid) || 0),
      0
    )

    // Competency skills breakdown for classes in this grade
    const compForClasses = ctqtCompetencies.filter((c) => g.classIds.has(c.classId))
    const skillsBreakdown: Array<{ skill: string; label: string; averageOrPass: string }> = []
    if (compForClasses.length > 0) {
      const skillFields: Array<[keyof (typeof compForClasses)[number], string]> = [
        ["communication", "Communication"],
        ["collaboration", "Collaboration"],
        ["criticalThinking", "Critical Thinking"],
        ["problemSolving", "Problem Solving"],
      ]
      for (const [field, label] of skillFields) {
        const vals = compForClasses.map((c) => String(c[field] || "")).filter(Boolean)
        if (vals.length > 0) {
          const good = vals.filter((v) => v === "E" || v === "S").length
          skillsBreakdown.push({
            skill: String(field),
            label,
            averageOrPass: `${round1((good / vals.length) * 100)}% E/S`,
          })
        }
      }
    }

    internationalSubjects.push({
      rowKey: `CTQT::${rowKey}`,
      program: g.program,
      subjectCode: g.subjectCode,
      subjectName: CTQT_SUBJECT_NAMES[g.subjectCode] || g.subjectCode,
      grade: g.grade,
      scaleLabel: isIelts ? "IELTS Band (0–9,0)" : "Thang 100 điểm (CTQT)",
      resultCount: g.scores.length,
      expectedCount,
      targetRuleLabel: isIelts ? "Band ≥ 6,0" : "≥ 70/100",
      meetTargetCount: meetCount,
      meetTargetRate: g.scores.length > 0 ? round1((meetCount / g.scores.length) * 100) : null,
      belowTargetCount: g.scores.length - meetCount,
      averageScore: avg,
      skillsBreakdown,
      sourceType: "INTERNAL_CTQT",
    })
  }

  // Group International Exams by examFamily × examType × grade
  const scopedIntl = intlResults.filter((r) => {
    if (r.sittingStatus === "ABSENT" || r.sittingStatus === "WITHDRAWN") return false
    if (
      ctx.allowedCampusFilter &&
      r.campusIdSnapshot &&
      !ctx.allowedCampusFilter.includes(r.campusIdSnapshot)
    ) {
      return false
    }
    if (ctx.grade !== "ALL" && r.gradeSnapshot && r.gradeSnapshot !== ctx.grade) return false
    if (ctx.classId !== "ALL" && r.classIdSnapshot && r.classIdSnapshot !== ctx.classId) return false
    if (!matchesLevelFilter(undefined, r.gradeSnapshot, ctx.level)) return false
    return true
  })

  const intlGroups = new Map<string, typeof scopedIntl>()
  for (const r of scopedIntl) {
    const key = `${r.examFamily}::${r.examType}::${r.gradeSnapshot || "ALL"}`
    const list = intlGroups.get(key) || []
    list.push(r)
    intlGroups.set(key, list)
  }

  for (const [key, list] of intlGroups.entries()) {
    const sample = list[0]
    const isYle = sample.examFamily === "CAMBRIDGE_YLE"
    const isIelts = sample.examFamily === "IELTS"
    const isMain = sample.examFamily === "CAMBRIDGE_MAIN"

    const meetCount = list.filter((r) => {
      if (isYle) return Boolean(r.yleMeetsInternalTarget)
      if (isMain) return Boolean(r.camMeetsTargetLevel)
      if (isIelts) return (r.ieltsOverallBand || 0) >= 6.0
      return r.skillResults.some((s) => Boolean(s.isHighOutstanding))
    }).length

    const numericVals = list
      .map((r) => (isYle ? r.yleTotalShields : isMain ? r.camOverallScale : r.ieltsOverallBand))
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v))

    // Aggregate skill breakdown from IntlExamSkillResult
    const skillMap = new Map<string, { label: string; vals: number[] }>()
    for (const r of list) {
      for (const sk of r.skillResults) {
        if (sk.numericScore === null || sk.numericScore === undefined) continue
        const bucket = skillMap.get(sk.componentCode) || { label: sk.componentName, vals: [] }
        bucket.vals.push(sk.numericScore)
        skillMap.set(sk.componentCode, bucket)
      }
    }

    internationalSubjects.push({
      rowKey: `INTL::${key}`,
      program: sample.examFamily.replace(/_/g, " "),
      subjectCode: sample.examType,
      subjectName: `${sample.examType} (${sample.examFamily.replace(/_/g, " ")})`,
      grade: sample.gradeSnapshot || "Liên khối",
      scaleLabel: isYle
        ? "Khiên (0–15)"
        : isMain
          ? "Cambridge Scale"
          : isIelts
            ? "IELTS Band (0–9,0)"
            : "Thang chuẩn quốc tế",
      resultCount: list.length,
      expectedCount: list.length,
      targetRuleLabel: isYle
        ? "Đạt mục tiêu Sky-Line"
        : isMain
          ? "Đạt khung CEFR mục tiêu"
          : isIelts
            ? "Band ≥ 6,0"
            : "High / Outstanding",
      meetTargetCount: meetCount,
      meetTargetRate: list.length > 0 ? round1((meetCount / list.length) * 100) : null,
      belowTargetCount: list.length - meetCount,
      averageScore:
        numericVals.length > 0
          ? round2(numericVals.reduce((a, b) => a + b, 0) / numericVals.length)
          : null,
      skillsBreakdown: Array.from(skillMap.entries()).map(([code, sk]) => ({
        skill: code,
        label: sk.label,
        averageOrPass: `${round2(sk.vals.reduce((a, b) => a + b, 0) / sk.vals.length)}`,
      })),
      sourceType: "INTL_EXAM_CERT",
      linkedExamFamily: sample.examFamily,
    })
  }

  return {
    periodLabel: ctx.evaluationPeriodLabel,
    publishedOnly: ctx.publishedOnly,
    subjectGradeRows,
    heatmap: {
      classes: heatmapClasses,
      subjects: heatmapSubjects,
      cells: heatmapCells,
    },
    distributionComparison,
    periodTrend: {
      matchedCohortOnly: ctx.matchedCohortOnly,
      matchedPairCount: matchedPairSet.size,
      points: trendPoints,
    },
    teacherRows,
    internationalSubjects,
  }
}
