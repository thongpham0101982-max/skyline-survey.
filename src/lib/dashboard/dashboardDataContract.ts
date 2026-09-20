/**
 * dashboardDataContract.ts
 * Lớp Hợp đồng dữ liệu (Data Contracts) & Danh mục chỉ số chuẩn (Metric Catalog) cho SSM Dashboard.
 * Đảm bảo:
 * 1. ONE Metric Catalog = ONE Source of Truth per metric.
 * 2. Phân biệt rõ ràng: 0 vs null vs Chưa có dữ liệu.
 * 3. Hỗ trợ đầy đủ 5 vai trò: GV, TTCM, QLCM/TBP, GĐCS, Ban KT&ĐBCL.
 * 4. Không tự tính toán lại công thức khác module nguồn.
 */

export type UserRoleScope = "TEACHER" | "TTCM" | "QLCM" | "GDCS" | "KTDBCL" | "ADMIN"

export interface MetricDefinition {
  metricId: string
  name: string
  category: "TEACHER_QUALITY" | "STUDENT_OUTCOME" | "ASSESSMENT" | "OPERATIONAL" | "DATA_QUALITY"
  description: string
  formula: string
  sourceModule: "OBSERVATION" | "STUDENT_PROFILE" | "ADVISORY" | "SUPPORT" | "EXPERIENCE" | "ASSESSMENT"
  unit: "%" | "HS" | "GV" | "Lượt" | "Điểm" | "Đợt"
  isAdditive: boolean // Cho phép cộng dồn giữa các cơ sở/lớp hay không
  targetDefault?: number
  owner: string
  refreshCadence: "REALTIME" | "HOURLY" | "DAILY" | "ON_ASSESSMENT"
}

export interface MetricCardData {
  metricId: string
  label: string
  value: number | string | null
  displayValue: string
  unit?: string
  target?: number | null
  variance?: number | null // Value - Target hoặc Value - Previous
  varianceLabel?: string
  status: "NORMAL" | "WARNING" | "CRITICAL" | "SUCCESS"
  contextText: string // vd: "so với kỳ trước", "đạt 95% chỉ tiêu"
  sourceModuleName: string
  lastUpdated: string
  drilldownKey?: string
}

export interface ActionItem {
  id: string
  title: string
  subtitle: string
  severity: "CRITICAL" | "WARNING" | "INFO"
  category: "OBSERVATION" | "STUDENT_GOAL" | "SUPPORT_ALERT" | "EXPERIENCE" | "GRADE_ENTRY" | "DATA_QUALITY"
  dueText?: string
  linkUrl: string
  actionLabel: string
  scopeDetail: string // vd: "Lớp 10A1", "Tổ Tự Nhiên", "Cơ sở Riverside"
}

export interface GlobalFilterContext {
  academicYearId: string
  academicYearName: string
  campusId: string // "ALL" hoặc ID cụ thể
  campusName: string
  gradeFilter?: string
  semesterFilter?: "HK1" | "HK2" | "FULL_YEAR"
}

export interface DataFreshnessInfo {
  lastUpdated: string
  isStale: boolean
  staleMessage?: string
  sourceStatus: Record<string, "SYNCED" | "SYNCING" | "STALE">
}

export interface DrilldownRow {
  id: string
  code: string
  name: string
  scope: string
  metricValue: string | number
  status: string
  statusVariant: "success" | "warning" | "danger" | "neutral" | "info"
  detailUrl?: string
}

/**
 * Danh mục Chỉ số Chuẩn của SSM (Metric Catalog Master Data)
 */
export const SSM_METRIC_CATALOG: MetricDefinition[] = [
  {
    metricId: "OBS_COMPLETION_RATE",
    name: "Tỷ lệ hoàn thành kế hoạch dự giờ",
    category: "TEACHER_QUALITY",
    description: "Tỷ lệ số lượt dự giờ đã hoàn thành đánh giá so với chỉ tiêu kế hoạch phân bổ của giáo viên/tổ.",
    formula: "(Số lượt dự giờ COMPLETED / Chỉ tiêu lượt dự giờ được giao) * 100",
    sourceModule: "OBSERVATION",
    unit: "%",
    isAdditive: false,
    targetDefault: 100,
    owner: "Phân hệ Dự giờ & Phát triển chuyên môn",
    refreshCadence: "DAILY"
  },
  {
    metricId: "OBS_AVERAGE_SCORE",
    name: "Điểm đánh giá tiết dạy trung bình",
    category: "TEACHER_QUALITY",
    description: "Điểm trung bình cộng các phiếu dự giờ đã được phê duyệt trong kỳ.",
    formula: "SUM(Điểm tổng kết phiếu) / COUNT(Phiếu đã duyệt)",
    sourceModule: "OBSERVATION",
    unit: "Điểm",
    isAdditive: false,
    owner: "Phân hệ Dự giờ & Phát triển chuyên môn",
    refreshCadence: "DAILY"
  },
  {
    metricId: "GOAL_ATTAINMENT_RATE",
    name: "Tỷ lệ học sinh đạt mục tiêu học tập",
    category: "STUDENT_OUTCOME",
    description: "Tỷ lệ học sinh có GAP <= 0 (Điểm thực tế đạt hoặc vượt điểm mục tiêu đã cam kết).",
    formula: "(Số HS có GAP <= 0 / Tổng số HS có mục tiêu & điểm thực tế) * 100",
    sourceModule: "ADVISORY",
    unit: "%",
    isAdditive: false,
    targetDefault: 80,
    owner: "Phân hệ Cố vấn học tập & Mục tiêu học sinh",
    refreshCadence: "ON_ASSESSMENT"
  },
  {
    metricId: "SUPPORT_ACTIVE_COUNT",
    name: "Số học sinh đang theo dõi hỗ trợ",
    category: "STUDENT_OUTCOME",
    description: "Tổng số học sinh đang có hồ sơ can thiệp học tập hoặc tâm lý ở trạng thái ACTIVE.",
    formula: "COUNT(Hồ sơ hỗ trợ đang hoạt động)",
    sourceModule: "SUPPORT",
    unit: "HS",
    isAdditive: true,
    owner: "Phân hệ Theo dõi hỗ trợ & Tâm lý học đường",
    refreshCadence: "REALTIME"
  },
  {
    metricId: "EXPERIENCE_PASS_RATE",
    name: "Tỷ lệ hoàn thành hoạt động trải nghiệm",
    category: "STUDENT_OUTCOME",
    description: "Tỷ lệ học sinh tham gia đầy đủ và được đánh giá Đạt/Tốt/Xuất sắc trong các hoạt động trải nghiệm.",
    formula: "(Số HS xếp loại >= SATISFACTORY / Tổng số HS tham gia) * 100",
    sourceModule: "EXPERIENCE",
    unit: "%",
    isAdditive: false,
    targetDefault: 95,
    owner: "Phân hệ Quản lý Hoạt động trải nghiệm",
    refreshCadence: "ON_ASSESSMENT"
  },
  {
    metricId: "ASSESSMENT_PASS_RATE",
    name: "Tỷ lệ học sinh đạt chuẩn khảo thí (>=5.0)",
    category: "ASSESSMENT",
    description: "Tỷ lệ học sinh có điểm bài kiểm tra định kỳ chính thức từ 5.0 điểm trở lên.",
    formula: "(Số bài kiểm tra >= 5.0 / Tổng số bài kiểm tra đã chấm) * 100",
    sourceModule: "ASSESSMENT",
    unit: "%",
    isAdditive: false,
    targetDefault: 90,
    owner: "Phân hệ Khảo thí & Đảm bảo chất lượng",
    refreshCadence: "ON_ASSESSMENT"
  },
  {
    metricId: "DATA_COMPLETION_RATE",
    name: "Tỷ lệ hoàn tất dữ liệu đúng hạn",
    category: "DATA_QUALITY",
    description: "Tỷ lệ các đầu mục sổ điểm, phiếu dự giờ và báo cáo hoàn thành đúng thời hạn quy định.",
    formula: "(Số danh mục hoàn tất đúng hạn / Tổng số danh mục phải nộp) * 100",
    sourceModule: "STUDENT_PROFILE",
    unit: "%",
    isAdditive: false,
    targetDefault: 100,
    owner: "Ban Kiểm định & ĐBCL",
    refreshCadence: "DAILY"
  }
]
