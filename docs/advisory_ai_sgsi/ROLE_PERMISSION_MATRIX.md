# TÀI LIỆU 7: MA TRẬN PHÂN QUYỀN VÀ BẢO MẬT DỮ LIỆU (ROLE-BASED ACCESS CONTROL)
## Mã tài liệu: ROLE_PERMISSION_MATRIX.md | Phiên bản: 2.0 | Ngày: 20/10/2026

---

## 1. NGUYÊN TẮC BẢO MẬT VÀ PHÂN QUYỀN
1. **Kiểm tra Quyền tại Server/API Route (Zero Client Trust):** Tuyệt đối không dựa vào việc ẩn nút bấm ở giao diện. Toàn bộ request gọi đến API đều phải giải mã session Next-Auth và xác minh quan hệ giữa `userId` và `studentId`.
2. **Ngăn chặn triệt để Lỗ hổng Leo quyền Ngang (Anti-IDOR):** Giáo viên chỉ được xem/sửa học sinh thuộc lớp mình chủ nhiệm, lớp mình được phân công giảng dạy hoặc học sinh được phân công làm CVHT.
3. **Phân tách Dữ liệu Nhạy cảm (Data Segregation):** Dữ liệu can thiệp tâm lý học đường (`supportType = 'PSYCHOLOGICAL'`) được xếp vào cấp độ mật cao; giáo viên bộ môn và CVHT thông thường chỉ thấy cờ *"Đang có chuyên gia tâm lý đồng hành"* mà không xem được biên bản tham vấn chi tiết.

---

## 2. MA TRẬN PHÂN QUYỀN CHI TIẾT (8 NHÓM VAI TRÒ)

| Hành động & Dữ liệu | 1. Học sinh (Student) | 2. Phụ huynh (Parent) | 3. CVHT / GVCN (Advisor) | 4. GV Bộ môn (Subject) | 5. QLCM / TTCM | 6. Giám đốc CS (GDCS) | 7. Ban KT&ĐBCL | 8. Quản trị (Admin) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Xem Dashboard Toàn trường / Cơ sở** | ❌ | ❌ | ❌ | ❌ | Xem tổ phụ trách | Xem CS của mình | Toàn quyền xem | Toàn quyền |
| **Xem Dashboard Lớp phụ trách** | ❌ | ❌ | ✅ Toàn quyền | Chỉ xem môn dạy | ✅ Xem | ✅ Xem | ✅ Xem | Toàn quyền |
| **Dashboard Cá nhân Học sinh** | ✅ Xem bản thân | ✅ Xem con mình | ✅ Xem HS lớp | ❌ | ❌ | ❌ | ❌ | Toàn quyền |
| **Hồ sơ 360 & Liên thông Điểm/KSCL** | ✅ Xem bản thân | ✅ Xem con mình | ✅ Xem HS lớp | Xem điểm môn mình | Xem khối/tổ | Xem cơ sở | Toàn quyền | Toàn quyền |
| **Lập Mục tiêu SMART** | ✅ Tạo & Cập nhật | ❌ | ✅ Hướng dẫn | ❌ | ❌ | ❌ | ❌ | Quản trị |
| **Phê duyệt & Khóa Mục tiêu SMART** | ❌ | ❌ | ✅ Phê duyệt | ❌ | ❌ | ❌ | ❌ | Quản trị |
| **Gửi Lời nhắn / Ký đồng hành** | ✅ Ký cam kết | ✅ Gửi lời nhắn | ✅ Ký xác nhận | Ghi nhận xét môn | ❌ | ❌ | ❌ | Quản trị |
| **Tạo Biên bản Cố vấn 1-1** | ❌ | ❌ | ✅ Toàn quyền | ❌ | ❌ | Khi được ủy quyền | ❌ | Toàn quyền |
| **Xem Biên bản Cố vấn 1-1** | Xem tóm tắt việc | Xem tóm tắt việc | ✅ Xem đầy đủ | Khi được chia sẻ | Xem giám sát | Xem giám sát | Xem kiểm toán | Toàn quyền |
| **Cập nhật Việc cần làm (Action Items)** | ✅ Đánh dấu xong | Nhắc nhở con | ✅ Giao việc & Duyệt | Phối hợp đôn đốc | Giám sát | Giám sát | Kiểm toán | Toàn quyền |
| **Sử dụng Sky-Line AI Advisor** | ❌ (Chưa mở) | ❌ | ✅ Toàn quyền gọi gợi ý | ❌ | Thử nghiệm | Thử nghiệm | Thử nghiệm | Quản trị |
| **Xem Chỉ số Tăng trưởng SGSI** | Xem kết quả tổng | Xem kết quả tổng | ✅ Xem chi tiết G,S,P | ❌ | Xem tổ/khối | ✅ Xem toàn cơ sở | ✅ Toàn hệ thống | Toàn quyền |
| **Cấu hình Trọng số & Công thức SGSI** | ❌ | ❌ | ❌ | ❌ | Đề xuất | Đề xuất | ✅ Cấu hình chính | ✅ Cấu hình |
| **Chuyển ca Hỗ trợ Học tập (Phụ đạo)** | Gửi yêu cầu trợ giúp | Đề xuất hỗ trợ | ✅ Tạo ca chuyển | Nhận phân công dạy | Phê duyệt ca | Phê duyệt ca | Giám sát | Toàn quyền |
| **Dữ liệu Tâm lý / Sức khỏe Đặc biệt** | Trao đổi riêng | Trao đổi riêng | Cờ cảnh báo | 🔒 BỊ KHÓA | Cờ cảnh báo | ✅ Xem có kiểm soát | Giám sát quy trình | 🔒 Giới hạn |
| **Xuất Sổ Quan sát & Báo cáo PDF** | ❌ | ❌ | ✅ Lớp phụ trách | ❌ | Xuất tổ/khối | ✅ Xuất cơ sở | ✅ Toàn trường | Toàn quyền |

---

## 3. CƠ CHẾ KIỂM SOÁT VÀ GHI NHẬT KÝ KIỂM TOÁN (AUDIT LOGGING)

Mọi thao tác thay đổi trạng thái mục tiêu, phê duyệt mở phiếu, lưu biên bản cố vấn, chuyển ca hỗ trợ hoặc gọi gợi ý AI đều được ghi vết tự động vào bảng `AuditLog`:

```typescript
// Chuẩn hóa ghi vết kiểm toán
await prisma.auditLog.create({
  data: {
    userId: session.user.id,
    userEmail: session.user.email,
    action: "AI_ADVISOR_SUGGESTION_APPLIED", // hoặc "SGSI_RECALCULATED", "SUPPORT_REFERRED"
    targetTable: "AcademicConsultationLog",
    targetId: logId,
    oldValues: JSON.stringify(oldState),
    newValues: JSON.stringify(newState),
    ipAddress: clientIp,
    createdAt: new Date()
  }
})
```
