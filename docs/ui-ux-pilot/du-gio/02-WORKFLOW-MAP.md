# SSM PILOT: WORKFLOW MAP & BUSINESS INVARIANTS
**Phân hệ:** Dự giờ và Phát triển Chuyên môn  
**Nguyên tắc:** Bảo toàn 100% quy trình nghiệp vụ đã được vận hành tại Sky-Line  

---

## 1. SƠ ĐỒ LUỒNG NGHIỆP VỤ BẢO TOÀN

```
[ GVBM Mở tiết dạy ] ──────► [ Kiểm tra Điều kiện ] ──────► [ GV khác Đăng ký dự ]
        │                    (≤2 tiết/tháng, TKB hợp lệ)      (Tối đa 4 người/tiết)
        │                                                              │
        ▼                                                              ▼
[ GV Xin dự giờ ]                                             [ TTCM Phê duyệt Lịch ]
        │                                                              │
        ▼                                                              ▼
[ TTCM / BGH Đột xuất ] ─────────────────────────────────────► [ TIẾN HÀNH DỰ GIỜ ]
                                                                       │
                                                                       ▼
[ GV Dạy Nhận Kết Quả ] ◄── [ Ghi Nhận Hồ Sơ ] ◄── [ TTCM Duyệt ] ◄── [ Chấm 11 Tiêu Chí + AI ]
```

---

## 2. DANH MỤC 6 QUY TẮC NGHIỆP VỤ BẤT BIẾN (INVARIANTS)

1. **Giới hạn 4 Giáo viên / Tiết:** Một tiết dạy mở tối đa 4 giáo viên đăng ký tham gia dự. UI hiển thị rõ: `${count}/4 người đã đăng ký`, tự động khóa khi đủ 4/4.
2. **Định mức Số tiết Dự giờ:** Quy định tối đa 2 tiết/tháng/GV được thể hiện trong ngữ cảnh cá nhân (`Tháng này: 1/2 lượt`).
3. **Điều kiện Tính Lượt Dự giờ Hoàn thành:** Chỉ những lượt dự giờ đã hoàn thành chấm điểm phiếu đánh giá và được xác nhận mới được tính vào chỉ tiêu thi đua.
4. **Quy tắc Dự giờ Đột xuất (Surprise Observation):** Chỉ mở quyền tạo tiết dự giờ đột xuất cho: TTCM, QLCM, TBP, GĐCS và Admin. Giáo viên thông thường tuyệt đối không hiển thị nút này.
5. **Độc lập Nghiệp vụ Mầm non & GVNN:** Phân hệ Mầm non áp dụng thang 5 tiêu chí (10 điểm), GVNN áp dụng Walkthrough Checklist riêng biệt; không ép dùng chung form của K12.
6. **Tách biệt Nghiệp vụ Chào cờ & Làm việc tại Cơ sở:** Hoạt động Chào cờ đầu tuần và Làm việc cơ sở không tính vào điểm 11 tiêu chí dự giờ sư phạm.
