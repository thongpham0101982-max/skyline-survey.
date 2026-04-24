'use client'
import { useState, useMemo, useEffect } from 'react'
import { Building2, GraduationCap, LayoutGrid, BarChart3, PieChart as PieChartIcon, Users, TrendingUp, Info, MessageSquare, User, List, Target, Hash, Filter, Zap, CheckCircle2, Star } from 'lucide-react'
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
  classId: string
  className: string
  campusId: string
  campusName: string
  submittedAt: string | null
  responses: FormResponse[]
}

interface Question {
  id: string
  questionText: string
  questionType: string
  ratingScaleMin: number
  ratingScaleMax: number
  options: string | null
  weight: number
}

interface Props {
  periodId: string
  periodName: string
  periodCode: string
  questions: Question[]
  forms: Form[]
  totalForms: number
}

interface TextOpinion {
  text: string
  respondent: string
  className: string
  campusName: string
  questionId: string
}

const COLORS = ['#BE1E2E', '#ef4444', '#fbbf24', '#f59e0b', '#3b82f6', '#10b981', '#059669', '#6366f1', '#8b5cf6', '#ec4899']

export function ResultsDashboard({ periodId, periodName, periodCode, questions, forms, totalForms }: Props) {
  const [filterType, setFilterType] = useState<'ALL' | 'CAMPUS' | 'CLASS'>('ALL')
  const [selectedCampus, setSelectedCampus] = useState<string>('ALL')
  const [selectedClass, setSelectedClass] = useState<string>('ALL')
  const [compareBy, setCompareBy] = useState<'CAMPUS' | 'CLASS'>('CAMPUS')

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
    
    // For Grid, options is "Row1,Row2|Col1,Col2"
    if (q.options.includes('|')) {
      const cols = q.options.split('|')[1].split(',').map(s => s.trim())
      const idx = parseInt(val)
      if (!isNaN(idx) && cols[idx]) return cols[idx]
      // Check if val matches exactly
      const match = cols.find(c => c.startsWith(val) || c === val)
      if (match) return match
    } else {
      const opts = q.options.split(',').map(s => s.trim())
      const idx = parseInt(val)
      if (!isNaN(idx) && opts[idx]) return opts[idx]
    }
    return val
  }

  const calculateStats = (targetForms: Form[]) => {
    let promoters = 0, passives = 0, detractors = 0, totalNpsResponses = 0
    let totalScore = 0, scoreCount = 0
    const allScores: number[] = []

    targetForms.forEach(form => {
      form.responses.forEach(r => {
        const q = questions.find(x => x.id === r.questionId)
        if (!q) return

        if (r.numericScore !== null) {
          const score = Number(r.numericScore)
          allScores.push(score)
          totalScore += score
          scoreCount++

          if (q.questionType?.toUpperCase() === 'NPS') {
            totalNpsResponses++
            if (score >= 9) promoters++
            else if (score >= 7) passives++
            else detractors++
          }
        }
      })
    })

    const nps = totalNpsResponses > 0 ? Math.round(((promoters - detractors) / totalNpsResponses) * 100) : null
    return { nps, average: scoreCount > 0 ? (totalScore / scoreCount).toFixed(2) : '0.00', median: '0.00', totalResponses: scoreCount }
  }

  const filteredForms = useMemo(() => {
    return forms.filter(f => {
      if (filterType === 'ALL') return true
      if (filterType === 'CAMPUS') return selectedCampus === 'ALL' || f.campusId === selectedCampus
      if (filterType === 'CLASS') return selectedClass === 'ALL' || f.classId === selectedClass
      return true
    })
  }, [forms, filterType, selectedCampus, selectedClass])

  const stats = useMemo(() => calculateStats(filteredForms), [filteredForms, questions])

  const questionAnalytics = useMemo(() => {
    return questions.map(q => {
      let qSum = 0, qCount = 0
      const distribution: Record<string, number> = {}
      const textResponses: TextOpinion[] = []
      const gridDistribution: Record<string, Record<string, number>> = {}
      const comparisonMap = new Map<string, Record<string, number>>()

      filteredForms.forEach(form => {
        const groupKey = compareBy === 'CAMPUS' ? (form.campusName || 'Chưa rõ') : (form.className || 'Chưa rõ')
        if (!comparisonMap.has(groupKey)) comparisonMap.set(groupKey, {})

        const r = form.responses.find(x => x.questionId === q.id)
        if (!r) return

        if (r.numericScore !== null) {
          const val = r.numericScore
          qSum += val; qCount++
          distribution[val] = (distribution[val] || 0) + 1
          comparisonMap.get(groupKey)![val] = (comparisonMap.get(groupKey)![val] || 0) + 1
        } else if (r.choiceAnswer?.startsWith('{') || r.textAnswer?.startsWith('{')) {
           try {
             const parsed = JSON.parse(r.choiceAnswer || r.textAnswer || '{}')
             Object.entries(parsed).forEach(([rowKey, val]: [string, any]) => {
               if (rowKey === 'rows') return
               if (!gridDistribution[rowKey]) gridDistribution[rowKey] = {}
               gridDistribution[rowKey][val] = (gridDistribution[rowKey][val] || 0) + 1
               distribution[val] = (distribution[val] || 0) + 1
               comparisonMap.get(groupKey)![val] = (comparisonMap.get(groupKey)![val] || 0) + 1
               const numVal = parseInt(val)
               if (!isNaN(numVal)) { qSum += numVal; qCount++ }
             })
           } catch (e) {}
        } else if (r.choiceAnswer || r.textAnswer) {
          const val = r.choiceAnswer || r.textAnswer || ''
          distribution[val] = (distribution[val] || 0) + 1
          comparisonMap.get(groupKey)![val] = (comparisonMap.get(groupKey)![val] || 0) + 1
          qCount++
          if (r.textAnswer && !r.choiceAnswer) {
            textResponses.push({ text: r.textAnswer, respondent: 'HS/PH', className: form.className || '', campusName: form.campusName || '', questionId: q.id })
          }
        }
      })

      const chartData = Object.entries(distribution).map(([name, value]) => ({ 
        name: getChoiceLabel(q.id, name), 
        rawName: name,
        value, 
        percentage: Math.round((value / (qCount || 1)) * 100) 
      })).sort((a,b) => (Number(a.rawName) || 0) - (Number(b.rawName) || 0))

      const comparisonData = Array.from(comparisonMap.entries()).map(([name, scores]) => {
        const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1
        const row: any = { name }
        Object.entries(scores).forEach(([score, val]) => {
           row[`score_${score}`] = Math.round((val / total) * 100)
        })
        return row
      })

      return { ...q, average: qCount > 0 ? (qSum / qCount).toFixed(2) : '0.00', chartData, textResponses, gridDistribution, comparisonData }
    })
  }, [questions, filteredForms, compareBy])

  return (
    <div className="bg-[#f1f5f9] min-h-screen p-4 lg:p-10 font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto space-y-10">
        
        {/* Modern Header */}
        <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#BE1E2E]/5 rounded-full -mr-40 -mt-40 blur-3xl" />
          <div className="flex items-center gap-8 relative z-10">
             <div className="w-20 h-20 bg-[#BE1E2E] rounded-[2rem] flex items-center justify-center text-white shadow-2xl">
               <BarChart3 className="w-10 h-10" />
             </div>
             <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900">{periodName}</h1>
                <div className="flex items-center gap-3 mt-2">
                   <span className="bg-[#BE1E2E] text-white px-4 py-1 rounded-full text-[12px] font-black uppercase tracking-widest shadow-lg">BÁO CÁO CHUẨN v4.1</span>
                   <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">{periodCode}</span>
                </div>
             </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 bg-slate-100 p-3 rounded-[2rem] border border-slate-200 relative z-10">
            <div className="flex bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm">
               <button onClick={() => setCompareBy('CAMPUS')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${compareBy === 'CAMPUS' ? 'bg-[#BE1E2E] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>CƠ SỞ</button>
               <button onClick={() => setCompareBy('CLASS')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${compareBy === 'CLASS' ? 'bg-[#BE1E2E] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>LỚP</button>
            </div>
            <select value={selectedCampus} onChange={(e) => { setSelectedCampus(e.target.value); setFilterType(e.target.value === 'ALL' ? 'ALL' : 'CAMPUS'); }}
              className="px-8 py-4 rounded-2xl border-2 border-slate-200 bg-white text-xs font-black outline-none focus:border-[#BE1E2E] cursor-pointer">
              <option value="ALL">TẤT CẢ CƠ SỞ</option>
              {Array.from(new Set(forms.map(f => f.campusName))).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Link href="/admin/surveys" className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl text-xs uppercase shadow-xl hover:bg-black transition-all">Quay lại</Link>
          </div>
        </div>

        {/* High-Level Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
           {[
             { label: 'CHỈ SỐ NPS', value: stats.nps + '%', color: 'text-[#BE1E2E]', icon: <TrendingUp className="w-5 h-5" /> },
             { label: 'TRUNG BÌNH', value: stats.average, color: 'text-slate-800', icon: <Star className="w-5 h-5" /> },
             { label: 'Ý KIẾN ĐÓNG GÓP', value: questionAnalytics.reduce((acc, q) => acc + q.textResponses.length, 0), color: 'text-slate-800', icon: <MessageSquare className="w-5 h-5" /> },
             { label: 'TỔNG PHIẾU NỘP', value: filteredForms.length, color: 'text-slate-800', icon: <Users className="w-5 h-5" /> }
           ].map((kpi, idx) => (
             <div key={idx} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl text-center group hover:bg-[#BE1E2E]/5 transition-all">
                <div className="flex justify-center mb-4 text-slate-300 group-hover:text-[#BE1E2E] transition-colors">{kpi.icon}</div>
                <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-4">{kpi.label}</p>
                <h3 className={`text-6xl font-black ${kpi.color}`}>{kpi.value}</h3>
             </div>
           ))}
        </div>

        {/* Detailed Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
           {questionAnalytics.map((q, i) => (
             <div key={q.id} className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl p-12 space-y-10 flex flex-col group hover:shadow-red-100/50 transition-all">
                <div className="flex justify-between items-start gap-8 border-b border-slate-50 pb-8">
                   <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[#BE1E2E] text-sm font-black uppercase tracking-widest">Question {i + 1}</span>
                        <span className="w-10 h-[2px] bg-slate-100"></span>
                      </div>
                      <h4 className="text-xl font-black text-slate-800 leading-tight">{q.questionText}</h4>
                   </div>
                   <div className="bg-[#BE1E2E]/5 px-8 py-4 rounded-[2rem] border border-[#BE1E2E]/10 text-center shrink-0">
                      <p className="text-[10px] font-black text-[#BE1E2E] mb-1 uppercase">AVG SCORE</p>
                      <p className="text-3xl font-black text-slate-800">{q.average}</p>
                   </div>
                </div>

                {/* Grid Detailed Table */}
                {Object.keys(q.gridDistribution).length > 0 ? (
                   <div className="space-y-6">
                      {Object.entries(q.gridDistribution).map(([rowKey, dist], idx) => {
                         const info = getGridInfo(q.id)
                         const label = info.rows[parseInt(rowKey)] || `Tiêu chí ${parseInt(rowKey) + 1}`
                         const totalRow = Object.values(dist).reduce((a, b) => a + b, 0) || 1
                         return (
                            <div key={idx} className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
                               <div className="flex items-center justify-between mb-6">
                                  <p className="text-sm font-black text-slate-800 flex items-center gap-3 uppercase tracking-tight">
                                     <div className="w-2 h-2 rounded-full bg-[#BE1E2E]" /> {label}
                                  </p>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">N = {totalRow}</span>
                               </div>
                               <div className="grid grid-cols-1 gap-3">
                                  {info.cols.map((colName, colIdx) => {
                                     const count = dist[colIdx.toString()] || dist[colName] || 0
                                     const pct = Math.round((count / totalRow) * 100)
                                     return (
                                        <div key={colIdx} className="flex items-center gap-4">
                                           <span className="text-[11px] font-bold text-slate-500 w-32 truncate">{colName}</span>
                                           <div className="flex-1 h-3 bg-white rounded-full overflow-hidden border border-slate-100">
                                              <div className={`h-full rounded-full transition-all duration-1000 ${colIdx === 0 ? 'bg-emerald-500' : colIdx === 1 ? 'bg-blue-400' : colIdx === 2 ? 'bg-amber-400' : 'bg-[#BE1E2E]'}`} style={{ width: `${pct}%` }} />
                                           </div>
                                           <span className="text-[11px] font-black text-slate-800 w-12 text-right">{pct}%</span>
                                        </div>
                                     )
                                  })}
                               </div>
                            </div>
                         )
                      })}
                   </div>
                ) : (
                   <div className="space-y-8 flex-1 flex flex-col justify-center">
                      <div className="h-[250px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={q.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                               <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                               <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                               <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} />
                               <Bar dataKey="percentage" radius={[10, 10, 0, 0]} barSize={40}>
                                  {q.chartData.map((entry, index) => (
                                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                               </Bar>
                            </BarChart>
                         </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         {q.chartData.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center p-5 bg-slate-50 rounded-3xl border border-slate-100">
                               <span className="text-[11px] font-black text-slate-500 uppercase truncate pr-4">{item.name}</span>
                               <span className="text-sm font-black text-slate-800 bg-white px-3 py-1 rounded-xl shadow-sm">{item.percentage}%</span>
                            </div>
                         ))}
                      </div>
                   </div>
                )}
             </div>
           ))}
        </div>

      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
      `}</style>
    </div>
  )
}
