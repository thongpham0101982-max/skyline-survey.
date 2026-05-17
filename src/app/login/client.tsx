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
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{ background: 'rgba(9,35,34,0.75)', backdropFilter: 'blur(12px)' }}>
          <div className="bg-[#FFFCF2] rounded-[2.5rem] p-10 shadow-2xl max-w-sm w-full mx-6"
               style={{ animation: 'fadeInScale 0.3s ease' }}>
            <div className="flex justify-center mb-6">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#135E5B] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <GraduationCap className="w-8 h-8 text-[#135E5B]" />
                </div>
              </div>
            </div>
            <h3 className="text-center text-xl font-black text-[#0F3B39] mb-1">Đang đăng nhập</h3>
            <p className="text-center text-sm text-[#135E5B]/60 font-semibold mb-6">{roleLabel}</p>
            <div className="space-y-3">
              {(loadingSteps as any[]).map((step: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-2"
                     style={{ animation: 'slideInLeft 0.3s ease' }}>
                  {step.done
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    : <Loader2 className="w-5 h-5 text-[#135E5B] shrink-0 animate-spin" />}
                  <span className={`text-sm font-bold ${step.done ? 'text-emerald-600 line-through opacity-60' : 'text-[#0F3B39]'}`}>
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
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div className="login-wrapper min-h-screen flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden" 
         style={{ background: 'linear-gradient(180deg, #E6F3F2 0%, #135E5B 100%)' }}>
      <div className="absolute top-[10%] right-[10%] w-64 h-64 bg-white/20 rounded-full blur-3xl opacity-60" />
      <div className="absolute bottom-[10%] left-[5%] w-80 h-80 bg-white/10 rounded-full blur-3xl opacity-40" />
      <div className="absolute top-[40%] left-[10%] w-48 h-48 bg-white/30 rounded-full blur-3xl opacity-40" />
      <div className="login-container relative z-10 w-full max-w-[480px]">
        <div className="text-center mb-12 animate-in fade-in zoom-in duration-700">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-6 relative">
             <div className="w-full h-full bg-[#135E5B] rounded-[2rem] shadow-xl flex items-center justify-center">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
                  <path d="M50 10 L85 25 V55 C85 75 50 90 50 90 C50 90 15 75 15 55 V25 L50 10 Z" fill="url(#crestGrad)" stroke="white" strokeWidth="2.5" />
                  <path d="M50 25 L75 35 L50 45 L25 35 L50 25 Z" fill="white" />
                  <path d="M35 39.5 V52 C35 55 42 59 50 59 C58 59 65 55 65 52 V39.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <path d="M40 70 C40 65 60 67 60 72 C60 77 40 75 40 80 C40 85 60 85 60 80" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="crestGrad" x1="50" y1="10" x2="50" y2="90" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#1E8B87" />
                      <stop offset="100%" stopColor="#0E4E4B" />
                    </linearGradient>
                  </defs>
                </svg>
             </div>
          </div>
          <h1 className="text-6xl font-black text-[#0D3E3B] tracking-[10px] uppercase drop-shadow-sm mb-2">SQMS</h1>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-[#135E5B] uppercase tracking-wider">Hệ thống Quản trị Chất lượng Trường học</h2>
            <p className="text-[11px] font-bold text-[#1E8B87] uppercase tracking-[3px] opacity-70">School Quality Management System</p>
          </div>
        </div>
        <div className="bg-white/40 backdrop-blur-md p-1.5 rounded-[2rem] border border-white/50 mb-6 flex gap-1.5 shadow-sm">
          {['STAFF', 'PARENT', 'STUDENT'].map((r) => {
            const labels = { STAFF: 'Cán bộ', PARENT: 'Phụ huynh', STUDENT: 'Học sinh' };
            const icons = { STAFF: ShieldCheck, PARENT: Users, STUDENT: GraduationCap };
            const Icon = icons[r];
            return (
              <button key={r} onClick={() => {setRole(r); setError(''); setLoadingSteps([]);}}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${role === r ? 'bg-[#135E5B] text-white shadow-lg' : 'text-[#135E5B]/60 hover:bg-white/40'}`}>
                <Icon className="w-4 h-4" /> <span className="hidden sm:inline">{labels[r]}</span>
              </button>
            )
          })}
        </div>
        <div className="bg-[#FFFCF2] rounded-[3.5rem] p-10 sm:p-12 shadow-2xl border border-white/30 animate-in slide-in-from-bottom-8 duration-700">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-black text-[#0F3B39] mb-3">Dang nhap</h3>
            <p className="text-sm font-medium text-[#135E5B]/70">
              {role === 'STAFF' && 'Sử dụng mã nhân viên hoặc Email được cấp'}
              {role === 'PARENT' && 'Nhập mã phụ huynh để xem thông tin'}
              {role === 'STUDENT' && 'Nhập mã học sinh để tham gia khảo sát'}
            </p>
          </div>
          {error && (
            <div className="mb-6 p-4 rounded-2xl flex items-center gap-3 bg-red-50 text-red-700 border border-red-100 animate-in fade-in zoom-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-black">{error}</p>
            </div>
          )}
          <div className="space-y-7">
            <div>
              <label className="block text-sm font-black text-[#0F3B39] mb-3 ml-1">Tai khoan</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center">
                  <User className="w-5 h-5 text-[#1E8B87]/50" />
                </div>
                <input type="text" required value={identifier} onChange={e => setIdentifier(e.target.value)} 
                  placeholder={role === 'STAFF' ? 'admin@skyline.edu' : 'Ma so cua ban'}
                  className="w-full pl-14 pr-6 py-4 bg-[#ECF3FF] border border-[#DEE9FF] rounded-2xl text-lg font-medium text-slate-800 focus:bg-white focus:border-[#1E8B87]/30 outline-none transition-all shadow-inner" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-black text-[#0F3B39] mb-3 ml-1">Mat khau</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-[#1E8B87]/50" />
                </div>
                <input type={showPassword ? 'text' : 'password'} required={role !== 'STUDENT'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full pl-14 pr-16 py-4 bg-[#ECF3FF] border border-[#DEE9FF] rounded-2xl text-lg font-medium text-slate-800 focus:bg-white focus:border-[#1E8B87]/30 outline-none transition-all shadow-inner" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-orange-900 transition-colors">
                  {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
              </div>
              {role === 'STUDENT' && <p className="text-[10px] text-[#1E8B87]/40 font-bold mt-2 ml-1 italic">* Mật khẩu mặc định là mã học sinh</p>}
            </div>
            <button type="button" onClick={handleSubmit} disabled={loading}
              className="w-full py-5 bg-[#135E5B] text-white rounded-3xl text-xl font-black shadow-xl shadow-[#135E5B]/30 flex items-center justify-center gap-3 hover:translate-y-[-2px] hover:bg-[#135E5B] transition-all disabled:opacity-60 overflow-hidden relative group">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              {loading
                  ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Đang xác thực...</span></>
                  : <span>Đăng nhập</span>}
            </button>

          </div>
        </div>
        <p className="text-center mt-12 text-sm font-extrabold text-[#0D3E3B]/50 tracking-wider">© 2026 SQMS • Hệ thống Giáo dục Sky-Line</p>
        <p className="text-center text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest opacity-50 italic">Hệ thống đã cập nhật v2.0</p>
      </div>
    </div>
    </>
  )
}
