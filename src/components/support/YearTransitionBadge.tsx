"use client"

import React from "react"
import { ArrowRight, Sparkles, RefreshCw, CheckCircle2 } from "lucide-react"

export interface YearTransitionBadgeProps {
  sourceType?: string
  isAuto?: boolean
  className?: string
}

export function YearTransitionBadge({ sourceType, isAuto = false, className = "" }: YearTransitionBadgeProps) {
  const s = String(sourceType || "").toUpperCase()

  if (s === "ADMISSION" || s === "KHAO_SAT_DAU_VAO") {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-50 text-sky-800 border border-sky-200 ${className}`}>
        <Sparkles className="w-3 h-3 text-sky-600" />
        <span>Tự động từ khảo sát đầu vào</span>
      </span>
    )
  }

  if (s === "TRANSFERRED" || s === "CHUYEN_TIEP") {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-200 ${className}`}>
        <RefreshCw className="w-3 h-3 text-indigo-600" />
        <span>Chuyển tiếp từ năm trước</span>
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
      <span>Bổ sung trong năm</span>
    </span>
  )
}
