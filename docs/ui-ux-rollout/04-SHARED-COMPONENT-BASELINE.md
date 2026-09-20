# BẢNG THÀNH PHẦN DÙNG CHUNG CƠ SỞ (SHARED COMPONENT BASELINE)
## Thư viện Component Chuẩn hóa Toàn Hệ thống SSM

---

### 1. DANH MỤC THÀNH PHẦN CHUẨN HÓA

Toàn bộ các phân hệ của SSM bắt buộc phải kế thừa các component được cung cấp sẵn tại `src/components/ui/` và `src/components/layout/`:

| Component | Vị trí định nghĩa | Trách nhiệm chính |
| :--- | :--- | :--- |
| **AppShell / PageContainer** | `src/components/layout/AppShell.tsx` | Bao bọc khung trang, chuẩn hóa lề hai bên, căn giữa nội dung và kiểm soát khoảng cách phân vùng |
| **Button** | `src/components/ui/button.tsx` | Nút bấm thao tác chuẩn hóa (Primary Deep Pine, Secondary, Destructive, Ghost, Outline, Subtle); tích hợp slot Icon và tự động xoay Spinner khi `isLoading={true}` |
| **Input** | `src/components/ui/input.tsx` | Ô nhập liệu một dòng; hỗ trợ Prefix/Suffix icon, trạng thái `isError`, bo góc và viền focus Deep Pine |
| **Textarea** | `src/components/ui/textarea.tsx` | Ô nhập văn bản dài; hỗ trợ `isError`, tự co giãn hoặc min-height chuẩn |
| **Select** | `src/components/ui/select.tsx` | Hộp chọn giá trị đơn kèm mũi tên điều hướng tích hợp sẵn; đồng bộ chiều cao 40px/36px |
| **FormField** | `src/components/ui/form-field.tsx` | Bọc nhãn (Label), đánh dấu bắt buộc (`*`), hướng dẫn (Help Text) và thông báo lỗi (Error) chuẩn trợ năng |
| **Badge & StatusBadge** | `src/components/ui/badge.tsx` | Nhãn phân loại và nhãn trạng thái nghiệp vụ chuẩn hóa với chấm tròn trạng thái (Dot indicator) |
| **FilterBar** | `src/components/ui/FilterBar.tsx` | Thanh công cụ lọc dữ liệu: Ô tìm kiếm từ khóa, các dropdown phân loại, nút Đặt lại và đếm kết quả |
| **DetailDrawer** | `src/components/ui/drawer.tsx` | Khung trượt từ cạnh phải (Slide-over panel) hiển thị chi tiết hồ sơ/bản ghi mà không chuyển trang |
| **Dialog / Modal** | `src/components/ui/dialog.tsx` | Hộp thoại xác nhận hoặc nhập liệu nhanh; có tính năng chống đóng ngoài ý muốn `disableBackdropClick` |
| **EmptyState** | `src/components/ui/EmptyState.tsx` | Hiển thị màn hình rỗng chuẩn với 5 kịch bản (Không có dữ liệu, Không tìm thấy, Chưa cấu hình, Không có quyền...) |
| **LoadingState** | `src/components/ui/LoadingState.tsx` | Spinner tải trang và Skeleton giả lập dữ liệu bảng/thẻ |
| **ErrorState** | `src/components/ui/ErrorState.tsx` | Hiển thị lỗi kết nối mạng hoặc lỗi truy vấn dữ liệu kèm nút Thử lại (Retry) |

---

### 2. NGUYÊN TẮC TẠO COMPONENT MODULE-SPECIFIC

Chỉ được tạo component đặc thù riêng cho một module khi thỏa mãn **toàn bộ 3 điều kiện**:
1. Nghiệp vụ hoàn toàn đặc thù (ví dụ: Biểu đồ Radar năng lực học sinh `StudentCompetencyPortfolio`, Khung in A4 `PrintClient`, Ma trận đề thi).
2. Shared Component hiện có không thể đáp ứng được thông qua việc cấu hình props hoặc slots.
3. Việc cố gắng gộp chung vào Shared Component sẽ làm phức tạp hóa component gốc một cách không cần thiết.

Mọi component module-specific đều phải được ghi rõ lý do trong tài liệu `03-COMPONENT-MAP.md` của Wave tương ứng.\n