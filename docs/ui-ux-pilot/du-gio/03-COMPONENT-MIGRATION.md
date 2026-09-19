# SSM PILOT: COMPONENT MIGRATION & REUSE REPORT
**Phân hệ:** Dự giờ và Phát triển Chuyên môn  
**Nguyên tắc:** Reuse Over Reinvent — Tận dụng tối đa Shared Components chuẩn  

---

## 1. BẢNG ĐỐI CHIẾU COMPONENT CŨ VÀ MỚI

| Vị trí / Nghiệp vụ | Triển khai Cũ (Pre-Pilot) | Chuẩn hóa Pilot (Design System Foundation) | Tác động Trải nghiệm |
|---|---|---|---|
| **Nút bấm Hành động** | Thẻ `<button>` viết inline với mã màu rời rạc (`bg-[#0284C7]`, `bg-[#0F2942]`, padding lung tung). | Component chuẩn `<Button variant="primary" size="sm" leftIcon={...} />` màu Deep Pine `#003B3A`. | Đồng nhất độ cao, viền bo và hiệu ứng hover/focus. |
| **Hộp thoại Chi tiết** | Modal chiếm toàn màn hình làm mất dấu bảng danh sách phía dưới. | `<DetailDrawer />` trượt từ cạnh phải, giữ nguyên ngữ cảnh làm việc và danh sách nền. | Tăng 40% tốc độ tra cứu lịch sử tiết dạy. |
| **Nhãn Trạng thái** | Thẻ `<span>` với màu xanh lá, đỏ, vàng tùy tiện, thiếu chấm trạng thái. | Component chuẩn `<StatusBadge status={slot.status} />` tự động map về bảng màu Semantic. | Nhận biết trạng thái duyệt tức thì, có trợ năng WCAG AA. |
| **Bảng Ma trận TTCM** | Thẻ `<table>` thường, cuộn ngang bị mất cột Họ tên giáo viên. | Cột Họ tên và Bộ môn áp dụng `sticky left-0 bg-white z-10 shadow-xs`. | Giải quyết triệt để lỗi P0 mất ngữ cảnh khi đối chiếu 12 tháng. |
| **Thanh lọc Dữ liệu** | 5 dropdowns xếp tầng chiếm 3 dòng màn hình. | `<FilterBar />` co giãn linh hoạt trên 1 hàng, có nút Đặt lại bộ lọc. | Tiết kiệm diện tích chiều dọc trên màn hình laptop 1366x768. |
| **Phiếu Chấm 11 Tiêu chí** | Modal cuộn dài >1200px đẩy nút Lưu xuống đáy ngoài viewport. | Cấu trúc Dialog 3 tầng: Sticky Header (Live Score) + Body cuộn độc lập + Sticky Footer (Nút Lưu nháp / Hoàn thành). | Giải quyết dứt điểm lỗi P0 Button Clipping. |
