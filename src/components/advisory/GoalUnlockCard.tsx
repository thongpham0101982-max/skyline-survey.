"use client"

import { useState } from "react"
import {
  Key, CheckCircle2, Clock, UserCheck, Calendar,
  ArrowRight, RefreshCw, Sparkles, BookOpen, Heart,
  Compass, Check, RotateCcw
} from "lucide-react"

interface GoalUnlockCardProps {
  unlock: any
  progressInfo: {
    dayNumber: number
    totalDays: number
    percent: number
    isExpired: boolean
  } | null
  onRefresh?: () => void
  onStartNewSprint?: () => void
}

const KEY_LABELS: Record<string, string> = {
  FIND_REASON: "TÌM LẠI LÝ DO",
  CHANGE_METHOD: "ĐỔI CÁCH LÀM",
  START_SMALL: "BẮT ĐẦU THẬT NHỎ",
  FIND_COMPANION: "TÌM NGƯỜI ĐỒNG HÀNH",
  ADJUST_GOAL: "ĐIỀU CHỈNH MỤC TIÊU"
}

const STATE_LABELS: Record<string, { label: string; badge: string }> = {
  STILL_COMMITTED: { label: "Vẫn muốn thực hiện", badge: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  STALLED: { label: "Đang chững lại", badge: "bg-amber-50 text-amber-800 border-amber-300" },
  NOT_STARTED: { label: "Chưa biết bắt đầu từ đâu", badge: "bg-sky-50 text-sky-800 border-sky-300" }
}

export function GoalUnlockCard({ unlock, progressInfo, onRefresh, onStartNewSprint }: GoalUnlockCardProps) {
  const [completing, setCompleting] = useState(false)

  const keyTitle = KEY_LABELS[unlock.selectedKey] || unlock.selectedKey
  const stateMeta = STATE_LABELS[unlock.currentState] || STATE_LABELS.STALLED

  const startDateFormatted = unlock.startDate ? new Date(unlock.startDate).toLocaleDateString("vi-VN") : ""
  const endDateFormatted = unlock.endDate ? new Date(unlock.endDate).toLocaleDateString("vi-VN") : ""

  const dayNumber = progressInfo?.dayNumber || 1
  const percent = progressInfo?.percent || Math.round((dayNumber / 7) * 100)
  const isCompleted = unlock.status === "COMPLETED"

  async function handleMarkCompleted() {
    if (!confirm("Em có muốn đánh dấu hoàn thành đợt hành động 7 ngày này?")) return
    setCompleting(true)
    try {
      const res = await fetch("/api/advisory/goals/unlock", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: unlock.id, action: "COMPLETE" })
      })
      if (res.ok) {
        if (onRefresh) onRefresh()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden space-y-5 p-6 sm:p-8 animate-in fade-in-50 duration-300">
      
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-100 text-[#003B3A] flex items-center justify-center font-black">
            <Key className="w-4 h-4 text-teal-800" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#003B3A] uppercase tracking-wider">
              MỤC TIÊU ĐÃ MỞ KHÓA — SPRINT 7 NGÀY
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Chu kỳ thực hiện: {startDateFormatted} — {endDateFormatted}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCompleted ? (
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-200">
              Đã hoàn thành Sprint
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black border border-amber-200">
              Đang thực hiện – Ngày {dayNumber}/7
            </span>
          )}

          {onStartNewSprint && (
            <button
              onClick={onStartNewSprint}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center gap-1 border border-slate-200 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Mở khóa mục tiêu khác</span>
            </button>
          )}
        </div>
      </div>

      {/* Goal Details Box */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-50 to-teal-50/50 border border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            MỤC TIÊU ĐANG THỰC HIỆN
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${stateMeta.badge}`}>
            Trạng thái ban đầu: {stateMeta.label}
          </span>
        </div>

        <h4 className="text-base font-black text-slate-900">
          {unlock.targetText}
        </h4>

        {/* Selected Key Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-teal-200 shadow-xs">
          <Key className="w-3.5 h-3.5 text-teal-700" />
          <span className="text-xs font-black text-teal-900">
            Chìa khóa áp dụng: <strong>{keyTitle}</strong>
          </span>
        </div>
      </div>

      {/* 7-Day Action Card */}
      <div className="p-5 rounded-2xl bg-white border-2 border-teal-600/30 space-y-3 shadow-xs">
        <span className="text-[10px] font-black uppercase tracking-wider text-teal-800">
          HÀNH ĐỘNG NHỎ TRONG 7 NGÀY:
        </span>
        <p className="text-sm font-black text-slate-900 leading-relaxed bg-teal-50/40 p-3.5 rounded-xl border border-teal-100">
          {unlock.sevenDayAction}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-600 pt-1">
          <span>⏰ Thời điểm: <strong>{unlock.actionTiming || "Linh hoạt"}</strong></span>
          <span>👥 Đồng hành: <strong>{unlock.companion || "Tự thực hiện"}</strong></span>
        </div>
      </div>

      {/* 7-Day Progress Bar */}
      <div className="space-y-2 p-5 rounded-2xl bg-slate-50 border border-slate-200">
        <div className="flex items-center justify-between text-xs font-black">
          <span className="text-slate-700">Tiến trình 7 ngày:</span>
          <span className="text-teal-800">Ngày {dayNumber} / 7 ({percent}%)</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-[#003B3A] transition-all duration-500 rounded-full"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Day Indicators */}
        <div className="grid grid-cols-7 gap-1 pt-1">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <div
              key={d}
              className={`text-center py-1 rounded-lg text-[10px] font-black border transition-all ${
                d < dayNumber
                  ? "bg-teal-100 text-teal-900 border-teal-300"
                  : d === dayNumber
                  ? "bg-[#003B3A] text-white border-[#003B3A] shadow-xs"
                  : "bg-white text-slate-400 border-slate-200"
              }`}
            >
              N{d}
            </div>
          ))}
        </div>
      </div>

      {/* Teacher Notes / Support Status if any */}
      {unlock.needSupport && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1.5 text-xs">
          <div className="flex items-center gap-2 font-black">
            <UserCheck className="w-4 h-4 text-amber-700" />
            <span>Đã gửi yêu cầu đồng hành tới Cố vấn học tập / GVCN</span>
          </div>
          {unlock.teacherSupportNotes ? (
            <p className="font-semibold text-slate-700 bg-white p-2.5 rounded-xl border border-amber-200 mt-1">
              <strong>Thầy Cô nhắn:</strong> {unlock.teacherSupportNotes}
            </p>
          ) : (
            <p className="text-[11px] text-amber-800 font-medium">
              Thầy Cô sẽ theo dõi và gửi phản hồi hỗ trợ em trong buổi cố vấn gần nhất.
            </p>
          )}
        </div>
      )}

      {/* Footer Complete Button */}
      {!isCompleted && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleMarkCompleted}
            disabled={completing}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-2 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{completing ? "Đang cập nhật..." : "Đánh dấu hoàn thành Sprint này"}</span>
          </button>
        </div>
      )}

    </div>
  )
}
