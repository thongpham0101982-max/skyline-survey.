"use client"
import { useEffect } from "react"
import { AlertCircle, RotateCcw, Home } from "lucide-react"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Publish Page Crash:", error) }, [error])

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="bg-white max-w-md w-full p-10 rounded-[2.5rem] shadow-2xl border border-red-50 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6 text-xs font-semibold">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Đã xảy ra lỗi</h2>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          Hệ thống gặp sự cố khi tải trang phát hành. Vui lòng thử lại hoặc quay lại trang quản lý.
        </p>
        
        {error.digest && (
           <div className="mb-8 text-[10px] font-mono text-slate-300 break-all uppercase text-xs font-semibold">
              ID: {error.digest}
           </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => window.location.reload()} className="flex items-center justify-center gap-2 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all">
            <RotateCcw className="w-4 h-4" /> Thử lại
          </button>
          <a href="/admin/surveys" className="flex items-center justify-center gap-2 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all">
            <Home className="w-4 h-4" /> Quay lại
          </a>
        </div>
      </div>
    </div>
  )
}