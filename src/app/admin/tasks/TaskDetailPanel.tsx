"use client"
import { useState, useEffect, useRef } from "react"
import { X, Send, Paperclip, Download, Trash2, MessageSquare, File, Image, FileText, Clock, User, CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from "lucide-react"
import { getTaskDetails, addTaskComment, deleteTaskComment, addTaskAttachment, deleteTaskAttachment } from "./collab_actions"
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

interface TaskDetailPanelProps {
  task: any
  currentUserId: string
  isAdmin: boolean
  onClose: () => void
  onTaskUpdated?: () => void
}

export function TaskDetailPanel({ task, currentUserId, isAdmin, onClose, onTaskUpdated }: TaskDetailPanelProps) {
  const [tab, setTab] = useState<"comments" | "attachments">("comments")
  const [comments, setComments] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReasonInput, setRejectReasonInput] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)

  const commentsEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    const res = await addTaskComment(task.id, newComment.trim())
    if (res.success && res.comment) {
      setComments([...comments, res.comment])
      setNewComment("")
    } else {
      alert("Lỗi: " + res.error)
    }
    setSending(false)
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendComment()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#00A99D] to-[#007A72] text-white p-5 flex items-start justify-between shadow-md">
          <div className="flex-1 min-w-0 mr-4 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-white/20 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                {task.category || "Công việc"}
              </span>
              {task.isImportant && (
                <span className="bg-red-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <AlertTriangle className="w-3 h-3" /> QUAN TRỌNG
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold leading-snug">{task.title}</h2>
            <div className="flex items-center gap-4 text-teal-100 text-xs font-medium pt-1">
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> Giao cho: {task.assignedToUser?.fullName || task.assignedToRole}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Hạn chót: {new Date(task.endDate).toLocaleDateString("vi-VN")}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/20 transition-colors text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Confirmation Status Banner */}
        <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">Xác nhận nhận việc:</span>
            {acceptanceStatus === "ACCEPTED" ? (
              <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> ĐÃ XÁC NHẬN NHẬN VIỆC
              </span>
            ) : acceptanceStatus === "REJECTED" ? (
              <span className="bg-red-100 text-red-800 font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-red-200">
                <XCircle className="w-4 h-4 text-red-600" /> TỪ CHỐI / CẦN TRAO ĐỔI LẠI
              </span>
            ) : (
              <span className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-amber-200 animate-pulse">
                <Clock className="w-4 h-4 text-amber-600" /> CHỜ NGƯỜI NHẬN XÁC NHẬN
              </span>
            )}
          </div>
          {task.acceptedAt && (
            <span className="text-slate-400 text-[11px]">Xác nhận lúc: {new Date(task.acceptedAt).toLocaleString("vi-VN")}</span>
          )}
        </div>

        {/* Rejection Note Alert if any */}
        {task.rejectionReason && (
          <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">Lý do từ chối / Phản hồi từ nhân viên:</p>
              <p className="mt-0.5 opacity-90">{task.rejectionReason}</p>
            </div>
          </div>
        )}

        {/* Action Prompt for Assignee if waiting confirmation */}
        {acceptanceStatus === "WAITING_CONFIRMATION" && (isAssignee || isAdmin) && (
          <div className="mx-5 mt-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-bold text-amber-900 text-sm">⚠️ Yêu cầu xác nhận công việc được giao</p>
                <p className="text-xs text-amber-700 mt-0.5">Vui lòng bấm xác nhận tiếp nhận để người giao việc biết bạn đã sẵn sàng thực hiện.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleConfirmTask}
                  disabled={confirming}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" /> {confirming ? "Đang xử lý..." : "Xác nhận nhận việc"}
                </button>
                <button
                  onClick={() => setShowRejectForm(!showRejectForm)}
                  className="bg-white border border-red-300 text-red-700 hover:bg-red-50 font-bold px-3.5 py-2 rounded-xl text-xs transition-all"
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
        <div className="flex border-b border-slate-200 mt-2">
          <button onClick={() => setTab("comments")}
            className={"flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold border-b-2 transition-colors " + (tab === "comments" ? "border-[#00A99D] text-[#00A99D] bg-teal-50/50" : "border-transparent text-slate-500 hover:text-slate-700")}>
            <MessageSquare className="w-4 h-4" /> Trao đổi & Trao đổi ({comments.length})
          </button>
          <button onClick={() => setTab("attachments")}
            className={"flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold border-b-2 transition-colors " + (tab === "attachments" ? "border-[#00A99D] text-[#00A99D] bg-teal-50/50" : "border-transparent text-slate-500 hover:text-slate-700")}>
            <Paperclip className="w-4 h-4" /> File đính kèm ({attachments.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-3 border-teal-200 border-t-[#00A99D] rounded-full animate-spin"></div>
            </div>
          ) : tab === "comments" ? (
            <div className="p-4 space-y-3">
              {comments.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Chưa có ý kiến trao đổi nào</p>
                  <p className="text-xs mt-1">Viết bình luận để trao đổi trực tiếp về công việc này!</p>
                </div>
              )}
              {comments.map(c => {
                const isOwn = c.userId === currentUserId
                return (
                  <div key={c.id} className={"flex " + (isOwn ? "justify-end" : "justify-start")}>
                    <div className={"max-w-[85%] group " + (isOwn ? "order-2" : "")}>
                      <div className={"rounded-2xl px-4 py-2.5 shadow-sm " + (isOwn ? "bg-[#00A99D] text-white rounded-br-md" : "bg-slate-100 text-slate-800 rounded-bl-md")}>
                        {!isOwn && <div className={"text-[11px] font-bold mb-1 text-[#00A99D]"}>{c.user?.fullName}</div>}
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
                )
              })}
              <div ref={commentsEndRef} />
            </div>
          ) : (
            <div className="p-4 space-y-2">
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
                  <div key={a.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-teal-300 hover:shadow-sm transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <IconComp className="w-5 h-5 text-[#00A99D]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{a.fileName}</p>
                      <p className="text-[11px] text-slate-400">{formatSize(a.fileSize)} • {a.user?.fullName} • {formatTime(a.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDownload(a)} className="p-1.5 text-[#00A99D] hover:bg-teal-50 rounded-lg" title="Tải xuống">
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
        <div className="p-3 bg-slate-50 border-t border-slate-200">
          {tab === "comments" ? (
            <div className="flex items-end gap-2">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập nội dung trao đổi... (Enter để gửi)"
                rows={1}
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[#00A99D] bg-white"
              />
              <button
                onClick={handleSendComment}
                disabled={!newComment.trim() || sending}
                className="bg-[#00A99D] text-white p-2.5 rounded-xl hover:bg-[#007A72] disabled:opacity-40 transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" accept="*/*" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 bg-[#00A99D] text-white px-5 py-2.5 rounded-xl hover:bg-[#007A72] disabled:opacity-50 font-bold text-xs transition-colors shadow-sm"
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
