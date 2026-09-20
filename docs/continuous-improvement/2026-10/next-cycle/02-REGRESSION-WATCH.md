# 02. REGRESSION WATCH & DOWNSTREAM IMPACT — v1.0.2
## THEO DÕI HỒI QUY CÁC MODULE THAY ĐỔI VÀ DÒNG CHẢY HẠ NGUỒN

---

### 1. BẢNG KIỂM TRA HỒI QUY CÁC THAY ĐỔI TRONG BATCH #02

| Hạng mục đã sửa | Module trực tiếp | Luồng hạ nguồn (Downstream) | Tình trạng hồi quy | Đánh giá |
|---|---|---|:---:|:---:|
| **IMP-004** (Filter persistence) | Màn hình Cố vấn học tập | Chi tiết học sinh $\rightarrow$ Bảng điểm $\rightarrow$ Đánh giá Rubric | **0 hồi quy** | **PASS** |
| **IMP-005** (CSS cleanup) | Global layout styles | Header, Sidebar, Card containers, Tables | **0 hồi quy** | **PASS** |
| **IMP-006** (Matrix validation test) | Service ma trận đề thi | Sinh mã đề $\rightarrow$ Nhập điểm $\rightarrow$ Phân tích độ phân hóa | **0 hồi quy** | **PASS** |

---

### 2. THEO DÕI CÁC HIỆN TƯỢNG HỒI QUY MUỘN (DELAYED REGRESSION WATCH)
- **Tích lũy dữ liệu theo thời gian (Data accumulation):** Dữ liệu lưu `sessionStorage` không gây phình bộ nhớ trình duyệt (chỉ chiếm ~120 bytes cho chuỗi `classId`).
- **Ranh giới niên khóa / Học kỳ:** Không xung đột với bộ lọc năm học `selectedAcademicYear` trên thanh điều hướng chính.
- **Tổng hợp Dashboard:** Các chỉ số tổng hợp toàn trường không bị sai lệch số liệu mẫu số học sinh theo lớp.
