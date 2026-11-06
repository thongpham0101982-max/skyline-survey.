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

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  return res
}

export async function syncHollandToOrientationRecord(params: {
  studentId: string
  classId?: string | null
  academicYearId?: string
  assessmentId: string
  hollandCode: string
  scores: Record<string, number>
  topGroups: any[]
  surveyBatch?: string
  surveyDate?: string
}) {
  await ensureTriPartyTables()
  const {
    studentId,
    classId = null,
    academicYearId = "",
    assessmentId,
    hollandCode,
    scores,
    topGroups,
    surveyBatch = "Đợt khảo sát chính thức",
    surveyDate
  } = params

  const existingRows: any[] = await prisma.$queryRawUnsafe(
    `SELECT * FROM "OrientationAdvisoryRecord"
     WHERE "studentId" = ? AND ("academicYearId" = ? OR "academicYearId" = '')
     LIMIT 1`,
    studentId,
    academicYearId
  )
  const existing = existingRows[0]
  const id = existing?.id || `ori_${studentId}_${academicYearId || "default"}`

  // Preserve workflowStatus if already assigned/in progress/completed, otherwise set CHO_PHAN_CONG
  const nextStatus =
    existing &&
    ["CHO_TIEP_NHAN", "DANG_TU_VAN", "DA_TU_VAN"].includes(existing.workflowStatus)
      ? existing.workflowStatus
      : "CHO_PHAN_CONG"

  const isSameAssessment = existing?.activeAssessmentId === assessmentId
  const alreadyNotified = Boolean(Number(existing?.notifiedCoordinator ?? 0)) && isSameAssessment

  await prisma.$executeRawUnsafe(
    `INSERT INTO "OrientationAdvisoryRecord" (
      "id", "studentId", "classId", "academicYearId",
      "activeAssessmentId", "hollandCode", "scoresJson", "topGroupsJson",
      "surveyBatch", "surveyDate", "workflowStatus", "notifiedCoordinator",
      "createdAt", "updatedAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT("studentId", "academicYearId") DO UPDATE SET
      "activeAssessmentId" = excluded."activeAssessmentId",
      "hollandCode" = excluded."hollandCode",
      "scoresJson" = excluded."scoresJson",
      "topGroupsJson" = excluded."topGroupsJson",
      "surveyBatch" = excluded."surveyBatch",
      "surveyDate" = COALESCE(excluded."surveyDate", "OrientationAdvisoryRecord"."surveyDate"),
      "workflowStatus" = CASE
        WHEN "OrientationAdvisoryRecord"."workflowStatus" IN ('CHO_TIEP_NHAN', 'DANG_TU_VAN', 'DA_TU_VAN')
        THEN "OrientationAdvisoryRecord"."workflowStatus"
        ELSE 'CHO_PHAN_CONG'
      END,
      "notifiedCoordinator" = 1,
      "updatedAt" = CURRENT_TIMESTAMP`,
    id,
    studentId,
    classId,
    academicYearId,
    assessmentId,
    hollandCode,
    JSON.stringify(scores || {}),
    JSON.stringify(topGroups || []),
    surveyBatch,
    surveyDate || null,
    nextStatus,
    1
  )

  return { id, workflowStatus: nextStatus, alreadyNotified }
}

export async function GET(req: Request) {
  try {
    await ensureTriPartyTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập" }, 401)
    }

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId") || (caller.actorRole === "STUDENT" ? caller.studentId : "")
    const classId = searchParams.get("classId") || ""
    const academicYearId = searchParams.get("academicYearId") || ""
    const assignedToMe = searchParams.get("assignedToMe") === "1"

    // Fetch active TLHN / Counseling teachers and grade-level special subjects / experiential activities
    const [allTeachers, specialSubjects, experientialCatalogs] = await Promise.all([
      prisma.teacher
        .findMany({
          include: { departmentRel: { select: { name: true, code: true } } },
          orderBy: { teacherName: "asc" },
          take: 250
        })
        .catch(() => []),
      (prisma as any).specialSubject
        ?.findMany({
          where: { isActive: true },
          select: { id: true, code: true, name: true, description: true }
        })
        .catch(() => []) || [],
      (prisma as any).experientialActivity
        ?.findMany({
          select: { id: true, title: true, category: true, gradeLevels: true },
          orderBy: { createdAt: "desc" },
          take: 30
        })
        .catch(() => []) || []
    ])

    // Prioritize teachers in Tâm lý / Hướng nghiệp / Kỹ năng / Công tác HS, fallback to all teachers
    const tlhnMembers = allTeachers.map((t: any) => {
      const deptName = (t.departmentRel?.name || t.department || "").toLowerCase()
      const posName = (t.position || "").toLowerCase()
      const isTlhnDept =
        deptName.includes("tâm lý") ||
        deptName.includes("hướng nghiệp") ||
        deptName.includes("tlhn") ||
        deptName.includes("kỹ năng") ||
        deptName.includes("công dân") ||
        deptName.includes("trải nghiệm") ||
        posName.includes("tâm lý") ||
        posName.includes("hướng nghiệp") ||
        posName.includes("cố vấn")
      return {
        id: t.id,
        teacherCode: t.teacherCode,
        teacherName: t.teacherName,
        departmentName: t.departmentRel?.name || t.department || "Tổ chuyên môn",
        isTlhnSpecialist: isTlhnDept
      }
    }).sort((a: any, b: any) => Number(b.isTlhnSpecialist) - Number(a.isTlhnSpecialist))

    const catalogActivities = [
      ...specialSubjects.map((s: any) => ({
        id: `SPEC_${s.code || s.id}`,
        type: "MON_DAC_THU",
        label: `[Môn đặc thù] ${s.name} (${s.code})`
      })),
      ...experientialCatalogs.map((e: any) => ({
        id: `EXP_${e.id}`,
        type: "HOAT_DONG_TRAI_NGHIEM",
        label: `[Hoạt động trải nghiệm] ${e.title}`
      })),
      { id: "TOPIC_STEM_AI", type: "CHU_DE", label: "[Chủ đề định hướng] Khám phá Khoa học, Công nghệ & AI (STEM)" },
      { id: "TOPIC_ECON_BIZ", type: "CHU_DE", label: "[Chủ đề định hướng] Quản trị kinh doanh, Tài chính & Khởi nghiệp" },
      { id: "TOPIC_MEDIA_ART", type: "CHU_DE", label: "[Chủ đề định hướng] Truyền thông đa phương tiện, Thiết kế & Nghệ thuật" },
      { id: "TOPIC_SOCIAL_EDU", type: "CHU_DE", label: "[Chủ đề định hướng] Khoa học Xã hội, Giáo dục & Tâm lý cộng đồng" }
    ]

    let targetStudentIds: string[] = []
    const studentMap = new Map<string, any>()

    if (studentId) {
      const rel = await verifyStudentRelationship(caller, studentId)
      if (!rel.allowed || !rel.student) {
        return jsonResponse({ error: rel.reason || "Không có quyền xem hồ sơ định hướng học sinh này" }, 403)
      }
      targetStudentIds = rel.allStudentIds.length > 0 ? rel.allStudentIds : [rel.student.id]
      studentMap.set(rel.student.id, rel.student)
    } else if (classId) {
      if (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN") {
        return jsonResponse({ error: "Không có quyền truy cập theo lớp" }, 403)
      }
      const clsStudents = await prisma.student
        .findMany({
          where: { classId, status: { not: "TRANSFERRED_OUT" } },
          select: {
            id: true,
            studentName: true,
            studentCode: true,
            classId: true,
            class: { select: { className: true, grade: true } }
          }
        })
        .catch(() => [])
      targetStudentIds = clsStudents.map(s => s.id)
      for (const s of clsStudents) studentMap.set(s.id, s)
    } else if (assignedToMe && caller.teacherId) {
      const myRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "OrientationAdvisoryRecord" WHERE "assignedTlhnTeacherId" = ? ORDER BY "updatedAt" DESC`,
        caller.teacherId
      )
      targetStudentIds = Array.from(new Set(myRows.map(r => r.studentId).filter(Boolean)))
      if (targetStudentIds.length > 0) {
        const sts = await prisma.student.findMany({
          where: { id: { in: targetStudentIds } },
          select: {
            id: true,
            studentName: true,
            studentCode: true,
            classId: true,
            class: { select: { className: true, grade: true } }
          }
        })
        for (const s of sts) studentMap.set(s.id, s)
      }
    }

    if (targetStudentIds.length === 0) {
      return jsonResponse({
        records: [],
        assessmentHistory: [],
        tlhnMembers,
        catalogActivities
      })
    }

    const placeholders = targetStudentIds.map(() => "?").join(",")

    // Auto-sync any completed Holland assessment that does not yet have an OrientationAdvisoryRecord
    const [hollandRows, psychHollandRows] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "StudentHollandAssessment"
         WHERE "studentId" IN (${placeholders}) AND "status" = 'COMPLETED'
         ORDER BY "updatedAt" DESC`,
        ...targetStudentIds
      ).catch(() => []),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "StudentPsychAssessment"
         WHERE "studentId" IN (${placeholders}) AND "testCode" = 'HOLLAND' AND "status" = 'COMPLETED'
         ORDER BY "updatedAt" DESC`,
        ...targetStudentIds
      ).catch(() => [])
    ])

    const historyByStudent = new Map<string, any[]>()
    for (const h of hollandRows) {
      let top3: any[] = []
      try {
        top3 = h.top3Json ? JSON.parse(h.top3Json) : []
      } catch {}
      const item = {
        id: h.id,
        studentId: h.studentId,
        hollandCode: h.hollandCode || "",
        scores: {
          R: Number(h.scoreR || 0),
          I: Number(h.scoreI || 0),
          A: Number(h.scoreA || 0),
          S: Number(h.scoreS || 0),
          E: Number(h.scoreE || 0),
          C: Number(h.scoreC || 0)
        },
        topGroups: top3,
        version: h.version || "SKL_PSYCH v2.6.1",
        surveyBatch: "Đợt khảo sát RIASEC 108 câu",
        submittedAt: h.submittedAt || h.updatedAt
      }
      const arr = historyByStudent.get(h.studentId) || []
      arr.push(item)
      historyByStudent.set(h.studentId, arr)
    }

    for (const p of psychHollandRows) {
      let scoresObj: any = {}
      let analysisObj: any = {}
      try {
        scoresObj = p.scoresSummaryJson ? JSON.parse(p.scoresSummaryJson) : {}
      } catch {}
      try {
        analysisObj = p.profileAnalysisJson ? JSON.parse(p.profileAnalysisJson) : {}
      } catch {}
      const item = {
        id: p.id,
        studentId: p.studentId,
        hollandCode: p.primaryResultCode || "",
        scores: {
          R: Number(scoresObj.R || 0),
          I: Number(scoresObj.I || 0),
          A: Number(scoresObj.A || 0),
          S: Number(scoresObj.S || 0),
          E: Number(scoresObj.E || 0),
          C: Number(scoresObj.C || 0)
        },
        topGroups: analysisObj.top3 || [],
        version: p.version || "SKL_PSYCH v2.6.1",
        surveyBatch: "Đợt khảo sát SKL_PSYCH",
        submittedAt: p.submittedAt || p.updatedAt
      }
      const arr = historyByStudent.get(p.studentId) || []
      if (!arr.some(x => x.id === item.id)) arr.push(item)
      historyByStudent.set(p.studentId, arr)
    }

    for (const [stId, hist] of historyByStudent.entries()) {
      if (hist.length > 0) {
        const latest = hist[0]
        const st = studentMap.get(stId)
        await syncHollandToOrientationRecord({
          studentId: stId,
          classId: st?.classId || classId || null,
          academicYearId,
          assessmentId: latest.id,
          hollandCode: latest.hollandCode,
          scores: latest.scores,
          topGroups: latest.topGroups,
          surveyBatch: latest.surveyBatch,
          surveyDate: latest.submittedAt
        })
      }
    }

    const recordRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "OrientationAdvisoryRecord"
       WHERE "studentId" IN (${placeholders})
       ORDER BY "updatedAt" DESC`,
      ...targetStudentIds
    )

    const hydratedRecords = recordRows.map(r => {
      const st = studentMap.get(r.studentId)
      let scores: any = {}
      let topGroups: any[] = []
      let linkedSpecialSubjects: string[] = []
      try {
        scores = r.scoresJson ? JSON.parse(r.scoresJson) : {}
      } catch {}
      try {
        topGroups = r.topGroupsJson ? JSON.parse(r.topGroupsJson) : []
      } catch {}
      try {
        linkedSpecialSubjects = r.linkedSpecialSubjectsJson ? JSON.parse(r.linkedSpecialSubjectsJson) : []
      } catch {}

      return {
        ...r,
        studentName: st?.studentName || "Học sinh",
        studentCode: st?.studentCode || "",
        className: st?.class?.className || "",
        gradeLevel: st?.class?.grade || "",
        scores,
        topGroups,
        linkedSpecialSubjects,
        isPublishedToParent: Boolean(Number(r.isPublishedToParent ?? 0)),
        assessmentHistory: historyByStudent.get(r.studentId) || []
      }
    })

    // Filter for Parent role: only show published explanations/results
    const visibleRecords =
      caller.actorRole === "PARENT"
        ? hydratedRecords.map(r => ({
            ...r,
            tlhnDiscussionNotes: r.isPublishedToParent ? r.tlhnDiscussionNotes : ""
          }))
        : hydratedRecords

    return jsonResponse({
      records: visibleRecords,
      assessmentHistory: studentId ? historyByStudent.get(targetStudentIds[0]) || [] : [],
      tlhnMembers,
      catalogActivities
    })
  } catch (error: any) {
    console.error("GET /api/advisory/orientation-tracking error:", error)
    return jsonResponse({ error: error.message || "Lỗi tải hồ sơ định hướng Holland" }, 500)
  }
}

export async function POST(req: Request) {
  try {
    await ensureTriPartyTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated || (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN")) {
      return jsonResponse({ error: "Không có quyền thực hiện thao tác này" }, 403)
    }

    const body = await req.json()
    const {
      action,
      studentId,
      academicYearId = "",
      activeAssessmentId,
      assignedTlhnTeacherId,
      assignedTlhnTeacherName,
      assignmentPrompt,
      expectedOutcome,
      dueDate,
      acceptStatus,
      rejectReason,
      tlhnDiscussionNotes,
      studentInterestsAndStrengths,
      studentConcernsAndAspirations,
      proposedDevelopmentGoals,
      agreedGoalText,
      linkedSpecialSubjects = [],
      tlhnEvidenceAndNextSteps,
      isPublishedToParent
    } = body

    if (!studentId) {
      return jsonResponse({ error: "Thiếu định danh học sinh (studentId)" }, 400)
    }

    const rel = await verifyStudentRelationship(caller, studentId)
    if (!rel.allowed || !rel.student) {
      return jsonResponse({ error: rel.reason || "Không có quyền thao tác trên học sinh này" }, 403)
    }

    const existingRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "OrientationAdvisoryRecord"
       WHERE "studentId" = ?
       ORDER BY "updatedAt" DESC LIMIT 1`,
      rel.student.id
    )
    const existing = existingRows[0]
    const recordId = existing?.id || `ori_${rel.student.id}_${academicYearId || "default"}`

    // 1. Switch which Holland assessment in history is used as counseling basis
    if (action === "SET_ACTIVE_ASSESSMENT" && activeAssessmentId) {
      await prisma.$executeRawUnsafe(
        `UPDATE "OrientationAdvisoryRecord"
         SET "activeAssessmentId" = ?, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = ?`,
        activeAssessmentId,
        recordId
      )
      return jsonResponse({ success: true })
    }

    // 2. GVCN/CVHT or Coordinator assigns a TLHN teacher
    if (action === "ASSIGN_TLHN") {
      if (!assignedTlhnTeacherId || !assignmentPrompt?.trim()) {
        return jsonResponse({ error: "Vui lòng chọn Giáo viên Tổ TLHN và nhập nội dung tư vấn" }, 400)
      }

      if (existing) {
        await prisma.$executeRawUnsafe(
          `UPDATE "OrientationAdvisoryRecord"
           SET "assignedById" = ?,
               "assignedByName" = ?,
               "assignedTlhnTeacherId" = ?,
               "assignedTlhnTeacherName" = ?,
               "assignmentPrompt" = ?,
               "expectedOutcome" = ?,
               "dueDate" = ?,
               "workflowStatus" = 'CHO_TIEP_NHAN',
               "rejectReason" = NULL,
               "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = ?`,
          caller.teacherId || caller.userId,
          caller.actorName || "GVCN / Điều phối",
          assignedTlhnTeacherId,
          assignedTlhnTeacherName || "GV Tổ TLHN",
          assignmentPrompt.trim(),
          expectedOutcome || "",
          dueDate || null,
          recordId
        )
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "OrientationAdvisoryRecord" (
            "id", "studentId", "classId", "academicYearId", "activeAssessmentId",
            "assignedById", "assignedByName", "assignedTlhnTeacherId", "assignedTlhnTeacherName",
            "assignmentPrompt", "expectedOutcome", "dueDate", "workflowStatus",
            "createdAt", "updatedAt"
          ) VALUES (?, ?, ?, ?, 'MANUAL', ?, ?, ?, ?, ?, ?, ?, 'CHO_TIEP_NHAN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          recordId,
          rel.student.id,
          rel.student.classId || null,
          academicYearId || rel.student.academicYearId || "",
          caller.teacherId || caller.userId,
          caller.actorName || "GVCN / Điều phối",
          assignedTlhnTeacherId,
          assignedTlhnTeacherName || "GV Tổ TLHN",
          assignmentPrompt.trim(),
          expectedOutcome || "",
          dueDate || null
        )
      }

      // Sync to SubjectTeacherAdvisoryTask with companionType = 'TLHN' (anti-duplicate check)
      const existingTaskRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT "id" FROM "SubjectTeacherAdvisoryTask"
         WHERE "studentId" = ? AND "companionType" = 'TLHN' AND "assignedToTeacherId" = ?
         LIMIT 1`,
        rel.student.id,
        assignedTlhnTeacherId
      )

      if (existingTaskRows.length > 0) {
        await prisma.$executeRawUnsafe(
          `UPDATE "SubjectTeacherAdvisoryTask"
           SET "consultationPrompt" = ?,
               "supportGoal" = ?,
               "expectedOutcome" = ?,
               "dueDate" = ?,
               "status" = 'CHO_TIEP_NHAN',
               "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = ?`,
          assignmentPrompt.trim(),
          expectedOutcome || "Tư vấn Holland & Định hướng phát triển",
          expectedOutcome || "",
          dueDate || null,
          existingTaskRows[0].id
        )
      } else {
        const taskId = `tlhn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        await prisma.$executeRawUnsafe(
          `INSERT INTO "SubjectTeacherAdvisoryTask" (
            "id", "studentId", "classId", "academicYearId",
            "subjectName", "assignedByTeacherId", "assignedByTeacherName",
            "assignedToTeacherId", "assignedToTeacherName",
            "consultationPrompt", "supportGoal", "expectedOutcome",
            "dueDate", "status", "companionType", "goalCategory",
            "createdAt", "updatedAt"
          ) VALUES (?, ?, ?, ?, 'Tư vấn Tâm lý – Hướng nghiệp (Holland)', ?, ?, ?, ?, ?, ?, ?, ?, 'CHO_TIEP_NHAN', 'TLHN', 'DINH_HUONG', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          taskId,
          rel.student.id,
          rel.student.classId || null,
          academicYearId || rel.student.academicYearId || "",
          caller.teacherId || caller.userId,
          caller.actorName || "GVCN / Điều phối",
          assignedTlhnTeacherId,
          assignedTlhnTeacherName || "GV Tổ TLHN",
          assignmentPrompt.trim(),
          expectedOutcome || "Tư vấn Holland & Định hướng phát triển",
          expectedOutcome || "",
          dueDate || null
        )
      }

      // Send notification to assigned TLHN teacher
      try {
        const tlhnTeacher = await prisma.teacher.findUnique({
          where: { id: assignedTlhnTeacherId },
          select: { userId: true }
        })
        if (tlhnTeacher?.userId) {
          await prisma.notification.create({
            data: {
              userId: tlhnTeacher.userId,
              title: `[Tổ TLHN] Phân công tư vấn Định hướng phát triển cho HS ${rel.student.studentName}`,
              message: `Nội dung: ${assignmentPrompt.trim()}. Kết quả mong đợi: ${expectedOutcome || "Thống nhất mục tiêu định hướng phát triển"}.`,
              link: `/teacher/co-van-hoc-tap?classId=${rel.student.classId || ""}&tab=companion_support`
            }
          })
        }
      } catch {}

      await appendAdvisoryAuditLog({
        studentId: rel.student.id,
        actorId: caller.userId,
        actorRole: caller.actorRole,
        actorName: caller.actorName,
        entityType: "CONSULTATION",
        entityId: recordId,
        action: "ASSIGN_TLHN_ADVISOR",
        privacyTier: "SHARED_EDUCATIONAL",
        summary: `Phân công GV Tổ TLHN (${assignedTlhnTeacherName}) tư vấn Holland & Định hướng phát triển`
      })

      return jsonResponse({ success: true, workflowStatus: "CHO_TIEP_NHAN" })
    }

    // 3. GV TLHN accepts or declines the assignment
    if (action === "RESPOND_ASSIGNMENT") {
      const nextWorkflowStatus = acceptStatus === "ACCEPT" ? "DANG_TU_VAN" : "CHO_PHAN_CONG"
      await prisma.$executeRawUnsafe(
        `UPDATE "OrientationAdvisoryRecord"
         SET "workflowStatus" = ?,
             "acceptedAt" = CASE WHEN ? = 'ACCEPT' THEN CURRENT_TIMESTAMP ELSE NULL END,
             "rejectReason" = ?,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = ?`,
        nextWorkflowStatus,
        acceptStatus,
        rejectReason || null,
        recordId
      )

      await prisma.$executeRawUnsafe(
        `UPDATE "SubjectTeacherAdvisoryTask"
         SET "status" = ?,
             "declineReason" = ?,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "studentId" = ? AND "companionType" = 'TLHN'`,
        acceptStatus === "ACCEPT" ? "DANG_HO_TRO" : "CAN_BO_SUNG",
        rejectReason || null,
        rel.student.id
      )

      return jsonResponse({ success: true, workflowStatus: nextWorkflowStatus })
    }

    // 4. GV TLHN updates consultation notes, proposed goals, agreed goal, linked subjects & completes counseling
    if (action === "UPDATE_TLHN_COUNSELING") {
      const markComplete = Boolean(body.markCompleted)
      const nextWorkflowStatus = markComplete ? "DA_TU_VAN" : "DANG_TU_VAN"

      let agreedGoalId = existing?.agreedGoalId || null

      // Only create or update a DINH_HUONG goal when explicitly agreed between TLHN, CVHT & Student!
      if (agreedGoalText && String(agreedGoalText).trim()) {
        const existingOrientationGoals = await prisma.studentGoal
          .findMany({
            where: {
              studentId: rel.student.id,
              category: "DINH_HUONG"
            },
            orderBy: { createdAt: "desc" },
            take: 1
          })
          .catch(() => [])

        if (existingOrientationGoals.length > 0) {
          agreedGoalId = existingOrientationGoals[0].id
          await prisma.studentGoal
            .update({
              where: { id: agreedGoalId },
              data: {
                targetText: String(agreedGoalText).trim(),
                teacherComment: tlhnEvidenceAndNextSteps || proposedDevelopmentGoals || undefined
              }
            })
            .catch(() => {})
        } else {
          const createdGoal = await prisma.studentGoal
            .create({
              data: {
                studentId: rel.student.id,
                academicYearId: academicYearId || rel.student.academicYearId || "",
                gradeLevel: rel.student.class?.grade ? `K${String(rel.student.class.grade).replace(/\D/g, "")}` : "K12",
                semester: "CA_NAM",
                category: "DINH_HUONG",
                targetText: String(agreedGoalText).trim(),
                status: "SUBMITTED",
                teacherComment: tlhnEvidenceAndNextSteps || proposedDevelopmentGoals || null,
                signedByStudent: true,
                signedByTeacher: markComplete
              }
            })
            .catch(() => null)
          if (createdGoal) agreedGoalId = createdGoal.id
        }
      }

      await prisma.$executeRawUnsafe(
        `UPDATE "OrientationAdvisoryRecord"
         SET "tlhnDiscussionNotes" = ?,
             "studentInterestsAndStrengths" = ?,
             "studentConcernsAndAspirations" = ?,
             "proposedDevelopmentGoals" = ?,
             "agreedGoalId" = ?,
             "agreedGoalText" = ?,
             "linkedSpecialSubjectsJson" = ?,
             "tlhnEvidenceAndNextSteps" = ?,
             "isPublishedToParent" = ?,
             "workflowStatus" = ?,
             "completedAt" = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE "completedAt" END,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = ?`,
        tlhnDiscussionNotes || "",
        studentInterestsAndStrengths || "",
        studentConcernsAndAspirations || "",
        proposedDevelopmentGoals || "",
        agreedGoalId,
        agreedGoalText || "",
        JSON.stringify(Array.isArray(linkedSpecialSubjects) ? linkedSpecialSubjects : []),
        tlhnEvidenceAndNextSteps || "",
        isPublishedToParent ? 1 : 0,
        nextWorkflowStatus,
        markComplete ? 1 : 0,
        recordId
      )

      await prisma.$executeRawUnsafe(
        `UPDATE "SubjectTeacherAdvisoryTask"
         SET "gvbmProfessionalAssessment" = ?,
             "gvbmProposedSolutions" = ?,
             "evidenceAndProposal" = ?,
             "status" = ?,
             "gvbmRespondedAt" = CURRENT_TIMESTAMP,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "studentId" = ? AND "companionType" = 'TLHN'`,
        `${studentInterestsAndStrengths || ""} | ${studentConcernsAndAspirations || ""}`.trim(),
        proposedDevelopmentGoals || agreedGoalText || "",
        tlhnEvidenceAndNextSteps || "",
        markComplete ? "CHO_XAC_NHAN" : "DANG_HO_TRO",
        rel.student.id
      )

      await appendAdvisoryAuditLog({
        studentId: rel.student.id,
        actorId: caller.userId,
        actorRole: caller.actorRole,
        actorName: caller.actorName,
        entityType: "CONSULTATION",
        entityId: recordId,
        action: markComplete ? "COMPLETE_TLHN_COUNSELING" : "UPDATE_TLHN_COUNSELING",
        privacyTier: isPublishedToParent ? "SHARED_EDUCATIONAL" : "PRIVATE_ADVISORY",
        summary: markComplete
          ? `GV TLHN hoàn tất tư vấn Holland & thống nhất mục tiêu Định hướng phát triển`
          : `GV TLHN cập nhật hồ sơ tư vấn Định hướng phát triển`
      })

      return jsonResponse({
        success: true,
        workflowStatus: nextWorkflowStatus,
        agreedGoalId
      })
    }

    return jsonResponse({ error: "Hành động không hợp lệ" }, 400)
  } catch (error: any) {
    console.error("POST /api/advisory/orientation-tracking error:", error)
    return jsonResponse({ error: error.message || "Không thể lưu hồ sơ định hướng" }, 500)
  }
}
