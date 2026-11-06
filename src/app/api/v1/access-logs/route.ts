import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { validateApiRequest, apiSuccess, apiError, logApiAccess } from "@/lib/api-auth"

export async function GET(request: Request) {
  const startTime = Date.now()
  // Validate token (Application must have valid active key and active app status)
  const authResult = await validateApiRequest(request)
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult
  const url = new URL(request.url)

  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)))
  const skip = (page - 1) * limit

  const statusCode = url.searchParams.get("statusCode") || url.searchParams.get("status_code")
  const method = url.searchParams.get("method")?.toUpperCase()
  const endpointFilter = url.searchParams.get("endpoint")?.trim()
  const fromDate = url.searchParams.get("from")
  const toDate = url.searchParams.get("to")

  // Strict boundary: Only query logs belonging to the authenticated application
  const whereCondition: Record<string, any> = {
    applicationId: context.application.id,
  }

  if (statusCode) {
    whereCondition.statusCode = parseInt(statusCode, 10)
  }

  if (method) {
    whereCondition.method = method
  }

  if (endpointFilter) {
    whereCondition.endpoint = { contains: endpointFilter }
  }

  if (fromDate || toDate) {
    whereCondition.createdAt = {}
    if (fromDate) whereCondition.createdAt.gte = new Date(fromDate)
    if (toDate) whereCondition.createdAt.lte = new Date(toDate)
  }

  try {
    const pAny = prisma as any
    const [total, logs] = await Promise.all([
      pAny.apiAccessLog.count({ where: whereCondition }),
      pAny.apiAccessLog.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          keyId: true,
          requestId: true,
          endpoint: true,
          method: true,
          statusCode: true,
          ipAddress: true,
          durationMs: true,
          requestSummary: true,
          errorMessage: true,
          createdAt: true,
        },
      }),
    ])

    return apiSuccess(logs, requestId, {
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      application: {
        id: context.application.id,
        name: context.application.name,
      },
    })
  } catch (error: any) {
    console.error(`[API_ACCESS_LOGS_GET][${requestId}] Error:`, error)
    return apiError("INTERNAL_ERROR", "Đã xảy ra lỗi khi truy vấn nhật ký truy cập", 500, requestId)
  }
}
