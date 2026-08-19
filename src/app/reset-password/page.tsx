// @ts-nocheck
'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, GraduationCap } from 'lucide-react'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!token) {
      setError('Mã khôi phục (token) không tồn tại. Vui lòng kiểm tra lại liên kết trong email.')
      return
    }

    if (password.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }

    if (password !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.')
        setLoading(false)
        return
      }

      setSuccessMessage(data.message || 'Đặt lại mật khẩu thành công!')
      setLoading(false)

      setTimeout(() => {
        router.push('/login')
      }, 2500)

    } catch {
      setError('Lỗi kết nối máy chủ. Vui lòng thử lại sau.')
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-[28px] p-8 sm:p-10 shadow-[0_20px_60px_rgba(0,31,30,0.08)] border border-slate-100 max-w-[440px] w-full mx-auto relative z-10">
      <div className="flex flex-col items-center justify-center mb-6 select-none text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#003B3A] text-white flex items-center justify-center mb-4 shadow-lg shadow-[#003B3A]/20">
          <GraduationCap className="w-8 h-8 text-[#00D2C4]" />
        </div>
        <h2 className="text-2xl font-black text-[#003B3A] tracking-tight">Đặt lại Mật khẩu</h2>
        <p className="text-xs text-slate-500 font-medium mt-1">Tạo mật khẩu mới cho tài khoản SQMS Portal của bạn</p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-[#DC2626] animate-in fade-in zoom-in-95 duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs font-bold leading-relaxed">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 animate-in fade-in zoom-in-95 duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <p className="text-xs font-bold leading-relaxed">{successMessage}</p>
            <p className="text-[11px] font-semibold text-emerald-600 mt-1">Đang tự động chuyển về trang Đăng nhập...</p>
          </div>
        </div>
      )}

      {!successMessage && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-[#003B3A]">Mật khẩu mới:</label>
            <div className="relative flex items-center">
              <span className="absolute left-4 z-10 flex items-center justify-center pointer-events-none">
                <Lock className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                className="w-full h-[48px] rounded-2xl border border-slate-200 bg-white !pl-11 !pr-11 text-sm font-semibold text-[#003B3A] placeholder-[#94A3B8] outline-none transition-all focus:border-[#48BFE3] focus:ring-4 focus:ring-[#48BFE3]/15 shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 z-10 flex items-center justify-center text-slate-400 hover:text-[#48BFE3] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-extrabold text-[#003B3A]">Xác nhận mật khẩu mới:</label>
            <div className="relative flex items-center">
              <span className="absolute left-4 z-10 flex items-center justify-center pointer-events-none">
                <Lock className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full h-[48px] rounded-2xl border border-slate-200 bg-white !pl-11 !pr-11 text-sm font-semibold text-[#003B3A] placeholder-[#94A3B8] outline-none transition-all focus:border-[#48BFE3] focus:ring-4 focus:ring-[#48BFE3]/15 shadow-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[50px] mt-2 bg-[#48BFE3] hover:bg-[#009085] active:scale-[0.99] text-white rounded-2xl text-sm font-extrabold shadow-lg shadow-teal-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <span>Đang xử lý...</span>
            ) : (
              <>
                <span>Xác nhận Đặt lại Mật khẩu</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>
      )}

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="text-xs font-bold text-[#48BFE3] hover:underline"
        >
           Quay lại Trang Đăng nhập
        </button>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#F7FAFA] font-sans selection:bg-[#48BFE3] selection:text-white">
      <Suspense fallback={
        <div className="text-center font-bold text-[#003B3A]">Đang tải...</div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
