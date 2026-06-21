// @ts-nocheck
'use client'
import { signIn } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, Lock, GraduationCap, Users, ShieldCheck, 
  Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ArrowRight
} from 'lucide-react'

export function LoginClient() {
  const router = useRouter()
  const [role, setRole] = useState('STAFF')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSteps, setLoadingSteps] = useState([])
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

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
    role === 'PARENT' ? 'Phụ huynh' : 'CBGV'

  return (
    <>
      {loading && loadingSteps.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
             style={{ background: 'rgba(5, 20, 19, 0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl max-w-sm w-full mx-6 border border-[#00A99D]/20 animate-in zoom-in-95 duration-200">
            <div className="flex justify-center mb-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#00A99D] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-[#00A99D]" />
                </div>
              </div>
            </div>
            <h3 className="text-center text-lg font-black text-slate-800 mb-1">Đang đăng nhập</h3>
            <p className="text-center text-xs text-[#00A99D] font-extrabold mb-6 uppercase tracking-wider">{roleLabel}</p>
            <div className="space-y-3">
              {(loadingSteps as any[]).map((step: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-2">
                  {step.done
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    : <Loader2 className="w-5 h-5 text-[#00A99D] shrink-0 animate-spin" />}
                  <span className={`text-xs font-bold ${step.done ? 'text-slate-400 line-through opacity-60' : 'text-slate-700'}`}>
                    {step.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="min-h-screen flex flex-col justify-between relative overflow-hidden font-sans bg-[#002e2c]">
        {/* Glow ambient background effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#00A99D]/15 blur-[140px] pointer-events-none animate-pulse duration-[6s]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#007068]/25 blur-[120px] pointer-events-none animate-pulse duration-[8s]" />

        {/* Top Header */}
        <div className="w-full py-5 px-8 flex justify-between items-center relative z-10 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Sky-Line" className="h-9 w-auto object-contain brightness-0 invert opacity-90" />
          </div>
          <span className="text-[10px] font-black text-teal-100/80 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
            SQMS PORTAL V2.5
          </span>
        </div>

        {/* Center Card Container */}
        <div className="w-full max-w-[480px] mx-auto px-4 sm:px-6 py-6 relative z-10 flex flex-col justify-center my-auto animate-in fade-in zoom-in-95 duration-500">
          {/* Card Frame */}
          <div className="bg-white/95 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_32px_64px_-16px_rgba(0,18,17,0.6)] border border-[#00A99D]/20 relative overflow-hidden backdrop-blur-xl">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#00A99D] via-[#005650] to-[#003B3A]" />

            {/* School Logo & Title */}
            <div className="text-center mb-8">
              <img src="/logo.png" alt="Sky-Line School" className="h-14 w-auto object-contain mx-auto mb-4 hover:scale-105 transition-transform duration-300" />
              <h2 className="text-lg font-black text-[#003B3A] uppercase tracking-wider">Hệ thống Quản trị Chất lượng</h2>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-[2px] mt-0.5">School Quality Management System</p>
            </div>

            {/* Premium Role Switcher */}
            <div className="bg-slate-50 p-1.5 rounded-2xl mb-6 flex gap-1 border border-slate-200/50">
              {['STAFF', 'PARENT', 'STUDENT'].map((r) => {
                const labels = { STAFF: 'CBGV', PARENT: 'Phụ huynh', STUDENT: 'Học sinh' };
                const icons = { STAFF: ShieldCheck, PARENT: Users, STUDENT: GraduationCap };
                const Icon = icons[r];
                const isActive = role === r;
                return (
                  <button
                    key={r}
                    onClick={() => { setRole(r); setError(''); setLoadingSteps([]); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                      isActive
                        ? 'bg-[#003B3A] text-white shadow-md shadow-[#003B3A]/25 border border-white/10 scale-[1.02]'
                        : 'text-slate-500 hover:text-[#003B3A] hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{labels[r]}</span>
                  </button>
                )
              })}
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-2xl flex items-start gap-3 bg-rose-50 text-rose-700 border border-rose-100 animate-in fade-in zoom-in-95 duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <p className="text-xs font-black leading-relaxed">{error}</p>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tài khoản</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 group-focus-within:text-[#00A99D] transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)} 
                    placeholder={role === 'STAFF' ? 'admin@skyline.edu' : role === 'PARENT' ? 'Nhập SĐT phụ huynh' : 'Nhập mã học sinh'}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 hover:border-[#00A99D]/40 focus:bg-white focus:border-[#00A99D] focus:ring-4 focus:ring-[#00A99D]/10 outline-none transition-all duration-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Mật khẩu</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 group-focus-within:text-[#00A99D] transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={role !== 'STUDENT'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 hover:border-[#00A99D]/40 focus:bg-white focus:border-[#00A99D] focus:ring-4 focus:ring-[#00A99D]/10 outline-none transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {role === 'STUDENT' && (
                  <p className="text-[10px] text-slate-400 font-bold mt-2 ml-1 italic">
                    * Mật khẩu mặc định là mã học sinh
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-[#00A99D] to-[#009085] text-white rounded-2xl text-sm font-black shadow-lg shadow-[#00A99D]/20 hover:shadow-xl hover:shadow-[#009085]/30 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng nhập</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="w-full py-5 text-center text-[10px] font-black text-teal-200/50 uppercase tracking-widest relative z-10 border-t border-white/5 backdrop-blur-md">
          © 2026 SQMS • Hệ thống Giáo dục Sky-Line
        </div>
      </div>
    </>
  )
}
