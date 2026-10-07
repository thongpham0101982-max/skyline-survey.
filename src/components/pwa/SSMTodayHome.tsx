"use client"
import { QuickActionFab } from "@/components/pwa/QuickActionFab";

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bell,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Clock,
  Eye,
  HeartHandshake,
  FileText,
  Search,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Award,
  Sun,
  X,
  Send
} from "lucide-react"

interface TodayData {
  user: {
    fullName: string
    role: string
    isGVCN: boolean
    isTTCM: boolean
    isGDCS: boolean
    isTBP: boolean
    homeroomClassNames: string[]
    campusName: string
  }
  pulse: {
    title: string
    type: string
    completionRate: number
    urgentCount: number
    attentionCount: number
    highlights: string[]
  }
  actionItems: Array<{
    id: string
    title: string
    count: number
    badgeText: string
    color: string
    deepLink: string
    urgent: boolean
    subtext: string
  }>
  attentionStudents: Array<{
    id: string
    studentCode: string
    fullName: string
    className: string
    reason: string
    severity: "urgent" | "attention" | "info"
    gapText?: string
    deepLink: string
  }>
  aiPromptSuggestion: string
}

export function SSMTodayHome() {
  const router = useRouter()
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentDateStr, setCurrentDateStr] = useState("")
  const [isMorningBriefOpen, setIsMorningBriefOpen] = useState(false)
  const [morningBriefData, setMorningBriefData] = useState<{
    date: string
    title: string
    urgentCount: number
    actionToday: number
    duGioToday: number
    summaryText: string
    deepLink: string
  } | null>(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefPushing, setBriefPushing] = useState(false)
  const [briefPushSuccess, setBriefPushSuccess] = useState(false)

  const handleOpenMorningBrief = async () => {
    setIsMorningBriefOpen(true)
    setBriefLoading(true)
    setBriefPushSuccess(false)
    try {
      const res = await fetch("/api/pwa/morning-brief")
      if (res.ok) {
        const json = await res.json()
        setMorningBriefData(json.brief)
      }
    } catch (err) {
      console.error("[SSM Morning Brief] Error fetching:", err)
    } finally {
      setBriefLoading(false)
    }
  }

  const handleSendPushMorningBrief = async () => {
    setBriefPushing(true)
    try {
      const res = await fetch("/api/pwa/morning-brief", { method: "POST" })
      if (res.ok) {
        setBriefPushSuccess(true)
        setTimeout(() => setBriefPushSuccess(false), 4000)
      }
    } catch (err) {
      console.error("[SSM Morning Brief] Error sending push:", err)
    } finally {
      setBriefPushing(false)
    }
  }

  const loadTodayData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const res = await fetch("/api/pwa/today")
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error("[SSM Today] Error fetching today data:", err)
    } finally {
      setLoading(false)
      if (isManual) {
        setTimeout(() => setRefreshing(false), 400)
      }
    }
  }, [])

  useEffect(() => {
    // Format Vietnamese Date: "Thứ ..., ngày DD/MM/YYYY"
    const now = new Date()
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]
    const dayName = days[now.getDay()]
    const d = String(now.getDate()).padStart(2, "0")
    const m = String(now.getMonth() + 1).padStart(2, "0")
    const y = now.getFullYear()
    setCurrentDateStr(`${dayName}, ${d}/${m}/${y}`)

    loadTodayData()
  }, [loadTodayData])

  if (loading && !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-12 h-12 rounded-2xl bg-[#003B3A]/10 border border-[#003B3A]/20 flex items-center justify-center text-[#003B3A] animate-spin mb-4">
          <RefreshCw className="w-6 h-6" />
        </div>
        <p className="text-xs font-bold text-[#003B3A] tracking-wider uppercase">Đang tải SSM Today...</p>
        <p className="text-[11px] text-slate-400 mt-1">Đồng bộ nhiệm vụ & cảnh báo thời gian thực</p>
      </div>
    )
  }

  const user = data?.user
  const pulse = data?.pulse
  const actions = data?.actionItems || []
  const students = data?.attentionStudents || []

  return (
    <div className="pwa-today-view w-full pb-20 select-none font-sans text-slate-800">
      
      {/* 1. TOP HEADER & GREETING */}
      <div className="bg-gradient-to-b from-[#003B3A] to-[#002B2A] text-white px-4 pt-5 pb-8 rounded-b-3xl shadow-lg relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00A19A]/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <img
              src="/icons/ssm-96.png"
              alt="SSM"
              className="w-9 h-9 rounded-xl shadow-xs border border-white/20"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold tracking-tight text-white">SSM</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#00A19A]/30 text-[#5EEAD4] border border-[#00A19A]/40">
                  {user?.isGVCN ? "GVCN" : user?.isTTCM ? "TTCM" : user?.role || "GV"}
                </span>
              </div>
              <p className="text-[10px] text-slate-300 font-medium truncate max-w-[200px]">
                {user?.campusName || "Sky-Line"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadTodayData(true)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 active:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#5EEAD4]" : ""}`} />
            </button>
            <Link
              href="/teacher/notifications"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 active:bg-white/20 flex items-center justify-center text-white transition-colors relative cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {(pulse?.urgentCount || 0) > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#003B3A]"></span>
              )}
            </Link>
          </div>
        </div>

        {/* Greeting */}
        <div className="relative z-10">
          <p className="text-xs text-[#5EEAD4] font-medium tracking-wide">
            {currentDateStr}
          </p>
          <h2 className="text-lg font-extrabold text-white tracking-tight mt-0.5">
            Xin chào {user?.fullName || "Thầy/Cô"}!
          </h2>
        </div>
      </div>

      {/* 2. SSM PULSE CARD (FLOATING OVER HEADER) */}
      <div className="px-4 -mt-5 relative z-20">
        <div className="bg-white rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,59,58,0.08)] border border-[#E6ECEA]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#00A19A] animate-pulse"></div>
              <span className="text-[11px] font-bold text-[#003B3A] tracking-wider uppercase">
                {pulse?.title || "MY PULSE"}
              </span>
            </div>
            <span className="text-xs font-bold text-[#00A19A]">
              {pulse?.completionRate || 80}% ĐẠT
            </span>
          </div>

          {/* Quick Counter Chips */}
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div className="bg-red-50/80 border border-red-200/80 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center font-black text-sm shrink-0">
                {pulse?.urgentCount || 0}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-red-700 leading-tight">Cần xử lý</p>
                <p className="text-[10px] text-red-600/80 truncate">Hôm nay</p>
              </div>
            </div>

            <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-sm shrink-0">
                {pulse?.attentionCount || 0}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-amber-800 leading-tight">Cần chú ý</p>
                <p className="text-[10px] text-amber-700/80 truncate">Tuần này</p>
              </div>
            </div>
          </div>

          {/* Highlights */}
          {pulse?.highlights && pulse.highlights.length > 0 && (
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
              {pulse.highlights.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00A19A] shrink-0"></div>
                  <span className="truncate">{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2.5 MORNING BRIEF BANNER */}
      <div className="px-4 mt-3">
        <button
          onClick={handleOpenMorningBrief}
          className="w-full bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-emerald-500/10 hover:from-amber-500/15 hover:via-teal-500/15 hover:to-emerald-500/15 border border-teal-200/60 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-left transition-all active:scale-[0.99] shadow-2xs cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0 text-base">
              ☀️
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#003B3A]">SSM Morning Brief</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
                  Hôm nay
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                Tóm tắt nhiệm vụ, dự giờ & việc ưu tiên ngày mới
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-lg bg-white/80 border border-slate-200/80 flex items-center justify-center text-slate-500 shrink-0">
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* 3. VIỆC CỦA TÔI (MY TASKS SECTION) */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#003B3A] tracking-tight flex items-center gap-2">
            <span>VIỆC CỦA TÔI</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {actions.length} mục
            </span>
          </h3>
          <Link
            href="/teacher?tab=tasks"
            className="text-xs font-semibold text-[#00A19A] hover:text-[#00736E] flex items-center gap-0.5"
          >
            <span>Tất cả</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex flex-col gap-2.5">
          {actions.map((act) => {
            const isRed = act.color === "red" || act.urgent
            const isOrange = act.color === "orange"

            return (
              <Link
                key={act.id}
                href={act.deepLink}
                className="bg-white rounded-2xl p-3.5 border border-[#E6ECEA] shadow-xs active:scale-[0.99] transition-all flex items-center justify-between gap-3 min-h-[56px] hover:border-[#00A19A]/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      isRed ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : isOrange ? "bg-amber-500" : "bg-sky-500"
                    }`}
                  ></div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 tracking-tight truncate">
                      {act.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {act.subtext}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      isRed
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : isOrange
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-sky-50 text-sky-700 border border-sky-200"
                    }`}
                  >
                    {act.badgeText}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* 4. HỌC SINH CẦN CHÚ Ý (ATTENTION STUDENTS) */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#003B3A] tracking-tight">
              HỌC SINH CẦN CHÚ Ý
            </h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              {students.length} HS
            </span>
          </div>
          <Link
            href="/teacher/ho-so-hoc-sinh"
            className="text-xs font-semibold text-[#00A19A] hover:text-[#00736E] flex items-center gap-0.5"
          >
            <span>Xem nhanh</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {students.length === 0 ? (
          <div className="bg-white rounded-2xl p-4 border border-[#E6ECEA] text-center text-xs text-slate-500">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
            <p className="font-semibold text-slate-700">Tình hình học sinh ổn định</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Không có cảnh báo học tập hoặc tâm lý khẩn cấp</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {students.map((st) => (
              <Link
                key={st.id}
                href={st.deepLink}
                className="bg-white rounded-2xl p-3.5 border border-[#E6ECEA] shadow-xs active:scale-[0.99] transition-all flex items-center justify-between gap-3 hover:border-amber-300"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-200">
                    {st.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {st.fullName}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                        {st.className}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-700 font-medium truncate mt-0.5">
                      {st.reason}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {st.gapText && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {st.gapText}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 5. SSM AI WORK ASSISTANT CARD */}
      <div className="px-4 mt-6">
        <div className="bg-gradient-to-br from-[#003B3A] via-[#004D4B] to-[#002220] rounded-2xl p-4 text-white shadow-md border border-[#00A19A]/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#5EEAD4]/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-center gap-2 mb-2 relative z-10">
            <div className="w-6 h-6 rounded-lg bg-[#00A19A]/30 text-[#5EEAD4] flex items-center justify-center border border-[#00A19A]/40">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-[#5EEAD4] tracking-wide uppercase">
              SSM AI Assistant
            </span>
          </div>

          <p className="text-sm font-semibold text-white/90 leading-snug mb-3 relative z-10">
            &ldquo;{data?.aiPromptSuggestion || "Hôm nay tôi cần ưu tiên làm gì trước?"}&rdquo;
          </p>

          <Link
            href="/teacher/ai"
            className="w-full h-11 rounded-xl bg-[#00A19A] hover:bg-[#008B85] active:bg-[#00736E] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_4px_12px_rgba(0,161,154,0.3)] active:scale-[0.98] relative z-10 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hỏi SSM AI ngay</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>
      </div>

      {/* 6. QUICK ACTIONS GRID */}
      <div className="px-4 mt-6 mb-4">
        <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-3">
          THAO TÁC NHANH
        </h3>
        <div className="grid grid-cols-4 gap-2">
          <Link
            href="/teacher/du-gio?tab=overview_slots"
            className="bg-white rounded-xl p-2.5 border border-[#E6ECEA] flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs hover:border-[#00A19A] transition-colors min-h-[74px]"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#00A19A] flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-700 leading-tight line-clamp-2">
              Dự giờ
            </span>
          </Link>

          <Link
            href="/teacher/ho-so-hoc-sinh"
            className="bg-white rounded-xl p-2.5 border border-[#E6ECEA] flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs hover:border-[#00A19A] transition-colors min-h-[74px]"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-700 leading-tight line-clamp-2">
              Tra cứu HS
            </span>
          </Link>

          <Link
            href="/teacher/ho-tro-hoc-tap"
            className="bg-white rounded-xl p-2.5 border border-[#E6ECEA] flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs hover:border-[#00A19A] transition-colors min-h-[74px]"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-700 leading-tight line-clamp-2">
              Hỗ trợ HS
            </span>
          </Link>

          <Link
            href="/teacher/co-van-hoc-tap"
            className="bg-white rounded-xl p-2.5 border border-[#E6ECEA] flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs hover:border-[#00A19A] transition-colors min-h-[74px]"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-700 leading-tight line-clamp-2">
              Cố vấn K12
            </span>
          </Link>
        </div>
      </div>

      {/* FLOATING SPEED DIAL ACTION BUTTON */}
      <QuickActionFab />

      {/* MORNING BRIEF MODAL POPUP */}
      {isMorningBriefOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-[#E6ECEA] max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center text-lg shadow-xs">
                  ☀️
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#003B3A]">SSM Morning Brief</h3>
                  <p className="text-[11px] text-slate-400">{currentDateStr}</p>
                </div>
              </div>
              <button
                onClick={() => setIsMorningBriefOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {briefLoading ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00A19A]" />
                <p className="text-xs font-bold text-slate-600">Đang tổng hợp thông tin buổi sáng...</p>
              </div>
            ) : morningBriefData ? (
              <div className="space-y-4 pt-4">
                {/* 3 Metric Counter Chips */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-2.5">
                    <span className="text-base font-black text-red-600 block">
                      {morningBriefData.urgentCount || 0}
                    </span>
                    <span className="text-[10px] font-bold text-red-700">Việc khẩn</span>
                  </div>
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-2.5">
                    <span className="text-base font-black text-[#00A19A] block">
                      {morningBriefData.actionToday || 0}
                    </span>
                    <span className="text-[10px] font-bold text-teal-800">Nhiệm vụ</span>
                  </div>
                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-2.5">
                    <span className="text-base font-black text-sky-600 block">
                      {morningBriefData.duGioToday || 0}
                    </span>
                    <span className="text-[10px] font-bold text-sky-800">Tiết dự giờ</span>
                  </div>
                </div>

                {/* Summary Text Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-700 leading-relaxed">
                  <h4 className="font-bold text-[#003B3A] mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Tóm tắt đầu ngày của Thầy/Cô:</span>
                  </h4>
                  <p className="whitespace-pre-line text-slate-600">
                    {morningBriefData.summaryText || "Hôm nay mọi kế hoạch giảng dạy và công tác học sinh diễn ra bình thường."}
                  </p>
                </div>

                {/* Send Push reminder action */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleSendPushMorningBrief}
                    disabled={briefPushing || briefPushSuccess}
                    className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {briefPushing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : briefPushSuccess ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Send className="w-3.5 h-3.5 text-[#00A19A]" />
                    )}
                    <span>
                      {briefPushSuccess
                        ? "Đã gửi thông báo đẩy đến điện thoại!"
                        : "Gửi bản tin Morning Brief qua Web Push"}
                    </span>
                  </button>

                  <Link
                    href={morningBriefData.deepLink || "/teacher?tab=tasks"}
                    onClick={() => setIsMorningBriefOpen(false)}
                    className="w-full h-11 rounded-xl bg-[#00A19A] hover:bg-[#008B85] active:bg-[#00736E] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                  >
                    <span>Mở danh sách việc cần làm ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                <p>Không có dữ liệu bản tin sáng hôm nay.</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
