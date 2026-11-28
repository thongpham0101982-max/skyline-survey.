"use client"

import React, { useState } from "react"
import {
  Bell,
  Check,
  Clock,
  Mail,
  Save,
  Send,
  Settings,
  Users,
} from "lucide-react"
import type {
  KtdbclMemberProfile,
  KtdbclWeeklyAutomationConfig,
  WeeklyAutomationLogRecord,
} from "@/lib/qa-workspace/weeklyReportSchema"

interface AutomationAndRosterTabProps {
  config: KtdbclWeeklyAutomationConfig
  logs: WeeklyAutomationLogRecord[]
  members: KtdbclMemberProfile[]
  directorCandidates: KtdbclMemberProfile[]
  taskGroups: Array<{
    id: string
    name: string
    code: string | null
    leaderUserId: string | null
    memberUserIds: string[]
  }>
  specialistGroupNames: string[]
  isLeadership: boolean
  isDirectorAuthority?: boolean
  leaderManagedMap?: Record<string, string[]>
  onSaveLeaderManagedMembers?: (payload: {
    leaderUserId: string
    memberUserIds: string[]
  }) => Promise<void>
  onSaveConfig: (patch: Partial<KtdbclWeeklyAutomationConfig>) => Promise<void>
  onSaveSpecialistGroup: (payload: {
    groupId?: string
    groupName: string
    leaderUserId: string | null
    memberUserIds: string[]
  }) => Promise<void>
  onTriggerSaturdayPlanReminderNow?: () => Promise<void>
  onTriggerWednesdayReminderNow: () => Promise<void>
  onTriggerDirectorReportNow: (scope: "WEEKLY" | "MONTHLY") => Promise<void>
}

const JOB_LABELS: Record<string, string> = {
  SATURDAY_PLAN_REMINDER: "Nhắc lập Kế hoạch Tuần (Sáng Thứ Bảy 08:30)",
  WEDNESDAY_REMINDER: "Nhắc nộp BC công việc Tuần (Thứ Tư 14:00)",
  DIRECTOR_WEEKLY_REPORT: "Gửi Báo cáo Tuần cho Giám đốc Ban",
  DIRECTOR_MONTHLY_REPORT: "Gửi Báo cáo Tháng cho Giám đốc Ban",
  ITEM_CONFIRMED_EMAIL: "Mail xác nhận hoàn thành đầu việc",
  OVERDUE_EXPLANATION_EMAIL: "Mail cảnh báo trễ & yêu cầu giải trình",
  EXPLANATION_SUBMITTED_EMAIL: "Mail báo nhân sự đã nộp giải trình",
  PROGRESS_CONFIRM_REMINDER_EMAIL: "Tự động nhắc tiến độ & xác nhận HT (Quá hạn / Đang TH)",
}

export function AutomationAndRosterTab({
  config,
  logs,
  members,
  directorCandidates,
  taskGroups,
  specialistGroupNames,
  isLeadership,
  isDirectorAuthority = false,
  leaderManagedMap = {},
  onSaveLeaderManagedMembers,
  onSaveConfig,
  onSaveSpecialistGroup,
  onTriggerSaturdayPlanReminderNow,
  onTriggerWednesdayReminderNow,
  onTriggerDirectorReportNow,
}: AutomationAndRosterTabProps) {
  const [wedEnabled, setWedEnabled] = useState(config.wednesdayReminderEnabled)
  const [weeklyDirEnabled, setWeeklyDirEnabled] = useState(config.weeklyDirectorReportEnabled)
  const [monthlyDirEnabled, setMonthlyDirEnabled] = useState(config.monthlyDirectorReportEnabled)
  const [overdueAutoEnabled, setOverdueAutoEnabled] = useState(config.overdueAutoFlagEnabled)
  const [selectedDirectorIds, setSelectedDirectorIds] = useState<string[]>(
    config.directorUserIds || []
  )
  const [directorEmailsInput, setDirectorEmailsInput] = useState(
    (config.directorEmails || []).join(", ")
  )
  const [ccEmailsInput, setCcEmailsInput] = useState(
    (config.ccManagerEmails || []).join(", ")
  )
  const [savingConfig, setSavingConfig] = useState(false)

  // Group editing modal/panel state
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null)
  const [editLeaderId, setEditLeaderId] = useState<string>("")
  const [editMemberIds, setEditMemberIds] = useState<string[]>([])
  const [savingGroup, setSavingGroup] = useState(false)

  // Leader -> Managed Members inline editing state
  const [editingLeaderId, setEditingLeaderId] = useState<string | null>(null)
  const [leaderMemberDraft, setLeaderMemberDraft] = useState<string[]>([])
  const [savingLeaderManaged, setSavingLeaderManaged] = useState(false)

  const startEditLeaderManaged = (leaderId: string) => {
    setEditingLeaderId(leaderId)
    setLeaderMemberDraft(leaderManagedMap[leaderId] || [])
  }

  const handleSaveLeaderManaged = async () => {
    if (!editingLeaderId || !onSaveLeaderManagedMembers) return
    setSavingLeaderManaged(true)
    try {
      await onSaveLeaderManagedMembers({
        leaderUserId: editingLeaderId,
        memberUserIds: leaderMemberDraft,
      })
      setEditingLeaderId(null)
    } finally {
      setSavingLeaderManaged(false)
    }
  }

  const toggleDirectorId = (uid: string) => {
    setSelectedDirectorIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    )
  }

  const handleSaveAutomation = async () => {
    setSavingConfig(true)
    try {
      const directorEmails = directorEmailsInput
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter((s) => s.includes("@"))
      const ccManagerEmails = ccEmailsInput
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter((s) => s.includes("@"))

      await onSaveConfig({
        wednesdayReminderEnabled: wedEnabled,
        weeklyDirectorReportEnabled: weeklyDirEnabled,
        monthlyDirectorReportEnabled: monthlyDirEnabled,
        overdueAutoFlagEnabled: overdueAutoEnabled,
        directorUserIds: selectedDirectorIds,
        directorEmails,
        ccManagerEmails,
      })
    } finally {
      setSavingConfig(false)
    }
  }

  const startEditGroup = (gName: string) => {
    const existing = taskGroups.find((tg) => tg.name.toLowerCase() === gName.toLowerCase())
    setEditingGroupName(gName)
    setEditLeaderId(existing?.leaderUserId || "")
    setEditMemberIds(
      existing?.memberUserIds ||
        members.filter((m) => m.specialistGroups.includes(gName)).map((m) => m.id)
    )
  }

  const handleSaveGroup = async () => {
    if (!editingGroupName) return
    setSavingGroup(true)
    try {
      const existing = taskGroups.find(
        (tg) => tg.name.toLowerCase() === editingGroupName.toLowerCase()
      )
      await onSaveSpecialistGroup({
        groupId: existing?.id,
        groupName: editingGroupName,
        leaderUserId: editLeaderId || null,
        memberUserIds: editMemberIds,
      })
      setEditingGroupName(null)
    } finally {
      setSavingGroup(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Cấu hình Lịch tự động nhắc Thứ Tư 14:00 & Gửi Báo cáo Giám đốc Ban */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
          <div className="border-l-4 border-[#003B3A] pl-3">
            <h3 className="text-sm font-bold text-[#003B3A]">
              Cấu hình tự động nhắc báo cáo & gửi báo cáo Giám đốc Ban
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Vận hành tự động theo múi giờ Việt Nam (Asia/Ho_Chi_Minh) dành riêng cho Ban KT&ĐBCL
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-start justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 cursor-pointer">
              <div>
                <div className="font-bold text-[#003B3A] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#00A19A]" />
                  Tự động nhắc Lập Kế hoạch Tuần (Sáng Thứ Bảy 08:30) &amp; Báo cáo công việc (Thứ Tư 14:00)
                </div>
                <p className="text-slate-600 mt-1">
                  Định kỳ Sáng Thứ Bảy (08:30) hệ thống tự động gửi Email + thông báo yêu cầu lập Kế hoạch Tuần tiếp theo; và 14:00 Thứ Tư hằng tuần tự động nhắc nộp Báo cáo công việc tuần đối với các thành viên Ban KT&amp;ĐBCL chưa nộp.
                </p>
              </div>
              <input
                type="checkbox"
                disabled={!isLeadership}
                checked={wedEnabled}
                onChange={(e) => setWedEnabled(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-[#00A19A] h-4 w-4"
              />
            </label>

            <label className="flex items-start justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 cursor-pointer">
              <div>
                <div className="font-bold text-[#003B3A] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#00A19A]" />
                  Tự động tổng hợp & gửi Báo cáo công việc Tuần cho Giám đốc Ban
                </div>
                <p className="text-slate-600 mt-1">
                  Tự động gửi báo cáo tổng hợp tiến độ các nhóm, hiệu suất cá nhân và nhận định từ AI Agent vào chiều Thứ Sáu (16:00) hằng tuần.
                </p>
              </div>
              <input
                type="checkbox"
                disabled={!isLeadership}
                checked={weeklyDirEnabled}
                onChange={(e) => setWeeklyDirEnabled(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-[#00A19A] h-4 w-4"
              />
            </label>

            <label className="flex items-start justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 cursor-pointer">
              <div>
                <div className="font-bold text-[#003B3A] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#059669]" />
                  Tự động tổng hợp & gửi Báo cáo chất lượng & KPIs Tháng cho Giám đốc Ban
                </div>
                <p className="text-slate-600 mt-1">
                  Tự động phát hành báo cáo tổng kết chất lượng công việc toàn tháng của Ban KT&ĐBCL vào ngày cuối tháng (17:00).
                </p>
              </div>
              <input
                type="checkbox"
                disabled={!isLeadership}
                checked={monthlyDirEnabled}
                onChange={(e) => setMonthlyDirEnabled(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-[#00A19A] h-4 w-4"
              />
            </label>

            <label className="flex items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 cursor-pointer">
              <div>
                <div className="font-bold text-[#003B3A] flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#D97706]" />
                  Tự động nhắc email đầu việc Quá hạn &amp; Đang thực hiện (Hạn &amp; Tiến độ)
                </div>
                <p className="text-slate-600 mt-1">
                  Hằng ngày làm việc (Thứ Hai – Thứ Sáu), hệ thống tự động rà soát các đầu việc có trạng thái Quá hạn dự kiến hoặc Đang thực hiện để gửi email nhắc báo cáo tiến độ, yêu cầu xác nhận và đánh giá mức độ hoàn thành.
                </p>
              </div>
              <input
                type="checkbox"
                disabled={!isLeadership}
                checked={overdueAutoEnabled}
                onChange={(e) => setOverdueAutoEnabled(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-[#00A19A] h-4 w-4"
              />
            </label>
          </div>

          <div className="space-y-3 pt-2 border-t border-[#F1F5F9] text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Chọn tài khoản Giám đốc Ban nhận báo cáo tự động
              </label>
              <div className="flex flex-wrap gap-2">
                {directorCandidates.map((cand) => {
                  const active = selectedDirectorIds.includes(cand.id)
                  return (
                    <button
                      key={cand.id}
                      type="button"
                      disabled={!isLeadership}
                      onClick={() => toggleDirectorId(cand.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                        active
                          ? "bg-[#003B3A] text-white border-[#003B3A]"
                          : "bg-white text-slate-700 border-[#E2E8F0] hover:border-[#00A19A]"
                      }`}
                    >
                      {cand.fullName} {cand.email ? `(${cand.email})` : ""}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Giám đốc Ban bổ sung (cách nhau dấu phẩy)
                </label>
                <input
                  type="text"
                  disabled={!isLeadership}
                  value={directorEmailsInput}
                  onChange={(e) => setDirectorEmailsInput(e.target.value)}
                  placeholder="VD: gd.ktdbcl@skylineschool.edu.vn"
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Quản lý nhận CC (tùy chọn)
                </label>
                <input
                  type="text"
                  disabled={!isLeadership}
                  value={ccEmailsInput}
                  onChange={(e) => setCcEmailsInput(e.target.value)}
                  placeholder="VD: ktdbcl@skylineschool.edu.vn"
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                />
              </div>
            </div>

            {isLeadership && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  {onTriggerSaturdayPlanReminderNow && (
                    <button
                      type="button"
                      onClick={onTriggerSaturdayPlanReminderNow}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-teal-100 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Gửi nhắc lập KH Tuần (Sáng T7)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onTriggerWednesdayReminderNow}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-[#D97706] border border-amber-200 hover:bg-amber-100 cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    Chạy thử nhắc nộp BC (T4)
                  </button>
                  <button
                    type="button"
                    onClick={() => onTriggerDirectorReportNow("WEEKLY")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-teal-100"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Gửi ngay BC Tuần GĐB
                  </button>
                  <button
                    type="button"
                    onClick={() => onTriggerDirectorReportNow("MONTHLY")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-teal-100"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Gửi ngay BC Tháng GĐB
                  </button>
                </div>

                <button
                  type="button"
                  disabled={savingConfig}
                  onClick={handleSaveAutomation}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] text-white hover:bg-[#005250] disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingConfig ? "Đang lưu..." : "Lưu cấu hình tự động hóa"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cột Phải (5/12): Phân công nhân sự theo 5 Nhóm chuyên môn Ban KT&ĐBCL */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
          <div className="border-l-4 border-[#003B3A] pl-3">
            <h3 className="text-sm font-bold text-[#003B3A]">
              Cơ cấu Nhóm chuyên môn trực thuộc Ban KT&ĐBCL
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tổng số {members.length} thành viên chính thức trong phạm vi Ban KT&ĐBCL
            </p>
          </div>

          <div className="space-y-2.5 text-xs tabular-nums">
            {specialistGroupNames.map((gName) => {
              const tg = taskGroups.find((t) => t.name.toLowerCase() === gName.toLowerCase())
              const assignedMembers = members.filter(
                (m) =>
                  m.specialistGroups.includes(gName) ||
                  tg?.memberUserIds.includes(m.id)
              )
              const leader = members.find((m) => m.id === tg?.leaderUserId)

              return (
                <div
                  key={gName}
                  className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/70 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#003B3A]">{gName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-[#00736E]">
                        {assignedMembers.length} thành viên
                      </span>
                      {isLeadership && (
                        <button
                          type="button"
                          onClick={() => startEditGroup(gName)}
                          className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white text-[#003B3A] border border-[#E2E8F0] hover:border-[#00A19A]"
                        >
                          Phân công
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Điều phối nhóm:{" "}
                    <strong className="text-slate-800">
                      {leader?.fullName || "Chưa gán trưởng nhóm"}
                    </strong>
                  </div>
                  {assignedMembers.length > 0 && (
                    <div className="text-[11px] text-slate-500">
                      Thành viên: {assignedMembers.map((m) => m.fullName).join(", ")}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Modal Phân công Nhóm chuyên môn */}
      {editingGroupName && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-lg w-full p-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-[#003B3A]">
              Phân công nhân sự nhóm: {editingGroupName}
            </h3>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Người điều phối / Trưởng nhóm chuyên môn
              </label>
              <select
                value={editLeaderId}
                onChange={(e) => setEditLeaderId(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800"
              >
                <option value="">-- Chọn điều phối nhóm --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.position})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Thành viên tham gia nhóm ({editMemberIds.length} đã chọn)
              </label>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-[#E2E8F0] divide-y divide-[#F1F5F9]">
                {members.map((m) => {
                  const checked = editMemberIds.includes(m.id)
                  return (
                    <label
                      key={m.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-[#F8FAFC] cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-[#003B3A]">{m.fullName}</div>
                        <div className="text-[11px] text-slate-500">
                          {m.position} {m.email ? `• ${m.email}` : ""}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setEditMemberIds((prev) =>
                            checked ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                          )
                        }
                        className="rounded border-slate-300 text-[#00A19A]"
                      />
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingGroupName(null)}
                className="px-3.5 py-2 rounded-xl font-semibold text-slate-600 border border-[#E2E8F0]"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={savingGroup}
                onClick={handleSaveGroup}
                className="px-4 py-2 rounded-xl font-semibold bg-[#003B3A] text-white hover:bg-[#005250] disabled:opacity-50"
              >
                {savingGroup ? "Đang lưu..." : "Lưu phân công nhóm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Phân công thành viên quản lý cho Nhóm trưởng */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="border-l-4 border-[#003B3A] pl-3">
          <h3 className="text-sm font-bold text-[#003B3A]">
            Phân công thành viên quản lý cho Nhóm trưởng
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Gán trực tiếp các thành viên thuộc phạm vi phụ trách để Nhóm trưởng xem được công việc, vị trí RACI và báo cáo tuần của thành viên.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                    Nhân sự / Nhóm trưởng
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    Chức danh &amp; Nhóm
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4]">
                    Thành viên đang quản lý
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {members.map((m) => {
                  const managedIds = leaderManagedMap[m.id] || []
                  const managedNames = managedIds
                    .map((uid) => members.find((x) => x.id === uid)?.fullName)
                    .filter(Boolean) as string[]
                  const isEditingThis = editingLeaderId === m.id

                  return (
                    <React.Fragment key={m.id}>
                      <tr className="transition-colors align-middle hover:bg-[#F8FAFC]">
                        <td className="py-3 px-3 align-middle font-semibold text-[#003B3A]">
                          {m.fullName}
                        </td>
                        <td className="py-3 px-3 align-middle text-slate-600">
                          {m.position}
                          {m.specialistGroups.length > 0 && (
                            <span className="text-slate-400"> · {m.specialistGroups.join(", ")}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 align-middle">
                          {managedNames.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {managedNames.map((name) => (
                                <span
                                  key={name}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F0FDFA] text-[#00736E] border border-teal-200"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">Chưa gán (chỉ xem cá nhân)</span>
                          )}
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          {isDirectorAuthority && onSaveLeaderManagedMembers ? (
                            <button
                              type="button"
                              onClick={() =>
                                isEditingThis ? setEditingLeaderId(null) : startEditLeaderManaged(m.id)
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-teal-100 transition-colors cursor-pointer"
                            >
                              <Users className="w-3.5 h-3.5" />
                              {isEditingThis ? "Đóng" : `Gán thành viên (${managedIds.length})`}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                      </tr>

                      {isEditingThis && (
                        <tr className="bg-[#F8FAFC]">
                          <td colSpan={4} className="p-4">
                            <div className="space-y-3">
                              <div className="text-xs font-semibold text-[#003B3A]">
                                Chọn các thành viên Ban KT&amp;ĐBCL do {m.fullName} trực tiếp quản lý:
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {members
                                  .filter((cand) => cand.id !== m.id)
                                  .map((cand) => {
                                    const checked = leaderMemberDraft.includes(cand.id)
                                    return (
                                      <label
                                        key={cand.id}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                                          checked
                                            ? "bg-[#F0FDFA] border-teal-300 text-[#003B3A] font-semibold"
                                            : "bg-white border-[#E2E8F0] text-slate-700 hover:border-teal-200"
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() =>
                                            setLeaderMemberDraft((prev) =>
                                              prev.includes(cand.id)
                                                ? prev.filter((id) => id !== cand.id)
                                                : [...prev, cand.id]
                                            )
                                          }
                                          className="rounded border-slate-300 text-[#00736E]"
                                        />
                                        <span className="truncate">
                                          {cand.fullName}{" "}
                                          <span className="text-[11px] text-slate-400 font-normal">
                                            ({cand.position})
                                          </span>
                                        </span>
                                      </label>
                                    )
                                  })}
                              </div>
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingLeaderId(null)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-[#E2E8F0] hover:bg-slate-50 cursor-pointer"
                                >
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  disabled={savingLeaderManaged}
                                  onClick={handleSaveLeaderManaged}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#003B3A] text-white hover:bg-[#005250] disabled:opacity-50 cursor-pointer"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  {savingLeaderManaged
                                    ? "Đang lưu..."
                                    : `Lưu thành viên quản lý (${leaderMemberDraft.length})`}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Bảng Nhật ký Tự động hóa & Gửi Email (Chuẩn Sky-Line Academic Ledger) */}
      <div className="space-y-3">
        <div className="border-l-4 border-[#003B3A] pl-3">
          <h3 className="text-sm font-bold text-[#003B3A]">
            Nhật ký tự động nhắc việc & gửi email điều hành Ban KT&ĐBCL
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi lịch sử gửi mail nhắc Thứ Tư 14:00, báo cáo Giám đốc Ban, xác nhận hoàn thành và yêu cầu giải trình
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                    Thời điểm thực thi
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    Loại tác vụ tự động / Email
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    Kỳ báo cáo
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    Người nhận
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-center">
                    Số Email đã gửi
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    Kích hoạt bởi
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-right">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-4 text-center text-slate-500">
                      Chưa có bản ghi lịch sử gửi email tự động nào.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 align-middle text-slate-600 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="py-3 px-3 align-middle font-semibold text-[#003B3A]">
                        {JOB_LABELS[log.jobType] || log.jobType}
                      </td>
                      <td className="py-3 px-3 align-middle text-slate-700 whitespace-nowrap">
                        {log.periodLabel}
                      </td>
                      <td className="py-3 px-3 align-middle text-slate-600 max-w-[260px] truncate">
                        {log.recipientSummary}
                      </td>
                      <td className="py-3 px-3 align-middle text-center font-bold text-[#00736E]">
                        {log.emailSentCount}
                      </td>
                      <td className="py-3 px-3 align-middle text-slate-500">
                        {log.triggeredBy}
                      </td>
                      <td className="py-3 px-3 align-middle text-right">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            log.status === "SUCCESS"
                              ? "bg-emerald-50 text-[#059669] border-emerald-200"
                              : log.status === "PARTIAL"
                              ? "bg-amber-50 text-[#D97706] border-amber-200"
                              : "bg-rose-50 text-[#E11D48] border-rose-200"
                          }`}
                        >
                          {log.status === "SUCCESS"
                            ? "Thành công"
                            : log.status === "PARTIAL"
                            ? "Một phần"
                            : "Thất bại"}
                        </span>
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
