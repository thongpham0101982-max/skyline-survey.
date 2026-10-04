"use client"

import React, { useState, useEffect } from "react"
import { Bell, X, ShieldCheck, CheckCircle2 } from "lucide-react"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function WebPushPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      return
    }

    // If permission already granted, verify subscription is active
    if (Notification.permission === "granted") {
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription()
        if (!sub) {
          // Re-subscribe if lost
          subscribeToServer(reg)
        }
      })
      return
    }

    // If already denied, don't show prompt
    if (Notification.permission === "denied") {
      return
    }

    // Check if user dismissed prompt recently (7 days)
    const dismissedTime = localStorage.getItem("ssm_push_prompt_dismissed")
    if (dismissedTime) {
      const daysPassed = (Date.now() - parseInt(dismissedTime, 10)) / (1000 * 60 * 60 * 24)
      if (daysPassed < 7) return
    }

    // Show after gentle delay of 4 seconds so user is comfortable
    const timer = setTimeout(() => {
      setShowPrompt(true)
    }, 4000)

    return () => clearTimeout(timer)
  }, [])

  const subscribeToServer = async (reg: ServiceWorkerRegistration) => {
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BGE-CSwFtCtjOMa2W2-8z3v_gz2eCdsY4rxf1xarRTjxVRdhihcFQ9yamXaswP4o4PK9fuZkEWqa0tOeAxxYUUk"
      const convertedVapidKey = urlBase64ToUint8Array(vapidKey)

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      })

      const subJson = subscription.toJSON()

      await fetch("/api/pwa/push/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          userAgent: navigator.userAgent,
          deviceType: window.innerWidth < 768 ? "MOBILE" : window.innerWidth < 1200 ? "TABLET" : "DESKTOP"
        })
      })

      console.log("[WebPush] Successfully subscribed to push notifications")
    } catch (err) {
      console.warn("[WebPush] Subscription error:", err)
    }
  }

  const handleEnablePush = async () => {
    setIsSubscribing(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        const reg = await navigator.serviceWorker.ready
        await subscribeToServer(reg)
        setShowPrompt(false)
      } else {
        setShowPrompt(false)
      }
    } catch (err) {
      console.error("[WebPush] Enable error:", err)
      setShowPrompt(false)
    } finally {
      setIsSubscribing(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem("ssm_push_prompt_dismissed", Date.now().toString())
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-20 left-3 right-3 md:left-auto md:right-6 md:w-96 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-3xl p-5 shadow-[0_12px_40px_rgba(0,59,58,0.18)] border border-[#E6ECEA]">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#00A19A] flex items-center justify-center border border-teal-100 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#003B3A] tracking-tight">
                Bật thông báo SSM?
              </h4>
              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                Nhận nhắc việc, lịch dự giờ và cảnh báo công việc quan trọng.
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleEnablePush}
            disabled={isSubscribing}
            className="flex-1 h-10 rounded-xl bg-[#00A19A] hover:bg-[#008B85] active:bg-[#00736E] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_2px_8px_rgba(0,161,154,0.3)] active:scale-95 cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{isSubscribing ? "Đang kích hoạt..." : "Bật thông báo"}</span>
          </button>

          <button
            onClick={handleDismiss}
            className="px-4 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
          >
            Để sau
          </button>
        </div>
      </div>
    </div>
  )
}
