// @ts-nocheck
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Send, CheckCircle2, AlertCircle, GraduationCap, Save, Check } from 'lucide-react'
import Link from 'next/link'

interface Q { 
  id: string; 
  questionText: string; 
  questionType: string; 
  ratingMin: number; 
  ratingMax: number; 
  options: string | null; 
  isRequired: boolean; 
  weight: number 
}

interface Props { 
  formId: string; 
  periodName: string; 
  studentName: string; 
  className: string; 
  questions: Q[];
  initialAnswers?: Record<string, any>;
}

export default function HsFormClient({ 
  formId, 
  periodName, 
  studentName, 
  className, 
  questions,
  initialAnswers = {}
}: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  const SZ = 5
  const total = Math.max(1, Math.ceil(questions.length / SZ))
  const stepQs = questions.slice(step * SZ, (step + 1) * SZ)
  const progress = Math.min(100, Math.round(((step * SZ + stepQs.length) / Math.max(1, questions.length)) * 100))
  
  const ans = (id: string, v: any) => {
    setAnswers(p => ({ ...p, [id]: v }))
    setErr('')
  }

  const validate = (qs: Q[]) => {
    for (const q of qs) {
      if (q.isRequired) {
        const value = answers[q.id]
        if (value === undefined || value === "" || value === null) return q
        
        const type = q.questionType?.toUpperCase() || ''
        if (["MC_GRID", "CB_GRID", "GRID"].includes(type)) {
          if (typeof value !== "object" || !value) return q
          const hasSelection = Object.values(value).some(v => {
            if (v === undefined || v === null || v === "") return false
            if (Array.isArray(v) && v.length === 0) return false
            return true
          })
          if (!hasSelection) return q
        } else if (["CHECKBOX", "MULTI_SELECT"].includes(type)) {
          if (!Array.isArray(value) || value.length === 0) return q
        }
      }
    }
    return null
  }

  const next = () => {
    const m = validate(stepQs)
    if (m) { 
      setErr('Vui lòng hoàn thành câu hỏi: ' + (m.questionText.length > 60 ? m.questionText.substring(0, 60) + '...' : m.questionText))
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      return 
    }
    setErr('')
    setStep(s => s + 1)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const prev = () => { 
    setErr('')
    setStep(s => s - 1)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) 
  }

  const saveDraft = async () => {
    setSavingDraft(true)
    setErr('')
    setSaveSuccessMsg('')
    try {
      const res = await fetch('/api/hocsinh/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId, answers })
      })
      const d = await res.json()
      if (!res.ok) {
        setErr(d.error || 'Không thể lưu tạm phiếu khảo sát')
      } else {
        setSaveSuccessMsg('Đã lưu dữ liệu thành công!')
        setTimeout(() => setSaveSuccessMsg(''), 3000)
      }
    } catch (e: any) {
      setErr('Lỗi kết nối khi lưu: ' + (e?.message || ''))
    } finally {
      setSavingDraft(false)
    }
  }

  const submit = async () => {
    const m = validate(questions)
    if (m) {
      const qIndex = questions.findIndex(x => x.id === m.id)
      if (qIndex >= 0) {
        setStep(Math.floor(qIndex / SZ))
      }
      setErr('Vui lòng hoàn thành câu hỏi: ' + (m.questionText.length > 80 ? m.questionText.substring(0, 80) + '...' : m.questionText))
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitting(true)
    setErr('')
    try {
      const res = await fetch('/api/hocsinh/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId, answers })
      })
      const d = await res.json()
      if (!res.ok) { 
        setErr(d.error || 'Lỗi gửi bài khảo sát')
        setSubmitting(false)
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
        return 
      }
      setDone(true)
      setTimeout(() => router.push('/hocsinh/hs-khaosat/danh-sach'), 2500)
    } catch (e: any) {
      setErr('Lỗi kết nối mạng: ' + (e?.message || ''))
      setSubmitting(false)
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f0fdf4]">
      <div className="bg-white rounded-[3rem] p-12 max-w-sm w-full text-center shadow-2xl border border-emerald-100 animate-in zoom-in-95">
        <div className="w-24 h-24 flex items-center justify-center mx-auto mb-8 bg-emerald-50 rounded-full">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-4">Hoàn tất!</h2>
        <p className="text-slate-500 font-medium mb-8 leading-relaxed text-sm">
          Cảm ơn bạn đã hoàn thành khảo sát. Ý kiến của bạn rất quan trọng với Skyline.
        </p>
        <div className="flex items-center justify-center gap-3 text-emerald-600 font-bold text-xs">
          <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          Đang chuyển hướng...
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen font-outfit" style={{ background: '#f8fafc' }}>
      {/* Top Header */}
      <div className="text-white sticky top-0 z-50 shadow-xl" style={{ background: 'linear-gradient(135deg,#0284c7,#8b0000)' }}>
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
          <p className="text-white/80 text-xs mt-1 font-bold">{studentName}</p>
          <div className="mt-5 rounded-full overflow-hidden bg-white/20" style={{ height: '8px' }}>
            <div className="h-full rounded-full transition-all duration-1000 ease-out bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ width: progress + '%' }} />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-white/70 font-black uppercase tracking-wider">
            <span>Bước {step + 1} / {total}</span>
            <span>{progress}% Hoàn thành</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 pb-48">
        {/* Error Notification */}
        {err && (
          <div className="mb-6 p-4.5 flex items-start gap-3 bg-rose-50 border-2 border-rose-200 text-rose-800 rounded-2xl animate-in slide-in-from-top-4 shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="text-sm font-black text-rose-900">Thông báo</p>
              <p className="text-xs font-bold text-rose-700 mt-0.5">{err}</p>
            </div>
          </div>
        )}

        {/* Success Draft Saved Notification */}
        {saveSuccessMsg && (
          <div className="mb-6 p-4 flex items-center gap-3 bg-emerald-50 border-2 border-emerald-200 text-emerald-800 rounded-2xl animate-in slide-in-from-top-4 shadow-sm">
            <Check className="w-5 h-5 shrink-0 text-emerald-600" />
            <p className="text-xs font-bold text-emerald-800">{saveSuccessMsg}</p>
          </div>
        )}
        
        {/* Questions List */}
        <div className="space-y-8">
          {stepQs.map((q, i) => {
            const n = step * SZ + i + 1
            const type = q.questionType?.trim()?.toUpperCase() || ''
            const value = answers[q.id]
            const answered = (() => {
              if (value === undefined || value === '' || value === null) return false
              if (['MC_GRID', 'CB_GRID', 'GRID'].includes(type)) {
                return typeof value === 'object' && Object.values(value).some(v => v !== undefined && v !== null && v !== '' && (!Array.isArray(v) || v.length > 0))
              }
              if (['CHECKBOX', 'MULTI_SELECT'].includes(type)) {
                return Array.isArray(value) && value.length > 0
              }
              return true
            })()
            
            return (
              <div 
                key={q.id} 
                className="bg-white rounded-[2rem] border-2 p-6 sm:p-8 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60"
                style={{ borderColor: answered ? '#a7f3d0' : '#e2e8f0' }}
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 transition-all duration-300 shadow-sm ${answered ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {answered ? <CheckCircle2 className="w-5 h-5" /> : n}
                  </div>
                  <div className="pt-0.5 flex-1">
                    <p className="font-black text-slate-800 text-base leading-snug">
                      {q.questionText} {q.isRequired && <span className="text-rose-500 ml-1">*</span>}
                    </p>
                    <span className="inline-block text-[9px] text-slate-400 font-mono mt-1 uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                      Loại: {type}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  {/* Rating / NPS / Likert */}
                  {['RATING', 'NPS', 'LIKERT', 'SATISFACTION', 'SCALE_0_4'].includes(type) && (
                    <div className="space-y-4">
                      <div className="flex gap-2.5 flex-wrap justify-center sm:justify-start">
                        {Array.from({ length: (q.ratingMax || 10) - (q.ratingMin || 0) + 1 }, (_, k) => k + (q.ratingMin || 0)).map(v => (
                          <button 
                            key={v} 
                            type="button"
                            onClick={() => ans(q.id, v)}
                            className="w-12 h-12 rounded-2xl font-black text-base border-2 transition-all hover:scale-105 active:scale-95 flex items-center justify-center shadow-sm"
                            style={{
                              background: value === v ? '#0284c7' : '#f8fafc',
                              color: value === v ? 'white' : '#475569',
                              borderColor: value === v ? '#0284c7' : '#e2e8f0',
                              boxShadow: value === v ? '0 6px 16px rgba(2,132,199,0.3)' : ''
                            }}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between px-2 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        <span>Thấp nhất ({q.ratingMin || 0})</span>
                        <span>Cao nhất ({q.ratingMax || 10})</span>
                      </div>
                    </div>
                  )}

                  {/* Text / Comment / Essay */}
                  {['TEXT', 'OPEN_ENDED', 'COMMENT', 'ESSAY'].includes(type) && (
                    <textarea 
                      value={value || ''} 
                      onChange={e => ans(q.id, e.target.value)} 
                      rows={4}
                      placeholder="Nhập câu trả lời của bạn tại đây..."
                      className="w-full rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none resize-none transition-all border-2 border-slate-200 focus:border-sky-500 focus:bg-white shadow-inner bg-slate-50"
                    />
                  )}

                  {/* Single Choice / Radio / Dropdown */}
                  {['CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN', 'RADIO', 'SINGLE_CHOICE'].includes(type) && (() => {
                    let opts: any[] = []
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
                        const fixed = q.options?.replace(/'/g, '"') || ""
                        const parsed = JSON.parse(fixed)
                        if (Array.isArray(parsed)) opts = parsed
                        else if (parsed && typeof parsed === 'object') opts = parsed.choices || []
                      } catch {
                        opts = q.options ? String(q.options).split(',').map(s => s.trim()) : [] 
                      }
                    }
                    
                    return (
                      <div className="grid grid-cols-1 gap-3">
                        {opts.map((opt: any) => {
                          const isSel = value === opt
                          return (
                            <button 
                              key={opt} 
                              type="button"
                              onClick={() => ans(q.id, opt)}
                              className="w-full px-5 py-3.5 rounded-2xl border-2 text-left text-sm font-bold transition-all flex items-center justify-between group"
                              style={{
                                background: isSel ? '#f0f9ff' : '#f8fafc',
                                borderColor: isSel ? '#0284c7' : '#e2e8f0',
                                color: isSel ? '#0369a1' : '#334155'
                              }}
                            >
                              <span>{opt}</span>
                              <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${isSel ? 'border-sky-600 bg-sky-600' : 'border-slate-300 bg-white group-hover:border-sky-400'}`}>
                                {isSel && <div className="w-2 h-2 bg-white rounded-full" />}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )
                  })()}

                  {/* Checkbox / Multi-Select */}
                  {['CHECKBOX', 'MULTI_SELECT'].includes(type) && (() => {
                    let opts: any[] = []
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
                        const fixed = q.options?.replace(/'/g, '"') || ""
                        const parsed = JSON.parse(fixed)
                        if (Array.isArray(parsed)) opts = parsed
                        else if (parsed && typeof parsed === 'object') opts = parsed.choices || []
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
                        {opts.map((opt) => {
                          const isSel = currentVals.includes(opt)
                          return (
                            <button 
                              key={opt} 
                              type="button"
                              onClick={() => toggle(opt)}
                              className="w-full px-5 py-3.5 rounded-2xl border-2 text-left text-sm font-bold transition-all flex items-center justify-between group"
                              style={{
                                background: isSel ? '#f0f9ff' : '#f8fafc',
                                borderColor: isSel ? '#0284c7' : '#e2e8f0',
                                color: isSel ? '#0369a1' : '#334155'
                              }}
                            >
                              <span>{opt}</span>
                              <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${isSel ? 'border-sky-600 bg-sky-600' : 'border-slate-300 bg-white group-hover:border-sky-400'}`}>
                                {isSel && <div className="w-2.5 h-2.5 bg-white rounded-[2px]" />}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )
                  })()}

                  {/* Matrix / Grid (MC_GRID, CB_GRID, GRID) */}
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
                        const fixed = q.options?.replace(/'/g, '"') || ""
                        const parsed = JSON.parse(fixed)
                        if (parsed && typeof parsed === 'object') {
                          gridOpts.rows = parsed.rows || []
                          gridOpts.columns = parsed.columns || []
                        }
                      } catch {}
                    }
                    
                    const isCheckGrid = type === 'CB_GRID'
                    const currentGrid = value || {}
                    
                    return (
                      <div className="overflow-x-auto -mx-2 sm:-mx-4 px-2 sm:px-4 rounded-xl border border-slate-200">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="p-3 text-left text-[11px] font-black text-slate-600 uppercase tracking-wider border-b border-slate-200">
                                Tiêu chí / Môn học
                              </th>
                              {gridOpts.columns.map((col, ci) => (
                                <th key={ci} className="p-3 text-center text-[11px] font-black text-slate-600 uppercase tracking-wider min-w-[80px] border-b border-l border-slate-200">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {gridOpts.rows.map((row, ri) => (
                              <tr key={ri} className="hover:bg-sky-50/40 transition-colors">
                                <td className="p-3 text-xs sm:text-sm font-bold text-slate-800 leading-snug pr-3">
                                  {row}
                                </td>
                                {gridOpts.columns.map((_, ci) => {
                                  const rowVal = currentGrid[ri]
                                  const isSelected = isCheckGrid 
                                    ? (Array.isArray(rowVal) && rowVal.includes(ci))
                                    : rowVal === ci
                                  
                                  return (
                                    <td key={ci} className="p-2 text-center border-l border-slate-100">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextGrid = { ...currentGrid }
                                          if (isCheckGrid) {
                                            const prev = Array.isArray(nextGrid[ri]) ? nextGrid[ri] : []
                                            nextGrid[ri] = prev.includes(ci) ? prev.filter(x => x !== ci) : [...prev, ci]
                                          } else {
                                            // Toggle selection
                                            nextGrid[ri] = nextGrid[ri] === ci ? undefined : ci
                                          }
                                          ans(q.id, nextGrid)
                                        }}
                                        className={`w-7 h-7 sm:w-8 sm:h-8 mx-auto flex items-center justify-center border-2 transition-all hover:scale-110 active:scale-90 ${isSelected ? 'border-sky-600 bg-sky-600 shadow-md shadow-sky-200' : 'border-slate-300 bg-white hover:border-sky-400'} ${isCheckGrid ? 'rounded-lg' : 'rounded-full'}`}
                                      >
                                        {isSelected && <div className={`bg-white ${isCheckGrid ? 'w-2.5 h-2.5 rounded-[2px]' : 'w-2.5 h-2.5 rounded-full'}`} />}
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

                  {!['RATING', 'NPS', 'LIKERT', 'SATISFACTION', 'SCALE_0_4', 'TEXT', 'OPEN_ENDED', 'COMMENT', 'ESSAY', 'CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN', 'RADIO', 'SINGLE_CHOICE', 'CHECKBOX', 'MULTI_SELECT', 'MC_GRID', 'CB_GRID', 'GRID'].includes(type) && (
                    <div className="p-4 text-xs font-bold text-slate-400 text-center bg-slate-50 rounded-xl">
                      Giao diện cho loại câu hỏi "{type}" đang được cập nhật...
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-200 p-4 sm:p-5 z-40 shadow-[0_-15px_40px_rgba(0,0,0,0.08)]">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {step > 0 && (
            <button 
              type="button" 
              onClick={prev} 
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" /> Lùi
            </button>
          )}

          <button
            type="button"
            onClick={saveDraft}
            disabled={savingDraft || submitting}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-black text-xs sm:text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all active:scale-95 disabled:opacity-50"
            title="Lưu tiến độ làm bài"
          >
            {savingDraft ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4 text-slate-600" />
            )}
            <span>{savingDraft ? 'Đang lưu...' : 'Lưu tạm'}</span>
          </button>

          {step < total - 1 ? (
            <button 
              type="button" 
              onClick={next} 
              className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-2xl font-black text-xs sm:text-sm text-white transition-all hover:opacity-95 active:scale-95 shadow-xl shadow-slate-200" 
              style={{ background: '#0f172a' }}
            >
              Tiếp theo <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              type="button" 
              onClick={submit} 
              disabled={submitting || savingDraft} 
              className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-2xl font-black text-xs sm:text-sm text-white transition-all hover:opacity-95 active:scale-95 disabled:opacity-50 shadow-xl shadow-sky-500/20 cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#0284c7,#0369a1)' }}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang gửi bài...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> <span>Nộp bài khảo sát</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
