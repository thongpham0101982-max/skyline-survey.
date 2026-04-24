'use client'
import { useState, useMemo, useEffect } from 'react'
import { BarChart3, TrendingUp, MessageSquare, Users, Star, Quote, Filter, Download, Calendar, ArrowUpRight, LayoutGrid, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area } from 'recharts'

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

const ANALYTICS_COLORS = {
  primary: '#BE1E2E',
  success: '#10b981',
  info: '#3b82f6',
  warning: '#f59e0b',
  slate: '#64748b',
  navy: '#0f172a'
}

const GRID_COLORS: Record<string, string> = {
  "Rất hài lòng": "#1e3a8a",
  "Hài lòng": "#10b981",
  "Không hài lòng": "#f59e0b",
  "Rất không hài lòng": "#BE1E2E",
  "default": "#94a3b8"
}

export function ResultsDashboard({ periodId, periodName, periodCode, questions, forms, totalForms }: Props) {
  useEffect(() => {
    console.log("--- PRO DATA ANALYTICS DASHBOARD v5.0 ---");
  }, []);

  const [compareBy, setCompareBy] = useState<'CAMPUS' | 'CLASS'>('CAMPUS')
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL')

  const getChoiceLabel = (qId: string, val: string) => {
    const q = questions.find(x => x.id === qId)
    if (!q || !q.options) return val
    try {
      if (q.options.includes('|')) {
        const cols = q.options.split('|')[1].split(',').map(s => s.trim())
        const idx = parseInt(val); return (!isNaN(idx) && cols[idx]) ? cols[idx] : val
      } else if (q.options.startsWith('[')) {
        const opts = JSON.parse(q.options)
        const idx = parseInt(val); return (!isNaN(idx) && opts[idx]) ? opts[idx] : val
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
    return { nps: npsT > 0 ? Math.round(((npsP - npsD) / npsT) * 100) : 0, avg: count > 0 ? (sum / count).toFixed(2) : '0.00' }
  }, [filteredForms])

  const groups = useMemo(() => {
    const set = new Set<string>(); forms.forEach(f => set.add(compareBy === 'CAMPUS' ? f.campusName : f.className))
    return Array.from(set).sort()
  }, [forms, compareBy])

  const questionAnalytics = useMemo(() => {
    return questions.map(q => {
      const type = q.questionType?.toUpperCase() || ''
      const isGrid = type.includes('GRID') || (q.options?.includes('|'))
      const isOpinion = type === 'TEXT' || q.questionText.toLowerCase().includes('ý kiến')
      let qSum = 0, qCount = 0
      const dist: Record<string, number> = {}
      const opinions: any[] = []

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
              if (rk === 'rows' || rk === 'columns') return
              dist[v] = (dist[v] || 0) + 1
              const nV = parseInt(v); if (!isNaN(nV)) { qSum += nV; qCount++ }
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

      const tC = Object.values(dist).reduce((a,b)=>a+b, 0) || 1
      const chartData = Object.entries(dist).map(([n, v]) => {
        const name = getChoiceLabel(q.id, n)
        let fill = ANALYTICS_COLORS.primary
        if (isGrid) {
          fill = GRID_COLORS["default"]
          if (name.includes("Rất hài lòng")) fill = GRID_COLORS["Rất hài lòng"]
          else if (name.includes("Rất không hài lòng")) fill = GRID_COLORS["Rất không hài lòng"]
          else if (name.includes("Hài lòng")) fill = GRID_COLORS["Hài lòng"]
          else if (name.includes("Không hài lòng")) fill = GRID_COLORS["Không hài lòng"]
        }
        return { name, value: v, percentage: Math.round((v / tC) * 100), fill }
      }).sort((a,b) => isGrid ? 0 : b.value - a.value)

      return { ...q, isOpinion, isGrid, avg: qCount > 0 ? (qSum / qCount).toFixed(2) : '0.00', chartData, opinions }
    })
  }, [questions, filteredForms])

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, percentage }: any) => {
    const RADIAN = Math.PI / 180; const r = outerRadius + 25;
    const x = cx + r * Math.cos(-midAngle * RADIAN); const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#94a3b8" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-bold">
        {`${value} (${percentage}%)`}
      </text>
    );
  };

  return (
    <div className="bg-[#0f172a] min-h-screen p-6 lg:p-10 font-sans text-slate-200">
      <div className="max-w-[1600px] mx-auto space-y-10">
        
        {/* Pro Data Toolbar */}
        <div className="flex flex-col lg:flex-row justify-between items-center bg-[#1e293b] p-6 rounded-[2rem] border border-slate-700/50 shadow-2xl gap-8 relative overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-r from-[#BE1E2E]/10 to-transparent opacity-50 pointer-events-none" />
           
           <div className="flex items-center gap-6 relative z-10">
              <div className="w-14 h-14 bg-[#BE1E2E] rounded-[1.2rem] flex items-center justify-center text-white shadow-2xl shadow-red-900/40">
                 <BarChart3 className="w-7 h-7" />
              </div>
              <div>
                 <h1 className="text-2xl font-black tracking-tight text-white uppercase">{periodName}</h1>
                 <div className="flex items-center gap-3 mt-1">
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase">PRO DATA v5.0</span>
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{periodCode}</span>
                 </div>
              </div>
           </div>

           <div className="flex flex-wrap items-center gap-4 relative z-10">
              <div className="flex bg-[#0f172a] rounded-xl border border-slate-700 p-1">
                 <button onClick={() => { setCompareBy('CAMPUS'); setSelectedGroup('ALL'); }} className={`px-5 py-2 rounded-lg text-[9px] font-black transition-all ${compareBy === 'CAMPUS' ? 'bg-[#BE1E2E] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>CƠ SỞ</button>
                 <button onClick={() => { setCompareBy('CLASS'); setSelectedGroup('ALL'); }} className={`px-5 py-2 rounded-lg text-[9px] font-black transition-all ${compareBy === 'CLASS' ? 'bg-[#BE1E2E] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>LỚP</button>
              </div>
              <div className="relative">
                 <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="bg-[#0f172a] text-slate-300 px-6 py-3 rounded-xl border border-slate-700 text-[10px] font-black uppercase outline-none focus:border-[#BE1E2E] appearance-none min-w-[200px]">
                    <option value="ALL">ALL {compareBy === 'CAMPUS' ? 'CAMPUSES' : 'CLASSES'}</option>
                    {groups.map(g => <option key={g} value={g}>{g}</option>)}
                 </select>
                 <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
              </div>
              <Link href="/admin/surveys" className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-slate-400 hover:text-white border border-slate-700 rounded-xl text-[10px] font-black uppercase transition-all">
                 <Download className="w-3 h-3" /> Export
              </Link>
           </div>
        </div>

        {/* Data Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
           {[
             { label: 'NPS INDEX', val: stats.nps + '%', desc: 'Net Promoter Score', icon: <ArrowUpRight className="w-4 h-4 text-[#BE1E2E]" /> },
             { label: 'MEAN SCORE', val: stats.avg, desc: 'Average across metrics', icon: <Star className="w-4 h-4 text-emerald-500" /> },
             { label: 'OPINIONS', val: questionAnalytics.reduce((a, b) => a + b.opinions.length, 0), desc: 'Qualitative responses', icon: <MessageSquare className="w-4 h-4 text-blue-500" /> },
             { label: 'TOTAL SUBMITTED', val: filteredForms.length, desc: 'Total survey forms', icon: <Users className="w-4 h-4 text-slate-400" /> }
           ].map((k, i) => (
             <div key={i} className="bg-[#1e293b] p-8 rounded-[2rem] border border-slate-700/30 shadow-xl relative group hover:bg-[#1e293b]/80 transition-all">
                <div className="flex justify-between items-start mb-4">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{k.label}</p>
                   {k.icon}
                </div>
                <h3 className="text-5xl font-black text-white">{k.val}</h3>
                <p className="text-[9px] font-bold text-slate-500 mt-2 uppercase tracking-widest">{k.desc}</p>
             </div>
           ))}
        </div>

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 gap-12 pb-20">
           {questionAnalytics.map((q, i) => (
             <div key={q.id} className="bg-[#1e293b] rounded-[3rem] border border-slate-700/30 shadow-2xl overflow-hidden flex flex-col h-full group hover:shadow-red-900/10 transition-all duration-700">
                <div className="p-10 pb-6 border-b border-slate-800/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                   <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                         <span className="w-9 h-9 rounded-xl bg-[#0f172a] border border-slate-700 text-emerald-500 text-[11px] font-black flex items-center justify-center shadow-inner">0{i+1}</span>
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Quantitative Analysis</span>
                      </div>
                      <h4 className={`text-xl font-black leading-tight uppercase tracking-tight ${q.isGrid ? 'text-[#BE1E2E]' : 'text-slate-100'}`}>{q.questionText}</h4>
                   </div>
                   {!q.isOpinion && (
                     <div className="bg-[#0f172a] px-8 py-4 rounded-2xl border border-slate-700 text-center shrink-0 shadow-2xl">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Mean Score</p>
                        <p className="text-3xl font-black text-white">{q.avg}</p>
                     </div>
                   )}
                </div>

                <div className="p-10 flex-1 bg-[#1e293b]/50">
                   {q.isOpinion ? (
                      /* Pro Comment Feed */
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {q.opinions.slice(0, 15).map((op, idx) => (
                            <div key={idx} className="bg-[#0f172a] p-8 rounded-[2rem] border border-slate-800 shadow-xl group/op hover:border-[#BE1E2E]/30 transition-all relative">
                               <Quote className="w-10 h-10 text-slate-800 absolute top-4 right-4 pointer-events-none" />
                               <p className="text-[13px] text-slate-300 leading-relaxed italic relative z-10">"{op.text}"</p>
                               <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-800/50">
                                  <div className="flex items-center gap-2">
                                     <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                     <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{op.campus}</span>
                                  </div>
                                  <span className="bg-slate-800 px-2.5 py-1 rounded-lg text-[9px] font-black text-[#BE1E2E] uppercase shadow-inner">{op.class}</span>
                               </div>
                            </div>
                         ))}
                      </div>
                   ) : q.isGrid ? (
                      /* Pro Doughnut Chart */
                      <div className="flex flex-col lg:flex-row items-center gap-20">
                         <div className="w-full lg:w-3/5 h-[480px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                               <PieChart>
                                  <Pie data={q.chartData} cx="50%" cy="50%" innerRadius={100} outerRadius={140} paddingAngle={4} dataKey="value" label={renderLabel}>
                                     {q.chartData.map((e, idx) => <Cell key={idx} fill={e.fill} stroke="none" />)}
                                  </Pie>
                                  <Tooltip contentStyle={{backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid #334155', color: '#fff'}} />
                               </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                               <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Sentiment</p>
                               <p className="text-5xl font-black text-white">{q.avg}</p>
                            </div>
                         </div>
                         <div className="w-full lg:w-2/5 space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                               <p className="text-xs font-black text-white uppercase tracking-widest">Sentiment Distribution</p>
                               <div className="flex-1 h-[1px] bg-slate-800" />
                            </div>
                            {q.chartData.map((item, idx) => (
                               <div key={idx} className="flex items-center justify-between group/row">
                                  <div className="flex items-center gap-4">
                                     <div className="w-3.5 h-3.5 rounded-full shadow-lg" style={{ backgroundColor: item.fill }} />
                                     <span className="text-xs font-bold text-slate-400 uppercase tracking-tight group-hover/row:text-slate-100 transition-colors">{item.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                     <span className="text-sm font-black text-white">{item.value}</span>
                                     <span className="text-[10px] font-bold text-slate-600 bg-[#0f172a] px-2 py-0.5 rounded-md">({item.percentage}%)</span>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   ) : (
                      /* Pro Bar Chart */
                      <div className="flex flex-col lg:flex-row items-center gap-16">
                         <div className="w-full lg:w-2/3 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={q.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'black', fill: '#64748b'}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#64748b'}} />
                                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                                     {q.chartData.map((e, idx) => <Cell key={idx} fill={e.fill} fillOpacity={0.8} />)}
                                  </Bar>
                                  <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid #334155'}} />
                               </BarChart>
                            </ResponsiveContainer>
                         </div>
                         <div className="w-full lg:w-1/3 grid grid-cols-1 gap-3">
                            {q.chartData.map((item, idx) => (
                               <div key={idx} className="flex justify-between items-center p-5 bg-[#0f172a] rounded-2xl border border-slate-800 hover:border-slate-600 transition-all">
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.name}</span>
                                  <div className="flex items-center gap-3">
                                     <span className="text-sm font-black text-white">{item.percentage}%</span>
                                     <div className="w-1 h-8 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="bg-[#BE1E2E] w-full" style={{ height: `${item.percentage}%` }} />
                                     </div>
                                  </div>
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  )
}
