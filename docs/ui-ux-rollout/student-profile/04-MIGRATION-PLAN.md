# KẾ HOẠCH DI CHUYỂN: HỒ SƠ HỌC SINH (MIGRATION PLAN)
## Lộ trình Triển khai Kỹ thuật Chi tiết cho Wave 1 — Sẵn sàng Thực thi

---

### 1. HIỆN TRẠNG VÀ MỤC TIÊU ĐẠT ĐƯỢC

* **Hiện trạng:** Tệp `client.tsx` (2,578 dòng) và `teacher/.../page.tsx` (2,283 dòng) hoạt động ổn định về logic nhưng giao diện nguyên khối, nhiều mã màu cũ không đồng bộ, chưa áp dụng thư viện Shared Components, bố cục gây chật chội trên laptop 1366x768.
* **Mục tiêu Wave 1:**
  1. Tích hợp `<AppShell>` và `<PageContainer>` chuẩn hóa không gian trang.
  2. Thay thế bộ chọn bằng `<FilterBar>` và `<Select>` chuẩn.
  3. Thay thế các nút thao tác bằng `<Button>` (Deep Pine).
  4. Chuẩn hóa nhãn học sinh bằng `<StatusBadge>` và `<Badge>`.
  5. Thay thế các trạng thái chờ và rỗng bằng `<LoadingState>` và `<EmptyState>`.
  6. Tối ưu bố cục 2 cột (Danh sách HS + Chi tiết HS) với tính năng thu gọn/toàn màn hình trên laptop 1366x768.
  7. **Bảo tồn 100% logic:** Giữ nguyên các hàm upload/delete avatar, html2pdf download, router print window, và các truy vấn dữ liệu 9 tab.

---

### 2. THỨ TỰ 10 BƯỚC THỰC THI KỸ THUẬT (IMPLEMENTATION SEQUENCE)

Khi nhận được lệnh triển khai, quá trình lập trình sẽ thực hiện theo 10 bước khép kín:

```
[BƯỚC 1: App Shell & Container] ────> Bọc khung trang trong <PageContainer>
                 │
[BƯỚC 2: Page Header] ──────────────> Thay Header bằng PageHeader chuẩn, tích hợp nút Print All
                 │
[BƯỚC 3: Unified FilterBar] ────────> Đưa các bộ lọc Năm học/Cơ sở/Khối/Lớp vào FilterBar chuẩn
                 │
[BƯỚC 4: Left Student Sidebar] ─────> Chuẩn hóa danh sách thẻ học sinh, ô tìm kiếm và trạng thái active
                 │
[BƯỚC 5: Student Profile Header] ───> Chuẩn hóa Avatar, thông tin cá nhân, cụm nút [< Trước] [Sau >]
                 │
[BƯỚC 6: Action Buttons Toolbar] ───> Thay thế nút Tải PDF, In A4, Toàn màn hình bằng <Button>
                 │
[BƯỚC 7: Standardized 9-Tab Bar] ───> Nâng cấp thanh 9 tab với Deep Pine highlight và cuộn mượt
                 │
[BƯỚC 8: Feedback States] ──────────> Tích hợp <LoadingSpinner>, <Skeleton> và <EmptyState>
                 │
[BƯỚC 9: Laptop Responsive Pass] ───> Kiểm tra và tinh chỉnh độ co giãn trên 1366x768 và 1280x800
                 │
[BƯỚC 10: Print Template Sync] ─────> Kiểm tra tương thích với màn hình in ấn A4 (print_client)
```

---

### 3. MA TRẬN RỦI RO NGHIỆP VỤ VÀ PHƯƠNG ÁN BẢO VỆ (RISK MITIGATION)

| Rủi ro tiềm ẩn | Mức độ | Phương án phòng ngừa & Xử lý |
| :--- | :---: | :--- |
| **Lỗi thư viện xuất PDF (`html2pdf.js`)** do thay đổi cấu trúc DOM của vùng chứa thẻ A4 | **Cao** | Giữ nguyên vẹn định danh DOM `id="a4-student-portfolio"` và cấu trúc CSS in ấn gốc; duy trì cơ chế fallback mở trang in trình duyệt tự động khi thư viện PDF lỗi |
| **Lỗi tải ảnh đại diện** do thay đổi thẻ `<input type="file">` | **Trung bình** | Sử dụng nguyên vẹn ref `fileInputRef` và hàm `handleAvatarUpload` kết nối đến `/api/student-photos/${selectedStudentId}` |
| **Lệch điểm hoặc sai môn trong Bảng điểm MOET (Tab 3)** | **Nghiêm trọng** | Không can thiệp vào logic tính toán hoặc render dữ liệu bảng điểm; chỉ bọc viền và chuẩn hóa typography |
| **Mất ngữ cảnh học sinh khi đổi bộ lọc** | **Thấp** | Giữ nguyên logic tự động chọn học sinh đầu tiên trong danh sách kết quả lọc |

---

### 4. BỘ 15 TEST CASES KIỂM THỬ XÁC NHẬN (VERIFICATION SUITE)

1. **TC-SP-01:** Đăng nhập tài khoản Admin/KT_DBCL, vào trang `/admin/ho-so-hoc-sinh`, xác nhận trang tải đầy đủ dữ liệu.
2. **TC-SP-02:** Thay đổi Cơ sở, Khối, Lớp → Xác nhận danh sách học sinh tự động cập nhật chính xác.
3. **TC-SP-03:** Nhập từ khóa tìm kiếm tên/mã học sinh → Xác nhận danh sách lọc tức thì không giật lag.
4. **TC-SP-04:** Bấm chọn học sinh bất kỳ → Xác nhận thông tin Header và nội dung Tab cập nhật đúng học sinh đó.
5. **TC-SP-05:** Bấm nút `[Học sinh tiếp theo >]` và `[< Học sinh trước]` → Xác nhận chuyển đổi tuần tự mượt mà.
6. **TC-SP-06:** Lần lượt nhấp qua toàn bộ 9 Tab:
   * Tab 1 (`cv`): Hiển thị đầy đủ thông tin gia đình, sức khỏe, liên lạc.
   * Tab 2 (`competencies`): Biểu đồ Radar 6 miền hiển thị đúng dữ liệu.
   * Tab 3 (`academic`): Bảng điểm MOET hiển thị đủ cột điểm HK1, HK2, Cả năm.
   * Tab 4 (`entrance`): Hiển thị đúng 3 sub-tab kết quả khảo sát.
   * Tab 5 (`achievements`): Danh sách bằng khen/huy chương chính xác.
   * Tab 6-9 (`orientation`, `projects`, `comments`, `support`): Dữ liệu đầy đủ.
7. **TC-SP-07:** Tải lên ảnh chân dung học sinh mới (JPG/PNG < 5MB) → Xác nhận ảnh đại diện cập nhật tức thì.
8. **TC-SP-08:** Bấm nút "Lưu file PDF" → Xác nhận tệp PDF được tải về máy tính với đầy đủ nội dung.
9. **TC-SP-09:** Bấm nút "In / Lưu PDF Trình duyệt" → Xác nhận cửa sổ in ấn A4 mở ra với chế độ autoprint.
10. **TC-SP-10:** Bấm nút "In Cả Lớp" → Xác nhận cửa sổ in toàn bộ học sinh trong lớp mở ra chính xác.
11. **TC-SP-11:** Bấm nút "Toàn màn hình / Thu gọn" → Xác nhận ẩn/hiện thanh danh sách học sinh bên trái trơn tru.
12. **TC-SP-12:** Đăng nhập tài khoản Giáo viên Chủ nhiệm, vào `/teacher/ho-so-hoc-sinh` → Xác nhận chỉ thấy học sinh lớp mình.
13. **TC-SP-13:** Kiểm tra hiển thị trên màn hình laptop 1366 × 768 → Xác nhận không bị vỡ giao diện, không tràn ngang.
14. **TC-SP-14:** Kiểm tra kiểm thử kiểu dữ liệu TypeScript (`tsc --noEmit`) → Xác nhận không phát sinh lỗi.
15. **TC-SP-15:** Kiểm tra tài khoản không có quyền → Xác nhận thông báo "Quyền truy cập hạn chế" hiển thị chuẩn.

---

### 5. TRẠNG THÁI HIỆN TẠI VÀ ĐIỂM DỪNG (CHECKPOINT)

* **Khám phá (Discovery):** ĐÃ HOÀN TẤT
* **Bản đồ Phân quyền (Role Matrix):** ĐÃ HOÀN TẤT
* **Sơ đồ Trang (Page Map):** ĐÃ HOÀN TẤT
* **Đối chiếu Thành phần (Component Map):** ĐÃ HOÀN TẤT
* **Kế hoạch Triển khai (Migration Plan):** ĐÃ HOÀN TẤT
* **Thực thi Mã nguồn (Implementation):** **CHƯA BẮT ĐẦU (NOT STARTED)**

> [!IMPORTANT]
> **ĐIỂM DỪNG BẮT BUỘC:** Toàn bộ khung chuẩn hóa Rollout Framework và Kế hoạch di chuyển Wave 1 (Hồ sơ học sinh) đã được thiết lập hoàn chỉnh. Theo nguyên tắc cốt lõi, hệ thống DỪNG LẠI tại đây và chờ lệnh phê duyệt chính thức trước khi bắt đầu sửa đổi mã nguồn.\n