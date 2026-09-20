# DANH SÁCH VẤN ĐỀ TỒN ĐỌNG (KNOWN ISSUES & TECH DEBT)
## Báo Cáo Nợ Kỹ Thuật Sau Wave 2

---

### 1. NỢ GIAO DIỆN (UI DEBT)
* Tệp `src/app/teacher/co-van-hoc-tap/page.tsx` còn dài (hơn 4,000 dòng) do kết hợp nhiều tab (Tracking, Rubric, Consultations, SOS, Unlocks). Cần tiếp tục module hóa các tab thành các sub-component độc lập trong giai đoạn bảo trì.
* Cần bổ sung tính năng gợi ý môn học tự động (Auto-complete) khi học sinh nhập mục tiêu môn học trên điện thoại.

### 2. VẤN ĐỀ CHẤT LƯỢNG DỮ LIỆU (DATA QUALITY)
* Một số học sinh nhập mục tiêu tự do không có điểm số (VD: "Cố gắng đạt điểm cao môn Toán"). Các trường hợp này được xử lý an toàn bằng cách không gán điểm và không sinh lỗi `NaN`.\n