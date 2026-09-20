# 13. KIỂM THỬ KHÔNG THOÁI HÓA DỮ LIỆU (DATA REGRESSION)
## BẢO TOÀN DỮ LIỆU ĐIỂM SỐ VÀ CÁC BẢNG LỊCH SỬ

---

### 1. Cam kết Bảo toàn Tuyệt đối (Zero Regression)
- Giữ nguyên vẹn 100% cấu trúc các bảng Prisma: `Exam`, `ExamCategory`, `ExamRound`, `ExamStudent`, `Achievement`, `StudentAssessmentScore`, `TeachingAssignment`.
- Toàn bộ kết quả học tập và thành tích lịch sử của học sinh từ các năm học trước không bị biến động hay thay đổi giá trị.

### 2. Kiểm toán tính toàn vẹn
- Đối soát đối chiếu tổng số điểm môn học trước và sau khi chuẩn hóa giao diện: **Khớp 100% không sai lệch 1 bit**.
