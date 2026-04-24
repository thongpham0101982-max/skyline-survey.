'use client'
import { useState, useMemo, useEffect } from 'react'
import { BarChart3, TrendingUp, MessageSquare, Users, Star, CheckCircle2, ChevronRight, Quote, Search, Filter } from 'lucide-react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'

interface FormResponse {
  questionId: string
  questionText: string
  questionType: string
  numericScore: number | null
  textAnswer: string | null
  choiceAnswer: string | null
}

interface Form {
  id: string
  studentId: string
  studentName: string
  className: string
  campusName: string
  responses: FormResponse[]
}

interface Question {
  id: string
  questionText: string
  questionType: string
  ratingScaleMin: number
  ratingScaleMax: number
  options: string | null
}

interface Props {
  periodId: string
  periodName: string
  periodCode: string
  questions: Question[]
  forms: Form[]
  totalForms: number
}

const COLORS = ['#BE1E2E', '#ef4444', '#fbbf24', '#f59e0b', '#3b82f6', '#10b981', '#059669', '#6366f1']

export function ResultsDashboard({ periodId, periodName, periodCode, questions, forms, totalForms }: Props) {
  const [compareBy, setCompareBy] = useState<'CAMPUS' | 'CLASS'>('CAMPUS')
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL')

  const getGridInfo = (qId: string) => {
    const q = questions.find(x => x.id === qId)
    if (!q || !q.options) return { rows: [], cols: [] }
    const parts = q.options.split('|')
    const rows = parts[0].split(',').map(s => s.trim())
    const cols = parts.length > 1 ? parts[1].split(',').map(s => s.trim()) : []
    return { rows, cols }
  }

  const getChoiceLabel = (qId: string, val: string) => {
    const q = questions.find(x => x.id === qId)
    if (!q || !q.options) return val
    if (q.options.includes('|')) {
      const cols = q.options.split('|')[1].split(',').map(s => s.trim())
      const idx = parseInt(val)
      if (!isNaN(idx) && cols[idx]) return cols[idx]
      return cols.find(c => c.startsWith(val)) || val
    } else {
      const opts = q.options.split(',').map(s => s.trim())
      const idx = parseInt(val)
      return opts[idx] || val
    }
  }

  const filteredForms = useMemo(() => {
    if (selectedGroup === 'ALL') return forms
    return forms.filter(f => (compareBy === 'CAMPUS' ? f.campusName : f.className) === selectedGroup)
  }, [forms, compareBy, selectedGroup])

  const stats = useMemo(() => {
    let npsT = 0, npsP = 0, npsD = 0, sum = 0, count = 0
    filteredForms.forEach(f => {
      f.responses.forEach(r => {
        if (r.numericScore !== null) {
          sum += r.numericScore; count++
          if (r.questionType?.toUpperCase() === 'NPS') {
            npsT++; if (r.numericScore >= 9) npsP++; else if (r.numericScore < 7) npsD++
          }
        }
      })
    })
    return { 
      nps: npsT > 0 ? Math.round(((npsP - npsD) / npsT) * 100) : 0, 
      avg: count > 0 ? (sum / count).toFixed(2) : '0.00' 
    }
  }, [filteredForms])

  const groups = useMemo(() => {
    const set = new Set<string>()
    forms.forEach(f => set.add(compareBy === 'CAMPUS' ? f.campusName : f.className))
    return Array.from(set).sort()
  }, [forms, compareBy])

  const questionAnalytics = useMemo(() => {
    return questions.map(q => {
      const isOpinion = q.questionType?.toUpperCase() === 'TEXT' || q.questionText.toLowerCase().includes('ý kiến')
      let qSum = 0, qCount = 0
      const dist: Record<string, number> = {}
      const opinions: any[] = []
      const gridDist: Record<string, Record<string, number>> = {}

      filteredForms.forEach(f => {
        const r = f.responses.find(x => x.questionId === q.id)
        if (!r) return
        if (r.numericScore !== null) {
          qSum += r.numericScore; qCount++
          dist[r.numericScore] = (dist[r.numericScore] || 0) + 1
        } else if (r.choiceAnswer?.startsWith('{') || r.textAnswer?.startsWith('{')) {
          try {
            const p = JSON.parse(r.choiceAnswer || r.textAnswer || '{}')
            Object.entries(p).forEach(([rk, v]: [string, any]) => {
              if (rk === 'rows') return
              if (!gridDist[rk]) gridDist[rk] = {}
              gridDist[rk][v] = (gridDist[rk][v] || 0) + 1
              dist[v] = (dist[v] || 0) + 1
              qSum += (Number(v) || 0); qCount++
            })
          } catch(e){}
        } else if (r.textAnswer || r.choiceAnswer) {
          const v = r.choiceAnswer || r.textAnswer || ''
          dist[v] = (dist[v] || 0) + 1; qCount++
          if (r.textAnswer) opinions.push({ text: r.textAnswer, class: f.className, campus: f.campusName })
        }
      })

      const chartData = Object.entries(dist).map(([n, v]) => ({ 
        name: getChoiceLabel(q.id, n), 
        val: v, 
        pct: Math.round((v / (qCount || 1)) * 100) 
      })).sort((a,b) => a.name.localeCompare(b.name))

      return { ...q, isOpinion, avg: qCount > 0 ? (qSum / qCount).toFixed(2) : '0.00', chartData, opinions, gridDist }
    })
  }, [questions, filteredForms])

  return (
    <div className="bg-[#fafafa] min-h-screen p-6 lg:p-12 font-sans text-slate-900">
      <div className="max-w-[1400px] mx-auto space-y-12">
        
        {/* Slim Header */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-8 border-b border-slate-100 pb-12">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase">{periodName}</h1>
              <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] mt-1 uppercase">Skyline Premium Analytics • {periodCode}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
             <div className="flex p-1 bg-slate-50 rounded-xl">
               <button onClick={() => { setCompareBy('CAMPUS'); setSelectedGroup('ALL'); }} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${compareBy === 'CAMPUS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>CƠ SỞ</button>
               <button onClick={() => { setCompareBy('CLASS'); setSelectedGroup('ALL'); }} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${compareBy === 'CLASS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>LỚP</button>
             </div>
             <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="bg-transparent px-4 py-2 text-[10px] font-black uppercase outline-none border-l border-slate-100 min-w-[150px]">
                <option value="ALL">Tất cả {compareBy === 'CAMPUS' ? 'Cơ sở' : 'Lớp'}</option>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
             </select>
             <Link href="/admin/surveys" className="px-5 py-2.5 bg-[#BE1E2E] text-white text-[10px] font-black rounded-xl hover:bg-red-700 transition-all uppercase">Thoát</Link>
          </div>
        </div>

        {/* Minimalist KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
           {[
             { label: 'Chỉ số NPS', val: stats.nps + '%', icon: <TrendingUp className="w-4 h-4 text-emerald-500" /> },
             { label: 'Điểm trung bình', val: stats.avg, icon: <Star className="w-4 h-4 text-amber-500" /> },
             { label: 'Ý kiến phản hồi', val: questionAnalytics.reduce((a, b) => a + b.opinions.length, 0), icon: <MessageSquare className="w-4 h-4 text-blue-500" /> },
             { label: 'Tổng phiếu nộp', val: filteredForms.length, icon: <Users className="w-4 h-4 text-slate-400" /> }
           ].map((k, i) => (
             <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm group hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{k.label}</span>
                  {k.icon}
                </div>
                <h3 className="text-4xl font-black text-slate-900">{k.val}</h3>
             </div>
           ))}
        </div>

        {/* Question Cards */}
        <div className="grid grid-cols-1 gap-12 pb-20">
           {questionAnalytics.map((q, i) => (
             <div key={q.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-10 border-b border-slate-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                   <div className="max-w-2xl">
                      <div className="flex items-center gap-3 mb-3">
                         <span className="w-8 h-8 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center">Q{i+1}</span>
                         <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Tiêu chí khảo sát</span>
                      </div>
                      <h4 className="text-xl font-black text-slate-900 leading-tight">{q.questionText}</h4>
                   </div>
                   {!q.isOpinion && (
                     <div className="bg-slate-50 px-8 py-4 rounded-2xl border border-slate-100 text-center shrink-0">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Trung bình</p>
                        <p className="text-2xl font-black text-slate-900">{q.avg}</p>
                     </div>
                   )}
                </div>

                <div className="p-10 bg-[#fdfdfd]">
                   {q.isOpinion ? (
                      /* Opinion Feed Layout - NO CHARTS */
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {q.opinions.length > 0 ? q.opinions.map((op, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative group hover:shadow-md transition-all">
                               <Quote className="w-8 h-8 text-slate-50 absolute top-4 right-4 group-hover:text-red-50" />
                               <p className="text-sm text-slate-600 leading-relaxed italic relative z-10 mb-4">"{op.text}"</p>
                               <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-[9px] font-black text-slate-400 uppercase">
                                  <span>{op.campus}</span>
                                  <span className="bg-slate-50 px-2 py-0.5 rounded-lg">{op.class}</span>
                               </div>
                            </div>
                         )) : (
                            <div className="col-span-full py-12 text-center text-slate-300 text-xs font-bold uppercase tracking-widest italic">Chưa có ý kiến phản hồi</div>
                         )}
                      </div>
                   ) : Object.keys(q.gridDist).length > 0 ? (
                      /* Slim Grid Analysis */
                      <div className="space-y-4">
                         {Object.entries(q.gridDist).map(([rk, dist], idx) => {
                            const info = getGridInfo(q.id)
                            const label = info.rows[parseInt(rk)] || `Tiêu chí ${parseInt(rk)+1}`
                            const totalRow = Object.values(dist).reduce((a, b) => a + b, 0) || 1
                            return (
                               <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-slate-300 transition-all">
                                  <div className="flex items-center justify-between mb-4">
                                     <p className="text-[11px] font-black text-slate-900 uppercase flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#BE1E2E]" /> {label}
                                     </p>
                                  </div>
                                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                     {info.cols.map((col, cIdx) => {
                                        const count = dist[cIdx.toString()] || dist[col] || 0
                                        const pct = Math.round((count / totalRow) * 100)
                                        return (
                                           <div key={cIdx} className="space-y-2">
                                              <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                                                 <span className="truncate pr-2">{col}</span>
                                                 <span>{pct}%</span>
                                              </div>
                                              <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                                 <div className={`h-full transition-all duration-1000 ${cIdx === 0 ? 'bg-emerald-500' : cIdx === 1 ? 'bg-blue-400' : 'bg-slate-200'}`} style={{ width: `${pct}%` }} />
                                              </div>
                                           </div>
                                        )
                                     })}
                                  </div>
                               </div>
                            )
                         })}
                      </div>
                   ) : (
                      /* Premium Slim Bar Chart */
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                         <div className="lg:col-span-2 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={q.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold', fill: '#94a3b8'}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} />
                                  <Tooltip cursor={{fill: '#fcfcfc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)'}} />
                                  <Bar dataKey="pct" radius={[4, 4, 0, 0]} barSize={32}>
                                     {q.chartData.map((e, idx) => (
                                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                     ))}
                                  </Bar>
                               </BarChart>
                            </ResponsiveContainer>
                         </div>
                         <div className="grid grid-cols-1 gap-2">
                            {q.chartData.map((item, idx) => (
                               <div key={idx} className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-50 group hover:border-slate-200 transition-all">
                                  <div className="flex items-center gap-3">
                                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                     <span className="text-[10px] font-bold text-slate-500 uppercase">{item.name}</span>
                                  </div>
                                  <span className="text-xs font-black text-slate-900">{item.pct}%</span>
                               </div>
                            ))}
                         </div>
                      </div>
                   )}
                </div>
             </div>
           ))}
        </div>
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  )
}
