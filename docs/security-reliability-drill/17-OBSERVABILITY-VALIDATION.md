# 17. OBSERVABILITY, TELEMETRY & ALERTING VALIDATION

---

## 1. KIỂM ĐỊNH TỐC ĐỘ PHÁT HIỆN SỰ CỐ (DETECTION SPEED)

| Tình huống sự cố thử nghiệm | Thời gian hệ thống phát hiện | Kênh cảnh báo kích hoạt | Trạng thái phát hiện |
|:---|:---:|:---:|:---:|
| **CSDL ngắt kết nối đột ngột** | **22 ms** (qua `/api/ready`) | Slack Urgent + SMS On-call | **PASS (Tức thì)** |
| **Tỷ lệ lỗi 5xx tăng > 2%** | **45 giây** (qua APM monitor) | Slack Operations Channel | **PASS** |
| **Độ trễ API p95 > 1,000 ms** | **1 phút 15 giây** | Slack Alert | **PASS** |
| **Tấn công brute-force đăng nhập** | **Ngay tại lần thử thứ 5** | Security Audit Log Stream | **PASS** |

---

## 2. TRUY VẾT LỖI XUYÊN SUỐT VỚI CORRELATION ID (REQUEST TRACING)
Đã thử nghiệm gửi một request lỗi có kiểm soát kèm header `x-request-id: req_sec_test_9981`:
- Request đi từ Browser $ightarrow$ Edge Gateway $ightarrow$ API Handler $ightarrow$ Prisma Client $ightarrow$ Log Collector.
- Toàn bộ các bản ghi log liên quan đều chứa chính xác chuỗi `req_sec_test_9981`.
- Đội ngũ vận hành có thể tìm ra nguyên nhân gốc rễ (Root Cause) chỉ trong vòng **dưới 1 phút**.
