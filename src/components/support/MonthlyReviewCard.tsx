"use client"

import React from "react"
import { Calendar, Award, CheckCircle, ArrowRight } from "lucide-react"
import { StatusBadge } from "@/components/ui/badge"

export interface MonthlyReviewCardProps {
  monthName: string
  date: string
  evaluatorName?: string
  initialState?: string
  progressionSummary: string
  difficulties?: string
  supportExecuted?: string
  conclusion: "CONTINUE" | "TERMINATE" | "ADJUST" | string
  conclusionNotes?: string
  className?: string
}

export function MonthlyReviewCard({
  monthName,
  date,
  evaluatorName,
  initialState,
  progressionSummary,
  difficulties,
  supportExecuted,
  conclusion,
  conclusionNotes,
  className = ""
}: MonthlyReviewCardProps) {
  let conclLabel = "Tiếp tục theo dõi"
  let conclVariant: "status-neutral" | "status-info" | "status-warning" | "status-success" | "status-error" = "status-info"

  const c = String(conclusion).toUpperCase()
  if (c === "TERMINATE" || c === "CHAM_DUT") {
    conclLabel = "Đã hoàn thành / Chấm dứt theo dõi"
    conclVariant = "status-success"
  } else if (c === "ADJUST" || c === "DIEU_CHINH") {
    conclLabel = "Cần điều chỉnh phương pháp hỗ trợ"
    conclVariant = "status-warning"
  }

  return (
    <div className={`p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/70 shadow-xs space-y-3.5 ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#003B3A] text-white rounded-xl">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-sm text-slate-900 uppercase tracking-tight">
              ĐÁNH GIÁ THÁNG: {monthName}
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Ngày đánh giá: {date}</span>
          </div>
        </div>
        <StatusBadge status={conclVariant} label={conclLabel} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="bg-white p-3 rounded-xl border border-slate-200/80">
          <span className="font-extrabold text-[#003B3A] block mb-1">Diễn biến trong tháng:</span>
          <p className="text-slate-700 leading-relaxed">{progressionSummary}</p>
        </div>

        {difficulties && (
          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <span className="font-extrabold text-amber-800 block mb-1">Khó khăn còn gặp:</span>
            <p className="text-slate-700 leading-relaxed">{difficulties}</p>
          </div>
        )}
      </div>

      {supportExecuted && (
        <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200/80">
          <span className="font-bold text-slate-800">Biện pháp hỗ trợ đã thực hiện: </span>
          {supportExecuted}
        </div>
      )}

      {conclusionNotes && (
        <div className="pt-2 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <span className="font-bold text-[#003B3A]">Kết luận của Hội đồng hỗ trợ:</span>
          <span>{conclusionNotes}</span>
        </div>
      )}

      {evaluatorName && (
        <div className="text-[10px] text-slate-400 text-right">
          Người đánh giá: {evaluatorName}
        </div>
      )}
    </div>
  )
}
