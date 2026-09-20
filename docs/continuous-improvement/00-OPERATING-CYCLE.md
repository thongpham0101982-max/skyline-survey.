# 00. SSM CONTINUOUS OPERATIONS LOOP v1.0 — OPERATING CYCLE

**Hệ thống:** Sky-Line Educational Quality Management System (SSM)  
**Phiên bản:** SSM Continuous Operations Loop v1.0  
**Ngày ban hành:** 2026-09-20  
**Tình trạng:** **OPERATIONAL & ACTIVE**  

---

## 1. MỤC TIÊU CHIẾN LƯỢC CỦA PHASE 17
Chấm dứt việc phát triển hệ thống theo các Wave lớn liên tục dồn dập. Kể từ thời điểm này, SSM chuyển sang chu trình **Cải tiến Liên tục (Continuous Operations Loop)** có kiểm soát, vận hành dựa trên bằng chứng dữ liệu thực tế (Evidence-Based Evolution):

```text
MONITOR → COLLECT → ANALYZE → PRIORITIZE → SELECT → IMPROVE → TEST → RELEASE → MEASURE AGAIN
```

### Nguyên tắc cốt lõi:
- **Không bao giờ redesign toàn hệ thống một cách mù quáng.**
- **Không mở một Wave phát triển lớn nếu không có bằng chứng chiến lược rõ ràng.**
- **Mọi cải tiến phải xuất phát từ 6 nguồn đầu vào chuẩn:**
  1. Dashboard & KPI trends
  2. Mức độ tiếp nhận & Tỷ lệ hoàn thành tác vụ (Adoption & Completion)
  3. Chất lượng dữ liệu (Data Quality)
  4. Lịch sử sự cố & Lỗi vận hành (Incidents & Errors)
  5. Sổ đăng ký Nợ Kỹ thuật (Technical Debt)
  6. Phản hồi thực tế từ người dùng (User Feedback)
- **Không bao giờ code ngay khi vừa nhận feedback:** Bắt buộc phải xác định căn nguyên gốc rễ (Root Cause) trước khi đưa vào phát triển.
