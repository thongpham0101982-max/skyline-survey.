const { createClient } = require('@libsql/client');
const path = require('path');

const db = createClient({ url: 'file:' + path.resolve(__dirname, '..', 'local.db').replace(/\\/g, '/') });

async function runEndToEndTest() {
  console.log('--- BẮT ĐẦU KIỂM THỬ TÍCH HỢP TOÀN TRÌNH KT&ĐBCL CONNECT ---');

  // 1. Tạo 1 yêu cầu mẫu mô phỏng giáo viên gửi
  const reqId = 'test-req-' + Date.now();
  const reqCode = 'KTC-2026-TEST';
  console.log(`1. Tạo yêu cầu mẫu: [${reqCode}]`);

  await db.execute({
    sql: `INSERT INTO "KtdbclRequest" (
      "id", "requestCode", "title", "category", "requestType", "priority", "status", "content", "senderId", "senderName", "senderRole", "campusCode", "departmentName", "aiCategorySuggestion", "aiUrgencyScore", "createdAt", "updatedAt"
    ) VALUES (
      ?, ?, 'Cần hỗ trợ kiểm tra điểm số môn Toán 10A1', 'SO_DIEM_NHAN_XET', 'HO_TRO_NGHIEP_VU', 'HIGH', 'NEW', 'Em chào Ban KT&ĐBCL, em nhập nhầm điểm bài kiểm tra giữa kỳ của học sinh Nguyễn Văn A, nhờ Ban mở sổ giúp em ạ.', 'user-teacher-01', 'Nguyễn Thị Hương', 'TEACHER', 'CS1', 'Tổ Toán', 'SO_DIEM_NHAN_XET', 85, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )`,
    args: [reqId, reqCode]
  });

  // Tạo tin nhắn ban đầu
  await db.execute({
    sql: `INSERT INTO "KtdbclMessage" (
      "id", "requestId", "senderId", "senderName", "senderRole", "content", "isInternalNote", "createdAt"
    ) VALUES (
      ?, ?, 'user-teacher-01', 'Nguyễn Thị Hương', 'TEACHER', 'Em chào Ban KT&ĐBCL, em nhập nhầm điểm bài kiểm tra giữa kỳ của học sinh Nguyễn Văn A, nhờ Ban mở sổ giúp em ạ.', 0, CURRENT_TIMESTAMP
    )`,
    args: ['msg-1-' + Date.now(), reqId]
  });

  // Ghi audit log tạo
  await db.execute({
    sql: `INSERT INTO "KtdbclAuditLog" ("id", "requestId", "action", "actorId", "actorName", "newValue", "notes", "createdAt")
          VALUES (?, ?, 'CREATED', 'user-teacher-01', 'Nguyễn Thị Hương', 'NEW', 'Tạo yêu cầu mới', CURRENT_TIMESTAMP)`,
    args: ['audit-1-' + Date.now(), reqId]
  });
  console.log('✓ Yêu cầu và tin nhắn ban đầu đã tạo thành công.');

  // 2. Chuyên viên phân công và gửi ghi chú nội bộ
  console.log('2. Chuyên viên KT&ĐBCL tiếp nhận và phân công');
  await db.execute({
    sql: `UPDATE "KtdbclRequest" SET "status" = 'IN_PROGRESS', "assignedToId" = 'user-officer-01', "assignedToName" = 'Trần Văn Minh (KT&ĐBCL)', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
    args: [reqId]
  });

  await db.execute({
    sql: `INSERT INTO "KtdbclMessage" (
      "id", "requestId", "senderId", "senderName", "senderRole", "content", "isInternalNote", "createdAt"
    ) VALUES (
      ?, ?, 'user-officer-01', 'Trần Văn Minh', 'SPECIALIST', 'Đã kiểm tra log điểm trên hệ thống, xác nhận cô Hương nhập điểm lúc 15h30, chuẩn bị duyệt mở sổ 30 phút.', 1, CURRENT_TIMESTAMP
    )`,
    args: ['msg-2-' + Date.now(), reqId]
  });
  console.log('✓ Đã phân công chuyên viên và lưu ghi chú nội bộ bảo mật.');

  // 3. Chuyên viên gửi phản hồi chính thức cho giáo viên
  console.log('3. Chuyên viên phản hồi chính thức cho giáo viên');
  await db.execute({
    sql: `INSERT INTO "KtdbclMessage" (
      "id", "requestId", "senderId", "senderName", "senderRole", "content", "isInternalNote", "createdAt"
    ) VALUES (
      ?, ?, 'user-officer-01', 'Ban KT&ĐBCL Sky-Line', 'SPECIALIST', 'Chào Cô Hương, Ban KT&ĐBCL đã mở sổ điểm lớp 10A1 trong thời gian 60 phút (đến 17h00 hôm nay). Cô vui lòng cập nhật lại điểm và bấm lưu nhé.', 0, CURRENT_TIMESTAMP
    )`,
    args: ['msg-3-' + Date.now(), reqId]
  });

  await db.execute({
    sql: `UPDATE "KtdbclRequest" SET "status" = 'ANSWERED', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
    args: [reqId]
  });
  console.log('✓ Phản hồi chính thức đã gửi, trạng thái cập nhật sang ANSWERED.');

  // 4. Giáo viên xác nhận hoàn tất và đánh giá 5 sao
  console.log('4. Giáo viên đánh giá chất lượng hỗ trợ');
  await db.execute({
    sql: `UPDATE "KtdbclRequest" SET "status" = 'RESOLVED', "rating" = 5, "ratingFeedback" = 'Ban KT&ĐBCL hỗ trợ rất nhanh và chu đáo, cảm ơn Thầy Minh!', "resolvedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
    args: [reqId]
  });

  await db.execute({
    sql: `INSERT INTO "KtdbclAuditLog" ("id", "requestId", "action", "actorId", "actorName", "newValue", "notes", "createdAt")
          VALUES (?, ?, 'RATED', 'user-teacher-01', 'Nguyễn Thị Hương', 'RESOLVED', 'Đánh giá 5 sao', CURRENT_TIMESTAMP)`,
    args: ['audit-2-' + Date.now(), reqId]
  });
  console.log('✓ Giáo viên đã đánh giá 5 sao và hoàn tất.');

  // 5. Kiểm tra đọc thông báo nghiệp vụ
  console.log('5. Kiểm tra ghi nhận đọc thông báo');
  await db.execute({
    sql: `INSERT OR REPLACE INTO "KtdbclAnnouncementRead" ("id", "announcementId", "userId", "userName", "campusCode", "readAt")
          VALUES (?, 'tb-001', 'user-teacher-01', 'Nguyễn Thị Hương', 'CS1', CURRENT_TIMESTAMP)`,
    args: ['read-' + Date.now()]
  });
  console.log('✓ Đã ghi nhận giáo viên đọc thông báo TB-2026-001.');

  // 6. Tổng hợp kiểm tra lại số liệu
  const [chkReq, chkMsgs, chkReads] = await Promise.all([
    db.execute(`SELECT requestCode, title, status, rating, assignedToName FROM "KtdbclRequest" WHERE "id" = '${reqId}'`),
    db.execute(`SELECT senderRole, isInternalNote, content FROM "KtdbclMessage" WHERE "requestId" = '${reqId}'`),
    db.execute(`SELECT count(*) as count FROM "KtdbclAnnouncementRead" WHERE "announcementId" = 'tb-001'`)
  ]);

  console.log('\n--- KẾT QUẢ KIỂM THỬ: ---');
  console.log('Phiếu yêu cầu:', chkReq.rows[0]);
  console.log('Tổng số tin nhắn trao đổi:', chkMsgs.rows.length);
  console.log('Tin nhắn nội bộ (GV không thấy):', chkMsgs.rows.filter(m => m.isInternalNote == 1).length);
  console.log('Tin nhắn công khai (GV thấy):', chkMsgs.rows.filter(m => m.isInternalNote == 0).length);
  console.log('Tổng lượt đọc thông báo TB-2026-001:', chkReads.rows[0].count);
  console.log('\n✓ TẤT CẢ CÁC BƯỚC KIỂM THỬ TÍCH HỢP HOÀN THÀNH XUẤT SẮC!');
}

runEndToEndTest().catch(console.error);
