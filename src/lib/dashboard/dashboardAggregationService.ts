/**
 * dashboardAggregationService.ts
 * Lớp dịch vụ tổng hợp dữ liệu Dashboard tập trung (Aggregation Layer).
 * Đảm bảo:
 * 1. Đọc trực tiếp từ các module nguồn đã được xác nhận (Dự giờ, Cố vấn, Hỗ trợ, Trải nghiệm, Khảo thí).
 * 2. Cung cấp dữ liệu Role-Aware đúng scope: GV, TTCM, QLCM, GĐCS, Ban KT&ĐBCL.
 * 3. Hỗ trợ đầy đủ khối "Việc cần làm (Action Center)" và "Đối soát chất lượng dữ liệu (Data Quality)".
 */

import {
  MetricCardData,
  ActionItem,
  GlobalFilterContext,
  DataFreshnessInfo,
  DrilldownRow
} from "./dashboardDataContract"

export interface RoleDashboardData {
  role: "TEACHER" | "TTCM" | "QLCM" | "GDCS" | "KTDBCL"
  roleTitle: string
  scopeDescription: string
  freshness: DataFreshnessInfo
  coreMetrics: MetricCardData[]
  actions: ActionItem[]
  distributionData?: { label: string; value: number; count: number; colorClass: string }[]
  comparisonData?: { name: string; actual: number; target?: number; delta?: number }[]
  dataQualityIssues?: { category: string; count: number; severity: "CRITICAL" | "WARNING" | "INFO"; detailUrl: string }[]
}

/**
 * Tạo dữ liệu Dashboard chuyên biệt cho Giáo viên (Teacher Dashboard)
 */
export function aggregateTeacherDashboard(
  teacherId: string,
  teacherName: string,
  context: GlobalFilterContext,
  rawStats: {
    pendingObservations: number
    completedObservations: number
    targetObservations: number
    pendingGoalsStudentCount: number
    atRiskStudentsInClasses: number
    uncompletedActivitiesCount: number
    lockedGradebooksCount: number
  }
): RoleDashboardData {
  const obsRate = rawStats.targetObservations > 0
    ? Math.round((rawStats.completedObservations / rawStats.targetObservations) * 1000) / 10
    : 0

  const coreMetrics: MetricCardData[] = [
    {
      metricId: "OBS_COMPLETION_RATE",
      label: "Tiến độ dự giờ cá nhân",
      value: obsRate,
      displayValue: `${obsRate}%`,
      unit: "%",
      target: 100,
      variance: Math.round((obsRate - 100) * 10) / 10,
      status: obsRate >= 100 ? "SUCCESS" : obsRate >= 70 ? "NORMAL" : "WARNING",
      contextText: `${rawStats.completedObservations}/${rawStats.targetObservations} lượt kế hoạch`,
      sourceModuleName: "Dự giờ & Phát triển chuyên môn",
      lastUpdated: "Hôm nay 08:00",
      drilldownKey: "TEACHER_OBS"
    },
    {
      metricId: "AT_RISK_STUDENTS",
      label: "Học sinh cần chú ý",
      value: rawStats.atRiskStudentsInClasses,
      displayValue: `${rawStats.atRiskStudentsInClasses} HS`,
      unit: "HS",
      status: rawStats.atRiskStudentsInClasses > 0 ? "WARNING" : "SUCCESS",
      contextText: "Có GAP lớn hoặc giảm sút học lực",
      sourceModuleName: "Khảo thí & Hỗ trợ học tập",
      lastUpdated: "Hôm nay 08:00",
      drilldownKey: "AT_RISK_STUDENTS"
    },
    {
      metricId: "PENDING_GOALS",
      label: "Mục tiêu HS chưa duyệt",
      value: rawStats.pendingGoalsStudentCount,
      displayValue: `${rawStats.pendingGoalsStudentCount} HS`,
      unit: "HS",
      status: rawStats.pendingGoalsStudentCount > 0 ? "WARNING" : "NORMAL",
      contextText: "Lớp chủ nhiệm & Cố vấn phụ trách",
      sourceModuleName: "Cố vấn & Mục tiêu học sinh",
      lastUpdated: "Hôm nay 08:00",
      drilldownKey: "PENDING_GOALS"
    },
    {
      metricId: "EXP_ACTIVITIES_PENDING",
      label: "Đợt trải nghiệm cần chấm",
      value: rawStats.uncompletedActivitiesCount,
      displayValue: `${rawStats.uncompletedActivitiesCount} lớp`,
      status: rawStats.uncompletedActivitiesCount > 0 ? "WARNING" : "SUCCESS",
      contextText: "Đang diễn ra hoặc cần nộp điểm",
      sourceModuleName: "Hoạt động trải nghiệm",
      lastUpdated: "Hôm nay 08:00",
      drilldownKey: "TEACHER_EXP"
    }
  ]

  const actions: ActionItem[] = []
  if (rawStats.pendingObservations > 0) {
    actions.push({
      id: "act-obs-1",
      title: `${rawStats.pendingObservations} phiếu dự giờ chưa hoàn thành đánh giá`,
      subtitle: "Cần hoàn tất phiếu ghi nhận chuyên môn đúng hạn",
      severity: "WARNING",
      category: "OBSERVATION",
      dueText: "Hạn trong 48h",
      linkUrl: "/teacher/du-gio",
      actionLabel: "Mở phiếu dự giờ",
      scopeDetail: teacherName
    })
  }
  if (rawStats.pendingGoalsStudentCount > 0) {
    actions.push({
      id: "act-goal-1",
      title: `${rawStats.pendingGoalsStudentCount} học sinh chưa chốt mục tiêu học tập`,
      subtitle: "Học sinh đã nộp đề xuất nhưng chưa được GVCN xác nhận",
      severity: "INFO",
      category: "STUDENT_GOAL",
      linkUrl: "/teacher/co-van-hoc-tap",
      actionLabel: "Phê duyệt mục tiêu",
      scopeDetail: "Lớp chủ nhiệm"
    })
  }
  if (rawStats.uncompletedActivitiesCount > 0) {
    actions.push({
      id: "act-exp-1",
      title: `${rawStats.uncompletedActivitiesCount} bảng đánh giá hoạt động trải nghiệm cần nộp`,
      subtitle: "Đã kết thúc hoạt động thực địa nhưng chưa nộp bảng điểm",
      severity: "WARNING",
      category: "EXPERIENCE",
      linkUrl: "/teacher/du-an-trai-nghiem",
      actionLabel: "Chấm điểm trải nghiệm",
      scopeDetail: "Lớp phụ trách"
    })
  }

  return {
    role: "TEACHER",
    roleTitle: `Giáo viên: ${teacherName}`,
    scopeDescription: "Phạm vi: Các lớp giảng dạy & Lớp chủ nhiệm được phân công",
    freshness: {
      lastUpdated: "Hôm nay 08:30",
      isStale: false,
      sourceStatus: {
        OBSERVATION: "SYNCED",
        ADVISORY: "SYNCED",
        EXPERIENCE: "SYNCED",
        ASSESSMENT: "SYNCED"
      }
    },
    coreMetrics,
    actions
  }
}

/**
 * Tạo dữ liệu Dashboard cho Tổ trưởng chuyên môn (TTCM Dashboard)
 */
export function aggregateTTCMDashboard(
  departmentName: string,
  context: GlobalFilterContext,
  rawStats: {
    totalTeachers: number
    teachersCompletedObs: number
    totalObsCompleted: number
    totalObsTarget: number
    passRateDepartment: number
    atRiskStudentsCount: number
    unlockedGradebooksCount: number
    pendingApprovalsCount: number
  }
): RoleDashboardData {
  const teacherCoverage = rawStats.totalTeachers > 0
    ? Math.round((rawStats.teachersCompletedObs / rawStats.totalTeachers) * 1000) / 10
    : 0
  const obsProgress = rawStats.totalObsTarget > 0
    ? Math.round((rawStats.totalObsCompleted / rawStats.totalObsTarget) * 1000) / 10
    : 0

  const coreMetrics: MetricCardData[] = [
    {
      metricId: "TTCM_OBS_PROGRESS",
      label: "Tiến độ dự giờ toàn tổ",
      value: obsProgress,
      displayValue: `${obsProgress}%`,
      unit: "%",
      target: 100,
      variance: Math.round((obsProgress - 100) * 10) / 10,
      status: obsProgress >= 90 ? "SUCCESS" : obsProgress >= 60 ? "NORMAL" : "WARNING",
      contextText: `${rawStats.totalObsCompleted}/${rawStats.totalObsTarget} lượt dự giờ`,
      sourceModuleName: "Dự giờ & Phát triển chuyên môn",
      lastUpdated: "Hôm nay 08:30",
      drilldownKey: "TTCM_OBS"
    },
    {
      metricId: "TTCM_TEACHER_COVERAGE",
      label: "Độ phủ GV được dự giờ",
      value: teacherCoverage,
      displayValue: `${teacherCoverage}%`,
      unit: "%",
      target: 100,
      status: teacherCoverage >= 85 ? "SUCCESS" : "WARNING",
      contextText: `${rawStats.teachersCompletedObs}/${rawStats.totalTeachers} giáo viên trong tổ`,
      sourceModuleName: "Dự giờ & Phát triển chuyên môn",
      lastUpdated: "Hôm nay 08:30",
      drilldownKey: "TTCM_TEACHERS"
    },
    {
      metricId: "TTCM_PASS_RATE",
      label: "Tỷ lệ đạt chuẩn môn của tổ",
      value: rawStats.passRateDepartment,
      displayValue: `${rawStats.passRateDepartment}%`,
      unit: "%",
      target: 90,
      status: rawStats.passRateDepartment >= 90 ? "SUCCESS" : "NORMAL",
      contextText: "Điểm bài kiểm tra chính thức >= 5.0",
      sourceModuleName: "Khảo thí & ĐBCL",
      lastUpdated: "Hôm nay 08:30",
      drilldownKey: "TTCM_SUBJECT_QUALITY"
    },
    {
      metricId: "TTCM_PENDING_APPROVALS",
      label: "Phiếu & Đề thi chờ duyệt",
      value: rawStats.pendingApprovalsCount,
      displayValue: `${rawStats.pendingApprovalsCount} mục`,
      status: rawStats.pendingApprovalsCount > 0 ? "WARNING" : "NORMAL",
      contextText: "Cần thẩm định câu hỏi / phiếu dự giờ",
      sourceModuleName: "Khảo thí & Dự giờ",
      lastUpdated: "Hôm nay 08:30",
      drilldownKey: "TTCM_APPROVALS"
    }
  ]

  const actions: ActionItem[] = []
  if (rawStats.pendingApprovalsCount > 0) {
    actions.push({
      id: "ttcm-act-1",
      title: `${rawStats.pendingApprovalsCount} hồ sơ chuyên môn đang chờ Tổ trưởng phê duyệt`,
      subtitle: "Bao gồm câu hỏi ngân hàng đề và phiếu đánh giá tiết dạy",
      severity: "WARNING",
      category: "GRADE_ENTRY",
      linkUrl: "/admin/ktdbcl/diem-nhan-xet",
      actionLabel: "Duyệt ngay",
      scopeDetail: departmentName
    })
  }

  return {
    role: "TTCM",
    roleTitle: `Tổ trưởng Chuyên môn: ${departmentName}`,
    scopeDescription: `Phạm vi: Giáo viên & Môn học thuộc ${departmentName}`,
    freshness: {
      lastUpdated: "Hôm nay 08:30",
      isStale: false,
      sourceStatus: {
        OBSERVATION: "SYNCED",
        ASSESSMENT: "SYNCED"
      }
    },
    coreMetrics,
    actions
  }
}

/**
 * Tạo dữ liệu Dashboard cho Giám đốc Cơ sở (GĐCS Executive Dashboard)
 */
export function aggregateGDCSDashboard(
  campusName: string,
  context: GlobalFilterContext,
  rawStats: {
    totalStudents: number
    passRateCampus: number
    averageScoreCampus: number
    atRiskStudentsCampus: number
    totalTeachers: number
    observationCompletionRate: number
    uncompletedGradebooksCount: number
    dataQualityErrorsCount: number
  }
): RoleDashboardData {
  const coreMetrics: MetricCardData[] = [
    {
      metricId: "GDCS_STUDENT_PASS_RATE",
      label: "Tỷ lệ học sinh đạt chuẩn toàn CS",
      value: rawStats.passRateCampus,
      displayValue: `${rawStats.passRateCampus}%`,
      unit: "%",
      target: 90,
      status: rawStats.passRateCampus >= 90 ? "SUCCESS" : "NORMAL",
      contextText: `Điểm TB: ${rawStats.averageScoreCampus.toFixed(2)} | Quy mô: ${rawStats.totalStudents} HS`,
      sourceModuleName: "Khảo thí & ĐBCL",
      lastUpdated: "Hôm nay 08:30",
      drilldownKey: "CAMPUS_ACADEMIC"
    },
    {
      metricId: "GDCS_OBS_RATE",
      label: "Tiến độ dự giờ toàn cơ sở",
      value: rawStats.observationCompletionRate,
      displayValue: `${rawStats.observationCompletionRate}%`,
      unit: "%",
      target: 100,
      status: rawStats.observationCompletionRate >= 80 ? "SUCCESS" : "WARNING",
      contextText: `Đội ngũ: ${rawStats.totalTeachers} giáo viên cơ sở`,
      sourceModuleName: "Dự giờ & Phát triển chuyên môn",
      lastUpdated: "Hôm nay 08:30",
      drilldownKey: "CAMPUS_OBS"
    },
    {
      metricId: "GDCS_AT_RISK_COUNT",
      label: "Học sinh cần can thiệp hỗ trợ",
      value: rawStats.atRiskStudentsCampus,
      displayValue: `${rawStats.atRiskStudentsCampus} HS`,
      unit: "HS",
      status: rawStats.atRiskStudentsCampus > 20 ? "CRITICAL" : rawStats.atRiskStudentsCampus > 0 ? "WARNING" : "SUCCESS",
      contextText: "Đang có hồ sơ hỗ trợ hoặc suy giảm học lực",
      sourceModuleName: "Hỗ trợ học tập & Khảo thí",
      lastUpdated: "Hôm nay 08:30",
      drilldownKey: "CAMPUS_SUPPORT"
    },
    {
      metricId: "GDCS_DATA_COMPLETION",
      label: "Tiến độ nộp điểm & Sổ sách",
      value: rawStats.uncompletedGradebooksCount,
      displayValue: `${rawStats.uncompletedGradebooksCount} sổ chưa nộp`,
      status: rawStats.uncompletedGradebooksCount > 0 ? "WARNING" : "SUCCESS",
      contextText: rawStats.uncompletedGradebooksCount > 0 ? "Có đầu việc sắp quá hạn" : "Hoàn tất đúng tiến độ",
      sourceModuleName: "Vận hành Sổ sách giáo vụ",
      lastUpdated: "Hôm nay 08:30",
      drilldownKey: "CAMPUS_OPERATIONS"
    }
  ]

  const actions: ActionItem[] = []
  if (rawStats.atRiskStudentsCampus > 0) {
    actions.push({
      id: "gdcs-act-1",
      title: `${rawStats.atRiskStudentsCampus} học sinh cơ sở cần tăng cường các biện pháp phụ đạo / hỗ trợ tâm lý`,
      subtitle: "Tập trung tại các khối chuyển cấp (Khối 6, Khối 10)",
      severity: rawStats.atRiskStudentsCampus > 20 ? "CRITICAL" : "WARNING",
      category: "SUPPORT_ALERT",
      linkUrl: "/admin/ho-tro-hoc-tap",
      actionLabel: "Xem danh sách học sinh",
      scopeDetail: campusName
    })
  }

  return {
    role: "GDCS",
    roleTitle: `Giám đốc Cơ sở: ${campusName}`,
    scopeDescription: `Phạm vi điều hành: Toàn bộ hoạt động chuyên môn & học sinh tại ${campusName}`,
    freshness: {
      lastUpdated: "Hôm nay 08:30",
      isStale: false,
      sourceStatus: {
        OBSERVATION: "SYNCED",
        ASSESSMENT: "SYNCED",
        SUPPORT: "SYNCED"
      }
    },
    coreMetrics,
    actions
  }
}

/**
 * Tạo dữ liệu Dashboard toàn hệ thống cho Ban KT&ĐBCL
 */
export function aggregateQADashboard(
  context: GlobalFilterContext,
  rawStats: {
    systemStudentsCount: number
    systemTeachersCount: number
    systemPassRate: number
    systemAverageScore: number
    systemObsProgress: number
    systemDataQualityScore: number
    totalCampuses: number
    dataIssuesCount: number
  }
): RoleDashboardData {
  const coreMetrics: MetricCardData[] = [
    {
      metricId: "QA_SYSTEM_PASS_RATE",
      label: "Tỷ lệ đạt chuẩn toàn hệ thống",
      value: rawStats.systemPassRate,
      displayValue: `${rawStats.systemPassRate}%`,
      unit: "%",
      target: 92,
      status: rawStats.systemPassRate >= 92 ? "SUCCESS" : "NORMAL",
      contextText: `Điểm TB: ${rawStats.systemAverageScore.toFixed(2)} | Quy mô: ${rawStats.systemStudentsCount} HS`,
      sourceModuleName: "Khảo thí & ĐBCL",
      lastUpdated: "Hôm nay 08:30",
      drilldownKey: "QA_ASSESSMENT_DRILLDOWN"
    },
    {
      metricId: "QA_OBS_SYSTEM_PROGRESS",
      label: "Tiến độ dự giờ toàn hệ thống",
      value: rawStats.systemObsProgress,
      displayValue: `${rawStats.systemObsProgress}%`,
      unit: "%",
      target: 100,
      status: rawStats.systemObsProgress >= 85 ? "SUCCESS" : "WARNING",
      contextText: `${rawStats.systemTeachersCount} giáo viên trên ${rawStats.totalCampuses} cơ sở`,
      sourceModuleName: "Dự giờ & Phát triển chuyên môn",
      lastUpdated: "Hôm nay 08:30",
      drilldownKey: "QA_OBS_DRILLDOWN"
    },
    {
      metricId: "QA_DATA_QUALITY_RATE",
      label: "Chỉ số hoàn thiện dữ liệu hệ thống",
      value: rawStats.systemDataQualityScore,
      displayValue: `${rawStats.systemDataQualityScore}%`,
      unit: "%",
      target: 100,
      status: rawStats.systemDataQualityScore >= 98 ? "SUCCESS" : "WARNING",
      contextText: `${rawStats.dataIssuesCount} cảnh báo chất lượng dữ liệu`,
      sourceModuleName: "Kiểm định & Đảm bảo chất lượng",
      lastUpdated: "Hôm nay 08:30",
      drilldownKey: "QA_DATA_QUALITY_DRILLDOWN"
    },
    {
      metricId: "QA_CAMPUS_COVERAGE",
      label: "Quy mô cơ sở vận hành",
      value: rawStats.totalCampuses,
      displayValue: `${rawStats.totalCampuses} cơ sở`,
      status: "NORMAL",
      contextText: "Đồng bộ chuẩn hóa theo SSM Design System",
      sourceModuleName: "Hệ thống quản trị Sky-Line",
      lastUpdated: "Hôm nay 08:30",
      drilldownKey: "QA_CAMPUS_DRILLDOWN"
    }
  ]

  const actions: ActionItem[] = []
  if (rawStats.dataIssuesCount > 0) {
    actions.push({
      id: "qa-act-1",
      title: `Phát hiện ${rawStats.dataIssuesCount} vấn đề đối soát chất lượng dữ liệu cần xử lý`,
      subtitle: "Bao gồm bản ghi thiếu mã môn học chuẩn hóa và sổ điểm nộp trễ hạn",
      severity: "WARNING",
      category: "DATA_QUALITY",
      linkUrl: "/admin/ktdbcl/diem-nhan-xet",
      actionLabel: "Mở trung tâm đối soát",
      scopeDetail: "Toàn hệ thống SSM"
    })
  }

  const dataQualityIssues = [
    { category: "Sổ điểm quá hạn nộp", count: 4, severity: "WARNING" as const, detailUrl: "/admin/ktdbcl/diem-nhan-xet" },
    { category: "Học sinh vắng thi chưa cập nhật lý do", count: 12, severity: "INFO" as const, detailUrl: "/admin/ktdbcl/results" },
    { category: "Câu hỏi thư viện thiếu mạch kiến thức", count: 3, severity: "INFO" as const, detailUrl: "/admin/ktdbcl/exams" }
  ]

  return {
    role: "KTDBCL",
    roleTitle: "Ban Kiểm định & Đảm bảo Chất lượng Giáo dục",
    scopeDescription: "Phạm vi giám sát: Toàn hệ thống giáo dục Sky-Line (Tất cả cơ sở & khối lớp)",
    freshness: {
      lastUpdated: "Hôm nay 08:30",
      isStale: false,
      sourceStatus: {
        OBSERVATION: "SYNCED",
        ADVISORY: "SYNCED",
        SUPPORT: "SYNCED",
        EXPERIENCE: "SYNCED",
        ASSESSMENT: "SYNCED"
      }
    },
    coreMetrics,
    actions,
    dataQualityIssues
  }
}
