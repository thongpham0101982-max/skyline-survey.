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
  GraduationCap,
  ClipboardCheck,
  CheckSquare,
  Square
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

const COLUMN_TYPES = [
  { code: "SCORE_10", name: "Thang điểm 10 (Số thập phân MOET)" },
  { code: "SCORE_CUSTOM", name: "Thang điểm tùy chọn trong thang 10 (Tối đa 1 - 10đ)" },
  { code: "SCORE_100", name: "Thang điểm 100" },
  { code: "SCORE_CUSTOM_100", name: "Thang điểm tùy chọn trong thang 100 (Tối đa 1 - 100đ)" },
  { code: "GRADE_SKL", name: "Mức độ SKL (A - Tốt, B - Khá, C - Đạt, D - Chưa đạt)" },
  { code: "GRADE_INTL", name: "Mức độ Quốc tế (E - Tốt, S - Đạt, N - Cần cải thiện, U - Chưa đạt)" },
  { code: "GRADE_CEFR", name: "Xếp bậc CEFR (A1, A2, B1, B2, C1)" },
  { code: "REMARK", name: "Định dạng Nhận xét bằng lời" }
]

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
    commitmentThreshold: 30.0
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
    commitmentThreshold: 30.0
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
    commitmentThreshold: 30.0
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
    commitmentThreshold: 4.5
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
    commitmentThreshold: 12.0
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
    commitmentThreshold: 4.5
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
    commitmentThreshold: 30.0
  }
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
  const [batchSaving, setBatchSaving] = useState(false)
  const [batchPreset, setBatchPreset] = useState<"CURRENT" | "TAV" | "TAVD" | "TLY" | "NLTD" | "EPT">("CURRENT")

  // List filter states
  const [listFilterSystemId, setListFilterSystemId] = useState("ALL")
  const [listFilterGrade, setListFilterGrade] = useState("ALL")
  const [listFilterPeriod, setListFilterPeriod] = useState("ALL")
  const [listSearchTerm, setListSearchTerm] = useState("")

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
      setCommitmentThreshold(preset.commitmentThreshold != null ? String(preset.commitmentThreshold) : "30.0")
      
      const newSim: Record<number, string> = {}
      preset.columnMaxScores.forEach((m: number, idx: number) => {
        newSim[idx] = String(Math.round(m * 0.7))
      })
      setSimScores(newSim)
      showMessage(`Đã áp dụng mẫu chuẩn [${preset.compositeColumnName || subCode}] cho ${curGrade}!`, "ok")
    }
  }

  const handleSelectGradeChange = (newGrade: string) => {
    setSelectedGrade(newGrade)
    // Nếu có config lưu sẵn thì load, ngược lại nếu đang ở môn TAv/TAvd/EPT thì tự sync preset theo khối
    const existing = savedConfigs.find(c => 
      c.subjectId === selectedSubjectId && 
      (c.grade === newGrade || c.grade === "ALL") &&
      (c.educationSystemId === selectedSystemId || c.educationSystemId === "ALL")
    )
    if (existing) {
      loadConfigToForm(existing)
    } else {
      const subObj = subjects.find(s => s.id === selectedSubjectId)
      if (subObj) {
        applyPresetForSubject(subObj.code, newGrade)
      }
    }
  }

  const handleSelectSubjectChange = (subId: string) => {
    setSelectedSubjectId(subId)
    // Kiểm tra xem đã có cấu hình lưu sẵn trong database cho tổ hợp này chưa
    const existing = savedConfigs.find(c => 
      c.subjectId === subId && 
      (c.grade === selectedGrade || c.grade === "ALL") &&
      (c.educationSystemId === selectedSystemId || c.educationSystemId === "ALL")
    )
    if (existing) {
      loadConfigToForm(existing)
    } else {
      const subObj = subjects.find(s => s.id === subId)
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
      setCommitmentThreshold(cfg.commitmentThreshold != null ? String(cfg.commitmentThreshold) : "4.5")

      const newSim: Record<number, string> = {}
      maxScores.forEach((m: number, idx: number) => {
        newSim[idx] = String((m * 0.75).toFixed(1))
      })
      setSimScores(newSim)

      setSelectedGrade(cfg.grade !== "ALL" ? cfg.grade : selectedGrade)
      setSelectedSystemId(cfg.educationSystemId || "ALL")
      setSelectedPeriodId(cfg.periodId || "ALL")
      setSelectedSubjectId(cfg.subjectId)

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
          commitmentThreshold: commitmentThreshold ? parseFloat(commitmentThreshold) : null
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
    setBatchSelectedSubjectIds(subjects.map(s => s.id))
    setIsBatchOpen(true)
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
      if (listFilterSystemId !== "ALL" && c.educationSystemId !== listFilterSystemId && c.educationSystemId !== "ALL") return false
      if (listFilterGrade !== "ALL" && c.grade !== listFilterGrade && c.grade !== "ALL") return false
      if (listFilterPeriod !== "ALL" && c.periodId !== listFilterPeriod && c.periodId !== "ALL") return false
      if (listSearchTerm) {
        const term = listSearchTerm.toLowerCase()
        const sName = (c.subject?.name || "").toLowerCase()
        const sCode = (c.subject?.code || "").toLowerCase()
        if (!sName.includes(term) && !sCode.includes(term)) return false
      }
      return true
    })
  }, [savedConfigs, listFilterSystemId, listFilterGrade, listFilterPeriod, listSearchTerm])

  // Current active subject definition
  const currentSubject = subjects.find(s => s.id === selectedSubjectId)

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
                // Tìm config phù hợp theo mốc thời gian mới
                const existing = savedConfigs.find(c =>
                  c.subjectId === selectedSubjectId &&
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
              <optgroup label="Mốc Tuyển sinh & Học kỳ">
                <option value="DAU_NAM">Đầu năm (Tuyển sinh năm học mới)</option>
                <option value="HK1">Học kỳ 1 (HK1 - Bổ sung môn)</option>
                <option value="HK2">Học kỳ 2 (HK2 - Bổ sung môn)</option>
              </optgroup>
              {periods.length > 0 && (
                <optgroup label="Các đợt khảo sát chi tiết">
                  {periods.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </optgroup>
              )}
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
              className="h-10 px-3 bg-slate-50 border border-teal-500/40 text-teal-900 text-xs font-bold rounded-xl outline-none focus:border-teal-500 shadow-xs"
            >
              {subjects
                .filter(s => {
                  const isPreschool = ["Mầm", "Chồi", "Lá", "Nhà trẻ", "Mầm non"].some(k => selectedGrade.includes(k))
                  if (isPreschool) return s.code === "TCI" || s.code.startsWith("MN")
                  return s.code !== "TCI" // Ẩn môn mầm non khi chọn các khối phổ thông K12
                })
                .map(s => {
                  let badgeSuffix = ""
                  const isG1 = selectedGrade === "Khối 1" || selectedGrade === "1"
                  if (isG1) {
                    if (selectedPeriodId === "DAU_NAM" || selectedPeriodId === "ALL") {
                      if (["TAvd", "TLY", "NLTD"].includes(s.code)) badgeSuffix = " • [Tuyển sinh đầu năm]"
                      else if (["TOA", "TVI", "TAv"].includes(s.code)) badgeSuffix = " • [⚠️ Chỉ áp dụng từ HK1/HK2]"
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
            {(selectedGrade === "Khối 1" || selectedGrade === "1"
              ? (selectedPeriodId === "HK1" || selectedPeriodId === "HK2"
                  ? ["TOA", "TVI", "TAv", "TAvd", "TLY", "NLTD"]
                  : ["TAvd", "TLY", "NLTD"])
              : ["TAv", "TAvd", "TOA", "TVI", "TLY", "NLTD", "EPT"]
            ).map(code => (
              <button
                key={code}
                type="button"
                onClick={() => applyPresetForSubject(code)}
                className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition-all border ${
                  ["TOA", "TVI", "TAv"].includes(code) && (selectedGrade === "Khối 1" && (selectedPeriodId === "HK1" || selectedPeriodId === "HK2"))
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                    : "bg-white text-slate-700 hover:text-teal-600 hover:shadow-xs border-slate-200/80"
                }`}
              >
                {code === "TOA" ? "Toán" : code === "TVI" ? "Tiếng Việt" : code}
              </button>
            ))}
          </div>

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
                setCommitmentThreshold("30.0")
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
                setCommitmentThreshold("30.0")
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
                setCommitmentThreshold("30.0")
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
                setCommitmentThreshold("4.5")
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
                setCommitmentThreshold("12.0")
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
                setCommitmentThreshold("4.5")
                showMessage("Đã áp dụng mẫu Tiếng Anh vấn đáp: Thang 10đ quy đổi!", "ok")
              }}
              className="px-3.5 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-xs"
            >
              Thang 10đ quy đổi
            </button>
          </div>
        </div>
      )}

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

          {/* DANH SÁCH CÁC CỘT ĐIỂM THÀNH PHẦN */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <span>1. Chi tiết các Cột điểm thành phần</span>
                <span className="text-[10px] text-teal-600 font-bold lowercase bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  ({columnCount} cột)
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setColumnCount(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  - Bớt cột
                </button>
                <button
                  type="button"
                  onClick={() => setColumnCount(prev => Math.min(8, prev + 1))}
                  className="px-2.5 py-1 text-xs font-bold text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100"
                >
                  + Thêm cột
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {Array.from({ length: columnCount }).map((_, idx) => (
                <div 
                  key={idx} 
                  className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center gap-3 hover:border-teal-300 transition-all"
                >
                  <div className="flex items-center gap-2 md:w-16 flex-shrink-0">
                    <span className="w-6 h-6 rounded-lg bg-teal-600 text-white text-[11px] font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-black text-slate-600">Cột {idx + 1}</span>
                  </div>

                  {/* Tên cột */}
                  <div className="flex-1">
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
                      placeholder={`Tên cột ${idx + 1}`}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-teal-500 outline-none"
                    />
                  </div>

                  {/* Thang điểm */}
                  <div className="md:w-56 flex-shrink-0">
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
                      className="w-full h-9 px-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-teal-500 outline-none"
                    >
                      {COLUMN_TYPES.map(t => (
                        <option key={t.code} value={t.code}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Điểm tối đa nếu là SCORE_CUSTOM hoặc SCORE_CUSTOM_100 */}
                  {(columnTypes[idx]?.includes("CUSTOM") || columnTypes[idx] === "SCORE_100") && (
                    <div className="flex items-center gap-1.5 md:w-28 flex-shrink-0">
                      <span className="text-[10px] font-bold text-slate-400">Max:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={columnMaxScores[idx] || 10}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 10
                          setColumnMaxScores(prev => {
                            const n = [...prev]
                            n[idx] = val
                            return n
                          })
                        }}
                        className="w-full h-9 px-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-center text-teal-700 outline-none"
                      />
                    </div>
                  )}

                  {/* Trọng số nếu là WEIGHTED */}
                  {formulaType === "WEIGHTED" && (
                    <div className="flex items-center gap-1.5 md:w-24 flex-shrink-0">
                      <span className="text-[10px] font-bold text-slate-400">Hệ số:</span>
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
                        className="w-full h-9 px-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-center text-amber-600 outline-none"
                      />
                    </div>
                  )}
                </div>
              ))}
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
                <span>3. Cột Nhận Xét & Tiêu Chí Đạt / Cam Kết</span>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
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
            </div>
          </div>

          {/* LIVE SIMULATOR (MÔ PHỎNG TÍNH ĐIỂM TRỰC TIẾP) */}
          {hasComposite && (
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
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      simulatedResult >= parseFloat(passScore || "5")
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : simulatedResult >= parseFloat(commitmentThreshold || "4.5")
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-rose-100 text-rose-800 border border-rose-300"
                    }`}>
                      {simulatedResult >= parseFloat(passScore || "5") ? "Đạt chuẩn" : "Diện Cam kết"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

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
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  Danh sách Cấu hình Mẫu đã lưu
                </h3>
                <span className="text-[11px] font-bold text-teal-600">
                  {filteredSavedConfigs.length} / {savedConfigs.length} cấu hình
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchConfigs}
              disabled={loadingConfigs}
              title="Tải lại danh sách"
              className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loadingConfigs ? "animate-spin text-teal-600" : ""}`} />
            </button>
          </div>

          {/* BỘ LỌC DANH SÁCH */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={listSearchTerm}
                onChange={(e) => setListSearchTerm(e.target.value)}
                placeholder="Tìm môn học (TAv, Tâm lý, EPT...)"
                className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={listFilterGrade}
                onChange={(e) => setListFilterGrade(e.target.value)}
                className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none"
              >
                <option value="ALL">-- Tất cả khối --</option>
                {grades.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <select
                value={listFilterSystemId}
                onChange={(e) => setListFilterSystemId(e.target.value)}
                className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none"
              >
                <option value="ALL">-- Tất cả hệ học --</option>
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

          {/* LIST CARDS */}
          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1 custom-scrollbar">
            {loadingConfigs ? (
              <div className="py-12 text-center text-xs font-bold text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                Đang tải cấu hình mẫu...
              </div>
            ) : filteredSavedConfigs.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl p-6">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">Không tìm thấy cấu hình phù hợp</p>
                <p className="text-[11px] text-slate-400 mt-1">Hãy thiết lập và bấm Lưu cấu hình mẫu bên trái</p>
              </div>
            ) : (
              filteredSavedConfigs.map(cfg => {
                let colNamesList: string[] = []
                try {
                  colNamesList = JSON.parse(cfg.columnNames || "[]")
                } catch (_) {}

                const isCurrentActive = 
                  cfg.subjectId === selectedSubjectId && 
                  (cfg.grade === selectedGrade || cfg.grade === "ALL")

                return (
                  <div
                    key={cfg.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCurrentActive
                        ? "bg-teal-50/50 border-teal-400 shadow-sm ring-1 ring-teal-400/30"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900">
                            {cfg.subject?.name || "Môn Khảo sát"}
                          </h4>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 uppercase">
                            {cfg.subject?.code || "KSDV"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-800">
                            {cfg.grade || "Toàn khối"}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            cfg.periodId === "DAU_NAM" ? "bg-amber-100 text-amber-800" :
                            cfg.periodId === "HK1" ? "bg-blue-100 text-blue-800" :
                            cfg.periodId === "HK2" ? "bg-indigo-100 text-indigo-800" :
                            "bg-slate-100 text-slate-700"
                          }`}>
                            {cfg.periodId === "DAU_NAM" ? "Đầu năm" :
                             cfg.periodId === "HK1" ? "Học kỳ 1" :
                             cfg.periodId === "HK2" ? "Học kỳ 2" :
                             cfg.periodId === "ALL" ? "Cả năm / Chung" :
                             (periods.find(p => p.id === cfg.periodId)?.name || cfg.periodId)}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            {cfg.educationSystemId === "ALL" ? "Mẫu chung" : (eduSystems.find(s => s.id === cfg.educationSystemId)?.name || cfg.educationSystemId)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            • {cfg.columnCount} cột điểm
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleExportBlankExcel(cfg)}
                          title="Tải File Excel Mẫu"
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => loadConfigToForm(cfg)}
                          title="Nạp cấu hình lên form để sửa"
                          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteConfig(cfg.id, cfg.subject?.name || "")}
                          title="Xóa cấu hình"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Columns Tags */}
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {colNamesList.map((cName, cIdx) => (
                        <span
                          key={cIdx}
                          className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-medium text-slate-600 truncate max-w-[140px]"
                          title={cName}
                        >
                          {cName}
                        </span>
                      ))}
                    </div>

                    {/* Formula and Benchmark info */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span>Công thức: <strong className="text-teal-700">{cfg.formula || "AVERAGE"}</strong></span>
                      {cfg.passScore && (
                        <span>Chuẩn đạt: <strong className="text-emerald-700">{cfg.passScore}đ</strong></span>
                      )}
                    </div>
                  </div>
                )
              })
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
                    onChange={(e) => setBatchGrade(e.target.value)}
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
                      onClick={() => setBatchSelectedSubjectIds(subjects.map(s => s.id))}
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
                    .filter(s => {
                      const isPreschool = ["Mầm", "Chồi", "Lá", "Nhà trẻ", "Mầm non"].some(k => batchGrade.includes(k))
                      if (isPreschool) return s.code === "TCI" || s.code.startsWith("MN")
                      return s.code !== "TCI" // Ẩn môn mầm non khi chọn các khối phổ thông K12
                    })
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
    </div>
  )
}
