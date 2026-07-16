'use client'

import React, { useState } from 'react'
import {
  User, Lock, GraduationCap, Users,
  Eye, EyeOff, AlertCircle, ArrowRight,
  FileText, ShieldCheck, TrendingUp, AlertTriangle, ChevronDown, ChevronUp,
  BookOpen, Heart, Trophy, Compass, BarChart3, Microscope,
  ClipboardList, Clock, Medal, BrainCircuit, Target, Lightbulb
} from 'lucide-react'

// ─── FeatureCard ──────────────────────────────────────────────────────────────
interface FeatureCardProps {
  index: string
  title: string
  description: string
  icon: React.ComponentType<any>
  gradientFrom: string
  gradientTo: string
}

export function FeatureCard({ index, title, description, icon: Icon, gradientFrom, gradientTo }: FeatureCardProps) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 group select-none shadow-sm hover:shadow-md">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-extrabold text-[#00A99D] tracking-widest">{index}</span>
        <div
          className="w-8.5 h-8.5 rounded-xl flex items-center justify-center shadow-md shrink-0 pointer-events-none group-hover:scale-105 transition-transform"
          style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
        >
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      <h3 className="text-[11px] font-bold text-white leading-tight">{title}</h3>
      <p className="text-[10px] text-teal-100/60 leading-relaxed mt-1">{description}</p>
    </div>
  )
}

// ─── StudentProfileHighlight ──────────────────────────────────────────────────
export function StudentProfileHighlight() {
  const badges = [
    { text: 'Kết quả học tập', icon: BookOpen },
    { text: 'Hỗ trợ & tâm lý', icon: Heart },
    { text: 'Trải nghiệm & dự án', icon: ClipboardList },
    { text: 'Khảo sát đầu vào', icon: BarChart3 },
    { text: 'Thành tích kỳ thi', icon: Trophy },
    { text: 'Hướng nghiệp', icon: Compass },
    { text: 'Chuẩn đầu ra', icon: ShieldCheck },
    { text: 'Tiến bộ học tập', icon: TrendingUp },
    { text: 'Cảnh báo sớm', icon: AlertTriangle }
  ]
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-4.5 mt-4 select-none">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-shrink-0 w-[80px] h-[64px] bg-[#00A99D]/10 border border-[#00A99D]/20 rounded-xl flex items-center justify-center group">
          <div className="w-11 h-8 bg-[#00A99D]/20 border border-[#00A99D]/40 rounded-lg relative flex items-center justify-center transition-all duration-300 group-hover:scale-105 pointer-events-none">
            <FileText className="w-4.5 h-4.5 text-[#00A99D]" />
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 border border-[#003B3A]">
              <div className="w-full h-full rounded-full bg-emerald-300 animate-ping opacity-60" />
            </div>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-xs font-black text-white tracking-wide uppercase">Hồ sơ học tập điện tử học sinh</h3>
          <p className="text-[10px] text-teal-100/50 leading-relaxed mt-1">
            Tổng hợp toàn bộ quá trình học tập, rèn luyện và phát triển của học sinh qua từng năm học.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-3">
            {badges.map((badge, idx) => {
              const BIcon = badge.icon
              return (
                <div key={idx} className="flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-md px-2 py-1 text-[9px] font-bold text-teal-100/80">
                  <BIcon className="w-2.5 h-2.5 text-[#00A99D] shrink-0 pointer-events-none" />
                  <span className="truncate">{badge.text}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── FeatureOverview ──────────────────────────────────────────────────────────
export function FeatureOverview() {
  const [expanded, setExpanded] = useState(false)
  const modules = [
    { index: '01', title: 'Khảo sát năng lực đầu vào', description: 'Tổ chức khảo sát, nhập kết quả, phân tích năng lực, hỗ trợ tuyển sinh và xếp lớp.', icon: Microscope, gradientFrom: '#00A99D', gradientTo: '#10B981' },
    { index: '02', title: 'Quản lý dự giờ giáo viên', description: 'Đăng ký tiết dạy, phân công dự giờ, đánh giá, phê duyệt và theo dõi năng lực chuyên môn.', icon: Clock, gradientFrom: '#009085', gradientTo: '#0EA5E9' },
    { index: '03', title: 'Thành tích và kỳ thi học sinh', description: 'Quản lý kỳ thi, cuộc thi, giải thưởng, huy chương, xếp hạng và lịch sử thành tích.', icon: Medal, gradientFrom: '#D97706', gradientTo: '#F59E0B' },
    { index: '04', title: 'Hỗ trợ học tập và tâm lý', description: 'Theo dõi học sinh cần hỗ trợ, kế hoạch phụ đạo, cam kết học tập và tư vấn tâm lý.', icon: BrainCircuit, gradientFrom: '#BE185D', gradientTo: '#EC4899' },
    { index: '05', title: 'Hướng nghiệp & tài chính', description: 'Quản lý hoạt động hướng nghiệp, định hướng nghề nghiệp và thông tin tài chính theo phân quyền.', icon: Target, gradientFrom: '#6D28D9', gradientTo: '#8B5CF6' },
    { index: '06', title: 'Kết quả học tập & dự án', description: 'Tổng hợp kết quả môn học, hoạt động trải nghiệm, câu lạc bộ và mức độ tham gia.', icon: Lightbulb, gradientFrom: '#007068', gradientTo: '#14B8A6' }
  ]
  return (
    <div className="relative z-10 w-full">
      <div className="md:hidden flex items-center justify-between border-t border-b border-white/5 py-3 mb-4 select-none">
        <span className="text-xs font-bold text-teal-100/80">Khám phá các phân hệ SQMS</span>
        <button type="button" onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-xs font-bold text-[#00A99D] bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 active:scale-95 transition-all">
          <span>{expanded ? 'Thu gọn' : 'Xem chi tiết'}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      <div className={`transition-all duration-300 overflow-hidden md:block ${expanded ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0 md:max-h-none md:opacity-100'}`}>
        <div className="mb-5 md:mb-6">
          <h1 className="text-xl lg:text-2xl font-black text-white leading-tight tracking-wide">
            HỆ THỐNG QUẢN TRỊ<br />CHẤT LƯỢNG GIÁO DỤC SKY-LINE
          </h1>
          <p className="text-xs text-teal-100/60 leading-relaxed max-w-xl mt-2.5">
            Nền tảng quản trị tập trung dữ liệu người học, người dạy và các hoạt động giáo dục trong toàn Hệ thống Sky-Line.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {modules.map((m) => (
            <FeatureCard key={m.index} index={m.index} title={m.title} description={m.description} icon={m.icon} gradientFrom={m.gradientFrom} gradientTo={m.gradientTo} />
          ))}
        </div>
        <StudentProfileHighlight />
      </div>
    </div>
  )
}

// ─── RoleSelector (compact, horizontal pill-style) ───────────────────────────
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
      <p className="text-[10px] font-bold text-[#8FA5AE] uppercase tracking-widest mb-2">Vai trò</p>
      <div className="grid grid-cols-3 gap-2">
        {roles.map((r) => {
          const Icon = r.icon
          const isActive = role === r.id
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => { setRole(r.id); setError('') }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-[11px] font-bold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D]/40 ${
                isActive
                  ? 'bg-[#E6F6F5] border-[#00A99D] text-[#00A99D]'
                  : 'bg-[#F5F8F8] border-[#E2ECF0] text-[#8FA5AE] hover:border-[#00A99D]/50 hover:text-[#003B3A]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 pointer-events-none ${isActive ? 'text-[#00A99D]' : 'text-[#9DB8C0]'}`} aria-hidden="true" />
              <span className="pointer-events-none truncate">{r.label}</span>
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
    <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-[#D64545] animate-in fade-in duration-200" aria-live="assertive">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 pointer-events-none" aria-hidden="true" />
      <p className="text-xs font-semibold leading-relaxed">{message}</p>
    </div>
  )
}

// ─── PageFooter ───────────────────────────────────────────────────────────────
export function PageFooter() {
  return (
    <footer className="w-full pt-4 text-center text-[10px] font-semibold text-slate-400/80 select-none">
      <span className="tracking-wide">SQMS PORTAL V2.5</span>
      <span className="mx-2 text-slate-300">|</span>
      <span>© 2026 Sky-Line Education</span>
    </footer>
  )
}

// ─── LoginForm (compact, no Microsoft button) ─────────────────────────────────
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

  const inputBase = "w-full h-[48px] rounded-xl border bg-white text-sm font-semibold text-[#003B3A] placeholder-[#B0C4CB] outline-none transition-all duration-200 hover:border-[#ACCFCF] focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/15"

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3.5">

      {/* Role Selector */}
      <RoleSelector role={role} setRole={setRole} setError={setError} />

      {/* Error alert (stable height prevents layout shift) */}
      <div className="min-h-[36px]">
        {error && <LoginAlert message={error} />}
      </div>

      {/* Account */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="identifier" className="text-[10px] font-bold text-[#8FA5AE] uppercase tracking-widest ml-0.5">
          Tài khoản
        </label>
        <div className="relative flex items-center">
          {/* Icon — always absolute, pointer-events-none, vertically centered */}
          <span className="absolute left-4 z-10 flex items-center justify-center pointer-events-none">
            <User className="w-4 h-4 text-[#9DB8C0]" aria-hidden="true" />
          </span>
          <input
            id="identifier"
            type="text"
            required
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            placeholder="Nhập tài khoản"
            autoComplete="username"
            className={`${inputBase} !pl-11 pr-3 border-[#D7E2E5]`}
          />
        </div>
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-[10px] font-bold text-[#8FA5AE] uppercase tracking-widest ml-0.5">
          Mật khẩu
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-4 z-10 flex items-center justify-center pointer-events-none">
            <Lock className="w-4 h-4 text-[#9DB8C0]" aria-hidden="true" />
          </span>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            required={role !== 'STUDENT'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
            className={`${inputBase} !pl-11 !pr-11 border-[#D7E2E5]`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 z-10 flex items-center justify-center text-[#9DB8C0] hover:text-[#00A99D] transition-colors focus-visible:outline-none"
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {role === 'STUDENT' && (
          <p className="text-[10px] text-[#9DB8C0] ml-0.5 italic">* Mật khẩu mặc định là mã học sinh</p>
        )}
      </div>

      {/* Remember me & Forgot */}
      <div className="flex items-center justify-between select-none">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-[#D7E2E5] text-[#00A99D] focus:ring-[#00A99D]/20 cursor-pointer"
          />
          <span className="text-[11px] font-semibold">Ghi nhớ đăng nhập</span>
        </label>
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-[11px] font-semibold text-[#00A99D] hover:text-[#009085] hover:underline cursor-pointer transition-colors"
        >
          Quên mật khẩu?
        </button>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-[48px] bg-[#00A99D] hover:bg-[#009085] active:bg-[#007068] text-white rounded-xl text-sm font-bold shadow-sm hover:shadow-md hover:shadow-teal-500/10 flex items-center justify-center gap-2 hover:-translate-y-px active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D]/40"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin pointer-events-none" />
            <span>Đang đăng nhập...</span>
          </>
        ) : (
          <>
            <span>Đăng nhập</span>
            <ArrowRight className="w-4 h-4 pointer-events-none" />
          </>
        )}
      </button>

    </form>
  )
}
