"use client"
import { useState } from "react"
import { RefreshCcw, Loader2, CheckCircle2 } from "lucide-react"

export function SyncButton({ syncAction }: { syncAction: any }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSync = async () => {
    setLoading(true)
    try {
      await syncAction()
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
       <button 
          onClick={handleSync}
          disabled={loading || done}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}
       >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : done ? <CheckCircle2 className="w-5 h-5" /> : <RefreshCcw className="w-5 h-5" />}
          {loading ? "Đang xử lý..." : done ? "Đã hoàn thành" : "Đồng bộ Ngay"}
       </button>
       {done && <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-in fade-in slide-in-from-top-1">Tài khoản đã sẵn sàng</p>}
    </div>
  )
}
