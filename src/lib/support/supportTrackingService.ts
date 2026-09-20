/**
 * supportTrackingService.ts
 * Dịch vụ xử lý dòng thời gian theo dõi (Timeline), ánh xạ trạng thái chuẩn SSM
 * và quy tắc chuyển tiếp năm học cho phân hệ Hỗ trợ học tập & Tâm lý học đường.
 */

export interface RawEvaluationItem {
  id: string
  periodType: "WEEK" | "MONTH" | string
  periodName: string
  trackingLevel: string
  comment: string
  updatedStatus?: string | null
  evaluatorId: string
  evaluatorName?: string
  createdAt: string | Date
}

export interface RawTargetItem {
  id: string
  studentId: string
  studentCode?: string
  studentName?: string
  className?: string
  supportType: "ACADEMIC" | "PSYCHOLOGICAL" | string
  sourceType: "ADMISSION" | "GVCN" | "GVBM" | "TAM_LY" | "TRANSFERRED" | string
  status: string
  terminationStatus: "ACTIVE" | "PENDING_TERMINATION" | "TERMINATED" | string
  reason?: string | null
  notes?: string | null
  startDate: string | Date
  endDate?: string | Date | null
  outcome?: string | null
  academicYearId: string
  academicYearName?: string
  leadTeacherName?: string
  evaluations?: RawEvaluationItem[]
  isTransferredOut?: boolean // Học sinh chuyển trường
}

export interface TimelineEvent {
  id: string
  date: string
  title: string
  type: "START" | "WEEKLY_LOG" | "MONTHLY_REVIEW" | "DECISION" | "YEAR_TRANSITION" | "TERMINATED"
  level?: string
  evaluatorName?: string
  summary: string
  detail?: string
  statusTag: {
    label: string
    variant: "status-neutral" | "status-info" | "status-warning" | "status-success" | "status-error"
  }
}

/**
 * Ánh xạ trạng thái nghiệp vụ sang nhãn và nhóm màu semantic chuẩn SSM
 */
export function mapSupportStatus(
  status?: string,
  terminationStatus?: string
): { label: string; variant: "status-neutral" | "status-info" | "status-warning" | "status-success" | "status-error" } {
  const term = String(terminationStatus || "").toUpperCase()
  const st = String(status || "").toUpperCase()

  if (term === "TERMINATED" || st === "TERMINATED" || st === "DA_CHAM_DUT") {
    return { label: "Đã chấm dứt theo dõi", variant: "status-success" }
  }
  if (term === "PENDING_TERMINATION" || st === "PENDING_TERMINATION" || st === "CHO_KET_LUAN") {
    return { label: "Chờ duyệt chấm dứt", variant: "status-warning" }
  }
  if (st === "NEED_ATTENTION" || st === "CAN_CHU_Y") {
    return { label: "Cần chú ý đặc biệt", variant: "status-warning" }
  }
  if (st === "IMPROVING" || st === "DANG_CAI_THIEN") {
    return { label: "Đang tiến triển tốt", variant: "status-info" }
  }
  if (st === "CONTINUED" || st === "TIEP_TUC_THEO_DOI") {
    return { label: "Tiếp tục theo dõi", variant: "status-info" }
  }
  if (st === "NEW" || st === "MOI_TAO") {
    return { label: "Mới tạo hồ sơ", variant: "status-neutral" }
  }
  return { label: "Đang theo dõi", variant: "status-info" }
}

/**
 * Ánh xạ nhãn nguồn gốc hồ sơ theo dõi
 */
export function mapSupportSourceLabel(sourceType?: string): { label: string; isAuto: boolean } {
  const s = String(sourceType || "").toUpperCase()
  if (s === "ADMISSION" || s === "KHAO_SAT_DAU_VAO") {
    return { label: "Tự động từ khảo sát đầu vào", isAuto: true }
  }
  if (s === "TRANSFERRED" || s === "CHUYEN_TIEP") {
    return { label: "Chuyển tiếp từ năm trước", isAuto: true }
  }
  if (s === "GVCN") {
    return { label: "Đề xuất từ GVCN", isAuto: false }
  }
  if (s === "GVBM") {
    return { label: "Đề xuất từ GV bộ môn", isAuto: false }
  }
  if (s === "TAM_LY") {
    return { label: "Bộ phận Tâm lý học đường", isAuto: false }
  }
  return { label: "Bổ sung thủ công", isAuto: false }
}

/**
 * Xây dựng dòng thời gian liên tục (Timeline) từ danh sách đánh giá
 */
export function buildSupportTimeline(target: RawTargetItem): TimelineEvent[] {
  const events: TimelineEvent[] = []

  // 1. Sự kiện khởi tạo
  const startDateStr = target.startDate
    ? new Date(target.startDate).toLocaleDateString("vi-VN")
    : "Đầu năm học"
  const sourceInfo = mapSupportSourceLabel(target.sourceType)

  events.push({
    id: `start-${target.id}`,
    date: startDateStr,
    title: "Bắt đầu lập hồ sơ theo dõi",
    type: "START",
    summary: `Nguồn tiếp nhận: ${sourceInfo.label}. Lý do: ${target.reason || "Kế hoạch hỗ trợ định kỳ"}.`,
    detail: target.notes || undefined,
    statusTag: { label: "Khởi tạo", variant: "status-neutral" }
  })

  // 2. Các đợt theo dõi tuần & đánh giá tháng
  const sortedEvals = [...(target.evaluations || [])].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  for (const ev of sortedEvals) {
    const evDateStr = new Date(ev.createdAt).toLocaleDateString("vi-VN")
    const isMonthly = ev.periodType === "MONTH"

    let variant: "status-neutral" | "status-info" | "status-warning" | "status-success" | "status-error" = "status-info"
    if (ev.trackingLevel === "TOT" || ev.trackingLevel === "DAT" || ev.trackingLevel === "TIEN_TRIEN_TOT") {
      variant = "status-success"
    } else if (ev.trackingLevel === "CAN_CHU_Y" || ev.trackingLevel === "KHO_KHAN") {
      variant = "status-warning"
    }

    events.push({
      id: ev.id,
      date: evDateStr,
      title: isMonthly ? `Đánh giá tháng: ${ev.periodName}` : `Theo dõi tuần: ${ev.periodName}`,
      type: isMonthly ? "MONTHLY_REVIEW" : "WEEKLY_LOG",
      level: ev.trackingLevel,
      evaluatorName: ev.evaluatorName,
      summary: ev.comment,
      statusTag: {
        label: isMonthly ? `Đánh giá tháng (${ev.trackingLevel || "Đạt"})` : `Theo dõi tuần`,
        variant
      }
    })
  }

  // 3. Sự kiện kết thúc nếu có
  if (target.terminationStatus === "TERMINATED" && target.endDate) {
    const endDateStr = new Date(target.endDate).toLocaleDateString("vi-VN")
    events.push({
      id: `end-${target.id}`,
      date: endDateStr,
      title: "Chấm dứt theo dõi",
      type: "TERMINATED",
      summary: `Hồ sơ đã đạt mục tiêu hoặc hoàn thành kế hoạch hỗ trợ. Kết luận: ${target.outcome || "Đạt yêu cầu"}.`,
      statusTag: { label: "Đã hoàn thành", variant: "status-success" }
    })
  }

  return events
}

/**
 * Kiểm tra quy tắc chuyển tiếp năm học tự động (Auto Carry Forward)
 * Quy tắc: Học sinh còn theo dõi khi kết thúc năm học được chuyển sang năm sau, TRỪ học sinh chuyển trường.
 */
export function checkYearEndTransitionEligibility(target: RawTargetItem): {
  eligible: boolean
  reason: string
  action: "CARRY_FORWARD" | "TERMINATE" | "EXCLUDE_TRANSFERRED"
} {
  // 1. Nếu học sinh chuyển trường -> Loại trừ ngay
  if (target.isTransferredOut) {
    return {
      eligible: false,
      reason: "Học sinh đã làm thủ tục chuyển trường, giữ nguyên lịch sử năm cũ, không chuyển tiếp năm sau.",
      action: "EXCLUDE_TRANSFERRED"
    }
  }

  // 2. Nếu hồ sơ đã chấm dứt (TERMINATED) -> Không chuyển tiếp
  if (target.terminationStatus === "TERMINATED") {
    return {
      eligible: false,
      reason: "Hồ sơ theo dõi đã hoàn thành và chấm dứt trong năm học hiện tại.",
      action: "TERMINATE"
    }
  }

  // 3. Học sinh còn đang theo dõi (ACTIVE) -> Chuyển tiếp năm sau
  return {
    eligible: true,
    reason: "Học sinh vẫn đang trong quá trình theo dõi hỗ trợ; tự động chuyển tiếp hồ sơ sang năm học mới.",
    action: "CARRY_FORWARD"
  }
}
