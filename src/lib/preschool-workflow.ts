/**
 * Quy trình Khảo sát đầu vào Mầm non 2026 (B1–B13) — Core Domain Engine
 *
 * - 8 trạng thái tiến độ chuẩn (DA_HEN -> DA_LUU_HO_SO)
 * - 12 biểu mẫu chuẩn BM.KTĐBCL (01–11, 04, 17) với phiên bản & gợi ý thông minh
 * - Cảnh báo mốc tuổi giáp ranh bắt buộc người phụ trách xác nhận mẫu trước khi nhập
 * - Kiểm soát mốc >= 2 ngày làm việc cho lịch trải nghiệm bổ sung (B7B)
 * - Cổng kiểm soát điều kiện bắt buộc trước khi trình duyệt GĐCS (B10)
 * - Phân quyền xem/chỉnh sửa dữ liệu nhạy cảm Y tế (B4A) & Tâm lý (BM.KTĐBCL.09)
 * - Điều kiện xét tuyển tự động DOC.TT.02 đang ở chế độ mở (MANUAL_BY_AUTHORITY)
 *   cho tới khi tài liệu DOC.TT.02 bản phê duyệt được cung cấp.
 */

export const PRESCHOOL_WORKFLOW_STATUSES = [
  "DA_HEN",
  "DANG_DANH_GIA",
  "CHO_PHONG_VAN_TAM_LY",
  "CHO_TRAI_NGHIEM",
  "CHO_DUYET",
  "DA_DUYET",
  "DA_TRA_KET_QUA",
  "DA_LUU_HO_SO",
] as const

export type PreschoolWorkflowStatus = (typeof PRESCHOOL_WORKFLOW_STATUSES)[number]

export const PRESCHOOL_WORKFLOW_STATUS_META: Record<
  PreschoolWorkflowStatus,
  {
    label: string
    shortLabel: string
    stepHint: string
    badgeClass: string
    order: number
  }
> = {
  DA_HEN: {
    label: "Đã hẹn",
    shortLabel: "Đã hẹn",
    stepHint: "B1–B3: Tiếp nhận & chuẩn bị đón trẻ",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    order: 1,
  },
  DANG_DANH_GIA: {
    label: "Đang đánh giá",
    shortLabel: "Đang đánh giá",
    stepHint: "B4A–B6 / B4B: Y tế, GV đánh giá hoặc quan sát trải nghiệm",
    badgeClass: "bg-teal-50 text-[#00736E] border-teal-200",
    order: 2,
  },
  CHO_PHONG_VAN_TAM_LY: {
    label: "Chờ phỏng vấn tâm lý",
    shortLabel: "Chờ PV tâm lý",
    stepHint: "B7A: Phỏng vấn BM.KTĐBCL.09 & báo cáo nhanh MS Teams",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    order: 3,
  },
  CHO_TRAI_NGHIEM: {
    label: "Chờ trải nghiệm",
    shortLabel: "Chờ trải nghiệm",
    stepHint: "B7B–B8: Trải nghiệm kết hợp quan sát tâm lý (≥ 2 ngày làm việc)",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    order: 4,
  },
  CHO_DUYET: {
    label: "Chờ duyệt",
    shortLabel: "Chờ duyệt",
    stepHint: "B9A–B10: Trình Giám đốc Điều hành Cơ sở phê duyệt",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
    order: 5,
  },
  DA_DUYET: {
    label: "Đã duyệt",
    shortLabel: "Đã duyệt",
    stepHint: "B11: Xuất thư BM.KTĐBCL.17 / Trao đổi PH & xuất BM.KTĐBCL.04",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    order: 6,
  },
  DA_TRA_KET_QUA: {
    label: "Đã trả kết quả",
    shortLabel: "Đã trả KQ",
    stepHint: "B12–B13: Tư vấn đã trả KQ, chờ Giáo vụ / Khảo thí lưu hồ sơ",
    badgeClass: "bg-teal-50 text-[#005854] border-teal-300",
    order: 7,
  },
  DA_LUU_HO_SO: {
    label: "Đã lưu hồ sơ",
    shortLabel: "Đã lưu HS",
    stepHint: "B13: Hoàn tất quy trình và lưu trữ hồ sơ",
    badgeClass: "bg-[#003B3A] text-white border-[#003B3A]",
    order: 8,
  },
}

export type PreschoolIntakeMode = "KHAO_SAT_MOI" | "HOC_TRAI_NGHIEM"
export type PreschoolRoundType =
  | "KHAO_SAT_MOI"
  | "HOC_TRAI_NGHIEM"
  | "PHONG_VAN_TAM_LY"
  | "TRAI_NGHIEM_BO_SUNG"

export type PreschoolSystemType = "HE_S" | "HE_GLOBAL"

export interface PreschoolFormCriterionDef {
  code: string
  area: string
  name: string
  options: Array<{ key: string; label: string }>
}

export interface PreschoolFormDefinition {
  code: string
  version: string
  title: string
  shortTitle: string
  category: "NHA_TRE" | "MAU_GIAO_S" | "MAU_GIAO_GLOBAL" | "TAM_LY" | "VAN_BAN"
  system: PreschoolSystemType | "ALL"
  ageGroupLabel: string
  minMonths?: number
  maxMonths?: number
  gradeAliases: string[]
  requiresMsTeamsReport?: boolean
  defaultCriteria: PreschoolFormCriterionDef[]
  confirmationNote: string
}

const STANDARD_OPTIONS = [
  { key: "DAT", label: "Đạt" },
  { key: "CHUA_THE_HIEN", label: "Chưa thể hiện rõ" },
  { key: "CHUA_DAT", label: "Chưa đạt / Cần hỗ trợ" },
]

const PSYCHOLOGY_OPTIONS = [
  { key: "BINH_THUONG", label: "Phù hợp độ tuổi" },
  { key: "CAN_THEO_DOI", label: "Cần theo dõi thêm" },
  { key: "CAN_HO_TRO_CHUYEN_SAU", label: "Cần hỗ trợ / đánh giá chuyên sâu" },
]

function buildDefaultCriteria(prefix: string, ageLabel: string, isGlobal = false): PreschoolFormCriterionDef[] {
  const base: PreschoolFormCriterionDef[] = [
    {
      code: `${prefix}_TC1`,
      area: "Phát triển Thể chất",
      name: `Vận động thô và phối hợp cơ thể phù hợp nhóm ${ageLabel}`,
      options: STANDARD_OPTIONS,
    },
    {
      code: `${prefix}_TC2`,
      area: "Phát triển Thể chất",
      name: `Vận động tinh và kỹ năng tự phục vụ cơ bản (${ageLabel})`,
      options: STANDARD_OPTIONS,
    },
    {
      code: `${prefix}_NT1`,
      area: "Phát triển Nhận thức",
      name: `Nhận biết sự vật, màu sắc, hình khối / tư duy phù hợp ${ageLabel}`,
      options: STANDARD_OPTIONS,
    },
    {
      code: `${prefix}_NT2`,
      area: "Phát triển Nhận thức",
      name: `Khả năng tập trung chú ý và làm theo hướng dẫn (${ageLabel})`,
      options: STANDARD_OPTIONS,
    },
    {
      code: `${prefix}_NN1`,
      area: "Phát triển Ngôn ngữ",
      name: `Nghe hiểu và phản hồi giao tiếp phù hợp ${ageLabel}`,
      options: STANDARD_OPTIONS,
    },
    {
      code: `${prefix}_NN2`,
      area: "Phát triển Ngôn ngữ",
      name: `Diễn đạt nhu cầu, vốn từ và phát âm (${ageLabel})`,
      options: STANDARD_OPTIONS,
    },
    {
      code: `${prefix}_TCXH1`,
      area: "Tình cảm – Kỹ năng xã hội & Thẩm mỹ",
      name: `Khả năng tách phụ huynh, thích nghi môi trường mới và tương tác với cô`,
      options: STANDARD_OPTIONS,
    },
    {
      code: `${prefix}_TCXH2`,
      area: "Tình cảm – Kỹ năng xã hội & Thẩm mỹ",
      name: `Biểu đạt cảm xúc, hợp tác khi chơi và hứng thú hoạt động nghệ thuật`,
      options: STANDARD_OPTIONS,
    },
  ]

  if (isGlobal) {
    base.push(
      {
        code: `${prefix}_EN1`,
        area: "Tiếp xúc & Phản xạ Tiếng Anh (Hệ Global)",
        name: `Phản ứng tích cực với khẩu lệnh / bài hát / từ vựng tiếng Anh cơ bản (${ageLabel})`,
        options: STANDARD_OPTIONS,
      },
      {
        code: `${prefix}_EN2`,
        area: "Tiếp xúc & Phản xạ Tiếng Anh (Hệ Global)",
        name: `Mức độ tự tin giao tiếp và lặp lại âm / từ tiếng Anh với giáo viên`,
        options: STANDARD_OPTIONS,
      }
    )
  }

  return base
}

export const PRESCHOOL_FORM_REGISTRY: Record<string, PreschoolFormDefinition> = {
  "BM.KTĐBCL.05": {
    code: "BM.KTĐBCL.05",
    version: "2026.1",
    title: "Phiếu khảo sát đầu vào Nhà trẻ 12–18 tháng",
    shortTitle: "Nhà trẻ 12–18 tháng",
    category: "NHA_TRE",
    system: "ALL",
    ageGroupLabel: "12 đến 18 tháng",
    minMonths: 12,
    maxMonths: 18,
    gradeAliases: ["Nhà trẻ 12-18 tháng", "12 đến 18 tháng", "12-18 tháng", "NT 12-18"],
    defaultCriteria: buildDefaultCriteria("BM05", "12–18 tháng"),
    confirmationNote: "Giáo viên khảo sát và Nhóm trưởng Mầm non ký xác nhận kết quả.",
  },
  "BM.KTĐBCL.10": {
    code: "BM.KTĐBCL.10",
    version: "2026.1",
    title: "Phiếu khảo sát đầu vào Nhà trẻ 18–24 tháng",
    shortTitle: "Nhà trẻ 18–24 tháng",
    category: "NHA_TRE",
    system: "ALL",
    ageGroupLabel: "18 đến 24 tháng",
    minMonths: 18,
    maxMonths: 24,
    gradeAliases: ["Nhà trẻ 18-24 tháng", "18 đến 24 tháng", "18-24 tháng", "NT 18-24"],
    defaultCriteria: buildDefaultCriteria("BM10", "18–24 tháng"),
    confirmationNote: "Giáo viên khảo sát và Nhóm trưởng Mầm non ký xác nhận kết quả.",
  },
  "BM.KTĐBCL.11": {
    code: "BM.KTĐBCL.11",
    version: "2026.1",
    title: "Phiếu khảo sát đầu vào Nhà trẻ 24–36 tháng",
    shortTitle: "Nhà trẻ 24–36 tháng",
    category: "NHA_TRE",
    system: "ALL",
    ageGroupLabel: "24 đến 36 tháng",
    minMonths: 24,
    maxMonths: 36,
    gradeAliases: ["Nhà trẻ 24-36 tháng", "24 đến 36 tháng", "24-36 tháng", "NT 24-36"],
    defaultCriteria: buildDefaultCriteria("BM11", "24–36 tháng"),
    confirmationNote: "Giáo viên khảo sát và Nhóm trưởng Mầm non ký xác nhận kết quả.",
  },
  "BM.KTĐBCL.01": {
    code: "BM.KTĐBCL.01",
    version: "2026.1",
    title: "Phiếu khảo sát đầu vào Mẫu giáo Bé — Hệ S",
    shortTitle: "Mẫu giáo Bé (Hệ S)",
    category: "MAU_GIAO_S",
    system: "HE_S",
    ageGroupLabel: "3 đến 4 tuổi",
    minMonths: 36,
    maxMonths: 48,
    gradeAliases: ["Mẫu giáo bé", "Mẫu giáo Bé", "3 đến 4 tuổi", "3-4 tuổi", "MGB"],
    defaultCriteria: buildDefaultCriteria("BM01", "Mẫu giáo Bé Hệ S"),
    confirmationNote: "Giáo viên khảo sát và Nhóm trưởng Mầm non ký xác nhận kết quả.",
  },
  "BM.KTĐBCL.02": {
    code: "BM.KTĐBCL.02",
    version: "2026.1",
    title: "Phiếu khảo sát đầu vào Mẫu giáo Nhỡ — Hệ S",
    shortTitle: "Mẫu giáo Nhỡ (Hệ S)",
    category: "MAU_GIAO_S",
    system: "HE_S",
    ageGroupLabel: "4 đến 5 tuổi",
    minMonths: 48,
    maxMonths: 60,
    gradeAliases: ["Mẫu giáo nhỡ", "Mẫu giáo Nhỡ", "4 đến 5 tuổi", "4-5 tuổi", "MGN"],
    defaultCriteria: buildDefaultCriteria("BM02", "Mẫu giáo Nhỡ Hệ S"),
    confirmationNote: "Giáo viên khảo sát và Nhóm trưởng Mầm non ký xác nhận kết quả.",
  },
  "BM.KTĐBCL.03": {
    code: "BM.KTĐBCL.03",
    version: "2026.1",
    title: "Phiếu khảo sát đầu vào Mẫu giáo Lớn — Hệ S",
    shortTitle: "Mẫu giáo Lớn (Hệ S)",
    category: "MAU_GIAO_S",
    system: "HE_S",
    ageGroupLabel: "5 đến 6 tuổi",
    minMonths: 60,
    maxMonths: 72,
    gradeAliases: ["Mẫu giáo lớn", "Mẫu giáo Lớn", "5 đến 6 tuổi", "5-6 tuổi", "MGL"],
    defaultCriteria: buildDefaultCriteria("BM03", "Mẫu giáo Lớn Hệ S"),
    confirmationNote: "Giáo viên khảo sát và Nhóm trưởng Mầm non ký xác nhận kết quả.",
  },
  "BM.KTĐBCL.08": {
    code: "BM.KTĐBCL.08",
    version: "2026.1",
    title: "Phiếu khảo sát đầu vào Mẫu giáo Bé — Hệ Global",
    shortTitle: "Mẫu giáo Bé (Hệ Global)",
    category: "MAU_GIAO_GLOBAL",
    system: "HE_GLOBAL",
    ageGroupLabel: "3 đến 4 tuổi",
    minMonths: 36,
    maxMonths: 48,
    gradeAliases: ["Mẫu giáo bé", "Mẫu giáo Bé", "3 đến 4 tuổi", "3-4 tuổi", "MGB"],
    defaultCriteria: buildDefaultCriteria("BM08", "Mẫu giáo Bé Hệ Global", true),
    confirmationNote: "Giáo viên khảo sát (VN/Global) và Nhóm trưởng Mầm non ký xác nhận kết quả.",
  },
  "BM.KTĐBCL.06": {
    code: "BM.KTĐBCL.06",
    version: "2026.1",
    title: "Phiếu khảo sát đầu vào Mẫu giáo Nhỡ — Hệ Global",
    shortTitle: "Mẫu giáo Nhỡ (Hệ Global)",
    category: "MAU_GIAO_GLOBAL",
    system: "HE_GLOBAL",
    ageGroupLabel: "4 đến 5 tuổi",
    minMonths: 48,
    maxMonths: 60,
    gradeAliases: ["Mẫu giáo nhỡ", "Mẫu giáo Nhỡ", "4 đến 5 tuổi", "4-5 tuổi", "MGN"],
    defaultCriteria: buildDefaultCriteria("BM06", "Mẫu giáo Nhỡ Hệ Global", true),
    confirmationNote: "Giáo viên khảo sát (VN/Global) và Nhóm trưởng Mầm non ký xác nhận kết quả.",
  },
  "BM.KTĐBCL.07": {
    code: "BM.KTĐBCL.07",
    version: "2026.1",
    title: "Phiếu khảo sát đầu vào Mẫu giáo Lớn — Hệ Global",
    shortTitle: "Mẫu giáo Lớn (Hệ Global)",
    category: "MAU_GIAO_GLOBAL",
    system: "HE_GLOBAL",
    ageGroupLabel: "5 đến 6 tuổi",
    minMonths: 60,
    maxMonths: 72,
    gradeAliases: ["Mẫu giáo lớn", "Mẫu giáo Lớn", "5 đến 6 tuổi", "5-6 tuổi", "MGL"],
    defaultCriteria: buildDefaultCriteria("BM07", "Mẫu giáo Lớn Hệ Global", true),
    confirmationNote: "Giáo viên khảo sát (VN/Global) và Nhóm trưởng Mầm non ký xác nhận kết quả.",
  },
  "BM.KTĐBCL.09": {
    code: "BM.KTĐBCL.09",
    version: "2026.1",
    title: "Phiếu sàng lọc tâm lý Mầm non",
    shortTitle: "Phiếu sàng lọc tâm lý",
    category: "TAM_LY",
    system: "ALL",
    ageGroupLabel: "Mầm non (Tất cả độ tuổi)",
    gradeAliases: [],
    requiresMsTeamsReport: true,
    defaultCriteria: [
      {
        code: "BM09_GT1",
        area: "Giao tiếp & Tương tác xã hội",
        name: "Giao tiếp bằng mắt, phản hồi khi được gọi tên và tương tác qua lại",
        options: PSYCHOLOGY_OPTIONS,
      },
      {
        code: "BM09_NN1",
        area: "Ngôn ngữ & Biểu đạt",
        name: "Hiểu yêu cầu đơn giản, biểu đạt nhu cầu bằng lời hoặc cử chỉ",
        options: PSYCHOLOGY_OPTIONS,
      },
      {
        code: "BM09_HV1",
        area: "Hành vi & Điều hòa cảm xúc",
        name: "Mức độ tập trung, kiểm soát cảm xúc và thích ứng khi thay đổi hoạt động",
        options: PSYCHOLOGY_OPTIONS,
      },
      {
        code: "BM09_GC1",
        area: "Cảm giác & Vận động",
        name: "Phản ứng với âm thanh, ánh sáng, tiếp xúc và hành vi lặp lại (nếu có)",
        options: PSYCHOLOGY_OPTIONS,
      },
      {
        code: "BM09_GD1",
        area: "Thông tin phỏng vấn phụ huynh",
        name: "Thói quen sinh hoạt, giấc ngủ, ăn uống và mức độ đồng hành của gia đình",
        options: PSYCHOLOGY_OPTIONS,
      },
    ],
    confirmationNote: "Chuyên viên/GV tâm lý ký xác nhận và thực hiện báo cáo nhanh qua MS Teams.",
  },
  "BM.KTĐBCL.17": {
    code: "BM.KTĐBCL.17",
    version: "2026.1",
    title: "Thư chúc mừng kết quả khảo sát đầu vào Mầm non",
    shortTitle: "Thư chúc mừng",
    category: "VAN_BAN",
    system: "ALL",
    ageGroupLabel: "Trẻ Đạt phê duyệt B10",
    gradeAliases: [],
    defaultCriteria: [],
    confirmationNote: "Giám đốc Điều hành Cơ sở phê duyệt; bàn giao Tư vấn trả kết quả cho phụ huynh.",
  },
  "BM.KTĐBCL.04": {
    code: "BM.KTĐBCL.04",
    version: "2026.1",
    title: "Thư cảm ơn kết quả khảo sát đầu vào Mầm non",
    shortTitle: "Thư cảm ơn",
    category: "VAN_BAN",
    system: "ALL",
    ageGroupLabel: "Trẻ Chưa đạt phê duyệt B10 (sau trao đổi PH)",
    gradeAliases: [],
    defaultCriteria: [],
    confirmationNote: "Chỉ xuất sau khi ghi nhận đầy đủ nội dung trao đổi với phụ huynh.",
  },
}

export const EVALUATION_FORM_CODES = [
  "BM.KTĐBCL.05",
  "BM.KTĐBCL.10",
  "BM.KTĐBCL.11",
  "BM.KTĐBCL.01",
  "BM.KTĐBCL.02",
  "BM.KTĐBCL.03",
  "BM.KTĐBCL.08",
  "BM.KTĐBCL.06",
  "BM.KTĐBCL.07",
] as const

export function normalizePreschoolSystem(raw?: string | null): PreschoolSystemType {
  const s = String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
  if (
    s.includes("GLOBAL") ||
    s.includes("MNG") ||
    s.includes("SONG NGU") ||
    s.includes("QUOC TE") ||
    s === "HE I" ||
    s === "I" ||
    s === "G"
  ) {
    return "HE_GLOBAL"
  }
  return "HE_S"
}

export function formatPreschoolSystemLabel(raw?: string | null): string {
  return normalizePreschoolSystem(raw) === "HE_GLOBAL" ? "Hệ Global" : "Hệ S"
}

export function calculateAgeInMonths(
  dateOfBirth?: string | Date | null,
  referenceDate?: string | Date | null
): number | null {
  if (!dateOfBirth) return null
  const dob = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth)
  if (isNaN(dob.getTime())) return null
  const ref = referenceDate
    ? referenceDate instanceof Date
      ? referenceDate
      : new Date(referenceDate)
    : new Date()
  if (isNaN(ref.getTime())) return null
  const diffDays = (ref.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24)
  if (diffDays < 0) return 0
  return Math.round((diffDays / 30.4375) * 10) / 10
}

function mapGradeToFormCode(grade: string | null | undefined, system: PreschoolSystemType): string | null {
  const g = String(grade || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
  if (!g) return null
  if (g.includes("12") && g.includes("18")) return "BM.KTĐBCL.05"
  if (g.includes("18") && g.includes("24")) return "BM.KTĐBCL.10"
  if (g.includes("24") && g.includes("36")) return "BM.KTĐBCL.11"
  if (g.includes("be") || g.includes("3 den 4") || g.includes("3-4") || g === "mgb") {
    return system === "HE_GLOBAL" ? "BM.KTĐBCL.08" : "BM.KTĐBCL.01"
  }
  if (g.includes("nho") || g.includes("4 den 5") || g.includes("4-5") || g === "mgn") {
    return system === "HE_GLOBAL" ? "BM.KTĐBCL.06" : "BM.KTĐBCL.02"
  }
  if (g.includes("lon") || g.includes("5 den 6") || g.includes("5-6") || g === "mgl") {
    return system === "HE_GLOBAL" ? "BM.KTĐBCL.07" : "BM.KTĐBCL.03"
  }
  return null
}

function mapAgeMonthsToFormCode(months: number, system: PreschoolSystemType): string {
  if (months < 18) return "BM.KTĐBCL.05"
  if (months < 24) return "BM.KTĐBCL.10"
  if (months < 36) return "BM.KTĐBCL.11"
  if (months < 48) return system === "HE_GLOBAL" ? "BM.KTĐBCL.08" : "BM.KTĐBCL.01"
  if (months < 60) return system === "HE_GLOBAL" ? "BM.KTĐBCL.06" : "BM.KTĐBCL.02"
  return system === "HE_GLOBAL" ? "BM.KTĐBCL.07" : "BM.KTĐBCL.03"
}

export interface FormSuggestionResult {
  suggestedFormCode: string
  formVersion: string
  ageMonths: number | null
  system: PreschoolSystemType
  isAgeBoundary: boolean
  boundaryReason: string | null
  candidateForms: string[]
}

/**
 * Gợi ý biểu mẫu BM.KTĐBCL dựa trên ngày sinh, ngày khảo sát, nhóm lớp và hệ đăng ký.
 * Tự động phát hiện mốc tuổi giáp ranh (±0.5 tháng quanh 18/24/36/48/60 tháng)
 * hoặc lệch giữa tuổi thực và nhóm lớp đăng ký để yêu cầu người phụ trách xác nhận.
 */
export function suggestPreschoolForm(params: {
  dateOfBirth?: string | Date | null
  surveyDate?: string | Date | null
  grade?: string | null
  surveySystem?: string | null
}): FormSuggestionResult {
  const system = normalizePreschoolSystem(params.surveySystem)
  const ageMonths = calculateAgeInMonths(params.dateOfBirth, params.surveyDate)
  const fromGrade = mapGradeToFormCode(params.grade, system)
  const fromAge = ageMonths !== null ? mapAgeMonthsToFormCode(ageMonths, system) : null

  const suggestedFormCode = fromGrade || fromAge || (system === "HE_GLOBAL" ? "BM.KTĐBCL.08" : "BM.KTĐBCL.01")
  const def = PRESCHOOL_FORM_REGISTRY[suggestedFormCode]

  const boundaries = [18, 24, 36, 48, 60]
  let isAgeBoundary = false
  let boundaryReason: string | null = null

  if (ageMonths !== null) {
    const nearBoundary = boundaries.find((b) => Math.abs(ageMonths - b) <= 0.5)
    if (nearBoundary !== undefined) {
      isAgeBoundary = true
      boundaryReason = `Trẻ đang ở mốc tuổi giáp ranh ${nearBoundary} tháng (${ageMonths} tháng tại ngày khảo sát). Chưa có quy tắc cắt mốc tự động từ DOC.TT.02 — vui lòng xác nhận mẫu phiếu trước khi nhập.`
    } else if (fromGrade && fromAge && fromGrade !== fromAge) {
      isAgeBoundary = true
      boundaryReason = `Nhóm lớp đăng ký (${params.grade}) gợi ý ${fromGrade}, nhưng tuổi thực (${ageMonths} tháng) tương ứng ${fromAge}. Vui lòng xác nhận mẫu phiếu chính xác.`
    }
  } else if (!fromGrade) {
    isAgeBoundary = true
    boundaryReason = "Thiếu ngày sinh và nhóm lớp chuẩn — vui lòng chọn và xác nhận mẫu phiếu trước khi nhập."
  }

  const candidateSet = new Set<string>([suggestedFormCode])
  if (fromAge) candidateSet.add(fromAge)
  if (fromGrade) candidateSet.add(fromGrade)
  if (isAgeBoundary) {
    for (const c of EVALUATION_FORM_CODES) {
      const f = PRESCHOOL_FORM_REGISTRY[c]
      if (f.system === "ALL" || f.system === system) candidateSet.add(c)
    }
  }

  return {
    suggestedFormCode,
    formVersion: def?.version || "2026.1",
    ageMonths,
    system,
    isAgeBoundary,
    boundaryReason,
    candidateForms: Array.from(candidateSet),
  }
}

/**
 * Cộng thêm N ngày làm việc (bỏ Thứ 7, Chủ nhật).
 */
export function addBusinessDays(fromDate: Date, businessDays: number): Date {
  const result = new Date(fromDate.getTime())
  result.setHours(8, 0, 0, 0)
  let added = 0
  while (added < businessDays) {
    result.setDate(result.getDate() + 1)
    const day = result.getDay()
    if (day !== 0 && day !== 6) {
      added++
    }
  }
  return result
}

/**
 * Kiểm tra lịch hẹn trải nghiệm kết hợp quan sát tâm lý (B7B) phải cách ít nhất `minBusinessDays` (mặc định 2 ngày làm việc).
 */
export function validateFollowUpBusinessDays(
  baseDate: Date | string,
  targetDate: Date | string,
  minBusinessDays = 2
): { valid: boolean; earliestDate: Date; message?: string } {
  const base = baseDate instanceof Date ? baseDate : new Date(baseDate)
  const target = targetDate instanceof Date ? targetDate : new Date(targetDate)
  const earliestDate = addBusinessDays(base, minBusinessDays)

  if (isNaN(target.getTime())) {
    return { valid: false, earliestDate, message: "Ngày hẹn trải nghiệm không hợp lệ." }
  }

  const targetDayStart = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  const earliestDayStart = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), earliestDate.getDate())

  if (targetDayStart.getTime() < earliestDayStart.getTime()) {
    const formatted = earliestDate.toLocaleDateString("vi-VN")
    return {
      valid: false,
      earliestDate,
      message: `Lịch trải nghiệm kết hợp quan sát tâm lý (B7B) phải cách tối thiểu ${minBusinessDays} ngày làm việc (sớm nhất từ ngày ${formatted}).`,
    }
  }

  return { valid: true, earliestDate }
}

/**
 * Kiểm tra cổng điều kiện bắt buộc trước khi mở bước Trình duyệt GĐCS (B10).
 */
export function evaluatePreApprovalGate(
  round: {
    roundType?: string | null
    formCode?: string | null
    isAgeBoundary?: boolean
    formConfirmedAt?: Date | string | null
    heightCm?: number | null
    weightKg?: number | null
    physicalStatus?: string | null
    medicalCheckedAt?: Date | string | null
    criteriaPayloadJson?: string | null
    experienceObservation?: string | null
    teacherSubmittedAt?: Date | string | null
    psychologyPayloadJson?: string | null
    msTeamsReported?: boolean
    psychologistSubmittedAt?: Date | string | null
    reviewDecision?: string | null
    reviewedAt?: Date | string | null
  } | null,
  opts?: {
    hasLegacyScores?: boolean
    hasTrial?: boolean
    hasPsychology?: boolean
    studentBghStatus?: string | null
  }
): { ready: boolean; missing: string[]; warnings?: string[]; autoSkipToGdcs?: boolean } {
  if (!round) {
    return { ready: false, missing: ["Chưa có lần khảo sát / trải nghiệm nào được tạo."], warnings: [] }
  }

  const missing: string[] = []
  const warnings: string[] = []
  const rt = round.roundType || "KHAO_SAT_MOI"
  const hasEval = Boolean(round.teacherSubmittedAt || round.criteriaPayloadJson || opts?.hasLegacyScores)
  const normBgh = String(opts?.studentBghStatus || "").toUpperCase().trim()
  const bghProposesB10 = ["DE_XUAT_DAT", "DE_XUAT_CHUA_DAT", "DAT", "DAT_MIEN_HOC_THU", "KHONG_DAT", "CHUA_DAT"].includes(normBgh)
  const effectiveReviewDecision =
    round.reviewDecision ||
    (normBgh === "DE_XUAT_DAT" || normBgh === "DAT" || normBgh === "DAT_MIEN_HOC_THU"
      ? "DE_XUAT_DAT"
      : normBgh === "DE_XUAT_CHUA_DAT" || normBgh === "KHONG_DAT" || normBgh === "CHUA_DAT"
        ? "DE_XUAT_CHUA_DAT"
        : normBgh === "HEN_TRAI_NGHIEM" || normBgh === "DAT_HOC_THU"
          ? "HEN_TRAI_NGHIEM_BO_SUNG"
          : null)
  const hasReview = Boolean((round.reviewedAt && round.reviewDecision) || bghProposesB10)
  const noTrialAndNoPsy =
    !opts?.hasTrial &&
    !opts?.hasPsychology &&
    effectiveReviewDecision !== "CAN_TAM_LY" &&
    effectiveReviewDecision !== "HEN_TRAI_NGHIEM_BO_SUNG"

  if (rt === "KHAO_SAT_MOI") {
    if (!round.medicalCheckedAt && (round.heightCm == null || round.weightKg == null)) {
      if (noTrialAndNoPsy && hasEval) {
        warnings.push("B4A: Y tế chưa ghi nhận chiều cao, cân nặng (không chặn phê duyệt B10 khi không có Học trải nghiệm & Tâm lý).")
      } else {
        missing.push("B4A: Y tế chưa ghi nhận chiều cao, cân nặng và kiểm tra thể chất.")
      }
    }
    if (!round.formCode && !hasEval) {
      missing.push("B5: Chưa chọn mã biểu mẫu khảo sát (BM.KTĐBCL).")
    } else if (round.isAgeBoundary && !round.formConfirmedAt && !hasEval) {
      missing.push("B5: Mốc tuổi giáp ranh chưa được người phụ trách xác nhận mẫu phiếu.")
    }
    if (!hasEval) {
      missing.push("B5: Giáo viên chưa ghi nhận kết quả đánh giá theo phiếu.")
    }
    if (!hasReview) {
      missing.push("B6: Nhóm trưởng Mầm non chưa rà soát kết quả (Bước 1).")
    } else if (effectiveReviewDecision === "CAN_TAM_LY" || effectiveReviewDecision === "HEN_TRAI_NGHIEM_BO_SUNG") {
      missing.push("B6: Hồ sơ đang ở nhánh đánh giá tâm lý / trải nghiệm bổ sung — cần hoàn tất nhánh bổ sung trước khi trình duyệt.")
    }
  } else if (rt === "HOC_TRAI_NGHIEM" || rt === "TRAI_NGHIEM_BO_SUNG") {
    if (!round.experienceObservation?.trim() && !opts?.hasTrial) {
      missing.push(
        rt === "HOC_TRAI_NGHIEM"
          ? "B4B: Giáo viên chưa ghi nhận kết quả quan sát học trải nghiệm tại lớp."
          : "B8: Chưa ghi nhận kết quả quan sát buổi trải nghiệm kết hợp tâm lý."
      )
    }
    if (!hasReview) {
      missing.push("B9A: Nhóm trưởng Mầm non chưa rà soát kết luận sau trải nghiệm.")
    }
  } else if (rt === "PHONG_VAN_TAM_LY") {
    if (!round.psychologyPayloadJson && !round.psychologistSubmittedAt) {
      missing.push("B7A: Chưa hoàn thành phiếu sàng lọc tâm lý BM.KTĐBCL.09.")
    }
    if (!round.msTeamsReported) {
      missing.push("B7A: Chưa ghi nhận đã báo cáo nhanh qua MS Teams theo lưu đồ.")
    }
    if (!hasReview) {
      missing.push("B9A: Nhóm trưởng Mầm non chưa rà soát kết luận sau phỏng vấn tâm lý.")
    }
  }

  return { ready: missing.length === 0, missing, warnings, autoSkipToGdcs: noTrialAndNoPsy }
}

/**
 * Hàm tính kết luận tuyển sinh Mầm non thống nhất (dùng chung cho cả màn hình cũ và mới,
 * khắc phục lỗi GĐCS "DAT" ghi đè đề xuất "DAT_HOC_THU" của BGH).
 */
export function resolvePreschoolAdmissionResult(params: {
  bghStatus?: string | null
  gdcsStatus?: string | null
  finalApprovedOutcome?: string | null
}): string | null {
  const { bghStatus, gdcsStatus, finalApprovedOutcome } = params
  if (finalApprovedOutcome === "DAT") return "Đạt"
  if (finalApprovedOutcome === "CHUA_DAT") return "Chưa đạt"

  if (!gdcsStatus) return null
  if (gdcsStatus === "KHONG_DAT" || gdcsStatus === "CHUA_DAT" || bghStatus === "KHONG_DAT" || bghStatus === "CHUA_DAT") {
    return "Chưa đạt"
  }
  if (gdcsStatus === "DAT_HOC_THU" || (gdcsStatus === "DAT" && bghStatus === "DAT_HOC_THU")) {
    return "Đạt - Học Thử"
  }
  if (gdcsStatus === "DAT_MIEN_HOC_THU" || gdcsStatus === "DAT") {
    return "Đạt - Miễn Học Thử"
  }
  return null
}

/**
 * Ma trận phân quyền dữ liệu nhạy cảm Y tế (B4A) & Tâm lý (BM.KTĐBCL.09)
 */
const FULL_SENSITIVE_ROLES = new Set([
  "ADMIN",
  "SUPER_ADMIN",
  "KTDBCL",
  "GDCS",
  "BGH",
  "BGH_MN",
  "NHOM_TRUONG_MN",
  "BGH_CS",
])

export function getNormalizedRoles(primaryRole?: string | null, roles?: string[] | null): string[] {
  const set = new Set<string>()
  if (primaryRole) set.add(String(primaryRole).trim().toUpperCase())
  if (Array.isArray(roles)) {
    for (const r of roles) {
      if (r) set.add(String(r).trim().toUpperCase())
    }
  }
  return Array.from(set)
}

export function canViewSensitiveHealth(params: {
  userId?: string | null
  role?: string | null
  roles?: string[] | null
  assignedMedicalId?: string | null
  assignedTeacherId?: string | null
}): boolean {
  const allRoles = getNormalizedRoles(params.role, params.roles)
  if (allRoles.some((r) => FULL_SENSITIVE_ROLES.has(r) || r === "Y_TE")) return true
  if (params.userId && (params.userId === params.assignedMedicalId || params.userId === params.assignedTeacherId)) {
    return true
  }
  return false
}

export function canViewSensitivePsychology(params: {
  userId?: string | null
  role?: string | null
  roles?: string[] | null
  assignedPsychologistId?: string | null
}): boolean {
  const allRoles = getNormalizedRoles(params.role, params.roles)
  if (allRoles.some((r) => FULL_SENSITIVE_ROLES.has(r))) return true
  if (params.userId && params.userId === params.assignedPsychologistId) return true
  return false
}

export function sanitizeRoundForViewer<T extends Record<string, any>>(
  round: T,
  viewer: { userId?: string | null; role?: string | null; roles?: string[] | null }
): T & { canViewHealth: boolean; canViewPsychology: boolean } {
  const canViewHealth = canViewSensitiveHealth({
    userId: viewer.userId,
    role: viewer.role,
    roles: viewer.roles,
    assignedMedicalId: round.assignedMedicalId,
    assignedTeacherId: round.assignedTeacherId,
  })
  const canViewPsychology = canViewSensitivePsychology({
    userId: viewer.userId,
    role: viewer.role,
    roles: viewer.roles,
    assignedPsychologistId: round.assignedPsychologistId,
  })

  const copy: any = { ...round, canViewHealth, canViewPsychology }
  if (!canViewHealth) {
    copy.heightCm = null
    copy.weightKg = null
    copy.bmi = null
    copy.physicalStatus = round.medicalCheckedAt ? "DA_KIEM_TRA_AN_CHI_TIET" : null
    copy.physicalNote = null
  }
  if (!canViewPsychology) {
    copy.psychologyPayloadJson = null
    copy.msTeamsReportNote = null
  }
  return copy
}

/**
 * Quy tắc DOC.TT.02 chưa thể cấu hình tự động (hiển thị minh bạch trên SSM & báo cáo).
 */
export const DOC_TT_02_PENDING_RULES = [
  "Ngưỡng số lượng / tỷ lệ tiêu chí Đạt tối thiểu để tự động đề xuất Đạt hoặc Chưa đạt theo từng độ tuổi và hệ (Hệ S / Hệ Global).",
  "Danh mục tiêu chí điểm liệt bắt buộc chuyển sang nhánh sàng lọc tâm lý (BM.KTĐBCL.09) hoặc học trải nghiệm bổ sung.",
  "Quy tắc cắt mốc tuổi giáp ranh chính thức (18, 24, 36, 48, 60 tháng) khi ngày sinh sát mốc chuyển lớp.",
  "Tiêu chuẩn phân tầng chi tiết giữa Đạt ngay và yêu cầu Học trải nghiệm theo DOC.TT.02.",
]
