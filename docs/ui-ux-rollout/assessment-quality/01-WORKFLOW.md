# 01. QUY TRÌNH NGHIỆP VỤ KHẢO THÍ & CHẤT LƯỢNG (WORKFLOW)
## CHU TRÌNH 12 BƯỚC KHÉP KÍN TRONG HỆ THỐNG SSM

```text
[Ban Giám Hiệu & Ban KT&ĐBCL]
  Bước 1: Lập kế hoạch kiểm tra (Kỳ, Khối, Môn, Hình thức, Ngày thi, Phụ trách)
    ↓
[Tổ Trưởng Chuyên Môn & GV Ra Đề]
  Bước 2: Xây dựng & Rà soát Thư viện câu hỏi (Gán metadata, Mức độ tư duy, Thẩm định)
    ↓
  Bước 3: Thiết lập Ma trận đề (Cấu trúc chủ đề, Số câu, Điểm, Kiểm tra quỹ câu khả dụng)
    ↓
  Bước 4: Sinh mã đề & Thẩm định bảo mật (Tạo ≥05 mã đề, Kiểm soát bảo mật in sao/LMS)
    ↓
[Bộ phận Khảo thí & Giám thị]
  Bước 5: Tổ chức kỳ thi & Thu bài (Thi giấy dồn túi phách hoặc Thi trực tuyến LMS)
    ↓
[Khảo thí & GV Chấm thi]
  Bước 6: Nhập điểm & Nạp dữ liệu kết quả (Import Excel / LMS / Chấm trực tiếp)
    ↓
  Bước 7: Đối soát tính toàn vẹn (Khớp Student ID, Môn chuẩn hóa, Range điểm 0-10)
    ↓
  Bước 8: Xử lý trùng lặp & Phê duyệt ghi đè (Chính sách Replace / Keep)
    ↓
[Ban KT&ĐBCL / Ban Chuyên Môn / GĐCS]
  Bước 9: Phân tích phổ điểm & Thống kê mô tả (Mean, Median, Std Dev, Dải điểm)
    ↓
  Bước 10: Đối chuẩn GAP mục tiêu & So sánh liên cơ sở (Không xếp hạng tùy tiện)
    ↓
  Bước 11: Phát hiện sớm nguy cơ & Kích hoạt can thiệp 3 tầng (Tầng 1 GVCN → Tầng 3 Hỗ trợ Wave 3)
    ↓
[Toàn hệ thống]
  Bước 12: Khóa sổ điểm, đồng bộ Hồ sơ học sinh 360° & Cung cấp dữ liệu cho Dashboard
```

---

### Nguyên tắc xử lý dữ liệu vắng thi và điểm thiếu:
1. **Phân biệt rạch ròi giữa Điểm 0 và Vắng thi / Chưa có dữ liệu**: Học sinh vắng thi hoặc chưa có điểm được hệ thống đánh dấu trạng thái `VẮNG`, tuyệt đối không tự quy đổi thành `0` điểm để tránh làm méo mó phổ điểm và độ lệch chuẩn của lớp/trường.
2. **Không chỉnh sửa điểm từ màn hình phân tích**: Màn hình phân tích chất lượng là chế độ Chỉ đọc (Read-only). Mọi nhu cầu sửa điểm phải thực hiện tại phân hệ Sổ điểm / Nhập điểm có thẩm quyền kèm lý do ghi vết nhật ký.
