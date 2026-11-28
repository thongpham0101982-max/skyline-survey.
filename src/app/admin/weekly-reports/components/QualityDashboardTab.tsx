"use client"

import React, { useState } from "react"
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Layers,
  Mail,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react"
import type {
  GroupQualityAnalysis,
  IndividualQualityAnalysis,
  KtdbclAiQualityReport,
} from "@/lib/qa-workspace/weeklyAiQualityAgent"

interface QualityDashboardTabProps {
  scopeMode: "WEEKLY" | "MONTHLY"
  onChangeScopeMode: (mode: "WEEKLY" | "MONTHLY") => void
  weekNumber: number
  month: number
  year: number
  isLeadership: boolean
  aiReport: KtdbclAiQualityReport
  isRefreshingAi: boolean
  onRefreshAiAnalysis: (scope: "WEEKLY" | "MONTHLY") => Promise<void>
  onRemindSaturdayPlan?: (targetUserId?: string) => Promise<void>
  onRemindUnsubmitted: (targetUserId?: string) => Promise<void>
  onSendDirectorReport: (scope: "WEEKLY" | "MONTHLY") => Promise<void>
  onScanOverdueAndRequestExplanation: () => Promise<void>
  onExportExcel: () => void
  onSelectGroupToReview: (groupName: string) => void
  onSelectMemberToReview: (userId: string) => void
  wednesdayReminderEnabled: boolean
  weeklyDirectorEnabled: boolean
  monthlyDirectorEnabled: boolean
  actionBusyKey: string | null
}

function getGradeBadgeClass(grade: string): string {
  switch (grade) {
    case "A":
      return "bg-emerald-50 text-[#059669] border-emerald-200"
    case "B":
      return "bg-[#F0FDFA] text-[#00736E] border-teal-200"
    case "C":
      return "bg-amber-50 text-[#D97706] border-amber-200"
    default:
      return "bg-rose-50 text-[#E11D48] border-rose-200"
  }
}

function getQualityStatusBadge(status: GroupQualityAnalysis["qualityStatus"]) {
  switch (status) {
    case "EXCELLENT":
      return { label: "Hiệu suất cao", cls: "bg-emerald-50 text-[#059669] border-emerald-200" }
    case "GOOD":
      return { label: "Đạt tiến độ", cls: "bg-[#F0FDFA] text-[#00736E] border-teal-200" }
    case "CRITICAL":
      return { label: "Cần can thiệp", cls: "bg-rose-50 text-[#E11D48] border-rose-200" }
    default:
      return { label: "Cần theo dõi", cls: "bg-amber-50 text-[#D97706] border-amber-200" }
  }
}

export function QualityDashboardTab({
  scopeMode,
  onChangeScopeMode,
  weekNumber,
  month,
  year,
  isLeadership,
  aiReport,
  isRefreshingAi,
  onRefreshAiAnalysis,
  onRemindSaturdayPlan,
  onRemindUnsubmitted,
  onSendDirectorReport,
  onScanOverdueAndRequestExplanation,
  onExportExcel,
  onSelectGroupToReview,
  onSelectMemberToReview,
  wednesdayReminderEnabled,
  weeklyDirectorEnabled,
  monthlyDirectorEnabled,
  actionBusyKey,
}: QualityDashboardTabProps) {
  const [aiSubView, setAiSubView] = useState<"OVERVIEW" | "GROUPS" | "INDIVIDUALS">("OVERVIEW")
  const [memberSearch, setMemberSearch] = useState("")
  const [groupFilter, setGroupFilter] = useState<string>("ALL")
  const [activeSliceGroupName, setActiveSliceGroupName] = useState<string>(
    aiReport.groupAnalyses[0]?.groupName || ""
  )

  const activeSliceGroup =
    aiReport.groupAnalyses.find((g) => g.groupName === activeSliceGroupName) ||
    aiReport.groupAnalyses[0] ||
    null

  const SLICE_PALETTE = [
    {
      bar: "bg-[#003B3A]",
      dot: "bg-[#003B3A]",
      ring: "#003B3A",
      topBand: "bg-[#003B3A]",
      headerBg: "bg-[#003B3A]/8",
      activeHeaderBg: "bg-[#003B3A]",
      border: "border-[#003B3A]/25",
      pillBg: "bg-[#003B3A]/10 text-[#003B3A]",
    },
    {
      bar: "bg-[#00736E]",
      dot: "bg-[#00736E]",
      ring: "#00736E",
      topBand: "bg-[#00736E]",
      headerBg: "bg-teal-50/90",
      activeHeaderBg: "bg-[#00736E]",
      border: "border-teal-200",
      pillBg: "bg-teal-100/80 text-[#00736E]",
    },
    {
      bar: "bg-[#00A19A]",
      dot: "bg-[#00A19A]",
      ring: "#00A19A",
      topBand: "bg-[#00A19A]",
      headerBg: "bg-cyan-50/80",
      activeHeaderBg: "bg-[#008B85]",
      border: "border-cyan-200",
      pillBg: "bg-cyan-100/80 text-[#00736E]",
    },
    {
      bar: "bg-[#059669]",
      dot: "bg-[#059669]",
      ring: "#059669",
      topBand: "bg-[#059669]",
      headerBg: "bg-emerald-50/85",
      activeHeaderBg: "bg-[#059669]",
      border: "border-emerald-200",
      pillBg: "bg-emerald-100/80 text-[#059669]",
    },
    {
      bar: "bg-[#D97706]",
      dot: "bg-[#D97706]",
      ring: "#D97706",
      topBand: "bg-[#D97706]",
      headerBg: "bg-amber-50/85",
      activeHeaderBg: "bg-[#D97706]",
      border: "border-amber-200",
      pillBg: "bg-amber-100/80 text-[#D97706]",
    },
  ]

  const totalGroupItems = aiReport.groupAnalyses.reduce((sum, g) => sum + g.totalItems, 0)
  const totalGroupMembers = aiReport.groupAnalyses.reduce((sum, g) => sum + g.memberCount, 0)

  const ds = aiReport.departmentSummary
  const unsubmittedCount = Math.max(0, ds.totalMembers - ds.submittedMembers)

  const filteredIndividuals: IndividualQualityAnalysis[] = aiReport.individualAnalyses.filter((ind) => {
    const matchesSearch =
      !memberSearch.trim() ||
      ind.fullName.toLowerCase().includes(memberSearch.trim().toLowerCase()) ||
      ind.position.toLowerCase().includes(memberSearch.trim().toLowerCase())
    const matchesGroup =
      groupFilter === "ALL" || ind.specialistGroups.some((g) => g === groupFilter)
    return matchesSearch && matchesGroup
  })

  return (
    <div className="space-y-5">
      {/* 1. Thanh chuyển đổi phạm vi & Điều hành tự động hóa */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl bg-[#F8FAFC] p-1 border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => onChangeScopeMode("WEEKLY")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors tabular-nums ${
                scopeMode === "WEEKLY"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#003B3A]"
              }`}
            >
              Tuần {weekNumber} • Tháng {month}
            </button>
            <button
              type="button"
              onClick={() => onChangeScopeMode("MONTHLY")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors tabular-nums ${
                scopeMode === "MONTHLY"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#003B3A]"
              }`}
            >
              Tổng hợp Tháng {month}/{year}
            </button>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F0FDFA] text-[#00736E] border border-teal-200 tabular-nums">
            <Clock className="w-3.5 h-3.5" />
            Lập KH Tuần: Sáng T7 (08:30) • BC công việc: T4 (14:00) — {wednesdayReminderEnabled ? "Đang bật" : "Đang tắt"}
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0]">
            <Mail className="w-3.5 h-3.5 text-[#008B85]" />
            Gửi GĐB: {weeklyDirectorEnabled ? "Tuần" : "—"} / {monthlyDirectorEnabled ? "Tháng" : "—"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isLeadership && (
            <>
              {onRemindSaturdayPlan && (
                <button
                  type="button"
                  disabled={actionBusyKey !== null}
                  onClick={() => onRemindSaturdayPlan()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-teal-100 transition-colors disabled:opacity-50 cursor-pointer tabular-nums"
                >
                  <Clock className="w-3.5 h-3.5" />
                  {actionBusyKey === "REMIND_SAT_PLAN"
                    ? "Đang gửi nhắc KH..."
                    : "Nhắc lập KH Tuần (Sáng T7)"}
                </button>
              )}

              <button
                type="button"
                disabled={actionBusyKey !== null}
                onClick={() => onRemindUnsubmitted()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-[#D97706] border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50 cursor-pointer tabular-nums"
              >
                <Bell className="w-3.5 h-3.5" />
                {actionBusyKey === "REMIND_ALL"
                  ? "Đang gửi nhắc..."
                  : `Nhắc nộp báo cáo T4 (${unsubmittedCount})`}
              </button>

              <button
                type="button"
                disabled={actionBusyKey !== null}
                onClick={onScanOverdueAndRequestExplanation}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-[#E11D48] border border-rose-200 hover:bg-rose-100 transition-colors disabled:opacity-50 tabular-nums"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                {actionBusyKey === "SCAN_OVERDUE"
                  ? "Đang quét..."
                  : `Yêu cầu giải trình trễ (${ds.overdueItems})`}
              </button>

              <button
                type="button"
                disabled={actionBusyKey !== null}
                onClick={() => onSendDirectorReport(scopeMode)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] text-white hover:bg-[#005250] transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {actionBusyKey === "SEND_DIRECTOR"
                  ? "Đang gửi mail GĐB..."
                  : scopeMode === "WEEKLY"
                  ? "Gửi BC Tuần cho Giám đốc Ban"
                  : "Gửi BC Tháng cho Giám đốc Ban"}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-[#003B3A] border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#008B85]" />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* 2. Unified Academic Ledger KPI Strip */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0] tabular-nums">
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Kỷ luật nộp báo cáo</div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold text-[#003B3A]">{ds.submissionRate}%</span>
              <span className="text-xs font-semibold text-[#00736E]">
                {ds.submittedMembers}/{ds.totalMembers} nhân sự
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#00A19A]"
                style={{ width: `${Math.min(100, ds.submissionRate)}%` }}
              />
            </div>
          </div>

          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Tiến độ hoàn thành việc</div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold text-[#003B3A]">{ds.completionRate}%</span>
              <span className="text-xs font-semibold text-[#059669]">
                {ds.completedItems}/{ds.totalItems} việc
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#059669]"
                style={{ width: `${Math.min(100, ds.completionRate)}%` }}
              />
            </div>
          </div>

          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Quản lý & GĐB xác nhận</div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold text-[#059669]">{ds.confirmedItems}</span>
              <span className="text-xs font-semibold text-slate-600">
                {ds.confirmationRate}% số việc HT
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Còn {Math.max(0, ds.completedItems - ds.confirmedItems)} việc HT chờ duyệt
            </div>
          </div>

          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Trễ hạn & Giải trình</div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <span
                className={`text-2xl font-bold ${
                  ds.overdueItems > 0 ? "text-[#E11D48]" : "text-[#059669]"
                }`}
              >
                {ds.overdueItems}
              </span>
              <span className="text-xs font-semibold text-[#D97706]">
                {ds.pendingExplanations} chờ giải trình
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              {ds.overdueItems === 0 ? "Tất cả đầu việc đúng tiến độ" : "Tự động gửi mail yêu cầu giải trình"}
            </div>
          </div>

          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Chỉ số hiệu suất Ban</div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold text-[#003B3A]">{ds.efficiencyIndex}%</span>
              <span
                className={`text-xs font-semibold ${
                  ds.efficiencyIndex >= 80
                    ? "text-[#059669]"
                    : ds.efficiencyIndex >= 65
                    ? "text-[#D97706]"
                    : "text-[#E11D48]"
                }`}
              >
                Mục tiêu ≥ 85%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#003B3A]"
                style={{ width: `${Math.min(100, ds.efficiencyIndex)}%` }}
              />
            </div>
          </div>

          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Điểm chất lượng trung bình</div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold text-[#003B3A]">{ds.avgQualityScore}/10</span>
              <span className="text-xs font-semibold text-[#00736E]">
                Sức khỏe {ds.overallHealthScore}/100
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Tổng hợp đánh giá Quản lý & Giám đốc Ban
            </div>
          </div>
        </div>
      </div>

      {/* 3. Lưới 2 cột: Tiến độ & Hiệu suất 5 Nhóm chuyên môn + AI Agent Phân tích Chất lượng */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Cột Trái (7/12): Tiến độ & Hiệu suất từng Nhóm chuyên môn Ban KT&ĐBCL — Dạng lát cắt trực quan */}
        <div className="xl:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 flex flex-col gap-4 tabular-nums">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#F1F5F9]">
            <div className="border-l-4 border-[#003B3A] pl-3">
              <h3 className="text-sm font-bold text-[#003B3A]">
                Tiến độ &amp; Hiệu suất theo Nhóm chuyên môn Ban KT&amp;ĐBCL
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Lát cắt đa chiều theo nhóm chuyên môn — chọn từng lát cắt để soi chi tiết và lọc đầu việc
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1.5 text-[#00736E] bg-[#F0FDFA] px-2.5 py-1 rounded-lg border border-teal-200">
                <Layers className="w-3.5 h-3.5" />
                {aiReport.groupAnalyses.length} lát cắt nhóm
              </span>
            </div>
          </div>

          {/* Lát cắt 1: Thanh tỷ trọng phân bổ toàn Ban */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-slate-600">
                {totalGroupItems > 0
                  ? `Phân bổ khối lượng công việc toàn Ban (${totalGroupItems} đầu việc)`
                  : `Cơ cấu nhân sự theo nhóm chuyên môn (${totalGroupMembers} lượt phân công)`}
              </span>
              <div className="flex items-center gap-3 text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#059669]" /> Hoàn thành
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#D97706]" /> Đang làm
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#E11D48]" /> Trễ hạn
                </span>
              </div>
            </div>

            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex gap-0.5 p-0.5 border border-[#E2E8F0]">
              {aiReport.groupAnalyses.map((g, idx) => {
                const palette = SLICE_PALETTE[idx % SLICE_PALETTE.length]
                const weight =
                  totalGroupItems > 0
                    ? (g.totalItems / totalGroupItems) * 100
                    : totalGroupMembers > 0
                    ? (g.memberCount / totalGroupMembers) * 100
                    : 100 / Math.max(1, aiReport.groupAnalyses.length)
                const isSelected = activeSliceGroup?.groupName === g.groupName

                return (
                  <button
                    key={g.groupName}
                    type="button"
                    onClick={() => setActiveSliceGroupName(g.groupName)}
                    style={{ width: `${Math.max(weight, 6)}%` }}
                    title={`${g.groupName}: ${g.totalItems} đầu việc · ${g.memberCount} nhân sự · Hoàn thành ${g.completionRate}%`}
                    className={`h-full rounded-full transition-all cursor-pointer ${palette.bar} ${
                      isSelected ? "opacity-100 ring-2 ring-[#003B3A]/30" : "opacity-55 hover:opacity-90"
                    }`}
                  />
                )
              })}
            </div>
          </div>

          {/* Lát cắt 2: 5 Cột lát cắt nhóm giàu màu sắc & thể hiện rõ tiến độ công việc */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {aiReport.groupAnalyses.map((g, idx) => {
              const badge = getQualityStatusBadge(g.qualityStatus)
              const palette = SLICE_PALETTE[idx % SLICE_PALETTE.length]
              const isSelected = activeSliceGroup?.groupName === g.groupName

              // SVG Donut Ring calculations (r = 24, circumference ≈ 150.8)
              const radius = 24
              const circumference = 2 * Math.PI * radius
              const completedRatio = g.totalItems > 0 ? Math.min(1, g.completedItems / g.totalItems) : 0
              const doingRatio = g.totalItems > 0 ? Math.min(1 - completedRatio, g.doingItems / g.totalItems) : 0
              const overdueRatio =
                g.totalItems > 0
                  ? Math.min(1 - completedRatio - doingRatio, g.overdueItems / g.totalItems)
                  : 0

              const completedLen = completedRatio * circumference
              const doingLen = doingRatio * circumference
              const overdueLen = overdueRatio * circumference

              const ringTrackColor =
                g.overdueItems > 0
                  ? "#FFE4E6"
                  : g.totalItems === 0
                  ? "#FEF3C7"
                  : g.completionRate >= 80
                  ? "#D1FAE5"
                  : "#E2E8F0"

              return (
                <button
                  key={g.groupName}
                  type="button"
                  onClick={() => setActiveSliceGroupName(g.groupName)}
                  className={`text-left rounded-2xl border overflow-hidden transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-white border-[#003B3A] ring-2 ring-[#003B3A]/20 shadow-md -translate-y-0.5"
                      : `bg-white ${palette.border} hover:border-[#00A19A] hover:shadow-xs`
                  }`}
                >
                  {/* Colored Group Header Band */}
                  <div
                    className={`px-3 py-2.5 border-b transition-colors ${
                      isSelected
                        ? `${palette.activeHeaderBg} border-transparent text-white`
                        : `${palette.headerBg} border-[#F1F5F9] text-[#003B3A]`
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isSelected ? "bg-[#5EEAD4]" : palette.dot
                        }`}
                      />
                      <span className="text-xs font-bold leading-tight line-clamp-1">
                        {g.groupName}
                      </span>
                    </div>
                    <div
                      className={`text-[10px] mt-1 font-medium ${
                        isSelected ? "text-teal-100" : "text-slate-500"
                      }`}
                    >
                      {g.memberCount} NS · {g.completedItems}/{g.totalItems} việc HT
                    </div>
                  </div>

                  {/* Body: Donut Progress + Dual Progress Bars */}
                  <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                    {/* Donut Progress Slice */}
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative w-16 h-16">
                        <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            fill="none"
                            stroke={ringTrackColor}
                            strokeWidth="7.5"
                          />
                          {completedLen > 0 && (
                            <circle
                              cx="32"
                              cy="32"
                              r={radius}
                              fill="none"
                              stroke="#059669"
                              strokeWidth="7.5"
                              strokeDasharray={`${completedLen} ${circumference}`}
                              strokeDashoffset={0}
                              strokeLinecap="round"
                            />
                          )}
                          {doingLen > 0 && (
                            <circle
                              cx="32"
                              cy="32"
                              r={radius}
                              fill="none"
                              stroke="#D97706"
                              strokeWidth="7.5"
                              strokeDasharray={`${doingLen} ${circumference}`}
                              strokeDashoffset={-completedLen}
                              strokeLinecap="round"
                            />
                          )}
                          {overdueLen > 0 && (
                            <circle
                              cx="32"
                              cy="32"
                              r={radius}
                              fill="none"
                              stroke="#E11D48"
                              strokeWidth="7.5"
                              strokeDasharray={`${overdueLen} ${circumference}`}
                              strokeDashoffset={-(completedLen + doingLen)}
                              strokeLinecap="round"
                            />
                          )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span
                            className={`text-xs font-extrabold leading-none ${
                              g.completionRate >= 80
                                ? "text-[#059669]"
                                : g.overdueItems > 0
                                ? "text-[#E11D48]"
                                : "text-[#003B3A]"
                            }`}
                          >
                            {g.completionRate}%
                          </span>
                          <span className="text-[9px] font-semibold text-slate-400 mt-0.5">
                            Tiến độ
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Visual Progress Bars: Hiệu suất & Chất lượng */}
                    <div className="space-y-1.5 pt-1 border-t border-[#F1F5F9]">
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-medium">Hiệu suất</span>
                          <span className="font-bold text-[#00736E]">{g.efficiencyScore}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-teal-50 overflow-hidden border border-teal-100">
                          <div
                            className="h-full rounded-full bg-[#00A19A] transition-all"
                            style={{ width: `${Math.min(100, g.efficiencyScore)}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-medium">Chất lượng</span>
                          <span className="font-bold text-[#003B3A]">{g.avgQualityScore}/10</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-emerald-50 overflow-hidden border border-emerald-100">
                          <div
                            className="h-full rounded-full bg-[#059669] transition-all"
                            style={{
                              width: `${Math.min(100, Math.round(g.avgQualityScore * 10))}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div
                        className={`mt-1.5 text-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border truncate ${badge.cls}`}
                      >
                        {badge.label}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Lát cắt 3: Bảng soi chi tiết lát cắt nhóm đang chọn */}
          {activeSliceGroup && (() => {
            const badge = getQualityStatusBadge(activeSliceGroup.qualityStatus)
            const remainingItems = Math.max(
              0,
              activeSliceGroup.totalItems - activeSliceGroup.completedItems - activeSliceGroup.doingItems
            )
            const qualityPct = Math.min(100, Math.round(activeSliceGroup.avgQualityScore * 10))

            return (
              <div className="rounded-2xl border border-[#003B3A]/20 bg-white overflow-hidden shadow-2xs mt-auto">
                <div className="px-4 py-3 bg-[#003B3A] text-white flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold">
                      Lát cắt chi tiết: {activeSliceGroup.groupName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectGroupToReview(activeSliceGroup.groupName)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00A19A] hover:bg-[#008B85] text-white transition-colors cursor-pointer"
                  >
                    Lọc &amp; xác nhận đầu việc
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 space-y-3.5 bg-[#F8FAFC]/60">
                  {/* 4 ô lát cắt trạng thái đầu việc với sắc thái ngữ nghĩa */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-emerald-50/70 rounded-xl border border-emerald-200 px-3 py-2">
                      <div className="text-[11px] font-medium text-emerald-800">Hoàn thành</div>
                      <div className="text-sm font-bold text-[#059669] mt-0.5">
                        {activeSliceGroup.completedItems}
                        <span className="text-[11px] font-normal text-emerald-700/80 ml-1">
                          (Duyệt: {activeSliceGroup.confirmedItems})
                        </span>
                      </div>
                    </div>
                    <div className="bg-amber-50/70 rounded-xl border border-amber-200 px-3 py-2">
                      <div className="text-[11px] font-medium text-amber-800">Đang thực hiện</div>
                      <div className="text-sm font-bold text-[#D97706] mt-0.5">
                        {activeSliceGroup.doingItems}
                        <span className="text-[11px] font-normal text-amber-700/80 ml-1">việc</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl border border-slate-200 px-3 py-2">
                      <div className="text-[11px] font-medium text-slate-600">Chưa bắt đầu</div>
                      <div className="text-sm font-bold text-slate-700 mt-0.5">
                        {remainingItems}
                        <span className="text-[11px] font-normal text-slate-500 ml-1">việc</span>
                      </div>
                    </div>
                    <div
                      className={`rounded-xl border px-3 py-2 ${
                        activeSliceGroup.overdueItems > 0
                          ? "bg-rose-50/80 border-rose-200"
                          : "bg-teal-50/60 border-teal-200"
                      }`}
                    >
                      <div
                        className={`text-[11px] font-medium ${
                          activeSliceGroup.overdueItems > 0 ? "text-rose-800" : "text-[#00736E]"
                        }`}
                      >
                        Trễ hạn
                      </div>
                      <div
                        className={`text-sm font-bold mt-0.5 ${
                          activeSliceGroup.overdueItems > 0 ? "text-[#E11D48]" : "text-[#059669]"
                        }`}
                      >
                        {activeSliceGroup.overdueItems}
                        <span className="text-[11px] font-normal text-slate-500 ml-1">việc</span>
                      </div>
                    </div>
                  </div>

                  {/* 3 thanh lát cắt chỉ số so với mục tiêu 85% */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl border border-[#E2E8F0] p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 font-semibold">Tiến độ hoàn thành</span>
                        <span className="font-bold text-[#059669]">
                          {activeSliceGroup.completionRate}%
                        </span>
                      </div>
                      <div className="relative h-2.5 rounded-full bg-emerald-100/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#059669] to-emerald-400 transition-all"
                          style={{ width: `${Math.min(100, activeSliceGroup.completionRate)}%` }}
                        />
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-[#003B3A]/50"
                          style={{ left: "85%" }}
                          title="Mục tiêu 85%"
                        />
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-[#E2E8F0] p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 font-semibold">Chỉ số hiệu suất</span>
                        <span className="font-bold text-[#00736E]">
                          {activeSliceGroup.efficiencyScore}%
                        </span>
                      </div>
                      <div className="relative h-2.5 rounded-full bg-teal-100/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#00736E] to-[#00A19A] transition-all"
                          style={{ width: `${Math.min(100, activeSliceGroup.efficiencyScore)}%` }}
                        />
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-[#003B3A]/50"
                          style={{ left: "85%" }}
                          title="Mục tiêu 85%"
                        />
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-[#E2E8F0] p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 font-semibold">Điểm chất lượng</span>
                        <span className="font-bold text-[#003B3A]">
                          {activeSliceGroup.avgQualityScore}/10
                        </span>
                      </div>
                      <div className="relative h-2.5 rounded-full bg-slate-200/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#003B3A] to-[#00736E] transition-all"
                          style={{ width: `${qualityPct}%` }}
                        />
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-[#00A19A]/70"
                          style={{ left: "85%" }}
                          title="Mục tiêu 8.5/10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Khuyến nghị hành động */}
                  <div className="flex items-start gap-2 text-xs text-slate-700 bg-[#F0FDFA] rounded-xl border border-teal-200 px-3 py-2.5">
                    <Target className="w-3.5 h-3.5 text-[#00736E] shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{activeSliceGroup.recommendedAction}</span>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Cột Phải (5/12): AI Agent Phân tích Chất lượng Công việc */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 flex flex-col">
          <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[#F1F5F9]">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#003B3A] text-white flex items-center justify-center shrink-0">
                <Bot className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#003B3A]">
                  AI Agent Phân tích Chất lượng Công việc
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {aiReport.aiEngineUsed === "GEMINI_SERVER"
                    ? "Phân tích chuyên sâu bằng Gemini AI & Bộ chỉ số KPI KT&ĐBCL"
                    : "Đánh giá định lượng tự động theo chuẩn KPIs Ban KT&ĐBCL"}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isRefreshingAi}
              onClick={() => onRefreshAiAnalysis(scopeMode)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-teal-100/70 transition-colors disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAi ? "animate-spin" : ""}`} />
              {isRefreshingAi ? "Đang phân tích..." : "Phân tích AI"}
            </button>
          </div>

          {/* Sub-tabs trong AI Agent */}
          <div className="mt-3 inline-flex rounded-xl bg-[#F8FAFC] p-1 border border-[#E2E8F0] self-start">
            <button
              type="button"
              onClick={() => setAiSubView("OVERVIEW")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                aiSubView === "OVERVIEW"
                  ? "bg-white text-[#003B3A] shadow-xs border border-[#E2E8F0]"
                  : "text-slate-600 hover:text-[#003B3A]"
              }`}
            >
              Tổng quan Ban
            </button>
            <button
              type="button"
              onClick={() => setAiSubView("GROUPS")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                aiSubView === "GROUPS"
                  ? "bg-white text-[#003B3A] shadow-xs border border-[#E2E8F0]"
                  : "text-slate-600 hover:text-[#003B3A]"
              }`}
            >
              Theo Nhóm ({aiReport.groupAnalyses.length})
            </button>
            <button
              type="button"
              onClick={() => setAiSubView("INDIVIDUALS")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                aiSubView === "INDIVIDUALS"
                  ? "bg-white text-[#003B3A] shadow-xs border border-[#E2E8F0]"
                  : "text-slate-600 hover:text-[#003B3A]"
              }`}
            >
              Theo Cá nhân ({aiReport.individualAnalyses.length})
            </button>
          </div>

          <div className="mt-3.5 flex-1 overflow-y-auto max-h-[430px] pr-1 space-y-3">
            {aiSubView === "OVERVIEW" && (
              <>
                <div className="rounded-xl bg-[#F0FDFA] border border-teal-200 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#003B3A]">
                      {ds.executiveHeadline}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#003B3A] text-white tabular-nums">
                      {ds.overallHealthScore}/100
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">
                    {ds.executiveNarrative}
                  </p>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] p-3.5 bg-white">
                  <div className="text-xs font-bold text-[#059669] mb-1.5">
                    Điểm sáng ghi nhận trong kỳ
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {ds.topStrengths.map((st, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
                  <div className="text-xs font-bold text-[#D97706] mb-1.5">
                    Điểm nghẽn & Rủi ro cần lưu ý
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {ds.criticalBottlenecks.map((bn, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-[#D97706] shrink-0 mt-0.5" />
                        <span>{bn}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                  <div className="text-xs font-bold text-[#003B3A] mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#00A19A]" />
                    Khuyến nghị điều hành cho Giám đốc Ban
                  </div>
                  <ol className="space-y-1.5 text-xs text-slate-700 list-decimal list-inside">
                    {ds.directorActionItems.map((act, i) => (
                      <li key={i} className="leading-relaxed">
                        {act}
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}

            {aiSubView === "GROUPS" &&
              aiReport.groupAnalyses.map((g) => (
                <div
                  key={g.groupName}
                  className="rounded-xl border border-[#E2E8F0] p-3 bg-[#F8FAFC]/60 space-y-1.5 tabular-nums"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#003B3A]">{g.groupName}</span>
                    <span className="text-[11px] font-semibold text-[#00736E]">
                      Hiệu suất {g.efficiencyScore}% • CL {g.avgQualityScore}/10
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{g.aiAssessment}</p>
                  {g.keyBottleneck && (
                    <p className="text-[11px] text-[#E11D48] font-medium">
                      Vướng mắc: {g.keyBottleneck}
                    </p>
                  )}
                  <p className="text-[11px] text-[#00736E] font-medium">
                    Đề xuất: {g.recommendedAction}
                  </p>
                </div>
              ))}

            {aiSubView === "INDIVIDUALS" &&
              aiReport.individualAnalyses.map((ind) => (
                <div
                  key={ind.userId}
                  className="rounded-xl border border-[#E2E8F0] p-3 bg-[#F8FAFC]/60 space-y-1 tabular-nums"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#003B3A]">{ind.fullName}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getGradeBadgeClass(
                        ind.kpiGrade
                      )}`}
                    >
                      Hạng {ind.kpiGrade} • {ind.efficiencyScore}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{ind.aiStrengthSummary}</p>
                  {ind.aiRiskOrGap && (
                    <p className="text-[11px] text-[#E11D48] font-medium">{ind.aiRiskOrGap}</p>
                  )}
                  <p className="text-[11px] text-[#00736E] font-medium">
                    Gợi ý: {ind.aiCoachingRecommendation}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* 4. Bảng Quản trị Hiệu suất & Chất lượng từng Cá nhân (Chuẩn Sky-Line Academic Ledger Table) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="border-l-4 border-[#003B3A] pl-3">
            <h3 className="text-sm font-bold text-[#003B3A]">
              Bảng hiệu suất & chất lượng làm việc từng cá nhân Ban KT&ĐBCL
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tổng hợp kỷ luật nộp báo cáo, tiến độ hoàn thành, xác nhận của Lãnh đạo Ban và phân tích AI Agent
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#00A19A]"
            >
              <option value="ALL">Tất cả nhóm chuyên môn</option>
              {aiReport.groupAnalyses.map((g) => (
                <option key={g.groupName} value={g.groupName}>
                  {g.groupName}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Tìm tên thành viên..."
              className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#00A19A] w-48"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white w-10 text-center">
                    STT
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                    Thành viên Ban KT&ĐBCL
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    Nhóm chuyên môn
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                    Kỷ luật nộp
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    Tiến độ đầu việc
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-center">
                    Đã xác nhận HT
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                    Trễ / Giải trình
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-center">
                    Hiệu suất & KPI
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    Nhận định từ AI Agent
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {filteredIndividuals.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 px-3 text-center text-slate-500">
                      Không tìm thấy nhân sự phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredIndividuals.map((ind, idx) => (
                    <tr
                      key={ind.userId}
                      className="transition-colors align-middle hover:bg-[#F8FAFC]"
                    >
                      <td className="py-3 px-3 align-middle text-center font-medium text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <div className="font-semibold text-[#003B3A]">{ind.fullName}</div>
                        <div className="text-[11px] text-slate-500">{ind.position}</div>
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <div className="flex flex-wrap gap-1">
                          {ind.specialistGroups.length > 0 ? (
                            ind.specialistGroups.map((g) => (
                              <span
                                key={g}
                                className="px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-teal-200 text-[11px] font-medium"
                              >
                                {g}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">Ban KT&ĐBCL</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-middle text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            ind.submittedWeeksCount >= ind.expectedWeeksCount
                              ? "bg-emerald-50 text-[#059669] border-emerald-200"
                              : ind.submittedWeeksCount > 0
                              ? "bg-amber-50 text-[#D97706] border-amber-200"
                              : "bg-rose-50 text-[#E11D48] border-rose-200"
                          }`}
                        >
                          {ind.submittedWeeksCount}/{ind.expectedWeeksCount} tuần
                        </span>
                      </td>
                      <td className="py-3 px-3 align-middle min-w-[150px]">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold text-slate-700">
                            {ind.completedItems}/{ind.totalItems} việc
                          </span>
                          <span className="font-bold text-[#00736E]">{ind.completionRate}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#00A19A]"
                            style={{ width: `${Math.min(100, ind.completionRate)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3 align-middle text-center">
                        <span className="font-semibold text-[#059669]">
                          {ind.confirmedByLeadershipCount}/{ind.completedItems}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-middle text-center">
                        {ind.overdueCount > 0 ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-rose-50 text-[#E11D48] border border-rose-200 text-[11px] font-semibold">
                              {ind.overdueCount} trễ hạn
                            </span>
                            {ind.pendingExplanationCount > 0 && (
                              <div className="text-[10px] text-[#D97706] font-medium">
                                Nợ {ind.pendingExplanationCount} giải trình
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#059669] font-medium">Đúng hạn</span>
                        )}
                      </td>
                      <td className="py-3 px-3 align-middle text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getGradeBadgeClass(
                              ind.kpiGrade
                            )}`}
                          >
                            {ind.efficiencyScore}% • Hạng {ind.kpiGrade}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            CL: {ind.avgQualityScore}/10
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 align-middle max-w-[260px]">
                        <p className="text-slate-700 line-clamp-2 leading-relaxed">
                          {ind.aiRiskOrGap || ind.aiCoachingRecommendation}
                        </p>
                      </td>
                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectMemberToReview(ind.userId)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-teal-100 transition-colors"
                          >
                            Xem việc
                          </button>
                          {isLeadership && ind.submittedWeeksCount < ind.expectedWeeksCount && (
                            <button
                              type="button"
                              onClick={() => onRemindUnsubmitted(ind.userId)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-[#D97706] border border-amber-200 hover:bg-amber-100 transition-colors"
                            >
                              Nhắc mail
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
