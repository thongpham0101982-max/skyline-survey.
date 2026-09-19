# SSM PILOT: ISSUES FOUND & RESOLUTION REPORT
**Phân hệ:** Dự giờ và Phát triển Chuyên môn  

---

## 1. DANH MỤC CÁC VẤN ĐỀ ĐÃ XỬ LÝ TRONG PILOT

1. **ISSUE-01 (P0 - Resolved):** Modal đánh giá 11 tiêu chí K12 bị trôi nút Lưu trên laptop 1366x768.  
   *Xử lý:* Cấu trúc lại Dialog với Sticky Header + Sticky Footer và scrollable container.
2. **ISSUE-02 (P0 - Resolved):** Bảng ma trận 12 tháng TTCM bị trôi mất cột Tên giáo viên khi cuộn ngang.  
   *Xử lý:* Áp dụng `sticky left-0 bg-white z-10 shadow-xs` cho cột Họ tên giáo viên.
3. **ISSUE-03 (P1 - Resolved):** Thiếu chế độ xem nhanh chi tiết tiết dạy mà không rời trang danh sách.  
   *Xử lý:* Khởi tạo component `ObservationDetailDrawer.tsx` trượt từ cạnh phải.
4. **ISSUE-04 (P1 - Resolved):** Màu sắc badge và buttons chưa đồng nhất thương hiệu Sky-Line.  
   *Xử lý:* Tích hợp tokens Deep Pine `#003B3A` và `<StatusBadge />` vào toàn bộ bảng danh sách.
