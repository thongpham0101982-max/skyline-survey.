// @ts-nocheck
'use client'

import React, { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { GraduationCap, CheckCircle2, Loader2 } from 'lucide-react'
import { LoginForm, PageFooter, SchoolLineArt, SkyLineSwooshBg, FeatureDrawer, ForgotPasswordModal } from './components'

export function LoginClient() {
  const [role, setRole] = useState('STAFF')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSteps, setLoadingSteps] = useState([])
  const [mounted, setMounted] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)

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
        if (data.student) {
          localStorage.setItem('currentStudent', JSON.stringify(data.student))
        }
        document.cookie = 'hs_token=' + data.token + '; path=/; max-age=' + (rememberMe ? 30 * 24 * 60 * 60 : 2 * 24 * 60 * 60) + '; SameSite=Lax'
        window.location.href = '/hocsinh/portal'
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
    setShowForgotModal(true)
  }

  if (!mounted) return null

  const roleLabel = role === 'STUDENT' ? 'Học sinh' : role === 'PARENT' ? 'Phụ huynh' : 'CBGV'

  return (
    <>
      {/* Loading Step Modal */}
      {loading && loadingSteps.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#001D1C]/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-center mb-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#48BFE3] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <GraduationCap className="w-7 h-7 text-[#48BFE3]" />
                </div>
              </div>
            </div>
            <h3 className="text-center text-lg font-extrabold text-[#003B3A] mb-0.5">Đang đăng nhập</h3>
            <p className="text-center text-xs text-[#48BFE3] font-black mb-6 uppercase tracking-wider">{roleLabel}</p>
            <div className="space-y-3">
              {(loadingSteps as any[]).map((step: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-2">
                  {step.done
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    : <Loader2 className="w-5 h-5 text-[#48BFE3] shrink-0 animate-spin" />}
                  <span className={`text-xs font-semibold ${step.done ? 'text-slate-400 line-through opacity-70' : 'text-[#003B3A]'}`}>
                    {step.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main split-screen layout (Image 2 style) */}
      <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F7FAFA] font-sans selection:bg-[#48BFE3] selection:text-white relative overflow-hidden">

        {/* LEFT PANEL: Ultra-sleek Image 2 Brand Showcase */}
        <div className="w-full md:w-[48%] xl:w-[50%] flex flex-col justify-between p-8 sm:p-12 xl:p-16 bg-[#003B3A] relative select-none overflow-hidden min-h-[380px] md:min-h-screen">
          
          {/* Dot Matrix Pattern Overlay (Top Left, Image 2 style) */}
          <div className="absolute top-8 left-8 w-48 h-48 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #00D2C4 1.5px, transparent 1.5px)', backgroundSize: '18px 18px' }} />
          
          {/* Fluid Swoosh Wave (Bottom Left, Image 2 style) */}
          <SkyLineSwooshBg />

          {/* School Building & Sky-Line Checkmark Watermark (Bottom Right, Image 2 style) */}
          <div className="absolute bottom-0 right-0 w-[90%] md:w-[85%] h-[60%] text-[#48BFE3]/25 opacity-70 pointer-events-none flex items-end justify-end">
            <SchoolLineArt className="w-full h-full object-contain" />
          </div>

          {/* TOP LEFT BRAND TITLE SECTION (Image 2 style - Moved to very top left) */}
          <div className="relative z-10 flex flex-col items-start pt-2 sm:pt-4">
            {/* White Brand Logo */}
            <div className="mb-4 flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Sky-Line Logo"
                className="h-10 sm:h-12 md:h-14 w-auto object-contain brightness-0 invert opacity-95 pointer-events-none drop-shadow-md"
              />
            </div>

            {/* Main Title: SQMS Portal */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none drop-shadow-sm">
              SQMS Portal
            </h1>

            {/* Accent Line Underneath */}
            <div className="w-16 h-1 bg-[#00D2C4] rounded-full mt-4 mb-3 shadow-md shadow-[#00D2C4]/40" />

            {/* 3 Glowing Status Dots (Image 2 style) */}
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00D2C4] animate-pulse" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#48BFE3]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#007068]" />
            </div>

            {/* Feature Drawer for Mobile/Tablet inside Left Panel */}
            <div className="w-full max-w-md hidden sm:block md:hidden mt-6">
              <FeatureDrawer />
            </div>
          </div>

          {/* Bottom Footer Tagline */}
          <div className="relative z-10 text-[10px] font-bold text-teal-100/40 uppercase tracking-widest mt-auto pt-8">
            Sky-Line Education System
          </div>
        </div>

        {/* RIGHT PANEL: Clean Elevated Floating Login Card (Image 2 style) */}
        <div className="w-full md:w-[52%] xl:w-[50%] bg-[#F7FAFA] flex flex-col justify-center items-center p-4 sm:p-8 md:p-12 relative z-10 min-h-[calc(100vh-380px)] md:min-h-screen">

          {/* Soft background Swoosh vector lines */}
          <svg className="absolute inset-0 w-full h-full opacity-40 pointer-events-none" viewBox="0 0 1000 1000" fill="none">
            <path d="M400 -100 C 700 200, 900 600, 1100 1100" stroke="#48BFE3" strokeWidth="60" opacity="0.03" strokeLinecap="round" />
            <path d="M600 -100 C 850 300, 950 700, 1150 1100" stroke="#00D2C4" strokeWidth="40" opacity="0.04" strokeLinecap="round" />
          </svg>

          {/* Elevated Floating White Card (Image 2 style) */}
          <div className="bg-white rounded-[28px] sm:rounded-[32px] p-8 sm:p-10 md:p-12 shadow-[0_20px_60px_rgba(0,31,30,0.06)] border border-slate-100/90 max-w-[420px] w-full mx-auto transition-all duration-300 relative z-10 hover:shadow-[0_24px_70px_rgba(0,31,30,0.09)]">
            
            {/* Header: Sky-Line Logo + "Đăng nhập" (Image 2 style) */}
            <div className="flex flex-col items-center justify-center mb-8 select-none">
              <img
                src="/logo.png"
                alt="Sky-Line"
                className="h-10 sm:h-11 w-auto object-contain mb-5 pointer-events-none"
              />
              <h2 className="text-2xl sm:text-3xl font-black text-[#003B3A] tracking-tight">
                Đăng nhập
              </h2>
            </div>

            {/* LoginForm */}
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

            {/* Footer with side dividers (Image 2 style) */}
            <div className="mt-8">
              <PageFooter />
            </div>

          </div>

          {/* Feature Drawer for Mobile (screen < 640px) */}
          <div className="w-full max-w-[420px] sm:hidden">
            <FeatureDrawer />
          </div>

        </div>

      </div>

      <ForgotPasswordModal isOpen={showForgotModal} onClose={() => setShowForgotModal(false)} />
    </>
  )
}
