import {
  QaChecklistStep,
  QaComputedDeadlineInfo,
  QaRecurrenceRule,
  QaWorkflowStatus,
  QaWorkspaceCardConfig,
} from "./types"

export const WORKFLOW_STATUS_CONFIG: Record<
  QaWorkflowStatus,
  {
    label: string
    shortLabel: string
    badgeClass: string
    dotClass: string
    stepOrder: number
  }
> = {
  DRAFT: {
    label: "Nháp",
    shortLabel: "Nháp",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    dotClass: "bg-slate-400",
    stepOrder: 1,
  },
  ASSIGNED: {
    label: "Đã giao",
    shortLabel: "Đã giao",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    dotClass: "bg-violet-500",
    stepOrder: 2,
  },
  IN_PROGRESS: {
    label: "Đang thực hiện",
    shortLabel: "Đang làm",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
    stepOrder: 3,
  },
  PENDING_REVIEW: {
    label: "Chờ duyệt",
    shortLabel: "Chờ duyệt",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    dotClass: "bg-amber-500",
    stepOrder: 4,
  },
  NEEDS_REVISION: {
    label: "Cần bổ sung",
    shortLabel: "Cần bổ sung",
    badgeClass: "bg-orange-50 text-orange-800 border-orange-300",
    dotClass: "bg-orange-500",
    stepOrder: 3,
  },
  COMPLETED: {
    label: "Hoàn thành",
    shortLabel: "Hoàn thành",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
    stepOrder: 5,
  },
  PAUSED: {
    label: "Tạm dừng",
    shortLabel: "Tạm dừng",
    badgeClass: "bg-slate-200 text-slate-700 border-slate-300",
    dotClass: "bg-slate-500",
    stepOrder: 0,
  },
  CANCELLED: {
    label: "Đã hủy",
    shortLabel: "Đã hủy",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 line-through",
    dotClass: "bg-rose-400",
    stepOrder: 0,
  },
}

/**
 * 6 Thẻ truy cập chức năng trong Không gian công việc (Phân biệt rõ với Nhóm nhân sự tổ chức TaskGroup)
 */
export const DEFAULT_WORKSPACE_CARDS: QaWorkspaceCardConfig[] = [
  {
    key: "KHAO_THI",
    title: "Khảo thí",
    subtitle: "Tổ chức kỳ thi, ma trận đề & chuẩn đầu ra",
    description:
      "Điều hành công tác đề kiểm tra định kỳ, khảo thí số OMR/LMS, kỳ thi học sinh giỏi và chứng chỉ quốc tế Cambridge/IELTS.",
    shortDescription:
      "Điều hành công tác đề kiểm tra định kỳ, khảo thí số OMR/LMS, kỳ thi học sinh giỏi và chứng chỉ quốc tế Cambridge/IELTS.",
    badgeText: "KHẢO THÍ & ĐỀ THI",
    gradientClass: "from-violet-600/15 via-indigo-500/10 to-sky-500/15",
    gradientFrom: "#F3E8FF",
    gradientTo: "#E0E7FF",
    accentColor: "#6D28D9",
    illustrationType: "exam_desk",
    linkedGroupNames: ["Khảo thí Phổ thông", "Khảo thí Tổng hợp", "Khảo thí TA&CTQT", "Khảo thí"],
    defaultCategory: "Khảo thí & Đề kiểm tra",
    quickLinks: [
      { label: "Khảo thí Số (OMR & LMS)", href: "/admin/ktdbcl/khao-thi-so" },
      { label: "Khảo thí Quốc tế & Chứng chỉ", href: "/admin/ktdbcl/international-exams" },
      { label: "Quản lý Kỳ thi & Thành tích", href: "/admin/ktdbcl/exams" },
      { label: "Phân tích THKQ", href: "/admin/ktdbcl/phan-tich-thkq" },
    ],
  },
  {
    key: "DBCL",
    title: "Đảm bảo chất lượng",
    subtitle: "Kiểm định, khảo sát phản hồi & cải tiến CAPA",
    description:
      "Giám sát chất lượng dạy học, dự giờ PTCM, khảo sát sự hài lòng PHHS/HS (NPS/CSAT) và theo dõi hành động cải tiến chất lượng.",
    shortDescription:
      "Giám sát chất lượng dạy học, dự giờ PTCM, khảo sát sự hài lòng PHHS/HS (NPS/CSAT) và theo dõi hành động cải tiến chất lượng.",
    badgeText: "KIỂM ĐỊNH & CẢI TIẾN",
    gradientClass: "from-teal-600/15 via-emerald-500/10 to-cyan-500/15",
    gradientFrom: "#CCFBF1",
    gradientTo: "#E0F2FE",
    accentColor: "#00A19A",
    illustrationType: "quality_shield",
    linkedGroupNames: ["ĐBCL Học sinh", "ĐBCL Giáo viên", "ĐBCL", "Đảm bảo chất lượng"],
    defaultCategory: "Đảm bảo chất lượng",
    quickLinks: [
      { label: "Chất lượng Phối hợp & Cải tiến", href: "/admin/ktdbcl/chat-luong-phoi-hop?tab=improvements" },
      { label: "KT&ĐBCL Connect", href: "/admin/ktdbcl/connect" },
      { label: "Tổng hợp Dự giờ & PTCM", href: "/admin/tong-hop-du-gio" },
      { label: "Quản lý Khảo sát & NPS", href: "/admin/surveys" },
    ],
  },
  {
    key: "LMS_KSDV",
    title: "LMS & Khảo sát đầu vào",
    subtitle: "Đánh giá năng lực đầu vào & học liệu số",
    description:
      "Quản lý đợt khảo sát đầu vào K-12 & Mầm non, phân công chấm bài, xét duyệt kết quả định hướng và đồng bộ ngân hàng ĐGNL.",
    shortDescription:
      "Quản lý đợt khảo sát đầu vào K-12 & Mầm non, phân công chấm bài, xét duyệt kết quả định hướng và đồng bộ ngân hàng ĐGNL.",
    badgeText: "LMS & ĐẦU VÀO",
    gradientClass: "from-sky-600/15 via-blue-500/10 to-indigo-500/15",
    gradientFrom: "#E0F2FE",
    gradientTo: "#EDE9FE",
    accentColor: "#0284C7",
    illustrationType: "lms_assessment",
    linkedGroupNames: ["Khảo thí Phổ thông", "Khảo thí TA&CTQT", "LMS & Khảo sát đầu vào"],
    defaultCategory: "Khảo Sát",
    quickLinks: [
      { label: "Điều hành Tiến độ KSĐV", href: "/admin/dieu-hanh-khao-sat" },
      { label: "Phân công Khảo sát", href: "/admin/phan-cong-khao-sat" },
      { label: "Xét duyệt Kết quả KSĐV", href: "/admin/xet-duyet-ket-qua" },
      { label: "Quản lý ĐGNL (Radar)", href: "/admin/competency-assessment/import" },
    ],
  },
  {
    key: "BAO_CAO_DU_LIEU",
    title: "Báo cáo & dữ liệu",
    subtitle: "Tổng hợp số liệu, sổ điểm & báo cáo tuần",
    description:
      "Thống kê đa chiều tiến độ nhập điểm, phổ điểm, tổng hợp báo cáo tuần Ban KT&ĐBCL và xuất dữ liệu minh chứng kiểm định.",
    shortDescription:
      "Thống kê đa chiều tiến độ nhập điểm, phổ điểm, tổng hợp báo cáo tuần Ban KT&ĐBCL và xuất dữ liệu minh chứng kiểm định.",
    badgeText: "BÁO CÁO & DỮ LIỆU",
    gradientClass: "from-amber-500/15 via-orange-500/10 to-yellow-500/15",
    gradientFrom: "#FEF3C7",
    gradientTo: "#FFEDD5",
    accentColor: "#D97706",
    illustrationType: "ANALYTICS_SCREEN",
    linkedGroupNames: ["Khảo thí Tổng hợp", "ĐBCL", "Báo cáo & dữ liệu"],
    defaultCategory: "Báo cáo & Thống kê",
    quickLinks: [
      { label: "Báo cáo Tuần KT&ĐBCL", href: "/admin/weekly-reports" },
      { label: "Thống kê Sổ điểm & Phổ điểm", href: "/admin/ktdbcl/thong-ke-bao-cao" },
      { label: "Hỗ trợ Học tập", href: "/admin/ktdbcl/support" },
      { label: "Import KQHT", href: "/admin/ktdbcl/import-kqht?v=2.1" },
    ],
  },
  {
    key: "CONG_VIEC_THANH_VIEN",
    title: "Công việc & thành viên",
    subtitle: "Điều phối nhóm, hồ sơ thành viên & phân quyền",
    description:
      "Quản lý cơ cấu nhóm chuyên môn, chỉ định người điều phối, theo dõi khối lượng công việc từng chuyên viên và tháo gỡ vướng mắc.",
    shortDescription:
      "Quản lý cơ cấu nhóm chuyên môn, chỉ định người điều phối, theo dõi khối lượng công việc từng chuyên viên và tháo gỡ vướng mắc.",
    badgeText: "NHÓM & THÀNH VIÊN",
    gradientClass: "from-purple-600/15 via-fuchsia-500/10 to-pink-500/15",
    gradientFrom: "#FAE8FF",
    gradientTo: "#FCE7F3",
    accentColor: "#7C3AED",
    illustrationType: "TEAM_HUB",
    linkedGroupNames: [
      "Khảo thí Phổ thông",
      "Khảo thí Tổng hợp",
      "Khảo thí TA&CTQT",
      "ĐBCL Học sinh",
      "ĐBCL Giáo viên",
    ],
    defaultCategory: "Điều phối nội bộ",
    quickLinks: [
      { label: "Mở Phòng điều hành", href: "?mode=command_room" },
      { label: "Quản lý Nhóm & Điều phối", href: "?modal=groups" },
      { label: "Xem Lịch công tác", href: "?mode=calendar" },
      { label: "Bảng Kanban", href: "?mode=kanban" },
    ],
  },
  {
    key: "TRO_LY_DIEU_HANH",
    title: "Trợ lý điều hành",
    subtitle: "QA Assistant giao việc tự nhiên & nhắc việc",
    description:
      "Trợ lý thông minh hỗ trợ chuyển yêu cầu ngôn ngữ tự nhiên thành phiếu giao việc chuẩn, cảnh báo hạn bước xử lý và soạn báo cáo tuần.",
    shortDescription:
      "Trợ lý thông minh hỗ trợ chuyển yêu cầu ngôn ngữ tự nhiên thành phiếu giao việc chuẩn, cảnh báo hạn bước xử lý và soạn báo cáo tuần.",
    badgeText: "QA ASSISTANT AI",
    gradientClass: "from-indigo-600/20 via-violet-500/15 to-teal-500/15",
    gradientFrom: "#E0E7FF",
    gradientTo: "#F3E8FF",
    accentColor: "#4F46E5",
    illustrationType: "AI_ASSISTANT",
    linkedGroupNames: ["Khảo thí Tổng hợp", "ĐBCL"],
    defaultCategory: "Điều hành chung",
    quickLinks: [
      { label: "Mở QA Assistant", href: "?assistant=open" },
      { label: "Soạn Phiếu giao việc bằng AI", href: "?assistant=open" },
      { label: "Tổng hợp Vướng mắc", href: "?assistant=open" },
      { label: "Báo cáo Tuần", href: "/admin/weekly-reports" },
    ],
  },
]

/**
 * Chuyển đổi thời điểm sang cuối ngày (23:59:59.999) theo múi giờ Asia/Ho_Chi_Minh (+07:00)
 * nếu chuỗi đầu vào chỉ có ngày YYYY-MM-DD hoặc có giờ 00:00:00 UTC.
 */
export function resolveDeadlineTimestampAsiaHoChiMinh(dateInput?: string | Date | null): number | null {
  if (!dateInput) return null
  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return new Date(`${trimmed}T23:59:59.999+07:00`).getTime()
    }
    const parsed = new Date(trimmed)
    if (isNaN(parsed.getTime())) return null
    if (trimmed.endsWith("T00:00:00.000Z")) {
      const ymd = trimmed.slice(0, 10)
      return new Date(`${ymd}T23:59:59.999+07:00`).getTime()
    }
    return parsed.getTime()
  }
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return null
  const iso = d.toISOString()
  if (iso.endsWith("T00:00:00.000Z")) {
    const ymd = iso.slice(0, 10)
    return new Date(`${ymd}T23:59:59.999+07:00`).getTime()
  }
  return d.getTime()
}

/**
 * Tính toán trạng thái quá hạn theo hạn của bước hiện tại (Mục V):
 * - Quá hạn là nhãn tính toán theo hạn của bước hiện tại.
 * - Phân biệt rõ "Chậm thực hiện" (OVERDUE_EXECUTION) và "Chậm duyệt" (OVERDUE_REVIEW).
 * - Đã gửi duyệt (PENDING_REVIEW) không đồng nghĩa đã hoàn thành.
 */
export function computeTaskDeadlineStatus(
  task: {
    endDate?: string | Date | null
    completedAt?: string | Date | null
    workflowStatus: QaWorkflowStatus
    reviewDueDate?: string | Date | null
    submittedForReviewAt?: string | Date | null
    checklist?: QaChecklistStep[]
    now?: Date
  },
  nowInput?: Date
): QaComputedDeadlineInfo {
  const effectiveNow = task.now || nowInput || new Date()
  const nowMs = effectiveNow.getTime()
  const status = task.workflowStatus

  if (status === "CANCELLED" || status === "PAUSED" || status === "DRAFT") {
    return {
      code: "INACTIVE",
      label: status === "DRAFT" ? "Bản nháp" : status === "PAUSED" ? "Đang tạm dừng" : "Đã hủy",
      isOverdue: false,
      isOverdueExecution: false,
      isOverdueReview: false,
      isDueSoon: false,
      activeStep: "INACTIVE",
      activeStepDeadline: null,
      hoursRemaining: null,
      badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    }
  }

  const execDeadlineMs = resolveDeadlineTimestampAsiaHoChiMinh(task.endDate)
  const reviewDeadlineMs =
    resolveDeadlineTimestampAsiaHoChiMinh(task.reviewDueDate) ||
    (execDeadlineMs ? execDeadlineMs + 48 * 3600 * 1000 : null)

  // Trường hợp đã hoàn thành: phân biệt Hoàn thành đúng hạn và Hoàn thành trễ hạn
  if (status === "COMPLETED") {
    const completedMs = task.completedAt ? new Date(task.completedAt).getTime() : nowMs
    const submittedMs = task.submittedForReviewAt
      ? new Date(task.submittedForReviewAt).getTime()
      : completedMs
    const wasLate = execDeadlineMs ? submittedMs > execDeadlineMs : false
    return {
      code: wasLate ? "COMPLETED_LATE" : "COMPLETED_ON_TIME",
      label: wasLate ? "Hoàn thành trễ hạn" : "Hoàn thành đúng hạn",
      isOverdue: false,
      isOverdueExecution: false,
      isOverdueReview: false,
      isDueSoon: false,
      activeStep: "DONE",
      activeStepDeadline: execDeadlineMs ? new Date(execDeadlineMs).toISOString() : null,
      hoursRemaining: 0,
      badgeClass: wasLate
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-emerald-50 text-emerald-700 border-emerald-200",
    }
  }

  // Trường hợp đang Chờ duyệt (PENDING_REVIEW): tính theo hạn duyệt (reviewDueDate)
  if (status === "PENDING_REVIEW") {
    if (reviewDeadlineMs && nowMs > reviewDeadlineMs) {
      const hoursOver = Math.round((nowMs - reviewDeadlineMs) / (3600 * 1000))
      return {
        code: "OVERDUE_REVIEW",
        label: "Chậm duyệt",
        isOverdue: true,
        isOverdueExecution: false,
        isOverdueReview: true,
        isDueSoon: false,
        activeStep: "REVIEW",
        activeStepDeadline: new Date(reviewDeadlineMs).toISOString(),
        hoursRemaining: -hoursOver,
        badgeClass: "bg-purple-100 text-purple-900 border-purple-300",
      }
    }
    const hrsLeft = reviewDeadlineMs ? Math.round((reviewDeadlineMs - nowMs) / (3600 * 1000)) : null
    return {
      code: hrsLeft !== null && hrsLeft <= 24 ? "DUE_SOON" : "ON_TIME",
      label: hrsLeft !== null && hrsLeft <= 24 ? "Sắp đến hạn duyệt" : "Đang chờ duyệt",
      isOverdue: false,
      isOverdueExecution: false,
      isOverdueReview: false,
      isDueSoon: hrsLeft !== null && hrsLeft <= 24,
      activeStep: "REVIEW",
      activeStepDeadline: reviewDeadlineMs ? new Date(reviewDeadlineMs).toISOString() : null,
      hoursRemaining: hrsLeft,
      badgeClass:
        hrsLeft !== null && hrsLeft <= 24
          ? "bg-amber-100 text-amber-900 border-amber-300"
          : "bg-amber-50 text-amber-800 border-amber-200",
    }
  }

  // Trường hợp đang ở bước thực hiện (ASSIGNED, IN_PROGRESS, NEEDS_REVISION):
  const activeSubstepWithDue = (task.checklist || [])
    .filter((s) => !s.completed && s.dueDate)
    .sort((a, b) => (a.order || 0) - (b.order || 0))[0]

  const stepDeadlineMs = activeSubstepWithDue?.dueDate
    ? resolveDeadlineTimestampAsiaHoChiMinh(activeSubstepWithDue.dueDate)
    : execDeadlineMs

  const effectiveMs = stepDeadlineMs || execDeadlineMs
  if (!effectiveMs) {
    return {
      code: "ON_TIME",
      label: "Đúng tiến độ",
      isOverdue: false,
      isOverdueExecution: false,
      isOverdueReview: false,
      isDueSoon: false,
      activeStep: "EXECUTION",
      activeStepDeadline: null,
      hoursRemaining: null,
      badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    }
  }

  const diffHours = Math.round((effectiveMs - nowMs) / (3600 * 1000))
  if (nowMs > effectiveMs) {
    return {
      code: "OVERDUE_EXECUTION",
      label: "Chậm thực hiện",
      isOverdue: true,
      isOverdueExecution: true,
      isOverdueReview: false,
      isDueSoon: false,
      activeStep: "EXECUTION",
      activeStepDeadline: new Date(effectiveMs).toISOString(),
      hoursRemaining: diffHours,
      badgeClass: "bg-red-100 text-red-800 border-red-300",
    }
  }

  if (diffHours <= 36) {
    return {
      code: "DUE_SOON",
      label: "Sắp đến hạn",
      isOverdue: false,
      isOverdueExecution: false,
      isOverdueReview: false,
      isDueSoon: true,
      activeStep: "EXECUTION",
      activeStepDeadline: new Date(effectiveMs).toISOString(),
      hoursRemaining: diffHours,
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    }
  }

  return {
    code: "ON_TIME",
    label: "Đúng hạn",
    isOverdue: false,
    isOverdueExecution: false,
    isOverdueReview: false,
    isDueSoon: false,
    activeStep: "EXECUTION",
    activeStepDeadline: new Date(effectiveMs).toISOString(),
    hoursRemaining: diffHours,
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }
}

/**
 * Kiểm tra tính hợp lệ khi chuyển trạng thái luồng công việc (Mục V)
 */
export function validateWorkflowTransition(
  fromStatus: QaWorkflowStatus,
  toStatus: QaWorkflowStatus,
  options: {
    requiresApproval: boolean
    isReviewerOrManager: boolean
    reason?: string | null
  }
): { valid: boolean; error?: string } {
  if (fromStatus === toStatus) return { valid: true }

  const requiresReason =
    toStatus === "PAUSED" ||
    toStatus === "CANCELLED" ||
    toStatus === "NEEDS_REVISION" ||
    (fromStatus === "COMPLETED" && toStatus === "IN_PROGRESS") ||
    (fromStatus === "CANCELLED" && toStatus === "IN_PROGRESS") ||
    (fromStatus === "PAUSED" && toStatus === "IN_PROGRESS")

  if (requiresReason && (!options.reason || !options.reason.trim())) {
    return {
      valid: false,
      error: "Vui lòng nhập lý do khi thực hiện thao tác Cần bổ sung / Tạm dừng / Hủy / Mở lại nhiệm vụ.",
    }
  }

  if (toStatus === "COMPLETED" && options.requiresApproval && !options.isReviewerOrManager) {
    return {
      valid: false,
      error: "Nhiệm vụ này yêu cầu phê duyệt nghiệm thu. Vui lòng bấm 'Gửi duyệt' (Chờ duyệt) để người duyệt xác nhận hoàn thành.",
    }
  }

  if (
    (fromStatus === "PENDING_REVIEW" && (toStatus === "COMPLETED" || toStatus === "NEEDS_REVISION")) &&
    !options.isReviewerOrManager
  ) {
    return {
      valid: false,
      error: "Chỉ Người duyệt hoặc Quản lý Ban mới có quyền nghiệm thu hoặc trả bổ sung nhiệm vụ.",
    }
  }

  return { valid: true }
}

/**
 * Tính tiến độ checklist độc lập với đánh giá chất lượng kết quả
 */
export function computeChecklistMetrics(checklist: QaChecklistStep[] = []): {
  totalSteps: number
  completedSteps: number
  percent: number
  currentStep: QaChecklistStep | null
  nextStep: QaChecklistStep | null
} {
  if (!Array.isArray(checklist) || checklist.length === 0) {
    return {
      totalSteps: 0,
      completedSteps: 0,
      percent: 0,
      currentStep: null,
      nextStep: null,
    }
  }

  const sorted = [...checklist].sort((a, b) => (a.order || 0) - (b.order || 0))
  const completedSteps = sorted.filter((s) => s.completed).length
  const pending = sorted.filter((s) => !s.completed)

  return {
    totalSteps: sorted.length,
    completedSteps,
    percent: Math.round((completedSteps / sorted.length) * 100),
    currentStep: pending[0] || null,
    nextStep: pending[1] || null,
  }
}

/**
 * Kiểm tra phụ thuộc giữa các bước checklist trước khi đánh dấu hoàn thành.
 * Hỗ trợ truyền (stepId, checklist) hoặc (checklist, stepId).
 */
export function canCompleteChecklistStep(
  arg1: string | QaChecklistStep[],
  arg2: QaChecklistStep[] | string
): { allowed: boolean; blockerStepTitle?: string; blockedByTitle?: string } {
  const stepId = typeof arg1 === "string" ? arg1 : String(arg2)
  const checklist = Array.isArray(arg1) ? arg1 : Array.isArray(arg2) ? arg2 : []

  const step = checklist.find((s) => s.id === stepId)
  if (!step || !step.dependsOnStepId) return { allowed: true }
  const dep = checklist.find((s) => s.id === step.dependsOnStepId)
  if (dep && !dep.completed) {
    return {
      allowed: false,
      blockerStepTitle: dep.title,
      blockedByTitle: dep.title,
    }
  }
  return { allowed: true }
}

/**
 * Sinh khóa định danh kỳ phát hành cho việc định kỳ (Tuần/Tháng) theo múi giờ Asia/Ho_Chi_Minh
 * để chống sinh trùng khi tác vụ chạy lại nhiều lần.
 */
export function buildRecurrenceInstanceKey(
  templateId: string,
  ruleOrFrequency: QaRecurrenceRule | "WEEKLY" | "MONTHLY",
  referenceDate: Date = new Date()
): string {
  const frequency =
    typeof ruleOrFrequency === "string" ? ruleOrFrequency : ruleOrFrequency.frequency

  const vnTime = new Date(referenceDate.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
  const year = vnTime.getFullYear()
  const month = String(vnTime.getMonth() + 1).padStart(2, "0")

  if (frequency === "MONTHLY") {
    return `REC:${templateId}:${year}-M${month}`
  }

  const startOfYear = new Date(year, 0, 1)
  const days = Math.floor((vnTime.getTime() - startOfYear.getTime()) / (24 * 3600 * 1000))
  const weekNumber = String(Math.ceil((days + startOfYear.getDay() + 1) / 7)).padStart(2, "0")
  return `REC:${templateId}:${year}-W${weekNumber}`
}
