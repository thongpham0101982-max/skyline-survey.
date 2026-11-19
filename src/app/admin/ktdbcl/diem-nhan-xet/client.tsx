"use client"

import { useState, useEffect, useMemo, useRef, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import * as XLSX from "xlsx"
import { 
  FileSpreadsheet, 
  Settings, 
  Save, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Upload, 
  RefreshCw, 
  BookOpen, 
  Users, 
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
  TrendingUp,
  Calendar,
  Search,
  Filter,
  X,
  CheckSquare,
  Square,
  Lock,
  Unlock,
  MessageSquare,
  BarChart3,
  ChevronRight,
  ExternalLink
} from "lucide-react"
import { BulkExportModal } from "./bulk-export-modal"
import { TermGradesTab } from "./term-grades-tab"
import { VnEduImportModal } from "./VnEduImportModal"
import { updateStudentVnEduCodeAction } from "@/app/admin/classes/[id]/actions"
import { VnEduConfigMatrixPanel } from "./VnEduConfigMatrixPanel"
import { VnEduPrimaryGradebook } from "@/components/grading/VnEduPrimaryGradebook"
import { VnEduSecondaryGradebook } from "@/components/grading/VnEduSecondaryGradebook"
import {
  extractGradeNumber,
  getPrimaryPeriodMeta,
  getSubjectCurriculumGroup,
  isPrimaryGrade,
  isTt22CommentOnlySubject,
  normalizePrimaryXlInput,
  shouldPrimarySubjectHaveKtColumn,
} from "@/lib/grading/vnedu-config-types"
import { ClipboardCheck } from "lucide-react"
import { isGradeMatching } from "./grade-utils"
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
  { code: "REMARK", name: "Định dạng Nhận xét bằng lời" }
]

const SKL_OPTIONS = [
  { code: "A", label: "A - Tốt" },
  { code: "B", label: "B - Khá" },
  { code: "C", label: "C - Đạt" },
  { code: "D", label: "D - Chưa đạt" }
]

const INTL_OPTIONS = [
  { code: "E", label: "E - Excellent (Tốt)" },
  { code: "S", label: "S - Satisfactory (Đạt yêu cầu)" },
  { code: "N", label: "N - Needs improvement (Cần cải thiện)" },
  { code: "U", label: "U - Unsatisfactory (Chưa đạt)" }
]

interface Props {
  academicYears: any[]
  activeYearId: string
  classes: any[]
  subjects: any[]
  campuses?: any[]
  isSubjectScoped?: boolean
}

const EVAL_PERIODS = [
  { code: "KSĐN", name: "Khảo sát đầu năm (KSĐN)" },
  { code: "GK1", name: "Giữa kỳ 1 (GK1)" },
  { code: "CK1", name: "Cuối kỳ 1 (CK1)" },
  { code: "GK2", name: "Giữa kỳ 2 (GK2)" },
  { code: "CK2", name: "Cuối kỳ 2 (CK2)" },
  { code: "CN", name: "Cả năm (CN)" }
]

const GRADES = [
  "Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5",
  "Khối 6", "Khối 7", "Khối 8", "Khối 9",
  "Khối 10", "Khối 11", "Khối 12"
]

export function DiemNhanXetAdminClient(props: Props) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải Sổ điểm & Cấu hình...</div>}>
      <DiemNhanXetAdminClientInner {...props} />
    </Suspense>
  )
}

function DiemNhanXetAdminClientInner({ academicYears, activeYearId, classes, subjects, campuses = [], isSubjectScoped = false }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Common filters
  const [selectedYearId, setSelectedYearId] = useState(activeYearId || (academicYears[0]?.id || ""))
  const [activeTab, setActiveTab] = useState<"config" | "grades" | "term-grades">("config")

  // --- TAB 1: Config Form states ---
  const [localSubjects, setLocalSubjects] = useState<any[]>(subjects)
  useEffect(() => {
    setLocalSubjects(subjects)
  }, [subjects])

  const [customAddedSubjectIds, setCustomAddedSubjectIds] = useState<string[]>([])
  const [isAddMoreSubjectOpen, setIsAddMoreSubjectOpen] = useState(false)
  const [addMoreSubjectSearch, setAddMoreSubjectSearch] = useState("")
  const [addMoreGroupFilter, setAddMoreGroupFilter] = useState<"ALL" | "SKL" | "MOET">("ALL")
  const [newSubjectName, setNewSubjectName] = useState("")
  const [newSubjectCode, setNewSubjectCode] = useState("")
  const [newSubjectLevel, setNewSubjectLevel] = useState("ALL")
  const [creatingNewSubject, setCreatingNewSubject] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("skl_internal_custom_subject_ids")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setCustomAddedSubjectIds(parsed)
      }
    } catch (_) {}
  }, [])

  const toggleCustomAddedSubject = (subId: string) => {
    setCustomAddedSubjectIds(prev => {
      const exists = prev.includes(subId)
      const next = exists ? prev.filter(id => id !== subId) : [...prev, subId]
      try {
        window.localStorage.setItem("skl_internal_custom_subject_ids", JSON.stringify(next))
      } catch (_) {}
      return next
    })
  }

  const handleCreateAndAddSubject = async () => {
    const trimmedName = newSubjectName.trim()
    if (!trimmedName) {
      alert("Vui lòng nhập tên môn học mới!")
      return
    }
    try {
      setCreatingNewSubject(true)
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectName: trimmedName,
          subjectCode: newSubjectCode.trim() || undefined,
          level: newSubjectLevel,
          category: "INTERNATIONAL",
        }),
      })
      const data = await res.json()
      if (data.success && data.subject) {
        const created = data.subject
        setLocalSubjects(prev => {
          const exists = prev.some(s => s.id === created.id)
          return exists ? prev.map(s => (s.id === created.id ? created : s)) : [...prev, created]
        })
        setCustomAddedSubjectIds(prev => {
          const next = Array.from(new Set([...prev, created.id]))
          try {
            window.localStorage.setItem("skl_internal_custom_subject_ids", JSON.stringify(next))
          } catch (_) {}
          return next
        })
        setConfigSubjectId(created.id)
        setInternalSelectedSubjectIds(prev => Array.from(new Set([...prev, created.id])))
        setNewSubjectName("")
        setNewSubjectCode("")
      } else {
        alert("Lỗi: " + (data.error || "Không thể tạo môn học mới"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setCreatingNewSubject(false)
    }
  }

  const [configEducationLevel, setConfigEducationLevel] = useState<"ALL" | "PRIMARY" | "MIDDLE" | "HIGH">("PRIMARY")
  const [configGrade, setConfigGrade] = useState("Khối 4")
  const [configSubjectId, setConfigSubjectId] = useState("ALL")
  const [internalSelectedSubjectIds, setInternalSelectedSubjectIds] = useState<string[]>([])
  const [internalSubjectGroupTab, setInternalSubjectGroupTab] = useState<"BILINGUAL" | "MOET_KSDN" | "ALL">("BILINGUAL")
  const [configPeriod, setConfigPeriod] = useState("GK1")
  const [internalDisplayMode, setInternalDisplayMode] = useState<"MATRIX" | "GROUPED_CARDS">("MATRIX")
  const [internalMatrixGradeScope, setInternalMatrixGradeScope] = useState<"CURRENT_GRADE" | "LEVEL_GRADES">("CURRENT_GRADE")
  const internalDetailRef = useRef<HTMLDivElement | null>(null)
  const [columnCount, setColumnCount] = useState(3)
  const [columnNames, setColumnNames] = useState<string[]>(["English maths", "Toán Trắc nghiệm", "Toán Tự luận"])
  const [columnTypes, setColumnTypes] = useState<string[]>(["SCORE_MAX_50", "SCORE_MAX_20", "SCORE_MAX_30"])
  const [columnMaxScores, setColumnMaxScores] = useState<number[]>([50, 20, 30])
  
  // Composite Column & Flexible Formula states
  const [hasComposite, setHasComposite] = useState(true)
  const [compositeColumnName, setCompositeColumnName] = useState("Điểm")
  const [formulaType, setFormulaType] = useState<FormulaType>("AVERAGE")
  const [weights, setWeights] = useState<number[]>([1, 1, 1])
  const [formulaCustom, setFormulaCustom] = useState<string>("")
  const [roundingRule, setRoundingRule] = useState<RoundingRule>("ROUND_1")
  const [weightedMode, setWeightedMode] = useState<"COEFF" | "PERCENT">("COEFF")

  // Interactive Live Formula Simulator state
  const [simScores, setSimScores] = useState<Record<number, string>>({ 0: "8.0", 1: "7.5", 2: "9.0" })

  const [hasRemark, setHasRemark] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [savedConfigs, setSavedConfigs] = useState<any[]>([])
  const [loadingConfigs, setLoadingConfigs] = useState(false)

  // --- BATCH ASSIGN MODAL STATES ---
  const [isBatchAssignOpen, setIsBatchAssignOpen] = useState(false)
  const [batchPeriod, setBatchPeriod] = useState("KSĐN")
  const [batchGrade, setBatchGrade] = useState("Khối 12")
  const [batchSelectedSubjectIds, setBatchSelectedSubjectIds] = useState<string[]>([])
  const [batchSaving, setBatchSaving] = useState(false)
  const [batchTemplateType, setBatchTemplateType] = useState<"KEEP_EXISTING" | "CURRENT" | "2_COL_TEST" | "3_COL_STANDARD">("KEEP_EXISTING")

  // --- TAB 1: SAVED CONFIGS FILTER STATES ---
  const [listFilterPeriod, setListFilterPeriod] = useState("ALL")
  const [listFilterGrade, setListFilterGrade] = useState("ALL")
  const [listFilterSubjectGroup, setListFilterSubjectGroup] = useState<"BILINGUAL" | "ALL" | "MOET">("BILINGUAL")
  const [listSearchTerm, setListSearchTerm] = useState("")
  const [selectedInternalConfigIds, setSelectedInternalConfigIds] = useState<string[]>([])

  // --- TAB 2: OVERRIDE ALL SUBJECTS TOGGLE ---
  const [showAllTab2Subjects, setShowAllTab2Subjects] = useState(false)

  // Sync columnNames, columnTypes, columnMaxScores & weights length when columnCount changes
  useEffect(() => {
    setColumnNames(prev => {
      const next = [...prev]
      if (next.length < columnCount) {
        for (let i = next.length; i < columnCount; i++) {
          next.push(`Cột điểm ${i + 1}`)
        }
      } else if (next.length > columnCount) {
        return next.slice(0, columnCount)
      }
      return next
    })
    setColumnTypes(prev => {
      const next = [...prev]
      if (next.length < columnCount) {
        for (let i = next.length; i < columnCount; i++) {
          next.push("SCORE_10")
        }
      } else if (next.length > columnCount) {
        return next.slice(0, columnCount)
      }
      return next
    })
    setColumnMaxScores(prev => {
      const next = [...prev]
      if (next.length < columnCount) {
        for (let i = next.length; i < columnCount; i++) {
          next.push(10)
        }
      } else if (next.length > columnCount) {
        return next.slice(0, columnCount)
      }
      return next
    })
    setWeights(prev => {
      const next = [...prev]
      if (next.length < columnCount) {
        for (let i = next.length; i < columnCount; i++) {
          next.push(1)
        }
      } else if (next.length > columnCount) {
        return next.slice(0, columnCount)
      }
      return next
    })
  }, [columnCount])


  // Danh sách cấu hình thuộc "2. Đánh giá nội bộ Sky-Line" (INTERNAL)
  const internalSavedConfigs = useMemo(
    () => savedConfigs.filter(c => (c.configType || "INTERNAL") === "INTERNAL" && c.isActive !== false),
    [savedConfigs]
  )

  // Subjects configured in selected period and grade (for Tab 1 form grouping)
  // Lưu ý: Với Khối 6 KSĐN thì các môn khảo sát lấy ở Tiểu học của Khối 5
  const configuredSubjectIdsInSelectedPeriodAndGrade = useMemo(() => {
    const set = new Set<string>()
    const isG6Ksdn =
      (configPeriod === "KSĐN" || configPeriod === "KSDN") &&
      isGradeMatching(configGrade, "Khối 6")
    const isG5Ksdn =
      (configPeriod === "KSĐN" || configPeriod === "KSDN") &&
      isGradeMatching(configGrade, "Khối 5")

    if (isG6Ksdn || isG5Ksdn) {
      savedConfigs.forEach(c => {
        if (c.isActive === false || !c.subjectId || c.subjectId === "ALL") return
        if (isGradeMatching(c.grade, "Khối 5")) {
          if (
            c.evaluationPeriod === "KSĐN" ||
            c.evaluationPeriod === "ALL" ||
            (c.configType || "INTERNAL") === "INTERNAL"
          ) {
            set.add(c.subjectId)
          }
        }
      })
    }

    internalSavedConfigs.forEach(c => {
      const pMatch =
        configPeriod === "ALL" ||
        c.evaluationPeriod === configPeriod ||
        ((configPeriod === "KSĐN" || configPeriod === "KSDN") && c.evaluationPeriod === "ALL")
      const gMatch = isGradeMatching(c.grade, configGrade)
      if (pMatch && gMatch && c.subjectId && c.subjectId !== "ALL") {
        set.add(c.subjectId)
      }
    })
    return set
  }, [savedConfigs, internalSavedConfigs, configPeriod, configGrade])

  // Open batch assign modal (Lấy các môn Song ngữ & Quốc tế + môn tùy chọn bổ sung)
  const openBatchAssignModal = (defaultPeriod?: string, defaultGrade?: string) => {
    const pToUse = defaultPeriod || (configPeriod !== "ALL" ? configPeriod : "GK1")
    const gToUse = defaultGrade || (configGrade !== "ALL" ? configGrade : "Khối 4")
    setBatchPeriod(pToUse)
    setBatchGrade(gToUse)
    const isG6KsdnBatch = (pToUse === "KSĐN" || pToUse === "KSDN") && isGradeMatching(gToUse, "Khối 6")
    const existing = internalSavedConfigs
      .filter(
        c =>
          (c.evaluationPeriod === pToUse || c.evaluationPeriod === "ALL") &&
          (isGradeMatching(c.grade, gToUse) || (isG6KsdnBatch && isGradeMatching(c.grade, "Khối 5"))) &&
          c.subjectId &&
          c.subjectId !== "ALL" &&
          c.subject &&
          (getSubjectCurriculumGroup(c.subject) === "BILINGUAL" || customAddedSubjectIds.includes(c.subjectId))
      )
      .map(c => c.subjectId)
    setBatchSelectedSubjectIds(Array.from(new Set(existing)))
    setIsBatchAssignOpen(true)
  }

  // When changing period or grade inside batch modal
  const handleBatchPeriodOrGradeChange = (newPeriod: string, newGrade: string) => {
    setBatchPeriod(newPeriod)
    setBatchGrade(newGrade)
    const isG6KsdnBatch = (newPeriod === "KSĐN" || newPeriod === "KSDN") && isGradeMatching(newGrade, "Khối 6")
    const existing = internalSavedConfigs
      .filter(
        c =>
          (c.evaluationPeriod === newPeriod || c.evaluationPeriod === "ALL") &&
          (isGradeMatching(c.grade, newGrade) || (isG6KsdnBatch && isGradeMatching(c.grade, "Khối 5"))) &&
          c.subjectId &&
          c.subjectId !== "ALL" &&
          c.subject &&
          (getSubjectCurriculumGroup(c.subject) === "BILINGUAL" || customAddedSubjectIds.includes(c.subjectId))
      )
      .map(c => c.subjectId)
    setBatchSelectedSubjectIds(Array.from(new Set(existing)))
  }

  // Danh sách toàn bộ môn Song ngữ & Quốc tế (+ các môn tùy chọn bổ sung)
  const allBilingualSubjects = useMemo(
    () =>
      localSubjects.filter(
        s => getSubjectCurriculumGroup(s) === "BILINGUAL" || customAddedSubjectIds.includes(s.id)
      ),
    [localSubjects, customAddedSubjectIds]
  )

  // Quick subject select helper (trong modal Gán môn hàng loạt — chỉ chọn các môn Song ngữ & Quốc tế)
  const handleQuickSelectSubjects = (type: "ALL" | "NONE") => {
    if (type === "ALL") {
      setBatchSelectedSubjectIds(allBilingualSubjects.map(s => s.id))
    } else {
      setBatchSelectedSubjectIds([])
    }
  }

  // Toggle single subject
  const toggleBatchSubject = (id: string) => {
    setBatchSelectedSubjectIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // Save batch assign
  const handleSaveBatchAssign = async () => {
    if (batchSelectedSubjectIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 môn học để gán cho kỳ khảo sát!")
      return
    }

    try {
      setBatchSaving(true)
      let payloadColumns: any = {
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
        roundingRule
      }

      if (batchTemplateType === "2_COL_TEST") {
        payloadColumns = {
          columnCount: 2,
          columnNames: ["Trắc nghiệm lựa chọn (ABCD)", "Trắc nghiệm đúng sai"],
          columnTypes: ["SCORE_MAX_6", "SCORE_MAX_4"],
          columnMaxScores: [6, 4],
          hasCompositeColumn: true,
          compositeColumnName: "Tổng điểm",
          hasRemarkColumn: false,
          formula: "SUM",
          formulaCustom: "",
          weights: [1, 1],
          roundingRule: "ROUND_1"
        }
      } else if (batchTemplateType === "3_COL_STANDARD") {
        payloadColumns = {
          columnCount: 3,
          columnNames: ["Điểm Miệng", "Điểm 15 Phút", "Điểm 1 Tiết"],
          columnTypes: ["SCORE_10", "SCORE_10", "SCORE_10"],
          columnMaxScores: [10, 10, 10],
          hasCompositeColumn: true,
          compositeColumnName: "Điểm thành phần",
          hasRemarkColumn: true,
          formula: "AVERAGE",
          formulaCustom: "",
          weights: [1, 1, 1],
          roundingRule: "ROUND_1"
        }
      }

      const res = await fetch("/api/admin/ktdbcl/grade-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          grade: batchGrade,
          evaluationPeriod: batchPeriod,
          batchSubjectIds: batchSelectedSubjectIds,
          keepExistingTemplates: batchTemplateType === "KEEP_EXISTING",
          ...payloadColumns
        })
      })

      const data = await res.json()
      if (data.success) {
        alert(`Đã gán thành công ${batchSelectedSubjectIds.length} môn cho kỳ ${batchPeriod} - ${batchGrade}!`)
        setIsBatchAssignOpen(false)
        fetchConfigs()
      } else {
        alert("Lỗi: " + (data.error || "Không thể lưu cấu hình hàng loạt"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setBatchSaving(false)
    }
  }

  // Count configs per period for quick filter pills (in "2. Đánh giá nội bộ Sky-Line" — Tính các môn Song ngữ & Quốc tế + môn tùy chọn bổ sung)
  const periodCounts = useMemo(() => {
    const bilConfigs = internalSavedConfigs.filter(c => {
      const grp = c.subject ? getSubjectCurriculumGroup(c.subject) : "BILINGUAL"
      return grp === "BILINGUAL" || (c.subjectId && customAddedSubjectIds.includes(c.subjectId))
    })
    const counts: Record<string, number> = { ALL: bilConfigs.length }
    EVAL_PERIODS.forEach(p => counts[p.code] = 0)
    bilConfigs.forEach(c => {
      const p = c.evaluationPeriod || "ALL"
      counts[p] = (counts[p] || 0) + 1
    })
    return counts
  }, [internalSavedConfigs, customAddedSubjectIds])

  // Danh sách môn Song ngữ & Quốc tế cho mục "2. Đánh giá nội bộ Sky-Line" (lọc theo Bậc / Khối áp dụng)
  const bilingualSubjectsForInternal = useMemo(() => {
    const bilPool = localSubjects.filter(s => getSubjectCurriculumGroup(s) === "BILINGUAL")
    if (configEducationLevel === "ALL" && configGrade === "ALL") return bilPool
    const targetLvl =
      configGrade !== "ALL"
        ? (() => {
            const gn = extractGradeNumber(configGrade) || 1
            return gn <= 5 ? "PRIMARY" : gn <= 9 ? "MIDDLE" : "HIGH"
          })()
        : configEducationLevel
    const matched = bilPool.filter(s => {
      const lvl = String(s.level || "ALL").toUpperCase().trim()
      if (!lvl || lvl === "ALL") return true
      return lvl.includes(targetLvl)
    })
    return matched.length > 0 ? matched : bilPool
  }, [localSubjects, configEducationLevel, configGrade])

  // Các môn tùy chọn bổ sung thêm vào "2. Đánh giá nội bộ Sky-Line"
  const extraAddedSubjectsForInternal = useMemo(() => {
    const bilIds = new Set(bilingualSubjectsForInternal.map(s => s.id))
    return localSubjects.filter(s => !bilIds.has(s.id) && customAddedSubjectIds.includes(s.id))
  }, [localSubjects, bilingualSubjectsForInternal, customAddedSubjectIds])

  // Danh sách các môn khác trong hệ thống có thể tùy chọn bổ sung thêm
  const candidateSubjectsToAdd = useMemo(() => {
    const bilIds = new Set(bilingualSubjectsForInternal.map(s => s.id))
    return localSubjects.filter(s => {
      if (bilIds.has(s.id)) return false
      const grp = getSubjectCurriculumGroup(s)
      if (grp === "KSDV") return false
      if (addMoreGroupFilter === "SKL" && grp !== "SKL") return false
      if (addMoreGroupFilter === "MOET" && grp !== "MOET") return false
      if (addMoreSubjectSearch.trim()) {
        const kw = addMoreSubjectSearch.toLowerCase().trim()
        const nameMatch = String(s.subjectName || "").toLowerCase().includes(kw)
        const codeMatch = String(s.subjectCode || "").toLowerCase().includes(kw)
        if (!nameMatch && !codeMatch) return false
      }
      return true
    })
  }, [localSubjects, bilingualSubjectsForInternal, addMoreGroupFilter, addMoreSubjectSearch])

  const filteredInternalPickerSubjects = useMemo(() => {
    return [...bilingualSubjectsForInternal, ...extraAddedSubjectsForInternal]
  }, [bilingualSubjectsForInternal, extraAddedSubjectsForInternal])

  const applyInternalPreset = (
    preset: "MATH_BILINGUAL" | "ESL_INTL" | "SCIENCE_BILINGUAL" | "ENGLISH_SKILLS_3"
  ) => {
    if (preset === "MATH_BILINGUAL") {
      setColumnCount(3)
      setColumnNames(["English maths", "Toán Trắc nghiệm", "Toán Tự luận"])
      setColumnTypes(["SCORE_MAX_50", "SCORE_MAX_20", "SCORE_MAX_30"])
      setColumnMaxScores([50, 20, 30])
      setHasComposite(true)
      setCompositeColumnName("Điểm")
      setFormulaType("AVERAGE")
      setWeights([1, 1, 1])
      setRoundingRule("ROUND_1")
      setHasRemark(true)
      return
    }
    if (preset === "ESL_INTL") {
      setColumnCount(3)
      setColumnNames(["Listening & Speaking", "Reading & Use of English", "Writing"])
      setColumnTypes(["SCORE_10", "SCORE_10", "SCORE_10"])
      setColumnMaxScores([10, 10, 10])
      setHasComposite(true)
      setCompositeColumnName("Điểm")
      setFormulaType("AVERAGE")
      setWeights([1, 1, 1])
      setRoundingRule("ROUND_1")
      setHasRemark(true)
      return
    }
    if (preset === "SCIENCE_BILINGUAL") {
      setColumnCount(2)
      setColumnNames(["English Science", "Vietnamese Science"])
      setColumnTypes(["SCORE_MAX_50", "SCORE_MAX_50"])
      setColumnMaxScores([50, 50])
      setHasComposite(true)
      setCompositeColumnName("Điểm")
      setFormulaType("AVERAGE")
      setWeights([1, 1])
      setRoundingRule("ROUND_1")
      setHasRemark(true)
      return
    }
    if (preset === "ENGLISH_SKILLS_3") {
      setColumnCount(3)
      setColumnNames(["Listening", "Reading & Writing", "Speaking"])
      setColumnTypes(["SCORE_MAX_20", "SCORE_MAX_50", "SCORE_MAX_30"])
      setColumnMaxScores([20, 50, 30])
      setHasComposite(true)
      setCompositeColumnName("Điểm")
      setFormulaType("SUM")
      setWeights([1, 1, 1])
      setRoundingRule("ROUND_1")
      setHasRemark(true)
    }
  }

  // Filtered saved configs for Tab 1 list ("2. Đánh giá nội bộ Sky-Line" — Hiện các môn Song ngữ & Quốc tế + môn tùy chọn bổ sung)
  const filteredSavedConfigs = useMemo(() => {
    const isFilteringG6Ksdn =
      (listFilterPeriod === "KSĐN" || listFilterPeriod === "KSDN") &&
      isGradeMatching("Khối 6", listFilterGrade)
    return internalSavedConfigs.filter(cfg => {
      const grp = cfg.subject ? getSubjectCurriculumGroup(cfg.subject) : "BILINGUAL"
      const isCustomAdded = cfg.subjectId ? customAddedSubjectIds.includes(cfg.subjectId) : false
      if (grp !== "BILINGUAL" && !isCustomAdded) return false

      if (listFilterPeriod !== "ALL") {
        if (listFilterPeriod === "KSĐN" || listFilterPeriod === "KSDN") {
          if (
            cfg.evaluationPeriod !== "KSĐN" &&
            cfg.evaluationPeriod !== "KSDN" &&
            cfg.evaluationPeriod !== "ALL" &&
            !(isFilteringG6Ksdn && isGradeMatching(cfg.grade, "Khối 5"))
          ) {
            return false
          }
        } else if (cfg.evaluationPeriod !== listFilterPeriod) {
          return false
        }
      }
      if (
        listFilterGrade !== "ALL" &&
        !isGradeMatching(cfg.grade, listFilterGrade) &&
        !(isFilteringG6Ksdn && isGradeMatching(cfg.grade, "Khối 5"))
      ) {
        return false
      }
      if (listSearchTerm.trim()) {
        const kw = listSearchTerm.toLowerCase().trim()
        const sName = (cfg.subject?.subjectName || "Mẫu chung tất cả môn").toLowerCase()
        const sCode = (cfg.subject?.subjectCode || "").toLowerCase()
        if (!sName.includes(kw) && !sCode.includes(kw)) return false
      }
      return true
    })
  }, [internalSavedConfigs, customAddedSubjectIds, listFilterPeriod, listFilterGrade, listSearchTerm])

  // Danh sách các Khối thuộc Bậc đang chọn ở mục 2. Đánh giá nội bộ Sky-Line
  const gradesInSelectedEducationLevel = useMemo(() => {
    return GRADES.filter(g => {
      if (configEducationLevel === "ALL") return true
      const gn = extractGradeNumber(g) || 1
      if (configEducationLevel === "PRIMARY") return gn >= 1 && gn <= 5
      if (configEducationLevel === "MIDDLE") return gn >= 6 && gn <= 9
      return gn >= 10 && gn <= 12
    })
  }, [configEducationLevel])

  // Đếm số cấu hình đã lưu theo từng Khối (cho các môn Song ngữ & Quốc tế + môn bổ sung)
  const gradeCountsForInternal = useMemo(() => {
    const map: Record<string, number> = {}
    const validConfigs = internalSavedConfigs.filter(c => {
      const grp = c.subject ? getSubjectCurriculumGroup(c.subject) : "BILINGUAL"
      return grp === "BILINGUAL" || (c.subjectId && customAddedSubjectIds.includes(c.subjectId))
    })
    GRADES.forEach(g => {
      map[g] = validConfigs.filter(c => isGradeMatching(c.grade, g)).length
    })
    map.ALL = validConfigs.length
    return map
  }, [internalSavedConfigs, customAddedSubjectIds])

  // Đếm số cấu hình đã lưu theo từng Kỳ trong Khối đang chọn
  const periodCountsForCurrentGrade = useMemo(() => {
    const validConfigs = internalSavedConfigs.filter(c => {
      const grp = c.subject ? getSubjectCurriculumGroup(c.subject) : "BILINGUAL"
      if (grp !== "BILINGUAL" && !(c.subjectId && customAddedSubjectIds.includes(c.subjectId))) return false
      if (configGrade !== "ALL" && !isGradeMatching(c.grade, configGrade)) return false
      return true
    })
    const counts: Record<string, number> = { ALL: validConfigs.length }
    EVAL_PERIODS.forEach(p => {
      counts[p.code] = validConfigs.filter(c => c.evaluationPeriod === p.code || c.evaluationPeriod === "ALL").length
    })
    return counts
  }, [internalSavedConfigs, customAddedSubjectIds, configGrade])

  // Dữ liệu các dòng Ma trận theo Khối & Kỳ cho mục 2. Đánh giá nội bộ Sky-Line
  const internalMatrixRows = useMemo(() => {
    const targetGrades =
      internalMatrixGradeScope === "CURRENT_GRADE" && configGrade !== "ALL"
        ? [configGrade]
        : gradesInSelectedEducationLevel
    const rows: Array<{
      rowKey: string
      subject: any
      gradeStr: string
      levelLabel: string
      configsByPeriod: Record<string, any | null>
      savedPeriodsCount: number
    }> = []

    targetGrades.forEach(gStr => {
      const gn = extractGradeNumber(gStr) || 1
      const lvlLabel = gn <= 5 ? "Tiểu học" : gn <= 9 ? "THCS" : "THPT"
      filteredInternalPickerSubjects.forEach(subj => {
        if (listSearchTerm.trim()) {
          const kw = listSearchTerm.toLowerCase().trim()
          const nMatch = String(subj.subjectName || "").toLowerCase().includes(kw)
          const cMatch = String(subj.subjectCode || "").toLowerCase().includes(kw)
          if (!nMatch && !cMatch) return
        }
        const configsByPeriod: Record<string, any | null> = {}
        let savedCount = 0
        EVAL_PERIODS.forEach(p => {
          const exact = internalSavedConfigs.find(
            c =>
              c.subjectId === subj.id &&
              isGradeMatching(c.grade, gStr) &&
              c.evaluationPeriod === p.code
          )
          const fallbackAllPeriod = !exact
            ? internalSavedConfigs.find(
                c =>
                  c.subjectId === subj.id &&
                  isGradeMatching(c.grade, gStr) &&
                  c.evaluationPeriod === "ALL"
              )
            : null
          const chosen = exact || fallbackAllPeriod || null
          configsByPeriod[p.code] = chosen
          if (chosen) savedCount += 1
        })
        // Chỉ hiện các môn được chọn ở mục 3 hoặc đã có cấu hình lưu ở Khối này
        const isExplicitlySelected =
          internalSelectedSubjectIds.includes(subj.id) ||
          (configSubjectId === subj.id && (configGrade === gStr || configGrade === "ALL"))
        if (savedCount === 0 && !isExplicitlySelected) {
          return
        }
        rows.push({
          rowKey: `${subj.id}__${gStr}`,
          subject: subj,
          gradeStr: gStr,
          levelLabel: lvlLabel,
          configsByPeriod,
          savedPeriodsCount: savedCount,
        })
      })
    })
    return rows
  }, [
    internalMatrixGradeScope,
    configGrade,
    configSubjectId,
    internalSelectedSubjectIds,
    gradesInSelectedEducationLevel,
    filteredInternalPickerSubjects,
    internalSavedConfigs,
    listSearchTerm,
  ])

  // Nhóm các cấu hình đã lưu theo từng Khối và sắp xếp theo thứ tự Kỳ (KSĐN -> GK1 -> CK1 -> GK2 -> CK2 -> CN)
  const groupedSavedConfigsByGrade = useMemo(() => {
    const periodOrder: Record<string, number> = {
      "KSĐN": 1,
      KSDN: 1,
      GK1: 2,
      CK1: 3,
      GK2: 4,
      CK2: 5,
      CN: 6,
      ALL: 0,
    }
    const groupsMap = new Map<string, any[]>()
    filteredSavedConfigs.forEach(cfg => {
      const gKey = cfg.grade && cfg.grade !== "ALL" ? cfg.grade : "Tất cả Khối"
      if (!groupsMap.has(gKey)) groupsMap.set(gKey, [])
      groupsMap.get(gKey)!.push(cfg)
    })
    const sortedEntries = Array.from(groupsMap.entries()).sort(([gA], [gB]) => {
      if (gA === "Tất cả Khối") return -1
      if (gB === "Tất cả Khối") return 1
      return (extractGradeNumber(gA) || 99) - (extractGradeNumber(gB) || 99)
    })
    return sortedEntries.map(([gradeLabel, items]) => ({
      gradeLabel,
      items: [...items].sort((a, b) => {
        const pDiff = (periodOrder[a.evaluationPeriod] ?? 9) - (periodOrder[b.evaluationPeriod] ?? 9)
        if (pDiff !== 0) return pDiff
        return String(a.subject?.subjectName || "").localeCompare(String(b.subject?.subjectName || ""), "vi")
      }),
    }))
  }, [filteredSavedConfigs])

  // Fetch saved configs
  const fetchConfigs = async () => {
    try {
      setLoadingConfigs(true)
      const res = await fetch(`/api/admin/ktdbcl/grade-configs?academicYearId=${selectedYearId}`)
      const data = await res.json()
      if (data.success) {
        const rawList = data.configs || []
        if (isSubjectScoped && subjects.length > 0) {
          const allowedSet = new Set(subjects.map((s: any) => s.id))
          setSavedConfigs(rawList.filter((c: any) => !c.subjectId || c.subjectId === "ALL" || allowedSet.has(c.subjectId)))
        } else {
          setSavedConfigs(rawList)
        }
      }
    } catch (err) {
      console.error("Lỗi tải danh sách cấu hình:", err)
    } finally {
      setLoadingConfigs(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [selectedYearId])

  // Auto fill form if a config already exists for selected Khối + Môn + Kỳ
  useEffect(() => {
    if (!internalSavedConfigs || internalSavedConfigs.length === 0) return
    const match = internalSavedConfigs.find(c => {
      const gMatch = isGradeMatching(c.grade, configGrade)
      const sMatch = (c.subjectId || "ALL") === configSubjectId
      const pMatch = (c.evaluationPeriod || "ALL") === configPeriod
      return gMatch && sMatch && pMatch
    })
    if (match) {
      let cols: string[] = []
      try {
        cols = typeof match.columnNames === "string" ? JSON.parse(match.columnNames) : match.columnNames || []
      } catch (_) {}
      if (cols.length > 0) {
        setColumnCount(cols.length)
        setColumnNames(cols)
        let types: string[] = []
        try { types = typeof match.columnTypes === "string" ? JSON.parse(match.columnTypes) : match.columnTypes || [] } catch (_) {}
        if (types.length > 0) setColumnTypes(types)

        const maxScores = parseMaxScores(match.columnMaxScores, cols.length)
        // Also extract from types if encoded as SCORE_MAX_
        types.forEach((t, idx) => {
          if (t && t.startsWith("SCORE_MAX_")) {
            maxScores[idx] = getColumnMaxScore(t)
          }
        })
        const syncedTypes = types.map((t, idx) => {
          if (t && t.startsWith("SCORE_MAX_")) return t
          if (t === "SCORE_CUSTOM" || t === "SCORE_CUSTOM_100" || (maxScores[idx] && maxScores[idx] !== 10 && maxScores[idx] !== 100)) {
            return `SCORE_MAX_${maxScores[idx]}`
          }
          if (t === "SCORE_1000") return "SCORE_100"
          return t || "SCORE_10"
        })
        setColumnTypes(syncedTypes)
        setColumnMaxScores(maxScores)
      }
      setHasComposite(match.hasCompositeColumn !== false)
      setCompositeColumnName(match.compositeColumnName || "Điểm thành phần")
      setFormulaType((match.formula || "AVERAGE").toUpperCase() as FormulaType)
      setFormulaCustom(match.formulaCustom || "")
      setRoundingRule((match.roundingRule || "ROUND_1") as RoundingRule)
      if (match.weights) {
        const parsedW = parseWeights(match.weights, cols.length || columnCount)
        setWeights(parsedW)
      }
      setHasRemark(match.hasRemarkColumn !== false)
    }
  }, [configGrade, configSubjectId, configPeriod, internalSavedConfigs])

  const handleSelectConfig = (cfg: any) => {
    setConfigGrade(cfg.grade || "ALL")
    setConfigSubjectId(cfg.subjectId || "ALL")
    if (cfg.subjectId && cfg.subjectId !== "ALL") {
      setInternalSelectedSubjectIds([cfg.subjectId])
    }
    setConfigPeriod(cfg.evaluationPeriod || "ALL")
    let cols: string[] = []
    try {
      cols = typeof cfg.columnNames === "string" ? JSON.parse(cfg.columnNames) : cfg.columnNames || []
    } catch (_) {}
    if (cols.length > 0) {
      setColumnCount(cols.length)
      setColumnNames(cols)
      let types: string[] = []
      try { types = typeof cfg.columnTypes === "string" ? JSON.parse(cfg.columnTypes) : cfg.columnTypes || [] } catch (_) {}
      if (types.length > 0) setColumnTypes(types)

      const maxScores = parseMaxScores(cfg.columnMaxScores, cols.length)
      types.forEach((t, idx) => {
        if (t && t.startsWith("SCORE_MAX_")) {
          maxScores[idx] = getColumnMaxScore(t)
        }
      })
      const syncedTypes = types.map((t, idx) => {
        if (t && t.startsWith("SCORE_MAX_")) return t
        if (t === "SCORE_CUSTOM" || t === "SCORE_CUSTOM_100" || (maxScores[idx] && maxScores[idx] !== 10 && maxScores[idx] !== 100)) {
          return `SCORE_MAX_${maxScores[idx]}`
        }
        if (t === "SCORE_1000") return "SCORE_100"
        return t || "SCORE_10"
      })
      setColumnTypes(syncedTypes)
      setColumnMaxScores(maxScores)
    }
    setHasComposite(cfg.hasCompositeColumn !== false)
    setCompositeColumnName(cfg.compositeColumnName || "Điểm thành phần")
    setFormulaType((cfg.formula || "AVERAGE").toUpperCase() as FormulaType)
    setFormulaCustom(cfg.formulaCustom || "")
    setRoundingRule((cfg.roundingRule || "ROUND_1") as RoundingRule)
    if (cfg.weights) {
      const parsedW = parseWeights(cfg.weights, cols.length || columnCount)
      setWeights(parsedW)
    }
    setHasRemark(cfg.hasRemarkColumn !== false)
  }

  const handleDeleteConfig = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa mẫu cấu hình này?")) return
    try {
      const res = await fetch(`/api/admin/ktdbcl/grade-configs?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        setSelectedInternalConfigIds(prev => prev.filter(item => item !== id))
        alert("Đã xóa cấu hình mẫu!")
        fetchConfigs()
      } else {
        alert("Lỗi: " + (data.error || "Không thể xóa"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    }
  }

  const handleBulkDeleteInternalConfigs = async () => {
    if (selectedInternalConfigIds.length === 0) return
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedInternalConfigIds.length} cấu hình Đánh giá nội bộ đã chọn?`)) return
    try {
      const res = await fetch("/api/admin/ktdbcl/grade-configs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedInternalConfigIds }),
      })
      const data = await res.json()
      if (data.success) {
        setSelectedInternalConfigIds([])
        fetchConfigs()
      } else {
        alert("Lỗi: " + (data.error || "Không thể xóa các cấu hình đã chọn"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    }
  }

  const handleOpenInternalGradebookForConfig = (cfg: any) => {
    setGradebookSourceMode("INTERNAL")
    if (cfg.evaluationPeriod && cfg.evaluationPeriod !== "ALL") {
      setSelectedPeriod(cfg.evaluationPeriod)
    }
    if (cfg.grade && cfg.grade !== "ALL") {
      setSelectedGradeFilter(cfg.grade)
      const matchingClass = classes.find(c => isGradeMatching(c.grade || c.className, cfg.grade))
      if (matchingClass) setSelectedClassId(matchingClass.id)
    }
    if (cfg.subjectId && cfg.subjectId !== "ALL") {
      setSelectedSubjectId(cfg.subjectId)
    }
    setActiveTab("grades")
  }

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true)
      const finalMaxScores = columnNames.map((_, i) => {
        const cType = columnTypes[i] || "SCORE_10"
        return getColumnMaxScore(cType, columnMaxScores, i)
      })
      const finalColumnTypes = columnTypes.map((t, i) => {
        const isCustom = t === "SCORE_CUSTOM" || t === "SCORE_CUSTOM_100" || (t && t.startsWith("SCORE_MAX_"))
        if (isCustom) {
          const maxVal = finalMaxScores[i] || 10
          return `SCORE_MAX_${maxVal}`
        }
        if (t === "SCORE_1000") return "SCORE_100"
        return t || "SCORE_10"
      })

      setColumnMaxScores(finalMaxScores)
      setColumnTypes(finalColumnTypes)

      const targetSubjIds =
        internalSelectedSubjectIds.length > 0
          ? internalSelectedSubjectIds
          : configSubjectId && configSubjectId !== "ALL"
          ? [configSubjectId]
          : []

      const payload: Record<string, any> = {
        academicYearId: selectedYearId,
        grade: configGrade,
        evaluationPeriod: configPeriod,
        configType: "INTERNAL",
        columnCount,
        columnNames,
        columnTypes: finalColumnTypes,
        columnMaxScores: finalMaxScores,
        hasCompositeColumn: hasComposite,
        compositeColumnName,
        hasRemarkColumn: hasRemark,
        formula: formulaType,
        formulaCustom,
        weights,
        roundingRule,
      }

      if (targetSubjIds.length > 1) {
        payload.batchSubjectIds = targetSubjIds
      } else if (targetSubjIds.length === 1) {
        payload.subjectId = targetSubjIds[0]
      } else {
        payload.subjectId = null
      }

      const res = await fetch("/api/admin/ktdbcl/grade-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data.success) {
        alert(
          targetSubjIds.length > 1
            ? `Đã lưu cấu hình Đánh giá nội bộ Sky-Line cho ${targetSubjIds.length} môn (${configGrade} • ${configPeriod})!`
            : "Đã lưu cấu hình cột điểm và công thức Đánh giá nội bộ Sky-Line thành công!"
        )
        fetchConfigs()
      } else {
        alert("Lỗi: " + (data.error || "Không thể lưu cấu hình"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setSavingConfig(false)
    }
  }

  const handleSaveConfigForAllMainPeriods = async () => {
    try {
      setSavingConfig(true)
      const finalMaxScores = columnNames.map((_, i) => {
        const cType = columnTypes[i] || "SCORE_10"
        return getColumnMaxScore(cType, columnMaxScores, i)
      })
      const finalColumnTypes = columnTypes.map((t, i) => {
        const isCustom = t === "SCORE_CUSTOM" || t === "SCORE_CUSTOM_100" || (t && t.startsWith("SCORE_MAX_"))
        if (isCustom) {
          const maxVal = finalMaxScores[i] || 10
          return `SCORE_MAX_${maxVal}`
        }
        if (t === "SCORE_1000") return "SCORE_100"
        return t || "SCORE_10"
      })

      const targetSubjIds =
        internalSelectedSubjectIds.length > 0
          ? internalSelectedSubjectIds
          : configSubjectId && configSubjectId !== "ALL"
          ? [configSubjectId]
          : []

      const periodsToSave = ["GK1", "CK1", "GK2", "CK2"]
      for (const pCode of periodsToSave) {
        const payload: Record<string, any> = {
          academicYearId: selectedYearId,
          grade: configGrade,
          evaluationPeriod: pCode,
          configType: "INTERNAL",
          columnCount,
          columnNames,
          columnTypes: finalColumnTypes,
          columnMaxScores: finalMaxScores,
          hasCompositeColumn: hasComposite,
          compositeColumnName,
          hasRemarkColumn: hasRemark,
          formula: formulaType,
          formulaCustom,
          weights,
          roundingRule,
        }
        if (targetSubjIds.length > 1) {
          payload.batchSubjectIds = targetSubjIds
        } else if (targetSubjIds.length === 1) {
          payload.subjectId = targetSubjIds[0]
        } else {
          payload.subjectId = null
        }
        await fetch("/api/admin/ktdbcl/grade-configs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
      alert(
        `Đã lưu & áp dụng cấu hình Sổ điểm riêng đồng loạt cho cả 4 kỳ (GK1, CK1, GK2, CK2) — ${configGrade}!`
      )
      fetchConfigs()
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setSavingConfig(false)
    }
  }

  // --- TAB 2: Grade Entry states ---
  const [selectedCampusId, setSelectedCampusId] = useState("ALL")
  const [selectedLevelFilter, setSelectedLevelFilter] = useState("ALL")
  const [selectedGradeFilter, setSelectedGradeFilter] = useState("ALL")
  const [selectedSystemFilter, setSelectedSystemFilter] = useState("ALL")
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || "")
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || "")
  const [selectedPeriod, setSelectedPeriod] = useState("CK1")
  const [termTabSemester, setTermTabSemester] = useState<"HK1" | "HK2" | "CN">("HK1")
  const [assignedTeacher, setAssignedTeacher] = useState("")

  // Xác định Học kỳ đang chọn (1 = HK1, 2 = HK2) đồng bộ giữa Header, Tab Nhập điểm và Tab Điểm tổng kết
  const activeSemester: 1 | 2 = useMemo(() => {
    if (activeTab === "term-grades") {
      return termTabSemester === "HK1" ? 1 : 2
    }
    const p = String(activeTab === "config" ? configPeriod : selectedPeriod).toUpperCase().trim()
    if (p === "GK2" || p === "CK2" || p === "HK2" || p === "CN") return 2
    return 1
  }, [activeTab, selectedPeriod, configPeriod, termTabSemester])

  const handleSelectSemester = (sem: 1 | 2) => {
    if (sem === 1) {
      setSelectedPeriod((prev) => (prev === "GK2" ? "GK1" : "CK1"))
      setConfigPeriod((prev) => (prev === "GK2" ? "GK1" : "CK1"))
      setTermTabSemester("HK1")
    } else {
      setSelectedPeriod((prev) => (prev === "GK1" ? "GK2" : "CK2"))
      setConfigPeriod((prev) => (prev === "GK1" ? "GK2" : "CK2"))
      setTermTabSemester("HK2")
    }
  }

  const savePeriodMeta = useMemo(() => {
    const p = String(selectedPeriod || "CK1").toUpperCase().trim()
    if (p === "GK1") return { short: "HK1 (GK1)", full: "Học kỳ 1 (Giữa kỳ 1)", semLabel: "HK1" }
    if (p === "CK1" || p === "HK1") return { short: "HK1 (CK1)", full: "Học kỳ 1 (Cuối kỳ 1)", semLabel: "HK1" }
    if (p === "GK2") return { short: "HK2 (GK2)", full: "Học kỳ 2 (Giữa kỳ 2)", semLabel: "HK2" }
    if (p === "CK2" || p === "HK2") return { short: "HK2 (CK2)", full: "Học kỳ 2 (Cuối kỳ 2)", semLabel: "HK2" }
    if (p === "CN") return { short: "Cả năm (CN)", full: "Cả năm (CN)", semLabel: "CN" }
    if (p === "KSĐN" || p === "KSDN") return { short: "HK1 (KSĐN)", full: "Học kỳ 1 (Khảo sát đầu năm)", semLabel: "KSĐN" }
    return { short: p, full: p, semLabel: p }
  }, [selectedPeriod])

  // Modal Nhập nhận xét theo khoảng điểm
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false)
  // Modal Xuất Excel Đa Sheet theo Kỳ khảo sát
  const [isBulkExportModalOpen, setIsBulkExportModalOpen] = useState(false)
  const [commentTemplates, setCommentTemplates] = useState({
    good: "Nắm vững kiến thức, phát biểu tích cực, làm bài tốt",
    fair: "Có ý thức học tập, tiếp thu bài tốt, cần rèn luyện thêm bài tập nâng cao",
    average: "Có cố gắng, cần tập trung hơn trong giờ học và ôn lại kiến thức cơ bản",
    poor: "Hổng kiến thức cơ bản, cần bám sát phụ đạo và rèn luyện thêm"
  })

  const educationSystemOptions = useMemo(() => {
    const set = new Set<string>()
    classes.forEach(c => {
      if (c.educationSystem && c.educationSystem.trim()) {
        set.add(c.educationSystem.trim())
      }
    })
    return Array.from(set).sort()
  }, [classes])

  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      if (selectedCampusId !== "ALL" && c.campusId !== selectedCampusId) {
        return false
      }
      if (selectedLevelFilter !== "ALL") {
        const cLevel = (c.level || "").toLowerCase()
        const cGrade = (c.grade || "").toLowerCase()
        const cName = (c.className || "").toLowerCase()

        const numMatch = cName.match(/^(\d+)/)
        const gradeNum = numMatch ? parseInt(numMatch[1], 10) : (parseInt(cGrade.replace(/\D/g, ""), 10) || null)

        if (selectedLevelFilter === "TieuHoc") {
          const isMatch = gradeNum !== null ? (gradeNum >= 1 && gradeNum <= 5) : (cLevel.includes("tiểu học") || cLevel.includes("tieu hoc"))
          if (!isMatch) return false
        } else if (selectedLevelFilter === "THCS") {
          const isMatch = gradeNum !== null ? (gradeNum >= 6 && gradeNum <= 9) : (cLevel.includes("thcs") || cLevel.includes("trung học cơ sở"))
          if (!isMatch) return false
        } else if (selectedLevelFilter === "THPT") {
          const isMatch = gradeNum !== null ? (gradeNum >= 10 && gradeNum <= 12) : (cLevel.includes("thpt") || cLevel.includes("trung học phổ thông") || cLevel.includes("cấp 3"))
          if (!isMatch) return false
        } else if (selectedLevelFilter === "MamNon") {
          const isMatch = gradeNum === null && (cLevel.includes("mầm non") || cLevel.includes("mam non") || cLevel.includes("nhà trẻ") || cLevel.includes("mẫu giáo"))
          if (!isMatch) return false
        }
      }

      if (selectedGradeFilter !== "ALL") {
        const targetNum = selectedGradeFilter.replace(/\D/g, "")
        const cGrade = (c.grade || "").trim()
        const cName = (c.className || "").trim()
        const cGradeNum = cGrade.replace(/\D/g, "")
        const cNameNum = (cName.match(/^(\d+)/) || [])[1] || ""

        const isMatch = cGrade === selectedGradeFilter || (targetNum && (cGradeNum === targetNum || cNameNum === targetNum))
        if (!isMatch) return false
      }

      if (selectedSystemFilter !== "ALL") {
        const cSys = (c.educationSystem || "").trim().toLowerCase()
        const targetSys = selectedSystemFilter.trim().toLowerCase()
        if (cSys !== targetSys && !cSys.includes(targetSys)) return false
      }

      return true
    })
  }, [classes, selectedLevelFilter, selectedGradeFilter, selectedSystemFilter, selectedCampusId])

  useEffect(() => {
    if (filteredClasses.length > 0 && !filteredClasses.some(c => c.id === selectedClassId)) {
      setSelectedClassId(filteredClasses[0].id)
    }
  }, [filteredClasses, selectedClassId])

  // Sync state with search params (e.g. from redirect or external link)
  useEffect(() => {
    const tab = searchParams?.get("tab")
    if (tab === "grades" || tab === "config") {
      setActiveTab(tab)
    } else if (tab === "analytics") {
      router.replace(`/admin/ktdbcl/phan-tich-thkq?report=teacher-test-quality`)
    } else if (tab === "progress") {
      router.replace(`/admin/ktdbcl/giam-sat-tien-do?tab=entry-status`)
    } else if (tab === "requests" || tab === "feedback") {
      router.replace(`/admin/ktdbcl/thong-ke-bao-cao?tab=${tab}`)
    }
    const cId = searchParams?.get("campusId")
    if (cId) setSelectedCampusId(cId)
    const gr = searchParams?.get("grade")
    if (gr) setSelectedGradeFilter(gr)
    const clId = searchParams?.get("classId")
    if (clId) setSelectedClassId(clId)
    const subId = searchParams?.get("subjectId")
    if (subId) setSelectedSubjectId(subId)
    const pr = searchParams?.get("period")
    if (pr) setSelectedPeriod(pr)
    const cfgType = searchParams?.get("configType")
    if (cfgType === "VNEDU" || cfgType === "INTERNAL") {
      setGradebookSourceMode(cfgType)
    }
  }, [searchParams])

  const [loadingSheet, setLoadingSheet] = useState(false)
  const [savingEntries, setSavingEntries] = useState(false)
  const [configModeTab, setConfigModeTab] = useState<"VNEDU" | "INTERNAL">("VNEDU")
  const [gradebookSourceMode, setGradebookSourceMode] = useState<"VNEDU" | "INTERNAL">("VNEDU")
  const [gradebookSearch, setGradebookSearch] = useState("")
  const [isVnEduImportOpen, setIsVnEduImportOpen] = useState(false)
  const [pendingVnEduFiles, setPendingVnEduFiles] = useState<File[]>([])
  const [editingVnEduStudentId, setEditingVnEduStudentId] = useState<string | null>(null)
  const [tempVnEduCode, setTempVnEduCode] = useState("")
  const [savingVnEduCode, setSavingVnEduCode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSaveInlineVnEduCode = async (student: any) => {
    if (!selectedClassId || !student?.id) return
    try {
      setSavingVnEduCode(true)
      const res = await updateStudentVnEduCodeAction(
        selectedClassId,
        student.id,
        student.studentCode,
        tempVnEduCode
      )
      if (res.success) {
        setGradeSheetData(prev => ({
          ...prev,
          students: prev.students.map(s =>
            s.id === student.id ? { ...s, vnEduCode: res.vnEduCode } : s
          ),
        }))
        setEditingVnEduStudentId(null)
      } else {
        alert("Lỗi cập nhật Mã vnEdu: " + ((res as any).error || "Không rõ nguyên nhân"))
      }
    } catch (err: any) {
      alert("Lỗi cập nhật Mã vnEdu: " + (err?.message || "Không rõ nguyên nhân"))
    } finally {
      setSavingVnEduCode(false)
    }
  }

  // Kỳ Khảo sát đầu năm (KSĐN) và các môn Song ngữ Quốc tế (BILINGUAL) luôn dùng Sổ điểm riêng tại "2. Đánh giá nội bộ Sky-Line" (INTERNAL)
  const isKsdnSelected = selectedPeriod === "KSĐN" || selectedPeriod === "KSDN"
  const selectedSubjectObjForTab2 = useMemo(
    () => localSubjects.find(s => s.id === selectedSubjectId) || null,
    [localSubjects, selectedSubjectId]
  )
  const isSelectedSubjectInternalOnly = useMemo(() => {
    if (!selectedSubjectObjForTab2) return false
    const grp = getSubjectCurriculumGroup(selectedSubjectObjForTab2)
    return grp === "BILINGUAL"
  }, [selectedSubjectObjForTab2])

  const effectiveGradebookSourceMode: "VNEDU" | "INTERNAL" =
    isKsdnSelected || isSelectedSubjectInternalOnly ? "INTERNAL" : gradebookSourceMode

  // Khi đang ở các kỳ học kỳ (GK1, CK1, GK2, CK2, CN) và chọn một môn thuộc Bộ GD&ĐT (MOET như Tiếng Anh, Toán, Ngữ Văn, KHTN, Lịch sử & Địa lí...),
  // tự động chuyển về "1. Sổ điểm theo vnEdu (Môn Bộ GD&ĐT)" để hiển thị đúng mẫu sổ điểm vnEdu đã cấu hình.
  useEffect(() => {
    if (!isKsdnSelected && selectedSubjectObjForTab2) {
      const grp = getSubjectCurriculumGroup(selectedSubjectObjForTab2)
      if (grp === "MOET" && gradebookSourceMode !== "VNEDU") {
        setGradebookSourceMode("VNEDU")
      }
    }
  }, [selectedSubjectId, selectedPeriod, isKsdnSelected, selectedSubjectObjForTab2])

  // Available subjects for Tab 2 (Quản lý & Nhập Sổ điểm)
  // - Chế độ "1. Sổ điểm theo vnEdu": chỉ hiển thị các môn Bộ GD&ĐT (MOET)
  // - Chế độ "2. Đánh giá nội bộ Sky-Line": hiển thị các môn Song ngữ & Quốc tế (BILINGUAL) + môn tùy chọn bổ sung (riêng kỳ KSĐN hiển thị các môn khảo sát đầu năm)
  const availableSubjectsForTab2 = useMemo(() => {
    const currentClass = classes.find(c => c.id === selectedClassId)
    const targetGrade = currentClass?.grade || currentClass?.className || selectedGradeFilter
    const isTargetGrade6 = isGradeMatching("Khối 6", targetGrade)
    const isTargetGrade5 = isGradeMatching("Khối 5", targetGrade)

    const assignedSubjectIds = new Set<string>()
    if (isKsdnSelected && (isTargetGrade6 || isTargetGrade5)) {
      savedConfigs.forEach(c => {
        if (c.isActive === false || !c.subjectId || c.subjectId === "ALL") return
        if (isGradeMatching(c.grade, "Khối 5")) {
          if (
            c.evaluationPeriod === "KSĐN" ||
            c.evaluationPeriod === "KSDN" ||
            c.evaluationPeriod === "ALL" ||
            (c.configType || "INTERNAL") === "INTERNAL"
          ) {
            assignedSubjectIds.add(c.subjectId)
          }
        }
      })
      internalSavedConfigs.forEach(c => {
        if (!c.subjectId || c.subjectId === "ALL") return
        const pMatch = c.evaluationPeriod === selectedPeriod || c.evaluationPeriod === "ALL"
        const gMatch = isGradeMatching(c.grade, targetGrade)
        if (pMatch && gMatch) {
          const subjObj = localSubjects.find(s => s.id === c.subjectId)
          const isPrimaryCompatible =
            !subjObj ||
            String(subjObj.level || "ALL").toUpperCase().includes("PRIMARY") ||
            String(subjObj.level || "ALL").toUpperCase() === "ALL"
          if (!isTargetGrade6 || isPrimaryCompatible) {
            assignedSubjectIds.add(c.subjectId)
          }
        }
      })
    } else if (gradebookSourceMode === "INTERNAL" || isKsdnSelected) {
      // Chế độ "2. Đánh giá nội bộ Sky-Line": hiển thị các môn Song ngữ & Quốc tế (BILINGUAL) + các môn tùy chọn bổ sung
      if (isKsdnSelected) {
        internalSavedConfigs.forEach(c => {
          if (c.isActive === false || !c.subjectId || c.subjectId === "ALL") return
          const pMatch = c.evaluationPeriod === selectedPeriod || c.evaluationPeriod === "ALL"
          const gMatch = isGradeMatching(c.grade, targetGrade)
          if (pMatch && gMatch) {
            assignedSubjectIds.add(c.subjectId)
          }
        })
      }
      localSubjects.forEach(s => {
        const grp = getSubjectCurriculumGroup(s)
        if (grp === "BILINGUAL" || customAddedSubjectIds.includes(s.id)) {
          assignedSubjectIds.add(s.id)
        }
      })
    } else {
      // Chế độ "1. Sổ điểm theo vnEdu": chỉ lấy các môn Bộ GD&ĐT (MOET)
      savedConfigs.forEach(c => {
        if (c.isActive === false) return
        const cfgType = c.configType || "INTERNAL"
        if (cfgType !== "VNEDU") return
        const pMatch = c.evaluationPeriod === selectedPeriod || c.evaluationPeriod === "ALL"
        const gMatch = isGradeMatching(c.grade, targetGrade)
        if (pMatch && gMatch && c.subjectId && c.subjectId !== "ALL") {
          const subjObj = localSubjects.find(s => s.id === c.subjectId)
          if (!subjObj || getSubjectCurriculumGroup(subjObj) === "MOET") {
            assignedSubjectIds.add(c.subjectId)
          }
        }
      })
    }

    if (assignedSubjectIds.size > 0) {
      return localSubjects.filter(s => assignedSubjectIds.has(s.id))
    }
    return []
  }, [savedConfigs, internalSavedConfigs, selectedPeriod, isKsdnSelected, gradebookSourceMode, selectedClassId, selectedGradeFilter, classes, localSubjects, customAddedSubjectIds])

  // Subjects assigned specifically to this class via teaching assignments
  const classAssignedSubjects = useMemo(() => {
    const currentClass = classes.find(c => c.id === selectedClassId)
    if (!currentClass?.teachingAssignments || currentClass.teachingAssignments.length === 0) return []
    const subIds = new Set<string>(currentClass.teachingAssignments.map((ta: any) => ta.subjectId))
    return subjects.filter(s => subIds.has(s.id))
  }, [classes, selectedClassId, subjects])

  // Auto sync selectedSubjectId in Tab 2
  useEffect(() => {
    if (activeTab === "grades") {
      if (availableSubjectsForTab2.length > 0) {
        if (!availableSubjectsForTab2.some(s => s.id === selectedSubjectId)) {
          setSelectedSubjectId(availableSubjectsForTab2[0].id)
        }
      } else if (classAssignedSubjects.length > 0) {
        if (!classAssignedSubjects.some(s => s.id === selectedSubjectId)) {
          setSelectedSubjectId(classAssignedSubjects[0].id)
        }
      } else if (subjects.length > 0) {
        if (!subjects.some(s => s.id === selectedSubjectId)) {
          setSelectedSubjectId(subjects[0].id)
        }
      }
    }
  }, [activeTab, availableSubjectsForTab2, classAssignedSubjects, selectedSubjectId, subjects])

  const [gradeSheetData, setGradeSheetData] = useState<{
    config: any
    students: any[]
    entries: Record<string, { componentScores: Record<string, string>; compositeScore: string; ratingValue?: string; remark: string }>
  }>({
    config: null,
    students: [],
    entries: {}
  })

  const fetchGradeSheet = async () => {
    if (!selectedClassId || !selectedSubjectId) return
    try {
      setLoadingSheet(true)
      const res = await fetch(
        `/api/teacher/grade-entries?academicYearId=${selectedYearId}&classId=${selectedClassId}&subjectId=${selectedSubjectId}&evaluationPeriod=${selectedPeriod}&configType=${effectiveGradebookSourceMode}&isManage=true`
      )
      const data = await res.json()
      if (data.success) {
        const entryDict: Record<string, { componentScores: Record<string, string>; compositeScore: string; ratingValue?: string; remark: string }> = {}
        if (Array.isArray(data.entries)) {
          data.entries.forEach((e: any) => {
            let parsedComp: Record<string, string> = {}
            if (e.componentScores) {
              try {
                parsedComp = typeof e.componentScores === "string" ? JSON.parse(e.componentScores) : e.componentScores
              } catch (_) {}
            }
            entryDict[e.studentId] = {
              componentScores: parsedComp,
              compositeScore: e.compositeScore !== null && e.compositeScore !== undefined ? String(e.compositeScore) : "",
              ratingValue: e.ratingValue || "",
              remark: e.remark || ""
            }
          })
        }
        setGradeSheetData({
          config: data.config,
          students: data.students || [],
          entries: entryDict
        })
        if (data.assignedTeacher) {
          setAssignedTeacher(data.assignedTeacher)
        }
      }
    } catch (err) {
      console.error("Lỗi tải bảng điểm:", err)
    } finally {
      setLoadingSheet(false)
    }
  }

  useEffect(() => {
    if (activeTab === "grades") {
      fetchGradeSheet()
    }
  }, [activeTab, selectedClassId, selectedSubjectId, selectedPeriod, selectedYearId, effectiveGradebookSourceMode])

  const activeColNames = useMemo(() => {
    if (!gradeSheetData.config) return ["Cột 1", "Cột 2", "Cột 3"]
    try {
      return typeof gradeSheetData.config.columnNames === "string"
        ? JSON.parse(gradeSheetData.config.columnNames)
        : gradeSheetData.config.columnNames || ["Cột 1"]
    } catch (_) {
      return ["Cột 1"]
    }
  }, [gradeSheetData.config])

  const activeColTypes = useMemo(() => {
    if (!gradeSheetData.config) return activeColNames.map(() => "SCORE_10")
    try {
      return typeof gradeSheetData.config.columnTypes === "string"
        ? JSON.parse(gradeSheetData.config.columnTypes)
        : gradeSheetData.config.columnTypes || activeColNames.map(() => "SCORE_10")
    } catch (_) {
      return activeColNames.map(() => "SCORE_10")
    }
  }, [gradeSheetData.config, activeColNames])

  const handleScoreChange = (studentId: string, colIndex: number, val: string) => {
    setGradeSheetData(prev => {
      const studentEntry = prev.entries[studentId] || { componentScores: {}, compositeScore: "", remark: "" }
      const newCompScores = { ...studentEntry.componentScores, [`col${colIndex}`]: val }

      let computedComposite = studentEntry.compositeScore
      if (prev.config?.hasCompositeColumn !== false) {
        computedComposite = calculateCompositeScore(newCompScores, prev.config, activeColNames.length)
      }

      return {
        ...prev,
        entries: {
          ...prev.entries,
          [studentId]: {
            ...studentEntry,
            componentScores: newCompScores,
            compositeScore: computedComposite
          }
        }
      }
    })
  }

  const handleRemarkChange = (studentId: string, val: string) => {
    setGradeSheetData(prev => {
      const studentEntry = prev.entries[studentId] || { componentScores: {}, compositeScore: "", remark: "" }
      return {
        ...prev,
        entries: {
          ...prev.entries,
          [studentId]: {
            ...studentEntry,
            remark: val
          }
        }
      }
    })
  }

  const handleRatingChange = (studentId: string, val: string) => {
    setGradeSheetData(prev => {
      const existing = prev.entries[studentId] || { componentScores: {}, compositeScore: "", ratingValue: "", remark: "" }
      return {
        ...prev,
        entries: {
          ...prev.entries,
          [studentId]: { ...existing, ratingValue: val }
        }
      }
    })
  }

  const handleSaveGradeSheet = async () => {
    try {
      setSavingEntries(true)
      const entriesList = Object.entries(gradeSheetData.entries).map(([studentId, data]: [string, any]) => ({
        studentId,
        componentScores: data.componentScores,
        compositeScore: data.compositeScore,
        ratingValue: data.ratingValue || null,
        remark: data.remark
      }))

      const res = await fetch("/api/teacher/grade-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          evaluationPeriod: selectedPeriod,
          configType: effectiveGradebookSourceMode,
          configId: gradeSheetData.config?.id || null,
          configVersion: gradeSheetData.config?.version || null,
          entries: entriesList
        })
      })
      const data = await res.json()
      if (data.success) {
        alert(`Đã lưu sổ điểm ${savePeriodMeta.full} thành công!`)
      } else {
        alert("Lỗi: " + (data.error || "Không thể lưu điểm"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setSavingEntries(false)
    }
  }

  // Định dạng ngày sinh dd/MM/yyyy
  const formatDob = (dob: any) => {
    if (!dob) return "-"
    try {
      const d = new Date(dob)
      if (isNaN(d.getTime())) return "-"
      const day = String(d.getDate()).padStart(2, "0")
      const month = String(d.getMonth() + 1).padStart(2, "0")
      const year = d.getFullYear()
      return `${day}/${month}/${year}`
    } catch (_) {
      return "-"
    }
  }

  // Điều hướng bàn phím chuẩn Excel (Enter / Mũi tên nhảy dòng)
  const handleScoreKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, sIdx: number, cIdx: number) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault()
      const nextInput = document.querySelector<HTMLInputElement>(`input[data-row="${sIdx + 1}"][data-col="${cIdx}"]`)
      if (nextInput) {
        nextInput.focus()
        nextInput.select()
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const prevInput = document.querySelector<HTMLInputElement>(`input[data-row="${sIdx - 1}"][data-col="${cIdx}"]`)
      if (prevInput) {
        prevInput.focus()
        prevInput.select()
      }
    }
  }

  // Áp dụng nhận xét tự động theo khoảng điểm
  const handleApplyBulkComments = () => {
    setGradeSheetData(prev => {
      const updatedEntries = { ...prev.entries }
      prev.students.forEach(st => {
        const entry = updatedEntries[st.id] || { componentScores: {}, compositeScore: "", remark: "" }
        const compVal = Number(entry.compositeScore)
        let autoRemark = ""
        if (entry.compositeScore !== "" && !isNaN(compVal)) {
          if (compVal >= 8.0) autoRemark = commentTemplates.good
          else if (compVal >= 6.5) autoRemark = commentTemplates.fair
          else if (compVal >= 5.0) autoRemark = commentTemplates.average
          else autoRemark = commentTemplates.poor
        }
        if (autoRemark) {
          updatedEntries[st.id] = { ...entry, remark: autoRemark }
        }
      })
      return { ...prev, entries: updatedEntries }
    })
    setIsCommentModalOpen(false)
  }

  // Thống kê nhanh chân bảng Sổ điểm
  const gradeSheetStats = useMemo(() => {
    let graded = 0
    let sum = 0
    let pass = 0
    const total = gradeSheetData.students.length
    gradeSheetData.students.forEach(st => {
      const entry = gradeSheetData.entries[st.id]
      const scoreNum = entry?.compositeScore !== "" && entry?.compositeScore !== undefined ? Number(entry.compositeScore) : NaN
      if (!isNaN(scoreNum)) {
        graded++
        sum += scoreNum
        if (scoreNum >= 5.0) pass++
      }
    })
    return {
      total,
      graded,
      avgScore: graded > 0 ? (sum / graded).toFixed(1) : "-",
      passRate: graded > 0 ? Math.round((pass / graded) * 100) : 0
    }
  }, [gradeSheetData.students, gradeSheetData.entries])

  const handleExportExcel = () => {
    const currentClass = classes.find(c => c.id === selectedClassId)
    const currentSubject = subjects.find(s => s.id === selectedSubjectId)
    const isPrimary = isPrimaryGrade(currentClass?.grade || currentClass?.className || selectedGradeFilter)

    if (isPrimary && effectiveGradebookSourceMode === "VNEDU") {
      const meta = getPrimaryPeriodMeta(selectedPeriod)
      const hasKt =
        gradeSheetData.config && typeof gradeSheetData.config.columnCount === "number"
          ? gradeSheetData.config.columnCount > 0
          : shouldPrimarySubjectHaveKtColumn(
              currentSubject?.subjectName || currentSubject?.subjectCode,
              currentClass?.grade || currentClass?.className,
              selectedPeriod
            )

      const headers = ["STT", "Mã HS", "Mã vnEdu", "Họ và tên đệm", "Tên", "Ngày sinh", meta.remarkColumnLabel]
      if (hasKt) headers.push(meta.ktColumnLabel)
      headers.push(meta.xlColumnLabel)

      const rows = gradeSheetData.students.map((st, idx) => {
        const entry = gradeSheetData.entries[st.id] || { componentScores: {}, compositeScore: "", ratingValue: "", remark: "" }
        const cleanName = String(st.studentName || "").trim().replace(/\s+/g, " ")
        const lastSpace = cleanName.lastIndexOf(" ")
        const lastName = lastSpace === -1 ? "" : cleanName.slice(0, lastSpace)
        const firstName = lastSpace === -1 ? cleanName : cleanName.slice(lastSpace + 1)

        const rowData: any[] = [
          idx + 1,
          st.studentCode || "",
          st.vnEduCode || "",
          lastName,
          firstName,
          formatDob(st.dateOfBirth),
          entry.remark || "",
        ]
        if (hasKt) {
          rowData.push(entry.componentScores?.col0 ?? "")
        }
        rowData.push(entry.ratingValue || "")
        return rowData
      })

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "SoNhanXet_TieuHoc")

      const fileName = `SoNhanXet_vnEdu_${currentClass?.className || "Lop"}_${currentSubject?.subjectCode || "Mon"}_${selectedPeriod}.xlsx`
      XLSX.writeFile(workbook, fileName)
      return
    }

    if (!isPrimary && gradebookSourceMode === "VNEDU") {
      const headers = [
        "STT",
        "Mã HS",
        "Mã vnEdu",
        "Họ và tên đệm",
        "Tên",
        "Ngày sinh",
        "TX1",
        "TX2",
        "TX3",
        "TX4",
        "ĐĐGgk",
        "ĐĐGck",
        "ĐTBmhk",
        "Nhận xét",
      ]
      const isCommentSubj = isTt22CommentOnlySubject(currentSubject?.subjectName || currentSubject?.subjectCode)

      const rows = gradeSheetData.students.map((st, idx) => {
        const entry = gradeSheetData.entries[st.id] || { componentScores: {}, compositeScore: "", ratingValue: "", remark: "" }
        const comp = entry.componentScores || {}
        const cleanName = String(st.studentName || "").trim().replace(/\s+/g, " ")
        const lastSpace = cleanName.lastIndexOf(" ")
        const lastName = lastSpace === -1 ? "" : cleanName.slice(0, lastSpace)
        const firstName = lastSpace === -1 ? cleanName : cleanName.slice(lastSpace + 1)

        return [
          idx + 1,
          st.studentCode || "",
          st.vnEduCode || "",
          lastName,
          firstName,
          formatDob(st.dateOfBirth),
          comp.tx1 ?? comp.col0 ?? "",
          comp.tx2 ?? comp.col1 ?? "",
          comp.tx3 ?? comp.col2 ?? "",
          comp.tx4 ?? comp.col3 ?? "",
          comp.gk ?? comp.col4 ?? "",
          comp.ck ?? comp.col5 ?? "",
          isCommentSubj ? (entry.ratingValue || entry.compositeScore || "") : (entry.compositeScore || ""),
          entry.remark || "",
        ]
      })

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "SoDiem_TT22")

      const fileName = `SoDiem_vnEdu_TT22_${currentClass?.className || "Lop"}_${currentSubject?.subjectCode || "Mon"}_${selectedPeriod}.xlsx`
      XLSX.writeFile(workbook, fileName)
      return
    }

    const compColTitle = gradeSheetData.config?.compositeColumnName || "Điểm thành phần"

    const headers = ["STT", "Mã HS", "Họ tên", "Môn học"]
    activeColNames.forEach((colName: string, i: number) => {
      const cType = activeColTypes[i] || "SCORE_10"
      const colMax = getColumnMaxScore(cType, gradeSheetData.config?.columnMaxScores, i)
      headers.push(colMax !== 10 ? `${colName} (Tối đa ${colMax}đ)` : colName)
    })
    if (gradeSheetData.config?.hasCompositeColumn !== false) headers.push(compColTitle)
    if (gradeSheetData.config?.hasRemarkColumn !== false) headers.push("Nhận xét")

    const rows = gradeSheetData.students.map((st, idx) => {
      const entry = gradeSheetData.entries[st.id] || { componentScores: {}, compositeScore: "", remark: "" }
      const rowData: any[] = [idx + 1, st.studentCode, st.studentName, currentSubject?.subjectName || "Môn học"]
      activeColNames.forEach((_: any, i: number) => {
        rowData.push(entry.componentScores[`col${i}`] || "")
      })
      if (gradeSheetData.config?.hasCompositeColumn !== false) rowData.push(entry.compositeScore || "")
      if (gradeSheetData.config?.hasRemarkColumn !== false) rowData.push(entry.remark || "")
      return rowData
    })

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "BangDiem")

    const fileName = `BangDiem_${currentClass?.className || "Lop"}_${currentSubject?.subjectCode || "Mon"}_${selectedPeriod}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: "binary" })

        // If workbook has multiple sheets (each sheet is a subject), open the Multi-Sheet vnEdu Import Modal automatically!
        if (wb.SheetNames.length > 1) {
          setPendingVnEduFiles([file])
          setIsVnEduImportOpen(true)
          return
        }

        const wsName = wb.SheetNames[0]
        const ws = wb.Sheets[wsName]
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][]

        if (!data || data.length < 2) {
          alert("File Excel không có dữ liệu hợp lệ")
          return
        }

        // Find header row (supports row 1 or vnEdu multi-row top metadata)
        let headerRowIdx = 0
        for (let r = 0; r < Math.min(data.length, 15); r++) {
          const rowStr = Array.from(data[r] || [], c => String(c ?? "").toLowerCase()).join(" | ")
          if (rowStr.includes("mã hs") || rowStr.includes("mã học sinh") || rowStr.includes("mã vnedu") || (rowStr.includes("stt") && rowStr.includes("họ và tên"))) {
            headerRowIdx = r
            break
          }
        }

        const headers = Array.from(data[headerRowIdx] || [], h => String(h ?? "").trim())
        const codeIdx = headers.findIndex(h => {
          const l = String(h ?? "").toLowerCase()
          return l.includes("mã hs") || l.includes("ma hs") || l.includes("mã học sinh") || l.includes("mã vnedu")
        })
        if (codeIdx === -1) {
          // Hand off vnEdu gradebook without Mã HS column to VnEduImportModal (supports full-name matching!)
          setPendingVnEduFiles([file])
          setIsVnEduImportOpen(true)
          return
        }

        const studentMapByCode = new Map<string, string>()
        gradeSheetData.students.forEach(st => {
          if (st.studentCode) studentMapByCode.set(String(st.studentCode).trim().toLowerCase(), st.id)
          if (st.vnEduCode) studentMapByCode.set(String(st.vnEduCode).trim().toLowerCase(), st.id)
        })

        const newEntries = { ...gradeSheetData.entries }
        let countImported = 0

        const customCompTitle = String(gradeSheetData.config?.compositeColumnName ?? "").trim().toLowerCase()
        const xlIdx = headers.findIndex(h => {
          const l = String(h ?? "").toLowerCase()
          return l.startsWith("xl") || l.includes("xếp loại") || l.includes("mức đạt")
        })
        const ktIdx = headers.findIndex(h => {
          const l = String(h ?? "").toLowerCase()
          return l.startsWith("kt ") || l === "kt" || l.includes("điểm kt")
        })

        for (let r = headerRowIdx + 1; r < data.length; r++) {
          const row = data[r]
          if (!row || !row[codeIdx]) continue
          const stCode = String(row[codeIdx]).trim().toLowerCase()
          const stId = studentMapByCode.get(stCode)
          if (!stId) continue

          const compScores: Record<string, string> = {}
          activeColNames.forEach((colName: string, cIdx: number) => {
            const cleanColName = String(colName ?? "").trim().toLowerCase()
            const hIdx = headers.findIndex(h => {
              const strH = String(h ?? "")
              const cleanH = strH.trim().toLowerCase().replace(/\s*\(tối đa.*?\)/i, "")
              return cleanH === cleanColName || strH.toLowerCase() === cleanColName
            })
            if (hIdx !== -1 && row[hIdx] !== undefined && row[hIdx] !== null) {
              compScores[`col${cIdx}`] = String(row[hIdx])
            }
          })

          if (ktIdx !== -1 && row[ktIdx] !== undefined && row[ktIdx] !== null && String(row[ktIdx]).trim() !== "" && !compScores.col0) {
            compScores.col0 = String(row[ktIdx]).trim()
          }

          const compScoreIdx = headers.findIndex(h => {
            const lower = String(h ?? "").toLowerCase()
            return (customCompTitle && lower === customCompTitle) || lower.includes("thành phần") || lower.includes("tổng hợp") || lower.includes("tb môn")
          })

          let compVal = ""
          if (compScoreIdx !== -1 && row[compScoreIdx] !== undefined && String(row[compScoreIdx]).trim() !== "") {
            compVal = String(row[compScoreIdx])
          } else if (gradeSheetData.config?.hasCompositeColumn !== false) {
            compVal = calculateCompositeScore(compScores, gradeSheetData.config, activeColNames.length)
          }

          let ratingVal = newEntries[stId]?.ratingValue || ""
          if (xlIdx !== -1 && row[xlIdx] !== undefined && String(row[xlIdx]).trim() !== "") {
            ratingVal = normalizePrimaryXlInput(String(row[xlIdx]))
          }

          const remIdx = headers.findIndex(h => {
            const l = String(h ?? "").toLowerCase()
            return l.includes("nhận xét") || l.includes("nhan xet")
          })
          let remVal = ""
          if (remIdx !== -1 && row[remIdx] !== undefined) {
            remVal = String(row[remIdx])
          }

          newEntries[stId] = {
            componentScores: compScores,
            compositeScore: compVal,
            ratingValue: ratingVal,
            remark: remVal
          }
          countImported++
        }

        setGradeSheetData(prev => ({ ...prev, entries: newEntries }))
        alert(`Đã đọc thành công dữ liệu điểm của ${countImported} học sinh từ file Excel!`)
      } catch (err: any) {
        alert("Lỗi đọc file Excel: " + err.message)
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ""
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#48BFE3] rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-teal-200 mb-2">
              <Award className="w-3.5 h-3.5 text-teal-300" />
              Sổ điểm - Nhận xét
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Sổ điểm Vnedu</h1>
            <p className="text-teal-100 text-xs md:text-sm mt-1 max-w-2xl">
              Cấu hình mẫu file nhập điểm các môn học theo Khối (1-8 cột điểm tùy chỉnh), chọn Kỳ đánh giá (KSĐN, GK1, CK1, GK2, CK2) và quản lý sổ điểm học sinh.
            </p>
            {isSubjectScoped && subjects.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-teal-200">Môn học được phân quyền:</span>
                {subjects.map((s: any) => (
                  <span key={s.id} className="px-2 py-0.5 rounded-md bg-white/15 border border-white/25 text-[11px] font-semibold text-white">
                    {s.subjectName}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 tabular-nums">
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id} className="text-slate-800">
                  Năm học: {y.name}
                </option>
              ))}
            </select>

            <div className="inline-flex p-1 bg-white/10 rounded-xl border border-white/20">
              <button
                type="button"
                onClick={() => handleSelectSemester(1)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  activeSemester === 1
                    ? "bg-white text-[#003B3A] shadow-xs"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Học kỳ 1
              </button>
              <button
                type="button"
                onClick={() => handleSelectSemester(2)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  activeSemester === 2
                    ? "bg-white text-[#003B3A] shadow-xs"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Học kỳ 2
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("config")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "config"
                  ? "bg-white text-[#003B3A] shadow-lg shadow-black/10 scale-105"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4" />
              1. Cấu hình Mẫu File & Cột điểm theo Khối
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("grades")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "grades"
                  ? "bg-white text-[#003B3A] shadow-lg shadow-black/10 scale-105"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              2. Quản lý & Nhập Sổ điểm Học sinh
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("term-grades")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "term-grades"
                  ? "bg-white text-[#003B3A] shadow-lg shadow-black/10 scale-105"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Award className="w-4 h-4" />
              3. Điểm tổng kết (Tiểu học, THCS & THPT)
            </button>
          </div>

          <Link
            href="/admin/ktdbcl/phan-tich-thkq"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 border border-white/20 text-white transition-all backdrop-blur-sm shadow-sm hover:scale-105 group"
          >
            <BarChart3 className="w-4 h-4 text-teal-300 group-hover:scale-110 transition-transform" />
            <span>Phân tích THKQ & Tiến độ</span>
            <ChevronRight className="w-3.5 h-3.5 text-white/70 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* TAB 1: CONFIG FORM */}
      {activeTab === "config" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-2 border border-[#E2E8F0] inline-flex flex-wrap items-center gap-1.5 shadow-xs">
            <button
              type="button"
              onClick={() => setConfigModeTab("VNEDU")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                configModeTab === "VNEDU"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              1. Sổ điểm theo vnEdu (Môn Bộ GD&amp;ĐT)
            </button>
            <button
              type="button"
              onClick={() => setConfigModeTab("INTERNAL")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                configModeTab === "INTERNAL"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              2. Đánh giá nội bộ Sky-Line (Môn Song ngữ &amp; Quốc tế)
            </button>
          </div>

          {configModeTab === "VNEDU" ? (
            <VnEduConfigMatrixPanel
              academicYearId={selectedYearId}
              subjects={subjects}
              configs={savedConfigs}
              grades={GRADES}
              evalPeriods={EVAL_PERIODS}
              onConfigsChanged={fetchConfigs}
              onSwitchToInternalConfig={(targetGrade, targetPeriod, targetSubjectId) => {
                setConfigModeTab("INTERNAL")
                setConfigGrade(targetGrade || "Khối 4")
                setConfigPeriod(targetPeriod || "GK1")
                setConfigSubjectId(targetSubjectId || "ALL")
                if (targetSubjectId && targetSubjectId !== "ALL") {
                  setInternalSelectedSubjectIds([targetSubjectId])
                }
                setListFilterPeriod(targetPeriod || "ALL")
                setListFilterGrade(targetGrade || "ALL")
              }}
            />
          ) : (
        <div className="space-y-5">
          {/* KHUNG 1: ĐIỀU HƯỚNG TRỰC QUAN THEO BẬC -> KHỐI -> KỲ & CHỌN MÔN SONG NGỮ QUỐC TẾ */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs space-y-4 border-l-4 border-l-[#003B3A]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3.5">
              <div>
                <h2 className="text-base font-bold text-[#003B3A] flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#008B85]" />
                  Cấu hình Đánh giá nội bộ Sky-Line — Trực quan theo Khối &amp; Kỳ (Môn Song ngữ &amp; Quốc tế)
                </h2>
                <span className="text-xs text-slate-500 font-normal">
                  Chọn <strong>Bậc học → Khối áp dụng → Kỳ đánh giá → Môn Song ngữ &amp; Quốc tế</strong> để xem toàn cảnh trên <strong>Ma trận theo Khối &amp; Kỳ</strong> và thiết lập cấu trúc cột điểm, thang điểm, công thức riêng.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openBatchAssignModal(configPeriod !== "ALL" ? configPeriod : undefined, configGrade !== "ALL" ? configGrade : undefined)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#003B3A] hover:bg-[#002b2a] text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
                >
                  <Sparkles className="w-4 h-4 text-[#5EEAD4]" />
                  Gán môn hàng loạt theo Kỳ
                </button>
              </div>
            </div>

            {/* BƯỚC 1 & 2: THANH CHỌN NHANH TRỰC QUAN BẬC HỌC -> KHỐI ÁP DỤNG -> KỲ ĐÁNH GIÁ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E2E8F0] text-xs">
              {/* Cột trái (7/12): Chọn Bậc học & Chọn nhanh Khối (Pills trực quan) */}
              <div className="lg:col-span-7 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-[#003B3A] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#008B85]" />
                    1. Chọn Bậc học &amp; Khối áp dụng:
                  </span>
                  <div className="inline-flex items-center bg-white border border-[#E2E8F0] rounded-xl p-0.5 gap-0.5">
                    {[
                      { code: "PRIMARY", label: "Bậc Tiểu học (K1–K5)", defaultGrade: "Khối 4" },
                      { code: "MIDDLE", label: "Bậc THCS (K6–K9)", defaultGrade: "Khối 6" },
                      { code: "HIGH", label: "Bậc THPT (K10–K12)", defaultGrade: "Khối 10" },
                      { code: "ALL", label: "Tất cả Bậc", defaultGrade: "ALL" },
                    ].map(lvl => (
                      <button
                        key={lvl.code}
                        type="button"
                        onClick={() => {
                          setConfigEducationLevel(lvl.code as any)
                          setConfigGrade(lvl.defaultGrade)
                          setListFilterGrade(lvl.defaultGrade)
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          configEducationLevel === lvl.code
                            ? "bg-[#003B3A] text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hàng nút chọn nhanh từng Khối kèm số lượng cấu hình đã lưu */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setConfigGrade("ALL")
                      setListFilterGrade("ALL")
                      setInternalMatrixGradeScope("LEVEL_GRADES")
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all tabular-nums ${
                      configGrade === "ALL"
                        ? "bg-[#008B85] text-white border-[#008B85] shadow-xs"
                        : "bg-white text-slate-600 border-[#E2E8F0] hover:border-[#008B85]"
                    }`}
                  >
                    Tất cả Khối ({gradeCountsForInternal.ALL || 0})
                  </button>
                  {gradesInSelectedEducationLevel.map(g => {
                    const isSelected = configGrade === g
                    const cnt = gradeCountsForInternal[g] || 0
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          setConfigGrade(g)
                          setListFilterGrade(g)
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all tabular-nums flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-[#003B3A] text-white border-[#003B3A] shadow-xs"
                            : cnt > 0
                            ? "bg-white text-[#003B3A] border-teal-200 hover:border-[#008B85]"
                            : "bg-white text-slate-600 border-[#E2E8F0] hover:bg-slate-100"
                        }`}
                      >
                        <span>{g}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            isSelected
                              ? "bg-[#008B85] text-white"
                              : cnt > 0
                              ? "bg-teal-50 text-[#00736E]"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {cnt}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Cột phải (5/12): Chọn nhanh Kỳ đánh giá / Học kỳ (Pills trực quan) */}
              <div className="lg:col-span-5 space-y-2.5 lg:border-l lg:border-[#E2E8F0] lg:pl-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#003B3A] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#008B85]" />
                    2. Chọn Kỳ đánh giá / Học kỳ ({configGrade === "ALL" ? "Tất cả Khối" : configGrade}):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setConfigPeriod("ALL")
                      setListFilterPeriod("ALL")
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all tabular-nums ${
                      configPeriod === "ALL"
                        ? "bg-[#008B85] text-white border-[#008B85]"
                        : "bg-white text-slate-600 border-[#E2E8F0] hover:bg-slate-100"
                    }`}
                  >
                    Tất cả Kỳ ({periodCountsForCurrentGrade.ALL || 0})
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-3 gap-1.5">
                  {EVAL_PERIODS.map(p => {
                    const isSelected = configPeriod === p.code
                    const cnt = periodCountsForCurrentGrade[p.code] || 0
                    return (
                      <button
                        key={p.code}
                        type="button"
                        onClick={() => {
                          setConfigPeriod(p.code)
                          setListFilterPeriod(p.code)
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all tabular-nums flex items-center justify-between gap-1 ${
                          isSelected
                            ? "bg-[#003B3A] text-white border-[#003B3A] shadow-xs"
                            : cnt > 0
                            ? "bg-white text-[#003B3A] border-teal-200 hover:border-[#008B85]"
                            : "bg-white text-slate-600 border-[#E2E8F0] hover:bg-slate-100"
                        }`}
                        title={p.name}
                      >
                        <span>{p.code}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            isSelected
                              ? "bg-[#008B85] text-white"
                              : cnt > 0
                              ? "bg-teal-50 text-[#00736E]"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {cnt}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* BƯỚC 3: KHUNG CHỌN TRỰC QUAN CÁC MÔN SONG NGỮ & QUỐC TẾ (+ TÙY CHỌN BỔ SUNG THÊM MÔN) */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3.5 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-[#003B3A] text-white shadow-xs">
                    3. Danh mục Môn Song ngữ &amp; Quốc tế ({bilingualSubjectsForInternal.length} môn)
                  </span>
                  {extraAddedSubjectsForInternal.length > 0 && (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-teal-50 text-[#00736E] border border-teal-200">
                      + {extraAddedSubjectsForInternal.length} môn bổ sung
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsAddMoreSubjectOpen(prev => !prev)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                      isAddMoreSubjectOpen
                        ? "bg-[#008B85] text-white border-[#008B85]"
                        : "bg-white hover:bg-teal-50 text-[#003B3A] border-[#008B85]/50"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isAddMoreSubjectOpen ? "Đóng tùy chọn bổ sung môn" : "Tùy chọn bổ sung thêm môn"}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#008B85] font-semibold bg-teal-50 px-2 py-1 rounded-lg border border-teal-200">
                    Đang chọn {internalSelectedSubjectIds.length || (configSubjectId !== "ALL" ? 1 : 0)} môn
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const ids = filteredInternalPickerSubjects.map(s => s.id)
                      setInternalSelectedSubjectIds(ids)
                      if (ids[0]) setConfigSubjectId(ids[0])
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-[#003B3A] border border-[#E2E8F0] text-[11px] font-semibold"
                  >
                    Chọn tất cả ({filteredInternalPickerSubjects.length})
                  </button>
                  {internalSelectedSubjectIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setInternalSelectedSubjectIds([])}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-[#E11D48] border border-[#E2E8F0] text-[11px] font-medium"
                    >
                      Bỏ chọn ({internalSelectedSubjectIds.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Khung mở rộng: Tùy chọn bổ sung thêm môn từ danh mục hoặc tạo môn mới */}
              {isAddMoreSubjectOpen && (
                <div className="bg-white border border-[#008B85]/40 rounded-xl p-3 space-y-3 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <div className="font-bold text-[#003B3A] text-xs">
                        Tùy chọn bổ sung thêm môn vào Đánh giá nội bộ Sky-Line
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Tick chọn từ danh mục môn học có sẵn trong hệ thống hoặc tạo mới môn học để cấu hình Sổ điểm riêng.
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[
                        { code: "ALL", label: "Tất cả môn khác" },
                        { code: "SKL", label: "Môn Đặc thù Sky-Line" },
                        { code: "MOET", label: "Môn Bộ GD&ĐT / Khảo sát" },
                      ].map(tab => (
                        <button
                          key={tab.code}
                          type="button"
                          onClick={() => setAddMoreGroupFilter(tab.code as any)}
                          className={`px-2 py-1 rounded-lg text-[10.5px] font-semibold transition-all ${
                            addMoreGroupFilter === tab.code
                              ? "bg-[#003B3A] text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={addMoreSubjectSearch}
                      onChange={(e) => setAddMoreSubjectSearch(e.target.value)}
                      placeholder="Tìm nhanh tên hoặc mã môn học để bổ sung..."
                      className="w-full border border-[#E2E8F0] rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-700 bg-[#F8FAFC] outline-none focus:border-[#008B85]"
                    />
                    {addMoreSubjectSearch && (
                      <button
                        type="button"
                        onClick={() => setAddMoreSubjectSearch("")}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {candidateSubjectsToAdd.map(s => {
                      const isAdded = customAddedSubjectIds.includes(s.id)
                      const grp = getSubjectCurriculumGroup(s)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            toggleCustomAddedSubject(s.id)
                            if (!isAdded) {
                              setConfigSubjectId(s.id)
                              setInternalSelectedSubjectIds(prev => Array.from(new Set([...prev, s.id])))
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between gap-2 transition-all ${
                            isAdded
                              ? "bg-[#F0FDFA] border-[#008B85] text-[#003B3A] font-semibold"
                              : "bg-slate-50/70 hover:bg-slate-100 border-[#E2E8F0] text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isAdded ? (
                              <CheckSquare className="w-3.5 h-3.5 text-[#008B85] shrink-0" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate text-[11px]">{s.subjectName}</span>
                          </div>
                          <span className="text-[9.5px] font-mono text-slate-400 shrink-0">
                            {grp === "SKL" ? "Đặc thù" : s.subjectCode}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Tạo mới môn học bổ sung */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#003B3A]">
                      Hoặc tạo môn mới:
                    </span>
                    <input
                      type="text"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      placeholder="Tên môn mới (VD: Global Perspectives...)"
                      className="flex-1 min-w-[180px] border border-[#E2E8F0] rounded-lg px-2.5 py-1 text-xs outline-none focus:border-[#008B85]"
                    />
                    <input
                      type="text"
                      value={newSubjectCode}
                      onChange={(e) => setNewSubjectCode(e.target.value)}
                      placeholder="Mã môn (tùy chọn)"
                      className="w-28 border border-[#E2E8F0] rounded-lg px-2.5 py-1 text-xs outline-none focus:border-[#008B85]"
                    />
                    <select
                      value={newSubjectLevel}
                      onChange={(e) => setNewSubjectLevel(e.target.value)}
                      className="border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs bg-white text-slate-700 outline-none"
                    >
                      <option value="ALL">Tất cả Bậc</option>
                      <option value="PRIMARY">Bậc Tiểu học</option>
                      <option value="MIDDLE">Bậc THCS</option>
                      <option value="HIGH">Bậc THPT</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleCreateAndAddSubject}
                      disabled={creatingNewSubject || !newSubjectName.trim()}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#003B3A] hover:bg-[#002b2a] text-white text-[11px] font-semibold disabled:opacity-50 transition-all"
                    >
                      {creatingNewSubject ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Thêm &amp; Chọn môn
                    </button>
                  </div>
                </div>
              )}

              {/* Lưới chọn các môn Song ngữ & Quốc tế (+ môn tùy chọn bổ sung) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                {filteredInternalPickerSubjects.map(s => {
                  const isChecked = internalSelectedSubjectIds.includes(s.id) || configSubjectId === s.id
                  const isConfigured = configuredSubjectIdsInSelectedPeriodAndGrade.has(s.id)
                  const grp = getSubjectCurriculumGroup(s)
                  const isExtraAdded = grp !== "BILINGUAL" && customAddedSubjectIds.includes(s.id)
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setConfigSubjectId(s.id)
                        setInternalSelectedSubjectIds(prev => {
                          const exists = prev.includes(s.id)
                          return exists ? prev.filter(id => id !== s.id) : [...prev, s.id]
                        })
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition-all cursor-pointer ${
                        isChecked
                          ? "bg-[#F0FDFA] border-[#008B85] ring-1 ring-[#008B85]"
                          : isConfigured
                          ? "bg-white border-emerald-200 hover:border-[#008B85]"
                          : "bg-white border-[#E2E8F0] hover:bg-slate-50"
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-[#008B85] shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className="font-semibold text-slate-900 truncate">{s.subjectName}</div>
                          {isExtraAdded && (
                            <button
                              type="button"
                              title="Bỏ môn khỏi danh sách bổ sung"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleCustomAddedSubject(s.id)
                                setInternalSelectedSubjectIds(prev => prev.filter(id => id !== s.id))
                              }}
                              className="text-slate-400 hover:text-[#E11D48] p-0.5 rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-1 mt-1">
                          <span className="text-[10px] font-mono text-slate-500">{s.subjectCode}</span>
                          <div className="flex items-center gap-1">
                            {isConfigured && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-emerald-50 text-[#059669]">
                                Đã lưu ({configPeriod})
                              </span>
                            )}
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                grp === "BILINGUAL"
                                  ? "bg-teal-50 text-[#00736E]"
                                  : "bg-amber-50 text-[#D97706]"
                              }`}
                            >
                              {grp === "BILINGUAL" ? "Song ngữ QT" : "Môn bổ sung"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* KHUNG 2: BẢNG MA TRẬN SỔ ĐIỂM RIÊNG TRỰC QUAN THEO KHỐI & KỲ (SKY-LINE ACADEMIC LEDGER) */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-[#003B3A] flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-[#008B85]" />
                    Ma trận Cấu hình Sổ điểm riêng theo Khối &amp; Kỳ —{" "}
                    {internalMatrixGradeScope === "CURRENT_GRADE" && configGrade !== "ALL"
                      ? configGrade
                      : configEducationLevel === "PRIMARY"
                      ? "Bậc Tiểu học (Khối 1–5)"
                      : configEducationLevel === "MIDDLE"
                      ? "Bậc THCS (Khối 6–9)"
                      : configEducationLevel === "HIGH"
                      ? "Bậc THPT (Khối 10–12)"
                      : "Tất cả Khối"}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-[#003B3A] text-white text-[11px] font-semibold tabular-nums">
                    {internalDisplayMode === "MATRIX"
                      ? `${internalMatrixRows.length} dòng môn × khối`
                      : `${filteredSavedConfigs.length} cấu hình`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Quan sát trực quan cấu trúc cột điểm của từng Môn theo <strong>Khối</strong> và từng <strong>Kỳ đánh giá (KSĐN, GK1, CK1, GK2, CK2, CN)</strong>. Nhấp vào ô bất kỳ để xem/chỉnh sửa chi tiết hoặc mở Sổ điểm riêng.
                </p>
              </div>

              {/* Chuyển chế độ xem: Bảng Ma trận theo Khối & Kỳ vs Thẻ nhóm theo Khối & Kỳ */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedInternalConfigIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkDeleteInternalConfigs}
                    className="px-3 py-1.5 rounded-xl bg-[#E11D48] hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa {selectedInternalConfigIds.length} cấu hình đã chọn
                  </button>
                )}

                {/* Phạm vi Khối hiển thị trên bảng Ma trận */}
                <div className="inline-flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-0.5 gap-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setInternalMatrixGradeScope("CURRENT_GRADE")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      internalMatrixGradeScope === "CURRENT_GRADE"
                        ? "bg-[#003B3A] text-white shadow-xs"
                        : "text-slate-600 hover:bg-white"
                    }`}
                  >
                    Đang chọn ({configGrade === "ALL" ? "Tất cả Khối" : configGrade})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInternalMatrixGradeScope("LEVEL_GRADES")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      internalMatrixGradeScope === "LEVEL_GRADES"
                        ? "bg-[#003B3A] text-white shadow-xs"
                        : "text-slate-600 hover:bg-white"
                    }`}
                  >
                    Tất cả Khối thuộc Bậc ({gradesInSelectedEducationLevel.length} khối)
                  </button>
                </div>

                {/* Chế độ hiển thị */}
                <div className="inline-flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-0.5 gap-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setInternalDisplayMode("MATRIX")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      internalDisplayMode === "MATRIX"
                        ? "bg-[#008B85] text-white shadow-xs"
                        : "text-slate-600 hover:bg-white"
                    }`}
                  >
                    1. Bảng Ma trận theo Khối &amp; Kỳ
                  </button>
                  <button
                    type="button"
                    onClick={() => setInternalDisplayMode("GROUPED_CARDS")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      internalDisplayMode === "GROUPED_CARDS"
                        ? "bg-[#008B85] text-white shadow-xs"
                        : "text-slate-600 hover:bg-white"
                    }`}
                  >
                    2. Thẻ nhóm theo Khối &amp; Kỳ ({filteredSavedConfigs.length})
                  </button>
                </div>

                <div className="relative w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={listSearchTerm}
                    onChange={(e) => setListSearchTerm(e.target.value)}
                    placeholder="Tìm nhanh môn..."
                    className="w-full border border-[#E2E8F0] rounded-xl pl-8 pr-6 py-1 text-xs text-slate-700 bg-[#F8FAFC] outline-none focus:border-[#008B85]"
                  />
                  {listSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setListSearchTerm("")}
                      className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {internalDisplayMode === "MATRIX" ? (
              /* CHẾ ĐỘ 1: BẢNG MA TRẬN TRỰC QUAN THEO KHỐI & KỲ (SKY-LINE ACADEMIC LEDGER TABLE) */
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
                      <th className="py-3 px-3 text-white w-9 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredInternalPickerSubjects.length > 0 &&
                            filteredInternalPickerSubjects.every(s => internalSelectedSubjectIds.includes(s.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const ids = filteredInternalPickerSubjects.map(s => s.id)
                              setInternalSelectedSubjectIds(ids)
                              if (ids[0]) setConfigSubjectId(ids[0])
                            } else {
                              setInternalSelectedSubjectIds([])
                            }
                          }}
                          className="rounded border-teal-300 text-[#00A19A] cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-3 text-white min-w-[180px]">
                        Môn học (Nhấp để chỉnh sửa cột)
                      </th>
                      <th className="py-3 px-2.5 text-teal-100 text-center">Bậc</th>
                      <th className="py-3 px-2.5 text-teal-100 text-center">Khối</th>
                      {EVAL_PERIODS.map(p => {
                        const isPeriodActive = configPeriod === p.code
                        return (
                          <th
                            key={p.code}
                            onClick={() => {
                              setConfigPeriod(p.code)
                              setListFilterPeriod(p.code)
                            }}
                            className={`py-3 px-2.5 text-center cursor-pointer transition-colors min-w-[140px] ${
                              isPeriodActive ? "bg-[#005B58] text-[#5EEAD4]" : "text-teal-100 hover:bg-[#004d4b]"
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              {isPeriodActive && <Check className="w-3.5 h-3.5 text-[#5EEAD4]" />}
                              <span>{p.code}</span>
                            </div>
                            <div className="text-[10px] font-normal text-teal-200/80 mt-0.5">
                              {p.code === "KSĐN"
                                ? "Đầu năm"
                                : p.code === "GK1"
                                ? "Giữa kỳ 1"
                                : p.code === "CK1"
                                ? "Cuối kỳ 1"
                                : p.code === "GK2"
                                ? "Giữa kỳ 2"
                                : p.code === "CK2"
                                ? "Cuối kỳ 2"
                                : "Cả năm"}
                            </div>
                          </th>
                        )
                      })}
                      <th className="py-3 px-3 text-white text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {internalMatrixRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-10 text-center text-slate-500">
                          Chưa có môn học nào được chọn hoặc cấu hình cho{" "}
                          <strong>{configGrade === "ALL" ? "bộ lọc hiện tại" : configGrade}</strong>. Hãy tick chọn môn ở mục{" "}
                          <strong>3. Danh mục Môn Song ngữ &amp; Quốc tế</strong> phía trên để đưa vào Ma trận.
                        </td>
                      </tr>
                    ) : (
                      internalMatrixRows.map(row => {
                        const { subject: subj, gradeStr, levelLabel, configsByPeriod, savedPeriodsCount } = row
                        const isRowSelected =
                          (internalSelectedSubjectIds.includes(subj.id) || configSubjectId === subj.id) &&
                          (configGrade === gradeStr || configGrade === "ALL")
                        const grp = getSubjectCurriculumGroup(subj)
                        const activeCfgForSelectedPeriod =
                          configsByPeriod[configPeriod !== "ALL" ? configPeriod : "GK1"] ||
                          Object.values(configsByPeriod).find(Boolean) ||
                          null

                        return (
                          <tr
                            key={row.rowKey}
                            className={`transition-colors align-middle ${
                              isRowSelected ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]" : "hover:bg-[#F8FAFC]"
                            }`}
                          >
                            <td className="py-3 px-3 text-center align-middle">
                              <input
                                type="checkbox"
                                checked={internalSelectedSubjectIds.includes(subj.id)}
                                onChange={() => {
                                  setConfigSubjectId(subj.id)
                                  setConfigGrade(gradeStr)
                                  setInternalSelectedSubjectIds(prev =>
                                    prev.includes(subj.id) ? prev.filter(id => id !== subj.id) : [...prev, subj.id]
                                  )
                                }}
                                className="rounded border-slate-300 text-[#003B3A] cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-3 align-middle">
                              <button
                                type="button"
                                onClick={() => {
                                  setConfigSubjectId(subj.id)
                                  setInternalSelectedSubjectIds([subj.id])
                                  setConfigGrade(gradeStr)
                                  if (activeCfgForSelectedPeriod) {
                                    handleSelectConfig(activeCfgForSelectedPeriod)
                                  }
                                  internalDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
                                }}
                                className="text-left group"
                              >
                                <div className="font-bold text-[#003B3A] group-hover:text-[#008B85] flex items-center gap-1.5">
                                  <span>{subj.subjectName}</span>
                                  <span className="text-[10px] font-mono font-normal text-slate-400">
                                    ({subj.subjectCode})
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span
                                    className={`text-[9.5px] px-1.5 py-0.2 rounded font-semibold ${
                                      grp === "BILINGUAL"
                                        ? "bg-teal-50 text-[#00736E]"
                                        : "bg-amber-50 text-[#D97706]"
                                    }`}
                                  >
                                    {grp === "BILINGUAL" ? "Song ngữ QT" : "Môn bổ sung"}
                                  </span>
                                  <span
                                    className={`text-[9.5px] px-1.5 py-0.2 rounded font-semibold ${
                                      savedPeriodsCount > 0
                                        ? "bg-emerald-50 text-[#059669]"
                                        : "bg-slate-100 text-slate-500"
                                    }`}
                                  >
                                    {savedPeriodsCount > 0 ? `Đã lưu (${savedPeriodsCount} kỳ)` : "Chưa lưu"}
                                  </span>
                                </div>
                              </button>
                            </td>
                            <td className="py-3 px-2.5 text-center align-middle">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px] font-semibold">
                                {levelLabel}
                              </span>
                            </td>
                            <td className="py-3 px-2.5 text-center align-middle">
                              <span className="px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#003B3A] border border-teal-200 text-[11px] font-bold">
                                {gradeStr}
                              </span>
                            </td>
                            {EVAL_PERIODS.map(p => {
                              const cellCfg = configsByPeriod[p.code]
                              const isCurrentCell =
                                configSubjectId === subj.id &&
                                configGrade === gradeStr &&
                                configPeriod === p.code
                              let cellCols: string[] = []
                              let cellTypes: string[] = []
                              if (cellCfg) {
                                try {
                                  cellCols =
                                    typeof cellCfg.columnNames === "string"
                                      ? JSON.parse(cellCfg.columnNames)
                                      : cellCfg.columnNames || []
                                } catch (_) {}
                                try {
                                  cellTypes =
                                    typeof cellCfg.columnTypes === "string"
                                      ? JSON.parse(cellCfg.columnTypes)
                                      : cellCfg.columnTypes || []
                                } catch (_) {}
                              }

                              return (
                                <td key={p.code} className="py-2.5 px-2 align-middle text-center">
                                  {cellCfg ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleSelectConfig({
                                          ...cellCfg,
                                          grade: gradeStr,
                                          evaluationPeriod: p.code,
                                          subjectId: subj.id,
                                        })
                                        internalDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
                                      }}
                                      className={`w-full text-left p-2 rounded-xl border transition-all ${
                                        isCurrentCell
                                          ? "bg-[#003B3A] text-white border-[#003B3A] ring-2 ring-[#008B85]"
                                          : "bg-[#F0FDFA] hover:bg-teal-100/70 text-[#003B3A] border-teal-200"
                                      }`}
                                      title={`Nhấp để xem/sửa cấu hình ${subj.subjectName} • ${gradeStr} • ${p.code}`}
                                    >
                                      <div className="flex items-center justify-between gap-1 font-bold text-[10.5px]">
                                        <span className="truncate">
                                          ✓ {cellCols.length} cột điểm
                                        </span>
                                        {cellCfg.hasCompositeColumn && (
                                          <span
                                            className={`text-[9.5px] px-1 rounded font-semibold shrink-0 ${
                                              isCurrentCell
                                                ? "bg-[#008B85] text-white"
                                                : "bg-white text-[#00736E] border border-teal-200"
                                            }`}
                                          >
                                            → {cellCfg.compositeColumnName || "Điểm"}
                                          </span>
                                        )}
                                      </div>
                                      <div
                                        className={`text-[10px] truncate mt-0.5 ${
                                          isCurrentCell ? "text-teal-100" : "text-slate-600"
                                        }`}
                                      >
                                        {cellCols
                                          .map((cName, idx) => {
                                            const t = cellTypes[idx] || "SCORE_10"
                                            const mx = getColumnMaxScore(t, cellCfg.columnMaxScores, idx)
                                            return mx && mx !== 10 ? `${cName} (${mx}đ)` : cName
                                          })
                                          .join(" + ")}
                                      </div>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setConfigSubjectId(subj.id)
                                        setInternalSelectedSubjectIds([subj.id])
                                        setConfigGrade(gradeStr)
                                        setConfigPeriod(p.code)
                                        const lowerName = String(subj.subjectName || "").toLowerCase()
                                        if (lowerName.includes("math") || lowerName.includes("toán")) {
                                          applyInternalPreset("MATH_BILINGUAL")
                                        } else if (lowerName.includes("science") || lowerName.includes("khoa học")) {
                                          applyInternalPreset("SCIENCE_BILINGUAL")
                                        } else if (lowerName.includes("esl")) {
                                          applyInternalPreset("ESL_INTL")
                                        }
                                        internalDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
                                      }}
                                      className={`w-full py-2 px-2 rounded-xl border border-dashed text-[10.5px] font-medium transition-all ${
                                        isCurrentCell
                                          ? "bg-teal-50 border-[#008B85] text-[#003B3A] font-bold"
                                          : "border-slate-200 text-slate-400 hover:border-[#008B85] hover:text-[#00736E] hover:bg-slate-50"
                                      }`}
                                    >
                                      + Thiết lập {p.code}
                                    </button>
                                  )}
                                </td>
                              )
                            })}
                            <td className="py-3 px-3 text-right align-middle whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenInternalGradebookForConfig({
                                      subjectId: subj.id,
                                      grade: gradeStr,
                                      evaluationPeriod: configPeriod !== "ALL" ? configPeriod : "GK1",
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-[#003B3A] hover:bg-[#002b2a] text-white text-[11px] font-semibold inline-flex items-center gap-1"
                                  title="Mở Sổ điểm riêng của môn này"
                                >
                                  <FileSpreadsheet className="w-3 h-3 text-[#5EEAD4]" />
                                  Sổ điểm riêng
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfigSubjectId(subj.id)
                                    setInternalSelectedSubjectIds([subj.id])
                                    setConfigGrade(gradeStr)
                                    if (activeCfgForSelectedPeriod) {
                                      handleSelectConfig(activeCfgForSelectedPeriod)
                                    }
                                    internalDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
                                  }}
                                  className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200 text-[11px] font-semibold"
                                >
                                  Chi tiết
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const allCfgIdsForRow = Object.values(configsByPeriod)
                                      .filter((c: any) => c && c.id)
                                      .map((c: any) => c.id)
                                    if (allCfgIdsForRow.length > 0) {
                                      if (
                                        !confirm(
                                          `Bạn có chắc chắn muốn xóa toàn bộ cấu hình của môn ${subj.subjectName} (${gradeStr}) khỏi Ma trận?`
                                        )
                                      ) {
                                        return
                                      }
                                      await fetch("/api/admin/ktdbcl/grade-configs", {
                                        method: "DELETE",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ ids: Array.from(new Set(allCfgIdsForRow)) }),
                                      })
                                      fetchConfigs()
                                    }
                                    setInternalSelectedSubjectIds(prev => prev.filter(id => id !== subj.id))
                                    if (configSubjectId === subj.id) setConfigSubjectId("ALL")
                                  }}
                                  className="p-1 text-slate-400 hover:text-[#E11D48] hover:bg-rose-50 rounded-lg"
                                  title={`Bỏ / Xóa môn ${subj.subjectName} khỏi Ma trận ${gradeStr}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* CHẾ ĐỘ 2: XEM THẺ CHI TIẾT NHÓM THEO KHỐI & SẮP XẾP THEO KỲ */
              <div className="space-y-4">
                {groupedSavedConfigsByGrade.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-6 space-y-2">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                    <div className="text-xs font-bold text-slate-600">Chưa có cấu hình Sổ điểm riêng nào trong bộ lọc đang chọn</div>
                  </div>
                ) : (
                  groupedSavedConfigsByGrade.map(group => (
                    <div key={group.gradeLabel} className="border border-[#E2E8F0] rounded-2xl overflow-hidden bg-[#F8FAFC]">
                      <div className="bg-[#003B3A] text-white px-4 py-2.5 flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-[#5EEAD4]" />
                          <span>{group.gradeLabel}</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#008B85] text-white text-[10.5px] tabular-nums">
                            {group.items.length} cấu hình
                          </span>
                        </div>
                        <span className="text-[11px] text-teal-100 font-normal">
                          Sắp xếp theo thứ tự Kỳ: KSĐN → GK1 → CK1 → GK2 → CK2 → CN
                        </span>
                      </div>
                      <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {group.items.map(cfg => {
                          let cols: string[] = []
                          try {
                            cols = typeof cfg.columnNames === "string" ? JSON.parse(cfg.columnNames) : cfg.columnNames || []
                          } catch (_) {}
                          const isCardChecked = selectedInternalConfigIds.includes(cfg.id)
                          return (
                            <div
                              key={cfg.id}
                              className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${
                                isCardChecked
                                  ? "bg-[#F0FDFA] border-[#008B85]"
                                  : "bg-white border-[#E2E8F0] hover:border-[#008B85]"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isCardChecked}
                                    onChange={() =>
                                      setSelectedInternalConfigIds(prev =>
                                        prev.includes(cfg.id) ? prev.filter(id => id !== cfg.id) : [...prev, cfg.id]
                                      )
                                    }
                                    className="rounded border-slate-300 text-[#003B3A] cursor-pointer shrink-0"
                                  />
                                  <span className="text-xs font-bold text-[#003B3A] truncate">
                                    {cfg.subject ? cfg.subject.subjectName : "Mẫu chung"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                    {cfg.grade}
                                  </span>
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-teal-50 text-[#003B3A] border border-teal-200">
                                    {cfg.evaluationPeriod}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {cols.map((colName, i) => {
                                  let parsedTypes = []
                                  try {
                                    parsedTypes = typeof cfg.columnTypes === "string" ? JSON.parse(cfg.columnTypes) : cfg.columnTypes || []
                                  } catch (_) {}
                                  const t = parsedTypes[i] || "SCORE_10"
                                  const colMax = getColumnMaxScore(t, cfg.columnMaxScores, i)
                                  return (
                                    <span key={i} className="text-[10px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-semibold">
                                      {colName} {colMax !== 10 ? `(${colMax}đ)` : ""}
                                    </span>
                                  )
                                })}
                              </div>
                              {cfg.hasCompositeColumn && (
                                <div className="text-[10px] text-teal-800 bg-teal-50/70 p-1.5 rounded-lg border border-teal-200 flex items-center gap-1.5 font-medium">
                                  <Calculator className="w-3 h-3 text-teal-800 shrink-0" />
                                  <span className="truncate">
                                    Cột: <strong>{cfg.compositeColumnName || "Điểm"}</strong> ({getFormulaDescription(cfg, cols)})
                                  </span>
                                </div>
                              )}
                              <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between border-t border-slate-100">
                                <span className="text-slate-500">
                                  Nhận xét: <strong className="text-slate-700">{cfg.hasRemarkColumn ? "Có" : "Không"}</strong>
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenInternalGradebookForConfig(cfg)}
                                    className="px-2 py-1 bg-[#003B3A] text-white hover:bg-[#002b2a] rounded-lg font-semibold flex items-center gap-1"
                                  >
                                    <FileSpreadsheet className="w-3 h-3 text-[#5EEAD4]" />
                                    Sổ điểm riêng
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleSelectConfig(cfg)
                                      internalDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
                                    }}
                                    className="px-2 py-1 bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 rounded-lg font-bold"
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteConfig(cfg.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* KHUNG 3: THIẾT LẬP CHI TIẾT CỘT ĐIỂM THÀNH PHẦN, THANG ĐIỂM & CÔNG THỨC CHO MÔN • KHỐI • KỲ ĐANG CHỌN */}
          <div
            ref={internalDetailRef}
            className="bg-white rounded-2xl p-6 border-2 border-[#008B85] shadow-xs space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-[#003B3A] text-white text-xs font-bold">
                  Chi tiết Mẫu Sổ điểm riêng:{" "}
                  {internalSelectedSubjectIds.length > 1
                    ? `${internalSelectedSubjectIds.length} môn đã chọn`
                    : localSubjects.find(s => s.id === (internalSelectedSubjectIds[0] || configSubjectId))?.subjectName ||
                      "Mẫu chung Môn Song ngữ & Quốc tế"}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#F0FDFA] text-[#003B3A] border border-teal-200 text-xs font-semibold">
                  {configGrade === "ALL" ? "Tất cả Khối" : configGrade} • Kỳ {configPeriod === "ALL" ? "Tất cả Kỳ" : configPeriod}
                </span>
              </div>

              {/* Chuyển nhanh Kỳ ngay trong khung Chi tiết */}
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Chuyển nhanh Kỳ:</span>
                {EVAL_PERIODS.map(p => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setConfigPeriod(p.code)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      configPeriod === p.code
                        ? "bg-[#003B3A] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {p.code}
                  </button>
                ))}
              </div>
            </div>

            {/* Chọn nhanh Mẫu cột chuẩn cho Môn Song ngữ & Quốc tế */}
            <div className="flex flex-wrap items-center gap-1.5 bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
              <span className="text-[11px] font-bold text-[#003B3A] mr-1">Chọn nhanh Mẫu sổ điểm riêng:</span>
              <button
                type="button"
                onClick={() => applyInternalPreset("MATH_BILINGUAL")}
                className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200 text-[11px] font-semibold"
              >
                Mẫu Toán Song ngữ (50đ + 20đ + 30đ)
              </button>
              <button
                type="button"
                onClick={() => applyInternalPreset("ESL_INTL")}
                className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200 text-[11px] font-semibold"
              >
                Mẫu ESL / Tiếng Anh QT (3 kỹ năng)
              </button>
              <button
                type="button"
                onClick={() => applyInternalPreset("SCIENCE_BILINGUAL")}
                className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200 text-[11px] font-semibold"
              >
                Mẫu Khoa học Song ngữ (50đ + 50đ)
              </button>
              <button
                type="button"
                onClick={() => applyInternalPreset("ENGLISH_SKILLS_3")}
                className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200 text-[11px] font-semibold"
              >
                Mẫu 3 kỹ năng Quốc tế (20đ + 50đ + 30đ)
              </button>
            </div>


            {/* Column count selection */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 block">Số lượng cột điểm thành phần (Tùy chọn linh động 1 hoặc nhiều cột):</label>
                  <span className="text-[11px] text-slate-500 font-normal">Có thể chọn nhanh từ 1 đến 8 cột hoặc nhấn Thêm/Bớt cột để điều chỉnh linh hoạt.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setColumnCount(num)}
                      className={`w-8 h-8 rounded-lg text-xs font-extrabold transition-all ${
                        columnCount === num
                          ? "bg-[#48BFE3] text-white shadow-md shadow-teal-500/20 scale-110"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <div className="h-6 w-[1px] bg-slate-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => setColumnCount(prev => Math.max(1, prev - 1))}
                    disabled={columnCount <= 1}
                    className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                    title="Bớt cột điểm"
                  >
                    - Bớt cột
                  </button>
                  <button
                    type="button"
                    onClick={() => setColumnCount(prev => Math.min(12, prev + 1))}
                    disabled={columnCount >= 12}
                    className="px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                    title="Thêm cột điểm"
                  >
                    + Thêm cột
                  </button>
                </div>
              </div>

              {/* Dynamic Column Name Inputs */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-700">Tên các cột điểm thành phần (Đặt tên tùy chỉnh):</label>
                <div className="grid grid-cols-1 gap-2.5">
                  {columnNames.map((name, idx) => {
                    const cType = columnTypes[idx] || "SCORE_10"
                    const currentMax = columnMaxScores[idx] || (cType.startsWith("SCORE_MAX_") ? Number(cType.replace("SCORE_MAX_", "")) : (cType === "SCORE_100" || cType === "SCORE_1000" ? 100 : 10))
                    const isCustom10 = cType === "SCORE_CUSTOM" || (cType.startsWith("SCORE_MAX_") && currentMax <= 10)
                    const isCustom100 = cType === "SCORE_CUSTOM_100" || (cType.startsWith("SCORE_MAX_") && currentMax > 10)
                    const isCustomMax = isCustom10 || isCustom100

                    let selectVal = cType
                    if (cType === "SCORE_1000") selectVal = "SCORE_100"
                    if (isCustom10) selectVal = "SCORE_CUSTOM"
                    if (isCustom100) selectVal = "SCORE_CUSTOM_100"

                    return (
                      <div key={idx} className="flex flex-col md:flex-row md:items-center gap-2.5 p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs transition-colors hover:border-teal-200">
                        <div className="flex items-center gap-2 shrink-0 md:w-56 lg:w-64">
                          <span className="text-[11px] font-extrabold text-[#008080] bg-teal-50 border border-teal-200/80 px-2 py-1 rounded-lg shrink-0">
                            Cột {idx + 1}:
                          </span>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                              const val = e.target.value
                              setColumnNames(prev => prev.map((n, i) => i === idx ? val : n))
                            }}
                            placeholder={`Tên cột ${idx + 1}`}
                            className="w-full min-w-0 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#48BFE3] outline-none"
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-wrap sm:flex-nowrap items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <select
                              value={selectVal}
                              onChange={(e) => {
                                const val = e.target.value
                                const isC10 = val === "SCORE_CUSTOM"
                                const isC100 = val === "SCORE_CUSTOM_100"
                                let chosenMax = 10
                                if (isC10) {
                                  chosenMax = (columnMaxScores[idx] && columnMaxScores[idx] > 0 && columnMaxScores[idx] <= 10) ? columnMaxScores[idx] : 5
                                } else if (isC100) {
                                  chosenMax = (columnMaxScores[idx] && columnMaxScores[idx] > 0 && columnMaxScores[idx] <= 100 && columnMaxScores[idx] > 10) ? columnMaxScores[idx] : 50
                                } else if (val === "SCORE_100" || val === "SCORE_1000") {
                                  chosenMax = 100
                                } else {
                                  chosenMax = 10
                                }
                                setColumnTypes(prev => {
                                  const next = [...prev]
                                  next[idx] = (isC10 || isC100) ? `SCORE_MAX_${chosenMax}` : (val === "SCORE_1000" ? "SCORE_100" : val)
                                  return next
                                })
                                setColumnMaxScores(prev => {
                                  const next = [...prev]
                                  next[idx] = chosenMax
                                  return next
                                })
                              }}
                              className="w-full min-w-0 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-[#48BFE3] outline-none truncate"
                            >
                              {COLUMN_TYPES.map(ct => (
                                <option key={ct.code} value={ct.code}>{ct.name}</option>
                              ))}
                            </select>
                          </div>

                          {isCustomMax && (
                            <div className="flex items-center gap-1.5 shrink-0 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 shadow-xs">
                              <span className="text-[11px] font-bold text-amber-900 whitespace-nowrap">Điểm tối đa:</span>
                              <input
                                type="number"
                                min="0.5"
                                max={isCustom100 ? "100" : "10"}
                                step={isCustom100 ? "1" : "0.5"}
                                value={currentMax}
                                onChange={(e) => {
                                  const raw = e.target.value
                                  const num = parseFloat(raw)
                                  const limit = isCustom100 ? 100 : 10
                                  const fallback = isCustom100 ? 50 : 5
                                  const val = isNaN(num) ? fallback : Math.min(limit, Math.max(0.5, num))
                                  setColumnMaxScores(prev => {
                                    const next = [...prev]
                                    next[idx] = val
                                    return next
                                  })
                                  setColumnTypes(prev => {
                                    const next = [...prev]
                                    next[idx] = `SCORE_MAX_${val}`
                                    return next
                                  })
                                }}
                                className="w-16 text-center bg-white border border-amber-300 rounded px-1.5 py-0.5 text-xs font-black text-amber-950 focus:ring-2 focus:ring-amber-500 outline-none shadow-xs"
                              />
                              <span className="text-[10px] text-amber-700 font-bold whitespace-nowrap">
                                / {isCustom100 ? "100đ" : "10đ"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Composite Column & Flexible Formula Configuration */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasComposite}
                    onChange={(e) => setHasComposite(e.target.checked)}
                    className="w-4 h-4 text-[#48BFE3] rounded border-slate-300 focus:ring-[#48BFE3]"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-[#48BFE3]" />
                      Cột Điểm thành phần (Tổng hợp)
                    </div>
                    <div className="text-[11px] text-slate-500 font-normal">
                      Tự động tính điểm tổng hợp theo công thức linh hoạt
                    </div>
                  </div>
                </label>

                {hasComposite && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 shrink-0">Tên cột hiển thị:</span>
                    <input
                      type="text"
                      value={compositeColumnName}
                      onChange={(e) => setCompositeColumnName(e.target.value)}
                      placeholder="Điểm thành phần"
                      className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#48BFE3] outline-none shadow-sm min-w-[170px]"
                    />
                  </div>
                )}
              </div>

              {hasComposite && (
                <div className="space-y-4 pt-1">
                  {/* Formula Selection Cards */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Chọn Phương thức Tính Điểm Tổng hợp:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {[
                        {
                          type: "AVERAGE",
                          title: "Trung bình cộng đều",
                          desc: "(C₁ + C₂ + ... + Cₙ) / n",
                          tag: "Phổ biến"
                        },
                        {
                          type: "WEIGHTED",
                          title: "Hệ số / Trọng số",
                          desc: "Tính theo hệ số (x1, x2) hoặc %",
                          tag: "THCS - THPT & QT"
                        },
                        {
                          type: "SUM",
                          title: "Tổng điểm các cột",
                          desc: "C₁ + C₂ + ... + Cₙ",
                          tag: "Tiểu học / Đọc-Viết"
                        },
                        {
                          type: "CUSTOM",
                          title: "Biểu thức tự do",
                          desc: "Công thức toán tùy biến",
                          tag: "Nâng cao"
                        }
                      ].map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => setFormulaType(item.type as FormulaType)}
                          className={`p-3 rounded-xl border text-left transition-all relative ${
                            formulaType === item.type
                              ? "bg-teal-50/80 border-teal-500 ring-2 ring-teal-500/20 shadow-sm"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-800">{item.title}</span>
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {item.tag}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* WEIGHTED Configuration */}
                  {formulaType === "WEIGHTED" && (
                    <div className="p-4 bg-white rounded-xl border border-teal-200/80 shadow-sm space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-teal-600" />
                          Thiết lập Hệ số / Trọng số cho từng cột điểm:
                        </span>
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setWeightedMode("COEFF")}
                            className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                              weightedMode === "COEFF" ? "bg-white text-teal-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            Hệ số (x1, x2, x3...)
                          </button>
                          <button
                            type="button"
                            onClick={() => setWeightedMode("PERCENT")}
                            className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                              weightedMode === "PERCENT" ? "bg-white text-teal-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            Trọng số % (Tổng = 100%)
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
                        {columnNames.map((colName, idx) => (
                          <div key={idx} className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-700 truncate" title={colName}>
                              {colName || `Cột ${idx + 1}`}:
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[11px] font-bold text-slate-400">
                                {weightedMode === "COEFF" ? "Hệ số" : "%"}:
                              </span>
                              <input
                                type="number"
                                min="0"
                                step={weightedMode === "PERCENT" ? "5" : "1"}
                                value={weights[idx] !== undefined ? weights[idx] : 1}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0
                                  setWeights(prev => {
                                    const next = [...prev]
                                    next[idx] = val
                                    return next
                                  })
                                }}
                                className="w-16 text-center border border-slate-300 rounded-md py-1 text-xs font-bold text-teal-900 bg-white focus:ring-2 focus:ring-[#48BFE3] outline-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {weightedMode === "PERCENT" && (
                        <div className="text-[11px] font-medium flex items-center justify-between pt-1">
                          <span className="text-slate-500">Tổng phần trăm các cột:</span>
                          <span className={`font-bold ${
                            weights.slice(0, columnCount).reduce((a, b) => a + (Number(b) || 0), 0) === 100
                              ? "text-emerald-600"
                              : "text-amber-600"
                          }`}>
                            {weights.slice(0, columnCount).reduce((a, b) => a + (Number(b) || 0), 0)}%
                            {weights.slice(0, columnCount).reduce((a, b) => a + (Number(b) || 0), 0) !== 100 && " (Khuyến nghị tổng = 100%)"}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CUSTOM Formula Editor */}
                  {formulaType === "CUSTOM" && (
                    <div className="p-4 bg-white rounded-xl border border-teal-200/80 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                          <Code className="w-3.5 h-3.5 text-teal-800" />
                          Trình soạn thảo Công thức Toán học Tùy biến:
                        </span>
                        <span className="text-[11px] text-slate-500">Bấm thẻ bên dưới để chèn nhanh</span>
                      </div>

                      {/* Quick Insertion Tokens */}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {columnNames.map((name, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFormulaCustom(prev => (prev ? `${prev} + ` : "") + `[col${idx}]`)}
                            className="px-2 py-1 bg-teal-50 hover:bg-teal-50 text-teal-800 border border-teal-200 rounded-md text-[11px] font-bold transition-all"
                          >
                            + [{name || `Cột ${idx + 1}`}]
                          </button>
                        ))}
                        {["+", "-", "*", "/", "(", ")"].map(op => (
                          <button
                            key={op}
                            type="button"
                            onClick={() => setFormulaCustom(prev => `${prev} ${op} `)}
                            className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-bold transition-all"
                          >
                            {op}
                          </button>
                        ))}
                      </div>

                      <div>
                        <input
                          type="text"
                          value={formulaCustom}
                          onChange={(e) => setFormulaCustom(e.target.value)}
                          placeholder="Ví dụ: ([col0] * 1 + [col1] * 2) / 3 hoặc [col0] * 0.4 + [col1] * 0.6"
                          className="w-full font-mono border border-teal-200 rounded-lg px-3 py-2 text-xs font-bold text-teal-800 bg-teal-50/20 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <div className="text-[11px] text-slate-500 mt-1">
                          Quy ước: <code className="text-teal-800 bg-teal-50 px-1 rounded">[col0]</code> là Cột 1, <code className="text-teal-800 bg-teal-50 px-1 rounded">[col1]</code> là Cột 2...
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rounding Rule Selector */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Quy tắc làm tròn số:</div>
                      <div className="text-[11px] text-slate-500">Áp dụng cho điểm tổng hợp khi lưu và hiển thị</div>
                    </div>
                    <select
                      value={roundingRule}
                      onChange={(e) => setRoundingRule(e.target.value as RoundingRule)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-[#48BFE3] outline-none"
                    >
                      <option value="ROUND_INT">Số nguyên (Ví dụ: 8.4 → 8, 8.5 → 9)</option>
                      <option value="ROUND_1">1 chữ số thập phân (Ví dụ: 8.67 → 8.7) - Chuẩn MOET</option>
                      <option value="ROUND_2">2 chữ số thập phân (Ví dụ: 8.667 → 8.67) - Chuẩn Quốc tế</option>
                      <option value="ROUND_HALF">Làm tròn đến 0.5 (Ví dụ: 8.3 → 8.5, 8.2 → 8.0)</option>
                      <option value="NONE">Giữ nguyên (Không làm tròn)</option>
                    </select>
                  </div>

                  {/* Interactive Formula Simulator / Live Tester */}
                  <div className="bg-gradient-to-br from-teal-900 to-[#003B3A] text-white rounded-xl p-4 shadow-md space-y-3">
                    <div className="flex items-center justify-between border-b border-teal-700/60 pb-2">
                      <div className="flex items-center gap-2 text-xs font-extrabold text-teal-200">
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        Thử nghiệm Công thức Trực tiếp (Live Simulator)
                      </div>
                      <span className="text-[10px] text-teal-300 font-medium">Nhập điểm thử bên dưới để xem kết quả tính tức thì</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 items-center">
                      {columnNames.map((name, idx) => {
                        const cType = columnTypes[idx] || "SCORE_10"
                        const colMax = getColumnMaxScore(cType, columnMaxScores, idx)
                        const currentVal = simScores[idx] || ""
                        const numVal = Number(currentVal.replace(",", "."))
                        const isOver = !isNaN(numVal) && numVal > colMax

                        return (
                          <div key={idx} className="bg-white/10 rounded-lg p-2 border border-white/10">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] font-semibold text-teal-200 truncate" title={name}>
                                {name || `Cột ${idx + 1}`}
                              </span>
                              {colMax !== 10 && (
                                <span className="text-[9px] bg-amber-400 text-slate-900 font-extrabold px-1 rounded shrink-0">
                                  Max {colMax}đ
                                </span>
                              )}
                            </div>
                            <input
                              type="text"
                              value={currentVal}
                              onChange={(e) => {
                                const val = e.target.value
                                setSimScores(prev => ({ ...prev, [idx]: val }))
                              }}
                              placeholder={`0 - ${colMax}`}
                              className={`w-full text-center font-black text-xs py-1 rounded border focus:outline-none focus:ring-2 ${
                                isOver
                                  ? "bg-rose-100 text-rose-900 border-rose-400 ring-2 ring-rose-400"
                                  : "bg-white text-slate-900 border-white/30 focus:ring-amber-400"
                              }`}
                              title={isOver ? `Điểm vượt quá tối đa ${colMax}đ` : `Tối đa ${colMax}đ`}
                            />
                          </div>
                        )
                      })}

                      {/* Computed Result Box */}
                      <div className="col-span-2 sm:col-span-1 bg-amber-400 text-slate-900 rounded-lg p-2 text-center shadow-lg">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-950">
                          {compositeColumnName || "Tổng hợp"}
                        </div>
                        <div className="text-lg font-black tracking-tight">
                          {calculateCompositeScore(
                            Object.fromEntries(Object.entries(simScores).map(([k, v]) => [`col${k}`, v])),
                            {
                              hasCompositeColumn: true,
                              formula: formulaType,
                              weights,
                              formulaCustom,
                              roundingRule,
                              columnCount
                            },
                            columnCount
                          ) || "---"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Checkbox Remark Option */}
            <div className="grid grid-cols-1 gap-4">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                <input
                  type="checkbox"
                  checked={hasRemark}
                  onChange={(e) => setHasRemark(e.target.checked)}
                  className="w-4 h-4 text-[#48BFE3] rounded border-slate-300 focus:ring-[#48BFE3]"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Cột Nhận xét của GVBM</div>
                  <div className="text-[11px] text-slate-500 font-normal">Cho phép GVBM nhập đánh giá/nhận xét cho từng học sinh</div>
                </div>
              </label>
            </div>

            {/* Live Excel Preview */}
            <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-200/60 space-y-2">
              <div className="text-xs font-bold text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Xem trước Cấu trúc Cột File nhập điểm Excel:
                </div>
                {hasComposite && (
                  <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Công thức: {getFormulaDescription({ formula: formulaType, weights, formulaCustom }, columnNames)}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <div className="inline-flex gap-1 py-1">
                  {["STT", "Mã HS", "Họ tên", "Môn học"].map(f => (
                    <span key={f} className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[11px] font-bold rounded-md border border-slate-300">
                      {f}
                    </span>
                  ))}
                  {columnNames.map((name, i) => {
                    const cType = columnTypes[i] || "SCORE_10"
                    const colMax = getColumnMaxScore(cType, columnMaxScores, i)
                    const isCustom = cType === "SCORE_CUSTOM" || cType === "SCORE_CUSTOM_100" || cType.startsWith("SCORE_MAX_") || (columnMaxScores[i] && columnMaxScores[i] !== 10 && columnMaxScores[i] !== 100)
                    const typeLabel = cType === "GRADE_SKL" ? "SKL: A/B/C/D" : cType === "GRADE_INTL" ? "Quốc tế: E/S/N/U" : cType === "REMARK" ? "Nhận xét" : (cType === "SCORE_100" || cType === "SCORE_1000") && !isCustom ? "Thang 100" : isCustom ? `Thang ${colMax}đ` : "Thang 10 MOET"
                    return (
                      <span key={i} className="px-2.5 py-1 bg-teal-100 text-teal-900 text-[11px] font-bold rounded-md border border-teal-300 flex items-center gap-1">
                        {name || `Cột ${i + 1}`}
                        <span className={`text-[9px] px-1 py-0.5 rounded font-normal ${isCustom ? "bg-amber-600 text-white font-bold" : "bg-teal-800 text-white"}`}>
                          {typeLabel}
                        </span>
                        {formulaType === "WEIGHTED" && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500 text-white font-black">
                            {weightedMode === "COEFF" ? `x${weights[i] || 1}` : `${weights[i] || 0}%`}
                          </span>
                        )}
                      </span>
                    )
                  })}
                  {hasComposite && (
                    <span className="px-2.5 py-1 bg-teal-50 text-teal-800 text-[11px] font-extrabold rounded-md border border-teal-200 flex items-center gap-1 shadow-sm">
                      <Calculator className="w-3 h-3 text-teal-800" />
                      {compositeColumnName || "Điểm thành phần"}
                    </span>
                  )}
                  {hasRemark && (
                    <span className="px-2.5 py-1 bg-teal-50 text-teal-800 text-[11px] font-bold rounded-md border border-teal-400">
                      Nhận xét
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E2E8F0]">
              <span className="text-xs text-slate-600">
                Đang áp dụng cho:{" "}
                <strong className="text-[#003B3A]">
                  {internalSelectedSubjectIds.length > 1
                    ? `${internalSelectedSubjectIds.length} môn đã chọn (${localSubjects.filter(s => internalSelectedSubjectIds.includes(s.id)).map(s => s.subjectName).join(", ")})`
                    : internalSelectedSubjectIds.length === 1
                    ? localSubjects.find(s => s.id === internalSelectedSubjectIds[0])?.subjectName || "1 môn"
                    : configSubjectId !== "ALL"
                    ? localSubjects.find(s => s.id === configSubjectId)?.subjectName || "1 môn"
                    : "Mẫu chung tất cả môn"}
                </strong>{" "}
                • {configGrade === "ALL" ? "Tất cả Khối" : configGrade} • {configPeriod === "ALL" ? "Tất cả Kỳ" : configPeriod}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveConfigForAllMainPeriods}
                  disabled={savingConfig}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#008B85] hover:bg-[#00736E] text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
                  title="Lưu và áp dụng mẫu cột này cho cả 4 kỳ chính khóa (GK1, CK1, GK2, CK2) của Khối đang chọn"
                >
                  {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-teal-100" />}
                  Lưu cho cả 4 Kỳ (GK1, CK1, GK2, CK2) — {configGrade === "ALL" ? "Tất cả Khối" : configGrade}
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#003B3A] hover:bg-[#002b2a] text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-[#5EEAD4]" />}
                  {internalSelectedSubjectIds.length > 1
                    ? `Lưu cho ${internalSelectedSubjectIds.length} môn (${configGrade} • ${configPeriod})`
                    : `Lưu Mẫu Sổ điểm riêng (${configGrade} • ${configPeriod})`}
                </button>
              </div>
            </div>
          </div>
        </div>
          )}
        </div>
      )}

      {/* TAB 2: GRADE ENTRY MANAGEMENT */}
      {activeTab === "grades" && (() => {
        const currentClass = classes.find(c => c.id === selectedClassId)
        const currentSubject = subjects.find(s => s.id === selectedSubjectId)
        const currentYearName = academicYears.find(y => y.id === selectedYearId)?.name || "2026-2027"
        const currentPeriodObj = EVAL_PERIODS.find(p => p.code === selectedPeriod)

        return (
          <div className="space-y-4">
            {/* BANNER ĐIỀU HƯỚNG NHANH SANG THỐNG KÊ BÁO CÁO */}
            <div className="bg-gradient-to-r from-teal-50 via-sky-50 to-emerald-50 border border-teal-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-600/10 text-teal-700 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4 text-teal-700" />
                </div>
                <div>
                  <span className="font-bold text-slate-800">Cần xem Báo cáo ĐTB môn, Phổ điểm, Tiến độ nộp điểm hoặc Duyệt mở sổ?</span>
                  <p className="text-[11px] text-slate-500">Các tính năng báo cáo thống kê chuyên sâu và giám sát nhập điểm đã được chuyển sang phân hệ chuyên biệt.</p>
                </div>
              </div>
              <Link
                href="/admin/ktdbcl/phan-tich-thkq"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#005B58] hover:bg-[#004845] text-white font-bold text-xs shrink-0 shadow-sm transition-all"
              >
                <span>Mở Phân tích THKQ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* THANH HEADER BỘ LỌC CHUẨN SIS TRƯỜNG HỌC */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              {/* Dòng 1: Bộ lọc chính */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#005B58]/10 text-[#005B58] flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <span className="text-[#005B58]">[{currentYearName}]</span> Sổ điểm
                      </h2>
                      <p className="text-[11px] text-slate-500">Quản lý và nhập bảng điểm điện tử học sinh • Đang chọn: <strong className="text-[#003B3A]">{savePeriodMeta.full}</strong></p>
                    </div>
                  </div>

                  {/* Bộ chọn nhanh Học kỳ 1 / Học kỳ 2 ngay tại thanh nhập điểm */}
                  <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-[#E2E8F0] tabular-nums">
                    <button
                      type="button"
                      onClick={() => handleSelectSemester(1)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        activeSemester === 1
                          ? "bg-[#003B3A] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Học kỳ 1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectSemester(2)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        activeSemester === 2
                          ? "bg-[#003B3A] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Học kỳ 2
                    </button>
                  </div>
                </div>

                {/* Nút hành động */}
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportExcel}
                    accept=".xlsx, .xls"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => setIsCommentModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 rounded-xl text-xs font-bold transition-all shadow-sm"
                    title="Tự động điền nhận xét sư phạm theo mức điểm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Nhập nhận xét theo khoảng điểm
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsBulkExportModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#005B58] hover:bg-[#004845] text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all"
                    title="Xuất bảng điểm tất cả các môn theo cơ sở, mỗi môn 1 Sheet"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
                    Xuất Excel Kỳ khảo sát (Đa Sheet)
                  </button>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all"
                    title="Xuất bảng điểm cho lớp và môn đang chọn"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Xuất Excel (1 Lớp)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPendingVnEduFiles([])
                      setIsVnEduImportOpen(true)
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#008B85] hover:bg-[#00736E] text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
                    title="Import 1 hoặc nhiều file Excel nhiều sheet (mỗi sheet là 1 môn học)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Import Excel (Nhiều sheet / Các môn)
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 rounded-xl text-xs font-bold transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Excel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveGradeSheet}
                    disabled={savingEntries}
                    title={`Lưu sổ điểm ${savePeriodMeta.full}`}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[#003B3A] hover:bg-[#002B2A] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {savingEntries ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-[#5EEAD4]" />}
                    {savingEntries ? "Đang lưu..." : `Lưu điểm ${savePeriodMeta.short}`}
                  </button>
                </div>
              </div>

              {/* Dòng 2: Các Dropdown lọc chuẩn trường học (Cơ sở -> Khối -> Lớp -> Môn -> Kỳ) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* 1. Cơ sở (Lấy từ bảng Campus) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Cơ sở:</label>
                  <select
                    value={selectedCampusId}
                    onChange={(e) => setSelectedCampusId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-slate-50"
                  >
                    <option value="ALL">-- Tất cả Cơ sở --</option>
                    {campuses.map((cp: any) => (
                      <option key={cp.id} value={cp.id}>{cp.campusName}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Khối */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Khối:</label>
                  <select
                    value={selectedGradeFilter}
                    onChange={(e) => setSelectedGradeFilter(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-slate-50"
                  >
                    <option value="ALL">-- Tất cả Khối --</option>
                    {GRADES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Lớp học */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Lớp ({filteredClasses.length}):
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full border border-teal-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#005B58] focus:ring-2 focus:ring-[#005B58] outline-none bg-teal-50/40"
                  >
                    {filteredClasses.map(c => (
                      <option key={c.id} value={c.id}>{c.className}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Học kỳ / Kỳ khảo sát */}
                <div>
                  <label className="block text-[11px] font-bold text-teal-800 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    Kỳ khảo sát:
                  </label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full border border-teal-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-teal-900 focus:ring-2 focus:ring-[#005B58] outline-none bg-teal-50"
                  >
                    {EVAL_PERIODS.map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* 5. Môn theo Kỳ khảo sát */}
                <div className="min-w-[210px] flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <span>Môn học:</span>
                      {availableSubjectsForTab2.length > 0 && (
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                          {availableSubjectsForTab2.length} môn theo kỳ
                        </span>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAllTab2Subjects(!showAllTab2Subjects)}
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors border ${
                        showAllTab2Subjects
                          ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      }`}
                      title={showAllTab2Subjects ? "Chỉ hiển thị các môn đã gán theo kỳ" : "Mở rộng hiển thị toàn bộ môn học"}
                    >
                      {showAllTab2Subjects ? "Chỉ môn theo kỳ" : "+ Tất cả môn"}
                    </button>
                  </div>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white shadow-sm cursor-pointer"
                  >
                    {availableSubjectsForTab2.length > 0 ? (
                      <>
                        <optgroup label={`⭐ Môn theo Kỳ khảo sát (${availableSubjectsForTab2.length} môn)`}>
                          {availableSubjectsForTab2.map(s => {
                            const ta = currentClass?.teachingAssignments?.find((t: any) => t.subjectId === s.id)
                            const teacherNote = ta?.teacher?.teacherName ? ` - GV: ${ta.teacher.teacherName}` : ""
                            return (
                              <option key={s.id} value={s.id}>
                                {s.subjectName} ({s.subjectCode}){teacherNote}
                              </option>
                            )
                          })}
                        </optgroup>
                        {classAssignedSubjects.filter(cs => !availableSubjectsForTab2.some(as => as.id === cs.id)).length > 0 && (
                          <optgroup label="📚 Môn theo Phân công giảng dạy của lớp">
                            {classAssignedSubjects
                              .filter(cs => !availableSubjectsForTab2.some(as => as.id === cs.id))
                              .map(s => {
                                const ta = currentClass?.teachingAssignments?.find((t: any) => t.subjectId === s.id)
                                const teacherNote = ta?.teacher?.teacherName ? ` - GV: ${ta.teacher.teacherName}` : ""
                                return (
                                  <option key={s.id} value={s.id}>
                                    {s.subjectName} ({s.subjectCode}){teacherNote}
                                  </option>
                                )
                              })}
                          </optgroup>
                        )}
                        {showAllTab2Subjects && (
                          <optgroup label="── Các môn khác của Khối / Hệ thống ──">
                            {subjects
                              .filter(s => !availableSubjectsForTab2.some(a => a.id === s.id) && !classAssignedSubjects.some(cs => cs.id === s.id))
                              .map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.subjectName} ({s.subjectCode})
                                </option>
                              ))}
                          </optgroup>
                        )}
                      </>
                    ) : classAssignedSubjects.length > 0 ? (
                      <>
                        <option value="" disabled>-- Chưa có môn gán riêng cho kỳ này --</option>
                        <optgroup label={`📚 Môn theo Phân công giảng dạy của lớp (${classAssignedSubjects.length} môn)`}>
                          {classAssignedSubjects.map(s => {
                            const ta = currentClass?.teachingAssignments?.find((t: any) => t.subjectId === s.id)
                            const teacherNote = ta?.teacher?.teacherName ? ` - GV: ${ta.teacher.teacherName}` : ""
                            return (
                              <option key={s.id} value={s.id}>
                                {s.subjectName} ({s.subjectCode}){teacherNote}
                              </option>
                            )
                          })}
                        </optgroup>
                        {showAllTab2Subjects && (
                          <optgroup label="── Tất cả môn học khác ──">
                            {subjects
                              .filter(s => !classAssignedSubjects.some(cs => cs.id === s.id))
                              .map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.subjectName} ({s.subjectCode})
                                </option>
                              ))}
                          </optgroup>
                        )}
                      </>
                    ) : (
                      <>
                        <option value="" disabled>-- Chưa có môn gán riêng cho kỳ này --</option>
                        <optgroup label="Danh sách tất cả môn học (Dùng mẫu chuẩn 10đ)">
                          {subjects.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.subjectName} ({s.subjectCode})
                            </option>
                          ))}
                        </optgroup>
                      </>
                    )}
                  </select>
                </div>

                {/* Nút Refresh */}
                <div className="flex items-end">
                  <button
                    onClick={fetchGradeSheet}
                    disabled={loadingSheet}
                    className="w-full flex items-center justify-center gap-1.5 p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                    title="Tải lại bảng điểm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSheet ? "animate-spin text-[#005B58]" : ""}`} />
                    Tải lại
                  </button>
                </div>
              </div>
            </div>

            {/* THANH CHỌN LOẠI SỔ ĐIỂM & TÌM KIẾM MÃ HS / MÃ VNEDU / HỌ TÊN */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      if (isKsdnSelected) {
                        setSelectedPeriod("CK1")
                      }
                      setGradebookSourceMode("VNEDU")
                      if (isSelectedSubjectInternalOnly) {
                        const firstMoet = subjects.find(s => getSubjectCurriculumGroup(s) === "MOET")
                        if (firstMoet) setSelectedSubjectId(firstMoet.id)
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      effectiveGradebookSourceMode === "VNEDU"
                        ? "bg-[#003B3A] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="Sổ điểm theo vnEdu (Môn Bộ GD&ĐT)"
                  >
                    1. Sổ điểm theo vnEdu (Môn Bộ GD&amp;ĐT)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGradebookSourceMode("INTERNAL")
                      if (!isSelectedSubjectInternalOnly && !isKsdnSelected) {
                        const firstBil = subjects.find(s => getSubjectCurriculumGroup(s) === "BILINGUAL")
                        if (firstBil) setSelectedSubjectId(firstBil.id)
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      effectiveGradebookSourceMode === "INTERNAL"
                        ? "bg-[#003B3A] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    2. Sổ điểm riêng: Đánh giá nội bộ Sky-Line (Môn Song ngữ &amp; Quốc tế)
                  </button>
                </div>
                {isSelectedSubjectInternalOnly && (
                  <span className="px-2.5 py-1 rounded-lg bg-[#F0FDFA] text-[#003B3A] border border-[#008B85]/40 text-[11px] font-semibold">
                    Sổ điểm riêng Môn Song ngữ &amp; Quốc tế: {selectedSubjectObjForTab2?.subjectName}
                  </span>
                )}
                {isKsdnSelected && (
                  <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-[#003B3A] border border-teal-200 text-[11px] font-semibold">
                    KSĐN lấy cấu hình các môn theo 2. Đánh giá nội bộ Sky-Line
                  </span>
                )}
              </div>
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={gradebookSearch}
                  onChange={(e) => setGradebookSearch(e.target.value)}
                  placeholder="Tìm theo Mã HS, Mã vnEdu hoặc Họ tên..."
                  className="w-full border border-[#E2E8F0] rounded-xl pl-8 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-[#003B3A] outline-none"
                />
              </div>
            </div>

            {effectiveGradebookSourceMode === "VNEDU" &&
            isPrimaryGrade(currentClass?.grade || currentClass?.className || selectedGradeFilter) &&
            gradeSheetData.config?.configType !== "INTERNAL" &&
            !gradeSheetData.config?.hasCompositeColumn &&
            activeColNames.length <= 1 ? (
              loadingSheet ? (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] py-16 text-center text-slate-500 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#003B3A]" />
                  <p className="text-xs font-semibold">Đang tải dữ liệu Sổ nhận xét Tiểu học...</p>
                </div>
              ) : gradeSheetData.students.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] py-16 text-center text-slate-400 italic text-xs space-y-2">
                  <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Lớp học này chưa có học sinh hoặc chưa có dữ liệu điểm.</p>
                </div>
              ) : (
                <VnEduPrimaryGradebook
                  academicYearName={currentYearName}
                  classObj={currentClass}
                  subjectObj={currentSubject}
                  evaluationPeriod={selectedPeriod}
                  onChangePeriod={(nextP) => setSelectedPeriod(nextP)}
                  teacherName={assignedTeacher || "Chưa phân công"}
                  roleLabel="Quản trị viên (Bạn có quyền nhập điểm)"
                  config={gradeSheetData.config}
                  students={gradeSheetData.students}
                  entries={gradeSheetData.entries}
                  searchKeyword={gradebookSearch}
                  onChangeScore={handleScoreChange}
                  onChangeRating={handleRatingChange}
                  onChangeRemark={handleRemarkChange}
                  onBulkUpdateEntries={(updater) =>
                    setGradeSheetData(prev => ({
                      ...prev,
                      entries: updater(prev.entries),
                    }))
                  }
                  onOpenMultiSheetImport={() => {
                    setPendingVnEduFiles([])
                    setIsVnEduImportOpen(true)
                  }}
                  onSave={handleSaveGradeSheet}
                  saving={savingEntries}
                />
              )
            ) : effectiveGradebookSourceMode === "VNEDU" &&
              !isPrimaryGrade(currentClass?.grade || currentClass?.className || selectedGradeFilter) &&
              gradeSheetData.config?.configType !== "INTERNAL" ? (
              loadingSheet ? (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] py-16 text-center text-slate-500 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#003B3A]" />
                  <p className="text-xs font-semibold">Đang tải dữ liệu Sổ điểm chi tiết THCS/THPT (Thông tư 22)...</p>
                </div>
              ) : gradeSheetData.students.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] py-16 text-center text-slate-400 italic text-xs space-y-2">
                  <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Lớp học này chưa có học sinh hoặc chưa có dữ liệu điểm.</p>
                </div>
              ) : (
                <VnEduSecondaryGradebook
                  classObj={currentClass}
                  subjectObj={currentSubject}
                  evaluationPeriod={selectedPeriod}
                  onChangePeriod={(nextP) => setSelectedPeriod(nextP)}
                  teacherName={assignedTeacher || "Chưa phân công"}
                  roleLabel="Bạn có quyền Admin"
                  config={gradeSheetData.config}
                  students={gradeSheetData.students}
                  entries={gradeSheetData.entries}
                  searchKeyword={gradebookSearch}
                  onChangeScore={handleScoreChange}
                  onChangeRating={handleRatingChange}
                  onChangeRemark={handleRemarkChange}
                  onBulkUpdateEntries={(updater) =>
                    setGradeSheetData(prev => ({
                      ...prev,
                      entries: updater(prev.entries),
                    }))
                  }
                  onOpenMultiSheetImport={() => {
                    setPendingVnEduFiles([])
                    setIsVnEduImportOpen(true)
                  }}
                  onSave={handleSaveGradeSheet}
                  saving={savingEntries}
                />
              )
            ) : (
              <>
            {/* BANNER THÔNG TIN NGỮ CẢNH SỔ ĐIỂM CHI TIẾT */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-slate-800 uppercase tracking-wide bg-slate-200 px-2 py-0.5 rounded text-[11px]">
                    SỔ ĐIỂM CHI TIẾT
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>Lớp: <strong className="text-teal-800 font-bold">{currentClass?.className || "Chưa chọn"}</strong></span>
                  <span className="text-slate-400">•</span>
                  <span>Môn học: <strong className="text-teal-800 font-bold">{currentSubject?.subjectName || "Chưa chọn"}</strong> ({currentPeriodObj?.name || selectedPeriod})</span>
                  <span className="text-slate-400">•</span>
                  <span>Giáo viên dạy: <strong className="text-slate-800 font-semibold">{assignedTeacher || "Lê Thành Danh"}</strong></span>
                  <span className="text-slate-400">•</span>
                  <span className="text-emerald-700 font-medium">Quyền hạn: <strong>Quản trị viên (Admin)</strong></span>
                </div>
                <div className="text-[11px] text-rose-600 font-medium italic pt-0.5">
                  (Ghi chú: Sau khi có điểm thi học kỳ hệ thống mới tính Điểm DTBmhk của môn học. Giáo viên giảng dạy chỉ có thể sửa các con điểm chưa bị khóa sổ).
                </div>
              </div>
            </div>

            {/* BẢNG SỔ ĐIỂM ĐIỆN TỬ CHUẨN TRƯỜNG HỌC (KHÔNG CÓ CỘT LIÊN LẠC) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {loadingSheet ? (
                <div className="py-16 text-center text-slate-500 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#005B58]" />
                  <p className="text-xs font-semibold">Đang tải dữ liệu sổ điểm...</p>
                </div>
              ) : gradeSheetData.students.length === 0 ? (
                <div className="py-16 text-center text-slate-400 italic text-xs space-y-2">
                  <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Lớp học này chưa có học sinh hoặc chưa có dữ liệu điểm.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                      {/* DÒNG TIÊU ĐỀ CẤP 1 */}
                      <tr className="border-b text-[11px] font-semibold">
                        <th rowSpan={activeColNames.length > 0 ? 2 : 1} className="py-3 px-3 text-center border-r border-white/15 w-12 bg-[#003B3A] font-semibold">STT</th>
                        <th rowSpan={activeColNames.length > 0 ? 2 : 1} className="py-3 px-3 border-r border-white/15 min-w-[100px] bg-[#003B3A] font-semibold">Mã HS</th>
                        <th rowSpan={activeColNames.length > 0 ? 2 : 1} className="py-3 px-3 border-r border-white/15 min-w-[110px] bg-[#003B3A] text-teal-100 font-semibold">Mã vnEdu</th>
                        <th rowSpan={activeColNames.length > 0 ? 2 : 1} className="py-3 px-4 border-r border-white/15 min-w-[180px] bg-[#003B3A] font-semibold">Họ và tên</th>
                        <th rowSpan={activeColNames.length > 0 ? 2 : 1} className="py-3 px-3 text-center border-r border-white/15 min-w-[95px] bg-[#003B3A] font-semibold">Ngày sinh</th>

                        {/* Cụm cột Đánh giá thường xuyên / thành phần */}
                        {activeColNames.length > 0 && (
                          <th
                            colSpan={activeColNames.length}
                            className="py-2 px-3 text-center border-r border-white/15 bg-[#003B3A] text-teal-100 text-[11px] font-semibold"
                          >
                            Kết quả thành phần
                          </th>
                        )}

                        {/* Cột Tổng hợp / DTBmhk */}
                        {gradeSheetData.config?.hasCompositeColumn !== false && activeColNames.length > 0 && (
                          <th
                            rowSpan={activeColNames.length > 0 ? 2 : 1}
                            className="py-3 px-3 text-center border-r border-white/15 bg-[#003B3A] text-[#5EEAD4] min-w-[95px] font-semibold"
                          >
                            {gradeSheetData.config?.compositeColumnName || "DTBmhk"}
                          </th>
                        )}

                        {/* Cột Xếp loại */}
                        {gradeSheetData.config?.hasRatingColumn && (
                          <th
                            rowSpan={activeColNames.length > 0 ? 2 : 1}
                            className="py-3 px-3 text-center border-r border-white/15 bg-[#003B3A] text-[#5EEAD4] min-w-[90px] font-semibold"
                          >
                            {gradeSheetData.config?.ratingColumnName || "Xếp loại"}
                          </th>
                        )}

                        {/* Cột Nhận xét */}
                        {gradeSheetData.config?.hasRemarkColumn !== false && (
                          <th rowSpan={activeColNames.length > 0 ? 2 : 1} className="py-3 px-4 border-white/15 bg-[#003B3A] min-w-[220px] font-semibold">
                            Nhận xét
                          </th>
                        )}
                      </tr>

                      {/* DÒNG TIÊU ĐỀ CẤP 2 (CÁC CỘT THÀNH PHẦN) */}
                      {activeColNames.length > 0 && (
                      <tr className="border-b text-[11px] font-semibold">
                        {activeColNames.map((colName: string, cIdx: number) => {
                          const colType = activeColTypes[cIdx] || "SCORE_10"
                          const colMax = getColumnMaxScore(colType, gradeSheetData.config?.columnMaxScores, cIdx)
                          const label = colName || `TX${cIdx + 1}`

                          return (
                            <th
                              key={cIdx}
                              className="py-2 px-2 text-center border-r border-white/15 bg-[#003B3A] min-w-[75px] font-semibold"
                              title={`${colName} (Tối đa ${colMax}đ)`}
                            >
                              <div>{label}</div>
                              {colMax !== 10 && (
                                <span className="text-[9px] text-amber-300 font-semibold block">TĐ {colMax}đ</span>
                              )}
                            </th>
                          )
                        })}
                      </tr>
                      )}
                    </thead>

                    <tbody className="divide-y divide-[#E2E8F0] tabular-nums">
                      {gradeSheetData.students
                        .filter(st => {
                          const kw = gradebookSearch.trim().toLowerCase()
                          if (!kw) return true
                          return (
                            String(st.studentCode || "").toLowerCase().includes(kw) ||
                            String(st.vnEduCode || "").toLowerCase().includes(kw) ||
                            String(st.studentName || "").toLowerCase().includes(kw)
                          )
                        })
                        .map((st, sIdx) => {
                        const entry = gradeSheetData.entries[st.id] || { componentScores: {}, compositeScore: "", ratingValue: "", remark: "" }

                        return (
                          <tr key={st.id} className="hover:bg-[#F8FAFC] transition-colors align-middle">
                            <td className="py-2 px-3 text-center font-bold text-slate-500 border-r border-slate-200 bg-slate-50/50">
                              {sIdx + 1}
                            </td>
                            <td className="py-2 px-3 font-mono font-medium text-slate-600 border-r border-slate-200">
                              {st.studentCode}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-700 border-r border-slate-200">
                              {editingVnEduStudentId === st.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={tempVnEduCode}
                                    onChange={e => setTempVnEduCode(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === "Enter") handleSaveInlineVnEduCode(st)
                                      if (e.key === "Escape") setEditingVnEduStudentId(null)
                                    }}
                                    placeholder="Nhập mã vnEdu..."
                                    autoFocus
                                    disabled={savingVnEduCode}
                                    className="w-28 px-2 py-1 text-xs border border-[#008B85] rounded-md focus:outline-none focus:ring-2 focus:ring-[#00A19A]/30 font-mono tabular-nums bg-white text-[#003B3A]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveInlineVnEduCode(st)}
                                    disabled={savingVnEduCode}
                                    className="p-1 bg-[#059669] hover:bg-emerald-700 text-white rounded transition-colors disabled:opacity-50"
                                    title="Lưu Mã vnEdu (Enter)"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingVnEduStudentId(null)}
                                    disabled={savingVnEduCode}
                                    className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors"
                                    title="Hủy (Esc)"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : st.vnEduCode ? (
                                <div className="flex items-center justify-between gap-1.5 group">
                                  <span className="font-medium text-[#003B3A] tabular-nums">{st.vnEduCode}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingVnEduStudentId(st.id)
                                      setTempVnEduCode(st.vnEduCode || "")
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-[#003B3A] hover:bg-teal-50 rounded transition-all cursor-pointer"
                                    title="Cập nhật Mã vnEdu"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingVnEduStudentId(st.id)
                                    setTempVnEduCode("")
                                  }}
                                  className="text-[11px] text-slate-400 hover:text-[#008B85] italic font-sans inline-flex items-center gap-1 group cursor-pointer transition-colors"
                                  title="Bấm để nhập Mã vnEdu cho học sinh"
                                >
                                  <span>Chưa cập nhật</span>
                                  <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-[#008B85] transition-opacity" />
                                </button>
                              )}
                            </td>
                            <td className="py-2 px-4 font-bold text-slate-900 border-r border-slate-200">
                              {st.studentName}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-slate-600 border-r border-slate-200 text-[11px]">
                              {formatDob(st.dateOfBirth)}
                            </td>

                            {/* Cột điểm thành phần */}
                            {activeColNames.map((_: any, cIdx: number) => {
                              const colType = activeColTypes[cIdx] || "SCORE_10"
                              const val = entry.componentScores[`col${cIdx}`] ?? ""
                              const colMax = getColumnMaxScore(colType, gradeSheetData.config?.columnMaxScores, cIdx)
                              const numVal = Number(String(val).replace(",", "."))
                              const isOver = !isNaN(numVal) && numVal > colMax
                              const isLow = !isNaN(numVal) && numVal < 5.0 && val !== ""
                              const isHigh = !isNaN(numVal) && numVal >= 8.0

                              return (
                                <td
                                  key={cIdx}
                                  className="py-1.5 px-2 text-center border-r border-slate-200 relative min-w-[75px]"
                                >
                                  {/* Dấu tam giác nhỏ kiểu Excel */}
                                  {val !== "" && (
                                    <span className="absolute top-0.5 left-0.5 w-0 h-0 border-t-[5px] border-t-emerald-600 border-r-[5px] border-r-transparent pointer-events-none" />
                                  )}
                                  <input
                                    type="text"
                                    data-row={sIdx}
                                    data-col={cIdx}
                                    value={val}
                                    onChange={(e) => handleScoreChange(st.id, cIdx, e.target.value)}
                                    onKeyDown={(e) => handleScoreKeyDown(e, sIdx, cIdx)}
                                    className={`w-14 text-center border rounded-lg py-1 text-xs font-black outline-none transition-all ${
                                      isOver
                                        ? "border-rose-500 bg-rose-100 text-rose-700 ring-2 ring-rose-300 font-black"
                                        : isLow
                                        ? "border-rose-300 bg-rose-50 text-rose-700 font-black"
                                        : isHigh
                                        ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-black"
                                        : "border-slate-200 text-slate-800 focus:ring-2 focus:ring-[#005B58] focus:border-[#005B58]"
                                    }`}
                                    placeholder="-"
                                    title={isOver ? `Vượt quá tối đa ${colMax}đ` : `Tối đa ${colMax}đ`}
                                  />
                                </td>
                              )
                            })}

                            {/* Cột Điểm tổng hợp DTBmhk */}
                            {gradeSheetData.config?.hasCompositeColumn !== false && activeColNames.length > 0 && (
                              <td className="py-2 px-3 text-center border-r border-slate-200 bg-teal-50/40">
                                <span className={`font-black text-xs px-2 py-0.5 rounded-md inline-block ${
                                  entry.compositeScore !== "" && Number(entry.compositeScore) < 5.0
                                    ? "bg-rose-100 text-rose-700"
                                    : entry.compositeScore !== "" && Number(entry.compositeScore) >= 8.0
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "text-[#005B58]"
                                }`}>
                                  {entry.compositeScore || "-"}
                                </span>
                              </td>
                            )}

                            {/* Cột Xếp loại */}
                            {gradeSheetData.config?.hasRatingColumn && (
                              <td className="py-1.5 px-2 text-center border-r border-slate-200">
                                <input
                                  type="text"
                                  value={entry.ratingValue ?? ""}
                                  onChange={(e) => handleRatingChange(st.id, e.target.value)}
                                  placeholder="Đ / T / H..."
                                  className="w-16 text-center border border-slate-200 rounded-lg py-1 text-xs font-bold text-[#003B3A] focus:ring-2 focus:ring-[#005B58] outline-none"
                                />
                              </td>
                            )}

                            {/* Cột Nhận xét */}
                            {gradeSheetData.config?.hasRemarkColumn !== false && (
                              <td className="py-1.5 px-3">
                                <input
                                  type="text"
                                  value={entry.remark ?? ""}
                                  onChange={(e) => handleRemarkChange(st.id, e.target.value)}
                                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none"
                                  placeholder="Nhập nhận xét..."
                                />
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* THỐNG KÊ NHANH CHÂN BẢNG SỔ ĐIỂM */}
              {gradeSheetData.students.length > 0 && (
                <div className="bg-slate-50 border-t border-slate-200 p-3 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-600">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span>Sĩ số: <strong className="text-slate-900 font-bold">{gradeSheetStats.total}</strong> HS</span>
                    <span>•</span>
                    <span>Đã có điểm: <strong className="text-teal-700 font-bold">{gradeSheetStats.graded}</strong> / {gradeSheetStats.total}</span>
                    <span>•</span>
                    <span>Điểm TB cả lớp: <strong className="text-[#005B58] font-black">{gradeSheetStats.avgScore}</strong></span>
                    <span>•</span>
                    <span>Tỷ lệ Đạt (≥ 5.0đ): <strong className="text-emerald-700 font-bold">{gradeSheetStats.passRate}%</strong></span>
                  </div>
                  <div className="text-[11px] text-slate-500 italic">
                    * Bấm phím <strong>Enter</strong> hoặc <strong>↓</strong> để tự động nhảy xuống học sinh tiếp theo.
                  </div>
                </div>
              )}
            </div>
            </>
            )}

            {/* MODAL NHẬP NHẬN XÉT THEO KHOẢNG ĐIỂM */}
            {isCommentModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xl max-w-lg w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-600" />
                      <h3 className="text-base font-bold text-slate-800">Nhập nhận xét theo khoảng điểm</h3>
                    </div>
                    <button
                      onClick={() => setIsCommentModalOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500">
                    Hệ thống sẽ tự động đối chiếu Điểm tổng hợp của từng học sinh để điền nhận xét sư phạm tương ứng.
                  </p>

                  <div className="space-y-3 text-xs">
                    {/* Giỏi */}
                    <div>
                      <label className="font-bold text-emerald-800 flex items-center gap-1.5 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        Điểm Giỏi (từ 8.0 đến 10.0đ):
                      </label>
                      <input
                        type="text"
                        value={commentTemplates.good}
                        onChange={(e) => setCommentTemplates({ ...commentTemplates, good: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none"
                      />
                    </div>

                    {/* Khá */}
                    <div>
                      <label className="font-bold text-teal-800 flex items-center gap-1.5 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                        Điểm Khá (từ 6.5 đến 7.9đ):
                      </label>
                      <input
                        type="text"
                        value={commentTemplates.fair}
                        onChange={(e) => setCommentTemplates({ ...commentTemplates, fair: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none"
                      />
                    </div>

                    {/* Trung bình */}
                    <div>
                      <label className="font-bold text-amber-800 flex items-center gap-1.5 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                        Điểm Trung bình (từ 5.0 đến 6.4đ):
                      </label>
                      <input
                        type="text"
                        value={commentTemplates.average}
                        onChange={(e) => setCommentTemplates({ ...commentTemplates, average: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none"
                      />
                    </div>

                    {/* Yếu */}
                    <div>
                      <label className="font-bold text-rose-800 flex items-center gap-1.5 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                        Điểm Cần bám sát / Yếu (dưới 5.0đ):
                      </label>
                      <input
                        type="text"
                        value={commentTemplates.poor}
                        onChange={(e) => setCommentTemplates({ ...commentTemplates, poor: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsCommentModalOpen(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyBulkComments}
                      className="px-4 py-2 bg-[#005B58] hover:bg-[#004845] text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      Áp dụng nhận xét cho cả lớp
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* TAB 3: ĐIỂM TỔNG KẾT THCS & THPT */}
      {activeTab === "term-grades" && (
        <TermGradesTab
          campuses={campuses}
          classes={classes}
          subjects={subjects}
          academicYears={academicYears}
          activeYearId={selectedYearId}
          isSubjectScoped={isSubjectScoped}
          externalSemester={termTabSemester}
          onExternalSemesterChange={setTermTabSemester}
        />
      )}
    
      {/* MODAL: GÁN MÔN THEO KỲ KHẢO SÁT & THIẾT LẬP CẤU HÌNH HÀNG LOẠT */}
      {isBatchAssignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#48BFE3] flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Gán Môn học theo Kỳ khảo sát</h3>
                  <p className="text-xs text-slate-500">Thiết lập danh sách môn tham gia khảo sát và tạo cấu hình mẫu hàng loạt</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchAssignOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Step 1 & 2: Select Period and Grade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">1. Kỳ khảo sát / Đánh giá:</label>
                  <select
                    value={batchPeriod}
                    onChange={(e) => handleBatchPeriodOrGradeChange(e.target.value, batchGrade)}
                    className="w-full border border-teal-300 rounded-xl px-3 py-2 text-xs font-bold text-teal-900 bg-white focus:ring-2 focus:ring-[#48BFE3] outline-none"
                  >
                    {EVAL_PERIODS.map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">2. Áp dụng Khối học:</label>
                  <select
                    value={batchGrade}
                    onChange={(e) => handleBatchPeriodOrGradeChange(batchPeriod, e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-[#48BFE3] outline-none"
                  >
                    {GRADES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 3: Choose Subjects (Bilingual & International + Optional Added Subjects) */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-teal-600" />
                    3. Chọn các Môn Song ngữ &amp; Quốc tế ({batchSelectedSubjectIds.length}/{allBilingualSubjects.length}):
                  </span>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setIsAddMoreSubjectOpen(prev => !prev)}
                      className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200 rounded font-semibold transition-all"
                    >
                      + Tùy chọn bổ sung thêm môn
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSelectSubjects("ALL")}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold transition-all"
                    >
                      Chọn tất cả ({allBilingualSubjects.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSelectSubjects("NONE")}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold transition-all"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                {isAddMoreSubjectOpen && (
                  <div className="p-2.5 rounded-xl bg-teal-50/50 border border-teal-200 space-y-2 text-xs">
                    <div className="font-semibold text-[#003B3A] text-[11px]">
                      Tick chọn môn học khác để bổ sung vào danh sách:
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                      {candidateSubjectsToAdd.map(s => {
                        const isAdded = customAddedSubjectIds.includes(s.id)
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              toggleCustomAddedSubject(s.id)
                              if (!isAdded) {
                                setBatchSelectedSubjectIds(prev => Array.from(new Set([...prev, s.id])))
                              }
                            }}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1 ${
                              isAdded
                                ? "bg-[#003B3A] text-white border-[#003B3A]"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>{s.subjectName} ({s.subjectCode})</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50/70 rounded-xl border border-slate-200 max-h-[220px] overflow-y-auto">
                  {allBilingualSubjects.map(s => {
                    const isChecked = batchSelectedSubjectIds.includes(s.id)
                    const isConfiguredAlready = savedConfigs.some(
                      c => (c.evaluationPeriod === batchPeriod || c.evaluationPeriod === "ALL") && isGradeMatching(c.grade, batchGrade) && c.subjectId === s.id
                    )

                    return (
                      <label
                        key={s.id}
                        onClick={() => toggleBatchSubject(s.id)}
                        className={`p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all flex items-center gap-2 select-none ${
                          isChecked
                            ? "bg-teal-50 text-teal-900 border-teal-300 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100/70"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 text-teal-600 rounded border-slate-300 focus:ring-teal-500 pointer-events-none"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-[11.5px]">{s.subjectName}</div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <span>{s.subjectCode}</span>
                            {isConfiguredAlready && (
                              <span className="text-[9px] text-teal-700 bg-teal-100/80 px-1 rounded font-bold">
                                Đã gán
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Step 4: Choose Template for assigned subjects */}
              <div className="space-y-2 p-3.5 bg-teal-50/40 rounded-xl border border-teal-100">
                <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-teal-600" />
                  4. Áp dụng Mẫu Cột điểm & Công thức cho các môn được chọn:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 text-xs">
                  <label
                    onClick={() => setBatchTemplateType("KEEP_EXISTING")}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      batchTemplateType === "KEEP_EXISTING"
                        ? "bg-teal-50 border-teal-500 text-teal-950 ring-2 ring-teal-400/40 shadow-sm"
                        : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 text-teal-800">
                      <input type="radio" checked={batchTemplateType === "KEEP_EXISTING"} onChange={() => {}} className="pointer-events-none" />
                      Kế thừa mẫu từng môn
                    </div>
                    <div className="text-[10.5px] text-teal-700 font-semibold mt-0.5">
                      (Khuyên dùng)
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Giữ nguyên cấu hình riêng (Toán, Văn, Anh, ESL...). Môn mới áp mẫu form.
                    </div>
                  </label>

                  <label
                    onClick={() => setBatchTemplateType("CURRENT")}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      batchTemplateType === "CURRENT"
                        ? "bg-white border-teal-400 text-teal-950 ring-2 ring-teal-400/40 shadow-sm"
                        : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <input type="radio" checked={batchTemplateType === "CURRENT"} onChange={() => {}} className="pointer-events-none" />
                      Mẫu đang trên Form
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {columnCount} cột điểm ({columnNames.slice(0, 2).join(", ")}...)
                    </div>
                  </label>

                  <label
                    onClick={() => setBatchTemplateType("2_COL_TEST")}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      batchTemplateType === "2_COL_TEST"
                        ? "bg-white border-teal-400 text-teal-950 ring-2 ring-teal-400/40 shadow-sm"
                        : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <input type="radio" checked={batchTemplateType === "2_COL_TEST"} onChange={() => {}} className="pointer-events-none" />
                      2 cột Trắc nghiệm
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      TN ABCD (6đ) + TN Đúng sai (4đ) → Tổng điểm
                    </div>
                  </label>

                  <label
                    onClick={() => setBatchTemplateType("3_COL_STANDARD")}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      batchTemplateType === "3_COL_STANDARD"
                        ? "bg-white border-teal-400 text-teal-950 ring-2 ring-teal-400/40 shadow-sm"
                        : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <input type="radio" checked={batchTemplateType === "3_COL_STANDARD"} onChange={() => {}} className="pointer-events-none" />
                      3 cột Kiểm tra
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Miệng (10) + 15p (10) + 1 Tiết (10) → Điểm TP
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs font-semibold text-slate-500">
                Đã chọn: <strong className="text-teal-700 font-black">{batchSelectedSubjectIds.length}</strong> môn học
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchAssignOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveBatchAssign}
                  disabled={batchSaving || batchSelectedSubjectIds.length === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#48BFE3] hover:bg-[#008c82] text-white text-xs font-bold shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
                >
                  {batchSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Lưu Gán Môn cho Kỳ Khảo sát
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL XUẤT EXCEL KỲ KHẢO SÁT (ĐA SHEET THEO MÔN & CƠ SỞ) */}
      <BulkExportModal
        isOpen={isBulkExportModalOpen}
        onClose={() => setIsBulkExportModalOpen(false)}
        campuses={campuses}
        academicYears={academicYears}
        defaultCampusId={selectedCampusId}
        defaultPeriod={selectedPeriod}
        defaultYearId={selectedYearId}
        subjects={subjects}
        evalPeriods={EVAL_PERIODS}
        grades={GRADES}
        savedConfigs={savedConfigs}
      />

      <VnEduImportModal
        isOpen={isVnEduImportOpen}
        onClose={() => {
          setIsVnEduImportOpen(false)
          setPendingVnEduFiles([])
        }}
        academicYearId={selectedYearId}
        academicYearName={academicYears.find(y => y.id === selectedYearId)?.name || ""}
        defaultPeriod={selectedPeriod}
        defaultClassId={selectedClassId}
        initialFiles={pendingVnEduFiles}
        classes={classes}
        subjects={subjects}
        configs={savedConfigs}
        onImportSuccess={() => {
          fetchGradeSheet()
        }}
      />

    </div>
  )
}