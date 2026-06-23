import { useState, useEffect } from "react"
import { X, ShieldAlert, KeyRound, CheckCircle2, Bell } from "lucide-react"
import { ChangePasswordModal } from "./ChangePasswordModal"

export function WelcomeAlert({ name }: { name: string }) {
  const [show, setShow] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 300)
    return () => clearTimeout(timer)
  }, [])

  if (!show) return null

  return (
    <div className="mb-5 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0A3230] to-[#1E8B87] p-0.5 shadow-md">
        <div className="absolute top-[-20%] right-[-5%] w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative bg-white/10 backdrop-blur-md rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/30 shadow-inner shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Xin chào, {name}!</h2>
              <p className="text-teal-50 mt-0.5 text-xs font-medium flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
                Hệ thống yêu cầu <span className="text-white font-bold underline decoration-amber-400 underline-offset-2">đổi mật khẩu</span> trong lần đầu đăng nhập.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button onClick={() => setIsModalOpen(true)} className="flex-1 md:flex-none text-[#0A3230] font-bold text-xs shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 text-xs font-semibold">
              <KeyRound className="w-3.5 h-3.5" />
              Đổi mật khẩu
            </button>
            <button onClick={() => setShow(false)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      <ChangePasswordModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
