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

const GRID_COLORS: Record<string, string> = {
  "Rất hài lòng": "#0a4a9b",
  "Hài lòng": "#10b981",
  "Không hài lòng": "#f59e0b",
  "Rất không hài lòng": "#BE1E2E",
  "default": "#cbd5e1"
}

const BAR_COLORS = ['#BE1E2E', '#3b82f6', '#fbbf24', '#10b981', '#8b5cf6', '#ec4899']

export function ResultsDashboard({ periodId, periodName, periodCode, questions, forms, totalForms }: Props) {
  useEffect(() => {
    console.log("--- DASHBOARD RELOADED v4.9 (Style Partitioning) ---");
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
        let fill = BAR_COLORS[0]
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

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, percentage }: any) => {
    const RADIAN = Math.PI / 180; const r = outerRadius + 30;
    const x = cx + r * Math.cos(-midAngle * RADIAN); const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#475569" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[11px] font-black">
        {`${value} (${percentage}%)`}
      </text>
    );
  };

  return (
    <div className="bg-[#fcfcfc] min-h-screen p-6 lg:p-14 font-sans text-slate-800">
      <div className="max-w-[1500px] mx-auto space-y-12">
        <div className="flex flex-col lg:flex-row justify-between items-end border-b border-slate-200 pb-12 gap-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase mb-2">{periodName}</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{periodCode} • BÁO CÁO PHÂN TÍCH</p>
          </div>
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
             <div className="flex p-1 bg-slate-50 rounded-xl">
               <button onClick={() => { setCompareBy('CAMPUS'); setSelectedGroup('ALL'); }} className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ${compareBy === 'CAMPUS' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>CƠ SỞ</button>
               <button onClick={() => { setCompareBy('CLASS'); setSelectedGroup('ALL'); }} className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ${compareBy === 'CLASS' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>LỚP</button>
             </div>
             <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="bg-transparent px-4 py-2 text-[10px] font-black uppercase outline-none border-l border-slate-100 min-w-[150px]">
                <option value="ALL">Tất cả {compareBy === 'CAMPUS' ? 'Cơ sở' : 'Lớp'}</option>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
             </select>
             <Link href="/admin/surveys" className="px-6 py-2.5 bg-[#BE1E2E] text-white text-[10px] font-black rounded-xl uppercase">Thoát</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
           {[
             { label: 'NPS Score', val: stats.nps + '%', color: 'text-[#BE1E2E]' },
             { label: 'Average', val: stats.avg, color: 'text-slate-800' },
             { label: 'Feedbacks', val: questionAnalytics.reduce((a, b) => a + b.opinions.length, 0), color: 'text-slate-800' },
             { label: 'Submitted', val: filteredForms.length, color: 'text-slate-800' }
           ].map((k, i) => (
             <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{k.label}</p>
                <h3 className={`text-4xl font-black ${k.color}`}>{k.val}</h3>
             </div>
           ))}
        </div>

        <div className="grid grid-cols-1 gap-12 pb-20">
           {questionAnalytics.map((q, i) => (
             <div key={q.id} className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-12 flex flex-col gap-10">
                <div className="flex flex-col gap-2">
                   <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full text-white text-[10px] font-black flex items-center justify-center ${q.isGrid ? 'bg-red-600' : 'bg-slate-900'}`}>Q{i+1}</span>
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Tiêu chí khảo sát</span>
                   </div>
                   <h4 className={`text-xl font-black leading-tight mt-4 uppercase tracking-tight ${q.isGrid ? 'text-[#BE1E2E]' : 'text-slate-800'}`}>{q.questionText}</h4>
                </div>

                <div className="p-2">
                   {q.isOpinion ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {q.opinions.slice(0, 12).map((op, idx) => (
                            <div key={idx} className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 italic text-sm text-slate-600 shadow-sm">
                               "{op.text}"
                               <p className="text-[9px] font-black text-slate-400 uppercase mt-4 not-italic">{op.campus} • {op.class}</p>
                            </div>
                         ))}
                      </div>
                   ) : q.isGrid ? (
                      <div className="flex flex-col lg:flex-row items-center gap-20">
                         <div className="w-full lg:w-3/5 h-[400px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                               <PieChart>
                                  <Pie data={q.chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={2} dataKey="value" label={renderCustomizedLabel}>
                                     {q.chartData.map((e, idx) => <Cell key={idx} fill={e.fill} stroke="none" />)}
                                  </Pie>
                                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                               </PieChart>
                            </ResponsiveContainer>
                         </div>
                         <div className="w-full lg:w-2/5 space-y-5">
                            <h5 className="text-sm font-black text-slate-800 uppercase border-b pb-3">PHẢN HỒI</h5>
                            {q.chartData.map((item, idx) => (
                               <div key={idx} className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                     <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                                     <span className="text-xs font-bold text-slate-600 uppercase">{item.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs font-black">
                                     <span>{item.value}</span>
                                     <span className="text-slate-300">({item.percentage}%)</span>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   ) : (
                      <div className="flex flex-col lg:flex-row items-center gap-12">
                         <div className="w-full lg:w-2/3 h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={q.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold', fill: '#94a3b8'}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} />
                                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                     {q.chartData.map((e, idx) => <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />)}
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
