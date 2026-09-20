# 12. RELEASE NOTES & DEPLOYMENT RUNBOOK — BATCH #02
## THÔNG BÁO PHÁT HÀNH BẢN VÁ SEMVER v1.0.2

**Mã phiên bản:** `v1.0.2`  
**Loại phát hành:** Patch Release (Cải tiến trải nghiệm bộ lọc & Dọn nợ kỹ thuật)  
**Thời gian phát hành:** 20/09/2026 — 21:30  
**Trạng thái triển khai:** **RELEASE SUCCESSFUL & SMOKE TEST PASSED**  

---

### 1. NỘI DUNG NÂNG CẤP CHÍNH
1. **Ghi nhớ bộ lọc lớp Cố vấn học tập (IMP-004):**
   - Giáo viên chủ nhiệm và giáo viên bộ môn khi chuyển đổi giữa các học sinh hoặc tải lại trang sẽ không còn bị mất lớp đang chọn.
   - Trạng thái được đồng bộ tự động vào URL giúp dễ dàng chia sẻ hoặc đánh dấu trang.
2. **Dọn dẹp mã CSS layout & Chuẩn hóa Accessibility (IMP-005):**
   - Khắc phục xung đột CSS focus-visible, tối ưu hóa kích thước bundle và bảo đảm độ tương phản viền tiêu cự chuẩn cho bàn phím.
3. **Bộ kiểm thử tự động ma trận đề thi GK1 (IMP-006):**
   - Tự động hóa khâu thẩm định 18 ma trận đề thi cho kỳ thi Giữa học kỳ 1, loại bỏ hoàn toàn nguy cơ lệch điểm đề thi.

---

### 2. KẾT QUẢ SMOKE TEST SAU DEPLOY (POST-DEPLOY SMOKE TEST)
- Endpoint kiểm tra sức khỏe `/api/health` $\rightarrow$ **200 OK** (14ms).
- Màn hình Cố vấn học tập $\rightarrow$ Lọc lớp và chuyển trang giữ nguyên trạng thái.
- Phân hệ Khảo thí $\rightarrow$ Ma trận đề thi tính toán chính xác 10.0 điểm.
- Không phát sinh sự cố P0/P1.

---

### 3. ĐIỂM THU HỒI DỰ PHÒNG (ROLLBACK POINT)
- Điểm thu hồi: Git tag `v1.0.1`.
- Thời gian thực thi rollback nếu cần: < 2 phút.
- Kết quả: **Rollback NOT REQUIRED**.
