"use client"

import React, { useMemo, useState } from "react"
import { ArrowRight, ChevronDown, ChevronRight, Info } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  HierarchyNodeMetrics,
  OverviewAcademicEvalSummary,
  OverviewCohortStats,
  OverviewHierarchyNode,
  OverviewPsychEvalSummary,
  OverviewReportPayload,
  PsychHierarchyNodeMetrics,
  StudentStatisticsTab,
} from "@/lib/student-statistics/types"
import { formatRateWithFraction } from "@/lib/student-statistics/formatters"

interface OverviewTabProps {
  data: OverviewReportPayload
  onJumpToTab: (tab: StudentStatisticsTab, campusId?: string, classId?: string) => void
}

function formatPct(rate: number | null): string {
  if (rate === null || rate === undefined) return "—"
  return `${rate.toFixed(1).replace(".", ",")}%`
}

function formatBasisCompact(counts?: Record<"KSĐN" | "GK1" | "CK1" | "GK2" | "CK2", number>): string {
  if (!counts) return ""
  const order: Array<"CK2" | "GK2" | "CK1" | "GK1" | "KSĐN"> = ["CK2", "GK2", "CK1", "GK1", "KSĐN"]
  const parts: string[] = []
  for (const k of order) {
    if ((counts[k] || 0) > 0) parts.push(`${k}: ${counts[k]}`)
  }
  return parts.join(" · ")
}

function CohortCell({
  stats,
  enrolledCount,
  isPsych = false,
}: {
  stats: OverviewCohortStats
  enrolledCount: number
  isPsych?: boolean
}) {
  const unitLabel = isPsych ? "HS" : "lượt"
  const prefix = isPsych ? "Tổng kết" : "Đạt chuẩn"
  const pctStr =
    stats.standardEligibleCount > 0 && stats.standardRate !== null
      ? `${stats.standardMetCount}/${stats.standardEligibleCount} ${unitLabel} (${formatPct(stats.standardRate)})`
      : "—"
  return (
    <div className="leading-tight">
      <div className="font-semibold text-slate-900">
        {stats.studentCount} HS{" "}
        <span className="text-[11px] font-normal text-slate-500">
          ({enrolledCount > 0 ? formatPct(stats.shareOfEnrolledRate) : "—"})
        </span>
      </div>
      <div className="text-[11px] text-[#00736E]">
        {prefix}: {pctStr}
      </div>
    </div>
  )
}

function AcademicCohortEvalSection({
  sectionNumber,
  title,
  cohortLabel,
  tab,
  evalData,
  isAllSystem,
  onJumpToTab,
}: {
  sectionNumber: number
  title: string
  cohortLabel: string
  tab: StudentStatisticsTab
  evalData: OverviewAcademicEvalSummary
  isAllSystem: boolean
  onJumpToTab: (tab: StudentStatisticsTab, campusId?: string) => void
}) {
  const root = evalData.hierarchy
  const campuses = root.children || []
  const basisTxt = formatBasisCompact(evalData.basisPeriodCounts)

  const chartData = campuses.map((cp) => ({
    name: cp.code || cp.label,
    fullName: cp.label,
    campusId: cp.campusId || cp.id,
    rate: cp.standardRate ?? 0,
    hasDenominator: cp.eligibleRowCount > 0,
    metCount: cp.totalStandardMetCount,
    eligibleCount: cp.eligibleRowCount,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderBarLabel(props: any) {
    const { x, y, width, index } = props
    const row = chartData[index]
    if (!row) return null
    const cx = Number(x ?? 0) + Number(width ?? 0) / 2
    const topY = Number(y ?? 0)
    if (!row.hasDenominator) {
      return (
        <text x={cx} y={topY - 6} textAnchor="middle" fill="#94A3B8" fontSize={10} fontWeight={600}>
          —
        </text>
      )
    }
    return (
      <g>
        <text x={cx} y={topY - 15} textAnchor="middle" fill="#003B3A" fontSize={10.5} fontWeight={700}>
          {row.rate.toFixed(1).replace(".", ",")}%
        </text>
        <text x={cx} y={topY - 4} textAnchor="middle" fill="#475569" fontSize={9.5} fontWeight={500}>
          {row.metCount}/{row.eligibleCount}
        </text>
      </g>
    )
  }

  const rows: Array<{ node: HierarchyNodeMetrics; depth: number }> = [{ node: root, depth: 0 }]
  for (const cp of campuses) {
    rows.push({ node: cp, depth: 1 })
    if (!isAllSystem) {
      for (const gr of cp.children || []) {
        rows.push({ node: gr, depth: 2 })
      }
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E2E8F0] border-l-4 border-l-[#003B3A] flex flex-wrap items-center justify-between gap-2 bg-[#F8FAFC]/60">
        <div>
          <div className="text-sm font-semibold text-[#003B3A]">
            Phần {sectionNumber}: Đánh giá — {title}
          </div>
          <div className="text-xs text-slate-500 tabular-nums mt-0.5">
            {root.distinctStudentCount} HS ({formatPct(root.enrolledShareRate)} nhập học) ·{" "}
            Đạt chuẩn:{" "}
            <strong className="text-emerald-700">
              {root.eligibleRowCount > 0
                ? `${root.totalStandardMetCount}/${root.eligibleRowCount} lượt (${formatPct(root.standardRate)})`
                : "—"}
            </strong>
            {basisTxt ? ` · Kỳ lấy điểm: ${basisTxt}` : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onJumpToTab(tab)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#003B3A] bg-white border border-[#CBD5E1] hover:bg-[#F0FDFA] hover:border-[#00A19A] transition-colors"
        >
          <span>Xem danh sách chi tiết</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {chartData.length > 1 && (
          <div className="xl:col-span-5 rounded-xl border border-[#E2E8F0] p-3">
            <div className="text-xs font-semibold text-[#003B3A]">
              Tỷ lệ đạt chuẩn (Kỳ gần nhất) theo cơ sở
            </div>
            <div className="text-[11px] text-slate-500 mb-2">
              Hiển thị % và số lượt đạt chuẩn / tổng lượt xét chuẩn
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 32, right: 10, left: 0, bottom: 2 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }} />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    width={38}
                  />
                  <Tooltip
                    formatter={(
                      _val: unknown,
                      _name: unknown,
                      item: {
                        payload?: {
                          hasDenominator: boolean
                          metCount: number
                          eligibleCount: number
                          rate: number
                        }
                      }
                    ) => {
                      const p = item?.payload
                      if (!p || !p.hasDenominator) return ["—", "Tỷ lệ đạt chuẩn"]
                      return [
                        `${p.metCount}/${p.eligibleCount} lượt (${p.rate.toFixed(1).replace(".", ",")}%)`,
                        "Tỷ lệ đạt chuẩn",
                      ]
                    }}
                    labelFormatter={(_l, payload) => payload?.[0]?.payload?.fullName || ""}
                  />
                  <Bar
                    dataKey="rate"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={40}
                    className="cursor-pointer"
                    onClick={(entry: { campusId?: string }) => {
                      if (entry?.campusId) onJumpToTab(tab, entry.campusId)
                    }}
                  >
                    <LabelList dataKey="rate" content={renderBarLabel} />
                    {chartData.map((entry, idx) => (
                      <Cell
                        key={entry.campusId || idx}
                        fill={
                          !entry.hasDenominator
                            ? "#CBD5E1"
                            : entry.rate >= 70
                              ? "#059669"
                              : entry.rate >= 50
                                ? "#00A19A"
                                : "#D97706"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div
          className={
            chartData.length > 1
              ? "xl:col-span-7 rounded-xl border border-[#E2E8F0] overflow-hidden"
              : "xl:col-span-12 rounded-xl border border-[#E2E8F0] overflow-hidden"
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-2.5 px-3 text-left text-white">
                    {isAllSystem ? "Đơn vị (Hệ thống / Cơ sở)" : "Đơn vị (Cơ sở / Khối)"}
                  </th>
                  <th className="py-2.5 px-3 text-right text-teal-100">HS nhập học</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">{cohortLabel}</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Lượt xét</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Đạt chuẩn</th>
                  <th className="py-2.5 px-3 text-right text-[#5EEAD4]">Vượt bậc</th>
                  <th className="py-2.5 px-3 text-right text-teal-100">Chưa đạt</th>
                  <th className="py-2.5 px-3 text-right text-[#5EEAD4]">Tỷ lệ Đạt chuẩn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {rows.map(({ node, depth }) => (
                  <tr
                    key={node.id}
                    onClick={() => {
                      if (node.nodeType === "CAMPUS" && node.campusId) {
                        onJumpToTab(tab, node.campusId)
                      }
                    }}
                    className={`transition-colors align-middle ${
                      node.nodeType === "SYSTEM"
                        ? "bg-[#F0FDFA] font-bold text-[#003B3A]"
                        : node.nodeType === "CAMPUS"
                          ? "bg-[#F8FAFC] font-semibold text-[#003B3A] hover:bg-[#F0FDFA]/70 cursor-pointer"
                          : "hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <td
                      className="py-2.5 pr-3 whitespace-nowrap"
                      style={{ paddingLeft: `${depth * 14 + 12}px` }}
                    >
                      {node.label}
                    </td>
                    <td className="py-2.5 px-3 text-right">{node.enrolledStudentCount}</td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <strong>{node.distinctStudentCount} HS</strong>{" "}
                      <span className="text-[11px] font-normal text-slate-500">
                        ({formatPct(node.enrolledShareRate)})
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">{node.eligibleRowCount}</td>
                    <td className="py-2.5 px-3 text-right text-[#00736E] font-medium">
                      {node.standardBandCount}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                      {node.outstandingCount}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right ${
                        node.belowStandardCount > 0 ? "text-rose-600 font-medium" : "text-slate-500"
                      }`}
                    >
                      {node.belowStandardCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#00736E] whitespace-nowrap">
                      {formatRateWithFraction(
                        node.totalStandardMetCount,
                        node.eligibleRowCount,
                        node.standardRate
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function PsychCohortEvalSection({
  sectionNumber,
  evalData,
  isAllSystem,
  onJumpToTab,
}: {
  sectionNumber: number
  evalData: OverviewPsychEvalSummary
  isAllSystem: boolean
  onJumpToTab: (tab: StudentStatisticsTab, campusId?: string) => void
}) {
  const root = evalData.hierarchy
  const campuses = root.children || []

  const chartData = campuses.map((cp) => ({
    name: cp.code || cp.label,
    fullName: cp.label,
    campusId: cp.campusId || cp.id,
    rate: cp.monthSummaryRate ?? 0,
    hasDenominator: cp.totalStudents > 0,
    summarized: cp.monthSummarizedStudents,
    total: cp.totalStudents,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderPsychBarLabel(props: any) {
    const { x, y, width, index } = props
    const row = chartData[index]
    if (!row) return null
    const cx = Number(x ?? 0) + Number(width ?? 0) / 2
    const topY = Number(y ?? 0)
    if (!row.hasDenominator) {
      return (
        <text x={cx} y={topY - 6} textAnchor="middle" fill="#94A3B8" fontSize={10} fontWeight={600}>
          —
        </text>
      )
    }
    return (
      <g>
        <text x={cx} y={topY - 15} textAnchor="middle" fill="#003B3A" fontSize={10.5} fontWeight={700}>
          {row.rate.toFixed(1).replace(".", ",")}%
        </text>
        <text x={cx} y={topY - 4} textAnchor="middle" fill="#475569" fontSize={9.5} fontWeight={500}>
          {row.summarized}/{row.total} HS
        </text>
      </g>
    )
  }

  const rows: Array<{ node: PsychHierarchyNodeMetrics; depth: number }> = [{ node: root, depth: 0 }]
  for (const cp of campuses) {
    rows.push({ node: cp, depth: 1 })
    if (!isAllSystem) {
      for (const gr of cp.children || []) {
        rows.push({ node: gr, depth: 2 })
      }
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E2E8F0] border-l-4 border-l-[#00A19A] flex flex-wrap items-center justify-between gap-2 bg-[#F8FAFC]/60">
        <div>
          <div className="text-sm font-semibold text-[#003B3A]">
            Phần {sectionNumber}: Đánh giá — Tâm lý cam kết đầu vào ({evalData.monthLabel})
          </div>
          <div className="text-xs text-slate-500 tabular-nums mt-0.5">
            {root.totalStudents} HS ({formatPct(root.enrolledShareRate)} nhập học) · Tổng kết:{" "}
            <strong className="text-[#00736E]">
              {formatRateWithFraction(
                root.monthSummarizedStudents,
                root.totalStudents,
                root.monthSummaryRate
              )}
            </strong>{" "}
            · Tiến độ tuần: {evalData.completedSessions}/{evalData.totalScheduledSessions} lượt
          </div>
        </div>
        <button
          type="button"
          onClick={() => onJumpToTab("psychology")}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#003B3A] bg-white border border-[#CBD5E1] hover:bg-[#F0FDFA] hover:border-[#00A19A] transition-colors"
        >
          <span>Xem danh sách chi tiết</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {chartData.length > 1 && (
          <div className="xl:col-span-5 rounded-xl border border-[#E2E8F0] p-3">
            <div className="text-xs font-semibold text-[#003B3A]">
              Tỷ lệ đã tổng kết tháng theo cơ sở
            </div>
            <div className="text-[11px] text-slate-500 mb-2">
              Hiển thị % và số HS đã tổng kết / tổng HS thuộc diện
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 32, right: 10, left: 0, bottom: 2 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }} />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    width={38}
                  />
                  <Tooltip
                    formatter={(
                      _val: unknown,
                      _name: unknown,
                      item: {
                        payload?: {
                          hasDenominator: boolean
                          summarized: number
                          total: number
                          rate: number
                        }
                      }
                    ) => {
                      const p = item?.payload
                      if (!p || !p.hasDenominator) return ["—", "Đã tổng kết tháng"]
                      return [
                        `${p.summarized}/${p.total} HS (${p.rate.toFixed(1).replace(".", ",")}%)`,
                        "Đã tổng kết tháng",
                      ]
                    }}
                    labelFormatter={(_l, payload) => payload?.[0]?.payload?.fullName || ""}
                  />
                  <Bar
                    dataKey="rate"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={40}
                    className="cursor-pointer"
                    onClick={(entry: { campusId?: string }) => {
                      if (entry?.campusId) onJumpToTab("psychology", entry.campusId)
                    }}
                  >
                    <LabelList dataKey="rate" content={renderPsychBarLabel} />
                    {chartData.map((entry, idx) => (
                      <Cell
                        key={entry.campusId || idx}
                        fill={idx % 2 === 0 ? "#00A19A" : "#003B3A"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div
          className={
            chartData.length > 1 ? "xl:col-span-7 space-y-3" : "xl:col-span-12 space-y-3"
          }
        >
          <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                  <tr className="text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-2.5 px-3 text-left text-white">
                      {isAllSystem ? "Đơn vị (Hệ thống / Cơ sở)" : "Đơn vị (Cơ sở / Khối)"}
                    </th>
                    <th className="py-2.5 px-3 text-right text-teal-100">HS nhập học</th>
                    <th className="py-2.5 px-3 text-right text-teal-100">HS thuộc diện</th>
                    <th className="py-2.5 px-3 text-right text-teal-100">Chưa PC</th>
                    <th className="py-2.5 px-3 text-right text-teal-100">Quá hạn</th>
                    <th className="py-2.5 px-3 text-right text-teal-100">Còn hạn</th>
                    <th className="py-2.5 px-3 text-right text-[#5EEAD4]">Đã tổng kết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {rows.map(({ node, depth }) => (
                    <tr
                      key={node.id}
                      onClick={() => {
                        if (node.nodeType === "CAMPUS" && node.campusId) {
                          onJumpToTab("psychology", node.campusId)
                        }
                      }}
                      className={`transition-colors align-middle ${
                        node.nodeType === "SYSTEM"
                          ? "bg-[#F0FDFA] font-bold text-[#003B3A]"
                          : node.nodeType === "CAMPUS"
                            ? "bg-[#F8FAFC] font-semibold text-[#003B3A] hover:bg-[#F0FDFA]/70 cursor-pointer"
                            : "hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <td
                        className="py-2.5 pr-3 whitespace-nowrap"
                        style={{ paddingLeft: `${depth * 14 + 12}px` }}
                      >
                        {node.label}
                      </td>
                      <td className="py-2.5 px-3 text-right">{node.enrolledStudentCount}</td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <strong>{node.totalStudents} HS</strong>{" "}
                        <span className="text-[11px] font-normal text-slate-500">
                          ({formatPct(node.enrolledShareRate)})
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right ${
                          node.unassignedStudents > 0 ? "text-rose-600 font-semibold" : "text-slate-500"
                        }`}
                      >
                        {node.unassignedStudents}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right ${
                          node.overdueStudents > 0 ? "text-amber-700 font-semibold" : "text-slate-500"
                        }`}
                      >
                        {node.overdueStudents}
                      </td>
                      <td className="py-2.5 px-3 text-right">{node.duePendingStudents}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-[#00736E] whitespace-nowrap">
                        {formatRateWithFraction(
                          node.monthSummarizedStudents,
                          node.totalStudents,
                          node.monthSummaryRate
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {evalData.weekSummary.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 tabular-nums">
              {evalData.weekSummary.map((w) => (
                <div
                  key={w.weekNumber}
                  className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-[11px]"
                >
                  <div className="font-semibold text-[#003B3A]">{w.weekLabel}</div>
                  <div className="text-slate-600 mt-0.5">
                    Đã ĐG: <strong className="text-emerald-700">{w.evaluatedStudentCount}</strong> · Quá hạn:{" "}
                    <strong className={w.overdueStudentCount > 0 ? "text-rose-600" : "text-slate-700"}>
                      {w.overdueStudentCount}
                    </strong>
                  </div>
                  <div className="text-[10.5px] text-slate-500">
                    Tiến độ: {w.completedSessions}/{w.totalScheduledSessions} lượt
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function OverviewTab({ data, onJumpToTab }: OverviewTabProps) {
  const root = data.hierarchy
  const showPsych = data.canViewPsychologyTab

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = { [root.id]: true }
    for (const cp of root.children || []) {
      init[cp.id] = false
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

  const campusChartData = useMemo(
    () =>
      (root.children || []).map((cp) => ({
        name: cp.code,
        fullName: `${cp.label} (${cp.enrolledStudentCount} HS nhập học)`,
        enrolled: cp.enrolledStudentCount,
        "Cam kết môn học": cp.academicCommitment.studentCount,
        academicPct: cp.academicCommitment.shareOfEnrolledRate,
        "Tâm lý CKĐV": cp.psychologyCommitment.studentCount,
        psychPct: cp.psychologyCommitment.shareOfEnrolledRate,
        Homeschooling: cp.homeschooling.studentCount,
        hsPct: cp.homeschooling.shareOfEnrolledRate,
        "Học giao lưu": cp.exchange.studentCount,
        exPct: cp.exchange.shareOfEnrolledRate,
      })),
    [root.children]
  )

  const makeOverviewBarLabel =
    (pctKey: "academicPct" | "psychPct" | "hsPct" | "exPct") =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function OverviewBarLabel(props: any) {
      const { x, y, width, value, index } = props
      const numVal = Number(value ?? 0)
      if (!numVal || numVal <= 0) return null
      const row = campusChartData[index]
      const pct = row ? row[pctKey] : null
      const pctText = pct !== null && pct !== undefined ? `${pct.toFixed(1).replace(".", ",")}%` : ""
      const cx = Number(x ?? 0) + Number(width ?? 0) / 2
      const topY = Number(y ?? 0)
      return (
        <g>
          <text
            x={cx}
            y={topY - 15}
            textAnchor="middle"
            fill="#0F172A"
            fontSize={10}
            fontWeight={700}
          >
            {numVal}
          </text>
          {pctText && (
            <text
              x={cx}
              y={topY - 4}
              textAnchor="middle"
              fill="#475569"
              fontSize={9}
              fontWeight={500}
            >
              {pctText}
            </text>
          )}
        </g>
      )
    }

  const renderNode = (node: OverviewHierarchyNode, depth: number): React.ReactNode => {
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
        <tr className={`transition-colors align-middle hover:bg-[#F0FDFA]/60 ${rowBg}`}>
          <td
            className="py-3 pr-3 whitespace-nowrap"
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
              <span>{node.label}</span>
            </div>
          </td>
          <td className="py-3 px-3 text-right font-semibold text-slate-800">
            {node.enrolledStudentCount}
          </td>
          <td className="py-3 px-3 text-right">
            <CohortCell
              stats={node.academicCommitment}
              enrolledCount={node.enrolledStudentCount}
            />
          </td>
          {showPsych && (
            <td className="py-3 px-3 text-right">
              <CohortCell
                stats={node.psychologyCommitment}
                enrolledCount={node.enrolledStudentCount}
                isPsych
              />
            </td>
          )}
          <td className="py-3 px-3 text-right">
            <CohortCell
              stats={node.homeschooling}
              enrolledCount={node.enrolledStudentCount}
            />
          </td>
          <td className="py-3 px-3 text-right">
            <CohortCell stats={node.exchange} enrolledCount={node.enrolledStudentCount} />
          </td>
        </tr>
        {hasChildren && isOpen && node.children!.map((ch) => renderNode(ch, depth + 1))}
      </React.Fragment>
    )
  }

  return (
    <div className="space-y-5">
      {/* 1. Unified Ledger Strip — Tổng hợp 4 diện so với HS nhập học */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 ${
            showPsych ? "lg:grid-cols-5" : "lg:grid-cols-4"
          } divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0] tabular-nums`}
        >
          <div className="p-4 bg-[#F8FAFC]/60">
            <div className="text-xs font-medium text-slate-500">Tổng HS nhập học (Chuyển đến)</div>
            <div className="mt-1 text-2xl font-bold text-[#003B3A]">
              {root.enrolledStudentCount}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              từ Lịch sử HS chuyển đến ({data.filters.campusName})
            </div>
          </div>

          <button
            type="button"
            onClick={() => onJumpToTab("academic")}
            className="p-4 text-left hover:bg-[#F0FDFA]/50 transition-colors"
          >
            <div className="text-xs font-medium text-slate-500">HS cam kết môn học</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#003B3A]">
                {root.academicCommitment.studentCount}
              </span>
              <span className="text-xs font-semibold text-[#00736E]">
                HS ({formatPct(root.academicCommitment.shareOfEnrolledRate)})
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-700">
              Đạt chuẩn:{" "}
              <strong className="text-emerald-700">
                {root.academicCommitment.standardEligibleCount > 0
                  ? `${root.academicCommitment.standardMetCount}/${root.academicCommitment.standardEligibleCount} lượt môn (${formatPct(root.academicCommitment.standardRate)})`
                  : "—"}
              </strong>
            </div>
            <div className="mt-0.5 text-[10.5px] text-slate-500">
              {root.academicCommitment.standardMetCount - root.academicCommitment.outstandingCount}{" "}
              Đạt chuẩn · {root.academicCommitment.outstandingCount} Vượt bậc
              {formatBasisCompact(data.basisPeriodSummary?.academic)
                ? ` · ${formatBasisCompact(data.basisPeriodSummary?.academic)}`
                : ""}
            </div>
          </button>

          {showPsych && (
            <button
              type="button"
              onClick={() => onJumpToTab("psychology")}
              className="p-4 text-left hover:bg-[#F0FDFA]/50 transition-colors"
            >
              <div className="text-xs font-medium text-slate-500">Tâm lý cam kết đầu vào</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#003B3A]">
                  {root.psychologyCommitment.studentCount}
                </span>
                <span className="text-xs font-semibold text-[#00736E]">
                  HS ({formatPct(root.psychologyCommitment.shareOfEnrolledRate)})
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-700">
                Tổng kết {data.basisPeriodSummary?.psychologyMonthLabel || "tháng"}:{" "}
                <strong className="text-[#00736E]">
                  {formatRateWithFraction(
                    root.psychologyCommitment.standardMetCount,
                    root.psychologyCommitment.standardEligibleCount,
                    root.psychologyCommitment.standardRate
                  )}
                </strong>
              </div>
              {data.basisPeriodSummary?.psychologyDetail && (
                <div className="mt-0.5 text-[10.5px] text-slate-500">
                  {data.basisPeriodSummary.psychologyDetail.completedSessions}/
                  {data.basisPeriodSummary.psychologyDetail.totalScheduledSessions} lượt tuần ·{" "}
                  {data.basisPeriodSummary.psychologyDetail.overdueStudents} quá hạn ·{" "}
                  {data.basisPeriodSummary.psychologyDetail.unassignedStudents} chưa PC
                </div>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => onJumpToTab("homeschooling")}
            className="p-4 text-left hover:bg-[#F0FDFA]/50 transition-colors"
          >
            <div className="text-xs font-medium text-slate-500">HS Homeschooling</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#003B3A]">
                {root.homeschooling.studentCount}
              </span>
              <span className="text-xs font-semibold text-[#00736E]">
                HS ({formatPct(root.homeschooling.shareOfEnrolledRate)})
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-700">
              Đạt chuẩn:{" "}
              <strong className="text-emerald-700">
                {root.homeschooling.standardEligibleCount > 0
                  ? `${root.homeschooling.standardMetCount}/${root.homeschooling.standardEligibleCount} lượt môn (${formatPct(root.homeschooling.standardRate)})`
                  : "—"}
              </strong>
            </div>
            <div className="mt-0.5 text-[10.5px] text-slate-500">
              {root.homeschooling.standardMetCount - root.homeschooling.outstandingCount} Đạt chuẩn ·{" "}
              {root.homeschooling.outstandingCount} Vượt bậc
              {formatBasisCompact(data.basisPeriodSummary?.homeschooling)
                ? ` · ${formatBasisCompact(data.basisPeriodSummary?.homeschooling)}`
                : ""}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onJumpToTab("exchange")}
            className="p-4 text-left hover:bg-[#F0FDFA]/50 transition-colors"
          >
            <div className="text-xs font-medium text-slate-500">HS học giao lưu</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#003B3A]">
                {root.exchange.studentCount}
              </span>
              <span className="text-xs font-semibold text-[#00736E]">
                HS ({formatPct(root.exchange.shareOfEnrolledRate)})
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-700">
              Đạt chuẩn:{" "}
              <strong className="text-emerald-700">
                {root.exchange.standardEligibleCount > 0
                  ? `${root.exchange.standardMetCount}/${root.exchange.standardEligibleCount} lượt môn (${formatPct(root.exchange.standardRate)})`
                  : "—"}
              </strong>
            </div>
            <div className="mt-0.5 text-[10.5px] text-slate-500">
              {root.exchange.standardMetCount - root.exchange.outstandingCount} Đạt chuẩn ·{" "}
              {root.exchange.outstandingCount} Vượt bậc
              {formatBasisCompact(data.basisPeriodSummary?.exchange)
                ? ` · ${formatBasisCompact(data.basisPeriodSummary?.exchange)}`
                : ""}
            </div>
          </button>
        </div>

        <div className="px-4 py-2.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center gap-1.5 text-xs text-slate-600">
          <Info className="w-3.5 h-3.5 text-[#00A19A] shrink-0" />
          <span>
            <strong>Chuẩn quy định (căn cứ kỳ định kỳ gần nhất KSĐN → GK1 → CK1 → GK2 → CK2):</strong>{" "}
            Tiểu học: <strong>7–8</strong> Đạt chuẩn, <strong>9–10</strong> Tiến bộ vượt bậc ·
            THCS: <strong>5–7</strong> Đạt chuẩn, <strong>8–10</strong> Tiến bộ vượt bậc.
          </span>
        </div>
      </div>

      {/* 2. Biểu đồ cột so sánh quy mô các diện theo cơ sở */}
      {campusChartData.length > 1 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4">
          <div className="text-sm font-semibold text-[#003B3A]">
            So sánh số lượng học sinh theo dõi giữa các cơ sở
          </div>
          <div className="text-xs text-slate-500 mt-0.5 mb-3">
            Đơn vị: số học sinh (mã duy nhất) và % so với HS nhập học của từng cơ sở
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={campusChartData}
                margin={{ top: 34, right: 16, left: 0, bottom: 4 }}
                barCategoryGap="16%"
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748B" }} width={40} />
                <Tooltip
                  formatter={(val: unknown, name: unknown, item: { payload?: Record<string, unknown> }) => {
                    const p = item?.payload || {}
                    const pctMap: Record<string, unknown> = {
                      "Cam kết môn học": p.academicPct,
                      "Tâm lý CKĐV": p.psychPct,
                      Homeschooling: p.hsPct,
                      "Học giao lưu": p.exPct,
                    }
                    const pct = pctMap[String(name)]
                    const pctStr =
                      typeof pct === "number" ? ` (${pct.toFixed(1).replace(".", ",")}%)` : ""
                    return [`${val} HS${pctStr}`, String(name)]
                  }}
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || ""}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Cam kết môn học" fill="#003B3A" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  <LabelList dataKey="Cam kết môn học" content={makeOverviewBarLabel("academicPct")} />
                </Bar>
                {showPsych && (
                  <Bar dataKey="Tâm lý CKĐV" fill="#00A19A" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    <LabelList dataKey="Tâm lý CKĐV" content={makeOverviewBarLabel("psychPct")} />
                  </Bar>
                )}
                <Bar dataKey="Homeschooling" fill="#D97706" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  <LabelList dataKey="Homeschooling" content={makeOverviewBarLabel("hsPct")} />
                </Bar>
                <Bar dataKey="Học giao lưu" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  <LabelList dataKey="Học giao lưu" content={makeOverviewBarLabel("exPct")} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. Bảng phân rã Toàn hệ thống -> Cơ sở -> Khối -> Lớp */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-[#003B3A]">
              Tổng hợp theo Toàn hệ thống → Cơ sở → Khối → Lớp
            </div>
            <div className="text-xs text-slate-500">
              Hiển thị Số lượng, % so với HS nhập học và Tỷ lệ đạt chuẩn của từng diện theo từng cấp
            </div>
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
                <th className="py-2.5 px-3 text-left text-white">
                  Đơn vị (Hệ thống / Cơ sở / Khối / Lớp)
                </th>
                <th className="py-2.5 px-3 text-right text-white">HS nhập học</th>
                <th className="py-2.5 px-3 text-right text-[#5EEAD4]">
                  Cam kết môn học (SL / % / Đạt chuẩn)
                </th>
                {showPsych && (
                  <th className="py-2.5 px-3 text-right text-teal-100">
                    Tâm lý CKĐV (SL / % / Tổng kết)
                  </th>
                )}
                <th className="py-2.5 px-3 text-right text-teal-100">
                  Homeschooling (SL / % / Đạt chuẩn)
                </th>
                <th className="py-2.5 px-3 text-right text-teal-100">
                  Học giao lưu (SL / % / Đạt chuẩn)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {renderNode(root, 0)}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Ghi chú căn cứ tính Đạt chuẩn & Tỷ lệ (đồng bộ với PDF) */}
      <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#00A19A] p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 leading-relaxed">
        <div>
          <div className="font-semibold text-[#003B3A] mb-1">
            Ghi chú căn cứ tính Đạt chuẩn (Kỳ định kỳ gần nhất)
          </div>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <strong>Kỳ lấy điểm:</strong> Tự động lấy kỳ gần nhất có điểm chính thức theo thứ tự{" "}
              <strong>CK2 → GK2 → CK1 → GK1 → KSĐN</strong>.
            </li>
            <li>
              <strong>Ngưỡng chuẩn (Khối Phổ thông K-12):</strong> Tiểu học (K1–5):{" "}
              <strong>7–8</strong> Đạt chuẩn, <strong>9–10</strong> Tiến bộ vượt bậc · THCS (K6–9):{" "}
              <strong>5–7</strong> Đạt chuẩn, <strong>8–10</strong> Tiến bộ vượt bậc.
            </li>
            <li>
              <strong>Đơn vị lượt môn:</strong> Một HS có thể theo dõi nhiều môn (1–3 môn/HS); mỗi cặp
              HS–môn đủ điểm kỳ gần nhất tính là 1 lượt xét chuẩn.
            </li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-[#003B3A] mb-1">
            Công thức tỷ lệ &amp; Phân bổ kỳ thực tế trong báo cáo
          </div>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <strong>Tỷ lệ Đạt chuẩn</strong> = (Đạt chuẩn + Tiến bộ vượt bậc) / Tổng lượt HS–môn đủ
              điểm · <strong>% nhập học</strong> = HS theo dõi / Tổng HS Chuyển đến K-12.
            </li>
            {data.basisPeriodSummary && (
              <li>
                <strong>Kỳ lấy điểm thực tế:</strong> Cam kết môn (
                <em>{formatBasisCompact(data.basisPeriodSummary.academic) || "—"}</em>) · Homeschooling
                (<em>{formatBasisCompact(data.basisPeriodSummary.homeschooling) || "—"}</em>) · Học
                giao lưu (<em>{formatBasisCompact(data.basisPeriodSummary.exchange) || "—"}</em>).
              </li>
            )}
            {showPsych && (
              <li>
                <strong>Tâm lý CKĐV:</strong> Tính tỷ lệ HS đã chốt phiếu{" "}
                <em>Tổng kết {data.basisPeriodSummary?.psychologyMonthLabel || "tháng"}</em> trên tổng
                HS thuộc diện.
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* 5. Báo cáo đánh giá 4 phân hệ theo Hệ thống & Cơ sở (đồng bộ 1-1 với PDF Tổng quan) */}
      {data.cohortEvaluations && (
        <div className="space-y-5">
          <AcademicCohortEvalSection
            sectionNumber={2}
            title="Học sinh cam kết đầu vào theo môn học"
            cohortLabel="HS cam kết"
            tab="academic"
            evalData={data.cohortEvaluations.academic}
            isAllSystem={data.filters.campusId === "ALL"}
            onJumpToTab={onJumpToTab}
          />

          {showPsych && data.cohortEvaluations.psychology && (
            <PsychCohortEvalSection
              sectionNumber={3}
              evalData={data.cohortEvaluations.psychology}
              isAllSystem={data.filters.campusId === "ALL"}
              onJumpToTab={onJumpToTab}
            />
          )}

          <AcademicCohortEvalSection
            sectionNumber={showPsych && data.cohortEvaluations.psychology ? 4 : 3}
            title="Học sinh Homeschooling nhập học"
            cohortLabel="HS Homeschooling"
            tab="homeschooling"
            evalData={data.cohortEvaluations.homeschooling}
            isAllSystem={data.filters.campusId === "ALL"}
            onJumpToTab={onJumpToTab}
          />

          <AcademicCohortEvalSection
            sectionNumber={showPsych && data.cohortEvaluations.psychology ? 5 : 4}
            title="Học sinh diện Học giao lưu"
            cohortLabel="HS Học giao lưu"
            tab="exchange"
            evalData={data.cohortEvaluations.exchange}
            isAllSystem={data.filters.campusId === "ALL"}
            onJumpToTab={onJumpToTab}
          />
        </div>
      )}
    </div>
  )
}
