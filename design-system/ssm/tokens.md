# SSM DESIGN TOKENS SPECIFICATION
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Phạm vi:** CSS Variables, Tailwind v4 Tokens, Semantic Color Mapping  

---

## 1. MÀU SẮC THƯƠNG HIỆU (BRAND IDENTITY: DEEP PINE)

Màu nhận diện chủ đạo của Sky-Line SSM là **Deep Pine (`#003B3A`)** — gam màu xanh thông trầm tĩnh, tạo cảm giác tin cậy, sư phạm chuẩn mực và học thuật vững bền.

```css
:root {
  /* Brand Core */
  --primary: #003B3A;             /* Sky-Line Deep Pine */
  --primary-hover: #004D4B;       /* Deep Pine Hover */
  --primary-active: #002827;      /* Deep Pine Active */
  --primary-foreground: #FFFFFF;  /* Chữ trắng tương phản 11.2:1 */

  /* Surfaces & Backgrounds */
  --background: #F8FAFC;          /* Nền trang Slate-50 dịu mắt */
  --surface: #FFFFFF;             /* Nền Card / Table */
  --surface-secondary: #F1F5F9;   /* Nền Muted Section */

  /* Borders & Dividers */
  --border: #E2E8F0;              /* Viền mỏng chuẩn (Slate-200) */
  --border-strong: #CBD5E1;       /* Viền đậm khi active (Slate-300) */

  /* Typography Colors */
  --text-primary: #0F172A;        /* Chữ tiêu đề chính (Slate-900) */
  --text-secondary: #475569;      /* Chữ nội dung (Slate-600) */
  --text-muted: #64748B;          /* Chữ ghi chú, placeholder (Slate-500) */
}
```

---

## 2. STATUS SEMANTIC COLOR TOKENS

```css
:root {
  /* Success: Hoàn thành / Tốt / Đạt chỉ tiêu */
  --success: #16A34A;
  --success-background: #F0FDF4;

  /* Warning: Chờ duyệt / Sắp hết hạn / Cần theo dõi */
  --warning: #D97706;
  --warning-background: #FFFBEB;

  /* Error / Danger: Quá hạn / Từ chối / Chưa đạt / SOS */
  --error: #DC2626;
  --error-background: #FEF2F2;

  /* Info: Đang thực hiện / Thông tin mới */
  --info: #0284C7;
  --info-background: #F0F9FF;
}
```

---

## 3. THANG KÍCH THƯỚC CHỮ (TYPOGRAPHY SCALE)

Phông chữ hệ thống: `Inter`, `Be Vietnam Pro`, `Segoe UI`, `system-ui`.

| Cấp bậc (Level) | Tailwind Class | Kích thước / Line-height | Trọng lượng (Weight) | Ứng dụng |
|---|---|---|---|---|
| **Display / Page Title** | `text-xl sm:text-2xl` | 24px / 32px | `font-bold` | Tiêu đề trang, Header chính |
| **Section Title** | `text-base sm:text-lg` | 18px / 26px | `font-bold` | Tiêu đề khối Card, Nhóm tiêu chí |
| **Subsection / Card Title**| `text-sm sm:text-base` | 16px / 24px | `font-semibold` | Tiêu đề phụ, Form section |
| **Body (Văn bản chính)** | `text-xs sm:text-sm` | 14px / 20px | `font-normal` | Nội dung nhận xét, Cell dữ liệu |
| **Label / Form Heading** | `text-xs` | 12px / 16px | `font-semibold` | Nhãn trường nhập liệu |
| **Caption / Help Text** | `text-[11px] sm:text-xs` | 12px / 16px | `font-medium` | Ghi chú hướng dẫn, Error inline |
| **Metrics / Code** | `font-mono tabular-nums`| 14px - 28px | `font-bold` | Điểm số, Mã học sinh, Thời gian |

---

## 4. SPACING, RADIUS & SHADOW SCALE

### Spacing Scale (Cơ sở 4px):
- `space-1 (4px)`: Khoảng cách giữa icon và label nhỏ.
- `space-2 (8px)`: Padding trong nút nhỏ, khoảng cách giữa các badge.
- `space-3 (12px)`: Padding trong button chuẩn, khoảng cách giữa các input liền kề.
- `space-4 (16px)`: Padding trong card tiêu chuẩn, margin giữa các section nhỏ.
- `space-6 (24px)`: Khoảng cách giữa các khối lớn trên Dashboard.

### Radius Scale:
- `rounded-lg (8px)`: Nút nhỏ, input field nhỏ, dropdown item.
- `rounded-xl (12px)`: Nút chuẩn, Input chuẩn, Card nhỏ.
- `rounded-2xl (16px)`: Card chính, Modal dialog, Drawer panel.
- `rounded-full`: Avatar, Status badge pill.

### Shadow Scale:
- `shadow-2xs`: Viền đổ bóng siêu mịn cho thẻ dữ liệu phẳng.
- `shadow-xs`: Đổ bóng cho Button hover và Table header.
- `shadow-md`: Popover lịch, Dropdown menu.
- `shadow-xl`: Modal Dialog trung tâm.
- `shadow-2xl`: Drawer trượt cạnh phải.
