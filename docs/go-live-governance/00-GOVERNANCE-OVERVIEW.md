# SSM GO-LIVE GOVERNANCE & CONTINUOUS IMPROVEMENT
## 00. TỔNG QUAN KHUNG QUẢN TRỊ VẬN HÀNH (OPERATING MODEL v1.0)

**Hệ thống:** Sky-Line Educational Quality Management System (SSM)  
**Phiên bản:** SSM Operating Model v1.0  
**Ngày ban hành:** 2026-09-20  
**Tình trạng:** **ACTIVE & GOVERNED**  

---

## 1. MỤC TIÊU CHIẾN LƯỢC CỦA PHASE 16
Chuyển đổi toàn diện hệ thống SSM từ trạng thái **"Dự án triển khai (Project Delivery)"** sang **"Hệ thống vận hành có quản trị (Governed Operational System)"**.

Sau khi các mốc cơ sở đã được kiểm định và đóng băng:
- **SSM UI/UX Baseline v1.0:** FROZEN
- **Production Baseline v1.0:** VERIFIED & FROZEN
- **Security & Resilience Baseline v1.0:** VERIFIED & FROZEN

Kể từ thời điểm này, **TUYỆT ĐỐI CHẤM DỨT** cơ chế thay đổi tự phát:
```text
[SAI LỆCH CŨ] Có ý tưởng  ──>  Sửa code  ──>  Deploy trực tiếp
```
Mọi thay đổi trên môi trường Production bắt buộc phải tuân thủ chu trình quản trị chuẩn:
```text
MONITOR → RECEIVE CHANGE → ASSESS → PRIORITIZE → IMPLEMENT → TEST → RELEASE → MEASURE → REVIEW → IMPROVE
```

---

## 2. NGUYÊN TẮC CỐT LÕI (CORE PRINCIPLES)
1. **Một nguồn sự thật duy nhất (Single Source of Truth):** Các bộ tiêu chuẩn Baseline v1.0, Design System, Metric Catalog và Data Source Maps là tài liệu tham chiếu chuẩn mực bắt buộc.
2. **Không thay đổi âm thầm (No Silent Changes):** Mọi sự điều chỉnh logic nghiệp vụ, giao diện, quyền hạn hoặc schema cơ sở dữ liệu đều phải có Change Request được phê duyệt.
3. **Chất lượng và Ổn định là ưu tiên tối thượng:** Không hy sinh tính ổn định của hệ thống phục vụ 5 cơ sở trường học để chạy theo các tính năng phát sinh chưa được kiểm soát.
4. **Vận hành dựa trên dữ liệu (Data-Driven Operations):** Đo lường mức độ sử dụng thực tế (Adoption) và tỷ lệ hoàn thành tác vụ (Task Success Rate) thay vì chỉ đo số lượt đăng nhập.
