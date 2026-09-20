# SƠ ĐỒ CẤU TRÚC TRANG: HỒ SƠ HỌC SINH (PAGE MAP)
## Bản đồ Luồng Trải nghiệm và Bố cục Thông tin Chuẩn hóa Wave 1

---

### 1. BẢN ĐỒ LUỒNG ĐIỀU HƯỚNG (NAVIGATION FLOW)

```
[DANH SÁCH BỘ LỌC] (Năm học, Bậc học, Cơ sở, Khối, Lớp)
       │
       ▼
[DANH SÁCH HỌC SINH] (Tìm kiếm nhanh, trạng thái, thẻ thông tin HS)
       │
       ▼  (Nhấp chọn học sinh)
[KHUNG XEM HỒ SƠ CHI TIẾT 360°]
 ├─ HEADER: Avatar + Tên HS + Lớp + Mã HS + Điều hướng Trước/Sau + Tải PDF/In A4
 └─ BĂNG TAB CHUYỂN PHÂN HỆ (9 Tabs chuẩn)
      ├─ [Tab 1: Tổng quan CV] ──────> Lý lịch, Phụ huynh, Sức khỏe, Khảo sát
      ├─ [Tab 2: Năng lực Radar] ────> Biểu đồ Radar 6 miền năng lực cốt lõi
      ├─ [Tab 3: Học tập MOET] ──────> Điểm HK1, HK2, Cả năm, Học lực, Hạnh kiểm
      ├─ [Tab 4: Khảo sát đầu vào] ──> Điểm KSCL, Đánh giá năng lực đầu cấp
      ├─ [Tab 5: Thành tích] ────────> Bằng khen, Giải Olympic, KHKT, Thể thao
      ├─ [Tab 6: Hướng nghiệp] ──────> Khảo sát nguyện vọng, thế mạnh nghề nghiệp
      ├─ [Tab 7: Trải nghiệm] ───────> Dự án thực tế, hoạt động ngoại khóa
      ├─ [Tab 8: Nhận xét] ──────────> Sổ liên lạc, Lời phê giáo viên chủ nhiệm
      └─ [Tab 9: Hỗ trợ học tập] ────> Kế hoạch phụ đạo, can thiệp cá nhân hóa
```

---

### 2. CẤU TRÚC BỐ CỤC CHUẨN TRÊN MÀN HÌNH LAPTOP (1366 × 768)

Để khắc phục hiện tượng chật chội và tràn khung trên màn hình giáo viên, bố cục trang được chuẩn hóa thành 3 phân vùng rõ rệt:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [APP SHELL & PAGE HEADER]: Tiêu đề "Hồ sơ Học sinh" | Đổi Năm học | Nút In Cả Lớp     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [UNIFIED FILTER BAR]: Cơ sở ▾ | Bậc học ▾ | Khối ▾ | Lớp ▾ | Ô tìm tên/mã HS           │
├────────────────────────────────┬───────────────────────────────────────────────────────┤
│ [PANEL TRÁI: DANH SÁCH HS]     │ [PANEL PHẢI: KHUNG CHI TIẾT HỒ SƠ HỌC SINH 360°]      │
│ (Chiếm 280px cố định)          │ (Co giãn tự động flex-1, cuộn nội dung độc lập)       │
│                                │                                                       │
│ • Tổng số HS: 35 em            │ • Profile Header: Avatar (Upload), Họ tên, Mã HS, Lớp │
│ • Tìm kiếm nhanh               │   Hành động: [< Trước] [Sau >] | [Tải PDF] | [In A4]  │
│ • Danh sách học sinh:          ├───────────────────────────────────────────────────────┤
│   - [Avatar] Nguyễn Văn A      │ • Standard Tab Bar (9 Tabs cuộn ngang với hiệu ứng)   │
│     Mã: 20260101 • Nam         ├───────────────────────────────────────────────────────┤
│   - [Avatar] Lê Thị B (Active) │ • Vùng nội dung Tab đang kích hoạt:                   │
│     Mã: 20260102 • Nữ          │   (Bảng điểm MOET, Radar chart, hoặc Lý lịch...)      │
│   - ...                        │                                                       │
│   (Có nút Thu gọn/Mở rộng panel)                                                       │
└────────────────────────────────┴───────────────────────────────────────────────────────┘
```

---

### 3. CÁC ĐIỂM CẢI TIẾN TRẢI NGHIỆM CHÍNH (UX ENHANCEMENTS)

1. **Thanh lọc hợp nhất (Unified FilterBar):** Thay vì các ô select đặt rải rác, toàn bộ được đưa vào `FilterBar` gọn gàng, có nút "Đặt lại bộ lọc" khi cần.
2. **Khung chuyển học sinh thông minh (Quick Student Switcher):** Giáo viên có thể duyệt liên tục từ học sinh này sang học sinh khác bằng nút `[Trước]` và `[Sau]` hoặc phím tắt mà không cần cuộn lại danh sách.
3. **Chế độ Toàn màn hình (Expansive Fullscreen Mode):** Khi cần xem các bảng điểm rộng (Tab MOET) hoặc biểu đồ Radar lớn, người dùng có thể bấm nút "Toàn màn hình" để ẩn thanh danh sách bên trái, tối đa hóa không gian làm việc.\n