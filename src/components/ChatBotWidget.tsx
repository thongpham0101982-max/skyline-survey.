"use client"

import { useState, useRef, useEffect } from "react"
import { 
  MessageSquare, Send, X, Bot, Sparkles, Trash2, 
  ChevronDown, AlertCircle
} from "lucide-react"

interface ChatMessage {
  role: "user" | "model"
  parts: [{ text: string }]
}

interface ChatBotWidgetProps {
  role?: "ADMIN" | "TEACHER"
  chatbotCode?: string
}

export function ChatBotWidget({ role = "TEACHER", chatbotCode }: ChatBotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Khởi tạo lời chào dựa trên Role người dùng
  useEffect(() => {
    const defaultText = role === "ADMIN"
      ? "Xin chào Admin! Tôi là Trợ lý ảo Chuyên môn hỗ trợ quản trị hệ thống. Thầy/Cô có thể tra cứu thông tin hoạt động dự giờ của Giáo viên, Tổ chuyên môn, hoặc thống kê các tiêu chí giảng dạy nổi bật/cần cải thiện nhất."
      : "Xin chào Thầy/Cô! Tôi là Trợ lý ảo Chuyên môn hỗ trợ Giáo viên. Thầy/Cô có thể tra cứu lịch sử nhận xét các tiết dạy của mình, kiểm tra chỉ tiêu số tiết dự giờ cá nhân, hoặc xem hướng dẫn tiêu chí chấm điểm."
    
    setMessages([
      {
        role: "model",
        parts: [{ text: defaultText }]
      }
    ])
  }, [role])

  // Tự động cuộn xuống cuối danh sách tin nhắn
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen, isLoading])

  const handleSend = async (textToSend?: string) => {
    const messageText = textToSend || input
    if (!messageText.trim() || isLoading) return

    if (!textToSend) setInput("")
    setError(null)

    // Tạo tin nhắn của user
    const newUserMessage: ChatMessage = {
      role: "user",
      parts: [{ text: messageText }]
    }

    const updatedMessages = [...messages, newUserMessage]
    setMessages(updatedMessages)
    setIsLoading(true)

    try {
      // Chuẩn bị lịch sử trò chuyện theo cấu trúc Gemini API
      const history = updatedMessages
        .slice(0, -1) // Không bao gồm tin nhắn vừa tạo
        .map(msg => ({
          role: msg.role,
          parts: msg.parts
        }))

      const activeCode = chatbotCode || (role === "ADMIN" ? "ADMIN_ASSISTANT" : "TEACHER_ASSISTANT");

      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          history: history,
          chatbotCode: activeCode
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Gửi yêu cầu thất bại.")
      }

      setMessages(prev => [
        ...prev,
        {
          role: "model",
          parts: [{ text: data.text }]
        }
      ])
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Không thể kết nối tới máy chủ AI.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    if (confirm("Thầy/Cô có muốn xóa toàn bộ lịch sử hội thoại hiện tại không?")) {
      const defaultText = role === "ADMIN"
        ? "Lịch sử đã được làm mới. Tôi sẵn sàng hỗ trợ các câu hỏi thống kê mới từ Admin!"
        : "Lịch sử đã được làm mới. Tôi sẵn sàng hỗ trợ các câu hỏi tra cứu cá nhân mới từ Thầy/Cô!"
      setMessages([
        {
          role: "model",
          parts: [{ text: defaultText }]
        }
      ])
      setError(null)
    }
  }

  // Gợi ý câu hỏi mẫu dựa theo Role
  const sampleQuestions = role === "ADMIN"
    ? [
        { text: "Thống kê số tiết dạy và số tiết dự của Tổ chuyên môn Tổ 1", label: "Thống kê hoạt động Tổ 1" },
        { text: "Giáo viên nào có tiết dạy điểm trung bình thấp nhất?", label: "Tiết dạy ĐTB thấp nhất" },
        { text: "Tiêu chí nào có điểm thấp nhất xuất hiện nhiều nhất và tiêu chí nào có điểm cao nhất thường xuyên nhất?", label: "Phân tích tần số tiêu chí" },
        { text: "Thống kê số tiết dạy và số tiết dự của giáo viên Mỹ Linh trong tháng", label: "Số tiết dạy/dự GV trong tháng" }
      ]
    : [
        { text: "Xem nhận xét ưu điểm và góp ý của các tiết dạy tôi đã dạy", label: "Xem nhận xét bài dạy của tôi" },
        { text: "Tôi đã dự đủ số tiết bắt buộc trong tháng này chưa?", label: "Kiểm tra chỉ tiêu tháng này" },
        { text: "Hướng dẫn tôi các tiêu chí chấm điểm dự giờ", label: "Xem hướng dẫn chấm điểm" }
      ];

  // Hàm chuyển đổi Markdown đơn giản sang HTML
  const renderMessageContent = (text: string) => {
    // Escape HTML cơ bản để an toàn
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Xử lý Bold **text**
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Xử lý Bullet points * or - ở đầu dòng
    html = html.replace(/^(?:\*|-)\s+(.*)$/gm, "<li class='ml-4 list-disc'>$1</li>");

    // Xử lý Newlines
    html = html.replace(/\n/g, "<br />");

    return <div dangerouslySetInnerHTML={{ __html: html }} className="prose prose-sm max-w-none text-xs md:text-sm leading-relaxed" />
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Khung Chat Window */}
      {isOpen && (
        <div className="w-[360px] md:w-[410px] h-[550px] bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden mb-4 transition-all duration-300 animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-[#0A3230] text-white p-4 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-2xl">
                <Bot className="w-5 h-5 text-[#00A19A]" />
              </div>
              <div>
                <h4 className="text-sm font-black tracking-wide">Trợ Lý Chuyên Môn ({role === "ADMIN" ? "Admin" : "Giáo viên"})</h4>
                <p className="text-[10px] text-slate-300 flex items-center gap-1 font-medium">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400 fill-amber-400" /> Powered by Gemini AI
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={handleClearChat}
                title="Làm mới cuộc trò chuyện"
                className="p-2 hover:bg-white/10 rounded-xl transition text-slate-300 hover:text-white"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs font-semibold">
            {messages.map((msg, index) => {
              const isBot = msg.role === "model"
              return (
                <div 
                  key={index}
                  className={`flex gap-2.5 max-w-[85%] ${isBot ? "self-start" : "ml-auto flex-row-reverse"}`}
                >
                  {isBot && (
                    <div className="w-7 h-7 bg-[#0A3230] text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <Bot className="w-4 h-4 text-[#00A19A]" />
                    </div>
                  )}
                  <div 
                    className={`p-3 rounded-2xl shadow-xs ${
                      isBot 
                        ? "bg-white text-slate-800 rounded-tl-none border border-slate-100" 
                        : "bg-[#00A19A] text-white rounded-tr-none"
                    }`}
                  >
                    {renderMessageContent(msg.parts[0].text)}
                  </div>
                </div>
              )
            })}

            {/* Đang gõ indicator */}
            {isLoading && (
              <div className="flex gap-2.5 max-w-[80%] self-start items-center">
                <div className="w-7 h-7 bg-[#0A3230] text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4 text-[#00A19A]" />
                </div>
                <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            )}

            {/* Error Notification */}
            {error && (
              <div className="p-3 text-rose-600 flex items-center gap-2 text-xs text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Gợi ý câu hỏi nhanh */}
          {messages.length === 1 && !isLoading && (
            <div className="flex flex-col gap-1.5 shrink-0 text-xs font-semibold">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Gợi ý câu hỏi nhanh:</p>
              <div className="flex flex-wrap gap-1.5">
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q.text)}
                    className="px-2.5 py-1 bg-white hover:bg-[#00A19A]/10 border border-slate-200 hover:border-[#00A19A]/20 text-[10px] md:text-xs font-semibold text-slate-600 hover:text-[#00A19A] rounded-xl transition duration-200 text-left"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer Input Area */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="p-3 border-t border-slate-200 bg-white flex gap-2 items-center shrink-0"
          >
            <input 
              type="text" 
              placeholder="Nhập nội dung cần tra cứu..."
              value={input}
              onChange={e => setInput(e.target.value)}
              className="flex-1 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#00A19A] focus:ring-1 focus:ring-[#00A19A] transition text-xs font-semibold"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-[#00A19A] hover:bg-[#008B84] text-white rounded-2xl shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition shrink-0 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Bubble Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#0A3230] text-white rounded-full flex items-center justify-center shadow-xl border border-slate-700/50 hover:bg-[#0C403E] transition-all duration-300 hover:scale-105 active:scale-95 relative group"
      >
        <span className="absolute -inset-1 rounded-full bg-[#00A19A]/20 animate-ping opacity-75 group-hover:animate-none"></span>
        {isOpen ? (
          <ChevronDown className="w-6 h-6 text-[#00A19A]" />
        ) : (
          <MessageSquare className="w-6 h-6 text-[#00A19A]" />
        )}
      </button>
    </div>
  )
}
