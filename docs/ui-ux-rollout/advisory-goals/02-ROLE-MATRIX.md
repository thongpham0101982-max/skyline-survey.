# MA TRẬN PHÂN QUYỀN VAI TRÒ (ROLE MATRIX)
## Quy Định Quyền Hạn và Phạm Vi Tiếp Cận Trong Phân Hệ Cố Vấn Học Tập

---

### 1. BẢNG PHÂN QUYỀN HÀNH ĐỘNG CHI TIẾT

| Quyền hạn / Hành động | Học sinh | GVCN | Tổ Cố vấn / TVHN | TTCM / QLCM | Giám đốc Cơ sở | Ban KT&ĐBCL / Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Tạo mới / Nhập phiếu mục tiêu** |  Chính mình |  Không |  Không |  Không |  Không |  Không |
| **Xem phiếu mục tiêu cá nhân** |  Chính mình |  Lớp CN |  HS phụ trách |  Phạm vi tổ |  Toàn CS |  Toàn trường |
| **Gửi yêu cầu xin mở phiếu điều chỉnh** |  Chính mình |  Không |  Không |  Không |  Không |  Không |
| **Hủy yêu cầu xin mở phiếu đang chờ** |  Chính mình |  Không |  Không |  Không |  Không |  Không |
| **Duyệt / Từ chối yêu cầu mở phiếu** |  Không |  Lớp CN |  HS phụ trách |  Không |  Toàn CS |  Toàn trường |
| **Ghi nhận Sổ tay tư vấn (Meeting log)** |  Không |  Lớp CN |  HS phụ trách |  Xem báo cáo |  Xem báo cáo |  Xem báo cáo |
| **Đánh giá định kỳ Rubric (HK1, HK2)** |  Không |  Lớp CN |  Đồng đánh giá |  Xem báo cáo |  Xem báo cáo |  Toàn trường |
| **Xem bảng phân tích GAP lớp** |  Không |  Lớp CN |  HS phụ trách |  Xem tổng hợp |  Xem toàn CS |  Xem toàn trường |
| **Xuất báo cáo Sổ theo dõi cố vấn (Excel)**|  Không |  Lớp CN |  HS phụ trách |  Tổ CM |  Toàn CS |  Toàn trường |
| **Cấu hình ngân hàng mục tiêu mẫu (Presets)**|  Không |  Đề xuất |  Đề xuất |  Kiểm duyệt |  Phê duyệt CS |  Quản trị toàn trường |

---

### 2. NGUYÊN TẮC BẢO MẬT & CHỐNG IDOR (INSECURE DIRECT OBJECT REFERENCE)

1. **Phân quyền Server-side (Backend Enforcement):**
   * Học sinh chỉ được phép truy vấn dữ liệu của chính mình qua token session học sinh (`/api/hocsinh/me`). Mọi truy vấn kèm `studentId` của học sinh khác đều bị từ chối với mã lỗi `403 Forbidden`.
2. **Phạm vi của Giáo viên Chủ nhiệm (GVCN Scope):**
   * GVCN chỉ có quyền truy cập dữ liệu của học sinh thuộc danh sách lớp được phân công chủ nhiệm trong năm học hiện hành (`class.homeroomTeacherId`).
3. **Phân vùng Cố vấn / TVHN:**
   * Cố vấn học tập tiếp cận danh sách học sinh theo bảng phân công tư vấn cụ thể (`advisoryAssignments`), không xem chéo học sinh ngoài phạm vi.
4. **Không dùng UI làm lớp bảo mật duy nhất:**
   * Toàn bộ các API `GET`, `POST`, `PATCH` liên quan đến goals, adjustment requests và evaluation đều phải xác thực quyền hạn trên server trước khi thao tác cơ sở dữ liệu.\n