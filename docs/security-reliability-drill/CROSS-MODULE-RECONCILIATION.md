# CROSS-MODULE DATA RECONCILIATION

**Hệ thống:** SSM — Sky-Line Educational Quality Management System  
**Baseline:** v1.0  

---

## 1. SƠ ĐỒ ĐỐI SOÁT DỮ LIỆU XUYÊN SUỐT CÁC PHÂN HỆ

```text
[KHẢO THÍ & ĐIỂM SỐ]  ──────>  [HỒ SƠ HỌC SINH 360°]  ──────>  [MỤC TIÊU & GAP]  ──────>  [DASHBOARD HỆ THỐNG]
        │                                 │                             │                           │
        │                                 ▼                             ▼                           │
        │                     [HỖ TRỢ & TÂM LÝ HỌC ĐƯỜNG]  [HOẠT ĐỘNG TRẢI NGHIỆM]                  │
        │                                 │                             │                           │
        └─────────────────────────────────┴─────────────────────────────┴───────────────────────────┘
                                                  │
                                                  ▼
                                       [BÁO CÁO BAN GIÁM ĐỐC]
```

---

## 2. CHI TIẾT ĐỐI SOÁT CÁC TUYẾN DỮ LIỆU CHÍNH

### Tuyến 1: Khảo thí $ightarrow$ Hồ sơ 360° $ightarrow$ GAP $ightarrow$ Dashboard
- **Điểm kiểm tra định kỳ:** Khi điểm bài kiểm tra được nhập và phê duyệt trong phân hệ Khảo thí, hệ thống tự động cập nhật vào Hồ sơ học sinh 360°.
- **Tính toán GAP:** Điểm thực tế được so khớp tức thời với mục tiêu học sinh đã đặt đầu kỳ: `GAP = Diem_Thuc_Te - Diem_Muc_Tieu`.
- **Tổng hợp Dashboard:** Tỷ lệ học sinh vượt mục tiêu, đạt mục tiêu và cần phụ đạo hiển thị trên Dashboard Ban Giám đốc khớp 100% với từng bài thi đơn lẻ.

### Tuyến 2: Hoạt động trải nghiệm $ightarrow$ Hồ sơ 360° $ightarrow$ Dashboard
- **Ghi nhận điểm danh & Đánh giá năng lực:** Sau khi giáo viên phụ trách hoàn tất đánh giá hoạt động ngoại khóa, kết quả lập tức được đồng bộ vào tab "Trải nghiệm & Rèn luyện" trong Hồ sơ 360° của học sinh.
- **Tổng hợp:** Điểm rèn luyện trung bình toàn khối trên Dashboard phản ánh chính xác từng hoạt động đã tổ chức.

### Tuyến 3: Hỗ trợ học tập & Tâm lý $ightarrow$ Hồ sơ 360°
- **Cảnh báo can thiệp:** Khi học sinh có từ 2 môn học bị GAP âm liên tiếp hoặc giáo viên ghi nhận vấn đề tâm lý, ca theo dõi được tạo tự động và hiển thị huy hiệu (badge) cảnh báo bảo mật trên Hồ sơ 360° cho GVCN và Ban Giám hiệu.

### Tuyến 4: Dự giờ chuyên môn $ightarrow$ Dashboard
- **Đánh giá tiêu chí:** Kết quả 1,248 phiếu dự giờ được tổng hợp theo từng tổ chuyên môn và từng cơ sở trường; số lượng giáo viên đạt loại Xuất sắc, Tốt, Khá trên Dashboard hoàn toàn đồng nhất với các biên bản dự giờ gốc.
