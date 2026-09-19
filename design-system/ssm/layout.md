# SSM GLOBAL LAYOUT SPECIFICATION
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Phạm vi:** AppShell, Sidebar, Header, Breadcrumbs, Page Container  

---

## 1. KIẾN TRÚC KHUNG ỨNG DỤNG (APPLICATION SHELL)

Hệ thống sử dụng bố cục khung cố định (Fixed Shell) chống hiện tượng thanh cuộn kép:

```
+-----------------------------------------------------------------------------+
|  HEADER (Cao 56px - Cố định trên đỉnh)                                      |
|  [Logo Sky-Line] ── [Selector Năm học & Cơ sở Toàn cục] ── [Thông báo] [User]|
+-------------+---------------------------------------------------------------+
|  SIDEBAR    |  PAGE WRAPPER (Cuộn độc lập `overflow-y-auto`)                 |
|  (240px     |                                                               |
|   hoặc 64px |  1. BREADCRUMBS: Trang chủ / Phân hệ / Màn hình chi tiết       |
|   khi gập)  |  2. PAGE HEADER: Tiêu đề trang + Mô tả + Primary Action       |
|             |  3. FILTER BAR: Bộ lọc tìm kiếm trang                         |
|             |  4. MAIN CONTENT AREA: Bảng dữ liệu / Biểu đồ / Form           |
+-------------+---------------------------------------------------------------+
```

---

## 2. QUY CHUẨN HEADER VÀ SIDEBAR

- **Global Header:**
  - Nơi duy nhất chứa bộ chọn Năm học và Cơ sở trường học.
  - Không lặp lại bộ chọn năm học bên trong Page Body.
- **Sidebar Điều hướng:**
  - Giữ nguyên toàn bộ cấu trúc menu và phân quyền nghiệp vụ hiện hữu.
  - Trạng thái Active menu item: Nền Deep Pine nhạt `bg-[#003B3A]/10`, chữ `text-[#003B3A] font-bold`, viền nhấn bên trái `border-l-4 border-[#003B3A]`.
  - Hỗ trợ thu gọn dạng đường ray nhỏ (Rail 64px) để giải phóng không gian cho màn hình 1366x768 khi làm việc với bảng lớn.
