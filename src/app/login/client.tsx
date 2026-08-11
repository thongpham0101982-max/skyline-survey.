// @ts-nocheck
'use client'

import React, { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { GraduationCap, CheckCircle2, Loader2 } from 'lucide-react'
import { LoginForm, FeatureOverview, PageFooter } from './components'

export function LoginClient() {
  const [role, setRole] = useState('STAFF')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSteps, setLoadingSteps] = useState([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const addStep = (text: string) => {
    setLoadingSteps((prev: any[]) => {
      const updated = prev.map((s: any, i: number) =>
        i === prev.length - 1 ? { ...s, done: true } : s
      )
      return [...updated, { text, done: false }]
    })
  }

  const validateForm = () => {
    if (!identifier.trim()) { setError('Vui lòng nhập tài khoản.'); return false }
    if (role !== 'STUDENT' && !password) { setError('Vui lòng nhập mật khẩu.'); return false }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validateForm()) return
    setLoading(true)
    setLoadingSteps([])
    try {
      if (role === 'STUDENT') {
        setLoadingSteps([{ text: 'Đang xác thực...', done: false }])
        await new Promise(r => setTimeout(r, 600))
        addStep('Bắt đầu xử lý đăng nhập Học sinh...')
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
          setError(data.error || 'Thông tin mã học sinh không hợp lệ.')
          setLoading(false); setLoadingSteps([]); return
        }
        setLoadingSteps((prev: any[]) => prev.map(s => ({ ...s, done: true })))
        addStep('Đăng nhập thành công! Đang chuyển trang...')
        await new Promise(r => setTimeout(r, 500))
        document.cookie = 'hs_token=' + data.token + '; path=/; max-age=' + (rememberMe ? 30 * 24 * 60 * 60 : 2 * 24 * 60 * 60) + '; SameSite=Lax'
        window.location.href = '/hocsinh/hs-khaosat/danh-sach'
      } else {
        setLoadingSteps([{ text: 'Đang xác thực tài khoản...', done: false }])
        await new Promise(r => setTimeout(r, 300))
        try {
          const result: any = await signIn('credentials', { 
            email: identifier.trim(), 
            password, 
            redirect: false 
          })

          if (result?.error || (result?.url && result.url.includes('error='))) {
            const errCode = String(result?.error || result?.url || '')
            if (errCode.includes('TAI_KHOAN_BI_KHOA')) {
              setError('Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động.')
            } else {
              setError('Sai tên đăng nhập hoặc mật khẩu.')
            }
            setLoading(false)
            setLoadingSteps([])
            return
          }

          setLoadingSteps((prev: any[]) => prev.map(s => ({ ...s, done: true })))
          addStep('Đăng nhập thành công! Đang chuyển trang...')
          
          // Verify session and redirect directly to appropriate dashboard
          const sessRes = await fetch('/api/auth/session').then(r => r.json()).catch(() => null)
          const userRole = sessRes?.user?.role

          await new Promise(r => setTimeout(r, 300))

          if (userRole === 'PARENT') {
            window.location.href = '/parent'
          } else if (userRole && ['TEACHER', 'GV_MN'].includes(userRole)) {
            window.location.href = '/teacher'
          } else if (userRole === 'STUDENT') {
            window.location.href = '/hocsinh/hs-khaosat/danh-sach'
          } else if (userRole === 'KT_DBCL') {
            window.location.href = '/admin/surveys'
          } else if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'GDCS' || userRole === 'BGH') {
            window.location.href = '/admin'
          } else {
            // Default fallback for CBGV teacher login
            window.location.href = '/teacher'
          }

        } catch (err: any) {
          const errStr = String(err?.message || err?.type || err?.code || err || '')
          if (errStr.includes('TAI_KHOAN_BI_KHOA')) {
            setError('Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động.')
          } else if (
            errStr.includes('CredentialsSignin') ||
            errStr.includes('CallbackRouteError') ||
            errStr.includes('credentials') ||
            errStr.includes('Configuration')
          ) {
            setError('Sai tên đăng nhập hoặc mật khẩu.')
          } else {
            setError('Lỗi kết nối hệ thống. Vui lòng thử lại.')
          }
          setLoading(false)
          setLoadingSteps([])
        }
      }
    } catch {
      setError('Lỗi kết nối hệ thống. Vui lòng thử lại.')
      setLoading(false); setLoadingSteps([])
    }
  }

  const handleForgotPassword = () => {
    setError('Vui lòng liên hệ Ban Khảo thí & Đảm bảo chất lượng để được cấp lại mật khẩu.')
  }

  if (!mounted) return null

  const roleLabel = role === 'STUDENT' ? 'Học sinh' : role === 'PARENT' ? 'Phụ huynh' : 'CBGV'

  return (
    <>
      {/* Loading modal */}
      {loading && loadingSteps.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,31,30,0.9)', backdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-[24px] p-8 shadow-2xl max-w-sm w-full mx-6 border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-center mb-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-slate-50" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#00A99D] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-[#00A99D]" />
                </div>
              </div>
            </div>
            <h3 className="text-center text-lg font-bold text-[#17383D] mb-1">Đang đăng nhập</h3>
            <p className="text-center text-xs text-[#00A99D] font-extrabold mb-6 uppercase tracking-wider">{roleLabel}</p>
            <div className="space-y-3">
              {(loadingSteps as any[]).map((step: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-2">
                  {step.done
                    ? <CheckCircle2 className="w-5 h-5 text-[#21875A] shrink-0" />
                    : <Loader2 className="w-5 h-5 text-[#00A99D] shrink-0 animate-spin" />}
                  <span className={`text-xs font-semibold ${step.done ? 'text-slate-400 line-through opacity-60' : 'text-[#17383D]'}`}>
                    {step.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F5F8F8] font-sans">

        {/* LEFT: Features */}
        <div className="hidden md:flex md:w-[50%] xl:w-[58%] flex-col justify-between p-8 lg:p-12 xl:p-16 bg-[#003B3A] relative select-none">
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-[#00A99D]/12 blur-[130px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-teal-500/8 blur-[110px] pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          <div className="relative z-10 w-full">
            <div className="flex flex-col items-start">
              <img src="/logo.png" alt="Sky-Line Logo" className="h-10 w-auto object-contain brightness-0 invert opacity-95 pointer-events-none" />
            </div>
            <div className="mt-8 lg:mt-10">
              <FeatureOverview />
            </div>
          </div>

          <div className="relative z-10 border-t border-white/5 pt-4 mt-6 flex flex-wrap items-center justify-between gap-2 text-[9px] font-extrabold tracking-wider text-teal-100/30 select-none">
            {['DỮ LIỆU CHÍNH XÁC', 'QUẢN TRỊ MINH BẠCH', 'THEO DÕI LIÊN TỤC', 'ĐỒNG HÀNH PHÁT TRIỂN'].map(t => (
              <span key={t} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00A99D] inline-block" />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* RIGHT: Login */}
        <div className="w-full md:w-[50%] xl:w-[42%] bg-[#F5F8F8] flex flex-col justify-center p-4 sm:p-6 md:p-8 relative z-10">

          {/* Premium Sky-Line, Earthy Yellow, and Tím Than Gradient Border Wrapper */}
          <div className="bg-gradient-to-tr from-[#00A99D] via-[#D97706] to-[#251b4b] p-[1.5px] rounded-3xl shadow-[0_16px_40px_rgba(0,31,30,0.06)] max-w-[440px] w-full mx-auto transition-all duration-300">
            <div className="bg-white rounded-[23px] p-6 sm:p-8 md:p-10 w-full">

              {/* Brand */}
              <div className="mb-6 flex flex-col items-start select-none">
                <img src="/logo.png" alt="Sky-Line" className="h-10 w-auto object-contain mb-3 pointer-events-none" />
                <h2 className="text-[22px] font-black text-[#003B3A] tracking-tight leading-tight">Đăng nhập hệ thống</h2>
                <p className="text-xs text-[#8FA5AE] mt-1 font-semibold">Truy cập hệ thống theo tài khoản được cấp</p>
              </div>

              {/* Form */}
              <LoginForm
                role={role} setRole={setRole}
                identifier={identifier} setIdentifier={setIdentifier}
                password={password} setPassword={setPassword}
                rememberMe={rememberMe} setRememberMe={setRememberMe}
                error={error} setError={setError}
                loading={loading}
                onSubmit={handleSubmit}
                onForgotPassword={handleForgotPassword}
              />

              <div className="mt-6 border-t border-slate-100/60 pt-4">
                <PageFooter />
              </div>
            </div>
          </div>

          {/* Mobile: Feature overview below form */}
          <div className="block md:hidden mt-6 bg-[#003B3A] rounded-2xl p-6 shadow-sm border border-teal-950/20">
            <FeatureOverview />
          </div>

        </div>

      </div>
    </>
  )
}
