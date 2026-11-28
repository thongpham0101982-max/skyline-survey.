/**
 * Danh mục báo cáo Phân tích Tổng hợp Kết quả (THKQ) theo 5 nhóm nghiệp vụ độc lập, không trùng lặp.
 * Quy tắc: Chỉ đưa báo cáo lên menu điều hướng khi chức năng đã hoạt động và có nguồn dữ liệu thực tế (`isReadyForMenu: true`).
 */

export type ThkqReportGroupId =
  | "COMPONENT_SCORES"
  | "AVERAGE_SCORES"
  | "SCORE_DISTRIBUTION"
  | "COMPREHENSIVE_SUMMARY"

export type ThkqReportId =
  | "periodic-test-results"
  | "teacher-test-quality"
  | "average-by-scope"
  | "score-range-distribution"
  | "basic-statistics"
  | "system-level-summary"

export interface ThkqReportCatalogItem {
  id: ThkqReportId
  code: string
  groupId: ThkqReportGroupId
  title: string
  shortTitle: string
  description: string
  href: string
  /** Chức năng đã triển khai hoàn chỉnh */
  isImplemented: boolean
  /** Đưa lên menu điều hướng chính khi chức năng và dữ liệu đã hoạt động */
  isReadyForMenu: boolean
  /** Ưu tiên đợt 1 */
  isPhase1Priority?: boolean
  badgeLabel?: string
}

export interface ThkqReportGroup {
  id: ThkqReportGroupId
  order: number
  name: string
  description: string
  reports: ThkqReportCatalogItem[]
}

export const THKQ_REPORT_GROUPS: ThkqReportGroup[] = [
  {
    id: "COMPONENT_SCORES",
    order: 1,
    name: "Điểm thành phần",
    description: "Thống kê kết quả các bài kiểm tra định kỳ theo lớp/khối và chất lượng kiểm tra theo giáo viên bộ môn",
    reports: [
      {
        id: "periodic-test-results",
        code: "KTDBCL_THKQ_KT_DINH_KY",
        groupId: "COMPONENT_SCORES",
        title: "Thống kê kết quả kiểm tra định kỳ",
        shortTitle: "1. TK kết quả kiểm tra định kỳ",
        description:
          "Thống kê phân phối điểm kiểm tra định kỳ (GK1, CK1, GK2, CK2) theo mẫu đối soát vnEdu và phân tích SSM.",
        href: "/admin/ktdbcl/phan-tich-thkq?report=periodic-test-results",
        isImplemented: true,
        isReadyForMenu: true,
        isPhase1Priority: true,
        badgeLabel: "Mẫu đối soát vnEdu",
      },
      {
        id: "teacher-test-quality",
        code: "KTDBCL_THKQ_CHAT_LUONG_GV",
        groupId: "COMPONENT_SCORES",
        title: "Chất lượng kiểm tra theo giáo viên",
        shortTitle: "2. Chất lượng KT theo giáo viên",
        description:
          "Tổng hợp phân phối điểm kiểm tra, tỷ lệ đạt chuẩn theo giáo viên giảng dạy và đối sánh học sinh diện cam kết đầu vào.",
        href: "/admin/ktdbcl/phan-tich-thkq?report=teacher-test-quality",
        isImplemented: true,
        isReadyForMenu: true,
      },
    ],
  },
  {
    id: "AVERAGE_SCORES",
    order: 2,
    name: "Điểm trung bình",
    description: "Thống kê điểm trung bình (μ) và độ lệch chuẩn (σ) theo môn, lớp, khối và cơ sở đào tạo",
    reports: [
      {
        id: "average-by-scope",
        code: "KTDBCL_THKQ_DIEM_TB",
        groupId: "AVERAGE_SCORES",
        title: "Thống kê ĐTB theo môn, khối, cơ sở",
        shortTitle: "3. ĐTB theo môn, khối, cơ sở",
        description:
          "So sánh điểm trung bình môn học và độ lệch chuẩn (σ) giữa các lớp, khối, cơ sở với mặt bằng chung toàn hệ thống.",
        href: "/admin/ktdbcl/phan-tich-thkq?report=average-by-scope",
        isImplemented: true,
        isReadyForMenu: true,
      },
    ],
  },
  {
    id: "SCORE_DISTRIBUTION",
    order: 3,
    name: "Khoảng điểm",
    description: "Phân phối điểm số theo các ngưỡng chuẩn Bộ GD&ĐT và chuẩn nội bộ Sky-Line",
    reports: [
      {
        id: "score-range-distribution",
        code: "KTDBCL_THKQ_KHOANG_DIEM",
        groupId: "SCORE_DISTRIBUTION",
        title: "Phân phối điểm theo ngưỡng cấu hình",
        shortTitle: "4. Phân phối theo khoảng điểm",
        description:
          "Ma trận bản đồ nhiệt (< 5.0) và danh sách học sinh theo từng ngưỡng điểm cấu hình (dưới 5.0, dưới chuẩn Sky-Line, 8.0–10.0, Điểm 10).",
        href: "/admin/ktdbcl/phan-tich-thkq?report=score-range-distribution",
        isImplemented: true,
        isReadyForMenu: true,
      },
    ],
  },
  {
    id: "COMPREHENSIVE_SUMMARY",
    order: 4,
    name: "Thống kê cơ bản",
    description: "Đối chiếu kết quả khảo sát từng khối của cơ sở đang xem với cùng khối trên toàn Hệ thống Giáo dục Sky-Line",
    reports: [
      {
        id: "basic-statistics",
        code: "KTDBCL_THKQ_TONG_HOP_HE_THONG",
        groupId: "COMPREHENSIVE_SUMMARY",
        title: "Thống kê cơ bản đối chiếu cơ sở và hệ thống",
        shortTitle: "5. Thống kê cơ bản",
        description:
          "Chọn một môn và đối chiếu 7 chỉ số kết quả khảo sát từng khối của cơ sở đang xem với kết quả cùng khối trên toàn Hệ thống Giáo dục Sky-Line.",
        href: "/admin/ktdbcl/phan-tich-thkq?report=basic-statistics",
        isImplemented: true,
        isReadyForMenu: true,
      },
    ],
  },
]

export function getActiveThkqMenuSubModules(hasDataAvailable = true) {
  if (!hasDataAvailable) return []
  const items: Array<{ code: string; name: string; href: string }> = []
  for (const group of THKQ_REPORT_GROUPS) {
    for (const rep of group.reports) {
      if (rep.isImplemented && rep.isReadyForMenu) {
        items.push({
          code: rep.code,
          name: rep.shortTitle,
          href: rep.href,
        })
      }
    }
  }
  return items
}

export function findThkqReportById(reportId?: string | null): ThkqReportCatalogItem {
  const raw = String(reportId || "periodic-test-results").trim()
  // Tương thích ngược nếu URL cũ truyền subject-class-results hoặc system-level-summary
  const normalized =
    raw === "subject-class-results"
      ? "average-by-scope"
      : raw === "system-level-summary"
      ? "basic-statistics"
      : raw
  for (const group of THKQ_REPORT_GROUPS) {
    for (const rep of group.reports) {
      if (rep.id === normalized) return rep
    }
  }
  return THKQ_REPORT_GROUPS[0].reports[0]
}
