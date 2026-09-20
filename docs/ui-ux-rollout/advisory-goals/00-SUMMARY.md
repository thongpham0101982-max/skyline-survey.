# WAVE 2: CỐ VẤN HỌC TẬP & MỤC TIÊU HỌC SINH (EXECUTIVE SUMMARY)
## Khung Triển Khai Chuẩn Hóa Quản Trị Mục Tiêu và Phân Tích GAP Sky-Line

---

### 1. TỔNG QUAN & MỤC TIÊU CỐT LÕI

Phân hệ **Cố vấn học tập & Mục tiêu học sinh** đóng vai trò là "Trục la bàn định hướng" (Compass & GPS) trong hành trình phát triển của từng học sinh Sky-Line. Hệ thống tạo ra một chu trình khép kín:

```
Học sinh thiết lập mục tiêu (Goal Setting)
        ↓
Giáo viên Chủ nhiệm / Cố vấn học tập theo dõi định kỳ
        ↓
Kết quả học tập thực tế (MOET / KSCL / Thi chuẩn hóa) được cập nhật
        ↓
Hệ thống tính toán khoảng cách GAP tự động (Target - Current)
        ↓
Theo dõi diễn biến tiến độ (Trend) qua các cột mốc
        ↓
Gửi yêu cầu điều chỉnh mục tiêu nếu cần (Adjustment Workflow)
        ↓
Đồng bộ một chiều vào Hồ sơ học sinh 360° (Single Source of Truth)
```

**Mục tiêu UX/UI trọng tâm:**
* **Giao diện Học sinh:** Tối giản, trực quan, thân thiện (ngôn ngữ: *"Mục tiêu của em"*, *"Tiến độ của em"*, *"Khoảng cách cần nỗ lực"*), thao tác hoàn hảo trên điện thoại di động (Mobile-friendly).
* **Giao diện Quản lý (GVCN / Cố vấn / BGH):** Đậm đặc thông tin, lọc theo lớp/khối, xem nhanh tiến độ toàn lớp và phát hiện sớm các học sinh có GAP lớn cần can thiệp.
* **Chuẩn hóa Phân tích Môn học (Subject Normalization):** Tách bạch `raw_input` nguyên bản với `canonical_subject` và `subject_id` để kết nối dữ liệu chính xác, không tự suy diễn các trường hợp đa nghĩa (ambiguous).
* **Tính toán GAP Nhất quán:** Công thức tập trung `GAP = Target - Current`, không tạo mã lỗi `NaN` hoặc `undefined`.
* **Quy trình Phê duyệt Khắt khe:** Học sinh không được tự tiện sửa phiếu đã chốt; bắt buộc qua quy trình *"Xin mở phiếu điều chỉnh"* được GVCN/BGH phê duyệt.

---

### 2. KẾT QUẢ ĐẠT ĐƯỢC TRONG WAVE 2

1. **Dịch vụ Chuẩn hóa Môn học Tập trung (`src/lib/advisory/subjectNormalization.ts`):**
   * Xử lý chính xác 16 bộ môn chuẩn K12 (Toán, Ngữ văn, Tiếng Anh, Vật lí, Hóa học, Sinh học, KHTN, Lịch sử, Địa lí, Tin học, GDCD...).
   * Parse an toàn các biến thể điểm số: `7.5`, `7,5`, `8`, `8.0` (thang điểm 0 - 10).
   * Cơ chế cảnh báo *"Cần xác nhận môn học"* cho các câu nhập đa môn hoặc không rõ nghĩa.
2. **Dịch vụ Tính toán GAP & Tiến độ Chuẩn (`src/lib/advisory/advisoryGapService.ts`):**
   * Xác định đúng kỳ đánh giá (`KSCL`, `GK1`, `CK1`, `GK2`, `CK2`).
   * Hiển thị chuỗi tiến trình rút gọn (Compact Trend): `6.0 → 6.7 → 7.2 → Target 8.0`.
   * Đánh giá tiến độ mục tiêu phi môn học (Sức khỏe, sở thích, thói quen, phẩm chất...) theo mức hoàn thành Rubric.
3. **Thư viện Giao diện Chuẩn hóa SSM:**
   * `<SubjectGapTable>`: Bảng theo dõi GAP và diễn biến điểm số trực quan.
   * `<StudentGoalCard>`: Thẻ mục tiêu cá nhân hiển thị tiến độ và trọng số nhóm.
   * `<AdjustmentRequestPanel>`: Khung gửi yêu cầu xin mở phiếu điều chỉnh kèm hộp thoại Dialog chống bấm nhầm.
4. **Bảo tồn 100% An Toàn Kiến Trúc:**
   * Không sửa đổi Database Schema, API contracts, RBAC hoặc dữ liệu lịch sử.\n