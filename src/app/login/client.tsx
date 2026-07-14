// @ts-nocheck
'use client'

import React, { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  GraduationCap, CheckCircle2, Loader2, ArrowRight
} from 'lucide-react'
import { 
  LoginForm, FeatureOverview, MicrosoftLoginButton, 
  SecurityBanner, PageFooter 
} from './components'

export function LoginClient() {
  const router = useRouter()
  const [role, setRole] = useState('STAFF')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSteps, setLoadingSteps] = useState([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => { 
    setMounted(true) 
  }, [])

  const addStep = (text: string) => {
    setLoadingSteps((prev: any[]) => {
      const updated = prev.map((s: any, i: number) =>
        i === prev.length - 1 ? { ...s, done: true } : s
      );
      return [...updated, { text, done: false }];
    });
  };

  const validateForm = () => {
    if (!identifier.trim()) {
      setError('Vui lĂ²ng nháº­p tĂ i khoáº£n.')
      return false
    }
    if (role !== 'STUDENT' && !password) {
      setError('Vui lĂ²ng nháº­p máº­t kháº©u.')
      return false
    }
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
        setLoadingSteps([{ text: 'Äang xĂ¡c thá»±c...', done: false }])
        await new Promise(r => setTimeout(r, 600))
        addStep('Báº¯t Ä‘áº§u xá»­ lĂ½ Ä‘Äƒng nháº­p Há»c sinh...')
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
          setError(data.error || 'ThĂ´ng tin mĂ£ há»c sinh khĂ´ng há»£p lá»‡.')
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
             setError('TĂ i khoáº£n cá»§a báº¡n Ä‘Ă£ bá»‹ khĂ³a hoáº·c ngá»«ng hoáº¡t Ä‘á»™ng.')
          } else {
             setError('Sai tĂªn Ä‘Äƒng nháº­p hoáº·c máº­t kháº©u.')
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
      setError('Lá»—i káº¿t ná»‘i há»‡ thá»‘ng. Vui lĂ²ng thá»­ láº¡i.')
      setLoading(false)
      setLoadingSteps([])
    }
  }

  const handleForgotPassword = () => {
    setError('Vui lĂ²ng liĂªn há»‡ Ban Kháº£o thĂ­ & Äáº£m báº£o cháº¥t lÆ°á»£ng Ä‘á»ƒ Ä‘Æ°á»£c cáº¥p láº¡i máº­t kháº©u.')
  }

  if (!mounted) return null

  const roleLabel =
    role === 'STUDENT' ? 'Há»c sinh' :
    role === 'PARENT' ? 'Phá»¥ huynh' : 'CBGV'

  return (
    <>
      {/* Dynamic step-by-step loading modal */}
      {loading && loadingSteps.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
             style={{ background: 'rgba(0, 31, 30, 0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-[24px] p-8 shadow-2xl max-w-sm w-full mx-6 border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-center mb-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-slate-50" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#0CB3AD] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-[#0CB3AD]" />
                </div>
              </div>
            </div>
            <h3 className="text-center text-lg font-bold text-[#17383D] mb-1">Äang Ä‘Äƒng nháº­p</h3>
            <p className="text-center text-xs text-[#0CB3AD] font-extrabold mb-6 uppercase tracking-wider">{roleLabel}</p>
            <div className="space-y-3">
              {(loadingSteps as any[]).map((step: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-2">
                  {step.done
                    ? <CheckCircle2 className="w-5 h-5 text-[#21875A] shrink-0" />
                    : <Loader2 className="w-5 h-5 text-[#0CB3AD] shrink-0 animate-spin" />}
                  <span className={`text-xs font-semibold ${step.done ? 'text-slate-400 line-through opacity-60' : 'text-[#17383D]'}`}>
                    {step.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Split-screen layout (Left: features, Right: login form) */}
      <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F5F8F8] relative overflow-hidden font-sans">
        
        {/* LEFT COLUMN: Features Overview (Hidden on Mobile) */}
        <div className="hidden md:flex md:w-[50%] xl:w-[58%] flex-col justify-between p-8 lg:p-12 bg-[#004F4B] relative overflow-y-auto max-h-screen select-none custom-scrollbar">
          
          {/* Subtle gradient light sources */}
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-[#0CB3AD]/10 blur-[130px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-teal-500/10 blur-[110px] pointer-events-none" />
          
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
               style={{ 
                 backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', 
                 backgroundSize: '24px 24px' 
               }} 
          />

          <div className="relative z-10 w-full">
            {/* Header Brand */}
            <div className="flex flex-col items-start gap-1">
              <img src="/logo.png" alt="Sky-Line Logo" className="h-10 w-auto object-contain brightness-0 invert opacity-95 pointer-events-none" />
              <span className="text-[10px] font-extrabold text-[#D97706] tracking-[3px] uppercase mt-2 font-heading">
                NĂ¢ng táº§m giĂ¡o dá»¥c - Kiáº¿n táº¡o tÆ°Æ¡ng lai
              </span>
            </div>

            {/* Features overview section */}
            <div className="mt-8 lg:mt-10">
              <FeatureOverview />
            </div>
          </div>

          {/* Bottom Pillar Footers */}
          <div className="relative z-10 border-t border-white/5 pt-5 mt-8 flex flex-wrap items-center justify-between gap-3 text-[9px] font-extrabold tracking-wider text-teal-100/40 select-none">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0CB3AD]" />
              <span>Dá»® LIá»†U CHĂNH XĂC</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0CB3AD]" />
              <span>QUáº¢N TRá» MINH Báº CH</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0CB3AD]" />
              <span>THEO DĂ•I LIĂN Tá»¤C</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0CB3AD]" />
              <span>Äá»’NG HĂ€NH PHĂT TRIá»‚N</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Login Form Box (Full width on Mobile, 50% or 42% on Desktop) */}
        <div className="w-full md:w-[50%] xl:w-[42%] min-h-screen bg-[#F5F8F8] md:bg-white md:rounded-l-[32px] flex flex-col justify-between p-6 sm:p-10 md:p-12 shadow-[-10px_0_30px_rgba(0,0,0,0.03)] relative z-10 overflow-y-auto max-h-screen custom-scrollbar">
          
          <div className="my-auto py-4 max-w-[480px] w-full mx-auto">
            {/* Logo and Titles */}
            <div className="text-center md:text-left mb-6 flex flex-col items-center md:items-start select-none">
              <img 
                src="/logo.png" 
                alt="Sky-Line School Logo" 
                className="h-12 w-auto object-contain mb-4 pointer-events-none" 
              />
              <h2 className="text-xl font-bold text-[#17383D] tracking-tight">
                ÄÄƒng nháº­p há»‡ thá»‘ng
              </h2>
              <p className="text-xs font-semibold text-[#667A83] mt-1">
                Truy cáº­p há»‡ thá»‘ng theo tĂ i khoáº£n Ä‘Æ°á»£c cáº¥p
              </p>
            </div>

            {/* Login inputs form */}
            <LoginForm 
              role={role}
              setRole={setRole}
              identifier={identifier}
              setIdentifier={setIdentifier}
              password={password}
              setPassword={setPassword}
              rememberMe={rememberMe}
              setRememberMe={setRememberMe}
              error={error}
              setError={setError}
              loading={loading}
              onSubmit={handleSubmit}
              onForgotPassword={handleForgotPassword}
            />

            {/* SSO Microsoft Option */}
            <div className="mt-5 pt-5 border-t border-slate-100 flex flex-col items-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-[#F5F8F8] md:bg-white px-3 relative -top-7 select-none">
                hoáº·c
              </span>
              <MicrosoftLoginButton />
            </div>

            {/* Security Banner */}
            <SecurityBanner />

          </div>

          {/* Collapsible Feature Overview for Mobile only */}
          <div className="block md:hidden mt-8 border-t border-slate-200 pt-6">
            <FeatureOverview />
          </div>

          {/* Footer of the right column */}
          <div className="mt-8 border-t border-slate-100/80 md:border-none pt-4 md:pt-0">
            <PageFooter />
          </div>

        </div>

      </div>
    </>
  )
}