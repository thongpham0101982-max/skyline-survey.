# SỔ THEO DÕI CHẤT LƯỢNG DỮ LIỆU (DATA QUALITY REPORT)
## Rà Soát Dữ Liệu Hồ Sơ Theo Dõi Hiện Hữu

---

### 1. DANH MỤC TRƯỜNG HỢP CẦN LƯU Ý

| Nhóm vấn đề dữ liệu | Biểu hiện thực tế | Cách hệ thống xử lý | Hướng khắc phục lâu dài |
| :--- | :--- | :--- | :--- |
| **Thiếu ngày bắt đầu (`startDate: null`)** | Một số hồ sơ cũ nhập thiếu ngày bắt đầu | Tự động hiển thị fallback: *"Đầu năm học"* | Bắt buộc nhập ngày khi tạo mới |
| **Hồ sơ chưa phân công giáo viên** | Có target nhưng mảng `assignments` rỗng | Hiển thị: *"Chưa phân công phụ trách"* | Nhắc nhở ban giám hiệu phân công |
| **Nhập đánh giá thiếu phân loại** | `periodType` không rõ là Tuần hay Tháng | Mặc định xếp vào nhóm Theo dõi định kỳ | Ràng buộc enum tuần/tháng |
| **Học sinh chuyển trường chưa đóng hồ sơ**| Học sinh đã chuyển đi nhưng target vẫn ACTIVE | Tự động nhận diện cờ `isTransferredOut` để không chuyển tiếp | Đồng bộ tự động với phân hệ Chuyển trường |\n