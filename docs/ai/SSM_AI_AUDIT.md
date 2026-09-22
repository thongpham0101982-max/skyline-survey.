# BÁO CÁO TOÀN DIỆN AUDIT HỆ THỐNG HIỆN TẠI (SSM SYSTEM & AI READINESS AUDIT)
**Dự án**: Hệ thống Quản trị Chất lượng Giáo dục SSM — Sky-Line Education Group  
**Tác giả**: Senior AI Architect, Senior Full-Stack Engineer, Security & Data Engineer  
**Thời gian**: 2026-09-22  
**Trạng thái**: Hoàn thành Giai đoạn 1 (Phase 1: System Audit)

---

## 1. TỔNG QUAN HỆ THỐNG HIỆN TẠI (CURRENT ARCHITECTURE)

Hệ thống **SSM (Sky-Line Quality Management System)** là ứng dụng web quản trị chất lượng giáo dục tập trung toàn diện của Hệ thống Giáo dục Sky-Line, được xây dựng trên nền tảng:
- **Framework**: Next.js 16 (Turbopack, App Router, React 19 / Client & Server Components).
- **Ngôn ngữ**: TypeScript (strict typing).
- **ORM & Database**: Prisma ORM, cơ sở dữ liệu quan hệ SQLite / Cloudflare D1 / Turso (qua driver adapters preview feature). Cấu hình chuỗi kết nối lưu trữ cục bộ/môi trường qua biến `.env`.
- **Styling & UI**: TailwindCSS, Lucide React, Glassmorphism design system.
- **Portals phục vụ**:
  1. `/admin`: Ban Điều hành Chuyên môn (Ban ĐHCM), Ban Giám hiệu (BGH), Ban Khảo thí & Đảm bảo Chất lượng (KT-ĐBCL), Ban Giám đốc Cơ sở (GĐCS).
  2. `/teacher`: Giáo viên Bộ môn (GVBM), Giáo viên Chủ nhiệm (GVCN) kiêm Cố vấn Học tập (CVHT), Tổ trưởng Chuyên môn (TTCM), Trưởng Bộ phận (TBP).
  3. `/parent`: Cổng kết nối Phụ huynh học sinh (PHS) theo dõi học tập của con em.
  4. `/hocsinh`: Cổng thông tin Học sinh tự quản lý mục tiêu SMART, kế hoạch 7 ngày gỡ rào cản, khảo sát và đánh giá năng lực.

---

## 2. KIỂM TRA CƠ CHẾ XÁC THỰC & PHIÊN LÀM VIỆC (AUTHENTICATION & SESSIONS)

### 2.1. Xác thực Người dùng Quản trị / Giáo viên / Phụ huynh (NextAuth v5)
- **Tệp nguồn**: [`src/lib/auth.ts`](file:///d:/SSM/skyline-survey/src/lib/auth.ts), [`src/lib/auth.config.ts`](file:///d:/SSM/skyline-survey/src/lib/auth.config.ts).
- **Phương thức**: `CredentialsProvider` đối soát bảng `User` thông qua `email` hoặc `identifier` (mã nhân sự, mã phụ huynh) và mật khẩu đã băm (Bcrypt hash).
- **Session Payload**: Lưu trữ `userId`, `role`, `fullName`, `email`, `campusIds`.
- **Hệ thống phân cấp Role chính quy trong User**:
  - `ADMIN`, `SUPER_ADMIN`: Toàn quyền hệ thống.
  - `KT_DBCL`, `KHAO_THI`: Ban Khảo thí & Đảm bảo Chất lượng (toàn trường).
  - `BAN_DHCM`, `TB_DHCM`, `QLCM`: Ban Điều hành Chuyên môn / Quản lý Chuyên môn.
  - `GDCS`: Giám đốc Cơ sở (giới hạn theo cơ sở được giao).
  - `TBP`: Trưởng Bộ phận (quản lý liên Tổ chuyên môn trong Bộ phận).
  - `TTCM`: Tổ trưởng Chuyên môn (quản lý 1 Tổ chuyên môn phụ trách).
  - `TEACHER`, `GV`, `GV_MN`, `GVNN`: Giáo viên giảng dạy / GVCN.
  - `PARENT`: Phụ huynh học sinh.

### 2.2. Xác thực Cổng Học sinh (Student Token Session)
- **Tệp nguồn**: [`src/lib/student-session.ts`](file:///d:/SSM/skyline-survey/src/lib/student-session.ts).
- **Phương thức**: Cookie HTTP-only `hs_token` được mã hóa và ký HMAC-SHA256 sử dụng khóa bí mật `STUDENT_SESSION_SECRET`.
- **Payload**: `studentId`, `studentCode`, `studentName`, `classId`, `className`, `campusId`, `campusName`, `academicYearId`, `exp`.
- **Cơ chế cô lập**: Đã được rà soát và cấu hình triệt để tại [src/app/api/assistant/route.ts](file:///d:/SSM/skyline-survey/src/app/api/assistant/route.ts), đảm bảo cookie `hs_token` chỉ kích hoạt tại `/hocsinh/*`, không bao giờ ghi đè lên phiên làm việc của Quản trị viên hay Giáo viên.

---

## 3. KIỂM TRA PHÂN QUYỀN & KHÔNG GIAN DỮ LIỆU (ROLES, PERMISSIONS & SCOPE)

### 3.1. Phân quyền Module Động (Dynamic Permission Service)
- **Tệp nguồn**: [`src/lib/permissions.ts`](file:///d:/SSM/skyline-survey/src/lib/permissions.ts).
- **Bảng CSDL liên quan**: Bảng `Permission` lưu trữ `(roleCode, module, canRead, canCreate, canUpdate, canDelete)`.
- **Cơ chế chuẩn hóa**: Hàm `getRoleVariants(roleCode)` hỗ trợ chuẩn hóa ký tự hoa thường, dấu gạch nối, khoảng trắng.

### 3.2. Đa tầng Phân vùng Dữ liệu (Multi-Level Scoping Service)
- **Tệp nguồn**: [`src/lib/session.ts`](file:///d:/SSM/skyline-survey/src/lib/session.ts).
- Hệ thống hỗ trợ xử lý kiêm nhiệm (**Union Scope Principle**) dựa trên hồ sơ `Teacher`:
  - **Cơ sở (Campus Scope)**:
    - Cơ sở Sky-Line: CS1 (Riverside), CS2 (Trung tâm), CS3 (Quốc tế), CS4 (Hội An), CS5 (Liên Chiểu).
    - `allowedCampusIds`: GĐCS chỉ truy xuất dữ liệu trong cơ sở mình quản lý. Admin và Ban ĐHCM không bị giới hạn.
  - **Bộ phận (Division Scope - 6 Bộ phận)**:
    - Gồm: `BP_TRUNG_HOC`, `BP_TIEU_HOC`, `BP_MAM_NON`, `BP_STEM_ICT`, `BP_TA_CTQT`, `BP_HDNG_CTHS`.
    - Trưởng Bộ phận (TBP) chỉ được truy cập dữ liệu của các Tổ Chuyên môn trực thuộc Bộ phận mình được giao (`TeacherDivisionAssignment`).
  - **Tổ Chuyên Môn (Department / TCM Scope)**:
    - Tổ trưởng Chuyên môn (TTCM) chỉ được xem dữ liệu giáo viên, tiến độ sổ điểm và tiết dự giờ của các thành viên trong đúng Tổ của mình (`TeacherDepartmentAssignment.position === "TTCM"`).
  - **Lớp & Môn học (Class & Subject Scope)**:
    - Giáo viên bộ môn (GVBM): Chỉ truy cập các lớp/môn mình được phân công (`TeachingAssignment`).
    - Giáo viên chủ nhiệm (GVCN): Xem toàn bộ học sinh, cảnh báo học tập (Xanh/Vàng/Đỏ), sổ mục tiêu của lớp mình chủ nhiệm (`ClassHomeroomTeacher`).
  - **Phụ huynh (Parent Scope)**:
    - Bắt buộc qua bảng liên kết `ParentStudentLink`. Nghiêm cấm tuyệt đối truy xuất chéo sang học sinh khác.

---

## 4. KIỂM TRA CẤU TRÚC MÔ HÌNH CƠ SỞ DỮ LIỆU (DATABASE MODELS AUDIT)

Trích xuất từ [`prisma/schema.prisma`](file:///d:/SSM/skyline-survey/prisma/schema.prisma) (tổng cộng 2.365 dòng lệnh schema):

| Phân hệ nghiệp vụ | Bảng CSDL cốt lõi | Ý nghĩa & Dữ liệu quản trị |
|---|---|---|
| **Người dùng & Nhân sự** | `User`, `Teacher`, `Parent`, `Student` | Hồ sơ nhân sự, giáo viên, phụ huynh và học sinh toàn trường. |
| **Tổ chức & Phạm vi** | `Campus`, `Department`, `Class`, `AcademicYear`, `Subject` | Danh mục 5 cơ sở, các tổ chuyên môn, 231 lớp học, niên khóa và môn học. |
| **Kiêm nhiệm & Phân công** | `TeacherDepartmentAssignment`, `TeacherDivisionAssignment`, `TeachingAssignment`, `ClassHomeroomTeacher`, `UserCampusAssignment` | Ma trận phân công giảng dạy, chủ nhiệm, phụ trách TCM và Bộ phận. |
| **Sổ điểm & Khảo thí** | `SubjectGradeEntry`, `GradeConfig`, `SubjectBenchmarkConfig`, `Exam`, `ExamRound` | Toàn bộ điểm kiểm tra định kỳ (thường xuyên, GK1, CK1, GK2, CK2), điểm tổng kết `compositeScore`, chuẩn điểm benchmark (7.0 Tiểu học, 6.0 THCS/THPT). |
| **Đánh giá Năng lực** | `StudentCompetencyAssessment`, `StudentSubjectCompetencySummary`, `ImportBatch` | Đánh giá năng lực môn học, năng lực cốt lõi theo thang điểm và biểu đồ Radar. |
| **Dự giờ Sư phạm** | `ObservationSlot`, `ObservationRegistration`, `ObservationEvaluation` | 11 tiêu chí dự giờ sư phạm chuẩn Sky-Line (Y1-Y11, thang điểm 20.00), phân loại xếp loại tiết dạy (Tốt/Khá/Đạt/Chưa đạt), ý kiến đóng góp chuyên môn. |
| **Cố vấn Học tập & SMART** | `StudentGoal`, `StudentGoalUnlock`, `StudentAdvisoryStatus`, `AcademicConsultationLog`, `StudentHelpRequest`, `StudentReflection` | Sổ mục tiêu SMART, kế hoạch 7 ngày vượt rào cản, trạng thái cảnh báo sớm nguy cơ (Xanh / Vàng / Đỏ), biên bản các phiên cố vấn học tập. |
| **Hoạt động Trải nghiệm** | `ExperientialActivity`, `ExperientialActivityRegistration`, `ExperientialActivityReport` | Kế hoạch dự án trải nghiệm thực tế, phân công phụ trách và báo cáo chất lượng. |
| **Khảo sát & Đo lường NPS** | `Survey`, `SurveyForm`, `SurveyResponse`, `SummarySystem` | Đánh giá độ hài lòng phụ huynh, giáo viên, chỉ số Net Promoter Score (NPS). |
| **Nhiệm vụ & Vận hành** | `WorkTask`, `WeeklyReport`, `AuditLog` | Điều phối công việc tuần, giao việc định kỳ và lưu vết thay đổi dữ liệu. |

---

## 5. RÀ SOÁT MÃ NGUỒN AI HIỆN TẠI (EXISTING AI ARTIFACTS AUDIT)

Hệ thống hiện có module trợ lý sơ khởi tại `src/lib/assistant/`:
1. [`personas.ts`](file:///d:/SSM/skyline-survey/src/lib/assistant/personas.ts): Khai báo 6 Persona giao tiếp theo vai trò.
2. [`tools/`](file:///d:/SSM/skyline-survey/src/lib/assistant/tools/): Bao gồm các bộ công cụ đọc dữ liệu:
   - `adminTools.ts`: Thống kê sổ điểm toàn trường, dự giờ các tổ, NPS, rủi ro.
   - `teacherTools.ts`: Tiến độ vào điểm, học sinh dưới chuẩn, cảnh báo lớp chủ nhiệm, chỉ tiêu dự giờ cá nhân.
   - `tcmTools.ts`: Quản lý danh sách giáo viên TCM, chất lượng môn học và dự giờ TCM.
   - `parentTools.ts`: Kết quả học tập và mục tiêu của con em liên kết.
   - `studentTools.ts`: Bảng điểm, radar năng lực, sổ mục tiêu SMART.
3. [`nativeEngine.ts`](file:///d:/SSM/skyline-survey/src/lib/assistant/nativeEngine.ts): Bộ máy thông minh xử lý offline trực tiếp trên CSDL thật, không phụ thuộc API Key bên ngoài.
4. [`knowledgeBase.ts`](file:///d:/SSM/skyline-survey/src/lib/assistant/knowledgeBase.ts): Mảng dữ liệu tĩnh hardcode chứa một số quy chế.
5. [`SSMAssistantWidget.tsx`](file:///d:/SSM/skyline-survey/src/components/SSMAssistantWidget.tsx): Giao diện ngăn trượt bên phải màn hình (Right-side drawer) với tab ghim cạnh phải và cơ chế toggle ẩn/hiện.

### Hạn chế cốt lõi cần giải quyết:
- **Chưa có RAG & Vector Engine chính thức**: Dữ liệu tri thức quy chế đang lưu ở dạng tĩnh, chưa hỗ trợ trích xuất theo vector embedding và siêu dữ liệu (metadata filter: niên khóa, phiên bản hiệu lực, cơ sở, vai trò).
- **Chưa có Permission Gateway trung tâm**: Logic kiểm tra phân quyền đang nằm phân tán trong từng function tool.
- **Chưa có Deterministic Analytics Engine độc lập**: Các chỉ số phân tích sâu (phân vị, trung vị, độ lệch chuẩn, khoảng chênh GAP, tương quan scatter plot) còn tính toán rải rác.
- **Thiếu Audit Log chuyên biệt cho AI**: Chưa có bảng lưu vết phiên truy vấn, token usage, latency, intent, và quyết định cấp quyền của AI.
- **Chưa có cơ chế Human Confirmation (HITL)**: Cần thiết lập cấu trúc cho giai đoạn sau khi bổ sung các hành động cập nhật dữ liệu.

---

## 6. MA TRẬN RỦI RO BẢO MẬT & TÍCH HỢP (RISK ASSESSMENT)

| Rủi ro (Risk) | Cấp độ | Phân tích chi tiết | Biện pháp kiểm soát (Remediation) |
|---|---|---|---|
| **Rủi ro rò rỉ chéo dữ liệu (Cross-Scope Leakage)** | **CRITICAL** | Người dùng tìm cách bypass scope qua prompt (ví dụ: GV hỏi điểm lớp trường khác hoặc PHS hỏi điểm học sinh khác). | Triển khai **Permission Gateway độc lập**. Mọi Tool Execution bắt buộc xác thực lại User Context từ Session máy chủ. Tuyệt đối không tin tưởng client filter. |
| **Prompt Injection & System Instruction Override** | **HIGH** | Nội dung trong tài liệu quy chế hoặc tin nhắn người dùng chứa chỉ thị phá vỡ System Prompt. | Thiết lập **Security Guardrails** phân tách rõ ràng: Coi tài liệu RAG và truy vấn người dùng là **DATA thuần túy**, không bao giờ là Instruction. |
| **AI Hallucination (Bịa đặt dữ liệu điểm số/quy chế)** | **HIGH** | LLM tự tính toán hoặc đoán điểm số, tên học sinh khi dữ liệu chưa có. | **Zero Hallucination Rule**: Chỉ số phân tích BẮT BUỘC lấy từ **Analytics Engine tính toán cụ thể**. Nếu Tool trả về rỗng, AI phải trả lời trung thực "Chưa có dữ liệu". |
| **Lạm dụng tài nguyên & Quá tải (Resource Exhaustion)** | **MEDIUM** | Người dùng gửi spam request liên tục làm nghẽn tiến trình Node.js hoặc cạn quota LLM. | Cấu hình **Rate-Limiting**, cơ chế Fallback sang **Native Engine**, và bộ nhớ đệm Cache thông minh cho Knowledge retrieval. |
| **Thay đổi schema gây vỡ kiến trúc cũ (Destructive Migration)** | **HIGH** | Tạo migration phá vỡ các bảng hiện có đang vận hành 24/7 của nhà trường. | Áp dụng nguyên tắc **Additive Migration 100%**: Chỉ thêm mới bảng/cột phục vụ AI (Audit, RAG documents), tuyệt đối không sửa đổi cột hiện tại. |

---

## 7. KẾT LUẬN AUDIT GIAI ĐOẠN 1
- Toàn bộ nền tảng SSM hiện tại rất vững chắc về cấu trúc phân quyền đa tầng (Campus, Division, Department, Homeroom, Teaching Assignment).
- Các API và services dữ liệu thực tế đang hoạt động ổn định và sẵn sàng cung cấp nguồn dữ liệu chuẩn hóa cho AI.
- Kiến trúc AI mới sẽ được xây dựng theo mô hình **Độc lập - Mô-đun hóa - An toàn (Decoupled & Secure AI Service Layer)** tại `/src/services/ai` mà không làm xáo trộn bất kỳ chức năng vận hành nào của hệ thống SSM.
