# STUDENT-360-INTEGRATION: ĐỒNG BỘ DỮ LIỆU HỒ SƠ 360°
## KẾT NỐI TOÀN DIỆN VÀO BỨC TRANH HỌC SINH

---

### 1. Vị trí hiển thị trên Hồ sơ học sinh 360°
Dữ liệu hoạt động trải nghiệm từ Wave 4 tự động kết nối vào 3 phân khu của Hồ sơ 360°:
1. **Tab Dự án & Hoạt động (Projects & Experiences)**:
   - Danh sách theo dòng thời gian các hoạt động học sinh đã tham gia.
   - Thẻ hoạt động hiển thị: Tên hoạt động, Học kỳ/Năm học, Vai trò học sinh, Điểm tổng kết, Xếp loại kết quả (Badge) và Lời nhận xét của giáo viên.
2. **Tab Năng lực & Phẩm chất (Skills & Competencies)**:
   - Điểm số các tiêu chí `Hợp tác`, `Sáng tạo`, `Kỷ luật` được tổng hợp vào biểu đồ Radar năng lực toàn diện của học sinh qua các năm học.
3. **Thống kê tổng hợp (Milestone & Badges)**:
   - Tổng số giờ trải nghiệm tích lũy trong năm.
   - Huy hiệu vinh danh các vai trò dẫn dắt (`Trưởng nhóm xuất sắc`, `Thành viên tích cực`).

### 2. Quy chuẩn luồng dữ liệu một chiều
Bảng `StudentProjectExperience` là nguồn dữ liệu chuẩn mực để Profile 360° đọc (`Read-only`). Mọi thao tác chỉnh sửa điểm số đều phải thực hiện thông qua module Hoạt động trải nghiệm để bảo đảm tính toàn vẹn của rubric và nhật ký đánh giá.
