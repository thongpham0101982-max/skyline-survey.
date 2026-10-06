// @ts-nocheck
"use client"

import { useRouter } from "next/navigation"

import { useState, useEffect, useMemo } from "react"
import * as XLSX from "xlsx"
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Award, Users,
  Search, Filter, Download, RefreshCw, CheckCircle2, ChevronRight,
  HelpCircle, Eye, Sparkles, BookOpen, Calendar, Layers, GraduationCap,
  Settings, Check, X, Sliders, ExternalLink, User, FileSpreadsheet,
  ArrowUpDown, AlertCircle, CheckSquare, BarChart2
} from "lucide-react"
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Cell
} from "recharts"
import { isGradeMatching, isClassInLevel } from "./grade-utils"

interface Props {
  academicYears: any[]
  selectedYearId: string
  campuses?: any[]
  classes: any[]
  subjects: any[]
  savedConfigs?: any[]
  onNavigateToGradebook?: (params: any) => void
}

const EVAL_PERIODS = [
  { code: "KSĐN", name: "Khảo sát đầu năm (KSĐN)", semester: "HK1" },
  { code: "GK1", name: "Giữa kỳ 1 (GK1)", semester: "HK1" },
  { code: "CK1", name: "Cuối kỳ 1 (CK1)", semester: "HK1" },
  { code: "GK2", name: "Giữa kỳ 2 (GK2)", semester: "HK2" },
  { code: "CK2", name: "Cuối kỳ 2 (CK2)", semester: "HK2" }
]

const GRADES = [
  "Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5",
  "Khối 6", "Khối 7", "Khối 8", "Khối 9",
  "Khối 10", "Khối 11", "Khối 12"
]

export function GradeAnalyticsTab({
  academicYears,
  selectedYearId,
  campuses = [],
  classes = [],
  subjects = [],
  savedConfigs = [],
  onNavigateToGradebook
}: Props) {
  const router = useRouter()

  // Sub-view navigation state: "teachers" | "below_benchmark" | "below_average" | "ksdv_matrix" | "charts"
  const [activeSubView, setActiveSubView] = useState<"teachers" | "below_benchmark" | "below_average" | "ksdv_matrix" | "charts">("teachers")

  // Filter states
  const [selectedCampusId, setSelectedCampusId] = useState("ALL")
  const [selectedLevelFilter, setSelectedLevelFilter] = useState("ALL")
  const [selectedGradeFilter, setSelectedGradeFilter] = useState("ALL")
  const [selectedClassId, setSelectedClassId] = useState("ALL")
  const [selectedSubjectId, setSelectedSubjectId] = useState("ALL")
  const [currentPeriod, setCurrentPeriod] = useState("KSĐN")
  const [baselinePeriod, setBaselinePeriod] = useState("KSĐN")
  const [searchKeyword, setSearchKeyword] = useState("")

  // Tracking view sub-filter
  const [trackingCategory, setTrackingCategory] = useState<"ALL" | "BELOW_AVG" | "BELOW_BENCHMARK" | "ADMISSION_COMMITMENT" | "LEARNING_COMMITMENT">("ALL")
  const [ksdvSubjectFilter, setKsdvSubjectFilter] = useState<"ALL" | "MATH" | "LIT" | "ENG" | "PSY">("ALL")

  // Danh sách Khối lọc tương ứng theo Cấp học đã chọn
  const availableGradesForLevel = useMemo(() => {
    if (selectedLevelFilter === "TieuHoc") {
      return ["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5"]
    }
    if (selectedLevelFilter === "THCS") {
      return ["Khối 6", "Khối 7", "Khối 8", "Khối 9"]
    }
    if (selectedLevelFilter === "THPT") {
      return ["Khối 10", "Khối 11", "Khối 12"]
    }
    return GRADES
  }, [selectedLevelFilter])

  // Data states
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{
    summary: any
    distribution: any[]
    teacherDistributions: any[]
    trackingStudents: any[]
    benchmarks: any[]
    subjects: any[]
    ksdvMatrix?: {
      students: any[]
      summary: any
    }
  }>({
    summary: {
      totalStudents: 0,
      totalGraded: 0,
      currentAverage: 0,
      totalBelowAverage: 0,
      totalBelowBenchmark: 0,
      totalAdmissionCommitment: 0,
      totalLearningCommitment: 0
    },
    distribution: [],
    teacherDistributions: [],
    trackingStudents: [],
    benchmarks: [],
    subjects: [],
    ksdvMatrix: {
      students: [],
      summary: {
        totalCommittedStudents: 0,
        committedMathCount: 0,
        committedLitCount: 0,
        committedEngCount: 0,
        committedPsychologyCount: 0,
        improvedCount: 0,
        improvedRate: 0
      }
    }
  })

  // Modal: Benchmark Config states
  const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false)
  const [savingBenchmarks, setSavingBenchmarks] = useState(false)
  const [benchmarkConfigsList, setBenchmarkConfigsList] = useState<any[]>([])

  // Modal: Detail students of a teacher row
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedTeacherRow, setSelectedTeacherRow] = useState<any>(null)
  const [loadingRowDetail, setLoadingRowDetail] = useState(false)
  const [rowDetailData, setRowDetailData] = useState<any>(null)

  // Filter classes according to selectedCampusId, selectedLevelFilter & selectedGradeFilter
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      if (selectedCampusId !== "ALL") {
        if (c.campusId !== selectedCampusId && c.campus?.id !== selectedCampusId) {
          return false
        }
      }

      if (selectedLevelFilter !== "ALL") {
        const cLevel = (c.level || "").toLowerCase()
        const cGrade = (c.grade || "").toLowerCase()
        const cName = (c.className || "").toLowerCase()

        if (!isClassInLevel(c, selectedLevelFilter)) return false
      }

      if (selectedGradeFilter !== "ALL") {
        if (!isGradeMatching(c.grade, selectedGradeFilter)) return false
      }

      return true
    })
  }, [classes, selectedCampusId, selectedLevelFilter, selectedGradeFilter])

  // Reset selectedClassId if not in filteredClasses
  useEffect(() => {
    if (selectedClassId !== "ALL" && !filteredClasses.some(c => c.id === selectedClassId)) {
      setSelectedClassId("ALL")
    }
  }, [filteredClasses, selectedClassId])

  // Filter subjects strictly according to the Survey Period
  const availableSubjectsForPeriod = useMemo(() => {
    const subMap = new Map<string, { id: string; subjectName: string; subjectCode: string }>()
    
    if (data.subjects && data.subjects.length > 0) {
      data.subjects.forEach((s: any) => {
        subMap.set(s.id, {
          id: s.id,
          subjectName: s.name || s.subjectName,
          subjectCode: s.code || s.subjectCode
        })
      })
    }

    if (savedConfigs && savedConfigs.length > 0) {
      savedConfigs.forEach((cfg: any) => {
        const pMatch = cfg.evaluationPeriod === currentPeriod || cfg.evaluationPeriod === "ALL"
        const gMatch = selectedGradeFilter === "ALL" || isGradeMatching(cfg.grade, selectedGradeFilter)
        if (pMatch && gMatch && cfg.subject) {
          subMap.set(cfg.subject.id, {
            id: cfg.subject.id,
            subjectName: cfg.subject.subjectName,
            subjectCode: cfg.subject.subjectCode
          })
        }
      })
    }

    if (subMap.size === 0 && subjects && subjects.length > 0) {
      subjects.forEach((s: any) => {
        subMap.set(s.id, {
          id: s.id,
          subjectName: s.subjectName,
          subjectCode: s.subjectCode
        })
      })
    }

    return Array.from(subMap.values())
  }, [data.subjects, savedConfigs, currentPeriod, selectedGradeFilter, subjects])

  // Reset selectedSubjectId if not available
  useEffect(() => {
    if (selectedSubjectId !== "ALL" && availableSubjectsForPeriod.length > 0) {
      if (!availableSubjectsForPeriod.some(s => s.id === selectedSubjectId)) {
        setSelectedSubjectId("ALL")
      }
    }
  }, [availableSubjectsForPeriod, selectedSubjectId])

  // Fetch Analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        academicYearId: selectedYearId,
        campusId: selectedCampusId,
        levelFilter: selectedLevelFilter,
        gradeFilter: selectedGradeFilter,
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        currentPeriod,
        baselinePeriod
      })

      const res = await fetch(`/api/admin/ktdbcl/grade-analytics?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setData(json)
      } else {
        console.error("Lỗi API grade-analytics:", json.error)
      }
    } catch (err) {
      console.error("Lỗi kết nối tải dữ liệu phân tích:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [selectedYearId, selectedCampusId, selectedLevelFilter, selectedGradeFilter, selectedClassId, selectedSubjectId, currentPeriod, baselinePeriod])

  // Filtered Teacher Distributions
  const displayedTeacherDistributions = useMemo(() => {
    let list = data.teacherDistributions || []
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase()
      list = list.filter(item => {
        return (
          (item.className || "").toLowerCase().includes(kw) ||
          (item.subjectName || "").toLowerCase().includes(kw) ||
          (item.subjectCode || "").toLowerCase().includes(kw) ||
          (item.teacherName || "").toLowerCase().includes(kw) ||
          (item.teacherCode || "").toLowerCase().includes(kw) ||
          (item.grade || "").toLowerCase().includes(kw) ||
          (item.campusName || "").toLowerCase().includes(kw)
        )
      })
    }
    return list
  }, [data.teacherDistributions, searchKeyword])

  // Filtered Below Benchmark Students List (Chỉ HS Dưới chuẩn môn học, bỏ cam kết)
  const displayedBelowBenchmarkStudents = useMemo(() => {
    let list = (data.trackingStudents || []).filter(st => st.isBelowBenchmark)
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase()
      list = list.filter(st => {
        return (
          (st.studentName || "").toLowerCase().includes(kw) ||
          (st.studentCode || "").toLowerCase().includes(kw) ||
          (st.className || "").toLowerCase().includes(kw) ||
          (st.subjectName || "").toLowerCase().includes(kw) ||
          (st.teacherName || "").toLowerCase().includes(kw)
        )
      })
    }
    return list
  }, [data.trackingStudents, searchKeyword])

  // Filtered Below Average Students List (Bổ sung mới: HS Dưới ĐTB < 5đ)
  const displayedBelowAverageStudents = useMemo(() => {
    let list = (data.trackingStudents || []).filter(st => st.isBelowAverage)
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase()
      list = list.filter(st => {
        return (
          (st.studentName || "").toLowerCase().includes(kw) ||
          (st.studentCode || "").toLowerCase().includes(kw) ||
          (st.className || "").toLowerCase().includes(kw) ||
          (st.subjectName || "").toLowerCase().includes(kw) ||
          (st.teacherName || "").toLowerCase().includes(kw)
        )
      })
    }
    return list
  }, [data.trackingStudents, searchKeyword])

  // Legacy tracking list (for compatibility)
  const displayedTrackingStudents = displayedBelowBenchmarkStudents

  // Filtered KSĐV Matrix Students List
  const displayedKsdvStudents = useMemo(() => {
    let list = data.ksdvMatrix?.students || []
    if (ksdvSubjectFilter === "MATH") {
      list = list.filter(st => st.math?.isCommitted)
    } else if (ksdvSubjectFilter === "LIT") {
      list = list.filter(st => st.literature?.isCommitted)
    } else if (ksdvSubjectFilter === "ENG") {
      list = list.filter(st => st.english?.isCommitted)
    } else if (ksdvSubjectFilter === "PSY") {
      list = list.filter(st => st.psychology?.isCommitted)
    }

    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase()
      list = list.filter(st => {
        return (
          (st.studentName || "").toLowerCase().includes(kw) ||
          (st.studentCode || "").toLowerCase().includes(kw) ||
          (st.className || "").toLowerCase().includes(kw) ||
          (st.campusName || "").toLowerCase().includes(kw) ||
          (st.homeroomTeacher || "").toLowerCase().includes(kw) ||
          (st.math?.teacherName || "").toLowerCase().includes(kw) ||
          (st.literature?.teacherName || "").toLowerCase().includes(kw) ||
          (st.english?.teacherName || "").toLowerCase().includes(kw)
        )
      })
    }
    return list
  }, [data.ksdvMatrix?.students, ksdvSubjectFilter, searchKeyword])

  // Xuất Excel Ma trận Đối sánh KSĐV
  const handleExportKsdvMatrixExcel = () => {
    if (!displayedKsdvStudents || displayedKsdvStudents.length === 0) {
      alert("Không có dữ liệu đối sánh KSĐV để xuất Excel!")
      return
    }

    const excelRows = displayedKsdvStudents.map((st, idx) => ({
      "STT": idx + 1,
      "Cơ sở": st.campusName || st.campusCode || "",
      "Lớp": st.className,
      "Khối": st.grade,
      "Mã Học sinh": st.studentCode,
      "Họ và tên": st.studentName,
      "GVCN": st.homeroomTeacher,
      // 1. Toán
      "Toán - Cam kết": st.math?.isCommitted ? "x" : "",
      "Toán - Điểm KSĐV": st.math?.entranceScore !== null && st.math?.entranceScore !== undefined ? st.math.entranceScore : "",
      "Toán - Điểm Khảo sát": st.math?.currentScore !== null && st.math?.currentScore !== undefined ? st.math.currentScore : "",
      "Toán - Độ lệch (GAP)": st.math?.delta !== null && st.math?.delta !== undefined ? (st.math.delta > 0 ? `+${st.math.delta}` : st.math.delta) : "",
      // 2. Tiếng Việt / Ngữ Văn
      "Văn/TV - Cam kết": st.literature?.isCommitted ? "x" : "",
      "Văn/TV - Điểm KSĐV": st.literature?.entranceScore !== null && st.literature?.entranceScore !== undefined ? st.literature.entranceScore : "",
      "Văn/TV - Điểm Khảo sát": st.literature?.currentScore !== null && st.literature?.currentScore !== undefined ? st.literature.currentScore : "",
      "Văn/TV - Độ lệch (GAP)": st.literature?.delta !== null && st.literature?.delta !== undefined ? (st.literature.delta > 0 ? `+${st.literature.delta}` : st.literature.delta) : "",
      // 3. Tiếng Anh
      "Tiếng Anh - Cam kết": st.english?.isCommitted ? "x" : "",
      "Tiếng Anh - Tổng điểm KSĐV (100)": st.english?.entranceTotal100 !== null && st.english?.entranceTotal100 !== undefined ? st.english.entranceTotal100 : "",
      "Tiếng Anh - Điểm KSĐV (quy đổi 10)": st.english?.entranceScale10 !== null && st.english?.entranceScale10 !== undefined ? st.english.entranceScale10 : "",
      "Tiếng Anh - Điểm Khảo sát": st.english?.currentScore !== null && st.english?.currentScore !== undefined ? st.english.currentScore : "",
      "Tiếng Anh - Độ lệch (GAP)": st.english?.delta !== null && st.english?.delta !== undefined ? (st.english.delta > 0 ? `+${st.english.delta}` : st.english.delta) : "",
      // 4. Cam kết Tâm lý
      "Tâm lý - Cam kết": st.psychology?.isCommitted ? "x (CHÚ Ý MÀU ĐỎ)" : "",
      "Tâm lý - Điểm KSĐV": st.psychology?.entranceScore !== null && st.psychology?.entranceScore !== undefined ? st.psychology.entranceScore : "",
      "Tâm lý - Cảnh báo đối tượng": st.psychology?.isCommitted ? "CẦN THEO DÕI SÁT TÂM LÝ & HÀNH VI" : "",
      // Ghi chú cam kết
      "Tiêu chí tuyển sinh": st.admissionCriteria || "",
      "Kết quả xét tuyển": st.admissionResult || "",
      "Ghi chú cam kết Hội đồng tuyển sinh": st.directorNote || ""
    }))

    const ws = XLSX.utils.json_to_sheet(excelRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Doi_Sanh_KSDV_Cam_Ket")
    XLSX.writeFile(wb, `Ma_Tran_Doi_Sanh_KSDV_${currentPeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // Open detail modal for a teacher distribution row
  const handleOpenRowDetail = async (row: any) => {
    try {
      setSelectedTeacherRow(row)
      setDetailModalOpen(true)
      setLoadingRowDetail(true)
      setRowDetailData(null)

      const query = new URLSearchParams({
        academicYearId: selectedYearId,
        evaluationPeriod: currentPeriod,
        detailClassId: row.classId,
        detailSubjectId: row.subjectId
      })

      const res = await fetch(`/api/admin/ktdbcl/grade-progress?${query.toString()}`)
      const json = await res.json()
      if (json.success) {
        setRowDetailData(json)
      } else {
        alert("Lỗi tải chi tiết: " + (json.error || "Không rõ"))
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message)
    } finally {
      setLoadingRowDetail(false)
    }
  }

  // Open Benchmark Config Modal
  const handleOpenBenchmarkModal = async () => {
    try {
      setBenchmarkModalOpen(true)
      const res = await fetch(`/api/admin/ktdbcl/grade-benchmarks?academicYearId=${selectedYearId}&evaluationPeriod=${currentPeriod}`)
      const json = await res.json()
      if (json.success) {
        setBenchmarkConfigsList(json.configs || [])
      }
    } catch (err) {
      console.error("Lỗi lấy cấu hình điểm chuẩn:", err)
    }
  }

  // Save Benchmark Configs
  const handleSaveBenchmarks = async (updatedConfigs: any[]) => {
    try {
      setSavingBenchmarks(true)
      const res = await fetch("/api/admin/ktdbcl/grade-benchmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          configs: updatedConfigs
        })
      })
      const json = await res.json()
      if (json.success) {
        alert("Đã lưu cấu hình Chuẩn môn học thành công!")
        setBenchmarkModalOpen(false)
        await fetchAnalytics()
      } else {
        alert("Lỗi: " + (json.error || "Không rõ"))
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message)
    } finally {
      setSavingBenchmarks(false)
    }
  }

  // Export Excel: Teacher Matrix
  const handleExportTeacherExcel = () => {
    if (displayedTeacherDistributions.length === 0) {
      alert("Không có dữ liệu để xuất!")
      return
    }

    const excelRows = displayedTeacherDistributions.map((it, idx) => ({
      "STT": idx + 1,
      "Cơ sở": it.campusName || "",
      "Khối": it.grade ? `Khối ${it.grade}` : "",
      "Lớp học": it.className,
      "Giáo viên giảng dạy": it.teacherName,
      "Mã GV": it.teacherCode || "",
      "Môn học": `${it.subjectName} (${it.subjectCode})`,
      "Sỹ số": it.totalStudents,
      "Đã có điểm": it.gradedCount,
      "0 <= Điểm < 5 (SL)": it.count_0_5,
      "0 <= Điểm < 5 (%)": `${it.pct_0_5}%`,
      "5 <= Điểm < 6.5 (SL)": it.count_5_65,
      "5 <= Điểm < 6.5 (%)": `${it.pct_5_65}%`,
      "6.5 <= Điểm < 8 (SL)": it.count_65_8,
      "6.5 <= Điểm < 8 (%)": `${it.pct_65_8}%`,
      "8 <= Điểm <= 10 (SL)": it.count_8_10,
      "8 <= Điểm <= 10 (%)": `${it.pct_8_10}%`,
      "5 <= Điểm <= 10 (SL)": it.count_5_10,
      "5 <= Điểm <= 10 (%)": `${it.pct_5_10}%`,
      "Điểm Chuẩn": it.benchmark,
      "Đạt Chuẩn (SL)": it.count_passed_benchmark,
      "Đạt Chuẩn (%)": `${it.pct_passed_benchmark}%`,
      "Dưới Chuẩn (SL)": it.count_below_benchmark,
      "Dưới Chuẩn (%)": `${it.pct_below_benchmark}%`,
      "Điểm TB tạm tính": it.avgScore !== null ? it.avgScore : ""
    }))

    const ws = XLSX.utils.json_to_sheet(excelRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Pho_Diem_Giao_Vien")
    XLSX.writeFile(wb, `Bao_Cao_Pho_Diem_Giao_Vien_${currentPeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // Export Excel: HS Dưới Chuẩn (bỏ cam kết)
  const handleExportBelowBenchmarkExcel = () => {
    if (displayedBelowBenchmarkStudents.length === 0) {
      alert("Không có học sinh dưới chuẩn để xuất Excel!")
      return
    }

    const excelRows = displayedBelowBenchmarkStudents.map((st, idx) => ({
      "STT": idx + 1,
      "Cơ sở": st.campusName || "",
      "Mã HS": st.studentCode,
      "Họ và tên": st.studentName,
      "Lớp": st.className,
      "Khối": st.grade,
      "Môn học": st.subjectName,
      "Giáo viên": st.teacherName,
      "Điểm số": st.currentScore !== null ? st.currentScore : "",
      "Điểm Chuẩn môn": st.benchmark,
      "Độ lệch so với chuẩn": st.benchmarkGap !== null ? st.benchmarkGap : "",
      "Dưới Chuẩn": "CÓ",
      "Dưới Trung bình (<5.0)": st.isBelowAverage ? "CÓ" : "KHÔNG"
    }))

    const ws = XLSX.utils.json_to_sheet(excelRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "HS_Duoi_Chuan_Mon_Hoc")
    XLSX.writeFile(wb, `Danh_Sach_HS_Duoi_Chuan_${currentPeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // Export Excel: HS Dưới ĐTB (< 5đ)
  const handleExportBelowAverageExcel = () => {
    if (displayedBelowAverageStudents.length === 0) {
      alert("Không có học sinh dưới trung bình để xuất Excel!")
      return
    }

    const excelRows = displayedBelowAverageStudents.map((st, idx) => ({
      "STT": idx + 1,
      "Cơ sở": st.campusName || "",
      "Mã HS": st.studentCode,
      "Họ và tên": st.studentName,
      "Lớp": st.className,
      "Khối": st.grade,
      "Môn học": st.subjectName,
      "Giáo viên phụ trách": st.teacherName,
      "Điểm khảo sát (< 5đ)": st.currentScore !== null ? st.currentScore : "",
      "Điểm Chuẩn môn": st.benchmark,
      "Độ lệch": st.benchmarkGap !== null ? st.benchmarkGap : ""
    }))

    const ws = XLSX.utils.json_to_sheet(excelRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "HS_Duoi_DTB_Duoi_5d")
    XLSX.writeFile(wb, `Danh_Sach_HS_Duoi_DTB_${currentPeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const currentYearName = academicYears.find(y => y.id === selectedYearId)?.name || "2026-2027"

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. THANH TIÊU ĐỀ & CHUYỂN PHÂN HỆ PHÂN TÍCH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-[#005B58] border border-teal-200 flex items-center gap-1">
              <BarChart2 className="w-3.5 h-3.5" />
              Khảo thí & Đảm bảo Chất lượng
            </span>
            <span className="text-xs font-semibold text-slate-500">[{currentYearName}]</span>
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight mt-1">
            Phân tích Kết quả & Phổ điểm theo Giáo viên
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Đánh giá chất lượng học sinh theo từng phân công giảng dạy, đối soát chuẩn đầu ra (Tiểu học: 7.0đ, Trung học: 6.0đ) và theo dõi sát sao nhóm học sinh diện cam kết.
          </p>
        </div>

        {/* Sub-view Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl flex-wrap">
          <button
            onClick={() => setActiveSubView("teachers")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeSubView === "teachers"
                ? "bg-white text-[#005B58] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Chất lượng theo Giáo viên</span>
          </button>

          {/* Tab 2: Chỉ HS Dưới Chuẩn môn học (bỏ cam kết) */}
          <button
            onClick={() => setActiveSubView("below_benchmark")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeSubView === "below_benchmark"
                ? "bg-white text-amber-800 shadow-sm ring-1 ring-amber-300"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>HS Dưới chuẩn</span>
            {data.summary.totalBelowBenchmark > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                {data.summary.totalBelowBenchmark}
              </span>
            )}
          </button>

          {/* Tab 3: Bổ sung mới: HS Dưới ĐTB (< 5đ) */}
          <button
            onClick={() => setActiveSubView("below_average")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeSubView === "below_average"
                ? "bg-white text-rose-800 shadow-sm ring-1 ring-rose-300"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>HS Dưới ĐTB (&lt; 5đ)</span>
            {data.summary.totalBelowAverage > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                {data.summary.totalBelowAverage}
              </span>
            )}
          </button>

          {/* Tab 4: Đối sánh KSĐV (Cam kết đầu vào) - Chỉ áp dụng Khối 2 đến Khối 12 */}
          <button
            onClick={() => setActiveSubView("ksdv_matrix")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeSubView === "ksdv_matrix"
                ? "bg-white text-indigo-800 shadow-sm ring-1 ring-indigo-300"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Đối sánh KSĐV (Khối 2 - 12)</span>
            {(data.ksdvMatrix?.summary?.totalCommittedStudents || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                {data.ksdvMatrix?.summary?.totalCommittedStudents}
              </span>
            )}
          </button>

          {/* Tab 5: Biểu đồ Phổ điểm */}
          <button
            onClick={() => setActiveSubView("charts")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeSubView === "charts"
                ? "bg-white text-[#005B58] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Biểu đồ Phổ điểm</span>
          </button>
        </div>
      </div>

      {/* 2. KHỐI KPI CARDS TỔNG HỢP */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
        {/* KPI 1: Tổng phân công */}
        <div 
          onClick={() => setActiveSubView("teachers")}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm cursor-pointer hover:shadow-md hover:border-teal-300 transition-all"
          title="Nhấp để xem Bảng Chất lượng theo Giáo viên"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tổng phân công</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#005B58] flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{displayedTeacherDistributions.length}</span>
            <span className="text-[11px] font-semibold text-slate-500">lớp-môn</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Tổng HS: <strong className="text-slate-700">{data.summary.totalStudents.toLocaleString()}</strong>
          </div>
        </div>

        {/* KPI 2: Điểm TB toàn trường */}
        <div className="bg-white p-4 rounded-2xl border border-teal-200 shadow-sm bg-gradient-to-br from-white to-teal-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-800">Điểm TB khảo sát</span>
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-teal-800">{data.summary.currentAverage || 0}</span>
            <span className="text-[11px] font-bold text-teal-600">/10đ</span>
          </div>
          <div className="text-[11px] text-teal-700/80 mt-1 font-medium">
            Đã nhập: {data.summary.totalGraded.toLocaleString()} HS
          </div>
        </div>

        {/* KPI 3: Tỷ lệ Trên TB (>= 5.0) */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Tỷ lệ Trên TB (≥ 5đ)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">
              {data.summary.totalGraded > 0
                ? Math.round(((data.summary.totalGraded - data.summary.totalBelowAverage) / data.summary.totalGraded) * 100)
                : 0}%
            </span>
            <span className="text-[11px] font-bold text-emerald-600">toàn khối</span>
          </div>
          <div className="text-[11px] text-emerald-700/80 mt-1 font-medium">
            Đạt chuẩn kiến thức cơ bản
          </div>
        </div>

        {/* KPI 4: HS Dưới Chuẩn môn học */}
        <div 
          onClick={() => setActiveSubView("below_benchmark")}
          className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/30 cursor-pointer hover:shadow-md hover:border-amber-400 transition-all"
          title="Nhấp để xem danh sách Học sinh Dưới chuẩn môn học"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">HS Dưới Chuẩn</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">{data.summary.totalBelowBenchmark}</span>
            <span className="text-[11px] font-bold text-amber-600">học sinh</span>
          </div>
          <div className="text-[11px] text-amber-700/80 mt-1 font-medium">
            Dưới chuẩn điểm môn học
          </div>
        </div>

        {/* KPI 5: HS Dưới Trung bình (< 5.0) */}
        <div 
          onClick={() => setActiveSubView("below_average")}
          className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm bg-gradient-to-br from-white to-rose-50/30 cursor-pointer hover:shadow-md hover:border-rose-400 transition-all"
          title="Nhấp để xem danh sách Học sinh Dưới điểm trung bình (< 5.0đ)"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">HS Dưới TB (&lt; 5đ)</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700">{data.summary.totalBelowAverage}</span>
            <span className="text-[11px] font-bold text-rose-600">học sinh</span>
          </div>
          <div className="text-[11px] text-rose-700/80 mt-1 font-medium">
            Cần phụ đạo, bồi dưỡng gấp
          </div>
        </div>

        {/* KPI 6: HS Diện Cam kết đầu vào */}
        <div 
          onClick={() => setActiveSubView("ksdv_matrix")}
          className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-sm bg-gradient-to-br from-white to-indigo-50/30 cursor-pointer hover:shadow-md hover:border-indigo-400 transition-all"
          title="Nhấp để xem Ma trận Đối sánh KSĐV (Cam kết đầu vào)"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800">Diện Cam kết</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-800">
              {Math.max(data.ksdvMatrix?.summary?.totalCommittedStudents || 0, data.summary.totalAdmissionCommitment + data.summary.totalLearningCommitment)}
            </span>
            <span className="text-[11px] font-bold text-indigo-600">học sinh</span>
          </div>
          <div className="text-[11px] text-indigo-700/80 mt-1 font-medium">
            Có hồ sơ cam kết đầu vào / HT
          </div>
        </div>
      </div>

      {/* 3. THANH BỘ LỌC ĐA TIÊU CHÍ */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-[#005B58]" />
            <span>Bộ lọc Phân tích Phổ điểm</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => router.push("/admin/ktdbcl/scatter-plot")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-[#005B58] border border-teal-200 rounded-xl text-xs font-black transition-all shadow-sm"
              title="Mở Biểu đồ Phân tán (Scatter Plot) chuyên sâu theo chuẩn Sky-Line & GDPT 2018"
            >
              <TrendingUp className="w-3.5 h-3.5 text-teal-700" />
              <span>Biểu đồ Phân tán (Scatter)</span>
            </button>

            <button
              onClick={handleOpenBenchmarkModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-all shadow-sm"
              title="Thiết lập mức điểm chuẩn theo Cấp học, Khối hoặc từng môn học"
            >
              <Settings className="w-3.5 h-3.5 text-amber-700" />
              <span>Cấu hình Chuẩn môn học</span>
            </button>

            {activeSubView === "teachers" && (
              <button
                onClick={handleExportTeacherExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel Giáo viên</span>
              </button>
            )}

            {activeSubView === "below_benchmark" && (
              <button
                onClick={handleExportBelowBenchmarkExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel HS Dưới Chuẩn</span>
              </button>
            )}

            {activeSubView === "below_average" && (
              <button
                onClick={handleExportBelowAverageExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel HS Dưới ĐTB (&lt; 5đ)</span>
              </button>
            )}

            {activeSubView === "ksdv_matrix" && (
              <button
                onClick={handleExportKsdvMatrixExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel Ma trận KSĐV</span>
              </button>
            )}

            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#005B58]" : ""}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* LƯỚI BỘ LỌC 6 TIÊU CHÍ: KỲ KHẢO SÁT -> MÔN HỌC -> CƠ SỞ -> CẤP HỌC -> KHỐI -> LỚP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* 1. Kỳ khảo sát */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Kỳ khảo sát:</span>
              <span className="text-[10px] font-bold text-[#005B58]">Bước 1</span>
            </label>
            <select
              value={currentPeriod}
              onChange={e => setCurrentPeriod(e.target.value)}
              className="w-full border border-teal-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#003B3A] focus:ring-2 focus:ring-[#005B58] outline-none bg-teal-50/40"
            >
              {EVAL_PERIODS.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 2. Môn học (đúng theo kỳ) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Môn học ({availableSubjectsForPeriod.length} môn):</span>
              <span className="text-[10px] font-bold text-slate-400">Bước 2</span>
            </label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white"
            >
              <option value="ALL">⭐ Tất cả môn theo kỳ</option>
              {availableSubjectsForPeriod.map(s => (
                <option key={s.id} value={s.id}>{s.subjectName} ({s.subjectCode})</option>
              ))}
            </select>
          </div>

          {/* 3. Cơ sở */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Cơ sở:</span>
              <span className="text-[10px] font-bold text-slate-400">Bước 3</span>
            </label>
            <select
              value={selectedCampusId}
              onChange={e => setSelectedCampusId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white"
            >
              <option value="ALL">-- Tất cả Cơ sở --</option>
              {campuses.map((cp: any) => (
                <option key={cp.id} value={cp.id}>
                  {cp.campusName || cp.campusCode}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Cấp học */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Cấp học:</span>
              <span className="text-[10px] font-bold text-slate-400">Bước 4</span>
            </label>
            <select
              value={selectedLevelFilter}
              onChange={e => {
                setSelectedLevelFilter(e.target.value)
                setSelectedGradeFilter("ALL")
              }}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white"
            >
              <option value="ALL">-- Tất cả Cấp học --</option>
              <option value="TieuHoc">Tiểu học</option>
              <option value="THCS">THCS</option>
              <option value="THPT">THPT</option>
            </select>
          </div>

          {/* 5. Khối (Tùy biến theo Cấp học & Chú thích KSĐV Khối 2-12) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Khối:</span>
              <span className="text-[10px] font-bold text-slate-400">Bước 5</span>
            </label>
            <select
              value={selectedGradeFilter}
              onChange={e => setSelectedGradeFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white"
            >
              <option value="ALL">{activeSubView === "ksdv_matrix" ? "-- Tất cả Khối (Khối 2 - 12) --" : "-- Tất cả Khối --"}</option>
              {availableGradesForLevel.map(g => (
                <option key={g} value={g}>
                  {g}{activeSubView === "ksdv_matrix" && g === "Khối 1" ? " (Không áp dụng KSĐV)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Lớp học (hỗ trợ chế độ "Tất cả") */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Lớp học ({filteredClasses.length} lớp):</span>
              <span className="text-[10px] font-bold text-slate-400">Bước 6</span>
            </label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#005B58] focus:ring-2 focus:ring-[#005B58] outline-none bg-teal-50/30"
            >
              <option value="ALL">🌟 Tất cả các lớp</option>
              {filteredClasses.map(c => (
                <option key={c.id} value={c.id}>{c.className} ({c.grade || c.level})</option>
              ))}
            </select>
          </div>
        </div>

        {/* HÀNG TÌM NHANH & GHI CHÚ ĐIỀU HƯỚNG */}
        <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-100 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 min-w-[260px]">
            <input
              type="text"
              placeholder="Tìm nhanh giáo viên, mã GV, tên lớp, môn học, họ tên HS..."
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              className="w-full border border-slate-200 rounded-xl pl-8 pr-8 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white placeholder:text-slate-400"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold px-1"
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>

          {activeSubView === "ksdv_matrix" && (
            <div className="text-[11px] font-bold text-indigo-700 bg-indigo-50/80 px-3 py-1.5 rounded-xl border border-indigo-200 flex items-center gap-1.5 whitespace-nowrap shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
              <span>KSĐV chỉ áp dụng từ Khối 2 đến Khối 12 (không tính Khối 1)</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. VIEW 1: BẢNG THỐNG KÊ CHẤT LƯỢNG THEO GIÁO VIÊN & ĐỐI SOÁT CHUẨN */}
      {activeSubView === "teachers" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-800">
                Chất lượng Học sinh theo Giáo viên & Phổ điểm
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                {displayedTeacherDistributions.length} phân công
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Đạt chuẩn: ≥ 7.0đ (Tiểu học) / ≥ 6.0đ (Trung học)</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-2 text-center w-8">STT</th>
                  <th className="py-3 px-3">Khối</th>
                  <th className="py-3 px-3">Lớp học</th>
                  <th className="py-3 px-3">Giáo viên giảng dạy</th>
                  <th className="py-3 px-3">Môn học</th>
                  <th className="py-3 px-2 text-center">Sỹ số</th>
                  <th className="py-3 px-2 text-center text-rose-700 bg-rose-50/50">0 ≤ Điểm &lt; 5</th>
                  <th className="py-3 px-2 text-center text-amber-700 bg-amber-50/50">5 ≤ Điểm &lt; 6.5</th>
                  <th className="py-3 px-2 text-center text-sky-700 bg-sky-50/50">6.5 ≤ Điểm &lt; 8</th>
                  <th className="py-3 px-2 text-center text-emerald-700 bg-emerald-50/50">8 ≤ Điểm ≤ 10</th>
                  <th className="py-3 px-2 text-center text-teal-800 bg-teal-50/70">5 ≤ Điểm ≤ 10</th>
                  <th className="py-3 px-2 text-center">Chuẩn</th>
                  <th className="py-3 px-2 text-center text-emerald-800 bg-emerald-100/40">Đạt Chuẩn</th>
                  <th className="py-3 px-2 text-center text-rose-800 bg-rose-100/40">Dưới Chuẩn</th>
                  <th className="py-3 px-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={15} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#005B58]" />
                        <span className="font-medium">Đang tổng hợp phổ điểm theo giáo viên...</span>
                      </div>
                    </td>
                  </tr>
                ) : displayedTeacherDistributions.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-12 text-center text-slate-400 font-medium">
                      Không tìm thấy phân công nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  displayedTeacherDistributions.map((it, idx) => {
                    return (
                      <tr key={`${it.classId}_${it.subjectId}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        {/* STT */}
                        <td className="py-2.5 px-2 text-center text-slate-400 font-medium">{idx + 1}</td>

                        {/* Khối */}
                        <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                          {it.grade ? `Khối ${it.grade}` : "-"}
                        </td>

                        {/* Lớp */}
                        <td className="py-2.5 px-3">
                          <span className="font-extrabold text-teal-900 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200 whitespace-nowrap">
                            {it.className}
                          </span>
                          {it.campusName && (
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5 whitespace-nowrap">{it.campusName}</div>
                          )}
                        </td>

                        {/* Giáo viên */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                              <User className="w-3 h-3 text-slate-500" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{it.teacherName}</div>
                              {it.teacherCode && <div className="text-[10px] text-slate-400 font-mono">{it.teacherCode}</div>}
                            </div>
                          </div>
                        </td>

                        {/* Môn */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-800">{it.subjectName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{it.subjectCode}</div>
                        </td>

                        {/* Sỹ số */}
                        <td className="py-2.5 px-2 text-center font-bold text-slate-700">
                          <div>{it.totalStudents}</div>
                          <div className="text-[10px] text-slate-400 font-normal">({it.gradedCount} đã có)</div>
                        </td>

                        {/* 0 <= Điểm < 5 */}
                        <td className="py-2.5 px-2 text-center bg-rose-50/30">
                          <div className={`font-black ${it.count_0_5 > 0 ? "text-rose-700" : "text-slate-300"}`}>
                            {it.count_0_5}
                          </div>
                          {it.count_0_5 > 0 && <div className="text-[10px] text-rose-600 font-bold">({it.pct_0_5}%)</div>}
                        </td>

                        {/* 5 <= Điểm < 6.5 */}
                        <td className="py-2.5 px-2 text-center bg-amber-50/30">
                          <div className={`font-bold ${it.count_5_65 > 0 ? "text-amber-800" : "text-slate-300"}`}>
                            {it.count_5_65}
                          </div>
                          {it.count_5_65 > 0 && <div className="text-[10px] text-amber-700">({it.pct_5_65}%)</div>}
                        </td>

                        {/* 6.5 <= Điểm < 8 */}
                        <td className="py-2.5 px-2 text-center bg-sky-50/30">
                          <div className={`font-bold ${it.count_65_8 > 0 ? "text-sky-800" : "text-slate-300"}`}>
                            {it.count_65_8}
                          </div>
                          {it.count_65_8 > 0 && <div className="text-[10px] text-sky-700">({it.pct_65_8}%)</div>}
                        </td>

                        {/* 8 <= Điểm <= 10 */}
                        <td className="py-2.5 px-2 text-center bg-emerald-50/30">
                          <div className={`font-black ${it.count_8_10 > 0 ? "text-emerald-700" : "text-slate-300"}`}>
                            {it.count_8_10}
                          </div>
                          {it.count_8_10 > 0 && <div className="text-[10px] text-emerald-600 font-bold">({it.pct_8_10}%)</div>}
                        </td>

                        {/* 5 <= Điểm <= 10 (Tổng Trên TB) */}
                        <td className="py-2.5 px-2 text-center bg-teal-50/50">
                          <div className="font-extrabold text-[#005B58]">
                            {it.count_5_10}
                          </div>
                          <div className="text-[10px] text-teal-700 font-bold">({it.pct_5_10}%)</div>
                        </td>

                        {/* Mức Chuẩn */}
                        <td className="py-2.5 px-2 text-center">
                          <span className="px-2 py-0.5 rounded text-[11px] font-black bg-slate-100 text-slate-800 border border-slate-200">
                            {it.benchmark}đ
                          </span>
                        </td>

                        {/* Đạt Chuẩn */}
                        <td className="py-2.5 px-2 text-center bg-emerald-100/30">
                          <div className="font-black text-emerald-800">{it.count_passed_benchmark}</div>
                          <div className="text-[10px] text-emerald-700 font-extrabold">({it.pct_passed_benchmark}%)</div>
                        </td>

                        {/* Dưới Chuẩn */}
                        <td className="py-2.5 px-2 text-center bg-rose-100/30">
                          <div className={`font-black ${it.count_below_benchmark > 0 ? "text-rose-700" : "text-slate-300"}`}>
                            {it.count_below_benchmark}
                          </div>
                          {it.count_below_benchmark > 0 && (
                            <div className="text-[10px] text-rose-600 font-extrabold">({it.pct_below_benchmark}%)</div>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenRowDetail(it)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                              title="Xem danh sách điểm chi tiết từng học sinh"
                            >
                              Chi tiết
                            </button>
                            {it.count_below_benchmark > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedClassId(it.classId)
                                  setSelectedSubjectId(it.subjectId)
                                  setActiveSubView("below_benchmark")
                                }}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition-all border border-amber-200"
                                title="Xem danh sách các học sinh dưới chuẩn của lớp này"
                              >
                                {it.count_below_benchmark} HS dưới chuẩn
                              </button>
                            )}
                            {it.count_0_5 > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedClassId(it.classId)
                                  setSelectedSubjectId(it.subjectId)
                                  setActiveSubView("below_average")
                                }}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg text-xs font-bold transition-all border border-rose-200"
                                title="Xem danh sách các học sinh dưới trung bình (< 5đ) của lớp này"
                              >
                                {it.count_0_5} HS &lt;5đ
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. VIEW 2: DANH SÁCH HỌC SINH DƯỚI CHUẨN MÔN HỌC (CHỈ CÓ HS DƯỚI CHUẨN, BỎ CAM KẾT) */}
      {activeSubView === "below_benchmark" && (
        <div className="bg-white rounded-2xl border border-amber-200/80 shadow-sm overflow-hidden animate-fadeIn space-y-4 p-5">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-amber-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-amber-900 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Danh sách Học sinh Dưới chuẩn môn học</span>
              </h3>
              <p className="text-xs text-amber-700/80 mt-0.5 font-medium">
                Tiêu chuẩn kiểm định: Theo cấu hình Chuẩn điểm từng môn học / cấp học
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                Hiển thị: <strong>{displayedBelowBenchmarkStudents.length}</strong> lượt môn dưới chuẩn
              </span>
              <button
                onClick={handleExportBelowBenchmarkExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel HS Dưới Chuẩn</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-amber-50/60 text-amber-950 font-bold border-b border-amber-200 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-2 text-center w-8">STT</th>
                  <th className="py-3 px-3">Mã HS</th>
                  <th className="py-3 px-3">Họ và tên học sinh</th>
                  <th className="py-3 px-3">Lớp & Khối</th>
                  <th className="py-3 px-3">Môn học</th>
                  <th className="py-3 px-3">Giáo viên phụ trách</th>
                  <th className="py-3 px-2 text-center">Điểm khảo sát</th>
                  <th className="py-3 px-2 text-center">Chuẩn môn</th>
                  <th className="py-3 px-2 text-center">Độ lệch (Gap)</th>
                  <th className="py-3 px-3 text-center">Đánh giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedBelowBenchmarkStudents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                      Không có học sinh nào dưới chuẩn môn học theo bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  displayedBelowBenchmarkStudents.map((st, idx) => (
                    <tr key={`benchmark_${st.studentId}_${st.subjectId}_${idx}`} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-2.5 px-2 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-600">{st.studentCode}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{st.studentName}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-extrabold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[11px] whitespace-nowrap">
                          {st.className}
                        </span>
                        {st.campusName && (
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5 whitespace-nowrap">{st.campusName}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{st.subjectName}</td>
                      <td className="py-2.5 px-3 text-slate-700">{st.teacherName}</td>

                      {/* Điểm số */}
                      <td className="py-2.5 px-2 text-center">
                        {st.currentScore !== null ? (
                          <span className={`font-black text-xs px-2.5 py-0.5 rounded ${
                            st.currentScore < 5.0
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : "bg-amber-100 text-amber-800 border border-amber-300"
                          }`}>
                            {st.currentScore}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Chuẩn */}
                      <td className="py-2.5 px-2 text-center font-bold text-slate-700">
                        {st.benchmark}đ
                      </td>

                      {/* Độ lệch */}
                      <td className="py-2.5 px-2 text-center">
                        {st.benchmarkGap !== null ? (
                          <span className={`font-bold ${st.benchmarkGap < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                            {st.benchmarkGap > 0 ? `+${st.benchmarkGap}` : st.benchmarkGap}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Đánh giá */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Dưới chuẩn ({st.benchmarkGap}đ)
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5.1 VIEW 3: DANH SÁCH HỌC SINH DƯỚI ĐIỂM TRUNG BÌNH (< 5.0đ) (BỔ SUNG MỚI) */}
      {activeSubView === "below_average" && (
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden animate-fadeIn space-y-4 p-5">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-rose-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-rose-900 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Danh sách Học sinh Dưới điểm Trung bình (&lt; 5.0đ)</span>
              </h3>
              <p className="text-xs text-rose-700/80 mt-0.5 font-medium">
                Nhóm học sinh có điểm khảo sát dưới 5.0đ — Đơn vị / Tổ chuyên môn / GVBM cần lên kế hoạch phụ đạo bồi dưỡng cấp tốc
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-rose-800 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                Hiển thị: <strong>{displayedBelowAverageStudents.length}</strong> lượt môn &lt; 5.0đ
              </span>
              <button
                onClick={handleExportBelowAverageExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel HS Dưới ĐTB</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-rose-50/70 text-rose-950 font-bold border-b border-rose-200 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-2 text-center w-8">STT</th>
                  <th className="py-3 px-3">Mã HS</th>
                  <th className="py-3 px-3">Họ và tên học sinh</th>
                  <th className="py-3 px-3">Lớp & Khối</th>
                  <th className="py-3 px-3">Môn học</th>
                  <th className="py-3 px-3">Giáo viên phụ trách</th>
                  <th className="py-3 px-2 text-center">Điểm khảo sát (&lt;5đ)</th>
                  <th className="py-3 px-2 text-center">Chuẩn môn</th>
                  <th className="py-3 px-2 text-center">Độ lệch (Gap)</th>
                  <th className="py-3 px-3 text-center">Mức độ ưu tiên can thiệp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedBelowAverageStudents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                      Không có học sinh nào dưới điểm trung bình (&lt; 5.0đ) theo bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  displayedBelowAverageStudents.map((st, idx) => (
                    <tr key={`avg_${st.studentId}_${st.subjectId}_${idx}`} className="hover:bg-rose-50/40 transition-colors">
                      <td className="py-2.5 px-2 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-600">{st.studentCode}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{st.studentName}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-extrabold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[11px] whitespace-nowrap">
                          {st.className}
                        </span>
                        {st.campusName && (
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5 whitespace-nowrap">{st.campusName}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{st.subjectName}</td>
                      <td className="py-2.5 px-3 text-slate-700">{st.teacherName}</td>

                      {/* Điểm số */}
                      <td className="py-2.5 px-2 text-center">
                        <span className="font-black text-xs px-2.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 ring-2 ring-rose-100 shadow-2xs">
                          {st.currentScore}đ
                        </span>
                      </td>

                      {/* Chuẩn */}
                      <td className="py-2.5 px-2 text-center font-bold text-slate-700">
                        {st.benchmark}đ
                      </td>

                      {/* Độ lệch */}
                      <td className="py-2.5 px-2 text-center">
                        {st.benchmarkGap !== null ? (
                          <span className="font-bold text-rose-600">
                            {st.benchmarkGap}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Mức độ ưu tiên can thiệp */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-extrabold bg-red-100 text-red-800 border border-red-200 animate-pulse">
                          🚨 Phụ đạo gấp
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5.1 VIEW 4: MA TRẬN ĐỐI SÁNH VỚI KHẢO SÁT ĐẦU VÀO (KSĐV) */}
      {activeSubView === "ksdv_matrix" && (
        <div className="space-y-4 animate-fadeIn">
          {/* Cảnh báo lưu ý nghiệp vụ khi người dùng lọc Khối 1 */}
          {selectedGradeFilter === "Khối 1" && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3.5 text-amber-900 shadow-sm animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <h4 className="font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Lưu ý nghiệp vụ:</span>
                  <span>Kỳ Khảo sát đầu vào (KSĐV) chỉ áp dụng từ Khối 2 đến Khối 12</span>
                </h4>
                <p className="text-amber-700 leading-relaxed">
                  Học sinh tuyển sinh đầu cấp Khối 1 (Tiểu học) không thi bài khảo sát môn văn hóa chuẩn hóa (Toán, Tiếng Việt, Tiếng Anh) như học sinh chuyển trường từ Khối 2 đến Khối 12. Do đó, hệ thống <strong>không tính Khối 1</strong> vào Ma trận đối sánh KSĐV và danh mục diện cam kết học tập đầu vào.
                </p>
                <div className="pt-1 font-semibold text-amber-800">
                  👉 Vui lòng chọn <strong>Khối 2 đến Khối 12</strong> hoặc <strong>-- Tất cả Khối (Khối 2 - 12) --</strong> ở bộ lọc phía trên để xem số liệu phân tích.
                </div>
              </div>
            </div>
          )}

          {/* Dải thông tin nhận diện phạm vi áp dụng */}
          <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-extrabold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Phạm vi đối sánh Ma trận KSĐV: Khối 2 đến Khối 12</span>
              <span className="text-[11px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-100">
                Không tính Khối 1
              </span>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-indigo-100 shadow-sm bg-gradient-to-br from-white to-indigo-50/30">
              <span className="text-[11px] font-bold text-indigo-700 block uppercase tracking-wider">HS Cam kết nhập học</span>
              <div className="text-2xl font-black text-indigo-900 mt-1">
                {data.ksdvMatrix?.summary?.totalCommittedStudents || 0}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Hồ sơ cam kết đầu vào</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-blue-100 shadow-sm bg-gradient-to-br from-white to-blue-50/30">
              <span className="text-[11px] font-bold text-blue-700 block uppercase tracking-wider">Cam kết môn Toán</span>
              <div className="text-2xl font-black text-blue-900 mt-1">
                {data.ksdvMatrix?.summary?.committedMathCount || 0}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">HS có cam kết Toán</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
              <span className="text-[11px] font-bold text-emerald-700 block uppercase tracking-wider">Cam kết Tiếng Việt / Văn</span>
              <div className="text-2xl font-black text-emerald-900 mt-1">
                {data.ksdvMatrix?.summary?.committedLitCount || 0}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">HS có cam kết TV / Văn</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-violet-100 shadow-sm bg-gradient-to-br from-white to-violet-50/30">
              <span className="text-[11px] font-bold text-violet-700 block uppercase tracking-wider">Cam kết Tiếng Anh</span>
              <div className="text-2xl font-black text-violet-900 mt-1">
                {data.ksdvMatrix?.summary?.committedEngCount || 0}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Vấn đáp & Viết</span>
            </div>

            {/* BỔ SUNG THẺ CAM KẾT TÂM LÝ - MÀU ĐỎ NỔI BẬT */}
            <div className="bg-red-50/70 p-3.5 rounded-2xl border-2 border-red-300 shadow-sm bg-gradient-to-br from-white via-red-50 to-red-100/40 ring-2 ring-red-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-red-700 block uppercase tracking-wider">
                  Cam kết Tâm lý
                </span>
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                </span>
              </div>
              <div className="text-2xl font-black text-red-900 mt-1 flex items-baseline gap-1.5">
                {data.ksdvMatrix?.summary?.committedPsychologyCount || 0}
                <span className="text-[11px] font-bold text-red-600">học sinh</span>
              </div>
              <span className="text-[10px] text-red-600 font-extrabold flex items-center gap-1 mt-0.5">
                <span>🚨</span> Cần chú ý theo dõi sát
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-teal-100 shadow-sm bg-gradient-to-br from-white to-teal-50/30">
              <span className="text-[11px] font-bold text-teal-700 block uppercase tracking-wider">Tiến bộ / Đạt chuẩn</span>
              <div className="text-2xl font-black text-teal-900 mt-1">
                {data.ksdvMatrix?.summary?.improvedCount || 0}{" "}
                <span className="text-xs font-bold text-teal-600">({data.ksdvMatrix?.summary?.improvedRate || 0}%)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Tăng trưởng hoặc ≥ 6.0đ</span>
            </div>
          </div>

          {/* Sub-filter pills for subjects */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setKsdvSubjectFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    ksdvSubjectFilter === "ALL"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  Tất cả HS cam kết ({data.ksdvMatrix?.students?.length || 0})
                </button>
                <button
                  onClick={() => setKsdvSubjectFilter("MATH")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    ksdvSubjectFilter === "MATH"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200"
                  }`}
                >
                  Toán ({data.ksdvMatrix?.summary?.committedMathCount || 0})
                </button>
                <button
                  onClick={() => setKsdvSubjectFilter("LIT")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    ksdvSubjectFilter === "LIT"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  Tiếng Việt / Ngữ Văn ({data.ksdvMatrix?.summary?.committedLitCount || 0})
                </button>
                <button
                  onClick={() => setKsdvSubjectFilter("ENG")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    ksdvSubjectFilter === "ENG"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200"
                  }`}
                >
                  Tiếng Anh ({data.ksdvMatrix?.summary?.committedEngCount || 0})
                </button>
                {/* NÚT LỌC TÂM LÝ - MÀU ĐỎ NỔI BẬT */}
                <button
                  onClick={() => setKsdvSubjectFilter("PSY")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                    ksdvSubjectFilter === "PSY"
                      ? "bg-red-600 text-white shadow-md shadow-red-200 ring-2 ring-red-300"
                      : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-300"
                  }`}
                >
                  <span>🧠 Tâm lý (Chú ý đỏ)</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    ksdvSubjectFilter === "PSY" ? "bg-white text-red-700" : "bg-red-200 text-red-900"
                  }`}>
                    {data.ksdvMatrix?.summary?.committedPsychologyCount || 0}
                  </span>
                </button>
              </div>

              <div className="text-xs text-slate-500 font-semibold">
                Hiển thị: <strong className="text-slate-800">{displayedKsdvStudents.length}</strong> học sinh
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs border-collapse min-w-[1250px]">
                <thead>
                  {/* Row 1: Main Subject Groups Header */}
                  <tr className="border-b border-slate-200 bg-slate-100/90 text-slate-700 font-black text-center uppercase tracking-wider text-[11px]">
                    <th colSpan={6} className="py-2.5 px-3 text-left border-r border-slate-200">
                      Thông tin Học sinh & Lớp học
                    </th>
                    <th colSpan={4} className="py-2.5 px-3 bg-blue-100/80 text-blue-900 border-r border-blue-200">
                      📐 Môn Toán học
                    </th>
                    <th colSpan={4} className="py-2.5 px-3 bg-emerald-100/80 text-emerald-900 border-r border-emerald-200">
                      📖 Môn Tiếng Việt / Ngữ Văn
                    </th>
                    <th colSpan={4} className="py-2.5 px-3 bg-violet-100/80 text-violet-900 border-r border-violet-200">
                      🌐 Môn Tiếng Anh (Tổng điểm KSĐV)
                    </th>
                    {/* NHÓM CỘT TÂM LÝ - MÀU ĐỎ NỔI BẬT */}
                    <th colSpan={2} className="py-2.5 px-3 bg-red-100 text-red-900 border-r border-red-200">
                      🧠 Cam kết Tâm lý (Theo dõi)
                    </th>
                    <th className="py-2.5 px-3 bg-slate-200/70 text-slate-800 text-left">
                      Hồ sơ & Ghi chú Cam kết
                    </th>
                  </tr>
                  {/* Row 2: Sub-columns */}
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold text-[10px]">
                    <th className="py-2 px-2 text-center w-10">STT</th>
                    <th className="py-2 px-2.5 text-center w-16">Cơ sở</th>
                    <th className="py-2 px-2.5 text-left w-24">Mã HS</th>
                    <th className="py-2 px-3 text-left min-w-[150px]">Họ và tên</th>
                    <th className="py-2 px-2.5 text-left w-24">Lớp</th>
                    <th className="py-2 px-3 text-left w-36 border-r border-slate-200">GVCN</th>

                    {/* Toán */}
                    <th className="py-2 px-1.5 text-center w-12 bg-blue-50/50" title="Môn có Cam kết đầu vào">CK [x]</th>
                    <th className="py-2 px-2 text-center w-16 bg-blue-50/50" title="Điểm Khảo sát đầu vào">KSĐV</th>
                    <th className="py-2 px-2 text-center w-16 bg-blue-50/50" title={`Điểm kiểm tra Kỳ ${currentPeriod}`}>Kỳ {currentPeriod}</th>
                    <th className="py-2 px-2 text-center w-16 bg-blue-50/50 border-r border-blue-200" title="Độ lệch = Điểm kiểm tra - Điểm KSĐV">Độ lệch</th>

                    {/* Tiếng Việt / Ngữ Văn */}
                    <th className="py-2 px-1.5 text-center w-12 bg-emerald-50/50" title="Môn có Cam kết đầu vào">CK [x]</th>
                    <th className="py-2 px-2 text-center w-16 bg-emerald-50/50" title="Điểm Khảo sát đầu vào">KSĐV</th>
                    <th className="py-2 px-2 text-center w-16 bg-emerald-50/50" title={`Điểm kiểm tra Kỳ ${currentPeriod}`}>Kỳ {currentPeriod}</th>
                    <th className="py-2 px-2 text-center w-16 bg-emerald-50/50 border-r border-emerald-200" title="Độ lệch = Điểm kiểm tra - Điểm KSĐV">Độ lệch</th>

                    {/* Tiếng Anh */}
                    <th className="py-2 px-1.5 text-center w-12 bg-violet-50/50" title="Môn có Cam kết đầu vào">CK [x]</th>
                    <th className="py-2 px-2.5 text-center w-24 bg-violet-50/50" title="Tổng điểm KSĐV Tiếng Anh (Khối 1: Thang 30; Khối khác: Thang 100 & Quy đổi thang 10)">Tổng KSĐV</th>
                    <th className="py-2 px-2 text-center w-16 bg-violet-50/50" title={`Điểm kiểm tra Kỳ ${currentPeriod}`}>Kỳ {currentPeriod}</th>
                    <th className="py-2 px-2 text-center w-16 bg-violet-50/50 border-r border-violet-200" title="Độ lệch = Điểm kiểm tra - Điểm KSĐV">Độ lệch</th>

                    {/* Cam kết Tâm lý - Cột Header màu đỏ */}
                    <th className="py-2 px-1.5 text-center w-14 bg-red-50 text-red-800" title="Cam kết Tâm lý">CK [x]</th>
                    <th className="py-2 px-2.5 text-center w-24 bg-red-50 text-red-800 border-r border-red-200" title="Điểm / Ghi chú Tâm lý">Điểm/Lưu ý</th>

                    {/* Ghi chú */}
                    <th className="py-2 px-3 text-left min-w-[220px]">Chi tiết Cam kết HĐTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedKsdvStudents.length === 0 ? (
                    <tr>
                      <td colSpan={21} className="py-12 text-center text-slate-400 font-semibold italic">
                        Không tìm thấy học sinh diện cam kết đầu vào nào trong phạm vi bộ lọc đã chọn.
                      </td>
                    </tr>
                  ) : (
                    displayedKsdvStudents.map((st: any, idx: number) => {
                      const isPsychologyAlert = Boolean(st.psychology?.isCommitted || st.psychology?.isAlert)
                      return (
                        <tr 
                          key={st.studentId || idx} 
                          className={`transition-colors ${
                            isPsychologyAlert 
                              ? "bg-red-50/30 hover:bg-red-50/60 border-l-4 border-l-red-500" 
                              : "hover:bg-slate-50/80"
                          }`}
                        >
                          <td className="py-2.5 px-2 text-center text-slate-400 font-medium">{idx + 1}</td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="px-2 py-0.5 rounded font-extrabold text-[10px] bg-purple-50 text-purple-700 border border-purple-200">
                              {st.campusName || st.campusCode || "CS"}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 font-mono text-[11px] text-slate-600 font-bold">{st.studentCode}</td>
                          <td className="py-2.5 px-3 font-extrabold text-slate-900">
                            {st.studentName}
                            {isPsychologyAlert && (
                              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-black bg-red-600 text-white shadow-xs">
                                Tâm lý
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5">
                            <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-teal-50 text-[#005B58] border border-teal-200">
                              {st.className}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-semibold border-r border-slate-200 text-[11px]">
                            {st.homeroomTeacher}
                          </td>

                          {/* MÔN TOÁN */}
                          <td className="py-2.5 px-1.5 text-center bg-blue-50/20">
                            {st.math?.isCommitted ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full font-black text-xs bg-rose-500 text-white shadow-sm" title="Môn có Cam kết đầu vào">
                                x
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold text-slate-700 bg-blue-50/20">
                            {st.math?.entranceScore !== null && st.math?.entranceScore !== undefined ? st.math.entranceScore : "-"}
                          </td>
                          <td className="py-2.5 px-2 text-center font-black text-blue-900 bg-blue-50/20">
                            {st.math?.currentScore !== null && st.math?.currentScore !== undefined ? (
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-extrabold">
                                {st.math.currentScore}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center bg-blue-50/20 font-extrabold border-r border-blue-200">
                            {st.math?.delta !== null && st.math?.delta !== undefined ? (
                              st.math.delta > 0 ? (
                                <span className="text-emerald-600 font-black">+{st.math.delta}</span>
                              ) : st.math.delta < 0 ? (
                                <span className="text-rose-600 font-black">{st.math.delta}</span>
                              ) : (
                                <span className="text-slate-400 font-bold">0</span>
                              )
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* MÔN TIẾNG VIỆT / NGỮ VĂN */}
                          <td className="py-2.5 px-1.5 text-center bg-emerald-50/20">
                            {st.literature?.isCommitted ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full font-black text-xs bg-rose-500 text-white shadow-sm" title="Môn có Cam kết đầu vào">
                                x
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold text-slate-700 bg-emerald-50/20">
                            {st.literature?.entranceScore !== null && st.literature?.entranceScore !== undefined ? st.literature.entranceScore : "-"}
                          </td>
                          <td className="py-2.5 px-2 text-center font-black text-emerald-900 bg-emerald-50/20">
                            {st.literature?.currentScore !== null && st.literature?.currentScore !== undefined ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-extrabold">
                                {st.literature.currentScore}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center bg-emerald-50/20 font-extrabold border-r border-emerald-200">
                            {st.literature?.delta !== null && st.literature?.delta !== undefined ? (
                              st.literature.delta > 0 ? (
                                <span className="text-emerald-600 font-black">+{st.literature.delta}</span>
                              ) : st.literature.delta < 0 ? (
                                <span className="text-rose-600 font-black">{st.literature.delta}</span>
                              ) : (
                                <span className="text-slate-400 font-bold">0</span>
                              )
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* MÔN TIẾNG ANH */}
                          <td className="py-2.5 px-1.5 text-center bg-violet-50/20">
                            {st.english?.isCommitted ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full font-black text-xs bg-rose-500 text-white shadow-sm" title="Môn có Cam kết đầu vào">
                                x
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 text-center font-bold text-slate-800 bg-violet-50/20">
                            {(st.english?.entranceTotal100 !== null && st.english?.entranceTotal100 !== undefined) || (st.english?.entranceScale10 !== null && st.english?.entranceScale10 !== undefined) ? (
                              <div title={`Nói: ${st.english.oralScore ?? "-"} | Viết: ${st.english.writtenScore ?? "-"}${st.english.eptScore ? ` | EPT: ${st.english.eptScore}` : ""}`}>
                                {st.isGrade1 || st.english?.isGrade1 ? (
                                  <>
                                    <span className="text-xs font-black text-violet-900">{st.english.oralScore ?? (st.english.entranceScale10 ? Math.round(Number(st.english.entranceScale10) * 3 * 10) / 10 : "-")}</span>
                                    <span className="text-[10px] text-slate-400">/30</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-xs font-black text-violet-900">{st.english.entranceTotal100 ?? Math.round(Number(st.english.entranceScale10) * 10)}</span>
                                    <span className="text-[10px] text-slate-400">/100</span>
                                  </>
                                )}
                                <span className="text-[10px] text-violet-600 font-bold block">({st.english.entranceScale10}đ)</span>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center font-black text-violet-900 bg-violet-50/20">
                            {st.english?.currentScore !== null && st.english?.currentScore !== undefined ? (
                              <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-900 font-extrabold">
                                {st.english.currentScore}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center bg-violet-50/20 font-extrabold border-r border-violet-200">
                            {st.english?.delta !== null && st.english?.delta !== undefined ? (
                              st.english.delta > 0 ? (
                                <span className="text-emerald-600 font-black">+{st.english.delta}</span>
                              ) : st.english.delta < 0 ? (
                                <span className="text-rose-600 font-black">{st.english.delta}</span>
                              ) : (
                                <span className="text-slate-400 font-bold">0</span>
                              )
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* CAM KẾT TÂM LÝ - HIỂN THỊ MÀU ĐỎ NỔI BẬT */}
                          <td className="py-2.5 px-1.5 text-center bg-red-50/30">
                            {isPsychologyAlert ? (
                              <span 
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs bg-red-600 text-white shadow-md ring-2 ring-red-300 animate-pulse" 
                                title="Cam kết Tâm lý - Cần theo dõi sát"
                              >
                                x
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center bg-red-50/30 border-r border-red-200">
                            {isPsychologyAlert ? (
                              <div className="space-y-0.5">
                                {st.psychology?.entranceScore !== null && st.psychology?.entranceScore !== undefined ? (
                                  <span className="font-black text-red-700 text-xs block">
                                    {st.psychology.entranceScore}đ
                                  </span>
                                ) : null}
                                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-black bg-red-100 text-red-800 border border-red-200">
                                  🚨 Chú ý đỏ
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* CHI TIẾT CAM KẾT */}
                          <td className="py-2.5 px-3">
                            <div className="space-y-0.5">
                              {st.admissionCriteria && (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  {st.admissionCriteria}
                                </span>
                              )}
                              {st.directorNote && (
                                <p className="text-[10px] text-slate-600 italic line-clamp-2 leading-tight" title={st.directorNote}>
                                  &quot;{st.directorNote}&quot;
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. VIEW 3: BIỂU ĐỒ TRỰC QUAN HÓA PHỔ ĐIỂM */}
      {activeSubView === "charts" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
          {/* Biểu đồ Phổ điểm theo 4 dải điểm */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Phổ điểm Tổng hợp Toàn trường</h3>
                <p className="text-xs text-slate-400">Phân bố học sinh theo 4 thang bậc năng lực tại Kỳ {currentPeriod}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-50 text-[#005B58]">
                {data.summary.totalGraded} HS đã có điểm
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.distribution || []} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip
                    formatter={(val: any, name: any, item: any) => [`${val} học sinh (${item.payload.percent}%)`, "Số lượng"]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {(data.distribution || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || "#005B58"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
              {(data.distribution || []).map((d: any, idx: number) => (
                <div key={idx} className="p-2 rounded-xl bg-slate-50">
                  <div className="text-[10px] font-bold text-slate-500">{d.label}</div>
                  <div className="text-base font-black text-slate-800 mt-0.5">{d.count} HS</div>
                  <div className="text-[10px] font-semibold text-slate-400">{d.percent}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Phân tích Tỷ lệ Đạt chuẩn theo Môn học */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Tỷ lệ Đạt Chuẩn theo Môn học</h3>
                <p className="text-xs text-slate-400">So sánh tỷ lệ học sinh đạt chuẩn môn tại Kỳ {currentPeriod}</p>
              </div>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {availableSubjectsForPeriod.map(sub => {
                const subDistributions = (data.teacherDistributions || []).filter(d => d.subjectId === sub.id)
                const totalInSub = subDistributions.reduce((acc, d) => acc + d.gradedCount, 0)
                const passedInSub = subDistributions.reduce((acc, d) => acc + d.count_passed_benchmark, 0)
                const rate = totalInSub > 0 ? Math.round((passedInSub / totalInSub) * 100) : 0

                return (
                  <div key={sub.id} className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800">{sub.subjectName} ({sub.subjectCode})</span>
                      <span className={rate >= 80 ? "text-emerald-700" : rate >= 60 ? "text-teal-700" : "text-amber-700"}>
                        {passedInSub} / {totalInSub} HS ({rate}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          rate >= 80 ? "bg-emerald-500" : rate >= 60 ? "bg-teal-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL CẤU HÌNH CHUẨN MÔN HỌC LINH ĐỘNG */}
      {benchmarkModalOpen && (
        <BenchmarkConfigModal
          academicYears={academicYears}
          selectedYearId={selectedYearId}
          currentPeriod={currentPeriod}
          existingConfigs={benchmarkConfigsList}
          subjects={subjects}
          onClose={() => setBenchmarkModalOpen(false)}
          onSave={handleSaveBenchmarks}
          saving={savingBenchmarks}
        />
      )}

      {/* 8. MODAL CHI TIẾT DANH SÁCH HỌC SINH CỦA DÒNG GIÁO VIÊN */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs font-extrabold bg-teal-100 text-[#005B58] rounded">
                    CHI TIẾT PHỔ ĐIỂM
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Kỳ {currentPeriod}
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-slate-800 mt-1">
                  {selectedTeacherRow?.subjectName} - Lớp {selectedTeacherRow?.className} {selectedTeacherRow?.campusName ? `(${selectedTeacherRow.campusName})` : ""}
                </h3>
                <p className="text-xs text-slate-500">
                  GV: <strong className="text-slate-800">{selectedTeacherRow?.teacherName}</strong> | Mức chuẩn quy định: <strong className="text-teal-700">{selectedTeacherRow?.benchmark}đ</strong>
                </p>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1">
              {loadingRowDetail ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#005B58]" />
                  <span>Đang tải danh sách học sinh...</span>
                </div>
              ) : !rowDetailData || !rowDetailData.students || rowDetailData.students.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  Không có dữ liệu học sinh.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
                      <th className="py-2.5 px-3 text-center w-10">STT</th>
                      <th className="py-2.5 px-3">Mã HS</th>
                      <th className="py-2.5 px-3">Họ và tên</th>
                      <th className="py-2.5 px-3 text-center">Điểm số</th>
                      <th className="py-2.5 px-3 text-center">Đánh giá chuẩn</th>
                      <th className="py-2.5 px-3">Nhận xét</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rowDetailData.students.map((st: any, sIdx: number) => {
                      const sc = st.compositeScore !== null ? Number(st.compositeScore) : null
                      const bm = selectedTeacherRow?.benchmark || 6.0
                      const isPassed = sc !== null && sc >= bm

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 text-center text-slate-400">{sIdx + 1}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{st.studentCode}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{st.studentName}</td>
                          <td className="py-2.5 px-3 text-center">
                            {sc !== null ? (
                              <span className={`font-black ${sc < 5.0 ? "text-rose-700" : sc < bm ? "text-amber-700" : "text-emerald-700"}`}>
                                {sc}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {sc !== null ? (
                              isPassed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <Check className="w-3 h-3" /> Đạt chuẩn
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                  Dưới chuẩn
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400">Chưa nhập</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 italic">
                            {st.remark || <span className="text-slate-300">Chưa có</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 italic">
                Để chỉnh sửa điểm số, vui lòng chuyển sang Tab &quot;Sổ điểm&quot;
              </span>
              <div className="flex items-center gap-2">
                {onNavigateToGradebook && selectedTeacherRow && (
                  <button
                    onClick={() => {
                      setDetailModalOpen(false)
                      onNavigateToGradebook({
                        campusId: selectedTeacherRow.campusId,
                        grade: selectedTeacherRow.grade,
                        classId: selectedTeacherRow.classId,
                        subjectId: selectedTeacherRow.subjectId,
                        period: currentPeriod
                      })
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#005B58] hover:bg-[#004845] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở Sổ điểm</span>
                  </button>
                )}
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * MODAL THIẾT LẬP CẤU HÌNH CHUẨN MÔN HỌC LINH ĐỘNG
 */
function BenchmarkConfigModal({
  academicYears,
  selectedYearId,
  currentPeriod,
  existingConfigs = [],
  subjects = [],
  onClose,
  onSave,
  saving
}: any) {
  // Level defaults: TIEU_HOC = 7.0, THCS = 6.0, THPT = 6.0
  const [tieuHocScore, setTieuHocScore] = useState<number>(7.0)
  const [thcsScore, setThcsScore] = useState<number>(6.0)
  const [thptScore, setThptScore] = useState<number>(6.0)

  // Custom subject benchmark overrides
  const [customConfigs, setCustomConfigs] = useState<any[]>([])

  useEffect(() => {
    // Find existing level defaults
    const th = existingConfigs.find((c: any) => c.level === "TIEU_HOC" && (c.subjectId === "ALL" || !c.subjectId))
    if (th) setTieuHocScore(th.benchmarkScore)

    const cs = existingConfigs.find((c: any) => c.level === "THCS" && (c.subjectId === "ALL" || !c.subjectId))
    if (cs) setThcsScore(cs.benchmarkScore)

    const pt = existingConfigs.find((c: any) => c.level === "THPT" && (c.subjectId === "ALL" || !c.subjectId))
    if (pt) setThptScore(pt.benchmarkScore)

    // Filter custom overrides
    const customs = existingConfigs.filter((c: any) => c.subjectId && c.subjectId !== "ALL")
    setCustomConfigs(customs)
  }, [existingConfigs])

  const handleAddCustom = () => {
    if (subjects.length === 0) return
    setCustomConfigs(prev => [
      ...prev,
      {
        subjectId: subjects[0].id,
        level: "ALL",
        grade: "ALL",
        evaluationPeriod: "ALL",
        benchmarkScore: 6.5
      }
    ])
  }

  const handleRemoveCustom = (idx: number) => {
    setCustomConfigs(prev => prev.filter((_, i) => i !== idx))
  }

  const handleUpdateCustom = (idx: number, field: string, val: any) => {
    setCustomConfigs(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: val }
      return next
    })
  }

  const handleSubmit = () => {
    const payload = [
      { level: "TIEU_HOC", grade: "ALL", subjectId: "ALL", evaluationPeriod: "ALL", benchmarkScore: Number(tieuHocScore) },
      { level: "THCS", grade: "ALL", subjectId: "ALL", evaluationPeriod: "ALL", benchmarkScore: Number(thcsScore) },
      { level: "THPT", grade: "ALL", subjectId: "ALL", evaluationPeriod: "ALL", benchmarkScore: Number(thptScore) },
      ...customConfigs.map(c => ({
        level: c.level || "ALL",
        grade: c.grade || "ALL",
        subjectId: c.subjectId,
        evaluationPeriod: c.evaluationPeriod || "ALL",
        benchmarkScore: Number(c.benchmarkScore)
      }))
    ]
    onSave(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800">
                Thiết lập Chuẩn Môn học Linh động
              </h3>
              <p className="text-xs text-slate-500">
                Cấu hình mốc điểm chuẩn đánh giá học sinh theo từng Cấp học hoặc từng Môn học riêng biệt.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-5 text-xs">
          {/* 1. Chuẩn mặc định theo 3 Cấp học */}
          <div>
            <label className="block font-bold text-slate-800 mb-2">
              1. Chuẩn chung theo từng Cấp học (Áp dụng cho tất cả các môn của cấp):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-1">
                <span className="font-bold text-teal-900 block">Cấp Tiểu học</span>
                <span className="text-[11px] text-teal-700 block">Quy định mặc định: 7.0đ</span>
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={tieuHocScore}
                    onChange={e => setTieuHocScore(parseFloat(e.target.value) || 7.0)}
                    className="w-20 bg-white border border-teal-300 rounded-lg px-2.5 py-1 font-black text-slate-800 text-center outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="font-bold text-slate-600">điểm</span>
                </div>
              </div>

              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-1">
                <span className="font-bold text-sky-900 block">Cấp THCS</span>
                <span className="text-[11px] text-sky-700 block">Quy định mặc định: 6.0đ</span>
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={thcsScore}
                    onChange={e => setThcsScore(parseFloat(e.target.value) || 6.0)}
                    className="w-20 bg-white border border-sky-300 rounded-lg px-2.5 py-1 font-black text-slate-800 text-center outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <span className="font-bold text-slate-600">điểm</span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                <span className="font-bold text-indigo-900 block">Cấp THPT</span>
                <span className="text-[11px] text-indigo-700 block">Quy định mặc định: 6.0đ</span>
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={thptScore}
                    onChange={e => setThptScore(parseFloat(e.target.value) || 6.0)}
                    className="w-20 bg-white border border-indigo-300 rounded-lg px-2.5 py-1 font-black text-slate-800 text-center outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="font-bold text-slate-600">điểm</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Chuẩn tùy biến cho Môn học riêng biệt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-800">
                2. Chuẩn tùy biến cho Môn học / Khối riêng biệt (Nếu có):
              </label>
              <button
                type="button"
                onClick={handleAddCustom}
                className="px-2.5 py-1 bg-[#005B58] hover:bg-[#004845] text-white rounded-lg text-xs font-bold transition-all"
              >
                + Thêm môn riêng
              </button>
            </div>

            {customConfigs.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400">
                Chưa có môn nào được cấu hình chuẩn riêng. Tất cả các môn đang áp dụng chuẩn chung của cấp học.
              </div>
            ) : (
              <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                {customConfigs.map((cfg, idx) => (
                  <div key={idx} className="flex items-center gap-2 flex-wrap bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="flex-1 min-w-[140px]">
                      <select
                        value={cfg.subjectId}
                        onChange={e => handleUpdateCustom(idx, "subjectId", e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-800"
                      >
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.subjectName} ({s.subjectCode})</option>
                        ))}
                      </select>
                    </div>

                    <div className="w-28">
                      <select
                        value={cfg.grade || "ALL"}
                        onChange={e => handleUpdateCustom(idx, "grade", e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700"
                      >
                        <option value="ALL">Tất cả Khối</option>
                        {GRADES.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={cfg.benchmarkScore}
                        onChange={e => handleUpdateCustom(idx, "benchmarkScore", parseFloat(e.target.value) || 6.0)}
                        className="w-16 border border-slate-300 rounded-lg p-1.5 text-xs text-center font-black text-slate-800"
                      />
                      <span className="font-bold text-slate-600">đ</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCustom(idx)}
                      className="w-7 h-7 text-rose-500 hover:bg-rose-50 rounded-lg flex items-center justify-center font-bold"
                      title="Xóa môn này"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#005B58] hover:bg-[#004845] text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Lưu Cấu Hình Chuẩn</span>
          </button>
        </div>
      </div>
    </div>
  )
}
