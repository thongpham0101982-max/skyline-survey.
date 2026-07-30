"use client"
import React, { useState, useEffect } from 'react'
import { ExperientialTabs } from '@/components/ExperientialTabs'
import { 
  Calendar, Layers, Award, ClipboardList, Users, User, Landmark, 
  BarChart3, RefreshCw, AlertCircle, FileBarChart 
} from 'lucide-react'

interface AcademicYear {
  id: string
  name: string
}

interface ClientProps {
  academicYears: AcademicYear[]
  activeYearId: string
  activeYearName: string
}

export function ExperientialReportsClient({ academicYears, activeYearId }: ClientProps) {
  const [selectedYearId, setSelectedYearId] = useState(activeYearId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [stats, setStats] = useState<any>(null)
  const [activeReportTab, setActiveReportTab] = useState<'grade' | 'gvbm' | 'gvcn' | 'activity'>('grade')

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/experiential-activities/stats?academicYearId=${selectedYearId}`)
      const json = await res.json()
      if (json.success) {
        setStats(json.data)
      } else {
        setError(json.error || "Không thể tải số liệu thống kê")
      }
    } catch (err: any) {
      console.error(err)
      setError("Lỗi kết nối máy chủ")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedYearId) {
      fetchStats()
    }
  }, [selectedYearId])

  const reportTabs = [
    { id: 'grade', label: 'Thống kê Khối lớp', icon: Layers },
    { id: 'gvbm', label: 'Thống kê GVBM', icon: User },
    { id: 'gvcn', label: 'Thống kê GVCN', icon: Users },
    { id: 'activity', label: 'Chi tiết Hoạt động', icon: Award }
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation Tabs */}
        <ExperientialTabs activeTab="reports" />

        {/* Header Block & Year Selector */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#00A99D]/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <FileBarChart className="w-8 h-8 text-[#00A99D]" />
              Báo cáo Thống kê Hoạt động Trải nghiệm
            </h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">
              Theo dõi, tổng hợp và đo lường sự tham gia hoạt động trải nghiệm của học sinh và giáo viên
            </p>
          </div>

          <div className="flex flex-col space-y-1.5 z-10 w-full md:w-56">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#00A99D]" />
              Niên khóa
            </label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#00A99D]"
            >
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading and Error States */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
            <RefreshCw className="animate-spin h-10 w-10 text-[#00A99D] mb-4" />
            <p className="text-sm font-bold">Đang tổng hợp số liệu thống kê...</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 text-rose-500 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
            <AlertCircle className="h-12 w-12 mb-3" />
            <p className="text-sm font-bold">{error}</p>
            <button onClick={fetchStats} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all">
              Thử lại
            </button>
          </div>
        )}

        {/* Stats Dashboard Grid */}
        {!loading && !error && stats && (
          <div className="space-y-6">
            
            {/* KPI Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Card 1: Total Activities */}
              <div className="bg-gradient-to-br from-teal-50/90 via-emerald-50/30 to-teal-100/60 p-6 rounded-3xl shadow-xs border border-teal-200/80 flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-teal-800 uppercase tracking-widest block">Tổng số Hoạt động</span>
                  <span className="text-3xl font-black text-teal-950 block">
                    {stats.summary.totalActivities}
                  </span>
                </div>
                <div className="p-4 bg-[#00A99D] text-white rounded-2xl shadow-md shadow-teal-500/20 group-hover:scale-110 transition-transform">
                  <Award className="w-6 h-6" />
                </div>
              </div>

              {/* Card 2: Total Grades */}
              <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/30 to-indigo-100/60 p-6 rounded-3xl shadow-xs border border-indigo-200/80 flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-indigo-800 uppercase tracking-widest block">Khối lớp tham gia</span>
                  <span className="text-3xl font-black text-indigo-950 block">
                    {stats.summary.totalGrades}
                  </span>
                </div>
                <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                  <Layers className="w-6 h-6" />
                </div>
              </div>

              {/* Card 3: GVCN */}
              <div className="bg-gradient-to-br from-pink-50/90 via-rose-50/30 to-pink-100/60 p-6 rounded-3xl shadow-xs border border-pink-200/80 flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-pink-800 uppercase tracking-widest block">Tổng GVCN tham gia</span>
                  <span className="text-3xl font-black text-pink-950 block">
                    {stats.summary.totalGvcn}
                  </span>
                </div>
                <div className="p-4 bg-pink-600 text-white rounded-2xl shadow-md shadow-pink-500/20 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              {/* Card 4: GVBM */}
              <div className="bg-gradient-to-br from-sky-50/90 via-blue-50/30 to-sky-100/60 p-6 rounded-3xl shadow-xs border border-sky-200/80 flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-sky-800 uppercase tracking-widest block">Tổng GVBM tham gia</span>
                  <span className="text-3xl font-black text-sky-950 block">
                    {stats.summary.totalGvbm}
                  </span>
                </div>
                <div className="p-4 bg-sky-600 text-white rounded-2xl shadow-md shadow-sky-500/20 group-hover:scale-110 transition-transform">
                  <User className="w-6 h-6" />
                </div>
              </div>

            </div>

            {/* Reports Section with tabs selector */}
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
              
              {/* Tab Selector Headers */}
              <div className="flex border-b border-slate-100 overflow-x-auto bg-slate-50/50 p-2.5 gap-1.5">
                {reportTabs.map(tab => {
                  const isActive = activeReportTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveReportTab(tab.id)}
                      className={"flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer " + (
                        isActive 
                          ? "bg-[#00A99D] text-white shadow-xs" 
                          : "text-slate-600 hover:bg-white hover:text-slate-800 border-transparent"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              {/* Tab Content Panels */}
              <div className="p-6">
                
                {/* 1. Tab Khối lớp */}
                {activeReportTab === 'grade' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Thống kê theo khối lớp tham gia</h3>
                    
                    {stats.statsByGrade.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs italic">Không tìm thấy số liệu theo khối lớp.</div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                              <th className="py-3.5 px-4 text-center w-16">STT</th>
                              <th className="py-3.5 px-4">Khối lớp</th>
                              <th className="py-3.5 px-4 text-center">Hoạt động do GVBM</th>
                              <th className="py-3.5 px-4 text-center">Dự án do GVCN</th>
                              <th className="py-3.5 px-4 text-center">Tổng số Hoạt động</th>
                              <th className="py-3.5 px-4 text-center">Học sinh tham gia</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                            {stats.statsByGrade.map((g: any, idx: number) => (
                              <tr key={g.grade} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                                <td className="py-3.5 px-4 font-black text-slate-800 text-sm">Khối {g.grade}</td>
                                <td className="py-3.5 px-4 text-center text-sky-600 font-extrabold">{g.gvbmCount}</td>
                                <td className="py-3.5 px-4 text-center text-pink-600 font-extrabold">{g.gvcbCount}</td>
                                <td className="py-3.5 px-4 text-center font-black text-slate-800 text-sm">{g.totalCount}</td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className="bg-[#00A99D]/10 text-[#00A99D] border border-[#00A99D]/20 px-3 py-1 rounded-full text-[10px] font-black">
                                    {g.studentCount} học sinh
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Tab GVBM */}
                {activeReportTab === 'gvbm' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Danh sách Giáo viên Bộ môn (GVBM) tổ chức hoạt động</h3>
                    
                    {stats.statsByGvbm.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs italic">Không tìm thấy giáo viên bộ môn nào tổ chức hoạt động.</div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                              <th className="py-3.5 px-4 text-center w-16">STT</th>
                              <th className="py-3.5 px-4">Họ và tên Giáo viên</th>
                              <th className="py-3.5 px-4 text-center">Vai trò</th>
                              <th className="py-3.5 px-4 text-center">Số Hoạt động tổ chức</th>
                              <th className="py-3.5 px-4 text-center">Số lượt học sinh tham gia</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                            {stats.statsByGvbm.map((g: any, idx: number) => (
                              <tr key={g.teacherName} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                                <td className="py-3.5 px-4 font-black text-slate-800 text-sm">{g.teacherName}</td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">GV Bộ Môn</span>
                                </td>
                                <td className="py-3.5 px-4 text-center font-black text-slate-850 text-sm">{g.activityCount}</td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className="bg-[#00A99D]/10 text-[#00A99D] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                    {g.studentCount} học sinh
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Tab GVCN */}
                {activeReportTab === 'gvcn' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Danh sách Giáo viên Chủ nhiệm (GVCN) tổ chức dự án</h3>
                    
                    {stats.statsByGvcn.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs italic">Không tìm thấy giáo viên chủ nhiệm nào tổ chức dự án học tập.</div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                              <th className="py-3.5 px-4 text-center w-16">STT</th>
                              <th className="py-3.5 px-4">Họ và tên Giáo viên</th>
                              <th className="py-3.5 px-4 text-center">Vai trò</th>
                              <th className="py-3.5 px-4 text-center">Số Dự án tổ chức</th>
                              <th className="py-3.5 px-4 text-center">Học sinh tham gia</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                            {stats.statsByGvcn.map((g: any, idx: number) => (
                              <tr key={g.teacherName} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                                <td className="py-3.5 px-4 font-black text-slate-800 text-sm">{g.teacherName}</td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className="bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">GV Chủ Nhiệm</span>
                                </td>
                                <td className="py-3.5 px-4 text-center font-black text-slate-850 text-sm">{g.projectCount}</td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className="bg-[#00A99D]/10 text-[#00A99D] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                    {g.studentCount} học sinh
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Tab Hoạt động chi tiết */}
                {activeReportTab === 'activity' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Danh sách tổng hợp Hoạt động Trải nghiệm</h3>
                    
                    {stats.statsByActivity.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs italic">Không tìm thấy hoạt động nào.</div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                              <th className="py-3.5 px-4 text-center w-16">STT</th>
                              <th className="py-3.5 px-4">Tên hoạt động trải nghiệm</th>
                              <th className="py-3.5 px-4 text-center">Đơn vị chủ trì tổ chức</th>
                              <th className="py-3.5 px-4 text-center">Số học sinh tham gia</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                            {stats.statsByActivity.map((act: any, idx: number) => (
                              <tr key={act.name} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                                <td className="py-3.5 px-4 font-black text-slate-800 text-sm">{act.name}</td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className={"px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase " + (
                                    act.creatorType === "GVBM" 
                                      ? "bg-sky-50 text-sky-700 border border-sky-200" 
                                      : "bg-pink-50 text-pink-700 border border-pink-200"
                                  )}>
                                    {act.creatorType === "GVBM" ? "GV Bộ môn (GVBM)" : "GV Chủ nhiệm (GVCN)"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className="bg-[#00A99D]/10 text-[#00A99D] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                    {act.participantCount} học sinh
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  )
}
