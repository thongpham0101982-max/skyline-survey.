"use client"
import { useState, useEffect, useRef } from "react"
import { X, Send, Paperclip, Download, Trash2, MessageSquare, File, Image, FileText, Clock, User } from "lucide-react"
import { getTaskDetails, addTaskComment, deleteTaskComment, addTaskAttachment, deleteTaskAttachment } from "./collab_actions"

const FILE_ICONS: Record<string, any> = {
  "image": Image,
  "application/pdf": FileText,
  "default": File
}

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
}

export function TaskDetailPanel({ task, currentUserId, isAdmin, onClose }: TaskDetailPanelProps) {
  const [tab, setTab] = useState<"comments" | "attachments">("comments")
  const [comments, setComments] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        alert("File " + file.name + " qua lon (toi da 5MB)")
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-5 flex items-start justify-between">
          <div className="flex-1 min-w-0 mr-4">
            <h2 className="text-lg font-bold truncate">{task.title}</h2>
            <div className="flex items-center gap-3 mt-1.5 text-indigo-100 text-xs">
              <span className="flex items-center gap-1"><User className="w-3 h-3" /> {task.assignedToUser?.fullName || task.assignedToRole}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Han: {new Date(task.endDate).toLocaleDateString("vi-VN")}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button onClick={() => setTab("comments")}
            className={"flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors " + (tab === "comments" ? "border-indigo-600 text-indigo-700 bg-indigo-50/50" : "border-transparent text-slate-500 hover:text-slate-700")}>
            <MessageSquare className="w-4 h-4" /> Bình luận ({comments.length})
          </button>
          <button onClick={() => setTab("attachments")}
            className={"flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors " + (tab === "attachments" ? "border-indigo-600 text-indigo-700 bg-indigo-50/50" : "border-transparent text-slate-500 hover:text-slate-700")}>
            <Paperclip className="w-4 h-4" /> File đính kèm ({attachments.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : tab === "comments" ? (
            <div className="p-4 space-y-3">
              {comments.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Chưa có bình luận nào</p>
                  <p className="text-xs mt-1">Hãy là người đầu tiên bình luận!</p>
                </div>
              )}
              {comments.map(c => {
                const isOwn = c.userId === currentUserId
                return (
                  <div key={c.id} className={"flex " + (isOwn ? "justify-end" : "justify-start")}>
                    <div className={"max-w-[80%] group " + (isOwn ? "order-2" : "")}>
                      <div className={"rounded-2xl px-4 py-2.5 shadow-sm " + (isOwn ? "bg-indigo-600 text-white rounded-br-md" : "bg-slate-100 text-slate-800 rounded-bl-md")}>
                        {!isOwn && <div className={"text-xs font-bold mb-1 " + (isOwn ? "text-indigo-200" : "text-indigo-600")}>{c.user?.fullName}</div>}
                        <p className="text-sm whitespace-pre-wrap break-words">{c.content}</p>
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
                  <p className="text-xs mt-1">Tải lên file để chia sẻ với nhóm</p>
                </div>
              )}
              {attachments.map(a => {
                const IconComp = getFileIcon(a.contentType)
                const isImage = a.contentType?.startsWith("image")
                return (
                  <div key={a.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <IconComp className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{a.fileName}</p>
                      <p className="text-xs text-slate-400">{formatSize(a.fileSize)} • {a.user?.fullName} • {formatTime(a.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDownload(a)} className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg" title="Tải xuống">
                        <Download className="w-4 h-4" />
                      </button>
                      {(a.userId === currentUserId || isAdmin) && (
                        <button onClick={() => handleDeleteAttachment(a.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Xoa">
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

        {/* Bottom Action Bar */}
        <div className="border-t border-slate-200 p-3 bg-slate-50">
          {tab === "comments" ? (
            <div className="flex items-end gap-2">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập bình luận... (Enter để gửi)"
                rows={1}
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 max-h-24 bg-white"
              />
              <button
                onClick={handleSendComment}
                disabled={!newComment.trim() || sending}
                className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" accept="*/*" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm transition-colors shadow-sm"
              >
                <Paperclip className="w-4 h-4" /> {uploading ? "Đang tải lên..." : "Tải file lên"}
              </button>
              <span className="text-xs text-slate-400">Tối đa 5MB / file</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
