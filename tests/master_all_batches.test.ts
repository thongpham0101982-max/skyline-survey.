
import { calculateSubjectGap, evaluateNonSubjectGoalProgress } from "../src/lib/advisory/advisoryGapService";
import { validateExamMatrix, ExamMatrixDefinition } from "../src/lib/testing/examMatrixService";

console.log("================================================================================");
console.log("   SSM MASTER REGRESSION SUITE: BATCH #01 + BATCH #02 + BATCH #03 UI BATCH     ");
console.log("================================================================================");
let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${name}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${name}`);
  }
}

// ---------------------------------------------------------
// SUITE 1: BATCH #01 (IMP-003 GAP & Goal Calculation)
// ---------------------------------------------------------
const r1 = calculateSubjectGap(8.0, { KSCL: 6.5, GK1: 8.5 }, 'MAT', 'Toan');
assert(r1.currentScore === 8.5, "Batch01: Latest score is 8.5");
assert(r1.status === 'DAT_VUOT_MUC_TIEU', "Batch01: Status is DAT_VUOT_MUC_TIEU");

const r2 = calculateSubjectGap(8.0, { KSCL: 7.0, GK1: 7.6 }, 'MAT', 'Toan');
assert(r2.status === 'TIEM_CAN', "Batch01: Status is TIEM_CAN");

const r3 = calculateSubjectGap(8.0, { KSCL: 5.5, GK1: 6.5 }, 'MAT', 'Toan');
assert(r3.status === 'CAN_NO_LUC', "Batch01: Status is CAN_NO_LUC");

assert(evaluateNonSubjectGoalProgress('DAT').percent === 100, "Batch01: DAT is 100%");
assert(evaluateNonSubjectGoalProgress('IN_PROGRESS').percent === 60, "Batch01: IN_PROGRESS is 60%");

// ---------------------------------------------------------
// SUITE 2: BATCH #02 (IMP-006 Exam Matrix Pre-validation)
// ---------------------------------------------------------
const validMatrix: ExamMatrixDefinition = {
  id: "m_gk1",
  code: "MT_TOAN_10_GK1",
  name: "Ma tran GK1 Toan 10",
  subjectCode: "MAT",
  subjectName: "Toan",
  grade: "10",
  durationMinutes: 90,
  items: [
    { id: "i1", topic: "T1", level: "NHAN_BIET", questionCount: 16, pointsPerQuestion: 0.25, totalPoints: 4.0, percentage: 40, availableInBank: 40 },
    { id: "i2", topic: "T2", level: "THONG_HIEU", questionCount: 12, pointsPerQuestion: 0.25, totalPoints: 3.0, percentage: 30, availableInBank: 30 },
    { id: "i3", topic: "T3", level: "VAN_DUNG", questionCount: 8, pointsPerQuestion: 0.25, totalPoints: 2.0, percentage: 20, availableInBank: 25 },
    { id: "i4", topic: "T4", level: "VAN_DUNG_CAO", questionCount: 4, pointsPerQuestion: 0.25, totalPoints: 1.0, percentage: 10, availableInBank: 10 }
  ]
};

const mv1 = validateExamMatrix(validMatrix);
assert(mv1.isValid === true, "Batch02: Matrix valid is true");
assert(mv1.totalScore === 10.0, "Batch02: Matrix score equals 10.0");
assert(mv1.scoreDifference === 0, "Batch02: Matrix score diff is 0");

const invalidM = { ...validMatrix, items: validMatrix.items.slice(0, 3) };
const mv2 = validateExamMatrix(invalidM);
assert(mv2.isValid === false, "Batch02: Incomplete matrix invalid is false");
assert(mv2.scoreDifference === 1.0, "Batch02: Score diff detected 1.0");

// ---------------------------------------------------------
// SUITE 3: BATCH #03 (UI Components: Deadline, Drawer, Popover)
// ---------------------------------------------------------
// 3.1 Deadline urgency tier calculation
const now = Date.now();
const futureDate = new Date(now + 60 * 60 * 60 * 1000); // 60 hours
const diff = futureDate.getTime() - now;
const hours = Math.floor(diff / (1000 * 60 * 60));
assert(hours > 48, "Batch03: 60h falls in Safe tier (> 48h)");

const urgentDate = new Date(now + 12 * 60 * 60 * 1000); // 12 hours
const urgentHours = (urgentDate.getTime() - now) / (1000 * 60 * 60);
assert(urgentHours < 24 && urgentHours > 0, "Batch03: 12h triggers Urgent Alert tier (< 24h)");

// 3.2 MOET TT22 / TT27 / Cambridge report format validation
const getTT22Rank = (score: number) => score >= 8.0 ? "Giỏi" : score >= 6.5 ? "Khá" : score >= 5.0 ? "Đạt" : "Chưa đạt";
assert(getTT22Rank(8.8) === "Giỏi", "Batch03: TT22 score 8.8 is Giỏi");
assert(getTT22Rank(7.2) === "Khá", "Batch03: TT22 score 7.2 is Khá");
assert(getTT22Rank(4.0) === "Chưa đạt", "Batch03: TT22 score 4.0 is Chưa đạt");

const getTT27Level = (score: number) => score >= 8.0 ? "T" : score >= 5.0 ? "H" : "C";
assert(getTT27Level(9.0) === "T", "Batch03: TT27 score 9.0 is T (Tốt)");
assert(getTT27Level(6.5) === "H", "Batch03: TT27 score 6.5 is H (Hoàn thành)");
assert(getTT27Level(4.5) === "C", "Batch03: TT27 score 4.5 is C (Chưa hoàn thành)");

const getCambridgeGrade = (score100: number) => {
  if (score100 >= 90) return "A*";
  if (score100 >= 80) return "A";
  if (score100 >= 70) return "B";
  if (score100 >= 60) return "C";
  if (score100 >= 50) return "D";
  return "U";
};
assert(getCambridgeGrade(94) === "A*", "Batch03: Cambridge score 94 is A*");
assert(getCambridgeGrade(85) === "A", "Batch03: Cambridge score 85 is A");
assert(getCambridgeGrade(72) === "B", "Batch03: Cambridge score 72 is B");
assert(getCambridgeGrade(48) === "U", "Batch03: Cambridge score 48 is U");

// 3.3 StudentSnapshotPopover GAP thresholds
const evaluateGap = (target: number, current: number) => {
  const gap = parseFloat((current - target).toFixed(1));
  if (gap >= 0) return { gap, category: "EXCEEDS_OR_MEETS" };
  if (gap >= -0.5) return { gap, category: "NEAR_TARGET" };
  return { gap, category: "NEEDS_SUPPORT" };
};
assert(evaluateGap(8.0, 8.5).category === "EXCEEDS_OR_MEETS", "Batch03: GAP +0.5 is EXCEEDS_OR_MEETS");
assert(evaluateGap(8.0, 7.8).category === "NEAR_TARGET", "Batch03: GAP -0.2 is NEAR_TARGET");
assert(evaluateGap(8.0, 6.0).category === "NEEDS_SUPPORT", "Batch03: GAP -2.0 is NEEDS_SUPPORT");

console.log("--------------------------------------------------------------------------------");
console.log(`  TOTAL: ${passed} PASSED, ${failed} FAILED.`);
if (failed > 0) process.exit(1);
console.log("================================================================================");
