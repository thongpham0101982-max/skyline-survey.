# SSM RESPONSIVE SPECIFICATION
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Phạm vi:** Điểm ngắt màn hình, Chiến lược hiển thị trên Laptop giáo viên và iPad  

---

## 1. THANG ĐIỂM NGẮT (BREAKPOINTS)

- `sm`: `640px` (Điện thoại thông minh màn hình ngang)
- `md`: `768px` (Máy tính bảng / iPad dọc)
- `lg`: `1024px` (**Màn hình Laptop giáo viên chuẩn: 1024px - 1366px**)
- `xl`: `1280px` (Laptop màn hình lớn)
- `2xl`: `1536px` (Màn hình Desktop văn phòng Full HD)

---

## 2. CHIẾN LƯỢC TỐI ƯU HÓA TRỌNG TÂM: LAPTOP 1366X768

Do đa số phòng học và bàn làm việc giáo viên Sky-Line trang bị máy tính xách tay độ phân giải 1366x768:
1. **Modal chống Clipping:** Khống chế chiều cao tối đa của Modal Body ở mức `max-h-[calc(85vh-130px)]` và ghim chặt Header & Footer.
2. **Horizontal Table Scroll:** Các bảng ma trận 12 tháng bắt buộc ghim cột Họ tên bên trái (`sticky left-0 bg-white z-10`).
3. **Smart Tab Overflow:** Các thanh tab dài (như 9 tabs Hồ sơ học sinh) không để ngắt thành 2 dòng mà sử dụng thanh cuộn ngang mượt mà có mũi tên điều hướng.
