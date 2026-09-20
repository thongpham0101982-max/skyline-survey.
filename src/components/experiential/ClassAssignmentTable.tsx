"use client"

import React from "react"
import { StatusBadge } from "@/components/ui/badge"

export interface ClassAssignmentItem {
  classId: string
  className: string
  campusName: string
  homeroomTeacherName: string
  studentCount: number
  isAssigned: boolean
  evaluationStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
}

export interface ClassAssignmentTableProps {
  classes: ClassAssignmentItem[]
  onToggleClass: (classId: string) => void
  disabled?: boolean
  className?: string
}

export function ClassAssignmentTable({
  classes,
  onToggleClass,
  disabled = false,
  className = ""
}: ClassAssignmentTableProps) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs ${className}`}>
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
            <th className="py-2.5 px-3 w-10 text-center">Chọn</th>
            <th className="py-2.5 px-3">Lớp học</th>
            <th className="py-2.5 px-3">Cơ sở</th>
            <th className="py-2.5 px-3">GVCN phụ trách đánh giá</th>
            <th className="py-2.5 px-3 text-right">Sĩ số HS</th>
            <th className="py-2.5 px-3 text-center">Tiến độ đánh giá</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
          {classes.map((c) => {
            let statusVariant: "status-neutral" | "status-info" | "status-warning" | "status-success" | "status-error" = "status-neutral"
            let statusLabel = "Chưa thực hiện"

            if (c.evaluationStatus === "COMPLETED") {
              statusVariant = "status-success"
              statusLabel = "Đã hoàn thành"
            } else if (c.evaluationStatus === "IN_PROGRESS") {
              statusVariant = "status-warning"
              statusLabel = "Đang đánh giá"
            }

            return (
              <tr key={c.classId} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-2 px-3 text-center">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={c.isAssigned}
                    onChange={() => onToggleClass(c.classId)}
                    className="rounded border-slate-300 text-[#003B3A] focus:ring-[#003B3A] cursor-pointer"
                  />
                </td>
                <td className="py-2 px-3 font-bold text-slate-900">{c.className}</td>
                <td className="py-2 px-3 text-slate-500">{c.campusName}</td>
                <td className="py-2 px-3 font-semibold text-slate-700">
                  {c.homeroomTeacherName || (
                    <span className="text-amber-600 italic">Chưa xác định người đánh giá</span>
                  )}
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-800">{c.studentCount}</td>
                <td className="py-2 px-3 text-center">
                  <StatusBadge status={statusVariant} label={statusLabel} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
