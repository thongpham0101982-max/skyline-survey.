'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Lock, User, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function HsLoginPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) { setErr('Vui long nhap ma hoc sinh'); return }
    setLoading(true); setErr('')
    const res = await fetch('/api/hocsinh/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentCode: code.trim(), password: pass || code.trim() })
    })
    const d = await res.json()
    if (!res.ok) { setErr(d.error || 'Dang nhap that bai'); setLoading(false); return }
    router.push('/hocsinh/Hs-khaosat/danh-sach')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#0f0a0a 0%,#1a0507 50%,#0f1521 100%)' }}>
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle,#BE1E2E,transparent)' }} />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle,#BE1E2E,transparent)' }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5 shadow-2xl relative"
            style={{ background: 'linear-gradient(135deg,#BE1E2E,#8b0000)', boxShadow: '0 20px 60px rgba(190,30,46,0.4)' }}>
            <GraduationCap className="w-10 h-10 text-white" />
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full border-2 border-slate-900 flex items-center justify-center text-[9px] font-black text-slate-900">HS</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">SKYLINE ACADEMY</h1>
          <p className="text-white/40 text-sm mt-1">Cong thong tin khao sat hoc sinh</p>
        </div>

        <div className="rounded-3xl p-8 border border-white/10 shadow-2xl backdrop-blur-2xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <h2 className="text-xl font-black text-white mb-1">Dang nhap Hoc Sinh</h2>
          <p className="text-white/40 text-sm mb-8">Nhap ma hoc sinh de tham gia khao sat</p>

          {err && (
            <div className="mb-6 p-4 rounded-2xl flex items-center gap-3 text-red-400 border border-red-500/20" style={{ background: 'rgba(239,68,68,0.08)' }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-sm font-bold">{err}</p>
            </div>
          )}

          <form onSubmit={login} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Ma Hoc Sinh</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input id="hs-code" type="text" value={code} onChange={e => setCode(e.target.value)}
                  placeholder="Vi du: HS2025001"
                  className="w-full rounded-2xl pl-12 pr-4 py-4 text-white font-mono font-bold transition-all outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Mat Khau</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input id="hs-pass" type={show ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)}
                  placeholder="Mac dinh: Ma hoc sinh"
                  className="w-full rounded-2xl pl-12 pr-14 py-4 text-white font-mono font-bold transition-all outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                <button type="button" onClick={() => setShow(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-white/25 mt-2 ml-1">* Mat khau mac dinh chinh la ma hoc sinh</p>
            </div>
            <button id="hs-login-btn" type="submit" disabled={loading}
              className="w-full py-4 rounded-2xl text-white font-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#BE1E2E,#a01927)', boxShadow: '0 8px 32px rgba(190,30,46,0.35)' }}>
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Dang xac thuc...</>
                : <>Dang nhap <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-6 p-4 rounded-2xl border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Huong dan</p>
            <p className="text-xs text-white/30 leading-relaxed">Nhap <span className="text-white/50 font-bold">ma hoc sinh</span> vao ca hai o dang nhap va mat khau.</p>
          </div>
        </div>
        <p className="text-center text-white/15 text-xs mt-8">2026 Skyline Education Group</p>
      </div>
    </div>
  )
}
