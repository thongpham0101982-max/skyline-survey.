'use client'
import { useState, useEffect } from 'react'
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
    if (d.formId) router.push('/hocsinh/Hs-khaosat/lam/' + d.formId); else router.push('/hocsinh/Hs-khaosat/danh-sach');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FFF9E6] relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-200/30 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-amber-300/20 rounded-full blur-[80px]" />

      <div className="relative z-10 w-full max-w-[450px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-[#78350f] rounded-[2rem] mb-6 shadow-2xl relative">
            <GraduationCap className="w-12 h-12 text-white" />
            <div className="absolute -top-1 -right-1 w-7 h-7 bg-amber-500 rounded-full border-4 border-[#FFF9E6] flex items-center justify-center text-[10px] font-black text-[#78350f]">HS</div>
          </div>
          <h1 className="text-5xl font-black text-[#451a03] tracking-[10px] uppercase">SQMS</h1>
          <p className="text-[#a16207] text-[10px] font-black uppercase tracking-[4px] mt-2 opacity-60">KHAO SAT HOC SINH SKYLINE</p>
        </div>

        <div className="bg-white/80 backdrop-blur-2xl rounded-[3rem] p-10 shadow-2xl border border-white">
          <h2 className="text-2xl font-black text-[#451a03] text-center mb-2">Hoc Sinh</h2>
          <p className="text-[#78350f]/60 text-center text-xs font-bold mb-8 uppercase tracking-widest">Khao sat chat luong giao duc</p>

          {err && (
            <div className="mb-6 p-4 rounded-2xl flex items-center gap-3 bg-red-50 text-red-700 border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-black">{err}</p>
            </div>
          )}

          <form onSubmit={login} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-[#78350f]/40 uppercase tracking-widest mb-2 ml-1">Ma hoc sinh</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78350f]/30" />
                <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="HS000000"
                  className="w-full rounded-2xl pl-14 pr-6 py-4 bg-[#78350f]/5 border-2 border-transparent focus:bg-white focus:border-[#78350f] text-lg font-bold text-[#451a03] outline-none transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-[#78350f]/40 uppercase tracking-widest mb-2 ml-1">Mat khau</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78350f]/30" />
                <input type={show ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"
                  className="w-full rounded-2xl pl-14 pr-14 py-4 bg-[#78350f]/5 border-2 border-transparent focus:bg-white focus:border-[#78350f] text-lg font-bold text-[#451a03] outline-none transition-all" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#78350f]/20 hover:text-[#78350f]">
                  {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-[10px] text-[#a16207]/50 font-black italic mt-2 ml-1">* Mat khau mac dinh la ma hoc sinh</p>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-5 bg-[#78350f] text-white rounded-2xl text-lg font-black shadow-xl shadow-[#78350f]/30 flex items-center justify-center gap-2 hover:bg-[#451a03] transition-all disabled:opacity-50">
              {loading ? 'DANG XAC THUC...' : <>DANG NHAP <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>
        </div>
        <p className="text-center text-[#78350f]/20 text-[10px] font-black uppercase tracking-[4px] mt-10">2026 SKYLINE EDUCATION GROUP</p>
      </div>
    </div>
  )
}
