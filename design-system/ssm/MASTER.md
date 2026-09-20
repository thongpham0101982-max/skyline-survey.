# SSM UI/UX DESIGN SYSTEM — BASELINE v1.0
**Brand Identity:** Sky-Line Educational Quality Management System  
**Primary Color:** Deep Pine (`#003B3A`)  
**Design Philosophy:** Function-First Enterprise Educational Architecture  
**Status:** **FROZEN (SSM UI/UX Baseline v1.0)**  
**Version:** 1.0.0 (Consolidated Release)  

---

## 1. TỔNG QUAN HỆ THỐNG THIẾT KẾ (DESIGN SYSTEM MANIFESTO)

Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM) là một nền tảng quản trị nghiệp vụ sư phạm toàn diện cho toàn hệ thống trường Sky-Line (Mầm non, Tiểu học, THCS, THPT). 

SSM tuân thủ nghiêm ngặt nguyên tắc **"Tối thiểu hóa nhiễu thị giác — Tối đa hóa tỷ lệ dữ liệu (High Data-Ink Ratio)"**:
- **Không dùng trang trí rườm rà:** Loại bỏ gradient mạnh, hiệu ứng 3D, hoạt hình lớn hay bo tròn quá mức không phù hợp môi trường sư phạm.
- **Dữ liệu là trung tâm:** Bảng dữ liệu, phổ điểm, phiếu dự giờ, hồ sơ học sinh 360° và chỉ số chuyên cần đều phải dễ đọc, thẳng cột và phản hồi tức thì.
- **Nhất quán từ Token đến Component:** Mọi màn hình từ Giáo viên đến Ban Giám hiệu và Ban KT&ĐBCL đều sử dụng chung một bộ linh kiện cơ sở chuẩn hóa.

---

## 2. QUY CHUẨN NỀN TẢNG (FOUNDATION TOKENS)

### 2.1. Brand & Palette Màu Sắc
- **Màu Thương Hiệu Chủ Đạo (Primary Brand):** `Deep Pine` (`#003B3A`) — Đại diện cho sự tin cậy, vững chãi, học thuật của Sky-Line.
- **Màu Bổ Trợ:** Slate neutral (`#0F172A`, `#334155`, `#64748B`, `#94A3B8`, `#E2E8F0`, `#F8FAFC`).
- **Semantic Status Tokens:**
  - `Success`: Emerald (`#047857` text / `#D1FAE5` bg) — Đạt, Hoàn thành, Vượt mục tiêu.
  - `Warning`: Amber (`#B45309` text / `#FEF3C7` bg) — Tiệm cận, Chờ duyệt, Cần nhắc nhở.
  - `Error / Critical`: Red (`#B91C1C` text / `#FEE2E2` bg) — Chưa đạt, Quá hạn, Nguy cơ cao.
  - `Info`: Blue (`#1D4ED8` text / `#DBEAFE` bg) — Đang diễn ra, Thông tin điều hành.
  - `Neutral`: Slate (`#475569` text / `#F1F5F9` bg) — Bản nháp, Đã lưu trữ.

### 2.2. Typography Scale
- Font chính: `Inter`, `system-ui`, `-apple-system`, `sans-serif`.
- Font số học/điểm số: `ui-monospace`, `SFMono-Regular`, `Menlo`, `font-mono`.
- Tỷ lệ:
  - H1 Page Title: `text-xl md:text-2xl font-bold tracking-tight text-slate-900`
  - H2 Section: `text-base md:text-lg font-bold text-slate-800`
  - H3 Subsection / Card: `text-sm font-semibold text-slate-800`
  - Body / Table: `text-xs leading-relaxed text-slate-700`
  - Caption / Metadata: `text-[11px] text-slate-500`

### 2.3. Spacing & Grid Scale
Scale 8pt chuẩn mực: `4px (0.5)`, `8px (1)`, `12px (1.5)`, `16px (2)`, `20px (2.5)`, `24px (3)`, `32px (4)`, `40px (5)`, `48px (6)`.

### 2.4. Radius & Shadows
- Radius chuẩn: `rounded-lg (8px)` cho Button/Input; `rounded-xl (12px)` cho Card/Table/Dialog/Drawer.
- Shadow chuẩn: `shadow-2xs` cho Cards; `shadow-xs` khi hover; `shadow-xl` cho Modal backdrop.

---

## 3. BỘ THÀNH PHẦN GIAO DIỆN CHUẨN (SHARED COMPONENTS BASELINE)

1. **Khung Ứng Dụng:** `AppShell`, `Sidebar`, `GlobalHeader`, `PageHeader`, `PageContainer`.
2. **Nút Bấm & Hành Động:** `Button` (Primary `#003B3A`, Secondary, Outline, Ghost, Destructive), `IconButton`.
3. **Biểu Mẫu & Nhập Liệu:** `Input`, `Textarea`, `Select`, `MultiSelect`, `DatePicker`, `Checkbox`, `Radio`, `Switch`, `FormField`.
4. **Bảng Dữ Liệu:** `DataTable` (Sticky header, Sticky left column cho Họ tên HS, Server/Client pagination, Sortable, Filterable).
5. **Nhãn & Trạng Thái:** `StatusBadge`, `Tag`.
6. **Điều Hướng & Ngăn Khu:** `Tabs`, `FilterBar`, `SearchInput`.
7. **Hộp Thoại & Xem Chi Tiết:** `Modal`, `Dialog`, `ConfirmDialog`, `DetailDrawer` (Right-side slide panel).
8. **Trạng Thái Giao Diện:** `EmptyState`, `ErrorState`, `LoadingState`, `Skeleton`.
9. **Bảng Điều Khiển & Trực Quan:** `StatCard`, `MetricCard`, `ActionCenter`, `ChartContainer`, `DataFreshnessIndicator`.

---

## 4. QUY CHUẨN CÁC PHÂN HỆ NGHIỆP VỤ (MODULE EXTENSIONS)

- **Wave 1 — Hồ sơ học sinh 360°:** `StudentProfileSummary`, `StudentCompetencyRadar`, `StudentAchievementTimeline`.
- **Wave 2 — Cố vấn & Mục tiêu:** `StudentGoalCard`, `SubjectGapTable`, `AdjustmentRequestPanel`.
- **Wave 3 — Hỗ trợ & Tâm lý:** `SupportTimeline`, `ProgressEvaluationBadge`, `ConfidentialNoteShield`.
- **Wave 4 — Hoạt động trải nghiệm:** `AttendanceCell`, `StudentRoleSelector`, `CriteriaEvaluationCell`, `ExperienceRoster`, `ActivitySetupStepper`.
- **Wave 5 — Khảo thí & Chất lượng:** `ScoreDistributionChart`, `QualityBenchmarkCard`, `ExamMatrixTable`, `ResultImportPreview`, `CampusComparisonChart`.
- **Wave 6 — Dashboard & Báo cáo:** `DashboardShell`, `TeacherDashboardView`, `TTCMDashboardView`, `GDCSDashboardView`, `QADashboardView`, `ReportCatalogView`.

---

## 5. NGUYÊN TẮC AN TOÀN VÀ ĐÓNG BĂNG BASELINE (BASELINE FREEZE)

1. **Bảo tồn toàn diện Backend & Logic:** Tuyệt đối không can thiệp database schema, Prisma migrations, API contracts hay logic phân quyền RBAC.
2. **Kế thừa và mở rộng (Extend, Never Break):** Mọi module mới phát triển sau Baseline v1.0 bắt buộc phải kế thừa Shared Component Baseline, không được phép tạo component riêng rẽ.
3. **Đóng băng Baseline:** SSM UI/UX Baseline v1.0 chính thức có hiệu lực và được bảo vệ theo quy trình Change Control chặt chẽ.
