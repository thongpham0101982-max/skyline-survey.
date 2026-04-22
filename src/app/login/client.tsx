'use client'
import { signIn } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, Lock, GraduationCap, Users, ShieldCheck, 
  ArrowRight, Eye, EyeOff, AlertCircle, ChevronRight, 
  Sparkles, Shield
} from 'lucide-react'

export function LoginClient() {
  const router = useRouter()
  const [role, setRole] = useState('STAFF')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (role === 'STUDENT') {
        const res = await fetch('/api/hocsinh/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentCode: identifier.trim(), password: password || identifier.trim() })
        })
        const data = await res.json()
        if (!res.ok) {
           setError(data.error || 'Ma hoc sinh hoac mat khau khong dung')
           setLoading(false)
           return
        }
        window.location.assign('/hocsinh/Hs-khaosat/danh-sach')
      } else {
        const result = await signIn('credentials', {
          email: identifier.trim(),
          password,
          redirect: false,
        })
        
        if (result?.error) {
           setError('Sai ten dang nhap hoac mat khau!')
           setLoading(false)
        } else {
           window.location.assign('/')
        }
      }
    } catch (err) {
      setError('Loi he thong. Vui long thu lai.')
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="login-wrapper min-h-screen flex items-center justify-center p-4 bg-[#FFF9E6] font-sans selection:bg-[#BE1E2E]/10 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-[#BE1E2E]/10 to-transparent rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-amber-200/40 to-transparent rounded-full blur-[80px]" />
      </div>

      <div className="login-container relative z-10 w-full max-w-[500px] animate-in fade-in duration-700">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-6 relative">
             <div className="absolute inset-[-20%] bg-gradient-to-br from-amber-400 to-amber-600 rounded-[2.5rem] opacity-20 animate-pulse" />
             <div className="relative w-full h-full bg-[#78350f] rounded-[2rem] shadow-2xl shadow-[#78350f]/30 flex items-center justify-center transform hover:rotate-[-5deg] transition-transform duration-500">
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-14 h-14">
                  <path d="M20 5L5 12V28L20 35L35 28V12L20 5Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" fill="white" fillOpacity="0.1" />
                  <path d="M20 18L20 28M15 23L25 23" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="20" cy="13" r="2.5" fill="white" />
                </svg>
             </div>
          </div>
          
          <h1 className="text-6xl font-black text-[#451a03] tracking-[12px] uppercase drop-shadow-sm">SQMS</h1>
          <div className="space-y-1 mt-3">
            <h2 className="text-lg font-black text-[#78350f] uppercase tracking-wider">He thong Quan tri Chat luong</h2>
            <p className="text-[11px] font-bold text-[#a16207] uppercase tracking-[3px] opacity-60">School Quality Management System</p>
          </div>
        </div>

        <div className="bg-white/40 backdrop-blur-xl p-1.5 rounded-[2rem] border border-[#78350f]/10 mb-6 flex gap-1 shadow-sm">
          {['STUDENT', 'PARENT', 'STAFF'].map((r) => {
            const labels = { STAFF: 'Giao vien', PARENT: 'Phu huynh', STUDENT: 'Hoc sinh' };
            const icons = { STAFF: ShieldCheck, PARENT: Users, STUDENT: GraduationCap };
            const Icon = icons[r];
            return (
              <button key={r} onClick={() => {setRole(r); setError('');}}
                className={lex-1 flex items-center justify-center gap-2 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 }>
                <Icon className="w-4 h-4" /> <span className="hidden sm:inline">{labels[r]}</span>
              </button>
            )
          })}
        </div>

        <div className="bg-white/80 backdrop-blur-[40px] rounded-[3rem] border border-white p-10 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="relative space-y-8">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-[#451a03]">Dang nhap</h3>
              <p className="text-xs font-bold text-[#78350f]/60 uppercase tracking-widest">
                {role === 'STAFF' ? 'Can bo / Giao vien' : role === 'PARENT' ? 'Phu huynh hoc sinh' : 'Hoc sinh Skyline'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-black">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-[#78350f]/40 uppercase tracking-widest ml-1">{role === 'STAFF' ? 'Email / Ma NV' : 'Ma so cua ban'}</label>
                <div className="relative group/input">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78350f]/40" />
                  <input type="text" required value={identifier} onChange={e => setIdentifier(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-[#78350f]/5 border-2 border-transparent rounded-[1.5rem] text-lg font-bold text-[#451a03] focus:bg-white focus:border-[#78350f] outline-none transition-all" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-[#78350f]/40 uppercase tracking-widest ml-1">Mat khau</label>
                <div className="relative group/input">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78350f]/40" />
                  <input type={showPassword ? 'text' : 'password'} required={role !== 'STUDENT'} value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full pl-14 pr-14 py-4 bg-[#78350f]/5 border-2 border-transparent rounded-[1.5rem] text-lg font-bold text-[#451a03] focus:bg-white focus:border-[#78350f] outline-none transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-[#78350f]/20">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-5 bg-[#78350f] text-white rounded-[1.5rem] text-lg font-black shadow-xl shadow-[#78350f]/30 hover:bg-[#451a03] transition-all disabled:opacity-50">
                {loading ? 'Dang xac thuc...' : 'Dang nhap'}
              </button>
            </form>
          </div>
        </div>
        <p className="text-center mt-10 text-[10px] font-black text-[#78350f]/40 uppercase tracking-[4px]">2026 SQMS • Skyline Education</p>
      </div>
    </div>
  )
}
