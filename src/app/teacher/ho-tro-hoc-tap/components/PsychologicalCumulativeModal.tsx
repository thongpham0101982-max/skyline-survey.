"use client"

import { useState } from "react"
import { Heart, X, Printer, Download, Search, CheckCircle2, AlertTriangle, Filter, Sparkles, Brain } from "lucide-react"
import * as xlsx from "xlsx"
import toast from "react-hot-toast"
import { ACADEMIC_MONTHS } from "../academic-calendar"

interface Props {
  isOpen: boolean
  onClose: () => void
  targets: any[]
  academicYearName?: string
}

export function PsychologicalCumulativeModal({
  isOpen,
  onClose,
  targets,
  academicYearName = "2026-2027"
}: Props) {
  const [searchTerm, setSearchTerm] = useState("")
  const [classFilter, setClassFilter] = useState("ALL")

  if (!isOpen) return null

  // Filter only students with psychological support / or all targets if requested
  const psychTargets = targets.filter(t => {
    const isPsych = t.supportType === "PSYCHOLOGICAL" || 
      (t.reason && t.reason.toLowerCase().includes("tâm lý")) ||
      (t.notes && t.notes.toLowerCase().includes("tâm lý"))
    return isPsych
  })

  // Extract unique classes
  const classes = Array.from(new Set(psychTargets.map(t => t.student?.class?.className || t.student?.className).filter(Boolean)))

  const filtered = psychTargets.filter(t => {
    const sName = (t.student?.studentName || t.student?.fullName || "").toLowerCase()
    const sCode = (t.student?.studentCode || "").toLowerCase()
    const cName = t.student?.class?.className || t.student?.className || ""
    const matchesSearch = !searchTerm || sName.includes(searchTerm.toLowerCase()) || sCode.includes(searchTerm.toLowerCase())
    const matchesClass = classFilter === "ALL" || cName === classFilter
    return matchesSearch && matchesClass
  })

  // Export to Excel function
  const handleExportExcel = () => {
    if (filtered.length === 0) {
      toast.error("Không có dữ liệu học sinh tâm lý để xuất file")
      return
    }

    const rows = filtered.map((t, idx) => {
      const evals = t.evaluations || []
      const rowData: any = {
        "STT": idx + 1,
        "Mã HS": t.student?.studentCode || "N/A",
        "Họ và tên": t.student?.studentName || t.student?.fullName || "N/A",
        "Lớp": t.student?.class?.className || t.student?.className || "N/A",
        "Vấn đề tâm lý / Lý do theo dõi": t.reason || "Theo dõi tâm lý học đường",
        "Trạng thái": t.status || "Đang theo dõi"
      }

      // Add 10 Months progression
      ACADEMIC_MONTHS.forEach(m => {
        const mEvals = evals.filter((e: any) => e.periodName?.includes(m) || e.periodName === m)
        if (mEvals.length > 0) {
          const summary = mEvals.map((e: any) => `[${e.periodName}]: ${e.trackingLevel} - ${e.comment}`).join(" | ")
          rowData[m] = summary
        } else {
          rowData[m] = "-"
        }
      })

      rowData["Đề xuất / Kết luận"] = t.outcome || t.notes || "Tiếp tục theo dõi"
      return rowData
    })

    const ws = xlsx.utils.json_to_sheet(rows)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, "So_Tam_Ly_Luy_Tien")
    xlsx.writeFile(wb, `So_Theo_Doi_Tam_Ly_Luy_Tien_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success("Đã xuất file Excel Sổ theo dõi Tâm lý Lũy tiến thành công!")
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-all">
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-xs">
              <Brain className="h-5 w-5 text-purple-300" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                SỔ THEO DÕI ĐÁNH GIÁ TÂM LÝ HỌC SINH LŨY TIẾN (10 THÁNG NĂM HỌC)
              </h3>
              <p className="text-xs text-purple-200 font-medium">
                Theo dõi tiến trình thích ứng, diễn biến tâm lý & biện pháp can thiệp từng tuần/tháng ({academicYearName})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Xuất Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-white/20 hover:bg-white/30 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              In sổ theo dõi
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-xl transition-all text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Filter */}
        <div className="px-6 py-3 border-b bg-slate-50/80 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo tên hoặc mã học sinh..."
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">Tất cả lớp ({psychTargets.length})</option>
              {classes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="text-xs font-bold text-purple-900">
            Tổng cộng: <strong className="text-purple-700">{filtered.length}</strong> học sinh diện tâm lý
          </div>
        </div>

        {/* Body Table */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4" id="psychological-record-print">
          {/* Print Header */}
          <div className="hidden print:block text-center space-y-1 mb-4 border-b pb-4">
            <div className="text-[11px] font-black uppercase text-purple-900">HỆ THỐNG GIÁO DỤC SKY-LINE • BAN TÂM LÝ HỌC ĐƯỜNG</div>
            <h1 className="text-base font-black uppercase">SỔ THEO DÕI ĐÁNH GIÁ TÂM LÝ HỌC SINH LŨY TIẾN</h1>
            <div className="text-xs text-slate-600 font-bold">Năm học: {academicYearName}</div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <Brain className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-500">
                Không tìm thấy học sinh nào thuộc diện theo dõi Tâm lý phù hợp với bộ lọc.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filtered.map((target, idx) => {
                const evals = target.evaluations || []
                const sortedEvals = [...evals].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

                return (
                  <div key={target.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    {/* Student Mini Header */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50/50 p-4 border-b flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-purple-700 text-white font-black text-xs flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">
                            {target.student?.studentName || target.student?.fullName}
                            <span className="text-xs text-slate-500 font-bold ml-2">({target.student?.studentCode})</span>
                          </h4>
                          <span className="text-xs font-extrabold text-purple-800">
                            Lớp: {target.student?.class?.className || target.student?.className} • Vấn đề: {target.reason || "Tâm lý học đường"}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-200">
                        {target.status || "Đang theo dõi"}
                      </span>
                    </div>

                    {/* Timeline Grid across Months */}
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {ACADEMIC_MONTHS.map(month => {
                          const monthEvals = sortedEvals.filter(e => e.periodName?.includes(month) || e.periodName === month)
                          const hasEval = monthEvals.length > 0
                          const latest = monthEvals[monthEvals.length - 1]

                          return (
                            <div
                              key={month}
                              className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                                hasEval
                                  ? "bg-purple-50/50 border-purple-200"
                                  : "bg-slate-50/50 border-slate-200 opacity-60"
                              }`}
                            >
                              <div className="flex justify-between items-center font-bold">
                                <span className="text-purple-950 font-black">{month}</span>
                                {hasEval && (
                                  <span className="text-[10px] font-black text-purple-800 bg-purple-200/60 px-1.5 py-0.2 rounded">
                                    {latest?.trackingLevel || "Đã ĐG"}
                                  </span>
                                )}
                              </div>
                              {hasEval ? (
                                <p className="text-[11px] text-slate-700 line-clamp-3 italic">
                                  &ldquo;{latest?.comment}&rdquo;
                                </p>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Chưa có bản ghi</span>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Detailed Progression List */}
                      {sortedEvals.length > 0 && (
                        <div className="border-t pt-2 space-y-1.5">
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight block">
                            Chi tiết tiến trình đánh giá & can thiệp từng kỳ ({sortedEvals.length} bản ghi):
                          </span>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {sortedEvals.map((ev: any) => (
                              <div key={ev.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs flex justify-between items-start gap-3">
                                <div>
                                  <div className="font-black text-purple-900">
                                    {ev.periodName} ({ev.periodType === "MONTH" ? "Đánh giá Tháng" : "Đánh giá Tuần"}) — <span className="text-slate-800 font-bold">{ev.trackingLevel}</span>
                                  </div>
                                  <p className="text-slate-600 mt-0.5">{ev.comment}</p>
                                  {ev.updatedStatus && (
                                    <div className="text-[10px] font-extrabold text-indigo-700 mt-0.5">
                                      👉 Đề xuất: {ev.updatedStatus}
                                    </div>
                                  )}
                                </div>
                                <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                                  {new Date(ev.createdAt).toLocaleDateString("vi-VN")}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t flex justify-end bg-slate-50 no-print">
          <button
            type="button"
            onClick={onClose}
            className="border hover:bg-slate-100 py-2 px-5 rounded-xl text-xs font-bold transition-all text-slate-600 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
