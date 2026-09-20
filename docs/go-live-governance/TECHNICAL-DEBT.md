# TECHNICAL DEBT REGISTER & MAINTENANCE BACKLOG

Sổ đăng ký Nợ Kỹ thuật chính thức của hệ thống SSM nhằm kiểm soát và xử lý có kế hoạch các điểm cần tối ưu hóa mã nguồn.

---

| Mã Nợ Kỹ thuật | Phân hệ | Mức độ rủi ro | Mức độ ảnh hưởng | Nỗ lực xử lý | Mức ưu tiên | Chủ sở hữu phụ trách | Bản phát hành mục tiêu |
|:---:|:---|:---:|:---:|:---:|:---:|:---|:---:|
| **TD-01** | Database Indexing | Low | Tối ưu hóa truy vấn điểm số phức tạp nhiều học kỳ | Thấp (1 ngày) | P2 | DBA Lead | `v1.1.0` |
| **TD-02** | Frontend Caching | Low | Bổ sung SWR/React Query caching cho danh mục môn học | Thấp (2 ngày) | P2 | Frontend Lead | `v1.1.0` |
| **TD-03** | Test Automation | Medium | Mở rộng độ bao phủ E2E test cho luồng nộp bài khảo thí | Trung bình (3 ngày) | P1 | QA Lead | `v1.1.0` |
| **TD-04** | Document Pipeline | Low | Chuyển dịch vụ sinh file PDF báo cáo sang Background Worker | Trung bình (3 ngày) | P3 | Backend Lead | `v1.2.0` |
