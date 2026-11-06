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
  const authResult = await validateApiRequest(request, "survey-results:write")
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult

  let body: any = null
  try {
    body = await request.json()
  } catch {
    return apiError("INVALID_JSON", "Định dạng JSON gửi lên không hợp lệ", 400, requestId)
  }

  try {
    const existing = await prisma.surveyForm.findUnique({
      where: { id },
      include: {
        responses: true,
      },
    })

    if (!existing) {
      return apiError("NOT_FOUND", `Biểu mẫu khảo sát ID "${id}" không tồn tại`, 404, requestId)
    }

    // 1. Anti-IDOR Scope Verification
    const { allowedCampusIds, allowedClassIds } = context.application
    if (!isCampusInScope(allowedCampusIds, existing.campusId) || !isClassInScope(allowedClassIds, existing.classId)) {
      await logApiAccess({
        applicationId: context.application.id,
        keyId: context.key.keyId,
        requestId,
        endpoint: `/api/v1/survey-results/${id}`,
        method: "PATCH",
        statusCode: 403,
        durationMs: Date.now() - startTime,
        errorMessage: "Scope violation on survey PATCH",
      })
      return apiError("ACCESS_DENIED_SCOPE", "Không có quyền sửa kết quả khảo sát thuộc lớp hoặc cơ sở này", 403, requestId)
    }

    // 2. Business rule: External API CANNOT transition status to APPROVED or COMPLETED
    if (body.status && ["APPROVED", "XET_DUYET", "HOAN_THANH", "COMPLETED"].includes(body.status.toUpperCase())) {
      return apiError(
        "UNAUTHORIZED_STATUS_TRANSITION",
        "Thao tác duyệt kết quả khảo sát (APPROVED) yêu cầu thẩm quyền chuyên môn nội bộ của Sky-Line và không được phép duyệt tự động qua API này.",
        403,
        requestId
      )
    }

    // If already approved, reject modification
    if (existing.status === "APPROVED" || existing.status === "HOAN_THANH") {
      return apiError(
        "SURVEY_LOCKED",
        "Kết quả khảo sát đã được phê duyệt chính thức. Không thể chỉnh sửa thêm.",
        403,
        requestId
      )
    }

    // 3. Concurrency / Version Check
    const expectedVersion = body.expectedVersion ?? body.version
    if (expectedVersion !== undefined) {
      const currentVersion = existing.submissionDateTime.toISOString()
      if (String(expectedVersion) !== currentVersion && String(expectedVersion) !== existing.id) {
        return apiError(
          "VERSION_CONFLICT",
          "Biểu mẫu khảo sát đã bị thay đổi bởi thao tác khác. Vui lòng tải lại trước khi tiếp tục.",
          409,
          requestId,
          { currentVersion }
        )
      }
    }

    // 4. Update data payload
    const updateData: Record<string, any> = {}
    if (body.status) updateData.status = body.status
    if (typeof body.npsScoreRaw === "number") {
      updateData.npsScoreRaw = body.npsScoreRaw
      if (body.npsScoreRaw >= 9) updateData.npsCategory = "PROMOTER"
      else if (body.npsScoreRaw >= 7) updateData.npsCategory = "PASSIVE"
      else updateData.npsCategory = "DETRACTOR"
    }

    // Update responses if provided
    if (Array.isArray(body.responses)) {
      for (const resp of body.responses) {
        if (resp.id) {
          await prisma.surveyResponse.update({
            where: { id: resp.id },
            data: {
              numericScore: typeof resp.numericScore === "number" ? resp.numericScore : undefined,
              textAnswer: resp.textAnswer !== undefined ? resp.textAnswer : undefined,
              choiceAnswer: resp.choiceAnswer !== undefined ? resp.choiceAnswer : undefined,
            },
          })
        }
      }
    }

    const updated = await prisma.surveyForm.update({
      where: { id },
      data: updateData,
      include: { responses: true },
    })

    // Audit log
    await recordApiAuditLog({
      applicationId: context.application.id,
      appName: context.application.name,
      action: "API_UPDATE_SURVEY",
      targetTable: "SurveyForm",
      targetId: id,
      oldValues: { status: existing.status, npsScoreRaw: existing.npsScoreRaw },
      newValues: updateData,
    })

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: `/api/v1/survey-results/${id}`,
      method: "PATCH",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      requestSummary: `Updated survey form ${id}`,
    })

    return apiSuccess(updated, requestId)
  } catch (error: any) {
    console.error(`[API_SURVEY_PATCH][${requestId}] Error:`, error)
    return apiError("INTERNAL_ERROR", "Đã xảy ra lỗi khi cập nhật kết quả khảo sát", 500, requestId)
  }
}
