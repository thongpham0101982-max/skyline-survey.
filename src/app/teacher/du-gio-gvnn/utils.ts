export function isSlotBelongsToForeignEsl(slot: any): boolean {
  if (!slot) return false;

  const origin = (slot.requestOrigin || "").toUpperCase();
  if (origin === "FOREIGN_WALKTHROUGH") return true;

  const subj = (slot.subjectName || "").toLowerCase().trim();
  const top = (slot.topic || "").toLowerCase().trim();
  const desc = (slot.description || "").toLowerCase().trim();
  const deptName = (slot.teacher?.departmentRel?.name || "").toLowerCase().trim();
  const blockCM = (slot.teacher?.departmentRel?.blockCM || "").toLowerCase().trim();

  // If standard preschool without GVNN markers, it is Preschool, not GVNN ESL
  const isMN = slot.level === "Mầm non" ||
    (slot.grade || "").toLowerCase().includes("mầm non") ||
    blockCM.normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("mam non") ||
    deptName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("mam non");

  if (isMN && !desc.includes("gvnn") && !top.includes("gvnn") && !subj.includes("esl") && origin !== "FOREIGN_WALKTHROUGH") {
    return false;
  }

  // Keywords that identify GVNN / ESL
  if (desc.includes("gvnn") || desc.includes("foreign") || desc.includes("tổ tiếng anh") || desc.includes("to tieng anh")) return true;
  if (top.includes("gvnn") || top.includes("foreign") || top.includes("walkthrough") || top.includes("esl")) return true;
  if (subj.includes("esl") || subj.includes("tiếng anh (esl)") || subj.includes("tieng anh (esl)") || subj.includes("foreign")) return true;
  if (deptName.includes("quốc tế") && (subj.includes("esl") || subj.includes("ela") || subj.includes("english"))) return true;

  // Check evaluations for Walkthrough ratings or criteria
  const reg = (slot.registrations || [])[0];
  const evalObj = reg?.evaluation;
  if (evalObj) {
    const r = (evalObj.overallRating || "").trim();
    if (["Strong Practice", "Effective", "Developing", "Needs Support", "Effective Practice"].includes(r)) {
      return true;
    }
    if (evalObj.generalComment && (evalObj.generalComment.includes("criterionScores") || evalObj.generalComment.includes("teacherVoice"))) {
      return true;
    }
  }

  return false;
}
