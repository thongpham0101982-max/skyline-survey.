"use client"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

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

import { useState, useEffect, useMemo, useRef } from "react"
import * as XLSX from "xlsx"
import {
  Lock,
  Unlock,
  Send,
  X,
  BarChart3,
  FileSpreadsheet, 
  Save, 
  Download, 
  Upload, 
  RefreshCw, 
  BookOpen, 
  Users, 
  Layers, 
  Award,
  CheckCircle2,
  Calendar,
  Sparkles,
  AlertCircle,
  Clock,
  MessageSquare,
  Search,
  Filter,
  ArrowRight,
  UserCheck,
  Check
} from "lucide-react"
import { calculateCompositeScore, getColumnMaxScore } from "@/lib/grading/formula-calculator"
import { Button } from "@/components/ui/button"
import { GvbmResponseModal } from "./components/GvbmResponseModal"

interface Props {
  academicYears: any[]
  activeYearId: string
  initialAssignments?: any[]
  initialClasses: any[]
  initialSubjects: any[]
  teacherName: string
}

const EVAL_PERIODS = [
  { code: "KSĐN", name: "Khảo sát đầu năm (KSĐN)", semester: 1 },
  { code: "GK1", name: "Giữa kỳ 1 (GK1)", semester: 1 },
  { code: "CK1", name: "Cuối kỳ 1 (CK1)", semester: 1 },
  { code: "GK2", name: "Giữa kỳ 2 (GK2)", semester: 2 },
  { code: "CK2", name: "Cuối kỳ 2 (CK2)", semester: 2 }
]

export function DiemNhanXetTeacherClient({
  academicYears,
  activeYearId,
  initialAssignments = [],
  initialClasses,
  initialSubjects,
  teacherName
}: Props) {
  const searchParams = useSearchParams()
  const paramClassId = searchParams?.get("classId") || ""
  const paramSubjectId = searchParams?.get("subjectId") || ""
  const paramStudentId = searchParams?.get("studentId") || ""
  const paramPeriod = searchParams?.get("period") || ""

  const [selectedYearId, setSelectedYearId] = useState(activeYearId || (academicYears[0]?.id || ""))
  const [assignments, setAssignments] = useState<any[]>(initialAssignments)
  const [classes, setClasses] = useState<any[]>(initialClasses)
  const [subjects, setSubjects] = useState<any[]>(initialSubjects)

  // Level, Grade, System filters
  const [selectedLevelFilter, setSelectedLevelFilter] = useState("ALL")
  const [selectedGradeFilter, setSelectedGradeFilter] = useState("ALL")
  const [selectedSystemFilter, setSelectedSystemFilter] = useState("ALL")

  const [selectedPeriod, setSelectedPeriod] = useState(
    paramPeriod && PERIODS.some(p => p.code === paramPeriod) ? paramPeriod : "KSĐN"
  )

  // Target semester based on selected period
  const targetSemester = useMemo(() => {
    return ["GK2", "CK2"].includes(selectedPeriod) ? 2 : 1
  }, [selectedPeriod])

  // Filter assignments matching current Year and Semester (or no semester constraint)
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      if (selectedYearId && a.academicYearId && a.academicYearId !== selectedYearId) return false
      if (a.semester && a.semester !== targetSemester) return false
      return true
    })
  }, [assignments, selectedYearId, targetSemester])

  // Computed assigned classes for current year & semester
  const assignedClasses = useMemo(() => {
    const map = new Map()
    filteredAssignments.forEach(a => {
      if (a.class) map.set(a.class.id, a.class)
    })
    // Fallback: if no assignments array passed, use classes state
    if (map.size === 0 && assignments.length === 0 && classes.length > 0) {
      classes.forEach(c => map.set(c.id, c))
    }
    return Array.from(map.values())
  }, [filteredAssignments, assignments.length, classes])

  // Computed assigned subjects for current year, semester, and selected class
  const [selectedClassId, setSelectedClassId] = useState<string>(paramClassId || "")
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(paramSubjectId || "")

  const assignedSubjects = useMemo(() => {
    const map = new Map()
    filteredAssignments.forEach(a => {
      if (a.subject) {
        if (!selectedClassId || a.classId === selectedClassId) {
          map.set(a.subject.id, a.subject)
        }
      }
    })
    // Fallback if no assignments list available
    if (map.size === 0 && assignments.length === 0 && subjects.length > 0) {
      subjects.forEach(s => map.set(s.id, s))
    }
    return Array.from(map.values())
  }, [filteredAssignments, selectedClassId, assignments.length, subjects])

  const educationSystemOptions = useMemo(() => {
    const set = new Set<string>()
    assignedClasses.forEach(c => {
      if (c.educationSystem && c.educationSystem.trim()) {
        set.add(c.educationSystem.trim())
      }
    })
    return Array.from(set).sort()
  }, [assignedClasses])

  const filteredClasses = useMemo(() => {
    return assignedClasses.filter(c => {
      if (selectedLevelFilter !== "ALL") {
        const cLevel = (c.level || "").toLowerCase()
        const cGrade = (c.grade || "").toLowerCase()
        const cName = (c.className || "").toLowerCase()

        if (selectedLevelFilter === "TieuHoc") {
          const isMatch = cLevel.includes("tiểu học") || cLevel.includes("tieu hoc") ||
            ["1", "2", "3", "4", "5"].some(g => cGrade === g || cGrade === `khối ${g}` || cName.startsWith(g))
          if (!isMatch) return false
        } else if (selectedLevelFilter === "THCS") {
          const isMatch = cLevel.includes("thcs") ||
            ["6", "7", "8", "9"].some(g => cGrade === g || cGrade === `khối ${g}` || cName.startsWith(g))
          if (!isMatch) return false
        } else if (selectedLevelFilter === "THPT") {
          const isMatch = cLevel.includes("thpt") ||
            ["10", "11", "12"].some(g => cGrade === g || cGrade === `khối ${g}` || cName.startsWith(g))
          if (!isMatch) return false
        } else if (selectedLevelFilter === "MamNon") {
          const isMatch = cLevel.includes("mầm non") || cLevel.includes("mam non") || cLevel.includes("nhà trẻ") || cLevel.includes("mẫu giáo")
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

      // If a subject is selected, class must be in assignment with that subject
      if (selectedSubjectId && filteredAssignments.length > 0) {
        const hasAssignment = filteredAssignments.some(a => a.classId === c.id && a.subjectId === selectedSubjectId)
        if (!hasAssignment) return false
      }

      return true
    })
  }, [assignedClasses, selectedLevelFilter, selectedGradeFilter, selectedSystemFilter, selectedSubjectId, filteredAssignments])

  // Sync selectedClassId and selectedSubjectId when filters change
  useEffect(() => {
    if (filteredClasses.length > 0) {
      if (paramClassId && filteredClasses.some(c => c.id === paramClassId)) {
        if (selectedClassId !== paramClassId) {
          setSelectedClassId(paramClassId)
        }
      } else if (!filteredClasses.some(c => c.id === selectedClassId)) {
        setSelectedClassId(filteredClasses[0].id)
      }
    } else {
      setSelectedClassId("")
    }
  }, [filteredClasses, paramClassId])

  useEffect(() => {
    if (assignedSubjects.length > 0) {
      if (paramSubjectId && assignedSubjects.some(s => s.id === paramSubjectId)) {
        if (selectedSubjectId !== paramSubjectId) {
          setSelectedSubjectId(paramSubjectId)
        }
      } else if (!assignedSubjects.some(s => s.id === selectedSubjectId)) {
        setSelectedSubjectId(assignedSubjects[0].id)
      }
    } else {
      setSelectedSubjectId("")
    }
  }, [assignedSubjects, paramSubjectId])

  const [gradeSheetData, setGradeSheetData] = useState<{
    config: any
    students: any[]
    entries: Record<string, { componentScores: Record<string, string>; compositeScore: string; remark: string }>
  }>({
    config: null,
    students: [],
    entries: {}
  })

  const [loadingSheet, setLoadingSheet] = useState(false)
  const [savingEntries, setSavingEntries] = useState(false)
  const [isSheetLocked, setIsSheetLocked] = useState(false)
  const [sheetLockInfo, setSheetLockInfo] = useState<any>(null)
  const [unlockRequest, setUnlockRequest] = useState<any>(null)
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false)
  const [unlockReason, setUnlockReason] = useState("")
  const [submittingUnlock, setSubmittingUnlock] = useState(false)
  const [cancellingUnlock, setCancellingUnlock] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Active Tab state: "grades" (Sổ điểm & Nhận xét) | "coordination" (Ý kiến phản hồi PHHS & Phối hợp GVCN)
  const [activeTab, setActiveTab] = useState<"grades" | "coordination">("grades")
  const [coordFilter, setCoordFilter] = useState<"ALL" | "PENDING" | "RESPONDED">("ALL")
  const [coordSearchTerm, setCoordSearchTerm] = useState("")

  useEffect(() => {
    if (paramStudentId) {
      setActiveTab("coordination")
    }
  }, [paramStudentId])

  // Homeroom Coordination state
  const [homeroomCoordination, setHomeroomCoordination] = useState<Record<string, any>>({})
  const [selectedCoordStudent, setSelectedCoordStudent] = useState<any>(null)
  const [coordModalOpen, setCoordModalOpen] = useState(false)

  const handleOpenCoordModal = (student: any) => {
    setSelectedCoordStudent(student)
    setCoordModalOpen(true)
  }

  const handleCoordinationSaved = (studentId: string, responseData: any) => {
    setHomeroomCoordination(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        gvbmResponse: responseData
      }
    }))
  }

  const coordStudents = useMemo(() => {
    const list = gradeSheetData.students.filter(st => Boolean(homeroomCoordination[st.id]))
    return {
      all: list,
      pending: list.filter(st => !homeroomCoordination[st.id]?.gvbmResponse),
      responded: list.filter(st => Boolean(homeroomCoordination[st.id]?.gvbmResponse))
    }
  }, [gradeSheetData.students, homeroomCoordination])

  const displayedCoordStudents = useMemo(() => {
    let list = coordStudents.all
    if (coordFilter === "PENDING") {
      list = coordStudents.pending
    } else if (coordFilter === "RESPONDED") {
      list = coordStudents.responded
    }

    if (coordSearchTerm.trim()) {
      const q = coordSearchTerm.trim().toLowerCase()
      list = list.filter(st => 
        (st.studentName && st.studentName.toLowerCase().includes(q)) ||
        (st.studentCode && st.studentCode.toLowerCase().includes(q))
      )
    }

    return list
  }, [coordStudents, coordFilter, coordSearchTerm])

  const handleExportCoordinationExcel = () => {
    if (coordStudents.all.length === 0) {
      alert("Chưa có dữ liệu ý kiến PHHS để xuất Excel.")
      return
    }

    const currentClass = assignedClasses.find(c => c.id === selectedClassId)
    const currentSubject = assignedSubjects.find(s => s.id === selectedSubjectId)
    const periodName = EVAL_PERIODS.find(p => p.code === selectedPeriod)?.name || selectedPeriod

    const rows = coordStudents.all.map((st, idx) => {
      const coord = homeroomCoordination[st.id] || {}
      return {
        "STT": idx + 1,
        "Mã học sinh": st.studentCode,
        "Họ và tên học sinh": st.studentName,
        "Lớp": currentClass?.className || "",
        "Môn học": currentSubject?.subjectName || "",
        "Kỳ khảo sát": periodName,
        "Ý kiến phản hồi của PHHS": coord.parentFeedback || "",
        "Giáo viên Chủ nhiệm": coord.homeroomTeacherName || "",
        "Lời nhắn / Đề xuất từ GVCN": coord.forwardedGvbm?.message || "",
        "Ngày GVCN chuyển tiếp": coord.forwardedGvbm?.forwardedAt ? new Date(coord.forwardedGvbm.forwardedAt).toLocaleString("vi-VN") : "",
        "Trạng thái GVBM": coord.gvbmResponse ? "Đã phản hồi" : "Chờ phản hồi",
        "Biện pháp hỗ trợ": coord.gvbmResponse?.statusText || "",
        "Nội dung phản hồi của GVBM": coord.gvbmResponse?.responseContent || "",
        "Thời gian GVBM phản hồi": coord.gvbmResponse?.respondedAt ? new Date(coord.gvbmResponse.respondedAt).toLocaleString("vi-VN") : ""
      }
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "YKienPHHS_PhoiHopGVBM")
    XLSX.writeFile(wb, `TongHop_YKienPHHS_Mon_${currentSubject?.subjectName || "Mon"}_Lop_${currentClass?.className || "Lop"}_Ky_${selectedPeriod}.xlsx`)
  }

  // Auto-open coordination modal if studentId is passed in URL query param
  const hasAutoOpenedModal = useRef(false)
  useEffect(() => {
    if (paramStudentId && !hasAutoOpenedModal.current && gradeSheetData.students.length > 0) {
      const target = gradeSheetData.students.find(
        st => st.id === paramStudentId || st.studentCode === paramStudentId
      )
      if (target) {
        hasAutoOpenedModal.current = true
        handleOpenCoordModal(target)
      }
    }
  }, [paramStudentId, gradeSheetData.students])

  // Fetch teaching assignments if academic year changes
  useEffect(() => {
    fetch(`/api/teacher/grade-entries?action=getAssignments&academicYearId=${selectedYearId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (Array.isArray(data.assignments)) {
            setAssignments(data.assignments)
          }
          setClasses(data.classes || [])
          setSubjects(data.subjects || [])
        }
      })
      .catch(console.error)
  }, [selectedYearId])

  const fetchGradeSheet = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      setGradeSheetData({ config: null, students: [], entries: {} })
      setIsSheetLocked(false)
      setSheetLockInfo(null)
      setHomeroomCoordination({})
      return
    }
    try {
      setLoadingSheet(true)
      const res = await fetch(
        `/api/teacher/grade-entries?academicYearId=${selectedYearId}&classId=${selectedClassId}&subjectId=${selectedSubjectId}&evaluationPeriod=${selectedPeriod}`
      )
      const data = await res.json()
      if (data.success) {
        const entryDict: Record<string, { componentScores: Record<string, string>; compositeScore: string; remark: string }> = {}
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
              remark: e.remark || ""
            }
          })
        }
        setIsSheetLocked(Boolean(data.isLocked))
        setSheetLockInfo(data.lockInfo || null)
        setHomeroomCoordination(data.homeroomCoordination || {})
        setGradeSheetData({
          config: data.config,
          students: data.students || [],
          entries: entryDict
        })
      }
    } catch (err) {
      console.error("Lỗi tải bảng điểm:", err)
    } finally {
      setLoadingSheet(false)
    }
  }

  useEffect(() => {
    fetchGradeSheet()
  }, [selectedClassId, selectedSubjectId, selectedPeriod, selectedYearId])

  const handleOpenUnlockModal = () => {
    setUnlockReason("")
    setIsUnlockModalOpen(true)
  }

  const handleSubmitUnlockRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unlockReason.trim()) {
      alert("Vui lòng nhập lý do yêu cầu mở sổ!")
      return
    }
    try {
      setSubmittingUnlock(true)
      const res = await fetch("/api/teacher/gradebook-unlock-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          evaluationPeriod: selectedPeriod,
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          reason: unlockReason.trim()
        })
      })
      const data = await res.json()
      if (data.success) {
        setUnlockRequest(data.request)
        setIsUnlockModalOpen(false)
        alert(data.message || "Đã gửi yêu cầu mở sổ thành công!")
      } else {
        alert("Lỗi: " + (data.error || "Không thể gửi yêu cầu"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setSubmittingUnlock(false)
    }
  }

  const handleCancelUnlockRequest = async () => {
    if (!unlockRequest?.id) return
    if (!confirm("Bạn có chắc chắn muốn hủy yêu cầu mở sổ điểm này?")) return
    try {
      setCancellingUnlock(true)
      const res = await fetch(`/api/teacher/gradebook-unlock-request?requestId=${unlockRequest.id}`, {
        method: "DELETE"
      })
      const data = await res.json()
      if (data.success) {
        setUnlockRequest(null)
        alert("Đã hủy yêu cầu mở sổ thành công.")
      } else {
        alert("Lỗi: " + (data.error || "Không thể hủy yêu cầu"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setCancellingUnlock(false)
    }
  }

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

  const handleSaveGradeSheet = async () => {
    if (isSheetLocked) {
      alert("Sổ điểm đã bị khóa bởi Ban Khảo thí & ĐBCL, không thể lưu thay đổi!")
      return
    }
    if (!selectedClassId || !selectedSubjectId) {
      alert("Chưa chọn lớp và môn học!")
      return
    }
    try {
      setSavingEntries(true)
      const entriesList = Object.entries(gradeSheetData.entries).map(([studentId, data]) => ({
        studentId,
        componentScores: data.componentScores,
        compositeScore: data.compositeScore,
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
          entries: entriesList
        })
      })
      const data = await res.json()
      if (data.success) {
        alert("Đã lưu sổ điểm thành công!")
      } else {
        alert("Lỗi: " + (data.error || "Không thể lưu điểm"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setSavingEntries(false)
    }
  }

  const handleExportExcel = () => {
    const currentClass = filteredClasses.find(c => c.id === selectedClassId)
    const currentSubject = assignedSubjects.find(s => s.id === selectedSubjectId)
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

    const fileName = `SổĐiểm_${currentClass?.className || "Lớp"}_${currentSubject?.subjectCode || "Môn"}_${selectedPeriod}.xlsx`
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
        const wsName = wb.SheetNames[0]
        const ws = wb.Sheets[wsName]
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

        if (!data || data.length < 2) {
          alert("File Excel không có dữ liệu hợp lệ")
          return
        }

        const headers = data[0].map(h => String(h || "").trim())
        const codeIdx = headers.findIndex(h => h.toLowerCase().includes("mã hs") || h.toLowerCase().includes("ma hs"))
        if (codeIdx === -1) {
          alert("Không tìm thấy cột 'Mã HS' trong tệp Excel!")
          return
        }

        const studentMapByCode = new Map<string, string>()
        gradeSheetData.students.forEach(st => {
          studentMapByCode.set(st.studentCode.trim().toLowerCase(), st.id)
        })

        const newEntries = { ...gradeSheetData.entries }
        let countImported = 0
        const customCompTitle = (gradeSheetData.config?.compositeColumnName || "").trim().toLowerCase()

        for (let r = 1; r < data.length; r++) {
          const row = data[r]
          if (!row || !row[codeIdx]) continue
          const stCode = String(row[codeIdx]).trim().toLowerCase()
          const stId = studentMapByCode.get(stCode)
          if (!stId) continue

          const compScores: Record<string, string> = {}
          activeColNames.forEach((colName: string, cIdx: number) => {
            const cleanColName = colName.trim().toLowerCase()
            const hIdx = headers.findIndex(h => {
              const cleanH = h.trim().toLowerCase().replace(/\s*\(tối đa.*?\)/i, "")
              return cleanH === cleanColName || h.toLowerCase() === cleanColName
            })
            if (hIdx !== -1 && row[hIdx] !== undefined && row[hIdx] !== null) {
              compScores[`col${cIdx}`] = String(row[hIdx])
            }
          })

          const compScoreIdx = headers.findIndex(h => {
            const lower = h.toLowerCase()
            return (customCompTitle && lower === customCompTitle) || lower.includes("thành phần") || lower.includes("tổng hợp") || lower.includes("tb môn")
          })

          let compVal = ""
          if (compScoreIdx !== -1 && row[compScoreIdx] !== undefined && String(row[compScoreIdx]).trim() !== "") {
            compVal = String(row[compScoreIdx])
          } else if (gradeSheetData.config?.hasCompositeColumn !== false) {
            compVal = calculateCompositeScore(compScores, gradeSheetData.config, activeColNames.length)
          }

          const remIdx = headers.findIndex(h => h.toLowerCase().includes("nhận xét") || h.toLowerCase().includes("nhan xet"))
          let remVal = ""
          if (remIdx !== -1 && row[remIdx] !== undefined) {
            remVal = String(row[remIdx])
          }

          newEntries[stId] = {
            componentScores: compScores,
            compositeScore: compVal,
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

  const currentClass = filteredClasses.find(c => c.id === selectedClassId)
  const currentSubject = assignedSubjects.find(s => s.id === selectedSubjectId)
  const hasNoAssignments = filteredClasses.length === 0 || assignedSubjects.length === 0

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#48BFE3] rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-teal-200 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              Công tác Giáo viên Bộ môn
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Sổ điểm & Nhận xét</h1>
            <p className="text-teal-100 text-xs md:text-sm mt-1">
              Xin chào <strong className="text-white">{teacherName}</strong>, danh sách môn và lớp giảng dạy tự động bám sát theo <strong className="text-amber-300">Phân công giảng dạy</strong> được giao.
            </p>
          </div>

          <div className="flex items-center gap-3">
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
          </div>
        </div>

        {/* Selection Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 mt-6 bg-black/20 p-4 rounded-xl backdrop-blur-md border border-white/10">
          <div>
            <label className="block text-[11px] font-bold text-teal-200 mb-1">Bậc học:</label>
            <select
              value={selectedLevelFilter}
              onChange={(e) => {
                setSelectedLevelFilter(e.target.value)
                setSelectedGradeFilter("ALL")
              }}
              className="w-full bg-white text-slate-800 font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-300 outline-none"
            >
              <option value="ALL">-- Tất cả Bậc --</option>
              <option value="TieuHoc">Tiểu học (1-5)</option>
              <option value="THCS">THCS (6-9)</option>
              <option value="THPT">THPT (10-12)</option>
              <option value="MamNon">Mầm non</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-teal-200 mb-1">Khối học:</label>
            <select
              value={selectedGradeFilter}
              onChange={(e) => setSelectedGradeFilter(e.target.value)}
              className="w-full bg-white text-slate-800 font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-300 outline-none"
            >
              <option value="ALL">-- Tất cả Khối --</option>
              {selectedLevelFilter === "TieuHoc" && ["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5"].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
              {selectedLevelFilter === "THCS" && ["Khối 6", "Khối 7", "Khối 8", "Khối 9"].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
              {selectedLevelFilter === "THPT" && ["Khối 10", "Khối 11", "Khối 12"].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
              {selectedLevelFilter === "ALL" && ["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5", "Khối 6", "Khối 7", "Khối 8", "Khối 9", "Khối 10", "Khối 11", "Khối 12"].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-teal-200 mb-1">Hệ học:</label>
            <select
              value={selectedSystemFilter}
              onChange={(e) => setSelectedSystemFilter(e.target.value)}
              className="w-full bg-white text-slate-800 font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-300 outline-none"
            >
              <option value="ALL">-- Tất cả Hệ --</option>
              {educationSystemOptions.map(sys => (
                <option key={sys} value={sys}>{sys}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-teal-200 mb-1">Lớp giảng dạy ({filteredClasses.length}):</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={filteredClasses.length === 0}
              className="w-full bg-white text-slate-800 font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-300 outline-none disabled:bg-slate-100 disabled:text-slate-400"
            >
              {filteredClasses.length === 0 ? (
                <option value="">-- Đang chờ phân công --</option>
              ) : (
                filteredClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.className} ({c.grade || c.level})</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-teal-200 mb-1">Môn giảng dạy:</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              disabled={assignedSubjects.length === 0}
              className="w-full bg-white text-slate-800 font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-300 outline-none disabled:bg-slate-100 disabled:text-slate-400"
            >
              {assignedSubjects.length === 0 ? (
                <option value="">-- Đang chờ phân công --</option>
              ) : (
                assignedSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.subjectName} ({s.subjectCode})</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-teal-200 mb-1">Kỳ đánh giá:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full bg-teal-100 text-teal-950 font-extrabold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-300 outline-none"
            >
              {EVAL_PERIODS.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Gradebook Container */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-[#48BFE3]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {hasNoAssignments
                  ? "Sổ điểm & Nhận xét"
                  : `Sổ điểm Lớp ${currentClass?.className || "Lớp"} - Môn ${currentSubject?.subjectName || "Môn"}`}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Đang làm việc tại Kỳ: <strong className="text-teal-700">{selectedPeriod} (Học kỳ {targetSemester})</strong> | Tổng số học sinh: <strong>{gradeSheetData.students.length}</strong>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          {!hasNoAssignments && (
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportExcel}
                accept=".xlsx, .xls"
                className="hidden"
              />

              <Link
                href={`/teacher/phan-tich-chat-luong?subjectId=${selectedSubjectId}&evaluationPeriod=${selectedPeriod}`}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 rounded-xl text-xs font-bold transition-all shadow-2xs"
              >
                <BarChart3 className="w-3.5 h-3.5 text-sky-600" />
                <span>Đối sánh chất lượng</span>
              </Link>
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Xuất Excel Mẫu
              </button>

              <button
                type="button"
                onClick={() => { if (isSheetLocked) { alert("Sổ điểm đã bị khóa, không thể upload điểm mới!"); return; } fileInputRef.current?.click(); }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 rounded-xl text-xs font-bold transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Excel
              </button>

              <button
                type="button"
                onClick={handleSaveGradeSheet}
                disabled={savingEntries || isSheetLocked}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#48BFE3] hover:bg-[#008c82] text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
              >
                {savingEntries ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Lưu Sổ Điểm
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs (Tag chọn chế độ) */}
        {!hasNoAssignments && (
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("grades")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "grades"
                  ? "bg-teal-700 text-white shadow-md shadow-teal-700/20"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Sổ Điểm & Đánh Giá Môn Học</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("coordination")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "coordination"
                  ? "bg-teal-700 text-white shadow-md shadow-teal-700/20"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Ý Kiến Phản Hồi PHHS & Trao Đổi GVCN</span>
              {coordStudents.all.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  coordStudents.pending.length > 0
                    ? "bg-amber-400 text-amber-950 animate-pulse"
                    : "bg-teal-100 text-teal-800"
                }`}>
                  {coordStudents.all.length} {coordStudents.pending.length > 0 ? `(${coordStudents.pending.length} chờ)` : ""}
                </span>
              )}
            </button>
          </div>
        )}

        {/* TAB 1: SỔ ĐIỂM & ĐÁNH GIÁ MÔN HỌC */}
        {activeTab === "grades" && (
          <div className="space-y-6">

        {/* CẢNH BÁO SỔ ĐIỂM ĐÃ BỊ KHÓA & NÚT YÊU CẦU MỞ SỔ */}
        {isSheetLocked && !hasNoAssignments && (
          <div className="bg-purple-50 border-2 border-purple-200 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-purple-950 uppercase tracking-wide flex flex-wrap items-center gap-1.5">
                  <span>SỔ ĐIỂM ĐÃ BỊ KHÓA BỞI BAN KHẢO THÍ & ĐBCL</span>
                  {sheetLockInfo?.lockedBy && (
                    <span className="text-[11px] font-normal text-purple-700">
                      ({sheetLockInfo.lockedBy})
                    </span>
                  )}
                </div>
                <div className="text-xs text-purple-800 mt-0.5">
                  Sổ điểm môn này trong Kỳ {EVAL_PERIODS.find(p => p.code === selectedPeriod)?.name || selectedPeriod} hiện đang ở trạng thái Khóa. Điểm số được bảo lưu và ở chế độ chỉ xem.
                </div>

                {/* Status indicator: Pending unlock request */}
                {unlockRequest && unlockRequest.status === "PENDING" && (
                  <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-900 text-xs font-semibold shadow-xs">
                    <Clock className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                    <span>
                      Đã gửi yêu cầu mở sổ: <span className="font-normal italic">"{unlockRequest.reason}"</span> ({new Date(unlockRequest.requestedAt).toLocaleDateString("vi-VN")}) - Đang chờ Admin duyệt
                    </span>
                  </div>
                )}

                {/* Status indicator: Rejected unlock request */}
                {unlockRequest && unlockRequest.status === "REJECTED" && (
                  <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-100/90 border border-rose-300 text-rose-900 text-xs font-medium shadow-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      Yêu cầu mở sổ bị từ chối bởi {unlockRequest.resolvedBy || "Khảo thí"}: <span className="font-semibold italic">"{unlockRequest.resolvedNote || "Chưa phù hợp"}"</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Unlock Action Button */}
            <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
              {(!unlockRequest || unlockRequest.status !== "PENDING") ? (
                <button
                  type="button"
                  onClick={handleOpenUnlockModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 shadow-md shadow-purple-500/20 active:scale-95 transition-all"
                >
                  <Unlock className="w-4 h-4" />
                  {unlockRequest?.status === "REJECTED" ? "Gửi lại yêu cầu mở sổ" : "Yêu cầu mở sổ"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCancelUnlockRequest}
                  disabled={cancellingUnlock}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-900 bg-white border border-amber-300 hover:bg-amber-50 active:scale-95 transition-all"
                >
                  {cancellingUnlock ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5 text-amber-700" />}
                  Hủy yêu cầu
                </button>
              )}
            </div>
          </div>
        )}

        {/* Coordination Banner with Homeroom Teacher */}
        {!hasNoAssignments && coordStudents.all.length > 0 && (
          <div className="bg-gradient-to-r from-sky-50 via-teal-50 to-indigo-50 border border-teal-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <span>Phối Hợp Ý Kiến PHHS & Đề Xuất Từ GVCN</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
                    {coordStudents.all.length} học sinh
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                  Giáo viên Chủ nhiệm đã chuyển tiếp ý kiến PHHS và đề xuất GVBM hỗ trợ học sinh môn {currentSubject?.subjectName || "bộ môn"}.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {coordStudents.pending.length > 0 && (
                <span className="px-2.5 py-1 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold">
                  Chờ phản hồi: {coordStudents.pending.length}
                </span>
              )}
              {coordStudents.responded.length > 0 && (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Đã phản hồi: {coordStudents.responded.length}
                </span>
              )}
              <button
                type="button"
                onClick={() => setActiveTab("coordination")}
                className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <span>Xem danh sách & Phản hồi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Empty State when teacher has no assignments for this semester/year */}
        {hasNoAssignments ? (
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-10 text-center space-y-3.5 my-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
              <Clock className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-amber-900 uppercase tracking-wider">
                Đang chờ phân công giảng dạy
              </h3>
              <p className="text-xs text-amber-800/90 max-w-md mx-auto font-medium leading-relaxed">
                Chưa ghi nhận dữ liệu phân công môn học và lớp giảng dạy cho Giáo viên trong <strong>{EVAL_PERIODS.find(p => p.code === selectedPeriod)?.name}</strong> (Học kỳ {targetSemester}).
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-amber-200 text-[11px] font-bold text-amber-800 shadow-2xs">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Vui lòng liên hệ BGH / Ban Chuyên môn để cập nhật Phân công giảng dạy
              </span>
            </div>
          </div>
        ) : (
          /* Table view */
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            {loadingSheet ? (
              <div className="text-center py-12 text-slate-400 text-xs font-semibold animate-pulse">Đang tải dữ liệu sổ điểm...</div>
            ) : gradeSheetData.students.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-semibold">Chưa có danh sách học sinh cho lớp học này</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold">
                    <th className="py-3 px-3 w-12 text-center border-r border-slate-700">STT</th>
                    <th className="py-3 px-3 w-28 border-r border-slate-700">Mã HS</th>
                    <th className="py-3 px-3 w-52 border-r border-slate-700">Họ và tên</th>
                    <th className="py-3 px-3 w-32 border-r border-slate-700">Môn học</th>
                    
                    {activeColNames.map((colName: string, idx: number) => {
                      const cType = activeColTypes[idx] || "SCORE_10"
                      const colMax = getColumnMaxScore(cType, gradeSheetData.config?.columnMaxScores, idx)
                      return (
                        <th key={idx} className="py-2.5 px-3 text-center border-r border-slate-700 bg-slate-700/60 min-w-[95px]">
                          <div>{colName}</div>
                          {colMax !== 10 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400 text-slate-900 font-black inline-block mt-0.5 shadow-sm">
                              Tối đa {colMax}đ
                            </span>
                          )}
                        </th>
                      )
                    })}

                    {gradeSheetData.config?.hasCompositeColumn !== false && (
                      <th className="py-3 px-3 text-center border-r border-slate-700 bg-teal-800 min-w-[110px]">
                        {gradeSheetData.config?.compositeColumnName || "Điểm thành phần"}
                      </th>
                    )}

                    {gradeSheetData.config?.hasRemarkColumn !== false && (
                      <th className="py-3 px-3 border-slate-700 bg-indigo-950 min-w-[200px]">
                        Nhận xét của GVBM
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {gradeSheetData.students.map((st, sIdx) => {
                    const entry = gradeSheetData.entries[st.id] || { componentScores: {}, compositeScore: "", remark: "" }

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-500 border-r border-slate-200">
                          {sIdx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700 border-r border-slate-200">
                          {st.studentCode}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-200">
                          <div>
                            <div>{st.studentName}</div>
                            {homeroomCoordination[st.id] && (
                              <div className="mt-1">
                                {homeroomCoordination[st.id].gvbmResponse ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCoordModal(st)}
                                    className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-[10px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                    title="Xem và cập nhật kết quả phản hồi gửi đến GVCN"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Đã phản hồi GVCN</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCoordModal(st)}
                                    className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] inline-flex items-center gap-1 shadow-2xs animate-pulse transition-all cursor-pointer"
                                    title="GVCN đề xuất phối hợp hỗ trợ môn học theo ý kiến PHHS - Bấm để tiếp nhận & phản hồi"
                                  >
                                    <MessageSquare className="w-3 h-3 text-amber-600" />
                                    <span>Ý kiến PHHS (Cần phản hồi GVCN)</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium border-r border-slate-200">
                          {currentSubject?.subjectName || "Môn"}
                        </td>

                        {activeColNames.map((_: any, cIdx: number) => {
                          const colType = activeColTypes[cIdx] || "SCORE_10"
                          const val = entry.componentScores[`col${cIdx}`] ?? ""

                          if (colType === "GRADE_SKL") {
                            return (
                              <td key={cIdx} className="py-2 px-2 text-center border-r border-slate-200 min-w-[110px]">
                                <select
                                  disabled={isSheetLocked}
                                  value={val}
                                  onChange={(e) => handleScoreChange(st.id, cIdx, e.target.value)}
                                  className="w-full text-center border border-slate-200 rounded-lg py-1 text-xs font-extrabold text-slate-800 bg-amber-50/60 focus:ring-2 focus:ring-amber-500 outline-none"
                                >
                                  <option value="">-- SKL --</option>
                                  {SKL_OPTIONS.map(opt => (
                                    <option key={opt.code} value={opt.code}>{opt.label}</option>
                                  ))}
                                </select>
                              </td>
                            )
                          }

                          if (colType === "GRADE_INTL") {
                            return (
                              <td key={cIdx} className="py-2 px-2 text-center border-r border-slate-200 min-w-[130px]">
                                <select
                                  disabled={isSheetLocked}
                                  value={val}
                                  onChange={(e) => handleScoreChange(st.id, cIdx, e.target.value)}
                                  className="w-full text-center border border-slate-200 rounded-lg py-1 text-xs font-extrabold text-slate-800 bg-purple-50/60 focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                  <option value="">-- Quốc tế --</option>
                                  {INTL_OPTIONS.map(opt => (
                                    <option key={opt.code} value={opt.code}>{opt.label}</option>
                                  ))}
                                </select>
                              </td>
                            )
                          }

                          if (colType === "REMARK") {
                            return (
                              <td key={cIdx} className="py-2 px-2 border-r border-slate-200 min-w-[160px]">
                                <input
                                  disabled={isSheetLocked}
                                  type="text"
                                  value={val}
                                  onChange={(e) => handleScoreChange(st.id, cIdx, e.target.value)}
                                  className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:ring-2 focus:ring-[#48BFE3] outline-none"
                                  placeholder="Nhập nhận xét..."
                                />
                              </td>
                            )
                          }

                          const colMax = getColumnMaxScore(colType, gradeSheetData.config?.columnMaxScores, cIdx)
                          const numVal = Number(String(val).replace(",", "."))
                          const isOver = !isNaN(numVal) && numVal > colMax

                          return (
                            <td key={cIdx} className="py-2 px-2 text-center border-r border-slate-200 min-w-[80px]">
                              <input
                                  disabled={isSheetLocked}
                                  type="text"
                                  value={val}
                                  onChange={(e) => handleScoreChange(st.id, cIdx, e.target.value)}
                                className={`w-16 text-center border rounded-lg py-1 text-xs font-extrabold outline-none transition-all ${
                                  isOver
                                    ? "border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-300 font-black"
                                    : "border-slate-200 text-slate-800 focus:ring-2 focus:ring-[#48BFE3] focus:border-[#48BFE3]"
                                }`}
                                placeholder={`0-${colMax}`}
                                title={isOver ? `Điểm vượt quá tối đa ${colMax}đ` : `Tối đa ${colMax}đ`}
                              />
                            </td>
                          )
                        })}

                        {gradeSheetData.config?.hasCompositeColumn !== false && (
                          <td className="py-2 px-2 text-center border-r border-slate-200 bg-teal-50/50">
                            <span className="font-black text-sm text-[#48BFE3]">
                              {entry.compositeScore || "-"}
                            </span>
                          </td>
                        )}

                        {gradeSheetData.config?.hasRemarkColumn !== false && (
                          <td className="py-2 px-2">
                            <input
                              disabled={isSheetLocked}
                              type="text"
                              value={entry.remark ?? ""}
                              onChange={(e) => handleRemarkChange(st.id, e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:ring-2 focus:ring-[#48BFE3] outline-none"
                              placeholder="Nhập nhận xét..."
                            />
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: Ý KIẾN PHẢN HỒI PHHS & TRAO ĐỔI GVCN */}
      {/* ======================================================== */}
      {activeTab === "coordination" && (
        <div className="space-y-5 animate-fadeIn">
          {/* Header Card: Chọn kỳ khảo sát / Học kỳ & Thao tác */}
          <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              {/* Chọn Kỳ khảo sát / Học kỳ */}
              <div className="space-y-1.5">
                <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span>Chọn Kỳ khảo sát / Học kỳ</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {EVAL_PERIODS.map(period => {
                    const isSelected = selectedPeriod === period.code
                    return (
                      <button
                        key={period.code}
                        type="button"
                        onClick={() => setSelectedPeriod(period.code)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-teal-700 text-white shadow-sm shadow-teal-700/30 scale-102"
                            : "bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        {period.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Thông tin lớp, môn & Nút Xuất Excel */}
              <div className="flex items-center gap-2 self-start lg:self-center flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
                  <span>{currentClass?.className || "Lớp"}</span>
                  <span>•</span>
                  <span>{currentSubject?.subjectName || "Môn"}</span>
                </div>

                <button
                  type="button"
                  onClick={handleExportCoordinationExcel}
                  disabled={coordStudents.all.length === 0}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất Excel Báo Cáo</span>
                </button>
              </div>
            </div>

            {/* 3 Thẻ thống kê nhanh */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
                <div>
                  <div className="text-[11px] font-bold text-sky-800 uppercase tracking-wide">Tổng Ý Kiến PHHS</div>
                  <div className="text-2xl font-black text-sky-950 mt-0.5">{coordStudents.all.length}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sky-200/90 text-sky-800 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
                <div>
                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Chờ GVBM Phản Hồi</div>
                  <div className="text-2xl font-black text-amber-950 mt-0.5">{coordStudents.pending.length}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-200/90 text-amber-800 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
                <div>
                  <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Đã Phản Hồi GVCN</div>
                  <div className="text-2xl font-black text-emerald-950 mt-0.5">{coordStudents.responded.length}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-200/90 text-emerald-800 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Thanh lọc trạng thái & Tìm kiếm */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCoordFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    coordFilter === "ALL"
                      ? "bg-slate-800 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Tất cả ({coordStudents.all.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCoordFilter("PENDING")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    coordFilter === "PENDING"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  Chờ phản hồi ({coordStudents.pending.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCoordFilter("RESPONDED")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    coordFilter === "RESPONDED"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  Đã phản hồi ({coordStudents.responded.length})
                </button>
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={coordSearchTerm}
                  onChange={(e) => setCoordSearchTerm(e.target.value)}
                  placeholder="Tìm tên hoặc mã HS..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Bảng danh sách chi tiết */}
          {displayedCoordStudents.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 shadow-xs space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-extrabold text-slate-700">
                {coordStudents.all.length === 0
                  ? `Chưa ghi nhận ý kiến phản hồi PHHS nào cần phối hợp môn ${currentSubject?.subjectName || "bộ môn"} trong kỳ ${EVAL_PERIODS.find(p => p.code === selectedPeriod)?.name || selectedPeriod}.`
                  : "Không tìm thấy học sinh nào phù hợp với bộ lọc."}
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Khi Giáo viên Chủ nhiệm chuyển tiếp ý kiến của Phụ huynh học sinh cần hỗ trợ môn học, thông tin sẽ được cập nhật trực tiếp tại đây.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold">
                    <th className="py-3 px-3 w-12 text-center border-r border-slate-700">STT</th>
                    <th className="py-3 px-3 w-48 border-r border-slate-700">Học sinh</th>
                    <th className="py-3 px-3 min-w-[280px] border-r border-slate-700">Ý kiến phản hồi của PHHS</th>
                    <th className="py-3 px-3 min-w-[260px] border-r border-slate-700">Trao đổi từ GVCN</th>
                    <th className="py-3 px-3 min-w-[280px]">Kết quả & Biện pháp của GVBM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {displayedCoordStudents.map((st, idx) => {
                    const coord = homeroomCoordination[st.id] || {}
                    const hasResponse = Boolean(coord.gvbmResponse)

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-500 border-r border-slate-200 align-top">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 border-r border-slate-200 align-top space-y-1">
                          <div className="font-extrabold text-slate-900 text-sm">{st.studentName}</div>
                          <div className="text-[11px] font-semibold text-slate-500">Mã: {st.studentCode}</div>
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold">
                            <span>{currentClass?.className || "Lớp"}</span>
                            <span>•</span>
                            <span>{currentSubject?.subjectName || "Môn"}</span>
                          </div>
                        </td>

                        {/* Ý kiến phản hồi của PHHS */}
                        <td className="py-3 px-3 border-r border-slate-200 align-top">
                          <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-extrabold text-sky-900 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-sky-600" />
                                <span>Ý kiến Phụ huynh</span>
                              </span>
                            </div>
                            <p className="text-slate-800 text-xs italic leading-relaxed">
                              "{coord.parentFeedback || "Không có nội dung chi tiết."}"
                            </p>
                          </div>
                        </td>

                        {/* Trao đổi / Đề xuất từ GVCN */}
                        <td className="py-3 px-3 border-r border-slate-200 align-top">
                          <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-extrabold text-indigo-900 flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                                <span>GVCN: {coord.homeroomTeacherName || "Giáo viên Chủ nhiệm"}</span>
                              </span>
                              {coord.forwardedGvbm?.forwardedAt && (
                                <span className="text-[10px] text-indigo-600 font-medium">
                                  {new Date(coord.forwardedGvbm.forwardedAt).toLocaleDateString("vi-VN")}
                                </span>
                              )}
                            </div>
                            <div className="text-slate-700 text-xs leading-relaxed">
                              <strong>Lời nhắn:</strong> "{coord.forwardedGvbm?.message || coord.teacherRemark || "Nhờ Thầy/Cô hỗ trợ và quan sát học sinh trong tiết học."}"
                            </div>
                          </div>
                        </td>

                        {/* Kết quả phản hồi của GVBM */}
                        <td className="py-3 px-3 align-top space-y-2">
                          {hasResponse ? (
                            <div className="space-y-2">
                              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px]">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    {coord.gvbmResponse.statusText || "Đã có biện pháp"}
                                  </span>
                                  {coord.gvbmResponse.respondedAt && (
                                    <span className="text-[10px] text-emerald-700 font-semibold">
                                      {new Date(coord.gvbmResponse.respondedAt).toLocaleDateString("vi-VN")}
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-800 text-xs leading-relaxed">
                                  {coord.gvbmResponse.responseContent}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleOpenCoordModal(st)}
                                className="w-full py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                                <span>Cập nhật phản hồi cho GVCN</span>
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 font-extrabold text-[11px] animate-pulse">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Chờ GVBM phản hồi kết quả</span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-normal">
                                Vui lòng tiếp nhận đề xuất từ GVCN và phản hồi biện pháp hỗ trợ chuyên môn cho học sinh.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleOpenCoordModal(st)}
                                className="w-full py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Tiếp nhận & Phản hồi cho GVCN</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* MODAL YÊU CẦU MỞ SỔ ĐIỂM */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="px-6 py-4 bg-purple-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Unlock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">Yêu cầu mở khóa sổ điểm</h3>
                  <p className="text-[11px] text-purple-200">Gửi yêu cầu tới Ban Khảo thí & ĐBCL</p>
                </div>
              </div>
              <button
                onClick={() => setIsUnlockModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitUnlockRequest} className="p-6 space-y-4">
              {/* Assignment details summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Lớp giảng dạy:</span>
                  <span className="font-bold text-slate-900">
                    {filteredClasses.find(c => c.id === selectedClassId)?.className || "Chưa chọn lớp"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Môn học:</span>
                  <span className="font-bold text-slate-900">
                    {assignedSubjects.find(s => s.id === selectedSubjectId)?.subjectName || "Chưa chọn môn"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kỳ đánh giá:</span>
                  <span className="font-bold text-[#003B3A]">
                    {EVAL_PERIODS.find(p => p.code === selectedPeriod)?.name || selectedPeriod}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5">
                  <span className="text-slate-500">Giáo viên yêu cầu:</span>
                  <span className="font-bold text-purple-900">{teacherName}</span>
                </div>
              </div>

              {/* Reason textarea */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Lý do yêu cầu mở sổ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder="Ví dụ: Cần cập nhật bổ sung điểm kiểm tra bù cho học sinh vắng thi, điều chỉnh nhận xét định tính theo yêu cầu BGH..."
                  className="w-full border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                />
                <p className="text-[11px] text-slate-500 italic">
                  * Yêu cầu sẽ được gửi trực tiếp đến Ban Khảo thí & ĐBCL. Bạn sẽ nhận được thông báo ngay khi yêu cầu được phê duyệt.
                </p>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUnlockModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submittingUnlock}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 shadow-md shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {submittingUnlock ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Gửi yêu cầu mở sổ
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TIẾP NHẬN & PHẢN HỒI KẾT QUẢ ĐẾN GVCN */}
      <GvbmResponseModal
        isOpen={coordModalOpen}
        onClose={() => setCoordModalOpen(false)}
        student={selectedCoordStudent}
        coordinationInfo={selectedCoordStudent ? homeroomCoordination[selectedCoordStudent.id] : null}
        currentClass={currentClass}
        currentSubject={currentSubject}
        selectedPeriod={selectedPeriod}
        academicYearId={selectedYearId}
        onSaved={handleCoordinationSaved}
      />
      </div>
    </div>
  )
}
