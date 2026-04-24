'use client'
import { useState, useMemo, useEffect } from 'react'
import { BarChart3, TrendingUp, MessageSquare, Users, Star, Quote, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

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

const COLORS = ['#10b981', '#3b82f6', '#fbbf24', '#BE1E2E', '#8b5cf6', '#ec4899', '#f43f5e']

export function ResultsDashboard({ periodId, periodName, periodCode, questions, forms, totalForms }: Props) {
  useEffect(() => {
    console.log("--- DASHBOARD RELOADED v4.6 (Detailed Data) ---");
  }, []);

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
    try {
      if (q.options.includes('|')) {
        const cols = q.options.split('|')[1].split(',').map(s => s.trim())
        const idx = parseInt(val)
        return (!isNaN(idx) && cols[idx]) ? cols[idx] : val
      } else if (q.options.startsWith('[')) {
        const opts = JSON.parse(q.options)
        const idx = parseInt(val)
        return (!isNaN(idx) && opts[idx]) ? opts[idx] : val
      }
    } catch(e) {}
    return val
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
      const type = q.questionType?.toUpperCase() || ''
      const isGrid = type.includes('GRID') || (q.options?.includes('|'))
      const isOpinion = type === 'TEXT' || q.questionText.toLowerCase().includes('ý kiến')
      
      let qSum = 0, qCount = 0
      const dist: Record<string, number> = {}
      const gridDist: Record<string, Record<string, number>> = {}
      const opinions: any[] = []

      filteredForms.forEach(f => {
        const r = f.responses.find(x => x.questionId === q.id)
        if (!r) return

        if (r.numericScore !== null) {
          const val = r.numericScore
          qSum += val; qCount++
          dist[val] = (dist[val] || 0) + 1
        } else if (r.choiceAnswer?.startsWith('{') || r.textAnswer?.startsWith('{')) {
          try {
            const p = JSON.parse(r.choiceAnswer || r.textAnswer || '{}')
            Object.entries(p).forEach(([rk, v]: [string, any]) => {
              if (rk === 'rows' || rk === 'columns') return
              if (!gridDist[rk]) gridDist[rk] = {}
              gridDist[rk][v] = (gridDist[rk][v] || 0) + 1
              dist[v] = (dist[v] || 0) + 1
              const numVal = parseInt(v); if (!isNaN(numVal)) { qSum += numVal; qCount++ }
            })
          } catch(e){}
        } else if (r.textAnswer || r.choiceAnswer) {
          const v = r.choiceAnswer || r.textAnswer || ''
          if (!v.includes('{')) {
            dist[v] = (dist[v] || 0) + 1; qCount++
            if (isOpinion && r.textAnswer) opinions.push({ text: r.textAnswer, class: f.className, campus: f.campusName })
          }
        }
      })

      const chartData = Object.entries(dist).map(([n, v]) => ({ 
        name: getChoiceLabel(q.id, n), 
        value: v, 
        percentage: Math.round((v / (Object.values(dist).reduce((a,b)=>a+b,0) || 1)) * 100) 
      })).sort((a,b) => b.name.localeCompare(a.name))

      return { ...q, isOpinion, isGrid, avg: qSum > 0 ? (qSum / qCount).toFixed(2) : '0.00', chartData, opinions, gridDist }
    })
  }, [questions, filteredForms])

  return (
    <div className="bg-[#f8fafc] min-h-screen p-6 lg:p-12 font-sans text-slate-800">
      <div className="max-w-[1400px] mx-auto space-y-12">
        
        {/* Modern Header */}
        <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 gap-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 bg-[#BE1E2E] text-white px-6 py-1 text-[8px] font-black uppercase tracking-widest rotate-45 translate-x-10 translate-y-4 shadow-lg animate-pulse">
              Version 4.6 FULL DATA
           </div>
           
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-[#BE1E2E] rounded-2xl flex items-center justify-center text-white shadow-2xl">
                 <BarChart3 className="w-8 h-8" />
              </div>
              <div>
                 <h1 className="text-3xl font-black text-slate-900 leading-tight uppercase">{periodName}</h1>
                 <p className="text-[10px] font-black text-slate-400 mt-1 tracking-widest uppercase">SKYLINE PREMIUM ANALYTICS • {periodCode}</p>
              </div>
           </div>

           <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
              <div className="flex p-1 bg-white rounded-xl shadow-sm border border-slate-100">
                <button onClick={() => { setCompareBy('CAMPUS'); setSelectedGroup('ALL'); }} className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ${compareBy === 'CAMPUS' ? 'bg-[#BE1E2E] text-white shadow-md' : 'text-slate-400'}`}>CƠ SỞ</button>
                <button onClick={() => { setCompareBy('CLASS'); setSelectedGroup('ALL'); }} className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ${compareBy === 'CLASS' ? 'bg-[#BE1E2E] text-white shadow-md' : 'text-slate-400'}`}>LỚP</button>
              </div>
              <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="bg-transparent px-4 py-2 text-[10px] font-black uppercase outline-none border-l border-slate-200 min-w-[150px]">
                <option value="ALL">Tất cả {compareBy === 'CAMPUS' ? 'Cơ sở' : 'Lớp'}</option>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <Link href="/admin/surveys" className="px-6 py-3 bg-slate-900 text-white text-[10px] font-black rounded-xl uppercase shadow-xl hover:bg-black transition-all">Thoát</Link>
           </div>
        </div>

        {/* Indicators */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
           {[
             { label: 'NPS Score', val: stats.nps + '%', color: 'text-[#BE1E2E]' },
             { label: 'Average', val: stats.avg, color: 'text-slate-800' },
             { label: 'Feedbacks', val: questionAnalytics.reduce((a, b) => acc + b.opinions.length, 0), color: 'text-slate-800' },
             { label: 'Submitted', val: filteredForms.length, color: 'text-slate-800' }
           ].map((k, i) => (
             <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm text-center hover:shadow-md transition-all">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{k.label}</p>
                <h3 className={`text-5xl font-black ${k.color}`}>{k.val}</h3>
             </div>
           ))}
        </div>

        {/* Detailed Section */}
        <div className="grid grid-cols-1 gap-10 pb-20">
           {questionAnalytics.map((q, i) => (
             <div key={q.id} className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full group hover:shadow-2xl transition-all duration-700">
                <div className="p-10 pb-6 border-b border-slate-50">
                   <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                         <span className="w-8 h-8 rounded-lg bg-slate-900 text-white text-[10px] font-black flex items-center justify-center">Q{i+1}</span>
                         <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Tiêu chí khảo sát</span>
                      </div>
                      {!q.isOpinion && (
                        <div className="bg-slate-50 px-5 py-2.5 rounded-xl text-right border border-slate-100 shadow-inner">
                           <p className="text-[8px] font-black text-[#BE1E2E] uppercase mb-1">Điểm trung bình</p>
                           <p className="text-xl font-black text-slate-900">{q.avg}</p>
                        </div>
                      )}
                   </div>
                   <h4 className="text-xl font-black text-slate-800 leading-snug">{q.questionText}</h4>
                </div>

                <div className="p-10">
                   {q.isOpinion ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {q.opinions.map((op, idx) => (
                            <div key={idx} className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 hover:bg-white transition-all">
                               <p className="text-sm text-slate-600 leading-relaxed italic">"{op.text}"</p>
                               <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
                                  <span className="text-[8px] font-black text-slate-500 uppercase">{op.campus}</span>
                                  <span className="bg-white px-2 py-0.5 rounded-lg text-[8px] font-black text-[#BE1E2E] shadow-sm uppercase">{op.class}</span>
                               </div>
                            </div>
                         ))}
                      </div>
                   ) : q.isGrid ? (
                      <div className="space-y-12">
                         {/* TOP DOUGHNUT CHART */}
                         <div className="flex flex-col lg:flex-row items-center gap-12 bg-slate-50/30 p-8 rounded-[2.5rem] border border-slate-50">
                            <div className="w-full lg:w-1/2 h-[350px] relative">
                               <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                     <Pie data={q.chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={4} dataKey="value">
                                        {q.chartData.map((e, idx) => (
                                           <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                        ))}
                                     </Pie>
                                     <Tooltip contentStyle={{borderRadius: '20px', border: 'none', shadow: '0 20px 40px rgba(0,0,0,0.1)'}} />
                                  </PieChart>
                               </ResponsiveContainer>
                               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                                  <p className="text-[10px] font-black text-slate-400 uppercase">Tổng phản hồi</p>
                                  <p className="text-4xl font-black text-slate-900">{Object.values(q.chartData).reduce((a,b)=>a+b.value, 0)}</p>
                               </div>
                            </div>
                            <div className="w-full lg:w-1/2 flex flex-col gap-4">
                               <p className="text-xs font-black text-slate-900 uppercase border-b border-slate-200 pb-3">Phân bổ tổng quát</p>
                               {q.chartData.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between">
                                     <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                        <span className="text-[11px] font-bold text-slate-600">{item.name}</span>
                                     </div>
                                     <div className="flex items-center gap-3">
                                        <span className="text-xs font-black text-slate-900">{item.value}</span>
                                        <span className="text-[10px] font-bold text-slate-300">({item.percentage}%)</span>
                                     </div>
                                  </div>
                               ))}
                            </div>
                         </div>

                         {/* DETAILED ROW BREAKDOWN */}
                         <div className="space-y-6">
                            <div className="flex items-center gap-4">
                               <span className="text-[10px] font-black text-[#BE1E2E] uppercase tracking-widest">Chi tiết từng tiêu chí</span>
                               <div className="flex-1 h-[1px] bg-slate-100" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               {Object.entries(q.gridDist).map(([rk, dist], idx) => {
                                  const info = getGridInfo(q.id)
                                  const label = info.rows[parseInt(rk)] || `Tiêu chí ${parseInt(rk)+1}`
                                  const totalRow = Object.values(dist).reduce((a, b) => a + b, 0) || 1
                                  return (
                                     <div key={idx} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm group/row hover:border-[#BE1E2E]/20 transition-all">
                                        <p className="text-sm font-black text-slate-800 mb-6 uppercase tracking-tight flex items-center gap-2">
                                           <div className="w-1.5 h-1.5 rounded-full bg-[#BE1E2E]" /> {label}
                                        </p>
                                        <div className="space-y-4">
                                           {info.cols.map((col, cIdx) => {
                                              const count = dist[cIdx.toString()] || dist[col] || 0
                                              const pct = Math.round((count / totalRow) * 100)
                                              return (
                                                 <div key={cIdx} className="space-y-1.5">
                                                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                                                       <span>{col}</span>
                                                       <span className="text-slate-900">{pct}%</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                                       <div className={`h-full transition-all duration-1000 ${cIdx === 0 ? 'bg-emerald-500' : cIdx === 1 ? 'bg-blue-500' : 'bg-slate-200'}`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                 </div>
                                              )
                                           })}
                                        </div>
                                     </div>
                                  )
                               })}
                            </div>
                         </div>
                      </div>
                   ) : (
                      <div className="flex flex-col lg:flex-row items-center gap-12">
                         <div className="w-full lg:w-2/3 h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={q.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'black', fill: '#cbd5e1'}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#cbd5e1'}} />
                                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                                     {q.chartData.map((e, idx) => (
                                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                     ))}
                                  </Bar>
                               </BarChart>
                            </ResponsiveContainer>
                         </div>
                         <div className="w-full lg:w-1/3 grid grid-cols-1 gap-2">
                            {q.chartData.map((item, idx) => (
                               <div key={idx} className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">{item.name}</span>
                                  <span className="text-xs font-black text-slate-900">{item.percentage}%</span>
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
    </div>
  )
}
