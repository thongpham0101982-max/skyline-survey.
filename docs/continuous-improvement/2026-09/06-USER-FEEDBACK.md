# 06. USER FEEDBACK CONSOLIDATION & ROOT CAUSE ANALYSIS

---

## 1. TẬP HỢP VÀ KHỬ TRÙNG LẶP PHẢN HỒI (DEDUPLICATED FEEDBACK)
Tổng số phiếu phản ánh ghi nhận qua kênh Helpdesk: **18 phản hồi**.
Đã khử trùng lặp và xác định căn nguyên gốc rễ thành 3 nhóm vấn đề duy nhất:

### Vấn đề 1: Thao tác nhập điểm khảo thí cần dùng chuột liên tục
- **Số lượng phản hồi:** 11 ý kiến từ giáo viên bộ môn tại cơ sở Riverside, Central và Hội An.
- **Mô tả:** Giáo viên phải dùng chuột để click vào từng ô nhập điểm của học sinh tiếp theo, gây mỏi tay và mất thời gian khi nhập danh sách 35-40 học sinh.
- **Căn nguyên (Root Cause):** **UI/UX Usability Friction** — Thiếu event listener phím `Enter` và phím mũi tên xuống để tự động focus vào ô kế tiếp.
- **Đề xuất giải pháp:** Bổ sung điều hướng bàn phím chuẩn trong component nhập điểm.

### Vấn đề 2: Tải trang chi tiết Hoạt động ngoại khóa bị chậm trên thiết bị di động
- **Số lượng phản hồi:** 5 ý kiến từ giáo viên chủ nhiệm và phụ trách Đoàn - Đội tại cơ sở Hill.
- **Mô tả:** Khi mở hoạt động trải nghiệm có đính kèm nhiều ảnh chụp sự kiện ngoài trời, trang web tải lâu trên mạng 4G.
- **Căn nguyên (Root Cause):** **Performance / Asset Loading** — Ảnh chụp trực tiếp từ máy ảnh điện thoại (> 8MB/ảnh) chưa được nén và tải lười (lazy loading).
- **Đề xuất giải pháp:** Áp dụng `loading="lazy"` và kích thước thumbnail phù hợp.

### Vấn đề 3: Phụ huynh cập nhật thông tin liên lạc cá nhân
- **Số lượng phản hồi:** 2 ý kiến từ phụ huynh học sinh.
- **Căn nguyên (Root Cause):** **Data / Business Process** — Quy trình cập nhật thông tin hồ sơ học sinh thuộc thẩm quyền của Phòng Giáo vụ.
- **Đề xuất giải pháp:** Chuyển giao thông tin cho cán bộ Giáo vụ cơ sở thực hiện, không can thiệp mã nguồn.
