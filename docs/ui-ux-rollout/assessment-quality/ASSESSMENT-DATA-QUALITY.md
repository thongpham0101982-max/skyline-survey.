# BÁO CÁO CHẤT LƯỢNG DỮ LIỆU ĐIỂM KHẢO THÍ (ASSESSMENT DATA QUALITY)
## KIỂM TOÁN TÍNH TOÀN VẸN VÀ BẢO ĐẢM KHÔNG SAI LỆCH NGUỒN

---

| Issue | Assessment | Subject | Student / Scope | Severity | Action |
|---|---|---|---|:---:|---|
| Điểm số chứa dấu phẩy (vd: `7,5`) | GK1 | Toán | Toàn khối 10 | Low | Tự động chuẩn hóa thành số thực `7.5`. |
| Học sinh vắng kiểm tra giữa kỳ | GK1 | Tiếng Anh | 03 học sinh 11A2 | Medium | Ghi nhận trạng thái VẮNG, không tính là điểm 0. |
| Trùng lặp điểm nhập 2 lần | CK1 | Ngữ văn | 01 học sinh 12A1 | High | Áp dụng chính sách Overwrite minh bạch (Keep/Replace). |
| Thiếu mã định danh học sinh | KSCL | Lịch sử | File nạp thô | Critical | Báo lỗi chặn `UNMATCHED_STUDENT`, yêu cầu bổ sung mã HS. |
