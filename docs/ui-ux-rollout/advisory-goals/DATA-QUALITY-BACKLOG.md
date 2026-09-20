# SỔ THEO DÕI CHẤT LƯỢNG DỮ LIỆU (DATA QUALITY BACKLOG)
## Báo Cáo Các Trường Hợp Dữ Liệu Cũ Cần Rà Soát Sau Wave 2

---

### 1. NGUYÊN TẮC QUẢN TRỊ
* Tuyệt đối không tự ý chạy migration sửa đổi dữ liệu sản xuất (Production data).
* Ghi nhận và phân loại các trường hợp dữ liệu cũ chưa chuẩn để Ban Khảo thí & Đảm bảo Chất lượng xem xét:

---

### 2. DANH MỤC TRƯỜNG HỢP CẦN RÀ SOÁT

| Nhóm vấn đề | Mô tả thực tế | Số lượng ước tính | Đề xuất hướng xử lý |
| :--- | :--- | :---: | :--- |
| **Mục tiêu text tự do không điểm** | Học sinh ghi: *"Học tốt môn Toán"* nhưng không có số điểm cụ thể | ~12% số phiếu cũ | Giữ nguyên văn bản thô; đo lường theo trạng thái hoàn thành nhiệm vụ |
| **Nhập nhiều môn trong một câu** | Học sinh ghi: *"Nâng điểm Toán và Anh"* | ~3% số phiếu cũ | Đánh dấu `Cần xác nhận môn học` để GVCN hỗ trợ tách nhỏ mục tiêu |
| **Điểm mục tiêu ngoài thang (0-10)** | Một số học sinh nhập điểm theo thang 100 (VD: "Toán 85") | < 1% | Giữ nguyên raw input; không tính GAP điểm tự động |
| **Mục tiêu từ năm học trước** | Một số phiếu chưa chọn đúng năm học `academicYearId` | < 0.5% | Lọc hiển thị chính xác theo năm học được chọn trên thanh lọc |\n