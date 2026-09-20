# BẢN ĐỒ NGUỒN DỮ LIỆU (DATA SOURCE MAP)
## Quan Hệ Thực Thể Dữ Liệu Hỗ Trợ và Tích Hợp Hồ Sơ 360°

---

### 1. SƠ ĐỒ THỰC THỂ NGUỒN (DATABASE ENTITY RELATIONSHIP)

```
[Bảng Student] (Học sinh)
       │
       ├─► [Bảng LearningSupportTarget] (Hồ sơ hỗ trợ & tâm lý gốc)
       │         │
       │         ├─► [Bảng LearningSupportAssignment] (Phân công GV phụ trách)
       │         │         └─► [Bảng Teacher] & [Bảng Subject]
       │         │
       │         └─► [Bảng LearningSupportEvaluation] (Nhật ký tuần & tháng)
       │
       ├─► [Bảng StudentLearningCommitment] (Cam kết đầu vào & khảo sát)
       │
       └─► [Hồ sơ Học sinh 360°] (Hiển thị tóm tắt Read-only)
```

---

### 2. LIÊN KẾT MỘT CHIỀU VÀO HỒ SƠ 360°

* Hồ sơ học sinh 360° chỉ đọc tổng hợp:
  * `Có hỗ trợ đang hoạt động không?` (Có / Không)
  * `Loại hỗ trợ:` Học tập / Tâm lý / Cam kết đầu vào
  * `Trạng thái hiện tại:` Đang theo dõi / Cần chú ý / Đã hoàn thành
  * `Đường dẫn xem chi tiết:` Chuyển hướng về phân hệ Hỗ trợ học sinh chuyên biệt.\n