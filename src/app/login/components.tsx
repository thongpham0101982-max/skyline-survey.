'use client'

import React, { useState } from 'react'
import {
  User, Lock, GraduationCap, Users,
  Eye, EyeOff, AlertCircle, ArrowRight,
  ChevronDown, ChevronUp, Sparkles, Microscope, Clock, Medal,
  BrainCircuit, Target, Lightbulb, BookOpen, Heart, ClipboardList,
  BarChart3, Trophy, Compass, ShieldCheck, TrendingUp, AlertTriangle, FileText
} from 'lucide-react'

// ─── SVG Artwork Components ──────────────────────────────────────────────────
export function SchoolLineArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 400" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Clock tower & main building facade */}
      <path d="M260 380V160L300 110L340 160V380" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="300" cy="190" r="22" stroke="currentColor" strokeWidth="1.5" />
      <path d="M300 178V190H308" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M285 240H315V290H285V240Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M300 110V70" stroke="currentColor" strokeWidth="1.5" />
      <path d="M300 70L324 82H300" fill="currentColor" opacity="0.6" />
      
      {/* Left wing */}
      <path d="M120 380V210H260" stroke="currentColor" strokeWidth="1.5" />
      <path d="M145 235H180V275H145V235Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M198 235H233V275H198V235Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M145 300H180V340H145V300Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M198 300H233V340H198V300Z" stroke="currentColor" strokeWidth="1.2" />

      {/* Right wing */}
      <path d="M340 210H480V380" stroke="currentColor" strokeWidth="1.5" />
      <path d="M367 235H402V275H367V235Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M420 235H455V275H420V235Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M367 300H402V340H367V300Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M420 300H455V340H420V300Z" stroke="currentColor" strokeWidth="1.2" />

      {/* Ground baseline */}
      <path d="M40 380H560" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

      {/* Trees & greenery */}
      <path d="M70 380V310" stroke="currentColor" strokeWidth="1.5" />
      <path d="M70 310C50 310 40 270 70 250C70 230 100 230 100 250C120 270 110 310 70 310Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M530 380V310" stroke="currentColor" strokeWidth="1.5" />
      <path d="M530 310C510 310 500 270 530 250C530 230 560 230 560 250C580 270 570 310 530 310Z" stroke="currentColor" strokeWidth="1.2" />

      {/* Sky-Line checkmark swoosh backdrop watermark overlaying the building (Image 2 style) */}
      <path d="M140 180C260 70 420 80 540 20C480 90 340 190 140 180Z" fill="currentColor" opacity="0.18" />
      <path d="M320 100C410 40 500 20 560 0C520 50 430 130 330 140Z" fill="currentColor" opacity="0.12" />
    </svg>
  )
}

export function SkyLineSwooshBg() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* Top right large dark radial gradient glow (Image 2 style) */}
      <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-radial from-[#00D2C4]/20 via-[#004F4D]/10 to-transparent blur-3xl pointer-events-none" />

      {/* Bottom fluid swoosh wave curve (Image 2 style) */}
      <svg className="absolute -bottom-12 -left-12 w-[135%] h-[48%] text-[#00A99D]" viewBox="0 0 1000 350" fill="none">
        <path d="M-50 280 Q 220 80, 580 220 T 1150 160 L 1150 400 L -50 400 Z" fill="url(#image2-swoosh-grad)" />
        <defs>
          <linearGradient id="image2-swoosh-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00E5D5" stopOpacity="0.45" />
            <stop offset="40%" stopColor="#00A99D" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#003B3A" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>

      {/* Secondary swoosh layer */}
      <svg className="absolute -bottom-8 -left-8 w-[120%] h-[38%]" viewBox="0 0 1000 300" fill="none">
        <path d="M-50 290 Q 320 110, 680 240 T 1150 190 L 1150 350 L -50 350 Z" fill="url(#image2-swoosh-grad2)" />
        <defs>
          <linearGradient id="image2-swoosh-grad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00A99D" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

// ─── RoleSelector (Pill Segmented Switcher, Image 2 style) ────────────────────
interface RoleSelectorProps {
  role: string
  setRole: (role: string) => void
  setError: (error: string) => void
}

export function RoleSelector({ role, setRole, setError }: RoleSelectorProps) {
  const roles = [
    { id: 'STAFF', label: 'CBGV', icon: User },
    { id: 'PARENT', label: 'Phụ huynh', icon: Users },
    { id: 'STUDENT', label: 'Học sinh', icon: GraduationCap }
  ]

  return (
    <div className="select-none">
      <div className="grid grid-cols-3 gap-1.5 bg-[#F1F5F9] p-1.5 rounded-2xl border border-slate-200/70">
        {roles.map((r) => {
          const Icon = r.icon
          const isActive = role === r.id
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => { setRole(r.id); setError('') }}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D]/40 ${
                isActive
                  ? 'bg-[#00A99D] text-white shadow-md shadow-teal-600/30 scale-[1.02]'
                  : 'bg-transparent text-[#64748B] hover:text-[#003B3A] hover:bg-slate-200/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 pointer-events-none ${isActive ? 'text-white' : 'text-[#64748B]'}`} aria-hidden="true" />
              <span className="pointer-events-none truncate font-bold">{r.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── LoginAlert ───────────────────────────────────────────────────────────────
interface LoginAlertProps { message: string }
export function LoginAlert({ message }: LoginAlertProps) {
  return (
    <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200/90 rounded-2xl text-[#DC2626] animate-in fade-in zoom-in-95 duration-200 shadow-sm" aria-live="assertive">
      <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 pointer-events-none text-[#DC2626]" aria-hidden="true" />
      <p className="text-xs font-bold leading-relaxed">{message}</p>
    </div>
  )
}

// ─── PageFooter (Image 2 style with side dividers) ───────────────────────────
export function PageFooter() {
  return (
    <footer className="w-full flex items-center justify-center gap-3 select-none text-[11px] font-bold text-slate-400">
      <div className="h-[1px] flex-1 bg-slate-200/80" />
      <span className="tracking-wide text-slate-400 font-bold whitespace-nowrap">SQMS Portal v2.5</span>
      <div className="h-[1px] flex-1 bg-slate-200/80" />
    </footer>
  )
}

// ─── FeatureDrawer (Optional expandable modules drawer for Mobile/Tablet) ───
export function FeatureDrawer() {
  const [expanded, setExpanded] = useState(false)
  const modules = [
    { index: '01', title: 'Khảo sát năng lực đầu vào', description: 'Tổ chức khảo sát, nhập kết quả, phân tích năng lực, hỗ trợ tuyển sinh và xếp lớp.', icon: Microscope },
    { index: '02', title: 'Quản lý dự giờ giáo viên', description: 'Đăng ký tiết dạy, phân công dự giờ, đánh giá, phê duyệt và theo dõi năng lực chuyên môn.', icon: Clock },
    { index: '03', title: 'Thành tích và kỳ thi học sinh', description: 'Quản lý kỳ thi, cuộc thi, giải thưởng, huy chương, xếp hạng và lịch sử thành tích.', icon: Medal },
    { index: '04', title: 'Hỗ trợ học tập và tâm lý', description: 'Theo dõi học sinh cần hỗ trợ, kế hoạch phụ đạo, cam kết học tập và tư vấn tâm lý.', icon: BrainCircuit },
    { index: '05', title: 'Hướng nghiệp & tài chính', description: 'Quản lý hoạt động hướng nghiệp, định hướng nghề nghiệp và thông tin tài chính theo phân quyền.', icon: Target },
    { index: '06', title: 'Kết quả học tập & dự án', description: 'Tổng hợp kết quả môn học, hoạt động trải nghiệm, câu lạc bộ và mức độ tham gia.', icon: Lightbulb }
  ]

  return (
    <div className="w-full mt-6 select-none">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between bg-white/10 border border-white/15 backdrop-blur-md px-4 py-3 rounded-2xl text-xs font-bold text-teal-100 hover:bg-white/15 transition-all cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#00D2C4]" />
          <span>Khám phá phân hệ SQMS</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[#00D2C4]" /> : <ChevronDown className="w-4 h-4 text-[#00D2C4]" />}
      </button>

      <div className={`transition-all duration-300 overflow-hidden ${expanded ? 'max-h-[1200px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/20 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
          {modules.map((m) => {
            const MIcon = m.icon
            return (
              <div key={m.index} className="bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold text-[#00D2C4]">{m.index}</span>
                  <MIcon className="w-3.5 h-3.5 text-[#00D2C4]" />
                </div>
                <h4 className="text-xs font-bold text-white">{m.title}</h4>
                <p className="text-[10px] text-teal-100/60 mt-1 leading-relaxed">{m.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── LoginForm ────────────────────────────────────────────────────────────────
interface LoginFormProps {
  role: string
  setRole: (role: string) => void
  identifier: string
  setIdentifier: (val: string) => void
  password: string
  setPassword: (val: string) => void
  rememberMe: boolean
  setRememberMe: (val: boolean) => void
  error: string
  setError: (val: string) => void
  loading: boolean
  onSubmit: (e: React.FormEvent) => void
  onForgotPassword: () => void
}

export function LoginForm({
  role, setRole, identifier, setIdentifier,
  password, setPassword, rememberMe, setRememberMe,
  error, setError, loading, onSubmit, onForgotPassword
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)

  const inputBase = "w-full h-[48px] rounded-2xl border bg-white text-sm font-semibold text-[#003B3A] placeholder-[#94A3B8] outline-none transition-all duration-200 hover:border-[#00A99D]/50 focus:border-[#00A99D] focus:ring-4 focus:ring-[#00A99D]/15 shadow-sm"

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">

      {/* Role Switcher */}
      <RoleSelector role={role} setRole={setRole} setError={setError} />

      {/* Alert Container */}
      {error && <LoginAlert message={error} />}

      {/* Account */}
      <div className="relative flex items-center">
        <span className="absolute left-4 z-10 flex items-center justify-center pointer-events-none">
          <User className="w-4 h-4 text-slate-400" aria-hidden="true" />
        </span>
        <input
          id="identifier"
          type="text"
          required
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          placeholder="Tài khoản"
          autoComplete="username"
          className={`${inputBase} !pl-11 pr-4 border-slate-200/90`}
        />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1">
        <div className="relative flex items-center">
          <span className="absolute left-4 z-10 flex items-center justify-center pointer-events-none">
            <Lock className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </span>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            required={role !== 'STUDENT'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mật khẩu"
            autoComplete="current-password"
            className={`${inputBase} !pl-11 !pr-11 border-slate-200/90`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 z-10 flex items-center justify-center text-slate-400 hover:text-[#00A99D] transition-colors focus-visible:outline-none cursor-pointer"
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {role === 'STUDENT' && (
          <p className="text-[11px] text-[#00A99D] font-bold ml-1 italic mt-0.5">* Mật khẩu mặc định là mã học sinh</p>
        )}
      </div>

      {/* Remember me & Forgot Password */}
      <div className="flex items-center justify-between select-none pt-0.5">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 font-bold">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-[#00A99D] focus:ring-[#00A99D]/20 cursor-pointer accent-[#00A99D]"
          />
          <span>Ghi nhớ</span>
        </label>
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-xs font-extrabold text-[#00A99D] hover:text-[#009085] hover:underline cursor-pointer transition-colors"
        >
          Quên mật khẩu?
        </button>
      </div>

      {/* Submit Button (Image 2 style) */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-[50px] mt-1 bg-[#00A99D] hover:bg-[#009085] active:scale-[0.99] text-white rounded-2xl text-sm font-extrabold shadow-lg shadow-teal-600/25 hover:shadow-xl hover:shadow-teal-600/35 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00A99D]/30 cursor-pointer"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin pointer-events-none" />
            <span>Đang đăng nhập...</span>
          </>
        ) : (
          <>
            <span className="text-base font-black tracking-wide">Đăng nhập</span>
            <ArrowRight className="w-5 h-5 pointer-events-none stroke-[2.5]" />
          </>
        )}
      </button>

    </form>
  )
}
