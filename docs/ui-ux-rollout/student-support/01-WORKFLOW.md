# QUY TRÌNH NGHIỆP VỤ HỖ TRỢ & TÂM LÝ (WORKFLOW)
## Chu Trình 6 Giai Đoạn Từ Tiếp Nhận Đến Chuyển Tiếp Năm Học

---

### 1. SƠ ĐỒ CHU TRÌNH TỔNG QUÁT

```mermaid
sequenceDiagram
    autonumber
    actor HS as Học sinh / Nguồn tiếp nhận
    actor GV as GVCN / GVBM / Chuyên viên Tâm lý
    participant SYS as Hệ thống SSM
    participant QL as QLCM / Giám đốc Cơ sở

    Note over HS, SYS: GIAI ĐOẠN 1: KHỞI TẠO ĐỐI TƯỢNG
    alt Từ Khảo sát đầu vào
        SYS->>SYS: Tự động sync hồ sơ đạt tiêu chí vào danh sách
    else Từ Năm trước chuyển sang
        SYS->>SYS: Tự động kế thừa hồ sơ ACTIVE từ năm học trước
    else Phát sinh trong năm
        GV->>SYS: Tạo phiếu đề xuất hỗ trợ (Học tập hoặc Tâm lý)
    end

    Note over GV, SYS: GIAI ĐOẠN 2: PHÂN CÔNG & THIẾT LẬP KẾ HOẠCH
    SYS->>GV: Gán Giáo viên phụ trách chính & giáo viên phối hợp
    GV->>SYS: Xác định mục tiêu hỗ trợ, phương pháp và thời gian

    Note over GV, SYS: GIAI ĐOẠN 3: THEO DÕI ĐỊNH KỲ THEO TUẦN
    loop Hàng tuần
        GV->>SYS: Nhập phiếu tuần (Quan sát, tiến triển, khó khăn phát sinh)
        SYS-->>SYS: Cập nhật trục Timeline của học sinh
    end

    Note over GV, QL: GIAI ĐOẠN 4: ĐÁNH GIÁ ĐỊNH KỲ THEO THÁNG
    loop Hàng tháng
        GV->>SYS: Lập Đánh giá tháng (Tổng kết diễn biến, giải pháp đã làm)
        GV->>SYS: Chọn kết luận (Tiếp tục / Điều chỉnh / Đề xuất chấm dứt)
    end

    Note over GV, QL: GIAI ĐOẠN 5: CHẤM DỨT THEO DÕI (NẾU ĐẠT)
    opt Đạt mục tiêu hỗ trợ
        GV->>SYS: Gửi đề xuất chấm dứt theo dõi kèm kết luận
        QL->>SYS: Phê duyệt kết thúc hồ sơ (Chuyển sang TERMINATED)
    end

    Note over SYS, QL: GIAI ĐOẠN 6: CHUYỂN TIẾP CUỐI NĂM HỌC
    SYS->>SYS: Quét toàn bộ hồ sơ cuối năm
    alt Còn theo dõi (ACTIVE) & Không chuyển trường
        SYS->>SYS: Tự động chuyển tiếp hồ sơ sang năm học mới
    else Đã chấm dứt (TERMINATED) hoặc Chuyển trường
        SYS->>SYS: Đóng hồ sơ, lưu trữ lịch sử, không chuyển tiếp
    end
```

---

### 2. QUY TẮC NGHIỆP VỤ TỪNG GIAI ĐOẠN

1. **Khởi tạo đối tượng:**
   * Phải lưu trữ rõ nguồn gốc: `ADMISSION` (Khảo sát đầu vào), `TRANSFERRED` (Năm cũ chuyển sang), `GVCN`, `GVBM`, hoặc `TAM_LY`.
   * Kiểm tra trùng lặp: Một học sinh không được mở cùng lúc 2 hồ sơ cùng loại hỗ trợ trong cùng một năm học.
2. **Theo dõi tuần (Weekly Follow-up):**
   * Phiếu tuần ngắn gọn, ghi nhận nhanh hiện trạng, không bắt buộc nhập lại lý do ban đầu.
3. **Đánh giá tháng (Monthly Review):**
   * Là cột mốc quan trọng để rà soát hiệu quả can thiệp, có kết luận rõ ràng và người chịu trách nhiệm.
4. **Chấm dứt theo dõi:**
   * Bắt buộc có ngày kết thúc, kết luận đánh giá và người phê duyệt có thẩm quyền. Hồ sơ không bị xóa mà lưu trữ vĩnh viễn trong lịch sử.\n