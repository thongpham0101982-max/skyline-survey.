'use client'
import { useState, useMemo } from 'react'
import { BarChart3, TrendingUp, MessageSquare, Users, Star, Quote, ChevronRight } from 'lucide-react'
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

const COLORS = ['#10b981', '#3b82f6', '#fbbf24', '#BE1E2E', '#8b5cf6', '#ec4899']

export function ResultsDashboard({ periodId, periodName, periodCode, questions, forms, totalForms }: Props) {
  const [compareBy, setCompareBy] = useState<'CAMPUS' | 'CLASS'>('CAMPUS')
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL')

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
      const isGrid = q.questionType?.toUpperCase() === 'MC_GRID' || q.questionType?.toUpperCase() === 'CB_GRID' || q.options?.includes('|')
      
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
              if (rk === 'rows') return
              dist[v] = (dist[v] || 0) + 1
              qSum += (Number(v) || 0); qCount++
            })
          } catch(e){}
        } else if (r.textAnswer || r.choiceAnswer) {
          const v = r.choiceAnswer || r.textAnswer || ''
          dist[v] = (dist[v] || 0) + 1; qCount++
          if (isOpinion && r.textAnswer) opinions.push({ text: r.textAnswer, class: f.className, campus: f.campusName })
        }
      })

      const chartData = Object.entries(dist).map(([n, v]) => ({ 
        name: getChoiceLabel(q.id, n), 
        rawName: n,
        value: v, 
        percentage: Math.round((v / (qCount || 1)) * 100) 
      })).sort((a,b) => b.name.localeCompare(a.name))

      return { ...q, isOpinion, isGrid, avg: qCount > 0 ? (qSum / qCount).toFixed(2) : '0.00', chartData, opinions }
    })
  }, [questions, filteredForms])

  return (
    <div className="bg-[#f8fafc] min-h-screen p-6 lg:p-12 font-sans text-slate-800">
      <div className="max-w-[1500px] mx-auto space-y-12">
        
        {/* Modern Minimalist Header */}
        <div className="flex flex-col lg:flex-row justify-between items-end border-b border-slate-200 pb-10 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <div className="w-10 h-10 bg-[#BE1E2E] rounded-xl flex items-center justify-center text-white shadow-lg">
                 <BarChart3 className="w-5 h-5" />
               </div>
               <span className="text-[10px] font-black text-[#BE1E2E] uppercase tracking-[0.3em]">Skyline Survey Dashboard</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{periodName}</h1>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{periodCode} • BÁO CÁO PHÂN TÍCH TỔNG HỢP</p>
          </div>

          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
             <div className="flex p-1 bg-slate-50 rounded-xl">
               <button onClick={() => { setCompareBy('CAMPUS'); setSelectedGroup('ALL'); }} className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ${compareBy === 'CAMPUS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>CƠ SỞ</button>
               <button onClick={() => { setCompareBy('CLASS'); setSelectedGroup('ALL'); }} className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ${compareBy === 'CLASS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>LỚP</button>
             </div>
             <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="bg-transparent px-4 py-2 text-[10px] font-black uppercase outline-none border-l border-slate-100 min-w-[150px]">
                <option value="ALL">Tất cả {compareBy === 'CAMPUS' ? 'Cơ sở' : 'Lớp'}</option>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
             </select>
             <Link href="/admin/surveys" className="px-6 py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-xl hover:bg-black transition-all uppercase">Thoát</Link>
          </div>
        </div>

        {/* High-Level KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
           {[
             { label: 'Chỉ số NPS', val: stats.nps + '%', color: 'text-[#BE1E2E]' },
             { label: 'Trung bình', val: stats.avg, color: 'text-slate-800' },
             { label: 'Phản hồi', val: questionAnalytics.reduce((a, b) => a + b.opinions.length, 0), color: 'text-slate-800' },
             { label: 'Phiếu đã nộp', val: filteredForms.length, color: 'text-slate-800' }
           ].map((k, i) => (
             <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{k.label}</p>
                <h3 className={`text-5xl font-black ${k.color}`}>{k.val}</h3>
             </div>
           ))}
        </div>

        {/* Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
           {questionAnalytics.map((q, i) => (
             <div key={q.id} className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full group hover:shadow-xl transition-all duration-500">
                <div className="p-10 pb-6">
                   <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                         <span className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 text-[10px] font-black flex items-center justify-center border border-slate-100 uppercase">Q{i+1}</span>
                         <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Tiêu chí khảo sát</span>
                      </div>
                      {!q.isOpinion && (
                        <div className="text-right">
                           <p className="text-[9px] font-black text-slate-400 uppercase">Average</p>
                           <p className="text-xl font-black text-slate-900">{q.avg}</p>
                        </div>
                      )}
                   </div>
                   <h4 className="text-lg font-black text-slate-800 leading-snug">{q.questionText}</h4>
                </div>

                <div className="px-10 pb-10 flex-1">
                   {q.isOpinion ? (
                      /* Opinion Cards */
                      <div className="space-y-4">
                         {q.opinions.slice(0, 5).map((op, idx) => (
                            <div key={idx} className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                               <p className="text-sm text-slate-600 leading-relaxed italic">"{op.text}"</p>
                               <p className="text-[9px] font-black text-slate-400 uppercase mt-4">{op.campus} • {op.class}</p>
                            </div>
                         ))}
                         {q.opinions.length > 5 && <p className="text-center text-[9px] font-black text-slate-300 uppercase mt-4">Và {q.opinions.length - 5} ý kiến khác...</p>}
                      </div>
                   ) : q.isGrid ? (
                      /* DOUGHNUT CHART for Grid/Radio Grid as per user request */
                      <div className="flex flex-col lg:flex-row items-center gap-8 py-4">
                         <div className="w-full lg:w-1/2 h-[280px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                               <PieChart>
                                  <Pie data={q.chartData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={4} dataKey="value">
                                     {q.chartData.map((e, idx) => (
                                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                     ))}
                                  </Pie>
                                  <Tooltip />
                               </PieChart>
                            </ResponsiveContainer>
                         </div>
                         <div className="w-full lg:w-1/2 flex flex-col gap-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Phân bổ phản hồi</p>
                            {q.chartData.map((item, idx) => (
                               <div key={idx} className="flex items-center justify-between group/item">
                                  <div className="flex items-center gap-3">
                                     <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                     <span className="text-[11px] font-bold text-slate-600 truncate max-w-[150px]">{item.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[11px] font-black text-slate-900">{item.value}</span>
                                     <span className="text-[10px] font-bold text-slate-300">({item.percentage}%)</span>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   ) : (
                      /* Default Slim Bar Chart for other quantitative types */
                      <div className="flex flex-col h-full">
                         <div className="h-[200px] w-full mb-8">
                            <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={q.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'black', fill: '#cbd5e1'}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#cbd5e1'}} />
                                  <Tooltip cursor={{fill: '#fafafa'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)'}} />
                                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                                     {q.chartData.map((e, idx) => (
                                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                     ))}
                                  </Bar>
                               </BarChart>
                            </ResponsiveContainer>
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                            {q.chartData.map((item, idx) => (
                               <div key={idx} className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase truncate pr-4">{item.name}</span>
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
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  )
}
