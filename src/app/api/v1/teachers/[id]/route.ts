import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  validateApiRequest,
  apiSuccess,
  apiError,
  isCampusInScope,
  isDepartmentInScope,
  hasPermission,
  maskSensitivePhone,
  logApiAccess,
  recordApiAuditLog,
} from "@/lib/api-auth"

const ALLOWED_UPDATE_FIELDS = [
  "teacherName",
  "email",
  "phone",
  "homeroomClass",
  "position",
  "departmentId",
  "mainSubjectId",
  "status",
]

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params
  const authResult = await validateApiRequest(request, ["teachers:read", "teachers:directory:read"])
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult

  try {
    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [{ id }, { teacherCode: id }],
      },
      include: {
        departmentRel: { select: { id: true, code: true, name: true } },
        mainSubjectRel: { select: { id: true, subjectCode: true, subjectName: true } },
        campus: { select: { id: true, campusCode: true, campusName: true } },
        TeachingAssignment: {
          take: 10,
          include: {
            class: { select: { id: true, className: true, grade: true } },
            subject: { select: { id: true, subjectCode: true, subjectName: true } },
            academicYear: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!teacher) {
      return apiError("TEACHER_NOT_FOUND", `Không tìm thấy giáo viên với mã hoặc ID "${id}"`, 404, requestId)
    }

    // Anti-IDOR Scope Verification
    const { allowedCampusIds, allowedDepartmentIds } = context.application
    if (!isCampusInScope(allowedCampusIds, teacher.campusId) || !isDepartmentInScope(allowedDepartmentIds, teacher.departmentId)) {
      await logApiAccess({
        applicationId: context.application.id,
        keyId: context.key.keyId,
        requestId,
        endpoint: `/api/v1/teachers/${id}`,
        method: "GET",
        statusCode: 403,
        durationMs: Date.now() - startTime,
        errorMessage: "Teacher IDOR / Scope Violation",
      })
      return apiError(
        "SCOPE_VIOLATION",
        "Bản ghi giáo viên này nằm ngoài phạm vi cơ sở hoặc tổ chuyên môn được cấp quyền",
        403,
        requestId
      )
    }

    const canReadFullContact = hasPermission(context, "teachers:read") || hasPermission(context, "teachers:write")
    const sanitizedTeacher = {
      ...teacher,
      phone: canReadFullContact ? teacher.phone : maskSensitivePhone(teacher.phone),
    }

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: `/api/v1/teachers/${id}`,
      method: "GET",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      requestSummary: `Fetched teacher ${teacher.teacherCode}`,
    })

    return apiSuccess(sanitizedTeacher, requestId)
  } catch (error: any) {
    console.error(`[API_TEACHER_DETAIL_GET][${requestId}] Error:`, error)
    return apiError("INTERNAL_SERVER_ERROR", "Lỗi truy vấn thông tin chi tiết giáo viên", 500, requestId)
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params
  const authResult = await validateApiRequest(request, ["teachers:write", "teachers:profile:write"])
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult

  let body: any
  try {
    body = await request.json()
  } catch {
    return apiError("INVALID_JSON", "Nội dung yêu cầu không phải định dạng JSON hợp lệ", 400, requestId)
  }

  // Reject unexpected / non-whitelisted fields
  const providedFields = Object.keys(body)
  const invalidFields = providedFields.filter((f) => !ALLOWED_UPDATE_FIELDS.includes(f))
  if (invalidFields.length > 0) {
    return apiError(
      "UNKNOWN_FIELDS",
      `Cố gắng cập nhật các trường không được phép: ${invalidFields.join(", ")}. Chỉ cho phép: ${ALLOWED_UPDATE_FIELDS.join(", ")}`,
      400,
      requestId,
      { invalidFields }
    )
  }

  try {
    const existingTeacher = await prisma.teacher.findFirst({
      where: { OR: [{ id }, { teacherCode: id }] },
    })

    if (!existingTeacher) {
      return apiError("TEACHER_NOT_FOUND", `Không tìm thấy giáo viên với mã hoặc ID "${id}"`, 404, requestId)
    }

    // Scope check: current teacher must be in app's allowed scope
    const { allowedCampusIds, allowedDepartmentIds } = context.application
    if (!isCampusInScope(allowedCampusIds, existingTeacher.campusId) || !isDepartmentInScope(allowedDepartmentIds, existingTeacher.departmentId)) {
      return apiError("SCOPE_VIOLATION", "Giáo viên này nằm ngoài phạm vi cơ sở hoặc tổ chuyên môn được cấp quyền", 403, requestId)
    }

    // If changing department, new department must also be in scope
    if (body.departmentId && !isDepartmentInScope(allowedDepartmentIds, body.departmentId)) {
      return apiError("DEPARTMENT_SCOPE_EXCEEDED", `Tổ chuyên môn mới ID "${body.departmentId}" nằm ngoài phạm vi được cấp phép`, 403, requestId)
    }

    const updateData: Record<string, any> = {}
    for (const f of ALLOWED_UPDATE_FIELDS) {
      if (body[f] !== undefined) {
        updateData[f] = typeof body[f] === "string" ? body[f].trim() : body[f]
      }
    }

    const updatedTeacher = await prisma.teacher.update({
      where: { id: existingTeacher.id },
      data: updateData,
      include: {
        departmentRel: { select: { id: true, code: true, name: true } },
        mainSubjectRel: { select: { id: true, subjectCode: true, subjectName: true } },
        campus: { select: { id: true, campusCode: true, campusName: true } },
      },
    })

    await recordApiAuditLog({
      applicationId: context.application.id,
      entityType: "Teacher",
      entityId: updatedTeacher.id,
      action: "UPDATE",
      performedBy: `API_APP:${context.application.name}`,
      oldData: existingTeacher,
      newData: updatedTeacher,
      requestId,
    })

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: `/api/v1/teachers/${id}`,
      method: "PATCH",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      requestSummary: `Updated teacher ${updatedTeacher.teacherCode}`,
    })

    return apiSuccess(updatedTeacher, requestId)
  } catch (error: any) {
    console.error(`[API_TEACHER_PATCH][${requestId}] Error:`, error)
    return apiError("INTERNAL_SERVER_ERROR", "Lỗi cập nhật hồ sơ giáo viên", 500, requestId)
  }
}
