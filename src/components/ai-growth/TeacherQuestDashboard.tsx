"use client"
// @ts-nocheck

import React, { useState, useMemo } from "react"
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
  Copy,
  Target,
  Bot,
  Layers,
  Search,
  Filter,
  TrendingUp,
  MessageSquare,
  Check,
  ShieldCheck,
  ArrowUpRight,
  Info,
  ThumbsUp
} from "lucide-react"
import dynamic from "next/dynamic"

const MysticCardDeckModal = dynamic(
  () => import("./MysticCardDeckModal").then((mod) => mod.MysticCardDeckModal),
  { ssr: false }
)
import {
  abandonChallengeQuest,
  shareToInspirationDeck,
  adoptSharedChallenge
} from "@/app/teacher/ai-growth/actions"

interface TeacherQuestDashboardProps {
  profileData: any
  boardData?: any
  synthesisData?: any
  trackingData?: any
  gamificationData?: any
}

const ALL_BADGES = [
  { code: "AI_WIZARD", name: "Phù Thủy AI", icon: "🤖", desc: "Ứng dụng AI sáng tạo trong 3 tiết dạy", req: 3 },
  { code: "CLASSROOM_CONDUCTOR", name: "Nhạc Trưởng Lớp Học", icon: "🎤", desc: "Thực hiện thử thách trao quyền cho học sinh", req: 1 },
  { code: "WOW_MAGNET", name: "Thỏi Nam Châm WOW", icon: "⭐", desc: "Nhận 5 khoảnh khắc WOW từ người dự giờ", req: 5 },
  { code: "INSPIRATION_BEACON", name: "Ngọn Hải Đăng", icon: "🚀", desc: "Có 3 đồng nghiệp chọn 'Tôi cũng muốn thử' ý tưởng của bạn", req: 3 },
  { code: "STEADY_FLAME", name: "Ngọn Lửa Bền Bỉ", icon: "🔥", desc: "Duy trì chuỗi tham gia đổi mới 3 tháng liên tiếp", req: 3 }
]

export function TeacherQuestDashboard({
  profileData,
  boardData,
  synthesisData,
  trackingData,
  gamificationData
}: TeacherQuestDashboardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"SYNTHESIS" | "ACTIVE" | "TRACKING" | "LEADERBOARD" | "BADGES">("SYNTHESIS")
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [selectedQuestToShare, setSelectedQuestToShare] = useState<any>(null)
  const [shareTitle, setShareTitle] = useState("")
  const [shareDescription, setShareDescription] = useState("")
  const [sharing, setSharing] = useState(false)
  const [showAiHint, setShowAiHint] = useState(false)
  const [adoptingId, setAdoptingId] = useState<string | null>(null)
  const [selectedInsightDetail, setSelectedInsightDetail] = useState<any>(null)

  // Tracking filters
  const [trackingStatusFilter, setTrackingStatusFilter] = useState("ALL")
  const [trackingSearch, setTrackingSearch] = useState("")

  const { teacher, stats, activeQuest, completedQuests, badges } = profileData || {}
  const { levelInfo } = stats || {}
  const synthesis = synthesisData?.success ? synthesisData : null
  const trackingRecords = trackingData?.records || []
  const gamification = gamificationData?.success ? gamificationData : null

  // Filter tracking records
  const filteredTracking = useMemo(() => {
    return trackingRecords.filter((r: any) => {
      if (trackingStatusFilter !== "ALL" && r.status !== trackingStatusFilter) return false
      if (trackingSearch.trim()) {
        const q = trackingSearch.toLowerCase().trim()
        const match =
          r.teacherName.toLowerCase().includes(q) ||
          r.teacherCode.toLowerCase().includes(q) ||
          r.challenge.title.toLowerCase().includes(q) ||
          r.subjectName.toLowerCase().includes(q) ||
          r.className.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [trackingRecords, trackingStatusFilter, trackingSearch])

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
    <div className="space-y-6 pb-16 font-sans">
      {/* 1. HERO GAMIFIED ENTERPRISE HEADER */}
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
                "Mỗi tiết dạy, một thử nghiệm đổi mới – Thắp lửa sáng tạo sư phạm cùng AI!"
              </p>
            </div>
          </div>

          {/* Right: Key Metrics Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <div className="text-[11px] text-amber-300 font-bold flex items-center justify-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-amber-300" /> Điểm Cảm Hứng
              </div>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">
                {stats?.totalPoints || 0} <span className="text-xs font-bold text-amber-400">IP</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <div className="text-[11px] text-orange-400 font-bold flex items-center justify-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-orange-400" /> Chuỗi Tháng
              </div>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">
                {stats?.currentStreak || 0} <span className="text-xs font-medium text-teal-200">tháng</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <div className="text-[11px] text-yellow-300 font-bold flex items-center justify-center gap-1">
                <Star className="w-3.5 h-3.5 fill-yellow-300" /> WOW Moment
              </div>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">
                {stats?.totalWowCount || 0} <span className="text-xs font-medium text-teal-200">lần</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <div className="text-[11px] text-emerald-300 font-bold flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Đã Đổi Mới
              </div>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">
                {stats?.totalCompleted || 0} <span className="text-xs font-medium text-teal-200">tiết</span>
              </div>
            </div>
          </div>
        </div>

        {/* Level Progression Progress Bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-teal-500/20">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-teal-200">
              Tiến trình thăng cấp sư phạm: <strong>{levelInfo?.currentPoints || 0}</strong> / {levelInfo?.nextLevelPoints || 300} IP
            </span>
            <span className="text-amber-300 font-bold">
              {levelInfo?.pointsNeeded > 0
                ? `Còn ${levelInfo?.pointsNeeded} IP để thăng hạng ${levelInfo?.level + 1 === 2 ? "Người Gieo Hạt" : levelInfo?.level + 1 === 3 ? "Bậc Thầy Sáng Tạo" : "Đại Sứ Đổi Mới"}`
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
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2 text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab("SYNTHESIS")}
          className={`px-4 py-2.5 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === "SYNTHESIS"
              ? "bg-[#003B3A] text-white shadow-md shadow-teal-950/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Target className="w-4 h-4 text-emerald-400" />
          <span>Hồ Sơ Sư Phạm & Tổng Hợp Nhận Xét AI</span>
        </button>

        <button
          onClick={() => setActiveTab("ACTIVE")}
          className={`px-4 py-2.5 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === "ACTIVE"
              ? "bg-[#003B3A] text-white shadow-md shadow-teal-950/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Thử Thách Của Tôi {activeQuest ? "(Đang làm)" : ""}</span>
        </button>

        <button
          onClick={() => setActiveTab("TRACKING")}
          className={`px-4 py-2.5 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === "TRACKING"
              ? "bg-[#003B3A] text-white shadow-md shadow-teal-950/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Layers className="w-4 h-4 text-sky-400" />
          <span>Bảng Theo Dõi Thực Hiện Toàn Trường ({trackingRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("LEADERBOARD")}
          className={`px-4 py-2.5 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === "LEADERBOARD"
              ? "bg-[#003B3A] text-white shadow-md shadow-teal-950/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Bảng Vinh Danh Sư Phạm & Game Hóa</span>
        </button>

        <button
          onClick={() => setActiveTab("BADGES")}
          className={`px-4 py-2.5 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === "BADGES"
              ? "bg-[#003B3A] text-white shadow-md shadow-teal-950/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Award className="w-4 h-4 text-purple-400" />
          <span>Dấu Ấn & Tủ Huy Hiệu ({badges?.length || 0}/5)</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 3. TAB 1: HỒ SƠ SƯ PHẠM & TỔNG HỢP NHẬN XÉT AI (SYNTHESIS)     */}
      {/* ============================================================== */}
      {activeTab === "SYNTHESIS" && (
        <div className="space-y-6">
          {synthesis ? (
            <>
              {/* KPIs Overview Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tiết dạy đã dự & nộp phiếu</span>
                    <div className="text-2xl font-black text-slate-900 mt-0.5">
                      {synthesis.stats.totalEvaluatedSlots} <span className="text-xs font-bold text-slate-500">tiết</span>
                      <span className="text-xs font-normal text-slate-400 ml-1.5">({synthesis.stats.totalEvaluations} lượt đánh giá)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Điểm đánh giá trung bình</span>
                    <div className="text-2xl font-black text-emerald-700 mt-0.5">
                      {synthesis.stats.avgScore} <span className="text-xs font-bold text-slate-500">/ 20.00đ</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cơ cấu xếp loại tiết dạy</span>
                    <div className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {synthesis.stats.ratingStats?.Giỏi || 0} Giỏi
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-sky-100 text-sky-800 border border-sky-200">
                        {synthesis.stats.ratingStats?.Khá || 0} Khá
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                        {synthesis.stats.ratingStats?.["Trung bình"] || 0} TB
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Pedagogical Advice & GDPT 2018 Orientation */}
              <div className="bg-gradient-to-br from-teal-950 via-[#003B3A] to-slate-900 border-2 border-teal-500/30 rounded-3xl p-6 text-white shadow-xl space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                      <Bot className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                        AI Pedagogical Mentor
                      </span>
                      <h3 className="text-lg font-black text-white mt-0.5">
                        Tư Vấn Đổi Mới Sư Phạm Cùng AI Theo GDPT 2018
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/30 cursor-pointer transition-all"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" /> Bốc Thẻ Thử Thách Cá Nhân Hóa
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                    <h5 className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Tổng Hợp Phong Cách Sư Phạm:
                    </h5>
                    <p className="text-teal-100/90 leading-relaxed">
                      {synthesis.aiConsultation?.summary}
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                    <h5 className="font-bold text-sky-300 flex items-center gap-1.5">
                      <Target className="w-4 h-4" /> Định Hướng Chương Trình GDPT 2018:
                    </h5>
                    <p className="text-teal-100/90 leading-relaxed">
                      {synthesis.aiConsultation?.gdptOrientation}
                    </p>
                  </div>
                </div>

                {/* Detected Growth Themes Pills */}
                {synthesis.detectedThemes && synthesis.detectedThemes.length > 0 && (
                  <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-teal-200">Chủ đề đổi mới trọng tâm:</span>
                    {synthesis.detectedThemes.map((th: any, idx: number) => (
                      <div
                        key={idx}
                        className="px-3 py-1 rounded-xl bg-amber-400/20 text-amber-200 border border-amber-400/30 text-xs font-bold flex items-center gap-1.5"
                      >
                        <span>●</span>
                        <span>{th.theme}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 11 K-12 Rubric Criteria Breakdown */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-teal-600" /> Bảng Phân Tích 11 Tiêu Chí Dạy Học (K-12)
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Điểm trung bình và tỷ lệ đạt chuẩn của Thầy/Cô qua các lần dự giờ
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    Chuẩn tối đa 20.00đ
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {synthesis.criteriaStats.map((c: any) => {
                    const isHigh = c.percent >= 90
                    const isMed = c.percent >= 70 && c.percent < 90
                    return (
                      <div
                        key={c.code}
                        className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-xl bg-teal-100 text-teal-900 font-black text-xs flex items-center justify-center shrink-0">
                              {c.code}
                            </span>
                            <span className="text-xs font-bold text-slate-800 line-clamp-1">
                              {c.name}
                            </span>
                          </div>
                          <span className={`text-xs font-black px-2 py-0.5 rounded-lg border ${
                            isHigh
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isMed
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {c.avg} / {c.max}đ ({c.percent}%)
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isHigh ? "bg-emerald-500" : isMed ? "bg-sky-500" : "bg-amber-500"
                            }`}
                            style={{ width: `${Math.min(100, c.percent)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Real Observer Strengths & Improvements Quotes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths Quotes */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <ThumbsUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Điểm Sáng & Khen Ngợi Từ Người Dự Giờ
                      </h4>
                      <p className="text-[11px] text-slate-500">Trích xuất từ các phiếu dự giờ của đồng nghiệp</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {synthesis.strengthsList && synthesis.strengthsList.length > 0 ? (
                      synthesis.strengthsList.map((s: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-xs space-y-1"
                        >
                          <p className="text-slate-800 font-medium leading-relaxed italic">
                            "{s.text}"
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Người dự: <strong>{s.observer}</strong></span>
                            <span>{s.topic} {s.date ? `• ${s.date}` : ""}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">Chưa có nhận xét ưu điểm nào được ghi nhận.</p>
                    )}
                  </div>
                </div>

                {/* Improvements Quotes */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Dư Địa Đổi Mới & Góp Ý Chuyên Môn
                      </h4>
                      <p className="text-[11px] text-slate-500">Cơ sở thực tiễn để AI đề xuất thử thách phù hợp</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {synthesis.improvementsList && synthesis.improvementsList.length > 0 ? (
                      synthesis.improvementsList.map((imp: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 bg-amber-50/60 border border-amber-100 rounded-2xl text-xs space-y-1"
                        >
                          <p className="text-slate-800 font-medium leading-relaxed italic">
                            "{imp.text}"
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Người dự: <strong>{imp.observer}</strong></span>
                            <span>{imp.topic} {imp.date ? `• ${imp.date}` : ""}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">Chưa có góp ý cải thiện nào được ghi nhận.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl text-slate-500 space-y-3">
              <Bot className="w-10 h-10 text-teal-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-800">Chưa Đủ Dữ Liệu Dự Giờ Để Tổng Hợp</h4>
              <p className="text-xs max-w-md mx-auto">
                Hệ thống sẽ tự động phân tích và tạo hồ sơ sư phạm AI ngay khi Thầy/Cô có phiếu đánh giá dự giờ đầu tiên được nộp.
              </p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="px-6 py-2.5 rounded-2xl bg-[#003B3A] text-white font-bold text-xs"
              >
                Bốc Thẻ Thử Thách Khởi Động
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. TAB 2: THỬ THÁCH CỦA TÔI (ACTIVE QUEST)                     */}
      {/* ============================================================== */}
      {activeTab === "ACTIVE" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

                <div className="my-4 space-y-3">
                  <h3 className="text-xl font-black text-white">
                    {activeQuest.challenge.title}
                  </h3>
                  <p className="text-xs text-teal-100/90 leading-relaxed">
                    {activeQuest.challenge.description}
                  </p>

                  <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2 text-xs text-teal-200">
                    <Award className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong>Mục tiêu sư phạm:</strong> {activeQuest.challenge.pedagogicalGoal}</span>
                  </div>

                  {/* Sub-criterion clear reminder */}
                  <div className="p-3 bg-amber-400/10 border border-amber-400/30 rounded-2xl text-xs text-amber-200 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                    <span>
                      <strong>Tiêu chí phụ:</strong> Thử thách không tính vào điểm số 20/20 của tiết dạy. Người dự giờ sẽ cổ vũ và gửi tặng Điểm Cảm Hứng sau tiết học!
                    </span>
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
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    Thầy/Cô Chưa Có Thử Thách Nào Đang Thực Hiện
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Hãy bốc 3 thẻ bài bí ẩn được AI cá nhân hóa theo hồ sơ dự giờ của Thầy/Cô để tích lũy thêm điểm cảm hứng!
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

          {/* Right Column: IP Rules & Quick Actions */}
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
                Thầy/Cô có thể bốc lại bất cứ lúc nào khi chưa tiến hành dự giờ chính thức.
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

      {/* ============================================================== */}
      {/* 5. TAB 3: BẢNG THEO DÕI THỰC HIỆN TOÀN TRƯỜNG (TRACKING)       */}
      {/* ============================================================== */}
      {activeTab === "TRACKING" && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-600" /> Bảng Theo Dõi Thực Hiện Thử Thách Đổi Mới Toàn Trường
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi tiến độ, kết quả thực hiện và dấu ấn sư phạm của các giáo viên tham gia thử thách
              </p>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm giáo viên, môn, lớp..."
                  value={trackingSearch}
                  onChange={(e) => setTrackingSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 w-48 sm:w-60"
                />
              </div>

              <select
                value={trackingStatusFilter}
                onChange={(e) => setTrackingStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="COMPLETED">Đã hoàn thành</option>
                <option value="ACCEPTED">Đang thực hiện</option>
              </select>
            </div>
          </div>

          {/* Tracking Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3">Giáo viên & Đơn vị</th>
                  <th className="py-3 px-3">Tiết dạy & Môn</th>
                  <th className="py-3 px-3">Thử thách đổi mới</th>
                  <th className="py-3 px-3 text-center">Ghi nhận người dự</th>
                  <th className="py-3 px-3 text-center">Khoảnh khắc WOW</th>
                  <th className="py-3 px-3 text-center">Điểm Cảm Hứng</th>
                  <th className="py-3 px-3 text-center">Dấu ấn AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTracking.length > 0 ? (
                  filteredTracking.map((rec: any) => {
                    const isDone = rec.status === "COMPLETED" || rec.status === "RECOGNIZED"
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-900">{rec.teacherName}</div>
                          <div className="text-[11px] text-slate-500">{rec.departmentName} • {rec.campusName}</div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-800">{rec.subjectName} - {rec.className}</div>
                          <div className="text-[11px] text-slate-500">{rec.topic}</div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-bold text-teal-900 flex items-center gap-1.5">
                            <span className="text-amber-500">★</span>
                            <span>{rec.challenge.title}</span>
                          </div>
                          <span className={`inline-block mt-0.5 px-2 py-0.2 rounded-full text-[9px] font-black uppercase ${
                            rec.challenge.rarityTier === "EPIC_AI"
                              ? "bg-purple-100 text-purple-800"
                              : rec.challenge.rarityTier === "RARE"
                              ? "bg-sky-100 text-sky-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {rec.challenge.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          {isDone ? (
                            <div className="flex items-center justify-center gap-1 text-[11px]">
                              {rec.isImplemented && <span title="Đã thực hiện">👏</span>}
                              {rec.isEffective && <span title="Có hiệu quả">✨</span>}
                              {rec.shouldSpread && <span title="Nên lan tỏa">🚀</span>}
                              {!rec.isImplemented && !rec.isEffective && !rec.shouldSpread && (
                                <span className="text-slate-400">Đã dự</span>
                              )}
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Đang triển khai
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          {rec.wowMoments && rec.wowMoments.length > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              <span>{rec.wowMoments.length} WOW</span>
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span className="font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                            +{rec.earnedPoints || 100} IP
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          {rec.afterClassInsight ? (
                            <button
                              type="button"
                              onClick={() => setSelectedInsightDetail(rec)}
                              className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 font-bold hover:bg-purple-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" /> Xem dấu ấn
                            </button>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Chờ đánh giá</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                      Không tìm thấy thử thách nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. TAB 4: BẢNG VINH DANH SƯ PHẠM & GAME HÓA (LEADERBOARD)      */}
      {/* ============================================================== */}
      {activeTab === "LEADERBOARD" && (
        <div className="space-y-6">
          {/* Top 3 Metric Highlights */}
          {gamification && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-5 text-center shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng thử thách đã nhận</span>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {gamification.metrics?.totalChallengesAttempted || 0}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 text-center shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tiết dạy hoàn thành đổi mới</span>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  {gamification.metrics?.totalCompleted || 0}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 text-center shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Khoảnh khắc WOW trao tặng</span>
                <div className="text-2xl font-black text-amber-600 mt-1">
                  {gamification.metrics?.totalWowMoments || 0}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 text-center shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Điểm cảm hứng tích lũy toàn trường</span>
                <div className="text-2xl font-black text-purple-700 mt-1">
                  {gamification.metrics?.totalPointsAwarded || 0} <span className="text-xs font-bold">IP</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Top 10 Bảng Vàng Cảm Hứng */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Bảng Vàng Cảm Hứng (Top 10 IP)
                    </h4>
                    <p className="text-xs text-slate-500">Giáo viên tiên phong đổi mới và tích lũy nhiều điểm nhất</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {(boardData?.leaderboard || gamification?.topTeachers || []).map((t: any, idx: number) => {
                  const isTop1 = idx === 0
                  const isTop2 = idx === 1
                  const isTop3 = idx === 2
                  return (
                    <div
                      key={t.teacherId || idx}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isTop1
                          ? "bg-gradient-to-r from-amber-50 to-amber-100/50 border-amber-300 shadow-xs"
                          : isTop2
                          ? "bg-slate-50/80 border-slate-300"
                          : isTop3
                          ? "bg-amber-50/30 border-amber-200"
                          : "bg-white border-slate-150 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          isTop1
                            ? "bg-amber-500 text-slate-950 shadow-sm"
                            : isTop2
                            ? "bg-slate-300 text-slate-800"
                            : isTop3
                            ? "bg-amber-600/80 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {isTop1 ? "🥇" : isTop2 ? "🥈" : isTop3 ? "🥉" : idx + 1}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            <span>{t.teacherName}</span>
                            <span className="text-[10px] text-slate-400">({t.levelName || "Cấp 1"})</span>
                          </div>
                          <div className="text-[11px] text-slate-500">{t.departmentName} • {t.campusName}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                          {t.points} IP
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right: Top WOW Ambassadors & Most Adopted Ideas */}
            <div className="space-y-6">
              {/* Top WOW Ambassadors */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Đại Sứ Khoảnh Khắc WOW
                    </h4>
                    <p className="text-xs text-slate-500">Giáo viên được đồng nghiệp vinh danh điểm sáng nhiều nhất</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {(gamification?.topWowTeachers || []).map((w: any, idx: number) => (
                    <div
                      key={w.id || idx}
                      className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-2xl flex items-center justify-between text-xs"
                    >
                      <div className="font-bold text-slate-800">
                        {idx + 1}. {w.teacherName} <span className="text-slate-400 font-normal">({w.campusName})</span>
                      </div>
                      <span className="font-black text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                        ★ {w.count} WOW Moments
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shared Inspiration Cards Library */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-teal-600" />
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        Kho Ý Tưởng Lan Tỏa ("Tôi Cũng Muốn Thử")
                      </h4>
                      <p className="text-xs text-slate-500">Đồng nghiệp áp dụng ý tưởng sáng tạo từ nhau</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {(boardData?.sharedCards || []).map((sh: any) => (
                    <div
                      key={sh.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-slate-900">{sh.title}</span>
                        <span className="text-[10px] text-slate-500">từ {sh.teacher?.teacherName}</span>
                      </div>
                      <p className="text-slate-600 line-clamp-2 leading-relaxed">
                        {sh.description}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-bold text-amber-600">
                          🚀 {sh.adoptionCount || 0} đồng nghiệp đã áp dụng
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdopt(sh.id)}
                          disabled={adoptingId === sh.id}
                          className="px-3 py-1 bg-[#003B3A] text-white rounded-xl font-bold text-[11px] hover:bg-teal-900 cursor-pointer"
                        >
                          {adoptingId === sh.id ? "Đang nhận..." : "Tôi cũng muốn thử (+10 IP)"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. TAB 5: DẤU ẤN & TỦ HUY HIỆU (BADGES & HIGHLIGHTS)          */}
      {/* ============================================================== */}
      {activeTab === "BADGES" && (
        <div className="space-y-6">
          {/* Badges Cabinet */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Tủ Huy Hiệu Sư Phạm ({badges?.length || 0}/5)
                  </h4>
                  <p className="text-xs text-slate-500">Mở khóa huy hiệu khi đạt các mốc đổi mới sáng tạo</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {ALL_BADGES.map((b) => {
                const isUnlocked = badges?.includes(b.code)
                return (
                  <div
                    key={b.code}
                    className={`p-4 rounded-3xl border text-center space-y-2 flex flex-col justify-between transition-all ${
                      isUnlocked
                        ? "bg-gradient-to-b from-amber-50 to-white border-amber-300 shadow-md shadow-amber-500/10 scale-102"
                        : "bg-slate-50 border-slate-200 opacity-60"
                    }`}
                  >
                    <div>
                      <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-2xl mb-2 ${
                        isUnlocked
                          ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/30"
                          : "bg-slate-200 text-slate-400"
                      }`}>
                        {b.icon}
                      </div>
                      <h5 className="font-black text-xs text-slate-900">{b.name}</h5>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">{b.desc}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-150">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isUnlocked
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}>
                        {isUnlocked ? "✓ Đã mở khóa" : "Chưa mở khóa"}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Teacher Completed Quests Highlights */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" /> Dấu Ấn Tiết Dạy Của Thầy/Cô ({completedQuests?.length || 0})
                </h4>
                <p className="text-xs text-slate-500">Các thử thách đã hoàn thành và nhận xét sư phạm từ AI</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedQuests && completedQuests.length > 0 ? (
                completedQuests.map((q: any) => (
                  <div
                    key={q.id}
                    className="p-5 bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-3xl shadow-xs space-y-3 flex flex-col justify-between"
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
                        <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-2xl text-xs text-purple-950 leading-relaxed italic">
                          "{q.afterClassInsight}"
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          Đang chờ AI tổng hợp dấu ấn tiết dạy...
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-black text-amber-600">
                        +{q.earnedPoints || 100} IP
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenShare(q)}
                        className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Lan tỏa ý tưởng
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-8 text-center text-slate-400 italic">
                  Thầy/Cô chưa hoàn thành thử thách nào. Hãy bốc thẻ để bắt đầu hành trình đổi mới!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. 3D CARD DRAW MODAL */}
      {modalOpen && (
        <MysticCardDeckModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onAccepted={() => window.location.reload()}
        />
      )}

      {/* 9. SHARE CARD MODAL */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900">
              Lan Tỏa Ý Tưởng Vào Kho Cảm Hứng (+30 IP)
            </h3>
            <p className="text-xs text-slate-500">
              Chia sẻ kinh nghiệm thực tế của Thầy/Cô để đồng nghiệp có thể tham khảo và học hỏi.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tiêu đề chia sẻ</label>
                <input
                  type="text"
                  value={shareTitle}
                  onChange={(e) => setShareTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mô tả kinh nghiệm / Cách làm hay</label>
                <textarea
                  rows={4}
                  value={shareDescription}
                  onChange={(e) => setShareDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmShare}
                disabled={sharing}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#003B3A] text-white hover:bg-teal-900"
              >
                {sharing ? "Đang chia sẻ..." : "Xác Nhận Chia Sẻ (+30 IP)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. AI INSIGHT DETAIL POPUP MODAL */}
      {selectedInsightDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h4 className="text-sm font-black text-slate-900">
                  Dấu Ấn Sư Phạm AI: {selectedInsightDetail.teacherName}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInsightDetail(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Thử thách thực hiện</span>
                <p className="font-bold text-slate-900">{selectedInsightDetail.challenge.title}</p>
                <p className="text-slate-600 text-[11px]">{selectedInsightDetail.subjectName} - {selectedInsightDetail.className}</p>
              </div>

              <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-1">
                <span className="text-[11px] font-bold text-purple-900 uppercase flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Lời nhận xét đúc kết từ AI:
                </span>
                <p className="text-purple-950 font-medium leading-relaxed italic">
                  "{selectedInsightDetail.afterClassInsight}"
                </p>
              </div>

              {selectedInsightDetail.wowMoments && selectedInsightDetail.wowMoments.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-2xl flex items-center gap-2 text-amber-900">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
                  <span>
                    Khoảnh khắc WOW: <strong>"{selectedInsightDetail.wowMoments[0].category}"</strong>
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedInsightDetail(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#003B3A] text-white hover:bg-teal-900"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
