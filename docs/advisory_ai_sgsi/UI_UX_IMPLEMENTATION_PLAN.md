# TÀI LIỆU 8: KẾ HOẠCH VÀ ĐẶC TẢ GIAO DIỆN NGƯỜI DÙNG (UI/UX IMPLEMENTATION PLAN)
## Mã tài liệu: UI_UX_IMPLEMENTATION_PLAN.md | Phiên bản: 2.0 | Ngày: 20/10/2026

---

## 1. NGUYÊN TẮC THIẾT KẾ UI/UX CHUẨN SKY-LINE
1. **Không tạo gánh nặng nhập liệu:** Giảm thiểu thao tác gõ phím; ưu tiên chọn nhanh từ khóa (Tag pills), tự động điền sẵn thông tin cũ (Pre-filled), hoàn thành biên bản dưới 90 giây.
2. **Ngôn ngữ Thiết kế Nhất quán (Design Tokens):**
   - Màu chủ đạo: Xanh ngọc lục bảo sâu (`#003B3A`), Xanh ngọc lam (`#0A5C59`), Điểm nhấn vàng hổ phách (`#F59E0B`).
   - Bo góc mềm mại: Card (`rounded-2xl`), Container chính (`rounded-3xl`).
   - Trạng thái rõ ràng: Đỏ (`Rose-500` - Cần can thiệp gấp), Vàng (`Amber-500` - Cần lưu ý), Xanh (`Emerald-500` - Ổn định/Đạt tiến bộ).
3. **Phân cấp Thông tin Rõ ràng:** Số liệu quan trọng nhất (KPIs) đặt trên cùng, danh sách việc cần làm ngay ở giữa, lịch sử chi tiết ở dưới.

---

## 2. CHI TIẾT 3 TẦNG DASHBOARD CHUYÊN BIỆT

### 2.1. Tầng 1: Dashboard Học sinh (Student Growth View)
- **Khu vực 1 - Động lực Cá nhân:** Lời nhắn gửi động viên từ CVHT và Phụ huynh; Huy hiệu thành tích đạt được.
- **Khu vực 2 - Mục tiêu SMART Đang Chạy:** Hiển thị 2-3 mục tiêu trọng tâm học kỳ kèm thanh tiến độ hoàn thành (%).
- **Khu vực 3 - Danh sách Việc Nhỏ 7 Ngày (Micro-actions):** Các việc nhỏ cần làm trong tuần có checkbox đánh dấu hoàn thành nhanh.
- **Khu vực 4 - Chỉ số SGSI Cá nhân (Nếu đủ dữ liệu):** Biểu đồ đo lường mức độ tiến bộ so với chính mình qua các kỳ.

---

### 2.2. Tầng 2: Dashboard Cố vấn Học tập (Advisor Command Center)
Đã được hiện thực hóa tại component `MultiLevelAdvisoryDashboard.tsx`:
- **4 Thẻ Đo Lường Tức Thời (Top Metric Cards):**
  1. Tổng số học sinh phụ trách.
  2. Tỷ lệ học sinh đã chốt mục tiêu SMART (Thanh tiến độ màu Indigo).
  3. Tỷ lệ hoàn thành phiên cố vấn 1-1 kỳ này (Thanh tiến độ màu Emerald).
  4. Số việc quá hạn & Cảnh báo rủi ro (Hộp cảnh báo màu Rose nhấp nháy nhẹ).
- **Tab 1 - Học sinh Cần Can Thiệp Sớm (Priority Students):**
  - Danh sách sắp xếp theo độ ưu tiên: Cảnh báo Đỏ $\rightarrow$ Có việc quá hạn $\rightarrow$ Chưa nộp SMART $\rightarrow$ Chưa gặp 1-1.
  - Nút thao tác nhanh 1-click: `[Gặp 1-1]` mở ngay Modal phiên cố vấn; `[Hồ sơ 360]` xem toàn diện học sinh.
- **Tab 2 - Nhật ký Hành động Sau Phiên (Action Items Tracker):**
  - Theo dõi việc cần làm của cả lớp, lọc nhanh theo: *Quá hạn* | *Đang làm* | *Đã hoàn thành*.
  - Nút 1-click `[Xong]` để giáo viên xác nhận hoàn thành ngay trên bảng.

---

### 2.3. Tầng 3: Dashboard Cơ sở & Hệ thống (Executive Overview)
Dành cho Ban Giám đốc Cơ sở (GĐCS) và Ban KT&ĐBCL:
- **Bộ lọc đa tầng:** `[Toàn hệ thống / Cơ sở CS1..CS5] -> [Khối K1..K12] -> [Lớp] -> [Học kỳ]`.
- **Chỉ số Vận hành Quy trình Cố vấn:**
  - Tỷ lệ học sinh có mục tiêu hợp lệ toàn trường.
  - Tỷ lệ thực hiện cố vấn 1-1 đúng hạn theo tiến độ năm học.
  - Số ca can thiệp học thuật và hỗ trợ tâm lý đang được xử lý.
- **Phân bổ Chỉ số Tăng trưởng SGSI:**
  - Biểu đồ phân bổ tỷ lệ học sinh: *Tiến bộ Xuất sắc* (Teal), *Đạt Tiến bộ Tốt* (Emerald), *Cần Đồng hành* (Amber), *Nguy cơ* (Rose).
  - Bảng cảnh báo chất lượng dữ liệu: Liệt kê các lớp còn khuyết kỳ khảo sát hoặc chưa cập nhật check-in.
  - **Nguyên tắc nhân văn:** Không xếp hạng đối đầu giữa các cơ sở có đối tượng tuyển sinh khác nhau.

---

## 3. THIẾT KẾ MÀN HÌNH ĐẶC THÙ CHO AI ADVISOR VÀ PHIÊN 1-1

```
+-----------------------------------------------------------------------------------------+
| [BIÊN BẢN CỐ VẤN HỌC TẬP 1-1 SIÊU TỐC (<90s)]             [Trợ lý AI Advisor] [X]     |
+--------------------------------------------+--------------------------------------------+
| CỘT TRÁI: DỮ LIỆU & DẪN CHỨNG              | CỘT PHẢI: FORM GHI CHÉP NHANH              |
|                                            |                                            |
| 1. Chỉ số Tăng trưởng (SGSI): 84/100       | Ngày gặp: [ 20/10/2026 ]  Hình thức: (•)TT |
|    [Tiến bộ: 82] [Hỗ trợ: 85] [Quy trình: 90]|                                            |
|                                            | Khó khăn ghi nhận (Chọn nhanh):            |
| 2. Snapshot Kết quả Học tập:               | [+ Khó tập trung] [✓ Quản lý thời gian]   |
|    - Điểm TB các môn: 7.2 / 10             | [+ Áp lực điểm]   [+ Chưa nắm bài trên lớp]|
|    - Môn cần lưu ý (<6.0): [Toán: 5.2]     |                                            |
|    - Mốc KSCL đầu năm: Toán 7.0 | Anh 8.5  | Nội dung trao đổi & Thống nhất:            |
|                                            | [ Trao đổi phương pháp ôn tập chương 2 môn  |
| 3. Khung Gợi ý AI Advisor:                 |   Toán; hướng dẫn chia nhỏ bài tập về nhà  ] |
|    * 3 Câu hỏi gợi mở sư phạm              |                                            |
|      [ Câu 1: Em thấy khó nhất ở đâu? + ]  | Hành động tiếp theo (Giao cho Học sinh):    |
|      [ Câu 2: Mục tiêu 4 tuần tới là gì? +]| [ Làm lại 3 bài tập ví dụ trong SGK      ] |
|    * Kế hoạch hành động vi mô:             | Hạn chót: [ 24/10/2026 ]                   |
|      [ Gặp thầy giáo bộ môn ra chơi + ]    |                                            |
|                                            | [✓ Chuyển ca Hỗ trợ Phụ đạo nếu cần]       |
| 4. Phối hợp chuyên môn:                    |                                            |
|    [ Chuyển ca Hỗ trợ Học thuật / Tâm lý ] |                                            |
+--------------------------------------------+--------------------------------------------+
| Thời gian ghi chép trung bình: 60 - 90 giây           [ Hủy bỏ ]   [ HOÀN TẤT PHIÊN (✓) ]|
+-----------------------------------------------------------------------------------------+
```
