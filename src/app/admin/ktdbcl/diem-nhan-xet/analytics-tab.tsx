// @ts-nocheck
"use client"

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
import { isGradeMatching } from "./grade-utils"

interface Props {
  academicYears: any[]
  selectedYearId: string
  classes: any[]
  subjects: any[]
  savedConfigs?: any[]
  onNavigateToGradebook?: (params: any) => void
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

export function GradeAnalyticsTab({
  academicYears,
  selectedYearId,
  classes = [],
  subjects = [],
  savedConfigs = [],
  onNavigateToGradebook
}: Props) {
  // Sub-view navigation state: "teachers" (View 1) | "tracking" (View 2) | "charts" (View 3)
  const [activeSubView, setActiveSubView] = useState<"teachers" | "tracking" | "charts">("teachers")

  // Filter states
  const [selectedLevelFilter, setSelectedLevelFilter] = useState("ALL")
  const [selectedGradeFilter, setSelectedGradeFilter] = useState("ALL")
  const [selectedClassId, setSelectedClassId] = useState("ALL")
  const [selectedSubjectId, setSelectedSubjectId] = useState("ALL")
  const [currentPeriod, setCurrentPeriod] = useState("KSĐN")
  const [baselinePeriod, setBaselinePeriod] = useState("KSĐN")
  const [searchKeyword, setSearchKeyword] = useState("")

  // Tracking view sub-filter
  const [trackingCategory, setTrackingCategory] = useState<"ALL" | "BELOW_AVG" | "BELOW_BENCHMARK" | "ADMISSION_COMMITMENT" | "LEARNING_COMMITMENT">("ALL")

  // Data states
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{
    summary: any
    distribution: any[]
    teacherDistributions: any[]
    trackingStudents: any[]
    benchmarks: any[]
    subjects: any[]
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
    subjects: []
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

  // Filter classes according to selectedLevelFilter & selectedGradeFilter
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
        }
      }

      if (selectedGradeFilter !== "ALL") {
        if (!isGradeMatching(c.grade, selectedGradeFilter)) return false
      }

      return true
    })
  }, [classes, selectedLevelFilter, selectedGradeFilter])

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
  }, [selectedYearId, selectedLevelFilter, selectedGradeFilter, selectedClassId, selectedSubjectId, currentPeriod, baselinePeriod])

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
          (item.grade || "").toLowerCase().includes(kw)
        )
      })
    }
    return list
  }, [data.teacherDistributions, searchKeyword])

  // Filtered Tracking Students List
  const displayedTrackingStudents = useMemo(() => {
    let list = data.trackingStudents || []
    if (trackingCategory === "BELOW_AVG") {
      list = list.filter(st => st.isBelowAverage)
    } else if (trackingCategory === "BELOW_BENCHMARK") {
      list = list.filter(st => st.isBelowBenchmark)
    } else if (trackingCategory === "ADMISSION_COMMITMENT") {
      list = list.filter(st => st.hasAdmissionCommitment)
    } else if (trackingCategory === "LEARNING_COMMITMENT") {
      list = list.filter(st => st.hasActiveLearningCommitment)
    }

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
  }, [data.trackingStudents, trackingCategory, searchKeyword])

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

  // Export Excel: Tracking List
  const handleExportTrackingExcel = () => {
    if (displayedTrackingStudents.length === 0) {
      alert("Không có học sinh trong danh sách cần xuất!")
      return
    }

    const excelRows = displayedTrackingStudents.map((st, idx) => ({
      "STT": idx + 1,
      "Mã HS": st.studentCode,
      "Họ và tên": st.studentName,
      "Lớp": st.className,
      "Khối": st.grade,
      "Môn học": st.subjectName,
      "Giáo viên": st.teacherName,
      "Điểm số": st.currentScore !== null ? st.currentScore : "",
      "Điểm Chuẩn môn": st.benchmark,
      "Độ lệch so với chuẩn": st.benchmarkGap !== null ? st.benchmarkGap : "",
      "Dưới Trung bình (<5.0)": st.isBelowAverage ? "CÓ" : "KHÔNG",
      "Dưới Chuẩn": st.isBelowBenchmark ? "CÓ" : "KHÔNG",
      "Diện Cam kết đầu vào": st.hasAdmissionCommitment ? "CÓ" : "KHÔNG",
      "Tiêu chí / Diện trúng tuyển": st.entranceInfo?.admissionCriteria || st.entranceInfo?.targetType || "",
      "Điểm thi đầu vào (Toán - Văn - Anh)": st.entranceInfo ? `T:${st.entranceInfo.mathScore ?? "-"} V:${st.entranceInfo.literatureScore ?? "-"} A:${st.entranceInfo.writtenEnglishScore ?? "-"}` : "",
      "Ghi chú tuyển sinh / Cam kết": st.entranceInfo?.directorNote || st.learningCommitment?.content || ""
    }))

    const ws = XLSX.utils.json_to_sheet(excelRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "HS_Duoi_Chuan_Va_Cam_Ket")
    XLSX.writeFile(wb, `Danh_Sach_HS_Can_Can_Thiep_${currentPeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`)
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

          <button
            onClick={() => setActiveSubView("tracking")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeSubView === "tracking"
                ? "bg-white text-[#005B58] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>HS Dưới chuẩn & Cam kết</span>
            {(data.summary.totalBelowBenchmark > 0 || data.summary.totalAdmissionCommitment > 0) && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                {data.summary.totalBelowBenchmark + data.summary.totalAdmissionCommitment}
              </span>
            )}
          </button>

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
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
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
        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
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
            &lt; 7.0 (TH) hoặc &lt; 6.0 (TrH)
          </div>
        </div>

        {/* KPI 5: HS Dưới Trung bình (< 5.0) */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm bg-gradient-to-br from-white to-rose-50/30">
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
        <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-sm bg-gradient-to-br from-white to-indigo-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800">Diện Cam kết</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-800">
              {data.summary.totalAdmissionCommitment + data.summary.totalLearningCommitment}
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

            {activeSubView === "tracking" && (
              <button
                onClick={handleExportTrackingExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel HS Can thiệp</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* 1. Cấp học */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Cấp học:
            </label>
            <select
              value={selectedLevelFilter}
              onChange={e => setSelectedLevelFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white"
            >
              <option value="ALL">-- Tất cả Cấp học --</option>
              <option value="TieuHoc">Tiểu học (Chuẩn 7.0đ)</option>
              <option value="THCS">Trung học cơ sở (Chuẩn 6.0đ)</option>
              <option value="THPT">Trung học phổ thông (Chuẩn 6.0đ)</option>
            </select>
          </div>

          {/* 2. Lớp học (hỗ trợ chế độ "Tất cả") */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Lớp học ({filteredClasses.length} lớp):
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

          {/* 3. Kỳ khảo sát */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Học kỳ / Kỳ khảo sát:
            </label>
            <select
              value={currentPeriod}
              onChange={e => setCurrentPeriod(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white"
            >
              {EVAL_PERIODS.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 4. Môn học (đúng theo kỳ) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Môn học ({availableSubjectsForPeriod.length} môn):
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

          {/* 5. Tìm nhanh Giáo viên, Lớp, Môn */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Tìm nhanh:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Tên GV, mã GV, lớp, môn..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-8 pr-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
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
                                  setTrackingCategory("BELOW_BENCHMARK")
                                  setActiveSubView("tracking")
                                }}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition-all border border-amber-200"
                                title="Xem danh sách các học sinh dưới chuẩn của lớp này"
                              >
                                {it.count_below_benchmark} HS dưới chuẩn
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

      {/* 5. VIEW 2: DANH SÁCH HỌC SINH DƯỚI TRUNG BÌNH, DƯỚI CHUẨN & DIỆN CAM KẾT */}
      {activeSubView === "tracking" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn space-y-4 p-5">
          {/* Sub-tabs for Tracking */}
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setTrackingCategory("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  trackingCategory === "ALL"
                    ? "bg-[#005B58] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tất cả HS cần bám sát ({data.trackingStudents?.length || 0})
              </button>

              <button
                onClick={() => setTrackingCategory("BELOW_AVG")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  trackingCategory === "BELOW_AVG"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                🔴 Dưới Trung bình &lt;5.0đ ({data.summary.totalBelowAverage})
              </button>

              <button
                onClick={() => setTrackingCategory("BELOW_BENCHMARK")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  trackingCategory === "BELOW_BENCHMARK"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                🟠 Dưới Chuẩn môn ({data.summary.totalBelowBenchmark})
              </button>

              <button
                onClick={() => setTrackingCategory("ADMISSION_COMMITMENT")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  trackingCategory === "ADMISSION_COMMITMENT"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
                }`}
              >
                🎯 Diện Cam kết đầu vào ({data.summary.totalAdmissionCommitment})
              </button>

              <button
                onClick={() => setTrackingCategory("LEARNING_COMMITMENT")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  trackingCategory === "LEARNING_COMMITMENT"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-purple-50 text-purple-800 hover:bg-purple-100"
                }`}
              >
                📝 Diện Cam kết học tập ({data.summary.totalLearningCommitment})
              </button>
            </div>

            <span className="text-xs font-bold text-slate-500">
              Hiển thị {displayedTrackingStudents.length} học sinh
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-2 text-center w-8">STT</th>
                  <th className="py-3 px-3">Mã HS</th>
                  <th className="py-3 px-3">Họ và tên học sinh</th>
                  <th className="py-3 px-3">Lớp & Khối</th>
                  <th className="py-3 px-3">Môn học</th>
                  <th className="py-3 px-3">Giáo viên phụ trách</th>
                  <th className="py-3 px-2 text-center">Điểm số</th>
                  <th className="py-3 px-2 text-center">Chuẩn</th>
                  <th className="py-3 px-2 text-center">Độ lệch (Gap)</th>
                  <th className="py-3 px-3">Diện đối tượng & Ghi chú cam kết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedTrackingStudents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                      Không có học sinh nào trong danh mục bám sát này.
                    </td>
                  </tr>
                ) : (
                  displayedTrackingStudents.map((st, idx) => (
                    <tr key={`${st.studentId}_${st.subjectId}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-2 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-600">{st.studentCode}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{st.studentName}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-extrabold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[11px]">
                          {st.className}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{st.subjectName}</td>
                      <td className="py-2.5 px-3 text-slate-700">{st.teacherName}</td>

                      {/* Điểm số */}
                      <td className="py-2.5 px-2 text-center">
                        {st.currentScore !== null ? (
                          <span className={`font-black text-xs px-2 py-0.5 rounded ${
                            st.currentScore < 5.0
                              ? "bg-rose-100 text-rose-800"
                              : st.currentScore < st.benchmark
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
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

                      {/* Diện đối tượng & Ghi chú */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {st.hasAdmissionCommitment && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200" title={st.entranceInfo?.directorNote || "Học sinh có cam kết tuyển sinh"}>
                                <Sparkles className="w-3 h-3 text-indigo-600" />
                                🎯 Cam kết đầu vào
                              </span>
                            )}
                            {st.hasActiveLearningCommitment && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                📝 Cam kết học tập
                              </span>
                            )}
                            {st.isBelowAverage && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                                Dưới 5.0
                              </span>
                            )}
                            {st.isBelowBenchmark && !st.isBelowAverage && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                Dưới chuẩn
                              </span>
                            )}
                          </div>

                          {/* Thông tin bài thi tuyển sinh đầu vào nếu có */}
                          {st.entranceInfo && (
                            <div className="text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <span className="font-semibold text-slate-700">Điểm thi đầu vào:</span> Toán: <strong className="text-slate-800">{st.entranceInfo.mathScore ?? "-"}</strong> | Văn: <strong className="text-slate-800">{st.entranceInfo.literatureScore ?? "-"}</strong> | Anh: <strong className="text-slate-800">{st.entranceInfo.writtenEnglishScore ?? "-"}</strong>
                              {st.entranceInfo.admissionCriteria && (
                                <div className="text-[10px] text-indigo-700 font-medium mt-0.5">
                                  Tiêu chí: {st.entranceInfo.admissionCriteria}
                                </div>
                              )}
                              {st.entranceInfo.directorNote && (
                                <div className="text-[10px] text-slate-600 italic mt-0.5">
                                  &quot;{st.entranceInfo.directorNote}&quot;
                                </div>
                              )}
                            </div>
                          )}

                          {/* Thông tin cam kết học tập hiện hành */}
                          {st.learningCommitment && (
                            <div className="text-[10px] text-purple-800 bg-purple-50/70 p-1.5 rounded border border-purple-100 italic">
                              Cam kết: {st.learningCommitment.content} (GV: {st.learningCommitment.teacherName})
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
                  {selectedTeacherRow?.subjectName} - Lớp {selectedTeacherRow?.className}
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
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Đóng
              </button>
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
