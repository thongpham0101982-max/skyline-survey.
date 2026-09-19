# SSM PILOT REMEDIATION PLAN: DỰ GIỜ & PHÁT TRIỂN CHUYÊN MÔN (PHASE 3)
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Phân hệ Thí nghiệm:** Đăng ký dự giờ, Phiếu đánh giá 11 tiêu chí K12, Ký duyệt hai chiều, Ma trận chuyên môn  
**Trạng thái Thực hiện:** PLANNING ONLY (READ-ONLY)

---

## 1. LÝ DO CHỌN DỰ GIỜ LÀM PHÂN HỆ THỬ NGHIỆM (PILOT)

Phân hệ **Dự giờ & Phát triển Chuyên môn** được lựa chọn làm phân hệ tiên phong cho đợt cải tổ UI/UX vì các lý do chiến lược sau:
1. **Độ phức tạp mã nguồn cao nhất:** Hơn **20,100 dòng mã client** trải dài trên nhiều file lớn (`du-gio/client.tsx`: 7,385 dòng, `ObservationRegistrationSection.tsx`: 2,366 dòng, `TTCMDepartmentSummaryTab.tsx`: 2,605 dòng, `admin/tong-hop-du-gio/client.tsx`: 5,931 dòng).
2. **Tập hợp đầy đủ mọi vai trò người dùng:** Chạm đến tất cả các cấp bậc trong nhà trường (GV, TTCM, QLCM, TBP, GĐCS, Admin).
3. **Chứa đựng các lỗi P0 điển hình nhất:** Mất nút lưu trong modal dài, mất dữ liệu gõ nhận xét, bảng ma trận trôi cột họ tên, bảng admin quá tải không ảo hóa.
4. **Hiệu quả thấy ngay (High Impact):** Khi giải quyết thành công phân hệ Dự giờ, công thức chuẩn hóa sẽ được áp dụng dễ dàng cho toàn bộ các phân hệ còn lại.

---

## 2. PHÂN TÍCH VÀ THIẾT KẾ TRẢI NGHIỆM RIÊNG BIỆT CHO 6 VAI TRÒ

### 2.1. Giáo viên Bộ môn (GVBM)
- **Tác vụ chính:** Đăng ký tiết dạy được dự, xem lịch dự giờ của mình, nhận biên bản góp ý từ đồng nghiệp, ký xác nhận phản hồi.
- **Vấn đề hiện tại:** 
  - Phải bấm thủ công 7 dropdowns để đăng ký 1 tiết dạy.
  - Không rõ phiếu đang ở giai đoạn nào trong quy trình ký duyệt.
- **Cải tiến Remediation:**
  - Bổ sung nút: `Điền nhanh từ Thời khóa biểu tuần của tôi` (Auto-fill Tiết, Lớp, Môn).
  - Tích hợp **Horizontal Mini Stepper** thể hiện rõ 5 chặng: `[1. Đăng ký] -> [2. Đã duyệt lịch] -> [3. Đã dự giờ] -> [4. Chờ GV phản hồi] -> [5. Hoàn tất]`.

### 2.2. Tổ trưởng Chuyên môn (TTCM)
- **Tác vụ chính:** Duyệt kế hoạch dự giờ tổ, phân công người đi dự, theo dõi tiến độ dự giờ 12 tháng của tổ viên, đánh giá chuyên đề.
- **Vấn đề hiện tại:**
  - Bảng ma trận 12 tháng bị mất cột Tên giáo viên khi cuộn ngang sang tháng 1–5.
  - Phân công người dự giờ dễ bị trùng lịch dạy của người được cử đi.
- **Cải tiến Remediation:**
  - Cố định cột Họ tên & Bộ môn (`sticky left-0 bg-white z-10 shadow-sm`).
  - Giao diện phân công hiển thị trực quan cảnh báo xung đột lịch dạy của người đi dự.

### 2.3. Quản lý Chuyên môn (QLCM) & Trưởng Bộ phận (TBP)
- **Tác vụ chính:** Kiểm tra chất lượng các phiếu đánh giá của TTCM, đảm bảo không có tình trạng đánh giá nể nang, theo dõi các tiết dạy xếp loại "Chưa đạt".
- **Vấn đề hiện tại:** Phải bấm vào từng phiếu riêng lẻ để kiểm tra, thiếu bộ lọc nhanh các tiết có điểm số bất thường (chênh lệch điểm giữa các tiêu chí).
- **Cải tiến Remediation:** Bổ sung bộ lọc nhanh `Tiết dạy cần lưu ý (Chưa đạt / Điểm chênh lệch)` và màn hình xem đối chiếu 2 phiếu dự giờ song song (Side-by-side Comparison).

### 2.4. Giám đốc Cơ sở (GĐCS)
- **Tác vụ chính:** Nắm bắt tỷ lệ hoàn thành chỉ tiêu dự giờ của toàn cơ sở (ví dụ: Cơ sở Riverside đạt bao nhiêu % kế hoạch học kỳ 1), chỉ đạo đột xuất.
- **Vấn đề hiện tại:** Màn hình admin quá nhiều số liệu vụn vặt, không có biểu đồ tóm tắt nhanh cho lãnh đạo.
- **Cải tiến Remediation:** Widget Executive Summary trên đầu trang hiển thị 3 chỉ số cốt lõi: `% Hoàn thành chỉ tiêu`, `Tỷ lệ xếp loại Tốt/Khá/Đạt`, và `Danh sách tiết dạy xuất sắc tiêu biểu`.

### 2.5. Quản trị viên Hệ thống & Đảm bảo Chất lượng (Admin)
- **Tác vụ chính:** Cấu hình biểu mẫu 11 tiêu chí, phân quyền đợt kiểm tra, tổng hợp xuất báo cáo Excel cho Hội đồng Quản trị và Sở GD&ĐT.
- **Vấn đề hiện tại:** Trang tổng hợp cả trường giật lag nghiêm trọng vì render hàng nghìn DOM nodes cùng lúc; xuất Excel bị nghẽn giao diện.
- **Cải tiến Remediation:** Tích hợp ảo hóa bảng dữ liệu (`@tanstack/react-virtual`), chuyển tác vụ xuất Excel sang Web Worker chạy ngầm có thanh phần trăm tiến trình mượt mà.

---

## 3. MA TRẬN HÀNH ĐỘNG CHI TIẾT CHO PHÂN HỆ DỰ GIỜ

| Mã Thay đổi | Vấn đề Hiện tại (Current Problem) | Đề xuất Cải tiến (Proposed Change) | Component Bị ảnh hưởng | File & Màn hình Bị ảnh hưởng | Vai trò Ảnh hưởng | Tác động UI | Tác động Business Logic | Rủi ro | Ưu tiên | Phụ thuộc |
|---|---|---|---|---|---|---|---|---|---|---|
| **DG-REM-01** | Modal đánh giá 11 tiêu chí K12 dài >1200px làm mất nút Lưu nháp & Hoàn thành trên màn hình 1366x768. | Thiết lập cấu trúc Modal Chuẩn: Sticky Header (Thông tin tiết + Live Score) + Body cuộn độc lập + Sticky Footer (Nút Lưu nháp, Submit, phím tắt Ctrl+S). | Modal, Dialog, Button | `teacher/du-gio/client.tsx:1420+` (Evaluation Modal) | GVBM, TTCM, BGH | Nút hành động luôn hiển thị 100% thời gian trên màn hình. | Không (Giữ nguyên payload lưu điểm). | Thấp | **P0** | Phase 1 Modal |
| **DG-REM-02** | Không có auto-save nháp; click nhầm ngoài backdrop làm mất toàn bộ biên bản nhận xét. | Tích hợp Auto-save ngầm mỗi 15 giây vào `localStorage('draft_eval_[id]')` kèm badge báo trạng thái lưu; chặn click backdrop khi form dirty. | Input, Form, Badge | `teacher/du-gio/client.tsx:2100+` | GVBM, TTCM, BGH | Hiển thị badge: `Đã lưu nháp lúc 14:20:05 ✓`. | Không (Lưu client-side). | Thấp | **P0** | Phase 0 Tokens |
| **DG-REM-03** | Bảng ma trận 12 tháng của TTCM bị trôi mất cột Tên GV khi cuộn ngang sang tháng 1–5. | Áp dụng CSS `position: sticky; left: 0; z-index: 10; background: white` kèm đường viền đổ bóng nhẹ phân cách cho 2 cột Tên và Bộ môn. | DataTable | `teacher/du-gio/components/TTCMDepartmentSummaryTab.tsx` | TTCM, BGH | Cột Tên GV luôn cố định khi cuộn ngang xem 12 tháng. | Không (Chỉ tác động CSS). | Thấp | **P0** | Phase 1 DataTable |
| **DG-REM-04** | Đăng ký dự giờ bắt buộc chọn 7 dropdowns thủ công, dễ nhầm phòng học/tiết. | Thêm nút `Điền nhanh từ Thời khóa biểu tuần` tự động map Khối, Lớp, Môn, Tiết của giáo viên đang đăng nhập. | Button, Form Select | `ObservationRegistrationSection.tsx:140-350` | GVBM | Giảm từ 7 thao tác click xuống còn 1 cú click. | Không (Tận dụng state TKB hiện có). | Thấp | **P1** | Phase 1 Button |
| **DG-REM-05** | Gợi ý nhận xét tự động (`QuickCommentPresets`) nhảy ra che khuất textarea gõ nhận xét. | Chuyển thành dạng danh sách Tags/Chips co giãn dưới ô textarea, click vào chip để chèn nhanh vào vị trí con trỏ. | Badge, Chips | `teacher/du-gio/client.tsx:3400+` | GVBM, TTCM, BGH | Giao diện gọn gàng, không che khuất chữ đang nhập. | Không. | Thấp | **P1** | Phase 1 Badge |
| **DG-REM-06** | Trang tổng hợp Admin bị giật lag khi tải hàng trăm giáo viên cả năm học. | Tách nhỏ component, tích hợp thư viện ảo hóa `@tanstack/react-virtual` để chỉ render các hàng nhìn thấy trong viewport. | DataTable, VirtualGrid | `admin/tong-hop-du-gio/client.tsx` | Admin, BGH | Tốc độ cuộn mượt mà 60 FPS, giảm 70% số lượng DOM nodes. | Không (Dữ liệu fetch giữ nguyên). | Trung bình | **P1** | Phase 1 DataTable |
| **DG-REM-07** | Trạng thái phiếu chỉ là Badge màu tĩnh, người dùng không rõ bước tiếp theo cần làm gì. | Thay thế bằng quy trình Stepper trực quan 5 bước hiển thị trạng thái và người đang giữ trách nhiệm xử lý. | Stepper | `teacher/du-gio/client.tsx:420-510` | GVBM, TTCM | Tăng tốc độ nhận biết luồng công việc lên 100%. | Không. | Thấp | **P2** | Phase 0 Tokens |
| **DG-REM-08** | Cột thao tác trong bảng quá rộng (>240px) làm chèn ép các cột dữ liệu khác. | Gom các nút phụ vào Action Dropdown menu ba chấm (`...`), chỉ giữ 1 nút chính nổi bật nhất. | Dropdown Menu, Button | Toàn bộ các bảng trong phân hệ dự giờ | Tất cả các vai trò | Bảng thoáng đãng, các cột điểm số có đủ không gian hiển thị. | Không. | Thấp | **P2** | Phase 1 Button |

---

## 4. CHI TIẾT TÁI CẤU TRÚC FORM ĐÁNH GIÁ 11 TIÊU CHÍ K12 (WIZARD STEPS)

Nhằm giảm tải nhận thức và chấm dứt tình trạng form cuộn dài vô tận, form đánh giá 11 tiêu chí được tổ chức lại thành **Wizard 3 bước gọn gàng**:

```
+-----------------------------------------------------------------------------+
| BƯỚC 1: KẾ HOẠCH BÀI DẠY (Tiêu chí 1 -> 4) ─────────────────────────────── |
| - 1.1. Mức độ phù hợp chuỗi hoạt động với mục tiêu dạy học (Thang 1-4)      |
| - 1.2. Mức độ rõ ràng của mục tiêu, kỹ thuật tổ chức và sản phẩm            |
| - 1.3. Mức độ phù hợp của thiết bị dạy học và học liệu                      |
| - 1.4. Mức độ hợp lý của phương án kiểm tra, đánh giá                        |
|                                                                             |
| BƯỚC 2: HOẠT ĐỘNG DẠY CỦA GIÁO VIÊN (Tiêu chí 5 -> 8) ──────────────────── |
| - 2.1. Tính sinh động, hấp dẫn của phương pháp giảng dạy                    |
| - 2.2. Khả năng quan sát, phát hiện khó khăn của học sinh                   |
| - 2.3. Biện pháp khuyến khích học sinh hợp tác, hỗ trợ nhau                 |
| - 2.4. Hiệu quả tổng kết và đánh giá quá trình học tập                       |
|                                                                             |
| BƯỚC 3: HOẠT ĐỘNG HỌC CỦA HỌC SINH (Tiêu chí 9 -> 11) & TỔNG KẾT ───────── |
| - 3.1. Khả năng tiếp nhận và sẵn sàng làm nhiệm vụ                          |
| - 3.2. Mức độ tích cực, chủ động, sáng tạo giải quyết vấn đề                |
| - 3.3. Mức độ chính xác, hiệu quả của kết quả học tập                       |
| => TỔNG KẾT: Điểm tự động tính (38.5/40) │ Xếp loại tự động: [ TỐT ]        |
| => Ý kiến nhận xét chung & Kiến nghị sư phạm                                |
+-----------------------------------------------------------------------------+
```

Người chấm có thể chuyển đổi linh hoạt giữa 3 bước thông qua thanh Tabs tiến trình trên đầu, hoặc sử dụng nút `Tiếp theo →` ở thanh Sticky Footer.
