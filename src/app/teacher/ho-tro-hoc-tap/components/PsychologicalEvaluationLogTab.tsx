"use client"
// @ts-nocheck

import { useState, useMemo } from "react"
import {
  Brain, Heart, Search, Filter, Download, Printer, Eye, Sparkles, 
  User, Clock, CheckCircle2, AlertCircle, TrendingUp, AlertTriangle,
  ChevronRight, ArrowUpDown, Calendar, HelpCircle, FileText
} from "lucide-react"
import * as XLSX from "xlsx"
import { formatDateSafe } from "../client"
import { PsychologicalDetailModal } from "./PsychologicalDetailModal"

interface Props {
  students: any[]
  homeroomClasses?: any[]
  assignedClasses?: any[]
  academicYearName: string
  academicYearId?: string
  teacher?: any
  onRefresh?: () => void
}

export function PsychologicalEvaluationLogTab({
  students = [],
  homeroomClasses = [],
  assignedClasses = [],
  academicYearName = "2026-2027",
  academicYearId = "",
  teacher,
  onRefresh
}: Props) {
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("ALL")
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<any | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Derive all classes available for filtering from assignedClasses, homeroomClasses, and students
  const availableClasses = useMemo(() => {
    const map = new Map<string, { id: string; className: string }>()
    const rawList = (assignedClasses && assignedClasses.length > 0) ? assignedClasses : homeroomClasses
    rawList.forEach((c: any) => {
      if (c?.id) map.set(c.id, { id: c.id, className: c.className || "Lớp" })
    })
    students.forEach((s: any) => {
      if (s?.classId && !map.has(s.classId)) {
        map.set(s.classId, { id: s.classId, className: s.className || "Lớp" })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.className.localeCompare(b.className))
  }, [assignedClasses, homeroomClasses, students])

  // 1. Statistics Summary Cards
  const stats = useMemo(() => {
    const total = students.length
    const needAttention = students.filter(s => 
      s.status === "CẦN THEO DÕI" || s.status === "CẦN CAN THIỆP" || (s.totalScore !== null && s.totalScore < 0)
    ).length
    const stable = students.filter(s => 
      s.status === "ĐÃ ỔN ĐỊNH" || s.status === "BÌNH THƯỜNG" || s.status === "HOÀN THÀNH" || (s.totalScore === 0)
    ).length
    const supporting = students.filter(s => s.status === "ĐANG HỖ TRỢ" || s.status === "ĐANG THEO DÕI").length

    return { total, needAttention, stable, supporting }
  }, [students])

  // 2. Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(item => {
      // Class filter
      if (selectedClassFilter !== "ALL" && item.classId !== selectedClassFilter) {
        return false
      }

      // Status filter
      if (selectedStatusFilter !== "ALL") {
        if (selectedStatusFilter === "NEED_ATTENTION") {
          if (item.status !== "CẦN THEO DÕI" && item.status !== "CẦN CAN THIỆP" && (item.totalScore === null || item.totalScore >= 0)) return false
        } else if (selectedStatusFilter === "STABLE") {
          if (item.status !== "ĐÃ ỔN ĐỊNH" && item.status !== "BÌNH THƯỜNG" && item.status !== "HOÀN THÀNH") return false
        } else if (selectedStatusFilter === "SUPPORTING") {
          if (item.status !== "ĐANG HỖ TRỢ" && item.status !== "ĐANG THEO DÕI") return false
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim()
        const matchName = (item.studentName || "").toLowerCase().includes(q)
        const matchCode = (item.studentCode || "").toLowerCase().includes(q)
        const matchClass = (item.className || "").toLowerCase().includes(q)
        const matchReason = (item.reason || "").toLowerCase().includes(q)
        const matchTeacher = (item.counselorName || "").toLowerCase().includes(q)
        return matchName || matchCode || matchClass || matchReason || matchTeacher
      }

      return true
    })
  }, [students, selectedClassFilter, selectedStatusFilter, searchTerm])

  // Export Excel
  const handleExportExcel = () => {
    if (filteredStudents.length === 0) return

    const exportData = filteredStudents.map((s, idx) => ({
      "STT": idx + 1,
      "Họ và tên": s.studentName,
      "Mã học sinh": s.studentCode,
      "Giới tính": s.gender === "FEMALE" ? "Nữ" : "Nam",
      "Lớp": s.className,
      "Cơ sở": s.campusName,
      "GV Phụ trách Tâm lý": s.counselorName,
      "Vai trò": s.counselorRole,
      "Ngày đánh giá": formatDateSafe(s.startDate),
      "Đánh giá của GV Tâm lý": s.reason,
      "Tổng điểm khảo sát": s.totalScore != null ? `${s.totalScore} đ` : "Chưa có",
      "Trạng thái": s.status
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Nhat_ky_danh_gia_tam_ly")
    XLSX.writeFile(wb, `Nhat_ky_danh_gia_tam_ly_${academicYearName.replace(/\s+/g, "_")}.xlsx`)
  }

  const handleOpenDetail = (student: any) => {
    setSelectedStudentForDetail(student)
    setIsDetailModalOpen(true)
  }

  return (
    <div className="space-y-5">
      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 text-white p-5 rounded-3xl shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-purple-200 uppercase tracking-wider">HS Đánh giá / Theo dõi Tâm lý</p>
              <p className="text-3xl font-black text-white mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs text-purple-200">
              <Brain className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[10px] text-purple-200/80 font-medium">Học sinh lớp phân công giảng dạy & chủ nhiệm có dữ liệu đánh giá / hỗ trợ Tâm lý</p>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-200/80 p-5 rounded-3xl shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-black text-rose-700 uppercase tracking-wider">Cần theo dõi & Can thiệp</p>
              <p className="text-3xl font-black text-rose-950 mt-1">{stats.needAttention}</p>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-600">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[10px] text-rose-600 mt-2 font-semibold">Điểm khảo sát âm hoặc GV ghi nhận cần lưu ý tập trung, hành vi</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 p-5 rounded-3xl shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">Đã ổn định / Bình thường</p>
              <p className="text-3xl font-black text-emerald-950 mt-1">{stats.stable}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[10px] text-emerald-600 mt-2 font-semibold">Các chỉ số tâm lý phát triển bình thường theo đánh giá GV</p>
        </div>

        <div className="bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-200/80 p-5 rounded-3xl shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-black text-sky-700 uppercase tracking-wider">Đang theo dõi / Hỗ trợ</p>
              <p className="text-3xl font-black text-sky-950 mt-1">{stats.supporting}</p>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-2xl border border-sky-500/20 text-sky-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[10px] text-sky-600 mt-2 font-semibold">Đang tiếp tục đồng hành định kỳ hàng tháng</p>
        </div>
      </div>

      {/* Action Toolbar & Filters */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Class filter dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Lớp phân công / phụ trách:</span>
              <select
                value={selectedClassFilter}
                onChange={e => setSelectedClassFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="ALL">Tất cả lớp ({availableClasses.length} lớp)</option>
                {availableClasses.map(c => {
                  const studentCount = students.filter(s => s.classId === c.id).length
                  return (
                    <option key={c.id} value={c.id}>
                      {c.className} {studentCount > 0 ? `(${studentCount} HS)` : ""}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Status filter dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Trạng thái:</span>
              <select
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="NEED_ATTENTION">🔴 Cần theo dõi & can thiệp</option>
                <option value="STABLE">🟢 Đã ổn định / Bình thường</option>
                <option value="SUPPORTING">🔵 Đang hỗ trợ / Đang theo dõi</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Tìm tên, mã HS, GV, nhận xét..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Xuất Excel
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              In danh sách
            </button>
          </div>
        </div>
      </div>

      {/* Main 8-Column Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white text-[11px] font-black uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center w-12">STT</th>
                <th className="py-3.5 px-4 min-w-[200px]">Học sinh</th>
                <th className="py-3.5 px-4 min-w-[140px]">Lớp & Cơ sở</th>
                <th className="py-3.5 px-4 min-w-[180px]">GV Phụ trách Môn Tâm lý</th>
                <th className="py-3.5 px-4 min-w-[120px]">Ngày đánh giá</th>
                <th className="py-3.5 px-4 min-w-[250px]">Kết quả đánh giá của GV Tâm lý</th>
                <th className="py-3.5 px-4 text-center min-w-[130px]">Trạng thái</th>
                <th className="py-3.5 px-4 text-center min-w-[160px]">Xem chi tiết kết quả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400 space-y-2">
                    <Brain className="h-10 w-10 text-purple-300 mx-auto opacity-70" />
                    <p className="font-bold text-slate-600 text-sm">Không có học sinh đánh giá tâm lý nào phù hợp bộ lọc</p>
                    <p className="text-xs text-slate-400">Dữ liệu được lọc tự động theo các lớp Thầy/Cô được phân công chủ nhiệm.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((item, idx) => {
                  const isNegative = item.totalScore !== null && item.totalScore < 0
                  const isAttention = item.status === "CẦN THEO DÕI" || item.status === "CẦN CAN THIỆP" || isNegative

                  return (
                    <tr 
                      key={item.id || idx}
                      className="hover:bg-purple-50/40 transition-colors group"
                    >
                      {/* 1. STT */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* 2. Học sinh */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {(item.studentName || "H").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                              {item.studentName}
                            </div>
                            <div className="font-mono text-[10px] text-purple-600 font-semibold flex items-center gap-1.5 mt-0.5">
                              <span>{item.studentCode}</span>
                              <span>•</span>
                              <span>{item.gender === "FEMALE" ? "Nữ" : (item.gender === "MALE" ? "Nam" : "")}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Lớp & Cơ sở */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900">{item.className}</span>
                            <span className="bg-teal-100 text-teal-800 text-[9px] font-black px-1.5 py-0.2 rounded border border-teal-200">
                              Lớp chủ nhiệm
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {item.campusName || "Sky-Line"}
                          </p>
                        </div>
                      </td>

                      {/* 4. GV Phụ trách Môn Tâm lý */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg shrink-0">
                            <User className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">
                              {item.counselorName}
                            </span>
                            <span className="text-[10px] text-purple-600 font-semibold">
                              {item.counselorRole || "GV Môn Tâm lý"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 5. Bắt đầu theo dõi / Ngày đánh giá */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-xs">
                            {formatDateSafe(item.startDate)}
                          </span>
                        </div>
                      </td>

                      {/* 6. Kết quả đánh giá của GV Tâm lý */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-[280px]">
                          <p className="font-semibold text-slate-800 line-clamp-2 leading-snug" title={item.reason}>
                            {item.reason}
                          </p>
                          {item.totalScore != null && (
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isNegative
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-purple-50 text-purple-700 border-purple-200"
                            }`}>
                              Tổng điểm khảo sát: {item.totalScore} đ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7. Trạng thái */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border shadow-2xs ${
                          isAttention
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : item.status === "ĐÃ ỔN ĐỊNH" || item.status === "BÌNH THƯỜNG" || item.status === "HOÀN THÀNH"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-sky-50 text-sky-800 border-sky-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isAttention
                              ? "bg-rose-500 animate-pulse"
                              : item.status === "ĐÃ ỔN ĐỊNH" || item.status === "BÌNH THƯỜNG" || item.status === "HOÀN THÀNH"
                              ? "bg-emerald-500"
                              : "bg-sky-500 animate-pulse"
                          }`} />
                          {item.status}
                        </span>
                      </td>

                      {/* 8. Xem chi tiết kết quả đánh giá */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer group-hover:scale-105"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Xem chi tiết</span>
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

      {/* Detail Modal Component */}
      <PsychologicalDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedStudentForDetail(null)
        }}
        studentData={selectedStudentForDetail}
        academicYearName={academicYearName}
        academicYearId={academicYearId}
        onEvaluationSaved={() => {
          if (onRefresh) onRefresh()
        }}
      />
    </div>
  )
}
