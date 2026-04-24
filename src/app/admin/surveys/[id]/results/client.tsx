'use client'
import { useState, useMemo } from 'react'
import { Building2, GraduationCap, LayoutGrid, BarChart3, PieChart as PieChartIcon, Users, TrendingUp, Info, MessageSquare, User, List, Target, Hash } from 'lucide-react'
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

const COLORS = ['#BE1E2E', '#3b82f6', '#10b981', '#fbbf24', '#8b5cf6', '#ec4899', '#6366f1']

export function ResultsDashboardClient({ periodId, periodName, periodCode, questions, forms, totalForms }: Props) {
  const [filterType, setFilterType] = useState<'ALL' | 'CAMPUS' | 'CLASS'>('ALL')
  const [selectedCampus, setSelectedCampus] = useState<string>('ALL')
  const [selectedClass, setSelectedClass] = useState<string>('ALL')

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
    
    // Calculate Median
    let median = 0
    if (allScores.length > 0) {
      const sorted = [...allScores].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    }

    return { promoters, passives, detractors, totalNpsResponses, nps, average, median: median.toFixed(2), totalResponses: scoreCount }
  }

  // Derive unique campuses and classes
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

      filteredForms.forEach(form => {
        const r = form.responses.find(x => x.questionId === q.id)
        if (!r) return

        if (r.numericScore !== null) {
          qSum += r.numericScore
          qCount++
          distribution[r.numericScore] = (distribution[r.numericScore] || 0) + 1
        } else if (r.choiceAnswer) {
          if (r.choiceAnswer.startsWith('{')) {
             try {
               const parsed = JSON.parse(r.choiceAnswer)
               Object.entries(parsed).forEach(([rowKey, val]: [string, any]) => {
                 if (rowKey === 'rows') return
                 if (!gridDistribution[rowKey]) gridDistribution[rowKey] = {}
                 gridDistribution[rowKey][val] = (gridDistribution[rowKey][val] || 0) + 1
               })
             } catch (e) {}
          } else {
            const choices = r.choiceAnswer.split(',').map(s => s.trim())
            choices.forEach(c => {
              distribution[c] = (distribution[c] || 0) + 1
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

      return { ...q, average, count: qCount, distribution, chartData, textResponses, gridDistribution }
    })
  }, [questions, filteredForms])

  return (
    <div className="bg-[#f8fafc] min-h-screen p-6 font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Top Navigation & Filters */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-[#BE1E2E] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-100">
               <BarChart3 className="w-6 h-6" />
             </div>
             <div>
                <h1 className="text-xl font-black tracking-tight">{periodName}</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{periodCode} • BÁO CÁO PHÂN TÍCH</p>
             </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
            <select value={selectedCampus} onChange={(e) => { setSelectedCampus(e.target.value); setFilterType(e.target.value === 'ALL' ? 'ALL' : 'CAMPUS'); }}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-black outline-none focus:ring-2 focus:ring-[#BE1E2E]/20 transition-all">
              <option value="ALL">TẤT CẢ CƠ SỞ</option>
              {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); if (e.target.value !== 'ALL') setFilterType('CLASS'); }}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-black outline-none focus:ring-2 focus:ring-[#BE1E2E]/20 transition-all">
              <option value="ALL">TẤT CẢ LỚP</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Link href="/admin/surveys" className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 font-black rounded-xl transition-all text-[10px] uppercase">
              Thoát
            </Link>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">CHỈ SỐ NPS</p>
              <h3 className={`text-4xl font-black relative z-10 ${stats.nps !== null && stats.nps > 0 ? 'text-emerald-500' : 'text-[#BE1E2E]'}`}>
                {stats.nps !== null ? stats.nps : '--'}%
              </h3>
              <div className="mt-2 text-[9px] font-bold text-slate-400 uppercase">N = {stats.totalNpsResponses}</div>
           </div>

           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">ĐIỂM TRUNG BÌNH</p>
              <h3 className="text-4xl font-black text-slate-800 relative z-10">{stats.average}</h3>
              <div className="mt-2 text-[9px] font-bold text-slate-400 uppercase">THANG ĐIỂM 10</div>
           </div>

           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">ĐIỂM TRUNG VỊ</p>
              <h3 className="text-4xl font-black text-slate-800 relative z-10">{stats.median}</h3>
              <div className="mt-2 text-[9px] font-bold text-slate-400 uppercase">MEDIAN SCORE</div>
           </div>

           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">PHẢN HỒI THU VỀ</p>
              <h3 className="text-4xl font-black text-slate-800 relative z-10">{filteredForms.length}</h3>
              <div className="mt-2 text-[9px] font-bold text-slate-400 uppercase">TỔNG PHIẾU NỘP</div>
           </div>
        </div>

        {/* Grid 1: Opinions & Main Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-[#1e293b] p-4 flex items-center justify-between">
                 <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                   <MessageSquare className="w-4 h-4 text-emerald-400" /> TỔNG HỢP Ý KIẾN
                 </h3>
                 <span className="bg-white/10 text-white/50 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase">LỚP | NỘI DUNG</span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[500px] custom-scrollbar p-0">
                 <table className="w-full text-left border-collapse">
                    <tbody>
                       {questionAnalytics.flatMap(q => q.textResponses).slice(0, 30).map((op, idx) => (
                         <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="p-3 align-top">
                               <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[9px] font-black uppercase whitespace-nowrap">{op.className}</span>
                            </td>
                            <td className="p-3 text-[11px] text-slate-600 leading-relaxed italic border-l border-slate-50">
                               "{op.text}"
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>

           <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#BE1E2E]" /> PHÂN BỔ ĐIỂM SỐ CHI TIẾT
                 </h3>
                 <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#BE1E2E]" /> NPS</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-200" /> TRUNG BÌNH</div>
                 </div>
              </div>
              <div className="flex-1 min-h-[350px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={questionAnalytics[0]?.chartData || []} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} />
                       <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                       <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                       <Bar dataKey="value" fill="#BE1E2E" radius={[6, 6, 0, 0]} barSize={40}>
                          {(questionAnalytics[0]?.chartData || []).map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={index > 7 ? '#10b981' : index > 5 ? '#fbbf24' : '#BE1E2E'} />
                          ))}
                       </Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {questionAnalytics.slice(1).map((q, i) => (
             <div key={q.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col h-full group hover:border-[#BE1E2E]/20 transition-all">
                <div className="flex justify-between items-start gap-4 mb-6">
                   <h4 className="text-[11px] font-black text-slate-800 leading-tight flex-1 group-hover:text-[#BE1E2E] transition-colors">
                     <span className="text-slate-300 mr-1">#{i + 2}</span> {q.questionText}
                   </h4>
                   <div className="bg-slate-50 px-3 py-1.5 rounded-xl text-center border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">TB</p>
                      <p className="text-xs font-black text-slate-700">{q.average || '--'}</p>
                   </div>
                </div>

                {Object.keys(q.gridDistribution || {}).length > 0 ? (
                   <div className="space-y-3">
                      {Object.entries(q.gridDistribution || {}).map(([rowKey, dist], subIdx) => {
                         const labels = getGridLabels(q.id)
                         const rowLabel = labels[parseInt(rowKey)] || `Tiêu chí ${parseInt(rowKey) + 1}`
                         const rowData = Object.entries(dist).map(([name, value]) => ({ name, value }))
                            .sort((a,b) => (Number(a.name) || 0) - (Number(b.name) || 0))
                         
                         return (
                            <div key={subIdx} className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                               <p className="text-[9px] font-black text-slate-500 uppercase mb-2 truncate">{rowLabel}</p>
                               <div className="flex flex-wrap gap-2">
                                  {rowData.map((item: any) => (
                                     <div key={item.name} className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-100">
                                        <span className="text-[9px] font-black text-slate-400">{item.name}đ:</span>
                                        <span className="text-[9px] font-black text-[#BE1E2E]">{item.value}</span>
                                     </div>
                                  ))}
                               </div>
                            </div>
                         )
                      })}
                   </div>
                ) : q.chartData && q.chartData.length > 0 ? (
                   <div className="flex-1 flex flex-col">
                      <div className="h-40 w-full mb-4">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                               <Pie data={q.chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value">
                                  {q.chartData.map((entry, index) => (
                                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                               </Pie>
                               <Tooltip />
                            </PieChart>
                         </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-auto">
                         {q.chartData.slice(0, 4).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                               <span className="text-[9px] font-bold text-slate-500 truncate max-w-[60px]">{item.name}</span>
                               <span className="text-[9px] font-black text-slate-800">{Math.round((item.value / filteredForms.length) * 100)}%</span>
                            </div>
                         ))}
                      </div>
                   </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-slate-300 text-[10px] font-black uppercase italic">
                    Chưa có phản hồi
                  </div>
                )}
             </div>
           ))}
        </div>
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  )
}
