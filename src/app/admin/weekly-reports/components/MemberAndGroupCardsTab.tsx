"use client"

import React, { useState } from "react"
import {
  Bell,
  CheckCircle2,
  ClipboardEdit,
  Clock,
  Eye,
  Layers,
  UserCheck,
} from "lucide-react"
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

  const indLookup = new Map(aiReport.individualAnalyses.map((i) => [i.userId, i]))

  const filteredMembers = memberTimeline.filter((entry) => {
    if (selectedGroupFilter === "ALL") return true
    return entry.member.specialistGroups.includes(selectedGroupFilter)
  })

  return (
    <div className="space-y-6">
      {/* 1. Khối Thẻ Tiến độ & Hiệu suất 5 Nhóm chuyên môn Ban KT&ĐBCL */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="border-l-4 border-[#003B3A] pl-3">
            <h3 className="text-sm font-bold text-[#003B3A]">
              Thẻ tiến độ & hiệu suất theo Nhóm chuyên môn
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              So sánh trực quan khối lượng công việc, tỷ lệ hoàn thành và hiệu suất giữa các nhóm trong Ban KT&ĐBCL
            </p>
          </div>
          {selectedGroupFilter !== "ALL" && (
            <button
              type="button"
              onClick={() => setSelectedGroupFilter("ALL")}
              className="text-xs font-semibold text-[#008B85] hover:underline"
            >
              Xem tất cả nhóm
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 tabular-nums">
          {aiReport.groupAnalyses.map((g) => {
            const isSelected = selectedGroupFilter === g.groupName
            return (
              <div
                key={g.groupName}
                onClick={() =>
                  setSelectedGroupFilter(isSelected ? "ALL" : g.groupName)
                }
                className={`rounded-2xl border p-4 transition-all cursor-pointer bg-white shadow-xs flex flex-col justify-between ${
                  isSelected
                    ? "border-[#003B3A] ring-2 ring-[#00A19A]/25"
                    : "border-[#E2E8F0] hover:border-[#00A19A]"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-[#003B3A] leading-snug">
                      {g.groupName}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#F0FDFA] text-[#00736E] border border-teal-200 shrink-0">
                      {g.efficiencyScore}%
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between text-xs">
                    <span className="text-slate-500">Hoàn thành</span>
                    <span className="font-bold text-[#003B3A]">
                      {g.completedItems}/{g.totalItems} ({g.completionRate}%)
                    </span>
                  </div>

                  <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#00A19A]"
                      style={{ width: `${Math.min(100, g.completionRate)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">{g.memberCount} thành viên</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenGroupReview(g.groupName)
                    }}
                    className="font-semibold text-[#008B85] hover:text-[#003B3A]"
                  >
                    Duyệt việc →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. Khối Thẻ Tiến độ & Lịch trình Tuần của từng Thành viên Ban KT&ĐBCL */}
      <div className="space-y-3">
        <div className="border-l-4 border-[#003B3A] pl-3">
          <h3 className="text-sm font-bold text-[#003B3A]">
            Thẻ tiến độ & hiệu suất cá nhân ({filteredMembers.length} thành viên)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi chuỗi nộp báo cáo các tuần trong Tháng {month}/{year}, đối chiếu đồng bộ với nhiệm vụ trên QA Workspace
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 tabular-nums">
          {filteredMembers.map((entry) => {
            const m = entry.member
            const perf = indLookup.get(m.id)
            const isSubmittedThisWeek =
              entry.currentWeekStatus === "SUBMITTED" || entry.currentWeekStatus === "REVIEWED"
            const canEdit = m.id === currentUserId || isLeadership

            return (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-col justify-between space-y-3.5"
              >
                <div className="space-y-3">
                  {/* Header nhân sự */}
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

                  {/* Specialist Group Badges */}
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
                        Ban KT&ĐBCL
                      </span>
                    )}
                  </div>

                  {/* Chỉ số Hiệu suất & Tiến độ */}
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

                  {/* Chuỗi tuần trong tháng */}
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
                            className={`rounded-lg px-2 py-1.5 text-center border text-[11px] transition-colors ${
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

                {/* Thanh thao tác đáy thẻ */}
                <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenMemberReview(m.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#003B3A] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-slate-100 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#008B85]" />
                    Chi tiết việc
                  </button>

                  <div className="flex items-center gap-1.5">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => onOpenComposeForMember(m.id, weekNumber)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-teal-100 transition-colors"
                      >
                        <ClipboardEdit className="w-3.5 h-3.5" />
                        {isSubmittedThisWeek ? "Cập nhật BC" : "Lập báo cáo"}
                      </button>
                    )}

                    {isLeadership && !isSubmittedThisWeek && (
                      <button
                        type="button"
                        onClick={() => onRemindMember(m.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-[#D97706] border border-amber-200 hover:bg-amber-100 transition-colors"
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
      </div>
    </div>
  )
}
