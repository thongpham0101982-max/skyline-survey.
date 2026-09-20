# KIỂM THỬ HỒI QUY DỮ LIỆU (DATA REGRESSION REPORT)
## Đối Soát Dữ Liệu Trước và Sau Khi Triển Khai Wave 2

---

### 1. DANH MỤC ĐỐI SOÁT

* **Tổng số bản ghi mục tiêu (`StudentGoal`):** Bảo toàn 100%, không mất mát hoặc biến đổi giá trị `targetText`.
* **Trọng số nhóm mục tiêu:** Trọng số các khối 1-5 và 6-12 giữ nguyên chuẩn.
* **Lịch sử xin mở phiếu (`StudentGoalAdjustmentRequest`):** Giữ nguyên toàn bộ các bản ghi đã gửi từ trước.
* **Hợp đồng API:** Giữ nguyên 100% request/response format của các endpoint `/api/advisory/*`.\n