import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  validateApiRequest,
  apiSuccess,
  apiError,
  enforceTeacherScopeFilter,
  isCampusInScope,
  isDepartmentInScope,
  hasPermission,
  maskSensitivePhone,
  logApiAccess,
  recordApiAuditLog,
} from "@/lib/api-auth"

const ALLOWED_CREATE_FIELDS = [
  "teacherCode",
  "teacherName",
  "campusId",
  "email",
  "phone",
  "homeroomClass",
  "position",
  "departmentId",
  "mainSubjectId",
  "status",
]

export async function GET(request: Request) {
  const startTime = Date.now()
  const authResult = await validateApiRequest(request, ["teachers:read", "teachers:directory:read"])
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult
  const url = new URL(request.url)

  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)))
  const skip = (page - 1) * limit

  const requestedCampusId = url.searchParams.get("campusId") || url.searchParams.get("campus_id")
  const requestedDepartmentId = url.searchParams.get("departmentId") || url.searchParams.get("department_id")
  const status = url.searchParams.get("status") || "ACTIVE"
  const search = url.searchParams.get("search")?.trim()

  // Kiểm tra vi phạm phạm vi cơ sở và tổ chuyên môn
  const scopeValidation = enforceTeacherScopeFilter(context, requestedCampusId, requestedDepartmentId)
  if (!scopeValidation.ok) {
    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: "/api/v1/teachers",
      method: "GET",
      statusCode: 403,
      durationMs: Date.now() - startTime,
      errorMessage: "Teacher scope violation",
    })
    return scopeValidation.errorResponse!
  }

  const { allowedCampusIds, allowedDepartmentIds } = context.application
  const whereCondition: Record<string, any> = {}

  // Giới hạn cơ sở
  if (requestedCampusId) {
    whereCondition.campusId = requestedCampusId
  } else if (!allowedCampusIds.includes("*") && allowedCampusIds.length > 0) {
    whereCondition.campusId = { in: allowedCampusIds }
  }

  // Giới hạn tổ chuyên môn
  if (requestedDepartmentId) {
    whereCondition.departmentId = requestedDepartmentId
  } else if (!allowedDepartmentIds.includes("*") && allowedDepartmentIds.length > 0) {
    whereCondition.departmentId = { in: allowedDepartmentIds }
  }

  if (status && status !== "ALL") {
    whereCondition.status = status
  }

  if (search) {
    whereCondition.OR = [
      { teacherName: { contains: search } },
      { teacherCode: { contains: search } },
      { email: { contains: search } },
    ]
  }

  try {
    const [total, teachers] = await Promise.all([
      prisma.teacher.count({ where: whereCondition }),
      prisma.teacher.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: [{ teacherName: "asc" }, { id: "asc" }],
        select: {
          id: true,
          teacherCode: true,
          teacherName: true,
          email: true,
          phone: true,
          homeroomClass: true,
          campusId: true,
          position: true,
          status: true,
          departmentId: true,
          mainSubjectId: true,
          departmentRel: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          mainSubjectRel: {
            select: {
              id: true,
              subjectCode: true,
              subjectName: true,
            },
          },
          campus: {
            select: {
              id: true,
              campusCode: true,
              campusName: true,
            },
          },
        },
      }),
    ])

    // Nếu không có quyền đọc đầy đủ (chỉ có directory:read), thực hiện Masking số điện thoại
    const canReadFullContact = hasPermission(context, "teachers:read") || hasPermission(context, "teachers:write")
    const sanitizedTeachers = teachers.map((t) => ({
      ...t,
      phone: canReadFullContact ? t.phone : maskSensitivePhone(t.phone),
    }))

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: "/api/v1/teachers",
      method: "GET",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      requestSummary: `Page ${page}, limit ${limit}, returned ${teachers.length}/${total}`,
    })

    return apiSuccess(sanitizedTeachers, requestId, {
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      _phoneMasked: !canReadFullContact,
    })
  } catch (error: any) {
    console.error(`[API_TEACHERS_GET][${requestId}] Error:`, error)
    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: "/api/v1/teachers",
      method: "GET",
      statusCode: 500,
      durationMs: Date.now() - startTime,
      errorMessage: error.message,
    })
    return apiError("INTERNAL_SERVER_ERROR", "Đã xảy ra lỗi khi truy vấn danh sách giáo viên", 500, requestId)
  }
}

export async function POST(request: Request) {
  const startTime = Date.now()
  const authResult = await validateApiRequest(request, ["teachers:write"])
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
  const invalidFields = providedFields.filter((f) => !ALLOWED_CREATE_FIELDS.includes(f))
  if (invalidFields.length > 0) {
    return apiError(
      "UNKNOWN_FIELDS",
      `Yêu cầu chứa các trường không được phép: ${invalidFields.join(", ")}. Chỉ cho phép: ${ALLOWED_CREATE_FIELDS.join(", ")}`,
      400,
      requestId,
      { invalidFields }
    )
  }

  const {
    teacherCode,
    teacherName,
    campusId,
    email,
    phone,
    homeroomClass,
    position = "GV",
    departmentId,
    mainSubjectId,
    status = "ACTIVE",
  } = body

  if (!teacherCode?.trim() || !teacherName?.trim() || !campusId?.trim()) {
    return apiError(
      "MISSING_REQUIRED_FIELDS",
      "Các trường 'teacherCode', 'teacherName', 'campusId' là bắt buộc",
      400,
      requestId
    )
  }

  // Scope check
  const { allowedCampusIds, allowedDepartmentIds } = context.application
  if (!isCampusInScope(allowedCampusIds, campusId)) {
    return apiError("CAMPUS_SCOPE_EXCEEDED", `Cơ sở ID "${campusId}" nằm ngoài phạm vi được cấp phép`, 403, requestId)
  }
  if (departmentId && !isDepartmentInScope(allowedDepartmentIds, departmentId)) {
    return apiError("DEPARTMENT_SCOPE_EXCEEDED", `Tổ chuyên môn ID "${departmentId}" nằm ngoài phạm vi được cấp phép`, 403, requestId)
  }

  try {
    // Check code uniqueness
    const existing = await prisma.teacher.findFirst({
      where: { teacherCode: teacherCode.trim() },
    })
    if (existing) {
      return apiError("TEACHER_CODE_EXISTS", `Mã giáo viên "${teacherCode}" đã tồn tại trong hệ thống`, 409, requestId)
    }

    // Verify campus existence
    const campus = await prisma.campus.findUnique({ where: { id: campusId } })
    if (!campus) {
      return apiError("CAMPUS_NOT_FOUND", `Không tìm thấy cơ sở với ID "${campusId}"`, 404, requestId)
    }

    // Create user account or find existing by email/code
    let targetUserId = ""
    const existingUser = email ? await prisma.user.findFirst({ where: { email: email.trim() } }) : null
    if (existingUser) {
      targetUserId = existingUser.id
    } else {
      const newUser = await prisma.user.create({
        data: {
          username: teacherCode.trim().toLowerCase(),
          fullName: teacherName.trim(),
          email: email?.trim() || `${teacherCode.trim().toLowerCase()}@skylineschool.edu.vn`,
          role: "TEACHER",
          status: "ACTIVE",
        },
      })
      targetUserId = newUser.id
    }

    const newTeacher = await prisma.teacher.create({
      data: {
        userId: targetUserId,
        teacherCode: teacherCode.trim(),
        teacherName: teacherName.trim(),
        campusId,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        homeroomClass: homeroomClass?.trim() || null,
        position: position?.trim() || "GV",
        departmentId: departmentId?.trim() || null,
        mainSubjectId: mainSubjectId?.trim() || null,
        status,
      },
      include: {
        departmentRel: { select: { id: true, code: true, name: true } },
        mainSubjectRel: { select: { id: true, subjectCode: true, subjectName: true } },
        campus: { select: { id: true, campusCode: true, campusName: true } },
      },
    })

    await recordApiAuditLog({
      applicationId: context.application.id,
      entityType: "Teacher",
      entityId: newTeacher.id,
      action: "CREATE",
      performedBy: `API_APP:${context.application.name}`,
      newData: {
        teacherCode: newTeacher.teacherCode,
        teacherName: newTeacher.teacherName,
        campusId: newTeacher.campusId,
        departmentId: newTeacher.departmentId,
      },
      requestId,
    })

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: "/api/v1/teachers",
      method: "POST",
      statusCode: 201,
      durationMs: Date.now() - startTime,
      requestSummary: `Created teacher ${newTeacher.teacherCode} (${newTeacher.teacherName})`,
    })

    return apiSuccess(newTeacher, requestId, undefined, 201)
  } catch (error: any) {
    console.error(`[API_TEACHERS_POST][${requestId}] Error:`, error)
    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: "/api/v1/teachers",
      method: "POST",
      statusCode: 500,
      durationMs: Date.now() - startTime,
      errorMessage: error.message,
    })
    return apiError("INTERNAL_SERVER_ERROR", "Không thể tạo hồ sơ giáo viên mới", 500, requestId)
  }
}
