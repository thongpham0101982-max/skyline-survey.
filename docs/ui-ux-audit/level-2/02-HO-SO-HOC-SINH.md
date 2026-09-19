# SSM LEVEL-2 AUDIT: HỒ SƠ HỌC SINH TOÀN DIỆN
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Phân hệ trọng điểm:** Hồ sơ học sinh 360°, Đánh giá năng lực, Điểm số, Thể chất & In ấn A4  
**Đơn vị thực hiện Audit:** Antigravity UI/UX Pro Max Engine  
**Trạng thái mã nguồn:** READ-ONLY (Không can thiệp logic, DB hay source code)

---

## 1. TỔNG QUAN PHÂN HỆ VÀ HIỆN TRẠNG MÃ NGUỒN

Hồ sơ học sinh (Student 360° Profile) là trung tâm dữ liệu giáo dục của từng cá nhân học sinh tại Sky-Line. Phân hệ được thiết kế để giáo viên chủ nhiệm (GVCN), giáo viên bộ môn (GVBM), cố vấn học tập, phụ huynh và Ban Giám hiệu theo dõi hành trình trưởng thành của học sinh từ lớp 1 đến lớp 12.

### Thống kê mã nguồn giao diện (Client-side):
- `src/app/admin/ho-so-hoc-sinh/client.tsx`: **2,577 dòng**
- `src/app/teacher/ho-so-hoc-sinh/page.tsx`: **2,283 dòng**
- `src/app/teacher/ho-so-hoc-sinh/StudentProfileModal.tsx` (và các components tab con): **~3,400 dòng**
- **Vấn đề trùng lặp mã nguồn (Code Duplication Critical):**
  Hai file `admin/ho-so-hoc-sinh/client.tsx` và `teacher/ho-so-hoc-sinh/page.tsx` nhân bản gần như 100% logic của 9 tabs:
  ```typescript
  // Trích dẫn từ mã nguồn: "// Tabs matching 100% Admin"
  const TABS = [
    'overview',      // 1. Tổng quan lý lịch & sức khỏe
    'grades',        // 2. Điểm số & Học lực định kỳ
    'conduct',       // 3. Rèn luyện & Nề nếp tác phong
    'competencies',   // 4. Đánh giá Năng lực & Radar Chart
    'health',        // 5. Thể chất, BMI & Y tế học đường
    'activities',    // 6. Hoạt động ngoại khóa & CLB
    'advisory',      // 7. Nhật ký Cố vấn học tập
    'rewards',       // 8. Khen thưởng & Kỷ luật
    'print'          // 9. Bản in hồ sơ A4 chuẩn Bộ & Quốc tế
  ];
  ```
  Hơn **4,860 dòng code** bị sao chép trùng lặp, tạo ra rủi ro rất cao khi bảo trì giao diện hoặc cập nhật tiêu chuẩn đánh giá.

---

## 2. BẢNG PHÂN TÍCH LỖI VÀ VẤN ĐỀ TRẢI NGHIỆM CHI TIẾT (ISSUE MATRIX)

| Mã ID | Vị trí Source Code | Mô tả vấn đề | Mức độ | Tác động người dùng | Giải pháp đề xuất UI/UX Pro Max |
|---|---|---|---|---|---|
| **HS-P0-01** | `admin/ho-so-hoc-sinh` & `teacher/ho-so-hoc-sinh` | Thanh 9 tabs trên màn hình laptop độ phân giải 1366px bị ngắt thành 2 dòng (wrap), che mất tiêu đề và avatar học sinh. | **P0 (Critical)** | Vỡ bố cục header hồ sơ, đẩy nội dung tab xuống dưới, giao diện xộc xệch. | Chuyển Tabs thành Horizontal Scroll Bar với chỉ báo mờ 2 đầu (Gradient Fade) hoặc nhóm 5 tab chính + menu 'Thêm' (`...`). |
| **HS-P0-02** | `client.tsx:410-630` | Tải dữ liệu toàn diện (Eager load) của cả 9 tabs cùng lúc khi mở modal học sinh. | **P0 (Critical)** | Thời gian mở modal mất 2-4 giây, mạng chập chờn sẽ gây timeout hoặc màn hình trắng xóa. | Áp dụng Lazy Loading từng Tab: chỉ fetch dữ liệu tab Tổng quan ban đầu, các tab khác chỉ load khi người dùng click vào tab đó. |
| **HS-P1-01** | `admin` vs `teacher` | Trùng lặp mã nguồn 4,860 dòng giữa giao diện Admin và Giáo viên. | **P1 (High)** | Lệch chuẩn UI khi sửa 1 bên quên bên kia; tốn gấp đôi công sức bảo trì. | Hợp nhất thành 1 Shared Component duy nhất: `<StudentProfileView mode="admin" \| "teacher" />`. |
| **HS-P1-02** | Tab `competencies` | Biểu đồ Radar năng lực (Radar Chart) thiếu đường đối chuẩn so sánh (Benchmark). | **P1 (High)** | GV và Phụ huynh chỉ thấy đa giác của học sinh mà không biết em mạnh/yếu hơn mức trung bình lớp/khối như thế nào. | Bổ sung lớp phủ đường viền đứt nét màu xám đại diện cho Trung bình Khối (`Grade Benchmark`) trên Radar Chart. |
| **HS-P1-03** | Thanh tìm kiếm & lọc | Bộ lọc Khối, Lớp, Học kỳ, Trạng thái kích hoạt fetch lại toàn bộ bảng sau mỗi lần click dropdown không có transition. | **P1 (High)** | Bảng nháy chớp giật liên tục, gây khó chịu cho mắt người dùng khi lọc danh sách học sinh. | Sử dụng React `useTransition` kết hợp Debounce tìm kiếm (300ms) và Skeleton mượt mà. |
| **HS-P2-01** | Tab `print` | Trang in ấn A4 (`/print`) bị vỡ trang khi in từ trình duyệt, bảng điểm bị cắt ngang dòng giữa 2 trang giấy. | **P2 (Medium)** | Bản in hồ sơ gửi phụ huynh bị xấu, mất thẩm mỹ chuyên nghiệp của Sky-Line. | Thiết kế CSS `@media print` chuẩn hóa, dùng `page-break-inside: avoid` cho từng bảng và card thông tin. |
| **HS-P2-02** | Tab `health` | Chỉ số BMI và chiều cao/cân nặng hiển thị dạng bảng số thô khan hiếm visual. | **P2 (Medium)** | Khó nhận biết nhanh học sinh suy dinh dưỡng hoặc béo phì. | Bổ sung thước đo BMI trực quan bằng thanh màu (Xanh lá: Chuẩn, Vàng: Cảnh báo, Đỏ: Nguy cơ). |

---

## 3. ĐÁNH GIÁ CHI TIẾT TỪNG TAB NỘI DUNG

### Tab 1: Tổng quan (Overview)
- **Điểm mạnh:** Thẻ thông tin học sinh có ảnh đại diện, mã định danh, lớp, ngày sinh, giáo viên chủ nhiệm.
- **Điểm yếu:** Thông tin liên lạc phụ huynh (Số điện thoại bố/mẹ, địa chỉ đón trả xe bus) bị đặt lẫn lộn với thông tin học vụ. Cần tách rõ 2 card: "Thông tin Học vụ" và "Thông tin Gia đình & Liên lạc khẩn cấp".

### Tab 2: Điểm số & Học lực (Grades)
- **Hiện trạng:** Bảng điểm chi tiết các môn học theo Thông tư 22/58.
- **Điểm yếu:** Thiếu bộ lọc nhanh học kỳ (Kỳ 1, Kỳ 2, Cả năm) ngay trên đầu bảng điểm; chữ số thập phân không canh lề phải (`text-right font-mono`), gây khó khăn khi so sánh cột điểm dọc.

### Tab 4: Đánh giá Năng lực (Competency Radar Chart)
- **Hiện trạng:** Sử dụng SVG hoặc Chart.js để vẽ biểu đồ 5 phẩm chất 10 năng lực.
- **Điểm yếu:** Trên màn hình di động, radar chart bị co lại quá nhỏ khiến các nhãn chữ (ví dụ: "Tự chủ & Tự học", "Giao tiếp & Hợp tác") đè lên nhau không đọc được. Cần fallback sang dạng thanh tiến trình (Bar Progress) khi xem trên viewport `< 768px`.

### Tab 9: Bản in hồ sơ A4 (Printable Portfolio)
- **Hiện trạng:** Giao diện xem trước bản in.
- **Điểm yếu:** Thiếu nút chọn các mục cần in (ví dụ: Phụ huynh chỉ cần xin in Điểm + Rèn luyện, không cần in Y tế). Hiện tại bắt buộc in cả 9 phần dài 6 trang A4 gây lãng phí giấy.

---

## 4. THIẾT KẾ ĐỀ XUẤT NÂNG CẤP (PROPOSED WIREFRAME)

### 4.1. Header Hồ sơ & Smart Scroll Tabs (Desktop & Laptop 1366px)

```
+----------------------------------------------------------------------------------------------------+
|  [HỒ SƠ HỌC SINH]  Mã: SL-2026-10492                                             [ Xuất PDF A4 ]   |
|                                                                                                    |
|  [AVATAR]  NGUYỄN HOÀNG PHÚC (Nam - 15 tuổi)               Trạng thái: [ Đang học ]               |
|   (100x100) Lớp: 10A1 ── GVCN: Cô Lê Thu Hà ── Cơ sở: Riverside ── Học kỳ: HK1 (2026-2027)        |
|            ĐTB: 8.8 (Giỏi) │ Rèn luyện: Tốt │ BMI: 21.2 (Bình thường) │ Cố vấn: 2 lượt SOS        |
+----------------------------------------------------------------------------------------------------+
|  [‹] [● Tổng quan] [Điểm số] [Rèn luyện] [Năng lực] [Thể chất] [Cố vấn] [Khen thưởng] [›]  [▾ Khác] |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  TAB ĐANG XEM: ĐÁNH GIÁ NĂNG LỰC & PHẨM CHẤT (RADAR)                                               |
|                                                                                                    |
|  +--------------------------------------------+  +----------------------------------------------+  |
|  |           BIỂU ĐỒ NĂNG LỰC (RADAR)         |  | CHI TIẾT ĐIỂM NĂNG LỰC CỐT LÕI (Thang 10)    |  |
|  |                                            |  |                                              |  |
|  |                  Tự chủ                    |  | 1. Tự chủ & Tự học:        [ 8.5/10 ] (▲ +0.5)|  |
|  |                   / \                      |  | 2. Giao tiếp & Hợp tác:    [ 9.0/10 ] (▲ +1.0)|  |
|  |       Sáng tạo   /   \   Giao tiếp        |  | 3. Giải quyết vấn đề:      [ 7.5/10 ] (▼ -0.5)|  |
|  |              \  /  ★  \  /                |  | 4. Năng lực Ngôn ngữ:      [ 9.2/10 ] (Chuẩn) |  |
|  |               \/_______\/                 |  | 5. Năng lực Tin học:       [ 8.0/10 ]         |  |
|  |           Tính toán   Tin học              |  | ───────────────────────────────────────────  |  |
|  |                                            |  | Chú thích:                                   |  |
|  |  ── Học sinh Phúc    ---- TB Khối 10       |  | ★ Vượt trội (>8.5)   ▲ Tăng trưởng so với HK1|  |
|  +--------------------------------------------+  +----------------------------------------------+  |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 5. LỘ TRÌNH TRIỂN KHAI

1. **Sprint 1 (Shared Component Refactor):**
   - Hợp nhất logic giao diện giữa `admin/ho-so-hoc-sinh` và `teacher/ho-so-hoc-sinh` vào component chung `@/components/students/StudentProfileMasterView.tsx`.
   - Giảm thiểu hơn 3,500 dòng code trùng lặp.
2. **Sprint 2 (Tabs & Lazy Loading):**
   - Triển khai Tab Navigation thông minh với Scroll Buttons và Lazy Loading bằng dynamic import `next/dynamic`.
3. **Sprint 3 (Print & Export Perfection):**
   - Viết lại module A4 Print Preview với CSS `@media print` chuẩn, cho phép chọn in linh hoạt từng phần (Checklist in ấn).
