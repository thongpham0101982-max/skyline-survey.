import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { syncAllTeachers, upsertTeacherSnapshot } from "@/lib/api-consolidation"
import { validateApiRequest } from "@/lib/api-auth"

export async function POST(request: Request) {
  // Can be called either by logged-in admin session or API key with teachers:write
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
    const authResult = await validateApiRequest(request, ["teachers:write"])
    if (authResult.ok) {
      authorized = true
      triggeredBy = `ApiKey:${authResult.context.application.name}`
    }
  }

  if (!authorized) {
    return NextResponse.json(
      { success: false, error: "Yêu cầu quyền Quản trị viên hoặc API Key có quyền 'teachers:write'" },
      { status: 403 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { teacherId, campusId } = body

    if (teacherId) {
      const updated = await upsertTeacherSnapshot(teacherId)
      if (!updated) {
        return NextResponse.json(
          { success: false, error: `Không tìm thấy giáo viên với ID "${teacherId}"` },
          { status: 404 }
        )
      }
      return NextResponse.json({
        success: true,
        message: "Đã làm tươi snapshot giáo viên thành công",
        triggeredBy,
        data: { teacherId },
      })
    }

    const result = await syncAllTeachers(campusId)
    return NextResponse.json({
      success: true,
      message: `Đồng bộ bảng Snapshot Giáo viên hoàn tất (${result.syncedCount} hồ sơ)`,
      triggeredBy,
      data: result,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Lỗi đồng bộ bảng Snapshot Giáo viên" },
      { status: 500 }
    )
  }
}
