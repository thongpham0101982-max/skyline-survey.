import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  resolveAdvisoryCaller,
  verifyStudentRelationship,
  sanitizeReflectionForViewer
} from "@/lib/advisory/rbac-guard"
import {
  getPoliciesByStudentIds,
  getRecordPolicy,
  upsertRecordPolicy,
  appendAdvisoryAuditLog
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
  const academicYearId = searchParams.get("academicYearId")

  try {
    let targetStudentIds: string[] = []
    const studentMap = new Map<string, any>()

    if (studentId) {
      const rel = await verifyStudentRelationship(caller, studentId)
      if (!rel.allowed) {
        return NextResponse.json({ error: rel.reason || "Forbidden" }, { status: 403 })
      }
      targetStudentIds = rel.allStudentIds
      studentMap.set(rel.student.id, rel.student)
    } else if (classId) {
      if (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const clsStudents = await prisma.student
        .findMany({
          where: { classId, status: { not: "TRANSFERRED_OUT" } },
          select: { id: true, studentName: true, studentCode: true }
        })
        .catch(() => [])
      targetStudentIds = clsStudents.map(s => s.id)
      for (const s of clsStudents) studentMap.set(s.id, s)
    } else {
      return NextResponse.json({ error: "Missing studentId or classId" }, { status: 400 })
    }

    if (targetStudentIds.length === 0) {
      return NextResponse.json([])
    }

    const reflections = await prisma.studentReflection.findMany({
      where: {
        studentId: { in: targetStudentIds },
        ...(academicYearId ? { academicYearId } : {})
      },
      orderBy: { createdAt: "desc" }
    })

    const policyMap = await getPoliciesByStudentIds(targetStudentIds, "REFLECTION")

    const sanitized = reflections
      .map(r => {
        const pol = policyMap.get(`REFLECTION:${r.id}`) || null
        const clean = sanitizeReflectionForViewer(r, pol, caller.actorRole)
        if (!clean) return null
        const st = studentMap.get(r.studentId)
        return {
          ...clean,
          studentName: st?.studentName || "",
          studentCode: st?.studentCode || ""
        }
      })
      .filter(Boolean)

    return NextResponse.json(sanitized)
  } catch (error: any) {
    console.error("GET /api/advisory/reflections error:", error)
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
      period,
      feeling,
      reflectionText,
      selfRating,
      difficulties,
      helpNeededText,
      shareWithParent = false
    } = body

    const targetStudentId = studentId || caller.studentId
    if (!targetStudentId || !reflectionText) {
      return NextResponse.json(
        { error: "Vui lòng nhập nội dung tự đánh giá / phản tư" },
        { status: 400 }
      )
    }

    const rel = await verifyStudentRelationship(caller, targetStudentId)
    if (!rel.allowed) {
      return NextResponse.json({ error: rel.reason || "Forbidden" }, { status: 403 })
    }

    const reflection = await prisma.studentReflection.create({
      data: {
        studentId: rel.student.id,
        academicYearId: academicYearId || rel.student.academicYearId || "",
        period: period || "TUAN_NAY",
        feeling: feeling || "HAPPY",
        reflectionText,
        selfRating: selfRating || 5,
        difficulties: difficulties || null,
        helpNeededText: helpNeededText || null
      }
    })

    const privacyTier = shareWithParent ? "SHARED_EDUCATIONAL" : "PRIVATE_ADVISORY"

    await upsertRecordPolicy({
      entityType: "REFLECTION",
      entityId: reflection.id,
      studentId: rel.student.id,
      academicYearId: reflection.academicYearId,
      privacyTier,
      shareWithParent: Boolean(shareWithParent),
      updatedById: caller.userId,
      updatedByRole: caller.actorRole
    })

    await appendAdvisoryAuditLog({
      studentId: rel.student.id,
      actorId: caller.userId,
      actorRole: caller.actorRole,
      actorName: caller.actorName,
      entityType: "REFLECTION",
      entityId: reflection.id,
      action: "CREATE_REFLECTION",
      privacyTier,
      summary: `Học sinh gửi phiếu tự phản tư (${period || "TUAN_NAY"})`,
      changes: { feeling, selfRating, shareWithParent: Boolean(shareWithParent) }
    })

    return NextResponse.json({
      success: true,
      reflection: {
        ...reflection,
        privacyTier,
        shareWithParent: Boolean(shareWithParent)
      }
    })
  } catch (error: any) {
    console.error("POST /api/advisory/reflections error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, advisorFeedback, shareWithParent } = body
    if (!id) {
      return NextResponse.json({ error: "Missing reflection id" }, { status: 400 })
    }

    const existing = await prisma.studentReflection.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Reflection not found" }, { status: 404 })
    }

    const rel = await verifyStudentRelationship(caller, existing.studentId)
    if (!rel.allowed) {
      return NextResponse.json({ error: rel.reason || "Forbidden" }, { status: 403 })
    }

    const existingPolicy = await getRecordPolicy("REFLECTION", id)
    const nextShare =
      typeof shareWithParent === "boolean"
        ? shareWithParent
        : Boolean(existingPolicy?.shareWithParent)
    const nextTier = nextShare ? "SHARED_EDUCATIONAL" : "PRIVATE_ADVISORY"
    const nextFeedback =
      caller.actorRole === "TEACHER" || caller.actorRole === "ADMIN"
        ? advisorFeedback !== undefined
          ? advisorFeedback
          : existingPolicy?.advisorReviewNote || ""
        : existingPolicy?.advisorReviewNote || ""

    await upsertRecordPolicy({
      entityType: "REFLECTION",
      entityId: id,
      studentId: existing.studentId,
      academicYearId: existing.academicYearId,
      privacyTier: nextTier,
      shareWithParent: nextShare,
      advisorReviewNote: nextFeedback,
      updatedById: caller.userId,
      updatedByRole: caller.actorRole
    })

    await appendAdvisoryAuditLog({
      studentId: existing.studentId,
      actorId: caller.userId,
      actorRole: caller.actorRole,
      actorName: caller.actorName,
      entityType: "REFLECTION",
      entityId: id,
      action:
        caller.actorRole === "STUDENT"
          ? "STUDENT_UPDATE_REFLECTION_PRIVACY"
          : "ADVISOR_FEEDBACK_REFLECTION",
      privacyTier: nextTier,
      summary:
        caller.actorRole === "STUDENT"
          ? `Học sinh cập nhật phạm vi chia sẻ phiếu tự phản tư (${nextShare ? "Chia sẻ cùng PHHS" : "Chỉ gửi CVHT"})`
          : `CVHT phản hồi phiếu tự phản tư của học sinh`,
      changes: { advisorFeedback: nextFeedback, shareWithParent: nextShare }
    })

    return NextResponse.json({
      success: true,
      shareWithParent: nextShare,
      privacyTier: nextTier,
      advisorFeedback: nextFeedback
    })
  } catch (error: any) {
    console.error("PATCH /api/advisory/reflections error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
