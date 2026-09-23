/**
 * GAP Analysis Engine for Student SMART Goals
 * GAP = Actual Score - Target Score
 */

export type GAPCategory = "EXCEEDED" | "MET" | "NEEDS_ATTENTION" | "CRITICAL_GAP";

export interface StudentGAPResult {
  actualScore: number;
  targetScore: number;
  gap: number;
  category: GAPCategory;
  categoryLabel: string;
  actionRecommendation: string;
}

export function calcGAP(actualScore: number, targetScore: number): number {
  return Number((actualScore - targetScore).toFixed(2));
}

export function evaluateStudentGAP(actualScore: number, targetScore: number): StudentGAPResult {
  const gap = calcGAP(actualScore, targetScore);
  let category: GAPCategory = "MET";
  let categoryLabel = "Đạt sát mục tiêu kỳ vọng";
  let actionRecommendation = "Tiếp tục duy trì tính tự giác và phong độ học tập hiện tại.";

  if (gap >= 0.5) {
    category = "EXCEEDED";
    categoryLabel = "Vượt mục tiêu xuất sắc";
    actionRecommendation = "Động viên học sinh phát huy, thử sức với các bài tập nâng cao hoặc hỗ trợ bạn cùng tiến.";
  } else if (gap >= -0.5) {
    category = "MET";
    categoryLabel = "Đạt sát mục tiêu kỳ vọng";
    actionRecommendation = "Củng cố kiến thức và rèn luyện đều đặn các dạng bài tập.";
  } else if (gap >= -1.5) {
    category = "NEEDS_ATTENTION";
    categoryLabel = "Chưa đạt nhẹ (Cảnh báo Vàng)";
    actionRecommendation = "Cố vấn học tập nhắc nhở rà soát lại phương pháp học, tập trung tháo gỡ phần kiến thức hổng.";
  } else {
    category = "CRITICAL_GAP";
    categoryLabel = "Khoảng cách lớn (Cảnh báo Đỏ)";
    actionRecommendation = "Cần kích hoạt Kế hoạch 7 ngày gỡ rào cản, phụ huynh và GVBM phối hợp hỗ trợ sát sao.";
  }

  return {
    actualScore,
    targetScore,
    gap,
    category,
    categoryLabel,
    actionRecommendation
  };
}
