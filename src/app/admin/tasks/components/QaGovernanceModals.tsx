"use client"

import React, { useState, useEffect } from "react"
import {
  X,
  BarChart3,
  Bell,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Repeat,
  Send,
} from "lucide-react"
import { computeQaWorkspaceAnalytics } from "@/lib/qa-workspace/analyticsEngine"
import {
  dispatchSmartQaReminders,
  upsertCapaImprovementAction,
  triggerApprovedRecurringTasks,
} from "../qa_workspace_actions"

/* =========================================================================
 * 1. MODAL BÁO CÁO & DỮ LIỆU ĐA CHIỀU (MỤC IX)
 * Mỗi tỷ lệ có định nghĩa, phạm vi và mẫu số (N) rõ ràng.
 * Không suy luận chất lượng chuyên môn chỉ từ tốc độ xử lý công việc.
 * ========================================================================= */
export function QaAnalyticsReportModal({
  isOpen,
  onClose,
  tasks,
  taskGroups,
  allStaffUsers,
  campuses,
  improvementActions,
}: {
  isOpen: boolean
  onClose: () => void
  tasks: any[]
  taskGroups: any[]
  allStaffUsers: any[]
  campuses: any[]
  improvementActions: any[]
}) {
  const [groupFilter, setGroupFilter] = useState("ALL")
  const [campusFilter, setCampusFilter] = useState("ALL")

  if (!isOpen) return null

  const filteredTasks = tasks.filter(t => {
    if (groupFilter !== "ALL" && t.taskGroupId !== groupFilter) return false
    if (campusFilter !== "ALL" && t.qaMeta?.scopeCampusId !== campusFilter) return false
    return true
  })

  const scopeLabel =
    groupFilter === "ALL"
      ? "Toàn Ban KT&ĐBCL"
      : taskGroups.find(g => g.id === groupFilter)?.name || "Nhóm đã chọn"

  const report = computeQaWorkspaceAnalytics({
    tasks: filteredTasks.map(t => ({
      id: t.id,
      title: t.title,
      category: t.category,
      taskGroupId: t.taskGroupId,
      taskGroupName: t.taskGroup?.name || "Toàn Ban",
      assignedToUserId: t.assignedToUserId,
      assignedToUserName: t.assignedToUser?.fullName || t.assignedToRole,
      startDate: t.startDate,
      endDate: t.endDate,
      completedAt: t.completedAt,
      progress: t.progress,
      workflowStatus: t.qaMeta?.workflowStatus,
      reviewDueDate: t.qaMeta?.reviewDueDate,
      submittedForReviewAt: t.qaMeta?.submittedForReviewAt,
      reviewRating: t.qaMeta?.reviewRating,
      scopeCampusId: t.qaMeta?.scopeCampusId,
      unresolvedBlockersCount: (t.comments || []).filter(
        (c: any) => c.commentType === "BLOCKER" && c.actionStatus !== "RESOLVED"
      ).length,
    })),
    improvementActions,
    scopeDescription: scopeLabel,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-teal-700" />
            <div>
              <h2 className="text-base font-extrabold">
                Báo cáo & Dữ liệu Điều hành Đa chiều — Ban KT&ĐBCL
              </h2>
              <p className="text-[11px] text-slate-300">
                Mỗi tỷ lệ đều hiển thị công thức, phạm vi và mẫu số (N) tường minh • Tách biệt tiến độ và chất lượng chuyên môn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <select
              value={groupFilter}
              onChange={e => setGroupFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white"
            >
              <option value="ALL">Tất cả Nhóm chuyên môn</option>
              {taskGroups.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <select
              value={campusFilter}
              onChange={e => setCampusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white"
            >
              <option value="ALL">Tất cả Cơ sở</option>
              {campuses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
            Lưu ý quản trị: Không suy luận chất lượng chuyên môn chỉ từ tốc độ xử lý công việc.
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 4 Tỷ lệ chuẩn có công thức, phạm vi & mẫu số N */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              report.rates.completionRate,
              report.rates.onTimeSubmissionRate,
              report.rates.lateSubmissionRate,
              report.rates.overdueUnsubmittedRate,
            ].map(metric => (
              <div
                key={metric.code}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
              >
                <div className="text-xs font-extrabold text-slate-800">
                  {metric.label}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-teal-800">
                    {metric.percentage !== null ? `${metric.percentage}%` : "N/A"}
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    ({metric.numerator} / N={metric.denominator})
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80 space-y-1">
                  <div>
                    <strong>Công thức:</strong> {metric.formulaText}
                  </div>
                  <div>
                    <strong>Mẫu số (N={metric.denominator}):</strong>{" "}
                    {metric.denominatorLabel}
                  </div>
                  <div>
                    <strong>Phạm vi:</strong> {metric.scopeDescription}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bảng phân tích theo Nhóm chuyên môn */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 mb-2.5">
              1. Thống kê theo Nhóm Chuyên môn
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-extrabold">
                  <tr>
                    <th className="p-3">Nhóm chuyên môn</th>
                    <th className="p-3 text-center">Tổng (N)</th>
                    <th className="p-3 text-center">Đang mở</th>
                    <th className="p-3 text-center">Đang làm</th>
                    <th className="p-3 text-center">Chờ duyệt</th>
                    <th className="p-3 text-center">Hoàn thành</th>
                    <th className="p-3 text-center">Đúng hạn</th>
                    <th className="p-3 text-center">Nộp trễ</th>
                    <th className="p-3 text-center">Quá hạn chưa nộp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {report.byGroup.map(row => (
                    <tr key={row.key} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{row.label}</td>
                      <td className="p-3 text-center font-bold">{row.total}</td>
                      <td className="p-3 text-center">{row.openCount}</td>
                      <td className="p-3 text-center text-sky-700 font-semibold">
                        {row.inProgressCount}
                      </td>
                      <td className="p-3 text-center text-teal-800 font-bold">
                        {row.pendingReviewCount}
                      </td>
                      <td className="p-3 text-center text-emerald-700 font-bold">
                        {row.completedCount}
                      </td>
                      <td className="p-3 text-center text-teal-700">
                        {row.onTimeCount}
                      </td>
                      <td className="p-3 text-center text-amber-700">
                        {row.lateSubmittedCount}
                      </td>
                      <td className="p-3 text-center text-rose-700 font-bold">
                        {row.overdueUnsubmittedCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tách biệt Hoàn thành hành động cải tiến vs Xác nhận hiệu quả */}
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <div className="font-bold text-emerald-950">
                Tổng hồ sơ Cải tiến chất lượng (CAPA)
              </div>
              <div className="text-2xl font-black text-emerald-800 mt-1">
                {report.improvementSummary.totalActions}
              </div>
            </div>
            <div>
              <div className="font-bold text-teal-800">
                Đã hoàn thành hành động (Chờ/Đã XN)
              </div>
              <div className="text-2xl font-black text-teal-800 mt-1">
                {report.improvementSummary.actionCompletedCount}
              </div>
            </div>
            <div>
              <div className="font-bold text-teal-950">
                Đã xác nhận hiệu quả thực tế sau cải tiến
              </div>
              <div className="text-2xl font-black text-teal-800 mt-1">
                {report.improvementSummary.effectivenessVerifiedCount} (
                {report.improvementSummary.verifiedEffectivenessRate.percentage ?? 0}
                %)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
 * 2. MODAL NHẮC VIỆC & LỊCH SỬ THÔNG BÁO THÔNG MINH (MỤC VII)
 * Cấu hình nhắc 6 kịch bản, đúng người thực hiện / điều phối / người duyệt,
 * gộp thông báo, chống gửi trùng (dedupKey) và lưu lịch sử.
 * ========================================================================= */
export function QaSmartReminderModal({
  isOpen,
  onClose,
  recentReminders,
  onDispatched,
}: {
  isOpen: boolean
  onClose: () => void
  recentReminders: any[]
  onDispatched: (logs: any[]) => void
}) {
  const [dispatching, setDispatching] = useState(false)
  const [triggeringRecurring, setTriggeringRecurring] = useState(false)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [logs, setLogs] = useState<any[]>(recentReminders)

  useEffect(() => {
    setLogs(recentReminders)
  }, [recentReminders])

  if (!isOpen) return null

  const handleDispatchReminders = async () => {
    setDispatching(true)
    setResultMsg(null)
    try {
      const res = await dispatchSmartQaReminders()
      if (res.success) {
        setLogs(res.recentLogs || [])
        onDispatched(res.recentLogs || [])
        setResultMsg(
          `Đã rà soát 6 kịch bản nhắc việc: Phát hành ${res.sentNotifications} thông báo gộp (${res.recordedItems} mục mới, tự động chặn gửi trùng trong ngày).`
        )
      } else {
        setResultMsg(res.error || "Không thể gửi nhắc việc.")
      }
    } finally {
      setDispatching(false)
    }
  }

  const handleTriggerRecurring = async () => {
    setTriggeringRecurring(true)
    setResultMsg(null)
    try {
      const res = await triggerApprovedRecurringTasks()
      if (res.success) {
        setResultMsg(
          `Đã kiểm tra quy tắc việc định kỳ: Phát hành ${res.spawnedCount} nhiệm vụ mới, chặn trùng lặp ${res.skippedCount} nhiệm vụ đã tồn tại trong kỳ.`
        )
      }
    } finally {
      setTriggeringRecurring(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-extrabold">
                Điều phối Nhắc việc Thông minh & Phát hành Định kỳ
              </h2>
              <p className="text-[11px] text-slate-300">
                Nhắc đúng vai trò (Thực hiện / Điều phối / Duyệt) • Gộp thông báo • Chống gửi trùng (dedupKey)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* 6 kịch bản cấu hình nhắc việc */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            {[
              { code: "NOT_STARTED", label: "1. Chưa bắt đầu", role: "Người thực hiện" },
              { code: "DUE_SOON", label: "2. Sắp đến hạn (≤36h)", role: "Người thực hiện" },
              {
                code: "OVERDUE",
                label: "3. Quá hạn thực hiện / duyệt",
                role: "Thực hiện / Điều phối / Duyệt",
              },
              { code: "PENDING_REVIEW", label: "4. Chờ duyệt", role: "Người duyệt" },
              { code: "NEEDS_REVISION", label: "5. Cần bổ sung", role: "Người thực hiện" },
              {
                code: "UNRESOLVED_BLOCKER",
                label: "6. Vướng mắc chưa phản hồi",
                role: "Điều phối / Người giao",
              },
            ].map(item => (
              <div
                key={item.code}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200"
              >
                <div className="font-bold text-slate-900">{item.label}</div>
                <div className="text-[11px] text-teal-800 font-semibold mt-0.5">
                  Đích nhắc: {item.role}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={dispatching}
              onClick={handleDispatchReminders}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-500 text-white text-xs font-extrabold cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {dispatching
                ? "Đang rà soát & gửi thông báo..."
                : "Kích hoạt Rà soát & Gửi Nhắc việc Gộp"}
            </button>

            <button
              type="button"
              disabled={triggeringRecurring}
              onClick={handleTriggerRecurring}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold cursor-pointer"
            >
              <Repeat className="w-4 h-4" />
              {triggeringRecurring
                ? "Đang kiểm tra việc định kỳ..."
                : "Phát hành Việc Định kỳ đã phê duyệt"}
            </button>
          </div>

          {resultMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900">
              {resultMsg}
            </div>
          )}

          {/* Lịch sử thông báo nhắc việc */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
              Lịch sử Nhắc việc đã phát hành ({logs.length})
            </h3>
            {logs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                Chưa có bản ghi lịch sử nhắc việc.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {logs.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-bold text-[10px] mr-2">
                        {log.reminderType}
                      </span>
                      <span className="font-semibold text-slate-800">
                        Vai trò nhận: {log.recipientRole}
                      </span>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Khóa chống trùng: <code>{log.dedupKey}</code>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {new Date(log.sentAt).toLocaleString("vi-VN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
 * 3. MODAL QUẢN LÝ HÀNH ĐỘNG CẢI TIẾN CHẤT LƯỢNG — CAPA 5 BƯỚC (MỤC VIII)
 * Tách biệt rõ "Hoàn thành hành động" khỏi "Xác nhận hiệu quả".
 * ========================================================================= */
export function QaCapaActionModal({
  isOpen,
  onClose,
  editingAction,
  allStaffUsers,
  years,
  campuses,
  taskGroups,
  onSaved,
}: {
  isOpen: boolean
  onClose: () => void
  editingAction?: any | null
  allStaffUsers: any[]
  years: any[]
  campuses: any[]
  taskGroups: any[]
  onSaved: () => void
}) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [verifiedRootCause, setVerifiedRootCause] = useState("")
  const [actionPlan, setActionPlan] = useState("")
  const [capaDeptFilter, setCapaDeptFilter] = useState("KT&ĐBCL")
  const [assigneeUserId, setAssigneeUserId] = useState("")
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  )
  const [status, setStatus] = useState("OPEN")
  const [evidenceUrl, setEvidenceUrl] = useState("")
  const [verificationResult, setVerificationResult] = useState("")
  const [postImprovementEffectiveness, setPostImprovementEffectiveness] = useState("")
  const [createLinkedWorkTask, setCreateLinkedWorkTask] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (editingAction) {
      setTitle(editingAction.title || "")
      setContent(editingAction.content || "")
      setVerifiedRootCause(editingAction.verifiedRootCause || "")
      setActionPlan(editingAction.actionPlan || "")
      setAssigneeUserId(editingAction.assigneeUserId || "")
      setDueDate(
        editingAction.dueDate
          ? new Date(editingAction.dueDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      )
      setStatus(editingAction.status || "OPEN")
      setEvidenceUrl(editingAction.evidenceUrl || "")
      setVerificationResult(editingAction.verificationResult || "")
      setPostImprovementEffectiveness(
        editingAction.postImprovementEffectiveness || ""
      )
      setCreateLinkedWorkTask(false)
    } else {
      setTitle("")
      setContent("")
      setVerifiedRootCause("")
      setActionPlan("")
      setAssigneeUserId(allStaffUsers[0]?.id || "")
      setStatus("OPEN")
      setEvidenceUrl("")
      setVerificationResult("")
      setPostImprovementEffectiveness("")
      setCreateLinkedWorkTask(true)
    }
  }, [isOpen, editingAction, allStaffUsers])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const assignee = allStaffUsers.find(u => u.id === assigneeUserId)
      const res = await upsertCapaImprovementAction({
        id: editingAction?.id,
        academicYearId: years[0]?.id || "NH-CURRENT",
        campusId: campuses[0]?.id || "CAMPUS-MAIN",
        title,
        content,
        verifiedRootCause,
        actionPlan,
        assigneeUserId,
        assigneeName: assignee?.fullName || "",
        dueDate,
        status,
        evidenceUrl,
        verificationResult,
        postImprovementEffectiveness,
        createLinkedWorkTask: !editingAction && createLinkedWorkTask,
        taskGroupId: taskGroups[0]?.id,
      })
      if (res.success) {
        onSaved()
        onClose()
      } else {
        alert(res.error)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-300" />
            <div>
              <h2 className="text-base font-extrabold">
                Hồ sơ Hành động Cải tiến Chất lượng (CAPA — 5 Bước)
              </h2>
              <p className="text-[11px] text-emerald-200">
                Ghi nhận vấn đề &rarr; Xác minh nguyên nhân &rarr; Giao hành động &rarr; Kiểm tra kết quả &rarr; Xác nhận hiệu quả
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Bước 1: Tên vấn đề chất lượng cần cải tiến *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="VD: Chênh lệch điểm kiểm tra định kỳ và điểm khảo sát chuẩn đầu ra môn Tiếng Anh"
              className="w-full px-3 py-2 rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Mô tả hiện trạng & dữ liệu phát hiện *
            </label>
            <textarea
              rows={2}
              required
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Bước 2: Nguyên nhân gốc rễ đã xác minh *
            </label>
            <textarea
              rows={2}
              required
              value={verifiedRootCause}
              onChange={e => setVerifiedRootCause(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Bước 3: Kế hoạch hành động khắc phục / cải tiến *
            </label>
            <textarea
              rows={2}
              required
              value={actionPlan}
              onChange={e => setActionPlan(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300"
            />
          </div>

          {(() => {
            const deptNames = Array.from(
              new Set([
                "KT&ĐBCL",
                ...allStaffUsers
                  .map(u => u?.teacher?.departmentRel?.name)
                  .filter(Boolean),
              ])
            )
            const filteredUsers = allStaffUsers.filter(u => {
              if (!capaDeptFilter || capaDeptFilter === "ALL") return true
              if (u.id === assigneeUserId) return true
              const dRel = u?.teacher?.departmentRel
              if (capaDeptFilter === "KT&ĐBCL") {
                return (
                  dRel?.name === "KT&ĐBCL" ||
                  dRel?.code === "KT-ĐBCL" ||
                  dRel?.divisionCode === "BAN_KT_DBCL"
                )
              }
              return dRel?.name === capaDeptFilter || dRel?.code === capaDeptFilter
            })
            const pool = filteredUsers.length > 0 ? filteredUsers : allStaffUsers

            return (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-teal-800 mb-1">
                    1. Chọn Tổ CM
                  </label>
                  <select
                    value={capaDeptFilter}
                    onChange={e => setCapaDeptFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-teal-200 bg-teal-50 font-bold text-teal-800"
                  >
                    {deptNames.map(dn => (
                      <option key={dn} value={dn}>
                        {dn} {dn === "KT&ĐBCL" ? "(Mặc định)" : ""}
                      </option>
                    ))}
                    <option value="ALL">Tất cả Tổ CM</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    2. Người chịu trách nhiệm *
                  </label>
                  <select
                    required
                    value={assigneeUserId}
                    onChange={e => setAssigneeUserId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="">-- Chọn thành viên --</option>
                    {pool.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.teacher?.departmentRel?.name || u.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Hạn thực hiện *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Trạng thái 5 bước (Tách biệt)
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  >
                    <option value="OPEN">1. Ghi nhận vấn đề (OPEN)</option>
                    <option value="IN_PROGRESS">2-3. Đang thực hiện hành động</option>
                    <option value="COMPLETED">
                      4. Hoàn thành hành động (Chờ XN hiệu quả)
                    </option>
                    <option value="VERIFIED_EFFECTIVE">
                      5A. Đã xác nhận hiệu quả & Đóng
                    </option>
                    <option value="NEEDS_FOLLOWUP">
                      5B. Chưa đạt hiệu quả — Cần bổ sung hành động
                    </option>
                  </select>
                </div>
              </div>
            )
          })()}

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="font-extrabold text-slate-800">
              Bước 4 & 5: Kiểm tra Kết quả & Xác nhận Hiệu quả sau Cải tiến
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">
                Liên kết minh chứng thực hiện
              </label>
              <input
                type="text"
                value={evidenceUrl}
                onChange={e => setEvidenceUrl(e.target.value)}
                placeholder="URL minh chứng kết quả hành động..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">
                Đánh giá hiệu quả thực tế sau cải tiến (Chỉ xác nhận hiệu quả khi có minh chứng tác động)
              </label>
              <textarea
                rows={2}
                value={postImprovementEffectiveness}
                onChange={e => setPostImprovementEffectiveness(e.target.value)}
                placeholder="Ghi nhận số liệu đo lường sau cải tiến..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>
          </div>

          {!editingAction && (
            <label className="inline-flex items-center gap-2 font-bold text-teal-800 cursor-pointer">
              <input
                type="checkbox"
                checked={createLinkedWorkTask}
                onChange={e => setCreateLinkedWorkTask(e.target.checked)}
                className="rounded text-teal-800"
              />
              <span>
                Đồng thời phát hành Phiếu giao việc liên thông trong QA Workspace (Có khóa chống trùng lặp)
              </span>
            </label>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-500 text-white font-extrabold cursor-pointer"
            >
              {saving ? "Đang lưu..." : "Lưu Hồ sơ Cải tiến"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
