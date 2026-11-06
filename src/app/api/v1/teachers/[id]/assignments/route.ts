import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  validateApiRequest,
  apiSuccess,
  apiError,
  isCampusInScope,
  isDepartmentInScope,
  logApiAccess,
} from "@/lib/api-auth"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params
  const authResult = await validateApiRequest(request, [
    "teachers:assignments:read",
    "assignments:read",
    "teachers:read",
  ])
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult

  try {
    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [{ id }, { teacherCode: id }],
      },
      select: {
        id: true,
        teacherCode: true,
        teacherName: true,
        campusId: true,
        departmentId: true,
      },
    })

    if (!teacher) {
      return apiError("TEACHER_NOT_FOUND", `Không tìm thấy giáo viên với mã hoặc ID "${id}"`, 404, requestId)
    }

    // Anti-IDOR Scope Verification
    const { allowedCampusIds, allowedDepartmentIds } = context.application
    if (!isCampusInScope(allowedCampusIds, teacher.campusId) || !isDepartmentInScope(allowedDepartmentIds, teacher.departmentId)) {
      return apiError(
        "SCOPE_VIOLATION",
        "Giáo viên này nằm ngoài phạm vi cơ sở hoặc tổ chuyên môn được cấp quyền",
        403,
        requestId
      )
    }

    const assignments = await prisma.teachingAssignment.findMany({
      where: {
        teacherId: teacher.id,
      },
      include: {
        class: {
          select: { id: true, className: true, grade: true },
        },
        subject: {
          select: { id: true, subjectCode: true, subjectName: true },
        },
        academicYear: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ academicYearId: "desc" }, { semester: "desc" }],
    })

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: `/api/v1/teachers/${id}/assignments`,
      method: "GET",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      requestSummary: `Found ${assignments.length} assignments for teacher ${teacher.teacherCode}`,
    })

    return apiSuccess(
      {
        teacher: {
          id: teacher.id,
          teacherCode: teacher.teacherCode,
          teacherName: teacher.teacherName,
        },
        assignments,
      },
      requestId
    )
  } catch (error: any) {
    console.error(`[API_TEACHER_ASSIGNMENTS_GET][${requestId}] Error:`, error)
    return apiError("INTERNAL_SERVER_ERROR", "Lỗi truy vấn lịch phân công giáo viên", 500, requestId)
  }
}
