/**
 * Maps a student's grade and their batch's start date to the correct criteria age group
 * based on the 2026-2027 preschool survey timelines (Updated Version).
 */
export function getSurveyFormAgeGroup(grade?: string | null, batchStartDate?: string | Date | null): string {
  const normalizedGrade = (grade || "").trim();
  if (!normalizedGrade) return "18 đến 24 tháng";

  // Determine Giai đoạn (Stage 1 or Stage 2) based on date
  let isStage2 = false;
  
  const dateObj = batchStartDate ? new Date(batchStartDate) : null;
  if (dateObj && !isNaN(dateObj.getTime())) {
    const month = dateObj.getMonth(); // 0-indexed: 0 = January, 11 = December
    // Stage 2 is from January to May (months 0 to 4)
    if (month >= 0 && month <= 4) {
      isStage2 = true;
    }
  } else {
    // If no batch date is provided, default to current local date
    const now = new Date();
    const month = now.getMonth();
    if (month >= 0 && month <= 4) {
      isStage2 = true;
    }
  }

  if (isStage2) {
    // Giai đoạn 2 (01/01 đến 31/05):
    // Nhà trẻ 12-18 tháng -> 12 đến 18 tháng
    // Nhà trẻ 18-24 tháng -> 18 đến 24 tháng
    // Nhà trẻ 24-36 tháng -> 24 đến 36 tháng
    // Mẫu giáo bé -> 3 đến 4 tuổi
    // Mẫu giáo nhỡ -> 4 đến 5 tuổi
    // Mẫu giáo lớn -> 5 đến 6 tuổi
    if (normalizedGrade === "Nhà trẻ 12-18 tháng" || normalizedGrade === "12 đến 18 tháng") return "12 đến 18 tháng";
    if (normalizedGrade === "Nhà trẻ 18-24 tháng" || normalizedGrade === "18 đến 24 tháng") return "18 đến 24 tháng";
    if (normalizedGrade === "Nhà trẻ 24-36 tháng" || normalizedGrade === "24 đến 36 tháng") return "24 đến 36 tháng";
    if (normalizedGrade === "Mẫu giáo bé") return "3 đến 4 tuổi";
    if (normalizedGrade === "Mẫu giáo nhỡ") return "4 đến 5 tuổi";
    if (normalizedGrade === "Mẫu giáo lớn") return "5 đến 6 tuổi";
  } else {
    // Giai đoạn 1 (01/06 đến 31/12):
    // Nhà trẻ 12-18 tháng -> 12 đến 18 tháng
    // Nhà trẻ 18-24 tháng -> 18 đến 24 tháng
    // Nhà trẻ 24-36 tháng -> 18 đến 24 tháng
    // Mẫu giáo bé -> 24 đến 36 tháng
    // Mẫu giáo nhỡ -> 3 đến 4 tuổi
    // Mẫu giáo lớn -> 4 đến 5 tuổi
    if (normalizedGrade === "Nhà trẻ 12-18 tháng" || normalizedGrade === "12 đến 18 tháng") return "12 đến 18 tháng";
    if (normalizedGrade === "Nhà trẻ 18-24 tháng" || normalizedGrade === "18 đến 24 tháng") return "18 đến 24 tháng";
    if (normalizedGrade === "Nhà trẻ 24-36 tháng" || normalizedGrade === "24 đến 36 tháng") return "18 đến 24 tháng";
    if (normalizedGrade === "Mẫu giáo bé" || normalizedGrade === "3 đến 4 tuổi") return "24 đến 36 tháng";
    if (normalizedGrade === "Mẫu giáo nhỡ" || normalizedGrade === "4 đến 5 tuổi") return "3 đến 4 tuổi";
    if (normalizedGrade === "Mẫu giáo lớn" || normalizedGrade === "5 đến 6 tuổi") return "4 đến 5 tuổi";
  }

  return normalizedGrade;
}
