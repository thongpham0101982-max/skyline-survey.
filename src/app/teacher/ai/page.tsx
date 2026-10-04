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
  Layers
} from "lucide-react"

interface Message {
  id: string
  role: "user" | "model"
  text: string
  timestamp: string
  action?: {
    label: string
    link: string
  }
}

const QUICK_PROMPTS = [
  "Hôm nay tôi cần làm gì?",
  "Tôi còn thiếu việc nào chưa xong?",
  "Lớp tôi có HS nào cần chú ý không?",
  "Tiến độ dự giờ của tôi hiện tại?",
  "Có phản hồi PHHS hoặc yêu cầu mới không?",
]

export default function MobileAIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      text: "Xin chào Thầy/Cô! Tôi là Trợ lý SSM AI. Tôi có thể hỗ trợ Thầy/Cô tổng hợp công việc hôm nay, tra cứu học sinh cần chú ý, kiểm tra lịch dự giờ và giải đáp nhanh mọi thông tin điều hành.",
      timestamp: "Bây giờ"
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

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
          requestedRole: "TEACHER",
          currentPath: "/teacher/ai"
        })
      })

      if (res.ok) {
        const json = await res.json()
        let action: { label: string; link: string } | undefined

        // Detect appropriate action button based on query context
        const qLower = query.toLowerCase()
        if (qLower.includes("dự giờ") || qLower.includes("tiết dạy")) {
          action = { label: "Mở Lịch Dự Giờ", link: "/teacher/du-gio?tab=overview_slots" }
        } else if (qLower.includes("học sinh") || qLower.includes("lớp")) {
          action = { label: "Mở Hồ Sơ Học Sinh", link: "/teacher/ho-so-hoc-sinh" }
        } else if (qLower.includes("việc") || qLower.includes("nhiệm vụ")) {
          action = { label: "Mở Việc Của Tôi", link: "/teacher?tab=tasks" }
        }

        const modelMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "model",
          text: json.text || "Đã phân tích xong dữ liệu của Thầy/Cô.",
          timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          action
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
          timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)] max-w-2xl mx-auto bg-[#F6F8F7] select-none font-sans">
      
      {/* Top Header */}
      <div className="bg-[#003B3A] text-white px-4 py-3 shrink-0 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/teacher"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#00A19A] flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs font-bold leading-tight">SSM AI Assistant</h1>
              <p className="text-[10px] text-teal-300 font-medium">Truy vấn an toàn qua API kiểm duyệt</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setMessages([
              {
                id: "welcome",
                role: "model",
                text: "Lịch sử trò chuyện đã được làm mới. Thầy/Cô cần hỗ trợ thông tin gì hôm nay?",
                timestamp: "Bây giờ"
              }
            ])
          }}
          className="p-1.5 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          title="Làm mới hội thoại"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Chat Messages Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"} max-w-[90%] ${
              m.role === "user" ? "self-end" : "self-start"
            }`}
          >
            <div
              className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-[#00A19A] text-white rounded-tr-xs shadow-xs font-medium"
                  : "bg-white text-slate-800 border border-[#E6ECEA] rounded-tl-xs shadow-xs"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>

              {/* Action Button inside AI Message */}
              {m.action && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center">
                  <Link
                    href={m.action.link}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-[#00736E] font-bold text-[11px] hover:bg-teal-100 active:scale-95 transition-all"
                  >
                    <span>{m.action.label}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
            <span className="text-[9px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}

        {isLoading && (
          <div className="self-start bg-white p-3.5 rounded-2xl rounded-tl-xs border border-[#E6ECEA] shadow-xs flex items-center gap-2 text-xs text-slate-500">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00A19A]" />
            <span>SSM AI đang phân tích dữ liệu...</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-3 py-2 bg-white/70 backdrop-blur-xs border-t border-[#E6ECEA] shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-[#00736E] border border-slate-200/70 transition-colors shrink-0 cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
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
            placeholder="Hỏi SSM AI về công việc, lớp, học sinh..."
            className="flex-1 h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#00A19A] transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 rounded-xl bg-[#00A19A] hover:bg-[#008B85] active:bg-[#00736E] disabled:bg-slate-200 text-white disabled:text-slate-400 flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-95 shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  )
}
