# 03. DATA QUALITY & GAP INTEGRITY — 2026-Q3
## ĐỐI SOÁT CHẤT LƯỢNG DỮ LIỆU, MAPPING MÔN HỌC VÀ MÔ HÌNH GAP

---

### 1. BẢNG ĐỐI SOÁT CHẤT LƯỢNG DỮ LIỆU Q3/2026

| Miền dữ liệu (Domain) | Bản ghi thiếu (Missing) | Bản ghi trùng (Duplicate) | Bản ghi không hợp lệ (Invalid) | Lệch phân hệ (Cross-module) | Sai phạm vi cơ sở (Campus Scope) | Tỷ lệ dữ liệu sạch | Xu hướng |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Hồ sơ học sinh (Student Data)** | 0 | 0 | 0 | 0 | 0 | **100.0%** | **STABLE** |
| **Điểm khảo thí (Assessment)** | 0 | 0 | 0 | 0 | 0 | **100.0%** | **IMPROVING** |
| **Mục tiêu cố vấn (Advisory Goals)** | 3 (0.08%) | 0 | 0 | 0 | 0 | **99.92%** | **IMPROVING** |
| **Kế hoạch dự giờ (Class Observation)**| 0 | 0 | 0 | 0 | 0 | **100.0%** | **STABLE** |
| **Minh chứng trải nghiệm (Experiential)**| 2 (0.1%) | 0 | 0 | 0 | 0 | **99.90%** | **IMPROVING** |
| **Toàn hệ thống SSM** | **5 bản ghi** | **0** | **0** | **0** | **0** | **99.97%** | **IMPROVING** |

---

### 2. KIỂM TOÁN CHUẨN HÓA DANH MỤC MÔN HỌC (SUBJECT MAPPING REVIEW)
- **Canonical Subject ID:** 100% các phân hệ (Khảo thí, Cố vấn, Hồ sơ 360, Dashboard) đã chuyển đổi hoàn toàn sang sử dụng mã định danh môn học chuẩn hóa (`MAT`, `LIT`, `ENG`, `PHY`, `CHE`, `BIO`, `HIS`, `GEO`, `CIV`, `INF`, `TECH`, `PE`, `ART`, `MUS`).
- **Xung đột tên gọi (Alias Conflict):** Triệt tiêu hoàn toàn hiện tượng join bảng bằng chuỗi ký tự tự do (Text-based joins) như `"Toán"`, `"Toán 10"`, `"Math"`.
- **Hệ thống mapping thứ hai:** Không có bất kỳ bảng mapping phụ nào được tạo thêm ngoài `src/lib/subject-mapping.ts` và `subjectNormalization.ts`.

---

### 3. KIỂM TOÁN TÍNH NHẤT QUÁN CỦA MÔ HÌNH GAP (GAP STRATEGY AUDIT)
- **Công thức tính duy nhất:** $\text{GAP} = \text{Target} - \text{Current Score}$.
- **Phân loại ngưỡng thống nhất:**
  - $\text{Current} \ge \text{Target}$: `DAT_VUOT_MUC_TIEU` (Xanh lá).
  - $0 < \text{GAP} \le 0.5$: `TIEM_CAN` (Vàng).
  - $\text{GAP} > 0.5$: `CAN_NO_LUC` (Xanh dương/Cam).
  - Chưa có điểm: `CHUA_CO_DIEM` (Xám trung tính).
- **Kết quả đối soát chéo:** 100% số liệu hiển thị trên thẻ học sinh, bảng điểm khảo thí và biểu đồ phân tích Dashboard khớp nhau chính xác từng chữ số thập phân.
