"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  MessageSquare,
  Bell,
  HelpCircle,
  BarChart3,
  Search,
  Filter,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Send,
  Paperclip,
  Eye,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  X,
  FileText,
  Building2,
  Users,
  ShieldCheck,
  ExternalLink,
  Star,
  Check,
  ChevronRight,
  TrendingUp,
  Download
} from "lucide-react"
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  ANNOUNCEMENT_CATEGORY_LABELS
} from "@/lib/ktdbcl/connectService"

export default function AdminKtdbclConnectPage() {
  const searchParams = useSearchParams()
  const initialTab = searchParams?.get("tab") || "tickets"
  const initialRequestId = searchParams?.get("requestId") || ""

  const [activeTab, setActiveTab] = useState<"tickets" | "announcements" | "knowledge" | "dashboard">(
    initialTab === "announcements" ? "announcements" : initialTab === "knowledge" ? "knowledge" : initialTab === "dashboard" ? "dashboard" : "tickets"
  )

  // 1. Tickets State
  const [requests, setRequests] = useState<any[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [campusFilter, setCampusFilter] = useState("ALL")
  const [categoryFilter, setCategoryFilter] = useState("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Reply message & AI Copilot in detail
  const [replyText, setReplyText] = useState("")
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [replyAttachments, setReplyAttachments] = useState<any[]>([])
  const [sendingReply, setSendingReply] = useState(false)
  const [generatingAi, setGeneratingAi] = useState(false)

  // Assignment modal
  const [assigneeName, setAssigneeName] = useState("")
  const [assigneeId, setAssigneeId] = useState("")
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)

  // 2. Announcements State
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false)
  const [isCreateAnnouncementOpen, setIsCreateAnnouncementOpen] = useState(false)
  const [newAnnTitle, setNewAnnTitle] = useState("")
  const [newAnnCategory, setNewAnnCategory] = useState("THONG_BAO_CHUNG")
  const [newAnnPriority, setNewAnnPriority] = useState("NORMAL")
  const [newAnnScope, setNewAnnScope] = useState("ALL")
  const [newAnnCampusIds, setNewAnnCampusIds] = useState<string[]>(["ALL"])
  const [newAnnContent, setNewAnnContent] = useState("")
  const [newAnnPinned, setNewAnnPinned] = useState(false)
  const [newAnnAttachments, setNewAnnAttachments] = useState<any[]>([])
  const [submittingAnn, setSubmittingAnn] = useState(false)
  const [viewingReadersAnn, setViewingReadersAnn] = useState<any>(null)

  // 3. Knowledge Base State
  const [knowledgeItems, setKnowledgeItems] = useState<any[]>([])
  const [loadingKnowledge, setLoadingKnowledge] = useState(false)
  const [knowledgeSearch, setKnowledgeSearch] = useState("")
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false)
  const [editingKnowledgeId, setEditingKnowledgeId] = useState<string | null>(null)
  const [kbTitle, setKbTitle] = useState("")
  const [kbCategory, setKbCategory] = useState("SO_DIEM")
  const [kbQuestion, setKbQuestion] = useState("")
  const [kbAnswer, setKbAnswer] = useState("")
  const [kbKeywords, setKbKeywords] = useState("")
  const [submittingKb, setSubmittingKb] = useState(false)

  // 4. Dashboard Stats
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loadingDashboard, setLoadingDashboard] = useState(false)

  // Upload file
  const [uploadingFile, setUploadingFile] = useState(false)

  // Load Requests
  const loadRequests = async () => {
    try {
      setLoadingRequests(true)
      const res = await fetch(
        `/api/ktdbcl/connect/requests?status=${statusFilter}&campusId=${campusFilter}&category=${categoryFilter}&search=${encodeURIComponent(searchQuery)}`
      )
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
    if (activeTab === "tickets") {
      loadRequests()
    }
  }, [activeTab, statusFilter, campusFilter, categoryFilter, searchQuery])

  // Load Detail
  const handleSelectRequest = async (id: string) => {
    try {
      setLoadingDetail(true)
      const res = await fetch(`/api/ktdbcl/connect/requests/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedRequest(data.request)
      }
    } catch (err) {
      console.error("Error loading detail:", err)
    } finally {
      setLoadingDetail(false)
    }
  }

  useEffect(() => {
    if (initialRequestId) {
      handleSelectRequest(initialRequestId)
    }
  }, [initialRequestId])

  // Load Announcements
  const loadAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true)
      const res = await fetch("/api/ktdbcl/connect/announcements")
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
  }, [activeTab])

  // Load Knowledge
  const loadKnowledge = async () => {
    try {
      setLoadingKnowledge(true)
      const res = await fetch(`/api/ktdbcl/connect/knowledge?search=${encodeURIComponent(knowledgeSearch)}`)
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
  }, [activeTab, knowledgeSearch])

  // Load Dashboard
  const loadDashboard = async () => {
    try {
      setLoadingDashboard(true)
      const res = await fetch("/api/ktdbcl/connect/dashboard")
      if (res.ok) {
        const data = await res.json()
        setDashboardData(data)
      }
    } catch (err) {
      console.error("Error loading dashboard:", err)
    } finally {
      setLoadingDashboard(false)
    }
  }

  useEffect(() => {
    if (activeTab === "dashboard") {
      loadDashboard()
    }
  }, [activeTab])

  // Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: "reply" | "ann") => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingFile(true)
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append("file", file)
      try {
        const res = await fetch("/api/ktdbcl/connect/upload", { method: "POST", body: formData })
        if (res.ok) {
          const data = await res.json()
          if (data.file) {
            if (target === "reply") setReplyAttachments(prev => [...prev, data.file])
            else setNewAnnAttachments(prev => [...prev, data.file])
          }
        }
      } catch (err) {
        console.error("Upload error:", err)
      }
    }
    setUploadingFile(false)
    e.target.value = ""
  }

  // Send Reply
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
          isInternalNote
        })
      })
      if (res.ok) {
        setReplyText("")
        setReplyAttachments([])
        setIsInternalNote(false)
        handleSelectRequest(selectedRequest.id)
        loadRequests()
      }
    } catch (err) {
      console.error("Send reply error:", err)
    } finally {
      setSendingReply(false)
    }
  }

  // AI Suggest Response
  const handleGenerateAiResponse = async () => {
    if (!selectedRequest) return
    setGeneratingAi(true)
    try {
      const res = await fetch("/api/ktdbcl/connect/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: selectedRequest.id })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.draft) {
          setReplyText(data.draft)
          setIsInternalNote(false)
        }
      }
    } catch (err) {
      console.error("AI suggest error:", err)
    } finally {
      setGeneratingAi(false)
    }
  }

  // Change Status
  const handleChangeStatus = async (newStatus: string) => {
    if (!selectedRequest) return
    try {
      const res = await fetch(`/api/ktdbcl/connect/requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_STATUS",
          status: newStatus
        })
      })
      if (res.ok) {
        handleSelectRequest(selectedRequest.id)
        loadRequests()
      }
    } catch (err) {
      console.error("Change status error:", err)
    }
  }

  // Assign Specialist
  const handleAssignSpecialist = async () => {
    if (!selectedRequest || !assigneeName.trim()) return
    try {
      const res = await fetch(`/api/ktdbcl/connect/requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN",
          assignedToId: assigneeId || null,
          assignedToName: assigneeName.trim()
        })
      })
      if (res.ok) {
        setIsAssignModalOpen(false)
        handleSelectRequest(selectedRequest.id)
        loadRequests()
      }
    } catch (err) {
      console.error("Assign error:", err)
    }
  }

  // Create Announcement
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return

    setSubmittingAnn(true)
    try {
      const res = await fetch("/api/ktdbcl/connect/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newAnnTitle,
          content: newAnnContent,
          category: newAnnCategory,
          priority: newAnnPriority,
          targetScope: newAnnScope,
          targetCampusIds: newAnnCampusIds,
          pinned: newAnnPinned,
          attachments: newAnnAttachments
        })
      })
      if (res.ok) {
        setIsCreateAnnouncementOpen(false)
        setNewAnnTitle("")
        setNewAnnContent("")
        setNewAnnAttachments([])
        loadAnnouncements()
      }
    } catch (err) {
      console.error("Create announcement error:", err)
    } finally {
      setSubmittingAnn(false)
    }
  }

  // Create / Update Knowledge Item
  const handleSaveKnowledge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kbTitle.trim() || !kbQuestion.trim() || !kbAnswer.trim()) return

    setSubmittingKb(true)
    try {
      const url = "/api/ktdbcl/connect/knowledge"
      const method = editingKnowledgeId ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingKnowledgeId,
          title: kbTitle,
          category: kbCategory,
          question: kbQuestion,
          answer: kbAnswer,
          keywords: kbKeywords
        })
      })
      if (res.ok) {
        setIsKnowledgeModalOpen(false)
        setEditingKnowledgeId(null)
        setKbTitle("")
        setKbQuestion("")
        setKbAnswer("")
        setKbKeywords("")
        loadKnowledge()
      }
    } catch (err) {
      console.error("Save knowledge error:", err)
    } finally {
      setSubmittingKb(false)
    }
  }

  const handleDeleteKnowledge = async (id: string) => {
    if (!confirm("Thầy/Cô có chắc chắn muốn xóa bài viết hướng dẫn này?")) return
    try {
      const res = await fetch(`/api/ktdbcl/connect/knowledge?id=${id}`, { method: "DELETE" })
      if (res.ok) loadKnowledge()
    } catch (err) {
      console.error("Delete knowledge error:", err)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#003B3A] via-[#004D40] to-[#0A5C55] text-white p-6 sm:p-8 shadow-xl border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-teal-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>BAN KHẢO THÍ & ĐẢM BẢO CHẤT LƯỢNG • TRUNG TÂM ĐIỀU HÀNH</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              KT&ĐBCL Connect – Quản Trị & Hỗ Trợ
            </h1>
            <p className="text-sm text-teal-100/90 leading-relaxed font-normal max-w-3xl">
              Không gian quản lý tiếp nhận yêu cầu, điều phối phân công chuyên viên, giải đáp thắc mắc chuyên môn và phát hành thông báo nghiệp vụ toàn hệ thống Sky-Line.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeTab === "announcements" && (
              <button
                onClick={() => setIsCreateAnnouncementOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Phát hành thông báo mới</span>
              </button>
            )}
            {activeTab === "knowledge" && (
              <button
                onClick={() => {
                  setEditingKnowledgeId(null)
                  setKbTitle("")
                  setKbQuestion("")
                  setKbAnswer("")
                  setKbKeywords("")
                  setIsKnowledgeModalOpen(true)
                }}
                className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Thêm hướng dẫn / FAQ</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          onClick={() => { setActiveTab("tickets"); setSelectedRequest(null); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "tickets"
              ? "bg-[#003B3A] text-white shadow-md shadow-teal-900/10"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Tiếp nhận & Xử lý Yêu cầu</span>
          {requests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
              {requests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("announcements")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "announcements"
              ? "bg-[#003B3A] text-white shadow-md shadow-teal-900/10"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Thông báo Nghiệp vụ</span>
        </button>

        <button
          onClick={() => setActiveTab("knowledge")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "knowledge"
              ? "bg-[#003B3A] text-white shadow-md shadow-teal-900/10"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Kho Tri thức & FAQ</span>
        </button>

        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "dashboard"
              ? "bg-[#003B3A] text-white shadow-md shadow-teal-900/10"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Dashboard & Báo cáo SLA</span>
        </button>
      </div>

      {/* 3. Tab Contents */}

      {/* TAB 1: TICKETS / INBOX */}
      {activeTab === "tickets" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo mã yêu cầu, giáo viên, tiêu đề..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Cơ sở Filter */}
                <select
                  value={campusFilter}
                  onChange={e => setCampusFilter(e.target.value)}
                  className="p-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  <option value="ALL">Tất cả Cơ sở</option>
                  <option value="CS1">CS1</option>
                  <option value="CS2">CS2</option>
                  <option value="CS3">CS3</option>
                  <option value="CS4">CS4</option>
                  <option value="CS5">CS5</option>
                </select>

                {/* Chuyên mục Filter */}
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="p-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  <option value="ALL">Tất cả Chuyên mục</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-400 font-medium shrink-0">Trạng thái:</span>
              {[
                { id: "ALL", label: "Tất cả" },
                { id: "NEW", label: "Mới tiếp nhận" },
                { id: "IN_PROGRESS", label: "Đang xử lý" },
                { id: "ANSWERED", label: "Đã phản hồi" },
                { id: "RESOLVED", label: "Hoàn tất" }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    statusFilter === st.id
                      ? "bg-teal-50 text-teal-800 border border-teal-200"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* List + Conversation Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Table / List */}
            <div className={`${selectedRequest ? "lg:col-span-5" : "lg:col-span-12"} space-y-3`}>
              {loadingRequests ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
                  Đang tải danh sách yêu cầu...
                </div>
              ) : requests.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                  Không tìm thấy yêu cầu nào theo điều kiện lọc.
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
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {req.requestCode}
                          </span>
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {req.campusCode || "CS1"}
                          </span>
                          {req.priority === "URGENT" && (
                            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">
                              Khẩn
                            </span>
                          )}
                        </div>

                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm mb-1 line-clamp-1">{req.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-2 mb-2.5 font-normal leading-relaxed">{req.content}</p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                        <span className="font-medium text-slate-600">
                          Thầy/Cô: <strong className="text-slate-800">{req.senderName}</strong>
                        </span>
                        <span>{new Date(req.createdAt).toLocaleDateString("vi-VN")}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Detail Drawer */}
            {selectedRequest && (
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col min-h-[650px]">
                {/* Detail Header */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded">
                        {selectedRequest.requestCode}
                      </span>
                      <span className="text-xs font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                        {selectedRequest.campusCode || "Hệ thống"}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        STATUS_LABELS[selectedRequest.status]?.bg || "bg-slate-100"
                      } ${STATUS_LABELS[selectedRequest.status]?.color || "text-slate-700"} ${
                        STATUS_LABELS[selectedRequest.status]?.border || "border-slate-200"
                      }`}>
                        {STATUS_LABELS[selectedRequest.status]?.label || selectedRequest.status}
                      </span>
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

                {/* Operations Bar (Assign & Status) */}
                <div className="px-4 py-3 bg-teal-50/40 border-b border-teal-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Chuyên viên phụ trách:</span>
                    <strong className="text-slate-800">
                      {selectedRequest.assignedToName || "Chưa phân công"}
                    </strong>
                    <button
                      onClick={() => {
                        setAssigneeName(selectedRequest.assignedToName || "")
                        setIsAssignModalOpen(true)
                      }}
                      className="px-2 py-1 rounded bg-teal-100 hover:bg-teal-200 text-teal-800 font-bold transition-colors"
                    >
                      Phân công
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Đổi trạng thái:</span>
                    <select
                      value={selectedRequest.status}
                      onChange={e => handleChangeStatus(e.target.value)}
                      className="p-1.5 rounded-lg border border-slate-300 font-bold text-slate-700 text-xs bg-white"
                    >
                      <option value="NEW">Mới tiếp nhận</option>
                      <option value="IN_PROGRESS">Đang xử lý</option>
                      <option value="ANSWERED">Đã phản hồi</option>
                      <option value="RESOLVED">Hoàn tất</option>
                      <option value="CLOSED">Đóng yêu cầu</option>
                    </select>
                  </div>
                </div>

                {/* Conversation Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[500px] bg-[#F8FAFC]">
                  {/* Sender details pill */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>Người gửi: Thầy/Cô {selectedRequest.senderName}</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {new Date(selectedRequest.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                      <div>Cơ sở: <strong>{selectedRequest.campusCode || "CS1"}</strong></div>
                      <div>Tổ bộ môn: <strong>{selectedRequest.departmentName || "Chưa xác định"}</strong></div>
                      <div>Email: <strong>{selectedRequest.senderEmail || "N/A"}</strong></div>
                      <div>Điện thoại: <strong>{selectedRequest.senderPhone || "N/A"}</strong></div>
                    </div>
                  </div>

                  {selectedRequest.messages?.map((msg: any) => {
                    const isSpecialist = msg.senderRole === "SPECIALIST"
                    const isInternal = msg.isInternalNote
                    let msgAttach: any[] = []
                    try {
                      msgAttach = typeof msg.attachments === "string" ? JSON.parse(msg.attachments) : (msg.attachments || [])
                    } catch {}

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isSpecialist ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                          {isInternal && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                              Ghi chú nội bộ KT&ĐBCL
                            </span>
                          )}
                          <strong className={isSpecialist ? "text-[#003B3A]" : "text-teal-700"}>
                            {msg.senderName} ({msg.senderRole})
                          </strong>
                          <span>• {new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>

                        <div
                          className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm font-normal leading-relaxed shadow-xs ${
                            isInternal
                              ? "bg-amber-50 border border-amber-300 text-amber-950 rounded-br-xs"
                              : isSpecialist
                              ? "bg-[#003B3A] text-white rounded-br-xs"
                              : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs"
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{msg.content}</div>

                          {msgAttach.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-white/20 space-y-1">
                              <span className="text-[10px] uppercase font-bold opacity-80 block">Tệp đính kèm:</span>
                              {msgAttach.map((att: any, idx: number) => (
                                <a
                                  key={idx}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs underline font-medium ${
                                    isSpecialist && !isInternal ? "bg-white/10 hover:bg-white/20 text-white" : "bg-slate-100 hover:bg-slate-200 text-teal-800"
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
                </div>

                {/* Reply Form with AI Copilot */}
                <form onSubmit={handleSendReply} className="p-3.5 bg-white border-t border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInternalNote}
                          onChange={e => setIsInternalNote(e.target.checked)}
                          className="rounded text-teal-700 focus:ring-teal-500"
                        />
                        <span>Ghi chú nội bộ (Giáo viên không thấy)</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateAiResponse}
                      disabled={generatingAi}
                      className="px-3 py-1 rounded-lg bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 text-teal-800 text-xs font-bold flex items-center gap-1.5 hover:bg-teal-100 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>{generatingAi ? "AI đang soạn..." : "AI Đề xuất câu trả lời"}</span>
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    placeholder={
                      isInternalNote
                        ? "Nhập ghi chú thảo luận nội bộ giữa các chuyên viên KT&ĐBCL..."
                        : "Nhập nội dung phản hồi chính thức cho Giáo viên..."
                    }
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 leading-relaxed font-normal"
                  />

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <label className="flex items-center gap-1 text-xs text-slate-500 hover:text-teal-700 cursor-pointer font-medium">
                      <Paperclip className="w-4 h-4" />
                      <span>Đính kèm tệp</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={e => handleFileUpload(e, "reply")}
                        disabled={uploadingFile}
                      />
                    </label>

                    {replyAttachments.length > 0 && (
                      <span className="text-xs text-teal-700 font-medium">
                        Đã chọn {replyAttachments.length} tệp
                      </span>
                    )}

                    <button
                      type="submit"
                      disabled={sendingReply || (!replyText.trim() && replyAttachments.length === 0)}
                      className="px-5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#004D40] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {sendingReply ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Gửi phản hồi</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ANNOUNCEMENTS */}
      {activeTab === "announcements" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Danh sách Thông báo Nghiệp vụ Khảo thí & ĐBCL</h2>
            <button
              onClick={() => setIsCreateAnnouncementOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#004D40] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo thông báo mới</span>
            </button>
          </div>

          {loadingAnnouncements ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
              Đang tải danh sách thông báo...
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
              Chưa có thông báo nào được phát hành.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {announcements.map(ann => (
                <div key={ann.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {ann.code}
                        </span>
                        <span className="text-slate-400">{new Date(ann.publishedAt).toLocaleDateString("vi-VN")}</span>
                      </div>
                      <span className="text-teal-800 bg-teal-50 px-2 py-0.5 rounded font-semibold text-[10px]">
                        {ANNOUNCEMENT_CATEGORY_LABELS[ann.category] || ann.category}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{ann.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed font-normal">{ann.content}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Eye className="w-3.5 h-3.5 text-teal-600" />
                      <span>{ann.readCount || 0} người đã đọc</span>
                    </div>

                    {ann.readers && ann.readers.length > 0 && (
                      <button
                        onClick={() => setViewingReadersAnn(ann)}
                        className="text-teal-700 hover:text-teal-800 font-bold text-xs underline"
                      >
                        Chi tiết người đọc
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: KNOWLEDGE BASE */}
      {activeTab === "knowledge" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm bài viết hướng dẫn..."
                value={knowledgeSearch}
                onChange={e => setKnowledgeSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200"
              />
            </div>

            <button
              onClick={() => {
                setEditingKnowledgeId(null)
                setKbTitle("")
                setKbQuestion("")
                setKbAnswer("")
                setKbKeywords("")
                setIsKnowledgeModalOpen(true)
              }}
              className="px-4 py-2 rounded-xl bg-[#003B3A] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Hướng dẫn mới</span>
            </button>
          </div>

          {loadingKnowledge ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
              Đang tải kho tri thức...
            </div>
          ) : knowledgeItems.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
              Chưa có bài viết hướng dẫn nào.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {knowledgeItems.map(item => (
                <div key={item.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold text-[10px]">
                        {item.category}
                      </span>
                      <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                        <span>Xem: {item.viewCount || 0}</span>
                        <span>•</span>
                        <span>Hữu ích: {item.usefulCount || 0}</span>
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{item.title}</h3>
                    <div className="text-xs text-teal-900 bg-teal-50/70 p-2 rounded-lg font-medium">
                      Q: {item.question}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed font-normal">{item.answer}</p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setEditingKnowledgeId(item.id)
                        setKbTitle(item.title)
                        setKbCategory(item.category)
                        setKbQuestion(item.question)
                        setKbAnswer(item.answer)
                        setKbKeywords(item.keywords || "")
                        setIsKnowledgeModalOpen(true)
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-teal-700"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteKnowledge(item.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DASHBOARD & SLA METRICS */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {loadingDashboard ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
              Đang tải chỉ số Dashboard...
            </div>
          ) : dashboardData ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs text-slate-500 font-medium">Tổng số yêu cầu</span>
                  <div className="text-2xl font-bold text-slate-900">{dashboardData.stats.totalRequests}</div>
                  <span className="text-[11px] text-teal-700 font-semibold">Tất cả các cơ sở</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs text-slate-500 font-medium">Đang xử lý / Mới</span>
                  <div className="text-2xl font-bold text-amber-600">
                    {dashboardData.stats.newCount + dashboardData.stats.inProgressCount}
                  </div>
                  <span className="text-[11px] text-slate-400">Cần phản hồi kịp thời</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs text-slate-500 font-medium">Thời gian xử lý trung bình</span>
                  <div className="text-2xl font-bold text-emerald-600">{dashboardData.stats.avgSlaHours}h</div>
                  <span className="text-[11px] text-emerald-700 font-semibold">Đạt chuẩn SLA &le; 24h</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs text-slate-500 font-medium">Điểm hài lòng (CSAT)</span>
                  <div className="text-2xl font-bold text-amber-500 flex items-center gap-1">
                    {dashboardData.stats.avgRating} <Star className="w-5 h-5 fill-amber-400" />
                  </div>
                  <span className="text-[11px] text-slate-400">{dashboardData.stats.ratedCount} giáo viên đã đánh giá</span>
                </div>
              </div>

              {/* Campus Breakdown & Category Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-teal-600" />
                    Phân bổ yêu cầu theo Cơ sở (CS1 - CS5)
                  </h3>

                  <div className="space-y-3 text-xs">
                    {dashboardData.campusDistribution?.map((item: any) => {
                      const total = dashboardData.stats.totalRequests || 1
                      const pct = Math.round((item.count / total) * 100)
                      return (
                        <div key={item.campus} className="space-y-1">
                          <div className="flex items-center justify-between font-semibold">
                            <span>Cơ sở {item.campus}</span>
                            <span>{item.count} yêu cầu ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-teal-600 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-600" />
                    Phân bổ theo Lĩnh vực / Chuyên mục
                  </h3>

                  <div className="space-y-3 text-xs">
                    {dashboardData.categoryDistribution?.map((item: any) => {
                      const total = dashboardData.stats.totalRequests || 1
                      const pct = Math.round((item.count / total) * 100)
                      return (
                        <div key={item.category} className="space-y-1">
                          <div className="flex items-center justify-between font-semibold">
                            <span>{CATEGORY_LABELS[item.category] || item.category}</span>
                            <span>{item.count} ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Overdue Warning Section */}
              {dashboardData.stats.overdueCount > 0 && (
                <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span>Cảnh báo: Có {dashboardData.stats.overdueCount} yêu cầu quá hạn xử lý (&gt; 48 giờ)</span>
                  </div>
                  <div className="space-y-2">
                    {dashboardData.overdueList?.map((req: any) => (
                      <div
                        key={req.id}
                        onClick={() => {
                          setActiveTab("tickets")
                          handleSelectRequest(req.id)
                        }}
                        className="bg-white p-3 rounded-xl border border-amber-200 flex items-center justify-between text-xs cursor-pointer hover:bg-amber-100/40"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-amber-800">{req.requestCode}</span>
                          <span className="font-bold text-slate-900">{req.title}</span>
                          <span className="text-slate-400">({req.senderName} - {req.campusCode})</span>
                        </div>
                        <span className="text-amber-700 font-bold">Xem xử lý &rarr;</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* MODAL: ASSIGN SPECIALIST */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Phân công Chuyên viên phụ trách</h3>
            <p className="text-xs text-slate-500">Nhập tên hoặc chọn chuyên viên thuộc Ban KT&ĐBCL:</p>
            <input
              type="text"
              placeholder="Tên chuyên viên phụ trách..."
              value={assigneeName}
              onChange={e => setAssigneeName(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAssignSpecialist}
                className="px-4 py-1.5 rounded-lg bg-[#003B3A] text-white text-xs font-bold"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE ANNOUNCEMENT */}
      {isCreateAnnouncementOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Phát Hành Thông Báo Nghiệp Vụ Mới</h3>
              <button onClick={() => setIsCreateAnnouncementOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tiêu đề thông báo:</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tiêu đề thông báo..."
                  value={newAnnTitle}
                  onChange={e => setNewAnnTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Chuyên mục:</label>
                  <select
                    value={newAnnCategory}
                    onChange={e => setNewAnnCategory(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  >
                    {Object.entries(ANNOUNCEMENT_CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mức độ ưu tiên:</label>
                  <select
                    value={newAnnPriority}
                    onChange={e => setNewAnnPriority(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  >
                    <option value="NORMAL">Bình thường</option>
                    <option value="IMPORTANT">Quan trọng</option>
                    <option value="URGENT">Khẩn cấp</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nội dung chi tiết thông báo:</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Soạn nội dung thông báo gửi giáo viên..."
                  value={newAnnContent}
                  onChange={e => setNewAnnContent(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 leading-relaxed font-normal"
                />
              </div>

              {/* Attachments */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Đính kèm tài liệu biểu mẫu:</label>
                <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-slate-300 hover:border-teal-500 cursor-pointer bg-slate-50">
                  <Paperclip className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600 font-medium">Tải tệp đính kèm</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={e => handleFileUpload(e, "ann")}
                    disabled={uploadingFile}
                  />
                </label>
                {newAnnAttachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {newAnnAttachments.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-100 text-[11px]">
                        <span className="truncate">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setNewAnnAttachments(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-red-500 font-bold px-1"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateAnnouncementOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingAnn || uploadingFile}
                  className="px-5 py-2.5 rounded-xl bg-[#003B3A] text-white font-bold"
                >
                  {submittingAnn ? "Đang phát hành..." : "Phát hành thông báo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KNOWLEDGE CREATE/EDIT */}
      {isKnowledgeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingKnowledgeId ? "Chỉnh sửa bài viết hướng dẫn" : "Thêm Hướng Dẫn / FAQ Mới"}
              </h3>
              <button onClick={() => setIsKnowledgeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKnowledge} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tiêu đề nghiệp vụ:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Quy trình xin mở lại sổ điểm sau khi khóa..."
                  value={kbTitle}
                  onChange={e => setNewAnnTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Chuyên mục:</label>
                <select
                  value={kbCategory}
                  onChange={e => setKbCategory(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                >
                  <option value="SO_DIEM">Sổ điểm & Đánh giá</option>
                  <option value="KHAO_THI">Khảo thí & Đề thi</option>
                  <option value="DU_GIO">Dự giờ & Phát triển chuyên môn</option>
                  <option value="DGNL">Đánh giá năng lực Radar</option>
                  <option value="QUY_CHE_CHUNG">Quy chế chung</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Câu hỏi / Tình huống thường gặp:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Làm thế nào khi đã hết hạn nhập điểm định kỳ?"
                  value={kbQuestion}
                  onChange={e => setKbQuestion(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nội dung hướng dẫn chuẩn hóa:</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Nêu rõ các bước, biểu mẫu và quy chế cần tuân thủ..."
                  value={kbAnswer}
                  onChange={e => setKbAnswer(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-normal leading-relaxed"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Từ khóa tìm kiếm (cách nhau bởi dấu phẩy):</label>
                <input
                  type="text"
                  placeholder="mở sổ, sửa điểm, quá hạn..."
                  value={kbKeywords}
                  onChange={e => setKbKeywords(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsKnowledgeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingKb}
                  className="px-5 py-2.5 rounded-xl bg-[#003B3A] text-white font-bold"
                >
                  {submittingKb ? "Đang lưu..." : "Lưu vào Kho tri thức"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW READERS */}
      {viewingReadersAnn && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Danh sách giáo viên đã đọc</h3>
                <span className="text-xs text-slate-400">{viewingReadersAnn.title}</span>
              </div>
              <button onClick={() => setViewingReadersAnn(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 text-xs">
              {viewingReadersAnn.readers?.map((r: any) => (
                <div key={r.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{r.userName || "Giáo viên"}</span>
                    <span className="text-[10px] bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded font-bold">
                      {r.campusCode || "CS1"}
                    </span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    {new Date(r.readAt).toLocaleString("vi-VN")}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingReadersAnn(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
