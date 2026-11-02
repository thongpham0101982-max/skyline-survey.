import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { resolveAdvisoryCaller, verifyStudentRelationship } from "@/lib/advisory/rbac-guard"
import { ensureReflectionPrideTables } from "@/lib/reflection-pride/db-sync"
import {
  ALL_14_CRITERIA,
  CRITERIA_VERSION_2026,
  PRIDE_NPS_DRIVERS,
  REFLECTION_HIGHLIGHT_TAGS,
  RUBRIC_SCALE_LEVELS,
  SKYLINE_5_QUALITIES_CATALOG,
  buildAnonymousNpsTokenHash,
  calculateStudentQualityScoresFromRatings,
  classifyNpsScore,
  isEligibleGrade4To12,
  isStudentInPeriodScope,
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

async function buildSsmAcademicAndTrainingSnapshot(student: any, academicYearId: string) {
  const [
    gradeEntries,
    termScores,
    termSummaries,
    competencySummaries,
    achievements,
    activities,
    goals
  ] = await Promise.all([
    prisma.subjectGradeEntry
      .findMany({
        where: { studentId: student.id, ...(academicYearId ? { academicYearId } : {}) },
        include: { subject: { select: { id: true, subjectCode: true, subjectName: true } } },
        orderBy: { updatedAt: "desc" }
      })
      .catch(() => []),
    prisma.studentTermScore
      .findMany({
        where: { studentId: student.id },
        include: { subject: { select: { id: true, subjectCode: true, subjectName: true } } },
        orderBy: { updatedAt: "desc" }
      })
      .catch(() => []),
    prisma.studentTermSummary
      .findMany({
        where: { studentId: student.id },
        orderBy: { updatedAt: "desc" }
      })
      .catch(() => []),
    prisma.studentSubjectCompetencySummary
      .findMany({
        where: { studentId: student.id, ...(academicYearId ? { academicYearId } : {}) },
        include: { subject: { select: { id: true, subjectCode: true, subjectName: true } } },
        orderBy: { updatedAt: "desc" }
      })
      .catch(() => []),
    prisma.studentAchievement
      .findMany({
        where: { studentId: student.id },
        include: { achievement: { include: { exam: true } } },
        take: 10
      })
      .catch(() => []),
    prisma.activityParticipant
      .findMany({
        where: { studentId: student.id },
        include: { activity: true },
        take: 10
      })
      .catch(() => []),
    prisma.studentGoal
      .findMany({
        where: { studentId: student.id, ...(academicYearId ? { academicYearId } : {}) },
        include: { actions: true },
        orderBy: { createdAt: "desc" }
      })
      .catch(() => [])
  ])

  const subjectMap = new Map<string, any>()
  for (const g of gradeEntries) {
    if (g.compositeScore !== null && g.compositeScore !== undefined && !subjectMap.has(g.subjectId)) {
      subjectMap.set(g.subjectId, {
        subjectId: g.subjectId,
        subjectName: g.subject?.subjectName || "Môn học",
        subjectCode: g.subject?.subjectCode || "",
        score: Number(g.compositeScore),
        evaluationPeriod: g.evaluationPeriod,
        remark: g.remark || ""
      })
    }
  }
  for (const ts of termScores) {
    if (ts.score !== null && ts.score !== undefined && !subjectMap.has(ts.subjectId)) {
      subjectMap.set(ts.subjectId, {
        subjectId: ts.subjectId,
        subjectName: ts.subject?.subjectName || "Môn học",
        subjectCode: ts.subject?.subjectCode || "",
        score: Number(ts.score),
        evaluationPeriod: ts.semester,
        remark: ts.evaluationGrade || ""
      })
    }
  }

  const subjectScores = Array.from(subjectMap.values())
  const averageAcademicScore =
    subjectScores.length > 0
      ? Math.round((subjectScores.reduce((s, item) => s + item.score, 0) / subjectScores.length) * 100) / 100
      : null

  const strongSubjects = subjectScores
    .filter(s => s.score >= 8.0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)

  const improvementSubjects = subjectScores
    .filter(s => s.score < 6.5)
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)

  const competencyItems = competencySummaries.map(cs => {
    let radarAxes: any[] = []
    try {
      const parsed = JSON.parse(cs.radarData || "[]")
      if (Array.isArray(parsed)) radarAxes = parsed
    } catch {}
    return {
      subjectId: cs.subjectId,
      subjectName: cs.subject?.subjectName || "ĐGNL",
      assessmentPeriod: cs.assessmentPeriod,
      subjectScore: cs.subjectScore,
      evaluatedCount: cs.evaluatedCount,
      totalCompetencies: cs.totalCompetencies,
      radarAxes
    }
  })

  const latestSummary = termSummaries[0] || null

    return {
      generatedAt: new Date().toISOString(),
      averageAcademicScore,
      academicRating: latestSummary?.academicRating || (averageAcademicScore && averageAcademicScore >= 8 ? "Tốt" : averageAcademicScore && averageAcademicScore >= 6.5 ? "Khá" : "Đang cập nhật"),
      conductRating: latestSummary?.conductRating || "Tốt",
      gpa: latestSummary?.gpa ?? averageAcademicScore,
      absencesTotal: latestSummary?.absencesTotal ?? 0,
      reward: latestSummary?.reward || null,
      subjectCount: subjectScores.length,
      subjectScores,
      strongSubjects,
      improvementSubjects,
      competencyCount: competencyItems.length,
      competencyItems,
      achievementCount: achievements.length,
      achievements: achievements.map((a: any) => ({
        id: a.id,
        title: a.achievement?.name || a.achievement?.exam?.name || "Thành tích",
        examName: a.achievement?.exam?.name || ""
      })),
      activityCount: activities.length,
      activities: activities.map((act: any) => ({
        id: act.id,
        name: act.activity?.activityName || act.activity?.title || "Hoạt động trải nghiệm",
        role: act.role || "Tham gia"
      })),
      existingSmartGoals: goals.map((g: any) => ({
        id: g.id,
        category: g.category,
        targetText: g.targetText,
        status: g.status,
        achievementLevel: g.achievementLevel
      })),
      dgnl: {
        averageScore: averageAcademicScore,
        rankLabel: latestSummary?.academicRating || (averageAcademicScore && averageAcademicScore >= 8 ? "Tốt" : averageAcademicScore && averageAcademicScore >= 6.5 ? "Khá" : "Đang cập nhật"),
        examCount: subjectScores.length,
        subjects: subjectScores.map((s: any) => ({
          subjectName: s.subjectName,
          totalScore: s.score
        }))
      },
      attendance: {
        attendanceRatePct: Math.max(85, 100 - Number(latestSummary?.absencesTotal || 0)),
        presentCount: Math.max(0, 90 - Number(latestSummary?.absencesTotal || 0)),
        lateCount: Number(latestSummary?.absencesTotal || 0)
      },
      advisoryGoals: goals
    }
}

export async function GET(req: Request) {
  try {
    await ensureReflectionPrideTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập hệ thống." }, 401)
    }

    const { searchParams } = new URL(req.url)
    const targetStudentId = searchParams.get("studentId") || caller.studentId || ""
    const requestedPeriodId = searchParams.get("periodId") || ""

    if (!targetStudentId) {
      return jsonResponse({ error: "Không xác định được hồ sơ học sinh." }, 400)
    }

    const rel = await verifyStudentRelationship(caller, targetStudentId)
    if (!rel.allowed || !rel.student) {
      return jsonResponse({ error: rel.reason || "Không có quyền truy cập hồ sơ học sinh này." }, 403)
    }

    const student = await prisma.student.findUnique({
      where: { id: rel.student.id },
      include: {
        class: true,
        campus: true,
        academicYear: true
      }
    })

    if (!student) {
      return jsonResponse({ error: "Không tìm thấy học sinh." }, 404)
    }

    const gradeNum = parseStudentGradeNumber(student.class?.grade, student.class?.className)
    const eligibleGrade4To12 = isEligibleGrade4To12(student.class?.grade, student.class?.className)

    const activeYear =
      student.academicYear ||
      (await prisma.academicYear.findFirst({
        where: { status: "ACTIVE", isOff: false },
        orderBy: { startDate: "desc" }
      }))
    const academicYearId = student.academicYearId || activeYear?.id || ""

    // Fetch all non-draft periods in this academic year (or all periods if none in active year)
    const allPeriods = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "reflection_pride_periods"
       WHERE "status" IN ('OPEN', 'CLOSED', 'PUBLISHED')
       ORDER BY "createdAt" DESC`
    )

    const matchingPeriods = allPeriods.filter(p => {
      const scope = isStudentInPeriodScope(p, {
        gradeLevel: String(gradeNum || ""),
        className: student.class?.className,
        campusId: student.campusId,
        classId: student.classId
      })
      return scope.eligible
    })

    // Select active period: requestedPeriodId -> first OPEN period -> first PUBLISHED/CLOSED period
    let activePeriod =
      (requestedPeriodId ? matchingPeriods.find(p => p.id === requestedPeriodId) : null) ||
      matchingPeriods.find(p => String(p.status).toUpperCase() === "OPEN") ||
      matchingPeriods[0] ||
      null

    const ssmSnapshot = await buildSsmAcademicAndTrainingSnapshot(student, academicYearId)

    let reflectionRecord: any = null
    let hasSubmittedPrideNps = false

    if (activePeriod) {
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "student_quality_reflections"
         WHERE "periodId" = ? AND "studentId" = ?
         LIMIT 1`,
        activePeriod.id,
        student.id
      )
      const rawRow = rows[0] || null

      // Check anonymous token hash in pride_nps_anonymous_responses
      const tokenHash = buildAnonymousNpsTokenHash(activePeriod.id, student.id)
      const npsRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id", "createdAt" FROM "pride_nps_anonymous_responses"
         WHERE "submissionTokenHash" = ?
         LIMIT 1`,
        tokenHash
      )
      hasSubmittedPrideNps = npsRows.length > 0 || Boolean(rawRow?.hasCompletedPrideNps)

      if (rawRow) {
        const passThreshold = Number(activePeriod.ip21PassThreshold || 72.0)
        const recomputed = calculateStudentQualityScoresFromRatings(rawRow.criteriaRatingsJson, passThreshold)
        const parsedDevGoals = safeJsonParse(rawRow.developmentGoalsJson, [])
        const firstGoalText =
          Array.isArray(parsedDevGoals) && parsedDevGoals.length > 0
            ? typeof parsedDevGoals[0] === "string"
              ? parsedDevGoals[0]
              : parsedDevGoals[0]?.targetText || ""
            : ""
        reflectionRecord = {
          id: rawRow.id,
          periodId: rawRow.periodId,
          status: rawRow.status,
          currentStep: Number(rawRow.currentStep || 1),
          criteriaVersion: rawRow.criteriaVersion || CRITERIA_VERSION_2026,
          academicSnapshot: safeJsonParse(rawRow.academicSnapshotJson, ssmSnapshot),
          achievementsReflection: rawRow.achievementsReflection || "",
          achievementsText: rawRow.achievementsReflection || "",
          improvementsReflection: rawRow.improvementsReflection || "",
          improvementsText: rawRow.improvementsReflection || "",
          selectedHighlightTags: safeJsonParse(rawRow.selectedHighlightTagsJson, []),
          highlightTags: safeJsonParse(rawRow.selectedHighlightTagsJson, []),
          criteriaRatings: recomputed.criterionScores,
          computedScores: recomputed,
          scores: recomputed,
          evidenceText: rawRow.evidenceText || "",
          evidenceLinks: safeJsonParse(rawRow.evidenceLinksJson, []),
          overallSelfComment: rawRow.overallSelfComment || "",
          studentComment: rawRow.overallSelfComment || "",
          developmentGoals: parsedDevGoals,
          personalGoal: firstGoalText,
          supportRequestText: rawRow.supportRequestText || "",
          submittedAt: rawRow.submittedAt || null,
          hasCompletedPrideNps: hasSubmittedPrideNps,
          gvcnFeedback: rawRow.gvcnComment || "",
          gvcnCompanion: {
            gvcnComment: rawRow.gvcnComment || "",
            gvcnStrengthsNote: rawRow.gvcnStrengthsNote || "",
            gvcnGuidanceNote: rawRow.gvcnGuidanceNote || "",
            gvcnReviewedByName: rawRow.gvcnReviewedByName || "",
            gvcnReviewedAt: rawRow.gvcnReviewedAt || null,
            cvhtLinkedGoalId: rawRow.cvhtLinkedGoalId || null,
            cvhtLinkedLogId: rawRow.cvhtLinkedLogId || null,
            cvhtSyncStatus: rawRow.cvhtSyncStatus || "NONE"
          }
        }
      }
    }

    // Fetch student's past reflections history
    const historyRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT r.*, p."name" as "periodName", p."semester" as "periodSemester", p."status" as "periodStatus"
       FROM "student_quality_reflections" r
       LEFT JOIN "reflection_pride_periods" p ON p."id" = r."periodId"
       WHERE r."studentId" = ?
       ORDER BY r."updatedAt" DESC`,
      student.id
    )

    const scopeCheck = activePeriod
      ? isStudentInPeriodScope(activePeriod, {
          gradeLevel: String(gradeNum || ""),
          className: student.class?.className,
          campusId: student.campusId,
          classId: student.classId
        })
      : { eligible: eligibleGrade4To12, isOpenForSubmission: false }

    return jsonResponse({
      student: {
        id: student.id,
        studentCode: student.studentCode,
        studentName: student.studentName,
        fullName: student.studentName,
        classId: student.classId,
        className: student.class?.className || "",
        gradeLevel: String(gradeNum || ""),
        campusId: student.campusId,
        campusName: student.campus?.campusName || "",
        academicYearId,
        academicYearName: activeYear?.name || "2026-2027"
      },
      eligible: eligibleGrade4To12,
      eligibleGrade4To12,
      hasOpenTask: Boolean(activePeriod && scopeCheck.eligible && scopeCheck.isOpenForSubmission),
      activePeriod: activePeriod
        ? {
            id: activePeriod.id,
            code: activePeriod.code,
            name: activePeriod.name,
            title: activePeriod.name,
            semester: activePeriod.semester,
            criteriaVersion: activePeriod.criteriaVersion,
            status: activePeriod.status,
            startDate: activePeriod.startDate,
            endDate: activePeriod.endDate,
            extendedUntil: activePeriod.extendedUntil,
            publishedAt: activePeriod.publishedAt,
            ip21TargetRate: Number(activePeriod.ip21TargetRate || 90),
            ip21PassThreshold: Number(activePeriod.ip21PassThreshold || 72),
            isOpenForSubmission: scopeCheck.isOpenForSubmission
          }
        : null,
      availablePeriods: matchingPeriods.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        title: p.name,
        semester: p.semester,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        extendedUntil: p.extendedUntil
      })),
      catalog: {
        version: CRITERIA_VERSION_2026,
        qualities: SKYLINE_5_QUALITIES_CATALOG,
        rubricLevels: RUBRIC_SCALE_LEVELS,
        highlightTags: REFLECTION_HIGHLIGHT_TAGS.map(t => t.label),
        highlightTagObjects: REFLECTION_HIGHLIGHT_TAGS,
        prideNpsDrivers: PRIDE_NPS_DRIVERS
      },
      ssmSnapshot,
      reflection: reflectionRecord,
      hasSubmittedPrideNps,
      history: historyRows.map(h => {
        const sc = calculateStudentQualityScoresFromRatings(h.criteriaRatingsJson, 72)
        return {
          id: h.id,
          periodId: h.periodId,
          periodName: h.periodName || h.semester,
          semester: h.periodSemester || h.semester,
          status: h.status,
          ip21Score16: sc.ip21Score16,
          ip21Percent: sc.ip21Percent,
          ip21Passed: sc.ip21Passed,
          q5PrideScore: sc.q5PrideScore,
          extendedScore20: sc.extendedScore20,
          gvcnComment: h.gvcnComment || "",
          submittedAt: h.submittedAt,
          updatedAt: h.updatedAt
        }
      })
    })
  } catch (error: any) {
    console.error("GET /api/reflection-pride/student error:", error)
    return jsonResponse({ error: error.message || "Lỗi máy chủ khi tải dữ liệu." }, 500)
  }
}

export async function POST(req: Request) {
  try {
    await ensureReflectionPrideTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập hệ thống." }, 401)
    }

    const body = await req.json()
    const action = String(body.action || "SAVE_DRAFT").toUpperCase()
    const targetStudentId = body.studentId || caller.studentId || ""
    const periodId = String(body.periodId || "").trim()

    if (!targetStudentId || !periodId) {
      return jsonResponse({ error: "Thiếu thông tin học sinh hoặc kỳ khảo sát." }, 400)
    }

    const rel = await verifyStudentRelationship(caller, targetStudentId)
    if (!rel.allowed || !rel.student) {
      return jsonResponse({ error: rel.reason || "Không có quyền thực hiện thao tác này." }, 403)
    }

    const student = await prisma.student.findUnique({
      where: { id: rel.student.id },
      include: { class: true, campus: true }
    })

    if (!student) {
      return jsonResponse({ error: "Không tìm thấy hồ sơ học sinh." }, 404)
    }

    const gradeNum = parseStudentGradeNumber(student.class?.grade, student.class?.className)
    if (!gradeNum || gradeNum < 4 || gradeNum > 12) {
      return jsonResponse(
        { error: "Chương trình Hành trình Trưởng thành & Pride NPS chỉ áp dụng cho học sinh Khối 4–12." },
        403
      )
    }

    const periodRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "reflection_pride_periods" WHERE "id" = ? LIMIT 1`,
      periodId
    )
    const period = periodRows[0]
    if (!period) {
      return jsonResponse({ error: "Không tìm thấy kỳ khảo sát." }, 404)
    }

    const scopeCheck = isStudentInPeriodScope(period, {
      gradeLevel: String(gradeNum),
      className: student.class?.className,
      campusId: student.campusId,
      classId: student.classId
    })

    if (!scopeCheck.eligible || !scopeCheck.isOpenForSubmission) {
      return jsonResponse(
        { error: scopeCheck.reason || "Kỳ khảo sát hiện đang đóng hoặc chưa mở cho lớp của em." },
        403
      )
    }

    // ACTION 1: SUBMIT ANONYMOUS PRIDE NPS (Step 7 - Independent & Anonymous)
    if (action === "SUBMIT_PRIDE_NPS") {
      const rawNps = Number(body.npsScore ?? body.score)
      if (!Number.isFinite(rawNps) || rawNps < 0 || rawNps > 10) {
        return jsonResponse({ error: "Vui lòng chọn mức điểm Pride NPS từ 0 đến 10." }, 400)
      }

      const npsScore = Math.round(rawNps)
      const npsGroup = classifyNpsScore(npsScore)
      const tokenHash = buildAnonymousNpsTokenHash(period.id, student.id)

      const existingNps = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id" FROM "pride_nps_anonymous_responses" WHERE "submissionTokenHash" = ? LIMIT 1`,
        tokenHash
      )
      if (existingNps.length > 0) {
        return jsonResponse({ error: "Em đã gửi phản hồi Pride NPS trong kỳ này rồi. Cảm ơn em!" }, 400)
      }

      const rawDrivers = body.prideDrivers ?? body.reasons
      const drivers = Array.isArray(rawDrivers) ? rawDrivers.map(String) : []
      const proudMomentText = String(body.proudMomentText ?? body.proudMoments ?? "").trim()
      const improvementSuggestion = String(body.improvementSuggestion ?? body.improvementIdeas ?? "").trim()
      const anonId = `pnps_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

      await prisma.$executeRawUnsafe(
        `INSERT INTO "pride_nps_anonymous_responses" (
          "id", "periodId", "academicYearId", "semester",
          "campusId", "classId", "gradeLevel", "criteriaVersion",
          "submissionTokenHash", "npsScore", "npsGroup",
          "prideDriversJson", "proudMomentText", "improvementSuggestion", "createdAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        anonId,
        period.id,
        period.academicYearId || student.academicYearId,
        period.semester || "HK1",
        student.campusId,
        student.classId,
        String(gradeNum),
        period.criteriaVersion || CRITERIA_VERSION_2026,
        tokenHash,
        npsScore,
        npsGroup,
        JSON.stringify(drivers),
        proudMomentText || null,
        improvementSuggestion || null
      )

      // Mark completion flag on reflection record if present (without linking the NPS record or score)
      await prisma.$executeRawUnsafe(
        `UPDATE "student_quality_reflections"
         SET "hasCompletedPrideNps" = 1, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "periodId" = ? AND "studentId" = ?`,
        period.id,
        student.id
      )

      return jsonResponse({
        success: true,
        message: "Cảm ơn em đã gửi phản hồi Pride NPS ẩn danh! Tiếng nói của em giúp mái trường Sky-Line ngày càng hạnh phúc hơn."
      })
    }

    // ACTION 2: SAVE_DRAFT or SUBMIT_REFLECTION (Steps 1..6)
    const isFinalSubmit = action === "SUBMIT_REFLECTION"
    const criteriaRatingsInput = body.criteriaRatings || {}
    const passThreshold = Number(period.ip21PassThreshold || 72.0)
    const computed = calculateStudentQualityScoresFromRatings(criteriaRatingsInput, passThreshold)

    const achievementsReflection = String(body.achievementsReflection ?? body.achievementsText ?? "").trim()
    const improvementsReflection = String(body.improvementsReflection ?? body.improvementsText ?? "").trim()
    const rawHighlightTags = body.selectedHighlightTags ?? body.highlightTags
    const selectedHighlightTags = Array.isArray(rawHighlightTags) ? rawHighlightTags : []
    const evidenceText = String(body.evidenceText || "").trim()
    const evidenceLinks = Array.isArray(body.evidenceLinks) ? body.evidenceLinks : []
    const overallSelfComment = String(body.overallSelfComment ?? body.studentComment ?? "").trim()
    const developmentGoals = Array.isArray(body.developmentGoals)
      ? body.developmentGoals
      : body.personalGoal && String(body.personalGoal).trim()
      ? [{ category: "PHAM_CHAT", targetText: String(body.personalGoal).trim() }]
      : []
    const supportRequestText = String(body.supportRequestText || "").trim()
    const currentStep = Math.max(1, Math.min(6, Number(body.currentStep || 1)))

    if (isFinalSubmit) {
      if (!computed.isCompleteAll14) {
        return jsonResponse(
          {
            error: `Vui lòng hoàn thành đánh giá đầy đủ 14/14 tiêu chí của 5 phẩm chất (Hiện tại: ${computed.answeredCriteriaCount}/${ALL_14_CRITERIA.length}).`
          },
          400
        )
      }
    }

    const existingRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id", "status", "academicSnapshotJson", "hasCompletedPrideNps"
       FROM "student_quality_reflections"
       WHERE "periodId" = ? AND "studentId" = ?
       LIMIT 1`,
      period.id,
      student.id
    )
    const existing = existingRows[0] || null

    let snapshotJsonStr = existing?.academicSnapshotJson || "{}"
    if (!existing || snapshotJsonStr === "{}") {
      const snap = await buildSsmAcademicAndTrainingSnapshot(student, period.academicYearId || student.academicYearId)
      snapshotJsonStr = JSON.stringify(snap)
    }

    const newStatus = isFinalSubmit ? "SUBMITTED" : existing?.status === "SUBMITTED" ? "SUBMITTED" : "DRAFT"
    const recordId = existing?.id || `sqr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    if (!existing) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "student_quality_reflections" (
          "id", "periodId", "academicYearId", "semester",
          "campusId", "classId", "gradeLevel",
          "studentId", "studentCode", "studentName", "criteriaVersion",
          "status", "currentStep", "academicSnapshotJson",
          "achievementsReflection", "improvementsReflection", "selectedHighlightTagsJson",
          "criteriaRatingsJson",
          "q1PatriotismScore", "q2CompassionScore", "q3DiligenceScore", "q4HonestyScore", "q5PrideScore",
          "ip21Score16", "ip21Percent", "ip21Passed", "extendedScore20", "extendedPercent",
          "evidenceText", "evidenceLinksJson", "overallSelfComment",
          "developmentGoalsJson", "supportRequestText",
          "submittedAt", "createdAt", "updatedAt"
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ${isFinalSubmit ? "CURRENT_TIMESTAMP" : "NULL"}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )`,
        recordId,
        period.id,
        period.academicYearId || student.academicYearId,
        period.semester || "HK1",
        student.campusId,
        student.classId,
        String(gradeNum),
        student.id,
        student.studentCode,
        student.studentName,
        period.criteriaVersion || CRITERIA_VERSION_2026,
        newStatus,
        isFinalSubmit ? 6 : currentStep,
        snapshotJsonStr,
        achievementsReflection,
        improvementsReflection,
        JSON.stringify(selectedHighlightTags),
        JSON.stringify(computed.criterionScores),
        computed.q1PatriotismScore,
        computed.q2CompassionScore,
        computed.q3DiligenceScore,
        computed.q4HonestyScore,
        computed.q5PrideScore,
        computed.ip21Score16,
        computed.ip21Percent,
        computed.ip21Passed ? 1 : 0,
        computed.extendedScore20,
        computed.extendedPercent,
        evidenceText || null,
        JSON.stringify(evidenceLinks),
        overallSelfComment || null,
        JSON.stringify(developmentGoals),
        supportRequestText || null
      )
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE "student_quality_reflections"
         SET
           "status" = ?,
           "currentStep" = ?,
           "achievementsReflection" = ?,
           "improvementsReflection" = ?,
           "selectedHighlightTagsJson" = ?,
           "criteriaRatingsJson" = ?,
           "q1PatriotismScore" = ?,
           "q2CompassionScore" = ?,
           "q3DiligenceScore" = ?,
           "q4HonestyScore" = ?,
           "q5PrideScore" = ?,
           "ip21Score16" = ?,
           "ip21Percent" = ?,
           "ip21Passed" = ?,
           "extendedScore20" = ?,
           "extendedPercent" = ?,
           "evidenceText" = ?,
           "evidenceLinksJson" = ?,
           "overallSelfComment" = ?,
           "developmentGoalsJson" = ?,
           "supportRequestText" = ?,
           "submittedAt" = COALESCE("submittedAt", ${isFinalSubmit ? "CURRENT_TIMESTAMP" : "NULL"}),
           "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = ?`,
        newStatus,
        isFinalSubmit ? 6 : currentStep,
        achievementsReflection,
        improvementsReflection,
        JSON.stringify(selectedHighlightTags),
        JSON.stringify(computed.criterionScores),
        computed.q1PatriotismScore,
        computed.q2CompassionScore,
        computed.q3DiligenceScore,
        computed.q4HonestyScore,
        computed.q5PrideScore,
        computed.ip21Score16,
        computed.ip21Percent,
        computed.ip21Passed ? 1 : 0,
        computed.extendedScore20,
        computed.extendedPercent,
        evidenceText || null,
        JSON.stringify(evidenceLinks),
        overallSelfComment || null,
        JSON.stringify(developmentGoals),
        supportRequestText || null,
        existing.id
      )
    }

    return jsonResponse({
      success: true,
      status: newStatus,
      computedScores: computed,
      message: isFinalSubmit
        ? "Chúc mừng em đã hoàn thành Bản Tự Nhìn Nhận Hành Trình Trưởng Thành! Hãy tiếp tục chia sẻ cảm nhận Pride NPS nhé."
        : "Đã lưu bản nháp thành công."
    })
  } catch (error: any) {
    console.error("POST /api/reflection-pride/student error:", error)
    return jsonResponse({ error: error.message || "Lỗi máy chủ khi lưu dữ liệu." }, 500)
  }
}
