# BẢN ĐỒ NGUỒN DỮ LIỆU (DATA SOURCE MAP)
## Mối Quan Hệ Giữa Mục Tiêu, Điểm Số Thực Tế và Hồ Sơ Học Sinh 360°

---

### 1. SƠ ĐỒ LIÊN KẾT THỰC THỂ (ENTITY RELATIONSHIP)

```
[Bảng Student] (Thông tin nhân thân, Lớp, Cơ sở)
       │
       ├─► [Bảng StudentGoal] (Mục tiêu K12 của HS, Trọng số, Text thô)
       │         │
       │         ├─► [Bảng StudentGoalAction] (Hành động nhỏ hàng tuần)
       │         └─► [Bảng StudentGoalUnlock] (Kế hoạch 7 ngày vượt rào cản)
       │
       ├─► [Bảng StudentTermScore] (Điểm thực tế các kỳ KSCL, GK1, CK1, GK2, CK2)
       │         │
       │         └─► [Bảng Subject] (Mã môn, Tên môn chuẩn: MAT, ENG, LIT...)
       │
       ├─► [Bảng StudentGoalAdjustmentRequest] (Lịch sử xin mở phiếu điều chỉnh)
       │
       └─► [Hồ sơ Học sinh 360°] (Giao diện tổng hợp Read-only)
```

---

### 2. NGUYÊN TẮC "NGUỒN SỰ THẬT DUY NHẤT" (SINGLE SOURCE OF TRUTH)

* **Phân hệ Cố vấn học tập** là **Source of Truth** duy nhất của dữ liệu mục tiêu và kế hoạch hành động.
* **Hồ sơ học sinh 360°** chỉ đọc và hiển thị bản tóm tắt mục tiêu cùng chỉ số GAP mới nhất, không tự ý lưu trữ một bản sao độc lập gây sai lệch dữ liệu.
* **Không cho phép chỉnh sửa mục tiêu tại Hồ sơ 360°:** Nếu người dùng muốn chỉnh sửa, hệ thống sẽ điều hướng về trang Cố vấn học tập chuyên biệt.\n