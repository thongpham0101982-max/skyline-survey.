# 10. ERROR TRACKING, TRIAGE & RUNTIME BOUNDARIES

---

## 1. CHIẾN LƯỢC PHÒNG VỆ VÀ RÀO CHẮN LỖI (REACT ERROR BOUNDARIES)
Hệ thống triển khai mô hình phòng vệ 3 cấp độ (Hierarchical Error Boundaries):
1. **Root Global Boundary (`src/app/global-error.tsx`):** Bảo vệ toàn bộ ứng dụng khi lỗi hệ thống nghiêm trọng, hiển thị trang fallback thân thiện và nút "Tải lại trang an toàn".
2. **Layout Route Boundary (`src/app/(dashboard)/error.tsx`):** Cách ly lỗi trong phân hệ dashboard, không làm ảnh hưởng đến session đăng nhập của người dùng.
3. **Module-level Boundary (Component Widgets):** Lỗi tại một widget báo cáo không làm treo toàn bộ trang tổng quan.

---

## 2. QUY TRÌNH PHÂN LOẠI & XỬ LÝ SỰ CỐ (ERROR TRIAGE)
Mọi exception chưa xử lý đều được gán mã nhận diện `errorId` duy nhất và hiển thị cho người dùng để họ cung cấp cho bộ phận hỗ trợ IT:
- **Triage Bước 1:** Tra cứu `errorId` trong log tập trung để lấy stack trace đầy đủ.
- **Triage Bước 2:** Xác định module nguồn và mức độ nghiêm trọng (P1 - P4).
- **Triage Bước 3:** Phân bổ cho nhóm chuyên trách sửa lỗi theo SLA.
