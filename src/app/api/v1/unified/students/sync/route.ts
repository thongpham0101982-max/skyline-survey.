import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { syncAllStudents, upsertStudentSnapshot } from "@/lib/api-consolidation"
import { validateApiRequest } from "@/lib/api-auth"

export async function POST(request: Request) {
  // Can be called either by logged-in admin session or API key with students:write
  let authorized = false
  let triggeredBy = "unknown"

  // 1. Check Session Auth
  const session = await auth()
  if (session?.user) {
    const role = ((session?.user as any)?.role || "").toUpperCase().trim()
    if (["ADMIN", "SUPER_ADMIN", "SUPERADMIN"].includes(role)) {
      authorized = true
      triggeredBy = `Admin:${session.user.name || session.user.email}`
    }
  }

  // 2. Check API Key if not authorized by session
  if (!authorized) {
    const authResult = await validateApiRequest(request, ["students:write"])
    if (authResult.ok) {
      authorized = true
      triggeredBy = `ApiKey:${authResult.context.application.name}`
    }
  }

  if (!authorized) {
    return NextResponse.json(
      { success: false, error: "Yêu cầu quyền Quản trị viên hoặc API Key có quyền 'students:write'" },
      { status: 403 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { studentId, classId, campusId } = body

    if (studentId) {
      const updated = await upsertStudentSnapshot(studentId)
      if (!updated) {
        return NextResponse.json(
          { success: false, error: `Không tìm thấy học sinh với ID "${studentId}"` },
          { status: 404 }
        )
      }
      return NextResponse.json({
        success: true,
        message: "Đã làm tươi snapshot học sinh thành công",
        triggeredBy,
        data: { studentId },
      })
    }

    const result = await syncAllStudents(classId, campusId)
    return NextResponse.json({
      success: true,
      message: `Đồng bộ bảng Snapshot Học sinh hoàn tất (${result.syncedCount} hồ sơ)`,
      triggeredBy,
      data: result,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Lỗi đồng bộ bảng Snapshot Học sinh" },
      { status: 500 }
    )
  }
}
