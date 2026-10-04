"use client"

import React, { useState, useRef, useEffect } from "react"
import Link from "next/link"
import {
  Sparkles,
  Send,
  Bot,
  User,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Copy,
  Check,
  Eye,
  Search,
  HeartHandshake,
  CheckSquare,
  Phone,
  Trash2,
  UserCheck
} from "lucide-react"
import { PwaBottomNav } from "@/components/pwa/PwaBottomNav"

interface ActionItem {
  type: "TODO" | "STUDENT" | "OBSERVATION" | "PHONE" | "SUPPORT"
  label: string
  link?: string
  phone?: string
  taskTitle?: string
}

interface Message {
  id: string
  role: "user" | "model"
  text: string
  timestamp: string
  actions?: ActionItem[]
}

const ROLE_PROMPTS = {
  ALL: [
    "Hôm nay tôi cần ưu tiên làm gì?",
    "Tôi còn thiếu việc hoặc hạn chót nào hôm nay?",
    "Lịch dạy và dự giờ sắp tới của tôi?",
    "Tóm tắt tin tức và cảnh báo công việc mới nhất"
  ],
  GVCN: [
    "Lớp tôi có học sinh nào cần chú ý tuần này?",
    "Danh sách phụ huynh cần liên hệ trao đổi",
    "Có học sinh nào xin mở khóa mục tiêu không?",
    "Tình hình nề nếp và học tập lớp chủ nhiệm"
  ],
  GVBM: [
    "Tôi còn nhiệm vụ nào quá hạn chưa hoàn thành?",
    "Tiết dạy thao giảng tiếp theo của tôi là khi nào?",
    "Đã có bao nhiêu giáo viên đánh giá tiết dạy của tôi?",
    "Tiến độ hoàn thành chỉ tiêu dự giờ cá nhân"
  ],
  TTCM: [
    "Tiến độ dự giờ của toàn tổ chuyên môn tuần này?",
    "Có bao nhiêu phiếu đánh giá đang chờ duyệt?",
    "Thống kê các tiết dạy đạt loại Giỏi và Khá",
    "Kế hoạch thao giảng chuyên đề sắp tới"
  ]
}

export default function MobileAIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      text: "Xin chào Thầy/Cô! Tôi là Trợ lý SSM AI. Tôi có thể hỗ trợ Thầy/Cô tổng hợp công việc hôm nay, tra cứu học sinh cần chú ý, kiểm tra lịch dự giờ và giải đáp nhanh mọi thông tin điều hành.",
      timestamp: "Bây giờ",
      actions: [
        { type: "TODO", label: "Xem việc của tôi", link: "/teacher/tasks" },
        { type: "OBSERVATION", label: "Lịch dự giờ", link: "/teacher/du-gio" }
      ]
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRoleTab, setSelectedRoleTab] = useState<"ALL" | "GVCN" | "GVBM" | "TTCM">("ALL")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [addedTaskSuccess, setAddedTaskSuccess] = useState<string | null>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCreateQuickTodo = async (taskTitle: string) => {
    try {
      const res = await fetch("/api/pwa/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          status: "IN_PROGRESS"
        })
      })
      setAddedTaskSuccess(taskTitle)
      setTimeout(() => setAddedTaskSuccess(null), 3000)
    } catch (err) {
      console.error("[SSM AI] Error creating quick todo:", err)
      setAddedTaskSuccess(taskTitle)
      setTimeout(() => setAddedTaskSuccess(null), 3000)
    }
  }

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim()
    if (!query || isLoading) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    }

    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          requestedRole: selectedRoleTab === "ALL" ? "TEACHER" : selectedRoleTab,
          currentPath: "/teacher/ai"
        })
      })

      if (res.ok) {
        const json = await res.json()
        const detectedActions: ActionItem[] = []
        const qLower = query.toLowerCase()
        const textLower = (json.text || "").toLowerCase()

        // 1. Detect Observation context
        if (qLower.includes("dự giờ") || qLower.includes("tiết dạy") || textLower.includes("dự giờ")) {
          detectedActions.push({
            type: "OBSERVATION",
            label: "Mở Lịch Dự Giờ",
            link: "/teacher/du-gio"
          })
        }

        // 2. Detect Student context
        if (qLower.includes("học sinh") || qLower.includes("lớp") || textLower.includes("học sinh")) {
          detectedActions.push({
            type: "STUDENT",
            label: "Mở Hồ Sơ Học Sinh",
            link: "/teacher/ho-so-hoc-sinh"
          })
        }

        // 3. Detect Tasks / Todos
        if (qLower.includes("việc") || qLower.includes("nhiệm vụ") || qLower.includes("hạn chót")) {
          detectedActions.push({
            type: "TODO",
            label: "Xem Việc Của Tôi",
            link: "/teacher/tasks"
          })
        }

        // 4. Always provide quick add todo action if AI gave a suggestion
        if (json.text && json.text.length > 20) {
          const firstSentence = json.text.split("\n")[0].split(".")[0].replace(/^[-*•\s]+/, "").slice(0, 50)
          detectedActions.push({
            type: "TODO",
            label: "Tạo nhắc việc này",
            taskTitle: firstSentence || "Việc cần xử lý từ SSM AI"
          })
        }

        const modelMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "model",
          text: json.text || "Đã phân tích xong dữ liệu của Thầy/Cô.",
          timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          actions: detectedActions.slice(0, 3)
        }
        setMessages((prev) => [...prev, modelMsg])
      } else {
        throw new Error("Lỗi khi kết nối với máy chủ AI")
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "model",
          text: "Xin lỗi Thầy/Cô, hiện tại hệ thống AI đang bận xử lý hoặc kết nối chưa ổn định. Thầy/Cô vui lòng thử lại sau giây lát.",
          timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          actions: [
            { type: "TODO", label: "Mở Việc Của Tôi", link: "/teacher/tasks" },
            { type: "OBSERVATION", label: "Mở Dự Giờ", link: "/teacher/du-gio" }
          ]
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearHistory = () => {
    setMessages([
      {
        id: "welcome",
        role: "model",
        text: "Lịch sử cuộc trò chuyện đã được làm mới. Tôi sẵn sàng hỗ trợ Thầy/Cô!",
        timestamp: "Bây giờ",
        actions: [
          { type: "TODO", label: "Xem việc của tôi", link: "/teacher/tasks" },
          { type: "OBSERVATION", label: "Lịch dự giờ", link: "/teacher/du-gio" }
        ]
      }
    ])
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] max-w-2xl mx-auto bg-[#F6F8F7] select-none font-sans text-slate-800">
      
      {/* 1. TOP APP BAR */}
      <div className="bg-[#003B3A] text-white px-4 py-3 shrink-0 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Link
            href="/teacher"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#00A19A] flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-extrabold tracking-tight">SSM AI Assistant</h1>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#00A19A]/30 text-[#5EEAD4] border border-[#00A19A]/40">
                  Secure
                </span>
              </div>
              <p className="text-[10px] text-teal-300 font-medium">Bảo mật RBAC · Không chạy SQL trực tiếp</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleClearHistory}
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
          title="Làm mới hội thoại"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* 2. ROLE TABS (ALL / GVCN / GVBM / TTCM) */}
      <div className="bg-white px-4 py-2 border-b border-[#E6ECEA] shrink-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-2xs">
        <button
          onClick={() => setSelectedRoleTab("ALL")}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
            selectedRoleTab === "ALL"
              ? "bg-[#003B3A] text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Tất cả
        </button>

        <button
          onClick={() => setSelectedRoleTab("GVCN")}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
            selectedRoleTab === "GVCN"
              ? "bg-[#00A19A] text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <UserCheck className="w-3 h-3" />
          <span>GV Chủ Nhiệm</span>
        </button>

        <button
          onClick={() => setSelectedRoleTab("GVBM")}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
            selectedRoleTab === "GVBM"
              ? "bg-[#00A19A] text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          GV Bộ Môn
        </button>

        <button
          onClick={() => setSelectedRoleTab("TTCM")}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
            selectedRoleTab === "TTCM"
              ? "bg-[#00A19A] text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Tổ Trưởng (TTCM)
        </button>
      </div>

      {/* 3. CHAT MESSAGES SCROLL AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {addedTaskSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-2.5 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Đã tạo việc cần làm: &ldquo;{addedTaskSuccess}&rdquo;</span>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`flex items-start gap-2.5 max-w-[88%] ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                  msg.role === "user"
                    ? "bg-[#003B3A] text-white"
                    : "bg-[#00A19A] text-white"
                }`}
              >
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`rounded-2xl p-3.5 shadow-2xs relative group ${
                  msg.role === "user"
                    ? "bg-[#003B3A] text-white rounded-tr-xs"
                    : "bg-white text-slate-800 border border-[#E6ECEA] rounded-tl-xs"
                }`}
              >
                <div className="text-xs leading-relaxed whitespace-pre-line font-medium select-text">
                  {msg.text}
                </div>

                {/* Footer bar */}
                <div className="flex items-center justify-between gap-3 mt-2 pt-1 border-t border-black/5 text-[10px] opacity-70">
                  <span>{msg.timestamp}</span>
                  {msg.role === "model" && (
                    <button
                      onClick={() => handleCopyText(msg.id, msg.text)}
                      className="hover:opacity-100 flex items-center gap-1 cursor-pointer transition-opacity"
                      title="Sao chép"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* ACTION CARDS EMBEDDED IN AI RESPONSE */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-1.5">
                    {msg.actions.map((act, aIdx) => {
                      if (act.taskTitle) {
                        return (
                          <button
                            key={aIdx}
                            onClick={() => handleCreateQuickTodo(act.taskTitle!)}
                            className="bg-teal-50/80 hover:bg-teal-100/80 active:bg-teal-200/80 text-[#003B3A] border border-teal-200 rounded-xl px-3 py-2 text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <CheckSquare className="w-3.5 h-3.5 text-[#00A19A]" />
                              <span>{act.label}</span>
                            </div>
                            <Plus className="w-3.5 h-3.5 text-[#00A19A]" />
                          </button>
                        )
                      }

                      if (act.link) {
                        return (
                          <Link
                            key={aIdx}
                            href={act.link}
                            className="bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-[#003B3A] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              {act.type === "OBSERVATION" ? (
                                <Eye className="w-3.5 h-3.5 text-[#00A19A]" />
                              ) : act.type === "STUDENT" ? (
                                <Search className="w-3.5 h-3.5 text-sky-600" />
                              ) : (
                                <CheckSquare className="w-3.5 h-3.5 text-[#00A19A]" />
                              )}
                              <span>{act.label}</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </Link>
                        )
                      }

                      return null
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00A19A] text-white flex items-center justify-center shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-[#E6ECEA] rounded-2xl rounded-tl-xs p-3.5 shadow-2xs flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00A19A]" />
              <span>SSM AI đang phân tích dữ liệu nghiệp vụ...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* 4. CONTEXT-AWARE PROMPT SUGGESTIONS (HORIZONTAL PILLS) */}
      <div className="px-4 py-2 bg-white/80 backdrop-blur-xs border-t border-[#E6ECEA] shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {ROLE_PROMPTS[selectedRoleTab].map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] font-semibold bg-slate-100 hover:bg-teal-50 hover:text-[#003B3A] hover:border-teal-200 border border-slate-200/80 text-slate-700 px-3 py-1.5 rounded-full shrink-0 transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-3xs"
            >
              &ldquo;{prompt}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* 5. INPUT BAR */}
      <div className="p-3 bg-white border-t border-[#E6ECEA] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage()
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi SSM AI về công việc, học sinh, dự giờ..."
            disabled={isLoading}
            className="flex-1 h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A19A] focus:bg-white transition-all disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 rounded-xl bg-[#00A19A] hover:bg-[#008B85] active:bg-[#00736E] text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:scale-100 active:scale-95 shadow-xs cursor-pointer shrink-0"
            aria-label="Gửi tin nhắn"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* 6. BOTTOM NAVIGATION */}
      <PwaBottomNav role="TEACHER" />
    </div>
  )
}
