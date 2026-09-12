"use client"

import { useState, useEffect, useMemo } from "react"
import * as XLSX from "xlsx"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Award,
  Users,
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  Eye,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  GraduationCap
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from "recharts"

interface Props {
  academicYears: any[]
  selectedYearId: string
  classes: any[]
  subjects: any[]
}

const EVAL_PERIODS = [
  { code: "KSĐN", name: "Khảo sát đầu năm (KSĐN)" },
  { code: "GK1", name: "Giữa kỳ 1 (GK1)" },
  { code: "CK1", name: "Cuối kỳ 1 (CK1)" },
  { code: "GK2", name: "Giữa kỳ 2 (GK2)" },
  { code: "CK2", name: "Cuối kỳ 2 (CK2)" }
]

const GRADES = [
  "Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5",
  "Khối 6", "Khối 7", "Khối 8", "Khối 9",
  "Khối 10", "Khối 11", "Khối 12"
]

export function GradeAnalyticsTab({ academicYears, selectedYearId, classes, subjects }: Props) {
  // Filters
  const [selectedLevelFilter, setSelectedLevelFilter] = useState("ALL")
  const [selectedGradeFilter, setSelectedGradeFilter] = useState("ALL")
  const [selectedSystemFilter, setSelectedSystemFilter] = useState("ALL")
  const [selectedClassId, setSelectedClassId] = useState("ALL")
  const [selectedSubjectId, setSelectedSubjectId] = useState("ALL")
  const [currentPeriod, setCurrentPeriod] = useState("GK1")
  const [baselinePeriod, setBaselinePeriod] = useState("KSĐN")
  const [filterMode, setFilterMode] = useState<"ALL" | "ONLY_BASELINE" | "AT_RISK" | "IMPROVED" | "REGRESSED" | "URGENT">("ALL")
  const [searchKeyword, setSearchKeyword] = useState("")

  // Data states
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{
    summary: any
    distribution: any[]
    multiPeriodTrend: any[]
    transitionMatrix: any[]
    studentsTracking: any[]
    subjects: any[]
  }>({
    summary: {
      totalStudents: 0,
      totalGraded: 0,
      totalWithBaseline: 0,
      totalWithBoth: 0,
      currentAverage: 0,
      baselineAverage: 0,
      averageDelta: 0,
      improvedCount: 0,
      improvedPercent: 0,
      atRiskBaselineCount: 0,
      atRiskResolvedCount: 0,
      regressedCount: 0
    },
    distribution: [],
    multiPeriodTrend: [],
    transitionMatrix: [],
    studentsTracking: [],
    subjects: []
  })

  // Selected student for detail popup
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any>(null)

  // Education system options from classes
  const educationSystemOptions = useMemo(() => {
    const set = new Set<string>()
    classes.forEach(c => {
      if (c.educationSystem && c.educationSystem.trim()) {
        set.add(c.educationSystem.trim())
      }
    })
    return Array.from(set).sort()
  }, [classes])

  // Filtered classes based on Level, Grade, System
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
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

      return true
    })
  }, [classes, selectedLevelFilter, selectedGradeFilter, selectedSystemFilter])

  // Reset selectedClassId if not in filtered list
  useEffect(() => {
    if (selectedClassId !== "ALL" && !filteredClasses.some(c => c.id === selectedClassId)) {
      setSelectedClassId("ALL")
    }
  }, [filteredClasses, selectedClassId])

  // Fetch Analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        academicYearId: selectedYearId,
        levelFilter: selectedLevelFilter,
        gradeFilter: selectedGradeFilter,
        systemFilter: selectedSystemFilter,
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
  }, [
    selectedYearId,
    selectedLevelFilter,
    selectedGradeFilter,
    selectedSystemFilter,
    selectedClassId,
    selectedSubjectId,
    currentPeriod,
    baselinePeriod
  ])

  // Filtered student list for table
  const filteredStudents = useMemo(() => {
    return (data.studentsTracking || []).filter(s => {
      // Keyword search
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase().trim()
        const matchCode = (s.studentCode || "").toLowerCase().includes(kw)
        const matchName = (s.studentName || "").toLowerCase().includes(kw)
        const matchClass = (s.className || "").toLowerCase().includes(kw)
        if (!matchCode && !matchName && !matchClass) return false
      }

      // Filter modes
      if (filterMode === "ONLY_BASELINE") {
        return s.baselineScore !== null
      }
      if (filterMode === "AT_RISK") {
        return s.baselineScore !== null && s.baselineScore < 6.5
      }
      if (filterMode === "IMPROVED") {
        return s.delta !== null && s.delta > 0
      }
      if (filterMode === "REGRESSED") {
        return s.delta !== null && s.delta < 0
      }
      if (filterMode === "URGENT") {
        return (
          (s.baselineScore !== null && s.baselineScore < 5.0 && s.currentScore !== null && s.currentScore < 5.0) ||
          s.statusTag === "URGENT_INTERVENTION"
        )
      }

      return true
    })
  }, [data.studentsTracking, searchKeyword, filterMode])

  // Export to Excel
  const handleExportExcel = () => {
    if (!filteredStudents || filteredStudents.length === 0) {
      alert("Không có dữ liệu để xuất Excel!")
      return
    }

    const currentPeriodName = EVAL_PERIODS.find(p => p.code === currentPeriod)?.name || currentPeriod
    const baselinePeriodName = EVAL_PERIODS.find(p => p.code === baselinePeriod)?.name || baselinePeriod

    const rows = filteredStudents.map((s, idx) => ({
      STT: idx + 1,
      "Mã Học Sinh": s.studentCode,
      "Họ và Tên": s.studentName,
      "Lớp": s.className,
      "Khối": s.grade,
      "Môn Học": s.subjectName,
      [`Điểm ${baselinePeriodName}`]: s.baselineScore !== null ? s.baselineScore : "Chưa có",
      "Nguồn điểm đầu vào": s.isFromEntranceTest ? "Khảo sát tuyển sinh" : "Sổ điểm KSĐN",
      [`Điểm ${currentPeriodName}`]: s.currentScore !== null ? s.currentScore : "Chưa có",
      "Độ lệch (Delta)": s.delta !== null ? (s.delta > 0 ? `+${s.delta}` : s.delta) : "-",
      "Trạng thái Bám sát": s.statusLabel,
      "Điểm KSĐN": s.periodHistory?.KSĐN ?? "",
      "Điểm GK1": s.periodHistory?.GK1 ?? "",
      "Điểm CK1": s.periodHistory?.CK1 ?? "",
      "Điểm GK2": s.periodHistory?.GK2 ?? "",
      "Điểm CK2": s.periodHistory?.CK2 ?? "",
      "Ghi chú / Nhận xét": s.remark || ""
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "PhanTichPhoDiem")

    // Set auto column widths
    const maxCols = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.max(key.length + 4, 14)
    }))
    worksheet["!cols"] = maxCols

    const fileName = `BaoCao_PhoDiem_BamSat_${currentPeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  const { summary, distribution, multiPeriodTrend, transitionMatrix } = data

  return (
    <div className="space-y-6">
      {/* 1. SMART FILTERS CARD */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-[#005B58]" />
            <h2 className="text-base font-bold text-slate-800">Bộ lọc phân tích phổ điểm & tiến độ</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#005B58]" : ""}`} />
              Làm mới dữ liệu
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất Excel Báo Cáo
            </button>
          </div>
        </div>

        {/* Filter selects */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Bậc học */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Bậc học</label>
            <select
              value={selectedLevelFilter}
              onChange={e => setSelectedLevelFilter(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-[#005B58] focus:border-transparent outline-none bg-slate-50"
            >
              <option value="ALL">-- Tất cả Bậc --</option>
              <option value="TieuHoc">Tiểu học</option>
              <option value="THCS">THCS</option>
              <option value="THPT">THPT</option>
              <option value="MamNon">Mầm non</option>
            </select>
          </div>

          {/* Khối học */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Khối học</label>
            <select
              value={selectedGradeFilter}
              onChange={e => setSelectedGradeFilter(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-[#005B58] focus:border-transparent outline-none bg-slate-50"
            >
              <option value="ALL">-- Tất cả Khối --</option>
              {GRADES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Hệ học */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Hệ học</label>
            <select
              value={selectedSystemFilter}
              onChange={e => setSelectedSystemFilter(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-[#005B58] focus:border-transparent outline-none bg-slate-50"
            >
              <option value="ALL">-- Tất cả Hệ học --</option>
              {educationSystemOptions.map(sys => (
                <option key={sys} value={sys}>{sys}</option>
              ))}
            </select>
          </div>

          {/* Lớp học */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Lớp học ({filteredClasses.length})
            </label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-[#005B58] focus:border-transparent outline-none bg-slate-50"
            >
              <option value="ALL">-- Tất cả các Lớp --</option>
              {filteredClasses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>

          {/* Môn học */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Môn học</label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-[#005B58] focus:border-transparent outline-none bg-slate-50"
            >
              <option value="ALL">-- Tất cả Môn học --</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.subjectName} ({s.subjectCode})
                </option>
              ))}
            </select>
          </div>

          {/* Mốc Đối chiếu Baseline */}
          <div>
            <label className="block text-[11px] font-semibold text-teal-800 mb-1 flex items-center gap-1">
              <GraduationCap className="w-3 h-3 text-[#005B58]" />
              Mốc Khảo sát đầu vào
            </label>
            <select
              value={baselinePeriod}
              onChange={e => setBaselinePeriod(e.target.value)}
              className="w-full text-xs font-semibold border border-teal-300 rounded-lg p-2 focus:ring-2 focus:ring-[#005B58] focus:border-transparent outline-none bg-teal-50/50 text-[#005B58]"
            >
              <option value="KSĐN">Khảo sát đầu năm (KSĐN)</option>
              <option value="GK1">Giữa kỳ 1 (GK1)</option>
            </select>
          </div>

          {/* Kỳ Đánh giá Đang xem */}
          <div>
            <label className="block text-[11px] font-semibold text-sky-800 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-sky-600" />
              Kỳ đánh giá theo dõi
            </label>
            <select
              value={currentPeriod}
              onChange={e => setCurrentPeriod(e.target.value)}
              className="w-full text-xs font-semibold border border-sky-300 rounded-lg p-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-sky-50/50 text-sky-900"
            >
              {EVAL_PERIODS.filter(p => p.code !== baselinePeriod).map(p => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Tổng số HS & Có điểm đầu vào */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Học sinh theo dõi</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-[#005B58]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{summary.totalStudents}</span>
            <span className="text-xs text-slate-400 font-medium">học sinh</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md w-fit font-medium">
            <CheckCircle2 className="w-3 h-3 text-teal-600" />
            <span>{summary.totalWithBaseline} HS có điểm đầu vào ({summary.totalStudents > 0 ? Math.round((summary.totalWithBaseline / summary.totalStudents) * 100) : 0}%)</span>
          </div>
        </div>

        {/* Card 2: Điểm Trung bình Kỳ này & So sánh đầu vào */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Điểm TB Kỳ này</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#003B3A]">{summary.currentAverage || "-"}</span>
            <span className="text-xs text-slate-400 font-medium">/ 10</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold">
            {summary.averageDelta > 0 ? (
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" />
                +{summary.averageDelta}đ so với đầu vào ({summary.baselineAverage}đ)
              </span>
            ) : summary.averageDelta < 0 ? (
              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                <ArrowDownRight className="w-3 h-3" />
                {summary.averageDelta}đ so với đầu vào ({summary.baselineAverage}đ)
              </span>
            ) : (
              <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                <Minus className="w-3 h-3" />
                Tương đương đầu vào ({summary.baselineAverage}đ)
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Tỷ lệ Học sinh Tiến bộ */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tỷ lệ Tiến bộ</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{summary.improvedPercent}%</span>
            <span className="text-xs text-emerald-700 font-medium">({summary.improvedCount} HS tăng điểm)</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 font-medium">
            Có tiến bộ rõ nét so với đợt khảo sát đầu vào
          </p>
        </div>

        {/* Card 4: Nhóm Đầu vào cần bám sát (<6.5) */}
        <div className="bg-white rounded-2xl p-5 border border-amber-200 bg-amber-50/20 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Đầu vào cần bám sát</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-800">{summary.atRiskBaselineCount}</span>
            <span className="text-xs text-amber-700 font-medium">HS có điểm KS &lt; 6.5</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md font-bold w-fit">
            ✓ Đã có {summary.atRiskResolvedCount} HS vươn lên mức Khá (≥6.5)
          </div>
        </div>

        {/* Card 5: Cảnh báo sa sút (Giảm >= 1.0 đ) */}
        <div className="bg-white rounded-2xl p-5 border border-rose-200 bg-rose-50/20 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Cảnh báo Sa sút</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600">{summary.regressedCount}</span>
            <span className="text-xs text-rose-700 font-medium">HS tụt dốc &gt; 1.0đ</span>
          </div>
          <p className="mt-2 text-[11px] text-rose-700 font-medium">
            Cần giáo viên chủ nhiệm & bộ môn hỗ trợ ngay
          </p>
        </div>
      </div>

      {/* 3. VISUALIZATION: 2 BIỂU ĐỒ RECHARTS (PHỔ ĐIỂM + XU HƯỚNG ĐA KỲ) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biểu đồ 1: Phổ điểm So sánh Kép (Baseline vs Current) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#005B58]" />
                Phổ điểm môn học: Khảo sát đầu vào vs {EVAL_PERIODS.find(p => p.code === currentPeriod)?.name || currentPeriod}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              So sánh số lượng và phân bố học sinh ở từng dải điểm giữa mốc xuất phát và kỳ đánh giá hiện tại.
            </p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="rangeLabel" tick={{ fontSize: 11, fill: "#64748B" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const baseData = payload.find(p => p.dataKey === "baselineCount")
                        const currData = payload.find(p => p.dataKey === "currentCount")
                        const itemData = baseData?.payload || currData?.payload
                        return (
                          <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-xs space-y-1.5">
                            <div className="font-bold text-slate-800 border-b pb-1">{itemData?.name}</div>
                            <div className="flex items-center justify-between gap-4 text-slate-600">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 inline-block" />
                                {baselinePeriod}:
                              </span>
                              <span className="font-bold">{baseData?.value} HS ({itemData?.baselinePercent}%)</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-[#005B58]">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-[#005B58] inline-block" />
                                {currentPeriod}:
                              </span>
                              <span className="font-bold">{currData?.value} HS ({itemData?.currentPercent}%)</span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: 12, paddingBottom: 10 }}
                  />
                  <Bar
                    name={`Khảo sát đầu vào (${baselinePeriod})`}
                    dataKey="baselineCount"
                    fill="#94A3B8"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    name={`Kỳ hiện tại (${currentPeriod})`}
                    dataKey="currentCount"
                    fill="#005B58"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-center">
            {distribution.map(d => (
              <div key={d.bucket} className="bg-slate-50 p-2 rounded-xl">
                <div className="text-[10px] font-semibold text-slate-500">{d.rangeLabel}</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">
                  {d.currentCount} HS
                  <span className={`text-[10px] ml-1 ${d.currentCount > d.baselineCount ? (d.bucket === "UNDER_5" ? "text-rose-600" : "text-emerald-600") : "text-slate-400"}`}>
                    ({d.currentCount >= d.baselineCount ? "+" : ""}{d.currentCount - d.baselineCount})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Biểu đồ 2: Xu hướng Điểm TB Qua Các Kỳ (Multi-Period Trend) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-600" />
                Diễn tiến Điểm Trung bình qua chuỗi các Kỳ đánh giá
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Theo dõi biến động điểm TB chung và đường phát triển riêng của Nhóm học sinh có điểm đầu vào cần bám sát.
            </p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={multiPeriodTrend} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#64748B" }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "#64748B" }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0]?.payload
                        return (
                          <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-xs space-y-1.5">
                            <div className="font-bold text-slate-800 border-b pb-1">{item.periodName} ({item.period})</div>
                            <div className="flex items-center justify-between gap-4 text-teal-700">
                              <span>Điểm TB Toàn Khối/Lớp:</span>
                              <span className="font-bold">{item.averageScore !== null ? `${item.averageScore}đ` : "Chưa có"}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-amber-700">
                              <span>Điểm TB Nhóm Đầu Vào &lt; 6.5:</span>
                              <span className="font-bold">{item.atRiskAverageScore !== null ? `${item.atRiskAverageScore}đ` : "Chưa có"}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Tổng cộng: {item.totalGraded} bài kiểm tra đã chấm
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: 12, paddingBottom: 10 }}
                  />
                  <Line
                    type="monotone"
                    name="Điểm TB Toàn khối / Lớp"
                    dataKey="averageScore"
                    stroke="#005B58"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#005B58" }}
                    activeDot={{ r: 7 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    name="Điểm TB Nhóm Cần Bám Sát (<6.5)"
                    dataKey="atRiskAverageScore"
                    stroke="#D97706"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ r: 4, fill: "#D97706" }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1 pt-3 border-t border-slate-100 text-center">
            {multiPeriodTrend.map(p => (
              <div key={p.period} className="bg-slate-50 p-2 rounded-xl">
                <div className="text-[10px] font-bold text-slate-500">{p.period}</div>
                <div className="text-xs font-black text-teal-800 mt-0.5">
                  {p.averageScore !== null ? `${p.averageScore}đ` : "-"}
                </div>
                <div className="text-[9px] text-amber-600 font-semibold">
                  {p.atRiskAverageScore !== null ? `BS: ${p.atRiskAverageScore}đ` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. CHUYÊN ĐỀ: MA TRẬN DỊCH CHUYỂN PHONG ĐỘ (TRANSITION MATRIX) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              Ma trận Chuyển dịch Phong độ (Từ Đầu vào → Kỳ {currentPeriod})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi sự dịch chuyển thực tế của các nhóm học sinh để đánh giá tính hiệu quả của công tác kèm cặp & bồi dưỡng.
            </p>
          </div>
          <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
            Tổng HS có đủ 2 kỳ đánh giá: <strong className="text-slate-800">{summary.totalWithBoth}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-2.5 px-4 font-bold">Mốc Xuất phát (Đầu vào)</th>
                <th className="py-2.5 px-3 font-semibold text-rose-700 bg-rose-50/50">Dưới 5.0 (Yếu)</th>
                <th className="py-2.5 px-3 font-semibold text-amber-700 bg-amber-50/50">5.0 - &lt;6.5 (TB)</th>
                <th className="py-2.5 px-3 font-semibold text-teal-700 bg-teal-50/50">6.5 - &lt;8.0 (Khá)</th>
                <th className="py-2.5 px-3 font-semibold text-emerald-700 bg-emerald-50/50">8.0 - 10.0 (Giỏi)</th>
                <th className="py-2.5 px-4 font-bold text-slate-700">Tổng đầu vào</th>
                <th className="py-2.5 px-4 font-bold text-slate-700">Đánh giá Hiệu quả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transitionMatrix.map(row => {
                const isUnder5 = row.fromBucket === "UNDER_5"
                const isFrom5To65 = row.fromBucket === "FROM_5_TO_65"
                const movedUp = isUnder5 ? (row.toFrom5To65 + row.toFrom65To8 + row.toFrom8To10) : isFrom5To65 ? (row.toFrom65To8 + row.toFrom8To10) : 0
                const percentUp = row.total > 0 ? Math.round((movedUp / row.total) * 100) : 0

                return (
                  <tr key={row.fromBucket} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-slate-800">{row.fromLabel}</td>
                    <td className="py-2.5 px-3 text-rose-700 font-semibold">{row.toUnder5} HS</td>
                    <td className="py-2.5 px-3 text-amber-700 font-semibold">{row.toFrom5To65} HS</td>
                    <td className="py-2.5 px-3 text-teal-700 font-semibold">{row.toFrom65To8} HS</td>
                    <td className="py-2.5 px-3 text-emerald-700 font-bold">{row.toFrom8To10} HS</td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">{row.total} HS</td>
                    <td className="py-2.5 px-4">
                      {isUnder5 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          ↑ {movedUp} HS thoát yếu ({percentUp}%)
                        </span>
                      ) : isFrom5To65 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                          ↑ {movedUp} HS vươn lên khá/giỏi ({percentUp}%)
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">
                          {row.toUnder5 + row.toFrom5To65 > 0 ? (
                            <span className="text-rose-600 font-semibold">⚠ {row.toUnder5 + row.toFrom5To65} HS giảm sút</span>
                          ) : (
                            <span className="text-emerald-600 font-medium">✓ Duy trì tốt</span>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. DANH SÁCH CHI TIẾT HỌC SINH THEO DÕI BÁM SÁT (TRACKING TABLE) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#005B58]" />
              Danh sách Học sinh Theo dõi & Bám sát Tiến độ ({filteredStudents.length} HS)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tra cứu từng học sinh, mức độ tiến bộ qua các kỳ kiểm tra, điểm khảo sát đầu vào và các cảnh báo học tập.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                placeholder="Tìm mã hoặc tên học sinh..."
                className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl w-60 focus:ring-2 focus:ring-[#005B58] focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* Quick Filter Tag Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilterMode("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterMode === "ALL"
                ? "bg-[#005B58] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tất cả ({data.studentsTracking?.length || 0})
          </button>
          <button
            onClick={() => setFilterMode("AT_RISK")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              filterMode === "AT_RISK"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Đầu vào cần bám sát (&lt;6.5) ({summary.atRiskBaselineCount})
          </button>
          <button
            onClick={() => setFilterMode("URGENT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              filterMode === "URGENT"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Cần phụ đạo khẩn cấp (&lt;5đ)
          </button>
          <button
            onClick={() => setFilterMode("REGRESSED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              filterMode === "REGRESSED"
                ? "bg-rose-700 text-white shadow-sm"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Sa sút điểm (&gt;1đ) ({summary.regressedCount})
          </button>
          <button
            onClick={() => setFilterMode("IMPROVED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              filterMode === "IMPROVED"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Tiến bộ tăng điểm ({summary.improvedCount})
          </button>
          <button
            onClick={() => setFilterMode("ONLY_BASELINE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterMode === "ONLY_BASELINE"
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Chỉ HS có điểm KS đầu vào ({summary.totalWithBaseline})
          </button>
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-3 px-3 font-semibold text-center w-12">STT</th>
                <th className="py-3 px-3 font-semibold">Mã HS</th>
                <th className="py-3 px-4 font-semibold">Họ và Tên</th>
                <th className="py-3 px-3 font-semibold">Lớp</th>
                <th className="py-3 px-3 font-semibold">Môn học</th>
                <th className="py-3 px-3 font-semibold text-center bg-teal-50/60 text-[#005B58]">
                  Khảo sát đầu vào ({baselinePeriod})
                </th>
                <th className="py-3 px-3 font-semibold text-center bg-sky-50/60 text-sky-900">
                  Điểm {currentPeriod}
                </th>
                <th className="py-3 px-3 font-semibold text-center">Độ lệch (Δ)</th>
                <th className="py-3 px-4 font-semibold text-center">Trạng thái Bám sát</th>
                <th className="py-3 px-4 font-semibold text-center">Lịch sử các kỳ</th>
                <th className="py-3 px-3 font-semibold">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 italic">
                    Không tìm thấy dữ liệu học sinh phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => (
                  <tr key={`${s.studentId}_${s.subjectId}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-600">{s.studentCode}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">
                      {s.studentName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium">{s.className}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {s.subjectName}
                      </span>
                    </td>

                    {/* Điểm Khảo sát đầu vào */}
                    <td className="py-2.5 px-3 text-center bg-teal-50/20">
                      {s.baselineScore !== null ? (
                        <div className="flex flex-col items-center">
                          <span className={`font-black text-xs px-2 py-0.5 rounded-md ${
                            s.baselineScore < 5.0
                              ? "bg-rose-100 text-rose-700"
                              : s.baselineScore < 6.5
                              ? "bg-amber-100 text-amber-800"
                              : s.baselineScore < 8.0
                              ? "bg-teal-100 text-teal-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {s.baselineScore}
                          </span>
                          {s.isFromEntranceTest && (
                            <span className="text-[9px] text-teal-600 font-medium mt-0.5">Tuyển sinh</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Điểm Kỳ hiện tại */}
                    <td className="py-2.5 px-3 text-center bg-sky-50/20">
                      {s.currentScore !== null ? (
                        <span className={`font-black text-xs px-2 py-0.5 rounded-md ${
                          s.currentScore < 5.0
                            ? "bg-rose-100 text-rose-700"
                            : s.currentScore < 6.5
                            ? "bg-amber-100 text-amber-800"
                            : s.currentScore < 8.0
                            ? "bg-sky-100 text-sky-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {s.currentScore}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Độ lệch Delta */}
                    <td className="py-2.5 px-3 text-center">
                      {s.delta !== null ? (
                        s.delta > 0 ? (
                          <span className="font-bold text-emerald-600 inline-flex items-center gap-0.5">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            +{s.delta}
                          </span>
                        ) : s.delta < 0 ? (
                          <span className="font-bold text-rose-600 inline-flex items-center gap-0.5">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            {s.delta}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-semibold inline-flex items-center gap-0.5">
                            <Minus className="w-3 h-3" />
                            0
                          </span>
                        )
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Badge Trạng thái Bám sát */}
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        s.statusTag === "PROGRESS_HIGH"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : s.statusTag === "PROGRESS"
                          ? "bg-teal-100 text-teal-800 border border-teal-200"
                          : s.statusTag === "STABLE"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : s.statusTag === "SLIGHT_DROP"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : s.statusTag === "REGRESS"
                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                          : s.statusTag === "URGENT_INTERVENTION"
                          ? "bg-red-600 text-white font-black animate-pulse"
                          : s.statusTag === "AT_RISK"
                          ? "bg-amber-100 text-amber-800 border border-amber-300 font-bold"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {s.statusTag === "PROGRESS_HIGH" && <Sparkles className="w-3 h-3" />}
                        {s.statusTag === "URGENT_INTERVENTION" && <AlertTriangle className="w-3 h-3" />}
                        {s.statusLabel}
                      </span>
                    </td>

                    {/* Lịch sử điểm qua các kỳ */}
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1 font-mono text-[10px]">
                        {EVAL_PERIODS.map(p => {
                          const sc = s.periodHistory?.[p.code]
                          return (
                            <span
                              key={p.code}
                              title={`${p.name}: ${sc !== null ? sc : "Chưa có"}`}
                              className={`w-6 py-0.5 rounded text-center font-bold ${
                                sc !== null && sc !== undefined
                                  ? sc < 5.0
                                    ? "bg-rose-100 text-rose-700"
                                    : sc < 6.5
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-teal-50 text-teal-800"
                                  : "bg-slate-100 text-slate-300"
                              }`}
                            >
                              {sc !== null && sc !== undefined ? sc : "-"}
                            </span>
                          )
                        })}
                      </div>
                    </td>

                    {/* Nhận xét / Ghi chú */}
                    <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[180px] truncate" title={s.remark}>
                      {s.remark || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
