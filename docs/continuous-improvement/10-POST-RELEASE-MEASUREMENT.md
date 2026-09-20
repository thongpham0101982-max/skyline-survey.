# 10. POST-RELEASE MEASUREMENT & BEFORE-AFTER AUDIT

---

## 1. NGUYÊN TẮC "MEASURE AGAIN"
Một bản phát hành **CHƯA ĐƯỢC COI LÀ THÀNH CÔNG** chỉ vì nó đã được deploy lên Production không gặp lỗi kỹ thuật.

Nó chỉ thành công khi sau 7 - 14 ngày có số liệu thực nghiệm chứng minh:
- **Trước cải tiến (Before):** Vấn đề đo lường cụ thể là gì? (Ví dụ: Thời gian nhập điểm mất 4.5 phút, tỷ lệ lỗi 12%).
- **Sau cải tiến (After):** Chỉ số đo được là bao nhiêu? (Ví dụ: Thời gian giảm xuống 1.8 phút, tỷ lệ lỗi < 1%).
- **Kết luận nghiệm thu:**
  - `SUCCESS`: Đạt hoặc vượt mục tiêu.
  - `PARTIAL`: Cải thiện một phần, cần tinh chỉnh tiếp.
  - `NO IMPROVEMENT`: Không có chuyển biến, cần xem lại nguyên nhân gốc.
  - `REGRESSION`: Phát sinh tác dụng phụ tiêu cực $ightarrow$ Lập tức rollback hoặc khắc phục.
