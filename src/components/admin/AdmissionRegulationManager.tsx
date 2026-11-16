"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  BookOpen,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Sliders,
  Download,
  X,
  Info,
  Table2,
  AlertTriangle,
  Copy,
  FlaskConical,
  Clock,
  Layers,
  Edit3
} from "lucide-react"
import {
  AdmissionRegulationConfig,
  AdmissionRegulationRule,
  CURRENT_REGULATION_SCHEMA_VERSION,
  DEFAULT_ADMISSION_REGULATIONS,
  INTAKE_TIMING_OPTIONS,
  IntakeTimingCode,
  ExemptionMode,
  ScoreBasisType,
  K12_EDUCATION_SYSTEMS,
  isPreschoolSystem,
  formatRuleTimingsLabel,
  syncRuleLegacyFields,
  parseAdmissionRegulationConfig,
  analyzeStudentAcademicAndRegulation,
  exportEligibleStudentsRegulationExcel
} from "@/lib/admissionRegulationEngine"

interface AdmissionRegulationManagerProps {
  initialConfig?: AdmissionRegulationConfig
  availableSubjects?: { id: string; name: string; code?: string }[]
  availableSystems?: { id?: string; code: string; name?: string }[]
  onConfigSaved?: (newConfig: AdmissionRegulationConfig) => void
  onClose?: () => void
  isModal?: boolean
  readOnly?: boolean
}

const ALL_GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]

const CANONICAL_K12_SUBJECTS = [
  "Bộ chuẩn phát triển trẻ em 5–6 tuổi",
  "Tiếng Việt",
  "Ngữ Văn",
  "Toán học",
  "Tiếng Anh (viết)",
  "Tiếng Anh (vấn đáp)",
  "EPT",
  "ESL (vấn đáp)",
  "Phiếu định hướng đầu vào",
  "Tâm lý",
  "Năng lực tư duy"
]

function normalizeSubjectDisplayName(rawName: string, code?: string): string {
  const trimmed = String(rawName || "").trim()
  const upperCode = String(code || "").trim().toUpperCase()
  const norm = trimmed.toLowerCase().replace(/[–—]/g, "-")
  if (upperCode === "TCI" || norm.includes("5-6 tuổi") || norm.includes("16 tiêu chí")) {
    return "Bộ chuẩn phát triển trẻ em 5–6 tuổi"
  }
  if (norm === "ngữ văn") return "Ngữ Văn"
  if (norm === "tiếng việt") return "Tiếng Việt"
  if (norm === "toán" || norm === "toán học") return "Toán học"
  return trimmed
}

function getSubjectDisplayLabel(subName: string): string {
  if (subName.includes("5–6 tuổi") || subName.includes("5-6 tuổi")) {
    return "Khảo sát 16 tiêu chí (5–6 tuổi)"
  }
  return subName
}

export function AdmissionRegulationManager({
  initialConfig,
  availableSubjects = [],
  availableSystems = [],
  onConfigSaved,
  onClose,
  isModal = false,
  readOnly = false
}: AdmissionRegulationManagerProps) {
  const [config, setConfig] = useState<AdmissionRegulationConfig>(() =>
    initialConfig ? parseAdmissionRegulationConfig(initialConfig) : DEFAULT_ADMISSION_REGULATIONS
  )
  const [activeTab, setActiveTab] = useState<"rules" | "matrix" | "simulator">("rules")
  const [systemFilter, setSystemFilter] = useState<"ALL" | "HNS" | "INTL">("ALL")
  const [gradeFilter, setGradeFilter] = useState<string>("ALL")
  const [selectedRuleId, setSelectedRuleId] = useState<string>(
    () => (initialConfig?.rules?.[0]?.id || DEFAULT_ADMISSION_REGULATIONS.rules[0]?.id || "")
  )
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!initialConfig)
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null)

  // State cho bộ Kiểm thử đối chiếu nhanh (Simulator)
  const [simGrade, setSimGrade] = useState<string>("6")
  const [simSystem, setSimSystem] = useState<string>("HNS")
  const [simTiming, setSimTiming] = useState<IntakeTimingCode>("DAU_NAM")
  const [simRating, setSimRating] = useState<string>("Hoàn thành tốt")
  const [simMath, setSimMath] = useState<string>("8.5")
  const [simLit, setSimLit] = useState<string>("7.5")
  const [simEng, setSimEng] = useState<string>("8.0")
  const [simHasTranscript, setSimHasTranscript] = useState<boolean>(true)

  // Lọc sạch các môn K-12, chuẩn hóa môn 16 tiêu chí (tránh trùng dấu gạch nối - và –)
  const subjectNames = useMemo(() => {
    const set = new Set<string>()
    CANONICAL_K12_SUBJECTS.forEach(s => set.add(s))
    availableSubjects.forEach(sub => {
      if (!sub?.name) return
      const normalized = normalizeSubjectDisplayName(sub.name, sub.code)
      const low = normalized.toLowerCase()
      // Bỏ qua các tiêu chí thuần mầm non dưới 5 tuổi nếu có
      if (low.includes("tháng") || low.includes("3-4 tuổi") || low.includes("4-5 tuổi")) return
      set.add(normalized)
    })
    return Array.from(set)
  }, [availableSubjects])

  // Lọc sạch hệ đào tạo Phổ thông K-12 (loại bỏ MNS, MNG của Mầm non)
  const k12Systems = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>()
    K12_EDUCATION_SYSTEMS.forEach(sys => {
      map.set(sys.code, { code: sys.code, name: sys.name })
    })
    availableSystems.forEach(sys => {
      const code = String(sys?.code || "").trim().toUpperCase()
      if (!code || isPreschoolSystem(code, sys?.name)) return
      if (!map.has(code)) {
        map.set(code, { code, name: sys.name || `Hệ ${code}` })
      }
    })
    return Array.from(map.values())
  }, [availableSystems])

  useEffect(() => {
    if (initialConfig) {
      const parsed = parseAdmissionRegulationConfig(initialConfig)
      setConfig(parsed)
      if (parsed.rules.length > 0) {
        setSelectedRuleId(prev => (parsed.rules.some(r => r.id === prev) ? prev : parsed.rules[0].id))
      }
      setLoading(false)
      return
    }
    let mounted = true
    setLoading(true)
    fetch("/api/assessment-configs?categoryType=QUY_CHE_TS")
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        if (!mounted) return
        const parsed = parseAdmissionRegulationConfig(data)
        setConfig(parsed)
        if (parsed.rules.length > 0) {
          setSelectedRuleId(parsed.rules[0].id)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [initialConfig])

  const showToast = (text: string, type: "ok" | "err" = "ok") => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 3800)
  }

  // Kiểm tra danh sách quy tắc hiển thị theo bộ lọc Hệ & Khối
  const filteredRules = useMemo(() => {
    return config.rules.filter(r => {
      const sysUpper = (r.systems || []).map(s => s.toUpperCase())
      if (systemFilter === "HNS" && !sysUpper.includes("HNS")) return false
      if (
        systemFilter === "INTL" &&
        !sysUpper.some(s => s === "HNG" || s === "HNC" || s === "COMPASS" || s === "SB")
      ) {
        return false
      }
      if (gradeFilter !== "ALL" && !r.grades.includes(gradeFilter)) return false
      return true
    })
  }, [config.rules, systemFilter, gradeFilter])

  const selectedRuleIndex = useMemo(() => {
    const idx = config.rules.findIndex(r => r.id === selectedRuleId)
    if (idx >= 0) return idx
    if (filteredRules.length > 0) {
      const firstFilteredIdx = config.rules.findIndex(r => r.id === filteredRules[0].id)
      if (firstFilteredIdx >= 0) return firstFilteredIdx
    }
    return 0
  }, [config.rules, selectedRuleId, filteredRules])

  const currentRule = config.rules[selectedRuleIndex]
    ? syncRuleLegacyFields(config.rules[selectedRuleIndex])
    : null

  // Phát hiện trùng lặp (Khối + Hệ + Thời điểm) giữa các quy tắc đang bật
  const ruleConflictMap = useMemo(() => {
    const slotOwners = new Map<string, string[]>()
    const expandTimings = (timings: IntakeTimingCode[]): IntakeTimingCode[] => {
      if (!timings || timings.length === 0 || timings.includes("THEO_DOT")) {
        return ["DAU_NAM", "HK1", "HK2", "THEO_DOT", "CA_NAM"]
      }
      return timings
    }

    config.rules.forEach(r => {
      if (r.isActive === false) return
      const timings = expandTimings(r.intakeTimings)
      r.grades.forEach(g => {
        r.systems.forEach(sys => {
          timings.forEach(t => {
            // Với quy tắc gộp K11 (HK2) & K12 (Cả năm), K11 chỉ tính HK2 và K12 tính CA_NAM
            if (g === "11" && t === "CA_NAM" && r.grades.includes("12") && r.intakeTimings.includes("HK2")) {
              return
            }
            const key = `${g}|${sys.toUpperCase()}|${t}`
            const list = slotOwners.get(key) || []
            if (!list.includes(r.id)) list.push(r.id)
            slotOwners.set(key, list)
          })
        })
      })
    })

    const conflictsByRuleId: Record<string, string[]> = {}
    slotOwners.forEach((ruleIds, slotKey) => {
      if (ruleIds.length > 1) {
        const [g, sys, t] = slotKey.split("|")
        const tLabel = INTAKE_TIMING_OPTIONS.find(o => o.code === t)?.shortLabel || t
        ruleIds.forEach(id => {
          if (!conflictsByRuleId[id]) conflictsByRuleId[id] = []
          const desc = `K${g} • ${sys} • ${tLabel}`
          if (!conflictsByRuleId[id].includes(desc)) {
            conflictsByRuleId[id].push(desc)
          }
        })
      }
    })
    return conflictsByRuleId
  }, [config.rules])

  // Cảnh báo kiểm tra chéo nghiệp vụ Đúng môn • Đúng hệ • Đúng thời điểm cho quy tắc đang chọn
  const currentRuleWarnings = useMemo(() => {
    if (!currentRule) return []
    const warnings: string[] = []
    const gradesNum = currentRule.grades.map(g => parseInt(g, 10)).filter(n => !isNaN(n))
    const allSubs = [
      ...currentRule.mandatorySubjects,
      ...currentRule.conditionalSubjects,
      ...currentRule.orientationSubjects
    ]
    const sysUpper = currentRule.systems.map(s => s.toUpperCase())
    const isOnlyIntl =
      sysUpper.length > 0 &&
      !sysUpper.includes("HNS") &&
      sysUpper.every(s => ["HNG", "HNC", "COMPASS", "SB"].includes(s))
    const isOnlyHns = sysUpper.length === 1 && sysUpper[0] === "HNS"

    // 1. Kiểm tra môn Tiếng Việt vs Ngữ Văn theo Khối & Thời điểm
    const hasTiengViet = allSubs.some(s => s.toLowerCase() === "tiếng việt")
    const hasNguVan = allSubs.some(s => s.toLowerCase() === "ngữ văn")
    const hasSecondaryFromG7 = gradesNum.some(g => g >= 7)
    const hasPrimaryUpToG5 = gradesNum.some(g => g <= 5)
    const isGrade6Only = gradesNum.length === 1 && gradesNum[0] === 6

    if (hasSecondaryFromG7 && hasTiengViet) {
      warnings.push("Khối 7–12 thuộc bậc THCS/THPT: Nên chọn môn 'Ngữ Văn' thay cho 'Tiếng Việt'.")
    }
    if (hasPrimaryUpToG5 && hasNguVan) {
      warnings.push("Khối 1–5 thuộc bậc Tiểu học: Nên chọn môn 'Tiếng Việt' thay cho 'Ngữ Văn'.")
    }
    if (isGrade6Only && currentRule.intakeTimings.includes("DAU_NAM") && !currentRule.intakeTimings.includes("HK2") && hasNguVan) {
      warnings.push(
        "Theo Quy chế 2026, Lớp 6 thời điểm Đầu năm học căn cứ kết quả cuối năm lớp 5 nên khảo sát môn 'Tiếng Việt' (ngưỡng < 8,0 điểm)."
      )
    }
    if (isGrade6Only && currentRule.intakeTimings.includes("HK2") && !currentRule.intakeTimings.includes("DAU_NAM") && hasTiengViet) {
      warnings.push(
        "Theo Quy chế 2026, Lớp 6 thời điểm Học kỳ 2 căn cứ bảng điểm HK1 lớp 6 nên khảo sát môn 'Ngữ Văn' (ngưỡng < 6,5 điểm)."
      )
    }

    // 2. Kiểm tra môn 16 tiêu chí
    const hasTci = allSubs.some(s => s.includes("5–6 tuổi") || s.includes("5-6 tuổi") || s.includes("16 tiêu chí"))
    if (hasTci && gradesNum.some(g => g >= 2)) {
      warnings.push("Môn 'Khảo sát 16 tiêu chí (5–6 tuổi)' chỉ áp dụng cho học sinh dự tuyển Lớp 1 đầu năm học.")
    }

    // 3. Kiểm tra đúng Hệ (HNS vs Global/Compass/Song bằng)
    if (isOnlyIntl) {
      if (allSubs.some(s => s.toLowerCase().includes("toán"))) {
        warnings.push(
          "Hệ Global / Compass / Song bằng theo Quy chế 2026 không khảo sát môn Toán học (chỉ khảo sát Tiếng Việt / Ngữ văn, EPT và Vấn đáp ESL)."
        )
      }
      if (allSubs.some(s => s.toLowerCase().includes("tiếng anh") && !s.toLowerCase().includes("esl"))) {
        warnings.push(
          "Hệ Global / Compass / Song bằng sử dụng 'EPT' và 'ESL (vấn đáp)' thay cho Tiếng Anh phổ thông."
        )
      }
    }
    if (isOnlyHns) {
      if (allSubs.some(s => s === "EPT" || s.toLowerCase().includes("esl"))) {
        warnings.push(
          "Hệ Hội nhập S (HNS) sử dụng 'Tiếng Anh (viết)' / 'Tiếng Anh (vấn đáp)', không sử dụng EPT hoặc ESL."
        )
      }
    }

    // 4. Trùng lặp quy tắc
    const conflicts = ruleConflictMap[currentRule.id]
    if (conflicts && conflicts.length > 0) {
      warnings.push(
        `Đang trùng phạm vi áp dụng với quy tắc khác tại: ${conflicts.slice(0, 4).join(", ")}${conflicts.length > 4 ? "..." : ""}.`
      )
    }

    return warnings
  }, [currentRule, ruleConflictMap])

  const updateRule = (idx: number, patch: Partial<AdmissionRegulationRule>) => {
    setConfig(prev => {
      const nextRules = [...prev.rules]
      const merged = syncRuleLegacyFields({ ...nextRules[idx], ...patch })
      nextRules[idx] = merged
      return { ...prev, schemaVersion: CURRENT_REGULATION_SCHEMA_VERSION, rules: nextRules }
    })
  }

  const toggleArrayItem = <T extends string>(arr: T[], item: T): T[] => {
    return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]
  }

  // Đảm bảo 1 môn không vừa nằm ở Bắt buộc vừa nằm ở Có điều kiện điểm / Định hướng trong cùng 1 quy tắc
  const toggleSubjectInRole = (
    idx: number,
    role: "mandatorySubjects" | "conditionalSubjects" | "orientationSubjects" | "onRequestSubjects",
    subName: string
  ) => {
    const rule = syncRuleLegacyFields(config.rules[idx])
    const isRemoving = rule[role].includes(subName)
    if (isRemoving) {
      updateRule(idx, { [role]: rule[role].filter(s => s !== subName) })
      return
    }
    const patch: Partial<AdmissionRegulationRule> = {
      [role]: [...rule[role], subName]
    }
    if (role === "mandatorySubjects") {
      patch.conditionalSubjects = rule.conditionalSubjects.filter(s => s !== subName)
      patch.orientationSubjects = rule.orientationSubjects.filter(s => s !== subName)
    } else if (role === "conditionalSubjects") {
      patch.mandatorySubjects = rule.mandatorySubjects.filter(s => s !== subName)
      patch.orientationSubjects = rule.orientationSubjects.filter(s => s !== subName)
    } else if (role === "orientationSubjects") {
      patch.mandatorySubjects = rule.mandatorySubjects.filter(s => s !== subName)
      patch.conditionalSubjects = rule.conditionalSubjects.filter(s => s !== subName)
    }
    updateRule(idx, patch)
  }

  const handleAddRule = () => {
    const isIntlFilter = systemFilter === "INTL"
    const defaultSystems = isIntlFilter ? ["HNG", "HNC", "SB"] : ["HNS"]
    const targetGrade = gradeFilter !== "ALL" ? gradeFilter : "2"
    const gNum = parseInt(targetGrade, 10) || 2
    const vnSub = gNum <= 5 ? "Tiếng Việt" : "Ngữ Văn"
    const threshold = gNum <= 5 ? 8.0 : 6.5
    const basisType: ScoreBasisType = gNum <= 5 ? "DIEM_KTDK" : "DIEM_TBM"

    const newRule = syncRuleLegacyFields({
      id: `rule-custom-${Date.now()}`,
      name: `Hệ ${isIntlFilter ? "Global, Compass, SB" : "HNS"} • Khối ${targetGrade} — Quy tắc mới`,
      grades: [targetGrade],
      systems: defaultSystems,
      intakeTimings: ["THEO_DOT"],
      exemptionMode: "BY_SCORE",
      scoreBasisType: basisType,
      scoreThreshold: threshold,
      transcriptBasis: "Căn cứ bảng điểm/học kỳ gần nhất.",
      minAcademicRatings:
        gNum <= 5
          ? ["Hoàn thành xuất sắc", "Hoàn thành tốt", "Hoàn thành"]
          : ["Xuất sắc", "Giỏi", "Tốt", "Khá", "Đạt"],
      minConductRatings: ["Tốt", "Đạt"],
      mandatorySubjects: isIntlFilter ? ["EPT", "ESL (vấn đáp)"] : ["Tiếng Anh (vấn đáp)"],
      conditionalSubjects: isIntlFilter
        ? [vnSub]
        : [vnSub, "Toán học", "Tiếng Anh (viết)"],
      orientationSubjects: gNum >= 6 ? ["Phiếu định hướng đầu vào"] : [],
      onRequestSubjects: ["Tâm lý"],
      directAdmissionSubjects: isIntlFilter ? ["ESL (vấn đáp)"] : ["Tiếng Anh (vấn đáp)"],
      intlCertKeywords: "IELTS, Cambridge, Flyers, KET, PET",
      regulationNote: "",
      isActive: true
    })

    setConfig(prev => ({ ...prev, schemaVersion: CURRENT_REGULATION_SCHEMA_VERSION, rules: [...prev.rules, newRule] }))
    setSelectedRuleId(newRule.id)
    setActiveTab("rules")
  }

  const handleDuplicateRule = (idx: number) => {
    const source = syncRuleLegacyFields(config.rules[idx])
    const copy: AdmissionRegulationRule = {
      ...source,
      id: `rule-copy-${Date.now()}`,
      name: `${source.name} (Bản sao)`
    }
    setConfig(prev => {
      const next = [...prev.rules]
      next.splice(idx + 1, 0, copy)
      return { ...prev, schemaVersion: CURRENT_REGULATION_SCHEMA_VERSION, rules: next }
    })
    setSelectedRuleId(copy.id)
    showToast("Đã nhân bản quy tắc để tùy chỉnh riêng")
  }

  const handleDeleteRule = (idx: number) => {
    if (config.rules.length <= 1) {
      showToast("Cần giữ lại ít nhất 1 quy tắc trong bộ Quy chế", "err")
      return
    }
    const nextIdx = Math.max(0, idx - 1)
    const nextId = config.rules.filter((_, i) => i !== idx)[nextIdx]?.id || ""
    setConfig(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== idx)
    }))
    setSelectedRuleId(nextId)
  }

  const handleApplyStandard2026 = () => {
    setConfig(DEFAULT_ADMISSION_REGULATIONS)
    setSelectedRuleId(DEFAULT_ADMISSION_REGULATIONS.rules[0].id)
    setSystemFilter("ALL")
    setGradeFilter("ALL")
    showToast(
      "Đã nạp bộ Quy chế Tuyển sinh Phổ thông 2026 chuẩn (19 quy tắc theo Hệ HNS & Hệ Global, Compass, Song bằng). Hãy nhấn 'Lưu cấu hình quy chế' để áp dụng!"
    )
  }

  const handleSave = async () => {
    if (readOnly) return
    setSaving(true)
    try {
      const payloadConfig: AdmissionRegulationConfig = {
        ...config,
        schemaVersion: CURRENT_REGULATION_SCHEMA_VERSION,
        rules: config.rules.map(r => syncRuleLegacyFields(r)),
        updatedAt: new Date().toISOString()
      }
      const res = await fetch("/api/assessment-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryType: "QUY_CHE_TS",
          code: "SKYLINE_K12_REGULATION",
          name: JSON.stringify(payloadConfig),
          upsert: true
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Không thể lưu Quy chế")
      }
      setConfig(payloadConfig)
      showToast("Đã lưu Quy chế Tuyển sinh K-12 & đồng bộ đối chiếu tự động!", "ok")
      if (onConfigSaved) onConfigSaved(payloadConfig)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi khi lưu Quy chế Tuyển sinh"
      showToast(msg, "err")
    } finally {
      setSaving(false)
    }
  }

  // Tính toán kết quả Mô phỏng kiểm thử trực tiếp
  const simulatedInsight = useMemo(() => {
    const gNum = parseInt(simGrade, 10) || 1
    const vnLabel =
      gNum <= 5 || (gNum === 6 && simTiming === "DAU_NAM") ? "Tiếng Việt" : "Ngữ Văn"
    const mockStudent = {
      studentCode: "HS_SIM",
      fullName: "Học sinh kiểm thử",
      grade: simGrade,
      surveyFormType: simSystem,
      hocKy: INTAKE_TIMING_OPTIONS.find(o => o.code === simTiming)?.label || "Đầu năm học",
      intakeTiming: simTiming,
      kqHocTap: simHasTranscript
        ? JSON.stringify({
            programType: "BO_GD_DT",
            transcriptPeriod: simTiming === "HK2" ? "HK1" : "CA_NAM",
            overallRating: simRating,
            moet: {
              gradeLevel: simGrade,
              overallRating: simRating,
              conductRating: "Tốt",
              subjects: [
                { id: "toan", name: "Toán", score: simMath },
                { id: "van", name: vnLabel, score: simLit },
                { id: "anh", name: "Tiếng Anh", score: simEng }
              ]
            }
          })
        : ""
    }
    return analyzeStudentAcademicAndRegulation(mockStudent, config)
  }, [simGrade, simSystem, simTiming, simRating, simMath, simLit, simEng, simHasTranscript, config])

  const hnsCount = config.rules.filter(r => r.systems.map(s => s.toUpperCase()).includes("HNS")).length
  const intlCount = config.rules.filter(r =>
    r.systems.map(s => s.toUpperCase()).some(s => ["HNG", "HNC", "COMPASS", "SB"].includes(s))
  ).length
  const isLegacyConfig = (config.schemaVersion || 1) < 2

  return (
    <div
      className={`bg-white ${
        isModal
          ? "rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
          : "rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden"
      }`}
    >
      {/* Masthead chuẩn Sky-Line Academic Ledger */}
      <div className="bg-[#003B3A] px-5 py-4 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-[#003B3A]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-[#5EEAD4]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-white/10 text-[#CCFBF1] border border-white/15">
                Quy chế tuyển sinh phổ thông Sky-Line
              </span>
              <span className="text-xs text-[#5EEAD4] font-medium tabular-nums">
                Năm học {config.effectiveYear || "2026-2027"}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-white mt-0.5">
              Nhập & cấu hình quy chế tuyển sinh đầu vào (K-12)
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const res = exportEligibleStudentsRegulationExcel({
                customConfig: config,
                templateOnly: true
              })
              showToast(`Đã tải file mẫu "${res.fileName}" (${res.exportedCount} dòng mẫu chuẩn Quy chế)!`, "ok")
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold transition-colors cursor-pointer"
            title="Xuất file Excel mẫu danh sách học sinh đủ điều kiện miễn môn theo quy chế"
          >
            <Download className="w-3.5 h-3.5 text-[#5EEAD4]" />
            <span>Xuất mẫu DS đủ ĐK (.xlsx)</span>
          </button>

          {/* Chuyển chế độ xem */}
          <div className="flex items-center bg-black/25 p-1 rounded-xl border border-white/10 tabular-nums">
            <button
              type="button"
              onClick={() => setActiveTab("rules")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "rules"
                  ? "bg-white text-[#003B3A] shadow-2xs"
                  : "text-teal-100 hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Thiết lập quy tắc ({config.rules.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("matrix")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "matrix"
                  ? "bg-white text-[#003B3A] shadow-2xs"
                  : "text-teal-100 hover:text-white"
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Bảng ma trận quy chế</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("simulator")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "simulator"
                  ? "bg-white text-[#003B3A] shadow-2xs"
                  : "text-teal-100 hover:text-white"
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Kiểm thử & văn bản</span>
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Thông báo trạng thái */}
      {toastMsg && (
        <div
          className={`px-5 py-2.5 text-xs font-semibold flex items-center justify-between ${
            toastMsg.type === "ok"
              ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200"
              : "bg-rose-50 text-rose-800 border-b border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMsg.text}</span>
          </div>
        </div>
      )}

      {/* Banner nhắc nâng cấp nếu DB đang lưu bản cấu hình cũ chưa tách Hệ & Thời điểm 2026 */}
      {!loading && isLegacyConfig && !readOnly && (
        <div className="px-5 py-3 bg-amber-50/90 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Cấu hình đang lưu thuộc phiên bản cũ (gộp chung Hệ và chưa phân tách Thời điểm Đầu năm / HK1 / HK2).</span>{" "}
              Bạn có thể nạp ngay bộ <strong>Quy chế Tuyển sinh Phổ thông 2026</strong> chuẩn (11 quy tắc Hệ HNS & 8 quy tắc Hệ Global, Compass, Song bằng) rồi nhấn Lưu.
            </div>
          </div>
          <button
            type="button"
            onClick={handleApplyStandard2026}
            className="px-3.5 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            Áp dụng chuẩn Quy chế 2026
          </button>
        </div>
      )}

      {/* Thanh lọc nhanh theo Hệ đào tạo & Khối lớp (Áp dụng cho Tab Thiết lập & Tab Bảng ma trận) */}
      {!loading && (activeTab === "rules" || activeTab === "matrix") && (
        <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 tabular-nums">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600 mr-1">Nhóm hệ đào tạo:</span>
            <button
              type="button"
              onClick={() => setSystemFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                systemFilter === "ALL"
                  ? "bg-[#003B3A] text-white border-[#003B3A]"
                  : "bg-white text-slate-600 border-[#E2E8F0] hover:border-[#00A19A]"
              }`}
            >
              Tất cả ({config.rules.length})
            </button>
            <button
              type="button"
              onClick={() => setSystemFilter("HNS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                systemFilter === "HNS"
                  ? "bg-[#00736E] text-white border-[#00736E]"
                  : "bg-white text-slate-600 border-[#E2E8F0] hover:border-[#00A19A]"
              }`}
            >
              Hệ Hội nhập S — HNS ({hnsCount})
            </button>
            <button
              type="button"
              onClick={() => setSystemFilter("INTL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                systemFilter === "INTL"
                  ? "bg-[#00736E] text-white border-[#00736E]"
                  : "bg-white text-slate-600 border-[#E2E8F0] hover:border-[#00A19A]"
              }`}
            >
              Hệ Global, Compass, Song bằng ({intlCount})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">Lọc theo khối:</span>
            <select
              value={gradeFilter}
              onChange={e => setGradeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-xs font-semibold text-[#003B3A] focus:outline-none focus:border-[#00A19A] cursor-pointer"
            >
              <option value="ALL">Tất cả khối (K1 – K12)</option>
              {ALL_GRADES.map(g => (
                <option key={g} value={g}>
                  Khối {g}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Nội dung chính */}
      <div className={`p-5 overflow-y-auto flex-1 space-y-5 ${isModal ? "max-h-[calc(90vh-190px)]" : ""}`}>
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Đang tải cấu hình Quy chế Tuyển sinh...
          </div>
        ) : activeTab === "rules" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Cột trái: Danh sách Quy tắc theo Hệ • Khối • Thời điểm */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#003B3A] tabular-nums">
                  Danh sách quy tắc ({filteredRules.length})
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F0FDFA] hover:bg-teal-100/80 text-[#00736E] border border-teal-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm quy tắc</span>
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
                {filteredRules.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-[#E2E8F0] text-center text-xs text-slate-500">
                    Không có quy tắc nào khớp với bộ lọc hiện tại.
                  </div>
                ) : (
                  filteredRules.map(rawR => {
                    const r = syncRuleLegacyFields(rawR)
                    const isSel = currentRule?.id === r.id
                    const hasConflict = Boolean(ruleConflictMap[r.id]?.length)
                    const thresholdBadge =
                      r.exemptionMode === "NO_TRANSCRIPT"
                        ? "Chưa có bảng điểm"
                        : r.exemptionMode === "NO_SCORE_EXEMPTION"
                        ? "Không miễn theo điểm"
                        : `< ${r.scoreThreshold} khảo sát`

                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRuleId(r.id)}
                        className={`p-3.5 rounded-xl border transition-colors cursor-pointer tabular-nums ${
                          isSel
                            ? "bg-[#F0FDFA] border-[#00736E] shadow-2xs"
                            : "bg-white border-[#E2E8F0] hover:border-[#00A19A]/60 hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-xs sm:text-[13px] text-[#003B3A] leading-snug">
                            {r.name}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold shrink-0 ${
                              r.isActive !== false
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {r.isActive !== false ? "Đang bật" : "Tạm tắt"}
                          </span>
                        </div>

                        {/* Hàng huy hiệu: Hệ + Khối + Thời điểm */}
                        <div className="flex flex-wrap items-center gap-1 mt-2">
                          {r.systems.map(sys => (
                            <span
                              key={sys}
                              className={`px-1.5 py-0.5 rounded text-[11px] font-semibold border ${
                                sys === "HNS"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-teal-50 text-[#00736E] border-teal-200"
                              }`}
                            >
                              {sys}
                            </span>
                          ))}
                          {r.grades.map(g => (
                            <span
                              key={g}
                              className="px-1.5 py-0.5 rounded bg-[#003B3A] text-white text-[11px] font-semibold"
                            >
                              K{g}
                            </span>
                          ))}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0] text-[11px] font-medium">
                            <Clock className="w-3 h-3 text-[#008B85]" />
                            {formatRuleTimingsLabel(r.intakeTimings)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#F1F5F9] text-[11px]">
                          <span
                            className={`font-semibold ${
                              r.exemptionMode === "NO_SCORE_EXEMPTION"
                                ? "text-amber-700"
                                : r.exemptionMode === "NO_TRANSCRIPT"
                                ? "text-slate-600"
                                : "text-[#00736E]"
                            }`}
                          >
                            {thresholdBadge}
                          </span>
                          <span className="text-slate-500 truncate">
                            {r.defaultSubjects.length} môn cấu hình
                          </span>
                        </div>

                        {hasConflict && (
                          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Trùng phạm vi Khối/Hệ/Thời điểm</span>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-slate-600 space-y-1 leading-relaxed">
                <div className="font-bold text-[#003B3A] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#008B85]" />
                  <span>Đối chiếu tự động 3 chiều</span>
                </div>
                <p>
                  Hệ thống tự động khớp học sinh theo <strong>Khối lớp + Hệ đăng ký + Thời điểm tuyển sinh</strong> để xác định đúng môn bắt buộc, môn xét miễn theo điểm và môn định hướng đầu vào.
                </p>
              </div>
            </div>

            {/* Cột phải: Biểu mẫu chi tiết cho Quy tắc đang chọn */}
            {currentRule && (
              <div className="lg:col-span-8 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 space-y-4 tabular-nums">
                {/* Tiêu đề quy tắc & Thao tác */}
                <div className="flex flex-wrap items-end justify-between gap-3 pb-3.5 border-b border-[#E2E8F0]">
                  <div className="flex-1 min-w-[240px]">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Tên quy tắc tuyển sinh (Hệ • Khối • Thời điểm)
                    </label>
                    <input
                      type="text"
                      value={currentRule.name}
                      disabled={readOnly}
                      onChange={e => updateRule(selectedRuleIndex, { name: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#003B3A] focus:outline-none focus:border-[#00A19A]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentRule.isActive !== false}
                        disabled={readOnly}
                        onChange={e => updateRule(selectedRuleIndex, { isActive: e.target.checked })}
                        className="w-4 h-4 accent-[#00736E] rounded"
                      />
                      <span>Đang áp dụng</span>
                    </label>

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleDuplicateRule(selectedRuleIndex)}
                        className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-[#E2E8F0] transition-colors cursor-pointer"
                        title="Nhân bản quy tắc này"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}

                    {!readOnly && config.rules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(selectedRuleIndex)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                        title="Xóa quy tắc này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Cảnh báo kiểm tra chéo nếu chọn sai môn/hệ/thời điểm */}
                {currentRuleWarnings.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Lưu ý rà soát tính nhất quán (Môn • Hệ • Thời điểm)</span>
                    </div>
                    <ul className="list-disc pl-5 text-xs text-amber-800 space-y-0.5">
                      {currentRuleWarnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Mục 1 & 2: Đúng Hệ đào tạo & Đúng Khối lớp */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-5 bg-white p-4 rounded-xl border border-[#E2E8F0] space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#008B85]" />
                        <span>1. Hệ đào tạo phổ thông (K-12)</span>
                      </label>
                    </div>

                    {!readOnly && (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateRule(selectedRuleIndex, { systems: ["HNS"] })}
                          className="px-2 py-1 rounded-md bg-[#F8FAFC] hover:bg-teal-50 text-[11px] font-semibold text-[#00736E] border border-[#E2E8F0] cursor-pointer"
                        >
                          Chọn Hệ HNS
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRule(selectedRuleIndex, { systems: ["HNG", "HNC", "SB"] })}
                          className="px-2 py-1 rounded-md bg-[#F8FAFC] hover:bg-teal-50 text-[11px] font-semibold text-[#00736E] border border-[#E2E8F0] cursor-pointer"
                        >
                          Chọn Global • Compass • SB
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {k12Systems.map(sys => {
                        const active = currentRule.systems.includes(sys.code)
                        return (
                          <button
                            key={sys.code}
                            type="button"
                            disabled={readOnly}
                            title={sys.name}
                            onClick={() =>
                              updateRule(selectedRuleIndex, {
                                systems: toggleArrayItem(currentRule.systems, sys.code)
                              })
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                              active
                                ? "bg-[#00736E] text-white border-[#00736E]"
                                : "bg-[#F8FAFC] text-slate-600 border-[#E2E8F0] hover:border-[#00A19A]"
                            }`}
                          >
                            {sys.code}
                            {sys.code === "HNC" ? " (Compass)" : ""}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="md:col-span-7 bg-white p-4 rounded-xl border border-[#E2E8F0] space-y-2.5">
                    <label className="block text-xs font-bold text-[#003B3A]">
                      2. Khối lớp áp dụng quy tắc này
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_GRADES.map(g => {
                        const active = currentRule.grades.includes(g)
                        return (
                          <button
                            key={g}
                            type="button"
                            disabled={readOnly}
                            onClick={() =>
                              updateRule(selectedRuleIndex, {
                                grades: toggleArrayItem(currentRule.grades, g)
                              })
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                              active
                                ? "bg-[#003B3A] text-white border-[#003B3A]"
                                : "bg-[#F8FAFC] text-slate-600 border-[#E2E8F0] hover:border-[#00A19A]"
                            }`}
                          >
                            Khối {g}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Mục 3: Đúng Thời điểm tuyển sinh */}
                <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#008B85]" />
                      <span>3. Thời điểm tuyển sinh áp dụng</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Phân tách chính xác Đầu năm học, Học kỳ 1, Học kỳ 2, Theo đợt hoặc Cả năm
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
                    {INTAKE_TIMING_OPTIONS.map(opt => {
                      const active = currentRule.intakeTimings.includes(opt.code)
                      return (
                        <button
                          key={opt.code}
                          type="button"
                          disabled={readOnly}
                          title={opt.description}
                          onClick={() =>
                            updateRule(selectedRuleIndex, {
                              intakeTimings: toggleArrayItem(currentRule.intakeTimings, opt.code)
                            })
                          }
                          className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                            active
                              ? "bg-[#F0FDFA] border-[#00736E] text-[#003B3A]"
                              : "bg-[#F8FAFC] border-[#E2E8F0] text-slate-600 hover:border-[#00A19A]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold">{opt.label}</span>
                            {active && <CheckCircle2 className="w-3.5 h-3.5 text-[#008B85] shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">
                            {opt.description}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Mục 4: Căn cứ xét tuyển & Ngưỡng điểm bảng điểm */}
                <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] space-y-3.5">
                  <label className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#008B85]" />
                    <span>4. Căn cứ xét tuyển & cơ chế xét miễn theo điểm bảng điểm</span>
                  </label>

                  {/* Chọn chế độ miễn giảm */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        mode: "BY_SCORE" as ExemptionMode,
                        title: "Xét miễn theo ngưỡng điểm",
                        desc: "Khảo sát nếu dưới ngưỡng, miễn nếu đạt ngưỡng (8,0 hoặc 6,5)"
                      },
                      {
                        mode: "NO_TRANSCRIPT" as ExemptionMode,
                        title: "Đầu cấp chưa có bảng điểm",
                        desc: "Áp dụng cho Lớp 1 đầu năm học"
                      },
                      {
                        mode: "NO_SCORE_EXEMPTION" as ExemptionMode,
                        title: "Không miễn theo điểm",
                        desc: "Kiểm tra bắt buộc đủ môn (VD: Lớp 11 HK2 & Lớp 12)"
                      }
                    ].map(item => {
                      const active = currentRule.exemptionMode === item.mode
                      return (
                        <button
                          key={item.mode}
                          type="button"
                          disabled={readOnly}
                          onClick={() => {
                            if (item.mode === "BY_SCORE") {
                              const maxG = Math.max(...currentRule.grades.map(g => parseInt(g, 10) || 1))
                              const isPrimaryBasis =
                                maxG <= 5 ||
                                (currentRule.grades.length === 1 &&
                                  currentRule.grades[0] === "6" &&
                                  currentRule.intakeTimings.includes("DAU_NAM"))
                              updateRule(selectedRuleIndex, {
                                exemptionMode: "BY_SCORE",
                                scoreBasisType: isPrimaryBasis ? "DIEM_KTDK" : "DIEM_TBM",
                                scoreThreshold:
                                  currentRule.scoreThreshold > 0
                                    ? currentRule.scoreThreshold
                                    : isPrimaryBasis
                                    ? 8.0
                                    : 6.5
                              })
                            } else {
                              updateRule(selectedRuleIndex, {
                                exemptionMode: item.mode,
                                scoreBasisType: "KHONG_XET_DIEM",
                                scoreThreshold: 0,
                                // Chuyển các môn có điều kiện sang bắt buộc nếu chọn Không miễn theo điểm
                                mandatorySubjects:
                                  item.mode === "NO_SCORE_EXEMPTION"
                                    ? Array.from(
                                        new Set([
                                          ...currentRule.mandatorySubjects,
                                          ...currentRule.conditionalSubjects
                                        ])
                                      )
                                    : currentRule.mandatorySubjects,
                                conditionalSubjects: []
                              })
                            }
                          }}
                          className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                            active
                              ? "bg-[#F0FDFA] border-[#00736E] text-[#003B3A]"
                              : "bg-[#F8FAFC] border-[#E2E8F0] text-slate-600 hover:border-[#00A19A]"
                          }`}
                        >
                          <div className="text-xs font-bold flex items-center justify-between">
                            <span>{item.title}</span>
                            {active && <CheckCircle2 className="w-3.5 h-3.5 text-[#008B85] shrink-0" />}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.desc}</div>
                        </button>
                      )
                    })}
                  </div>

                  {currentRule.exemptionMode === "BY_SCORE" && (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                      <div className="sm:col-span-5">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Loại điểm căn cứ trong bảng điểm
                        </label>
                        <select
                          disabled={readOnly}
                          value={currentRule.scoreBasisType}
                          onChange={e => {
                            const nextBasis = e.target.value as ScoreBasisType
                            updateRule(selectedRuleIndex, {
                              scoreBasisType: nextBasis,
                              scoreThreshold: nextBasis === "DIEM_KTDK" ? 8.0 : 6.5
                            })
                          }}
                          className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#003B3A] focus:bg-white focus:outline-none focus:border-[#00A19A]"
                        >
                          <option value="DIEM_KTDK">Điểm kiểm tra định kỳ (Tiểu học & K6 đầu năm)</option>
                          <option value="DIEM_TBM">Điểm trung bình môn (K6 HK2, K7–10, K11 HK1)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Ngưỡng điểm miễn khảo sát (≥)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="10"
                            disabled={readOnly}
                            value={currentRule.scoreThreshold}
                            onChange={e =>
                              updateRule(selectedRuleIndex, {
                                scoreThreshold: parseFloat(e.target.value) || 0
                              })
                            }
                            className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#003B3A] focus:bg-white focus:outline-none focus:border-[#00A19A]"
                          />
                          {!readOnly && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  updateRule(selectedRuleIndex, {
                                    scoreThreshold: 8.0,
                                    scoreBasisType: "DIEM_KTDK"
                                  })
                                }
                                className={`px-2.5 py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                                  currentRule.scoreThreshold === 8
                                    ? "bg-[#00736E] text-white border-[#00736E]"
                                    : "bg-white text-slate-600 border-[#E2E8F0]"
                                }`}
                              >
                                8,0
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateRule(selectedRuleIndex, {
                                    scoreThreshold: 6.5,
                                    scoreBasisType: "DIEM_TBM"
                                  })
                                }
                                className={`px-2.5 py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                                  currentRule.scoreThreshold === 6.5
                                    ? "bg-[#00736E] text-white border-[#00736E]"
                                    : "bg-white text-slate-600 border-[#E2E8F0]"
                                }`}
                              >
                                6,5
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-3 flex items-end">
                        <div className="w-full px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200 text-[11px] text-emerald-800 font-medium leading-tight">
                          Dưới <strong>{currentRule.scoreThreshold}</strong>: khảo sát
                          <br />
                          Từ <strong>{currentRule.scoreThreshold}</strong> trở lên: miễn
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Căn cứ xét tuyển (theo cột 4 văn bản Quy chế)
                      </label>
                      <input
                        type="text"
                        disabled={readOnly}
                        value={currentRule.transcriptBasis}
                        onChange={e => updateRule(selectedRuleIndex, { transcriptBasis: e.target.value })}
                        placeholder="VD: Bảng điểm học kỳ 1 lớp 6 / Kết quả cuối năm lớp 5..."
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#00A19A]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Mức xếp loại học tập đạt điều kiện (phân cách dấu phẩy)
                      </label>
                      <input
                        type="text"
                        disabled={readOnly}
                        value={currentRule.minAcademicRatings.join(", ")}
                        onChange={e =>
                          updateRule(selectedRuleIndex, {
                            minAcademicRatings: e.target.value
                              .split(",")
                              .map(s => s.trim())
                              .filter(Boolean)
                          })
                        }
                        placeholder="Hoàn thành xuất sắc, Hoàn thành tốt, Khá, Tốt..."
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#00A19A]"
                      />
                    </div>
                  </div>

                  {currentRule.exemptionMode === "NO_SCORE_EXEMPTION" && (
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={Boolean(currentRule.requireAcademicRatingForEntry)}
                        onChange={e =>
                          updateRule(selectedRuleIndex, { requireAcademicRatingForEntry: e.target.checked })
                        }
                        className="w-4 h-4 accent-[#00736E] rounded"
                      />
                      <span>Bắt buộc đạt mức xếp loại học lực nêu trên (VD: Học lực Khá trở lên ở Lớp 11 HK2 & Lớp 12)</span>
                    </label>
                  )}
                </div>

                {/* Mục 5: Phân luồng Đúng Môn Khảo sát theo 4 vai trò rõ ràng */}
                <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-[#003B3A]">
                      5. Phân luồng đúng môn khảo sát theo vai trò
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Mỗi môn chỉ đóng một vai trò chính trong cùng quy tắc để tránh xung đột khi tự động phân công.
                    </p>
                  </div>

                  {/* 5a. Môn khảo sát bắt buộc (không miễn theo điểm) */}
                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <label className="text-xs font-semibold text-[#003B3A]">
                        a) Môn khảo sát năng lực bắt buộc (không miễn theo điểm bảng điểm)
                      </label>
                      <span className="text-[11px] text-slate-500">
                        VD: Khảo sát 16 tiêu chí (K1), EPT & ESL (HNG/Compass/SB), hoặc đủ môn K11 HK2 – K12
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {subjectNames.map(subName => {
                        const active = currentRule.mandatorySubjects.includes(subName)
                        return (
                          <button
                            key={subName}
                            type="button"
                            disabled={readOnly}
                            onClick={() => toggleSubjectInRole(selectedRuleIndex, "mandatorySubjects", subName)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                              active
                                ? "bg-[#003B3A] text-white border-[#003B3A]"
                                : "bg-white text-slate-600 border-[#E2E8F0] hover:border-[#00A19A]"
                            }`}
                          >
                            {active ? "✓ " : ""}
                            {getSubjectDisplayLabel(subName)}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 5b. Môn khảo sát có điều kiện theo ngưỡng điểm */}
                  {currentRule.exemptionMode === "BY_SCORE" && (
                    <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-200/80 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <label className="text-xs font-semibold text-emerald-950">
                          b) Môn khảo sát nếu dưới{" "}
                          <span className="font-bold text-emerald-700">{currentRule.scoreThreshold} điểm</span>{" "}
                          (tự động miễn khảo sát nếu đạt từ {currentRule.scoreThreshold} trở lên)
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {subjectNames.map(subName => {
                          const active = currentRule.conditionalSubjects.includes(subName)
                          return (
                            <button
                              key={subName}
                              type="button"
                              disabled={readOnly}
                              onClick={() => toggleSubjectInRole(selectedRuleIndex, "conditionalSubjects", subName)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                active
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "bg-white text-slate-600 border-[#E2E8F0] hover:border-emerald-400"
                              }`}
                            >
                              {active ? `< ${currentRule.scoreThreshold}: ` : ""}
                              {getSubjectDisplayLabel(subName)}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* 5c. Môn định hướng đầu vào (không dùng làm tiêu chí xét tuyển) */}
                  <div className="p-3 rounded-xl bg-[#F0FDFA]/60 border border-teal-200/80 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <label className="text-xs font-semibold text-[#003B3A]">
                        c) Môn định hướng đầu vào (chỉ dùng để định hướng, không dùng làm tiêu chí xét tuyển)
                      </label>
                      <span className="text-[11px] text-[#00736E]">
                        VD: Tiếng Anh vấn đáp (K1–K3 HK1 HNS), Vấn đáp ESL (K1 HNG/Compass/SB), Phiếu định hướng
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {subjectNames.map(subName => {
                        const active = currentRule.orientationSubjects.includes(subName)
                        return (
                          <button
                            key={subName}
                            type="button"
                            disabled={readOnly}
                            onClick={() => toggleSubjectInRole(selectedRuleIndex, "orientationSubjects", subName)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                              active
                                ? "bg-[#008B85] text-white border-[#008B85]"
                                : "bg-white text-slate-600 border-[#E2E8F0] hover:border-[#00A19A]"
                            }`}
                          >
                            {active ? "Định hướng: " : ""}
                            {getSubjectDisplayLabel(subName)}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 5d. Môn phỏng vấn theo đề nghị của GV định hướng */}
                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <label className="text-xs font-semibold text-slate-700">
                        d) Môn thực hiện khi có đề nghị của giáo viên phỏng vấn định hướng
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Mục 1.2 Quy chế: Phỏng vấn tâm lý khi có đề nghị
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {subjectNames.map(subName => {
                        const active = currentRule.onRequestSubjects.includes(subName)
                        return (
                          <button
                            key={subName}
                            type="button"
                            disabled={readOnly}
                            onClick={() => toggleSubjectInRole(selectedRuleIndex, "onRequestSubjects", subName)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                              active
                                ? "bg-amber-600 text-white border-amber-600"
                                : "bg-white text-slate-600 border-[#E2E8F0] hover:border-amber-300"
                            }`}
                          >
                            {active ? "Theo đề nghị: " : ""}
                            {getSubjectDisplayLabel(subName)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Mục 6: Ghi chú quy chế hiển thị khi phân công */}
                <div className="bg-white p-4 rounded-xl border border-[#E2E8F0]">
                  <label className="block text-xs font-bold text-[#003B3A] mb-1.5">
                    6. Ghi chú tóm tắt quy chế hiển thị cho Giáo vụ & Ban khảo thí
                  </label>
                  <textarea
                    rows={2}
                    disabled={readOnly}
                    value={currentRule.regulationNote}
                    onChange={e => updateRule(selectedRuleIndex, { regulationNote: e.target.value })}
                    placeholder="Nhập tóm tắt nội dung khảo sát năng lực và điều kiện xét tuyển..."
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:border-[#00A19A]"
                  />
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "matrix" ? (
          /* TAB 2: BẢNG MA TRẬN QUY CHẾ CHUẨN SKY-LINE ACADEMIC LEDGER TABLE */
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-600">
                Bảng tổng hợp đối chiếu trực tiếp với văn bản ban hành <strong>Quy chế Tuyển sinh Phổ thông 2026</strong> theo từng Khối, Hệ và Thời điểm.
              </div>
              {Object.keys(ruleConflictMap).length > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Có {Object.keys(ruleConflictMap).length} quy tắc đang trùng phạm vi áp dụng</span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                    <tr className="text-[11px] font-semibold whitespace-nowrap">
                      <th className="py-3 px-3 text-white w-12 text-center">STT</th>
                      <th className="py-3 px-3 text-white">Khối lớp</th>
                      <th className="py-3 px-3 text-teal-100">Hệ đào tạo</th>
                      <th className="py-3 px-3 text-teal-100">Thời điểm</th>
                      <th className="py-3 px-3 text-white min-w-[290px]">Nội dung khảo sát năng lực (Đúng môn)</th>
                      <th className="py-3 px-3 text-[#5EEAD4]">Ngưỡng xét miễn</th>
                      <th className="py-3 px-3 text-teal-100 min-w-[230px]">Căn cứ xét tuyển</th>
                      <th className="py-3 px-3 text-white text-right w-24">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {filteredRules.map((rawRule, idx) => {
                      const r = syncRuleLegacyFields(rawRule)
                      const isSelected = currentRule?.id === r.id
                      return (
                        <tr
                          key={r.id}
                          className={`transition-colors align-middle ${
                            isSelected ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]" : "hover:bg-[#F8FAFC]"
                          } ${r.isActive === false ? "opacity-55" : ""}`}
                        >
                          <td className="py-3 px-3 text-center text-slate-500 font-semibold align-middle">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 align-middle whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {r.grades.map(g => (
                                <span
                                  key={g}
                                  className="px-2 py-0.5 rounded bg-[#003B3A] text-white text-[11px] font-semibold"
                                >
                                  Lớp {g}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-3 align-middle whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {r.systems.map(sys => (
                                <span
                                  key={sys}
                                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                    sys === "HNS"
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : "bg-teal-50 text-[#00736E] border-teal-200"
                                  }`}
                                >
                                  {sys}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-3 align-middle whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0] text-[11px] font-semibold">
                              {formatRuleTimingsLabel(r.intakeTimings)}
                            </span>
                          </td>
                          <td className="py-3 px-3 align-middle">
                            <div className="space-y-1">
                              {r.mandatorySubjects.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="text-[11px] font-semibold text-[#003B3A]">Bắt buộc:</span>
                                  {r.mandatorySubjects.map(s => (
                                    <span
                                      key={s}
                                      className="px-2 py-0.5 rounded bg-slate-100 text-[#003B3A] border border-slate-200 text-[11px] font-semibold"
                                    >
                                      {getSubjectDisplayLabel(s)}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {r.conditionalSubjects.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="text-[11px] font-semibold text-emerald-700">
                                    Nếu &lt; {r.scoreThreshold}:
                                  </span>
                                  {r.conditionalSubjects.map(s => (
                                    <span
                                      key={s}
                                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold"
                                    >
                                      {getSubjectDisplayLabel(s)}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {r.orientationSubjects.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="text-[11px] font-semibold text-[#00736E]">Định hướng:</span>
                                  {r.orientationSubjects.map(s => (
                                    <span
                                      key={s}
                                      className="px-2 py-0.5 rounded bg-[#F0FDFA] text-[#00736E] border border-teal-200 text-[11px] font-medium"
                                    >
                                      {getSubjectDisplayLabel(s)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 align-middle whitespace-nowrap">
                            {r.exemptionMode === "NO_TRANSCRIPT" ? (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                                Chưa có bảng điểm
                              </span>
                            ) : r.exemptionMode === "NO_SCORE_EXEMPTION" ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                                Không miễn theo điểm
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                                {r.scoreBasisType === "DIEM_KTDK" ? "KTĐK" : "TBM"} ≥ {r.scoreThreshold}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 align-middle text-slate-600 leading-snug">
                            {r.transcriptBasis || r.regulationNote || "—"}
                          </td>
                          <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRuleId(r.id)
                                setActiveTab("rules")
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F0FDFA] hover:bg-[#00736E] text-[#00736E] hover:text-white border border-teal-200 text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Chi tiết</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 3: BỘ MÔ PHỎNG KIỂM THỬ QUY CHẾ & VĂN BẢN GHI CHÚ CHUNG */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Bộ mô phỏng kiểm thử trực tiếp */}
            <div className="lg:col-span-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 space-y-4 tabular-nums">
              <div className="border-l-4 border-[#003B3A] pl-3">
                <h4 className="text-sm font-bold text-[#003B3A]">
                  Kiểm thử đối chiếu quy chế (Đúng môn • Đúng hệ • Đúng thời điểm)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nhập thử hồ sơ học sinh để kiểm tra quy tắc khớp và danh sách môn khảo sát / miễn giảm.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Khối dự tuyển</label>
                  <select
                    value={simGrade}
                    onChange={e => setSimGrade(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#003B3A]"
                  >
                    {ALL_GRADES.map(g => (
                      <option key={g} value={g}>
                        Khối {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Hệ đăng ký</label>
                  <select
                    value={simSystem}
                    onChange={e => setSimSystem(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#003B3A]"
                  >
                    {k12Systems.map(s => (
                      <option key={s.code} value={s.code}>
                        {s.code} — {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Thời điểm tuyển sinh</label>
                  <select
                    value={simTiming}
                    onChange={e => setSimTiming(e.target.value as IntakeTimingCode)}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#003B3A]"
                  >
                    {INTAKE_TIMING_OPTIONS.map(t => (
                      <option key={t.code} value={t.code}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simHasTranscript}
                    onChange={e => setSimHasTranscript(e.target.checked)}
                    className="w-4 h-4 accent-[#00736E] rounded"
                  />
                  <span>Học sinh đã có bảng điểm / học bạ Bộ GD&ĐT</span>
                </label>
              </div>

              {simHasTranscript && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Xếp loại KQHT</label>
                    <select
                      value={simRating}
                      onChange={e => setSimRating(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-800"
                    >
                      <option value="Hoàn thành xuất sắc">Hoàn thành xuất sắc</option>
                      <option value="Hoàn thành tốt">Hoàn thành tốt</option>
                      <option value="Hoàn thành">Hoàn thành</option>
                      <option value="Tốt">Tốt / Giỏi</option>
                      <option value="Khá">Khá</option>
                      <option value="Đạt">Đạt / Trung bình</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Điểm Toán</label>
                    <input
                      type="number"
                      step="0.1"
                      value={simMath}
                      onChange={e => setSimMath(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#003B3A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {parseInt(simGrade, 10) <= 5 || (simGrade === "6" && simTiming === "DAU_NAM")
                        ? "Điểm Tiếng Việt"
                        : "Điểm Ngữ văn"}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={simLit}
                      onChange={e => setSimLit(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#003B3A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Điểm Tiếng Anh</label>
                    <input
                      type="number"
                      step="0.1"
                      value={simEng}
                      onChange={e => setSimEng(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#003B3A]"
                    />
                  </div>
                </div>
              )}

              {/* Kết quả mô phỏng */}
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#003B3A]">
                    Quy tắc khớp: {simulatedInsight.appliedRuleName}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${simulatedInsight.regulationBadgeColor}`}
                  >
                    {simulatedInsight.regulationBadgeLabel}
                  </span>
                </div>

                {simulatedInsight.transcriptBasis && (
                  <div className="text-xs text-slate-600">
                    <strong>Căn cứ xét tuyển:</strong> {simulatedInsight.transcriptBasis}
                  </div>
                )}

                <div className="space-y-1.5 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#003B3A]">Môn cần phân công:</span>
                    {simulatedInsight.recommendedSubjectNames.map(s => {
                      const isOrient = simulatedInsight.orientationSubjectNames.includes(s)
                      return (
                        <span
                          key={s}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            isOrient
                              ? "bg-[#F0FDFA] text-[#00736E] border-teal-200"
                              : "bg-[#003B3A] text-white border-[#003B3A]"
                          }`}
                        >
                          {getSubjectDisplayLabel(s)}
                          {isOrient ? " (Định hướng)" : ""}
                        </span>
                      )
                    })}
                  </div>

                  {simulatedInsight.exemptedSubjectNames.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-emerald-700">Môn được miễn:</span>
                      {simulatedInsight.exemptedSubjectNames.map(s => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold"
                        >
                          Miễn: {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {simulatedInsight.onRequestSubjectNames.length > 0 && (
                    <div className="text-[11px] text-slate-500">
                      Phỏng vấn theo đề nghị GV định hướng:{" "}
                      <strong>{simulatedInsight.onRequestSubjectNames.join(", ")}</strong>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-600 pt-2 border-t border-[#F1F5F9] leading-relaxed">
                  {simulatedInsight.regulationReason}
                </p>
              </div>
            </div>

            {/* Văn bản & Ghi chú Quy chế chung */}
            <div className="lg:col-span-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#003B3A] mb-1">
                    Tên văn bản / quyết định Quy chế tuyển sinh
                  </label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={config.documentTitle}
                    onChange={e => setConfig(prev => ({ ...prev, documentTitle: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#00A19A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#003B3A] mb-1">
                    Năm học áp dụng
                  </label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={config.effectiveYear}
                    onChange={e => setConfig(prev => ({ ...prev, effectiveYear: e.target.value }))}
                    placeholder="2026-2027"
                    className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#00A19A] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#003B3A] mb-1">
                  Tóm tắt văn bản Quy chế Tuyển sinh Phổ thông & lưu đồ định hướng
                </label>
                <textarea
                  rows={11}
                  disabled={readOnly}
                  value={config.generalNotes}
                  onChange={e => setConfig(prev => ({ ...prev, generalNotes: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs leading-relaxed text-slate-700 focus:bg-white focus:outline-none focus:border-[#00A19A]"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#F0FDFA]/70 border border-teal-200 flex items-start gap-2.5 text-xs text-slate-700">
                <Info className="w-4 h-4 text-[#00736E] shrink-0 mt-0.5" />
                <div>
                  Nội dung quy chế được đồng bộ trực tiếp sang màn hình <strong>Phân công khảo sát K-12</strong> và <strong>Danh sách học sinh khảo sát</strong> để tính toán tự động môn cần khảo sát và môn miễn giảm.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Thanh tác vụ cuối trang */}
      <div className="px-5 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 shrink-0 tabular-nums">
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <button
              type="button"
              onClick={handleApplyStandard2026}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#003B3A] border border-[#E2E8F0] text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#008B85]" />
              <span>Nạp chuẩn Quy chế Sky-Line 2026 (19 quy tắc)</span>
            </button>
          )}
          {config.updatedAt && (
            <span className="text-[11px] text-slate-500">
              Cập nhật lần cuối: {new Date(config.updatedAt).toLocaleString("vi-VN")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-[#E2E8F0] text-xs font-semibold transition-colors cursor-pointer"
            >
              Đóng
            </button>
          )}

          {!readOnly && (
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#003B3A] hover:bg-[#005854] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#5EEAD4]" />
              <span>{saving ? "Đang lưu quy chế..." : "Lưu cấu hình quy chế"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
