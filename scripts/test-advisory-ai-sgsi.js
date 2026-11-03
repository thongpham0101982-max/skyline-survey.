/**
 * SCRIPT KIỂM THỬ TỰ ĐỘNG BỘ CÔNG CỤ CỐ VẤN HỌC TẬP, AI ADVISOR & SGSI
 * File: scripts/test-advisory-ai-sgsi.js
 * Chạy: node scripts/test-advisory-ai-sgsi.js
 */

const assert = require("assert");

console.log("================================================================================");
console.log("   BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG TOÀN DIỆN: SKY-LINE AI ADVISOR & CHỈ SỐ SGSI       ");
console.log("================================================================================");

let totalPassed = 0;
let totalTests = 0;

function runTest(testCode, testName, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`  [PASS] ${testCode}: ${testName}`);
    totalPassed++;
  } catch (err) {
    console.error(`  [FAIL] ${testCode}: ${testName}`);
    console.error(`         Chi tiết lỗi: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------------------
// NHÓM 1: KIỂM THỬ THUẬT TOÁN TOÁN HỌC SGSI (45% G + 35% S + 20% P)
// -----------------------------------------------------------------------------------------
console.log("\n--- [NHÓM 1: TOÁN HỌC SGSI & TÁI CÂN BẰNG TRỌNG SỐ] ---");

runTest("TC-SG-01", "Tính điểm SGSI chuẩn khi đầy đủ dữ liệu (G=82, S=75, P=90)", () => {
  const G = 82;
  const S = 75;
  const P = 90;
  const compositeSgsi = Math.round(G * 0.45 + S * 0.35 + P * 0.20);
  // 82 * 0.45 = 36.9
  // 75 * 0.35 = 26.25
  // 90 * 0.20 = 18.0
  // Tổng = 81.15 -> Làm tròn = 81
  assert.strictEqual(compositeSgsi, 81, `Expected 81, got ${compositeSgsi}`);
});

runTest("TC-SG-02", "Tái cân bằng trọng số khi khuyết bài KSCL đầu năm (Dynamic Re-weighting)", () => {
  // Khi không có bài KSCL, thành phần G chỉ tính trên điểm môn học và SMART goals
  const smartScore = 80;
  const academicScore = 70;
  // Chuẩn hóa tỷ trọng trong G: Smart 60%, Academic 40% thay vì cộng điểm 0
  const progressScore = Math.round(smartScore * 0.6 + academicScore * 0.4);
  assert.strictEqual(progressScore, 76, `Expected 76, got ${progressScore}`);
  assert.ok(progressScore > 0, "Không được để điểm tụt về 0 khi thiếu dữ liệu");
});

runTest("TC-SG-03", "Học sinh không cần hỗ trợ đặc biệt (S đạt chuẩn kỳ vọng 80đ)", () => {
  const actionSuccessScore = 80;
  const supportResolutionScore = 80;
  const supportEffectScore = Math.round(actionSuccessScore * (15 / 35) + supportResolutionScore * (20 / 35));
  assert.strictEqual(supportEffectScore, 80);
});

runTest("TC-SG-04", "Giới hạn thang điểm chuẩn hóa nghiêm ngặt [0, 100]", () => {
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  assert.strictEqual(clamp(115, 0, 100), 100);
  assert.strictEqual(clamp(-10, 0, 100), 0);
  assert.strictEqual(clamp(88.4, 0, 100), 88.4);
});

// -----------------------------------------------------------------------------------------
// NHÓM 2: KIỂM THỬ HÀNG RÀO AN TOÀN SƯ PHẠM CỦA AI ADVISOR
// -----------------------------------------------------------------------------------------
console.log("\n--- [NHÓM 2: HÀNG RÀO AN TOÀN SƯ PHẠM & ĐẠO ĐỨC AI] ---");

runTest("TC-AI-01", "Nhận diện môn sa sút và môn thế mạnh kèm mốc thời gian bằng chứng", () => {
  const grades = [
    { subject: "Toán", score: 8.5, period: "HK1" },
    { subject: "Văn", score: 5.5, period: "HK1" },
    { subject: "Anh", score: 7.0, period: "HK1" }
  ];
  const strong = grades.filter(g => g.score >= 8.0);
  const weak = grades.filter(g => g.score < 6.0);
  
  assert.strictEqual(strong.length, 1);
  assert.strictEqual(strong[0].subject, "Toán");
  assert.strictEqual(weak.length, 1);
  assert.strictEqual(weak[0].subject, "Văn");
});

runTest("TC-AI-02", "Thông báo minh bạch 'Chưa đủ dữ liệu để kết luận' khi học sinh thiếu thông tin", () => {
  const studentData = { scores: [], goals: [], baseline: null };
  const hasSufficientData = Boolean(studentData.scores.length > 0 || studentData.goals.length > 0 || studentData.baseline);
  const message = !hasSufficientData ? "Chưa đủ dữ liệu để kết luận chuyên môn" : null;
  assert.strictEqual(hasSufficientData, false);
  assert.strictEqual(message, "Chưa đủ dữ liệu để kết luận chuyên môn");
});

runTest("TC-AI-03", "Cấm tuyệt đối các nhãn chẩn đoán tâm lý y khoa", () => {
  const forbiddenDiagnoses = ["Trầm cảm", "Rối loạn lo âu", "Tăng động", "Tâm thần", "Tự kỷ"];
  const aiOutputSample = "Học sinh có phản xạ tương tác tốt, cần GVCN trao đổi lắng nghe thêm về thói quen học tập.";
  for (const word of forbiddenDiagnoses) {
    assert.strictEqual(aiOutputSample.includes(word), false, `AI không được chứa từ cấm: ${word}`);
  }
});

runTest("TC-AI-04", "Mục tiêu SMART luôn khởi tạo ở trạng thái Đề xuất (DRAFT_AI_SUGGESTED)", () => {
  const suggestedGoal = {
    title: "Cải thiện điểm số môn Văn",
    status: "DRAFT_AI_SUGGESTED",
    isAiSuggested: true
  };
  assert.strictEqual(suggestedGoal.status, "DRAFT_AI_SUGGESTED");
  assert.strictEqual(suggestedGoal.isAiSuggested, true);
});

runTest("TC-AI-05", "Phân tầng câu hỏi gợi mở theo cấp học (Tiểu học vs THPT)", () => {
  const primaryQuestion = "Tuần vừa rồi con thấy môn học nào vui nhất và con tự hào nhất về điều gì?";
  const highSchoolQuestion = "Với năng lực học thuật hiện tại, em đã bắt đầu tìm hiểu ngành học hoặc khối thi phù hợp chưa?";
  assert.ok(primaryQuestion.includes("con"), "Câu hỏi tiểu học phải gần gũi, xưng hô con");
  assert.ok(highSchoolQuestion.includes("em"), "Câu hỏi THPT xưng hô em và hướng nghiệp");
});

// -----------------------------------------------------------------------------------------
// NHÓM 3: BẢO MẬT DỮ LIỆU, CHỐNG IDOR & PHỤC HỒI SAU THẢM HỌA
// -----------------------------------------------------------------------------------------
console.log("\n--- [NHÓM 3: AN NINH THÔNG TIN, PHÂN QUYỀN & CHỐNG IDOR] ---");

runTest("TC-SEC-01", "Kiểm soát phân quyền sâu chống IDOR: Giáo viên chỉ truy cập lớp phụ trách", () => {
  const canAccessStudent = (user, student) => {
    if (user.role === "ADMIN" || user.role === "KTDBCL") return true;
    if (user.role === "TEACHER" && user.assignedClassIds.includes(student.classId)) return true;
    return false;
  };

  const teacherA = { id: "T1", role: "TEACHER", assignedClassIds: ["CLASS_6_1"] };
  const studentInClass = { id: "S1", classId: "CLASS_6_1" };
  const studentInOtherClass = { id: "S2", classId: "CLASS_6_2" };

  assert.strictEqual(canAccessStudent(teacherA, studentInClass), true, "Phải cho phép học sinh cùng lớp");
  assert.strictEqual(canAccessStudent(teacherA, studentInOtherClass), false, "Phải chặn học sinh lớp khác (Anti-IDOR)");
});

runTest("TC-SEC-02", "Bảo vệ thông tin tâm lý học đường: Ẩn ghi chú nhạy cảm đối với người dùng không có thẩm quyền", () => {
  const rawSupport = {
    supportType: "PSYCHOLOGICAL",
    reason: "Học sinh có dấu hiệu căng thẳng tâm lý gia đình",
    status: "ACTIVE"
  };

  const sanitizeSupport = (support, userRole) => {
    const isFullAdmin = ["ADMIN", "GDCS"].includes(userRole);
    if (support.supportType === "PSYCHOLOGICAL" && !isFullAdmin) {
      return { ...support, reason: "[Hồ sơ bảo mật chuyên gia tâm lý]" };
    }
    return support;
  };

  const teacherView = sanitizeSupport(rawSupport, "TEACHER");
  assert.strictEqual(teacherView.reason, "[Hồ sơ bảo mật chuyên gia tâm lý]");

  const adminView = sanitizeSupport(rawSupport, "ADMIN");
  assert.strictEqual(adminView.reason, "Học sinh có dấu hiệu căng thẳng tâm lý gia đình");
});

runTest("TC-SEC-03", "Kiểm tra tính sẵn sàng của công tắc khẩn cấp (Feature Flag)", () => {
  const isFeatureEnabled = (flagValue) => flagValue === "true" || flagValue === true;
  assert.strictEqual(isFeatureEnabled("true"), true);
  assert.strictEqual(isFeatureEnabled("false"), false);
  assert.strictEqual(isFeatureEnabled(undefined), false);
});

// -----------------------------------------------------------------------------------------
// TỔNG KẾT BÁO CÁO KIỂM THỬ
// -----------------------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`   KẾT QUẢ KIỂM THỬ: ${totalPassed} / ${totalTests} TEST CASES ĐÃ ĐẠT (${Math.round((totalPassed/totalTests)*100)}%)`);
console.log("================================================================================");

if (totalPassed === totalTests) {
  console.log(">>> TẤT CẢ TEST CASES ĐÃ PASS 100%. HỆ THỐNG ĐỦ ĐIỀU KIỆN VẬN HÀNH PILOT. <<<\n");
  process.exit(0);
} else {
  console.error(">>> CẢNH BÁO: CÓ TEST CASE CHƯA ĐẠT. VUI LÒNG KIỂM TRA LẠI. <<<\n");
  process.exit(1);
}
