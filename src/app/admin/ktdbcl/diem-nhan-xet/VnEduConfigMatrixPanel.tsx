"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  BookOpen,
  CheckCircle2,
  CheckSquare,
  Copy,
  History,
  Layers,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sliders,
  Square,
  Trash2,
  Wand2,
  X,
} from "lucide-react"
import toast from "react-hot-toast"
import {
  buildSecondaryTt22VnEduDefaultConfig,
  DEFAULT_RATING_CODES_TT27,
  extractGradeNumber,
  findExactPeriodInternalOverrideConfig,
  getPrimaryPeriodMeta,
  getSubjectCurriculumGroup,
  GradeColumnDef,
  isKsdnEvaluationPeriod,
  isPrimaryGrade,
  isPrimarySubjectForGrade,
  isSecondarySubjectForGrade,
  isTt22CommentOnlySubject,
  normalizeGradeColumnDefs,
  shouldPrimarySubjectHaveKtColumn,
} from "@/lib/grading/vnedu-config-types"
import { QD82_2026_SUBJECT_STANDARDS } from "@/lib/timetable/curriculumStandardQd82"

interface VnEduConfigMatrixPanelProps {
  academicYearId: string
  subjects: any[]
  configs: any[]
  grades: string[]
  evalPeriods: Array<{ code: string; name: string }>
  onConfigsChanged: () => void
  onSwitchToInternalConfig?: (grade: string, period: string, subjectId?: string) => void
}

const PROGRAM_OPTIONS = [
  { code: "ALL", name: "Tất cả chương trình/hệ (Hệ S & Hệ I)" },
  { code: "Hệ S", name: "Hệ S — Hội nhập Sky-Line" },
  { code: "Hệ I", name: "Hệ I — Song bằng & Quốc tế" },
  { code: "MOET", name: "Chuẩn Bộ GD&ĐT (MOET)" },
]

export type EducationLevelCode = "PRIMARY" | "MIDDLE" | "HIGH"

const EDUCATION_LEVEL_OPTIONS: Array<{
  code: EducationLevelCode
  shortLabel: string
  fullLabel: string
  circularLabel: string
  grades: string[]
}> = [
  {
    code: "PRIMARY",
    shortLabel: "Tiểu học",
    fullLabel: "Bậc Tiểu học (Khối 1 – Khối 5)",
    circularLabel: "Thông tư 27/2020/TT-BGDĐT",
    grades: ["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5"],
  },
  {
    code: "MIDDLE",
    shortLabel: "THCS",
    fullLabel: "Bậc THCS (Khối 6 – Khối 9)",
    circularLabel: "Thông tư 22/2021/TT-BGDĐT",
    grades: ["Khối 6", "Khối 7", "Khối 8", "Khối 9"],
  },
  {
    code: "HIGH",
    shortLabel: "THPT",
    fullLabel: "Bậc THPT (Khối 10 – Khối 12)",
    circularLabel: "Thông tư 22/2021/TT-BGDĐT",
    grades: ["Khối 10", "Khối 11", "Khối 12"],
  },
]

function getEducationLevelFromGrade(targetGrade: string): EducationLevelCode {
  const gNum = extractGradeNumber(targetGrade) || 1
  if (gNum <= 5) return "PRIMARY"
  if (gNum <= 9) return "MIDDLE"
  return "HIGH"
}

function getEducationLevelShortLabel(targetGrade: string): string {
  const lvl = getEducationLevelFromGrade(targetGrade)
  if (lvl === "PRIMARY") return "Tiểu học"
  if (lvl === "MIDDLE") return "THCS"
  return "THPT"
}

export function VnEduConfigMatrixPanel({
  academicYearId,
  subjects,
  configs,
  grades,
  evalPeriods,
  onConfigsChanged,
  onSwitchToInternalConfig,
}: VnEduConfigMatrixPanelProps) {
  const [program, setProgram] = useState("ALL")
  const [educationLevel, setEducationLevel] = useState<EducationLevelCode>("PRIMARY")
  const [grade, setGrade] = useState("Khối 4")
  const [period, setPeriod] = useState("CK1")
  const [subjectId, setSubjectId] = useState<string>("")
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])
  const [subjectSearch, setSubjectSearch] = useState("")
  const [onlyPrimarySubjectsForGrade, setOnlyPrimarySubjectsForGrade] = useState(true)
  const [subjectCategoryTab, setSubjectCategoryTab] = useState<"MOET_AND_SKL" | "MOET" | "SKL" | "BILINGUAL" | "ALL">("MOET_AND_SKL")
  const [confirmationStatus, setConfirmationStatus] = useState<"CONFIRMED" | "UNCONFIRMED">("CONFIRMED")
  const [editorStructureMode, setEditorStructureMode] = useState<"WITH_KT" | "REMARK_ONLY" | "SCORE_10" | "RATING_DAT" | "INTERNAL_SKL">("WITH_KT")
  const [hasCompositeColumn, setHasCompositeColumn] = useState(false)
  const [compositeColumnName, setCompositeColumnName] = useState("ĐTBmhk")
  const [hasRatingColumn, setHasRatingColumn] = useState(true)
  const [ratingColumnName, setRatingColumnName] = useState("XL CK1")
  const [hasRemarkColumn, setHasRemarkColumn] = useState(true)
  const [internalFormula, setInternalFormula] = useState<string>("AVERAGE")
  const [internalFormulaCustom, setInternalFormulaCustom] = useState<string | null>(null)
  const [internalWeights, setInternalWeights] = useState<string | null>(null)
  const [internalRoundingRule, setInternalRoundingRule] = useState<string>("ROUND_1")
  const [changeNote, setChangeNote] = useState("")
  const [showAdvancedColumns, setShowAdvancedColumns] = useState(false)

  // Unified Matrix state & multi-row selection + On-click Subject Detail state
  const [matrixGradeFilter, setMatrixGradeFilter] = useState<string>("ALL")
  const [matrixPeriodFilter, setMatrixPeriodFilter] = useState<string>("ALL")
  const [selectedMatrixConfigIds, setSelectedMatrixConfigIds] = useState<string[]>([])
  const [selectedMatrixSubjectIds, setSelectedMatrixSubjectIds] = useState<string[]>([])
  const [bulkDeletingMatrix, setBulkDeletingMatrix] = useState(false)
  const [inspectedSubjectId, setInspectedSubjectId] = useState<string | null>(null)
  const [matrixViewAllGradesInLevel, setMatrixViewAllGradesInLevel] = useState<boolean>(false)

  // Flexible Period-by-Subject Matrix state (Môn × Kỳ: Tiểu học = Có cột KT vs Chỉ XL+NX; THCS/THPT = Điểm số Thang 10 vs Nhận xét Đ/CĐ)
  const [showTt27MatrixPanel, setShowTt27MatrixPanel] = useState(true)
  const [tt27ActivePeriods, setTt27ActivePeriods] = useState<string[]>(["GK1", "CK1", "GK2", "CK2"])
  const [tt27KtMatrix, setTt27KtMatrix] = useState<Record<string, Record<string, boolean>>>({})
  // Hệ S / Hệ I applicability per subject in current Grade
  const [tt27SystemMatrix, setTt27SystemMatrix] = useState<Record<string, { S: boolean; I: boolean }>>({})

  const [columns, setColumns] = useState<GradeColumnDef[]>([
    {
      key: "col0",
      label: "KT CK1",
      group: "CK",
      attempt: 1,
      dataType: "NUMBER",
      scaleCode: "SCORE_10",
      maxScore: 10,
      allowedCodes: null,
      required: false,
      inputMode: "INPUT",
      order: 1,
      aliases: ["KT CK1", "KTCK1", "KT", "Điểm KTĐK"],
    },
  ])

  const [saving, setSaving] = useState(false)
  const [autoGeneratingPrimary, setAutoGeneratingPrimary] = useState(false)
  const [togglingRowId, setTogglingRowId] = useState<string | null>(null)
  const [historyModal, setHistoryModal] = useState<{ open: boolean; title: string; versions: any[] }>({
    open: false,
    title: "",
    versions: [],
  })

  // Batch copy modal state
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchTargetGrades, setBatchTargetGrades] = useState<string[]>([])
  const [batchTargetPeriods, setBatchTargetPeriods] = useState<string[]>([])
  const [batchTargetSubjectIds, setBatchTargetSubjectIds] = useState<string[]>([])
  const [batchPreviewRows, setBatchPreviewRows] = useState<any[]>([])
  const [batchLoading, setBatchLoading] = useState(false)

  const vnEduConfigs = useMemo(
    () =>
      configs.filter(
        c =>
          c.configType === "VNEDU" &&
          c.isActive !== false &&
          (!c.subject || getSubjectCurriculumGroup(c.subject) === "MOET")
      ),
    [configs]
  )

  // Cấu hình từ "2. Đánh giá nội bộ Sky-Line" (INTERNAL) — dùng cho Kỳ Khảo sát đầu năm (KSĐN)
  const internalConfigs = useMemo(
    () => configs.filter(c => (c.configType || "INTERNAL") === "INTERNAL" && c.isActive !== false),
    [configs]
  )

  const isPrimary = useMemo(() => isPrimaryGrade(grade), [grade])
  const currentLevelMeta = useMemo(
    () =>
      EDUCATION_LEVEL_OPTIONS.find(l => l.code === educationLevel) ||
      EDUCATION_LEVEL_OPTIONS[0],
    [educationLevel]
  )
  const gradesInSelectedLevel = useMemo(() => {
    const matched = grades.filter(g => getEducationLevelFromGrade(g) === educationLevel)
    return matched.length > 0 ? matched : currentLevelMeta.grades
  }, [grades, educationLevel, currentLevelMeta])

  // Keep educationLevel synced if grade is changed externally (e.g., loadConfigIntoEditor)
  useEffect(() => {
    const derived = getEducationLevelFromGrade(grade)
    if (derived !== educationLevel) {
      setEducationLevel(derived)
    }
  }, [grade])

  const handleSelectEducationLevel = (nextLevel: EducationLevelCode) => {
    setEducationLevel(nextLevel)
    const meta = EDUCATION_LEVEL_OPTIONS.find(l => l.code === nextLevel) || EDUCATION_LEVEL_OPTIONS[0]
    const currentGradeLevel = getEducationLevelFromGrade(grade)
    if (currentGradeLevel !== nextLevel) {
      const nextDefaultGrade = meta.grades[0] || "Khối 1"
      setGrade(nextDefaultGrade)
      setSelectedSubjectIds([])
      setInspectedSubjectId(null)
      if (nextLevel === "PRIMARY" && period === "CN") {
        setPeriod("CK1")
      }
    }
  }

  const primaryMeta = useMemo(() => getPrimaryPeriodMeta(period), [period])
  const isCurrentPeriodKsdn = useMemo(() => isKsdnEvaluationPeriod(period), [period])
  const isGrade6 = useMemo(() => extractGradeNumber(grade) === 6, [grade])
  // Quy tắc nghiệp vụ: Với Khối 6 KSĐN thì các môn khảo sát lấy ở Tiểu học của Khối 5
  const isGrade6Ksdn = useMemo(() => isGrade6 && isCurrentPeriodKsdn, [isGrade6, isCurrentPeriodKsdn])
  const effectiveSubjectGrade = useMemo(() => (isGrade6Ksdn ? "Khối 5" : grade), [isGrade6Ksdn, grade])
  const isEffectivePrimaryForSubjects = useMemo(
    () => isPrimary || isGrade6Ksdn,
    [isPrimary, isGrade6Ksdn]
  )

  // Helper xây dựng bản đồ cấu hình KSĐN cho một Khối bất kỳ
  // Đặc biệt: Với Khối 6 KSĐN thì danh sách môn khảo sát lấy ở bậc Tiểu học của Khối 5
  const buildKsdnConfigsMapForGrade = (targetGrade: string) => {
    const map = new Map<string, any>()
    const gNum = extractGradeNumber(targetGrade)

    const matchesExactGradeNum = (cGrade?: string | null, numToMatch?: number | null) => {
      if (numToMatch === null || numToMatch === undefined) return false
      const g = String(cGrade || "").trim()
      if (g === `Khối ${numToMatch}` || g === String(numToMatch)) return true
      const cgNum = extractGradeNumber(g)
      return cgNum !== null && cgNum === numToMatch
    }

    const populateFromGradeNum = (numToMatch: number, onlyPrimaryLvl = false) => {
      // 1. Lấy cấu hình INTERNAL kỳ ALL hoặc KSĐN của khối numToMatch
      for (const c of internalConfigs) {
        if (!c.subjectId || c.subjectId === "ALL") continue
        if (!matchesExactGradeNum(c.grade, numToMatch)) continue
        if (onlyPrimaryLvl) {
          const subjObj = subjects.find(s => s.id === c.subjectId)
          if (subjObj && !String(subjObj.level || "ALL").toUpperCase().includes("PRIMARY") && String(subjObj.level || "ALL").toUpperCase() !== "ALL") {
            continue
          }
        }
        if (c.evaluationPeriod === "ALL") {
          map.set(c.subjectId, c)
        }
      }
      for (const c of internalConfigs) {
        if (!c.subjectId || c.subjectId === "ALL") continue
        if (!matchesExactGradeNum(c.grade, numToMatch)) continue
        if (onlyPrimaryLvl) {
          const subjObj = subjects.find(s => s.id === c.subjectId)
          if (subjObj && !String(subjObj.level || "ALL").toUpperCase().includes("PRIMARY") && String(subjObj.level || "ALL").toUpperCase() !== "ALL") {
            continue
          }
        }
        if (isKsdnEvaluationPeriod(c.evaluationPeriod)) {
          map.set(c.subjectId, c)
        }
      }
      // 2. Với Khối 5 (hoặc Khối 6 lấy từ Tiểu học Khối 5): bổ sung các môn Tiểu học Khối 5 đã có cấu hình INTERNAL ở GK1 (như Tiếng Việt TVI) hoặc có cấu hình KSĐN ở Khối 5
      if (numToMatch === 5) {
        for (const c of internalConfigs) {
          if (!c.subjectId || c.subjectId === "ALL" || map.has(c.subjectId)) continue
          if (matchesExactGradeNum(c.grade, 5)) {
            map.set(c.subjectId, c)
          }
        }
        for (const c of vnEduConfigs) {
          if (!c.subjectId || c.subjectId === "ALL" || map.has(c.subjectId)) continue
          if (matchesExactGradeNum(c.grade, 5) && isKsdnEvaluationPeriod(c.evaluationPeriod)) {
            const fallbackInternal =
              internalConfigs.find(ic => ic.subjectId === c.subjectId && (matchesExactGradeNum(ic.grade, 6) || matchesExactGradeNum(ic.grade, 4))) ||
              internalConfigs.find(ic => !ic.subjectId && matchesExactGradeNum(ic.grade, 5)) ||
              c
            map.set(c.subjectId, fallbackInternal)
          }
        }
      }
    }

    if (gNum === 6) {
      // Khối 6 KSĐN: Lấy danh sách các môn khảo sát ở Tiểu học của Khối 5
      populateFromGradeNum(5, true)
      // Nếu môn Tiểu học Khối 5 đó có cấu hình INTERNAL riêng ở Khối 6 (như Toán học, Tiếng Anh, ESL, Mathematics), cập nhật cấu hình cột từ Khối 6
      for (const c of internalConfigs) {
        if (!c.subjectId || c.subjectId === "ALL") continue
        if (!matchesExactGradeNum(c.grade, 6)) continue
        const subjObj = subjects.find(s => s.id === c.subjectId)
        const isPrimarySubj =
          map.has(c.subjectId) ||
          (subjObj &&
            (String(subjObj.level || "ALL").toUpperCase().includes("PRIMARY") ||
              String(subjObj.level || "ALL").toUpperCase() === "ALL") &&
            isPrimarySubjectForGrade(subjObj, "Khối 5"))
        if (!isPrimarySubj) continue
        if (c.evaluationPeriod === "ALL" && !map.has(c.subjectId)) {
          map.set(c.subjectId, c)
        } else if (isKsdnEvaluationPeriod(c.evaluationPeriod) || c.evaluationPeriod === "ALL") {
          map.set(c.subjectId, c)
        }
      }
    } else if (gNum !== null) {
      populateFromGradeNum(gNum, false)
    }

    return map
  }

  // Bản đồ các môn của Khối hiện tại trong kỳ KSĐN lấy từ "2. Đánh giá nội bộ Sky-Line"
  // (Với Khối 6 KSĐN thì các môn khảo sát lấy ở Tiểu học của Khối 5)
  const ksdnInternalConfigsForCurrentGradeBySubjectId = useMemo(
    () => buildKsdnConfigsMapForGrade(grade),
    [internalConfigs, vnEduConfigs, subjects, grade]
  )

  // Ánh xạ môn THCS Khối 6 sang môn Tiểu học Khối 5 tương ứng cho cột KSĐN (ví dụ: Ngữ Văn K6 -> Tiếng Việt K5, KHTN K6 -> Science K5)
  const resolveKsdnConfigForSubjectInGrade = (subj: any, targetGrade: string): { cfg: any; mappedFromSubj?: any } => {
    const map = targetGrade === grade ? ksdnInternalConfigsForCurrentGradeBySubjectId : buildKsdnConfigsMapForGrade(targetGrade)
    if (!subj) return { cfg: null }
    const direct = map.get(subj.id)
    if (direct) return { cfg: direct }

    if (extractGradeNumber(targetGrade) === 6) {
      const code = String(subj.subjectCode || "").toUpperCase().trim()
      const name = String(subj.subjectName || "").toLowerCase().trim()
      // Ngữ Văn (NVA) ở Khối 6 -> KSĐN lấy môn Tiếng Việt (TVI) ở Tiểu học Khối 5
      if (code === "NVA" || code === "VAN" || name.includes("ngữ văn") || name.includes("ngu van")) {
        const tviSubj = subjects.find(
          s => String(s.subjectCode || "").toUpperCase() === "TVI" || String(s.subjectName || "").toLowerCase().includes("tiếng việt")
        )
        if (tviSubj && map.has(tviSubj.id)) {
          return { cfg: map.get(tviSubj.id), mappedFromSubj: tviSubj }
        }
      }
      // Khoa học tự nhiên (KHT) ở Khối 6 -> KSĐN lấy môn Science (SCI) / Khoa học ở Tiểu học Khối 5
      if (code === "KHT" || name.includes("khoa học tự nhiên")) {
        const sciSubj = subjects.find(
          s => String(s.subjectCode || "").toUpperCase() === "SCI" || String(s.subjectName || "").toLowerCase() === "science"
        )
        if (sciSubj && map.has(sciSubj.id)) {
          return { cfg: map.get(sciSubj.id), mappedFromSubj: sciSubj }
        }
      }
    }
    return { cfg: null }
  }

  const formatInternalConfigSummary = (cfg: any): { shortLabel: string; fullTitle: string } => {
    if (!cfg) {
      return {
        shortLabel: "Chưa gán ở 2. ĐG nội bộ",
        fullTitle: "Môn này chưa được gán trong 2. Đánh giá nội bộ Sky-Line cho kỳ KSĐN",
      }
    }
    let colNames: string[] = []
    try {
      colNames = Array.isArray(cfg.columnNames) ? cfg.columnNames : JSON.parse(cfg.columnNames || "[]")
    } catch {
      colNames = []
    }
    const cleanCols = colNames.filter(Boolean)
    const compLabel = cfg.hasCompositeColumn !== false ? (cfg.compositeColumnName || "Điểm TP") : ""
    const shortCols = cleanCols.length <= 2 ? cleanCols.join(" + ") : `${cleanCols.length} cột điểm`
    const shortLabel = [shortCols, compLabel].filter(Boolean).join(" + ") || "Theo 2. ĐG nội bộ"
    const fullTitle = `2. Đánh giá nội bộ Sky-Line (KSĐN): ${cleanCols.join(", ")}${compLabel ? ` → ${compLabel}` : ""}${cfg.hasRemarkColumn !== false ? " + Nhận xét" : ""}`
    return { shortLabel, fullTitle }
  }

  // Ensure "CN" (Cả năm) is present in evaluation periods for THCS/THPT, and excluded from Primary TT27 matrix
  const effectiveEvalPeriods = useMemo(() => {
    const list = [...evalPeriods]
    if (!isPrimary && !list.some(p => p.code === "CN")) {
      list.push({ code: "CN", name: "Cả năm (CN)" })
    }
    return isPrimary ? list.filter(p => p.code !== "CN") : list
  }, [evalPeriods, isPrimary])

  // Tra cứu thông tin Hệ S / Hệ I và số tiết định mức theo Khối của từng môn học (theo SubjectQuota & QĐ 82/2026)
  const getSubjectSystemInfoForGrade = (s: any, targetGrade: string): { hasS: boolean; hasI: boolean; quotaS: number; quotaI: number } => {
    const gNum = extractGradeNumber(targetGrade) || 1
    const fieldName = gNum <= 9 ? `quotaG${gNum}` : `quotaG${gNum}`
    let quotaS = 0
    let quotaI = 0
    let foundInDbQuotas = false

    if (Array.isArray(s?.quotas) && s.quotas.length > 0) {
      const qS = s.quotas.find((q: any) => String(q.studyProgram || "").includes("Hệ S") || q.studyProgram === "HNS")
      const qI = s.quotas.find((q: any) => String(q.studyProgram || "").includes("Hệ I") || q.studyProgram === "HNG" || q.studyProgram === "SB")
      if (qS || qI) {
        foundInDbQuotas = true
        quotaS = Number(qS?.[fieldName] ?? 0) || 0
        quotaI = Number(qI?.[fieldName] ?? 0) || 0
      }
    }

    if (!foundInDbQuotas) {
      const codeUpper = String(s?.subjectCode || "").toUpperCase().trim()
      const std = QD82_2026_SUBJECT_STANDARDS.find(x => x.subjectCode.toUpperCase() === codeUpper)
      if (std) {
        if (gNum >= 1 && gNum <= 9) {
          quotaS = Number((std.heS.grades1To9 as any)?.[gNum] ?? 0) || 0
          quotaI = Number((std.heI.grades1To9 as any)?.[gNum] ?? 0) || 0
        } else {
          quotaS = Math.max(Number((std.heS as any)[`g${gNum}TN`] ?? 0), Number((std.heS as any)[`g${gNum}XH`] ?? 0))
          quotaI = Math.max(Number((std.heI as any)[`g${gNum}TN`] ?? 0), Number((std.heI as any)[`g${gNum}XH`] ?? 0))
        }
      }
    }

    const studyProgStr = String(s?.studyPrograms || "").trim()
    let hasS = quotaS > 0
    let hasI = quotaI > 0

    if (!hasS && !hasI) {
      if (studyProgStr) {
        hasS = studyProgStr.includes("Hệ S") || studyProgStr.includes("HNS")
        hasI = studyProgStr.includes("Hệ I") || studyProgStr.includes("HNG") || studyProgStr.includes("SB")
      }
      if (!hasS && !hasI) {
        hasS = true
        hasI = true
      }
    }

    return { hasS, hasI, quotaS, quotaI }
  }

  // Helper: check if a Subject's level matches the current grade's level ("PRIMARY" | "MIDDLE" | "HIGH")
  const matchesGradeLevel = (s: any, targetGrade: string): boolean => {
    const gNum = extractGradeNumber(targetGrade) || 1
    const targetLvl = gNum <= 5 ? "PRIMARY" : gNum <= 9 ? "MIDDLE" : "HIGH"
    const lvlStr = String(s?.level || "ALL").toUpperCase().trim()
    if (!lvlStr || lvlStr === "ALL") return true
    return lvlStr.includes(targetLvl)
  }

  // Danh mục 1: Môn học Chương trình Bộ GD&ĐT (MOET) theo Khối
  // Lưu ý: Với Khối 6 KSĐN thì các môn khảo sát lấy ở Tiểu học của Khối 5 ("Khối 5")
  const moetSubjectsForCurrentGrade = useMemo(() => {
    const moetPool = subjects.filter(s => getSubjectCurriculumGroup(s) === "MOET")
    if (!onlyPrimarySubjectsForGrade) {
      if (isGrade6Ksdn) {
        return moetPool.filter(s => isPrimarySubjectForGrade(s, "Khối 5") || ksdnInternalConfigsForCurrentGradeBySubjectId.has(s.id))
      }
      return moetPool
    }
    if (isCurrentPeriodKsdn && ksdnInternalConfigsForCurrentGradeBySubjectId.size > 0) {
      return moetPool.filter(s => ksdnInternalConfigsForCurrentGradeBySubjectId.has(s.id))
    }
    const matched = isEffectivePrimaryForSubjects
      ? moetPool.filter(
          s =>
            isPrimarySubjectForGrade(s, effectiveSubjectGrade) ||
            ksdnInternalConfigsForCurrentGradeBySubjectId.has(s.id) ||
            (!isGrade6Ksdn && vnEduConfigs.some(c => c.grade === grade && c.subjectId === s.id))
        )
      : moetPool.filter(
          s =>
            isSecondarySubjectForGrade(s, effectiveSubjectGrade) ||
            ksdnInternalConfigsForCurrentGradeBySubjectId.has(s.id) ||
            vnEduConfigs.some(c => c.grade === grade && c.subjectId === s.id)
        )
    return matched.length > 0 ? matched : moetPool
  }, [
    subjects,
    grade,
    effectiveSubjectGrade,
    isEffectivePrimaryForSubjects,
    isGrade6Ksdn,
    onlyPrimarySubjectsForGrade,
    isCurrentPeriodKsdn,
    ksdnInternalConfigsForCurrentGradeBySubjectId,
    vnEduConfigs,
  ])

  // Danh mục 2: Môn học Đặc thù Sky-Line (SKL) theo Khối
  const sklSubjectsForCurrentGrade = useMemo(() => {
    const sklPool = subjects.filter(s => getSubjectCurriculumGroup(s) === "SKL")
    if (!onlyPrimarySubjectsForGrade) {
      if (isGrade6Ksdn) {
        return sklPool.filter(s => matchesGradeLevel(s, "Khối 5") || ksdnInternalConfigsForCurrentGradeBySubjectId.has(s.id))
      }
      return sklPool
    }
    if (isCurrentPeriodKsdn && ksdnInternalConfigsForCurrentGradeBySubjectId.size > 0) {
      const ksdnMatched = sklPool.filter(s => ksdnInternalConfigsForCurrentGradeBySubjectId.has(s.id))
      if (ksdnMatched.length > 0) return ksdnMatched
    }
    const matched = sklPool.filter(
      s =>
        matchesGradeLevel(s, effectiveSubjectGrade) ||
        ksdnInternalConfigsForCurrentGradeBySubjectId.has(s.id) ||
        (!isGrade6Ksdn && vnEduConfigs.some(c => c.grade === grade && c.subjectId === s.id))
    )
    return matched.length > 0 ? matched : sklPool
  }, [
    subjects,
    grade,
    effectiveSubjectGrade,
    isGrade6Ksdn,
    onlyPrimarySubjectsForGrade,
    isCurrentPeriodKsdn,
    ksdnInternalConfigsForCurrentGradeBySubjectId,
    vnEduConfigs,
  ])

  // Danh mục 3: Môn học Song ngữ & Quốc tế (BILINGUAL)
  const bilingualSubjectsForCurrentGrade = useMemo(() => {
    const bilPool = subjects.filter(s => getSubjectCurriculumGroup(s) === "BILINGUAL")
    if (!onlyPrimarySubjectsForGrade) {
      if (isGrade6Ksdn) {
        return bilPool.filter(s => matchesGradeLevel(s, "Khối 5") || ksdnInternalConfigsForCurrentGradeBySubjectId.has(s.id))
      }
      return bilPool
    }
    if (isCurrentPeriodKsdn && ksdnInternalConfigsForCurrentGradeBySubjectId.size > 0) {
      const ksdnMatched = bilPool.filter(s => ksdnInternalConfigsForCurrentGradeBySubjectId.has(s.id))
      if (ksdnMatched.length > 0) return ksdnMatched
    }
    const matched = bilPool.filter(
      s =>
        matchesGradeLevel(s, effectiveSubjectGrade) ||
        ksdnInternalConfigsForCurrentGradeBySubjectId.has(s.id) ||
        (!isGrade6Ksdn && vnEduConfigs.some(c => c.grade === grade && c.subjectId === s.id))
    )
    return matched.length > 0 ? matched : bilPool
  }, [
    subjects,
    grade,
    effectiveSubjectGrade,
    isGrade6Ksdn,
    onlyPrimarySubjectsForGrade,
    isCurrentPeriodKsdn,
    ksdnInternalConfigsForCurrentGradeBySubjectId,
    vnEduConfigs,
  ])

  // Trong "1. Sổ điểm theo vnEdu", chỉ lấy các Môn học Bộ GD&ĐT (MOET). Các môn Đặc thù Sky-Line & Song ngữ Quốc tế có cấu hình và sổ điểm riêng tại "2. Đánh giá nội bộ Sky-Line".
  const primarySubjectsForCurrentGrade = useMemo(() => {
    return moetSubjectsForCurrentGrade
  }, [moetSubjectsForCurrentGrade])

  const secondarySubjectsForCurrentGrade = moetSubjectsForCurrentGrade

  // Map of existing configs in current (grade, period) by subjectId:
  // Kỳ KSĐN lấy cấu hình từ "2. Đánh giá nội bộ Sky-Line"
  const configsInCurrentScopeBySubjectId = useMemo(() => {
    if (isCurrentPeriodKsdn) {
      return ksdnInternalConfigsForCurrentGradeBySubjectId
    }
    const map = new Map<string, any>()
    for (const c of vnEduConfigs) {
      if (c.grade === grade && c.evaluationPeriod === period && c.subjectId) {
        if ((c.program || "ALL") === program || !map.has(c.subjectId)) {
          map.set(c.subjectId, c)
        }
      }
    }
    return map
  }, [vnEduConfigs, grade, period, program, isCurrentPeriodKsdn, ksdnInternalConfigsForCurrentGradeBySubjectId])

  const getMatrixStorageKey = (targetGrade: string) =>
    `ssm_vnedu_tt27_matrix_v1_${academicYearId || "default"}_${targetGrade}`

  const saveMatrixPrefsToStorage = (
    targetGrade: string,
    patch: {
      ktMatrix?: Record<string, Record<string, boolean>>
      sysMatrix?: Record<string, { S: boolean; I: boolean }>
      activePeriods?: string[]
      selectedIds?: string[]
    }
  ) => {
    if (typeof window === "undefined") return
    try {
      const key = getMatrixStorageKey(targetGrade)
      const raw = window.localStorage.getItem(key)
      const prev = raw ? JSON.parse(raw) : {}
      const next = {
        ...prev,
        ...(patch.ktMatrix ? { ktMatrix: patch.ktMatrix } : {}),
        ...(patch.sysMatrix ? { sysMatrix: patch.sysMatrix } : {}),
        ...(patch.activePeriods ? { activePeriods: patch.activePeriods } : {}),
        ...(patch.selectedIds ? { selectedIds: patch.selectedIds } : {}),
        updatedAt: Date.now(),
      }
      window.localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // ignore storage errors
    }
  }

  // Build / sync default Matrix (TT27 for Tiểu học & TT22 for THCS/THPT) + Hệ S / Hệ I Matrix when Grade or saved configs change
  const buildDefaultKtMatrixForGrade = (targetGrade: string) => {
    const nextMatrix: Record<string, Record<string, boolean>> = {}
    const nextSysMatrix: Record<string, { S: boolean; I: boolean }> = {}
    const targetIsPrimary = isPrimaryGrade(targetGrade)

    for (const s of subjects) {
      nextMatrix[s.id] = {}
      const sysInfo = getSubjectSystemInfoForGrade(s, targetGrade)
      const savedForSubjGrade = vnEduConfigs.filter(c => c.subjectId === s.id && c.grade === targetGrade)
      if (savedForSubjGrade.length > 0) {
        const hasAll = savedForSubjGrade.some(c => !c.program || c.program === "ALL" || c.program === "MOET")
        const hasExplicitS = savedForSubjGrade.some(c => c.program === "Hệ S")
        const hasExplicitI = savedForSubjGrade.some(c => c.program === "Hệ I")
        if (hasExplicitS || hasExplicitI) {
          nextSysMatrix[s.id] = {
            S: hasExplicitS || hasAll,
            I: hasExplicitI || hasAll,
          }
        } else {
          nextSysMatrix[s.id] = { S: true, I: true }
        }
      } else {
        nextSysMatrix[s.id] = { S: sysInfo.hasS, I: sysInfo.hasI }
      }

      for (const p of effectiveEvalPeriods) {
        if (isKsdnEvaluationPeriod(p.code)) {
          const ksdnCfg = ksdnInternalConfigsForCurrentGradeBySubjectId.get(s.id)
          nextMatrix[s.id][p.code] = Boolean(ksdnCfg && Number(ksdnCfg.columnCount || 0) > 0)
          continue
        }
        // If an explicit VNEDU config already exists in DB for (s.id, targetGrade, p.code), reflect its numeric score status
        const existingCfg = vnEduConfigs.find(
          c =>
            c.subjectId === s.id &&
            c.grade === targetGrade &&
            c.evaluationPeriod === p.code &&
            ((c.program || "ALL") === program || c.program === "ALL" || c.program === "Hệ S" || c.program === "Hệ I")
        )
        if (existingCfg) {
          const defs = normalizeGradeColumnDefs(existingCfg)
          nextMatrix[s.id][p.code] = defs.some(d => d.dataType === "NUMBER")
        } else if (targetIsPrimary) {
          nextMatrix[s.id][p.code] = shouldPrimarySubjectHaveKtColumn(
            s.subjectName || s.subjectCode,
            targetGrade,
            p.code
          )
        } else {
          nextMatrix[s.id][p.code] = !isTt22CommentOnlySubject(s.subjectName || s.subjectCode)
        }
      }
    }

    // Overlay user's saved Matrix options from localStorage so custom toggles are never lost
    let savedActivePeriods: string[] | null = null
    let savedSelectedIds: string[] | null = null
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(getMatrixStorageKey(targetGrade))
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.sysMatrix && typeof parsed.sysMatrix === "object") {
            for (const [sId, val] of Object.entries(parsed.sysMatrix)) {
              if (val && typeof val === "object") {
                nextSysMatrix[sId] = {
                  S: Boolean((val as any).S),
                  I: Boolean((val as any).I),
                }
              }
            }
          }
          if (parsed?.ktMatrix && typeof parsed.ktMatrix === "object") {
            for (const [sId, pMap] of Object.entries(parsed.ktMatrix)) {
              if (pMap && typeof pMap === "object") {
                nextMatrix[sId] = {
                  ...(nextMatrix[sId] || {}),
                  ...(pMap as Record<string, boolean>),
                }
              }
            }
          }
          if (Array.isArray(parsed?.activePeriods) && parsed.activePeriods.length > 0) {
            savedActivePeriods = parsed.activePeriods
          }
          if (Array.isArray(parsed?.selectedIds)) {
            savedSelectedIds = parsed.selectedIds
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    return { nextMatrix, nextSysMatrix, savedActivePeriods, savedSelectedIds }
  }

  useEffect(() => {
    const { nextMatrix, nextSysMatrix, savedActivePeriods } = buildDefaultKtMatrixForGrade(grade)
    setTt27KtMatrix(nextMatrix)
    setTt27SystemMatrix(nextSysMatrix)
    if (savedActivePeriods) {
      setTt27ActivePeriods(savedActivePeriods)
    } else {
      setTt27ActivePeriods(
        isPrimaryGrade(grade) ? ["GK1", "CK1", "GK2", "CK2"] : ["GK1", "CK1", "GK2", "CK2", "CN"]
      )
    }
  }, [grade, program, subjects, vnEduConfigs, ksdnInternalConfigsForCurrentGradeBySubjectId])

  // Load saved selectedSubjectIds when switching Grade (chỉ giữ các môn Bộ GD&ĐT MOET trong mục 1. Sổ điểm theo vnEdu)
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(getMatrixStorageKey(grade))
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed?.selectedIds) && parsed.selectedIds.length > 0) {
          const validMoetIds = parsed.selectedIds.filter((id: string) =>
            subjects.some(s => s.id === id && getSubjectCurriculumGroup(s) === "MOET")
          )
          setSelectedSubjectIds(validMoetIds)
          setSubjectId(validMoetIds[0] || "")
        }
      }
    } catch {
      // ignore
    }
  }, [grade, academicYearId, subjects])

  const resetTt27MatrixToStrictStandard = () => {
    const strictMatrix: Record<string, Record<string, boolean>> = {}
    const strictSysMatrix: Record<string, { S: boolean; I: boolean }> = {}
    const targetIsPrimary = isPrimaryGrade(grade)
    for (const s of subjects) {
      strictMatrix[s.id] = {}
      const sysInfo = getSubjectSystemInfoForGrade(s, grade)
      strictSysMatrix[s.id] = { S: sysInfo.hasS, I: sysInfo.hasI }
      for (const p of effectiveEvalPeriods) {
        if (isKsdnEvaluationPeriod(p.code)) {
          const ksdnCfg = ksdnInternalConfigsForCurrentGradeBySubjectId.get(s.id)
          strictMatrix[s.id][p.code] = Boolean(ksdnCfg && Number(ksdnCfg.columnCount || 0) > 0)
          continue
        }
        strictMatrix[s.id][p.code] = targetIsPrimary
          ? shouldPrimarySubjectHaveKtColumn(s.subjectName || s.subjectCode, grade, p.code)
          : !isTt22CommentOnlySubject(s.subjectName || s.subjectCode)
      }
    }
    const defaultPeriods = targetIsPrimary
      ? ["GK1", "CK1", "GK2", "CK2"]
      : ["GK1", "CK1", "GK2", "CK2", "CN"]
    setTt27KtMatrix(strictMatrix)
    setTt27SystemMatrix(strictSysMatrix)
    setTt27ActivePeriods(defaultPeriods)
    saveMatrixPrefsToStorage(grade, {
      ktMatrix: strictMatrix,
      sysMatrix: strictSysMatrix,
      activePeriods: defaultPeriods,
    })
    toast.success(
      `Đã đặt lại chuẩn ${targetIsPrimary ? "Thông tư 27" : "Thông tư 22"} & Hệ S/I mặc định cho ${grade}`
    )
  }

  const toggleMatrixCellSystem = (subId: string, sysKey: "S" | "I") => {
    setTt27SystemMatrix(prev => {
      const current = prev[subId] || { S: true, I: true }
      const next = {
        ...prev,
        [subId]: {
          ...current,
          [sysKey]: !current[sysKey],
        },
      }
      saveMatrixPrefsToStorage(grade, { sysMatrix: next })
      return next
    })
  }

  const toggleAllSubjectsSystem = (sysKey: "S" | "I", value: boolean) => {
    const targetSubjs =
      subjectsShownInTt27Matrix.length > 0
        ? subjectsShownInTt27Matrix
        : primarySubjectsForCurrentGrade
    setTt27SystemMatrix(prev => {
      const next = { ...prev }
      for (const s of targetSubjs) {
        const cur = next[s.id] || { S: true, I: true }
        next[s.id] = { ...cur, [sysKey]: value }
      }
      saveMatrixPrefsToStorage(grade, { sysMatrix: next })
      return next
    })
  }

  const toggleMatrixCellKt = (subId: string, pCode: string) => {
    setTt27KtMatrix(prev => {
      const next = {
        ...prev,
        [subId]: {
          ...(prev[subId] || {}),
          [pCode]: !prev[subId]?.[pCode],
        },
      }
      saveMatrixPrefsToStorage(grade, { ktMatrix: next })
      return next
    })
  }

  const toggleAllSubjectsKtForPeriod = (pCode: string, value: boolean) => {
    const targetSubjs =
      subjectsShownInTt27Matrix.length > 0
        ? subjectsShownInTt27Matrix
        : primarySubjectsForCurrentGrade
    setTt27KtMatrix(prev => {
      const next = { ...prev }
      for (const s of targetSubjs) {
        next[s.id] = { ...(next[s.id] || {}), [pCode]: value }
      }
      saveMatrixPrefsToStorage(grade, { ktMatrix: next })
      return next
    })
  }

  const filteredSubjectsForPicker = useMemo(() => {
    const basePool = moetSubjectsForCurrentGrade
    const kw = subjectSearch.trim().toLowerCase()
    if (!kw) return basePool
    return basePool.filter(
      s =>
        String(s.subjectName || "").toLowerCase().includes(kw) ||
        String(s.subjectCode || "").toLowerCase().includes(kw)
    )
  }, [moetSubjectsForCurrentGrade, subjectSearch])

  const filteredMatrixConfigs = useMemo(() => {
    const ksdnFromInternal = internalConfigs.filter(cfg => isKsdnEvaluationPeriod(cfg.evaluationPeriod))
    const combined = [...vnEduConfigs.filter(cfg => !isKsdnEvaluationPeriod(cfg.evaluationPeriod)), ...ksdnFromInternal]
    return combined.filter(cfg => {
      if (matrixGradeFilter !== "ALL" && cfg.grade !== matrixGradeFilter && cfg.grade !== "ALL") return false
      if (matrixPeriodFilter !== "ALL" && cfg.evaluationPeriod !== matrixPeriodFilter) return false
      return true
    })
  }, [vnEduConfigs, internalConfigs, matrixGradeFilter, matrixPeriodFilter])

  // Find matching config in "2. Đánh giá nội bộ Sky-Line" (INTERNAL) for a subject & grade
  // Lưu ý: Với Khối 6 KSĐN thì các môn khảo sát lấy ở Tiểu học của Khối 5
  const findInternalConfigForScope = (
    targetSubId?: string | null,
    targetGrade = grade,
    targetPeriod = period
  ) => {
    const gNum = extractGradeNumber(targetGrade)
    const isG6Ksdn = gNum === 6 && isKsdnEvaluationPeriod(targetPeriod)
    const matchesGrade = (cGrade?: string | null, allowAll = false) => {
      const g = String(cGrade || "").trim()
      if (allowAll && g === "ALL") return true
      if (g === targetGrade) return true
      const cgNum = extractGradeNumber(g)
      return gNum !== null && cgNum !== null && gNum === cgNum
    }
    const matchesGrade5 = (cGrade?: string | null) => {
      const g = String(cGrade || "").trim()
      if (g === "Khối 5" || g === "5") return true
      return extractGradeNumber(g) === 5
    }
    const matchesPeriod = (cPeriod?: string | null, allowKsdnOrAll = false) => {
      const p = String(cPeriod || "").trim()
      if (p === targetPeriod) return true
      if (isKsdnEvaluationPeriod(targetPeriod) && isKsdnEvaluationPeriod(p)) return true
      if (allowKsdnOrAll && (isKsdnEvaluationPeriod(p) || p === "ALL")) return true
      return false
    }

    if (targetSubId) {
      if (isKsdnEvaluationPeriod(targetPeriod)) {
        const fromKsdnMap = buildKsdnConfigsMapForGrade(targetGrade).get(targetSubId)
        if (fromKsdnMap) return fromKsdnMap
      }
      const exact = internalConfigs.find(
        c => c.subjectId === targetSubId && matchesGrade(c.grade, false) && matchesPeriod(c.evaluationPeriod, false)
      )
      if (exact) return exact
      const fallbackPeriod = internalConfigs.find(
        c => c.subjectId === targetSubId && matchesGrade(c.grade, false) && matchesPeriod(c.evaluationPeriod, true)
      )
      if (fallbackPeriod) return fallbackPeriod
      if (isG6Ksdn) {
        const g5Match =
          internalConfigs.find(
            c => c.subjectId === targetSubId && matchesGrade5(c.grade) && matchesPeriod(c.evaluationPeriod, true)
          ) ||
          internalConfigs.find(c => c.subjectId === targetSubId && matchesGrade5(c.grade))
        if (g5Match) return g5Match
      }
      const fallbackAllGrade = internalConfigs.find(
        c => c.subjectId === targetSubId && matchesGrade(c.grade, true) && matchesPeriod(c.evaluationPeriod, true)
      )
      if (fallbackAllGrade) return fallbackAllGrade
    }

    return (
      internalConfigs.find(c => !c.subjectId && matchesGrade(c.grade, false) && matchesPeriod(c.evaluationPeriod, true)) ||
      (isG6Ksdn ? internalConfigs.find(c => !c.subjectId && matchesGrade5(c.grade) && matchesPeriod(c.evaluationPeriod, true)) : null) ||
      internalConfigs.find(c => !c.subjectId && matchesGrade(c.grade, true) && matchesPeriod(c.evaluationPeriod, true)) ||
      null
    )
  }

  // Apply "3. Đánh giá nội bộ Sky-Line" structure mode (loads from 2. Đánh giá nội bộ Sky-Line or preset)
  const applyInternalSkylineStructureMode = (
    presetType: "FROM_SAVED" | "2_COL" | "3_COL" | "BILINGUAL" = "FROM_SAVED",
    targetSubId?: string | null
  ) => {
    setEditorStructureMode("INTERNAL_SKL")
    const focusedSubId =
      targetSubId !== undefined
        ? targetSubId
        : selectedSubjectIds.length === 1
        ? selectedSubjectIds[0]
        : subjectId || null

    if (presetType === "2_COL") {
      setColumns([
        {
          key: "col0",
          label: "Trắc nghiệm",
          group: "TX",
          attempt: 1,
          dataType: "NUMBER",
          scaleCode: "SCORE_10",
          maxScore: 10,
          allowedCodes: null,
          required: false,
          inputMode: "INPUT",
          order: 1,
          aliases: ["Trắc nghiệm", "TN", "Cột 1"],
        },
        {
          key: "col1",
          label: "Tự luận",
          group: "TX",
          attempt: 2,
          dataType: "NUMBER",
          scaleCode: "SCORE_10",
          maxScore: 10,
          allowedCodes: null,
          required: false,
          inputMode: "INPUT",
          order: 2,
          aliases: ["Tự luận", "TL", "Cột 2"],
        },
      ])
      setHasCompositeColumn(true)
      setCompositeColumnName("Điểm")
      setHasRatingColumn(false)
      setHasRemarkColumn(true)
      setConfirmationStatus("CONFIRMED")
      return
    }

    if (presetType === "BILINGUAL") {
      setColumns([
        {
          key: "col0",
          label: "English component",
          group: "TX",
          attempt: 1,
          dataType: "NUMBER",
          scaleCode: "SCORE_10",
          maxScore: 10,
          allowedCodes: null,
          required: false,
          inputMode: "INPUT",
          order: 1,
          aliases: ["English", "English maths", "GVNN"],
        },
        {
          key: "col1",
          label: "Vietnamese component",
          group: "TX",
          attempt: 2,
          dataType: "NUMBER",
          scaleCode: "SCORE_10",
          maxScore: 10,
          allowedCodes: null,
          required: false,
          inputMode: "INPUT",
          order: 2,
          aliases: ["Vietnamese", "Vietnamese maths", "GVVN"],
        },
      ])
      setHasCompositeColumn(true)
      setCompositeColumnName("Điểm")
      setHasRatingColumn(false)
      setHasRemarkColumn(true)
      setConfirmationStatus("CONFIRMED")
      return
    }

    if (presetType === "FROM_SAVED") {
      const refCfg = findInternalConfigForScope(focusedSubId, grade, period)
      if (refCfg) {
        const defs = normalizeGradeColumnDefs(refCfg).filter(c => c.group !== "REMARK" && c.key !== "ratingValue")
        if (defs.length > 0) {
          setColumns(defs)
          setHasCompositeColumn(refCfg.hasCompositeColumn !== false)
          setCompositeColumnName(refCfg.compositeColumnName || "Điểm")
          setHasRatingColumn(Boolean(refCfg.hasRatingColumn))
          setRatingColumnName(refCfg.ratingColumnName || "Xếp loại")
          setHasRemarkColumn(refCfg.hasRemarkColumn !== false)
          setInternalFormula(refCfg.formula || "AVERAGE")
          setInternalFormulaCustom(refCfg.formulaCustom || null)
          setInternalWeights(refCfg.weights || null)
          setInternalRoundingRule(refCfg.roundingRule || "ROUND_1")
          setConfirmationStatus("CONFIRMED")
          return
        }
      }
    }

    // Default 3-column internal assessment structure
    setColumns([
      {
        key: "col0",
        label: "Cột điểm 1",
        group: "TX",
        attempt: 1,
        dataType: "NUMBER",
        scaleCode: "SCORE_10",
        maxScore: 10,
        allowedCodes: null,
        required: false,
        inputMode: "INPUT",
        order: 1,
        aliases: ["Cột điểm 1", "Cột 1"],
      },
      {
        key: "col1",
        label: "Cột điểm 2",
        group: "TX",
        attempt: 2,
        dataType: "NUMBER",
        scaleCode: "SCORE_10",
        maxScore: 10,
        allowedCodes: null,
        required: false,
        inputMode: "INPUT",
        order: 2,
        aliases: ["Cột điểm 2", "Cột 2"],
      },
      {
        key: "col2",
        label: "Cột điểm 3",
        group: "TX",
        attempt: 3,
        dataType: "NUMBER",
        scaleCode: "SCORE_10",
        maxScore: 10,
        allowedCodes: null,
        required: false,
        inputMode: "INPUT",
        order: 3,
        aliases: ["Cột điểm 3", "Cột 3"],
      },
    ])
    setHasCompositeColumn(true)
    setCompositeColumnName("Điểm")
    setHasRatingColumn(false)
    setHasRemarkColumn(true)
    setConfirmationStatus("CONFIRMED")
  }

  // Apply Primary TT27 preset (`WITH_KT` vs `REMARK_ONLY`)
  const applyPrimaryStructureMode = (
    mode: "WITH_KT" | "REMARK_ONLY",
    targetPeriod = period,
    targetGrade = grade
  ) => {
    setEditorStructureMode(mode)
    const meta = getPrimaryPeriodMeta(targetPeriod)
    setHasCompositeColumn(false)
    setCompositeColumnName("")
    setHasRatingColumn(true)
    setRatingColumnName(meta.xlColumnLabel)
    setHasRemarkColumn(true)

    if (mode === "WITH_KT") {
      setColumns([
        {
          key: "col0",
          label: meta.ktColumnLabel,
          group: meta.isMidterm ? "GK" : "CK",
          attempt: 1,
          dataType: "NUMBER",
          scaleCode: "SCORE_10",
          maxScore: 10,
          allowedCodes: null,
          required: false,
          inputMode: "INPUT",
          order: 1,
          aliases: [
            meta.ktColumnLabel,
            meta.ktColumnLabel.replace(/\s+/g, ""),
            "KT",
            "Điểm KT",
            "Điểm KTĐK",
          ],
        },
      ])
      setConfirmationStatus("CONFIRMED")
    } else {
      setColumns([])
      setConfirmationStatus("CONFIRMED")
    }
  }

  // Apply Secondary / High School TT22 preset (`SCORE_10` vs `RATING_DAT`)
  const applySecondaryTt22StructureMode = (
    mode: "SCORE_10" | "RATING_DAT",
    txColCount = 4
  ) => {
    setEditorStructureMode(mode)
    const isCommentOnly = mode === "RATING_DAT"
    const built = buildSecondaryTt22VnEduDefaultConfig({
      grade,
      evaluationPeriod: period,
      forceCommentOnly: isCommentOnly,
      txColumnCount: txColCount,
    })
    const parsedCols = JSON.parse(built.columnsJson) as GradeColumnDef[]
    setColumns(parsedCols)
    setHasCompositeColumn(true)
    setCompositeColumnName(built.compositeColumnName || "ĐTBmhk")
    setHasRatingColumn(false)
    setHasRemarkColumn(true)
    setConfirmationStatus("CONFIRMED")
  }

  // Sync editor when user changes Grade, Period, or inspected / single focused Subject
  useEffect(() => {
    const activeSingleSubjectId =
      inspectedSubjectId ||
      (selectedSubjectIds.length === 1 ? selectedSubjectIds[0] : subjectId)

    // Kỳ Khảo sát đầu năm (KSĐN) luôn mặc định áp dụng "3. Đánh giá nội bộ Sky-Line"
    if (isKsdnEvaluationPeriod(period)) {
      applyInternalSkylineStructureMode("FROM_SAVED", activeSingleSubjectId || null)
      return
    }

    if (!activeSingleSubjectId) {
      if (isPrimaryGrade(grade)) {
        const meta = getPrimaryPeriodMeta(period)
        setHasCompositeColumn(false)
        setHasRatingColumn(true)
        setRatingColumnName(meta.xlColumnLabel)
        setHasRemarkColumn(true)
        const hasKtNow = columns.some(c => c.dataType === "NUMBER")
        applyPrimaryStructureMode(hasKtNow ? "WITH_KT" : "REMARK_ONLY", period, grade)
      } else {
        applySecondaryTt22StructureMode("SCORE_10", 4)
      }
      return
    }

    const existing = vnEduConfigs.find(
      c =>
        c.subjectId === activeSingleSubjectId &&
        c.grade === grade &&
        c.evaluationPeriod === period &&
        ((c.program || "ALL") === program || c.program === "ALL" || c.program === "Hệ S" || c.program === "Hệ I")
    )
    const exactInternalOverride = findExactPeriodInternalOverrideConfig(internalConfigs, {
      academicYearId,
      program,
      grade,
      subjectId: activeSingleSubjectId,
      evaluationPeriod: period,
    })
    const existingTime = existing?.updatedAt ? new Date(existing.updatedAt).getTime() : 0
    const internalTime = exactInternalOverride?.updatedAt ? new Date(exactInternalOverride.updatedAt).getTime() : 0
    if (exactInternalOverride && (!existing || internalTime > existingTime)) {
      applyInternalSkylineStructureMode("FROM_SAVED", activeSingleSubjectId)
      return
    }

    if (existing) {
      setConfirmationStatus(existing.confirmationStatus === "UNCONFIRMED" ? "UNCONFIRMED" : "CONFIRMED")
      setHasCompositeColumn(Boolean(existing.hasCompositeColumn))
      setCompositeColumnName(existing.compositeColumnName || "ĐTBmhk")
      setHasRatingColumn(Boolean(existing.hasRatingColumn))
      setRatingColumnName(existing.ratingColumnName || (isPrimaryGrade(grade) ? primaryMeta.xlColumnLabel : "Xếp loại"))
      setHasRemarkColumn(existing.hasRemarkColumn !== false)
      setInternalFormula(existing.formula || "AVERAGE")
      setInternalFormulaCustom(existing.formulaCustom || null)
      setInternalWeights(existing.weights || null)
      setInternalRoundingRule(existing.roundingRule || "ROUND_1")
      const defs = normalizeGradeColumnDefs(existing).filter(c => c.group !== "REMARK" && c.key !== "ratingValue")
      setColumns(defs)
      if (isPrimaryGrade(grade)) {
        if (existing.hasCompositeColumn || defs.length > 1) {
          setEditorStructureMode("INTERNAL_SKL")
        } else if (defs.some(d => d.dataType === "NUMBER")) {
          setEditorStructureMode("WITH_KT")
        } else {
          setEditorStructureMode("REMARK_ONLY")
        }
      } else {
        const isRatingAll = defs.length > 0 && defs.every(d => d.dataType === "RATING")
        setEditorStructureMode(isRatingAll ? "RATING_DAT" : "SCORE_10")
      }
      return
    }

    // If this subject is a Sky-Line / Bilingual subject or has an explicit INTERNAL config for this period, load it
    const subj = subjects.find(s => s.id === activeSingleSubjectId)
    const currGroup = getSubjectCurriculumGroup(subj)
    if (exactInternalOverride || currGroup === "SKL" || currGroup === "BILINGUAL") {
      const refInternal = findInternalConfigForScope(activeSingleSubjectId, grade, period)
      if (refInternal) {
        applyInternalSkylineStructureMode("FROM_SAVED", activeSingleSubjectId)
        return
      }
    }

    if (isPrimaryGrade(grade)) {
      const hasKt =
        tt27KtMatrix[activeSingleSubjectId]?.[period] ??
        shouldPrimarySubjectHaveKtColumn(subj?.subjectName || subj?.subjectCode, grade, period)
      applyPrimaryStructureMode(hasKt ? "WITH_KT" : "REMARK_ONLY", period, grade)
    } else {
      const isComment = isTt22CommentOnlySubject(subj?.subjectName || subj?.subjectCode)
      applySecondaryTt22StructureMode(isComment ? "RATING_DAT" : "SCORE_10", 4)
    }
  }, [grade, period, subjectId, inspectedSubjectId, selectedSubjectIds, program, vnEduConfigs, internalConfigs])

  const toggleSelectSubject = (id: string) => {
    setSelectedSubjectIds(prev => {
      const exists = prev.includes(id)
      const next = exists ? prev.filter(x => x !== id) : [...prev, id]
      setSubjectId(next.length === 1 ? next[0] : next[next.length - 1] || "")
      saveMatrixPrefsToStorage(grade, { selectedIds: next })
      return next
    })
  }

  // Quick-select subject groups by Grade & Period
  const handleQuickSelectGroup = (
    groupType:
      | "ALL"
      | "NONE"
      | "MOET_ONLY"
      | "SKL_ONLY"
      | "CONFIGURED_IN_GRADE"
      | "PRIMARY_KT"
      | "PRIMARY_REMARK"
      | "TT22_SCORE"
      | "TT22_RATING"
      | "CORE"
  ) => {
    const pool =
      isPrimary && onlyPrimarySubjectsForGrade
        ? primarySubjectsForCurrentGrade
        : !isPrimary && onlyPrimarySubjectsForGrade
        ? secondarySubjectsForCurrentGrade
        : subjects

    const applySelectedIds = (ids: string[]) => {
      setSelectedSubjectIds(ids)
      setSubjectId(ids[0] || "")
      saveMatrixPrefsToStorage(grade, { selectedIds: ids })
    }

    if (groupType === "NONE") {
      applySelectedIds([])
      return
    }
    if (groupType === "MOET_ONLY") {
      applySelectedIds(moetSubjectsForCurrentGrade.map(s => s.id))
      return
    }
    if (groupType === "SKL_ONLY") {
      applySelectedIds(sklSubjectsForCurrentGrade.map(s => s.id))
      return
    }
    if (groupType === "ALL") {
      applySelectedIds(filteredSubjectsForPicker.map(s => s.id))
      return
    }
    if (groupType === "CONFIGURED_IN_GRADE") {
      applySelectedIds(pool.filter(s => configsInCurrentScopeBySubjectId.has(s.id)).map(s => s.id))
      return
    }
    if (groupType === "PRIMARY_KT") {
      const ids = pool
        .filter(s =>
          tt27KtMatrix[s.id]?.[period] ??
          shouldPrimarySubjectHaveKtColumn(s.subjectName || s.subjectCode, grade, period)
        )
        .map(s => s.id)
      applySelectedIds(ids)
      if (isPrimary) applyPrimaryStructureMode("WITH_KT", period, grade)
      return
    }
    if (groupType === "PRIMARY_REMARK") {
      const ids = pool
        .filter(s =>
          !(
            tt27KtMatrix[s.id]?.[period] ??
            shouldPrimarySubjectHaveKtColumn(s.subjectName || s.subjectCode, grade, period)
          )
        )
        .map(s => s.id)
      applySelectedIds(ids)
      if (isPrimary) applyPrimaryStructureMode("REMARK_ONLY", period, grade)
      return
    }
    if (groupType === "TT22_SCORE") {
      const ids = pool
        .filter(s => !isTt22CommentOnlySubject(s.subjectName || s.subjectCode))
        .map(s => s.id)
      applySelectedIds(ids)
      applySecondaryTt22StructureMode("SCORE_10", 4)
      return
    }
    if (groupType === "TT22_RATING") {
      const ids = pool
        .filter(s => isTt22CommentOnlySubject(s.subjectName || s.subjectCode))
        .map(s => s.id)
      applySelectedIds(ids)
      applySecondaryTt22StructureMode("RATING_DAT", 2)
      return
    }
    if (groupType === "CORE") {
      const ids = pool
        .filter(s => {
          const n = String(s.subjectName || "").toLowerCase()
          return n.includes("toán") || n.includes("tiếng việt") || n.includes("ngữ văn") || n.includes("văn") || n.includes("tiếng anh")
        })
        .map(s => s.id)
      applySelectedIds(ids)
    }
  }

  const loadConfigIntoEditor = (cfg: any) => {
    if (isKsdnEvaluationPeriod(cfg.evaluationPeriod) && onSwitchToInternalConfig) {
      onSwitchToInternalConfig(cfg.grade || grade, "KSĐN", cfg.subjectId || undefined)
      return
    }
    setProgram(cfg.program || "ALL")
    setGrade(cfg.grade || "ALL")
    setPeriod(cfg.evaluationPeriod || "GK1")
    setSubjectId(cfg.subjectId || "")
    setSelectedSubjectIds(cfg.subjectId ? [cfg.subjectId] : [])
    setConfirmationStatus(cfg.confirmationStatus === "UNCONFIRMED" ? "UNCONFIRMED" : "CONFIRMED")
    setHasCompositeColumn(Boolean(cfg.hasCompositeColumn))
    setCompositeColumnName(cfg.compositeColumnName || "ĐTBmhk")
    setHasRatingColumn(Boolean(cfg.hasRatingColumn))
    setRatingColumnName(cfg.ratingColumnName || "Xếp loại")
    setHasRemarkColumn(cfg.hasRemarkColumn !== false)

    const defs = normalizeGradeColumnDefs(cfg).filter(c => c.group !== "REMARK" && c.key !== "ratingValue")
    setColumns(defs)
    toast.success(`Đã nạp cấu hình v${cfg.version || 1} vào trình chỉnh sửa`)
  }

  // 1-click toggle KT column directly on a saved row in the Matrix Table
  const handleQuickToggleRowKt = async (cfg: any) => {
    if (!cfg || !cfg.subjectId) return
    const defs = normalizeGradeColumnDefs(cfg)
    const currentlyHasKt = defs.some(d => d.dataType === "NUMBER")
    const nextHasKt = !currentlyHasKt
    const meta = getPrimaryPeriodMeta(cfg.evaluationPeriod)

    const nextCols: GradeColumnDef[] = nextHasKt
      ? [
          {
            key: "col0",
            label: meta.ktColumnLabel,
            group: meta.isMidterm ? "GK" : "CK",
            attempt: 1,
            dataType: "NUMBER",
            scaleCode: "SCORE_10",
            maxScore: 10,
            allowedCodes: null,
            required: false,
            inputMode: "INPUT",
            order: 1,
            aliases: [meta.ktColumnLabel, meta.ktColumnLabel.replace(/\s+/g, ""), "KT", "Điểm KTĐK"],
          },
        ]
      : []

    setTogglingRowId(cfg.id)
    try {
      const res = await fetch("/api/admin/ktdbcl/grade-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId,
          program: cfg.program || "ALL",
          grade: cfg.grade,
          subjectId: cfg.subjectId,
          evaluationPeriod: cfg.evaluationPeriod,
          configType: "VNEDU",
          columnCount: nextCols.length,
          columnNames: nextCols.map(c => c.label),
          columnTypes: nextCols.map(c => c.scaleCode),
          columnMaxScores: nextCols.map(c => c.maxScore || 10),
          columnsJson: nextCols,
          hasCompositeColumn: false,
          compositeColumnName: "",
          hasRatingColumn: true,
          ratingColumnName: cfg.ratingColumnName || meta.xlColumnLabel,
          ratingScaleJson: ["T", "H", "C"],
          hasRemarkColumn: true,
          confirmationStatus: "CONFIRMED",
          changeNote: nextHasKt
            ? `Bật linh động cột ${meta.ktColumnLabel} cho ${cfg.subject?.subjectName || "môn học"} (${cfg.grade} - ${cfg.evaluationPeriod})`
            : `Tắt cột ${meta.ktColumnLabel} (chỉ giữ ${meta.xlColumnLabel} + Nhận xét) cho ${cfg.subject?.subjectName || "môn học"}`,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || "Không thể cập nhật cột KT")
        return
      }
      toast.success(
        nextHasKt
          ? `Đã bật cột ${meta.ktColumnLabel} cho ${cfg.subject?.subjectName} (${cfg.grade} • ${cfg.evaluationPeriod})`
          : `Đã chuyển sang Chỉ ${meta.xlColumnLabel} + Nhận xét cho ${cfg.subject?.subjectName} (${cfg.grade} • ${cfg.evaluationPeriod})`
      )
      onConfigsChanged()
    } catch (err: any) {
      toast.error(err?.message || "Lỗi kết nối")
    } finally {
      setTogglingRowId(null)
    }
  }

  const handleDeleteConfig = async (cfg: any) => {
    const label = `${cfg.subject?.subjectName || "Mẫu chung"} - ${cfg.grade} - ${cfg.evaluationPeriod}`
    if (!confirm(`Bạn có chắc chắn muốn xóa mẫu cấu hình "${label}" không?`)) return
    try {
      const res = await fetch(`/api/admin/ktdbcl/grade-configs?id=${cfg.id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || "Không thể xóa cấu hình")
        return
      }
      setSelectedMatrixConfigIds(prev => prev.filter(id => id !== cfg.id))
      toast.success(data.message || `Đã xóa mẫu cấu hình ${label}`)
      onConfigsChanged()
    } catch (err: any) {
      toast.error(err?.message || "Lỗi kết nối khi xóa cấu hình")
    }
  }

  const toggleSelectMatrixConfig = (id: string) => {
    setSelectedMatrixConfigIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const isAllFilteredMatrixSelected =
    filteredMatrixConfigs.length > 0 &&
    filteredMatrixConfigs.every(cfg => selectedMatrixConfigIds.includes(cfg.id))

  const toggleSelectAllFilteredMatrix = () => {
    const visibleIds = filteredMatrixConfigs.map(cfg => cfg.id)
    if (isAllFilteredMatrixSelected) {
      setSelectedMatrixConfigIds(prev => prev.filter(id => !visibleIds.includes(id)))
    } else {
      setSelectedMatrixConfigIds(prev => Array.from(new Set([...prev, ...visibleIds])))
    }
  }

  const handleBulkDeleteMatrixConfigs = async (explicitIds?: string[]) => {
    const targetIds = explicitIds && explicitIds.length > 0 ? explicitIds : selectedMatrixConfigIds
    if (targetIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 cấu hình trong Ma trận để xóa")
      return
    }
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa ${targetIds.length} cấu hình Sổ điểm đã chọn trong Ma trận không?`
      )
    ) {
      return
    }
    setBulkDeletingMatrix(true)
    try {
      const res = await fetch("/api/admin/ktdbcl/grade-configs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: targetIds }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || "Không thể xóa các cấu hình đã chọn")
        return
      }
      setSelectedMatrixConfigIds(prev => prev.filter(id => !targetIds.includes(id)))
      toast.success(data.message || `Đã xóa ${targetIds.length} cấu hình Sổ điểm thành công`)
      onConfigsChanged()
    } catch (err: any) {
      toast.error(err?.message || "Lỗi kết nối khi xóa hàng loạt cấu hình")
    } finally {
      setBulkDeletingMatrix(false)
    }
  }

  // Set of Subject IDs that have already been assigned/configured for the current Grade
  // Với Khối 6 KSĐN: chỉ lấy các môn khảo sát ở Tiểu học của Khối 5
  const assignedSubjectIdsInCurrentGrade = useMemo(() => {
    const set = new Set<string>()
    if (isGrade6Ksdn) {
      for (const sId of ksdnInternalConfigsForCurrentGradeBySubjectId.keys()) {
        set.add(sId)
      }
      return set
    }
    for (const c of vnEduConfigs) {
      if (c.grade === grade && c.subjectId) {
        set.add(c.subjectId)
      }
    }
    if (isCurrentPeriodKsdn) {
      for (const sId of ksdnInternalConfigsForCurrentGradeBySubjectId.keys()) {
        set.add(sId)
      }
    }
    return set
  }, [vnEduConfigs, grade, isCurrentPeriodKsdn, isGrade6Ksdn, ksdnInternalConfigsForCurrentGradeBySubjectId])

  // Bảng Ma trận Khởi tạo chuẩn theo Bậc, Khối, Hệ trong "1. Sổ điểm theo vnEdu" chỉ hiển thị các môn Bộ GD&ĐT (MOET)
  // (Các môn Đặc thù Sky-Line & Song ngữ Quốc tế được cấu hình và quản lý Sổ điểm riêng tại "2. Đánh giá nội bộ Sky-Line")
  const subjectsShownInTt27Matrix = useMemo(() => {
    return subjects.filter(
      s =>
        getSubjectCurriculumGroup(s) === "MOET" &&
        (selectedSubjectIds.includes(s.id) || assignedSubjectIdsInCurrentGrade.has(s.id))
    )
  }, [selectedSubjectIds, subjects, assignedSubjectIdsInCurrentGrade])

  // Danh sách các dòng (Môn × Bậc × Khối) trong Ma trận Khởi tạo chuẩn theo Bậc, Khối, Hệ
  const matrixRowsByLevelAndGrade = useMemo(() => {
    const targetGradesList = matrixViewAllGradesInLevel ? gradesInSelectedLevel : [grade]
    const rows: Array<{
      rowKey: string
      subj: any
      rowGrade: string
      rowLevelCode: EducationLevelCode
      rowLevelLabel: string
      isRowPrimary: boolean
      savedConfigs: any[]
    }> = []

    for (const g of targetGradesList) {
      const isG6 = extractGradeNumber(g) === 6
      const assignedInG = new Set<string>()
      if (isG6 && isCurrentPeriodKsdn) {
        const g6KsdnMap = g === grade ? ksdnInternalConfigsForCurrentGradeBySubjectId : buildKsdnConfigsMapForGrade(g)
        for (const sId of g6KsdnMap.keys()) {
          assignedInG.add(sId)
        }
      } else {
        for (const c of vnEduConfigs) {
          if (c.grade === g && c.subjectId) assignedInG.add(c.subjectId)
        }
      }
      const subjsForG = subjects.filter(
        s =>
          getSubjectCurriculumGroup(s) === "MOET" &&
          ((g === grade && selectedSubjectIds.includes(s.id)) ||
            assignedInG.has(s.id) ||
            (matrixViewAllGradesInLevel && selectedSubjectIds.includes(s.id)))
      )
      for (const subj of subjsForG) {
        const savedConfigs = vnEduConfigs.filter(
          c => c.subjectId === subj.id && (c.grade === g || (isG6 && isCurrentPeriodKsdn && c.grade === "Khối 5"))
        )
        const isPrimaryOnlySubj = String(subj.level || "").toUpperCase().trim() === "PRIMARY"
        rows.push({
          rowKey: `${subj.id}::${g}`,
          subj,
          rowGrade: g,
          rowLevelCode: isG6 && isCurrentPeriodKsdn ? "PRIMARY" : getEducationLevelFromGrade(g),
          rowLevelLabel:
            isG6 && (isCurrentPeriodKsdn || isPrimaryOnlySubj)
              ? "Tiểu học (K5)"
              : getEducationLevelShortLabel(g),
          isRowPrimary: isPrimaryGrade(g),
          savedConfigs,
        })
      }
    }
    return rows
  }, [
    matrixViewAllGradesInLevel,
    gradesInSelectedLevel,
    grade,
    isCurrentPeriodKsdn,
    ksdnInternalConfigsForCurrentGradeBySubjectId,
    vnEduConfigs,
    subjects,
    selectedSubjectIds,
  ])

  // Danh sách môn được tích chọn trực tiếp bằng Checkbox ở bảng Ma trận (thuộc Khối hiện tại)
  const checkedMatrixSubjectIdsForCurrentGrade = useMemo(() => {
    const ids: string[] = []
    for (const rk of selectedMatrixSubjectIds) {
      const [sId, rGrade] = rk.split("::")
      if (sId && (!rGrade || rGrade === grade) && !ids.includes(sId)) {
        ids.push(sId)
      }
    }
    return ids
  }, [selectedMatrixSubjectIds, grade])

  // Danh sách môn đích khi người dùng Chọn Mẫu Sổ điểm chi tiết & Bấm Lưu:
  // Ưu tiên 1: Các môn được tích chọn ở bảng Ma trận
  // Ưu tiên 2: Môn đang mở xem chi tiết (inspectedSubjectId)
  // Ưu tiên 3: Các môn chọn ở mục 6
  const targetDetailSubjectIds = useMemo(() => {
    if (checkedMatrixSubjectIdsForCurrentGrade.length > 0) {
      return checkedMatrixSubjectIdsForCurrentGrade
    }
    if (inspectedSubjectId) {
      return [inspectedSubjectId]
    }
    if (selectedSubjectIds.length > 0) {
      return selectedSubjectIds
    }
    if (subjectId) {
      return [subjectId]
    }
    return []
  }, [checkedMatrixSubjectIdsForCurrentGrade, inspectedSubjectId, selectedSubjectIds, subjectId])

  const targetDetailSubjects = useMemo(
    () => subjects.filter(s => targetDetailSubjectIds.includes(s.id)),
    [subjects, targetDetailSubjectIds]
  )

  const toggleSelectMatrixSubjectRow = (rowKey: string) => {
    const [sId, rGrade] = rowKey.split("::")
    setSelectedMatrixSubjectIds(prev => {
      const exists = prev.includes(rowKey)
      const next = exists ? prev.filter(k => k !== rowKey) : [...prev, rowKey]
      if (!exists && sId) {
        if (rGrade && rGrade !== grade) setGrade(rGrade)
        setSubjectId(sId)
        setInspectedSubjectId(sId)
      } else if (exists && next.length > 0) {
        const lastKey = next[next.length - 1]
        const [lastSubId] = lastKey.split("::")
        if (lastSubId) {
          setSubjectId(lastSubId)
          setInspectedSubjectId(lastSubId)
        }
      }
      return next
    })
  }

  const isAllMatrixSubjectRowsSelected =
    matrixRowsByLevelAndGrade.length > 0 &&
    matrixRowsByLevelAndGrade.every(r => selectedMatrixSubjectIds.includes(r.rowKey))

  const toggleSelectAllMatrixSubjectRows = () => {
    const allKeys = matrixRowsByLevelAndGrade.map(r => r.rowKey)
    if (isAllMatrixSubjectRowsSelected) {
      setSelectedMatrixSubjectIds(prev => prev.filter(k => !allKeys.includes(k)))
    } else {
      setSelectedMatrixSubjectIds(prev => Array.from(new Set([...prev, ...allKeys])))
      if (matrixRowsByLevelAndGrade.length > 0 && !inspectedSubjectId) {
        setInspectedSubjectId(matrixRowsByLevelAndGrade[0].subj.id)
      }
    }
  }

  const handleOpenSubjectDetailFromMatrix = (subj: any, targetGrade: string) => {
    if (targetGrade && targetGrade !== grade) {
      setGrade(targetGrade)
    }
    setSubjectId(subj.id)
    if (!selectedSubjectIds.includes(subj.id)) {
      setSelectedSubjectIds(prev => (prev.length === 0 ? [subj.id] : prev))
    }
    setInspectedSubjectId(subj.id)
  }

  const handleToggleSubjectInDetailBar = (sId: string) => {
    const rk = `${sId}::${grade}`
    setSelectedMatrixSubjectIds(prev => {
      const exists = prev.includes(rk)
      const next = exists ? prev.filter(k => k !== rk) : [...prev, rk]
      setSubjectId(sId)
      setInspectedSubjectId(sId)
      return next
    })
  }

  const handleDeleteMatrixRowConfigs = async (subj: any, targetGrade: string) => {
    const rowConfigs = vnEduConfigs.filter(
      c => c.subjectId === subj.id && c.grade === targetGrade
    )
    if (rowConfigs.length === 0) {
      // Nếu môn chỉ mới tích chọn chứ chưa lưu DB, bỏ chọn khỏi Ma trận
      setSelectedSubjectIds(prev => prev.filter(id => id !== subj.id))
      if (inspectedSubjectId === subj.id) setInspectedSubjectId(null)
      toast.success(`Đã gỡ môn ${subj.subjectName} khỏi danh sách đang chọn`)
      return
    }
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa ${rowConfigs.length} cấu hình đã lưu của môn "${subj.subjectName}" (${targetGrade}) không?`
      )
    ) {
      return
    }
    await handleBulkDeleteMatrixConfigs(rowConfigs.map(c => c.id))
  }

  const handleBulkDeleteSelectedMatrixRows = async () => {
    if (selectedMatrixSubjectIds.length === 0) {
      toast.error("Vui lòng tích chọn ít nhất 1 dòng môn học trong Ma trận")
      return
    }
    const configIdsToDelete: string[] = []
    const subjectIdsToUnselect: string[] = []
    for (const rk of selectedMatrixSubjectIds) {
      const [sId, rGrade] = rk.split("::")
      const matchingCfgs = vnEduConfigs.filter(
        c => c.subjectId === sId && c.grade === rGrade
      )
      for (const c of matchingCfgs) configIdsToDelete.push(c.id)
      subjectIdsToUnselect.push(sId)
    }
    if (configIdsToDelete.length > 0) {
      await handleBulkDeleteMatrixConfigs(Array.from(new Set(configIdsToDelete)))
    } else {
      setSelectedSubjectIds(prev => prev.filter(id => !subjectIdsToUnselect.includes(id)))
      toast.success(`Đã bỏ chọn ${subjectIdsToUnselect.length} môn khỏi Ma trận`)
    }
    setSelectedMatrixSubjectIds([])
  }

  // Initialize Primary TT27 configs using the flexible Period-by-Subject KT Matrix!
  const handleInitializePrimaryTt27ByMatrix = async (scopeMode: "CURRENT_PERIOD" | "SELECTED_PERIODS") => {
    if (!academicYearId) {
      toast.error("Thiếu năm học")
      return
    }
    if (!isPrimary) {
      await handleInitializeSecondaryTt22(
        scopeMode === "CURRENT_PERIOD" ? "CURRENT_PERIOD" : "BOTH_SEMESTERS"
      )
      return
    }

    const targetSubjs = subjectsShownInTt27Matrix

    const periodsToApply =
      scopeMode === "CURRENT_PERIOD"
        ? [period]
        : tt27ActivePeriods.length > 0
        ? tt27ActivePeriods
        : ["GK1", "CK1", "GK2", "CK2"]

    if (targetSubjs.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 môn học tại mục Chọn Môn học SSM trước khi khởi tạo")
      return
    }

    setAutoGeneratingPrimary(true)
    try {
      let savedCount = 0

      for (const pCode of periodsToApply) {
        if (isKsdnEvaluationPeriod(pCode)) continue
        const meta = getPrimaryPeriodMeta(pCode)
        for (const subj of targetSubjs) {
          const sysState = tt27SystemMatrix[subj.id] || { S: true, I: true }
          if (!sysState.S && !sysState.I) continue
          const targetProg =
            sysState.S && sysState.I ? program : sysState.S ? "Hệ S" : "Hệ I"

          const hasKt =
            tt27KtMatrix[subj.id]?.[pCode] ??
            shouldPrimarySubjectHaveKtColumn(subj.subjectName || subj.subjectCode, grade, pCode)

          const cols: GradeColumnDef[] = hasKt
            ? [
                {
                  key: "col0",
                  label: meta.ktColumnLabel,
                  group: meta.isMidterm ? "GK" : "CK",
                  attempt: 1,
                  dataType: "NUMBER",
                  scaleCode: "SCORE_10",
                  maxScore: 10,
                  allowedCodes: null,
                  required: false,
                  inputMode: "INPUT",
                  order: 1,
                  aliases: [meta.ktColumnLabel, meta.ktColumnLabel.replace(/\s+/g, ""), "KT", "Điểm KTĐK"],
                },
              ]
            : []

          const res = await fetch("/api/admin/ktdbcl/grade-configs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              academicYearId,
              program: targetProg,
              grade,
              subjectId: subj.id,
              evaluationPeriod: pCode,
              configType: "VNEDU",
              columnCount: cols.length,
              columnNames: cols.map(c => c.label),
              columnTypes: cols.map(c => c.scaleCode),
              columnMaxScores: cols.map(c => c.maxScore || 10),
              columnsJson: cols,
              hasCompositeColumn: false,
              compositeColumnName: "",
              hasRatingColumn: true,
              ratingColumnName: meta.xlColumnLabel,
              ratingScaleJson: ["T", "H", "C"],
              hasRemarkColumn: true,
              confirmationStatus: "CONFIRMED",
              changeNote: `Khởi tạo chuẩn TT27 Tiểu học (${hasKt ? `Có ${meta.ktColumnLabel}` : `Chỉ ${meta.xlColumnLabel} + Nhận xét`}) cho ${grade} - ${pCode} (${targetProg === "ALL" ? "Hệ S & Hệ I" : targetProg})`,
            }),
          })
          if (res.ok) savedCount++
        }
      }

      saveMatrixPrefsToStorage(grade, {
        ktMatrix: tt27KtMatrix,
        sysMatrix: tt27SystemMatrix,
        activePeriods: tt27ActivePeriods,
        selectedIds: selectedSubjectIds,
      })

      toast.success(
        `Đã lưu tùy chọn & khởi tạo ${savedCount} cấu hình chuẩn TT27 cho ${targetSubjs.length} môn thuộc ${grade} (${periodsToApply.join(", ")})`
      )
      onConfigsChanged()
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi khởi tạo cấu hình Tiểu học")
    } finally {
      setAutoGeneratingPrimary(false)
    }
  }

  // Initialize Secondary & High School (THCS & THPT) configs per Thông tư 22/2021/TT-BGDĐT using Matrix toggles!
  const handleInitializeSecondaryTt22 = async (scopeMode: "CURRENT_PERIOD" | "BOTH_SEMESTERS") => {
    if (!academicYearId) {
      toast.error("Thiếu năm học")
      return
    }
    if (isPrimary) {
      await handleInitializePrimaryTt27ByMatrix(
        scopeMode === "CURRENT_PERIOD" ? "CURRENT_PERIOD" : "SELECTED_PERIODS"
      )
      return
    }

    const targetSubjs =
      subjectsShownInTt27Matrix.length > 0
        ? subjectsShownInTt27Matrix
        : secondarySubjectsForCurrentGrade

    const periodsToApply =
      scopeMode === "CURRENT_PERIOD"
        ? [period]
        : tt27ActivePeriods.length > 0
        ? tt27ActivePeriods
        : ["GK1", "CK1", "GK2", "CK2", "CN"]

    if (targetSubjs.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 môn học để khởi tạo")
      return
    }

    setAutoGeneratingPrimary(true)
    try {
      let savedCount = 0

      for (const pCode of periodsToApply) {
        if (isKsdnEvaluationPeriod(pCode)) continue
        for (const subj of targetSubjs) {
          const sysState = tt27SystemMatrix[subj.id] || { S: true, I: true }
          if (!sysState.S && !sysState.I) continue
          const targetProg =
            sysState.S && sysState.I ? program : sysState.S ? "Hệ S" : "Hệ I"

          const hasNumericScore =
            tt27KtMatrix[subj.id]?.[pCode] ??
            !isTt22CommentOnlySubject(subj.subjectName || subj.subjectCode)
          const isCommentOnly = !hasNumericScore

          // Nếu môn này đã được người dùng lưu Mẫu Sổ điểm chi tiết riêng (ví dụ: 2 cột / 3 cột ĐĐGtx hoặc Đánh giá nội bộ Sky-Line) và khớp chế độ điểm/nhận xét, giữ nguyên cấu trúc cột đã lưu!
          const existingSaved = vnEduConfigs.find(
            c =>
              c.subjectId === subj.id &&
              c.grade === grade &&
              c.evaluationPeriod === pCode
          )
          const existingDefs = existingSaved
            ? normalizeGradeColumnDefs(existingSaved).filter(
                d => d.group !== "REMARK" && d.key !== "ratingValue"
              )
            : []
          const existingHasNum = existingDefs.some(d => d.dataType === "NUMBER")

          if (existingSaved && existingDefs.length > 0 && existingHasNum === hasNumericScore) {
            const res = await fetch("/api/admin/ktdbcl/grade-configs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                academicYearId,
                program: targetProg,
                grade,
                subjectId: subj.id,
                evaluationPeriod: pCode,
                configType: "VNEDU",
                columnCount: existingDefs.filter(c => c.dataType === "NUMBER").length,
                columnNames: existingDefs.map(c => c.label),
                columnTypes: existingDefs.map(c => c.scaleCode),
                columnMaxScores: existingDefs.map(c => c.maxScore || 10),
                columnsJson: existingDefs,
                hasCompositeColumn: existingSaved.hasCompositeColumn !== false,
                compositeColumnName:
                  existingSaved.compositeColumnName || (pCode === "CN" ? "TB Cả năm" : "ĐTBmhk"),
                hasRatingColumn: Boolean(existingSaved.hasRatingColumn),
                ratingColumnName: existingSaved.ratingColumnName || "",
                ratingScaleJson: isCommentOnly ? ["Đ", "CĐ"] : null,
                hasRemarkColumn: existingSaved.hasRemarkColumn !== false,
                confirmationStatus: "CONFIRMED",
                changeNote: `Cập nhật Hệ áp dụng (${targetProg === "ALL" ? "Hệ S & Hệ I" : targetProg}) và giữ nguyên Mẫu Sổ điểm chi tiết cho ${grade} - ${pCode}`,
              }),
            })
            if (res.ok) savedCount++
            continue
          }

          const existingTxCount =
            existingDefs.filter(d => d.group === "TX").length || (isCommentOnly ? 2 : 4)
          const txCount = isCommentOnly ? 2 : existingTxCount

          const built = buildSecondaryTt22VnEduDefaultConfig({
            academicYearId,
            program: targetProg,
            grade,
            subjectId: subj.id,
            subjectName: subj.subjectName || subj.subjectCode,
            evaluationPeriod: pCode,
            forceCommentOnly: isCommentOnly,
            txColumnCount: txCount,
          })
          const cols = JSON.parse(built.columnsJson) as GradeColumnDef[]

          const res = await fetch("/api/admin/ktdbcl/grade-configs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              academicYearId,
              program: targetProg,
              grade,
              subjectId: subj.id,
              evaluationPeriod: pCode,
              configType: "VNEDU",
              columnCount: cols.filter(c => c.dataType === "NUMBER").length,
              columnNames: cols.map(c => c.label),
              columnTypes: cols.map(c => c.scaleCode),
              columnMaxScores: cols.map(c => c.maxScore || 10),
              columnsJson: cols,
              hasCompositeColumn: true,
              compositeColumnName: built.compositeColumnName || (pCode === "CN" ? "TB Cả năm" : "ĐTBmhk"),
              hasRatingColumn: isCommentOnly,
              ratingColumnName: isCommentOnly ? (pCode === "CN" ? "TB Cả năm" : "ĐTBmhk") : "",
              ratingScaleJson: isCommentOnly ? ["Đ", "CĐ"] : null,
              hasRemarkColumn: true,
              confirmationStatus: "CONFIRMED",
              changeNote: `Khởi tạo chuẩn TT22 ${getEducationLevelShortLabel(grade)} (${
                pCode === "CN"
                  ? "Học kỳ Cả năm: TBHK 1 + TBHK 2 + TB Cả năm + Điểm thi lại + Ghi chú + Nhận xét"
                  : isCommentOnly
                  ? "Môn nhận xét Đ/CĐ"
                  : `Môn tính điểm (${txCount} cột ĐĐGtx + ĐĐGgk + ĐĐGck + ĐTBmhk)`
              }) cho ${grade} - ${pCode} (${targetProg === "ALL" ? "Hệ S & Hệ I" : targetProg})`,
            }),
          })
          if (res.ok) savedCount++
        }
      }

      saveMatrixPrefsToStorage(grade, {
        ktMatrix: tt27KtMatrix,
        sysMatrix: tt27SystemMatrix,
        activePeriods: tt27ActivePeriods,
        selectedIds: selectedSubjectIds,
      })

      toast.success(
        `Đã lưu tùy chọn & khởi tạo ${savedCount} cấu hình chuẩn Thông tư 22 (${getEducationLevelShortLabel(grade)}) cho ${targetSubjs.length} môn thuộc ${grade} (${periodsToApply.join(", ")})`
      )
      onConfigsChanged()
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi khởi tạo cấu hình Thông tư 22")
    } finally {
      setAutoGeneratingPrimary(false)
    }
  }

  const handleAddColumn = () => {
    const idx = columns.length + 1
    setColumns(prev => [
      ...prev,
      {
        key: `col_${Date.now()}_${idx}`,
        label: isPrimary ? primaryMeta.ktColumnLabel : `TX${idx}`,
        group: isPrimary ? (primaryMeta.isMidterm ? "GK" : "CK") : "TX",
        attempt: idx,
        dataType: "NUMBER",
        scaleCode: "SCORE_10",
        maxScore: 10,
        allowedCodes: DEFAULT_RATING_CODES_TT27,
        required: false,
        inputMode: "INPUT",
        order: idx,
        aliases: [isPrimary ? primaryMeta.ktColumnLabel : `TX${idx}`],
      },
    ])
  }

  const handleSaveConfig = async (
    periodsScope: "CURRENT_PERIOD" | "SELECTED_PERIODS" = "CURRENT_PERIOD"
  ) => {
    if (!academicYearId) {
      toast.error("Thiếu năm học")
      return
    }
    const targetIds = targetDetailSubjectIds

    if (targetIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 môn học để lưu Mẫu Sổ điểm chi tiết")
      return
    }

    const periodsToSave =
      periodsScope === "CURRENT_PERIOD"
        ? [period]
        : tt27ActivePeriods.filter(p => !isKsdnEvaluationPeriod(p) && p !== "CN")
    const finalPeriods = periodsToSave.length > 0 ? periodsToSave : [period]

    setSaving(true)
    try {
      const isInternalMode = editorStructureMode === "INTERNAL_SKL" || isCurrentPeriodKsdn
      let totalSaved = 0
      const nextKtMatrix = { ...tt27KtMatrix }

      for (const pCode of finalPeriods) {
        const pIsKsdn = isKsdnEvaluationPeriod(pCode)
        const pMeta = getPrimaryPeriodMeta(pCode)

        // Điều chỉnh bộ cột theo kỳ pCode nếu đang lưu hàng loạt nhiều kỳ (GK1, CK1, GK2, CK2)
        let colsForPeriod = columns.map((c, idx) => ({ ...c, order: idx + 1 }))
        if (isPrimary && !isInternalMode) {
          if (editorStructureMode === "WITH_KT") {
            colsForPeriod = [
              {
                key: "col0",
                label: pMeta.ktColumnLabel,
                group: pMeta.isMidterm ? "GK" : "CK",
                attempt: 1,
                dataType: "NUMBER",
                scaleCode: "SCORE_10",
                maxScore: 10,
                allowedCodes: null,
                required: false,
                inputMode: "INPUT",
                order: 1,
                aliases: [pMeta.ktColumnLabel, pMeta.ktColumnLabel.replace(/\s+/g, ""), "KT", "Điểm KTĐK"],
              },
            ]
          } else {
            colsForPeriod = []
          }
        }

        const numericCols = colsForPeriod.filter(c => c.dataType === "NUMBER")
        const effectiveHasComposite = isPrimary && !isInternalMode ? false : hasCompositeColumn
        const rawInternalCompositeName = compositeColumnName || "Điểm"
        const adaptedInternalCompositeName =
          /^(KT\s*)(GK1|CK1|GK2|CK2)$/i.test(rawInternalCompositeName.trim())
            ? rawInternalCompositeName.trim().replace(/(GK1|CK1|GK2|CK2)$/i, pCode)
            : rawInternalCompositeName

        const effectiveCompositeName =
          isPrimary && !isInternalMode
            ? ""
            : isInternalMode
            ? adaptedInternalCompositeName
            : pCode === "CN"
            ? "TB Cả năm"
            : compositeColumnName && compositeColumnName !== "Điểm"
            ? compositeColumnName
            : "ĐTBmhk"

        const payload: Record<string, any> = {
          academicYearId,
          program,
          grade: pIsKsdn && isGrade6 ? "Khối 5" : grade,
          evaluationPeriod: pCode,
          configType: pIsKsdn ? "INTERNAL" : "VNEDU",
          columnCount: numericCols.length,
          columnNames: colsForPeriod.map(c => c.label),
          columnTypes: colsForPeriod.map(c => c.scaleCode),
          columnMaxScores: colsForPeriod.map(c => c.maxScore || 10),
          columnsJson: colsForPeriod,
          hasCompositeColumn: effectiveHasComposite,
          compositeColumnName: effectiveCompositeName,
          hasRatingColumn: isInternalMode
            ? hasRatingColumn
            : isPrimary
            ? true
            : editorStructureMode === "RATING_DAT" || hasRatingColumn,
          ratingColumnName: isPrimary ? pMeta.xlColumnLabel : ratingColumnName,
          ratingScaleJson: isPrimary
            ? ["T", "H", "C"]
            : editorStructureMode === "RATING_DAT"
            ? ["Đ", "CĐ"]
            : DEFAULT_RATING_CODES_TT27,
          hasRemarkColumn,
          confirmationStatus,
          ...(isInternalMode
            ? {
                formula: internalFormula || "AVERAGE",
                formulaCustom: internalFormulaCustom || null,
                weights: internalWeights || null,
                roundingRule: internalRoundingRule || "ROUND_1",
              }
            : {}),
          changeNote:
            changeNote ||
            (isInternalMode
              ? `Áp dụng Mẫu 3. Đánh giá nội bộ Sky-Line cho ${targetIds.length} môn (${grade} - ${pCode})`
              : editorStructureMode === "RATING_DAT"
              ? `Áp dụng Mẫu 2. Môn đánh giá bằng Nhận xét (Đ/CĐ) cho ${targetIds.length} môn (${grade} - ${pCode})`
              : `Lưu Mẫu Sổ điểm chi tiết (${colsForPeriod.filter(c => c.group === "TX").length || numericCols.length} cột) cho ${targetIds.length} môn (${grade} - ${pCode})`),
        }

        if (targetIds.length === 1) {
          payload.subjectId = targetIds[0]
        } else {
          payload.batchSubjectIds = targetIds
        }

        const res = await fetch("/api/admin/ktdbcl/grade-configs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          toast.error(data.error || `Lưu cấu hình thất bại ở kỳ ${pCode}`)
          return
        }
        totalSaved += data.count || targetIds.length

        // Đồng bộ sang "2. Đánh giá nội bộ Sky-Line" nếu người dùng chọn Mẫu "3. Đánh giá nội bộ Sky-Line"
        if (isInternalMode && !pIsKsdn) {
          await fetch("/api/admin/ktdbcl/grade-configs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...payload,
              configType: "INTERNAL",
            }),
          }).catch(() => {})
        }

        for (const sId of targetIds) {
          nextKtMatrix[sId] = {
            ...(nextKtMatrix[sId] || {}),
            [pCode]: numericCols.length > 0,
          }
        }
      }

      setTt27KtMatrix(nextKtMatrix)
      saveMatrixPrefsToStorage(grade, {
        ktMatrix: nextKtMatrix,
        sysMatrix: tt27SystemMatrix,
        activePeriods: tt27ActivePeriods,
        selectedIds: Array.from(new Set([...selectedSubjectIds, ...targetIds])),
      })

      const subjNamesLabel =
        targetDetailSubjects.length === 1
          ? targetDetailSubjects[0].subjectName
          : `${targetIds.length} môn (${targetDetailSubjects.map(s => s.subjectName).slice(0, 3).join(", ")}${targetDetailSubjects.length > 3 ? "..." : ""})`

      toast.success(
        `Đã lưu Mẫu Sổ điểm chi tiết (${
          isInternalMode
            ? "Đánh giá nội bộ Sky-Line"
            : isPrimary
            ? editorStructureMode === "WITH_KT"
              ? "Có điểm KTĐK"
              : "Chỉ Nhận xét & XL"
            : editorStructureMode === "RATING_DAT"
            ? "Nhận xét Đ/CĐ"
            : `Điểm số (${secondaryTxCountInEditor} cột ĐĐGtx)`
        }) cho ${subjNamesLabel} • ${grade} (${finalPeriods.join(", ")})`
      )
      setChangeNote("")
      onConfigsChanged()
    } catch (err: any) {
      toast.error(err?.message || "Lỗi kết nối")
    } finally {
      setSaving(false)
    }
  }

  const handleViewHistory = async (cfg: any) => {
    try {
      const res = await fetch(`/api/admin/ktdbcl/grade-configs?historyFor=${cfg.id}`)
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error("Không tải được lịch sử phiên bản")
        return
      }
      setHistoryModal({
        open: true,
        title: `${cfg.subject?.subjectName || "Mẫu chung"} • ${cfg.grade} • ${cfg.evaluationPeriod}`,
        versions: data.versions || [],
      })
    } catch {
      toast.error("Lỗi khi tải lịch sử")
    }
  }

  const runBatchCopy = async (previewOnly: boolean) => {
    const targets: any[] = []
    for (const sId of batchTargetSubjectIds) {
      for (const g of batchTargetGrades) {
        for (const p of batchTargetPeriods) {
          targets.push({ subjectId: sId, grade: g, evaluationPeriod: p, program })
        }
      }
    }
    if (targets.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 môn, khối và kỳ")
      return
    }
    setBatchLoading(true)
    try {
      const numericCols = columns.filter(c => c.dataType === "NUMBER")
      const res = await fetch("/api/admin/ktdbcl/grade-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId,
          program,
          configType: "VNEDU",
          batchTargets: targets,
          previewOnly,
          skipConfirmedExceptions: true,
          columnCount: numericCols.length,
          columnNames: numericCols.map(c => c.label),
          columnTypes: numericCols.map(c => c.scaleCode),
          columnMaxScores: numericCols.map(c => c.maxScore || 10),
          columnsJson: columns,
          hasCompositeColumn: isPrimary ? false : hasCompositeColumn,
          compositeColumnName: isPrimary ? "" : compositeColumnName,
          hasRatingColumn,
          ratingColumnName,
          ratingScaleJson: isPrimary ? ["T", "H", "C"] : DEFAULT_RATING_CODES_TT27,
          hasRemarkColumn,
          confirmationStatus,
          changeNote: "Sao chép hàng loạt cấu hình vnEdu",
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || "Thao tác hàng loạt thất bại")
        return
      }
      setBatchPreviewRows(data.previewRows || [])
      if (!previewOnly) {
        toast.success(`Đã áp dụng ${data.count} cấu hình (giữ nguyên ngoại lệ đã xác nhận)`)
        onConfigsChanged()
      }
    } catch {
      toast.error("Lỗi kết nối")
    } finally {
      setBatchLoading(false)
    }
  }

  const primaryHasKtInEditor = columns.some(c => c.dataType === "NUMBER")
  const secondaryIsCommentOnlyInEditor = !isPrimary && columns.length > 0 && columns.every(c => c.dataType === "RATING")
  const secondaryTxCountInEditor = !isPrimary ? columns.filter(c => c.group === "TX").length || 4 : 4

  const inspectedSubjectObj = useMemo(
    () => subjects.find(s => s.id === (inspectedSubjectId || subjectId)) || null,
    [subjects, inspectedSubjectId, subjectId]
  )

  return (
    <div className="space-y-6">
      {/* Main Card */}
      <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
          <div>
            <h3 className="text-base font-bold text-[#003B3A]">
              Cấu hình Sổ điểm theo vnEdu — {currentLevelMeta.fullLabel} ({currentLevelMeta.circularLabel})
            </h3>
            <p className="text-xs text-slate-500">
              Chọn <strong>Bậc học (Tiểu học, THCS, THPT)</strong> → <strong>Khối áp dụng</strong> → <strong>Môn học SSM</strong> để thiết lập trên bảng <strong>Ma trận Khởi tạo chuẩn theo Bậc, Khối, Hệ</strong>. Nhấp vào tên môn trong bảng để xem chi tiết bố cục Sổ điểm.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Thanh chọn nhanh Bậc học: Tiểu học | THCS | THPT */}
            <div className="inline-flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-1 gap-1">
              {EDUCATION_LEVEL_OPTIONS.map(lvl => {
                const active = educationLevel === lvl.code
                return (
                  <button
                    key={lvl.code}
                    type="button"
                    onClick={() => handleSelectEducationLevel(lvl.code)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? "bg-[#003B3A] text-white shadow-xs"
                        : "text-slate-600 hover:bg-white hover:text-[#003B3A]"
                    }`}
                  >
                    Bậc {lvl.shortLabel}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              disabled={autoGeneratingPrimary}
              onClick={() => handleInitializePrimaryTt27ByMatrix("SELECTED_PERIODS")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-[#059669] border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-semibold disabled:opacity-50"
            >
              <Wand2 className="w-3.5 h-3.5" />
              {autoGeneratingPrimary
                ? "Đang khởi tạo..."
                : `Khởi tạo chuẩn ${isPrimary ? "TT27" : "TT22"} (${grade})`}
            </button>

            <button
              type="button"
              onClick={() => {
                setBatchPreviewRows([])
                if (selectedSubjectIds.length > 0) {
                  setBatchTargetSubjectIds(selectedSubjectIds)
                }
                setBatchModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#003B3A] hover:bg-[#002b2a] text-white rounded-xl text-xs font-semibold"
            >
              <Copy className="w-3.5 h-3.5" />
              Sao chép sang nhiều Khối / Kỳ
            </button>
          </div>
        </div>

        {/* Scope Selectors: 1. Chương trình / Hệ | 2. Bậc học | 3. Chọn Khối áp dụng | 4. Kỳ đánh giá / Học kỳ | 5. Trạng thái xác nhận */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">1. Chương trình / Hệ</label>
            <select
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="w-full border border-[#E2E8F0] rounded-xl px-2.5 py-2 bg-white"
            >
              {PROGRAM_OPTIONS.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">2. Bậc học (Tiểu học, THCS, THPT)</label>
            <select
              value={educationLevel}
              onChange={(e) => handleSelectEducationLevel(e.target.value as EducationLevelCode)}
              className="w-full border border-[#E2E8F0] rounded-xl px-2.5 py-2 bg-white font-semibold text-[#003B3A]"
            >
              {EDUCATION_LEVEL_OPTIONS.map(lvl => (
                <option key={lvl.code} value={lvl.code}>
                  {lvl.fullLabel}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              3. Chọn Khối áp dụng ({currentLevelMeta.shortLabel})
            </label>
            <select
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value)
                setSelectedSubjectIds([])
                setInspectedSubjectId(null)
              }}
              className="w-full border border-[#E2E8F0] rounded-xl px-2.5 py-2 bg-white font-semibold text-[#003B3A]"
            >
              {gradesInSelectedLevel.map(g => (
                <option key={g} value={g}>{g} — Bậc {getEducationLevelShortLabel(g)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">4. Kỳ đánh giá / Học kỳ</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full border border-[#E2E8F0] rounded-xl px-2.5 py-2 bg-white font-semibold"
            >
              {effectiveEvalPeriods.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">5. Trạng thái xác nhận</label>
            <select
              value={confirmationStatus}
              onChange={(e) => setConfirmationStatus(e.target.value as "CONFIRMED" | "UNCONFIRMED")}
              className="w-full border border-[#E2E8F0] rounded-xl px-2.5 py-2 bg-white font-medium"
            >
              <option value="CONFIRMED">Đã xác nhận cấu hình vnEdu</option>
              <option value="UNCONFIRMED">Chưa xác nhận cấu hình vnEdu</option>
            </select>
          </div>
        </div>

        {/* Thông báo khi chọn Kỳ Khảo sát đầu năm (KSĐN) */}
        {isCurrentPeriodKsdn && (
          <div className="bg-[#F0FDFA] border border-[#008B85]/40 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-[#003B3A] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                <span>
                  {isGrade6
                    ? "Với Khối 6 • KSĐN: Các môn khảo sát lấy ở bậc Tiểu học của Khối 5 (theo 2. Đánh giá nội bộ Sky-Line)"
                    : "Kỳ Khảo sát đầu năm (KSĐN) lấy cấu hình các môn theo “2. Đánh giá nội bộ Sky-Line”"}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                {isGrade6 ? (
                  <>
                    Hiện tại <strong>Khối 6 (KSĐN)</strong> đang kế thừa{" "}
                    <strong>{ksdnInternalConfigsForCurrentGradeBySubjectId.size} môn Tiểu học của Khối 5</strong>{" "}
                    (Tiếng Việt, Toán học, Tiếng Anh, ESL, Mathematics, Science...).
                  </>
                ) : (
                  <>
                    Hiện tại {grade} có <strong>{ksdnInternalConfigsForCurrentGradeBySubjectId.size} môn</strong> đã được gán cấu hình KSĐN trong mục 2. Đánh giá nội bộ Sky-Line.
                  </>
                )}
              </p>
            </div>
            {onSwitchToInternalConfig && (
              <button
                type="button"
                onClick={() => onSwitchToInternalConfig(isGrade6 ? "Khối 5" : grade, "KSĐN", subjectId || undefined)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#002b2a] text-white text-xs font-semibold shadow-xs"
              >
                <Sliders className="w-3.5 h-3.5 text-[#5EEAD4]" />
                Mở 2. Đánh giá nội bộ Sky-Line ({isGrade6 ? "Tiểu học Khối 5 → Khối 6" : grade} • KSĐN)
              </button>
            )}
          </div>
        )}

        {/* KHUNG CHỌN NHIỀU MÔN HỌC GÁN THEO KHỐI (HIỂN THỊ DANH MỤC MÔN HỌC BỘ GD&ĐT & ĐẶC THÙ SKY-LINE) */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <BookOpen className="w-4 h-4 text-[#008B85]" />
              <span className="font-bold text-[#003B3A]">
                6. Chọn Môn học SSM gán cho Bậc {currentLevelMeta.shortLabel} • {grade} • {period === "CN" ? "Cả năm (CN)" : period}
                {isGrade6Ksdn ? " (Lấy môn ở Tiểu học của Khối 5)" : ""}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#003B3A] text-white text-[11px] font-semibold tabular-nums">
                Đã chọn {selectedSubjectIds.length}/{filteredSubjectsForPicker.length} môn
              </span>
              {configsInCurrentScopeBySubjectId.size > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200 text-[11px] font-semibold tabular-nums">
                  {configsInCurrentScopeBySubjectId.size} môn đã có cấu hình ở {grade} ({period}{isGrade6Ksdn ? " • Tiểu học Khối 5" : isCurrentPeriodKsdn ? " • 2. ĐG nội bộ" : ""})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-semibold text-[#003B3A] bg-white px-2.5 py-1.5 rounded-xl border border-[#E2E8F0]">
                <input
                  type="checkbox"
                  checked={onlyPrimarySubjectsForGrade}
                  onChange={(e) => setOnlyPrimarySubjectsForGrade(e.target.checked)}
                  className="rounded border-slate-300 text-[#003B3A]"
                />
                <span>
                  {isGrade6Ksdn
                    ? `Lọc môn KSĐN lấy ở Tiểu học của Khối 5 (${ksdnInternalConfigsForCurrentGradeBySubjectId.size} môn)`
                    : isCurrentPeriodKsdn
                    ? `Lọc môn KSĐN theo 2. Đánh giá nội bộ Sky-Line (${ksdnInternalConfigsForCurrentGradeBySubjectId.size} môn)`
                    : isPrimary
                    ? `Lọc môn theo ${grade} (TT27 + Đặc thù Sky-Line)`
                    : `Lọc môn theo ${grade} (TT22 + Đặc thù Sky-Line)`}
                </span>
              </label>

              {/* Search subject input */}
              <div className="relative min-w-[210px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  placeholder="Tìm nhanh tên hoặc mã môn..."
                  className="w-full border border-[#E2E8F0] rounded-xl pl-8 pr-7 py-1.5 text-xs bg-white focus:border-[#008B85] outline-none"
                />
                {subjectSearch && (
                  <button
                    type="button"
                    onClick={() => setSubjectSearch("")}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* THANH DANH MỤC MÔN HỌC BỘ GD&ĐT & NÚT CHUYỂN SANG CẤU HÌNH / SỔ ĐIỂM RIÊNG ĐÁNH GIÁ NỘI BỘ SKY-LINE */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-[#E2E8F0] rounded-xl p-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#003B3A] text-white shadow-xs">
                Danh mục Môn học Bộ GD&amp;ĐT ({moetSubjectsForCurrentGrade.length} môn)
              </span>
              <span className="text-[11px] text-slate-500">
                Các môn Song ngữ &amp; Quốc tế ({bilingualSubjectsForCurrentGrade.length} môn) được cấu hình và quản lý Sổ điểm riêng tại <strong>2. Đánh giá nội bộ Sky-Line</strong>.
              </span>
            </div>
            {onSwitchToInternalConfig && (
              <button
                type="button"
                onClick={() => onSwitchToInternalConfig(grade, period, undefined)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0FDFA] hover:bg-teal-100 text-[#003B3A] border border-[#008B85]/40 text-[11px] font-bold transition-colors"
              >
                <Sliders className="w-3.5 h-3.5 text-[#008B85]" />
                <span>
                  Mở 2. Đánh giá nội bộ Sky-Line (Môn Song ngữ &amp; Quốc tế)
                </span>
              </button>
            )}
          </div>

          {/* Quick select group buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Chọn nhanh nhóm môn Bộ GD&amp;ĐT:</span>
            <button
              type="button"
              onClick={() => handleQuickSelectGroup("MOET_ONLY")}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#003B3A] border border-slate-300 text-[11px] font-semibold transition-colors"
            >
              + Chọn hết Môn học Bộ ({moetSubjectsForCurrentGrade.length})
            </button>
            {isPrimary ? (
              <>
                <button
                  type="button"
                  onClick={() => handleQuickSelectGroup("PRIMARY_KT")}
                  className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200 text-[11px] font-semibold transition-colors"
                >
                  Môn có điểm {primaryMeta.ktColumnLabel} ({grade})
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelectGroup("PRIMARY_REMARK")}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-[#E2E8F0] text-[11px] font-semibold transition-colors"
                >
                  Môn chỉ Nhận xét &amp; {primaryMeta.xlColumnLabel}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleQuickSelectGroup("TT22_SCORE")}
                  className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200 text-[11px] font-semibold transition-colors"
                >
                  Môn tính điểm + Nhận xét (TT22)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelectGroup("TT22_RATING")}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-[#E2E8F0] text-[11px] font-semibold transition-colors"
                >
                  Môn nhận xét Đ/CĐ (GDTC, Nghệ thuật, HĐTN, GDĐP)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelectGroup("CORE")}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-[#E2E8F0] text-[11px] font-semibold transition-colors"
                >
                  Môn cốt lõi (Toán, Văn, Anh)
                </button>
              </>
            )}

            {configsInCurrentScopeBySubjectId.size > 0 && (
              <button
                type="button"
                onClick={() => handleQuickSelectGroup("CONFIGURED_IN_GRADE")}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#059669] border border-emerald-200 text-[11px] font-semibold transition-colors"
              >
                Môn đã cấu hình ({configsInCurrentScopeBySubjectId.size})
              </button>
            )}

            <button
              type="button"
              onClick={() => handleQuickSelectGroup("ALL")}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-[#E2E8F0] text-[11px] font-medium transition-colors"
            >
              Chọn tất cả đang hiển thị ({filteredSubjectsForPicker.length})
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelectGroup("NONE")}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-[#E11D48] border border-[#E2E8F0] text-[11px] font-medium transition-colors"
            >
              Bỏ chọn
            </button>
          </div>

          {/* Multi-select Subject Checkbox Grid grouped by Danh mục Môn học Bộ GD&ĐT & Đặc thù Sky-Line */}
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1 pt-0.5">
            {(["MOET", "SKL", "BILINGUAL"] as const).map(groupCode => {
              const groupSubjects = filteredSubjectsForPicker.filter(
                s => getSubjectCurriculumGroup(s) === groupCode
              )
              if (groupSubjects.length === 0) return null

              const groupTitle =
                groupCode === "MOET"
                  ? `Danh mục Môn học Bộ GD&ĐT (${groupSubjects.length} môn)`
                  : groupCode === "SKL"
                  ? `Danh mục Môn Đặc thù Sky-Line (${groupSubjects.length} môn)`
                  : `Danh mục Môn Song ngữ & Quốc tế (${groupSubjects.length} môn)`

              const groupBadgeClass =
                groupCode === "MOET"
                  ? "bg-slate-100 text-[#003B3A] border-slate-200"
                  : groupCode === "SKL"
                  ? "bg-emerald-50 text-[#059669] border-emerald-200"
                  : "bg-teal-50 text-[#00736E] border-teal-200"

              const allGroupSelected = groupSubjects.every(s => selectedSubjectIds.includes(s.id))

              return (
                <div key={groupCode} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${groupBadgeClass}`}>
                        {groupCode === "MOET" ? "Bộ GD&ĐT" : groupCode === "SKL" ? "Đặc thù Sky-Line" : "Song ngữ"}
                      </span>
                      <span className="font-bold text-[#003B3A] text-[11px]">{groupTitle}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const groupIds = groupSubjects.map(s => s.id)
                        setSelectedSubjectIds(prev => {
                          if (allGroupSelected) {
                            const next = prev.filter(id => !groupIds.includes(id))
                            setSubjectId(next[0] || "")
                            saveMatrixPrefsToStorage(grade, { selectedIds: next })
                            return next
                          }
                          const merged = Array.from(new Set([...prev, ...groupIds]))
                          setSubjectId(merged[0] || "")
                          saveMatrixPrefsToStorage(grade, { selectedIds: merged })
                          return merged
                        })
                      }}
                      className="text-[11px] font-semibold text-[#008B85] hover:underline"
                    >
                      {allGroupSelected ? "Bỏ chọn nhóm này" : `Chọn cả nhóm (${groupSubjects.length})`}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {groupSubjects.map(s => {
                      const isChecked = selectedSubjectIds.includes(s.id)
                      const existingCfg = configsInCurrentScopeBySubjectId.get(s.id)
                      const existingDefs = existingCfg ? normalizeGradeColumnDefs(existingCfg) : []
                      const hasKtExisting = existingDefs.some(d => d.dataType === "NUMBER")
                      const isTt22Comment = isTt22CommentOnlySubject(s.subjectName || s.subjectCode)
                      const ksdnSummary =
                        isCurrentPeriodKsdn && existingCfg ? formatInternalConfigSummary(existingCfg) : null

                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSelectSubject(s.id)}
                          className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                            isChecked
                              ? "bg-[#F0FDFA] border-[#008B85] ring-1 ring-[#008B85]"
                              : existingCfg
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
                            <div className="font-semibold text-slate-900 truncate" title={s.subjectName}>
                              {s.subjectName}
                            </div>
                            <div className="flex items-center justify-between gap-1 mt-0.5 flex-wrap">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-mono text-slate-500">{s.subjectCode}</span>
                                <span
                                  className={`text-[9px] px-1 py-0.1 rounded font-semibold ${
                                    groupCode === "SKL"
                                      ? "bg-emerald-50 text-[#059669]"
                                      : groupCode === "BILINGUAL"
                                      ? "bg-teal-50 text-[#00736E]"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {groupCode === "SKL" ? "Đặc thù SKL" : groupCode === "BILINGUAL" ? "Song ngữ" : "Bộ GD&ĐT"}
                                </span>
                              </div>
                              {isCurrentPeriodKsdn && ksdnSummary ? (
                                <span
                                  className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-teal-50 text-[#008B85] truncate max-w-[140px]"
                                  title={ksdnSummary.fullTitle}
                                >
                                  {ksdnSummary.shortLabel}
                                </span>
                              ) : existingCfg ? (
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                    hasKtExisting
                                      ? "bg-emerald-50 text-[#059669]"
                                      : "bg-teal-50 text-[#008B85]"
                                  }`}
                                >
                                  {isPrimary
                                    ? hasKtExisting
                                      ? `Có ${primaryMeta.ktColumnLabel}`
                                      : `Chỉ ${primaryMeta.xlColumnLabel}+NX`
                                    : period === "CN"
                                    ? "Đã cấu hình Cả năm"
                                    : hasKtExisting
                                    ? "Điểm số + NX"
                                    : "Nhận xét Đ/CĐ"}
                                </span>
                              ) : !isPrimary ? (
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                    isTt22Comment
                                      ? "bg-amber-50 text-[#D97706]"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {isTt22Comment ? "TT22: Đ/CĐ" : "TT22: Thang 10"}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* MA TRẬN KHỞI TẠO CHUẨN THEO BẬC, KHỐI, HỆ (TIỂU HỌC TT27 • THCS TT22 • THPT TT22) — CLICK VÀO MÔN ĐỂ XEM CHI TIẾT */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
          <div className="bg-[#F0FDFA] border-b border-[#CCFBF1] px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-[#003B3A] flex items-center gap-2 flex-wrap">
                <Wand2 className="w-4 h-4 text-[#008B85]" />
                <span>
                  Ma trận Khởi tạo chuẩn theo Bậc, Khối, Hệ — Bậc {currentLevelMeta.shortLabel} ({matrixViewAllGradesInLevel ? `Tất cả Khối Bậc ${currentLevelMeta.shortLabel}` : grade})
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#003B3A] text-white text-[11px] font-semibold tabular-nums">
                  {matrixRowsByLevelAndGrade.length} dòng môn học
                </span>
                {selectedMatrixSubjectIds.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-semibold tabular-nums">
                    Đã tích chọn {selectedMatrixSubjectIds.length} dòng
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Trực quan theo <strong>Bậc ({currentLevelMeta.shortLabel}) • Khối • Hệ S / Hệ I • Các kỳ</strong>. <strong>Nhấp vào tên Môn học</strong> (hoặc bấm <strong>Chi tiết</strong>) để mở xem trước bố cục Sổ điểm chi tiết vnEdu và chỉnh sửa cột.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Chế độ hiển thị Khối trong bảng Ma trận */}
              <div className="inline-flex items-center bg-white border border-[#E2E8F0] rounded-xl p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setMatrixViewAllGradesInLevel(false)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    !matrixViewAllGradesInLevel
                      ? "bg-[#003B3A] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Đang chọn ({grade})
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixViewAllGradesInLevel(true)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    matrixViewAllGradesInLevel
                      ? "bg-[#003B3A] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Tất cả Khối Bậc {currentLevelMeta.shortLabel}
                </button>
              </div>

              {selectedMatrixSubjectIds.length > 0 && (
                <button
                  type="button"
                  disabled={bulkDeletingMatrix}
                  onClick={handleBulkDeleteSelectedMatrixRows}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E11D48] hover:bg-rose-700 text-white text-[11px] font-semibold shadow-xs disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {bulkDeletingMatrix
                    ? "Đang xóa..."
                    : `Xóa ${selectedMatrixSubjectIds.length} dòng đã chọn`}
                </button>
              )}

              <button
                type="button"
                onClick={resetTt27MatrixToStrictStandard}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] text-[11px] font-semibold"
              >
                <RefreshCw className="w-3 h-3" />
                Đặt lại mặc định {isPrimary ? "TT27" : "TT22"} ({grade})
              </button>
              <button
                type="button"
                disabled={autoGeneratingPrimary || subjectsShownInTt27Matrix.length === 0}
                onClick={() => handleInitializePrimaryTt27ByMatrix("SELECTED_PERIODS")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {autoGeneratingPrimary ? "Đang lưu..." : `Lưu tùy chọn (${grade})`}
              </button>
              <button
                type="button"
                disabled={autoGeneratingPrimary || subjectsShownInTt27Matrix.length === 0}
                onClick={() => handleInitializePrimaryTt27ByMatrix("SELECTED_PERIODS")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#002b2a] text-white text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                <Wand2 className="w-3.5 h-3.5 text-[#5EEAD4]" />
                {autoGeneratingPrimary
                  ? "Đang khởi tạo..."
                  : `Áp dụng & Khởi tạo ${subjectsShownInTt27Matrix.length} môn ${grade} (${tt27ActivePeriods.join(", ")})`}
              </button>
            </div>
          </div>

          {matrixRowsByLevelAndGrade.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 space-y-2 bg-white">
              <p className="font-medium text-slate-700">
                Chưa có môn học nào được chọn hoặc gán cho <strong>Bậc {currentLevelMeta.shortLabel} • {grade}</strong>.
              </p>
              <p className="text-[11px] text-slate-500">
                Vui lòng tích chọn môn học tại mục <strong>6. Chọn Môn học SSM gán cho Bậc {currentLevelMeta.shortLabel} • {grade}</strong> phía trên (hoặc bấm nút bên dưới) để hiển thị trong Ma trận.
              </p>
              <div className="pt-1 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickSelectGroup("MOET_ONLY")}
                  className="px-3 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#002b2a] text-white text-[11px] font-semibold"
                >
                  + Chọn các Môn học Bộ GD&amp;ĐT của {grade} ({moetSubjectsForCurrentGrade.length} môn)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelectGroup("SKL_ONLY")}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#059669] border border-emerald-200 text-[11px] font-semibold"
                >
                  + Chọn Môn Đặc thù Sky-Line ({sklSubjectsForCurrentGrade.length} môn)
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#003B3A] text-white border-b border-[#003B3A] sticky top-0 z-10">
                  <tr className="text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-3 px-2.5 w-9 text-center border-r border-white/15">
                      <input
                        type="checkbox"
                        checked={isAllMatrixSubjectRowsSelected}
                        onChange={toggleSelectAllMatrixSubjectRows}
                        title="Chọn / Bỏ chọn tất cả dòng môn học trong Ma trận"
                        className="rounded border-white/40 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3 border-r border-white/15 min-w-[230px]">
                      Môn học (Nhấp vào môn để xem chi tiết)
                    </th>
                    <th className="py-3 px-2.5 text-center border-r border-white/15 text-teal-100 min-w-[85px]">
                      Bậc
                    </th>
                    <th className="py-3 px-2.5 text-center border-r border-white/15 text-teal-100 min-w-[80px]">
                      Khối
                    </th>
                    <th className="py-2 px-2 text-center border-r border-white/15 min-w-[95px]">
                      <div className="text-[#5EEAD4] font-semibold">Hệ S</div>
                      <div className="flex items-center justify-center gap-1 mt-1 text-[10px] font-normal">
                        <button
                          type="button"
                          onClick={() => toggleAllSubjectsSystem("S", true)}
                          className="px-1.5 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[#5EEAD4]"
                          title={`Bật tất cả môn cho Hệ S ở ${grade}`}
                        >
                          Bật hết
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleAllSubjectsSystem("S", false)}
                          className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-teal-100"
                          title={`Tắt tất cả môn cho Hệ S ở ${grade}`}
                        >
                          Tắt hết
                        </button>
                      </div>
                    </th>
                    <th className="py-2 px-2 text-center border-r border-white/15 min-w-[95px]">
                      <div className="text-[#5EEAD4] font-semibold">Hệ I</div>
                      <div className="flex items-center justify-center gap-1 mt-1 text-[10px] font-normal">
                        <button
                          type="button"
                          onClick={() => toggleAllSubjectsSystem("I", true)}
                          className="px-1.5 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[#5EEAD4]"
                          title={`Bật tất cả môn cho Hệ I ở ${grade}`}
                        >
                          Bật hết
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleAllSubjectsSystem("I", false)}
                          className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-teal-100"
                          title={`Tắt tất cả môn cho Hệ I ở ${grade}`}
                        >
                          Tắt hết
                        </button>
                      </div>
                    </th>
                    {effectiveEvalPeriods.map(p => {
                      const isKsdnCol = isKsdnEvaluationPeriod(p.code)
                      const isPeriodChecked = tt27ActivePeriods.includes(p.code)
                      const meta = getPrimaryPeriodMeta(p.code)

                      if (isKsdnCol) {
                        return (
                          <th key={p.code} className="py-2 px-2.5 text-center border-r border-white/15 min-w-[165px]">
                            <div className="inline-flex items-center justify-center gap-1.5 text-[#5EEAD4] font-semibold">
                              <span>{p.code} ({isGrade6 ? "Lấy từ Tiểu học K5" : "Đầu năm"})</span>
                            </div>
                            <div className="flex items-center justify-center mt-1 text-[10px] font-normal">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onSwitchToInternalConfig) {
                                    onSwitchToInternalConfig(isGrade6 ? "Khối 5" : grade, "KSĐN")
                                  } else {
                                    setPeriod("KSĐN")
                                  }
                                }}
                                className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-teal-100"
                                title={
                                  isGrade6
                                    ? "Với Khối 6 KSĐN thì các môn khảo sát lấy ở Tiểu học của Khối 5 (theo 2. Đánh giá nội bộ Sky-Line)"
                                    : "Kỳ Khảo sát đầu năm lấy cấu hình các môn theo 2. Đánh giá nội bộ Sky-Line"
                                }
                              >
                                {isGrade6
                                  ? `Tiểu học Khối 5 (${ksdnInternalConfigsForCurrentGradeBySubjectId.size} môn)`
                                  : `Theo 2. ĐG nội bộ (${ksdnInternalConfigsForCurrentGradeBySubjectId.size} môn)`}
                              </button>
                            </div>
                          </th>
                        )
                      }

                      return (
                        <th key={p.code} className="py-2 px-2.5 text-center border-r border-white/15 min-w-[138px]">
                          <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer select-none text-white">
                            <input
                              type="checkbox"
                              checked={isPeriodChecked}
                              onChange={(e) =>
                                setTt27ActivePeriods(prev => {
                                  const next = e.target.checked
                                    ? [...prev, p.code]
                                    : prev.filter(x => x !== p.code)
                                  saveMatrixPrefsToStorage(grade, { activePeriods: next })
                                  return next
                                })
                              }
                              className="rounded border-white/40"
                            />
                            <span>{p.code === "CN" ? "CN (Cả năm)" : `${p.code} (${meta.periodShortLabel})`}</span>
                          </label>
                          <div className="flex items-center justify-center gap-1 mt-1 text-[10px] font-normal">
                            <button
                              type="button"
                              onClick={() => toggleAllSubjectsKtForPeriod(p.code, true)}
                              className="px-1.5 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[#5EEAD4]"
                              title={
                                isPrimary
                                  ? `Bật cột ${meta.ktColumnLabel} cho tất cả môn ở kỳ ${p.code}`
                                  : `Chuyển tất cả môn ở kỳ ${p.code} sang Điểm số (Thang 10)`
                              }
                            >
                              {isPrimary ? "Tất cả Có KT" : "Tất cả Điểm số"}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleAllSubjectsKtForPeriod(p.code, false)}
                              className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-teal-100"
                              title={
                                isPrimary
                                  ? `Chuyển tất cả môn ở kỳ ${p.code} sang Chỉ XL + Nhận xét`
                                  : `Chuyển tất cả môn ở kỳ ${p.code} sang Nhận xét (Đ/CĐ)`
                              }
                            >
                              {isPrimary ? "Chỉ XL+NX" : "Nhận xét Đ/CĐ"}
                            </button>
                          </div>
                        </th>
                      )
                    })}
                    <th className="py-3 px-3 text-center min-w-[135px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {matrixRowsByLevelAndGrade.map(row => {
                    const { rowKey, subj, rowGrade, rowLevelLabel, isRowPrimary, savedConfigs } = row
                    const isRowChecked = selectedMatrixSubjectIds.includes(rowKey)
                    const isInspected =
                      inspectedSubjectId === subj.id && rowGrade === grade
                    const sysInfo = getSubjectSystemInfoForGrade(subj, rowGrade)
                    const sysState = tt27SystemMatrix[subj.id] ?? { S: sysInfo.hasS, I: sysInfo.hasI }
                    const isAssignedInRowGrade = savedConfigs.length > 0
                    const currGroup = getSubjectCurriculumGroup(subj)

                    return (
                      <tr
                        key={rowKey}
                        className={`align-middle transition-colors ${
                          isInspected
                            ? "bg-[#F0FDFA] hover:bg-[#F0FDFA]"
                            : isRowChecked
                            ? "bg-[#F0FDFA]/60 hover:bg-[#F0FDFA]"
                            : "hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <td className="py-2.5 px-2.5 text-center border-r border-[#E2E8F0]">
                          <input
                            type="checkbox"
                            checked={isRowChecked}
                            onChange={() => toggleSelectMatrixSubjectRow(rowKey)}
                            className="rounded border-slate-300 text-[#003B3A] cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 border-r border-[#E2E8F0] min-w-[270px]">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenSubjectDetailFromMatrix(subj, rowGrade)}
                              className="text-left group flex items-center gap-1.5"
                              title={`Nhấp để chọn môn ${subj.subjectName} (${rowGrade}) và thiết lập Mẫu Sổ điểm chi tiết bên dưới`}
                            >
                              <span className="font-bold text-[#003B3A] group-hover:text-[#008B85] group-hover:underline whitespace-nowrap">
                                {subj.subjectName}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                ({subj.subjectCode})
                              </span>
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                  currGroup === "SKL"
                                    ? "bg-emerald-50 text-[#059669]"
                                    : currGroup === "BILINGUAL"
                                    ? "bg-teal-50 text-[#00736E]"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {currGroup === "SKL" ? "Đặc thù SKL" : currGroup === "BILINGUAL" ? "Song ngữ" : "Bộ GD&ĐT"}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                  isAssignedInRowGrade
                                    ? "bg-emerald-50 text-[#059669]"
                                    : "bg-amber-50 text-[#D97706]"
                                }`}
                              >
                                {isAssignedInRowGrade ? `Đã lưu (${savedConfigs.length} kỳ)` : "Đang chọn"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 text-center border-r border-[#E2E8F0]">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-[#003B3A] font-semibold text-[11px]">
                            {rowLevelLabel}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-center border-r border-[#E2E8F0] font-semibold text-[#003B3A]">
                          {rowGrade}
                        </td>
                        <td className="py-1.5 px-2 text-center border-r border-[#E2E8F0]">
                          <button
                            type="button"
                            onClick={() => toggleMatrixCellSystem(subj.id, "S")}
                            className={`w-full py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                              sysState.S
                                ? "bg-emerald-50 text-[#059669] border-emerald-300 hover:bg-emerald-100"
                                : "bg-slate-50 text-slate-400 border-[#E2E8F0] hover:bg-slate-100"
                            }`}
                            title={
                              sysState.S
                                ? `Đang áp dụng cho Hệ S (${rowGrade}). Nhấp để tắt.`
                                : `Không áp dụng cho Hệ S (${rowGrade}). Nhấp để bật.`
                            }
                          >
                            {sysState.S ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-[#059669] shrink-0" />
                                <span>Hệ S</span>
                              </>
                            ) : (
                              <span>—</span>
                            )}
                          </button>
                        </td>
                        <td className="py-1.5 px-2 text-center border-r border-[#E2E8F0]">
                          <button
                            type="button"
                            onClick={() => toggleMatrixCellSystem(subj.id, "I")}
                            className={`w-full py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                              sysState.I
                                ? "bg-teal-50 text-[#00736E] border-[#008B85]/40 hover:bg-teal-100"
                                : "bg-slate-50 text-slate-400 border-[#E2E8F0] hover:bg-slate-100"
                            }`}
                            title={
                              sysState.I
                                ? `Đang áp dụng cho Hệ I (${rowGrade}). Nhấp để tắt.`
                                : `Không áp dụng cho Hệ I (${rowGrade}). Nhấp để bật.`
                            }
                          >
                            {sysState.I ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-[#008B85] shrink-0" />
                                <span>Hệ I</span>
                              </>
                            ) : (
                              <span>—</span>
                            )}
                          </button>
                        </td>
                        {effectiveEvalPeriods.map(p => {
                          if (isKsdnEvaluationPeriod(p.code)) {
                            const { cfg: ksdnCfg, mappedFromSubj } = resolveKsdnConfigForSubjectInGrade(
                              subj,
                              rowGrade
                            )
                            const { shortLabel, fullTitle } = formatInternalConfigSummary(ksdnCfg)
                            const displayLabel = mappedFromSubj
                              ? `${mappedFromSubj.subjectName} (K5): ${shortLabel}`
                              : shortLabel
                            const displayTitle = mappedFromSubj
                              ? `Với Khối 6 KSĐN, môn khảo sát lấy ở Tiểu học của Khối 5 (${mappedFromSubj.subjectName}): ${fullTitle} — Nhấp để xem chi tiết`
                              : `${fullTitle} — Nhấp để xem chi tiết`
                            return (
                              <td
                                key={p.code}
                                className="py-1.5 px-2 text-center border-r border-[#E2E8F0] bg-[#F8FAFC]"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPeriod("KSĐN")
                                    handleOpenSubjectDetailFromMatrix(mappedFromSubj || subj, rowGrade)
                                  }}
                                  className={`w-full py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                                    ksdnCfg
                                      ? "bg-teal-50 text-[#003B3A] border-[#008B85]/40 hover:bg-teal-100"
                                      : "bg-white text-slate-400 border-[#E2E8F0] hover:bg-slate-50"
                                  }`}
                                  title={displayTitle}
                                >
                                  {ksdnCfg ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-[#008B85] shrink-0" />
                                      <span className="truncate max-w-[140px]">{displayLabel}</span>
                                    </>
                                  ) : (
                                    <span>Chưa gán ở 2. ĐG nội bộ</span>
                                  )}
                                </button>
                              </td>
                            )
                          }

                          const savedVnEduPeriodCfg = savedConfigs.find(
                            c => c.evaluationPeriod === p.code
                          )
                          const exactInternalPeriodCfg = findExactPeriodInternalOverrideConfig(internalConfigs, {
                            academicYearId,
                            program,
                            grade: rowGrade,
                            subjectId: subj.id,
                            evaluationPeriod: p.code,
                          })
                          const vnEduUpdatedAt = savedVnEduPeriodCfg?.updatedAt
                            ? new Date(savedVnEduPeriodCfg.updatedAt).getTime()
                            : 0
                          const internalUpdatedAt = exactInternalPeriodCfg?.updatedAt
                            ? new Date(exactInternalPeriodCfg.updatedAt).getTime()
                            : 0
                          const savedPeriodCfg =
                            exactInternalPeriodCfg && (!savedVnEduPeriodCfg || internalUpdatedAt > vnEduUpdatedAt)
                              ? exactInternalPeriodCfg
                              : savedVnEduPeriodCfg
                          const savedDefs = savedPeriodCfg
                            ? normalizeGradeColumnDefs(savedPeriodCfg).filter(
                                d => d.group !== "REMARK" && d.key !== "ratingValue"
                              )
                            : []
                          const isSavedInternalMode = Boolean(
                            savedPeriodCfg &&
                              p.code !== "CN" &&
                              ((savedPeriodCfg.configType || "VNEDU") === "INTERNAL" ||
                                (isRowPrimary
                                  ? savedPeriodCfg.hasCompositeColumn || savedDefs.length > 1
                                  : savedDefs.length > 0 &&
                                    !savedDefs.some(d => d.group === "GK" || d.group === "CK")))
                          )
                          const savedTxCount =
                            savedDefs.filter(d => d.group === "TX" && d.dataType === "NUMBER").length || 4

                          const hasNumericScore =
                            tt27KtMatrix[subj.id]?.[p.code] ??
                            (isRowPrimary
                              ? shouldPrimarySubjectHaveKtColumn(
                                  subj.subjectName || subj.subjectCode,
                                  rowGrade,
                                  p.code
                                )
                              : !isTt22CommentOnlySubject(subj.subjectName || subj.subjectCode))

                          const meta = getPrimaryPeriodMeta(p.code)
                          const isPeriodActive = tt27ActivePeriods.includes(p.code)

                          return (
                            <td
                              key={p.code}
                              className={`py-1.5 px-2 text-center border-r border-[#E2E8F0] ${
                                !isPeriodActive ? "opacity-40 bg-slate-50" : ""
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  toggleMatrixCellKt(subj.id, p.code)
                                  setPeriod(p.code)
                                  handleOpenSubjectDetailFromMatrix(subj, rowGrade)
                                }}
                                className={`w-full py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                                  isSavedInternalMode
                                    ? "bg-teal-50 text-[#003B3A] border-[#008B85] hover:bg-teal-100"
                                    : hasNumericScore
                                    ? "bg-emerald-50 text-[#059669] border-emerald-300 hover:bg-emerald-100"
                                    : "bg-slate-50 text-slate-700 border-[#E2E8F0] hover:bg-slate-100"
                                }`}
                                title={
                                  isRowPrimary
                                    ? "Nhấp để bật/tắt cột KT và mở Mẫu Sổ điểm chi tiết cho môn & kỳ này"
                                    : "Nhấp để chuyển đổi Điểm số / Nhận xét và mở Mẫu Sổ điểm chi tiết cho môn & kỳ này"
                                }
                              >
                                {isSavedInternalMode ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-[#008B85] shrink-0" />
                                    <span className="truncate max-w-[135px]">
                                      ĐG nội bộ ({savedDefs.length} cột) → {savedPeriodCfg?.compositeColumnName || "Điểm"}
                                    </span>
                                  </>
                                ) : isRowPrimary ? (
                                  hasNumericScore ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-[#059669] shrink-0" />
                                      <span>{meta.ktColumnLabel} + {meta.xlColumnLabel} + NX</span>
                                    </>
                                  ) : (
                                    <span>Chỉ {meta.xlColumnLabel} + NX</span>
                                  )
                                ) : p.code === "CN" ? (
                                  hasNumericScore ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-[#059669] shrink-0" />
                                      <span>TBHK1+2 → TB CN</span>
                                    </>
                                  ) : (
                                    <span>Đ/CĐ Cả năm + NX</span>
                                  )
                                ) : hasNumericScore ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-[#059669] shrink-0" />
                                    <span>{savedTxCount} cột TX + GK + CK → ĐTB</span>
                                  </>
                                ) : (
                                  <span>Nhận xét Đ/CĐ + NX</span>
                                )}
                              </button>
                            </td>
                          )
                        })}
                        <td className="py-2 px-2.5 text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleOpenSubjectDetailFromMatrix(subj, rowGrade)}
                              className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                                isInspected
                                  ? "bg-[#003B3A] text-white border-[#003B3A]"
                                  : "bg-teal-50/80 hover:bg-teal-100 text-[#003B3A] border-[#008B85]/30"
                              }`}
                            >
                              {isInspected ? "Đang chọn" : "Chọn mẫu"}
                            </button>
                            {savedConfigs.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const targetCfg =
                                    savedConfigs.find(c => c.evaluationPeriod === period) ||
                                    savedConfigs[0]
                                  if (targetCfg) handleViewHistory(targetCfg)
                                }}
                                className="px-2 py-1 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[11px] font-medium text-[#003B3A]"
                                title="Xem lịch sử phiên bản cấu hình"
                              >
                                <History className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteMatrixRowConfigs(subj, rowGrade)}
                              className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-[11px] font-medium text-[#E11D48]"
                              title={
                                savedConfigs.length > 0
                                  ? `Xóa ${savedConfigs.length} cấu hình đã lưu của môn ${subj.subjectName} (${rowGrade})`
                                  : `Bỏ chọn môn ${subj.subjectName} khỏi Ma trận`
                              }
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* KHUNG CHỌN MÔN & LƯU MẪU SỔ ĐIỂM CHI TIẾT VNEDU */}
        {(inspectedSubjectId || checkedMatrixSubjectIdsForCurrentGrade.length > 0 || subjectsShownInTt27Matrix.length > 0) && (
          <div className="border-2 border-[#008B85] rounded-2xl p-4 bg-white space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-[#003B3A] text-white text-xs font-bold">
                  Chọn Mẫu Sổ điểm chi tiết: {targetDetailSubjects.length === 1 ? targetDetailSubjects[0].subjectName : `${targetDetailSubjects.length} môn đã chọn`}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-teal-50 text-[#00736E] border border-teal-200 text-xs font-semibold">
                  Bậc {currentLevelMeta.shortLabel} • {grade} • Kỳ {period === "CN" ? "Cả năm (CN)" : period}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-600 mr-1">Chọn Kỳ:</span>
                {effectiveEvalPeriods.map(p => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setPeriod(p.code)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                      period === p.code
                        ? "bg-[#003B3A] text-white border-[#003B3A]"
                        : "bg-white text-slate-600 border-[#E2E8F0] hover:bg-slate-50"
                    }`}
                  >
                    {p.code}
                  </button>
                ))}
                {inspectedSubjectId && (
                  <button
                    type="button"
                    onClick={() => setInspectedSubjectId(null)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold ml-1"
                  >
                    <X className="w-3.5 h-3.5" /> Thu gọn
                  </button>
                )}
              </div>
            </div>

            {/* THANH CHỌN MÔN ÁP DỤNG MẪU SỔ ĐIỂM CHI TIẾT TRỰC TIẾP */}
            {subjectsShownInTt27Matrix.length > 0 && (
              <div className="bg-[#F0FDFA] border border-[#008B85]/30 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-[#003B3A] flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-[#008B85]" />
                    <span>
                      Chọn môn để lưu Mẫu Sổ điểm chi tiết ({targetDetailSubjects.length} môn đang áp dụng: {targetDetailSubjects.map(s => s.subjectName).join(", ") || "Chưa chọn"})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const allRowKeys = subjectsShownInTt27Matrix.map(s => `${s.id}::${grade}`)
                        setSelectedMatrixSubjectIds(allRowKeys)
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 text-[#003B3A] border border-[#008B85]/30 text-[11px] font-semibold"
                    >
                      Chọn hết {subjectsShownInTt27Matrix.length} môn trong Ma trận
                    </button>
                    {checkedMatrixSubjectIdsForCurrentGrade.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedMatrixSubjectIds([])}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-[#E11D48] border border-[#E2E8F0] text-[11px] font-medium"
                      >
                        Chỉ lưu 1 môn đang xem ({inspectedSubjectObj?.subjectName || "Môn đang chọn"})
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {subjectsShownInTt27Matrix.map(s => {
                    const isTargeted = targetDetailSubjectIds.includes(s.id)
                    const isFocused = inspectedSubjectId === s.id
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSubjectId(s.id)
                          setInspectedSubjectId(s.id)
                          if (checkedMatrixSubjectIdsForCurrentGrade.length > 0) {
                            handleToggleSubjectInDetailBar(s.id)
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                          isTargeted
                            ? "bg-[#003B3A] text-white border-[#003B3A] shadow-xs"
                            : isFocused
                            ? "bg-teal-50 text-[#003B3A] border-[#008B85]"
                            : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isTargeted}
                          onChange={(e) => {
                            e.stopPropagation()
                            handleToggleSubjectInDetailBar(s.id)
                          }}
                          className="rounded border-white/40 cursor-pointer"
                        />
                        <span>{s.subjectName}</span>
                        <span className={`text-[10px] font-mono ${isTargeted ? "text-teal-200" : "text-slate-400"}`}>
                          ({s.subjectCode})
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

        {/* GIAO DIỆN CHUYÊN BIỆT CHO BẬC TIỂU HỌC (KHỐI 1 - 5) & THCS/THPT (KHỐI 6 - 12) */}
        {isPrimary ? (
          <div className="space-y-4">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-[#003B3A]">
                    Chọn Mẫu Sổ nhận xét vnEdu Tiểu học áp dụng cho {targetDetailSubjects.length === 1 ? `môn ${targetDetailSubjects[0].subjectName}` : `${targetDetailSubjects.length} môn đã chọn`} ({grade}) • {primaryMeta.semesterLabel} ({primaryMeta.periodShortLabel})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Bạn có thể chọn <strong>Có cột {primaryMeta.ktColumnLabel}</strong>, <strong>Chỉ Nhận xét &amp; {primaryMeta.xlColumnLabel}</strong> hoặc <strong>Đánh giá nội bộ Sky-Line</strong> linh động cho kỳ <strong>{period}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedColumns(prev => !prev)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-600"
                >
                  <Sliders className="w-3 h-3" />
                  {showAdvancedColumns ? "Ẩn bảng cột chi tiết" : "Tùy chỉnh cột nâng cao"}
                </button>
              </div>

              {/* 3 Thẻ chọn nhanh cấu trúc chuẩn vnEdu Tiểu học & Đánh giá nội bộ Sky-Line */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => applyPrimaryStructureMode("WITH_KT")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    editorStructureMode === "WITH_KT"
                      ? "bg-teal-50/70 border-[#008B85] ring-2 ring-[#008B85]/15"
                      : "bg-white border-[#E2E8F0] hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-[#003B3A]">
                      1. Có điểm Kiểm tra định kỳ ({primaryMeta.remarkColumnLabel} + {primaryMeta.ktColumnLabel} + {primaryMeta.xlColumnLabel})
                    </span>
                    {editorStructureMode === "WITH_KT" && <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Bật cột điểm <strong>{primaryMeta.ktColumnLabel}</strong> (thang 10) đi kèm <strong>{primaryMeta.xlColumnLabel}</strong> và <strong>{primaryMeta.remarkColumnLabel}</strong> cho kỳ {period}.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => applyPrimaryStructureMode("REMARK_ONLY")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    editorStructureMode === "REMARK_ONLY"
                      ? "bg-teal-50/70 border-[#008B85] ring-2 ring-[#008B85]/15"
                      : "bg-white border-[#E2E8F0] hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-[#003B3A]">
                      2. Chỉ Nhận xét &amp; Xếp loại ({primaryMeta.remarkColumnLabel} + {primaryMeta.xlColumnLabel})
                    </span>
                    {editorStructureMode === "REMARK_ONLY" && <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Không hiển thị cột điểm KT ở kỳ {period}; chỉ nhập <strong>{primaryMeta.xlColumnLabel}</strong> (T / H / C) và <strong>{primaryMeta.remarkColumnLabel}</strong>.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => applyInternalSkylineStructureMode("FROM_SAVED")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    editorStructureMode === "INTERNAL_SKL"
                      ? "bg-teal-50/70 border-[#008B85] ring-2 ring-[#008B85]/15"
                      : "bg-white border-[#E2E8F0] hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-[#003B3A]">
                      3. Đánh giá nội bộ Sky-Line (Cột điểm thành phần + Tổng hợp + Nhận xét)
                    </span>
                    {editorStructureMode === "INTERNAL_SKL" && <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Kế thừa cấu trúc cột điểm thành phần &amp; công thức từ <strong>2. Đánh giá nội bộ Sky-Line</strong> (phù hợp cho kỳ KSĐN, môn Song ngữ, ESL, Toán Tiếng Anh, Khoa học...).
                  </p>
                </button>
              </div>

              {/* Thanh chọn nhanh mẫu Đánh giá nội bộ Sky-Line khi đang chọn Thẻ 3 */}
              {editorStructureMode === "INTERNAL_SKL" && (
                <div className="bg-white border border-[#008B85]/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-[#003B3A] text-[11px]">Mẫu cột Đánh giá nội bộ Sky-Line:</span>
                    <button
                      type="button"
                      onClick={() => applyInternalSkylineStructureMode("FROM_SAVED")}
                      className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200 text-[11px] font-semibold"
                    >
                      Theo cấu hình đã lưu ở 2. ĐG nội bộ
                    </button>
                    <button
                      type="button"
                      onClick={() => applyInternalSkylineStructureMode("2_COL")}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] text-[11px] font-medium"
                    >
                      Mẫu 2 cột (Trắc nghiệm + Tự luận)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyInternalSkylineStructureMode("3_COL")}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] text-[11px] font-medium"
                    >
                      Mẫu 3 cột điểm
                    </button>
                    <button
                      type="button"
                      onClick={() => applyInternalSkylineStructureMode("BILINGUAL")}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] text-[11px] font-medium"
                    >
                      Mẫu Song ngữ (English + Vietnamese)
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedColumns(true)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
                    >
                      Sửa tên cột trực tiếp ({columns.length} cột)
                    </button>
                    {onSwitchToInternalConfig && (
                      <button
                        type="button"
                        onClick={() =>
                          onSwitchToInternalConfig(
                            grade,
                            period,
                            selectedSubjectIds.length === 1 ? selectedSubjectIds[0] : subjectId || undefined
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-[#003B3A] hover:bg-[#002b2a] text-white text-[11px] font-semibold"
                      >
                        Mở 2. Đánh giá nội bộ Sky-Line
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Xem trước trực quan Sổ điểm chi tiết vnEdu Tiểu học hoặc Đánh giá nội bộ Sky-Line */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-700">
                  {editorStructureMode === "INTERNAL_SKL"
                    ? `Xem trước bố cục Sổ điểm Đánh giá nội bộ Sky-Line (${grade} • ${period}):`
                    : `Xem trước bố cục Sổ điểm chi tiết vnEdu Tiểu học (${grade} • ${period}):`}
                </div>
                <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
                  {editorStructureMode === "INTERNAL_SKL" ? (
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-[#003B3A] text-white">
                        <tr className="text-[11px] font-semibold whitespace-nowrap">
                          <th className="py-2 px-3 w-12 text-center border-r border-white/15">STT</th>
                          <th className="py-2 px-3 w-24 text-center border-r border-white/15 text-teal-100">Mã HS</th>
                          <th colSpan={2} className="py-2 px-3 text-center border-r border-white/15">Họ và tên</th>
                          <th className="py-2 px-3 w-28 text-center border-r border-white/15 text-teal-100">Ngày sinh</th>
                          {columns.map((col, idx) => (
                            <th key={col.key || idx} className="py-2 px-3 text-center border-r border-white/15 text-teal-100">
                              {col.label || `Cột ${idx + 1}`}
                            </th>
                          ))}
                          {hasCompositeColumn && (
                            <th className="py-2 px-3 w-24 text-center border-r border-white/15 text-[#5EEAD4]">
                              {compositeColumnName || "Điểm"}
                            </th>
                          )}
                          {hasRemarkColumn && (
                            <th className="py-2 px-4 text-center">Nhận xét</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] text-xs tabular-nums">
                        <tr className="text-slate-700">
                          <td className="py-2 px-3 text-center border-r border-[#E2E8F0]">1</td>
                          <td className="py-2 px-3 text-center font-mono text-[11px] border-r border-[#E2E8F0]">HS04001</td>
                          <td className="py-2 px-3 font-medium border-r border-slate-100 w-32">Tạ Khải</td>
                          <td className="py-2 px-3 font-bold text-slate-900 border-r border-[#E2E8F0] w-16">An</td>
                          <td className="py-2 px-3 text-center border-r border-[#E2E8F0]">11/08/2020</td>
                          {columns.map((col, idx) => (
                            <td key={col.key || idx} className="py-2 px-3 text-center font-semibold text-slate-800 border-r border-[#E2E8F0]">
                              {[8.5, 9.0, 9.5, 8.8][idx % 4]}
                            </td>
                          ))}
                          {hasCompositeColumn && (
                            <td className="py-2 px-3 text-center font-bold text-[#059669] bg-emerald-50/40 border-r border-[#E2E8F0]">
                              8.8
                            </td>
                          )}
                          {hasRemarkColumn && (
                            <td className="py-2 px-3 text-slate-500 italic">
                              Nắm vững kiến thức, kỹ năng môn học; hoàn thành tốt bài tập.
                            </td>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-[#003B3A] text-white">
                        <tr className="text-[11px] font-semibold whitespace-nowrap">
                          <th className="py-2 px-3 w-12 text-center border-r border-white/15">STT</th>
                          <th colSpan={2} className="py-2 px-3 text-center border-r border-white/15">Họ và tên</th>
                          <th className="py-2 px-3 w-28 text-center border-r border-white/15 text-teal-100">Ngày sinh</th>
                          <th className="py-2 px-4 text-center border-r border-white/15">{primaryMeta.remarkColumnLabel}</th>
                          {editorStructureMode === "WITH_KT" && (
                            <th className="py-2 px-3 w-20 text-center border-r border-white/15 text-[#5EEAD4]">
                              {primaryMeta.ktColumnLabel}
                            </th>
                          )}
                          <th className="py-2 px-3 w-20 text-center text-[#5EEAD4]">
                            {ratingColumnName || primaryMeta.xlColumnLabel}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] text-xs tabular-nums">
                        <tr className="text-slate-700">
                          <td className="py-2 px-3 text-center border-r border-[#E2E8F0]">1</td>
                          <td className="py-2 px-3 font-medium border-r border-slate-100 w-36">Tạ Khải</td>
                          <td className="py-2 px-3 font-bold text-slate-900 border-r border-[#E2E8F0] w-20">An</td>
                          <td className="py-2 px-3 text-center border-r border-[#E2E8F0]">11/08/2020</td>
                          <td className="py-2 px-3 text-slate-500 italic border-r border-[#E2E8F0]">
                            Nắm vững kiến thức, kỹ năng môn học; hoàn thành tốt bài tập.
                          </td>
                          {editorStructureMode === "WITH_KT" && (
                            <td className="py-2 px-3 text-center font-bold text-[#059669] border-r border-[#E2E8F0]">9</td>
                          )}
                          <td className="py-2 px-3 text-center font-bold text-[#059669]">T</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-[#003B3A]">
                    Chọn Mẫu Sổ điểm chi tiết vnEdu THCS &amp; THPT áp dụng cho {targetDetailSubjects.length === 1 ? `môn ${targetDetailSubjects[0].subjectName}` : `${targetDetailSubjects.length} môn đã chọn`} • {grade} ({period === "CN" ? "Học kỳ: Cả năm" : period})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {period === "CN" ? (
                      <>
                        Chế độ <strong>Học kỳ Cả năm (CN)</strong> trên vnEdu gồm: <strong>TBHK 1 | TBHK 2 | TB Cả năm | Điểm thi lại | Ghi chú | Nhận xét</strong> (hỗ trợ nút Copy nhận xét học kỳ 2).
                      </>
                    ) : (
                      <>
                        Theo Điều 5, 6, 7 Thông tư 22: Môn tính điểm gồm <strong>ĐĐGtx (TX1..TX4) + ĐĐGgk (hệ số 2) + ĐĐGck (hệ số 3) + ĐTBmhk + Nhận xét</strong>, Môn nhận xét đánh giá <strong>Đ / CĐ</strong>, hoặc áp dụng <strong>Đánh giá nội bộ Sky-Line</strong>.
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Chuyển nhanh giữa Học kỳ 1/2 và Học kỳ Cả năm */}
                  <div className="inline-flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-lg p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPeriod("CK1")}
                      className={`px-2 py-1 rounded font-semibold transition-colors ${
                        period === "GK1" || period === "CK1"
                          ? "bg-[#003B3A] text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Học kỳ 1
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriod("CK2")}
                      className={`px-2 py-1 rounded font-semibold transition-colors ${
                        period === "GK2" || period === "CK2"
                          ? "bg-[#003B3A] text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Học kỳ 2
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriod("CN")}
                      className={`px-2 py-1 rounded font-semibold transition-colors ${
                        period === "CN"
                          ? "bg-[#003B3A] text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Cả năm (CN)
                    </button>
                  </div>

                  {period !== "CN" && editorStructureMode !== "INTERNAL_SKL" && (
                    <div className="inline-flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-lg px-2 py-1 text-[11px]">
                      <span className="font-semibold text-slate-600">Số cột ĐĐGtx:</span>
                      {[2, 3, 4].map(cnt => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() =>
                            applySecondaryTt22StructureMode(
                              secondaryIsCommentOnlyInEditor ? "RATING_DAT" : "SCORE_10",
                              cnt
                            )
                          }
                          className={`px-2 py-0.5 rounded font-bold transition-colors ${
                            secondaryTxCountInEditor === cnt
                              ? "bg-[#003B3A] text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {cnt} cột
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowAdvancedColumns(prev => !prev)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-600"
                  >
                    <Sliders className="w-3 h-3" />
                    {showAdvancedColumns ? "Ẩn bảng cột chi tiết" : "Tùy chỉnh cột nâng cao"}
                  </button>
                </div>
              </div>

              {/* 3 Thẻ chọn nhanh cấu trúc chuẩn Thông tư 22 (THCS & THPT) & Đánh giá nội bộ Sky-Line */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => applySecondaryTt22StructureMode("SCORE_10", 4)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    editorStructureMode === "SCORE_10"
                      ? "bg-teal-50/70 border-[#008B85] ring-2 ring-[#008B85]/15"
                      : "bg-white border-[#E2E8F0] hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-[#003B3A]">
                      {period === "CN"
                        ? "1. Môn đánh giá bằng Điểm số — Học kỳ Cả năm (TBHK 1 + TBHK 2 + TB Cả năm + Điểm thi lại + Ghi chú + Nhận xét)"
                        : "1. Môn đánh giá bằng Điểm số kết hợp Nhận xét (ĐĐGtx + ĐĐGgk + ĐĐGck + ĐTBmhk)"}
                    </span>
                    {editorStructureMode === "SCORE_10" && <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {period === "CN" ? (
                      <>
                        Dùng cho <strong>Toán, Ngữ văn, Ngoại ngữ, KHTN, Vật lí, Hóa học, Sinh học, Lịch sử, Địa lí, GDCD/GDKT&amp;PL, Tin học, Công nghệ, GDQP&amp;AN</strong>. Tự động tính <strong>TB Cả năm = (TBHK 1 + 2 × TBHK 2) / 3</strong>.
                      </>
                    ) : (
                      <>
                        Dùng cho <strong>Toán, Ngữ văn, Ngoại ngữ, KHTN (Lý, Hóa, Sinh), Lịch sử &amp; Địa lý, GDCD/GDKT&amp;PL, Tin học, Công nghệ, GDQP&amp;AN</strong>. Sau khi có điểm thi học kỳ (ĐĐGck) hệ thống tự tính <strong>ĐTBmhk</strong>.
                      </>
                    )}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => applySecondaryTt22StructureMode("RATING_DAT", 2)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    editorStructureMode === "RATING_DAT"
                      ? "bg-teal-50/70 border-[#008B85] ring-2 ring-[#008B85]/15"
                      : "bg-white border-[#E2E8F0] hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-[#003B3A]">
                      {period === "CN"
                        ? "2. Môn đánh giá bằng Nhận xét (Đ/CĐ) — Học kỳ Cả năm (TBHK 1 + TBHK 2 + TB Cả năm + Điểm thi lại + Ghi chú + Nhận xét)"
                        : "2. Môn đánh giá bằng Nhận xét (Đ - Đạt / CĐ - Chưa đạt + Nhận xét)"}
                    </span>
                    {editorStructureMode === "RATING_DAT" && <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Dùng cho <strong>Giáo dục thể chất, Nghệ thuật (Âm nhạc, Mỹ thuật), Hoạt động trải nghiệm - hướng nghiệp, Nội dung giáo dục của địa phương</strong> và các môn nhận xét Đặc thù Sky-Line theo Thông tư 22.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => applyInternalSkylineStructureMode("FROM_SAVED")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    editorStructureMode === "INTERNAL_SKL"
                      ? "bg-teal-50/70 border-[#008B85] ring-2 ring-[#008B85]/15"
                      : "bg-white border-[#E2E8F0] hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-[#003B3A]">
                      3. Đánh giá nội bộ Sky-Line (Cột điểm thành phần + Tổng hợp + Nhận xét)
                    </span>
                    {editorStructureMode === "INTERNAL_SKL" && <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Kế thừa cấu trúc cột điểm thành phần &amp; công thức từ <strong>2. Đánh giá nội bộ Sky-Line</strong> (phù hợp cho kỳ KSĐN, môn Đặc thù Sky-Line, Song ngữ &amp; Quốc tế...).
                  </p>
                </button>
              </div>

              {editorStructureMode === "INTERNAL_SKL" && (
                <div className="bg-white border border-[#008B85]/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-[#003B3A] text-[11px]">Mẫu cột Đánh giá nội bộ Sky-Line:</span>
                    <button
                      type="button"
                      onClick={() => applyInternalSkylineStructureMode("FROM_SAVED")}
                      className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200 text-[11px] font-semibold"
                    >
                      Theo cấu hình đã lưu ở 2. ĐG nội bộ
                    </button>
                    <button
                      type="button"
                      onClick={() => applyInternalSkylineStructureMode("2_COL")}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] text-[11px] font-medium"
                    >
                      Mẫu 2 cột (Trắc nghiệm + Tự luận)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyInternalSkylineStructureMode("3_COL")}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] text-[11px] font-medium"
                    >
                      Mẫu 3 cột điểm
                    </button>
                    <button
                      type="button"
                      onClick={() => applyInternalSkylineStructureMode("BILINGUAL")}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] text-[11px] font-medium"
                    >
                      Mẫu Song ngữ (English + Vietnamese)
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedColumns(true)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
                    >
                      Sửa tên cột trực tiếp ({columns.length} cột)
                    </button>
                    {onSwitchToInternalConfig && (
                      <button
                        type="button"
                        onClick={() =>
                          onSwitchToInternalConfig(
                            grade,
                            period,
                            selectedSubjectIds.length === 1 ? selectedSubjectIds[0] : subjectId || undefined
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-[#003B3A] hover:bg-[#002b2a] text-white text-[11px] font-semibold"
                      >
                        Mở 2. Đánh giá nội bộ Sky-Line
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Xem trước trực quan Sổ điểm chi tiết vnEdu THCS/THPT hoặc Đánh giá nội bộ Sky-Line */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-700">
                  {editorStructureMode === "INTERNAL_SKL"
                    ? `Xem trước bố cục Sổ điểm Đánh giá nội bộ Sky-Line (${grade} • ${period}):`
                    : `Xem trước bố cục Sổ điểm chi tiết vnEdu THCS & THPT (${grade} • ${period === "CN" ? "Cả năm" : period}):`}
                </div>
                <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
                  {editorStructureMode === "INTERNAL_SKL" ? (
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-[#003B3A] text-white">
                        <tr className="text-[11px] font-semibold whitespace-nowrap">
                          <th className="py-2 px-3 w-12 text-center border-r border-white/15">STT</th>
                          <th className="py-2 px-3 w-24 text-center border-r border-white/15 text-teal-100">Mã HS</th>
                          <th colSpan={2} className="py-2 px-3 text-center border-r border-white/15">Họ và tên</th>
                          <th className="py-2 px-3 w-28 text-center border-r border-white/15 text-teal-100">Ngày sinh</th>
                          {columns.map((col, idx) => (
                            <th key={col.key || idx} className="py-2 px-3 text-center border-r border-white/15 text-teal-100">
                              {col.label || `Cột ${idx + 1}`}
                            </th>
                          ))}
                          {hasCompositeColumn && (
                            <th className="py-2 px-3 w-24 text-center border-r border-white/15 text-[#5EEAD4]">
                              {compositeColumnName || "Điểm"}
                            </th>
                          )}
                          {hasRemarkColumn && (
                            <th className="py-2 px-4 text-center">Nhận xét</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] text-xs tabular-nums">
                        <tr className="text-slate-700">
                          <td className="py-2 px-3 text-center border-r border-[#E2E8F0]">1</td>
                          <td className="py-2 px-3 text-center font-mono text-[11px] border-r border-[#E2E8F0]">2101775112</td>
                          <td className="py-2 px-3 font-medium border-r border-slate-100 w-32">Nguyễn Quỳnh</td>
                          <td className="py-2 px-3 font-bold text-slate-900 border-r border-[#E2E8F0] w-16">Anh</td>
                          <td className="py-2 px-3 text-center border-r border-[#E2E8F0]">28/05/2015</td>
                          {columns.map((col, idx) => (
                            <td key={col.key || idx} className="py-2 px-3 text-center font-semibold text-slate-800 border-r border-[#E2E8F0]">
                              {[8.5, 9.0, 9.5, 8.8][idx % 4]}
                            </td>
                          ))}
                          {hasCompositeColumn && (
                            <td className="py-2 px-3 text-center font-bold text-[#059669] bg-emerald-50/40 border-r border-[#E2E8F0]">
                              8.8
                            </td>
                          )}
                          {hasRemarkColumn && (
                            <td className="py-2 px-3 text-slate-500 italic">
                              Chăm học, nắm vững kiến thức cơ bản và vận dụng tốt vào bài tập.
                            </td>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  ) : period === "CN" ? (
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-[#003B3A] text-white">
                        <tr className="text-[11px] font-semibold whitespace-nowrap">
                          <th className="py-2.5 px-2.5 w-10 text-center border-r border-white/15">STT</th>
                          <th className="py-2.5 px-3 w-24 text-center border-r border-white/15 text-teal-100">Mã HS</th>
                          <th colSpan={2} className="py-2.5 px-3 text-center border-r border-white/15">Họ và tên</th>
                          <th className="py-2.5 px-2.5 w-24 text-center border-r border-white/15 text-teal-100">Ngày sinh</th>
                          <th className="py-2.5 px-3 w-20 text-center border-r border-white/15 text-[#5EEAD4]">TBHK 1</th>
                          <th className="py-2.5 px-3 w-20 text-center border-r border-white/15 text-[#5EEAD4]">TBHK 2</th>
                          <th className="py-2.5 px-3 w-24 text-center border-r border-white/15 text-[#5EEAD4]">TB Cả năm</th>
                          <th className="py-2.5 px-3 w-24 text-center border-r border-white/15 text-teal-100">Điểm thi lại</th>
                          <th className="py-2.5 px-3 w-28 text-center border-r border-white/15 text-teal-100">Ghi chú</th>
                          <th className="py-2.5 px-4 text-center">Nhận xét</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] text-xs tabular-nums">
                        <tr className="text-slate-700">
                          <td className="py-2 px-2.5 text-center border-r border-[#E2E8F0]">1</td>
                          <td className="py-2 px-2.5 text-center font-mono text-[11px] border-r border-[#E2E8F0]">2004128003</td>
                          <td className="py-2 px-2.5 font-medium border-r border-slate-100 w-32">Nguyễn Tuấn</td>
                          <td className="py-2 px-2.5 font-bold text-slate-900 border-r border-[#E2E8F0] w-16">Anh</td>
                          <td className="py-2 px-2.5 text-center border-r border-[#E2E8F0]">05/06/2009</td>
                          <td className="py-2 px-2 text-center font-semibold text-slate-800 border-r border-[#E2E8F0]">
                            {secondaryIsCommentOnlyInEditor ? "Đ" : "8.5"}
                          </td>
                          <td className="py-2 px-2 text-center font-semibold text-slate-800 border-r border-[#E2E8F0]">
                            {secondaryIsCommentOnlyInEditor ? "Đ" : "8.8"}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-[#059669] bg-emerald-50/40 border-r border-[#E2E8F0]">
                            {secondaryIsCommentOnlyInEditor ? "Đ" : "8.7"}
                          </td>
                          <td className="py-2 px-2 text-center text-slate-400 border-r border-[#E2E8F0]">-</td>
                          <td className="py-2 px-2 text-center text-slate-400 border-r border-[#E2E8F0]">-</td>
                          <td className="py-2 px-3 text-slate-500 italic">
                            Hoàn thành tốt chương trình môn học cả năm; có ý thức tự học và vận dụng hiệu quả.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-[#003B3A] text-white">
                        <tr className="text-[11px] font-semibold whitespace-nowrap">
                          <th rowSpan={2} className="py-2 px-2.5 w-10 text-center border-r border-white/15">STT</th>
                          <th rowSpan={2} className="py-2 px-3 w-24 text-center border-r border-white/15 text-teal-100">Mã HS</th>
                          <th rowSpan={2} colSpan={2} className="py-2 px-3 text-center border-r border-white/15">Họ và tên</th>
                          <th rowSpan={2} className="py-2 px-2.5 w-24 text-center border-r border-white/15 text-teal-100">Ngày sinh</th>
                          <th
                            colSpan={secondaryTxCountInEditor}
                            className="py-1.5 px-2 text-center border-r border-b border-white/15 text-[#5EEAD4]"
                          >
                            ĐĐGtx
                          </th>
                          <th rowSpan={2} className="py-2 px-2.5 w-16 text-center border-r border-white/15 text-[#5EEAD4]">
                            ĐĐGgk
                          </th>
                          <th rowSpan={2} className="py-2 px-2.5 w-16 text-center border-r border-white/15 text-[#5EEAD4]">
                            ĐĐGck
                          </th>
                          <th rowSpan={2} className="py-2 px-2.5 w-16 text-center border-r border-white/15 text-[#5EEAD4]">
                            {compositeColumnName || "ĐTBmhk"}
                          </th>
                          <th rowSpan={2} className="py-2 px-4 text-center">Nhận xét</th>
                        </tr>
                        <tr className="text-[11px] font-semibold whitespace-nowrap bg-[#002b2a]">
                          {Array.from({ length: secondaryTxCountInEditor }, (_, idx) => (
                            <th key={idx} className="py-1 px-2 w-12 text-center border-r border-white/15 text-teal-100">
                              TX{idx + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] text-xs tabular-nums">
                        <tr className="text-slate-700">
                          <td className="py-2 px-2.5 text-center border-r border-[#E2E8F0]">1</td>
                          <td className="py-2 px-2.5 text-center font-mono text-[11px] border-r border-[#E2E8F0]">2101775112</td>
                          <td className="py-2 px-2.5 font-medium border-r border-slate-100 w-32">Nguyễn Quỳnh</td>
                          <td className="py-2 px-2.5 font-bold text-slate-900 border-r border-[#E2E8F0] w-16">Anh</td>
                          <td className="py-2 px-2.5 text-center border-r border-[#E2E8F0]">28/05/2015</td>
                          {Array.from({ length: secondaryTxCountInEditor }, (_, idx) => (
                            <td key={idx} className="py-2 px-2 text-center font-semibold text-slate-800 border-r border-[#E2E8F0]">
                              {secondaryIsCommentOnlyInEditor ? (idx < 2 ? "Đ" : "") : [8.5, 9.0, 8.0, 9.5][idx]}
                            </td>
                          ))}
                          <td className="py-2 px-2 text-center font-semibold text-[#003B3A] border-r border-[#E2E8F0]">
                            {secondaryIsCommentOnlyInEditor ? "Đ" : "8.5"}
                          </td>
                          <td className="py-2 px-2 text-center font-semibold text-[#003B3A] border-r border-[#E2E8F0]">
                            {secondaryIsCommentOnlyInEditor ? "Đ" : "9.0"}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-[#059669] bg-emerald-50/40 border-r border-[#E2E8F0]">
                            {secondaryIsCommentOnlyInEditor ? "Đ" : "8.8"}
                          </td>
                          <td className="py-2 px-3 text-slate-500 italic">
                            Chăm học, nắm vững kiến thức cơ bản và vận dụng tốt vào bài tập.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Columns Builder (Khi bật Tùy chỉnh cột nâng cao) */}
        {showAdvancedColumns && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Danh sách cột điểm số ({columns.length} cột — cho phép 0 cột nếu chỉ có Xếp loại/Nhận xét)
              </span>
              <button
                type="button"
                onClick={handleAddColumn}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-50 text-[#003B3A] border border-teal-200 hover:bg-teal-100 rounded-lg text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm cột
              </button>
            </div>

            {columns.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#003B3A] text-white">
                    <tr className="text-[11px] font-semibold whitespace-nowrap">
                      <th className="py-2.5 px-3">Mã trường</th>
                      <th className="py-2.5 px-3">Tên hiển thị</th>
                      <th className="py-2.5 px-3 text-teal-100">Nhóm</th>
                      <th className="py-2.5 px-3 text-teal-100">Lần</th>
                      <th className="py-2.5 px-3">Kiểu dữ liệu</th>
                      <th className="py-2.5 px-3 text-teal-100">Thang / Tối đa</th>
                      <th className="py-2.5 px-3 text-teal-100">Alias tiêu đề Excel (phân tách ;)</th>
                      <th className="py-2.5 px-3 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] tabular-nums">
                    {columns.map((col, idx) => (
                      <tr key={col.key} className="align-middle hover:bg-[#F8FAFC]">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={col.key}
                            onChange={(e) => {
                              const next = [...columns]
                              next[idx] = { ...col, key: e.target.value }
                              setColumns(next)
                            }}
                            className="w-24 border border-[#E2E8F0] rounded px-2 py-1 font-mono text-[11px]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={col.label}
                            onChange={(e) => {
                              const next = [...columns]
                              next[idx] = { ...col, label: e.target.value }
                              setColumns(next)
                            }}
                            className="w-28 border border-[#E2E8F0] rounded px-2 py-1 font-medium"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={col.group}
                            onChange={(e) => {
                              const next = [...columns]
                              next[idx] = { ...col, group: e.target.value as any }
                              setColumns(next)
                            }}
                            className="border border-[#E2E8F0] rounded px-2 py-1 bg-white"
                          >
                            <option value="TX">TX</option>
                            <option value="GK">GK</option>
                            <option value="CK">CK</option>
                            <option value="RATING">Xếp loại</option>
                            <option value="OTHER">Khác</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min={1}
                            value={col.attempt ?? ""}
                            onChange={(e) => {
                              const next = [...columns]
                              next[idx] = { ...col, attempt: e.target.value ? Number(e.target.value) : null }
                              setColumns(next)
                            }}
                            className="w-14 border border-[#E2E8F0] rounded px-2 py-1 text-center"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={col.dataType}
                            onChange={(e) => {
                              const dt = e.target.value as any
                              const next = [...columns]
                              next[idx] = {
                                ...col,
                                dataType: dt,
                                scaleCode: dt === "RATING" ? "RATING_DAT" : dt === "TEXT" ? "TEXT" : "SCORE_10",
                                maxScore: dt === "NUMBER" ? 10 : null,
                              }
                              setColumns(next)
                            }}
                            className="border border-[#E2E8F0] rounded px-2 py-1 bg-white"
                          >
                            <option value="NUMBER">Điểm số</option>
                            <option value="RATING">Mức đánh giá (Đ/CĐ, T/H/C)</option>
                            <option value="TEXT">Văn bản</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          {col.dataType === "NUMBER" ? (
                            <input
                              type="number"
                              value={col.maxScore ?? 10}
                              onChange={(e) => {
                                const next = [...columns]
                                next[idx] = { ...col, maxScore: Number(e.target.value) || 10 }
                                setColumns(next)
                              }}
                              className="w-16 border border-[#E2E8F0] rounded px-2 py-1 text-center"
                            />
                          ) : (
                            <span className="text-slate-500">{col.dataType === "RATING" ? "Đ, CĐ, T, H, C" : "Văn bản"}</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={(col.aliases || []).join("; ")}
                            onChange={(e) => {
                              const next = [...columns]
                              next[idx] = {
                                ...col,
                                aliases: e.target.value.split(";").map(s => s.trim()).filter(Boolean),
                              }
                              setColumns(next)
                            }}
                            placeholder="KT CK1; Điểm KTĐK"
                            className="w-44 border border-[#E2E8F0] rounded px-2 py-1 text-[11px]"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setColumns(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Extra structural toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0] text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasRatingColumn}
                  onChange={(e) => setHasRatingColumn(e.target.checked)}
                />
                <span className="font-medium text-slate-800">Có cột Xếp loại:</span>
                <input
                  type="text"
                  value={ratingColumnName}
                  onChange={(e) => setRatingColumnName(e.target.value)}
                  disabled={!hasRatingColumn}
                  className="w-28 border border-[#E2E8F0] rounded px-2 py-1 bg-white disabled:opacity-50"
                />
              </label>
              {(!isPrimary || editorStructureMode === "INTERNAL_SKL") && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCompositeColumn}
                    onChange={(e) => setHasCompositeColumn(e.target.checked)}
                  />
                  <span className="font-medium text-slate-800">Có cột Tổng hợp:</span>
                  <input
                    type="text"
                    value={compositeColumnName}
                    onChange={(e) => setCompositeColumnName(e.target.value)}
                    disabled={!hasCompositeColumn}
                    className="w-28 border border-[#E2E8F0] rounded px-2 py-1 bg-white disabled:opacity-50"
                  />
                </label>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasRemarkColumn}
                  onChange={(e) => setHasRemarkColumn(e.target.checked)}
                />
                <span className="font-medium text-slate-800">
                  Có cột {isPrimary ? primaryMeta.remarkColumnLabel : "Nhận xét"}
                </span>
              </label>
            </div>
          </div>
        )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E2E8F0]">
              <input
                type="text"
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder="Ghi chú thay đổi phiên bản (tùy chọn)..."
                className="flex-1 min-w-[240px] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs"
              />
              <div className="flex items-center gap-2 flex-wrap">
                {!isCurrentPeriodKsdn && period !== "CN" && (
                  <button
                    type="button"
                    disabled={saving || targetDetailSubjectIds.length === 0}
                    onClick={() => handleSaveConfig("SELECTED_PERIODS")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#059669] hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    {saving
                      ? "Đang lưu..."
                      : `Lưu Mẫu Sổ điểm cho các kỳ (${
                          tt27ActivePeriods
                            .filter(p => !isKsdnEvaluationPeriod(p) && p !== "CN")
                            .join(", ") || "GK1, CK1, GK2, CK2"
                        })`}
                  </button>
                )}
                <button
                  type="button"
                  disabled={saving || targetDetailSubjectIds.length === 0}
                  onClick={() => handleSaveConfig("CURRENT_PERIOD")}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#003B3A] hover:bg-[#002b2a] text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 text-[#5EEAD4]" />
                  {saving
                    ? "Đang lưu..."
                    : targetDetailSubjects.length === 1
                    ? `Lưu Mẫu Sổ điểm cho môn ${targetDetailSubjects[0].subjectName} (${grade} • ${period})`
                    : `Lưu Mẫu Sổ điểm cho ${targetDetailSubjects.length} môn đã chọn (${grade} • ${period})`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Version History Modal */}
      {historyModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="bg-[#003B3A] text-white px-5 py-3.5 flex items-center justify-between">
              <h4 className="text-sm font-bold">Lịch sử phiên bản: {historyModal.title}</h4>
              <button type="button" onClick={() => setHistoryModal({ open: false, title: "", versions: [] })}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3 text-xs">
              {historyModal.versions.map(v => (
                <div key={v.id} className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>Phiên bản v{v.version}</span>
                    <span className="text-slate-500 font-normal">{new Date(v.createdAt).toLocaleString("vi-VN")}</span>
                  </div>
                  <div className="text-slate-600">Người sửa: {v.changedByName || "Quản trị viên"}</div>
                  {v.changeNote && <div className="text-slate-700">Ghi chú: {v.changeNote}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Batch Copy Modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="bg-[#003B3A] text-white px-5 py-3.5 flex items-center justify-between">
              <h4 className="text-sm font-bold">Sao chép &amp; Áp dụng hàng loạt cấu hình vnEdu (Có xem trước)</h4>
              <button type="button" onClick={() => setBatchModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <p className="text-slate-600">
                Hệ thống sẽ <strong>không ghi đè</strong> các cấu hình riêng đã xác nhận và không sao chép cột điểm Khối 3–5 sang Tiếng Anh Khối 1–2.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Chọn Khối đích</label>
                  <div className="max-h-40 overflow-y-auto border border-[#E2E8F0] rounded-xl p-2 space-y-1">
                    {grades.map(g => (
                      <label key={g} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={batchTargetGrades.includes(g)}
                          onChange={(e) =>
                            setBatchTargetGrades(prev => e.target.checked ? [...prev, g] : prev.filter(x => x !== g))
                          }
                        />
                        <span>{g}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Chọn Kỳ đích</label>
                  <div className="max-h-40 overflow-y-auto border border-[#E2E8F0] rounded-xl p-2 space-y-1">
                    {evalPeriods.map(p => (
                      <label key={p.code} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={batchTargetPeriods.includes(p.code)}
                          onChange={(e) =>
                            setBatchTargetPeriods(prev => e.target.checked ? [...prev, p.code] : prev.filter(x => x !== p.code))
                          }
                        />
                        <span>{p.code}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Chọn Môn đích</label>
                  <div className="max-h-40 overflow-y-auto border border-[#E2E8F0] rounded-xl p-2 space-y-1">
                    {subjects.map(s => (
                      <label key={s.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={batchTargetSubjectIds.includes(s.id)}
                          onChange={(e) =>
                            setBatchTargetSubjectIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(x => x !== s.id))
                          }
                        />
                        <span>{s.subjectName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {batchPreviewRows.length > 0 && (
                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-[#003B3A] text-white">
                      <tr className="text-[11px] font-semibold">
                        <th className="py-2 px-3">Môn</th>
                        <th className="py-2 px-3">Khối</th>
                        <th className="py-2 px-3">Kỳ</th>
                        <th className="py-2 px-3">Kết quả dự kiến</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {batchPreviewRows.map((r, i) => (
                        <tr key={i}>
                          <td className="py-2 px-3 font-medium">{r.subjectName}</td>
                          <td className="py-2 px-3">{r.grade}</td>
                          <td className="py-2 px-3">{r.evaluationPeriod}</td>
                          <td className="py-2 px-3">
                            <span className={r.status === "BLOCKED" ? "text-[#E11D48] font-medium" : r.status === "SKIPPED_CONFIRMED" ? "text-[#D97706]" : "text-[#059669] font-medium"}>
                              {r.reason}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-5 py-3 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={batchLoading}
                onClick={() => runBatchCopy(true)}
                className="px-3.5 py-1.5 border border-[#E2E8F0] bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold"
              >
                Xem trước
              </button>
              <button
                type="button"
                disabled={batchLoading}
                onClick={() => runBatchCopy(false)}
                className="px-4 py-1.5 bg-[#003B3A] hover:bg-[#002b2a] text-white rounded-xl text-xs font-semibold"
              >
                Áp dụng hàng loạt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
