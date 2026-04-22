'use client'
import { signIn } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, Lock, GraduationCap, Users, ShieldCheck, 
  ArrowRight, Eye, EyeOff, AlertCircle
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
           setError(data.error || 'Thong tin khong hop le')
           setLoading(false); return
        }
        
        const targetUrl = data.formId 
          ? '/hocsinh/hs-khaosat/lam/' + data.formId 
          : '/hocsinh/hs-khaosat/danh-sach';
        
        // FORCED COOKIE SYNC
        document.cookie = "hs_token=" + data.token + "; path=/; max-age=" + (2*24*60*60) + "; SameSite=Lax";
        
        // IMMEDIATE HARD REDIRECT
        window.location.href = targetUrl;


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
      setError('Loi ket noi. Vui long thu lai.')
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="login-wrapper min-h-screen flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden" 
         style={{ background: 'linear-gradient(180deg, #FFF6D1 0%, #FF9900 100%)' }}>
      <div className="absolute top-[10%] right-[10%] w-64 h-64 bg-white/20 rounded-full blur-3xl opacity-60" />
      <div className="absolute bottom-[10%] left-[5%] w-80 h-80 bg-white/10 rounded-full blur-3xl opacity-40" />
      <div className="absolute top-[40%] left-[10%] w-48 h-48 bg-white/30 rounded-full blur-3xl opacity-40" />
      <div className="login-container relative z-10 w-full max-w-[480px]">
        <div className="text-center mb-12 animate-in fade-in zoom-in duration-700">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-6 relative">
             <div className="w-full h-full bg-[#78350f] rounded-[2rem] shadow-xl flex items-center justify-center">
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-14 h-14">
                  <path d="M20 5L5 12V28L20 35L35 28V12L20 5Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" fill="white" fillOpacity="0.1" />
                  <path d="M20 18L20 28M15 23L25 23" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="20" cy="13" r="2.5" fill="white" />
                </svg>
             </div>
          </div>
          <h1 className="text-6xl font-black text-[#5C2E0B] tracking-[10px] uppercase drop-shadow-sm mb-2">SQMS</h1>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-[#8B4513] uppercase tracking-wider">He thong Quan tri Chat luong Truong hoc</h2>
            <p className="text-[11px] font-bold text-[#A0522D] uppercase tracking-[3px] opacity-70">School Quality Management System</p>
          </div>
        </div>
        <div className="bg-white/40 backdrop-blur-md p-1.5 rounded-[2rem] border border-white/50 mb-6 flex gap-1.5 shadow-sm">
          {['STAFF', 'PARENT', 'STUDENT'].map((r) => {
            const labels = { STAFF: 'Can bo', PARENT: 'Phu huynh', STUDENT: 'Hoc sinh' };
            const icons = { STAFF: ShieldCheck, PARENT: Users, STUDENT: GraduationCap };
            const Icon = icons[r];
            return (
              <button key={r} onClick={() => {setRole(r); setError('');}}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${role === r ? 'bg-[#8B4513] text-white shadow-lg' : 'text-[#8B4513]/60 hover:bg-white/40'}`}>
                <Icon className="w-4 h-4" /> <span className="hidden sm:inline">{labels[r]}</span>
              </button>
            )
          })}
        </div>
        <div className="bg-[#FFFCF2] rounded-[3.5rem] p-10 sm:p-12 shadow-2xl border border-white/30 animate-in slide-in-from-bottom-8 duration-700">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-black text-[#451C03] mb-3">Dang nhap</h3>
            <p className="text-sm font-medium text-[#8B4513]/70">
              {role === 'STAFF' && 'Su dung ma nhan vien hoac Email duoc cap'}
              {role === 'PARENT' && 'Nhap ma phu huynh de xem thong tin'}
              {role === 'STUDENT' && 'Nhap ma hoc sinh de tham gia khao sat'}
            </p>
          </div>
          {error && (
            <div className="mb-6 p-4 rounded-2xl flex items-center gap-3 bg-red-50 text-red-700 border border-red-100 animate-in fade-in zoom-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-black">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-7">
            <div>
              <label className="block text-sm font-black text-[#451C03] mb-3 ml-1">Tai khoan</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center">
                  <User className="w-5 h-5 text-orange-500/50" />
                </div>
                <input type="text" required value={identifier} onChange={e => setIdentifier(e.target.value)} 
                  placeholder={role === 'STAFF' ? 'admin@skyline.edu' : 'Ma so cua ban'}
                  className="w-full pl-14 pr-6 py-4 bg-[#ECF3FF] border border-[#DEE9FF] rounded-2xl text-lg font-medium text-slate-800 focus:bg-white focus:border-orange-200 outline-none transition-all shadow-inner" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-black text-[#451C03] mb-3 ml-1">Mat khau</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-orange-500/50" />
                </div>
                <input type={showPassword ? 'text' : 'password'} required={role !== 'STUDENT'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full pl-14 pr-16 py-4 bg-[#ECF3FF] border border-[#DEE9FF] rounded-2xl text-lg font-medium text-slate-800 focus:bg-white focus:border-orange-200 outline-none transition-all shadow-inner" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-orange-900 transition-colors">
                  {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
              </div>
              {role === 'STUDENT' && <p className="text-[10px] text-orange-800/40 font-bold mt-2 ml-1 italic">* Mat khau mac dinh la ma hoc sinh</p>}
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-5 bg-[#A14902] text-white rounded-3xl text-xl font-black shadow-xl shadow-[#A14902]/30 flex items-center justify-center gap-3 hover:translate-y-[-2px] hover:bg-[#8B4513] transition-all disabled:opacity-60 overflow-hidden relative group">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              {loading ? 'DANG XAC THUC...' : 'Dang nhap'}
            </button>
          </form>
        </div>
        <p className="text-center mt-12 text-sm font-extrabold text-[#5C2E0B]/50 tracking-wider">© 2026 SQMS • Skyline Education</p>
      </div>
    </div>
  )
}
