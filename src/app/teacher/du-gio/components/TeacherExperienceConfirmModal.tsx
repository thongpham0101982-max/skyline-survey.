"use client"

import React, { useState } from "react"
import { CheckCircle2, Sparkles, BookOpen, X, AlertCircle } from "lucide-react"

interface TeacherExperienceConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (category: "NEW" | "EXPERIENCED") => Promise<void>
  academicYearName?: string
  teacherName?: string
  currentObserverType?: string | null
  isSubmitting?: boolean
}

export function TeacherExperienceConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  academicYearName = "2026-2027",
  teacherName = "",
  currentObserverType = null,
  isSubmitting = false
}: TeacherExperienceConfirmModalProps) {
  const initialCategory: "NEW" | "EXPERIENCED" =
    currentObserverType === "Giáo viên mới" ? "NEW" : "EXPERIENCED"

  const [selectedCategory, setSelectedCategory] = useState<"NEW" | "EXPERIENCED">(initialCategory)
  const [localSubmitting, setLocalSubmitting] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    setLocalSubmitting(true)
    try {
      await onConfirm(selectedCategory)
    } finally {
      setLocalSubmitting(false)
    }
  }

  const isLoading = isSubmitting || localSubmitting

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* HEADER */}
        <div className="bg-gradient-to-br from-[#003B3A] via-[#015C57] to-[#00A19A] text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 absolute top-4 right-4"
            title="Đóng tạm thời"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30 text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-md flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Chỉ tiêu Chuyên môn • {academicYearName}</span>
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
            Xác nhận Đối tượng Giáo viên
          </h2>
          <p className="text-xs text-teal-100/90 font-medium mt-1 leading-relaxed">
            {teacherName ? <>Kính gửi <strong>{teacherName}</strong>, vui </> : "Vui "}
            lòng xác nhận thâm niên công tác để hệ thống áp dụng đúng định mức chỉ tiêu dự giờ và thao giảng.
          </p>
        </div>

        {/* BODY */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Citation */}
          <div className="p-3 bg-teal-50 border border-teal-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-teal-950 font-medium leading-relaxed">
            <BookOpen className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-teal-900">
                Căn cứ Quy định số tiết dự giờ Hệ thống Giáo dục Sky-Line
              </p>
              <p className="text-[11px] text-teal-800/90 mt-0.5">
                (Mục III.1 Ban Khảo thí và Đảm bảo chất lượng): Định mức số tiết đi dự giờ và thao giảng được áp dụng theo thâm niên dưới 2 năm và trên 2 năm.
              </p>
            </div>
          </div>

          {/* OPTIONS */}
          <div className="space-y-3">
            {/* OPTION 1: GIÁO VIÊN MỚI */}
            <div
              onClick={() => setSelectedCategory("NEW")}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col gap-2.5 ${
                selectedCategory === "NEW"
                  ? "border-teal-600 bg-teal-50/70 shadow-md ring-2 ring-teal-500/20"
                  : "border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${
                    selectedCategory === "NEW" ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    🌱
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Giáo viên mới
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase">
                        Dưới 2 năm
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Mới gia nhập Hệ thống Giáo dục Sky-Line dưới 2 năm kinh nghiệm
                    </p>
                  </div>
                </div>

                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  selectedCategory === "NEW" ? "border-teal-600 bg-teal-600" : "border-slate-300 bg-white"
                }`}>
                  {selectedCategory === "NEW" && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/80">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Đi dự giờ</span>
                  <span className="text-xs font-black text-teal-800">06 tiết / tháng</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Được dự (Dạy)</span>
                  <span className="text-xs font-black text-amber-700">01 tiết / tháng</span>
                </div>
              </div>
            </div>

            {/* OPTION 2: GIÁO VIÊN CŨ */}
            <div
              onClick={() => setSelectedCategory("EXPERIENCED")}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col gap-2.5 ${
                selectedCategory === "EXPERIENCED"
                  ? "border-teal-600 bg-teal-50/70 shadow-md ring-2 ring-teal-500/20"
                  : "border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${
                    selectedCategory === "EXPERIENCED" ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    ⭐
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Giáo viên cũ
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-black uppercase">
                        Trên 2 năm
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Đã công tác và giảng dạy tại Sky-Line từ 2 năm kinh nghiệm trở lên
                    </p>
                  </div>
                </div>

                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  selectedCategory === "EXPERIENCED" ? "border-teal-600 bg-teal-600" : "border-slate-300 bg-white"
                }`}>
                  {selectedCategory === "EXPERIENCED" && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/80">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Đi dự giờ</span>
                  <span className="text-xs font-black text-teal-800">02 tiết / tháng</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Được dự (Dạy)</span>
                  <span className="text-xs font-black text-blue-700">01 tiết / học kỳ</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-amber-50/80 border border-amber-200/60 rounded-xl flex items-center gap-2 text-[11px] text-amber-900 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              Sau khi xác nhận, hệ thống sẽ lưu chỉ tiêu cho năm học {academicYearName} và không hiển thị lại popup này.
            </span>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            Để tôi xác nhận sau
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-black text-white bg-gradient-to-r from-[#003B3A] via-[#016863] to-[#00A19A] hover:brightness-110 active:scale-95 rounded-xl shadow-lg shadow-teal-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang lưu xác nhận...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-teal-200" />
                <span>Xác nhận & Cập nhật chỉ tiêu</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
