# MA TRẬN CHUYỂN ĐỔI LINH KIỆN (COMPONENT MIGRATION MATRIX)
## ÁNH XẠ GIỮA LINH KIỆN DI SẢN VÀ LINH KIỆN CHUẨN HÓA

---

| Linh kiện Di sản (Legacy) | Linh kiện Chuẩn hóa (Canonical) | Tình trạng sử dụng | Mức độ an toàn | Hướng dẫn chuyển đổi |
|---|---|:---:|:---:|---|
| Custom inline buttons | `Button` (`@/components/ui/button`) | Thay thế 100% | An toàn | Kế thừa props `variant="primary"` hoặc `default` |
| Custom status span tags | `StatusBadge` (`@/components/ui/badge`) | Thay thế 100% | An toàn | Truyền `status` ngữ nghĩa và `label` hiển thị |
| Custom popup modal divs | `DetailDrawer` (`@/components/ui/drawer`) | Thay thế 100% | An toàn | Trượt từ bên phải qua props `open` và `onOpenChange` |
| Bảng table HTML thuần | `DataTable` (`@/components/ui/data-table`) | Thay thế 95% | An toàn | Bọc trong container với sticky header/column |
