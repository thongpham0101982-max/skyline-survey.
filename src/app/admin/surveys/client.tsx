"use client"
import { useState, useMemo } from "react"
import {
  ClipboardList, Trash2, Edit2, Check, X,
  ToggleLeft, ToggleRight, CalendarClock,
  Settings2, Send, Plus, CalendarDays,
  UserCheck, Users, GraduationCap,
  LayoutGrid, List, Search, Filter,
  ArrowRight, MoreVertical, AlertCircle,
  Eye, CheckCircle2, Clock
} from "lucide-react"
import Link from "next/link"

export function AdminSurveysClient({ initialSurveys, years, createAction, updateAction, deleteAction, deleteMultipleAction }: any) {
  const [surveys, setSurveys] = useState(initialSurveys)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Modal states
  const [modalType, setModalType] = useState<"create" | "edit" | null>(null)
  const [currentSurvey, setCurrentSurvey] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    academicYearId: years.find((y: any) => y.status === "ACTIVE")?.id || years[0]?.id || "",
    targetAudience: "PHHS"
  })

  const audiences = [
    { value: "PHHS", label: "Phụ huynh (PHHS)", icon: Users, color: "bg-blue-500", light: "bg-blue-50", text: "text-blue-600" },
    { value: "HocSinh", label: "Học sinh", icon: GraduationCap, color: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-600" },
    { value: "GiaoVien", label: "Giáo viên", icon: UserCheck, color: "bg-amber-500", light: "bg-amber-50", text: "text-amber-600" }
  ]

  const stats = useMemo(() => {
    return {
      total: surveys.length,
      active: surveys.filter((s: any) => s.status === "ACTIVE").length,
      phhs: surveys.filter((s: any) => s.targetAudience === "PHHS").length
    }
  }, [surveys])

  const filteredSurveys = useMemo(() => {
    return surveys.filter((s: any) => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [surveys, searchQuery])

  const handleOpenCreate = () => {
    setForm({
      name: "",
      startDate: "",
      endDate: "",
      academicYearId: years.find((y: any) => y.status === "ACTIVE")?.id || years[0]?.id || "",
      targetAudience: "PHHS"
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
      targetAudience: s.targetAudience || "PHHS"
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
        setSuccessMsg("Tạo đợt khảo sát thành công!")
      } else {
        await updateAction({ ...form, id: currentSurvey.id })
        setSuccessMsg("Cập nhật thành công!")
      }
      setTimeout(() => {
        setSuccessMsg("")
        setModalType(null)
        window.location.reload()
      }, 1500)
    } catch (e: any) {
      setErrorMsg(e.message || "Lỗi hệ thống!")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const next = currentStatus === "ACTIVE" ? "DRAFT" : "ACTIVE"
    try {
      await updateAction({ id, status: next, isActive: next === "ACTIVE" })
      setSurveys(surveys.map((s: any) => s.id === id ? { ...s, status: next } : s))
    } catch(e) {}
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Xác nhận xóa đợt khảo sát này?")) return
    try {
      await deleteAction(id)
      setSurveys(surveys.filter((s: any) => s.id !== id))
    } catch(e) {}
  }

  const getAud = (val: string) => audiences.find(a => a.value === val) || audiences[0]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 font-medium text-sm">Tổng số khảo sát</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{stats.total}</h3>
            </div>
            <div className="bg-indigo-50 p-3 rounded-2xl group-hover:scale-110 transition-transform">
              <ClipboardList className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50/50 w-fit px-3 py-1.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Toàn hệ thống
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 font-medium text-sm">Đang hoạt động</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{stats.active}</h3>
            </div>
            <div className="bg-emerald-50 p-3 rounded-2xl group-hover:scale-110 transition-transform">
              <ToggleRight className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50/50 w-fit px-3 py-1.5 rounded-full">
            <Clock className="w-3 h-3" /> Đang thu thập dữ liệu
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group border-l-4 border-l-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 font-medium text-sm">Khảo sát Phụ huynh</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{stats.phhs}</h3>
            </div>
            <div className="bg-blue-50 p-3 rounded-2xl group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50/50 w-fit px-3 py-1.5 rounded-full">
            <UserCheck className="w-3 h-3" /> Danh mục chính
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm đợt khảo sát..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 items-center border border-slate-200">
            <button 
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-xl transition-all ${viewMode === "list" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-xl transition-all ${viewMode === "grid" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          
          <button 
            onClick={handleOpenCreate}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#BE1E2E] hover:bg-[#a01927] text-white rounded-2xl text-sm font-bold shadow-lg shadow-red-500/25 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-5 h-5" /> Tạo đợt mới
          </button>
        </div>
      </div>

      {/* Main Content View */}
      {viewMode === "list" ? (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="pl-8 pr-4 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Đợt khảo sát</th>
                <th className="px-6 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Đối tượng</th>
                <th className="px-6 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Năm học</th>
                <th className="px-6 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Thời gian</th>
                <th className="px-6 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Trạng thái</th>
                <th className="pr-8 pl-4 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Công cụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSurveys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                      <ClipboardList className="w-16 h-16" />
                      <p className="font-bold text-lg">Không tìm thấy dữ liệu</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSurveys.map((s: any) => {
                  const aud = getAud(s.targetAudience)
                  return (
                    <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="pl-8 pr-4 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl ${aud.light}`}>
                            <ClipboardList className={`w-5 h-5 ${aud.text}`} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-[#BE1E2E] transition-colors">{s.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">Mã: {s.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${aud.text} ${aud.light} border-${aud.text.split("-")[1]}-200`}>
                          <aud.icon className="w-3 h-3" />
                          {aud.label.split("(")[0]}
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 uppercase">
                          {s.academicYear?.name || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                          <CalendarClock className="w-4 h-4 text-slate-400" />
                          <span>{new Date(s.startDate).toLocaleDateString("vi-VN")}</span>
                          <ArrowRight className="w-3 h-3 text-slate-300" />
                          <span>{new Date(s.endDate).toLocaleDateString("vi-VN")}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex justify-center">
                          <button 
                            onClick={() => handleToggleStatus(s.id, s.status)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${s.status === "ACTIVE" ? "bg-[#BE1E2E]" : "bg-slate-200"}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${s.status === "ACTIVE" ? "translate-x-6" : "translate-x-1"}`} />
                          </button>
                        </div>
                      </td>
                      <td className="pr-8 pl-4 py-6">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenEdit(s)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <Link href={"/admin/surveys/" + s.id + "/questions"} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                            <Settings2 className="w-4 h-4 text-blue-500" />
                          </Link>
                          <Link href={"/admin/surveys/" + s.id + "/publish"} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all">
                            <Send className="w-4 h-4 text-emerald-500" />
                          </Link>
                          <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSurveys.map((s: any) => {
            const aud = getAud(s.targetAudience)
            return (
              <div key={s.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 hover:shadow-xl transition-all group overflow-hidden border-t-8" style={{ borderTopColor: s.status === 'ACTIVE' ? '#BE1E2E' : '#E2E8F0' }}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-4 rounded-3xl ${aud.light}`}>
                    <ClipboardList className={`w-6 h-6 ${aud.text}`} />
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.status === 'ACTIVE' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                    {s.status === 'ACTIVE' ? 'Đang mở' : 'Bản nháp'}
                  </div>
                </div>
                <h4 className="text-lg font-bold text-slate-900 group-hover:text-[#BE1E2E] transition-colors">{s.name}</h4>
                <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" /> {s.academicYear?.name}
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Đối tượng</p>
                    <p className={`text-sm font-bold ${aud.text} mt-1`}>{aud.label.split("(")[0]}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Mã đợt</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">{s.code}</p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Link href={"/admin/surveys/" + s.id + "/questions"} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all">
                    <Settings2 className="w-3.5 h-3.5" /> Câu hỏi
                  </Link>
                  <Link href={"/admin/surveys/" + s.id + "/publish"} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl text-xs font-bold transition-all">
                    <Send className="w-3.5 h-3.5" /> Gửi
                  </Link>
                  <button onClick={() => handleOpenEdit(s)} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-2xl border border-slate-100">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal - Tailwind Centered */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="relative p-8 pt-10">
              <button 
                onClick={() => setModalType(null)}
                className="absolute right-6 top-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="bg-[#BE1E2E]/10 p-4 rounded-3xl">
                  <ClipboardList className="w-8 h-8 text-[#BE1E2E]" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">{modalType === "create" ? "Tạo Đợt Khảo Sát" : "Cập Nhật Thông Tin"}</h3>
                  <p className="text-slate-500 text-sm">Điền đầy đủ thông tin để quản lý đợt khảo sát.</p>
                </div>
              </div>

              {errorMsg && (
                <div className="mb-6 bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 text-sm font-bold flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" /> {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-emerald-600 text-sm font-bold flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> {successMsg}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Tên đợt khảo sát</label>
                  <input 
                    type="text" 
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="Ví dụ: Khảo sát cuối HK2..."
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-base focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Năm học</label>
                    <select 
                      value={form.academicYearId}
                      onChange={e => setForm({...form, academicYearId: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-base focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {years.map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Đối tượng</label>
                    <select 
                      value={form.targetAudience}
                      onChange={e => setForm({...form, targetAudience: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-base focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600"
                    >
                      {audiences.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Ngày bắt đầu</label>
                    <div className="relative">
                      <CalendarClock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="date" 
                        value={form.startDate}
                        onChange={e => setForm({...form, startDate: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-6 py-4 text-base focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Ngày kết thúc</label>
                    <div className="relative">
                      <CalendarClock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="date" 
                        value={form.endDate}
                        onChange={e => setForm({...form, endDate: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-6 py-4 text-base focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <button 
                  onClick={() => setModalType(null)}
                  className="flex-1 px-8 py-5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-[1.5rem] font-bold text-base transition-all"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-[2] px-8 py-5 bg-[#BE1E2E] hover:bg-[#a01927] text-white rounded-[1.5rem] font-black text-base shadow-xl shadow-red-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Chờ xử lý..." : "Xác nhận dữ liệu"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
