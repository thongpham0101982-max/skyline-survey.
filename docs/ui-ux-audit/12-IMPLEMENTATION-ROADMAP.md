# BÁO CÁO AUDIT UI/UX TOÀN DIỆN HỆ THỐNG SSM
## TÀI LIỆU 12: LỘ TRÌNH TRIỂN KHAI NÂNG CẤP (IMPLEMENTATION ROADMAP)

> **Mục tiêu:** Định hình lộ trình từng bước (phân theo 6 giai đoạn) để chuyển đổi giao diện SSM từ hiện trạng phân mảnh sang hệ thống chuẩn hóa, hiện đại, nhanh và chuyên nghiệp mà không gây gián đoạn vận hành.

---

### 1. Nguyên tắc Xuyên suốt Quá trình Triển khai

1. **Bảo tồn Dữ liệu & Nghiệp vụ (Data & Logic Integrity):**
   * Giữ nguyên 100% Prisma Schema, Database, API endpoints, contracts và RBAC.
   * Mọi cải tiến chỉ diễn ra ở tầng giao diện (Presentation Layer) và luồng tương tác (Client Interactions).
2. **Không Redesign Đồng loạt (Zero Big-Bang Overhaul):**
   * Không đập đi xây lại toàn bộ cùng một lúc. Đi từ **Móng (Tokens) → Khung (Shared Components) → Trục (Navigation) → Từng Phân hệ Cốt lõi**.
3. **Kiểm thử Đồng hành (Continuous Verification):**
   * Mỗi giai đoạn hoàn thành đều phải được kiểm tra hiển thị trên 3 màn hình chuẩn: Laptop 1366x768, Desktop 1920x1080 và Mobile Safari/Chrome.

---

### 2. Chi tiết 6 Giai đoạn Triển khai (6-Phase Phased Delivery)

\\\mermaid
gantt
    title LỘ TRÌNH NÂNG CẤP UI/UX HỆ THỐNG SSM
    dateFormat  YYYY-MM-DD
    section Giai đoạn 0: Nền tảng
    Tokens, CSS, Typography, A11y Colors     :a1, 2026-09-25, 5d
    section Giai đoạn 1: Component Dùng chung
    Button, DataTable, Drawer, Modal, Badge :a2, after a1, 7d
    section Giai đoạn 2: Khung Điều hướng
    Sidebar, Header, Breadcrumb, Mobile Nav :a3, after a2, 5d
    section Giai đoạn 3: Phân hệ Cốt lõi
    Dự giờ & Chuyên môn, Hồ sơ Học sinh, Sổ điểm :a4, after a3, 10d
    section Giai đoạn 4: Phân hệ Mở rộng
    Khảo sát đầu vào, Khảo thí, Đào tạo, Admin :a5, after a4, 8d
    section Giai đoạn 5: Tinh chỉnh & Trợ năng
    WCAG 2.1 AA, Touch target, Kiểm thử toàn diện :a6, after a5, 5d
\\\

---

#### Giai đoạn 0: Chuẩn hóa Nền tảng & Design Tokens (Phase 0: Foundation)
* **Thời lượng ước tính:** 3 - 5 ngày làm việc.
* **Mục tiêu chính:**
  * Dọn dẹp tệp \src/app/globals.css\: Xóa bỏ đoạn ghi đè mã màu lỗi tại dòng 39-74.
  * Sửa biến \--sidebar: #003B3A\ (Deep Pine Sky-Line).
  * Chuẩn hóa Semantic Color Tokens: Gán \--primary: #003B3A\, \--accent-cyan: #48BFE3\, \--status-*\.
  * Xử lý triệt để tương phản a11y của màu Cyan: Thiết lập quy tắc văn bản trên nền Cyan phải là Deep Pine (\#003B3A\) đạt chuẩn 9.2:1.
  * Thiết lập Spacing Scale chuẩn (4px) và Typography Scale (hạ tỷ lệ lạm dụng \ont-black\).

#### Giai đoạn 1: Xây dựng Thư viện Thành phần Dùng chung (Phase 1: Shared UI Primitives)
* **Thời lượng ước tính:** 5 - 7 ngày làm việc.
* **Mục tiêu chính:**
  * Nâng cấp \<Button>\: Đồng bộ hóa trạng thái loading spinner, icon hỗ trợ và vô hiệu hóa click lặp.
  * Hoàn thiện \<DataTable>\: Tích hợp mặc định \stickyHeader\, \stickyFirstColumn\, \	abular-nums\ và thanh tìm kiếm có Debounce 300ms.
  * Xây dựng mới component \<DetailDrawer>\ để xem chi tiết bản ghi trượt từ phải sang (thay thế 148 modal tự chế).
  * Xây dựng mới \<ConfirmDialog>\ (thay thế triệt để \window.confirm\).
  * Xây dựng mới \<StatusBadge>\ với bộ từ vựng trạng thái chuẩn (Draft, Pending, Approved, Overdue).

#### Giai đoạn 2: Tinh gọn Khung Điều hướng (Phase 2: Navigation & Shell)
* **Thời lượng ước tính:** 4 - 5 ngày làm việc.
* **Mục tiêu chính:**
  * Tái cấu trúc \src/components/Sidebar.tsx\: Xóa bỏ menu trùng lặp (Hướng nghiệp), chuẩn hóa thứ tự số, loại bỏ bảng màu icon lòe loẹt, chỉ dùng đơn sắc có phân cấp.
  * Nâng cấp Global Header: Đồng bộ logo thương hiệu, tập trung bộ chọn Năm học và Cơ sở tại Header, loại bỏ bộ chọn trùng trong thân trang.
  * Sửa nút Home trong \PageHeader.tsx\ thành đường dẫn động theo ngữ cảnh phân quyền người dùng.
  * Xử lý xung đột z-index giữa thanh công cụ nổi và \AdminMobileBottomNav\ / \TeacherMobileBottomNav\.

#### Giai đoạn 3: Tối ưu các Phân hệ Trọng yếu Hàng ngày (Phase 3: High-Use Core Modules)
* **Thời lượng ước tính:** 8 - 10 ngày làm việc.
* **Mục tiêu chính:**
  * **Phân hệ Dự giờ & Phát triển Chuyên môn (\/teacher/du-gio\, \/admin/tong-hop-du-gio\):**
    * Phân rã tệp đơn khối 7,385 dòng (\ObservationClient\) thành các thành phần chuyên biệt (K12Form, PreschoolForm, QuickPresets, MatrixView).
    * Thiết kế lại form chấm điểm 11 tiêu chí K12 thành dạng **Full-screen Focused Workspace** không bị trôi mất nút Lưu trên laptop.
    * Thêm thanh cố định tên giáo viên trên bảng ma trận dự giờ TTCM.
  * **Phân hệ Hồ sơ Học sinh (\/teacher/ho-so-hoc-sinh\, \/admin/ho-so-hoc-sinh\):**
    * Hợp nhất 4,800 dòng mã nhân bản giữa Teacher và Admin thành một component dùng chung \<StudentProfileViewer role={role} />\.
  * **Phân hệ Sổ điểm & Nhận xét (\/teacher/so-diem-nhan-xet\):**
    * Cố định cột Tên học sinh, tự động đánh dấu (highlight) cả hàng khi rê chuột, hỗ trợ phím mũi tên di chuyển giữa các ô điểm.
  * **Dashboard Giáo viên (\/teacher\):**
    * Chuyển đổi từ bệ phóng launcher sang **Teacher Daily Workbench**: Ưu tiên lịch dạy hôm nay, tiết cần dự và việc gấp.

#### Giai đoạn 4: Chuẩn hóa các Phân hệ Nghiệp vụ Còn lại (Phase 4: Operational Modules)
* **Thời lượng ước tính:** 6 - 8 ngày làm việc.
* **Mục tiêu chính:**
  * Module Khảo sát đầu vào (\/admin/input-assessments\): Hợp nhất luồng duyệt và bảng điểm, phân rã tệp 9,320 dòng.
  * Module Quản lý Đào tạo (\/admin/classes\, \/admin/teachers\, \/admin/teaching-assignments\): Thay thế bảng thô bằng \<DataTable>\ chuẩn.
  * Module Khảo thí & ĐBCL (\/admin/ktdbcl/*\): Tinh gọn luồng import bảng điểm MOET và quản lý danh mục kỳ thi.
  * Module Cố vấn học tập (\/teacher/co-van-hoc-tap\): Tách form nhật ký tư vấn thành các bước nhập liệu (wizard) có ngữ cảnh mục tiêu học sinh.

#### Giai đoạn 5: Tinh chỉnh Toàn diện & Kiểm thử Trợ năng (Phase 5: Polish & A11y Verification)
* **Thời lượng ước tính:** 3 - 5 ngày làm việc.
* **Mục tiêu chính:**
  * Rà soát 100% nút bấm icon và bổ sung thuộc tính \ria-label\ tường minh.
  * Liên kết toàn bộ form nhãn với ô nhập qua cặp \htmlFor\ / \id\.
  * Kiểm tra vùng chạm cảm ứng ngón tay (tối thiểu 44x44px) trên toàn bộ bảng điểm trên iPad.
  * Đo kiểm hiệu năng lần cuối: Đảm bảo thời gian phản hồi tìm kiếm < 50ms, độ trễ tương tác INP < 200ms, loại bỏ hoàn toàn hiện tượng lag khi gõ chữ.
