// @ts-nocheck
﻿'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Send, CheckCircle2, AlertCircle, GraduationCap } from 'lucide-react'
import Link from 'next/link'

interface Q { id:string; questionText:string; questionType:string; ratingMin:number; ratingMax:number; options:string|null; isRequired:boolean; weight:number }
interface Props { formId:string; periodName:string; studentName:string; className:string; questions:Q[] }

export default function HsFormClient({ formId, periodName, studentName, className, questions }: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string,any>>({})
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const SZ = 5
  const total = Math.ceil(questions.length / SZ)
  const stepQs = questions.slice(step * SZ, (step + 1) * SZ)
  const progress = Math.min(100, Math.round(((step * SZ + stepQs.length) / questions.length) * 100))
  const ans = (id:string, v:any) => setAnswers(p => ({ ...p, [id]: v }))

  const validate = (qs: Q[]) => {
    for (const q of qs) {
      if (q.isRequired) {
        const value = answers[q.id]
        if (value === undefined || value === "" || value === null) return q
        if (["MC_GRID", "CB_GRID", "GRID"].includes(q.questionType?.toUpperCase())) {
          let gridOpts = { rows: [] };
          try { 
            const p = JSON.parse(q.options || "{}");
            gridOpts = (p && typeof p === "object") ? p : { rows: [] };
          } catch {}
          const rows = gridOpts.rows || [];
          if (rows.length > 0) {
            const currentGrid = value || {};
            for (let ri = 0; ri < rows.length; ri++) {
              if (currentGrid[ri] === undefined || (Array.isArray(currentGrid[ri]) && currentGrid[ri].length === 0)) return q;
            }
          }
        }
      }
    }
    return null
  }

  const next = () => {
    const m = validate(stepQs); if (m) { setErr('Vui lòng hoàn thành: ' + m.questionText.substring(0,60)); return }
    setErr(''); setStep(s => s + 1); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const prev = () => { setErr(''); setStep(s => s - 1); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const submit = async () => {
    const m = validate(stepQs); if (m) { setErr('Vui lòng hoàn thành: ' + m.questionText.substring(0,60)); return }
    for (const q of questions) {
      if (q.isRequired && (answers[q.id] === undefined || answers[q.id] === '')) {
        setStep(Math.floor(questions.indexOf(q) / SZ))
        setErr('Còn câu hỏi chưa trả lời: ' + q.questionText.substring(0,60)); return
      }
    }
    setSubmitting(true); setErr('')
    try {
      const res = await fetch('/api/hocsinh/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId, answers })
      })
      if (!res.ok) { const d = await res.json(); setErr(d.error || 'Lỗi gửi bài'); setSubmitting(false); return }
      setDone(true)
      setTimeout(() => router.push('/hocsinh/hs-khaosat/danh-sach'), 3000)
    } catch (e) {
      setErr('Lỗi kết nối mạng'); setSubmitting(false)
    }
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f0fdf4]">
      <div className="bg-white rounded-[3rem] p-12 max-w-sm w-full text-center shadow-2xl border border-emerald-100">
        <div className="w-24 h-24 flex items-center justify-center mx-auto mb-8 text-xs font-semibold">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-4">Hoàn tất!</h2>
        <p className="text-slate-500 font-medium mb-8 leading-relaxed text-sm">Cảm ơn bạn đã hoàn thành khảo sát. Ý kiến của bạn rất quan trọng với Skyline.</p>
        <div className="flex items-center justify-center gap-3 text-emerald-600 font-bold text-xs">
          <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          Đang chuyển hướng...
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen font-outfit" style={{ background: '#f8fafc' }}>
      <div className="text-white sticky top-0 z-50 shadow-xl" style={{ background: 'linear-gradient(135deg,#00A99D,#8b0000)' }}>
        <div className="max-w-2xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/hocsinh/hs-khaosat/danh-sach" className="flex items-center gap-2 text-white/80 hover:text-white text-xs font-black uppercase tracking-widest transition-all">
              <ArrowLeft className="w-4 h-4" /> Quay lại
            </Link>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
              <GraduationCap className="w-3.5 h-3.5 text-white/70" />
              <span className="text-[10px] font-black text-white/90 uppercase tracking-widest">{className}</span>
            </div>
          </div>
          <h1 className="text-lg font-black leading-tight truncate drop-shadow-sm">{periodName}</h1>
          <p className="text-white/60 text-xs mt-1 font-bold">{studentName}</p>
          <div className="mt-5 rounded-full overflow-hidden bg-white/20" style={{ height: '8px' }}>
            <div className="h-full rounded-full transition-all duration-1000 ease-out bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ width: progress + '%' }} />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-white/50 font-black uppercase tracking-wider">
            <span>Bước {step + 1} / {total}</span>
            <span>{progress}% Hoàn thành</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 pb-40">
        {err && (
          <div className="mb-8 p-5 flex items-start gap-4 text-[#00A99D] animate-in slide-in-from-top-4 shadow-sm text-xs font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-black">{err}</p>
          </div>
        )}
        
        <div className="space-y-8">
          {stepQs.map((q, i) => {
            const n = step * SZ + i + 1
            const type = q.questionType?.trim()?.toUpperCase()
            const value = answers[q.id]
            const answered = value !== undefined && value !== '' && value !== null
            
            return (
              <div key={q.id} className="bg-white rounded-[2.5rem] border-2 p-8 shadow-xl shadow-slate-200/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/60"
                style={{ borderColor: answered ? '#d1fae5' : '#f1f5f9' }}>
                <div className="flex items-start gap-4 mb-8">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 transition-all duration-500 shadow-sm ${answered ? 'bg-emerald-500 text-white rotate-[360deg]' : 'bg-slate-50 text-slate-400'}`}>
                    {answered ? <CheckCircle2 className="w-5 h-5" /> : n}
                  </div>
                  <p className="font-black text-slate-800 text-base leading-relaxed pt-1">
                    {q.questionText} {q.isRequired && <span className="text-[#00A99D] ml-1">*</span>}
                    <span className="block text-[8px] text-slate-300 font-mono mt-1 uppercase">Type: {type}</span>
                  </p>
                </div>

                <div className="mt-4 transition-all duration-500">
                  {['RATING', 'NPS', 'LIKERT', 'SATISFACTION'].includes(type) && (
                    <div className="space-y-4">
                      <div className="flex gap-2.5 flex-wrap justify-center sm:justify-start">
                        {Array.from({ length: (q.ratingMax || 10) - (q.ratingMin || 0) + 1 }, (_, k) => k + (q.ratingMin || 0)).map(v => (
                          <button key={v} onClick={() => ans(q.id, v)}
                            className="w-12 h-12 rounded-2xl font-black text-base border-2 transition-all hover:scale-110 active:scale-90 flex items-center justify-center shadow-sm"
                            style={{
                              background: value === v ? '#00A99D' : '#f8fafc',
                              color: value === v ? 'white' : '#475569',
                              borderColor: value === v ? '#00A99D' : '#e2e8f0',
                              boxShadow: value === v ? '0 8px 20px rgba(190,30,46,0.3)' : ''
                            }}>
                            {v}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between px-2">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Thấp nhất</span>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Cao nhất</span>
                      </div>
                    </div>
                  )}

                  {['TEXT', 'OPEN_ENDED', 'COMMENT', 'ESSAY'].includes(type) && (
                    <textarea 
                      value={value || ''} 
                      onChange={e => ans(q.id, e.target.value)} 
                      rows={4}
                      placeholder="Chia sẻ ý kiến của bạn tại đây..."
                      className="w-full rounded-3xl px-6 py-5 text-sm font-bold text-slate-700 outline-none resize-none transition-all border-2 border-slate-50 focus:border-[#00A99D]/30 focus:bg-white shadow-inner"
                      style={{ background: '#f8fafc' }} 
                    />
                  )}

                  {['CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN', 'RADIO', 'SINGLE_CHOICE'].includes(type) && (() => {
                    let opts = []
                    try {
                      if (!q.options) { opts = [] }
                      else {
                        const parsed = JSON.parse(q.options)
                        if (Array.isArray(parsed)) opts = parsed
                        else if (parsed && typeof parsed === 'object') opts = parsed.choices || []
                        else opts = String(q.options).split(',').map(s => s.trim())
                      }
                    } catch { 
                      try {
                        const fixed = q.options?.replace(/'/g, '"') || "";
                        const parsed = JSON.parse(fixed);
                        if (Array.isArray(parsed)) opts = parsed;
                        else if (parsed && typeof parsed === 'object') opts = parsed.choices || [];
                      } catch {
                        opts = q.options ? String(q.options).split(',').map(s => s.trim()) : [] 
                      }
                    }
                    
                    return (
                      <div className="grid grid-cols-1 gap-3">
                        {opts.map((opt: any) => (
                          <button key={opt} onClick={() => ans(q.id, opt)}
                            className="w-full px-6 py-4.5 rounded-2xl border-2 text-left text-sm font-black transition-all flex items-center justify-between group"
                            style={{
                              background: value === opt ? 'rgba(190,30,46,0.03)' : '#f8fafc',
                              borderColor: value === opt ? '#00A99D' : '#f1f5f9',
                              color: value === opt ? '#00A99D' : '#475569',
                              boxShadow: value === opt ? '0 4px 15px rgba(190,30,46,0.05)' : ''
                            }}>
                            {opt}
                            <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${value === opt ? 'border-[#00A99D] bg-[#00A99D]' : 'border-slate-200 bg-white group-hover:border-[#00A99D]/40'}`}>
                              {value === opt && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  })()}

                  {['CHECKBOX', 'MULTI_SELECT'].includes(type) && (() => {
                    let opts = []
                    try {
                      if (!q.options) { opts = [] }
                      else {
                        const parsed = JSON.parse(q.options)
                        if (Array.isArray(parsed)) opts = parsed
                        else if (parsed && typeof parsed === 'object') opts = parsed.choices || []
                        else opts = String(q.options).split(',').map(s => s.trim())
                      }
                    } catch { 
                      try {
                        const fixed = q.options?.replace(/'/g, '"') || "";
                        const parsed = JSON.parse(fixed);
                        if (Array.isArray(parsed)) opts = parsed;
                        else if (parsed && typeof parsed === 'object') opts = parsed.choices || [];
                      } catch {
                        opts = q.options ? String(q.options).split(',').map(s => s.trim()) : [] 
                      }
                    }

                    const currentVals = Array.isArray(value) ? value : []
                    const toggle = (v: any) => {
                      const next = currentVals.includes(v) ? currentVals.filter(x => x !== v) : [...currentVals, v]
                      ans(q.id, next)
                    }

                    return (
                      <div className="grid grid-cols-1 gap-3">
                        {opts.map((opt) => (
                          <button key={opt} onClick={() => toggle(opt)}
                            className="w-full px-6 py-4.5 rounded-2xl border-2 text-left text-sm font-black transition-all flex items-center justify-between group"
                            style={{
                              background: currentVals.includes(opt) ? 'rgba(190,30,46,0.03)' : '#f8fafc',
                              borderColor: currentVals.includes(opt) ? '#00A99D' : '#f1f5f9',
                              color: currentVals.includes(opt) ? '#00A99D' : '#475569'
                            }}>
                            {opt}
                            <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${currentVals.includes(opt) ? 'border-[#00A99D] bg-[#00A99D]' : 'border-slate-200 bg-white group-hover:border-[#00A99D]/40'}`}>
                              {currentVals.includes(opt) && <div className="w-2.5 h-2.5 bg-white rounded-[3px]" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  })()}

                  {['MC_GRID', 'CB_GRID', 'GRID'].includes(type) && (() => {
                    const gridOpts = { rows: [], columns: [] }
                    try {
                      const parsed = JSON.parse(q.options || '{}')
                      if (parsed && typeof parsed === 'object') {
                        gridOpts.rows = parsed.rows || []
                        gridOpts.columns = parsed.columns || []
                      }
                    } catch {
                      try {
                        const fixed = q.options?.replace(/'/g, '"') || "";
                        const parsed = JSON.parse(fixed);
                        if (parsed && typeof parsed === 'object') {
                          gridOpts.rows = parsed.rows || []
                          gridOpts.columns = parsed.columns || []
                        }
                      } catch {}
                    }
                    
                    const isCheckGrid = type === 'CB_GRID'
                    const currentGrid = value || {}
                    
                    return (
                      <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr>
                              <th className="p-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6 border border-slate-200">Tiêu chí</th>
                              {gridOpts.columns.map((col, ci) => (
                                <th key={ci} className="p-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6 min-w-[70px] border border-slate-200">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {gridOpts.rows.map((row, ri) => (
                              <tr key={ri} className="group/row hover:bg-slate-50/50 transition-colors text-xs font-semibold">
                                <td className="p-2 p-2 text-sm font-bold text-slate-700 leading-tight pr-4 border border-slate-200">{row}</td>
                                {gridOpts.columns.map((_, ci) => {
                                  const rowVal = currentGrid[ri]
                                  const isSelected = isCheckGrid 
                                    ? (Array.isArray(rowVal) && rowVal.includes(ci))
                                    : rowVal === ci
                                  
                                  return (
                                    <td key={ci} className="p-2 text-center border border-slate-200">
                                      <button
                                        onClick={() => {
                                          const nextGrid = { ...currentGrid }
                                          if (isCheckGrid) {
                                            const prev = Array.isArray(nextGrid[ri]) ? nextGrid[ri] : []
                                            nextGrid[ri] = prev.includes(ci) ? prev.filter(x => x !== ci) : [...prev, ci]
                                          } else {
                                            nextGrid[ri] = ci
                                          }
                                          ans(q.id, nextGrid)
                                        }}
                                        className={`w-8 h-8 mx-auto flex items-center justify-center border-2 transition-all hover:scale-110 active:scale-90 ${isSelected ? 'border-[#00A99D] bg-[#00A99D] shadow-lg shadow-teal-100' : 'border-slate-200 bg-white group-hover/row:border-red-200'} ${isCheckGrid ? 'rounded-xl' : 'rounded-full'}`}
                                      >
                                        {isSelected && <div className={`bg-white ${isCheckGrid ? 'w-2.5 h-2.5 rounded-[3px]' : 'w-2.5 h-2.5 rounded-full'}`} />}
                                      </button>
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  })()}

                  {!['RATING', 'NPS', 'LIKERT', 'SATISFACTION', 'TEXT', 'OPEN_ENDED', 'COMMENT', 'ESSAY', 'CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN', 'RADIO', 'SINGLE_CHOICE', 'CHECKBOX', 'MULTI_SELECT', 'MC_GRID', 'CB_GRID', 'GRID'].includes(type) && (
                    <div className="p-4 text-xs font-bold text-slate-400 text-center text-xs font-semibold">
                      Giao diện cho loại câu hỏi "{type}" đang được cập nhật...
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-slate-100 p-6 z-40 shadow-[0_-15px_40px_rgba(0,0,0,0.04)]">
        <div className="max-w-2xl mx-auto flex gap-4">
          {step > 0 && (
            <button onClick={prev} className="flex items-center gap-2 font-black text-sm transition-all text-slate-400 hover:bg-slate-100 active:scale-95 text-xs font-semibold">
              <ArrowLeft className="w-5 h-5" /> Lùi
            </button>
          )}
          {step < total - 1 ? (
            <button onClick={next} className="flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.75rem] font-black text-sm text-white transition-all hover:opacity-90 active:scale-95 shadow-xl shadow-slate-200" style={{ background: '#0f172a' }}>
              Tiếp theo <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting} className="flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.75rem] font-black text-sm text-white transition-all active:scale-95 disabled:opacity-50 shadow-2xl shadow-red-200"
              style={{ background: 'linear-gradient(135deg,#00A99D,#a01927)' }}>
              {submitting
                ? <><div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> Đang gửi bài...</>
                : <><Send className="w-5 h-5" /> Nộp bài khảo sát</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
