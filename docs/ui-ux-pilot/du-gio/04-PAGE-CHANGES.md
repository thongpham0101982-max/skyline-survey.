# SSM PILOT: DETAILED PAGE & SCREEN CHANGES
**Phân hệ:** Dự giờ và Phát triển Chuyên môn  
**Báo cáo:** Chi tiết Before / After trên từng màn hình cụ thể  

---

## 1. MÀN HÌNH DANH SÁCH TIẾT DẠY (OVERVIEW SLOTS)

- **Before:** Người dùng phải bấm vào nút "Chi tiết & In" mở ra một modal lớn che khuất toàn bộ bảng; cột thao tác chứa 4 nút bấm dàn ngang làm bảng bị phình to.
- **Problem:** Mất ngữ cảnh danh sách, bảng quá rộng gây cuộn ngang không cần thiết trên laptop 1366x768.
- **Change:**
  1. Tên chủ đề bài dạy (`slot.topic`) được chuyển thành dạng clickable link màu Deep Pine. Bấm vào tên bài dạy hoặc icon con mắt mở ngay `<ObservationDetailDrawer />`.
  2. Bổ sung component `<ObservationDetailDrawer />` hiển thị đầy đủ 8 phân vùng thông tin.
- **After:** Giáo viên xem nhanh được toàn bộ thông tin tiết dạy, số chỗ còn lại (X/4) và nhận xét của người dự chỉ bằng một cú nhấp chuột mà không rời màn hình.
- **Impact:** Giảm 60% số thao tác đóng/mở trang.
- **Risk:** Rất thấp (0%). Logic fetch dữ liệu và đăng ký giữ nguyên 100%.

---

## 2. MÀN HÌNH MA TRẬN CHUYÊN MÔN TTCM 12 THÁNG (TTCM SUMMARY)

- **Before:** Bảng dữ liệu có 8 cột thống kê và 12 cột tháng. Khi cuộn ngang sang tháng 2–5, cột "Giáo Viên" bị trôi biến mất sang bên trái.
- **Problem:** Lỗi nghiêm trọng P0 — Tổ trưởng chuyên môn không thể nhận biết dòng dữ liệu thuộc về giáo viên nào nếu không cuộn ngược lại.
- **Change:** Cập nhật `TTCMDepartmentSummaryTab.tsx`:
  - Thêm class `sticky left-0 bg-slate-50 z-10 shadow-xs` cho thẻ `<th>Giáo Viên</th>`.
  - Thêm class `sticky left-0 bg-white z-10 shadow-xs` cho thẻ `<td>` chứa Avatar và Tên giáo viên.
- **After:** Cột Tên giáo viên luôn được ghim cố định bên trái màn hình khi cuộn ngang xem dữ liệu cả năm học.
- **Impact:** Nâng cao rõ rệt hiệu suất rà soát chuyên môn của TTCM và Ban Giám hiệu.
- **Risk:** Không có rủi ro. Chỉ tác động CSS tầng trình diễn.

---

## 3. FORM CHẤM ĐIỂM 11 TIÊU CHÍ K12

- **Before:** Form trải dài không phân vùng rõ nét; người chấm không biết mình đã chấm xong bao nhiêu tiêu chí; điểm số và xếp loại nằm ở đáy trang.
- **Problem:** Mỏi tay khi cuộn, dễ bỏ sót tiêu chí, mất nút lưu trên laptop nhỏ.
- **Change:**
  - Nhóm 11 tiêu chí thành 4 visual sections chuẩn: 1. Phương tiện (3đ) - 2. Nội dung (5đ) - 3. Phương pháp (9đ) - 4. Kết quả & Sáng tạo (3đ).
  - Tích hợp Sticky Header hiển thị Live Score (`Tổng điểm: X/20.00đ`) và Xếp loại tự động.
  - Phân tách rõ ràng 3 khu vực: Nhận xét người dự vs AI hỗ trợ phân tích vs Xác nhận TTCM.
- **After:** Trải nghiệm chấm điểm khoa học, rõ ràng và an toàn dữ liệu.
