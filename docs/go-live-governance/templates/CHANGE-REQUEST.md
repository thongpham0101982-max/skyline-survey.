# YÊU CẦU THAY ĐỔI HỆ THỐNG (CHANGE REQUEST TEMPLATE)

**Mã CR:** `CR-YYYYMMDD-[STT]`  
**Ngày đề xuất:** `YYYY-MM-DD`  
**Người đề xuất (Requester):** `[Họ và tên - Chức vụ - Cơ sở]`  
**Phân loại thay đổi (Change Type):** `[BUG | HOTFIX | UI/UX IMPROVEMENT | BUSINESS RULE | NEW FEATURE | DATA | API | RBAC | INFRA | SECURITY | TECH DEBT]`  

---

### 1. MÔ TẢ VẤN ĐỀ & NHU CẦU
- **Hành vi hiện tại (Current Behavior):** `[Mô tả chi tiết trạng thái hiện nay]`
- **Vấn đề gặp phải (Problem):** `[Khó khăn hoặc điểm nghẽn nghiệp vụ]`
- **Hành vi mong đợi (Expected Behavior):** `[Mô tả chính xác kết quả mong muốn đạt được]`
- **Đối tượng người dùng bị ảnh hưởng:** `[Học sinh / Giáo viên / GVCN / TTCM / GĐCS / Ban KT&ĐBCL]`
- **Phân hệ bị ảnh hưởng:** `[Dự giờ / Hồ sơ 360 / Cố vấn / Hỗ trợ / Trải nghiệm / Khảo thí / Dashboard]`

---

### 2. ĐÁNH GIÁ TÁC ĐỘNG (CHANGE IMPACT ASSESSMENT)
- **Tác động Cơ sở dữ liệu (DB Impact):** `[Có thêm bảng/cột mới không? Cần migration không?]`
- **Tác động API (API Contract Impact):** `[Có thay đổi input/output của route handler nào không?]`
- **Tác động Phân quyền (RBAC Impact):** `[Có thay đổi quyền hạn hoặc phạm vi cơ sở không?]`
- **Tác động Giao diện (UI/UX Impact):** `[Có tuân thủ SSM Design System primitives không?]`
- **Tác động Báo cáo & Dashboard:** `[Có ảnh hưởng tới công thức tính trong Metric Catalog không?]`
- **Mức độ rủi ro (Risk Level):** `[LOW | MEDIUM | HIGH | CRITICAL]`

---

### 3. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
- [ ] Tiêu chí 1: `...`
- [ ] Tiêu chí 2: `...`
- [ ] Toàn bộ unit tests và type-checking vượt qua thành công.

---

### 4. KẾ HOẠCH PHỤC HỒI (ROLLBACK PLAN)
- Mô tả phương án hoàn tác nếu việc triển khai gặp sự cố bất ngờ: `...`

---

### 5. CHỮ KÝ PHÊ DUYỆT (APPROVALS)
- **Đại diện Kỹ thuật (Technical Lead):** `[Ký và ghi rõ ngày]`
- **Đại diện Nghiệp vụ / ĐBCL (Business Owner):** `[Ký và ghi rõ ngày]`
