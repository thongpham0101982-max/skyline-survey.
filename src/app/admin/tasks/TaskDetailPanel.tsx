"use client"
import { useState, useEffect, useRef } from "react"
import { 
  X, Send, Paperclip, Download, Trash2, MessageSquare, File, Image, FileText, 
  Clock, User, CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Users, 
  Flag, CheckSquare, AtSign, ArrowRight, CornerDownRight, Sparkles
} from "lucide-react"
import { getTaskDetails, addTaskComment, deleteTaskComment, addTaskAttachment, deleteTaskAttachment, updateCommentActionStatus } from "./collab_actions"
import { confirmTaskAssignment, rejectTaskAssignment } from "./actions"

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
  return d.toLocaleDateString("vi-VN") + " " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
}

const COMMENT_TYPES = [
  { value: "GENERAL", label: "Trao đổi", icon: MessageSquare, color: "text-slate-600 bg-slate-100 hover:bg-slate-200" },
  { value: "PROGRESS", label: "Cập nhật tiến độ", icon: Clock, color: "text-blue-700 bg-blue-50 hover:bg-blue-100" },
  { value: "BLOCKER", label: "Vướng mắc", icon: AlertTriangle, color: "text-red-700 bg-red-50 hover:bg-red-100" },
  { value: "COOPERATION", label: "Phối hợp", icon: Users, color: "text-amber-700 bg-amber-50 hover:bg-amber-100" },
  { value: "CONCLUSION", label: "Kết luận chỉ đạo", icon: Sparkles, color: "text-emerald-700 bg-emerald-50 hover:bg-emerald-100" }
]

interface TaskDetailPanelProps {
  task: any
  currentUserId: string
  isAdmin: boolean
  allStaffUsers?: any[]
  onClose: () => void
  onTaskUpdated?: () => void
}

export function TaskDetailPanel({ task, currentUserId, isAdmin, allStaffUsers = [], onClose, onTaskUpdated }: TaskDetailPanelProps) {
  const [tab, setTab] = useState<"comments" | "attachments">("comments")
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

  useEffect(() => {
    loadDetails()
  }, [task.id])

  useEffect(() => {
    if (tab === "comments") {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [comments, tab])

  const loadDetails = async () => {
    setLoading(true)
    const res = await getTaskDetails(task.id)
    if (res.success) {
      setComments(res.comments)
      setAttachments(res.attachments)
    }
    setLoading(false)
  }

  const handleConfirmTask = async () => {
    setConfirming(true)
    const res = await confirmTaskAssignment(task.id)
    setConfirming(false)
    if (res.success) {
      alert("✅ Bạn đã xác nhận nhận công việc thành công!")
      if (onTaskUpdated) onTaskUpdated()
      else window.location.reload()
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleRejectTask = async () => {
    if (!rejectReasonInput.trim()) return alert("Vui lòng nhập lý do từ chối / phản hồi!")
    setRejecting(true)
    const res = await rejectTaskAssignment(task.id, rejectReasonInput.trim())
    setRejecting(false)
    if (res.success) {
      alert("Đã gửi phản hồi đến người giao việc!")
      if (onTaskUpdated) onTaskUpdated()
      else window.location.reload()
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleSendComment = async () => {
    if (!newComment.trim() || sending) return
    setSending(true)
    const res = await addTaskComment(task.id, newComment.trim(), {
      commentType,
      actionAssigneeId: actionAssigneeId || null,
      actionDueDate: actionDueDate || null,
      mentionedUserIds
    })
    if (res.success && res.comment) {
      setComments([...comments, res.comment])
      setNewComment("")
      setCommentType("GENERAL")
      setActionAssigneeId("")
      setActionDueDate("")
      setMentionedUserIds([])
    } else {
      alert("Lỗi: " + res.error)
    }
    setSending(false)
  }

  const handleToggleActionStatus = async (comment: any) => {
    const nextStatus = comment.actionStatus === "RESOLVED" ? "PENDING" : "RESOLVED"
    const res = await updateCommentActionStatus(comment.id, nextStatus)
    if (res.success) {
      setComments(comments.map(c => c.id === comment.id ? { ...c, actionStatus: nextStatus } : c))
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleDeleteComment = async (id: string) => {
    if (!confirm("Xóa bình luận này?")) return
    const res = await deleteTaskComment(id)
    if (res.success) setComments(comments.filter(c => c.id !== id))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File " + file.name + " quá lớn (tối đa 5MB)")
        continue
      }
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string
        const res = await addTaskAttachment(task.id, file.name, base64, file.size, file.type || "application/octet-stream")
        if (res.success && res.attachment) {
          setAttachments(prev => [res.attachment, ...prev])
        }
      }
      reader.readAsDataURL(file)
    }
    setTimeout(() => setUploading(false), 1000)
    e.target.value = ""
  }

  const handleDeleteAttachment = async (id: string) => {
    if (!confirm("Xóa file này?")) return
    const res = await deleteTaskAttachment(id)
    if (res.success) setAttachments(attachments.filter(a => a.id !== id))
  }

  const handleDownload = (att: any) => {
    const link = document.createElement("a")
    link.href = att.fileData
    link.download = att.fileName
    link.click()
  }

  const handleInsertMention = (user: any) => {
    const tag = `@${user.fullName} `
    setNewComment(prev => prev + tag)
    if (!mentionedUserIds.includes(user.id)) {
      setMentionedUserIds(prev => [...prev, user.id])
    }
    setShowMentionMenu(false)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendComment()
    }
  }

  const priorityColor = task.priority === "URGENT" ? "bg-red-500 text-white" :
    task.priority === "HIGH" ? "bg-orange-500 text-white" :
    task.priority === "LOW" ? "bg-slate-400 text-white" : "bg-sky-500 text-white"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#48BFE3] to-[#00A19A] text-white p-5 flex items-start justify-between shadow-md">
          <div className="flex-1 min-w-0 mr-4 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-white/20 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                {task.category || "Công việc"}
              </span>
              {task.taskGroup?.name && (
                <span className="bg-indigo-900/30 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-white/20">
                  📁 Nhóm: {task.taskGroup.name}
                </span>
              )}
              {task.priority && task.priority !== "MEDIUM" && (
                <span className={`${priorityColor} text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs`}>
                  <Flag className="w-3 h-3" /> {task.priority === "URGENT" ? "Khẩn cấp" : task.priority === "HIGH" ? "Ưu tiên cao" : "Thấp"}
                </span>
              )}
              {task.isImportant && !task.priority && (
                <span className="bg-red-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <AlertTriangle className="w-3 h-3" /> QUAN TRỌNG
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold leading-snug">{task.title}</h2>
            <div className="flex items-center gap-4 text-teal-100 text-xs font-medium pt-0.5 flex-wrap">
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> Giao cho: <b className="text-white">{task.assignedToUser?.fullName || task.assignedToRole}</b></span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Hạn chót: <b className="text-white">{new Date(task.endDate).toLocaleDateString("vi-VN")}</b></span>
              {task.completedAt && (
                <span className="flex items-center gap-1 text-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành lúc: {new Date(task.completedAt).toLocaleDateString("vi-VN")}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/20 transition-colors text-white shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Confirmation Status Banner */}
        <div className="px-5 py-2.5 border-b bg-slate-50 flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">Xác nhận nhận việc:</span>
            {acceptanceStatus === "ACCEPTED" ? (
              <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-0.5 rounded-full flex items-center gap-1.5 border border-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> ĐÃ XÁC NHẬN NHẬN VIỆC
              </span>
            ) : acceptanceStatus === "REJECTED" ? (
              <span className="bg-red-100 text-red-800 font-bold px-3 py-0.5 rounded-full flex items-center gap-1.5 border border-red-200">
                <XCircle className="w-4 h-4 text-red-600" /> TỪ CHỐI / CẦN TRAO ĐỔI LẠI
              </span>
            ) : (
              <span className="bg-amber-100 text-amber-800 font-bold px-3 py-0.5 rounded-full flex items-center gap-1.5 border border-amber-200 animate-pulse">
                <Clock className="w-4 h-4 text-amber-600" /> CHỜ NGƯỜI NHẬN XÁC NHẬN
              </span>
            )}
          </div>
          {task.acceptedAt && (
            <span className="text-slate-400 text-[11px]">Xác nhận lúc: {new Date(task.acceptedAt).toLocaleString("vi-VN")}</span>
          )}
        </div>

        {/* Chi tiết công việc & người phối hợp */}
        <div className="px-5 pt-3 space-y-2">
          {task.description && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
              <div className="font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#48BFE3]" /> Chi tiết công việc:
              </div>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap pl-5 font-medium">{task.description}</p>
            </div>
          )}

          {task.collaborators && (
            <div className="p-2.5 bg-teal-50/70 border border-teal-100 rounded-2xl text-xs flex items-center gap-2">
              <Users className="w-4 h-4 text-[#48BFE3] shrink-0" />
              <div>
                <span className="font-bold text-teal-900">Người phối hợp: </span>
                <span className="text-teal-800 font-semibold">{task.collaborators}</span>
              </div>
            </div>
          )}

          {task.rejectionReason && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Lý do từ chối / Phản hồi từ nhân viên:</p>
                <p className="mt-0.5 opacity-90">{task.rejectionReason}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Prompt for Assignee if waiting confirmation */}
        {acceptanceStatus === "WAITING_CONFIRMATION" && (isAssignee || isAdmin) && (
          <div className="mx-5 mt-3 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-bold text-amber-900 text-xs">⚠️ Yêu cầu xác nhận công việc được giao</p>
                <p className="text-[11px] text-amber-700 mt-0.5">Vui lòng bấm xác nhận tiếp nhận để người giao việc biết bạn đã sẵn sàng thực hiện.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleConfirmTask}
                  disabled={confirming}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" /> {confirming ? "Đang xử lý..." : "Xác nhận nhận việc"}
                </button>
                <button
                  onClick={() => setShowRejectForm(!showRejectForm)}
                  className="bg-white border border-red-300 text-red-700 hover:bg-red-50 font-bold px-3 py-1.5 rounded-xl text-xs transition-all"
                >
                  Từ chối / Phản hồi
                </button>
              </div>
            </div>

            {showRejectForm && (
              <div className="mt-3 pt-3 border-t border-amber-200 space-y-2">
                <label className="block text-xs font-bold text-amber-900">Ghi rõ lý do hoặc nội dung trao đổi lại với người giao:</label>
                <textarea
                  value={rejectReasonInput}
                  onChange={e => setRejectReasonInput(e.target.value)}
                  placeholder="Ví dụ: Cần bổ sung tài liệu, trùng thời gian dự giờ, xin gia hạn hạn chót..."
                  rows={2}
                  className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-red-400 bg-white"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowRejectForm(false)} className="text-xs text-slate-500 px-3 py-1.5 rounded-lg hover:bg-amber-100">Hủy</button>
                  <button onClick={handleRejectTask} disabled={rejecting} className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-xl hover:bg-red-700">
                    {rejecting ? "Đang gửi..." : "Gửi phản hồi"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs Header */}
        <div className="flex border-b border-slate-200 mt-2 px-5">
          <button onClick={() => setTab("comments")}
            className={"flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold border-b-2 transition-colors " + (tab === "comments" ? "border-[#48BFE3] text-[#0284C7] bg-teal-50/50 rounded-t-xl" : "border-transparent text-slate-500 hover:text-slate-700")}>
            <MessageSquare className="w-4 h-4" /> Trao đổi, Phản hồi & Vướng mắc ({comments.length})
          </button>
          <button onClick={() => setTab("attachments")}
            className={"flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold border-b-2 transition-colors " + (tab === "attachments" ? "border-[#48BFE3] text-[#0284C7] bg-teal-50/50 rounded-t-xl" : "border-transparent text-slate-500 hover:text-slate-700")}>
            <Paperclip className="w-4 h-4" /> File đính kèm ({attachments.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-3 border-teal-200 border-t-[#48BFE3] rounded-full animate-spin"></div>
            </div>
          ) : tab === "comments" ? (
            <div className="space-y-3.5">
              {comments.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="font-semibold text-xs">Chưa có ý kiến trao đổi nào</p>
                  <p className="text-[11px] mt-0.5">Viết bình luận, cập nhật tiến độ hoặc nêu vướng mắc để ban điều hành hỗ trợ!</p>
                </div>
              )}
              {comments.map(c => {
                const isOwn = c.userId === currentUserId
                const isBlocker = c.commentType === "BLOCKER"
                const isCooperation = c.commentType === "COOPERATION"
                const isConclusion = c.commentType === "CONCLUSION"
                const isProgress = c.commentType === "PROGRESS"
                const hasAction = (isBlocker || isCooperation)

                return (
                  <div key={c.id} className="space-y-1">
                    {/* Specialized Cards for Blockers & Conclusions */}
                    {isBlocker ? (
                      <div className="p-3.5 rounded-2xl bg-red-50/90 border border-red-200 text-xs space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="bg-red-600 text-white font-extrabold px-2.5 py-0.5 rounded-md text-[10px] flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> VƯỚNG MẮC / CẦN THÁO GỠ
                          </span>
                          <span className="text-[10px] text-slate-400">{c.user?.fullName} • {formatTime(c.createdAt)}</span>
                        </div>
                        <p className="font-medium text-red-950 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                        
                        {/* Action Item Box */}
                        <div className="p-2.5 bg-white/80 border border-red-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-[11px]">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span>Người giải quyết: <b>{c.actionAssigneeName || "Ban Giám Đốc"}</b></span>
                            {c.actionDueDate && (
                              <span>Hạn: <b>{new Date(c.actionDueDate).toLocaleDateString("vi-VN")}</b></span>
                            )}
                            <span className={`px-2 py-0.5 rounded-md font-bold ${
                              c.actionStatus === "RESOLVED" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800 animate-pulse"
                            }`}>
                              {c.actionStatus === "RESOLVED" ? "✓ ĐÃ GIẢI QUYẾT" : "⚠️ ĐANG XỬ LÝ"}
                            </span>
                          </div>
                          {(isAdmin || isAssignee || c.userId === currentUserId) && (
                            <button
                              onClick={() => handleToggleActionStatus(c)}
                              className={`px-3 py-1 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 ${
                                c.actionStatus === "RESOLVED"
                                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs"
                              }`}
                            >
                              <CheckSquare className="w-3 h-3" />
                              {c.actionStatus === "RESOLVED" ? "Mở lại vướng mắc" : "Đánh dấu Đã giải quyết"}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : isConclusion ? (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-xs space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="bg-emerald-600 text-white font-extrabold px-2.5 py-0.5 rounded-md text-[10px] flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> KẾT LUẬN / CHỈ ĐẠO CỦA LÃNH ĐẠO
                          </span>
                          <span className="text-[10px] text-slate-400">{c.user?.fullName} • {formatTime(c.createdAt)}</span>
                        </div>
                        <p className="font-bold text-emerald-950 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                      </div>
                    ) : isCooperation ? (
                      <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="bg-amber-600 text-white font-extrabold px-2.5 py-0.5 rounded-md text-[10px] flex items-center gap-1">
                            <Users className="w-3 h-3" /> YÊU CẦU PHỐI HỢP
                          </span>
                          <span className="text-[10px] text-slate-400">{c.user?.fullName} • {formatTime(c.createdAt)}</span>
                        </div>
                        <p className="font-medium text-amber-950 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                        {c.actionAssigneeName && (
                          <div className="text-[11px] text-amber-900 font-semibold">
                            Giao đầu mối hỗ trợ: <b>{c.actionAssigneeName}</b>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Regular comment & Progress update */
                      <div className={"flex " + (isOwn ? "justify-end" : "justify-start")}>
                        <div className={"max-w-[85%] group " + (isOwn ? "order-2" : "")}>
                          <div className={"rounded-2xl px-4 py-2.5 shadow-2xs " + (
                            isOwn 
                              ? "bg-[#48BFE3] text-white rounded-br-md" 
                              : isProgress 
                              ? "bg-sky-50 text-sky-950 border border-sky-200 rounded-bl-md" 
                              : "bg-slate-100 text-slate-800 rounded-bl-md"
                          )}>
                            {!isOwn && (
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[11px] font-bold text-[#0284C7]">{c.user?.fullName}</span>
                                {isProgress && (
                                  <span className="text-[9px] bg-sky-200 text-sky-800 px-1.5 py-0.5 rounded-md font-extrabold">Tiến độ</span>
                                )}
                              </div>
                            )}
                            {isProgress && isOwn && (
                              <div className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded-md font-extrabold inline-block mb-1">
                                Cập nhật tiến độ
                              </div>
                            )}
                            <p className="text-xs whitespace-pre-wrap break-words leading-relaxed">{c.content}</p>
                          </div>
                          <div className={"flex items-center gap-2 mt-1 px-1 " + (isOwn ? "justify-end" : "")}>
                            <span className="text-[10px] text-slate-400">{formatTime(c.createdAt)}</span>
                            {(isOwn || isAdmin) && (
                              <button onClick={() => handleDeleteComment(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              <div ref={commentsEndRef} />
            </div>
          ) : (
            <div className="space-y-2">
              {attachments.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Paperclip className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Chưa có file đính kèm</p>
                  <p className="text-xs mt-1">Tải lên file báo cáo hoặc tài liệu liên quan</p>
                </div>
              )}
              {attachments.map(a => {
                const IconComp = getFileIcon(a.contentType)
                return (
                  <div key={a.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-2xl hover:border-teal-300 hover:shadow-xs transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                      <IconComp className="w-5 h-5 text-[#48BFE3]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{a.fileName}</p>
                      <p className="text-[11px] text-slate-400">{formatSize(a.fileSize)} • {a.user?.fullName} • {formatTime(a.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDownload(a)} className="p-1.5 text-[#48BFE3] hover:bg-teal-50 rounded-lg" title="Tải xuống">
                        <Download className="w-4 h-4" />
                      </button>
                      {(a.userId === currentUserId || isAdmin) && (
                        <button onClick={() => handleDeleteAttachment(a.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom Input Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2.5">
          {tab === "comments" ? (
            <div className="space-y-2">
              {/* Type pills selector */}
              <div className="flex items-center justify-between flex-wrap gap-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400 font-bold text-[10px] mr-1">Phân loại:</span>
                  {COMMENT_TYPES.map(t => {
                    const Icon = t.icon
                    const isSelected = commentType === t.value
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setCommentType(t.value)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all ${
                          isSelected 
                            ? "bg-[#00A19A] text-white shadow-2xs" 
                            : t.color
                        }`}
                      >
                        <Icon className="w-3 h-3" /> {t.label}
                      </button>
                    )
                  })}
                </div>

                {/* Mention button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowMentionMenu(!showMentionMenu)}
                    className="text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded-lg flex items-center gap-1 shadow-2xs hover:bg-slate-100"
                  >
                    <AtSign className="w-3 h-3 text-[#48BFE3]" /> @Nhắc tên
                  </button>

                  {showMentionMenu && (
                    <div className="absolute right-0 bottom-full mb-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 text-xs space-y-1">
                      <input
                        type="text"
                        value={mentionFilter}
                        onChange={e => setMentionFilter(e.target.value)}
                        placeholder="Tìm nhân sự..."
                        className="w-full text-xs p-1.5 border rounded-lg mb-1 outline-none focus:ring-1 focus:ring-teal-400"
                      />
                      <div className="max-h-36 overflow-y-auto space-y-0.5">
                        {allStaffUsers
                          .filter(u => u.fullName.toLowerCase().includes(mentionFilter.toLowerCase()))
                          .slice(0, 10)
                          .map(u => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => handleInsertMention(u)}
                              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-teal-50 text-slate-700 font-semibold truncate flex items-center gap-1.5"
                            >
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{u.fullName}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Item specific inputs if Blocker or Cooperation */}
              {(commentType === "BLOCKER" || commentType === "COOPERATION") && (
                <div className="p-2.5 bg-white border border-red-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Người chịu trách nhiệm xử lý / hỗ trợ:</label>
                    <select
                      value={actionAssigneeId}
                      onChange={e => setActionAssigneeId(e.target.value)}
                      className="w-full text-xs p-1.5 border rounded-lg bg-slate-50 font-bold"
                    >
                      <option value="">-- Chọn nhân sự giải quyết --</option>
                      {allStaffUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.fullName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Hạn chót giải quyết điểm nghẽn:</label>
                    <input
                      type="date"
                      value={actionDueDate}
                      onChange={e => setActionDueDate(e.target.value)}
                      className="w-full text-xs p-1.5 border rounded-lg bg-slate-50 font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Input row */}
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    commentType === "BLOCKER" 
                      ? "Nêu chi tiết khó khăn, vướng mắc và kiến nghị giải pháp..." 
                      : commentType === "CONCLUSION"
                      ? "Ghi rõ kết luận chỉ đạo của Ban lãnh đạo..."
                      : commentType === "PROGRESS"
                      ? "Cập nhật % tiến độ và nội dung công việc vừa hoàn tất..."
                      : "Nhập nội dung trao đổi... (Enter để gửi)"
                  }
                  rows={2}
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[#48BFE3] bg-white font-medium"
                />
                <button
                  onClick={handleSendComment}
                  disabled={!newComment.trim() || sending}
                  className="bg-[#48BFE3] text-white p-3 rounded-xl hover:bg-[#00A19A] disabled:opacity-40 transition-colors shadow-xs shrink-0"
                  title="Gửi"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" accept="*/*" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 bg-[#48BFE3] text-white px-5 py-2.5 rounded-xl hover:bg-[#00A19A] disabled:opacity-50 font-bold text-xs transition-colors shadow-xs"
              >
                <Paperclip className="w-4 h-4" /> {uploading ? "Đang tải lên..." : "Tải file tài liệu lên"}
              </button>
              <span className="text-[11px] text-slate-400">Hỗ trợ file tối đa 5MB</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
