# 16. SỔ ĐĂNG KÝ NỢ KỸ THUẬT (TECHNICAL DEBT REGISTER)
## DANH MỤC CẦN NÂNG CẤP VÀ HOÀN THIỆN TRONG TƯƠNG LAI

---

| Mã nợ | Lĩnh vực | Vấn đề ghi nhận | Mức độ rủi ro | Ưu tiên | Kế hoạch xử lý |
|---|---|---|:---:|:---:|---|
| TD-01 | API | Một số endpoint cũ của Admin có logic trùng lặp với Teacher API | Thấp | P2 | Hợp nhất thành Shared Service Layer trong bản phát hành sau |
| TD-02 | Database | Bảng `ActivityParticipant` lưu mã chuỗi tự do cho vai trò cũ | Thấp | P3 | Migration chuẩn hóa khi chuyển giao niên khóa mới |
| TD-03 | Component | Một số trang form admin cũ vẫn dùng thẻ table HTML thuần | Thấp | P2 | Thay thế dần bằng `DataTable` chuẩn hóa |
