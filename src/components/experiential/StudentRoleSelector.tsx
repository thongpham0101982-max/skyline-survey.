"use client"

import React from "react"
import { STANDARD_STUDENT_ROLES } from "@/lib/experiential/activityEvaluationService"

export interface StudentRoleSelectorProps {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
  className?: string
}

export function StudentRoleSelector({ value, onChange, disabled = false, className = "" }: StudentRoleSelectorProps) {
  return (
    <select
      value={value || "THAM_GIA"}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`text-xs py-1 px-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#003B3A] disabled:bg-slate-50 ${className}`}
    >
      {STANDARD_STUDENT_ROLES.map((r) => (
        <option key={r.code} value={r.code}>
          {r.label}
        </option>
      ))}
    </select>
  )
}
