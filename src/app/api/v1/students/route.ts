import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  validateApiRequest,
  apiSuccess,
  apiError,
  enforceScopeFilter,
  buildScopeWhereCondition,
  logApiAccess,
  recordApiAuditLog,
} from "@/lib/api-auth"

// Whitelist of allowed fields for student creation
const ALLOWED_CREATE_FIELDS = [
  "studentCode",
  "studentName",
  "englishName",
  "classId",
  "campusId",
  "academicYearId",
  "status",
  "dateOfBirth",
  "gender",
  "studentType",
  "studentTypeNote",
]

export async function GET(request: Request) {
  const startTime = Date.now()
  const authResult = await validateApiRequest(request, ["students:read", "students:profile:read"])
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult
  const url = new URL(request.url)

  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)))
  const skip = (page - 1) * limit

  const requestedCampusId = url.searchParams.get("campusId") || url.searchParams.get("campus_id")
  const requestedClassId = url.searchParams.get("classId") || url.searchParams.get("class_id")
  const academicYearId = url.searchParams.get("academicYearId") || url.searchParams.get("academic_year_id")
  const status = url.searchParams.get("status") || "ACTIVE"
  const search = url.searchParams.get("search")?.trim()

  // Scope check: caller cannot ask for campuses/classes outside permitted scope
  const scopeValidation = enforceScopeFilter(context, requestedCampusId, requestedClassId)
  if (!scopeValidation.ok) {
    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: "/api/v1/students",
      method: "GET",
      statusCode: 403,
      durationMs: Date.now() - startTime,
      errorMessage: "Scope violation",
    })
    return scopeValidation.errorResponse!
  }

  const whereCondition: Record<string, any> = buildScopeWhereCondition(context, requestedCampusId, requestedClassId)

  if (academicYearId) whereCondition.academicYearId = academicYearId
  if (status && status !== "ALL") whereCondition.status = status

  if (search) {
    whereCondition.OR = [
      { studentName: { contains: search } },
      { studentCode: { contains: search } },
      { englishName: { contains: search } },
    ]
  }

  try {
    const [total, students] = await Promise.all([
      prisma.student.count({ where: whereCondition }),
      prisma.student.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: [{ studentName: "asc" }, { id: "asc" }],
        select: {
          id: true,
          studentCode: true,
          studentName: true,
          englishName: true,
          classId: true,
          campusId: true,
          academicYearId: true,
          status: true,
          dateOfBirth: true,
          gender: true,
          studentType: true,
          studentTypeNote: true,
          class: {
            select: {
              id: true,
              className: true,
              grade: true,
            },
          },
          campus: {
            select: {
              id: true,
              campusCode: true,
              campusName: true,
            },
          },
          academicYear: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ])

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: "/api/v1/students",
      method: "GET",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      requestSummary: `Page ${page}, limit ${limit}, returned ${students.length}/${total}`,
    })

    return apiSuccess(students, requestId, {
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error(`[API_STUDENTS_GET][${requestId}] Error:`, error)
    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: "/api/v1/students",
      method: "GET",
      statusCode: 500,
      durationMs: Date.now() - startTime,
      errorMessage: "Lỗi nội bộ máy chủ",
    })
    return apiError("INTERNAL_ERROR", "Đã xảy ra lỗi khi truy vấn danh sách học sinh", 500, requestId)
  }
}

export async function POST(request: Request) {
  const startTime = Date.now()
  const authResult = await validateApiRequest(request, ["students:write", "students:profile:write"])
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult

  let body: any = null
  try {
    body = await request.json()
  } catch {
    return apiError("INVALID_JSON", "Định dạng JSON gửi lên không hợp lệ", 400, requestId)
  }

  // Strict whitelist checking: reject unknown fields if strict or filter only allowed fields
  const rawKeys = Object.keys(body || {})
  const invalidFields = rawKeys.filter((k) => !ALLOWED_CREATE_FIELDS.includes(k) && k !== "idempotencyKey")
  if (invalidFields.length > 0) {
    return apiError(
      "UNKNOWN_FIELDS",
      `Yêu cầu chứa trường dữ liệu không được phép: ${invalidFields.join(", ")}. Các trường được hỗ trợ: ${ALLOWED_CREATE_FIELDS.join(", ")}`,
      400,
      requestId,
      { invalidFields, allowedFields: ALLOWED_CREATE_FIELDS }
    )
  }

  const {
    studentCode,
    studentName,
    englishName,
    classId,
    campusId,
    academicYearId,
    status = "ACTIVE",
    dateOfBirth,
    gender,
    studentType = "CHINH_KHOA",
    studentTypeNote,
  } = body

  // Validation
  if (!studentCode?.trim() || !studentName?.trim() || !classId?.trim() || !campusId?.trim() || !academicYearId?.trim()) {
    return apiError(
      "MISSING_REQUIRED_FIELDS",
      "Vui lòng cung cấp đầy đủ các trường bắt buộc: studentCode, studentName, classId, campusId, academicYearId",
      400,
      requestId
    )
  }

  // Scope validation: campusId and classId must be within allowed app scope
  const scopeValidation = enforceScopeFilter(context, campusId, classId)
  if (!scopeValidation.ok) {
    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: "/api/v1/students",
      method: "POST",
      statusCode: 403,
      durationMs: Date.now() - startTime,
      errorMessage: "Scope violation on create",
    })
    return scopeValidation.errorResponse!
  }

  try {
    // Verify target campus and class existence
    const [targetCampus, targetClass, targetYear] = await Promise.all([
      prisma.campus.findUnique({ where: { id: campusId } }),
      prisma.class.findUnique({ where: { id: classId } }),
      prisma.academicYear.findUnique({ where: { id: academicYearId } }),
    ])

    if (!targetCampus) {
      return apiError("NOT_FOUND", `Cơ sở với ID "${campusId}" không tồn tại`, 404, requestId)
    }
    if (!targetClass) {
      return apiError("NOT_FOUND", `Lớp học với ID "${classId}" không tồn tại`, 404, requestId)
    }
    if (!targetYear) {
      return apiError("NOT_FOUND", `Năm học với ID "${academicYearId}" không tồn tại`, 404, requestId)
    }

    if (targetClass.campusId && targetClass.campusId !== campusId) {
      return apiError("CLASS_CAMPUS_MISMATCH", "Lớp học đã chọn không thuộc về cơ sở chỉ định", 400, requestId)
    }

    // Idempotency / Duplicate Check
    const existing = await prisma.student.findUnique({
      where: {
        studentCode_academicYearId: {
          studentCode: studentCode.trim(),
          academicYearId: academicYearId.trim(),
        },
      },
    })

    if (existing) {
      // If the client retries with the exact same data, return idempotent existing record
      if (existing.classId === classId && existing.studentName.trim() === studentName.trim()) {
        await logApiAccess({
          applicationId: context.application.id,
          keyId: context.key.keyId,
          requestId,
          endpoint: "/api/v1/students",
          method: "POST",
          statusCode: 200,
          durationMs: Date.now() - startTime,
          requestSummary: `Idempotent replay for existing studentCode ${studentCode}`,
        })
        return apiSuccess(existing, requestId, { idempotentReplay: true }, 200)
      }

      return apiError(
        "STUDENT_ALREADY_EXISTS",
        `Học sinh với mã "${studentCode}" đã tồn tại trong năm học này`,
        409,
        requestId,
        { existingStudentId: existing.id }
      )
    }

    const newStudent = await prisma.student.create({
      data: {
        studentCode: studentCode.trim(),
        studentName: studentName.trim(),
        englishName: englishName ? englishName.trim() : null,
        classId: classId.trim(),
        campusId: campusId.trim(),
        academicYearId: academicYearId.trim(),
        status,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        studentType,
        studentTypeNote: studentTypeNote || null,
      },
    })

    await recordApiAuditLog({
      applicationId: context.application.id,
      appName: context.application.name,
      action: "API_CREATE_STUDENT",
      targetTable: "Student",
      targetId: newStudent.id,
      newValues: { studentCode, studentName, classId, campusId, academicYearId },
    })

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: "/api/v1/students",
      method: "POST",
      statusCode: 201,
      durationMs: Date.now() - startTime,
      requestSummary: `Created student ${newStudent.studentCode} (${newStudent.id})`,
    })

    return apiSuccess(newStudent, requestId, undefined, 201)
  } catch (error: any) {
    console.error(`[API_STUDENT_POST][${requestId}] Error:`, error)
    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: "/api/v1/students",
      method: "POST",
      statusCode: 500,
      durationMs: Date.now() - startTime,
      errorMessage: "Lỗi khi tạo hồ sơ học sinh",
    })
    return apiError("INTERNAL_ERROR", "Đã xảy ra lỗi khi tạo hồ sơ học sinh", 500, requestId)
  }
}
