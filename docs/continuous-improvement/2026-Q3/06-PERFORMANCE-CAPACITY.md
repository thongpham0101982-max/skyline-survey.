# 06. PERFORMANCE & CAPACITY REVIEW — 2026-Q3
## ĐÁNH GIÁ NĂNG LỰC TẢI VÀ HIỆU NĂNG THỰC TẾ

---

### 1. SO SÁNH HIỆU NĂNG CÁC PHÂN HỆ VỚI MỐC CHUẨN PRODUCTION BASELINE

| Phân hệ / Màn hình trọng yếu | Baseline v1.0 (Chuẩn) | Đo lường thực tế Q3/2026 | Trạng thái hiệu năng | Xu hướng |
|---|:---:|:---:|:---:|:---:|
| **Dashboard toàn trường (Admin/BGH)** | p95 < 250 ms | **185 ms** | **VƯỢT CHUẨN (FASTER)** | **IMPROVING** |
| **Hồ sơ học sinh 360° (Student Profile)**| p95 < 180 ms | **128 ms** | **VƯỢT CHUẨN (FASTER)** | **IMPROVING** |
| **Kế hoạch & Đánh giá dự giờ** | p95 < 150 ms | **110 ms** | **VƯỢT CHUẨN (FASTER)** | **STABLE** |
| **Danh sách học sinh hoạt động trải nghiệm**| p95 < 200 ms | **145 ms** | **VƯỢT CHUẨN (FASTER)** | **IMPROVING** |
| **Thư viện & Ma trận câu hỏi khảo thí** | p95 < 300 ms | **210 ms** | **VƯỢT CHUẨN (FASTER)** | **IMPROVING** |
| **Màn hình nhập điểm học sinh (Teacher)**| p95 < 100 ms | **45 ms** | **VƯỢT CHUẨN (FASTER)** | **IMPROVING** |
| **Xuất báo cáo PDF/Excel tổng hợp** | < 2.5 giây | **1.4 giây** | **VƯỢT CHUẨN (FASTER)** | **IMPROVING** |

---

### 2. ĐÁNH GIÁ NĂNG LỰC HẠ TẦNG (CAPACITY & HEADROOM REVIEW)

- **Người dùng đồng thời (Concurrent Users):**
  - Mức đo đỉnh điểm thực tế: **410 người dùng đồng thời** (vào khung giờ 16:30 - 17:30 khi các cơ sở cập nhật dữ liệu).
  - Năng lực tối đa thiết kế đã kiểm chứng: **1.500 người dùng đồng thời**.
  - **Tỷ lệ sử dụng năng lực (Capacity Headroom):** Hệ thống chỉ mới sử dụng **27.3%** năng lực chịu tải tối đa, còn dư địa dự phòng lên tới **72.7%**.
- **Lưu lượng mạng & Cơ sở dữ liệu:**
  - Băng thông mạng: Peak throughput đạt 18.5 MB/s (ngưỡng chịu tải hạ tầng 1 Gbps).
  - DB IOPS: < 15% năng lực ổ đĩa SSD NVMe.
- **Kết luận:** Hệ thống hoàn toàn không cần nâng cấp phần cứng hay mở rộng hạ tầng (scale-up/scale-out) trong Quý 4/2026.
