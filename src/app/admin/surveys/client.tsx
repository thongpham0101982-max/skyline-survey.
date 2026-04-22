"use client"
import { useState, useMemo } from "react"
import {
  ClipboardList, Trash2, Edit2, Check, X,
  ToggleLeft, ToggleRight, CalendarClock,
  Settings2, Send, Plus, CalendarDays,
  UserCheck, Users, GraduationCap,
  LayoutGrid, List, Search, Filter,
  ArrowRight, MoreVertical, AlertCircle,
  Eye, CheckCircle2, Clock, Calendar
} from "lucide-react"
import Link from "next/link"

export function AdminSurveysClient({ initialSurveys, years, campuses, createAction, updateAction, deleteAction, deleteMultipleAction }: any) {
  const [surveys, setSurveys] = useState(initialSurveys)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [searchQuery, setSearchQuery] = useState("")
  
  const [modalType, setModalType] = useState<"create" | "edit" | null>(null)
  const [currentSurvey, setCurrentSurvey] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    academicYearId: years.find((y: any) => y.status === "ACTIVE")?.id || years[0]?.id || "",
    targetAudience: "PHHS", campusId: ""
  })

  const audiences = [
    { value: "PHHS", label: "Phụ huynh (PHHS)", icon: Users, color: "bg-blue-600", light: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
    { value: "HocSinh", label: "Học sinh", icon: GraduationCap, color: "bg-emerald-600", light: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
    { value: "GiaoVien", label: "Giáo viên", icon: UserCheck, color: "bg-amber-600", light: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" }
  ]

  const stats = useMemo(() => ({
    total: surveys.length,
    active: surveys.filter((s: any) => s.status === "ACTIVE").length,
    upcoming: surveys.filter((s: any) => new Date(s.startDate) > new Date()).length
  }), [surveys])

  const filteredSurveys = useMemo(() => surveys.filter((s: any) => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  ), [surveys, searchQuery])

  const handleOpenCreate = () => {
    setForm({
      name: "",
      startDate: "",
      endDate: "",
      academicYearId: years.find((y: any) => y.status === "ACTIVE")?.id || years[0]?.id || "",
      targetAudience: "PHHS", campusId: ""
    })
    setModalType("create")
    setErrorMsg("")
  }

  const handleOpenEdit = (s: any) => {
    setCurrentSurvey(s)
    setForm({
      name: s.name,
      startDate: new Date(s.startDate).toISOString().split("T")[0],
      endDate: new Date(s.endDate).toISOString().split("T")[0],
      academicYearId: s.academicYearId,
      targetAudience: s.targetAudience || "PHHS", campusId: s.campusId || ""
    })
    setModalType("edit")
    setErrorMsg("")
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { setErrorMsg("Vui lòng nhập tên đợt khảo sát!"); return }
    if (!form.startDate || !form.endDate) { setErrorMsg("Vui lòng chọn thời gian!"); return }
    setIsSubmitting(true)
    try {
      if (modalType === "create") {
        const res = await createAction(form)
        if (res?.error) throw new Error(res.error)
      } else {
        const res = await updateAction({ ...form, id: currentSurvey.id })
        if (res?.error) throw new Error(res.error)
      }
      setModalType(null)
      window.location.reload()
    } catch (e: any) {
      setErrorMsg(e.message || "Lỗi hệ thống!")
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const next = currentStatus === "ACTIVE" ? "DRAFT" : "ACTIVE"
    setSurveys(surveys.map((s: any) => s.id === id ? { ...s, status: next } : s))
    await updateAction({ id, status: next, isActive: next === "ACTIVE" }).catch(() => {
      setSurveys(surveys)
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Xác nhận xóa đợt khảo sát này?")) return
    setSurveys(surveys.filter((s: any) => s.id !== id))
    await deleteAction(id).catch(() => window.location.reload())
  }

  const getAud = (val: string) => audiences.find(a => a.value === val) || audiences[0]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Tổng Đợt Khảo Sát" value={stats.total} icon={ClipboardList} color="text-indigo-600" bg="bg-indigo-50" />
        <StatCard title="Đang Hoạt Động" value={stats.active} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Sắp Diễn Ra" value={stats.upcoming} icon={Clock} color="text-amber-600" bg="bg-amber-50" />
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-center">
            <button 
              onClick={handleOpenCreate}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#BE1E2E] hover:bg-[#a01927] text-white rounded-xl text-sm font-bold shadow-lg shadow-red-100 transition-all active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" /> Tạo Đợt Mới
            </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white px-5 py-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm theo tên đợt..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-1 focus:ring-slate-300 transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl items-center border border-slate-200">
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-[#BE1E2E] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white text-[#BE1E2E] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="pl-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đợt khảo sát</th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đối tượng</th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Năm học</th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Thời gian</th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Trạng thái</th>
                <th className="pr-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSurveys.map((s: any) => {
                const aud = getAud(s.targetAudience)
                return (
                  <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="pl-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${aud.light}`}>
                          <ClipboardList className={`w-4 h-4 ${aud.text}`} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 group-hover:text-[#BE1E2E] transition-colors line-clamp-1">{s.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{s.code} {s.campus ? `- ${s.campus.campusName}` : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight border ${aud.text} ${aud.light} ${aud.border}`}>
                        <aud.icon className="w-3 h-3" /> {aud.label.split("(")[0]}
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                        {s.academicYear?.name || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-5 font-medium text-slate-600 text-[12px] text-center">
                      <div className="flex items-center justify-center gap-2">
                         <span>{new Date(s.startDate).toLocaleDateString("vi-VN")}</span>
                         <span className="text-slate-300">-</span>
                         <span>{new Date(s.endDate).toLocaleDateString("vi-VN")}</span>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex justify-center">
                        <button onClick={() => handleToggleStatus(s.id, s.status)} className={`w-10 h-5 rounded-full p-0.5 transition-colors relative ${s.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-200"}`}>
                          <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${s.status === "ACTIVE" ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                      </div>
                    </td>
                    <td className="pr-6 py-5">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip label="Sửa">
                           <button onClick={() => handleOpenEdit(s)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                        </Tooltip>
                        <Tooltip label="Bộ câu hỏi">
                           <Link href={"/admin/surveys/"+s.id+"/questions"} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Settings2 className="w-4 h-4" /></Link>
                        </Tooltip>
                        <Tooltip label="Phát hành">
                           <Link href={"/admin/surveys/"+s.id+"/publish"} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"><Send className="w-4 h-4" /></Link>
                        </Tooltip>
                        <Tooltip label="Xóa">
                           <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSurveys.map((s: any) => {
            const aud = getAud(s.targetAudience)
            return (
              <div key={s.id} className="bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-xl transition-all group relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full ${aud.light} opacity-50`} />
                <div className="flex justify-between items-start mb-5 relative z-10">
                   <div className={`p-3.5 rounded-2xl ${aud.light}`}>
                      <ClipboardList className={`w-6 h-6 ${aud.text}`} />
                   </div>
                   <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${s.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-400"}`}>
                      {s.status === "ACTIVE" ? "Hoạt động" : "Bản nháp"}
                   </div>
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-2 truncate group-hover:text-[#BE1E2E] transition-colors">{s.name}</h4>
                <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500 mb-6">
                   <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg"><Calendar className="w-3 h-3" /> {s.academicYear?.name}</div>
                   <div className={`flex items-center gap-1.5 ${aud.light} ${aud.text} px-2 py-1 rounded-lg`}><aud.icon className="w-3 h-3" /> {aud.label.split("(")[0]}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-auto">
                   <Link href={"/admin/surveys/"+s.id+"/questions"} className="flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold transition-all">
                      <Settings2 className="w-3.5 h-3.5" /> Câu hỏi
                   </Link>
                   <Link href={"/admin/surveys/"+s.id+"/publish"} className="flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all">
                      <Send className="w-3.5 h-3.5" /> Phát hành
                   </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-400">
              <div className="p-8">
                 <div className="flex justify-between items-start mb-8">
                    <div>
                       <h3 className="text-2xl font-black text-slate-900 tracking-tight">{modalType === "create" ? "Tạo Đợt Mới" : "Sửa Thông Tin"}</h3>
                       <p className="text-slate-400 text-sm font-medium mt-1">Vui lòng nhập đầy đủ các trường dưới đây</p>
                    </div>
                    <button onClick={() => setModalType(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                 </div>

                 {errorMsg && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-2 border border-red-100"><AlertCircle className="w-4 h-4" /> {errorMsg}</div>}

                 <div className="space-y-5">
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Tên đợt khảo sát</label>
                       <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Ví dụ: Review HK1..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Năm học</label>
                          <select value={form.academicYearId} onChange={e => setForm({...form, academicYearId: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                             {years.map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Cơ sở (Nếu có)</label>
                          <select value={form.campusId} onChange={e => setForm({...form, campusId: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-sm outline-none">
                             <option value="">Tất cả cơ sở</option>
                             {campuses.map((c: any) => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Đối tượng</label>
                          <select value={form.targetAudience} onChange={e => setForm({...form, targetAudience: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none">
                             {audiences.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                          </select>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Ngày bắt đầu</label>
                           <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Ngày kết thúc</label>
                           <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500" />
                        </div>
                    </div>
                 </div>

                 <div className="mt-10 flex gap-3">
                    <button onClick={() => setModalType(null)} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all">Quay lại</button>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="flex-[2] py-4 bg-[#BE1E2E] hover:bg-[#a01927] text-white rounded-2xl font-bold shadow-lg shadow-red-100 transition-all disabled:opacity-50">
                       {isSubmitting ? "Đang xử lý..." : "Lưu thay đổi"}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center">
        <div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{title}</p>
           <h3 className="text-2xl font-black text-slate-800">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${bg}`}>
           <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  )
}

function Tooltip({ children, label }: any) {
  return (
    <div className="relative group/tt flex items-center justify-center">
       {children}
       <div className="absolute bottom-full mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded pointer-events-none opacity-0 group-hover/tt:opacity-100 transition-opacity whitespace-nowrap z-10">
          {label}
       </div>
    </div>
  )
}