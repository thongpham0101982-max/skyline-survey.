# 10. ĐẢM BẢO HIỂN THỊ ĐA THIẾT BỊ (RESPONSIVE QA)
## KIỂM THỬ GIAO DIỆN TỪ LAPTOP 1366x768 ĐẾN THIẾT BỊ DI ĐỘNG

---

### 1. Màn hình Laptop tiêu chuẩn (1366x768 & 1920x1080)
- **Kết quả kiểm thử**: Đạt chuẩn UX công việc hành chính.
- Bảng Roster tự động ghim (`sticky`) cột Thông tin học sinh bên trái với `bg-white` và `z-10`, có đổ bóng ngăn cách nhẹ khi cuộn ngang.
- Các cột tiêu chí co giãn linh hoạt, không bị vỡ bố cục khi màn hình có độ phân giải 1366x768.

### 2. Màn hình Tablet (iPad 768px - 1024px)
- Bảng hiển thị chế độ cuộn ngang mượt mà (`overflow-x-auto` với touch scroll).
- Nút bấm và Dropdown có kích thước cảm ứng đạt chuẩn tối thiểu 36x36px.

### 3. Màn hình Di động (Mobile < 768px)
- Chế độ Mobile Roster: Chuyển đổi từ dạng bảng sang dạng danh sách thẻ học sinh (Card view).
- Thẻ học sinh hiển thị nhanh: Ảnh đại diện, Tên, Nút điểm danh nhanh 1 chạm và Huy hiệu kết quả tóm tắt.
- Chế độ chấm điểm tiêu chí chi tiết trên điện thoại mở dưới dạng Bottom Drawer tiện lợi khi di chuyển ngoài trời.
