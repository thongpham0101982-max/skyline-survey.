/**
 * advisoryGapService.ts
 * Service tính toán khoảng cách mục tiêu (GAP) và tiến độ thống nhất cho SSM K12.
 * Công thức: GAP = Target - Current.
 * Bảo đảm:
 * 1. Nguồn dữ liệu Current lấy đúng kỳ đánh giá (KSCL, GK1, CK1, GK2, CK2).
 * 2. Không sinh mã lỗi NaN hoặc undefined.
 * 3. Hỗ trợ hiển thị chuỗi diễn biến (Trend): 6.0 -> 6.7 -> 7.2 -> Target 8.0.
 * 4. Các mục tiêu phi môn học đo lường theo trạng thái tiến độ Rubric.
 */

export interface TermScoreItem {
  periodKey: "KSCL" | "GK1" | "CK1" | "GK2" | "CK2"
  periodLabel: string
  score: number | null
}

export interface SubjectGapAnalysis {
  subjectCode: string
  subjectName: string
  targetScore: number
  currentScore: number | null
  currentPeriod: string | null
  gap: number | null // Target - Current
  status: "DAT_VUOT_MUC_TIEU" | "TIEM_CAN" | "CAN_NO_LUC" | "CHUA_CO_DIEM"
  statusLabel: string
  statusColor: string
  trend: TermScoreItem[]
  trendText: string
}

/**
 * Tính toán GAP cho một môn học cụ thể
 */
export function calculateSubjectGap(
  targetScore: number,
  scoresByPeriod: Partial<Record<"KSCL" | "GK1" | "CK1" | "GK2" | "CK2", number>>,
  subjectCode: string,
  subjectName: string
): SubjectGapAnalysis {
  const periodsOrder: Array<"KSCL" | "GK1" | "CK1" | "GK2" | "CK2"> = ["KSCL", "GK1", "CK1", "GK2", "CK2"]
  const periodLabels: Record<string, string> = {
    KSCL: "Khảo sát đầu năm",
    GK1: "Giữa HK1",
    CK1: "Cuối HK1",
    GK2: "Giữa HK2",
    CK2: "Cuối HK2"
  }

  const trend: TermScoreItem[] = []
  let latestScore: number | null = null
  let latestPeriod: string | null = null

  // Duyệt theo thứ tự thời gian để xác định điểm hiện tại mới nhất
  for (const p of periodsOrder) {
    const val = scoresByPeriod[p]
    if (typeof val === "number" && !isNaN(val)) {
      trend.push({ periodKey: p, periodLabel: periodLabels[p], score: val })
      latestScore = val
      latestPeriod = periodLabels[p]
    }
  }

  if (latestScore === null || isNaN(latestScore)) {
    return {
      subjectCode,
      subjectName,
      targetScore,
      currentScore: null,
      currentPeriod: null,
      gap: null,
      status: "CHUA_CO_DIEM",
      statusLabel: "Chưa có điểm thực tế",
      statusColor: "status-neutral",
      trend,
      trendText: `Mục tiêu: ${targetScore.toFixed(1)} (Chưa có kết quả)`
    }
  }

  // Công thức chuẩn: GAP = Target - Current
  const rawGap = Math.round((targetScore - latestScore) * 10) / 10

  let status: SubjectGapAnalysis["status"] = "CAN_NO_LUC"
  let statusLabel = `Còn thiếu ${rawGap > 0 ? "+" + rawGap.toFixed(1) : rawGap.toFixed(1)} điểm`
  let statusColor = "status-info"

  if (latestScore >= targetScore) {
    status = "DAT_VUOT_MUC_TIEU"
    const diff = latestScore - targetScore
    statusLabel = diff > 0 ? `Vượt mục tiêu (+${diff.toFixed(1)})` : "Đã đạt mục tiêu"
    statusColor = "status-success"
  } else if (rawGap <= 0.5) {
    status = "TIEM_CAN"
    statusLabel = `Tiệm cận (-${rawGap.toFixed(1)})`
    statusColor = "status-warning"
  } else {
    status = "CAN_NO_LUC"
    statusLabel = `GAP: ${rawGap > 0 ? "+" : ""}${rawGap.toFixed(1)}`
    statusColor = "status-info"
  }

  // Tạo chuỗi Trend dạng compact: 6.0 -> 6.7 -> 7.2 -> Target 8.0
  const trendParts = trend.map(t => `${t.periodKey}: ${t.score?.toFixed(1)}`)
  trendParts.push(`Mục tiêu: ${targetScore.toFixed(1)}`)
  const trendText = trendParts.join(" → ")

  return {
    subjectCode,
    subjectName,
    targetScore,
    currentScore: latestScore,
    currentPeriod: latestPeriod,
    gap: rawGap,
    status,
    statusLabel,
    statusColor,
    trend,
    trendText
  }
}

/**
 * Đo lường tiến độ mục tiêu phi môn học (Sức khỏe, sở thích, thói quen, phẩm chất...)
 */
export interface NonSubjectGoalProgress {
  categoryKey: string
  targetText: string
  progressStatus: "CHUA_BAT_DAU" | "DANG_THUC_HIEN" | "DAT" | "CAN_DIEU_CHINH"
  progressLabel: string
  progressPercent: number
  teacherNotes?: string
}

export function evaluateNonSubjectGoalProgress(
  statusString?: string,
  teacherNotes?: string
): { status: NonSubjectGoalProgress["progressStatus"]; label: string; percent: number } {
  const s = String(statusString || "").toUpperCase().trim()

  if (s === "DAT" || s === "HOAN_THANH" || s === "COMPLETED") {
    return { status: "DAT", label: "Đã đạt mục tiêu", percent: 100 }
  }
  if (s === "TIEN_TRIEN" || s === "IN_PROGRESS" || s === "DANG_TIEN_TRIEN") {
    return { status: "DANG_THUC_HIEN", label: "Đang nỗ lực thực hiện", percent: 60 }
  }
  if (s === "CAN_CO_GANG" || s === "CAN_DIEU_CHINH" || s === "PARTIAL") {
    return { status: "CAN_DIEU_CHINH", label: "Cần hỗ trợ điều chỉnh", percent: 30 }
  }
  return { status: "CHUA_BAT_DAU", label: "Chưa bắt đầu", percent: 0 }
}
