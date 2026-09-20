# BẢN ĐỒ ĐỐI CHIẾU THÀNH PHẦN: HỒ SƠ HỌC SINH (COMPONENT MAP)
## Phân loại Thành phần Giao diện theo Mô hình Đối chiếu Chuẩn hóa Wave 1

---

### 1. BẢNG PHÂN LOẠI CHI TIẾT (KEEP / ADAPT / REPLACE / SPECIFIC / REMOVE)

| Phần tử giao diện hiện tại | Phân loại | Giải pháp Chuẩn hóa SSM | Lý do kỹ thuật & UX |
| :--- | :---: | :--- | :--- |
| **Biểu đồ Radar Năng lực** (`StudentCompetencyPortfolio`) | **KEEP** | Giữ nguyên component nghiệp vụ hiện tại | Component hiển thị trực quan hóa năng lực 6 trụ cột đặc thù của Sky-Line, hoạt động ổn định và chính xác |
| **Biểu đồ Radar Môn học** (`SubjectRadarChart`) | **KEEP** | Giữ nguyên component nghiệp vụ hiện tại | Biểu đồ trực quan hóa phổ điểm môn học chuyên biệt |
| **Toàn bộ nút bấm thao tác** (In, Tải PDF, Đổi học sinh, Reset MOET) | **REPLACE** | Thay thế bằng `<Button variant="..." size="..." isLoading={...}>` | Chuẩn hóa màu sắc Deep Pine `#003B3A`, hiệu ứng hover/active và tự động hiển thị spinner khi tải PDF |
| **Các dropdown chọn năm học, cơ sở, khối, lớp** | **REPLACE** | Thay thế bằng `<Select>` chuẩn hóa từ thư viện UI | Đồng bộ chiều cao, viền focus và mũi tên điều hướng |
| **Ô tìm kiếm tên / mã học sinh** | **REPLACE** | Thay thế bằng `<Input prefixIcon={<Search />} isError={...}>` | Đồng bộ tương tác và khả năng truy cập |
| **Thẻ hiển thị trạng thái** (Chính khóa, Giao lưu, Xếp loại, Trạng thái hồ sơ) | **REPLACE** | Thay thế bằng `<StatusBadge status="..." label="..." />` | Ánh xạ màu sắc về 5 họ semantic chuẩn: `status-info` (Giao lưu), `status-success` (Đạt/Chính khóa) |
| **Các màn hình danh sách trống / Chưa có học sinh** | **REPLACE** | Thay thế bằng `<EmptyState variant="..." title="..." />` | Cung cấp thông điệp rõ ràng kèm hướng dẫn thao tác (chọn lớp khác hoặc đặt lại bộ lọc) |
| **Trạng thái đang tải dữ liệu học sinh** | **REPLACE** | Thay thế bằng `<LoadingSpinner>` và `<TableSkeleton>` | Loại bỏ hiệu ứng chớp giật màn hình khi fetch dữ liệu |
| **Thanh danh sách học sinh bên trái** | **ADAPT** | Tinh chỉnh lại thẻ học sinh (Avatar, Mã HS, Họ tên, Giới tính) | Tối ưu độ nén thông tin, highlight rõ học sinh đang chọn bằng viền Deep Pine |
| **Thanh chuyển 9 Tabs nghiệp vụ** | **ADAPT** | Chuẩn hóa sang phong cách Segmented Tab Bar với màu chủ đạo Deep Pine | Hỗ trợ cuộn ngang mượt mà trên laptop, có chỉ báo trực quan cho tab đang mở |
| **Mẫu in ấn khổ A4** (`print_client.tsx`) | **ADAPT** | Giữ nguyên khung in A4 nhưng áp dụng font chữ và màu sắc nhất quán | Đảm bảo khi in ra giấy hoặc xuất file PDF vector đạt thẩm mỹ trang nhã của thương hiệu Sky-Line |
| **Mã màu HEX nội tuyến** (`#00A99D`, `#007A72`, `text-teal-800`...) | **REMOVE** | Xóa bỏ toàn bộ và thay bằng class CSS Design Tokens chuẩn | Triệt tiêu hoàn toàn tình trạng lệch chuẩn thiết kế (Design Drift) |

---

### 2. XÁC NHẬN KHÔNG PHÁT SINH COMPONENT MỚI DƯ THỪA

Quá trình chuẩn hóa phân hệ Hồ sơ học sinh không cần tạo thêm bất kỳ component chung mới nào; 100% nhu cầu giao diện đều được đáp ứng hoàn hảo thông qua thư viện **SSM Shared Components** kết hợp với 2 component trực quan hóa năng lực đặc thù đã có.\n