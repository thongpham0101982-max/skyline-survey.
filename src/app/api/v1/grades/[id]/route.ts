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

function isValidGradeScore(val: any): boolean {
  if (val === null || val === undefined || val === "") return true
  const num = Number(val)
  return !isNaN(num) && num >= 0 && num <= 10
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params
  const authResult = await validateApiRequest(request, "grades:write")
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult

  let body: any = null
  try {
    body = await request.json()
  } catch {
    return apiError("INVALID_JSON", "Định dạng JSON gửi lên không hợp lệ", 400, requestId)
  }

  try {
    const existing = await prisma.subjectGradeEntry.findUnique({
      where: { id },
      include: {
        student: true,
        class: true,
        subject: true,
      },
    })

    if (!existing) {
      return apiError("NOT_FOUND", `Bản ghi điểm ID "${id}" không tồn tại`, 404, requestId)
    }

    // 1. Anti-IDOR Scope Check
    const { allowedCampusIds, allowedClassIds } = context.application
    if (!isCampusInScope(allowedCampusIds, existing.student.campusId) || !isClassInScope(allowedClassIds, existing.classId)) {
      await logApiAccess({
        applicationId: context.application.id,
        keyId: context.key.keyId,
        requestId,
        endpoint: `/api/v1/grades/${id}`,
        method: "PATCH",
        statusCode: 403,
        durationMs: Date.now() - startTime,
        errorMessage: "Scope violation on grade PATCH",
      })
      return apiError("ACCESS_DENIED_SCOPE", "Không có quyền sửa điểm của lớp hoặc cơ sở này", 403, requestId)
    }

    // 2. Concurrency / Version Check (Optimistic Locking)
    const expectedVersion = body.expectedVersion ?? body.version
    if (expectedVersion !== undefined) {
      const currentVersion = existing.updatedAt.toISOString()
      if (String(expectedVersion) !== currentVersion && String(expectedVersion) !== String(existing.compositeScore)) {
        return apiError(
          "VERSION_CONFLICT",
          "Dữ liệu điểm đã được cập nhật bởi một phiên làm việc khác. Vui lòng tải lại trước khi tiếp tục.",
          409,
          requestId,
          { currentVersion }
        )
      }
    }

    // 3. Lock Status Check
    const locks = await prisma.gradebookLock.findMany({
      where: {
        academicYearId: existing.academicYearId,
        evaluationPeriod: existing.evaluationPeriod,
        OR: [
          { classId: existing.classId, subjectId: existing.subjectId },
          { classId: "ALL", subjectId: "ALL" },
        ],
      },
    })

    const isLocked = locks.some((l) => Boolean(l.isLocked))
    if (isLocked) {
      return apiError(
        "GRADEBOOK_LOCKED",
        `Sổ điểm môn "${existing.subject.subjectName}" kỳ "${existing.evaluationPeriod}" đã bị khóa. Không thể sửa điểm.`,
        403,
        requestId
      )
    }

    // 4. Score scale validation
    const updateData: Record<string, any> = {}

    if (body.compositeScore !== undefined) {
      if (body.compositeScore !== null && !isValidGradeScore(body.compositeScore)) {
        return apiError(
          "INVALID_SCORE_RANGE",
          `Điểm tổng kết (${body.compositeScore}) không hợp lệ (phải từ 0 đến 10)`,
          400,
          requestId
        )
      }
      updateData.compositeScore = body.compositeScore !== null ? Number(body.compositeScore) : null
    }

    if (body.componentScores !== undefined) {
      if (typeof body.componentScores === "object" && body.componentScores !== null) {
        for (const [k, v] of Object.entries(body.componentScores)) {
          if (!isValidGradeScore(v)) {
            return apiError(
              "INVALID_SCORE_RANGE",
              `Điểm thành phần "${k}" (${v}) không hợp lệ (phải từ 0 đến 10)`,
              400,
              requestId
            )
          }
        }
        updateData.componentScores = JSON.stringify(body.componentScores)
      } else {
        updateData.componentScores = body.componentScores
      }
    }

    if (body.remark !== undefined) updateData.remark = body.remark

    const updated = await prisma.subjectGradeEntry.update({
      where: { id },
      data: updateData,
    })

    // 5. Audit Log (Preserve before/after in secure internal log)
    await recordApiAuditLog({
      applicationId: context.application.id,
      appName: context.application.name,
      action: "API_UPDATE_GRADE",
      targetTable: "SubjectGradeEntry",
      targetId: id,
      oldValues: {
        compositeScore: existing.compositeScore,
        componentScores: existing.componentScores,
        remark: existing.remark,
      },
      newValues: updateData,
    })

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: `/api/v1/grades/${id}`,
      method: "PATCH",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      requestSummary: `Updated grade for student ${existing.student.studentCode}`,
    })

    return apiSuccess(updated, requestId)
  } catch (error: any) {
    console.error(`[API_GRADE_PATCH][${requestId}] Error:`, error)
    return apiError("INTERNAL_ERROR", "Đã xảy ra lỗi khi cập nhật sổ điểm", 500, requestId)
  }
}
