# SSM IMPLEMENTATION REPORT: SHARED COMPONENTS FOUNDATION
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Tài liệu:** Báo cáo Chuẩn hóa và Khởi tạo Thư viện UI Primitives Dùng chung  

---

## 1. DANH SÁCH COMPONENT ĐÃ ĐƯỢC CHUẨN HÓA VÀ KHỞI TẠO

Toàn bộ các component cơ sở đã được nâng cấp hoặc khởi tạo mới trong `src/components/ui/` và `src/components/layout/`:

1. **`button.tsx`:** Nâng cấp variant `primary` (Deep Pine `#003B3A`), hỗ trợ `isLoading` có spinner, `leftIcon`, `rightIcon`. Giữ nguyên mọi variant cũ (`default`, `skyline`, `secondary`, `destructive`).
2. **`badge.tsx`:** Nâng cấp variant `pine`, `success`, `warning`, `error`, `information`, `neutral`. Bổ sung component helper `StatusBadge` tự động phân tích và hiển thị trạng thái chuẩn.
3. **`input.tsx`:** Khởi tạo Input chuẩn với slot icon `prefixIcon`/`suffixIcon`, prop `isError` và focus ring Deep Pine.
4. **`textarea.tsx`:** Khởi tạo Textarea chuẩn đồng bộ kiểu dáng với Input.
5. **`select.tsx`:** Khởi tạo Select dropdown chuẩn kèm icon `ChevronDown`.
6. **`form-field.tsx`:** Khởi tạo `FormField` trừu tượng hóa Label + Required (*) + Control + Error message.
7. **`EmptyState.tsx`:** Nâng cấp hỗ trợ 5 variants nghiệp vụ (`default`, `no-data`, `no-result`, `no-permission`, `not-configured`) với Deep Pine icon badge.
8. **`LoadingState.tsx`:** Khởi tạo `LoadingSpinner`, `Skeleton`, `TableSkeleton`, `CardSkeleton`.
9. **`ErrorState.tsx`:** Khởi tạo `InlineError`, `PageError`, `NetworkError`.
10. **`FilterBar.tsx`:** Khởi tạo thanh lọc thông minh tích hợp tìm kiếm và nút đặt lại bộ lọc.
11. **`drawer.tsx`:** Khởi tạo `DetailDrawer` (ngăn kéo trượt cạnh phải) hỗ trợ xem chi tiết mà không rời trang.
12. **`dialog.tsx`:** Nâng cấp Modal Dialog hỗ trợ `footer` dính đáy và `disableBackdropClick` bảo vệ dữ liệu.
13. **`AppShell.tsx`:** Khởi tạo `PageContainer` và `ContentSection` chuẩn hóa bố cục trang.

---

## 2. NGUYÊN TẮC KHÔNG DUPLICATE MÃ NGUỒN

Tất cả các component mới đều đặt tại vị trí quy chuẩn `@/components/ui/` hoặc `@/components/layout/`. Không tạo các biến thể song song như `ButtonV2` hay `NewButton`.
