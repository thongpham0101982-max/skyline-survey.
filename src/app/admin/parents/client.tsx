// Deployment trigger at 20/04/2026 15:27:29
"use client"
import { useState, useEffect, useMemo } from "react"
import { getClassStudentsWithParentsAction, generateParentAccountsAction, deleteParentAccountsAction } from "./actions"
import { Users, KeyRound, UserCheck, AlertCircle, RefreshCw, CalendarDays, Trash2, X, School, Search, ShieldCheck } from "lucide-react"

export function ParentAccountsClient({ classes, years, campuses, defaultYearId }: any) {
  const [filterYearId, setFilterYearId] = useState(defaultYearId || "ALL")
  const [selectedCampusId, setSelectedCampusId] = useState("ALL")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)

  // Filter classes based on Year AND Campus
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

  // Reset class when year or campus changes
  useEffect(() => {
    setSelectedClassId("")
    setStudents([])
    setSelectedStudentIds([])
  }, [filterYearId, selectedCampusId])

  const handleGenerate = async () => {
    if (!selectedClassId) return
    if (!confirm("Hệ thống sẽ tự động tạo tài khoản (P_MaHS) cho học sinh chưa có tài khoản phụ huynh. Bạn chắc chắn?")) return
    setGenerating(true)
    const res = await generateParentAccountsAction(selectedClassId)
    setGenerating(false)
    if (res.success) {
      alert(`Khởi tạo thành công ${res.count} tài khoản mới!`)
      fetchStudents(selectedClassId)
    }
  }

  const handleDeleteMany = async () => {
    if (selectedStudentIds.length === 0) return;
    if (!confirm(`Xác nhận xóa ${selectedStudentIds.length} tài khoản PHHS đã chọn?`)) return;
    setDeleting(true);
    const res = await deleteParentAccountsAction(selectedStudentIds);
    setDeleting(false);
    if (res.success) {
      fetchStudents(selectedClassId);
    }
  }

  return (
    <div className="space-y-6 font-outfit">

      {/* FILTER BOX */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-1 h-1 bg-gradient-to-r from-red-600 via-[#d90429] to-red-400" />
        <div className="p-8 space-y-8">
          
          <div className="flex flex-col lg:flex-row lg:items-center gap-10">
            {/* Year Selector */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="w-5 h-5 text-red-500" strokeWidth={2.5} />
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Năm học</span>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <button
                  onClick={() => setFilterYearId("ALL")}
                  className={`px-5 py-2.5 rounded-2xl font-black transition-all border-2 ${filterYearId === "ALL" ? "bg-[#d90429] text-white border-[#d90429] shadow-lg shadow-red-200" : "bg-slate-50 text-slate-500 border-slate-50 hover:border-red-200"}`}
                >
                  Tất cả
                </button>
                {years.map((y: any) => (
                  <button key={y.id}
                    onClick={() => setFilterYearId(y.id)}
                    className={`px-5 py-2.5 rounded-2xl font-black transition-all border-2 ${filterYearId === y.id ? "bg-[#d90429] text-white border-[#d90429] shadow-lg shadow-red-200" : "bg-slate-50 text-slate-500 border-slate-50 hover:border-red-200"}`}
                  >
                    {y.name}{y.status === "ACTIVE" && " (Hiện tại)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden lg:block w-px h-16 bg-slate-100" />

            {/* Campus Selector */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <School className="w-5 h-5 text-red-500" strokeWidth={2.5} />
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Cơ sở (Campus)</span>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <button
                  onClick={() => setSelectedCampusId("ALL")}
                  className={`px-5 py-2.5 rounded-2xl font-black transition-all border-2 ${selectedCampusId === "ALL" ? "bg-[#d90429] text-white border-[#d90429] shadow-lg shadow-red-200" : "bg-slate-50 text-slate-500 border-slate-50 hover:border-red-200"}`}
                >
                  Toàn hệ thống
                </button>
                {campuses.map((c: any) => (
                  <button key={c.id}
                    onClick={() => setSelectedCampusId(c.id)}
                    className={`px-5 py-2.5 rounded-2xl font-black transition-all border-2 ${selectedCampusId === c.id ? "bg-[#d90429] text-white border-[#d90429] shadow-lg shadow-red-200" : "bg-slate-50 text-slate-500 border-slate-50 hover:border-red-200"}`}
                  >
                    {c.campusName}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-50" />

          {/* Class Dropdown */}
          <div className="flex flex-col md:flex-row md:items-end gap-6 pb-2">
            <div className="flex-1">
              <label className="block text-[11px] font-black text-slate-400 mb-4 uppercase tracking-widest">Lớp học ({filteredClasses.length} lớp phù hợp)</label>
              <div className="relative group">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full h-14 pl-14 pr-6 border-2 border-slate-100 rounded-[1.25rem] focus:border-[#d90429] focus:bg-white font-black text-slate-800 bg-slate-50 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">-- Click để chọn Lớp học --</option>
                  {filteredClasses.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.className} (Năm học: {c.academicYear?.name || "?"} | {c.campus?.campusName || "N/A"})
                    </option>
                  ))}
                </select>
                <div className="absolute left-5 top-1/2 -translate-y-1/2 p-2 bg-white rounded-xl shadow-sm text-red-500">
                  <Users className="w-4 h-4" strokeWidth={3} />
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!selectedClassId || generating || loading}
              className="h-14 px-10 bg-[#d90429] text-white font-black rounded-[1.25rem] shadow-xl shadow-red-100 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 whitespace-nowrap uppercase tracking-widest text-[11px]"
            >
              {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" strokeWidth={2.5} />}
              Khởi tạo Tài khoản tự động
            </button>
          </div>
        </div>
      </div>

      {/* STUDENT LIST TABLE */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 shadow-inner">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 leading-none mb-1">Danh sách học sinh</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {selectedClassId ? `Hiển thị ${students.length} học sinh của lớp` : "Vui lòng chọn lớp để xem dữ liệu"}
                </p>
              </div>
           </div>

           {selectedStudentIds.length > 0 && (
             <button onClick={handleDeleteMany} disabled={deleting}
                className="flex items-center gap-2 bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95 border border-red-100">
               <Trash2 className="w-3.5 h-3.5" /> Xóa {selectedStudentIds.length} TK
             </button>
           )}
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 w-12">
                   <div 
                    onClick={() => {
                        if (students.length > 0 && selectedStudentIds.length === students.length) setSelectedStudentIds([]);
                        else setSelectedStudentIds(students.map(s => s.id));
                    }}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${selectedStudentIds.length === students.length && students.length > 0 ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-100" : "bg-white border-slate-200"}`}
                   >
                     {selectedStudentIds.length === students.length && students.length > 0 && <ShieldCheck className="w-4 h-4" strokeWidth={3} />}
                   </div>
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">STT</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mã học sinh</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Họ và Tên</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tài khoản PHHS</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!selectedClassId && (
                <tr><td colSpan={6} className="px-8 py-24 text-center">
                  <div className="flex flex-col items-center opacity-20">
                    <Search className="w-16 h-16 text-slate-900 mb-4" />
                    <p className="font-black text-lg">Chọn lớp để quản lý tài khoản</p>
                  </div>
                </td></tr>
              )}
              {loading && (
                <tr><td colSpan={6} className="px-8 py-24 text-center">
                  <div className="flex flex-col items-center text-red-600 animate-pulse">
                    <RefreshCw className="w-10 h-10 animate-spin mb-4" />
                    <p className="font-black">Đang đồng bộ dữ liệu...</p>
                  </div>
                </td></tr>
              )}
              {!loading && students.map((s, idx) => {
                const user = s.parents[0]?.parent?.user
                const hasAccount = !!user
                const isSelected = selectedStudentIds.includes(s.id)
                return (
                  <tr key={s.id} className={`group transition-all ${isSelected ? "bg-red-50/30" : "hover:bg-slate-50/50"}`}>
                    <td className="px-8 py-5">
                       <div 
                        onClick={() => {
                          if (isSelected) setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id))
                          else setSelectedStudentIds([...selectedStudentIds, s.id])
                        }}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${isSelected ? "bg-red-600 border-red-600 text-white shadow-md shadow-red-100" : "bg-white border-slate-200 group-hover:border-red-300"}`}
                       >
                         {isSelected && <ShieldCheck className="w-3 h-3" strokeWidth={4} />}
                       </div>
                    </td>
                    <td className="px-6 py-5 text-xs font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-6 py-5">
                       <span className="font-black text-slate-900 text-sm">{s.studentCode}</span>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex flex-col">
                         <span className="font-black text-slate-800">{s.studentName}</span>
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "---"}</span>
                       </div>
                    </td>
                    <td className="px-6 py-5">
                       {hasAccount ? (
                         <div className="inline-flex items-center gap-2 bg-white border-2 border-slate-100 px-4 py-2 rounded-xl shadow-sm">
                           <UserCheck className="w-4 h-4 text-emerald-500" />
                           <span className="font-black text-slate-700 text-xs tracking-tight">{user.email}</span>
                         </div>
                       ) : (
                         <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Chưa có tài khoản</span>
                       )}
                    </td>
                    <td className="px-6 py-5 text-center">
                       {hasAccount ? (
                         <span className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-black rounded-lg uppercase tracking-widest shadow-lg shadow-emerald-100">Đã kích hoạt</span>
                       ) : (
                         <span className="px-3 py-1 bg-slate-100 text-slate-400 text-[9px] font-black rounded-lg uppercase tracking-widest">Trống</span>
                       )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {students.length > 0 && !loading && (
        <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
           <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-red-600/10 rounded-full blur-3xl" />
           <div className="relative flex items-center gap-6">
              <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-500/20">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h4 className="font-black text-lg mb-1 italic">Nguyên tắc bảo mật:</h4>
                <p className="text-slate-400 text-sm font-bold leading-relaxed max-w-xl">
                  Mật khẩu mặc định bằng <span className="text-white">Mã Học Sinh</span>. PHHS đăng nhập bằng Tài khoản là Email được cấp phía trên để thực hiện khảo sát.
                </p>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}


