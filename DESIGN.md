---
version: alpha
name: Skyline Survey System
description: Hệ thống Quản trị Chất lượng Trường học và Khảo sát Đánh giá Năng lực Sky-Line Education System
colors:
  brand-violet-dark: "#7400B8"
  brand-violet: "#6930C3"
  brand-indigo: "#5E60CE"
  brand-blue-dark: "#5390D9"
  brand-blue: "#4EA8DE"
  brand-cyan: "#48BFE3"
  brand-aqua: "#56CFE1"
  brand-turquoise: "#64DFDF"
  brand-mint: "#72EFDD"
  brand-mint-bright: "#80FFDB"
  skyline-dark: "#003B3A"
  accent-yellow: "#D97706"
typography:
  sans:
    fontFamily: "Be Vietnam Pro, sans-serif"
rounded:
  base: "12px"
  sm: "8px"
  md: "12px"
  lg: "14px"
  xl: "18px"
  "2xl": "24px"
  "3xl": "32px"
---

# Design Language: Skyline Survey (SQMS)

## Overview
Skyline Survey (SQMS - School Quality Management System) là hệ thống quản trị chất lượng giáo dục, khảo sát ý kiến, quản lý sổ điểm và đánh giá năng lực học sinh thuộc Hệ thống Giáo dục Sky-Line. Giao diện được thiết kế hiện đại, tinh gọn, thân thiện với người dùng theo phong cách giáo dục cao cấp, sử dụng bảng màu nhận diện thương hiệu 10 bước độc quyền.

## Colors
Hệ thống sử dụng bảng màu thương hiệu chính thức 2024 của Sky-Line (10-Step Palette):
- **Primary Cyan (`#48BFE3`)**: Màu chủ đạo cho các nút bấm chính, liên kết, trạng thái kích hoạt và điểm nhấn giao diện.
- **Deep Navy / Teal (`#003B3A`)**: Màu nền chính cho thanh bên (Sidebar), panel thương hiệu và các tiêu đề trang trọng.
- **Royal Purple & Indigo (`#6930C3`, `#5E60CE`)**: Sử dụng cho biểu đồ dữ liệu, phân loại chuyên môn và thẻ năng lực.
- **Accent Yellow (`#D97706`)**: Màu cảnh báo nhẹ, thẻ cần chú ý hoặc nhấn mạnh hành động quan trọng.
- **Backgrounds**: Nền trang sử dụng sắc độ trung tính `#F5F7FA` (Neutral Slate/Zinc) để tôn vinh nội dung và bảng dữ liệu.

## Typography
- **Phông chữ chủ đạo**: `Be Vietnam Pro` (Google Fonts) hỗ trợ tiếng Việt hoàn chỉnh với đầy đủ các trọng số:
  - Heading: Font Black (900) hoặc Bold (700) kết hợp `text-balance` chống ngắt dòng đơn lẻ.
  - Body: Regular (400) hoặc Medium (500) kết hợp `text-pretty`.
  - Data / Numbers: Luôn sử dụng `tabular-nums` để số liệu, điểm số, ngày tháng hiển thị thẳng hàng.

## Layout & Viewport
- Luôn sử dụng đơn vị Dynamic Viewport (`min-h-dvh`, `h-dvh`) cho các khung nhìn toàn màn hình, khắc phục lỗi nhảy giao diện do thanh địa chỉ trình duyệt trên điện thoại (iOS Safari / Android Chrome).
- Khoảng cách lề và padding tuân theo hệ thống tỷ lệ chuẩn Tailwind (4px, 8px, 12px, 16px, 24px, 32px).

## Elevation & Depth
- **Thẻ Card**: Nền trắng `#FFFFFF`, viền mỏng `border-slate-200/90`, đổ bóng nhẹ `shadow-2xs` hoặc `shadow-xs`.
- **Modals / Dialogs**: Đổ bóng `shadow-2xl` với nền overlay mờ `bg-[#001D1C]/80` kết hợp `backdrop-blur-md`.

## Components & Interaction
- **Button**: Bo góc `rounded-xl`, hiệu ứng phản hồi nhấn `active:scale-[0.98]`, độ trễ hiệu ứng tối đa 200ms.
- **DataTable**: Thiết kế phân trang rõ ràng, cột số tự động căn lề chuẩn với `tabular-nums`, trạng thái trống (`emptyMessage`) có chỉ dẫn cụ thể.
- **Icons**: Chuẩn hóa kích thước hình học bằng `size-*` (`size-4`, `size-5`, `size-6`). Nút chỉ có icon phải luôn có `aria-label`.

## Do's and Don'ts
- **DO**: Luôn thêm `aria-label` cho các nút chỉ chứa biểu tượng (icon buttons).
- **DO**: Dùng `tabular-nums` khi hiển thị bảng điểm, mã học sinh, thời gian và chỉ số KPI.
- **DON'T**: Không sử dụng `h-screen`, thay bằng `h-dvh`.
- **DON'T**: Không sử dụng dải màu gradient sặc sỡ hoặc hiệu ứng phát sáng chói mắt làm mất tính chuyên nghiệp trong môi trường sư phạm.
