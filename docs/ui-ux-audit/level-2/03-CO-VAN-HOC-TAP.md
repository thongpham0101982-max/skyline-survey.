# SSM LEVEL-2 AUDIT: CỐ VẤN HỌC TẬP & CAN THIỆP HỌC ĐƯỜNG
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Phân hệ trọng điểm:** Quản lý đợt Cố vấn (Sprints), Cảnh báo SOS, Nhật ký phỏng vấn 1-1, Rubric mục tiêu  
**Đơn vị thực hiện Audit:** Antigravity UI/UX Pro Max Engine  
**Trạng thái mã nguồn:** READ-ONLY (Không can thiệp logic, DB hay source code)

---

## 1. TỔNG QUAN PHÂN HỆ VÀ QUY MÔ MÃ NGUỒN

Phân hệ **Cố vấn Học tập (Academic Advisory)** là nét đặc trưng riêng biệt trong mô hình giáo dục Sky-Line, nơi thầy cô đồng hành cá nhân hóa cùng từng học sinh nhằm định hướng học tập, tâm lý và kỹ năng.

### Thống kê khối lượng mã nguồn giao diện:
- `src/app/teacher/co-van-hoc-tap/page.tsx`: **4,365 dòng** (Monolith client khổng lồ quản lý tất cả trạng thái).
- `src/app/admin/co-van-hoc-tap/`: Hệ thống cấu hình đợt cố vấn, chỉ tiêu và phê duyệt gia hạn.
- **Đánh giá tải nhận thức (Cognitive Load):** **Mức độ Rất cao (Extreme Overload)**. Toàn bộ các tác vụ: xem đợt, phân loại học sinh, nhập biên bản, đánh giá mục tiêu, gửi yêu cầu mở khóa đều nhồi nhét trên cùng 1 trang không có phân tách ngữ cảnh rõ ràng.

---

## 2. BẢNG PHÂN TÍCH LỖI VÀ VẤN ĐỀ TRẢI NGHIỆM CHI TIẾT (ISSUE MATRIX)

| Mã ID | Vị trí Source Code | Mô tả vấn đề | Mức độ | Tác động người dùng | Giải pháp đề xuất UI/UX Pro Max |
|---|---|---|---|---|---|
| **CV-P0-01** | `teacher/co-van-hoc-tap/page.tsx:1800-2400` | Form ghi nhận phiên phỏng vấn cố vấn (Consultation Notes Dialog) không có Auto-save; click ngoài backdrop làm mất trắng biên bản. | **P0 (Critical)** | Giáo viên mất nội dung biên bản dài hàng trăm chữ khi đang phỏng vấn học sinh/phụ huynh. | Thiết lập Auto-save vào LocalStorage theo từng ký tự gõ; khóa backdrop không cho đóng modal khi có thay đổi chưa lưu (`dirty state alert`). |
| **CV-P0-02** | `teacher/co-van-hoc-tap/page.tsx:350-580` | Cảnh báo SOS (Tâm lý / Sa sút học tập / Nguy cơ lưu ban) chỉ là một Badge màu đỏ nhỏ xíu trong danh sách lớp 35-40 em. | **P0 (Critical)** | Giáo viên dễ bỏ sót các trường hợp khẩn cấp cần can thiệp tâm lý ngay lập tức. | Tạo khu vực riêng trên đầu trang: `High-Priority SOS Triage Board` với visual viền đỏ nhấp nháy nhẹ và nút hành động khẩn `Xem & Can thiệp ngay`. |
| **CV-P1-01** | Toàn bộ trang cố vấn | Thiếu kết nối trực tiếp với Hồ sơ học sinh (Điểm danh, Điểm số, Thể chất). | **P1 (High)** | Giáo viên phải mở song song 2-3 tab trình duyệt để vừa tra điểm vừa cố vấn. | Tích hợp Drawer trượt từ bên phải màn hình: `Quick Student Context Drawer` hiển thị tóm tắt điểm số & chuyên cần ngay trong màn hình cố vấn. |
| **CV-P1-02** | `page.tsx:2800-3300` | Đánh giá Rubric mục tiêu học tập (Goal Rubrics) có quá nhiều radio buttons và trường nhập vụn vặt. | **P1 (High)** | Mất 15-20 phút cho một học sinh, làm nản lòng giáo viên cố vấn. | Thiết kế lại dạng Card lựa chọn nhanh (Preset templates: Học lực khá -> Giỏi, Rèn luyện sự tự tin, Khắc phục điểm Toán). |
| **CV-P2-01** | `page.tsx:120-280` | Bộ chọn Đợt cố vấn (Sprint Checkpoints: Giữa HK1, Cuối HK1, Giữa HK2, Cuối HK2) hiển thị dạng dropdown tĩnh khó hình dung tiến độ thời gian. | **P2 (Medium)** | Khó nhận biết đợt nào đang diễn ra, đợt nào đã khóa, đợt nào sắp mở. | Chuyển thành Horizontal Sprint Timeline Bar với trạng thái: `[Đã khóa] -> [Đang mở (Còn 3 ngày)] -> [Sắp tới]`. |

---

## 3. CẤU TRÚC PHÂN LOẠI CẢNH BÁO HỌC SINH (TRIAGE SYSTEM)

Hiện tại hệ thống chỉ gắn cờ nhị phân (Có SOS / Không SOS). Cần nâng cấp thành hệ thống phân tầng cảnh báo 4 cấp độ trực quan:

```
[ CẤP 1: BÌNH THƯỜNG (GREEN) ]   ── Đạt chỉ tiêu mục tiêu, không có vấn đề chuyên cần.
[ CẤP 2: CẦN THEO DÕI (YELLOW) ]  ── Điểm kiểm tra giảm sút >1.5 điểm hoặc nghỉ học 2-3 buổi.
[ CẤP 3: CẦN CAN THIỆP (ORANGE) ] ── Học lực dưới trung bình 2 môn cốt lõi, vi phạm nề nếp.
[ CẤP 4: NGUY CƠ KHẨN CẤP (RED) ] ── Dấu hiệu trầm cảm, bạo lực học đường, nguy cơ bỏ học.
```

---

## 4. THIẾT KẾ ĐỀ XUẤT NÂNG CẤP (PROPOSED WIREFRAME)

### Bố cục 3 Phân vùng (3-Pane Advisory Workspace)

```
+----------------------------------------------------------------------------------------------------+
| CỐ VẤN HỌC TẬP - LỚP 10A1 (NĂM HỌC 2026-2027)                      [+ Ghi nhận ca tư vấn đột xuất] |
| TIẾN ĐỘ ĐỢT: [● Giữa HK1: Hoàn thành] ── [★ Cuối HK1: Đang diễn ra (Còn 4 ngày)] ── [○ Giữa HK2]    |
+------------------------------------+----------------------------------+----------------------------+
| CỘT 1: DANH SÁCH HỌC SINH (320px)   | CỘT 2: TIẾN TRÌNH & BIÊN BẢN (50%)| CỘT 3: CONTEXT DRAWER (30%)|
+------------------------------------+----------------------------------+----------------------------+
| [ Lọc: Tất cả (35) | SOS (2) ]     | EM: NGUYỄN HOÀNG PHÚC - LỚP 10A1 | TÓM TẮT HỌC SINH PHÚC      |
|                                    | Đợt: Cuối HK1 (Lần tư vấn thứ 3) | ĐTB hiện tại: 6.2 (Giảm)   |
| [!] NGUYỄN HOÀNG PHÚC  [SOS ĐỎ]    |                                  | Vắng có phép: 3 buổi       |
|     Điểm Toán giảm mạnh (4.5)      | 1. ĐÁNH GIÁ MỤC TIÊU HK1:        | Vắng không phép: 1 buổi    |
|                                    | Mục tiêu: Đạt 7.0 Toán -> [CHƯA] |                            |
| [!] LÊ THỊ BÍCH NGỌC   [CẢNH BÁO]  |                                  | Môn cần lưu ý:             |
|     Nghỉ học liên tiếp 3 ngày      | 2. NỘI DUNG TRAO ĐỔI PHỎNG VẤN:  | - Toán: 4.5 (Kiểm tra 1T)  |
|                                    | +------------------------------+ | - Tiếng Anh: 8.5 (Tốt)     |
| [✓] TRẦN MINH ĐỨC      [BÌNH THƯỜNG]| | HS chia sẻ gặp khó khăn phần  |                            |
|     Tiến độ mục tiêu: 100%         | | hình học không gian, gia đình| | Lịch sử cố vấn gần nhất:   |
|                                    | | mới chuyển nhà...            | | 15/09: Đặt mục tiêu năm    |
| [✓] PHẠM VĂN ANH       [BÌNH THƯỜNG]| +------------------------------+ | 12/10: Nhắc nhở nề nếp     |
|     Tiến độ mục tiêu: 90%          | [Tự động lưu nháp 14:32:05 ✓]    |                            |
|                                    |                                  | PHỤ HUYNH:                 |
| ...                                | 3. KẾ HOẠCH HÀNH ĐỘNG TIẾP THEO: | Bố: 0905.123.456 (Anh Hải) |
|                                    | [X] Kèm đôi bạn học tập môn Toán |                            |
|                                    | [X] Gặp trao đổi riêng phụ huynh | [Xem toàn bộ Hồ sơ 360° →] |
+------------------------------------+----------------------------------+----------------------------+
| [Thống kê lớp: 28 Đã xong / 5 Đang chờ / 2 SOS]                       | [Lưu nháp] [Lưu & Chốt đợt]|
+-----------------------------------------------------------------------+----------------------------+
```

---

## 5. LỘ TRÌNH TRIỂN KHAI

1. **Sprint 1 (An toàn dữ liệu & Cảnh báo SOS):**
   - Đưa Auto-save LocalStorage vào Consultation Form.
   - Thiết kế Banner / Triage Section riêng biệt trên đầu trang cho học sinh SOS.
2. **Sprint 2 (Phân rã Monolith & Context Drawer):**
   - Tách file `page.tsx` 4,365 dòng thành 5 modules chuyên trách:
     - `AdvisorySprintBar.tsx`
     - `AdvisoryStudentQueue.tsx`
     - `AdvisorySessionEditor.tsx`
     - `AdvisoryStudentQuickContext.tsx`
     - `AdvisoryExtensionRequestModal.tsx`
