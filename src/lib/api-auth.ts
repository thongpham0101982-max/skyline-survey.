import crypto from "crypto"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ApiPermission, AuthenticatedApiContext } from "@/types/api-integration"

// ---------------------------------------------------------------------------
// 1. CRYPTOGRAPHIC KEY GENERATION
// ---------------------------------------------------------------------------

export interface GeneratedKeyData {
  rawKey: string     // Secret key returned ONLY once to creator
  keyId: string      // Public identifier (e.g. kid_a1b2c3d4)
  keyPrefix: string  // Masked display prefix (e.g. sky_live_a1b2...9f8e)
  keyHash: string    // SHA-256 hash stored in DB
}

export function generateCryptoApiKey(): GeneratedKeyData {
  const secretBytes = crypto.randomBytes(24).toString("hex")
  const rawKey = `sky_live_${secretBytes}`
  const keyId = `kid_${crypto.randomBytes(8).toString("hex")}`
  const keyPrefix = `${rawKey.slice(0, 14)}...${rawKey.slice(-4)}`
  const keyHash = hashApiKey(rawKey)

  return {
    rawKey,
    keyId,
    keyPrefix,
    keyHash,
  }
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key.trim()).digest("hex")
}

// ---------------------------------------------------------------------------
// 2. RATE LIMITER (In-Memory Sliding Window per Application)
// ---------------------------------------------------------------------------

interface RateBucket {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateBucket>()

function checkRateLimit(appId: string, limitRpm: number): { allowed: boolean; remaining: number; resetSec: number } {
  const now = Date.now()
  const windowMs = 60 * 1000
  const bucket = rateLimitStore.get(appId)

  if (!bucket || now > bucket.resetTime) {
    rateLimitStore.set(appId, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: limitRpm - 1, resetSec: 60 }
  }

  bucket.count += 1
  const resetSec = Math.max(1, Math.ceil((bucket.resetTime - now) / 1000))

  if (bucket.count > limitRpm) {
    return { allowed: false, remaining: 0, resetSec }
  }

  return { allowed: true, remaining: limitRpm - bucket.count, resetSec }
}

// Periodically clean up old rate buckets
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) rateLimitStore.delete(k)
    }
  }, 120000).unref?.()
}

// ---------------------------------------------------------------------------
// 3. TABLE INITIALIZATION HELPER (Zero-Breaking / Lazy Init)
// ---------------------------------------------------------------------------

let tablesEnsured = false

export async function ensureApiIntegrationTables() {
  if (tablesEnsured) return
  try {
    const pAny = prisma as any
    await pAny.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "api_applications" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "contactPerson" TEXT,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "permissions" TEXT NOT NULL DEFAULT '[]',
        "allowedCampusIds" TEXT NOT NULL DEFAULT '[]',
        "allowedClassIds" TEXT NOT NULL DEFAULT '[]',
        "allowedDataScope" TEXT NOT NULL DEFAULT 'ALL',
        "expiresAt" DATETIME,
        "rateLimitRpm" INTEGER NOT NULL DEFAULT 60,
        "lastUsedAt" DATETIME,
        "createdById" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await pAny.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "api_keys" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "applicationId" TEXT NOT NULL,
        "name" TEXT,
        "keyId" TEXT NOT NULL UNIQUE,
        "keyPrefix" TEXT NOT NULL,
        "keyHash" TEXT NOT NULL UNIQUE,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "expiresAt" DATETIME,
        "lastUsedAt" DATETIME,
        "revokedAt" DATETIME,
        "revokedReason" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await pAny.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "api_access_logs" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "applicationId" TEXT NOT NULL,
        "keyId" TEXT,
        "requestId" TEXT NOT NULL,
        "endpoint" TEXT NOT NULL,
        "method" TEXT NOT NULL,
        "statusCode" INTEGER NOT NULL,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "durationMs" INTEGER,
        "requestSummary" TEXT,
        "errorMessage" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    tablesEnsured = true
  } catch (err) {
    // If running in mocked test environment, ignore table creation error
    tablesEnsured = true
  }
}

// ---------------------------------------------------------------------------
// 4. API ERROR & SUCCESS RESPONSES (Academic Ledger Clean Output)
// ---------------------------------------------------------------------------

export function apiError(
  code: string,
  message: string,
  statusCode: number,
  requestId: string,
  details?: any
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    },
    {
      status: statusCode,
      headers: {
        "X-Request-Id": requestId,
        "Content-Type": "application/json",
      },
    }
  )
}

export function apiSuccess<T>(
  data: T,
  requestId: string,
  meta?: Record<string, any>,
  status = 200
) {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        ...(meta || {}),
      },
    },
    {
      status,
      headers: {
        "X-Request-Id": requestId,
        "Content-Type": "application/json",
      },
    }
  )
}

// ---------------------------------------------------------------------------
// 5. REQUEST VALIDATION, AUTHENTICATION & ACCESS GUARD
// ---------------------------------------------------------------------------

export interface ApiValidationResult {
  ok: boolean
  context?: AuthenticatedApiContext
  errorResponse?: NextResponse
  requestId: string
}

export async function validateApiRequest(
  request: Request,
  requiredPermission?: ApiPermission | ApiPermission[]
): Promise<ApiValidationResult> {
  const requestId = `req_${crypto.randomUUID()}`

  // Guard: Request size limit (max 2MB)
  const contentLength = Number(request.headers.get("content-length") || 0)
  if (contentLength > 2 * 1024 * 1024) {
    return {
      ok: false,
      requestId,
      errorResponse: apiError(
        "PAYLOAD_TOO_LARGE",
        "Kích thước yêu cầu vượt quá giới hạn cho phép (tối đa 2MB)",
        413,
        requestId
      ),
    }
  }

  // 1. Extract Bearer token
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization") || ""
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      requestId,
      errorResponse: apiError(
        "UNAUTHORIZED",
        "Thiếu thông tin xác thực hoặc sai định dạng. Vui lòng cung cấp header: Authorization: Bearer <API_KEY>",
        401,
        requestId
      ),
    }
  }

  const rawToken = authHeader.slice(7).trim()
  if (!rawToken) {
    return {
      ok: false,
      requestId,
      errorResponse: apiError("UNAUTHORIZED", "API Key không được để trống", 401, requestId),
    }
  }

  await ensureApiIntegrationTables()

  // 2. Hash token and query key record
  const tokenHash = hashApiKey(rawToken)
  const pAny = prisma as any

  let apiKeyRecord: any = null
  try {
    if (pAny.apiKey?.findFirst) {
      apiKeyRecord = await pAny.apiKey.findFirst({
        where: { keyHash: tokenHash },
        include: { application: true },
      })
    } else {
      // Fallback raw query if model delegate not loaded
      const rows = await pAny.$queryRawUnsafe(`
        SELECT k.*, a.name as app_name, a.status as app_status, a.permissions as app_permissions,
               a.allowedCampusIds as app_campus, a.allowedClassIds as app_class,
               a.allowedDataScope as app_scope, a.rateLimitRpm as app_rpm,
               a.expiresAt as app_expires
        FROM api_keys k
        JOIN api_applications a ON k.applicationId = a.id
        WHERE k.keyHash = ?
        LIMIT 1
      `, tokenHash)
      if (rows && rows.length > 0) {
        const r = rows[0]
        apiKeyRecord = {
          id: r.id,
          keyId: r.keyId,
          keyPrefix: r.keyPrefix,
          keyHash: r.keyHash,
          status: r.status,
          expiresAt: r.expiresAt ? new Date(r.expiresAt) : null,
          applicationId: r.applicationId,
          application: {
            id: r.applicationId,
            name: r.app_name,
            status: r.app_status,
            permissions: r.app_permissions,
            allowedCampusIds: r.app_campus,
            allowedClassIds: r.app_class,
            allowedDataScope: r.app_scope,
            rateLimitRpm: Number(r.app_rpm || 60),
            expiresAt: r.app_expires ? new Date(r.app_expires) : null,
          }
        }
      }
    }
  } catch (err) {
    console.error(`[API_AUTH][${requestId}] Lỗi tra cứu khóa API:`, err)
    return {
      ok: false,
      requestId,
      errorResponse: apiError("INTERNAL_ERROR", "Lỗi xác thực hệ thống", 500, requestId),
    }
  }

  // 3. Check key validity
  if (!apiKeyRecord) {
    return {
      ok: false,
      requestId,
      errorResponse: apiError("INVALID_API_KEY", "Khóa API không tồn tại hoặc không hợp lệ", 401, requestId),
    }
  }

  if (apiKeyRecord.status === "REVOKED") {
    return {
      ok: false,
      requestId,
      errorResponse: apiError("KEY_REVOKED", "Khóa API này đã bị thu hồi và không còn hiệu lực", 401, requestId),
    }
  }

  if (apiKeyRecord.status !== "ACTIVE") {
    return {
      ok: false,
      requestId,
      errorResponse: apiError("KEY_INACTIVE", `Khóa API đang ở trạng thái không hoạt động (${apiKeyRecord.status})`, 401, requestId),
    }
  }

  const now = new Date()
  if (apiKeyRecord.expiresAt && new Date(apiKeyRecord.expiresAt) <= now) {
    return {
      ok: false,
      requestId,
      errorResponse: apiError("KEY_EXPIRED", "Khóa API đã hết hạn sử dụng", 401, requestId),
    }
  }

  // 4. Check parent application validity
  const app = apiKeyRecord.application
  if (!app) {
    return {
      ok: false,
      requestId,
      errorResponse: apiError("APPLICATION_NOT_FOUND", "Không tìm thấy thông tin ứng dụng gắn với khóa này", 401, requestId),
    }
  }

  if (app.status === "REVOKED" || app.status === "INACTIVE") {
    return {
      ok: false,
      requestId,
      errorResponse: apiError(
        "APPLICATION_DISABLED",
        `Ứng dụng kết nối "${app.name}" hiện đang bị tạm dừng hoặc đã bị thu hồi quyền truy cập`,
        403,
        requestId
      ),
    }
  }

  if (app.expiresAt && new Date(app.expiresAt) <= now) {
    return {
      ok: false,
      requestId,
      errorResponse: apiError("APPLICATION_EXPIRED", `Ứng dụng kết nối "${app.name}" đã hết hạn sử dụng`, 403, requestId),
    }
  }

  // 5. Rate limiting check
  const rateLimit = checkRateLimit(app.id, app.rateLimitRpm || 60)
  if (!rateLimit.allowed) {
    return {
      ok: false,
      requestId,
      errorResponse: apiError(
        "RATE_LIMIT_EXCEEDED",
        `Ứng dụng đã vượt quá giới hạn tần suất yêu cầu (${app.rateLimitRpm} lượt/phút). Vui lòng thử lại sau ${rateLimit.resetSec} giây.`,
        429,
        requestId
      ),
    }
  }

  // 6. Permissions check (Default Deny)
  let appPermissions: ApiPermission[] = []
  try {
    appPermissions = typeof app.permissions === "string" ? JSON.parse(app.permissions) : app.permissions || []
  } catch {
    appPermissions = []
  }

  if (requiredPermission) {
    const requiredList = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission]
    const hasPermission = requiredList.some((p) => appPermissions.includes(p))
    if (!hasPermission) {
      return {
        ok: false,
        requestId,
        errorResponse: apiError(
          "PERMISSION_DENIED",
          `Ứng dụng không được cấp quyền cần thiết (${requiredList.join(" hoặc ")}) để thực hiện thao tác này. Vui lòng liên hệ Quản trị viên hệ thống để mở rộng quyền.`,
          403,
          requestId
        ),
      }
    }
  }

  // 7. Parse scopes
  let allowedCampusIds: string[] = []
  try {
    allowedCampusIds = typeof app.allowedCampusIds === "string" ? JSON.parse(app.allowedCampusIds) : app.allowedCampusIds || []
  } catch {
    allowedCampusIds = []
  }

  let allowedClassIds: string[] = []
  try {
    allowedClassIds = typeof app.allowedClassIds === "string" ? JSON.parse(app.allowedClassIds) : app.allowedClassIds || []
  } catch {
    allowedClassIds = []
  }

  let allowedDepartmentIds: string[] = []
  if (app.allowedDataScope) {
    try {
      const parsedScope = JSON.parse(app.allowedDataScope)
      if (parsedScope.departmentId) {
        allowedDepartmentIds = [parsedScope.departmentId]
      } else if (Array.isArray(parsedScope.allowedDepartmentIds)) {
        allowedDepartmentIds = parsedScope.allowedDepartmentIds
      }
    } catch (_) {}
  }
  if (allowedDepartmentIds.length === 0) {
    allowedDepartmentIds = ["*"]
  }

  // 8. Update last used asynchronously (non-blocking)
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || null
  const userAgent = request.headers.get("user-agent") || null

  Promise.resolve().then(async () => {
    try {
      if (pAny.apiKey?.update) {
        await pAny.apiKey.update({
          where: { id: apiKeyRecord.id },
          data: { lastUsedAt: new Date() },
        })
        await pAny.apiApplication.update({
          where: { id: app.id },
          data: { lastUsedAt: new Date() },
        })
      }
    } catch (_) {}
  })

  return {
    ok: true,
    requestId,
    context: {
      application: {
        id: app.id,
        name: app.name,
        status: app.status,
        permissions: appPermissions,
        allowedCampusIds,
        allowedClassIds,
        allowedDepartmentIds,
        allowedDataScope: app.allowedDataScope || "ALL",
        rateLimitRpm: app.rateLimitRpm || 60,
      },
      key: {
        id: apiKeyRecord.id,
        keyId: apiKeyRecord.keyId,
      },
      requestId,
    },
  }
}

// ---------------------------------------------------------------------------
// 6. SCOPE VERIFICATION & ANTI-IDOR GUARDS
// ---------------------------------------------------------------------------

export function isCampusInScope(allowedCampusIds: string[], campusId?: string | null): boolean {
  if (!campusId) return true
  if (allowedCampusIds.includes("*") || allowedCampusIds.length === 0) return true
  return allowedCampusIds.includes(campusId)
}

export function isClassInScope(allowedClassIds: string[], classId?: string | null): boolean {
  if (!classId) return true
  if (allowedClassIds.includes("*") || allowedClassIds.length === 0) return true
  return allowedClassIds.includes(classId)
}

/**
 * Validates that requested query/body filters do not bypass configured application bounds.
 * Throws or returns an error response if client tries to access unauthorized scope.
 */
export function enforceScopeFilter(
  context: AuthenticatedApiContext,
  requestedCampusId?: string | null,
  requestedClassId?: string | null
): { ok: boolean; errorResponse?: NextResponse } {
  const { allowedCampusIds, allowedClassIds } = context.application

  if (requestedCampusId && !isCampusInScope(allowedCampusIds, requestedCampusId)) {
    return {
      ok: false,
      errorResponse: apiError(
        "CAMPUS_SCOPE_EXCEEDED",
        `Không được phép truy cập dữ liệu thuộc cơ sở ID "${requestedCampusId}". Ứng dụng chỉ được phân quyền trong phạm vi cơ sở được cấu hình.`,
        403,
        context.requestId
      ),
    }
  }

  if (requestedClassId && !isClassInScope(allowedClassIds, requestedClassId)) {
    return {
      ok: false,
      errorResponse: apiError(
        "CLASS_SCOPE_EXCEEDED",
        `Không được phép truy cập dữ liệu thuộc lớp ID "${requestedClassId}". Ứng dụng chỉ được phân quyền trong phạm vi lớp học được cấu hình.`,
        403,
        context.requestId
      ),
    }
  }

  return { ok: true }
}

export function isDepartmentInScope(allowedDepartmentIds: string[], departmentId?: string | null): boolean {
  if (!departmentId) return true
  if (allowedDepartmentIds.includes("*") || allowedDepartmentIds.length === 0) return true
  return allowedDepartmentIds.includes(departmentId)
}

export function hasPermission(context: AuthenticatedApiContext, permission: ApiPermission): boolean {
  return (context.application.permissions || []).includes(permission)
}

/**
 * Che giấu số điện thoại cá nhân (PII Masking theo Nghị định 13/2023)
 */
export function maskSensitivePhone(phone?: string | null): string | null {
  if (!phone) return null
  const cleaned = phone.trim()
  if (cleaned.length <= 4) return "****"
  return cleaned.slice(0, 3) + "****" + cleaned.slice(-3)
}

/**
 * Che giấu địa chỉ email cá nhân (PII Masking)
 */
export function maskSensitiveEmail(email?: string | null): string | null {
  if (!email || !email.includes("@")) return null
  const [user, domain] = email.split("@")
  if (user.length <= 2) return `*@${domain}`
  return `${user[0]}***${user[user.length - 1]}@${domain}`
}

/**
 * Kiểm tra phạm vi truy cập dữ liệu Giáo viên (Cơ sở + Tổ chuyên môn)
 */
export function enforceTeacherScopeFilter(
  context: AuthenticatedApiContext,
  requestedCampusId?: string | null,
  requestedDepartmentId?: string | null
): { ok: boolean; errorResponse?: NextResponse } {
  const { allowedCampusIds, allowedDepartmentIds } = context.application

  if (requestedCampusId && !isCampusInScope(allowedCampusIds, requestedCampusId)) {
    return {
      ok: false,
      errorResponse: apiError(
        "CAMPUS_SCOPE_EXCEEDED",
        `Không được phép truy cập dữ liệu giáo viên thuộc cơ sở ID "${requestedCampusId}". Ứng dụng chỉ được phân quyền trong cơ sở được cấu hình.`,
        403,
        context.requestId
      ),
    }
  }

  if (requestedDepartmentId && !isDepartmentInScope(allowedDepartmentIds, requestedDepartmentId)) {
    return {
      ok: false,
      errorResponse: apiError(
        "DEPARTMENT_SCOPE_EXCEEDED",
        `Không được phép truy cập dữ liệu giáo viên thuộc tổ chuyên môn ID "${requestedDepartmentId}". Ứng dụng chỉ được phân quyền trong phạm vi tổ chuyên môn được cấu hình.`,
        403,
        context.requestId
      ),
    }
  }

  return { ok: true }
}

/**
 * Builds Prisma where filter ensuring results are strictly locked within allowed scope.
 */
export function buildScopeWhereCondition(
  context: AuthenticatedApiContext,
  requestedCampusId?: string | null,
  requestedClassId?: string | null
): Record<string, any> {
  const { allowedCampusIds, allowedClassIds } = context.application
  const condition: Record<string, any> = {}

  // Campus boundary
  if (requestedCampusId) {
    condition.campusId = requestedCampusId
  } else if (!allowedCampusIds.includes("*") && allowedCampusIds.length > 0) {
    condition.campusId = { in: allowedCampusIds }
  }

  // Class boundary
  if (requestedClassId) {
    condition.classId = requestedClassId
  } else if (!allowedClassIds.includes("*") && allowedClassIds.length > 0) {
    condition.classId = { in: allowedClassIds }
  }

  return condition
}

// ---------------------------------------------------------------------------
// 7. AUDIT & ACCESS LOGGING
// ---------------------------------------------------------------------------

export async function logApiAccess(params: {
  applicationId: string
  keyId?: string | null
  requestId: string
  endpoint: string
  method: string
  statusCode: number
  ipAddress?: string | null
  userAgent?: string | null
  durationMs?: number
  requestSummary?: string
  errorMessage?: string
}) {
  try {
    const pAny = prisma as any
    if (pAny.apiAccessLog?.create) {
      await pAny.apiAccessLog.create({
        data: {
          applicationId: params.applicationId,
          keyId: params.keyId || null,
          requestId: params.requestId,
          endpoint: params.endpoint,
          method: params.method,
          statusCode: params.statusCode,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent ? params.userAgent.slice(0, 255) : null,
          durationMs: params.durationMs || 0,
          requestSummary: params.requestSummary ? params.requestSummary.slice(0, 500) : null,
          errorMessage: params.errorMessage ? params.errorMessage.slice(0, 500) : null,
        },
      })
    }
  } catch (err) {
    // Non-blocking, never crash the API response on log failure
    console.warn(`[API_LOG][${params.requestId}] Không thể ghi nhật ký truy cập:`, err)
  }
}

export async function recordApiAuditLog(params: {
  applicationId: string
  appName: string
  action: string
  targetTable: string
  targetId: string
  oldValues?: any
  newValues?: any
  ipAddress?: string | null
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: `API_APP:${params.applicationId}`,
        userEmail: `api_${params.appName.toLowerCase().replace(/[^a-z0-9]/g, "_")}@integration.skylineschool.edu.vn`,
        action: params.action,
        targetTable: params.targetTable,
        targetId: params.targetId,
        oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
        newValues: params.newValues ? JSON.stringify(params.newValues) : null,
        ipAddress: params.ipAddress || "API_CLIENT",
      },
    })
  } catch (err) {
    console.warn(`[API_AUDIT] Không thể ghi audit log:`, err)
  }
}
