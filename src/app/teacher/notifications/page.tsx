"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Info,
  ChevronRight,
  CheckCheck,
  RefreshCw,
  Filter
} from "lucide-react"
import { PwaBottomNav } from "@/components/pwa/PwaBottomNav"

interface NotificationItem {
  id: string
  userId: string
  title: string
  body: string
  isRead: boolean
  deepLink: string
  type: "ACTION_REQUIRED" | "ATTENTION" | "INFORMATION" | "COMPLETED"
  category: string
  priority: string
  sourceModule?: string | null
  sourceId?: string | null
  createdAt: string
}

interface SummaryCounts {
  actionRequired: number
  attention: number
  information: number
  completed: number
}

function timeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return "Vừa xong"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} ngày trước`
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [summary, setSummary] = useState<SummaryCounts>({
    actionRequired: 0,
    attention: 0,
    information: 0,
    completed: 0
  })
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "ACTION_REQUIRED" | "ATTENTION" | "INFORMATION" | "COMPLETED">("ALL")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const fetchNotifications = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const url = selectedFilter === "ALL" 
        ? "/api/pwa/notifications" 
        : `/api/pwa/notifications?category=${selectedFilter}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
        if (data.summary) {
          setSummary(data.summary)
        }
      }
    } catch (err) {
      console.error("[Notifications] Fetch error:", err)
    } finally {
      setLoading(false)
      if (isManual) {
        setTimeout(() => setRefreshing(false), 300)
      }
    }
  }, [selectedFilter])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAsRead = async (id: string, deepLink?: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    )
    setUnreadCount(prev => Math.max(0, prev - 1))

    try {
      await fetch("/api/pwa/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id })
      })
    } catch (err) {
      console.error("[Notifications] Error marking read:", err)
    }

    if (deepLink && deepLink !== "/teacher") {
      router.push(deepLink)
    }
  }

  const handleMarkAllRead = async () => {
    setMarkingAll(true)
    try {
      const res = await fetch("/api/pwa/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true })
      })
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      console.error("[Notifications] Error marking all read:", err)
    } finally {
      setMarkingAll(false)
    }
  }

  const getCategoryTheme = (type: string) => {
    switch (type) {
      case "ACTION_REQUIRED":
        return {
          border: "border-l-4 border-l-red-500",
          badgeBg: "bg-red-50 text-red-700 border-red-200",
          iconBg: "bg-red-100 text-red-600",
          label: "Cần xử lý",
          icon: AlertCircle
        }
      case "ATTENTION":
        return {
          border: "border-l-4 border-l-amber-500",
          badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
          iconBg: "bg-amber-100 text-amber-600",
          label: "Chú ý",
          icon: Clock
        }
      case "COMPLETED":
        return {
          border: "border-l-4 border-l-emerald-500",
          badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          iconBg: "bg-emerald-100 text-emerald-600",
          label: "Hoàn thành",
          icon: CheckCircle2
        }
      case "INFORMATION":
      default:
        return {
          border: "border-l-4 border-l-sky-500",
          badgeBg: "bg-sky-50 text-sky-700 border-sky-200",
          iconBg: "bg-sky-100 text-sky-600",
          label: "Thông tin",
          icon: Info
        }
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F8F7] pb-24 font-sans text-slate-800">
      {/* 1. TOP APP BAR */}
      <div className="bg-[#003B3A] text-white px-4 pt-4 pb-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/teacher"
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white">
                  Thông Báo & Nhắc Việc
                </h1>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#5EEAD4] font-medium">Notification Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fetchNotifications(true)}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#5EEAD4]" : ""}`} />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="h-9 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 text-[11px] font-bold text-white flex items-center gap-1 transition-colors cursor-pointer"
                title="Đã đọc tất cả"
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#5EEAD4]" />
                <span className="hidden sm:inline">Đã đọc tất cả</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. FILTER PILLS (4 COLOR CATEGORIES + ALL) */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedFilter("ALL")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedFilter === "ALL"
                ? "bg-white text-[#003B3A] shadow-sm"
                : "bg-white/10 text-white/80 hover:bg-white/15"
            }`}
          >
            Tất cả
          </button>

          <button
            onClick={() => setSelectedFilter("ACTION_REQUIRED")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedFilter === "ACTION_REQUIRED"
                ? "bg-red-500 text-white shadow-sm"
                : "bg-white/10 text-white/80 hover:bg-white/15"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            <span>Cần xử lý</span>
            {summary.actionRequired > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-extrabold">
                {summary.actionRequired}
              </span>
            )}
          </button>

          <button
            onClick={() => setSelectedFilter("ATTENTION")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedFilter === "ATTENTION"
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-white/10 text-white/80 hover:bg-white/15"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Chú ý</span>
            {summary.attention > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-extrabold">
                {summary.attention}
              </span>
            )}
          </button>

          <button
            onClick={() => setSelectedFilter("INFORMATION")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedFilter === "INFORMATION"
                ? "bg-sky-500 text-white shadow-sm"
                : "bg-white/10 text-white/80 hover:bg-white/15"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            <span>Thông tin</span>
          </button>

          <button
            onClick={() => setSelectedFilter("COMPLETED")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedFilter === "COMPLETED"
                ? "bg-emerald-500 text-white shadow-sm"
                : "bg-white/10 text-white/80 hover:bg-white/15"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Hoàn thành</span>
          </button>
        </div>
      </div>

      {/* 3. NOTIFICATION LIST CONTENT */}
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-[#00A19A] animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Đang tải thông báo...
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-[#E6ECEA] shadow-xs my-6">
            <div className="w-16 h-16 rounded-2xl bg-[#003B3A]/5 text-[#003B3A] flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Không có thông báo nào trong mục này
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Thầy/Cô đã hoàn tất các nhiệm vụ hoặc chưa có thông báo phát sinh.
            </p>
          </div>
        ) : (
          notifications.map((item) => {
            const theme = getCategoryTheme(item.type)
            const Icon = theme.icon

            return (
              <div
                key={item.id}
                onClick={() => handleMarkAsRead(item.id, item.deepLink)}
                className={`bg-white rounded-2xl p-4 border border-[#E6ECEA] shadow-xs active:scale-[0.99] transition-all cursor-pointer relative overflow-hidden ${
                  theme.border
                } ${!item.isRead ? "bg-slate-50/60 ring-1 ring-[#00A19A]/20" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${theme.iconBg}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${theme.badgeBg}`}
                        >
                          {theme.label}
                        </span>
                        {item.sourceModule && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {item.sourceModule}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 shrink-0">
                        {timeAgo(item.createdAt)}
                      </span>
                    </div>

                    <h4
                      className={`text-xs font-bold tracking-tight line-clamp-2 ${
                        !item.isRead ? "text-slate-900" : "text-slate-700"
                      }`}
                    >
                      {item.title}
                    </h4>

                    {item.body && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {item.body}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-[#00A19A]">
                        <span>Xem chi tiết & xử lý</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>

                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#00A19A] animate-pulse"></span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <PwaBottomNav role="TEACHER" />
    </div>
  )
}
