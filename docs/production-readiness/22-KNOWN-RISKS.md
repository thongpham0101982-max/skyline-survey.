# 22. KNOWN RISKS, EDGE CASES & MITIGATION CATALOG

---

## 1. DANH MỤC CÁC NGUY CƠ ĐÃ ĐƯỢC NHẬN DIỆN VÀ PHƯƠNG ÁN KIỂM SOÁT

| STT | Nguy cơ tiềm ẩn | Mức độ rủi ro | Kịch bản xảy ra | Phương án kiểm soát & Giảm thiểu đã thiết lập |
|:---:|:---|:---:|:---|:---|
| **1** | **Nghẽn mạng cục bộ tại một cơ sở trường** | Trung bình | Sự cố đứt cáp quang Internet tại cơ sở Hội An hoặc Hill | Ứng dụng client có offline buffer; cho phép GV tiếp tục thao tác điểm danh và tự động sync khi có mạng. |
| **2** | **Quá tải đồng thời khi công bố điểm khảo thí** | Cao | Hàng ngàn học sinh và PHHS cùng đăng nhập xem điểm lúc 08:00 AM | Kích hoạt cache phân tán trên CDN Edge cho kết quả tra cứu; áp dụng rate limiting thông minh. |
| **3** | **Thao tác trùng lặp do bấm nhiều lần (Double Click)** | Thấp | Giáo viên bấm nút "Lưu đánh giá" liên tục khi mạng chập chờn | Tất cả form và button đều tích hợp `isSubmitting` state disable tức thời và idempotent request keys. |
| **4** | **Xuất báo cáo PDF/Excel dung lượng cực lớn** | Trung bình | Xuất toàn bộ dữ liệu 4,500 học sinh của cả 5 cơ sở trong 1 file | Bắt buộc chọn bộ lọc theo cơ sở/khối; xử lý stream xuất file bất đồng bộ không gây nghẽn tiến trình chính. |
