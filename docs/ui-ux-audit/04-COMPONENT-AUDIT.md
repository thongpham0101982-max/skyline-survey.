# BÁO CÁO AUDIT UI/UX TOÀN DIỆN HỆ THỐNG SSM
## TÀI LIỆU 04: KIỂM TOÁN THÀNH PHẦN GIAO DIỆN (COMPONENT INVENTORY & AUDIT)

> **Mục tiêu:** Đánh giá độ phủ của thư viện component dùng chung, mức độ tái sử dụng, các biến thể trùng lặp và xác định các thành phần UI còn thiếu cần chuẩn hóa.

---

### 1. Bảng Kiểm kê Thành phần Giao diện (Component Inventory & Adoption Matrix)

| Tên Thành phần | Vị trí Khai báo | Trạng thái Thư viện | Tần suất Thực tế trong 111 Trang | Tỷ lệ Áp dụng Chuẩn | Đánh giá & Rủi ro |
|:---|:---|:---|:---|:---|:---|
| **Button** | \src/components/ui/button.tsx\ | Đã có CVA variants (default, skyline, accent, destructive,...) | 663 thẻ \<button>\ thô; **0 component chuẩn** | **0%** | **P1 - Rất cao:** Phân mảnh giao diện nút, không đồng bộ loading spinner và hiệu ứng click |
| **DataTable** | \src/components/ui/data-table.tsx\ | Đã có phân trang, search, sort | 225 thẻ \<table>\ thô; **0 component chuẩn** | **0%** | **P1 - Rất cao:** Mỗi bảng tự viết pagination, không có sticky header, không responsive |
| **EmptyState** | \src/components/ui/EmptyState.tsx\ | Đã có icon, title, desc, action button | 51 dòng thông báo thô; **0 component chuẩn** | **0%** | **P2 - Trung bình:** Trạng thái rỗng không có hướng dẫn thao tác, gây cụt luồng |
| **Badge / Status** | \src/components/ui/badge.tsx\ | Đã có variants màu | 551 thẻ badge viết tay \ounded-full\ | **< 3%** | **P2 - Trung bình:** Hơn 15 kiểu màu trạng thái lộn xộn, thiếu semantic mapping |
| **PageHeader** | \src/components/PageHeader.tsx\ | Đã có breadcrumbs, title, actions | 10 trang sử dụng / 111 trang | **~9%** | **P2 - Trung bình:** 101 trang tự tạo header với kích cỡ font và lề khác nhau |
| **KPICard** | \src/components/KPICard.tsx\ | Đã có unit, icon, badge, progress | Khoảng 15 trang sử dụng | **~25%** | **P2 - Trung bình:** Nhiều dashboard tự viết thẻ card tĩnh bằng flexbox |
| **Input / Select** | *Chưa có trong components/ui* | **THIẾU** | 287 \<input>\, 259 \<select>\ thô | **0%** | **P1 - Cao:** Chiều cao input dao động 32-44px, viền và focus ring không đồng nhất |
| **Drawer / Sheet** | *Chưa có trong components/ui* | **THIẾU** | 148 modal đè kín màn hình | **0%** | **P1 - Cao:** Xem chi tiết bản ghi làm mất bối cảnh (context loss) của bảng dữ liệu |
| **DatePicker** | *Chưa có trong components/ui* | **THIẾU** | Sử dụng \<input type=\"date\">\ thô của trình duyệt | **0%** | **P2 - Trung bình:** Trải nghiệm chọn ngày không đồng nhất giữa Chrome/Safari/Edge |
| **ConfirmDialog** | *Chưa có trong components/ui* | **THIẾU** | Gọi \window.confirm()\ hoặc tự viết modal | **0%** | **P0 - Nguy hiểm:** Thao tác xóa/hủy dữ liệu dùng hộp thoại mặc định của OS, dễ bấm nhầm |

---

### 2. Các Khiếm khuyết Thành phần Điển hình (Component Anti-Patterns)

#### 2.1. Nút Bấm Không Đồng Nhất (Button Proliferation)
* **Thiếu trạng thái Loading:** Hầu hết 663 thẻ \<button>\ thô không có vô hiệu hóa (\disabled={loading}\) khi người dùng click gửi dữ liệu, dẫn đến tình trạng người dùng click nhiều lần làm nhân đôi bản ghi (duplicate records) hoặc spam API.
* **Loạn kích thước (Height & Padding):** Chiều cao nút bấm dao động tùy hứng: \h-7\, \h-8\, \h-9\, \h-10\, \h-11\, \py-1\, \py-1.5\, \py-2\, \py-2.5\.

#### 2.2. Bảng Dữ liệu Đơn độc (Unstandardized Data Tables)
* Không có **Sticky Header**: Khi giáo viên cuộn danh sách lớp có 45 học sinh, tiêu đề cột (Toán, Văn, Anh, Điểm TB,...) bị cuộn mất lên trên, người dùng không nhớ cột mình đang nhập là môn nào.
* Không có **Sticky Column**: Trên laptop màn hình nhỏ, khi cuộn ngang sang phải xem các môn phụ, cột "Họ và tên học sinh" bị trôi mất, giáo viên không biết hàng điểm đó thuộc về em nào.
* Thiếu căn phải cho số liệu: Các cột điểm số, tổng tiết dự giờ, tỷ lệ phần trăm bị căn lề trái (\	ext-left\) xen kẽ với căn giữa (\	ext-center\), vi phạm nguyên tắc trình bày số liệu của bảng kế toán - giáo dục.

#### 2.3. Tệp Mã nguồn Đơn khối "Quái vật" (Monolithic Components)
* **\ObservationClient\ (7,385 dòng):** Gom tất cả từ quản lý lịch dạy, bảng đăng ký, form chấm điểm 11 tiêu chí K12, form 5 tiêu chí Mầm non, popup AI nhận xét, bộ lọc trường/khối/tổ/ngày, bảng tổng hợp TTCM, và giao diện in ấn A4 vào chung một component duy nhất.
  * *Hậu quả:* Bất kỳ thay đổi nhỏ nào ở một ô điểm cũng kích hoạt re-render toàn bộ 7,385 dòng logic, làm chậm máy tính của giáo viên.

---

### 3. Đề xuất Kiến trúc Thư viện Thành phần Chuẩn hóa (Standard UI Primitives)

Cần bổ sung và chuẩn hóa bộ thành phần tại \src/components/ui/\ theo tiêu chuẩn Base UI / Tailwind v4:

1. **\Button\ (Refined):**
   * Variant: \primary\ (Deep Pine \#003B3A\ chữ trắng), \cyan\ (\#48BFE3\ chữ Deep Pine), \secondary\ (Outline viền xám), \ghost\, \destructive\ (Rose-600).
   * Size: \sm\ (32px), \md\ (38px - chuẩn mặc định), \lg\ (44px).
   * Tự động tích hợp \Loader2\ khi \isLoading={true}\ và tự động khóa nút.
2. **\DataTable\ (Enhanced):**
   * Hỗ trợ mặc định: \stickyHeader={true}\, \stickyFirstColumn={true}\, \	abularNums={true}\.
   * Tự động căn phải cho dữ liệu kiểu số (\
umericColumn\).
   * Tích hợp sẵn thanh tìm kiếm có Debounce 300ms và bộ chọn số bản ghi mỗi trang (10, 20, 50, 100).
3. **\DetailDrawer\ (New):**
   * Sử dụng để xem chi tiết phiếu đánh giá dự giờ, xem chi tiết học sinh, xem lịch sử tư vấn cố vấn học tập trượt từ cạnh phải màn hình sang. Giữ nguyên vị trí bảng dữ liệu ở bên trái, tránh người dùng bị mất bối cảnh làm việc.
4. **\StatusBadge\ (New):**
   * Ánh xạ từ kho từ vựng trạng thái thống nhất: \draft\, \pending\, \in_progress\, \pproved\, \ejected\, \overdue\.
5. **\ConfirmDialog\ (New):**
   * Hộp thoại xác nhận chuyên dụng thay thế \window.confirm()\, hiển thị rõ tên đối tượng bị xóa và nút Destructive màu đỏ có độ trễ 500ms để chống bấm nhầm.
