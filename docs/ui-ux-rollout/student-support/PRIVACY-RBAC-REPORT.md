# BÁO CÁO BẢO MẬT & PHÂN QUYỀN (PRIVACY & RBAC REPORT)
## Ma Trận Truy Cập Dữ Liệu Chi Tiết Theo Phân Quyền Thực Tế

---

### 1. MA TRẬN TRUY CẬP THEO VAI TRÒ

| Vai trò người dùng | Xem Danh sách | Xem Tóm tắt (Summary) | Xem Chi tiết Nhạy cảm (Sensitive Notes) | Quyền Chỉnh sửa | Quyền Xuất File (Export) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Học sinh** | ❌ Không | ❌ Không | ❌ Không | ❌ Không | ❌ Không |
| **Giáo viên Bộ môn (GVBM)** |  Chỉ HS môn dạy |  Có | ❌ **BỊ CHẶN** |  Chỉ môn dạy | ❌ Không |
| **Giáo viên Chủ nhiệm (GVCN)**|  Toàn bộ lớp CN |  Có | ⚠️ Hạn chế (chỉ phần phối hợp) |  Ghi nhận tuần/tháng |  Chỉ tóm tắt (Summary) |
| **Chuyên viên Tâm lý / TVHN** |  HS được phân công |  Có |  **TOÀN QUYỀN** |  Toàn quyền chuyên môn |  Báo cáo chuyên sâu |
| **Quản lý Chuyên môn (QLCM)** |  Khối phụ trách |  Có | ⚠️ Hạn chế |  Duyệt kết thúc |  Xem & Xuất thống kê |
| **Giám đốc Cơ sở (GĐCS)** |  Toàn cơ sở |  Có |  Có (khi cần thẩm định) |  Duyệt kết thúc cấp CS |  Xuất danh sách cơ sở |
| **Ban KT&ĐBCL / Administrator**|  Toàn trường |  Có |  Toàn quyền kiểm toán |  Cấu hình hệ thống |  Toàn quyền quản trị |

---

### 2. KẾT LUẬN BẢO MẬT
Không phát hiện lỗ hổng rò rỉ dữ liệu nhạy cảm ra ngoài phân quyền được phép.\n