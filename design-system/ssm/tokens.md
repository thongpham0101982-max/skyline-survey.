# SSM DESIGN TOKENS SPECIFICATION
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Phạm vi:** CSS Variables, Tailwind v4 Tokens, Semantic Color Mapping  

---

## 1. MÀU SẮC THƯƠNG HIỆU (OFFICIAL SKY-LINE BRAND IDENTITY)

Màu nhận diện thương hiệu chính thức của Sky-Line theo bộ nhận diện chuẩn (`FILE LOGO SKL.pdf`):
- **Official Brand Teal (`#00A19A`)**: CMYK: `84, 13, 46, 0` | RGB: `0, 161, 154` — Sắc ngọc bích tươi sáng của biểu tượng cánh chim Sky-Line, ứng dụng cho nút bấm chính, logo, điểm nhấn thương hiệu.
- **Deep Pine (`#003B3A`)**: Gam xanh thông trầm tĩnh cho Sidebar, Header trang trọng và thanh điều hướng.

```css
:root {
  /* Brand Core */
  --primary: #00A19A;             /* Sky-Line Official Brand Teal (RGB: 0, 161, 154) */
  --primary-hover: #008B85;       /* Tương tác hover trên Web & Touch */
  --primary-active: #00736E;      /* Tương tác active/nhấn */
  --primary-foreground: #FFFFFF;  /* Chữ trắng tương phản cao */
  --brand-pine: #003B3A;          /* Sky-Line Deep Pine */
  --brand-teal: #00A19A;          /* Mã chuẩn thương hiệu gốc */
  --brand-teal-accessible: #00736E; /* WCAG 2.1 AA text (4.6:1 trên nền trắng) */
  --brand-teal-light: #F0FDFA;    /* Nền thẻ dịu mắt */

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

Phông chữ nhận diện thương hiệu Sky-Line: **`Open Sans`** (Google Fonts hỗ trợ tiếng Việt đầy đủ), kết hợp fallback `Be Vietnam Pro`, `Segoe UI`, `system-ui`. Trọng số chuẩn hóa: Light (300), Regular (400), Medium (500), SemiBold (600), Bold (700), ExtraBold (800).

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
