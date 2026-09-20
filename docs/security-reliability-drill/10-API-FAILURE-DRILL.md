# 10. API PARTIAL FAILURE DRILL REPORT (DRILL 2)

---

## 1. KỊCH BẢN THỬ NGHIỆM: LỖI CỤC BỘ MỘT PHÂN HỆ (PARTIAL API OUTAGE)
- **Tình huống giả lập:** Module Khảo thí & Phân tích chất lượng (`/api/testing/...`) gặp lỗi HTTP 500 do giả lập lỗi dịch vụ, trong khi các module Dự giờ (`/api/observations`) và Cố vấn học tập (`/api/advisory`) vẫn hoạt động bình thường.
- **Mục tiêu:** Kiểm chứng tính độc lập và khả năng cách ly lỗi của kiến trúc React Error Boundary và Module Segregation.

---

## 2. QUAN SÁT THỰC TẾ TRÊN GIAO DIỆN
- **Trang Dashboard tổng hợp:**
  - Widget "Thống kê Khảo thí" hiển thị fallback component: *"Không thể tải dữ liệu khảo thí lúc này. Nhấn để thử lại."*
  - Toàn bộ các widget khác (Dự giờ, Hoạt động trải nghiệm, Chỉ số chuyên cần) vẫn hiển thị và tương tác 100% bình thường.
  - Phiên đăng nhập của người dùng hoàn toàn không bị ảnh hưởng.
- **Khôi phục (Frontend Recovery):**
  - Sau khi dịch vụ API khảo thí phục hồi, người dùng chỉ cần nhấn nút "Thử lại" ngay tại widget bị lỗi; widget lập tức tải lại dữ liệu mà không cần tải lại toàn bộ trang (F5).
- **Đánh giá:** **100% PASS** (Đạt chuẩn cô lập lỗi phân hệ).
