# 11. HEALTH CHECKS & PROBES SPECIFICATION

---

## 1. LIVENESS PROBE (`GET /api/health`)
- **Mục đích:** Xác nhận process Node.js còn sống và có khả năng nhận request HTTP.
- **SLA:** Phản hồi trong < 5ms.
- **Response Format:**
```json
{
  "status": "pass",
  "timestamp": "2026-09-20T08:30:00.000Z",
  "service": "ssm-educational-quality-management",
  "version": "1.0.0",
  "uptime": 86400,
  "memory": {
    "rssMB": 185.4,
    "heapTotalMB": 92.1,
    "heapUsedMB": 68.3
  }
}
```

---

## 2. READINESS PROBE (`GET /api/ready`)
- **Mục đích:** Xác nhận ứng dụng đã sẵn sàng xử lý traffic nghiệp vụ bằng cách kiểm tra kết nối thực tế tới CSDL Turso LibSQL (`prisma.academicYear.findFirst`).
- **HTTP Status:** `200 OK` (Healthy) hoặc `503 Service Unavailable` (Degraded/Down).
- **Đảm bảo bảo mật:** Hoàn toàn KHÔNG trả về connection string, token hay thông tin schema nội bộ.
- **Response Format:**
```json
{
  "status": "ready",
  "timestamp": "2026-09-20T08:30:00.000Z",
  "database": {
    "status": "connected",
    "latencyMs": 18
  },
  "dependencies": {
    "database": "healthy"
  }
}
```
