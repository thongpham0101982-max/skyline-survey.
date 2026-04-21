"use client"
import { useState } from "react"
import {
  ClipboardList, Trash2, Edit2, Check, X,
  ToggleLeft, ToggleRight, CalendarClock,
  Settings2, Send, Plus, CalendarDays,
  UserCheck, Users, GraduationCap, ShieldCheck
} from "lucide-react"
import Link from "next/link"

export function AdminSurveysClient({ initialSurveys, years, createAction, updateAction, deleteAction, deleteMultipleAction }: any) {
  const [surveys, setSurveys] = useState(initialSurveys)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  
  const defaultYearId = years.find((y: any) => y.status === "ACTIVE")?.id || years[0]?.id || ""
  const [newForm, setNewForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    academicYearId: defaultYearId,
    targetAudience: "PHHS"
  })

  const audiences = [
    { value: "PHHS", label: "Phụ huynh (PHHS)", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { value: "HocSinh", label: "Học sinh", icon: GraduationCap, color: "text-indigo-600", bg: "bg-indigo-50" },
    { value: "GiaoVien", label: "Giáo viên", icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" }
  ]

  const handleCreate = async () => {
    if (!newForm.name.trim()) { setErrorMsg("Vui lòng nhập tên đợt khảo sát!"); return }
    if (!newForm.startDate || !newForm.endDate) { setErrorMsg("Vui lòng chọn ngày bắt đầu và kết thúc!"); return }
    if (!newForm.academicYearId) { setErrorMsg("Vui lòng chọn Năm học!"); return }
    setCreating(true); setErrorMsg("")
    try {
      const result = await createAction(newForm)
      if (result?.error) { setErrorMsg(result.error); setCreating(false); return }
      setSuccessMsg("Đã tạo đợt khảo sát mới thành công!")
      setTimeout(() => setSuccessMsg(""), 4000)
      setShowCreate(false)
      setNewForm({ name: "", startDate: "", endDate: "", academicYearId: defaultYearId, targetAudience: "PHHS" })
      window.location.reload()
    } catch(e: any) {
      setErrorMsg(e.message || "Có lỗi xảy ra!")
    }
    setCreating(false)
  }

  const handleEditClick = (s: any) => {
    setEditingId(s.id)
    setEditForm({
      name: s.name,
      startDate: new Date(s.startDate).toISOString().split("T")[0],
      endDate: new Date(s.endDate).toISOString().split("T")[0],
      targetAudience: s.targetAudience || "PHHS"
    })
  }

  const handleSaveEdit = async (id: string) => {
    try {
      await updateAction({
        id,
        name: editForm.name,
        startDate: new Date(editForm.startDate),
        endDate: new Date(editForm.endDate),
        targetAudience: editForm.targetAudience
      })
      setSurveys(surveys.map((s: any) => s.id === id ? {
        ...s, ...editForm,
        startDate: new Date(editForm.startDate),
        endDate: new Date(editForm.endDate),
        targetAudience: editForm.targetAudience
      } : s))
      setEditingId(null)
      setSuccessMsg("Đã lưu thay đổi!")
      setTimeout(() => setSuccessMsg(""), 3000)
    } catch(e) {}
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "DRAFT" : "ACTIVE"
    const newIsActive = newStatus === "ACTIVE"
    try {
      await updateAction({ id, status: newStatus, isActive: newIsActive })
      setSurveys(surveys.map((s: any) => s.id === id ? { ...s, status: newStatus, isActive: newIsActive } : s))
    } catch(e) {}
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa đợt khảo sát này?")) return
    try {
      await deleteAction(id)
      setSurveys(surveys.filter((s: any) => s.id !== id))
    } catch(e) {}
  }

  const getAudienceLabel = (val: string) => audiences.find(a => a.value === val) || audiences[0]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600" /> Quản lý Khảo sát
          </h1>
          <p className="text-slate-500 text-sm mt-1">Thiết lập và quản lý các đợt khảo sát đối với các đối tượng trong trường.</p>
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setErrorMsg("") }}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all"
        >
          <Plus className="w-5 h-5" /> Tạo đợt Khảo sát Mới
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2">
          <X className="w-4 h-4 flex-shrink-0" />{errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2">
          <Check className="w-4 h-4 flex-shrink-0" />{successMsg}
        </div>
      )}

      {showCreate && (
        <div className="bg-white border-2 border-indigo-100 rounded-2xl p-7 shadow-xl animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-indigo-600" /> Tạo Đợt Khảo Sát Mới
            </h3>
            <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3">
              <label className="block text-sm font-bold text-slate-700 mb-2">Năm học <span className="text-red-500">*</span></label>
              <select
                value={newForm.academicYearId}
                onChange={e => setNewForm({...newForm, academicYearId: e.target.value})}
                className="w-full border-2 border-slate-100 rounded-xl px-3 py-3 text-sm font-semibold text-indigo-700 bg-slate-50 outline-none focus:border-indigo-400 transition-all cursor-pointer"
              >
                <option value="">(Chọn Năm học)</option>
                {years.map((y: any) => (
                  <option key={y.id} value={y.id}>{y.name}{y.status === "ACTIVE" ? " (Đang dùng)" : ""}</option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-5">
              <label className="block text-sm font-bold text-slate-700 mb-2">Tên đợt Khảo sát <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newForm.name}
                onChange={e => setNewForm({...newForm, name: e.target.value})}
                placeholder="Ví dụ: Khảo sát chất lượng HK1 2026-2027..."
                className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
            <div className="lg:col-span-4">
              <label className="block text-sm font-bold text-slate-700 mb-2">Đối tượng Khảo sát <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                {audiences.map((aud) => (
                  <button
                    key={aud.value}
                    onClick={() => setNewForm({...newForm, targetAudience: aud.value})}
                    type="button"
                    className={lex-1 flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all }
                  >
                    <aud.icon className={w-4 h-4 } />
                    <span className="text-[10px] font-bold uppercase truncate w-full text-center">{aud.label.split("(")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="lg:col-span-3">
              <label className="block text-sm font-bold text-slate-700 mb-2">Ngày bắt đầu <span className="text-red-500">*</span></label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={newForm.startDate}
                  onChange={e => setNewForm({...newForm, startDate: e.target.value})}
                  className="w-full border-2 border-slate-100 rounded-xl pl-10 pr-3 py-3 text-sm focus:border-indigo-400 outline-none transition-all"
                />
              </div>
            </div>
            <div className="lg:col-span-3">
              <label className="block text-sm font-bold text-slate-700 mb-2">Ngày kết thúc <span className="text-red-500">*</span></label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={newForm.endDate}
                  onChange={e => setNewForm({...newForm, endDate: e.target.value})}
                  className="w-full border-2 border-slate-100 rounded-xl pl-10 pr-3 py-3 text-sm focus:border-indigo-400 outline-none transition-all"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 disabled:opacity-60 transition-all transform active:scale-95"
            >
              {creating ? "Đang tạo..." : "Xác nhận Tạo Đợt"}
            </button>
          </div>
        </div>
      }

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 uppercase text-[11px] font-bold tracking-wider text-slate-500">
              <th className="px-5 py-4 w-10 text-center"><input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer" checked={surveys.length > 0 && selectedIds.length === surveys.length} onChange={handleSelectAll} /></th>
              <th className="px-6 py-4">Tên đợt khảo sát</th>
              <th className="px-6 py-4 text-center">Năm học</th>
              <th className="px-6 py-4 text-center">Đối tượng</th>
              <th className="px-6 py-4">Thời gian hiệu lực</th>
              <th className="px-6 py-4 text-center">Trạng thái</th>
              <th className="px-6 py-4 text-center">Công cụ & Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {surveys.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-20 text-center bg-slate-50/30">
                  <ClipboardList className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                  <h3 className="text-slate-400 font-semibold mb-1">Chưa có đợt khảo sát nào</h3>
                  <p className="text-slate-400 text-sm">Nhấn nút phía trên để bắt đầu tạo đợt đầu tiên.</p>
                </td>
              </tr>
            ) : (
              surveys.map((s: any) => {
                const isEditing = editingId === s.id
                const aud = getAudienceLabel(s.targetAudience)
                const AudIcon = aud.icon
                return (
                  <tr key={s.id} className={hover:bg-indigo-50/30 transition-all \}>
                    <td className="px-5 py-5 text-center">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer" checked={selectedIds.includes(s.id)} onChange={() => handleSelectOne(s.id)} />
                    </td>
                    <td className="px-6 py-5">
                      {isEditing ? (
                        <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="border-2 border-indigo-200 p-2 rounded-xl w-full text-sm font-semibold outline-none focus:border-indigo-500 shadow-sm transition-all" />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-100 p-2.5 rounded-xl flex-shrink-0">
                            <ClipboardList className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-[14px] leading-tight">{s.name}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tight mt-0.5">MÃ: {s.code}</div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shadow-sm uppercase">
                        {s.academicYear?.name || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {isEditing ? (
                        <select value={editForm.targetAudience} onChange={e => setEditForm({...editForm, targetAudience: e.target.value})} className="border-2 border-slate-200 p-2 rounded-xl text-xs font-bold outline-none">
                          {audiences.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                      ) : (
                        <div className={inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full \ \ border border-current shadow-sm text-[11px] font-bold}>
                          <AudIcon className="w-3.5 h-3.5" />
                          {aud.label.split("(")[0]}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <input type="date" value={editForm.startDate} onChange={e => setEditForm({...editForm, startDate: e.target.value})} className="border-2 border-slate-100 p-2 rounded-lg text-xs" />
                          <input type="date" value={editForm.endDate} onChange={e => setEditForm({...editForm, endDate: e.target.value})} className="border-2 border-slate-100 p-2 rounded-lg text-xs" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-600 text-[12px] font-medium">
                          <CalendarClock className="w-4 h-4 text-slate-400" />
                          <span>{new Date(s.startDate).toLocaleDateString("vi-VN")}</span>
                          <span className="text-slate-300">&rarr;</span>
                          <span>{new Date(s.endDate).toLocaleDateString("vi-VN")}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center">
                        <button onClick={() => handleToggleStatus(s.id, s.status)} className="transition-transform active:scale-90 scale-110">
                          {s.status === "ACTIVE" ? (
                            <ToggleRight className="w-9 h-9 text-green-500 hover:text-green-600" />
                          ) : (
                            <ToggleLeft className="w-9 h-9 text-slate-300 hover:text-slate-400" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center gap-2">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button onClick={() => handleSaveEdit(s.id)} className="p-2.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-xl transition-all border border-green-100 shadow-sm" title="Lưu">
                              <Check className="w-5 h-5" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-2.5 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl transition-all border border-slate-100 shadow-sm" title="Hủy">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Link href={/admin/surveys/\/questions} className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold transition-all text-[11px] border border-indigo-100 shadow-sm uppercase group">
                              <Settings2 className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                              Câu hỏi
                            </Link>
                            <Link href={/admin/surveys/\/publish} className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-bold transition-all text-[11px] border border-emerald-100 shadow-sm uppercase group">
                              <Send className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                              Gửi tin
                            </Link>
                            <div className="w-[1px] h-8 bg-slate-100 mx-1 self-center" />
                            <button onClick={() => handleEditClick(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Sửa">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(s.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Xóa">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-5 border border-slate-800">
          <span className="text-sm font-bold flex items-center gap-2">
            <Check className="w-5 h-5 text-green-400" /> Đã chọn {selectedIds.length} đợt khảo sát
          </span>
          <div className="w-[1px] h-6 bg-slate-700" />
          <button onClick={handleDeleteMultiple} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-bold transition-all border border-red-500/20">
            <Trash2 className="w-4 h-4" /> Xóa hàng loạt
          </button>
          <button onClick={() => setSelectedIds([])} className="text-slate-400 hover:text-white text-sm font-bold transition-colors">
            Hủy chọn
          </button>
        </div>
      )}
    </div>
  )
}
