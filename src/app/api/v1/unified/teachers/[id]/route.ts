import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  validateApiRequest,
  apiSuccess,
  apiError,
  isCampusInScope,
  isDepartmentInScope,
  maskSensitivePhone,
  hasPermission,
  logApiAccess,
} from "@/lib/api-auth"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params
  const authResult = await validateApiRequest(request, ["teachers:directory:read", "teachers:read"])
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult
  const pAny = prisma as any

  try {
    const rows: any[] = await pAny.$queryRawUnsafe(
      `SELECT * FROM "api_snapshot_teachers" WHERE "teacherId" = ? OR "teacherCode" = ? LIMIT 1`,
      id,
      id
    )

    if (!rows || rows.length === 0) {
      return apiError("TEACHER_NOT_FOUND", `Không tìm thấy giáo viên với mã hoặc ID "${id}"`, 404, requestId)
    }

    const r = rows[0]
    const { allowedCampusIds, allowedDepartmentIds } = context.application

    // Anti-IDOR Scope Enforcement
    if (!isCampusInScope(allowedCampusIds, r.campusId)) {
      return apiError(
        "ACCESS_DENIED_SCOPE",
        "Bạn không có quyền truy xuất hồ sơ giáo viên thuộc cơ sở này",
        403,
        requestId
      )
    }

    if (!isDepartmentInScope(allowedDepartmentIds, r.departmentId)) {
      return apiError(
        "ACCESS_DENIED_SCOPE",
        "Bạn không có quyền truy xuất hồ sơ giáo viên thuộc tổ chuyên môn này",
        403,
        requestId
      )
    }

    const canReadFullContact = hasPermission(context, "teachers:read") || hasPermission(context, "teachers:write")

    let assignments = []
    let positions = []
    let qaMetrics = {}
    let signatureProfile = {}

    try {
      assignments = JSON.parse(r.assignmentsSummaryJson || "[]")
    } catch {}
    try {
      positions = JSON.parse(r.positionsJson || "[]")
    } catch {}
    try {
      qaMetrics = JSON.parse(r.qaObservedSummaryJson || "{}")
    } catch {}
    try {
      signatureProfile = JSON.parse(r.signatureProfileJson || "{}")
    } catch {}

    const detail = {
      teacherId: r.teacherId,
      teacherCode: r.teacherCode,
      teacherName: r.teacherName,
      email: r.email,
      phone: canReadFullContact ? r.phone : maskSensitivePhone(r.phone),
      position: r.position,
      positions,
      campus: {
        id: r.campusId,
        code: r.campusCode,
        name: r.campusName,
      },
      department: r.departmentId
        ? {
            id: r.departmentId,
            code: r.departmentCode,
            name: r.departmentName,
          }
        : null,
      mainSubject: r.mainSubjectId
        ? {
            id: r.mainSubjectId,
            code: r.mainSubjectCode,
            name: r.mainSubjectName,
          }
        : null,
      homeroomClass: r.homeroomClass,
      totalPeriodsPerWeek: r.totalPeriodsPerWeek,
      classesTeachingList: r.classesTeachingList,
      assignments,
      digitalSignature: {
        status: r.digitalSignatureStatus,
        details: signatureProfile,
      },
      qaMetrics,
      status: r.status,
      snapshotVersion: r.snapshotVersion,
      lastSyncedAt: r.lastSyncedAt,
    }

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: `/api/v1/unified/teachers/${id}`,
      method: "GET",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      requestSummary: `Viewed teacher ${r.teacherCode}`,
    })

    return apiSuccess(detail, requestId, { _phoneMasked: !canReadFullContact })
  } catch (error: any) {
    console.error(`[API_UNIFIED_TEACHER_DETAIL][${requestId}] Error:`, error)
    return apiError("INTERNAL_ERROR", "Đã xảy ra lỗi khi lấy thông tin chi tiết giáo viên", 500, requestId)
  }
}
