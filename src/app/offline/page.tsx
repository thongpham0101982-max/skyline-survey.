"use client"

import React, { useState, useEffect } from "react"
import { WifiOff, RefreshCw, ShieldCheck, ArrowLeft } from "lucide-react"

export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = useState(false)
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const handleRetry = () => {
    setIsRetrying(true)
    setTimeout(() => {
      window.location.reload()
    }, 400)
  }

  return (
    <div className="min-h-screen bg-[#F6F8F7] flex flex-col items-center justify-center p-4 text-center select-none font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-[0_10px_30px_rgba(0,59,58,0.06)] border border-[#E6ECEA] flex flex-col items-center">
        
        {/* Brand Icon Header */}
        <div className="w-20 h-20 rounded-2xl bg-[#003B3A]/5 border border-[#003B3A]/10 flex items-center justify-center text-[#003B3A] mb-6 relative">
          <WifiOff className="w-9 h-9 stroke-[1.8]" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-[#003B3A] mb-3 tracking-tight">
          SSM đang ngoại tuyến
        </h1>

        {/* Description */}
        <p className="text-slate-600 text-sm leading-relaxed mb-6">
          Một số chức năng và dữ liệu học sinh cần kết nối Internet để đảm bảo an toàn, bảo mật và đồng bộ thời gian thực.
        </p>

        {/* Online Status Pill */}
        {isOnline && (
          <div className="mb-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Đã phát hiện tín hiệu mạng Internet!
          </div>
        )}

        {/* Actions */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full h-12 rounded-xl bg-[#00A19A] hover:bg-[#008B85] active:bg-[#00736E] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_rgba(0,161,154,0.3)] active:scale-[0.98] cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
            <span>{isRetrying ? "Đang kết nối lại..." : "Thử lại"}</span>
          </button>

          <button
            onClick={() => window.history.back()}
            className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-200/80 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại trang trước</span>
          </button>
        </div>

        {/* Security Badge */}
        <div className="mt-8 pt-6 border-t border-slate-100 w-full flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-[#00A19A]" />
          <span>Bảo mật dữ liệu học đường theo chuẩn Sky-Line</span>
        </div>
      </div>
    </div>
  )
}
