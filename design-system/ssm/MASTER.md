# SKY-LINE SCHOOL MANAGEMENT (SSM) — MASTER DESIGN SYSTEM SPECIFICATION
**Version:** 2.0.0 (Foundation Release)  
**Brand Identity:** Sky-Line Education  
**Core Aesthetic:** Calm, Educational, Data-Focused, Trustworthy, Professional  
**Primary Color:** Deep Pine (`#003B3A`)  
**Design Philosophy:** Function-First Enterprise Educational Architecture  

---

## 1. TỔNG QUAN HỆ THỐNG THIẾT KẾ (DESIGN SYSTEM MANIFESTO)

Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM) là một nền tảng quản trị nghiệp vụ chuyên sâu, phục vụ trực tiếp công tác điều hành sư phạm của toàn hệ thống trường học. 

Khác với các ứng dụng tiêu dùng hay landing page tiếp thị, SSM tuân thủ nghiêm ngặt nguyên tắc **"Tối thiểu hóa nhiễu thị giác — Tối đa hóa tỷ lệ dữ liệu (High Data-Ink Ratio)"**:
- **Không dùng trang trí rườm rà:** Không sử dụng gradient màu mè, hình minh họa hoạt hình, hay hiệu ứng chuyển động lòe loẹt.
- **Dữ liệu là trung tâm:** Mọi bảng điểm, phiếu dự giờ, chỉ số chuyên cần đều phải dễ đọc, thẳng cột và phản hồi tức thì.
- **Nhất quán từ token đến component:** Mọi màn hình từ Giáo viên đến Ban Giám hiệu đều sử dụng chung một bộ linh kiện cơ sở đã được kiểm định độ tương phản và trợ năng.

---

## 2. CẤU TRÚC TÀI LIỆU DESIGN SYSTEM

Hệ thống tài liệu SSM Design System được phân rã thành 6 chuyên đề độc lập:

1. [`tokens.md`](./tokens.md) — Chi tiết về Bảng màu Deep Pine, Semantic Status Tokens, Typography Scale, Spacing, Radius, Shadow và Breakpoints.
2. [`components.md`](./components.md) — Đặc tả API, Props và quy chuẩn sử dụng 13 UI Primitives cốt lõi (Button, Input, Badge, Dialog, Drawer, FilterBar, DataTable, v.v.).
3. [`layout.md`](./layout.md) — Quy chuẩn Khung ứng dụng (AppShell, PageContainer, ContentSection, Sidebar, Header, Breadcrumbs).
4. [`status.md`](./status.md) — Quy tắc ánh xạ trạng thái nghiệp vụ giáo dục sang hệ màu ngữ nghĩa (Neutral, Info, Warning, Success, Error).
5. [`responsive.md`](./responsive.md) — Tiêu chuẩn hiển thị trên 5 dải thiết bị, trọng tâm tối ưu cho Laptop giáo viên (1366x768).
6. [`accessibility.md`](./accessibility.md) — Hướng dẫn tuân thủ WCAG 2.1 AA (Tương phản màu >= 4.5:1, Visible Focus Ring, Điều hướng bàn phím).

---

## 3. NGUYÊN TẮC AN TOÀN VÀ TƯƠNG THÍCH NGƯỢC (SAFEGUARD RULES)

1. **Bảo tồn toàn diện Backend & Logic:** Tuyệt đối không can thiệp database schema, Prisma migrations, API routes hay logic phân quyền RBAC.
2. **Kế thừa và mở rộng (Extend, Never Break):** Các component mới bổ sung props tùy chọn (`isLoading`, `prefixIcon`, `isError`, `variant="primary"`) nhưng vẫn duy trì hoạt động bình thường với code cũ (`variant="default"`).
3. **Triển khai từng bước (Normalize → Reuse → Gradual Migration):** Xây dựng nền tảng vững chắc trước khi tiến hành thí nghiệm trên phân hệ Dự giờ (Pilot Module).
