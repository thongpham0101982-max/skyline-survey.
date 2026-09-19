# SSM PILOT: RBAC & PERMISSION QA REPORT
**Phân hệ:** Dự giờ và Phát triển Chuyên môn  
**Nguyên tắc:** Bảo toàn 100% phân quyền backend — Frontend chỉ hiển thị đúng thẩm quyền  

---

## 1. KẾT QUẢ KIỂM THỬ PHÂN QUYỀN 5 VAI TRÒ

| Vai trò Kiểm thử | Thẩm quyền Dự kiến | Thao tác Được phép | Thao tác Bị chặn / Ẩn trên UI | Kết quả QA |
|---|---|---|---|---|
| **Giáo viên Thường (GVBM)** | Chỉ quản lý việc cá nhân | Mở tiết, Xin dự, Đăng ký tiết khác (≤4 người), Chấm phiếu mình dự. | Ẩn nút `⚡ Đột xuất`, không thấy nút Duyệt đăng ký, không thấy tab TTCM. | **ĐẠT (PASS)** |
| **Tổ trưởng Chuyên môn (TTCM)** | Quản lý tổ bộ môn | Mở tiết, Dự giờ đột xuất, Duyệt đăng ký trong tổ, Xem ma trận 12 tháng. | Không sửa được dữ liệu của tổ bộ môn khác. | **ĐẠT (PASS)** |
| **Quản lý Chuyên môn (QLCM) / TBP** | Giám sát cấp cơ sở | Xem liên tổ, dự giờ đột xuất, xuất báo cáo tổng hợp. | Không can thiệp cấu hình hệ thống toàn trường. | **ĐẠT (PASS)** |
| **Giám đốc Cơ sở (GĐCS)** | Giám sát toàn cơ sở | Xem dashboard chỉ số, xem tiến độ từng tổ, dự giờ đột xuất. | Không có các nút nhập liệu thô của giáo viên. | **ĐẠT (PASS)** |
| **Quản trị viên (Admin)** | Toàn quyền hệ thống | Phê duyệt chấm lại (Re-eval), Quản lý tiết toàn trường, Xuất Excel. | Thao tác có lưu audit log đầy đủ. | **ĐẠT (PASS)** |
