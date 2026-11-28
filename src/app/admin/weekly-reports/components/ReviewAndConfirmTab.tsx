"use client"

import React, { useMemo, useState } from "react"
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileWarning,
  Mail,
  MessageSquare,
  ShieldCheck,
  X,
} from "lucide-react"
import type { EnrichedWeeklyReportItem } from "../ktdbcl_actions"
import type { KtdbclMemberProfile } from "@/lib/qa-workspace/weeklyReportSchema"

interface ReviewAndConfirmTabProps {
  scopeMode: "WEEKLY" | "MONTHLY"
  onChangeScopeMode: (mode: "WEEKLY" | "MONTHLY") => void
  weekNumber: number
  month: number
  year: number
  items: EnrichedWeeklyReportItem[]
  specialistGroups: string[]
  members: KtdbclMemberProfile[]
  selectedGroup: string
  onSelectGroup: (group: string) => void
  selectedMemberId: string
  onSelectMemberId: (id: string) => void
  isLeadership: boolean
  isDirectorAuthority: boolean
  currentUserId: string
  onConfirmItems: (payload: {
    itemIds: string[]
    roleMode: "MANAGER" | "DIRECTOR"
    reviewNote: string
    directorRating: "EXCELLENT" | "GOOD" | "SATISFACTORY" | "NEEDS_IMPROVEMENT"
    qualityScore: number
    sendMail: boolean
  }) => Promise<void>
  onFlagOverdueItems: (payload: {
    itemIds: string[]
    explanationRequestNote: string
    explanationDueDate: string
    sendMail: boolean
  }) => Promise<void>
  onSubmitExplanation: (payload: {
    itemId: string
    explanationText: string
    recoveryDate: string
  }) => Promise<void>
  onRemindOverdueAndDoing?: (itemIds?: string[]) => Promise<void>
  remindingProgress?: boolean
  overdueAutoEnabled?: boolean
}

type StatusFilter =
  | "ALL"
  | "NEEDS_CONFIRMATION"
  | "CONFIRMED"
  | "OVERDUE_REQUIRED"
  | "EXPLAINED"

function renderProgressBadge(progress: string) {
  if (progress === "COMPLETED") {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-[#059669] border border-emerald-200">
        Hoàn thành
      </span>
    )
  }
  if (progress === "DOING") {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-[#D97706] border border-amber-200">
        Đang thực hiện
      </span>
    )
  }
  return (
    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
      Chưa bắt đầu
    </span>
  )
}

function renderConfirmStatusBadge(item: EnrichedWeeklyReportItem) {
  const st = item.meta.confirmStatus
  if (st === "DIRECTOR_CONFIRMED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-[#059669] border border-emerald-200">
        <ShieldCheck className="w-3 h-3" />
        GĐB đã xác nhận
      </span>
    )
  }
  if (st === "MANAGER_CONFIRMED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200">
        <CheckCircle2 className="w-3 h-3" />
        Quản lý đã xác nhận
      </span>
    )
  }
  if (st === "OVERDUE_EXPLANATION_REQUIRED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-[#E11D48] border border-rose-200">
        <AlertTriangle className="w-3 h-3" />
        Chờ nhân sự giải trình
      </span>
    )
  }
  if (st === "EXPLANATION_SUBMITTED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-[#D97706] border border-amber-200">
        <MessageSquare className="w-3 h-3" />
        Đã nộp giải trình
      </span>
    )
  }
  if (item.progress === "COMPLETED") {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-[#D97706] border border-amber-200">
        Chờ xác nhận HT
      </span>
    )
  }
  if (item.isOverdue) {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-[#E11D48] border border-rose-200">
        Quá hạn dự kiến
      </span>
    )
  }
  return <span className="text-[11px] text-slate-400">Đang theo dõi</span>
}

export function ReviewAndConfirmTab({
  scopeMode,
  onChangeScopeMode,
  weekNumber,
  month,
  year,
  items,
  specialistGroups,
  members,
  selectedGroup,
  onSelectGroup,
  selectedMemberId,
  onSelectMemberId,
  isLeadership,
  isDirectorAuthority,
  currentUserId,
  onConfirmItems,
  onFlagOverdueItems,
  onSubmitExplanation,
  onRemindOverdueAndDoing,
  remindingProgress = false,
  overdueAutoEnabled = true,
}: ReviewAndConfirmTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Confirm Modal State
  const [confirmModalIds, setConfirmModalIds] = useState<string[] | null>(null)
  const [confirmRoleMode, setConfirmRoleMode] = useState<"MANAGER" | "DIRECTOR">(
    isDirectorAuthority ? "DIRECTOR" : "MANAGER"
  )
  const [confirmRating, setConfirmRating] = useState<
    "EXCELLENT" | "GOOD" | "SATISFACTORY" | "NEEDS_IMPROVEMENT"
  >("GOOD")
  const [confirmScore, setConfirmScore] = useState<number>(9.0)
  const [confirmNote, setConfirmNote] = useState<string>("Đạt yêu cầu nghiệm thu tiến độ & chất lượng.")
  const [confirmSendMail, setConfirmSendMail] = useState<boolean>(true)
  const [modalBusy, setModalBusy] = useState<boolean>(false)

  // Overdue / Explanation Request Modal State
  const [overdueModalIds, setOverdueModalIds] = useState<string[] | null>(null)
  const [overdueNote, setOverdueNote] = useState<string>(
    "Đầu việc đã trễ tiến độ so với kế hoạch. Đề nghị giải trình rõ nguyên nhân và cam kết thời hạn hoàn thành bù."
  )
  const [overdueDueDate, setOverdueDueDate] = useState<string>("")
  const [overdueSendMail, setOverdueSendMail] = useState<boolean>(true)

  // Staff Submit Explanation Modal State
  const [staffExplainItem, setStaffExplainItem] = useState<EnrichedWeeklyReportItem | null>(null)
  const [staffExplanationText, setStaffExplanationText] = useState<string>("")
  const [staffRecoveryDate, setStaffRecoveryDate] = useState<string>("")

  const overdueAndDoingStats = useMemo(() => {
    let overdue = 0
    let doing = 0
    for (const it of items) {
      if (it.progress === "COMPLETED") continue
      if (it.isOverdue) overdue++
      else if (it.progress === "DOING") doing++
    }
    return { overdue, doing, total: overdue + doing }
  }, [items])

  const groupCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const it of items) {
      map.set(it.taskGroup, (map.get(it.taskGroup) || 0) + 1)
    }
    return map
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (selectedGroup !== "ALL" && it.taskGroup !== selectedGroup) return false
      if (selectedMemberId !== "ALL" && it.userId !== selectedMemberId) return false
      if (statusFilter === "NEEDS_CONFIRMATION") {
        return (
          it.progress === "COMPLETED" &&
          it.meta.confirmStatus !== "MANAGER_CONFIRMED" &&
          it.meta.confirmStatus !== "DIRECTOR_CONFIRMED"
        )
      }
      if (statusFilter === "CONFIRMED") {
        return (
          it.meta.confirmStatus === "MANAGER_CONFIRMED" ||
          it.meta.confirmStatus === "DIRECTOR_CONFIRMED"
        )
      }
      if (statusFilter === "OVERDUE_REQUIRED") {
        return it.isOverdue || it.meta.confirmStatus === "OVERDUE_EXPLANATION_REQUIRED"
      }
      if (statusFilter === "EXPLAINED") {
        return it.meta.confirmStatus === "EXPLANATION_SUBMITTED"
      }
      return true
    })
  }, [items, selectedGroup, selectedMemberId, statusFilter])

  const allChecked =
    filteredItems.length > 0 && filteredItems.every((i) => selectedIds.has(i.id))

  const toggleAll = () => {
    if (allChecked) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)))
    }
  }

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleSubmitConfirmModal = async () => {
    if (!confirmModalIds || confirmModalIds.length === 0) return
    setModalBusy(true)
    try {
      await onConfirmItems({
        itemIds: confirmModalIds,
        roleMode: confirmRoleMode,
        reviewNote: confirmNote,
        directorRating: confirmRating,
        qualityScore: confirmScore,
        sendMail: confirmSendMail,
      })
      setConfirmModalIds(null)
      setSelectedIds(new Set())
    } finally {
      setModalBusy(false)
    }
  }

  const handleSubmitOverdueModal = async () => {
    if (!overdueModalIds || overdueModalIds.length === 0) return
    setModalBusy(true)
    try {
      await onFlagOverdueItems({
        itemIds: overdueModalIds,
        explanationRequestNote: overdueNote,
        explanationDueDate: overdueDueDate,
        sendMail: overdueSendMail,
      })
      setOverdueModalIds(null)
      setSelectedIds(new Set())
    } finally {
      setModalBusy(false)
    }
  }

  const handleSubmitStaffExplainModal = async () => {
    if (!staffExplainItem) return
    setModalBusy(true)
    try {
      await onSubmitExplanation({
        itemId: staffExplainItem.id,
        explanationText: staffExplanationText,
        recoveryDate: staffRecoveryDate,
      })
      setStaffExplainItem(null)
      setStaffExplanationText("")
      setStaffRecoveryDate("")
    } finally {
      setModalBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Bộ lọc gọn gàng chuyên biệt cho Ban KT&ĐBCL */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-[#F8FAFC] p-1 border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => onChangeScopeMode("WEEKLY")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors tabular-nums ${
                  scopeMode === "WEEKLY"
                    ? "bg-[#003B3A] text-white"
                    : "text-slate-600 hover:text-[#003B3A]"
                }`}
              >
                Tuần {weekNumber}
              </button>
              <button
                type="button"
                onClick={() => onChangeScopeMode("MONTHLY")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors tabular-nums ${
                  scopeMode === "MONTHLY"
                    ? "bg-[#003B3A] text-white"
                    : "text-slate-600 hover:text-[#003B3A]"
                }`}
              >
                Cả tháng {month}/{year}
              </button>
            </div>

            <select
              value={selectedMemberId}
              onChange={(e) => onSelectMemberId(e.target.value)}
              className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#00A19A]"
            >
              <option value="ALL">Tất cả thành viên Ban KT&ĐBCL ({members.length})</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} — {m.position}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#00A19A]"
            >
              <option value="ALL">Mọi trạng thái xác nhận</option>
              <option value="NEEDS_CONFIRMATION">Hoàn thành • Chờ xác nhận</option>
              <option value="CONFIRMED">Đã xác nhận hoàn thành (QL/GĐB)</option>
              <option value="OVERDUE_REQUIRED">Trễ tiến độ / Chờ giải trình</option>
              <option value="EXPLAINED">Đã nộp giải trình</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isLeadership && onRemindOverdueAndDoing && overdueAndDoingStats.total > 0 && (
              <button
                type="button"
                disabled={remindingProgress}
                onClick={() =>
                  onRemindOverdueAndDoing(
                    selectedIds.size > 0 ? Array.from(selectedIds) : undefined
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#003B3A] text-white hover:bg-[#005250] transition-colors disabled:opacity-50 cursor-pointer tabular-nums"
                title={
                  overdueAutoEnabled
                    ? "Tự động nhắc hằng ngày đang bật — nhấn để gửi email nhắc báo cáo tiến độ & đánh giá mức độ hoàn thành ngay"
                    : "Gửi email nhắc báo cáo tiến độ & yêu cầu xác nhận hoàn thành cho các đầu việc Quá hạn và Đang thực hiện"
                }
              >
                <Mail className="w-3.5 h-3.5 text-[#5EEAD4]" />
                {remindingProgress
                  ? "Đang gửi nhắc tiến độ..."
                  : `Nhắc tiến độ & đánh giá HT (${overdueAndDoingStats.overdue} quá hạn · ${overdueAndDoingStats.doing} đang TH)`}
              </button>
            )}

            {isLeadership && selectedIds.size > 0 && (
              <>
                <span className="text-xs font-semibold text-[#003B3A] tabular-nums">
                  Đã chọn {selectedIds.size} đầu việc:
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmModalIds(Array.from(selectedIds))}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#059669] text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Xác nhận hoàn thành &amp; Báo mail
                </button>
                <button
                  type="button"
                  onClick={() => setOverdueModalIds(Array.from(selectedIds))}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#E11D48] text-white hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  <FileWarning className="w-3.5 h-3.5" />
                  Báo trễ &amp; Yêu cầu giải trình
                </button>
              </>
            )}
          </div>
        </div>

        {/* Specialist Group Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#F1F5F9] tabular-nums">
          <button
            type="button"
            onClick={() => onSelectGroup("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              selectedGroup === "ALL"
                ? "bg-[#003B3A] text-white"
                : "bg-[#F8FAFC] text-slate-600 border border-[#E2E8F0] hover:border-[#00A19A]"
            }`}
          >
            Tất cả nhóm ({items.length})
          </button>
          {specialistGroups.map((gName) => {
            const cnt = groupCounts.get(gName) || 0
            return (
              <button
                key={gName}
                type="button"
                onClick={() => onSelectGroup(gName)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  selectedGroup === gName
                    ? "bg-[#00A19A] text-white"
                    : "bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0] hover:border-[#00A19A]"
                }`}
              >
                {gName} ({cnt})
              </button>
            )
          })}
        </div>
      </div>

      {/* Bảng Đầu việc theo chuẩn Sky-Line Academic Ledger */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                {isLeadership && (
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white w-9 text-center">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="rounded border-teal-300 text-[#00A19A] focus:ring-0"
                    />
                  </th>
                )}
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white w-10 text-center">
                  STT
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                  Nhân sự thực hiện
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                  Nhóm & Danh mục
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                  Nội dung công việc chi tiết
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                  Hạn & Tiến độ
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                  Giải pháp / Giải trình
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4]">
                  Xác nhận Quản lý & GĐB
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={isLeadership ? 9 : 8}
                    className="py-10 px-4 text-center text-slate-500"
                  >
                    Chưa có đầu việc báo cáo nào khớp với bộ lọc đang chọn.
                  </td>
                </tr>
              ) : (
                filteredItems.map((it, idx) => {
                  const isSelected = selectedIds.has(it.id)
                  const canStaffExplain =
                    (it.userId === currentUserId || isLeadership) &&
                    (it.meta.confirmStatus === "OVERDUE_EXPLANATION_REQUIRED" || it.isOverdue)

                  return (
                    <tr
                      key={it.id}
                      className={`transition-colors align-middle ${
                        isSelected
                          ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                          : "hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {isLeadership && (
                        <td className="py-3 px-3 align-middle text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(it.id)}
                            className="rounded border-slate-300 text-[#00A19A] focus:ring-0"
                          />
                        </td>
                      )}
                      <td className="py-3 px-3 align-middle text-center text-slate-500 font-medium">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 align-middle whitespace-nowrap">
                        <div className="font-semibold text-[#003B3A]">{it.userFullName}</div>
                        <div className="text-[11px] text-slate-500">
                          Tuần {it.weekNumber} • {it.userPosition}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-teal-200 text-[11px] font-medium">
                            {it.taskGroup}
                          </span>
                          {it.category && /^RACI\s+/i.test(it.category) && (
                            <span className="inline-flex px-1.5 py-0.5 rounded-md bg-[#003B3A] text-white text-[10px] font-bold">
                              MTCV · {it.category.replace(/^RACI\s+/i, "")}
                            </span>
                          )}
                          {it.meta.linkedWorkTaskId && (
                            <span className="inline-flex px-1.5 py-0.5 rounded-md bg-emerald-50 text-[#059669] border border-emerald-200 text-[10px] font-semibold">
                              Gắn việc QA
                            </span>
                          )}
                        </div>
                        <div className="mt-1 font-medium text-slate-700">{it.mainTask}</div>
                      </td>
                      <td className="py-3 px-3 align-middle min-w-[260px] max-w-[380px]">
                        {(() => {
                          const raw = String(it.workContent || "").trim()
                          if (raw.startsWith("[Task] ")) {
                            const nl = raw.indexOf("\n")
                            const tTitle = nl === -1 ? raw.slice(7).trim() : raw.slice(7, nl).trim()
                            const tDetail = nl === -1 ? "" : raw.slice(nl + 1).trim()
                            return (
                              <div className="space-y-1">
                                <div className="font-semibold text-[#003B3A]">{tTitle}</div>
                                {tDetail && (
                                  <p className="text-slate-600 whitespace-pre-line leading-relaxed text-[11px]">
                                    {tDetail}
                                  </p>
                                )}
                              </div>
                            )
                          }
                          return (
                            <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                              {raw}
                            </p>
                          )
                        })()}
                      </td>
                      <td className="py-3 px-3 align-middle text-center whitespace-nowrap space-y-1">
                        <div>{renderProgressBadge(it.progress)}</div>
                        <div
                          className={`text-[11px] ${
                            it.isOverdue ? "text-[#E11D48] font-semibold" : "text-slate-500"
                          }`}
                        >
                          {it.expectedCompletion || "Trong tuần"}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-middle min-w-[200px] max-w-[260px]">
                        {it.meta.explanationRequestNote && (
                          <div className="mb-1.5 rounded-lg bg-rose-50 border border-rose-200 p-2 text-[11px] text-[#E11D48]">
                            <strong>Yêu cầu giải trình:</strong> {it.meta.explanationRequestNote}
                          </div>
                        )}
                        {it.meta.staffExplanation ? (
                          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-slate-800">
                            <strong className="text-[#D97706]">Giải trình nhân sự:</strong>{" "}
                            {it.meta.staffExplanation}
                            {it.meta.staffRecoveryDate && (
                              <div className="mt-0.5 font-semibold text-[#00736E]">
                                Cam kết bù: {it.meta.staffRecoveryDate}
                              </div>
                            )}
                          </div>
                        ) : it.proposedSolution ? (
                          <p className="text-slate-600 leading-relaxed">{it.proposedSolution}</p>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 align-middle min-w-[190px] space-y-1">
                        <div>{renderConfirmStatusBadge(it)}</div>
                        <div className="text-[11px] text-slate-600">
                          Điểm CL:{" "}
                          <strong className="text-[#003B3A]">{it.computedQualityScore}/10</strong>
                        </div>
                        {(it.directorNote || it.managerNote) && (
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            {it.directorNote || it.managerNote}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex flex-col items-end gap-1.5">
                          {isLeadership && (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmModalIds([it.id])
                                  setConfirmScore(it.qualityScore ?? 9.0)
                                  setConfirmNote(
                                    it.directorNote ||
                                      it.managerNote ||
                                      "Đạt yêu cầu nghiệm thu tiến độ & chất lượng."
                                  )
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-[#059669] border border-emerald-200 hover:bg-emerald-100 transition-colors"
                              >
                                Xác nhận HT
                              </button>
                              <button
                                type="button"
                                onClick={() => setOverdueModalIds([it.id])}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 text-[#E11D48] border border-rose-200 hover:bg-rose-100 transition-colors"
                              >
                                Yêu cầu giải trình
                              </button>
                            </div>
                          )}

                          {canStaffExplain && (
                            <button
                              type="button"
                              onClick={() => {
                                setStaffExplainItem(it)
                                setStaffExplanationText(it.meta.staffExplanation || "")
                                setStaffRecoveryDate(it.meta.staffRecoveryDate || "")
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-[#D97706] border border-amber-200 hover:bg-amber-100 transition-colors"
                            >
                              Gửi giải trình
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Quản lý / Giám đốc Ban Xác nhận Hoàn thành & Gửi Email */}
      {confirmModalIds && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#003B3A]">
                Xác nhận hoàn thành đầu việc ({confirmModalIds.length} mục)
              </h3>
              <button
                type="button"
                onClick={() => setConfirmModalIds(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cấp xác nhận nghiệm thu
                </label>
                <select
                  value={confirmRoleMode}
                  onChange={(e) => setConfirmRoleMode(e.target.value as "MANAGER" | "DIRECTOR")}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                >
                  <option value="MANAGER">Quản lý chuyên môn xác nhận</option>
                  <option value="DIRECTOR">Giám đốc Ban KT&ĐBCL xác nhận & chấm điểm KPI</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Xếp loại chất lượng
                  </label>
                  <select
                    value={confirmRating}
                    onChange={(e) => {
                      const val = e.target.value as any
                      setConfirmRating(val)
                      if (val === "EXCELLENT") setConfirmScore(9.5)
                      else if (val === "GOOD") setConfirmScore(8.8)
                      else if (val === "SATISFACTORY") setConfirmScore(7.5)
                      else setConfirmScore(5.5)
                    }}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                  >
                    <option value="EXCELLENT">Xuất sắc</option>
                    <option value="GOOD">Hoàn thành tốt</option>
                    <option value="SATISFACTORY">Đạt yêu cầu</option>
                    <option value="NEEDS_IMPROVEMENT">Cần cải thiện</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Điểm chất lượng (thang 10)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={confirmScore}
                    onChange={(e) => setConfirmScore(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 tabular-nums focus:outline-none focus:border-[#00A19A]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nhận xét nghiệm thu của Quản lý / Giám đốc Ban
                </label>
                <textarea
                  rows={3}
                  value={confirmNote}
                  onChange={(e) => setConfirmNote(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                  placeholder="Nhập ý kiến đánh giá hoặc ghi nhận kết quả..."
                />
              </div>

              <label className="flex items-center gap-2 rounded-xl bg-[#F0FDFA] border border-teal-200 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmSendMail}
                  onChange={(e) => setConfirmSendMail(e.target.checked)}
                  className="rounded border-teal-300 text-[#00A19A]"
                />
                <span className="text-xs font-medium text-[#003B3A] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#008B85]" />
                  Tự động gửi Email thông báo xác nhận hoàn thành & điểm chất lượng cho nhân sự
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalIds(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-[#E2E8F0] hover:bg-[#F8FAFC]"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={modalBusy}
                onClick={handleSubmitConfirmModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#059669] text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {modalBusy ? "Đang xác nhận..." : "Xác nhận hoàn thành"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Cảnh báo Trễ tiến độ & Gửi Email Yêu cầu Giải trình */}
      {overdueModalIds && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#E11D48]">
                Cảnh báo trễ tiến độ & yêu cầu giải trình ({overdueModalIds.length} mục)
              </h3>
              <button
                type="button"
                onClick={() => setOverdueModalIds(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nội dung yêu cầu nhân sự giải trình
                </label>
                <textarea
                  rows={3}
                  value={overdueNote}
                  onChange={(e) => setOverdueNote(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E11D48]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Thời hạn yêu cầu gửi giải trình (tùy chọn)
                </label>
                <input
                  type="text"
                  value={overdueDueDate}
                  onChange={(e) => setOverdueDueDate(e.target.value)}
                  placeholder="Ví dụ: Trước 16:00 ngày mai (hoặc để trống mặc định trong 24 giờ)"
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E11D48]"
                />
              </div>

              <label className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overdueSendMail}
                  onChange={(e) => setOverdueSendMail(e.target.checked)}
                  className="rounded border-rose-300 text-[#E11D48]"
                />
                <span className="text-xs font-medium text-[#E11D48] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Gửi Email cảnh báo trễ tiến độ và yêu cầu giải trình đến nhân sự phụ trách
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOverdueModalIds(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-[#E2E8F0] hover:bg-[#F8FAFC]"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={modalBusy}
                onClick={handleSubmitOverdueModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#E11D48] text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {modalBusy ? "Đang gửi..." : "Gửi yêu cầu giải trình"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Nhân sự Nộp Giải trình Trễ tiến độ */}
      {staffExplainItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#003B3A]">
                Gửi giải trình tiến độ công việc
              </h3>
              <button
                type="button"
                onClick={() => setStaffExplainItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3">
                <div className="font-bold text-[#003B3A]">{staffExplainItem.mainTask}</div>
                <p className="text-slate-600 mt-1">{staffExplainItem.workContent}</p>
                {staffExplainItem.meta.explanationRequestNote && (
                  <p className="mt-2 text-[#E11D48] font-medium">
                    Yêu cầu từ Lãnh đạo: {staffExplainItem.meta.explanationRequestNote}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nguyên nhân chậm tiến độ & giải pháp khắc phục
                </label>
                <textarea
                  rows={4}
                  value={staffExplanationText}
                  onChange={(e) => setStaffExplanationText(e.target.value)}
                  placeholder="Trình bày rõ nguyên nhân khách quan/chủ quan và phương án xử lý dứt điểm..."
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ngày cam kết hoàn thành bù
                </label>
                <input
                  type="text"
                  value={staffRecoveryDate}
                  onChange={(e) => setStaffRecoveryDate(e.target.value)}
                  placeholder="Ví dụ: 20/11/2026"
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStaffExplainItem(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-[#E2E8F0] hover:bg-[#F8FAFC]"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={modalBusy}
                onClick={handleSubmitStaffExplainModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] text-white hover:bg-[#005250] disabled:opacity-50"
              >
                {modalBusy ? "Đang gửi..." : "Gửi giải trình cho Quản lý & GĐB"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
