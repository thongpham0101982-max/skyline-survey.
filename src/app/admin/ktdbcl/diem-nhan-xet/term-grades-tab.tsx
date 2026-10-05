"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import * as XLSX from "xlsx"
import {
  FileSpreadsheet,
  Save,
  Upload,
  Download,
  RefreshCw,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Award,
  Layers,
  Calendar,
  X,
  ChevronRight,
  TrendingUp,
  Info,
  Sliders,
  CheckSquare,
  Square,
  BookOpen,
  Check,
  UserCheck,
  Smile,
  CheckCheck,
  Pencil,
  Plus,
  Trash2,
  Settings
} from "lucide-react"
import {
  evaluateStudentTT22,
  normalizeEvaluationGrade,
  isAssessmentOnlySubject,
  SubjectScoreItem
} from "@/lib/grading/tt22EvaluationEngine"
import {
  evaluateStudentTT27,
  PrimarySubjectGrade,
  PrimaryCompetencies,
  PrimaryQualities
} from "@/lib/grading/tt27EvaluationEngine"

// Helper to split full student name into Last Name (Họ đệm) and First Name (Tên)
function splitStudentName(fullName: string) {
  const trimmed = (fullName || "").trim()
  const idx = trimmed.lastIndexOf(" ")
  if (idx === -1) {
    return { lastName: "", firstName: trimmed }
  }
  return {
    lastName: trimmed.substring(0, idx).trim(),
    firstName: trimmed.substring(idx + 1).trim()
  }
}

export interface TermGradesTabProps {
  campuses?: any[]
  classes?: any[]
  subjects?: any[]
  academicYears?: any[]
  activeYearId: string
  initialClassId?: string
  isHomeroomView?: boolean
  homeroomClasses?: any[]
}

interface StudentRow {
  id: string
  stt: number
  studentCode: string
  studentName: string
  dob: string
  gender: string
  scores: Record<string, {
    score: number | null
    evaluationGrade: string | null
    subjectCode: string
    subjectName: string
  }>
  summary: {
    academicRating: string
    conductRating: string
    absencesPermitted: number
    absencesUnpermitted: number
    absencesTotal: number
    reward: string
    rewardUnexpected?: string
    otherReward?: string
    notes: string
    promoted: boolean
    competencies?: Record<string, string>
    qualities?: Record<string, string>
  }
}

// Danh sách các Năng lực & Phẩm chất chuẩn Tiểu học theo TT 27/2020/TT-BGDĐT
const GENERAL_COMPETENCIES = [
  { key: "selfReliance", label: "Tự chủ và tự học", short: "Tự chủ tự học" },
  { key: "communication", label: "Giao tiếp và hợp tác", short: "Giao tiếp hợp tác" },
  { key: "problemSolving", label: "GQVĐ và sáng tạo", short: "GQVĐ & Sáng tạo" }
]

const SPECIFIC_COMPETENCIES = [
  { key: "language", label: "Ngôn ngữ", short: "Ngôn ngữ" },
  { key: "math", label: "Tính toán", short: "Tính toán" },
  { key: "science", label: "Khoa học", short: "Khoa học" },
  { key: "technology", label: "Công nghệ", short: "Công nghệ" },
  { key: "informatics", label: "Tin học", short: "Tin học" },
  { key: "aesthetic", label: "Thẩm mĩ", short: "Thẩm mĩ" },
  { key: "physical", label: "Thể chất", short: "Thể chất" }
]

const KEY_QUALITIES = [
  { key: "patriotism", label: "Yêu nước", short: "Yêu nước" },
  { key: "compassion", label: "Nhân ái", short: "Nhân ái" },
  { key: "diligence", label: "Chăm chỉ", short: "Chăm chỉ" },
  { key: "honesty", label: "Trung thực", short: "Trung thực" },
  { key: "responsibility", label: "Trách nhiệm", short: "Trách nhiệm" }
]

export interface SubjectConfigItem {
  id: string
  subjectCode: string
  subjectName: string
  hasScore: boolean // true = Điểm (KTĐK / Điểm số), false = Nhận xét (mức đạt được / Đ, CĐ)
  selected: boolean // true = Đang chọn (hiển thị), false = Bỏ chọn (ẩn khỏi bảng)
  isCustom?: boolean
}

export function TermGradesTab({
  campuses = [],
  classes = [],
  subjects = [],
  academicYears = [],
  activeYearId,
  initialClassId,
  isHomeroomView = false,
  homeroomClasses = []
}: TermGradesTabProps) {
  // If isHomeroomView and homeroomClasses provided, prioritize homeroomClasses
  const effectiveClasses = useMemo(() => {
    if (isHomeroomView && homeroomClasses.length > 0) return homeroomClasses
    return classes
  }, [isHomeroomView, homeroomClasses, classes])

  // Filters state
  const [selectedYearId, setSelectedYearId] = useState<string>(activeYearId || (academicYears[0]?.id ?? ""))
  const [selectedCampus, setSelectedCampus] = useState<string>("ALL")
  const [selectedLevel, setSelectedLevel] = useState<"TIEU_HOC" | "THCS" | "THPT">("TIEU_HOC")
  const [selectedGrade, setSelectedGrade] = useState<string>("5")
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassId || (effectiveClasses[0]?.id ?? "")
  )
  const [selectedSemester, setSelectedSemester] = useState<"HK1" | "HK2" | "CN">("HK1")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Subject Config Modal & Configs by level_grade key
  const [showSubjectConfigModal, setShowSubjectConfigModal] = useState<boolean>(false)
  const [subjectConfigs, setSubjectConfigs] = useState<Record<string, SubjectConfigItem[]>>({})
  const [subjectSearchFilter, setSubjectSearchFilter] = useState<string>("")
  const [newSubName, setNewSubName] = useState<string>("")
  const [newSubCode, setNewSubCode] = useState<string>("")
  const [newSubHasScore, setNewSubHasScore] = useState<boolean>(true)

  // Load subject configs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("skyline_term_grades_subject_configs")
      if (saved) {
        setSubjectConfigs(JSON.parse(saved))
      }
    } catch (e) {
      console.error("Error loading subject configs from localStorage", e)
    }
  }, [])

  // Quick NL-PC batch fill modal & Individual NL-PC modal
  const [showNlPcBatchModal, setShowNlPcBatchModal] = useState<boolean>(false)
  const [editingStudentForNlPc, setEditingStudentForNlPc] = useState<StudentRow | null>(null)
  const [batchNlGrade, setBatchNlGrade] = useState<"T" | "Đ" | "C">("T")
  const [batchPcGrade, setBatchPcGrade] = useState<"T" | "Đ" | "C">("T")

  // Data state
  const [loading, setLoading] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [classInfo, setClassInfo] = useState<any>(null)
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Multi-sheet Import Modal state
  const [showImportModal, setShowImportModal] = useState<boolean>(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importSemester, setImportSemester] = useState<"HK1" | "HK2" | "CN">("HK1")
  const [importLoading, setImportLoading] = useState<boolean>(false)
  const [importResults, setImportResults] = useState<any | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  // Available grades options based on selected level
  const gradeOptions = useMemo(() => {
    if (selectedLevel === "TIEU_HOC") return ["1", "2", "3", "4", "5"]
    if (selectedLevel === "THCS") return ["6", "7", "8", "9"]
    return ["10", "11", "12"]
  }, [selectedLevel])

  // Reset grade if out of level bounds
  useEffect(() => {
    if (selectedLevel === "TIEU_HOC" && !["1", "2", "3", "4", "5"].includes(selectedGrade)) {
      setSelectedGrade("5")
    } else if (selectedLevel === "THCS" && !["6", "7", "8", "9"].includes(selectedGrade)) {
      setSelectedGrade("7")
    } else if (selectedLevel === "THPT" && !["10", "11", "12"].includes(selectedGrade)) {
      setSelectedGrade("10")
    }
  }, [selectedLevel, selectedGrade])

  // Sync initialClassId when prop changes
  useEffect(() => {
    if (initialClassId && initialClassId !== selectedClassId) {
      setSelectedClassId(initialClassId)
    }
  }, [initialClassId])

  // Auto-sync level and grade for selected class in homeroom view
  useEffect(() => {
    if (selectedClassId) {
      const cls = effectiveClasses.find(c => c.id === selectedClassId)
      if (cls) {
        const cGrade = String(cls.grade || "").trim()
        const cName = String(cls.className || "").trim()
        const cCode = String(cls.classCode || "").trim()
        const cGradeNum = cGrade.replace(/\D/g, "")
        const cNameNum = (cName.match(/^(\d+)/) || [])[1] || ""
        const cCodeNum = (cCode.match(/^(\d+)/) || [])[1] || ""
        const detectedGrade = cGradeNum || cNameNum || cCodeNum
        const detectedGradeInt = parseInt(detectedGrade, 10)
        const cLevel = String(cls.level || "").toLowerCase()

        let detectedLevel: "TIEU_HOC" | "THCS" | "THPT" = "TIEU_HOC"
        if (detectedGradeInt >= 10 || cLevel.includes("thpt") || cLevel.includes("cấp 3")) {
          detectedLevel = "THPT"
        } else if (detectedGradeInt >= 6 || cLevel.includes("thcs") || cLevel.includes("cấp 2")) {
          detectedLevel = "THCS"
        } else {
          detectedLevel = "TIEU_HOC"
        }

        if (isHomeroomView) {
          setSelectedLevel(detectedLevel)
          if (detectedGrade) {
            setSelectedGrade(detectedGrade)
          }
        }
      }
    }
  }, [selectedClassId, effectiveClasses, isHomeroomView])

  // Reset subject search filter when class or grade changes
  useEffect(() => {
    setSubjectSearchFilter("")
  }, [selectedClassId, selectedGrade, selectedLevel])

  // Filter classes according to Campus, Level, Grade (or return effectiveClasses in Homeroom view)
  const filteredClasses = useMemo(() => {
    if (isHomeroomView) {
      return effectiveClasses
    }
    return classes.filter(c => {
      // 1. Campus filter
      if (selectedCampus !== "ALL") {
        const cCode = c.campus?.campusCode || ""
        const cId = c.campusId || c.campus?.id || ""
        const cName = c.className || ""
        const cClassCode = c.classCode || ""
        const matchCampus =
          cCode.toUpperCase() === selectedCampus.toUpperCase() ||
          cId === selectedCampus ||
          cName.toUpperCase().includes(selectedCampus.toUpperCase()) ||
          cClassCode.toUpperCase().includes(selectedCampus.toUpperCase())
        if (!matchCampus) return false
      }

      // 2. Extract grade number
      const cGrade = String(c.grade || "").trim()
      const cName = String(c.className || "").trim()
      const cCode = String(c.classCode || "").trim()
      const cGradeNum = cGrade.replace(/\D/g, "")
      const cNameNum = (cName.match(/^(\d+)/) || [])[1] || ""
      const cCodeNum = (cCode.match(/^(\d+)/) || [])[1] || ""
      const detectedGrade = cGradeNum || cNameNum || cCodeNum
      const detectedGradeInt = parseInt(detectedGrade, 10)

      // 3. Level filter
      const cLevel = String(c.level || "").toLowerCase()
      if (selectedLevel === "TIEU_HOC") {
        const isPrimary =
          (detectedGradeInt >= 1 && detectedGradeInt <= 5) ||
          cLevel.includes("tiểu học") ||
          cLevel.includes("tieu hoc") ||
          cLevel.includes("cấp 1")
        if (!isPrimary) return false
      } else if (selectedLevel === "THCS") {
        const isTHCS =
          (detectedGradeInt >= 6 && detectedGradeInt <= 9) ||
          cLevel.includes("thcs") ||
          cLevel.includes("trung học cơ sở") ||
          cLevel.includes("cấp 2")
        if (!isTHCS) return false
      } else if (selectedLevel === "THPT") {
        const isTHPT =
          (detectedGradeInt >= 10 && detectedGradeInt <= 12) ||
          cLevel.includes("thpt") ||
          cLevel.includes("trung học phổ thông") ||
          cLevel.includes("cấp 3")
        if (!isTHPT) return false
      }

      // 4. Grade filter
      if (selectedGrade && selectedGrade !== "ALL") {
        const targetNum = selectedGrade.replace(/\D/g, "")
        const isMatch =
          detectedGrade === targetNum ||
          cGrade === selectedGrade ||
          cName.startsWith(`${targetNum}.`) ||
          cName.startsWith(`${targetNum}/`) ||
          cName.startsWith(`${targetNum}_`) ||
          cName.startsWith(targetNum)
        if (!isMatch) return false
      }

      return true
    })
  }, [isHomeroomView, effectiveClasses, classes, selectedCampus, selectedLevel, selectedGrade])

  // Auto-select first class when filteredClasses change
  useEffect(() => {
    if (isHomeroomView) return
    if (filteredClasses.length > 0) {
      if (!filteredClasses.some(c => c.id === selectedClassId)) {
        setSelectedClassId(filteredClasses[0].id)
      }
    } else {
      setSelectedClassId("")
      setStudents([])
      setClassInfo(null)
    }
  }, [filteredClasses, selectedClassId, isHomeroomView])

  // Load term grades data
  const loadTermGrades = async () => {
    if (!selectedClassId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/ktdbcl/term-grades?classId=${selectedClassId}&semester=${selectedSemester}&academicYearId=${selectedYearId}`
      )
      const data = await res.json()
      if (data.success) {
        setStudents(data.students || [])
        setClassInfo(data.classInfo || null)
      } else {
        setToastMessage({ type: "error", text: data.error || "Không thể tải điểm tổng kết" })
      }
    } catch (err: any) {
      console.error(err)
      setToastMessage({ type: "error", text: "Lỗi kết nối khi tải điểm tổng kết" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedClassId) {
      loadTermGrades()
    }
  }, [selectedClassId, selectedSemester, selectedYearId])

  // Build subject catalog according to Grade & Level
  const allAvailableSubjects = useMemo(() => {
    // 1. TIỂU HỌC (Thông tư 27)
    if (selectedLevel === "TIEU_HOC") {
      const gradeNum = parseInt(selectedGrade, 10) || 5

      // Khối 1-3 vs Khối 4-5
      const primarySubjectDefs = [
        { code: "TVI", name: "Tiếng Việt", hasScore: true, hasLevel: true },
        { code: "TOA", name: "Toán", hasScore: true, hasLevel: true },
        ...(gradeNum >= 4
          ? [
              { code: "SCI", name: "Khoa học", hasScore: true, hasLevel: true },
              { code: "LSU", name: "Lịch sử và Địa lí", hasScore: true, hasLevel: true }
            ]
          : [
              { code: "TN-XH", name: "Tự nhiên và Xã hội", hasScore: false, hasLevel: true }
            ]),
        { code: "TA", name: "Tiếng Anh", hasScore: true, hasLevel: true },
        ...(gradeNum >= 4
          ? [
              { code: "STE", name: "Tin học và Công nghệ (Công nghệ)", hasScore: true, hasLevel: true }
            ]
          : []),
        { code: "GTC", name: "Giáo dục thể chất", hasScore: false, hasLevel: true },
        { code: "ANA", name: "Nghệ thuật (Âm nhạc)", hasScore: false, hasLevel: true },
        { code: "MTU", name: "Nghệ thuật (Mĩ thuật)", hasScore: false, hasLevel: true },
        { code: "HDTNHN", name: "Hoạt động trải nghiệm", hasScore: false, hasLevel: true },
        { code: "TIN_HOC", name: "Tin học và Công nghệ (Tin học)", hasScore: gradeNum >= 3, hasLevel: true },
        { code: "GCD", name: "Đạo đức", hasScore: false, hasLevel: true }
      ]

      const matched: any[] = []
      primarySubjectDefs.forEach(def => {
        const found = subjects.find(s => {
          const sCode = s.subjectCode.toUpperCase()
          const sName = s.subjectName.toLowerCase()
          return (
            sCode === def.code ||
            sCode.includes(def.code) ||
            sName.includes(def.name.toLowerCase()) ||
            (def.code === "SCI" && sName.includes("khoa học")) ||
            (def.code === "LSU" && (sName.includes("lịch sử") || sName.includes("địa lí"))) ||
            (def.code === "TVI" && sName.includes("tiếng việt")) ||
            (def.code === "TOA" && sName.includes("toán")) ||
            (def.code === "TA" && (sName.includes("tiếng anh") || sCode === "TAV")) ||
            (def.code === "GTC" && sName.includes("thể chất")) ||
            (def.code === "ANA" && sName.includes("âm nhạc")) ||
            (def.code === "MTU" && (sName.includes("mĩ thuật") || sName.includes("mỹ thuật"))) ||
            (def.code === "GCD" && (sName.includes("đạo đức") || sName.includes("công dân"))) ||
            (def.code === "HDTNHN" && sName.includes("trải nghiệm"))
          )
        })

        matched.push({
          id: found ? found.id : `virt-${def.code}`,
          subjectCode: found ? found.subjectCode : def.code,
          subjectName: def.name,
          hasScore: def.hasScore,
          hasLevel: def.hasLevel
        })
      })

      return { allScored: matched, allAssess: [] }
    }

    // 2. THCS & THPT (Thông tư 22)
    const isTHCS = selectedLevel === "THCS"
    const thcsScoredOrder = ["TOA", "NVA", "TA", "TAV", "KHT", "KHTN", "LSU", "LICH_SU", "DLI", "TIN_HOC", "ICT", "GCD", "STE", "STEM"]
    const thcsAssessOrder = ["GTC", "MI_THUAT", "MTU", "AM_NHAC", "ANA", "NDGDCDP", "HDTNHN"]

    const thptScoredOrder = ["TOA", "VLI", "HHO", "SHO", "TIN_HOC", "ICT", "NVA", "LICH_SU", "LSU", "DLI", "TA", "TAV", "TNH", "GDKTPL", "GKP", "GDQPAN"]
    const thptAssessOrder = ["GTC", "MI_THUAT", "MTU", "AM_NHAC", "ANA", "NDGDCDP", "HDTNHN"]

    const targetScoredCodes = isTHCS ? thcsScoredOrder : thptScoredOrder
    const targetAssessCodes = isTHCS ? thcsAssessOrder : thptAssessOrder

    const scored: any[] = []
    const assess: any[] = []

    subjects.forEach(sub => {
      const isAssess = isAssessmentOnlySubject(sub.subjectName || sub.subjectCode)
      const codeUpper = sub.subjectCode.toUpperCase()

      if (isAssess) {
        if (targetAssessCodes.some(c => codeUpper.includes(c))) {
          if (!assess.some(a => a.id === sub.id)) {
            assess.push(sub)
          }
        }
      } else {
        if (targetScoredCodes.some(c => codeUpper === c || codeUpper.includes(c))) {
          if (!scored.some(s => s.id === sub.id)) {
            scored.push(sub)
          }
        }
      }
    })

    const activeScoredOrder = isTHCS ? thcsScoredOrder : thptScoredOrder
    scored.sort((a, b) => {
      const idxA = activeScoredOrder.indexOf(a.subjectCode.toUpperCase())
      const idxB = activeScoredOrder.indexOf(b.subjectCode.toUpperCase())
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB)
    })

    const activeAssessOrder = isTHCS ? thcsAssessOrder : thptAssessOrder
    assess.sort((a, b) => {
      const idxA = activeAssessOrder.indexOf(a.subjectCode.toUpperCase())
      const idxB = activeAssessOrder.indexOf(b.subjectCode.toUpperCase())
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB)
    })

    return { allScored: scored, allAssess: assess }
  }, [subjects, selectedLevel, selectedGrade])

  // Key identify current Level & Grade
  const currentLevelGradeKey = `${selectedLevel}_${selectedGrade}`

  // Current active subject list for configuration & rendering
  const currentSubjectList: SubjectConfigItem[] = useMemo(() => {
    if (subjectConfigs[currentLevelGradeKey] && subjectConfigs[currentLevelGradeKey].length > 0) {
      return subjectConfigs[currentLevelGradeKey]
    }
    // Default list from catalog
    if (selectedLevel === "TIEU_HOC") {
      return allAvailableSubjects.allScored.map(s => ({
        id: s.id,
        subjectCode: s.subjectCode,
        subjectName: s.subjectName,
        hasScore: Boolean(s.hasScore),
        selected: true,
        isCustom: false
      }))
    } else {
      return [
        ...allAvailableSubjects.allScored.map(s => ({
          id: s.id,
          subjectCode: s.subjectCode,
          subjectName: s.subjectName,
          hasScore: true,
          selected: true,
          isCustom: false
        })),
        ...allAvailableSubjects.allAssess.map(s => ({
          id: s.id,
          subjectCode: s.subjectCode,
          subjectName: s.subjectName,
          hasScore: false,
          selected: true,
          isCustom: false
        }))
      ]
    }
  }, [subjectConfigs, currentLevelGradeKey, allAvailableSubjects, selectedLevel])

  // Active displayed subjects according to user configuration
  const { scoredSubjects, assessmentSubjects } = useMemo(() => {
    if (selectedLevel === "TIEU_HOC") {
      return {
        scoredSubjects: currentSubjectList.filter(s => s.selected),
        assessmentSubjects: []
      }
    } else {
      return {
        scoredSubjects: currentSubjectList.filter(s => s.selected && s.hasScore),
        assessmentSubjects: currentSubjectList.filter(s => s.selected && !s.hasScore)
      }
    }
  }, [currentSubjectList, selectedLevel])

  // Save updated list to state & localStorage
  const saveCurrentSubjectList = (newList: SubjectConfigItem[]) => {
    setSubjectConfigs(prev => {
      const updated = { ...prev, [currentLevelGradeKey]: newList }
      try {
        localStorage.setItem("skyline_term_grades_subject_configs", JSON.stringify(updated))
      } catch (e) {
        console.error(e)
      }
      return updated
    })
  }

  // 1. Toggle Bỏ chọn / Chọn môn
  const handleToggleSelectSubject = (subjectId: string) => {
    const nextList = currentSubjectList.map(s =>
      s.id === subjectId ? { ...s, selected: !s.selected } : s
    )
    saveCurrentSubjectList(nextList)
  }

  // 2. Chọn tất cả / Bỏ chọn tất cả
  const handleSelectAllSubjects = (selectedState: boolean) => {
    const nextList = currentSubjectList.map(s => ({ ...s, selected: selectedState }))
    saveCurrentSubjectList(nextList)
  }

  // 3. Đổi loại hình: Điểm <-> Nhận xét
  const handleChangeEvaluationType = (subjectId: string, hasScore: boolean) => {
    const nextList = currentSubjectList.map(s =>
      s.id === subjectId ? { ...s, hasScore } : s
    )
    saveCurrentSubjectList(nextList)
  }

  // 4. Thêm môn mới (Điểm hoặc Nhận xét)
  const handleAddNewSubject = () => {
    if (!newSubName.trim()) {
      setToastMessage({ type: "error", text: "Vui lòng nhập tên môn học cần thêm" })
      return
    }

    const cleanCode = newSubCode.trim().toUpperCase() ||
      newSubName.trim().slice(0, 4).toUpperCase().replace(/\s+/g, "")

    const newSub: SubjectConfigItem = {
      id: `custom-sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      subjectCode: cleanCode,
      subjectName: newSubName.trim(),
      hasScore: newSubHasScore,
      selected: true,
      isCustom: true
    }

    saveCurrentSubjectList([...currentSubjectList, newSub])
    setNewSubName("")
    setNewSubCode("")
    setToastMessage({
      type: "success",
      text: `Đã thêm môn "${newSub.subjectName}" (${newSub.hasScore ? "Điểm" : "Nhận xét"}) thành công!`
    })
  }

  // 5. Xóa môn tùy biến
  const handleDeleteCustomSubject = (subjectId: string) => {
    const nextList = currentSubjectList.filter(s => s.id !== subjectId)
    saveCurrentSubjectList(nextList)
    setToastMessage({ type: "success", text: "Đã xóa môn học tùy biến" })
  }

  // 6. Đặt lại danh sách mặc định theo Thông tư
  const handleResetToDefaultSubjects = () => {
    setSubjectConfigs(prev => {
      const next = { ...prev }
      delete next[currentLevelGradeKey]
      try {
        localStorage.setItem("skyline_term_grades_subject_configs", JSON.stringify(next))
      } catch (e) {
        console.error(e)
      }
      return next
    })
    setToastMessage({ type: "success", text: "Đã khôi phục danh sách môn học mặc định theo quy định của Bộ GD&ĐT!" })
  }

  // Filter subjects in config modal by search query
  const filteredSubjectsForConfig = useMemo(() => {
    if (!subjectSearchFilter.trim()) return currentSubjectList
    const q = subjectSearchFilter.toLowerCase().trim()
    return currentSubjectList.filter(s =>
      s.subjectName.toLowerCase().includes(q) ||
      s.subjectCode.toLowerCase().includes(q)
    )
  }, [currentSubjectList, subjectSearchFilter])

  // Filter students by search term
  const displayedStudents = useMemo(() => {
    if (!searchQuery.trim()) return students
    const query = searchQuery.toLowerCase().trim()
    return students.filter(st =>
      st.studentCode.toLowerCase().includes(query) ||
      st.studentName.toLowerCase().includes(query)
    )
  }, [students, searchQuery])

  // Handle score change in cell
  const handleScoreChange = (studentId: string, subjectId: string, val: string) => {
    setStudents(prev => prev.map(st => {
      if (st.id !== studentId) return st

      const newScores = { ...st.scores }
      const current = newScores[subjectId] || {
        score: null,
        evaluationGrade: null,
        subjectCode: "",
        subjectName: ""
      }

      const cleanVal = val.trim()
      const lower = cleanVal.toLowerCase()
      if (lower === "miễn" || lower === "m" || lower === "mien") {
        newScores[subjectId] = { ...current, score: null, evaluationGrade: "Miễn" }
      } else if (cleanVal === "") {
        newScores[subjectId] = {
          ...current,
          score: null,
          evaluationGrade: current.evaluationGrade === "Miễn" ? null : current.evaluationGrade
        }
      } else {
        const num = parseFloat(cleanVal.replace(",", "."))
        if (!isNaN(num)) {
          newScores[subjectId] = {
            ...current,
            score: num,
            evaluationGrade: current.evaluationGrade === "Miễn" ? null : current.evaluationGrade
          }
        }
      }

      return { ...st, scores: newScores }
    }))
  }

  // Handle evaluation level change (Mức đạt được: T, H, C, Miễn)
  const handleLevelChange = (studentId: string, subjectId: string, level: string) => {
    setStudents(prev => prev.map(st => {
      if (st.id !== studentId) return st
      const newScores = { ...st.scores }
      const current = newScores[subjectId] || {
        score: null,
        evaluationGrade: null,
        subjectCode: "",
        subjectName: ""
      }
      if (level === "Miễn") {
        newScores[subjectId] = {
          ...current,
          evaluationGrade: "Miễn",
          score: null
        }
      } else {
        newScores[subjectId] = {
          ...current,
          evaluationGrade: level || null
        }
      }
      return { ...st, scores: newScores }
    }))
  }

  // Handle competency / quality change
  const handleCompetencyChange = (studentId: string, type: "competencies" | "qualities", key: string, val: string) => {
    setStudents(prev => prev.map(st => {
      if (st.id !== studentId) return st
      const curDict = { ...(st.summary[type] || {}) }
      curDict[key] = val
      return {
        ...st,
        summary: {
          ...st.summary,
          [type]: curDict
        }
      }
    }))
  }

  // Handle summary field change
  const handleSummaryChange = (studentId: string, field: string, val: any) => {
    setStudents(prev => prev.map(st => {
      if (st.id !== studentId) return st
      const updatedSummary = { ...st.summary, [field]: val }

      if (field === "absencesPermitted" || field === "absencesUnpermitted") {
        const p = field === "absencesPermitted" ? (parseInt(val, 10) || 0) : updatedSummary.absencesPermitted
        const k = field === "absencesUnpermitted" ? (parseInt(val, 10) || 0) : updatedSummary.absencesUnpermitted
        updatedSummary.absencesTotal = p + k
      }

      return { ...st, summary: updatedSummary }
    }))
  }

  // Batch fill Năng lực & Phẩm chất cho cả lớp
  const handleApplyBatchNlPc = () => {
    setStudents(prev => prev.map(st => {
      const newComp: Record<string, string> = {}
      GENERAL_COMPETENCIES.forEach(c => (newComp[c.key] = batchNlGrade))
      SPECIFIC_COMPETENCIES.forEach(c => (newComp[c.key] = batchNlGrade))

      const newQual: Record<string, string> = {}
      KEY_QUALITIES.forEach(q => (newQual[q.key] = batchPcGrade))

      return {
        ...st,
        summary: {
          ...st.summary,
          competencies: newComp,
          qualities: newQual
        }
      }
    }))

    setShowNlPcBatchModal(false)
    setToastMessage({
      type: "success",
      text: `Đã áp dụng nhanh Năng lực (${batchNlGrade}) & Phẩm chất (${batchPcGrade}) cho cả lớp!`
    })
  }

  // Auto Calculate (TT27 for Primary, TT22 for Secondary)
  const handleAutoCalculate = () => {
    if (students.length === 0) {
      setToastMessage({ type: "error", text: "Không có học sinh nào trong bảng để tính" })
      return
    }

    let calculatedCount = 0

    if (selectedLevel === "TIEU_HOC") {
      // Tính theo Thông tư 27
      setStudents(prev => prev.map(st => {
        const subjectGrades: Record<string, PrimarySubjectGrade> = {}
        scoredSubjects.forEach(sub => {
          const sc = st.scores[sub.id]
          const isMien = sc?.evaluationGrade === "Miễn"
          subjectGrades[sub.id] = {
            level: (sc?.evaluationGrade as any) || "",
            score: isMien ? "Miễn" : (sc?.score ?? null)
          }
        })

        const evalRes = evaluateStudentTT27({
          subjects: subjectGrades,
          competencies: (st.summary.competencies as any) || {},
          qualities: (st.summary.qualities as any) || {},
          semester: selectedSemester
        })

        calculatedCount++

        return {
          ...st,
          summary: {
            ...st.summary,
            academicRating: evalRes.academicRating,
            reward: evalRes.rewardEndOfYear ? (evalRes.rewardTitle || "Học sinh Xuất sắc") : "",
            promoted: evalRes.promoted,
            notes: evalRes.notes || st.summary.notes
          }
        }
      }))

      setToastMessage({
        type: "success",
        text: `Đã tính toán xếp loại tổng kết Tiểu học cho ${calculatedCount} học sinh theo TT 27/2020/TT-BGDĐT!`
      })
    } else {
      // Tính theo Thông tư 22 (THCS / THPT)
      setStudents(prev => prev.map(st => {
        const scoreItems: Record<string, SubjectScoreItem> = {}

        scoredSubjects.forEach(sub => {
          const sData = st.scores[sub.id]
          scoreItems[sub.id] = {
            subjectId: sub.id,
            subjectCode: sub.subjectCode,
            subjectName: sub.subjectName,
            isEvaluationOnly: false,
            score: sData?.score ?? null,
            evaluationGrade: sData?.evaluationGrade ?? null
          }
        })

        assessmentSubjects.forEach(sub => {
          const aData = st.scores[sub.id]
          scoreItems[sub.id] = {
            subjectId: sub.id,
            subjectCode: sub.subjectCode,
            subjectName: sub.subjectName,
            isEvaluationOnly: true,
            score: null,
            evaluationGrade: aData?.evaluationGrade ?? null
          }
        })

        const evalRes = evaluateStudentTT22({
          scores: scoreItems,
          conductRating: st.summary.conductRating || "Tốt",
          semester: selectedSemester
        })

        calculatedCount++

        return {
          ...st,
          summary: {
            ...st.summary,
            academicRating: evalRes.academicRating,
            conductRating: evalRes.conductRating,
            reward: evalRes.reward || st.summary.reward,
            notes: evalRes.notes || st.summary.notes,
            promoted: evalRes.promoted ?? st.summary.promoted
          }
        }
      }))

      setToastMessage({
        type: "success",
        text: `Đã tính toán thành công kết quả tổng kết cho ${calculatedCount} học sinh theo TT 22/2021/TT-BGDĐT!`
      })
    }
  }

  // Save changes to API
  const handleSaveGrades = async () => {
    if (!selectedClassId || students.length === 0) return

    setSaving(true)
    try {
      const payload = {
        classId: selectedClassId,
        semester: selectedSemester,
        academicYearId: selectedYearId,
        students: students.map(st => ({
          studentId: st.id,
          scores: st.scores,
          summary: st.summary
        }))
      }

      const res = await fetch("/api/admin/ktdbcl/term-grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (data.success) {
        setToastMessage({ type: "success", text: data.message || "Đã lưu bảng điểm tổng kết thành công!" })
      } else {
        setToastMessage({ type: "error", text: data.error || "Không thể lưu bảng điểm" })
      }
    } catch (err: any) {
      console.error(err)
      setToastMessage({ type: "error", text: "Lỗi kết nối khi lưu bảng điểm" })
    } finally {
      setSaving(false)
    }
  }

  // Export current class to Excel
  const handleExportExcel = () => {
    if (students.length === 0) {
      setToastMessage({ type: "error", text: "Không có dữ liệu để xuất file" })
      return
    }

    const className = classInfo?.className || "Lop"
    const wb = XLSX.utils.book_new()

    if (selectedLevel === "TIEU_HOC") {
      // Export Tiểu học format (Chuẩn TT27 cho HK1 hoặc Cả năm)
      const isHk1 = selectedSemester === "HK1"

      const headerRow1 = [
        "STT",
        "Mã học sinh",
        "Họ và đệm",
        "Tên",
        "Ngày sinh",
        "Nữ",
        ...scoredSubjects.flatMap(s => (s.hasScore ? [`${s.subjectName} (Mức)`, `${s.subjectName} (Điểm)`] : [`${s.subjectName} (Mức)`])),
        ...GENERAL_COMPETENCIES.map(c => `NL: ${c.label}`),
        ...SPECIFIC_COMPETENCIES.map(c => `NL: ${c.label}`),
        ...KEY_QUALITIES.map(q => `PC: ${q.label}`),
        ...(isHk1
          ? ["Ghi chú"]
          : [
              "Đánh giá KQGD",
              "Khen thưởng cuối năm",
              "Khen thưởng đột xuất",
              "Khen thưởng khác",
              "Lên lớp",
              "Ghi chú"
            ])
      ]

      const dataRows = students.map((st, idx) => {
        const isNu = (st.gender || "").toLowerCase().includes("nữ") || (st.gender || "").toLowerCase().includes("female")
        const { lastName, firstName } = splitStudentName(st.studentName)
        const subVals: any[] = []

        scoredSubjects.forEach(s => {
          const sc = st.scores[s.id]
          const isMien = sc?.evaluationGrade === "Miễn"
          subVals.push(isMien ? "Miễn" : (sc?.evaluationGrade || ""))
          if (s.hasScore) {
            subVals.push(isMien ? "Miễn" : (sc?.score !== null && sc?.score !== undefined ? sc.score : ""))
          }
        })

        const compVals = [
          ...GENERAL_COMPETENCIES.map(c => st.summary.competencies?.[c.key] || ""),
          ...SPECIFIC_COMPETENCIES.map(c => st.summary.competencies?.[c.key] || "")
        ]

        const qualVals = KEY_QUALITIES.map(q => st.summary.qualities?.[q.key] || "")

        if (isHk1) {
          return [
            idx + 1,
            st.studentCode,
            lastName,
            firstName,
            st.dob || "",
            isNu ? "✓" : "",
            ...subVals,
            ...compVals,
            ...qualVals,
            st.summary.notes || ""
          ]
        }

        return [
          idx + 1,
          st.studentCode,
          lastName,
          firstName,
          st.dob || "",
          isNu ? "✓" : "",
          ...subVals,
          ...compVals,
          ...qualVals,
          st.summary.academicRating || "",
          st.summary.reward ? "✓" : "",
          st.summary.rewardUnexpected ? "✓" : "",
          st.summary.otherReward || "",
          st.summary.promoted ? "✓" : "",
          st.summary.notes || ""
        ]
      })

      const ws = XLSX.utils.aoa_to_sheet([headerRow1, ...dataRows])
      XLSX.utils.book_append_sheet(wb, ws, className.replace(/[/\\?*[\]]/g, "_").slice(0, 31))
      XLSX.writeFile(wb, `Diem_Tong_Ket_Tieu_Hoc_${className}_${selectedSemester}.xlsx`)
    } else {
      // Export THCS / THPT format
      const row1 = [
        "STT",
        "Mã học sinh",
        "Họ và tên",
        "Ngày sinh",
        ...scoredSubjects.map(s => s.subjectName),
        ...assessmentSubjects.map(s => s.subjectName),
        "Kết quả học tập",
        "Kết quả rèn luyện",
        "Nghỉ P",
        "Nghỉ K",
        "Tổng nghỉ",
        "Danh hiệu thi đua",
        "Ghi chú"
      ]

      const dataRows = students.map((st, idx) => {
        const scoredVals = scoredSubjects.map(s => {
          const sc = st.scores[s.id]
          if (sc?.evaluationGrade === "Miễn") return "Miễn"
          return sc?.score !== null && sc?.score !== undefined ? sc.score : ""
        })

        const assessVals = assessmentSubjects.map(s => {
          const sc = st.scores[s.id]
          return sc?.evaluationGrade || ""
        })

        return [
          idx + 1,
          st.studentCode,
          st.studentName,
          st.dob || "",
          ...scoredVals,
          ...assessVals,
          st.summary.academicRating || "",
          st.summary.conductRating || "",
          st.summary.absencesPermitted ?? 0,
          st.summary.absencesUnpermitted ?? 0,
          st.summary.absencesTotal ?? 0,
          st.summary.reward || "",
          st.summary.notes || ""
        ]
      })

      const ws = XLSX.utils.aoa_to_sheet([row1, ...dataRows])
      XLSX.utils.book_append_sheet(wb, ws, className.replace(/[/\\?*[\]]/g, "_").slice(0, 31))
      XLSX.writeFile(wb, `BGD_Diem_Tong_Ket_${className}_${selectedSemester}.xlsx`)
    }

    setToastMessage({ type: "success", text: `Đã xuất file Excel lớp ${className} thành công!` })
  }

  // Handle Multi-Sheet Import
  const handleUploadMultiSheet = async () => {
    if (!importFile) {
      setToastMessage({ type: "error", text: "Vui lòng chọn file Excel" })
      return
    }

    setImportLoading(true)
    setImportResults(null)

    try {
      const formData = new FormData()
      formData.append("file", importFile)
      formData.append("semester", importSemester)
      formData.append("academicYearId", selectedYearId)

      const res = await fetch("/api/admin/ktdbcl/term-grades/import-multi-sheet", {
        method: "POST",
        body: formData
      })

      const data = await res.json()
      if (data.success) {
        setImportResults(data)
        setToastMessage({ type: "success", text: data.message })
        loadTermGrades()
      } else {
        setToastMessage({ type: "error", text: data.error || "Lỗi nạp file Excel" })
      }
    } catch (err: any) {
      console.error(err)
      setToastMessage({ type: "error", text: "Lỗi kết nối khi nạp file Excel" })
    } finally {
      setImportLoading(false)
    }
  }

  const isPrimary = selectedLevel === "TIEU_HOC"

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm transition-all duration-300 ${
            toastMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="font-medium">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {isHomeroomView
                  ? `Điểm Tổng Kết Môn Học - Lớp Chủ Nhiệm ${classInfo?.className || ""}`
                  : isPrimary
                  ? "Bảng Điểm Tổng Kết Tiểu Học (Thông tư 27/2020/TT-BGDĐT)"
                  : "Bảng Điểm Tổng Kết THCS & THPT (Thông tư 22/2021/TT-BGDĐT)"}
              </h2>
              <p className="text-xs text-slate-500">
                {isHomeroomView
                  ? `Dành cho Giáo viên Chủ nhiệm (GVCN) rà soát, đánh giá kết quả học tập & xếp loại tổng kết theo ${
                      isPrimary ? "Thông tư 27/2020/TT-BGDĐT (Tiểu học)" : "Thông tư 22/2021/TT-BGDĐT (THCS/THPT)"
                    }.`
                  : isPrimary
                  ? "Đánh giá Môn học (Mức đạt & Điểm KTĐK), Năng lực chung, Năng lực đặc thù, Phẩm chất và Đánh giá KQGD."
                  : "Quản lý điểm số, môn nhận xét, kết quả học tập & rèn luyện, buổi nghỉ và danh hiệu thi đua."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPrimary && (
              <button
                onClick={() => setShowNlPcBatchModal(true)}
                disabled={loading || students.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold shadow-xs transition"
                title="Nhập nhanh Năng lực & Phẩm chất hàng loạt"
              >
                <CheckCheck className="w-4 h-4 text-sky-600" />
                <span>Nhập nhanh NL-PC</span>
              </button>
            )}

            <button
              onClick={handleAutoCalculate}
              disabled={loading || students.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
              title={isPrimary ? "Tính tổng kết theo Thông tư 27" : "Tính tổng kết theo Thông tư 22"}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isPrimary ? "Tính tổng kết (TT27)" : "Tính tổng kết (TT22)"}</span>
            </button>

            <button
              onClick={handleSaveGrades}
              disabled={saving || loading || students.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Lưu bảng điểm</span>
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              <Upload className="w-4 h-4 text-slate-600" />
              <span>Nhập Excel nhiều sheet</span>
            </button>

            <button
              onClick={() => setShowSubjectConfigModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold shadow-xs transition"
              title="Cấu hình môn học: Thêm môn (Điểm, Nhận xét), Bỏ chọn môn cho ba bậc học"
            >
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Cấu hình môn ({scoredSubjects.length + assessmentSubjects.length})</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={students.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Filter bar dropdowns */}
        {isHomeroomView ? (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Lớp chủ nhiệm */}
              <div className="min-w-[200px]">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Lớp chủ nhiệm:
                </label>
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="w-full text-xs font-black text-indigo-900 border-2 border-indigo-200 rounded-xl px-3 py-2 bg-indigo-50/50 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {effectiveClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.className} - {c.campus?.name || c.campus?.campusName || "Cơ sở"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Học kỳ */}
              <div className="min-w-[170px]">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Kỳ tổng kết:
                </label>
                <select
                  value={selectedSemester}
                  onChange={e => setSelectedSemester(e.target.value as any)}
                  className="w-full text-xs font-extrabold border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                >
                  <option value="HK1">Học kỳ 1 (HK1)</option>
                  <option value="HK2">{isPrimary ? "Học kỳ 2 / Cả năm (HK2 / CN)" : "Học kỳ 2 (HK2)"}</option>
                  {!isPrimary && <option value="CN">Cả năm (CN)</option>}
                </select>
              </div>

              {/* Cấp học & Khối badge */}
              <div className="flex items-center gap-2 mt-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-800">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  {isPrimary ? "Tiểu học (TT 27)" : selectedLevel === "THCS" ? "THCS (TT 22)" : "THPT (TT 22)"}
                </span>
                <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                  Khối {selectedGrade}
                </span>
              </div>
            </div>

            {/* Tìm kiếm học sinh */}
            <div className="relative min-w-[220px] mt-4 sm:mt-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm mã hoặc tên HS..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50/50"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100">
            {/* Cơ sở */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Cơ sở / Hệ thống</label>
              <select
                value={selectedCampus}
                onChange={e => setSelectedCampus(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="ALL">Toàn hệ thống (Tất cả)</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.campusCode || c.id}>
                    {c.campusName} ({c.campusCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Cấp học: TIỂU HỌC | THCS | THPT */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Cấp học</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedLevel("TIEU_HOC")}
                  className={`py-1.5 text-[11px] font-semibold rounded-md transition ${
                    selectedLevel === "TIEU_HOC"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tiểu học
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLevel("THCS")}
                  className={`py-1.5 text-[11px] font-semibold rounded-md transition ${
                    selectedLevel === "THCS"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  THCS
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLevel("THPT")}
                  className={`py-1.5 text-[11px] font-semibold rounded-md transition ${
                    selectedLevel === "THPT"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  THPT
                </button>
              </div>
            </div>

            {/* Khối */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Khối lớp</label>
              <select
                value={selectedGrade}
                onChange={e => setSelectedGrade(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {gradeOptions.map(g => (
                  <option key={g} value={g}>
                    Khối {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Lớp */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Lớp học ({filteredClasses.length})
              </label>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                disabled={filteredClasses.length === 0}
                className="w-full text-xs font-semibold border border-indigo-300 rounded-lg p-2 bg-indigo-50/50 text-indigo-950 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {filteredClasses.length === 0 ? (
                  <option value="">Không có lớp</option>
                ) : (
                  filteredClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.className || c.classCode}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Học kỳ */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Kỳ đánh giá</label>
              <select
                value={selectedSemester}
                onChange={e => setSelectedSemester(e.target.value as any)}
                className="w-full text-xs font-semibold border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800"
              >
                <option value="HK1">Học kỳ 1 (HK1)</option>
                <option value="HK2">{isPrimary ? "Học kỳ 2 / Cả năm" : "Học kỳ 2 (HK2)"}</option>
                {!isPrimary && <option value="CN">Cả năm (CN)</option>}
              </select>
            </div>

            {/* Tìm kiếm */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Tìm học sinh</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Mã hoặc tên HS..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg pl-8 pr-2.5 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>
        )}

        {/* Info & Customization Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Cấu trúc Form:
            </span>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded text-[11px]">
              {isPrimary ? `Tiểu học - Khối ${selectedGrade} (TT27)` : `Khối ${selectedGrade} - ${selectedLevel} (TT22)`}
            </span>
            <span className="font-semibold text-slate-800">
              Lớp: <span className="text-indigo-600 font-bold">{classInfo?.className || filteredClasses.find(c => c.id === selectedClassId)?.className || "Chưa chọn lớp"}</span>
            </span>
            <span className="text-slate-400">•</span>
            {isPrimary ? (
              <span className="text-emerald-700 font-medium">
                {scoredSubjects.length} Môn học & HĐGD + 10 Năng lực + 5 Phẩm chất
              </span>
            ) : (
              <>
                <span className="text-blue-700 font-medium">{scoredSubjects.length} Môn tính điểm (HS 1)</span>
                <span className="text-slate-400">•</span>
                <span className="text-emerald-700 font-medium">{assessmentSubjects.length} Môn nhận xét</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSubjectConfigModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-xs font-bold transition shadow-xs"
              title="Cấu hình môn học: Thêm môn (Điểm, Nhận xét), Bỏ chọn môn cho ba bậc học"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tùy chỉnh môn ({scoredSubjects.length + assessmentSubjects.length})</span>
            </button>
            {isPrimary && (
              <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-2">
                <span>•</span>
                <span>Mức môn: <strong>T</strong>, <strong>H</strong>, <strong>C</strong></span>
                <span>•</span>
                <span>NL & PC: <strong>T</strong>, <strong>Đ</strong>, <strong>C</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Table Area */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Đang tải bảng điểm tổng kết...</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            Không tìm thấy lớp học nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : displayedStudents.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            {searchQuery ? "Không tìm thấy học sinh phù hợp với từ khóa." : "Lớp học chưa có học sinh nào."}
          </div>
        ) : isPrimary ? (
          /* ========================================================================= */
          /* FORM TIỂU HỌC (CHUẨN THÔNG TƯ 27/2020/TT-BGDĐT - BÁM SÁT 100% 4 ẢNH VNEDU)*/
          /* ========================================================================= */
          <div>
            {/* Sub-header Banner vnEdu Chuẩn TT27 */}
            <div className="bg-slate-100/90 border-b border-slate-300 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-700">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Lớp: <strong className="text-slate-900 font-bold">{classInfo?.className || filteredClasses.find(c => c.id === selectedClassId)?.className || ""}</strong> - <strong className="text-indigo-700">{selectedSemester === "HK1" ? "Học kỳ 1" : "Cả năm"}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Giáo viên chủ nhiệm: <strong className="text-slate-900 font-bold">{classInfo?.homeroomTeacherName || "---"}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Quyền hạn: <strong className="text-emerald-700 font-bold">Bạn có quyền nhập</strong>
                </span>
              </div>
              {selectedSemester !== "HK1" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setToastMessage({ type: "success", text: "Đã gửi danh sách lên Hiệu trưởng xét duyệt lên lớp thành công!" })}
                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded text-[11px] shadow-xs transition"
                  >
                    Gửi hiệu trưởng xét lên lớp
                  </button>
                  <button
                    type="button"
                    onClick={() => setToastMessage({ type: "success", text: "Hiệu trưởng đã phê duyệt danh sách lên lớp của lớp!" })}
                    className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold rounded text-[11px] shadow-xs transition"
                  >
                    Hiệu trưởng duyệt lên lớp
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto max-h-[720px]">
              <table className="w-full text-xs border-collapse">
                {/* Header 3 tầng */}
                <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 shadow-sm">
                  {/* TẦNG 1: NHÓM LỚN */}
                  <tr className="border-b border-slate-300 divide-x divide-slate-200 text-center">
                    <th rowSpan={3} className="p-2 font-bold sticky left-0 z-30 bg-slate-100 w-10 border-r border-slate-300">
                      STT
                    </th>
                    <th colSpan={2} className="p-2 font-bold sticky left-10 z-30 bg-slate-100 min-w-[175px] text-center border-r border-slate-300">
                      HỌ VÀ TÊN HỌC SINH
                    </th>
                    <th rowSpan={3} className="p-2 font-bold sticky left-[215px] z-30 bg-slate-100 w-24 border-r border-slate-300">
                      Ngày, tháng, năm sinh
                    </th>
                    <th rowSpan={3} className="p-2 font-bold sticky left-[311px] z-30 bg-slate-100 w-10 border-r border-slate-300">
                      Nữ
                    </th>

                    {/* 1. Môn học và hoạt động giáo dục */}
                    <th
                      colSpan={scoredSubjects.reduce((acc, s) => acc + (s.hasScore ? 2 : 1), 0)}
                      className="p-2 font-bold bg-amber-50 text-amber-950 border-b border-amber-200"
                    >
                      Môn học và hoạt động giáo dục
                    </th>

                    {/* 2. Năng lực cốt lõi */}
                    <th colSpan={10} className="p-2 font-bold bg-blue-50 text-blue-950 border-b border-blue-200">
                      Năng lực cốt lõi
                    </th>

                    {/* 3. Phẩm chất chủ yếu */}
                    <th colSpan={5} className="p-2 font-bold bg-emerald-50 text-emerald-950 border-b border-emerald-200">
                      Phẩm chất chủ yếu
                    </th>

                    {/* 4. Đánh giá KQGD (CHỈ HIỂN THỊ Ở HK2 / CẢ NĂM - HK1 KHÔNG CÓ) */}
                    {selectedSemester !== "HK1" && (
                      <th colSpan={4} className="p-2 font-bold bg-purple-50 text-purple-950 border-b border-purple-200">
                        Đánh giá KQGD
                      </th>
                    )}

                    {/* 5. Khen thưởng (CHỈ HIỂN THỊ Ở HK2 / CẢ NĂM - HK1 KHÔNG CÓ) */}
                    {selectedSemester !== "HK1" && (
                      <th colSpan={3} className="p-2 font-bold bg-rose-50 text-rose-950 border-b border-rose-200">
                        Khen thưởng
                      </th>
                    )}

                    {/* 6. Lên lớp (CHỈ HIỂN THỊ Ở HK2 / CẢ NĂM - HK1 KHÔNG CÓ) */}
                    {selectedSemester !== "HK1" && (
                      <th rowSpan={3} className="p-2 font-bold bg-slate-100 text-slate-800 w-16">
                        Lên lớp
                      </th>
                    )}

                    {/* 7. Ghi chú */}
                    <th rowSpan={3} className="p-2 font-bold bg-slate-100 text-slate-800 min-w-[120px]">
                      Ghi Chú
                    </th>

                    {/* 8. Nút Nhập NL-PC */}
                    <th rowSpan={3} className="p-2 font-bold bg-slate-100 text-slate-800 w-16 text-center" title="Nhập chi tiết Năng lực & Phẩm chất">
                      Nhập NL-PC
                    </th>
                  </tr>

                  {/* TẦNG 2: PHÂN NHÓM MÔN & NĂNG LỰC */}
                  <tr className="border-b border-slate-300 divide-x divide-slate-200 bg-slate-50 text-[11px] text-center">
                    {/* Cột con: Họ đệm & Tên */}
                    <th rowSpan={2} className="p-1.5 font-bold sticky left-10 z-30 bg-slate-100 min-w-[110px] text-left border-r border-slate-300">
                      Họ và đệm
                    </th>
                    <th rowSpan={2} className="p-1.5 font-bold sticky left-[150px] z-30 bg-slate-100 min-w-[65px] text-left border-r border-slate-300">
                      Tên
                    </th>

                    {/* Tên môn */}
                    {scoredSubjects.map(sub => (
                      <th
                        key={sub.id}
                        colSpan={sub.hasScore ? 2 : 1}
                        className="p-1.5 font-bold text-slate-800 bg-amber-50/50"
                      >
                        <span className="block truncate max-w-[100px] mx-auto" title={sub.subjectName}>
                          {sub.subjectName}
                        </span>
                      </th>
                    ))}

                    {/* Năng lực chung */}
                    <th colSpan={3} className="p-1.5 font-bold text-blue-900 bg-blue-50/60">
                      Năng lực chung
                    </th>

                    {/* Năng lực đặc thù */}
                    <th colSpan={7} className="p-1.5 font-bold text-blue-900 bg-blue-50/40">
                      Năng lực đặc thù
                    </th>

                    {/* Phẩm chất chủ yếu: 5 phẩm chất */}
                    {KEY_QUALITIES.map(q => (
                      <th key={q.key} rowSpan={2} className="p-1.5 font-bold text-emerald-900 bg-emerald-50/40 w-12 text-center">
                        <span className="block truncate max-w-[50px] mx-auto text-[10px]" title={q.label}>
                          {q.short}
                        </span>
                      </th>
                    ))}

                    {/* Đánh giá KQGD (Chỉ có ở HK2 / Cả năm) */}
                    {selectedSemester !== "HK1" && (
                      <>
                        <th rowSpan={2} className="p-1 text-[10px] font-bold text-purple-900 w-16">Hoàn thành xuất sắc</th>
                        <th rowSpan={2} className="p-1 text-[10px] font-bold text-purple-900 w-16">Hoàn thành tốt</th>
                        <th rowSpan={2} className="p-1 text-[10px] font-bold text-purple-900 w-16">Hoàn thành</th>
                        <th rowSpan={2} className="p-1 text-[10px] font-bold text-purple-900 w-16">Chưa hoàn thành</th>
                      </>
                    )}

                    {/* Khen thưởng (Chỉ có ở HK2 / Cả năm) */}
                    {selectedSemester !== "HK1" && (
                      <>
                        <th rowSpan={2} className="p-1 text-[10px] font-bold text-rose-900 w-14">Cuối năm</th>
                        <th rowSpan={2} className="p-1 text-[10px] font-bold text-rose-900 w-14">Đột xuất</th>
                        <th rowSpan={2} className="p-1 text-[10px] font-bold text-rose-900 min-w-[110px]">Nội dung khen thưởng khác</th>
                      </>
                    )}
                  </tr>

                  {/* TẦNG 3: CỘT CHI TIẾT CON (Mức đạt được / Điểm KTĐK; Chi tiết từng năng lực) */}
                  <tr className="border-b border-slate-300 divide-x divide-slate-200 bg-white text-[10px] text-slate-600 text-center">
                    {scoredSubjects.map(sub => (
                      <React.Fragment key={sub.id}>
                        <th className="p-1 font-semibold w-14 text-center">Mức đạt được</th>
                        {sub.hasScore && <th className="p-1 font-semibold w-12 text-center text-blue-700">Điểm KTĐK</th>}
                      </React.Fragment>
                    ))}

                    {/* Năng lực chung */}
                    {GENERAL_COMPETENCIES.map(c => (
                      <th key={c.key} className="p-1 font-semibold w-12 text-center text-[10px]" title={c.label}>
                        {c.short}
                      </th>
                    ))}

                    {/* Năng lực đặc thù */}
                    {SPECIFIC_COMPETENCIES.map(c => (
                      <th key={c.key} className="p-1 font-semibold w-11 text-center text-[10px]" title={c.label}>
                        {c.short}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Data Rows Tiểu học */}
                <tbody className="divide-y divide-slate-200">
                  {displayedStudents.map((st, idx) => {
                    const isEven = idx % 2 === 0
                    const rowBg = isEven ? "bg-white" : "bg-slate-50/50"
                    const isNu = (st.gender || "").toLowerCase().includes("nữ") || (st.gender || "").toLowerCase().includes("female")
                    const { lastName, firstName } = splitStudentName(st.studentName)

                    return (
                      <tr key={st.id} className={`hover:bg-amber-50/30 transition-colors ${rowBg}`}>
                        {/* STT */}
                        <td className={`p-2 text-center text-slate-500 font-medium sticky left-0 z-10 ${rowBg} border-r border-slate-200`}>
                          {st.stt}
                        </td>

                        {/* Họ và đệm */}
                        <td className={`p-2 text-left font-medium text-slate-800 sticky left-10 z-10 ${rowBg} border-r border-slate-200 whitespace-nowrap min-w-[110px]`}>
                          {lastName}
                        </td>

                        {/* Tên */}
                        <td className={`p-2 text-left font-bold text-slate-900 sticky left-[150px] z-10 ${rowBg} border-r border-slate-200 whitespace-nowrap min-w-[65px]`}>
                          {firstName}
                        </td>

                        {/* Ngày sinh */}
                        <td className={`p-2 text-center text-slate-500 text-[11px] sticky left-[215px] z-10 ${rowBg} border-r border-slate-200 whitespace-nowrap`}>
                          {st.dob}
                        </td>

                        {/* Nữ */}
                        <td className={`p-2 text-center font-bold text-slate-700 sticky left-[311px] z-10 ${rowBg} border-r border-slate-200`}>
                          {isNu ? "✓" : ""}
                        </td>

                        {/* Các môn học và HĐGD */}
                        {scoredSubjects.map(sub => {
                          const sData = st.scores[sub.id]
                          const isMien = sData?.evaluationGrade === "Miễn"
                          const levelVal = sData?.evaluationGrade || ""
                          const scoreVal = isMien ? "Miễn" : (sData?.score !== null && sData?.score !== undefined ? sData.score : "")

                          return (
                            <React.Fragment key={sub.id}>
                              {/* Mức đạt được: T, H, C, Miễn */}
                              <td className="p-1 text-center border-r border-slate-200">
                                <select
                                  value={levelVal}
                                  onChange={e => handleLevelChange(st.id, sub.id, e.target.value)}
                                  className={`w-14 py-0.5 text-center text-xs font-bold rounded border focus:outline-none transition-colors ${
                                    levelVal === "T"
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                      : levelVal === "H"
                                      ? "bg-sky-50 text-sky-800 border-sky-300"
                                      : levelVal === "C"
                                      ? "bg-rose-50 text-rose-800 border-rose-300"
                                      : levelVal === "Miễn"
                                      ? "bg-purple-100 text-purple-700 border-purple-300 font-extrabold"
                                      : "bg-white text-slate-400 border-slate-200"
                                  }`}
                                >
                                  <option value="">-</option>
                                  <option value="T">T</option>
                                  <option value="H">H</option>
                                  <option value="C">C</option>
                                  <option value="Miễn">Miễn</option>
                                </select>
                              </td>

                              {/* Điểm KTĐK (nếu môn có điểm) */}
                              {sub.hasScore && (
                                <td className="p-1 text-center border-r border-slate-200">
                                  <input
                                    type="text"
                                    value={scoreVal}
                                    onChange={e => handleScoreChange(st.id, sub.id, e.target.value)}
                                    placeholder="-"
                                    className={`w-12 text-center font-bold rounded py-0.5 border text-xs focus:outline-none transition-colors ${
                                      isMien
                                        ? "bg-purple-50 text-purple-700 border-purple-200 font-extrabold"
                                        : scoreVal !== "" && Number(scoreVal) >= 9
                                        ? "text-emerald-700 bg-emerald-50/50 border-emerald-200"
                                        : scoreVal !== "" && Number(scoreVal) < 5
                                        ? "text-rose-600 bg-rose-50 border-rose-200"
                                        : "text-slate-800 border-slate-200 bg-white"
                                    }`}
                                  />
                                </td>
                              )}
                            </React.Fragment>
                          )
                        })}

                        {/* Năng lực chung: 3 cột */}
                        {GENERAL_COMPETENCIES.map(c => {
                          const val = st.summary.competencies?.[c.key] || ""
                          return (
                            <td key={c.key} className="p-0.5 text-center border-r border-slate-200">
                              <select
                                value={val}
                                onChange={e => handleCompetencyChange(st.id, "competencies", c.key, e.target.value)}
                                className={`w-10 py-0.5 text-center text-xs font-bold rounded border focus:outline-none ${
                                  val === "T"
                                    ? "bg-blue-50 text-blue-800 border-blue-200"
                                    : val === "Đ"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : val === "C"
                                    ? "bg-rose-50 text-rose-800 border-rose-200"
                                    : "bg-white text-slate-300 border-slate-200"
                                }`}
                              >
                                <option value="">-</option>
                                <option value="T">T</option>
                                <option value="Đ">Đ</option>
                                <option value="C">C</option>
                              </select>
                            </td>
                          )
                        })}

                        {/* Năng lực đặc thù: 7 cột */}
                        {SPECIFIC_COMPETENCIES.map(c => {
                          const val = st.summary.competencies?.[c.key] || ""
                          return (
                            <td key={c.key} className="p-0.5 text-center border-r border-slate-200">
                              <select
                                value={val}
                                onChange={e => handleCompetencyChange(st.id, "competencies", c.key, e.target.value)}
                                className={`w-10 py-0.5 text-center text-xs font-bold rounded border focus:outline-none ${
                                  val === "T"
                                    ? "bg-blue-50 text-blue-800 border-blue-200"
                                    : val === "Đ"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : val === "C"
                                    ? "bg-rose-50 text-rose-800 border-rose-200"
                                    : "bg-white text-slate-300 border-slate-200"
                                }`}
                              >
                                <option value="">-</option>
                                <option value="T">T</option>
                                <option value="Đ">Đ</option>
                                <option value="C">C</option>
                              </select>
                            </td>
                          )
                        })}

                        {/* Phẩm chất chủ yếu: 5 cột */}
                        {KEY_QUALITIES.map(q => {
                          const val = st.summary.qualities?.[q.key] || ""
                          return (
                            <td key={q.key} className="p-0.5 text-center border-r border-slate-200">
                              <select
                                value={val}
                                onChange={e => handleCompetencyChange(st.id, "qualities", q.key, e.target.value)}
                                className={`w-10 py-0.5 text-center text-xs font-bold rounded border focus:outline-none ${
                                  val === "T"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : val === "Đ"
                                    ? "bg-sky-50 text-sky-800 border-sky-200"
                                    : val === "C"
                                    ? "bg-rose-50 text-rose-800 border-rose-200"
                                    : "bg-white text-slate-300 border-slate-200"
                                }`}
                              >
                                <option value="">-</option>
                                <option value="T">T</option>
                                <option value="Đ">Đ</option>
                                <option value="C">C</option>
                              </select>
                            </td>
                          )
                        })}

                        {/* Đánh giá KQGD (CHỈ HIỂN THỊ Ở HK2 / CẢ NĂM - HK1 KHÔNG CÓ) */}
                        {selectedSemester !== "HK1" && (
                          ["Hoàn thành xuất sắc", "Hoàn thành tốt", "Hoàn thành", "Chưa hoàn thành"].map(m => {
                            const isMatch = st.summary.academicRating === m
                            return (
                              <td
                                key={m}
                                onClick={() => handleSummaryChange(st.id, "academicRating", isMatch ? "" : m)}
                                className="p-1 text-center border-r border-slate-200 cursor-pointer hover:bg-purple-100/50"
                              >
                                <span
                                  className={`inline-block w-4 h-4 rounded text-center leading-4 text-xs font-bold ${
                                    isMatch ? "bg-purple-600 text-white" : "text-transparent border border-slate-300"
                                  }`}
                                >
                                  ✓
                                </span>
                              </td>
                            )
                          })
                        )}

                        {/* Khen thưởng: Cuối năm (CHỈ HIỂN THỊ Ở HK2 / CẢ NĂM - HK1 KHÔNG CÓ) */}
                        {selectedSemester !== "HK1" && (
                          <td
                            onClick={() => handleSummaryChange(st.id, "reward", st.summary.reward ? "" : "Học sinh Xuất sắc")}
                            className="p-1 text-center border-r border-slate-200 cursor-pointer hover:bg-rose-50"
                          >
                            <span
                              className={`inline-block w-4 h-4 rounded text-center leading-4 text-xs font-bold ${
                                Boolean(st.summary.reward) ? "bg-rose-600 text-white" : "text-transparent border border-slate-300"
                              }`}
                            >
                              ✓
                            </span>
                          </td>
                        )}

                        {/* Khen thưởng: Đột xuất (CHỈ HIỂN THỊ Ở HK2 / CẢ NĂM - HK1 KHÔNG CÓ) */}
                        {selectedSemester !== "HK1" && (
                          <td
                            onClick={() => handleSummaryChange(st.id, "rewardUnexpected", st.summary.rewardUnexpected ? "" : "Đột xuất")}
                            className="p-1 text-center border-r border-slate-200 cursor-pointer hover:bg-rose-50"
                          >
                            <span
                              className={`inline-block w-4 h-4 rounded text-center leading-4 text-xs font-bold ${
                                Boolean(st.summary.rewardUnexpected) ? "bg-amber-600 text-white" : "text-transparent border border-slate-300"
                              }`}
                            >
                              ✓
                            </span>
                          </td>
                        )}

                        {/* Khen thưởng khác (CHỈ HIỂN THỊ Ở HK2 / CẢ NĂM - HK1 KHÔNG CÓ) */}
                        {selectedSemester !== "HK1" && (
                          <td className="p-1 text-center border-r border-slate-200">
                            <input
                              type="text"
                              value={st.summary.otherReward || ""}
                              onChange={e => handleSummaryChange(st.id, "otherReward", e.target.value)}
                              placeholder="..."
                              className="w-24 text-center py-0.5 border border-slate-200 rounded text-xs focus:outline-none"
                            />
                          </td>
                        )}

                        {/* Lên lớp (CHỈ HIỂN THỊ Ở HK2 / CẢ NĂM - HK1 KHÔNG CÓ) */}
                        {selectedSemester !== "HK1" && (
                          <td
                            onClick={() => handleSummaryChange(st.id, "promoted", !st.summary.promoted)}
                            className="p-1 text-center border-r border-slate-200 cursor-pointer hover:bg-emerald-50"
                          >
                            <span
                              className={`inline-block w-4 h-4 rounded text-center leading-4 text-xs font-bold ${
                                st.summary.promoted !== false ? "bg-emerald-600 text-white" : "text-transparent border border-slate-300"
                              }`}
                            >
                              ✓
                            </span>
                          </td>
                        )}

                        {/* Ghi Chú */}
                        <td className="p-1 text-center border-r border-slate-200">
                          <input
                            type="text"
                            value={st.summary.notes || ""}
                            onChange={e => handleSummaryChange(st.id, "notes", e.target.value)}
                            placeholder="..."
                            className="w-28 text-center py-0.5 border border-slate-200 rounded text-xs focus:outline-none"
                          />
                        </td>

                        {/* Nút Nhập NL-PC */}
                        <td className="p-1 text-center border-r border-slate-200">
                          <button
                            type="button"
                            onClick={() => setEditingStudentForNlPc(st)}
                            className="p-1.5 hover:bg-sky-100 rounded-lg text-sky-600 hover:text-sky-800 transition"
                            title={`Nhập chi tiết Năng lực & Phẩm chất cho HS ${st.studentName}`}
                          >
                            <Pencil className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* FORM TRUNG HỌC (THCS / THPT CHUẨN THÔNG TƯ 22/2021/TT-BGDĐT)              */
          /* ========================================================================= */
          <div className="overflow-x-auto max-h-[720px]">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 shadow-sm">
                <tr className="border-b border-slate-300 divide-x divide-slate-200">
                  <th rowSpan={2} className="p-2.5 text-center font-bold sticky left-0 z-30 bg-slate-100 w-12 border-r border-slate-300">
                    STT
                  </th>
                  <th rowSpan={2} className="p-2.5 text-left font-bold sticky left-12 z-30 bg-slate-100 w-28 border-r border-slate-300">
                    Mã học sinh
                  </th>
                  <th rowSpan={2} className="p-2.5 text-left font-bold sticky left-40 z-30 bg-slate-100 min-w-[180px] border-r border-slate-300">
                    Họ và tên
                  </th>
                  <th rowSpan={2} className="p-2.5 text-center font-bold sticky left-[340px] z-30 bg-slate-100 w-24 border-r border-slate-300">
                    Ngày sinh
                  </th>

                  {scoredSubjects.length > 0 && (
                    <th colSpan={scoredSubjects.length} className="p-2 text-center font-bold bg-blue-50 text-blue-900 border-b border-blue-200">
                      Môn tính điểm (HS 1) — Khối {selectedGrade} ({scoredSubjects.length} môn)
                    </th>
                  )}

                  {assessmentSubjects.length > 0 && (
                    <th colSpan={assessmentSubjects.length} className="p-2 text-center font-bold bg-emerald-50 text-emerald-900 border-b border-emerald-200">
                      Môn nhận xét (N.xét) — Khối {selectedGrade} ({assessmentSubjects.length} môn)
                    </th>
                  )}

                  <th colSpan={selectedSemester === "CN" ? 7 : 6} className="p-2 text-center font-bold bg-purple-50 text-purple-900 border-b border-purple-200">
                    Đánh giá tổng kết {selectedSemester === "CN" ? "(Cả năm)" : `(${selectedSemester})`}
                  </th>
                </tr>

                <tr className="border-b border-slate-300 divide-x divide-slate-200 bg-slate-50 text-[11px]">
                  {scoredSubjects.map(sub => (
                    <th key={sub.id} className="p-2 text-center font-semibold text-slate-700 min-w-[70px]">
                      <span className="block truncate max-w-[80px]" title={sub.subjectName}>
                        {sub.subjectName}
                      </span>
                    </th>
                  ))}

                  {assessmentSubjects.map(sub => (
                    <th key={sub.id} className="p-2 text-center font-semibold text-slate-700 min-w-[80px]">
                      <span className="block truncate max-w-[90px]" title={sub.subjectName}>
                        {sub.subjectName}
                      </span>
                    </th>
                  ))}

                  <th className="p-2 text-center font-semibold text-purple-950 min-w-[105px]">Kết quả học tập</th>
                  <th className="p-2 text-center font-semibold text-purple-950 min-w-[105px]">Kết quả rèn luyện</th>
                  <th className="p-2 text-center font-semibold text-slate-700 w-12" title="Số buổi nghỉ có phép">P</th>
                  <th className="p-2 text-center font-semibold text-slate-700 w-12" title="Số buổi nghỉ không phép">K</th>
                  <th className="p-2 text-center font-semibold text-slate-700 w-14" title="Tổng số buổi nghỉ">Tổng</th>
                  <th className="p-2 text-center font-semibold text-purple-950 min-w-[125px]">Danh hiệu thi đua</th>
                  {selectedSemester === "CN" && (
                    <th className="p-2 text-center font-semibold text-slate-700 min-w-[130px]">Ghi chú / Lên lớp</th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {displayedStudents.map((st, idx) => {
                  const isEven = idx % 2 === 0
                  const rowBg = isEven ? "bg-white" : "bg-slate-50/50"

                  return (
                    <tr key={st.id} className={`hover:bg-indigo-50/40 transition-colors ${rowBg}`}>
                      <td className={`p-2 text-center text-slate-500 font-medium sticky left-0 z-10 ${rowBg} border-r border-slate-200`}>
                        {st.stt}
                      </td>
                      <td className={`p-2 text-left font-mono font-medium text-slate-700 sticky left-12 z-10 ${rowBg} border-r border-slate-200`}>
                        {st.studentCode}
                      </td>
                      <td className={`p-2 text-left font-medium text-slate-900 sticky left-40 z-10 ${rowBg} border-r border-slate-200`}>
                        {st.studentName}
                      </td>
                      <td className={`p-2 text-center text-slate-500 text-[11px] sticky left-[340px] z-10 ${rowBg} border-r border-slate-200`}>
                        {st.dob}
                      </td>

                      {scoredSubjects.map(sub => {
                        const sData = st.scores[sub.id]
                        const isMien = sData?.evaluationGrade === "Miễn"
                        const displayVal = isMien ? "Miễn" : (sData?.score !== null && sData?.score !== undefined ? sData.score : "")

                        return (
                          <td key={sub.id} className="p-1 text-center border-r border-slate-200">
                            <input
                              type="text"
                              value={displayVal}
                              onChange={e => handleScoreChange(st.id, sub.id, e.target.value)}
                              placeholder="-"
                              className={`w-14 text-center font-semibold rounded py-1 border text-xs focus:outline-none transition-colors ${
                                isMien
                                  ? "bg-purple-50 text-purple-700 border-purple-300 font-bold"
                                  : displayVal !== "" && Number(displayVal) < 5
                                  ? "text-rose-600 bg-rose-50 border-rose-200"
                                  : displayVal !== "" && Number(displayVal) >= 8
                                  ? "text-emerald-700 font-bold bg-emerald-50/40 border-slate-200"
                                  : "text-slate-800 border-slate-200 bg-white"
                              }`}
                            />
                          </td>
                        )
                      })}

                      {assessmentSubjects.map(sub => {
                        const aData = st.scores[sub.id]
                        const evalGrade = aData?.evaluationGrade || ""

                        return (
                          <td key={sub.id} className="p-1 text-center border-r border-slate-200">
                            <select
                              value={evalGrade}
                              onChange={e => handleLevelChange(st.id, sub.id, e.target.value)}
                              className={`w-16 py-1 px-1 rounded text-center text-xs font-bold border focus:outline-none transition-colors ${
                                evalGrade === "Đ"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                  : evalGrade === "CĐ"
                                  ? "bg-rose-50 text-rose-700 border-rose-300"
                                  : evalGrade === "Miễn"
                                  ? "bg-purple-100 text-purple-700 border-purple-300 font-extrabold"
                                  : "bg-white text-slate-400 border-slate-200"
                              }`}
                            >
                              <option value="">-</option>
                              <option value="Đ">Đ</option>
                              <option value="CĐ">CĐ</option>
                              <option value="Miễn">Miễn</option>
                            </select>
                          </td>
                        )
                      })}

                      {/* Xếp loại học lực */}
                      <td className="p-1 text-center border-r border-slate-200">
                        <select
                          value={st.summary.academicRating || ""}
                          onChange={e => handleSummaryChange(st.id, "academicRating", e.target.value)}
                          className="w-24 py-1 px-1 rounded text-xs border text-center font-semibold bg-white border-slate-200"
                        >
                          <option value="">-</option>
                          <option value="Tốt">Tốt</option>
                          <option value="Khá">Khá</option>
                          <option value="Đạt">Đạt</option>
                          <option value="Chưa đạt">Chưa đạt</option>
                        </select>
                      </td>

                      {/* Rèn luyện */}
                      <td className="p-1 text-center border-r border-slate-200">
                        <select
                          value={st.summary.conductRating || "Tốt"}
                          onChange={e => handleSummaryChange(st.id, "conductRating", e.target.value)}
                          className="w-24 py-1 px-1 rounded text-xs border text-center font-semibold bg-white border-slate-200"
                        >
                          <option value="Tốt">Tốt</option>
                          <option value="Khá">Khá</option>
                          <option value="Đạt">Đạt</option>
                          <option value="Chưa đạt">Chưa đạt</option>
                        </select>
                      </td>

                      {/* Buổi nghỉ P, K, Tổng */}
                      <td className="p-1 text-center border-r border-slate-200">
                        <input
                          type="number"
                          min="0"
                          value={st.summary.absencesPermitted ?? 0}
                          onChange={e => handleSummaryChange(st.id, "absencesPermitted", parseInt(e.target.value, 10) || 0)}
                          className="w-10 text-center font-medium border border-slate-200 rounded py-1 text-xs"
                        />
                      </td>
                      <td className="p-1 text-center border-r border-slate-200">
                        <input
                          type="number"
                          min="0"
                          value={st.summary.absencesUnpermitted ?? 0}
                          onChange={e => handleSummaryChange(st.id, "absencesUnpermitted", parseInt(e.target.value, 10) || 0)}
                          className="w-10 text-center font-medium border border-slate-200 rounded py-1 text-xs"
                        />
                      </td>
                      <td className="p-1 text-center font-bold text-slate-700 border-r border-slate-200">
                        {st.summary.absencesTotal ?? ((st.summary.absencesPermitted || 0) + (st.summary.absencesUnpermitted || 0))}
                      </td>

                      {/* Danh hiệu */}
                      <td className="p-1 text-center border-r border-slate-200">
                        <select
                          value={st.summary.reward || ""}
                          onChange={e => handleSummaryChange(st.id, "reward", e.target.value)}
                          className={`w-28 py-1 px-1 rounded text-xs border text-center ${
                            st.summary.reward === "Học sinh Xuất sắc"
                              ? "bg-amber-100 text-amber-900 border-amber-300 font-bold"
                              : st.summary.reward === "Học sinh Giỏi"
                              ? "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold"
                              : "bg-white text-slate-500 border-slate-200"
                          }`}
                        >
                          <option value="">-</option>
                          <option value="Học sinh Xuất sắc">HS Xuất sắc</option>
                          <option value="Học sinh Giỏi">HS Giỏi</option>
                        </select>
                      </td>

                      {selectedSemester === "CN" && (
                        <td className="p-1 text-center border-r border-slate-200">
                          <input
                            type="text"
                            value={st.summary.notes || ""}
                            onChange={e => handleSummaryChange(st.id, "notes", e.target.value)}
                            placeholder="Được lên lớp..."
                            className="w-28 py-1 px-1 text-xs border border-slate-200 rounded text-center"
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

        {/* Footer Statistics */}
        {displayedStudents.length > 0 && (
          <div className="bg-slate-50 p-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-4">
              <span>
                Tổng số học sinh: <strong className="text-slate-900">{displayedStudents.length}</strong>
              </span>
              {isPrimary ? (
                <>
                  <span>
                    Hoàn thành xuất sắc:{" "}
                    <strong className="text-purple-700">
                      {displayedStudents.filter(s => s.summary.academicRating === "Hoàn thành xuất sắc").length}
                    </strong>
                  </span>
                  <span>
                    Hoàn thành tốt:{" "}
                    <strong className="text-emerald-700">
                      {displayedStudents.filter(s => s.summary.academicRating === "Hoàn thành tốt").length}
                    </strong>
                  </span>
                  <span>
                    Hoàn thành:{" "}
                    <strong className="text-sky-700">
                      {displayedStudents.filter(s => s.summary.academicRating === "Hoàn thành").length}
                    </strong>
                  </span>
                  <span>
                    Khen thưởng cuối năm:{" "}
                    <strong className="text-rose-600">
                      {displayedStudents.filter(s => Boolean(s.summary.reward)).length}
                    </strong>
                  </span>
                </>
              ) : (
                <>
                  <span>
                    Học sinh Xuất sắc:{" "}
                    <strong className="text-amber-600">
                      {displayedStudents.filter(s => s.summary.reward === "Học sinh Xuất sắc").length}
                    </strong>
                  </span>
                  <span>
                    Học sinh Giỏi:{" "}
                    <strong className="text-emerald-600">
                      {displayedStudents.filter(s => s.summary.reward === "Học sinh Giỏi").length}
                    </strong>
                  </span>
                  <span>
                    Học lực Tốt:{" "}
                    <strong className="text-emerald-700">
                      {displayedStudents.filter(s => s.summary.academicRating === "Tốt").length}
                    </strong>
                  </span>
                </>
              )}
            </div>

            <div className="text-[11px] text-slate-400">
              {isPrimary
                ? "* Tiểu học theo Thông tư 27/2020/TT-BGDĐT. Mức đạt môn: T, H, C. Năng lực & Phẩm chất: T, Đ, C."
                : "* Trung học theo Thông tư 22/2021/TT-BGDĐT. Điểm số: 0.0 - 10.0 hoặc Miễn. Môn nhận xét: Đ, CĐ, Miễn."}
            </div>
          </div>
        )}
      </div>

      {/* 2.5 Modal Cấu Hình Môn Học (Thêm môn: Điểm/Nhận xét, Bỏ chọn môn cho ba bậc học) */}
      {showSubjectConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <span>Cấu Hình Môn Học — {selectedLevel === "TIEU_HOC" ? "Tiểu học" : selectedLevel === "THCS" ? "THCS" : "THPT"} (Khối {selectedGrade})</span>
                    <span className="text-[11px] px-2 py-0.5 bg-indigo-100 text-indigo-800 font-semibold rounded-full">
                      {classInfo?.className || filteredClasses.find(c => c.id === selectedClassId)?.className || ""}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isPrimary
                      ? "Cấu hình môn Tính điểm (có Điểm KTĐK) hoặc Nhận xét (chỉ Mức T/H/C), Bỏ chọn môn hoặc Thêm môn mới."
                      : "Cấu hình môn Tính điểm (0-10) hoặc Nhận xét (Đ/CĐ/Miễn), Bỏ chọn môn hoặc Thêm môn mới."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSubjectConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* PHẦN 1: THÊM MÔN HỌC MỚI (ĐIỂM / NHẬN XÉT) */}
              <div className="bg-indigo-50/50 border border-indigo-200/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    Thêm môn học mới vào bảng điểm
                  </h4>
                  <span className="text-[11px] text-indigo-600 font-medium">
                    Áp dụng cho {selectedLevel === "TIEU_HOC" ? "Tiểu học" : selectedLevel} - Khối {selectedGrade}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  {/* Tên môn */}
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tên môn học <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="vd: Tiếng Pháp, Kỹ năng sống, Robotics..."
                      value={newSubName}
                      onChange={e => setNewSubName(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Mã môn */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Mã môn
                    </label>
                    <input
                      type="text"
                      placeholder="vd: TPH..."
                      value={newSubCode}
                      onChange={e => setNewSubCode(e.target.value.toUpperCase())}
                      className="w-full text-xs font-mono border border-slate-300 rounded-lg px-2.5 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
                    />
                  </div>

                  {/* Loại môn: Điểm hoặc Nhận xét */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Hình thức đánh giá
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-white p-0.5 rounded-lg border border-slate-300">
                      <button
                        type="button"
                        onClick={() => setNewSubHasScore(true)}
                        className={`py-1.5 text-[11px] font-bold rounded-md transition ${
                          newSubHasScore
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                        title={isPrimary ? "Có điểm KTĐK (1-10) và mức T/H/C" : "Tính điểm số (0 - 10) tính ĐTB"}
                      >
                        Điểm
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewSubHasScore(false)}
                        className={`py-1.5 text-[11px] font-bold rounded-md transition ${
                          !newSubHasScore
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                        title={isPrimary ? "Chỉ đánh giá mức T, H, C" : "Đánh giá mức Đạt, Chưa đạt, Miễn"}
                      >
                        Nhận xét
                      </button>
                    </div>
                  </div>

                  {/* Nút Thêm */}
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddNewSubject}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* PHẦN 2: DANH SÁCH MÔN HỌC & BỎ CHỌN / CHỌN MÔN */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <input
                      type="text"
                      placeholder="Tìm môn học..."
                      value={subjectSearchFilter}
                      onChange={e => setSubjectSearchFilter(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg pl-8 pr-2.5 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectAllSubjects(true)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-semibold transition"
                    >
                      Chọn tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAllSubjects(false)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-semibold transition"
                    >
                      Bỏ chọn tất cả
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToDefaultSubjects}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-semibold transition"
                      title="Khôi phục danh sách môn học mặc định theo Thông tư của Bộ"
                    >
                      Đặt lại mặc định
                    </button>
                  </div>
                </div>

                {/* Table môn học */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs max-h-[380px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 text-center w-14">Chọn</th>
                        <th className="p-2.5 text-left">Tên môn học</th>
                        <th className="p-2.5 text-center w-24">Mã môn</th>
                        <th className="p-2.5 text-center w-48">Hình thức đánh giá</th>
                        <th className="p-2.5 text-center w-20">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSubjectsForConfig.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">
                            Không tìm thấy môn học nào phù hợp.
                          </td>
                        </tr>
                      ) : (
                        filteredSubjectsForConfig.map(sub => (
                          <tr
                            key={sub.id}
                            className={`transition-colors ${
                              sub.selected ? "bg-white hover:bg-slate-50/80" : "bg-slate-50/60 opacity-60 hover:opacity-100"
                            }`}
                          >
                            {/* Checkbox Bỏ chọn / Chọn môn */}
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={sub.selected}
                                onChange={() => handleToggleSelectSubject(sub.id)}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>

                            {/* Tên môn */}
                            <td className="p-2.5 text-left font-medium text-slate-900">
                              <div className="flex items-center gap-2">
                                <span className={sub.selected ? "text-slate-900 font-bold" : "text-slate-500 line-through"}>
                                  {sub.subjectName}
                                </span>
                                {sub.isCustom && (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded font-semibold">
                                    Tùy biến
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Mã môn */}
                            <td className="p-2.5 text-center font-mono text-[11px] text-slate-500">
                              {sub.subjectCode}
                            </td>

                            {/* Chuyển đổi Loại hình: Điểm <-> Nhận xét */}
                            <td className="p-2 text-center">
                              <div className="inline-grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => handleChangeEvaluationType(sub.id, true)}
                                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition ${
                                    sub.hasScore
                                      ? "bg-blue-600 text-white shadow-xs"
                                      : "text-slate-600 hover:text-slate-900 bg-transparent"
                                  }`}
                                  title={isPrimary ? "Môn có Điểm KTĐK và Mức đạt được" : "Môn tính điểm số"}
                                >
                                  Điểm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleChangeEvaluationType(sub.id, false)}
                                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition ${
                                    !sub.hasScore
                                      ? "bg-emerald-600 text-white shadow-xs"
                                      : "text-slate-600 hover:text-slate-900 bg-transparent"
                                  }`}
                                  title={isPrimary ? "Môn chỉ đánh giá Mức T/H/C" : "Môn đánh giá nhận xét Đ/CĐ/Miễn"}
                                >
                                  Nhận xét
                                </button>
                              </div>
                            </td>

                            {/* Thao tác */}
                            <td className="p-2.5 text-center">
                              {sub.isCustom ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomSubject(sub.id)}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                                  title="Xóa môn tùy biến này"
                                >
                                  <Trash2 className="w-4 h-4 mx-auto" />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Mặc định</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50 flex-shrink-0 text-xs">
              <div className="flex items-center gap-3 text-slate-600">
                <span>
                  Đang hiển thị: <strong className="text-slate-900">{scoredSubjects.length + assessmentSubjects.length}</strong> / {currentSubjectList.length} môn
                </span>
                <span>•</span>
                <span className="text-blue-700 font-semibold">
                  {selectedLevel === "TIEU_HOC" ? scoredSubjects.filter(s => s.hasScore).length : scoredSubjects.length} môn Điểm
                </span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold">
                  {selectedLevel === "TIEU_HOC" ? scoredSubjects.filter(s => !s.hasScore).length : assessmentSubjects.length} môn Nhận xét
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectConfigModal(false)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition"
                >
                  Hoàn tất & Áp dụng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Nhập Nhanh Năng Lực & Phẩm Chất (NL-PC Batch Modal) */}
      {showNlPcBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-100 text-sky-700 rounded-lg">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Nhập Nhanh Năng Lực & Phẩm Chất
                  </h3>
                  <p className="text-xs text-slate-500">
                    Áp dụng đồng loạt cho toàn bộ học sinh lớp {classInfo?.className || ""}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowNlPcBatchModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  1. Mức áp dụng cho tất cả 10 Năng lực (Chung & Đặc thù):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["T", "Đ", "C"] as const).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setBatchNlGrade(g)}
                      className={`py-2 rounded-lg font-bold border transition ${
                        batchNlGrade === g
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {g === "T" ? "T - Tốt" : g === "Đ" ? "Đ - Đạt" : "C - Cần cố gắng"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  2. Mức áp dụng cho tất cả 5 Phẩm chất chủ yếu:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["T", "Đ", "C"] as const).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setBatchPcGrade(g)}
                      className={`py-2 rounded-lg font-bold border transition ${
                        batchPcGrade === g
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {g === "T" ? "T - Tốt" : g === "Đ" ? "Đ - Đạt" : "C - Cần cố gắng"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-slate-600 text-[11px]">
                * Sau khi áp dụng hàng loạt, bạn vẫn có thể chỉnh sửa riêng từng học sinh và từng năng lực/phẩm chất trực tiếp trên bảng.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowNlPcBatchModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApplyBatchNlPc}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                Áp dụng cho cả lớp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3.1 Modal Nhập Chi Tiết NL-PC Cho Từng Học Sinh (Bút viết cột cuối vnEdu) */}
      {editingStudentForNlPc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-100 text-sky-700 rounded-lg">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Đánh Giá Năng Lực & Phẩm Chất Học Sinh
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    Học sinh: <strong className="text-indigo-700 font-bold">{editingStudentForNlPc.studentName}</strong> ({editingStudentForNlPc.studentCode}) • Lớp: <strong>{classInfo?.className || ""}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingStudentForNlPc(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 text-xs">
              {/* Năng lực chung (3) */}
              <div>
                <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-1.5 pb-1 border-b border-blue-100">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  1. Năng lực chung (3 năng lực)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {GENERAL_COMPETENCIES.map(c => {
                    const currentVal = editingStudentForNlPc.summary.competencies?.[c.key] || ""
                    return (
                      <div key={c.key} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <label className="block font-semibold text-slate-700 mb-1.5 truncate" title={c.label}>
                          {c.label}
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {(["T", "Đ", "C"] as const).map(g => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => {
                                handleCompetencyChange(editingStudentForNlPc.id, "competencies", c.key, g)
                                setEditingStudentForNlPc(prev => prev ? {
                                  ...prev,
                                  summary: {
                                    ...prev.summary,
                                    competencies: { ...prev.summary.competencies, [c.key]: g }
                                  }
                                } : null)
                              }}
                              className={`py-1 text-center font-bold text-xs rounded border transition ${
                                currentVal === g
                                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Năng lực đặc thù (7) */}
              <div>
                <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-1.5 pb-1 border-b border-blue-100">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  2. Năng lực đặc thù (7 năng lực)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SPECIFIC_COMPETENCIES.map(c => {
                    const currentVal = editingStudentForNlPc.summary.competencies?.[c.key] || ""
                    return (
                      <div key={c.key} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <label className="block font-semibold text-slate-700 mb-1.5 truncate" title={c.label}>
                          {c.label}
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {(["T", "Đ", "C"] as const).map(g => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => {
                                handleCompetencyChange(editingStudentForNlPc.id, "competencies", c.key, g)
                                setEditingStudentForNlPc(prev => prev ? {
                                  ...prev,
                                  summary: {
                                    ...prev.summary,
                                    competencies: { ...prev.summary.competencies, [c.key]: g }
                                  }
                                } : null)
                              }}
                              className={`py-1 text-center font-bold text-xs rounded border transition ${
                                currentVal === g
                                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Phẩm chất chủ yếu (5) */}
              <div>
                <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-1.5 pb-1 border-b border-emerald-100">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  3. Phẩm chất chủ yếu (5 phẩm chất)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {KEY_QUALITIES.map(q => {
                    const currentVal = editingStudentForNlPc.summary.qualities?.[q.key] || ""
                    return (
                      <div key={q.key} className="bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-200">
                        <label className="block font-semibold text-emerald-900 mb-1.5 truncate text-center" title={q.label}>
                          {q.label}
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {(["T", "Đ", "C"] as const).map(g => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => {
                                handleCompetencyChange(editingStudentForNlPc.id, "qualities", q.key, g)
                                setEditingStudentForNlPc(prev => prev ? {
                                  ...prev,
                                  summary: {
                                    ...prev.summary,
                                    qualities: { ...prev.summary.qualities, [q.key]: g }
                                  }
                                } : null)
                              }}
                              className={`py-1 text-center font-bold text-xs rounded border transition ${
                                currentVal === g
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50 sticky bottom-0">
              <button
                type="button"
                onClick={() => setEditingStudentForNlPc(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                Đóng & Lưu học sinh này
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Import Excel Đa Sheet */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Nhập Điểm Tổng Kết Từ Excel Đa Sheet
                  </h3>
                  <p className="text-xs text-slate-500">
                    File Excel gồm nhiều sheet, trong đó mỗi sheet tương ứng với 1 lớp học.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportFile(null)
                  setImportResults(null)
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Áp dụng cho học kỳ</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["HK1", "HK2"] as const).map(sem => (
                    <button
                      key={sem}
                      type="button"
                      onClick={() => setImportSemester(sem)}
                      className={`py-2 text-xs font-bold rounded-lg border transition ${
                        importSemester === sem
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {sem === "HK1" ? "Học kỳ 1 (HK1)" : "Học kỳ 2 / Cả năm (HK2/CN)"}
                    </button>
                  ))}
                </div>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 rounded-xl p-6 text-center cursor-pointer transition"
              >
                <FileSpreadsheet className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-800">
                  {importFile ? importFile.name : "Nhấn để chọn file Excel hoặc kéo thả vào đây"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Định dạng hỗ trợ: .xlsx, .xls (Hỗ trợ cấu trúc trích xuất vnEdu, SMAS, Bộ GD&ĐT)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setImportFile(e.target.files[0])
                    }
                  }}
                  className="hidden"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 text-slate-600">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-600" />
                  Quy ước định dạng file:
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-500">
                  <li>Tên mỗi sheet là tên lớp (Ví dụ: <code className="bg-slate-200 px-1 rounded">5/1_CS1</code>, <code className="bg-slate-200 px-1 rounded">1.1_CS1</code>).</li>
                  <li>Hàng tiêu đề chứa các cột: STT, Họ và tên, Ngày sinh.</li>
                  <li>Các cột môn học (Mức đạt được, Điểm KTĐK), Năng lực chung, Năng lực đặc thù, Phẩm chất.</li>
                  <li>Các cột đánh giá: Đánh giá KQGD, Khen thưởng, Lên lớp.</li>
                </ul>
              </div>

              {importResults && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{importResults.message}</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResults.sheetResults?.map((sr: any, sIdx: number) => (
                      <div
                        key={sIdx}
                        className="flex items-center justify-between text-[11px] py-1 px-2 rounded bg-white border border-emerald-100"
                      >
                        <span className="font-semibold text-slate-700">
                          Sheet: {sr.sheetName} ({sr.classCode || "Chưa map"})
                        </span>
                        {sr.status === "SUCCESS" ? (
                          <span className="text-emerald-700 font-medium">
                            +{sr.successCount} học sinh ({sr.matchedSubjects} môn)
                          </span>
                        ) : (
                          <span className="text-amber-600">{sr.message || sr.status}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false)
                  setImportFile(null)
                  setImportResults(null)
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={handleUploadMultiSheet}
                disabled={!importFile || importLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {importLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang nạp file...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Bắt đầu nạp dữ liệu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
