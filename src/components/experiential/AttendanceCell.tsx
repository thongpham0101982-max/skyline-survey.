"use client"

import React from "react"
import { Check, X, Clock } from "lucide-react"
import { AttendanceStatus } from "@/lib/experiential/activityEvaluationService"

export interface AttendanceCellProps {
  value: AttendanceStatus
  onChange: (val: AttendanceStatus) => void
  disabled?: boolean
}

export function AttendanceCell({ value, onChange, disabled = false }: AttendanceCellProps) {
  return (
    <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("PRESENT")}
        className={`px-2 py-1 rounded-md font-bold transition-all ${
          value === "PRESENT"
            ? "bg-emerald-600 text-white shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
        title="Có mặt"
      >
        <span className="flex items-center gap-1">
          <Check className="w-3 h-3" />
          <span>Có mặt</span>
        </span>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("ABSENT_EXCUSED")}
        className={`px-2 py-1 rounded-md font-bold transition-all ${
          value === "ABSENT_EXCUSED"
            ? "bg-amber-500 text-white shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
        title="Vắng có phép"
      >
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Có phép</span>
        </span>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("ABSENT_UNEXCUSED")}
        className={`px-2 py-1 rounded-md font-bold transition-all ${
          value === "ABSENT_UNEXCUSED"
            ? "bg-rose-600 text-white shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
        title="Vắng không phép"
      >
        <span className="flex items-center gap-1">
          <X className="w-3 h-3" />
          <span>Vắng</span>
        </span>
      </button>
    </div>
  )
}
