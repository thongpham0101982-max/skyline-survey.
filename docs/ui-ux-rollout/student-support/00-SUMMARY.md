# WAVE 3: THEO DÕI HỖ TRỢ HỌC TẬP & TÂM LÝ HỌC SINH (EXECUTIVE SUMMARY)
## Khung Triển Khai Chuẩn Hóa Quản Trị Tiến Trình Hỗ Trợ và Can Thiệp Sky-Line

---

### 1. TỔNG QUAN & MỤC TIÊU CỐT LÕI

Phân hệ **Theo dõi Hỗ trợ Học tập & Tâm lý học đường (Wave 3)** giữ vai trò đặc biệt nhân văn và trọng yếu trong hệ thống SSM. Không đơn thuần là bảng nhập liệu, phân hệ này được thiết kế theo trục **Dòng thời gian (Timeline-centric)** để theo sát toàn bộ hành trình đồng hành cùng học sinh:

```
Nhận diện đối tượng (Đầu vào / Đề xuất GV / Tâm lý)
        ↓
Phân công nhân sự phụ trách chính & người phối hợp
        ↓
Ghi nhận diễn biến theo tuần (Weekly Follow-up)
        ↓
Đánh giá định kỳ theo tháng (Monthly Review)
        ↓
Quyết định: Tiếp tục / Điều chỉnh kế hoạch / Đề xuất chấm dứt
        ↓
Tổng kết cuối năm học (Year-End Review)
        ↓
Tự động chuyển tiếp năm sau nếu còn theo dõi (Trừ HS chuyển trường)
        ↓
Đồng bộ trạng thái tổng quan sang Hồ sơ học sinh 360° (Bảo mật cao)
```

**Các câu hỏi quản trị hệ thống giải quyết trọn vẹn:**
* *Học sinh nào đang được theo dõi?* $ightarrow$ Danh sách phân loại rõ `Hỗ trợ học tập` vs `Theo dõi tâm lý`.
* *Vì sao theo dõi & từ khi nào?* $ightarrow$ Hiển thị rõ nguồn gốc (`Khảo sát đầu vào`, `Chuyển tiếp năm trước`, `Đề xuất GVCN`) và ngày bắt đầu.
* *Ai phụ trách & đã theo dõi bao lâu?* $ightarrow$ Hiển thị giáo viên phụ trách chính, số tuần/tháng đã can thiệp.
* *Tiến triển ra sao & lần đánh giá gần nhất?* $ightarrow$ Trục Timeline trực quan ghi nhận chi tiết tuần và tháng.
* *Có tiếp tục không & khi nào kết thúc?* $ightarrow$ Khung quyết định nghiệp vụ rõ ràng, không dùng nút bấm mơ hồ.
* *Năm học sau có tiếp tục theo dõi không?* $ightarrow$ Tự động chuyển tiếp (Auto Carry Forward) theo quy tắc chuẩn.

---

### 2. KẾT QUẢ ĐẠT ĐƯỢC TRONG WAVE 3

1. **Dịch vụ Theo dõi & Dòng thời gian (`src/lib/support/supportTrackingService.ts`):**
   * Xây dựng cấu trúc sự kiện Timeline liên tục từ ngày khởi tạo đến các phiên đánh giá và kết thúc.
   * Ánh xạ trạng thái sang bảng màu Semantic SSM (`Mới tạo`, `Đang theo dõi`, `Cần chú ý`, `Tiếp tục`, `Đã chấm dứt`).
   * Kiểm soát quy tắc chuyển tiếp năm học tự động và loại trừ học sinh chuyển trường.
2. **Bộ Giao diện Chuẩn hóa SSM (`src/components/support/`):**
   * `<StudentSupportHeader>`: Khung thông tin học sinh, loại hỗ trợ, nguồn gốc, thời gian và phụ trách.
   * `<TrackingTimeline>`: Trục thời gian trực quan thay thế hoàn toàn bảng nhập điểm khô cứng.
   * `<WeeklyFollowUpCard>`: Thẻ ghi nhận tuần ngắn gọn, tập trung quan sát và kế hoạch hành động.
   * `<MonthlyReviewCard>`: Thẻ đánh giá tháng tổng thể, nhận định khó khăn và kết luận của hội đồng.
   * `<ContinuationPanel>`: Khung quyết định định kỳ (`Tiếp tục`, `Điều chỉnh`, `Đề xuất chấm dứt`).
   * `<YearTransitionBadge>`: Huy hiệu nhận diện nguồn gốc chuyển tiếp từ năm trước hoặc khảo sát đầu vào.
3. **Bảo mật & Quyền Riêng Tư (Privacy by Design):**
   * Tách bạch 3 cấp độ: `Summary`, `Operational detail`, `Sensitive notes`.
   * Ghi chú tâm lý nhạy cảm tuyệt đối không hiển thị ở bảng chung, dashboard, notification hoặc export mặc định.
4. **Bảo tồn Tuyệt đối Kiến trúc:**
   * Không sửa đổi Database Schema, API contract `/api/ktdbcl/support`, RBAC hoặc dữ liệu lịch sử.\n