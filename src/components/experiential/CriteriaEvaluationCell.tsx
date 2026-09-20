"use client"

import React from "react"
import { EvaluationLevel } from "@/lib/experiential/activityEvaluationService"

export interface CriteriaEvaluationCellProps {
  value?: EvaluationLevel
  onChange: (val: EvaluationLevel) => void
  disabled?: boolean
}

export function CriteriaEvaluationCell({ value, onChange, disabled = false }: CriteriaEvaluationCellProps) {
  return (
    <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px]">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("CHUA_DAT")}
        className={`px-1.5 py-0.5 rounded font-bold transition-all ${
          value === "CHUA_DAT"
            ? "bg-rose-600 text-white shadow-xs"
            : "text-slate-500 hover:text-slate-900"
        }`}
        title="Chưa đạt"
      >
        Chưa đạt
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("DAT")}
        className={`px-1.5 py-0.5 rounded font-bold transition-all ${
          value === "DAT"
            ? "bg-sky-600 text-white shadow-xs"
            : "text-slate-500 hover:text-slate-900"
        }`}
        title="Đạt"
      >
        Đạt
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("TOT")}
        className={`px-1.5 py-0.5 rounded font-bold transition-all ${
          value === "TOT"
            ? "bg-emerald-600 text-white shadow-xs"
            : "text-slate-500 hover:text-slate-900"
        }`}
        title="Tốt"
      >
        Tốt
      </button>
    </div>
  )
}
