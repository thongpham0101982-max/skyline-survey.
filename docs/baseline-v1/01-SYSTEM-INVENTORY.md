# 01. KIỂM KÊ TOÀN DIỆN HỆ THỐNG (SYSTEM INVENTORY)
## TỔNG QUAN TÀI NGUYÊN FRONTEND & BACKEND SAU HỢP NHẤT

---

### 1. Thống kê Định lượng
- **Tổng số trang nghiệp vụ (Pages):** 111 trang (`page.tsx`).
- **Tổng số điểm cuối API (API Endpoints):** 107 routes (`route.ts`).
- **Tổng số linh kiện giao diện (Components):** 83 files (`.tsx`).
- **Tổng số thư viện dịch vụ lõi (Lib Modules):** 37 modules (`.ts`).

### 2. Phân bố Trang nghiệp vụ theo Phân hệ
- **Admin Portal — Khảo thí & Đảm bảo chất lượng (KT&ĐBCL):** 11 trang.
- **Admin Portal — Khảo sát năng lực đầu vào:** 4 trang.
- **Admin Portal — Quản trị chung:** 45 trang.
- **Teacher Portal — Cổng Giáo viên (Dự giờ, Sổ điểm, Hỗ trợ, Trải nghiệm...):** 27 trang.
- **Parent Portal — Cổng Phụ huynh:** 6 trang.
- **Public & Authentication Portal:** 15 trang.

### 3. Phân bố Linh kiện Giao diện theo Thư mục
- `src/components/ui/`: 17 foundation primitives (Button, Input, Badge, Dialog, Drawer, Table, Tabs...).
- `src/components/advisory/`: 7 components (Wave 2 — Cố vấn & Mục tiêu).
- `src/components/support/`: 6 components (Wave 3 — Theo dõi hỗ trợ & Tâm lý).
- `src/components/experiential/`: 8 components (Wave 4 — Hoạt động trải nghiệm).
- `src/components/testing/`: 10 components (Wave 5 — Khảo thí & Chất lượng).
- `src/components/dashboard/`: 10 components (Wave 6 — Dashboard & Reporting).
- `src/components/competency/`: 4 components.
- `src/components/layout/`: 1 component (Global App Layout).
- `src/components/root`: 20 specialized components.
