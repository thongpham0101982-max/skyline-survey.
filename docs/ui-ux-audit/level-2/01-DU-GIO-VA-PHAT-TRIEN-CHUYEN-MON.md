# SSM LEVEL-2 AUDIT: DỰ GIỜ & PHÁT TRIỂN CHUYÊN MÔN
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Phân hệ trọng điểm:** Dự giờ giáo viên, Đánh giá tiết dạy, Kế hoạch chuyên môn & Báo cáo tổng hợp  
**Đơn vị thực hiện Audit:** Antigravity UI/UX Pro Max Engine  
**Trạng thái mã nguồn:** READ-ONLY (Không can thiệp logic, DB hay source code)

---

## 1. TỔNG QUAN PHÂN HỆ VÀ QUY MÔ MÃ NGUỒN

Phân hệ **Dự giờ và Phát triển Chuyên môn** là một trong những trụ cột nghiệp vụ cốt lõi nhất của Sky-Line nhằm đảm bảo và nâng cao chất lượng giảng dạy sư phạm. Phân hệ phục vụ 4 nhóm người dùng chính: Giáo viên bộ môn (GVBM), Tổ trưởng chuyên môn (TTCM), Ban Giám hiệu (BGH), và Ban Đảm bảo Chất lượng / Quản trị viên (Admin).

### Thống kê khối lượng mã nguồn giao diện (Client-side):
- `src/app/teacher/du-gio/client.tsx`: **7,385 dòng** (Monolithic client component quản lý toàn bộ giao diện dự giờ giáo viên).
- `src/app/teacher/du-gio/components/ObservationRegistrationSection.tsx`: **2,366 dòng** (Form và danh sách đăng ký lịch dự giờ).
- `src/app/teacher/du-gio/components/TTCMDepartmentSummaryTab.tsx`: **2,605 dòng** (Bảng ma trận chuyên môn tổ, tổng hợp tiết dạy 12 tháng).
- `src/app/admin/tong-hop-du-gio/client.tsx`: **5,931 dòng** (Màn hình tổng hợp, báo cáo xếp loại, xuất Excel cấp hệ thống).
- `src/app/admin/ke-hoach-du-gio/client.tsx`: **1,850 dòng** (Lập kế hoạch thanh tra, kiểm tra chuyên môn định kỳ).
- **Tổng quy mô client code:** **> 20,100 dòng mã giao diện**.

---

## 2. KIẾN TRÚC LUỒNG NGƯỜI DÙNG (USER FLOW AUDIT)

Hệ thống hiện tại triển khai 5 luồng nghiệp vụ chính:

```
[GVBM Đăng ký / Đề xuất] 
       │
       ▼
[TTCM Duyệt lịch & Phân công người dự] 
       │
       ▼
[Người dự điền Phiếu đánh giá (11 Tiêu chí K12)] 
       │
       ▼
[Ký duyệt & Phản hồi 2 chiều (GVBM <-> Người dự)] 
       │
       ▼
[Tổng hợp Ma trận Chuyên môn (TTCM / BGH / Admin)]
```

### Chi tiết từng luồng và điểm đứt gãy trải nghiệm:

### Luồng 1: Đăng ký tiết dạy / Đề xuất dự giờ
- **Tác nhân:** Giáo viên bộ môn (GVBM).
- **Hiện trạng UI:** 
  - Nằm trong tab Đăng ký (`ObservationRegistrationSection.tsx`).
  - Người dùng phải tự chọn thủ công qua 7 dropdowns liên hoàn: Cơ sở -> Cấp học -> Khối -> Lớp -> Môn học -> Giáo viên dạy -> Tiết dạy -> Ngày dạy -> Phòng học.
- **Điểm nghẽn UX:**
  - Không có tính năng tự động điền (Auto-fill) dựa theo Thời khóa biểu (TKB) tuần của giáo viên đang đăng nhập.
  - Dropdowns phụ thuộc (Cascading dropdowns) không có skeleton loading khi fetch danh mục lớp/môn, gây hiện tượng dropdown bị trống 0.5s khiến giáo viên bấm nhầm.

### Luồng 2: Phân công & Lập lịch dự giờ
- **Tác nhân:** Tổ trưởng chuyên môn (TTCM).
- **Hiện trạng UI:** 
  - Modal phân công người dự giờ xuất hiện dạng pop-up độc lập.
- **Điểm nghẽn UX:**
  - TTCM không nhìn thấy lịch trống / thời khóa biểu của người được phân công đi dự giờ tại thời điểm chọn, dẫn đến tình trạng phân công trùng giờ dạy của giáo viên đi dự.

### Luồng 3: Đánh giá tiết dạy (Phiếu đánh giá 11 tiêu chí K12)
- **Tác nhân:** Người dự giờ (GVBM khác, TTCM, BGH).
- **Hiện trạng UI:** 
  - Modal form cuộn dọc dài hơn 1,200px.
  - Bao gồm 3 nhóm tiêu chuẩn theo quy định Bộ GD&ĐT / Sky-Line:
    1. Kế hoạch và tài liệu dạy học (Tiêu chí 1-4).
    2. Hoạt động dạy học của giáo viên (Tiêu chí 5-8).
    3. Hoạt động học tập của học sinh (Tiêu chí 9-11).
  - Điểm số thang 20 hoặc thang 40, tự động xếp loại (Tốt, Khá, Đạt, Chưa đạt).
- **Điểm nghẽn UX (Nghiêm trọng - P0):**
  - **Mất nút hành động (Button Clipping):** Trên laptop 1366x768 hoặc 1280x800, modal cuộn dài mà modal footer chứa nút `Lưu nháp` và `Hoàn thành đánh giá` bị trôi tuột xuống đáy, không ghim cố định (Sticky). Người dùng cuộn mỏi tay để tìm nút lưu.
  - Không có cơ chế Auto-save nháp vào LocalStorage. Nếu vô tình nhấn phím `Escape` hoặc click nhầm ra backdrop xám bên ngoài, modal đóng lại và toàn bộ nội dung nhận xét định tính vừa gõ 20 phút bị xóa trắng.

### Luồng 4: Phản hồi và Biên bản thống nhất hai chiều
- **Tác nhân:** Giáo viên được dự và Người dự giờ.
- **Hiện trạng UI:** 
  - Tab biên bản phản hồi hiển thị sau khi phiếu đã hoàn thành.
- **Điểm nghẽn UX:**
  - Giao diện không thể hiện rõ tiến trình (Stepper): GVBM không rõ phiếu đang ở bước: "Chờ GV phản hồi", "Đã ký biên bản", hay "Chờ TTCM phê chuẩn".

### Luồng 5: Tổng hợp Ma trận Chuyên môn 12 tháng
- **Tác nhân:** TTCM (`TTCMDepartmentSummaryTab.tsx`) & Admin (`src/app/admin/tong-hop-du-gio`).
- **Hiện trạng UI:** 
  - Bảng dữ liệu ngang hiển thị danh sách giáo viên trong tổ và 12 cột tháng (Tháng 8 đến Tháng 5 năm sau).
- **Điểm nghẽn UX (P0):**
  - **Thiếu Frozen/Sticky Columns:** Khi cuộn ngang sang các tháng 2, 3, 4, cột "Họ và tên giáo viên" bị cuộn biến mất sang trái. TTCM không thể nhận biết dòng dữ liệu hiện tại thuộc về giáo viên nào nếu không cuộn ngược lại.

---

## 3. BẢNG PHÂN TÍCH LỖI VÀ VẤN ĐỀ TRẢI NGHIỆM CHI TIẾT (ISSUE MATRIX)

| Mã ID | Vị trí Source Code | Mô tả vấn đề | Mức độ | Tác động người dùng | Giải pháp đề xuất UI/UX Pro Max |
|---|---|---|---|---|---|
| **DG-P0-01** | `src/app/teacher/du-gio/client.tsx:1420-1890` | Modal đánh giá 11 tiêu chí có chiều cao >1200px, footer chứa nút Submit không dính (non-sticky). | **P0 (Critical)** | Mất kiểm soát thao tác lưu, nút bị ẩn khỏi viewport trên màn hình 1366x768. | Chuyển thành Sticky Header (Thông tin tiết + Điểm tạm tính) & Sticky Footer (Lưu nháp, Hoàn thành, phím tắt Ctrl+S). |
| **DG-P0-02** | `src/app/teacher/du-gio/client.tsx:2100+` | Modal không chặn click outside backdrop; thiếu LocalStorage auto-save draft. | **P0 (Critical)** | Mất dữ liệu nhận xét định tính khi vô tình click ngoài hoặc sập mạng. | Kích hoạt `backdrop: static`, tích hợp auto-save ngầm mỗi 15 giây vào `localStorage('draft_eval_...')` kèm badge `Đã lưu nháp lúc hh:mm:ss`. |
| **DG-P0-03** | `TTCMDepartmentSummaryTab.tsx:320-580` | Bảng ma trận chuyên môn 12 tháng không freeze cột Tên GV và Bộ môn khi cuộn ngang. | **P0 (Critical)** | Mất ngữ cảnh đối chiếu khi xem các tháng cuối năm học. | Áp dụng CSS `position: sticky; left: 0; z-index: 10` cho cột Họ tên kèm shadow phân cách. |
| **DG-P1-01** | `ObservationRegistrationSection.tsx:140-350` | Form đăng ký dự giờ bắt buộc chọn 7 dropdowns thủ công, không có auto-fill TKB. | **P1 (High)** | Tốn 3-5 phút cho mỗi lượt đăng ký, dễ nhầm phòng học/tiết học. | Bổ sung nút bấm thông minh: `Điền nhanh từ Thời khóa biểu của tôi`, tự động map Tiết, Lớp, Môn. |
| **DG-P1-02** | `src/app/teacher/du-gio/client.tsx:3400-3600` | Tính năng gợi ý nhận xét tự động (`QuickCommentPresets`) nhảy ra đè lên textarea khi nhập điểm. | **P1 (High)** | Che khuất tầm nhìn của giáo viên, gây khó chịu khi gõ text. | Đưa `QuickCommentPresets` vào dạng Chips/Tags có thể gập mở bên dưới ô nhận xét, click vào chip để chèn vào con trỏ. |
| **DG-P1-03** | `src/app/admin/tong-hop-du-gio/client.tsx:1-5931` | Toàn bộ dữ liệu dự giờ của hàng trăm giáo viên cả năm học render cùng lúc trong 1 client component không ảo hóa (virtualization). | **P1 (High)** | Gây tụt FPS, giật lag giao diện (DOM node count > 4,500), tiêu hao RAM trình duyệt. | Tách nhỏ component, áp dụng `@tanstack/react-virtual` cho bảng dữ liệu lớn và phân trang server-side. |
| **DG-P2-01** | `src/app/teacher/du-gio/client.tsx:420-510` | Trạng thái phiếu dự giờ chỉ thể hiện bằng Badge màu đơn điệu, không có quy trình trực quan. | **P2 (Medium)** | Giáo viên mới không biết phiếu cần làm gì tiếp theo (Chờ duyệt hay Chờ ký). | Thay Badge bằng Horizontal Mini Stepper: `Đăng ký -> Đã duyệt -> Đã dự -> Chờ ký -> Hoàn tất`. |
| **DG-P2-02** | Toàn bộ các bảng dự giờ | Nút hành động (Xem, Đánh giá, Sửa, Xóa, In) nằm trải ngang làm cột Thao tác bị quá rộng (rộng > 240px). | **P2 (Medium)** | Chiếm diện tích bảng, đẩy các cột dữ liệu quan trọng khác co hẹp lại. | Gom nhóm hành động: 1 nút chính (ví dụ: `Đánh giá` hoặc `Xem`) + 1 menu dropdown ba chấm (`...`) cho các hành động phụ. |

---

## 4. CHI TIẾT ĐÁNH GIÁ CÔNG CỤ ĐÁNH GIÁ 11 TIÊU CHÍ K12

Hệ thống đánh giá tiết dạy chuẩn Sky-Line bao gồm 11 tiêu chí chia làm 3 tiêu chuẩn:

```
TIÊU CHUẨN 1: KẾ HOẠCH VÀ TÀI LIỆU DẠY HỌC (Tiêu chí 1 -> 4)
  1.1. Mức độ phù hợp của chuỗi hoạt động học với mục tiêu, nội dung, PPDH
  1.2. Mức độ rõ ràng của mục tiêu, nội dung, kỹ thuật tổ chức và sản phẩm
  1.3. Mức độ phù hợp của thiết bị dạy học và học liệu
  1.4. Mức độ hợp lý của phương án kiểm tra, đánh giá

TIÊU CHUẨN 2: HOẠT ĐỘNG DẠY HỌC CỦA GIÁO VIÊN (Tiêu chí 5 -> 8)
  2.1. Mức độ sinh động, hấp dẫn của phương pháp và hình thức tổ chức
  2.2. Khả năng theo dõi, quan sát, phát hiện kịp thời khó khăn của học sinh
  2.3. Biện pháp hỗ trợ và khuyến khích học sinh hợp tác, giúp đỡ nhau
  2.4. Mức độ hiệu quả của việc đánh giá quá trình và tổng kết bài học

TIÊU CHUẨN 3: HOẠT ĐỘNG HỌC TẬP CỦA HỌC SINH (Tiêu chí 9 -> 11)
  3.1. Khả năng tiếp nhận và sẵn sàng thực hiện nhiệm vụ học tập
  3.2. Mức độ tích cực, chủ động, sáng tạo trong giải quyết vấn đề
  3.3. Mức độ đúng đắn, chính xác, hiệu quả của kết quả thực hiện nhiệm vụ
```

### Điểm bất cập trong thiết kế hiện tại:
1. **Thiếu hiển thị tiến trình hoàn thành:** Người dùng không biết mình đã chấm xong bao nhiêu / 11 tiêu chí. Đôi khi bỏ sót tiêu chí số 7 mà chỉ phát hiện ra khi bấm nút Submit và bị báo lỗi Validation đỏ chót ở trên đỉnh trang.
2. **Không có thanh tính điểm thời gian thực (Real-time Live Score Tracker):** Điểm tổng và xếp loại tạm tính bị đặt ở tận cuối trang form. Khi giáo viên đang chấm tiêu chí 4, họ không biết điểm số hiện tại đang là bao nhiêu và tương ứng với xếp loại nào.
3. **Thang điểm chọn số (Radio Buttons vs Stepper Slider):** Hiện tại dùng 4 radio button nhỏ xíu cho mỗi mức điểm (1 - 2 - 3 - 4 hoặc 0.5 - 1.0 - 1.5 - 2.0). Việc click chuột vào các ô radio nhỏ liên tục 11 lần gây mỏi cơ ngón tay (Fitts's Law violation).

---

## 5. THIẾT KẾ ĐỀ XUẤT NÂNG CẤP (PROPOSED WIREFRAME & ARCHITECTURE)

### 5.1. Wireframe Cải tiến Modal Đánh giá 11 Tiêu chí (Sticky & Wizard View)

```
+----------------------------------------------------------------------------------------------------+
|  [DỰ GIỜ] ĐÁNH GIÁ TIẾT DẠY: TOÁN 10A1 - THẦY NGUYỄN VĂN A                 [X Đóng]                |
|  Thời gian: Tiết 3 - Thứ Tư 18/10/2026 | Phòng: 302 Riverside                                      |
+----------------------------------------------------------------------------------------------------+
|  TIẾN TRÌNH: [● 1. Kế hoạch (4/4)] ──── [● 2. Tổ chức dạy (4/4)] ──── [○ 3. Học sinh (1/3)]         |
|  ĐIỂM HIỆN TẠI: 34.5 / 40.0  ──  XẾP LOẠI DỰ KIẾN: [ TỐT ] ★★★☆                 [Tự động lưu ✓]   |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  TIÊU CHUẨN 3: HOẠT ĐỘNG HỌC TẬP CỦA HỌC SINH                                                      |
|                                                                                                    |
|  Tiêu chí 3.2: Mức độ tích cực, chủ động, sáng tạo trong giải quyết vấn đề                         |
|  +----------------------------------------------------------------------------------------------+  |
|  | Chọn mức điểm:                                                                               |  |
|  | [ (1) Chưa đạt: 0.5 ]   [ (2) Đạt: 1.0 ]   [ (3) Khá: 1.5 ]   [ ★ (4) Xuất sắc: 2.0 (Đang chọn)]  |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                    |
|  Nhận xét chi tiết minh chứng:                                                                     |
|  +----------------------------------------------------------------------------------------------+  |
|  | Học sinh thảo luận nhóm sôi nổi, nhóm 3 có cách giải bài toán xác suất sáng tạo...           |  |
|  +----------------------------------------------------------------------------------------------+  |
|  Gợi ý nhanh (Click để chèn):                                                                      |
|  [ + HS tích cực thảo luận ]  [ + Khả năng thuyết trình lưu loát ]  [ + Cần rèn luyện ghi chép ]   |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
|  [← Quay lại Tiêu chuẩn 2]               [Lưu bản nháp (Ctrl+S)]               [Hoàn thành phiếu →] |
+----------------------------------------------------------------------------------------------------+
```

### 5.2. Wireframe Bảng Ma trận Chuyên môn TTCM (Sticky Column & Filter Freeze)

```
+----------------------------------------------------------------------------------------------------+
| LỌC: [Năm học: 2026-2027 ▼] [Tổ: Toán - Tin ▼] [Cơ sở: Riverside ▼]         [ Xuất Excel Báo Cáo ] |
+------------------------+-----------+-------+-------+-------+-------+-------+-------+-------+-------+
| HỌ VÀ TÊN GIÁO VIÊN    | BỘ MÔN    | T.8   | T.9   | T.10  | T.11  | T.12  | ...   | T.5   | TỔNG  |
| (Cột ghim cố định)     | (Cố định) |       |       |       |       |       |       |       | TIẾT  |
+------------------------+-----------+-------+-------+-------+-------+-------+-------+-------+-------+
| Trần Thị Mai Lan       | Toán THPT | 2     | 4     | 3     | 2     | 4     | ...   | 2     | 28    |
| Nguyễn Hữu Cường       | Tin học   | 1     | 2     | 2     | 3     | 1     | ...   | 3     | 21    |
| Lê Hoàng Nam           | Toán THCS | 3     | 3     | 4     | 2     | 3     | ...   | 1     | 26    |
| ... (cuộn ngang mượt mà không mất tên giáo viên)                                                  |
+------------------------+-----------+-------+-------+-------+-------+-------+-------+-------+-------+
```

---

## 6. LỘ TRÌNH TRIỂN KHAI NÂNG CẤP CHI TIẾT

1. **Sprint 1 (Quick Wins - Sửa lỗi nghiêm trọng):**
   - Đóng băng cột Họ tên và Bộ môn trong `TTCMDepartmentSummaryTab.tsx` với Tailwind `sticky left-0 bg-white shadow-sm`.
   - Cố định Header và Footer trong modal đánh giá 11 tiêu chí của `du-gio/client.tsx`.
   - Bổ sung Auto-save draft vào `localStorage` cho form đánh giá để bảo vệ dữ liệu giáo viên.
2. **Sprint 2 (Refactoring & UX Polish):**
   - Phân rã file `client.tsx` (7,385 dòng) thành các sub-components độc lập:
     - `ObservationEvaluationModal.tsx` (Form chấm điểm).
     - `ObservationTimelineStepper.tsx` (Quy trình trạng thái).
     - `QuickCommentChipSelector.tsx` (Gợi ý nhận xét).
   - Thiết kế lại các nút bấm chọn điểm theo Button Group lớn dễ click.
3. **Sprint 3 (Performance & Virtualization):**
   - Tích hợp `@tanstack/react-virtual` vào bảng tổng hợp Admin `tong-hop-du-gio/client.tsx`.
   - Tối ưu hóa API fetch theo phân trang server.
