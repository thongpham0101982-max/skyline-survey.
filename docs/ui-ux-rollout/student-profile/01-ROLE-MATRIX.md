# MA TRẬN PHÂN QUYỀN: HỒ SƠ HỌC SINH (ROLE MATRIX)
## Quy định Quyền hạn và Trách nhiệm Truy cập Dữ liệu trong Wave 1

---

### 1. DANH SÁCH CÁC VAI TRÒ NGƯỜI DÙNG

| Ký hiệu vai trò | Tên vai trò | Phạm vi quản lý |
| :--- | :--- | :--- |
| `ADMIN` / `ADMINISTRATOR` | Quản trị viên hệ thống | Toàn bộ các cơ sở, toàn bộ học sinh, cấu hình hệ thống |
| `KT_DBCL` | Ban Khảo thí & Đảm bảo Chất lượng | Toàn trường, giám sát dữ liệu học tập, khảo sát, reset KQHT |
| `GDCS` | Giám đốc Cơ sở | Toàn bộ các lớp và học sinh thuộc cơ sở phụ trách |
| `GIAO_VU_CS` / `GIAO_VU` | Giáo vụ Cơ sở / Giáo vụ Khối | Học sinh theo cơ sở hoặc khối lớp được phân công |
| `GVCN` | Giáo viên Chủ nhiệm | Chỉ xem và quản lý học sinh trong lớp được phân công chủ nhiệm |
| `GVBM` | Giáo viên Bộ môn | Xem kết quả môn học của học sinh các lớp giảng dạy |

---

### 2. MA TRẬN PHÂN QUYỀN HÀNH ĐỘNG (ACTION PERMISSION MATRIX)

| Hành động nghiệp vụ | ADMIN / KT_DBCL | GDCS | GIAO_VU | GVCN | GVBM |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Xem hồ sơ toàn trường (Đổi cơ sở/khối/lớp)** |  Có |  Chỉ cơ sở mình |  Chỉ phạm vi gán |  Chỉ lớp mình |  Không |
| **Xem Tab Chi tiết HSHS (`cv`)** |  Có |  Có |  Có |  Có |  Hạn chế |
| **Xem Tab Đánh giá Năng lực (`competencies`)** |  Có |  Có |  Có |  Có |  Có |
| **Xem Tab Bảng điểm MOET (`academic`)** |  Có |  Có |  Có |  Có |  Chỉ môn dạy |
| **Xem Tab Khảo sát đầu vào (`entrance`)** |  Có |  Có |  Có |  Có |  Không |
| **Xem Tab Thành tích (`achievements`)** |  Có |  Có |  Có |  Có |  Có |
| **Xem Tab Hướng nghiệp (`orientation`)** |  Có |  Có |  Có |  Có |  Không |
| **Xem Tab Trải nghiệm & Nhận xét (`projects`, `comments`)**|  Có |  Có |  Có |  Có |  Có |
| **Xem Tab Hỗ trợ học tập / Phụ đạo (`support`)** |  Có |  Có |  Có |  Có |  Không |
| **Tải lên / Cập nhật ảnh đại diện học sinh** |  Có |  Có |  Có |  Có |  Không |
| **Xóa ảnh đại diện học sinh** |  Có |  Không |  Không |  Không |  Không |
| **Tải về tệp PDF Hồ sơ cá nhân (html2pdf)** |  Có |  Có |  Có |  Có |  Có |
| **In học bạ / Hồ sơ chuẩn A4 (Cá nhân & Cả lớp)** |  Có |  Có |  Có |  Có |  Không |
| **Reset dữ liệu Kết quả học tập MOET** |  Chỉ KT_DBCL |  Không |  Không |  Không |  Không |

---

### 3. NGUYÊN TẮC BẢO MẬT DỮ LIỆU NHẠY CẢM (DATA PRIVACY RULES)

1. **Thông tin liên lạc phụ huynh & Hoàn cảnh gia đình:** Chỉ hiển thị đầy đủ cho Ban giám hiệu, Giáo vụ và Giáo viên chủ nhiệm trực tiếp của học sinh.
2. **Kế hoạch hỗ trợ tâm lý & Phụ đạo chuyên sâu:** Nằm trong diện bảo mật nội bộ, không hiển thị cho các vai trò ngoài hội đồng hỗ trợ.
3. **Phân quyền tại cấp API:** UI chỉ đóng vai trò che chắn giao diện; toàn bộ các thao tác chỉnh sửa/xóa/xem đều được xác thực nghiêm ngặt tại Backend Session và Permissions Adapter.\n