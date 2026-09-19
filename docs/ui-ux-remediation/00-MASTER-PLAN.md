# SSM UI/UX REMEDIATION MASTER PLAN (GIAI ĐOẠN 2)
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Kế hoạch Hành động Tổng thể:** Chuẩn hóa Design System, Refactor Component Dùng chung, Khắc phục Lỗi Trải nghiệm Hệ thống  
**Trạng thái Thực hiện:** PLANNING ONLY (READ-ONLY — Tuyệt đối không can thiệp Source Code, DB, Schema, API hay RBAC)

---

## 1. BỐI CẢNH VÀ MỤC TIÊU CHIẾN LƯỢC

Sau khi hoàn thành đợt **UI/UX Audit Toàn diện (Cấp 1 & Cấp 2)** bằng công cụ chuyên sâu `ui-ux-pro-max`, toàn bộ bức tranh về trải nghiệm người dùng, kiến trúc giao diện, nợ kỹ thuật (Tech Debt) và các điểm nghẽn hiệu năng của hệ thống Sky-Line School Management (SSM) đã được định lượng rõ ràng.

### Mục tiêu chiến lược của Giai đoạn 2 (Remediation Plan):
1. **Bảo vệ toàn vẹn Logic & Dữ liệu:** Không làm gián đoạn bất kỳ quy trình nghiệp vụ giáo dục nào; giữ nguyên 100% database schema, Prisma models, API routes và hệ thống phân quyền RBAC.
2. **Triệt tiêu các lỗi chặn nghiêm trọng (P0):** Xử lý dứt điểm tình trạng modal dài bị che khuất nút bấm (Button Clipping), mất dữ liệu khi nhập biên bản cố vấn/dự giờ, bảng ma trận bị trôi cột tên giáo viên, và các tab tràn vỡ trên màn hình laptop chuẩn (1366x768).
3. **Thống nhất Design System & Thư viện Component:** Tái sử dụng tối đa và chuẩn hóa các component cơ sở có sẵn (`@/components/ui/`), xóa bỏ tình trạng trùng lặp mã nguồn (hơn 4,860 dòng duplicate giữa Admin và Teacher).
4. **Tối ưu hóa tải nhận thức (Cognitive Load):** Biến Dashboard từ dạng "Launcher phím tắt" thành "Bàn làm việc Tác nghiệp (Daily Workbench)", phân tầng rõ ràng các cảnh báo khẩn cấp (SOS).
5. **Đảm bảo tính khả thi và an toàn khi Rollout:** Triển khai thử nghiệm (Pilot) trên phân hệ phức tạp nhất (**Dự giờ & Phát triển chuyên môn**) trước khi nhân rộng ra toàn bộ các phân hệ còn lại.

---

## 2. TỔNG HỢP VÀ PHÂN LOẠI TOÀN BỘ VẤN ĐỀ THEO MỨC ĐỘ ƯU TIÊN

Dựa trên kết quả Audit Cấp 1 và Cấp 2, tổng cộng **92 vấn đề UI/UX** đã được phát hiện và phân loại theo 4 cấp độ nghiêm trọng:

```
+-----------------------------------------------------------------------------+
|  TỔNG HỢP VẤN ĐỀ HỆ THỐNG SSM: 92 ISSUES                                    |
+-----------------------------------------------------------------------------+
|  [P0] CRITICAL (12 issues)   ── Gây mất dữ liệu, chặn thao tác, vỡ layout   |
|  [P1] HIGH     (24 issues)   ── Tải chậm, thiếu liên kết, trùng lặp mã      |
|  [P2] MEDIUM   (38 issues)   ── Thiếu affordance, không có phím tắt, vỡ CSS |
|  [P3] LOW      (18 issues)   ── Lệch khoảng cách, typo, hover state vi mô   |
+-----------------------------------------------------------------------------+
```

### 2.1. Danh mục Vấn đề P0 (Critical - Cần xử lý ngay ở đợt 1):
1. **P0-01 (Dự giờ):** Modal đánh giá 11 tiêu chí K12 cao >1200px, footer chứa nút Submit bị đẩy ra ngoài viewport trên màn hình laptop 1366x768 (`src/app/teacher/du-gio/client.tsx`).
2. **P0-02 (Dự giờ):** Form đánh giá thiếu Auto-save vào LocalStorage; click nhầm ra ngoài backdrop làm mất trắng nhận xét định tính.
3. **P0-03 (Dự giờ):** Bảng ma trận chuyên môn 12 tháng (`TTCMDepartmentSummaryTab.tsx`) không cố định (freeze) cột Họ tên và Bộ môn khi cuộn ngang.
4. **P0-04 (Hồ sơ học sinh):** 9 tabs trên màn hình laptop bị ngắt dòng (wrap) thành 2 tầng, che khuất Avatar và thông tin tóm tắt của học sinh.
5. **P0-05 (Hồ sơ học sinh):** Eager loading toàn bộ dữ liệu của 9 tabs cùng lúc khi mở hồ sơ, gây đơ giao diện từ 2.5s - 4s trên mạng nội bộ.
6. **P0-06 (Hồ sơ học sinh):** Trùng lặp mã nguồn 4,860 dòng giữa `admin/ho-so-hoc-sinh/client.tsx` và `teacher/ho-so-hoc-sinh/page.tsx`.
7. **P0-07 (Cố vấn):** Form biên bản phỏng vấn (Consultation Notes) trong `teacher/co-van-hoc-tap/page.tsx` thiếu dirty-state guard và auto-save.
8. **P0-08 (Cố vấn):** Cảnh báo SOS (tâm lý / học lực nguy cơ) chỉ hiển thị bằng badge nhỏ màu đỏ lẫn trong bảng 40 học sinh, không có khu vực cấp cứu (Triage).
9. **P0-09 (Dashboards):** `AcademicYearSelector` bị lặp lại ở cả Global Header lẫn bên trong Page Body của Admin Dashboard gây xung đột trạng thái dữ liệu.
10. **P0-10 (Dashboards):** Màu sắc thẻ KPI dùng tùy tiện (tím, cam, vàng, xanh, hồng) không theo bảng mã semantic, làm mất khả năng cảnh báo thị giác.
11. **P0-11 (Hồ sơ & Đánh giá):** Bản in A4 (`/print`) bị vỡ trang, bảng điểm bị chia cắt ngang giữa 2 trang giấy khi in trực tiếp từ trình duyệt.
12. **P0-12 (Global Layout):** Sidebar và Table ngang bị xung đột trên tablet (768px - 1024px), gây hiện tượng thanh cuộn ngang kép (Double Scrollbars).

### 2.2. Phân loại: Vấn đề Hệ thống (Systemic) vs Vấn đề Cục bộ (Page-specific)

| Nhóm | Đặc điểm | Số lượng | Phạm vi ảnh hưởng | Chiến lược xử lý |
|---|---|---|---|---|
| **Vấn đề Hệ thống (Systemic)** | Xuất phát từ Design Tokens, Global Shell, Shared Components (Buttons, Modals, Tables, Selectors, Theme). | 41 issues | Toàn bộ 24+ trang thuộc cả 2 role Admin & Teacher. | Chuẩn hóa tại Phase 0 (Tokens), Phase 1 (Shared Components) và Phase 2 (Global Layout). |
| **Vấn đề Cục bộ (Page-specific)** | Nằm trong logic bố cục, wizard form, bảng ma trận của từng nghiệp vụ cụ thể (Dự giờ, Cố vấn, Hồ sơ, Sổ điểm). | 51 issues | Từng trang nghiệp vụ riêng biệt. | Xử lý theo đợt tại Phase 3 (Pilot Dự giờ) và Phase 4 (Rollout các phân hệ còn lại). |

---

## 3. LỘ TRÌNH THỰC HIỆN 6 GIAI ĐOẠN (6-PHASE REMEDIATION ROADMAP)

```
[ PHASE 0: FOUNDATION ] ──────► [ PHASE 1: SHARED COMPONENTS ] ──► [ PHASE 2: GLOBAL LAYOUT ]
(Design Tokens, Theme CSS)       (13 Reusable UI Components)        (Header, Sidebar, Shell)
                                                                               │
                                                                               ▼
[ PHASE 5: QA TOÀN DIỆN ] ◄───── [ PHASE 4: ROLLOUT MODULES ] ◄─── [ PHASE 3: PILOT DỰ GIỜ ]
(Regression, A11y, Perms)       (Hồ sơ, Cố vấn, Sổ điểm, Dash)     (GV, TTCM, BGH, Admin)
```

### Chi tiết mục tiêu từng Phase:
- **PHASE 0 — FOUNDATION (Nền tảng):** Chuẩn hóa toàn bộ Design Tokens (Màu sắc Sky-Line Navy/Gold, Typography, Spacing, Radius, Shadow, Lucide Icons, Breakpoints, Semantic Status). Cập nhật `tailwind.config.ts` và `globals.css` tương thích ngược 100%.
- **PHASE 1 — SHARED COMPONENTS (Thư viện dùng chung):** Chuẩn hóa 13 component cốt lõi (`Button`, `Input`, `Select`, `Badge`, `PageHeader`, `FilterBar`, `DataTable`, `Modal`, `Drawer`, `Tabs`, `EmptyState`, `LoadingState`, `ErrorState`).
- **PHASE 2 — GLOBAL LAYOUT (Khung ứng dụng):** Tối ưu hóa Sidebar (thu gọn thông minh), Global Header (đồng bộ hóa selector năm học/cơ sở), Breadcrumbs động, Responsive Page Container chống cuộn kép.
- **PHASE 3 — PILOT MODULE (Thực nghiệm Dự giờ):** Áp dụng toàn bộ chuẩn mới vào phân hệ phức tạp nhất: Dự giờ & Phát triển Chuyên môn. Tối ưu trải nghiệm cho cả 6 vai trò (GVBM, TTCM, QLCM, TBP, GĐCS, Admin).
- **PHASE 4 — REMAINING MODULES (Nhân rộng toàn hệ thống):** Lần lượt nâng cấp Hồ sơ học sinh (xóa code trùng), Cố vấn học tập (3-Pane Workspace), Dashboards (Executive & Daily Workbench), Sổ điểm và các phân hệ phụ trợ.
- **PHASE 5 — QA & VERIFICATION (Kiểm định chất lượng):** Kiểm thử 7 chiều: Hồi quy chức năng, Responsive mọi màn hình, Trợ năng WCAG 2.1 AA, Hiệu năng Core Web Vitals, Trải nghiệm phân quyền RBAC, Đa trình duyệt, và Toàn vẹn dữ liệu.

---

## 4. BỘ NGUYÊN TẮC BẤT DI BẤT DỊCH (CORE PRINCIPLES)

1. **Nguyên tắc Tái sử dụng (Reuse Over Reinvent):** Tận dụng tối đa các component đã có trong `@/components/ui/` (dựa trên Radix UI + Tailwind). Chỉ tái cấu trúc và bổ sung props, tuyệt đối không cài đặt thêm thư viện UI bên ngoài làm tăng kích thước bundle.
2. **Không thay đổi Logic Nghiệp vụ & Dữ liệu:** Mọi API contracts, payload JSON, TypeScript interfaces, database schemas và Prisma queries giữ nguyên 100%. Các thay đổi chỉ diễn ra ở tầng trình diễn giao diện (Presentation Layer) và quản lý trạng thái UI cục bộ (Client-side UI State).
3. **Bảo toàn Phân quyền (Zero RBAC Drift):** Các điều kiện kiểm tra vai trò (Role checks: `ADMIN`, `TEACHER`, `CAN_EVALUATE`, `CAN_APPROVE`) phải được kế thừa nguyên vẹn. Không cấp thêm hoặc thu hồi bất kỳ quyền hạn nào trong quá trình remediation.
4. **Không thiết kế theo cảm tính:** Mọi điều chỉnh về khoảng cách, màu sắc, bố cục đều phải đối chiếu trực tiếp với tài liệu `design-system/ssm/MASTER.md` và bằng chứng từ các báo cáo Audit Cấp 1 & Cấp 2.
