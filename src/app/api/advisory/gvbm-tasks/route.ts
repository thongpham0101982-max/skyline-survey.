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

function sanitizeTaskForParent(row: any) {
  return {
    id: row.id,
    studentId: row.studentId,
    classId: row.classId,
    academicYearId: row.academicYearId,
    subjectId: row.subjectId,
    subjectName: row.subjectName,
    currentScore: row.currentScore,
    assignedByTeacherId: row.assignedByTeacherId,
    assignedByTeacherName: row.assignedByTeacherName || "GVCN / Cố vấn học tập",
    assignedToTeacherId: row.assignedToTeacherId,
    assignedToTeacherName: row.assignedToTeacherName || "Giáo viên Bộ môn",
    supportGoal: row.supportGoal,
    gvbmProposedSolutions: row.gvbmProposedSolutions,
    publishedParentAdvice: row.publishedParentAdvice || row.gvbmParentAdvice || "",
    publishedAt: row.publishedAt || row.updatedAt,
    status: row.status,
    parentAcknowledged: Boolean(Number(row.parentAcknowledged)),
    parentAcknowledgedAt: row.parentAcknowledgedAt,
    parentFeedback: row.parentFeedback || "",
    parentRequestFollowUp: Boolean(Number(row.parentRequestFollowUp)),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

function normalizeTaskRow(row: any) {
  return {
    ...row,
    parentAcknowledged: Boolean(Number(row.parentAcknowledged)),
    parentRequestFollowUp: Boolean(Number(row.parentRequestFollowUp))
  }
}

export async function GET(req: Request) {
  try {
    await ensureTriPartyTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller || !caller.authenticated) {
      return jsonResponse({ error: "Chưa xác thực đăng nhập" }, 401)
    }

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId") || ""
    const classId = searchParams.get("classId") || ""
    const academicYearId = searchParams.get("academicYearId") || ""
    const myTasks = searchParams.get("myTasks") === "true"
    const assignedByMe = searchParams.get("assignedByMe") === "true"
    const statusFilter = searchParams.get("status") || ""

    // Trường hợp 1: Truy vấn theo studentId cụ thể
    if (studentId) {
      const rel = await verifyStudentRelationship(caller, studentId)
      if (!rel.allowed) {
        return jsonResponse({ error: rel.reason || "Không có quyền truy cập hồ sơ học sinh này" }, 403)
      }

      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "SubjectTeacherAdvisoryTask"
         WHERE "studentId" = ?
         ${academicYearId ? `AND ("academicYearId" = ? OR "academicYearId" = '')` : ""}
         ORDER BY "createdAt" DESC`,
        ...(academicYearId ? [studentId, academicYearId] : [studentId])
      )

      if (caller.actorRole === "PARENT") {
        const approvedRows = (rows || [])
          .filter(
            r => r.status === "APPROVED_FOR_PARENT" || r.status === "PARENT_ACKNOWLEDGED"
          )
          .map(sanitizeTaskForParent)
        return jsonResponse({ tasks: approvedRows })
      }

      return jsonResponse({
        tasks: (rows || []).map(normalizeTaskRow)
      })
    }

    // Trường hợp 2: GVBM hoặc CVHT lấy danh sách nhiệm vụ tư vấn của mình
    if (caller.actorRole === "TEACHER" || caller.actorRole === "ADMIN") {
      const teacherId = caller.teacherId || ""
      let whereClauses: string[] = []
      let params: any[] = []

      if (myTasks && teacherId) {
        whereClauses.push(`"assignedToTeacherId" = ?`)
        params.push(teacherId)
      } else if (assignedByMe && teacherId) {
        whereClauses.push(`"assignedByTeacherId" = ?`)
        params.push(teacherId)
      } else if (teacherId && caller.actorRole !== "ADMIN") {
        whereClauses.push(`("assignedToTeacherId" = ? OR "assignedByTeacherId" = ?)`)
        params.push(teacherId, teacherId)
      }

      if (classId) {
        whereClauses.push(`"classId" = ?`)
        params.push(classId)
      }
      if (academicYearId) {
        whereClauses.push(`("academicYearId" = ? OR "academicYearId" = '')`)
        params.push(academicYearId)
      }
      if (statusFilter) {
        whereClauses.push(`"status" = ?`)
        params.push(statusFilter)
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : ""
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "SubjectTeacherAdvisoryTask" ${whereSql} ORDER BY "createdAt" DESC LIMIT 100`,
        ...params
      )

      // Làm giàu thông tin học sinh & mục tiêu SMART cho GVBM xem theo phân quyền
      const studentIds = Array.from(new Set((rows || []).map(r => r.studentId).filter(Boolean)))
      let studentMap = new Map<string, any>()
      let goalMap = new Map<string, any[]>()

      if (studentIds.length > 0) {
        const [students, goals] = await Promise.all([
          prisma.student.findMany({
            where: { id: { in: studentIds } },
            select: {
              id: true,
              studentName: true,
              studentCode: true,
              class: { select: { id: true, className: true, grade: true } }
            }
          }),
          prisma.studentGoal.findMany({
            where: { studentId: { in: studentIds } },
            select: {
              id: true,
              studentId: true,
              category: true,
              targetText: true,
              status: true
            },
            take: 50
          }).catch(() => [])
        ])

        students.forEach(s => studentMap.set(s.id, s))
        goals.forEach(g => {
          const arr = goalMap.get(g.studentId) || []
          arr.push(g)
          goalMap.set(g.studentId, arr)
        })
      }

      const enriched = (rows || []).map(r => {
        const st = studentMap.get(r.studentId)
        return {
          ...normalizeTaskRow(r),
          studentName: st?.studentName || "Học sinh",
          studentCode: st?.studentCode || "",
          className: st?.class?.className || "",
          studentGoals: goalMap.get(r.studentId) || []
        }
      })

      return jsonResponse({ tasks: enriched })
    }

    return jsonResponse({ tasks: [] })
  } catch (error: any) {
    console.error("GET /api/advisory/gvbm-tasks error:", error)
    return jsonResponse({ error: error.message || "Lỗi tải danh sách nhiệm vụ GVBM" }, 500)
  }
}

export async function POST(req: Request) {
  try {
    await ensureTriPartyTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller || !caller.authenticated || (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN")) {
      return jsonResponse({ error: "Chỉ Giáo viên Cố vấn học tập mới có quyền phân công GVBM hỗ trợ" }, 403)
    }

    const body = await req.json()
    const {
      studentId,
      academicYearId = "",
      tasks
    } = body as {
      studentId: string
      academicYearId?: string
      tasks?: Array<{
        subjectId?: string
        subjectName: string
        currentScore?: number | null
        assignedToTeacherId: string
        assignedToTeacherName?: string
        consultationPrompt: string
        supportGoal: string
        dueDate?: string
        aiSuggestedContext?: string
      }>
    }

    const taskList = Array.isArray(tasks) && tasks.length > 0 ? tasks : [body]
    const targetStudentId = studentId || taskList[0]?.studentId

    if (!targetStudentId) {
      return jsonResponse({ error: "Thiếu thông tin học sinh (studentId)" }, 400)
    }

    const rel = await verifyStudentRelationship(caller, targetStudentId)
    if (!rel.allowed) {
      return jsonResponse({ error: rel.reason || "Không có quyền phân công cho học sinh này" }, 403)
    }

    const student = await prisma.student.findUnique({
      where: { id: targetStudentId },
      include: { class: true }
    })
    if (!student) {
      return jsonResponse({ error: "Không tìm thấy học sinh" }, 404)
    }

    const effectiveYearId = academicYearId || student.academicYearId || student.class?.academicYearId || ""
    const assignedByTeacherId = caller.teacherId || student.class?.homeroomTeacherId || "CVHT"
    const assignedByTeacherName = caller.actorName || "GVCN / CVHT"

    const createdTasks: any[] = []

    for (const item of taskList) {
      if (!item.subjectName || !item.assignedToTeacherId || !item.consultationPrompt?.trim()) {
        continue
      }

      const id = `gvbm_tsk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const dueDateVal = item.dueDate ? new Date(item.dueDate).toISOString() : null

      await prisma.$executeRawUnsafe(
        `INSERT INTO "SubjectTeacherAdvisoryTask" (
          "id", "studentId", "classId", "academicYearId",
          "subjectId", "subjectName", "currentScore",
          "assignedByTeacherId", "assignedByTeacherName",
          "assignedToTeacherId", "assignedToTeacherName",
          "consultationPrompt", "supportGoal", "dueDate", "aiSuggestedContext",
          "status", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ASSIGNED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        id,
        targetStudentId,
        student.classId,
        effectiveYearId,
        item.subjectId || null,
        item.subjectName.trim(),
        typeof item.currentScore === "number" ? item.currentScore : null,
        assignedByTeacherId,
        assignedByTeacherName,
        item.assignedToTeacherId,
        item.assignedToTeacherName || "GVBM",
        item.consultationPrompt.trim(),
        (item.supportGoal || "Bồi dưỡng kiến thức trọng tâm & cải thiện điểm số").trim(),
        dueDateVal,
        item.aiSuggestedContext || null
      )

      createdTasks.push({
        id,
        studentId: targetStudentId,
        subjectName: item.subjectName,
        assignedToTeacherId: item.assignedToTeacherId,
        assignedToTeacherName: item.assignedToTeacherName || "GVBM",
        status: "ASSIGNED"
      })

      // Ghi Audit Log
      await appendAdvisoryAuditLog({
        studentId: targetStudentId,
        actorId: caller.userId,
        actorRole: "TEACHER",
        actorName: assignedByTeacherName,
        entityType: "GVBM_ADVISORY_TASK",
        entityId: id,
        action: "ASSIGN_GVBM_SUPPORT",
        privacyTier: "PRIVATE_ADVISORY",
        summary: `Phân công GVBM ${item.assignedToTeacherName || ""} hỗ trợ môn ${item.subjectName}`,
        changes: {
          subjectName: item.subjectName,
          assignedToTeacherId: item.assignedToTeacherId,
          supportGoal: item.supportGoal,
          dueDate: dueDateVal
        }
      })

      // Gửi Notification chuông cho GVBM
      const targetTeacher = await prisma.teacher.findUnique({
        where: { id: item.assignedToTeacherId },
        select: { userId: true, teacherName: true }
      }).catch(() => null)

      if (targetTeacher?.userId) {
        await prisma.notification.create({
          data: {
            userId: targetTeacher.userId,
            title: `[Cố vấn học tập] Nhiệm vụ tư vấn bộ môn ${item.subjectName} - HS ${student.studentName} (${student.class?.className || ""})`,
            message: `CVHT ${assignedByTeacherName} đề nghị phối hợp tư vấn môn ${item.subjectName}: "${item.consultationPrompt.trim().slice(0, 110)}". Mục tiêu: ${item.supportGoal || "Cải thiện kết quả học tập"}.`,
            link: `/teacher/so-diem-nhan-xet?classId=${student.classId}&studentId=${targetStudentId}`
          }
        }).catch(err => console.error("Notification to GVBM error:", err))
      }
    }

    if (createdTasks.length === 0) {
      return jsonResponse({ error: "Vui lòng chọn Giáo viên bộ môn và nhập nội dung tư vấn hợp lệ" }, 400)
    }

    return jsonResponse({
      success: true,
      message: `Đã phân công ${createdTasks.length} nhiệm vụ tư vấn tới GVBM và đồng bộ sang Sổ Giáo viên!`,
      createdTasks
    })
  } catch (error: any) {
    console.error("POST /api/advisory/gvbm-tasks error:", error)
    return jsonResponse({ error: error.message || "Lỗi lưu phân công GVBM" }, 500)
  }
}

export async function PATCH(req: Request) {
  try {
    await ensureTriPartyTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller || !caller.authenticated) {
      return jsonResponse({ error: "Chưa xác thực đăng nhập" }, 401)
    }

    const body = await req.json()
    const {
      id,
      action, // "GVBM_RESPOND" | "CVHT_APPROVE_PUBLISH" | "PARENT_FEEDBACK"
      gvbmProfessionalAssessment,
      gvbmProposedSolutions,
      gvbmParentAdvice,
      cvhtReviewNote,
      publishedParentAdvice,
      supportGoal,
      parentAcknowledged,
      parentFeedback,
      parentRequestFollowUp
    } = body

    if (!id || !action) {
      return jsonResponse({ error: "Thiếu mã nhiệm vụ (id) hoặc hành động (action)" }, 400)
    }

    const existingRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "SubjectTeacherAdvisoryTask" WHERE "id" = ? LIMIT 1`,
      id
    )
    if (!existingRows || existingRows.length === 0) {
      return jsonResponse({ error: "Không tìm thấy nhiệm vụ tư vấn bộ môn" }, 404)
    }
    const task = existingRows[0]

    const rel = await verifyStudentRelationship(caller, task.studentId)
    if (!rel.allowed) {
      return jsonResponse({ error: rel.reason || "Không có quyền thao tác trên nhiệm vụ này" }, 403)
    }

    const student = await prisma.student.findUnique({
      where: { id: task.studentId },
      include: { class: true }
    })

    // -------------------------------------------------------------------------
    // HÀNH ĐỘNG 1: GVBM GỬI NHẬN ĐỊNH CHUYÊN MÔN, GIẢI PHÁP & NỘI DUNG CHO PHHS
    // -------------------------------------------------------------------------
    if (action === "GVBM_RESPOND") {
      if (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN") {
        return jsonResponse({ error: "Chỉ Giáo viên mới có quyền cập nhật nhận định chuyên môn" }, 403)
      }
      if (!gvbmProfessionalAssessment?.trim() && !gvbmProposedSolutions?.trim() && !gvbmParentAdvice?.trim()) {
        return jsonResponse({ error: "Vui lòng nhập nhận định chuyên môn và nội dung tư vấn" }, 400)
      }

      await prisma.$executeRawUnsafe(
        `UPDATE "SubjectTeacherAdvisoryTask"
         SET "gvbmProfessionalAssessment" = COALESCE(?, "gvbmProfessionalAssessment"),
             "gvbmProposedSolutions" = COALESCE(?, "gvbmProposedSolutions"),
             "gvbmParentAdvice" = COALESCE(?, "gvbmParentAdvice"),
             "supportGoal" = COALESCE(?, "supportGoal"),
             "gvbmRespondedAt" = CURRENT_TIMESTAMP,
             "status" = 'GVBM_RESPONDED',
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = ?`,
        gvbmProfessionalAssessment?.trim() || null,
        gvbmProposedSolutions?.trim() || null,
        gvbmParentAdvice?.trim() || null,
        supportGoal?.trim() || null,
        id
      )

      await appendAdvisoryAuditLog({
        studentId: task.studentId,
        actorId: caller.userId,
        actorRole: "TEACHER",
        actorName: caller.actorName,
        entityType: "GVBM_ADVISORY_TASK",
        entityId: id,
        action: "GVBM_RESPONDED",
        privacyTier: "PRIVATE_ADVISORY",
        summary: `GVBM ${caller.actorName} đã gửi nhận định chuyên môn & đề xuất tư vấn môn ${task.subjectName}`,
        changes: {
          gvbmProposedSolutions: gvbmProposedSolutions?.trim(),
          hasParentAdvice: Boolean(gvbmParentAdvice?.trim())
        }
      })

      // Thông báo cho CVHT để rà soát và phê duyệt
      if (task.assignedByTeacherId) {
        const cvht = await prisma.teacher.findUnique({
          where: { id: task.assignedByTeacherId },
          select: { userId: true }
        }).catch(() => null)

        if (cvht?.userId) {
          await prisma.notification.create({
            data: {
              userId: cvht.userId,
              title: `[GVBM Hoàn thành tư vấn] Môn ${task.subjectName} - HS ${student?.studentName || ""}`,
              message: `GVBM ${task.assignedToTeacherName || caller.actorName} đã hoàn thành nhận định chuyên môn và dự thảo nội dung tư vấn PHHS môn ${task.subjectName}. Mời Thầy/Cô CVHT rà soát và phê duyệt công bố.`,
              link: `/teacher/co-van-hoc-tap?classId=${task.classId || student?.classId || ""}`
            }
          }).catch(err => console.error("Notify CVHT error:", err))
        }
      }

      return jsonResponse({
        success: true,
        message: "Đã gửi nhận định chuyên môn và đề xuất tư vấn về CVHT để rà soát!",
        status: "GVBM_RESPONDED"
      })
    }

    // -------------------------------------------------------------------------
    // HÀNH ĐỘNG 2: CVHT RÀ SOÁT & PHÊ DUYỆT CÔNG BỐ TƯ VẤN CHO PHHS
    // -------------------------------------------------------------------------
    if (action === "CVHT_APPROVE_PUBLISH") {
      if (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN") {
        return jsonResponse({ error: "Chỉ CVHT mới có quyền phê duyệt công bố nội dung cho PHHS" }, 403)
      }

      const finalParentAdvice = (
        publishedParentAdvice ||
        gvbmParentAdvice ||
        task.gvbmParentAdvice ||
        task.gvbmProposedSolutions ||
        ""
      ).trim()

      if (!finalParentAdvice) {
        return jsonResponse(
          { error: "Vui lòng kiểm tra hoặc nhập Nội dung tư vấn dành cho PHHS trước khi công bố" },
          400
        )
      }

      await prisma.$executeRawUnsafe(
        `UPDATE "SubjectTeacherAdvisoryTask"
         SET "cvhtReviewNote" = COALESCE(?, "cvhtReviewNote"),
             "publishedParentAdvice" = ?,
             "gvbmProposedSolutions" = COALESCE(?, "gvbmProposedSolutions"),
             "supportGoal" = COALESCE(?, "supportGoal"),
             "publishedAt" = CURRENT_TIMESTAMP,
             "status" = 'APPROVED_FOR_PARENT',
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = ?`,
        cvhtReviewNote?.trim() || null,
        finalParentAdvice,
        gvbmProposedSolutions?.trim() || null,
        supportGoal?.trim() || null,
        id
      )

      await appendAdvisoryAuditLog({
        studentId: task.studentId,
        actorId: caller.userId,
        actorRole: "TEACHER",
        actorName: caller.actorName,
        entityType: "GVBM_ADVISORY_TASK",
        entityId: id,
        action: "CVHT_APPROVED_FOR_PARENT",
        privacyTier: "SHARED_EDUCATIONAL",
        summary: `CVHT phê duyệt và công bố tư vấn bộ môn ${task.subjectName} tới PHHS`,
        changes: {
          subjectName: task.subjectName,
          publishedParentAdvice: finalParentAdvice
        }
      })

      // Gửi Notification cho các tài khoản Phụ huynh của học sinh
      const parentLinks = await prisma.parentStudentLink.findMany({
        where: { studentId: task.studentId, status: "ACTIVE" },
        include: { parent: { select: { userId: true } } }
      }).catch(() => [])

      for (const pl of parentLinks) {
        const pUserId = pl.parent?.userId
        if (pUserId) {
          await prisma.notification.create({
            data: {
              userId: pUserId,
              title: `[Tư vấn & Đồng hành học tập] Môn ${task.subjectName} - Con ${student?.studentName || ""}`,
              message: `Thầy/Cô CVHT và GVBM môn ${task.subjectName} (${task.assignedToTeacherName || "GVBM"}) đã gửi khuyến nghị đồng hành học tập cho con: "${finalParentAdvice.slice(0, 110)}..."`,
              link: `/parent/children/advisory`
            }
          }).catch(err => console.error("Notify Parent error:", err))
        }
      }

      return jsonResponse({
        success: true,
        message: "Đã phê duyệt và công bố nội dung tư vấn bộ môn tới Cổng Phụ huynh (PHHS)!",
        status: "APPROVED_FOR_PARENT"
      })
    }

    // -------------------------------------------------------------------------
    // HÀNH ĐỘNG 3: PHHS XÁC NHẬN ĐÃ XEM, GỬI PHẢN HỒI & ĐỀ NGHỊ TRAO ĐỔI THÊM
    // -------------------------------------------------------------------------
    if (action === "PARENT_FEEDBACK") {
      const ackInt = parentAcknowledged !== false ? 1 : 0
      const followUpInt = parentRequestFollowUp ? 1 : 0

      await prisma.$executeRawUnsafe(
        `UPDATE "SubjectTeacherAdvisoryTask"
         SET "parentAcknowledged" = ?,
             "parentAcknowledgedAt" = CURRENT_TIMESTAMP,
             "parentFeedback" = COALESCE(?, "parentFeedback"),
             "parentRequestFollowUp" = ?,
             "status" = 'PARENT_ACKNOWLEDGED',
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = ?`,
        ackInt,
        parentFeedback?.trim() || null,
        followUpInt,
        id
      )

      await appendAdvisoryAuditLog({
        studentId: task.studentId,
        actorId: caller.userId,
        actorRole: caller.actorRole,
        actorName: caller.actorName,
        entityType: "GVBM_ADVISORY_TASK",
        entityId: id,
        action: "PARENT_FEEDBACK_SUBMITTED",
        privacyTier: "SHARED_EDUCATIONAL",
        summary: `Phụ huynh xác nhận đã xem tư vấn môn ${task.subjectName}${parentFeedback?.trim() ? ` và gửi phản hồi: "${parentFeedback.trim()}"` : ""}`,
        changes: {
          parentAcknowledged: true,
          parentFeedback: parentFeedback?.trim(),
          parentRequestFollowUp: Boolean(parentRequestFollowUp)
        }
      })

      // Gửi Notification tới cả CVHT và GVBM
      const teacherIds = Array.from(
        new Set([task.assignedByTeacherId, task.assignedToTeacherId].filter(Boolean))
      )
      if (teacherIds.length > 0) {
        const teachers = await prisma.teacher.findMany({
          where: { id: { in: teacherIds } },
          select: { userId: true }
        }).catch(() => [])

        for (const t of teachers) {
          if (t.userId) {
            await prisma.notification.create({
              data: {
                userId: t.userId,
                title: `[PHHS Phản hồi tư vấn bộ môn] Môn ${task.subjectName} - HS ${student?.studentName || ""}`,
                message: `Phụ huynh HS ${student?.studentName || ""} đã xác nhận xem tư vấn môn ${task.subjectName}${
                  parentFeedback?.trim() ? `: "${parentFeedback.trim()}"` : "."
                }${parentRequestFollowUp ? " (Phụ huynh đề nghị trao đổi thêm)" : ""}`,
                link: `/teacher/co-van-hoc-tap?classId=${task.classId || student?.classId || ""}`
              }
            }).catch(() => null)
          }
        }
      }

      return jsonResponse({
        success: true,
        message: "Đã ghi nhận xác nhận & phản hồi của Quý Phụ huynh vào Hồ sơ học sinh!",
        status: "PARENT_ACKNOWLEDGED"
      })
    }

    return jsonResponse({ error: "Hành động cập nhật không hợp lệ" }, 400)
  } catch (error: any) {
    console.error("PATCH /api/advisory/gvbm-tasks error:", error)
    return jsonResponse({ error: error.message || "Lỗi cập nhật nhiệm vụ GVBM" }, 500)
  }
}
