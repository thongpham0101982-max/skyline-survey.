# 14. VẤN ĐỀ TỒN TẠI VÀ PHƯƠNG ÁN XỬ LÝ (KNOWN ISSUES)
## DANH MỤC VẤN ĐỀ VÀ KẾ HOẠCH BÀN GIAO

---

| STT | Vấn đề ghi nhận | Mức độ | Hướng xử lý chuẩn hóa |
|:---:|---|:---:|---|
| 1 | Một số câu hỏi cũ trong thư viện chưa được gán mạch kiến thức chi tiết. | Thấp | Hiển thị nhãn mặc định "Chủ đề chung", đưa vào backlog rà soát ngân hàng câu hỏi. |
| 2 | Tệp Excel nạp điểm của giáo viên thỉnh thoảng có khoảng trắng thừa ở mã học sinh. | Thấp | Service `resultValidationService` tự động `trim()` và chuyển thành chữ in hoa chuẩn. |
| 3 | Môn học tích hợp ở cấp Tiểu học có cách đánh giá theo mức đạt (Đạt/Hoàn thành). | Trung bình | Tách biệt luồng hiển thị định tính theo quy định của Thông tư 27 Bộ GD&ĐT. |
