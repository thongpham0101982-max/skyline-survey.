# SSM SHARED COMPONENTS SPECIFICATION
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Thư mục mã nguồn:** `src/components/ui/` & `src/components/layout/`  

---

## 1. DANH SÁCH LINH KIỆN ĐÃ CHUẨN HÓA

### 1.1. Button (`src/components/ui/button.tsx`)
- **Variants:**
  - `primary`: Nền Deep Pine `#003B3A`, chữ trắng, hover `#004D4B`.
  - `default`: Tương đương `primary` trong giao diện mới.
  - `secondary`: Nền xám nhạt `bg-slate-100`, chữ `text-slate-700`.
  - `outline`: Viền `border-slate-200`, nền trắng.
  - `ghost`: Trong suốt, hover nền `bg-slate-100`.
  - `destructive`: Nền đỏ `bg-rose-600`, chữ trắng.
- **Sizes:** `xs`, `sm`, `default` (`md`), `lg`, `icon`, `icon-sm`.
- **Props nâng cao:** `isLoading` (tự động khóa click và xoay Spinner), `leftIcon`, `rightIcon`.

### 1.2. StatusBadge & Badge (`src/components/ui/badge.tsx`)
- **`StatusBadge`:** Nhận `status` dạng chuỗi nghiệp vụ tiếng Việt hoặc tiếng Anh, tự động phân tích và render màu chuẩn kèm chấm tròn hiển thị trực quan:
  ```tsx
  <StatusBadge status="Hoàn thành" />
  <StatusBadge status="Chờ duyệt" />
  <StatusBadge status="Quá hạn" />
  ```

### 1.3. Input (`src/components/ui/input.tsx`)
- **Chiều cao chuẩn:** `h-9 sm:h-10`, bo góc `rounded-xl`.
- **Props nâng cao:** `isError` (tự động viền đỏ và kích hoạt `aria-invalid`), `prefixIcon` (icon bên trái), `suffixIcon`.

### 1.4. Textarea (`src/components/ui/textarea.tsx`)
- Chiều cao tối thiểu `min-h-[80px]`, hỗ trợ `isError`, tự động đổi màu viền sang Deep Pine khi focus.

### 1.5. Select (`src/components/ui/select.tsx`)
- Dropdown tuyển chọn đồng nhất chiều cao và phong cách với Input, có icon mũi tên `ChevronDown` tinh gọn.

### 1.6. FormField (`src/components/ui/form-field.tsx`)
- Gom nhóm: `Label` + `Dấu sao bắt buộc (*)` + `Control (Input/Select)` + `Error inline` hoặc `HelpText`.

### 1.7. EmptyState (`src/components/ui/EmptyState.tsx`)
- Hỗ trợ 5 variants:
  - `default`: Không có dữ liệu chung.
  - `no-data`: Danh sách trống cần tạo mới.
  - `no-result`: Tìm kiếm không có kết quả.
  - `no-permission`: Không có quyền truy cập.
  - `not-configured`: Chưa cấu hình đợt làm việc.

### 1.8. LoadingState (`src/components/ui/LoadingState.tsx`)
- `LoadingSpinner`: Xoay mượt với màu Deep Pine.
- `Skeleton`: Hiệu ứng quét sóng xám nhạt.
- `TableSkeleton`: Mô phỏng bảng dữ liệu theo số hàng và số cột tùy biến.
- `CardSkeleton`: Mô phỏng khối card chỉ số.

### 1.9. ErrorState (`src/components/ui/ErrorState.tsx`)
- `InlineError`: Báo lỗi ngắn gọn dưới ô nhập liệu.
- `PageError`: Thông báo lỗi toàn trang kèm nút "Thử tải lại".
- `NetworkError`: Thông báo mất kết nối Internet.

### 1.10. FilterBar (`src/components/ui/FilterBar.tsx`)
- Thanh lọc ngang co giãn thông minh: Ô tìm kiếm nhanh bên trái + Slot bộ lọc phụ ở giữa + Nút "Đặt lại bộ lọc" bên phải.

### 1.11. DetailDrawer (`src/components/ui/drawer.tsx`)
- Ngăn kéo trượt cạnh phải xem nhanh chi tiết hồ sơ hoặc lịch sử đánh giá mà không làm mất trang hiện tại.

### 1.12. Dialog / Modal (`src/components/ui/dialog.tsx`)
- Hộp thoại trung tâm với cấu trúc 3 tầng: Sticky Header + Scrollable Body (`max-h-[90vh]`) + Sticky Footer. Hỗ trợ `disableBackdropClick` bảo vệ dữ liệu khi đang nhập dở form.

### 1.13. AppShell & PageContainer (`src/components/layout/AppShell.tsx`)
- Khung bố cục chuẩn hóa căn giữa với padding thích ứng: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6`.
