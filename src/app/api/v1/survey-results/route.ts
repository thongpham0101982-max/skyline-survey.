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
  const authResult = await validateApiRequest(request, "survey-results:read")
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult
  const url = new URL(request.url)

  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "30", 10)))
  const skip = (page - 1) * limit

  const requestedCampusId = url.searchParams.get("campusId") || url.searchParams.get("campus_id")
  const requestedClassId = url.searchParams.get("classId") || url.searchParams.get("class_id")
  const surveyPeriodId = url.searchParams.get("surveyPeriodId") || url.searchParams.get("survey_period_id")
  const studentId = url.searchParams.get("studentId") || url.searchParams.get("student_id")
  const status = url.searchParams.get("status")

  // Scope verification
  const scopeValidation = enforceScopeFilter(context, requestedCampusId, requestedClassId)
  if (!scopeValidation.ok) return scopeValidation.errorResponse!

  const whereCondition: Record<string, any> = buildScopeWhereCondition(context, requestedCampusId, requestedClassId)

  if (surveyPeriodId) whereCondition.surveyPeriodId = surveyPeriodId
  if (studentId) whereCondition.studentId = studentId
  if (status) whereCondition.status = status

  try {
    const [total, forms] = await Promise.all([
      prisma.surveyForm.count({ where: whereCondition }),
      prisma.surveyForm.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: [{ submissionDateTime: "desc" }, { id: "asc" }],
        include: {
          surveyPeriod: {
            select: { id: true, code: true, name: true, targetAudience: true },
          },
          student: {
            select: { id: true, studentCode: true, studentName: true },
          },
          class: {
            select: { id: true, className: true },
          },
          campus: {
            select: { id: true, campusName: true },
          },
          responses: {
            select: {
              id: true,
              questionId: true,
              numericScore: true,
              textAnswer: true,
              choiceAnswer: true,
              calculatedWeightedScore: true,
            },
          },
        },
      }),
    ])

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: "/api/v1/survey-results",
      method: "GET",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      requestSummary: `Listed ${forms.length}/${total} survey results`,
    })

    return apiSuccess(forms, requestId, {
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error(`[API_SURVEY_GET][${requestId}] Error:`, error)
    return apiError("INTERNAL_ERROR", "Đã xảy ra lỗi khi lấy kết quả khảo sát", 500, requestId)
  }
}

export async function POST(request: Request) {
  const startTime = Date.now()
  const authResult = await validateApiRequest(request, "survey-results:write")
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult

  let body: any = null
  try {
    body = await request.json()
  } catch {
    return apiError("INVALID_JSON", "Định dạng JSON gửi lên không hợp lệ", 400, requestId)
  }

  const {
    surveyPeriodId,
    studentId,
    classId,
    campusId,
    academicYearId,
    parentId,
    responses,
    npsScoreRaw,
  } = body

  if (!surveyPeriodId || !studentId || !classId || !campusId || !academicYearId) {
    return apiError(
      "MISSING_REQUIRED_FIELDS",
      "Vui lòng cung cấp đầy đủ: surveyPeriodId, studentId, classId, campusId, academicYearId",
      400,
      requestId
    )
  }

  // 1. Scope Check
  const { allowedCampusIds, allowedClassIds } = context.application
  if (!isCampusInScope(allowedCampusIds, campusId) || !isClassInScope(allowedClassIds, classId)) {
    return apiError("SCOPE_EXCEEDED", "Dữ liệu khảo sát nằm ngoài phạm vi cơ sở hoặc lớp được cấp quyền", 403, requestId)
  }

  // 2. Survey Period Check
  const period = await prisma.surveyPeriod.findUnique({
    where: { id: surveyPeriodId },
  })

  if (!period) {
    return apiError("NOT_FOUND", `Đợt khảo sát ID "${surveyPeriodId}" không tồn tại`, 404, requestId)
  }

  if (period.status !== "ACTIVE" && !period.isActive) {
    return apiError("SURVEY_PERIOD_CLOSED", `Đợt khảo sát "${period.name}" hiện đang đóng hoặc chưa kích hoạt`, 400, requestId)
  }

  // 3. Student Check
  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student) {
    return apiError("NOT_FOUND", `Học sinh ID "${studentId}" không tồn tại`, 404, requestId)
  }

  if (student.campusId !== campusId || student.classId !== classId) {
    return apiError("STUDENT_SCOPE_MISMATCH", "Học sinh không thuộc về lớp hoặc cơ sở đã chọn", 400, requestId)
  }

  // 4. Idempotency Check (Prevent duplicate submissions)
  const existingForm = await prisma.surveyForm.findFirst({
    where: {
      surveyPeriodId,
      studentId,
      ...(parentId ? { parentId } : {}),
    },
    include: { responses: true },
  })

  if (existingForm) {
    return apiSuccess(existingForm, requestId, { idempotentReplay: true }, 200)
  }

  // 5. Business rule: Lưu kết quả không tự chuyển sang 'APPROVED'. Mặc định DRAFT hoặc SUBMITTED
  const initialStatus = "SUBMITTED"

  // Calculate NPS category if score provided
  let npsCategory: string | null = null
  if (typeof npsScoreRaw === "number") {
    if (npsScoreRaw >= 9) npsCategory = "PROMOTER"
    else if (npsScoreRaw >= 7) npsCategory = "PASSIVE"
    else npsCategory = "DETRACTOR"
  }

  // Compute average score from numeric responses if provided
  let overallAverageScore: number | null = null
  if (Array.isArray(responses) && responses.length > 0) {
    const numericScores = responses.filter((r) => typeof r.numericScore === "number").map((r) => r.numericScore)
    if (numericScores.length > 0) {
      overallAverageScore = Number((numericScores.reduce((a, b) => a + b, 0) / numericScores.length).toFixed(2))
    }
  }

  try {
    const newForm = await prisma.surveyForm.create({
      data: {
        surveyPeriodId,
        studentId,
        classId,
        campusId,
        academicYearId,
        parentId: parentId || null,
        status: initialStatus, // Strictly SUBMITTED, cannot be APPROVED by external API
        npsScoreRaw: typeof npsScoreRaw === "number" ? npsScoreRaw : null,
        npsCategory,
        overallAverageScore,
        responses: Array.isArray(responses)
          ? {
              create: responses.map((r) => ({
                questionId: r.questionId,
                numericScore: typeof r.numericScore === "number" ? r.numericScore : null,
                textAnswer: r.textAnswer || null,
                choiceAnswer: r.choiceAnswer || null,
                calculatedWeightedScore: typeof r.calculatedWeightedScore === "number" ? r.calculatedWeightedScore : null,
              })),
            }
          : undefined,
      },
      include: {
        responses: true,
      },
    })

    // Audit log
    await recordApiAuditLog({
      applicationId: context.application.id,
      appName: context.application.name,
      action: "API_SUBMIT_SURVEY",
      targetTable: "SurveyForm",
      targetId: newForm.id,
      newValues: {
        surveyPeriodId,
        studentId,
        classId,
        status: initialStatus,
        responseCount: responses?.length || 0,
      },
    })

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: "/api/v1/survey-results",
      method: "POST",
      statusCode: 201,
      durationMs: Date.now() - startTime,
      requestSummary: `Submitted survey for student ${student.studentCode}`,
    })

    return apiSuccess(newForm, requestId, undefined, 201)
  } catch (error: any) {
    console.error(`[API_SURVEY_POST][${requestId}] Error:`, error)
    return apiError("INTERNAL_ERROR", "Đã xảy ra lỗi khi lưu kết quả khảo sát", 500, requestId)
  }
}
