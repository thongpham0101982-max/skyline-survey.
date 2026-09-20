# 04. DATA QUALITY AUDIT & CONTINUOUS VERIFICATION

---

## 1. NĂM TRỤ CỘT CHẤT LƯỢNG DỮ LIỆU ĐỊNH KỲ
Hàng tháng, hệ thống tự động quét và báo cáo tình trạng dữ liệu trên 5 trụ cột:
1. **Completeness (Tính đầy đủ):** Không có học sinh mồ côi lớp học, không có bài thi thiếu điểm số môn học cốt lõi.
2. **Validity (Tính hợp lệ):** Điểm số luôn nằm trong biên độ [0.0 - 10.0], ngày tháng tuân thủ đúng niên khóa hiện hành.
3. **Consistency (Tính nhất quán):** Số liệu đếm từ bảng giao dịch khớp 100% với số liệu tổng hợp trên Dashboard.
4. **Timeliness (Tính kịp thời):** Tỷ lệ bài thi và phiếu dự giờ được cập nhật trong vòng 72 giờ sau khi diễn ra.
5. **Uniqueness (Tính duy nhất):** 0 trường hợp trùng lặp mã định danh (`studentCode`, `teacherCode`, `examPaperCode`).

---

## 2. THEO DÕI XU HƯỚNG DỮ LIỆU (DATA QUALITY TREND)
Hệ thống so sánh số lỗi dữ liệu tháng này với tháng trước để xác định xu hướng:
- **IMPROVING (Cải thiện):** Số lượng bản ghi cần làm sạch giảm > 20%.
- **STABLE (Ổn định):** Số lượng bản ghi lỗi duy trì ở mức kiểm soát dưới 0.1%.
- **WORSENING (Suy giảm):** Cảnh báo ngay cho Data Owner phụ trách cơ sở trường tương ứng để can thiệp.
