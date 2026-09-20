# ĐẶC TẢ THIẾT KẾ NỀN TẢNG (DESIGN SYSTEM BASELINE)
## Baseline đã Khóa (Locked) cho Toàn bộ Phân hệ SSM

---

### 1. BẢNG MÀU CHUẨN (COLOR TOKENS)

#### 1.1 Màu sắc Thương hiệu Sky-Line (Primary Brand)
* `--primary: #003B3A` (Deep Pine - Xanh thông trầm, biểu trưng cho sự uy tín, học thuật và chuyên nghiệp)
* `--primary-hover: #004D4B` (Tăng độ sáng 10% khi hover chuột)
* `--primary-active: #002827` (Nhấn sâu khi kích hoạt nút)
* `--primary-light: #E6F0EA` (Màu nền pastel hỗ trợ highlight và focus)

#### 1.2 Nhóm màu Ngữ nghĩa Trạng thái (Semantic Status Colors)
Tuyệt đối không tự định nghĩa màu mới. Mọi trạng thái nghiệp vụ trong toàn trường phải map về 5 nhóm chuẩn:

| Nhóm trạng thái | Biến màu CSS | Mã HEX chính | Nền pastel (Bg) | Viền (Border) | Ứng dụng tiêu biểu |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Neutral** | `--status-neutral` | `#64748B` | `#F1F5F9` | `#CBD5E1` | Bản nháp, Đã lưu, Chưa kích hoạt, Chờ cấu hình |
| **Information** | `--status-info` | `#0284C7` | `#F0F9FF` | `#BAE6FD` | Đã gửi, Đang xử lý, Chờ duyệt, Học sinh giao lưu |
| **Warning** | `--status-warning` | `#D97706` | `#FFFBEB` | `#FDE68A` | Cần điều chỉnh, Sắp đến hạn, Cảnh báo học tập nhẹ |
| **Success** | `--status-success` | `#16A34A` | `#F0FDF4` | `#BBF7D0` | Đã duyệt, Đạt chuẩn, Hoàn thành xuất sắc, Đang học |
| **Error / Destructive** | `--status-error` | `#DC2626` | `#FEF2F2` | `#FECACA` | Từ chối, Không đạt, Vi phạm, Cảnh báo học vụ nghiêm trọng |

---

### 2. THANG TYPOGRAPHY (TYPOGRAPHY SCALE)

* **Font Family:** System font stack (`Inter`, `system-ui`, `-apple-system`, `sans-serif`) tối ưu tốc độ tải trang và hiển thị sắc nét ký tự tiếng Việt.
* **Hệ thống cấp bậc:**
  * Page Title: `text-2xl font-black text-slate-900 tracking-tight` (24px)
  * Section Header: `text-lg font-bold text-slate-800` (18px)
  * Card / Subheader: `text-sm font-bold text-slate-700` (14px)
  * Body Text: `text-xs sm:text-sm font-normal text-slate-600` (12px / 14px)
  * Metadata / Labels: `text-[10px] sm:text-xs font-semibold text-slate-500` (10px / 12px)

---

### 3. KHOẢNG CÁCH & ĐỘ BO GÓC (SPACING & RADIUS)

* **8-Point Spacing Grid:** `4px (0.5)`, `8px (1)`, `12px (1.5)`, `16px (2)`, `20px (2.5)`, `24px (3)`, `32px (4)`.
* **Border Radius:**
  * Control nhỏ (Badge, Tag): `rounded-md` (4px - 6px)
  * Controls nhập liệu (Button, Input, Select): `rounded-xl` (8px - 10px)
  * Thẻ nội dung (Cards, Containers): `rounded-2xl` (12px - 16px)
  * Dialog & Drawer: `rounded-2xl` hoặc `rounded-l-2xl`

---

### 4. TIÊU CHUẨN THIẾT BỊ & RESPONSIVE (LAPTOP-FIRST)

Hệ thống SSM phục vụ công tác điều hành của giáo viên và lãnh đạo nhà trường, do đó ưu tiên hàng đầu là hiển thị tối ưu trên các thiết bị máy tính:
1. **Laptop Giáo viên (1366 × 768)**: Tiêu chuẩn cơ sở, bố cục không bị tràn mép ngang, thanh cuộn bảng mượt mà.
2. **Laptop Doanh nhân (1280 × 800)**: Đảm bảo sidebar và danh sách học sinh co giãn hợp lý.
3. **Desktop Tiêu chuẩn (1440 × 900+)**: Khai thác tối đa không gian hiển thị thông tin dạng thẻ và biểu đồ radar.
4. **Tablet (768px - 1024px)**: Menu tự động thu gọn, Drawer hiển thị 80% màn hình.
5. **Mobile (390px)**: Drawer và Modal mở bung toàn màn hình.\n