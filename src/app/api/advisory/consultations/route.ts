import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  resolveAdvisoryCaller,
  verifyStudentRelationship,
  sanitizeConsultationForViewer
} from "@/lib/advisory/rbac-guard"
import {
  getPoliciesByStudentIds,
  upsertRecordPolicy,
  appendAdvisoryAuditLog,
  PrivacyTier
} from "@/lib/advisory/triparty-sync"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const targetStudentId = searchParams.get("studentId")
  const targetStudentCode = searchParams.get("studentCode")
  const classId = searchParams.get("classId")
  const academicYearId = searchParams.get("academicYearId")

  try {
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let targetStudentIds: string[] = []
    if (targetStudentId || targetStudentCode) {
      const lookup = targetStudentId || targetStudentCode || ""
      const rel = await verifyStudentRelationship(caller, lookup)
      if (!rel.allowed) {
        return NextResponse.json({ error: rel.reason || "Forbidden" }, { status: 403 })
      }
      targetStudentIds = rel.allStudentIds
    } else if (classId) {
      if (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const classStudents = await prisma.student
        .findMany({
          where: { classId, status: { not: "TRANSFERRED_OUT" } },
          select: { id: true, studentCode: true }
        })
        .catch(() => [])
      targetStudentIds = classStudents.map(s => s.id)
    } else if (caller.actorRole === "STUDENT" && caller.studentId) {
      targetStudentIds = [caller.studentId]
    }

    let whereCondition: any = {}
    if (targetStudentIds.length > 0) {
      whereCondition.studentId = { in: targetStudentIds }
    }

    let rawLogs = await prisma.academicConsultationLog
      .findMany({
        where: {
          ...whereCondition,
          ...(academicYearId ? { academicYearId } : {})
        },
        include: {
          student: {
            select: {
              id: true,
              studentCode: true,
              studentName: true,
              class: { select: { className: true } }
            }
          },
          teacher: { select: { id: true, teacherName: true } }
        },
        orderBy: { meetingDate: "desc" }
      })
      .catch(() => [])

    // Fallback without academicYearId filter if empty
    if (rawLogs.length === 0 && targetStudentIds.length > 0) {
      rawLogs = await prisma.academicConsultationLog
        .findMany({
          where: { studentId: { in: targetStudentIds } },
          include: {
            student: {
              select: {
                id: true,
                studentCode: true,
                studentName: true,
                class: { select: { className: true } }
              }
            },
            teacher: { select: { id: true, teacherName: true } }
          },
          orderBy: { meetingDate: "desc" }
        })
        .catch(() => [])
    }

    // Lọc loại trừ triệt để các log trao đổi nhận xét điểm số kỳ khảo sát (GradePeriod)
    const logs = rawLogs.filter((log: any) => {
      const notes = (log.notes || "").toLowerCase()
      const content = (log.content || "").toLowerCase()
      const isGradeExchange =
        notes.includes("[gradeperiod:") ||
        notes.includes("trao đổi giữa gvcn và phhs về kết quả khảo sát") ||
        (content.startsWith("ý kiến gvcn:") && notes.includes("khảo sát"))
      return !isGradeExchange
    })

    const allLogStudentIds = Array.from(new Set([...targetStudentIds, ...logs.map(l => l.studentId)]))
    const policyMap = await getPoliciesByStudentIds(allLogStudentIds, "CONSULTATION")

    const formattedLogs = logs
      .map(l => {
        const policy = policyMap.get(`CONSULTATION:${l.id}`) || null
        const sanitized = sanitizeConsultationForViewer(l, policy, caller.actorRole)
        if (!sanitized) return null
        return {
          ...sanitized,
          evaluatorName: l.teacher?.teacherName || "Giáo Viên Cố Vấn"
        }
      })
      .filter(Boolean)

    return NextResponse.json(formattedLogs)
  } catch (error: any) {
    console.error("GET /api/advisory/consultations error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const caller = await resolveAdvisoryCaller()
  if (!caller.authenticated || (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      id,
      studentId,
      academicYearId,
      meetingDate,
      content,
      difficulties,
      nextActions,
      deadline,
      notes,
      privateAdvisorNotes,
      parentSharedSummary,
      shareWithParent = true,
      privacyTier,
      sessionFormat = "DIRECT",
      sessionStatus = "COMPLETED"
    } = body

    if (!studentId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const rel = await verifyStudentRelationship(caller, studentId)
    if (!rel.allowed) {
      return NextResponse.json({ error: rel.reason || "Forbidden" }, { status: 403 })
    }

    const teacher = await prisma.teacher
      .findUnique({ where: { userId: caller.userId } })
      .catch(() => null)
    const teacherId = teacher ? teacher.id : caller.userId

    const effectiveSharedSummary =
      parentSharedSummary !== undefined ? parentSharedSummary : notes || ""

    let log
    if (id) {
      log = await prisma.academicConsultationLog.update({
        where: { id },
        data: {
          meetingDate: meetingDate ? new Date(meetingDate) : undefined,
          content,
          difficulties,
          nextActions,
          deadline: deadline ? new Date(deadline) : null,
          notes: effectiveSharedSummary,
          status: sessionStatus === "SCHEDULED" ? "PENDING" : "COMPLETED",
          subjectId: body.subjectId !== undefined ? body.subjectId : undefined,
          textbookId: body.textbookId !== undefined ? body.textbookId : undefined,
          chapterId: body.chapterId !== undefined ? body.chapterId : undefined,
          lessonId: body.lessonId !== undefined ? body.lessonId : undefined,
          academicTopic: body.academicTopic !== undefined ? body.academicTopic : undefined
        }
      })
    } else {
      log = await prisma.academicConsultationLog.create({
        data: {
          studentId,
          teacherId,
          academicYearId: academicYearId || rel.student?.academicYearId || "",
          meetingDate: meetingDate ? new Date(meetingDate) : new Date(),
          content,
          difficulties,
          nextActions,
          deadline: deadline ? new Date(deadline) : null,
          notes: effectiveSharedSummary,
          status: sessionStatus === "SCHEDULED" ? "PENDING" : "COMPLETED",
          subjectId: body.subjectId || null,
          textbookId: body.textbookId || null,
          chapterId: body.chapterId || null,
          lessonId: body.lessonId || null,
          academicTopic: body.academicTopic || null
        }
      })
    }

    const resolvedTier: PrivacyTier =
      privacyTier || (shareWithParent ? "SHARED_EDUCATIONAL" : "PRIVATE_ADVISORY")

    await upsertRecordPolicy({
      entityType: "CONSULTATION",
      entityId: log.id,
      studentId: log.studentId,
      academicYearId: log.academicYearId,
      privacyTier: resolvedTier,
      shareWithParent: Boolean(shareWithParent),
      privateAdvisorNotes: privateAdvisorNotes ?? null,
      parentSharedSummary: effectiveSharedSummary || null,
      sessionFormat,
      sessionStatus,
      updatedById: caller.userId,
      updatedByRole: caller.actorRole
    })

    await appendAdvisoryAuditLog({
      studentId: log.studentId,
      actorId: caller.userId,
      actorRole: caller.actorRole,
      actorName: caller.actorName,
      entityType: "CONSULTATION",
      entityId: log.id,
      action: id ? "UPDATE_CONSULTATION" : "CREATE_CONSULTATION",
      privacyTier: resolvedTier,
      summary: id
        ? `Cập nhật biên bản cố vấn 1:1 (Chia sẻ PHHS: ${shareWithParent ? "Có" : "Không"})`
        : `Tạo phiên cố vấn 1:1 (${sessionStatus === "SCHEDULED" ? "Đặt lịch hẹn" : "Đã hoàn thành"})`,
      changes: {
        meetingDate,
        shareWithParent: Boolean(shareWithParent),
        privacyTier: resolvedTier,
        sessionStatus
      }
    })

    return NextResponse.json({
      success: true,
      id: log.id,
      log: {
        ...log,
        privacyTier: resolvedTier,
        shareWithParent: Boolean(shareWithParent),
        privateAdvisorNotes: privateAdvisorNotes || "",
        parentSharedSummary: effectiveSharedSummary || "",
        sessionFormat,
        sessionStatus
      }
    })
  } catch (error: any) {
    console.error("POST /api/advisory/consultations error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const caller = await resolveAdvisoryCaller()
  if (!caller.authenticated || (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  try {
    const existing = await prisma.academicConsultationLog.findUnique({ where: { id } })
    if (existing) {
      const rel = await verifyStudentRelationship(caller, existing.studentId)
      if (!rel.allowed) {
        return NextResponse.json({ error: rel.reason || "Forbidden" }, { status: 403 })
      }
      await prisma.academicConsultationLog.delete({ where: { id } })
      await appendAdvisoryAuditLog({
        studentId: existing.studentId,
        actorId: caller.userId,
        actorRole: caller.actorRole,
        actorName: caller.actorName,
        entityType: "CONSULTATION",
        entityId: id,
        action: "DELETE_CONSULTATION",
        privacyTier: "PRIVATE_ADVISORY",
        summary: "Xóa biên bản tham vấn 1:1"
      })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      id,
      studentReflection,
      content,
      difficulties,
      nextActions,
      deadline,
      notes,
      privateAdvisorNotes,
      parentSharedSummary,
      shareWithParent,
      parentAcknowledged,
      parentFeedback
    } = body

    if (!id) {
      return NextResponse.json({ error: "Missing log id" }, { status: 400 })
    }

    const existing = await prisma.academicConsultationLog.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy biên bản tham vấn" }, { status: 404 })
    }

    const rel = await verifyStudentRelationship(caller, existing.studentId)
    if (!rel.allowed) {
      return NextResponse.json({ error: rel.reason || "Forbidden" }, { status: 403 })
    }

    const updateData: any = { updatedAt: new Date() }
    if (studentReflection !== undefined) updateData.studentReflection = studentReflection

    // Only Teacher/Admin can mutate core consultation content
    if (caller.actorRole === "TEACHER" || caller.actorRole === "ADMIN") {
      if (content !== undefined) updateData.content = content
      if (difficulties !== undefined) updateData.difficulties = difficulties
      if (nextActions !== undefined) updateData.nextActions = nextActions
      if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null
      if (notes !== undefined) updateData.notes = notes
    }

    const updated = await prisma.academicConsultationLog.update({
      where: { id },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            studentName: true,
            class: { select: { className: true } }
          }
        },
        teacher: { select: { id: true, teacherName: true } }
      }
    })

    // Sync policy & Parent Feedback / Teacher Sharing
    if (
      parentAcknowledged !== undefined ||
      parentFeedback !== undefined ||
      privateAdvisorNotes !== undefined ||
      parentSharedSummary !== undefined ||
      shareWithParent !== undefined
    ) {
      await upsertRecordPolicy({
        entityType: "CONSULTATION",
        entityId: id,
        studentId: existing.studentId,
        academicYearId: existing.academicYearId,
        privacyTier:
          shareWithParent === false ? "PRIVATE_ADVISORY" : "SHARED_EDUCATIONAL",
        shareWithParent: shareWithParent !== undefined ? Boolean(shareWithParent) : true,
        privateAdvisorNotes:
          caller.actorRole === "TEACHER" || caller.actorRole === "ADMIN"
            ? privateAdvisorNotes
            : undefined,
        parentSharedSummary:
          caller.actorRole === "TEACHER" || caller.actorRole === "ADMIN"
            ? parentSharedSummary
            : undefined,
        parentAcknowledged: parentAcknowledged ? true : undefined,
        parentFeedback: parentFeedback ?? undefined,
        parentFeedbackAt:
          parentAcknowledged || parentFeedback ? new Date().toISOString() : undefined,
        updatedById: caller.userId,
        updatedByRole: caller.actorRole
      })
    }

    await appendAdvisoryAuditLog({
      studentId: existing.studentId,
      actorId: caller.userId,
      actorRole: caller.actorRole,
      actorName: caller.actorName,
      entityType: "CONSULTATION",
      entityId: id,
      action:
        caller.actorRole === "STUDENT"
          ? "STUDENT_REFLECTION_SUBMITTED"
          : caller.actorRole === "PARENT"
          ? "PARENT_FEEDBACK_SUBMITTED"
          : "ADVISOR_UPDATED_CONSULTATION",
      privacyTier: "SHARED_EDUCATIONAL",
      summary:
        caller.actorRole === "STUDENT"
          ? "Học sinh cập nhật phản tư sau phiên cố vấn 1:1"
          : caller.actorRole === "PARENT"
          ? "Phụ huynh xác nhận đã đọc và gửi phản hồi phối hợp tại gia đình"
          : "CVHT cập nhật biên bản tham vấn",
      changes: {
        studentReflection,
        parentAcknowledged,
        parentFeedback
      }
    })

    return NextResponse.json({ success: true, log: updated })
  } catch (error: any) {
    console.error("PUT /api/advisory/consultations error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  return PUT(req)
}
