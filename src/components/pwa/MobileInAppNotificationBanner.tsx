"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Bell, X, ArrowRight, Sparkles, CheckCircle2, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface MobileNotificationItem {
  id: string
  title: string
  body: string
  deepLink?: string
  priority?: string
  type?: string
  createdAt?: string
}

export function MobileInAppNotificationBanner() {
  const router = useRouter()
  const [currentNotification, setCurrentNotification] = useState<MobileNotificationItem | null>(null)
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isVisible, setIsVisible] = useState(false)
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Sync Badging API on device home screen icon
  const updateAppBadge = useCallback((count: number) => {
    if (typeof window !== "undefined" && "navigator" in window) {
      if ("setAppBadge" in navigator) {
        if (count > 0) {
          (navigator as any).setAppBadge(count).catch(() => {})
        } else {
          (navigator as any).clearAppBadge().catch(() => {})
        }
      }

      // Also dispatch event for other components (like PwaBottomNav)
      window.dispatchEvent(new CustomEvent("ssm-unread-count-changed", { detail: { count } }))

      // Notify service worker if active
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: count > 0 ? "SET_APP_BADGE" : "CLEAR_APP_BADGE",
          count
        })
      }
    }
  }, [])

  // Poll for notifications
  const checkNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/pwa/notifications?unreadOnly=true", {
        headers: { "Cache-Control": "no-cache" }
      })
      if (!res.ok) return

      const data = await res.json()
      const totalUnread = data.unreadCount || 0
      setUnreadCount(totalUnread)
      updateAppBadge(totalUnread)

      const unreadList: MobileNotificationItem[] = data.notifications || []
      if (unreadList.length > 0) {
        // Retrieve dismissed IDs from sessionStorage
        const dismissedStr = sessionStorage.getItem("ssm_shown_notif_ids") || "[]"
        let dismissedIds: string[] = []
        try {
          dismissedIds = JSON.parse(dismissedStr)
        } catch {
          dismissedIds = []
        }

        // Find the most recent unread notification that hasn't been shown in this session
        const freshNotif = unreadList.find(n => !dismissedIds.includes(n.id))
        if (freshNotif) {
          setCurrentNotification(freshNotif)
          setIsVisible(true)

          // Mark as shown in this session
          dismissedIds.push(freshNotif.id)
          sessionStorage.setItem("ssm_shown_notif_ids", JSON.stringify(dismissedIds))

          // Auto dismiss after 8 seconds
          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
          dismissTimerRef.current = setTimeout(() => {
            setIsVisible(false)
          }, 8000)
        }
      }
    } catch (err) {
      // Quiet fail in background
    }
  }, [updateAppBadge])

  useEffect(() => {
    // Initial check after 2 seconds
    const initTimer = setTimeout(() => {
      checkNotifications()
    }, 2000)

    // Interval check every 35 seconds
    const intervalTimer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        checkNotifications()
      }
    }, 35000)

    // Listen to visibility change (when user returns to the app)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkNotifications()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    // Custom event to force refresh (e.g. after marking all read)
    const handleForceCheck = () => {
      checkNotifications()
    }
    window.addEventListener("ssm-refresh-notifications", handleForceCheck)

    return () => {
      clearTimeout(initTimer)
      clearInterval(intervalTimer)
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("ssm-refresh-notifications", handleForceCheck)
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
  }, [checkNotifications])

  // Handle click on banner
  const handleOpenNotification = async () => {
    if (!currentNotification) return
    const notif = currentNotification
    setIsVisible(false)

    // Mark as read in backend
    try {
      await fetch("/api/pwa/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: notif.id })
      })
      const newCount = Math.max(0, unreadCount - 1)
      setUnreadCount(newCount)
      updateAppBadge(newCount)
    } catch {}

    // Navigate to deepLink or notifications page
    const dest = notif.deepLink && notif.deepLink !== "/" ? notif.deepLink : "/teacher/notifications"
    router.push(dest)
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsVisible(false)
  }

  if (!isVisible || !currentNotification) return null

  // Ensure title has SSSQ prefix
  const rawTitle = currentNotification.title || "Thông báo hệ thống"
  const displayTitle = rawTitle.startsWith("SSSQ Thông báo:") || rawTitle.startsWith("SSQM Thông báo:") || rawTitle.startsWith("SSM Thông báo:")
    ? rawTitle
    : `SSSQ Thông báo: ${rawTitle}`

  return (
    <aside
      aria-label="Thông báo di động mới"
      role="alert"
      className="md:hidden fixed top-3 left-3 right-3 z-[9999] animate-in slide-in-from-top-4 duration-300 pointer-events-auto"
    >
      <div
        onClick={handleOpenNotification}
        className="w-full bg-slate-900/95 text-white backdrop-blur-md rounded-2xl p-3.5 shadow-2xl border border-white/20 flex items-start gap-3 cursor-pointer hover:bg-slate-900 transition-all active:scale-[0.98]"
      >
        {/* App Icon with Shiny Ring & Badge */}
        <div className="relative shrink-0 mt-0.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#003B3A] to-[#00A19A] p-0.5 shadow-md flex items-center justify-center">
            <img
              src="/icons/ssm-96.png"
              alt="SSM"
              className="w-8 h-8 rounded-lg object-contain"
            />
          </div>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-black text-[#5EEAD4] truncate tracking-tight">
              {displayTitle}
            </h4>
            <span className="text-[10px] text-slate-400 font-medium shrink-0">
              Vừa xong
            </span>
          </div>

          <p className="text-[11px] text-slate-200 line-clamp-2 mt-0.5 leading-relaxed font-normal">
            {currentNotification.body}
          </p>

          <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-white/90">
            <span className="text-[#5EEAD4] inline-flex items-center gap-1">
              <span>Xem chi tiết</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          title="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  )
}
