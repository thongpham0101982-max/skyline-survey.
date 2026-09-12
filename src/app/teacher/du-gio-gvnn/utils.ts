export function isExactWalkthroughForm(slot: any): boolean {
  if (!slot) return false;

  // 1. Explicit requestOrigin from Walkthrough tool
  if (slot.requestOrigin === "FOREIGN_WALKTHROUGH") return true;

  // Find evaluation if any
  const reg = (slot.registrations || [])[0];
  const evalObj = reg?.evaluation;

  // 2. If it has an evaluation, inspect the evaluation data
  if (evalObj) {
    const rawComment = evalObj.generalComment || "";
    // If generalComment contains walkthrough JSON structure:
    if (rawComment.includes('"criterionScores"') || rawComment.includes('"teacherVoice"') || rawComment.includes('"targetSkills"')) {
      return true;
    }

    const rating = (evalObj.overallRating || "").trim();
    // Check if it's evaluated by standard Form Đánh giá giáo viên / Form Mầm non
    const isStandardK12OrMNRating = [
      "Xuất sắc", "Tốt", "Khá", "Đạt", "Chưa đạt", "Không xếp loại",
      "XUAT_SAC", "TOT", "KHA", "DAT", "CHUA_DAT",
      "Loại 1", "Loại 2", "Loại 3", "Loại 4"
    ].some(r => rating.toLowerCase().includes(r.toLowerCase()));

    const hasK12CriteriaColumns = evalObj.criterion1 != null || evalObj.criterion2 != null || evalObj.criterion3 != null;

    if (isStandardK12OrMNRating || hasK12CriteriaColumns) {
      // This was clearly submitted through Form Đánh giá giáo viên or Form Mầm non!
      return false;
    }

    // Walkthrough ratings: Strong Practice, Effective, Developing, Needs Support
    const isWalkthroughRating = ["Strong Practice", "Effective", "Developing", "Needs Support", "Effective Practice"].includes(rating);
    if (isWalkthroughRating) return true;
  }

  // 3. If slot has description "Dự giờ GVNN / Tổ Tiếng Anh" and topic contains Walkthrough
  const desc = (slot.description || "").toLowerCase();
  const top = (slot.topic || "").toLowerCase();
  if ((desc.includes("dự giờ gvnn") || desc.includes("du gio gvnn") || desc.includes("foreign")) && top.includes("walkthrough")) {
    if (slot.requestOrigin === "PRESCHOOL_SURPRISE" || slot.requestOrigin === "TEACHER_REGISTERED") {
      return false;
    }
    return true;
  }

  return false;
}

// Keep alias for backwards compatibility
export const isSlotBelongsToForeignEsl = isExactWalkthroughForm;
