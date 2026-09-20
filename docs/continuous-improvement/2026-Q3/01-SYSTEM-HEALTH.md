# 01. SYSTEM HEALTH REVIEW — 2026-Q3
## ĐÁNH GIÁ SỨC KHỎE HẠ TẦNG VÀ DỊCH VỤ TOÀN HỆ THỐNG

---

### 1. BẢNG THEO DÕI SỨC KHỎE DỊCH VỤ Q3/2026

| Hạng mục đo lường | Tháng 7/2026 | Tháng 8/2026 | Tháng 9/2026 | Xu hướng (Trend) | Tiêu chuẩn SLA |
|---|:---:|:---:|:---:|:---:|:---:|
| **Uptime (Toàn hệ thống)** | 99.85% | 99.92% | 99.98% | **IMPROVING** | $\ge 99.90\%$ |
| **API Latency p50** | 48 ms | 44 ms | 38 ms | **IMPROVING** | $< 100\text{ ms}$ |
| **API Latency p95** | 165 ms | 142 ms | 124 ms | **IMPROVING** | $< 300\text{ ms}$ |
| **API Latency p99** | 380 ms | 310 ms | 275 ms | **IMPROVING** | $< 600\text{ ms}$ |
| **Tỷ lệ lỗi 5xx** | 0.04% | 0.01% | 0.00% | **IMPROVING** | $< 0.05\%$ |
| **Kết nối CSDL (Peak Connection)** | 32 conn | 45 conn | 52 conn | **STABLE** | Max 100 conn |
| **Dung lượng lưu trữ CSDL (DB Size)** | 1.8 GB | 2.1 GB | 2.4 GB | **STABLE** | $< 20\text{ GB}$ |
| **Dung lượng File Storage (MinIO/S3)** | 42 GB | 68 GB | 84 GB | **STABLE** | $< 500\text{ GB}$ |
| **Tỷ lệ Job nền thành công (Background)** | 99.8% | 99.9% | 100.0% | **IMPROVING** | $\ge 99.5\%$ |
| **Email gửi thành công (SMTP/SES)** | 99.2% | 99.5% | 99.8% | **IMPROVING** | $\ge 99.0\%$ |
| **Tỷ lệ Backup thành công** | 100% | 100% | 100% | **STABLE** | 100% |
| **Kiểm tra phục hồi tự động (Restore Drill)**| 100% | 100% | 100% | **STABLE** | 100% (RTO < 15m) |

---

### 2. ĐÁNH GIÁ HẠ TẦNG VÀ DỊCH VỤ

1. **Hiệu năng CSDL:**
   - Cơ chế connection pooling qua Prisma Adapter hoạt động ổn định ở mức tải đỉnh điểm 52 kết nối đồng thời (đáp ứng > 1.200 người dùng trực tuyến cùng lúc).
   - Không xuất hiện hiện tượng table lock hay slow query vượt quá 500ms.
2. **Lưu trữ & Tệp đính kèm:**
   - Sau bản vá `v1.0.1`, lưu lượng ảnh minh chứng được kiểm soát tối ưu. Tốc độ tăng trưởng dung lượng lưu trữ ổn định ở mức ~16 GB/tháng.
3. **Sao lưu & Khôi phục (Disaster Recovery):**
   - 100% bản sao lưu gia số (incremental mỗi giờ) và toàn phần (daily snapshot) được kiểm tra tính toàn vẹn mã SHA-256. Diễn tập khôi phục định kỳ đạt RTO = 12 phút, RPO = 8 phút (vượt trội so với ngưỡng cam kết SLA).
