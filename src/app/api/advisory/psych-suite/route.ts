import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  ensureTriPartyTables,
  appendAdvisoryAuditLog
} from "@/lib/advisory/triparty-sync"
import {
  resolveAdvisoryCaller,
  verifyStudentRelationship
} from "@/lib/advisory/rbac-guard"
import {
  SKL_PSYCH_CATALOG,
  getTestConfig,
  getQuestionsByTestCode,
  scorePsychAssessment,
  type SklPsychTestCode
} from "@/lib/advisory/skl-psych-suite"
import { calculateHollandResult, SKL_PSYCH_VERSION } from "@/lib/advisory/holland-skl-psych"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  return res
}

function generateLookupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let suffix = ""
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `SKL-26-${suffix}`
}

function parseGradeNumber(gradeStr?: string | null, className?: string | null): number {
  const raw = `${gradeStr || ""} ${className || ""}`
  const m = raw.match(/\b(1[0-2]|[1-9])\b/)
  if (m) return parseInt(m[1], 10)
  const m2 = raw.match(/K(1[0-2]|[1-9])/i)
  if (m2) return parseInt(m2[1], 10)
  return 10
}

function hydratePsychRow(row: any, callerRole: string) {
  if (!row) return null
  let answers: any = []
  let scoresSummary: Record<string, any> = {}
  let profileAnalysis: Record<string, any> = {}
  let linkedGoalIds: string[] = []

  try {
    answers = row.answersJson ? JSON.parse(row.answersJson) : []
  } catch {}
  try {
    scoresSummary = row.scoresSummaryJson ? JSON.parse(row.scoresSummaryJson) : {}
  } catch {}
  try {
    profileAnalysis = row.profileAnalysisJson ? JSON.parse(row.profileAnalysisJson) : {}
  } catch {}
  try {
    linkedGoalIds = row.linkedGoalIdsJson ? JSON.parse(row.linkedGoalIdsJson) : []
  } catch {}

  const testCode = (row.testCode || "HOLLAND") as SklPsychTestCode
  if (
    row.status === "COMPLETED" &&
    (!scoresSummary || Object.keys(scoresSummary).length === 0)
  ) {
    const recomputed = scorePsychAssessment(testCode, answers)
    scoresSummary = recomputed.scoresSummary
    profileAnalysis = recomputed.profileAnalysis
  }

  return {
    id: row.id,
    lookupCode: row.lookupCode || `SKL-26-${String(row.id).slice(-6).toUpperCase()}`,
    studentId: row.studentId,
    studentCode: row.studentCode || "",
    studentName: row.studentName || "",
    classId: row.classId || "",
    className: row.className || "",
    campusName: row.campusName || "",
    gradeLevel: Number(row.gradeLevel || 10),
    academicYearId: row.academicYearId || "",
    testCode,
    testName: row.testName || getTestConfig(testCode).name,
    version: row.version || SKL_PSYCH_VERSION,
    status: row.status,
    answeredCount: Number(row.answeredCount || 0),
    totalQuestions: Number(row.totalQuestions || getTestConfig(testCode).questionCount),
    currentStep: Number(row.currentStep || 1),
    durationSeconds: Number(row.durationSeconds || 0),
    answers: callerRole === "PARENT" ? undefined : answers,
    primaryResultCode: row.primaryResultCode || "",
    primaryResultLabel: row.primaryResultLabel || "",
    validityStatus: (row.validityStatus || "VALID") as "VALID" | "WARNING",
    scoresSummary,
    profileAnalysis,
    studentReflection: row.studentReflection || "",
    linkedGoalIds,
    consultationRequested: Boolean(row.consultationRequested),
    consultationRequestTopic: row.consultationRequestTopic || "",
    consultationRequestNote: row.consultationRequestNote || "",
    consultationRequestStatus: row.consultationRequestStatus || "NONE",
    consultationScheduledDate: row.consultationScheduledDate || "",
    advisorId: row.advisorId || null,
    advisorName: row.advisorName || null,
    advisorReviewNote: row.advisorReviewNote || "",
    isPublishedToParent: Boolean(row.isPublishedToParent ?? 1),
    publishedToParentAt: row.publishedToParentAt || null,
    parentAcknowledged: Boolean(row.parentAcknowledged),
    parentAcknowledgedAt: row.parentAcknowledgedAt || null,
    parentFeedback: row.parentFeedback || "",
    submittedAt: row.submittedAt || row.updatedAt || row.createdAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

async function syncLegacyHollandRows() {
  try {
    const legacyRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT h.*, s."studentName", c."className", c."grade", cp."campusName"
       FROM "StudentHollandAssessment" h
       LEFT JOIN "Student" s ON s."id" = h."studentId"
       LEFT JOIN "Class" c ON c."id" = COALESCE(h."classId", s."classId")
       LEFT JOIN "Campus" cp ON cp."id" = c."campusId"
       WHERE NOT EXISTS (
         SELECT 1 FROM "StudentPsychAssessment" p WHERE p."id" = h."id"
       )`
    )

    for (const r of legacyRows) {
      let rawAns: any = {}
      try {
        rawAns = r.answersJson ? JSON.parse(r.answersJson) : {}
      } catch {}
      const scored = scorePsychAssessment("HOLLAND", rawAns)
      const gradeNum = parseGradeNumber(r.grade, r.className)
      const lookupCode = `SKL-26-${String(r.id).replace(/[^A-Za-z0-9]/g, "").slice(-6).toUpperCase()}`

      await prisma.$executeRawUnsafe(
        `INSERT OR IGNORE INTO "StudentPsychAssessment" (
          "id", "lookupCode", "studentId", "studentCode", "studentName",
          "classId", "className", "campusName", "gradeLevel", "academicYearId",
          "testCode", "testName", "version", "status",
          "answeredCount", "totalQuestions", "currentStep", "durationSeconds",
          "answersJson", "primaryResultCode", "primaryResultLabel", "validityStatus",
          "scoresSummaryJson", "profileAnalysisJson",
          "studentReflection", "linkedGoalIdsJson",
          "consultationRequested", "consultationRequestTopic", "consultationRequestNote",
          "consultationRequestStatus", "consultationScheduledDate",
          "advisorId", "advisorName", "advisorReviewNote",
          "isPublishedToParent", "publishedToParentAt",
          "parentAcknowledged", "parentAcknowledgedAt", "parentFeedback",
          "submittedAt", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'HOLLAND', ?, ?, ?, ?, 108, ?, 0, ?, ?, ?, 'VALID', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        r.id,
        lookupCode,
        r.studentId,
        r.studentCode || "",
        r.studentName || "",
        r.classId || "",
        r.className || "",
        r.campusName || "",
        gradeNum,
        r.academicYearId || "",
        scored.testName,
        r.version || SKL_PSYCH_VERSION,
        r.status || "DRAFT",
        Number(r.answeredCount || scored.answeredCount || 0),
        Number(r.currentStep || 1),
        r.answersJson || "{}",
        r.hollandCode || scored.primaryResultCode || "",
        scored.primaryResultLabel || "",
        JSON.stringify(scored.scoresSummary),
        JSON.stringify(scored.profileAnalysis),
        r.studentReflection || "",
        r.linkedGoalIdsJson || "[]",
        Number(r.consultationRequested || 0),
        r.consultationRequestTopic || "",
        r.consultationRequestNote || "",
        r.consultationRequestStatus || "NONE",
        r.consultationScheduledDate || "",
        r.advisorId || null,
        r.advisorName || null,
        r.advisorReviewNote || "",
        Number(r.isPublishedToParent ?? 1),
        r.publishedToParentAt || null,
        Number(r.parentAcknowledged || 0),
        r.parentAcknowledgedAt || null,
        r.parentFeedback || "",
        r.submittedAt || null,
        r.createdAt || new Date().toISOString(),
        r.updatedAt || new Date().toISOString()
      )
    }
  } catch (e) {
    console.warn("[syncLegacyHollandRows Warning]:", e)
  }
}

async function resolveTeacherAssignedClassIds(caller: any, academicYearId?: string): Promise<string[]> {
  const teacherIds = [caller.teacherId, caller.teacherCode, caller.userId].filter(Boolean)
  if (teacherIds.length === 0) return []

  const classIdSet = new Set<string>()

  // 1. Homeroom classes
  const hrClasses = await prisma.class.findMany({
    where: {
      homeroomTeacherId: { in: teacherIds },
      ...(academicYearId ? { academicYearId } : {})
    },
    select: { id: true }
  })
  hrClasses.forEach(c => classIdSet.add(c.id))

  // 2. ClassTeacher relations (GVCN / CVHT / GDHN / GVBM)
  const ctRows = await prisma.classTeacher
    .findMany({
      where: {
        teacherId: { in: teacherIds },
        ...(academicYearId ? { class: { academicYearId } } : {})
      },
      select: { classId: true }
    })
    .catch(() => [])
  ctRows.forEach(r => classIdSet.add(r.classId))

  // 3. TeacherAssignment (Phân công giảng dạy)
  const taRows = await prisma.teacherAssignment
    .findMany({
      where: {
        teacherId: { in: teacherIds },
        ...(academicYearId ? { academicYearId } : {})
      },
      select: { classId: true }
    })
    .catch(() => [])
  taRows.forEach(r => {
    if (r.classId) classIdSet.add(r.classId)
  })

  return Array.from(classIdSet)
}

export async function GET(req: Request) {
  try {
    await ensureTriPartyTables()
    await syncLegacyHollandRows()

    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập hệ thống" }, 401)
    }

    const { searchParams } = new URL(req.url)
    const mode = searchParams.get("mode") || "student"
    const testCodeParam = (searchParams.get("testCode") || "") as SklPsychTestCode | ""
    const includeQuestions = searchParams.get("includeQuestions") === "1"

    // =========================================================================
    // MODE 1: STATS & MANAGEMENT FOR ADMIN & GVCN (THEO PHÂN CÔNG)
    // =========================================================================
    if (mode === "stats") {
      if (caller.actorRole !== "ADMIN" && caller.actorRole !== "TEACHER") {
        return jsonResponse({ error: "Không có quyền xem thống kê quản trị" }, 403)
      }

      const academicYearId = searchParams.get("academicYearId") || ""
      const campusIdFilter = searchParams.get("campusId") || "ALL"
      const gradeFilter = searchParams.get("grade") || "ALL"
      const classIdFilter = searchParams.get("classId") || "ALL"
      const testFilter = searchParams.get("testCode") || "ALL"
      const validityFilter = searchParams.get("validity") || "ALL"
      const searchFilter = (searchParams.get("search") || "").trim().toLowerCase()

      let allowedClassIds: string[] | null = null
      if (caller.actorRole === "TEACHER" && !caller.isSuperAdmin) {
        allowedClassIds = await resolveTeacherAssignedClassIds(caller, academicYearId || undefined)
      }

      // Query classes in scope
      const classWhere: any = {}
      if (academicYearId) classWhere.academicYearId = academicYearId
      if (campusIdFilter && campusIdFilter !== "ALL") {
        classWhere.campusId = campusIdFilter
      } else if (caller.actorRole === "ADMIN" && !caller.isSuperAdmin && caller.campusId) {
        classWhere.campusId = caller.campusId
      }
      if (allowedClassIds !== null) {
        classWhere.id = { in: allowedClassIds.length > 0 ? allowedClassIds : ["__NONE__"] }
      }
      if (classIdFilter && classIdFilter !== "ALL") {
        if (allowedClassIds !== null && !allowedClassIds.includes(classIdFilter)) {
          return jsonResponse({ error: "Lớp học không nằm trong phạm vi phân công của Thầy/Cô" }, 403)
        }
        classWhere.id = classIdFilter
      }

      const classesInScope = await prisma.class.findMany({
        where: classWhere,
        include: {
          campus: { select: { id: true, campusCode: true, campusName: true } }
        },
        orderBy: [{ className: "asc" }]
      })

      // Filter by grade if specified
      const filteredClasses =
        gradeFilter && gradeFilter !== "ALL"
          ? classesInScope.filter(c => {
              const gNum = parseGradeNumber(c.grade, c.className)
              return String(gNum) === String(gradeFilter).replace(/[^0-9]/g, "")
            })
          : classesInScope

      const targetClassIds = filteredClasses.map(c => c.id)

      // Fetch homeroom teacher names
      const hrTeacherIds = Array.from(
        new Set(filteredClasses.map(c => c.homeroomTeacherId).filter(Boolean))
      ) as string[]
      const teachers =
        hrTeacherIds.length > 0
          ? await prisma.teacher.findMany({
              where: {
                OR: [{ id: { in: hrTeacherIds } }, { teacherCode: { in: hrTeacherIds } }]
              },
              select: { id: true, teacherCode: true, teacherName: true }
            })
          : []
      const teacherMap = new Map<string, string>()
      teachers.forEach(t => {
        teacherMap.set(t.id, t.teacherName)
        if (t.teacherCode) teacherMap.set(t.teacherCode, t.teacherName)
      })

      // Fetch students in scope
      const studentsInScope =
        targetClassIds.length > 0
          ? await prisma.student.findMany({
              where: { classId: { in: targetClassIds } },
              select: {
                id: true,
                studentCode: true,
                studentName: true,
                classId: true
              },
              orderBy: [{ studentName: "asc" }]
            })
          : []

      const classLookup = new Map(filteredClasses.map(c => [c.id, c]))
      const studentIds = studentsInScope.map(s => s.id)
      const studentCodes = studentsInScope.map(s => s.studentCode).filter(Boolean) as string[]

      // Fetch all completed & draft assessments for students in scope
      let rawRows: any[] = []
      if (studentIds.length > 0 || targetClassIds.length > 0) {
        const allRows = await prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM "StudentPsychAssessment" ORDER BY "updatedAt" DESC`
        )
        const studentIdSet = new Set(studentIds)
        const studentCodeSet = new Set(studentCodes)
        const classIdSet = new Set(targetClassIds)

        rawRows = allRows.filter(
          r =>
            studentIdSet.has(r.studentId) ||
            (r.studentCode && studentCodeSet.has(r.studentCode)) ||
            (r.classId && classIdSet.has(r.classId))
        )
      }

      const hydratedRows = rawRows
        .map(r => hydratePsychRow(r, caller.actorRole))
        .filter(Boolean) as any[]

      const completedRows = hydratedRows.filter(r => r.status === "COMPLETED")

      // Map latest completed per student & testCode
      const studentTestMap = new Map<string, Record<string, any>>()
      const studentByCode = new Map<string, string>()
      studentsInScope.forEach(s => {
        if (s.studentCode) studentByCode.set(s.studentCode, s.id)
      })

      completedRows.forEach(row => {
        const canonicalStudentId =
          studentByCode.get(row.studentCode) || row.studentId
        if (!studentTestMap.has(canonicalStudentId)) {
          studentTestMap.set(canonicalStudentId, {})
        }
        const mapForStudent = studentTestMap.get(canonicalStudentId)!
        if (!mapForStudent[row.testCode]) {
          mapForStudent[row.testCode] = row
        }
      })

      // Build test distribution & trait distributions
      const testDistribution: Record<SklPsychTestCode, number> = {
        DISC: 0,
        EPI: 0,
        HOLLAND: 0,
        LYUSIN_EQ: 0,
        MBTI: 0
      }

      const traitDistributions = {
        HOLLAND: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 } as Record<string, number>,
        EPI: { Sanguine: 0, Choleric: 0, Phlegmatic: 0, Melancholic: 0 } as Record<string, number>,
        DISC: { D: 0, I: 0, S: 0, C: 0 } as Record<string, number>,
        MBTI: { NT: 0, NF: 0, SJ: 0, SP: 0 } as Record<string, number>,
        LYUSIN_EQ: { high: 0, medium: 0, developing: 0, avgPercent: 0 }
      }

      let eqSumPct = 0
      let eqCount = 0
      let warningCount = 0
      let consultationRequestCount = 0

      // Count unique latest completed per student-test for accurate stats
      studentTestMap.forEach(testsObj => {
        Object.values(testsObj).forEach((item: any) => {
          const tc = item.testCode as SklPsychTestCode
          if (testDistribution[tc] !== undefined) {
            testDistribution[tc]++
          }
          if (item.validityStatus === "WARNING") warningCount++
          if (item.consultationRequested) consultationRequestCount++

          if (tc === "HOLLAND") {
            const firstLetter = String(item.primaryResultCode || "").replace(/[^RIASEC]/g, "")[0]
            if (firstLetter && traitDistributions.HOLLAND[firstLetter] !== undefined) {
              traitDistributions.HOLLAND[firstLetter]++
            }
          } else if (tc === "EPI") {
            const temp = item.scoresSummary?.EPI?.temperament || item.primaryResultCode
            if (temp && traitDistributions.EPI[temp] !== undefined) {
              traitDistributions.EPI[temp]++
            }
          } else if (tc === "DISC") {
            const prim =
              item.scoresSummary?.DISC?.primary || String(item.primaryResultCode || "")[0]
            if (prim && traitDistributions.DISC[prim] !== undefined) {
              traitDistributions.DISC[prim]++
            }
          } else if (tc === "MBTI") {
            const tempCode = item.scoresSummary?.MBTI?.temperamentCode
            if (tempCode && traitDistributions.MBTI[tempCode] !== undefined) {
              traitDistributions.MBTI[tempCode]++
            }
          } else if (tc === "LYUSIN_EQ") {
            const pct = Number(item.scoresSummary?.LYUSIN_EQ?.totalEI?.percentage || 0)
            eqSumPct += pct
            eqCount++
            if (pct >= 75) traitDistributions.LYUSIN_EQ.high++
            else if (pct >= 50) traitDistributions.LYUSIN_EQ.medium++
            else traitDistributions.LYUSIN_EQ.developing++
          }
        })
      })

      if (eqCount > 0) {
        traitDistributions.LYUSIN_EQ.avgPercent = Math.round(eqSumPct / eqCount)
      }

      // Build student matrix
      const studentMatrix = studentsInScope
        .map(st => {
          const cls = classLookup.get(st.classId)
          const testsObj = studentTestMap.get(st.id) || {}
          const completedTestsCount = Object.keys(testsObj).length
          const hasWarning = Object.values(testsObj).some(
            (x: any) => x.validityStatus === "WARNING"
          )
          const hasConsultationRequest = Object.values(testsObj).some(
            (x: any) => x.consultationRequested
          )

          return {
            id: st.id,
            studentCode: st.studentCode || "",
            studentName: st.studentName,
            classId: st.classId,
            className: cls?.className || "",
            campusName: cls?.campus?.campusName || "",
            grade: parseGradeNumber(cls?.grade, cls?.className),
            completedCount: completedTestsCount,
            hasWarning,
            hasConsultationRequest,
            tests: {
              DISC: testsObj.DISC
                ? {
                    id: testsObj.DISC.id,
                    lookupCode: testsObj.DISC.lookupCode,
                    code: testsObj.DISC.primaryResultCode,
                    label: testsObj.DISC.primaryResultLabel,
                    submittedAt: testsObj.DISC.submittedAt
                  }
                : null,
              EPI: testsObj.EPI
                ? {
                    id: testsObj.EPI.id,
                    lookupCode: testsObj.EPI.lookupCode,
                    code: testsObj.EPI.primaryResultCode,
                    label: testsObj.EPI.primaryResultLabel,
                    validityStatus: testsObj.EPI.validityStatus,
                    submittedAt: testsObj.EPI.submittedAt
                  }
                : null,
              HOLLAND: testsObj.HOLLAND
                ? {
                    id: testsObj.HOLLAND.id,
                    lookupCode: testsObj.HOLLAND.lookupCode,
                    code: testsObj.HOLLAND.primaryResultCode,
                    label: testsObj.HOLLAND.primaryResultLabel,
                    consultationRequested: testsObj.HOLLAND.consultationRequested,
                    submittedAt: testsObj.HOLLAND.submittedAt
                  }
                : null,
              LYUSIN_EQ: testsObj.LYUSIN_EQ
                ? {
                    id: testsObj.LYUSIN_EQ.id,
                    lookupCode: testsObj.LYUSIN_EQ.lookupCode,
                    code: testsObj.LYUSIN_EQ.primaryResultCode,
                    label: testsObj.LYUSIN_EQ.primaryResultLabel,
                    submittedAt: testsObj.LYUSIN_EQ.submittedAt
                  }
                : null,
              MBTI: testsObj.MBTI
                ? {
                    id: testsObj.MBTI.id,
                    lookupCode: testsObj.MBTI.lookupCode,
                    code: testsObj.MBTI.primaryResultCode,
                    label: testsObj.MBTI.primaryResultLabel,
                    submittedAt: testsObj.MBTI.submittedAt
                  }
                : null
            }
          }
        })
        .filter(item => {
          if (searchFilter) {
            const matchName = item.studentName.toLowerCase().includes(searchFilter)
            const matchCode = item.studentCode.toLowerCase().includes(searchFilter)
            const matchClass = item.className.toLowerCase().includes(searchFilter)
            if (!matchName && !matchCode && !matchClass) return false
          }
          if (testFilter && testFilter !== "ALL") {
            if (!item.tests[testFilter as SklPsychTestCode]) return false
          }
          if (validityFilter === "WARNING" && !item.hasWarning) return false
          return true
        })

      // Build class distribution
      const classDistribution = filteredClasses.map(cls => {
        const clsStudents = studentsInScope.filter(s => s.classId === cls.id)
        let participated = 0
        let totalCompletedInClass = 0
        const byTest: Record<SklPsychTestCode, number> = {
          DISC: 0,
          EPI: 0,
          HOLLAND: 0,
          LYUSIN_EQ: 0,
          MBTI: 0
        }

        clsStudents.forEach(s => {
          const tMap = studentTestMap.get(s.id) || {}
          const keys = Object.keys(tMap) as SklPsychTestCode[]
          if (keys.length > 0) participated++
          keys.forEach(k => {
            totalCompletedInClass++
            if (byTest[k] !== undefined) byTest[k]++
          })
        })

        return {
          classId: cls.id,
          className: cls.className,
          campusId: cls.campusId || "",
          campusName: cls.campus?.campusName || "Sky-Line",
          grade: parseGradeNumber(cls.grade, cls.className),
          homeroomTeacherName:
            (cls.homeroomTeacherId && teacherMap.get(cls.homeroomTeacherId)) || "Chưa phân công",
          studentCount: clsStudents.length,
          participatedCount: participated,
          participationRate:
            clsStudents.length > 0 ? Math.round((participated / clsStudents.length) * 100) : 0,
          completedCount: totalCompletedInClass,
          byTest
        }
      })

      // Build campus distribution
      const campusMap = new Map<
        string,
        {
          campusId: string
          campusName: string
          studentCount: number
          participatedCount: number
          completedCount: number
          byTest: Record<SklPsychTestCode, number>
        }
      >()
      classDistribution.forEach(cd => {
        const key = cd.campusName || "Sky-Line"
        if (!campusMap.has(key)) {
          campusMap.set(key, {
            campusId: cd.campusId,
            campusName: key,
            studentCount: 0,
            participatedCount: 0,
            completedCount: 0,
            byTest: { DISC: 0, EPI: 0, HOLLAND: 0, LYUSIN_EQ: 0, MBTI: 0 }
          })
        }
        const entry = campusMap.get(key)!
        entry.studentCount += cd.studentCount
        entry.participatedCount += cd.participatedCount
        entry.completedCount += cd.completedCount
        ;(["DISC", "EPI", "HOLLAND", "LYUSIN_EQ", "MBTI"] as const).forEach(tc => {
          entry.byTest[tc] += cd.byTest[tc]
        })
      })

      // Filter assessments list
      const filteredAssessments = completedRows.filter(r => {
        if (testFilter && testFilter !== "ALL" && r.testCode !== testFilter) return false
        if (validityFilter && validityFilter !== "ALL" && r.validityStatus !== validityFilter)
          return false
        if (searchFilter) {
          const m1 = String(r.studentName || "").toLowerCase().includes(searchFilter)
          const m2 = String(r.studentCode || "").toLowerCase().includes(searchFilter)
          const m3 = String(r.lookupCode || "").toLowerCase().includes(searchFilter)
          const m4 = String(r.className || "").toLowerCase().includes(searchFilter)
          if (!m1 && !m2 && !m3 && !m4) return false
        }
        return true
      })

      const totalStudents = studentsInScope.length
      const participatedStudents = studentTestMap.size
      const totalCompletedAssessments = Object.values(testDistribution).reduce(
        (acc, v) => acc + v,
        0
      )

      return jsonResponse({
        success: true,
        version: SKL_PSYCH_VERSION,
        catalog: SKL_PSYCH_CATALOG,
        summary: {
          totalStudents,
          participatedStudents,
          participationRate:
            totalStudents > 0 ? Math.round((participatedStudents / totalStudents) * 100) : 0,
          totalCompletedAssessments,
          consultationRequestCount,
          warningCount
        },
        testDistribution,
        traitDistributions,
        campusDistribution: Array.from(campusMap.values()),
        classDistribution,
        studentMatrix,
        assessments: filteredAssessments.slice(0, 300)
      })
    }

    // =========================================================================
    // MODE 2: SINGLE ASSESSMENT DETAIL BY ID OR LOOKUP CODE
    // =========================================================================
    const assessmentIdParam = searchParams.get("id") || ""
    const lookupCodeParam = searchParams.get("lookupCode") || ""
    if (assessmentIdParam || lookupCodeParam) {
      const rows = await prisma.$queryRawUnsafe<any[]>(
        assessmentIdParam
          ? `SELECT * FROM "StudentPsychAssessment" WHERE "id" = ? LIMIT 1`
          : `SELECT * FROM "StudentPsychAssessment" WHERE "lookupCode" = ? LIMIT 1`,
        assessmentIdParam || lookupCodeParam.trim().toUpperCase()
      )
      const row = rows[0]
      if (!row) {
        return jsonResponse({ error: "Không tìm thấy bản ghi khảo sát" }, 404)
      }
      const rel = await verifyStudentRelationship(caller, row.studentId || row.studentCode)
      if (!rel.allowed) {
        return jsonResponse({ error: rel.reason || "Không có quyền xem bài khảo sát này" }, 403)
      }
      return jsonResponse({
        success: true,
        assessment: hydratePsychRow(row, caller.actorRole)
      })
    }

    // =========================================================================
    // MODE 3: STUDENT PORTFOLIO & CATALOG (FOR STUDENT, PARENT, TEACHER, ADMIN)
    // =========================================================================
    const studentIdParam = searchParams.get("studentId") || ""
    const studentCodeParam = searchParams.get("studentCode") || ""

    const targetIdentifier =
      studentIdParam ||
      studentCodeParam ||
      (caller.actorRole === "STUDENT" ? caller.studentId || caller.studentCode || "" : "")

    if (!targetIdentifier) {
      return jsonResponse({ error: "Thiếu thông tin định danh học sinh (studentId)" }, 400)
    }

    const rel = await verifyStudentRelationship(caller, targetIdentifier)
    if (!rel.allowed || !rel.student) {
      return jsonResponse(
        { error: rel.reason || "Không có quyền truy cập hồ sơ khảo sát tâm lý của học sinh này" },
        403
      )
    }

    const allIds = rel.allStudentIds.length > 0 ? rel.allStudentIds : [rel.student.id]
    const placeholders = allIds.map(() => "?").join(", ")

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "StudentPsychAssessment"
       WHERE "studentId" IN (${placeholders})
          OR ("studentCode" IS NOT NULL AND "studentCode" = ?)
       ORDER BY "updatedAt" DESC`,
      ...allIds,
      rel.student.studentCode || ""
    )

    const hydrated = rows
      .map(r => hydratePsychRow(r, caller.actorRole))
      .filter(Boolean) as any[]

    const completedList = hydrated.filter(r => r.status === "COMPLETED")
    const draftList = caller.actorRole === "PARENT" ? [] : hydrated.filter(r => r.status === "DRAFT")

    const completedByTest: Record<string, any> = {}
    const draftsByTest: Record<string, any> = {}

    SKL_PSYCH_CATALOG.forEach(cfg => {
      completedByTest[cfg.code] = completedList.find(r => r.testCode === cfg.code) || null
      draftsByTest[cfg.code] = draftList.find(r => r.testCode === cfg.code) || null
    })

    const studentGrade = parseGradeNumber(
      rel.student.class?.grade,
      rel.student.class?.className
    )

    const enrichedCatalog = SKL_PSYCH_CATALOG.map(cfg => ({
      ...cfg,
      isRecommended: cfg.recommendedGrades.includes(studentGrade),
      latestCompleted: completedByTest[cfg.code] || null,
      activeDraft: draftsByTest[cfg.code] || null
    }))

    // Fetch student's orientation/career goals
    const orientationGoals = await prisma.studentGoal
      .findMany({
        where: { studentId: { in: allIds } },
        orderBy: { createdAt: "desc" },
        take: 15
      })
      .catch(() => [])

    return jsonResponse({
      success: true,
      version: SKL_PSYCH_VERSION,
      student: {
        id: rel.student.id,
        studentCode: rel.student.studentCode || "",
        studentName: rel.student.studentName,
        classId: rel.student.classId,
        className: rel.student.class?.className || "",
        campusName: rel.student.class?.campus?.campusName || "Sky-Line",
        grade: rel.student.class?.grade || "",
        gradeLevel: studentGrade
      },
      catalog: enrichedCatalog,
      completedByTest,
      draftsByTest,
      history: completedList,
      orientationGoals,
      ...(includeQuestions && testCodeParam
        ? { questions: getQuestionsByTestCode(testCodeParam) }
        : {})
    })
  } catch (error: any) {
    console.error("[GET /api/advisory/psych-suite] Error:", error)
    return jsonResponse(
      { error: error.message || "Lỗi máy chủ khi tải dữ liệu Khảo sát SKL_PSYCH" },
      500
    )
  }
}

export async function POST(req: Request) {
  try {
    await ensureTriPartyTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập hệ thống" }, 401)
    }

    const body = await req.json()
    const {
      action = "SAVE_DRAFT", // "SAVE_DRAFT" | "SUBMIT_ASSESSMENT"
      testCode = "HOLLAND" as SklPsychTestCode,
      studentId: bodyStudentId,
      academicYearId = "",
      currentStep = 1,
      durationSeconds = 0,
      answers = [],
      studentReflection = ""
    } = body

    const targetStudentId =
      caller.actorRole === "STUDENT"
        ? caller.studentId || bodyStudentId
        : bodyStudentId || caller.studentId

    if (!targetStudentId) {
      return jsonResponse({ error: "Không xác định được hồ sơ học sinh" }, 400)
    }

    const rel = await verifyStudentRelationship(caller, targetStudentId)
    if (!rel.allowed || !rel.student) {
      return jsonResponse({ error: rel.reason || "Không có quyền thực hiện khảo sát này" }, 403)
    }

    const student = rel.student
    const cfg = getTestConfig(testCode)
    const scored = scorePsychAssessment(testCode, answers)
    const nowIso = new Date().toISOString()
    const gradeLevel = parseGradeNumber(student.class?.grade, student.class?.className)
    const campusName = student.class?.campus?.campusName || "Sky-Line"

    // Check existing draft for this student + testCode
    const existingDrafts = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "StudentPsychAssessment"
       WHERE "studentId" = ? AND "testCode" = ? AND "status" = 'DRAFT'
       ORDER BY "updatedAt" DESC LIMIT 1`,
      student.id,
      testCode
    )
    const existingDraft = existingDrafts[0] || null

    if (action === "SAVE_DRAFT") {
      const draftId =
        existingDraft?.id ||
        `psy_${testCode.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const lookupCode = existingDraft?.lookupCode || generateLookupCode()

      if (existingDraft) {
        await prisma.$executeRawUnsafe(
          `UPDATE "StudentPsychAssessment"
           SET "answeredCount" = ?,
               "currentStep" = ?,
               "durationSeconds" = ?,
               "answersJson" = ?,
               "studentReflection" = ?,
               "updatedAt" = ?
           WHERE "id" = ?`,
          scored.answeredCount,
          Number(currentStep || 1),
          Number(durationSeconds || 0),
          JSON.stringify(answers),
          studentReflection || existingDraft.studentReflection || "",
          nowIso,
          draftId
        )
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "StudentPsychAssessment" (
            "id", "lookupCode", "studentId", "studentCode", "studentName",
            "classId", "className", "campusName", "gradeLevel", "academicYearId",
            "testCode", "testName", "version", "status",
            "answeredCount", "totalQuestions", "currentStep", "durationSeconds",
            "answersJson", "studentReflection", "createdAt", "updatedAt"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?)`,
          draftId,
          lookupCode,
          student.id,
          student.studentCode || "",
          student.studentName || "",
          student.classId || "",
          student.class?.className || "",
          campusName,
          gradeLevel,
          academicYearId,
          testCode,
          cfg.name,
          SKL_PSYCH_VERSION,
          scored.answeredCount,
          cfg.questionCount,
          Number(currentStep || 1),
          Number(durationSeconds || 0),
          JSON.stringify(answers),
          studentReflection || "",
          nowIso,
          nowIso
        )
      }

      const savedRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "StudentPsychAssessment" WHERE "id" = ?`,
        draftId
      )

      return jsonResponse({
        success: true,
        message: "Đã lưu bản nháp bài khảo sát",
        assessment: hydratePsychRow(savedRows[0], caller.actorRole)
      })
    }

    // ACTION === "SUBMIT_ASSESSMENT"
    if (scored.answeredCount < cfg.questionCount) {
      return jsonResponse(
        {
          error: `Vui lòng hoàn thành đầy đủ ${cfg.questionCount}/${cfg.questionCount} câu hỏi trước khi nộp bài (hiện mới hoàn thành ${scored.answeredCount}/${cfg.questionCount} câu).`
        },
        400
      )
    }

    const finalId =
      existingDraft?.id ||
      `psy_${testCode.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const lookupCode = existingDraft?.lookupCode || generateLookupCode()

    if (existingDraft) {
      await prisma.$executeRawUnsafe(
        `UPDATE "StudentPsychAssessment"
         SET "status" = 'COMPLETED',
             "answeredCount" = ?,
             "totalQuestions" = ?,
             "currentStep" = ?,
             "durationSeconds" = ?,
             "answersJson" = ?,
             "primaryResultCode" = ?,
             "primaryResultLabel" = ?,
             "validityStatus" = ?,
             "scoresSummaryJson" = ?,
             "profileAnalysisJson" = ?,
             "studentReflection" = ?,
             "isPublishedToParent" = 1,
             "publishedToParentAt" = ?,
             "submittedAt" = ?,
             "updatedAt" = ?
         WHERE "id" = ?`,
        scored.answeredCount,
        cfg.questionCount,
        cfg.questionCount,
        Number(durationSeconds || 0),
        JSON.stringify(answers),
        scored.primaryResultCode,
        scored.primaryResultLabel,
        scored.validityStatus,
        JSON.stringify(scored.scoresSummary),
        JSON.stringify(scored.profileAnalysis),
        studentReflection || existingDraft.studentReflection || "",
        nowIso,
        nowIso,
        nowIso,
        finalId
      )
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "StudentPsychAssessment" (
          "id", "lookupCode", "studentId", "studentCode", "studentName",
          "classId", "className", "campusName", "gradeLevel", "academicYearId",
          "testCode", "testName", "version", "status",
          "answeredCount", "totalQuestions", "currentStep", "durationSeconds",
          "answersJson", "primaryResultCode", "primaryResultLabel", "validityStatus",
          "scoresSummaryJson", "profileAnalysisJson", "studentReflection",
          "isPublishedToParent", "publishedToParentAt", "submittedAt",
          "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
        finalId,
        lookupCode,
        student.id,
        student.studentCode || "",
        student.studentName || "",
        student.classId || "",
        student.class?.className || "",
        campusName,
        gradeLevel,
        academicYearId,
        testCode,
        cfg.name,
        SKL_PSYCH_VERSION,
        scored.answeredCount,
        cfg.questionCount,
        cfg.questionCount,
        Number(durationSeconds || 0),
        JSON.stringify(answers),
        scored.primaryResultCode,
        scored.primaryResultLabel,
        scored.validityStatus,
        JSON.stringify(scored.scoresSummary),
        JSON.stringify(scored.profileAnalysis),
        studentReflection || "",
        nowIso,
        nowIso,
        nowIso,
        nowIso
      )
    }

    // Sync to StudentHollandAssessment if testCode === 'HOLLAND'
    if (testCode === "HOLLAND" && scored.hollandReport) {
      const hr = scored.hollandReport
      const hollandMap: Record<string, boolean> = {}
      if (Array.isArray(answers)) {
        answers.forEach((v, i) => {
          if (v === true || v === false) hollandMap[String(i + 1)] = v
        })
      }
      await prisma.$executeRawUnsafe(
        `INSERT OR REPLACE INTO "StudentHollandAssessment" (
          "id", "studentId", "studentCode", "classId", "academicYearId",
          "version", "status", "answeredCount", "currentStep", "answersJson",
          "scoreR", "scoreI", "scoreA", "scoreS", "scoreE", "scoreC",
          "hollandCode", "top3Json", "reportSummaryJson", "studentReflection",
          "isPublishedToParent", "publishedToParentAt", "submittedAt",
          "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', 108, 6, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
        finalId,
        student.id,
        student.studentCode || "",
        student.classId || "",
        academicYearId,
        SKL_PSYCH_VERSION,
        JSON.stringify(hollandMap),
        hr.scores.R,
        hr.scores.I,
        hr.scores.A,
        hr.scores.S,
        hr.scores.E,
        hr.scores.C,
        hr.hollandCode,
        JSON.stringify(hr.rankedDimensions.slice(0, 3)),
        JSON.stringify(hr),
        studentReflection || "",
        nowIso,
        nowIso,
        nowIso,
        nowIso
      )
    }

    await appendAdvisoryAuditLog({
      studentId: student.id,
      actorId: caller.userId || student.id,
      actorRole: caller.actorRole,
      actorName: caller.actorName || student.studentName,
      entityType: `SKL_PSYCH_${testCode}`,
      entityId: finalId,
      action: "SUBMIT_PSYCH_ASSESSMENT",
      privacyTier: "SHARED_EDUCATIONAL",
      summary: `Học sinh ${student.studentName} hoàn thành bài khảo sát ${cfg.shortName} (${testCode}) — Kết quả: ${scored.primaryResultCode}`
    })

    // Notify Homeroom teacher
    try {
      const hmId = student?.class?.homeroomTeacherId
      if (hmId) {
        const teacher = await prisma.teacher.findFirst({
          where: { OR: [{ id: hmId }, { teacherCode: hmId }] },
          select: { userId: true }
        })
        if (teacher?.userId) {
          await prisma.notification.create({
            data: {
              userId: teacher.userId,
              title: `🧭 Học sinh hoàn thành khảo sát ${cfg.shortName} (${scored.primaryResultCode})`,
              message: `Học sinh ${student.studentName} (${student.class?.className || ""}) vừa hoàn thành bài ${cfg.name}. Kết quả: ${scored.primaryResultLabel}.`,
              link: `/teacher/co-van-hoc-tap?classId=${student.classId || ""}`
            }
          })
        }
      }
    } catch {}

    const savedRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "StudentPsychAssessment" WHERE "id" = ?`,
      finalId
    )

    return jsonResponse({
      success: true,
      message: `Chúc mừng bạn đã hoàn thành ${cfg.name}!`,
      assessment: hydratePsychRow(savedRows[0], caller.actorRole)
    })
  } catch (error: any) {
    console.error("[POST /api/advisory/psych-suite] Error:", error)
    return jsonResponse({ error: error.message || "Lỗi máy chủ khi lưu bài khảo sát" }, 500)
  }
}

export async function PATCH(req: Request) {
  try {
    await ensureTriPartyTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập hệ thống" }, 401)
    }

    const body = await req.json()
    const {
      id,
      action,
      studentReflection,
      linkedGoalIds,
      createSmartGoal,
      consultationTopic,
      consultationNote,
      advisorReviewNote,
      consultationRequestStatus,
      consultationScheduledDate,
      isPublishedToParent,
      parentFeedback
    } = body

    if (!id) {
      return jsonResponse({ error: "Thiếu mã bản ghi khảo sát (id)" }, 400)
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "StudentPsychAssessment" WHERE "id" = ? LIMIT 1`,
      id
    )
    const existing = rows[0]
    if (!existing) {
      return jsonResponse({ error: "Không tìm thấy bản ghi khảo sát" }, 404)
    }

    const rel = await verifyStudentRelationship(caller, existing.studentId)
    if (!rel.allowed || !rel.student) {
      return jsonResponse({ error: rel.reason || "Không có quyền cập nhật khảo sát này" }, 403)
    }

    const student = rel.student
    const nowIso = new Date().toISOString()

    if (action === "STUDENT_REFLECTION_AND_GOALS") {
      let currentGoalIds: string[] = []
      try {
        currentGoalIds = existing.linkedGoalIdsJson ? JSON.parse(existing.linkedGoalIdsJson) : []
      } catch {}
      const updatedGoalIds = Array.isArray(linkedGoalIds)
        ? Array.from(new Set(linkedGoalIds))
        : currentGoalIds

      if (createSmartGoal && createSmartGoal.goalContent) {
        const newGoal = await prisma.studentGoal.create({
          data: {
            studentId: student.id,
            academicYearId: existing.academicYearId || "",
            category: createSmartGoal.category || "DINH_HUONG",
            goalContent: createSmartGoal.goalContent,
            actionPlan:
              createSmartGoal.actionPlan ||
              `Liên kết từ kết quả khảo sát ${existing.testCode} (${existing.primaryResultCode})`,
            supportNeeded:
              createSmartGoal.supportNeeded || "Mong muốn GVCN/CVHT định hướng lộ trình phù hợp.",
            deadline: createSmartGoal.deadline || "Học kỳ này",
            status: "IN_PROGRESS"
          }
        })
        updatedGoalIds.push(newGoal.id)
      }

      await prisma.$executeRawUnsafe(
        `UPDATE "StudentPsychAssessment"
         SET "studentReflection" = ?,
             "linkedGoalIdsJson" = ?,
             "updatedAt" = ?
         WHERE "id" = ?`,
        studentReflection !== undefined ? studentReflection : existing.studentReflection || "",
        JSON.stringify(updatedGoalIds),
        nowIso,
        id
      )

      if (existing.testCode === "HOLLAND") {
        await prisma
          .$executeRawUnsafe(
            `UPDATE "StudentHollandAssessment"
             SET "studentReflection" = ?, "linkedGoalIdsJson" = ?, "updatedAt" = ?
             WHERE "id" = ?`,
            studentReflection !== undefined ? studentReflection : existing.studentReflection || "",
            JSON.stringify(updatedGoalIds),
            nowIso,
            id
          )
          .catch(() => {})
      }
    } else if (action === "REQUEST_CONSULTATION_1ON1") {
      const topic =
        consultationTopic ||
        `Tư vấn kết quả ${existing.testCode} (${existing.primaryResultCode})`
      const note =
        consultationNote ||
        "Mong muốn được Thầy/Cô GVCN tư vấn 1:1 về kết quả khảo sát tâm lý & định hướng học tập."

      await prisma.$executeRawUnsafe(
        `UPDATE "StudentPsychAssessment"
         SET "consultationRequested" = 1,
             "consultationRequestTopic" = ?,
             "consultationRequestNote" = ?,
             "consultationRequestStatus" = 'PENDING',
             "updatedAt" = ?
         WHERE "id" = ?`,
        topic,
        note,
        nowIso,
        id
      )

      if (existing.testCode === "HOLLAND") {
        await prisma
          .$executeRawUnsafe(
            `UPDATE "StudentHollandAssessment"
             SET "consultationRequested" = 1,
                 "consultationRequestTopic" = ?,
                 "consultationRequestNote" = ?,
                 "consultationRequestStatus" = 'PENDING',
                 "updatedAt" = ?
             WHERE "id" = ?`,
            topic,
            note,
            nowIso,
            id
          )
          .catch(() => {})
      }
    } else if (action === "ADVISOR_REVIEW_AND_PUBLISH") {
      if (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN") {
        return jsonResponse({ error: "Chỉ GVCN/CVHT hoặc Admin mới có quyền phê duyệt" }, 403)
      }
      const pubFlag =
        isPublishedToParent !== undefined
          ? isPublishedToParent
            ? 1
            : 0
          : Number(existing.isPublishedToParent ?? 1)
      const newStatus =
        consultationRequestStatus || existing.consultationRequestStatus || "NONE"

      await prisma.$executeRawUnsafe(
        `UPDATE "StudentPsychAssessment"
         SET "advisorId" = ?,
             "advisorName" = ?,
             "advisorReviewNote" = ?,
             "consultationRequestStatus" = ?,
             "consultationScheduledDate" = ?,
             "isPublishedToParent" = ?,
             "publishedToParentAt" = ?,
             "updatedAt" = ?
         WHERE "id" = ?`,
        caller.teacherId || caller.userId,
        caller.actorName || "GVCN/CVHT",
        advisorReviewNote !== undefined ? advisorReviewNote : existing.advisorReviewNote || "",
        newStatus,
        consultationScheduledDate !== undefined
          ? consultationScheduledDate
          : existing.consultationScheduledDate || "",
        pubFlag,
        pubFlag === 1 ? existing.publishedToParentAt || nowIso : null,
        nowIso,
        id
      )

      if (existing.testCode === "HOLLAND") {
        await prisma
          .$executeRawUnsafe(
            `UPDATE "StudentHollandAssessment"
             SET "advisorId" = ?,
                 "advisorName" = ?,
                 "advisorReviewNote" = ?,
                 "consultationRequestStatus" = ?,
                 "consultationScheduledDate" = ?,
                 "isPublishedToParent" = ?,
                 "publishedToParentAt" = ?,
                 "updatedAt" = ?
             WHERE "id" = ?`,
            caller.teacherId || caller.userId,
            caller.actorName || "GVCN/CVHT",
            advisorReviewNote !== undefined ? advisorReviewNote : existing.advisorReviewNote || "",
            newStatus,
            consultationScheduledDate !== undefined
              ? consultationScheduledDate
              : existing.consultationScheduledDate || "",
            pubFlag,
            pubFlag === 1 ? existing.publishedToParentAt || nowIso : null,
            nowIso,
            id
          )
          .catch(() => {})
      }
    } else if (action === "PARENT_FEEDBACK") {
      await prisma.$executeRawUnsafe(
        `UPDATE "StudentPsychAssessment"
         SET "parentAcknowledged" = 1,
             "parentAcknowledgedAt" = COALESCE("parentAcknowledgedAt", ?),
             "parentFeedback" = ?,
             "updatedAt" = ?
         WHERE "id" = ?`,
        nowIso,
        parentFeedback !== undefined ? parentFeedback : existing.parentFeedback || "",
        nowIso,
        id
      )

      if (existing.testCode === "HOLLAND") {
        await prisma
          .$executeRawUnsafe(
            `UPDATE "StudentHollandAssessment"
             SET "parentAcknowledged" = 1,
                 "parentAcknowledgedAt" = COALESCE("parentAcknowledgedAt", ?),
                 "parentFeedback" = ?,
                 "updatedAt" = ?
             WHERE "id" = ?`,
            nowIso,
            parentFeedback !== undefined ? parentFeedback : existing.parentFeedback || "",
            nowIso,
            id
          )
          .catch(() => {})
      }
    } else {
      return jsonResponse({ error: "Hành động cập nhật không hợp lệ" }, 400)
    }

    const updatedRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "StudentPsychAssessment" WHERE "id" = ? LIMIT 1`,
      id
    )

    return jsonResponse({
      success: true,
      assessment: hydratePsychRow(updatedRows[0], caller.actorRole)
    })
  } catch (error: any) {
    console.error("[PATCH /api/advisory/psych-suite] Error:", error)
    return jsonResponse({ error: error.message || "Lỗi máy chủ khi cập nhật khảo sát" }, 500)
  }
}
