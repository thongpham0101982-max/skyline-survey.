"use client"
import { useState, useEffect, useMemo } from "react"
import { 
  getSurveyPeriodTrackingAction, 
  getAcademicLevelsAction,
  exportReportExcelAction
} from "./actions"
import * as xlsx from "xlsx"
import { 
  Building2, GraduationCap, LayoutDashboard, Download, 
  Users, CheckCircle2, Clock, BarChart3, Search, Award
} from "lucide-react"

export function TrackingClient({ periods, campuses: initialCampuses = [], defaultCampusId = null, isCampusLocked = false }: any) {
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [data, setData] = useState<any[]>([])
  const [totalStudentsInYear, setTotalStudentsInYear] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Filters
  const [filterCampus, setFilterCampus] = useState(defaultCampusId || "ALL")
  const [filterLevel, setFilterLevel] = useState("ALL")
  const [campuses] = useState<any[]>(initialCampuses)
  const [levels, setLevels] = useState<string[]>([])
  const [exporting, setExporting] = useState(false)

  const reload = () => {
    if (!selectedPeriod) return
    setLoading(true)
    getSurveyPeriodTrackingAction(selectedPeriod).then(res => {
      setData(res?.grouped || [])
      setTotalStudentsInYear(res?.totalStudentsInYear || 0)
      setLoading(false)
    })
  }

  useEffect(() => {
    getAcademicLevelsAction().then(setLevels)
  }, [])

  useEffect(() => {
    if (selectedPeriod) reload()
    else {
      setData([])
      setTotalStudentsInYear(0)
    }
  }, [selectedPeriod])

  const handleExportExcel = async () => {
    if (!selectedPeriod) return alert("Vui lòng chọn đợt khảo sát!")
    setExporting(true)
    const res = await exportReportExcelAction(selectedPeriod, filterCampus !== "ALL" ? filterCampus : undefined, filterLevel !== "ALL" ? filterLevel : undefined)
    setExporting(false)
    if (!res.success) return alert("Lỗi xuất Excel: " + res.error)
    if (!res.data || res.data.length === 0) return alert("Không có dữ liệu để xuất!")
    
    const ws = xlsx.utils.json_to_sheet(res.data)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, "Khao_Sat")
    xlsx.writeFile(wb, `Data_KhaoSat_${selectedPeriod}.xlsx`)
  }

  // Filter Logic
  const filteredData = useMemo(() => {
    return data.filter(d => {
      const matchCampus = filterCampus === "ALL" || d.classInfo.campusId === filterCampus
      const matchLevel = filterLevel === "ALL" || d.classInfo.level === filterLevel
      const matchSearch = !searchQuery || d.classInfo.className.toLowerCase().includes(searchQuery.toLowerCase()) || (d.classInfo.homeroom && d.classInfo.homeroom.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchCampus && matchLevel && matchSearch
    })
  }, [data, filterCampus, filterLevel, searchQuery])

  // Calculate Global Stats
  const globalTotal = useMemo(() => filteredData.reduce((sum, d) => sum + d.total, 0), [filteredData])
  const globalCompleted = useMemo(() => filteredData.reduce((sum, d) => sum + d.completed, 0), [filteredData])
  const globalPending = useMemo(() => filteredData.reduce((sum, d) => sum + d.pending, 0), [filteredData])
  const completionRate = useMemo(() => globalTotal > 0 ? Math.round((globalCompleted / globalTotal) * 100) : 0, [globalCompleted, globalTotal])
  
  const overallAcademicYearRate = useMemo(() => {
    return totalStudentsInYear > 0 ? Math.round((globalCompleted / totalStudentsInYear) * 100) : 0
  }, [globalCompleted, totalStudentsInYear])

  // Group by Campus stats
  const campusStats = useMemo(() => {
    const statsMap: Record<string, { campusName: string; total: number; completed: number }> = {}
    
    // Initialize
    campuses.forEach((c: any) => {
      statsMap[c.id] = { campusName: c.campusName, total: 0, completed: 0 }
    })
    
    // Aggregate
    data.forEach((d: any) => {
      const cid = d.classInfo?.campusId
      if (cid && statsMap[cid]) {
        statsMap[cid].total += d.total
        statsMap[cid].completed += d.completed
      }
    })
    
    return Object.entries(statsMap)
      .map(([id, s]) => ({
        id,
        ...s,
        rate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
      }))
      .filter(s => s.total > 0)
  }, [data, campuses])

  return (
    <div className="space-y-6">
      
      {/* Top Controls & Global Filter */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/80 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#48BFE3]/10 text-[#48BFE3] flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Bộ Lọc Thống Kê</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Chọn đợt khảo sát &amp; lọc theo cơ sở, cấp học</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              disabled={exporting || !selectedPeriod}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#48BFE3] hover:bg-[#009085] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#48BFE3]/10 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-none"
            >
              <Download className="w-4 h-4" />
              <span>{exporting ? "Đang xuất..." : "Xuất Excel Kết Quả"}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">1. Đợt khảo sát (Period)</label>
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full p-4 border border-slate-200 focus:border-[#48BFE3]/50 focus:ring-1 focus:ring-[#48BFE3]/20 rounded-2xl font-bold text-slate-700 bg-slate-50/50 outline-none transition-all text-xs"
            >
              <option value="">-- Click để chọn Đợt Khảo Sát --</option>
              {periods.map((p: any) => (
                 <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">2. Cơ sở (Campus)</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                value={filterCampus}
                onChange={(e) => setFilterCampus(e.target.value)}
                disabled={isCampusLocked}
                className={`w-full p-4 pl-12 border rounded-2xl font-bold text-slate-700 outline-none transition-all text-xs ${isCampusLocked ? "border-[#48BFE3]/20 bg-[#48BFE3]/5 text-[#48BFE3] cursor-not-allowed" : "border-slate-200 bg-slate-50/50 focus:border-[#48BFE3]/50 focus:ring-1 focus:ring-[#48BFE3]/20"}`}
              >
                {!isCampusLocked && <option value="ALL">Tất cả Cơ sở</option>}
                {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">3. Bậc học (Level)</label>
            <div className="relative">
              <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="w-full p-4 pl-12 border border-slate-200 focus:border-[#48BFE3]/50 focus:ring-1 focus:ring-[#48BFE3]/20 rounded-2xl font-bold text-slate-700 bg-slate-50/50 outline-none transition-all text-xs"
              >
                <option value="ALL">Tất cả Khối/Bậc học</option>
                {levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-white p-20 text-center rounded-3xl border-2 border-dashed border-[#48BFE3]/20 shadow-xs transition-all">
           <div className="w-12 h-12 border-4 border-[#48BFE3] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
           <p className="text-[#48BFE3] font-black text-lg tracking-tight uppercase">Đang tải số liệu thống kê...</p>
           <p className="text-slate-400 text-sm mt-2 font-medium">Vui lòng chờ trong giây lát</p>
        </div>
      )}

      {!loading && selectedPeriod && filteredData.length === 0 && (
        <div className="bg-white p-20 text-center rounded-3xl border border-slate-200 text-slate-500 font-medium">
           Không tìm thấy lớp học nào khớp với điều kiện lọc hoặc đợt khảo sát này chưa có dữ liệu.
        </div>
      )}

      {/* Analytics Dashboard */}
      {!loading && filteredData.length > 0 && (
        <div className="space-y-8">
          
          {/* Global Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
               <div>
                 <p className="text-slate-400 text-[10px] font-black mb-1 uppercase tracking-widest">Tổng HS gán Survey</p>
                 <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{globalTotal}</h3>
               </div>
               <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center"><Users className="w-6 h-6" /></div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow border-b-4 border-b-emerald-500">
               <div>
                 <p className="text-emerald-600 text-[10px] font-black mb-1 uppercase tracking-widest">Đã hoàn tất</p>
                 <h3 className="text-3xl font-black text-emerald-700 font-mono tracking-tighter">{globalCompleted}</h3>
               </div>
               <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center"><CheckCircle2 className="w-6 h-6" /></div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow border-b-4 border-b-amber-500">
               <div>
                 <p className="text-amber-600 text-[10px] font-black mb-1 uppercase tracking-widest">Còn lại (Pending)</p>
                 <h3 className="text-3xl font-black text-amber-700 font-mono tracking-tighter">{globalPending}</h3>
               </div>
               <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center"><Clock className="w-6 h-6" /></div>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 text-white flex items-center justify-between hover:shadow-xl transition-all">
               <div>
                 <p className="text-slate-400 text-[10px] font-black mb-1 uppercase tracking-widest">Khảo sát / Tổng HS năm học</p>
                 <h3 className="text-3xl font-black text-[#48BFE3] font-mono tracking-tighter">
                   {globalCompleted} / {totalStudentsInYear}
                 </h3>
                 <p className="text-[10px] text-slate-400 font-bold mt-1">Đạt tỷ lệ: {overallAcademicYearRate}%</p>
               </div>
               <div className="w-12 h-12 rounded-xl bg-slate-800 text-[#48BFE3] flex items-center justify-center font-black text-xs font-mono">{overallAcademicYearRate}%</div>
            </div>
          </div>

          {/* Campus statistics section */}
          {filterCampus === "ALL" && campusStats.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#48BFE3]" />
                Thống Kê Tiến Độ Theo Cơ Sở
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {campusStats.map(c => (
                  <div key={c.id} className="bg-slate-50/50 rounded-2xl border border-slate-100 p-5 space-y-3 hover:border-[#48BFE3]/20 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-slate-800">{c.campusName}</span>
                      <span className="text-xs font-black text-[#48BFE3] font-mono">{c.rate}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#48BFE3] rounded-full transition-all duration-500" style={{ width: `${c.rate}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <span>Đã nộp: <strong className="text-slate-600 font-mono">{c.completed}</strong></span>
                      <span>Tổng gán: <strong className="text-slate-600 font-mono">{c.total}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Class Listing Section */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#48BFE3]" />
                Bảng Thống Kê Theo Lớp Học
              </h3>
              <div className="relative group max-w-xs w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#48BFE3] transition-colors" />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm lớp, GVCN..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:ring-1 focus:ring-[#48BFE3]/20 focus:border-[#48BFE3]/50 transition-all outline-none"
                />
              </div>
            </div>

            <div className="overflow-hidden border border-slate-100 rounded-2xl shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-200/50">
                      <th className="p-4 border border-slate-100 font-black">STT</th>
                      <th className="p-4 border border-slate-100 font-black">Tên Lớp</th>
                      <th className="p-4 border border-slate-100 font-black">Cơ Sở</th>
                      <th className="p-4 border border-slate-100 font-black">Khối / Bậc học</th>
                      <th className="p-4 border border-slate-100 font-black">Giáo Viên Chủ Nhiệm</th>
                      <th className="p-4 text-center border border-slate-100 font-black">Đã Hoàn Tất</th>
                      <th className="p-4 text-center border border-slate-100 font-black">Tổng Số HS gán</th>
                      <th className="p-4 border border-slate-100 w-1/4 font-black">Tiến Độ (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.map((cData: any, idx: number) => {
                      const cls = cData.classInfo
                      const classRate = cData.total > 0 ? Math.round((cData.completed / cData.total) * 100) : 0
                      return (
                        <tr key={cls.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-4 text-slate-400 font-mono text-xs border border-slate-100">{idx + 1}</td>
                          <td className="p-4 border border-slate-100 font-black text-slate-800 text-sm">{cls.className}</td>
                          <td className="p-4 border border-slate-100 text-slate-500 font-bold text-xs">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/50">{cls.campus?.campusName || "---"}</span>
                          </td>
                          <td className="p-4 border border-slate-100 text-slate-500 font-bold text-xs">{cls.level || "---"}</td>
                          <td className="p-4 border border-slate-100 text-slate-600 font-bold text-xs">{cls.homeroom || "Chưa phân công"}</td>
                          <td className="p-4 text-center border border-slate-100 font-mono font-black text-emerald-600 text-sm">{cData.completed}</td>
                          <td className="p-4 text-center border border-slate-100 font-mono font-black text-slate-700 text-sm">{cData.total}</td>
                          <td className="p-4 border border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-100/30">
                                <div className={`h-full rounded-full transition-all duration-500 ${classRate === 100 ? 'bg-emerald-500' : 'bg-[#48BFE3]'}`} style={{ width: `${classRate}%`}}></div>
                              </div>
                              <span className="text-xs font-black text-slate-800 font-mono w-8 text-right">${classRate}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
