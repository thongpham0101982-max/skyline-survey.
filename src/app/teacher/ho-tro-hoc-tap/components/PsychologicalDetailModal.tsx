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

const OFFICIAL_PSYCH_DIMENSIONS = [
  { id: 1, title: "I. Cảm xúc và điều hòa cảm xúc", items: "4 mục", desc: "Phản ứng cảm xúc, mức độ điều hòa và kiểm soát xúc cảm" },
  { id: 2, title: "II. Hành vi - Kiểm soát bản thân", items: "3 mục", desc: "Khả năng kiên nhẫn, chấp hành chỉ dẫn, làm chủ hành vi" },
  { id: 3, title: "III. Quan hệ xã hội & tương tác nhóm", items: "3 mục", desc: "Mức độ hòa đồng, kết nối bạn bè, chia sẻ và hợp tác" },
  { id: 4, title: "IV. Học tập & khả năng tự định hướng / Chú ý", items: "4 mục", desc: "Mức độ tập trung, ghi nhớ và kỹ năng học tập nền tảng" },
  { id: 5, title: "V. Tự nhận thức / Ngôn ngữ & Tư duy", items: "3 mục", desc: "Hình ảnh bản thân, phản xạ ngôn ngữ, khả năng giải quyết vấn đề" },
  { id: 6, title: "VI. Động lực & định hướng tương lai", items: "3 mục", desc: "Hứng thú học tập, ý chí nỗ lực và thái độ học đường" }
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
  const rawScores = assessment.rawScores || []
  const evaluations = s.evaluations || []

  // Extract score for dimension (0..5)
  const getDimensionScore = (idx: number) => {
    if (assessment.dimensionScores && assessment.dimensionScores[idx]) {
      return assessment.dimensionScores[idx].score
    }
    if (rawScores[idx] !== undefined && rawScores[idx] !== null && rawScores[idx] !== "") {
      return Number(rawScores[idx])
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
      let compositeComment = newComment.trim()
      if (newGvcnNote.trim()) {
        compositeComment += `\n📌 Ý KIẾN GVCN: ${newGvcnNote.trim()}`
      }
      if (newPhhsNote.trim()) {
        compositeComment += `\n👨‍👩‍👧 Ý KIẾN PHHS: ${newPhhsNote.trim()}`
      }

      let targetId = s.targetId
      if (!targetId) {
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
          comment: compositeComment
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      toast.success("Ghi nhận nhật ký tâm lý thành công! Đã gửi thông báo đến GVCN.")
      setNewComment("")
      setNewGvcnNote("")
      setNewPhhsNote("")
      setActiveTab("history")

      if (onEvaluationSaved) {
        onEvaluationSaved(data)
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi lưu đánh giá tâm lý")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isAttention = s.status === "CẦN THEO DÕI" || s.status === "CẦN CAN THIỆP" || (s.totalScore !== null && s.totalScore < 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Brain className="h-6 w-6 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  Chi Tiết Đánh Giá Tâm Lý & Tiến Trình Tham Vấn
                </h3>
                <span className="text-[10px] font-bold bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded-full border border-purple-400/30">
                  {academicYearName}
                </span>
              </div>
              <p className="text-xs text-purple-200/80 font-medium mt-0.5">
                Hồ sơ theo dõi tâm lý học sinh phân công lớp chủ nhiệm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer no-print"
              title="In phiếu kết quả"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Student Profile Info Bar */}
        <div className="px-6 py-3.5 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white font-black text-sm flex items-center justify-center shadow-xs">
              {(s.studentName || "H").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900">{s.studentName}</span>
                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-mono text-xs font-bold border border-purple-200">
                  {s.studentCode}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-[11px] font-bold border border-teal-200">
                  {s.className} (Lớp chủ nhiệm)
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5 flex flex-wrap items-center gap-3">
                <span>Cơ sở: <strong className="text-slate-700">{s.campusName}</strong></span>
                <span>•</span>
                <span>Ngày đánh giá: <strong className="text-slate-700">{formatDateSafe(s.startDate)}</strong></span>
                <span>•</span>
                <span>GV Phụ trách Môn Tâm lý: <strong className="text-purple-700">{s.counselorName}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Trạng thái</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border shadow-2xs ${
                isAttention
                  ? "bg-rose-100 text-rose-800 border-rose-200"
                  : "bg-emerald-100 text-emerald-800 border-emerald-200"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isAttention ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
                {s.status}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-2 no-print shrink-0">
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
            1. Kết quả Đánh giá của GV Tâm lý (Khảo sát đầu vào)
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
                    Tổng điểm khảo sát môn Tâm lý
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-3xl font-black ${s.totalScore !== null && s.totalScore < 0 ? "text-rose-600" : "text-purple-950"}`}>
                      {s.totalScore !== null && s.totalScore !== undefined ? `${s.totalScore} đ` : "Chưa chấm"}
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-600 mt-1 font-semibold">
                    {s.totalScore !== null && s.totalScore < 0 
                      ? "Cần lưu ý: Điểm âm ở các mục đánh giá" 
                      : (s.totalScore === 0 ? "Chỉ số tâm lý ở mức bình thường (0đ)" : "Điểm đánh giá các mục tâm lý")}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 p-4.5 rounded-2xl">
                  <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider block">
                    Đánh giá thực tế của GV Tâm lý
                  </span>
                  <p className="text-sm font-bold text-amber-950 mt-1.5 leading-snug">
                    {s.reason || "Chưa có nhận xét"}
                  </p>
                  <p className="text-[10px] text-amber-700 mt-1">
                    GV đánh giá: <strong>{s.counselorName}</strong>
                  </p>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200/80 p-4.5 rounded-2xl">
                  <span className="text-[11px] font-black text-teal-800 uppercase tracking-wider block">
                    Kết quả tuyển sinh & Ghi chú BGH
                  </span>
                  <p className="text-sm font-bold text-teal-950 mt-1.5">
                    {assessment.admissionResult || "Đạt yêu cầu"}
                  </p>
                  <p className="text-[11px] text-teal-700 mt-1 line-clamp-2" title={assessment.directorNote}>
                    {assessment.directorNote ? assessment.directorNote : "Không có ghi chú cam kết đặc biệt"}
                  </p>
                </div>
              </div>

              {/* 6 Core Psychological Dimensions */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-purple-600" />
                      Chi tiết 6 Lĩnh Vực Đánh Giá Môn Tâm Lý (TLY)
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Căn cứ dữ liệu chấm điểm của Giáo viên Môn Tâm lý ({s.counselorName})
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full">
                    Ngày cập nhật: {formatDateSafe(assessment.evaluatedAt || s.startDate)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                  {OFFICIAL_PSYCH_DIMENSIONS.map((dim, idx) => {
                    const dimScore = getDimensionScore(idx)
                    const isScoreNegative = dimScore !== null && dimScore < 0

                    return (
                      <div key={dim.id} className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-black text-slate-900 block">{dim.title}</span>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{dim.desc}</p>
                          </div>
                          <span className={`text-xs font-black px-2.5 py-1 rounded-xl shrink-0 border ${
                            isScoreNegative
                              ? "bg-rose-50 text-rose-700 border-rose-300"
                              : dimScore !== null
                              ? "bg-purple-100 text-purple-900 border-purple-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}>
                            {dimScore !== null ? `${dimScore} đ` : "Chưa chấm"}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Real Teacher Comments & Conclusions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4.5 space-y-2">
                  <h4 className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-purple-600" />
                    Mức độ nhận xét của Giáo viên Tâm lý
                  </h4>
                  <div className="p-3 bg-white rounded-xl border border-purple-200/60 text-xs font-semibold text-slate-800 leading-relaxed min-h-[70px]">
                    {assessment.levelComment || s.reason || "Chưa có ghi nhận mức độ"}
                  </div>
                </div>

                <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4.5 space-y-2">
                  <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    Kết luận sơ bộ / Đề xuất của Giáo viên Tâm lý
                  </h4>
                  <div className="p-3 bg-white rounded-xl border border-indigo-200/60 text-xs font-medium text-slate-700 leading-relaxed min-h-[70px]">
                    {assessment.conclusion || "Chưa có kết luận sơ bộ bổ sung từ GV tâm lý"}
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

                          <div className="text-xs text-slate-800 leading-relaxed font-medium">
                            {parsed.mainComment || ev.comment}
                          </div>

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

          {/* TAB 3: GHI NHẬN NHẬT KÝ MỚI */}
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
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mức độ tiến bộ *</label>
                  <select
                    value={newTrackingLevel}
                    onChange={e => setNewTrackingLevel(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="Đạt mục tiêu">🟢 Đạt mục tiêu / Đã ổn định</option>
                    <option value="Có tiến bộ">🔵 Có tiến bộ / Thích nghi tốt hơn</option>
                    <option value="Duy trì">🟡 Duy trì / Tiếp tục quan sát</option>
                    <option value="Chưa tiến bộ">🔴 Chưa tiến bộ / Cần can thiệp chuyên sâu</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nhận xét & Quan sát diễn biến tâm lý định kỳ *
                </label>
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Ghi nhận các biểu hiện cảm xúc, tương tác với bạn bè, mức độ tập trung hoặc các tình huống đặc biệt trong tháng..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-teal-800 block mb-1">
                    Ý kiến / Đề xuất của GVCN (nếu có)
                  </label>
                  <textarea
                    rows={2}
                    value={newGvcnNote}
                    onChange={e => setNewGvcnNote(e.target.value)}
                    placeholder="Ghi chú phản hồi của GVCN tại lớp..."
                    className="w-full bg-teal-50/50 border border-teal-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-indigo-800 block mb-1">
                    Ý kiến phản hồi từ PHHS (nếu có)
                  </label>
                  <textarea
                    rows={2}
                    value={newPhhsNote}
                    onChange={e => setNewPhhsNote(e.target.value)}
                    placeholder="Phản hồi từ phụ huynh khi trao đổi..."
                    className="w-full bg-indigo-50/50 border border-indigo-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setActiveTab("initial")}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Đang lưu & gửi thông báo...</span>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Lưu & Kích hoạt Thông báo GVCN</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
