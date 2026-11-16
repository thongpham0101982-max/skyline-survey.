import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  validateApiRequest,
  apiSuccess,
  apiError,
  isCampusInScope,
  isClassInScope,
  logApiAccess,
} from "@/lib/api-auth"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const authResult = await validateApiRequest(request, ["grades:read"])
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult
  const { id } = await params
  const studentIdentifier = id?.trim()

  if (!studentIdentifier) {
    return apiError("BAD_REQUEST", "Thiếu định danh học sinh (ID hoặc Mã học sinh)", 400, requestId)
  }

  const pAny = prisma as any

  try {
    // 1. Verify student exists in snapshot
    const studentRows: any[] = await pAny.$queryRawUnsafe(
      `SELECT "studentId", "studentCode", "studentName", "campusId", "campusName", "classId", "className", "grade", "termGradesSummaryJson", "hollandOrientationJson"
       FROM "api_snapshot_students"
       WHERE "studentId" = ? OR "studentCode" = ? LIMIT 1`,
      studentIdentifier,
      studentIdentifier
    )

    if (!studentRows || studentRows.length === 0) {
      return apiError("NOT_FOUND", `Không tìm thấy học sinh với định danh "${studentIdentifier}"`, 404, requestId)
    }

    const student = studentRows[0]
    const { allowedCampusIds, allowedClassIds } = context.application

    // Anti-IDOR Scope Check
    if (!isCampusInScope(allowedCampusIds, student.campusId)) {
      return apiError(
        "CAMPUS_SCOPE_EXCEEDED",
        `Học sinh thuộc cơ sở "${student.campusName || student.campusId}", ngoài phạm vi ủy quyền của API Key này`,
        403,
        requestId
      )
    }
    if (!isClassInScope(allowedClassIds, student.classId)) {
      return apiError(
        "CLASS_SCOPE_EXCEEDED",
        `Học sinh thuộc lớp "${student.className || student.classId}", ngoài phạm vi lớp được phép truy cập`,
        403,
        requestId
      )
    }

    // 2. Fetch subject grade entries
    let subjectGradeEntries: any[] = []
    try {
      subjectGradeEntries = await pAny.subjectGradeEntry.findMany({
        where: { studentId: student.studentId },
        orderBy: [{ evaluationPeriod: "asc" }, { subjectId: "asc" }],
      })
    } catch {
      subjectGradeEntries = []
    }

    // 3. Fetch Orientation record if available
    let orientationSummary: any = null
    try {
      const orientation = await pAny.studentOrientationRecord.findFirst({
        where: { studentId: student.studentId },
        select: {
          status: true,
          interviewDate: true,
          interviewerName: true,
          hollandCode: true,
          hollandPrimaryType: true,
          careerAspirations: true,
          academicStrengthNotes: true,
          advisoryRecommendations: true,
        },
      })
      if (orientation) orientationSummary = orientation
    } catch {}

    let termGradesSummary: any = []
    if (student.termGradesSummaryJson) {
      try {
        termGradesSummary = JSON.parse(student.termGradesSummaryJson)
      } catch {}
    }

    const formattedGrades = subjectGradeEntries.map((g: any) => {
      let components = null
      if (g.componentScores) {
        try {
          components = JSON.parse(g.componentScores)
        } catch {
          components = g.componentScores
        }
      }
      return {
        id: g.id,
        subjectId: g.subjectId,
        evaluationPeriod: g.evaluationPeriod,
        compositeScore: g.compositeScore,
        componentScores: components,
        remark: g.remark,
      }
    })

    const payload = {
      student: {
        studentId: student.studentId,
        studentCode: student.studentCode,
        fullName: student.studentName,
        studentName: student.studentName,
        class: {
          id: student.classId,
          name: student.className,
          grade: student.grade,
        },
        campus: {
          id: student.campusId,
          name: student.campusName,
        },
      },
      gpaScore: student.gpaScore,
      conduct: student.conduct,
      termGradesSummary,
      subjectGradeEntries: formattedGrades,
      orientation: orientationSummary,
    }

    const durationMs = Date.now() - startTime
    logApiAccess({
      apiKeyId: context.keyId,
      endpoint: `/api/v1/unified/students/${studentIdentifier}/academic`,
      method: "GET",
      statusCode: 200,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      durationMs,
    }).catch(() => {})

    return apiSuccess(payload, requestId)
  } catch (error: any) {
    return apiError("INTERNAL_ERROR", error?.message || "Lỗi nạp điểm học sinh", 500, requestId)
  }
}
