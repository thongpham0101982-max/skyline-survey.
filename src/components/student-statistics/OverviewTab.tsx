"use client"

import React, { useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Info } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  OverviewCohortStats,
  OverviewHierarchyNode,
  OverviewReportPayload,
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

function CohortCell({
  stats,
  enrolledCount,
}: {
  stats: OverviewCohortStats
  enrolledCount: number
}) {
  return (
    <div className="leading-tight">
      <div className="font-semibold text-slate-900">
        {stats.studentCount}{" "}
        <span className="text-[11px] font-normal text-slate-500">
          ({enrolledCount > 0 ? formatPct(stats.shareOfEnrolledRate) : "—"})
        </span>
      </div>
      <div className="text-[11px] text-[#00736E]">
        Đạt chuẩn:{" "}
        {formatRateWithFraction(
          stats.standardMetCount,
          stats.standardEligibleCount,
          stats.standardRate
        )}
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
        fullName: cp.label,
        "Cam kết môn học": cp.academicCommitment.studentCount,
        "Tâm lý CKĐV": cp.psychologyCommitment.studentCount,
        Homeschooling: cp.homeschooling.studentCount,
        "Học giao lưu": cp.exchange.studentCount,
      })),
    [root.children]
  )

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
            <div className="text-xs font-medium text-slate-500">Tổng HS nhập học</div>
            <div className="mt-1 text-2xl font-bold text-[#003B3A]">
              {root.enrolledStudentCount}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              học sinh ({data.filters.campusName})
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
                ({formatPct(root.academicCommitment.shareOfEnrolledRate)})
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-600">
              Đạt chuẩn:{" "}
              <strong>
                {formatRateWithFraction(
                  root.academicCommitment.standardMetCount,
                  root.academicCommitment.standardEligibleCount,
                  root.academicCommitment.standardRate
                )}
              </strong>
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
                  ({formatPct(root.psychologyCommitment.shareOfEnrolledRate)})
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-slate-600">
                Tổng kết tháng:{" "}
                <strong>
                  {formatRateWithFraction(
                    root.psychologyCommitment.standardMetCount,
                    root.psychologyCommitment.standardEligibleCount,
                    root.psychologyCommitment.standardRate
                  )}
                </strong>
              </div>
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
                ({formatPct(root.homeschooling.shareOfEnrolledRate)})
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-600">
              Đạt chuẩn:{" "}
              <strong>
                {formatRateWithFraction(
                  root.homeschooling.standardMetCount,
                  root.homeschooling.standardEligibleCount,
                  root.homeschooling.standardRate
                )}
              </strong>
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
                ({formatPct(root.exchange.shareOfEnrolledRate)})
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-600">
              Đạt chuẩn:{" "}
              <strong>
                {formatRateWithFraction(
                  root.exchange.standardMetCount,
                  root.exchange.standardEligibleCount,
                  root.exchange.standardRate
                )}
              </strong>
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
            Đơn vị: học sinh (mã duy nhất)
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campusChartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#334155" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748B" }} width={40} />
                <Tooltip
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || ""}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Cam kết môn học" fill="#003B3A" radius={[4, 4, 0, 0]} maxBarSize={28} />
                {showPsych && (
                  <Bar dataKey="Tâm lý CKĐV" fill="#00A19A" radius={[4, 4, 0, 0]} maxBarSize={28} />
                )}
                <Bar dataKey="Homeschooling" fill="#D97706" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Học giao lưu" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={28} />
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
    </div>
  )
}
