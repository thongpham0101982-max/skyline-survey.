/**
 * Bộ theo dõi hiệu năng & lỗi API nhẹ trong bộ nhớ (Observability)
 * Phục vụ giám sát các endpoint chậm (>= 1000ms) và lỗi 5xx mà không ghi nhận PII.
 */

export interface ApiMetricRecord {
  route: string
  method: string
  statusCode: number
  durationMs: number
  timestamp: string
  slow: boolean
  isServerError: boolean
}

export interface ObservabilitySnapshot {
  totalTracked: number
  serverErrorCount: number
  slowRequestCount: number
  errorRatePct: number
  p95DurationMs: number
  recentSlowRequests: ApiMetricRecord[]
  recentServerErrors: ApiMetricRecord[]
}

const MAX_METRICS = 500
const SLOW_THRESHOLD_MS = 1000
const metricsBuffer: ApiMetricRecord[] = []

export function recordApiMetric(input: {
  route: string
  method: string
  statusCode: number
  durationMs: number
}): ApiMetricRecord {
  const durationMs = Math.max(0, Math.round(input.durationMs))
  const record: ApiMetricRecord = {
    route: input.route,
    method: input.method.toUpperCase(),
    statusCode: input.statusCode,
    durationMs,
    timestamp: new Date().toISOString(),
    slow: durationMs >= SLOW_THRESHOLD_MS,
    isServerError: input.statusCode >= 500,
  }

  metricsBuffer.push(record)
  if (metricsBuffer.length > MAX_METRICS) {
    metricsBuffer.shift()
  }

  if (record.isServerError || record.slow) {
    console.warn(
      `[SSM-OBSERVABILITY] ${record.method} ${record.route} -> ${record.statusCode} (${record.durationMs}ms)`
    )
  }

  return record
}

export function getObservabilitySnapshot(): ObservabilitySnapshot {
  const totalTracked = metricsBuffer.length
  if (totalTracked === 0) {
    return {
      totalTracked: 0,
      serverErrorCount: 0,
      slowRequestCount: 0,
      errorRatePct: 0,
      p95DurationMs: 0,
      recentSlowRequests: [],
      recentServerErrors: [],
    }
  }

  const serverErrors = metricsBuffer.filter((m) => m.isServerError)
  const slowRequests = metricsBuffer.filter((m) => m.slow)
  const sortedDurations = metricsBuffer.map((m) => m.durationMs).sort((a, b) => a - b)
  const p95Idx = Math.min(totalTracked - 1, Math.floor(totalTracked * 0.95))

  return {
    totalTracked,
    serverErrorCount: serverErrors.length,
    slowRequestCount: slowRequests.length,
    errorRatePct: Math.round((serverErrors.length / totalTracked) * 10000) / 100,
    p95DurationMs: sortedDurations[p95Idx] ?? 0,
    recentSlowRequests: slowRequests.slice(-20).reverse(),
    recentServerErrors: serverErrors.slice(-20).reverse(),
  }
}

export function resetObservabilityMetrics() {
  metricsBuffer.length = 0
}
