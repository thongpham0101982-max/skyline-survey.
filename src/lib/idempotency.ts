/**
 * Tiện ích chống gửi trùng (Idempotency) và kiểm soát xung đột đồng thời (Optimistic Concurrency)
 * cho các thao tác ghi trọng yếu (import nhiều sheet, duyệt PVĐH, chốt sổ điểm, ký số).
 */

export interface IdempotencyEntry<T = unknown> {
  status: "IN_FLIGHT" | "COMPLETED"
  startedAt: number
  expiresAt: number
  response?: T
}

const store = new Map<string, IdempotencyEntry>()
const MAX_STORE_ENTRIES = 1000

function pruneExpired(now: number) {
  if (store.size <= MAX_STORE_ENTRIES) return
  for (const [k, v] of store.entries()) {
    if (v.expiresAt <= now) {
      store.delete(k)
    }
  }
}

export type IdempotencyAcquireResult<T = unknown> =
  | {
      acquired: true
      complete: (response?: T) => void
      abort: () => void
    }
  | {
      acquired: false
      reason: "IN_FLIGHT" | "DUPLICATE_COMPLETED"
      cachedResponse?: T
    }

/**
 * Giữ khóa idempotency theo khóa duy nhất (ví dụ: userId + endpoint + Idempotency-Key hoặc hash payload).
 * - Nếu yêu cầu cùng khóa đang xử lý: trả `acquired: false, reason: "IN_FLIGHT"` (HTTP 409).
 * - Nếu yêu cầu cùng khóa vừa hoàn tất trong TTL: trả `acquired: false, reason: "DUPLICATE_COMPLETED"` kèm kết quả đã lưu.
 */
export function acquireIdempotencyLock<T = unknown>(
  key: string,
  ttlMs = 15_000
): IdempotencyAcquireResult<T> {
  const now = Date.now()
  pruneExpired(now)

  const existing = store.get(key)
  if (existing && existing.expiresAt > now) {
    return {
      acquired: false,
      reason: existing.status === "IN_FLIGHT" ? "IN_FLIGHT" : "DUPLICATE_COMPLETED",
      cachedResponse: existing.response as T | undefined,
    }
  }

  store.set(key, {
    status: "IN_FLIGHT",
    startedAt: now,
    expiresAt: now + ttlMs,
  })

  return {
    acquired: true,
    complete(response?: T) {
      const doneAt = Date.now()
      store.set(key, {
        status: "COMPLETED",
        startedAt: now,
        expiresAt: doneAt + ttlMs,
        response,
      })
    },
    abort() {
      store.delete(key)
    },
  }
}

export function clearIdempotencyStore() {
  store.clear()
}

export interface OptimisticVersionCheckResult {
  ok: boolean
  conflictMessage?: string
}

/**
 * Kiểm tra xung đột sửa/duyệt đồng thời (Optimistic Locking) bằng mốc `updatedAt` hoặc số `version`.
 */
export function assertOptimisticVersion(
  expected: string | number | Date | null | undefined,
  actual: string | number | Date | null | undefined
): OptimisticVersionCheckResult {
  if (expected === undefined || expected === null || expected === "") {
    return { ok: true }
  }
  if (actual === undefined || actual === null) {
    return {
      ok: false,
      conflictMessage: "Bản ghi không còn tồn tại hoặc đã bị thay đổi bởi người dùng khác.",
    }
  }

  const expVal =
    expected instanceof Date
      ? expected.getTime()
      : typeof expected === "number"
        ? expected
        : /^\d+$/.test(String(expected))
          ? Number(expected)
          : new Date(expected).getTime()

  const actVal =
    actual instanceof Date
      ? actual.getTime()
      : typeof actual === "number"
        ? actual
        : /^\d+$/.test(String(actual))
          ? Number(actual)
          : new Date(actual).getTime()

  if (Number.isNaN(expVal) || Number.isNaN(actVal) || expVal !== actVal) {
    return {
      ok: false,
      conflictMessage:
        "Dữ liệu vừa được cập nhật bởi người dùng khác. Vui lòng tải lại trang trước khi lưu hoặc duyệt.",
    }
  }

  return { ok: true }
}
