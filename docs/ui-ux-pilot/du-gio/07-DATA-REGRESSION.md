# SSM PILOT: DATA REGRESSION & FORMULA INTEGRITY REPORT
**Phân hệ:** Dự giờ và Phát triển Chuyên môn  
**Nguyên tắc:** Không làm sai lệch dù chỉ 0.01 điểm số hoặc xếp loại  

---

## 1. ĐỐI SOÁT CÔNG THỨC CHẤM ĐIỂM VÀ XẾP LOẠI

| Bộ Tiêu chí | Công thức Tính điểm | Quy tắc Xếp loại | Trạng thái Đối soát |
|---|---|---|---|
| **K12 (Phổ thông - 11 Tiêu chí)** | Tổng điểm = Y1(1.5) + Y2(1.5) + Y3(2) + Y4(2) + Y5(1) + Y6(2) + Y7(3) + Y8(2) + Y9(2) + Y10(2) + Y11(1) = 20.0đ | - **Giỏi:** Điểm ≥ 17.0, Max ở Y1, Y3, Y6, Y7, không có tiêu chí < 50%<br>- **Khá:** Điểm ≥ 14.0, Max ở Y1, Y3, Y6, không có tiêu chí < 50%<br>- **Trung bình:** Điểm ≥ 12.0, Max ở Y1, Y3, không có điểm 0<br>- **Không xếp loại:** Các trường hợp còn lại. | **CHÍNH XÁC 100%** (Hàm `getK12RankingDetails` được giữ nguyên nguyên bản). |
| **Mầm non (5 Tiêu chí)** | Tổng điểm = T1(2) + T2(2) + T3(2) + T4(2) + T5(2) = 10.0đ | - **Tốt:** Điểm ≥ 9.0<br>- **Khá:** Điểm ≥ 8.0<br>- **Đạt:** Điểm ≥ 7.0<br>- **Không đạt:** Dưới 7.0đ. | **CHÍNH XÁC 100%** (Hàm `getMamNonRankingDetails` được giữ nguyên). |
| **Chỉ tiêu Dự giờ Cá nhân** | Đạt chỉ tiêu khi số tiết dạy >= kế hoạch VÀ số tiết dự >= kế hoạch | Phân nhóm: `EXCEEDED`, `MET`, `IN_PROGRESS`, `UNMET`, `NO_TARGET`. | **CHÍNH XÁC 100%** (Hàm `evaluateTeacherProgress` giữ nguyên). |
