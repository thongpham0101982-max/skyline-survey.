# SSM IMPLEMENTATION REPORT: MIGRATION GUIDE
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Tài liệu:** Hướng dẫn Di chuyển Dần (Gradual Migration) sang Chuẩn UI Mới  

---

## 1. QUY TẮC DI CHUYỂN AN TOÀN

1. **Không thay thế ồ ạt:** Các trang hiện tại đang chạy ổn định KHÔNG bị buộc phải thay thế ngay lập tức.
2. **Áp dụng theo từng Module:** Bắt đầu bằng phân hệ **Dự giờ & Phát triển chuyên môn (Pilot Module)**.
3. **Cách sử dụng Component mới trong các trang nghiệp vụ:**

### Ví dụ 1: Sử dụng StatusBadge
```tsx
// Trước đây:
<span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Chờ duyệt</span>

// Bây giờ:
import { StatusBadge } from "@/components/ui/badge";
<StatusBadge status="Chờ duyệt" />
```

### Ví dụ 2: Sử dụng FormField và Input
```tsx
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

<FormField label="Họ và tên giáo viên" required error={errors.teacherName}>
  <Input
    value={name}
    onChange={(e) => setName(e.target.value)}
    isError={!!errors.teacherName}
    placeholder="Nhập tên giáo viên..."
  />
</FormField>
```

### Ví dụ 3: Sử dụng Dialog có Sticky Footer
```tsx
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

<Dialog
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Đánh giá tiết dạy"
  disableBackdropClick={true}
  footer={
    <>
      <Button variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
      <Button variant="primary" onClick={handleSave}>Lưu đánh giá</Button>
    </>
  }
>
  {/* Nội dung form tự cuộn mượt mà */}
</Dialog>
```
