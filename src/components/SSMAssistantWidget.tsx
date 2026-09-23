"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { usePathname } from "next/navigation"
import {
  MessageSquare, Send, X, Bot, Sparkles, Trash2,
  ChevronDown, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  PanelRightClose, PanelRightOpen, AlertCircle, BookOpen, Compass, Heart,
  ShieldCheck, Award, GraduationCap, BarChart3, RefreshCw, CheckCircle2, Loader2
} from "lucide-react"
import { AssistantRole, PERSONAS } from "@/lib/assistant/personas"

interface ChatMessage {
  role: "user" | "model"
  parts: [{ text: string }]
  sources?: Array<{
    documentId: string
    title: string
    category: string
    version: string
    source: string
    effectiveDate: string
  }>
  pendingAction?: {
    actionId: string
    actionType: string
    title: string
    description: string
    preview: {
      recipient?: string
      subject?: string
      summary: string
      details: Record<string, any>
    }
  }
  actionStatus?: "EXECUTING" | "EXECUTED" | "CANCELLED"
  actionResult?: string
}

interface SSMAssistantWidgetProps {
  role?: AssistantRole
}

export function SSMAssistantWidget({ role = "TEACHER" }: SSMAssistantWidgetProps) {
  const pathname = usePathname() || ""
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
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
    // 1. Học sinh (STUDENT)
    if (role === "STUDENT") {
      if (pathname.includes("/muc-tieu")) {
        return [
          { text: "Em còn mục tiêu nào chưa hoàn thành?", label: "Mục tiêu chưa đạt" },
          { text: "Khoảng cách GAP giữa kết quả thực tế và mục tiêu của em", label: "Chênh lệch GAP" },
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
      if (pathname.includes("/ho-tro")) {
        return [
          { text: "Hướng dẫn em cách gửi yêu cầu trợ giúp học tập đến GVCN", label: "Cách xin trợ giúp" },
          { text: "Xem nhận xét của Thầy/Cô cố vấn học tập", label: "Lời dặn của Cố vấn" }
        ]
      }
      return [
        { text: "Tra cứu điểm số các môn học kỳ này của em", label: "Điểm các môn" },
        { text: "Điểm của em có môn nào dưới chuẩn Benchmark không?", label: "Chuẩn Benchmark" },
        { text: "Hôm nay em có những tiết học nào?", label: "Thời khóa biểu hôm nay" },
        { text: "Em muốn xem nhận xét của Thầy/Cô cố vấn học tập", label: "Lời dặn của Cố vấn" }
      ]
    }

    // 2. Giáo viên (TEACHER - gồm GVCN và GVBM)
    if (role === "TEACHER") {
      if (pathname.includes("/diem-lop-chu-nhiem") || pathname.includes("/classes")) {
        return [
          { text: "Tính chỉ số sức khỏe học tập HHI của lớp chủ nhiệm", label: "🛡️ Sức khỏe học tập (HHI)" },
          { text: "Xuất báo cáo phân tích chất lượng học tập của lớp", label: "📑 Xuất báo cáo PDF" },
          { text: "Soạn nhận xét học kỳ cho học sinh phong cách khích lệ", label: "✍️ Soạn nhận xét 360°" },
          { text: "Lớp có những học sinh nào dưới điểm chuẩn benchmark?", label: "Học sinh dưới chuẩn" },
          { text: "Quy chế điểm chuẩn benchmark học tập Sky-Line", label: "Quy chế Benchmark" }
        ]
      }
      if (pathname.includes("/co-van-hoc-tap") || pathname.includes("/ho-so-hoc-sinh")) {
        return [
          { text: "Soạn nhận xét học kỳ cho học sinh phong cách khích lệ", label: "✍️ Soạn nhận xét 360°" },
          { text: "Tính chỉ số sức khỏe học tập HHI của lớp chủ nhiệm", label: "🛡️ Chỉ số sức khỏe HHI" },
          { text: "Xuất báo cáo kiểm toán rủi ro học tập của lớp", label: "🚨 Báo cáo rủi ro PDF" },
          { text: "Lớp chủ nhiệm có học sinh nào ở trạng thái Vàng hoặc Đỏ?", label: "Cảnh báo Vàng/Đỏ" },
          { text: "Có học sinh nào gửi yêu cầu trợ giúp cần xử lý không?", label: "Yêu cầu trợ giúp mới" }
        ]
      }
      if (pathname.includes("/so-diem-nhan-xet") || pathname.includes("/phan-tich-chat-luong")) {
        return [
          { text: "Soạn nhận xét học kỳ cho học sinh phong cách khích lệ", label: "✍️ Soạn nhận xét 360°" },
          { text: "Phổ điểm và tỷ lệ đạt Benchmark môn tôi phụ trách", label: "Phổ điểm môn dạy" },
          { text: "Quy trình xin mở khóa sổ điểm trên hệ thống SSM", label: "Quy trình mở khóa điểm" }
        ]
      }
      if (pathname.includes("/du-gio")) {
        return [
          { text: "Xuất báo cáo tổng kết hoạt động dự giờ", label: "📑 Báo cáo dự giờ PDF" },
          { text: "Tôi đã đi dự giờ đủ chỉ tiêu tháng này chưa?", label: "Chỉ tiêu dự giờ tháng" },
          { text: "Xem nhận xét ưu điểm và góp ý các tiết dạy của tôi", label: "Nhận xét tiết dạy của tôi" },
          { text: "Quy định đánh giá dự giờ 11 tiêu chí sư phạm và định mức tháng", label: "Quy định Dự giờ 11 TC" }
        ]
      }
      return [
        { text: "Tính chỉ số sức khỏe học tập HHI của lớp chủ nhiệm", label: "🛡️ Chỉ số sức khỏe HHI" },
        { text: "Soạn nhận xét học kỳ cho học sinh phong cách khích lệ", label: "✍️ Soạn nhận xét 360°" },
        { text: "Danh sách học sinh lớp chủ nhiệm cần lưu ý đặc biệt", label: "Học sinh diện lưu ý" },
        { text: "Kiểm tra tiến độ nhập điểm các lớp tôi phụ trách", label: "Tiến độ sổ điểm" },
        { text: "Quy chế điểm chuẩn benchmark học tập Sky-Line", label: "Quy chế Benchmark" }
      ]
    }


    // 3. Tổ Trưởng Chuyên Môn (TTCM)
    if (role === "TTCM") {
      return [
        { text: "Danh sách giáo viên thuộc Tổ Chuyên Môn của tôi", label: "Giáo viên trong Tổ" },
        { text: "Báo cáo chất lượng và tiến độ các bộ môn thuộc Tổ", label: "Chất lượng bộ môn" },
        { text: "Tình hình dự giờ của giáo viên trong Tổ chuyên môn tháng này", label: "Dự giờ trong Tổ" },
        { text: "Ma trận đánh giá 11 tiêu chí sư phạm của các giáo viên trong Tổ", label: "11 tiêu chí Tổ CM" },
        { text: "Quy trình xác nhận yêu cầu xin mở khóa sổ điểm của giáo viên", label: "Xác nhận mở khóa điểm" },
        { text: "Xem lớp chủ nhiệm có học sinh nào ở diện cảnh báo Vàng hoặc Đỏ", label: "Cảnh báo lớp CN" }
      ]
    }

    // 4. Trưởng Bộ Phận (TBP)
    if (role === "TBP") {
      return [
        { text: "Danh sách giáo viên các Tổ Chuyên Môn trong Bộ Phận", label: "Giáo viên trong Bộ Phận" },
        { text: "Báo cáo chất lượng các môn học thuộc các Tổ trong Bộ Phận", label: "Chất lượng môn các Tổ" },
        { text: "Giám sát tình hình dự giờ của giáo viên các Tổ trong Bộ Phận", label: "Dự giờ nhiều Tổ" },
        { text: "Tiến độ sổ điểm các môn thuộc Bộ Phận quản lý", label: "Tiến độ sổ điểm Bộ Phận" },
        { text: "Tỷ lệ học sinh đạt chuẩn Benchmark các môn trong Bộ Phận", label: "Tỷ lệ Benchmark Khối" },
        { text: "Quy định đánh giá dự giờ 11 tiêu chí sư phạm và định mức tháng", label: "Quy định Dự giờ 11 TC" }
      ]
    }

    // 5. Phụ huynh (PARENT - Bảo mật con em mình)
    if (role === "PARENT") {
      if (pathname.includes("/grades")) {
        return [
          { text: "Bảng điểm chi tiết các môn học kỳ này của con", label: "Bảng điểm của con" },
          { text: "Điểm trung bình và nhận xét của thầy cô về con", label: "ĐTB & Lời nhận xét" },
          { text: "Con có môn nào đang ở mức dưới chuẩn Benchmark không?", label: "Môn dưới Benchmark" }
        ]
      }
      if (pathname.includes("/children/advisory") || pathname.includes("/advisory")) {
        return [
          { text: "Sổ mục tiêu SMART và tiến độ hoàn thành của con", label: "Mục tiêu SMART của con" },
          { text: "Kế hoạch 7 ngày gỡ rào cản học tập của con đang thế nào?", label: "Kế hoạch 7 ngày của con" },
          { text: "Xem nhật ký cố vấn học tập và lời dặn của GVCN cho con", label: "Lời dặn của Thầy/Cô" }
        ]
      }
      return [
        { text: "Kết quả kiểm tra & học tập của con tôi", label: "Kết quả học tập của con" },
        { text: "Con tôi có đang nằm trong diện cảnh báo học tập không?", label: "Cảnh báo học tập của con" },
        { text: "Sổ mục tiêu SMART và kế hoạch 7 ngày của con", label: "Mục tiêu của con" },
        { text: "Xem nhật ký cố vấn học tập và lời dặn của GVCN cho con", label: "Lời dặn của Thầy/Cô" },
        { text: "Báo cáo chỉ số hài lòng Phụ huynh (NPS) mới nhất", label: "Khảo sát ý kiến NPS" }
      ]
    }

    // 6. Ban ĐHCM & Ban Giám Hiệu / Admin (Toàn quyền hệ thống)
    if (pathname.includes("/ktdbcl")) {
      return [
        { text: "Báo cáo tiến độ sổ điểm toàn trường — Ban ĐHCM & BGH", label: "Tiến độ sổ điểm toàn trường" },
        { text: "Phổ điểm và tỷ lệ đạt chuẩn Benchmark học tập toàn trường", label: "Phổ điểm toàn trường" },
        { text: "Danh sách yêu cầu xin mở khóa sổ điểm chờ duyệt", label: "Yêu cầu mở khóa điểm" },
        { text: "Quy chế điểm chuẩn benchmark học tập và quy định khảo thí", label: "Quy chế Benchmark" },
        { text: "Quy trình xin mở khóa sổ điểm trên hệ thống SSM", label: "Quy trình Mở khóa điểm" }
      ]
    }
    if (pathname.includes("/du-gio") || pathname.includes("/ma-tran")) {
      return [
        { text: "Hoạt động dạy và dự giờ tất cả các Tổ chuyên môn toàn trường", label: "Dự giờ toàn trường" },
        { text: "Báo cáo ma trận dự giờ và điểm trung bình 11 tiêu chí sư phạm", label: "11 Tiêu chí toàn trường" },
        { text: "Quy định đánh giá dự giờ 11 tiêu chí sư phạm và định mức tháng", label: "Quy định Dự giờ 11 TC" }
      ]
    }
    if (pathname.includes("/co-van-hoc-tap") || pathname.includes("/ho-so")) {
      return [
        { text: "Tổng hợp số lượng học sinh cảnh báo nguy cơ toàn hệ thống", label: "Cảnh báo rủi ro toàn trường" },
        { text: "Thống kê học sinh mở khóa mục tiêu SMART quá 3 lần", label: "Mở khóa mục tiêu > 3 lần" },
        { text: "Quy định sổ mục tiêu SMART và kế hoạch 7 ngày gỡ khó", label: "Quy chế Mục tiêu SMART" }
      ]
    }
    return [
      { text: "Báo cáo tiến độ sổ điểm toàn trường — Ban ĐHCM & BGH", label: "Tiến độ sổ điểm toàn trường" },
      { text: "Hoạt động dạy và dự giờ tất cả các Tổ chuyên môn toàn trường", label: "Dự giờ toàn trường" },
      { text: "Tổng hợp số lượng học sinh cảnh báo nguy cơ toàn hệ thống", label: "Cảnh báo rủi ro toàn trường" },
      { text: "Quy chế điểm chuẩn benchmark học tập và quy định khảo thí", label: "Quy chế Benchmark" },
      { text: "Quy định đánh giá dự giờ 11 tiêu chí sư phạm và định mức tháng", label: "Quy định Dự giờ 11 TC" },
      { text: "Quy trình xin mở khóa sổ điểm trên hệ thống SSM", label: "Quy trình Mở khóa điểm" },
      { text: "Báo cáo chỉ số hài lòng Phụ huynh (NPS) mới nhất", label: "Chỉ số NPS toàn trường" }
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
          parts: [{ text: data.text }],
          sources: data.sources,
          pendingAction: data.pendingAction
        }
      ])
    } catch (err: any) {
      console.error("SSM Assistant Error:", err)
      setError(err.message || "Không thể kết nối tới Trợ lý Ảo.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmAction = async (msgIndex: number, actionId: string) => {
    setMessages(prev => prev.map((m, idx) => idx === msgIndex ? { ...m, actionStatus: "EXECUTING" } : m))
    try {
      const res = await fetch("/api/assistant/actions/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, requestedRole: role })
      })
      const data = await res.json()
      if (data.success) {
        setMessages(prev => prev.map((m, idx) => idx === msgIndex ? { ...m, actionStatus: "EXECUTED", actionResult: data.message } : m))
      } else {
        alert(data.message || "Không thể thực thi hành động.")
        setMessages(prev => prev.map((m, idx) => idx === msgIndex ? { ...m, actionStatus: undefined } : m))
      }
    } catch (err: any) {
      alert("Lỗi kết nối khi gửi yêu cầu.")
      setMessages(prev => prev.map((m, idx) => idx === msgIndex ? { ...m, actionStatus: undefined } : m))
    }
  }

  const handleCancelAction = (msgIndex: number) => {
    setMessages(prev => prev.map((m, idx) => idx === msgIndex ? { ...m, actionStatus: "CANCELLED" } : m))
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

    // Code blocks ```text ... ```
    html = html.replace(/```(?:text|markdown)?\s*([\s\S]*?)```/g, (_m, code) => {
      const cleanCode = code.trim()
      return `<div class="my-2 p-3 bg-slate-900 text-teal-300 font-mono rounded-xl border border-slate-800 text-[11px] leading-relaxed relative overflow-x-auto whitespace-pre-wrap select-all cursor-pointer shadow-xs" title="Nhấp để bôi đen/sao chép">${cleanCode}</div>`
    })

    // Inline code `code`
    html = html.replace(/`([^`]+)`/g, "<code class='px-1.5 py-0.5 bg-slate-100 text-teal-800 rounded text-[11px] font-mono font-bold border border-slate-200'>$1</code>")

    // Markdown Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href='$2' target='_blank' rel='noopener noreferrer' class='inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-bold underline decoration-teal-500 underline-offset-2 hover:bg-teal-50 px-1 py-0.5 rounded transition-colors'>$1 ↗</a>")

    // Blockquotes &gt; text
    html = html.replace(/^&gt;\s+(.*)$/gm, "<blockquote class='border-l-4 border-teal-600 bg-teal-50/50 pl-3 py-1 my-1.5 text-slate-700 italic rounded-r text-xs'>$1</blockquote>")

    // Collapsible &lt;details&gt; & &lt;summary&gt;
    html = html.replace(/&lt;details&gt;/g, "<details class='my-1.5 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs'>")
      .replace(/&lt;\/details&gt;/g, "</details>")
      .replace(/&lt;summary&gt;/g, "<summary class='cursor-pointer font-bold text-slate-700 hover:text-teal-700 select-none'>")
      .replace(/&lt;\/summary&gt;/g, "</summary>")

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
    <>
      {/* 1. Backdrop nền mờ khi mở trên thiết bị di động hoặc máy tính bảng */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-2xs z-40 transition-opacity duration-300 print:hidden"
          title="Bấm để ẩn Trợ lý"
        />
      )}

      {/* 2. Bảng Trợ Lý Ảo Toàn Diện Bên Phải Màn Hình (Right Side Slide-Over Drawer) */}
      <aside
        className={`fixed top-0 right-0 h-screen z-50 flex flex-col bg-white shadow-[-12px_0_40px_rgba(0,0,0,0.18)] border-l border-slate-200/90 transition-transform duration-300 ease-in-out print:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        } ${
          isExpanded ? "w-full sm:w-[680px] lg:w-[740px]" : "w-full sm:w-[460px] md:w-[480px]"
        }`}
        aria-label="Trợ lý ảo SSM"
      >
        {/* Header điều khiển */}
        <div className={`${headerTheme} text-white px-4 py-3.5 flex items-center justify-between shadow-md shrink-0`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-2xl shadow-inner flex items-center justify-center shrink-0">
              <RoleIcon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black tracking-wide text-white truncate">{persona.name}</h4>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-white/20 text-white rounded-full shrink-0">
                  {persona.badge}
                </span>
              </div>
              <p className="text-[10px] text-teal-100 flex items-center gap-1 font-medium mt-0.5 line-clamp-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-300 fill-amber-300 shrink-0" />
                <span className="truncate">{persona.tagline}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            {/* Nút Phóng to / Thu hẹp bề ngang (480px <-> 740px) */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Thu hẹp bề ngang (480px)" : "Mở rộng bề ngang (740px)"}
              className="p-2 hover:bg-white/20 rounded-xl transition text-white/80 hover:text-white hidden sm:flex items-center justify-center"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Nút Làm mới cuộc trò chuyện */}
            <button
              onClick={handleClearChat}
              title="Làm mới cuộc trò chuyện"
              className="p-2 hover:bg-white/20 rounded-xl transition text-white/80 hover:text-white flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Nút Ẩn sang bên phải */}
            <button
              onClick={() => setIsOpen(false)}
              title="Ẩn trợ lý sang bên phải"
              className="p-2 hover:bg-white/25 bg-white/10 rounded-xl transition text-white flex items-center gap-1 text-xs font-bold"
            >
              <PanelRightClose className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Ẩn</span>
            </button>
          </div>
        </div>

        {/* Vùng Lịch Sử Tin Nhắn */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs bg-slate-50/40">
          {messages.map((msg, index) => {
            const isBot = msg.role === "model"
            return (
              <div
                key={index}
                className={`flex gap-2.5 max-w-[92%] ${isBot ? "self-start" : "ml-auto flex-row-reverse"}`}
              >
                {isBot && (
                  <div className="w-7 h-7 bg-[#003B3A] text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <RoleIcon className="w-4 h-4 text-[#48BFE3]" />
                  </div>
                )}
                <div
                  className={`p-3.5 rounded-2xl shadow-xs leading-relaxed ${
                    isBot
                      ? "bg-white text-slate-800 rounded-tl-none border border-slate-200/90 shadow-2xs"
                      : "bg-[#007A72] text-white rounded-tr-none font-medium shadow-sm"
                  }`}
                >
                  {renderMessageContent(msg.parts[0].text)}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-teal-600" /> Nguồn trích dẫn quy định:
                      </span>
                      {msg.sources.map((s, idx) => (
                        <div key={idx} className="text-[10px] bg-teal-50/80 border border-teal-200/80 rounded-lg px-2.5 py-1 text-teal-900 font-medium">
                          <strong>{s.title}</strong> ({s.source} • v{s.version})
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.pendingAction && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          {msg.pendingAction.title}
                        </div>
                        {msg.pendingAction.preview.recipient && (
                          <p className="text-slate-600 mb-1">
                            <strong className="text-slate-800">Người nhận:</strong> {msg.pendingAction.preview.recipient}
                          </p>
                        )}
                        {msg.pendingAction.preview.subject && (
                          <p className="text-slate-600 mb-1">
                            <strong className="text-slate-800">Tiêu đề:</strong> {msg.pendingAction.preview.subject}
                          </p>
                        )}
                        <p className="text-slate-600 mb-2">
                          <strong className="text-slate-800">Tóm tắt:</strong> {msg.pendingAction.preview.summary}
                        </p>

                        {/* Action Buttons */}
                        {msg.actionStatus === "EXECUTED" ? (
                          <div className="bg-emerald-100/90 border border-emerald-300 text-emerald-800 font-bold p-2 rounded-lg flex items-center gap-1.5 text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            {msg.actionResult || "Đã thực thi hành động thành công!"}
                          </div>
                        ) : msg.actionStatus === "CANCELLED" ? (
                          <div className="bg-slate-100 text-slate-500 font-medium p-2 rounded-lg text-xs">
                            Đã hủy bỏ hành động.
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => handleConfirmAction(index, msg.pendingAction!.actionId)}
                              disabled={msg.actionStatus === "EXECUTING"}
                              className="px-3 py-1.5 bg-[#002828] hover:bg-[#003838] text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow transition-all active:scale-95 disabled:opacity-50"
                            >
                              {msg.actionStatus === "EXECUTING" ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Đang gửi...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                                  Xác Nhận Thực Hiện
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleCancelAction(index)}
                              disabled={msg.actionStatus === "EXECUTING"}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg text-xs transition-colors"
                            >
                              Hủy Bỏ
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Trạng thái Đang suy nghĩ / Xử lý */}
          {isLoading && (
            <div className="flex gap-2.5 max-w-[85%] self-start items-center">
              <div className="w-7 h-7 bg-[#003B3A] text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                <RoleIcon className="w-4 h-4 text-[#48BFE3] animate-spin" />
              </div>
              <div className="bg-white border border-slate-200/90 p-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Đang tổng hợp dữ liệu...</span>
                <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          )}

          {/* Thông báo lỗi nếu có */}
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
          <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200/80 flex flex-col gap-1.5 shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-500" /> Gợi ý nhanh:
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
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
            className="flex-1 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition px-3 py-2.5 border border-slate-200 rounded-xl font-medium"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-[#007A72] hover:bg-[#005F5B] text-white rounded-xl shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition shrink-0 active:scale-95 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Nút Tab mép ngoài của Bảng trượt để bấm Thu gọn / Ẩn nhanh */}
        <button
          onClick={() => setIsOpen(false)}
          title="Ẩn Trợ lý Ảo sang bên phải"
          className="absolute top-1/2 -translate-y-1/2 -left-9 bg-[#003B3A] hover:bg-[#005F5B] text-white py-3.5 px-1.5 rounded-l-xl shadow-xl flex items-center justify-center border-y border-l border-teal-400/40 transition hover:-translate-x-0.5 group"
        >
          <ChevronRight className="w-5 h-5 text-teal-300 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
        </button>
      </aside>

      {/* 3. Nút Tab Cạnh Phải Màn Hình (Right Dock Tab để Bấm Hiện Nhanh) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title={`Hiện ${persona.name} ở bên phải`}
          className="fixed top-1/2 -translate-y-1/2 right-0 z-40 bg-[#003B3A] hover:bg-[#005F5B] text-white py-4 px-2.5 rounded-l-2xl shadow-2xl flex flex-col items-center gap-2.5 cursor-pointer transition-all duration-300 hover:pl-3.5 group border-y border-l border-teal-400/40 print:hidden"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#48BFE3] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#48BFE3]"></span>
          </span>
          <RoleIcon className="w-5 h-5 text-[#48BFE3] group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black tracking-widest uppercase [writing-mode:vertical-rl] rotate-180 text-teal-100 group-hover:text-white py-1.5">
            Trợ Lý Ảo
          </span>
          <ChevronLeft className="w-4 h-4 text-teal-300 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      )}
    </>
  )
}
