# 08. STRUCTURED LOGGING & AUDIT TRAIL ARCHITECTURE

---

## 1. ĐỊNH DẠNG LOG TIÊU CHUẨN (STRUCTURED JSON FORMAT)
Mọi bản ghi log trên production đều tuân thủ chuẩn JSON 1 dòng (NDJSON), tự động inject metadata:

```json
{
  "timestamp": "2026-09-20T08:15:30.124Z",
  "level": "INFO",
  "requestId": "req_8f1a2c3d-9e4b",
  "campusId": "skyline-riverside",
  "userId": "usr_teacher_042",
  "role": "TEACHER",
  "module": "OBSERVATION",
  "action": "CREATE_OBSERVATION_SHEET",
  "resourceId": "obs_sheet_9941",
  "durationMs": 45,
  "clientIp": "14.232.xxx.xxx",
  "userAgent": "Mozilla/5.0 ...",
  "message": "Observation sheet created successfully"
}
```

---

## 2. CÁC NGUYÊN TẮC BẢO VỆ DỮ LIỆU NHẠY CẢM (PII SCRUBBING)
- **Tuyệt đối không ghi vào log:** Mật khẩu, token xác thực, số CMND/CCCD của phụ huynh/học sinh, thông tin can thiệp tâm lý chi tiết.
- Các trường nhạy cảm tự động được masked thành `[REDACTED]` trước khi xuất log stream.
- Thời gian lưu trữ log (Retention): 90 ngày cho Application Logs, 365 ngày cho Security & Compliance Audit Logs.
