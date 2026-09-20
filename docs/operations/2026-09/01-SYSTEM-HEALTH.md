# 01. SYSTEM HEALTH & AVAILABILITY — MONTH 1
## BÁO CÁO ĐO LƯỜNG SỨC KHỎE HẠ TẦNG VÀ DỊCH VỤ

---

### 1. CHỈ SỐ SẴN SÀNG VÀ TỶ LỆ THÀNH CÔNG DỊCH VỤ (SLO/SLA)

| Thành phần dịch vụ | Chỉ tiêu SLO | Thực tế đo lường Month 1 | Tình trạng | Xu hướng |
|---|:---:|:---:|:---:|:---:|
| **Uptime hệ thống web** | 99.90% | **99.98%** (Downtime: 8 phút bảo trì định kỳ) | **PASS** | **STABLE** |
| **API Success Rate (2xx/3xx)** | 99.50% | **99.96%** | **PASS** | **STABLE** |
| **Tỷ lệ lỗi máy chủ (5xx)** | < 0.05% | **0.00%** (0 lỗi 500/502/503/504) | **PASS** | **STABLE** |
| **Job xử lý nền (Background Tasks)**| 99.00% | **100.00%** (12.450 jobs hoàn thành) | **PASS** | **STABLE** |
| **Dịch vụ gửi Email (SMTP)** | 98.50% | **99.80%** (Gửi 8.640 email thông báo) | **PASS** | **STABLE** |
| **Tỷ lệ hoàn thành sao lưu tự động** | 100.00%| **100.00%** (720 snapshots gia số) | **PASS** | **STABLE** |

---

### 2. NHẬT KÝ KIỂM TRA SỨC KHỎE HẰNG NGÀY (DAILY HEALTH CHECK LOG)
Thực hiện tự động kiểm tra mỗi ngày vào 06:00 và 18:00 thông qua endpoint `/api/health` và `/api/ready`:

- **Ngày 01 - 07 (Tuần 1 - Ổn định hóa):** Toàn bộ dịch vụ Web, CSDL, Auth hoạt động ổn định; thời gian phản hồi `/api/health` trung bình 12ms.
- **Ngày 08 - 14 (Tuần 2 - Tải cao điểm nhập dữ liệu đầu năm):** CSDL đạt đỉnh 52 kết nối đồng thời, tài nguyên CPU server giữ mức < 22%, RAM < 45%.
- **Ngày 15 - 21 (Tuần 3 - Rà soát dữ liệu học sinh & môn học):** Không phát sinh deadlock hay timeout trên toàn bộ các truy vấn tổng hợp.
- **Ngày 22 - 30 (Tuần 4 - Đánh giá cuối tháng & Phát hành v1.0.1):** Kiểm tra rolling restart container không làm đứt kết nối người dùng.

---

### 3. TÀI NGUYÊN HẠ TẦNG VÀ LƯU TRỮ
- **CSDL LibSQL / SQLite:** Dung lượng tệp CSDL tăng từ 1.8 GB lên **2.4 GB** (+600 MB dữ liệu điểm khảo sát và hồ sơ học sinh).
- **Bộ nhớ lưu trữ tệp (MinIO / S3):** 84 GB (chủ yếu là ảnh minh chứng hoạt động trải nghiệm đã được áp dụng chuẩn lazy load).
- **Trạng thái tổng thể:** **SYSTEM HEALTH = PASS**.
