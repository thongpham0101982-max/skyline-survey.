# 08. ISSUE PRIORITIZATION MATRIX (BATCH #01)

---

## 1. MA TRẬN PHÂN LOẠI VẤN ĐỀ THEO BẰNG CHỨNG (EVIDENCE-BASED)

| Mã vấn đề | Vấn đề nhận diện | Bằng chứng thực tế (Evidence) | Tác động (Impact) | Rủi ro (Risk) | Nỗ lực (Effort) | Phân loại khuyến nghị (Recommendation) |
|:---|:---|:---|:---:|:---:|:---:|:---:|
| **ISSUE-01** | Hỗ trợ phím điều hướng (Enter/Mũi tên) khi nhập điểm khảo thí | 11 phản hồi từ GV 3 cơ sở; thao tác chuột mất 4.5 phút/lớp | Cao (tiết kiệm 40% thời gian) | Rất thấp (cục bộ form) | Thấp (0.5 ngày) | **MUST FIX (CHỌN VÀO BATCH #01)** |
| **ISSUE-02** | Tối ưu hóa tải lười và thumbnail ảnh minh chứng hoạt động | 5 phản hồi từ GV cơ sở Hill; tải chậm trên mạng di động 4G | Trung bình (cải thiện mobile) | Rất thấp (chỉ tối ưu thẻ img) | Thấp (0.5 ngày) | **IMPROVE (CHỌN VÀO BATCH #01)** |
| **ISSUE-03** | Mở rộng bộ kiểm thử tự động E2E luồng khảo thí (TD-03) | Nợ kỹ thuật mức Medium; bảo vệ an toàn cho kỳ thi Giữa kỳ 1 | Trung bình (chất lượng nội bộ)| Thấp | Trung bình (2 ngày) | **IMPROVE (CHỌN VÀO BATCH #01)** |
| **ISSUE-04** | Cập nhật số điện thoại phụ huynh học sinh | 2 phản hồi phụ huynh | Cục bộ 2 tài khoản | Không | 15 phút (Giáo vụ) | **DATA CLEANUP (Chuyển Giáo vụ)** |
| **ISSUE-05** | Hướng dẫn in phiếu dự giờ A4 cho giáo viên mới | 5 phản hồi từ giáo viên mới | Đào tạo người dùng | Không | 1 giờ (Tài liệu) | **TRAINING (Bổ sung cẩm nang)** |
| **ISSUE-06** | Tách luồng sinh PDF báo cáo sang Background Worker (TD-04) | Nợ kỹ thuật TD-04 | Dài hạn khi xuất file lớn | Trung bình | Lớn (3 ngày) | **QUARTERLY REVIEW CANDIDATE** |

---

## 2. QUY TẮC GIỚI HẠN PHẠM VI (WIP LIMIT ENFORCEMENT)
- Batch #01 tuân thủ nghiêm ngặt quy tắc giới hạn: **Chỉ chọn đúng 2-3 hạng mục cải tiến nhỏ, tập trung, có bằng chứng rõ ràng, rủi ro thấp và đo lường được**.
- Tuyệt đối loại bỏ các đề xuất lớn đòi hỏi thay đổi database schema hoặc cấu trúc API.
