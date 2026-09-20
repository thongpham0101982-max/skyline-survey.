# WAVE 4 — QUẢN LÝ HOẠT ĐỘNG TRẢI NGHIỆM HỌC SINH (SSM)
## TỔNG QUAN VÀ MỤC TIÊU TRIỂN KHAI

---

### 1. Bối cảnh và Mục tiêu
Phân hệ **Quản lý Hoạt động Trải nghiệm** đóng vai trò hạt nhân trong việc đánh giá phẩm chất, năng lực toàn diện của học sinh theo định hướng giáo dục hiện đại. Tuy nhiên, trước Wave 4, quy trình quản lý hoạt động trải nghiệm gặp nhiều khó khăn:
- **Phân mảnh dữ liệu**: GVCN nhập dự án đơn lẻ qua form tự do, không có danh mục chuẩn hóa cấp trường/cơ sở.
- **Thao tác nặng nhọc cho giáo viên**: GVCN phải click từng học sinh để nhập vai trò và kết quả cho lớp 30-40 học sinh.
- **Tiêu chí đánh giá cảm tính**: Thiếu bộ rubric 3-5 tiêu chí cụ thể, dẫn đến việc đánh giá mang tính cào bằng ("Đạt" / "Tốt" không có căn cứ).
- **Mất kết nối với Hồ sơ 360°**: Dữ liệu hoạt động không phản ánh được điểm mạnh kỹ năng hay quá trình tham gia thực chất của học sinh.

### 2. Trụ cột giải pháp Wave 4 (SSM Design System Foundation)
1. **Quy trình chuẩn hóa 11 bước**: Từ khởi tạo hoạt động, cấu hình tiêu chí, phân công lớp, điểm danh, ghi nhận vai trò, chấm điểm rubric, tính kết quả tự động đến đồng bộ Hồ sơ 360°.
2. **Compact Bulk Evaluation Roster UX**: Thiết kế giao diện bảng đánh giá tập trung chuyên dụng cho GVCN, cho phép đánh giá cả lớp 40 học sinh trong vòng dưới 3 phút với phím tắt, điểm danh hàng loạt 1-click và tính điểm tự động.
3. **Mô hình Rubric 3-5 tiêu chí & Trọng số**: Chuẩn hóa thang đo năng lực (Thái độ, Hợp tác/Lãnh đạo, Đóng góp sản phẩm, Sáng tạo) kết hợp điểm cộng vai trò (Leader/Ban tổ chức).
4. **Tách biệt minh bạch 5 nhóm dữ liệu**:
   - `Điểm danh` (Có mặt, Đi trễ, Vắng có phép, Vắng không phép).
   - `Vai trò học sinh` (Trưởng nhóm, Phó nhóm, Thành viên, Hậu cần, Kỹ thuật).
   - `Đánh giá theo tiêu chí` (Thang điểm 1-10 hoặc 4 mức độ định tính).
   - `Kết quả tổng hợp tự động` (Xuất sắc, Tốt, Đạt, Chưa đạt kèm lý do).
   - `Nhận xét định tính` (Ghi nhận điểm mạnh & góp ý phát triển).
5. **Zero Data Regression**: Đảm bảo 100% tương thích ngược với bảng `ActivityRecord`, `ActivityParticipant` và `StudentProjectExperience` hiện hữu.

### 3. Kết quả bàn giao Wave 4
- Bộ UI primitives chuẩn hóa: `AttendanceCell`, `StudentRoleSelector`, `CriteriaEvaluationCell`, `ExperienceResultSummary`, `ExperienceRoster`, `ActivitySetupStepper`, `CriteriaBuilder`, `ClassAssignmentTable`.
- Service lõi tính toán kết quả: `activityEvaluationService.ts` với đầy đủ thuật toán trọng số, điểm phạt chuyên cần, điểm thưởng vai trò và tổng hợp lớp.
- Toàn bộ 19 tài liệu quy chuẩn kỹ thuật và kiểm thử.
