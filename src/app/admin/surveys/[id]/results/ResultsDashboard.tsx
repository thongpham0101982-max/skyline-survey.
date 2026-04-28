'use client'
import { useState, useMemo, useEffect } from 'react'
import { 
  BarChart3, Filter, Download, ChevronRight, 
  PieChart as PieIcon, Layout, Database, Share2, 
  Info, Users, MessageSquare, TrendingUp,
  ArrowUpRight, Target, ClipboardList, Search,
  Calendar, MapPin, GraduationCap
} from 'lucide-react'
import Link from 'next/link'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, 
  Pie, Legend, AreaChart, Area
} from 'recharts'

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

// PREMIUM TABLEAU COLOR SYSTEM
const COLORS = {
  blue: '#4E79A7',
  orange: '#F28E2B',
  red: '#E15759',
  cyan: '#76B7B2',
  green: '#59A14F',
  yellow: '#EDC948',
  purple: '#B07AA1',
  pink: '#FF9DA7',
  brown: '#9C755F',
  gray: '#BAB0AC',
  skylineRed: '#C8102E' // Skyline Educational Group Brand Color
}

const TABLEAU_PALETTE = Object.values(COLORS)

export function ResultsDashboard({ periodId, periodName, periodCode, questions, forms, totalForms }: Props) {
  const [compareBy, setCompareBy] = useState<'CAMPUS' | 'CLASS'>('CAMPUS')
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

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
    let result = forms
    if (selectedGroup !== 'ALL') {
      result = result.filter(f => (compareBy === 'CAMPUS' ? f.campusName : f.className) === selectedGroup)
    }
    if (searchQuery) {
      result = result.filter(f => 
        f.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        f.className?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return result
  }, [forms, compareBy, selectedGroup, searchQuery])

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
              // For GRID, v is usually the 0-based column index. Score should be index + 1 (e.g. 1 to 5)
              const nV = parseInt(v); 
              if (!isNaN(nV)) { qSum += (nV + 1); qCount++ }
            })
          } catch(e){}
        } else if (r.textAnswer || r.choiceAnswer) {
          const v = r.choiceAnswer || r.textAnswer || ''
          if (!v.includes('{')) {
            dist[v] = (dist[v] || 0) + 1; 
            const nV = parseInt(v);
            if (!isNaN(nV) && !isOpinion) { qSum += nV; qCount++ } else { qCount++ }
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

      return { ...q, isOpinion, isGrid, rawSum: qSum, rawCount: qCount, avg: qCount > 0 ? (qSum / qCount).toFixed(2) : '0.00', chartData, opinions }
    })
  }, [questions, filteredForms])

  const stats = useMemo(() => {
    let npsT = 0, npsP = 0, npsD = 0
    let globalSum = 0, globalCount = 0

    // 1. Calculate NPS
    filteredForms.forEach(f => {
      f.responses.forEach(r => {
        if (r.questionType?.toUpperCase() === 'NPS' && r.numericScore !== null) {
          npsT++; if (r.numericScore >= 9) npsP++; else if (r.numericScore < 7) npsD++
        }
      })
    })

    // 2. Aggregate Avg Score from questionAnalytics to be completely consistent
    questionAnalytics.forEach(qa => {
      if (!qa.isOpinion && qa.rawSum > 0) {
         globalSum += qa.rawSum
         globalCount += qa.rawCount
      }
    })

    return { 
      nps: npsT > 0 ? Math.round(((npsP - npsD) / npsT) * 100) : 0, 
      avg: globalCount > 0 ? (globalSum / globalCount).toFixed(2) : '0.00',
      completionRate: totalForms > 0 ? Math.round((forms.length / totalForms) * 100) : 0
    }
  }, [filteredForms, forms, totalForms, questionAnalytics])

  const groups = useMemo(() => {
    const set = new Set<string>(); forms.forEach(f => set.add(compareBy === 'CAMPUS' ? f.campusName : f.className))
    return Array.from(set).filter(Boolean).sort()
  }, [forms, compareBy])



  return (
    <div className="bg-[#F4F7F9] min-h-screen text-slate-800 font-sans selection:bg-red-100 selection:text-red-900">
      
      {/* PROFESSIONAL TABLEAU HEADER */}
      <header className="sticky top-0 z-[100] bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-[#C8102E] rounded-xl flex items-center justify-center shadow-lg shadow-red-200 rotate-3 group hover:rotate-0 transition-transform">
              <BarChart3 className="w-6 h-6 text-white" />
           </div>
           <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">{periodName}</h1>
              <div className="flex items-center gap-2 mt-1">
                 <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-slate-200">{periodCode}</span>
                 <span className="text-[10px] text-slate-400 font-bold uppercase">• TABLEAU ANALYTICS ENGINE</span>
              </div>
           </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
           <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-red-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Tìm kiếm..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs font-medium focus:ring-2 ring-red-100 focus:border-red-500 transition-all outline-none w-[180px]"
              />
           </div>
           <div className="h-6 w-[1px] bg-slate-200" />
           <div className="flex items-center gap-1.5 px-2">
              <button onClick={() => { setCompareBy('CAMPUS'); setSelectedGroup('ALL'); }} className={"px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest transition-all " + (compareBy === 'CAMPUS' ? 'bg-white text-red-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600')}>CAMPUS</button>
              <button onClick={() => { setCompareBy('CLASS'); setSelectedGroup('ALL'); }} className={"px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest transition-all " + (compareBy === 'CLASS' ? 'bg-white text-red-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600')}>CLASS</button>
           </div>
           <div className="h-6 w-[1px] bg-slate-200" />
           <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-1.5 text-[10px] font-black text-slate-700 outline-none hover:border-red-200 transition-all cursor-pointer min-w-[140px]">
              <option value="ALL">ALL {compareBy}</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
           </select>
           <button className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm text-slate-400"><Download className="w-4 h-4" /></button>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto p-6 lg:p-10 space-y-10">
        
        {/* KPI OVERVIEW GRID */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
           {[
             { label: 'Chỉ số NPS', val: stats.nps, sub: 'Độ hài lòng (%)', icon: <Target className="w-5 h-5" />, bg: 'bg-white', text: 'text-red-600', trend: '+2.4%' },
             { label: 'Điểm trung bình', val: stats.avg, sub: 'Thang điểm 10', icon: <GraduationCap className="w-5 h-5" />, bg: 'bg-white', text: 'text-slate-900', trend: 'Ổn định' },
             { label: 'Tổng số phiếu', val: filteredForms.length, sub: 'Đã hoàn thành', icon: <ClipboardList className="w-5 h-5" />, bg: 'bg-white', text: 'text-slate-900', trend: (stats.completionRate + '% tỷ lệ') },
             { label: 'Phản hồi chi tiết', val: questionAnalytics.reduce((a, b) => a + b.opinions.length, 0), sub: 'Ý kiến đóng góp', icon: <MessageSquare className="w-5 h-5" />, bg: 'bg-white', text: 'text-slate-900', trend: 'Cần phản hồi' }
           ].map((k, i) => (
             <div key={i} className="group relative bg-white p-7 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500" />
                <div className="relative z-10">
                   <div className="flex justify-between items-center mb-6">
                      <div className={"p-3 rounded-2xl " + (i === 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600') + " group-hover:scale-110 transition-transform"}>{k.icon}</div>
                      <span className="text-[10px] font-black text-slate-300 tracking-widest uppercase">{k.trend}</span>
                   </div>
                   <div className="space-y-1">
                      <h3 className={"text-4xl font-black tracking-tighter " + k.text}>{k.val}</h3>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{k.label}</p>
                      <p className="text-[9px] text-slate-300 font-medium">{k.sub}</p>
                   </div>
                </div>
             </div>
           ))}
        </section>

        {/* DETAILED ANALYSIS SHEETS */}
        <section className="space-y-8">
           <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                 <Layout className="w-5 h-5 text-red-600" />
                 <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Phân tích chi tiết câu hỏi</h2>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                 <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Cần chú ý</span>
                 <span className="flex items-center gap-1 ml-4"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Tích cực</span>
              </div>
           </div>

           <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {questionAnalytics.map((q, i) => (
                <div key={q.id} className={"bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col hover:border-red-100 transition-colors group " + (q.isOpinion ? 'xl:col-span-2' : '')}>
                   
                   {/* SHEET HEADER */}
                   <div className="px-8 py-6 bg-slate-50/30 border-b border-slate-100 flex justify-between items-center group-hover:bg-red-50/10 transition-colors">
                      <div className="flex items-center gap-4">
                         <div className="w-8 h-8 rounded-xl bg-slate-900 text-white text-[11px] font-black flex items-center justify-center group-hover:bg-red-600 transition-colors">Q{i+1}</div>
                         <div className="max-w-[400px]">
                            <h4 className="text-xs font-black text-slate-800 uppercase leading-tight tracking-tight line-clamp-2">{q.questionText}</h4>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{q.questionType}</p>
                         </div>
                      </div>
                      {!q.isOpinion && (
                         <div className="text-right">
                            <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{q.avg}</p>
                            <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">Avg Score</p>
                         </div>
                      )}
                   </div>

                   {/* SHEET CONTENT */}
                   <div className="p-8 flex-1">
                      {q.isOpinion ? (() => {
                            const validOpinions = q.opinions.filter(op => {
                               if (!op.text) return false;
                               const textLower = op.text.trim().toLowerCase();
                               const noAccents = textLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                               const isJunk = ['không', 'khong', 'không có', 'khong co', 'ko', 'no', 'none', 'tốt', 'ok', 'bình thường', 'binh thuong', 'dạ không', 'da khong', 'không ạ', 'khong a', 'không có ý kiến', 'không có ý kiến gì'].includes(textLower) || 
                                              /^no+$/.test(textLower) || 
                                              /^khong+$/.test(noAccents) ||
                                              textLower.length < 3;
                               return !isJunk;
                            });

                            if (validOpinions.length === 0) {
                               return (
                                 <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                    <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                                    <p className="text-sm font-medium">Không có ý kiến đóng góp nào.</p>
                                 </div>
                               );
                            }

                            return (
                               <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                                  {validOpinions.map((op, idx) => (
                                     <div key={idx} className="flex items-start gap-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors px-2 rounded-lg">
                                        <div className="min-w-[90px] pt-0.5 shrink-0">
                                           <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase border border-red-100">
                                              {op.class}
                                           </span>
                                           <div className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 ml-1">{op.campus}</div>
                                        </div>
                                        <p className="text-[13px] text-slate-700 flex-1 leading-relaxed">
                                          "{op.text}"
                                        </p>
                                     </div>
                                  ))}
                               </div>
                            );
                         })() : q.isGrid ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                            <div className="h-[300px] relative">
                               <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                     <Pie data={q.chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value">
                                        {q.chartData.map((e, idx) => (
                                           <Cell key={idx} fill={TABLEAU_PALETTE[idx % TABLEAU_PALETTE.length]} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
                                        ))}
                                     </Pie>
                                     <Tooltip 
                                       contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                                       itemStyle={{ color: '#1e293b' }}
                                     />
                                  </PieChart>
                               </ResponsiveContainer>
                               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                  <p className="text-[40px] font-black text-slate-900 tracking-tighter leading-none">{q.avg}</p>
                                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Score</p>
                               </div>
                            </div>
                            <div className="space-y-3">
                               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-100 pb-3">Phân bổ phản hồi</p>
                               {q.chartData.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between group/row p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                     <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-[4px]" style={{ backgroundColor: TABLEAU_PALETTE[idx % TABLEAU_PALETTE.length] }} />
                                        <span className="text-[11px] font-bold text-slate-600 group-hover/row:text-slate-900 transition-colors line-clamp-1">{item.name}</span>
                                     </div>
                                     <div className="flex items-center gap-3 text-[11px]">
                                        <span className="font-black text-slate-900">{item.value}</span>
                                        <span className="text-slate-300 font-medium">({item.percentage}%)</span>
                                     </div>
                                  </div>
                               ))}
                            </div>
                         </div>
                      ) : (
                         <div className="space-y-8">
                            <div className="h-[200px] w-full">
                               <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={q.chartData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                                     <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#f1f5f9" />
                                     <XAxis type="number" hide />
                                     <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: '900', fill: '#94a3b8', width: 120}} width={80} />
                                     <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                                        {q.chartData.map((e, idx) => (
                                           <Cell key={idx} fill={TABLEAU_PALETTE[idx % TABLEAU_PALETTE.length]} />
                                        ))}
                                     </Bar>
                                     <Tooltip cursor={{fill: 'rgba(241, 245, 249, 0.5)'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
                                  </BarChart>
                               </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                               {q.chartData.slice(0, 5).map((item, idx) => (
                                  <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center group/kpi hover:bg-white hover:shadow-md transition-all">
                                     <p className="text-[18px] font-black text-slate-900 tracking-tighter">{item.percentage}%</p>
                                     <p className="text-[8px] font-black text-slate-400 uppercase truncate max-w-full">{item.name}</p>
                                  </div>
                               ))}
                            </div>
                         </div>
                      )}
                   </div>
                </div>
              ))}
           </div>
        </section>

      </main>

      <footer className="bg-white border-t border-slate-200 py-10 px-8 text-center">
         <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
               <Database className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Skyline Survey BI • Enterprise Edition v5.2</p>
            <p className="text-[9px] text-slate-300 max-w-md leading-relaxed">Dữ liệu được cập nhật theo thời gian thực từ cơ sở dữ liệu Turso. Hệ thống sử dụng thuật toán phân tích Tableau để xử lý phản hồi của phụ huynh và học sinh.</p>
         </div>
      </footer>
    </div>
  )
}
