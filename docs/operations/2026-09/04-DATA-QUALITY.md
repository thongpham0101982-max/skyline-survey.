# 04. DATA QUALITY BASELINE — MONTH 1
## ĐỐI SOÁT TÍNH TOÀN VẸN DỮ LIỆU, DANH MỤC MÔN HỌC VÀ TÍNH NHẤT QUÁN GAP

---

### 1. KIỂM SOÁT TÍNH TOÀN VẸN HỒ SƠ HỌC SINH (STUDENT MASTER DATA)

| Tiêu chí kiểm soát | Tiêu chuẩn đo lường | Số lượng vi phạm | Tỷ lệ toàn vẹn | Đánh giá |
|---|:---:|:---:|:---:|:---:|
| **Thiếu mã định danh học sinh (Student ID)** | 0 bản ghi | 0 | **100.0%** | **PASS** |
| **Trùng lặp mã học sinh (Duplicate ID)** | 0 bản ghi | 0 | **100.0%** | **PASS** |
| **Gán sai cơ sở trường (Wrong Campus)** | 0 bản ghi | 0 | **100.0%** | **PASS** |
| **Gán sai lớp học (Wrong Class)** | 0 bản ghi | 0 | **100.0%** | **PASS** |
| **Gán sai niên khóa (Wrong Academic Year)** | 0 bản ghi | 0 | **100.0%** | **PASS** |

---

### 2. CHUẨN HÓA DANH MỤC MÔN HỌC (SUBJECT MAPPING INTEGRITY)
- **Tổng số môn học giảng dạy:** Toàn bộ môn K12 thuộc chương trình Bộ GD&ĐT và chương trình Quốc tế/Cambridge.
- **Tỷ lệ môn học được chuẩn hóa (Canonical Mapping):** **100.0%** (Sử dụng mã Canonical duy nhất: `MAT`, `LIT`, `ENG`, v.v.).
- **Môn học chưa map (Unmapped):** **0 môn**.
- **Môn học không rõ ràng (Ambiguous / Duplicate Alias):** **0 môn**.
- **Kết luận:** Triệt tiêu hoàn toàn lỗi lệch dữ liệu do sử dụng tên môn học dạng text tự do.

---

### 3. KIỂM TOÁN CHẤT LƯỢNG VÀ TÍNH NHẤT QUÁN CỦA MÔ HÌNH GAP (GAP SAMPLING AUDIT)
Lấy mẫu ngẫu nhiên **100 học sinh** tại 5 cơ sở trường để đối soát chéo giá trị GAP giữa các phân hệ:

| Trường thông tin kiểm tra | Nguồn Cố vấn học tập | Nguồn Khảo thí | Nguồn Hồ sơ HS 360° | Nguồn Dashboard | Đánh giá khớp chéo |
|---|:---:|:---:|:---:|:---:|:---:|
| **Điểm mục tiêu (Target Score)** | 8.5 | 8.5 | 8.5 | 8.5 | **KHỚP 100%** |
| **Điểm khảo sát (KSCL Current)** | 7.0 | 7.0 | 7.0 | 7.0 | **KHỚP 100%** |
| **Giá trị GAP tính toán** | -1.5 | -1.5 | -1.5 | -1.5 | **KHỚP 100%** |
| **Màu sắc & Nhãn trạng thái** | `status-info` (Cần nỗ lực) | `status-info` | `status-info` | `status-info` | **KHỚP 100%** |

- **Kết luận:** Mô hình GAP hoạt động chính xác tuyệt đối trên toàn bộ 4 điểm hiển thị. **DATA QUALITY BASELINE ESTABLISHED**.
