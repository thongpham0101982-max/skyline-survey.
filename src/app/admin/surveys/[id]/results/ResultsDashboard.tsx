'use client'
import { useState, useMemo, useEffect } from 'react'
import { Building2, GraduationCap, LayoutGrid, BarChart3, PieChart as PieChartIcon, Users, TrendingUp, Info, MessageSquare, User, List, Target, Hash, Filter, Zap, CheckCircle2 } from 'lucide-react'
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

  const getGridLabels = (qId: string) => {
    const q = questions.find(x => x.id === qId)
    if (!q || !q.options) return []
    const parts = q.options.split('|')
    const rows = parts[0].split(',').map(s => s.trim())
    return rows
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
    const average = scoreCount > 0 ? (totalScore / scoreCount).toFixed(2) : '0'
    let median = 0
    if (allScores.length > 0) {
      const sorted = [...allScores].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    }
    return { nps, average, median: median.toFixed(2), totalResponses: scoreCount }
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
               qSum += (Number(val) || 0)
               qCount++
             })
           } catch (e) {}
        } else if (r.textAnswer) {
          textResponses.push({
            text: r.textAnswer,
            respondent: 'Phụ huynh/Học sinh',
            className: form.className || 'Chưa rõ',
            campusName: form.campusName || 'Chưa rõ',
            questionId: q.id
          })
        }
      })

      const totalResponsesForQ = qCount || 1
      const chartData = Object.entries(distribution).map(([name, value]) => ({ name, value, percentage: Math.round((value / totalResponsesForQ) * 100) }))
        .sort((a,b) => (Number(a.name) || 0) - (Number(b.name) || 0))

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
    <div className="bg-[#f1f5f9] min-h-screen p-4 lg:p-8 font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-8 border border-slate-100">
          <div className="flex items-center gap-6">
             <div className="w-16 h-16 bg-[#BE1E2E] rounded-[1.5rem] flex items-center justify-center text-white shadow-xl">
               <BarChart3 className="w-8 h-8" />
             </div>
             <div>
                <h1 className="text-3xl font-black text-slate-900">{periodName}</h1>
                <p className="text-[10px] font-black text-[#BE1E2E] uppercase tracking-widest mt-1">DASHBOARD PHÂN TÍCH CHÍNH XÁC v4.0</p>
             </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-2.5 rounded-3xl border border-slate-200">
            <div className="flex bg-white rounded-2xl border border-slate-200 p-1">
               <button onClick={() => setCompareBy('CAMPUS')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${compareBy === 'CAMPUS' ? 'bg-[#BE1E2E] text-white' : 'text-slate-400 hover:text-slate-600'}`}>CƠ SỞ</button>
               <button onClick={() => setCompareBy('CLASS')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${compareBy === 'CLASS' ? 'bg-[#BE1E2E] text-white' : 'text-slate-400 hover:text-slate-600'}`}>LỚP</button>
            </div>
            <select value={selectedCampus} onChange={(e) => { setSelectedCampus(e.target.value); setFilterType(e.target.value === 'ALL' ? 'ALL' : 'CAMPUS'); }}
              className="px-6 py-3 rounded-2xl border-2 border-slate-200 bg-white text-xs font-black outline-none focus:border-[#BE1E2E]">
              <option value="ALL">TẤT CẢ CƠ SỞ</option>
              {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Link href="/admin/surveys" className="px-6 py-3 bg-slate-900 text-white font-black rounded-2xl text-xs uppercase shadow-lg">Quay lại</Link>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
           {[
             { label: 'CHỈ SỐ NPS', value: stats.nps + '%', color: 'text-[#BE1E2E]' },
             { label: 'ĐIỂM TRUNG BÌNH', value: stats.average, color: 'text-slate-800' },
             { label: 'ĐIỂM TRUNG VỊ', value: stats.median, color: 'text-slate-800' },
             { label: 'PHIẾU ĐÃ NỘP', value: filteredForms.length, color: 'text-slate-800' }
           ].map((kpi, idx) => (
             <div key={idx} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl text-center">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">{kpi.label}</p>
                <h3 className={`text-5xl font-black ${kpi.color}`}>{kpi.value}</h3>
             </div>
           ))}
        </div>

        {/* Questions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
           {questionAnalytics.map((q, i) => (
             <div key={q.id} className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl p-10 flex flex-col gap-8">
                <div className="flex justify-between items-start gap-6 border-b border-slate-50 pb-6">
                   <h4 className="text-[15px] font-black text-slate-800 leading-tight flex-1">
                      <span className="text-[#BE1E2E]/20 text-3xl font-black mr-2">Q{i + 1}</span> {q.questionText}
                   </h4>
                   <div className="bg-[#BE1E2E]/5 px-5 py-2.5 rounded-2xl border border-[#BE1E2E]/10 text-center shrink-0">
                      <p className="text-[9px] font-black text-[#BE1E2E] mb-1">AVERAGE</p>
                      <p className="text-xl font-black text-slate-800">{q.average}</p>
                   </div>
                </div>

                {/* Stacked Comparison Chart per Question */}
                <div className="h-[250px] w-full">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">SO SÁNH THEO {compareBy === 'CAMPUS' ? 'CƠ SỞ' : 'LỚP'}</p>
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={q.comparisonData.slice(0, 10)} margin={{ left: 60 }}>
                         <XAxis type="number" hide />
                         <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#475569'}} width={80} />
                         <Tooltip cursor={{fill: '#f8fafc'}} />
                         {Object.keys(q.distribution).sort((a,b) => Number(a)-Number(b)).map((score, idx) => (
                            <Bar key={score} dataKey={`score_${score}`} stackId="a" fill={score >= 9 ? '#10b981' : score >= 7 ? '#fbbf24' : '#BE1E2E'} barSize={25} />
                         ))}
                      </BarChart>
                   </ResponsiveContainer>
                </div>

                {/* Summary Table for Grid questions */}
                {Object.keys(q.gridDistribution).length > 0 && (
                   <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">CHI TIẾT THEO TIÊU CHÍ</p>
                      <div className="space-y-4">
                         {Object.entries(q.gridDistribution).map(([rowKey, dist], idx) => {
                            const labels = getGridLabels(q.id)
                            const label = labels[parseInt(rowKey)] || `Tiêu chí ${parseInt(rowKey) + 1}`
                            const totalRow = Object.values(dist).reduce((a, b) => a + b, 0) || 1
                            return (
                               <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                  <p className="text-[11px] font-black text-slate-700 mb-3 uppercase flex items-center gap-2">
                                     <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {label}
                                  </p>
                                  <div className="grid grid-cols-5 gap-2">
                                     {Object.entries(dist).sort((a,b) => Number(a[0])-Number(b[0])).map(([score, count]) => (
                                        <div key={score} className="text-center">
                                           <p className="text-[8px] font-black text-slate-400">{score}đ</p>
                                           <p className="text-[10px] font-black text-slate-800">{Math.round((count / totalRow) * 100)}%</p>
                                        </div>
                                     ))}
                                  </div>
                               </div>
                            )
                         })}
                      </div>
                   </div>
                )}

                {/* Simple distribution grid */}
                {Object.keys(q.gridDistribution).length === 0 && (
                   <div className="grid grid-cols-3 gap-3 mt-auto">
                      {q.chartData.map((item, idx) => (
                         <div key={idx} className="flex flex-col items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase mb-1">{item.name} ĐIỂM</span>
                            <span className="text-sm font-black text-slate-800">{item.percentage}%</span>
                         </div>
                      ))}
                   </div>
                )}
             </div>
           ))}
        </div>

      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  )
}
