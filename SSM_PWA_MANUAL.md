# CẨM NANG HƯỚNG DẪN CÀI ĐẶT & VẬN HÀNH TOÀN DIỆN SSM PWA
### Hệ thống Quản trị Chất lượng & Điều hành Công việc Giáo dục Sky-Line

---

## MỤC LỤC
1. [Giới thiệu & Triết lý Sản phẩm](#1-giới-thiệu--triết-lý-sản-phẩm)
2. [Hướng dẫn Cài đặt PWA trên Thiết bị](#2-hướng-dẫn-cài-đặt-pwa-trên-thiết-bị)
   - [2.1. Cài đặt trên iPhone & iPad (iOS / Safari)](#21-cài-đặt-trên-iphone--ipad-ios--safari)
   - [2.2. Cài đặt trên Điện thoại & Tablet Android (Chrome)](#22-cài-đặt-trên-điện-thoại--tablet-android-chrome)
   - [2.3. Cài đặt trên Máy tính PC & Mac (Chrome / Edge)](#23-cài-đặt-trên-máy-tính-pc--mac-chrome--edge)
3. [Hướng dẫn Khai thác 5 Tab Cốt lõi](#3-hướng-dẫn-khai-thác-5-tab-cốt-lõi)
   - [Tab 1: Hôm nay (SSM Today)](#tab-1-hôm-nay-ssm-today)
   - [Tab 2: Việc của tôi (Task Engine)](#tab-2-việc-của-tôi-task-engine)
   - [Tab 3: SSM AI Assistant](#tab-3-ssm-ai-assistant)
   - [Tab 4: Thông báo (Notification Hub)](#tab-4-thông-báo-notification-hub)
   - [Tab 5: Tôi (Tài khoản & Thiết bị)](#tab-5-tôi-tài-khoản--thiết-bị)
4. [Nút Tác vụ Nhanh – Quick Action FAB (+)](#4-nút-tác-vụ-nhanh--quick-action-fab-)
5. [Thông báo Đẩy (Web Push) & Bản tin Sáng (Morning Brief)](#5-thông-báo-đẩy-web-push--bản-tin-sáng-morning-brief)
6. [Quản trị Bảo mật & Thu hồi Phiên Thiết bị từ xa](#6-quản-trị-bảo-mật--thu-hồi-phiên-thiết-bị-từ-xa)
7. [Cơ chế Vận hành Song song (Dual-Run Architecture)](#7-cơ-chế-vận-hành-song-song-dual-run-architecture)
8. [Xử lý Sự cố & Câu hỏi Thường gặp (FAQ)](#8-xử-lý-sự-cố--câu-hỏi-thường-gặp-faq)

---

## 1. GIỚI THIỆU & TRIẾT LÝ SẢN PHẨM

**SSM PWA (Progressive Web App)** là phiên bản nâng cấp chiến lược của Hệ thống Quản trị Chất lượng Trường học Sky-Line. Ứng dụng mang sứ mệnh:

> **"SSM trong túi của mỗi giáo viên và cán bộ quản lý."**

### Phân công Vai trò giữa Web App Desktop & PWA Mobile:
- **SSM Desktop (≥ 1200px)**: Dành cho làm việc chuyên sâu trên máy tính: cấu hình học kỳ, duyệt ma trận đề thi, nhập liệu sổ điểm lớn, xuất báo cáo PDF/Excel thống kê chi tiết.
- **SSM PWA Mobile (< 768px) & Tablet (768px – 1199px)**: Dành cho xử lý nhanh khi di chuyển, trong lớp học hoặc ngoài giờ với triết lý:
  $$\text{Today} \longrightarrow \text{Alert} \longrightarrow \text{Understand} \longrightarrow \text{Act} \longrightarrow \text{AI Support}$$
  - **3 giây** mở app nắm ngay lịch dạy và việc khẩn cấp trong ngày.
  - **1 chạm** chấm nhanh dự giờ, gọi điện phụ huynh hoặc hoàn tất nhiệm vụ.
  - **Không cuộn ngang, không bảng biểu rối rắm, diện tích chạm chuẩn $\ge 44\text{px}$.**

---

## 2. HƯỚNG DẪN CÀI ĐẶT PWA TRÊN THIẾT BỊ

SSM PWA không cần tải từ App Store hay Google Play. Thầy/Cô chỉ cần cài đặt trực tiếp từ trình duyệt trong 10 giây:

### 2.1. Cài đặt trên iPhone & iPad (iOS / Safari)
1. Mở trình duyệt **Safari** và truy cập liên kết: `https://ssm.skylineschool.edu.vn` (hoặc IP hệ thống trong mạng nội bộ).
2. Nhấn vào biểu tượng **Chia sẻ (Share)** ở thanh công cụ dưới đáy màn hình (hình ô vuông có mũi tên chỉ lên).
3. Cuộn xuống và chọn mục **"Thêm vào MH chính" (Add to Home Screen)**.
4. Nhấn **"Thêm" (Add)** ở góc trên bên phải.
5. Biểu tượng **SSM Sky-Line** sẽ xuất hiện trên màn hình chính như một ứng dụng gốc (Native App), tự động ẩn thanh địa chỉ trình duyệt khi mở.

### 2.2. Cài đặt trên Điện thoại & Tablet Android (Chrome)
1. Mở trình duyệt **Google Chrome** và truy cập vào SSM.
2. Hệ thống sẽ tự động hiển thị banner thông báo: **"Cài đặt ứng dụng SSM vào màn hình chính"**.
3. Nhấn nút **"Cài đặt" (Install)**.
   *(Nếu không thấy banner, nhấn vào dấu 3 chấm góc trên bên phải Chrome $\rightarrow$ Chọn **"Cài đặt ứng dụng"** hoặc **"Thêm vào màn hình chính"**)*.
4. Ứng dụng được cài đặt vào ngăn kéo ứng dụng và màn hình chính.

### 2.3. Cài đặt trên Máy tính PC & Mac (Chrome / Edge)
1. Mở Google Chrome hoặc Microsoft Edge trên máy tính.
2. Trên thanh địa chỉ (URL) ở góc phải sẽ xuất hiện biểu tượng **Cài đặt ứng dụng** (hình màn hình máy tính có dấu mũi tên).
3. Nhấp chọn và bấm **"Cài đặt" (Install)**.
4. SSM sẽ mở trong cửa sổ riêng biệt không có thanh công cụ trình duyệt, có icon riêng trên Taskbar / Dock.

---

## 3. HƯỚNG DẪN KHAI THÁC 5 TAB CỐT LÕI

Thanh điều hướng dưới đáy màn hình (Bottom Navigation Bar) cố định 5 tab chức năng chính:

```
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│   [Hôm nay]  │    [Việc]    │   [SSM AI]   │  [Thông báo] │     [Tôi]    │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

### Tab 1: Hôm nay (SSM Today)
- **Lời chào & Trạng thái**: Hiển thị tên giáo viên, vai trò (GVCN/GVBM/TTCM) và tiến độ công việc trong ngày.
- **Tiến độ hôm nay**: Vòng tròn tỷ lệ hoàn thành (VD: "Đã làm 3/4 việc").
- **Kế hoạch giảng dạy & Dự giờ hôm nay**: Liệt kê các tiết dạy, tiết dự giờ có gắn trạng thái (Sắp diễn ra, Đang diễn ra, Đã xong).
- **Thẻ việc ưu tiên (Urgent Actions)**: Đưa các việc quá hạn hoặc sát hạn lên trên cùng kèm nút hoàn tất 1 chạm.

### Tab 2: Việc của tôi (Task Engine)
- **Bộ lọc 4 trạng thái**: Tất cả • Khẩn cấp (đỏ) • Chờ xử lý • Hoàn thành.
- **Tập hợp đa luồng tự động từ 7 phân hệ**:
  1. Hạn khóa sổ điểm & nhập nhận xét (KTĐBCL).
  2. Lịch dự giờ cần đánh giá chuyên môn (Dự giờ).
  3. Phiếu khảo sát định kỳ cần phản hồi (Khảo sát).
  4. Duyệt yêu cầu mở khóa sổ điểm (Dành cho TTCM/BGH).
  5. Đánh giá học sinh đầu vào (Input Assessment).
  6. Hoạt động trải nghiệm sáng tạo (Experiential Activities).
  7. Nhiệm vụ cá nhân tự tạo hoặc giao việc nội bộ.
- **Thao tác nhanh**: Nhấn vào ô tròn để đánh dấu "Đã xong", hoặc nhấn "Chi tiết" để đi thẳng đến màn hình nghiệp vụ tương ứng (Deep Link).

### Tab 3: SSM AI Assistant
- Nút nổi bật trung tâm với icon ngôi sao thông minh.
- **Prompt Pills theo vai trò**: Giáo viên chỉ cần chạm vào câu lệnh mẫu:
  - *GVCN*: "Soạn tin nhắn gửi phụ huynh về tình hình học tập tuần này", "Kiểm tra học sinh có điểm dưới trung bình".
  - *GVBM*: "Gợi ý nhận xét học sinh tiến bộ môn Toán", "Tạo nhắc việc chấm bài kiểm tra 15 phút".
  - *TTCM*: "Tổng hợp tình hình dự giờ tổ chuyên môn tháng này".
- **Action Cards**: AI phản hồi kèm nút thực thi ngay (Tạo việc tự động vào Tab Việc, Mở hồ sơ học sinh, Mở lịch dự giờ).

### Tab 4: Thông báo (Notification Hub)
- **Phân loại 4 nhóm màu chuẩn trực quan**:
  - 🔴 **Cần xử lý ngay (Action Required)**: Quá hạn sổ điểm, phê duyệt gấp.
  - 🟠 **Chú ý (Attention)**: Cảnh báo học lực học sinh, nhắc nhở trước 24h.
  - 🔵 **Thông tin (Information)**: Lịch thi đua, tin tức nhà trường, phân công mới.
  - 🟢 **Hoàn thành (Completed)**: Thông báo xét duyệt thành công, nộp điểm thành công.
- Hỗ trợ đánh dấu đọc tất cả và lọc thông báo chưa đọc.

### Tab 5: Tôi (Tài khoản & Thiết bị)
- Thông tin tài khoản, đơn vị công tác và cơ sở trường (Campus).
- **Thiết bị đăng nhập**: Xem các thiết bị đang truy cập và thu hồi phiên từ xa.
- **Đổi mật khẩu** & **Đăng xuất an toàn**.

---

## 4. NÚT TÁC VỤ NHANH – QUICK ACTION FAB (+)

Tại góc dưới bên phải màn hình luôn hiện diện nút bấm nổi **(+) Quick Action FAB** (Speed Dial) cho phép Thầy/Cô kích hoạt ngay 4 thao tác thường xuyên nhất chỉ bằng 1 chạm:

1. ⚡ **Đánh giá dự giờ**: Mở danh sách tiết dự giờ gần nhất để chấm điểm nhanh 4 tiêu chí chuẩn SSM.
2. ⚡ **Tra cứu học sinh 360°**: Tìm kiếm học sinh theo tên/mã trong $\le 150\text{ms}$, xem thông tin liên lạc và nút gọi phụ huynh `tel:`.
3. ⚡ **Hỏi trợ lý SSM AI**: Bật khung thoại trí tuệ nhân tạo hỗ trợ công việc giáo dục.
4. ⚡ **Tạo việc cá nhân**: Ghi nhanh nhắc việc cần làm trong ngày vào Tab Việc.

---

## 5. THÔNG BÁO ĐẨY (WEB PUSH) & BẢN TIN SÁNG (MORNING BRIEF)

### 5.1. Bật Thông báo Đẩy Web Push
- Khi mở PWA lần đầu, hộp thoại chào đón sẽ hỏi: *"Bật thông báo đẩy để không bỏ lỡ lịch dự giờ và hạn nộp điểm khẩn cấp"*.
- Thầy/Cô chỉ cần nhấn **"Cho phép nhận thông báo"**.
- Trình duyệt sẽ yêu cầu quyền thông báo $\rightarrow$ Chọn **"Allow" (Cho phép)**.

### 5.2. Bản tin Sáng (Morning Brief) lúc 07:00 AM
- Mỗi sáng lúc 07:00, SSM PWA gửi thông báo tóm tắt ngắn gọn:
  > *"Chào Cô Mai! Hôm nay Cô có 3 tiết dạy tại CS1, 1 tiết dự giờ lúc 09:15 và 2 đầu việc cần hoàn thành."*
- Giúp thầy cô chủ động 100% thời gian biểu trước khi bước vào cổng trường.

---

## 6. QUẢN TRỊ BẢO MẬT & THU HỒI PHIÊN THIẾT BỊ TỪ XA

SSM PWA đạt tiêu chuẩn bảo mật doanh nghiệp (Enterprise Grade):

### 6.1. Quản lý Thiết bị Truy cập
1. Vào Tab **Tôi** $\rightarrow$ Chọn **"Thiết bị đăng nhập"**.
2. Màn hình hiển thị:
   - Thẻ **"Thiết bị này"** (Huy hiệu xanh lá): Tên điện thoại, trình duyệt, IP và trạng thái đang hoạt động.
   - Danh sách các **Thiết bị khác** (điện thoại cũ, máy tính phòng hội đồng, iPad...).
3. Nếu phát hiện thiết bị lạ hoặc nghi ngờ thất lạc máy:
   - Nhấn icon **Đăng xuất (LogOut)** cạnh thiết bị đó.
   - Hoặc nhấn **"Đăng xuất tất cả thiết bị khác"** để vô hiệu hóa toàn bộ các nơi khác chỉ với 1 thao tác.

### 6.2. Cam kết Bảo vệ Dữ liệu Học sinh & Phụ huynh
- **Không lưu trữ ngoại tuyến dữ liệu nhạy cảm**: Số điện thoại phụ huynh, học bạ và điểm số không bị lưu cố định trên bộ nhớ máy điện thoại. Dữ liệu chỉ tải theo phiên an toàn từ server mã hóa HTTPS.
- Khi người dùng đăng xuất hoặc bị thu hồi phiên từ xa, ứng dụng lập tức xóa sạch phiên làm việc trên máy.

---

## 7. CƠ CHẾ VẬN HÀNH SONG SONG (DUAL-RUN ARCHITECTURE)

Hệ thống SSM vận hành theo mô hình **1 Nền tảng – 2 Giao diện**:

```
                 ┌──────────────────────────────────────┐
                 │  Domain: ssm.skylineschool.edu.vn    │
                 └──────────────────┬───────────────────┘
                                    │
                  Next.js Smart Responsive Engine
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
   [Mobile / Tablet]                                     [Desktop]
    Viewport < 1200px                                Viewport ≥ 1200px
           │                                                 │
    SSM PWA Mobile                                    SSM Web Desktop
 (Today, Task, AI, FAB)                            (Admin, Sổ điểm, Báo cáo)
           │                                                 │
           └────────────────────────┬────────────────────────┘
                                    │
                         Unified Backend & APIs
                                    │
                      Turso Cloud & SQLite Sync
```

- **Cùng 1 tài khoản & mật khẩu**: Giáo viên dùng tài khoản hiện tại để đăng nhập trên mọi thiết bị.
- **Đồng bộ thời gian thực**: Giáo viên hoàn tất chấm dự giờ trên điện thoại $\rightarrow$ Hiệu trưởng xem ngay trên màn hình máy tính hội đồng mà không cần bấm F5.
- **Không gián đoạn vận hành (Zero Downtime)**: Toàn bộ quá trình nâng cấp không làm thay đổi các bảng dữ liệu gốc của nhà trường.

---

## 8. XỬ LÝ SỰ CỐ & CÂU HỎI THƯỜNG GẶP (FAQ)

**Q1: Tôi không thấy nút "Cài đặt ứng dụng" trên iPhone?**  
*Trả lời*: Apple chỉ cho phép cài đặt PWA qua trình duyệt **Safari**. Hãy mở liên kết bằng Safari, bấm nút Chia sẻ (Share) $\rightarrow$ "Thêm vào MH chính".

**Q2: Khi mất mạng Internet tôi có xem được việc không?**  
*Trả lời*: Có. PWA lưu tạm thời bản sao giao diện và công việc gần nhất. Khi mất mạng, màn hình sẽ thông báo chế độ ngoại tuyến và tự động đồng bộ lại ngay khi có sóng Wi-Fi/4G.

**Q3: Tôi bị mất điện thoại thì phải làm sao?**  
*Trả lời*: Thầy/Cô hãy dùng máy tính đăng nhập vào SSM $\rightarrow$ Vào mục Cá nhân $\rightarrow$ Thiết bị đăng nhập $\rightarrow$ Bấm **"Đăng xuất tất cả thiết bị khác"**. Điện thoại bị mất sẽ bị khóa phiên ngay lập tức.

**Q4: Ai là người hỗ trợ kỹ thuật khi gặp sự cố?**  
*Trả lời*: Bộ phận Kỹ thuật Công nghệ & Ban Kiểm soát Đảm bảo Chất lượng (KTĐBCL) Hệ thống Giáo dục Sky-Line luôn sẵn sàng hỗ trợ trực tiếp.

---
*Tài liệu được ban hành và nghiệm thu chính thức cùng Bộ sản phẩm SSM PWA.*
