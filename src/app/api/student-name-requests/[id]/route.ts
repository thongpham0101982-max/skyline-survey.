import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { logActivity } from "@/lib/audit"
import { ensureStudentNameChangeSchema } from "@/lib/student-name-requests/schemaInit"
import {
  canModifyRequestStatus,
  canUserAccessNameChange,
  validateNameChangeInput,
} from "@/lib/student-name-requests/helpers"

export const dynamic = "force-dynamic"

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 })
    }

    const role = (session.user as { role?: string }).role
    const hasAccess = await canUserAccessNameChange(role)
    if (!hasAccess) {
      return NextResponse.json({ error: "Không có quyền chỉnh sửa yêu cầu." }, { status: 403 })
    }

    await ensureStudentNameChangeSchema()
    const { id } = await context.params

    const existingRows = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "StudentNameChangeRequest" WHERE "id" = ? LIMIT 1`,
      id
    )) as Array<Record<string, unknown>>

    if (existingRows.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy yêu cầu đổi tên." }, { status: 404 })
    }

    const existing = existingRows[0]
    if (!canModifyRequestStatus(String(existing.status))) {
      return NextResponse.json(
        { error: "Yêu cầu đã được duyệt không thể chỉnh sửa để đảm bảo tính toàn vẹn dữ liệu." },
        { status: 400 }
      )
    }

    const body = await req.json()
    const newName = String(body?.newName ?? existing.newName)
    const reason = String(body?.reason ?? existing.reason)

    const validation = validateNameChangeInput({
      oldName: String(existing.oldName),
      newName,
      reason,
    })
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const userId = session.user.id || null
    const userName = session.user.name || session.user.email || "Hệ thống"
    const nowIso = new Date().toISOString()

    // If it was REJECTED and edited, reset status back to PENDING for re-review
    await prisma.$executeRawUnsafe(
      `UPDATE "StudentNameChangeRequest"
       SET "newName" = ?, "reason" = ?, "status" = 'PENDING', "rejectReason" = NULL,
           "updatedById" = ?, "updatedByName" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
      validation.cleanedNewName!,
      validation.cleanedReason!,
      userId,
      userName,
      nowIso,
      id
    )

    await logActivity(
      userId || "SYSTEM",
      session.user.email || userName,
      "UPDATE_STUDENT_NAME_CHANGE_REQUEST",
      "StudentNameChangeRequest",
      id,
      { newName: existing.newName, reason: existing.reason, status: existing.status },
      { newName: validation.cleanedNewName, reason: validation.cleanedReason, status: "PENDING" }
    )

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật yêu cầu đổi tên học sinh.",
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi cập nhật yêu cầu."
    console.error("[PATCH /api/student-name-requests/[id]] Error:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 })
    }

    const role = (session.user as { role?: string }).role
    const hasAccess = await canUserAccessNameChange(role)
    if (!hasAccess) {
      return NextResponse.json({ error: "Không có quyền xóa yêu cầu." }, { status: 403 })
    }

    await ensureStudentNameChangeSchema()
    const { id } = await context.params

    const existingRows = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "StudentNameChangeRequest" WHERE "id" = ? LIMIT 1`,
      id
    )) as Array<Record<string, unknown>>

    if (existingRows.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy yêu cầu đổi tên." }, { status: 404 })
    }

    const existing = existingRows[0]
    if (!canModifyRequestStatus(String(existing.status))) {
      return NextResponse.json(
        { error: "Không thể xóa yêu cầu đã được duyệt để lưu giữ lịch sử thay đổi họ tên." },
        { status: 400 }
      )
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM "StudentNameChangeRequest" WHERE "id" = ?`,
      id
    )

    const userId = session.user.id || "SYSTEM"
    await logActivity(
      userId,
      session.user.email || session.user.name || "SYSTEM",
      "DELETE_STUDENT_NAME_CHANGE_REQUEST",
      "StudentNameChangeRequest",
      id,
      { studentCode: existing.studentCode, oldName: existing.oldName, newName: existing.newName },
      null
    )

    return NextResponse.json({
      success: true,
      message: "Đã xóa yêu cầu đổi tên học sinh.",
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi xóa yêu cầu."
    console.error("[DELETE /api/student-name-requests/[id]] Error:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
