# 02. DANH MỤC CHỈ SỐ CHUẨN (METRIC CATALOG)
## ĐỊNH NGHĨA DUY NHẤT CHO MỌI CHỈ SỐ TOÀN HỆ THỐNG SSM

| Mã chỉ số (Metric ID) | Tên chỉ số | Module nguồn | Công thức chuẩn hóa | Đơn vị | Tính cộng dồn | Chủ quản (Owner) |
|---|---|---|---|:---:|:---:|---|
| `OBS_COMPLETION_RATE` | Tỷ lệ hoàn thành dự giờ | Dự giờ CM | `(Lượt hoàn thành / Kế hoạch giao) * 100` | `%` | Không | Tổ Chuyên Môn / BGH |
| `OBS_AVERAGE_SCORE` | Điểm đánh giá tiết dạy TB | Dự giờ CM | `SUM(Điểm phiếu duyệt) / COUNT(Phiếu)` | Điểm | Không | BGH / TTCM |
| `GOAL_ATTAINMENT_RATE`| Tỷ lệ HS đạt mục tiêu | Cố vấn & GAP | `(Số HS có GAP <= 0 / Tổng HS có mục tiêu) * 100` | `%` | Không | GVCN / Cố vấn học tập |
| `SUPPORT_ACTIVE_COUNT` | Số HS đang theo dõi hỗ trợ | Hỗ trợ học tập | `COUNT(Hồ sơ hỗ trợ đang ACTIVE)` | HS | Có | Tổ Hỗ trợ / Tâm lý |
| `EXP_PASS_RATE` | Tỷ lệ hoàn thành HĐTN | Trải nghiệm | `(Số HS xếp loại >= Đạt / Tổng HS tham gia) * 100`| `%` | Không | Đoàn Đội / GVCN |
| `ASSESSMENT_PASS_RATE`| Tỷ lệ đạt chuẩn khảo thí | Khảo thí | `(Số bài kiểm tra >= 5.0 / Tổng bài chấm) * 100` | `%` | Không | Ban KT&ĐBCL |
| `DATA_COMPLETION_RATE`| Tỷ lệ hoàn tất dữ liệu | Quản trị dữ liệu | `(Số danh mục nộp đúng hạn / Tổng danh mục) * 100` | `%` | Không | Giáo vụ / Khảo thí |
