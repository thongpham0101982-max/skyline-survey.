import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  validateApiRequest,
  apiSuccess,
  apiError,
  isCampusInScope,
  isClassInScope,
  hasPermission,
  maskSensitivePhone,
  maskSensitiveEmail,
  logApiAccess,
  recordApiAuditLog,
} from "@/lib/api-auth"

const ALLOWED_UPDATE_FIELDS = [
  "studentName",
  "englishName",
  "status",
  "dateOfBirth",
  "gender",
  "studentType",
  "studentTypeNote",
  "classId",
  "campusId",
]

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params
  const authResult = await validateApiRequest(request, ["students:read", "students:profile:read"])
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult

  try {
    const student = await prisma.student.findFirst({
      where: {
        OR: [{ id }, { studentCode: id }],
      },
      include: {
        class: {
          select: { id: true, className: true, grade: true },
        },
        campus: {
          select: { id: true, campusCode: true, campusName: true },
        },
        academicYear: {
          select: { id: true, name: true },
        },
        parents: {
          include: {
            parent: {
              select: {
                id: true,
                parentCode: true,
                parentName: true,
                phone: true,
                email: true,
                status: true,
              },
            },
          },
        },
      },
    })

    if (!student) {
      return apiError("STUDENT_NOT_FOUND", `Không tìm thấy học sinh với ID hoặc mã "${id}"`, 404, requestId)
    }

    // Anti-IDOR Scope Verification: record must belong to app's configured scope
    const { allowedCampusIds, allowedClassIds } = context.application
    if (!isCampusInScope(allowedCampusIds, student.campusId) || !isClassInScope(allowedClassIds, student.classId)) {
      await logApiAccess({
        applicationId: context.application.id,
        keyId: context.key.keyId,
        requestId,
        endpoint: `/api/v1/students/${id}`,
        method: "GET",
        statusCode: 403,
        durationMs: Date.now() - startTime,
        errorMessage: "IDOR Attempt / Scope Violation",
      })
      return apiError(
        "ACCESS_DENIED_SCOPE",
        "Bạn không có quyền truy cập hồ sơ học sinh thuộc cơ sở hoặc lớp này",
        403,
        requestId
      )
    }

    // PII Masking: Only disclose full contact details (parents' phone & email) if granted students:contact:read or students:read
    const canReadContact = hasPermission(context, "students:contact:read") || hasPermission(context, "students:read")
    const sanitizedParents = (student.parents || []).map((pLink) => ({
      ...pLink,
      parent: pLink.parent
        ? {
            ...pLink.parent,
            phone: canReadContact ? pLink.parent.phone : maskSensitivePhone(pLink.parent.phone),
            email: canReadContact ? pLink.parent.email : maskSensitiveEmail(pLink.parent.email),
          }
        : null,
    }))

    const result = {
      ...student,
      parents: sanitizedParents,
      _contactMasked: !canReadContact,
    }

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: `/api/v1/students/${id}`,
      method: "GET",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      requestSummary: `Viewed student ${student.studentCode} (contactMasked=${!canReadContact})`,
    })

    return apiSuccess(result, requestId)
  } catch (error: any) {
    console.error(`[API_STUDENT_DETAIL][${requestId}] Error:`, error)
    return apiError("INTERNAL_ERROR", "Đã xảy ra lỗi khi lấy thông tin học sinh", 500, requestId)
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params
  const authResult = await validateApiRequest(request, ["students:write", "students:profile:write"])
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult

  let body: any = null
  try {
    body = await request.json()
  } catch {
    return apiError("INVALID_JSON", "Định dạng JSON gửi lên không hợp lệ", 400, requestId)
  }

  // Strict whitelist checking
  const incomingKeys = Object.keys(body || {})
  const invalidFields = incomingKeys.filter(
    (k) => !ALLOWED_UPDATE_FIELDS.includes(k) && k !== "expectedVersion" && k !== "version"
  )
  if (invalidFields.length > 0) {
    return apiError(
      "UNKNOWN_FIELDS",
      `Yêu cầu chứa trường dữ liệu không được phép sửa: ${invalidFields.join(", ")}. Các trường được hỗ trợ: ${ALLOWED_UPDATE_FIELDS.join(", ")}`,
      400,
      requestId,
      { invalidFields, allowedFields: ALLOWED_UPDATE_FIELDS }
    )
  }

  try {
    // 1. Fetch current student record
    const existing = await prisma.student.findFirst({
      where: {
        OR: [{ id }, { studentCode: id }],
      },
    })

    if (!existing) {
      return apiError("STUDENT_NOT_FOUND", `Không tìm thấy học sinh với ID hoặc mã "${id}"`, 404, requestId)
    }

    // 2. Anti-IDOR Scope Verification: Current student must be within app's scope
    const { allowedCampusIds, allowedClassIds } = context.application
    if (!isCampusInScope(allowedCampusIds, existing.campusId) || !isClassInScope(allowedClassIds, existing.classId)) {
      await logApiAccess({
        applicationId: context.application.id,
        keyId: context.key.keyId,
        requestId,
        endpoint: `/api/v1/students/${id}`,
        method: "PATCH",
        statusCode: 403,
        durationMs: Date.now() - startTime,
        errorMessage: "IDOR Attempt on PATCH student",
      })
      return apiError(
        "ACCESS_DENIED_SCOPE",
        "Không có quyền chỉnh sửa học sinh thuộc phạm vi cơ sở hoặc lớp hiện tại",
        403,
        requestId
      )
    }

    // If changing campusId or classId, verify target is also in scope
    if (body.campusId && !isCampusInScope(allowedCampusIds, body.campusId)) {
      return apiError("CAMPUS_SCOPE_EXCEEDED", `Cơ sở mới "${body.campusId}" nằm ngoài phạm vi được cấp phép`, 403, requestId)
    }
    if (body.classId && !isClassInScope(allowedClassIds, body.classId)) {
      return apiError("CLASS_SCOPE_EXCEEDED", `Lớp học mới "${body.classId}" nằm ngoài phạm vi được cấp phép`, 403, requestId)
    }

    // 3. Concurrency / Version check (Optimistic Locking)
    const expectedVersion = body.expectedVersion ?? body.version
    if (expectedVersion !== undefined) {
      // Calculate lightweight record fingerprint
      const currentFingerprint = `${existing.studentName}_${existing.classId}_${existing.status}_${existing.studentType}`
      if (String(expectedVersion) !== currentFingerprint && String(expectedVersion) !== existing.id) {
        return apiError(
          "VERSION_CONFLICT",
          "Dữ liệu học sinh đã bị thay đổi hoặc phiên bản gửi lên không trùng khớp. Vui lòng lấy lại thông tin mới nhất trước khi cập nhật.",
          409,
          requestId,
          { currentVersion: currentFingerprint }
        )
      }
    }

    // 4. Construct update payload strictly from allowed fields
    const updateData: Record<string, any> = {}
    if (body.studentName !== undefined) updateData.studentName = body.studentName.trim()
    if (body.englishName !== undefined) updateData.englishName = body.englishName ? body.englishName.trim() : null
    if (body.status !== undefined) updateData.status = body.status
    if (body.dateOfBirth !== undefined) updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null
    if (body.gender !== undefined) updateData.gender = body.gender
    if (body.studentType !== undefined) updateData.studentType = body.studentType
    if (body.studentTypeNote !== undefined) updateData.studentTypeNote = body.studentTypeNote
    if (body.classId !== undefined) updateData.classId = body.classId.trim()
    if (body.campusId !== undefined) updateData.campusId = body.campusId.trim()

    const updated = await prisma.student.update({
      where: { id: existing.id },
      data: updateData,
    })

    // 5. Audit Log (Old vs New values)
    await recordApiAuditLog({
      applicationId: context.application.id,
      appName: context.application.name,
      action: "API_UPDATE_STUDENT",
      targetTable: "Student",
      targetId: existing.id,
      oldValues: existing,
      newValues: updateData,
    })

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: `/api/v1/students/${id}`,
      method: "PATCH",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      requestSummary: `Updated student ${existing.studentCode}`,
    })

    return apiSuccess(updated, requestId)
  } catch (error: any) {
    console.error(`[API_STUDENT_PATCH][${requestId}] Error:`, error)
    return apiError("INTERNAL_ERROR", "Đã xảy ra lỗi khi cập nhật thông tin học sinh", 500, requestId)
  }
}
