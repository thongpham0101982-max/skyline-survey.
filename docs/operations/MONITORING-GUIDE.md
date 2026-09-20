# SSM MONITORING & ALERTING GUIDE

---

## 1. CÁC ENDPOINT THEO DÕI
- **Liveness:** `/api/health`
- **Readiness:** `/api/ready`

## 2. BẢNG ĐIỀU KHIỂN GIÁM SÁT (DASHBOARD TELEMETRY)
- Theo dõi CPU, RAM, Disk, Tỷ lệ lỗi 4xx/5xx, và p95 latency.
- Cảnh báo tự động gửi về hệ thống giám sát tập trung khi vượt ngưỡng tiêu chuẩn.
