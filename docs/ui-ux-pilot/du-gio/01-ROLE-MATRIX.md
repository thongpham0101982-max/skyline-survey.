# SSM PILOT: ROLE MATRIX & ROLE-AWARE UI
**Phân hệ:** Dự giờ và Phát triển Chuyên môn  
**Nguyên tắc:** Giao diện thích ứng theo thẩm quyền — Không nhồi nhét dữ liệu quản trị cho giáo viên thường  

---

## 1. MA TRẬN PHÂN QUYỀN VÀ BỐ CỤC THEO VAI TRÒ

| Tiêu chí | Giáo viên Bộ môn (GVBM) | Tổ trưởng Chuyên môn (TTCM) | Quản lý Chuyên môn (QLCM) / TBP | Giám đốc Cơ sở (GĐCS) | Quản trị viên (Admin / KT&ĐBCL) |
|---|---|---|---|---|---|
| **Mục tiêu Trọng tâm** | Tác nghiệp cá nhân: Đăng ký tiết, xem lịch dự, nộp phiếu, xem góp ý. | Quản trị tổ: Duyệt lịch, dự giờ đột xuất, ma trận tiến độ 12 tháng. | Giám sát chất lượng: Theo dõi chuyên môn liên tổ, kiểm tra phiếu. | Điều hành vĩ mô: Tỷ lệ hoàn thành cơ sở, cảnh báo giáo viên chậm. | Kiểm soát hệ thống: Cấu hình, audit log, xuất báo cáo toàn trường. |
| **KPI Cards (Tầng 3)** | 3 thẻ: Đã dạy, Đã dự, Phiếu cần chấm. | 4 thẻ: GV trong tổ, Chờ duyệt lịch, Phiếu chờ duyệt, Tiến độ tổ. | 4 thẻ: Tỷ lệ cơ sở, Tiết chưa đạt, Số ca đột xuất, Tiến độ môn. | 4 thẻ: % Hoàn thành cơ sở, Số GV chưa đủ tiết, Ca SOS, Khen thưởng. | 6 thẻ: Toàn hệ thống, Theo cơ sở, Tổng tiết K12/MN/GVNN, Export. |
| **Bộ lọc (Tầng 2)** | Tháng, Trạng thái (Của tôi). | Giáo viên trong tổ, Tháng, Loại dự giờ, Trạng thái duyệt. | Cơ sở, Tổ bộ môn, Giáo viên, Môn học, Trạng thái. | Cơ sở, Tổ bộ môn, Tỷ lệ tiến độ. | Toàn bộ các bộ lọc liên hoàn đa cơ sở. |
| **Hành động Chính** | `+ Mở tiết dạy`, `Xin dự giờ`. | `+ Mở tiết`, `⚡ Dự giờ đột xuất`, `Duyệt đăng ký`. | `⚡ Dự giờ đột xuất`, `Xuất Excel`. | `Xuất Báo cáo Hội đồng`, `Chỉ đạo chuyên môn`. | `Xuất Excel`, `Duyệt chấm lại (Re-eval)`, `Audit`. |
| **Bảng hiển thị (Tầng 4)** | Tiết của tôi, Tiết mở trong trường có thể đăng ký. | Toàn bộ tiết của tổ viên, Bảng ma trận 12 tháng ghim cột Họ tên. | Ma trận liên tổ, Danh sách tiết cần lưu ý (Chưa đạt / Điểm chênh lệch). | Bảng tổng hợp tiến độ cơ sở, Drill-down danh sách giáo viên. | Bảng dữ liệu toàn trường có checkbox chọn nhiều (Bulk Action). |
| **Quyền xem Drawer (Tầng 5)** | Chỉ xem tiết của mình hoặc tiết mình tham gia dự. | Xem toàn bộ tiết trong tổ, duyệt hoặc từ chối phiếu đánh giá. | Xem mọi tiết trong cơ sở được phân công. | Xem mọi tiết trong cơ sở quản lý. | Xem toàn bộ thông tin chi tiết mọi tiết trong hệ thống. |
