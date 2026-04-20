"use client"
import { useState, useEffect } from "react"
import { X, ShieldAlert, KeyRound, CheckCircle2 } from "lucide-react"

export function WelcomeAlert({ name }: { name: string }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Show after a slight delay to feel more interactive
    const timer = setTimeout(() => setShow(true), 500)
    return () => clearTimeout(timer)
  }, [])

  if (!show) return null

  return (
    <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-700 p-1 shadow-xl shadow-indigo-200">
        <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative bg-white/5 backdrop-blur-sm rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border border-white/30 shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Xin chào, {name}!</h2>
              <p className="text-indigo-100 mt-1 font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-300" />
                Vì lý do an mật, hệ thống <span className="text-white font-bold underline decoration-amber-400 underline-offset-4">yêu cầu bạn đổi mật khẩu</span> ngay lần đầu đăng nhập.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-none px-6 py-3 bg-white text-indigo-700 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
              <KeyRound className="w-4 h-4" />
              Đổi mật khẩu ngay
            </button>
            <button onClick={() => setShow(false)} className="p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
