/* eslint-disable */
"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search,
  RefreshCw,
  Download,
  CheckCircle2,
  Clock,
  MessageSquare,
  Building2,
  Users,
  GraduationCap,
  Send,
  X,
  ChevronRight,
  UserCheck,
  CheckSquare,
  Printer
} from "lucide-react"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"

const EVAL_PERIODS = [
  { code: "ALL", name: "Tất cả các kỳ" },
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

const STATUS_OPTIONS = [
  { code: "ALL", label: "Tất cả học sinh" },
  { code: "HAS_PARENT_FEEDBACK", label: "PHHS có phản hồi/ý kiến" },
  { code: "NO_PARENT_FEEDBACK", label: "PHHS chưa có ý kiến" },
  { code: "HOMEROOM_REMARKED", label: "GVCN đã nhận xét" },
  { code: "HOMEROOM_PENDING", label: "GVCN chưa nhận xét" },
  { code: "GVBM_FORWARDED", label: "Đã chuyển tiếp GVBM" },
  { code: "GVBM_RESPONDED", label: "GVBM đã phản hồi giải pháp" },
  { code: "GVBM_PENDING", label: "Đang chờ GVBM phản hồi" }
]

interface Props {
  academicYears: any[]
  selectedYearId: string
  campuses: any[]
  classes: any[]
  subjects: any[]
}

export function FeedbackTrackingTab({
  academicYears: _academicYears = [],
  selectedYearId,
  campuses = [],
  classes = [],
  subjects: _subjects = []
}: Props) {
  // Primary Filters
  const [selectedPeriod, setSelectedPeriod] = useState("KSĐN")
  const [scopeMode, setScopeMode] = useState<"SYSTEM" | "CAMPUS" | "CLASS" | "DETAILS">("DETAILS")
  const [selectedCampusId, setSelectedCampusId] = useState("ALL")
  const [selectedGrade, setSelectedGrade] = useState("ALL")
  const [selectedClassId, setSelectedClassId] = useState("ALL")
  const [selectedStatus, setSelectedStatus] = useState("ALL")
  const [searchTerm, setSearchTerm] = useState("")

  // Data states
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{
    summary: any
    byCampus: any[]
    byClass: any[]
    items: any[]
    totalStudentsCount: number
    filteredCount: number
  }>({
    summary: {
      totalStudents: 0,
      parentFeedbackCount: 0,
      parentFeedbackPct: "0",
      homeroomRemarkCount: 0,
      homeroomRemarkPct: "0",
      gvbmForwardCount: 0,
      gvbmRespondedCount: 0,
      gvbmRespondedPct: "0",
      gvbmPendingCount: 0
    },
    byCampus: [],
    byClass: [],
    items: [],
    totalStudentsCount: 0,
    filteredCount: 0
  })

  // Selected Student for Timeline Modal
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<any | null>(null)

  // Fetch tracking data
  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        academicYearId: selectedYearId,
        evaluationPeriod: selectedPeriod,
        campusId: selectedCampusId,
        grade: selectedGrade,
        classId: selectedClassId,
        status: selectedStatus,
        search: searchTerm
      })

      const res = await fetch(`/api/admin/ktdbcl/feedback-tracking?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setData({
          summary: json.summary,
          byCampus: json.byCampus || [],
          byClass: json.byClass || [],
          items: json.items || [],
          totalStudentsCount: json.totalStudentsCount || 0,
          filteredCount: json.filteredCount || 0
        })
      } else {
        toast.error(json.error || "Không thể tải dữ liệu theo dõi")
      }
    } catch (e: any) {
      console.error("Lỗi fetch tracking data:", e)
      toast.error("Lỗi kết nối máy chủ khi tải dữ liệu")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedYearId, selectedPeriod, selectedCampusId, selectedGrade, selectedClassId, selectedStatus])

  // Filter available classes based on campus & grade selection
  const availableClasses = useMemo(() => {
    return classes.filter(c => {
      if (selectedCampusId !== "ALL" && c.campusId !== selectedCampusId) return false
      if (selectedGrade !== "ALL" && c.grade && !c.grade.includes(selectedGrade.replace("Khối ", ""))) return false
      return true
    })
  }, [classes, selectedCampusId, selectedGrade])

  // Quick switch when clicking on a campus or class from summaries
  const handleSelectCampus = (campusId: string) => {
    setSelectedCampusId(campusId)
    setSelectedClassId("ALL")
    setScopeMode("DETAILS")
  }

  const handleSelectClass = (classId: string, campusId: string) => {
    setSelectedCampusId(campusId)
    setSelectedClassId(classId)
    setScopeMode("DETAILS")
  }

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const itemsToExport = data.items
      if (!itemsToExport || itemsToExport.length === 0) {
        toast.error("Không có dữ liệu để xuất Excel")
        return
      }

      const rows = itemsToExport.map((item, idx) => ({
        "STT": idx + 1,
        "Mã Học Sinh": item.studentCode,
        "Họ và Tên": item.studentName,
        "Lớp": item.className,
        "Khối": item.grade,
        "Cơ sở": item.campusName,
        "Giáo viên chủ nhiệm": item.homeroomTeacherName,
        "Kỳ khảo sát": item.evaluationPeriod,
        // PHHS
        "PHHS có ý kiến": item.hasParentFeedback ? "Có ý kiến" : "Chưa có",
        "Nội dung phản hồi PHHS": item.parentFeedback || "",
        "Thời gian PHHS gửi": item.parentFeedbackDate ? new Date(item.parentFeedbackDate).toLocaleDateString("vi-VN") : "",
        // GVCN
        "GVCN đã nhận xét": item.hasTeacherRemark ? "Đã nhận xét" : "Chưa nhận xét",
        "GVCN tiếp nhận ý kiến": item.isAcknowledged ? "Đã tiếp nhận" : "Chưa tiếp nhận",
        "Nội dung nhận xét GVCN": item.teacherRemark || "",
        "Thời gian GVCN ghi nhận": item.teacherRemarkDate ? new Date(item.teacherRemarkDate).toLocaleDateString("vi-VN") : "",
        // GVBM
        "Chuyển tiếp GVBM": item.hasGvbmForward ? "Đã chuyển" : "Không",
        "Môn học chuyển tiếp": item.forwardedGvbm?.subjectName || "",
        "GVBM phụ trách": item.forwardedGvbm?.teacherName || "",
        "Lời nhắn gửi GVBM": item.forwardedGvbm?.message || "",
        "Thời gian chuyển tiếp": item.forwardedGvbm?.forwardedAt ? new Date(item.forwardedGvbm.forwardedAt).toLocaleDateString("vi-VN") : "",
        // GVBM phản hồi
        "GVBM phản hồi": item.hasGvbmResponse ? "Đã phản hồi" : (item.hasGvbmForward ? "Đang chờ" : "Không áp dụng"),
        "Trạng thái hỗ trợ GVBM": item.gvbmResponse?.statusText || "",
        "Nội dung giải pháp GVBM": item.gvbmResponse?.responseContent || "",
        "Thời gian GVBM phản hồi": item.gvbmResponse?.respondedAt ? new Date(item.gvbmResponse.respondedAt).toLocaleDateString("vi-VN") : ""
      }))

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "TheoDoi_TraoDoi_PHHS_GV")

      // Auto-fit columns
      const colWidths = [
        { wch: 6 },  // STT
        { wch: 14 }, // Mã HS
        { wch: 24 }, // Họ tên
        { wch: 10 }, // Lớp
        { wch: 10 }, // Khối
        { wch: 14 }, // Cơ sở
        { wch: 22 }, // GVCN
        { wch: 12 }, // Kỳ
        { wch: 16 }, // PHHS có ý kiến
        { wch: 38 }, // Nội dung PHHS
        { wch: 16 }, // Ngày PHHS
        { wch: 18 }, // GVCN nhận xét
        { wch: 18 }, // GVCN tiếp nhận
        { wch: 38 }, // Nội dung GVCN
        { wch: 16 }, // Ngày GVCN
        { wch: 16 }, // Chuyển GVBM
        { wch: 18 }, // Môn học
        { wch: 22 }, // GVBM
        { wch: 30 }, // Lời nhắn GVCN
        { wch: 16 }, // Ngày chuyển
        { wch: 16 }, // GVBM phản hồi
        { wch: 26 }, // Trạng thái GVBM
        { wch: 40 }, // Nội dung GVBM
        { wch: 16 }  // Ngày phản hồi
      ]
      ws["!cols"] = colWidths

      const dateStr = new Date().toISOString().slice(0, 10)
      const campusLabel = selectedCampusId !== "ALL" ? (campuses.find(c => c.id === selectedCampusId)?.campusCode || "CoSo") : "ToanHeThong"
      const fileName = `Theo_doi_phan_hoi_PHHS_GVCN_GVBM_${campusLabel}_${selectedPeriod}_${dateStr}.xlsx`

      XLSX.writeFile(wb, fileName)
      toast.success("Đã xuất file Excel báo cáo thành công!")
    } catch (e: any) {
      console.error("Lỗi xuất Excel:", e)
      toast.error("Không thể xuất file Excel")
    }
  }

  const { summary } = data

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & SCOPE SELECTOR */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#48BFE3]" />
              Theo Dõi Phản Hồi PHHS & Nội Dung Trao Đổi GVCN - GVBM
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Giám sát đa cấp (Hệ thống • Cơ sở • Lớp) về tình hình ghi nhận ý kiến phụ huynh và phối hợp xử lý giữa giáo viên chủ nhiệm & giáo viên bộ môn.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
              title="Xuất danh sách theo dõi ra file Excel"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-500" : ""}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Scope Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
            Chế độ xem:
          </span>
          <button
            onClick={() => setScopeMode("DETAILS")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              scopeMode === "DETAILS"
                ? "bg-[#003B3A] text-white shadow-md shadow-[#003B3A]/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Danh sách Chi tiết ({data.filteredCount})</span>
          </button>
          <button
            onClick={() => setScopeMode("SYSTEM")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              scopeMode === "SYSTEM"
                ? "bg-[#003B3A] text-white shadow-md shadow-[#003B3A]/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Theo Cơ sở ({campuses.length})</span>
          </button>
          <button
            onClick={() => setScopeMode("CLASS")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              scopeMode === "CLASS"
                ? "bg-[#003B3A] text-white shadow-md shadow-[#003B3A]/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Theo Lớp học ({availableClasses.length})</span>
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {/* 1. Evaluation Period */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Kỳ khảo sát / Học kỳ
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-sky-500"
            >
              {EVAL_PERIODS.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 2. Campus Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Cơ sở
            </label>
            <select
              value={selectedCampusId}
              onChange={(e) => {
                setSelectedCampusId(e.target.value)
                setSelectedClassId("ALL")
              }}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">-- Tất cả cơ sở (Hệ thống) --</option>
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.campusName}</option>
              ))}
            </select>
          </div>

          {/* 3. Grade Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Khối
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value)
                setSelectedClassId("ALL")
              }}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">-- Tất cả khối --</option>
              {GRADES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* 4. Class Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Lớp học
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">-- Tất cả các lớp --</option>
              {availableClasses.map(c => (
                <option key={c.id} value={c.id}>{c.className}</option>
              ))}
            </select>
          </div>

          {/* 5. Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Trạng thái tương tác
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-sky-500"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s.code} value={s.code}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* 6. Quick Search Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Tìm kiếm nhanh
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tên HS, mã, GVCN, môn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchData()}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-sky-500 placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Card 1: Total Students */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tổng Học Sinh</span>
            <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-800">
              {summary.totalStudents.toLocaleString("vi-VN")}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Học sinh trong phạm vi lọc
            </div>
          </div>
        </div>

        {/* Card 2: Parent Feedback */}
        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-2 -bottom-2 opacity-5 text-blue-600 pointer-events-none">
            <MessageSquare className="w-20 h-20" />
          </div>
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">PHHS Đã Phản Hồi</span>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-700">
                {summary.parentFeedbackCount}
              </span>
              <span className="text-xs font-black px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700">
                {summary.parentFeedbackPct}%
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Phụ huynh có ý kiến trao đổi
            </div>
          </div>
        </div>

        {/* Card 3: GVCN Remarks */}
        <div className="bg-white p-4 rounded-2xl border border-teal-100 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-teal-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">GVCN Đã Nhận Xét</span>
            <div className="p-2 bg-teal-50 rounded-xl text-teal-700">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-teal-800">
                {summary.homeroomRemarkCount}
              </span>
              <span className="text-xs font-black px-1.5 py-0.5 rounded-md bg-teal-100 text-teal-800">
                {summary.homeroomRemarkPct}%
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Đã ghi nhận & định hướng
            </div>
          </div>
        </div>

        {/* Card 4: Forwarded to GVBM */}
        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Đã Chuyển GVBM</span>
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-700">
                {summary.gvbmForwardCount}
              </span>
              <span className="text-xs font-medium text-slate-400">lượt</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Chuyển tiếp bộ môn hỗ trợ
            </div>
          </div>
        </div>

        {/* Card 5: GVBM Responded */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs flex flex-col justify-between relative overflow-hidden col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">GVBM Đã Phản Hồi</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700">
                {summary.gvbmRespondedCount}
              </span>
              <span className="text-xs font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                {summary.gvbmRespondedPct}%
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {summary.gvbmPendingCount > 0 ? (
                <span className="text-amber-600 font-bold">Còn {summary.gvbmPendingCount} lượt chờ xử lý</span>
              ) : (
                <span className="text-emerald-600 font-semibold">Đã hoàn thành phối hợp</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONDITIONAL CONTENT VIEW BASED ON SCOPE */}

      {/* VIEW A: BY CAMPUS (SYSTEM OVERVIEW) */}
      {scopeMode === "SYSTEM" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-600" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Bảng Thống Kê Tổng Hợp Theo Cơ Sở (Hệ Thống Sky-Line)
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Kỳ: <strong className="text-slate-700">{selectedPeriod}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 text-slate-600 border-b border-slate-200 font-bold uppercase text-[11px]">
                  <th className="py-3 px-4">Cơ sở</th>
                  <th className="py-3 px-3 text-center">Số Lớp</th>
                  <th className="py-3 px-3 text-center">Tổng Học Sinh</th>
                  <th className="py-3 px-4 text-center">PHHS Phản Hồi</th>
                  <th className="py-3 px-4 text-center">GVCN Đã Nhận Xét</th>
                  <th className="py-3 px-4 text-center">Chuyển Tiếp GVBM</th>
                  <th className="py-3 px-4 text-center">GVBM Đã Phản Hồi</th>
                  <th className="py-3 px-4 text-center">Tỷ Lệ Xử Lý</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.byCampus.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Không có dữ liệu cơ sở phù hợp
                    </td>
                  </tr>
                ) : (
                  data.byCampus.map((cStat) => (
                    <tr key={cStat.campusId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                          <span>{cStat.campusName}</span>
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {cStat.campusCode}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-700">
                        {cStat.classCount}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900">
                        {cStat.studentCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 font-bold text-blue-700">
                          <span>{cStat.parentFeedbackCount}</span>
                          <span className="text-[10px] font-semibold text-blue-500">({cStat.parentFeedbackPct}%)</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 font-bold text-teal-700">
                          <span>{cStat.homeroomRemarkCount}</span>
                          <span className="text-[10px] font-semibold text-teal-500">({cStat.homeroomRemarkPct}%)</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-indigo-700">
                        {cStat.gvbmForwardCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                          <span>{cStat.gvbmRespondedCount}</span>
                          <span className="text-[10px] font-semibold text-emerald-500">({cStat.gvbmRespondedPct}%)</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="w-24 mx-auto bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, Number(cStat.gvbmRespondedPct) || 0)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                          {cStat.gvbmPendingCount > 0 ? `Chờ ${cStat.gvbmPendingCount}` : "Hoàn tất"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleSelectCampus(cStat.campusId)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <span>Xem chi tiết</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW B: BY CLASS (CLASS OVERVIEW) */}
      {scopeMode === "CLASS" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-teal-600" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Bảng Thống Kê Tiến Độ Trao Đổi Theo Từng Lớp Học
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Số lớp: <strong className="text-slate-700">{data.byClass.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 text-slate-600 border-b border-slate-200 font-bold uppercase text-[11px]">
                  <th className="py-3 px-4">Lớp Học</th>
                  <th className="py-3 px-3">Cơ sở</th>
                  <th className="py-3 px-4">Giáo viên chủ nhiệm</th>
                  <th className="py-3 px-3 text-center">Sĩ Số</th>
                  <th className="py-3 px-4 text-center">PHHS Phản Hồi</th>
                  <th className="py-3 px-4 text-center">GVCN Nhận Xét</th>
                  <th className="py-3 px-4 text-center">Chuyển GVBM</th>
                  <th className="py-3 px-4 text-center">GVBM Phản Hồi</th>
                  <th className="py-3 px-4 text-right">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.byClass.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Không tìm thấy lớp học nào theo bộ lọc
                    </td>
                  </tr>
                ) : (
                  data.byClass.map((cls) => (
                    <tr key={cls.classId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {cls.className}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {cls.campusName}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {cls.homeroomTeacherName}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        {cls.studentCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 font-bold ${cls.parentFeedbackCount > 0 ? "text-blue-700" : "text-slate-400"}`}>
                          {cls.parentFeedbackCount}
                          <span className="text-[10px] font-semibold text-slate-400">({cls.parentFeedbackPct}%)</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 font-bold ${cls.homeroomRemarkCount > 0 ? "text-teal-700" : "text-slate-400"}`}>
                          {cls.homeroomRemarkCount}
                          <span className="text-[10px] font-semibold text-slate-400">({cls.homeroomRemarkPct}%)</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-indigo-700">
                        {cls.gvbmForwardCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 font-bold ${cls.gvbmRespondedCount > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                          {cls.gvbmRespondedCount}
                          <span className="text-[10px] font-semibold text-slate-400">({cls.gvbmRespondedPct}%)</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleSelectClass(cls.classId, cls.campusId)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <span>Xem DS học sinh</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW C: DETAILED STUDENT LIST WITH 3-WAY EXCHANGE */}
      {scopeMode === "DETAILS" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#003B3A]" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Danh Sách Học Sinh & Nội Dung Trao Đổi Chi Tiết ({data.filteredCount})
              </h3>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Đang hiển thị: <strong className="text-slate-800">{data.filteredCount}</strong> / {data.totalStudentsCount} học sinh
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 text-slate-600 border-b border-slate-200 font-bold uppercase text-[11px]">
                  <th className="py-3.5 px-3 text-center w-12">STT</th>
                  <th className="py-3.5 px-4 w-44">Học Sinh</th>
                  <th className="py-3.5 px-3 w-32">Lớp & GVCN</th>
                  <th className="py-3.5 px-4 min-w-[220px]">
                    <div className="flex items-center gap-1 text-blue-700">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>1. Ý kiến Phản hồi PHHS</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 min-w-[220px]">
                    <div className="flex items-center gap-1 text-teal-700">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>2. Nhận xét & Trao đổi GVCN</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 min-w-[200px]">
                    <div className="flex items-center gap-1 text-indigo-700">
                      <Send className="w-3.5 h-3.5" />
                      <span>3. Chuyển tiếp GVBM</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 min-w-[220px]">
                    <div className="flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>4. Phản hồi Kết quả GVBM</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-3 text-center w-24">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <MessageSquare className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                        <span className="font-semibold text-sm">Không tìm thấy bản ghi nào phù hợp bộ lọc</span>
                        <span className="text-xs text-slate-400">Hãy thử điều chỉnh kỳ khảo sát, cơ sở hoặc từ khóa tìm kiếm.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.items.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="hover:bg-sky-50/40 transition-colors group align-top"
                    >
                      {/* STT */}
                      <td className="py-3.5 px-3 text-center text-slate-400 font-semibold">
                        {idx + 1}
                      </td>

                      {/* Student Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-sky-800 transition-colors">
                          {item.studentName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 rounded">
                            {item.studentCode}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.gender === "FEMALE" || item.gender === "Nữ" ? "Nữ" : "Nam"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {item.campusName}
                        </div>
                      </td>

                      {/* Class & GVCN */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-800">
                          {item.className}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1">
                          <span className="truncate max-w-[120px]" title={item.homeroomTeacherName}>
                            {item.homeroomTeacherName}
                          </span>
                        </div>
                        <span className="inline-block mt-1 text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                          {item.evaluationPeriod}
                        </span>
                      </td>

                      {/* 1. Parent Feedback */}
                      <td className="py-3.5 px-4">
                        {item.hasParentFeedback ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                Đã gửi ý kiến
                              </span>
                              {item.parentFeedbackDate && (
                                <span className="text-[10px] text-slate-400">
                                  {new Date(item.parentFeedbackDate).toLocaleDateString("vi-VN")}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-800 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/70 leading-relaxed font-normal">
                              &ldquo;{item.parentFeedback}&rdquo;
                            </p>
                          </div>
                        ) : (
                          <div className="text-slate-400 italic text-[11px] flex items-center gap-1 py-1">
                            <Clock className="w-3.5 h-3.5 text-slate-300" />
                            <span>Chưa có ý kiến</span>
                          </div>
                        )}
                      </td>

                      {/* 2. GVCN Remark */}
                      <td className="py-3.5 px-4">
                        {item.hasTeacherRemark ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {item.isAcknowledged ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 flex items-center gap-1">
                                  <CheckSquare className="w-3 h-3 text-teal-600" />
                                  Đã tiếp nhận
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                  Đã nhận xét
                                </span>
                              )}
                              {item.teacherRemarkDate && (
                                <span className="text-[10px] text-slate-400">
                                  {new Date(item.teacherRemarkDate).toLocaleDateString("vi-VN")}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-800 bg-teal-50/40 p-2.5 rounded-xl border border-teal-100/60 leading-relaxed">
                              {item.teacherRemark}
                            </p>
                          </div>
                        ) : (
                          <div className="text-slate-400 italic text-[11px] flex items-center gap-1 py-1">
                            <Clock className="w-3.5 h-3.5 text-slate-300" />
                            <span>GVCN chưa nhận xét</span>
                          </div>
                        )}
                      </td>

                      {/* 3. GVBM Forward */}
                      <td className="py-3.5 px-4">
                        {item.hasGvbmForward ? (
                          <div className="space-y-1 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/70">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-indigo-900 text-xs">
                                {item.forwardedGvbm?.subjectName || "Môn học"}
                              </span>
                              <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-100/80 px-1.5 py-0.5 rounded">
                                {item.forwardedGvbm?.teacherName || "GVBM"}
                              </span>
                            </div>
                            {item.forwardedGvbm?.message && (
                              <p className="text-[11px] text-slate-700 mt-1 italic">
                                Lời nhắn: &ldquo;{item.forwardedGvbm.message}&rdquo;
                              </p>
                            )}
                            {item.forwardedGvbm?.forwardedAt && (
                              <div className="text-[10px] text-slate-400 mt-1">
                                Gửi ngày {new Date(item.forwardedGvbm.forwardedAt).toLocaleDateString("vi-VN")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs font-normal">--</span>
                        )}
                      </td>

                      {/* 4. GVBM Response */}
                      <td className="py-3.5 px-4">
                        {item.hasGvbmResponse ? (
                          <div className="space-y-1.5 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/70">
                            <div className="flex items-center justify-between gap-1">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {item.gvbmResponse?.statusText || "Đã hỗ trợ"}
                              </span>
                              {item.gvbmResponse?.respondedAt && (
                                <span className="text-[10px] text-slate-400">
                                  {new Date(item.gvbmResponse.respondedAt).toLocaleDateString("vi-VN")}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-800 font-medium leading-relaxed">
                              {item.gvbmResponse?.responseContent}
                            </p>
                            <div className="text-[10px] text-emerald-700 font-semibold">
                              GV phản hồi: {item.gvbmResponse?.teacherName}
                            </div>
                          </div>
                        ) : item.hasGvbmForward ? (
                          <div className="bg-amber-50 p-2 rounded-xl border border-amber-200/60 text-amber-800 text-[11px] font-medium flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-spin" />
                            <span>Đang chờ GVBM phản hồi giải pháp</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs font-normal">--</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => setSelectedTimelineItem(item)}
                          className="p-2 hover:bg-sky-100 text-sky-700 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                          title="Xem dòng thời gian trao đổi chi tiết"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. MODAL: INTERACTIVE 3-WAY EXCHANGE TIMELINE */}
      {selectedTimelineItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-teal-900 via-sky-950 to-blue-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs">
                  <MessageSquare className="w-5 h-5 text-sky-300" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    Lịch Sử Trao Đổi 3 Bên (PHHS - GVCN - GVBM)
                  </h3>
                  <p className="text-xs text-sky-200 mt-0.5">
                    Học sinh: <strong className="text-white font-bold">{selectedTimelineItem.studentName}</strong> • Lớp: <strong>{selectedTimelineItem.className}</strong> ({selectedTimelineItem.campusName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTimelineItem(null)}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-all text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Stepper / Timeline */}
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 text-xs">
              
              {/* Timeline Flow */}
              <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">

                {/* Step 1: PHHS Feedback */}
                <div className="relative">
                  <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedTimelineItem.hasParentFeedback
                      ? "bg-blue-600 border-white text-white shadow-sm"
                      : "bg-slate-200 border-white text-slate-400"
                  }`}>
                    <span className="text-[10px] font-black">1</span>
                  </div>
                  <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-100">
                    <div className="flex items-center justify-between pb-2 border-b border-blue-100/60 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-700" />
                        <h4 className="font-bold text-slate-900 text-xs">
                          Ý Kiến & Phản Hồi Từ Phụ Huynh Học Sinh (PHHS)
                        </h4>
                      </div>
                      {selectedTimelineItem.parentFeedbackDate && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          {new Date(selectedTimelineItem.parentFeedbackDate).toLocaleString("vi-VN")}
                        </span>
                      )}
                    </div>
                    {selectedTimelineItem.hasParentFeedback ? (
                      <p className="text-xs text-slate-800 leading-relaxed font-normal italic">
                        &ldquo;{selectedTimelineItem.parentFeedback}&rdquo;
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        Phụ huynh chưa gửi ý kiến trong kỳ này.
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 2: GVCN Remark & Forward */}
                <div className="relative">
                  <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedTimelineItem.hasTeacherRemark || selectedTimelineItem.isAcknowledged
                      ? "bg-teal-600 border-white text-white shadow-sm"
                      : "bg-slate-200 border-white text-slate-400"
                  }`}>
                    <span className="text-[10px] font-black">2</span>
                  </div>
                  <div className="bg-teal-50/50 rounded-2xl p-4 border border-teal-100">
                    <div className="flex items-center justify-between pb-2 border-b border-teal-100/60 mb-2">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-teal-700" />
                        <h4 className="font-bold text-slate-900 text-xs">
                          Tiếp Nhận & Nhận Xét Của Giáo Viên Chủ Nhiệm (GVCN)
                        </h4>
                      </div>
                      {selectedTimelineItem.teacherRemarkDate && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          {new Date(selectedTimelineItem.teacherRemarkDate).toLocaleString("vi-VN")}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-teal-900 font-semibold mb-1">
                      GVCN: {selectedTimelineItem.homeroomTeacherName}
                    </div>
                    {selectedTimelineItem.hasTeacherRemark ? (
                      <p className="text-xs text-slate-800 leading-relaxed">
                        {selectedTimelineItem.teacherRemark}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        GVCN chưa nhập nhận xét đánh giá.
                      </p>
                    )}

                    {/* Forwarded note to GVBM if any */}
                    {selectedTimelineItem.hasGvbmForward && (
                      <div className="mt-3 p-3 bg-white/80 rounded-xl border border-teal-200/60 space-y-1">
                        <div className="flex items-center justify-between font-bold text-indigo-900 text-[11px]">
                          <span>Chuyển tiếp đến GVBM: {selectedTimelineItem.forwardedGvbm?.teacherName}</span>
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono text-[10px]">
                            Môn {selectedTimelineItem.forwardedGvbm?.subjectName}
                          </span>
                        </div>
                        {selectedTimelineItem.forwardedGvbm?.message && (
                          <div className="text-slate-600 text-xs italic">
                            Lời nhắn: &ldquo;{selectedTimelineItem.forwardedGvbm.message}&rdquo;
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3: GVBM Solution & Response */}
                <div className="relative">
                  <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedTimelineItem.hasGvbmResponse
                      ? "bg-emerald-600 border-white text-white shadow-sm"
                      : "bg-slate-200 border-white text-slate-400"
                  }`}>
                    <span className="text-[10px] font-black">3</span>
                  </div>
                  <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-100/60 mb-2">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <h4 className="font-bold text-slate-900 text-xs">
                          Giải Pháp & Phản Hồi Từ Giáo Viên Bộ Môn (GVBM)
                        </h4>
                      </div>
                      {selectedTimelineItem.gvbmResponse?.respondedAt && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          {new Date(selectedTimelineItem.gvbmResponse.respondedAt).toLocaleString("vi-VN")}
                        </span>
                      )}
                    </div>
                    {selectedTimelineItem.hasGvbmResponse ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-200/80 text-emerald-900">
                            {selectedTimelineItem.gvbmResponse?.statusText || "Đã kèm cặp & hướng dẫn riêng"}
                          </span>
                          <span className="text-[11px] font-bold text-slate-700">
                            GVBM: {selectedTimelineItem.gvbmResponse?.teacherName} ({selectedTimelineItem.gvbmResponse?.subjectName})
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed font-normal bg-white/70 p-3 rounded-xl border border-emerald-200/60">
                          {selectedTimelineItem.gvbmResponse?.responseContent}
                        </p>
                      </div>
                    ) : selectedTimelineItem.hasGvbmForward ? (
                      <div className="text-amber-800 text-xs font-medium flex items-center gap-2 py-1">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span>Giáo viên bộ môn đã tiếp nhận và đang tiến hành hỗ trợ, chưa cập nhật kết quả phản hồi.</span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        Không có yêu cầu phối hợp bộ môn cho học sinh này.
                      </p>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>In phiếu trao đổi</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTimelineItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
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
