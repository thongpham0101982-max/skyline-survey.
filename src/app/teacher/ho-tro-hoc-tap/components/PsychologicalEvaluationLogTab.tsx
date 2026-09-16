"use client"
// @ts-nocheck

import { useState, useMemo } from "react"
import { 
  Brain, Heart, Search, Filter, Download, Printer, Eye, Sparkles, 
  CheckCircle2, AlertCircle, Clock, ChevronRight, User, ShieldCheck, 
  HelpCircle, TrendingUp, AlertTriangle, Layers, FileText
} from "lucide-react"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"
import { formatDateSafe, getTrackingLevelBadge } from "../client"
import { PsychologicalDetailModal } from "./PsychologicalDetailModal"

interface Props {
  students: any[]
  homeroomClasses: any[]
  academicYearName?: string
  academicYearId?: string
  teacher?: any
  onRefresh?: () => void
}

export function PsychologicalEvaluationLogTab({
  students = [],
  homeroomClasses = [],
  academicYearName = "2026-2027",
  academicYearId = "",
  teacher,
  onRefresh
}: Props) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClassFilter, setSelectedClassFilter] = useState("ALL")
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL")
  
  // Selected student for detail modal
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<any | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Filter list of students based on search, class, and status
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = searchTerm.trim().toLowerCase()
      if (q) {
        const matchName = (s.studentName || "").toLowerCase().includes(q)
        const matchCode = (s.studentCode || "").toLowerCase().includes(q)
        const matchReason = (s.reason || "").toLowerCase().includes(q)
        const matchCounselor = (s.counselorName || "").toLowerCase().includes(q)
        if (!matchName && !matchCode && !matchReason && !matchCounselor) return false
      }

      if (selectedClassFilter !== "ALL") {
        if (s.classId !== selectedClassFilter && s.className !== selectedClassFilter) {
          return false
        }
      }

      if (selectedStatusFilter !== "ALL") {
        const status = (s.status || "").toUpperCase()
        if (selectedStatusFilter === "ACTIVE" && !status.includes("HỖ TRỢ") && !status.includes("THEO DÕI") && status !== "ACTIVE") {
          return false
        }
        if (selectedStatusFilter === "COMPLETED" && !status.includes("HOÀN THÀNH") && !status.includes("ỔN ĐỊNH")) {
          return false
        }
        if (selectedStatusFilter === "CRITICAL" && !status.includes("CAN THIỆP") && !status.includes("CHUYÊN SÂU")) {
          return false
        }
      }

      return true
    })
  }, [students, searchTerm, selectedClassFilter, selectedStatusFilter])

  // Statistics
  const stats = useMemo(() => {
    const total = students.length
    const active = students.filter(s => (s.status || "").includes("HỖ TRỢ") || s.status === "ACTIVE" || (s.status || "").includes("THEO DÕI")).length
    const critical = students.filter(s => (s.status || "").includes("CAN THIỆP") || (s.reason || "").toLowerCase().includes("chuyên sâu")).length
    const completed = students.filter(s => (s.status || "").includes("HOÀN THÀNH") || (s.status || "").includes("ỔN ĐỊNH")).length
    return { total, active, critical, completed }
  }, [students])

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredStudents.length === 0) {
      toast.error("Không có dữ liệu học sinh để xuất Excel")
      return
    }

    const rows = filteredStudents.map((s, idx) => {
      const latestEval = s.evaluations && s.evaluations.length > 0 ? s.evaluations[0] : null
      return {
        "STT": idx + 1,
        "Mã HS": s.studentCode || "N/A",
        "Họ và tên": s.studentName || "N/A",
        "Giới tính": s.gender === "FEMALE" ? "Nữ" : (s.gender === "MALE" ? "Nam" : "N/A"),
        "Lớp": s.className || "N/A",
        "Cơ sở": s.campusName || "Sky-Line",
        "GV / Chuyên viên tham vấn": s.counselorName || "Chuyên viên Tâm lý",
        "Bắt đầu theo dõi": formatDateSafe(s.startDate),
        "Vấn đề / Lý do hỗ trợ": s.reason || "Theo dõi tâm lý học đường",
        "Trạng thái": s.status || "Đang hỗ trợ",
        "Điểm trắc nghiệm đầu vào": s.psychologyAssessment?.psychologyScore != null ? s.psychologyAssessment.psychologyScore : "Chưa có",
        "Đánh giá gần nhất": latestEval ? `[${latestEval.periodName}]: ${latestEval.trackingLevel} - ${latestEval.comment}` : "Chưa có lượt đánh giá",
        "Số lượt đánh giá": (s.evaluations || []).length
      }
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Nhat_Ky_Danh_Gia_Tam_Ly")
    XLSX.writeFile(wb, `Nhat_Ky_Danh_Gia_Tam_Ly_Lop_Chu_Nhiem_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success("Đã xuất file Excel Nhật ký đánh giá Tâm lý thành công!")
  }

  return (
    <div className="space-y-6">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200/80 p-5 rounded-3xl shadow-xs transition-all hover:scale-[1.01]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-black text-purple-700 uppercase tracking-wider">HS Hỗ trợ Tâm lý (Lớp CN)</p>
              <p className="text-3xl font-black text-purple-950 mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-purple-600">
              <Brain className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[10px] text-purple-600 mt-2 font-semibold">Tự động đổ theo các lớp Thầy/Cô được phân công chủ nhiệm</p>
        </div>

        <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200/80 p-5 rounded-3xl shadow-xs transition-all hover:scale-[1.01]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-black text-sky-700 uppercase tracking-wider">Đang theo dõi & Hỗ trợ</p>
              <p className="text-3xl font-black text-sky-950 mt-1">{stats.active}</p>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-2xl border border-sky-500/20 text-sky-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[10px] text-sky-600 mt-2 font-semibold">Học sinh đang có tiến trình đồng hành định kỳ hàng tháng</p>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200/80 p-5 rounded-3xl shadow-xs transition-all hover:scale-[1.01]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-black text-rose-700 uppercase tracking-wider">Cần can thiệp chuyên sâu</p>
              <p className="text-3xl font-black text-rose-950 mt-1">{stats.critical}</p>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-600">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[10px] text-rose-600 mt-2 font-semibold">Các trường hợp cần phối hợp chặt chẽ với Phụ huynh</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 p-5 rounded-3xl shadow-xs transition-all hover:scale-[1.01]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">Đã ổn định / Hoàn thành</p>
              <p className="text-3xl font-black text-emerald-950 mt-1">{stats.completed}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[10px] text-emerald-600 mt-2 font-semibold">Đã đạt mục tiêu tâm lý & thích ứng tốt với môi trường</p>
        </div>
      </div>

      {/* Action Toolbar & Filters */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Class filter dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Lớp chủ nhiệm:</span>
              <select
                value={selectedClassFilter}
                onChange={e => setSelectedClassFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="ALL">Tất cả lớp chủ nhiệm ({homeroomClasses.length} lớp)</option>
                {homeroomClasses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.className}
                  </option>
                ))}
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
                <option value="ACTIVE">Đang hỗ trợ / Đang theo dõi</option>
                <option value="CRITICAL">Cần can thiệp chuyên sâu</option>
                <option value="COMPLETED">Đã ổn định / Hoàn thành</option>
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
                placeholder="Tìm tên, mã HS, vấn đề..."
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
                <th className="py-3.5 px-4 min-w-[170px]">GV / Chuyên viên tham vấn</th>
                <th className="py-3.5 px-4 min-w-[120px]">Bắt đầu theo dõi</th>
                <th className="py-3.5 px-4 min-w-[220px]">Vấn đề / Lý do hỗ trợ</th>
                <th className="py-3.5 px-4 text-center min-w-[120px]">Trạng thái</th>
                <th className="py-3.5 px-4 text-center min-w-[160px]">Xem chi tiết kết quả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400 space-y-2">
                    <Brain className="h-10 w-10 text-purple-300 mx-auto opacity-70" />
                    <p className="font-bold text-slate-600 text-sm">Không có học sinh hỗ trợ tâm lý nào phù hợp bộ lọc</p>
                    <p className="text-xs text-slate-400">Dữ liệu được lọc tự động theo các lớp Thầy/Cô được phân công chủ nhiệm.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((item, idx) => {
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

                      {/* 4. GV / Chuyên viên tham vấn */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg shrink-0">
                            <User className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block text-xs">
                              {item.counselorName || "Chuyên viên Tâm lý"}
                            </span>
                            <span className="text-[10px] text-slate-400">Tâm lý học đường</span>
                          </div>
                        </div>
                      </td>

                      {/* 5. Bắt đầu theo dõi */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-xs">
                            {formatDateSafe(item.startDate)}
                          </span>
                        </div>
                      </td>

                      {/* 6. Vấn đề / Lý do hỗ trợ */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-[260px]">
                          <p className="font-semibold text-slate-800 line-clamp-2 leading-snug">
                            {item.reason || "Theo dõi tâm lý & thích ứng học đường"}
                          </p>
                          {item.psychologyAssessment?.psychologyScore != null && (
                            <span className="inline-block mt-1 bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded text-[10px] font-bold">
                              Điểm đầu vào: {item.psychologyAssessment.psychologyScore} đ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7. Trạng thái */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {item.status || "ĐANG HỖ TRỢ"}
                        </span>
                      </td>

                      {/* 8. Xem chi tiết kết quả đánh giá (Hành động) */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentForModal(item)
                            setIsDetailModalOpen(true)
                          }}
                          className="bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm shadow-purple-600/20 inline-flex items-center gap-1.5 cursor-pointer transform active:scale-95"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Xem chi tiết
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

      {/* Detail Modal */}
      {selectedStudentForModal && (
        <PsychologicalDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false)
            setSelectedStudentForModal(null)
          }}
          studentData={selectedStudentForModal}
          academicYearName={academicYearName}
          academicYearId={academicYearId}
          onEvaluationSaved={() => {
            if (onRefresh) onRefresh()
          }}
        />
      )}
    </div>
  )
}
