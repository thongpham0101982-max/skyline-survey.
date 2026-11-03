"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import Link from "next/link"
import * as XLSX from "xlsx"
import { 
  FileSpreadsheet, 
  Settings, 
  Save, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  RefreshCw, 
  BookOpen, 
  Layers, 
  Award,
  Edit2,
  Trash2,
  Sliders,
  FileText,
  Calculator,
  Sparkles,
  HelpCircle,
  Play,
  Check,
  Info,
  Code,
  Calendar,
  Search,
  Filter,
  X,
  Copy,
  ChevronRight,
  ChevronDown,
  Table,
  GraduationCap,
  ClipboardCheck,
  CheckSquare,
  Square,
  HeartHandshake,
  UserCheck,
  Users,
  MessageSquareQuote,
  ExternalLink
} from "lucide-react"

import {
  calculateCompositeScore,
  generateExcelFormula,
  getFormulaDescription,
  parseWeights,
  parseMaxScores,
  getColumnMaxScore,
  roundScore,
  FormulaType,
  RoundingRule
} from "@/lib/grading/formula-calculator"

import {
  getGradeGroupKey,
  ORIENTATION_GRADE_GROUPS,
  getOrientationGradeGroupConfig,
  GradeGroupKey
} from "@/lib/orientation/criteria-config"

// Trả về cấu hình mẫu Phiếu định hướng đầu vào chuẩn hóa theo đúng khối lớp (1 trong 5 nhóm khối)
export const getOrientationPresetByGrade = (gradeStr: string) => {
  const gKey = getGradeGroupKey(gradeStr)
  const cfg = ORIENTATION_GRADE_GROUPS[gKey] || ORIENTATION_GRADE_GROUPS.KHOI_1
  return {
    columnCount: cfg.criteria.length,
    columnNames: cfg.criteria.map(c => c.name),
    columnTypes: cfg.criteria.map(() => "QUALITATIVE_EVAL"),
    columnMaxScores: cfg.criteria.map(() => 4),
    hasComposite: true,
    compositeColumnName: `Đánh giá Tổng thể & Định hướng Tiếp nhận (${cfg.label})`,
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

const COLUMN_TYPES = [
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

const isQualitativeType = (type?: string) => {
  return type === "GRADE_SKL" || type === "GRADE_INTL" || type === "GRADE_CEFR" || type === "QUALITATIVE_EVAL" || type === "REMARK"
}

// Gợi ý cấu hình nhanh theo môn chuyên biệt & theo cấp học
const SUBJECT_PRESETS: Record<string, any> = {
  // 1. TIẾNG ANH (VIẾT) - THANG 70Đ CHUẨN SKY-LINE
  TAv_70_TIEU_HOC: {
    columnCount: 3,
    columnNames: ["Reading (Đọc hiểu)", "Writing (Viết & Tự luận)", "Language Focus (Từ vựng & Ngữ pháp)"],
    columnTypes: ["SCORE_CUSTOM_100", "SCORE_CUSTOM_100", "SCORE_CUSTOM_100"],
    columnMaxScores: [25, 25, 20],
    hasComposite: true,
    compositeColumnName: "Tổng điểm Viết (Max 70đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 35.0,
    commitmentThreshold: null
  },
  TAv_70_THCS: {
    columnCount: 3,
    columnNames: ["Reading Comprehension", "Writing Sentence & Paragraph", "Language in Use"],
    columnTypes: ["SCORE_CUSTOM_100", "SCORE_CUSTOM_100", "SCORE_CUSTOM_100"],
    columnMaxScores: [25, 25, 20],
    hasComposite: true,
    compositeColumnName: "Tổng điểm Viết (Max 70đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 35.0,
    commitmentThreshold: null
  },
  TAv_70_THPT: {
    columnCount: 3,
    columnNames: ["Reading & Cloze test", "Writing & Essay", "Lexico-Grammar & Language"],
    columnTypes: ["SCORE_CUSTOM_100", "SCORE_CUSTOM_100", "SCORE_CUSTOM_100"],
    columnMaxScores: [30, 25, 15],
    hasComposite: true,
    compositeColumnName: "Tổng điểm Viết (Max 70đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 35.0,
    commitmentThreshold: null
  },
  // Tiếng Anh viết thang 10 quy đổi
  TAv_10: {
    columnCount: 3,
    columnNames: ["Reading (Đọc hiểu)", "Writing (Viết & Tự luận)", "Language Focus (Từ vựng & Ngữ pháp)"],
    columnTypes: ["SCORE_CUSTOM", "SCORE_CUSTOM", "SCORE_CUSTOM"],
    columnMaxScores: [4, 3, 3],
    hasComposite: true,
    compositeColumnName: "Điểm tổng hợp",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 5.0,
    commitmentThreshold: null
  },

  // 2. TIẾNG ANH (VẤN ĐÁP) - THANG 30Đ CHUẨN SKY-LINE
  TAvd_30: {
    columnCount: 3,
    columnNames: ["Fluency & Pronunciation", "Lexical & Grammar", "Interactive Communication"],
    columnTypes: ["SCORE_CUSTOM", "SCORE_CUSTOM", "SCORE_CUSTOM"],
    columnMaxScores: [10, 10, 10],
    hasComposite: true,
    compositeColumnName: "Tổng điểm Vấn đáp (Max 30đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 15.0,
    commitmentThreshold: null
  },
  TAvd_10: {
    columnCount: 3,
    columnNames: ["Fluency & Pronunciation", "Lexical & Grammar", "Interactive Communication"],
    columnTypes: ["SCORE_10", "SCORE_10", "SCORE_10"],
    columnMaxScores: [10, 10, 10],
    hasComposite: true,
    compositeColumnName: "Điểm phỏng vấn",
    formulaType: "AVERAGE",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 5.0,
    commitmentThreshold: null
  },

  // 3. TÂM LÝ - THANG 80Đ (6 NHÓM TIÊU CHÍ BÁM SÁT 100% FORM GIÁO VIÊN)
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
    columnTypes: ["SCORE_CUSTOM_100", "SCORE_CUSTOM_100", "SCORE_CUSTOM_100", "SCORE_CUSTOM_100", "SCORE_CUSTOM_100", "SCORE_CUSTOM_100"],
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

  // 4. NĂNG LỰC TƯ DUY (BÁM SÁT 100% FORM GIÁO VIÊN KHỐI 1)
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
  // Năng lực tư duy quy đổi thang điểm 10 (3 cấu phần)
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

  // 5. BỘ CHUẨN PHÁT TRIỂN TRẺ EM MẦM NON 5-6 TUỔI (QUYẾT ĐỊNH 4222/QĐ-BGDĐT)
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

  // 6. EPT - 4 KỸ NĂNG THANG 100Đ
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

  // 7. TOÁN HỌC (TOA) - THANG 10Đ (ÁP DỤNG HK1 & HK2 KHỐI 1 HOẶC KHỐI TIỂU HỌC)
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

  // 8. TIẾNG VIỆT (TVI) - THANG 10Đ (ÁP DỤNG HK1 & HK2 KHỐI 1 HOẶC KHỐI TIỂU HỌC)
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

  // 9. TIẾNG ANH (VIẾT) DÀNH CHO KHỐI 1 HK1/HK2 (THANG 70Đ)
  TAv_70_KHOI_1: {
    columnCount: 3,
    columnNames: ["Reading (Đọc nhận biết từ)", "Writing (Viết từ & Câu đơn)", "Language Focus (Từ vựng cơ bản)"],
    columnTypes: ["SCORE_CUSTOM_100", "SCORE_CUSTOM_100", "SCORE_CUSTOM_100"],
    columnMaxScores: [25, 25, 20],
    hasComposite: true,
    compositeColumnName: "Tổng điểm Viết (Max 70đ)",
    formulaType: "SUM",
    formulaCustom: "",
    weights: [1, 1, 1],
    roundingRule: "ROUND_1",
    passScore: 35.0,
    commitmentThreshold: null
  },

  // 10. PHIẾU ĐỊNH HƯỚNG ĐẦU VÀO (GỒM 2 TAB LIÊN KẾT: PHỎNG VẤN HS & TRAO ĐỔI PHHS)
  // Nguyên tắc: Không chấm điểm số thi đua, định tính ghi nhận 4 mức độ nhận diện
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
    compositeColumnName: "Đánh giá Tổng thể & Định hướng Tiếp nhận",
    formulaType: "NONE",
    formulaCustom: "",
    weights: [1, 1, 1, 1],
    roundingRule: "NONE",
    passScore: null,
    commitmentThreshold: null,
    isOrientationSheet: true
  }
}

// Phân loại khối lớp
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

// Kiểm tra môn học có tương ứng/áp dụng cho khối lớp và mốc thời gian hay không
export const isSubjectApplicable = (subject: any, grade: string, periodId: string = "ALL"): boolean => {
  const code = (subject?.code || "").toUpperCase()
  const gradeType = getGradeType(grade)

  // 1. Mầm non (Preschool): Bộ chuẩn 5-6 tuổi, Phiếu định hướng hoặc mã MN*
  if (gradeType === "PRESCHOOL") {
    return code === "TCI" || code === "PDHDV" || code === "PDH" || code.startsWith("MN")
  }

  // 2. Không áp dụng môn Mầm non (TCI) cho các khối phổ thông K12
  if (code === "TCI" || code.startsWith("MN")) {
    return false
  }

  // 3. Phiếu định hướng đầu vào (PDHDV): Áp dụng cho tất cả các khối
  if (code === "PDHDV" || code === "PDH") {
    return true
  }

  // 4. Tâm lý (TLY): Áp dụng cho tất cả các khối từ Khối 1 -> Khối 12
  if (code === "TLY") {
    return true
  }

  // 5. Khối 1:
  if (gradeType === "G1") {
    if (code === "NLTD" || code === "TAvd") return true
    if (periodId === "DAU_NAM") {
      // Tuyển sinh đầu năm: Chưa học chữ và số -> Không áp dụng Toán, Tiếng Việt, Tiếng Anh viết
      if (["TOA", "TVI", "TAv"].includes(code)) return false
    }
    if (["TOA", "TVI", "TAv"].includes(code)) return true
    // Khối 1 không có EPT, Ngữ Văn (NVA)
    if (["EPT", "NVA"].includes(code)) return false
    return false
  }

  // 6. Tiểu học (Khối 2 - Khối 5):
  if (gradeType === "PRIMARY") {
    // Tiểu học gồm: Toán (TOA), Tiếng Việt (TVI), Tiếng Anh viết (TAv), Tiếng Anh vấn đáp (TAvd), Tâm lý (TLY), PDHDV
    // Tuyệt đối KHÔNG xuất hiện: NLTD (chỉ khối 1), EPT (chỉ THCS/THPT), NVA (Ngữ văn chỉ THCS/THPT)
    if (["TOA", "TVI", "TAv", "TAvd"].includes(code)) return true
    if (["NLTD", "EPT", "NVA"].includes(code)) return false
    return false
  }

  // 7. THCS & THPT (Khối 6 - Khối 12):
  if (gradeType === "SECONDARY_HIGH") {
    // Gồm: Toán (TOA), Ngữ văn (NVA), Tiếng Việt (TVI), Tiếng Anh viết (TAv), Tiếng Anh vấn đáp (TAvd), EPT, Tâm lý (TLY), PDHDV
    // Tuyệt đối KHÔNG xuất hiện: NLTD (chỉ khối 1)
    if (["TOA", "NVA", "TVI", "TAv", "TAvd", "EPT"].includes(code)) return true
    if (code === "NLTD") return false
    return false
  }

  return true
}

interface Props {
  academicYears: any[]
  activeYearId: string
  subjects: any[]
  eduSystems: any[]
  periods: any[]
  grades: string[]
  campuses: any[]
  currentUser?: any
}

export function CauHinhFileDiemKsdvClient(props: Props) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải Cấu hình File điểm Khảo sát đầu vào...</div>}>
      <CauHinhFileDiemKsdvClientInner {...props} />
    </Suspense>
  )
}

function CauHinhFileDiemKsdvClientInner({
  academicYears,
  activeYearId,
  subjects,
  eduSystems,
  periods,
  grades,
  campuses,
  currentUser
}: Props) {
  // Top Filter States
  const [selectedYearId, setSelectedYearId] = useState(activeYearId || (academicYears[0]?.id || ""))
  const [selectedPeriodId, setSelectedPeriodId] = useState("ALL")
  const [selectedSystemId, setSelectedSystemId] = useState("ALL")
  const [selectedGrade, setSelectedGrade] = useState("Khối 1")
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || "")

  // Danh sách môn khảo sát tương ứng với Khối lớp và Mốc thời gian đang chọn
  const applicableSubjects = useMemo(() => {
    return subjects.filter(s => isSubjectApplicable(s, selectedGrade, selectedPeriodId))
  }, [subjects, selectedGrade, selectedPeriodId])

  // Danh sách các mã Preset áp dụng tương ứng cho Khối lớp đang chọn
  const applicablePresetCodes = useMemo(() => {
    const gradeType = getGradeType(selectedGrade)
    if (gradeType === "PRESCHOOL") {
      return ["TCI", "PDHDV"]
    }
    if (gradeType === "G1") {
      if (selectedPeriodId === "DAU_NAM") {
        return ["TAvd", "TLY", "NLTD", "PDHDV"]
      }
      if (selectedPeriodId === "HK1" || selectedPeriodId === "HK2") {
        return ["TOA", "TVI", "TAv", "TAvd", "TLY", "NLTD", "PDHDV"]
      }
      return ["TAvd", "TLY", "NLTD", "TOA", "TVI", "TAv", "PDHDV"]
    }
    if (gradeType === "PRIMARY") {
      return ["TOA", "TVI", "TAv", "TAvd", "TLY", "PDHDV"]
    }
    return ["TOA", "NVA", "TAv", "TAvd", "EPT", "TLY", "PDHDV"]
  }, [selectedGrade, selectedPeriodId])

  // Current active subject definition
  const currentSubject = subjects.find(s => s.id === selectedSubjectId)

  // Kiểm tra xem môn hiện tại có phải Tiếng Anh không (Bỏ trường Ngưỡng cam kết rèn luyện)
  const isEnglishSubject = useMemo(() => {
    const code = (currentSubject?.code || "").toLowerCase()
    const name = (currentSubject?.name || "").toLowerCase()
    return Boolean(
      code === "tav" ||
      code === "tavd" ||
      code === "ept" ||
      code.includes("eng") ||
      code.includes("esl") ||
      name.includes("tiếng anh") ||
      name.includes("english")
    )
  }, [currentSubject])

  // Form states
  const [columnCount, setColumnCount] = useState(3)
  const [columnNames, setColumnNames] = useState<string[]>(["Reading", "Writing", "Language Use"])
  const [columnTypes, setColumnTypes] = useState<string[]>(["SCORE_CUSTOM", "SCORE_CUSTOM", "SCORE_CUSTOM"])
  const [columnMaxScores, setColumnMaxScores] = useState<number[]>([4, 3, 3])
  
  // Composite & Formula states
  const [hasComposite, setHasComposite] = useState(true)
  const [compositeColumnName, setCompositeColumnName] = useState("Điểm tổng hợp")
  const [formulaType, setFormulaType] = useState<FormulaType>("SUM")
  const [weights, setWeights] = useState<number[]>([1, 1, 1])
  const [formulaCustom, setFormulaCustom] = useState<string>("")
  const [roundingRule, setRoundingRule] = useState<RoundingRule>("ROUND_1")
  const [weightedMode, setWeightedMode] = useState<"COEFF" | "PERCENT">("COEFF")

  // Benchmark & Remarks
  const [hasRemark, setHasRemark] = useState(true)
  const [passScore, setPassScore] = useState<string>("5.0")
  const [commitmentThreshold, setCommitmentThreshold] = useState<string>("4.5")

  // Live Formula Simulator
  const [simScores, setSimScores] = useState<Record<number, string>>({ 0: "3.5", 1: "2.5", 2: "2.0" })

  // Saved configs state
  const [savedConfigs, setSavedConfigs] = useState<any[]>([])
  const [loadingConfigs, setLoadingConfigs] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ text: string, type: "ok" | "err" } | null>(null)

  // Batch modal state
  const [isBatchOpen, setIsBatchOpen] = useState(false)
  const [batchPeriodId, setBatchPeriodId] = useState("ALL")
  const [batchSystemId, setBatchSystemId] = useState("ALL")
  const [batchGrade, setBatchGrade] = useState("Khối 1")
  const [batchSelectedSubjectIds, setBatchSelectedSubjectIds] = useState<string[]>([])
  const [batchPreset, setBatchPreset] = useState<"CURRENT" | "TAV_70" | "TAV_10" | "TAVD_30" | "TAVD_10" | "TOA" | "TVI" | "TLY" | "NLTD" | "NLTD_SCORE" | "CHILD_DEV_16" | "EPT" | "PHIEU_DINH_HUONG">("CURRENT")
  const [activeOrientationSimTab, setActiveOrientationSimTab] = useState<"tab1" | "tab2">("tab1")
  const [simQualitativeAnswers, setSimQualitativeAnswers] = useState<Record<number, string>>({
    0: "CONFIDENT",
    1: "NORMAL",
    2: "CONFIDENT",
    3: "NORMAL"
  })

  // Clone modal state
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false)
  const [cloneSourceConfigId, setCloneSourceConfigId] = useState("")

  // List filter & view states
  const [listFilterSystemId, setListFilterSystemId] = useState("ALL")
  const [listFilterGrade, setListFilterGrade] = useState("ALL")
  const [listFilterPeriod, setListFilterPeriod] = useState("ALL")
  const [listFilterSubjectId, setListFilterSubjectId] = useState(subjects[0]?.id || "ALL")
  const [listSearchTerm, setListSearchTerm] = useState("")
  const [listViewMode, setListViewMode] = useState<"GROUPED" | "FLAT">("GROUPED")
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({})

  // Fetch configs
  const fetchConfigs = async () => {
    try {
      setLoadingConfigs(true)
      const res = await fetch(`/api/admin/input-assessments/grade-configs?academicYearId=${selectedYearId}`)
      const data = await res.json()
      if (data.success) {
        setSavedConfigs(data.configs || [])
      }
    } catch (e) {
      console.error("Error fetching configs:", e)
    } finally {
      setLoadingConfigs(false)
    }
  }

  useEffect(() => {
    if (selectedYearId) {
      fetchConfigs()
    }
  }, [selectedYearId])

  // Sync arrays length when columnCount changes
  useEffect(() => {
    setColumnNames(prev => {
      const next = [...prev]
      while (next.length < columnCount) next.push(`Cột điểm ${next.length + 1}`)
      return next.slice(0, columnCount)
    })
    setColumnTypes(prev => {
      const next = [...prev]
      while (next.length < columnCount) next.push("SCORE_10")
      return next.slice(0, columnCount)
    })
    setColumnMaxScores(prev => {
      const next = [...prev]
      while (next.length < columnCount) next.push(10)
      return next.slice(0, columnCount)
    })
    setWeights(prev => {
      const next = [...prev]
      while (next.length < columnCount) next.push(1)
      return next.slice(0, columnCount)
    })
  }, [columnCount])

  // Áp dụng cấu hình hiện có hoặc preset khi thay đổi môn/khối
  const applyPresetForSubject = (subCode: string, targetGrade?: string) => {
    const curGrade = targetGrade || selectedGrade
    const numG = parseInt(curGrade.replace("Khối ", "").trim()) || 1

    let presetKey = subCode
    if (subCode === "TAv") {
      if (numG >= 10) {
        presetKey = "TAv_70_THPT"
      } else if (numG >= 6) {
        presetKey = "TAv_70_THCS"
      } else if (numG === 1) {
        presetKey = "TAv_70_KHOI_1"
      } else {
        presetKey = "TAv_70_TIEU_HOC"
      }
    } else if (subCode === "TAvd") {
      presetKey = "TAvd_30"
    } else if (subCode === "TOA") {
      presetKey = "TOA"
    } else if (subCode === "TVI") {
      presetKey = "TVI"
    } else if (subCode === "NVA") {
      presetKey = "TVI"
    } else if (subCode === "PDH" || subCode === "ORIENTATION" || subCode === "PHIEU_DINH_HUONG" || subCode === "PDHDV") {
      const preset = getOrientationPresetByGrade(curGrade)
      const pdhSub = subjects.find(s => s.code === "PDHDV" || s.code === "PDH" || s.code === subCode)
      if (pdhSub) {
        setSelectedSubjectId(pdhSub.id)
        setListFilterSubjectId(pdhSub.id)
      }
      setColumnCount(preset.columnCount)
      setColumnNames(preset.columnNames)
      setColumnTypes(preset.columnTypes)
      setColumnMaxScores(preset.columnMaxScores)
      setHasComposite(preset.hasComposite)
      setCompositeColumnName(preset.compositeColumnName)
      setFormulaType(preset.formulaType)
      setFormulaCustom(preset.formulaCustom)
      setWeights(preset.weights)
      setRoundingRule(preset.roundingRule)
      setPassScore("")
      setCommitmentThreshold("")
      showMessage(`Đã áp dụng mẫu chuẩn [Phiếu định hướng đầu vào] cho ${curGrade} (${preset.gradeLabel} - ${preset.subLabel})!`, "ok")
      return
    } else if (subCode === "TCI" || subCode === "CHILD_DEV_16") {
      presetKey = "CHILD_DEV_16"
    }

    // Tự động tìm và chọn đúng Môn khảo sát tương ứng
    const subObj = subjects.find(s => 
      s.code === subCode || 
      (subCode === "PDHDV" && (s.code === "PDHDV" || s.code === "PDH")) ||
      (subCode === "TCI" && s.code === "TCI")
    )
    if (subObj) {
      setSelectedSubjectId(subObj.id)
      setListFilterSubjectId(subObj.id)
    }

    const preset = SUBJECT_PRESETS[presetKey] || SUBJECT_PRESETS[subCode]
    if (preset) {
      setColumnCount(preset.columnCount)
      setColumnNames(preset.columnNames)
      setColumnTypes(preset.columnTypes)
      setColumnMaxScores(preset.columnMaxScores)
      setHasComposite(preset.hasComposite)
      setCompositeColumnName(preset.compositeColumnName)
      setFormulaType(preset.formulaType)
      setFormulaCustom(preset.formulaCustom)
      setWeights(preset.weights)
      setRoundingRule(preset.roundingRule)
      setPassScore(preset.passScore != null ? String(preset.passScore) : "35.0")
      setCommitmentThreshold(preset.commitmentThreshold != null ? String(preset.commitmentThreshold) : "")
      
      const newSim: Record<number, string> = {}
      preset.columnMaxScores.forEach((m: number, idx: number) => {
        newSim[idx] = String(Math.round(m * 0.7))
      })
      setSimScores(newSim)
      showMessage(`Đã áp dụng mẫu chuẩn [${preset.compositeColumnName || subCode}] cho ${curGrade}!`, "ok")
    }
  }

  // Áp dụng Mẫu Phiếu định hướng đầu vào (2 Tab liên kết) theo đúng Khối lớp đang chọn
  const applyOrientationPreset = () => {
    const pdhSub = subjects.find(s => s.code === "PDHDV" || s.code === "PDH")
    if (pdhSub) {
      setSelectedSubjectId(pdhSub.id)
      setListFilterSubjectId(pdhSub.id)
    }

    const preset = getOrientationPresetByGrade(selectedGrade)
    if (preset) {
      setColumnCount(preset.columnCount)
      setColumnNames(preset.columnNames)
      setColumnTypes(preset.columnTypes)
      setColumnMaxScores(preset.columnMaxScores)
      setHasComposite(preset.hasComposite)
      setCompositeColumnName(preset.compositeColumnName)
      setFormulaType(preset.formulaType)
      setFormulaCustom(preset.formulaCustom)
      setWeights(preset.weights)
      setRoundingRule(preset.roundingRule)
      setPassScore("")
      setCommitmentThreshold("")
      showMessage(`Đã áp dụng mẫu [Phiếu định hướng đầu vào: Gồm 2 Tab liên kết] chuẩn cho ${selectedGrade} (${preset.gradeLabel} - ${preset.subLabel})!`, "ok")
    }
  }

  const handleSelectGradeChange = (newGrade: string) => {
    setSelectedGrade(newGrade)

    // Lọc danh sách môn tương ứng với khối lớp mới
    const validSubs = subjects.filter(s => isSubjectApplicable(s, newGrade, selectedPeriodId))
    const isCurrentValid = validSubs.some(s => s.id === selectedSubjectId)
    let effectiveSubId = selectedSubjectId

    if (!isCurrentValid && validSubs.length > 0) {
      effectiveSubId = validSubs[0].id
      setSelectedSubjectId(effectiveSubId)
    }

    // Tự động đồng bộ bộ lọc danh sách bên phải theo môn tương ứng
    setListFilterSubjectId(effectiveSubId)

    const subObj = subjects.find(s => s.id === effectiveSubId)
    const isPDH = subObj?.code === "PDHDV" || subObj?.code === "PDH" || subObj?.name?.toLowerCase().includes("định hướng")

    // Đối với môn Phiếu định hướng đầu vào: Luôn ưu tiên nạp cấu hình đúng chính xác của khối đó
    if (isPDH) {
      const exactExisting = savedConfigs.find(c => 
        c.subjectId === effectiveSubId && 
        c.grade === newGrade &&
        (c.educationSystemId === selectedSystemId || c.educationSystemId === "ALL")
      )
      if (exactExisting) {
        loadConfigToForm(exactExisting)
      } else {
        if (subObj) applyPresetForSubject(subObj.code, newGrade)
      }
      return
    }

    // Nếu có config lưu sẵn thì load, ngược lại nếu đang ở môn TAv/TAvd/EPT thì tự sync preset theo khối
    const existing = savedConfigs.find(c => 
      c.subjectId === effectiveSubId && 
      (c.grade === newGrade || c.grade === "ALL") &&
      (c.educationSystemId === selectedSystemId || c.educationSystemId === "ALL")
    )
    if (existing) {
      loadConfigToForm(existing)
    } else {
      if (subObj) {
        applyPresetForSubject(subObj.code, newGrade)
      }
    }
  }

  const handleSelectSubjectChange = (subId: string) => {
    setSelectedSubjectId(subId)
    // Tự động đồng bộ bộ lọc danh sách bên phải để chỉ hiển thị môn khảo sát tương ứng
    setListFilterSubjectId(subId)

    const subObj = subjects.find(s => s.id === subId)
    const isPDH = subObj?.code === "PDHDV" || subObj?.code === "PDH" || subObj?.name?.toLowerCase().includes("định hướng")

    // Đối với môn Phiếu định hướng đầu vào: Luôn ưu tiên nạp cấu hình đúng chính xác của khối đang chọn
    if (isPDH) {
      const exactExisting = savedConfigs.find(c => 
        c.subjectId === subId && 
        c.grade === selectedGrade &&
        (c.educationSystemId === selectedSystemId || c.educationSystemId === "ALL")
      )
      if (exactExisting) {
        loadConfigToForm(exactExisting)
      } else {
        if (subObj) applyPresetForSubject(subObj.code, selectedGrade)
      }
      return
    }

    // Kiểm tra xem đã có cấu hình lưu sẵn trong database cho tổ hợp này chưa
    const existing = savedConfigs.find(c => 
      c.subjectId === subId && 
      (c.grade === selectedGrade || c.grade === "ALL") &&
      (c.educationSystemId === selectedSystemId || c.educationSystemId === "ALL")
    )
    if (existing) {
      loadConfigToForm(existing)
    } else {
      if (subObj) {
        applyPresetForSubject(subObj.code, selectedGrade)
      }
    }
  }

  const loadConfigToForm = (cfg: any) => {
    try {
      const names = JSON.parse(cfg.columnNames || "[]")
      const types = JSON.parse(cfg.columnTypes || "[]")
      const maxScores = JSON.parse(cfg.columnMaxScores || "[]")
      const w = JSON.parse(cfg.weights || "[]")

      setColumnCount(cfg.columnCount || names.length || 1)
      setColumnNames(names)
      setColumnTypes(types)
      setColumnMaxScores(maxScores)
      setHasComposite(cfg.hasCompositeColumn)
      setCompositeColumnName(cfg.compositeColumnName || "Điểm tổng hợp")
      setFormulaType(cfg.formula || "AVERAGE")
      setFormulaCustom(cfg.formulaCustom || "")
      setWeights(w.length > 0 ? w : names.map(() => 1))
      setRoundingRule(cfg.roundingRule || "ROUND_1")
      setHasRemark(cfg.hasRemarkColumn)
      setPassScore(cfg.passScore != null ? String(cfg.passScore) : "5.0")
      const targetSub = subjects.find(s => s.id === cfg.subjectId)
      const isSubEnglish = Boolean(targetSub && (
        ["tav", "tavd", "ept"].includes((targetSub.code || "").toLowerCase()) ||
        (targetSub.code || "").toLowerCase().includes("eng") ||
        (targetSub.code || "").toLowerCase().includes("esl") ||
        (targetSub.name || "").toLowerCase().includes("tiếng anh") ||
        (targetSub.name || "").toLowerCase().includes("english")
      ))
      setCommitmentThreshold(isSubEnglish ? "" : (cfg.commitmentThreshold != null ? String(cfg.commitmentThreshold) : ""))

      const newSim: Record<number, string> = {}
      maxScores.forEach((m: number, idx: number) => {
        newSim[idx] = String((m * 0.75).toFixed(1))
      })
      setSimScores(newSim)

      setSelectedGrade(cfg.grade !== "ALL" ? cfg.grade : selectedGrade)
      setSelectedSystemId(cfg.educationSystemId || "ALL")
      setSelectedPeriodId(cfg.periodId || "ALL")
      setSelectedSubjectId(cfg.subjectId)
      setListFilterSubjectId(cfg.subjectId)

      window.scrollTo({ top: 120, behavior: "smooth" })
      showMessage("Đã nạp thông số cấu hình lên form thiết lập!", "ok")
    } catch (e) {
      console.error("Error loading config:", e)
    }
  }

  const showMessage = (text: string, type: "ok" | "err" = "ok") => {
    setActionMessage({ text, type })
    setTimeout(() => setActionMessage(null), 4000)
  }

  // Calculate live simulator result
  const simulatedResult = useMemo(() => {
    if (!hasComposite) return null
    const scoresArr: (number | null)[] = []
    for (let i = 0; i < columnCount; i++) {
      const val = parseFloat(simScores[i])
      scoresArr.push(isNaN(val) ? null : val)
    }
    const configLike = {
      formula: formulaType,
      weights,
      formulaCustom,
      roundingRule,
      columnCount,
      columnMaxScores,
      columnTypes
    }
    return calculateCompositeScore(scoresArr, configLike)
  }, [hasComposite, simScores, columnCount, formulaType, weights, formulaCustom, roundingRule, columnMaxScores, columnTypes])

  // Tổng điểm tối đa các cột thành phần
  const totalMaxScore = useMemo(() => {
    let sum = 0
    for (let i = 0; i < columnCount; i++) {
      if (!isQualitativeType(columnTypes[i])) {
        sum += (columnMaxScores[i] !== undefined ? columnMaxScores[i] : 10)
      }
    }
    return Math.round(sum * 100) / 100
  }, [columnCount, columnTypes, columnMaxScores])

  // Save Config
  const handleSaveConfig = async () => {
    if (!selectedSubjectId) {
      showMessage("Vui lòng chọn Môn khảo sát đầu vào!", "err")
      return
    }

    try {
      setSavingConfig(true)
      const res = await fetch("/api/admin/input-assessments/grade-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          periodId: selectedPeriodId,
          educationSystemId: selectedSystemId,
          grade: selectedGrade,
          subjectId: selectedSubjectId,
          columnCount,
          columnNames,
          columnTypes,
          columnMaxScores,
          hasCompositeColumn: hasComposite,
          compositeColumnName,
          hasRemarkColumn: hasRemark,
          formula: formulaType,
          formulaCustom,
          weights,
          roundingRule,
          passScore: passScore ? parseFloat(passScore) : null,
          commitmentThreshold: isEnglishSubject ? null : (commitmentThreshold ? parseFloat(commitmentThreshold) : null)
        })
      })

      const data = await res.json()
      if (data.success) {
        showMessage("Lưu cấu hình File điểm khảo sát đầu vào thành công!", "ok")
        fetchConfigs()
      } else {
        showMessage(data.error || "Không thể lưu cấu hình", "err")
      }
    } catch (e: any) {
      showMessage("Lỗi hệ thống: " + e.message, "err")
    } finally {
      setSavingConfig(false)
    }
  }

  // Delete Config
  const handleDeleteConfig = async (id: string, subName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa cấu hình điểm cho môn "${subName}"?`)) return
    try {
      const res = await fetch(`/api/admin/input-assessments/grade-configs?id=${id}`, {
        method: "DELETE"
      })
      const data = await res.json()
      if (data.success) {
        showMessage("Đã xóa cấu hình thành công!", "ok")
        fetchConfigs()
      } else {
        showMessage(data.error || "Không thể xóa cấu hình", "err")
      }
    } catch (e: any) {
      showMessage("Lỗi hệ thống: " + e.message, "err")
    }
  }

  // Open Batch modal
  const openBatchModal = () => {
    setBatchPeriodId(selectedPeriodId)
    setBatchSystemId(selectedSystemId)
    setBatchGrade(selectedGrade)
    const valid = subjects.filter(s => isSubjectApplicable(s, selectedGrade, selectedPeriodId))
    setBatchSelectedSubjectIds(valid.map(s => s.id))
    setIsBatchOpen(true)
  }

  // Apply cloned config from another grade
  const handleApplyClone = () => {
    const srcCfg = savedConfigs.find(c => c.id === cloneSourceConfigId)
    if (!srcCfg) return

    try {
      const names = JSON.parse(srcCfg.columnNames || "[]")
      const types = JSON.parse(srcCfg.columnTypes || "[]")
      const maxScores = JSON.parse(srcCfg.columnMaxScores || "[]")
      const w = JSON.parse(srcCfg.weights || "[]")

      setColumnCount(srcCfg.columnCount || names.length || 1)
      setColumnNames(names)
      setColumnTypes(types)
      setColumnMaxScores(maxScores)
      setHasComposite(srcCfg.hasCompositeColumn)
      setCompositeColumnName(srcCfg.compositeColumnName || "Điểm tổng hợp")
      setFormulaType(srcCfg.formula || "AVERAGE")
      setFormulaCustom(srcCfg.formulaCustom || "")
      setWeights(w.length > 0 ? w : names.map(() => 1))
      setRoundingRule(srcCfg.roundingRule || "ROUND_1")
      setHasRemark(srcCfg.hasRemarkColumn)
      setPassScore(srcCfg.passScore != null ? String(srcCfg.passScore) : "5.0")
      if (!isEnglishSubject) {
        setCommitmentThreshold(srcCfg.commitmentThreshold != null ? String(srcCfg.commitmentThreshold) : "")
      } else {
        setCommitmentThreshold("")
      }

      setIsCloneModalOpen(false)
      showMessage(`Đã sao chép cấu hình từ ${srcCfg.grade || "mẫu khác"} sang ${selectedGrade}!`, "ok")
    } catch (e: any) {
      showMessage("Lỗi khi sao chép: " + e.message, "err")
    }
  }

  // Save Batch Assign
  const handleSaveBatch = async () => {
    if (batchSelectedSubjectIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 môn học để gán!")
      return
    }

    try {
      setBatchSaving(true)
      let payload: any = {
        academicYearId: selectedYearId,
        periodId: batchPeriodId,
        educationSystemId: batchSystemId,
        grade: batchGrade,
        batchSubjectIds: batchSelectedSubjectIds,
        columnCount,
        columnNames,
        columnTypes,
        columnMaxScores,
        hasCompositeColumn: hasComposite,
        compositeColumnName,
        hasRemarkColumn: hasRemark,
        formula: formulaType,
        formulaCustom,
        weights,
        roundingRule,
        passScore: passScore ? parseFloat(passScore) : null,
        commitmentThreshold: commitmentThreshold ? parseFloat(commitmentThreshold) : null
      }

      if (batchPreset === "TAV_70") {
        const numG = parseInt(batchGrade.replace("Khối ", "").trim()) || 1
        const p = numG >= 10 ? SUBJECT_PRESETS.TAv_70_THPT : numG >= 6 ? SUBJECT_PRESETS.TAv_70_THCS : numG === 1 ? SUBJECT_PRESETS.TAv_70_KHOI_1 : SUBJECT_PRESETS.TAv_70_TIEU_HOC
        payload = { ...payload, ...p }
      } else if (batchPreset === "TAV_10") {
        const p = SUBJECT_PRESETS.TAv_10
        payload = { ...payload, ...p }
      } else if (batchPreset === "TAVD_30") {
        const p = SUBJECT_PRESETS.TAvd_30
        payload = { ...payload, ...p }
      } else if (batchPreset === "TAVD_10") {
        const p = SUBJECT_PRESETS.TAvd_10
        payload = { ...payload, ...p }
      } else if (batchPreset === "TOA") {
        const p = SUBJECT_PRESETS.TOA
        payload = { ...payload, ...p }
      } else if (batchPreset === "TVI") {
        const p = SUBJECT_PRESETS.TVI
        payload = { ...payload, ...p }
      } else if (batchPreset === "TLY") {
        const p = SUBJECT_PRESETS.TLY
        payload = { ...payload, ...p }
      } else if (batchPreset === "NLTD") {
        const p = SUBJECT_PRESETS.NLTD
        payload = { ...payload, ...p }
      } else if (batchPreset === "NLTD_SCORE") {
        const p = SUBJECT_PRESETS.NLTD_SCORE
        payload = { ...payload, ...p }
      } else if (batchPreset === "CHILD_DEV_16") {
        const p = SUBJECT_PRESETS.CHILD_DEV_16
        payload = { ...payload, ...p }
      } else if (batchPreset === "EPT") {
        const p = SUBJECT_PRESETS.EPT
        payload = { ...payload, ...p }
      } else if (batchPreset === "PHIEU_DINH_HUONG") {
        const p = getOrientationPresetByGrade(batchGrade)
        payload = { ...payload, ...p }
      }

      const res = await fetch("/api/admin/input-assessments/grade-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (data.success) {
        showMessage(`Đã gán cấu hình thành công cho ${data.count} môn!`, "ok")
        setIsBatchOpen(false)
        fetchConfigs()
      } else {
        alert(data.error || "Gán hàng loạt thất bại")
      }
    } catch (e: any) {
      alert("Lỗi: " + e.message)
    } finally {
      setBatchSaving(false)
    }
  }

  // Export Blank Excel Template
  const handleExportBlankExcel = (cfg: any) => {
    try {
      const names = JSON.parse(cfg.columnNames || "[]")
      const maxScores = JSON.parse(cfg.columnMaxScores || "[]")
      const subName = cfg.subject?.name || "Môn Khảo sát"
      const gradeStr = cfg.grade || "Toàn khối"

      // Xây dựng Header Excel
      const headers = [
        "STT",
        "Mã Học Sinh",
        "Họ và Tên",
        "Ngày Sinh",
        "Giới Tính",
        "Khối Lớp",
        "Hệ Học",
        ...names.map((n: string, i: number) => {
          const max = maxScores[i]
          return max ? `${n} (Tối đa ${max}đ)` : n
        })
      ]

      if (cfg.hasCompositeColumn) {
        headers.push(`${cfg.compositeColumnName || "Điểm tổng hợp"} (Công thức: ${cfg.formula || "TB"})`)
      }
      if (cfg.hasRemarkColumn) {
        headers.push("Nhận xét đánh giá")
      }

      // Dữ liệu mẫu minh họa 2 dòng
      const sampleRow1 = [
        1, "HS001", "Nguyễn Văn An", "15/08/2018", "Nam", gradeStr, "Chất lượng cao",
        ...names.map(() => ""),
        cfg.hasCompositeColumn ? "" : undefined,
        cfg.hasRemarkColumn ? "" : undefined
      ].filter(x => x !== undefined)

      const wsData = [
        [`FILE MẪU NHẬP ĐIỂM KHẢO SÁT ĐẦU VÀO - MÔN: ${subName.toUpperCase()}`],
        [`Áp dụng: ${gradeStr} | Hệ: ${cfg.educationSystemId === "ALL" ? "Tất cả hệ" : cfg.educationSystemId} | Năm học: ${academicYears.find(y => y.id === cfg.academicYearId)?.name || ""}`],
        [],
        headers,
        sampleRow1
      ]

      const ws = XLSX.utils.aoa_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Mau_Nhap_Diem")
      
      const fileName = `Mau_File_Diem_KSDV_${subName.replace(/\s+/g, "_")}_${gradeStr.replace(/\s+/g, "_")}.xlsx`
      XLSX.writeFile(wb, fileName)
      showMessage(`Đã tải file Excel mẫu: ${fileName}`, "ok")
    } catch (e: any) {
      showMessage("Lỗi xuất file Excel: " + e.message, "err")
    }
  }

  // Filtered saved configs
  const filteredSavedConfigs = useMemo(() => {
    return savedConfigs.filter(c => {
      if (listFilterSubjectId !== "ALL" && c.subjectId !== listFilterSubjectId) return false
      if (listFilterSystemId !== "ALL" && c.educationSystemId !== listFilterSystemId && c.educationSystemId !== "ALL") return false
      if (listFilterGrade !== "ALL" && c.grade !== listFilterGrade && c.grade !== "ALL") return false
      if (listFilterPeriod !== "ALL" && c.periodId !== listFilterPeriod && c.periodId !== "ALL") return false
      if (listSearchTerm) {
        const term = listSearchTerm.toLowerCase().trim()
        const sName = (c.subject?.name || "").toLowerCase()
        const sCode = (c.subject?.code || "").toLowerCase()
        const formula = (c.formula || "").toLowerCase()
        const compName = (c.compositeColumnName || "").toLowerCase()
        const grade = (c.grade || "").toLowerCase()
        if (
          !sName.includes(term) && 
          !sCode.includes(term) && 
          !formula.includes(term) && 
          !compName.includes(term) &&
          !grade.includes(term)
        ) return false
      }
      return true
    })
  }, [savedConfigs, listFilterSubjectId, listFilterSystemId, listFilterGrade, listFilterPeriod, listSearchTerm])

  // Thống kê nhanh theo môn để hiển thị thanh Filter Pills
  const subjectStats = useMemo(() => {
    const statsMap = new Map<string, { subject: any, count: number }>()
    savedConfigs.forEach(c => {
      const sub = c.subject || subjects.find(s => s.id === c.subjectId) || { id: c.subjectId, name: "Môn khác", code: "OTHER" }
      if (!statsMap.has(sub.id)) {
        statsMap.set(sub.id, { subject: sub, count: 0 })
      }
      statsMap.get(sub.id)!.count++
    })
    return Array.from(statsMap.values()).sort((a, b) => {
      const order = ["TAv", "TAvd", "TOA", "TVI", "EPT", "TLY", "NLTD", "PDH"]
      const idxA = order.indexOf(a.subject?.code)
      const idxB = order.indexOf(b.subject?.code)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return b.count - a.count
    })
  }, [savedConfigs, subjects])

  // Nhóm các cấu hình đã lưu theo môn học (Grouped by Subject)
  const groupedSavedConfigs = useMemo(() => {
    const map = new Map<string, { subject: any, configs: any[] }>()
    filteredSavedConfigs.forEach(cfg => {
      const sub = cfg.subject || subjects.find(s => s.id === cfg.subjectId) || { id: cfg.subjectId, name: "Môn khác", code: "OTHER" }
      if (!map.has(sub.id)) {
        map.set(sub.id, { subject: sub, configs: [] })
      }
      map.get(sub.id)!.configs.push(cfg)
    })

    // Sắp xếp các cấu hình trong từng môn theo số thứ tự Khối lớp rồi theo Kỳ
    map.forEach(group => {
      group.configs.sort((a, b) => {
        const numA = parseInt((a.grade || "").replace(/\D/g, "") || "0")
        const numB = parseInt((b.grade || "").replace(/\D/g, "") || "0")
        if (numA !== numB) return numA - numB
        return (a.periodId || "").localeCompare(b.periodId || "")
      })
    })

    return Array.from(map.values()).sort((a, b) => {
      const order = ["TAv", "TAvd", "TOA", "TVI", "EPT", "TLY", "NLTD", "PDH"]
      const idxA = order.indexOf(a.subject?.code)
      const idxB = order.indexOf(b.subject?.code)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return (a.subject?.name || "").localeCompare(b.subject?.name || "", "vi")
    })
  }, [filteredSavedConfigs, subjects])

  // Kiểm tra xem cấu hình hiện tại có phải là Phiếu định hướng đầu vào không
  const isOrientationMode = useMemo(() => {
    return (
      compositeColumnName.toLowerCase().includes("định hướng") ||
      currentSubject?.code === "PDH" ||
      currentSubject?.code === "ORIENTATION" ||
      currentSubject?.name?.toLowerCase().includes("định hướng") ||
      columnTypes.some(t => t === "QUALITATIVE_EVAL")
    )
  }, [compositeColumnName, currentSubject, columnTypes])

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionMessage && (
        <div className={`fixed top-6 right-6 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-xs font-black animate-in slide-in-from-top-3 duration-300 ${
          actionMessage.type === "ok" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        }`}>
          {actionMessage.type === "ok" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#004C97] to-[#007A87] rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-bold tracking-wide uppercase text-teal-200 border border-white/10">
              <ClipboardCheck className="w-3.5 h-3.5 text-teal-300" />
              <span>Khảo sát đầu vào • Chuẩn hóa dữ liệu điểm</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Cấu hình File điểm khảo sát đầu vào
            </h1>
            <p className="text-xs md:text-sm text-teal-100/90 leading-relaxed font-medium">
              Thiết lập cấu trúc cột điểm thành phần, loại thang điểm, công thức tính điểm tổng hợp và mẫu Excel cho các môn khảo sát đầu vào: 
              <strong className="text-white ml-1">Tiếng Anh (viết), Tiếng Anh (vấn đáp), Tâm lý, Năng lực tư duy, EPT...</strong> theo từng Khối lớp và Hệ học.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15">
            <div className="text-left px-3 border-r border-white/10">
              <span className="text-[10px] text-teal-200 block uppercase font-bold">Năm học</span>
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="bg-transparent text-white font-black text-sm outline-none cursor-pointer mt-0.5"
              >
                {academicYears.map(y => (
                  <option key={y.id} value={y.id} className="text-slate-800 font-bold">{y.name}</option>
                ))}
              </select>
            </div>
            <div className="text-left px-3">
              <span className="text-[10px] text-teal-200 block uppercase font-bold">Đã cấu hình</span>
              <span className="text-sm font-black text-white">{savedConfigs.length} mẫu file</span>
            </div>
          </div>
        </div>
      </div>

      {/* TOP FILTER BAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Kỳ / Mốc thời gian khảo sát */}
          <div className="flex flex-col gap-1 min-w-[210px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mốc thời gian / Kỳ KS</label>
            <select
              value={selectedPeriodId}
              onChange={(e) => {
                const newP = e.target.value
                setSelectedPeriodId(newP)

                const validSubs = subjects.filter(s => isSubjectApplicable(s, selectedGrade, newP))
                let effectiveSubId = selectedSubjectId
                if (!validSubs.some(s => s.id === selectedSubjectId) && validSubs.length > 0) {
                  effectiveSubId = validSubs[0].id
                  setSelectedSubjectId(effectiveSubId)
                  setListFilterSubjectId(effectiveSubId)
                }

                // Tìm config phù hợp theo mốc thời gian mới
                const existing = savedConfigs.find(c =>
                  c.subjectId === effectiveSubId &&
                  (c.grade === selectedGrade || c.grade === "ALL") &&
                  (c.periodId === newP || c.periodId === "ALL") &&
                  (c.educationSystemId === selectedSystemId || c.educationSystemId === "ALL")
                )
                if (existing) {
                  loadConfigToForm(existing)
                }
              }}
              className="h-10 px-3 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl outline-none focus:border-teal-500"
            >
              <option value="ALL">-- Tất cả mốc thời gian --</option>
              <option value="DAU_NAM">Đầu năm (Tuyển sinh năm học mới)</option>
              <option value="HK1">Học kỳ 1 (HK1 - Bổ sung môn)</option>
              <option value="HK2">Học kỳ 2 (HK2 - Bổ sung môn)</option>
            </select>
          </div>

          {/* Hệ học */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hệ học (Chương trình)</label>
            <select
              value={selectedSystemId}
              onChange={(e) => setSelectedSystemId(e.target.value)}
              className="h-10 px-3 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl outline-none focus:border-teal-500"
            >
              <option value="ALL">-- Tất cả hệ học (Mẫu chung) --</option>
              {(() => {
                const uniqueSystemsMap = new Map()
                eduSystems.forEach(s => {
                  if (!uniqueSystemsMap.has(s.code)) uniqueSystemsMap.set(s.code, s)
                })
                return Array.from(uniqueSystemsMap.values()).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))
              })()}
            </select>
          </div>

          {/* Khối lớp */}
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Khối lớp</label>
            <select
              value={selectedGrade}
              onChange={(e) => handleSelectGradeChange(e.target.value)}
              className="h-10 px-3 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl outline-none focus:border-teal-500"
            >
              {grades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Môn khảo sát */}
          <div className="flex flex-col gap-1 min-w-[240px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Môn khảo sát</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => handleSelectSubjectChange(e.target.value)}
              className="h-10 px-3 bg-slate-50 border border-teal-500/40 text-teal-900 text-xs font-bold rounded-xl outline-none focus:border-teal-500 shadow-xs cursor-pointer"
            >
              {applicableSubjects.map(s => {
                let badgeSuffix = ""
                const isG1 = selectedGrade === "Khối 1" || selectedGrade === "1"
                if (isG1) {
                  if (selectedPeriodId === "DAU_NAM") {
                    if (["TAvd", "TLY", "NLTD"].includes(s.code)) badgeSuffix = " • [Tuyển sinh đầu năm]"
                  } else if (selectedPeriodId === "HK1" || selectedPeriodId === "HK2") {
                    if (["TOA", "TVI", "TAv"].includes(s.code)) badgeSuffix = " • [⭐ Bổ sung HK1/HK2]"
                  }
                }
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}){badgeSuffix} {s.subjectType && !badgeSuffix ? `• ${s.subjectType}` : ""}
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Preset Buttons */}
          <div className="hidden xl:flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <span className="text-[10px] font-black text-slate-400 uppercase px-2">Preset:</span>
            {applicablePresetCodes.map(code => {
              const isCurrentPreset =
                currentSubject?.code === code ||
                (code === "PDHDV" && (currentSubject?.code === "PDHDV" || currentSubject?.code === "PDH"))
              const isExtraHK1 =
                ["TOA", "TVI", "TAv"].includes(code) &&
                (selectedGrade === "Khối 1" && (selectedPeriodId === "HK1" || selectedPeriodId === "HK2"))
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => applyPresetForSubject(code)}
                  className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition-all border ${
                    isCurrentPreset
                      ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                      : isExtraHK1
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                      : "bg-white text-slate-700 hover:text-teal-600 hover:shadow-xs border-slate-200/80"
                  }`}
                >
                  {code === "TOA"
                    ? "Toán"
                    : code === "TVI"
                    ? "Tiếng Việt"
                    : code === "NVA"
                    ? "Ngữ Văn"
                    : code === "PDHDV"
                    ? "Định hướng"
                    : code}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              const available = savedConfigs.filter(c => c.subjectId === selectedSubjectId && c.grade !== selectedGrade)
              if (available.length > 0) {
                setCloneSourceConfigId(available[0].id)
              }
              setIsCloneModalOpen(true)
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 shadow-xs"
            title="Sao chép cấu hình cột điểm từ khối khác sang khối hiện tại"
          >
            <Copy className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden sm:inline">Sao chép từ khối khác</span>
          </button>

          <button
            type="button"
            onClick={openBatchModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-[#00A19A] text-white rounded-xl text-xs font-bold hover:brightness-105 transition-all shadow-md shadow-teal-500/10"
          >
            <Sparkles className="w-4 h-4" />
            <span>Gán môn hàng loạt</span>
          </button>
        </div>
      </div>

      {/* THÔNG BÁO QUY ĐỊNH KHỐI 1 THEO MỐC THỜI GIAN */}
      {(selectedGrade === "Khối 1" || selectedGrade === "1") && (
        <>
          {/* Trường hợp Đầu năm: Không có Tiếng Anh viết, Toán, Tiếng Việt */}
          {(selectedPeriodId === "DAU_NAM" || selectedPeriodId === "ALL") && ["TAv", "TOA", "TVI"].includes(currentSubject?.code || "") && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start justify-between gap-4 text-amber-950 animate-in fade-in duration-300 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                    Quy định Tuyển sinh Đầu năm: Khối 1 Không Áp Dụng Bài Thi {currentSubject?.name}
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    Học sinh mầm non bước vào Lớp 1 đầu năm chưa học đọc viết chữ và phép tính số học nên 
                    <strong> chỉ thực hiện bài thi Tiếng Anh (vấn đáp) phản xạ thang điểm 30, Tâm lý (80đ) và Năng lực tư duy (10đ)</strong>.
                    <br />
                    <em>* Lưu ý: Môn <strong>Toán, Tiếng Việt và Tiếng Anh (viết)</strong> chỉ bổ sung khảo sát khi học sinh chuyển đến ở mốc <strong>Học kỳ 1 (HK1)</strong> hoặc <strong>Học kỳ 2 (HK2)</strong>.</em>
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const oralSub = subjects.find(s => s.code === "TAvd")
                    if (oralSub) handleSelectSubjectChange(oralSub.id)
                  }}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-xs"
                >
                  👉 Chuyển sang môn Tiếng Anh (vấn đáp)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPeriodId("HK1")}
                  className="px-3.5 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-xs text-center"
                >
                  👉 Chuyển mốc sang Học kỳ 1 (HK1)
                </button>
              </div>
            </div>
          )}

          {/* Trường hợp HK1 hoặc HK2: Bổ sung Toán, Tiếng Việt, Tiếng Anh viết */}
          {(selectedPeriodId === "HK1" || selectedPeriodId === "HK2") && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-emerald-950 animate-in fade-in duration-300 shadow-xs">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900">
                    Khối 1 — Mốc {selectedPeriodId === "HK1" ? "Học kỳ 1 (HK1)" : "Học kỳ 2 (HK2)"}: Áp Dụng Đầy Đủ Toán, Tiếng Việt & Tiếng Anh (Viết)
                  </h4>
                  <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                    Tại mốc {selectedPeriodId === "HK1" ? "Học kỳ 1" : "Học kỳ 2"}, học sinh Lớp 1 đã học bảng chữ cái, tập viết và phép tính số học nên 
                    nhà trường tổ chức bài khảo sát bổ sung cho các môn: <strong>Toán (10đ), Tiếng Việt (10đ) và Tiếng Anh (viết - 70đ)</strong>.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    const s = subjects.find(x => x.code === "TOA")
                    if (s) {
                      handleSelectSubjectChange(s.id)
                      applyPresetForSubject("TOA")
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs whitespace-nowrap"
                >
                  📐 Thiết lập môn Toán (10đ)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const s = subjects.find(x => x.code === "TVI")
                    if (s) {
                      handleSelectSubjectChange(s.id)
                      applyPresetForSubject("TVI")
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs whitespace-nowrap"
                >
                  ✍️ Thiết lập Tiếng Việt (10đ)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const s = subjects.find(x => x.code === "TAv")
                    if (s) {
                      handleSelectSubjectChange(s.id)
                      applyPresetForSubject("TAv")
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs whitespace-nowrap"
                >
                  🔤 Tiếng Anh (viết 70đ)
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* THANH GỢI Ý MẪU THEO CẤP HỌC CHO TIẾNG ANH */}
      {currentSubject?.code === "TAv" && (
        <div className="p-3 bg-sky-50/70 border border-sky-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-sky-700" />
            <span className="text-xs font-black text-sky-900 uppercase tracking-wide">
              Mẫu Tiếng Anh (viết) theo Cấp học:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const p = SUBJECT_PRESETS.TAv_70_TIEU_HOC
                setColumnCount(p.columnCount)
                setColumnNames(p.columnNames)
                setColumnTypes(p.columnTypes)
                setColumnMaxScores(p.columnMaxScores)
                setCompositeColumnName(p.compositeColumnName)
                setFormulaType(p.formulaType)
                setWeights(p.weights)
                setPassScore("35.0")
                setCommitmentThreshold("")
                showMessage("Đã áp dụng mẫu Tiếng Anh viết Tiểu học (Khối 2-5): Thang 70đ!", "ok")
              }}
              className="px-3 py-1.5 bg-white hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Tiểu học (Khối 2-5): Thang 70đ
            </button>

            <button
              type="button"
              onClick={() => {
                const p = SUBJECT_PRESETS.TAv_70_THCS
                setColumnCount(p.columnCount)
                setColumnNames(p.columnNames)
                setColumnTypes(p.columnTypes)
                setColumnMaxScores(p.columnMaxScores)
                setCompositeColumnName(p.compositeColumnName)
                setFormulaType(p.formulaType)
                setWeights(p.weights)
                setPassScore("35.0")
                setCommitmentThreshold("")
                showMessage("Đã áp dụng mẫu Tiếng Anh viết THCS (Khối 6-9): Thang 70đ!", "ok")
              }}
              className="px-3 py-1.5 bg-white hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              THCS (Khối 6-9): Thang 70đ
            </button>

            <button
              type="button"
              onClick={() => {
                const p = SUBJECT_PRESETS.TAv_70_THPT
                setColumnCount(p.columnCount)
                setColumnNames(p.columnNames)
                setColumnTypes(p.columnTypes)
                setColumnMaxScores(p.columnMaxScores)
                setCompositeColumnName(p.compositeColumnName)
                setFormulaType(p.formulaType)
                setWeights(p.weights)
                setPassScore("35.0")
                setCommitmentThreshold("")
                showMessage("Đã áp dụng mẫu Tiếng Anh viết THPT (Khối 10-12): Thang 70đ!", "ok")
              }}
              className="px-3 py-1.5 bg-white hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              THPT (Khối 10-12): Thang 70đ
            </button>

            <button
              type="button"
              onClick={() => {
                const p = SUBJECT_PRESETS.TAv_10
                setColumnCount(p.columnCount)
                setColumnNames(p.columnNames)
                setColumnTypes(p.columnTypes)
                setColumnMaxScores(p.columnMaxScores)
                setCompositeColumnName(p.compositeColumnName)
                setFormulaType(p.formulaType)
                setWeights(p.weights)
                setPassScore("5.0")
                setCommitmentThreshold("")
                showMessage("Đã áp dụng mẫu Tiếng Anh viết: Thang 10đ quy đổi!", "ok")
              }}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Thang 10đ quy đổi
            </button>
          </div>
        </div>
      )}

      {/* THANH GỢI Ý MẪU CHO TIẾNG ANH (VẤN ĐÁP) */}
      {currentSubject?.code === "TAvd" && (
        <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-black text-teal-900 uppercase tracking-wide">
              Mẫu Tiếng Anh (vấn đáp) - Phỏng vấn giao tiếp:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const p = SUBJECT_PRESETS.TAvd_30
                setColumnCount(p.columnCount)
                setColumnNames(p.columnNames)
                setColumnTypes(p.columnTypes)
                setColumnMaxScores(p.columnMaxScores)
                setCompositeColumnName(p.compositeColumnName)
                setFormulaType(p.formulaType)
                setWeights(p.weights)
                setPassScore("15.0")
                setCommitmentThreshold("")
                showMessage("Đã áp dụng mẫu Tiếng Anh vấn đáp chuẩn Sky-Line: Thang 30đ!", "ok")
              }}
              className="px-3.5 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-all shadow-xs"
            >
              Chuẩn Sky-Line: Thang 30đ (10đ + 10đ + 10đ)
            </button>

            <button
              type="button"
              onClick={() => {
                const p = SUBJECT_PRESETS.TAvd_10
                setColumnCount(p.columnCount)
                setColumnNames(p.columnNames)
                setColumnTypes(p.columnTypes)
                setColumnMaxScores(p.columnMaxScores)
                setCompositeColumnName(p.compositeColumnName)
                setFormulaType(p.formulaType)
                setWeights(p.weights)
                setPassScore("5.0")
                setCommitmentThreshold("")
                showMessage("Đã áp dụng mẫu Tiếng Anh vấn đáp: Thang 10đ quy đổi!", "ok")
              }}
              className="px-3.5 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-xs"
            >
              Thang 10đ quy đổi
            </button>
          </div>
        </div>
      )}

      {/* BANNER ĐẶC BIỆT: PHIẾU ĐỊNH HƯỚNG ĐẦU VÀO (CHỈ HIỂN THỊ KHI CHỌN MÔN ĐỊNH HƯỚNG) */}
      {(currentSubject?.code === "PDHDV" || currentSubject?.code === "PDH" || currentSubject?.name?.toLowerCase().includes("định hướng")) && (() => {
        const curPreset = getOrientationPresetByGrade(selectedGrade)
        return (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 md:p-6 border border-indigo-700/50 shadow-xl shadow-indigo-950/20 animate-in fade-in duration-300">
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 flex-shrink-0 mt-0.5">
                  <HeartHandshake className="w-6 h-6 text-indigo-300 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[10px] font-black uppercase tracking-wider border border-indigo-400/30">
                      Cấu phần đặc biệt KSĐV
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-500/30 text-teal-200 text-[10px] font-black tracking-wide border border-teal-400/30">
                      Chuẩn hóa cho: {selectedGrade} ({curPreset.gradeLabel})
                    </span>
                    <h3 className="text-base font-black text-white tracking-tight">
                      Phiếu Định Hướng Đầu Vào (Gồm 2 Tab Liên Kết)
                    </h3>
                  </div>
                  <p className="text-xs text-indigo-200/90 leading-relaxed max-w-3xl">
                    Tích hợp hai cấu phần đồng bộ: <strong>Tab 1 – Phỏng vấn học sinh</strong> (bộ 4 tiêu chí chuẩn cho <strong>{selectedGrade}: {curPreset.subLabel}</strong>, nhận diện định tính 4 mức độ, quan sát giáo viên) 
                    và <strong>Tab 2 – Trao đổi PHHS</strong> (04 nhóm: nguyện vọng & kỳ vọng, đặc điểm cá nhân & thói quen, nhu cầu hỗ trợ, phối hợp giáo dục).
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-indigo-300/80">
                    <span className="flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Tự động lấy đúng bộ tiêu chí theo khối
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Không chấm điểm áp lực
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Nhận diện nhu cầu hỗ trợ sớm
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto flex-shrink-0">
                <button
                  type="button"
                  onClick={applyOrientationPreset}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Áp dụng mẫu {selectedGrade}</span>
                </button>

                <Link
                  href="/admin/input-assessments?tab=categories&sub=orientation"
                  target="_blank"
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-indigo-200 hover:text-white border border-indigo-400/30 rounded-xl text-xs font-bold transition-all"
                >
                  <span>Ngân hàng câu hỏi</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )
      })()}

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: FORM THIẾT LẬP CẤU HÌNH (7 CỘT) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800">
                  Thiết lập Định dạng File & Cột điểm
                </h2>
                <p className="text-xs text-slate-400 font-semibold">
                  Môn: <span className="text-teal-600 font-bold">{currentSubject?.name || "Chưa chọn"}</span> • {selectedGrade}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Số cột:</span>
              <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setColumnCount(n)}
                    className={`w-7 h-7 text-xs font-black rounded-lg transition-all ${
                      columnCount === n
                        ? "bg-teal-600 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* DANH SÁCH CÁC CỘT ĐIỂM THÀNH PHẦN (DẠNG BẢNG GỌN) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span>1. Chi tiết các Cột điểm thành phần</span>
                <span className="text-[10px] text-teal-700 font-bold lowercase bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  {columnCount} cột
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setColumnCount(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                >
                  - Bớt cột
                </button>
                <button
                  type="button"
                  onClick={() => setColumnCount(prev => Math.min(8, prev + 1))}
                  className="px-2.5 py-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-all"
                >
                  + Thêm cột
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs table-fixed min-w-[580px]">
                  <colgroup>
                    <col className="w-12 sm:w-14" />
                    <col className="w-auto" />
                    <col className="w-48 sm:w-56 md:w-60" />
                    <col className="w-24 sm:w-28" />
                    {formulaType === "WEIGHTED" && (
                      <col className="w-20 sm:w-24" />
                    )}
                    <col className="w-10" />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-2 text-center">STT</th>
                      <th className="py-2.5 px-3">Tên cột điểm thành phần</th>
                      <th className="py-2.5 px-3">Loại thang điểm</th>
                      <th className="py-2.5 px-2 text-center">Điểm tối đa</th>
                      {formulaType === "WEIGHTED" && (
                        <th className="py-2.5 px-2 text-center text-amber-700">Hệ số</th>
                      )}
                      <th className="py-2.5 px-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.from({ length: columnCount }).map((_, idx) => (
                      <tr key={idx} className="hover:bg-teal-50/20 transition-colors">
                        <td className="py-2.5 px-2 text-center">
                          <span className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-[11px] font-black inline-flex items-center justify-center">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={columnNames[idx] || ""}
                            onChange={(e) => {
                              const val = e.target.value
                              setColumnNames(prev => {
                                const n = [...prev]
                                n[idx] = val
                                return n
                              })
                            }}
                            placeholder={`Tên cột điểm ${idx + 1}...`}
                            className="w-full h-8.5 px-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={columnTypes[idx] || "SCORE_10"}
                            onChange={(e) => {
                              const val = e.target.value
                              setColumnTypes(prev => {
                                const n = [...prev]
                                n[idx] = val
                                return n
                              })
                            }}
                            className="w-full h-8.5 px-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer truncate shadow-2xs"
                          >
                            {COLUMN_TYPES.map(t => (
                              <option key={t.code} value={t.code}>{t.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {isQualitativeType(columnTypes[idx]) ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 text-slate-500 border border-slate-200/60">
                              {columnTypes[idx] === "REMARK" ? "Lời phê" : "Định tính"}
                            </span>
                          ) : (
                            <div className="inline-flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="1"
                                max="1000"
                                step="any"
                                value={columnMaxScores[idx] !== undefined ? columnMaxScores[idx] : 10}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0
                                  setColumnMaxScores(prev => {
                                    const n = [...prev]
                                    n[idx] = val
                                    return n
                                  })
                                }}
                                className="w-14 h-8 px-1 text-center bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs font-black text-teal-800 outline-none transition-all shadow-2xs"
                              />
                              <span className="text-[10px] font-bold text-slate-400">đ</span>
                            </div>
                          )}
                        </td>
                        {formulaType === "WEIGHTED" && (
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="number"
                              min="0.1"
                              step="0.5"
                              value={weights[idx] || 1}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 1
                                setWeights(prev => {
                                  const n = [...prev]
                                  n[idx] = val
                                  return n
                                })
                              }}
                              className="w-14 h-8 px-1 text-center bg-amber-50 hover:bg-white focus:bg-white border border-amber-300 focus:border-amber-500 rounded-lg text-xs font-black text-amber-800 outline-none transition-all mx-auto shadow-2xs"
                            />
                          </td>
                        )}
                        <td className="py-2.5 px-2 text-center">
                          {columnCount > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setColumnCount(prev => prev - 1)
                                setColumnNames(prev => prev.filter((_, i) => i !== idx))
                                setColumnTypes(prev => prev.filter((_, i) => i !== idx))
                                setColumnMaxScores(prev => prev.filter((_, i) => i !== idx))
                                setWeights(prev => prev.filter((_, i) => i !== idx))
                              }}
                              title="Xóa cột này"
                              className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/60 border-t border-slate-200/80 text-xs">
                      <td colSpan={2} className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => setColumnCount(prev => Math.min(8, prev + 1))}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm cột điểm mới</span>
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-right text-[11px] font-bold text-slate-400">
                        Tổng điểm tối đa:
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="text-xs font-black text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          {totalMaxScore}đ
                        </span>
                      </td>
                      {formulaType === "WEIGHTED" && (
                        <td className="py-2.5 px-2 text-center text-[10.5px] font-bold text-amber-700">
                          ∑ = {weights.slice(0, columnCount).reduce((a, b) => a + (b || 1), 0)}
                        </td>
                      )}
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* CỘT TỔNG HỢP VÀ CÔNG THỨC TÍNH ĐIỂM */}
          <div className="p-5 bg-gradient-to-br from-slate-50 to-teal-50/30 border border-slate-200 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-teal-600" />
                <span>2. Điểm Tổng Hợp & Công Thức Tính</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasComposite}
                  onChange={(e) => setHasComposite(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700">Có cột tổng hợp</span>
              </label>
            </div>

            {hasComposite && (
              <div className="space-y-4 pt-2 border-t border-slate-200/60 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">Tên cột tổng hợp</label>
                    <input
                      type="text"
                      value={compositeColumnName}
                      onChange={(e) => setCompositeColumnName(e.target.value)}
                      placeholder="Ví dụ: Điểm tổng hợp, Tổng điểm KS"
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">Loại công thức</label>
                    <select
                      value={formulaType}
                      onChange={(e) => setFormulaType(e.target.value as FormulaType)}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-teal-500"
                    >
                      <option value="AVERAGE">Trung bình cộng (AVERAGE)</option>
                      <option value="SUM">Tổng điểm (SUM) — Phù hợp trắc nghiệm/chia phần</option>
                      <option value="WEIGHTED">Trung bình có trọng số (Hệ số)</option>
                      <option value="CUSTOM">Biểu thức tùy biến (CUSTOM)</option>
                    </select>
                  </div>
                </div>

                {formulaType === "CUSTOM" && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-black text-amber-700 uppercase">Biểu thức công thức tùy biến</label>
                      <span className="text-[10px] text-slate-400">Dùng [col0], [col1]...</span>
                    </div>
                    <input
                      type="text"
                      value={formulaCustom}
                      onChange={(e) => setFormulaCustom(e.target.value)}
                      placeholder="Ví dụ: ([col0]*2 + [col1] + [col2]) / 4"
                      className="w-full h-10 px-3 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">Quy tắc làm tròn</label>
                    <select
                      value={roundingRule}
                      onChange={(e) => setRoundingRule(e.target.value as RoundingRule)}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-teal-500"
                    >
                      <option value="ROUND_1">Làm tròn 1 chữ số thập phân (VD: 8.3)</option>
                      <option value="ROUND_2">Làm tròn 2 chữ số thập phân (VD: 8.25)</option>
                      <option value="ROUND_HALF">Làm tròn đến 0.5 (VD: 8.0, 8.5)</option>
                      <option value="ROUND_INT">Làm tròn số nguyên (VD: 8)</option>
                      <option value="NONE">Không làm tròn</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">Mô tả công thức tự động</label>
                    <div className="h-10 px-3 bg-white/80 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-600 flex items-center overflow-x-auto">
                      {getFormulaDescription({
                        formula: formulaType,
                        weights,
                        formulaCustom,
                        columnCount,
                        roundingRule
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* NHẬN XÉT & TIÊU CHÍ ĐẠT / CAM KẾT */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-teal-600" />
                <span>
                  {isEnglishSubject ? "3. Cột Nhận Xét & Tiêu Chí Đạt Chuẩn" : "3. Cột Nhận Xét & Tiêu Chí Đạt / Cam Kết"}
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasRemark}
                  onChange={(e) => setHasRemark(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700">Có cột nhận xét</span>
              </label>
            </div>

            <div className={`grid ${isEnglishSubject ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"} gap-4 pt-2 border-t border-slate-200/60`}>
              <div>
                <label className="block text-[11px] font-black text-emerald-700 uppercase mb-1">
                  Ngưỡng điểm Đạt chuẩn (Pass score)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={passScore}
                  onChange={(e) => setPassScore(e.target.value)}
                  placeholder="5.0"
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-emerald-700 outline-none focus:border-emerald-500"
                />
              </div>

              {!isEnglishSubject && (
                <div>
                  <label className="block text-[11px] font-black text-amber-700 uppercase mb-1">
                    Ngưỡng điểm Cam kết rèn luyện
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={commitmentThreshold}
                    onChange={(e) => setCommitmentThreshold(e.target.value)}
                    placeholder="4.5"
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-amber-700 outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* LIVE SIMULATOR (MÔ PHỎNG TRỰC TIẾP) */}
          {hasComposite && isOrientationMode ? (
            <div className="p-5 bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-slate-50 border-2 border-indigo-200 rounded-3xl space-y-4 shadow-sm animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-indigo-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-indigo-950 uppercase tracking-wide block">
                      Mô phỏng Phiếu Định Hướng Đầu Vào (2 Tab Liên Kết)
                    </span>
                    <span className="text-[11px] font-semibold text-indigo-600">
                      Nguyên tắc: Đánh giá định tính phi điểm số • Thấu hiểu & Đồng hành
                    </span>
                  </div>
                </div>

                {/* Sub-tabs toggle */}
                <div className="inline-flex p-1 bg-white border border-indigo-200 rounded-2xl shadow-xs">
                  <button
                    type="button"
                    onClick={() => setActiveOrientationSimTab("tab1")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                      activeOrientationSimTab === "tab1"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Tab 1: Phỏng vấn HS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveOrientationSimTab("tab2")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                      activeOrientationSimTab === "tab2"
                        ? "bg-purple-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-purple-600 hover:bg-purple-50"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Tab 2: Trao đổi PHHS</span>
                  </button>
                </div>
              </div>

              {(() => {
                const simOrientationCfg = getOrientationPresetByGrade(selectedGrade)
                return activeOrientationSimTab === "tab1" ? (
                  /* TAB 1 SIMULATION: PHỎNG VẤN HỌC SINH (THEO KHỐI) */
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                      <span className="flex items-center gap-1.5">
                        <MessageSquareQuote className="w-4 h-4 text-indigo-600" />
                        Ghi nhận Định tính theo 4 Mức độ cho <strong>{selectedGrade}</strong> ({simOrientationCfg.gradeLabel}: {simOrientationCfg.subLabel}):
                      </span>
                      <span className="text-[10px] text-indigo-600 font-bold bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                        {columnCount} tiêu chí chuẩn
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {Array.from({ length: columnCount }).map((_, idx) => {
                        const curVal = simQualitativeAnswers[idx] || "NORMAL"
                        const criterionName = columnNames[idx] || simOrientationCfg.criteria[idx]?.name || `Tiêu chí ${idx + 1}`
                        const critObj = simOrientationCfg.criteria[idx]
                        return (
                          <div key={idx} className="bg-white p-3 rounded-2xl border border-indigo-100 shadow-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black inline-flex items-center justify-center border border-indigo-200">
                                  {idx + 1}
                                </span>
                                {criterionName}
                              </span>
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50/70 px-2 py-0.5 rounded-md border border-indigo-100">
                                {critObj?.categoryLabel || `Tiêu chí ${idx + 1}`}
                              </span>
                            </div>

                            {critObj?.guideline && (
                              <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                                💡 <strong>Gợi ý quan sát:</strong> {critObj.guideline}
                              </p>
                            )}
                            
                            {/* 4 Mức độ nhận diện định tính */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              {[
                                { code: "CONFIDENT", label: "Tự tin / Tích cực", color: "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100", activeColor: "bg-emerald-600 text-white border-emerald-600 shadow-xs" },
                                { code: "NORMAL", label: "Bình thường / Ổn định", color: "bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100", activeColor: "bg-sky-600 text-white border-sky-600 shadow-xs" },
                                { code: "NEED_SUPPORT", label: "Cần hỗ trợ ban đầu", color: "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100", activeColor: "bg-amber-600 text-white border-amber-600 shadow-xs" },
                                { code: "SPECIAL_ATTENTION", label: "Lưu ý đặc biệt", color: "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100", activeColor: "bg-rose-600 text-white border-rose-600 shadow-xs" }
                              ].map(opt => (
                                <button
                                  key={opt.code}
                                  type="button"
                                  onClick={() => setSimQualitativeAnswers(prev => ({ ...prev, [idx]: opt.code }))}
                                  className={`px-2 py-1.5 rounded-xl border text-[11px] font-bold transition-all text-center ${
                                    curVal === opt.code ? opt.activeColor : opt.color
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-indigo-100 space-y-1.5">
                      <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Edit2 className="w-3 h-3 text-indigo-600" />
                        Ghi nhận quan sát & Nhận xét của Giáo viên tiếp nhận ({selectedGrade}):
                      </label>
                      <p className="text-xs text-slate-700 italic bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-100/60 leading-relaxed font-medium">
                        {selectedGrade.includes("6")
                          ? `"Học sinh có ý thức tự học tốt, cởi mở khi làm quen môi trường THCS mới. Đã biết cách lập thời gian biểu và chủ động trao đổi với thầy cô bộ môn. Sẵn sàng hòa nhập tốt lớp 6."`
                          : selectedGrade.includes("10") || selectedGrade.includes("11") || selectedGrade.includes("12")
                            ? `"Học sinh có tư duy phản biện mạch lạc, mục tiêu học tập rõ ràng, có định hướng chọn tổ hợp môn và kỹ năng nghiên cứu độc lập. Bản lĩnh và khả năng thích ứng cao."`
                            : `"Học sinh giao tiếp lễ phép, phản xạ nhanh nhẹn, hòa nhập nhanh với không gian lớp học. Khả năng tự phục vụ tốt, sẵn sàng cho năm học mới."`
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  /* TAB 2 SIMULATION: TRAO ĐỔI PHHS (04 NHÓM CHUẨN HÓA THEO KHỐI) */
                  <div className="space-y-3.5 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-purple-600" />
                        04 Nhóm Trao đổi PHHS chuẩn hóa cho <strong>{selectedGrade}</strong>:
                      </span>
                      <span className="text-[10px] text-purple-600 font-bold bg-white px-2 py-0.5 rounded-full border border-purple-200">
                        {simOrientationCfg.parentPrompts.groupLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-2xl border border-purple-100 space-y-1">
                        <span className="text-[11px] font-black text-purple-900 uppercase">
                          {simOrientationCfg.parentPrompts.group1_expectations.title}
                        </span>
                        <p className="text-xs text-slate-700 bg-purple-50/40 p-2.5 rounded-xl border border-purple-100/60 font-medium">
                          {simOrientationCfg.parentPrompts.group1_expectations.placeholder}
                        </p>
                      </div>

                      <div className="bg-white p-3 rounded-2xl border border-purple-100 space-y-1">
                        <span className="text-[11px] font-black text-purple-900 uppercase">
                          {simOrientationCfg.parentPrompts.group2_personality.title}
                        </span>
                        <p className="text-xs text-slate-700 bg-purple-50/40 p-2.5 rounded-xl border border-purple-100/60 font-medium">
                          {simOrientationCfg.parentPrompts.group2_personality.placeholder}
                        </p>
                      </div>

                      <div className="bg-white p-3 rounded-2xl border border-purple-100 space-y-1">
                        <span className="text-[11px] font-black text-purple-900 uppercase">
                          {simOrientationCfg.parentPrompts.group3_support.title}
                        </span>
                        <p className="text-xs text-slate-700 bg-purple-50/40 p-2.5 rounded-xl border border-purple-100/60 font-medium">
                          {simOrientationCfg.parentPrompts.group3_support.placeholder}
                        </p>
                      </div>

                      <div className="bg-white p-3 rounded-2xl border border-purple-100 space-y-1">
                        <span className="text-[11px] font-black text-purple-900 uppercase">
                          {simOrientationCfg.parentPrompts.group4_cooperation.title}
                        </span>
                        <p className="text-xs text-slate-700 bg-purple-50/40 p-2.5 rounded-xl border border-purple-100/60 font-medium">
                          {simOrientationCfg.parentPrompts.group4_cooperation.placeholder}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* FOOTER ĐỊNH HƯỚNG TỔNG THỂ */}
              <div className="p-3 bg-white rounded-2xl border border-indigo-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">
                    Định hướng Tiếp nhận & Phân loại hỗ trợ:
                  </span>
                  <span className="text-xs font-black text-slate-800">
                    {compositeColumnName || "Đánh giá Tổng thể & Định hướng Tiếp nhận"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Sẵn sàng tiếp nhận • Hòa nhập tốt
                  </span>
                </div>
              </div>
            </div>
          ) : hasComposite ? (
            <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-teal-700 fill-teal-700" />
                  <span className="text-xs font-black text-teal-900 uppercase tracking-wider">
                    Bộ mô phỏng tính điểm trực tiếp (Live Simulator)
                  </span>
                </div>
                <span className="text-[10px] text-teal-700 font-bold bg-white px-2 py-0.5 rounded-full border border-teal-200">
                  Thử nghiệm công thức
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Array.from({ length: columnCount }).map((_, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded-xl border border-teal-200/80">
                    <span className="text-[10px] font-bold text-slate-500 block truncate" title={columnNames[idx]}>
                      {columnNames[idx] || `Cột ${idx + 1}`}
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      value={simScores[idx] || ""}
                      onChange={(e) => {
                        const val = e.target.value
                        setSimScores(prev => ({ ...prev, [idx]: val }))
                      }}
                      className="w-full mt-1 h-7 text-xs font-black text-center text-slate-800 bg-slate-50 rounded-lg outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-teal-200/60">
                <span className="text-xs font-bold text-teal-900">
                  Kết quả tính toán: <strong className="text-teal-700">{compositeColumnName}</strong>
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-teal-700">
                    {simulatedResult != null ? simulatedResult : "--"}
                  </span>
                  {simulatedResult != null && (
                    isEnglishSubject ? (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        simulatedResult >= parseFloat(passScore || "5")
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-rose-100 text-rose-800 border border-rose-300"
                      }`}>
                        {simulatedResult >= parseFloat(passScore || "5") ? "Đạt chuẩn" : "Chưa đạt"}
                      </span>
                    ) : (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        simulatedResult >= parseFloat(passScore || "5")
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : simulatedResult >= parseFloat(commitmentThreshold || "4.5")
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-rose-100 text-rose-800 border border-rose-300"
                      }`}>
                        {simulatedResult >= parseFloat(passScore || "5")
                          ? "Đạt chuẩn"
                          : simulatedResult >= parseFloat(commitmentThreshold || "4.5")
                            ? "Diện Cam kết"
                            : "Chưa đạt"}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 via-teal-700 to-[#003B3A] text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-teal-700/20 disabled:opacity-50"
            >
              {savingConfig ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Lưu Cấu Hình Mẫu</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: DANH SÁCH CẤU HÌNH MẪU ĐÃ LƯU (5 CỘT) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3.5">
          {/* HEADER & VIEW SWITCHER */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  Cấu hình Mẫu đã lưu
                </h3>
                <span className="text-[11px] font-bold text-teal-600">
                  {filteredSavedConfigs.length} / {savedConfigs.length} mẫu
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Segmented View Mode Toggle */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/70 text-xs">
                <button
                  type="button"
                  onClick={() => setListViewMode("GROUPED")}
                  title="Xem nhóm theo Môn học"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                    listViewMode === "GROUPED"
                      ? "bg-white text-teal-900 font-black shadow-xs"
                      : "text-slate-500 hover:text-slate-800 font-bold"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Nhóm môn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setListViewMode("FLAT")}
                  title="Xem danh sách bảng thu gọn"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                    listViewMode === "FLAT"
                      ? "bg-white text-teal-900 font-black shadow-xs"
                      : "text-slate-500 hover:text-slate-800 font-bold"
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Bảng gọn</span>
                </button>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={fetchConfigs}
                disabled={loadingConfigs}
                title="Tải lại danh sách"
                className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${loadingConfigs ? "animate-spin text-teal-600" : ""}`} />
              </button>
            </div>
          </div>

          {/* QUICK SUBJECT PILLS */}
          {applicableSubjects.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 custom-scrollbar">
              <button
                type="button"
                onClick={() => setListFilterSubjectId("ALL")}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-black shrink-0 transition-all ${
                  listFilterSubjectId === "ALL"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                }`}
              >
                Tất cả ({savedConfigs.length})
              </button>
              {applicableSubjects.map(s => {
                const count = savedConfigs.filter(c => c.subjectId === s.id).length
                const isSelected = listFilterSubjectId === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      if (listFilterSubjectId === s.id) {
                        setListFilterSubjectId("ALL")
                      } else {
                        handleSelectSubjectChange(s.id)
                      }
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] shrink-0 transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-teal-600 text-white font-black shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                    }`}
                  >
                    <span>{s.code || s.name}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                      isSelected ? "bg-white/25 text-white" : "bg-white text-slate-500 border border-slate-200"
                    }`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* SEARCH & COMPACT MULTI-SELECT FILTERS */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={listSearchTerm}
                onChange={(e) => setListSearchTerm(e.target.value)}
                placeholder="Tìm môn học, mã, công thức..."
                className="w-full h-8.5 pl-8 pr-7 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:bg-white transition-all"
              />
              {listSearchTerm && (
                <button
                  type="button"
                  onClick={() => setListSearchTerm("")}
                  className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <select
                value={listFilterGrade}
                onChange={(e) => setListFilterGrade(e.target.value)}
                className="h-7.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none truncate"
              >
                <option value="ALL">Tất cả khối</option>
                {grades.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <select
                value={listFilterPeriod}
                onChange={(e) => setListFilterPeriod(e.target.value)}
                className="h-7.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none truncate"
              >
                <option value="ALL">Tất cả kỳ</option>
                <option value="DAU_NAM">Đầu năm</option>
                <option value="HK1">Học kỳ 1</option>
                <option value="HK2">Học kỳ 2</option>
              </select>

              <select
                value={listFilterSystemId}
                onChange={(e) => setListFilterSystemId(e.target.value)}
                className="h-7.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none truncate"
              >
                <option value="ALL">Tất cả hệ</option>
                {(() => {
                  const uniqueSystemsMap = new Map()
                  eduSystems.forEach(s => {
                    if (!uniqueSystemsMap.has(s.code)) uniqueSystemsMap.set(s.code, s)
                  })
                  return Array.from(uniqueSystemsMap.values()).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))
                })()}
              </select>
            </div>

            {/* Active filter count & reset button */}
            {(listFilterSubjectId !== "ALL" || listFilterGrade !== "ALL" || listFilterPeriod !== "ALL" || listFilterSystemId !== "ALL" || listSearchTerm) && (
              <div className="flex items-center justify-between px-1 text-[10px] text-teal-800 font-bold">
                <span>Đang lọc: {filteredSavedConfigs.length} kết quả</span>
                <button
                  type="button"
                  onClick={() => {
                    setListFilterSubjectId("ALL")
                    setListFilterGrade("ALL")
                    setListFilterPeriod("ALL")
                    setListFilterSystemId("ALL")
                    setListSearchTerm("")
                  }}
                  className="text-rose-600 hover:underline flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" />
                  <span>Xóa bộ lọc</span>
                </button>
              </div>
            )}
          </div>

          {/* LIST CONTENT */}
          <div className="max-h-[620px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
            {loadingConfigs ? (
              <div className="py-12 text-center text-xs font-bold text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                Đang tải cấu hình mẫu...
              </div>
            ) : filteredSavedConfigs.length === 0 ? (
              <div className="py-8 px-4 text-center border-2 border-dashed border-teal-200 bg-teal-50/20 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100/70 text-teal-700 flex items-center justify-center mx-auto">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-teal-950 uppercase tracking-wide">
                    Chưa có cấu hình mẫu cho môn {currentSubject?.name || "này"}
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-1 max-w-[280px] mx-auto leading-relaxed font-medium">
                    Bạn đang thiết lập cấu hình môn này ở bảng bên trái. Sau khi hoàn tất các cột điểm, hãy bấm nút <strong>"Lưu Cấu Hình Mẫu"</strong> bên dưới để lưu vào danh sách.
                  </p>
                </div>
                {listFilterSubjectId !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => setListFilterSubjectId("ALL")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-teal-500 text-teal-800 rounded-xl text-[11px] font-bold transition-all shadow-xs"
                  >
                    <span>Xem tất cả môn khác ({savedConfigs.length} mẫu)</span>
                  </button>
                )}
              </div>
            ) : listViewMode === "GROUPED" ? (
              /* VIEW 1: GROUPED BY SUBJECT ACCORDIONS */
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 text-[10px] text-slate-400 font-bold">
                  <span>{groupedSavedConfigs.length} nhóm môn</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next: Record<string, boolean> = {}
                        groupedSavedConfigs.forEach(g => { if (g.subject?.id) next[g.subject.id] = true })
                        setExpandedSubjects(next)
                      }}
                      className="hover:text-teal-700"
                    >
                      Mở tất cả
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next: Record<string, boolean> = {}
                        groupedSavedConfigs.forEach(g => { if (g.subject?.id) next[g.subject.id] = false })
                        setExpandedSubjects(next)
                      }}
                      className="hover:text-teal-700"
                    >
                      Thu gọn
                    </button>
                  </div>
                </div>

                {groupedSavedConfigs.map(group => {
                  const subId = group.subject?.id || "UNKNOWN"
                  const isExpanded = expandedSubjects[subId] !== undefined ? expandedSubjects[subId] : true
                  const isSubjectActive = selectedSubjectId === subId

                  // Unique grades summary
                  const gradeNames = Array.from(new Set(group.configs.map(c => c.grade))).filter(Boolean)
                  const gradeSummary = gradeNames.length > 3
                    ? `${gradeNames[0]} → ${gradeNames[gradeNames.length - 1]}`
                    : gradeNames.join(", ")

                  return (
                    <div
                      key={subId}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        isSubjectActive
                          ? "border-teal-300 shadow-xs ring-1 ring-teal-200/50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      {/* ACCORDION HEADER */}
                      <div
                        onClick={() => {
                          setExpandedSubjects(prev => ({
                            ...prev,
                            [subId]: !(prev[subId] !== undefined ? prev[subId] : true)
                          }))
                        }}
                        className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-all select-none ${
                          isSubjectActive
                            ? "bg-teal-50/80 hover:bg-teal-50"
                            : "bg-slate-50/70 hover:bg-slate-100/80"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide shrink-0 bg-white border border-slate-200 text-slate-700">
                            {group.subject?.code || "KSDV"}
                          </span>
                          <span className="text-xs font-black text-slate-800 truncate">
                            {group.subject?.name || "Môn Khảo sát"}
                          </span>
                          <span className="text-[10px] font-bold text-teal-700 bg-teal-100/70 px-1.5 py-0.2 rounded-full shrink-0">
                            {group.configs.length}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">
                            {gradeSummary}
                          </span>
                          <div className={`p-0.5 rounded-md text-slate-400 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>

                      {/* ACCORDION ITEMS LIST */}
                      {isExpanded && (
                        <div className="p-1.5 space-y-1 bg-white border-t border-slate-100">
                          {group.configs.map(cfg => {
                            const isCurrentActive = 
                              cfg.subjectId === selectedSubjectId && 
                              (cfg.grade === selectedGrade || cfg.grade === "ALL")

                            let colNamesList: string[] = []
                            try {
                              colNamesList = JSON.parse(cfg.columnNames || "[]")
                            } catch (_) {}

                            const periodLabel = cfg.periodId === "DAU_NAM" ? "Đầu năm" :
                              cfg.periodId === "HK1" ? "HK 1" :
                              cfg.periodId === "HK2" ? "HK 2" :
                              cfg.periodId === "ALL" ? "Chung" :
                              (periods.find(p => p.id === cfg.periodId)?.name || cfg.periodId)

                            const periodColor = cfg.periodId === "DAU_NAM" ? "bg-amber-50 text-amber-800 border-amber-200" :
                              cfg.periodId === "HK1" ? "bg-sky-50 text-sky-800 border-sky-200" :
                              cfg.periodId === "HK2" ? "bg-indigo-50 text-indigo-800 border-indigo-200" :
                              "bg-slate-50 text-slate-600 border-slate-200"

                            return (
                              <div
                                key={cfg.id}
                                onClick={() => loadConfigToForm(cfg)}
                                className={`px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                  isCurrentActive
                                    ? "bg-teal-50/90 border-teal-400 ring-1 ring-teal-400/40 shadow-xs"
                                    : "bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200"
                                }`}
                                title={`Cột điểm: ${colNamesList.join(" • ")}\nNhấp để nạp lên form chỉnh sửa`}
                              >
                                {/* Left: Grade & Period */}
                                <div className="flex items-center gap-1.5 min-w-[115px] shrink-0">
                                  <span className={`px-1.5 py-0.5 rounded-md font-black text-[10px] ${
                                    isCurrentActive ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-800"
                                  }`}>
                                    {cfg.grade || "Toàn khối"}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${periodColor}`}>
                                    {periodLabel}
                                  </span>
                                </div>

                                {/* Middle: Columns, Formula & Benchmark */}
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-600 flex-1 min-w-0">
                                  <span className="font-bold text-slate-500 whitespace-nowrap">
                                    {cfg.columnCount} cột
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-extrabold text-teal-800 uppercase tracking-tight whitespace-nowrap">
                                    {cfg.formula || "AVG"}
                                  </span>
                                  {cfg.passScore != null && (
                                    <>
                                      <span className="text-slate-300">•</span>
                                      <span className="text-emerald-700 font-black whitespace-nowrap">
                                        🎯 {cfg.passScore}đ
                                      </span>
                                    </>
                                  )}
                                </div>

                                {/* Right: Action buttons */}
                                <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleExportBlankExcel(cfg)}
                                    title="Tải File Excel Mẫu"
                                    className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => loadConfigToForm(cfg)}
                                    title="Nạp cấu hình lên form để sửa"
                                    className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteConfig(cfg.id, cfg.subject?.name || "")}
                                    title="Xóa cấu hình"
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              /* VIEW 2: FLAT COMPACT TABLE VIEW */
              <div className="space-y-1.5">
                {filteredSavedConfigs.map(cfg => {
                  const isCurrentActive = 
                    cfg.subjectId === selectedSubjectId && 
                    (cfg.grade === selectedGrade || cfg.grade === "ALL")

                  let colNamesList: string[] = []
                  try {
                    colNamesList = JSON.parse(cfg.columnNames || "[]")
                  } catch (_) {}

                  const periodLabel = cfg.periodId === "DAU_NAM" ? "Đầu năm" :
                    cfg.periodId === "HK1" ? "HK 1" :
                    cfg.periodId === "HK2" ? "HK 2" :
                    cfg.periodId === "ALL" ? "Chung" :
                    (periods.find(p => p.id === cfg.periodId)?.name || cfg.periodId)

                  const periodColor = cfg.periodId === "DAU_NAM" ? "bg-amber-50 text-amber-800 border-amber-200" :
                    cfg.periodId === "HK1" ? "bg-sky-50 text-sky-800 border-sky-200" :
                    cfg.periodId === "HK2" ? "bg-indigo-50 text-indigo-800 border-indigo-200" :
                    "bg-slate-50 text-slate-600 border-slate-200"

                  return (
                    <div
                      key={cfg.id}
                      onClick={() => loadConfigToForm(cfg)}
                      className={`px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isCurrentActive
                          ? "bg-teal-50/90 border-teal-400 ring-2 ring-teal-400/30 shadow-xs"
                          : "bg-white hover:bg-slate-50 border-slate-150 hover:border-slate-300"
                      }`}
                      title={`Cột điểm: ${colNamesList.join(" • ")}\nNhấp để nạp lên form chỉnh sửa`}
                    >
                      {/* Left: Subject code & Name */}
                      <div className="flex items-center gap-1.5 min-w-[125px] shrink-0">
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {cfg.subject?.code || "KSDV"}
                        </span>
                        <span className="text-xs font-black text-slate-800 truncate max-w-[80px]">
                          {cfg.subject?.name || "Môn học"}
                        </span>
                      </div>

                      {/* Middle: Grade & Period & Specs */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded font-black bg-slate-100 text-slate-800">
                          {cfg.grade || "ALL"}
                        </span>
                        <span className={`px-1 py-0.5 rounded text-[9px] font-bold border ${periodColor}`}>
                          {periodLabel}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-extrabold text-teal-800 uppercase whitespace-nowrap">
                          {cfg.formula || "AVG"}
                        </span>
                        {cfg.passScore != null && (
                          <span className="text-emerald-700 font-black whitespace-nowrap hidden sm:inline">
                            • 🎯{cfg.passScore}đ
                          </span>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleExportBlankExcel(cfg)}
                          title="Tải File Excel Mẫu"
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => loadConfigToForm(cfg)}
                          title="Nạp cấu hình lên form để sửa"
                          className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteConfig(cfg.id, cfg.subject?.name || "")}
                          title="Xóa cấu hình"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BATCH ASSIGN MODAL */}
      {isBatchOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    Gán Mẫu Cấu Hình Hàng Loạt
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold">
                    Áp dụng nhanh cho nhiều môn hoặc nhiều khối cùng lúc
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">Khối áp dụng</label>
                  <select
                    value={batchGrade}
                    onChange={(e) => {
                      const newG = e.target.value
                      setBatchGrade(newG)
                      const valid = subjects.filter(s => isSubjectApplicable(s, newG, batchPeriodId))
                      setBatchSelectedSubjectIds(valid.map(s => s.id))
                    }}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    {grades.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">Hệ học áp dụng</label>
                  <select
                    value={batchSystemId}
                    onChange={(e) => setBatchSystemId(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="ALL">-- Tất cả hệ (Mẫu chung) --</option>
                    {(() => {
                      const uniqueSystemsMap = new Map()
                      eduSystems.forEach(s => {
                        if (!uniqueSystemsMap.has(s.code)) uniqueSystemsMap.set(s.code, s)
                      })
                      return Array.from(uniqueSystemsMap.values()).map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))
                    })()}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">Cấu trúc mẫu áp dụng</label>
                <select
                  value={batchPreset}
                  onChange={(e) => setBatchPreset(e.target.value as any)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-teal-800 outline-none"
                >
                  <option value="CURRENT">Sử dụng thông số đang chỉnh sửa trên Form</option>
                  <option value="TAV_70">Tiếng Anh viết (Thang 70đ chuẩn Sky-Line: Reading 25đ, Writing 25đ, Language 20đ)</option>
                  <option value="TAV_10">Tiếng Anh viết (Thang 10đ quy đổi: Reading 4đ, Writing 3đ, Language 3đ)</option>
                  <option value="TAVD_30">Tiếng Anh vấn đáp (Thang 30đ chuẩn Sky-Line: 10đ + 10đ + 10đ)</option>
                  <option value="TAVD_10">Tiếng Anh vấn đáp (Thang 10đ quy đổi)</option>
                  <option value="TOA">Toán học (Thang 10đ: Trắc nghiệm 4đ, Tự luận giải toán 6đ)</option>
                  <option value="TVI">Tiếng Việt (Thang 10đ: Đọc 5đ, Viết chính tả 5đ)</option>
                  <option value="TLY">Đánh giá Tâm lý (6 nhóm tiêu chí bám sát Form Giáo viên - Tổng 80đ)</option>
                  <option value="NLTD">Năng lực tư duy (5 tiêu chí bám sát Form Giáo viên Khối 1)</option>
                  <option value="NLTD_SCORE">Năng lực tư duy thang 10đ (Logic 4đ, Toán 3đ, Ngôn ngữ 3đ)</option>
                  <option value="CHILD_DEV_16">Bộ chuẩn phát triển trẻ 5-6 tuổi (16 chỉ số QĐ 4222)</option>
                  <option value="EPT">EPT Chuẩn hóa Xếp lớp (4 kỹ năng x 25đ - Tổng 100đ)</option>
                  <option value="PHIEU_DINH_HUONG">🌟 Phiếu định hướng đầu vào (Bộ 2 Tab: Phỏng vấn HS & Trao đổi PHHS - Đánh giá định tính phi điểm số)</option>
                </select>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase">
                    Chọn các Môn khảo sát ({batchSelectedSubjectIds.length}/{subjects.length})
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Quick Smart Selectors for Grade 1 */}
                    {(batchGrade === "Khối 1" || batchGrade === "1") && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const ids = subjects.filter(s => ["TAvd", "TLY", "NLTD"].includes(s.code)).map(s => s.id)
                            setBatchSelectedSubjectIds(ids)
                          }}
                          className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200 hover:bg-amber-100"
                        >
                          🎯 3 môn Đầu năm
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const ids = subjects.filter(s => ["TOA", "TVI", "TAv"].includes(s.code)).map(s => s.id)
                            setBatchSelectedSubjectIds(ids)
                          }}
                          className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 hover:bg-emerald-100"
                        >
                          ⭐ 3 môn Bổ sung HK
                        </button>
                        <span className="text-slate-300">•</span>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const valid = subjects.filter(s => isSubjectApplicable(s, batchGrade, batchPeriodId))
                        setBatchSelectedSubjectIds(valid.map(s => s.id))
                      }}
                      className="text-[11px] font-bold text-teal-600 hover:underline"
                    >
                      Tất cả
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setBatchSelectedSubjectIds([])}
                      className="text-[11px] font-bold text-slate-400 hover:underline"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl custom-scrollbar">
                  {subjects
                    .filter(s => isSubjectApplicable(s, batchGrade, batchPeriodId))
                    .map(s => {
                      const isChecked = batchSelectedSubjectIds.includes(s.id)
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs font-bold transition-all ${
                            isChecked ? "bg-white text-teal-900 shadow-xs border border-teal-200" : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBatchSelectedSubjectIds(prev => [...prev, s.id])
                              } else {
                                setBatchSelectedSubjectIds(prev => prev.filter(x => x !== s.id))
                              }
                            }}
                            className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="truncate">{s.name} ({s.code})</span>
                        </label>
                      )
                    })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBatchOpen(false)}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveBatch}
                disabled={batchSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 shadow-md shadow-teal-500/20 disabled:opacity-50"
              >
                {batchSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Áp dụng Hàng Loạt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SAO CHÉP CẤU HÌNH TỪ KHỐI KHÁC */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-7 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    Sao Chép Cấu Hình Từ Khối Khác
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold">
                    Đang thiết lập cho: <strong className="text-teal-700">{currentSubject?.name}</strong> • <strong className="text-teal-700">{selectedGrade}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCloneModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 uppercase">
                  Chọn mẫu nguồn đã cấu hình sẵn để sao chép:
                </label>
                {savedConfigs.filter(c => c.subjectId === selectedSubjectId && c.grade !== selectedGrade).length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 font-medium">
                    ⚠️ Môn <strong>{currentSubject?.name}</strong> hiện chưa có cấu hình mẫu ở các khối lớp khác để sao chép. Bạn có thể chọn áp dụng từ một trong các Preset chuẩn bên trên.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {savedConfigs
                      .filter(c => c.subjectId === selectedSubjectId && c.grade !== selectedGrade)
                      .map(cfg => {
                        let cNames: string[] = []
                        try { cNames = JSON.parse(cfg.columnNames || "[]") } catch (_) {}
                        const isChosen = cloneSourceConfigId === cfg.id
                        return (
                          <div
                            key={cfg.id}
                            onClick={() => setCloneSourceConfigId(cfg.id)}
                            className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                              isChosen
                                ? "bg-teal-50 border-teal-500 ring-2 ring-teal-400/20 shadow-xs"
                                : "bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-lg bg-teal-600 text-white text-[10px] font-black">
                                  {cfg.grade || "Toàn khối"}
                                </span>
                                <span className="text-xs font-black text-slate-800">
                                  {cfg.columnCount} cột điểm
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                  • {cfg.formula || "AVG"}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-1">
                                {cNames.join(" • ")}
                              </p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isChosen ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300 bg-white"
                            }`}>
                              {isChosen && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCloneModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={!cloneSourceConfigId}
                  onClick={handleApplyClone}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-md shadow-teal-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>Sao chép sang {selectedGrade}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
