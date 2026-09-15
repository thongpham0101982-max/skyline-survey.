// @ts-nocheck
"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search, RefreshCw, Download, Filter, CheckCircle2, Clock,
  AlertCircle, ChevronRight, User, BookOpen, ExternalLink, X,
  GraduationCap, Building2, BarChart2, Check, ArrowUpDown
} from "lucide-react"
import * as XLSX from "xlsx"

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

interface Props {
  academicYears: any[]
  selectedYearId: string
  campuses: any[]
  classes: any[]
  subjects: any[]
  onNavigateToGradebook?: (params: {
    campusId: string
    grade: string
    classId: string
    subjectId: string
    period: string
  }) => void
}

export function GradeProgressTab({
  academicYears,
  selectedYearId,
  campuses = [],
  classes = [],
  subjects = [],
  onNavigateToGradebook
}: Props) {
  // Filter states
  const [selectedPeriod, setSelectedPeriod] = useState("KSĐN")
  const [selectedCampusId, setSelectedCampusId] = useState("ALL")
  const [selectedGrade, setSelectedGrade] = useState("ALL")
  const [selectedStatus, setSelectedStatus] = useState("ALL")
  const [scope, setScope] = useState<"SURVEY" | "ALL_ASSIGNED">("SURVEY")
  const [searchTerm, setSearchTerm] = useState("")

  // Data states
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [summary, setSummary] = useState({
    totalAssignments: 0,
    completedCount: 0,
    inProgressCount: 0,
    notStartedCount: 0,
    noStudentsCount: 0,
    overallRate: 0,
    totalGradedStudents: 0,
    totalExpectedStudents: 0
  })

  // Modal detail states
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailData, setDetailData] = useState<any>(null)

  // Fetch progress data
  const fetchProgress = async () => {
    try {
      setLoading(true)
      const query = new URLSearchParams({
        academicYearId: selectedYearId,
        evaluationPeriod: selectedPeriod,
        campusId: selectedCampusId,
        grade: selectedGrade,
        status: selectedStatus,
        search: searchTerm,
        scope
      })

      const res = await fetch(`/api/admin/ktdbcl/grade-progress?${query.toString()}`)
      const data = await res.json()
      if (data.success) {
        setItems(data.items || [])
        setSummary(data.summary || {
          totalAssignments: 0,
          completedCount: 0,
          inProgressCount: 0,
          notStartedCount: 0,
          noStudentsCount: 0,
          overallRate: 0,
          totalGradedStudents: 0,
          totalExpectedStudents: 0
        })
      }
    } catch (err) {
      console.error("Lỗi tải tiến độ nhập điểm:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProgress()
  }, [selectedYearId, selectedPeriod, selectedCampusId, selectedGrade, selectedStatus, scope])

  // Handle live search debounce
  useEffect(() => {
    const t = setTimeout(() => {
      fetchProgress()
    }, 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  // Open detail modal for a specific class + subject
  const handleOpenDetail = async (item: any) => {
    try {
      setDetailModalOpen(true)
      setLoadingDetail(true)
      setDetailData(null)

      const query = new URLSearchParams({
        academicYearId: selectedYearId,
        evaluationPeriod: item.evaluationPeriod || selectedPeriod,
        detailClassId: item.classId,
        detailSubjectId: item.subjectId
      })

      const res = await fetch(`/api/admin/ktdbcl/grade-progress?${query.toString()}`)
      const data = await res.json()
      if (data.success) {
        setDetailData(data)
      } else {
        alert("Lỗi tải chi tiết: " + (data.error || "Không rõ"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setLoadingDetail(false)
    }
  }

  // Quick jump to Tab 2 (Sổ điểm)
  const handleJumpToGradebook = (item: any) => {
    if (onNavigateToGradebook) {
      onNavigateToGradebook({
        campusId: item.campusId || "ALL",
        grade: item.grade ? `Khối ${item.grade.replace(/\D/g, "") || item.grade}` : "ALL",
        classId: item.classId,
        subjectId: item.subjectId,
        period: item.evaluationPeriod || selectedPeriod
      })
    }
  }

  // Export Excel report
  const handleExportExcel = () => {
    if (items.length === 0) {
      alert("Không có dữ liệu để xuất báo cáo!")
      return
    }

    const currentYearName = academicYears.find(y => y.id === selectedYearId)?.name || "2026-2027"
    const periodName = EVAL_PERIODS.find(p => p.code === selectedPeriod)?.name || selectedPeriod

    const excelRows = items.map((it, idx) => ({
      "STT": idx + 1,
      "Cơ sở": it.campusName,
      "Khối": it.grade ? `Khối ${it.grade}` : "",
      "Lớp học": it.className,
      "Môn học": `${it.subjectName} (${it.subjectCode})`,
      "Mã GV": it.teacherCode || "",
      "Giáo viên phân công": it.teacherName,
      "Kỳ khảo sát": it.evaluationPeriod,
      "Sĩ số": it.totalStudents,
      "Đã nhập điểm": it.gradedCount,
      "Tỷ lệ hoàn thành (%)": `${it.completionRate}%`,
      "Tình trạng": it.status === "COMPLETED" ? "Đã hoàn thành" : it.status === "IN_PROGRESS" ? "Đang nhập" : it.status === "NO_STUDENTS" ? "Chưa có HS" : "Chưa nhập",
      "Điểm TB tạm tính": it.avgScore !== null ? it.avgScore : "",
      "Cập nhật lần cuối": it.lastUpdated ? new Date(it.lastUpdated).toLocaleString("vi-VN") : "Chưa có"
    }))

    const ws = XLSX.utils.json_to_sheet(excelRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Tien_Do_Nhap_Diem")
    XLSX.writeFile(wb, `Bao_Cao_Tien_Do_Nhap_Diem_${selectedPeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const currentYearName = academicYears.find(y => y.id === selectedYearId)?.name || "2026-2027"

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. THANH TIÊU ĐỀ & NÚT HÀNH ĐỘNG */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-[#005B58] border border-teal-200 flex items-center gap-1">
              <BarChart2 className="w-3.5 h-3.5" />
              Đảm bảo chất lượng & Khảo thí
            </span>
            <span className="text-xs font-semibold text-slate-500">[{currentYearName}]</span>
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight mt-1">
            Thống kê Tiến độ Nhập Điểm theo Phân công
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tỷ lệ hoàn thành chấm điểm của từng giáo viên, môn học và lớp theo từng Kỳ đánh giá / Khảo sát.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchProgress}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#005B58]" : ""}`} />
            Làm mới
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow"
          >
            <Download className="w-3.5 h-3.5" />
            Xuất báo cáo Excel
          </button>
        </div>
      </div>

      {/* 2. KHỐI KPI CARDS TỔNG HỢP */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Card 1: Tổng phân công */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tổng phân công</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#005B58] flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{summary.totalAssignments}</span>
            <span className="text-[11px] font-semibold text-slate-500">lớp-môn</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Tổng HS dự kiến: <strong className="text-slate-700">{summary.totalExpectedStudents.toLocaleString()}</strong>
          </div>
        </div>

        {/* Card 2: Hoàn thành 100% */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden group bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Đã hoàn thành (100%)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{summary.completedCount}</span>
            <span className="text-[11px] font-bold text-emerald-600">
              ({summary.totalAssignments > 0 ? Math.round((summary.completedCount / summary.totalAssignments) * 100) : 0}%)
            </span>
          </div>
          <div className="text-[11px] text-emerald-700/80 mt-1 font-medium">
            Đã nhập đủ toàn bộ học sinh
          </div>
        </div>

        {/* Card 3: Đang nhập */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden group bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Đang nhập (1-99%)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">{summary.inProgressCount}</span>
            <span className="text-[11px] font-bold text-amber-600">lớp-môn</span>
          </div>
          <div className="text-[11px] text-amber-700/80 mt-1 font-medium">
            Đang chấm dở dang
          </div>
        </div>

        {/* Card 4: Chưa nhập */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm relative overflow-hidden group bg-gradient-to-br from-white to-rose-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">Chưa bắt đầu</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700">{summary.notStartedCount}</span>
            <span className="text-[11px] font-bold text-rose-600">lớp-môn</span>
          </div>
          <div className="text-[11px] text-rose-700/80 mt-1 font-medium">
            Chưa có con điểm nào
          </div>
        </div>

        {/* Card 5: Tỷ lệ hoàn thành toàn trường */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Tiến độ toàn trường</span>
            <span className="text-sm font-black text-[#005B58]">{summary.overallRate}%</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-[#005B58] h-full rounded-full transition-all duration-500"
              style={{ width: `${summary.overallRate}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex justify-between">
            <span>Đã có điểm:</span>
            <strong className="text-slate-800">{summary.totalGradedStudents.toLocaleString()} HS</strong>
          </div>
        </div>
      </div>

      {/* 3. THANH BỘ LỌC ĐA TIÊU CHÍ */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-[#005B58]" />
            <span>Bộ lọc Thống kê</span>
          </div>

          {/* Scope Toggle: Môn theo kỳ vs Tất cả môn */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-xs">
            <button
              onClick={() => setScope("SURVEY")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                scope === "SURVEY"
                  ? "bg-white text-[#005B58] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ⭐ Chỉ môn theo Kỳ khảo sát
            </button>
            <button
              onClick={() => setScope("ALL_ASSIGNED")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                scope === "ALL_ASSIGNED"
                  ? "bg-white text-[#005B58] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tất cả phân công giảng dạy
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* 1. Kỳ khảo sát */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Học kỳ / Kỳ khảo sát:
            </label>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white"
            >
              {EVAL_PERIODS.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
              <option value="ALL">Tất cả kỳ</option>
            </select>
          </div>

          {/* 2. Cơ sở */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Cơ sở:
            </label>
            <select
              value={selectedCampusId}
              onChange={e => setSelectedCampusId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white"
            >
              <option value="ALL">Tất cả Cơ sở</option>
              {campuses.map(cp => (
                <option key={cp.id} value={cp.id}>{cp.campusName || cp.campusCode}</option>
              ))}
            </select>
          </div>

          {/* 3. Khối */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Khối:
            </label>
            <select
              value={selectedGrade}
              onChange={e => setSelectedGrade(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white"
            >
              <option value="ALL">Tất cả Khối</option>
              {GRADES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* 4. Tình trạng */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Tình trạng nhập:
            </label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white"
            >
              <option value="ALL">Tất cả tình trạng</option>
              <option value="COMPLETED">🟢 Đã hoàn thành (100%)</option>
              <option value="IN_PROGRESS">🟡 Đang nhập (1-99%)</option>
              <option value="NOT_STARTED">🔴 Chưa nhập (0%)</option>
            </select>
          </div>

          {/* 5. Tìm kiếm */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Tìm nhanh:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Tên GV, lớp, môn..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-8 pr-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. BẢNG DANH SÁCH CHI TIẾT */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-800">
              Danh sách Tiến độ theo Phân công
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
              {items.length} phân công
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3 text-center w-10">STT</th>
                <th className="py-3 px-3">Cơ sở & Khối</th>
                <th className="py-3 px-3">Lớp học</th>
                <th className="py-3 px-3">Môn học</th>
                <th className="py-3 px-3">Giáo viên phân công</th>
                <th className="py-3 px-3 text-center">Kỳ khảo sát</th>
                <th className="py-3 px-3 min-w-[160px]">Tiến độ nhập</th>
                <th className="py-3 px-3 text-center">Tình trạng</th>
                <th className="py-3 px-3 text-center">Điểm TB</th>
                <th className="py-3 px-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#005B58]" />
                      <span className="font-medium">Đang tổng hợp tiến độ từ cơ sở dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                    Không tìm thấy phân công nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  return (
                    <tr key={`${item.classId}_${item.subjectId}_${item.evaluationPeriod}_${idx}`} className="hover:bg-slate-50/70 transition-colors">
                      {/* STT */}
                      <td className="py-3 px-3 text-center text-slate-400 font-medium">
                        {idx + 1}
                      </td>

                      {/* Cơ sở & Khối */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{item.campusName}</span>
                          <span className="text-[11px] text-slate-500 font-medium">Khối {item.grade}</span>
                        </div>
                      </td>

                      {/* Lớp học */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-teal-900 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                            {item.className}
                          </span>
                          <span className="text-[11px] text-slate-400">({item.totalStudents} HS)</span>
                        </div>
                      </td>

                      {/* Môn học */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{item.subjectName}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{item.subjectCode}</span>
                        </div>
                      </td>

                      {/* Giáo viên phân công */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1">
                              {item.teacherName}
                            </div>
                            {item.teacherCode && (
                              <div className="text-[10px] text-slate-400 font-mono">{item.teacherCode}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Kỳ khảo sát */}
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                          {item.evaluationPeriod}
                        </span>
                      </td>

                      {/* Tiến độ nhập */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-slate-700">{item.gradedCount} / {item.totalStudents} HS</span>
                            <span className={item.completionRate === 100 ? "text-emerald-700 font-extrabold" : "text-slate-700"}>
                              {item.completionRate}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                item.completionRate === 100
                                  ? "bg-emerald-500"
                                  : item.completionRate > 0
                                  ? "bg-amber-500"
                                  : "bg-slate-200"
                              }`}
                              style={{ width: `${item.completionRate}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Tình trạng */}
                      <td className="py-3 px-3 text-center">
                        {item.status === "COMPLETED" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Check className="w-3 h-3 text-emerald-700" />
                            Đã hoàn thành
                          </span>
                        ) : item.status === "IN_PROGRESS" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-700" />
                            Đang nhập
                          </span>
                        ) : item.status === "NO_STUDENTS" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                            Chưa có HS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertCircle className="w-3 h-3 text-rose-700" />
                            Chưa nhập
                          </span>
                        )}
                      </td>

                      {/* Điểm TB */}
                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        {item.avgScore !== null ? (
                          <span className="text-teal-800 font-extrabold">{item.avgScore}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(item)}
                            className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors"
                            title="Xem chi tiết danh sách học sinh"
                          >
                            Chi tiết
                          </button>
                          <button
                            onClick={() => handleJumpToGradebook(item)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-[#005B58] hover:bg-[#004845] text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                            title="Chuyển sang màn hình Nhập sổ điểm"
                          >
                            <span>Vào sổ</span>
                            <ExternalLink className="w-3 h-3" />
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
      </div>

      {/* 5. MODAL XEM CHI TIẾT DANH SÁCH HỌC SINH CỦA LỚP */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs font-extrabold bg-teal-100 text-[#005B58] rounded">
                    CHI TIẾT NHẬP ĐIỂM
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Kỳ: {detailData?.evaluationPeriod || selectedPeriod}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-800 mt-1">
                  Lớp {detailData?.classInfo?.className} — Môn {detailData?.subjectInfo?.subjectName}
                </h3>
                <p className="text-xs text-slate-500">
                  Giáo viên phụ trách: <strong className="text-slate-700">{detailData?.assignedTeacher}</strong> • Cơ sở: {detailData?.classInfo?.campusName}
                </p>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Subheader stats */}
            {detailData && (
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  Sĩ số lớp: <strong className="text-slate-800">{detailData.totalStudents} HS</strong>
                </div>
                <div>
                  Đã có điểm: <strong className="text-emerald-700">{detailData.gradedStudents} HS</strong>
                </div>
                <div>
                  Chưa có điểm: <strong className="text-rose-600">{detailData.totalStudents - detailData.gradedStudents} HS</strong>
                </div>
                <div>
                  Tỷ lệ: <strong className="text-[#005B58] font-bold">
                    {detailData.totalStudents > 0 ? Math.round((detailData.gradedStudents / detailData.totalStudents) * 100) : 0}%
                  </strong>
                </div>
              </div>
            )}

            {/* Modal Body: Student List Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5 text-center w-10">STT</th>
                    <th className="p-2.5">Mã HS</th>
                    <th className="p-2.5">Họ và tên</th>
                    <th className="p-2.5 text-center">Ngày sinh</th>
                    <th className="p-2.5 text-center">Trạng thái điểm</th>
                    <th className="p-2.5 text-center">Điểm TH</th>
                    <th className="p-2.5">Nhận xét</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingDetail ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#005B58]" />
                        <div className="mt-1">Đang tải danh sách học sinh...</div>
                      </td>
                    </tr>
                  ) : !detailData?.students || detailData.students.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                        Không có dữ liệu học sinh trong lớp này.
                      </td>
                    </tr>
                  ) : (
                    detailData.students.map((st: any, idx: number) => {
                      const dobStr = st.dateOfBirth ? new Date(st.dateOfBirth).toLocaleDateString("vi-VN") : "—"
                      return (
                        <tr key={st.id} className="hover:bg-slate-50/60">
                          <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-600">{st.studentCode}</td>
                          <td className="p-2.5 font-bold text-slate-800">{st.studentName}</td>
                          <td className="p-2.5 text-center text-slate-500">{dobStr}</td>
                          <td className="p-2.5 text-center">
                            {st.hasGrade ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Đã có điểm
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Chưa nhập
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            {st.compositeScore !== null && st.compositeScore !== undefined ? (
                              <span className="px-2 py-0.5 bg-teal-50 text-teal-800 rounded font-black">
                                {st.compositeScore}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-600 max-w-[200px] truncate" title={st.remark}>
                            {st.remark || <span className="text-slate-300 italic">Không có nhận xét</span>}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Đóng
              </button>

              {detailData && (
                <button
                  onClick={() => {
                    setDetailModalOpen(false)
                    if (onNavigateToGradebook) {
                      onNavigateToGradebook({
                        campusId: detailData.classInfo?.campusId || "ALL",
                        grade: detailData.classInfo?.grade ? `Khối ${detailData.classInfo.grade}` : "ALL",
                        classId: detailData.classInfo?.id,
                        subjectId: detailData.subjectInfo?.id,
                        period: detailData.evaluationPeriod || selectedPeriod
                      })
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#005B58] hover:bg-[#004845] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <span>Mở Sổ điểm lớp này</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
