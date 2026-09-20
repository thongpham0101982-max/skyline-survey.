# 04. DATA QUALITY AUDIT ACROSS MODULES

---

## 1. BẢNG KIỂM TOÁN CHẤT LƯỢNG DỮ LIỆU THEO PHÂN HỆ

| Phân hệ nghiệp vụ | Vấn đề dữ liệu phát hiện | Số lượng | Mức độ nghiêm trọng | Nguồn gốc phát sinh |
|:---|:---|:---:|:---:|:---|
| **Hồ sơ Học sinh** | Phụ huynh thay đổi số điện thoại liên lạc chưa cập nhật | 2 | Thấp (Low) | Phụ huynh gửi đơn cập nhật cho Giáo vụ |
| **Cố vấn & Mục tiêu** | Học sinh nhập điểm mục tiêu dạng số lẻ không chuẩn (ví dụ 8.25) | 4 | Thấp (Low) | Đã tự động làm tròn theo quy chế khảo thí |
| **Hỗ trợ & Tâm lý** | 0 lỗi dữ liệu, 0 rò rỉ thông tin nhạy cảm | 0 | Không | Tuân thủ 100% chuẩn bảo mật |
| **Hoạt động trải nghiệm**| Ảnh minh chứng kích thước lớn (> 8MB) gây tải chậm trên 4G | 12 | Trung bình (Medium)| Giáo viên chụp ảnh trực tiếp bằng điện thoại độ phân giải cao |
| **Khảo thí & ĐBCL** | Thao tác nhập điểm bằng chuột gây chậm khi nhập nhiều học sinh | 11 | Trung bình (Usability)| Thiếu phím tắt điều hướng nhanh (Enter/Mũi tên) |
| **Dashboard Tổng hợp**| Không có sai lệch giữa số liệu nguồn và thẻ Dashboard | 0 | Không | Khớp 100% Data Contract |

---

## 2. KIỂM TOÁN CHUYỂN ĐỔI DANH MỤC MÔN HỌC (SUBJECT MAPPING AUDIT)
- **Tình trạng:** 100% các môn học từ 5 cơ sở trường (`Toán`, `Văn`, `Anh`, `Khoa học tự nhiên`, `Lịch sử & Địa lý`, v.v.) đều đã được ánh xạ chính xác về Canonical Subject ID.
- **Unmapped Subjects:** **0 môn**.
- **Ambiguous Aliases:** **0 trường hợp**.
- **Text Joins:** Loại bỏ hoàn toàn, 100% truy vấn dựa trên Foreign Keys `subjectId`.

---

## 3. ĐỐI SOÁT TÍNH NHẤT QUÁN CÔNG THỨC GAP (GAP CONSISTENCY CHECK)
Chọn ngẫu nhiên 50 học sinh từ 5 cơ sở trường, đối soát công thức:
$$\text{Actual GAP} = \text{Diem_Thuc_Te} - \text{Diem_Muc_Tieu}$$
- Kết quả hiển thị tại **Cố vấn học tập** = **Hồ sơ Học sinh 360°** = **Bảng phân tích Khảo thí** = **Dashboard Ban Giám đốc**.
- Tỷ lệ trùng khớp: **100.0% (0% sai lệch)**.
