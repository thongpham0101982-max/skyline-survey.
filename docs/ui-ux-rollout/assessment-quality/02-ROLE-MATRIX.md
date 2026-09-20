# 02. MA TRẬN PHÂN QUYỀN VAI TRÒ (ROLE MATRIX)
## ĐẶC QUYỀN VÀ PHẠM VI TRẢI NGHIỆM TRONG KHẢO THÍ & CHẤT LƯỢNG

| Phân hệ / Tác vụ | BGH / Ban KT&ĐBCL | TTCM (Tổ trưởng) | GV Bộ môn | QLCM / GĐCS | Học sinh / Phụ huynh |
|---|:---:|:---:|:---:|:---:|:---:|
| **Kế hoạch kiểm tra** | Toàn quyền tạo/duyệt | Xem & Đề xuất | Xem môn mình | Toàn quyền cơ sở | Xem lịch thi |
| **Thư viện câu hỏi** | Toàn quyền hệ thống | Duyệt câu hỏi tổ | Đóng góp & Soạn | Xem báo cáo kho | Không có quyền |
| **Ma trận đề thi** | Phê duyệt chuẩn | Thiết lập ma trận | Đóng góp ý kiến | Xem ma trận | Không có quyền |
| **Sinh mã đề & Tải đề** | Toàn quyền bảo mật | Tải đề được duyệt | Tải đề lớp mình | Giám sát in sao | Không có quyền |
| **Nạp kết quả thi** | Toàn quyền nạp/khóa | Nạp điểm tổ | Nhập điểm lớp | Giám sát tiến độ | Không có quyền |
| **Phê duyệt mở khóa sổ** | Thẩm quyền cấp cao | Đề xuất | Gửi yêu cầu | Phê duyệt cấp CS | Không có quyền |
| **Phân tích phổ điểm** | Toàn hệ thống | Môn thuộc tổ | Lớp phụ trách | Toàn bộ cơ sở | Xem điểm cá nhân |
| **So sánh liên cơ sở** | Toàn quyền | Xem đối chuẩn | Xem đối chuẩn | Xem đối chuẩn | Không có quyền |
| **Cảnh báo nguy cơ (At-Risk)**| Toàn trường | Toàn tổ môn | Lớp phụ trách | Toàn cơ sở | Nhận cảnh báo riêng |
| **Đề xuất can thiệp Wave 3** | Phê duyệt | Đề xuất Tầng 2 | Đề xuất Tầng 1/2 | Phê duyệt | Phối hợp thực hiện |

---

### Bảo mật đề thi và đáp án (Confidentiality UX):
- Tuyệt đối không hiển thị nội dung đề thi, đáp án và ma trận cho các vai trò không có thẩm quyền.
- Không gửi nội dung câu hỏi hoặc đáp án qua thông báo (notification).
- Cơ chế kiểm soát tải file đề thi/đáp án được thẩm định bảo mật ở tầng backend API.
