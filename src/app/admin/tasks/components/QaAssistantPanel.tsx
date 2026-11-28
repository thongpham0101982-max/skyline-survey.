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
  Download,
  Mail,
  ExternalLink,
  Eye,
  Code2,
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
  const nowInit = new Date()
  const [reportPeriod, setReportPeriod] = useState<"WEEKLY" | "MONTHLY">("WEEKLY")
  const [reportMonth, setReportMonth] = useState<number>(nowInit.getMonth() + 1)
  const [reportYear, setReportYear] = useState<number>(nowInit.getFullYear())
  const [reportWeekNum, setReportWeekNum] = useState<number>(
    Math.min(5, Math.max(1, Math.ceil(nowInit.getDate() / 7)))
  )
  const [reportGroupId, setReportGroupId] = useState<string>("ALL")
  const [reportMarkdown, setReportMarkdown] = useState<string>("")
  const [reportPeriodLabel, setReportPeriodLabel] = useState<string>("")
  const [reportViewTab, setReportViewTab] = useState<"PREVIEW" | "MARKDOWN">("PREVIEW")
  const [generatingReport, setGeneratingReport] = useState(false)
  const [copiedReport, setCopiedReport] = useState(false)
  const [showSendEmailBox, setShowSendEmailBox] = useState(false)
  const [reportEmailRecipients, setReportEmailRecipients] = useState("")
  const [sendingReportEmail, setSendingReportEmail] = useState(false)
  const [reportActionMsg, setReportActionMsg] = useState<string | null>(null)

  // Compute weeks inside selected month/year for the Week selector
  const reportMonthWeeks = React.useMemo(() => {
    const daysInMonth = new Date(reportYear, reportMonth, 0).getDate()
    const weeks: Array<{ weekNum: number; label: string }> = []
    let startDay = 1
    let wNum = 1
    while (startDay <= daysInMonth) {
      const startDt = new Date(reportYear, reportMonth - 1, startDay)
      const dow = startDt.getDay() // 0=Sun..6=Sat
      const daysUntilSun = dow === 0 ? 0 : 7 - dow
      const endDay = Math.min(daysInMonth, startDay + daysUntilSun)
      const pad = (n: number) => String(n).padStart(2, "0")
      weeks.push({
        weekNum: wNum,
        label: `Tuần ${wNum} (${pad(startDay)}/${pad(reportMonth)} – ${pad(endDay)}/${pad(reportMonth)})`,
      })
      startDay = endDay + 1
      wNum++
    }
    return weeks
  }, [reportMonth, reportYear])

  // Personal + SSM live briefing state
  const [briefingTargetUserId, setBriefingTargetUserId] = useState<string>("")
  const [loadingBriefing, setLoadingBriefing] = useState(false)
  const [ssmBriefing, setSsmBriefing] = useState<any | null>(null)

  const loadPersonalSsmBriefing = async (targetUid?: string) => {
    setLoadingBriefing(true)
    try {
      const res = await fetch("/api/admin/qa-workspace/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PERSONAL_SSM_BRIEFING",
          targetUserId: targetUid || undefined,
        }),
      })
      const data = await res.json()
      if (data.success && data.briefing) {
        setSsmBriefing(data.briefing)
      }
    } catch {
      // keep existing UI summary
    } finally {
      setLoadingBriefing(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadPersonalSsmBriefing(briefingTargetUserId || undefined)
    }
  }, [isOpen, briefingTargetUserId])

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
      const res: any = await createQaWorkspaceTask({
        title: draft.title,
        description: draft.description,
        category: draft.category || "Khảo thí",
        taskGroupId: draftGroupId || null,
        workspaceCardKey: draft.workspaceCardKey || "KHAO_THI",
        assignmentMode: draft.assignmentMode,
        assignedToUserId: draftAssigneeId,
        collaboratorUserIds: draft.collaboratorUserIds || [],
        reviewerUserId: draftReviewerId || null,
        startDate: draft.startDateIso.slice(0, 10),
        endDate: draftEndDate,
        priority: draft.priority,
        deliverables: draftDeliverables,
        completionCriteria: draft.completionCriteria,
        requiredEvidences: draft.requiredEvidences,
        checklist: draft.checklistSteps,
        checklistSteps: draft.checklistSteps,
        requiresApproval: true,
        sendEmailNotification: true,
        scopeGradeLevel: draft.scopeGradeLevel,
        scopeSubject: draft.scopeSubject,
        academicYearId: years[0]?.id || null,
      })

      if (res.success) {
        setConfirmSuccessMsg(
          `Đã phát hành phiếu giao việc thành công và gửi ${res.emailsSentCount || 0} email thông báo đến các thành viên liên quan!`
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
    setReportActionMsg(null)
    try {
      const res = await fetch("/api/admin/qa-workspace/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GENERATE_REPORT_DRAFT",
          periodType: reportPeriod,
          month: reportMonth,
          year: reportYear,
          weekNumber: reportWeekNum,
          taskGroupId: reportGroupId,
          groupId: reportGroupId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setReportMarkdown(data.reportMarkdown || "")
        setReportPeriodLabel(data.periodLabel || "")
      }
    } finally {
      setGeneratingReport(false)
    }
  }

  const handleDownloadWordReport = () => {
    if (!reportMarkdown) return
    const htmlBody = reportMarkdown
      .split("\n")
      .map((line) => {
        const escaped = line
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
        if (escaped.startsWith("### ")) {
          return `<h2 style="color:#003B3A;margin:14px 0 6px;">${escaped.slice(4)}</h2>`
        }
        if (escaped.startsWith("#### ")) {
          return `<h3 style="color:#00736E;margin:12px 0 4px;">${escaped.slice(5)}</h3>`
        }
        if (!escaped.trim()) return `<p style="margin:4px 0;"></p>`
        return `<p style="margin:3px 0;line-height:1.55;">${escaped}</p>`
      })
      .join("")

    const docHtml = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="vi"><head><meta charset="utf-8"><title>${
      reportPeriodLabel || "BaoCao_KTDBCL"
    }</title><style>body{font-family:'Times New Roman',serif;font-size:13pt;color:#111;margin:24px;}</style></head><body>${htmlBody}</body></html>`

    const blob = new Blob(["\ufeff", docHtml], { type: "application/msword;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download =
      reportPeriod === "WEEKLY"
        ? `DuThao_BaoCao_Tuan${reportWeekNum}_T${reportMonth}_${reportYear}.doc`
        : `DuThao_BaoCao_Thang${reportMonth}_${reportYear}.doc`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setReportActionMsg("Đã tải xuống tệp Word (.doc) thành công.")
  }

  const handleSendReportByEmail = async () => {
    if (!reportMarkdown) return
    setSendingReportEmail(true)
    setReportActionMsg(null)
    try {
      const res = await fetch("/api/admin/qa-workspace/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_REPORT_DRAFT_EMAIL",
          reportMarkdown,
          periodLabel: reportPeriodLabel,
          recipientEmails: reportEmailRecipients,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setReportActionMsg(
          `Đã gửi email báo cáo thành công tới ${(data.recipients || []).join(", ")} (${data.sentCount} email).`
        )
        setShowSendEmailBox(false)
      } else {
        setReportActionMsg(data.error || "Không gửi được email báo cáo.")
      }
    } finally {
      setSendingReportEmail(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-[#E2E8F0] flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header — Sky-Line Deep Pine (#003B3A) */}
        <div className="px-6 py-4 bg-[#003B3A] border-b border-[#00A19A]/40 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/12 flex items-center justify-center border border-white/15">
              <Sparkles className="w-5 h-5 text-[#5EEAD4]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                QA Assistant — Trợ lý điều hành KT&ĐBCL
              </h2>
              <p className="text-[11px] text-[#CCFBF1]">
                Giao việc ngôn ngữ tự nhiên (Asia/Ho_Chi_Minh) • Báo mail tự động • Tổng hợp báo cáo
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
                  ? "border-teal-200 text-teal-800 bg-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: TỔNG HỢP HÔM NAY, DỮ LIỆU SSM & GỢI Ý HỖ TRỢ CÔNG VIỆC CÁ NHÂN */}
          {activeTab === "OVERVIEW" && (
            <div className="space-y-5">
              {/* Khối Trợ lý cá nhân dựa trên dữ liệu được gán & tín hiệu thực tế từ SSM */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="border-l-4 border-[#003B3A] pl-2.5">
                    <div className="text-xs font-bold text-[#003B3A]">
                      Gợi ý hỗ trợ công việc từ dữ liệu cá nhân &amp; SSM
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {ssmBriefing?.periodLabel || "Đồng bộ trực tiếp việc được gán, Báo cáo tuần, KSDV, Dự giờ & Khảo sát"}
                    </div>
                  </div>
                  <select
                    value={briefingTargetUserId}
                    onChange={(e) => setBriefingTargetUserId(e.target.value)}
                    className="rounded-xl border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                  >
                    <option value="">Tài khoản của tôi</option>
                    {(allStaffUsers || []).map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                {loadingBriefing ? (
                  <div className="py-4 text-center text-xs text-slate-500">
                    Đang tổng hợp dữ liệu công việc cá nhân và tín hiệu SSM...
                  </div>
                ) : ssmBriefing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs tabular-nums">
                      <div className="rounded-xl bg-white border border-[#E2E8F0] p-2.5">
                        <div className="text-[11px] text-slate-500">Báo cáo tuần</div>
                        <div
                          className={`font-bold mt-0.5 ${
                            ssmBriefing.personalCounts?.hasWeeklyReport
                              ? "text-[#059669]"
                              : "text-[#E11D48]"
                          }`}
                        >
                          {ssmBriefing.personalCounts?.hasWeeklyReport
                            ? `Đã lập (${ssmBriefing.personalCounts.weeklyReportItemsCount} mục)`
                            : "Chưa nộp tuần này"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-white border border-[#E2E8F0] p-2.5">
                        <div className="text-[11px] text-slate-500">PVDH chưa khóa</div>
                        <div className="font-bold text-[#003B3A] mt-0.5">
                          {ssmBriefing.ssmSignals?.draftPvdhCount ?? 0} phiếu
                        </div>
                      </div>
                      <div className="rounded-xl bg-white border border-[#E2E8F0] p-2.5">
                        <div className="text-[11px] text-slate-500">Dự giờ chờ xử lý</div>
                        <div className="font-bold text-[#003B3A] mt-0.5">
                          {ssmBriefing.ssmSignals?.recentObsCount ?? 0} phiếu
                        </div>
                      </div>
                      <div className="rounded-xl bg-white border border-[#E2E8F0] p-2.5">
                        <div className="text-[11px] text-slate-500">Khảo sát đang mở</div>
                        <div className="font-bold text-[#00736E] mt-0.5">
                          {ssmBriefing.ssmSignals?.openSurveysCount ?? 0} đợt
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(ssmBriefing.suggestions || []).map((sug: any) => (
                        <div
                          key={sug.id}
                          className={`rounded-xl border p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                            sug.priority === "HIGH"
                              ? "border-rose-200"
                              : sug.priority === "MEDIUM"
                              ? "border-amber-200"
                              : "border-[#E2E8F0]"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  sug.priority === "HIGH"
                                    ? "bg-rose-50 text-[#E11D48]"
                                    : sug.priority === "MEDIUM"
                                    ? "bg-amber-50 text-[#D97706]"
                                    : "bg-[#F0FDFA] text-[#00736E]"
                                }`}
                              >
                                {sug.category}
                              </span>
                              <span className="text-xs font-bold text-[#003B3A]">{sug.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-600">{sug.detail}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {sug.suggestedTaskPrompt && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPromptInput(sug.suggestedTaskPrompt)
                                  setActiveTab("NLP_DRAFT")
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#005250] text-white text-[11px] font-semibold cursor-pointer"
                              >
                                Tạo việc AI
                              </button>
                            )}
                            {sug.actionHref && (
                              <a
                                href={sug.actionHref}
                                className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100 text-[#003B3A] text-[11px] font-semibold"
                              >
                                {sug.actionLabel}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
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
                <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200">
                  <div className="text-[11px] font-bold text-teal-800">Chờ duyệt</div>
                  <div className="text-2xl font-black text-teal-800 mt-0.5">
                    {pendingReviewTasks.length}
                  </div>
                </div>
              </div>

              {/* Khung nhắc nhanh sang tạo phiếu NLP */}
              <div className="p-4 rounded-2xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-extrabold text-[#003B3A]">
                    Giao việc nhanh bằng câu lệnh tiếng Việt tự nhiên
                  </div>
                  <p className="text-[11px] text-[#00736E] mt-0.5">
                    Tự động quy đổi thời gian tương đối (Asia/Ho_Chi_Minh), tách bước thực hiện, kiểm tra trường còn thiếu và báo email.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("NLP_DRAFT")}
                  className="px-3.5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#004D47] text-white text-xs font-bold shrink-0 cursor-pointer"
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
                        className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-200 bg-white cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {item.task.title}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 shrink-0">
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
                            <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-bold">
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
                  className="w-full p-3.5 rounded-xl border border-slate-300 text-sm focus:border-teal-200 focus:outline-none"
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
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-800 transition-colors text-left cursor-pointer"
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
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-extrabold shadow-xs cursor-pointer"
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
                <div className="rounded-2xl border-2 border-teal-200 bg-teal-50/30 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-teal-200 pb-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                        BẢN DỰ THẢO PHIẾU GIAO VIỆC
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                        {draft.title}
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-teal-800">
                      Phương thức: {draft.assignmentMode}
                    </span>
                  </div>

                  {/* Hiển thị thời gian quy đổi cụ thể theo múi giờ Asia/Ho_Chi_Minh */}
                  <div className="p-3 rounded-xl bg-white border border-teal-200 flex items-center gap-3">
                    <CalendarClock className="w-5 h-5 text-teal-800 shrink-0" />
                    <div className="text-xs">
                      <div className="text-slate-500">
                        Quy đổi thời gian tương đối{" "}
                        {draft.relativeTimeExpression ? (
                          <code className="bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded font-bold">
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
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-teal-200">
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
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-extrabold shadow-sm cursor-pointer"
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
                        <span className="text-teal-800 font-bold">
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
            <div className="space-y-4 tabular-nums">
              <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Loại kỳ báo cáo
                    </label>
                    <select
                      value={reportPeriod}
                      onChange={e => setReportPeriod(e.target.value as "WEEKLY" | "MONTHLY")}
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs bg-white font-semibold text-[#003B3A]"
                    >
                      <option value="WEEKLY">Báo cáo Tuần</option>
                      <option value="MONTHLY">Báo cáo Tháng</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Chọn Tháng
                    </label>
                    <select
                      value={reportMonth}
                      onChange={e => {
                        setReportMonth(Number(e.target.value))
                        setReportWeekNum(1)
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs bg-white font-semibold text-[#003B3A]"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>
                          Tháng {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Chọn Năm
                    </label>
                    <select
                      value={reportYear}
                      onChange={e => setReportYear(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs bg-white font-semibold text-[#003B3A]"
                    >
                      {[reportYear - 1, reportYear, reportYear + 1].map(y => (
                        <option key={y} value={y}>
                          Năm {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  {reportPeriod === "WEEKLY" && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tuần trong Tháng
                      </label>
                      <select
                        value={reportWeekNum}
                        onChange={e => setReportWeekNum(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-teal-300 text-xs bg-[#F0FDFA] font-semibold text-[#003B3A]"
                      >
                        {reportMonthWeeks.map(w => (
                          <option key={w.weekNum} value={w.weekNum}>
                            {w.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-end gap-2.5 pt-1">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Phạm vi Nhóm chuyên môn
                    </label>
                    <select
                      value={reportGroupId}
                      onChange={e => setReportGroupId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs bg-white font-semibold text-[#003B3A]"
                    >
                      <option value="ALL">Toàn Ban KT&amp;ĐBCL</option>
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
                    className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {generatingReport ? "Đang tổng hợp..." : "Tạo Dự thảo Báo cáo"}
                  </button>
                </div>
              </div>

              {reportMarkdown && (
                <div className="space-y-3">
                  {/* Thanh thao tác đầu ra sau khi tạo dự thảo */}
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex rounded-xl bg-[#F8FAFC] p-1 border border-[#E2E8F0]">
                        <button
                          type="button"
                          onClick={() => setReportViewTab("PREVIEW")}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                            reportViewTab === "PREVIEW"
                              ? "bg-[#003B3A] text-white"
                              : "text-slate-600 hover:text-[#003B3A]"
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Xem bản đọc đẹp
                        </button>
                        <button
                          type="button"
                          onClick={() => setReportViewTab("MARKDOWN")}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                            reportViewTab === "MARKDOWN"
                              ? "bg-[#003B3A] text-white"
                              : "text-slate-600 hover:text-[#003B3A]"
                          }`}
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          Markdown
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleDownloadWordReport}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F0FDFA] hover:bg-teal-100 text-[#00736E] border border-teal-200 text-[11px] font-semibold cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Tải file Word (.doc)
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowSendEmailBox(prev => !prev)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#005250] text-white text-[11px] font-semibold cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#5EEAD4]" />
                          Gửi Email GĐB
                        </button>

                        <a
                          href={`/admin/weekly-reports?tab=compose&week=${reportWeekNum}&month=${reportMonth}&year=${reportYear}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#059669] border border-emerald-200 text-[11px] font-semibold"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Mở BC Tuần
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(reportMarkdown)
                            setCopiedReport(true)
                            setTimeout(() => setCopiedReport(false), 2000)
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer"
                        >
                          {copiedReport ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#059669]" /> Đã sao chép
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Sao chép
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Hộp gửi email trực tiếp */}
                    {showSendEmailBox && (
                      <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={reportEmailRecipients}
                          onChange={e => setReportEmailRecipients(e.target.value)}
                          placeholder="Nhập email người nhận (để trống sẽ gửi mặc định cho Giám đốc Ban)..."
                          className="flex-1 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs text-slate-700 focus:outline-none focus:border-[#00A19A]"
                        />
                        <button
                          type="button"
                          disabled={sendingReportEmail}
                          onClick={handleSendReportByEmail}
                          className="px-3.5 py-1.5 rounded-lg bg-[#00736E] hover:bg-[#005B58] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          {sendingReportEmail ? "Đang gửi..." : "Gửi ngay"}
                        </button>
                      </div>
                    )}

                    {reportActionMsg && (
                      <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-[#059669]">
                        {reportActionMsg}
                      </div>
                    )}

                    {/* Nội dung xem trước bản đọc đẹp hoặc mã nguồn Markdown */}
                    {reportViewTab === "PREVIEW" ? (
                      <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] max-h-[380px] overflow-y-auto space-y-1.5 text-xs text-slate-700 leading-relaxed">
                        {reportMarkdown.split("\n").map((line, i) => {
                          if (line.startsWith("### ")) {
                            return (
                              <h4
                                key={i}
                                className="text-sm font-bold text-[#003B3A] border-b border-[#E2E8F0] pb-1.5 mb-1"
                              >
                                {line.slice(4)}
                              </h4>
                            )
                          }
                          if (line.startsWith("#### ")) {
                            return (
                              <h5
                                key={i}
                                className="text-xs font-bold text-[#00736E] pt-2"
                              >
                                {line.slice(5)}
                              </h5>
                            )
                          }
                          if (!line.trim()) return <div key={i} className="h-1" />
                          return (
                            <p key={i} className="whitespace-pre-wrap">
                              {line.replace(/\*\*/g, "").replace(/\*/g, "")}
                            </p>
                          )
                        })}
                      </div>
                    ) : (
                      <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs whitespace-pre-wrap font-mono max-h-[380px] overflow-y-auto leading-relaxed">
                        {reportMarkdown}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
