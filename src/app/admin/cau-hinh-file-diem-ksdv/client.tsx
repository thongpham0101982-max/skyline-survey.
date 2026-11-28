"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import * as XLSX from "xlsx"
import TciTemplateConfigPanel from "@/components/tci/TciTemplateConfigPanel"
import { PvdhTemplateConfigPanel } from "@/components/ksdv-config/PvdhTemplateConfigPanel"
import { KsdvExportMappingPanel } from "@/components/ksdv-config/KsdvExportMappingPanel"
import { KsdvApplicabilityLedgerPanel } from "@/components/ksdv-config/KsdvApplicabilityLedgerPanel"
import {
  getDefaultPvdhCodeForGrade,
  classifyAssessmentContentCategory,
  PVDH_SEED_TEMPLATES
} from "@/lib/pvdh/constants"
import {
  Save,
  Plus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Award,
  Edit2,
  Trash2,
  Sliders,
  Calculator,
  Play,
  X,
  Copy,
  GraduationCap,
  ClipboardCheck,
  HeartHandshake,
  UserCheck,
  Users,
  MessageSquareQuote,
  ExternalLink,
  FileSpreadsheet,
  Layers,
  ShieldCheck
} from "lucide-react"

import {
  calculateCompositeScore,
  getFormulaDescription,
  FormulaType,
  RoundingRule
} from "@/lib/grading/formula-calculator"

import {
  COLUMN_TYPES,
  SUBJECT_PRESETS,
  isQualitativeType,
  getOrientationPresetByGrade,
  getGradeType,
  isSubjectApplicable,
  normalizeEduSystems,
  isSameSystem,
  resolvePeriodInfo,
  resolveSystemInfo,
  sortGradesNaturally
} from "./presets"

import { ScopeAssignmentMatrix } from "./ScopeAssignmentMatrix"
import { SavedConfigsByPeriodPanel } from "./SavedConfigsByPeriodPanel"
import { BatchAssignModal } from "./BatchAssignModal"

export { getOrientationPresetByGrade, getGradeType, isSubjectApplicable }

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
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500 text-xs font-semibold">
          Đang tải cấu hình file điểm khảo sát đầu vào...
        </div>
      }
    >
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
  campuses
}: Props) {
  const searchParams = useSearchParams()
  const initialTabParam = searchParams?.get("tab")
  const [activeConfigTab, setActiveConfigTab] = useState<
    "PVDH_ORIENTATION" | "SUBJECT_SCORE" | "EXPORT_MAPPING" | "APPLICABILITY_VERSION"
  >(
    initialTabParam === "orientation" || initialTabParam === "pvdh"
      ? "PVDH_ORIENTATION"
      : initialTabParam === "mapping"
        ? "EXPORT_MAPPING"
        : initialTabParam === "version" || initialTabParam === "scope"
          ? "APPLICABILITY_VERSION"
          : "SUBJECT_SCORE"
  )

  // Scope & Multi-Grade Assignment States
  const [selectedYearId, setSelectedYearId] = useState(activeYearId || academicYears[0]?.id || "")
  const [selectedPeriodId, setSelectedPeriodId] = useState("DAU_NAM")
  const [selectedSystemCode, setSelectedSystemCode] = useState("ALL")
  const [targetSystemCodes, setTargetSystemCodes] = useState<string[]>(["ALL"])
  const [multiSystemMode, setMultiSystemMode] = useState(false)

  const [selectedGrade, setSelectedGrade] = useState("Khối 6")
  const [targetGrades, setTargetGrades] = useState<string[]>(["Khối 6"])
  const [multiGradeMode, setMultiGradeMode] = useState(false)

  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || "")

  // Chuẩn hóa danh sách Hệ học (ưu tiên Hội nhập Quốc tế HNG...)
  const normalizedSystems = useMemo(
    () => normalizeEduSystems(eduSystems, selectedYearId),
    [eduSystems, selectedYearId]
  )

  // Kỳ khảo sát cụ thể thuộc năm học đang chọn
  const periodsForYear = useMemo(
    () => (periods || []).filter(p => !p.academicYearId || p.academicYearId === selectedYearId),
    [periods, selectedYearId]
  )

  // Danh sách môn khảo sát tương ứng với Khối lớp chính và Mốc thời gian đang chọn
  const applicableSubjects = useMemo(() => {
    return subjects.filter(s => isSubjectApplicable(s, selectedGrade, selectedPeriodId))
  }, [subjects, selectedGrade, selectedPeriodId])

  // Danh sách mã Preset gợi ý nhanh
  const applicablePresetCodes = useMemo(() => {
    const gradeType = getGradeType(selectedGrade)
    if (gradeType === "PRESCHOOL") return ["TCI", "PDHDV"]
    if (gradeType === "G1") {
      if (selectedPeriodId === "DAU_NAM") return ["TCI", "TAvd", "ESL_VD", "TLY", "NLTD", "PDHDV"]
      return ["TCI", "TOA", "TVI", "TAv", "TAvd", "ESL_VD", "TLY", "NLTD", "PDHDV"]
    }
    if (gradeType === "PRIMARY") return ["TOA", "TVI", "TAv", "TAvd", "EPT", "ESL_VD", "TLY", "PDHDV"]
    return ["TOA", "NVA", "TAv", "TAvd", "EPT", "ESL_VD", "TLY", "PDHDV"]
  }, [selectedGrade, selectedPeriodId])

  const currentSubject = subjects.find(s => s.id === selectedSubjectId)

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
  const [columnCount, setColumnCount] = useState(4)
  const [columnNames, setColumnNames] = useState<string[]>([
    "Listening (Nghe)",
    "Reading (Đọc)",
    "Writing (Viết)",
    "Speaking (Nói)"
  ])
  const [columnTypes, setColumnTypes] = useState<string[]>([
    "SCORE_CUSTOM_100",
    "SCORE_CUSTOM_100",
    "SCORE_CUSTOM_100",
    "SCORE_CUSTOM_100"
  ])
  const [columnMaxScores, setColumnMaxScores] = useState<number[]>([25, 25, 25, 25])

  // Composite & Formula states
  const [hasComposite, setHasComposite] = useState(true)
  const [compositeColumnName, setCompositeColumnName] = useState("Điểm tổng hợp")
  const [formulaType, setFormulaType] = useState<FormulaType>("SUM")
  const [weights, setWeights] = useState<number[]>([1, 1, 1, 1])
  const [formulaCustom, setFormulaCustom] = useState<string>("")
  const [roundingRule, setRoundingRule] = useState<RoundingRule>("ROUND_1")

  // Benchmark & Remarks
  const [hasRemark, setHasRemark] = useState(true)
  const [passScore, setPassScore] = useState<string>("50.0")
  const [commitmentThreshold, setCommitmentThreshold] = useState<string>("")

  // Live Formula Simulator
  const [simScores, setSimScores] = useState<Record<number, string>>({
    0: "18",
    1: "18",
    2: "18",
    3: "18"
  })
  const [activeOrientationSimTab, setActiveOrientationSimTab] = useState<"tab1" | "tab2">("tab1")
  const [simQualitativeAnswers, setSimQualitativeAnswers] = useState<Record<number, string>>({
    0: "CONFIDENT",
    1: "NORMAL",
    2: "CONFIDENT",
    3: "NORMAL"
  })

  // Saved configs state
  const [savedConfigs, setSavedConfigs] = useState<any[]>([])
  const [loadingConfigs, setLoadingConfigs] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "ok" | "err" } | null>(
    null
  )

  // Modals
  const [isBatchOpen, setIsBatchOpen] = useState(false)
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false)
  const [cloneSourceConfigId, setCloneSourceConfigId] = useState("")

  // Right panel filter states — Mặc định hiển thị Tất cả kỳ (nhóm theo Mốc thời gian / Kỳ KS) để thấy toàn cảnh
  const [listFilterSubjectId, setListFilterSubjectId] = useState<string>("ALL")
  const [listFilterPeriod, setListFilterPeriod] = useState<string>("ALL_TABS")
  const [listFilterSystemCode, setListFilterSystemCode] = useState<string>("ALL_SYSTEMS")
  const [listFilterGrade, setListFilterGrade] = useState<string>("ALL")

  const showMessage = (text: string, type: "ok" | "err" = "ok") => {
    setActionMessage({ text, type })
    setTimeout(() => setActionMessage(null), 4200)
  }

  const fetchConfigs = async () => {
    if (!selectedYearId) return
    try {
      setLoadingConfigs(true)
      const res = await fetch(
        `/api/admin/input-assessments/grade-configs?academicYearId=${selectedYearId}`
      )
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

  // Tìm cấu hình khớp nhất trong savedConfigs cho (subjectId, grade, periodId, systemCode)
  const findBestSavedConfig = (
    subId: string,
    grade: string,
    periodId: string,
    sysCode: string,
    configsList: any[] = savedConfigs
  ) => {
    const candidates = configsList.filter(c => c.subjectId === subId)
    if (candidates.length === 0) return null

    let best: any = null
    let bestScore = -1

    for (const c of candidates) {
      let score = 0
      const cPeriod = (c.periodId || "ALL").trim() || "ALL"
      const cGrade = (c.grade || "ALL").trim() || "ALL"
      const sameSys = isSameSystem(c.educationSystemId, sysCode, normalizedSystems)
      const isSysAll = (c.educationSystemId || "ALL") === "ALL"

      if (cGrade === grade) score += 8
      else if (cGrade === "ALL") score += 1
      else continue

      if (cPeriod === periodId) score += 4
      else if (cPeriod === "ALL") score += 1
      else continue

      if (sameSys) score += 2
      else if (isSysAll) score += 1
      else continue

      if (score > bestScore) {
        bestScore = score
        best = c
      }
    }
    return best
  }

  const populateFormFromConfigObject = (cfg: any) => {
    try {
      const names = JSON.parse(cfg.columnNames || "[]")
      const types = JSON.parse(cfg.columnTypes || "[]")
      const maxScores = JSON.parse(cfg.columnMaxScores || "[]")
      const w = JSON.parse(cfg.weights || "[]")

      setColumnCount(cfg.columnCount || names.length || 1)
      setColumnNames(names)
      setColumnTypes(types)
      setColumnMaxScores(maxScores)
      setHasComposite(Boolean(cfg.hasCompositeColumn))
      setCompositeColumnName(cfg.compositeColumnName || "Điểm tổng hợp")
      setFormulaType((cfg.formula || "AVERAGE") as FormulaType)
      setFormulaCustom(cfg.formulaCustom || "")
      setWeights(w.length > 0 ? w : names.map(() => 1))
      setRoundingRule((cfg.roundingRule || "ROUND_1") as RoundingRule)
      setHasRemark(cfg.hasRemarkColumn !== false)
      setPassScore(cfg.passScore != null ? String(cfg.passScore) : "5.0")

      const targetSub = subjects.find(s => s.id === cfg.subjectId)
      const isSubEng = Boolean(
        targetSub &&
          (["tav", "tavd", "ept"].includes((targetSub.code || "").toLowerCase()) ||
            (targetSub.name || "").toLowerCase().includes("tiếng anh"))
      )
      setCommitmentThreshold(
        isSubEng ? "" : cfg.commitmentThreshold != null ? String(cfg.commitmentThreshold) : ""
      )

      const newSim: Record<number, string> = {}
      maxScores.forEach((m: number, idx: number) => {
        newSim[idx] = String(Math.round(m * 0.75 * 10) / 10)
      })
      setSimScores(newSim)
    } catch (e) {
      console.error("Error parsing config:", e)
    }
  }

  const applyPresetForSubject = (subCode: string, targetGrade?: string, silent = false) => {
    const curGrade = targetGrade || selectedGrade
    const numG = parseInt(curGrade.replace(/\D/g, ""), 10) || 1

    if (
      subCode === "PDH" ||
      subCode === "ORIENTATION" ||
      subCode === "PHIEU_DINH_HUONG" ||
      subCode === "PDHDV"
    ) {
      const preset = getOrientationPresetByGrade(curGrade)
      const pdhSub = subjects.find(
        s => s.code === "PDHDV" || s.code === "PDH" || s.code === subCode
      )
      if (pdhSub) {
        setSelectedSubjectId(pdhSub.id)
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
      if (!silent) {
        showMessage(
          `Đã nạp mẫu chuẩn Phiếu định hướng đầu vào cho ${curGrade} (${preset.gradeLabel}).`,
          "ok"
        )
      }
      return
    }

    let presetKey = subCode
    if (subCode === "TAv") {
      if (numG >= 10) presetKey = "TAv_10_THPT"
      else if (numG >= 6) presetKey = "TAv_10_THCS"
      else if (numG === 1) presetKey = "TAv_10_KHOI_1"
      else presetKey = "TAv_10_TIEU_HOC"
    } else if (subCode === "TAvd") {
      presetKey = "TAvd_10"
    } else if (subCode === "TCI" || subCode === "CHILD_DEV_16") {
      presetKey = "CHILD_DEV_16"
    }

    const subObj = subjects.find(s => s.code === subCode)
    if (subObj) {
      setSelectedSubjectId(subObj.id)
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
      setPassScore(preset.passScore != null ? String(preset.passScore) : "5.0")
      setCommitmentThreshold(
        preset.commitmentThreshold != null ? String(preset.commitmentThreshold) : ""
      )

      const newSim: Record<number, string> = {}
      preset.columnMaxScores.forEach((m: number, idx: number) => {
        newSim[idx] = String(Math.round(m * 0.7))
      })
      setSimScores(newSim)
      if (!silent) {
        showMessage(
          `Đã nạp mẫu chuẩn [${preset.compositeColumnName || subCode}] cho ${curGrade}.`,
          "ok"
        )
      }
    }
  }

  // Khi tải lần đầu xong savedConfigs, nạp cấu hình khớp với lựa chọn mặc định
  useEffect(() => {
    if (!selectedSubjectId) return
    const validSubs = subjects.filter(s => isSubjectApplicable(s, selectedGrade, selectedPeriodId))
    let effSubId = selectedSubjectId
    if (!validSubs.some(s => s.id === selectedSubjectId) && validSubs.length > 0) {
      effSubId = validSubs[0].id
      setSelectedSubjectId(effSubId)
    }
    const matched = findBestSavedConfig(effSubId, selectedGrade, selectedPeriodId, selectedSystemCode)
    if (matched) {
      populateFormFromConfigObject(matched)
    } else {
      const subObj = subjects.find(s => s.id === effSubId)
      if (subObj) applyPresetForSubject(subObj.code, selectedGrade, true)
    }
  }, [savedConfigs.length])

  // Handlers cho Bảng điều phối phạm vi & gán đa khối
  const syncFormForScope = (
    nextPeriodId: string,
    nextSysCode: string,
    nextGrade: string,
    nextSubId: string
  ) => {
    const validSubs = subjects.filter(s => isSubjectApplicable(s, nextGrade, nextPeriodId))
    let effSubId = nextSubId
    if (!validSubs.some(s => s.id === nextSubId) && validSubs.length > 0) {
      effSubId = validSubs[0].id
      setSelectedSubjectId(effSubId)
    }
    const matched = findBestSavedConfig(effSubId, nextGrade, nextPeriodId, nextSysCode)
    if (matched) {
      populateFormFromConfigObject(matched)
    } else {
      const subObj = subjects.find(s => s.id === effSubId)
      if (subObj) applyPresetForSubject(subObj.code, nextGrade, true)
    }
  }

  const handleSelectPeriod = (newPeriodId: string) => {
    setSelectedPeriodId(newPeriodId)
    syncFormForScope(newPeriodId, selectedSystemCode, selectedGrade, selectedSubjectId)
  }

  const handleSelectSystem = (sysCode: string) => {
    setSelectedSystemCode(sysCode)
    setTargetSystemCodes([sysCode])
    syncFormForScope(selectedPeriodId, sysCode, selectedGrade, selectedSubjectId)
  }

  const handleToggleMultiSystemMode = () => {
    setMultiSystemMode(prev => {
      const next = !prev
      if (!next) {
        setTargetSystemCodes([selectedSystemCode])
      }
      return next
    })
  }

  const handleToggleTargetSystem = (sysCode: string) => {
    setTargetSystemCodes(prev => {
      if (prev.includes(sysCode)) {
        if (prev.length === 1) return prev
        const next = prev.filter(x => x !== sysCode)
        setSelectedSystemCode(next[0])
        return next
      }
      if (sysCode === "ALL") {
        setSelectedSystemCode("ALL")
        return ["ALL"]
      }
      const cleaned = prev.filter(x => x !== "ALL")
      const next = [...cleaned, sysCode]
      setSelectedSystemCode(sysCode)
      return next
    })
  }

  const handleSelectSingleGrade = (newGrade: string) => {
    setSelectedGrade(newGrade)
    setTargetGrades([newGrade])
    syncFormForScope(selectedPeriodId, selectedSystemCode, newGrade, selectedSubjectId)
  }

  const handleToggleMultiGradeMode = () => {
    setMultiGradeMode(prev => {
      const next = !prev
      if (!next) {
        setTargetGrades([selectedGrade])
      }
      return next
    })
  }

  const handleToggleGradeInMulti = (grade: string) => {
    setMultiGradeMode(true)
    setTargetGrades(prev => {
      if (prev.includes(grade)) {
        if (prev.length === 1) {
          setSelectedGrade(prev[0])
          return prev
        }
        const next = sortGradesNaturally(prev.filter(g => g !== grade))
        if (selectedGrade === grade) {
          setSelectedGrade(next[0])
          syncFormForScope(selectedPeriodId, selectedSystemCode, next[0], selectedSubjectId)
        }
        return next
      } else {
        const next = sortGradesNaturally([...prev, grade])
        setSelectedGrade(grade)
        syncFormForScope(selectedPeriodId, selectedSystemCode, grade, selectedSubjectId)
        return next
      }
    })
  }

  const handleSelectGradeGroup = (groupGrades: string[]) => {
    if (!groupGrades || groupGrades.length === 0) return
    const sorted = sortGradesNaturally(groupGrades)
    setMultiGradeMode(sorted.length > 1)
    setTargetGrades(sorted)
    const primary = sorted[0]
    setSelectedGrade(primary)
    syncFormForScope(selectedPeriodId, selectedSystemCode, primary, selectedSubjectId)
  }

  const handleSelectSubject = (subId: string) => {
    setSelectedSubjectId(subId)
    setListFilterSubjectId(subId)
    const matched = findBestSavedConfig(subId, selectedGrade, selectedPeriodId, selectedSystemCode)
    if (matched) {
      populateFormFromConfigObject(matched)
    } else {
      const subObj = subjects.find(s => s.id === subId)
      if (subObj) applyPresetForSubject(subObj.code, selectedGrade, true)
    }
  }

  // Nạp 1 cấu hình đã lưu từ cột phải lên form
  const loadConfigToForm = (cfg: any) => {
    populateFormFromConfigObject(cfg)
    const sysInfo = resolveSystemInfo(cfg.educationSystemId, normalizedSystems, cfg.educationSystemName)
    const effGrade = cfg.grade && cfg.grade !== "ALL" ? cfg.grade : selectedGrade
    const effPeriod = cfg.periodId || "ALL"

    setSelectedPeriodId(effPeriod)
    setSelectedSystemCode(sysInfo.code)
    setTargetSystemCodes([sysInfo.code])
    setMultiSystemMode(false)

    setSelectedGrade(effGrade)
    setTargetGrades([effGrade])
    setMultiGradeMode(false)

    setSelectedSubjectId(cfg.subjectId)
    window.scrollTo({ top: 100, behavior: "smooth" })
    showMessage(
      `Đã nạp cấu hình ${cfg.subject?.code || ""} • ${effGrade} (${
        resolvePeriodInfo(effPeriod, periods).shortLabel
      } • ${sysInfo.isAll ? "Hệ chung" : sysInfo.code}).`,
      "ok"
    )
  }

  // Nạp cả nhóm nhiều khối lên form cùng lúc để chỉnh sửa đồng loạt
  const handleLoadGroupGrades = (firstCfg: any, groupGrades: string[]) => {
    populateFormFromConfigObject(firstCfg)
    const sysInfo = resolveSystemInfo(
      firstCfg.educationSystemId,
      normalizedSystems,
      firstCfg.educationSystemName
    )
    const effPeriod = firstCfg.periodId || "ALL"
    const sorted = sortGradesNaturally(groupGrades)

    setSelectedPeriodId(effPeriod)
    setSelectedSystemCode(sysInfo.code)
    setTargetSystemCodes([sysInfo.code])
    setMultiSystemMode(false)

    setSelectedGrade(sorted[0] || "Khối 6")
    setTargetGrades(sorted)
    setMultiGradeMode(sorted.length > 1)
    setSelectedSubjectId(firstCfg.subjectId)

    window.scrollTo({ top: 100, behavior: "smooth" })
    showMessage(
      `Đã chọn đồng loạt ${sorted.length} khối (${sorted.join(", ")}) để thiết lập cùng lúc.`,
      "ok"
    )
  }

  // Tính kết quả mô phỏng trực tiếp
  const simulatedResult = useMemo(() => {
    if (!hasComposite) return null
    const scoresArr: (number | null)[] = []
    for (let i = 0; i < columnCount; i++) {
      const val = parseFloat(simScores[i])
      scoresArr.push(isNaN(val) ? null : val)
    }
    return calculateCompositeScore(scoresArr, {
      formula: formulaType,
      weights,
      formulaCustom,
      roundingRule,
      columnCount,
      columnMaxScores,
      columnTypes
    })
  }, [
    hasComposite,
    simScores,
    columnCount,
    formulaType,
    weights,
    formulaCustom,
    roundingRule,
    columnMaxScores,
    columnTypes
  ])

  const totalMaxScore = useMemo(() => {
    let sum = 0
    for (let i = 0; i < columnCount; i++) {
      if (!isQualitativeType(columnTypes[i])) {
        sum += columnMaxScores[i] !== undefined ? columnMaxScores[i] : 10
      }
    }
    return Math.round(sum * 100) / 100
  }, [columnCount, columnTypes, columnMaxScores])

  const isOrientationMode = useMemo(() => {
    return (
      compositeColumnName.toLowerCase().includes("định hướng") ||
      currentSubject?.code === "PDH" ||
      currentSubject?.code === "PDHDV" ||
      currentSubject?.code === "ORIENTATION" ||
      currentSubject?.name?.toLowerCase().includes("định hướng") ||
      columnTypes.some(t => t === "QUALITATIVE_EVAL")
    )
  }, [compositeColumnName, currentSubject, columnTypes])

  // Lưu cấu hình (Hỗ trợ lưu 1 khối hoặc gán nhiều khối × nhiều hệ học cùng lúc!)
  const handleSaveConfig = async () => {
    if (!selectedSubjectId || !currentSubject) {
      showMessage("Vui lòng chọn môn khảo sát đầu vào!", "err")
      return
    }

    const sortedGrades = sortGradesNaturally(targetGrades)
    const applicableTargetGrades = sortedGrades.filter(g =>
      isSubjectApplicable(currentSubject, g, selectedPeriodId)
    )

    if (applicableTargetGrades.length === 0) {
      showMessage(
        `Môn ${currentSubject.name} không áp dụng cho khối đã chọn ở mốc ${
          resolvePeriodInfo(selectedPeriodId, periods).shortLabel
        }.`,
        "err"
      )
      return
    }

    try {
      setSavingConfig(true)

      // Nếu đang gán Phiếu định hướng cho nhiều nhóm khối khác nhau, tự động chuẩn hóa bộ tiêu chí theo nhóm khối khác
      const isPDH = currentSubject.code === "PDHDV" || currentSubject.code === "PDH"
      const primaryPreset = isPDH ? getOrientationPresetByGrade(selectedGrade) : null

      const items: any[] = []
      for (const sysCode of targetSystemCodes) {
        for (const g of applicableTargetGrades) {
          if (isPDH && applicableTargetGrades.length > 1) {
            const gPreset = getOrientationPresetByGrade(g)
            const sameGroupAsPrimary = gPreset.gradeGroupKey === primaryPreset?.gradeGroupKey
            items.push({
              periodId: selectedPeriodId,
              educationSystemId: sysCode,
              grade: g,
              subjectId: selectedSubjectId,
              columnCount: sameGroupAsPrimary ? columnCount : gPreset.columnCount,
              columnNames: sameGroupAsPrimary ? columnNames : gPreset.columnNames,
              columnTypes: sameGroupAsPrimary ? columnTypes : gPreset.columnTypes,
              columnMaxScores: sameGroupAsPrimary ? columnMaxScores : gPreset.columnMaxScores,
              hasCompositeColumn: hasComposite,
              compositeColumnName: sameGroupAsPrimary
                ? compositeColumnName
                : gPreset.compositeColumnName,
              hasRemarkColumn: hasRemark,
              formula: formulaType,
              formulaCustom,
              weights: sameGroupAsPrimary ? weights : gPreset.weights,
              roundingRule,
              passScore: null,
              commitmentThreshold: null
            })
          } else {
            items.push({
              periodId: selectedPeriodId,
              educationSystemId: sysCode,
              grade: g,
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
              commitmentThreshold: isEnglishSubject
                ? null
                : commitmentThreshold
                  ? parseFloat(commitmentThreshold)
                  : null
            })
          }
        }
      }

      const res = await fetch("/api/admin/input-assessments/grade-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          items
        })
      })

      const data = await res.json()
      if (data.success) {
        const pLabel = resolvePeriodInfo(selectedPeriodId, periods).shortLabel
        const sysSummary =
          targetSystemCodes.length > 1
            ? `${targetSystemCodes.join(", ")}`
            : resolveSystemInfo(targetSystemCodes[0], normalizedSystems).isAll
              ? "Mẫu chung hệ"
              : targetSystemCodes[0]
        showMessage(
          `Đã lưu cấu hình môn ${currentSubject.code} cho ${applicableTargetGrades.length} khối (${applicableTargetGrades.join(
            ", "
          )}) • ${pLabel} • ${sysSummary}!`,
          "ok"
        )
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

  const handleDeleteConfig = async (id: string, label: string) => {
    if (!confirm(`Bạn có chắc muốn xóa cấu hình mẫu "${label}"?`)) return
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

  const handleApplyClone = () => {
    const srcCfg = savedConfigs.find(c => c.id === cloneSourceConfigId)
    if (!srcCfg) return
    populateFormFromConfigObject(srcCfg)
    setIsCloneModalOpen(false)
    showMessage(
      `Đã sao chép cấu trúc cột điểm từ ${srcCfg.grade} (${
        resolvePeriodInfo(srcCfg.periodId, periods).shortLabel
      }) lên biểu mẫu!`,
      "ok"
    )
  }

  const handleExportBlankExcel = (cfg: any) => {
    try {
      const names = JSON.parse(cfg.columnNames || "[]")
      const maxScores = JSON.parse(cfg.columnMaxScores || "[]")
      const subName = cfg.subject?.name || "Môn khảo sát"
      const gradeStr = cfg.grade || "Toàn khối"
      const pInfo = resolvePeriodInfo(cfg.periodId, periods)
      const sysInfo = resolveSystemInfo(
        cfg.educationSystemId,
        normalizedSystems,
        cfg.educationSystemName
      )

      const headers = [
        "STT",
        "Mã học sinh",
        "Họ và tên",
        "Ngày sinh",
        "Giới tính",
        "Khối lớp",
        "Hệ học",
        ...names.map((n: string, i: number) => {
          const max = maxScores[i]
          return max ? `${n} (Tối đa ${max}đ)` : n
        })
      ]

      if (cfg.hasCompositeColumn) {
        headers.push(
          `${cfg.compositeColumnName || "Điểm tổng hợp"} (Công thức: ${cfg.formula || "TB"})`
        )
      }
      if (cfg.hasRemarkColumn) {
        headers.push("Nhận xét đánh giá")
      }

      const sampleRow1 = [
        1,
        "HS001",
        "Nguyễn Văn An",
        "15/08/2015",
        "Nam",
        gradeStr,
        sysInfo.isAll ? "Hội nhập Quốc tế (HNG)" : sysInfo.fullLabel,
        ...names.map(() => ""),
        cfg.hasCompositeColumn ? "" : undefined,
        cfg.hasRemarkColumn ? "" : undefined
      ].filter(x => x !== undefined)

      const wsData = [
        [`FILE MẪU NHẬP ĐIỂM KHẢO SÁT ĐẦU VÀO - MÔN: ${subName.toUpperCase()}`],
        [
          `Mốc khảo sát: ${pInfo.shortLabel} | Khối: ${gradeStr} | Hệ: ${sysInfo.fullLabel} | Năm học: ${
            academicYears.find(y => y.id === cfg.academicYearId)?.name || ""
          }`
        ],
        [],
        headers,
        sampleRow1
      ]

      const ws = XLSX.utils.aoa_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Mau_Nhap_Diem")

      const fileName = `Mau_Diem_KSDV_${(cfg.subject?.code || subName).replace(
        /\s+/g,
        "_"
      )}_${gradeStr.replace(/\s+/g, "_")}_${sysInfo.code}_${pInfo.id}.xlsx`
      XLSX.writeFile(wb, fileName)
      showMessage(`Đã tải file Excel mẫu: ${fileName}`, "ok")
    } catch (e: any) {
      showMessage("Lỗi xuất file Excel: " + e.message, "err")
    }
  }

  const sortedTargetGrades = sortGradesNaturally(targetGrades)

  return (
    <div className="space-y-5 tabular-nums">
      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`fixed top-6 right-6 z-[999] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-bold border ${
            actionMessage.type === "ok"
              ? "bg-[#003B3A] text-white border-[#00A19A]"
              : "bg-[#E11D48] text-white border-rose-400"
          }`}
        >
          {actionMessage.type === "ok" ? (
            <CheckCircle2 className="w-4 h-4 text-[#5EEAD4] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* MASTHEAD — SKY-LINE ACADEMIC LEDGER */}
      <div className="bg-[#003B3A] rounded-2xl p-5 md:p-6 text-white border border-[#003B3A] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/10 rounded-lg text-xs font-semibold text-[#5EEAD4] border border-white/10">
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Khảo sát đầu vào • Chuẩn hóa sổ cái dữ liệu điểm</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Cấu hình file điểm khảo sát đầu vào
            </h1>
            <p className="text-xs md:text-sm text-teal-100/90 leading-relaxed">
              Thiết lập cấu trúc cột điểm thành phần, thang điểm, công thức tổng hợp và gán đồng bộ theo từng{" "}
              <strong className="text-white">Mốc thời gian / Kỳ khảo sát</strong>,{" "}
              <strong className="text-white">Hệ học (Hội nhập Quốc tế HNG...)</strong>,{" "}
              <strong className="text-white">nhiều Khối lớp</strong> và{" "}
              <strong className="text-white">Môn khảo sát</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 self-start lg:self-center bg-white/10 px-4 py-2.5 rounded-xl border border-white/15">
            <div className="pr-4 border-r border-white/15">
              <span className="text-[11px] text-teal-200 block font-medium">Năm học</span>
              <select
                value={selectedYearId}
                onChange={e => setSelectedYearId(e.target.value)}
                className="bg-transparent text-white font-bold text-sm outline-none cursor-pointer mt-0.5"
              >
                {academicYears.map(y => (
                  <option key={y.id} value={y.id} className="text-slate-800 font-semibold">
                    {y.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-[11px] text-teal-200 block font-medium">Tổng mẫu đã lưu</span>
              <span className="text-sm font-bold text-[#5EEAD4]">{savedConfigs.length} mẫu file</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 TAB NGHIỆP VỤ CẤU HÌNH FILE KSDV & MẪU ĐỊNH HƯỚNG PVDH */}
      <div className="bg-white rounded-2xl p-2 border border-[#E2E8F0] shadow-xs flex flex-wrap items-center gap-1.5">
        {[
          {
            id: "PVDH_ORIENTATION" as const,
            label: "Mẫu định hướng HS và PHHS",
            badge: "BM.KTĐBCL.31–42",
            icon: HeartHandshake
          },
          {
            id: "SUBJECT_SCORE" as const,
            label: "Mẫu kết quả môn khảo sát",
            badge: `${savedConfigs.length}`,
            icon: Sliders
          },
          {
            id: "EXPORT_MAPPING" as const,
            label: "Mapping dữ liệu và mẫu file xuất",
            badge: "PDF / Excel",
            icon: FileSpreadsheet
          },
          {
            id: "APPLICABILITY_VERSION" as const,
            label: "Phạm vi áp dụng và phiên bản",
            badge: "Sổ cái",
            icon: ShieldCheck
          }
        ].map(tab => {
          const Icon = tab.icon
          const active = activeConfigTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveConfigTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                active
                  ? "bg-[#003B3A] text-white shadow-2xs"
                  : "text-slate-600 hover:bg-[#F8FAFC] hover:text-[#003B3A]"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-[#5EEAD4]" : "text-[#008B85]"}`} />
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  active
                    ? "bg-white/15 text-[#5EEAD4]"
                    : "bg-[#F0FDFA] text-[#00736E] border border-teal-200/70"
                }`}
              >
                {tab.badge}
              </span>
            </button>
          )
        })}
      </div>

      {activeConfigTab === "PVDH_ORIENTATION" && (
        <PvdhTemplateConfigPanel
          campuses={campuses}
          eduSystems={normalizedSystems}
          periods={periodsForYear}
        />
      )}

      {activeConfigTab === "EXPORT_MAPPING" && (
        <KsdvExportMappingPanel
          subjects={subjects}
          academicYearId={selectedYearId}
        />
      )}

      {activeConfigTab === "APPLICABILITY_VERSION" && (
        <KsdvApplicabilityLedgerPanel savedSubjectConfigs={savedConfigs} />
      )}

      {activeConfigTab === "SUBJECT_SCORE" && (
        <>
      {/* BẢNG ĐIỀU PHỐI PHẠM VI & GÁN CẤU HÌNH ĐA KHỐI TRỰC QUAN */}
      <ScopeAssignmentMatrix
        periodsForYear={periodsForYear}
        normalizedSystems={normalizedSystems}
        grades={grades}
        subjects={subjects}
        applicableSubjects={applicableSubjects}
        applicablePresetCodes={applicablePresetCodes}
        savedConfigs={savedConfigs}
        selectedPeriodId={selectedPeriodId}
        onSelectPeriod={handleSelectPeriod}
        selectedSystemCode={selectedSystemCode}
        targetSystemCodes={targetSystemCodes}
        multiSystemMode={multiSystemMode}
        onToggleMultiSystemMode={handleToggleMultiSystemMode}
        onSelectSystem={handleSelectSystem}
        onToggleTargetSystem={handleToggleTargetSystem}
        selectedGrade={selectedGrade}
        targetGrades={targetGrades}
        multiGradeMode={multiGradeMode}
        onToggleMultiGradeMode={handleToggleMultiGradeMode}
        onSelectSingleGrade={handleSelectSingleGrade}
        onToggleGradeInMulti={handleToggleGradeInMulti}
        onSelectGradeGroup={handleSelectGradeGroup}
        selectedSubjectId={selectedSubjectId}
        onSelectSubject={handleSelectSubject}
        onApplyPresetCode={code => applyPresetForSubject(code)}
        onOpenCloneModal={() => {
          const available = savedConfigs.filter(c => c.subjectId === selectedSubjectId)
          if (available.length > 0) setCloneSourceConfigId(available[0].id)
          setIsCloneModalOpen(true)
        }}
        onOpenBatchModal={() => setIsBatchOpen(true)}
        onQuickSave={handleSaveConfig}
        savingConfig={savingConfig}
      />

      {/* THÔNG BÁO QUY ĐỊNH CHUYÊN MÔN KHỐI 1 THEO MỐC THỜI GIAN */}
      {(selectedGrade === "Khối 1" || selectedGrade === "1") && (
        <>
          {(selectedPeriodId === "DAU_NAM" || selectedPeriodId === "ALL") &&
            ["TAv", "TOA", "TVI"].includes(currentSubject?.code || "") && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-amber-950">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-amber-950">
                      Quy định tuyển sinh đầu năm: Khối 1 không áp dụng bài khảo sát {currentSubject?.name}
                    </h4>
                    <p className="text-xs text-amber-900/90 leading-relaxed">
                      Học sinh vào Lớp 1 đầu năm chỉ thực hiện{" "}
                      <strong>Tiếng Anh (vấn đáp), Tâm lý và Năng lực tư duy</strong>. Các môn{" "}
                      <strong>Toán, Tiếng Việt, Tiếng Anh (viết)</strong> chỉ bổ sung ở mốc{" "}
                      <strong>Học kỳ 1</strong> hoặc <strong>Học kỳ 2</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const oralSub = subjects.find(s => s.code === "TAvd")
                      if (oralSub) handleSelectSubject(oralSub.id)
                    }}
                    className="px-3 py-1.5 bg-[#D97706] hover:bg-amber-700 text-white rounded-xl text-xs font-semibold"
                  >
                    Chuyển sang Tiếng Anh vấn đáp
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPeriod("HK1")}
                    className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-semibold"
                  >
                    Chuyển mốc sang Học kỳ 1
                  </button>
                </div>
              </div>
            )}

          {(selectedPeriodId === "HK1" || selectedPeriodId === "HK2") && (
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-emerald-950">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-emerald-950">
                    Khối 1 — Mốc {selectedPeriodId === "HK1" ? "Học kỳ 1" : "Học kỳ 2"}: Mở đầy đủ Toán, Tiếng Việt & Tiếng Anh (viết)
                  </h4>
                  <p className="text-xs text-emerald-900/80">
                    Học sinh chuyển đến ở HK1/HK2 được khảo sát bổ sung Toán (10đ), Tiếng Việt (10đ) và Tiếng Anh viết (10đ).
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { code: "TOA", label: "Mẫu Toán (10đ)" },
                  { code: "TVI", label: "Mẫu Tiếng Việt (10đ)" },
                  { code: "TAv", label: "Mẫu Tiếng Anh viết (10đ)" }
                ].map(btn => (
                  <button
                    key={btn.code}
                    type="button"
                    onClick={() => {
                      const s = subjects.find(x => x.code === btn.code)
                      if (s) {
                        handleSelectSubject(s.id)
                        applyPresetForSubject(btn.code)
                      }
                    }}
                    className="px-3 py-1.5 bg-[#059669] hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* GỢI Ý NHANH THANG ĐIỂM CHO TIẾNG ANH VIẾT / VẤN ĐÁP / EPT */}
      {currentSubject?.code === "TAv" && (
        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#003B3A]">
            <GraduationCap className="w-4 h-4 text-[#008B85]" />
            <span>Mẫu Tiếng Anh (viết) chuẩn thang 10đ theo cấp học (không tính điểm tổng Tiếng Anh):</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "TAv_10_TIEU_HOC", label: "Tiểu học (K2–K5): Thang 10đ", pass: "5.0" },
              { key: "TAv_10_THCS", label: "THCS (K6–K9): Thang 10đ", pass: "5.0" },
              { key: "TAv_10_THPT", label: "THPT (K10–K12): Thang 10đ", pass: "5.0" },
              { key: "TAv_10", label: "Mẫu chuẩn Thang 10đ", pass: "5.0" }
            ].map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  const p = SUBJECT_PRESETS[item.key]
                  setColumnCount(p.columnCount)
                  setColumnNames(p.columnNames)
                  setColumnTypes(p.columnTypes)
                  setColumnMaxScores(p.columnMaxScores)
                  setCompositeColumnName(p.compositeColumnName)
                  setFormulaType(p.formulaType)
                  setWeights(p.weights)
                  setPassScore(item.pass)
                  setCommitmentThreshold("")
                  showMessage(`Đã áp dụng ${item.label}!`, "ok")
                }}
                className="px-3 py-1.5 bg-white hover:bg-[#F0FDFA] text-slate-700 hover:text-[#003B3A] border border-[#E2E8F0] hover:border-[#00A19A] rounded-xl text-xs font-semibold transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {currentSubject?.code === "EPT" && (
        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#003B3A]">
            <GraduationCap className="w-4 h-4 text-[#008B85]" />
            <span>Mẫu chuẩn EPT 4 kỹ năng (Listening • Reading • Writing • Speaking):</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => applyPresetForSubject("EPT")}
              className="px-3 py-1.5 bg-[#003B3A] hover:bg-[#004d4b] text-white rounded-xl text-xs font-semibold"
            >
              Chuẩn 100đ (4 kỹ năng × 25đ — Tổng SUM, Đạt ≥ 50đ)
            </button>
            <button
              type="button"
              onClick={() => {
                setColumnCount(4)
                setColumnNames(["Listening (Nghe)", "Reading (Đọc)", "Writing (Viết)", "Speaking (Nói)"])
                setColumnTypes(["SCORE_100", "SCORE_100", "SCORE_100", "SCORE_100"])
                setColumnMaxScores([100, 100, 100, 100])
                setHasComposite(true)
                setCompositeColumnName("Điểm trung bình EPT (Thang 100)")
                setFormulaType("AVERAGE")
                setWeights([1, 1, 1, 1])
                setPassScore("50.0")
                setCommitmentThreshold("")
                showMessage("Đã áp dụng mẫu EPT trung bình cộng 4 kỹ năng (4 × 100đ → AVERAGE)!", "ok")
              }}
              className="px-3 py-1.5 bg-white hover:bg-[#F0FDFA] text-slate-700 border border-[#E2E8F0] hover:border-[#00A19A] rounded-xl text-xs font-semibold"
            >
              Trung bình 4 kỹ năng (4 × 100đ — AVERAGE, Đạt ≥ 50đ)
            </button>
          </div>
        </div>
      )}

      {/* BANNER PHIẾU ĐỊNH HƯỚNG ĐẦU VÀO (CHUẨN SKY-LINE DEEP PINE — ĐỊNH TÍNH THUẦN TÚY) */}
      {classifyAssessmentContentCategory(currentSubject || {}) === "ORIENTATION_INTERVIEW" && (() => {
        const mappedPvdhCode = getDefaultPvdhCodeForGrade(selectedGrade) || "BM.KTĐBCL.36"
        const mappedSeed = PVDH_SEED_TEMPLATES.find(t => t.code === mappedPvdhCode) || PVDH_SEED_TEMPLATES[0]
        return (
          <div className="rounded-2xl bg-[#003B3A] text-white p-5 border border-[#003B3A] shadow-xs">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[#5EEAD4] shrink-0 mt-0.5">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-[#5EEAD4] text-[11px] font-semibold border border-white/15">
                      {mappedSeed.code} • {selectedGrade}
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      {mappedSeed.name}
                    </h3>
                  </div>
                  <p className="text-xs text-teal-100/90 leading-relaxed max-w-3xl">
                    {mappedSeed.exportLayout.layoutVariant === "BM_KTDBCL_ABCD"
                      ? `Biểu mẫu ${mappedSeed.code} của Ban Khảo thí & Đảm bảo chất lượng (Thông tin chung, A. Phỏng vấn HS [A01–A06], B. Trao đổi PH [B01–B05], C. Phân hóa riêng theo khối [C01–C05], D. Tổng hợp và định hướng của GV [D01–D04, Trạng thái phiếu & Đề nghị phỏng vấn tâm lí]) — không tự quy đổi thành điểm xét tuyển.`
                      : "Nội dung phỏng vấn định hướng là ghi nhận định tính thuần túy (6 nhóm trao đổi HS, 4 trường ghi nhận giáo viên, 5 nhóm trao đổi PHHS và thống nhất định hướng hỗ trợ) — không quy đổi thành cột điểm số, không xếp loại đạt/trượt và không tự quyết định tiếp nhận."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveConfigTab("PVDH_ORIENTATION")}
                  className="px-3.5 py-2 bg-[#00A19A] hover:bg-[#008B85] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cấu hình mẫu {mappedSeed.code}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* CẤU HÌNH PHIẾU TCI 16 TIÊU CHÍ */}
      {currentSubject?.code === "TCI" && (
        <TciTemplateConfigPanel
          academicYearId={selectedYearId}
          periodId={selectedPeriodId}
          educationSystemId={selectedSystemCode}
          grade={selectedGrade}
        />
      )}

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (7/12): FORM THIẾT LẬP CẤU HÌNH */}
        {classifyAssessmentContentCategory(currentSubject || {}) === "ORIENTATION_INTERVIEW" ? (
          <div className="lg:col-span-7 bg-white rounded-2xl p-5 md:p-6 border border-[#E2E8F0] shadow-xs space-y-4">
            {(() => {
              const mappedPvdhCode = getDefaultPvdhCodeForGrade(selectedGrade) || "BM.KTĐBCL.36"
              const mappedSeed = PVDH_SEED_TEMPLATES.find(t => t.code === mappedPvdhCode) || PVDH_SEED_TEMPLATES[0]
              return (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9]">
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-teal-200 text-[11px] font-semibold mb-1">
                        Loại nội dung: Phỏng vấn định hướng (Không tính điểm số)
                      </span>
                      <h2 className="text-base font-bold text-[#003B3A]">
                        Cấu trúc biểu mẫu {mappedSeed.code} — {selectedGrade}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Quản lý phiên bản, câu hỏi và phạm vi áp dụng tại tab{" "}
                        <strong className="text-[#00736E]">Mẫu định hướng HS và PHHS</strong>.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveConfigTab("PVDH_ORIENTATION")}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#003B3A] hover:bg-[#004d4b] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#5EEAD4]" />
                      <span>Mở trình quản lý phiên bản PVDH</span>
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                        <tr className="text-[11px] font-semibold whitespace-nowrap">
                          <th className="py-2.5 px-3 text-white">Phần biểu mẫu</th>
                          <th className="py-2.5 px-3 text-teal-100">Cấu trúc ghi nhận</th>
                          <th className="py-2.5 px-3 text-center text-[#5EEAD4]">Số mục</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                        {mappedSeed.sections.map((sec) => {
                          const secFields = mappedSeed.fields.filter(
                            (f) => f.sectionCode === sec.sectionCode
                          )
                          const secTitle =
                            sec.romanNumeral && !sec.title.startsWith(`${sec.romanNumeral}.`)
                              ? `${sec.romanNumeral}. ${sec.title}`
                              : sec.title
                          return (
                            <tr key={sec.sectionCode} className="hover:bg-[#F8FAFC] align-middle">
                              <td className="py-3 px-3 font-semibold text-[#003B3A] whitespace-nowrap">
                                {secTitle}
                              </td>
                              <td className="py-3 px-3 text-slate-600">
                                {secFields.map((f) => f.label).join(" • ")}
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-[#00736E] whitespace-nowrap">
                                {secFields.length} mục
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )
            })()}
          </div>
        ) : currentSubject?.code === "TCI" ? (
          <div className="lg:col-span-7 bg-white rounded-2xl p-5 md:p-6 border border-[#E2E8F0] shadow-xs space-y-3">
            <h2 className="text-base font-bold text-[#003B3A]">
              Phiếu đánh giá theo tiêu chí TCI (16 tiêu chí Khối 1)
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Biểu mẫu TCI sử dụng cấu trúc đánh giá 16 tiêu chí chuẩn phát triển (Đạt / Không đạt / Không làm / Chưa nhập) kèm minh chứng Câu 16 (STT 61) ở khung cấu hình chuyên biệt phía trên — không dùng bảng cột điểm số thông thường.
            </p>
          </div>
        ) : (
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 md:p-6 border border-[#E2E8F0] shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F0FDFA] border border-teal-200/70 flex items-center justify-center text-[#00736E]">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#003B3A]">
                  Thiết lập định dạng file & cột điểm
                </h2>
                <p className="text-xs text-slate-500">
                  Môn:{" "}
                  <strong className="text-[#00736E]">
                    {currentSubject ? `${currentSubject.name} (${currentSubject.code})` : "Chưa chọn"}
                  </strong>{" "}
                  •{" "}
                  {sortedTargetGrades.length > 1
                    ? `Gán ${sortedTargetGrades.length} khối (${sortedTargetGrades.join(", ")})`
                    : selectedGrade}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Số cột:</span>
              <div className="inline-flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0]">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setColumnCount(n)}
                    className={`w-7 h-7 text-xs font-bold rounded-lg transition-all ${
                      columnCount === n
                        ? "bg-[#003B3A] text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-200/70"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 1. BẢNG CHI TIẾT CÁC CỘT ĐIỂM THÀNH PHẦN (CHUẨN SKY-LINE ACADEMIC LEDGER TABLE) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#003B3A] flex items-center gap-2">
                <span>1. Chi tiết các cột điểm thành phần</span>
                <span className="text-[11px] text-[#00736E] font-semibold bg-[#F0FDFA] px-2 py-0.5 rounded-full border border-teal-200">
                  {columnCount} cột
                </span>
              </label>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setColumnCount(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] rounded-lg transition-colors"
                >
                  - Bớt cột
                </button>
                <button
                  type="button"
                  onClick={() => setColumnCount(prev => Math.min(16, prev + 1))}
                  className="px-2.5 py-1 text-xs font-semibold text-[#00736E] bg-[#F0FDFA] hover:bg-teal-100/70 border border-teal-200 rounded-lg transition-colors"
                >
                  + Thêm cột
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
              <table className="w-full text-left table-fixed min-w-[580px]">
                <colgroup>
                  <col className="w-12" />
                  <col className="w-auto" />
                  <col className="w-52 md:w-60" />
                  <col className="w-28" />
                  {formulaType === "WEIGHTED" && <col className="w-20" />}
                  <col className="w-11" />
                </colgroup>
                <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                  <tr className="text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-2.5 px-2 text-center text-white">STT</th>
                    <th className="py-2.5 px-3 text-white">Tên cột điểm thành phần</th>
                    <th className="py-2.5 px-3 text-teal-100">Loại thang điểm</th>
                    <th className="py-2.5 px-2 text-center text-[#5EEAD4]">Điểm tối đa</th>
                    {formulaType === "WEIGHTED" && (
                      <th className="py-2.5 px-2 text-center text-amber-200">Hệ số</th>
                    )}
                    <th className="py-2.5 px-2 text-center text-white">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {Array.from({ length: columnCount }).map((_, idx) => (
                    <tr key={idx} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                      <td className="py-3 px-2 text-center align-middle">
                        <span className="w-6 h-6 rounded-lg bg-[#F0FDFA] border border-teal-200 text-[#00736E] text-[11px] font-bold inline-flex items-center justify-center">
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <input
                          type="text"
                          value={columnNames[idx] || ""}
                          onChange={e => {
                            const val = e.target.value
                            setColumnNames(prev => {
                              const n = [...prev]
                              n[idx] = val
                              return n
                            })
                          }}
                          placeholder={`Tên cột điểm ${idx + 1}...`}
                          className="w-full h-8.5 px-3 bg-[#F8FAFC] hover:bg-white focus:bg-white border border-[#E2E8F0] focus:border-[#00A19A] rounded-xl text-xs font-semibold text-slate-800 outline-none transition-colors"
                        />
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <select
                          value={columnTypes[idx] || "SCORE_10"}
                          onChange={e => {
                            const val = e.target.value
                            setColumnTypes(prev => {
                              const n = [...prev]
                              n[idx] = val
                              return n
                            })
                          }}
                          className="w-full h-8.5 px-2.5 bg-[#F8FAFC] hover:bg-white focus:bg-white border border-[#E2E8F0] focus:border-[#00A19A] rounded-xl text-xs font-medium text-slate-700 outline-none transition-colors cursor-pointer truncate"
                        >
                          {COLUMN_TYPES.map(t => (
                            <option key={t.code} value={t.code}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-2 text-center align-middle">
                        {isQualitativeType(columnTypes[idx]) ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
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
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0
                                setColumnMaxScores(prev => {
                                  const n = [...prev]
                                  n[idx] = val
                                  return n
                                })
                              }}
                              className="w-14 h-8 px-1 text-center bg-[#F8FAFC] hover:bg-white focus:bg-white border border-[#E2E8F0] focus:border-[#00A19A] rounded-lg text-xs font-bold text-[#003B3A] outline-none"
                            />
                            <span className="text-[11px] font-medium text-slate-400">đ</span>
                          </div>
                        )}
                      </td>
                      {formulaType === "WEIGHTED" && (
                        <td className="py-3 px-2 text-center align-middle">
                          <input
                            type="number"
                            min="0.1"
                            step="0.5"
                            value={weights[idx] || 1}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 1
                              setWeights(prev => {
                                const n = [...prev]
                                n[idx] = val
                                return n
                              })
                            }}
                            className="w-14 h-8 px-1 text-center bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold text-amber-900 outline-none"
                          />
                        </td>
                      )}
                      <td className="py-3 px-2 text-center align-middle">
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
                            className="p-1 text-slate-400 hover:text-[#E11D48] hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#F8FAFC] border-t border-[#E2E8F0] text-xs">
                    <td colSpan={2} className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => setColumnCount(prev => Math.min(16, prev + 1))}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00736E] hover:text-[#003B3A]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm cột điểm mới</span>
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right text-[11px] font-semibold text-slate-500">
                      Tổng điểm tối đa:
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-xs font-bold text-[#003B3A] bg-[#F0FDFA] px-2.5 py-0.5 rounded-md border border-teal-200">
                        {totalMaxScore}đ
                      </span>
                    </td>
                    {formulaType === "WEIGHTED" && (
                      <td className="py-2.5 px-2 text-center text-[11px] font-bold text-[#D97706]">
                        ∑ = {weights.slice(0, columnCount).reduce((a, b) => a + (b || 1), 0)}
                      </td>
                    )}
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 2. ĐIỂM TỔNG HỢP & CÔNG THỨC TÍNH */}
          <div className="p-4 md:p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#003B3A] flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#008B85]" />
                <span>2. Điểm tổng hợp & công thức tính</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasComposite}
                  onChange={e => setHasComposite(e.target.checked)}
                  className="rounded text-[#00A19A] focus:ring-[#00A19A] w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">Có cột tổng hợp</span>
              </label>
            </div>

            {hasComposite && (
              <div className="space-y-4 pt-3 border-t border-[#E2E8F0]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Tên cột tổng hợp
                    </label>
                    <input
                      type="text"
                      value={compositeColumnName}
                      onChange={e => setCompositeColumnName(e.target.value)}
                      placeholder="Ví dụ: Điểm tổng hợp, Tổng điểm EPT"
                      className="w-full h-9.5 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#00A19A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Loại công thức
                    </label>
                    <select
                      value={formulaType}
                      onChange={e => setFormulaType(e.target.value as FormulaType)}
                      className="w-full h-9.5 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#00A19A]"
                    >
                      <option value="AVERAGE">Trung bình cộng (AVERAGE)</option>
                      <option value="SUM">Tổng điểm các cột thành phần (SUM)</option>
                      <option value="WEIGHTED">Trung bình có trọng số (Hệ số)</option>
                      <option value="CUSTOM">Biểu thức công thức tùy biến (CUSTOM)</option>
                      <option value="NONE">Không tính tự động (Định tính / Nhập tay)</option>
                    </select>
                  </div>
                </div>

                {formulaType === "CUSTOM" && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-[#D97706]">
                        Biểu thức công thức tùy biến
                      </label>
                      <span className="text-[11px] text-slate-500">Sử dụng [col0], [col1]...</span>
                    </div>
                    <input
                      type="text"
                      value={formulaCustom}
                      onChange={e => setFormulaCustom(e.target.value)}
                      placeholder="Ví dụ: ([col0]*2 + [col1] + [col2]) / 4"
                      className="w-full h-9.5 px-3 bg-white border border-amber-300 rounded-xl text-xs font-mono font-semibold text-slate-800 outline-none focus:border-[#D97706]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Quy tắc làm tròn
                    </label>
                    <select
                      value={roundingRule}
                      onChange={e => setRoundingRule(e.target.value as RoundingRule)}
                      className="w-full h-9.5 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#00A19A]"
                    >
                      <option value="ROUND_1">Làm tròn 1 chữ số thập phân (VD: 8.3)</option>
                      <option value="ROUND_2">Làm tròn 2 chữ số thập phân (VD: 8.25)</option>
                      <option value="ROUND_HALF">Làm tròn đến 0.5 (VD: 8.0, 8.5)</option>
                      <option value="ROUND_INT">Làm tròn số nguyên (VD: 8)</option>
                      <option value="NONE">Không làm tròn</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Mô tả công thức tự động
                    </label>
                    <div className="h-9.5 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs text-slate-600 flex items-center overflow-x-auto">
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

          {/* 3. CỘT NHẬN XÉT & NGƯỠNG XÉT DUYỆT */}
          <div className="p-4 md:p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#003B3A] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#008B85]" />
                <span>
                  {isEnglishSubject
                    ? "3. Cột nhận xét & ngưỡng điểm đạt chuẩn"
                    : "3. Cột nhận xét & ngưỡng đạt chuẩn / cam kết"}
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasRemark}
                  onChange={e => setHasRemark(e.target.checked)}
                  className="rounded text-[#00A19A] focus:ring-[#00A19A] w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">Có cột nhận xét</span>
              </label>
            </div>

            <div
              className={`grid ${
                isEnglishSubject ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
              } gap-4 pt-3 border-t border-[#E2E8F0]`}
            >
              <div>
                <label className="block text-xs font-semibold text-[#059669] mb-1">
                  Ngưỡng điểm đạt chuẩn
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={passScore}
                  onChange={e => setPassScore(e.target.value)}
                  placeholder="5.0"
                  className="w-full h-9.5 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#059669] outline-none focus:border-[#059669]"
                />
              </div>

              {!isEnglishSubject && (
                <div>
                  <label className="block text-xs font-semibold text-[#D97706] mb-1">
                    Ngưỡng điểm diện cam kết rèn luyện
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={commitmentThreshold}
                    onChange={e => setCommitmentThreshold(e.target.value)}
                    placeholder="4.5"
                    className="w-full h-9.5 px-3 bg-white border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#D97706] outline-none focus:border-[#D97706]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 4. MÔ PHỎNG TÍNH ĐIỂM TRỰC TIẾP (LIVE SIMULATOR) */}
          {hasComposite && isOrientationMode ? (
            <div className="p-4 md:p-5 bg-[#F0FDFA]/60 border border-teal-200 rounded-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-teal-200/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#003B3A] text-white flex items-center justify-center">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#003B3A] block">
                      Mô phỏng Phiếu định hướng đầu vào (2 tab liên kết)
                    </span>
                    <span className="text-[11px] text-[#00736E]">
                      Đánh giá định tính phi điểm số • Xem trước theo {selectedGrade}
                    </span>
                  </div>
                </div>

                <div className="inline-flex p-1 bg-white border border-[#E2E8F0] rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveOrientationSimTab("tab1")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      activeOrientationSimTab === "tab1"
                        ? "bg-[#003B3A] text-white"
                        : "text-slate-600 hover:text-[#003B3A]"
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Tab 1: Phỏng vấn HS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveOrientationSimTab("tab2")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      activeOrientationSimTab === "tab2"
                        ? "bg-[#003B3A] text-white"
                        : "text-slate-600 hover:text-[#003B3A]"
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
                  <div className="space-y-2.5">
                    {Array.from({ length: columnCount }).map((_, idx) => {
                      const curVal = simQualitativeAnswers[idx] || "NORMAL"
                      const criterionName =
                        columnNames[idx] ||
                        simOrientationCfg.criteria[idx]?.name ||
                        `Tiêu chí ${idx + 1}`
                      return (
                        <div
                          key={idx}
                          className="bg-white p-3 rounded-xl border border-[#E2E8F0] space-y-2"
                        >
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded bg-[#F0FDFA] text-[#00736E] text-[10px] font-bold inline-flex items-center justify-center border border-teal-200">
                              {idx + 1}
                            </span>
                            <span>{criterionName}</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {[
                              {
                                code: "CONFIDENT",
                                label: "Tự tin / Tích cực",
                                active: "bg-[#059669] text-white border-[#059669]"
                              },
                              {
                                code: "NORMAL",
                                label: "Bình thường / Ổn định",
                                active: "bg-[#008B85] text-white border-[#008B85]"
                              },
                              {
                                code: "NEED_SUPPORT",
                                label: "Cần hỗ trợ ban đầu",
                                active: "bg-[#D97706] text-white border-[#D97706]"
                              },
                              {
                                code: "SPECIAL_ATTENTION",
                                label: "Lưu ý đặc biệt",
                                active: "bg-[#E11D48] text-white border-[#E11D48]"
                              }
                            ].map(opt => (
                              <button
                                key={opt.code}
                                type="button"
                                onClick={() =>
                                  setSimQualitativeAnswers(prev => ({
                                    ...prev,
                                    [idx]: opt.code
                                  }))
                                }
                                className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                                  curVal === opt.code
                                    ? opt.active
                                    : "bg-[#F8FAFC] text-slate-600 border-[#E2E8F0] hover:bg-white"
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
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {[
                      simOrientationCfg.parentPrompts.group1_expectations,
                      simOrientationCfg.parentPrompts.group2_personality,
                      simOrientationCfg.parentPrompts.group3_support,
                      simOrientationCfg.parentPrompts.group4_cooperation
                    ].map((grp, i) => (
                      <div
                        key={i}
                        className="bg-white p-3 rounded-xl border border-[#E2E8F0] space-y-1"
                      >
                        <span className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
                          <MessageSquareQuote className="w-3.5 h-3.5 text-[#008B85]" />
                          <span>{grp.title}</span>
                        </span>
                        <p className="text-xs text-slate-600 bg-[#F8FAFC] p-2 rounded-lg border border-[#F1F5F9]">
                          {grp.placeholder}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          ) : hasComposite ? (
            <div className="p-4 bg-[#F0FDFA]/70 border border-teal-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-[#00736E] fill-[#00736E]" />
                  <span className="text-xs font-bold text-[#003B3A]">
                    Bộ mô phỏng tính điểm trực tiếp
                  </span>
                </div>
                <span className="text-[11px] text-[#00736E] font-semibold bg-white px-2.5 py-0.5 rounded-full border border-teal-200">
                  Kiểm thử công thức
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Array.from({ length: columnCount }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-2.5 rounded-xl border border-[#E2E8F0]"
                  >
                    <span
                      className="text-[11px] font-medium text-slate-500 block truncate"
                      title={columnNames[idx]}
                    >
                      {columnNames[idx] || `Cột ${idx + 1}`}
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      value={simScores[idx] || ""}
                      onChange={e => {
                        const val = e.target.value
                        setSimScores(prev => ({ ...prev, [idx]: val }))
                      }}
                      className="w-full mt-1 h-7 text-xs font-bold text-center text-[#003B3A] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg outline-none focus:border-[#00A19A]"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-teal-200/60">
                <span className="text-xs font-semibold text-[#003B3A]">
                  Kết quả dự kiến: <strong className="text-[#00736E]">{compositeColumnName}</strong>
                </span>
                <div className="flex items-center gap-2.5">
                  <span className="text-lg font-bold text-[#003B3A]">
                    {simulatedResult != null ? simulatedResult : "--"}
                  </span>
                  {simulatedResult != null && !isNaN(Number(simulatedResult)) && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        Number(simulatedResult) >= parseFloat(passScore || "5")
                          ? "bg-emerald-50 text-[#059669] border-emerald-200"
                          : !isEnglishSubject &&
                              Number(simulatedResult) >= parseFloat(commitmentThreshold || "4.5")
                            ? "bg-amber-50 text-[#D97706] border-amber-200"
                            : "bg-rose-50 text-[#E11D48] border-rose-200"
                      }`}
                    >
                      {Number(simulatedResult) >= parseFloat(passScore || "5")
                        ? "Đạt chuẩn"
                        : !isEnglishSubject &&
                            Number(simulatedResult) >= parseFloat(commitmentThreshold || "4.5")
                          ? "Diện cam kết"
                          : "Chưa đạt"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* BOTTOM SAVE CTA */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F1F5F9]">
            <div className="text-xs text-slate-500">
              Phạm vi lưu:{" "}
              <strong className="text-[#003B3A]">
                {resolvePeriodInfo(selectedPeriodId, periods).shortLabel}
              </strong>{" "}
              •{" "}
              <strong className="text-[#00736E]">
                {targetSystemCodes.length > 1
                  ? `${targetSystemCodes.length} hệ (${targetSystemCodes.join(", ")})`
                  : resolveSystemInfo(targetSystemCodes[0], normalizedSystems).fullLabel}
              </strong>{" "}
              •{" "}
              <strong className="text-[#003B3A]">
                {sortedTargetGrades.length > 1
                  ? `${sortedTargetGrades.length} khối (${sortedTargetGrades.join(", ")})`
                  : selectedGrade}
              </strong>
            </div>

            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#003B3A] hover:bg-[#004d4b] text-white rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {savingConfig ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang lưu cấu hình...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-[#5EEAD4]" />
                  <span>
                    {sortedTargetGrades.length > 1 || targetSystemCodes.length > 1
                      ? `Lưu & gán cấu hình (${sortedTargetGrades.length} khối)`
                      : `Lưu cấu hình mẫu (${selectedGrade})`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
        )}

        {/* RIGHT COLUMN (5/12): CẤU HÌNH MẪU ĐÃ LƯU HIỂN THỊ THEO MỐC THỜI GIAN / KỲ KS */}
        <SavedConfigsByPeriodPanel
          savedConfigs={savedConfigs}
          loadingConfigs={loadingConfigs}
          subjects={subjects}
          grades={grades}
          periods={periods}
          normalizedSystems={normalizedSystems}
          selectedPeriodId={selectedPeriodId}
          selectedSystemCode={selectedSystemCode}
          selectedGrade={selectedGrade}
          targetGrades={sortedTargetGrades}
          selectedSubjectId={selectedSubjectId}
          listFilterSubjectId={listFilterSubjectId}
          onChangeFilterSubjectId={setListFilterSubjectId}
          listFilterPeriod={listFilterPeriod}
          onChangeFilterPeriod={setListFilterPeriod}
          listFilterSystemCode={listFilterSystemCode}
          onChangeFilterSystemCode={setListFilterSystemCode}
          listFilterGrade={listFilterGrade}
          onChangeFilterGrade={setListFilterGrade}
          onRefresh={fetchConfigs}
          onLoadConfig={loadConfigToForm}
          onLoadGroupGrades={handleLoadGroupGrades}
          onExportExcel={handleExportBlankExcel}
          onDeleteConfig={handleDeleteConfig}
        />
      </div>
        </>
      )}

      {/* BATCH ASSIGN MODAL (ĐA KỲ • ĐA HỆ HNG • ĐA KHỐI • ĐA MÔN) */}
      <BatchAssignModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        selectedYearId={selectedYearId}
        periodsForYear={periodsForYear}
        normalizedSystems={normalizedSystems}
        grades={grades}
        subjects={subjects}
        initialPeriodId={selectedPeriodId}
        initialSystemCodes={targetSystemCodes}
        initialGrades={sortedTargetGrades}
        currentFormPayload={{
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
          commitmentThreshold: isEnglishSubject
            ? null
            : commitmentThreshold
              ? parseFloat(commitmentThreshold)
              : null
        }}
        onSuccess={msg => {
          showMessage(msg, "ok")
          fetchConfigs()
        }}
      />

      {/* CLONE MODAL */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-[#E2E8F0] space-y-4 tabular-nums">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F0FDFA] flex items-center justify-center text-[#00736E]">
                  <Copy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#003B3A]">
                    Sao chép cấu trúc cột điểm từ mẫu đã lưu
                  </h3>
                  <p className="text-xs text-slate-500">
                    Áp dụng vào biểu mẫu hiện tại của môn{" "}
                    <strong className="text-[#00736E]">{currentSubject?.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCloneModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {savedConfigs.filter(c => c.subjectId === selectedSubjectId).length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                Môn <strong>{currentSubject?.name}</strong> chưa có mẫu đã lưu nào để sao chép. Bạn có thể chọn trực tiếp từ thanh Nạp nhanh mẫu chuẩn.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {savedConfigs
                  .filter(c => c.subjectId === selectedSubjectId)
                  .map(cfg => {
                    let cNames: string[] = []
                    try {
                      cNames = JSON.parse(cfg.columnNames || "[]")
                    } catch (_) {}
                    const isChosen = cloneSourceConfigId === cfg.id
                    const pInfo = resolvePeriodInfo(cfg.periodId, periods)
                    const sysInfo = resolveSystemInfo(
                      cfg.educationSystemId,
                      normalizedSystems,
                      cfg.educationSystemName
                    )
                    return (
                      <div
                        key={cfg.id}
                        onClick={() => setCloneSourceConfigId(cfg.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isChosen
                            ? "bg-[#F0FDFA] border-[#00A19A]"
                            : "bg-[#F8FAFC] border-[#E2E8F0] hover:bg-white"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-[#003B3A] text-white text-[10px] font-bold">
                              {cfg.grade}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white border border-[#E2E8F0] text-slate-700 text-[10px] font-semibold">
                              {pInfo.shortLabel}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-teal-50 text-[#00736E] text-[10px] font-semibold">
                              {sysInfo.isAll ? "Hệ chung" : sysInfo.code}
                            </span>
                            <span className="text-xs font-semibold text-slate-700">
                              {cfg.columnCount} cột • {cfg.formula}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {cNames.join(" • ")}
                          </p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isChosen
                              ? "border-[#00A19A] bg-[#00A19A]"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChosen && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setIsCloneModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-slate-600 text-xs font-semibold hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={!cloneSourceConfigId}
                onClick={handleApplyClone}
                className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#004d4b] text-white text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5 text-[#5EEAD4]" />
                <span>Sao chép vào biểu mẫu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
