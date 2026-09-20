# 03. KIỂM KÊ LINH KIỆN GIAO DIỆN (COMPONENT INVENTORY)
## PHÂN LOẠI NỀN TẢNG, CHIA SẺ VÀ CHUYÊN BIỆT THEO PHÂN HỆ

---

### 1. Phân loại theo Tầng Kiến trúc
```text
FOUNDATION LAYER (src/components/ui/)
  ├── Button, IconButton, FormField, Input, Textarea, Select
  ├── StatusBadge, Tag, DataTable, Pagination
  ├── Modal, Dialog, ConfirmDialog, DetailDrawer
  └── EmptyState, ErrorState, LoadingState, Tabs, FilterBar
        ↓
MODULE EXTENSIONS LAYER
  ├── src/components/advisory/ (7 components)
  ├── src/components/support/ (6 components)
  ├── src/components/experiential/ (8 components)
  ├── src/components/testing/ (10 components)
  └── src/components/dashboard/ (10 components)
```

### 2. Tiêu chí Đánh giá Linh kiện
- **100% Component mới tuân thủ Design Tokens**: Sử dụng biến màu `Deep Pine` và bảng màu ngữ nghĩa chuẩn.
- **Tách biệt rõ ràng Presentation và Business Logic**: Các phép tính toán phức tạp (như tính GAP, tính điểm trung bình trọng số rubric, phân tích phổ điểm) đều được ủy quyền cho các service tương ứng trong `src/lib/`.
