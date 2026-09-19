# SSM ACCESSIBILITY (A11Y) SPECIFICATION
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Tiêu chuẩn hướng tới:** WCAG 2.1 Cấp độ AA  

---

## 1. CÁC QUY TẮC BẮT BUỘC TRONG COMPONENT

1. **Visible Focus Ring:** Tất cả các thành phần tương tác (Button, Input, Select, Link) khi nhận focus qua phím `Tab` phải hiển thị viền sáng rõ nét: `focus-visible:ring-2 focus-visible:ring-[#003B3A]/20 focus-visible:border-[#003B3A]`.
2. **Aria Labels cho Icon Buttons:** Mọi nút bấm chỉ có icon (nút Đóng modal, nút Xóa, nút menu ba chấm) phải có thuộc tính `aria-label="Tên hành động"` rõ ràng.
3. **Liên kết Nhãn và Trường nhập (Form Association):** Sử dụng component `FormField` để liên kết `label htmlFor="field-id"` với `input id="field-id"`.
4. **Kích thước vùng bấm tối thiểu (Minimum Tap Target):** Nút bấm và vùng chọn có kích thước tối thiểu `32px x 32px` (chuẩn web là `h-8` đến `h-10`).
