# BÁO CÁO AUDIT UI/UX TOÀN DIỆN HỆ THỐNG SSM
## TÀI LIỆU 06: TRẢI NGHIỆM THEO PHÂN QUYỀN (ROLE-BASED UX AUDIT)

> **Mục tiêu:** Tối ưu hóa giao diện cho từng nhóm người dùng đặc thù trong hệ thống giáo dục Sky-Line, đảm bảo đúng người - đúng việc - đúng thông tin - không quá tải nhận thức.

---

### 1. Ma trận Trải nghiệm & Phân quyền Hiện tại (Role-Page UX Matrix)

| Phân hệ / Nghiệp vụ cốt lõi | Giáo viên (GVBM) | GVCN | TTCM (Tổ trưởng) | QLCM / TBP | GĐCS (Giám đốc Cơ sở) | Ban KT&ĐBCL / Admin | Học sinh / Phụ huynh |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Dashboard Tổng quan** | Cần: Lịch dạy, việc cần làm, deadline | Cần: Sỹ số, cảnh báo chuyên cần, học sinh cần hỗ trợ | Cần: Tiến độ tổ, tiết chờ duyệt, chất lượng GV | Cần: So sánh các tổ, tiến độ toàn cơ sở | Cần: Executive KPI, chỉ số chất lượng, cảnh báo lớn | Cần: Tình trạng đồng bộ dữ liệu, người dùng, hệ thống | Xem: Kết quả cá nhân, mục tiêu năm học |
| **Đăng ký & Dự giờ** | Đăng ký tiết, tự xem kết quả cá nhân | Đăng ký tiết, dự giờ đồng nghiệp | Phê duyệt lịch, phân công dự giờ, đánh giá chuyên môn | Kiểm tra đột xuất, giám sát chất lượng các tổ | Xem báo cáo chất lượng tiết dạy cơ sở | Cấu hình biểu mẫu, tổng hợp toàn trường | *Không truy cập* |
| **Ma trận Dự giờ (Heatmap)** | *Không cần xem* | *Không cần xem* | **Tác nghiệp chính (Xem và điều phối tổ)** | Giám sát mật độ dự giờ các tổ | Xem tổng quan tỷ lệ đạt chuẩn cơ sở | Kiểm toán dữ liệu toàn hệ thống | *Không truy cập* |
| **Hồ sơ Học sinh (HSHS)** | Xem danh sách lớp dạy, nhập điểm môn | **Tác nghiệp chính (Hồ sơ toàn diện, hạnh kiểm, gia đình)** | Xem học sinh thuộc khối/tổ phụ trách | Xem phân tích phổ điểm các môn | Xem thống kê chất lượng học sinh cơ sở | Quản trị dữ liệu hồ sơ, duyệt lưu chuyển | Xem hồ sơ cá nhân / hồ sơ con |
| **Cố vấn & Hỗ trợ Học tập** | Đề xuất học sinh yếu môn mình dạy | **Tác nghiệp chính (Lập kế hoạch, theo dõi tiến độ)** | Giám sát kế hoạch phụ đạo của tổ | Đánh giá hiệu quả phụ đạo các khối | Xem tỷ lệ học sinh hoàn thành cam kết | Cấu hình phiếu mẫu mục tiêu toàn trường | Tự điền mục tiêu / Xem cam kết |
| **Sổ điểm & Nhận xét** | **Tác nghiệp chính (Nhập điểm, viết nhận xét)** | Tổng hợp điểm cả lớp, xếp loại học lực | Duyệt sổ điểm của tổ chuyên môn | Khóa sổ điểm, hậu kiểm chất lượng | Xem báo cáo học lực định kỳ | Quản trị import dữ liệu điểm MOET | Xem bảng điểm chi tiết |
| **Khảo sát Đầu vào** | Chấm bài khảo sát môn được phân công | *Không bắt buộc* | Kiểm tra kết quả chấm của tổ | Phê duyệt kết quả tuyển sinh cơ sở | Đưa ra quyết định tiếp nhận học sinh | Điều phối hội đồng khảo sát toàn hệ thống | Làm bài khảo sát online |

---

### 2. Các Bất cập Trải nghiệm theo Nhóm Quyền (Role-UX Deficiencies)

#### 2.1. Nhóm Giáo viên (GVBM & GVCN) — Bị Quá tải Thông tin Quản trị
* **Hiện trạng:** Khi giáo viên đăng nhập, giao diện ngập tràn các bảng thống kê phần trăm, biểu đồ tổng hợp và các thẻ điều hướng thừa thãi.
* **Nhu cầu thực tế:** Giáo viên mở hệ thống từ điện thoại hoặc laptop giải lao giữa 2 tiết học. Họ chỉ cần trả lời 3 câu hỏi trong 5 giây:
  1. *Hôm nay tôi dạy tiết nào, lớp nào, phòng nào?*
  2. *Hôm nay ai đến dự giờ tôi hoặc tôi phải đi dự giờ ai?*
  3. *Có phiếu đánh giá nào tôi chưa nộp hoặc học sinh nào lớp tôi đang gặp vấn đề gấp?*
* **Đề xuất cải tiến:** Tái thiết kế trang chủ Giáo viên thành **"Không gian Tác nghiệp Sư phạm (Teacher Daily Workbench)"**: Đưa Widget "Lịch trình hôm nay" và "Việc cần xử lý ngay (Pending Actions)" lên hàng đầu; giấu các biểu đồ thống kê thứ yếu vào tab phụ.

#### 2.2. Nhóm Tổ trưởng Chuyên môn (TTCM) — Thiếu Bảng Điều khiển Tập trung
* **Hiện trạng:** TTCM hiện phải di chuyển qua lại giữa 4 trang khác nhau: \/admin/du-gio\ (xem tiết), \/admin/tong-hop-du-gio\ (xem tổng hợp), \/admin/ma-tran-du-gio-ttcm\ (xem ma trận) và \/teacher/du-gio\ (dự giờ cá nhân).
* **Nhu cầu thực tế:** TTCM cần một **"Cockpit Tổ chuyên môn"** duy nhất:
  * Nửa trên: Ma trận dự giờ của giáo viên trong tổ trong tháng này (Ai đã đủ tiết, ai thiếu tiết, ai chuẩn bị dạy thao giảng).
  * Nửa dưới: Hàng đợi các tiết dạy đang chờ TTCM duyệt nhận xét hoặc xét duyệt đánh giá lại.

#### 2.3. Nhóm Giám đốc Cơ sở (GĐCS) — Bị Kéo vào Màn hình Nhập liệu
* **Hiện trạng:** GĐCS được cấp quyền truy cập vào cùng các màn hình bảng điểm và form nhập liệu chi tiết của chuyên viên, dẫn đến tình trạng các nhà quản lý cấp cao phải nhìn thấy các bảng dữ liệu hàng trăm dòng thay vì bức tranh chiến lược.
* **Nhu cầu thực tế:** GĐCS cần **"Executive Quality Dashboard"**:
  * Tỷ lệ hoàn thành kế hoạch dự giờ toàn cơ sở (Đạt / Chưa đạt).
  * Tỷ lệ học sinh đạt chuẩn đầu vào và học sinh cần hỗ trợ phụ đạo.
  * Chỉ số hài lòng NPS của phụ huynh cơ sở theo từng tháng.
  * Các cảnh báo đỏ (Critical Alerts): Tiết dạy bị xếp loại không đạt, điểm thi tụt dốc, khiếu nại chưa xử lý.
  * *Nguyên tắc:* Tuyệt đối không đặt form nhập liệu chi tiết trên màn hình của GĐCS.

---

### 3. Chuẩn hóa Trải nghiệm Phân quyền (Permission UX Rules)

1. **Quy tắc Ẩn/Hiện (Visibility vs Disabled):**
   * Nếu người dùng hoàn toàn không có quyền hạn đối với một module hoặc chức năng: **ẨN HOÀN TOÀN** khỏi Sidebar và giao diện (không hiển thị nút xám mờ gây tò mò hoặc ức chế tâm lý).
   * Nếu người dùng có quyền Xem nhưng không có quyền Sửa/Xóa: Hiển thị chế độ **Read-only / View mode** rõ ràng, các nút hành động đổi sang nhãn *"Xem chi tiết"* thay vì hiển thị nút *"Sửa"* rồi bấm vào mới báo lỗi 403.
2. **Quy tắc Chuyển đổi Không gian (Context Switching):**
   * Đối với nhân sự kiêm nhiệm (ví dụ: vừa là Giáo viên, vừa là Tổ trưởng TTCM hoặc Ban Quản lý): Cung cấp nút chuyển đổi không gian làm việc nhanh (Workspace Switcher) ở Header:
     \[ Không gian Giảng dạy ] ⇄ [ Bảng Điều hành Chuyên môn ]\
   * Khi chuyển không gian, toàn bộ Sidebar và Menu tự động lọc lại đúng với vai trò đang chọn, tránh việc thanh menu dài hơn 25 mục làm loãng sự tập trung.
