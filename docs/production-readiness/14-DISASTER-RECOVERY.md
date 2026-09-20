# 14. DISASTER RECOVERY (DR) PLAN & CONTINUITY

---

## 1. CHỈ SỐ MỤC TIÊU PHỤC HỒI THẢM HỌA (DR OBJECTIVES)
- **RPO (Recovery Point Objective):** < 1 giờ (Mức dữ liệu tối đa chấp nhận bị mất: tối đa 15 phút nhờ WAL).
- **RTO (Recovery Time Objective):** < 30 phút (Hệ thống hoạt động trở lại bình thường).

---

## 2. CÁC TÌNH HUỐNG THẢM HỌA & PHƯƠNG ÁN XỬ LÝ (DISASTER SCENARIOS)

| Tình huống thảm họa | Mức độ | Kịch bản ứng phó | Thời gian xử lý ước tính |
|:---|:---:|:---|:---:|
| **Edge Provider Outage (Vercel)** | Cao | Chuyển DNS sang hệ thống dự phòng Node.js Server container trên cụm Cloud thứ hai | 10 - 15 phút |
| **Turso Primary Region Outage** | Nghiêm trọng | Kích hoạt failover tự động biến Read Replica khu vực lân cận thành Primary Cluster | 5 - 8 phút |
| **Dữ liệu bị xóa nhầm quy mô lớn** | Nghiêm trọng | Point-in-time recovery (PITR) quay ngược trạng thái CSDL về thời điểm t - 5 phút | 12 - 20 phút |
| **Tấn công mạng / Xâm nhập phá hoại** | Khẩn cấp | Cách ly mạng, ngắt kết nối write, kích hoạt Read-only mode và khôi phục từ snapshot sạch | 20 - 25 phút |
