"use client"

import React from "react"
import { AttendanceStatus, EvaluationLevel, ActivityCriteriaDefinition, calculateStudentActivityResult } from "@/lib/experiential/activityEvaluationService"
import { AttendanceCell } from "./AttendanceCell"
import { StudentRoleSelector } from "./StudentRoleSelector"
import { CriteriaEvaluationCell } from "./CriteriaEvaluationCell"
import { StatusBadge } from "@/components/ui/badge"

export interface RosterStudentItem {
  studentId: string
  studentCode: string
  studentName: string
  attendance: AttendanceStatus
  role: string
  criteriaScores: Record<string, EvaluationLevel>
  notes?: string
}

export interface ExperienceRosterProps {
  students: RosterStudentItem[]
  criteria: ActivityCriteriaDefinition[]
  onUpdateStudent: (studentId: string, updates: Partial<RosterStudentItem>) => void
  onBulkMarkAttendance?: (status: AttendanceStatus) => void
  disabled?: boolean
  className?: string
}

export function ExperienceRoster({
  students,
  criteria,
  onUpdateStudent,
  onBulkMarkAttendance,
  disabled = false,
  className = ""
}: ExperienceRosterProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Quick Bulk Action Bar */}
      {onBulkMarkAttendance && !disabled && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <span className="font-bold text-slate-700">Thao tác nhanh cho cả lớp:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onBulkMarkAttendance("PRESENT")}
              className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              ✓ Đánh dấu tất cả Có mặt
            </button>
          </div>
        </div>
      )}

      {/* Main Roster Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <th className="py-2.5 px-3 w-12 text-center sticky left-0 bg-slate-50 z-10">STT</th>
              <th className="py-2.5 px-3 min-w-[180px] sticky left-12 bg-slate-50 z-10">Họ và tên</th>
              <th className="py-2.5 px-3 min-w-[170px]">Điểm danh</th>
              <th className="py-2.5 px-3 min-w-[160px]">Vai trò</th>
              {criteria.map((c) => (
                <th key={c.id} className="py-2.5 px-3 min-w-[140px] text-center">
                  {c.name}
                  {c.isRequired && <span className="text-red-500 ml-0.5">*</span>}
                </th>
              ))}
              <th className="py-2.5 px-3 w-28 text-center">Kết quả</th>
              <th className="py-2.5 px-3 min-w-[180px]">Nhận xét cá nhân</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {students.map((st, idx) => {
              const res = calculateStudentActivityResult(st.attendance, st.criteriaScores, criteria, st.role)

              return (
                <tr key={st.studentId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2 px-3 text-center text-slate-400 font-mono sticky left-0 bg-white z-10">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 sticky left-12 bg-white z-10">
                    <span className="font-bold text-slate-900 block">{st.studentName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{st.studentCode}</span>
                  </td>
                  <td className="py-2 px-3">
                    <AttendanceCell
                      value={st.attendance}
                      disabled={disabled}
                      onChange={(att) => onUpdateStudent(st.studentId, { attendance: att })}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <StudentRoleSelector
                      value={st.role}
                      disabled={disabled || st.attendance !== "PRESENT"}
                      onChange={(role) => onUpdateStudent(st.studentId, { role })}
                    />
                  </td>
                  {criteria.map((c) => (
                    <td key={c.id} className="py-2 px-3 text-center">
                      <CriteriaEvaluationCell
                        value={st.criteriaScores[c.id]}
                        disabled={disabled || st.attendance !== "PRESENT"}
                        onChange={(lvl) => {
                          const newScores = { ...st.criteriaScores, [c.id]: lvl }
                          onUpdateStudent(st.studentId, { criteriaScores: newScores })
                        }}
                      />
                    </td>
                  ))}
                  <td className="py-2 px-3 text-center">
                    <StatusBadge
                      status={res.resultColor as any}
                      label={res.resultLabel}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      disabled={disabled}
                      value={st.notes || ""}
                      placeholder="Nhận xét sự nỗ lực..."
                      onChange={(e) => onUpdateStudent(st.studentId, { notes: e.target.value })}
                      className="w-full text-xs p-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#003B3A]"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
