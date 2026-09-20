# SSM — MONTHLY & QUARTERLY OPERATING CYCLE (56 BƯỚC QUẢN TRỊ VẬN HÀNH CHUẨN)
## HỆ THỐNG QUẢN LÝ CHẤT LƯỢNG GIÁO DỤC SKY-LINE (SSM)

**Tình trạng áp dụng:** BẮT BUỘC & VĨNH VIỄN TOÀN HỆ THỐNG  
**Nguyên tắc cốt lõi:** **STABLE BY DEFAULT — CHANGE BY EVIDENCE — SMALL BATCH — CONTROLLED RELEASE — MEASURE AFTER CHANGE**  

---

### TỔNG QUAN NGUYÊN TẮC CHUNG
- Không tiếp tục refactor chỉ vì thấy code có thể đẹp hơn.
- Mọi thay đổi phải bắt nguồn từ: *Dashboard, Adoption, Data Quality, Incident, Performance, Security, Technical Debt, User Feedback*.

---

### GIAI ĐOẠN 1: THU THẬP & ĐÁNH GIÁ ĐỊNH KỲ (BƯỚC 1 – BƯỚC 13)

#### BƯỚC 1 — THU THẬP DỮ LIỆU VẬN HÀNH
Trong suốt tháng, chỉ thu thập và theo dõi 8 nhóm: System Health, Adoption, Workflow Completion, Data Quality, Incidents, Performance, User Feedback, Technical Debt. Không sửa ngay khi phát hiện vấn đề (trừ P0/P1 nghiêm trọng, Security Critical, Data Integrity Critical).

#### BƯỚC 2 — SYSTEM HEALTH REVIEW
Thu thập: Availability, API success rate, API p50/p95/p99, Frontend errors, Backend errors, Database latency, Failed jobs, Email failures, Storage, Backup status. Phân loại: `HEALTHY`, `WATCH`, `ACTION REQUIRED`.

#### BƯỚC 3 — ADOPTION REVIEW
Không chỉ đếm login. Theo dõi theo 8 role: GV, GVCN, TTCM, QLCM, TBP, GĐCS, Ban KT&ĐBCL, Học sinh. Đo: Eligible Users, Active Users, Meaningful Active Users, Workflow Started, Workflow Completed.

#### BƯỚC 4 — WORKFLOW COMPLETION REVIEW
Kiểm tra riêng từng quy trình trọng yếu:
- **Dự giờ:** Mở tiết $\rightarrow$ Đăng ký $\rightarrow$ Đánh giá $\rightarrow$ Duyệt $\rightarrow$ Hoàn thành.
- **Cố vấn:** Mở phiếu $\rightarrow$ Nhập mục tiêu $\rightarrow$ Lưu $\rightarrow$ Hoàn thành $\rightarrow$ Theo dõi GAP.
- **Hỗ trợ / Tâm lý:** Khởi tạo $\rightarrow$ Theo dõi tuần $\rightarrow$ Đánh giá tháng $\rightarrow$ Tiếp tục / Kết thúc.
- **Hoạt động trải nghiệm:** Tạo hoạt động $\rightarrow$ Phân công $\rightarrow$ Điểm danh $\rightarrow$ Đánh giá $\rightarrow$ Hoàn thành.
- **Khảo thí:** Nhập kết quả $\rightarrow$ Validate $\rightarrow$ Đối soát $\rightarrow$ Phân tích $\rightarrow$ Báo cáo.
Ghi: Started, Completed, Failed, Drop-off.

#### BƯỚC 5 — DATA QUALITY REVIEW
Kiểm tra theo từng module: Missing, Duplicate, Invalid, Stale, Unmapped, Wrong Academic Year, Wrong Campus, Wrong Student ID, Wrong Subject Mapping, Dashboard mismatch.

#### BƯỚC 6 — SUBJECT MAPPING VALIDATION
Đối với dữ liệu môn học: Raw Subject $\rightarrow$ Normalize $\rightarrow$ Canonical Subject $\rightarrow$ Subject ID. Tìm: Unmapped Subject, Ambiguous Subject, Duplicate Alias, String-based joins. Không tự sửa hàng loạt nếu chưa kiểm chứng.

#### BƯỚC 7 — GAP VALIDATION
Chọn mẫu HS ngẫu nhiên. Đối chiếu Target, Current, Expected GAP, Actual GAP trên: Cố vấn, Khảo thí, Hồ sơ HS 360, Dashboard. Yêu cầu: **ONE GAP RESULT**.

#### BƯỚC 8 — INCIDENT REVIEW
Tổng hợp sự cố trong tháng. Mỗi incident ghi: ID, Severity, Module, Impact, Root Cause, Resolution, Data Impact, Repeated? Phân loại: P0, P1, P2, P3.

#### BƯỚC 9 — PHÂN TÍCH INCIDENT LẶP
Nếu cùng lỗi xuất hiện nhiều lần: không tiếp tục vá triệu chứng. Đánh dấu: `ROOT CAUSE FIX REQUIRED`.

#### BƯỚC 10 — PERFORMANCE REVIEW
Đo các màn hình quan trọng: Login, Dashboard, Student List, Student 360, Dự giờ, Cố vấn, Trải nghiệm, Question Bank, Assessment Analytics, Reports. Đo: p50, p95, p99, Error Rate. Chỉ ưu tiên vấn đề: Repeated + High Usage + High Impact.

#### BƯỚC 11 — USER FEEDBACK REVIEW
Tổng hợp phản hồi. Phân loại: `BUG`, `USABILITY`, `TRAINING`, `PERMISSION`, `DATA`, `PERFORMANCE`, `FEATURE REQUEST`, `BUSINESS PROCESS`. Gộp feedback trùng thành một issue.

#### BƯỚC 12 — TECHNICAL DEBT REVIEW
Rà Technical Debt Register. Ưu tiên debt nếu: Gây bug lặp lại, Gây security risk, Gây data risk, Gây performance issue, Cản trở phát triển. Không sửa debt chỉ vì code chưa đẹp.

#### BƯỚC 13 — ROOT CAUSE ANALYSIS
Mỗi vấn đề phải được map vào một nhóm: UI/UX, Training, Business Process, Data, RBAC, API, Database, Performance, Integration, Infrastructure, Unknown. Nếu `Root Cause = Unknown` thì `OBSERVE / INVESTIGATE`, không implement.

---

### GIAI ĐOẠN 2: PHÂN LOẠI, ƯU TIÊN & PHÊ DUYỆT BATCH (BƯỚC 14 – BƯỚC 21)

#### BƯỚC 14 — MONTH-END ISSUE REGISTER
Tạo `MONTH-END-ISSUE-REGISTER.md` ghi nhận đầy đủ ID, Problem, Evidence, Root Cause, Affected Roles, Affected Modules, Impact, Frequency, Risk, Recommendation.

#### BƯỚC 15 — PHÂN LOẠI ISSUE
Mỗi issue chỉ thuộc một nhóm: `MUST FIX`, `IMPROVE`, `OBSERVE`, `TRAINING`, `DATA CLEANUP`, `TECHNICAL HARDENING`, `QUARTERLY CANDIDATE`, `CLOSE`.

#### BƯỚC 16 — ƯU TIÊN
Thứ tự mặc định: 1. Security $\rightarrow$ 2. Data Integrity $\rightarrow$ 3. RBAC $\rightarrow$ 4. P0/P1 $\rightarrow$ 5. Repeated Incident $\rightarrow$ 6. Workflow Blocker $\rightarrow$ 7. Performance $\rightarrow$ 8. High-frequency UX $\rightarrow$ 9. Technical Debt $\rightarrow$ 10. Cosmetic.

#### BƯỚC 17 — CHỌN MONTHLY IMPROVEMENT BATCH
Không lấy toàn bộ backlog. Ưu tiên 3–5 vấn đề có đặc điểm: High impact, Small scope, Measurable, Testable, Reversible, Low/Medium risk. Nếu chỉ có 1 vấn đề đáng làm thì chọn 1. Nếu không có: `NO BATCH REQUIRED`.

#### BƯỚC 18 — XÁC ĐỊNH ITEM KHÔNG PHÙ HỢP MONTHLY BATCH
Không đưa vào Batch nhỏ nếu cần: Database redesign, Major API redesign, RBAC redesign, Architecture change, Major workflow change, Major KPI change, New strategic module. Chuyển sang: `QUARTERLY STRATEGIC CANDIDATE`.

#### BƯỚC 19 — APPROVED ITEM DEFINITION
Mỗi item phải có: ID, Problem, Evidence, Root Cause, Current Behavior, Expected Behavior, Proposed Change, Acceptance Criteria, Data Impact, API Impact, RBAC Impact, UI Impact, Regression Scope, Rollback Plan, Success Metric.

#### BƯỚC 20 — ĐO BASELINE TRƯỚC KHI SỬA
Ghi nhận cụ thể các chỉ số đo lường trước khi code. Không có baseline thì ghi `MEASUREMENT REQUIRED`.

#### BƯỚC 21 — FREEZE SCOPE
Sau khi phê duyệt: `MONTHLY BATCH SCOPE = FROZEN`. Không tự thêm issue mới (ngoại lệ: P0, Critical P1, Critical Security, Critical Data Integrity).

---

### GIAI ĐOẠN 3: TRIỂN KHAI, KIỂM THỬ & RELEASE (BƯỚC 22 – BƯỚC 35)

#### BƯỚC 22 — IMPLEMENT TỪNG ITEM
Không sửa tất cả một lúc. Thực hiện theo thứ tự: `IMP-001` $\rightarrow$ Code $\rightarrow$ Test $\rightarrow$ Verify; sau đó mới sang `IMP-002`.

#### BƯỚC 23 — MINIMAL SAFE CHANGE
Ưu tiên: Existing Architecture, Existing API, Existing Data Model, Existing Design System, Existing Shared Components, Existing RBAC. Không rewrite.

#### BƯỚC 24 — FILE DIFF AUDIT
Sau mỗi item: phân loại file: `EXPECTED`, `REVIEW REQUIRED`, `OUT OF SCOPE`. Nếu OUT OF SCOPE thì revert nếu an toàn.

#### BƯỚC 25 — BUILD & CODE QA
Chạy typecheck, lint, build, unit tests theo project hiện tại. Không release nếu build fail.

#### BƯỚC 26 — API REGRESSION
Nếu có API impact: test Success, Validation, Authentication, Authorization, Not Found, Conflict, Timeout, Server Error.

#### BƯỚC 27 — RBAC REGRESSION
Test: Allowed Role, Disallowed Role, Direct URL, Direct API, Cross-campus, Cross-student.

#### BƯỚC 28 — DATA REGRESSION
Đối soát: Before, After, Expected Difference, Actual Difference. Không release nếu có thay đổi dữ liệu ngoài dự kiến.

#### BƯỚC 29 — CROSS-MODULE REGRESSION
Kiểm thử chuỗi liên phân hệ: Assessment $\rightarrow$ Student 360 $\rightarrow$ GAP $\rightarrow$ Dashboard $\rightarrow$ Report.

#### BƯỚC 30 — UI/UX REGRESSION
Nếu sửa UI: kiểm tra 6 độ phân giải (1440×900, 1366×768, 1280×800, 1024×768, 768, 390) và Keyboard, Focus, Error State, Loading, Empty State.

#### BƯỚC 31 — STAGING DEPLOYMENT
Luồng: Build $\rightarrow$ Staging $\rightarrow$ Smoke Test $\rightarrow$ Business QA $\rightarrow$ Regression. Không deploy thẳng Production.

#### BƯỚC 32 — ACCEPTANCE CHECK
Mỗi item: `PASS`, `FAIL`, `BLOCKED` theo Acceptance Criteria đã khóa từ đầu.

#### BƯỚC 33 — RELEASE GATE
Chỉ release nếu: P0 = 0, New P1 = 0, Build = PASS, Data Regression = PASS, RBAC = PASS, Critical Workflow = PASS, Rollback = READY.

#### BƯỚC 34 — PRODUCTION RELEASE
Tuân thủ Release Runbook. Ghi: Version, Commit, Release Date, Approved Items, Rollback Point.

#### BƯỚC 35 — POST-DEPLOY SMOKE TEST
Test: Login, Dashboard, Changed Workflow, Save/Read, Critical API, Role Permission.

---

### GIAI ĐOẠN 4: ĐO LƯỜNG, ĐÓNG BATCH & THEO DÕI (BƯỚC 36 – BƯỚC 46)

#### BƯỚC 36 — POST-RELEASE OBSERVATION
Không tiếp tục code. Theo dõi: Errors, Performance, Workflow Completion, Data Quality, User Feedback, Support Tickets.

#### BƯỚC 37 — MEASURE AFTER RELEASE
Với từng item: so sánh Before, Expected, After.

#### BƯỚC 38 — RESULT CLASSIFICATION
Chỉ dùng: `SUCCESS`, `PARTIAL`, `NO IMPROVEMENT`, `REGRESSION`.

#### BƯỚC 39 — SUCCESS
Chỉ SUCCESS khi: Acceptance Criteria đạt + Metric cải thiện + Không có regression quan trọng.

#### BƯỚC 40 — PARTIAL
Nếu chức năng đúng nhưng metric chưa đạt: `PARTIAL`. Không chỉnh target để tạo PASS.

#### BƯỚC 41 — NO IMPROVEMENT
Nếu không cải thiện: `NO IMPROVEMENT`. Quay lại Root Cause Analysis, không tiếp tục sửa theo cùng giả định.

#### BƯỚC 42 — REGRESSION
Nếu kết quả xấu đi: `REGRESSION` và đánh giá `ROLLBACK` hoặc `CONTROLLED FIX`.

#### BƯỚC 43 — CLOSE BATCH
Batch chỉ đóng khi: Implementation complete, QA complete, Production verified, Measurement recorded, Backlog updated.

#### BƯỚC 44 — QUAY VỀ STABLE MODE
Sau khi Batch CLOSED: `STABLE BY DEFAULT`. Không tự mở Batch tiếp theo.

#### BƯỚC 45 — TIẾP TỤC OBSERVATION
Thu thập dữ liệu cho tháng tiếp theo. Không sửa nếu chưa có bằng chứng mới.

#### BƯỚC 46 — THÁNG THỨ 2
Lặp: Observe $\rightarrow$ Month-End Review $\rightarrow$ Approve Batch $\rightarrow$ Implement $\rightarrow$ Measure $\rightarrow$ Close.

---

### GIAI ĐOẠN 5: QUẢN TRỊ QUÝ & NĂM (BƯỚC 47 – BƯỚC 56)

#### BƯỚC 47 — THÁNG THỨ 3
Sau Monthly Review tháng thứ 3: ngoài Batch nhỏ, thực hiện `QUARTERLY STRATEGIC REVIEW`.

#### BƯỚC 48 — QUARTERLY REVIEW
Đánh giá toàn diện: System Health, Security, RBAC, Data Quality, Adoption, Performance, Capacity, Technical Debt, Design System, Dashboard, Reporting, UX.

#### BƯỚC 49 — QUARTERLY DECISIONS
Mỗi vấn đề chỉ nhận một trạng thái: `MAINTAIN`, `OBSERVE`, `MONTHLY IMPROVEMENT`, `TECHNICAL HARDENING`, `TRAINING / PROCESS`, `RETIRE CANDIDATE`, `STRATEGIC CHANGE`.

#### BƯỚC 50 — STRATEGIC CHANGE GATE
Chỉ mở chương trình lớn khi có: Evidence + Repeated problem + Business impact + Technical limitation + Monthly Batch insufficient. Không gọi mặc định là Phase 18.

#### BƯỚC 51 — NẾU KHÔNG CẦN THAY ĐỔI LỚN
Kết luận: `NO MAJOR PROGRAM REQUIRED — SYSTEM STATE: STABLE`. Đây là kết quả tích cực.

#### BƯỚC 52 — YEAR-END REVIEW
Cuối năm học mới review sâu: Feature usage, Data quality, Operational workload, Student/Teacher workflows, Technical debt, Features to simplify, Features to retire, Next-year readiness.

#### BƯỚC 53 — CHU KỲ VẬN HÀNH CHUẨN
- **DAILY:** Monitor
- **WEEKLY:** Operational exceptions
- **MONTHLY:** Improvement Cycle
- **QUARTERLY:** Strategic Review
- **YEARLY:** System & Academic-Year Review

#### BƯỚC 54 — ANTIGRAVITY HARD RULE
Antigravity không được: Tự refactor ngoài scope, Tự redesign module, Tự thêm feature, Tự đổi DB, Tự đổi API, Tự đổi RBAC, Tự tạo shared component mới nếu không có approved change.

#### BƯỚC 55 — KHI PHÁT HIỆN CƠ HỘI TỐI ƯU
Chỉ: `Document → Classify → Add to Backlog → STOP`. Không sửa "nhân tiện".

#### BƯỚC 56 — NGUYÊN TẮC CUỐI
SSM chuyển từ: `Build → Refactor → Refactor tiếp` sang: `Operate → Measure → Identify → Prioritize → Change → Verify → Measure Again`.  
Mục tiêu không phải thay đổi càng nhiều càng tốt, mà là: **Hệ thống ngày càng ổn định, dữ liệu ngày càng chính xác, người dùng hoàn thành công việc dễ hơn và chi phí vận hành ngày càng thấp.**
