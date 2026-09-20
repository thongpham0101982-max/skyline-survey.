# 13. BẢO ĐẢM HIỆU NĂNG DASHBOARD (PERFORMANCE ARCHITECTURE)
## TẢI NHANH, BATCHING VÀ TRÁNH REQUEST WATERFALL

---

### 1. Kiến trúc Tối ưu hóa
- **Initial meaningful view < 2 giây**: Giao diện shell, thẻ KPI chính và Action Center được tải ngay lập tức.
- **Tránh Waterfall Requests**: Gom cụm các chỉ số thống kê trong Dashboard Summary API thay vì để từng thẻ card gọi một request độc lập (giảm từ 20+ requests xuống còn 1-2 requests tổng hợp).
- **Lazy Loading các phân khu sâu**: Các bảng phân tích chi tiết và biểu đồ phân bố phức tạp được trì hoãn tải sau màn hình đầu tiên (Above-the-fold).

### 2. Không lưu trữ Database vào LocalStorage
Tuân thủ nguyên tắc bảo mật, hệ thống không cache toàn bộ danh sách học sinh hay điểm số vào `localStorage` / `IndexedDB`.
