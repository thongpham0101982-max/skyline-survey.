"use client"

import React, { useState } from "react"
import { 
  X, Download, FileSpreadsheet, Calendar, LayoutGrid, FileText, 
  CheckCircle2, Layers, Users, Sparkles, Check
} from "lucide-react"
import toast from "react-hot-toast"
import { exportTrackingBookExcel } from "@/lib/support/exportTrackingBookExcel"
import { ACADEMIC_MONTHS } from "../academic-calendar"

interface ExportTrackingBookModalProps {
  isOpen: boolean
  onClose: () => void
  targets: any[]
  filteredTargets?: any[]
  teacherName?: string
  academicYearName?: string
  currentMonth?: string
}

export const ExportTrackingBookModal: React.FC<ExportTrackingBookModalProps> = ({
  isOpen,
  onClose,
  targets,
  filteredTargets = [],
  teacherName = "Giáo viên",
  academicYearName = "2026-2027",
  currentMonth = "Tháng 9"
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    currentMonth !== "ALL" ? currentMonth : "Tháng 9"
  )
  const [scope, setScope] = useState<"FULL" | "WEEK_MATRIX" | "MONTH_MATRIX" | "EVALUATION_LOG">("FULL")
  const [dataScope, setDataScope] = useState<"FILTERED" | "ALL">("FILTERED")
  const [isExporting, setIsExporting] = useState(false)

  if (!isOpen) return null

  const targetListToExport = dataScope === "FILTERED" && filteredTargets.length > 0 ? filteredTargets : targets

  const handleExport = () => {
    if (targetListToExport.length === 0) {
      toast.error("Không có học sinh nào để xuất sổ theo dõi.")
      return
    }

    try {
      setIsExporting(true)
      const fileName = exportTrackingBookExcel(targetListToExport, {
        teacherName,
        academicYearName,
        selectedMonth,
        exportScope: scope,
        fileNamePrefix: "So_Theo_Doi_Tien_Do_Danh_Gia"
      })
      toast.success(`Đã xuất thành công file: ${fileName}`)
      onClose()
    } catch (err: any) {
      console.error("Export tracking book error:", err)
      toast.error(err?.message || "Lỗi khi xuất sổ theo dõi")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-900 via-[#003B3A] to-[#009085] p-5 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs text-teal-200">
              <FileSpreadsheet className="h-6 w-6 text-[#48BFE3]" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Xuất Sổ Theo Dõi Đánh Giá Học Sinh
              </h3>
              <p className="text-xs text-teal-100 font-medium">
                Theo dõi tiến độ đánh giá theo Học sinh, theo Tuần & Tháng của GV phụ trách
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* 1. Chọn định dạng xuất */}
          <div>
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2.5">
              1. Chọn định dạng sổ theo dõi cần xuất:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Trọn bộ */}
              <button
                type="button"
                onClick={() => setScope("FULL")}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative sm:col-span-2 ${
                  scope === "FULL"
                    ? "border-teal-500 bg-teal-50/70 ring-2 ring-teal-500/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${scope === "FULL" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    <Layers className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        Trọn bộ Sổ Theo Dõi (Đầy đủ)
                        <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                          Khuyên dùng
                        </span>
                      </span>
                      {scope === "FULL" && <Check className="h-4 w-4 text-teal-600 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      Bao gồm 4 Sheets: Tiến độ theo Tuần, Tiến trình 10 Tháng, Nhật ký chi tiết từng lần đánh giá & Báo cáo tổng hợp.
                    </p>
                  </div>
                </div>
              </button>

              {/* Option 2: Theo Tuần */}
              <button
                type="button"
                onClick={() => setScope("WEEK_MATRIX")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  scope === "WEEK_MATRIX"
                    ? "border-teal-500 bg-teal-50/70 ring-2 ring-teal-500/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`p-2 rounded-xl shrink-0 ${scope === "WEEK_MATRIX" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">Ma trận theo Tuần</span>
                      {scope === "WEEK_MATRIX" && <Check className="h-4 w-4 text-teal-600 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Tiến độ từng tuần của tháng đã chọn (Tuần 1, 2, 3, 4, 5 & Tổng kết).
                    </p>
                  </div>
                </div>
              </button>

              {/* Option 3: 10 Tháng */}
              <button
                type="button"
                onClick={() => setScope("MONTH_MATRIX")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  scope === "MONTH_MATRIX"
                    ? "border-teal-500 bg-teal-50/70 ring-2 ring-teal-500/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`p-2 rounded-xl shrink-0 ${scope === "MONTH_MATRIX" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    <LayoutGrid className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">Ma trận 10 Tháng</span>
                      {scope === "MONTH_MATRIX" && <Check className="h-4 w-4 text-teal-600 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Tiến trình đánh giá lũy tiến qua 10 tháng năm học (Tháng 8 - Tháng 5).
                    </p>
                  </div>
                </div>
              </button>

              {/* Option 4: Nhật ký chi tiết */}
              <button
                type="button"
                onClick={() => setScope("EVALUATION_LOG")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer sm:col-span-2 ${
                  scope === "EVALUATION_LOG"
                    ? "border-teal-500 bg-teal-50/70 ring-2 ring-teal-500/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`p-2 rounded-xl shrink-0 ${scope === "EVALUATION_LOG" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">Nhật ký chi tiết các lần đánh giá</span>
                      {scope === "EVALUATION_LOG" && <Check className="h-4 w-4 text-teal-600 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Danh sách từng bản ghi nhận xét của GV, ý kiến GVCN, ý kiến PHHS & đề xuất.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Chọn Tháng theo dõi (Áp dụng cho Sheet theo Tuần) */}
          {(scope === "FULL" || scope === "WEEK_MATRIX") && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2">
                2. Chọn Tháng theo dõi tiến độ theo tuần:
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {ACADEMIC_MONTHS.map((m) => {
                  const isSel = selectedMonth === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMonth(m)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        isSel
                          ? "bg-teal-700 text-white shadow-xs scale-105"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 font-medium">
                Ma trận theo tuần sẽ kết xuất các tuần học của <strong className="text-teal-800">{selectedMonth}</strong> và cột tổng kết tương ứng.
              </p>
            </div>
          )}

          {/* 3. Phạm vi học sinh xuất */}
          <div>
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2">
              3. Phạm vi danh sách học sinh:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDataScope("FILTERED")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  dataScope === "FILTERED"
                    ? "border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="text-xs font-black text-slate-900">Theo bộ lọc hiện tại</div>
                <div className="text-xs font-bold text-teal-700 mt-0.5">
                  {filteredTargets.length} học sinh
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDataScope("ALL")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  dataScope === "ALL"
                    ? "border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="text-xs font-black text-slate-900">Tất cả HS phụ trách</div>
                <div className="text-xs font-bold text-slate-600 mt-0.5">
                  {targets.length} học sinh
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-xs font-medium text-slate-500">
            Sẽ xuất <strong className="text-slate-800">{targetListToExport.length}</strong> học sinh • Năm học: {academicYearName}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isExporting || targetListToExport.length === 0}
              onClick={handleExport}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{isExporting ? "Đang tạo file Excel..." : "Tải Sổ Theo Dõi (.xlsx)"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
