# WAVE 5 — KHẢO THÍ & PHÂN TÍCH CHẤT LƯỢNG (SSM)
## TỔNG QUAN, MỤC TIÊU VÀ NỀN TẢNG DỮ LIỆU ĐỒNG BỘ

---

### 1. Bối cảnh và Mục tiêu
Phân hệ **Khảo thí & Phân tích chất lượng** là trung tâm bảo đảm chất lượng học thuật của toàn bộ Hệ thống Giáo dục Sky-Line (SSM). Mục tiêu cốt lõi của Wave 5 là thiết lập:
> **Một chuỗi dữ liệu khảo thí thống nhất, truy vết được, không trùng nguồn và có thể dùng trực tiếp cho phân tích chất lượng.**

Chuỗi dữ liệu truy vết khép kín:
```text
Kế hoạch kiểm tra
        ↓
Phạm vi / Môn / Khối / Cơ sở
        ↓
Thư viện câu hỏi chuẩn hóa
        ↓
Ma trận đề & Kiểm soát tính khả dụng kho câu
        ↓
Tạo & Quản lý mã đề (≥05 mã đề hoán vị)
        ↓
Tổ chức kiểm tra (Online LMS / Giấy / Dự án)
        ↓
Thu nhận kết quả đa nguồn (Result Intake)
        ↓
Đối soát dữ liệu (Khớp Student ID & Canonical Subject)
        ↓
Phân tích chất lượng & Phổ điểm (Distribution & Descriptive Stats)
        ↓
GAP với mục tiêu HS (Tái sử dụng mô hình Wave 2)
        ↓
So sánh đối chuẩn Cơ sở (Campus Comparison không xếp hạng tùy tiện)
        ↓
Phát hiện sớm nguy cơ & Đề xuất can thiệp 3 tầng
        ↓
Đồng bộ Hồ sơ học sinh 360° & Hợp đồng dữ liệu Dashboard (Wave 6)
```

### 2. Các Trụ Cột Đạt Được trong Wave 5
- **ONE Exam Planning Model**: Kế hoạch kiểm tra tường minh theo Kỳ, Khối, Môn, Hình thức và Người phụ trách.
- **ONE Question Bank & Matrix Model**: Thư viện câu hỏi gắn metadata chuẩn hóa và ma trận đề kiểm soát tổng điểm 10.0 cùng độ sẵn sàng của ngân hàng câu hỏi.
- **ONE Result Intake & Source Strategy**: Nạp điểm có đối soát Student ID, Canonical Subject ID, phát hiện trùng lặp và chính sách ghi đè minh bạch.
- **ONE GAP Calculation Strategy**: Tái sử dụng 100% GAP Engine từ Wave 2 (`calculateSubjectGap`), triệt tiêu hoàn toàn mã lỗi `NaN`.
- **ONE Quality Analytics Layer**: Phổ điểm trực quan (5 dải điểm chuẩn), thống kê mô tả, ma trận chuyển dịch học lực, đối chuẩn cơ sở và cảnh báo nguy cơ suy giảm học lực (At-Risk Early Warning).
- **ONE Student 360 Integration Path**: Khảo thí là Single Source of Truth; Hồ sơ 360° chỉ đọc và hiển thị phân tích.
