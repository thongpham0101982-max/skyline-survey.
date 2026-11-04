"use client"

import React, { useState, useEffect } from "react"
import {
  X,
  Sparkles,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Users,
  ArrowRight,
  Copy,
  Check,
  ShieldAlert,
  CalendarClock,
  SlidersHorizontal,
} from "lucide-react"
import type { NlpTaskDraft } from "@/lib/qa-workspace/types"
import { createQaWorkspaceTask } from "../qa_workspace_actions"

interface QaAssistantPanelProps {
  isOpen: boolean
  initialPrompt?: string
  tasks: any[]
  taskGroups: any[]
  allStaffUsers: any[]
  years: any[]
  onClose: () => void
  onTaskCreated: () => void
  onOpenDetailedDraft: (draft: any) => void
  onSelectTask: (task: any) => void
  onSelectMember: (userId: string) => void
}

export function QaAssistantPanel({
  isOpen,
  initialPrompt,
  tasks,
  taskGroups,
  allStaffUsers,
  years,
  onClose,
  onTaskCreated,
  onOpenDetailedDraft,
  onSelectTask,
  onSelectMember,
}: QaAssistantPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "NLP_DRAFT" | "BLOCKERS" | "REPORT"
  >("OVERVIEW")

  const [promptInput, setPromptInput] = useState(
    initialPrompt ||
      "Giao nhóm Khảo thí rà soát ma trận khối 6 trước 16:00 thứ Sáu; phân công theo môn và nộp bảng tổng hợp điều chỉnh."
  )
  const [parsing, setParsing] = useState(false)
  const [draft, setDraft] = useState<NlpTaskDraft | null>(null)
  const [engineMode, setEngineMode] = useState<string | null>(null)
  const [capabilityNotice, setCapabilityNotice] = useState<string | null>(null)

  // Editable fields on the draft preview before confirming
  const [draftAssigneeId, setDraftAssigneeId] = useState<string>("")
  const [draftReviewerId, setDraftReviewerId] = useState<string>("")
  const [draftGroupId, setDraftGroupId] = useState<string>("")
  const [draftEndDate, setDraftEndDate] = useState<string>("")
  const [draftDeliverables, setDraftDeliverables] = useState<string>("")
  const [confirming, setConfirming] = useState(false)
  const [confirmSuccessMsg, setConfirmSuccessMsg] = useState<string | null>(null)
  const [confirmErrorMsg, setConfirmErrorMsg] = useState<string | null>(null)

  // Report generator state
  const [reportPeriod, setReportPeriod] = useState<"WEEKLY" | "MONTHLY">("WEEKLY")
  const [reportGroupId, setReportGroupId] = useState<string>("ALL")
  const [reportMarkdown, setReportMarkdown] = useState<string>("")
  const [generatingReport, setGeneratingReport] = useState(false)
  const [copiedReport, setCopiedReport] = useState(false)

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setPromptInput(initialPrompt)
      setActiveTab("NLP_DRAFT")
    }
  }, [initialPrompt])

  if (!isOpen) return null

  // 1. Tổng hợp việc hôm nay, sắp đến hạn, quá hạn và chờ duyệt
  const todayTasks = tasks.filter(
    t =>
      (t.qaMeta?.workflowStatus || t.progress) === "IN_PROGRESS" ||
      (t.qaMeta?.workflowStatus || t.progress) === "ASSIGNED"
  )
  const dueSoonTasks = tasks.filter(t => t.deadlineInfo?.isDueSoon)
  const overdueTasks = tasks.filter(t =>
    Boolean(t.deadlineInfo?.isOverdue || t.progress === "OVERDUE")
  )
  const pendingReviewTasks = tasks.filter(
    t => t.qaMeta?.workflowStatus === "PENDING_REVIEW"
  )

  // Tổng hợp vướng mắc cần người quản lý quyết định
  const unresolvedBlockers: Array<{
    task: any
    commentId: string
    content: string
    author: string
  }> = []
  for (const t of tasks) {
    for (const c of t.comments || []) {
      if (c.commentType === "BLOCKER" && c.actionStatus !== "RESOLVED") {
        unresolvedBlockers.push({
          task: t,
          commentId: c.id,
          content: c.content,
          author: c.user?.fullName || "Nhân sự",
        })
      }
    }
  }

  // Gợi ý bước tiếp theo từ trạng thái & dữ liệu đã ghi nhận
  const nextStepSuggestions: Array<{
    task: any
    reason: string
    recommendedAction: string
  }> = []
  for (const t of tasks) {
    const st = t.qaMeta?.workflowStatus || t.progress
    if (st === "PENDING_REVIEW") {
      nextStepSuggestions.push({
        task: t,
        reason: "Đã nộp kết quả chờ nghiệm thu",
        recommendedAction: "Kiểm tra minh chứng & bấm Duyệt hoàn thành hoặc Yêu cầu bổ sung",
      })
    } else if (t.deadlineInfo?.code === "OVERDUE_EXECUTION") {
      nextStepSuggestions.push({
        task: t,
        reason: t.deadlineInfo.label,
        recommendedAction: "Gửi nhắc việc hoặc điều phối người hỗ trợ để tháo gỡ điểm nghẽn",
      })
    } else if (
      st === "IN_PROGRESS" &&
      t.checklistStats?.totalSteps > 0 &&
      t.checklistStats?.completedSteps === t.checklistStats?.totalSteps
    ) {
      nextStepSuggestions.push({
        task: t,
        reason: "Đã hoàn thành 100% các bước checklist",
        recommendedAction: "Đính kèm liên kết minh chứng và chuyển sang Chờ duyệt",
      })
    }
  }

  const handleParseNaturalLanguage = async () => {
    if (!promptInput.trim()) return
    setParsing(true)
    setConfirmSuccessMsg(null)
    setConfirmErrorMsg(null)
    try {
      const res = await fetch("/api/admin/qa-workspace/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PARSE_DRAFT",
          prompt: promptInput,
        }),
      })
      const data = await res.json()
      if (data.success && data.draft) {
        const d: NlpTaskDraft = data.draft
        setDraft(d)
        setEngineMode(data.engineMode || null)
        setCapabilityNotice(data.capabilityNotice || null)
        setDraftAssigneeId(d.assignedToUserId || "")
        setDraftReviewerId(d.reviewerUserId || "")
        setDraftGroupId(d.taskGroupId || "")
        setDraftEndDate(d.endDateIso ? d.endDateIso.slice(0, 10) : "")
        setDraftDeliverables(d.deliverables || "")
      } else {
        setConfirmErrorMsg(data.error || "Không thể phân tích yêu cầu.")
      }
    } catch (e: any) {
      setConfirmErrorMsg(e?.message || "Lỗi kết nối máy chủ QA Assistant.")
    } finally {
      setParsing(false)
    }
  }

  const handleConfirmReleaseDraft = async () => {
    if (!draft) return
    setConfirmErrorMsg(null)
    setConfirmSuccessMsg(null)

    if (!draftAssigneeId) {
      setConfirmErrorMsg(
        "Trường còn thiếu: Vui lòng chọn Người chịu trách nhiệm chính (hoặc Người điều phối nhóm) trước khi xác nhận giao việc."
      )
      return
    }
    if (!draftEndDate) {
      setConfirmErrorMsg("Trường còn thiếu: Vui lòng xác nhận Hạn hoàn thành.")
      return
    }

    setConfirming(true)
    try {
      const res = await createQaWorkspaceTask({
        title: draft.title,
        description: draft.description,
        category: draft.category || "Khảo thí",
        taskGroupId: draftGroupId || null,
        workspaceCardKey: draft.workspaceCardKey || "KHAO_THI",
        assignmentMode: draft.assignmentMode,
        assignedToUserId: draftAssigneeId,
        reviewerUserId: draftReviewerId || null,
        startDate: draft.startDateIso.slice(0, 10),
        endDate: draftEndDate,
        priority: draft.priority,
        deliverables: draftDeliverables,
        completionCriteria: draft.completionCriteria,
        requiredEvidences: draft.requiredEvidences,
        checklistSteps: draft.checklistSteps,
        requiresApproval: true,
        scopeGradeLevel: draft.scopeGradeLevel,
        scopeSubject: draft.scopeSubject,
        academicYearId: years[0]?.id || null,
      })

      if (res.success) {
        setConfirmSuccessMsg(
          "Đã phát hành phiếu giao việc thành công và gửi thông báo đến người nhận!"
        )
        onTaskCreated()
      } else {
        setConfirmErrorMsg(res.error || "Không thể phát hành phiếu giao việc.")
      }
    } finally {
      setConfirming(false)
    }
  }

  const handleGenerateReport = async () => {
    setGeneratingReport(true)
    try {
      const res = await fetch("/api/admin/qa-workspace/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GENERATE_REPORT_DRAFT",
          periodType: reportPeriod,
          groupId: reportGroupId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setReportMarkdown(data.reportMarkdown || "")
      }
    } finally {
      setGeneratingReport(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-violet-900 via-violet-800 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-200" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                QA Assistant — Trợ lý Điều hành KT&ĐBCL
              </h2>
              <p className="text-[11px] text-violet-200">
                Giao việc ngôn ngữ tự nhiên (Asia/Ho_Chi_Minh) • Rà soát tiến độ • Tổng hợp báo cáo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "OVERVIEW", label: "Tổng hợp & Gợi ý" },
            { id: "NLP_DRAFT", label: "Soạn Phiếu Giao việc AI" },
            {
              id: "BLOCKERS",
              label: `Vướng mắc (${unresolvedBlockers.length})`,
            },
            { id: "REPORT", label: "Dự thảo Báo cáo Tuần/Tháng" },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-extrabold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? "border-violet-600 text-violet-700 bg-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: TỔNG HỢP HÔM NAY, THEO DÕI NHÓM/CÁ NHÂN & GỢI Ý BƯỚC TIẾP THEO */}
          {activeTab === "OVERVIEW" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200">
                  <div className="text-[11px] font-bold text-sky-800">Việc hôm nay</div>
                  <div className="text-2xl font-black text-sky-900 mt-0.5">
                    {todayTasks.length}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-[11px] font-bold text-amber-800">Sắp đến hạn</div>
                  <div className="text-2xl font-black text-amber-900 mt-0.5">
                    {dueSoonTasks.length}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                  <div className="text-[11px] font-bold text-rose-800">Quá hạn</div>
                  <div className="text-2xl font-black text-rose-900 mt-0.5">
                    {overdueTasks.length}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-violet-50 border border-violet-200">
                  <div className="text-[11px] font-bold text-violet-800">Chờ duyệt</div>
                  <div className="text-2xl font-black text-violet-900 mt-0.5">
                    {pendingReviewTasks.length}
                  </div>
                </div>
              </div>

              {/* Khung nhắc nhanh sang tạo phiếu NLP */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-extrabold text-violet-950">
                    Giao việc nhanh bằng câu lệnh tiếng Việt tự nhiên
                  </div>
                  <p className="text-[11px] text-violet-700 mt-0.5">
                    Tự động quy đổi thời gian tương đối (Asia/Ho_Chi_Minh), tách bước thực hiện và kiểm tra trường còn thiếu.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("NLP_DRAFT")}
                  className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shrink-0 cursor-pointer"
                >
                  Soạn phiếu ngay
                </button>
              </div>

              {/* Gợi ý bước tiếp theo từ trạng thái thực tế */}
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2.5">
                  Gợi ý bước tiếp theo từ dữ liệu đã ghi nhận ({nextStepSuggestions.length})
                </h3>
                {nextStepSuggestions.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                    Tất cả nhiệm vụ đang trong lộ trình ổn định.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {nextStepSuggestions.slice(0, 6).map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => onSelectTask(item.task)}
                        className="p-3.5 rounded-xl border border-slate-200 hover:border-violet-400 bg-white cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {item.task.title}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-50 text-violet-700 shrink-0">
                            {item.reason}
                          </span>
                        </div>
                        <div className="mt-1.5 text-xs text-teal-700 font-semibold flex items-center gap-1">
                          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                          <span>Đề xuất: {item.recommendedAction}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Theo dõi nhanh theo Nhóm chuyên môn */}
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2.5">
                  Theo dõi khối lượng theo Nhóm chuyên môn ({taskGroups.length})
                </h3>
                <div className="space-y-2">
                  {taskGroups.map(g => {
                    const gTasks = tasks.filter(t => t.taskGroupId === g.id)
                    const gOverdue = gTasks.filter(t => t.deadlineInfo?.isOverdue).length
                    const gPendingReview = gTasks.filter(
                      t => t.qaMeta?.workflowStatus === "PENDING_REVIEW"
                    ).length
                    return (
                      <div
                        key={g.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <span className="font-bold text-slate-800">{g.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">
                            {gTasks.length} việc
                          </span>
                          {gPendingReview > 0 && (
                            <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-800 font-bold">
                              {gPendingReview} chờ duyệt
                            </span>
                          )}
                          {gOverdue > 0 && (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                              {gOverdue} quá hạn
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TẠO DỰ THẢO PHIẾU GIAO VIỆC TỪ NGÔN NGỮ TỰ NHIÊN */}
          {activeTab === "NLP_DRAFT" && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                  Nhập yêu cầu giao việc bằng ngôn ngữ tự nhiên:
                </label>
                <textarea
                  rows={3}
                  value={promptInput}
                  onChange={e => setPromptInput(e.target.value)}
                  placeholder="Ví dụ: Giao nhóm Khảo thí rà soát ma trận khối 6 trước 16:00 thứ Sáu; phân công theo môn và nộp bảng tổng hợp điều chỉnh."
                  className="w-full p-3.5 rounded-xl border border-slate-300 text-sm focus:border-violet-600 focus:outline-none"
                />

                {/* Các mẫu câu lệnh gợi ý */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    "Giao nhóm Khảo thí rà soát ma trận khối 6 trước 16:00 thứ Sáu; phân công theo môn và nộp bảng tổng hợp điều chỉnh.",
                    "Giao nhóm ĐBCL Học sinh tổng hợp báo cáo khảo sát đầu vào khối 10 trước 17:00 thứ Tư tuần sau; nộp biên bản nghiệm thu.",
                  ].map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPromptInput(sample)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-violet-50 text-slate-600 hover:text-violet-700 transition-colors text-left cursor-pointer"
                    >
                      Mẫu {idx + 1}: &ldquo;{sample.slice(0, 58)}...&rdquo;
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    disabled={parsing}
                    onClick={handleParseNaturalLanguage}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    {parsing
                      ? "Đang phân tích ngữ nghĩa & thời gian..."
                      : "Phân tích & Tạo Dự thảo Phiếu"}
                  </button>
                </div>
              </div>

              {capabilityNotice && (
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600">
                  <strong>Chế độ xử lý ({engineMode}):</strong> {capabilityNotice}
                </div>
              )}

              {confirmErrorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{confirmErrorMsg}</span>
                </div>
              )}

              {confirmSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{confirmSuccessMsg}</span>
                </div>
              )}

              {/* BẢN DỰ THẢO PHIẾU GIAO VIỆC ĐỂ KIỂM TRA TRƯỚC KHI PHÁT HÀNH */}
              {draft && (
                <div className="rounded-2xl border-2 border-violet-300 bg-violet-50/30 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-violet-200 pb-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-700 bg-violet-100 px-2 py-0.5 rounded">
                        BẢN DỰ THẢO PHIẾU GIAO VIỆC
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                        {draft.title}
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-violet-800">
                      Phương thức: {draft.assignmentMode}
                    </span>
                  </div>

                  {/* Hiển thị thời gian quy đổi cụ thể theo múi giờ Asia/Ho_Chi_Minh */}
                  <div className="p-3 rounded-xl bg-white border border-violet-200 flex items-center gap-3">
                    <CalendarClock className="w-5 h-5 text-violet-600 shrink-0" />
                    <div className="text-xs">
                      <div className="text-slate-500">
                        Quy đổi thời gian tương đối{" "}
                        {draft.relativeTimeExpression ? (
                          <code className="bg-violet-50 text-violet-800 px-1.5 py-0.5 rounded font-bold">
                            &ldquo;{draft.relativeTimeExpression}&rdquo;
                          </code>
                        ) : null}{" "}
                        theo múi giờ <strong>Asia/Ho_Chi_Minh</strong>:
                      </div>
                      <div className="font-extrabold text-slate-900 mt-0.5">
                        {draft.resolvedTimeDisplayVi}
                      </div>
                    </div>
                  </div>

                  {/* Cảnh báo trường còn thiếu cần bổ sung */}
                  {draft.missingFields.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-1">
                      <div className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Phát hiện {draft.missingFields.length} trường thông tin cần kiểm tra / bổ sung:
                      </div>
                      <ul className="list-disc list-inside text-xs text-amber-800 space-y-0.5">
                        {draft.missingFields.map(mf => (
                          <li key={mf.field}>
                            <strong>{mf.label}:</strong> {mf.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Các trường có thể chỉnh sửa trực tiếp ngay trong bản dự thảo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Nhóm chuyên môn
                      </label>
                      <select
                        value={draftGroupId}
                        onChange={e => setDraftGroupId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="">-- Chọn nhóm --</option>
                        {taskGroups.map(g => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Người chịu trách nhiệm chính *
                      </label>
                      <select
                        value={draftAssigneeId}
                        onChange={e => setDraftAssigneeId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="">-- Chọn người phụ trách chính --</option>
                        {allStaffUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.fullName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Người duyệt nghiệm thu
                      </label>
                      <select
                        value={draftReviewerId}
                        onChange={e => setDraftReviewerId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="">-- Người giao việc / Trưởng ban --</option>
                        {allStaffUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.fullName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Ngày hạn hoàn thành *
                      </label>
                      <input
                        type="date"
                        value={draftEndDate}
                        onChange={e => setDraftEndDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Sản phẩm đầu ra & Minh chứng cần nộp
                      </label>
                      <input
                        type="text"
                        value={draftDeliverables}
                        onChange={e => setDraftDeliverables(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>

                  {/* Các bước checklist được trợ lý tự động bóc tách */}
                  {draft.checklistSteps.length > 0 && (
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <div className="text-[11px] font-bold text-slate-600 mb-1.5">
                        Checklist công việc con tự động khởi tạo ({draft.checklistSteps.length} bước):
                      </div>
                      <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1">
                        {draft.checklistSteps.map(s => (
                          <li key={s.id}>{s.title}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Nút Xác nhận giao việc hoặc Mở phiếu đầy đủ */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-violet-200">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenDetailedDraft({
                          title: draft.title,
                          description: draft.description,
                          category: draft.category,
                          taskGroupId: draftGroupId || null,
                          workspaceCardKey: draft.workspaceCardKey,
                          assignmentMode: draft.assignmentMode,
                          assignedToUserId: draftAssigneeId || null,
                          reviewerUserId: draftReviewerId || null,
                          startDate: draft.startDateIso.slice(0, 10),
                          endDate: draftEndDate,
                          priority: draft.priority,
                          deliverables: draftDeliverables,
                          completionCriteria: draft.completionCriteria,
                          requiredEvidences: draft.requiredEvidences,
                          checklistSteps: draft.checklistSteps,
                          scopeGradeLevel: draft.scopeGradeLevel,
                          scopeSubject: draft.scopeSubject,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Mở biểu mẫu đầy đủ
                    </button>

                    <button
                      type="button"
                      disabled={confirming}
                      onClick={handleConfirmReleaseDraft}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-sm cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {confirming ? "Đang phát hành..." : "Xác nhận giao việc"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TỔNG HỢP VƯỚNG MẮC CẦN NGƯỜI QUẢN LÝ QUYẾT ĐỊNH */}
          {activeTab === "BLOCKERS" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Vướng mắc & Điểm nghẽn cần Trưởng ban / Quản lý quyết định ({unresolvedBlockers.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tổng hợp từ các báo cáo vướng mắc chưa được đóng trên toàn bộ nhiệm vụ thuộc quyền quản lý.
                </p>
              </div>

              {unresolvedBlockers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Hiện tại không có vướng mắc nào đang chờ quyết định.
                </div>
              ) : (
                <div className="space-y-3">
                  {unresolvedBlockers.map((b, i) => (
                    <div
                      key={i}
                      onClick={() => onSelectTask(b.task)}
                      className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-extrabold text-rose-950">
                          {b.task.title}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 shrink-0">
                          Cần phản hồi
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1.5">{b.content}</p>
                      <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Người nêu: {b.author}</span>
                        <span className="text-violet-700 font-bold">
                          Mở nhiệm vụ để xử lý &rarr;
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SOẠN DỰ THẢO BÁO CÁO TUẦN / THÁNG KÈM LIÊN KẾT NHIỆM VỤ & MINH CHỨNG */}
          {activeTab === "REPORT" && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Kỳ báo cáo
                  </label>
                  <select
                    value={reportPeriod}
                    onChange={e => setReportPeriod(e.target.value as any)}
                    className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold"
                  >
                    <option value="WEEKLY">Báo cáo Tuần</option>
                    <option value="MONTHLY">Báo cáo Tháng</option>
                  </select>
                </div>

                <div className="flex-1 min-w-[180px]">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Phạm vi Nhóm chuyên môn
                  </label>
                  <select
                    value={reportGroupId}
                    onChange={e => setReportGroupId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold"
                  >
                    <option value="ALL">Toàn Ban KT&ĐBCL</option>
                    {taskGroups.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={generatingReport}
                  onClick={handleGenerateReport}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold cursor-pointer"
                >
                  {generatingReport ? "Đang tổng hợp..." : "Tạo Dự thảo Báo cáo"}
                </button>
              </div>

              {reportMarkdown && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Bản dự thảo Báo cáo (Kèm định nghĩa mẫu số N & liên kết nhiệm vụ/minh chứng):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(reportMarkdown)
                        setCopiedReport(true)
                        setTimeout(() => setCopiedReport(false), 2000)
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      {copiedReport ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Đã sao chép
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Sao chép Markdown
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs whitespace-pre-wrap font-mono max-h-96 overflow-y-auto leading-relaxed">
                    {reportMarkdown}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
