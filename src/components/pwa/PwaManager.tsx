"use client"

import React, { useEffect, useState } from "react"
import { Sparkles, RefreshCw, X, Download, ShieldCheck } from "lucide-react"
import { MobileInAppNotificationBanner } from "@/components/pwa/MobileInAppNotificationBanner"

export function PwaManager() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // 1. Detect if running in standalone mode (already installed)
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true

    setIsStandalone(isStandaloneMode)

    // 2. Register Service Worker with Lifecycle Listeners
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // If there is already a worker waiting
          if (reg.waiting) {
            setWaitingWorker(reg.waiting)
            setShowUpdatePrompt(true)
          }

          // Listen for new workers installing
          reg.onupdatefound = () => {
            const installingWorker = reg.installing
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                  setWaitingWorker(installingWorker)
                  setShowUpdatePrompt(true)
                }
              }
            }
          }
        })
        .catch((err) => {
          console.warn("[PWA Manager] Service Worker registration failed:", err)
        })

      // When controller changes (after skipWaiting), reload page smoothly with clean cache
      let refreshing = false
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true
          if ("caches" in window) {
            caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).finally(() => {
              window.location.reload()
            })
          } else {
            window.location.reload()
          }
        }
      })
    }

    // 3. Catch beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)

      // Only show install banner if not already dismissed in this session
      const dismissed = sessionStorage.getItem("ssm_pwa_install_dismissed")
      if (!dismissed && !isStandaloneMode) {
        setShowInstallBanner(true)
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // 4. Catch appinstalled event
    const handleAppInstalled = () => {
      setShowInstallBanner(false)
      setDeferredPrompt(null)
      console.log("[PWA Manager] SSM PWA was successfully installed")
    }

    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  // Action: Apply update
  const handleApplyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" })
    } else {
      if ("caches" in window) {
        caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).finally(() => {
          window.location.reload()
        })
      } else {
        window.location.reload()
      }
    }
  }

  // Action: Trigger Install Prompt
  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`[PWA Manager] User install choice: ${outcome}`)
    setDeferredPrompt(null)
    setShowInstallBanner(false)
  }

  // Action: Dismiss Install Banner
  const handleDismissInstall = () => {
    setShowInstallBanner(false)
    sessionStorage.setItem("ssm_pwa_install_dismissed", "true")
  }

  return (
    <>
      <MobileInAppNotificationBanner />

      {/* UPDATE NOTIFICATION BANNER */}
      {showUpdatePrompt && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-[#003B3A] text-white p-4 rounded-2xl shadow-2xl border border-[#00A19A]/40 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#00A19A]/20 text-[#5EEAD4] shrink-0 mt-0.5">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-white tracking-tight">SSM vừa được cập nhật</h4>
                <button
                  onClick={() => setShowUpdatePrompt(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Phiên bản mới đã sẵn sàng với các nâng cấp và cải thiện hiệu năng.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleApplyUpdate}
                  className="px-3.5 py-1.5 rounded-lg bg-[#00A19A] hover:bg-[#008B85] active:bg-[#00736E] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Cập nhật ngay
                </button>
                <button
                  onClick={() => setShowUpdatePrompt(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                >
                  Để sau
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PWA INSTALL PROMPT BANNER (BOTTOM FLOATING) */}
      {showInstallBanner && !isStandalone && (
        <div className="fixed bottom-16 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white/95 backdrop-blur-md text-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#00A19A]/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#003B3A] to-[#00A19A] p-0.5 flex items-center justify-center shrink-0 shadow-xs">
                <img
                  src="/icons/ssm-96.png"
                  alt="SSM App Icon"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  Cài đặt SSM Sky-Line
                </h4>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  Truy cập nhanh & nhận thông báo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleInstallClick}
                className="px-3 py-1.5 rounded-lg bg-[#00A19A] active:bg-[#00736E] text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Cài đặt</span>
              </button>
              <button
                onClick={handleDismissInstall}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
