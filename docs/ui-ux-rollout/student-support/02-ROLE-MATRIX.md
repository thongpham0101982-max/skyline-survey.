# MA TRẬN PHÂN QUYỀN: HỖ TRỢ & TÂM LÝ (ROLE MATRIX)
## Quy Định Quyền Hạn và Ranh Giới Bảo Mật Theo Từng Vai Trò

---

### 1. BẢNG PHÂN QUYỀN HÀNH ĐỘNG CHI TIẾT

| Hành động nghiệp vụ | Giáo viên Bộ môn (GVBM) | Giáo viên Chủ nhiệm (GVCN) | Chuyên viên Tâm lý / TVHN | QLCM / TTCM | Giám đốc Cơ sở (GĐCS) | Ban KT&ĐBCL / Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Xem danh sách học sinh theo dõi** |  Chỉ HS môn mình |  Lớp chủ nhiệm |  HS được phân công |  Phạm vi quản lý |  Toàn cơ sở |  Toàn trường |
| **Xem thông tin tổng quan (Summary)** |  Có |  Có |  Có |  Có |  Có |  Có |
| **Xem ghi chú nghiệp vụ (Operational)** |  Phạm vi môn |  Có |  Có |  Có |  Có |  Có |
| **Xem ghi chú nhạy cảm (Sensitive Notes)**|  **KHÔNG** |  Hạn chế (nếu liên quan) |  **CÓ ĐẦY ĐỦ** |  Hạn chế |  Có (khi cần duyệt) |  Quản trị cấp cao |
| **Tạo đề xuất đối tượng mới** |  Có (Đề xuất) |  Có |  Có |  Có |  Có |  Có |
| **Ghi nhận phiếu theo dõi tuần** |  Môn phụ trách |  Có |  Có |  Không |  Không |  Không |
| **Lập đánh giá tháng** |  Không |  Có (học tập) |  Có (tâm lý) |  Không |  Không |  Không |
| **Đề xuất chấm dứt theo dõi** |  Không |  Có |  Có |  Có |  Có |  Có |
| **Phê duyệt chấm dứt theo dõi** |  Không |  Không |  Không |  Có |  Có |  Có |
| **Kế thừa / Chuyển tiếp năm học** |  Không |  Không |  Không |  Xem |  Phê duyệt CS |  Chạy tiến trình toàn trường |
| **Xuất báo cáo danh sách (Excel)** |  Không |  Lớp CN (Summary) |  HS phụ trách |  Phạm vi quản lý |  Toàn CS |  Toàn trường |

---

### 2. NGUYÊN TẮC BẢO VỆ DỮ LIỆU NHẠY CẢM

1. **Phân vùng thông tin nhạy cảm:**
   * Hồ sơ tâm lý học đường chứa các thông tin cá nhân đặc biệt (hoàn cảnh gia đình biến cố, khủng hoảng tâm lý, hành vi nhạy cảm). Những thông tin này **tuyệt đối không hiển thị trên bảng danh sách lớp** hoặc xuất ra các tệp Excel thông thường.
2. **Kiểm soát truy cập trực tiếp (Direct URL Protection):**
   * Giáo viên không thể mở hồ sơ học sinh lớp khác bằng cách thay đổi ID trên thanh địa chỉ URL. Server luôn xác thực quan hệ giữa `userId` và `classId` hoặc `assignmentId`.\n