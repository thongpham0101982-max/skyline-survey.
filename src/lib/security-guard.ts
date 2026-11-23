import path from "path"
import { prisma } from "@/lib/db"

type RateLimitBucket = {
  timestamps: number[]
}

const rateLimitStore: Map<string, RateLimitBucket> =
  (globalThis as any).__ssmRateLimitStore ??
  ((globalThis as any).__ssmRateLimitStore = new Map<string, RateLimitBucket>())

/**
 * In-memory sliding-window rate limiter for authentication, password recovery, and sensitive endpoints.
 */
export function checkRateLimit(
  key: string,
  maxRequests = 10,
  windowMs = 60_000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const cutoff = now - windowMs
  const normalizedKey = String(key || "anonymous").trim().toLowerCase()

  const existing = rateLimitStore.get(normalizedKey)
  const validTimestamps = (existing?.timestamps || []).filter((ts) => ts > cutoff)

  if (validTimestamps.length >= maxRequests) {
    const oldest = validTimestamps[0] || now
    rateLimitStore.set(normalizedKey, { timestamps: validTimestamps })
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldest + windowMs,
    }
  }

  validTimestamps.push(now)
  rateLimitStore.set(normalizedKey, { timestamps: validTimestamps })

  // Periodic lightweight cleanup when map grows large
  if (rateLimitStore.size > 2000) {
    for (const [k, bucket] of rateLimitStore.entries()) {
      const active = bucket.timestamps.filter((ts) => ts > cutoff)
      if (active.length === 0) rateLimitStore.delete(k)
      else rateLimitStore.set(k, { timestamps: active })
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - validTimestamps.length),
    resetAt: now + windowMs,
  }
}

export function resetRateLimitStore(): void {
  rateLimitStore.clear()
}

export function getClientIpFromRequest(req?: Request | null): string {
  if (!req || !req.headers) return "127.0.0.1"
  const xff = req.headers.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = req.headers.get("x-real-ip")?.trim()
  if (realIp) return realIp
  return "127.0.0.1"
}

const TRUSTED_HOST_SUFFIXES = [
  "skylineschool.edu.vn",
  "localhost",
  "127.0.0.1",
  ".vercel.app",
]

function isTrustedHost(host: string): boolean {
  const cleanHost = host.trim().toLowerCase().replace(/:\d+$/, "")
  if (!cleanHost || /[^a-z0-9.-]/.test(cleanHost)) return false

  const configuredUrls = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean) as string[]

  for (const rawUrl of configuredUrls) {
    try {
      const parsed = new URL(rawUrl)
      if (parsed.hostname.toLowerCase() === cleanHost) return true
    } catch {}
  }

  return TRUSTED_HOST_SUFFIXES.some(
    (suffix) =>
      cleanHost === suffix ||
      (suffix.startsWith(".") ? cleanHost.endsWith(suffix) : cleanHost.endsWith(`.${suffix}`))
  )
}

/**
 * Prevents Host Header Injection when generating password reset or approval links.
 */
export function getSafeAppBaseUrl(req?: Request | null): string {
  const configured = (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  ).trim()

  if (configured) {
    try {
      const parsed = new URL(configured)
      return parsed.origin
    } catch {}
  }

  if (req?.headers) {
    const rawHost = (
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      ""
    )
      .split(",")[0]
      ?.trim()
    if (rawHost && isTrustedHost(rawHost)) {
      const proto =
        req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "http" ||
        rawHost.startsWith("localhost") ||
        rawHost.startsWith("127.0.0.1")
          ? "http"
          : "https"
      return `${proto}://${rawHost}`
    }
  }

  return "https://ssm.skylineschool.edu.vn"
}

/**
 * Masks an email address to prevent account/PII enumeration in unauthenticated responses.
 */
export function maskEmail(email?: string | null): string {
  const raw = String(email || "").trim()
  const atIndex = raw.indexOf("@")
  if (atIndex <= 0) return "***"
  const local = raw.slice(0, atIndex)
  const domain = raw.slice(atIndex + 1)
  if (local.length <= 2) {
    return `${local[0] || "*"}***@${domain}`
  }
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`
}

/**
 * Sanitizes a user-provided filename to prevent Path Traversal.
 */
export function sanitizeFileName(fileName?: string | null, fallback = "export"): string {
  const raw = String(fileName || "").trim()
  if (!raw) return fallback
  const base = path.basename(raw)
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "")
  return cleaned || fallback
}

export const PRIVILEGED_GRADEBOOK_ROLES = new Set([
  "ADMIN",
  "SUPER_ADMIN",
  "SUPERADMIN",
  "KT_DBCL",
  "KTDBCL",
  "BAN_GIAM_HIEU",
  "BGH",
  "BGH_MN",
  "NHOM_TRUONG_MN",
  "GDCS",
  "GĐCS",
  "TB_DHCM",
  "TBP",
  "TTCM",
  "TO_TRUONG",
])

export const LEADERSHIP_AND_ADMIN_ROLES = new Set([
  ...PRIVILEGED_GRADEBOOK_ROLES,
  "GD_CS",
  "GĐ_CS",
  "BGH_CS",
  "KHAO_THI",
  "BAN_DHCM",
  "TRUONG_BAN",
  "DIEU_PHOI",
])

export const ENTRANCE_OPERATIONS_ROLES = new Set([
  ...LEADERSHIP_AND_ADMIN_ROLES,
  "GIAO_VU",
  "GIAOVU",
  "GIAO_VU_CS",
  "TU_VAN_TUYEN_SINH",
  "TUYENSINH",
  "TU_VAN",
  "Y_TE",
])

export function isPrivilegedGradebookRole(
  primaryRole?: string | null,
  roles?: string[] | null
): boolean {
  const normPrimary = String(primaryRole || "").trim().toUpperCase()
  if (normPrimary === "PARENT" || normPrimary === "STUDENT") return false
  if (PRIVILEGED_GRADEBOOK_ROLES.has(normPrimary)) return true
  if (Array.isArray(roles)) {
    return roles.some((r) =>
      PRIVILEGED_GRADEBOOK_ROLES.has(String(r || "").trim().toUpperCase())
    )
  }
  return false
}

export type ResolvedAuthContext = {
  session: any
  user: any
  userId: string
  userEmail: string
  role: string
  roles: string[]
  isParent: boolean
  isGDCS: boolean
  allowedCampusIds: string[]
  isPrivileged: boolean
}

export async function getResolvedAuthContext(): Promise<ResolvedAuthContext | null> {
  const { auth } = await import("@/lib/auth")
  const session = await auth()
  if (!session?.user) return null
  const user = session.user as any
  const role = String(user.role || "").trim().toUpperCase()
  const roles: string[] = Array.isArray(user.roles)
    ? user.roles.map((r: any) => String(r || "").trim().toUpperCase())
    : role
      ? [role]
      : []

  const isParent =
    role === "PARENT" ||
    (roles.includes("PARENT") &&
      !roles.some((r) => r !== "PARENT" && r !== ""))

  const isGDCS = Boolean(
    user.isGDCS ||
    ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "BGH_CS", "BGH_MN"].includes(role)
  )
  const allowedCampusIds: string[] = Array.isArray(user.allowedCampusIds)
    ? user.allowedCampusIds
    : []

  return {
    session,
    user,
    userId: String(user.id || "SYSTEM"),
    userEmail: String(user.email || user.name || "UNKNOWN"),
    role,
    roles,
    isParent,
    isGDCS,
    allowedCampusIds,
    isPrivileged: isPrivilegedGradebookRole(role, roles),
  }
}

export async function requireStaffSession(): Promise<ResolvedAuthContext | null> {
  const ctx = await getResolvedAuthContext()
  if (!ctx || ctx.isParent) return null
  return ctx
}

export async function requireAdminOrLeadershipSession(): Promise<ResolvedAuthContext | null> {
  const ctx = await getResolvedAuthContext()
  if (!ctx || ctx.isParent) return null
  const hasAdminOrLeadership =
    LEADERSHIP_AND_ADMIN_ROLES.has(ctx.role) ||
    ctx.roles.some((r) => LEADERSHIP_AND_ADMIN_ROLES.has(r))
  if (!hasAdminOrLeadership) return null
  return ctx
}

export async function requireEntranceOperationsSession(): Promise<ResolvedAuthContext | null> {
  const ctx = await getResolvedAuthContext()
  if (!ctx || ctx.isParent) return null
  const hasOpsRole =
    ENTRANCE_OPERATIONS_ROLES.has(ctx.role) ||
    ctx.roles.some((r) => ENTRANCE_OPERATIONS_ROLES.has(r))
  if (!hasOpsRole) return null
  return ctx
}

const REDACTED_KEYS = new Set([
  "password",
  "newPassword",
  "oldPassword",
  "smtpPass",
  "token",
  "authToken",
  "secret",
  "rawPassStart",
  "rawPassEnd",
])

function redactSensitiveObject(value: any): string | null {
  if (value === undefined || value === null) return null
  if (typeof value === "string") return value.slice(0, 4000)
  try {
    const cleaned = JSON.parse(
      JSON.stringify(value, (k, v) => {
        if (REDACTED_KEYS.has(k)) return "[REDACTED]"
        return v
      })
    )
    return JSON.stringify(cleaned).slice(0, 4000)
  } catch {
    return String(value).slice(0, 4000)
  }
}

export async function writeSecurityAuditLog(params: {
  userId?: string | null
  userEmail?: string | null
  action: string
  targetTable: string
  targetId?: string | null
  oldValues?: any
  newValues?: any
  ipAddress?: string | null
}): Promise<void> {
  try {
    const createFn = (prisma as any)?.auditLog?.create
    if (typeof createFn !== "function") return
    await createFn.call((prisma as any).auditLog, {
      data: {
        userId: String(params.userId || "SYSTEM"),
        userEmail: String(params.userEmail || "SYSTEM"),
        action: params.action,
        targetTable: params.targetTable,
        targetId: params.targetId ? String(params.targetId) : null,
        oldValues: redactSensitiveObject(params.oldValues),
        newValues: redactSensitiveObject(params.newValues),
        ipAddress: params.ipAddress || "127.0.0.1",
      },
    })
  } catch (err) {
    // Non-blocking audit log write
  }
}
