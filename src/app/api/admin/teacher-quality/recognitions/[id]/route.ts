import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getAdminSession } from "@/lib/session"
import { resolveCampusQualityScope } from "@/lib/campus-quality/scope"
import { ensureTeacherQualitySchema } from "@/lib/teacher-quality/schemaEnsure"

export const dynamic = "force-dynamic"

async function checkAccess(session: any, record: any): Promise<boolean> {
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
  if (isManager) return true
  return Boolean(
    scope.teacherId && record.teacherId === scope.teacherId && record.groupType === "AI_TECH"
  )
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

    const { id } = await context.params
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "TeacherRecognition" WHERE "id" = ? LIMIT 1`,
      id
    )) as any[]
    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: "Không tìm thấy bản ghi" }, { status: 404 })
    }

    const prev = rows[0]
    if (!(await checkAccess(session, prev))) {
      return NextResponse.json({ success: false, error: "Không có quyền chỉnh sửa bản ghi này" }, { status: 403 })
    }

    const body = await req.json()
    const nowIso = new Date().toISOString()

    await prisma.$executeRawUnsafe(
      `UPDATE "TeacherRecognition"
       SET "title" = ?,
           "issuingAuthority" = ?,
           "awardScope" = ?,
           "eventBatch" = ?,
           "teacherRole" = ?,
           "participantCount" = ?,
           "resultSummary" = ?,
           "recordedDate" = ?,
           "dedupKey" = ?,
           "notes" = ?,
           "updatedAt" = ?
       WHERE "id" = ?`,
      body.title !== undefined ? String(body.title).trim() : prev.title,
      body.issuingAuthority !== undefined
        ? body.issuingAuthority
          ? String(body.issuingAuthority).trim()
          : null
        : prev.issuingAuthority,
      body.awardScope !== undefined
        ? body.awardScope
          ? String(body.awardScope).trim()
          : null
        : prev.awardScope,
      body.eventBatch !== undefined
        ? body.eventBatch
          ? String(body.eventBatch).trim()
          : null
        : prev.eventBatch,
      body.teacherRole !== undefined
        ? body.teacherRole
          ? String(body.teacherRole).trim()
          : null
        : prev.teacherRole,
      body.participantCount !== undefined
        ? body.participantCount === "" || body.participantCount === null
          ? null
          : Number(body.participantCount)
        : prev.participantCount,
      body.resultSummary !== undefined
        ? body.resultSummary
          ? String(body.resultSummary).trim()
          : null
        : prev.resultSummary,
      body.recordedDate !== undefined
        ? body.recordedDate
          ? String(body.recordedDate).trim()
          : null
        : prev.recordedDate,
      body.dedupKey !== undefined
        ? body.dedupKey
          ? String(body.dedupKey).trim()
          : null
        : prev.dedupKey,
      body.notes !== undefined ? (body.notes ? String(body.notes).trim() : null) : prev.notes,
      nowIso,
      id
    )

    return NextResponse.json({ success: true, message: "Đã cập nhật bản ghi" })
  } catch (err: any) {
    console.error("[PATCH /api/admin/teacher-quality/recognitions/[id]] Error:", err)
    return NextResponse.json({ success: false, error: err?.message || "Lỗi cập nhật" }, { status: 500 })
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

    const { id } = await context.params
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "TeacherRecognition" WHERE "id" = ? LIMIT 1`,
      id
    )) as any[]
    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: "Không tìm thấy bản ghi" }, { status: 404 })
    }

    if (!(await checkAccess(session, rows[0]))) {
      return NextResponse.json({ success: false, error: "Không có quyền xóa bản ghi này" }, { status: 403 })
    }

    await prisma.$executeRawUnsafe(`DELETE FROM "TeacherRecognition" WHERE "id" = ?`, id)
    return NextResponse.json({ success: true, message: "Đã xóa bản ghi" })
  } catch (err: any) {
    console.error("[DELETE /api/admin/teacher-quality/recognitions/[id]] Error:", err)
    return NextResponse.json({ success: false, error: err?.message || "Lỗi xóa" }, { status: 500 })
  }
}
