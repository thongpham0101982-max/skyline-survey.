# SSM LEVEL-2 AUDIT: CÁC PHÂN HỆ CÒN LẠI & TỔNG HỢP KIẾN TRÚC
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Phân hệ kiểm tra:** Khảo sát đầu vào, Sổ điểm, Ngân hàng đề, Trải nghiệm sống, Quản trị hệ thống  
**Đơn vị thực hiện Audit:** Antigravity UI/UX Pro Max Engine  
**Trạng thái mã nguồn:** READ-ONLY (Không can thiệp logic, DB hay source code)

---

## 1. TỔNG QUAN VÀ PHÂN TÍCH NHANH CÁC PHÂN HỆ PHỤ TRỢ

Bên cạnh 4 trụ cột chính đã audit chi tiết, hệ thống SSM còn vận hành các phân hệ quan trọng khác:

### 1.1. Khảo sát Đầu vào (Entrance Assessment / Tuyển sinh)
- **Vị trí mã nguồn:** `src/app/admin/khao-sat-dau-vao/` & `src/app/teacher/khao-sat-dau-vao/`
- **Chức năng:** Chấm thi, phỏng vấn đánh giá năng lực học sinh mới ứng tuyển vào trường.
- **Vấn đề UI/UX:**
  - Phiếu chấm phỏng vấn trên tablet của giáo viên bị nút bàn phím ảo che khuất trường nhập nhận xét.
  - Thiếu trạng thái tự động tính tổng điểm và xếp lớp dự kiến.

### 1.2. Sổ điểm & Đánh giá Định kỳ (Grading & Continuous Assessment)
- **Vị trí mã nguồn:** `src/app/teacher/so-diem/` & `src/app/admin/bang-diem/`
- **Chức năng:** Nhập điểm kiểm tra thường xuyên, giữa kỳ, cuối kỳ theo Thông tư Bộ GD&ĐT.
- **Vấn đề UI/UX:**
  - Bảng nhập điểm thiếu hỗ trợ phím điều hướng (Excel-like Keyboard Navigation: Phím mũi tên lên/xuống/trái/phải và phím Enter để nhảy sang ô tiếp theo). Giáo viên phải dùng chuột click từng ô rất chậm.
  - Khi nhập sai điểm (ví dụ nhập số 12 cho thang điểm 10), hệ thống chỉ báo lỗi bằng alert trình duyệt phi chuẩn thay vì Inline Error Validation màu đỏ.

### 1.3. Ngân hàng Đề & Khảo thí (Exam Bank & Testing)
- **Vị trí mã nguồn:** `src/app/admin/ngan-hang-de/`
- **Chức năng:** Lưu trữ ma trận đề thi, câu hỏi trắc nghiệm/tự luận và duyệt đề.
- **Vấn đề UI/UX:**
  - Trình soạn thảo công thức Toán học / Hóa học (LaTeX/KaTeX) thiếu khung xem trước thời gian thực (Live Preview Split Pane).

### 1.4. Hoạt động Trải nghiệm & Kỹ năng sống (Experiential Learning)
- **Vị trí mã nguồn:** `src/app/teacher/trai-nghiem/`
- **Chức năng:** Ghi nhận tham gia dã ngoại, hoạt động thiện nguyện, câu lạc bộ.
- **Vấn đề UI/UX:**
  - Upload ảnh minh chứng hoạt động không có thanh tiến trình (Progress Bar), người dùng không biết ảnh đã tải lên xong chưa.

### 1.5. Quản trị Phân quyền & Cấu hình Hệ thống (RBAC & Settings)
- **Vị trí mã nguồn:** `src/app/admin/phan-quyen/`, `src/app/admin/cau-hinh/`
- **Chức năng:** Quản lý tài khoản, vai trò (Roles), phân bổ giáo viên vào tổ bộ môn.
- **Vấn đề UI/UX:**
  - Ma trận phân quyền checkbox dạng lưới ma trận quá dày đặc, thiếu chức năng tìm kiếm quyền hoặc lọc theo nhóm chức năng.

---

## 2. BẢNG TỔNG HỢP KIẾN TRÚC TOÀN HỆ THỐNG VÀ ĐỀ XUẤT CHUẨN HÓA

| Phân hệ | Độ phức tạp | Tình trạng trùng lặp mã | Rủi ro UX chính | Ưu tiên chuẩn hóa |
|---|---|---|---|---|
| **Dự giờ & Chuyên môn** | Rất cao (>20k dòng) | Cao (Giữa Teacher & Admin) | Modal dài mất nút lưu, ma trận mất cột tên | **Sprint 1 (P0)** |
| **Hồ sơ Học sinh** | Cao (>8k dòng) | Rất cao (Nhân bản 4.8k dòng) | Tabs vỡ dòng, load eager 9 tab chậm | **Sprint 1 (P0)** |
| **Cố vấn Học tập** | Rất cao (4.3k dòng 1 file) | Trung bình | Form mất dữ liệu nháp, SOS mờ nhạt | **Sprint 1 (P0)** |
| **Dashboards** | Trung bình (1.7k dòng) | Thấp | Trùng selector năm học, teacher launcher | **Sprint 2 (P1)** |
| **Sổ điểm** | Cao (>5k dòng) | Trung bình | Thiếu phím mũi tên Excel điều hướng | **Sprint 2 (P1)** |
| **Khảo sát Tuyển sinh** | Trung bình | Thấp | Bàn phím ảo che form trên tablet | **Sprint 3 (P2)** |
| **Ngân hàng đề & Khảo thí** | Trung bình | Thấp | Thiếu preview công thức KaTeX song song | **Sprint 3 (P2)** |

---

## 3. KẾT LUẬN VÀ BƯỚC TIẾP THEO

Toàn bộ 5 tài liệu Audit Cấp 2 chuyên sâu đã hoàn tất, cung cấp đầy đủ:
1. Phân tích chi tiết từng file mã nguồn cụ thể và số dòng mã.
2. Xác định các lỗi trải nghiệm nghiêm trọng (P0: Button clipping, Unfrozen matrix columns, Lost form draft, Wrap tabs, Redundant selectors).
3. Đề xuất Wireframes ASCII trực quan cho từng màn hình.
4. Lộ trình Refactoring phân rã component để triệt tiêu nợ kỹ thuật (Tech Debt).

Giai đoạn Audit Cấp 2 đã hoàn tất toàn diện trên toàn bộ hệ thống SSM.
