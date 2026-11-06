# Hướng dẫn Tích hợp API Sky-Line SSM (Phiên bản 1)

Tài liệu này hướng dẫn các nhà phát triển và chuyên viên quản trị hệ thống kết nối các ứng dụng đối tác, phần mềm chấm thi OMR, LMS và quy trình tự động hóa n8n vào Hệ thống Quản lý Giáo dục Sky-Line School (SSM).

---

## 1. Cơ chế Xác thực & Quản lý Khóa (Authentication)

- Mọi yêu cầu API phiên bản 1 được gửi kèm header tiêu chuẩn:
  ```http
  Authorization: Bearer <API_KEY>
  Content-Type: application/json
  ```
- **Sinh khóa bảo mật:** Khóa API được sinh tự động bằng hàm sinh số ngẫu nhiên mật mã của Node.js (`crypto.randomBytes`) với tiền tố `sky_live_...`.
- **Nguyên tắc một lần:** Khóa bí mật đầy đủ chỉ hiển thị một lần duy nhất tại thời điểm tạo trong giao diện **Admin → Cài đặt hệ thống → Kết nối API**.
- **Lưu trữ an toàn:** Máy chủ chỉ lưu bản băm SHA-256 (`keyHash`) và tiền tố hiển thị (`keyPrefix`). Máy chủ không bao giờ lưu khóa thô và không ghi khóa vào log hệ thống.
- **Nguyên tắc mặc định từ chối:** Ứng dụng chỉ được thực hiện các thao tác khi có quyền rõ ràng (`students:read`, `students:write`, `grades:read`, `grades:write`, `assignments:read`, `assignments:write`, `survey-results:read`, `survey-results:write`).
- **Kiểm soát phạm vi cơ sở & lớp:** Bản ghi trả về và bản ghi được phép ghi bị giới hạn nghiêm ngặt theo cấu hình phạm vi lưu trên máy chủ (`allowedCampusIds`, `allowedClassIds`). Tham số truy vấn `campusId`, `classId` chỉ dùng để thu hẹp bộ lọc, không thể dùng để mở rộng quyền truy cập chéo cơ sở (Anti-IDOR).

---

## 2. Tiêu chuẩn Phản hồi & Xử lý Lỗi

Mọi phản hồi từ hệ thống đều kèm header `X-Request-Id` và cấu trúc chuẩn:

### Phản hồi thành công:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_8df84050-fc89-408b-9e45-12cf3456789a",
    "timestamp": "2026-11-05T08:30:00.000Z",
    "pagination": {
      "total": 125,
      "page": 1,
      "limit": 20,
      "totalPages": 7
    }
  }
}
```

### Phản hồi lỗi:
```json
{
  "success": false,
  "error": {
    "code": "GRADEBOOK_LOCKED",
    "message": "Sổ điểm môn Toán của lớp 10/1 trong kỳ KSĐN đã bị khóa. Không thể nhập hoặc cập nhật điểm."
  },
  "meta": {
    "requestId": "req_8df84050-fc89-408b-9e45-12cf3456789a",
    "timestamp": "2026-11-05T08:30:00.000Z"
  }
}
```

---

## 3. Ví dụ Gọi API bằng cURL

### 3.1. Danh sách Học sinh
```bash
curl -X GET "https://ssm.skylineschool.edu.vn/api/v1/students?page=1&limit=20&status=ACTIVE" \
  -H "Authorization: Bearer sky_live_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b" \
  -H "Accept: application/json"
```

### 3.2. Khởi tạo Hồ sơ Học sinh Mới
```bash
curl -X POST "https://ssm.skylineschool.edu.vn/api/v1/students" \
  -H "Authorization: Bearer sky_live_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b" \
  -H "Content-Type: application/json" \
  -d '{
    "studentCode": "HS2026-00129",
    "studentName": "Nguyễn Hoàng Minh",
    "englishName": "Leo Nguyen",
    "classId": "cl_grade10a1_2026",
    "campusId": "cp_riverside",
    "academicYearId": "ay_2026_2027",
    "gender": "NAM",
    "dateOfBirth": "2010-05-18",
    "studentType": "CHINH_KHOA"
  }'
```

### 3.3. Nhập Điểm Môn học (Tuân thủ Khóa sổ điểm)
```bash
curl -X POST "https://ssm.skylineschool.edu.vn/api/v1/grades" \
  -H "Authorization: Bearer sky_live_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "std_cuid_12345",
    "subjectId": "sub_math_k10",
    "classId": "cl_grade10a1_2026",
    "academicYearId": "ay_2026_2027",
    "evaluationPeriod": "KSĐN",
    "compositeScore": 8.5,
    "componentScores": {
      "tx1": 8.0,
      "tx2": 9.0,
      "gk": 8.5
    },
    "remark": "Tư duy giải toán tốt, hoàn thành đầy đủ bài tập"
  }'
```

### 3.4. Cập nhật Phân công Giảng dạy
```bash
curl -X PATCH "https://ssm.skylineschool.edu.vn/api/v1/assignments/asg_cuid_98765" \
  -H "Authorization: Bearer sky_live_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b" \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId": "tch_cuid_45678",
    "semester": 1,
    "expectedVersion": "tch_old_cl_grade10a1_sub_math_1"
  }'
```

### 3.5. Gửi Kết quả Khảo sát Giáo dục
```bash
curl -X POST "https://ssm.skylineschool.edu.vn/api/v1/survey-results" \
  -H "Authorization: Bearer sky_live_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b" \
  -H "Content-Type: application/json" \
  -d '{
    "surveyPeriodId": "sp_dau_nam_2026",
    "studentId": "std_cuid_12345",
    "classId": "cl_grade10a1_2026",
    "campusId": "cp_riverside",
    "academicYearId": "ay_2026_2027",
    "npsScoreRaw": 9,
    "responses": [
      {
        "questionId": "q_chat_luong_giang_day",
        "numericScore": 5,
        "textAnswer": "Hài lòng với phương pháp giảng dạy tích cực của giáo viên"
      }
    ]
  }'
```

---

## 4. Cấu hình Quy trình Tự động hóa với n8n

Khi tích hợp với n8n để tự động đồng bộ kết quả khảo sát hoặc điểm thi từ máy quét OMR:

### Bước 1: Tạo HTTP Request Credential trong n8n
- **Authentication**: `Generic Credential Type` → `Header Auth`
- **Name**: `Header: Authorization`
- **Value**: `Bearer sky_live_YOUR_GENERATED_API_KEY`

### Bước 2: Thiết lập Node HTTP Request (Đồng bộ Điểm OMR vào SSM)
- **Method**: `POST`
- **URL**: `https://ssm.skylineschool.edu.vn/api/v1/grades`
- **Authentication**: Chọn credential đã tạo ở Bước 1
- **Send Body**: `true`
- **Body Content Type**: `JSON`
- **Specify Body**: `Using Fields Below`
  - `studentId`: `={{ $json.ssmStudentId }}`
  - `subjectId`: `={{ $json.ssmSubjectId }}`
  - `classId`: `={{ $json.ssmClassId }}`
  - `academicYearId`: `={{ $json.academicYearId }}`
  - `evaluationPeriod`: `={{ $json.period }}`
  - `compositeScore`: `={{ $json.finalScore }}`
  - `componentScores`: `={{ $json.parts }}`
- **Options**:
  - **Response Format**: `JSON`
  - **Never Error (Continue on Fail)**: `true` (để hứng mã lỗi `GRADEBOOK_LOCKED` hoặc `VERSION_CONFLICT` và gửi thông báo qua Slack/Telegram khi sổ điểm bị khóa).

---

## 5. Quy tắc Kiểm tra Phiên bản (Optimistic Locking)

Để đảm bảo tính nhất quán dữ liệu trong môi trường đa hệ thống, các endpoint `PATCH` hỗ trợ trường `expectedVersion`.
- Trước khi cập nhật, ứng dụng gửi kèm `expectedVersion` nhận được từ lệnh `GET` trước đó.
- Nếu bản ghi trên hệ thống SSM đã bị thay đổi bởi giáo viên hoặc cán bộ quản trị trước khi ứng dụng gửi yêu cầu, hệ thống sẽ trả mã lỗi HTTP `409 Conflict` kèm mã `VERSION_CONFLICT`.
- Ứng dụng tích hợp cần bắt mã lỗi `409`, thực hiện tải lại dữ liệu mới nhất, đối chiếu thay đổi và xác nhận trước khi cập nhật lại.
