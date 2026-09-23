"use client"
// @ts-nocheck

import { useState } from "react"
import { 
  X, Brain, Heart, Sparkles, Calendar, User, Clock, CheckCircle2, 
  AlertCircle, TrendingUp, Printer, MessageSquare, Send, Save, Check,
  BookOpen, Activity, AlertTriangle, ShieldCheck, HelpCircle, Layers,
  ExternalLink, ChevronRight, FileText, Compass, Edit3, Plus
} from "lucide-react"
import toast from "react-hot-toast"
import { ACADEMIC_MONTHS, MONTH_WEEKS_CONFIG } from "../academic-calendar"
import { formatDateSafe, getTrackingLevelBadge, parseEvaluationComment } from "../client"

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
  // Tabs: "timeline" (Default: Tiến trình 10 tháng), "initial" (Khảo sát 6 chiều kích), "new_log" (Ghi nhận / Phối hợp)
  const [activeTab, setActiveTab] = useState<"timeline" | "initial" | "new_log">("timeline")

  // Form state for adding/editing psychological evaluation log
  const [editingEvalId, setEditingEvalId] = useState<string | null>(null)
  const [newPeriodType, setNewPeriodType] = useState<"WEEK" | "MONTH">("MONTH")
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

  // Open quick evaluation form for a specific week or month
  const handleOpenEvaluationForPeriod = (periodName: string, periodType: "WEEK" | "MONTH", existingEval?: any) => {
    if (existingEval) {
      setEditingEvalId(existingEval.id)
      setNewPeriodType(existingEval.periodType === "WEEK" ? "WEEK" : "MONTH")
      setNewPeriod(existingEval.periodName || periodName)
      setNewTrackingLevel(existingEval.trackingLevel || "Có tiến bộ")
      const parsed = parseEvaluationComment(existingEval.comment)
      setNewComment(parsed.mainComment || existingEval.comment)
      setNewGvcnNote(parsed.gvcnFeedback || "")
      setNewPhhsNote(parsed.phhsFeedback || "")
    } else {
      setEditingEvalId(null)
      setNewPeriodType(periodType)
      setNewPeriod(periodName)
      setNewTrackingLevel("Có tiến bộ")
      setNewComment("")
      setNewGvcnNote("")
      setNewPhhsNote("")
    }
    setActiveTab("new_log")
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

      let targetId = s.targetId || s.id
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
            status: "TIẾP TỤC THEO TUẦN"
          })
        })
        const createdTarget = await createTargetRes.json()
        if (createdTarget.error) throw new Error(createdTarget.error)
        targetId = createdTarget.id
      }

      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveEvaluation",
          id: editingEvalId || undefined,
          targetId: targetId,
          periodType: newPeriodType,
          periodName: newPeriod,
          trackingLevel: newTrackingLevel,
          comment: compositeComment,
          isPsychological: true
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      toast.success(editingEvalId ? "Cập nhật đánh giá thành công!" : "Lưu nhật ký đánh giá thành công!")
      
      // Update local evaluations list
      if (editingEvalId) {
        const idx = s.evaluations.findIndex((e: any) => e.id === editingEvalId)
        if (idx !== -1) {
          s.evaluations[idx] = { ...s.evaluations[idx], ...data }
        }
      } else {
        s.evaluations = [data, ...(s.evaluations || [])]
      }

      // Reset form & return to timeline tab
      setEditingEvalId(null)
      setNewComment("")
      setNewGvcnNote("")
      setNewPhhsNote("")
      setActiveTab("timeline")

      if (onEvaluationSaved) {
        onEvaluationSaved(data)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Lỗi khi lưu nhận xét đánh giá")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isAttention = s.status === "CẦN THEO DÕI" || s.status === "CẦN CAN THIỆP" || (s.totalScore !== null && s.totalScore < 0)

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 z-50 transition-all animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        
        {/* Modal Header: Synchronized with Screenshot 3 */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-teal-900 via-[#003B3A] to-[#009085] text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-xs text-white">
              <Compass className="h-5 w-5 text-[#48BFE3]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  Hành trình tiến trình 10 tháng: {s.studentName}
                </h3>
              </div>
              <p className="text-xs text-teal-100 font-medium mt-0.5 flex flex-wrap items-center gap-2">
                <span>Lớp <strong>{s.className}</strong></span>
                <span>•</span>
                <span>Cơ sở <strong>{s.campusName}</strong></span>
                <span>•</span>
                <span>Môn <strong>{s.reason || "Tâm lý"}</strong></span>
                <span>•</span>
                <span>GV/Chuyên viên tham vấn: <strong className="text-white underline decoration-teal-300 underline-offset-2">{s.counselorName}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 text-teal-100 hover:text-white hover:bg-white/15 rounded-xl transition-all cursor-pointer no-print"
              title="In phiếu kết quả"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-teal-100 hover:text-white hover:bg-white/15 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Profile Info Bar */}
        <div className="px-6 py-3 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#003B3A] to-[#009085] text-white font-black text-xs flex items-center justify-center shadow-xs">
              {(s.studentName || "H").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900">{s.studentName}</span>
                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-mono text-[11px] font-bold border border-purple-200">
                  {s.studentCode}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-[10px] font-black border border-teal-200">
                  Lớp {s.className} (Lớp chủ nhiệm)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex flex-wrap items-center gap-2">
                <span>Bắt đầu theo dõi: <strong className="text-slate-700">{formatDateSafe(s.startDate)}</strong></span>
                <span>•</span>
                <span>Lý do: <strong className="text-slate-700">{s.reason || "Theo dõi tâm lý"}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Trạng thái</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border shadow-2xs ${
                isAttention
                  ? "bg-rose-100 text-rose-800 border-rose-200"
                  : "bg-purple-100 text-purple-800 border-purple-200"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isAttention ? "bg-rose-500 animate-pulse" : "bg-purple-500 animate-pulse"}`} />
                {s.status}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-2 no-print shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`py-3 px-4 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "timeline"
                ? "border-teal-700 text-teal-900 bg-teal-50/50"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            <Compass className="h-4 w-4 text-teal-700" />
            1. Hành trình tiến trình 10 tháng ({evaluations.length} mốc)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("initial")}
            className={`py-3 px-4 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "initial"
                ? "border-teal-700 text-teal-900 bg-teal-50/50"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            <Brain className="h-4 w-4 text-purple-600" />
            2. Hồ sơ & Khảo sát đầu vào (6 chiều kích)
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingEvalId(null)
              setNewPeriodType("MONTH")
              setNewPeriod(ACADEMIC_MONTHS[0] || "Tháng 8")
              setNewTrackingLevel("Có tiến bộ")
              setNewComment("")
              setNewGvcnNote("")
              setNewPhhsNote("")
              setActiveTab("new_log")
            }}
            className={`py-3 px-4 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "new_log"
                ? "border-teal-700 text-teal-900 bg-teal-50/50"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            <MessageSquare className="h-4 w-4 text-teal-700" />
            + {editingEvalId ? "Sửa nhận xét đánh giá" : "Ghi nhận đánh giá / Phối hợp"}
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* =========================================================================
              TAB 1: HÀNH TRÌNH TIẾN TRÌNH 10 THÁNG (CHUẨN SCREENSHOT 3)
              ========================================================================= */}
          {activeTab === "timeline" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="relative pl-6 border-l-2 border-teal-300 space-y-6">
                {ACADEMIC_MONTHS.map((m) => {
                  const allEvals = evaluations || []
                  const monthEvals = allEvals.filter((e: any) => 
                    e.periodName === m || (e.periodName && e.periodName.includes(m))
                  )
                  const weeksInMonth = MONTH_WEEKS_CONFIG[m] || ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"]
                  const monthlySummaryEval = monthEvals.find((e: any) => 
                    e.periodType === "MONTH" || e.periodName === m || e.periodName === `Tổng kết ${m}` || (!e.periodName?.includes("Tuần") && e.periodName?.includes(m))
                  )

                  const monthHasEvals = monthEvals.length > 0

                  return (
                    <div key={m} className="relative group">
                      {/* Month Node Bullet */}
                      <div className={`absolute -left-[35px] top-1 w-6 h-6 rounded-full border-2 border-white shadow-xs flex items-center justify-center text-white text-[10px] font-black ${
                        monthHasEvals 
                          ? "bg-gradient-to-tr from-[#003B3A] to-[#009085]" 
                          : "bg-slate-300 text-slate-600"
                      }`}>
                        {m.replace("Tháng ", "T")}
                      </div>

                      <div className={`border rounded-2xl p-4 shadow-xs space-y-3.5 transition-all ${
                        monthHasEvals 
                          ? "bg-white border-teal-200/90 hover:border-teal-400" 
                          : "bg-slate-50/60 border-slate-200"
                      }`}>
                        {/* Month Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-[#003B3A]">{m}</span>
                            <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                              monthHasEvals 
                                ? "bg-teal-50 border-teal-200 text-[#003B3A]" 
                                : "bg-slate-100 border-slate-200 text-slate-500"
                            }`}>
                              {monthEvals.length} / {weeksInMonth.length + 1} mốc đánh giá
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-400">
                              {weeksInMonth.length} tuần học
                            </span>
                          </div>
                        </div>

                        {/* Danh sách các Tuần trong Tháng */}
                        <div className="space-y-2">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-teal-600" />
                            <span>Tiến trình từng tuần:</span>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            {weeksInMonth.map((w: string) => {
                              const wEval = monthEvals.find((e: any) => 
                                (e.periodName && e.periodName.includes(w)) || 
                                e.periodName === w || 
                                e.periodName === `${w} - ${m}`
                              )

                              if (wEval) {
                                const badgeInfo = getTrackingLevelBadge(wEval.trackingLevel)
                                const IconComp = badgeInfo.icon
                                const parsed = parseEvaluationComment(wEval.comment)

                                return (
                                  <div
                                    key={w}
                                    className="p-3 rounded-xl border border-teal-200 bg-teal-50/40 space-y-2 transition-all hover:bg-teal-50/70"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-teal-100 text-[#003B3A] border border-teal-300 flex items-center gap-1">
                                          {w}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${badgeInfo.badge}`}>
                                          <IconComp className="w-3 h-3" />
                                          <span>{wEval.trackingLevel}</span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-semibold text-slate-500">
                                          {formatDateSafe(wEval.createdAt, "N/A")}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEvaluationForPeriod(`${w} - ${m}`, "WEEK", wEval)}
                                          className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                                        >
                                          Sửa
                                        </button>
                                      </div>
                                    </div>

                                    {/* Nhận xét chuyên môn */}
                                    <p className="text-xs text-slate-700 font-medium leading-relaxed pl-1">
                                      {parsed.mainComment || wEval.comment}
                                    </p>

                                    {/* Ý kiến phối hợp GVCN / PHHS */}
                                    {(parsed.gvcnFeedback || parsed.phhsFeedback) && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-teal-100 text-[11px]">
                                        {parsed.gvcnFeedback && (
                                          <div className="p-2 bg-white/80 rounded-lg border border-teal-200">
                                            <span className="font-bold text-teal-800">📌 Ý kiến GVCN: </span>
                                            <span className="text-slate-700">{parsed.gvcnFeedback}</span>
                                          </div>
                                        )}
                                        {parsed.phhsFeedback && (
                                          <div className="p-2 bg-white/80 rounded-lg border border-indigo-200">
                                            <span className="font-bold text-indigo-800">👨‍👩‍👧 Ý kiến PHHS: </span>
                                            <span className="text-slate-700">{parsed.phhsFeedback}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              }

                              // Chưa có đánh giá tuần này
                              return (
                                <div
                                  key={w}
                                  className="p-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2 hover:bg-slate-50"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md text-xs font-bold text-slate-600 bg-slate-200/80">
                                      {w}
                                    </span>
                                    <span className="text-xs text-slate-400 italic">
                                      Chưa đánh giá
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEvaluationForPeriod(`${w} - ${m}`, "WEEK")}
                                    className="text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100/80 border border-teal-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Đánh giá {w}</span>
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Tổng kết Tháng */}
                        <div className="pt-2 border-t border-slate-100">
                          {monthlySummaryEval ? (
                            (() => {
                              const badgeInfo = getTrackingLevelBadge(monthlySummaryEval.trackingLevel)
                              const IconComp = badgeInfo.icon
                              const parsed = parseEvaluationComment(monthlySummaryEval.comment)

                              return (
                                <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/50 space-y-2">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                        ⭐ Tổng kết {m}
                                      </span>
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${badgeInfo.badge}`}>
                                        <IconComp className="w-3 h-3" />
                                        <span>{monthlySummaryEval.trackingLevel}</span>
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-semibold text-slate-500">
                                        {formatDateSafe(monthlySummaryEval.createdAt, "N/A")}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEvaluationForPeriod(m, "MONTH", monthlySummaryEval)}
                                        className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                                      >
                                        Sửa
                                      </button>
                                    </div>
                                  </div>

                                  <p className="text-xs text-slate-700 font-medium leading-relaxed pl-1">
                                    {parsed.mainComment || monthlySummaryEval.comment}
                                  </p>

                                  {(parsed.gvcnFeedback || parsed.phhsFeedback) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-amber-200/80 text-[11px]">
                                      {parsed.gvcnFeedback && (
                                        <div className="p-2 bg-white/80 rounded-lg border border-amber-200">
                                          <span className="font-bold text-teal-800">📌 Ý kiến GVCN: </span>
                                          <span className="text-slate-700">{parsed.gvcnFeedback}</span>
                                        </div>
                                      )}
                                      {parsed.phhsFeedback && (
                                        <div className="p-2 bg-white/80 rounded-lg border border-indigo-200">
                                          <span className="font-bold text-indigo-800">👨‍👩‍👧 Ý kiến PHHS: </span>
                                          <span className="text-slate-700">{parsed.phhsFeedback}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })()
                          ) : (
                            <div className="p-2.5 rounded-xl border border-dashed border-amber-200 bg-amber-50/30 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                  ⭐ Tổng kết {m}
                                </span>
                                <span className="text-xs text-amber-700/60 italic">
                                  Chưa có đánh giá tổng kết tháng
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenEvaluationForPeriod(m, "MONTH")}
                                className="text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-100/70 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Tổng kết {m}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 2: HỒ SƠ & KHẢO SÁT ĐẦU VÀO (6 CHIỀU KÍCH)
              ========================================================================= */}
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
                    Vấn đề / Lý do hỗ trợ tâm lý
                  </span>
                  <p className="text-sm font-bold text-amber-950 mt-1.5 leading-snug">
                    {s.reason || "Chưa có nhận xét"}
                  </p>
                  <p className="text-[10px] text-amber-700 mt-1">
                    GV / Chuyên viên tham vấn: <strong>{s.counselorName}</strong>
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

          {/* =========================================================================
              TAB 3: GHI NHẬN ĐÁNH GIÁ / PHỐI HỢP GVCN
              ========================================================================= */}
          {activeTab === "new_log" && (
            <form onSubmit={handleCreateEvaluation} className="space-y-4 animate-in fade-in duration-200 max-w-2xl mx-auto">
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-start gap-3">
                <Brain className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
                <div className="text-xs text-teal-950 leading-relaxed">
                  <strong>Đồng hành & phối hợp hỗ trợ học sinh:</strong> Khi Thầy/Cô ghi nhận hoặc cập nhật đánh giá tâm lý cho kỳ này, dữ liệu sẽ được cập nhật đồng bộ vào tiến trình 10 tháng và thông báo đến Chuyên viên tham vấn cũng như GVCN lớp <strong>{s.className}</strong>.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Loại kỳ đánh giá *</label>
                  <select
                    value={newPeriodType}
                    onChange={e => setNewPeriodType(e.target.value as "WEEK" | "MONTH")}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="WEEK">Tiến trình theo Tuần</option>
                    <option value="MONTH">Tổng kết Tháng</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Kỳ / Tuần / Tháng *</label>
                  <input
                    type="text"
                    value={newPeriod}
                    onChange={e => setNewPeriod(e.target.value)}
                    placeholder="VD: Tuần 1 - Tháng 8 hoặc Tháng 8"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mức độ tiến bộ *</label>
                  <select
                    value={newTrackingLevel}
                    onChange={e => setNewTrackingLevel(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/20"
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
                  Nhận xét chuyên môn & quan sát diễn biến tâm lý định kỳ *
                </label>
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Ghi nhận các biểu hiện cảm xúc, tương tác với bạn bè, mức độ tập trung hoặc các tình huống đặc biệt trong kỳ..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/20"
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
                  onClick={() => setActiveTab("timeline")}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#003B3A] to-[#009085] hover:from-[#002a29] hover:to-[#007a70] text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Đang lưu...</span>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>{editingEvalId ? "Cập nhật đánh giá" : "Lưu & Cập nhật Tiến trình"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002a29] text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  )
}
