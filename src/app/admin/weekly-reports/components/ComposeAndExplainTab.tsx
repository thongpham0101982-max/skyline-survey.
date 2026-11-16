"use client"

import React, { useEffect, useState } from "react"
import {
  AlertTriangle,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
} from "lucide-react"
import type { EnrichedWeeklyReportItem } from "../ktdbcl_actions"
import type { KtdbclMemberProfile, MonthWeekDefinition } from "@/lib/qa-workspace/weeklyReportSchema"

export interface DraftReportRow {
  id?: string
  taskGroup: string
  category: string
  mainTask: string
  workContent: string
  expectedCompletion: string
  progress: string
  proposedSolution: string
  linkedWorkTaskId?: string | null
}

interface ComposeAndExplainTabProps {
  weekNumber: number
  month: number
  year: number
  allWeeks: MonthWeekDefinition[]
  onChangeWeek: (weekNum: number) => void
  currentUserId: string
  isLeadership: boolean
  members: KtdbclMemberProfile[]
  specialistGroups: string[]
  taskCategories: Array<{ id: string; name: string; weight?: number }>
  targetUserId: string
  onChangeTargetUserId: (uid: string) => void
  existingWeekItems: EnrichedWeeklyReportItem[]
  allMonthItemsForTarget: EnrichedWeeklyReportItem[]
  onSyncFromQaWorkspace: (targetUid: string) => Promise<DraftReportRow[]>
  onSaveReport: (targetUid: string, rows: DraftReportRow[]) => Promise<void>
  onSubmitExplanation: (payload: {
    itemId: string
    explanationText: string
    recoveryDate: string
  }) => Promise<void>
}

export function ComposeAndExplainTab({
  weekNumber,
  month,
  year,
  allWeeks,
  onChangeWeek,
  currentUserId,
  isLeadership,
  members,
  specialistGroups,
  taskCategories,
  targetUserId,
  onChangeTargetUserId,
  existingWeekItems,
  allMonthItemsForTarget,
  onSyncFromQaWorkspace,
  onSaveReport,
  onSubmitExplanation,
}: ComposeAndExplainTabProps) {
  const activeMember = members.find((m) => m.id === targetUserId)
  const defaultGroup = activeMember?.specialistGroups?.[0] || specialistGroups[0] || "ĐBCL"
  const defaultCategory = taskCategories[0]?.name || "Kiểm tra định kì"

  const [rows, setRows] = useState<DraftReportRow[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Inline explanation drafts keyed by itemId
  const [explainTexts, setExplainTexts] = useState<Record<string, string>>({})
  const [explainDates, setExplainDates] = useState<Record<string, string>>({})
  const [submittingExplainId, setSubmittingExplainId] = useState<string | null>(null)

  useEffect(() => {
    if (existingWeekItems.length > 0) {
      setRows(
        existingWeekItems.map((it) => ({
          id: it.id,
          taskGroup: it.taskGroup || defaultGroup,
          category: it.category || it.mainTask || defaultCategory,
          mainTask: it.mainTask,
          workContent: it.workContent,
          expectedCompletion: it.expectedCompletion || "",
          progress: it.progress || "DOING",
          proposedSolution: it.proposedSolution || "",
          linkedWorkTaskId: it.meta.linkedWorkTaskId || null,
        }))
      )
    } else {
      setRows([
        {
          taskGroup: defaultGroup,
          category: defaultCategory,
          mainTask: defaultCategory,
          workContent: "",
          expectedCompletion: "",
          progress: "DOING",
          proposedSolution: "",
        },
      ])
    }
  }, [targetUserId, weekNumber, month, year, existingWeekItems.length])

  const pendingExplanationItems = allMonthItemsForTarget.filter(
    (it) => it.meta.confirmStatus === "OVERDUE_EXPLANATION_REQUIRED"
  )

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        taskGroup: defaultGroup,
        category: defaultCategory,
        mainTask: defaultCategory,
        workContent: "",
        expectedCompletion: "",
        progress: "DOING",
        proposedSolution: "",
      },
    ])
  }

  const handleRemoveRow = (idx: number) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
  }

  const updateRow = (idx: number, patch: Partial<DraftReportRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const handleSyncQa = async () => {
    setIsSyncing(true)
    try {
      const imported = await onSyncFromQaWorkspace(targetUserId)
      if (imported.length > 0) {
        setRows((prev) => {
          const nonEmpty = prev.filter((r) => r.workContent.trim().length > 0)
          const existingTitles = new Set(nonEmpty.map((r) => r.mainTask.trim().toLowerCase()))
          const fresh = imported.filter(
            (imp) => !existingTitles.has(imp.mainTask.trim().toLowerCase())
          )
          return [...nonEmpty, ...fresh]
        })
      }
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSaveReport(targetUserId, rows)
    } finally {
      setIsSaving(false)
    }
  }

  const handleQuickSubmitExplanation = async (item: EnrichedWeeklyReportItem) => {
    const text = (explainTexts[item.id] ?? item.meta.staffExplanation ?? "").trim()
    const recDate = (explainDates[item.id] ?? item.meta.staffRecoveryDate ?? "").trim()
    setSubmittingExplainId(item.id)
    try {
      await onSubmitExplanation({
        itemId: item.id,
        explanationText: text,
        recoveryDate: recDate,
      })
    } finally {
      setSubmittingExplainId(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* 1. Khối Yêu cầu Giải trình Trễ tiến độ (nếu có) */}
      {pendingExplanationItems.length > 0 && (
        <div className="bg-rose-50/70 rounded-2xl border border-rose-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-[#E11D48]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <h3 className="text-sm font-bold">
              Cần gửi giải trình tiến độ ({pendingExplanationItems.length} đầu việc chậm hạn trong Tháng {month})
            </h3>
          </div>

          <div className="space-y-3">
            {pendingExplanationItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-rose-200 p-3.5 space-y-2.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-[#003B3A]">
                      [Tuần {item.weekNumber}] {item.mainTask}
                    </span>
                    <span className="ml-2 px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-teal-200 text-[11px]">
                      {item.taskGroup}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#E11D48]">
                    Hạn dự kiến: {item.expectedCompletion || "Đã quá hạn"}
                  </span>
                </div>

                <p className="text-slate-600">{item.workContent}</p>

                {item.meta.explanationRequestNote && (
                  <div className="rounded-lg bg-rose-50 px-3 py-2 text-[#E11D48] font-medium">
                    Yêu cầu từ {item.meta.overdueFlaggedByName || "Lãnh đạo Ban"}:{" "}
                    {item.meta.explanationRequestNote}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-1">
                  <div className="md:col-span-7">
                    <input
                      type="text"
                      value={explainTexts[item.id] ?? ""}
                      onChange={(e) =>
                        setExplainTexts((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder="Nhập nguyên nhân trễ tiến độ & giải pháp khắc phục..."
                      className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={explainDates[item.id] ?? ""}
                      onChange={(e) =>
                        setExplainDates((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder="Cam kết ngày HT bù (VD: 22/11)"
                      className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      disabled={submittingExplainId === item.id}
                      onClick={() => handleQuickSubmitExplanation(item)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] text-white hover:bg-[#005250] disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Gửi giải trình
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Thanh chọn Nhân sự, Tuần báo cáo & Đồng bộ từ QA Workspace */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {isLeadership ? (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Nhân sự báo cáo:</label>
              <select
                value={targetUserId}
                onChange={(e) => onChangeTargetUserId(e.target.value)}
                className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-[#003B3A] focus:outline-none focus:border-[#00A19A]"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.position})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-xs font-semibold text-[#003B3A]">
              Người lập báo cáo: {activeMember?.fullName || "Thành viên Ban KT&ĐBCL"}
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Kỳ tuần:</label>
            <select
              value={weekNumber}
              onChange={(e) => onChangeWeek(Number(e.target.value))}
              className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-[#003B3A] tabular-nums focus:outline-none focus:border-[#00A19A]"
            >
              {allWeeks.map((w) => (
                <option key={w.weekNum} value={w.weekNum}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isSyncing}
            onClick={handleSyncQa}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-teal-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Đang đồng bộ..." : "Đồng bộ đầu việc từ QA Workspace"}
          </button>

          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-[#003B3A] border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#00A19A]" />
            Thêm dòng việc
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] text-white hover:bg-[#005250] transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Đang lưu..." : `Lưu & Nộp báo cáo Tuần ${weekNumber}`}
          </button>
        </div>
      </div>

      {/* 3. Bảng nhập liệu Báo cáo Tuần theo chuẩn Sky-Line Academic Ledger */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white w-10 text-center">
                  STT
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 w-44">
                  Nhóm chuyên môn
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 w-52">
                  Danh mục / Đầu việc chính
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white min-w-[280px]">
                  Nội dung công việc thực hiện chi tiết
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 w-36">
                  Dự kiến hoàn thành
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] w-36">
                  Tiến độ
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 min-w-[200px]">
                  Đề xuất giải pháp / Kiến nghị
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white w-12 text-center">
                  Xóa
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {rows.map((row, idx) => (
                <tr key={row.id || `draft_${idx}`} className="align-top hover:bg-[#F8FAFC]">
                  <td className="py-3 px-3 text-center font-semibold text-slate-500 pt-4">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-3">
                    <select
                      value={row.taskGroup}
                      onChange={(e) => updateRow(idx, { taskGroup: e.target.value })}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                    >
                      {specialistGroups.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-3 space-y-1.5">
                    {taskCategories.length > 0 && (
                      <select
                        value={row.category}
                        onChange={(e) =>
                          updateRow(idx, {
                            category: e.target.value,
                            mainTask:
                              !row.mainTask || row.mainTask === row.category
                                ? e.target.value
                                : row.mainTask,
                          })
                        }
                        className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#00A19A]"
                      >
                        {taskCategories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      type="text"
                      value={row.mainTask}
                      onChange={(e) => updateRow(idx, { mainTask: e.target.value })}
                      placeholder="Tên đầu việc chính..."
                      className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-1.5 text-xs font-medium text-[#003B3A] focus:outline-none focus:border-[#00A19A]"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <textarea
                      rows={3}
                      value={row.workContent}
                      onChange={(e) => updateRow(idx, { workContent: e.target.value })}
                      placeholder="Mô tả kết quả thực hiện, số liệu hoặc đường dẫn minh chứng..."
                      className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <input
                      type="text"
                      value={row.expectedCompletion}
                      onChange={(e) => updateRow(idx, { expectedCompletion: e.target.value })}
                      placeholder="VD: 18/11/2026"
                      className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-[#00A19A]"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <select
                      value={row.progress}
                      onChange={(e) => updateRow(idx, { progress: e.target.value })}
                      className={`w-full rounded-xl border px-2.5 py-2 text-xs font-semibold focus:outline-none ${
                        row.progress === "COMPLETED"
                          ? "bg-emerald-50 text-[#059669] border-emerald-200"
                          : row.progress === "DOING"
                          ? "bg-amber-50 text-[#D97706] border-amber-200"
                          : "bg-slate-50 text-slate-600 border-[#E2E8F0]"
                      }`}
                    >
                      <option value="COMPLETED">Hoàn thành</option>
                      <option value="DOING">Đang thực hiện</option>
                      <option value="NOT_STARTED">Chưa bắt đầu</option>
                    </select>
                  </td>
                  <td className="py-3 px-3">
                    <textarea
                      rows={3}
                      value={row.proposedSolution}
                      onChange={(e) => updateRow(idx, { proposedSolution: e.target.value })}
                      placeholder="Đề xuất hỗ trợ, phối hợp (nếu có)..."
                      className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-[#00A19A]"
                    />
                  </td>
                  <td className="py-3 px-3 text-center pt-3.5">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      disabled={rows.length <= 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#E11D48] hover:bg-rose-50 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
