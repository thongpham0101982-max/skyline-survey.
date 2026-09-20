# 03. CAPACITY BASELINE & RESOURCE SIZING

---

## 1. QUY MÔ HỆ THỐNG VẬN HÀNH (OPERATIONAL SIZING)

Hệ thống SSM phục vụ toàn bộ mạng lưới trường Sky-Line với các thông số quy mô danh định:

- **Số cơ sở:** 5 cơ sở trường liên cấp (Riverside, Central, International, Hội An, Sky-Line Hill).
- **Tổng số học sinh:** ~4,500 học sinh từ Mầm non đến THPT.
- **Tổng số cán bộ - giáo viên (CB-GV-NV):** ~650 người dùng nghiệp vụ.
- **Tổng số phụ huynh học sinh (PHHS):** ~7,000 tài khoản truy cập cổng thông tin.
- **Dữ liệu hoạt động năm học:** 300+ lớp học, 15,000+ lượt kiểm tra khảo thí/năm, 20,000+ mục tiêu học tập/kỳ, 1,200+ đợt dự giờ chuyên môn.

---

## 2. MỨC ĐỘ TIÊU THỤ TÀI NGUYÊN DANH ĐỊNH (BASELINE CAPACITY)

| Chỉ số tài nguyên | Trạng thái nhàn rỗi (Idle) | Tải thông thường (100 CCU) | Tải cao điểm (500 CCU) | Ngưỡng cảnh báo (Threshold) |
|:---|:---:|:---:|:---:|:---:|
| **Server CPU Utilization** | 3% - 5% | 15% - 22% | 45% - 58% | > 75% trong 3 phút |
| **Server Memory (RSS)** | 120 MB | 260 MB | 580 MB | > 1.2 GB |
| **Turso DB Connections** | 1 - 2 pooled | 8 - 15 pooled | 35 - 55 pooled | > 80% pool limit |
| **Bandwidth (Egress)** | 0.2 Mbps | 4.5 Mbps | 22.0 Mbps | > 50 Mbps |
| **IOPS CSDL** | < 10 IOPS | 80 - 150 IOPS | 400 - 650 IOPS | > 1,200 IOPS |
