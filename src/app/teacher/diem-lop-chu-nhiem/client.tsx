"use client"

import { useState, useEffect, useMemo } from "react"
import {
  FileSpreadsheet,
  BarChart3,
  Users,
  Award,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Target,
  ShieldAlert,
  Info,
  Layers,
  ChevronRight,
  Printer
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from "recharts"
import * as XLSX from "xlsx"
import { StudentSurveyReportModal } from "./components/StudentSurveyReportModal"

const EVAL_PERIODS = [
  { code: "KSĐN", label: "Khảo sát đầu năm (KSĐN)", short: "KSĐN" },
  { code: "GK1", label: "Giữa kỳ 1 (GK1)", short: "GK1" },
  { code: "CK1", label: "Cuối kỳ 1 (CK1)", short: "CK1" },
  { code: "GK2", label: "Giữa kỳ 2 (GK2)", short: "GK2" },
  { code: "CK2", label: "Cuối kỳ 2 (CK2)", short: "CK2" }
]

interface Props {
  academicYears: any[]
  activeYearId: string
  homeroomClasses: any[]
  teacherName: string
}

export function HomeroomGradesClient({
  academicYears,
  activeYearId,
  homeroomClasses,
  teacherName
}: Props) {
  // Filters
  const [selectedYearId, setSelectedYearId] = useState(activeYearId)
  const [selectedClassId, setSelectedClassId] = useState<string>(homeroomClasses[0]?.id || "")
  const [selectedPeriod, setSelectedPeriod] = useState<string>("KSĐN")
  const [selectedScope, setSelectedScope] = useState<string>("campus") // "campus" | "all"
  const [activeTab, setActiveTab] = useState<"matrix" | "comparative" | "tracking">("matrix")
  const [searchTerm, setSearchTerm] = useState("")
  const [trackingFilter, setTrackingFilter] = useState<string>("ALL") // "ALL" | "BELOW_AVG" | "BELOW_BENCHMARK" | "ENTRANCE_COMMITMENT" | "LEARNING_COMMITMENT"

  // Data states
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  // Modal detail
  const [selectedCellDetail, setSelectedCellDetail] = useState<{
    student: any
    subject: any
    gradeInfo: any
  } | null>(null)

  // Student Report Modal state
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportSelectedStudentId, setReportSelectedStudentId] = useState<string>("")

  const handleOpenReport = (studentId?: string) => {
    if (studentId) {
      setReportSelectedStudentId(studentId)
    } else if (filteredStudents.length > 0) {
      setReportSelectedStudentId(filteredStudents[0].studentId)
    }
    setReportModalOpen(true)
  }

  // Fetch homeroom grades data
  const fetchData = async () => {
    if (!selectedClassId) return
    try {
      setLoading(true)
      const res = await fetch(
        `/api/teacher/homeroom-grades?classId=${selectedClassId}&academicYearId=${selectedYearId}&evaluationPeriod=${selectedPeriod}&scope=${selectedScope}`
      )
      const json = await res.json()
      if (json.success) {
        setData(json)
      } else {
        alert("Lỗi tải dữ liệu: " + (json.error || "Không thể tải điểm"))
      }
    } catch (err: any) {
      console.error("Lỗi fetch homeroom grades:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedClassId, selectedYearId, selectedPeriod, selectedScope])

  // Current selected class object
  const currentClass = useMemo(() => {
    return homeroomClasses.find(c => c.id === selectedClassId) || homeroomClasses[0] || null
  }, [homeroomClasses, selectedClassId])

  // Filtered student matrix by search
  const filteredStudents = useMemo(() => {
    if (!data?.studentMatrix) return []
    if (!searchTerm.trim()) return data.studentMatrix
    const lower = searchTerm.toLowerCase().trim()
    return data.studentMatrix.filter((s: any) =>
      (s.studentName || "").toLowerCase().includes(lower) ||
      (s.studentCode || "").toLowerCase().includes(lower)
    )
  }, [data?.studentMatrix, searchTerm])

  // Filtered tracking students
  const filteredTracking = useMemo(() => {
    if (!data?.trackingStudents) return []
    let list = data.trackingStudents
    if (trackingFilter === "BELOW_AVG") {
      list = list.filter((s: any) => s.belowAverageCount > 0)
    } else if (trackingFilter === "BELOW_BENCHMARK") {
      list = list.filter((s: any) => s.belowBenchmarkCount > 0)
    } else if (trackingFilter === "ENTRANCE_COMMITMENT") {
      list = list.filter((s: any) => s.isEntranceCommitted)
    } else if (trackingFilter === "LEARNING_COMMITMENT") {
      list = list.filter((s: any) => s.learningCommitments.length > 0)
    }

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase().trim()
      list = list.filter((s: any) =>
        (s.studentName || "").toLowerCase().includes(lower) ||
        (s.studentCode || "").toLowerCase().includes(lower)
      )
    }
    return list
  }, [data?.trackingStudents, trackingFilter, searchTerm])

  // Chart data for comparative analytics
  const chartData = useMemo(() => {
    if (!data?.subjectComparisons) return []
    return data.subjectComparisons.map((sc: any) => ({
      name: sc.subjectName,
      code: sc.subjectCode,
      classAvg: sc.classAvg,
      gradeAvg: sc.gradeAvg,
      classPctPassed: sc.classPctPassed,
      gradePctPassed: sc.gradePctPassed,
      benchmark: sc.benchmark
    }))
  }, [data?.subjectComparisons])

  // Overall Class GPA
  const overallClassGpa = useMemo(() => {
    if (!data?.studentMatrix || data.studentMatrix.length === 0) return 0
    const gpas = data.studentMatrix.map((s: any) => s.gpa).filter((g: any) => g !== null && !isNaN(g))
    if (gpas.length === 0) return 0
    return Math.round((gpas.reduce((a: number, b: number) => a + b, 0) / gpas.length) * 10) / 10
  }, [data?.studentMatrix])

  // Highlights
  const highlights = useMemo(() => {
    if (!data?.subjectComparisons || data.subjectComparisons.length === 0) return null
    const valid = [...data.subjectComparisons].filter(s => s.gradedCount > 0)
    if (valid.length === 0) return null

    const bestDiff = [...valid].sort((a, b) => b.diffAvg - a.diffAvg)[0]
    const lowestDiff = [...valid].sort((a, b) => a.diffAvg - b.diffAvg)[0]

    return { bestDiff, lowestDiff }
  }, [data?.subjectComparisons])

  // Helper score color
  const getScoreBadge = (score: number | null, benchmark: number) => {
    if (score === null || score === undefined) {
      return <span className="text-slate-300 font-semibold">-</span>
    }
    let bg = "bg-slate-100 text-slate-700"
    let border = "border-slate-200"

    if (score >= 8.0) {
      bg = "bg-emerald-50 text-emerald-700 font-black"
      border = "border-emerald-200"
    } else if (score >= 6.5) {
      bg = "bg-sky-50 text-sky-700 font-black"
      border = "border-sky-200"
    } else if (score >= 5.0) {
      bg = "bg-amber-50 text-amber-700 font-bold"
      border = "border-amber-200"
    } else {
      bg = "bg-rose-50 text-rose-700 font-black"
      border = "border-rose-300"
    }

    const isBelowBm = score < benchmark

    return (
      <span
        className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-lg text-xs border ${bg} ${border} shadow-2xs transition-transform hover:scale-105`}
      >
        <span>{score.toFixed(1)}</span>
        {isBelowBm && (
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title={`Dưới chuẩn (${benchmark}đ)`} />
        )}
      </span>
    )
  }

  // Export Matrix Excel
  const handleExportMatrixExcel = () => {
    if (!data || !data.studentMatrix || !data.subjects) return
    const rows = data.studentMatrix.map((st: any, idx: number) => {
      const row: any = {
        "STT": idx + 1,
        "Mã HS": st.studentCode,
        "Họ và tên": st.studentName,
        "Giới tính": st.gender === "female" ? "Nữ" : "Nam",
        "Ngày sinh": st.dateOfBirth ? new Date(st.dateOfBirth).toLocaleDateString("vi-VN") : ""
      }

      data.subjects.forEach((sub: any) => {
        const info = st.subjectGrades[sub.id]
        row[sub.name] = info?.score !== null && info?.score !== undefined ? info.score : ""
      })

      row["Điểm TB Chung"] = st.gpa || ""
      row["Môn < TB (<5)"] = st.belowAverageCount
      row["Môn < Chuẩn"] = st.belowBenchmarkCount
      row["Cam kết đầu vào"] = st.isEntranceCommitted ? "Có" : "Không"
      row["Cam kết học tập"] = st.learningCommitments.length > 0 ? `${st.learningCommitments.length} môn` : "Không"

      return row
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "BangDiemTongHop")
    XLSX.writeFile(wb, `BangDiem_${currentClass?.className || "Lop"}_Ky_${selectedPeriod}.xlsx`)
  }

  // Export Comparative Excel
  const handleExportComparativeExcel = () => {
    if (!data || !data.subjectComparisons) return
    const rows = data.subjectComparisons.map((sc: any, idx: number) => ({
      "STT": idx + 1,
      "Môn học": sc.subjectName,
      "Giáo viên giảng dạy": sc.teacherName,
      "Điểm chuẩn": sc.benchmark,
      "Sỹ số đã có điểm": sc.gradedCount,
      "ĐTB Lớp": sc.classAvg,
      "ĐTB Khối": sc.gradeAvg,
      "Chênh lệch ĐTB (Lớp - Khối)": sc.diffAvg,
      "Tỷ lệ Đạt chuẩn Lớp (%)": sc.classPctPassed,
      "Tỷ lệ Đạt chuẩn Khối (%)": sc.gradePctPassed,
      "Chênh lệch Đạt chuẩn (%)": sc.diffPctPassed,
      "HS 0 - <5 đ (%)": `${sc.classCount_0_5} (${sc.pct_0_5}%)`,
      "HS 5 - <6.5 đ (%)": `${sc.classCount_5_65} (${sc.pct_5_65}%)`,
      "HS 6.5 - <8 đ (%)": `${sc.classCount_65_8} (${sc.pct_65_8}%)`,
      "HS 8 - 10 đ (%)": `${sc.classCount_8_10} (${sc.pct_8_10}%)`
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "DoiSanhMatBangKhoi")
    XLSX.writeFile(wb, `DoiSanhKhoi_${currentClass?.className || "Lop"}_Ky_${selectedPeriod}.xlsx`)
  }

  if (homeroomClasses.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-8 rounded-2xl text-center space-y-3 my-6">
        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-extrabold text-amber-900 uppercase">Chưa ghi nhận phân công Giáo viên Chủ nhiệm</h3>
        <p className="text-xs text-amber-800 max-w-md mx-auto">
          Tài khoản hiện tại chưa được gán làm Giáo viên Chủ nhiệm cho lớp học nào trong năm học này. Vui lòng liên hệ BGH hoặc Ban Đào tạo để cập nhật.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#48BFE3] rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-teal-200 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              Công tác Giáo viên Chủ nhiệm (GVCN)
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
              <span>Sổ điểm Lớp chủ nhiệm & Đối sánh Khối</span>
            </h1>
            <p className="text-teal-100 text-xs md:text-sm mt-1 max-w-3xl leading-relaxed">
              Theo dõi toàn diện kết quả học tập các môn của lớp <strong className="text-amber-300 font-extrabold">{currentClass?.className}</strong> ({currentClass?.campus?.name || "Cơ sở"}) và đối soát chất lượng với mặt bằng chung theo khối.
            </p>
          </div>

          {/* Quick Actions & Year */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="bg-white/15 border border-white/20 text-white rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-300"
            >
              {academicYears.map(y => (
                <option key={y.id} value={y.id} className="text-slate-800">
                  Năm học: {y.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 bg-black/20 p-4 rounded-xl backdrop-blur-md border border-white/10 text-xs">
          {/* Homeroom Class selector */}
          <div>
            <label className="block text-[11px] font-bold text-teal-200 mb-1">Lớp chủ nhiệm:</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-white text-slate-800 font-extrabold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-300 outline-none"
            >
              {homeroomClasses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.className} - {c.campus?.name || "Cơ sở"} ({c._count?.students || 0} HS)
                </option>
              ))}
            </select>
          </div>

          {/* Evaluation Period selector */}
          <div>
            <label className="block text-[11px] font-bold text-teal-200 mb-1">Kỳ khảo sát / Đánh giá:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full bg-white text-slate-800 font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-300 outline-none"
            >
              {EVAL_PERIODS.map(p => (
                <option key={p.code} value={p.code}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Comparative Scope */}
          <div>
            <label className="block text-[11px] font-bold text-teal-200 mb-1">Phạm vi đối sánh Khối:</label>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="w-full bg-white text-slate-800 font-bold rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-300 outline-none"
            >
              <option value="campus">Khối cùng Cơ sở ({currentClass?.campus?.name || "Cơ sở"})</option>
              <option value="all">Toàn bộ Khối trong Hệ thống (Toàn trường)</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-[11px] font-bold text-teal-200 mb-1">Tìm học sinh:</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tên hoặc mã học sinh..."
                className="w-full bg-white text-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-teal-300 outline-none"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sỹ số lớp</div>
          <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-1.5">
            <span>{data?.summary?.totalStudents || 0}</span>
            <span className="text-xs font-semibold text-slate-500">học sinh</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Users className="w-3 h-3 text-teal-500" />
            <span>Lớp {currentClass?.className}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Điểm TB Chung lớp</div>
          <div className="text-2xl font-black text-[#0284C7] mt-1 flex items-baseline gap-1.5">
            <span>{overallClassGpa > 0 ? overallClassGpa.toFixed(1) : "-"}</span>
            <span className="text-xs font-semibold text-slate-500">/ 10</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Award className="w-3 h-3 text-sky-500" />
            <span>Tổng hợp {data?.summary?.totalSubjects || 0} môn</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Đối sánh lớp trong Khối</div>
          <div className="text-2xl font-black text-purple-700 mt-1 flex items-baseline gap-1.5">
            <span>{data?.siblingClassesCount || 0}</span>
            <span className="text-xs font-semibold text-slate-500">lớp cùng khối</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-purple-500" />
            <span>{selectedScope === "campus" ? "Cùng cơ sở" : "Toàn trường"}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">HS Cần quan tâm</div>
          <div className="text-2xl font-black text-rose-600 mt-1 flex items-baseline gap-1.5">
            <span>{data?.summary?.trackingStudentsCount || 0}</span>
            <span className="text-xs font-semibold text-slate-500">HS</span>
          </div>
          <div className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Có môn &lt; TB hoặc &lt; Chuẩn</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">HS Diện Cam kết</div>
          <div className="text-2xl font-black text-amber-600 mt-1 flex items-baseline gap-1.5">
            <span>{(data?.summary?.entranceCommittedCount || 0) + (data?.summary?.learningCommittedCount || 0)}</span>
            <span className="text-xs font-semibold text-slate-500">HS</span>
          </div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
            <Target className="w-3 h-3 text-amber-500" />
            <span>Đầu vào ({data?.summary?.entranceCommittedCount || 0}) / Học tập ({data?.summary?.learningCommittedCount || 0})</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
              activeTab === "matrix"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-600" />
            <span>Bảng Điểm Tổng Hợp Các Môn</span>
            <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded-full text-[10px]">
              {data?.subjects?.length || 0} môn
            </span>
          </button>

          <button
            onClick={() => setActiveTab("comparative")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
              activeTab === "comparative"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-purple-600" />
            <span>Thống Kê Chất Lượng & Đối Sánh Khối</span>
          </button>

          <button
            onClick={() => setActiveTab("tracking")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
              activeTab === "tracking"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>HS Cần Đồng Hành & Diện Cam Kết</span>
            {(data?.summary?.trackingStudentsCount || 0) > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded-full text-[10px] font-black">
                {data?.summary?.trackingStudentsCount}
              </span>
            )}
          </button>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "matrix" && (
            <>
              <button
                onClick={() => handleOpenReport()}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-50 text-teal-700 border border-teal-300 hover:bg-teal-100 rounded-xl text-xs font-black transition-all w-full sm:w-auto shadow-2xs cursor-pointer"
                title="Xem và in bảng điểm chi tiết theo từng học sinh hoặc toàn bộ lớp"
              >
                <Printer className="w-3.5 h-3.5 text-teal-600" />
                <span>Xuất Báo Cáo Học Sinh (In / PDF)</span>
              </button>

              <button
                onClick={handleExportMatrixExcel}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all w-full sm:w-auto cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel Bảng Điểm</span>
              </button>
            </>
          )}

          {activeTab === "comparative" && (
            <button
              onClick={handleExportComparativeExcel}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 rounded-xl text-xs font-bold transition-all w-full sm:w-auto"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất Báo Cáo Đối Sánh Khối
            </button>
          )}
        </div>
      </div>

      {/* TAB CONTENT */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Đang tải và tổng hợp dữ liệu bảng điểm lớp chủ nhiệm...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: BẢNG ĐIỂM TỔNG HỢP CÁC MÔN */}
          {activeTab === "matrix" && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-bold text-slate-700">Chú thích dải điểm:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-slate-600 font-semibold">Giỏi (8 - 10)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-sky-500" />
                    <span className="text-slate-600 font-semibold">Khá (6.5 - &lt;8)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-slate-600 font-semibold">TB (5 - &lt;6.5)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-slate-600 font-semibold">Yếu (&lt; 5)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-300" />
                    <span className="text-slate-600 font-semibold">Dấu chấm đỏ: Dưới chuẩn môn</span>
                  </div>
                </div>

                <div className="text-slate-500 text-[11px] font-medium italic">
                  * Nhấp chuột vào điểm của môn để xem chi tiết nhận xét & điểm thành phần từ GVBM.
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-[650px] custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 z-20 bg-slate-800 text-white font-bold shadow-xs">
                      <tr>
                        <th className="py-3 px-3 w-12 text-center border-r border-slate-700">STT</th>
                        <th className="py-3 px-3 w-28 border-r border-slate-700">Mã HS</th>
                        <th className="py-3 px-3 min-w-[170px] border-r border-slate-700">Họ và tên</th>
                        <th className="py-3 px-3 w-20 text-center border-r border-slate-700">Ngày sinh</th>

                        {data?.subjects?.map((sub: any) => {
                          const sc = data?.subjectComparisons?.find((c: any) => c.subjectId === sub.id)
                          return (
                            <th
                              key={sub.id}
                              className="py-2.5 px-3 text-center border-r border-slate-700 bg-slate-700/70 min-w-[100px]"
                            >
                              <div className="font-extrabold truncate max-w-[110px]" title={sub.name}>
                                {sub.name}
                              </div>
                              <div className="text-[10px] font-normal text-teal-300">
                                Chuẩn: {sc?.benchmark || 6.0}đ
                              </div>
                            </th>
                          )
                        })}

                        <th className="py-3 px-3 text-center border-r border-slate-700 bg-teal-800 min-w-[90px]">
                          ĐTB Lớp
                        </th>
                        <th className="py-3 px-3 text-center border-r border-slate-700 bg-rose-950 min-w-[90px]">
                          Số môn &lt; TB
                        </th>
                        <th className="py-3 px-3 text-center border-r border-slate-700 bg-amber-950 min-w-[95px]">
                          Số môn &lt; Chuẩn
                        </th>
                        <th className="py-3 px-3 min-w-[140px] bg-slate-900 border-r border-slate-700">
                          Diện theo dõi / Cam kết
                        </th>
                        <th className="py-3 px-3 text-center bg-teal-900 min-w-[110px] sticky right-0 z-20 shadow-md">
                          Phiếu điểm
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={(data?.subjects?.length || 0) + 9} className="py-12 text-center text-slate-400 font-semibold">
                            Không tìm thấy học sinh nào phù hợp
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((st: any, idx: number) => {
                          return (
                            <tr key={st.studentId} className="hover:bg-teal-50/40 transition-colors">
                              <td className="py-2.5 px-3 text-center font-bold text-slate-500 border-r border-slate-200">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-700 border-r border-slate-200">
                                {st.studentCode}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                                <div className="flex items-center justify-between gap-2">
                                  <span>{st.studentName}</span>
                                  <a
                                    href={`/teacher/co-van-hoc-tap?classId=${selectedClassId}&studentId=${st.studentId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-1.5 py-0.5 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-[10px] font-black inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                                    title="Xem đối sánh mục tiêu & cố vấn học tập"
                                  >
                                    <Target className="w-3 h-3 text-teal-600" />
                                    <span>Mục tiêu</span>
                                  </a>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-600 border-r border-slate-200 whitespace-nowrap text-[11px]">
                                {st.dateOfBirth ? new Date(st.dateOfBirth).toLocaleDateString("vi-VN") : "-"}
                              </td>

                              {/* Subject scores */}
                              {data?.subjects?.map((sub: any) => {
                                const info = st.subjectGrades[sub.id]
                                return (
                                  <td
                                    key={sub.id}
                                    onClick={() => setSelectedCellDetail({ student: st, subject: sub, gradeInfo: info })}
                                    className="py-2 px-2 text-center border-r border-slate-200 cursor-pointer hover:bg-teal-100/50 transition-colors"
                                    title="Bấm để xem chi tiết nhận xét của GVBM"
                                  >
                                    {getScoreBadge(info?.score, info?.benchmark || 6.0)}
                                  </td>
                                )
                              })}

                              {/* GPA */}
                              <td className="py-2.5 px-3 text-center font-black text-sm text-[#0284C7] bg-teal-50/30 border-r border-slate-200">
                                {st.gpa !== null ? st.gpa.toFixed(1) : "-"}
                              </td>

                              {/* Below Avg count */}
                              <td className="py-2.5 px-3 text-center font-bold border-r border-slate-200">
                                {st.belowAverageCount > 0 ? (
                                  <span className="inline-block px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-extrabold text-xs">
                                    {st.belowAverageCount}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>

                              {/* Below Benchmark count */}
                              <td className="py-2.5 px-3 text-center font-bold border-r border-slate-200">
                                {st.belowBenchmarkCount > 0 ? (
                                  <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs">
                                    {st.belowBenchmarkCount}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>

                              {/* Commitment badges */}
                              <td className="py-2.5 px-3 space-y-1">
                                {st.isEntranceCommitted && (
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px]">
                                    <Target className="w-2.5 h-2.5" />
                                    <span>Cam kết đầu vào</span>
                                  </div>
                                )}
                                {st.learningCommitments.length > 0 && (
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] ml-1">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    <span>{st.learningCommitments.length} cam kết HT</span>
                                  </div>
                                )}
                                {!st.isEntranceCommitted && st.learningCommitments.length === 0 && (
                                  <span className="text-slate-300 text-[11px]">-</span>
                                )}
                              </td>

                              {/* Student Report Card Trigger */}
                              <td className="py-2.5 px-2 text-center border-l border-slate-200 sticky right-0 z-10 bg-white/95 shadow-xs">
                                <button
                                  onClick={() => handleOpenReport(st.studentId)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 hover:border-teal-300 transition-all shadow-2xs cursor-pointer"
                                  title={`Xem và in phiếu điểm của học sinh ${st.studentName}`}
                                >
                                  <Printer className="w-3.5 h-3.5 text-teal-600" />
                                  <span>Phiếu điểm</span>
                                </button>
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

          {/* TAB 2: THỐNG KÊ CHẤT LƯỢNG & ĐỐI SÁNH KHỐI */}
          {activeTab === "comparative" && (
            <div className="space-y-6">
              {/* Highlight Cards */}
              {highlights && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-emerald-50/80 border-2 border-emerald-200 p-4 rounded-2xl flex items-start gap-3.5 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wide">
                        Môn Có Kết Quả Vượt Trội Nhất So Với Khối
                      </div>
                      <div className="text-base font-black text-emerald-950 mt-0.5">
                        {highlights.bestDiff.subjectName} ({highlights.bestDiff.classAvg.toFixed(1)}đ so với Khối {highlights.bestDiff.gradeAvg.toFixed(1)}đ)
                      </div>
                      <div className="text-xs text-emerald-800 mt-1 font-medium">
                        Điểm TB lớp cao hơn khối <strong className="text-emerald-900 font-bold">+{highlights.bestDiff.diffAvg.toFixed(1)}đ</strong> • Tỷ lệ đạt chuẩn {highlights.bestDiff.classPctPassed}% (Khối {highlights.bestDiff.gradePctPassed}%)
                      </div>
                    </div>
                  </div>

                  <div className="bg-rose-50/80 border-2 border-rose-200 p-4 rounded-2xl flex items-start gap-3.5 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-extrabold text-rose-800 uppercase tracking-wide">
                        Môn Cần Chú Trọng Bồi Dưỡng & Can Thiệp
                      </div>
                      <div className="text-base font-black text-rose-950 mt-0.5">
                        {highlights.lowestDiff.subjectName} ({highlights.lowestDiff.classAvg.toFixed(1)}đ so với Khối {highlights.lowestDiff.gradeAvg.toFixed(1)}đ)
                      </div>
                      <div className="text-xs text-rose-800 mt-1 font-medium">
                        {highlights.lowestDiff.diffAvg < 0 ? (
                          <>Điểm TB lớp đang thấp hơn khối <strong className="text-rose-900 font-bold">{highlights.lowestDiff.diffAvg.toFixed(1)}đ</strong> • </>
                        ) : (
                          <>Điểm TB lớp tương đương khối • </>
                        )}
                        Tỷ lệ dưới chuẩn còn {100 - highlights.lowestDiff.classPctPassed}% ({highlights.lowestDiff.classCountBelow} HS).
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Chart Section */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-teal-600" />
                      Biểu đồ Đối sánh Điểm Trung Bình Từng Môn: Lớp {currentClass?.className} vs Mặt Bằng Khối
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Trục tung: Điểm số thang 10. Cột xanh (Lớp chủ nhiệm) song song Cột xám (Điểm trung bình toàn Khối).
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-md bg-[#008c82]" />
                      <span className="text-slate-800">Lớp {currentClass?.className}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-md bg-slate-400" />
                      <span className="text-slate-600">Khối ({data?.siblingClassesCount || 0} lớp)</span>
                    </div>
                  </div>
                </div>

                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fontWeight: 600, fill: "#475569" }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 11, fill: "#64748b" }} />
                      <RechartsTooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload || !payload.length) return null
                          const item = payload[0]?.payload
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700">
                              <div className="font-extrabold text-teal-300 text-sm border-b border-slate-700 pb-1">
                                {label}
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-300">ĐTB Lớp {currentClass?.className}:</span>
                                <span className="font-black text-teal-300">{item?.classAvg?.toFixed(1)}đ</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-300">ĐTB Khối:</span>
                                <span className="font-bold text-slate-300">{item?.gradeAvg?.toFixed(1)}đ</span>
                              </div>
                              <div className="flex justify-between gap-4 border-t border-slate-700 pt-1">
                                <span className="text-slate-300">Chênh lệch:</span>
                                <span className={`font-black ${item?.classAvg >= item?.gradeAvg ? "text-emerald-400" : "text-rose-400"}`}>
                                  {item?.classAvg >= item?.gradeAvg ? "+" : ""}{(item?.classAvg - item?.gradeAvg).toFixed(1)}đ
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-300">Tỷ lệ đạt chuẩn:</span>
                                <span className="font-bold text-teal-200">{item?.classPctPassed}% (Khối: {item?.gradePctPassed}%)</span>
                              </div>
                            </div>
                          )
                        }}
                      />
                      <Bar dataKey="classAvg" name="Lớp chủ nhiệm" fill="#008c82" radius={[6, 6, 0, 0]} maxBarSize={45} />
                      <Bar dataKey="gradeAvg" name="Mặt bằng Khối" fill="#94a3b8" radius={[6, 6, 0, 0]} maxBarSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Comparative Matrix Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Bảng Thống Kê Phổ Điểm & Đối Sánh Chi Tiết Từng Môn
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    Đối sánh với {data?.siblingClassesCount || 0} lớp cùng khối trong {selectedScope === "campus" ? "Cơ sở" : "Toàn trường"}
                  </span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold">
                        <th className="py-3 px-3 w-12 text-center border-r border-slate-700">STT</th>
                        <th className="py-3 px-3 min-w-[140px] border-r border-slate-700">Môn học</th>
                        <th className="py-3 px-3 min-w-[150px] border-r border-slate-700">GV Giảng dạy</th>
                        <th className="py-3 px-3 w-20 text-center border-r border-slate-700">Chuẩn</th>
                        <th className="py-3 px-3 text-center border-r border-slate-700 bg-teal-800 w-24">ĐTB Lớp</th>
                        <th className="py-3 px-3 text-center border-r border-slate-700 bg-slate-700 w-24">ĐTB Khối</th>
                        <th className="py-3 px-3 text-center border-r border-slate-700 bg-slate-900 w-24">Chênh lệch</th>
                        <th className="py-3 px-3 text-center border-r border-slate-700 min-w-[110px]">Đạt chuẩn Lớp</th>
                        <th className="py-3 px-3 text-center border-r border-slate-700 min-w-[110px]">Đạt chuẩn Khối</th>
                        <th className="py-3 px-3 text-center border-r border-slate-700 min-w-[100px] bg-rose-950/70">0 - &lt;5đ</th>
                        <th className="py-3 px-3 text-center border-r border-slate-700 min-w-[100px] bg-amber-950/70">5 - &lt;6.5đ</th>
                        <th className="py-3 px-3 text-center border-r border-slate-700 min-w-[100px] bg-sky-950/70">6.5 - &lt;8đ</th>
                        <th className="py-3 px-3 text-center min-w-[100px] bg-emerald-950/70">8 - 10đ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {data?.subjectComparisons?.map((sc: any, idx: number) => {
                        const isHigher = sc.diffAvg >= 0
                        return (
                          <tr key={sc.subjectId} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-500 border-r border-slate-200">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-extrabold text-slate-900 border-r border-slate-200">
                              {sc.subjectName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 font-semibold border-r border-slate-200">
                              {sc.teacherName}
                            </td>
                            <td className="py-2.5 px-3 text-center font-black text-amber-700 bg-amber-50/50 border-r border-slate-200">
                              {sc.benchmark}đ
                            </td>
                            <td className="py-2.5 px-3 text-center font-black text-sm text-[#008c82] bg-teal-50/30 border-r border-slate-200">
                              {sc.classAvg > 0 ? sc.classAvg.toFixed(1) : "-"}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-600 bg-slate-50 border-r border-slate-200">
                              {sc.gradeAvg > 0 ? sc.gradeAvg.toFixed(1) : "-"}
                            </td>
                            <td className="py-2.5 px-3 text-center border-r border-slate-200">
                              <span className={`inline-flex items-center gap-0.5 font-black text-xs px-2 py-0.5 rounded-md ${
                                isHigher ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                              }`}>
                                {isHigher ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                {isHigher ? "+" : ""}{sc.diffAvg.toFixed(1)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center border-r border-slate-200 font-bold">
                              <span className="text-slate-900">{sc.classCountPassed} HS</span>
                              <span className="text-teal-700 text-[11px] block font-extrabold">({sc.classPctPassed}%)</span>
                            </td>
                            <td className="py-2.5 px-3 text-center border-r border-slate-200 font-bold text-slate-600">
                              <span className="text-slate-600">{sc.gradePctPassed}%</span>
                              <span className={`text-[11px] block font-extrabold ${sc.diffPctPassed >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {sc.diffPctPassed >= 0 ? "+" : ""}{sc.diffPctPassed.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center border-r border-slate-200 font-semibold text-rose-700 bg-rose-50/20">
                              {sc.classCount_0_5} <span className="text-[11px] font-normal text-rose-500">({sc.pct_0_5}%)</span>
                            </td>
                            <td className="py-2.5 px-3 text-center border-r border-slate-200 font-semibold text-amber-800 bg-amber-50/20">
                              {sc.classCount_5_65} <span className="text-[11px] font-normal text-amber-600">({sc.pct_5_65}%)</span>
                            </td>
                            <td className="py-2.5 px-3 text-center border-r border-slate-200 font-semibold text-sky-800 bg-sky-50/20">
                              {sc.classCount_65_8} <span className="text-[11px] font-normal text-sky-600">({sc.pct_65_8}%)</span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-emerald-800 bg-emerald-50/20">
                              {sc.classCount_8_10} <span className="text-[11px] font-normal text-emerald-600">({sc.pct_8_10}%)</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HỌC SINH CẦN ĐỒNG HÀNH & DIỆN CAM KẾT */}
          {activeTab === "tracking" && (
            <div className="space-y-4">
              {/* Filter sub-buttons */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-600 mr-1">Bộ lọc danh sách:</span>
                  <button
                    onClick={() => setTrackingFilter("ALL")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                      trackingFilter === "ALL"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Tất cả diện theo dõi ({data?.trackingStudents?.length || 0})
                  </button>

                  <button
                    onClick={() => setTrackingFilter("BELOW_AVG")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                      trackingFilter === "BELOW_AVG"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                    }`}
                  >
                    Có môn &lt; TB ({data?.trackingStudents?.filter((s: any) => s.belowAverageCount > 0).length || 0})
                  </button>

                  <button
                    onClick={() => setTrackingFilter("BELOW_BENCHMARK")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                      trackingFilter === "BELOW_BENCHMARK"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    Có môn &lt; Chuẩn ({data?.trackingStudents?.filter((s: any) => s.belowBenchmarkCount > 0).length || 0})
                  </button>

                  <button
                    onClick={() => setTrackingFilter("ENTRANCE_COMMITMENT")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                      trackingFilter === "ENTRANCE_COMMITMENT"
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100"
                    }`}
                  >
                    Cam kết đầu vào ({data?.summary?.entranceCommittedCount || 0})
                  </button>

                  <button
                    onClick={() => setTrackingFilter("LEARNING_COMMITMENT")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                      trackingFilter === "LEARNING_COMMITMENT"
                        ? "bg-teal-600 text-white shadow-xs"
                        : "bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100"
                    }`}
                  >
                    Cam kết học tập ({data?.summary?.learningCommittedCount || 0})
                  </button>
                </div>

                <div className="text-xs text-slate-500 font-semibold">
                  Hiển thị <strong className="text-slate-900">{filteredTracking.length}</strong> học sinh
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold">
                        <th className="py-3 px-3 w-12 text-center border-r border-slate-700">STT</th>
                        <th className="py-3 px-3 w-28 border-r border-slate-700">Mã HS</th>
                        <th className="py-3 px-3 min-w-[160px] border-r border-slate-700">Họ và tên</th>
                        <th className="py-3 px-3 text-center border-r border-slate-700 w-24">ĐTB Chung</th>
                        <th className="py-3 px-3 min-w-[220px] border-r border-slate-700">Môn Dưới Chuẩn / Cần Chú Ý</th>
                        <th className="py-3 px-3 min-w-[200px] border-r border-slate-700 bg-purple-950">Hồ sơ Cam kết Đầu vào</th>
                        <th className="py-3 px-3 min-w-[200px] bg-teal-950">Cam kết Học tập (SLC)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredTracking.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                            Tuyệt vời! Không có học sinh nào thuộc nhóm cần theo dõi này.
                          </td>
                        </tr>
                      ) : (
                        filteredTracking.map((st: any, idx: number) => {
                          // Collect below benchmark subjects
                          const failedSubjects: any[] = []
                          data?.subjects?.forEach((sub: any) => {
                            const info = st.subjectGrades[sub.id]
                            if (info && info.score !== null && info.isBelowBenchmark) {
                              failedSubjects.push({
                                subjectName: sub.name,
                                score: info.score,
                                benchmark: info.benchmark,
                                gap: info.gap
                              })
                            }
                          })

                          return (
                            <tr key={st.studentId} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-3 text-center font-bold text-slate-500 border-r border-slate-200">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-700 border-r border-slate-200">
                                {st.studentCode}
                              </td>
                              <td className="py-3 px-3 font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <div>{st.studentName}</div>
                                    <div className="text-[11px] font-normal text-slate-500">
                                      {st.gender === "female" ? "Nữ" : "Nam"} • {st.dateOfBirth ? new Date(st.dateOfBirth).toLocaleDateString("vi-VN") : ""}
                                    </div>
                                  </div>
                                  <a
                                    href={`/teacher/co-van-hoc-tap?classId=${selectedClassId}&studentId=${st.studentId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[10px] font-black inline-flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer"
                                    title="Mở hồ sơ cố vấn học tập & đối sánh mục tiêu"
                                  >
                                    <Target className="w-3.5 h-3.5 text-teal-600" />
                                    <span>Cố vấn</span>
                                  </a>
                                </div>
                              </td>

                              <td className="py-3 px-3 text-center font-black text-sm text-[#0284C7] bg-teal-50/20 border-r border-slate-200">
                                {st.gpa !== null ? st.gpa.toFixed(1) : "-"}
                              </td>

                              {/* Failed subjects */}
                              <td className="py-3 px-3 border-r border-slate-200 space-y-1">
                                {failedSubjects.length === 0 ? (
                                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Tất cả các môn đều đạt chuẩn</span>
                                  </span>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {failedSubjects.map((fs, fIdx) => (
                                      <span
                                        key={fIdx}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs"
                                      >
                                        <span>{fs.subjectName}:</span>
                                        <span className="text-rose-900">{fs.score.toFixed(1)}đ</span>
                                        <span className="text-[10px] text-rose-500 font-normal">
                                          (thiếu {Math.abs(fs.gap).toFixed(1)}đ)
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>

                              {/* Entrance commitment */}
                              <td className="py-3 px-3 border-r border-slate-200">
                                {st.isEntranceCommitted && st.inputAssessment ? (
                                  <div className="space-y-1 bg-purple-50/60 p-2.5 rounded-xl border border-purple-200">
                                    <div className="text-[11px] font-extrabold text-purple-900 uppercase flex items-center gap-1">
                                      <Target className="w-3 h-3 text-purple-600" />
                                      <span>{st.inputAssessment.admissionCriteria || "Diện cam kết đầu vào"}</span>
                                    </div>
                                    <div className="text-[11px] text-purple-800 font-semibold">
                                      Điểm KSĐV: Toán {st.inputAssessment.mathScore ?? "-"} • Văn {st.inputAssessment.literatureScore ?? "-"} • Anh {st.inputAssessment.writtenEnglishScore ?? "-"}
                                    </div>
                                    {st.inputAssessment.directorNote && (
                                      <div className="text-[11px] text-purple-900 italic bg-white/80 p-1.5 rounded-md border border-purple-200 mt-1">
                                        <strong>Chỉ đạo BGĐ:</strong> {st.inputAssessment.directorNote}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-300 font-medium">-</span>
                                )}
                              </td>

                              {/* Learning commitments */}
                              <td className="py-3 px-3">
                                {st.learningCommitments.length > 0 ? (
                                  <div className="space-y-1">
                                    {st.learningCommitments.map((lc: any) => (
                                      <div
                                        key={lc.id}
                                        className="bg-teal-50/60 p-2 rounded-xl border border-teal-200 text-[11px]"
                                      >
                                        <div className="font-extrabold text-teal-900 flex items-center justify-between">
                                          <span>Môn {lc.subject?.subjectName || "Môn học"}</span>
                                          <span className="text-teal-700 font-bold">Mục tiêu: {lc.targetScore || "Đạt chuẩn"}đ</span>
                                        </div>
                                        {lc.commitmentNote && (
                                          <div className="text-slate-600 mt-0.5">{lc.commitmentNote}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-300 font-medium">-</span>
                                )}
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
        </>
      )}

      {/* MODAL: CHI TIẾT ĐIỂM THÀNH PHẦN & NHẬN XÉT CỦA GVBM */}
      {selectedCellDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedCellDetail(null); }}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-scaleUp my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-slate-900 to-teal-950 p-4 text-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-extrabold text-teal-400 uppercase tracking-widest block">
                  Chi Tiết Điểm Môn Học
                </span>
                <h3 className="text-base font-black">
                  {selectedCellDetail.student.studentName} ({selectedCellDetail.student.studentCode})
                </h3>
              </div>
              <button
                onClick={() => setSelectedCellDetail(null)}
                className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <div className="text-slate-500 font-semibold">Môn học:</div>
                  <div className="text-sm font-black text-slate-900">{selectedCellDetail.subject.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-500 font-semibold">Điểm tổng kết môn:</div>
                  <div className="text-xl font-black text-[#0284C7]">
                    {selectedCellDetail.gradeInfo?.score !== null && selectedCellDetail.gradeInfo?.score !== undefined
                      ? Number(selectedCellDetail.gradeInfo.score).toFixed(1)
                      : "Chưa có"}
                  </div>
                </div>
              </div>

              {/* Status vs Benchmark */}
              <div className="flex items-center justify-between px-3 py-2 bg-teal-50/60 rounded-xl border border-teal-200">
                <span className="font-bold text-teal-900">Chuẩn môn học:</span>
                <span className="font-black text-teal-950">{selectedCellDetail.gradeInfo?.benchmark || 6.0}đ</span>
              </div>

              {/* Component scores breakdown */}
              {selectedCellDetail.gradeInfo?.componentScores && Object.keys(selectedCellDetail.gradeInfo.componentScores).length > 0 ? (
                <div>
                  <div className="font-extrabold text-slate-800 mb-2">Điểm thành phần:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(selectedCellDetail.gradeInfo.componentScores).map(([k, v]: any) => (
                      <div key={k} className="bg-slate-100 p-2.5 rounded-xl text-center border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">{k}</div>
                        <div className="text-sm font-black text-slate-900 mt-0.5">{String(v) || "-"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 italic text-center py-2">
                  Chưa có chi tiết điểm thành phần
                </div>
              )}

              {/* Remark */}
              <div>
                <div className="font-extrabold text-slate-800 mb-1">Nhận xét của Giáo viên Bộ môn:</div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 leading-relaxed font-medium min-h-[50px]">
                  {selectedCellDetail.gradeInfo?.remark || (
                    <span className="text-slate-400 italic">Chưa có nhận xét từ GVBM</span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedCellDetail(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BÁO CÁO KẾT QUẢ KHẢO SÁT THEO HỌC SINH */}
      <StudentSurveyReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        initialStudentId={reportSelectedStudentId}
        students={filteredStudents}
        subjects={data?.subjects || []}
        currentClass={currentClass}
        teacherName={data?.classInfo?.homeroomTeacherName || teacherName}
        academicYearName={data?.classInfo?.academicYearName || academicYears.find(y => y.id === selectedYearId)?.name || ""}
        selectedPeriod={selectedPeriod}
        periodLabel={EVAL_PERIODS.find(p => p.code === selectedPeriod)?.label || selectedPeriod}
      />
    </div>
  )
}
