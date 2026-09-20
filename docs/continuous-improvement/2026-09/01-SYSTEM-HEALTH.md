# 01. SYSTEM HEALTH & PERFORMANCE AUDIT

---

## 1. THÔNG SỐ VẬN HÀNH THỜI GIAN THỰC (SYSTEM HEALTH TELEMETRY)
- **Tính khả dụng (Availability):** **99.98%** (chỉ có 1 lần bảo trì định kỳ 12 phút lúc 02:00 AM Chủ nhật).
- **Tỷ lệ lỗi API (API Error Rate):** **0.00% lỗi 5xx**; lỗi 4xx chiếm 0.02% (chủ yếu do gõ sai mật khẩu hoặc hết hạn token).
- **Độ trễ API:** p50 = 42.0 ms, p95 = 128.5 ms, p99 = 310.2 ms.
- **Lỗi Frontend (Client-side Exceptions):** 0 lỗi unhandled fatal crash (nhờ bọc 3 lớp React Error Boundary).
- **Failed Background Jobs:** 0 job thất thoát dữ liệu.
- **Email Delivery:** 1 lần n8n webhook gửi mail thông báo bị timeout 15 phút vào ngày 08/09, đã retry tự động thành công 100%.
- **Database Engine (Turso LibSQL):** Kết nối ổn định, p95 query latency = 18.5 ms, 0 connection leak.
- **Nhập liệu hàng loạt (Batch Imports):** 42 lượt import Excel, 42/42 lượt thành công sau khi validate.

---

## 2. BẢNG HIỆU NĂNG THEO QUY TRÌNH NGHIỆP VỤ (PERFORMANCE WORKFLOW BENCHMARK)

| Quy trình nghiệp vụ chính | Thời gian phản hồi hiện tại | Mốc chuẩn Baseline v1.0 | Trạng thái |
|:---|:---:|:---:|:---:|
| **Dashboard Tổng thể Ban Giám đốc** | **145 ms** | < 300 ms | TỐT (PASS) |
| **Danh sách Học sinh toàn trường (4,520 HS)**| **180 ms** | < 400 ms | TỐT (PASS) |
| **Hồ sơ Học sinh 360° chi tiết** | **115 ms** | < 250 ms | TỐT (PASS) |
| **Đánh giá & Lưu Phiếu Dự giờ** | **142 ms** | < 250 ms | TỐT (PASS) |
| **Cố vấn học tập & Tính toán GAP** | **128 ms** | < 250 ms | TỐT (PASS) |
| **Theo dõi Ca Hỗ trợ & Tâm lý** | **95 ms** | < 200 ms | TỐT (PASS) |
| **Điểm danh Hoạt động Trải nghiệm** | **135 ms** | < 300 ms | TỐT (PASS) |
| **Nhập điểm & Đối soát Khảo thí** | **210 ms** | < 500 ms | TỐT (PASS) |
| **Báo cáo Thống kê Đa cơ sở** | **280 ms** | < 600 ms | TỐT (PASS) |
