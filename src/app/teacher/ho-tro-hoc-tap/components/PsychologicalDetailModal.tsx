"use client"
// @ts-nocheck

import { useState } from "react"
import { 
  X, Brain, Heart, Sparkles, Calendar, User, Clock, CheckCircle2, 
  AlertCircle, TrendingUp, Printer, MessageSquare, Send, Save, Check,
  BookOpen, Activity, AlertTriangle, ShieldCheck, HelpCircle, Layers,
  ExternalLink, ChevronRight, FileText
} from "lucide-react"
import toast from "react-hot-toast"
import { ACADEMIC_MONTHS, formatDateSafe, getTrackingLevelBadge, parseEvaluationComment } from "../client"

const PSYCH_DIMENSIONS = [
  { id: 1, title: "I. Cảm xúc & điều hòa cảm xúc", items: 4, maxScore: 16, desc: "Phản ứng trước thất bại, kiểm soát xúc cảm, thích nghi môi trường" },
  { id: 2, title: "II. Hành vi & tự kiểm soát", items: 3, maxScore: 12, desc: "Tuân thủ nội quy, kiểm soát bốc đồng, khả năng kiên nhẫn" },
  { id: 3, title: "III. Giao tiếp & tương tác xã hội", items: 3, maxScore: 12, desc: "Hợp tác nhóm, kết nối bạn bè, chia sẻ và xử lý xung đột" },
  { id: 4, title: "IV. Chú ý & kỹ năng học tập", items: 4, maxScore: 16, desc: "Mức độ tập trung, ghi nhớ chỉ dẫn, hoàn thành nhiệm vụ" },
  { id: 5, title: "V. Ngôn ngữ & giải quyết vấn đề", items: 3, maxScore: 12, desc: "Diễn đạt tư duy, phản xạ tình huống bất ngờ, tự lập" },
  { id: 6, title: "VI. Động lực & thái độ trường học", items: 3, maxScore: 12, desc: "Hứng thú đến trường, nỗ lực vượt khó, tính chủ động" }
]

interface Props {
  isOpen: boolean
  onClose: () => void
  studentData: any
  onEvaluationSaved?: (newEval: any) => void
  academicYearName?: string
  academicYearId?: string
}

export function PsychologicalDetailModal({
  isOpen,
  onClose,
  studentData,
  onEvaluationSaved,
  academicYearName = "2026-2027",
  academicYearId = ""
}: Props) {
  const [activeTab, setActiveTab] = useState<"initial" | "history" | "new_log">("initial")

  // Form state for adding new psychological evaluation log
  const [newPeriod, setNewPeriod] = useState(ACADEMIC_MONTHS[0] || "Tháng 8")
  const [newTrackingLevel, setNewTrackingLevel] = useState("Có tiến bộ")
  const [newComment, setNewComment] = useState("")
  const [newGvcnNote, setNewGvcnNote] = useState("")
  const [newPhhsNote, setNewPhhsNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !studentData) return null

  const s = studentData
  const assessment = s.psychologyAssessment || {}
  const rawDetailedScores = assessment.detailedScores || []
  const evaluations = s.evaluations || []

  // Calculate scores per dimension if detailed scores exist (20 questions)
  // Usually in new format: index 0-5 are section totals, index 6 is grand total, or items 7..26
  const getDimensionScore = (dimIdx: number) => {
    if (rawDetailedScores.length >= 7 && rawDetailedScores[dimIdx] != null) {
      return Number(rawDetailedScores[dimIdx])
    }
    // Fallback if 20 raw questions:
    const slices = [[0, 4], [4, 7], [7, 10], [10, 14], [14, 17], [17, 20]]
    const range = slices[dimIdx]
    if (range && rawDetailedScores.length >= 20) {
      const subArr = rawDetailedScores.slice(range[0], range[1])
      return subArr.reduce((a: number, b: number) => a + Number(b || 0), 0)
    }
    return null
  }

  const handleCreateEvaluation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) {
      toast.error("Vui lòng nhập nhận xét diễn biến tâm lý của học sinh")
      return
    }

    setIsSubmitting(true)
    try {
      // Build composite comment with GVCN and PHHS feedbacks if entered
      let compositeComment = newComment.trim()
      if (newGvcnNote.trim()) {
        compositeComment += `\n📌 Ý KIẾN GVCN: ${newGvcnNote.trim()}`
      }
      if (newPhhsNote.trim()) {
        compositeComment += `\n👨‍👩‍👧 Ý KIẾN PHHS: ${newPhhsNote.trim()}`
      }

      // If no target exists yet, we first ensure target exists or call saveEvaluation
      let targetId = s.targetId
      if (!targetId) {
        // Create target first
        const createTargetRes = await fetch("/api/ktdbcl/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "saveTarget",
            academicYearId: academicYearId || s.academicYearId,
            studentId: s.studentId,
            supportType: "PSYCHOLOGICAL",
            sourceType: "TAM_LY",
            reason: s.reason || "Theo dõi & đánh giá tâm lý học đường",
            notes: s.notes || "Tạo từ hồ sơ tâm lý lớp chủ nhiệm",
            status: "ĐANG HỖ TRỢ"
          })
        })
        const targetData = await createTargetRes.json()
        if (targetData.error) throw new Error(targetData.error)
        targetId = targetData.id
      }

      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveEvaluation",
          targetId: targetId,
          periodType: "MONTH",
          periodName: newPeriod,
          trackingLevel: newTrackingLevel,
          comment: compositeComment,
          updatedStatus: "ĐANG HỖ TRỢ",
          isPsychological: true
        })
      })

      const evalData = await res.json()
      if (evalData.error) throw new Error(evalData.error)

      toast.success("Đã ghi nhận nhật ký đánh giá thành công! Hệ thống đã gửi báo App và kích hoạt Email tới GVCN.")
      setNewComment("")
      setNewGvcnNote("")
      setNewPhhsNote("")
      setActiveTab("history")

      if (onEvaluationSaved) {
        onEvaluationSaved(evalData)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Lỗi khi lưu nhật ký đánh giá")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 transition-all overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Luxury Purple / Indigo Psychology Gradient */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#2e1065] via-[#3730a3] to-[#4338ca] text-white flex items-center justify-between no-print shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-md shadow-inner">
              <Brain className="h-6 w-6 text-purple-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-purple-400/20 text-purple-200 border border-purple-300/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                  Hồ Sơ Tâm Lý Học Đường
                </span>
                <span className="text-xs text-purple-200 font-semibold">Năm học {academicYearName}</span>
              </div>
              <h2 className="text-lg font-black tracking-tight mt-0.5 text-white">
                KẾT QUẢ ĐÁNH GIÁ & NHẬT KÝ THAM VẤN TÂM LÝ
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              In hồ sơ
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-xl transition-all text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Student Quick Identity Banner */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-purple-500/20">
              {(s.studentName || "H").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">{s.studentName}</h3>
                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-mono text-xs font-bold border border-purple-200">
                  {s.studentCode}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-[11px] font-bold border border-teal-200">
                  {s.className} (Lớp chủ nhiệm)
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-3">
                <span>Cơ sở: <strong className="text-slate-700">{s.campusName}</strong></span>
                <span>•</span>
                <span>Bắt đầu theo dõi: <strong className="text-slate-700">{formatDateSafe(s.startDate)}</strong></span>
                <span>•</span>
                <span>Chuyên viên tham vấn: <strong className="text-purple-700">{s.counselorName}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Trạng thái</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {s.status || "ĐANG HỖ TRỢ"}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-2 no-print">
          <button
            type="button"
            onClick={() => setActiveTab("initial")}
            className={`py-3 px-4 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "initial"
                ? "border-purple-600 text-purple-700 bg-purple-50/50"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            1. Kết quả Đánh giá Ban đầu (Khảo sát đầu vào)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`py-3 px-4 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "history"
                ? "border-purple-600 text-purple-700 bg-purple-50/50"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            <Clock className="h-4 w-4" />
            2. Nhật ký Đánh giá & Tiến trình Tham vấn ({evaluations.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("new_log")}
            className={`py-3 px-4 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "new_log"
                ? "border-purple-600 text-purple-700 bg-purple-50/50"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            <MessageSquare className="h-4 w-4 text-purple-600" />
            + Ghi nhận Nhật ký Mới
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: KẾT QUẢ ĐÁNH GIÁ TÂM LÝ BAN ĐẦU */}
          {activeTab === "initial" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Summary Highlight Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200/80 p-4.5 rounded-2xl">
                  <span className="text-[11px] font-black text-purple-700 uppercase tracking-wider block">
                    Điểm trắc nghiệm tâm lý
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-purple-950">
                      {assessment.psychologyScore != null ? assessment.psychologyScore : "Chưa có"}
                    </span>
                    <span className="text-xs font-semibold text-purple-600">điểm tổng quát</span>
                  </div>
                  <p className="text-[11px] text-purple-600/80 mt-1 font-medium">
                    {assessment.psychologyScore >= 60 ? "Mức độ phát triển cảm xúc - hành vi rất tốt" : (assessment.psychologyScore >= 40 ? "Mức độ thích ứng trung bình - cần theo dõi" : "Cần hỗ trợ và can thiệp tâm lý sát sao")}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 p-4.5 rounded-2xl">
                  <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider block">
                    Vấn đề / Lý do hỗ trợ tiếp nhận
                  </span>
                  <p className="text-sm font-bold text-amber-950 mt-1.5 line-clamp-2">
                    {s.reason || "Theo dõi tâm lý & thích ứng học đường"}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-1">
                    {assessment.directorNote ? `Ghi chú: ${assessment.directorNote}` : "Được GVCN/BGH đưa vào danh sách quan sát"}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200/80 p-4.5 rounded-2xl">
                  <span className="text-[11px] font-black text-teal-800 uppercase tracking-wider block">
                    Kết quả / Phân loại đầu vào
                  </span>
                  <p className="text-sm font-bold text-teal-950 mt-1.5">
                    {assessment.admissionResult || "Đạt - Cần bồi dưỡng thích ứng"}
                  </p>
                  <p className="text-[11px] text-teal-700 mt-1">
                    {s.evaluations.length > 0 ? `Đã ghi nhận ${s.evaluations.length} lượt đánh giá định kỳ` : "Chưa có lượt đánh giá định kỳ"}
                  </p>
                </div>
              </div>

              {/* 6 Core Psychological Sub-dimensions */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-purple-600" />
                      Chi tiết 6 Lĩnh Vực Đánh Giá Năng Lực Tâm Lý & Thích Ứng
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Đo lường mức độ điều hòa cảm xúc, kiểm soát hành vi, tương tác xã hội và kỹ năng học tập nền
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    Thang điểm chuẩn 0 - 4
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                  {PSYCH_DIMENSIONS.map((dim, idx) => {
                    const dimScore = getDimensionScore(idx)
                    const percent = dimScore != null ? Math.min(100, Math.round((dimScore / dim.maxScore) * 100)) : 65
                    return (
                      <div key={dim.id} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-black text-slate-900">{dim.title}</span>
                            <p className="text-[10px] text-slate-500 font-medium">{dim.desc}</p>
                          </div>
                          <span className="text-xs font-black text-purple-900 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-lg shrink-0">
                            {dimScore != null ? `${dimScore} / ${dim.maxScore} đ` : "Chưa chấm chi tiết"}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Psychologist Initial Conclusions & Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4.5 space-y-2">
                  <h4 className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-purple-600" />
                    Kết luận ban đầu của chuyên viên tâm lý
                  </h4>
                  <div className="p-3 bg-white rounded-xl border border-purple-200/60 text-xs font-medium text-slate-700 leading-relaxed min-h-[70px]">
                    {assessment.conclusion || "Học sinh có khả năng tiếp thu và hợp tác ở mức độ khá. Cần lưu ý hỗ trợ về điều hòa cảm xúc khi gặp áp lực bài vở và khích lệ giao tiếp cởi mở trong các hoạt động đội nhóm."}
                  </div>
                </div>

                <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4.5 space-y-2">
                  <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    Biện pháp khuyến nghị cho GVCN & Gia đình
                  </h4>
                  <div className="p-3 bg-white rounded-xl border border-indigo-200/60 text-xs font-medium text-slate-700 leading-relaxed min-h-[70px]">
                    {assessment.recommendation || "GVCN xếp chỗ ngồi gần các bạn có tính cách chan hòa, hòa đồng; thường xuyên khen ngợi các biểu hiện tự kiềm chế tốt; trao đổi định kỳ mỗi 2 tuần với phụ huynh về mức độ hòa nhập."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NHẬT KÝ ĐÁNH GIÁ & TIẾN TRÌNH THAM VẤN (LŨY TIẾN) */}
          {activeTab === "history" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b">
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Nhật ký Tiến trình Tham vấn & Theo dõi Định kỳ Lũy tiến
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Ghi nhận các mốc thời gian, tiến bộ và nhận xét phối hợp giữa GVBM, Chuyên viên và GVCN
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("new_log")}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  + Thêm nhận xét mới
                </button>
              </div>

              {evaluations.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-300 rounded-3xl space-y-3">
                  <Brain className="h-10 w-10 text-purple-400 mx-auto opacity-70" />
                  <p className="text-sm font-bold text-slate-700">Chưa có bản ghi nhật ký đánh giá định kỳ nào</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Thầy/Cô có thể bấm vào tab <strong>"+ Ghi nhận Nhật ký Mới"</strong> để bổ sung quan sát tâm lý của tháng này.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("new_log")}
                    className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-purple-700 transition-all cursor-pointer shadow-sm"
                  >
                    Ghi nhận đợt đánh giá đầu tiên
                  </button>
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-purple-100">
                  {evaluations.map((ev: any, idx: number) => {
                    const badge = getTrackingLevelBadge(ev.trackingLevel)
                    const parsed = parseEvaluationComment(ev.comment)
                    return (
                      <div key={ev.id || idx} className="relative pl-10">
                        {/* Timeline Node */}
                        <div className="absolute left-2.5 top-3.5 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-purple-600 ring-4 ring-purple-100" />
                        
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-2.5 hover:border-purple-300 transition-all">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs text-purple-900 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
                                {ev.periodName} ({ev.periodType === "WEEK" ? "Tuần" : "Tháng"})
                              </span>
                              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${badge.badge}`}>
                                {ev.trackingLevel}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium">
                              Ghi nhận ngày: {formatDateSafe(ev.createdAt)}
                            </span>
                          </div>

                          {/* Main Observation */}
                          <div className="text-xs text-slate-800 leading-relaxed font-medium">
                            {parsed.mainComment || ev.comment}
                          </div>

                          {/* Extra feedback boxes */}
                          {(parsed.gvcnFeedback || parsed.phhsFeedback) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                              {parsed.gvcnFeedback && (
                                <div className="p-2.5 bg-teal-50/80 rounded-xl border border-teal-200 text-[11px]">
                                  <strong className="text-teal-800 font-bold block mb-0.5">📌 Ý kiến GVCN:</strong>
                                  <span className="text-teal-900">{parsed.gvcnFeedback}</span>
                                </div>
                              )}
                              {parsed.phhsFeedback && (
                                <div className="p-2.5 bg-indigo-50/80 rounded-xl border border-indigo-200 text-[11px]">
                                  <strong className="text-indigo-800 font-bold block mb-0.5">👨‍👩‍👧 Ý kiến PHHS:</strong>
                                  <span className="text-indigo-900">{parsed.phhsFeedback}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GHI NHẬN NHẬT KÝ MỚI (CÓ BÁO APP & KÍCH HOẠT EMAIL GVCN) */}
          {activeTab === "new_log" && (
            <form onSubmit={handleCreateEvaluation} className="space-y-4 animate-in fade-in duration-200 max-w-2xl mx-auto">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-3">
                <Brain className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="text-xs text-purple-950 leading-relaxed">
                  <strong>Quy trình thông báo tự động:</strong> Khi Thầy/Cô hoàn tất lưu nhật ký đánh giá tâm lý này, hệ thống sẽ tự động <strong>báo chuông App</strong> và <strong>kích hoạt Email thông báo</strong> đến Giáo viên Chủ nhiệm lớp <strong>{s.className}</strong> để phối hợp chăm sóc học sinh kịp thời.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Kỳ / Tháng đánh giá *</label>
                  <select
                    value={newPeriod}
                    onChange={e => setNewPeriod(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    {ACADEMIC_MONTHS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mức độ tiến bộ / Đánh giá *</label>
                  <select
                    value={newTrackingLevel}
                    onChange={e => setNewTrackingLevel(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="Có tiến bộ">Có tiến bộ (Hòa nhập tốt hơn)</option>
                    <option value="Đạt mục tiêu">Đạt mục tiêu (Đã ổn định tâm lý)</option>
                    <option value="Duy trì">Duy trì theo dõi (Chưa có nhiều biến chuyển)</option>
                    <option value="Chưa tiến bộ">Chưa tiến bộ (Cần can thiệp chuyên sâu)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nhận xét diễn biến tâm lý & Biểu hiện hành vi tại lớp *
                </label>
                <textarea
                  rows={4}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Ghi nhận cụ thể: Mức độ tương tác với bạn bè, thái độ trong giờ học, các tình huống cảm xúc phát sinh, biện pháp can thiệp đã áp dụng..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20 leading-relaxed"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Ý kiến phối hợp GVCN (Nếu có)</label>
                  <input
                    type="text"
                    value={newGvcnNote}
                    onChange={e => setNewGvcnNote(e.target.value)}
                    placeholder="Gợi ý hoạt động lớp hoặc nhắc nhở thêm..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Ý kiến phản hồi từ PHHS (Nếu có)</label>
                  <input
                    type="text"
                    value={newPhhsNote}
                    onChange={e => setNewPhhsNote(e.target.value)}
                    placeholder="Gia đình chia sẻ biểu hiện ở nhà..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t">
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSubmitting ? "Đang gửi & kích hoạt email..." : "Lưu nhật ký & Gửi thông báo"}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between no-print">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-purple-600" />
            <span>Hồ sơ bảo mật chuyên môn tâm lý học đường Sky-Line</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  )
}
