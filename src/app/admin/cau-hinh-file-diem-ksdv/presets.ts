import { FormulaType, RoundingRule } from "@/lib/grading/formula-calculator"
import {
  getGradeGroupKey,
  ORIENTATION_GRADE_GROUPS
} from "@/lib/orientation/criteria-config"

export interface PeriodOption {
  id: string
  code: string
  label: string
  shortLabel: string
  subLabel: string
  isCustomPeriod?: boolean
}

export const STANDARD_PERIOD_OPTIONS: PeriodOption[] = [
  {
    id: "ALL",
    code: "ALL",
    label: "Tất cả mốc thời gian",
    shortLabel: "Mẫu chung mọi kỳ",
    subLabel: "Áp dụng mặc định khi kỳ chưa có mẫu riêng"
  },
  {
    id: "DAU_NAM",
    code: "DAU_NAM",
    label: "Đầu năm (Tuyển sinh năm học mới)",
    shortLabel: "Đầu năm",
    subLabel: "Khảo sát tuyển sinh đầu năm học"
  },
  {
    id: "HK1",
    code: "HK1",
    label: "Học kỳ 1 (HK1 - Bổ sung môn)",
    shortLabel: "Học kỳ 1",
    subLabel: "Khảo sát chuyển trường / bổ sung HK1"
  },
  {
    id: "HK2",
    code: "HK2",
    label: "Học kỳ 2 (HK2 - Bổ sung môn)",
    shortLabel: "Học kỳ 2",
    subLabel: "Khảo sát chuyển trường / bổ sung HK2"
  }
]

export interface NormalizedSystemOption {
  code: string
  id: string
  name: string
  displayLabel: string
  shortBadge: string
  allIds: string[]
}

export const normalizeEduSystems = (eduSystems: any[], selectedYearId?: string): NormalizedSystemOption[] => {
  const byCode = new Map<string, NormalizedSystemOption>()

  // Ưu tiên hệ học thuộc năm học đang chọn trước, sau đó gộp các năm khác để không sót mã
  const sorted = [...(eduSystems || [])].sort((a, b) => {
    const aMatch = a?.academicYearId === selectedYearId ? 0 : 1
    const bMatch = b?.academicYearId === selectedYearId ? 0 : 1
    return aMatch - bMatch
  })

  sorted.forEach(sys => {
    if (!sys || !sys.code) return
    const code = String(sys.code).trim()
    const key = code.toUpperCase()
    const name = String(sys.name || code).trim()
    if (!byCode.has(key)) {
      byCode.set(key, {
        code,
        id: sys.id || code,
        name,
        displayLabel: name.includes(`(${code})`) ? name : `${name} (${code})`,
        shortBadge: code,
        allIds: [code, ...(sys.id ? [sys.id] : [])]
      })
    } else {
      const existing = byCode.get(key)!
      if (sys.id && !existing.allIds.includes(sys.id)) {
        existing.allIds.push(sys.id)
      }
    }
  })

  // Đảm bảo Hội nhập Quốc tế (HNG) luôn hiển thị trực quan ngay cả khi danh mục năm mới chưa đồng bộ
  if (!byCode.has("HNG")) {
    byCode.set("HNG", {
      code: "HNG",
      id: "HNG",
      name: "Hội nhập Quốc tế",
      displayLabel: "Hội nhập Quốc tế (HNG)",
      shortBadge: "HNG",
      allIds: ["HNG"]
    })
  }

  // Sắp xếp ưu tiên HNG lên đầu nhóm hệ học chuyên biệt để dễ thao tác
  const priorityOrder = ["HNG", "HNS", "HN", "CLC", "SN", "QT"]
  return Array.from(byCode.values()).sort((a, b) => {
    const idxA = priorityOrder.indexOf(a.code.toUpperCase())
    const idxB = priorityOrder.indexOf(b.code.toUpperCase())
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.name.localeCompare(b.name, "vi")
  })
}

export const isSameSystem = (
  cfgSystemValue: string | null | undefined,
  targetSystemCodeOrId: string,
  normalizedSystems: NormalizedSystemOption[]
): boolean => {
  const raw = (cfgSystemValue || "ALL").trim() || "ALL"
  const target = (targetSystemCodeOrId || "ALL").trim() || "ALL"
  if (target === "ALL") return raw === "ALL"
  if (raw.toUpperCase() === target.toUpperCase()) return true

  const sysObj = normalizedSystems.find(
    s => s.code.toUpperCase() === target.toUpperCase() || s.allIds.includes(target)
  )
  if (sysObj) {
    return sysObj.code.toUpperCase() === raw.toUpperCase() || sysObj.allIds.includes(raw)
  }
  return false
}

export const resolveSystemInfo = (
  cfgSystemValue: string | null | undefined,
  normalizedSystems: NormalizedSystemOption[],
  fallbackName?: string | null
): { code: string; name: string; fullLabel: string; isAll: boolean } => {
  const raw = (cfgSystemValue || "ALL").trim() || "ALL"
  if (raw === "ALL") {
    return {
      code: "ALL",
      name: "Mẫu chung tất cả hệ",
      fullLabel: "Tất cả hệ học (Mẫu chung)",
      isAll: true
    }
  }
  const found = normalizedSystems.find(
    s => s.code.toUpperCase() === raw.toUpperCase() || s.allIds.includes(raw)
  )
  if (found) {
    return {
      code: found.code,
      name: found.name,
      fullLabel: found.displayLabel,
      isAll: false
    }
  }
  const labelName = fallbackName || raw
  return {
    code: raw,
    name: labelName,
    fullLabel: labelName === raw ? raw : `${labelName} (${raw})`,
    isAll: false
  }
}

export const resolvePeriodInfo = (
  periodId: string | null | undefined,
  periods: any[]
): { id: string; shortLabel: string; fullLabel: string; subLabel: string; sortRank: number } => {
  const raw = (periodId || "ALL").trim() || "ALL"
  if (raw === "DAU_NAM") {
    return {
      id: "DAU_NAM",
      shortLabel: "Đầu năm",
      fullLabel: "Đầu năm — Tuyển sinh năm học mới",
      subLabel: "Khảo sát tuyển sinh đầu năm học",
      sortRank: 1
    }
  }
  if (raw === "HK1") {
    return {
      id: "HK1",
      shortLabel: "Học kỳ 1",
      fullLabel: "Học kỳ 1 — Khảo sát bổ sung HK1",
      subLabel: "Dành cho học sinh chuyển đến / bổ sung môn HK1",
      sortRank: 2
    }
  }
  if (raw === "HK2") {
    return {
      id: "HK2",
      shortLabel: "Học kỳ 2",
      fullLabel: "Học kỳ 2 — Khảo sát bổ sung HK2",
      subLabel: "Dành cho học sinh chuyển đến / bổ sung môn HK2",
      sortRank: 3
    }
  }
  if (raw === "ALL") {
    return {
      id: "ALL",
      shortLabel: "Mẫu chung mọi kỳ",
      fullLabel: "Mẫu chung — Áp dụng tất cả mốc thời gian",
      subLabel: "Cấu hình nền tảng khi kỳ khảo sát chưa tách mẫu riêng",
      sortRank: 99
    }
  }
  const found = (periods || []).find(p => p.id === raw || p.code === raw)
  if (found) {
    return {
      id: found.id,
      shortLabel: found.name || found.code,
      fullLabel: `Kỳ khảo sát: ${found.name}${found.code ? ` (${found.code})` : ""}`,
      subLabel: found.description || "Kỳ khảo sát chuyên biệt trong năm học",
      sortRank: 10
    }
  }
  return {
    id: raw,
    shortLabel: raw,
    fullLabel: `Kỳ khảo sát: ${raw}`,
    subLabel: "Mốc khảo sát đầu vào",
    sortRank: 50
  }
}

// Trả về cấu hình mẫu Phiếu định hướng đầu vào chuẩn hóa theo đúng khối lớp
export const getOrientationPresetByGrade = (gradeStr: string) => {
  const gKey = getGradeGroupKey(gradeStr)
  const cfg = ORIENTATION_GRADE_GROUPS[gKey] || ORIENTATION_GRADE_GROUPS.KHOI_1
  return {
    columnCount: cfg.criteria.length,
    columnNames: cfg.criteria.map(c => c.name),
    columnTypes: cfg.criteria.map(() => "QUALITATIVE_EVAL"),
    columnMaxScores: cfg.criteria.map(() => 4),
    hasComposite: true,
    compositeColumnName: `Đánh giá tổng thể & định hướng tiếp nhận (${cfg.label})`,
    formulaType: "NONE" as FormulaType,
    formulaCustom: "",
    weights: cfg.criteria.map(() => 1),
    roundingRule: "NONE" as RoundingRule,
    passScore: null,
    commitmentThreshold: null,
    isOrientationSheet: true,
    gradeGroupKey: gKey,
    gradeLabel: cfg.label,
    subLabel: cfg.subLabel,
    criteria: cfg.criteria,
    parentPrompts: cfg.parentPrompts
  }
}

export const COLUMN_TYPES = [
  { code: "SCORE_10", name: "Thang điểm 10 (Số thập phân MOET)" },
  { code: "SCORE_CUSTOM", name: "Thang điểm tùy chọn trong thang 10 (Tối đa 1 - 10đ)" },
  { code: "SCORE_100", name: "Thang điểm 100" },
  { code: "SCORE_CUSTOM_100", name: "Thang điểm tùy chọn trong thang 100 (Tối đa 1 - 100đ)" },
  { code: "GRADE_SKL", name: "Mức độ SKL (A - Tốt, B - Khá, C - Đạt, D - Chưa đạt)" },
  { code: "GRADE_INTL", name: "Mức độ Quốc tế (E - Tốt, S - Đạt, N - Cần cải thiện, U - Chưa đạt)" },
  { code: "GRADE_CEFR", name: "Xếp bậc CEFR (A1, A2, B1, B2, C1)" },
  { code: "QUALITATIVE_EVAL", name: "Định tính nhận diện (Tự tin / Bình thường / Cần hỗ trợ / Lưu ý đặc biệt)" },
  { code: "REMARK", name: "Định dạng Nhận xét bằng lời" }
]

export const isQualitativeType = (type?: string) => {
  return (
    type === "GRADE_SKL" ||
    type === "GRADE_INTL" ||
    type === "GRADE_CEFR" ||
    type === "QUALITATIVE_EVAL" ||
    type === "REMARK"
  )
}

export const SUBJECT_PRESETS: Record<string, any> = {
  TAv_10_TIEU_HOC: {
    columnCount: 3,
    columnNames: ["Reading (Đọc hiểu)", "Writing (Viết & Tự luận)", "Language Focus (Từ vựng & Ngữ pháp)"],
    columnTypes: ["SCORE_CUSTOM", "SCORE_CUSTOM", "SCORE_CUSTOM"],
    columnMaxScores: [4, 3, 3],
    hasComposite: true,
    compositeColumnName: "Điểm Tiếng Anh viết (Max 10đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 5.0,
    commitmentThreshold: null
  },
  TAv_10_THCS: {
    columnCount: 3,
    columnNames: ["Reading Comprehension", "Writing Sentence & Paragraph", "Language in Use"],
    columnTypes: ["SCORE_CUSTOM", "SCORE_CUSTOM", "SCORE_CUSTOM"],
    columnMaxScores: [4, 3, 3],
    hasComposite: true,
    compositeColumnName: "Điểm Tiếng Anh viết (Max 10đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 5.0,
    commitmentThreshold: null
  },
  TAv_10_THPT: {
    columnCount: 3,
    columnNames: ["Reading & Cloze test", "Writing & Essay", "Lexico-Grammar & Language"],
    columnTypes: ["SCORE_CUSTOM", "SCORE_CUSTOM", "SCORE_CUSTOM"],
    columnMaxScores: [4, 3, 3],
    hasComposite: true,
    compositeColumnName: "Điểm Tiếng Anh viết (Max 10đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 5.0,
    commitmentThreshold: null
  },
  TAv_10_KHOI_1: {
    columnCount: 3,
    columnNames: ["Reading (Đọc nhận biết từ)", "Writing (Viết từ & Câu đơn)", "Language Focus (Từ vựng cơ bản)"],
    columnTypes: ["SCORE_CUSTOM", "SCORE_CUSTOM", "SCORE_CUSTOM"],
    columnMaxScores: [4, 3, 3],
    hasComposite: true,
    compositeColumnName: "Điểm Tiếng Anh viết (Max 10đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 5.0,
    commitmentThreshold: null
  },
  // Giữ tương thích key cũ nhưng chuẩn hóa về thang 10đ
  TAv_70_TIEU_HOC: {
    columnCount: 3,
    columnNames: ["Reading (Đọc hiểu)", "Writing (Viết & Tự luận)", "Language Focus (Từ vựng & Ngữ pháp)"],
    columnTypes: ["SCORE_CUSTOM", "SCORE_CUSTOM", "SCORE_CUSTOM"],
    columnMaxScores: [4, 3, 3],
    hasComposite: true,
    compositeColumnName: "Điểm Tiếng Anh viết (Max 10đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 5.0,
    commitmentThreshold: null
  },
  TAv_70_THCS: {
    columnCount: 3,
    columnNames: ["Reading Comprehension", "Writing Sentence & Paragraph", "Language in Use"],
    columnTypes: ["SCORE_CUSTOM", "SCORE_CUSTOM", "SCORE_CUSTOM"],
    columnMaxScores: [4, 3, 3],
    hasComposite: true,
    compositeColumnName: "Điểm Tiếng Anh viết (Max 10đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 5.0,
    commitmentThreshold: null
  },
  TAv_70_THPT: {
    columnCount: 3,
    columnNames: ["Reading & Cloze test", "Writing & Essay", "Lexico-Grammar & Language"],
    columnTypes: ["SCORE_CUSTOM", "SCORE_CUSTOM", "SCORE_CUSTOM"],
    columnMaxScores: [4, 3, 3],
    hasComposite: true,
    compositeColumnName: "Điểm Tiếng Anh viết (Max 10đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 5.0,
    commitmentThreshold: null
  },
  TAv_10: {
    columnCount: 3,
    columnNames: ["Reading (Đọc hiểu)", "Writing (Viết & Tự luận)", "Language Focus (Từ vựng & Ngữ pháp)"],
    columnTypes: ["SCORE_CUSTOM", "SCORE_CUSTOM", "SCORE_CUSTOM"],
    columnMaxScores: [4, 3, 3],
    hasComposite: true,
    compositeColumnName: "Điểm Tiếng Anh viết (Max 10đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 5.0,
    commitmentThreshold: null
  },
  TAvd_30: {
    columnCount: 3,
    columnNames: ["Fluency & Pronunciation", "Lexical & Grammar", "Interactive Communication"],
    columnTypes: ["SCORE_10", "SCORE_10", "SCORE_10"],
    columnMaxScores: [10, 10, 10],
    hasComposite: true,
    compositeColumnName: "Điểm Tiếng Anh vấn đáp (Max 10đ)",
    formulaType: "AVERAGE",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 5.0,
    commitmentThreshold: null
  },
  TAvd_10: {
    columnCount: 3,
    columnNames: ["Fluency & Pronunciation", "Lexical & Grammar", "Interactive Communication"],
    columnTypes: ["SCORE_10", "SCORE_10", "SCORE_10"],
    columnMaxScores: [10, 10, 10],
    hasComposite: true,
    compositeColumnName: "Điểm Tiếng Anh vấn đáp (Max 10đ)",
    formulaType: "AVERAGE",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 5.0,
    commitmentThreshold: null
  },
  TLY: {
    columnCount: 6,
    columnNames: [
      "I. Cảm xúc & điều hòa cảm xúc (16đ)",
      "II. Hành vi & tự kiểm soát (12đ)",
      "III. Giao tiếp & tương tác xã hội (12đ)",
      "IV. Chú ý & kỹ năng học tập (16đ)",
      "V. Ngôn ngữ & tư duy / Tự nhận thức (12đ)",
      "VI. Động lực học tập & thái độ (12đ)"
    ],
    columnTypes: [
      "SCORE_CUSTOM_100",
      "SCORE_CUSTOM_100",
      "SCORE_CUSTOM_100",
      "SCORE_CUSTOM_100",
      "SCORE_CUSTOM_100",
      "SCORE_CUSTOM_100"
    ],
    columnMaxScores: [16, 12, 12, 16, 12, 12],
    hasComposite: true,
    compositeColumnName: "Tổng điểm Tâm lý (Max 80đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1, 1, 1, 1, 1],
    roundingRule: "ROUND_INT",
    passScore: 48.0,
    commitmentThreshold: 40.0
  },
  NLTD: {
    columnCount: 5,
    columnNames: [
      "Khả năng suy luận logic",
      "Khả năng liên tưởng",
      "Kĩ năng phản biện",
      "Khả năng giải quyết vấn đề",
      "Mức độ hoàn thành thử thách (%)"
    ],
    columnTypes: ["GRADE_SKL", "GRADE_SKL", "GRADE_SKL", "GRADE_SKL", "SCORE_CUSTOM_100"],
    columnMaxScores: [4, 4, 4, 4, 100],
    hasComposite: true,
    compositeColumnName: "Mức độ hoàn thành (%)",
    formulaType: "NONE",
    formulaCustom: "",
    weights: [1, 1, 1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 50.0,
    commitmentThreshold: 40.0
  },
  NLTD_SCORE: {
    columnCount: 3,
    columnNames: ["Tư duy Logic & Hình ảnh", "Tư duy Toán học & Định lượng", "Tư duy Ngôn ngữ & Khái quát"],
    columnTypes: ["SCORE_CUSTOM", "SCORE_CUSTOM", "SCORE_CUSTOM"],
    columnMaxScores: [4, 3, 3],
    hasComposite: true,
    compositeColumnName: "Điểm NLTD (Max 10đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 5.0,
    commitmentThreshold: 4.5
  },
  CHILD_DEV_16: {
    columnCount: 16,
    columnNames: [
      "CS65. Chào hỏi, cảm ơn, lễ phép",
      "CS74. Tập trung chú ý nhiệm vụ",
      "CS16. Nhận biết bản thân",
      "CS14. Xử lý tình huống nguy hiểm",
      "CS33. Lịch sự trong giao tiếp",
      "CS31. Phản hồi thông tin",
      "CS48. Thứ tự ngày trong tuần",
      "CS47. Xác định vị trí không gian",
      "CS51. Phân loại sự vật",
      "CS45. Nhận biết hình khối",
      "CS42,43. Số lượng phạm vi 10",
      "CS38. Nhận biết chữ cái tiếng Việt",
      "CS41. Bắt chước hành vi viết",
      "CS9. Tự phục vụ bản thân",
      "CS60. Thể hiện cảm xúc âm nhạc",
      "CS61. Tô màu khéo léo chi tiết"
    ],
    columnTypes: Array(16).fill("GRADE_SKL"),
    columnMaxScores: Array(16).fill(3),
    hasComposite: false,
    compositeColumnName: "Đánh giá Bộ chuẩn",
    formulaType: "NONE",
    formulaCustom: "",
    weights: Array(16).fill(1),
    roundingRule: "ROUND_INT",
    passScore: 12.0,
    commitmentThreshold: 10.0
  },
  EPT: {
    columnCount: 4,
    columnNames: ["Listening (Nghe)", "Reading (Đọc)", "Writing (Viết)", "Speaking (Nói)"],
    columnTypes: ["SCORE_CUSTOM_100", "SCORE_CUSTOM_100", "SCORE_CUSTOM_100", "SCORE_CUSTOM_100"],
    columnMaxScores: [25, 25, 25, 25],
    hasComposite: true,
    compositeColumnName: "Điểm tổng EPT (Max 100đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 50.0,
    commitmentThreshold: 40.0
  },
  ESL_VD: {
    columnCount: 3,
    columnNames: ["Fluency & Pronunciation", "Lexical & Grammar", "Interactive Communication"],
    columnTypes: ["SCORE_10", "SCORE_10", "SCORE_10"],
    columnMaxScores: [10, 10, 10],
    hasComposite: true,
    compositeColumnName: "Điểm Vấn đáp ESL (Max 10đ)",
    formulaType: "AVERAGE",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 5.0,
    commitmentThreshold: null
  },
  TOA: {
    columnCount: 2,
    columnNames: ["Trắc nghiệm tư duy số & Phép tính", "Tự luận giải toán & Thực hành"],
    columnTypes: ["SCORE_CUSTOM", "SCORE_CUSTOM"],
    columnMaxScores: [4, 6],
    hasComposite: true,
    compositeColumnName: "Tổng điểm Toán (Max 10đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1],
    roundingRule: "ROUND_1",
    passScore: 5.0,
    commitmentThreshold: 4.5
  },
  TVI: {
    columnCount: 2,
    columnNames: ["Đọc thành tiếng & Đọc hiểu", "Viết chính tả & Rèn chữ"],
    columnTypes: ["SCORE_CUSTOM", "SCORE_CUSTOM"],
    columnMaxScores: [5, 5],
    hasComposite: true,
    compositeColumnName: "Tổng điểm Tiếng Việt (Max 10đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1],
    roundingRule: "ROUND_1",
    passScore: 5.0,
    commitmentThreshold: 4.5
  },
  NVA: {
    columnCount: 2,
    columnNames: ["Đọc hiểu văn bản", "Làm văn & Nghị luận"],
    columnTypes: ["SCORE_CUSTOM", "SCORE_CUSTOM"],
    columnMaxScores: [4, 6],
    hasComposite: true,
    compositeColumnName: "Tổng điểm Ngữ văn (Max 10đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1],
    roundingRule: "ROUND_1",
    passScore: 5.0,
    commitmentThreshold: 4.5
  },
  TAv_70_KHOI_1: {
    columnCount: 3,
    columnNames: ["Reading (Đọc nhận biết từ)", "Writing (Viết từ & Câu đơn)", "Language Focus (Từ vựng cơ bản)"],
    columnTypes: ["SCORE_CUSTOM", "SCORE_CUSTOM", "SCORE_CUSTOM"],
    columnMaxScores: [4, 3, 3],
    hasComposite: true,
    compositeColumnName: "Điểm Tiếng Anh viết (Max 10đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 5.0,
    commitmentThreshold: null
  },
  PHIEU_DINH_HUONG: {
    columnCount: 4,
    columnNames: [
      "Hòa nhập & Giao tiếp tự tin",
      "Thói quen & Ý thức học tập",
      "Sở thích & Năng khiếu nổi trội",
      "Tâm lý & Nhu cầu hỗ trợ sớm"
    ],
    columnTypes: ["QUALITATIVE_EVAL", "QUALITATIVE_EVAL", "QUALITATIVE_EVAL", "QUALITATIVE_EVAL"],
    columnMaxScores: [4, 4, 4, 4],
    hasComposite: true,
    compositeColumnName: "Đánh giá tổng thể & định hướng tiếp nhận",
    formulaType: "NONE",
    formulaCustom: "",
    weights: [1, 1, 1, 1],
    roundingRule: "NONE",
    passScore: null,
    commitmentThreshold: null,
    isOrientationSheet: true
  }
}

export const resolvePresetDataForSubject = (subCode: string, gradeStr: string) => {
  const numG = parseInt((gradeStr || "").replace(/\D/g, ""), 10) || 1
  const codeNorm = (subCode || "").trim().toUpperCase()
  if (subCode === "PDH" || subCode === "PDHDV" || subCode === "ORIENTATION" || subCode === "PHIEU_DINH_HUONG") {
    return getOrientationPresetByGrade(gradeStr)
  }
  if (subCode === "TAv") {
    if (numG >= 10) return SUBJECT_PRESETS.TAv_10_THPT
    if (numG >= 6) return SUBJECT_PRESETS.TAv_10_THCS
    if (numG === 1) return SUBJECT_PRESETS.TAv_10_KHOI_1
    return SUBJECT_PRESETS.TAv_10_TIEU_HOC
  }
  if (subCode === "TAvd") return SUBJECT_PRESETS.TAvd_10
  if (codeNorm.includes("ESL")) return SUBJECT_PRESETS.ESL_VD || SUBJECT_PRESETS.TAvd_10
  if (subCode === "TCI" || subCode === "CHILD_DEV_16") return SUBJECT_PRESETS.CHILD_DEV_16
  if (subCode === "NVA") return SUBJECT_PRESETS.NVA || SUBJECT_PRESETS.TVI
  return SUBJECT_PRESETS[subCode] || SUBJECT_PRESETS[codeNorm] || null
}

export const getGradeType = (grade: string): "PRESCHOOL" | "G1" | "PRIMARY" | "SECONDARY_HIGH" => {
  const g = (grade || "").trim().toLowerCase()
  if (["mầm", "chồi", "lá", "nhà trẻ", "mầm non", "preschool"].some(k => g.includes(k))) {
    return "PRESCHOOL"
  }
  if (g === "khối 1" || g === "1" || g === "lớp 1" || g === "khoi 1") {
    return "G1"
  }
  const match = g.match(/\d+/)
  if (match) {
    const num = parseInt(match[0], 10)
    if (num >= 2 && num <= 5) return "PRIMARY"
    if (num >= 6 && num <= 12) return "SECONDARY_HIGH"
  }
  return "PRIMARY"
}

export const isSubjectApplicable = (subject: any, grade: string, periodId: string = "ALL"): boolean => {
  const code = (subject?.code || "").trim()
  const codeUpper = code.toUpperCase()
  const nameLower = String(subject?.name || "").toLowerCase()
  const isEslOral = codeUpper.includes("ESL") || nameLower.includes("esl")
  const gradeType = getGradeType(grade)

  if (gradeType === "PRESCHOOL") {
    return codeUpper === "TCI" || codeUpper === "PDHDV" || codeUpper === "PDH" || codeUpper.startsWith("MN")
  }

  if (codeUpper.startsWith("MN") || (codeUpper === "TCI" && gradeType !== "G1")) {
    return false
  }

  if (codeUpper === "PDHDV" || codeUpper === "PDH") return true
  if (codeUpper === "TLY") return true
  if (isEslOral) return true

  if (gradeType === "G1") {
    if (codeUpper === "TCI" || codeUpper === "NLTD" || code === "TAvd" || codeUpper === "TAVD") return true
    if (periodId === "DAU_NAM") {
      if (["TOA", "TVI", "TAV"].includes(codeUpper)) return false
    }
    if (["TOA", "TVI", "TAV"].includes(codeUpper)) return true
    if (["EPT", "NVA"].includes(codeUpper)) return false
    return false
  }

  if (gradeType === "PRIMARY") {
    if (["TOA", "TVI", "TAV", "TAVD", "EPT"].includes(codeUpper)) return true
    if (["NLTD", "NVA"].includes(codeUpper)) return false
    return false
  }

  if (gradeType === "SECONDARY_HIGH") {
    if (["TOA", "NVA", "TVI", "TAV", "TAVD", "EPT"].includes(codeUpper)) return true
    if (codeUpper === "NLTD") return false
    return false
  }

  return true
}

export const sortGradesNaturally = (gradeList: string[]): string[] => {
  return [...gradeList].sort((a, b) => {
    if (a === "ALL") return -1
    if (b === "ALL") return 1
    const na = parseInt(a.replace(/\D/g, ""), 10) || 0
    const nb = parseInt(b.replace(/\D/g, ""), 10) || 0
    return na - nb
  })
}
