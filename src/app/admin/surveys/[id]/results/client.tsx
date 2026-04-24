'use client'
import { useState, useMemo } from 'react'
import { Building2, GraduationCap, LayoutGrid, BarChart3, PieChart as PieChartIcon, Users, TrendingUp, Info, MessageSquare, User, List, Target, Hash, Filter } from 'lucide-react'
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

const COLORS = ['#BE1E2E', '#ef4444', '#fbbf24', '#f59e0b', '#3b82f6', '#10b981', '#059669']

export function ResultsDashboardClient({ periodId, periodName, periodCode, questions, forms, totalForms }: Props) {
  const [filterType, setFilterType] = useState<'ALL' | 'CAMPUS' | 'CLASS'>('ALL')
  const [selectedCampus, setSelectedCampus] = useState<string>('ALL')
  const [selectedClass, setSelectedClass] = useState<string>('ALL')
  const [compareBy, setCompareBy] = useState<'CAMPUS' | 'CLASS'>('CAMPUS')

  // Helper to parse Grid options
  const getGridLabels = (qId: string) => {
    const q = questions.find(x => x.id === qId)
    if (!q || !q.options) return []
    const parts = q.options.split('|')
    const rows = parts[0].split(',').map(s => s.trim())
    return rows
  }

  // Helper to calculate NPS & Stats
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
            const max = q.ratingScaleMax || 10
            if (max >= 9) {
              if (score >= 9) promoters++
              else if (score >= 7) passives++
              else detractors++
            } else {
              if (score === max) promoters++
              else if (score >= max - 1) passives++
              else detractors++
            }
          }
        }
      })
    })

    const nps = totalNpsResponses > 0 ? Math.round(((promoters - detractors) / totalNpsResponses) * 100) : null
    const average = scoreCount > 0 ? (totalScore / scoreCount).toFixed(2) : '0'
    
    let median = 0
    if (allScores.length > 0) {
      const sorted = [...allScores].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    }

    return { promoters, passives, detractors, totalNpsResponses, nps, average, median: median.toFixed(2), totalResponses: scoreCount }
  }

  const campuses = useMemo(() => {
    const map = new Map<string, string>()
    forms.forEach(f => { if (f.campusId) map.set(f.campusId, f.campusName || 'Chưa rõ') })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [forms])

  const classes = useMemo(() => {
    const map = new Map<string, { id: string, name: string, campusId: string }>()
    forms.forEach(f => {
      if (f.classId && (!selectedCampus || selectedCampus === 'ALL' || f.campusId === selectedCampus)) {
        map.set(f.classId, { id: f.classId, name: f.className || 'Chưa rõ', campusId: f.campusId })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [forms, selectedCampus])

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
      
      // Comparison Data
      const comparisonMap = new Map<string, Record<string, number>>()

      filteredForms.forEach(form => {
        const groupKey = compareBy === 'CAMPUS' ? (form.campusName || 'Chưa rõ') : (form.className || 'Chưa rõ')
        if (!comparisonMap.has(groupKey)) comparisonMap.set(groupKey, {})

        const r = form.responses.find(x => x.questionId === q.id)
        if (!r) return

        if (r.numericScore !== null) {
          const val = r.numericScore
          qSum += val
          qCount++
          distribution[val] = (distribution[val] || 0) + 1
          comparisonMap.get(groupKey)![val] = (comparisonMap.get(groupKey)![val] || 0) + 1
        } else if (r.choiceAnswer) {
          if (r.choiceAnswer.startsWith('{')) {
             try {
               const parsed = JSON.parse(r.choiceAnswer)
               Object.entries(parsed).forEach(([rowKey, val]: [string, any]) => {
                 if (rowKey === 'rows') return
                 if (!gridDistribution[rowKey]) gridDistribution[rowKey] = {}
                 gridDistribution[rowKey][val] = (gridDistribution[rowKey][val] || 0) + 1
                 comparisonMap.get(groupKey)![val] = (comparisonMap.get(groupKey)![val] || 0) + 1
               })
             } catch (e) {}
          } else {
            const choices = r.choiceAnswer.split(',').map(s => s.trim())
            choices.forEach(c => {
              distribution[c] = (distribution[c] || 0) + 1
              comparisonMap.get(groupKey)![c] = (comparisonMap.get(groupKey)![c] || 0) + 1
            })
          }
          qCount++
        } else if (r.textAnswer) {
           if (r.textAnswer.startsWith('{')) {
              try {
                const parsed = JSON.parse(r.textAnswer)
                Object.entries(parsed).forEach(([rowKey, val]: [string, any]) => {
                  if (rowKey === 'rows') return
                  if (!gridDistribution[rowKey]) gridDistribution[rowKey] = {}
                  gridDistribution[rowKey][val] = (gridDistribution[rowKey][val] || 0) + 1
                  comparisonMap.get(groupKey)![val] = (comparisonMap.get(groupKey)![val] || 0) + 1
                })
              } catch (e) {}
           } else {
            textResponses.push({
              text: r.textAnswer,
              respondent: 'Phụ huynh/Học sinh',
              className: form.className || 'Chưa rõ',
              campusName: form.campusName || 'Chưa rõ',
              questionId: q.id
            })
           }
           qCount++
        }
      })

      const average = qCount > 0 && qSum > 0 ? (qSum / qCount).toFixed(2) : null
      const chartData = Object.entries(distribution).map(([name, value]) => ({ name, value }))
        .sort((a,b) => (Number(a.name) || 0) - (Number(b.name) || 0))

      const comparisonData = Array.from(comparisonMap.entries()).map(([name, scores]) => {
        const total = Object.values(scores).reduce((a, b) => a + b, 0)
        const row: any = { name }
        Object.entries(scores).forEach(([score, val]) => {
           row[`score_${score}`] = total > 0 ? Math.round((val / total) * 100) : 0
        })
        return row
      })

      return { ...q, average, count: qCount, distribution, chartData, textResponses, gridDistribution, comparisonData }
    })
  }, [questions, filteredForms, compareBy])

  return (
    <div className="bg-[#f8fafc] min-h-screen p-6 font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header & Controls */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-[#BE1E2E] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-100">
               <BarChart3 className="w-6 h-6" />
             </div>
             <div>
                <h1 className="text-xl font-black tracking-tight">{periodName}</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{periodCode} • BÁO CÁO PHÂN TÍCH TIẾN ĐỘ</p>
             </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
            <div className="flex bg-white rounded-xl border border-slate-200 p-1">
               <button onClick={() => setCompareBy('CAMPUS')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${compareBy === 'CAMPUS' ? 'bg-[#BE1E2E] text-white' : 'text-slate-400 hover:text-slate-600'}`}>CƠ SỞ</button>
               <button onClick={() => setCompareBy('CLASS')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${compareBy === 'CLASS' ? 'bg-[#BE1E2E] text-white' : 'text-slate-400 hover:text-slate-600'}`}>LỚP</button>
            </div>
            <select value={selectedCampus} onChange={(e) => { setSelectedCampus(e.target.value); setFilterType(e.target.value === 'ALL' ? 'ALL' : 'CAMPUS'); }}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-black outline-none focus:ring-2 focus:ring-[#BE1E2E]/20">
              <option value="ALL">TẤT CẢ CƠ SỞ</option>
              {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Link href="/admin/surveys" className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 font-black rounded-xl transition-all text-[10px] uppercase">
              Thoát
            </Link>
          </div>
        </div>

        {/* KPI Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">CHỈ SỐ NPS</p>
              <h3 className={`text-4xl font-black ${stats.nps !== null && stats.nps > 0 ? 'text-emerald-500' : 'text-[#BE1E2E]'}`}>
                {stats.nps !== null ? stats.nps : '--'}%
              </h3>
           </div>
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">TRUNG BÌNH</p>
              <h3 className="text-4xl font-black text-slate-800">{stats.average}</h3>
           </div>
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">TRUNG VỊ</p>
              <h3 className="text-4xl font-black text-slate-800">{stats.median}</h3>
           </div>
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">PHIẾU ĐÃ NỘP</p>
              <h3 className="text-4xl font-black text-slate-800">{filteredForms.length}</h3>
           </div>
        </div>

        {/* Main Opinion & Overview Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-1 bg-[#1e293b] rounded-3xl shadow-lg flex flex-col overflow-hidden">
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                 <h3 className="text-xs font-black text-white uppercase tracking-widest">TỔNG HỢP Ý KIẾN</h3>
                 <span className="text-emerald-400 text-[9px] font-black">{questionAnalytics.flatMap(q => q.textResponses).length} Ý KIẾN</span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[500px] custom-scrollbar">
                 <table className="w-full text-left">
                    <tbody>
                       {questionAnalytics.flatMap(q => q.textResponses).map((op, idx) => (
                         <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="p-4 align-top w-1/4">
                               <span className="text-[9px] font-black text-slate-400 uppercase">{op.className}</span>
                            </td>
                            <td className="p-4 text-[11px] text-slate-300 leading-relaxed italic border-l border-white/5">
                               "{op.text}"
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>

           <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 border-b border-slate-50 pb-4">
                SO SÁNH TỶ LỆ PHÂN BỔ THEO {compareBy === 'CAMPUS' ? 'CƠ SỞ' : 'LỚP'} (Q1)
              </h3>
              <div className="flex-1 min-h-[400px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={questionAnalytics[0]?.comparisonData || []} margin={{ left: 60, right: 30 }}>
                       <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                       <XAxis type="number" hide />
                       <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}} width={80} />
                       <Tooltip />
                       <Legend wrapperStyle={{paddingTop: '20px'}} iconType="circle" />
                       {Array.from({length: 11}).map((_, score) => (
                          <Bar key={score} dataKey={`score_${score}`} name={`${score}đ`} stackId="a" fill={score >= 9 ? '#10b981' : score >= 7 ? '#fbbf24' : '#BE1E2E'} radius={0} />
                       ))}
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>

        {/* Question Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {questionAnalytics.slice(1).map((q, i) => (
             <div key={q.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-6">
                <div className="flex justify-between items-start gap-4">
                   <h4 className="text-[13px] font-black text-slate-800 leading-tight">
                      <span className="text-[#BE1E2E] mr-2">Q{i + 2}.</span> {q.questionText}
                   </h4>
                   <div className="bg-slate-50 px-4 py-2 rounded-2xl text-center shrink-0 border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 leading-none mb-1">TRUNG BÌNH</p>
                      <p className="text-sm font-black text-slate-700">{q.average || '--'}</p>
                   </div>
                </div>

                <div className="h-[250px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={q.comparisonData.slice(0, 8)} margin={{ left: 50, right: 30 }}>
                         <XAxis type="number" hide />
                         <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} width={70} />
                         <Tooltip />
                         {/* Dynamic bars based on available scores */}
                         {Object.keys(q.distribution).sort((a,b) => Number(a)-Number(b)).map((score, idx) => (
                            <Bar key={score} dataKey={`score_${score}`} stackId="a" fill={COLORS[idx % COLORS.length]} barSize={20} />
                         ))}
                      </BarChart>
                   </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   {q.chartData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                         <span className="text-[10px] font-bold text-slate-500">{item.name}đ:</span>
                         <span className="text-[10px] font-black text-slate-800">{Math.round((item.value / (filteredForms.length || 1)) * 100)}%</span>
                      </div>
                   ))}
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
