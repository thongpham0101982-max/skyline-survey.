# 12. KIỂM THỬ KHÔNG THOÁI HÓA DỮ LIỆU (DATA REGRESSION)
## BẢO TOÀN DỮ LIỆU LỊCH SỬ VÀ HỒ SƠ 360°

---

### 1. Bảo tồn dữ liệu hiện hữu
- **Cam kết an toàn tuyệt đối**: Không thay đổi cấu trúc bảng cơ sở dữ liệu `ActivityRecord`, `ActivityParticipant` và `StudentProjectExperience`.
- **Tương thích ngược**: Các bản ghi dự án trải nghiệm đã nhập từ trước Wave 4 vẫn hiển thị chính xác và đầy đủ trong Hồ sơ học sinh 360°.

### 2. Ánh xạ dữ liệu lịch sử
- Với các bản ghi cũ chưa có phân rã tiêu chí rubric, hệ thống tự động nhận diện giá trị `result` tổng hợp (Đạt/Tốt/Xuất sắc) để render badge tương ứng mà không báo lỗi thiếu dữ liệu thành phần.
- Tên vai trò tự do trước đây được ánh xạ hiển thị mềm dẻo qua cơ chế Fallback Text.
