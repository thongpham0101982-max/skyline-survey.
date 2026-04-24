'use client'
import { useState, useMemo } from 'react'
import { Building2, GraduationCap, LayoutGrid, BarChart3, PieChart as PieChartIcon, Users, TrendingUp, Info, MessageSquare, User, List } from 'lucide-react'
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

const COLORS = ['#10b981', '#fbbf24', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6']

export function ResultsDashboardClient({ periodId, periodName, periodCode, questions, forms, totalForms }: Props) {
  const [filterType, setFilterType] = useState<'ALL' | 'CAMPUS' | 'CLASS'>('ALL')
  const [selectedCampus, setSelectedCampus] = useState<string>('ALL')
  const [selectedClass, setSelectedClass] = useState<string>('ALL')

  // Helper to parse Grid options
  const getGridLabels = (qId: string) => {
    const q = questions.find(x => x.id === qId)
    if (!q || !q.options) return []
    // Expected format: Row1,Row2,Row3|Col1,Col2
    const parts = q.options.split('|')
    const rows = parts[0].split(',').map(s => s.trim())
    return rows
  }

  // Helper to calculate NPS for a subset of forms
  const calculateNps = (targetForms: Form[]) => {
    let promoters = 0, passives = 0, detractors = 0, totalNpsResponses = 0
    const rawScores: number[] = []

    targetForms.forEach(form => {
      form.responses.forEach(r => {
        const q = questions.find(x => x.id === r.questionId)
        if (!q) return
        if (q.questionType?.toUpperCase() === 'NPS' && r.numericScore !== null) {
          totalNpsResponses++
          const score = Number(r.numericScore)
          rawScores.push(score)
          const max = q.ratingScaleMax || 10
          
          if (max >= 9) { // 10-point scale
            if (score >= 9) promoters++
            else if (score >= 7) passives++
            else detractors++
          } else if (max === 5) { // 5-point scale
            if (score === 5) promoters++
            else if (score === 4) passives++
            else detractors++
          } else { // Generic
            if (score === max) promoters++
            else if (score >= max - 1) passives++
            else detractors++
          }
        }
      })
    })

    const nps = totalNpsResponses > 0 ? Math.round(((promoters - detractors) / totalNpsResponses) * 100) : null
    return { promoters, passives, detractors, totalNpsResponses, nps, rawScores }
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

  // Filter forms based on selection
  const filteredForms = useMemo(() => {
    return forms.filter(f => {
      if (filterType === 'ALL') return true
      if (filterType === 'CAMPUS') return selectedCampus === 'ALL' || f.campusId === selectedCampus
      if (filterType === 'CLASS') return selectedClass === 'ALL' || f.classId === selectedClass
      return true
    })
  }, [forms, filterType, selectedCampus, selectedClass])

  // Main NPS Data
  const npsData = useMemo(() => {
    const data = calculateNps(filteredForms)
    const pieData = [
      { name: 'Promoters', value: data.promoters },
      { name: 'Passives', value: data.passives },
      { name: 'Detractors', value: data.detractors },
    ]
    return { ...data, pieData }
  }, [filteredForms, questions])

  // Campus comparison data
  const campusComparison = useMemo(() => {
    return campuses.map(c => {
      const campusForms = forms.filter(f => f.campusId === c.id)
      const data = calculateNps(campusForms)
      return { ...c, ...data }
    }).sort((a, b) => (b.nps ?? -200) - (a.nps ?? -200))
  }, [campuses, forms, questions])

  // Calculate Average/Distribution per Question
  const questionAnalytics = useMemo(() => {
    return questions.map(q => {
      let sum = 0, count = 0
      const distribution: Record<string, number> = {}
      const textResponses: TextOpinion[] = []
      // For Grid questions: rowKey -> { score -> count }
      const gridDistribution: Record<string, Record<string, number>> = {}

      filteredForms.forEach(form => {
        const r = form.responses.find(x => x.questionId === q.id)
        if (!r) return

        if (r.numericScore !== null) {
          sum += r.numericScore
          count++
          distribution[r.numericScore] = (distribution[r.numericScore] || 0) + 1
        } else if (r.choiceAnswer) {
          if (r.choiceAnswer.startsWith('{')) {
             try {
               const parsed = JSON.parse(r.choiceAnswer)
               Object.entries(parsed).forEach(([rowKey, val]: [string, any]) => {
                 if (!gridDistribution[rowKey]) gridDistribution[rowKey] = {}
                 gridDistribution[rowKey][val] = (gridDistribution[rowKey][val] || 0) + 1
                 distribution[val] = (distribution[val] || 0) + 1 // Keep for legacy
               })
             } catch (e) {
               distribution[r.choiceAnswer] = (distribution[r.choiceAnswer] || 0) + 1
             }
          } else {
            const choices = r.choiceAnswer.split(',').map(s => s.trim())
            choices.forEach(c => {
              distribution[c] = (distribution[c] || 0) + 1
            })
          }
          count++
        } else if (r.textAnswer) {
          if (r.textAnswer.startsWith('{')) {
             // Handle if grid data is in textAnswer
             try {
               const parsed = JSON.parse(r.textAnswer)
               Object.entries(parsed).forEach(([rowKey, val]: [string, any]) => {
                 if (!gridDistribution[rowKey]) gridDistribution[rowKey] = {}
                 gridDistribution[rowKey][val] = (gridDistribution[rowKey][val] || 0) + 1
               })
               count++
             } catch (e) {
               textResponses.push({
                 text: r.textAnswer,
                 respondent: 'Phụ huynh/Học sinh',
                 className: form.className || 'Chưa rõ',
                 campusName: form.campusName || 'Chưa rõ',
                 questionId: q.id
               })
               count++
             }
          } else {
            textResponses.push({
              text: r.textAnswer,
              respondent: 'Phụ huynh/Học sinh',
              className: form.className || 'Chưa rõ',
              campusName: form.campusName || 'Chưa rõ',
              questionId: q.id
            })
            count++
          }
        }
      })

      const average = count > 0 && sum > 0 ? (sum / count).toFixed(2) : null
      const chartData = Object.entries(distribution).map(([name, value]) => ({ name, value }))
        .sort((a,b) => (Number(a.name) || 0) - (Number(b.name) || 0))

      return { ...q, average, count, distribution, chartData, textResponses, gridDistribution }
    })
  }, [questions, filteredForms])

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700 font-outfit">
      {/* Header */}
      <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#BE1E2E]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-2 mb-2">
               <span className="bg-[#BE1E2E]/10 text-[#BE1E2E] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#BE1E2E]/20">
                 Kết quả khảo sát
               </span>
               <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                 {periodCode}
               </span>
             </div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight">{periodName}</h1>
          </div>
          <Link href="/admin/surveys" className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all text-sm">
            Quay lại Danh sách
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
          <button onClick={() => { setFilterType('ALL'); setSelectedCampus('ALL'); setSelectedClass('ALL'); }}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-black transition-all ${filterType === 'ALL' ? 'bg-white text-[#BE1E2E] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Toàn hệ thống
          </button>
          <button onClick={() => setFilterType('CAMPUS')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-black transition-all ${filterType === 'CAMPUS' ? 'bg-white text-[#BE1E2E] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Theo Cơ sở
          </button>
          <button onClick={() => setFilterType('CLASS')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-black transition-all ${filterType === 'CLASS' ? 'bg-white text-[#BE1E2E] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Theo Lớp
          </button>
        </div>

        {filterType !== 'ALL' && (
          <div className="flex gap-4 w-full md:w-auto">
            {(filterType === 'CAMPUS' || filterType === 'CLASS') && (
              <select value={selectedCampus} onChange={(e) => { setSelectedCampus(e.target.value); if (filterType === 'CLASS') setSelectedClass('ALL'); }}
                className="flex-1 md:flex-none px-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-700 font-bold outline-none focus:border-[#BE1E2E] transition-all">
                <option value="ALL">Tất cả Cơ sở</option>
                {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {filterType === 'CLASS' && (
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
                className="flex-1 md:flex-none px-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-700 font-bold outline-none focus:border-[#BE1E2E] transition-all">
                <option value="ALL">Chọn Lớp...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50 flex items-center justify-center shrink-0">
             <Users className="w-8 h-8 text-indigo-500" />
          </div>
          <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phiếu đã nộp</p>
             <h3 className="text-3xl font-black text-slate-800">{filteredForms.length}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-50 flex items-center justify-center shrink-0">
             <TrendingUp className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tỷ lệ tham gia</p>
             <h3 className="text-3xl font-black text-slate-800">
               {totalForms > 0 && filterType === 'ALL' ? Math.round((forms.length / totalForms) * 100) : '--'}%
             </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-6 relative overflow-hidden"
             style={{ background: npsData.nps !== null ? (npsData.nps > 0 ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #fff1f2, #ffe4e6)') : '#fff' }}>
          <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 
            ${npsData.nps !== null ? (npsData.nps > 0 ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-[#BE1E2E] text-white shadow-lg shadow-red-200') : 'bg-slate-100 text-slate-400'}`}>
             <BarChart3 className="w-8 h-8" />
          </div>
          <div className="relative z-10">
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${npsData.nps !== null ? (npsData.nps > 0 ? 'text-emerald-700' : 'text-red-700') : 'text-slate-400'}`}>Chỉ số NPS Tổng</p>
             <h3 className={`text-4xl font-black ${npsData.nps !== null ? (npsData.nps > 0 ? 'text-emerald-600' : 'text-[#BE1E2E]') : 'text-slate-800'}`}>
               {npsData.nps !== null ? npsData.nps : 'N/A'}
             </h3>
          </div>
        </div>
      </div>

      {/* Results by Criterion */}
      <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm space-y-8">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 border-b border-slate-100 pb-4">
          <LayoutGrid className="w-6 h-6 text-[#BE1E2E]" /> Thống kê chi tiết theo Tiêu chí Khảo sát
        </h3>

        {questionAnalytics.length === 0 ? (
           <div className="text-center py-10 text-slate-400 font-bold">Không có tiêu chí nào.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {questionAnalytics.map((q, i) => (
              <div key={q.id} className="p-6 rounded-[1.5rem] bg-slate-50 border border-slate-100 flex flex-col min-h-[350px]">
                 <div className="flex justify-between items-start gap-4 mb-4">
                   <p className="font-bold text-slate-800 text-sm leading-relaxed flex-1">
                     <span className="text-[#BE1E2E] mr-2">Q{i + 1}.</span> {q.questionText}
                   </p>
                   {q.average !== null && (
                     <div className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-center shrink-0 shadow-sm">
                       <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">TB</p>
                       <p className="text-sm font-black text-[#BE1E2E]">{q.average}</p>
                     </div>
                   )}
                 </div>

                 {/* Grid Question Table */}
                 {Object.keys(q.gridDistribution || {}).length > 0 ? (
                   <div className="mt-auto space-y-4">
                      {Object.entries(q.gridDistribution || {}).map(([rowKey, dist], subIdx) => {
                        const labels = getGridLabels(q.id)
                        const rowLabel = labels[parseInt(rowKey)] || `Tiêu chí ${parseInt(rowKey) + 1}`
                        const rowChartData = Object.entries(dist).map(([name, value]) => ({ name, value }))
                          .sort((a,b) => (Number(a.name) || 0) - (Number(b.name) || 0))
                        
                        return (
                          <div key={subIdx} className="bg-white p-3 rounded-xl border border-slate-200">
                             <p className="text-[10px] font-black text-[#BE1E2E] uppercase mb-2 flex items-center gap-2">
                               <List className="w-3 h-3" /> {rowLabel}
                             </p>
                             <table className="w-full text-[9px] text-left">
                                <thead>
                                   <tr className="border-b border-slate-100">
                                      <th className="pb-1 font-black text-slate-400 uppercase">Mức điểm</th>
                                      <th className="pb-1 font-black text-slate-400 uppercase text-right">SL</th>
                                      <th className="pb-1 font-black text-slate-400 uppercase text-right">%</th>
                                   </tr>
                                </thead>
                                <tbody>
                                   {rowChartData.map((item: any) => (
                                      <tr key={item.name} className="border-b border-slate-50/50 last:border-0">
                                         <td className="py-1 font-bold text-slate-600">{item.name}</td>
                                         <td className="py-1 font-black text-slate-900 text-right">{item.value}</td>
                                         <td className="py-1 font-bold text-indigo-500 text-right">
                                           {filteredForms.length > 0 ? ((item.value / filteredForms.length) * 100).toFixed(1) : 0}%
                                         </td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>
                          </div>
                        )
                      })}
                   </div>
                 ) : q.chartData && q.chartData.length > 0 ? (
                   /* Standard Choice/Rating Questions */
                   <div className="flex flex-col gap-4 mt-auto">
                     <div className="h-40 w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={q.chartData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                           <XAxis dataKey="name" tick={{fontSize: 9, fill: "#64748b"}} axisLine={false} tickLine={false} />
                           <YAxis allowDecimals={false} tick={{fontSize: 9, fill: "#64748b"}} axisLine={false} tickLine={false} />
                           <Tooltip cursor={{fill: "#f1f5f9"}} contentStyle={{borderRadius: "12px", border: "none", fontSize: "11px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"}} />
                           <Bar dataKey="value" name="Số lượng" radius={[4, 4, 0, 0]}>
                             {q.chartData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                           </Bar>
                         </BarChart>
                       </ResponsiveContainer>
                     </div>
                     <div className="bg-white rounded-xl border border-slate-100 p-2 overflow-y-auto max-h-32 custom-scrollbar">
                        <table className="w-full text-[9px] text-left">
                           <thead>
                              <tr className="border-b border-slate-50">
                                 <th className="pb-1 font-black text-slate-400 uppercase tracking-wider">Mức/Lựa chọn</th>
                                 <th className="pb-1 font-black text-slate-400 uppercase tracking-wider text-right">SL</th>
                                 <th className="pb-1 font-black text-slate-400 uppercase tracking-wider text-right">%</th>
                              </tr>
                           </thead>
                           <tbody>
                              {q.chartData.map((item: any) => (
                                 <tr key={item.name} className="border-b border-slate-50/50 last:border-0 hover:bg-slate-50">
                                    <td className="py-1 font-bold text-slate-600">{item.name}</td>
                                    <td className="py-1 font-black text-slate-900 text-right">{item.value}</td>
                                    <td className="py-1 font-bold text-indigo-500 text-right">{filteredForms.length > 0 ? ((item.value / filteredForms.length) * 100).toFixed(1) : 0}%</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                   </div>
                 ) : q.textResponses && q.textResponses.length > 0 ? (
                   /* Text Questions (Anonymous) */
                   <div className="mt-auto space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1 mb-2">
                        <MessageSquare className="w-3 h-3" /> Danh sách ý kiến ({q.textResponses.length})
                      </p>
                      <div className="max-h-60 overflow-y-auto custom-scrollbar pr-1 space-y-3">
                        {q.textResponses.map((opinion, idx) => (
                          <div key={idx} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm relative group transition-all hover:border-[#BE1E2E]/30">
                             <p className="text-[11px] text-slate-600 leading-relaxed italic">"{opinion.text}"</p>
                             <div className="mt-2 flex justify-end gap-1">
                                <span className="bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase">{opinion.className}</span>
                                <span className="bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase">{opinion.campusName}</span>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>
                 ) : (
                   <div className="mt-auto h-48 flex items-center justify-center text-slate-300 text-xs font-bold italic border-2 border-dashed border-slate-100 rounded-2xl">
                     Chưa có dữ liệu phản hồi
                   </div>
                 )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
