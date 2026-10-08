"use client"
// @ts-nocheck

import React, { useState, useEffect } from "react"
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  X,
  Award,
  Zap,
  Bot,
  Users,
  Clock,
  BookOpen,
  ArrowRight,
  Flame,
  Star
} from "lucide-react"
import { drawRandomCards, acceptChallengeQuest } from "@/app/teacher/ai-growth/actions"

interface MysticCardDeckModalProps {
  isOpen: boolean
  onClose: () => void
  onAccepted?: (quest: any) => void
  slotId?: string
  lessonDate?: string
}

export function MysticCardDeckModal({
  isOpen,
  onClose,
  onAccepted,
  slotId,
  lessonDate
}: MysticCardDeckModalProps) {
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [hasRerolled, setHasRerolled] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [synthesisInfo, setSynthesisInfo] = useState<any>(null)

  const fetchCards = async () => {
    setLoading(true)
    setSelectedCardIndex(null)
    try {
      const res = await drawRandomCards()
      if (res.success && res.cards) {
        setCards(res.cards)
        if (res.synthesisInfo) {
          setSynthesisInfo(res.synthesisInfo)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchCards()
    }
  }, [isOpen])

  const handleCardClick = (index: number) => {
    if (selectedCardIndex === index) return
    setSelectedCardIndex(index)
  }

  const handleReroll = () => {
    if (hasRerolled) return
    setHasRerolled(true)
    fetchCards()
  }

  const handleAccept = async () => {
    if (selectedCardIndex === null || !cards[selectedCardIndex]) return
    setAccepting(true)
    try {
      const card = cards[selectedCardIndex]
      const res = await acceptChallengeQuest(card.id, slotId, lessonDate)
      if (res.success) {
        if (dontShowAgain) {
          localStorage.setItem("skyline_ai_growth_popup_dismissed_until", String(Date.now() + 7 * 24 * 60 * 60 * 1000))
        }
        if (onAccepted) onAccepted(res.quest)
        onClose()
      } else {
        alert(res.error || "Có lỗi xảy ra khi nhận thử thách")
      }
    } catch (e) {
      alert("Lỗi kết nối máy chủ")
    } finally {
      setAccepting(false)
    }
  }

  const handleDismiss = () => {
    if (dontShowAgain) {
      localStorage.setItem("skyline_ai_growth_popup_dismissed_until", String(Date.now() + 7 * 24 * 60 * 60 * 1000))
    }
    onClose()
  }

  if (!isOpen) return null

  const selectedCard = selectedCardIndex !== null ? cards[selectedCardIndex] : null

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-300">
      <div className="bg-gradient-to-b from-[#002B2A] via-[#003B3A] to-[#041F1E] w-full max-w-4xl rounded-3xl border border-teal-500/30 shadow-[0_0_50px_rgba(0,112,104,0.3)] overflow-hidden my-auto flex flex-col text-white">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-teal-500/20 flex items-center justify-between relative bg-black/20">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Game Hóa Sư Phạm
                </span>
                <span className="text-xs text-teal-200/70 font-medium">Bốc thẻ định mệnh</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                Thử Thách Dự Giờ Cùng AI
              </h2>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions & Sub-Criterion Disclaimer */}
        <div className="px-6 pt-4 space-y-2">
          {synthesisInfo && (
            <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-teal-200">
                  AI đã tổng hợp từ kết quả đánh giá dự giờ của Thầy/Cô để đề xuất các thử thách trúng đích:
                </span>
              </div>
              {synthesisInfo.themes && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {synthesisInfo.themes.map((th: string, i: number) => (
                    <span key={i} className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40">
                      {th}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="p-2.5 bg-amber-400/10 border border-amber-400/30 rounded-2xl text-center">
            <p className="text-xs text-amber-200 font-semibold">
              🌟 <strong>LƯU Ý QUAN TRỌNG:</strong> Đây là <strong>TIÊU CHÍ PHỤ TỰ NGUYỆN</strong>, hoàn toàn <strong>KHÔNG</strong> tính vào điểm số đánh giá 20/20 hay xếp loại tiết dạy của Thầy/Cô.
              Thực hiện thử thách nhằm tích lũy <strong className="text-amber-300">+100 đến +150 Điểm Cảm Hứng</strong> và nhận Dấu ấn Sư phạm từ AI!
            </p>
          </div>
        </div>

        {/* 3 Cards Area */}
        <div className="p-5 sm:p-7 flex-1">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-sm text-teal-200 font-medium">AI đang tổng hợp hồ sơ dự giờ và xáo trộn 3 thẻ bài kỳ bí...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {cards.map((card, idx) => {
                const isSelected = selectedCardIndex === idx
                const isFlipped = selectedCardIndex !== null

                let rarityColor = "from-emerald-500/20 to-teal-900/40 border-emerald-500/40 text-emerald-300"
                let rarityBadge = "Khởi Sắc"
                let rarityPoints = "+100 IP"

                if (card.rarityTier === "RARE") {
                  rarityColor = "from-sky-500/20 to-blue-900/40 border-sky-500/40 text-sky-300"
                  rarityBadge = "Đột Phá"
                  rarityPoints = "+120 IP"
                } else if (card.rarityTier === "EPIC_AI" || card.isAiChallenge) {
                  rarityColor = "from-purple-500/20 to-fuchsia-900/40 border-purple-500/40 text-purple-300"
                  rarityBadge = "Huyền Thoại AI"
                  rarityPoints = "+150 IP"
                }

                return (
                  <div
                    key={card.id || idx}
                    onClick={() => handleCardClick(idx)}
                    className={`relative cursor-pointer transition-all duration-500 rounded-3xl p-5 border text-left flex flex-col justify-between select-none ${
                      isSelected
                        ? "bg-gradient-to-b " + rarityColor + " border-2 shadow-[0_0_30px_rgba(245,158,11,0.25)] scale-105 z-10"
                        : isFlipped
                        ? "bg-white/5 border-white/10 opacity-70 hover:opacity-100 hover:scale-102"
                        : "bg-gradient-to-br from-teal-900/50 via-teal-950 to-slate-900 border-teal-500/30 hover:border-amber-400/60 hover:shadow-[0_0_25px_rgba(245,158,11,0.2)] hover:-translate-y-1.5"
                    }`}
                    style={{ minHeight: "330px" }}
                  >
                    {!isFlipped ? (
                      /* Card Back Face (Mặt úp bí ẩn) */
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-400/30 flex items-center justify-center text-amber-300 mb-4 shadow-[0_0_15px_rgba(245,158,11,0.15)] group-hover:scale-110 transition-transform">
                          <Sparkles className="w-8 h-8" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-teal-300/80 mb-1">
                          Lá Bài #{idx + 1}
                        </span>
                        <h4 className="text-base font-bold text-white mb-2">Thẻ Bài Đổi Mới</h4>
                        <p className="text-xs text-teal-200/60">Chạm để lật mở thử thách dành riêng cho Thầy/Cô</p>
                        <div className="mt-4 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-amber-300/90 font-semibold">
                          ★ Tiêu chí phụ • Tới 150 IP ★
                        </div>
                      </div>
                    ) : (
                      /* Card Front Face (Mặt ngửa hé lộ thử thách) */
                      <div className="flex flex-col h-full justify-between gap-3">
                        <div>
                          {/* Header of revealed card */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider bg-white/10 border-white/20">
                              {rarityBadge}
                            </span>
                            <span className="text-xs font-black text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
                              {rarityPoints}
                            </span>
                          </div>

                          <h4 className="text-base font-black text-white mb-1.5 line-clamp-2 leading-snug">
                            {card.title}
                          </h4>

                          <p className="text-xs text-teal-100/80 line-clamp-2 mb-2 leading-relaxed">
                            {card.description}
                          </p>

                          {/* AI Recommendation Reason */}
                          {card.recommendationReason && (
                            <div className="p-2.5 bg-black/40 border border-amber-400/30 rounded-xl text-[11px] text-amber-200 leading-snug mb-2">
                              {card.recommendationReason}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-white/10">
                          <div className="text-[11px] text-teal-200/90 font-medium flex items-center gap-1.5 mb-2">
                            <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="line-clamp-1">{card.pedagogicalGoal}</span>
                          </div>

                          {isSelected ? (
                            <div className="w-full py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/30 animate-pulse">
                              <CheckCircle2 className="w-4 h-4" /> Đã Chọn Lá Bài Này
                            </div>
                          ) : (
                            <div className="w-full py-1.5 bg-white/5 hover:bg-white/15 text-white/80 text-[11px] font-semibold rounded-xl text-center">
                              Bấm để chọn
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected Card Action Bar */}
        {selectedCard && (
          <div className="px-6 py-4 bg-teal-950/70 border-t border-teal-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <span className="text-xs text-amber-300 font-bold uppercase tracking-wider">
                Thử thách đã chọn (Tiêu chí phụ):
              </span>
              <p className="text-sm font-black text-white">{selectedCard.title}</p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {!hasRerolled && (
                <button
                  type="button"
                  onClick={handleReroll}
                  disabled={loading || accepting}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/15 text-white text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Bốc Lại (1 lần)
                </button>
              )}

              <button
                type="button"
                onClick={handleAccept}
                disabled={accepting}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
              >
                {accepting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Đang nhận...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-slate-950" /> Nhận Nhiệm Vụ Ngay (+10 IP)
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer with Skip & Don't Show Again */}
        <div className="p-4 px-6 bg-black/40 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-teal-200/70">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-teal-500/40 text-amber-500 focus:ring-amber-400 bg-teal-950/60"
            />
            <span>Không nhắc lại gợi ý trong 7 ngày tới</span>
          </label>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-teal-300 hover:text-white underline underline-offset-4 cursor-pointer font-medium"
          >
            Để sau, vào thẳng Dự giờ thông thường →
          </button>
        </div>

      </div>
    </div>
  )
}
