# BIÊN BẢN BÁO CÁO SỰ CỐ VẬN HÀNH (INCIDENT REPORT / POST-MORTEM)

**Mã sự cố:** `INC-YYYYMMDD-[STT]`  
**Mức độ nghiêm trọng (Severity):** `[P0 - Khẩn cấp | P1 - Nghiêm trọng | P2 - Trung bình | P3 - Nhỏ]`  
**Thời gian bắt đầu sự cố:** `YYYY-MM-DD HH:mm`  
**Thời gian phát hiện sự cố:** `YYYY-MM-DD HH:mm`  
**Thời gian dịch vụ phục hồi hoàn toàn:** `YYYY-MM-DD HH:mm`  
**Chỉ huy trưởng xử lý sự cố (Incident Commander):** `[Họ và tên - Chức vụ]`  

---

### 1. TÓM TẮT DIỄN BIẾN & ẢNH HƯỞNG NGHIỆP VỤ
- **Hiện tượng xảy ra:** `[Mô tả triệu chứng người dùng ghi nhận]`
- **Phạm vi người dùng bị ảnh hưởng:** `[Toàn bộ hệ thống / Cơ sở cụ thể / Nhóm giáo viên]`
- **Ảnh hưởng dữ liệu:** `[Không mất dữ liệu / Đã đối soát toàn vẹn thành công]`

---

### 2. DÒNG THỜI GIAN SỰ CỐ (INCIDENT TIMELINE)
- `T0 (HH:mm):` Sự cố phát sinh.
- `T1 (HH:mm):` Cảnh báo kích hoạt qua kênh giám sát (MTTD: ... phút).
- `T2 (HH:mm):` Đội ngũ tiếp nhận và xác định mức độ.
- `T3 (HH:mm):` Kích hoạt phương án cô lập / chuyển hướng tạm thời.
- `T4 (HH:mm):` Khắc phục kỹ thuật hoàn tất (MTTR: ... phút).
- `T5 (HH:mm):` Xác minh toàn vẹn dữ liệu hoàn thành.
- `T6 (HH:mm):` Đóng sự cố và ban hành thông báo hoàn tất.

---

### 3. PHÂN TÍCH CĂN NGUYÊN GỐC RỄ (ROOT CAUSE ANALYSIS - RCA)
- Phân tích theo phương pháp 5 Whys:
  1. *Vì sao sự cố xảy ra?* -> ...
  2. *Vì sao cơ chế phòng vệ chưa chặn được?* -> ...
  3. ...

---

### 4. DANH MỤC HÀNH ĐỘNG PHÒNG NGỪA TÁI DIỄN (PREVENTIVE ACTION ITEMS)
| Hành động phòng ngừa | Người phụ trách | Hạn hoàn thành | Trạng thái |
|:---|:---|:---:|:---:|
| Bổ sung kiểm tra tự động / alert ngưỡng mới | ... | YYYY-MM-DD | Đang thực hiện |
| Cập nhật tài liệu vận hành Runbook | ... | YYYY-MM-DD | Hoàn tất |
