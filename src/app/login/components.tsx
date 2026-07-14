'use client'

import React from 'react'
import { 
  User, Lock, GraduationCap, Users, Shield,
  Eye, EyeOff, AlertCircle
} from 'lucide-react'

// RoleSelector Component with segmented card style
interface RoleSelectorProps {
  role: string
  setRole: (role: string) => void
  setError: (error: string) => void
}

export function RoleSelector({ role, setRole, setError }: RoleSelectorProps) {
  const roles = [
    { id: 'STAFF', label: 'Cán bộ, Giáo viên', icon: User },
    { id: 'PARENT', label: 'Phụ huynh', icon: Users },
    { id: 'STUDENT', label: 'Học sinh', icon: GraduationCap }
  ]

  return (
    <div className="mb-6">
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
        Chọn vai trò
      </label>
      <div className="grid grid-cols-3 gap-3">
        {roles.map((r) => {
          const Icon = r.icon
          const isActive = role === r.id
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setRole(r.id)
                setError('')
              }}
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border text-center transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AAA4]/40 ${
                isActive
                  ? 'bg-white border-[#08AAA4] text-[#08AAA4] shadow-[0_4px_12px_rgba(8,170,164,0.08)]'
                  : 'bg-[#F8FAFC] border-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
              style={{ minHeight: '84px' }}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-[#E6F6F5] text-[#08AAA4]' : 'text-slate-400'}`}>
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="text-[11px] font-bold tracking-tight leading-tight">${r.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// PasswordInput Component
interface PasswordInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  showPassword: boolean
  setShowPassword: (show: boolean) => void
  required?: boolean
  id?: string
}

export function PasswordInput({
  value,
  onChange,
  showPassword,
  setShowPassword,
  required = true,
  id = 'password'
}: PasswordInputProps) {
  return (
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 group-focus-within:text-[#08AAA4] transition-colors" aria-hidden="true">
        <Lock className="w-4.5 h-4.5" />
      </div>
      <input
        id={id}
        type={showPassword ? 'text' : 'password'}
        required={required}
        value={value}
        onChange={onChange}
        placeholder="Nhập mật khẩu"
        autoComplete="current-password"
        className="w-full h-[52px] pl-12 pr-12 rounded-[14px] border border-slate-200 bg-white text-sm font-medium text-[#173B3A] placeholder-slate-400 hover:border-slate-300 focus:bg-white focus:border-[#08AAA4] focus:ring-4 focus:ring-[#08AAA4]/10 outline-none transition-all duration-200"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AAA4]/40 rounded-lg"
        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        style={{ minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
      </button>
    </div>
  )
}

// LoginAlert Component
interface LoginAlertProps {
  message: string
}

export function LoginAlert({ message }: LoginAlertProps) {
  return (
    <div 
      className="mb-6 p-4 flex items-start gap-3 bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-xl text-[#DC2626] animate-in fade-in slide-in-from-top-1 duration-200"
      aria-live="assertive"
    >
      <AlertCircle className="w-5 h-5 shrink-0 text-[#DC2626] mt-0.5" aria-hidden="true" />
      <p className="text-sm font-semibold leading-relaxed">{message}</p>
    </div>
  )
}

// SecurityBanner Component
export function SecurityBanner() {
  return (
    <div className="w-full p-4 flex items-center gap-3 bg-[#E6F6F5]/60 border border-[#CCEBEA] rounded-2xl text-[#008b82] mt-6 select-none">
      <div className="p-2 rounded-xl bg-white text-[#08AAA4] shrink-0 shadow-sm border border-teal-50/50">
        <Shield className="w-5 h-5" />
      </div>
      <p className="text-[11px] font-semibold leading-relaxed text-slate-600">
        Hệ thống bảo mật theo tiêu chuẩn quốc tế, đảm bảo an toàn dữ liệu và quyền riêng tư.
      </p>
    </div>
  )
}

// PageFooter Component
export function PageFooter() {
  return (
    <footer className="w-full py-4 text-center text-xs font-semibold text-slate-400 select-none">
      <span className="tracking-wide">SQMS PORTAL V2.5</span>
      <span className="mx-2 text-slate-300">|</span>
      <span>© 2026 Sky-Line Education</span>
    </footer>
  )
}
