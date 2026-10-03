"use client"
// @ts-nocheck

import React, { useState, useEffect } from "react"
import { Sparkles, Zap, Flame, Award } from "lucide-react"
import { MysticCardDeckModal } from "./MysticCardDeckModal"
import { checkTeacherActiveChallenge } from "@/app/teacher/ai-growth/actions"

interface AiObservationPopupTriggerProps {
  slotId?: string
  lessonDate?: string
  triggerMode?: "AUTO_POPUP" | "BANNER_ONLY" | "BUTTON_ONLY"
}

export function AiObservationPopupTrigger({
  slotId,
  lessonDate,
  triggerMode = "AUTO_POPUP"
}: AiObservationPopupTriggerProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeQuest, setActiveQuest] = useState<any>(null)
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    async function check() {
      try {
        const res = await checkTeacherActiveChallenge()
        if (res.hasActive) {
          setActiveQuest(res.activeQuest)
        } else {
          // If auto popup mode, check dismissed timestamp
          if (triggerMode === "AUTO_POPUP") {
            const dismissedUntil = localStorage.getItem("skyline_ai_growth_popup_dismissed_until")
            const isDismissed = dismissedUntil && Number(dismissedUntil) > Date.now()
            if (!isDismissed) {
              // Delay slightly for smooth page entrance
              const timer = setTimeout(() => {
                setModalOpen(true)
              }, 1200)
              return () => clearTimeout(timer)
            }
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setHasChecked(true)
      }
    }
    check()
  }, [triggerMode])

  return (
    <>
      {/* Top Banner on Observation Page */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#004D47] to-[#002B2A] border border-amber-400/30 rounded-3xl p-4 sm:p-5 shadow-lg shadow-teal-950/20 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)] shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                AI Growth Sư Phạm
              </span>
              {activeQuest ? (
                <span className="text-xs text-emerald-300 font-semibold flex items-center gap-1">
                  ● Đang thực hiện thử thách
                </span>
              ) : (
                <span className="text-xs text-teal-200/80 font-medium">
                  Hành trình đổi mới tiết dạy
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
              {activeQuest
                ? `Nhiệm vụ: ${activeQuest.challenge?.title}`
                : "Bốc Thẻ Thử Thách Dự Giờ Cùng AI"}
            </h3>
            <p className="text-xs text-teal-100/80 font-medium">
              {activeQuest
                ? "Thầy/Cô đã gắn thử thách cho tiết dạy này. Người dự sẽ cổ vũ và gửi tặng WOW Moments sau giờ học!"
                : "Nhận 1 ý tưởng sáng tạo cho tiết dạy sắp tới và tích lũy +100 đến +150 Điểm Cảm Hứng!"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {activeQuest ? (
            <a
              href="/teacher/ai-growth"
              className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 flex items-center gap-2 transition-all"
            >
              <Award className="w-4 h-4 text-amber-400" /> Xem Hành Trình Của Tôi
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-slate-950" /> Bốc 3 Thẻ Bài Bí Ẩn Ngay
            </button>
          )}
        </div>
      </div>

      {/* 3D Flip Card Modal */}
      <MysticCardDeckModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        slotId={slotId}
        lessonDate={lessonDate}
        onAccepted={(quest) => {
          setActiveQuest(quest)
        }}
      />
    </>
  )
}
