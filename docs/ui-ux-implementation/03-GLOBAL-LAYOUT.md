# SSM IMPLEMENTATION REPORT: GLOBAL LAYOUT FOUNDATION
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Tài liệu:** Báo cáo Quy chuẩn Khung Ứng dụng Toàn cục  

---

## 1. CÁC THÀNH PHẦN LAYOUT ĐÃ THIẾT LẬP

1. **`PageContainer`:** Cung cấp khung bao bọc nội dung trang responsive (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6`), căn chỉnh đồng bộ cho cả phân hệ Admin và Teacher.
2. **`ContentSection`:** Khối phân vùng nội dung chuẩn hóa với Tiêu đề, Mô tả và Action slot bên phải.
3. **`PageHeader`:** Tận dụng component có sẵn tại `src/components/PageHeader.tsx`, chuẩn bị cho việc kết nối Breadcrumbs và Primary Action đồng nhất.
4. **Chiến lược Shell chống Cuộn Kép:** Đảm bảo thanh cuộn trang chính nằm trong `PageContainer`, không xung đột với Sidebar.
