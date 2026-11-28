import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getAdminSession } from "@/lib/session"
import { resolveCampusQualityScope } from "@/lib/campus-quality/scope"
import { ensureTeacherQualitySchema } from "@/lib/teacher-quality/schemaEnsure"
import { normalizeCoachingStatus } from "@/lib/teacher-quality/recognitionEngine"

export const dynamic = "force-dynamic"

async function getAccess(session: any) {
  const adminSession = await getAdminSession()
  const userId = (session.user as any)?.id || adminSession.userId
  const roleCode = (session.user as any)?.role || adminSession.role || ""
  const scope = await resolveCampusQualityScope(userId, roleCode)

  const isManager = Boolean(
    adminSession.isSuperAdmin ||
      adminSession.isHeadOfAcademic ||
      adminSession.isTBP ||
      adminSession.isTTCM ||
      adminSession.isGDCS ||
      scope.roleTier === "SYSTEM_QA_EXEC" ||
      scope.roleTier === "CAMPUS_MANAGER" ||
      scope.roleTier === "DEPARTMENT_HEAD"
  )
  return { isManager, userId, teacherId: scope.teacherId }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 })
    }

    await ensureTeacherQualitySchema()
    const { isManager, userId, teacherId } = await getAccess(session)

    const { id } = await context.params
    const existing = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "TeacherDevelopmentPlan" WHERE "id" = ? LIMIT 1`,
      id
    )) as any[]

    if (!existing || existing.length === 0) {
      return NextResponse.json({ success: false, error: "Không tìm thấy nội dung bồi dưỡng" }, { status: 404 })
    }

    const prev = existing[0]
    const isOwnerTeacher = Boolean(teacherId && prev.teacherId === teacherId)
    if (!isManager && !isOwnerTeacher) {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền cập nhật nội dung bồi dưỡng này" },
        { status: 403 }
      )
    }

    const body = await req.json()

    const improvementNeeds =
      isManager && body.improvementNeeds !== undefined
        ? String(body.improvementNeeds || "").trim()
        : prev.improvementNeeds
    const activityType =
      isManager && body.activityType !== undefined
        ? body.activityType
          ? String(body.activityType).trim()
          : null
        : prev.activityType
    const developmentActivity =
      isManager && body.developmentActivity !== undefined
        ? String(body.developmentActivity || "").trim()
        : prev.developmentActivity
    const mentorTeacherId =
      isManager && body.mentorTeacherId !== undefined
        ? body.mentorTeacherId
          ? String(body.mentorTeacherId).trim()
          : null
        : prev.mentorTeacherId
    let mentorName =
      isManager && body.mentorName !== undefined
        ? body.mentorName
          ? String(body.mentorName).trim()
          : null
        : prev.mentorName

    if (mentorTeacherId && !mentorName) {
      const m = await prisma.teacher.findUnique({
        where: { id: mentorTeacherId },
        select: { teacherName: true },
      })
      mentorName = m?.teacherName || null
    }

    const dueDateIso =
      isManager && body.dueDate !== undefined
        ? body.dueDate
          ? new Date(body.dueDate).toISOString()
          : null
        : prev.dueDate

    const status =
      body.status !== undefined
        ? normalizeCoachingStatus(body.status)
        : normalizeCoachingStatus(prev.status)

    const applicationNotes =
      body.applicationNotes !== undefined
        ? body.applicationNotes
          ? String(body.applicationNotes).trim()
          : null
        : body.postCoachingNotes !== undefined
          ? body.postCoachingNotes
            ? String(body.postCoachingNotes).trim()
            : null
          : prev.applicationNotes ?? prev.postCoachingNotes

    const nextSupportNeeds =
      body.nextSupportNeeds !== undefined
        ? body.nextSupportNeeds
          ? String(body.nextSupportNeeds).trim()
          : null
        : prev.nextSupportNeeds

    const followUpEvaluationId =
      body.followUpEvaluationId !== undefined
        ? body.followUpEvaluationId
          ? String(body.followUpEvaluationId).trim()
          : null
        : prev.followUpEvaluationId

    let followUpSlotId =
      body.followUpSlotId !== undefined
        ? body.followUpSlotId
          ? String(body.followUpSlotId).trim()
          : null
        : prev.followUpSlotId

    if (followUpEvaluationId && !followUpSlotId) {
      const fEv = await prisma.observationEvaluation.findUnique({
        where: { id: followUpEvaluationId },
        select: { slotId: true },
      })
      followUpSlotId = fEv?.slotId || null
    } else if (!followUpEvaluationId) {
      followUpSlotId = null
    }

    const outcomeRating =
      body.outcomeRating !== undefined
        ? body.outcomeRating
          ? String(body.outcomeRating).trim()
          : null
        : prev.outcomeRating

    const nowIso = new Date().toISOString()
    const completedAtIso =
      status === "COMPLETED" ? prev.completedAt || nowIso : null

    await prisma.$executeRawUnsafe(
      `UPDATE "TeacherDevelopmentPlan"
       SET "improvementNeeds" = ?,
           "activityType" = ?,
           "developmentActivity" = ?,
           "mentorTeacherId" = ?,
           "mentorName" = ?,
           "dueDate" = ?,
           "status" = ?,
           "postCoachingNotes" = ?,
           "applicationNotes" = ?,
           "nextSupportNeeds" = ?,
           "followUpSlotId" = ?,
           "followUpEvaluationId" = ?,
           "outcomeRating" = ?,
           "completedAt" = ?,
           "updatedById" = ?,
           "updatedAt" = ?
       WHERE "id" = ?`,
      improvementNeeds,
      activityType,
      developmentActivity,
      mentorTeacherId,
      mentorName,
      dueDateIso,
      status,
      applicationNotes,
      applicationNotes,
      nextSupportNeeds,
      followUpSlotId,
      followUpEvaluationId,
      outcomeRating,
      completedAtIso,
      userId || null,
      nowIso,
      id
    )

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật tiến độ & ghi nhận bồi dưỡng",
    })
  } catch (err: any) {
    console.error("[PATCH /api/admin/teacher-quality/development-plans/[id]] Error:", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi cập nhật nội dung bồi dưỡng" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 })
    }

    await ensureTeacherQualitySchema()
    const { isManager } = await getAccess(session)
    if (!isManager) {
      return NextResponse.json(
        { success: false, error: "Chỉ TTCM / GĐCS / BGH có quyền xóa nội dung bồi dưỡng" },
        { status: 403 }
      )
    }

    const { id } = await context.params
    await prisma.$executeRawUnsafe(`DELETE FROM "TeacherDevelopmentPlan" WHERE "id" = ?`, id)

    return NextResponse.json({ success: true, message: "Đã xóa nội dung bồi dưỡng" })
  } catch (err: any) {
    console.error("[DELETE /api/admin/teacher-quality/development-plans/[id]] Error:", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi xóa nội dung bồi dưỡng" },
      { status: 500 }
    )
  }
}
