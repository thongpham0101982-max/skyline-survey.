'use client'
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
      if (q.isRequired && (answers[q.id] === undefined || answers[q.id] === '' || answers[q.id] === null)) return q
    }
    return null
  }

  const next = () => {
    const m = validate(stepQs); if (m) { setErr('Vui lòng trả lời: ' + m.questionText.substring(0,60)); return }
    setErr(''); setStep(s => s + 1)
  }
  const prev = () => { setErr(''); setStep(s => s - 1) }

  const submit = async () => {
    const m = validate(stepQs); if (m) { setErr('Vui lòng trả lời: ' + m.questionText.substring(0,60)); return }
    for (const q of questions) {
      if (q.isRequired && (answers[q.id] === undefined || answers[q.id] === '')) {
        setStep(Math.floor(questions.indexOf(q) / SZ))
        setErr('Còn câu hỏi chưa trả lời: ' + q.questionText.substring(0,60)); return
      }
    }
    setSubmitting(true); setErr('')
    const res = await fetch('/api/hocsinh/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formId, answers })
    })
    if (!res.ok) { const d = await res.json(); setErr(d.error || 'Lỗi gửi bài'); setSubmitting(false); return }
    setDone(true)
    setTimeout(() => router.push('/hocsinh/hs-khaosat/danh-sach'), 3000)
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f0fdf4' }}>
      <div className="bg-white rounded-3xl p-12 max-w-sm w-full text-center shadow-2xl border border-emerald-100">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#dcfce7' }}>
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Nộp bài thành công!</h2>
        <p className="text-slate-400 text-sm">Cảm ơn bạn đã hoàn thành khảo sát.</p>
        <p className="text-xs text-slate-300 mt-4">Tự động chuyển trang...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      <div className="text-white sticky top-0 z-50 shadow-lg" style={{ background: 'linear-gradient(135deg,#BE1E2E,#8b0000)' }}>
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <Link href="/hocsinh/hs-khaosat/danh-sach" className="flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-bold transition-colors">
              <ArrowLeft className="w-4 h-4" /> Quay lại
            </Link>
            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-1">
              <GraduationCap className="w-3 h-3" /> Lớp {className}
            </span>
          </div>
          <h1 className="text-base font-black leading-tight truncate">{periodName}</h1>
          <p className="text-white/50 text-xs mt-0.5">{studentName}</p>
          <div className="mt-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)', height: '6px' }}>
            <div className="h-full rounded-full transition-all duration-500 bg-white" style={{ width: progress + '%' }} />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-white/40 font-bold">
            <span>Bước {step + 1}/{total}</span><span>{progress}%</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {err && (
          <div className="mb-5 p-4 rounded-2xl flex items-start gap-3 text-red-600 border border-red-100" style={{ background: '#fef2f2' }}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-sm font-bold">{err}</p>
          </div>
        )}
        <div className="space-y-5">
          {stepQs.map((q, i) => {
            const n = step * SZ + i + 1
            const answered = answers[q.id] !== undefined && answers[q.id] !== ''
            return (
              <div key={q.id} className="bg-white rounded-3xl border-2 p-6 shadow-sm transition-all"
                style={{ borderColor: answered ? '#d1fae5' : '#f1f5f9' }}>
                <div className="flex items-start gap-3 mb-5">
                  <span className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-all"
                    style={{ background: answered ? '#10b981' : '#f1f5f9', color: answered ? 'white' : '#64748b' }}>
                    {answered ? <CheckCircle2 className="w-4 h-4" /> : n}
                  </span>
                  <p className="font-bold text-slate-800 text-sm leading-relaxed">
                    {q.questionText} {q.isRequired && <span style={{ color: '#BE1E2E' }}>*</span>}
                  </p>
                </div>

                {/* RATING, NPS, LIKERT logic */}
                {(['RATING', 'NPS', 'LIKERT'].includes(q.questionType?.toUpperCase())) && (
                  <div>
                    <div className="flex gap-2 flex-wrap">
                      {Array.from({ length: (q.ratingMax || 10) - (q.ratingMin || 0) + 1 }, (_, k) => k + (q.ratingMin || 0)).map(v => (
                        <button key={v} onClick={() => ans(q.id, v)}
                          className="w-10 h-10 md:w-12 md:h-12 rounded-2xl font-black text-sm border-2 transition-all hover:scale-105 active:scale-95"
                          style={{
                            background: answers[q.id] === v ? '#BE1E2E' : '#f8fafc',
                            color: answers[q.id] === v ? 'white' : '#475569',
                            borderColor: answers[q.id] === v ? '#BE1E2E' : '#e2e8f0',
                            boxShadow: answers[q.id] === v ? '0 4px 12px rgba(190,30,46,0.2)' : ''
                          }}>
                          {v}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 px-1">
                      <span className="text-[10px] text-slate-400 font-bold">Thấp nhất</span>
                      <span className="text-[10px] text-slate-400 font-bold">Cao nhất</span>
                    </div>
                  </div>
                )}

                {/* TEXT logic */}
                {(['TEXT', 'OPEN_ENDED'].includes(q.questionType?.toUpperCase())) && (
                  <textarea value={answers[q.id] || ''} onChange={e => ans(q.id, e.target.value)} rows={4}
                    placeholder="Nhập ý kiến của bạn tại đây..."
                    className="w-full rounded-2xl px-5 py-4 text-sm text-slate-700 outline-none resize-none transition-all border-2 border-slate-100 focus:border-red-200"
                    style={{ background: '#f8fafc' }} />
                )}

                {/* CHOICE, MULTIPLE_CHOICE, DROPDOWN logic */}
                {(['CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN'].includes(q.questionType?.toUpperCase())) && q.options && (() => {
                  let opts: string[] = []
                  try { opts = JSON.parse(q.options) } catch { opts = q.options.split(',').map((s:string) => s.trim()) }
                  return (
                    <div className="space-y-2">
                      {opts.map((opt: string) => (
                        <button key={opt} onClick={() => ans(q.id, opt)}
                          className="w-full px-5 py-3.5 rounded-2xl border-2 text-left text-sm font-bold transition-all"
                          style={{
                            background: answers[q.id] === opt ? 'rgba(190,30,46,0.05)' : '#f8fafc',
                            borderColor: answers[q.id] === opt ? '#BE1E2E' : '#e2e8f0',
                            color: answers[q.id] === opt ? '#BE1E2E' : '#475569'
                          }}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  )
                })()}

                {/* CHECKBOX logic */}
                {(q.questionType?.toUpperCase() === 'CHECKBOX') && q.options && (() => {
                  let opts: string[] = []
                  try { opts = JSON.parse(q.options) } catch { opts = q.options.split(',').map((s:string) => s.trim()) }
                  const currentVals = answers[q.id] || []
                  const toggle = (v: string) => {
                    const next = currentVals.includes(v) ? currentVals.filter((x:any) => x !== v) : [...currentVals, v]
                    ans(q.id, next)
                  }
                  return (
                    <div className="space-y-2">
                      {opts.map((opt: string) => (
                        <button key={opt} onClick={() => toggle(opt)}
                          className="w-full px-5 py-3.5 rounded-2xl border-2 text-left text-sm font-bold transition-all flex items-center justify-between"
                          style={{
                            background: currentVals.includes(opt) ? 'rgba(190,30,46,0.05)' : '#f8fafc',
                            borderColor: currentVals.includes(opt) ? '#BE1E2E' : '#e2e8f0',
                            color: currentVals.includes(opt) ? '#BE1E2E' : '#475569'
                          }}>
                          {opt}
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${currentVals.includes(opt) ? 'bg-[#BE1E2E] border-[#BE1E2E]' : 'border-slate-300'}`}>
                            {currentVals.includes(opt) && <div className="w-2 h-2 bg-white rounded-sm" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 p-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex gap-3">
          {step > 0 && (
            <button onClick={prev} className="flex items-center gap-2 px-5 py-3.5 rounded-2xl font-black text-sm transition-all" style={{ background: '#f1f5f9', color: '#64748b' }}>
              <ArrowLeft className="w-4 h-4" /> Lùi
            </button>
          )}
          {step < total - 1 ? (
            <button onClick={next} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white transition-all hover:opacity-90 active:scale-95" style={{ background: '#0f172a' }}>
              Tiếp theo <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#BE1E2E,#a01927)', boxShadow: '0 4px 20px rgba(190,30,46,0.35)' }}>
              {submitting
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang nộp...</>
                : <><Send className="w-4 h-4" /> Nộp bài khảo sát</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
