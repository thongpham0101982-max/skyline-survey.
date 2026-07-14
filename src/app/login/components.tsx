'use client'

import React, { useState } from 'react'
import { 
  User, Lock, GraduationCap, Users,
  Eye, EyeOff, AlertCircle, ArrowRight,
  FileText, ShieldCheck, TrendingUp, AlertTriangle, ChevronDown, ChevronUp,
  BookOpen, Heart, Trophy, Compass, BarChart3, Microscope,
  ClipboardList, Clock, Medal, BrainCircuit, Target, Lightbulb,
  CheckCircle, Star
} from 'lucide-react'

// FeatureCard Component
interface FeatureCardProps {
  index: string
  title: string
  description: string
  icon: React.ComponentType<any>
  gradientFrom: string
  gradientTo: string
  iconColor: string
}

export function FeatureCard({ index, title, description, icon: Icon, gradientFrom, gradientTo, iconColor }: FeatureCardProps) {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 group select-none">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black text-teal-300/60 tracking-widest">{index}</span>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shrink-0 pointer-events-none group-hover:scale-110 transition-transform"
          style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
        >
          <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
        </div>
      </div>
      <h3 className="text-xs font-bold text-white leading-tight">{title}</h3>
      <p className="text-[10px] text-teal-100/50 leading-relaxed mt-1.5">
        {description}
      </p>
    </div>
  )
}

// StudentProfileHighlight Component
export function StudentProfileHighlight() {
  const badges = [
    { text: 'Kết quả học tập', icon: BookOpen },
    { text: 'Hỗ trợ học tập & tâm lý', icon: Heart },
    { text: 'Trải nghiệm & dự án', icon: ClipboardList },
    { text: 'Khảo sát đầu vào', icon: BarChart3 },
    { text: 'Thành tích kỳ thi', icon: Trophy },
    { text: 'Hướng nghiệp', icon: Compass },
    { text: 'Chuẩn đầu ra', icon: ShieldCheck },
    { text: 'Tiến bộ học tập', icon: TrendingUp },
    { text: 'Cảnh báo sớm', icon: AlertTriangle }
  ]

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 mt-5 relative overflow-hidden select-none">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        
        {/* Folder Illustration */}
        <div className="flex-shrink-0 w-[100px] h-[84px] bg-teal-500/10 border border-teal-300/20 rounded-2xl flex items-center justify-center relative shadow-inner group">
          <div className="w-14 h-10 bg-[#0CB3AD]/20 border border-[#0CB3AD]/40 rounded-xl relative flex items-center justify-center transition-all duration-300 group-hover:scale-105 pointer-events-none">
            <FileText className="w-5 h-5 text-[#0CB3AD]" />
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#004F4B] flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
            </div>
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-xs font-extrabold text-white tracking-wide uppercase">
            Hồ sơ học tập điện tử học sinh
          </h3>
          <p className="text-[10px] text-teal-100/40 leading-relaxed mt-1">
            Tổng hợp toàn bộ quá trình học tập, rèn luyện và phát triển của học sinh qua từng năm học.
          </p>
          
          {/* Badges container */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5 mt-3">
            {badges.map((badge, idx) => {
              const BIcon = badge.icon;
              return (
                <div key={idx} className="flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-lg px-2 py-1 text-[9px] font-bold text-teal-100/80">
                  <BIcon className="w-3 h-3 text-[#0CB3AD] shrink-0 pointer-events-none" />
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

// FeatureOverview Component (Collapsible on mobile)
export function FeatureOverview() {
  const [expanded, setExpanded] = useState(false)
  
  const modules = [
    {
      index: '01',
      title: 'Khảo sát năng lực đầu vào',
      description: 'Tổ chức khảo sát, nhập kết quả, phân tích năng lực, hỗ trợ tuyển sinh và xếp lớp.',
      icon: Microscope,
      gradientFrom: '#059669',
      gradientTo: '#10B981',
      iconColor: 'text-white'
    },
    {
      index: '02',
      title: 'Quản lý dự giờ giáo viên',
      description: 'Đăng ký tiết dạy, phân công dự giờ, đánh giá, phê duyệt và theo dõi năng lực chuyên môn.',
      icon: Clock,
      gradientFrom: '#0369A1',
      gradientTo: '#0EA5E9',
      iconColor: 'text-white'
    },
    {
      index: '03',
      title: 'Thành tích và kỳ thi học sinh',
      description: 'Quản lý kỳ thi, cuộc thi, giải thưởng, huy chương, xếp hạng và lịch sử thành tích.',
      icon: Medal,
      gradientFrom: '#B45309',
      gradientTo: '#F59E0B',
      iconColor: 'text-white'
    },
    {
      index: '04',
      title: 'Hỗ trợ học tập và tâm lý',
      description: 'Theo dõi học sinh cần hỗ trợ, kế hoạch phụ đạo, cam kết học tập và tư vấn tâm lý.',
      icon: BrainCircuit,
      gradientFrom: '#BE185D',
      gradientTo: '#EC4899',
      iconColor: 'text-white'
    },
    {
      index: '05',
      title: 'Hướng nghiệp & tài chính',
      description: 'Quản lý hoạt động hướng nghiệp, định hướng nghề nghiệp và thông tin tài chính theo phân quyền.',
      icon: Target,
      gradientFrom: '#6D28D9',
      gradientTo: '#8B5CF6',
      iconColor: 'text-white'
    },
    {
      index: '06',
      title: 'Kết quả học tập & dự án',
      description: 'Tổng hợp kết quả môn học, hoạt động trải nghiệm, câu lạc bộ và mức độ tham gia.',
      icon: Lightbulb,
      gradientFrom: '#0F766E',
      gradientTo: '#14B8A6',
      iconColor: 'text-white'
    }
  ]

  return (
    <div className="relative z-10 w-full">
      {/* Mobile Toggle Bar */}
      <div className="md:hidden flex items-center justify-between border-t border-b border-white/5 py-3 mb-4 select-none">
        <span className="text-xs font-bold text-teal-100/80">Khám phá các phân hệ SQMS</span>
        <button 
          type="button" 
          onClick={() => setExpanded(!expanded)} 
          className="flex items-center gap-1.5 text-xs font-bold text-[#0CB3AD] bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
        >
          <span>{expanded ? 'Thu gọn' : 'Xem chi tiết'}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Content Area */}
      <div className={`transition-all duration-300 overflow-hidden md:block ${expanded ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0 md:max-h-none md:opacity-100'}`}>
        {/* Title and Subtitle */}
        <div className="mb-6 md:mb-7">
          <h1 className="text-xl lg:text-2xl font-black text-white leading-tight tracking-wide">
            HỆ THỐNG QUẢN TRỊ<br />CHẤT LƯỢNG GIÁO DỤC SKY-LINE
          </h1>
          <p className="text-xs text-teal-100/60 leading-relaxed max-w-xl mt-2.5">
            Nền tảng quản trị tập trung dữ liệu người học, người dạy và các hoạt động giáo dục trong toàn Hệ thống Sky-Line.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.map((m) => (
            <FeatureCard 
              key={m.index} 
              index={m.index} 
              title={m.title} 
              description={m.description} 
              icon={m.icon}
              gradientFrom={m.gradientFrom}
              gradientTo={m.gradientTo}
              iconColor={m.iconColor}
            />
          ))}
        </div>

        {/* Centerpiece Student Record Card */}
        <StudentProfileHighlight />
      </div>
    </div>
  )
}

// RoleSelector Component
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
    <div className="mb-6 select-none">
      <label className="block text-xs font-bold text-[#667A83] uppercase tracking-wider mb-2.5">
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
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border text-center transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0CB3AD]/40 ${
                isActive
                  ? 'bg-white border-[#0CB3AD] text-[#0CB3AD] shadow-[0_4px_12px_rgba(12,179,173,0.08)]'
                  : 'bg-[#F5F8F8] border-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
              style={{ minHeight: '84px' }}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-[#E6F6F5] text-[#0CB3AD]' : 'text-slate-400'}`}>
                <Icon className="w-5 h-5 pointer-events-none" aria-hidden="true" />
              </div>
              <span className="text-[11px] font-bold tracking-tight leading-tight pointer-events-none">{r.label}</span>
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
    <div className="relative group w-full">
      <div className="absolute left-[18px] top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 group-focus-within:text-[#0CB3AD] transition-colors pointer-events-none" aria-hidden="true">
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
        className="w-full h-[54px] pl-[50px] pr-[50px] rounded-[14px] border border-[#D7E2E5] bg-white text-sm font-medium text-[#17383D] placeholder-slate-400 hover:border-slate-300 focus:bg-white focus:border-[#0CB3AD] focus:ring-4 focus:ring-[#0CB3AD]/10 outline-none transition-all duration-200"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-[10px] top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0CB3AD]/40 rounded-lg"
        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        style={{ minHeight: '40px', minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
      className="p-3.5 flex items-start gap-3 bg-[#D64545]/5 border border-[#D64545]/20 rounded-xl text-[#D64545] animate-in fade-in slide-in-from-top-1 duration-200"
      aria-live="assertive"
    >
      <AlertCircle className="w-5 h-5 shrink-0 text-[#D64545] mt-0.5 pointer-events-none" aria-hidden="true" />
      <p className="text-xs font-semibold leading-relaxed">{message}</p>
    </div>
  )
}

// MicrosoftLoginButton Component
export function MicrosoftLoginButton() {
  return (
    <button
      type="button"
      disabled
      className="w-full h-[52px] border border-[#D7E2E5] text-slate-500 rounded-[14px] text-xs font-bold flex items-center justify-center gap-2 bg-[#F5F8F8]/50 hover:bg-[#F5F8F8] transition-colors opacity-70 cursor-not-allowed select-none"
      title="Đăng nhập bằng Microsoft 365 (Chưa được cấu hình)"
    >
      <svg className="w-4.5 h-4.5 shrink-0 pointer-events-none" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M0 0H10.8V10.8H0V0Z" fill="#F25022"/>
        <path d="M12.2 0H23V10.8H12.2V0Z" fill="#7FBA00"/>
        <path d="M0 12.2H10.8V23H0V12.2Z" fill="#00A4EF"/>
        <path d="M12.2 12.2H23V23H12.2V12.2Z" fill="#FFB900"/>
      </svg>
      <span>Đăng nhập bằng Microsoft 365</span>
    </button>
  )
}

// PageFooter Component
export function PageFooter() {
  return (
    <footer className="w-full py-4 text-center text-[11px] font-semibold text-slate-400 select-none">
      <span className="tracking-wide">SQMS PORTAL V2.5</span>
      <span className="mx-2 text-slate-300">|</span>
      <span>© 2026 Sky-Line Education</span>
    </footer>
  )
}

// LoginForm Component (Stable Card Height with error)
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
  role,
  setRole,
  identifier,
  setIdentifier,
  password,
  setPassword,
  rememberMe,
  setRememberMe,
  error,
  setError,
  loading,
  onSubmit,
  onForgotPassword
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Role Selection */}
      <RoleSelector role={role} setRole={setRole} setError={setError} />

      {/* Error alert with stable layout space */}
      <div className="h-[52px] mb-4">
        {error ? (
          <LoginAlert message={error} />
        ) : (
          <div className="h-[52px]" />
        )}
      </div>

      {/* Account input */}
      <div>
        <label 
          htmlFor="identifier"
          className="block text-xs font-bold text-[#667A83] uppercase tracking-wider mb-2 ml-1"
        >
          Tài khoản
        </label>
        <div className="relative group">
          <div className="absolute left-[18px] top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 group-focus-within:text-[#0CB3AD] transition-colors pointer-events-none" aria-hidden="true">
            <User className="w-4.5 h-4.5" />
          </div>
          <input
            id="identifier"
            type="text"
            required
            value={identifier}
            onChange={e => setIdentifier(e.target.value)} 
            placeholder="Nhập tài khoản"
            autoComplete="username"
            className="w-full h-[54px] pl-[50px] pr-4 rounded-[14px] border border-[#D7E2E5] bg-white text-sm font-medium text-[#17383D] placeholder-slate-400 hover:border-slate-300 focus:bg-white focus:border-[#0CB3AD] focus:ring-4 focus:ring-[#0CB3AD]/10 outline-none transition-all duration-200"
          />
        </div>
      </div>

      {/* Password input */}
      <div>
        <label 
          htmlFor="password"
          className="block text-xs font-bold text-[#667A83] uppercase tracking-wider mb-2 ml-1"
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
          <p className="text-[11px] text-slate-400 font-semibold mt-2 ml-1 italic leading-normal select-none">
            * Mật khẩu mặc định là mã học sinh
          </p>
        )}
      </div>

      {/* Remember me & Forgot Password */}
      <div className="flex items-center justify-between text-xs font-bold pt-1.5 select-none">
        <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
          <input 
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-[#D7E2E5] text-[#0CB3AD] focus:ring-[#0CB3AD]/20 focus:ring-opacity-50 transition-all cursor-pointer animate-none"
          />
          <span>Ghi nhớ đăng nhập</span>
        </label>
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-[#0CB3AD] hover:text-[#099c97] hover:underline cursor-pointer transition-colors"
        >
          Quên mật khẩu?
        </button>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-[54px] bg-[#0CB3AD] hover:bg-[#099c97] active:bg-[#088b86] text-white rounded-[14px] text-sm font-bold shadow-md shadow-[#0CB3AD]/10 hover:shadow-lg hover:shadow-[#099c97]/20 flex items-center justify-center gap-2 hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0CB3AD]/40 mt-6"
      >
        {loading ? (
          <>
            <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin pointer-events-none" />
            <span>Đang đăng nhập...</span>
          </>
        ) : (
          <>
            <span>Đăng nhập</span>
            <ArrowRight className="w-4.5 h-4.5 pointer-events-none" />
          </>
        )}
      </button>
    </form>
  )
}
