import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  resolveAdvisoryCaller,
  verifyStudentRelationship,
  sanitizeHelpRequestForViewer
} from "@/lib/advisory/rbac-guard"
import {
  getPoliciesByStudentIds,
  upsertRecordPolicy,
  appendAdvisoryAuditLog,
  PrivacyTier
} from "@/lib/advisory/triparty-sync"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const caller = await resolveAdvisoryCaller()
  if (!caller.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get("studentId") || (caller.actorRole === "STUDENT" ? caller.studentId : null)
  const classId = searchParams.get("classId")

  try {
    let targetStudentIds: string[] = []
    if (studentId) {
      const rel = await verifyStudentRelationship(caller, studentId)
      if (!rel.allowed) {
        return NextResponse.json({ error: rel.reason || "Forbidden" }, { status: 403 })
      }
      targetStudentIds = rel.allStudentIds
    } else if (classId) {
      if (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const classStudents = await prisma.student.findMany({
        where: { classId, status: { not: "TRANSFERRED_OUT" } },
        select: { id: true }
      })
      targetStudentIds = classStudents.map(s => s.id)
    }

    const whereCondition: any = {}
    if (targetStudentIds.length > 0) {
      whereCondition.studentId = { in: targetStudentIds }
    }

    const requests = await prisma.studentHelpRequest.findMany({
      where: whereCondition,
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
      orderBy: { createdAt: "desc" }
    })

    const allReqStudentIds = Array.from(new Set([...targetStudentIds, ...requests.map(r => r.studentId)]))
    const policyMap = await getPoliciesByStudentIds(allReqStudentIds, "HELP_REQUEST")

    const sanitized = requests
      .map(r => {
        const pol = policyMap.get(`HELP_REQUEST:${r.id}`) || null
        return sanitizeHelpRequestForViewer(r, pol, caller.actorRole)
      })
      .filter(Boolean)

    return NextResponse.json(sanitized)
  } catch (error: any) {
    console.error("GET /api/advisory/help-requests error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      studentId,
      academicYearId,
      category,
      content,
      urgency,
      shareWithParent = false,
      privacyTier
    } = body

    const targetStudentId = studentId || caller.studentId
    if (!targetStudentId || !content) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ nội dung yêu cầu hỗ trợ" },
        { status: 400 }
      )
    }

    const rel = await verifyStudentRelationship(caller, targetStudentId)
    if (!rel.allowed) {
      return NextResponse.json({ error: rel.reason || "Forbidden" }, { status: 403 })
    }

    const student = rel.student

    let targetAyId = academicYearId || student?.academicYearId
    if (!targetAyId) {
      const activeAy = await prisma.academicYear
        .findFirst({ where: { status: "ACTIVE" } })
        .catch(() => null)
      const firstAy = activeAy || (await prisma.academicYear.findFirst().catch(() => null))
      targetAyId = firstAy?.id || "default_ay"
    }

    const teacherId = student?.class?.homeroomTeacherId || null
    const resolvedCategory = category || "HOC_TAP"
    const isSensitive =
      resolvedCategory.toUpperCase().includes("TAM_LY") ||
      resolvedCategory.toUpperCase().includes("MOI_QUAN_HE")

    // Nguyên tắc an toàn: Không tự động chia sẻ nội dung riêng tư / tâm lý của học sinh cho PHHS
    const effectiveShareWithParent = isSensitive ? false : Boolean(shareWithParent)
    const resolvedTier: PrivacyTier =
      privacyTier ||
      (isSensitive
        ? "RESTRICTED_SAFEGUARDING"
        : effectiveShareWithParent
        ? "SHARED_EDUCATIONAL"
        : "PRIVATE_ADVISORY")

    const newRequest = await prisma.studentHelpRequest.create({
      data: {
        studentId: student.id,
        academicYearId: targetAyId,
        teacherId,
        category: resolvedCategory,
        content,
        urgency: urgency || "MEDIUM",
        status: "PENDING"
      }
    })

    await upsertRecordPolicy({
      entityType: "HELP_REQUEST",
      entityId: newRequest.id,
      studentId: student.id,
      academicYearId: targetAyId,
      privacyTier: resolvedTier,
      shareWithParent: effectiveShareWithParent,
      updatedById: caller.userId,
      updatedByRole: caller.actorRole
    })

    await appendAdvisoryAuditLog({
      studentId: student.id,
      actorId: caller.userId,
      actorRole: caller.actorRole,
      actorName: caller.actorName,
      entityType: "HELP_REQUEST",
      entityId: newRequest.id,
      action: "CREATE_HELP_REQUEST",
      privacyTier: resolvedTier,
      summary: `Học sinh gửi đề nghị hỗ trợ (${resolvedCategory} - ${resolvedTier})`,
      changes: {
        category: resolvedCategory,
        urgency: urgency || "MEDIUM",
        shareWithParent: effectiveShareWithParent,
        privacyTier: resolvedTier
      }
    })

    return NextResponse.json({
      success: true,
      request: {
        ...newRequest,
        privacyTier: resolvedTier,
        shareWithParent: effectiveShareWithParent
      }
    })
  } catch (error: any) {
    console.error("POST /api/advisory/help-requests error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const caller = await resolveAdvisoryCaller()
  if (!caller.authenticated || (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      id,
      status,
      responseNotes,
      privateAdvisorNotes,
      shareWithParent,
      privacyTier
    } = body

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const existing = await prisma.studentHelpRequest.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy yêu cầu hỗ trợ" }, { status: 404 })
    }

    const rel = await verifyStudentRelationship(caller, existing.studentId)
    if (!rel.allowed) {
      return NextResponse.json({ error: rel.reason || "Forbidden" }, { status: 403 })
    }

    const updateData: any = { updatedAt: new Date() }
    if (status !== undefined) updateData.status = status
    if (responseNotes !== undefined) updateData.responseNotes = responseNotes
    if (status === "RESOLVED") updateData.resolvedAt = new Date()

    const updated = await prisma.studentHelpRequest.update({
      where: { id },
      data: updateData,
      include: {
        student: { select: { id: true, studentCode: true, studentName: true } },
        teacher: { select: { id: true, teacherName: true } }
      }
    })

    if (
      privateAdvisorNotes !== undefined ||
      shareWithParent !== undefined ||
      privacyTier !== undefined
    ) {
      const isSensitive = String(existing.category || "").toUpperCase().includes("TAM_LY")
      const resolvedTier: PrivacyTier =
        privacyTier ||
        (shareWithParent
          ? "SHARED_EDUCATIONAL"
          : isSensitive
          ? "RESTRICTED_SAFEGUARDING"
          : "PRIVATE_ADVISORY")

      await upsertRecordPolicy({
        entityType: "HELP_REQUEST",
        entityId: id,
        studentId: existing.studentId,
        academicYearId: existing.academicYearId,
        privacyTier: resolvedTier,
        shareWithParent: Boolean(shareWithParent),
        privateAdvisorNotes: privateAdvisorNotes ?? null,
        updatedById: caller.userId,
        updatedByRole: caller.actorRole
      })
    }

    await appendAdvisoryAuditLog({
      studentId: existing.studentId,
      actorId: caller.userId,
      actorRole: caller.actorRole,
      actorName: caller.actorName,
      entityType: "HELP_REQUEST",
      entityId: id,
      action: "ADVISOR_RESPOND_HELP_REQUEST",
      privacyTier: shareWithParent ? "SHARED_EDUCATIONAL" : "RESTRICTED_SAFEGUARDING",
      summary: `CVHT phản hồi yêu cầu hỗ trợ (${status || existing.status})`,
      changes: { status, responseNotes, shareWithParent }
    })

    return NextResponse.json({ success: true, request: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
