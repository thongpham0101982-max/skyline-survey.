# KHÁM PHÁ MÃ NGUỒN: HỒ SƠ HỌC SINH (DISCOVERY REPORT)
## Phân tích Chi tiết Cấu trúc Hiện tại của Phân hệ Hồ sơ Học sinh (Wave 1)

---

### 1. DANH MỤC ROUTES VÀ TỆP TIN NGUỒN

| Đường dẫn tệp tin | Kích thước | Vai trò kiến trúc |
| :--- | :---: | :--- |
| [`src/app/admin/ho-so-hoc-sinh/page.tsx`](file:///c:/Users/Windows%2011/.gemini/antigravity/brain/e243b0d8-3241-4833-8c7a-e612ebbae098/browser/Skyline-survey/src/app/admin/ho-so-hoc-sinh/page.tsx) | 4.2 KB (114 dòng) | Server Component kiểm tra phiên đăng nhập (`auth()`), phân quyền module, truy vấn danh sách năm học, cơ sở, lớp học từ Prisma và nạp dữ liệu khởi tạo |
| [`src/app/admin/ho-so-hoc-sinh/client.tsx`](file:///c:/Users/Windows%2011/.gemini/antigravity/brain/e243b0d8-3241-4833-8c7a-e612ebbae098/browser/Skyline-survey/src/app/admin/ho-so-hoc-sinh/client.tsx) | **180 KB (2,578 dòng)** | Client Component nguyên khối phục vụ vai trò Quản trị viên (Admin/Khảo thí/Giáo vụ): Quản lý bộ lọc trường/khối/lớp, danh sách học sinh, 9 tab dữ liệu chi tiết, tải ảnh đại diện, xuất PDF |
| [`src/app/admin/ho-so-hoc-sinh/print/page.tsx`](file:///c:/Users/Windows%2011/.gemini/antigravity/brain/e243b0d8-3241-4833-8c7a-e612ebbae098/browser/Skyline-survey/src/app/admin/ho-so-hoc-sinh/print/page.tsx) | 258 B | Server page wrapper cho màn hình in hồ sơ Admin |
| [`src/app/admin/ho-so-hoc-sinh/print/print_client.tsx`](file:///c:/Users/Windows%2011/.gemini/antigravity/brain/e243b0d8-3241-4833-8c7a-e612ebbae098/browser/Skyline-survey/src/app/admin/ho-so-hoc-sinh/print/print_client.tsx) | 34.6 KB | Bố cục trang in chuẩn khổ A4 phục vụ in ấn học bạ/hồ sơ học sinh Admin |
| [`src/app/teacher/ho-so-hoc-sinh/page.tsx`](file:///c:/Users/Windows%2011/.gemini/antigravity/brain/e243b0d8-3241-4833-8c7a-e612ebbae098/browser/Skyline-survey/src/app/teacher/ho-so-hoc-sinh/page.tsx) | **166 KB (2,283 dòng)** | Client Component nguyên khối phục vụ Giáo viên Chủ nhiệm (GVCN): Xem hồ sơ học sinh lớp chủ nhiệm, 9 tab dữ liệu, xuất PDF và in ấn |
| [`src/app/teacher/ho-so-hoc-sinh/print/page.tsx`](file:///c:/Users/Windows%2011/.gemini/antigravity/brain/e243b0d8-3241-4833-8c7a-e612ebbae098/browser/Skyline-survey/src/app/teacher/ho-so-hoc-sinh/print/page.tsx) | 261 B | Server page wrapper cho màn hình in hồ sơ Giáo viên |
| [`src/app/teacher/ho-so-hoc-sinh/print/print_client.tsx`](file:///c:/Users/Windows%2011/.gemini/antigravity/brain/e243b0d8-3241-4833-8c7a-e612ebbae098/browser/Skyline-survey/src/app/teacher/ho-so-hoc-sinh/print/print_client.tsx) | 23.3 KB | Bố cục trang in chuẩn khổ A4 phục vụ in ấn phía Giáo viên |

---

### 2. DANH MỤC API KẾT NỐI

1. **`/api/admin/student-profiles`**:
   * Phương thức: `GET`
   * Mục đích: Truy vấn danh sách học sinh theo điều kiện lọc (`academicYearId`, `campusId`, `grade`, `classId`, `search`) hoặc lấy chi tiết hồ sơ toàn diện của một học sinh (`studentId`, `academicYearId`).
2. **`/api/teacher-student-records`**:
   * Phương thức: `GET`
   * Mục đích: Lấy thông tin lớp chủ nhiệm và toàn bộ danh sách, hồ sơ học sinh thuộc quyền quản lý của giáo viên đăng nhập.
3. **`/api/student-photos/${studentId}`**:
   * Phương thức: `POST` (Tải lên file ảnh mới multipart/form-data), `DELETE` (Xóa ảnh đại diện).
4. **`/api/admin/ktdbcl/reset-kqht`**:
   * Phương thức: `POST`
   * Mục đích: Thao tác đặc thù của Khảo thí nhằm reset dữ liệu kết quả học tập MOET năm học hiện tại khi cần nạp lại tệp dữ liệu mới.

---

### 3. KIẾN TRÚC NỘI DUNG 9 TAB HỒ SƠ

Cả hai màn hình Admin và Giáo viên đều hỗ trợ cấu trúc 9 Tab dữ liệu:
1. `cv`: **Xem chi tiết HSHS** (Thông tin nhân thân, phụ huynh, liên lạc khẩn cấp, địa chỉ, tình trạng thể chất).
2. `competencies`: **Đánh giá Năng lực (Radar)** (Tích hợp component `StudentCompetencyPortfolio` hiển thị biểu đồ mạng nhện 6 nhóm năng lực cốt lõi).
3. `academic`: **Kết quả Học tập (MOET)** (Bảng điểm tổng hợp các môn học HK1, HK2, Cả năm, điểm quá trình và nhận xét học thuật).
4. `entrance`: **Khảo sát đầu vào** (Bao gồm 3 sub-tab: `results` - Kết quả khảo sát, `admin` - Bàn giao giáo vụ, `academic` - Phân tích đầu vào).
5. `achievements`: **Khen thưởng & Thành tích** (Huy chương, bằng khen, giải Olympic, KHKT, Thể thao, Văn nghệ các cấp Quốc tế, Quốc gia, Tỉnh, Trường).
6. `orientation`: **Hướng nghiệp & Dự định tương lai** (Nguyện vọng phân ban, đại học, nghề nghiệp, thế mạnh phát triển).
7. `projects`: **Hoạt động trải nghiệm & Dự án** (Các hoạt động ngoại khóa, dự án học tập thực tế đã hoàn thành).
8. `comments`: **Nhận xét nổi bật** (Lời phê của giáo viên chủ nhiệm, sổ liên lạc điện tử).
9. `support`: **Hỗ trợ học tập** (Hồ sơ học sinh cần phụ đạo đặc biệt, kế hoạch can thiệp nâng cao kết quả).

---

### 4. CÁC TỒN TẠI VÀ THÁCH THỨC KỸ THUẬT HIỆN HỮU

1. **Mã nguồn nguyên khối khổng lồ (Monolithic Debt):**
   * Tệp `client.tsx` (2,578 dòng) và `page.tsx` của giáo viên (2,283 dòng) chứa toàn bộ mã nguồn xử lý từ lọc, bảng, danh sách, modal đến 9 tab nghiệp vụ trong một tệp duy nhất.
2. **Không tái sử dụng Shared Components:**
   * Hoàn toàn sử dụng các thẻ HTML cơ bản `<button>`, `<input>`, `<select>`, `<div className="rounded-full">` với hàng trăm class Tailwind viết rải rác.
3. **Màu sắc phân mảnh (Color Inconsistency):**
   * Sử dụng lẫn lộn các mã màu: `#00A99D`, `#007A72`, `text-teal-600`, `bg-sky-50`, `bg-amber-100`, `border-purple-300` thay vì bảng màu chuẩn Deep Pine `#003B3A` và semantic tokens.
4. **Trải nghiệm trên màn hình Laptop (1366x768):**
   * Thanh danh sách học sinh bên trái chiếm diện tích lớn khiến phần nội dung hồ sơ bên phải bị co hẹp, gây tràn bảng điểm MOET và khó thao tác trên màn hình nhỏ.\n