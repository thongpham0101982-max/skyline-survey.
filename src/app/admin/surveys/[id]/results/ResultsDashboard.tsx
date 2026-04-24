'use client'
import { useState, useMemo, useEffect } from 'react'
import { BarChart3, Filter, Download, ChevronRight, PieChart as PieIcon, Layout, Database, Share2, Info, Users, MessageSquare, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'

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

// OFFICIAL TABLEAU 10 COLOR PALETTE
const TABLEAU_COLORS = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC']

export function ResultsDashboard({ periodId, periodName, periodCode, questions, forms, totalForms }: Props) {
  useEffect(() => {
    console.log("--- TABLEAU BI DASHBOARD v5.1 ---");
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
      const chartData = Object.entries(dist).map(([n, v]) => ({
        name: getChoiceLabel(q.id, n),
        value: v,
        percentage: Math.round((v / tC) * 100)
      })).sort((a,b) => b.value - a.value)

      return { ...q, isOpinion, isGrid, avg: qCount > 0 ? (qSum / qCount).toFixed(2) : '0.00', chartData, opinions }
    })
  }, [questions, filteredForms])

  return (
    <div className="bg-[#f0f2f5] min-h-screen font-sans text-slate-700">
      
      {/* Tableau Sidebar Filter Panel (Top Sticky) */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-8 py-4 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6">
         <div className="flex items-center gap-4">
            <div className="p-2 bg-[#4E79A7] rounded-lg text-white">
               <Database className="w-5 h-5" />
            </div>
            <div>
               <h1 className="text-xl font-bold text-slate-900 leading-none">{periodName}</h1>
               <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">BI Dashboard • {periodCode}</p>
            </div>
         </div>

         <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
               <button onClick={() => { setCompareBy('CAMPUS'); setSelectedGroup('ALL'); }} className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all ${compareBy === 'CAMPUS' ? 'bg-white text-[#4E79A7] shadow-sm' : 'text-slate-500'}`}>CAMPUS</button>
               <button onClick={() => { setCompareBy('CLASS'); setSelectedGroup('ALL'); }} className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all ${compareBy === 'CLASS' ? 'bg-white text-[#4E79A7] shadow-sm' : 'text-slate-500'}`}>CLASS</button>
            </div>
            <div className="h-8 w-[1px] bg-slate-200" />
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-slate-400 uppercase">Filter:</span>
               <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-4 py-1.5 text-[11px] font-bold outline-none focus:ring-2 ring-[#4E79A7]/20 min-w-[180px]">
                  <option value="ALL">All Selections</option>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
               </select>
            </div>
            <Link href="/admin/surveys" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"><Share2 className="w-4 h-4" /></Link>
         </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-8 lg:p-12 space-y-10">
        
        {/* Tableau KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {[
             { label: 'NPS Index', val: stats.nps + '%', icon: <PieIcon className="w-4 h-4" />, color: 'text-[#E15759]' },
             { label: 'Avg Rating', val: stats.avg, icon: <Layout className="w-4 h-4" />, color: 'text-slate-800' },
             { label: 'Total Responses', val: filteredForms.length, icon: <Users className="w-4 h-4" />, color: 'text-slate-800' },
             { label: 'Feedback Count', val: questionAnalytics.reduce((a, b) => a + b.opinions.length, 0), icon: <MessageSquare className="w-4 h-4" />, color: 'text-slate-800' }
           ].map((k, i) => (
             <div key={i} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-center mb-4">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{k.label}</p>
                   <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:text-[#4E79A7] transition-colors">{k.icon}</div>
                </div>
                <h3 className={`text-4xl font-bold ${k.color}`}>{k.val}</h3>
                <div className="mt-4 flex items-center gap-2 text-[9px] text-emerald-500 font-bold uppercase">
                   <TrendingUp className="w-3 h-3" /> Updated Real-time
                </div>
             </div>
           ))}
        </div>

        {/* Tableau Sheet-like Visuals */}
        <div className="grid grid-cols-1 gap-8 pb-20">
           {questionAnalytics.map((q, i) => (
             <div key={q.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group">
                <div className="p-6 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-[#4E79A7] text-white text-[10px] font-bold flex items-center justify-center">Q{i+1}</div>
                      <h4 className={`text-sm font-bold uppercase tracking-tight ${q.isGrid ? 'text-[#E15759]' : 'text-slate-800'}`}>{q.questionText}</h4>
                   </div>
                   {!q.isOpinion && (
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                         <span>Mean: <b className="text-slate-900">{q.avg}</b></span>
                         <Info className="w-3 h-3 cursor-help" />
                      </div>
                   )}
                </div>

                <div className="p-10">
                   {q.isOpinion ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                         {q.opinions.map((op, idx) => (
                            <div key={idx} className="bg-slate-50 p-6 rounded-lg border border-slate-100 hover:border-[#4E79A7]/30 transition-all">
                               <p className="text-[12px] text-slate-600 leading-relaxed italic">"{op.text}"</p>
                               <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase">
                                  <span className="text-[#4E79A7]">{op.campus}</span>
                                  <span>•</span>
                                  <span>{op.class}</span>
                               </div>
                            </div>
                         ))}
                      </div>
                   ) : q.isGrid ? (
                      /* Tableau Style Doughnut */
                      <div className="flex flex-col lg:flex-row items-center gap-16">
                         <div className="w-full lg:w-1/2 h-[350px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                               <PieChart>
                                  <Pie data={q.chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={2} dataKey="value">
                                     {q.chartData.map((e, idx) => (
                                        <Cell key={idx} fill={TABLEAU_COLORS[idx % TABLEAU_COLORS.length]} />
                                     ))}
                                  </Pie>
                                  <Tooltip />
                               </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                               <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Sentiment</p>
                               <p className="text-4xl font-bold text-slate-800">{q.avg}</p>
                            </div>
                         </div>
                         <div className="w-full lg:w-1/2 space-y-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Legend</p>
                            {q.chartData.map((item, idx) => (
                               <div key={idx} className="flex items-center justify-between group/legend">
                                  <div className="flex items-center gap-3">
                                     <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: TABLEAU_COLORS[idx % TABLEAU_COLORS.length] }} />
                                     <span className="text-xs font-semibold text-slate-600 group-hover/legend:text-slate-900 transition-colors">{item.name}</span>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs">
                                     <span className="font-bold text-slate-800">{item.value}</span>
                                     <span className="text-slate-300">({item.percentage}%)</span>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   ) : (
                      /* Tableau Horizontal Bar Style */
                      <div className="flex flex-col gap-6">
                         <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={q.chartData} layout="vertical" margin={{ top: 0, right: 30, left: 100, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                  <XAxis type="number" hide />
                                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}} width={100} />
                                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                     {q.chartData.map((e, idx) => (
                                        <Cell key={idx} fill={TABLEAU_COLORS[idx % TABLEAU_COLORS.length]} />
                                     ))}
                                  </Bar>
                                  <Tooltip cursor={{fill: 'transparent'}} />
                               </BarChart>
                            </ResponsiveContainer>
                         </div>
                         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {q.chartData.map((item, idx) => (
                               <div key={idx} className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{item.name}</p>
                                  <p className="text-sm font-bold text-slate-800">{item.percentage}%</p>
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
