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

export async function GET(request: Request) {
  const startTime = Date.now()
  const authResult = await validateApiRequest(request, ["teachers:directory:read", "teachers:read"])
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult
  const { searchParams } = new URL(request.url)

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
  const skip = (page - 1) * limit

  const requestedCampusId = searchParams.get("campusId")?.trim()
  const requestedDepartmentId = searchParams.get("departmentId")?.trim()
  const requestedPosition = searchParams.get("position")?.trim()
  const status = searchParams.get("status")?.trim() || "ACTIVE"
  const search = searchParams.get("search")?.trim()

  const { allowedCampusIds, allowedDepartmentIds } = context.application

  // Anti-IDOR Scope Check on Query
  if (requestedCampusId && !isCampusInScope(allowedCampusIds, requestedCampusId)) {
    return apiError(
      "CAMPUS_SCOPE_EXCEEDED",
      `Bạn không có quyền truy cập dữ liệu của cơ sở "${requestedCampusId}"`,
      403,
      requestId
    )
  }
  if (requestedDepartmentId && !isDepartmentInScope(allowedDepartmentIds, requestedDepartmentId)) {
    return apiError(
      "DEPARTMENT_SCOPE_EXCEEDED",
      `Bạn không có quyền truy cập dữ liệu của tổ chuyên môn "${requestedDepartmentId}"`,
      403,
      requestId
    )
  }

  const pAny = prisma as any

  try {
    let whereClauses: string[] = ["1=1"]
    let args: any[] = []

    if (status !== "ALL") {
      whereClauses.push('"status" = ?')
      args.push(status)
    }

    // Enforce campus bounds
    if (requestedCampusId) {
      whereClauses.push('"campusId" = ?')
      args.push(requestedCampusId)
    } else if (!allowedCampusIds.includes("*") && allowedCampusIds.length > 0) {
      const placeholders = allowedCampusIds.map(() => "?").join(",")
      whereClauses.push(`"campusId" IN (${placeholders})`)
      args.push(...allowedCampusIds)
    }

    // Enforce department bounds
    if (requestedDepartmentId) {
      whereClauses.push('"departmentId" = ?')
      args.push(requestedDepartmentId)
    } else if (!allowedDepartmentIds.includes("*") && allowedDepartmentIds.length > 0) {
      const placeholders = allowedDepartmentIds.map(() => "?").join(",")
      whereClauses.push(`"departmentId" IN (${placeholders})`)
      args.push(...allowedDepartmentIds)
    }

    if (requestedPosition) {
      whereClauses.push('"position" = ?')
      args.push(requestedPosition)
    }

    if (search) {
      whereClauses.push('("teacherCode" LIKE ? OR "teacherName" LIKE ? OR "email" LIKE ? OR "homeroomClass" LIKE ?)')
      const pattern = `%${search}%`
      args.push(pattern, pattern, pattern, pattern)
    }

    const whereSql = whereClauses.join(" AND ")

    // Query count
    const countRows: any[] = await pAny.$queryRawUnsafe(
      `SELECT COUNT(*) as total FROM "api_snapshot_teachers" WHERE ${whereSql}`,
      ...args
    )
    const total = Number(countRows[0]?.total || 0)

    // Query paginated records
    const rows: any[] = await pAny.$queryRawUnsafe(
      `SELECT * FROM "api_snapshot_teachers" WHERE ${whereSql} ORDER BY "teacherName" ASC LIMIT ? OFFSET ?`,
      ...args,
      limit,
      skip
    )

    const canReadFullContact = hasPermission(context, "teachers:read") || hasPermission(context, "teachers:write")

    const items = rows.map((r: any) => {
      let positions = []
      try {
        positions = JSON.parse(r.positionsJson || "[]")
      } catch {}

      return {
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
        digitalSignatureStatus: r.digitalSignatureStatus,
        status: r.status,
        lastSyncedAt: r.lastSyncedAt,
      }
    })

    await logApiAccess({
      applicationId: context.application.id,
      keyId: context.key.keyId,
      requestId,
      endpoint: "/api/v1/unified/teachers",
      method: "GET",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      requestSummary: `Page ${page}, limit ${limit}, returned ${items.length}/${total}`,
    })

    const isPretty = searchParams.get("pretty") === "true" || searchParams.has("pretty") || !request.headers.get("authorization")

    return apiSuccess(items, requestId, {
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      _phoneMasked: !canReadFullContact,
      pretty: isPretty,
    })
  } catch (error: any) {
    console.error(`[API_UNIFIED_TEACHERS][${requestId}] Error:`, error)
    return apiError("INTERNAL_ERROR", "Đã xảy ra lỗi khi lấy danh bạ giáo viên tổng hợp", 500, requestId)
  }
}
