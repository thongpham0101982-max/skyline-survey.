"use client"

import React, { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import {
  HierarchyNodeMetrics,
  PsychHierarchyNodeMetrics,
} from "@/lib/student-statistics/types"
import { formatRateWithFraction } from "@/lib/student-statistics/formatters"

function formatPct(rate: number | null): string {
  if (rate === null || rate === undefined) return "—"
  return `${rate.toFixed(1).replace(".", ",")}%`
}

interface AcademicHierarchyTableProps {
  title: string
  subtitle?: string
  root: HierarchyNodeMetrics
  onSelectCampus?: (campusId: string) => void
  onSelectClass?: (campusId: string, classId: string) => void
}

export function AcademicHierarchyBreakdownTable({
  title,
  subtitle = "Cơ cấu Toàn hệ thống → Cơ sở → Khối → Lớp theo kỳ định kỳ gần nhất",
  root,
  onSelectCampus,
  onSelectClass,
}: AcademicHierarchyTableProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = { [root.id]: true }
    for (const cp of root.children || []) {
      init[cp.id] = true
    }
    return init
  })

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  const setAllExpanded = (val: boolean) => {
    const next: Record<string, boolean> = { [root.id]: true }
    for (const cp of root.children || []) {
      next[cp.id] = val
      for (const gr of cp.children || []) {
        next[gr.id] = val
      }
    }
    setExpanded(next)
  }

  const renderNode = (node: HierarchyNodeMetrics, depth: number): React.ReactNode => {
    const hasChildren = Boolean(node.children && node.children.length > 0)
    const isOpen = expanded[node.id] ?? depth === 0

    const rowBg =
      node.nodeType === "SYSTEM"
        ? "bg-[#F0FDFA] font-bold text-[#003B3A]"
        : node.nodeType === "CAMPUS"
          ? "bg-[#F8FAFC] font-semibold text-[#003B3A]"
          : node.nodeType === "GRADE"
            ? "bg-white font-medium text-slate-800"
            : "bg-white text-slate-700"

    return (
      <React.Fragment key={node.id}>
        <tr className={`transition-colors align-middle hover:bg-[#F0FDFA]/70 ${rowBg}`}>
          <td
            className="py-2.5 pr-3 whitespace-nowrap"
            style={{ paddingLeft: `${depth * 18 + 12}px` }}
          >
            <div className="inline-flex items-center gap-1.5">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggle(node.id)}
                  className="p-0.5 rounded hover:bg-slate-200/70 text-slate-500"
                  aria-label={isOpen ? "Thu gọn" : "Mở rộng"}
                >
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              ) : (
                <span className="w-4 inline-block" />
              )}
              {node.nodeType === "CAMPUS" && node.campusId && onSelectCampus ? (
                <button
                  type="button"
                  onClick={() => onSelectCampus(node.campusId!)}
                  className="hover:underline text-left"
                >
                  {node.label}
                </button>
              ) : node.nodeType === "CLASS" && node.campusId && node.classId && onSelectClass ? (
                <button
                  type="button"
                  onClick={() => onSelectClass(node.campusId!, node.classId!)}
                  className="hover:underline text-[#00736E] text-left"
                >
                  {node.label}
                </button>
              ) : (
                <span>{node.label}</span>
              )}
            </div>
          </td>
          <td className="py-2.5 px-3 text-right">{node.distinctStudentCount}</td>
          <td className="py-2.5 px-3 text-right text-slate-600">
            {node.enrolledStudentCount > 0 ? (
              <span>
                {formatPct(node.enrolledShareRate)}{" "}
                <span className="text-[10px] text-slate-400">
                  ({node.distinctStudentCount}/{node.enrolledStudentCount})
                </span>
              </span>
            ) : (
              "—"
            )}
          </td>
          <td className="py-2.5 px-3 text-right">{node.trackedRowCount}</td>
          <td className="py-2.5 px-3 text-right">{node.eligibleRowCount}</td>
          <td className="py-2.5 px-3 text-right text-[#00736E]">{node.standardBandCount}</td>
          <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
            {node.outstandingCount}
          </td>
          <td className="py-2.5 px-3 text-right text-rose-600">{node.belowStandardCount}</td>
          <td className="py-2.5 px-3 text-right font-semibold text-[#003B3A]">
            {formatRateWithFraction(
              node.totalStandardMetCount,
              node.eligibleRowCount,
              node.standardRate
            )}
          </td>
        </tr>
        {hasChildren && isOpen && node.children!.map((child) => renderNode(child, depth + 1))}
      </React.Fragment>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-[#003B3A]">{title}</div>
          <div className="text-xs text-slate-500">{subtitle}</div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setAllExpanded(true)}
            className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
          >
            Mở rộng tất cả
          </button>
          <button
            type="button"
            onClick={() => setAllExpanded(false)}
            className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
          >
            Thu gọn khối/lớp
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[920px]">
          <thead className="bg-[#003B3A] border-b border-[#003B3A]">
            <tr className="text-[11px] font-semibold whitespace-nowrap">
              <th className="py-2.5 px-3 text-left text-white">Đơn vị (Hệ thống / Cơ sở / Khối / Lớp)</th>
              <th className="py-2.5 px-3 text-right text-teal-100">Số HS</th>
              <th className="py-2.5 px-3 text-right text-teal-100">% so với HS nhập học</th>
              <th className="py-2.5 px-3 text-right text-teal-100">Lượt theo dõi</th>
              <th className="py-2.5 px-3 text-right text-teal-100">Đủ điểm xét chuẩn</th>
              <th className="py-2.5 px-3 text-right text-teal-100">Đạt chuẩn (7–8 / 5–7)</th>
              <th className="py-2.5 px-3 text-right text-[#5EEAD4]">Tiến bộ vượt bậc (9–10 / 8–10)</th>
              <th className="py-2.5 px-3 text-right text-teal-100">Chưa đạt chuẩn</th>
              <th className="py-2.5 px-3 text-right text-[#5EEAD4]">Tỷ lệ đạt chuẩn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
            {root.distinctStudentCount === 0 && (!root.children || root.children.length === 0) ? (
              <tr>
                <td colSpan={9} className="py-8 px-3 text-center text-slate-500">
                  Chưa có dữ liệu phù hợp
                </td>
              </tr>
            ) : (
              renderNode(root, 0)
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface PsychHierarchyTableProps {
  title: string
  subtitle?: string
  root: PsychHierarchyNodeMetrics
  onSelectCampus?: (campusId: string) => void
  onSelectClass?: (campusId: string, classId: string) => void
}

export function PsychHierarchyBreakdownTable({
  title,
  subtitle = "Cơ cấu Toàn hệ thống → Cơ sở → Khối → Lớp",
  root,
  onSelectCampus,
  onSelectClass,
}: PsychHierarchyTableProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = { [root.id]: true }
    for (const cp of root.children || []) {
      init[cp.id] = true
    }
    return init
  })

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  const setAllExpanded = (val: boolean) => {
    const next: Record<string, boolean> = { [root.id]: true }
    for (const cp of root.children || []) {
      next[cp.id] = val
      for (const gr of cp.children || []) {
        next[gr.id] = val
      }
    }
    setExpanded(next)
  }

  const renderNode = (node: PsychHierarchyNodeMetrics, depth: number): React.ReactNode => {
    const hasChildren = Boolean(node.children && node.children.length > 0)
    const isOpen = expanded[node.id] ?? depth === 0

    const rowBg =
      node.nodeType === "SYSTEM"
        ? "bg-[#F0FDFA] font-bold text-[#003B3A]"
        : node.nodeType === "CAMPUS"
          ? "bg-[#F8FAFC] font-semibold text-[#003B3A]"
          : node.nodeType === "GRADE"
            ? "bg-white font-medium text-slate-800"
            : "bg-white text-slate-700"

    return (
      <React.Fragment key={node.id}>
        <tr className={`transition-colors align-middle hover:bg-[#F0FDFA]/70 ${rowBg}`}>
          <td
            className="py-2.5 pr-3 whitespace-nowrap"
            style={{ paddingLeft: `${depth * 18 + 12}px` }}
          >
            <div className="inline-flex items-center gap-1.5">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggle(node.id)}
                  className="p-0.5 rounded hover:bg-slate-200/70 text-slate-500"
                  aria-label={isOpen ? "Thu gọn" : "Mở rộng"}
                >
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              ) : (
                <span className="w-4 inline-block" />
              )}
              {node.nodeType === "CAMPUS" && node.campusId && onSelectCampus ? (
                <button
                  type="button"
                  onClick={() => onSelectCampus(node.campusId!)}
                  className="hover:underline text-left"
                >
                  {node.label}
                </button>
              ) : node.nodeType === "CLASS" && node.campusId && node.classId && onSelectClass ? (
                <button
                  type="button"
                  onClick={() => onSelectClass(node.campusId!, node.classId!)}
                  className="hover:underline text-[#00736E] text-left"
                >
                  {node.label}
                </button>
              ) : (
                <span>{node.label}</span>
              )}
            </div>
          </td>
          <td className="py-2.5 px-3 text-right">{node.totalStudents}</td>
          <td className="py-2.5 px-3 text-right text-slate-600">
            {node.enrolledStudentCount > 0 ? (
              <span>
                {formatPct(node.enrolledShareRate)}{" "}
                <span className="text-[10px] text-slate-400">
                  ({node.totalStudents}/{node.enrolledStudentCount})
                </span>
              </span>
            ) : (
              "—"
            )}
          </td>
          <td className="py-2.5 px-3 text-right text-rose-600">{node.unassignedStudents}</td>
          <td className="py-2.5 px-3 text-right text-amber-700">{node.overdueStudents}</td>
          <td className="py-2.5 px-3 text-right">{node.duePendingStudents}</td>
          <td className="py-2.5 px-3 text-right text-emerald-700">{node.completedAllDueStudents}</td>
          <td className="py-2.5 px-3 text-right font-semibold text-[#00736E]">
            {formatRateWithFraction(
              node.monthSummarizedStudents,
              node.totalStudents,
              node.monthSummaryRate
            )}
          </td>
        </tr>
        {hasChildren && isOpen && node.children!.map((child) => renderNode(child, depth + 1))}
      </React.Fragment>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-[#003B3A]">{title}</div>
          <div className="text-xs text-slate-500">{subtitle}</div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setAllExpanded(true)}
            className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
          >
            Mở rộng tất cả
          </button>
          <button
            type="button"
            onClick={() => setAllExpanded(false)}
            className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
          >
            Thu gọn khối/lớp
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[860px]">
          <thead className="bg-[#003B3A] border-b border-[#003B3A]">
            <tr className="text-[11px] font-semibold whitespace-nowrap">
              <th className="py-2.5 px-3 text-left text-white">Đơn vị (Hệ thống / Cơ sở / Khối / Lớp)</th>
              <th className="py-2.5 px-3 text-right text-teal-100">HS thuộc diện</th>
              <th className="py-2.5 px-3 text-right text-teal-100">% so với HS nhập học</th>
              <th className="py-2.5 px-3 text-right text-teal-100">Chưa phân công</th>
              <th className="py-2.5 px-3 text-right text-teal-100">Có ĐG quá hạn</th>
              <th className="py-2.5 px-3 text-right text-teal-100">Còn lượt đến hạn</th>
              <th className="py-2.5 px-3 text-right text-teal-100">Đã cập nhật đủ</th>
              <th className="py-2.5 px-3 text-right text-[#5EEAD4]">Tỷ lệ tổng kết tháng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
            {root.totalStudents === 0 && (!root.children || root.children.length === 0) ? (
              <tr>
                <td colSpan={8} className="py-8 px-3 text-center text-slate-500">
                  Chưa có dữ liệu phù hợp
                </td>
              </tr>
            ) : (
              renderNode(root, 0)
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
