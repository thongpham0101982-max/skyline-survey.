"use client"
// @ts-nocheck

import React, { useState } from "react"
import {
  Sparkles,
  Award,
  Zap,
  Flame,
  Star,
  Users,
  CheckCircle2,
  RefreshCw,
  Share2,
  Trophy,
  ChevronRight,
  BookOpen,
  Calendar,
  AlertCircle,
  Clock,
  Heart,
  HelpCircle,
  Copy
} from "lucide-react"
import { MysticCardDeckModal } from "./MysticCardDeckModal"
import {
  abandonChallengeQuest,
  shareToInspirationDeck,
  adoptSharedChallenge
} from "@/app/teacher/ai-growth/actions"

interface TeacherQuestDashboardProps {
  profileData: any
  boardData?: any
}

const ALL_BADGES = [
  { code: "AI_WIZARD", name: "Phù Thủy AI", icon: "🤖", desc: "Ứng dụng AI sáng tạo trong 3 tiết dạy" },
  { code: "CLASSROOM_CONDUCTOR", name: "Nhạc Trưởng Lớp Học", icon: "🎤", desc: "Thực hiện thử thách trao quyền cho học sinh" },
  { code: "WOW_MAGNET", name: "Thỏi Nam Châm WOW", icon: "⭐", desc: "Nhận 5 khoảnh khắc WOW từ người dự giờ" },
  { code: "INSPIRATION_BEACON", name: "Ngọn Hải Đăng", icon: "🚀", desc: "Có 3 đồng nghiệp chọn 'Tôi cũng muốn thử' ý tưởng của bạn" },
  { code: "STEADY_FLAME", name: "Ngọn Lửa Bền Bỉ", icon: "🔥", desc: "Duy trì chuỗi tham gia đổi mới 3 tháng liên tiếp" }
]

export function TeacherQuestDashboard({
  profileData,
  boardData
}: TeacherQuestDashboardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "INSIGHTS" | "BADGES" | "BOARD">("ACTIVE")
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [selectedQuestToShare, setSelectedQuestToShare] = useState<any>(null)
  const [shareTitle, setShareTitle] = useState("")
  const [shareDescription, setShareDescription] = useState("")
  const [sharing, setSharing] = useState(false)
  const [showAiHint, setShowAiHint] = useState(false)
  const [adoptingId, setAdoptingId] = useState<string | null>(null)

  const { teacher, stats, activeQuest, completedQuests, badges } = profileData || {}
  const { levelInfo } = stats || {}

  const handleAbandon = async () => {
    if (!activeQuest) return
    if (!confirm("Thầy/Cô có chắc chắn muốn hủy thử thách này không? Sẽ không bị trừ điểm cảm hứng.")) return
    await abandonChallengeQuest(activeQuest.id)
    window.location.reload()
  }

  const handleOpenShare = (quest: any) => {
    setSelectedQuestToShare(quest)
    setShareTitle(quest.challenge.title)
    setShareDescription(quest.afterClassInsight || quest.challenge.description)
    setShareModalOpen(true)
  }

  const handleConfirmShare = async () => {
    if (!selectedQuestToShare || !shareTitle) return
    setSharing(true)
    try {
      const res = await shareToInspirationDeck(
        selectedQuestToShare.id,
        shareTitle,
        shareDescription
      )
      if (res.success) {
        alert(res.message)
        setShareModalOpen(false)
        window.location.reload()
      } else {
        alert(res.error || "Có lỗi xảy ra")
      }
    } catch (e) {
      alert("Lỗi kết nối máy chủ")
    } finally {
      setSharing(false)
    }
  }

  const handleAdopt = async (shareId: string) => {
    setAdoptingId(shareId)
    try {
      const res = await adoptSharedChallenge(shareId)
      if (res.success) {
        alert(res.message)
        window.location.reload()
      } else {
        alert(res.error || "Có lỗi xảy ra")
      }
    } catch (e) {
      alert("Lỗi kết nối máy chủ")
    } finally {
      setAdoptingId(null)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HERO GAMIFIED HEADER */}
      <div className="bg-gradient-to-br from-[#002B2A] via-[#003B3A] to-[#041F1E] border-2 border-teal-500/30 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-72 h-72 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: User Level & Identity */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-2xl sm:text-3xl shadow-[0_0_30px_rgba(245,158,11,0.4)] border-2 border-white/40 shrink-0">
              {levelInfo?.levelIcon || "🌱"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-widest bg-amber-400/20 text-amber-300 px-3 py-0.5 rounded-full border border-amber-400/30">
                  {levelInfo?.levelName || "Người Khởi Động"} (Cấp {levelInfo?.level || 1})
                </span>
                <span className="text-xs text-teal-200/80 font-medium">
                  {teacher?.department} • {teacher?.campus}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
                {teacher?.name || "Thầy/Cô Sky-Line"}
              </h1>
              <p className="text-xs text-teal-100/70 font-medium mt-0.5">
                "Mỗi tiết dạy, một thử nghiệm mới – Thắp lửa sáng tạo sư phạm!"
              </p>
            </div>
          </div>

          {/* Right: 3 Key Metrics Pills */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 text-center">
              <div className="text-xs text-amber-300 font-bold flex items-center justify-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-amber-300" /> Điểm Cảm Hứng
              </div>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">
                {stats?.totalPoints || 0} <span className="text-xs font-bold text-amber-400">IP</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 text-center">
              <div className="text-xs text-orange-400 font-bold flex items-center justify-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-orange-400" /> Chuỗi Tháng
              </div>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">
                {stats?.currentStreak || 0} <span className="text-xs font-medium text-teal-200">tháng</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 text-center">
              <div className="text-xs text-yellow-300 font-bold flex items-center justify-center gap-1">
                <Star className="w-3.5 h-3.5 fill-yellow-300" /> WOW Moment
              </div>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">
                {stats?.totalWowCount || 0} <span className="text-xs font-medium text-teal-200">lần</span>
              </div>
            </div>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-teal-500/20">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-teal-200">
              Tiến trình thăng cấp: <strong>{levelInfo?.currentPoints || 0}</strong> / {levelInfo?.nextLevelPoints || 300} IP
            </span>
            <span className="text-amber-300 font-bold">
              {levelInfo?.pointsNeeded > 0
                ? `Còn ${levelInfo?.pointsNeeded} IP để lên ${levelInfo?.level + 1 === 2 ? "Người Gieo Hạt" : levelInfo?.level + 1 === 3 ? "Bậc Thầy Sáng Tạo" : "Đại Sứ Đổi Mới"}`
                : "Đã đạt cấp độ tối đa!"}
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-black/40 overflow-hidden p-0.5 border border-teal-500/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 transition-all duration-1000 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
              style={{ width: `${levelInfo?.progressPercent || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab("ACTIVE")}
          className={`px-4 py-2 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "ACTIVE"
              ? "bg-[#003B3A] text-white shadow-md shadow-teal-950/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" /> Nhiệm Vụ Của Tôi
        </button>

        <button
          onClick={() => setActiveTab("INSIGHTS")}
          className={`px-4 py-2 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "INSIGHTS"
              ? "bg-[#003B3A] text-white shadow-md shadow-teal-950/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Sparkles className="w-4 h-4 text-teal-300" /> Dấu Ấn Tiết Dạy ({completedQuests?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab("BADGES")}
          className={`px-4 py-2 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "BADGES"
              ? "bg-[#003B3A] text-white shadow-md shadow-teal-950/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Trophy className="w-4 h-4 text-yellow-400" /> Tủ Huy Hiệu ({badges?.length || 0}/5)
        </button>

        <button
          onClick={() => setActiveTab("BOARD")}
          className={`px-4 py-2 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "BOARD"
              ? "bg-[#003B3A] text-white shadow-md shadow-teal-950/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Award className="w-4 h-4 text-indigo-400" /> Bảng Cảm Hứng & Kho Ý Tưởng
        </button>
      </div>

      {/* 3. TAB CONTENT */}
      {activeTab === "ACTIVE" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Quest (Left 2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {activeQuest ? (
              <div className="bg-gradient-to-br from-teal-950 via-[#003B3A] to-slate-900 border-2 border-amber-400/40 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30">
                      Nhiệm Vụ Đang Thực Hiện
                    </span>
                    <span className="text-xs text-teal-200/80 font-medium">
                      Nhận ngày {new Date(activeQuest.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>

                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase ${
                    activeQuest.challenge.rarityTier === "EPIC_AI"
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                      : activeQuest.challenge.rarityTier === "RARE"
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  }`}>
                    {activeQuest.challenge.rarityTier === "EPIC_AI" ? "🟣 Huyền Thoại AI" : activeQuest.challenge.rarityTier === "RARE" ? "🔵 Đột Phá" : "🟢 Khởi Sắc"}
                  </span>
                </div>

                <div className="my-4">
                  <h3 className="text-xl font-black text-white mb-2">
                    {activeQuest.challenge.title}
                  </h3>
                  <p className="text-xs text-teal-100/90 leading-relaxed mb-4">
                    {activeQuest.challenge.description}
                  </p>

                  <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2 text-xs text-teal-200 mb-4">
                    <Award className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong>Mục tiêu sư phạm:</strong> {activeQuest.challenge.pedagogicalGoal}</span>
                  </div>

                  {activeQuest.observationSlot ? (
                    <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-2xl text-xs text-teal-200 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-teal-300 shrink-0" />
                      <span>
                        Đã gắn với Tiết dạy: <strong>{activeQuest.observationSlot.subjectName}</strong> - Lớp <strong>{activeQuest.observationSlot.className || activeQuest.className || "Phổ thông"}</strong> ngày {new Date(activeQuest.observationSlot.date).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-200 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>Thử thách đang chờ Thầy/Cô thực hiện trong tiết dạy sắp tới.</span>
                    </div>
                  )}
                </div>

                {/* AI Hint Drawer */}
                {showAiHint && (
                  <div className="p-4 bg-purple-950/60 border border-purple-500/40 rounded-2xl text-xs text-purple-200 mb-4 animate-in fade-in duration-200">
                    <h5 className="font-bold text-amber-300 flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Gợi Ý Chuẩn Bị Tiết Dạy Từ AI:
                    </h5>
                    <p className="leading-relaxed">
                      {activeQuest.challenge.aiPromptHint || "Hãy chuẩn bị tâm thế tự nhiên, giao quyền cho học sinh và lắng nghe phản hồi của các em. Không cần hoàn hảo, chỉ cần dám thử nghiệm!"}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAiHint(!showAiHint)}
                    className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    {showAiHint ? "Ẩn gợi ý AI" : "Xem gợi ý AI"}
                  </button>

                  <button
                    type="button"
                    onClick={handleAbandon}
                    className="text-xs text-rose-300/80 hover:text-rose-200 underline cursor-pointer"
                  >
                    Hủy thử thách này
                  </button>
                </div>
              </div>
            ) : (
              /* No Active Quest Card */
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    Thầy/Cô Chưa Có Thử Thách Nào Đang Thực Hiện
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Hãy bốc 3 thẻ bài bí ẩn để nhận một gợi ý đổi mới nhẹ nhàng cho tiết dạy sắp tới và tích lũy thêm điểm cảm hứng!
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/30 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Zap className="w-5 h-5 fill-slate-950" /> Bốc 3 Thẻ Bài Bí Ẩn Ngay
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions & Side Widget (Right 1 Col) */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-amber-500/10 via-teal-500/5 to-transparent border border-amber-400/30 rounded-3xl p-6 space-y-4">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Bảng Thưởng Inspiration Points
              </h4>
              <ul className="text-xs space-y-2 text-slate-600">
                <li className="flex justify-between py-1 border-b border-slate-100">
                  <span>Nhận thử thách mới</span>
                  <strong className="text-amber-600">+10 IP</strong>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-100">
                  <span>Hoàn thành tiết dạy đổi mới</span>
                  <strong className="text-emerald-600">+100 IP</strong>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-100">
                  <span>Thử thách AI Huyền Thoại</span>
                  <strong className="text-purple-600">+150 IP</strong>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-100">
                  <span>Nhận khoảnh khắc WOW</span>
                  <strong className="text-amber-600">+30 IP</strong>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-100">
                  <span>Đồng nghiệp chọn "Nên lan tỏa"</span>
                  <strong className="text-sky-600">+50 IP</strong>
                </li>
                <li className="flex justify-between py-1">
                  <span>Chia sẻ vào Kho Cảm Hứng</span>
                  <strong className="text-emerald-600">+30 IP</strong>
                </li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-3 shadow-sm">
              <span className="text-2xl">🎲</span>
              <h5 className="font-bold text-sm text-slate-800">Muốn đổi sang thử thách khác?</h5>
              <p className="text-xs text-slate-500">
                Thầy/Cô có thể bốc lại bất cứ lúc nào khi chưa gắn vào tiết dạy chính thức.
              </p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Mở Vòng Bốc Thẻ Bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB INSIGHTS (Dấu ấn tiết dạy) */}
      {activeTab === "INSIGHTS" && (
        <div className="space-y-4">
          {completedQuests?.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl text-slate-500">
              <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm font-bold">Chưa có dấu ấn tiết dạy nào</p>
              <p className="text-xs mt-1">Sau khi hoàn thành thử thách và được người dự ghi nhận, AI sẽ tự động viết cảm nhận sư phạm tặng riêng cho Thầy/Cô.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedQuests.map((q) => (
                <div
                  key={q.id}
                  className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                        Đã Hoàn Thành
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {q.completedAt ? new Date(q.completedAt).toLocaleDateString("vi-VN") : ""}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-slate-800 mb-2">
                      {q.challenge.title}
                    </h4>

                    {q.afterClassInsight ? (
                      <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-900 leading-relaxed italic">
                        "{q.afterClassInsight}"
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">
                        Đang chờ AI tổng hợp dấu ấn tiết dạy...
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      {q.wowMoments?.length > 0 && (
                        <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                          ⭐ {q.wowMoments.length} WOW
                        </span>
                      )}
                      <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-lg">
                        +{q.earnedPoints || 100} IP
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenShare(q)}
                      className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#003B3A] font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Lan Tỏa (+30 IP)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB BADGES (Tủ huy hiệu) */}
      {activeTab === "BADGES" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {ALL_BADGES.map((b) => {
            const isUnlocked = badges?.includes(b.code)
            return (
              <div
                key={b.code}
                className={`p-6 rounded-3xl border text-center transition-all ${
                  isUnlocked
                    ? "bg-gradient-to-br from-amber-500/10 via-amber-100/30 to-white border-amber-400 shadow-md shadow-amber-500/10"
                    : "bg-slate-50 border-slate-200 opacity-60"
                }`}
              >
                <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center text-3xl mb-3 shadow-inner ${
                  isUnlocked ? "bg-amber-400/20 border border-amber-400" : "bg-slate-200"
                }`}>
                  {b.icon}
                </div>
                <h4 className="font-black text-base text-slate-800 mb-1">{b.name}</h4>
                <p className="text-xs text-slate-500 mb-3">{b.desc}</p>
                <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                  isUnlocked
                    ? "bg-amber-400 text-slate-950 shadow-sm"
                    : "bg-slate-200 text-slate-500"
                }`}>
                  {isUnlocked ? "★ ĐÃ MỞ KHÓA ★" : "CHƯA ĐẠT"}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* 6. TAB BOARD (Bảng cảm hứng & Kho ý tưởng) */}
      {activeTab === "BOARD" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Shared Inspiration Trading Cards */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Kho Ý Tưởng Sư Phạm Đang Lan Tỏa
            </h3>

            {boardData?.sharedCards?.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl text-slate-500 text-xs">
                Chưa có ý tưởng nào được chia sẻ. Thầy/Cô hãy là người đầu tiên lan tỏa ý tưởng sau tiết dạy!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {boardData?.sharedCards?.map((card: any) => (
                  <div
                    key={card.id}
                    className="bg-white border border-teal-500/20 hover:border-amber-400 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="font-bold text-slate-700">{card.teacher?.teacherName}</span>
                        <span>{card.teacher?.campus?.campusName || "Sky-Line"}</span>
                      </div>
                      <h4 className="font-black text-base text-slate-800 mb-2 leading-snug">
                        {card.title}
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-3">
                        {card.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500">
                        Đã có <strong>{card.adoptionCount || 0}</strong> GV thử nghiệm
                      </span>

                      <button
                        type="button"
                        onClick={() => handleAdopt(card.id)}
                        disabled={adoptingId === card.id}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                      >
                        {adoptingId === card.id ? "Đang nhận..." : "Tôi cũng muốn thử →"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right 1 Col: Hall of Fame Leaderboard */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" /> Bảng Ngôi Sao Truyền Cảm Hứng
            </h3>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm divide-y divide-slate-100">
              {boardData?.leaderboard?.map((item: any) => (
                <div key={item.teacherId} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                      item.rank === 1
                        ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-500/30"
                        : item.rank === 2
                        ? "bg-slate-300 text-slate-800"
                        : item.rank === 3
                        ? "bg-amber-700/20 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {item.rank}
                    </span>
                    <div>
                      <h5 className="font-bold text-xs text-slate-800 line-clamp-1">{item.teacherName}</h5>
                      <span className="text-[10px] text-slate-400">{item.departmentName}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-amber-600">{item.points} IP</span>
                    <span className="block text-[10px] text-slate-400">{item.levelIcon} {item.levelName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. SHARE MODAL */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-teal-600" /> Lan Tỏa Ý Tưởng Vào Kho Cảm Hứng
            </h3>
            <p className="text-xs text-slate-500">
              Chia sẻ kinh nghiệm thực hiện thử thách để đồng nghiệp cùng tham khảo. Thầy/Cô sẽ nhận ngay <strong>+30 IP</strong> và thêm <strong>+20 IP</strong> mỗi khi có người thử theo!
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Tiêu đề ý tưởng:</label>
              <input
                type="text"
                value={shareTitle}
                onChange={(e) => setShareTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Mô tả cách làm & cảm nhận:</label>
              <textarea
                rows={4}
                value={shareDescription}
                onChange={(e) => setShareDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-600 leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmShare}
                disabled={sharing}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-700 to-teal-800 text-white font-black text-xs shadow-md"
              >
                {sharing ? "Đang chia sẻ..." : "Xác Nhận Lan Tỏa (+30 IP)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MYSTIC CARD DECK MODAL */}
      <MysticCardDeckModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAccepted={() => window.location.reload()}
      />
    </div>
  )
}
