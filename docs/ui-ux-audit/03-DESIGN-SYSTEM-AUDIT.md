# BÁO CÁO AUDIT UI/UX TOÀN DIỆN HỆ THỐNG SSM
## TÀI LIỆU 03: DESIGN SYSTEM & DESIGN TOKENS (DESIGN SYSTEM AUDIT)

> **Mục tiêu:** Kiểm toán toàn diện hệ thống mã màu, phông chữ, khoảng cách, bo góc, độ bóng và các biến CSS Tokens của thương hiệu Sky-Line trong hệ thống SSM.

---

### 1. Kiểm toán Hệ thống Màu sắc (Color Inventory & Brand Audit)

Kiểm tra đối chiếu giữa hồ sơ nhận diện thương hiệu Sky-Line 2024 tại \DESIGN.md\, khai báo CSS tại \src/app/globals.css\ và mã nguồn thực tế tại 111 trang:

#### 1.1. Bảng màu Nhận diện Sky-Line (10-Step Palette) vs Thực tế Áp dụng

| Bậc màu | Tên mã màu | Mã HEX Chuẩn | Tần suất trong Code | Tình trạng áp dụng & Vấn đề |
|:---|:---|:---|:---|:---|
| 1 | Deep Violet | \#7400B8\ | 12 lần | Ít sử dụng, chủ yếu làm gradient nền |
| 2 | Royal Purple | \#6930C3\ | 48 lần | Bị gán nhầm vào biến \--sidebar\ |
| 3 | Violet Blue | \#5E60CE\ | 25 lần | Dùng trong một số biểu đồ Recharts |
| 4 | Slate Blue | \#5390D9\ | 18 lần | Dùng trong biểu đồ khối lớp |
| 5 | Sky Blue | \#4EA8DE\ | 34 lần | Dùng rải rác |
| 6 | **Primary Cyan** | \#48BFE3\ | **2,371 lần** | **Lạm dụng nghiêm trọng, tương phản yếu với chữ trắng (2.13:1)** |
| 7 | Cyan Aqua | \#56CFE1\ | 42 lần | Dùng trong biểu đồ |
| 8 | Turquoise | \#64DFDF\ | 31 lần | Dùng trong biểu đồ |
| 9 | Mint Cyan | \#72EFDD\ | 29 lần | Dùng trong biểu đồ |
| 10 | Bright Mint | \#80FFDB\ | 19 lần | Dùng trong biểu đồ |
| Nền | **Deep Pine** | \#003B3A\ | **615 lần** | **Màu thương hiệu gốc của Sky-Line, tương phản xuất sắc (12.8:1)** |

#### 1.2. Hiện tượng Phân mảnh Sắc thái Xanh (Teal/Cyan Fracturing)
Thay vì sử dụng token tập trung, các lập trình viên đã gõ cứng trực tiếp hơn 10 mã màu xanh gần giống nhau:
* \#48BFE3\ (2,371 lần) — Sky-Line Primary Cyan
* \#00A99D\ (371 lần) — Màu xanh lục bảo nhạt
* \#009085\ (167 lần) — Xanh ngọc đậm
* \#007A72\ (160 lần) — Xanh teal cổ vịt
* \#00B5E2\ (144 lần) — Xanh da trời sáng
* \#008B82\ (93 lần) — Xanh ngọc sẫm
* \#005B58\ (81 lần) — Deep Pine sáng
* \#008075\ (57 lần) — Xanh ngọc lục bảo
* \#0C363F\ (56 lần) — Xanh rêu đen
* \#0284C7\ (Hơn 120 lần) — Màu Sky-600 mặc định của Tailwind (không thuộc nhận diện Sky-Line)

* **Hậu quả:** Nút bấm trên trang này màu xanh lục bảo (\#00A99D\), trang kế bên lại màu xanh cyan (\#48BFE3\), sang trang thứ ba lại là xanh da trời (\#0284C7\), khiến hệ thống trông như được viết bởi 5 nhóm khác nhau.

#### 1.3. Lỗi Cấu hình Token Tai hại trong \globals.css\
Trong \src/app/globals.css\ (dòng 39-74), xuất hiện đoạn mã ghi đè toàn bộ dải màu Tailwind mặc định một cách bất thường:
\\\css
/* ĐOẠN MÃ LỖI TRONG GLOBALS.CSS */
--color-indigo-50: #F0FDFD;
--color-indigo-100: #80FFDB;
--color-indigo-200: #72EFDD;
...
--color-purple-50: #F0FDFD;
...
--color-emerald-50: #F0FDFD;
\\\
* Lập trình viên đã copy-paste cùng một bảng mã màu Mint vào cả ba thang màu \indigo\, \purple\, và \emerald\. Do đó, khi một trang gọi \g-purple-100\ hoặc \g-emerald-100\, màu hiển thị ra lại là màu xanh ngọc chói (\#80FFDB\) thay vì tím hoặc ngọc lục bảo tiêu chuẩn.
* Tại dòng 111: \--sidebar: #6930C3; /* Premium Dark Teal Sidebar */\: Tên chú thích là "Dark Teal" nhưng mã màu lại là tím Royal Purple, dẫn đến việc biến CSS này bị vô hiệu hóa trong thực tế.

---

### 2. Kiểm toán Typography (Typography & Hierarchy Audit)

* **Phông chữ chủ đạo:** \Be Vietnam Pro\ (Phông chữ tiếng Việt hình học hiện đại, rất phù hợp với giáo dục).
* **Phân bố trọng số (Font Weight Distortion):**
  * \ont-black\ (900): **4,448 vị trí** (32.8%)
  * \ont-bold\ (700): **5,039 vị trí** (37.1%)
  * \ont-semibold\ (600): **2,295 vị trí** (16.9%)
  * \ont-medium\ (500): **1,075 vị trí** (7.9%)
  * \ont-extrabold\ (800): **855 vị trí** (6.3%)
  * \ont-normal\ (400): **136 vị trí** (1.0%)
* **Vấn đề phân cấp nghiêm trọng:**
  Gần **70% toàn bộ văn bản** trong hệ thống được định dạng \ont-bold\ hoặc \ont-black\. Từ tiêu đề trang, tên cột bảng điểm, ngày sinh học sinh, trạng thái tiết dạy đến nhãn placeholder đều đậm đen như nhau. Không có vùng nghỉ ngơi cho mắt.
* **Cưỡng ép kích cỡ tại Layout Root:**
  Tại \src/app/admin/layout.tsx\ dòng 76 và 119:
  \<div className="flex min-h-dvh text-xs font-semibold">\
  Cả cây DOM bị áp đặt kích thước cố định \	ext-xs\ (12px) và \ont-semibold\ (600), khiến toàn bộ chữ hiển thị dày và nhỏ li ti, gây khó khăn cho giáo viên lớn tuổi khi nhập điểm trên màn hình máy tính bàn.

---

### 3. Kiểm toán Khoảng cách & Lưới (Spacing & Layout Grid)

* **Hiện trạng Spacing:**
  * Lập trình viên dùng các số đo lẻ tẻ: \p-3.5\, \p-5\, \gap-2.5\, \py-1.5\, xen kẽ với \pb-24\ và \py-28\.
  * Khoảng cách giữa các thẻ Card dao động tùy tiện từ 12px đến 28px trên cùng một hàng.
* **Đề xuất Spacing Scale chuẩn 4px:**
  * Micro: 4px (\gap-1\), 8px (\gap-2\)
  * Component: 12px (\gap-3\), 16px (\gap-4\)
  * Section: 24px (\gap-6\), 32px (\gap-8\)
  * Page Container: 24px (\p-6\) trên desktop, 16px (\p-4\) trên tablet/mobile.

---

### 4. Kiểm toán Bo góc & Đổ bóng (Border Radius & Elevation)

* **Bo góc (Border Radius):**
  * Hệ thống trộn lẫn 7 cấp độ bo góc: \ounded-none\ (241), \ounded-md\ (307), \ounded-lg\ (1,036), \ounded-xl\ (2,900), \ounded-2xl\ (1,474), \ounded-3xl\ (509), \ounded-full\ (1,216).
  * *Vấn đề:* Có trang form hình chữ nhật vuông vức (\ounded-none\), nhưng modal bên trong lại bo cong tròn kiểu bong bóng (\ounded-3xl\).
* **Đề xuất Hệ thống Bo góc Thống nhất:**
  * Nút bấm, thẻ Input, Select, Badge: \ounded-lg\ (8px) hoặc \ounded-xl\ (12px).
  * Bảng dữ liệu, Khung Card nội dung: \ounded-xl\ (12px).
  * Modal, Drawer: \ounded-2xl\ (16px).
  * Hạn chế tối đa \ounded-3xl\ (24px) để tránh cảm giác trẻ con, thiếu tính trang trọng sư phạm.
