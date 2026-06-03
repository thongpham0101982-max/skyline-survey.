// Deployment trigger at 4/20/2026 3:27:26 PM
"use client"
import { useState, useEffect, useMemo } from "react"
import { getClassStudentsWithParentsAction, generateParentAccountsAction, deleteParentAccountsAction } from "./actions"
import { Users, KeyRound, UserCheck, AlertCircle, RefreshCw, CalendarDays, Trash2, X, School, Search, ShieldCheck, ArrowRight, UserPlus } from "lucide-react"

export function ParentAccountsClient({ classes, years, campuses, defaultYearId }: any) {
  const [filterYearId, setFilterYearId] = useState(defaultYearId || "ALL")
  const [selectedCampusId, setSelectedCampusId] = useState("ALL")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)

  const filteredClasses = useMemo(() => {
    return classes.filter((c: any) => {
      const yearMatch = filterYearId === "ALL" || c.academicYear?.id === filterYearId
      const campusMatch = selectedCampusId === "ALL" || c.campusId === selectedCampusId
      return yearMatch && campusMatch
    })
  }, [classes, filterYearId, selectedCampusId])

  const fetchStudents = async (cid: string) => {
    setLoading(true)
    try {
      const data = await getClassStudentsWithParentsAction(cid)
      setStudents(data)
      setSelectedStudentIds([])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedClassId) fetchStudents(selectedClassId)
    else setStudents([])
  }, [selectedClassId])

  useEffect(() => {
    setSelectedClassId("")
    setStudents([])
    setSelectedStudentIds([])
  }, [filterYearId, selectedCampusId])

  const handleGenerate = async () => {
    if (!selectedClassId) return
    setGenerating(true)
    try {
      const res = await generateParentAccountsAction(selectedClassId)
      if (res.success) {
        fetchStudents(selectedClassId)
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleDeleteMany = async () => {
    if (selectedStudentIds.length === 0) return;
    setDeleting(true);
    try {
      const res = await deleteParentAccountsAction(selectedStudentIds);
      if (res.success) fetchStudents(selectedClassId);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8 font-outfit animate-in fade-in duration-700">

      {/* LIGHT & PROFESSIONAL FILTER PANEL */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-red-100 to-rose-50 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
        <div className="relative bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-10">
            {/* Year & Campus Selectors */}
            <div className="lg:col-span-6 p-8 lg:p-10 space-y-10 border-b lg:border-b-0 lg:border-r border-slate-50">
              
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Chọn Niên khóa</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button onClick={() => setFilterYearId("ALL")}
                    className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all duration-300 ${filterYearId === "ALL" ? "bg-slate-900 text-white shadow-xl scale-105" : "bg-white text-slate-400 border border-slate-100 hover:border-red-200 hover:text-red-500"}`}
                  >Tất cả</button>
                  {years.filter((y: any) => !y.isOff).map((y: any) => (
                    <button key={y.id} onClick={() => setFilterYearId(y.id)}
                      className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all duration-300 ${filterYearId === y.id ? "bg-red-600 text-white shadow-xl shadow-red-100 scale-105" : "bg-white text-slate-400 border border-slate-100 hover:border-red-200 hover:text-red-500"}`}
                    >
                      {y.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
                    <School className="w-4 h-4 text-rose-500" />
                  </div>
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Chọn Cơ sở đào tạo</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button onClick={() => setSelectedCampusId("ALL")}
                    className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all duration-300 ${selectedCampusId === "ALL" ? "bg-slate-900 text-white shadow-xl scale-105" : "bg-white text-slate-400 border border-slate-100 hover:border-red-200 hover:text-red-500"}`}
                  >Toàn hệ thống</button>
                  {campuses.map((c: any) => (
                    <button key={c.id} onClick={() => setSelectedCampusId(c.id)}
                      className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all duration-300 ${selectedCampusId === c.id ? "bg-rose-500 text-white shadow-xl shadow-rose-100 scale-105" : "bg-white text-slate-400 border border-slate-100 hover:border-red-200 hover:text-red-500"}`}
                    >
                      {c.campusName}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Class Selection & Action */}
            <div className="lg:col-span-4 p-8 lg:p-10 bg-slate-50/30 flex flex-col justify-center space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lớp học ({filteredClasses.length})</label>
                <div className="relative group/select">
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full h-16 pl-6 pr-12 bg-white border border-slate-100 rounded-3xl font-black text-slate-700 outline-none focus:ring-4 focus:ring-red-50/50 focus:border-red-200 transition-all appearance-none cursor-pointer shadow-sm group-hover/select:shadow-md"
                  >
                    <option value="">-- Click chọn lớp học --</option>
                    {filteredClasses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.className} • {c.campus?.campusName || "N/A"}</option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                    <ArrowRight className="w-5 h-5 group-hover/select:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!selectedClassId || generating || loading}
                className="w-full h-16 bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-red-200/50 hover:shadow-2xl hover:shadow-red-300/60 transition-all active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-3"
              >
                {generating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
                Khởi tạo tài khoản
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DATA TABLE AREA */}
      <div className="bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.04)] border border-slate-50/50 overflow-hidden min-h-[500px] flex flex-col relative">
        <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-gradient-to-br from-red-50 to-rose-50 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                <Users className="w-7 h-7 text-red-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-800">Dánh sách học sinh</h3>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Live Updates • {selectedClassId ? students.length : 0} Members</span>
                </div>
              </div>
           </div>

           {selectedStudentIds.length > 0 && (
             <button onClick={handleDeleteMany} disabled={deleting}
                className="flex items-center gap-3 bg-white text-red-500 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-50 transition-all border border-red-100 shadow-sm">
               <Trash2 className="w-4 h-4" /> {deleting ? "Đang xử lý..." : `Xóa ${selectedStudentIds.length} tài khoản`}
             </button>
           )}
        </div>

        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead>
              <tr className="bg-slate-50/30">
                <th className="px-10 py-6 w-16">
                   <div onClick={() => students.length > 0 && setSelectedStudentIds(selectedStudentIds.length === students.length ? [] : students.map(s => s.id))}
                    className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all ${selectedStudentIds.length === students.length && students.length > 0 ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "bg-white border-slate-200"}`}
                   >
                     {selectedStudentIds.length === students.length && students.length > 0 && <ShieldCheck className="w-4 h-4" strokeWidth={3} />}
                   </div>
                </th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.25em]">Thông tin học sinh</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.25em]">Ngày sinh</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.25em]">Mã học sinh</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.25em]">Tài khoản PHHS</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.25em] text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(!selectedClassId || loading) && (
                <tr><td colSpan={6} className="px-10 py-32 text-center">
                  <div className="max-w-xs mx-auto flex flex-col items-center space-y-6 opacity-30">
                    {loading ? <RefreshCw className="w-16 h-16 animate-spin text-red-500" /> : <Search className="w-16 h-16 text-slate-900" />}
                    <p className="font-black text-slate-600">{loading ? "Đang truy xuất dữ liệu hệ thống..." : "Chọn lớp học phía trên để hiển thị danh sách tài khoản cần khởi tạo"}</p>
                  </div>
                </td></tr>
              )}
              {!loading && students.map((s, idx) => {
                const user = s.parents[0]?.parent?.user
                const hasAccount = !!user
                const isSelected = selectedStudentIds.includes(s.id)
                return (
                  <tr key={s.id} className={`group transition-all ${isSelected ? "bg-red-50/20" : "hover:bg-slate-50/50"}`}>
                    <td className="px-10 py-6">
                       <div onClick={() => setSelectedStudentIds(isSelected ? selectedStudentIds.filter(id => id !== s.id) : [...selectedStudentIds, s.id])}
                        className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all ${isSelected ? "bg-red-500 border-red-500 text-white shadow-xl shadow-red-100" : "bg-white border-slate-100 group-hover:border-red-200"}`}
                       >
                         {isSelected && <ShieldCheck className="w-4 h-4" strokeWidth={3} />}
                       </div>
                    </td>
                    <td className="px-6 py-6">
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${hasAccount ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                            {idx + 1}
                          </div>
                          <span className="font-black text-slate-800 text-base">{s.studentName}</span>
                       </div>
                    </td>
                    <td className="px-6 py-6">
                       <span className="text-sm font-bold text-slate-500">{s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "---"}</span>
                    </td>
                    <td className="px-6 py-6 font-mono font-bold text-slate-400 text-xs tracking-widest">{s.studentCode}</td>
                    <td className="px-6 py-6">
                       {hasAccount ? (
                         <div className="flex items-center gap-3 bg-emerald-50/50 border border-emerald-100/50 px-4 py-2.5 rounded-2xl">
                           <UserCheck className="w-4 h-4 text-emerald-500" />
                           <span className="font-black text-emerald-700 text-sm tracking-tight">{user.email}</span>
                         </div>
                       ) : (
                         <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Chưa khởi tạo</span>
                       )}
                    </td>
                    <td className="px-10 py-6 text-center">
                       {hasAccount ? (
                         <div className="inline-flex items-center gap-2 text-emerald-500 font-black text-[9px] uppercase tracking-widest">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" /> Hoàn tất
                         </div>
                       ) : (
                         <div className="inline-flex items-center gap-2 text-slate-300 font-black text-[9px] uppercase tracking-widest">
                           <div className="w-1.5 h-1.5 rounded-full bg-slate-200" /> Trống
                         </div>
                       )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* SOFT FOOTER INFO */}
        {students.length > 0 && (
          <div className="p-8 bg-slate-50/50 border-t border-slate-50">
             <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="flex items-center gap-5 flex-1">
                   <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-red-500 shadow-sm">
                      <ShieldCheck className="w-6 h-6" />
                   </div>
                   <div className="space-y-1">
                      <p className="text-sm font-black text-slate-700 leading-tight">Mật khẩu mặc định: <span className="text-red-500">Mã Học Sinh</span></p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Phụ huynh sử dụng tài khoản Email phía trên để truy cập khảo sát</p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="flex -space-x-4">
                      {[1,2,3].map(i => <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-300">{i}</div>)}
                   </div>
                   <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Hơn 5000+ Phụ huynh sử dụng</span>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  )
}
