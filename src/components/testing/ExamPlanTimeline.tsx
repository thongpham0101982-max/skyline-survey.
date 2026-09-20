"use client"

import React from "react"
import { StatusBadge } from "@/components/ui/badge"
import { Calendar, User, FileText, Monitor, BookOpen } from "lucide-react"

export interface ExamPlanItem {
  id: string
  periodName: string
  academicYear: string
  subjectName: string
  grade: string
  format: "ONLINE" | "LMS" | "PAPER" | "PROJECT" | "PRACTICE"
  examDate: string
  personInCharge: string
  questionCount: number
  status: "DRAFT" | "READY" | "IN_PROGRESS" | "COMPLETED"
}

interface ExamPlanTimelineProps {
  plans: ExamPlanItem[]
  onSelectPlan?: (p: ExamPlanItem) => void
}

export function ExamPlanTimeline({ plans, onSelectPlan }: ExamPlanTimelineProps) {
  const formatIconMap: Record<string, any> = {
    ONLINE: Monitor,
    LMS: Monitor,
    PAPER: FileText,
    PROJECT: BookOpen,
    PRACTICE: BookOpen
  }

  const formatLabelMap: Record<string, string> = {
    ONLINE: "Trực tuyến",
    LMS: "LMS",
    PAPER: "Thi giấy",
    PROJECT: "Báo cáo dự án",
    PRACTICE: "Thực hành"
  }

  const statusMap: Record<string, { status: "neutral" | "warning" | "info" | "success"; label: string }> = {
    DRAFT: { status: "neutral", label: "Đang xây dựng" },
    READY: { status: "warning", label: "Đã duyệt / Sẵn sàng" },
    IN_PROGRESS: { status: "info", label: "Đang tổ chức" },
    COMPLETED: { status: "success", label: "Đã có kết quả" }
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
      <table className="w-full text-xs text-left">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
          <tr>
            <th className="py-2.5 px-3">Kỳ kiểm tra</th>
            <th className="py-2.5 px-3">Môn & Khối</th>
            <th className="py-2.5 px-3">Hình thức</th>
            <th className="py-2.5 px-3">Thời gian</th>
            <th className="py-2.5 px-3">Phụ trách</th>
            <th className="py-2.5 px-3 text-center">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {plans.map((p) => {
            const FIcon = formatIconMap[p.format] || FileText
            const st = statusMap[p.status] || { status: "neutral", label: p.status }

            return (
              <tr
                key={p.id}
                onClick={() => onSelectPlan && onSelectPlan(p)}
                className="hover:bg-slate-50/70 cursor-pointer transition-colors"
              >
                <td className="py-2.5 px-3">
                  <div className="font-bold text-slate-900">{p.periodName}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{p.academicYear}</div>
                </td>
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-slate-800">{p.subjectName}</div>
                  <div className="text-[11px] text-slate-500">Khối {p.grade}</div>
                </td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                    <FIcon className="w-3 h-3 text-slate-500" />
                    <span>{formatLabelMap[p.format] || p.format}</span>
                  </span>
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{p.examDate}</span>
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-700">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>{p.personInCharge}</span>
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center">
                  <StatusBadge status={st.status} label={st.label} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
