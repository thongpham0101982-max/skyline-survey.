# QUY TRÌNH NGHIỆP VỤ: CỐ VẤN HỌC TẬP (WORKFLOW)
## Chu Trình Vận Hành 5 Giai Đoạn Từ Thiết Lập Đến Điều Chỉnh

---

### 1. SƠ ĐỒ CHU TRÌNH TỔNG THỂ

```mermaid
sequenceDiagram
    autonumber
    actor HS as Học sinh
    actor GV as GVCN / Cố vấn
    participant SYS as Hệ thống SSM
    participant DB as CSDL Học vụ

    Note over HS, SYS: GIAI ĐOẠN 1: THIẾT LẬP MỤC TIÊU
    HS->>SYS: Đăng nhập Portal HS, mở "Mục tiêu của em"
    SYS-->>HS: Hiển thị form phân nhóm theo khối lớp (K1-5, K6-12)
    HS->>SYS: Nhập mục tiêu môn học & mục tiêu rèn luyện cá nhân
    HS->>SYS: Ký cam kết và bấm "LƯU PHIẾU MỤC TIÊU"
    SYS->>DB: Ghi nhận StudentGoal, khóa trạng thái chỉnh sửa trực tiếp

    Note over GV, SYS: GIAI ĐOẠN 2: THEO DÕI & ĐỒNG HÀNH
    GV->>SYS: Mở "Quản lý Cố vấn" xem danh sách lớp
    SYS-->>GV: Bảng tiến độ nộp phiếu, học sinh chưa tạo phiếu
    GV->>SYS: Nhập nhận xét đồng hành hoặc ghi sổ nhật ký tư vấn

    Note over SYS, DB: GIAI ĐOẠN 3: ĐỐI SOÁT & TÍNH TOÁN GAP
    SYS->>DB: Lấy điểm thi thực tế mới nhất (KSCL / GK1 / CK1...)
    SYS->>SYS: Chạy advisoryGapService tính GAP = Target - Current
    SYS-->>HS: Cập nhật thẻ tiến độ và khoảng cách cần cố gắng
    SYS-->>GV: Cảnh báo học sinh có GAP lớn cần trợ giúp

    Note over HS, GV: GIAI ĐOẠN 4: YÊU CẦU ĐIỀU CHỈNH (NẾU CẦN)
    HS->>SYS: Bấm "Xin điều chỉnh phiếu", nhập lý do
    SYS->>DB: Tạo StudentGoalAdjustmentRequest (trạng thái PENDING)
    GV->>SYS: Xem xét lý do điều chỉnh của học sinh
    alt Đồng ý (APPROVED)
        GV->>SYS: Duyệt mở phiếu, gửi phản hồi động viên
        SYS-->>HS: Mở khóa quyền sửa; HS cập nhật và lưu phiên bản mới
    else Từ chối (REJECTED)
        GV->>SYS: Gửi phản hồi hướng dẫn học sinh tiếp tục cố gắng
        SYS-->>HS: Giữ nguyên phiếu hiện tại
    end

    Note over SYS, DB: GIAI ĐOẠN 5: TÍCH HỢP HỒ SƠ 360°
    SYS->>DB: Cập nhật tóm tắt mục tiêu vào Hồ sơ học sinh 360° (Read-only)
```

---

### 2. CHI TIẾT TỪNG BƯỚC THAO TÁC

#### Bước 1: Thiết lập Mục tiêu Ban đầu (Đầu năm học)
* Học sinh tự lập kế hoạch học tập và phát triển cá nhân theo các nhóm danh mục phù hợp lứa tuổi.
* Môn học: Khuyến khích đặt mục tiêu điểm số cụ thể kèm kế hoạch hành động chi tiết.
* Sau khi nộp, phiếu chuyển sang trạng thái đã khóa (`isSubmitted: true`) nhằm bảo đảm tính cam kết.

#### Bước 2: Theo dõi Cột mốc Checkpoint (Giữa kỳ / Cuối kỳ)
* Khi điểm thi Giữa kỳ 1 hoặc Cuối kỳ 1 được công bố từ phân hệ Khảo thí/Sổ điểm, SSM tự động đối soát điểm thực tế với điểm mục tiêu.
* Hệ thống hiển thị huy hiệu trạng thái:
  * `Đã đạt mục tiêu` / `Vượt mục tiêu` (Current >= Target)
  * `Tiệm cận` (GAP <= 0.5 điểm)
  * `Cần nỗ lực` (GAP > 0.5 điểm)
  * `Chưa có điểm thực tế`

#### Bước 3: Quy trình Xin Mở Phiếu Điều Chỉnh (Adjustment Request)
* Tuyệt đối không cho phép học sinh tự ý mở khóa phiếu.
* Học sinh phải điền lý do rõ ràng (VD: Hoàn thành mục tiêu sớm muốn nâng cao, hoặc gặp biến cố sức khỏe cần điều chỉnh kế hoạch).
* Giáo viên Chủ nhiệm hoặc Cố vấn học tập có toàn quyền xét duyệt hoặc từ chối kèm lời nhắn phản hồi.\n