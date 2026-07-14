// @ts-nocheck
'use client'

import React, { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  User, Lock, GraduationCap, Users, ShieldCheck, 
  Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ArrowRight
} from 'lucide-react'
import { RoleSelector, PasswordInput, LoginAlert, PageFooter } from './components'

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
             style={{ background: 'rgba(0, 31, 30, 0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-[24px] p-8 shadow-2xl max-w-sm w-full mx-6 border border-[#DCE7E7] animate-in zoom-in-95 duration-200">
            <div className="flex justify-center mb-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-[#F4F8F8]" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#08AAA4] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-[#08AAA4]" />
                </div>
              </div>
            </div>
            <h3 className="text-center text-lg font-bold text-[#173B3A] mb-1">Đang đăng nhập</h3>
            <p className="text-center text-xs text-[#08AAA4] font-extrabold mb-6 uppercase tracking-wider">{roleLabel}</p>
            <div className="space-y-3">
              {(loadingSteps as any[]).map((step: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-2">
                  {step.done
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    : <Loader2 className="w-5 h-5 text-[#08AAA4] shrink-0 animate-spin" />}
                  <span className={`text-xs font-semibold ${step.done ? 'text-[#64748B] line-through opacity-60' : 'text-[#173B3A]'}`}>
                    {step.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div 
        className="min-h-screen flex flex-col justify-between relative overflow-hidden font-sans"
        style={{
          background: 'radial-gradient(circle at 50% 35%, rgba(8,170,164,0.18), transparent 35%), linear-gradient(135deg, #003936 0%, #004B46 55%, #003B38 100%)'
        }}
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#08AAA4]/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#004B46]/30 blur-[110px] pointer-events-none" />

        {/* Top Header */}
        <div className="w-full py-5 px-6 sm:px-8 flex justify-between items-center relative z-10 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Sky-Line" className="h-8 sm:h-9 w-auto object-contain brightness-0 invert opacity-90" />
          </div>
          <span className="text-[10px] sm:text-xs font-extrabold text-teal-100/80 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
            SQMS PORTAL V2.5
          </span>
        </div>

        {/* Center Card Container */}
        <div className="w-full max-w-[560px] mx-auto px-4 sm:px-6 py-8 relative z-10 flex flex-col justify-center my-auto transition-all duration-300">
          
          {/* Card Frame */}
          <div className="bg-white rounded-[24px] p-6 sm:p-10 shadow-[0_12px_40px_rgba(0,18,17,0.25)] border border-[#DCE7E7] relative overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-8 duration-500">
            {/* Top decorative primary line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#08AAA4]" />

            {/* School Logo & Title */}
            <div className="text-center mb-8 flex flex-col items-center">
              <img 
                src="/logo.png" 
                alt="Sky-Line School Logo" 
                className="h-12 sm:h-14 w-auto object-contain mb-4 transition-transform duration-300 hover:scale-105" 
              />
              <h1 className="text-base sm:text-lg font-bold text-[#173B3A] uppercase tracking-wider">
                HỆ THỐNG QUẢN TRỊ CHẤT LƯỢNG
              </h1>
              <p className="text-[9px] sm:text-[10px] font-extrabold text-[#64748B] uppercase tracking-[2px] mt-1">
                School Quality Management System
              </p>
            </div>

            {/* Role Switcher */}
            <RoleSelector role={role} setRole={setRole} setError={setError} />

            {error && <LoginAlert message={error} />}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label 
                  htmlFor="identifier"
                  className="block text-xs font-semibold text-[#173B3A] uppercase tracking-wider mb-2 ml-1"
                >
                  Tài khoản
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[#64748B] group-focus-within:text-[#08AAA4] transition-colors" aria-hidden="true">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)} 
                    placeholder={
                      role === 'STAFF' 
                        ? 'admin@skyline.edu.vn' 
                        : role === 'PARENT' 
                          ? 'Nhập SĐT phụ huynh' 
                          : 'Nhập mã học sinh'
                    }
                    autoComplete="username"
                    className="w-full h-[52px] pl-12 pr-4 rounded-[14px] border border-[#DCE7E7] bg-[#F4F8F8] text-sm font-medium text-[#173B3A] placeholder-[#64748B]/60 hover:border-[#08AAA4]/40 focus:bg-white focus:border-[#08AAA4] focus:ring-4 focus:ring-[#08AAA4]/10 outline-none transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label 
                  htmlFor="password"
                  className="block text-xs font-semibold text-[#173B3A] uppercase tracking-wider mb-2 ml-1"
                >
                  Mật khẩu
                </label>
                
                <PasswordInput 
                  id="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  required={role !== 'STUDENT'}
                />

                {role === 'STUDENT' && (
                  <p className="text-[11px] text-[#64748B] font-semibold mt-2 ml-1 italic">
                    * Mật khẩu mặc định là mã học sinh
                  </p>
                )}
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[54px] bg-[#08AAA4] hover:bg-[#078F8A] text-white rounded-[14px] text-sm font-bold shadow-md shadow-[#08AAA4]/10 hover:shadow-lg hover:shadow-[#078F8A]/20 flex items-center justify-center gap-2 hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AAA4]/40"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang đăng nhập...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng nhập</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Microsoft 365 SSO Preparation Placeholder */}
            <div className="mt-6 pt-6 border-t border-[#DCE7E7] flex flex-col items-center">
              <button
                type="button"
                disabled
                className="w-full h-[52px] border border-[#DCE7E7] text-[#64748B] rounded-[14px] text-xs font-bold flex items-center justify-center gap-2 bg-[#F4F8F8]/50 opacity-60 cursor-not-allowed"
                title="Đăng nhập bằng Microsoft 365 (Chưa được cấu hình)"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M0 0H10.8V10.8H0V0Z" fill="#F25022"/>
                  <path d="M12.2 0H23V10.8H12.2V0Z" fill="#7FBA00"/>
                  <path d="M0 12.2H10.8V23H0V12.2Z" fill="#00A4EF"/>
                  <path d="M12.2 12.2H23V23H12.2V12.2Z" fill="#FFB900"/>
                </svg>
                <span>Đăng nhập bằng Microsoft 365</span>
              </button>
            </div>
            
          </div>
        </div>

        {/* Bottom Footer */}
        <PageFooter />
      </div>
    </>
  )
}
