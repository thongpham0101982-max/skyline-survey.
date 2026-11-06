import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  validateApiRequest,
  apiSuccess,
  apiError,
  isCampusInScope,
  isClassInScope,
  logApiAccess,
  recordApiAuditLog,
} from "@/lib/api-auth"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params
  const authResult = await validateApiRequest(request, "assignments:write")
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult

  let body: any = null
  try {
    body = await request.json()
  } catch {
    return apiError("INVALID_JSON", "Định dạng JSON gửi lên không hợp lệ", 400, requestId)
  }

  try {
    const existing = await prisma.teachingAssignment.findUnique({
      where: { id },
      include: {
        class: true,
        teacher: true,
      },
    })

    if (!existing) {
      return apiError("NOT_FOUND", `Phân công giảng dạy ID "${id}" không tồn tại`, 404, requestId)
    }

    // 1. Anti-IDOR Scope Check
    const { allowedCampusIds, allowedClassIds } = context.application
    if (!isCampusInScope(allowedCampusIds, existing.class.campusId) || !isClassInScope(allowedClassIds, existing.classId)) {
      await logApiAccess({
        applicationId: context.application.id,
        keyId: context.key.keyId,
        requestId,
        endpoint: `/api/v1/assignments/${id}`,
        method: "PATCH",
        statusCode: 403,
        durationMs: Date.now() - startTime,
        errorMessage: "Scope violation on assignment PATCH",
      })
      return apiError("ACCESS_DENIED_SCOPE", "Không có quyền sửa phân công thuộc lớp hoặc cơ sở này", 403, requestId)
    }

    // 2. Concurrency / Version Check
    const expectedVersion = body.expectedVersion ?? body.version
    if (expectedVersion !== undefined) {
      const currentFingerprint = `${existing.teacherId}_${existing.classId}_${existing.subjectId}_${existing.semester}`
      if (String(expectedVersion) !== currentFingerprint && String(expectedVersion) !== existing.id) {
        return apiError(
          "VERSION_CONFLICT",
          "Phân công này đã bị thay đổi bởi thao tác khác. Vui lòng tải lại trước khi tiếp tục.",
          409,
          requestId,
          { currentVersion: currentFingerprint }
        )
      }
    }

    // 3. Prepare update fields
    const updateData: Record<string, any> = {}

    if (body.teacherId && body.teacherId !== existing.teacherId) {
      const teacher = await prisma.teacher.findUnique({ where: { id: body.teacherId } })
      if (!teacher) return apiError("NOT_FOUND", `Giáo viên ID "${body.teacherId}" không tồn tại`, 404, requestId)
      updateData.teacherId = body.teacherId
    }

    if (body.semester !== undefined) {
      updateData.semester = Number(body.semester)
    }

    if (Object.keys(updateData).length === 0) {
      return apiSuccess(existing, requestId)
    }

    const updated = await prisma.teachingAssignment.update({
      where: { id },
      data: updateData,
      include: {
        teacher: { select: { teacherName: true, teacherCode: true } },
        class: { select: { className: true } },
        subject: { select: { subjectName: true } },
      },
    })

    // Audit log
    await recordApiAuditLog({
      applicationId: context.application.id,
      appName: context.application.name,
      action: "API_UPDATE_ASSIGNMENT",
      targetTable: "TeachingAssignment",
      targetId: id,
      oldValues: { teacherId: existing.teacherId, semester: existing.semester },
      newValues: updateData,
    })

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: `/api/v1/assignments/${id}`,
      method: "PATCH",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      requestSummary: `Updated assignment ${id}`,
    })

    return apiSuccess(updated, requestId)
  } catch (error: any) {
    console.error(`[API_ASSIGNMENT_PATCH][${requestId}] Error:`, error)
    return apiError("INTERNAL_ERROR", "Đã xảy ra lỗi khi cập nhật phân công giảng dạy", 500, requestId)
  }
}
