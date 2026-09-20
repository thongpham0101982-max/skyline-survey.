# 09. TECHNICAL DEBT MANAGEMENT & CAPACITY BUDGET

---

## 1. PHÂN BIỆT RÕ BẬC KỸ THUẬT (BUG VS TECHNICAL DEBT)
- **Bug:** Hệ thống trả về kết quả sai hoặc sập chức năng mong muốn của người dùng.
- **Technical Debt (Nợ kỹ thuật):** Hệ thống vẫn đang chạy đúng chức năng, nhưng kiến trúc bên dưới chưa tối ưu, tiềm ẩn rủi ro bảo trì, khó mở rộng hoặc làm giảm tốc độ phát triển trong tương lai.

---

## 2. NGÂN SÁCH NĂNG LỰC DÀNH CHO KỸ THUẬT (TECH DEBT CAPACITY BUDGET)
Trong mỗi chu kỳ phát triển 1 tháng:
- **60% Capacity:** Phục vụ các yêu cầu nghiệp vụ mới và cải tiến giao diện người dùng.
- **25% Capacity:** Dành riêng cho việc dọn dẹp Nợ kỹ thuật, tối ưu hóa truy vấn CSDL, nâng cao độ tin cậy và viết automated tests.
- **15% Capacity:** Xử lý các lỗi phát sinh thường nhật (Bugs) và hỗ trợ vận hành.

> [!IMPORTANT]
> Tuyệt đối không dành 100% tài nguyên chỉ để làm tính năng mới mà bỏ quên nợ kỹ thuật; điều này sẽ dẫn tới suy thoái hiệu năng toàn hệ thống sau 1 năm vận hành.
