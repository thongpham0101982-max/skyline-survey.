# TÀI LIỆU KIẾN TRÚC & KẾ HOẠCH TÍCH HỢP CHỨC NĂNG HỌP PHỤ HUYNH SỐ (DIGITAL PARENT MEETING) – SSM SKY-LINE

**Phiên bản:** 1.0  
**Hệ thống:** SSM Sky-Line (`skyline-survey`)  
**Trạng thái:** Đã khảo sát kiến trúc & Triển khai tích hợp

---

## 1. KHẢO SÁT KIẾN TRÚC HIỆN HỮU (CURRENT ARCHITECTURE SURVEY)

### 1.1. Công nghệ nền tảng (Tech Stack)
- **Framework Frontend & Backend:** Next.js `16.2.2` (App Router, Server Actions & Route Handlers `/api/*`), React `19.2.4`, TypeScript `5`.
- **Cơ sở dữ liệu & ORM:** Prisma `5.20.0` kết hợp `@libsql/client` và `@prisma/adapter-libsql` (`src/lib/db/index.ts`), vận hành cơ chế **SmartPrisma Dual-DB Proxy** đồng bộ giữa Local SQLite (`local.db`) và Turso Cloud.
- **Xác thực (Authentication):** `next-auth` (`v5.0.0-beta.30`) tại `src/lib/auth.ts` sử dụng chiến lược JWT (`session.user.id`, `session.user.email`, `session.user.role`, `session.user.campusIds`).
- **Thư viện sẵn có có thể tái sử dụng:**
  - `qrcode` (`^1.5.4`): Sinh mã QR chuẩn Data URL / SVG ngay trên server và client.
  - `lucide-react`: Hệ thống icon đồng nhất toàn hệ thống.
  - `recharts`: Biểu đồ phân tích xu hướng, so sánh cơ sở/lớp cho Ban KT&ĐBCL.
  - `xlsx` & `html2pdf.js`: Xuất báo cáo Excel và xuất Biên bản họp số / Báo cáo PDF.
  - `vitest` (`^5.0.1`): Kiểm thử tự động unit & integration test.

### 1.2. Cơ chế Phân quyền (RBAC) & Phạm vi dữ liệu (Operational Scope)
- **Quản lý phiên & phạm vi (`src/lib/session.ts`):**
  - `getAdminSession()` và `getOperationalScope()` xác định `role`, `isSuperAdmin`, `isKTDBCL`, `isGDCS`, `isCampusScoped`, `allowedCampusIds`.
  - Hỗ trợ đầy đủ các vai trò: `SUPER_ADMIN`, `ADMIN`, `KT_DBCL`, `GDCS` (giới hạn theo `campusIds`), `TB_DHCM`, `TBP`, `TTCM`, `TEACHER` (GVCN, GVBM, CVHT), `PARENT`.
- **Ma trận phân quyền module (`src/lib/permissions.ts` & `src/config/modules.ts`):**
  - Định nghĩa danh mục module theo `APP_CATEGORIES` và kiểm tra quyền đọc/ghi qua `getRoleReadableModules()`, `hasModulePermission()`.

### 1.3. Các bảng dữ liệu cốt lõi được tái sử dụng (Zero Data Duplication)
Chức năng Họp Phụ huynh số **tuyệt đối không tạo bảng học sinh, phụ huynh, giáo viên hay lớp học trùng lặp**, mà liên kết khóa ngoại/logic trực tiếp với:
1. **`AcademicYear` (`academic_years`) & `Campus` (`campuses`)**: Quản lý năm học, học kỳ và cơ sở đào tạo.
2. **`Class` (`classes`)**: Chứa `id`, `name`, `grade`, `level`, `campusId`, `academicYearId`, `homeroomTeacherId` (GVCN).
3. **`Student` (`students`)**: Hồ sơ học sinh (`id`, `studentCode`, `fullName`, `classId`, `campusId`, `status`).
4. **`Parent` (`parents`) & `ParentStudentLink` (`parent_student_links`)**: Hồ sơ phụ huynh gắn với `userId` (`User`) và liên kết nhiều-nhiều với học sinh kèm `relationship` (Bố, Mẹ, Người giám hộ...), hỗ trợ:
   - Một phụ huynh có nhiều con học tại trường (khác lớp/khối/cơ sở).
   - Một học sinh có nhiều người giám hộ (Bố, Mẹ, Người đại diện).
5. **`Teacher` (`teachers`) & `TeacherClassAssignment` (`teacher_class_assignments`)**: Hồ sơ giáo viên (`userId`, `fullName`, `email`, `campusId`) và phân công GVCN / GVBM / CVHT.

### 1.4. Các module nghiệp vụ liên quan & Điểm tích hợp (Integration Points)
1. **Parent Portal (`src/app/parent/*`, `src/lib/parentData.ts`):**
   - Sử dụng `getParentProfileWithStudents(userId)` và `getParentChildren(userId)` để lấy danh sách con của PHHS.
   - Điều hướng tại `src/components/Sidebar.tsx` (`role === "PARENT"`), `src/components/ParentMobileBottomNav.tsx` và trang chủ `src/app/parent/ParentDashboardClient.tsx`.
2. **Module Trao đổi & Đồng hành (`src/lib/coordination/*`):**
   - Đang vận hành với các bảng `CommunicationThread`, `CommunicationMessage`, `CommunicationParticipant`, `CommunicationCase`, `CommunicationCaseHistory`, `CommunicationSatisfaction`.
   - **Điểm tích hợp:** Mọi ý kiến/góp ý trước, trong và sau cuộc họp PHHS (`ParentMeetingFeedbackLink`) được liên kết trực tiếp với `CommunicationThread` & `CommunicationCase` để tái sử dụng luồng hội thoại nhiều lượt, tính hạn SLA (`calculateBusinessHoursSlaDue`), chuyển tiếp GVBM/CVHT/Bộ phận và đánh giá CSAT.
3. **Module Sổ Giáo viên & Task Engine (`src/services/taskEngine/index.ts`, bảng `WorkTask`):**
   - `aggregateTeacherTasks()` tổng hợp nhiệm vụ của giáo viên từ các module.
   - **Điểm tích hợp:** Nhiệm vụ sau họp (`ParentMeetingTask`) tự động đồng bộ bản ghi tương ứng vào `WorkTask` (với tag `[Họp PHHS]`) và tích hợp vào `aggregateTeacherTasks()` để GVCN/GVBM/CVHT theo dõi ngay trong Sổ Giáo viên cũng như tại tab Nhiệm vụ sau họp.
4. **Hệ thống Thông báo, Email & Audit Log:**
   - Thông báo nội bộ qua bảng `Notification` & `CommunicationNotification`.
   - Gửi email qua `sendEmail()` (`src/lib/mail.ts`).
   - Ghi nhật ký hệ thống qua `logActivity()` (`src/lib/audit.ts`) kết hợp bảng chuyên biệt `ParentMeetingAuditLog`.

---

## 2. THIẾT KẾ CƠ SỞ DỮ LIỆU & CHIẾN LƯỢC MIGRATION AN TOÀN

### 2.1. Danh sách các bảng mới (10 Models)
1. **`ParentMeeting` (`parent_meetings`)**: Lưu thông tin cuộc họp (Mã cuộc họp, tiêu đề, loại cuộc họp `DINH_KY | CHUYEN_DE | DOT_XUAT | CA_NHAN`, năm học, học kỳ, cơ sở, khối, thời gian bắt đầu/kết thúc, địa điểm, link trực tuyến, chương trình họp, người chủ trì, người lập kế hoạch, trạng thái `DRAFT | PENDING_APPROVAL | PUBLISHED | IN_PROGRESS | COMPLETED | CANCELLED`, khung giờ xác nhận RSVP và khung giờ điểm danh QR).
2. **`ParentMeetingClass` (`parent_meeting_classes`)**: Gán một hoặc nhiều lớp vào cuộc họp (`meetingId`, `classId`, `homeroomTeacherId`, phòng họp riêng của từng lớp nếu họp toàn trường/khối sau đó tách về lớp).
3. **`ParentMeetingInvitation` (`parent_meeting_invitations`)**: Danh sách mời tự động trích xuất từ học sinh và người giám hộ hợp lệ (`meetingId`, `classId`, `studentId`, `parentId`, `rsvpStatus`: `PENDING | CONFIRMED | ABSENT | DELEGATED`, thông tin người tham dự thay thế, số người dự kiến).
4. **`ParentMeetingQrSession` (`parent_meeting_qr_sessions`)**: Quản lý phiên mã QR bảo mật (`tokenHash`, `qrToken` ký HMAC-SHA256, gắn chặt với `meetingId`, `classId`, `studentId`, `parentId`, `expiresAt`, `status`, chống phát lại).
5. **`ParentMeetingAttendance` (`parent_meeting_attendance`)**: Kết quả điểm danh (`QR_SCAN` hoặc `MANUAL`), lưu vai trò người dự (`BO | ME | NGUOI_GIAM_HO | NGUOI_DAI_DIEN | CA_BO_VA_ME`), `attendeeCount` (số người thực tế tham dự cho học sinh đó), lý do điểm danh thủ công, người xác nhận, và `idempotencyKey` chống ghi trùng khi 2 giáo viên quét cùng lúc.
6. **`ParentMeetingFeedbackLink` (`parent_meeting_feedback_links`)**: Liên kết ý kiến cuộc họp (`PRE_MEETING | DURING_MEETING | POST_MEETING`) với `CommunicationThread` & `CommunicationCase`, lưu 7 nhóm chủ đề chuẩn, phạm vi hiển thị (`PRIVATE | CLASS_SHARED_ANONYMOUS | ESCALATED`), người tiếp nhận, người xử lý, hạn xử lý (`dueAt`), trạng thái nghiệp vụ (`NEW | IN_PROGRESS | WAITING_COORDINATION | RESPONDED | COMPLETED`) và điểm hài lòng CSAT.
7. **`ParentMeetingMinutes` (`parent_meeting_minutes`)**: Biên bản họp điện tử theo từng lớp của cuộc họp (`DRAFT | PENDING_APPROVAL | APPROVED | PUBLISHED | REJECTED`), thống kê tỷ lệ tham dự, nội dung trình bày, thảo luận, ý kiến chung (đã ẩn danh/được phép chia sẻ), kết luận, người ghi, người phê duyệt.
8. **`ParentMeetingMinutesVersion` (`parent_meeting_minutes_versions`)**: Lưu lịch sử phiên bản biên bản họp số (`versionNumber`, `snapshotJson`, người cập nhật, tóm tắt thay đổi).
9. **`ParentMeetingTask` (`parent_meeting_tasks`)**: Nhiệm vụ sau họp gắn với `meetingId`, `classId`, `minutesId`, `feedbackLinkId` và liên kết `linkedWorkTaskId` (`WorkTask`), lưu người phụ trách, bộ phận, hạn hoàn thành, mức độ ưu tiên, trạng thái, minh chứng, kết quả và cờ `visibleToParents`.
10. **`ParentMeetingAuditLog` (`parent_meeting_audit_logs`)**: Nhật ký kiểm toán toàn bộ thao tác nhạy cảm (công bố lịch, phát hành/quét QR, điểm danh thủ công, chuyển người xử lý góp ý, trình duyệt/phê duyệt/công bố biên bản).

### 2.2. Chiến lược Khởi tạo & Rollback (Zero-Downtime Migration & Rollback Plan)
- **Forward Migration:**
  - Khai báo đầy đủ 10 models trong `prisma/schema.prisma` và chạy `npx prisma generate`.
  - Sử dụng `ensureParentMeetingTables()` trong `src/lib/parent-meeting/schemaInit.ts` với các câu lệnh `CREATE TABLE IF NOT EXISTS` và `CREATE UNIQUE INDEX IF NOT EXISTS` để tự động khởi tạo an toàn trên cả Local SQLite và Turso Cloud mà không làm gián đoạn hoặc mất dữ liệu hiện hữu.
- **Rollback Plan:**
  - Do tất cả bảng mới đều sử dụng tiền tố độc lập `parent_meeting_*` và không sửa đổi cột bắt buộc của bất kỳ bảng hiện hữu nào (`students`, `parents`, `classes`, `teachers`), việc rollback có thể thực hiện tức thì bằng cách tắt route/feature flag hoặc chạy script `rollbackParentMeetingTables()` (drop các bảng `parent_meeting_*`) mà không ảnh hưởng đến bất kỳ module nào đang chạy.

---

## 3. PHÂN TÍCH RỦI RO TƯƠNG THÍCH & BIỆN PHÁP BẢO MẬT

| Rủi ro / Yêu cầu | Giải pháp kiến trúc trong hệ thống |
| :--- | :--- |
| **Lộ mã học sinh trong QR hoặc giả mạo QR** | Tuyệt đối không dùng `studentCode` làm nội dung QR. Sử dụng token ký số HMAC-SHA256 (`pmqr_v1.<payloadBase64Url>.<signature>`) kết hợp `tokenHash` lưu trong `parent_meeting_qr_sessions`, kiểm tra `expiresAt` và `meetingId`. |
| **Hai giáo viên quét cùng 1 mã QR đồng thời** | Ràng buộc `UNIQUE(meeting_id, student_id, parent_id)` trên bảng `parent_meeting_attendance` kết hợp xử lý Upsert / Idempotency nguyên tử, đảm bảo không tạo bản ghi điểm danh trùng và phản hồi trạng thái nhất quán. |
| **Sai lệch chỉ số người dự và đại diện học sinh** | Bảng `ParentMeetingAttendance` tách biệt rõ `attendeeCount` (tổng số người thực tế tham dự, ví dụ cả Bố và Mẹ cùng đi = 2) và truy vấn `COUNT(DISTINCT studentId)` cho số học sinh có ít nhất 1 đại diện tham dự. |
| **IDOR (Phụ huynh xem dữ liệu con người khác / GVCN sửa lớp khác)** | Mọi API đều xác thực session tại backend, đối chiếu `ParentStudentLink` (đối với PHHS) hoặc `Class.homeroomTeacherId` / `TeacherClassAssignment` (đối với GVCN) và `allowedCampusIds` (đối với GĐCS). |
| **Lộ thông tin góp ý riêng tư trong Biên bản họp lớp** | Góp ý có `visibilityScope = PRIVATE` chỉ hiển thị cho PHHS gửi, GVCN lớp đó, người được phân công xử lý và cấp quản lý có thẩm quyền; chức năng tổng hợp biên bản tự động loại trừ tuyệt đối các ý kiến `PRIVATE`. |
| **Biên bản chưa duyệt bị lộ cho PHHS** | API của Parent Portal chỉ trả về biên bản có `status === 'PUBLISHED'` (hoặc `'APPROVED'` đã công bố); biên bản `DRAFT`, `PENDING_APPROVAL`, `REJECTED` bị chặn hoàn toàn ở tầng service. |
