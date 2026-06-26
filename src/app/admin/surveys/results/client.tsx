"use client"
import { useState, useMemo } from "react"
import Link from "next/link"
import { SurveyTabs } from "@/components/SurveyTabs"
import { 
  BarChart3, Search, Filter, Calendar, 
  ArrowUpRight, AlertCircle, ChevronRight, Target, ClipboardList 
} from "lucide-react"

interface SurveyStat {
  id: string
  code: string
  name: string
  status: string
  isActive: boolean
  startDate: string
  endDate: string
  academicYear: { id: string, name: string }
  totalForms: number
  submittedForms: number
  npsScore: number | null
  avgScore: string
}

interface Year {
  id: string
  name: string
  status: string
}

interface Props {
  surveyStats: SurveyStat[]
  years: Year[]
}

export function ResultsPageClient({ surveyStats, years }: Props) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedYear, setSelectedYear] = useState<string>("ALL")

  const filteredStats = useMemo(() => {
    return surveyStats.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.code.toLowerCase().includes(searchQuery.toLowerCase())
      const matchYear = selectedYear === "ALL" || s.academicYear?.name === selectedYear
      return matchSearch && matchYear
    })
  }, [surveyStats, searchQuery, selectedYear])

  const activeYearName = years.find(y => y.status === "ACTIVE")?.name || ""

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#00A99D] font-black text-[10px] uppercase tracking-[0.2em]">
            <Target className="w-3 h-3 animate-pulse" /> Skyline Analytics Hub
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Kết quả Khảo sát</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Theo dõi chỉ số NPS, điểm đánh giá và xem báo cáo phân tích chi tiết của phụ huynh học sinh.</p>
        </div>

        {activeYearName && (
          <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <Calendar className="w-5 h-5 text-[#00A99D]" />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Năm học</p>
              <p className="text-sm font-black text-slate-800">{activeYearName}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <SurveyTabs activeTab="results" />

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-[#00A99D]/20 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#00A99D] transition-colors" />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo tên hoặc mã đợt..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full hover:bg-slate-100/50 pl-10 pr-4 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/10 focus:border-[#00A99D] transition-all outline-none text-xs font-semibold"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full md:w-48 hover:bg-slate-100/50 text-xs font-black text-slate-700 outline-none hover:border-[#00A99D] focus:border-[#00A99D] transition-all cursor-pointer text-xs font-semibold"
          >
            <option value="ALL">Tất cả năm học</option>
            {years.map(y => <option key={y.id} value={y.name}>{y.name}</option>)}
          </select>
        </div>
      </div>

      {/* Survey List */}
      <div className="grid gap-6">
        {filteredStats.map((s) => {
          const rate = s.totalForms > 0 ? Math.round((s.submittedForms / s.totalForms) * 100) : 0

          // Determine NPS style
          let npsBg = "bg-slate-50 text-slate-500 border-slate-200"
          let npsLabel = "N/A"
          if (s.npsScore !== null) {
            if (s.npsScore >= 50) {
              npsBg = "bg-emerald-50 text-emerald-600 border-emerald-100"
              npsLabel = `+${s.npsScore} %`
            } else if (s.npsScore >= 0) {
              npsBg = "bg-amber-50 text-amber-600 border-amber-100"
              npsLabel = `${s.npsScore} %`
            } else {
              npsBg = "bg-rose-50 text-rose-600 border-rose-100"
              npsLabel = `${s.npsScore} %`
            }
          }

          return (
            <div 
              key={s.id} 
              className="bg-white rounded-[2rem] border-2 border-[#00A99D]/20 hover:border-[#00A99D]/40 hover:shadow-xl transition-all duration-300 p-6 group relative overflow-hidden"
            >
              {/* Subtle top decoration */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#00A99D]/10 group-hover:bg-[#00A99D]/30 transition-colors" />

              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                {/* Left side: basic details */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                      s.status === "ACTIVE" 
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                        : "bg-slate-100 text-slate-400 border-slate-200"
                    }`}>
                      {s.status === "ACTIVE" ? "Đang tiến hành" : s.status}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">{s.code}</span>
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#00A99D]/10 text-[#00A99D] border border-[#00A99D]/20">{s.academicYear?.name}</span>
                  </div>

                  <h3 className="text-xl font-black text-slate-800 leading-snug group-hover:text-[#00A99D] transition-colors">{s.name}</h3>

                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Hạn: {new Date(s.startDate).toLocaleDateString("vi-VN")} - {new Date(s.endDate).toLocaleDateString("vi-VN")}</span>
                  </div>
                </div>

                {/* Middle: stats grid */}
                <div className="grid grid-cols-3 gap-6 lg:border-l lg:border-slate-100 lg:pl-8 py-2 min-w-[280px]">
                  {/* Completion stat */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none block">Tiến độ</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-slate-800">{rate}%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold block">{s.submittedForms}/{s.totalForms} phiếu</span>
                  </div>

                  {/* NPS score */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none block">Chỉ số NPS</span>
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg border text-sm font-black ${npsBg}`}>
                      {npsLabel}
                    </span>
                  </div>

                  {/* Avg Score */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none block">Điểm TB</span>
                    <span className="text-xl font-black text-slate-800 block">{s.avgScore}</span>
                    <span className="text-[10px] text-slate-400 font-bold block">Thang điểm 5</span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="shrink-0 flex items-center">
                  <Link
                    href={`/admin/surveys/${s.id}/results`}
                    className="w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-black text-white shadow-xs transition-all hover:scale-105 active:scale-95 whitespace-nowrap bg-[#00A99D] hover:bg-[#008f89] border border-[#00A99D] shadow-[#00A99D]/20"
                  >
                    <BarChart3 className="w-4 h-4" /> Báo cáo chi tiết <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          )
        })}

        {filteredStats.length === 0 && (
          <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-12 text-center text-slate-400 font-bold">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            Không tìm thấy đợt khảo sát nào phù hợp.
          </div>
        )}
      </div>
    </div>
  )
}
