// @ts-nocheck
'use client'

import React, { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  User, Lock, GraduationCap, Users, Shield, 
  Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ArrowRight,
  ClipboardCheck, UserCheck, Trophy, HeartHandshake, Compass, BookOpen,
  FileText, ShieldCheck, TrendingUp, AlertTriangle
} from 'lucide-react'
import { RoleSelector, PasswordInput, LoginAlert, SecurityBanner, PageFooter } from './components'

export function LoginClient() {
  const router = useRouter()
  const [role, setRole] = useState('STAFF')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
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
        setLoadingSteps([{ text: 'Äang xĂ¡c thá»±c...', done: false }])
        await new Promise(r => setTimeout(r, 600))
        addStep('Báº¯t Ä‘áº§u xá»­ lĂ½ Ä‘Äƒng nháº­p Student...')
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
          setError(data.error || 'ThĂ´ng tin khĂ´ng há»£p lá»‡')
          setLoading(false)
          setLoadingSteps([])
          return
        }

        setLoadingSteps((prev: any[]) => prev.map(s => ({ ...s, done: true })))
        addStep('ÄÄƒng nháº­p thĂ nh cĂ´ng! Äang chuyá»ƒn trang...')
        await new Promise(r => setTimeout(r, 500))

        const targetUrl = '/hocsinh/hs-khaosat/danh-sach'
        document.cookie =
          'hs_token=' + data.token +
          '; path=/; max-age=' + (rememberMe ? 30 * 24 * 60 * 60 : 2 * 24 * 60 * 60) +
          '; SameSite=Lax'

        window.location.href = targetUrl
      } else {
        setLoadingSteps([{ text: 'Äang xĂ¡c thá»±c tĂ i khoáº£n...', done: false }])
        await new Promise(r => setTimeout(r, 400))

        const result = await signIn('credentials', {
          email: identifier.trim(),
          password,
          redirect: false,
        })
        if (result?.error) {
          console.error('[LOGIN] SignIn Error:', result.error)
          if (result.error === 'TAI_KHOAN_BI_KHOA' || result.error.includes('TAI_KHOAN_BI_KHOA')) {
             setError('TĂ i khoáº£n cá»§a báº¡n Ä‘Ă£ ngá»«ng hoáº¡t Ä‘á»™ng (Nghá»‰ dáº¡y).')
          } else {
             setError('Sai tĂªn Ä‘Äƒng nháº­p hoáº·c máº­t kháº©u!')
          }
          setLoading(false)
          setLoadingSteps([])
        } else {
          setLoadingSteps((prev: any[]) => prev.map(s => ({ ...s, done: true })))
          addStep('ÄÄƒng nháº­p thĂ nh cĂ´ng! Äang chuyá»ƒn trang...')
          await new Promise(r => setTimeout(r, 400))
          window.location.assign('/')
        }
      }
    } catch (err) {
      setError('Lá»—i káº¿t ná»‘i. Vui lĂ²ng thá»­ láº¡i.')
      setLoading(false)
      setLoadingSteps([])
    }
  }

  const handleForgotPassword = () => {
    setError('QuĂªn máº­t kháº©u? Vui lĂ²ng liĂªn há»‡ Ban Kháº£o thĂ­ vĂ  Äáº£m báº£o cháº¥t lÆ°á»£ng (hoáº·c Quáº£n trá»‹ viĂªn) Ä‘á»ƒ Ä‘Æ°á»£c há»— trá»£ cáº¥p láº¡i máº­t kháº©u.')
  }

  if (!mounted) return null

  const roleLabel =
    role === 'STUDENT' ? 'Há»c sinh' :
    role === 'PARENT' ? 'Phá»¥ huynh' : 'CBGV'

  return (
    <>
      {loading && loadingSteps.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
             style={{ background: 'rgba(0, 31, 30, 0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-[24px] p-8 shadow-2xl max-w-sm w-full mx-6 border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-center mb-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-slate-50" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#08AAA4] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-[#08AAA4]" />
                </div>
              </div>
            </div>
            <h3 className="text-center text-lg font-bold text-[#173B3A] mb-1">Äang Ä‘Äƒng nháº­p</h3>
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

      {/* Modern Split-screen Layout Container */}
      <div className="min-h-screen flex flex-col md:flex-row bg-[#003B3A] relative overflow-hidden font-sans">
        
        {/* LEFT COLUMN: Feature Showcases (Visible on Desktop) */}
        <div className="hidden md:flex md:w-[55%] lg:w-[60%] flex-col justify-between p-8 lg:p-12 relative overflow-hidden select-none">
          {/* Decorative subtle gradient background and grid overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#003936] via-[#004B46] to-[#003B38] pointer-events-none z-0" />
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-[#08AAA4]/10 blur-[130px] pointer-events-none z-0" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#004B46]/30 blur-[110px] pointer-events-none z-0" />

          {/* Grid wave decorative lines */}
          <div className="absolute inset-0 opacity-[0.03] z-0" 
               style={{ 
                 backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', 
                 backgroundSize: '24px 24px' 
               }} 
          />

          <div className="relative z-10">
            {/* Header Brand */}
            <div className="flex flex-col items-start gap-1">
              <img src="/logo.png" alt="Sky-Line Logo" className="h-10 w-auto object-contain brightness-0 invert opacity-95" />
              <span className="text-[10px] font-extrabold text-[#D97706] tracking-[3px] uppercase mt-2 font-heading">
                NĂ¢ng táº§m giĂ¡o dá»¥c - Kiáº¿n táº¡o tÆ°Æ¡ng lai
              </span>
            </div>

            {/* Title & Subtitle */}
            <div className="mt-8 lg:mt-12">
              <h1 className="text-xl lg:text-2xl font-black text-white leading-tight tracking-wide font-heading">
                Há»† THá»NG QUáº¢N TRá»<br />CHáº¤T LÆ¯á»¢NG GIĂO Dá»¤C SKY-LINE
              </h1>
              <p className="text-xs font-semibold text-teal-100/60 leading-relaxed max-w-xl mt-3">
                Ná»n táº£ng quáº£n trá»‹ táº­p trung dá»¯ liá»‡u ngÆ°á»i há»c, ngÆ°á»i dáº¡y vĂ  cĂ¡c hoáº¡t Ä‘á»™ng giĂ¡o dá»¥c trong toĂ n Há»‡ thá»‘ng Sky-Line.
              </p>
            </div>

            {/* Feature Grid: 6 cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 mt-8 lg:mt-10">
              {/* Card 1 */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-teal-300/80">01</span>
                  <div className="p-1.5 rounded-xl bg-white/5 text-[#08AAA4] group-hover:scale-110 transition-transform">
                    <ClipboardCheck className="w-4.5 h-4.5" />
                  </div>
                </div>
                <h3 className="text-xs font-bold text-white mt-3">Kháº£o sĂ¡t nÄƒng lá»±c Ä‘áº§u vĂ o</h3>
                <p className="text-[10px] text-teal-100/60 leading-relaxed font-semibold mt-1.5">
                  Tá»• chá»©c kháº£o sĂ¡t, nháº­p káº¿t quáº£, phĂ¢n tĂ­ch nÄƒng lá»±c, há»— trá»£ tuyá»ƒn sinh vĂ  xáº¿p lá»›p.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-teal-300/80">02</span>
                  <div className="p-1.5 rounded-xl bg-white/5 text-[#08AAA4] group-hover:scale-110 transition-transform">
                    <UserCheck className="w-4.5 h-4.5" />
                  </div>
                </div>
                <h3 className="text-xs font-bold text-white mt-3">Quáº£n lĂ½ dá»± giá» giĂ¡o viĂªn</h3>
                <p className="text-[10px] text-teal-100/60 leading-relaxed font-semibold mt-1.5">
                  ÄÄƒng kĂ½ tiáº¿t dáº¡y, phĂ¢n cĂ´ng dá»± giá», Ä‘Ă¡nh giĂ¡, phĂª duyá»‡t vĂ  theo dĂµi nÄƒng lá»±c chuyĂªn mĂ´n giĂ¡o viĂªn.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-teal-300/80">03</span>
                  <div className="p-1.5 rounded-xl bg-white/5 text-[#08AAA4] group-hover:scale-110 transition-transform">
                    <Trophy className="w-4.5 h-4.5" />
                  </div>
                </div>
                <h3 className="text-xs font-bold text-white mt-3">ThĂ nh tĂ­ch vĂ  ká»³ thi</h3>
                <p className="text-[10px] text-teal-100/60 leading-relaxed font-semibold mt-1.5">
                  Quáº£n lĂ½ ká»³ thi, cuá»™c thi, giáº£i thÆ°á»Ÿng, huy chÆ°Æ¡ng, xáº¿p háº¡ng vĂ  lá»‹ch sá»­ thĂ nh tĂ­ch há»c sinh.
                </p>
              </div>

              {/* Card 4 */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-teal-300/80">04</span>
                  <div className="p-1.5 rounded-xl bg-white/5 text-[#08AAA4] group-hover:scale-110 transition-transform">
                    <HeartHandshake className="w-4.5 h-4.5" />
                  </div>
                </div>
                <h3 className="text-xs font-bold text-white mt-3">Há»— trá»£ há»c táº­p vĂ  tĂ¢m lĂ½</h3>
                <p className="text-[10px] text-teal-100/60 leading-relaxed font-semibold mt-1.5">
                  Theo dĂµi há»c sinh cáº§n há»— trá»£, káº¿ hoáº¡ch phá»¥ Ä‘áº¡o, cam káº¿t há»c táº­p, tÆ° váº¥n tĂ¢m lĂ½ vĂ  káº¿t quáº£ chuyá»ƒn hĂ³a.
                </p>
              </div>

              {/* Card 5 */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-teal-300/80">05</span>
                  <div className="p-1.5 rounded-xl bg-white/5 text-[#08AAA4] group-hover:scale-110 transition-transform">
                    <Compass className="w-4.5 h-4.5" />
                  </div>
                </div>
                <h3 className="text-xs font-bold text-white mt-3">HÆ°á»›ng nghiá»‡p & tĂ i chĂ­nh</h3>
                <p className="text-[10px] text-teal-100/60 leading-relaxed font-semibold mt-1.5">
                  Quáº£n lĂ½ hoáº¡t Ä‘á»™ng hÆ°á»›ng nghiá»‡p, káº¿t quáº£ Ä‘á»‹nh hÆ°á»›ng nghá» nghiá»‡p vĂ  thĂ´ng tin tĂ i chĂ­nh theo phĂ¢n quyá»n.
                </p>
              </div>

              {/* Card 6 */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-teal-300/80">06</span>
                  <div className="p-1.5 rounded-xl bg-white/5 text-[#08AAA4] group-hover:scale-110 transition-transform">
                    <BookOpen className="w-4.5 h-4.5" />
                  </div>
                </div>
                <h3 className="text-xs font-bold text-white mt-3">Káº¿t quáº£ há»c táº­p, dá»± Ă¡n</h3>
                <p className="text-[10px] text-teal-100/60 leading-relaxed font-semibold mt-1.5">
                  Tá»•ng há»£p káº¿t quáº£ mĂ´n há»c, hoáº¡t Ä‘á»™ng tráº£i nghiá»‡m, cĂ¢u láº¡c bá»™, dá»± Ă¡n vĂ  má»©c Ä‘á»™ tham gia.
                </p>
              </div>
            </div>

            {/* Special Section: Electronic Student Record */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 mt-6 relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                
                {/* Folder Illustration */}
                <div className="flex-shrink-0 w-[120px] h-[96px] bg-teal-500/10 border border-teal-300/20 rounded-2xl flex items-center justify-center relative shadow-inner group">
                  <div className="w-16 h-12 bg-[#08AAA4]/20 border border-[#08AAA4]/40 rounded-xl relative flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:bg-[#08AAA4]/30">
                    <FileText className="w-6 h-6 text-[#08AAA4]" />
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#003B3A] flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase font-heading">
                    Há»“ sÆ¡ há»c táº­p Ä‘iá»‡n tá»­ há»c sinh
                  </h3>
                  <p className="text-[11px] font-semibold text-teal-100/40 leading-relaxed mt-1">
                    Tá»•ng há»£p toĂ n bá»™ quĂ¡ trĂ¬nh há»c táº­p, rĂ¨n luyá»‡n vĂ  phĂ¡t triá»ƒn cá»§a há»c sinh qua tá»«ng nÄƒm há»c.
                  </p>
                  
                  {/* Badges container */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
                    {[
                      { text: 'Káº¿t quáº£ há»c táº­p', icon: BookOpen },
                      { text: 'Há»— trá»£ há»c táº­p & tĂ¢m lĂ½', icon: HeartHandshake },
                      { text: 'Tráº£i nghiá»‡m & dá»± Ă¡n', icon: ClipboardCheck },
                      { text: 'Kháº£o sĂ¡t Ä‘áº§u vĂ o', icon: UserCheck },
                      { text: 'ThĂ nh tĂ­ch ká»³ thi', icon: Trophy },
                      { text: 'HÆ°á»›ng nghiá»‡p', icon: Compass },
                      { text: 'Chuáº©n Ä‘áº§u ra', icon: ShieldCheck },
                      { text: 'Tiáº¿n bá»™ há»c táº­p', icon: TrendingUp },
                      { text: 'Cáº£nh bĂ¡o sá»›m', icon: AlertTriangle }
                    ].map((badge, idx) => {
                      const BIcon = badge.icon;
                      return (
                        <div key={idx} className="flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-lg px-2 py-1 text-[9px] font-bold text-teal-100/80">
                          <BIcon className="w-3 h-3 text-[#08AAA4] shrink-0" />
                          <span className="truncate">{badge.text}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Bottom Pillar Footers */}
          <div className="relative z-10 border-t border-white/5 pt-5 flex items-center justify-between text-[9px] font-extrabold tracking-wider text-teal-100/40">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#08AAA4]" />
              <span>Dá»® LIá»†U CHĂNH XĂC</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#08AAA4]" />
              <span>QUáº¢N TRá» MINH Báº CH</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#08AAA4]" />
              <span>THEO DĂ•I LIĂN Tá»¤C</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#08AAA4]" />
              <span>Äá»’NG HĂ€NH PHĂT TRIá»‚N</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Login Form Card (Full width on Mobile, 40-45% on Desktop) */}
        <div className="w-full md:w-[45%] lg:w-[40%] min-h-screen bg-white md:rounded-l-[32px] flex flex-col justify-between p-6 sm:p-10 md:p-12 shadow-[-10px_0_30px_rgba(0,0,0,0.15)] relative z-10 animate-in slide-in-from-right-8 duration-500">
          
          <div className="my-auto py-4">
            {/* Logo and Titles */}
            <div className="text-center md:text-left mb-8 flex flex-col items-center md:items-start">
              <img 
                src="/logo.png" 
                alt="Sky-Line School Logo" 
                className="h-12 w-auto object-contain mb-4" 
              />
              <h2 className="text-xl font-bold text-[#173B3A] tracking-tight">
                ÄÄƒng nháº­p há»‡ thá»‘ng
              </h2>
              <p className="text-xs font-semibold text-slate-400 mt-1">
                Truy cáº­p há»‡ thá»‘ng theo tĂ i khoáº£n Ä‘Æ°á»£c cáº¥p
              </p>
            </div>

            {/* Role Tab Selector */}
            <RoleSelector role={role} setRole={setRole} setError={setError} />

            {error && <LoginAlert message={error} />}

            {/* Login Inputs Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Account Input */}
              <div>
                <label 
                  htmlFor="identifier"
                  className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1"
                >
                  TĂ i khoáº£n
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 group-focus-within:text-[#08AAA4] transition-colors" aria-hidden="true">
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
                    className="w-full h-[52px] pl-12 pr-4 rounded-[14px] border border-slate-200 bg-white text-sm font-medium text-[#173B3A] placeholder-slate-400 hover:border-slate-300 focus:bg-white focus:border-[#08AAA4] focus:ring-4 focus:ring-[#08AAA4]/10 outline-none transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label 
                  htmlFor="password"
                  className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1"
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
                  <p className="text-[11px] text-slate-400 font-semibold mt-2 ml-1 italic leading-normal">
                    * Máº­t kháº©u máº·c Ä‘á»‹nh lĂ  mĂ£ há»c sinh
                  </p>
                )}
              </div>

              {/* Remember Me and Forgot Password bar */}
              <div className="flex items-center justify-between text-xs font-bold pt-1.5">
                <label className="flex items-center gap-2 text-slate-500 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#08AAA4] focus:ring-[#08AAA4]/20 focus:ring-opacity-50 transition-all cursor-pointer"
                  />
                  <span>Ghi nhá»› Ä‘Äƒng nháº­p</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[#08AAA4] hover:text-[#06918C] hover:underline cursor-pointer transition-colors"
                >
                  QuĂªn máº­t kháº©u?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[52px] bg-[#08AAA4] hover:bg-[#078F8A] text-white rounded-[14px] text-sm font-bold shadow-md shadow-[#08AAA4]/10 hover:shadow-lg hover:shadow-[#078F8A]/20 flex items-center justify-center gap-2 hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AAA4]/40 mt-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    <span>Äang Ä‘Äƒng nháº­p...</span>
                  </>
                ) : (
                  <>
                    <span>ÄÄƒng nháº­p</span>
                    <ArrowRight className="w-4.5 h-4.5" />
                  </>
                )}
              </button>
            </form>

            {/* SSO Separator and Microsoft Button */}
            <div className="mt-5 pt-5 border-t border-slate-100 flex flex-col items-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 relative -top-7 select-none">
                hoáº·c
              </span>
              <button
                type="button"
                disabled
                className="w-full h-[52px] border border-slate-200 text-slate-500 rounded-[14px] text-xs font-bold flex items-center justify-center gap-2 bg-[#F8FAFC]/50 hover:bg-[#F8FAFC] transition-colors opacity-70 cursor-not-allowed select-none"
                title="ÄÄƒng nháº­p báº±ng Microsoft 365 (ChÆ°a Ä‘Æ°á»£c cáº¥u hĂ¬nh)"
              >
                <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M0 0H10.8V10.8H0V0Z" fill="#F25022"/>
                  <path d="M12.2 0H23V10.8H12.2V0Z" fill="#7FBA00"/>
                  <path d="M0 12.2H10.8V23H0V12.2Z" fill="#00A4EF"/>
                  <path d="M12.2 12.2H23V23H12.2V12.2Z" fill="#FFB900"/>
                </svg>
                <span>ÄÄƒng nháº­p báº±ng Microsoft 365</span>
              </button>
            </div>

            {/* Security Standards banner */}
            <SecurityBanner />

          </div>

          {/* Footer of the login column */}
          <PageFooter />

        </div>

      </div>
    </>
  )
}