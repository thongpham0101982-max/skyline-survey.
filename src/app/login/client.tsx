// @ts-nocheck
﻿'use client'
import { signIn } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, Lock, GraduationCap, Users, ShieldCheck, 
  Eye, EyeOff, AlertCircle, CheckCircle2, Loader2
} from 'lucide-react'

export function LoginClient() {
  const router = useRouter()
  const [role, setRole] = useState('STAFF')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSteps, setLoadingSteps] = useState([])
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const log = (msg: string) => { console.log(msg); setDebugLog(prev => [...prev.slice(-4), msg]); };

  const addStep = (text: string) => {
    setLoadingSteps((prev: any[]) => {
      const updated = prev.map((s: any, i: number) =>
        i === prev.length - 1 ? { ...s, done: true } : s
      );
      return [...updated, { text, done: false }];
    });
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setLoadingSteps([])

    try {
      if (role === 'STUDENT') {
        setLoadingSteps([{ text: 'Đang xác thực...', done: false }])
        await new Promise(r => setTimeout(r, 600))

        addStep('Bắt đầu xử lý đăng nhập Student...')
        await new Promise(r => setTimeout(r, 400))

        const res = await fetch('/api/hocsinh/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentCode: identifier.trim(),
            password: (password && password.trim()) || identifier.trim()
          })
        })
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Thông tin không hợp lệ')
          setLoading(false)
          setLoadingSteps([])
          return
        }

        setLoadingSteps((prev: any[]) => prev.map(s => ({ ...s, done: true })))
        addStep('Đăng nhập thành công! Đang chuyển trang...')
        await new Promise(r => setTimeout(r, 500))

        const targetUrl = '/hocsinh/hs-khaosat/danh-sach'

        document.cookie =
          'hs_token=' + data.token +
          '; path=/; max-age=' + (2 * 24 * 60 * 60) +
          '; SameSite=Lax'

        window.location.href = targetUrl

      } else {
        setLoadingSteps([{ text: 'Đang xác thực tài khoản...', done: false }])
        await new Promise(r => setTimeout(r, 400))

        const result = await signIn('credentials', {
          email: identifier.trim(),
          password,
          redirect: false,
        })
        if (result?.error) {
          console.error('[LOGIN] SignIn Error:', result.error)
          if (result.error === 'TAI_KHOAN_BI_KHOA' || result.error.includes('TAI_KHOAN_BI_KHOA')) {
             setError('Tài khoản của bạn đã ngừng hoạt động (Nghỉ dạy).')
          } else {
             setError(`Sai tên đăng nhập hoặc mật khẩu!`)
          }
          setLoading(false)
          setLoadingSteps([])
        } else {
          setLoadingSteps((prev: any[]) => prev.map(s => ({ ...s, done: true })))
          addStep('Đăng nhập thành công! Đang chuyển trang...')
          await new Promise(r => setTimeout(r, 400))
          window.location.assign('/')
        }
      }
    } catch (err) {
      setError('Lỗi kết nối. Vui lòng thử lại.')
      setLoading(false)
      setLoadingSteps([])
    }
  }

  if (!mounted) return null

  const roleLabel =
    role === 'STUDENT' ? 'Học sinh' :
    role === 'PARENT' ? 'Phụ huynh' : 'Cán bộ'

  return (
    <>
      {loading && loadingSteps.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
             style={{ background: 'rgba(5, 20, 19, 0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl max-w-sm w-full mx-6 border-2 border-[#1E8B87]/30"
               style={{ animation: 'fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="flex justify-center mb-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#135E5B] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-[#135E5B]" />
                </div>
              </div>
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800 mb-1">Đang đăng nhập</h3>
            <p className="text-center text-xs text-[#135E5B] font-semibold mb-6">{roleLabel}</p>
            <div className="space-y-3">
              {(loadingSteps as any[]).map((step: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-2"
                     style={{ animation: 'slideInLeft 0.3s ease' }}>
                  {step.done
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    : <Loader2 className="w-5 h-5 text-[#135E5B] shrink-0 animate-spin" />}
                  <span className={`text-xs font-semibold ${step.done ? 'text-slate-400 line-through opacity-60' : 'text-slate-700'}`}>
                    {step.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Main Container with highly friendly and professional deep blue-teal radial gradient */}
      <div className="min-h-screen flex flex-col justify-between relative overflow-hidden font-sans"
           style={{ background: 'radial-gradient(circle at 50% 50%, #1E8B87 0%, #135E5B 45%, #0A3230 100%)' }}>
        
        {/* Soft elegant glowing ambient circles overlay */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-emerald-400/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-sky-400/10 blur-[120px] pointer-events-none" />

        {/* Top Header */}
        <div className="w-full py-5 px-8 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Sky-Line" className="h-10 w-auto object-contain brightness-0 invert opacity-95" />
          </div>
          <span className="text-[10px] font-black text-teal-100 uppercase tracking-widest bg-white/10 px-4 py-1.5 rounded-full border border-white/15 backdrop-blur-sm">SQMS Portal v2.5</span>
        </div>

        {/* Center Card Container */}
        <div className="w-full max-w-[460px] mx-auto px-6 py-8 relative z-10 flex flex-col justify-center">
          
          {/* Card with double border & top accent border (border nhấn nhấn cực kỳ chuyên nghiệp) */}
          <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_25px_60px_-15px_rgba(8,47,45,0.45)] border-2 border-[#1E8B87]/30 border-t-8 border-t-[#1E8B87] relative overflow-hidden">
            
            {/* Card inner gloss effect */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent" />

            {/* School Logo & Title */}
            <div className="text-center mb-8">
              <img src="/logo.png" alt="Sky-Line School" className="h-16 w-auto object-contain mx-auto mb-4" />
              <h2 className="text-lg font-black text-[#0D3E3B] uppercase tracking-wider">Hệ thống Quản trị Chất lượng</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px] mt-0.5">School Quality Management System</p>
            </div>

            {/* Premium Role Switcher */}
            <div className="bg-slate-50 p-1.5 rounded-[1.8rem] mb-6 flex gap-1 border border-slate-200/60">
              {['STAFF', 'PARENT', 'STUDENT'].map((r) => {
                const labels = { STAFF: 'Cán bộ', PARENT: 'Phụ huynh', STUDENT: 'Học sinh' };
                const icons = { STAFF: ShieldCheck, PARENT: Users, STUDENT: GraduationCap };
                const Icon = icons[r];
                return (
                  <button key={r} onClick={() => {setRole(r); setError(''); setLoadingSteps([]);}}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all ${role === r ? 'bg-[#135E5B] text-white shadow-md shadow-[#135E5B]/20 border border-[#1E8B87]/30' : 'text-slate-500 hover:text-[#135E5B] hover:bg-white/50 border border-transparent'}`}>
                    <Icon className="w-3.5 h-3.5" /> <span>{labels[r]}</span>
                  </button>
                )
              })}
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-2xl flex items-center gap-3 bg-rose-50 text-rose-700 border-2 border-rose-100 animate-in fade-in zoom-in">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                <p className="text-xs font-bold leading-relaxed">{error}</p>
              </div>
            )}

            {/* Input Form */}
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Tài khoản</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 group-focus-within:text-[#1E8B87] transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <input type="text" required value={identifier} onChange={e => setIdentifier(e.target.value)} 
                    placeholder={role === 'STAFF' ? 'admin@skyline.edu' : 'Nhập mã số của bạn'}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 hover:border-[#1E8B87]/40 focus:bg-white focus:border-[#1E8B87] focus:ring-2 focus:ring-[#1E8B87]/15 outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Mật khẩu</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 group-focus-within:text-[#1E8B87] transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input type={showPassword ? 'text' : 'password'} required={role !== 'STUDENT'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 hover:border-[#1E8B87]/40 focus:bg-white focus:border-[#1E8B87] focus:ring-2 focus:ring-[#1E8B87]/15 outline-none transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {role === 'STUDENT' && <p className="text-[10px] text-slate-400 font-bold mt-2 ml-1 italic">* Mật khẩu mặc định là mã học sinh</p>}
              </div>

              <button type="button" onClick={handleSubmit} disabled={loading}
                className="w-full py-4 bg-[#135E5B] text-white rounded-2xl text-sm font-black shadow-lg shadow-[#135E5B]/25 hover:shadow-xl hover:shadow-[#1E8B87]/30 border border-[#1E8B87]/40 flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:bg-[#1E8B87] transition-all disabled:opacity-60 overflow-hidden relative group cursor-pointer">
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Đang xác thực...</span></>
                    : <span>Đăng nhập</span>}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="w-full py-6 text-center text-[10px] font-black text-teal-200/60 uppercase tracking-widest relative z-10 border-t border-white/10">
          © 2026 SQMS • Hệ thống Giáo dục Sky-Line
        </div>
      </div>
    </>
  )
}