'use client'
import { useState, useMemo, useEffect } from 'react'
import { BarChart3, TrendingUp, MessageSquare, Users, Star, Quote } from 'lucide-react'
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

// EXACT COLORS FROM THE USER'S IMAGE
const GRID_COLORS: Record<string, string> = {
  "Rất hài lòng": "#0a4a9b",    // Deep Blue
  "Hài lòng": "#10b981",        // Emerald Green
  "Không hài lòng": "#f59e0b",   // Orange/Amber
  "Rất không hài lòng": "#BE1E2E", // Red
  "default": "#cbd5e1"
}

export function ResultsDashboard({ periodId, periodName, periodCode, questions, forms, totalForms }: Props) {
  useEffect(() => {
    console.log("--- DASHBOARD RELOADED v4.8 (Hotfix) ---");
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

      const totalCount = Object.values(dist).reduce((a,b)=>a+b, 0) || 1
      const chartData = Object.entries(dist).map(([n, v]) => {
        const name = getChoiceLabel(q.id, n)
        let color = GRID_COLORS["default"]
        if (name.includes("Rất hài lòng")) color = GRID_COLORS["Rất hài lòng"]
        else if (name.includes("Rất không hài lòng")) color = GRID_COLORS["Rất không hài lòng"]
        else if (name.includes("Hài lòng")) color = GRID_COLORS["Hài lòng"]
        else if (name.includes("Không hài lòng")) color = GRID_COLORS["Không hài lòng"]
        
        return { name, value: v, percentage: Math.round((v / totalCount) * 100), fill: color }
      }).sort((a,b) => {
        const order = ["Hài lòng", "Rất hài lòng", "Không hài lòng", "Rất không hài lòng"]
        const idxA = order.findIndex(o => a.name.includes(o)); const idxB = order.findIndex(o => b.name.includes(o))
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB)
      })

      return { ...q, isOpinion, isGrid, avg: qSum > 0 ? (qSum / qCount).toFixed(2) : '0.00', chartData, opinions, gridDist }
    })
  }, [questions, filteredForms])

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, percentage }: any) => {
    const RADIAN = Math.PI / 180; const radius = outerRadius + 30;
    const x = cx + radius * Math.cos(-midAngle * RADIAN); const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#475569" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[11px] font-black">
        {`${value} (${percentage}%)`}
      </text>
    );
  };

  return (
    <div className="bg-[#fcfcfc] min-h-screen p-6 lg:p-14 font-sans text-slate-800">
      <div className="max-w-[1500px] mx-auto space-y-14">
        <div className="flex flex-col lg:flex-row justify-between items-end border-b border-slate-200 pb-12 gap-8 relative">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase mb-2">{periodName}</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{periodCode} • BÁO CÁO PHÂN TÍCH TỔNG HỢP</p>
          </div>
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
             <div className="flex p-1 bg-slate-50 rounded-xl">
               <button onClick={() => { setCompareBy('CAMPUS'); setSelectedGroup('ALL'); }} className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ${compareBy === 'CAMPUS' ? 'bg-[#BE1E2E] text-white shadow-md' : 'text-slate-400'}`}>CƠ SỞ</button>
               <button onClick={() => { setCompareBy('CLASS'); setSelectedGroup('ALL'); }} className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ${compareBy === 'CLASS' ? 'bg-[#BE1E2E] text-white shadow-md' : 'text-slate-400'}`}>LỚP</button>
             </div>
             <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="bg-transparent px-4 py-2 text-[10px] font-black uppercase outline-none border-l border-slate-100 min-w-[150px]">
                <option value="ALL">Tất cả {compareBy === 'CAMPUS' ? 'Cơ sở' : 'Lớp'}</option>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
             </select>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
           {[
             { label: 'NPS Score', val: stats.nps + '%', color: 'text-[#BE1E2E]' },
             { label: 'Average', val: stats.avg, color: 'text-slate-800' },
             { label: 'Feedbacks', val: questionAnalytics.reduce((a, b) => a + b.opinions.length, 0), color: 'text-slate-800' },
             { label: 'Submitted', val: filteredForms.length, color: 'text-slate-800' }
           ].map((k, i) => (
             <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">{k.label}</p>
                <h3 className={`text-6xl font-black ${k.color}`}>{k.val}</h3>
             </div>
           ))}
        </div>

        <div className="grid grid-cols-1 gap-14 pb-20">
           {questionAnalytics.map((q, i) => (
             <div key={q.id} className="bg-white rounded-[4rem] border border-slate-100 shadow-sm p-14 flex flex-col gap-10 hover:shadow-2xl transition-all duration-700">
                <div className="flex flex-col gap-2">
                   <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">Q{i+1}</span>
                      <span className="text-[11px] font-black text-[#BE1E2E] uppercase tracking-widest">Tiêu chí khảo sát</span>
                   </div>
                   <h4 className="text-2xl font-black text-[#BE1E2E] leading-tight mt-4 uppercase tracking-tight">{q.questionText}</h4>
                </div>

                <div className="flex flex-col lg:flex-row items-center gap-20">
                   {q.isOpinion ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
                         {q.opinions.slice(0, 9).map((op, idx) => (
                            <div key={idx} className="bg-slate-50/50 p-8 rounded-3xl border border-slate-100 italic text-sm text-slate-600 leading-relaxed shadow-sm">
                               "{op.text}"
                               <p className="text-[9px] font-black text-slate-400 uppercase mt-6 not-italic">{op.campus} • {op.class}</p>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <>
                        <div className="w-full lg:w-3/5 h-[450px] relative">
                           <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                 <Pie data={q.chartData} cx="50%" cy="50%" innerRadius={90} outerRadius={130} paddingAngle={2} dataKey="value" label={renderCustomizedLabel}>
                                    {q.chartData.map((e, idx) => (
                                       <Cell key={idx} fill={e.fill} stroke="none" />
                                    ))}
                                 </Pie>
                                 <Tooltip contentStyle={{borderRadius: '20px', border: 'none'}} />
                              </PieChart>
                           </ResponsiveContainer>
                           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                              <p className="text-4xl font-black text-slate-900">{q.avg}</p>
                           </div>
                        </div>
                        <div className="w-full lg:w-2/5 space-y-6">
                           <h5 className="text-lg font-black text-slate-800 uppercase tracking-tight border-b border-slate-100 pb-4">PHẢN HỒI</h5>
                           {q.chartData.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between">
                                 <div className="flex items-center gap-4">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.fill }} />
                                    <span className="text-sm font-black text-slate-600 uppercase tracking-tight">{item.name}</span>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <span className="text-sm font-black text-slate-900">{item.value}</span>
                                    <span className="text-[11px] font-bold text-slate-300">({item.percentage}%)</span>
                                 </div>
                              </div>
                           ))}
                        </div>
                      </>
                   )}
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  )
}
