# 09. APPROVED IMPROVEMENT BATCH PROPOSAL — BATCH #01
## ĐỀ XUẤT PHẠM VI GÓI CẢI TIẾN NHỎ ĐẦU TIÊN (SEMVER v1.0.1-PATCH)

**Mã bản phát hành:** `v1.0.1-PATCH`  
**Trạng thái hiện tại:** **ĐÃ HOÀN TẤT ĐẶC TẢ — CHỜ PHÊ DUYỆT ĐỂ TRIỂN KHAI (WAITING FOR APPROVAL)**  

---

### MỤC 1: HỖ TRỢ PHÍM ĐIỀU HƯỚNG NHẬP ĐIỂM KHẢO THÍ (KEYBOARD NAVIGATION)
- **Mã hạng mục:** `BATCH01-FEAT-01`
- **Vấn đề thực tế:** Giáo viên phải dùng chuột click từng ô nhập điểm cho 35–40 học sinh/lớp.
- **Bằng chứng (Evidence):** 11 phản hồi từ giáo viên bộ môn tại Riverside, Central, Hội An; thời gian nhập hiện tại: ~4.5 phút/lớp.
- **Đối tượng thụ hưởng:** Toàn bộ 648 giáo viên bộ môn 5 cơ sở trường.
- **Phân hệ bị ảnh hưởng:** Phân hệ Khảo thí & Phân tích chất lượng (`src/app/teacher/input-assessments/`).
- **Căn nguyên gốc rễ:** Component ô nhập điểm thiếu keyboard listener điều hướng.
- **Giải pháp kỹ thuật đề xuất:**
  - Lắng nghe sự kiện `onKeyDown` trên input điểm: Phím `Enter` hoặc phím mũi tên xuống $ightarrow$ Focus vào ô nhập điểm của học sinh tiếp theo; Phím mũi tên lên $ightarrow$ Focus vào ô học sinh phía trên.
  - Tái sử dụng 100% component `Input` và logic tính điểm hiện hữu.
  - Tuyệt đối không thay đổi API, Database, hay Business validation logic.
- **Tiêu chí nghiệm thu (Acceptance Criteria):**
  - [ ] Giáo viên có thể nhập điểm liên tục cho toàn bộ danh sách lớp bằng bàn phím mà không cần chạm chuột.
  - [ ] Điểm số nhập vào tự động được kiểm tra tính hợp lệ [0.0 - 10.0] tức thời.
  - [ ] Không phát sinh lỗi hồi quy trên các màn hình khác.
- **Chỉ số đo lường trước (Before):** Thời gian nhập điểm trung bình: **4.5 phút / lớp 35 học sinh**.
- **Chỉ số kỳ vọng sau phát hành (Expected):** Thời gian giảm xuống **< 2.5 phút / lớp 35 học sinh** (tiết kiệm > 40% thời gian).
- **Kế hoạch Rollback:** Revert commit nhánh patch trong vòng < 2 phút.

---

### MỤC 2: TỐI ƯU HÓA TẢI ẢNH MINH CHỨNG HOẠT ĐỘNG TRẢI NGHIỆM
- **Mã hạng mục:** `BATCH01-FEAT-02`
- **Vấn đề thực tế:** Mở trang chi tiết hoạt động ngoại khóa có 20 ảnh tải chậm trên mạng di động 4G tại sân bãi.
- **Bằng chứng (Evidence):** 5 phản ánh từ giáo viên phụ trách tại cơ sở Hill; dung lượng ảnh gốc từ 5-8 MB/ảnh.
- **Đối tượng thụ hưởng:** 120 giáo viên phụ trách hoạt động trải nghiệm và phụ huynh xem ảnh hoạt động.
- **Phân hệ bị ảnh hưởng:** Phân hệ Hoạt động Trải nghiệm (`src/app/teacher/experiential-activities/`).
- **Căn nguyên gốc rễ:** Thẻ hiển thị ảnh tải nguyên ảnh gốc (full-resolution) và tải đồng loạt thay vì tải lười.
- **Giải pháp kỹ thuật đề xuất:**
  - Bổ sung thuộc tính `loading="lazy"` và kích thước hiển thị thumbnail chuẩn (`max-width: 800px`).
  - Không thay đổi cấu trúc bảng CSDL hay file storage.
- **Tiêu chí nghiệm thu (Acceptance Criteria):**
  - [ ] Các ảnh ngoài màn hình cuộn chỉ tải khi người dùng cuộn tới.
  - [ ] Thời gian tải trang hoạt động trên mạng 4G giảm từ 3.2s xuống dưới 1.5s.
- **Chỉ số đo lường trước (Before):** Tốc độ tải trang trên mạng di động 4G: **3.2 giây**.
- **Chỉ số kỳ vọng sau phát hành (Expected):** Tốc độ tải trang giảm xuống **< 1.5 giây**.
- **Kế hoạch Rollback:** Revert commit trong vòng < 2 phút.

---

### MỤC 3: MỞ RỘNG BỘ TEST TỰ ĐỘNG CHO QUY TRÌNH KHẢO THÍ (TD-03)
- **Mã hạng mục:** `BATCH01-TECH-03`
- **Vấn đề & Bằng chứng:** Nợ kỹ thuật TD-03 được phê duyệt; phục vụ kỳ thi Giữa kỳ 1 vào cuối tháng 10.
- **Giải pháp:** Viết bổ sung bộ integration test tự động cho luồng tính toán GAP và ma trận đề thi.
- **Tiêu chí nghiệm thu:** Bộ test chạy màu xanh 100%, thời gian chạy test < 15 giây.
