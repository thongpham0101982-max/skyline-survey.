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

// Helper to validate that score is in 0..10 range
function isValidGradeScore(val: any): boolean {
  if (val === null || val === undefined || val === "") return true
  const num = Number(val)
  return !isNaN(num) && num >= 0 && num <= 10
}

export async function GET(request: Request) {
  const startTime = Date.now()
  const authResult = await validateApiRequest(request, "grades:read")
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult
  const url = new URL(request.url)

  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)))
  const skip = (page - 1) * limit

  const requestedCampusId = url.searchParams.get("campusId") || url.searchParams.get("campus_id")
  const requestedClassId = url.searchParams.get("classId") || url.searchParams.get("class_id")
  const academicYearId = url.searchParams.get("academicYearId") || url.searchParams.get("academic_year_id")
  const subjectId = url.searchParams.get("subjectId") || url.searchParams.get("subject_id")
  const evaluationPeriod = url.searchParams.get("evaluationPeriod") || url.searchParams.get("evaluation_period")
  const studentId = url.searchParams.get("studentId") || url.searchParams.get("student_id")

  // Scope verification
  const scopeValidation = enforceScopeFilter(context, requestedCampusId, requestedClassId)
  if (!scopeValidation.ok) return scopeValidation.errorResponse!

  const whereCondition: Record<string, any> = buildScopeWhereCondition(context, requestedCampusId, requestedClassId)

  if (academicYearId) whereCondition.academicYearId = academicYearId
  if (subjectId) whereCondition.subjectId = subjectId
  if (evaluationPeriod) whereCondition.evaluationPeriod = evaluationPeriod
  if (studentId) whereCondition.studentId = studentId

  try {
    const [total, entries] = await Promise.all([
      prisma.subjectGradeEntry.count({ where: whereCondition }),
      prisma.subjectGradeEntry.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: [{ evaluationPeriod: "asc" }, { id: "asc" }],
        include: {
          student: {
            select: {
              id: true,
              studentCode: true,
              studentName: true,
              campusId: true,
              classId: true,
            },
          },
          subject: {
            select: {
              id: true,
              subjectCode: true,
              subjectName: true,
            },
          },
          class: {
            select: {
              id: true,
              className: true,
              grade: true,
            },
          },
        },
      }),
    ])

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: "/api/v1/grades",
      method: "GET",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      requestSummary: `Listed ${entries.length}/${total} grade entries`,
    })

    return apiSuccess(entries, requestId, {
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error(`[API_GRADES_GET][${requestId}] Error:`, error)
    return apiError("INTERNAL_ERROR", "Đã xảy ra lỗi khi truy vấn sổ điểm", 500, requestId)
  }
}

export async function POST(request: Request) {
  const startTime = Date.now()
  const authResult = await validateApiRequest(request, "grades:write")
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult

  let body: any = null
  try {
    body = await request.json()
  } catch {
    return apiError("INVALID_JSON", "Định dạng JSON gửi lên không hợp lệ", 400, requestId)
  }

  const {
    studentId,
    subjectId,
    classId,
    academicYearId,
    evaluationPeriod,
    componentScores,
    compositeScore,
    remark,
    teacherId,
  } = body

  if (!studentId || !subjectId || !classId || !academicYearId || !evaluationPeriod) {
    return apiError(
      "MISSING_REQUIRED_FIELDS",
      "Vui lòng cung cấp đầy đủ: studentId, subjectId, classId, academicYearId, evaluationPeriod",
      400,
      requestId
    )
  }

  // 1. Verify student and class existence + Scope
  const [student, cls, subject] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId } }),
    prisma.class.findUnique({ where: { id: classId } }),
    prisma.subject.findUnique({ where: { id: subjectId } }),
  ])

  if (!student) return apiError("NOT_FOUND", `Học sinh ID "${studentId}" không tồn tại`, 404, requestId)
  if (!cls) return apiError("NOT_FOUND", `Lớp học ID "${classId}" không tồn tại`, 404, requestId)
  if (!subject) return apiError("NOT_FOUND", `Môn học ID "${subjectId}" không tồn tại`, 404, requestId)

  const { allowedCampusIds, allowedClassIds } = context.application
  if (!isCampusInScope(allowedCampusIds, student.campusId) || !isClassInScope(allowedClassIds, student.classId)) {
    return apiError("SCOPE_EXCEEDED", "Học sinh nằm ngoài phạm vi cơ sở hoặc lớp được cấp quyền", 403, requestId)
  }
  if (!isClassInScope(allowedClassIds, classId)) {
    return apiError("SCOPE_EXCEEDED", "Lớp học nằm ngoài phạm vi được cấp quyền", 403, requestId)
  }

  // 2. Validate score scale (0 - 10)
  if (compositeScore !== undefined && compositeScore !== null) {
    if (!isValidGradeScore(compositeScore)) {
      return apiError(
        "INVALID_SCORE_RANGE",
        `Điểm tổng kết (${compositeScore}) không hợp lệ. Thang điểm quy chuẩn từ 0 đến 10.`,
        400,
        requestId
      )
    }
  }

  let parsedComponentScores = componentScores
  if (typeof componentScores === "object" && componentScores !== null) {
    for (const [k, v] of Object.entries(componentScores)) {
      if (!isValidGradeScore(v)) {
        return apiError(
          "INVALID_SCORE_RANGE",
          `Điểm thành phần "${k}" (${v}) không hợp lệ. Thang điểm quy chuẩn từ 0 đến 10.`,
          400,
          requestId
        )
      }
    }
    parsedComponentScores = JSON.stringify(componentScores)
  }

  // 3. SSM Business Rule: Check GradebookLock status
  const locks = await prisma.gradebookLock.findMany({
    where: {
      academicYearId,
      evaluationPeriod,
      OR: [
        { classId, subjectId },
        { classId: "ALL", subjectId: "ALL" },
      ],
    },
  })

  const isLocked = locks.some((l) => Boolean(l.isLocked))
  if (isLocked) {
    return apiError(
      "GRADEBOOK_LOCKED",
      `Sổ điểm môn "${subject.subjectName}" của lớp "${cls.className}" trong kỳ "${evaluationPeriod}" đã bị khóa. Không thể nhập hoặc cập nhật điểm.`,
      403,
      requestId
    )
  }

  // 4. Idempotency Check
  const existing = await prisma.subjectGradeEntry.findUnique({
    where: {
      studentId_subjectId_evaluationPeriod_academicYearId: {
        studentId,
        subjectId,
        evaluationPeriod,
        academicYearId,
      },
    },
  })

  if (existing) {
    // If idempotent retry with same scores, return existing
    if (existing.compositeScore === (compositeScore ?? null)) {
      return apiSuccess(existing, requestId, { idempotentReplay: true }, 200)
    }

    return apiError(
      "GRADE_ENTRY_EXISTS",
      "Bản ghi điểm cho học sinh, môn học và kỳ đánh giá này đã tồn tại. Vui lòng sử dụng phương thức PATCH để cập nhật.",
      409,
      requestId,
      { existingEntryId: existing.id }
    )
  }

  try {
    const newEntry = await prisma.subjectGradeEntry.create({
      data: {
        studentId,
        subjectId,
        classId,
        academicYearId,
        evaluationPeriod,
        teacherId: teacherId || null,
        componentScores: parsedComponentScores || null,
        compositeScore: compositeScore !== undefined && compositeScore !== null ? Number(compositeScore) : null,
        remark: remark || null,
      },
    })

    // Audit log (Securely stored in AuditLog table with authorization boundaries)
    await recordApiAuditLog({
      applicationId: context.application.id,
      appName: context.application.name,
      action: "API_CREATE_GRADE",
      targetTable: "SubjectGradeEntry",
      targetId: newEntry.id,
      newValues: {
        studentId,
        subjectId,
        classId,
        academicYearId,
        evaluationPeriod,
        compositeScore,
        componentScores: parsedComponentScores,
      },
    })

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: "/api/v1/grades",
      method: "POST",
      statusCode: 201,
      durationMs: Date.now() - startTime,
      requestSummary: `Recorded grade for student ${student.studentCode}`,
    })

    return apiSuccess(newEntry, requestId, undefined, 201)
  } catch (error: any) {
    console.error(`[API_GRADE_POST][${requestId}] Error:`, error)
    return apiError("INTERNAL_ERROR", "Đã xảy ra lỗi khi lưu bản ghi điểm", 500, requestId)
  }
}
