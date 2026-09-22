"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { usePathname } from "next/navigation"
import {
  MessageSquare, Send, X, Bot, Sparkles, Trash2,
  ChevronDown, AlertCircle, BookOpen, Compass, Heart,
  ShieldCheck, Award, GraduationCap, BarChart3, RefreshCw
} from "lucide-react"
import { AssistantRole, PERSONAS } from "@/lib/assistant/personas"

interface ChatMessage {
  role: "user" | "model"
  parts: [{ text: string }]
}

interface SSMAssistantWidgetProps {
  role?: AssistantRole
}

export function SSMAssistantWidget({ role = "TEACHER" }: SSMAssistantWidgetProps) {
  const pathname = usePathname() || ""
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const persona = PERSONAS[role] || PERSONAS.TEACHER

  // Khởi tạo lời chào theo Persona
  useEffect(() => {
    setMessages([
      {
        role: "model",
        parts: [{ text: persona.welcomeMessage }]
      }
    ])
  }, [role, persona.welcomeMessage])

  // Tự động cuộn xuống cuối tin nhắn
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isOpen, isLoading])

  // Tạo các câu hỏi gợi ý thông minh dựa trên Vai trò và Trang hiện tại (Context-Aware)
  const contextualPrompts = useMemo(() => {
    // 1. Học sinh
    if (role === "STUDENT") {
      if (pathname.includes("/muc-tieu")) {
        return [
          { text: "Em còn mục tiêu nào chưa hoàn thành?", label: "Mục tiêu chưa đạt" },
          { text: "Gợi ý cho em 3 hành động trong kế hoạch 7 ngày gỡ khó", label: "7 ngày gỡ khó" },
          { text: "Xem lời nhắn của ba mẹ và thầy cô về mục tiêu của em", label: "Lời nhắn ba mẹ & GV" }
        ]
      }
      if (pathname.includes("/danh-gia-nang-luc")) {
        return [
          { text: "Em đang có năng lực nào nổi bật nhất?", label: "Năng lực nổi bật" },
          { text: "Năng lực nào em cần rèn luyện thêm?", label: "Năng lực cần cải thiện" }
        ]
      }
      return [
        { text: "Tra cứu điểm số các môn học kỳ này của em", label: "Điểm các môn" },
        { text: "Hôm nay em có những tiết học nào?", label: "Thời khóa biểu hôm nay" },
        { text: "Em muốn xem nhận xét của Thầy/Cô cố vấn học tập", label: "Lời dặn của Cố vấn" }
      ]
    }

    // 2. Giáo viên
    if (role === "TEACHER") {
      if (pathname.includes("/diem-lop-chu-nhiem") || pathname.includes("/classes")) {
        return [
          { text: "Lớp có những học sinh nào dưới điểm chuẩn benchmark?", label: "Học sinh dưới chuẩn" },
          { text: "Thống kê tiến độ nhập điểm và phổ điểm của lớp", label: "Tiến độ vào điểm" }
        ]
      }
      if (pathname.includes("/co-van-hoc-tap") || pathname.includes("/ho-so-hoc-sinh")) {
        return [
          { text: "Lớp chủ nhiệm có học sinh nào ở trạng thái Vàng hoặc Đỏ?", label: "Cảnh báo Vàng/Đỏ" },
          { text: "Có học sinh nào gửi yêu cầu trợ giúp cần xử lý không?", label: "Yêu cầu trợ giúp mới" },
          { text: "Soạn thảo gợi ý nhận xét học kỳ cho học sinh", label: "Dự thảo nhận xét HS" }
        ]
      }
      if (pathname.includes("/du-gio")) {
        return [
          { text: "Tôi đã đi dự giờ đủ chỉ tiêu tháng này chưa?", label: "Chỉ tiêu dự giờ tháng" },
          { text: "Xem nhận xét ưu điểm và góp ý các tiết dạy của tôi", label: "Nhận xét tiết dạy của tôi" }
        ]
      }
      return [
        { text: "Danh sách học sinh lớp chủ nhiệm cần lưu ý đặc biệt", label: "Học sinh diện lưu ý" },
        { text: "Kiểm tra tiến độ nhập điểm các lớp tôi phụ trách", label: "Tiến độ sổ điểm" },
        { text: "Kiểm tra chỉ tiêu dự giờ cá nhân trong tháng", label: "Chỉ tiêu dự giờ" }
      ]
    }

    // 3. Phụ huynh
    if (role === "PARENT") {
      if (pathname.includes("/grades")) {
        return [
          { text: "Tóm tắt kết quả học tập tháng này của con tôi", label: "Báo cáo điểm của con" },
          { text: "Con có môn nào cần gia đình đồng hành kèm cặp thêm không?", label: "Môn cần đồng hành" }
        ]
      }
      return [
        { text: "Tình hình học tập và rèn luyện của con tôi hiện tại ra sao?", label: "Tổng quan về con" },
        { text: "Con tôi đang đặt ra những mục tiêu gì trong học kỳ này?", label: "Mục tiêu của con" },
        { text: "Thầy cô có lời khuyên gì để ba mẹ hỗ trợ con học tốt hơn?", label: "Khuyên phụ huynh" }
      ]
    }

    // 4. BGH & Admin
    return [
      { text: "Thống kê tiến độ hoàn thành sổ điểm toàn trường", label: "Tiến độ sổ điểm toàn trường" },
      { text: "Thống kê hoạt động dạy và dự giờ của các Tổ chuyên môn", label: "Hoạt động Tổ chuyên môn" },
      { text: "Tổng hợp số lượng học sinh cảnh báo Xanh/Vàng/Đỏ toàn trường", label: "Cảnh báo rủi ro toàn trường" },
      { text: "Báo cáo chỉ số hài lòng Phụ huynh (NPS) mới nhất", label: "Chỉ số NPS khảo sát" }
    ]
  }, [role, pathname])

  const handleSend = async (textToSend?: string) => {
    const messageText = textToSend || input
    if (!messageText.trim() || isLoading) return

    if (!textToSend) setInput("")
    setError(null)

    const newUserMessage: ChatMessage = {
      role: "user",
      parts: [{ text: messageText }]
    }

    const updatedMessages = [...messages, newUserMessage]
    setMessages(updatedMessages)
    setIsLoading(true)

    try {
      const history = updatedMessages
        .slice(0, -1)
        .map(msg => ({
          role: msg.role,
          parts: msg.parts
        }))

      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          history,
          requestedRole: role,
          currentPath: pathname
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Không nhận được phản hồi từ máy chủ AI.")
      }

      setMessages(prev => [
        ...prev,
        {
          role: "model",
          parts: [{ text: data.text }]
        }
      ])
    } catch (err: any) {
      console.error("SSM Assistant Error:", err)
      setError(err.message || "Không thể kết nối tới Trợ lý Ảo.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    if (confirm("Làm mới toàn bộ lịch sử trò chuyện hiện tại?")) {
      setMessages([
        {
          role: "model",
          parts: [{ text: persona.welcomeMessage }]
        }
      ])
      setError(null)
    }
  }

  // Format Markdown to clean HTML with tables, bullets, and bold
  const renderMessageContent = (text: string) => {
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")

    // Markdown Headers: ###, ##, #
    html = html.replace(/^### (.*$)/gim, "<h5 class='font-bold text-slate-800 text-sm mt-2 mb-1'>$1</h5>")
    html = html.replace(/^## (.*$)/gim, "<h4 class='font-black text-slate-900 text-sm mt-3 mb-1.5'>$1</h4>")
    html = html.replace(/^# (.*$)/gim, "<h3 class='font-black text-slate-900 text-base mt-3 mb-2'>$1</h3>")

    // Bold **text**
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong class='font-bold text-slate-900'>$1</strong>")

    // Bullet points * or -
    html = html.replace(/^(?:\*|-)\s+(.*)$/gm, "<li class='ml-3 list-disc text-slate-700 leading-relaxed'>$1</li>")

    // Numbered lists 1. 2.
    html = html.replace(/^(\d+)\.\s+(.*)$/gm, "<div class='flex gap-1.5 ml-1 my-0.5'><span class='font-bold text-teal-700'>$1.</span><span class='text-slate-700'>$2</span></div>")

    // Tables: simple markdown table support
    const tableRegex = /\|(.+)\|(?:\r?\n)\|(?:\s*[-:]+[-|\s:]*)\|(?:(?:\r?\n)\|.+)+/g
    html = html.replace(tableRegex, match => {
      const rows = match.trim().split("\n")
      if (rows.length < 3) return match
      const headers = rows[0].split("|").filter(c => c.trim().length > 0)
      const dataRows = rows.slice(2).map(r => r.split("|").filter(c => c.trim().length > 0))

      let tableHtml = "<div class='overflow-x-auto my-2 rounded-lg border border-slate-200 shadow-xs'><table class='w-full text-xs text-left text-slate-700 tabular-nums'><thead class='bg-slate-100 text-slate-900 font-bold'><tr>"
      headers.forEach(h => {
        tableHtml += `<th class='p-1.5 border-b border-slate-200'>${h.trim()}</th>`
      })
      tableHtml += "</tr></thead><tbody>"
      dataRows.forEach((r, idx) => {
        const bg = idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"
        tableHtml += `<tr class='${bg} border-b border-slate-100 last:border-0'>`
        r.forEach(cell => {
          tableHtml += `<td class='p-1.5'>${cell.trim()}</td>`
        })
        tableHtml += "</tr>"
      })
      tableHtml += "</tbody></table></div>"
      return tableHtml
    })

    // Newlines
    html = html.replace(/\n/g, "<br />")

    return (
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        className="prose prose-sm max-w-none text-xs md:text-sm leading-relaxed"
      />
    )
  }

  // Header background theme according to role
  const headerTheme = {
    STUDENT: "bg-gradient-to-r from-[#003B3A] via-[#005F5B] to-[#48BFE3]",
    TEACHER: "bg-gradient-to-r from-[#003B3A] via-[#007A72] to-[#00A896]",
    PARENT: "bg-gradient-to-r from-[#1E1B4B] via-[#4338CA] to-[#6366F1]",
    ADMIN: "bg-gradient-to-r from-[#001D1C] via-[#003B3A] to-[#0F766E]"
  }[role] || "bg-[#003B3A]"

  const RoleIcon = {
    STUDENT: GraduationCap,
    TEACHER: BookOpen,
    PARENT: Heart,
    ADMIN: ShieldCheck
  }[role] || Bot

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end print:hidden">
      {/* Cửa sổ Trò chuyện */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] md:w-[450px] h-[580px] max-h-[85vh] bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-2xl flex flex-col overflow-hidden mb-3 transition-all duration-300 animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className={`${headerTheme} text-white p-4 flex items-center justify-between shadow-md shrink-0`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-2xl shadow-inner flex items-center justify-center">
                <RoleIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black tracking-wide text-white">{persona.name}</h4>
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-white/20 text-white rounded-full">
                    {persona.badge}
                  </span>
                </div>
                <p className="text-[10px] text-teal-100 flex items-center gap-1 font-medium mt-0.5 line-clamp-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-300 fill-amber-300 shrink-0" />
                  {persona.tagline}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                title="Làm mới cuộc trò chuyện"
                className="p-2 hover:bg-white/20 rounded-xl transition text-white/80 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Đóng trợ lý"
                className="p-2 hover:bg-white/20 rounded-xl transition text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Vùng Tin nhắn */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
            {messages.map((msg, index) => {
              const isBot = msg.role === "model"
              return (
                <div
                  key={index}
                  className={`flex gap-2.5 max-w-[88%] ${isBot ? "self-start" : "ml-auto flex-row-reverse"}`}
                >
                  {isBot && (
                    <div className="w-7 h-7 bg-[#003B3A] text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <RoleIcon className="w-4 h-4 text-[#48BFE3]" />
                    </div>
                  )}
                  <div
                    className={`p-3.5 rounded-2xl shadow-xs leading-relaxed ${
                      isBot
                        ? "bg-slate-50/90 text-slate-800 rounded-tl-none border border-slate-200/80"
                        : "bg-[#007A72] text-white rounded-tr-none font-medium"
                    }`}
                  >
                    {renderMessageContent(msg.parts[0].text)}
                  </div>
                </div>
              )
            })}

            {/* Trạng thái AI đang suy nghĩ / xử lý dữ liệu */}
            {isLoading && (
              <div className="flex gap-2.5 max-w-[80%] self-start items-center">
                <div className="w-7 h-7 bg-[#003B3A] text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <RoleIcon className="w-4 h-4 text-[#48BFE3] animate-spin" />
                </div>
                <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 mr-1">Đang tổng hợp dữ liệu...</span>
                  <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            )}

            {/* Thông báo lỗi */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 flex items-center gap-2 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Gợi ý câu hỏi thông minh theo ngữ cảnh (Contextual Prompts) */}
          {contextualPrompts.length > 0 && !isLoading && (
            <div className="px-3 py-2 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-1 shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-500" /> Gợi ý nhanh:
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {contextualPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p.text)}
                    className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-[11px] font-semibold text-slate-700 hover:text-teal-700 rounded-lg transition duration-150 text-left shadow-2xs active:scale-95"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Khung nhập tin nhắn */}
          <form
            onSubmit={e => {
              e.preventDefault()
              handleSend()
            }}
            className="p-3 border-t border-slate-200 bg-white flex gap-2 items-center shrink-0"
          >
            <input
              type="text"
              placeholder="Nhập câu hỏi hoặc nội dung cần tra cứu..."
              value={input}
              onChange={e => setInput(e.target.value)}
              className="flex-1 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition px-3 py-2 border border-slate-200 rounded-xl font-medium"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-[#007A72] hover:bg-[#005F5B] text-white rounded-xl shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition shrink-0 active:scale-95 flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Nút Bong bóng mở Trợ lý */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 px-4 bg-[#003B3A] text-white rounded-full flex items-center gap-2.5 shadow-2xl border border-teal-600/40 hover:bg-[#005F5B] transition-all duration-300 hover:scale-105 active:scale-95 relative group"
      >
        <span className="absolute -inset-1 rounded-full bg-[#48BFE3]/25 animate-ping opacity-75 group-hover:animate-none"></span>
        <RoleIcon className="w-5 h-5 text-[#48BFE3]" />
        <span className="text-xs font-black tracking-wide hidden sm:inline">
          {isOpen ? "Thu nhỏ" : persona.name}
        </span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-slate-300" />
        ) : (
          <MessageSquare className="w-4 h-4 text-[#48BFE3]" />
        )}
      </button>
    </div>
  )
}
