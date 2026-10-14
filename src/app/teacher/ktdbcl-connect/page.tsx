"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  MessageSquare,
  Bell,
  HelpCircle,
  Plus,
  Send,
  Paperclip,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Sparkles,
  ChevronRight,
  ExternalLink,
  ThumbsUp,
  FileText,
  Image as ImageIcon,
  Star,
  RefreshCw,
  X,
  BookOpen,
  ClipboardList,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
  Download,
  Info
} from "lucide-react"
import { CATEGORY_LABELS, STATUS_LABELS, ANNOUNCEMENT_CATEGORY_LABELS } from "@/lib/ktdbcl/connectService"

export default function TeacherKtdbclConnectPage() {
  const searchParams = useSearchParams()
  const initialRequestId = searchParams?.get("requestId") || ""
  const initialTab = searchParams?.get("tab") || "requests"

  const [activeTab, setActiveTab] = useState<"requests" | "announcements" | "knowledge">(
    initialTab === "announcements" ? "announcements" : initialTab === "knowledge" ? "knowledge" : "requests"
  )

  // Requests state
  const [requests, setRequests] = useState<any[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // New Request Form Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newCategory, setNewCategory] = useState("SO_DIEM_NHAN_XET")
  const [newContent, setNewContent] = useState("")
  const [newPriority, setNewPriority] = useState("NORMAL")
  const [newAttachments, setNewAttachments] = useState<any[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [submittingRequest, setSubmittingRequest] = useState(false)

  // Reply message in detail
  const [replyText, setReplyText] = useState("")
  const [replyAttachments, setReplyAttachments] = useState<any[]>([])
  const [sendingReply, setSendingReply] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Rating & Reopen
  const [ratingStars, setRatingStars] = useState(5)
  const [ratingFeedback, setRatingFeedback] = useState("")
  const [submittingRating, setSubmittingRating] = useState(false)
  const [reopenReason, setReopenReason] = useState("")
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false)
  const [submittingReopen, setSubmittingReopen] = useState(false)

  // Announcements state
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null)
  const [announcementCategory, setAnnouncementCategory] = useState("ALL")

  // Knowledge base state
  const [knowledgeItems, setKnowledgeItems] = useState<any[]>([])
  const [loadingKnowledge, setLoadingKnowledge] = useState(false)
  const [knowledgeSearch, setKnowledgeSearch] = useState("")
  const [knowledgeCategory, setKnowledgeCategory] = useState("ALL")
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null)

  // Load Requests
  const loadRequests = async () => {
    try {
      setLoadingRequests(true)
      const res = await fetch(`/api/ktdbcl/connect/requests?status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      }
    } catch (err) {
      console.error("Error loading requests:", err)
    } finally {
      setLoadingRequests(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [statusFilter, searchQuery])

  // Load Announcements
  const loadAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true)
      const res = await fetch(`/api/ktdbcl/connect/announcements?category=${announcementCategory}`)
      if (res.ok) {
        const data = await res.json()
        setAnnouncements(data.announcements || [])
      }
    } catch (err) {
      console.error("Error loading announcements:", err)
    } finally {
      setLoadingAnnouncements(false)
    }
  }

  useEffect(() => {
    if (activeTab === "announcements") {
      loadAnnouncements()
    }
  }, [activeTab, announcementCategory])

  // Load Knowledge
  const loadKnowledge = async () => {
    try {
      setLoadingKnowledge(true)
      const res = await fetch(`/api/ktdbcl/connect/knowledge?category=${knowledgeCategory}&search=${encodeURIComponent(knowledgeSearch)}`)
      if (res.ok) {
        const data = await res.json()
        setKnowledgeItems(data.items || [])
      }
    } catch (err) {
      console.error("Error loading knowledge:", err)
    } finally {
      setLoadingKnowledge(false)
    }
  }

  useEffect(() => {
    if (activeTab === "knowledge") {
      loadKnowledge()
    }
  }, [activeTab, knowledgeCategory, knowledgeSearch])

  // Open specific request if provided in query
  useEffect(() => {
    if (initialRequestId) {
      handleSelectRequest(initialRequestId)
    }
  }, [initialRequestId])

  const handleSelectRequest = async (id: string) => {
    try {
      setLoadingDetail(true)
      const res = await fetch(`/api/ktdbcl/connect/requests/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedRequest(data.request)
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 100)
      }
    } catch (err) {
      console.error("Error fetching request detail:", err)
    } finally {
      setLoadingDetail(false)
    }
  }

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isReply = false) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingFile(true)
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append("file", file)

      try {
        const res = await fetch("/api/ktdbcl/connect/upload", {
          method: "POST",
          body: formData
        })
        if (res.ok) {
          const data = await res.json()
          if (data.file) {
            if (isReply) {
              setReplyAttachments(prev => [...prev, data.file])
            } else {
              setNewAttachments(prev => [...prev, data.file])
            }
          }
        }
      } catch (err) {
        console.error("Upload error:", err)
      }
    }
    setUploadingFile(false)
    e.target.value = ""
  }

  // Submit New Request
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newContent.trim()) return

    setSubmittingRequest(true)
    try {
      const res = await fetch("/api/ktdbcl/connect/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          content: newContent,
          priority: newPriority,
          attachments: newAttachments
        })
      })

      if (res.ok) {
        const data = await res.json()
        setIsCreateModalOpen(false)
        setNewTitle("")
        setNewContent("")
        setNewAttachments([])
        await loadRequests()
        if (data.request?.id) {
          handleSelectRequest(data.request.id)
        }
      }
    } catch (err) {
      console.error("Create request error:", err)
    } finally {
      setSubmittingRequest(false)
    }
  }

  // Send Reply in Conversation
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() && replyAttachments.length === 0) return
    if (!selectedRequest) return

    setSendingReply(true)
    try {
      const res = await fetch(`/api/ktdbcl/connect/requests/${selectedRequest.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyText,
          attachments: replyAttachments,
          isInternalNote: false
        })
      })

      if (res.ok) {
        const data = await res.json()
        setReplyText("")
        setReplyAttachments([])
        // Refresh detail
        handleSelectRequest(selectedRequest.id)
        loadRequests()
      }
    } catch (err) {
      console.error("Send reply error:", err)
    } finally {
      setSendingReply(false)
    }
  }

  // Rate Request
  const handleRateRequest = async () => {
    if (!selectedRequest) return
    setSubmittingRating(true)
    try {
      const res = await fetch(`/api/ktdbcl/connect/requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RATE",
          rating: ratingStars,
          ratingFeedback
        })
      })
      if (res.ok) {
        handleSelectRequest(selectedRequest.id)
        loadRequests()
      }
    } catch (err) {
      console.error("Rate error:", err)
    } finally {
      setSubmittingRating(false)
    }
  }

  // Reopen Request
  const handleReopenRequest = async () => {
    if (!selectedRequest) return
    setSubmittingReopen(true)
    try {
      const res = await fetch(`/api/ktdbcl/connect/requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REOPEN",
          notes: reopenReason || "Giáo viên cần hỗ trợ thêm"
        })
      })
      if (res.ok) {
        setIsReopenModalOpen(false)
        setReopenReason("")
        handleSelectRequest(selectedRequest.id)
        loadRequests()
      }
    } catch (err) {
      console.error("Reopen error:", err)
    } finally {
      setSubmittingReopen(false)
    }
  }

  // Mark Announcement Read
  const handleOpenAnnouncement = async (ann: any) => {
    setSelectedAnnouncement(ann)
    if (!ann.isRead) {
      try {
        await fetch(`/api/ktdbcl/connect/announcements/${ann.id}/read`, { method: "POST" })
        setAnnouncements(prev =>
          prev.map(a => (a.id === ann.id ? { ...a, isRead: true, readCount: a.readCount + 1 } : a))
        )
      } catch (err) {
        console.error("Mark read error:", err)
      }
    }
  }

  const unreadAnnouncementsCount = announcements.filter(a => !a.isRead).length
  const pendingRequestsCount = requests.filter(r => r.status === "NEW" || r.status === "IN_PROGRESS").length

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner Sky-Line Brand */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#003B3A] via-[#004D40] to-[#0A5C55] text-white p-6 sm:p-8 shadow-xl border border-white/10">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-56 h-56 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold tracking-wide text-teal-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>HỆ THỐNG GIÁO DỤC SKY-LINE • BAN KT&ĐBCL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              KT&ĐBCL Connect
              <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Kênh Trao đổi & Hỗ trợ Giáo viên
              </span>
            </h1>
            <p className="text-sm text-teal-100/90 leading-relaxed font-normal">
              Kênh giao tiếp hai chiều chính thức, hỗ trợ Thầy/Cô giải đáp kịp thời các vấn đề về Sổ điểm, Khảo thí, Dự giờ, Đánh giá Năng lực và Quy chế chuyên môn.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-teal-900/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Gửi yêu cầu hỗ trợ mới</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Pill */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 text-xs">
          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-xs border border-white/10">
            <span className="text-teal-200/80 block text-[11px]">Yêu cầu đang xử lý</span>
            <span className="text-xl font-bold text-white">{pendingRequestsCount}</span>
          </div>
          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-xs border border-white/10">
            <span className="text-teal-200/80 block text-[11px]">Thông báo chưa đọc</span>
            <span className="text-xl font-bold text-amber-300">{unreadAnnouncementsCount}</span>
          </div>
          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-xs border border-white/10">
            <span className="text-teal-200/80 block text-[11px]">Thời gian cam kết hỗ trợ</span>
            <span className="text-xl font-bold text-emerald-300">&le; 24h</span>
          </div>
          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-xs border border-white/10">
            <span className="text-teal-200/80 block text-[11px]">Hỗ trợ AI gợi ý tức thì</span>
            <span className="text-xl font-bold text-teal-300 flex items-center gap-1">
              <Sparkles className="w-4 h-4" /> Bật 24/7
            </span>
          </div>
        </div>
      </div>

      {/* 2. SSM Deep-link Shortcuts */}
      <div className="bg-white rounded-xl p-3 shadow-xs border border-slate-200/80 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500 font-semibold px-2 flex items-center gap-1.5 shrink-0">
          <TrendingUp className="w-4 h-4 text-teal-600" /> Liên kết nhanh phân hệ:
        </span>
        <Link
          href="/teacher/so-diem-nhan-xet"
          className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-200 text-slate-700 hover:text-teal-700 transition-colors flex items-center gap-1"
        >
          <ClipboardList className="w-3.5 h-3.5 text-teal-600" /> Sổ điểm & Nhận xét
        </Link>
        <Link
          href="/teacher/du-gio"
          className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-700 transition-colors flex items-center gap-1"
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Dự giờ K-12
        </Link>
        <Link
          href="/teacher/ai-growth"
          className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-amber-50 border border-slate-200 text-slate-700 hover:text-amber-700 transition-colors flex items-center gap-1"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Growth – Đổi mới tiết dạy
        </Link>
        <Link
          href="/teacher/ho-so-hoc-sinh"
          className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-sky-50 border border-slate-200 text-slate-700 hover:text-sky-700 transition-colors flex items-center gap-1"
        >
          <FileText className="w-3.5 h-3.5 text-sky-600" /> Hồ sơ học tập
        </Link>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => { setActiveTab("requests"); setSelectedRequest(null); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === "requests"
              ? "bg-[#003B3A] text-white shadow-md shadow-teal-900/10"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Cần hỗ trợ & Yêu cầu của tôi</span>
          {requests.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "requests" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              {requests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab("announcements"); setSelectedAnnouncement(null); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === "announcements"
              ? "bg-[#003B3A] text-white shadow-md shadow-teal-900/10"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Bảng tin Nghiệp vụ</span>
          {unreadAnnouncementsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 animate-pulse">
              {unreadAnnouncementsCount} mới
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("knowledge")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === "knowledge"
              ? "bg-[#003B3A] text-white shadow-md shadow-teal-900/10"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Kho tri thức & FAQ</span>
        </button>
      </div>

      {/* 4. Tab Content */}

      {/* TAB 1: YÊU CẦU HỖ TRỢ / DIALOGUE */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {/* Controls bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo mã yêu cầu, tiêu đề..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] text-slate-400 font-medium shrink-0">Trạng thái:</span>
              {["ALL", "NEW", "IN_PROGRESS", "ANSWERED", "RESOLVED"].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    statusFilter === st
                      ? "bg-teal-50 text-teal-800 border border-teal-200"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {st === "ALL" ? "Tất cả" : STATUS_LABELS[st]?.label || st}
                </button>
              ))}
            </div>
          </div>

          {/* List + Conversation Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left list (col 12 or col 5) */}
            <div className={`${selectedRequest ? "lg:col-span-5" : "lg:col-span-12"} space-y-3`}>
              {loadingRequests ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
                  Đang tải danh sách yêu cầu...
                </div>
              ) : requests.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">Thầy/Cô chưa gửi yêu cầu hỗ trợ nào</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Khi gặp bất kỳ khó khăn nào về nghiệp vụ, điểm số, đề thi hay dự giờ, Thầy/Cô chỉ cần bấm gửi yêu cầu bên dưới để được Ban KT&ĐBCL đồng hành hỗ trợ.
                  </p>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-bold hover:bg-[#004D40] transition-colors"
                  >
                    + Gửi câu hỏi đầu tiên
                  </button>
                </div>
              ) : (
                requests.map(req => {
                  const statusInfo = STATUS_LABELS[req.status] || STATUS_LABELS.NEW
                  const isSelected = selectedRequest?.id === req.id
                  return (
                    <div
                      key={req.id}
                      onClick={() => handleSelectRequest(req.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-teal-50/50 border-teal-500 shadow-md ring-1 ring-teal-500/20"
                          : "bg-white border-slate-200 hover:border-teal-300 hover:shadow-xs"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {req.requestCode}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm mb-1.5 line-clamp-1">{req.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed font-normal">{req.content}</p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {CATEGORY_LABELS[req.category] || req.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(req.createdAt).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Right conversation box (col 7) */}
            {selectedRequest && (
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden flex flex-col min-h-[600px]">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded">
                        {selectedRequest.requestCode}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        STATUS_LABELS[selectedRequest.status]?.bg || "bg-slate-100"
                      } ${STATUS_LABELS[selectedRequest.status]?.color || "text-slate-700"} ${
                        STATUS_LABELS[selectedRequest.status]?.border || "border-slate-200"
                      }`}>
                        {STATUS_LABELS[selectedRequest.status]?.label || selectedRequest.status}
                      </span>
                      {selectedRequest.assignedToName && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          • Phụ trách: <strong className="text-slate-700">{selectedRequest.assignedToName}</strong>
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">{selectedRequest.title}</h3>
                  </div>

                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Conversation message stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[500px] bg-[#F8FAFC]">
                  {/* Origin info pill */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between font-semibold text-slate-700">
                      <span>Người gửi: Thầy/Cô {selectedRequest.senderName} ({selectedRequest.campusCode || "Sky-Line"})</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(selectedRequest.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    <div className="text-[11px] text-teal-800 bg-teal-50 px-2 py-1 rounded inline-block">
                      Chuyên mục: {CATEGORY_LABELS[selectedRequest.category] || selectedRequest.category}
                    </div>
                  </div>

                  {selectedRequest.messages?.map((msg: any) => {
                    const isTeacher = msg.senderRole === "TEACHER"
                    let msgAttach: any[] = []
                    try {
                      msgAttach = typeof msg.attachments === "string" ? JSON.parse(msg.attachments) : (msg.attachments || [])
                    } catch {}

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isTeacher ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                          <strong className={isTeacher ? "text-teal-700" : "text-[#003B3A]"}>
                            {isTeacher ? "Thầy/Cô" : "Ban KT&ĐBCL"} ({msg.senderName})
                          </strong>
                          <span>• {new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>

                        <div
                          className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm font-normal leading-relaxed shadow-xs ${
                            isTeacher
                              ? "bg-teal-700 text-white rounded-br-xs"
                              : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs"
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{msg.content}</div>

                          {msgAttach.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-white/20 space-y-1.5">
                              <span className="text-[10px] uppercase font-bold opacity-80 block">Tệp đính kèm:</span>
                              {msgAttach.map((att: any, idx: number) => (
                                <a
                                  key={idx}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs underline font-medium ${
                                    isTeacher ? "bg-white/10 hover:bg-white/20 text-white" : "bg-slate-100 hover:bg-slate-200 text-teal-800"
                                  }`}
                                >
                                  <Paperclip className="w-3.5 h-3.5" />
                                  <span className="truncate">{att.name || `Tài liệu ${idx + 1}`}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Rating or Reopen section if RESOLVED */}
                {(selectedRequest.status === "RESOLVED" || selectedRequest.status === "CLOSED") && (
                  <div className="p-4 bg-emerald-50/70 border-t border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Yêu cầu này đã được đánh dấu hoàn tất.
                      </span>

                      <button
                        onClick={() => setIsReopenModalOpen(true)}
                        className="text-xs text-slate-700 hover:text-slate-900 underline font-medium flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Mở lại yêu cầu nếu cần
                      </button>
                    </div>

                    {!selectedRequest.rating ? (
                      <div className="bg-white p-3 rounded-xl border border-emerald-200/80 space-y-2">
                        <span className="text-xs text-slate-700 font-semibold block">
                          Thầy/Cô đánh giá mức độ hài lòng với hỗ trợ này:
                        </span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRatingStars(star)}
                              className="p-1 cursor-pointer hover:scale-110 transition-transform"
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  star <= ratingStars ? "text-amber-400 fill-amber-400" : "text-slate-300"
                                }`}
                              />
                            </button>
                          ))}
                          <span className="text-xs font-bold text-amber-600 ml-2">
                            {ratingStars === 5 ? "Rất hài lòng" : ratingStars === 4 ? "Hài lòng" : "Bình thường"}
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="Ý kiến đóng góp thêm (không bắt buộc)..."
                          value={ratingFeedback}
                          onChange={e => setRatingFeedback(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200"
                        />
                        <button
                          onClick={handleRateRequest}
                          disabled={submittingRating}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                        >
                          {submittingRating ? "Đang lưu..." : "Gửi đánh giá"}
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-emerald-800 flex items-center gap-1">
                        <span>Đã đánh giá:</span>
                        <div className="flex items-center text-amber-500">
                          {Array.from({ length: selectedRequest.rating }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                          ))}
                        </div>
                        {selectedRequest.ratingFeedback && <span className="italic">"{selectedRequest.ratingFeedback}"</span>}
                      </div>
                    )}
                  </div>
                )}

                {/* Reply box (Active when not CLOSED) */}
                {selectedRequest.status !== "CLOSED" && (
                  <form onSubmit={handleSendReply} className="p-3 bg-white border-t border-slate-200 space-y-2">
                    {replyAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {replyAttachments.map((f, i) => (
                          <span key={i} className="px-2 py-1 bg-slate-100 rounded-md flex items-center gap-1 text-slate-700">
                            <Paperclip className="w-3 h-3 text-teal-600" />
                            <span className="truncate max-w-[120px]">{f.name}</span>
                            <button
                              type="button"
                              onClick={() => setReplyAttachments(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-red-500 ml-1"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <label className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-teal-700 transition-colors cursor-pointer shrink-0">
                        <Paperclip className="w-4 h-4" />
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={e => handleFileUpload(e, true)}
                          disabled={uploadingFile}
                        />
                      </label>

                      <input
                        type="text"
                        placeholder="Nhập nội dung phản hồi gửi Ban KT&ĐBCL..."
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                      />

                      <button
                        type="submit"
                        disabled={sendingReply || (!replyText.trim() && replyAttachments.length === 0)}
                        className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#004D40] disabled:bg-slate-200 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {sendingReply ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Gửi</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BẢNG TIN NGHIỆP VỤ */}
      {activeTab === "announcements" && (
        <div className="space-y-4">
          {/* Category filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setAnnouncementCategory("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                announcementCategory === "ALL"
                  ? "bg-[#003B3A] text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Tất cả thông báo
            </button>
            {Object.entries(ANNOUNCEMENT_CATEGORY_LABELS).map(([cat, label]) => (
              <button
                key={cat}
                onClick={() => setAnnouncementCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  announcementCategory === cat
                    ? "bg-[#003B3A] text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Announcements list */}
          {loadingAnnouncements ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
              Đang tải bảng tin nghiệp vụ...
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
              Hiện chưa có thông báo nghiệp vụ nào trong mục này.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {announcements.map(ann => (
                <div
                  key={ann.id}
                  onClick={() => handleOpenAnnouncement(ann)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                    !ann.isRead
                      ? "bg-white border-amber-300 shadow-sm ring-1 ring-amber-400/30"
                      : "bg-white border-slate-200 hover:border-teal-300 hover:shadow-xs"
                  }`}
                >
                  {!ann.isRead && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[9px] uppercase tracking-wider">
                      Mới / Chưa đọc
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {ann.code}
                      </span>
                      <span className="text-slate-400">
                        {new Date(ann.publishedAt).toLocaleDateString("vi-VN")}
                      </span>
                      {ann.priority === "URGENT" && (
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">Khẩn</span>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">{ann.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed font-normal">{ann.content}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-4 mt-3 border-t border-slate-100">
                    <span className="text-[11px] text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md font-semibold">
                      {ANNOUNCEMENT_CATEGORY_LABELS[ann.category] || ann.category}
                    </span>

                    <span className="text-teal-700 font-bold flex items-center gap-1 text-[11px] hover:underline">
                      Xem chi tiết <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: KHO TRI THỨC & FAQ */}
      {activeTab === "knowledge" && (
        <div className="space-y-4">
          {/* Search Knowledge Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm nhanh câu trả lời: mở sổ điểm, quy chế khảo thí, phúc khảo, làm tròn điểm, dự giờ..."
                value={knowledgeSearch}
                onChange={e => setKnowledgeSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1">
              <span className="text-slate-400 font-medium shrink-0">Chủ đề:</span>
              {[
                { id: "ALL", label: "Tất cả" },
                { id: "SO_DIEM", label: "Sổ điểm & Đánh giá" },
                { id: "KHAO_THI", label: "Khảo thí & Đề thi" },
                { id: "DU_GIO", label: "Dự giờ tiết dạy" },
                { id: "DGNL", label: "Đánh giá năng lực Radar" }
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => setKnowledgeCategory(c.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    knowledgeCategory === c.id
                      ? "bg-teal-50 text-teal-800 border border-teal-200"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Knowledge items accordion */}
          {loadingKnowledge ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
              Đang tải kho tri thức...
            </div>
          ) : knowledgeItems.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
              Không tìm thấy bài viết phù hợp. Thầy/Cô có thể bấm "Gửi yêu cầu hỗ trợ" để chuyên viên giải đáp trực tiếp.
            </div>
          ) : (
            <div className="space-y-3">
              {knowledgeItems.map(item => {
                const isExpanded = expandedFaqId === item.id
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs transition-all"
                  >
                    <div
                      onClick={() => setExpandedFaqId(isExpanded ? null : item.id)}
                      className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                          <HelpCircle className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">{item.title}</span>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-90 text-teal-700" : ""}`}
                      />
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-3 text-xs leading-relaxed text-slate-700">
                        <div className="font-semibold text-teal-900 bg-teal-50/80 p-2.5 rounded-lg border border-teal-100">
                          Hỏi: {item.question}
                        </div>
                        <div className="whitespace-pre-wrap pl-1">{item.answer}</div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-[11px] text-slate-400">
                          <span className="italic">Chuyên mục: {item.category}</span>
                          <button
                            onClick={async () => {
                              try {
                                await fetch("/api/ktdbcl/connect/knowledge", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: item.id, type: "USEFUL" })
                                })
                                item.usefulCount++
                              } catch {}
                            }}
                            className="flex items-center gap-1.5 text-teal-700 hover:text-teal-800 font-bold bg-white px-2.5 py-1 rounded-md border border-slate-200 hover:bg-teal-50 transition-colors"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" /> Hữu ích ({item.usefulCount || 0})
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: TẠO YÊU CẦU HỖ TRỢ MỚI */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Gửi Yêu Cầu Hỗ Trợ / Trao Đổi</h3>
                  <span className="text-[11px] text-slate-400">Ban Khảo thí & Đảm bảo Chất lượng</span>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Chuyên mục cần hỗ trợ:</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tiêu đề vướng mắc / yêu cầu:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Cần mở lại sổ điểm môn Toán 10A1 do nhập nhầm cột kiểm tra..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mức độ ưu tiên:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "NORMAL", label: "Bình thường" },
                    { id: "HIGH", label: "Cần sớm" },
                    { id: "URGENT", label: "Khẩn cấp" }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewPriority(p.id)}
                      className={`p-2 rounded-xl text-center font-bold border transition-colors cursor-pointer ${
                        newPriority === p.id
                          ? "bg-teal-50 border-teal-600 text-teal-800"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nội dung chi tiết & minh chứng (nếu có):</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Mô tả cụ thể tên lớp, học sinh, điểm số, thắc mắc để chuyên viên xử lý ngay..."
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                />
              </div>

              {/* Attachments Upload */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Đính kèm hình ảnh hoặc tài liệu:</label>
                <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 hover:border-teal-500 cursor-pointer bg-slate-50 hover:bg-teal-50/50 transition-colors">
                  <Paperclip className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600 font-medium">Tải tệp đính kèm (Ảnh chụp màn hình, bài thi, PDF)</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={e => handleFileUpload(e, false)}
                    disabled={uploadingFile}
                  />
                </label>

                {newAttachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {newAttachments.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-100 text-[11px]">
                        <span className="truncate">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setNewAttachments(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-red-500 font-bold px-1"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest || uploadingFile}
                  className="px-5 py-2.5 rounded-xl bg-[#003B3A] hover:bg-[#004D40] text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {submittingRequest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Gửi yêu cầu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: XEM CHI TIẾT THÔNG BÁO */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {selectedAnnouncement.code}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(selectedAnnouncement.publishedAt).toLocaleDateString("vi-VN")}
                  </span>
                  <span className="text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded font-semibold">
                    {ANNOUNCEMENT_CATEGORY_LABELS[selectedAnnouncement.category] || selectedAnnouncement.category}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base leading-snug">{selectedAnnouncement.title}</h3>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed text-slate-800 whitespace-pre-wrap font-normal">
              {selectedAnnouncement.content}

              {selectedAnnouncement.attachments?.length > 0 && (
                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <span className="font-bold text-slate-700 text-xs block">Tài liệu, biểu mẫu đính kèm:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedAnnouncement.attachments.map((f: any, i: number) => (
                      <a
                        key={i}
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-800 transition-colors text-xs"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                          <span className="truncate">{f.name || `Tệp ${i + 1}`}</span>
                        </span>
                        <Download className="w-4 h-4 text-slate-400 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 italic">Ban Khảo thí & Đảm bảo Chất lượng Sky-Line</span>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MỞ LẠI YÊU CẦU */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Mở lại yêu cầu xử lý</h3>
            <p className="text-xs text-slate-500">
              Thầy/Cô vui lòng nhập lý do hoặc thông tin cần Ban KT&ĐBCL hỗ trợ bổ sung:
            </p>
            <textarea
              rows={3}
              value={reopenReason}
              onChange={e => setReopenReason(e.target.value)}
              placeholder="Nhập lý do cần hỗ trợ thêm..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsReopenModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleReopenRequest}
                disabled={submittingReopen}
                className="px-4 py-1.5 rounded-lg bg-[#003B3A] text-white text-xs font-bold"
              >
                {submittingReopen ? "Đang xử lý..." : "Xác nhận mở lại"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
