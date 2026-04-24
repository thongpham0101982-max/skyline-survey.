'use client'
import { useState, useMemo } from 'react'
import { Building2, GraduationCap, LayoutGrid, BarChart3, PieChart as PieChartIcon, Users, TrendingUp } from 'lucide-react'
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

const COLORS = ['#10b981', '#fbbf24', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6']

export function ResultsDashboardClient({ periodId, periodName, periodCode, questions, forms, totalForms }: Props) {
  const [filterType, setFilterType] = useState<'ALL' | 'CAMPUS' | 'CLASS'>('ALL')
  const [selectedCampus, setSelectedCampus] = useState<string>('ALL')
  const [selectedClass, setSelectedClass] = useState<string>('ALL')

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

  // Calculate NPS
  const npsData = useMemo(() => {
    let promoters = 0, passives = 0, detractors = 0, totalNpsResponses = 0

    filteredForms.forEach(form => {
      form.responses.forEach(r => {
        const q = questions.find(x => x.id === r.questionId)
        if (!q) return
        if (q.questionType?.toUpperCase() === 'NPS' && r.numericScore !== null) {
          totalNpsResponses++
          const max = q.ratingScaleMax || 10
          if (max >= 9) { // 10-point scale
            if (r.numericScore >= 9) promoters++
            else if (r.numericScore >= 7) passives++
            else detractors++
          } else if (max === 5) { // 5-point scale
            if (r.numericScore === 5) promoters++
            else if (r.numericScore === 4) passives++
            else detractors++
          } else { // Generic
            if (r.numericScore === max) promoters++
            else if (r.numericScore >= max - 1) passives++
            else detractors++
          }
        }
      })
    })

    const nps = totalNpsResponses > 0 ? Math.round(((promoters - detractors) / totalNpsResponses) * 100) : null
    
    const pieData = [
      { name: 'Promoters', value: promoters },
      { name: 'Passives', value: passives },
      { name: 'Detractors', value: detractors },
    ]

    return { promoters, passives, detractors, totalNpsResponses, nps, pieData }
  }, [filteredForms, questions])

  // Calculate Average/Distribution per Question
  const questionAnalytics = useMemo(() => {
    return questions.map(q => {
      let sum = 0, count = 0
      const distribution: Record<string, number> = {}

      filteredForms.forEach(form => {
        const r = form.responses.find(x => x.questionId === q.id)
        if (!r) return

        if (r.numericScore !== null) {
          sum += r.numericScore
          count++
          distribution[r.numericScore] = (distribution[r.numericScore] || 0) + 1
        } else if (r.choiceAnswer) {
          const choices = r.choiceAnswer.split(',').map(s => s.trim())
          choices.forEach(c => {
            distribution[c] = (distribution[c] || 0) + 1
          })
          count++
        }
      })

      const average = count > 0 && sum > 0 ? (sum / count).toFixed(2) : null
      
      const chartData = Object.entries(distribution).map(([name, value]) => ({
        name: name,
        value: value
      })).sort((a,b) => {
        // Try to sort numerically if keys are numbers
        const numA = Number(a.name)
        const numB = Number(b.name)
        if(!isNaN(numA) && !isNaN(numB)) return numA - numB
        return a.name.localeCompare(b.name)
      })

      return { ...q, average, count, distribution, chartData }
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

      {/* NPS Breakdown Chart */}
      {npsData.totalNpsResponses > 0 && (
        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
           <div>
               <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-6">
                 <PieChartIcon className="w-5 h-5 text-indigo-500" /> Phân bổ NPS (Tổng {npsData.totalNpsResponses} phản hồi)
               </h3>
               
               <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <span className="font-bold text-emerald-700">Promoters (Ủng hộ)</span>
                    <div className="text-right">
                       <p className="text-lg font-black text-emerald-600">{npsData.promoters}</p>
                       <p className="text-xs font-bold text-emerald-600/70">{(npsData.promoters/npsData.totalNpsResponses*100).toFixed(1)}%</p>
                    </div>
                 </div>
                 <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-100">
                    <span className="font-bold text-amber-700">Passives (Bình thường)</span>
                    <div className="text-right">
                       <p className="text-lg font-black text-amber-600">{npsData.passives}</p>
                       <p className="text-xs font-bold text-amber-600/70">{(npsData.passives/npsData.totalNpsResponses*100).toFixed(1)}%</p>
                    </div>
                 </div>
                 <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 border border-red-100">
                    <span className="font-bold text-[#BE1E2E]">Detractors (Chỉ trích)</span>
                    <div className="text-right">
                       <p className="text-lg font-black text-[#BE1E2E]">{npsData.detractors}</p>
                       <p className="text-xs font-bold text-[#BE1E2E]/70">{(npsData.detractors/npsData.totalNpsResponses*100).toFixed(1)}%</p>
                    </div>
                 </div>
               </div>
           </div>
           
           <div className="h-64 md:h-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={npsData.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#fbbf24" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} phản hồi`, 'Số lượng']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
           </div>
        </div>
      )}

      {/* Results by Criterion */}
      <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm space-y-8">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 border-b border-slate-100 pb-4">
          <LayoutGrid className="w-6 h-6 text-[#BE1E2E]" /> Thống kê chi tiết theo Tiêu chí Khảo sát
        </h3>

        {questionAnalytics.length === 0 ? (
           <div className="text-center py-10 text-slate-400 font-bold">Không có tiêu chí nào.</div>
        ) : (
          <div className="space-y-8">
            {questionAnalytics.map((q, i) => (
              <div key={q.id} className="p-6 rounded-[1.5rem] bg-slate-50 border border-slate-100">
                 <div className="flex justify-between items-start gap-4 mb-6">
                   <p className="font-bold text-slate-800 text-sm leading-relaxed flex-1">
                     <span className="text-[#BE1E2E] mr-2">Câu {i + 1}.</span> {q.questionText}
                   </p>
                   {q.average !== null && (
                     <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-center shrink-0">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Điểm TB</p>
                       <p className="text-xl font-black text-[#BE1E2E]">{q.average} <span className="text-xs text-slate-400">/ {q.ratingScaleMax}</span></p>
                     </div>
                   )}
                 </div>

                 {/* Chart for Distribution */}
                 {q.chartData && q.chartData.length > 0 && (
                   <div className="h-64 w-full mt-4">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={q.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                         <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                         <YAxis allowDecimals={false} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                         <Tooltip 
                           cursor={{fill: '#f1f5f9'}}
                           contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                         />
                         <Bar dataKey="value" name="Số lượng" radius={[4, 4, 0, 0]}>
                           {q.chartData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                         </Bar>
                       </BarChart>
                     </ResponsiveContainer>
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
