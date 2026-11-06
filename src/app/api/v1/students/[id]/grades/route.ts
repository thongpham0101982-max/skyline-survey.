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
  const { id } = await params
  const authResult = await validateApiRequest(request, ["grades:read", "students:read"])
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult

  try {
    const student = await prisma.student.findFirst({
      where: {
        OR: [{ id }, { studentCode: id }],
      },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        campusId: true,
        classId: true,
        class: { select: { className: true, grade: true } },
      },
    })

    if (!student) {
      return apiError("STUDENT_NOT_FOUND", `Không tìm thấy học sinh với mã hoặc ID "${id}"`, 404, requestId)
    }

    // Anti-IDOR Scope Verification
    const { allowedCampusIds, allowedClassIds } = context.application
    if (!isCampusInScope(allowedCampusIds, student.campusId) || !isClassInScope(allowedClassIds, student.classId)) {
      return apiError("SCOPE_VIOLATION", "Học sinh này nằm ngoài phạm vi cơ sở hoặc lớp học được cấp quyền", 403, requestId)
    }

    const [regularGrades, termScores] = await Promise.all([
      prisma.subjectGradeEntry.findMany({
        where: { studentId: student.id },
        include: {
          subject: { select: { id: true, subjectCode: true, subjectName: true } },
          class: { select: { id: true, className: true } },
          academicYear: { select: { id: true, name: true } },
        },
        orderBy: [{ academicYearId: "desc" }, { term: "desc" }],
      }),
      prisma.studentTermScore.findMany({
        where: { studentId: student.id },
        include: {
          academicYear: { select: { id: true, name: true } },
        },
        orderBy: [{ academicYearId: "desc" }, { term: "desc" }],
      }),
    ])

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: `/api/v1/students/${id}/grades`,
      method: "GET",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      requestSummary: `Fetched ${regularGrades.length} grades for student ${student.studentCode}`,
    })

    return apiSuccess(
      {
        student: {
          id: student.id,
          studentCode: student.studentCode,
          studentName: student.studentName,
          class: student.class?.className,
        },
        regularGrades,
        termScores,
      },
      requestId
    )
  } catch (error: any) {
    console.error(`[API_STUDENT_GRADES_GET][${requestId}] Error:`, error)
    return apiError("INTERNAL_SERVER_ERROR", "Lỗi truy vấn điểm số học sinh", 500, requestId)
  }
}
