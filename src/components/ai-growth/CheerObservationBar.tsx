"use client"
// @ts-nocheck

import React, { useState } from "react"
import {
  Sparkles,
  Heart,
  Share2,
  Award,
  Star,
  Send,
  CheckCircle2,
  Zap,
  Check,
  ChevronDown,
  Info,
  Clock,
  ThumbsUp,
  MessageSquare
} from "lucide-react"
import { recordCheerKudos } from "@/app/teacher/ai-growth/actions"

interface CheerObservationBarProps {
  quest: any // TeacherChallenge with challenge included
  teacherName?: string
  isReadOnly?: boolean
  onFeedbackSaved?: () => void
}

const WOW_CATEGORIES = [
  { id: "STUDENT_ENGAGEMENT", label: "Học sinh tham gia nổi bật", icon: "🙋" },
  { id: "CREATIVE_IDEA", label: "Ý tưởng sư phạm sáng tạo", icon: "💡" },
  { id: "EFFECTIVE_AI", label: "Ứng dụng AI hiệu quả", icon: "🤖" },
  { id: "SITUATION_HANDLING", label: "Xử lý tình huống khéo léo", icon: "🎯" },
  { id: "TIMELY_FEEDBACK", label: "Phản hồi học sinh thấu đáo", icon: "💬" },
  { id: "ACTIVITY_DESIGN", label: "Thiết kế hoạt động cuốn hút", icon: "🎪" }
]

export function CheerObservationBar({
  quest,
  teacherName = "Đồng nghiệp",
  isReadOnly = false,
  onFeedbackSaved
}: CheerObservationBarProps) {
  const [isImplemented, setIsImplemented] = useState(false)
  const [isEffective, setIsEffective] = useState(false)
  const [shouldSpread, setShouldSpread] = useState(false)
  const [selectedWow, setSelectedWow] = useState<string | null>(null)
  const [observerNote, setObserverNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!quest || !quest.challenge) return null

  const { challenge } = quest
  const isEpic = challenge.rarityTier === "EPIC_AI" || challenge.isAiChallenge
  const isRare = challenge.rarityTier === "RARE"

  const isCompleted = quest.status === "COMPLETED" || quest.status === "RECOGNIZED"
  const hasExistingObservations = quest.observations && quest.observations.length > 0
  const latestObs = hasExistingObservations ? quest.observations[0] : null
  const latestWow = quest.wowMoments && quest.wowMoments.length > 0 ? quest.wowMoments[0] : null

  const handleSubmit = async () => {
    if (!isImplemented && !isEffective && !shouldSpread && !selectedWow) {
      alert("Thầy/Cô vui lòng chọn ít nhất một phản hồi cổ vũ trước khi gửi.")
      return
    }

    setSubmitting(true)
    try {
      const res = await recordCheerKudos({
        teacherChallengeId: quest.id,
        isImplemented,
        isEffective,
        shouldSpread,
        observerNote,
        wowCategory: selectedWow || undefined
      })

      if (res.success) {
        setSubmitted(true)
        if (onFeedbackSaved) onFeedbackSaved()
      } else {
        alert(res.error || "Có lỗi xảy ra khi gửi cổ vũ")
      }
    } catch (e) {
      alert("Lỗi kết nối máy chủ")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-[#002B2A] via-[#003B3A] to-[#041F1E] border-2 border-amber-400/40 rounded-3xl p-5 sm:p-6 shadow-xl text-white my-5 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-60 h-60 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Sub-Criterion Disclaimer */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-teal-500/20">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.35)] shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                Tiêu Chí Phụ • Đổi Mới Cùng AI
              </span>
              <span className="text-xs text-teal-200/80">
                {teacherName} đang thực hiện
              </span>
            </div>
            <h4 className="text-base sm:text-lg font-black text-white mt-0.5">
              {challenge.title}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className={`text-[11px] font-black px-3 py-1 rounded-full border uppercase tracking-wider ${
            isEpic
              ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
              : isRare
              ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
          }`}>
            {isEpic ? "🟣 Huyền Thoại AI" : isRare ? "🔵 Đột Phá" : "🟢 Khởi Sắc"}
          </span>
          <span className="text-xs font-black text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
            +{challenge.basePoints || 100} IP
          </span>
        </div>
      </div>

      {/* Clear Sub-criterion Disclaimer Alert */}
      <div className="relative z-10 mt-3 p-3 bg-amber-400/10 border border-amber-400/30 rounded-2xl flex items-start gap-2.5 text-xs text-amber-200">
        <Info className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-amber-100">Tiêu chí phụ độc lập:</strong> Thử thách đổi mới sư phạm là tiêu chí cộng thêm nhằm khích lệ tinh thần dám thử nghiệm theo GDPT 2018 và EdTech.
          <strong className="text-amber-300"> Hoàn toàn KHÔNG tính vào điểm số đánh giá tiết dạy (20/20)</strong> và không ảnh hưởng đến xếp loại chính thức của Giáo viên.
        </div>
      </div>

      {/* Description & Pedagogical Goal */}
      <div className="relative z-10 my-3.5 space-y-2">
        <p className="text-xs text-teal-100/90 leading-relaxed">
          {challenge.description}
        </p>
        <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-teal-200 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400 shrink-0" />
          <span><strong>Mục tiêu sư phạm:</strong> {challenge.pedagogicalGoal}</span>
        </div>
      </div>

      {/* Display Completed / Evaluated Challenge Results */}
      {(isCompleted || submitted || (isReadOnly && hasExistingObservations)) ? (
        <div className="relative z-10 mt-4 p-5 bg-teal-950/70 border border-teal-500/40 rounded-2xl space-y-3.5 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h5 className="font-black text-sm text-white uppercase tracking-wider">
                Kết quả thực hiện thử thách sau đánh giá
              </h5>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ✓ Đã ghi nhận nỗ lực đổi mới
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400/20 text-amber-300 border border-amber-400/40">
                +{quest.earnedPoints || challenge.basePoints || 100} IP
              </span>
            </div>
          </div>

          {/* Observations Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className={`p-3 rounded-xl border flex items-center gap-2 ${
              (latestObs?.isImplemented || isImplemented)
                ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40 font-bold"
                : "bg-white/5 text-white/50 border-white/10"
            }`}>
              <span>👏</span>
              <span>{(latestObs?.isImplemented || isImplemented) ? "Đã thực hiện trong giờ" : "Chưa thực hiện"}</span>
            </div>

            <div className={`p-3 rounded-xl border flex items-center gap-2 ${
              (latestObs?.isEffective || isEffective)
                ? "bg-sky-500/20 text-sky-200 border-sky-500/40 font-bold"
                : "bg-white/5 text-white/50 border-white/10"
            }`}>
              <span>✨</span>
              <span>{(latestObs?.isEffective || isEffective) ? "Đạt hiệu quả tốt" : "Hiệu quả bình thường"}</span>
            </div>

            <div className={`p-3 rounded-xl border flex items-center gap-2 ${
              (latestObs?.shouldSpread || shouldSpread)
                ? "bg-amber-400/20 text-amber-200 border-amber-400/40 font-bold"
                : "bg-white/5 text-white/50 border-white/10"
            }`}>
              <span>🚀</span>
              <span>{(latestObs?.shouldSpread || shouldSpread) ? "Khuyến nghị nhân rộng" : "Không lan tỏa"}</span>
            </div>
          </div>

          {/* WOW Moment Awarded */}
          {(latestWow || selectedWow) && (
            <div className="p-3 bg-amber-400/15 border border-amber-400/30 rounded-xl flex items-center gap-2.5 text-xs text-amber-200">
              <Star className="w-4 h-4 fill-amber-300 text-amber-300 shrink-0" />
              <span>
                <strong>Khoảnh khắc WOW:</strong> Người dự giờ đã trao tặng điểm sáng <strong>"{latestWow?.category || selectedWow}"</strong> (+30 IP)
              </span>
            </div>
          )}

          {/* AI After-Class Insight */}
          {quest.afterClassInsight && (
            <div className="p-4 bg-purple-950/40 border border-purple-500/30 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-300 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Dấu Ấn Sư Phạm Tổng Hợp Từ AI
              </div>
              <p className="text-xs text-purple-100/90 leading-relaxed italic">
                "{quest.afterClassInsight}"
              </p>
            </div>
          )}

          {/* Observer's note if any */}
          {(latestObs?.observerNote || observerNote) && (
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-teal-200 flex items-start gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-teal-300 shrink-0 mt-0.5" />
              <p className="italic leading-relaxed">
                Người dự chia sẻ: "{latestObs?.observerNote || observerNote}"
              </p>
            </div>
          )}
        </div>
      ) : !isReadOnly ? (
        /* Action form for observer while evaluating */
        <div className="relative z-10 space-y-4 pt-2">
          {/* 3 One-Touch Cheer Buttons */}
          <div>
            <label className="text-xs font-bold text-teal-200 uppercase tracking-wider block mb-2">
              Ghi nhận nhanh từ Người Dự Giờ (Cổ vũ đồng nghiệp & Tặng IP):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setIsImplemented(!isImplemented)}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isImplemented
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/30 scale-102"
                    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                }`}
              >
                <span className="text-base">👏</span>
                <span>Đã thực hiện (+100 IP)</span>
                {isImplemented && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>

              <button
                type="button"
                onClick={() => setIsEffective(!isEffective)}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isEffective
                    ? "bg-sky-500 text-slate-950 border-sky-400 shadow-md shadow-sky-500/30 scale-102"
                    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                }`}
              >
                <span className="text-base">✨</span>
                <span>Có hiệu quả</span>
                {isEffective && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>

              <button
                type="button"
                onClick={() => setShouldSpread(!shouldSpread)}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  shouldSpread
                    ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/30 scale-102"
                    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                }`}
              >
                <span className="text-base">🚀</span>
                <span>Nên lan tỏa (+50 IP)</span>
                {shouldSpread && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            </div>
          </div>

          {/* WOW Moment Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-amber-300" />
                Trao tặng Khoảnh khắc WOW (+30 IP):
              </label>
              {selectedWow && (
                <button
                  type="button"
                  onClick={() => setSelectedWow(null)}
                  className="text-[11px] text-teal-300 hover:text-white underline cursor-pointer"
                >
                  Bỏ chọn
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {WOW_CATEGORIES.map((wow) => {
                const isPicked = selectedWow === wow.label
                return (
                  <button
                    key={wow.id}
                    type="button"
                    onClick={() => setSelectedWow(isPicked ? null : wow.label)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center gap-2 ${
                      isPicked
                        ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold border-amber-300 shadow-md shadow-amber-500/20"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="text-sm shrink-0">{wow.icon}</span>
                    <span className="truncate">{wow.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="text-xs font-medium text-teal-200/80 block mb-1.5">
              Điều Thầy/Cô ấn tượng nhất về thử thách này trong tiết dạy (tùy chọn):
            </label>
            <input
              type="text"
              value={observerNote}
              onChange={(e) => setObserverNote(e.target.value)}
              placeholder="VD: Học sinh hứng thú rõ rệt, thảo luận nhóm sôi nổi và tương tác tự nhiên..."
              className="w-full px-4 py-2.5 rounded-2xl bg-black/40 border border-teal-500/30 text-white text-xs placeholder:text-teal-300/40 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/30 cursor-pointer transition-all"
            >
              {submitting ? (
                <>Đang ghi nhận...</>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Ghi Nhận Tiêu Chí Phụ & Tặng Điểm Cảm Hứng
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
