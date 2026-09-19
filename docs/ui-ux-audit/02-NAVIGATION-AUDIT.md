# BÁO CÁO AUDIT UI/UX TOÀN DIỆN HỆ THỐNG SSM
## TÀI LIỆU 02: THANH ĐIỀU HƯỚNG & HEADER (NAVIGATION & HEADER AUDIT)

> **Mục tiêu:** Chuẩn hóa Sidebar, Header cấp hệ thống, Page Header, Breadcrumb và Navigation trên di động/máy tính bảng.

---

### 1. Đánh giá Thanh bên (Sidebar Audit)

Thanh bên là trục xương sống điều hướng của SSM. Kiểm tra tệp \src/components/Sidebar.tsx\ (926 dòng mã) cho thấy các vấn đề cụ thể:

#### 1.1. Hiện trạng & Lỗi giao diện Sidebar
* **Bất nhất trạng thái thu gọn (Collapsed State):**
  * Khi thu gọn (\isCollapsed = true\), một số mục hiển thị tooltip, một số mục chỉ hiển thị chữ cái đại diện không rõ nghĩa (ví dụ: hiển thị chữ "A", "B" thay vì icon).
  * Các menu con (submodules) không có flyout menu khi Sidebar ở trạng thái thu gọn, khiến người dùng không thể truy cập tính năng con mà buộc phải mở rộng lại toàn bộ Sidebar.
* **Đứt gãy thứ tự số (Broken Numbering Sequence):**  
  Phần Sidebar của Giáo viên tự chèn số thứ tự vào nhãn menu theo kiểu thủ công:
  \\\
  B. Công tác GVBM
    1. Khảo sát đầu vào
    3. Dự giờ GVNN (ESL)       <-- Nhảy từ 1 sang 3
    2. Dự giờ Giáo viên K-12   <-- Số 2 bị xếp sau số 3
    2. Dự giờ Mầm non          <-- Trùng số 2
    3. Sổ theo dõi Hướng nghiệp<-- Trùng số 3
    4. Hoạt động trải nghiệm
    5. Sổ điểm/nhận xét
  \\\
  Việc đánh số cứng vào nhãn văn bản thay vì dùng CSS counters hoặc flex layout tạo ấn tượng mã nguồn thiếu chỉn chu.
* **Phối màu quá nhiều màu sắc cục bộ (Color Overload in Sidebar):**  
  Mỗi mục Sidebar dùng một màu riêng lẻ: icon lúc thì \	ext-teal-400\, lúc thì \	ext-sky-400\, \	ext-fuchsia-400\, \	ext-amber-400\, \	ext-emerald-400\, \	ext-indigo-400\, \	ext-cyan-400\.
  * *Hệ quả:* Sidebar trông giống như một bảng vẽ đồ chơi, làm mất đi tính trang trọng và thống nhất của thương hiệu Sky-Line.
* **Badge thông báo công việc (\TASKS\):**  
  Badge số lượng công việc dùng màu \g-red-500 shadow-lg shadow-red-500/40\ với hiệu ứng đổ bóng phát sáng quá mạnh, gây phân tâm khi người dùng đang tập trung vào công việc khác.

---

### 2. Đánh giá Thanh tiêu đề Toàn cục (Global Header Audit)

Kiểm tra \src/app/admin/layout.tsx\ và \src/app/teacher/layout.tsx\ (cao 64px, \h-16\, \sticky top-0 z-30\):

#### 2.1. Phân mảnh phong cách Logo và Tên thương hiệu
* Tại \dmin/layout.tsx\:
  \\\	sx
  <span className="text-[#0284C7] font-extrabold uppercase tracking-wide">SKYLINE</span>
  <span className="text-xs font-bold text-slate-400">• Quản trị</span>
  \\\
  (Dùng màu xanh lạ \#0284C7\ và font \ont-extrabold\).
* Tại \	eacher/layout.tsx\:
  \\\	sx
  <span className="text-[#0284C7] font-medium tracking-wide">SKYLINE</span>
  <span className="text-xs font-normal text-slate-400">• Không gian Giáo viên</span>
  \\\
  (Cùng logo nhưng một bên dùng font \ont-extrabold\, một bên dùng \ont-medium\, kích thước chữ phụ khác nhau).

#### 2.2. Trùng lặp Bộ chọn Năm học (Academic Year Selector Duplication)
* Global Header luôn có thành phần \<AcademicYearSelector />\ cố định ở góc trên bên phải.
* Tuy nhiên, trên rất nhiều màn hình lớn (như \src/app/admin/page.tsx\, \src/app/teacher/page.tsx\, \src/app/admin/ho-so-hoc-sinh\), lại xuất hiện thêm một hộp chọn \<select>\ năm học khác nằm ở thanh công cụ của trang.
* *Hệ quả:* Người dùng bối rối không biết chọn năm học ở Header hay chọn ở giữa trang, đôi khi hai bộ chọn lệch trạng thái do đồng bộ qua LocalStorage bị trễ.

---

### 3. Đánh giá Page Header & Breadcrumbs

Kiểm tra \src/components/PageHeader.tsx\:

#### 3.1. Lỗi Hardcode Đường dẫn Trang chủ trong Breadcrumbs
\\\	sx
// Dòng 38 trong PageHeader.tsx:
<Link
  href="/admin"
  className="flex items-center gap-1 text-slate-400 hover:text-sky-600 transition-colors"
>
  <Home className="w-3.5 h-3.5" />
</Link>
\\\
* *Lỗ hổng UX nghiêm trọng:* Biểu tượng ngôi nhà (Home) trong Breadcrumb luôn dẫn thẳng về \/admin\. Khi giáo viên hoặc phụ huynh nhấp vào Home trên một trang có dùng \PageHeader\, hệ thống sẽ điều hướng họ sang phân hệ Admin và bị chặn lại bằng thông báo lỗi hoặc redirect quay vòng!
* *Giải pháp:* Home link phải là ngữ cảnh động (\isTeacher ? '/teacher' : isParent ? '/parent' : '/admin'\).

#### 3.2. Thiếu Phân cấp Hành động (CTA Hierarchy Defect)
* Phần \ctions\ trong \PageHeader\ hiện tại chỉ là một vùng flex chứa các nút bấm do page truyền vào:
  \\\	sx
  {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap sm:justify-end">{actions}</div>}
  \\\
* Các trang thường truyền vào 3-5 nút bấm đều có kiểu dáng Primary rực rỡ ngang nhau (ví dụ: nút *"Tạo mới"*, *"Xuất Excel"*, *"Nhập dữ liệu"*, *"Làm mới"* đều là nút xanh đậm).
* *Nguyên tắc chuẩn:* Mỗi trang chỉ được phép có **1 Primary CTA duy nhất**; các hành động phụ phải chuyển về dạng Secondary Outline hoặc gom vào Dropdown Menu "Thao tác khác".

---

### 4. Đánh giá Điều hướng Di động (Mobile Navigation Audit)

Hệ thống có \AdminMobileBottomNav\, \TeacherMobileBottomNav\ và \ParentMobileBottomNav\ dành cho màn hình \< 768px\:
* **Xung đột Z-Index Lớp phủ:**
  Thanh điều hướng đáy được đặt \z-40\. Tuy nhiên, các bảng dữ liệu có floating toolbar (thanh duyệt hàng loạt) lại đặt \z-[100]\ ở vị trí \ixed bottom-6 left-1/2\.
  * *Hệ quả trên điện thoại:* Thanh duyệt hàng loạt đè hoàn toàn lên Bottom Navigation, người dùng không thể chuyển trang hoặc mở Menu mà không tải lại màn hình.
* **Vùng chạm ngón tay (Touch Target Size):**
  Các nút trên thanh đáy có padding nhỏ (\p-1\), nhãn chữ \	ext-[10px]\ đặt quá sát mép dưới màn hình, dễ bị chạm nhầm vào thanh điều hướng hệ thống cử chỉ của iOS/Android.

---

### 5. Đề xuất Bộ Khung Điều hướng Chuẩn hóa (Unified Navigation Shell)

1. **Sidebar Chuẩn:**
   * Màu nền: \#003B3A\ (Deep Pine Sky-Line).
   * Mục đang kích hoạt (Active Item): Nền \gba(72, 191, 227, 0.15)\ (Cyan nhạt), viền trái 3px màu \#48BFE3\, chữ trắng sáng \#FFFFFF\.
   * Mục không kích hoạt: Chữ \#94A3B8\, hover sang \#E2E8F0\ với nền \gba(255, 255, 255, 0.05)\.
   * Bỏ toàn bộ hệ thống màu lộn xộn (fuchsia, amber, sky, indigo) trên các icon Sidebar; toàn bộ icon sử dụng màu đơn sắc có phân cấp theo trạng thái.
   * Xóa bỏ tiền tố số thứ tự gõ tay (1., 2., 3.).
2. **Global Header Chuẩn:**
   * Cố định ở đỉnh trang (\h-14\, tinh giản từ 64px xuống 56px để tăng diện tích hiển thị dữ liệu).
   * Bên trái: Nút thu gọn Sidebar, Breadcrumb thông minh phân cấp rõ ràng.
   * Bên phải: Bộ chọn Cơ sở (Campus Filter), Bộ chọn Năm học (Academic Year), Chuông thông báo (Notification), Menu người dùng (User Profile).
   * Không bao giờ hiển thị lại bộ chọn Năm học/Cơ sở bên trong nội dung trang nếu nó đã nằm trên Header.
