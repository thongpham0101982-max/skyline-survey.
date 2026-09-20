# 05. QUẢN LÝ PHÂN CÔNG (CLASS & EVALUATOR ASSIGNMENT)
## CƠ CHẾ PHÂN BỔ ĐỐI TƯỢNG VÀ NGƯỜI ĐÁNH GIÁ

---

### 1. Phân bổ đối tượng tham gia
Hoạt động trải nghiệm hỗ trợ 3 cơ chế phân bổ:
1. **Phân bổ theo Lớp (Class-based)**: Quản lý chọn các lớp tham gia từ bảng danh sách lớp theo Cơ sở và Khối. Toàn bộ học sinh đang hoạt động trong lớp sẽ tự động được đưa vào danh sách tham gia.
2. **Phân bổ theo Khối / Toàn trường (Bulk Campus/Grade)**: Áp dụng cho các sự kiện lớn (Ngày hội STEM, Hội trại toàn trường). Hệ thống tự sinh bản ghi tham gia cho tất cả các lớp thuộc khối/cơ sở được chọn.
3. **Phân bổ theo Câu lạc bộ / Đội tuyển (Group/Club)**: Áp dụng cho các dự án chuyên sâu, học sinh đăng ký tự do từ nhiều lớp khác nhau.

### 2. Phân công người đánh giá (Evaluator Assignment)
- **Mặc định tự động**: Khi gán lớp vào hoạt động, GVCN hiện tại của lớp đó được hệ thống tự động gán làm **Người đánh giá chính** (Primary Evaluator).
- **Đồng đánh giá (Co-Evaluator)**: Đối với các hoạt động chuyên môn (Khoa học, Nghệ thuật, Thể thao), Quản lý có thể chỉ định thêm Giáo viên bộ môn hoặc Cán bộ Đoàn Đội làm đồng giám khảo.
- **Trạng thái phân công của lớp**:
  - `NOT_STARTED` (Chưa đánh giá): Lớp đã được phân công nhưng chưa có thao tác điểm danh/chấm điểm.
  - `IN_PROGRESS` (Đang đánh giá): Đã lưu nháp một phần kết quả.
  - `COMPLETED` (Đã hoàn tất): Toàn bộ học sinh trong lớp đã được chấm và nộp bảng điểm.
