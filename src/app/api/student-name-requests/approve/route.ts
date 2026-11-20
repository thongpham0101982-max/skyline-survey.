import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { logActivity } from "@/lib/audit"
import { ensureStudentNameChangeSchema } from "@/lib/student-name-requests/schemaInit"
import {
  canUserApproveNameChange,
  syncStudentNameAcrossTables,
} from "@/lib/student-name-requests/helpers"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 })
    }

    const role = (session.user as { role?: string }).role
    const canApprove = await canUserApproveNameChange(role)
    if (!canApprove) {
      return NextResponse.json(
        { error: "Bạn không có quyền phê duyệt hoặc từ chối yêu cầu đổi tên học sinh." },
        { status: 403 }
      )
    }

    await ensureStudentNameChangeSchema()

    const body = await req.json()
    const rawIds: string[] = Array.isArray(body?.ids)
      ? body.ids.map((x: unknown) => String(x || "").trim()).filter(Boolean)
      : body?.id
      ? [String(body.id).trim()]
      : []
    const action = String(body?.action || "").toUpperCase().trim()
    const rejectReason = String(body?.rejectReason || "").trim()

    if (rawIds.length === 0) {
      return NextResponse.json({ error: "Vui lòng chọn ít nhất một yêu cầu." }, { status: 400 })
    }
    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ error: "Hành động không hợp lệ (APPROVE | REJECT)." }, { status: 400 })
    }

    const placeholders = rawIds.map(() => "?").join(", ")
    const pendingRows = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "StudentNameChangeRequest" WHERE "id" IN (${placeholders}) AND "status" = 'PENDING'`,
      ...rawIds
    )) as Array<Record<string, unknown>>

    if (pendingRows.length === 0) {
      return NextResponse.json(
        { error: "Không có yêu cầu nào ở trạng thái Chờ duyệt trong danh sách đã chọn." },
        { status: 400 }
      )
    }

    const userId = session.user.id || null
    const userName = session.user.name || session.user.email || "Hệ thống"
    const nowIso = new Date().toISOString()

    let processedCount = 0

    for (const row of pendingRows) {
      if (action === "APPROVE") {
        // 1. Update Student master record
        await prisma.student.update({
          where: { id: String(row.studentId) },
          data: {
            studentName: String(row.newName),
          },
        })

        // 2. Sync to entrance assessment records if present
        await syncStudentNameAcrossTables(String(row.studentCode), String(row.newName))

        // 3. Mark request as APPROVED (preserve original updatedByName; record approver in approvedByName)
        await prisma.$executeRawUnsafe(
          `UPDATE "StudentNameChangeRequest"
           SET "status" = 'APPROVED', "approvedById" = ?, "approvedByName" = ?, "approvedAt" = ?,
               "updatedAt" = ?, "rejectReason" = NULL
           WHERE "id" = ?`,
          userId,
          userName,
          nowIso,
          nowIso,
          String(row.id)
        )

        await logActivity(
          userId || "SYSTEM",
          session.user.email || userName,
          "APPROVE_STUDENT_NAME_CHANGE",
          "Student",
          String(row.studentId),
          { studentCode: row.studentCode, studentName: row.oldName },
          { studentCode: row.studentCode, studentName: row.newName, requestId: row.id }
        )
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE "StudentNameChangeRequest"
           SET "status" = 'REJECTED', "approvedById" = ?, "approvedByName" = ?, "approvedAt" = ?,
               "updatedAt" = ?, "rejectReason" = ?
           WHERE "id" = ?`,
          userId,
          userName,
          nowIso,
          nowIso,
          rejectReason || null,
          String(row.id)
        )

        await logActivity(
          userId || "SYSTEM",
          session.user.email || userName,
          "REJECT_STUDENT_NAME_CHANGE",
          "StudentNameChangeRequest",
          String(row.id),
          { status: "PENDING" },
          { status: "REJECTED", rejectReason }
        )
      }
      processedCount++
    }

    return NextResponse.json({
      success: true,
      processedCount,
      message:
        action === "APPROVE"
          ? `Đã duyệt ${processedCount} yêu cầu và tự động cập nhật họ tên học sinh trên toàn hệ thống.`
          : `Đã từ chối ${processedCount} yêu cầu đổi tên học sinh.`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi xử lý phê duyệt yêu cầu."
    console.error("[POST /api/student-name-requests/approve] Error:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
