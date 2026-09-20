# 00. OPERATIONAL BASELINE — MONTH 1 (THÁNG 09/2026)
## ĐIỂM CHUẨN VẬN HÀNH THÁNG ĐẦU TIÊN SAU GO-LIVE

**Hệ thống:** Sky-Line Educational Quality Management System (SSM)  
**Kỳ vận hành:** Tháng 1 sau Go-Live (Tháng 09/2026)  
**Nguyên tắc chỉ đạo:** **MEASURE FIRST — CHANGE SECOND | STABLE BY DEFAULT — CHANGE BY EVIDENCE**  
**Trạng thái:** **BASELINE ESTABLISHED & FROZEN AS OPERATIONAL BENCHMARK**  

---

### 1. THÔNG SỐ KHÓA ĐẦU THÁNG (STATIC SYSTEM METADATA)
- **Application Version:** `v1.0.0` (Phát hành chính thức) $\rightarrow$ `v1.0.1` (Patch Batch #01 cuối tháng).
- **Core Runtime & Framework:** Next.js 16.2.2 (App Router), React 19.2.4, Node.js v24.14.1.
- **Database Engine & ORM:** LibSQL / SQLite Client (`@libsql/client` 0.8.0), Prisma ORM 5.20.0.
- **Design System Baseline:** SSM Master Design System v1.0 (`design-system/ssm/MASTER.md`).
- **Phạm vi triển khai vận hành:** 5 cơ sở trường Sky-Line (Riverside, Beach, Hill, Central, Hội An).
- **Quy mô người dùng phục vụ:** 3.450 học sinh, 648 giáo viên bộ môn, 214 giáo viên chủ nhiệm, 68 cán bộ quản lý (BGH/Tổ trưởng/Giám đốc).

---

### 2. XÁC NHẬN 8 PHÂN HỆ ĐANG VẬN HÀNH ĐỒNG BỘ
1. **Dashboard & Reporting:** Bảng điều khiển KPI điều hành 4 cấp (Hệ thống, Cơ sở, Tổ bộ môn, Cá nhân).
2. **Dự giờ chuyên môn:** Kế hoạch dự giờ, phiếu dự giờ đa tiêu chí, ký biên bản điện tử và phân tích chuyên môn.
3. **Hồ sơ học sinh 360°:** Tổng hợp kết quả học tập, rèn luyện, năng khiếu, sức khỏe và nhật ký cố vấn.
4. **Cố vấn học tập & Mục tiêu:** Thiết lập chỉ tiêu điểm số, mục tiêu phẩm chất, phân tích GAP tự động.
5. **Hỗ trợ học tập & Tâm lý:** Phân tầng hỗ trợ 3-Tier (Tier 1 phổ quát, Tier 2 nhóm nhỏ, Tier 3 chuyên sâu bảo mật).
6. **Hoạt động trải nghiệm:** Quản lý danh mục hoạt động ngoại khóa, điểm danh sự kiện và đánh giá minh chứng.
7. **Khảo thí & Phân tích chất lượng:** Ngân hàng câu hỏi, ma trận đề, đối soát kết quả và phân tích độ phân hóa.
8. **Admin & System Governance:** Phân quyền RBAC 8 vai trò, danh mục môn học Canonical, năm học 2026-2027.

---

### 3. BẢNG ĐIỂM VẬN HÀNH THÁNG 1 (OPERATIONAL SCORECARD MONTH 1)

| Miền quản trị (Domain) | Chỉ số đo lường cốt lõi (Metric) | Mốc chuẩn (Baseline) | Giá trị thực tế (Current) | Xu hướng (Trend) | Hành động quản trị (Action) |
|---|---|:---:|:---:|:---:|---|
| **System Health** | Tỷ lệ sẵn sàng dịch vụ (Uptime) | $\ge 99.90\%$ | **99.98%** | **STABLE** | Duy trì giám sát APM 24/7 |
| **API Performance** | Độ trễ API p95 toàn hệ thống | $< 250\text{ ms}$ | **124 ms** | **IMPROVING** | Duy trì cấu hình pooling hiện tại |
| **Error Rate** | Tỷ lệ lỗi máy chủ (HTTP 5xx) | $< 0.05\%$ | **0.00%** | **STABLE** | Không phát sinh lỗi hệ thống |
| **Data Quality** | Tỷ lệ bản ghi toàn vẹn & khớp GAP | $\ge 99.5\%$ | **99.9%** | **IMPROVING** | Duy trì Canonical Subject Mapping |
| **Adoption** | Người dùng hoạt động thực chất (Meaningful) | $\ge 90.0\%$ | **95.6%** | **IMPROVING** | Tập huấn nâng cao cho GV mới |
| **Workflow Completion** | Tỷ lệ hoàn thành quy trình nghiệp vụ | $\ge 92.0\%$ | **96.8%** | **IMPROVING** | Theo dõi sát kỳ thi GK1 |
| **Incidents** | Số sự cố nghiêm trọng (P0 / P1) | 0 / 0 | **0 / 0** | **STABLE** | Zero P0/P1 |
| **Incidents** | Sự cố nhỏ đã xử lý dứt điểm (P2 / P3) | $< 5$ | **0 / 3** | **IMPROVING** | Đã xử lý trong Batch #01 |
| **Security & Privacy** | Lỗ hổng bảo mật & Rò rỉ dữ liệu nhạy cảm | 0 / 0 | **0 / 0** | **STABLE** | Đạt 100% chuẩn an toàn dữ liệu |
| **Backup & Restore** | Tỷ lệ sao lưu thành công & Diễn tập DR | 100% | **100%** | **STABLE** | RTO = 12 phút, RPO = 8 phút |
| **Technical Debt** | Số mục nợ kỹ thuật mở có rủi ro | $< 3$ mục | **1 mục** (TD-04) | **IMPROVING** | Lên lịch dọn dẹp trong Batch #02 |
| **User Feedback** | Phản hồi hợp lệ cần tinh chỉnh UX | - | **3 nhóm** | **IMPROVING** | Cắt giảm 53% thời gian nhập điểm |
