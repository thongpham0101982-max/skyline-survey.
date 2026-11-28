"use client"

import React, { useMemo, useState } from "react"
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  ClipboardEdit,
  Eye,
  LayoutGrid,
  Users,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts"
import type { KtdbclAiQualityReport } from "@/lib/qa-workspace/weeklyAiQualityAgent"
import type { KtdbclMemberProfile } from "@/lib/qa-workspace/weeklyReportSchema"

interface MemberTimelineEntry {
  member: KtdbclMemberProfile
  currentWeekStatus: string
  currentWeekReportId: string | null
  currentWeekManagerComment: string | null
  currentWeekDirectorComment: string | null
  weekStatuses: Array<{
    weekNum: number
    label: string
    status: string
    reportId: string | null
    itemsCount: number
    completedCount: number
  }>
  qaTasksSummary: {
    total: number
    completed: number
    inProgress: number
  }
}

interface MemberAndGroupCardsTabProps {
  weekNumber: number
  month: number
  year: number
  aiReport: KtdbclAiQualityReport
  memberTimeline: MemberTimelineEntry[]
  isLeadership: boolean
  currentUserId: string
  onOpenMemberReview: (userId: string) => void
  onOpenComposeForMember: (userId: string, weekNum?: number) => void
  onRemindMember: (userId: string) => Promise<void>
  onOpenGroupReview: (groupName: string) => void
}

function getShortMemberName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 2) return fullName
  return `${parts[0]} ${parts.slice(-2).join(" ")}`
}

export function MemberAndGroupCardsTab({
  weekNumber,
  month,
  year,
  aiReport,
  memberTimeline,
  isLeadership,
  currentUserId,
  onOpenMemberReview,
  onOpenComposeForMember,
  onRemindMember,
  onOpenGroupReview,
}: MemberAndGroupCardsTabProps) {
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("ALL")
  const [memberViewMode, setMemberViewMode] = useState<"CHART" | "CARDS">("CHART")

  const indLookup = useMemo(
    () => new Map(aiReport.individualAnalyses.map((i) => [i.userId, i])),
    [aiReport.individualAnalyses]
  )

  const filteredMembers = useMemo(() => {
    return memberTimeline.filter((entry) => {
      if (selectedGroupFilter === "ALL") return true
      return entry.member.specialistGroups.includes(selectedGroupFilter)
    })
  }, [memberTimeline, selectedGroupFilter])

  // Data for Group Performance Chart
  const groupChartData = useMemo(() => {
    return aiReport.groupAnalyses.map((g) => ({
      groupName: g.groupName,
      efficiency: g.efficiencyScore,
      completion: g.completionRate,
      qualityPct: Math.min(100, Math.round(g.avgQualityScore * 10)),
      avgQualityScore: g.avgQualityScore,
      completedItems: g.completedItems,
      totalItems: g.totalItems,
      confirmedItems: g.confirmedItems,
      memberCount: g.memberCount,
      overdueItems: g.overdueItems,
    }))
  }, [aiReport.groupAnalyses])

  // Data for Individual Performance Chart
  const individualChartData = useMemo(() => {
    return filteredMembers.map((entry) => {
      const m = entry.member
      const perf = indLookup.get(m.id)
      const efficiency = perf?.efficiencyScore ?? 0
      const reportCompletion =
        perf && perf.totalItems > 0
          ? Math.round((perf.completedItems / perf.totalItems) * 100)
          : 0
      const qaCompletion =
        entry.qaTasksSummary.total > 0
          ? Math.round((entry.qaTasksSummary.completed / entry.qaTasksSummary.total) * 100)
          : 0

      return {
        userId: m.id,
        fullName: m.fullName,
        shortName: getShortMemberName(m.fullName),
        position: m.position,
        groupsLabel:
          m.specialistGroups.length > 0 ? m.specialistGroups.join(", ") : "Ban KT&ĐBCL",
        efficiency,
        reportCompletion,
        qaCompletion,
        reportCompleted: perf?.completedItems ?? 0,
        reportTotal: perf?.totalItems ?? 0,
        qaCompleted: entry.qaTasksSummary.completed,
        qaTotal: entry.qaTasksSummary.total,
        currentWeekStatus: entry.currentWeekStatus,
      }
    })
  }, [filteredMembers, indLookup])

  const individualChartHeight = Math.max(240, individualChartData.length * 54 + 48)

  return (
    <div className="space-y-6 tabular-nums">
      {/* 1. BIỂU ĐỒ HIỆU SUẤT CÔNG VIỆC THEO NHÓM CHUYÊN MÔN */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3">
          <div className="border-l-4 border-[#003B3A] pl-3">
            <h3 className="text-sm font-bold text-[#003B3A]">
              Biểu đồ hiệu suất công việc theo Nhóm chuyên môn
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              So sánh trực quan Hiệu suất, Tỷ lệ hoàn thành và Chất lượng giữa các nhóm Ban KT&amp;ĐBCL (mục tiêu 85%)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#003B3A]" />
                Hiệu suất (%)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#00A19A]" />
                Hoàn thành (%)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#059669]" />
                Chất lượng (% /10)
              </span>
            </div>

            {selectedGroupFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setSelectedGroupFilter("ALL")}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-teal-100 transition-colors cursor-pointer"
              >
                Bỏ lọc: {selectedGroupFilter} ×
              </button>
            )}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Grouped Bar Chart */}
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={groupChartData}
                margin={{ top: 12, right: 16, left: -12, bottom: 4 }}
                barGap={4}
                barCategoryGap="24%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="groupName"
                  tick={{ fill: "#003B3A", fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: "#CBD5E1" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ReferenceLine
                  y={85}
                  stroke="#003B3A"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  label={{
                    value: "Mục tiêu 85%",
                    position: "insideTopRight",
                    fill: "#003B3A",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
                <Tooltip
                  cursor={{ fill: "#F8FAFC" }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null
                    const row = payload[0].payload
                    return (
                      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-md p-3 text-xs space-y-1.5 min-w-[200px]">
                        <div className="font-bold text-[#003B3A] border-b border-[#F1F5F9] pb-1">
                          {row.groupName}
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">Hiệu suất nhóm:</span>
                          <span className="font-bold text-[#003B3A]">{row.efficiency}%</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">Hoàn thành việc:</span>
                          <span className="font-bold text-[#00736E]">
                            {row.completedItems}/{row.totalItems} ({row.completion}%)
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">Điểm chất lượng:</span>
                          <span className="font-bold text-[#059669]">{row.avgQualityScore}/10</span>
                        </div>
                        <div className="flex justify-between gap-4 text-[11px] text-slate-500 pt-1 border-t border-[#F1F5F9]">
                          <span>Nhân sự: {row.memberCount}</span>
                          <span>Đã duyệt: {row.confirmedItems}</span>
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="efficiency"
                  name="Hiệu suất (%)"
                  fill="#003B3A"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={26}
                  onClick={(d: any) => {
                    if (d?.groupName) {
                      setSelectedGroupFilter((prev) =>
                        prev === d.groupName ? "ALL" : d.groupName
                      )
                    }
                  }}
                  className="cursor-pointer"
                />
                <Bar
                  dataKey="completion"
                  name="Hoàn thành (%)"
                  fill="#00A19A"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={26}
                  onClick={(d: any) => {
                    if (d?.groupName) {
                      setSelectedGroupFilter((prev) =>
                        prev === d.groupName ? "ALL" : d.groupName
                      )
                    }
                  }}
                  className="cursor-pointer"
                />
                <Bar
                  dataKey="qualityPct"
                  name="Chất lượng (%)"
                  fill="#059669"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={26}
                  onClick={(d: any) => {
                    if (d?.groupName) {
                      setSelectedGroupFilter((prev) =>
                        prev === d.groupName ? "ALL" : d.groupName
                      )
                    }
                  }}
                  className="cursor-pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Group Filter & Quick Review Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-[#F1F5F9]">
            {aiReport.groupAnalyses.map((g) => {
              const isSelected = selectedGroupFilter === g.groupName
              return (
                <div
                  key={g.groupName}
                  onClick={() =>
                    setSelectedGroupFilter(isSelected ? "ALL" : g.groupName)
                  }
                  className={`rounded-xl border px-3 py-2.5 transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? "bg-[#F0FDFA] border-[#003B3A] ring-1 ring-[#003B3A]/20"
                      : "bg-[#F8FAFC]/70 border-[#E2E8F0] hover:border-[#00A19A] hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-[#003B3A] truncate">
                      {g.groupName}
                    </span>
                    <span className="text-[11px] font-bold text-[#00736E] shrink-0">
                      {g.efficiencyScore}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {g.memberCount} NS · {g.completedItems}/{g.totalItems} việc
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenGroupReview(g.groupName)
                      }}
                      className="inline-flex items-center gap-0.5 font-semibold text-[#00736E] hover:text-[#003B3A] cursor-pointer"
                    >
                      Duyệt
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 2. BIỂU ĐỒ HIỆU SUẤT CÔNG VIỆC CỦA TỪNG CÁ NHÂN PHỤ TRÁCH */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3">
          <div className="border-l-4 border-[#003B3A] pl-3">
            <h3 className="text-sm font-bold text-[#003B3A]">
              Biểu đồ hiệu suất công việc theo Cá nhân phụ trách ({filteredMembers.length} thành viên)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Đối chiếu hiệu suất báo cáo tuần Tháng {month}/{year} với tiến độ xử lý nhiệm vụ trên QA Workspace
            </p>
          </div>

          <div className="inline-flex items-center bg-white p-1 rounded-xl border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setMemberViewMode("CHART")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                memberViewMode === "CHART"
                  ? "bg-[#003B3A] text-white shadow-2xs"
                  : "text-slate-600 hover:text-[#003B3A]"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Biểu đồ &amp; Bảng tuần
            </button>
            <button
              type="button"
              onClick={() => setMemberViewMode("CARDS")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                memberViewMode === "CARDS"
                  ? "bg-[#003B3A] text-white shadow-2xs"
                  : "text-slate-600 hover:text-[#003B3A]"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Dạng thẻ chi tiết
            </button>
          </div>
        </div>

        {memberViewMode === "CHART" ? (
          <div className="p-5 space-y-5">
            {/* Legend strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
              <div className="flex flex-wrap items-center gap-4 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#003B3A]" />
                  Hiệu suất tổng hợp (%)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#00A19A]" />
                  Hoàn thành đầu việc BC (%)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#059669]" />
                  Tiến độ QA Workspace (%)
                </span>
              </div>
              <span className="text-slate-500">
                Nhấp thanh biểu đồ hoặc dòng bên dưới để xem chi tiết việc cá nhân
              </span>
            </div>

            {/* Horizontal Bar Chart for Individual Performance */}
            <div className="w-full" style={{ height: individualChartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={individualChartData}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 16, bottom: 8 }}
                  barGap={3}
                  barCategoryGap="22%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: "#64748B", fontSize: 11 }}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    width={145}
                    tick={{ fill: "#003B3A", fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ReferenceLine
                    x={85}
                    stroke="#003B3A"
                    strokeDasharray="4 4"
                    strokeOpacity={0.45}
                    label={{
                      value: "85%",
                      position: "top",
                      fill: "#003B3A",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: "#F8FAFC" }}
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null
                      const row = payload[0].payload
                      return (
                        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-md p-3 text-xs space-y-1.5 min-w-[220px]">
                          <div className="border-b border-[#F1F5F9] pb-1">
                            <div className="font-bold text-[#003B3A]">{row.fullName}</div>
                            <div className="text-[11px] text-slate-500">{row.groupsLabel}</div>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Hiệu suất tổng hợp:</span>
                            <span className="font-bold text-[#003B3A]">{row.efficiency}%</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Đầu việc báo cáo:</span>
                            <span className="font-bold text-[#00736E]">
                              {row.reportCompleted}/{row.reportTotal} ({row.reportCompletion}%)
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">QA Workspace:</span>
                            <span className="font-bold text-[#059669]">
                              {row.qaCompleted}/{row.qaTotal} ({row.qaCompletion}%)
                            </span>
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="efficiency"
                    name="Hiệu suất (%)"
                    fill="#003B3A"
                    radius={[0, 5, 5, 0]}
                    barSize={10}
                    onClick={(d: any) => d?.userId && onOpenMemberReview(d.userId)}
                    className="cursor-pointer"
                  />
                  <Bar
                    dataKey="reportCompletion"
                    name="Đầu việc BC (%)"
                    fill="#00A19A"
                    radius={[0, 5, 5, 0]}
                    barSize={10}
                    onClick={(d: any) => d?.userId && onOpenMemberReview(d.userId)}
                    className="cursor-pointer"
                  />
                  <Bar
                    dataKey="qaCompletion"
                    name="QA Workspace (%)"
                    fill="#059669"
                    radius={[0, 5, 5, 0]}
                    barSize={10}
                    onClick={(d: any) => d?.userId && onOpenMemberReview(d.userId)}
                    className="cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Academic Ledger Table: Ma trận tiến độ cá nhân & chuỗi tuần */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse tabular-nums">
                  <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                    <tr className="text-[11px] font-semibold whitespace-nowrap">
                      <th className="py-3 px-3 text-white min-w-[180px]">Cá nhân phụ trách</th>
                      <th className="py-3 px-3 text-teal-100">Nhóm chuyên môn</th>
                      <th className="py-3 px-3 text-[#5EEAD4] text-center">Hiệu suất</th>
                      <th className="py-3 px-3 text-teal-100 text-center">Đầu việc BC</th>
                      <th className="py-3 px-3 text-teal-100 text-center">QA Workspace</th>
                      <th className="py-3 px-3 text-teal-100 min-w-[260px]">
                        Chuỗi tuần Tháng {month}
                      </th>
                      <th className="py-3 px-3 text-white text-right min-w-[190px]">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] bg-white">
                    {filteredMembers.map((entry) => {
                      const m = entry.member
                      const perf = indLookup.get(m.id)
                      const isSubmittedThisWeek =
                        entry.currentWeekStatus === "SUBMITTED" ||
                        entry.currentWeekStatus === "REVIEWED"
                      const canEdit = m.id === currentUserId || isLeadership

                      return (
                        <tr
                          key={m.id}
                          className="transition-colors align-middle hover:bg-[#F8FAFC]"
                        >
                          <td className="py-3 px-3">
                            <div className="font-semibold text-[#003B3A]">{m.fullName}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-slate-500">{m.position}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                  entry.currentWeekStatus === "REVIEWED"
                                    ? "bg-emerald-50 text-[#059669] border-emerald-200"
                                    : isSubmittedThisWeek
                                    ? "bg-[#F0FDFA] text-[#00736E] border-teal-200"
                                    : "bg-rose-50 text-[#E11D48] border-rose-200"
                                }`}
                              >
                                {entry.currentWeekStatus === "REVIEWED"
                                  ? `T${weekNumber}: Đã duyệt`
                                  : isSubmittedThisWeek
                                  ? `T${weekNumber}: Đã nộp`
                                  : `T${weekNumber}: Chưa nộp`}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {m.specialistGroups.length > 0 ? (
                                m.specialistGroups.map((g) => (
                                  <span
                                    key={g}
                                    className="px-2 py-0.5 rounded-md bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0] text-[10px] font-medium"
                                  >
                                    {g}
                                  </span>
                                ))
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-[#F8FAFC] text-slate-500 border border-[#E2E8F0] text-[10px]">
                                  Ban KT&amp;ĐBCL
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-lg bg-[#F0FDFA] text-[#003B3A] border border-teal-200 font-bold">
                              {perf?.efficiencyScore ?? 0}%
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center font-semibold text-[#059669]">
                            {perf?.completedItems ?? 0}/{perf?.totalItems ?? 0}
                          </td>

                          <td className="py-3 px-3 text-center font-semibold text-[#00736E]">
                            {entry.qaTasksSummary.completed}/{entry.qaTasksSummary.total}
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1">
                              {entry.weekStatuses.map((ws) => {
                                const submitted =
                                  ws.status === "SUBMITTED" || ws.status === "REVIEWED"
                                return (
                                  <button
                                    key={ws.weekNum}
                                    type="button"
                                    onClick={() =>
                                      canEdit
                                        ? onOpenComposeForMember(m.id, ws.weekNum)
                                        : onOpenMemberReview(m.id)
                                    }
                                    className={`px-2 py-1 rounded-lg border text-[10px] text-center transition-colors cursor-pointer min-w-[46px] ${
                                      ws.status === "REVIEWED"
                                        ? "bg-emerald-50 text-[#059669] border-emerald-200 font-semibold"
                                        : submitted
                                        ? "bg-[#F0FDFA] text-[#00736E] border-teal-200 font-semibold"
                                        : ws.weekNum === weekNumber
                                        ? "bg-rose-50 text-[#E11D48] border-rose-200 font-semibold"
                                        : "bg-white text-slate-400 border-[#E2E8F0] hover:border-slate-300"
                                    }`}
                                    title={ws.label}
                                  >
                                    <div>T{ws.weekNum}</div>
                                    <div>
                                      {submitted ? `${ws.completedCount}/${ws.itemsCount}` : "—"}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onOpenMemberReview(m.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-[#003B3A] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3 h-3 text-[#00736E]" />
                                Chi tiết
                              </button>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => onOpenComposeForMember(m.id, weekNumber)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-teal-100 transition-colors cursor-pointer"
                                >
                                  <ClipboardEdit className="w-3 h-3" />
                                  {isSubmittedThisWeek ? "Cập nhật" : "Lập BC"}
                                </button>
                              )}
                              {isLeadership && !isSubmittedThisWeek && (
                                <button
                                  type="button"
                                  onClick={() => onRemindMember(m.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-[#D97706] border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                                  title="Gửi email nhắc nộp báo cáo tuần"
                                >
                                  <Bell className="w-3 h-3" />
                                  Nhắc
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Dạng thẻ chi tiết (tùy chọn xem mở rộng) */
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMembers.map((entry) => {
              const m = entry.member
              const perf = indLookup.get(m.id)
              const isSubmittedThisWeek =
                entry.currentWeekStatus === "SUBMITTED" ||
                entry.currentWeekStatus === "REVIEWED"
              const canEdit = m.id === currentUserId || isLeadership

              return (
                <div
                  key={m.id}
                  className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-col justify-between space-y-3.5"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-[#003B3A]">{m.fullName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{m.position}</div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                          entry.currentWeekStatus === "REVIEWED"
                            ? "bg-emerald-50 text-[#059669] border-emerald-200"
                            : isSubmittedThisWeek
                            ? "bg-[#F0FDFA] text-[#00736E] border-teal-200"
                            : "bg-rose-50 text-[#E11D48] border-rose-200"
                        }`}
                      >
                        {entry.currentWeekStatus === "REVIEWED"
                          ? `Tuần ${weekNumber}: Đã duyệt`
                          : isSubmittedThisWeek
                          ? `Tuần ${weekNumber}: Đã nộp`
                          : `Tuần ${weekNumber}: Chưa nộp`}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {m.specialistGroups.length > 0 ? (
                        m.specialistGroups.map((g) => (
                          <span
                            key={g}
                            className="px-2 py-0.5 rounded-md bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0] text-[11px] font-medium"
                          >
                            {g}
                          </span>
                        ))
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-[#F8FAFC] text-slate-500 border border-[#E2E8F0] text-[11px]">
                          Ban KT&amp;ĐBCL
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 text-center">
                      <div>
                        <div className="text-[11px] text-slate-500">Hiệu suất</div>
                        <div className="text-sm font-bold text-[#003B3A] mt-0.5">
                          {perf?.efficiencyScore ?? 0}%
                        </div>
                      </div>
                      <div className="border-x border-[#E2E8F0]">
                        <div className="text-[11px] text-slate-500">Đầu việc BC</div>
                        <div className="text-sm font-bold text-[#059669] mt-0.5">
                          {perf?.completedItems ?? 0}/{perf?.totalItems ?? 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">QA Workspace</div>
                        <div className="text-sm font-bold text-[#00736E] mt-0.5">
                          {entry.qaTasksSummary.completed}/{entry.qaTasksSummary.total}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-medium text-slate-500 mb-1.5">
                        Chuỗi nộp báo cáo tuần trong Tháng {month}:
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                        {entry.weekStatuses.map((ws) => {
                          const submitted =
                            ws.status === "SUBMITTED" || ws.status === "REVIEWED"
                          return (
                            <button
                              key={ws.weekNum}
                              type="button"
                              onClick={() =>
                                canEdit
                                  ? onOpenComposeForMember(m.id, ws.weekNum)
                                  : onOpenMemberReview(m.id)
                              }
                              className={`rounded-lg px-2 py-1.5 text-center border text-[11px] transition-colors cursor-pointer ${
                                ws.status === "REVIEWED"
                                  ? "bg-emerald-50 text-[#059669] border-emerald-200 font-semibold"
                                  : submitted
                                  ? "bg-[#F0FDFA] text-[#00736E] border-teal-200 font-semibold"
                                  : ws.weekNum === weekNumber
                                  ? "bg-rose-50 text-[#E11D48] border-rose-200 font-semibold"
                                  : "bg-white text-slate-400 border-[#E2E8F0]"
                              }`}
                              title={ws.label}
                            >
                              <div>Tuần {ws.weekNum}</div>
                              <div className="text-[10px]">
                                {submitted ? `${ws.completedCount}/${ws.itemsCount}` : "Trống"}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenMemberReview(m.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#003B3A] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#008B85]" />
                      Chi tiết việc
                    </button>

                    <div className="flex items-center gap-1.5">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onOpenComposeForMember(m.id, weekNumber)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-teal-100 transition-colors cursor-pointer"
                        >
                          <ClipboardEdit className="w-3.5 h-3.5" />
                          {isSubmittedThisWeek ? "Cập nhật BC" : "Lập báo cáo"}
                        </button>
                      )}

                      {isLeadership && !isSubmittedThisWeek && (
                        <button
                          type="button"
                          onClick={() => onRemindMember(m.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-[#D97706] border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          Nhắc mail
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
