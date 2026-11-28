"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Menu,
  Bell,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  HeartHandshake,
  Search,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  UserCheck,
  X,
  Send,
  ClipboardCheck,
  Users,
  BookMarked,
  FileText,
  Sparkles,
  Sun,
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

const CORE_MODULES = [
  {
    href: "/teacher/du-gio",
    title: "Dự giờ & Thao giảng",
    subtitle: "Lịch dự, đánh giá tiết dạy & chỉ tiêu KPI",
    icon: Eye,
    accent: "bg-[#003B3A] text-[#5EEAD4]",
  },
  {
    href: "/teacher/input-assessments",
    title: "Đánh giá & Xét duyệt đầu vào",
    subtitle: "Phỏng vấn định hướng, chấm bài & thẩm định",
    icon: ClipboardCheck,
    accent: "bg-[#00736E] text-white",
    secondaryHref: "/admin/xet-duyet-ket-qua",
    secondaryLabel: "Xét duyệt KQ",
  },
  {
    href: "/teacher/co-van-hoc-tap",
    title: "Cố vấn học tập",
    subtitle: "Chu trình 8 bước, mục tiêu & đồng hành HS",
    icon: HeartHandshake,
    accent: "bg-[#00A19A] text-white",
  },
]

const SECONDARY_SHORTCUTS = [
  {
    href: "/teacher/so-diem-nhan-xet",
    label: "Sổ điểm",
    icon: BookMarked,
  },
  {
    href: "/teacher/classes",
    label: "Lớp học",
    icon: Users,
  },
  {
    href: "/teacher/ho-so-hoc-sinh",
    label: "Hồ sơ HS",
    icon: Search,
  },
  {
    href: "/teacher/surveys",
    label: "Khảo sát",
    icon: FileText,
  },
]

export function SSMTodayHome() {
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showMoreShortcuts, setShowMoreShortcuts] = useState(false)
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

  const handleOpenSidebar = () => {
    window.dispatchEvent(new CustomEvent("toggleSidebar"))
  }

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
      <div className="pwa-today-view min-h-[70dvh] flex flex-col items-center justify-center p-6 text-center select-none bg-[#F8FAFC]">
        <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-[#003B3A] mb-3">
          <RefreshCw className="w-5 h-5 animate-spin text-[#00A19A]" />
        </div>
        <p className="text-xs font-semibold text-[#003B3A]">Đang đồng bộ không gian giáo viên...</p>
        <p className="text-[11px] text-slate-500 mt-1">Cập nhật nhiệm vụ và lịch công tác hôm nay</p>
      </div>
    )
  }

  const user = data?.user
  const pulse = data?.pulse
  const actions = data?.actionItems || []
  const students = data?.attentionStudents || []

  const roleLabel = user?.isGDCS
    ? "GĐCS"
    : user?.isTTCM
    ? "TTCM"
    : user?.isGVCN
    ? `GVCN${user.homeroomClassNames?.[0] ? ` • ${user.homeroomClassNames[0]}` : ""}`
    : "Giáo viên"

  const urgentCount = pulse?.urgentCount || 0
  const todayCount = pulse?.attentionCount || 0
  const completionRate = pulse?.completionRate ?? 0

  return (
    <div className="pwa-today-view w-full min-h-dvh bg-[#F8FAFC] pb-24 select-none font-sans text-slate-800">
      {/* 1. MASTHEAD CHUẨN SKY-LINE DEEP PINE */}
      <header className="bg-[#003B3A] text-white px-4 pt-3.5 pb-7 rounded-b-3xl shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={handleOpenSidebar}
              aria-label="Mở danh mục chức năng"
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 flex items-center justify-center text-white shrink-0 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-tight text-white">SQMS</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/12 text-[#5EEAD4] truncate max-w-[140px]">
                  {roleLabel}
                </span>
              </div>
              <p className="text-[11px] text-teal-100/80 truncate mt-0.5">
                {user?.campusName || "Hệ thống Giáo dục Sky-Line"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => loadTodayData(true)}
              aria-label="Làm mới dữ liệu"
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#5EEAD4]" : ""}`} />
            </button>
            <Link
              href="/teacher/notifications"
              aria-label="Thông báo"
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 flex items-center justify-center text-white transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              {urgentCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E11D48] ring-2 ring-[#003B3A]" />
              )}
            </Link>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-[#5EEAD4] font-medium">{currentDateStr}</p>
            <h1 className="text-base font-bold text-white tracking-tight truncate mt-0.5">
              Xin chào {user?.fullName || "Thầy/Cô"}
            </h1>
          </div>

          <button
            type="button"
            onClick={handleOpenMorningBrief}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/12 hover:bg-white/18 active:bg-white/25 border border-white/15 text-[11px] font-semibold text-white shrink-0 transition-colors cursor-pointer"
          >
            <Sun className="w-3.5 h-3.5 text-[#5EEAD4]" />
            <span>Tóm tắt ngày</span>
          </button>
        </div>
      </header>

      {/* 2. DẢI CHỈ SỐ SỔ CÁI TIẾN ĐỘ (UNIFIED LEDGER STRIP) */}
      <section className="px-3.5 -mt-4 relative z-10">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden tabular-nums">
          <div className="px-3.5 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#003B3A]">Tiến độ công việc</span>
            <span className="text-[11px] font-semibold text-[#00736E] bg-[#F0FDFA] border border-[#CCFBF1] px-2 py-0.5 rounded-md">
              Đạt {completionRate}%
            </span>
          </div>

          <div className="grid grid-cols-3 divide-x divide-[#E2E8F0]">
            <Link
              href="/teacher/tasks?filter=OVERDUE"
              className="py-2.5 px-2 text-center hover:bg-[#F8FAFC] active:bg-slate-100/70 transition-colors"
            >
              <div className={`text-lg font-bold leading-tight ${urgentCount > 0 ? "text-[#E11D48]" : "text-slate-900"}`}>
                {urgentCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Quá hạn</div>
            </Link>

            <Link
              href="/teacher/tasks"
              className="py-2.5 px-2 text-center hover:bg-[#F8FAFC] active:bg-slate-100/70 transition-colors"
            >
              <div className={`text-lg font-bold leading-tight ${todayCount > 0 ? "text-[#D97706]" : "text-slate-900"}`}>
                {todayCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Hôm nay</div>
            </Link>

            <Link
              href="/teacher/ho-so-hoc-sinh"
              className="py-2.5 px-2 text-center hover:bg-[#F8FAFC] active:bg-slate-100/70 transition-colors"
            >
              <div className={`text-lg font-bold leading-tight ${students.length > 0 ? "text-[#00736E]" : "text-slate-900"}`}>
                {students.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">HS cần chú ý</div>
            </Link>
          </div>

          {pulse?.highlights && pulse.highlights.length > 0 && (
            <div className="px-3.5 py-2 border-t border-[#F1F5F9] bg-white space-y-1">
              {pulse.highlights.slice(0, 2).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00A19A] shrink-0" />
                  <span className="truncate">{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. BA PHÂN HỆ TRỌNG TÂM TRÊN ĐIỆN THOẠI */}
      <section className="px-3.5 mt-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-[#003B3A]">Chức năng trọng tâm</h2>
          <button
            type="button"
            onClick={() => setShowMoreShortcuts((prev) => !prev)}
            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#00736E] hover:text-[#003B3A] cursor-pointer"
          >
            <span>{showMoreShortcuts ? "Ẩn tiện ích khác" : "Tiện ích khác"}</span>
            {showMoreShortcuts ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] divide-y divide-[#F1F5F9] overflow-hidden shadow-2xs">
          {CORE_MODULES.map((mod) => {
            const Icon = mod.icon
            return (
              <div key={mod.href} className="flex items-center justify-between gap-2 px-3.5 py-3">
                <Link
                  href={mod.href}
                  className="flex items-center gap-3 min-w-0 flex-1 active:opacity-80 transition-opacity"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${mod.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#003B3A] truncate">{mod.title}</div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{mod.subtitle}</p>
                  </div>
                </Link>

                {mod.secondaryHref ? (
                  <Link
                    href={mod.secondaryHref}
                    className="px-2.5 py-1.5 rounded-lg bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] text-[11px] font-semibold shrink-0 active:bg-[#CCFBF1]/60"
                  >
                    {mod.secondaryLabel}
                  </Link>
                ) : (
                  <Link
                    href={mod.href}
                    aria-label={mod.title}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 shrink-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            )
          })}
        </div>

        {showMoreShortcuts && (
          <div className="grid grid-cols-4 gap-2 mt-2.5">
            {SECONDARY_SHORTCUTS.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="bg-white rounded-2xl py-2.5 px-1.5 border border-[#E2E8F0] hover:border-[#00A19A] active:bg-[#F0FDFA] flex flex-col items-center justify-center text-center gap-1.5 transition-colors min-h-[68px]"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#F0FDFA] text-[#00736E] flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 leading-tight line-clamp-1">
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* 4. VIỆC CẦN XỬ LÝ */}
      <section className="px-3.5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-[#003B3A]">Việc cần xử lý</h2>
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 tabular-nums">
              {actions.length}
            </span>
          </div>
          <Link
            href="/teacher/tasks"
            className="text-[11px] font-semibold text-[#00736E] hover:text-[#003B3A] inline-flex items-center gap-0.5"
          >
            <span>Tất cả</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] divide-y divide-[#F1F5F9] overflow-hidden">
          {actions.map((act) => {
            const isRed = act.color === "red" || act.urgent
            const isAmber = act.color === "orange"

            return (
              <Link
                key={act.id}
                href={act.deepLink}
                className="px-3.5 py-3 active:bg-[#F8FAFC] transition-colors flex items-center justify-between gap-3 min-h-[54px]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isRed ? "bg-[#E11D48]" : isAmber ? "bg-[#D97706]" : "bg-[#00A19A]"
                    }`}
                  />
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-slate-800 truncate">
                      {act.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {act.subtext}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                      isRed
                        ? "bg-rose-50 text-[#E11D48] border-rose-200"
                        : isAmber
                        ? "bg-amber-50 text-[#D97706] border-amber-200"
                        : "bg-[#F0FDFA] text-[#00736E] border-[#CCFBF1]"
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
      </section>

      {/* 5. HỌC SINH CẦN CHÚ Ý */}
      <section className="px-3.5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-[#003B3A]">Học sinh cần chú ý</h2>
            {students.length > 0 && (
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 text-[#D97706] border border-amber-200 tabular-nums">
                {students.length} HS
              </span>
            )}
          </div>
          <Link
            href="/teacher/ho-so-hoc-sinh"
            className="text-[11px] font-semibold text-[#00736E] hover:text-[#003B3A] inline-flex items-center gap-0.5"
          >
            <span>Tra cứu</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {students.length === 0 ? (
          <div className="bg-white rounded-2xl px-3.5 py-3 border border-[#E2E8F0] flex items-center gap-2.5 text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
            <span>Tình hình học sinh ổn định, chưa có cảnh báo cần xử lý.</span>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] divide-y divide-[#F1F5F9] overflow-hidden">
            {students.map((st) => {
              const isUrgent = st.severity === "urgent"
              return (
                <Link
                  key={st.id}
                  href={st.deepLink}
                  className="px-3.5 py-3 active:bg-[#F8FAFC] transition-colors flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${
                        isUrgent
                          ? "bg-rose-50 text-[#E11D48] border-rose-200"
                          : "bg-amber-50 text-[#D97706] border-amber-200"
                      }`}
                    >
                      {st.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {st.fullName}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 tabular-nums">
                          {st.className}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {st.reason}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {st.gapText && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                          isUrgent
                            ? "bg-rose-50 text-[#E11D48] border-rose-200"
                            : "bg-amber-50 text-[#D97706] border-amber-200"
                        }`}
                      >
                        {st.gapText}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* MORNING BRIEF MODAL */}
      {isMorningBriefOpen && (
        <div
          onClick={() => setIsMorningBriefOpen(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/45 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-4 pb-6 safe-area-pb shadow-2xl border border-[#E2E8F0] max-h-[85dvh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#003B3A] text-[#5EEAD4] flex items-center justify-center shrink-0">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#003B3A]">Tóm tắt đầu ngày</h3>
                  <p className="text-[11px] text-slate-500">{currentDateStr}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMorningBriefOpen(false)}
                aria-label="Đóng"
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {briefLoading ? (
              <div className="py-10 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#00A19A]" />
                <p className="text-xs font-semibold text-slate-600">Đang tổng hợp dữ liệu ngày mới...</p>
              </div>
            ) : morningBriefData ? (
              <div className="space-y-3.5 pt-3.5 tabular-nums">
                <div className="grid grid-cols-3 divide-x divide-[#E2E8F0] border border-[#E2E8F0] rounded-2xl overflow-hidden text-center">
                  <div className="py-2.5 px-2 bg-white">
                    <span className="text-base font-bold text-[#E11D48] block">
                      {morningBriefData.urgentCount || 0}
                    </span>
                    <span className="text-[11px] text-slate-500">Việc khẩn</span>
                  </div>
                  <div className="py-2.5 px-2 bg-white">
                    <span className="text-base font-bold text-[#00736E] block">
                      {morningBriefData.actionToday || 0}
                    </span>
                    <span className="text-[11px] text-slate-500">Nhiệm vụ</span>
                  </div>
                  <div className="py-2.5 px-2 bg-white">
                    <span className="text-base font-bold text-[#003B3A] block">
                      {morningBriefData.duGioToday || 0}
                    </span>
                    <span className="text-[11px] text-slate-500">Tiết dự giờ</span>
                  </div>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3.5 text-xs text-slate-700 leading-relaxed">
                  <h4 className="font-semibold text-[#003B3A] mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#00A19A]" />
                    <span>Điểm cần lưu ý hôm nay</span>
                  </h4>
                  <p className="whitespace-pre-line text-slate-600">
                    {morningBriefData.summaryText || "Hôm nay kế hoạch giảng dạy và công tác học sinh ổn định."}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleSendPushMorningBrief}
                    disabled={briefPushing || briefPushSuccess}
                    className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {briefPushing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : briefPushSuccess ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                    ) : (
                      <Send className="w-3.5 h-3.5 text-[#00736E]" />
                    )}
                    <span>
                      {briefPushSuccess
                        ? "Đã gửi thông báo về thiết bị"
                        : "Gửi bản tin về điện thoại"}
                    </span>
                  </button>

                  <Link
                    href={morningBriefData.deepLink?.replace("/teacher?tab=tasks", "/teacher/tasks") || "/teacher/tasks"}
                    onClick={() => setIsMorningBriefOpen(false)}
                    className="w-full h-11 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>Mở danh sách việc cần làm</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                <p>Chưa có dữ liệu tóm tắt cho hôm nay.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
