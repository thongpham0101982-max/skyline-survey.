"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  X,
  Send,
  Paperclip,
  Download,
  Trash2,
  MessageSquare,
  File,
  Image,
  FileText,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Users,
  Flag,
  CheckSquare,
  AtSign,
  ArrowRight,
  CornerDownRight,
  Sparkles,
  History,
  ListChecks,
  Link2,
  Play,
  PauseCircle,
  RotateCcw,
  Plus,
  ExternalLink,
} from "lucide-react"
import {
  getTaskDetails,
  addTaskComment,
  deleteTaskComment,
  addTaskAttachment,
  deleteTaskAttachment,
  updateCommentActionStatus,
} from "./collab_actions"
import { confirmTaskAssignment, rejectTaskAssignment } from "./actions"
import {
  getTaskFullGovernanceDetails,
  transitionTaskWorkflow,
  toggleTaskChecklistStep,
} from "./qa_workspace_actions"
import {
  WORKFLOW_STATUS_LABELS,
  type QaTaskWorkflowStatus,
} from "@/lib/qa-workspace/types"

function getFileIcon(contentType: string) {
  if (contentType.startsWith("image")) return Image
  if (contentType.includes("pdf")) return FileText
  return File
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / 1048576).toFixed(1) + " MB"
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "Vừa xong"
  if (diffMin < 60) return diffMin + " phút trước"
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return diffHr + " giờ trước"
  return (
    d.toLocaleDateString("vi-VN") +
    " " +
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
  )
}

const COMMENT_TYPES = [
  {
    value: "GENERAL",
    label: "Trao đổi",
    icon: MessageSquare,
    color: "text-slate-600 bg-slate-100 hover:bg-slate-200",
  },
  {
    value: "PROGRESS",
    label: "Cập nhật tiến độ",
    icon: Clock,
    color: "text-blue-700 bg-blue-50 hover:bg-blue-100",
  },
  {
    value: "BLOCKER",
    label: "Vướng mắc",
    icon: AlertTriangle,
    color: "text-red-700 bg-red-50 hover:bg-red-100",
  },
  {
    value: "COOPERATION",
    label: "Phối hợp",
    icon: Users,
    color: "text-amber-700 bg-amber-50 hover:bg-amber-100",
  },
  {
    value: "CONCLUSION",
    label: "Kết luận chỉ đạo",
    icon: Sparkles,
    color: "text-emerald-700 bg-emerald-50 hover:bg-emerald-100",
  },
]

const WORKFLOW_PIPELINE: QaTaskWorkflowStatus[] = [
  "DRAFT",
  "ASSIGNED",
  "IN_PROGRESS",
  "PENDING_REVIEW",
  "COMPLETED",
]

interface TaskDetailPanelProps {
  task: any
  currentUserId: string
  isAdmin: boolean
  allStaffUsers?: any[]
  onClose: () => void
  onTaskUpdated?: () => void
}

export function TaskDetailPanel({
  task,
  currentUserId,
  isAdmin,
  allStaffUsers = [],
  onClose,
  onTaskUpdated,
}: TaskDetailPanelProps) {
  const [tab, setTab] = useState<
    "roadmap" | "review" | "comments" | "attachments" | "history"
  >("roadmap")

  // Governance state loaded from server
  const [qaMeta, setQaMeta] = useState<any>(task.qaMeta || null)
  const [deadlineInfo, setDeadlineInfo] = useState<any>(task.deadlineInfo || null)
  const [checklistStats, setChecklistStats] = useState<any>(
    task.checklistStats || { totalSteps: 0, completedSteps: 0, percent: 0 }
  )
  const [auditLogs, setAuditLogs] = useState<any[]>([])

  // Workflow transition form states
  const [resultSummaryInput, setResultSummaryInput] = useState(
    task.qaMeta?.resultSummary || task.staffNote || ""
  )
  const [evidenceLinksInput, setEvidenceLinksInput] = useState<string[]>(
    task.qaMeta?.evidenceLinks || []
  )
  const [newEvidenceUrl, setNewEvidenceUrl] = useState("")
  const [reviewCommentInput, setReviewCommentInput] = useState(
    task.qaMeta?.reviewComment || ""
  )
  const [reviewRatingInput, setReviewRatingInput] = useState<
    "DAT_CHUAN" | "XUAT_SAC" | "CAN_BO_SUNG"
  >(task.qaMeta?.reviewRating || "DAT_CHUAN")
  const [reasonModal, setReasonModal] = useState<{
    toStatus: QaTaskWorkflowStatus
    title: string
  } | null>(null)
  const [reasonText, setReasonText] = useState("")
  const [workflowMsg, setWorkflowMsg] = useState<{
    type: "error" | "success"
    text: string
  } | null>(null)
  const [transitioning, setTransitioning] = useState(false)

  // Collab comments & attachments state
  const [comments, setComments] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])
  const [newComment, setNewComment] = useState("")
  const [commentType, setCommentType] = useState<string>("GENERAL")
  const [actionAssigneeId, setActionAssigneeId] = useState<string>("")
  const [actionDueDate, setActionDueDate] = useState<string>("")
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([])
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const [mentionFilter, setMentionFilter] = useState("")

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReasonInput, setRejectReasonInput] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)

  const commentsEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const acceptanceStatus = task.acceptanceStatus || "WAITING_CONFIRMATION"
  const isAssignee = task.assignedToUserId === currentUserId
  const isReviewerOrManager =
    isAdmin ||
    task.assignedById === currentUserId ||
    qaMeta?.reviewerUserId === currentUserId ||
    qaMeta?.coordinatorUserId === currentUserId ||
    task.taskGroup?.leaderUserId === currentUserId

  useEffect(() => {
    loadAllDetails()
  }, [task.id])

  const loadAllDetails = async () => {
    setLoading(true)
    const [collabRes, govRes] = await Promise.all([
      getTaskDetails(task.id),
      getTaskFullGovernanceDetails(task.id),
    ])

    if (collabRes.success) {
      setComments(collabRes.comments)
      setAttachments(collabRes.attachments)
    }
    if (govRes.success) {
      setQaMeta(govRes.metadata)
      setDeadlineInfo(govRes.deadlineInfo)
      setChecklistStats(govRes.checklistStats)
      setAuditLogs(govRes.auditLogs || [])
      setResultSummaryInput(govRes.metadata?.resultSummary || task.staffNote || "")
      setEvidenceLinksInput(govRes.metadata?.evidenceLinks || [])
      setReviewCommentInput(govRes.metadata?.reviewComment || "")
      if (govRes.metadata?.reviewRating) {
        setReviewRatingInput(govRes.metadata.reviewRating)
      }
    }
    setLoading(false)
  }

  const handleTransition = async (
    toStatus: QaTaskWorkflowStatus,
    extraReason?: string
  ) => {
    setWorkflowMsg(null)
    setTransitioning(true)
    try {
      const res = await transitionTaskWorkflow(task.id, {
        toStatus,
        reason: extraReason || undefined,
        resultSummary: resultSummaryInput,
        evidenceLinks: evidenceLinksInput,
        reviewComment: reviewCommentInput || extraReason,
        reviewRating:
          toStatus === "COMPLETED"
            ? reviewRatingInput
            : toStatus === "NEEDS_REVISION"
            ? "CAN_BO_SUNG"
            : undefined,
        expectedVersion: qaMeta?.version,
      })
      if (!res.success) {
        setWorkflowMsg({
          type: "error",
          text: res.error || "Không thể chuyển trạng thái nhiệm vụ.",
        })
      } else {
        setWorkflowMsg({
          type: "success",
          text: `Đã cập nhật trạng thái sang "${WORKFLOW_STATUS_LABELS[toStatus]}"!`,
        })
        setReasonModal(null)
        setReasonText("")
        await loadAllDetails()
        if (onTaskUpdated) onTaskUpdated()
      }
    } finally {
      setTransitioning(false)
    }
  }

  const handleToggleStep = async (stepId: string, nextCompleted: boolean) => {
    setWorkflowMsg(null)
    const res = await toggleTaskChecklistStep(
      task.id,
      stepId,
      nextCompleted,
      qaMeta?.version
    )
    if (!res.success) {
      setWorkflowMsg({
        type: "error",
        text: res.error || "Không thể cập nhật bước thực hiện.",
      })
    } else {
      await loadAllDetails()
      if (onTaskUpdated) onTaskUpdated()
    }
  }

  const handleAddEvidenceLink = () => {
    if (!newEvidenceUrl.trim()) return
    setEvidenceLinksInput(prev => [...prev, newEvidenceUrl.trim()])
    setNewEvidenceUrl("")
  }

  const handleConfirmTask = async () => {
    setConfirming(true)
    const res = await confirmTaskAssignment(task.id)
    setConfirming(false)
    if (res.success) {
      await handleTransition("IN_PROGRESS", "Đã xác nhận nhận việc và bắt đầu thực hiện")
    } else {
      alert(res.error)
    }
  }

  const handleRejectTask = async () => {
    if (!rejectReasonInput.trim()) {
      alert("Vui lòng nhập lý do hoặc ý kiến phản hồi")
      return
    }
    setRejecting(true)
    const res = await rejectTaskAssignment(task.id, rejectReasonInput)
    setRejecting(false)
    if (res.success) {
      setShowRejectForm(false)
      if (onTaskUpdated) onTaskUpdated()
      onClose()
    } else {
      alert(res.error)
    }
  }

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setSending(true)
    const res = await addTaskComment(task.id, newComment, {
      commentType,
      actionAssigneeId: actionAssigneeId || undefined,
      actionDueDate: actionDueDate || undefined,
      mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
    })
    if (res.success && res.comment) {
      setComments(prev => [...prev, res.comment])
      setNewComment("")
      setCommentType("GENERAL")
      setActionAssigneeId("")
      setActionDueDate("")
      setMentionedUserIds([])
      setTimeout(
        () => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        100
      )
      if (onTaskUpdated) onTaskUpdated()
    } else {
      alert(res.error)
    }
    setSending(false)
  }

  const handleToggleActionStatus = async (
    commentId: string,
    currentStatus: string | null
  ) => {
    const nextStatus = currentStatus === "RESOLVED" ? "OPEN" : "RESOLVED"
    const res = await updateCommentActionStatus(commentId, nextStatus)
    if (res.success) {
      setComments(prev =>
        prev.map(c => (c.id === commentId ? { ...c, actionStatus: nextStatus } : c))
      )
      if (onTaskUpdated) onTaskUpdated()
    } else {
      alert(res.error)
    }
  }

  const handleDeleteComment = async (id: string) => {
    if (!confirm("Xóa bình luận này?")) return
    const res = await deleteTaskComment(id)
    if (res.success) setComments(prev => prev.filter(c => c.id !== id))
    else alert(res.error)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const file = files[0]
    if (file.size > 4 * 1024 * 1024) {
      alert("Dung lượng tệp tối đa là 4MB!")
      return
    }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async event => {
      const base64 = event.target?.result as string
      const res = await addTaskAttachment(task.id, {
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || "application/octet-stream",
        fileData: base64,
      })
      if (res.success && res.attachment) {
        setAttachments(prev => [res.attachment, ...prev])
      } else {
        alert(res.error)
      }
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
    reader.readAsDataURL(file)
  }

  const handleDeleteAttachment = async (id: string) => {
    if (!confirm("Xóa tệp đính kèm này?")) return
    const res = await deleteTaskAttachment(id)
    if (res.success) setAttachments(prev => prev.filter(a => a.id !== id))
    else alert(res.error)
  }

  const currentWfStatus: QaTaskWorkflowStatus =
    qaMeta?.workflowStatus ||
    (task.progress === "COMPLETED"
      ? "COMPLETED"
      : task.progress === "IN_PROGRESS"
      ? "IN_PROGRESS"
      : "ASSIGNED")

  const checklistItems: any[] = qaMeta?.checklistJson || []
  const userLookup = new Map(allStaffUsers.map(u => [u.id, u]))

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-500/30 text-violet-200 border border-violet-400/30">
                  {task.category}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-slate-200">
                  Phiên bản v{qaMeta?.version || 1}
                </span>
                {deadlineInfo?.isOverdue && (
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      deadlineInfo.code === "OVERDUE_REVIEW"
                        ? "bg-amber-500 text-slate-950"
                        : "bg-rose-600 text-white"
                    }`}
                  >
                    {deadlineInfo.code === "OVERDUE_REVIEW"
                      ? `CHẬM DUYỆT: ${deadlineInfo.label}`
                      : `CHẬM THỰC HIỆN: ${deadlineInfo.label}`}
                  </span>
                )}
              </div>
              <h3 className="text-base font-extrabold text-white leading-snug">
                {task.title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white rounded-xl bg-white/10 hover:bg-white/20 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Thanh trạng thái Luồng chính: Nháp → Đã giao → Đang thực hiện → Chờ duyệt → Hoàn thành */}
          <div className="mt-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between gap-1 text-[10px] font-bold">
              {WORKFLOW_PIPELINE.map((st, idx) => {
                const isActive = currentWfStatus === st
                const currentIdx = WORKFLOW_PIPELINE.indexOf(currentWfStatus)
                const isPassed = currentIdx > idx || currentWfStatus === "COMPLETED"
                return (
                  <React.Fragment key={st}>
                    <div
                      className={`px-2 py-1 rounded-lg flex items-center gap-1 ${
                        isActive
                          ? "bg-violet-600 text-white ring-2 ring-violet-400"
                          : isPassed
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      <span>{idx + 1}.</span>
                      <span>{WORKFLOW_STATUS_LABELS[st]}</span>
                    </div>
                    {idx < WORKFLOW_PIPELINE.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
            {(currentWfStatus === "NEEDS_REVISION" ||
              currentWfStatus === "PAUSED" ||
              currentWfStatus === "CANCELLED") && (
              <div className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center justify-between">
                <span>
                  Trạng thái đặc biệt: {WORKFLOW_STATUS_LABELS[currentWfStatus]}
                </span>
                {qaMeta?.statusReason && (
                  <span className="text-[11px] font-normal">
                    Lý do: {qaMeta.statusReason}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Thông báo kết quả chuyển trạng thái / xung đột phiên bản */}
        {workflowMsg && (
          <div
            className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between ${
              workflowMsg.type === "error"
                ? "bg-rose-50 text-rose-800 border-b border-rose-200"
                : "bg-emerald-50 text-emerald-800 border-b border-emerald-200"
            }`}
          >
            <span>{workflowMsg.text}</span>
            <button
              type="button"
              onClick={() => setWorkflowMsg(null)}
              className="text-slate-500 hover:text-slate-800"
            >
              ✕
            </button>
          </div>
        )}

        {/* Thanh hành động điều khiển luồng nhanh */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(currentWfStatus === "DRAFT" || currentWfStatus === "ASSIGNED") && (
              <button
                type="button"
                disabled={transitioning}
                onClick={() => handleTransition("IN_PROGRESS")}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" /> Bắt đầu thực hiện
              </button>
            )}

            {(currentWfStatus === "IN_PROGRESS" ||
              currentWfStatus === "NEEDS_REVISION") && (
              <>
                <button
                  type="button"
                  disabled={transitioning}
                  onClick={() => {
                    setTab("review")
                    handleTransition("PENDING_REVIEW")
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Gửi duyệt kết quả
                </button>
                {qaMeta?.requiresApproval === false && (
                  <button
                    type="button"
                    disabled={transitioning}
                    onClick={() => handleTransition("COMPLETED")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành (Không cần duyệt)
                  </button>
                )}
              </>
            )}

            {currentWfStatus === "PENDING_REVIEW" && isReviewerOrManager && (
              <>
                <button
                  type="button"
                  disabled={transitioning}
                  onClick={() => handleTransition("COMPLETED")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt hoàn thành
                </button>
                <button
                  type="button"
                  disabled={transitioning}
                  onClick={() =>
                    setReasonModal({
                      toStatus: "NEEDS_REVISION",
                      title: "Yêu cầu bổ sung / chỉnh sửa kết quả",
                    })
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Cần bổ sung
                </button>
              </>
            )}
          </div>

          {/* Nhóm nút Tạm dừng / Hủy / Mở lại kèm lý do */}
          <div className="flex items-center gap-1.5">
            {currentWfStatus !== "PAUSED" &&
              currentWfStatus !== "COMPLETED" &&
              currentWfStatus !== "CANCELLED" && (
                <button
                  type="button"
                  onClick={() =>
                    setReasonModal({
                      toStatus: "PAUSED",
                      title: "Tạm dừng nhiệm vụ (Bắt buộc nhập lý do)",
                    })
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  <PauseCircle className="w-3.5 h-3.5" /> Tạm dừng
                </button>
              )}

            {(currentWfStatus === "COMPLETED" ||
              currentWfStatus === "CANCELLED" ||
              currentWfStatus === "PAUSED") && (
              <button
                type="button"
                onClick={() =>
                  setReasonModal({
                    toStatus: "IN_PROGRESS",
                    title: "Mở lại nhiệm vụ (Bắt buộc nhập lý do)",
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-violet-300 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Mở lại nhiệm vụ
              </button>
            )}

            {currentWfStatus !== "CANCELLED" && isReviewerOrManager && (
              <button
                type="button"
                onClick={() =>
                  setReasonModal({
                    toStatus: "CANCELLED",
                    title: "Hủy nhiệm vụ (Bắt buộc nhập lý do)",
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" /> Hủy
              </button>
            )}
          </div>
        </div>

        {/* Hộp nhập lý do khi Cần bổ sung / Tạm dừng / Hủy / Mở lại */}
        {reasonModal && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 space-y-2">
            <div className="text-xs font-extrabold text-amber-900">
              {reasonModal.title}
            </div>
            <textarea
              rows={2}
              value={reasonText}
              onChange={e => setReasonText(e.target.value)}
              placeholder="Nhập rõ lý do hoặc nội dung yêu cầu bổ sung để lưu vào lịch sử xử lý..."
              className="w-full p-2.5 rounded-lg border border-amber-300 bg-white text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setReasonModal(null)
                  setReasonText("")
                }}
                className="px-3 py-1 rounded-lg bg-white border border-slate-300 text-xs font-semibold"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={!reasonText.trim() || transitioning}
                onClick={() => handleTransition(reasonModal.toStatus, reasonText)}
                className="px-3.5 py-1 rounded-lg bg-violet-600 text-white text-xs font-bold disabled:opacity-50"
              >
                Xác nhận lưu lịch sử
              </button>
            </div>
          </div>
        )}

        {/* 5 Tabs chi tiết nhiệm vụ */}
        <div className="flex border-b border-slate-200 bg-white px-4 overflow-x-auto">
          {[
            { id: "roadmap", label: "Yêu cầu & Lộ trình", icon: ListChecks },
            { id: "review", label: "Kết quả & Nghiệm thu", icon: ShieldCheck },
            {
              id: "comments",
              label: `Trao đổi & Vướng mắc (${comments.length})`,
              icon: MessageSquare,
            },
            {
              id: "attachments",
              label: `Tệp đính kèm (${attachments.length})`,
              icon: Paperclip,
            },
            {
              id: "history",
              label: `Lịch sử xử lý (${auditLogs.length})`,
              icon: History,
            },
          ].map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as any)}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  tab === item.id
                    ? "border-violet-600 text-violet-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Đang tải thông tin chi tiết nhiệm vụ...
            </div>
          ) : tab === "roadmap" ? (
            /* TAB 1: YÊU CẦU, SẢN PHẨM & LỘ TRÌNH THỰC HIỆN */
            <div className="space-y-5">
              {/* Thông tin người giao, người chịu trách nhiệm chính, người phối hợp, người duyệt */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Người giao việc: </span>
                  <strong className="text-slate-900">
                    {task.assignedBy?.fullName || "Ban Điều hành"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Chịu trách nhiệm chính: </span>
                  <strong className="text-violet-700">
                    {task.assignedToUser?.fullName || task.assignedToRole}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Người duyệt nghiệm thu: </span>
                  <strong className="text-slate-900">
                    {(qaMeta?.reviewerUserId &&
                      userLookup.get(qaMeta.reviewerUserId)?.fullName) ||
                      task.assignedBy?.fullName ||
                      "Trưởng ban KT&ĐBCL"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Hạn thực hiện / Hạn duyệt: </span>
                  <strong className="text-slate-900">
                    {new Date(task.endDate).toLocaleDateString("vi-VN")}
                    {qaMeta?.reviewDueDate
                      ? ` • Duyệt: ${new Date(qaMeta.reviewDueDate).toLocaleDateString("vi-VN")}`
                      : ""}
                  </strong>
                </div>
              </div>

              {/* Yêu cầu, Sản phẩm đầu ra, Tiêu chí hoàn thành & Minh chứng cần nộp */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  1. Yêu cầu, Sản phẩm & Tiêu chí Hoàn thành
                </h4>
                {task.description && (
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {task.description}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-violet-50/50 border border-violet-100">
                    <div className="font-bold text-violet-900 mb-1">Sản phẩm đầu ra</div>
                    <div className="text-slate-700">
                      {qaMeta?.deliverables || "Theo nội dung phiếu giao việc"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-teal-50/50 border border-teal-100">
                    <div className="font-bold text-teal-900 mb-1">Tiêu chí hoàn thành</div>
                    <div className="text-slate-700">
                      {qaMeta?.completionCriteria || "Đầy đủ nội dung & đúng hạn"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-100">
                    <div className="font-bold text-amber-900 mb-1">Minh chứng cần nộp</div>
                    <div className="text-slate-700">
                      {qaMeta?.requiredEvidences || "Tệp đính kèm hoặc liên kết"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lộ trình thực hiện, Bước hiện tại, Bước tiếp theo & Checklist phụ thuộc */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    2. Lộ trình thực hiện & Tiến độ Checklist ({checklistStats.completedSteps}/{checklistStats.totalSteps} bước — {checklistStats.percent}%)
                  </h4>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Tách biệt khỏi đánh giá chất lượng
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-sky-50 border border-sky-200">
                    <div className="text-[10px] font-bold uppercase text-sky-700">
                      Bước hiện tại
                    </div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {qaMeta?.currentStepLabel ||
                        WORKFLOW_STATUS_LABELS[currentWfStatus]}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                    <div className="text-[10px] font-bold uppercase text-indigo-700">
                      Bước tiếp theo
                    </div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {qaMeta?.nextStepLabel ||
                        (currentWfStatus === "COMPLETED"
                          ? "Đã hoàn tất toàn bộ quy trình"
                          : "Hoàn thiện bước hiện tại & gửi nghiệm thu")}
                    </div>
                  </div>
                </div>

                {checklistItems.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Nhiệm vụ này không chia nhỏ công việc con (Checklist).
                  </p>
                ) : (
                  <div className="space-y-2 pt-1">
                    {checklistItems.map((step: any, idx: number) => {
                      const prerequisite = step.dependsOnStepId
                        ? checklistItems.find((s: any) => s.id === step.dependsOnStepId)
                        : null
                      const isLocked = Boolean(prerequisite && !prerequisite.completed)

                      return (
                        <div
                          key={step.id}
                          className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-xs transition-colors ${
                            step.completed
                              ? "bg-emerald-50/40 border-emerald-200"
                              : isLocked
                              ? "bg-slate-100 border-slate-200 opacity-75"
                              : "bg-white border-slate-200 hover:border-violet-300"
                          }`}
                        >
                          <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              disabled={isLocked && !step.completed}
                              checked={Boolean(step.completed)}
                              onChange={e =>
                                handleToggleStep(step.id, e.target.checked)
                              }
                              className="rounded text-violet-600 w-4 h-4"
                            />
                            <div>
                              <span
                                className={`font-bold ${
                                  step.completed
                                    ? "line-through text-slate-500"
                                    : "text-slate-900"
                                }`}
                              >
                                Bước {idx + 1}: {step.title}
                              </span>
                              {prerequisite && (
                                <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                                  Phụ thuộc: &ldquo;{prerequisite.title}&rdquo;{" "}
                                  {prerequisite.completed ? "(Đã xong)" : "(Chưa xong)"}
                                </div>
                              )}
                            </div>
                          </label>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              step.completed
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {step.completed ? "Đã xong" : "Chưa xong"}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : tab === "review" ? (
            /* TAB 2: KẾT QUẢ, MINH CHỨNG & NGHIỆM THU (TÁCH TIẾN ĐỘ CHECKLIST KHỎI CHẤT LƯỢNG KẾT QUẢ) */
            <div className="space-y-5">
              {/* Phần dành cho Người thực hiện nộp kết quả & minh chứng */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  1. Báo cáo Kết quả thực hiện & Liên kết Minh chứng
                </h4>
                <textarea
                  rows={3}
                  value={resultSummaryInput}
                  onChange={e => setResultSummaryInput(e.target.value)}
                  placeholder="Tóm tắt sản phẩm đã hoàn thành, số liệu chính hoặc ghi chú trình duyệt..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs"
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Liên kết hồ sơ / Minh chứng đính kèm ({evidenceLinksInput.length})
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newEvidenceUrl}
                      onChange={e => setNewEvidenceUrl(e.target.value)}
                      placeholder="Dán URL minh chứng (Google Drive, OneDrive, đường dẫn hồ sơ SSM...)"
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddEvidenceLink}
                      className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm link
                    </button>
                  </div>

                  {evidenceLinksInput.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {evidenceLinksInput.map((lnk, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                        >
                          <a
                            href={lnk}
                            target="_blank"
                            rel="noreferrer"
                            className="text-violet-700 hover:underline truncate inline-flex items-center gap-1"
                          >
                            <Link2 className="w-3.5 h-3.5 shrink-0" />
                            {lnk}
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              setEvidenceLinksInput(prev =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="text-slate-400 hover:text-rose-600"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={transitioning}
                    onClick={() => handleTransition("PENDING_REVIEW")}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold cursor-pointer"
                  >
                    Lưu kết quả & Gửi Chờ duyệt
                  </button>
                </div>
              </div>

              {/* Phần dành cho Người duyệt nghiệm thu kết quả */}
              <div className="bg-violet-50/50 p-4 rounded-xl border border-violet-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-violet-950">
                    2. Đánh giá Chất lượng & Nghiệm thu (Dành cho Người duyệt)
                  </h4>
                  <span className="text-[11px] font-bold text-violet-700">
                    Đã gửi duyệt KHÔNG đồng nghĩa đã hoàn thành
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Xếp loại chất lượng sản phẩm (Độc lập với % checklist)
                    </label>
                    <select
                      value={reviewRatingInput}
                      onChange={e => setReviewRatingInput(e.target.value as any)}
                      disabled={!isReviewerOrManager}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
                    >
                      <option value="XUAT_SAC">Xuất sắc — Vượt tiêu chí nghiệm thu</option>
                      <option value="DAT_CHUAN">Đạt chuẩn — Đáp ứng đầy đủ tiêu chí</option>
                      <option value="CAN_BO_SUNG">Cần bổ sung — Chưa đạt yêu cầu</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Trạng thái nghiệm thu hiện tại
                    </label>
                    <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-800">
                      {WORKFLOW_STATUS_LABELS[currentWfStatus]}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nhận xét nghiệm thu / Yêu cầu chỉnh sửa của Người duyệt
                  </label>
                  <textarea
                    rows={2}
                    disabled={!isReviewerOrManager}
                    value={reviewCommentInput}
                    onChange={e => setReviewCommentInput(e.target.value)}
                    placeholder="Nhập ý kiến đánh giá chất lượng chuyên môn hoặc nội dung yêu cầu bổ sung..."
                    className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs"
                  />
                </div>

                {isReviewerOrManager && (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      disabled={transitioning}
                      onClick={() => {
                        if (!reviewCommentInput.trim()) {
                          alert("Vui lòng nhập nội dung cần bổ sung vào ô Nhận xét.")
                          return
                        }
                        handleTransition("NEEDS_REVISION", reviewCommentInput)
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Yêu cầu bổ sung
                    </button>
                    <button
                      type="button"
                      disabled={transitioning}
                      onClick={() => handleTransition("COMPLETED", reviewCommentInput)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer"
                    >
                      Phê duyệt Hoàn thành
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : tab === "comments" ? (
            /* TAB 3: TRAO ĐỔI, VƯỚNG MẮC & YÊU CẦU HỖ TRỢ */
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium">
                    Chưa có trao đổi hay báo cáo vướng mắc nào.
                  </p>
                </div>
              ) : (
                comments.map(c => {
                  const isMe = c.user.id === currentUserId
                  const isBlocker = c.commentType === "BLOCKER"
                  const isResolved = c.actionStatus === "RESOLVED"
                  return (
                    <div
                      key={c.id}
                      className={`p-3.5 rounded-xl border text-xs ${
                        isBlocker
                          ? "bg-rose-50/70 border-rose-200"
                          : isMe
                          ? "bg-violet-50/60 border-violet-200"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {c.user.fullName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatTime(c.createdAt)}
                          </span>
                          {isBlocker && (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                              VƯỚNG MẮC
                            </span>
                          )}
                        </div>
                        {(isMe || isAdmin) && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap">{c.content}</p>
                      {isBlocker && (
                        <div className="mt-2 pt-2 border-t border-rose-200/60 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-rose-800">
                            Trạng thái:{" "}
                            {isResolved ? "Đã tháo gỡ" : "Đang chờ tháo gỡ"}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleActionStatus(c.id, c.actionStatus)
                            }
                            className="px-2.5 py-1 rounded bg-white border border-rose-300 text-[11px] font-bold text-rose-700 cursor-pointer"
                          >
                            {isResolved
                              ? "Mở lại vướng mắc"
                              : "Đánh dấu Đã giải quyết"}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
              <div ref={commentsEndRef} />
            </div>
          ) : tab === "attachments" ? (
            /* TAB 4: TỆP ĐÍNH KÈM MINH CHỨNG */
            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-3 border-2 border-dashed border-violet-300 hover:border-violet-500 bg-violet-50/40 text-violet-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Paperclip className="w-4 h-4" />
                  {uploading
                    ? "Đang tải tệp lên..."
                    : "Tải lên tệp sản phẩm / minh chứng (Tối đa 4MB)"}
                </button>
              </div>
              {attachments.map(a => {
                const IconComponent = getFileIcon(a.contentType)
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <IconComponent className="w-5 h-5 text-violet-600 shrink-0" />
                      <div className="truncate">
                        <div className="font-bold text-slate-800 truncate">
                          {a.fileName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatSize(a.fileSize)} • {a.user?.fullName}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={a.fileData}
                        download={a.fileName}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-violet-50 text-slate-700"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      {(a.user?.id === currentUserId || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(a.id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* TAB 5: LỊCH SỬ XỬ LÝ (AUDIT LOGS — ĐỔI NGƯỜI, ĐỔI HẠN, DUYỆT, HỦY, MỞ LẠI) */
            <div className="space-y-3">
              <div className="text-xs text-slate-500 mb-2">
                Mọi thao tác phát hành, đổi người phụ trách, đổi hạn, gửi duyệt, phê duyệt, tạm dừng, hủy và mở lại đều được ghi vết bất biến.
              </div>
              {auditLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                  Chưa có bản ghi lịch sử chuyển trạng thái nâng cao.
                </div>
              ) : (
                auditLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900">
                        {log.actorName} ({log.actorRole})
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(log.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-violet-700 font-bold">
                      <span>Hành động: {log.action}</span>
                      {log.fromStatus && log.toStatus && (
                        <span>
                          ({log.fromStatus} &rarr; {log.toStatus})
                        </span>
                      )}
                    </div>
                    {log.reason && (
                      <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                        Lý do / Ghi chú: {log.reason}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer nhập trao đổi nhanh khi ở tab comments */}
        {tab === "comments" && (
          <div className="p-3.5 bg-white border-t border-slate-200">
            <div className="flex items-center gap-1.5 mb-2 overflow-x-auto">
              {COMMENT_TYPES.map(ct => {
                const Icon = ct.icon
                const active = commentType === ct.value
                return (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setCommentType(ct.value)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      active
                        ? "bg-violet-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {ct.label}
                  </button>
                )
              })}
            </div>
            <form onSubmit={handleSendComment} className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder={
                  commentType === "BLOCKER"
                    ? "Mô tả rõ vướng mắc cần lãnh đạo tháo gỡ..."
                    : "Nhập nội dung trao đổi..."
                }
                rows={1}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs resize-none"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || sending}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
