# 06. THIẾT KẾ TRẢI NGHIỆM ĐÁNH GIÁ TẬP TRUNG (ROSTER UX)
## TỐI ƯU HÓA THAO TÁC CHO GIÁO VIÊN ĐÁNH GIÁ LỚP 30-40 HỌC SINH

---

### 1. Vấn đề cốt lõi của UX cũ
- Giáo viên phải mở từng học sinh trong dialog popup để chấm điểm. Với 40 học sinh, phải thực hiện hơn 120 lần click chuột và chờ đợi load lại trang.
- Không thể nhìn thấy bức tranh tổng quan phân bổ điểm của cả lớp để cân đối.
- Dễ bị mất dữ liệu khi mất kết nối mạng.

### 2. Thiết kế bảng Compact Editable Roster (SSM Design System)
- **Sticky Column**: Cột STT, Họ và tên học sinh, Mã HS được cố định bên trái (`sticky left-0`) giúp giáo viên luôn nhận biết học sinh khi cuộn ngang trên màn hình laptop nhỏ (1366x768).
- **Thanh công cụ tác vụ nhanh (Quick Action Bar)**:
  - Nút `1-Click Điểm danh toàn bộ Có mặt` (Fast Attendance).
  - Nút `Gán vai trò mặc định (Thành viên)`.
  - Nút `Lưu nháp` và `Nộp kết quả chính thức`.
  - Bộ đếm tiến độ thời gian thực: `Đã đánh giá: X / Y học sinh`.
- **Inline Evaluation Cells**:
  - Cell Điểm danh: Nút chuyển đổi nhanh `Có mặt / Đi trễ / Vắng`.
  - Cell Vai trò: Dropdown gọn nhẹ với badge màu ngữ nghĩa rõ ràng.
  - Cell Tiêu chí: Ô nhập điểm nhanh hoặc bộ chọn mức độ 4 nấc (`X / T / Đ / C`).
  - Cell Kết quả: Tự động tính và render Badge kết quả ngay lập tức (Không cần reload).
  - Cell Nhận xét: Ô input inline có mở rộng khi focus và danh sách câu gợi ý nhanh.
- **Bàn phím hỗ trợ (Keyboard Navigation)**:
  - Nhấn `Enter` hoặc `Mũi tên xuống` để nhảy sang học sinh tiếp theo.
  - Nhấn `Tab` để di chuyển sang tiêu chí tiếp theo của cùng học sinh.
- **Auto-Save & Feedback**: Tự động lưu nháp cục bộ (Local draft debounce 500ms), thông báo trực quan trạng thái lưu an toàn.
