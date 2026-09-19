# SSM SHARED COMPONENTS MIGRATION PLAN (PHASE 1 & PHASE 2)
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Kế hoạch Chuẩn hóa:** 13 Component Dùng chung Cốt lõi & Khung Điều hướng Global Layout  
**Trạng thái Thực hiện:** PLANNING ONLY (READ-ONLY)

---

## 1. DANH MỤC 13 COMPONENT DÙNG CHUNG CẦN CHUẨN HÓA (PHASE 1)

Nhằm triệt tiêu code trùng lặp và loại bỏ lỗi giao diện hệ thống, 13 component sau đây được chuẩn hóa dựa trên các file hiện có trong `@/components/ui/`:

```
1. Button           2. Input            3. Select / Combobox   4. Badge
5. PageHeader       6. FilterBar        7. DataTable           8. Modal
9. Drawer / Sheet  10. Tabs            11. EmptyState         12. LoadingState
13. ErrorState / ErrorBoundary
```

---

## 2. MA TRẬN ĐẶC TẢ CHI TIẾT TỪNG THAY ĐỔI COMPONENT

### Component 1: Button
- **Current problem:** Các nút hành động trong bảng (Xem, Đánh giá, Sửa, Xóa) có kích thước to nhỏ không đều (`px-2`, `px-4`, `py-1`, `py-2`), màu nền dùng mã hex cứng (`#002D62`, `#2563EB`, `#10B981`) thay vì variant. Trạng thái Loading thiếu spinner đồng nhất.
- **Proposed change:** Chuẩn hóa `@/components/ui/button.tsx` với các variant: `default` (Navy), `secondary` (Gold-tint), `outline`, `ghost`, `destructive` và 3 size chuẩn (`sm: h-8 px-3 text-xs`, `default: h-10 px-4 text-sm`, `lg: h-11 px-6`). Tích hợp sẵn `isLoading` tự động khóa click và render spinner.
- **Affected component:** `@/components/ui/button.tsx`
- **Affected pages:** Toàn bộ 24+ trang trong hệ thống.
- **Affected roles:** Tất cả người dùng (GV, TTCM, BGH, Admin).
- **UI impact:** Nút bấm đồng nhất kích thước, có phản hồi hover và loading chuyên nghiệp.
- **Business logic impact:** Không (0%).
- **Risk:** Thấp.
- **Priority:** P1.
- **Implementation dependency:** Phase 0 Tokens.

### Component 2: Input & Form Controls
- **Current problem:** Ô input thiếu trạng thái viền đỏ khi validation lỗi; thông báo lỗi hiển thị bằng alert trình duyệt hoặc chữ đỏ lệch lề. Thiếu nút xóa nhanh (`Clearable Input`).
- **Proposed change:** Cập nhật `@/components/ui/input.tsx` hỗ trợ prop `isError`, slot `prefixIcon` và `suffixIcon`, tự động tích hợp `aria-invalid` phục vụ trợ năng.
- **Affected component:** `@/components/ui/input.tsx`
- **Affected pages:** Các form đăng ký dự giờ, tìm kiếm học sinh, nhập biên bản cố vấn.
- **Affected roles:** Tất cả người dùng.
- **UI impact:** Trực quan hóa lỗi nhập liệu ngay dưới trường thông tin.
- **Business logic impact:** Không (0%).
- **Risk:** Thấp.
- **Priority:** P1.
- **Implementation dependency:** Phase 0 Tokens.

### Component 3: Select & Cascading Combobox
- **Current problem:** Dropdown chọn Khối -> Lớp -> Môn học khi fetch dữ liệu bị trống và giật layout; danh sách dài hơn 20 mục không có ô gõ tìm kiếm nhanh (Searchable Combobox).
- **Proposed change:** Xây dựng wrapper `@/components/ui/searchable-select.tsx` dựa trên Radix Popover + Command list, có ô lọc tìm kiếm và trạng thái loading skeleton khi fetch API.
- **Affected component:** `@/components/ui/searchable-select.tsx` (Mới từ Radix UI)
- **Affected pages:** Đăng ký dự giờ, Lọc danh sách học sinh, Phân công chuyên môn.
- **Affected roles:** GV, TTCM, Admin.
- **UI impact:** Giảm 80% thời gian tìm kiếm tên lớp/môn trong danh mục dài.
- **Business logic impact:** Không (0%).
- **Risk:** Trung bình (cần test kỹ sự kiện onChange).
- **Priority:** P1.
- **Implementation dependency:** Radix Command / Popover có sẵn.

### Component 4: Status Badge
- **Current problem:** Badge trạng thái dùng mã màu tùy tiện; phiếu dự giờ "Chờ duyệt" có trang màu vàng, có trang màu xám; "Đạt" lúc màu xanh dương lúc màu xanh lá.
- **Proposed change:** Chuẩn hóa `@/components/ui/badge.tsx` với prop `status: 'draft' | 'pending' | 'success' | 'warning' | 'danger' | 'sos'`, tự động map đúng màu semantic tokens.
- **Affected component:** `@/components/ui/badge.tsx`
- **Affected pages:** Toàn bộ bảng danh sách và chi tiết phiếu.
- **Affected roles:** Tất cả người dùng.
- **UI impact:** Nhận biết trạng thái tức thì, nhất quán trên toàn hệ thống.
- **Business logic impact:** Không (0%).
- **Risk:** Thấp.
- **Priority:** P0.
- **Implementation dependency:** Phase 0 Tokens.

### Component 5: PageHeader
- **Current problem:** Mỗi trang tự tạo một kiểu tiêu đề riêng; trang thì có breadcrumbs, trang thì không; nút hành động chính đặt lung tung bên trái hoặc bên phải.
- **Proposed change:** Chuẩn hóa `@/components/layout/PageHeader.tsx` chuẩn 3 khu vực: Cột trái (Breadcrumb + Tiêu đề trang + Mô tả ngắn), Cột phải (Action Slot: Nút Thêm mới, Xuất Excel, Bộ lọc nhanh).
- **Affected component:** `@/components/layout/PageHeader.tsx`
- **Affected pages:** Tất cả các trang `/admin/*` và `/teacher/*`.
- **Affected roles:** Tất cả người dùng.
- **UI impact:** Cố định tiêu chuẩn thị giác trên đầu mọi trang làm việc.
- **Business logic impact:** Không (0%).
- **Risk:** Thấp.
- **Priority:** P1.
- **Implementation dependency:** Breadcrumb component.

### Component 6: FilterBar
- **Current problem:** Các ô lọc (Năm học, Cơ sở, Khối, Lớp, Học kỳ) chiếm từ 2 đến 3 dòng trên màn hình, đẩy bảng dữ liệu xuống quá sâu; thiếu nút "Đặt lại bộ lọc (Reset)".
- **Proposed change:** Tạo component `@/components/common/FilterBar.tsx` dạng thanh ngang co giãn thông minh, tự động thu gọn các bộ lọc phụ vào dropdown "Bộ lọc nâng cao" trên màn hình nhỏ kèm nút "Xóa bộ lọc".
- **Affected component:** `@/components/common/FilterBar.tsx`
- **Affected pages:** Danh sách dự giờ, Hồ sơ học sinh, Bảng điểm, Cố vấn.
- **Affected roles:** Tất cả người dùng.
- **UI impact:** Tiết kiệm 40% diện tích chiều dọc màn hình cho bảng dữ liệu.
- **Business logic impact:** Không (0%).
- **Risk:** Thấp.
- **Priority:** P1.
- **Implementation dependency:** Select / Combobox.

### Component 7: DataTable (Hệ thống Bảng Dữ liệu Chuẩn)
- **Current problem:** Bảng dữ liệu lớn bị giật lag khi render hàng trăm dòng; cuộn ngang bị mất cột Tên học sinh / Tên giáo viên; thiếu thanh tiến trình sắp xếp (Sorting indicator).
- **Proposed change:** Nâng cấp `@/components/ui/data-table.tsx` hỗ trợ: Sticky Header, Sticky First Column(s), Tích hợp phân trang tiêu chuẩn, Sắp xếp cột linh hoạt và trạng thái Skeleton Loading khi tải trang.
- **Affected component:** `@/components/ui/data-table.tsx`
- **Affected pages:** Ma trận chuyên môn TTCM, Bảng điểm học sinh, Danh sách phiếu dự giờ Admin.
- **Affected roles:** Tất cả người dùng.
- **UI impact:** Trải nghiệm cuộn mượt mà không mất dấu dòng dữ liệu trên laptop 1366x768.
- **Business logic impact:** Không (0%).
- **Risk:** Trung bình (cần đảm bảo tương thích với cấu trúc table HTML hiện tại).
- **Priority:** P0.
- **Implementation dependency:** Phase 0 CSS.

### Component 8: Modal & Dialog (Chống Clipping)
- **Current problem:** Form dài >1200px đẩy nút "Lưu / Hoàn thành" xuống đáy ngoài màn hình laptop; click trúng nền xám bên ngoài bị tắt mất dữ liệu.
- **Proposed change:** Chuẩn hóa `@/components/ui/modal-sheet.tsx` với cấu trúc 3 phần bắt buộc:
  - `ModalHeader` (Cố định ở trên)
  - `ModalBody` (Cuộn nội dung độc lập với thanh cuộn mượt `overflow-y-auto max-h-[calc(85vh-130px)]`)
  - `ModalFooter` (Cố định ở dưới đáy, luôn hiển thị nút Lưu nháp & Submit).
  - Tự động chặn click backdrop (`pointer-events-auto` có cảnh báo dirty-state).
- **Affected component:** `@/components/ui/dialog.tsx` / `modal.tsx`
- **Affected pages:** Phiếu chấm 11 tiêu chí K12, Biên bản cố vấn học tập, Tạo lịch thanh tra.
- **Affected roles:** Tất cả người dùng.
- **UI impact:** Loại bỏ hoàn toàn lỗi P0 nút bị che khuất; đảm bảo an toàn dữ liệu người dùng.
- **Business logic impact:** Không (0%).
- **Risk:** Thấp (cải thiện container, giữ nguyên nội dung form bên trong).
- **Priority:** P0.
- **Implementation dependency:** Dialog Radix.

### Component 9: Drawer / Sheet (Ngăn Kéo Nhanh)
- **Current problem:** Mọi chi tiết đều mở qua Modal chiếm trọn màn hình, làm mất ngữ cảnh của trang danh sách phía dưới.
- **Proposed change:** Chuẩn hóa `@/components/ui/drawer.tsx` (trượt mượt mà từ cạnh phải màn hình) dùng cho việc xem nhanh Hồ sơ tóm tắt học sinh trong lúc cố vấn hoặc xem lịch sử dự giờ mà không phải chuyển trang.
- **Affected component:** `@/components/ui/sheet.tsx`
- **Affected pages:** Cố vấn học tập, Sổ điểm, Bàn làm việc giáo viên.
- **Affected roles:** GV, TTCM, BGH.
- **UI impact:** Giữ vững ngữ cảnh làm việc liên tục cho người dùng.
- **Business logic impact:** Không (0%).
- **Risk:** Thấp.
- **Priority:** P1.
- **Implementation dependency:** Sheet Radix.

### Component 10: Tabs (Thanh Tab Thông Minh Chống Vỡ Dòng)
- **Current problem:** 9 tabs của Hồ sơ học sinh bị gãy thành 2 tầng trên màn hình laptop 1366px, che khuất nội dung trang.
- **Proposed change:** Xây dựng `@/components/ui/smart-tabs.tsx` hỗ trợ cuộn ngang mượt mà bằng 2 nút mũi tên chevron trái/phải (`<` và `>`) kèm hiệu ứng mờ 2 đầu (Gradient Fade indicator), hoặc chế độ "5 Tab chính + Menu Khác...".
- **Affected component:** `@/components/ui/smart-tabs.tsx`
- **Affected pages:** Hồ sơ học sinh (Admin & Teacher), Chi tiết chuyên môn.
- **Affected roles:** GV, BGH, Admin.
- **UI impact:** Thanh tab luôn nằm gọn gàng trên 1 dòng duy nhất ở mọi độ phân giải màn hình.
- **Business logic impact:** Không (0%).
- **Risk:** Thấp.
- **Priority:** P0.
- **Implementation dependency:** Radix Tabs.

### Component 11: EmptyState
- **Current problem:** Khi danh sách trống, bảng hiện một dòng chữ nhỏ "Không có dữ liệu" đơn điệu, không hướng dẫn người dùng cần làm gì tiếp theo.
- **Proposed change:** Chuẩn hóa `@/components/common/EmptyState.tsx` gồm: Minh họa icon trang nhã, Tiêu đề thân thiện (ví dụ: "Chưa có tiết dạy nào được đăng ký tuần này"), và Nút hành động trực tiếp (CTA: "+ Đăng ký ngay").
- **Affected component:** `@/components/common/EmptyState.tsx`
- **Affected pages:** Bảng danh sách dự giờ, Hàng đợi cố vấn, Sổ điểm.
- **Affected roles:** Tất cả người dùng.
- **UI impact:** Tăng tính dẫn dắt và thân thiện cho giáo viên mới sử dụng hệ thống.
- **Business logic impact:** Không (0%).
- **Risk:** Không có rủi ro.
- **Priority:** P2.
- **Implementation dependency:** Button component.

### Component 12: LoadingState (Skeleton Shimmer)
- **Current problem:** Dùng spinner quay tròn đơn điệu hoặc màn hình trắng xóa khi chuyển tab hay fetch dữ liệu.
- **Proposed change:** Chuẩn hóa `@/components/common/TableSkeleton.tsx` và `@/components/common/CardSkeleton.tsx` với hiệu ứng quét sáng (Shimmer), mô phỏng đúng cấu trúc dữ liệu sắp tải về.
- **Affected component:** `@/components/ui/skeleton.tsx`
- **Affected pages:** Toàn bộ hệ thống.
- **Affected roles:** Tất cả người dùng.
- **UI impact:** Giảm thời gian chờ đợi cảm nhận (Perceived Performance), tránh giật cục giao diện.
- **Business logic impact:** Không (0%).
- **Risk:** Không có rủi ro.
- **Priority:** P2.
- **Implementation dependency:** CSS Shimmer Animation.

### Component 13: ErrorState & ErrorBoundary
- **Current problem:** Khi API lỗi mạng hoặc server trả về 500, cả trang bị trắng xóa (White Screen of Death) hoặc báo lỗi alert thô.
- **Proposed change:** Xây dựng `@/components/common/ModuleErrorBoundary.tsx` bắt lỗi cục bộ của từng Widget, hiển thị giao diện báo lỗi lịch sự kèm nút "Thử tải lại (Retry)" mà không làm sập toàn bộ ứng dụng.
- **Affected component:** `@/components/common/ModuleErrorBoundary.tsx`
- **Affected pages:** Tất cả các phân hệ.
- **Affected roles:** Tất cả người dùng.
- **UI impact:** Bảo vệ hệ thống khỏi hiện tượng crash toàn màn hình.
- **Business logic impact:** Không (0%).
- **Risk:** Thấp.
- **Priority:** P1.
- **Implementation dependency:** React Error Boundary.

---

## 3. CHUẨN HÓA KHUNG ĐIỀU HƯỚNG TOÀN CỤC — GLOBAL LAYOUT (PHASE 2)

```
+-----------------------------------------------------------------------------+
|  HEADER: [Logo Sky-Line] [Năm học: 2026-2027 ▼] [Cơ sở: Toàn trường ▼] [User] |
+-------------+---------------------------------------------------------------+
|  SIDEBAR    |  BREADCRUMB: Trang chủ / Dự giờ / Đánh giá tiết dạy           |
|  (240px     |  PAGE HEADER: Đánh giá Tiết dạy Toán 10A1     [Nút Hành Động] |
|   Collapsible)--------------------------------------------------------------|
|  • Dashboard|  PAGE CONTAINER (Tự động thích ứng, chống cuộn kép):          |
|  • Dự giờ   |  +----------------------------------------------------------+ |
|  • Hồ sơ HS |  | Nội dung làm việc chính (Bảng, Form, Biểu đồ)             | |
|  • Sổ điểm  |  +----------------------------------------------------------+ |
+-------------+---------------------------------------------------------------+
```

1. **Header Toàn cục:** Đặt duy nhất 1 bộ chọn Năm học & Học kỳ tại Header. Triệt tiêu hoàn toàn các selector năm học trùng lặp bên trong Page Body.
2. **Sidebar Điều hướng:** Hỗ trợ thu gọn thành dạng icon (Compact Rail: 64px) khi người dùng làm việc với bảng dữ liệu lớn (như Bảng ma trận 12 tháng hoặc Sổ điểm) để tăng diện tích hiển thị.
3. **Shell Chống Cuộn Kép (No Double Scrollbars):** Thiết lập `h-screen flex flex-col overflow-hidden` cho layout mẹ; nội dung trang chỉ cuộn bên trong `main overflow-y-auto`.
