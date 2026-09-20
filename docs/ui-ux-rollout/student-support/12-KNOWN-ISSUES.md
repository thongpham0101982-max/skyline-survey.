# DANH SÁCH VẤN ĐỀ TỒN ĐỌNG (KNOWN ISSUES & TECH DEBT)
## Báo Cáo Nợ Kỹ Thuật Wave 3

---

### 1. NỢ KỸ THUẬT (TECH DEBT)
* Tệp `src/app/teacher/ho-tro-hoc-tap/client.tsx` có dung lượng lớn (hơn 380 KB). Trong các giai đoạn tiếp theo cần tiếp tục tách các modal lớn (`PsychologicalDetailModal`, `PsychologicalCumulativeModal`) thành các sub-module độc lập.
* Cần tích hợp thêm thông báo đẩy (In-app Notification) tự động gửi đến GVCN khi chuyên viên tâm lý ghi nhận đánh giá tháng mới.\n