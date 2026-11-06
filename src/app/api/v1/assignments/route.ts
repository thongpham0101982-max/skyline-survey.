import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  validateApiRequest,
  apiSuccess,
  apiError,
  enforceScopeFilter,
  buildScopeWhereCondition,
  isCampusInScope,
  isClassInScope,
  logApiAccess,
  recordApiAuditLog,
} from "@/lib/api-auth"

export async function GET(request: Request) {
  const startTime = Date.now()
  const authResult = await validateApiRequest(request, "assignments:read")
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult
  const url = new URL(request.url)

  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "30", 10)))
  const skip = (page - 1) * limit

  const requestedCampusId = url.searchParams.get("campusId") || url.searchParams.get("campus_id")
  const requestedClassId = url.searchParams.get("classId") || url.searchParams.get("class_id")
  const academicYearId = url.searchParams.get("academicYearId") || url.searchParams.get("academic_year_id")
  const teacherId = url.searchParams.get("teacherId") || url.searchParams.get("teacher_id")
  const subjectId = url.searchParams.get("subjectId") || url.searchParams.get("subject_id")
  const semesterStr = url.searchParams.get("semester")

  // Scope verification
  const scopeValidation = enforceScopeFilter(context, requestedCampusId, requestedClassId)
  if (!scopeValidation.ok) return scopeValidation.errorResponse!

  const whereCondition: Record<string, any> = {}

  if (academicYearId) whereCondition.academicYearId = academicYearId
  if (teacherId) whereCondition.teacherId = teacherId
  if (subjectId) whereCondition.subjectId = subjectId
  if (semesterStr) whereCondition.semester = parseInt(semesterStr, 10)

  // Class / Campus scope enforcement via class relation
  const classFilter = buildScopeWhereCondition(context, requestedCampusId, requestedClassId)
  if (classFilter.classId) {
    whereCondition.classId = classFilter.classId
  } else if (classFilter.campusId) {
    whereCondition.class = { campusId: classFilter.campusId }
  }

  try {
    const [total, assignments] = await Promise.all([
      prisma.teachingAssignment.count({ where: whereCondition }),
      prisma.teachingAssignment.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: [{ academicYearId: "desc" }, { classId: "asc" }, { id: "asc" }],
        include: {
          teacher: {
            select: {
              id: true,
              teacherCode: true,
              teacherName: true,
              email: true,
              phone: true,
              position: true,
              campusId: true,
            },
          },
          class: {
            select: {
              id: true,
              className: true,
              grade: true,
              campusId: true,
              campus: {
                select: { id: true, campusName: true, campusCode: true },
              },
            },
          },
          subject: {
            select: {
              id: true,
              subjectCode: true,
              subjectName: true,
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
      endpoint: "/api/v1/assignments",
      method: "GET",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      requestSummary: `Listed ${assignments.length}/${total} teaching assignments`,
    })

    return apiSuccess(assignments, requestId, {
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error(`[API_ASSIGNMENTS_GET][${requestId}] Error:`, error)
    return apiError("INTERNAL_ERROR", "Đã xảy ra lỗi khi lấy danh sách phân công giảng dạy", 500, requestId)
  }
}

export async function POST(request: Request) {
  const startTime = Date.now()
  const authResult = await validateApiRequest(request, "assignments:write")
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult

  let body: any = null
  try {
    body = await request.json()
  } catch {
    return apiError("INVALID_JSON", "Định dạng JSON gửi lên không hợp lệ", 400, requestId)
  }

  const { teacherId, classId, subjectId, academicYearId, semester = 1 } = body

  if (!teacherId || !classId || !subjectId || !academicYearId) {
    return apiError(
      "MISSING_REQUIRED_FIELDS",
      "Vui lòng cung cấp đầy đủ: teacherId, classId, subjectId, academicYearId",
      400,
      requestId
    )
  }

  // 1. Verify existence & active status
  const [teacher, cls, subject, academicYear] = await Promise.all([
    prisma.teacher.findUnique({ where: { id: teacherId } }),
    prisma.class.findUnique({ where: { id: classId } }),
    prisma.subject.findUnique({ where: { id: subjectId } }),
    prisma.academicYear.findUnique({ where: { id: academicYearId } }),
  ])

  if (!teacher) return apiError("NOT_FOUND", `Giáo viên ID "${teacherId}" không tồn tại`, 404, requestId)
  if (!cls) return apiError("NOT_FOUND", `Lớp học ID "${classId}" không tồn tại`, 404, requestId)
  if (!subject) return apiError("NOT_FOUND", `Môn học ID "${subjectId}" không tồn tại`, 404, requestId)
  if (!academicYear) return apiError("NOT_FOUND", `Năm học ID "${academicYearId}" không tồn tại`, 404, requestId)

  // 2. Scope verification
  const { allowedCampusIds, allowedClassIds } = context.application
  if (!isCampusInScope(allowedCampusIds, cls.campusId) || !isClassInScope(allowedClassIds, classId)) {
    return apiError("SCOPE_EXCEEDED", "Lớp học nằm ngoài phạm vi cơ sở hoặc lớp được cấp quyền cho ứng dụng", 403, requestId)
  }

  // 3. Idempotency Check
  const existing = await prisma.teachingAssignment.findUnique({
    where: {
      teacherId_classId_subjectId_academicYearId_semester: {
        teacherId,
        classId,
        subjectId,
        academicYearId,
        semester: Number(semester),
      },
    },
  })

  if (existing) {
    return apiSuccess(existing, requestId, { idempotentReplay: true }, 200)
  }

  try {
    const newAssignment = await prisma.teachingAssignment.create({
      data: {
        teacherId,
        classId,
        subjectId,
        academicYearId,
        semester: Number(semester),
      },
      include: {
        teacher: { select: { teacherName: true, teacherCode: true } },
        class: { select: { className: true } },
        subject: { select: { subjectName: true } },
      },
    })

    await recordApiAuditLog({
      applicationId: context.application.id,
      appName: context.application.name,
      action: "API_CREATE_ASSIGNMENT",
      targetTable: "TeachingAssignment",
      targetId: newAssignment.id,
      newValues: { teacherId, classId, subjectId, academicYearId, semester },
    })

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: "/api/v1/assignments",
      method: "POST",
      statusCode: 201,
      durationMs: Date.now() - startTime,
      requestSummary: `Assigned teacher ${teacher.teacherName} to class ${cls.className}`,
    })

    return apiSuccess(newAssignment, requestId, undefined, 201)
  } catch (error: any) {
    console.error(`[API_ASSIGNMENT_POST][${requestId}] Error:`, error)
    return apiError("INTERNAL_ERROR", "Đã xảy ra lỗi khi tạo phân công giảng dạy", 500, requestId)
  }
}
