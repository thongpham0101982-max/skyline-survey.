# BẢNG THEO DÕI NGHIỆM THU, DI TRÚ CSDL, DỌN DẸP & PHƯƠNG ÁN HOÀN TÁC (SSM SKY-LINE)

**Cập nhật lần cuối:** `2026-11-18`  
**Trạng thái kiểm thử tự động (`npm test`):** **46 / 46 Test Suites PASSED** (`377 passed`, `0 failed`)

---

## 1. Bảng Theo dõi Vấn đề, Bằng chứng, Tệp đã sửa & Kết quả Nghiệm thu

| Mã | Mức độ | Phân hệ / Vấn đề & Bằng chứng | Tệp đã sửa / bổ sung | Cách kiểm tra & Kết quả |
| :--- | :---: | :--- | :--- | :--- |
| **SEC-01** | **P0 (Critical)** | **Lộ JWT Token quản trị Turso Cloud (`rw`) trong mã nguồn** tại 5 tệp (`DEFAULT_TURSO_TOKEN`, `TURSO_TOKEN`, `CLOUD_TOKEN`) và thiếu tái sử dụng singleton `globalThis.prismaGlobal`. | - `src/lib/db/index.ts`<br>- `src/app/api/advisory/goals/route.ts`<br>- `src/app/api/advisory/goals/unlock/route.ts`<br>- `src/app/api/special-subjects/curriculums/import/route.ts`<br>- `src/app/api/special-subjects/teaching-logs/route.ts`<br>- `src/app/api/sync-excel-students/route.ts` | `npx vitest run tests/backend.test.ts tests/performance_optimization.test.ts tests/security_asvs_audit.test.ts` → **PASS 100%**. Đã gỡ toàn bộ token cứng khỏi mã nguồn; cần xoay vòng (rotate) token Turso trên production. |
| **SEC-02** | **P0 (Critical)** | **Lộ thông tin mật khẩu SMTP & gửi thư trái phép (`GET /api/check-smtp`)**: Không kiểm tra đăng nhập và trả về `rawPassStart`, `rawPassEnd`, `rawPassLength` của `SMTP_PASS`. | - `src/app/api/check-smtp/route.ts`<br>- `src/lib/security-guard.ts` | `npx vitest run tests/security_asvs_audit.test.ts` → **PASS**. Bắt buộc phiên `requireAdminOrLeadershipSession()` và loại bỏ hoàn toàn trường `env` khỏi JSON phản hồi. |
| **SEC-03** | **P0 (Critical)** | **Leo thang đặc quyền & sửa điểm trái phép tại Sổ điểm (`GET/POST /api/teacher/grade-entries`)**: Cho phép truyền `?isManage=true` hoặc `?role=admin` trên URL, hoặc bất kỳ vai trò khác `TEACHER` (kể cả `PARENT`) vượt qua kiểm tra phân công giảng dạy và khóa sổ điểm; thiếu ghi `AuditLog` khi sửa điểm; lỗi truy vấn `isDefault: true` trên `AcademicYear`. | - `src/app/api/teacher/grade-entries/route.ts`<br>- `src/lib/security-guard.ts` | `npx vitest run tests/security_asvs_audit.test.ts src/lib/grading/__tests__/vnedu-gradebook.test.ts` → **PASS**. Chặn `PARENT` (`403`), chỉ cấp quyền quản lý cho vai trò lãnh đạo/KTĐBCL thực thụ (`isPrivilegedGradebookRole`), bắt buộc kiểm tra `teachingAssignment` và ghi `AuditLog` (`SCORE_UPDATE`). |
| **SEC-04** | **P0 (High)** | **Lộ thông tin cá nhân (PII) học sinh/phụ huynh và vượt phạm vi cơ sở (GĐCS)**: Các API tra cứu học sinh, điểm, thành tích, xếp loại và theo dõi phản hồi không kiểm tra phiên đăng nhập và không giới hạn `allowedCampusIds` đối với GĐCS. | - `src/app/api/students/search/route.ts`<br>- `src/app/api/student-transfers/assessment-students/route.ts`<br>- `src/app/api/admin/tra-cuu-hoc-sinh/profiles/route.ts`<br>- `src/app/api/admin/tra-cuu-hoc-sinh/grades/route.ts`<br>- `src/app/api/admin/tra-cuu-hoc-sinh/achievements/route.ts`<br>- `src/app/api/admin/tra-cuu-hoc-sinh/rankings/route.ts`<br>- `src/app/api/admin/tra-cuu-hoc-sinh/filter-options/route.ts`<br>- `src/app/api/admin/ktdbcl/feedback-tracking/route.ts` | `npx vitest run tests/security_asvs_audit.test.ts tests/permissions_idor.test.ts` → **PASS**. Từ chối truy cập ẩn danh và `PARENT` (`401`/`403`), đồng thời áp dụng bộ lọc `campusId: { in: ctx.allowedCampusIds }` cho tài khoản GĐCS. |
| **SEC-05** | **P0 (High)** | **IDOR tại API Mở khóa mục tiêu học sinh (`/api/advisory/goals/unlock`)**: Chỉ kiểm tra đăng nhập chung mà không đối chiếu mối quan hệ giữa người gọi (PHHS / Học sinh / GV) với `studentId`. | - `src/app/api/advisory/goals/unlock/route.ts` | `npx vitest run tests/security_asvs_audit.test.ts` → **PASS**. Bắt buộc gọi `resolveAdvisoryCaller()` và `verifyStudentRelationship(caller, studentId)` ở cả `GET`, `POST`, `PUT`. |
| **SEC-06** | **P0 (High)** | **Thiếu xác thực & kiểm toán tại API Khảo sát đầu vào, Cấu hình & Server Actions**: Các route `input-assessment-students`, `input-assessments`, `input-assessment-assignments`, `assessment-configs` và 9 tệp `"use server"` (`roles`, `maintenance`, `teaching-assignments`, `subjects`, `categories`, `reports`, `surveys`) thiếu kiểm tra phiên quản trị hoặc thiếu ghi `AuditLog`. | - `src/app/api/input-assessment-students/route.ts`<br>- `src/app/api/input-assessments/route.ts`<br>- `src/app/api/input-assessment-assignments/route.ts`<br>- `src/app/api/admin/input-assessment-periods/**`<br>- `src/app/api/admin/input-assessments/categories/**`<br>- `src/app/api/assessment-configs/route.ts`<br>- `src/app/admin/roles/actions.ts`<br>- `src/app/admin/users/actions.ts`<br>- `src/app/admin/maintenance/actions.ts`<br>- `src/app/admin/teaching-assignments/actions.ts`<br>- `src/app/admin/subjects/actions.ts`<br>- `src/app/admin/categories/actions.ts`<br>- `src/app/admin/reports/actions.ts`<br>- `src/app/admin/surveys/[id]/**` | `npx vitest run tests/security_asvs_audit.test.ts` → **PASS**. Tất cả thao tác ghi/xóa/đổi quyền đều kiểm tra quyền ở máy chủ và ghi `AuditLog` (`CREATE_ROLE`, `UPDATE_ROLE_PERMISSIONS`, `CHANGE_USER_ROLES`, `APPROVE_INPUT_ASSESSMENT`, `DELETE_*`). |
| **SEC-07** | **P1 (Medium)** | **Giới hạn tần suất (Rate Limiting), Host Header Injection & Path Traversal**: Đăng nhập và khôi phục mật khẩu chưa giới hạn tần suất; `forgot-password` dùng trực tiếp `req.headers.get('host')` và trả về email chưa che; `export-pdf` và `student-photos` chưa lọc tên tệp qua `path.basename`. | - `src/lib/auth.ts`<br>- `src/app/api/auth/forgot-password/route.ts`<br>- `src/app/api/auth/reset-password/route.ts`<br>- `src/app/api/admin/export-pdf/route.ts`<br>- `src/app/api/student-photos/[studentId]/route.ts`<br>- `src/lib/security-guard.ts` | `npx vitest run tests/security_asvs_audit.test.ts` → **PASS**. Đã áp dụng `checkRateLimit`, `getSafeAppBaseUrl`, `maskEmail`, `sanitizeFileName` và `Cache-Control: private, max-age=3600`. |
| **UX-01** | **P1 (Medium)** | **Đồng bộ chuẩn Sky-Line Academic Ledger & giảm số nút tại Khảo sát đầu vào**: Bảng màu còn sót `violet` và `#0284C7`/`#48BFE3`; mỗi dòng đợt khảo sát và thanh công cụ danh sách học sinh có 4–5 nút cạnh tranh nhau; bộ lọc kỳ khảo sát bị lặp ở 2 hàng; nhãn biểu mẫu lạm dụng `uppercase tracking-widest`. | - `src/app/admin/input-assessments/client.tsx`<br>- `src/app/admin/dieu-hanh-khao-sat/client.tsx`<br>- `src/app/admin/xet-duyet-ket-qua/k12-client.tsx`<br>- `src/app/admin/error.tsx`<br>- `src/app/teacher/error.tsx`<br>- `src/app/parent/error.tsx`<br>- `src/app/hocsinh/portal/error.tsx`<br>- `src/app/teacher/layout.tsx`<br>- `src/config/modules.ts`<br>- `src/config/sidebarTranslations.ts` | `npx vitest run tests/frontend_ux_responsive.test.ts src/lib/gradebook/__tests__/subjectPermissions.test.ts` → **PASS**. Mỗi màn hình/bước chỉ có **1 nút chính nổi bật** (`Tạo đợt khảo sát`, `Thêm học sinh`, `Duyệt kết quả` hoặc `Gửi duyệt kết quả tới GĐCS`), gom thao tác phụ vào menu `"⋯"` có `aria-label`. |

---

## 2. So sánh Trước & Sau Thay đổi Giao diện (Số nút & Số bước thao tác)

| Màn hình / Luồng nghiệp vụ | Trước thay đổi | Sau thay đổi (Sky-Line Academic Ledger) |
| :--- | :--- | :--- |
| **1. Quản lý Kỳ & Đợt khảo sát** (`/admin/input-assessments` - Tab `Tạo đợt khảo sát`) | - Thẻ Kỳ khảo sát: 3 nút rời (`+ Thêm Đợt`, `Sửa`, `Xóa`).<br>- Mỗi dòng Đợt khảo sát: 4–5 nút trực tiếp (`✓ Hoàn thành` trùng với dropdown trạng thái, `+ HS`, `Bàn giao GVụ`, `Phân công`, `Sửa`, `Xóa`). | - Thẻ Kỳ khảo sát: **1 nút chính** (`Tạo đợt khảo sát`) + menu `"⋯"` (`aria-label`).<br>- Mỗi dòng Đợt khảo sát: **1 nút thao tác chính** (`+ Thêm HS`) + menu `"⋯"` (`Bàn giao Giáo vụ`, `Phân công`, `Chỉnh sửa đợt`, `Xóa đợt` kèm cảnh báo số lượng hồ sơ bị ảnh hưởng). Đã bỏ nút `✓ Hoàn thành` trùng chức năng cạnh dropdown. |
| **2. Danh sách Học sinh Khảo sát** (`/admin/input-assessments` - Tab `Danh sách khảo sát Hệ S / Hệ I`) | - Thanh công cụ: 5 nút cạnh nhau (`Mẫu & Xuất Excel`, `Nhập Excel`, `Khảo sát lẻ (30s)`, `Bàn giao Giáo vụ`, `Thêm mới`).<br>- Bộ lọc Kỳ khảo sát bị lặp ở cả Hàng 2 (dropdown) và Hàng 3 (dải nút ngang). | - Thanh công cụ: **1 nút chính nổi bật** (`+ Thêm học sinh`) + 1 menu gom nhóm (`Tiện ích & Excel`). Thanh thao tác hàng loạt (`Chuyển đợt`, `Xóa`) **chỉ hiển thị khi đã chọn dòng**.<br>- Đã bỏ dải nút Kỳ khảo sát trùng lặp ở Hàng 3, giảm từ 3 tầng lọc xuống 2 tầng gọn gàng. |
| **3. Điều hành & Tiến độ Khảo sát** (`/admin/dieu-hanh-khao-sat` - Tab `Tiến độ theo Đợt KS`) | - Mỗi dòng đợt khảo sát xếp chồng 4 nút (`Xác nhận Phân công`, `Phân công`, `Xét duyệt`, `Văn bản`). | - Mỗi dòng hiển thị **1 nút hành động chính theo thẩm quyền/trạng thái** (`Xác nhận phân công` hoặc `Xét duyệt kết quả`) + menu `"⋯"` chứa liên kết điều hướng phụ. |
| **4. Phiếu Xét duyệt Kết quả K-12** (`/admin/xet-duyet-ket-qua` - Modal Hồ sơ Học sinh) | - Chân trang hiển thị 2 nút đậm cạnh nhau; khi người dùng không có quyền duyệt (`!canApprove`), nút chính bị mờ (`disabled`) mà không có nút gửi duyệt thay thế ở vị trí chính. | - Khi `canApprove`: **1 nút chính nổi bật** (`Duyệt kết quả: ...`) + nút phụ viền mảnh (`Lưu & tiếp`).<br>- Khi `!canApprove`: Hiển thị **1 nút chính nổi bật** (`Gửi duyệt kết quả tới GĐCS`) đúng quy trình thực tế. |

---

## 3. Đối chiếu Số lượng Bản ghi & Toàn vẹn CƠ SỞ DỮ LIỆU (`scripts/audit_db_integrity_readonly.js`)

Kết quả đối chiếu chỉ đọc (100% Read-Only) trên `local.db` trước và sau khi thực hiện các bản vá mã nguồn:

| Bảng / Chỉ số Nghiệp vụ | Trước thay đổi | Sau thay đổi | Chênh lệch / Đánh giá |
| :--- | :---: | :---: | :--- |
| `AcademicYear` / `Campus` / `Class` | `2` / `5` / `232` | `2` / `5` / `232` | `0` (Bảo toàn 100%) |
| `Student` (Học sinh toàn hệ thống) | `4,403` | `4,403` | `0` (Không trùng mã HS theo năm học, `0` bản ghi mồ côi) |
| `Teacher` / `Parent` / `ParentStudentLink` | `310` / `1,677` / `1,697` | `310` / `1,677` / `1,697` | `0` (`0` liên kết phụ huynh mồ côi) |
| `User` / `Role` / `Permission` | `1,989` / `18` / `1,588` | `1,989` / `18` / `1,588` | `0` (Bảo toàn 100%) |
| `SubjectGradeEntry` (Điểm sổ điểm) | `6,457` (ĐTB: `8.94`) | `6,457` (ĐTB: `8.94`) | `0` (`6,197` bản ghi có điểm tổng hợp, `0` bản ghi mất liên kết) |
| `StudentTermScore` / `StudentCompetencyAssessment` | `7,382` / `31,100` | `7,382` / `31,100` | `0` (Bảo toàn 100%) |
| `InputAssessmentStudent` (K-12) / Đã duyệt | `528` (`421` đã duyệt) | `528` (`421` đã duyệt) | `0` (`0` bản ghi mất kỳ khảo sát) |
| `PreschoolInputAssessmentStudent` (Mầm non) | `211` | `211` | `0` (Bảo toàn 100%) |

---

## 4. Danh sách Migration & Hướng dẫn Hoàn tác (`Rollback`)

### Migration mới bổ sung:
- **Thư mục:** `prisma/migrations/20261118_security_and_query_indexes/`
  - `migration.sql`: Bổ sung 9 chỉ mục phức hợp (`CREATE INDEX IF NOT EXISTS`) cho `AuditLog`, `InputAssessmentStudent`, `SubjectGradeEntry`, `TeachingAssignment`, `ParentStudentLink`, `PasswordResetToken`.
  - `rollback.sql`: Câu lệnh `DROP INDEX IF EXISTS` tương ứng để hoàn tác an toàn không ảnh hưởng dữ liệu.

### Cách áp dụng & hoàn tác Migration:
```powershell
# Kiểm tra trạng thái CSDL trước khi chạy (Read-Only):
node scripts/audit_db_integrity_readonly.js

# Hoàn tác chỉ mục nếu cần (Rollback):
# Thực thi các câu lệnh DROP INDEX IF EXISTS trong:
# prisma/migrations/20261118_security_and_query_indexes/rollback.sql
```

---

## 5. Báo cáo Kiểm kê Dọn dẹp Chế độ Chỉ Liệt kê (`scripts/cleanup_inventory_dryrun.js`)

| Nhóm dữ liệu / Tệp phát sinh | Chủ sở hữu | Số lượng tệp | Dung lượng | Chính sách lưu trữ & Đề xuất |
| :--- | :--- | :---: | :---: | :--- |
| `NEXT_BUILD_CACHE` (`.next/`) | Next.js Build System | `24,223` | **19,055.50 MB (~19.05 GB)** | Cache biên dịch có thể tái tạo 100%. Đề xuất xóa định kỳ khi dừng dev server (`Remove-Item -Recurse -Force .next`). |
| `TSBUILDINFO_AND_LOGS` (`*.tsbuildinfo`, `*.log`) | TypeScript / Node Runtime | `5` | **0.79 MB** | Tái tạo tự động khi build/typecheck; an toàn để dọn. |
| `EXPIRED_PDF_EXPORTS` (`public/exports/pdf`) | Export PDF Service | `0` | **0.00 MB** | Lưu tạm 24 giờ phục vụ tải xuống. |
| `REDUNDANT_DB_BACKUPS_TMP` (`data-backups/.tmp_*`) | Backup Service | `0` | **0.00 MB** | Đã sạch; giữ nguyên các bản `.db.gz` và `_meta.json` theo chu kỳ 30 ngày. |
| `PROTECTED_STUDENT_PHOTOS` (`public/uploads/students`) | Student Profile Portal | `1,075` | **1,210.16 MB** | **BẢO TOÀN VĨNH VIỄN** (`safeToClean: false`) — Tuyệt đối không xóa. |

---

## 6. Các mục cần Phê duyệt riêng trước khi áp dụng lên Production

1. **Xoay vòng (Rotate) `TURSO_AUTH_TOKEN` và `SYNC_API_SECRET` trên Production (Vercel / Turso Cloud)**:
   - Do JWT token Turso cũ từng xuất hiện dưới dạng fallback trong lịch sử Git, Quản trị viên hệ thống cần tạo token mới trên Turso CLI/Dashboard (`turso db tokens create skyline-survey`), cập nhật vào biến môi trường `TURSO_AUTH_TOKEN` trên Vercel, sau đó thu hồi (`invalidate`) token cũ.
2. **Cấu hình `CRON_SECRET` và `NEXTAUTH_SECRET` trên môi trường Production**:
   - Đảm bảo biến môi trường `CRON_SECRET`, `NEXTAUTH_SECRET` (hoặc `AUTH_SECRET`) và `SYNC_API_SECRET` đã được khai báo đầy đủ trên Vercel trước khi triển khai.
3. **Dọn dẹp thư mục `.next` (~19.05 GB) trên máy chủ phát triển**:
   - Chạy `node scripts/cleanup_inventory_dryrun.js` để xem trước và chỉ xóa `.next` khi không có tiến trình `next dev` / `next build` đang chạy.
