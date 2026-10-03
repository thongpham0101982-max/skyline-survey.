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
  ChevronDown
} from "lucide-react"
import { recordCheerKudos } from "@/app/teacher/ai-growth/actions"

interface CheerObservationBarProps {
  quest: any // TeacherChallenge with challenge included
  teacherName?: string
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
  onFeedbackSaved
}: CheerObservationBarProps) {
  const [isImplemented, setIsImplemented] = useState(false)
  const [isEffective, setIsEffective] = useState(false)
  const [shouldSpread, setShouldSpread] = useState(false)
  const [selectedWow, setSelectedWow] = useState<string | null>(null)
  const [observerNote, setObserverNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showWowPicker, setShowWowPicker] = useState(false)

  if (!quest || !quest.challenge) return null

  const { challenge } = quest
  const isEpic = challenge.rarityTier === "EPIC_AI" || challenge.isAiChallenge
  const isRare = challenge.rarityTier === "RARE"

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
    <div className="bg-gradient-to-br from-teal-950/90 via-[#003B3A]/95 to-slate-900 border-2 border-amber-400/40 rounded-3xl p-5 sm:p-6 shadow-xl shadow-teal-950/30 text-white my-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Quest Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                Thử Thách Đổi Mới Cùng AI
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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className={`text-[11px] font-black px-3 py-1 rounded-full border uppercase tracking-wider ${
            isEpic
              ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
              : isRare
              ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
          }`}>
            {isEpic ? "🟣 Thẻ Huyền Thoại AI" : isRare ? "🔵 Thẻ Đột Phá" : "🟢 Thẻ Khởi Sắc"}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-teal-100/80 my-3 leading-relaxed">
        {challenge.description}
      </p>

      {submitted ? (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-emerald-200 animate-in fade-in duration-300">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <h5 className="font-bold text-sm text-white">Đã gửi lời cổ vũ thành công!</h5>
            <p className="text-xs text-emerald-200/80">
              Cảm ơn Thầy/Cô đã tiếp thêm động lực cho đồng nghiệp. Hệ thống đã ghi nhận Inspiration Points và AI đang chuẩn bị tổng hợp Dấu ấn tiết dạy.
            </p>
          </div>
        </div>
      ) : (
        /* Action form for observer */
        <div className="space-y-4 pt-2">
          {/* 3 One-Touch Cheer Buttons */}
          <div>
            <label className="text-xs font-bold text-teal-200 uppercase tracking-wider block mb-2">
              Ghi nhận nhanh (Cổ vũ đồng nghiệp):
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
                <span>Đã thực hiện</span>
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
                Tặng Khoảnh khắc WOW (+30 IP):
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
              Điều Thầy/Cô ấn tượng nhất trong tiết dạy (tùy chọn):
            </label>
            <input
              type="text"
              value={observerNote}
              onChange={(e) => setObserverNote(e.target.value)}
              placeholder="VD: Không khí thảo luận của các nhóm rất tự nhiên và học sinh tự tin trình bày..."
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
                <>Đang gửi cổ vũ...</>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Gửi Lời Cổ Vũ & Tặng Điểm
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
