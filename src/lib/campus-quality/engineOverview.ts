import { prisma } from "@/lib/db"
import { parseRawStudentTestStatus } from "@/lib/ktdbcl/thkqPeriodicReportEngine"
import { generateEntranceCommitmentReport } from "@/lib/ktdbcl/entranceCommitmentReportEngine"
import { ResolvedDashboardContext, resolveBenchmarkScore } from "./baseContext"
import {
  computeDiffPp,
  computeNextReviewDate,
  formatMonthLabel,
  isApprovedAdmissionPass,
  isConfirmedEnrollment,
  isDateInMonth,
  isInternalSkylineTransfer,
  matchesLevelFilter,
  normalizePsychologyOutcome,
  round1,
  toMonthKey,
} from "./stats"
import {
  CampusQualityAccessScope,
  MonthlyMobilityPoint,
  OverviewPayload,
} from "./types"

function extractValidScore(entry: {
  compositeScore: number | null
  ratingValue: string | null
  remark: string | null
}): { status: "VALID_SCORE" | "ABSENT_MAKEUP" | "EXEMPT" | "MISSING_SCORE" | "OUT_OF_RANGE"; score: number | null } {
  const parsed = parseRawStudentTestStatus({
    rawScoreVal: entry.compositeScore,
    remarkText: entry.remark,
    ratingText: entry.ratingValue,
  })
  return {
    status: parsed.statusInTest,
    score: parsed.statusInTest === "VALID_SCORE" ? parsed.officialScore : null,
  }
}

export async function getCampusQualityOverview(
  ctx: ResolvedDashboardContext,
  scope: CampusQualityAccessScope
): Promise<OverviewPayload> {
  const { academicYearId, scopedClassIds, allYearClasses, evaluationPeriod, monthKey } = ctx
  const scopedClassMap = new Map(ctx.scopedClasses.map((c) => [c.id, c]))
  const allClassMap = new Map(allYearClasses.map((c) => [c.id, c]))

  const campusIdFilter = ctx.allowedCampusFilter ? { in: ctx.allowedCampusFilter } : undefined
  const classIdFilter = scopedClassIds.length > 0 ? { in: scopedClassIds } : { in: ["__NONE__"] }

  // Parallel read-only queries on real SSM data
  const [
    activeStudents,
    transfers,
    monthlySnapshots,
    benchmarks,
    gradeLocks,
    allPeriodGrades,
    teachingAssignments,
    ctqtEntriesCount,
    k12Admissions,
    preschoolAdmissions,
    domesticExams,
    domesticAchievements,
    intlResults,
    intlCerts,
    teachersInScope,
    teacherTargets,
    obsSlotsInMonth,
    psychTargets,
    commitmentReport,
  ] = await Promise.all([
    prisma.student.findMany({
      where: {
        academicYearId,
        status: "ACTIVE",
        classId: classIdFilter,
      },
      select: { id: true, studentCode: true, classId: true, campusId: true },
    }),
    prisma.studentTransfer.findMany({
      where: {
        student: { academicYearId },
      },
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            classId: true,
            campusId: true,
            class: { select: { grade: true, level: true } },
          },
        },
      },
    }),
    prisma.monthlyEnrollmentSnapshot.findMany({
      where: {
        academicYearId,
        ...(ctx.campusId !== "ALL" ? { campusId: ctx.campusId } : {}),
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
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
      where: { academicYearId, evaluationPeriod, isLocked: true },
      select: { classId: true, subjectId: true },
    }),
    prisma.subjectGradeEntry.findMany({
      where: { academicYearId, evaluationPeriod },
      select: {
        studentId: true,
        subjectId: true,
        classId: true,
        compositeScore: true,
        ratingValue: true,
        remark: true,
      },
    }),
    prisma.teachingAssignment.findMany({
      where: {
        academicYearId,
        classId: classIdFilter,
        semester: evaluationPeriod.endsWith("2") ? 2 : 1,
      },
      select: { classId: true, subjectId: true, teacherId: true },
    }),
    prisma.ctqtGradeEntry.count({
      where: {
        academicYearId,
        classId: classIdFilter,
      },
    }),
    prisma.inputAssessmentStudent.findMany({
      where: {
        period: {
          academicYearId,
          ...(campusIdFilter ? { campusId: campusIdFilter } : {}),
        },
      },
      select: {
        id: true,
        grade: true,
        isAbsent: true,
        admissionResult: true,
        enrollmentStatus: true,
        enrollmentClassId: true,
        enrollmentDate: true,
        createdAt: true,
        updatedAt: true,
        period: { select: { campusId: true } },
        batch: { select: { campusId: true, startDate: true } },
      },
    }),
    prisma.preschoolInputAssessmentStudent.findMany({
      where: {
        period: {
          academicYearId,
          ...(campusIdFilter ? { campusId: campusIdFilter } : {}),
        },
      },
      select: {
        id: true,
        grade: true,
        isAbsent: true,
        admissionResult: true,
        enrollmentStatus: true,
        enrollmentClassId: true,
        enrollmentDate: true,
        createdAt: true,
        updatedAt: true,
        period: { select: { campusId: true } },
        batch: { select: { campusId: true, startDate: true } },
      },
    }),
    prisma.examStudent.findMany({
      where: {
        exam: { academicYearId },
        student: { classId: classIdFilter },
      },
      select: { studentId: true, examId: true },
    }),
    prisma.studentAchievement.findMany({
      where: {
        achievement: { academicYearId },
        student: { classId: classIdFilter },
      },
      select: { studentId: true, achievementId: true },
    }),
    prisma.intlExamResult.findMany({
      where: {
        session: {
          OR: [{ academicYearId }, { academicYearText: ctx.academicYearName }],
        },
      },
      select: {
        id: true,
        studentId: true,
        campusIdSnapshot: true,
        gradeSnapshot: true,
        classIdSnapshot: true,
        sittingStatus: true,
        yleMeetsInternalTarget: true,
        camMeetsTargetLevel: true,
        camAwardedCertificate: true,
        ieltsOverallBand: true,
      },
    }),
    prisma.intlCertificateRecord.findMany({
      where: {
        certificateStatus: { in: ["RECEIVED_AT_SCHOOL", "ISSUED_TO_STUDENT", "DIGITAL_VERIFIED"] },
        result: {
          session: {
            OR: [{ academicYearId }, { academicYearText: ctx.academicYearName }],
          },
        },
      },
      select: {
        id: true,
        result: {
          select: { campusIdSnapshot: true, gradeSnapshot: true, classIdSnapshot: true },
        },
      },
    }),
    prisma.teacher.findMany({
      where: {
        status: "ACTIVE",
        ...(campusIdFilter ? { campusId: campusIdFilter } : {}),
        ...(scope.roleTier === "DEPARTMENT_HEAD" && scope.assignedDepartmentIds.length > 0
          ? { departmentId: { in: scope.assignedDepartmentIds } }
          : {}),
        ...(scope.roleTier === "TEACHER_SCOPED" && scope.teacherId ? { id: scope.teacherId } : {}),
      },
      select: { id: true, teacherName: true, campusId: true, departmentId: true },
    }),
    prisma.teacherAcademicYearTarget.findMany({
      where: { academicYearId },
      select: { teacherId: true, requiredTaught: true, requiredObserved: true },
    }),
    prisma.observationSlot.findMany({
      where: {
        academicYearId,
        ...(campusIdFilter ? { campusId: campusIdFilter } : {}),
      },
      include: {
        registrations: {
          include: { evaluation: true },
        },
      },
    }),
    scope.canViewPsychology
      ? prisma.learningSupportTarget.findMany({
          where: {
            academicYearId,
            supportType: "PSYCHOLOGICAL",
            student: { classId: classIdFilter },
          },
          include: {
            assignments: { select: { teacherId: true } },
            evaluations: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        })
      : Promise.resolve([]),
    generateEntranceCommitmentReport(
      {
        academicYearId,
        campusId: ctx.campusId !== "ALL" ? ctx.campusId : undefined,
        classId: ctx.classId !== "ALL" ? ctx.classId : undefined,
      },
      scope
    ).catch(() => null),
  ])

  // --- 1. SCALE & MOBILITY ---
  // Detect paired internal transfers (same studentCode has both OUT and IN within 30 days)
  const transfersByStudentCode = new Map<string, typeof transfers>()
  for (const t of transfers) {
    const code = t.student?.studentCode || t.studentId
    const list = transfersByStudentCode.get(code) || []
    list.push(t)
    transfersByStudentCode.set(code, list)
  }

  const isPairedTransfer = (t: (typeof transfers)[number]) => {
    const code = t.student?.studentCode || t.studentId
    const siblings = transfersByStudentCode.get(code) || []
    const opp = t.type === "OUT" ? "IN" : t.type === "IN" ? "OUT" : ""
    if (!opp) return false
    return siblings.some(
      (s) =>
        s.id !== t.id &&
        s.type === opp &&
        Math.abs(s.transferDate.getTime() - t.transferDate.getTime()) <= 31 * 86400000
    )
  }

  let transferredInInternal = 0
  let transferredInExternal = 0
  let transferredOutInternal = 0
  let transferredOutExternal = 0
  let systemInternalIn = 0
  let systemInternalOut = 0

  const monthMap = new Map<string, MonthlyMobilityPoint>()
  for (const m of ctx.availableFilters.months) {
    monthMap.set(m.value, {
      monthKey: m.value,
      monthLabel: m.label,
      newEnrollments: 0,
      transferredInExternal: 0,
      transferredInInternal: 0,
      transferredOutExternal: 0,
      transferredOutInternal: 0,
      totalIn: 0,
      totalOut: 0,
      netChange: 0,
      closingHeadcount: null,
      cumulativeNew: 0,
      cumulativeIn: 0,
      cumulativeOut: 0,
    })
  }

  for (const t of transfers) {
    if (t.type !== "IN" && t.type !== "OUT") continue
    const internal = isInternalSkylineTransfer(t.destinationSchool, t.reason, isPairedTransfer(t))
    if (internal) {
      if (t.type === "IN") systemInternalIn++
      if (t.type === "OUT") systemInternalOut++
    }

    const st = t.student
    const inCampusScope =
      !ctx.allowedCampusFilter || (st?.campusId && ctx.allowedCampusFilter.includes(st.campusId))
    const inClassScope = ctx.classId === "ALL" || st?.classId === ctx.classId
    const inLevelScope = matchesLevelFilter(st?.class?.level, st?.class?.grade, ctx.level)
    const inGradeScope = ctx.grade === "ALL" || st?.class?.grade === ctx.grade
    if (!inCampusScope || !inClassScope || !inLevelScope || !inGradeScope) continue

    const mk = toMonthKey(t.transferDate)
    const pt = monthMap.get(mk)
    if (t.type === "IN") {
      if (internal) {
        transferredInInternal++
        if (pt) pt.transferredInInternal++
      } else {
        transferredInExternal++
        if (pt) pt.transferredInExternal++
      }
    } else {
      if (internal) {
        transferredOutInternal++
        if (pt) pt.transferredOutInternal++
      } else {
        transferredOutExternal++
        if (pt) pt.transferredOutExternal++
      }
    }
  }

  // Admissions filtering by level/grade/campus
  const combinedAdmissions = [
    ...k12Admissions.map((a) => ({ ...a, block: "K12" as const })),
    ...preschoolAdmissions.map((a) => ({ ...a, block: "MAM_NON" as const })),
  ].filter((a) => {
    const lvl = a.block === "MAM_NON" ? "MAM_NON" : undefined
    if (!matchesLevelFilter(lvl, a.grade, ctx.level)) return false
    if (ctx.grade !== "ALL" && String(a.grade || "").trim() !== ctx.grade) return false
    return true
  })

  let surveyedCount = 0
  let passedCount = 0
  let enrolledCount = 0
  let pendingCurrentMonthCount = 0

  for (const adm of combinedAdmissions) {
    if (!adm.isAbsent) surveyedCount++
    const st = isApprovedAdmissionPass(adm.admissionResult)
    if (st.isPassed) passedCount++

    const enrolled = isConfirmedEnrollment(
      adm.enrollmentStatus,
      adm.enrollmentClassId,
      adm.enrollmentDate
    )
    if (enrolled) {
      enrolledCount++
      const effDate = adm.enrollmentDate || adm.updatedAt
      const mk = toMonthKey(effDate)
      const pt = monthMap.get(mk)
      if (pt) pt.newEnrollments++
    }

    // Current system month pending entrance records
    const refDate = adm.batch?.startDate || adm.createdAt
    if (!adm.isAbsent && st.isPending && isDateInMonth(refDate, ctx.currentSystemMonthKey)) {
      pendingCurrentMonthCount++
    }
  }

  // Attach closing headcount from MonthlyEnrollmentSnapshot when available
  const snapshotByMonth = new Map<string, number>()
  for (const snap of monthlySnapshots) {
    const mk = `${snap.year}-${String(snap.month).padStart(2, "0")}`
    snapshotByMonth.set(mk, (snapshotByMonth.get(mk) || 0) + snap.closingCount)
  }

  let cumNew = 0
  let cumIn = 0
  let cumOut = 0
  const monthlySeries: MonthlyMobilityPoint[] = Array.from(monthMap.values())
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map((pt) => {
      const totalIn = pt.transferredInExternal + pt.transferredInInternal
      const totalOut = pt.transferredOutExternal + pt.transferredOutInternal
      cumNew += pt.newEnrollments
      cumIn += totalIn
      cumOut += totalOut
      return {
        ...pt,
        totalIn,
        totalOut,
        netChange: pt.newEnrollments + totalIn - totalOut,
        closingHeadcount: snapshotByMonth.get(pt.monthKey) ?? null,
        cumulativeNew: cumNew,
        cumulativeIn: cumIn,
        cumulativeOut: cumOut,
      }
    })

  // --- 2. ACADEMIC QUALITY ---
  const benchmarkItems = benchmarks.map((b) => ({
    evaluationPeriod: b.evaluationPeriod,
    level: b.level || "ALL",
    grade: b.grade || "ALL",
    subjectId: b.subjectId || "ALL",
    benchmarkScore: b.benchmarkScore,
  }))

  const isLockedPair = (classId: string, subjectId: string) =>
    gradeLocks.some(
      (l) =>
        (l.classId === "ALL" || l.classId === classId) &&
        (l.subjectId === "ALL" || l.subjectId === subjectId)
    )

  let validScoreCount = 0
  let absentCount = 0
  let exemptCount = 0
  let meetBenchmarkCount = 0
  let configuredValidCount = 0
  let sysMeetBenchmarkCount = 0
  let sysConfiguredValidCount = 0

  const belowBenchmarkStudentSet = new Set<string>()
  const belowAverageStudentSet = new Set<string>()
  const unconfiguredSubjectSet = new Set<string>()
  const classSubjectValidCounts = new Map<string, number>()

  for (const entry of allPeriodGrades) {
    const cls = allClassMap.get(entry.classId)
    if (!cls) continue
    if (ctx.subjectId !== "ALL" && entry.subjectId !== ctx.subjectId) continue
    if (ctx.publishedOnly && !isLockedPair(entry.classId, entry.subjectId)) continue

    const parsed = extractValidScore(entry)
    const bm = resolveBenchmarkScore(
      benchmarkItems,
      evaluationPeriod,
      cls.normalizedLevel,
      cls.grade,
      entry.subjectId
    )

    // System comparison pool (same level/grade/subject filter, all campuses including current)
    const matchesSystemComparison =
      matchesLevelFilter(cls.level, cls.grade, ctx.level) &&
      (ctx.grade === "ALL" || cls.grade === ctx.grade)

    if (matchesSystemComparison && parsed.status === "VALID_SCORE" && parsed.score !== null && bm !== null) {
      sysConfiguredValidCount++
      if (parsed.score >= bm) sysMeetBenchmarkCount++
    }

    // Current scoped pool
    if (!scopedClassMap.has(entry.classId)) continue

    const pairKey = `${entry.classId}::${entry.subjectId}`
    if (parsed.status === "VALID_SCORE" && parsed.score !== null) {
      validScoreCount++
      classSubjectValidCounts.set(pairKey, (classSubjectValidCounts.get(pairKey) || 0) + 1)
      if (parsed.score < 5.0) {
        belowAverageStudentSet.add(entry.studentId)
      }
      if (bm === null) {
        unconfiguredSubjectSet.add(entry.subjectId)
      } else {
        configuredValidCount++
        if (parsed.score >= bm) {
          meetBenchmarkCount++
        } else {
          belowBenchmarkStudentSet.add(entry.studentId)
        }
      }
    } else if (parsed.status === "ABSENT_MAKEUP") {
      absentCount++
    } else if (parsed.status === "EXEMPT") {
      exemptCount++
    }
  }

  // Expected class × subject pairs & incomplete classes
  const activeCountByClass = new Map<string, number>()
  for (const st of activeStudents) {
    activeCountByClass.set(st.classId, (activeCountByClass.get(st.classId) || 0) + 1)
  }

  let expectedScoreCount = 0
  let publishedPairs = 0
  const incompleteClassSet = new Set<string>()
  let missingEntriesTotal = 0

  const uniqueAssignPairs = new Map<string, { classId: string; subjectId: string }>()
  for (const ta of teachingAssignments) {
    if (ctx.subjectId !== "ALL" && ta.subjectId !== ctx.subjectId) continue
    uniqueAssignPairs.set(`${ta.classId}::${ta.subjectId}`, {
      classId: ta.classId,
      subjectId: ta.subjectId,
    })
  }

  for (const [pairKey, pair] of uniqueAssignPairs.entries()) {
    const classSize = activeCountByClass.get(pair.classId) || 0
    expectedScoreCount += classSize
    if (isLockedPair(pair.classId, pair.subjectId)) publishedPairs++
    const got = classSubjectValidCounts.get(pairKey) || 0
    if (classSize > 0 && got < classSize) {
      incompleteClassSet.add(pair.classId)
      missingEntriesTotal += Math.max(0, classSize - got)
    }
  }

  const skylinePassRate =
    configuredValidCount > 0 ? round1((meetBenchmarkCount / configuredValidCount) * 100) : null
  const systemSkylinePassRate =
    sysConfiguredValidCount > 0
      ? round1((sysMeetBenchmarkCount / sysConfiguredValidCount) * 100)
      : null

  // --- 4. ACHIEVEMENTS & CERTS ---
  const scopedIntlResults = intlResults.filter((r) => {
    if (
      ctx.allowedCampusFilter &&
      r.campusIdSnapshot &&
      !ctx.allowedCampusFilter.includes(r.campusIdSnapshot)
    ) {
      return false
    }
    if (ctx.grade !== "ALL" && r.gradeSnapshot && r.gradeSnapshot !== ctx.grade) return false
    if (ctx.classId !== "ALL" && r.classIdSnapshot && r.classIdSnapshot !== ctx.classId) return false
    return true
  })

  const scopedIntlCerts = intlCerts.filter((c) => {
    const r = c.result
    if (
      ctx.allowedCampusFilter &&
      r.campusIdSnapshot &&
      !ctx.allowedCampusFilter.includes(r.campusIdSnapshot)
    ) {
      return false
    }
    if (ctx.grade !== "ALL" && r.gradeSnapshot && r.gradeSnapshot !== ctx.grade) return false
    if (ctx.classId !== "ALL" && r.classIdSnapshot && r.classIdSnapshot !== ctx.classId) return false
    return true
  })

  const participantSet = new Set<string>()
  for (const es of domesticExams) participantSet.add(es.studentId)
  for (const ir of scopedIntlResults) {
    if (ir.sittingStatus !== "ABSENT" && ir.sittingStatus !== "WITHDRAWN") {
      participantSet.add(ir.studentId || ir.id)
    }
  }

  const awardedStudentSet = new Set<string>()
  for (const sa of domesticAchievements) awardedStudentSet.add(sa.studentId)
  let intlAwardCount = 0
  for (const ir of scopedIntlResults) {
    if (ir.yleMeetsInternalTarget || ir.camMeetsTargetLevel || (ir.ieltsOverallBand && ir.ieltsOverallBand >= 5.5)) {
      awardedStudentSet.add(ir.studentId || ir.id)
      intlAwardCount++
    }
  }

  // --- 5. OBSERVATION & GROWTH (BY MONTH) ---
  const teacherIdsInScope = new Set(teachersInScope.map((t) => t.id))
  const targetsByTeacher = new Map(teacherTargets.map((t) => [t.teacherId, t]))

  let plannedLessons = 0
  let plannedTeachers = 0
  for (const t of teachersInScope) {
    const tg = targetsByTeacher.get(t.id)
    const req = tg?.requiredTaught || 0
    if (req > 0) {
      plannedLessons += req
      plannedTeachers++
    }
  }
  if (plannedTeachers === 0) plannedTeachers = teachersInScope.length

  const monthSlots = obsSlotsInMonth.filter(
    (s) =>
      isDateInMonth(s.date, monthKey) &&
      teacherIdsInScope.has(s.teacherId) &&
      matchesLevelFilter(s.level, s.grade, ctx.level) &&
      (ctx.grade === "ALL" || s.grade === ctx.grade) &&
      (ctx.classId === "ALL" || !s.classId || s.classId === ctx.classId)
  )

  const observedTeacherSet = new Set<string>()
  const evaluatedTeacherSet = new Set<string>()
  const compliantTeacherSet = new Set<string>()
  let observedLessons = 0
  let pendingReviewForms = 0

  for (const slot of monthSlots) {
    const approvedRegs = slot.registrations.filter((r) => r.isApproved)
    const unapprovedRegs = slot.registrations.filter((r) => !r.isApproved)
    pendingReviewForms += unapprovedRegs.length

    const approvedEvals = approvedRegs
      .map((r) => r.evaluation)
      .filter((e): e is NonNullable<typeof e> => Boolean(e))

    for (const ev of approvedEvals) {
      if (ev.reEvaluationStatus === "PENDING" || ev.supplementalStatus === "PENDING") {
        pendingReviewForms++
      }
    }

    if (approvedEvals.length > 0 || slot.status === "COMPLETED") {
      observedLessons++
      observedTeacherSet.add(slot.teacherId)
    }

    const finalApprovedEvals = approvedEvals.filter((e) => e.reEvaluationStatus !== "DRAFT")
    if (finalApprovedEvals.length > 0) {
      evaluatedTeacherSet.add(slot.teacherId)
      const isCompliant = finalApprovedEvals.every((ev) => {
        if (ev.overallRating) {
          return ["Tốt", "Khá", "Đạt", "Giỏi"].some((k) =>
            ev.overallRating!.toLowerCase().includes(k.toLowerCase())
          )
        }
        if (ev.totalScore !== null && ev.totalScore !== undefined) {
          return ev.totalScore >= 14
        }
        return true
      })
      if (isCompliant) compliantTeacherSet.add(slot.teacherId)
    }
  }

  const unobservedTeachersCount = Math.max(0, teachersInScope.length - observedTeacherSet.size)

  // --- 6. PSYCHOLOGY TRACKING (BY MONTH) ---
  let psychActive = 0
  let psychDue = 0
  let psychAchieved = 0
  const psychOwnerSet = new Set<string>()

  for (const target of psychTargets) {
    const latestEval = target.evaluations[0] || null
    const outcome = normalizePsychologyOutcome(
      target.outcome,
      latestEval?.trackingLevel,
      target.terminationStatus
    )
    for (const a of target.assignments) psychOwnerSet.add(a.teacherId)

    if (outcome.isGoalAchieved) {
      if (
        isDateInMonth(target.terminationApprovedAt || latestEval?.createdAt || target.updatedAt, monthKey)
      ) {
        psychAchieved++
      }
    } else if (target.status === "ACTIVE" && target.terminationStatus !== "TERMINATED") {
      psychActive++
      const nextReview = computeNextReviewDate(
        target.startDate,
        latestEval?.createdAt || null,
        latestEval?.periodType
      )
      if (isDateInMonth(nextReview, monthKey) || nextReview <= new Date()) {
        psychDue++
      }
    }
  }

  return {
    timeContext: {
      academicYearLabel: ctx.academicYearName,
      evaluationPeriodCode: ctx.evaluationPeriod,
      evaluationPeriodLabel: ctx.evaluationPeriodLabel,
      monthKey: ctx.monthKey,
      monthLabel: ctx.monthLabel,
      currentSystemMonthLabel: ctx.currentSystemMonthLabel,
    },
    scaleAndMobility: {
      activeStudents: activeStudents.length,
      totalClasses: ctx.scopedClasses.length,
      newEnrollments: enrolledCount,
      transferredIn: transferredInExternal + transferredInInternal,
      transferredInInternal,
      transferredInExternal,
      transferredOut: transferredOutExternal + transferredOutInternal,
      transferredOutInternal,
      transferredOutExternal,
      systemInternalNetCheck: systemInternalIn - systemInternalOut,
      commitmentStudents: commitmentReport?.summary?.totalDistinctStudents || 0,
      monthlySeries,
    },
    academicQuality: {
      periodLabel: ctx.evaluationPeriodLabel,
      publishedClassSubjectPairs: publishedPairs,
      totalExpectedClassSubjectPairs: uniqueAssignPairs.size,
      validScoreCount,
      expectedScoreCount,
      absentCount,
      exemptCount,
      missingCount: Math.max(0, expectedScoreCount - validScoreCount - absentCount - exemptCount),
      skylinePassRate,
      systemSkylinePassRate,
      skylineDiffPp: computeDiffPp(skylinePassRate, systemSkylinePassRate),
      belowBenchmarkStudents: belowBenchmarkStudentSet.size,
      belowAverageStudents: belowAverageStudentSet.size,
      unconfiguredBenchmarkSubjects: unconfiguredSubjectSet.size,
      internationalSubjectsCount: ctqtEntriesCount,
    },
    admissionsAndEntrance: {
      scopeLabel: `Năm học ${ctx.academicYearName}`,
      surveyedCount,
      passedCount,
      enrolledCount,
      passRate: surveyedCount > 0 ? round1((passedCount / surveyedCount) * 100) : null,
      enrollmentRate: passedCount > 0 ? round1((enrolledCount / passedCount) * 100) : null,
    },
    achievementsAndCerts: {
      scopeLabel: `Năm học ${ctx.academicYearName}`,
      examParticipants: participantSet.size,
      examSittings: domesticExams.length + scopedIntlResults.length,
      awardedStudents: awardedStudentSet.size,
      totalAwards: domesticAchievements.length + intlAwardCount,
      certificatesIssued: scopedIntlCerts.length,
    },
    observationAndGrowth: {
      monthLabel: ctx.monthLabel,
      observedLessons,
      plannedLessons,
      observedTeachers: observedTeacherSet.size,
      plannedTeachers,
      unobservedTeachers: unobservedTeachersCount,
      compliantTeachers: compliantTeacherSet.size,
      evaluatedTeachers: evaluatedTeacherSet.size,
      pendingReviewForms,
    },
    psychologyTracking: {
      monthLabel: ctx.monthLabel,
      canView: scope.canViewPsychology,
      activeTracking: psychActive,
      dueForReview: psychDue,
      achievedGoal: psychAchieved,
      ownerCount: psychOwnerSet.size,
    },
    actionQueue: {
      pendingEntranceCurrentMonth: {
        monthLabel: ctx.currentSystemMonthLabel,
        count: pendingCurrentMonthCount,
      },
      incompleteGradeClasses: {
        count: incompleteClassSet.size,
        missingEntries: missingEntriesTotal,
      },
      unobservedTeachers: {
        monthLabel: formatMonthLabel(ctx.monthKey),
        count: unobservedTeachersCount,
      },
    },
  }
}
