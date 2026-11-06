"use client"

import React, { useState } from "react"
import {
  X,
  HelpCircle,
  LayoutGrid,
  Monitor,
  LayoutList,
  Kanban,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Layers,
  Search,
  BookOpen,
  ArrowRight,
  Copy,
  Check,
  Zap,
  Building2,
  Users,
} from "lucide-react"

type GuideTab = "views" | "lifecycle" | "sources" | "assistant" | "faqs"

export function QaGuideModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<GuideTab>("views")
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null)

  if (!isOpen) return null

  const handleCopyPrompt = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedPromptIndex(index)
    setTimeout(() => setCopiedPromptIndex(null), 2500)
  }

  const promptExamples = [
    {
      title: "Tạo đợt kiểm tra OMR định kỳ",
      prompt: "Tạo nhiệm vụ kiểm tra OMR môn Toán khối 10 tại cơ sở Riverside, hạn chót thứ 6 tuần sau, phân công cho giáo viên bộ môn chuẩn bị đề và phiếu trả lời trắc nghiệm.",
      tag: "Khảo thí số",
    },
    {
      title: "Khảo sát đầu vào đợt 2",
      prompt: "Lên lịch đánh giá năng lực đầu vào học sinh mầm non cơ sở Central vào ngày 15/11, phân công cô Mai phụ trách đón tiếp và cô Lan chấm điểm phát triển vận động.",
      tag: "Khảo sát đầu vào",
    },
    {
      title: "Rà soát ma trận dự giờ chuyên môn",
      prompt: "Lập kế hoạch dự giờ chéo tháng 11 cho Tổ Tự nhiên tại cơ sở Quốc tế, mỗi giáo viên dự ít nhất 2 tiết, thời hạn nộp phiếu đánh giá trước ngày 28/11.",
      tag: "Dự giờ sư phạm",
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-teal-50/30 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#003B3A] text-white flex items-center justify-center shadow-xs shrink-0">
              <BookOpen className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-[#003B3A] text-white text-[10px] font-bold tracking-normal">
                  SỔ TAY VẬN HÀNH
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  Hướng dẫn Sử dụng QA Workspace | Ban KT&ĐBCL
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cẩm nang quy chuẩn điều hành công việc, kiểm soát chất lượng, minh chứng và cải tiến liên tục
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div className="px-5 sm:px-6 pt-3 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: "views" as GuideTab, label: "1. 5 Chế độ xem", icon: LayoutGrid },
              { id: "lifecycle" as GuideTab, label: "2. Quy trình 6 bước", icon: ShieldCheck },
              { id: "sources" as GuideTab, label: "3. 6 Nguồn đồng bộ", icon: Layers },
              { id: "assistant" as GuideTab, label: "4. QA Assistant (AI)", icon: Sparkles },
              { id: "faqs" as GuideTab, label: "5. Hỏi & Đáp nghiệp vụ", icon: HelpCircle },
            ].map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? "bg-[#003B3A] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? "text-teal-300" : "text-slate-500"}`} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          <div className="pb-2 hidden sm:block">
            <span className="text-[11px] text-slate-500 tabular-nums">
              Phiên bản: <strong>2026.11</strong> &bull; Sky-Line SQMS
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 text-slate-800 text-xs">

          {/* TAB 1: 5 CHẾ ĐỘ XEM */}
          {activeTab === "views" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-[#F8FAFC] border-l-4 border-[#003B3A] border-y border-r border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-sm text-[#003B3A] mb-1">
                  Khái quát về 5 Chế độ Làm việc Chuẩn của QA Workspace
                </h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  QA Workspace được thiết kế giúp chuyên viên và lãnh đạo Ban KT&ĐBCL có thể chuyển đổi linh hoạt giữa góc nhìn bao quát, điều hành tiến độ theo hạn chót (SLA), quản lý dạng kéo thả hoặc theo lịch trực quan.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#00A19A]/50 transition-all space-y-2">
                  <div className="flex items-center gap-2 text-teal-800 font-extrabold text-xs">
                    <LayoutGrid className="w-4 h-4" />
                    <span>1. Không gian công việc (Workspace)</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Trung tâm điều phối đa tầng: Bảng KPI mẫu số N, dải điều khiển tiến độ theo Tổ chuyên môn, bộ lọc danh mục và khối nhiệm vụ theo 6 nguồn kết nối tự động.
                  </p>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Phù hợp: Theo dõi toàn cảnh & điều phối hàng ngày</div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#00A19A]/50 transition-all space-y-2">
                  <div className="flex items-center gap-2 text-rose-700 font-extrabold text-xs">
                    <Monitor className="w-4 h-4" />
                    <span>2. Phòng điều hành (Command Room)</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Giám sát tiến độ & SLA khẩn cấp: Theo dõi các nhiệm vụ sắp tới hạn (Due Soon &lt; 48h), cảnh báo quá hạn thực hiện hoặc quá hạn duyệt theo từng cơ sở (Riverside, Central, Hội An...).
                  </p>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Phù hợp: Họp giao ban, xử lý nút thắt cổ chai</div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#00A19A]/50 transition-all space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs">
                    <Kanban className="w-4 h-4" />
                    <span>3. Bảng Kanban</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Trực quan hóa 5 làn luân chuyển: <em>Đã giao &rarr; Đang thực hiện &rarr; Chờ duyệt &rarr; Cần bổ sung &rarr; Hoàn thành</em>. Cho phép kéo thả thẻ nhiệm vụ để chuyển trạng thái tức thời.
                  </p>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Phù hợp: Quản lý tác vụ linh hoạt (Agile)</div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#00A19A]/50 transition-all space-y-2">
                  <div className="flex items-center gap-2 text-sky-700 font-extrabold text-xs">
                    <LayoutList className="w-4 h-4" />
                    <span>4. Danh sách (List View)</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Bảng dữ liệu Sổ cái Học thuật (Academic Ledger): Đầy đủ các cột thông tin, mã học phần, người phụ trách, tiến độ checklist, hỗ trợ phân trang và xuất báo cáo.
                  </p>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Phù hợp: Tra cứu chi tiết, lọc nâng cao & in ấn</div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#00A19A]/50 transition-all space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2 text-amber-700 font-extrabold text-xs">
                    <Calendar className="w-4 h-4" />
                    <span>5. Lịch biểu (Calendar View)</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Sắp xếp nhiệm vụ và hạn chót theo lịch tuần và tháng. Giúp phân bổ mật độ công việc đồng đều, tránh dồn ứ kiểm tra hoặc khảo sát trong cùng một khung thời gian.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: QUY TRÌNH 6 BƯỚC */}
          {activeTab === "lifecycle" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-[#F8FAFC] border-l-4 border-[#003B3A] border-y border-r border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-sm text-[#003B3A] mb-1">
                  Quy trình 6 Bước Vận hành Nghiệp vụ Kiểm soát Chất lượng
                </h3>
                <p className="text-slate-600 text-xs">
                  Mỗi nhiệm vụ trong QA Workspace đều tuân thủ vòng đời tiêu chuẩn từ khi khởi tạo tới khi nghiệm thu và tích lũy vào kho cải tiến liên tục:
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    step: "1",
                    title: "Khởi tạo nhiệm vụ (Task Inception)",
                    desc: "Tạo thủ công hoặc đồng bộ tự động từ các phân hệ Khảo thí số, Khảo sát đầu vào, Dự giờ... Xác định rõ tiêu đề, độ ưu tiên (Thấp / Trung bình / Cao / Khẩn cấp) và phạm vi cơ sở.",
                    badge: "DRAFT / ASSIGNED",
                    color: "bg-slate-100 text-slate-700",
                  },
                  {
                    step: "2",
                    title: "Thiết lập Phân công & Danh mục Checklist",
                    desc: "Giao cho Tổ chuyên môn (Group), Cá nhân (Individual) hoặc Nhiều người phối hợp. Xây dựng các bước checklist tuần tự, có thể chỉ định người phụ trách và ngày hạn riêng cho từng bước.",
                    badge: "ASSIGNED",
                    color: "bg-sky-100 text-sky-800",
                  },
                  {
                    step: "3",
                    title: "Thực hiện & Kiểm soát Hạn chót (Execution & SLA)",
                    desc: "Nhân sự nhận việc, đánh dấu hoàn thành từng mục checklist, đính kèm link minh chứng, ghi chú khó khăn vướng mắc. Hệ thống theo dõi SLA tự động cảnh báo màu theo hạn định.",
                    badge: "IN_PROGRESS",
                    color: "bg-amber-100 text-amber-800",
                  },
                  {
                    step: "4",
                    title: "Nộp báo cáo & Đề xuất nghiệm thu",
                    desc: "Khi toàn bộ hoặc các checklist chính hoàn tất, nhân sự nộp báo cáo tổng kết, gửi đề nghị nghiệm thu chuyển trạng thái sang Chờ duyệt.",
                    badge: "PENDING_REVIEW",
                    color: "bg-teal-50 text-teal-800",
                  },
                  {
                    step: "5",
                    title: "Thẩm định chất lượng & Đánh giá phân loại",
                    desc: "Lãnh đạo Ban KT&ĐBCL hoặc Tổ trưởng chuyên môn thẩm tra minh chứng, đánh giá theo 4 mức chuẩn: Xuất sắc, Đạt chuẩn, Đạt yêu cầu, hoặc Yêu cầu bổ sung (NEEDS_REVISION).",
                    badge: "REVIEW",
                    color: "bg-teal-50 text-teal-800",
                  },
                  {
                    step: "6",
                    title: "Nghiệm thu đóng việc & Tích lũy Cải tiến (CAPA)",
                    desc: "Xác nhận hoàn thành chính thức. Đối với các vấn đề phát sinh cần cải tiến, hệ thống tự động lưu vào Kế hoạch Hành động Cải tiến Chất lượng liên tục.",
                    badge: "COMPLETED",
                    color: "bg-emerald-100 text-emerald-800",
                  },
                ].map((s) => (
                  <div key={s.step} className="p-4 rounded-2xl border border-slate-200 bg-white flex items-start gap-3.5">
                    <span className="w-7 h-7 rounded-xl bg-[#003B3A] text-teal-300 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {s.step}
                    </span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="font-extrabold text-xs text-slate-900">{s.title}</h4>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${s.color}`}>
                          {s.badge}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: 6 NGUỒN ĐỒNG BỘ */}
          {activeTab === "sources" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-[#F8FAFC] border-l-4 border-[#003B3A] border-y border-r border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-sm text-[#003B3A] mb-1">
                  Liên kết Tự động 6 Nguồn Nghiệp vụ Trọng tâm
                </h3>
                <p className="text-slate-600 text-xs">
                  QA Workspace tự động lắng nghe và kết nối các sự kiện nghiệp vụ từ toàn bộ hệ sinh thái Sky-Line SSM để chuyển thành các nhiệm vụ kiểm soát chất lượng có gắn deadline cụ thể:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  {
                    code: "KHAO_THI",
                    title: "1. Khảo thí số (OMR & LMS)",
                    desc: "Tự động sinh task khi mở kỳ kiểm tra, nhắc duyệt ma trận đề, kiểm tra niêm phong bài thi và khóa sổ điểm đúng hạn.",
                    icon: FileCheck2,
                    tag: "Khảo thí",
                  },
                  {
                    code: "KHAO_SAT_DAU_VAO",
                    title: "2. Khảo sát Đầu vào",
                    desc: "Theo dõi tiến độ phỏng vấn, khảo sát năng lực tâm lý - phát triển của học sinh mới chuyển đến các cơ sở.",
                    icon: Users,
                    tag: "Tuyển sinh & ĐBCL",
                  },
                  {
                    code: "DGNL",
                    title: "3. Đánh giá Năng lực (DGNL)",
                    desc: "Nhiệm vụ nghiệm thu ngân hàng câu hỏi, thẩm định thang đo chuẩn đầu ra và thống kê phân bố phổ điểm.",
                    icon: CheckCircle2,
                    tag: "Năng lực học sinh",
                  },
                  {
                    code: "DU_GIO",
                    title: "4. Dự giờ Sư phạm",
                    desc: "Tự động phân công lịch dự giờ chéo cho giáo viên, quản lý biên bản nhận xét và phản hồi sư phạm 2 chiều.",
                    icon: Clock,
                    tag: "Sư phạm",
                  },
                  {
                    code: "KHAO_SAT_PHAN_HOI",
                    title: "5. Khảo sát Ý kiến PHHS / HS",
                    desc: "Theo dõi tỷ lệ hoàn thành form khảo sát phụ huynh, cảnh báo các chỉ số NPS cần cải thiện ngay tại cơ sở.",
                    icon: AlertTriangle,
                    tag: "Khách hàng & PHHS",
                  },
                  {
                    code: "CAI_TIEN_CHAT_LUONG",
                    title: "6. Cải tiến Chất lượng (CAPA)",
                    desc: "Quản lý các hành động khắc phục, giải pháp nâng cao chất lượng dạy và học được phê duyệt sau thanh kiểm tra.",
                    icon: Sparkles,
                    tag: "Cải tiến liên tục",
                  },
                  {
                    code: "API_INTEGRATION",
                    title: "7. Tích hợp API Ngoài (SSM API v1)",
                    desc: "Tích hợp ứng dụng đối tác, phần mềm chuyên môn và n8n tự động hóa để đọc/ghi dữ liệu học sinh, điểm, phân công và khảo sát thông qua API Key an toàn tại Quản trị → Kết nối API.",
                    icon: Zap,
                    tag: "API & n8n",
                  },
                ].map((src) => {
                  const Icon = src.icon
                  return (
                    <div key={src.code} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#00A19A]/50 transition-all space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-extrabold text-xs text-slate-900">
                          <Icon className="w-4 h-4 text-[#00A19A]" />
                          <span>{src.title}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-bold border border-teal-200">
                          {src.tag}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{src.desc}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 4: QA ASSISTANT (AI) */}
          {activeTab === "assistant" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-[#F8FAFC] border-l-4 border-[#003B3A] border-y border-r border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-sm text-[#003B3A] mb-1">
                  Trợ lý Chuyên môn QA Assistant (AI Prompting)
                </h3>
                <p className="text-slate-600 text-xs">
                  QA Assistant được tích hợp sẵn giúp bạn tạo nhanh nhiệm vụ từ câu lệnh văn bản tự nhiên, tự động bóc tách ngày hạn, độ ưu tiên, người phụ trách và các bước checklist:
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-800">Mẫu câu lệnh (Prompt) có thể sao chép và dùng ngay:</h4>

                {promptExamples.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-slate-900">{item.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {item.tag}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 leading-relaxed">
                      "{item.prompt}"
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleCopyPrompt(item.prompt, idx)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                          copiedPromptIndex === idx
                            ? "bg-emerald-600 text-white"
                            : "bg-[#003B3A] hover:bg-[#002B2A] text-white"
                        }`}
                      >
                        {copiedPromptIndex === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Đã sao chép prompt
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Sao chép câu lệnh
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1 text-xs">
                <strong>Mẹo sử dụng hiệu quả:</strong>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Để QA Assistant bóc tách chính xác nhất, câu lệnh nên chứa đủ 4 yếu tố: <em>(1) Tên nhiệm vụ</em>, <em>(2) Cơ sở thực hiện</em>, <em>(3) Hạn chót cụ thể</em> (ví dụ: thứ 6 tuần sau, 15/11), và <em>(4) Tên nhân sự hoặc Tổ chuyên môn phụ trách</em>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: HỎI & ĐÁP NGHIỆP VỤ */}
          {activeTab === "faqs" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-[#F8FAFC] border-l-4 border-[#003B3A] border-y border-r border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-sm text-[#003B3A] mb-1">
                  Câu hỏi Thường gặp & Xử lý Tình huống Thực tế
                </h3>
                <p className="text-slate-600 text-xs">
                  Giải đáp các vướng mắc phổ biến trong quá trình vận hành và kiểm soát chất lượng tại trường:
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    q: "Làm sao khi một nhiệm vụ bị cảnh báo Quá hạn (Overdue)?",
                    a: "Chuyên viên vào tab 'Phòng điều hành' để xem danh sách nhiệm vụ quá hạn. Bạn có thể nhấn 'Gửi nhắc nhở tự động' hoặc mở chi tiết nhiệm vụ để gia hạn ngày hạn (cần ghi chú lý do điều chỉnh) hoặc phân công thêm người phối hợp.",
                  },
                  {
                    q: "Cách đặt Tổ chuyên môn mặc định khi tôi mở QA Workspace?",
                    a: "Tại thanh chọn Tổ chuyên môn ở đầu trang, chọn Tổ của bạn (ví dụ: 'Khảo thí & ĐBCL'), sau đó nhấn biểu tượng chiếc ghim (Pin). Hệ thống sẽ tự động ghi nhớ và mở đúng Tổ này trong các lần đăng nhập tiếp theo.",
                  },
                  {
                    q: "Nhiệm vụ bị 'Cần bổ sung' (NEEDS_REVISION) thì phải làm gì?",
                    a: "Trạng thái này xuất hiện khi người duyệt kiểm tra thấy minh chứng chưa đủ hoặc chưa đạt chuẩn. Người thực hiện cần xem phần ghi chú thẩm định, tải bổ sung minh chứng và bấm 'Nộp lại báo cáo' để chuyển về Chờ duyệt.",
                  },
                  {
                    q: "Làm thế nào để tạo nhiệm vụ lặp định kỳ (Hàng tuần / Hàng tháng)?",
                    a: "Khi tạo nhiệm vụ, chọn Chế độ phân công là 'Lặp định kỳ' (RECURRING). Chọn tần suất (Hàng tuần vào Thứ 2, hoặc Hàng tháng vào ngày 1). Nhiệm vụ sẽ tự động được sinh mới vào ngày giờ đã định sau khi được lãnh đạo duyệt.",
                  },
                  {
                    q: "Dữ liệu báo cáo và tỷ lệ hoàn thành N được tính như thế nào?",
                    a: "Tại nút 'Báo cáo', mỗi tỷ lệ đều có mẫu số N rõ ràng (ví dụ: Hoàn thành đúng hạn = Số task xong đúng hạn / Tổng số task có hạn). Hệ thống đánh giá dựa trên chất lượng nghiệm thu và minh chứng, không đánh giá chuyên môn chỉ thuần túy bằng tốc độ bấm hoàn thành.",
                  },
                ].map((faq, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-1.5">
                    <h4 className="font-extrabold text-xs text-slate-900 flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-teal-100 text-[#003B3A] flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                        ?
                      </span>
                      <span>{faq.q}</span>
                    </h4>
                    <p className="text-slate-600 text-[11px] leading-relaxed pl-6">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
            <span>Hỗ trợ nghiệp vụ chuyên môn: <strong>Ban KT&ĐBCL Sky-Line</strong></span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002B2A] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            Đã hiểu, đóng hướng dẫn
          </button>
        </div>

      </div>
    </div>
  )
}
