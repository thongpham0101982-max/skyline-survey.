'use client'

import React, { useState } from 'react'
import { 
  User, Lock, GraduationCap, Users, Shield, 
  Eye, EyeOff, AlertCircle, ArrowRight,
  ClipboardCheck, UserCheck, Trophy, HeartHandshake, Compass, BookOpen,
  FileText, ShieldCheck, TrendingUp, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react'

// FeatureCard Component
interface FeatureCardProps {
  index: string
  title: string
  description: string
  icon: React.ComponentType<any>
}

export function FeatureCard({ index, title, description, icon: Icon }: FeatureCardProps) {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 group select-none">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-teal-300/80">{index}</span>
        <div className="p-1.5 rounded-xl bg-white/5 text-[#0CB3AD] group-hover:scale-110 transition-transform pointer-events-none">
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <h3 className="text-xs font-bold text-white mt-3 leading-tight">{title}</h3>
      <p className="text-[10px] text-teal-100/60 leading-relaxed font-semibold mt-1.5">
        {description}
      </p>
    </div>
  )
}

// StudentProfileHighlight Component
export function StudentProfileHighlight() {
  const badges = [
    { text: 'Káº¿t quáº£ há»c táº­p', icon: BookOpen },
    { text: 'Há»— trá»£ há»c táº­p & tĂ¢m lĂ½', icon: HeartHandshake },
    { text: 'Tráº£i nghiá»‡m & dá»± Ă¡n', icon: ClipboardCheck },
    { text: 'Kháº£o sĂ¡t Ä‘áº§u vĂ o', icon: UserCheck },
    { text: 'ThĂ nh tĂ­ch ká»³ thi', icon: Trophy },
    { text: 'HÆ°á»›ng nghiá»‡p', icon: Compass },
    { text: 'Chuáº©n Ä‘áº§u ra', icon: ShieldCheck },
    { text: 'Tiáº¿n bá»™ há»c táº­p', icon: TrendingUp },
    { text: 'Cáº£nh bĂ¡o sá»›m', icon: AlertTriangle }
  ]

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 mt-6 relative overflow-hidden select-none">
      <div className="flex flex-col lg:flex-row lg:items-center gap-5">
        
        {/* Folder Illustration */}
        <div className="flex-shrink-0 w-[120px] h-[96px] bg-teal-500/10 border border-teal-300/20 rounded-2xl flex items-center justify-center relative shadow-inner group">
          <div className="w-16 h-12 bg-[#0CB3AD]/20 border border-[#0CB3AD]/40 rounded-xl relative flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:bg-[#0CB3AD]/30 pointer-events-none">
            <FileText className="w-6 h-6 text-[#0CB3AD]" />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#004F4B] flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
            </div>
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-bold text-white tracking-wide uppercase font-heading">
            Há»“ sÆ¡ há»c táº­p Ä‘iá»‡n tá»­ há»c sinh
          </h3>
          <p className="text-[11px] font-semibold text-teal-100/40 leading-relaxed mt-1">
            Tá»•ng há»£p toĂ n bá»™ quĂ¡ trĂ¬nh há»c táº­p, rĂ¨n luyá»‡n vĂ  phĂ¡t triá»ƒn cá»§a há»c sinh qua tá»«ng nÄƒm há»c.
          </p>
          
          {/* Badges container */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
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
      title: 'Kháº£o sĂ¡t nÄƒng lá»±c Ä‘áº§u vĂ o',
      description: 'Tá»• chá»©c kháº£o sĂ¡t, nháº­p káº¿t quáº£, phĂ¢n tĂ­ch nÄƒng lá»±c, há»— trá»£ tuyá»ƒn sinh vĂ  xáº¿p lá»›p.',
      icon: ClipboardCheck
    },
    {
      index: '02',
      title: 'Quáº£n lĂ½ dá»± giá» giĂ¡o viĂªn',
      description: 'ÄÄƒng kĂ½ tiáº¿t dáº¡y, phĂ¢n cĂ´ng dá»± giá», Ä‘Ă¡nh giĂ¡, phĂª duyá»‡t vĂ  theo dĂµi nÄƒng lá»±c chuyĂªn mĂ´n giĂ¡o viĂªn.',
      icon: UserCheck
    },
    {
      index: '03',
      title: 'ThĂ nh tĂ­ch vĂ  ká»³ thi há»c sinh',
      description: 'Quáº£n lĂ½ ká»³ thi, cuá»™c thi, giáº£i thÆ°á»Ÿng, huy chÆ°Æ¡ng, xáº¿p háº¡ng vĂ  lá»‹ch sá»­ thĂ nh tĂ­ch há»c sinh.',
      icon: Trophy
    },
    {
      index: '04',
      title: 'Há»— trá»£ há»c táº­p vĂ  tĂ¢m lĂ½',
      description: 'Theo dĂµi há»c sinh cáº§n há»— trá»£, káº¿ hoáº¡ch phá»¥ Ä‘áº¡o, cam káº¿t há»c táº­p, tÆ° váº¥n tĂ¢m lĂ½ vĂ  káº¿t quáº£ chuyá»ƒn hĂ³a.',
      icon: HeartHandshake
    },
    {
      index: '05',
      title: 'HÆ°á»›ng nghiá»‡p & tĂ i chĂ­nh',
      description: 'Quáº£n lĂ½ hoáº¡t Ä‘á»™ng hÆ°á»›ng nghiá»‡p, káº¿t quáº£ Ä‘á»‹nh hÆ°á»›ng nghá» nghiá»‡p vĂ  thĂ´ng tin tĂ i chĂ­nh theo phĂ¢n quyá»n.',
      icon: Compass
    },
    {
      index: '06',
      title: 'Káº¿t quáº£ há»c táº­p, dá»± Ă¡n',
      description: 'Tá»•ng há»£p káº¿t quáº£ mĂ´n há»c, hoáº¡t Ä‘á»™ng tráº£i nghiá»‡m, cĂ¢u láº¡c bá»™, dá»± Ă¡n vĂ  má»©c Ä‘á»™ tham gia cá»§a há»c sinh.',
      icon: BookOpen
    }
  ]

  return (
    <div className="relative z-10 w-full">
      {/* Mobile Toggle Bar */}
      <div className="md:hidden flex items-center justify-between border-t border-b border-white/5 py-3 mb-4 select-none">
        <span className="text-xs font-bold text-teal-100/80">KhĂ¡m phĂ¡ cĂ¡c phĂ¢n há»‡ SQMS</span>
        <button 
          type="button" 
          onClick={() => setExpanded(!expanded)} 
          className="flex items-center gap-1.5 text-xs font-bold text-[#0CB3AD] bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
        >
          <span>{expanded ? 'Thu gá»n' : 'Xem chi tiáº¿t'}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Content Area */}
      <div className={`transition-all duration-300 overflow-hidden md:block ${expanded ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0 md:max-h-none md:opacity-100'}`}>
        {/* Title and Subtitle */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl lg:text-2xl font-black text-white leading-tight tracking-wide font-heading">
            Há»† THá»NG QUáº¢N TRá»<br />CHáº¤T LÆ¯á»¢NG GIĂO Dá»¤C SKY-LINE
          </h1>
          <p className="text-xs font-semibold text-teal-100/60 leading-relaxed max-w-xl mt-3">
            Ná»n táº£ng quáº£n trá»‹ táº­p trung dá»¯ liá»‡u ngÆ°á»i há»c, ngÆ°á»i dáº¡y vĂ  cĂ¡c hoáº¡t Ä‘á»™ng giĂ¡o dá»¥c trong toĂ n Há»‡ thá»‘ng Sky-Line.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {modules.map((m) => (
            <FeatureCard 
              key={m.index} 
              index={m.index} 
              title={m.title} 
              description={m.description} 
              icon={m.icon} 
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
    { id: 'STAFF', label: 'CĂ¡n bá»™, GiĂ¡o viĂªn', icon: User },
    { id: 'PARENT', label: 'Phá»¥ huynh', icon: Users },
    { id: 'STUDENT', label: 'Há»c sinh', icon: GraduationCap }
  ]

  return (
    <div className="mb-6 select-none">
      <label className="block text-xs font-bold text-[#667A83] uppercase tracking-wider mb-2.5">
        Chá»n vai trĂ²
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
      {/* Icon wrapper is absolutely positioned with pointer-events-none */}
      <div className="absolute left-[18px] top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 group-focus-within:text-[#0CB3AD] transition-colors pointer-events-none" aria-hidden="true">
        <Lock className="w-4.5 h-4.5" />
      </div>
      <input
        id={id}
        type={showPassword ? 'text' : 'password'}
        required={required}
        value={value}
        onChange={onChange}
        placeholder="Nháº­p máº­t kháº©u"
        autoComplete="current-password"
        className="w-full h-[54px] pl-[50px] pr-[50px] rounded-[14px] border border-[#D7E2E5] bg-white text-sm font-medium text-[#17383D] placeholder-slate-400 hover:border-slate-300 focus:bg-white focus:border-[#0CB3AD] focus:ring-4 focus:ring-[#0CB3AD]/10 outline-none transition-all duration-200"
      />
      {/* Toggle password visibility button */}
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-[10px] top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0CB3AD]/40 rounded-lg"
        aria-label={showPassword ? 'áº¨n máº­t kháº©u' : 'Hiá»‡n máº­t kháº©u'}
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
      title="ÄÄƒng nháº­p báº±ng Microsoft 365 (ChÆ°a Ä‘Æ°á»£c cáº¥u hĂ¬nh)"
    >
      <svg className="w-4.5 h-4.5 shrink-0 pointer-events-none" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M0 0H10.8V10.8H0V0Z" fill="#F25022"/>
        <path d="M12.2 0H23V10.8H12.2V0Z" fill="#7FBA00"/>
        <path d="M0 12.2H10.8V23H0V12.2Z" fill="#00A4EF"/>
        <path d="M12.2 12.2H23V23H12.2V12.2Z" fill="#FFB900"/>
      </svg>
      <span>ÄÄƒng nháº­p báº±ng Microsoft 365</span>
    </button>
  )
}

// SecurityBanner Component
export function SecurityBanner() {
  return (
    <div className="w-full p-4 flex items-center gap-3 bg-[#E6F6F5]/60 border border-[#CCEBEA] rounded-2xl text-[#008b82] mt-5 select-none">
      <div className="p-2 rounded-xl bg-white text-[#0CB3AD] shrink-0 shadow-sm border border-teal-50/50 pointer-events-none">
        <Shield className="w-5 h-5" />
      </div>
      <p className="text-[11px] font-semibold leading-relaxed text-slate-600">
        Há»‡ thá»‘ng báº£o máº­t theo tiĂªu chuáº©n quá»‘c táº¿, Ä‘áº£m báº£o an toĂ n dá»¯ liá»‡u vĂ  quyá»n riĂªng tÆ°.
      </p>
    </div>
  )
}

// PageFooter Component
export function PageFooter() {
  return (
    <footer className="w-full py-4 text-center text-[11px] font-semibold text-slate-400 select-none">
      <span className="tracking-wide">SQMS PORTAL V2.5</span>
      <span className="mx-2 text-slate-300">|</span>
      <span>Â© 2026 Sky-Line Education</span>
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
          TĂ i khoáº£n
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
            placeholder="Nháº­p tĂ i khoáº£n"
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
          Máº­t kháº©u
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
            * Máº­t kháº©u máº·c Ä‘á»‹nh lĂ  mĂ£ há»c sinh
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
          <span>Ghi nhá»› Ä‘Äƒng nháº­p</span>
        </label>
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-[#0CB3AD] hover:text-[#099c97] hover:underline cursor-pointer transition-colors"
        >
          QuĂªn máº­t kháº©u?
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
            <span>Äang Ä‘Äƒng nháº­p...</span>
          </>
        ) : (
          <>
            <span>ÄÄƒng nháº­p</span>
            <ArrowRight className="w-4.5 h-4.5 pointer-events-none" />
          </>
        )}
      </button>
    </form>
  )
}