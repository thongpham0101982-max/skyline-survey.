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
  HOLLAND_108_QUESTIONS,
  RIASEC_PROFILES,
  SKL_PSYCH_VERSION,
  calculateHollandResult
} from "@/lib/advisory/holland-skl-psych"
import { syncHollandToOrientationRecord } from "@/app/api/advisory/orientation-tracking/route"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  return res
}

function hydrateAssessmentRow(row: any, callerRole: string) {
  if (!row) return null
  let answers: Record<string, any> = {}
  let top3: any[] = []
  let reportSummary: any = null
  let linkedGoalIds: string[] = []

  try {
    answers = row.answersJson ? JSON.parse(row.answersJson) : {}
  } catch {}
  try {
    top3 = row.top3Json ? JSON.parse(row.top3Json) : []
  } catch {}
  try {
    reportSummary = row.reportSummaryJson ? JSON.parse(row.reportSummaryJson) : null
  } catch {}
  try {
    linkedGoalIds = row.linkedGoalIdsJson ? JSON.parse(row.linkedGoalIdsJson) : []
  } catch {}

  if (!reportSummary && row.status === "COMPLETED") {
    reportSummary = calculateHollandResult(answers)
  }

  return {
    id: row.id,
    studentId: row.studentId,
    studentCode: row.studentCode,
    classId: row.classId,
    academicYearId: row.academicYearId,
    version: row.version || SKL_PSYCH_VERSION,
    status: row.status,
    answeredCount: Number(row.answeredCount || 0),
    currentStep: Number(row.currentStep || 1),
    answers: callerRole === "PARENT" ? undefined : answers,
    scores: {
      R: Number(row.scoreR || 0),
      I: Number(row.scoreI || 0),
      A: Number(row.scoreA || 0),
      S: Number(row.scoreS || 0),
      E: Number(row.scoreE || 0),
      C: Number(row.scoreC || 0)
    },
    hollandCode: row.hollandCode || reportSummary?.hollandCode || null,
    top3,
    reportSummary,
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
    isPublishedToParent: Boolean(row.isPublishedToParent),
    publishedToParentAt: row.publishedToParentAt || null,
    parentAcknowledged: Boolean(row.parentAcknowledged),
    parentAcknowledgedAt: row.parentAcknowledgedAt || null,
    parentFeedback: row.parentFeedback || "",
    submittedAt: row.submittedAt || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isReferenceEvidenceOnly: true
  }
}

async function notifyHomeroomTeacher(
  student: any,
  title: string,
  message: string,
  link = "/teacher/co-van-hoc-tap"
) {
  try {
    const hmId = student?.class?.homeroomTeacherId
    if (!hmId) return
    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [{ id: hmId }, { teacherCode: hmId }]
      },
      select: { userId: true }
    })
    if (teacher?.userId) {
      await prisma.notification.create({
        data: {
          userId: teacher.userId,
          title,
          message,
          link
        }
      })
    }
  } catch (e) {
    console.warn("[Holland Notify Teacher Warning]:", e)
  }
}

async function notifyLinkedParents(
  studentId: string,
  title: string,
  message: string,
  link = "/parent/children/advisory"
) {
  try {
    const links = await prisma.parentStudentLink.findMany({
      where: { studentId, status: "ACTIVE" },
      include: { parent: { select: { userId: true } } }
    })
    for (const lnk of links) {
      if (lnk.parent?.userId) {
        await prisma.notification
          .create({
            data: {
              userId: lnk.parent.userId,
              title,
              message,
              link
            }
          })
          .catch(() => {})
      }
    }
  } catch (e) {
    console.warn("[Holland Notify Parent Warning]:", e)
  }
}

export async function GET(req: Request) {
  try {
    await ensureTriPartyTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập hệ thống" }, 401)
    }

    const { searchParams } = new URL(req.url)
    const studentIdParam = searchParams.get("studentId") || ""
    const studentCodeParam = searchParams.get("studentCode") || ""
    const classIdParam = searchParams.get("classId") || ""
    const includeQuestions = searchParams.get("includeQuestions") === "1"

    // Case 1: Class-wide summary for Teacher / CVHT / Admin
    if (classIdParam && !studentIdParam && !studentCodeParam) {
      if (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN") {
        return jsonResponse({ error: "Không có quyền truy cập danh sách lớp" }, 403)
      }
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "StudentHollandAssessment" WHERE "classId" = ? ORDER BY "updatedAt" DESC`,
        classIdParam
      )
      return jsonResponse({
        success: true,
        version: SKL_PSYCH_VERSION,
        assessments: rows.map(r => hydrateAssessmentRow(r, caller.actorRole))
      })
    }

    // Case 2: Single student lookup
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
        { error: rel.reason || "Không có quyền truy cập dữ liệu Holland của học sinh này" },
        403
      )
    }

    const allIds = rel.allStudentIds.length > 0 ? rel.allStudentIds : [rel.student.id]
    const placeholders = allIds.map(() => "?").join(", ")

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "StudentHollandAssessment"
       WHERE "studentId" IN (${placeholders})
          OR ("studentCode" IS NOT NULL AND "studentCode" = ?)
       ORDER BY "updatedAt" DESC`,
      ...allIds,
      rel.student.studentCode || ""
    )

    const hydrated = rows.map(r => hydrateAssessmentRow(r, caller.actorRole)).filter(Boolean)

    // Parent RBAC: Parents see completed assessments (published by CVHT or completed by student)
    const visibleCompleted =
      caller.actorRole === "PARENT"
        ? hydrated.filter(r => r.status === "COMPLETED" && (r.isPublishedToParent || r.hollandCode))
        : hydrated.filter(r => r.status === "COMPLETED")

    const activeDraft =
      caller.actorRole === "PARENT"
        ? null
        : hydrated.find(r => r.status === "DRAFT") || null

    const latestCompleted = visibleCompleted[0] || null

    // Fetch student's orientation/career goals to show linkage
    const orientationGoals = await prisma.studentGoal
      .findMany({
        where: {
          studentId: { in: allIds }
        },
        orderBy: { createdAt: "desc" },
        take: 15
      })
      .catch(() => [])

    return jsonResponse({
      success: true,
      version: SKL_PSYCH_VERSION,
      student: {
        id: rel.student.id,
        studentCode: rel.student.studentCode,
        studentName: rel.student.studentName,
        classId: rel.student.classId,
        className: rel.student.class?.className || "",
        grade: rel.student.class?.grade || ""
      },
      latestCompleted,
      activeDraft,
      history: visibleCompleted,
      orientationGoals,
      riasecProfiles: RIASEC_PROFILES,
      ...(includeQuestions ? { questions: HOLLAND_108_QUESTIONS } : {})
    })
  } catch (error: any) {
    console.error("[GET /api/advisory/holland] Error:", error)
    return jsonResponse({ error: error.message || "Lỗi máy chủ khi tải Khảo sát Holland" }, 500)
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
      studentId: bodyStudentId,
      academicYearId = "",
      currentStep = 1,
      answers = {},
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
    const computed = calculateHollandResult(answers)
    const nowIso = new Date().toISOString()

    // Check if an existing DRAFT exists for this student
    const existingDrafts = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "StudentHollandAssessment" WHERE "studentId" = ? AND "status" = 'DRAFT' ORDER BY "updatedAt" DESC LIMIT 1`,
      student.id
    )
    const existingDraft = existingDrafts[0] || null

    if (action === "SAVE_DRAFT") {
      const draftId =
        existingDraft?.id ||
        `hol_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

      if (existingDraft) {
        await prisma.$executeRawUnsafe(
          `UPDATE "StudentHollandAssessment"
           SET "answeredCount" = ?,
               "currentStep" = ?,
               "answersJson" = ?,
               "scoreR" = ?,
               "scoreI" = ?,
               "scoreA" = ?,
               "scoreS" = ?,
               "scoreE" = ?,
               "scoreC" = ?,
               "studentReflection" = ?,
               "updatedAt" = ?
           WHERE "id" = ?`,
          computed.answeredCount,
          Number(currentStep || 1),
          JSON.stringify(answers),
          computed.scores.R,
          computed.scores.I,
          computed.scores.A,
          computed.scores.S,
          computed.scores.E,
          computed.scores.C,
          studentReflection || existingDraft.studentReflection || "",
          nowIso,
          draftId
        )
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "StudentHollandAssessment" (
            "id", "studentId", "studentCode", "classId", "academicYearId",
            "version", "status", "answeredCount", "currentStep", "answersJson",
            "scoreR", "scoreI", "scoreA", "scoreS", "scoreE", "scoreC",
            "studentReflection", "createdAt", "updatedAt"
          ) VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          draftId,
          student.id,
          student.studentCode || "",
          student.classId || null,
          academicYearId || student.academicYearId || "",
          SKL_PSYCH_VERSION,
          computed.answeredCount,
          Number(currentStep || 1),
          JSON.stringify(answers),
          computed.scores.R,
          computed.scores.I,
          computed.scores.A,
          computed.scores.S,
          computed.scores.E,
          computed.scores.C,
          studentReflection || "",
          nowIso,
          nowIso
        )
      }

      const savedRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "StudentHollandAssessment" WHERE "id" = ? LIMIT 1`,
        draftId
      )

      return jsonResponse({
        success: true,
        savedAt: nowIso,
        message: `Đã lưu nháp tiến độ (${computed.answeredCount}/108 câu).`,
        draft: hydrateAssessmentRow(savedRows[0], caller.actorRole)
      })
    }

    // ACTION: SUBMIT_ASSESSMENT
    if (computed.answeredCount < 108) {
      return jsonResponse(
        {
          error: `Em mới hoàn thành ${computed.answeredCount}/108 câu. Vui lòng trả lời đầy đủ 108 câu Có/Không để hệ thống SKL_PSYCH v2.6.1 phân tích chính xác nhất.`
        },
        400
      )
    }

    const recordId =
      existingDraft?.id ||
      `hol_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    const top3Payload = computed.rankedDimensions.slice(0, 3)

    if (existingDraft) {
      await prisma.$executeRawUnsafe(
        `UPDATE "StudentHollandAssessment"
         SET "status" = 'COMPLETED',
             "answeredCount" = 108,
             "currentStep" = 6,
             "answersJson" = ?,
             "scoreR" = ?,
             "scoreI" = ?,
             "scoreA" = ?,
             "scoreS" = ?,
             "scoreE" = ?,
             "scoreC" = ?,
             "hollandCode" = ?,
             "top3Json" = ?,
             "reportSummaryJson" = ?,
             "studentReflection" = ?,
             "isPublishedToParent" = 1,
             "publishedToParentAt" = ?,
             "submittedAt" = ?,
             "updatedAt" = ?
         WHERE "id" = ?`,
        JSON.stringify(answers),
        computed.scores.R,
        computed.scores.I,
        computed.scores.A,
        computed.scores.S,
        computed.scores.E,
        computed.scores.C,
        computed.hollandCode,
        JSON.stringify(top3Payload),
        JSON.stringify(computed),
        studentReflection || existingDraft.studentReflection || "",
        nowIso,
        nowIso,
        nowIso,
        recordId
      )
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "StudentHollandAssessment" (
          "id", "studentId", "studentCode", "classId", "academicYearId",
          "version", "status", "answeredCount", "currentStep", "answersJson",
          "scoreR", "scoreI", "scoreA", "scoreS", "scoreE", "scoreC",
          "hollandCode", "top3Json", "reportSummaryJson", "studentReflection",
          "isPublishedToParent", "publishedToParentAt", "submittedAt", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', 108, 6, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
        recordId,
        student.id,
        student.studentCode || "",
        student.classId || null,
        academicYearId || student.academicYearId || "",
        SKL_PSYCH_VERSION,
        JSON.stringify(answers),
        computed.scores.R,
        computed.scores.I,
        computed.scores.A,
        computed.scores.S,
        computed.scores.E,
        computed.scores.C,
        computed.hollandCode,
        JSON.stringify(top3Payload),
        JSON.stringify(computed),
        studentReflection || "",
        nowIso,
        nowIso,
        nowIso,
        nowIso
      )
    }

    // Requirement 7 & 11: Sync reference evidence into StudentCareerOrientation (without converting to grade score)
    try {
      let targetYearId = academicYearId || student.academicYearId
      if (!targetYearId) {
        const activeY = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } })
        targetYearId = activeY?.id || ""
      }
      if (targetYearId) {
        const hollandSummaryText = `Holland (${SKL_PSYCH_VERSION}): Mã ${computed.hollandCode} (${computed.primaryProfile.nameVi} ${computed.scores[computed.top3Codes[0]]}/18 • ${computed.secondaryProfile.nameVi} ${computed.scores[computed.top3Codes[1]]}/18 • ${computed.tertiaryProfile.nameVi} ${computed.scores[computed.top3Codes[2]]}/18) [Minh chứng tham khảo]`
        const existingCO = await (prisma as any).studentCareerOrientation.findFirst({
          where: { studentId: student.id, academicYearId: targetYearId }
        })
        if (existingCO) {
          await (prisma as any).studentCareerOrientation.update({
            where: { id: existingCO.id },
            data: {
              surveyResult: hollandSummaryText,
              updatedAt: new Date()
            }
          })
        } else {
          await (prisma as any).studentCareerOrientation.create({
            data: {
              studentId: student.id,
              academicYearId: targetYearId,
              surveyResult: hollandSummaryText,
              initialOrientation: computed.recommendedCareerClusters[0] || "",
              status: "DANG_TU_VAN",
              notes: "Đồng bộ tự động từ bài Khảo sát Holland 108 câu (Minh chứng tham khảo Cố vấn học tập)."
            }
          })
        }
      }
    } catch (syncErr) {
      console.warn("[Holland -> StudentCareerOrientation sync warning]:", syncErr)
    }

    // Sync to OrientationAdvisoryRecord in CHO_PHAN_CONG state (without creating confirmed career goal or duplicate notifications)
    const syncOrient = await syncHollandToOrientationRecord({
      studentId: student.id,
      classId: student.classId || null,
      academicYearId: academicYearId || student.academicYearId || "",
      assessmentId: recordId,
      hollandCode: computed.hollandCode,
      scores: computed.scores,
      topGroups: top3Payload,
      surveyBatch: "Đợt khảo sát RIASEC 108 câu",
      surveyDate: nowIso
    }).catch(() => ({ alreadyNotified: false }))

    // Notify Homeroom Teacher / Coordinator only if not already notified for this result
    if (!syncOrient.alreadyNotified) {
      await notifyHomeroomTeacher(
        student,
        `🧭 Học sinh hoàn thành Khảo sát Holland (${computed.hollandCode}) — Chờ phân công tư vấn`,
        `Học sinh ${student.studentName} (${student.class?.className || ""}) vừa hoàn thành bài Khảo sát Holland 108 câu với mã sở thích ${computed.hollandCode}. Hồ sơ Định hướng phát triển đang ở trạng thái Chờ phân công.`
      )
    }

    await appendAdvisoryAuditLog({
      studentId: student.id,
      actorId: caller.userId,
      actorRole: caller.actorRole,
      actorName: caller.actorName,
      action: "SUBMIT_HOLLAND_ASSESSMENT",
      entityType: "HOLLAND_ASSESSMENT",
      entityId: recordId,
      summary: `Học sinh hoàn thành Khảo sát Holland (${SKL_PSYCH_VERSION}) — Mã ${computed.hollandCode}`,
      changes: {
        version: SKL_PSYCH_VERSION,
        hollandCode: computed.hollandCode,
        scores: computed.scores
      }
    })

    const savedRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "StudentHollandAssessment" WHERE "id" = ? LIMIT 1`,
      recordId
    )

    return jsonResponse({
      success: true,
      message: `Hoàn thành Khảo sát Holland! Mã sở thích nghề nghiệp của em là ${computed.hollandCode}.`,
      assessment: hydrateAssessmentRow(savedRows[0], caller.actorRole)
    })
  } catch (error: any) {
    console.error("[POST /api/advisory/holland] Error:", error)
    return jsonResponse({ error: error.message || "Lỗi khi lưu bài khảo sát Holland" }, 500)
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
      action, // "LINK_STUDENT_GOAL" | "REQUEST_1ON1_CONSULTATION" | "ADVISOR_REVIEW_AND_PUBLISH" | "PARENT_FEEDBACK" | "UPDATE_REFLECTION"
      goalId,
      createGoalTitle,
      createGoalAction,
      createGoalCategory = "DINH_HUONG",
      consultationTopic,
      consultationNote,
      studentReflection,
      advisorReviewNote,
      consultationRequestStatus,
      consultationScheduledDate,
      isPublishedToParent,
      parentFeedback
    } = body

    if (!id) {
      return jsonResponse({ error: "Thiếu mã bài khảo sát Holland (id)" }, 400)
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "StudentHollandAssessment" WHERE "id" = ? LIMIT 1`,
      id
    )
    const record = rows[0]
    if (!record) {
      return jsonResponse({ error: "Không tìm thấy bản ghi Khảo sát Holland" }, 404)
    }

    const rel = await verifyStudentRelationship(caller, record.studentId)
    if (!rel.allowed || !rel.student) {
      return jsonResponse({ error: rel.reason || "Không có quyền thao tác trên bản ghi này" }, 403)
    }

    const student = rel.student
    const nowIso = new Date().toISOString()

    // 1. UPDATE_REFLECTION (Student updates their personal reflection on Holland report)
    if (action === "UPDATE_REFLECTION") {
      await prisma.$executeRawUnsafe(
        `UPDATE "StudentHollandAssessment" SET "studentReflection" = ?, "updatedAt" = ? WHERE "id" = ?`,
        studentReflection || "",
        nowIso,
        id
      )
    }

    // 2. LINK_STUDENT_GOAL (Requirement 9: Link Holland result with Student Goal, especially Orientation group)
    else if (action === "LINK_STUDENT_GOAL") {
      let existingLinkedIds: string[] = []
      try {
        existingLinkedIds = record.linkedGoalIdsJson ? JSON.parse(record.linkedGoalIdsJson) : []
      } catch {}

      let targetGoalId = goalId || ""

      if (!targetGoalId && createGoalTitle) {
        let targetYearId = record.academicYearId || student.academicYearId
        if (!targetYearId) {
          const activeY = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } })
          targetYearId = activeY?.id || ""
        }

        const newGoal = await prisma.studentGoal.create({
          data: {
            studentId: student.id,
            academicYearId: targetYearId,
            category: createGoalCategory || "DINH_HUONG",
            targetText: `[Holland ${record.hollandCode || "RIASEC"}] ${createGoalTitle.trim()}`,
            currentSituation: `Dựa trên kết quả Khảo sát Holland (${SKL_PSYCH_VERSION}) với mã sở thích ${record.hollandCode || ""}.`,
            supportNeeded: createGoalAction || "Cần GVCN/CVHT định hướng thêm lộ trình môn học và hoạt động trải nghiệm.",
            status: "IN_PROGRESS",
            actions: createGoalAction
              ? {
                  create: [
                    {
                      actionText: createGoalAction.trim(),
                      frequency: "Hàng tuần",
                      status: "IN_PROGRESS"
                    }
                  ]
                }
              : undefined
          }
        })
        targetGoalId = newGoal.id
      }

      if (targetGoalId && !existingLinkedIds.includes(targetGoalId)) {
        existingLinkedIds.push(targetGoalId)
      }

      await prisma.$executeRawUnsafe(
        `UPDATE "StudentHollandAssessment" SET "linkedGoalIdsJson" = ?, "updatedAt" = ? WHERE "id" = ?`,
        JSON.stringify(existingLinkedIds),
        nowIso,
        id
      )
    }

    // 3. REQUEST_1ON1_CONSULTATION (Requirement 10: Student requests 1:1 consultation; GVCN/CVHT receives & processes)
    else if (action === "REQUEST_1ON1_CONSULTATION") {
      const topic =
        (consultationTopic || "").trim() ||
        `Tư vấn định hướng nghề nghiệp & chọn tổ hợp môn theo mã Holland ${record.hollandCode || ""}`
      const note = (consultationNote || "").trim()

      await prisma.$executeRawUnsafe(
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

      // Also sync into AcademicConsultationLog so GVCN sees it in 1:1 Session Manager
      try {
        let targetYearId = record.academicYearId || student.academicYearId
        if (!targetYearId) {
          const activeY = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } })
          targetYearId = activeY?.id || ""
        }
        const hmId = student.class?.homeroomTeacherId || "ADVISOR"
        if (targetYearId) {
          await prisma.academicConsultationLog.create({
            data: {
              studentId: student.id,
              advisorId: hmId,
              academicYearId: targetYearId,
              meetingDate: new Date(),
              content: `[ĐỀ NGHỊ TƯ VẤN HOLLAND 1:1 • MÃ ${record.hollandCode || "RIASEC"}] Chủ đề: ${topic}`,
              difficulties: note || "Học sinh mong muốn được Thầy/Cô GVCN/CVHT giải đáp và định hướng lộ trình theo kết quả Holland.",
              nextActions: "Chờ GVCN/CVHT xếp lịch gặp 1:1 và phản hồi định hướng.",
              status: "CAN_HO_TRO_THEM",
              notes: `[HollandId: ${id}]`
            }
          })
        }
      } catch (logErr) {
        console.warn("[Holland 1:1 Consultation Log Sync Warning]:", logErr)
      }

      await notifyHomeroomTeacher(
        student,
        `🙋 Học sinh đề nghị Tư vấn 1:1 từ Khảo sát Holland (${record.hollandCode})`,
        `Học sinh ${student.studentName} (${student.class?.className || ""}) đề nghị gặp tư vấn 1:1 về kết quả Holland (${record.hollandCode}): "${topic}".`
      )
    }

    // 4. ADVISOR_REVIEW_AND_PUBLISH (Requirement 8, 10, 13: GVCN/CVHT reviews, responds to 1:1, and publishes to Parent)
    else if (action === "ADVISOR_REVIEW_AND_PUBLISH") {
      if (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN") {
        return jsonResponse({ error: "Chỉ GVCN/CVHT mới có quyền duyệt nhận xét và công bố" }, 403)
      }

      const nextStatus =
        consultationRequestStatus || record.consultationRequestStatus || "NONE"
      const nextPublish =
        isPublishedToParent !== undefined
          ? isPublishedToParent
            ? 1
            : 0
          : Number(record.isPublishedToParent || 1)

      await prisma.$executeRawUnsafe(
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
        caller.actorName,
        advisorReviewNote !== undefined ? advisorReviewNote : record.advisorReviewNote || "",
        nextStatus,
        consultationScheduledDate !== undefined
          ? consultationScheduledDate
          : record.consultationScheduledDate || "",
        nextPublish,
        nextPublish ? nowIso : record.publishedToParentAt,
        nowIso,
        id
      )

      // Sync advisor remark to StudentCareerOrientation as reference
      if (advisorReviewNote) {
        try {
          const existingCO = await (prisma as any).studentCareerOrientation.findFirst({
            where: { studentId: student.id }
          })
          if (existingCO) {
            await (prisma as any).studentCareerOrientation.update({
              where: { id: existingCO.id },
              data: {
                gvcnRemark: advisorReviewNote,
                updatedAt: new Date()
              }
            })
          }
        } catch {}
      }

      if (nextPublish === 1) {
        await notifyLinkedParents(
          student.id,
          `🧭 Báo cáo Khảo sát Holland của ${student.studentName} đã được công bố`,
          `GVCN/CVHT (${caller.actorName}) đã cập nhật nhận xét định hướng nghề nghiệp Holland (${record.hollandCode}) của con ${student.studentName}. Mời Quý Phụ huynh xem và đồng hành.`
        )
      }
    }

    // 5. PARENT_FEEDBACK (Requirement 13: Parent views published Holland report, acknowledges & sends feedback)
    else if (action === "PARENT_FEEDBACK") {
      await prisma.$executeRawUnsafe(
        `UPDATE "StudentHollandAssessment"
         SET "parentAcknowledged" = 1,
             "parentAcknowledgedAt" = ?,
             "parentFeedback" = ?,
             "updatedAt" = ?
         WHERE "id" = ?`,
        nowIso,
        parentFeedback !== undefined ? parentFeedback : record.parentFeedback || "",
        nowIso,
        id
      )

      await notifyHomeroomTeacher(
        student,
        `🏡 Phụ huynh phản hồi Báo cáo Holland của ${student.studentName}`,
        `Phụ huynh học sinh ${student.studentName} đã xác nhận xem báo cáo Holland (${record.hollandCode}) và gửi ý kiến đồng hành.`
      )
    }

    const updatedRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "StudentHollandAssessment" WHERE "id" = ? LIMIT 1`,
      id
    )

    return jsonResponse({
      success: true,
      message: "Cập nhật dữ liệu Khảo sát Holland thành công!",
      assessment: hydrateAssessmentRow(updatedRows[0], caller.actorRole)
    })
  } catch (error: any) {
    console.error("[PATCH /api/advisory/holland] Error:", error)
    return jsonResponse({ error: error.message || "Lỗi cập nhật Khảo sát Holland" }, 500)
  }
}
