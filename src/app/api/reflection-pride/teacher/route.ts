import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { resolveAdvisoryCaller } from "@/lib/advisory/rbac-guard"
import { ensureReflectionPrideTables } from "@/lib/reflection-pride/db-sync"
import {
  ALL_14_CRITERIA,
  CRITERIA_VERSION_2026,
  DEFAULT_MIN_NPS_ANON_SAMPLE,
  IP21_DEFAULT_PASS_THRESHOLD_PERCENT,
  IP21_DEFAULT_TARGET_RATE_PERCENT,
  PRIDE_NPS_DRIVERS,
  RUBRIC_SCALE_LEVELS,
  SKYLINE_5_QUALITIES_CATALOG,
  aggregatePrideNpsFromRawResponses,
  calculateStudentQualityScoresFromRatings,
  isEligibleGrade4To12,
  parseStudentGradeNumber
} from "@/lib/reflection-pride/catalog-and-engine"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  return res
}

function safeJsonParse(raw: any, fallback: any) {
  if (!raw) return fallback
  if (typeof raw === "object") return raw
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

async function getTeacherAllowedClasses(caller: any, academicYearId: string) {
  if (caller.actorRole === "ADMIN") {
    const whereClause: any = {
      status: "ACTIVE",
      ...(academicYearId ? { academicYearId } : {}),
      ...(!caller.isFullAdmin && caller.campusIds?.length > 0
        ? { campusId: { in: caller.campusIds } }
        : {})
    }
    const allClasses = await prisma.class.findMany({
      where: whereClause,
      include: { campus: true, academicYear: true },
      orderBy: { className: "asc" }
    })
    return allClasses.filter(c => isEligibleGrade4To12(c.grade, c.className))
  }

  const teacher = await prisma.teacher.findFirst({
    where: {
      OR: [{ id: caller.teacherId || "" }, { userId: caller.userId || "" }]
    }
  })

  if (!teacher) return []

  const classes = await prisma.class.findMany({
    where: {
      ...(academicYearId ? { academicYearId } : {}),
      OR: [
        { homeroomTeacherId: teacher.id },
        { homeroomTeacherId: { contains: teacher.id } },
        ...(teacher.homeroomClass ? [{ className: teacher.homeroomClass }] : []),
        {
          teachers: {
            some: {
              teacherId: teacher.id
            }
          }
        }
      ]
    },
    include: { campus: true, academicYear: true },
    orderBy: { className: "asc" }
  })

  return classes.filter(c => isEligibleGrade4To12(c.grade, c.className))
}

export async function GET(req: Request) {
  try {
    await ensureReflectionPrideTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated || (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN")) {
      return jsonResponse({ error: "Không có quyền truy cập phân hệ Giáo viên Chủ nhiệm." }, 403)
    }

    const { searchParams } = new URL(req.url)
    let academicYearId = searchParams.get("academicYearId") || ""
    const requestedClassId = searchParams.get("classId") || ""
    const requestedPeriodId = searchParams.get("periodId") || ""

    const academicYears = await prisma.academicYear.findMany({
      where: { isOff: false },
      orderBy: { startDate: "desc" }
    })

    if (!academicYearId) {
      const activeAy = academicYears.find(y => y.status === "ACTIVE") || academicYears[0]
      academicYearId = activeAy?.id || ""
    }

    let allowedClasses = await getTeacherAllowedClasses(caller, academicYearId)
    if (allowedClasses.length === 0 && academicYearId) {
      // Fallback: check across all academic years if teacher's class is in another year record
      allowedClasses = await getTeacherAllowedClasses(caller, "")
      if (allowedClasses.length > 0 && !searchParams.get("academicYearId")) {
        academicYearId = allowedClasses[0].academicYearId
      }
    }

    const selectedClass =
      (requestedClassId ? allowedClasses.find(c => c.id === requestedClassId) : null) ||
      allowedClasses[0] ||
      null

    // Fetch periods for academic year (or all periods)
    const periodRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "reflection_pride_periods"
       ORDER BY "createdAt" DESC`
    )
    const yearPeriods = periodRows.filter(p => !academicYearId || p.academicYearId === academicYearId)
    const activePeriodsList = yearPeriods.length > 0 ? yearPeriods : periodRows

    const selectedPeriod =
      (requestedPeriodId ? activePeriodsList.find(p => p.id === requestedPeriodId) : null) ||
      activePeriodsList.find(p => String(p.status).toUpperCase() === "OPEN") ||
      activePeriodsList.find(p => String(p.status).toUpperCase() === "PUBLISHED") ||
      activePeriodsList[0] ||
      null

    if (!selectedClass) {
      return jsonResponse({
        academicYears: academicYears.map(y => ({ id: y.id, name: y.name, status: y.status })),
        selectedAcademicYearId: academicYearId,
        classes: [],
        selectedClass: null,
        periods: activePeriodsList,
        selectedPeriod,
        catalog: {
          version: CRITERIA_VERSION_2026,
          qualities: SKYLINE_5_QUALITIES_CATALOG,
          rubricLevels: RUBRIC_SCALE_LEVELS,
          prideNpsDrivers: PRIDE_NPS_DRIVERS
        },
        overview: null,
        students: [],
        competencyComparison: [],
        classPrideNps: null
      })
    }

    // Fetch all active students in selectedClass
    const classStudents = await prisma.student.findMany({
      where: {
        classId: selectedClass.id,
        status: "ACTIVE"
      },
      orderBy: { studentName: "asc" }
    })

    const studentIds = classStudents.map(s => s.id)
    const passThreshold = Number(selectedPeriod?.ip21PassThreshold || IP21_DEFAULT_PASS_THRESHOLD_PERCENT)
    const targetRate = Number(selectedPeriod?.ip21TargetRate || IP21_DEFAULT_TARGET_RATE_PERCENT)
    const minNpsAnonSample = Number(selectedPeriod?.minNpsAnonSample || DEFAULT_MIN_NPS_ANON_SAMPLE)

    // Fetch reflections in this class for selectedPeriod
    let reflectionRows: any[] = []
    let reminderRows: any[] = []
    let rawNpsRows: any[] = []

    if (selectedPeriod) {
      reflectionRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "student_quality_reflections"
         WHERE "periodId" = ? AND "classId" = ?`,
        selectedPeriod.id,
        selectedClass.id
      )

      reminderRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "reflection_task_reminder_logs"
         WHERE "periodId" = ? AND "classId" = ?
         ORDER BY "createdAt" DESC`,
        selectedPeriod.id,
        selectedClass.id
      )

      rawNpsRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id", "npsScore", "npsGroup", "prideDriversJson", "proudMomentText", "improvementSuggestion", "createdAt"
         FROM "pride_nps_anonymous_responses"
         WHERE "periodId" = ? AND "classId" = ?
         ORDER BY "createdAt" DESC`,
        selectedPeriod.id,
        selectedClass.id
      )
    }

    // Also fetch periodic competency & academic data for Tab 4 (Đối chiếu ĐGNL định kỳ) and Tab 6 (CVHT Goals)
    const [competencySummaries, subjectGrades, termSummaries, smartGoals] = await Promise.all([
      studentIds.length > 0
        ? prisma.studentSubjectCompetencySummary
            .findMany({
              where: { studentId: { in: studentIds } },
              include: { subject: { select: { subjectName: true, subjectCode: true } } }
            })
            .catch(() => [])
        : Promise.resolve([]),
      studentIds.length > 0
        ? prisma.subjectGradeEntry
            .findMany({
              where: { studentId: { in: studentIds } }
            })
            .catch(() => [])
        : Promise.resolve([]),
      studentIds.length > 0
        ? prisma.studentTermSummary
            .findMany({
              where: { studentId: { in: studentIds } }
            })
            .catch(() => [])
        : Promise.resolve([]),
      studentIds.length > 0
        ? prisma.studentGoal
            .findMany({
              where: { studentId: { in: studentIds } },
              orderBy: { createdAt: "desc" }
            })
            .catch(() => [])
        : Promise.resolve([])
    ])

    const reflectionByStudentId = new Map<string, any>()
    reflectionRows.forEach(r => reflectionByStudentId.set(r.studentId, r))

    const remindersByStudentId = new Map<string, any[]>()
    reminderRows.forEach(rem => {
      if (!remindersByStudentId.has(rem.studentId)) remindersByStudentId.set(rem.studentId, [])
      remindersByStudentId.get(rem.studentId)!.push(rem)
    })

    // Build enriched student list & aggregate class KPIs from server-recomputed scores
    let submittedCount = 0
    let draftCount = 0
    let notStartedCount = 0
    let ip21PassedCount = 0
    let gvcnReviewedCount = 0
    let cvhtLinkedCount = 0

    let sumQ1 = 0
    let sumQ2 = 0
    let sumQ3 = 0
    let sumQ4 = 0
    let sumQ5 = 0
    let sumIp21Score16 = 0
    let sumIp21Percent = 0
    let sumExtended20 = 0
    let sumExtendedPercent = 0

    const criteriaSumMap: Record<string, { sum: number; count: number; levelCounts: Record<number, number> }> = {}
    for (const c of ALL_14_CRITERIA) {
      criteriaSumMap[c.code] = { sum: 0, count: 0, levelCounts: { 1: 0, 2: 0, 3: 0, 4: 0 } }
    }

    const enrichedStudents = classStudents.map(st => {
      const rawRef = reflectionByStudentId.get(st.id) || null
      const stReminders = remindersByStudentId.get(st.id) || []
      const stGoals = smartGoals.filter(g => g.studentId === st.id)

      if (!rawRef) {
        notStartedCount++
        return {
          studentId: st.id,
          studentCode: st.studentCode,
          studentName: st.studentName,
          fullName: st.studentName,
          gender: st.gender || "",
          status: "NOT_STARTED" as const,
          reflectionStatus: "NOT_STARTED" as const,
          currentStep: 0,
          submittedAt: null,
          reminderCount: stReminders.length,
          lastRemindedAt: stReminders[0]?.createdAt || null,
          computedScores: null,
          scores: null,
          achievementsReflection: "",
          achievementsText: "",
          improvementsReflection: "",
          improvementsText: "",
          selectedHighlightTags: [],
          evidenceText: "",
          evidenceLinks: [],
          overallSelfComment: "",
          developmentGoals: [],
          personalGoal: "",
          supportRequestText: "",
          gvcnComment: "",
          gvcnFeedback: "",
          gvcnStrengthsNote: "",
          gvcnGuidanceNote: "",
          gvcnReviewedByName: "",
          gvcnReviewedAt: null,
          cvhtLinkedGoalId: null,
          cvhtLinkedGoal: null,
          cvhtLinkedLogId: null,
          cvhtSyncStatus: "NONE",
          existingSmartGoalsCount: stGoals.length
        }
      }

      const recomputed = calculateStudentQualityScoresFromRatings(rawRef.criteriaRatingsJson, passThreshold)
      const isSubmitted = String(rawRef.status).toUpperCase() === "SUBMITTED"

      if (isSubmitted) {
        submittedCount++
        if (recomputed.ip21Passed) ip21PassedCount++
        sumQ1 += recomputed.q1PatriotismScore
        sumQ2 += recomputed.q2CompassionScore
        sumQ3 += recomputed.q3DiligenceScore
        sumQ4 += recomputed.q4HonestyScore
        sumQ5 += recomputed.q5PrideScore
        sumIp21Score16 += recomputed.ip21Score16
        sumIp21Percent += recomputed.ip21Percent
        sumExtended20 += recomputed.extendedScore20
        sumExtendedPercent += recomputed.extendedPercent

        for (const c of ALL_14_CRITERIA) {
          const val = recomputed.criterionScores[c.code]
          if (val >= 1 && val <= 4) {
            criteriaSumMap[c.code].sum += val
            criteriaSumMap[c.code].count += 1
            criteriaSumMap[c.code].levelCounts[val] = (criteriaSumMap[c.code].levelCounts[val] || 0) + 1
          }
        }
      } else {
        draftCount++
      }

      if (rawRef.gvcnComment && String(rawRef.gvcnComment).trim()) {
        gvcnReviewedCount++
      }
      if (rawRef.cvhtSyncStatus === "LINKED" || rawRef.cvhtLinkedGoalId) {
        cvhtLinkedCount++
      }

      const parsedGoals = safeJsonParse(rawRef.developmentGoalsJson, [])
      const firstGoalStr =
        Array.isArray(parsedGoals) && parsedGoals.length > 0
          ? typeof parsedGoals[0] === "string"
            ? parsedGoals[0]
            : parsedGoals[0]?.targetText || ""
          : ""

      return {
        reflectionId: rawRef.id,
        studentId: st.id,
        studentCode: st.studentCode,
        studentName: st.studentName,
        fullName: st.studentName,
        gender: st.gender || "",
        status: (isSubmitted ? "SUBMITTED" : "DRAFT") as "SUBMITTED" | "DRAFT",
        reflectionStatus: (isSubmitted ? "SUBMITTED" : "DRAFT") as "SUBMITTED" | "DRAFT",
        currentStep: Number(rawRef.currentStep || 1),
        submittedAt: rawRef.submittedAt || null,
        reminderCount: stReminders.length,
        lastRemindedAt: stReminders[0]?.createdAt || null,
        computedScores: recomputed,
        scores: recomputed,
        achievementsReflection: rawRef.achievementsReflection || "",
        achievementsText: rawRef.achievementsReflection || "",
        improvementsReflection: rawRef.improvementsReflection || "",
        improvementsText: rawRef.improvementsReflection || "",
        selectedHighlightTags: safeJsonParse(rawRef.selectedHighlightTagsJson, []),
        evidenceText: rawRef.evidenceText || "",
        evidenceLinks: safeJsonParse(rawRef.evidenceLinksJson, []),
        overallSelfComment: rawRef.overallSelfComment || "",
        developmentGoals: parsedGoals,
        personalGoal: firstGoalStr,
        supportRequestText: rawRef.supportRequestText || "",
        gvcnComment: rawRef.gvcnComment || "",
        gvcnFeedback: rawRef.gvcnComment || "",
        gvcnStrengthsNote: rawRef.gvcnStrengthsNote || "",
        gvcnGuidanceNote: rawRef.gvcnGuidanceNote || "",
        gvcnReviewedByName: rawRef.gvcnReviewedByName || "",
        gvcnReviewedAt: rawRef.gvcnReviewedAt || null,
        cvhtLinkedGoalId: rawRef.cvhtLinkedGoalId || null,
        cvhtLinkedGoal: rawRef.cvhtLinkedGoalId ? { id: rawRef.cvhtLinkedGoalId, status: "Đang thực hiện" } : null,
        cvhtLinkedLogId: rawRef.cvhtLinkedLogId || null,
        cvhtSyncStatus: rawRef.cvhtSyncStatus || "NONE",
        existingSmartGoalsCount: stGoals.length
      }
    })

    // Build Tab 4: Đối chiếu ĐGNL định kỳ (Cross-reference Self-Assessment vs Periodic ĐGNL & KQHT)
    const competencyComparison = enrichedStudents.map(st => {
      const stComps = competencySummaries.filter(c => c.studentId === st.studentId && c.subjectScore !== null)
      const dgnlAvgPercent =
        stComps.length > 0
          ? Math.round((stComps.reduce((s, c) => s + Number(c.subjectScore || 0), 0) / stComps.length) * 10) / 10
          : null

      const stGrades = subjectGrades.filter(
        g => g.studentId === st.studentId && g.compositeScore !== null && g.compositeScore !== undefined
      )
      const kqhtAvgScore10 =
        stGrades.length > 0
          ? Math.round((stGrades.reduce((s, g) => s + Number(g.compositeScore || 0), 0) / stGrades.length) * 100) / 100
          : null
      const kqhtPercent = kqhtAvgScore10 !== null ? Math.round(kqhtAvgScore10 * 10 * 10) / 10 : null

      const stTerm = termSummaries.find(t => t.studentId === st.studentId)
      const benchmarkPercent = dgnlAvgPercent ?? kqhtPercent

      const selfIp21Percent = st.computedScores?.ip21Percent ?? null
      let gapPercent: number | null = null
      let alignmentCode: "NO_DATA" | "ALIGNED_GOOD" | "UNDER_CONFIDENT" | "OVER_ESTIMATED" | "BOTH_NEED_SUPPORT" = "NO_DATA"
      let alignmentLabel = "Chưa đủ dữ liệu đối chiếu"
      let pedagogicalNote = "Học sinh chưa hoàn thành tự đánh giá hoặc chưa có dữ liệu ĐGNL định kỳ."

      if (selfIp21Percent !== null && benchmarkPercent !== null) {
        gapPercent = Math.round((selfIp21Percent - benchmarkPercent) * 10) / 10
        if (selfIp21Percent < passThreshold && benchmarkPercent < 70) {
          alignmentCode = "BOTH_NEED_SUPPORT"
          alignmentLabel = "Cần đồng hành trọng tâm"
          pedagogicalNote = "Cả tự đánh giá phẩm chất và kết quả ĐGNL/học tập đều dưới ngưỡng; GVCN cần ưu tiên gặp gỡ 1:1."
        } else if (gapPercent <= -12) {
          alignmentCode = "UNDER_CONFIDENT"
          alignmentLabel = "Khiêm tốn / Tự đánh giá thấp hơn năng lực"
          pedagogicalNote = "Năng lực thực tế (ĐGNL/KQHT) tốt nhưng học sinh tự đánh giá khắt khe; cần khích lệ sự tự tin."
        } else if (gapPercent >= 15 && benchmarkPercent < 72) {
          alignmentCode = "OVER_ESTIMATED"
          alignmentLabel = "Tự đánh giá cao hơn kết quả định kỳ"
          pedagogicalNote = "Học sinh đánh giá phẩm chất cao nhưng kết quả ĐGNL/học tập thực tế còn thấp; cần hướng dẫn phương pháp học cụ thể."
        } else {
          alignmentCode = "ALIGNED_GOOD"
          alignmentLabel = "Đồng bộ & Nhận thức sát thực tế"
          pedagogicalNote = "Mức tự nhìn nhận của học sinh tương thích tốt với kết quả đánh giá năng lực định kỳ."
        }
      } else if (selfIp21Percent !== null) {
        alignmentCode = selfIp21Percent >= passThreshold ? "ALIGNED_GOOD" : "BOTH_NEED_SUPPORT"
        alignmentLabel = selfIp21Percent >= passThreshold ? "Đạt chuẩn IP2.1 (Chờ ĐGNL)" : "Dưới ngưỡng IP2.1"
        pedagogicalNote =
          selfIp21Percent >= passThreshold
            ? "Đã đạt chuẩn tự đánh giá IP2.1."
            : "Điểm tự đánh giá IP2.1 dưới ngưỡng 72%, cần GVCN khích lệ và tháo gỡ khó khăn."
      }

      return {
        studentId: st.studentId,
        studentCode: st.studentCode,
        studentName: st.studentName,
        reflectionStatus: st.status,
        selfIp21Score16: st.computedScores?.ip21Score16 ?? null,
        selfIp21Percent,
        selfDiligenceScore4: st.computedScores?.q3DiligenceScore ?? null,
        selfPrideScore4: st.computedScores?.q5PrideScore ?? null,
        dgnlSubjectCount: stComps.length,
        dgnlAvgPercent,
        dgnlSubjects: stComps.map(c => ({
          subjectName: c.subject?.subjectName || "Môn học",
          scorePercent: c.subjectScore
        })),
        kqhtAvgScore10,
        conductRating: stTerm?.conductRating || "Tốt",
        academicRating: stTerm?.academicRating || "—",
        gapPercent,
        alignmentCode,
        alignmentLabel,
        pedagogicalNote
      }
    })

    // Build Tab 5: Pride NPS Lớp (Strictly enforce anonymity threshold!)
    const aggregatedClassNps = aggregatePrideNpsFromRawResponses(rawNpsRows, {
      enforceAnonymityThreshold: true,
      minSampleSize: minNpsAnonSample
    })

    // Only expose anonymous feedback texts when anonymity threshold is met!
    const anonymousFeedbackList = aggregatedClassNps.isMaskedForAnonymity
      ? []
      : rawNpsRows
          .filter(r => (r.proudMomentText && r.proudMomentText.trim()) || (r.improvementSuggestion && r.improvementSuggestion.trim()))
          .map((r, idx) => ({
            anonIndex: idx + 1,
            npsGroup: r.npsGroup,
            proudMomentText: r.proudMomentText || "",
            improvementSuggestion: r.improvementSuggestion || ""
          }))

    const totalStudents = classStudents.length
    const completionRate = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 1000) / 10 : 0
    const ip21PassRate = submittedCount > 0 ? Math.round((ip21PassedCount / submittedCount) * 1000) / 10 : 0

    const avgQ1 = submittedCount > 0 ? Math.round((sumQ1 / submittedCount) * 100) / 100 : 0
    const avgQ2 = submittedCount > 0 ? Math.round((sumQ2 / submittedCount) * 100) / 100 : 0
    const avgQ3 = submittedCount > 0 ? Math.round((sumQ3 / submittedCount) * 100) / 100 : 0
    const avgQ4 = submittedCount > 0 ? Math.round((sumQ4 / submittedCount) * 100) / 100 : 0
    const avgQ5 = submittedCount > 0 ? Math.round((sumQ5 / submittedCount) * 100) / 100 : 0
    const qAvgByCode: Record<string, number> = {
      PC1: avgQ1,
      PC2: avgQ2,
      PC3: avgQ3,
      PC4: avgQ4,
      PC5: avgQ5
    }

    const overview = {
      totalStudents,
      submittedCount,
      draftCount,
      notStartedCount,
      completionRate,
      completionRatePct: completionRate,
      ip21PassedCount,
      ip21PassRate,
      ip21PassRatePct: ip21PassRate,
      ip21TargetRate: targetRate,
      ip21TargetRatePct: targetRate,
      ip21PassThreshold: passThreshold,
      ip21PassThresholdPct: passThreshold,
      isMeetingIp21Target: submittedCount > 0 && ip21PassRate >= targetRate,
      avgIp21Score16: submittedCount > 0 ? Math.round((sumIp21Score16 / submittedCount) * 100) / 100 : 0,
      avgIp21Percent: submittedCount > 0 ? Math.round((sumIp21Percent / submittedCount) * 10) / 10 : 0,
      avgQ1Patriotism4: avgQ1,
      avgQ2Compassion4: avgQ2,
      avgQ3Diligence4: avgQ3,
      avgQ4Honesty4: avgQ4,
      avgQ5Pride4: avgQ5,
      avgPrideQualityScore4: avgQ5,
      avgExtendedScore20: submittedCount > 0 ? Math.round((sumExtended20 / submittedCount) * 100) / 100 : 0,
      avgExtendedPercent: submittedCount > 0 ? Math.round((sumExtendedPercent / submittedCount) * 10) / 10 : 0,
      gvcnReviewedCount,
      cvhtLinkedCount,
      qualityClassAverages: SKYLINE_5_QUALITIES_CATALOG.map(q => ({
        code: q.code,
        name: q.name,
        includedInOfficialIp21: q.includedInOfficialIp21,
        averageScore: qAvgByCode[q.code] || 0,
        percentage: Math.round(((qAvgByCode[q.code] || 0) / 4) * 100)
      })),
      criteriaBreakdown: ALL_14_CRITERIA.map(c => {
        const stat = criteriaSumMap[c.code]
        const avg4 = stat.count > 0 ? Math.round((stat.sum / stat.count) * 100) / 100 : 0
        const goodOrExcellentCount = (stat.levelCounts[3] || 0) + (stat.levelCounts[4] || 0)
        return {
          code: c.code,
          qualityCode: c.qualityCode,
          order: c.order,
          title: c.title,
          isIp21Official: c.isIp21Official,
          avgScore4: avg4,
          goodOrExcellentPercent: stat.count > 0 ? Math.round((goodOrExcellentCount / stat.count) * 1000) / 10 : 0,
          levelCounts: stat.levelCounts
        }
      })
    }

    return jsonResponse({
      academicYears: academicYears.map(y => ({ id: y.id, name: y.name, status: y.status })),
      selectedAcademicYearId: academicYearId,
      classes: allowedClasses.map(c => ({
        id: c.id,
        classCode: c.classCode,
        className: c.className,
        name: c.className,
        grade: String(parseStudentGradeNumber(c.grade, c.className) || c.grade || ""),
        gradeLevel: String(parseStudentGradeNumber(c.grade, c.className) || c.grade || ""),
        campusId: c.campusId,
        campusName: c.campus?.campusName || ""
      })),
      selectedClass: {
        id: selectedClass.id,
        classCode: selectedClass.classCode,
        className: selectedClass.className,
        name: selectedClass.className,
        grade: String(parseStudentGradeNumber(selectedClass.grade, selectedClass.className) || ""),
        gradeLevel: String(parseStudentGradeNumber(selectedClass.grade, selectedClass.className) || ""),
        campusId: selectedClass.campusId,
        campusName: selectedClass.campus?.campusName || ""
      },
      periods: activePeriodsList.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        title: p.name,
        semester: p.semester,
        criteriaVersion: p.criteriaVersion,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        extendedUntil: p.extendedUntil,
        publishedAt: p.publishedAt
      })),
      selectedPeriod: selectedPeriod
        ? {
            id: selectedPeriod.id,
            code: selectedPeriod.code,
            name: selectedPeriod.name,
            title: selectedPeriod.name,
            semester: selectedPeriod.semester,
            criteriaVersion: selectedPeriod.criteriaVersion,
            status: selectedPeriod.status,
            startDate: selectedPeriod.startDate,
            endDate: selectedPeriod.endDate,
            extendedUntil: selectedPeriod.extendedUntil,
            publishedAt: selectedPeriod.publishedAt,
            ip21TargetRate: targetRate,
            ip21PassThreshold: passThreshold,
            minNpsAnonSample
          }
        : null,
      catalog: {
        version: CRITERIA_VERSION_2026,
        qualities: SKYLINE_5_QUALITIES_CATALOG,
        rubricLevels: RUBRIC_SCALE_LEVELS,
        prideNpsDrivers: PRIDE_NPS_DRIVERS
      },
      overview,
      students: enrichedStudents,
      competencyComparison,
      classPrideNps: {
        ...aggregatedClassNps,
        anonymousFeedbackList
      }
    })
  } catch (error: any) {
    console.error("GET /api/reflection-pride/teacher error:", error)
    return jsonResponse({ error: error.message || "Lỗi máy chủ khi tải dữ liệu lớp." }, 500)
  }
}

export async function POST(req: Request) {
  try {
    await ensureReflectionPrideTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated || (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN")) {
      return jsonResponse({ error: "Không có quyền thực hiện thao tác GVCN." }, 403)
    }

    const body = await req.json()
    const action = String(body.action || "").toUpperCase()
    const classId = String(body.classId || "").trim()
    const periodId = String(body.periodId || "").trim()

    if (!classId || !periodId) {
      return jsonResponse({ error: "Thiếu thông tin lớp hoặc kỳ khảo sát." }, 400)
    }

    // Verify teacher has permission for this classId
    const allowedClasses = await getTeacherAllowedClasses(caller, "")
    const targetClass = allowedClasses.find(c => c.id === classId)
    if (!targetClass) {
      return jsonResponse({ error: "Bạn không có quyền thao tác trên lớp học này." }, 403)
    }

    // ACTION 1: REMIND_STUDENTS (Nhắc nhiệm vụ học sinh)
    if (action === "REMIND_STUDENTS") {
      let studentIds: string[] = Array.isArray(body.studentIds) ? body.studentIds.map(String) : []
      const customMessage =
        String(body.message || "").trim() ||
        "Thầy/Cô GVCN nhắc em hoàn thành Bản Tự Nhìn Nhận Hành Trình Trưởng Thành (5 Phẩm chất & Pride NPS) trên Cổng Học Sinh SSM nhé!"

      if (studentIds.length === 0) {
        const allInClass = await prisma.student.findMany({
          where: { classId, status: "ACTIVE" },
          select: { id: true }
        })
        const submittedInClass = await prisma.$queryRawUnsafe<any[]>(
          `SELECT "studentId" FROM "student_quality_reflections" WHERE "periodId" = ? AND "classId" = ? AND "status" = 'SUBMITTED'`,
          periodId,
          classId
        )
        const submittedSet = new Set(submittedInClass.map(r => r.studentId))
        studentIds = allInClass.filter(s => !submittedSet.has(s.id)).map(s => s.id)
      }

      if (studentIds.length === 0) {
        return jsonResponse({ error: "Tất cả học sinh trong lớp đã hoàn thành nhiệm vụ." }, 400)
      }

      const students = await prisma.student.findMany({
        where: { id: { in: studentIds }, classId },
        include: { parents: { include: { parent: true } } }
      })

      for (const st of students) {
        const remId = `rrem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        await prisma.$executeRawUnsafe(
          `INSERT INTO "reflection_task_reminder_logs" (
            "id", "periodId", "classId", "studentId", "studentName",
            "remindedByUserId", "remindedByName", "message", "createdAt"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          remId,
          periodId,
          classId,
          st.id,
          st.studentName,
          caller.userId,
          caller.actorName,
          customMessage
        )

        // Also send in-app notification to linked parent user accounts if present
        for (const pLink of st.parents || []) {
          if (pLink.parent?.userId) {
            await prisma.notification
              .create({
                data: {
                  userId: pLink.parent.userId,
                  title: `Nhắc nhiệm vụ Hành trình Trưởng thành (${st.studentName})`,
                  message: customMessage,
                  link: "/hocsinh/portal/reflection",
                  type: "REMINDER",
                  category: "REFLECTION_PRIDE",
                  sourceModule: "REFLECTION_PRIDE",
                  sourceId: periodId
                }
              })
              .catch(() => null)
          }
        }
      }

      return jsonResponse({
        success: true,
        remindedCount: students.length,
        message: `Đã gửi nhắc nhiệm vụ tới ${students.length} học sinh trong lớp ${targetClass.className}.`
      })
    }

    // ACTION 2: SAVE_GVCN_FEEDBACK (GVCN nhận xét & phản hồi đồng hành)
    if (action === "SAVE_GVCN_FEEDBACK") {
      const studentId = String(body.studentId || "").trim()
      const gvcnComment = String(body.gvcnComment ?? body.gvcnFeedback ?? "").trim()
      const gvcnStrengthsNote = String(body.gvcnStrengthsNote || "").trim()
      const gvcnGuidanceNote = String(body.gvcnGuidanceNote || "").trim()

      if (!studentId || !gvcnComment) {
        return jsonResponse({ error: "Vui lòng nhập nội dung nhận xét đồng hành của GVCN." }, 400)
      }

      const existingRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id" FROM "student_quality_reflections"
         WHERE "periodId" = ? AND "studentId" = ? AND "classId" = ?
         LIMIT 1`,
        periodId,
        studentId,
        classId
      )

      if (existingRows.length === 0) {
        return jsonResponse({ error: "Học sinh chưa khởi tạo bản tự đánh giá trong kỳ này." }, 404)
      }

      await prisma.$executeRawUnsafe(
        `UPDATE "student_quality_reflections"
         SET
           "gvcnComment" = ?,
           "gvcnStrengthsNote" = ?,
           "gvcnGuidanceNote" = ?,
           "gvcnReviewedById" = ?,
           "gvcnReviewedByName" = ?,
           "gvcnReviewedAt" = CURRENT_TIMESTAMP,
           "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = ?`,
        gvcnComment,
        gvcnStrengthsNote || null,
        gvcnGuidanceNote || null,
        caller.userId,
        caller.actorName,
        existingRows[0].id
      )

      return jsonResponse({
        success: true,
        message: "Đã lưu nhận xét đồng hành của GVCN thành công."
      })
    }

    // ACTION 3: CONNECT_CVHT_GOAL (Kết nối mục tiêu phát triển sang Sổ Mục tiêu CVHT & Nhật ký 1:1)
    if (action === "CONNECT_CVHT_GOAL") {
      const studentId = String(body.studentId || "").trim()
      const targetText = String(body.targetText ?? body.goalContent ?? "").trim()
      const category = String(body.category || "PHAM_CHAT").trim()
      const actionItems: string[] = Array.isArray(body.actionItems) ? body.actionItems.map(String).filter(Boolean) : []
      const gvcnGuidance = String(body.gvcnGuidance ?? body.gvcnFeedback ?? "").trim()

      if (!studentId || !targetText) {
        return jsonResponse({ error: "Thiếu thông tin học sinh hoặc nội dung mục tiêu kết nối CVHT." }, 400)
      }

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { class: true }
      })
      if (!student || student.classId !== classId) {
        return jsonResponse({ error: "Không tìm thấy học sinh trong lớp." }, 404)
      }

      const gradeNum = parseStudentGradeNumber(student.class?.grade, student.class?.className) || 8

      // 1. Create or connect StudentGoal in CVHT module
      const createdGoal = await prisma.studentGoal.create({
        data: {
          studentId: student.id,
          academicYearId: targetClass.academicYearId,
          semester: String(body.semester || "HK1"),
          gradeLevel: `K${gradeNum}`,
          category,
          targetText,
          teacherComment: gvcnGuidance || `Kết nối từ Bản Tự Nhìn Nhận Phẩm Chất & Hành Trình Trưởng Thành (${caller.actorName}).`,
          signedByStudent: true,
          signedByTeacher: true,
          status: "IN_PROGRESS",
          achievementLevel: "DANG_TIEN_TRIEN",
          actions:
            actionItems.length > 0
              ? {
                  create: actionItems.map(act => ({
                    actionText: act,
                    status: "PENDING"
                  }))
                }
              : undefined
        }
      })

      // 2. Also create an AcademicConsultationLog if teacher exists
      let createdLogId: string | null = null
      const teacherRec = await prisma.teacher.findFirst({
        where: { OR: [{ id: caller.teacherId || "" }, { userId: caller.userId || "" }] }
      })

      if (teacherRec) {
        const log = await prisma.academicConsultationLog
          .create({
            data: {
              studentId: student.id,
              teacherId: teacherRec.id,
              academicYearId: targetClass.academicYearId,
              content: `Đồng hành Phẩm chất & Kết nối Mục tiêu CVHT: ${targetText}`,
              nextActions: actionItems.join("; ") || gvcnGuidance || "Theo dõi rèn luyện phẩm chất định kỳ",
              notes: gvcnGuidance || "Đồng bộ từ phân hệ Phẩm chất HS & Tự hào Sky-Line",
              status: "COMPLETED"
            }
          })
          .catch(() => null)
        if (log) createdLogId = log.id
      }

      await prisma.$executeRawUnsafe(
        `UPDATE "student_quality_reflections"
         SET
           "cvhtLinkedGoalId" = ?,
           "cvhtLinkedLogId" = COALESCE(?, "cvhtLinkedLogId"),
           "cvhtSyncStatus" = 'LINKED',
           "gvcnGuidanceNote" = COALESCE(?, "gvcnGuidanceNote"),
           "gvcnReviewedById" = ?,
           "gvcnReviewedByName" = ?,
           "gvcnReviewedAt" = CURRENT_TIMESTAMP,
           "updatedAt" = CURRENT_TIMESTAMP
         WHERE "periodId" = ? AND "studentId" = ?`,
        createdGoal.id,
        createdLogId,
        gvcnGuidance || null,
        caller.userId,
        caller.actorName,
        periodId,
        student.id
      )

      return jsonResponse({
        success: true,
        cvhtGoalId: createdGoal.id,
        cvhtLogId: createdLogId,
        message: "Đã kết nối mục tiêu phát triển bản thân vào Sổ Mục tiêu CVHT & Nhật ký Cố vấn 1:1 thành công!"
      })
    }

    return jsonResponse({ error: "Thao tác không hợp lệ." }, 400)
  } catch (error: any) {
    console.error("POST /api/reflection-pride/teacher error:", error)
    return jsonResponse({ error: error.message || "Lỗi máy chủ khi xử lý yêu cầu GVCN." }, 500)
  }
}
