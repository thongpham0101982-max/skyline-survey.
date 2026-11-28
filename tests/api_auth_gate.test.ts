import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import fs from "fs"
import path from "path"

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }),
  },
}))
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => null),
}))

import {
  isAdminRole,
  isKtdbclRole,
  isAdminOrKtdbclRole,
  isTeacherOrStaffPortalRole,
  isParentRole,
} from "@/lib/rbac-utils"
import {
  acquireIdempotencyLock,
  clearIdempotencyStore,
  assertOptimisticVersion,
} from "@/lib/idempotency"
import {
  recordApiMetric,
  getObservabilitySnapshot,
  resetObservabilityMetrics,
} from "@/lib/observability"
import { sendEmail } from "@/lib/mail"

function walkRouteFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkRouteFiles(full, acc)
    else if (entry.name === "route.ts") acc.push(full)
  }
  return acc
}

/**
 * Danh sách trắng duy nhất các API route được phép công khai hoặc dùng cơ chế xác thực đặc thù
 * không import trực tiếp auth/session helper.
 */
const PUBLIC_OR_SPECIAL_API_ALLOWLIST = new Set<string>([
  "/api/health/route.ts",
  "/api/ready/route.ts",
  "/api/academic-years/route.ts",
  "/api/admin/experiential-activities/catalogs/template/route.ts",
  "/api/alumni/portal/route.ts",
  "/api/hocsinh/logout/route.ts",
  "/api/hocsinh/portal/student-info/route.ts",
  "/api/hocsinh/portal/upload/route.ts",
  "/api/notification-center/[id]/interact/route.ts",
  "/api/notification-center/[id]/route.ts",
  "/api/notification-center/analytics/route.ts",
  "/api/notification-center/events/route.ts",
  "/api/notification-center/route.ts",
  "/api/parent/link-student/route.ts",
])

describe("SSM Security Gate, RBAC Single Source of Truth, Sandbox Mail, Idempotency & Observability", () => {
  it("1. Quét toàn bộ API routes: không có route mới nào bỏ quên xác thực ngoài danh sách trắng", () => {
    const apiRoot = path.resolve(process.cwd(), "src/app/api")
    const routes = walkRouteFiles(apiRoot)
    expect(routes.length).toBeGreaterThan(300)

    const unguarded: string[] = []
    for (const filePath of routes) {
      const rel = filePath
        .replace(/^.*src[\\/]+app/, "")
        .replace(/\\/g, "/")
      if (PUBLIC_OR_SPECIAL_API_ALLOWLIST.has(rel)) continue

      const content = fs.readFileSync(filePath, "utf8")
      const hasAuthGuard =
        /from\s+["'][^"']*(auth|session|security-guard|rbac|permission|api-auth|k12-approval|preschool-approval|handover|student-auth|alumni-auth|cron|tci\/auth|pvdh\/auth|advisory\/rbac|teaching-plan\/rbac|timetable\/rbac)/i.test(
          content
        ) ||
        /CRON_SECRET|SYNC_API_SECRET|NextAuth|verifyToken|verify.*Token|Bearer\s|decommissioned/i.test(
          content
        )

      if (!hasAuthGuard) {
        unguarded.push(rel)
      }
    }

    expect(unguarded).toEqual([])
  })

  it("2. DEF-003: Chuẩn hóa mã vai trò Ban KT&ĐBCL (KHAO_THI, ĐBCL, DBCL, KT_DBCL) & phân tách PARENT", () => {
    expect(isKtdbclRole("KHAO_THI")).toBe(true)
    expect(isKtdbclRole("ĐBCL")).toBe(true)
    expect(isKtdbclRole("DBCL")).toBe(true)
    expect(isKtdbclRole("KT_DBCL")).toBe(true)
    expect(isAdminOrKtdbclRole("ADMIN")).toBe(true)
    expect(isAdminOrKtdbclRole("KHAO_THI")).toBe(true)
    expect(isAdminRole("TEACHER")).toBe(false)

    expect(isTeacherOrStaffPortalRole("GVNN")).toBe(true)
    expect(isTeacherOrStaffPortalRole("TTCM")).toBe(true)
    expect(isTeacherOrStaffPortalRole("TBP")).toBe(true)
    expect(isTeacherOrStaffPortalRole("TB_DHCM")).toBe(true)
    expect(isTeacherOrStaffPortalRole("KHAO_THI")).toBe(true)
    expect(isTeacherOrStaffPortalRole("PARENT")).toBe(false)
    expect(isParentRole("PARENT")).toBe(true)
  })

  it("3. Sandbox Mail: Chặn tuyệt đối gửi SMTP thật trong môi trường test / MAIL_DRIVER=mock", async () => {
    const prevDriver = process.env.MAIL_DRIVER
    process.env.MAIL_DRIVER = "mock"
    try {
      const res = await sendEmail({
        to: "qa-sandbox@example.invalid",
        subject: "Kiểm thử thông báo",
        html: "<p>Test</p>",
      })
      expect(res.success).toBe(true)
      expect(res.skipped).toBe(true)
      expect(res.provider).toBe("MOCK_SANDBOX")
    } finally {
      if (prevDriver === undefined) delete process.env.MAIL_DRIVER
      else process.env.MAIL_DRIVER = prevDriver
    }
  })

  describe("4. Idempotency & Optimistic Concurrency Guard", () => {
    beforeEach(() => clearIdempotencyStore())
    afterEach(() => clearIdempotencyStore())

    it("Chặn double-submit khi yêu cầu đang xử lý và trả kết quả đã lưu sau khi hoàn tất", () => {
      const first = acquireIdempotencyLock<{ imported: number }>("import:u1:hash1", 10_000)
      expect(first.acquired).toBe(true)

      const concurrent = acquireIdempotencyLock("import:u1:hash1", 10_000)
      expect(concurrent.acquired).toBe(false)
      if (!concurrent.acquired) {
        expect(concurrent.reason).toBe("IN_FLIGHT")
      }

      if (first.acquired) first.complete({ imported: 42 })

      const duplicate = acquireIdempotencyLock<{ imported: number }>("import:u1:hash1", 10_000)
      expect(duplicate.acquired).toBe(false)
      if (!duplicate.acquired) {
        expect(duplicate.reason).toBe("DUPLICATE_COMPLETED")
        expect(duplicate.cachedResponse).toEqual({ imported: 42 })
      }
    })

    it("Phát hiện xung đột sửa/duyệt đồng thời bằng mốc updatedAt", () => {
      const t1 = new Date("2026-11-19T10:00:00.000Z")
      const t2 = new Date("2026-11-19T10:00:05.000Z")
      expect(assertOptimisticVersion(t1, t1).ok).toBe(true)
      expect(assertOptimisticVersion(t1.toISOString(), t2).ok).toBe(false)
    })
  })

  describe("5. Observability Telemetry", () => {
    beforeEach(() => resetObservabilityMetrics())

    it("Ghi nhận chính xác số lỗi 5xx, yêu cầu chậm (>=1000ms) và p95", () => {
      recordApiMetric({ route: "/api/a", method: "GET", statusCode: 200, durationMs: 45 })
      recordApiMetric({ route: "/api/b", method: "POST", statusCode: 200, durationMs: 1450 })
      recordApiMetric({ route: "/api/c", method: "POST", statusCode: 500, durationMs: 120 })

      const snap = getObservabilitySnapshot()
      expect(snap.totalTracked).toBe(3)
      expect(snap.slowRequestCount).toBe(1)
      expect(snap.serverErrorCount).toBe(1)
      expect(snap.errorRatePct).toBe(33.33)
      expect(snap.p95DurationMs).toBe(1450)
    })
  })
})
