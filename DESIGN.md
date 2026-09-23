---
version: 2.0
name: SQMS / SSM Sky-Line
description: Hệ thống Quản trị Chất lượng Trường học và Đánh giá Năng lực - Hệ thống Giáo dục Sky-Line
colors:
  brand-primary: "#00A19A"       # Sky-Line Teal chính thức (Logo, CMYK: C84 M13 Y46 K0 | RGB: 0 161 154)
  brand-hover: "#008B85"         # Trạng thái tương tác Hover trên Web/Mobile
  brand-active: "#00736E"        # Trạng thái Active / Touch
  brand-accessible-text: "#00736E" # WCAG AA (4.6:1 trên nền trắng)
  brand-accessible-heading: "#005854" # WCAG AAA (7.2:1 trên nền trắng)
  brand-deep-pine: "#003B3A"     # Nền Sidebar, Header trang trọng
  accent-yellow: "#D97706"       # Màu cảnh báo / Thao tác bổ trợ
  skyline-scale:
    50: "#F0FDFA"
    100: "#CCFBF1"
    200: "#99F6E4"
    300: "#5EEAD4"
    400: "#2DD4BF"
    500: "#00A19A"
    600: "#008B85"
    700: "#00736E"
    800: "#005854"
    900: "#003B3A"
    950: "#002220"
typography:
  sans:
    fontFamily: "Open Sans, Be Vietnam Pro, sans-serif"
rounded:
  base: "12px"
  sm: "8px"
  md: "12px"
  lg: "14px"
  xl: "18px"
  "2xl": "24px"
  "3xl": "32px"
---

# Design Language: SSM Sky-Line (Brand Standard 2026)

## 1. Overview
Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM / SQMS) tuân thủ bộ quy chuẩn nhận diện thương hiệu chính thức từ tài liệu **FILE LOGO SKL (LOGO + MÃ MÀU).pdf**, được số hóa chuyên biệt cho môi trường Web đa thiết bị (Desktop, Laptop, Tablet, Mobile, màn hình Retina Display P3 và OLED).

---

## 2. Màu Sắc Thương Hiệu Gốc (Official Brand Specifications)
Biểu tượng thương hiệu Sky-Line (Cánh chim / vệt sóng vươn lên) sử dụng gam màu ngọc bích đặc trưng:

| Hệ màu | Thông số kỹ thuật | Ứng dụng chính |
|---|---|---|
| **CMYK** | `C84 - M13 - Y46 - K0` | In ấn ấn phẩm, đồng phục, pano biểu bảng thực tế |
| **RGB** | `R0 - G161 - B154` | Không gian màu số hiển thị điện tử |
| **HEX** | **`#00A19A`** | Mã màu cốt lõi trên Web và ứng dụng di động |

---

## 3. Hệ Thống Sắc Độ Tương Thích Web & Đa Thiết Bị (Tonal Scale 50 - 950)
Để đảm bảo khả năng đọc tốt dưới ánh sáng ngoài trời trên điện thoại, đồng thời dịu mắt khi giáo viên làm việc lâu trên máy tính:

| Bước màu | Mã HEX | Ứng dụng UI trên Web & Mobile | Tiêu chuẩn WCAG |
|---|---|---|---|
| **50** | `#F0FDFA` | Nền thẻ nhẹ, nền dòng được chọn (table row highlight), tab active | Nền dịu mắt |
| **100** | `#CCFBF1` | Nền badge trạng thái, chip thông tin, pill tag | Nền tag phụ |
| **200** | `#99F6E4` | Đường viền card, đường kẻ phân cách nhẹ | Border mềm |
| **300** | `#5EEAD4` | Viền focus, hiệu ứng hover viền | Interactive |
| **400** | `#2DD4BF` | Icon phụ, chỉ số phụ trên biểu đồ dữ liệu | Accent sáng |
| **500** | **`#00A19A`** | **MÀU THƯƠNG HIỆU CHÍNH THỨC**: Nút bấm chính, Icon thương hiệu, Brand Logo, Điểm nhấn thanh điều hướng | **Core Brand** |
| **600** | `#008B85` | Trạng thái Hover của Button/Link trên chuột máy tính & phản hồi chạm trên điện thoại | Hover/Touch |
| **700** | `#00736E` | Chữ / Text Link thương hiệu trên nền trắng (`#FFFFFF`) | **WCAG AA (4.6:1)** |
| **800** | `#005854` | Tiêu đề trang, văn bản quan trọng cần độ tương phản cao | **WCAG AAA (7.2:1)** |
| **900** | `#003B3A` | **Deep Pine**: Nền Sidebar, Topbar, Card Header trang trọng | Tương phản tuyệt đối (11.5:1) |
| **950** | `#002220` | Nền chế độ tối (Dark Mode surface), bóng đổ chuyên sâu | Dark depth |

---

## 4. Tương Thích Màn Hình Mới (Wide Color Gamut & OLED Displays)
- **Display P3**: Hệ thống tích hợp CSS Modern Color 4 `@supports (color: color(display-p3 ...))` giúp màu `#00A19A` trên màn hình Apple (MacBook, iPad, iPhone) và màn hình OLED Android giữ được độ rực rỡ và chiều sâu chính xác như tài liệu in ấn gốc.
- **Fallback an toàn**: Tự động chuyển đổi êm ái sang không gian sRGB chuẩn trên tất cả các màn hình LCD văn phòng thông thường.

---

## 5. Quy Chuẩn Nút Bấm & Thành Phần Tương Tác
- **Button Sky-Line Primary**:
  - Nền: `#00A19A`
  - Chữ: Trắng `#FFFFFF` (Font weight: 600 - 700)
  - Hover: `#008B85` với bóng đổ nhẹ `shadow-[0_4px_14px_rgba(0,161,154,0.3)]`
  - Active/Press: `#00736E`, scale `0.98`
- **Focus Rings**: `outline: 2px solid #00A19A` kèm `box-shadow: 0 0 0 4px rgba(0, 161, 154, 0.18)` chống mất nét trên các loại màn hình khác nhau.
- **Header Thanh Điều Hướng (Navbar / Sidebar)**: Phối hợp chuyển tiếp sang trọng giữa `#003B3A` (Deep Pine) và `#00A19A` (Teal).

---

## 6. Phông Chữ Thương Hiệu (Brand Typography: Open Sans)
Hệ thống sử dụng phông chữ thương hiệu chính thức từ thư mục `We're Sky-Liners > BRAND GUIDELINES > Font thương hiệu`:
- **Primary Font**: **`Open Sans`** — Phông chữ chuẩn nhận diện Sky-Line, hỗ trợ tiếng Việt đầy đủ với các biến thể:
  - **Light (300)**: Caption, chú thích siêu nhỏ.
  - **Regular (400)**: Văn bản nội dung (body text), nhận xét học tập, nhãn phụ.
  - **Medium (500)**: Dữ liệu bảng (table cells), menu items.
  - **SemiBold (600)**: Nhãn form, tiêu đề phụ, trạng thái badge.
  - **Bold (700)**: Nút bấm (buttons), tiêu đề card, điểm số nổi bật.
  - **ExtraBold (800)**: Tiêu đề trang (page titles), số liệu thống kê lớn.
- **Dữ liệu số (Data / Numbers)**: Kết hợp `tabular-nums font-mono` để căn thẳng cột điểm số, mã học sinh, thời gian trên mọi thiết bị.
- **Fallback chuẩn**: `Be Vietnam Pro`, `Segoe UI`, `system-ui`.
