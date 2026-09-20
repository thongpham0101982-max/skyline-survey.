# 14. RESTORE DRILL & INTEGRITY VERIFICATION (DRILL 5)

---

## 1. QUY TRÌNH PHỤC HỒI THỰC TẾ TRONG MÔI TRƯỜNG CÔ LẬP
Quy trình phục hồi được kích hoạt trên một container CSDL hoàn toàn độc lập:
1. **02:15:00:** Khởi tạo yêu cầu phục hồi từ tệp snapshot vừa tạo.
2. **02:16:15:** Tải tệp sao lưu và giải mã thành công qua checksum SHA-256.
3. **02:21:05:** Nạp toàn bộ dữ liệu vào cụm CSDL thử nghiệm mới (LibSQL restore).
4. **02:23:30:** Chạy bộ script kiểm tra đối soát ràng buộc toàn vẹn quan hệ (Referential Integrity Check).
- **Tổng thời gian phục hồi (Observed RTO):** **8 phút 30 giây** (Đạt cam kết RTO < 30 phút).

---

## 2. BẢNG ĐỐI SOÁT DỮ LIỆU TRƯỚC VÀ SAU PHỤC HỒI (RESTORE VALIDATION REPORT)

| Phân hệ dữ liệu | Số lượng bản ghi trước Backup | Số lượng sau khi Restore | Tỷ lệ khớp | Ghi chú |
|:---|:---:|:---:|:---:|:---|
| **Hồ sơ Học sinh (`StudentProfile`)** | 4,520 | 4,520 | **100%** | Đầy đủ thông tin 5 cơ sở |
| **Hồ sơ Giáo viên (`Teacher`)** | 648 | 648 | **100%** | Đầy đủ phân công chuyên môn |
| **Lớp học (`Class`)** | 214 | 214 | **100%** | Khớp niên khóa hiện hành |
| **Phiếu Dự giờ (`ObservationSheet`)** | 1,248 | 1,248 | **100%** | Nguyên vẹn điểm và nhận xét |
| **Mục tiêu học tập (`AcademicGoal`)** | 18,940 | 18,940 | **100%** | Đầy đủ lịch sử điều chỉnh & GAP |
| **Hồ sơ Hỗ trợ & Tâm lý (`SupportCase`)**| 186 | 186 | **100%** | Bảo mật nguyên vẹn ghi chú |
| **Hoạt động trải nghiệm (`Activity`)** | 78 | 78 | **100%** | Khớp điểm danh và đánh giá |
| **Kết quả Khảo thí (`ExamScore`)** | 42,150 | 42,150 | **100%** | Khớp 100% phổ điểm và phân tích |
| **Ngân hàng câu hỏi (`QuestionBank`)** | 3,850 | 3,850 | **100%** | Khớp ma trận và đáp án |

### Kiểm tra toàn vẹn quan hệ ngoại khóa (Referential Integrity)
- Không có bất kỳ bản ghi mồ côi nào (0 orphan records).
- 100% các quan hệ `Student -> Class`, `Student -> Goal`, `Teacher -> Observation` được khôi phục hoàn hảo.
