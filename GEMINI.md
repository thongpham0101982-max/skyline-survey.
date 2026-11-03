# Quy tắc Bắt buộc cho Hệ thống SSM Sky-Line

## 1. Tuyệt đối không tự ý phát sinh dữ liệu Test (No Unsolicited Test Data)
- **CẤM TUYỆT ĐỐI** việc tự ý khởi tạo, seed, hoặc chèn bất kỳ dữ liệu giả / dữ liệu kiểm thử nào (ví dụ: Cơ sở Test `CP_TST_*`, Năm học Test `NH-Test-*`, môn học test, lớp học test, giáo viên/học sinh/phụ huynh giả, kỳ khảo sát/đề thi mẫu...) vào cơ sở dữ liệu (`local.db`, `dev.db`, hoặc Turso Cloud) trong quá trình phát triển, gỡ lỗi, hoặc chạy kiểm thử tự động.
- Khi viết hoặc chạy các bài kiểm thử (`vitest`, scripts kiểm thử):
  - Phải sử dụng cơ chế **Mock** (`vi.mock('@/lib/db')`), kiểm thử logic hàm thuần túy (pure functions), hoặc truy vấn **chỉ đọc (read-only)** trên dữ liệu hiện có.
  - Không bao giờ gọi `.create()`, `.createMany()`, `.upsert()`, `INSERT`, `UPDATE`, `DELETE` tạo dữ liệu rác lên CSDL đang vận hành của nhà trường trừ khi có yêu cầu rõ ràng bằng văn bản từ người dùng.
