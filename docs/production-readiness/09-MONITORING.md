# 09. MONITORING, TELEMETRY & ALERTING MATRIX

---

## 1. MA TRẬN GIÁM SÁT THỜI GIAN THỰC (REAL-TIME TELEMETRY)

```text
+-----------------------+     +-----------------------+     +-----------------------+
|    UPTIME & PING      |     |  SYSTEM LOAD & METRICS|     | APPLICATION APM & SLAS|
| - Probe /api/health   |     | - CPU / RAM / Disk    |     | - Error Rate (% 5xx)  |
| - Probe /api/ready    |     | - Turso Query Metrics |     | - p95/p99 Latency     |
| - Interval: 30s       |     | - Ingress Traffic     |     | - Active Sessions     |
+-----------------------+     +-----------------------+     +-----------------------+
            │                             │                             │
            └─────────────────────────────┼─────────────────────────────┘
                                          ▼
                      +---------------------------------------+
                      |       ALERT MANAGER & NOTIFIERS       |
                      | - Telegram / Slack Operations Channel |
                      | - Email P1 Escalation (24/7 On-call)  |
                      +---------------------------------------+
```

---

## 2. NGƯỠNG KÍCH HOẠT CẢNH BÁO (ALERTING THRESHOLDS)

| Mức độ | Tiêu chí kích hoạt | Thời gian duy trì | Kênh thông báo | Thời gian phản hồi tối đa |
|:---:|:---|:---:|:---:|:---:|
| **P1 — Critical** | `/api/ready` trả về 503 hoặc tỷ lệ lỗi 5xx > 5% | 1 phút | Hotline / SMS / Slack Urgent | < 15 phút |
| **P2 — Major** | p95 Latency > 1,000ms hoặc CPU server > 80% | 3 phút | Slack Alert / Email On-call | < 30 phút |
| **P3 — Warning** | Lỗi 4xx tăng đột biến hoặc memory > 70% | 10 phút | Slack Operations Channel | < 2 giờ |
| **P4 — Info** | Disk usage > 60% hoặc thông báo bản cập nhật | 1 ngày | Operations Daily Digest | < 24 giờ |
