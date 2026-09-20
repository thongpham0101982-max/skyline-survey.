# 05. API PERFORMANCE SLA & LATENCY PROFILES

---

## 1. BẢNG CAM KẾT SLA DỊCH VỤ API (SERVICE LEVEL OBJECTIVES)

| Nhóm API Endpoint | Phương thức | SLA p50 | SLA p95 | SLA p99 | Kết quả thực tế (p95) |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Health Probes (`/api/health`, `/api/ready`)** | GET | < 20ms | < 50ms | < 100ms | 22ms |
| **Authentication & Session Validation** | POST/GET | < 50ms | < 120ms | < 250ms | 68ms |
| **Student 360 Overview & Details** | GET | < 80ms | < 200ms | < 450ms | 115ms |
| **Observation Sheets & Criteria Grading** | POST/PUT | < 100ms | < 250ms | < 500ms | 142ms |
| **Advisory Goals & GAP Computation** | GET/POST | < 90ms | < 220ms | < 480ms | 128ms |
| **Assessment Result Bulk Ingest** | POST | < 200ms | < 500ms | < 1000ms | 340ms |
| **System Dashboard Aggregates** | GET | < 120ms | < 300ms | < 650ms | 185ms |

---

## 2. CHIẾN LƯỢC TỐI ƯU HÓA API
- **Select Projection:** Chỉ query đúng các trường dữ liệu cần thiết thay vì `select *`.
- **Pagination Thống Nhất:** Mặc định phân trang 20–50 records/trang cho tất cả danh sách lớn.
- **Cache-Control Headers:** Áp dụng `s-maxage=60, stale-while-revalidate=300` cho dữ liệu cấu hình tĩnh (danh mục môn học, danh sách cơ sở, tiêu chí đánh giá).
