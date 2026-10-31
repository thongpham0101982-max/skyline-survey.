---
name: skyline-dashboard-design
description: Quy chuẩn thiết kế và kiến trúc Dashboard Điều hành Thông minh cho Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM / SQMS). Kết hợp nhận diện thương hiệu Sky-Line (#003B3A Deep Pine, #00A19A Brand Teal, bảng màu Cơ sở CS1-CS5) với bố cục thống kê hiện đại kiểu Flexidata (Data-First, High Data-Ink Ratio, Observe -> Understand -> Drill-down -> Act).
---

# Sky-Line Dashboard Design System (`skyline-dashboard-design`)

## 1. Triết lý & Mục tiêu Thiết kế
Xây dựng Dashboard điều hành thông minh, hiện đại, trực quan, tối ưu không gian hiển thị (đặc biệt trên màn hình Laptop 1366x768 và Desktop) và hỗ trợ Ban Giám hiệu / Quản trị viên ra quyết định dựa trên **100% dữ liệu thực (Single Source of Truth)**.

Chu trình nhận thức chuẩn trên Dashboard:
`Observe (Quan sát KPI & Cảnh báo)` → `Understand (Phân tích Xu hướng & Phân bố)` → `Drill-down (Mở chi tiết theo ngữ cảnh)` → `Act (Xử lý tác vụ trực tiếp)`

---

## 2. 10 Nguyên tắc Kiến trúc & Giao diện Bắt buộc

### 2.1. Bảo toàn Khung Ứng dụng, Thương hiệu & Phân quyền (RBAC)
- Giữ nguyên `Sidebar`, `Header` toàn cục, bộ chọn Năm học đồng bộ (`selectedAcademicYear`), và cơ chế kiểm tra phân quyền (`isSuperAdmin`, `/api/user-permissions`, giới hạn `allowedCampusIds`).
- Màu sắc thương hiệu:
  - **Deep Pine (`#003B3A`)**: Nền thanh điều hướng, nút hành động chính, điểm nhấn tiêu đề quản trị.
  - **Sky-Line Teal (`#00A19A` / `#48BFE3`)**: Điểm nhấn tương tác, trạng thái đồng bộ.
  - **Bảng màu 5 Cơ sở chuẩn hóa**:
    - `CS1` (Sky-Line Central): Xanh Sky-Line (`#00A19A`)
    - `CS2` (Sky-Line Riverside): Xanh - Tím Global (`linear-gradient(135deg, #00A19A 0%, #6D28D9 100%)` / `#4F46E5`)
    - `CS3` (Sky-Line Hill): Tím Global (`#7C3AED`)
    - `CS4` (Sky-Line International): Vàng đất (`#D49A3D`)
    - `CS5` (Sky-Line Global): Xanh biển (`#0284C7`)

### 2.2. Thu gọn Banner Chào mừng (Compact Executive Banner)
- Sử dụng chế độ thu gọn (`compact`) cho `UserWelcomeCard` trên trang Dashboard điều hành.
- Gom lời chào, huy hiệu vai trò, cơ sở, trạng thái đồng bộ Realtime và nút thao tác nhanh trên 1 thanh ngang gọn gàng (~64–76px), nhường tối đa diện tích màn hình đầu tiên (Above the Fold) cho bộ lọc, KPI và cảnh báo.

### 2.3. Thanh Bộ lọc Thống nhất Đa chiều (Unified Filter Bar)
- Tích hợp 5 chiều lọc trên một thanh điều khiển duy nhất:
  1. **Năm học (`academicYearId`)**
  2. **Cơ sở (`campusId`)**
  3. **Cấp học (`level`: Tất cả / Mầm non / Tiểu học / THCS / THPT)**
  4. **Khối lớp (`grade`: Tất cả / Khối 1–12 / Nhóm lớp Mầm non)**
  5. **Khoảng thời gian (`timeRange`: Toàn năm học / Học kỳ I / Học kỳ II / 3 tháng gần nhất / Tháng hiện tại)**
- Hiển thị số bộ lọc đang kích hoạt và nút **Đặt lại bộ lọc** tức thời.

### 2.4. Chuẩn hóa Thẻ KPI Tái sử dụng (`KPICard`)
- Mỗi thẻ KPI (`KPICard`) bắt buộc có:
  - Nhãn chỉ số rõ ràng, giá trị định dạng `tabular-nums`, và **đơn vị đo** (`HS`, `Lớp`, `%`, `Phiếu`, `Nhiệm vụ`).
  - **Chỉ số so sánh / biến động** (`trend`, `trendValue`, `comparisonText`) hoặc các chỉ số thành phần (`subMetrics`).
  - **Khả năng mở trang chi tiết (`href` / `onClick`)** để truy vết dữ liệu gốc.

### 2.5. Khu vực Phân tích Sĩ số Kết hợp (Flexidata Split-View)
- Tổ chức trên lưới 12 cột (`lg:grid-cols-12`):
  - **Khối Xu hướng (7 cột)**: Biểu đồ kết hợp (`ComposedChart` / `LineChart`) thể hiện diễn biến sĩ số Phổ thông, Mầm non, Tổng sĩ số và biến động tăng/giảm theo từng tháng.
  - **Khối Phân bố (5 cột)**: Chuyển đổi linh hoạt giữa **Phân bố theo Cơ sở (CS1–CS5)**, **Phân bố theo Cấp học**, và **Phân bố theo Khối lớp** kèm tỷ trọng `%`.

### 2.6. Toàn diện 5 Phân hệ Nghiệp vụ Cốt lõi
1. **Khảo thí & Tuyển sinh**: Kết quả khảo sát đầu vào (K-12 & Mầm non), kỳ thi học thuật/năng khiếu và thành tích giải thưởng.
2. **Chất lượng Học tập & Hỗ trợ**: Phổ điểm định kỳ/KSĐN, điểm trung bình & tỷ lệ đạt theo môn học, đánh giá năng lực và hồ sơ theo dõi hỗ trợ học tập/tâm lý.
3. **Cố vấn Học tập (CVHT)**: Tiến độ học sinh thiết lập mục tiêu cá nhân theo các lĩnh vực, độ phủ tư vấn 1-1 và phê duyệt của GVCN/PHHS.
4. **Dự giờ & Phát triển Chuyên môn**: Tiến độ tiết dự giờ theo cấp học, phân bố xếp loại tiết dạy (Giỏi/Tốt, Khá, Đạt) và điểm đánh giá trung bình.
5. **Điều hành Công việc**: Tiến độ nhiệm vụ theo trạng thái (Hoàn thành, Đang thực hiện, Quá hạn, Chờ xác nhận) và phân bổ theo nhóm chuyên môn.

### 2.7. Trung tâm Cảnh báo Thông minh (`SmartAlertCenter`)
- Tự động phát hiện từ dữ liệu thực:
  - **Dữ liệu bất thường / Chờ duyệt**: Hồ sơ khảo sát đầu vào chưa duyệt kết quả, môn học có tỷ lệ đạt thấp hơn chuẩn.
  - **Công việc quá hạn**: Nhiệm vụ điều hành (`WorkTask`) quá hạn hoàn thành, tiết dự giờ quá hạn (`EXPIRED`).
  - **Tiến độ chưa đạt / Cần can thiệp**: Học sinh trong diện hỗ trợ tâm lý/học tập hoặc cam kết đầu vào, độ phủ mục tiêu CVHT cần đôn đốc.

### 2.8. Quy chuẩn Biểu đồ (`DashboardChartCard`)
- Mọi biểu đồ bắt buộc bọc trong `DashboardChartCard` có:
  - **Tiêu đề chính & mô tả phụ** rõ ràng.
  - **Đơn vị đo (`unit`)** hiển thị tường minh.
  - **Thời điểm cập nhật (`lastUpdated`)**.
  - **Chú giải (`legend`)** trực quan dưới chân hoặc đầu biểu đồ.
  - Trạng thái `loading`, `empty`, `error` đầy đủ.
