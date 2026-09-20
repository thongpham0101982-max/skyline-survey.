# MÔ HÌNH DỮ LIỆU THEO DÕI (TRACKING MODEL)
## Cấu Trúc Đối Tượng Hỗ Trợ Học Tập và Tâm Lý Học Đường

---

### 1. PHÂN TÁCH HAI NHÁNH NGHIỆP VỤ

Hệ thống phân định rạch ròi 2 nhánh nghiệp vụ độc lập nhưng có chung giao thức hiển thị:

```
                  ┌─────────────────────────────────────┐
                  │ HỒ SƠ THEO DÕI (LearningSupportTarget)│
                  └──────────────────┬──────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌─────────────────────────┐                         ┌─────────────────────────┐
│ A. HỖ TRỢ HỌC TẬP       │                         │ B. THEO DÕI TÂM LÝ      │
│ (supportType: ACADEMIC) │                         │ (supportType:           │
│                         │                         │  PSYCHOLOGICAL)         │
│ • Phụ đạo môn học yếu   │                         │ • Khảo sát đầu vào      │
│ • Cam kết học tập đầu cấp│                        │ • Chuyển tiếp năm trước │
│ • Bồi dưỡng cá nhân hóa │                         │ • Khủng hoảng tâm lý    │
│ • Đo lường theo GAP điểm│                         │ • Đo lường theo hành vi │
└─────────────────────────┘                         └─────────────────────────┘
```

---

### 2. CẤU TRÚC BẢN GHI THEO DÕI CHUẨN

Mỗi hồ sơ theo dõi gồm các trường dữ liệu cốt lõi:
* **Mã định danh:** `id`, `studentId`, `academicYearId`.
* **Phân loại:** `supportType` (`ACADEMIC` / `PSYCHOLOGICAL`).
* **Nguồn tiếp nhận:** `sourceType` (`ADMISSION`, `GVCN`, `GVBM`, `TAM_LY`, `TRANSFERRED`).
* **Thời gian:** `startDate` (Ngày bắt đầu), `endDate` (Ngày kết thúc nếu đã chấm dứt).
* **Trạng thái:**
  * `status`: `ACTIVE`, `IMPROVING`, `NEED_ATTENTION`, `CONTINUED`.
  * `terminationStatus`: `ACTIVE`, `PENDING_TERMINATION`, `TERMINATED`.
* **Nhân sự phụ trách:** Danh sách phân công qua bảng `LearningSupportAssignment`.
* **Lịch sử can thiệp:** Danh sách đánh giá tuần/tháng qua bảng `LearningSupportEvaluation`.\n