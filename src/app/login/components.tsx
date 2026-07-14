'use client'

import React from 'react'
import { 
  User, Lock, GraduationCap, Users, ShieldCheck, 
  Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ArrowRight
} from 'lucide-react'

// RoleSelector Component with segmented control style
interface RoleSelectorProps {
  role: string
  setRole: (role: string) => void
  setError: (error: string) => void
}

export function RoleSelector({ role, setRole, setError }: RoleSelectorProps) {
  const roles = [
    { id: 'STAFF', label: 'CBGV', icon: ShieldCheck },
    { id: 'PARENT', label: 'Phụ huynh', icon: Users },
    { id: 'STUDENT', label: 'Học sinh', icon: GraduationCap }
  ]

  return (
    <div className="p-1 mb-6 flex bg-[#F4F8F8] border border-[#DCE7E7] rounded-xl relative">
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
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AAA4]/40 ${
              isActive
                ? 'bg-white text-[#173B3A] shadow-sm border border-[#DCE7E7]'
                : 'text-[#64748B] hover:text-[#08AAA4] hover:bg-white/50 border border-transparent'
            }`}
            style={{ minHeight: '44px' }}
          >
            <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110 text-[#08AAA4]' : ''}`} aria-hidden="true" />
            <span>{r.label}</span>
          </button>
        )
      })}
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
      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[#64748B] group-focus-within:text-[#08AAA4] transition-colors" aria-hidden="true">
        <Lock className="w-4 h-4" />
      </div>
      <input
        id={id}
        type={showPassword ? 'text' : 'password'}
        required={required}
        value={value}
        onChange={onChange}
        placeholder="••••••••••"
        autoComplete="current-password"
        className="w-full h-[52px] pl-12 pr-12 rounded-[14px] border border-[#DCE7E7] bg-[#F4F8F8] text-sm font-medium text-[#173B3A] placeholder-[#64748B]/60 hover:border-[#08AAA4]/40 focus:bg-white focus:border-[#08AAA4] focus:ring-4 focus:ring-[#08AAA4]/10 outline-none transition-all duration-200"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-[#64748B] hover:text-[#173B3A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AAA4]/40 rounded-lg"
        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        style={{ minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

// PageFooter Component
export function PageFooter() {
  return (
    <footer className="w-full py-6 text-center text-xs font-semibold text-teal-100/60 uppercase tracking-widest relative z-10 border-t border-white/5 backdrop-blur-md">
      © 2026 SQMS – BAN KHẢO THÍ VÀ ĐẢM BẢO CHẤT LƯỢNG
    </footer>
  )
}
