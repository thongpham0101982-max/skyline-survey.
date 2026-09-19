# SSM DESIGN SYSTEM & FOUNDATION TOKENS PLAN (PHASE 0)
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Kế hoạch Chuẩn hóa:** Design Tokens, Bảng màu Semantic, Typography Scale, Spacing & Breakpoints  
**Trạng thái Thực hiện:** PLANNING ONLY (READ-ONLY)

---

## 1. HỆ THỐNG MÀU SẮC THƯƠNG HIỆU & SEMANTIC TOKENS

Sky-Line School Management cần phản ánh rõ nét tính nhận diện sư phạm cao cấp, trang nhã, hiện đại và tin cậy. Bảng màu được chuẩn hóa theo 3 tầng token: Primitive -> Semantic -> Component.

### 1.1. Brand Identity Colors (Màu thương hiệu Sky-Line)
- **Primary Navy (`skyline-navy`):**
  - `navy-900`: `#001A38` (Chữ tiêu đề đậm, Header cao cấp)
  - `navy-800`: `#002D62` (**Màu chủ đạo thương hiệu - Primary Brand Color**)
  - `navy-700`: `#0A3F82` (Hover state của nút chính)
  - `navy-100`: `#E6EDF5` (Nền sáng của badge, icon container)
  - `navy-50`:  `#F0F4F9` (Nền nhạt của active menu item)
- **Accent Gold (`skyline-gold`):**
  - `gold-600`: `#B89320` (Viền nhấn, badge sao thành tích)
  - `gold-500`: `#D4AF37` (**Màu nhấn thương hiệu - Brand Accent Color**)
  - `gold-400`: `#E2C35D` (Hover state)
  - `gold-100`: `#FBF5E2` (Nền badge khen thưởng, điểm danh dự)
  - `gold-50`:  `#FDFBF4` (Highlight nhẹ)

### 1.2. Status & Alert Semantic Tokens (Màu ngữ nghĩa trạng thái)
Khắc phục triệt để lỗi lạm dụng màu sắc tùy tiện trong các thẻ KPI và Badge:
- **Success (Thành công / Hoàn thành / Tốt / Xếp loại Giỏi):**
  - Text: `text-emerald-700`, Nền: `bg-emerald-50`, Viền: `border-emerald-200`.
- **Warning (Cảnh báo / Sắp hết hạn / Cần theo dõi / Khá):**
  - Text: `text-amber-700`, Nền: `bg-amber-50`, Viền: `border-amber-200`.
- **Destructive / Danger (Lỗi / Chưa đạt / Hủy bỏ / Kỷ luật):**
  - Text: `text-rose-700`, Nền: `bg-rose-50`, Viền: `border-rose-200`.
- **Info (Thông tin / Đang diễn ra / Chờ duyệt):**
  - Text: `text-sky-700`, Nền: `bg-sky-50`, Viền: `border-sky-200`.
- **SOS Critical (Cảnh báo khẩn cấp Cố vấn học thuật / Tâm lý):**
  - Text: `text-red-900`, Nền: `bg-red-100`, Viền: `border-red-400` kèm hiệu ứng viền nổi bật.

---

## 2. QUY CHUẨN TYPOGRAPHY (KIỂU CHỮ & THANG KÍCH THƯỚC)

- **Phông chữ chủ đạo:** `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` (đảm bảo hiển thị tiếng Việt hoàn hảo, dấu thanh rõ ràng, không bị lỗi dính dấu trên Windows).
- **Thang kích thước chuẩn:**
  - `Display / Page Title`: `text-2xl font-bold tracking-tight text-navy-900` (24px / line-height 32px).
  - `Section Title / Card Header`: `text-lg font-semibold text-slate-800` (18px / line-height 24px).
  - `Subsection / Subhead`: `text-base font-medium text-slate-700` (16px / line-height 22px).
  - `Body Text (Văn bản chính)`: `text-sm font-normal text-slate-600 leading-relaxed` (14px / line-height 20px).
  - `Data Table Cells / Form Inputs`: `text-sm text-slate-800` (14px).
  - `Caption / Helper Text / Badges`: `text-xs font-medium text-slate-500` (12px / line-height 16px).
  - `Numbers & Metrics`: `font-mono font-bold` cho điểm số, mã học sinh, thời gian để thẳng cột.

---

## 3. THANG KHOẢNG CÁCH (SPACING), BO GÓC (RADIUS) & ĐỔ BÓNG (SHADOW)

### 3.1. Spacing Scale (Hệ số cơ sở 4px)
- `4px (space-1)`: Khoảng cách giữa icon và chữ nhỏ trong badge.
- `8px (space-2)`: Khoảng cách giữa các nút bấm phụ trợ, padding trong ô input nhỏ.
- `12px (space-3)`: Padding trong button chuẩn, khoảng cách giữa các trường form liền kề.
- `16px (space-4)`: Padding trong thẻ Card tiêu chuẩn, khoảng cách giữa các cột bảng.
- `24px (space-6)`: Khoảng cách giữa các khối Card lớn trên Dashboard.
- `32px (space-8)`: Khoảng cách phân cách giữa các Section chính của trang.

### 3.2. Border Radius Scale
- `rounded-sm (4px)`: Checkbox, radio container, tag siêu nhỏ.
- `rounded-md (6px)`: Form inputs, dropdown select, nút bấm (Button).
- `rounded-lg (8px)`: Thẻ Card, Modal header, Toast thông báo.
- `rounded-xl (12px)`: Modal lớn, Drawer panel, Banner tổng quan.
- `rounded-full`: Avatar học sinh/giáo viên, Status pill badges.

### 3.3. Elevation & Shadow Scale
- `shadow-none`: Dành cho giao diện phẳng tối giản.
- `shadow-xs`: Viền mờ cho ô Input khi unfocused.
- `shadow-sm`: Thẻ Card danh sách, Table rows khi hover.
- `shadow-md`: Dropdown menus, Popover lịch dạy, Select picker popup.
- `shadow-lg`: Sticky Header, Sticky Action Footer của modal đánh giá.
- `shadow-2xl`: Toàn bộ lớp phủ Dialog / Modal trung tâm.

---

## 4. CHUẨN HÓA THƯ VIỆN BIỂU TƯỢNG (ICONS)

Thống nhất sử dụng duy nhất bộ thư viện **`lucide-react`**:
- **Quy chuẩn kích thước Icon:**
  - `14px (h-3.5 w-3.5)`: Icon phụ trợ trong Badge trạng thái.
  - `16px (h-4 w-4)`: Icon đi kèm chữ trong Button, Input prefix icon, Breadcrumbs.
  - `20px (h-5 w-5)`: Icon trên Sidebar Navigation, Header Actions, Tab items.
  - `24px (h-6 w-6)`: Icon đại diện cho Section Cards, Empty State illustrations.
- **Quy tắc phối hợp Icon:** Tuyệt đối không dùng icon trần trụi thiếu nhãn (`aria-label`) hoặc tooltip giải thích chức năng.

---

## 5. MÔ PHỎNG ĐIỂM NGẮT MÀN HÌNH (RESPONSIVE BREAKPOINTS)

Đặc thù môi trường học đường tại Sky-Line: 65% giáo viên sử dụng laptop màn hình nhỏ (1366x768 hoặc 1280x800), 25% dùng máy bàn văn phòng (1920x1080), và 10% Ban giám hiệu sử dụng iPad/Tablet khi đi thị sát dự giờ.

```
+-----------------------------------------------------------------------------+
|  QUY CHUẨN BREAKPOINTS SSM:                                                 |
|  - Mobile:       < 640px    (sm)  ── Xem thông báo, duyệt nhanh ca SOS      |
|  - Tablet:       640 - 1023px (md)── Điểm danh, ghi chú dự giờ tại lớp     |
|  - Laptop Chuẩn: 1024 - 1366px(lg)── [TRỌNG TÂM TỐI ƯU] Form chấm, Ma trận  |
|  - Desktop:      > 1366px   (xl)  ── Báo cáo tổng thể BGH, Sổ điểm lớn      |
+-----------------------------------------------------------------------------+
```

### Kế hoạch tích hợp vào `tailwind.config.ts`:
Bổ sung các custom color tokens (`skyline-navy`, `skyline-gold`) và semantic mappings vào file cấu hình Tailwind hiện tại mà không làm ghi đè hay mất đi các utility classes hiện có của dự án.
