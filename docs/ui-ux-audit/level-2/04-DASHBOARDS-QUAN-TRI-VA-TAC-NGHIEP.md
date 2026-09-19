# SSM LEVEL-2 AUDIT: DASHBOARDS QUẢN TRỊ VÀ TÁC NGHIỆP
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Phân hệ trọng điểm:** Admin Executive Dashboard vs Teacher Workbench Dashboard  
**Đơn vị thực hiện Audit:** Antigravity UI/UX Pro Max Engine  
**Trạng thái mã nguồn:** READ-ONLY (Không can thiệp logic, DB hay source code)

---

## 1. TỔNG QUAN HIỆN TRẠNG HAI MÀN HÌNH DASHBOARD

Trong hệ thống SSM, Dashboard đóng vai trò là trang đáp (Landing Page) đầu tiên sau khi đăng nhập:
1. **Admin Dashboard (`src/app/admin/page.tsx` - 1,095 dòng):** Phục vụ Ban Giám hiệu, Giám đốc Cơ sở, Phòng Đảm bảo Chất lượng để quan sát toàn cảnh hệ thống trường học.
2. **Teacher Dashboard (`src/app/teacher/page.tsx` - 652 dòng):** Phục vụ Giáo viên để bắt đầu ngày làm việc.

---

## 2. BẢNG PHÂN TÍCH LỖI VÀ VẤN ĐỀ TRẢI NGHIỆM CHI TIẾT (ISSUE MATRIX)

| Mã ID | Vị trí Source Code | Mô tả vấn đề | Mức độ | Tác động người dùng | Giải pháp đề xuất UI/UX Pro Max |
|---|---|---|---|---|---|
| **DB-P0-01** | `src/app/admin/page.tsx:180-260` | Selector Năm học (`AcademicYearSelector`) bị render lặp lại bên trong body Dashboard dù trên Header toàn trang đã có sẵn. | **P0 (Critical)** | Gây xung đột nhận thức: người dùng không biết chọn năm học ở Header hay ở Dashboard thì biểu đồ mới cập nhật. | Loại bỏ selector thừa trong body, gán toàn bộ dữ liệu Dashboard ăn theo Global Year State từ Header. |
| **DB-P0-02** | `src/app/admin/page.tsx:320-580` | Card KPI lạm dụng màu sắc phi ngữ nghĩa: Thẻ xanh dương, xanh lá, tím, cam, vàng, hồng đặt cạnh nhau không tuân theo Design Tokens. | **P0 (Critical)** | Mỏi mắt, giảm tỷ lệ Data-Ink Ratio, triệt tiêu khả năng phát hiện các chỉ số cảnh báo nguy cơ. | Chuẩn hóa theo bảng màu Semantic: Nền xám dịu `bg-card`, viền trung tính, chỉ số nổi bật màu Navy Sky-Line; chỉ dùng Đỏ/Vàng cho chỉ số bất thường. |
| **DB-P1-01** | `src/app/teacher/page.tsx:1-652` | Dashboard Giáo viên chỉ là một "Trình phóng ứng dụng" (Application Launcher) với các thẻ bài điều hướng đi nơi khác, sao chép 1:1 tính năng của Sidebar. | **P1 (High)** | Giáo viên không nắm bắt được nhiệm vụ trong ngày: "Hôm nay dạy tiết nào? Tiết nào bị dự giờ? Cần chấm bài gì gấp?". | Chuyển đổi thành **Bàn làm việc Tác nghiệp (Daily Action Workbench)**: Lịch dạy hôm nay, Cảnh báo việc cần làm ngay (Action Items), Tin nhắn chuyên môn. |
| **DB-P1-02** | `src/app/admin/page.tsx:750+` | BGH hệ thống không có bộ chọn Cơ sở (Campus Quick Filter) tiện lợi để so sánh giữa Sky-Line Riverside, Central, Hill, International. | **P1 (High)** | Phải vào từng trang cấu hình sâu để xem riêng từng cơ sở, không có cái nhìn so sánh đa cơ sở. | Bổ sung Segmented Campus Control ngay dưới tiêu đề Dashboard: `[ Tất cả cơ sở | Riverside | Central | Hill | Global ]`. |
| **DB-P2-01** | Cả 2 Dashboards | Thiếu tính năng tùy biến widget hoặc thu gọn các khối thông tin ít sử dụng. | **P2 (Medium)** | Người dùng bị cố định bố cục, không ưu tiên được thông tin quan trọng với cá nhân mình. | Cho phép Toggle thu gọn/mở rộng các khối (Collapsible Sections) và lưu trạng thái vào LocalStorage. |

---

## 3. THIẾT KẾ ĐỀ XUẤT NÂNG CẤP (PROPOSED WIREFRAME)

### 3.1. Admin Executive Dashboard (F-Pattern Overview)

```
+----------------------------------------------------------------------------------------------------+
|  TỔNG QUAN ĐIỀU HÀNH CHẤT LƯỢNG GIÁO DỤC                                   Năm học: 2026-2027 (HK1) |
|  CƠ SỞ: [ ★ TẤT CẢ (4) ] [ Riverside ] [ Central ] [ Sky-Line Hill ] [ Quốc tế ]                   |
+------------------+-------------------+-------------------+-------------------+-----------------+
| TỔNG HỌC SINH    | CHUYÊN CẦN HÔM NAY| TIẾN ĐỘ DỰ GIỜ    | CỐ VẤN HỌC TẬP    | CẢNH BÁO SOS    |
| 3,420 em         | 98.4%             | 142 / 180 tiết    | 92% hoàn thành    | 04 ca cần duyệt |
| (▲ +3.2% so NK)  | (24 em nghỉ)      | (Đạt 78.8%)       | (Đợt Cuối HK1)    | [Xem ngay ↗]    |
+------------------+-------------------+-------------------+-------------------+-----------------+
| KHỐI BIỂU ĐỒ CHÍNH (Chiếm 65% màn hình)                 | KHỐI TÁC NGHIỆP BGH (Chiếm 35% màn hình) |
|                                                         |                                         |
| [Biểu đồ Tương quan Chất lượng Điểm số & Chuyên cần]     | VIỆC CẦN BGH PHÊ DUYỆT (PENDING QUEUE)  |
|                                                         | [!] Phê duyệt 2 phiếu dự giờ xếp Chưa Đạt|
| 100% |-----------                                       |     - GV: Trần Văn B (Tổ Toán Riverside)|
|      |          *                                       |     [Xem & Ký duyệt]                    |
|  80% |   *     *   *                                    | [!] Duyệt mở khóa gia hạn Cố vấn HK1     |
|      |  * *   *     *                                   |     - Khối 11 Riverside (Hạn: hôm nay)  |
|  60% |_*___*_*_______*_____                             |     [Chấp thuận] [Từ chối]              |
|        T.9  T.10 T.11 T.12                              | ─────────────────────────────────────── |
|                                                         | NHẬT KÝ HOẠT ĐỘNG TOÀN HỆ THỐNG         |
| TIẾN ĐỘ DẠY BÙ & HOÀN THÀNH CHƯƠNG TRÌNH:               | • 10:15 - TTCM Anh văn duyệt lịch dự giờ|
| Khối Tiểu học: 98% │ Khối THCS: 95% │ Khối THPT: 94%    | • 09:30 - Y tế tiếp nhận 1 ca dị ứng ăn |
+---------------------------------------------------------+-----------------------------------------+
```

### 3.2. Teacher Daily Action Workbench (Bàn làm việc Tác nghiệp)

```
+----------------------------------------------------------------------------------------------------+
|  BÀN LÀM VIỆC GIÁO VIÊN: CÔ LÊ THU HÀ (Tổ Tiếng Anh - THPT Riverside)         Thứ Năm, 19/10/2026   |
+----------------------------------------------------------------------------------------------------+
|  LỊCH DẠY HÔM NAY (THỜI KHÓA BIỂU THỜI GIAN THỰC):                                                  |
|  [● TIẾT 1 (07:30 - 08:15): Tiếng Anh 10A1 - Phòng 302] ── Đang diễn ra (Còn 15p) [Vào sổ điểm →]  |
|  [○ TIẾT 3 (09:15 - 10:00): Tiếng Anh 11B2 - Phòng 204] ── [CÓ LỊCH DỰ GIỜ: Thầy Nam BGH dự] ★    |
|  [○ TIẾT 4 (10:05 - 10:50): Sinh hoạt Cố vấn 10A1 - Phòng Cố vấn 1]                                 |
+---------------------------------------------------------+------------------------------------------+
|  NHIỆM VỤ CẦN HOÀN THÀNH GẤP (ACTION ITEMS):            |  THÔNG BÁO TỪ TỔ & NHÀ TRƯỜNG:           |
|                                                         |                                          |
|  [!] Ký xác nhận Phiếu dự giờ Tiết 2 ngày 17/10         |  • Thông báo nộp đề thi Giữa HK1 (Hạn 22)|
|      Người dự: Cô Mai Lan │ Xếp loại: Tốt (38/40)       |  • Tập huấn phương pháp STEAM vào T7 tuần|
|      [Ký biên bản ngay]                                 |                                          |
|                                                         |  PHÍM TẮT NHANH:                         |
|  [!] Nhập nhận xét Cố vấn cho 2 học sinh SOS lớp 10A1   |  [Nhập Sổ Điểm]  [Đăng ký Dự Giờ]        |
|      Học sinh: Nguyễn Hoàng Phúc & Lê Bích Ngọc         |  [Điểm Danh Lớp] [Xem Hồ Sơ Lớp CN]      |
|      [Mở trang Cố vấn]                                  |                                          |
+---------------------------------------------------------+------------------------------------------+
```

---

## 4. LỘ TRÌNH TRIỂN KHAI

1. **Sprint 1 (Clean Admin Dashboard):**
   - Xóa bỏ `AcademicYearSelector` trùng lặp trong body của `admin/page.tsx`.
   - Chuẩn hóa màu sắc thẻ KPI theo Sky-Line Semantic Colors (Navy `#002D62`, Gold `#D4AF37`, Neutral Slate).
2. **Sprint 2 (Revamp Teacher Workbench):**
   - Viết lại giao diện `teacher/page.tsx` từ dạng launcher sang dạng Bàn làm việc thực tế với widget Thời khóa biểu hôm nay.
