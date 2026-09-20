# MÔ HÌNH DÒNG THỜI GIAN THEO DÕI (TIMELINE MODEL)
## Kiến Trúc Trực Quan Hóa Tiến Trình Thay Thế Bảng Nhập Điểm

---

### 1. NGUYÊN TẮC THIẾT KẾ TIMELINE

* **Trục dọc thời gian liên tục (Continuous Chronological Axis):** Sắp xếp từ sự kiện khởi tạo đến các đợt theo dõi tuần, đánh giá tháng và quyết định kết thúc.
* **Biểu tượng nhận diện trực quan:**
  * 🌟 **Khởi tạo:** Biểu tượng ngôi sao Deep Pine.
  * ⏱️ **Theo dõi tuần:** Biểu tượng đồng hồ cát với nhãn tiến triển.
  * 📅 **Đánh giá tháng:** Biểu tượng lịch màu chàm với phần nhận định đa chiều.
  * ✅ **Chấm dứt:** Biểu tượng dấu kiểm xanh lá xác nhận hoàn thành mục tiêu.
* **Không làm rối mắt người dùng:** Tóm tắt ngắn gọn nội dung quan sát; chi tiết chuyên môn chỉ mở ra khi bấm xem thêm.

---

### 2. CẤU TRÚC MỘT NÚT SỰ KIỆN (TIMELINE NODE)

```
[Icon Cột Mốc] ─── [Hộp Thông Tin Sự Kiện]
                     ├─ Tiêu đề: Đánh giá tháng 10 / Theo dõi Tuần 6
                     ├─ Ngày ghi nhận: 25/10/2026 • Người ghi: Cô Lan (Tâm lý)
                     ├─ Huy hiệu trạng thái: [Tiến triển tốt]
                     ├─ Tóm tắt diễn biến: Học sinh đã tự tin phát biểu, tham gia hoạt động nhóm
                     └─ [Hành động tuần tới]: Tiếp tục động viên và giao nhiệm vụ phó nhóm
```\n