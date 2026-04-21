"use client"
import { useState } from "react"
import {
  ClipboardList, Trash2, Edit2, Check, X,
  ToggleLeft, ToggleRight, CalendarClock,
  Settings2, Send, Plus, CalendarDays,
  UserCheck, Users, GraduationCap
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
    { value: "PHHS", label: "Phụ huynh (PHHS)", icon: Users },
    { value: "HocSinh", label: "Học sinh", icon: GraduationCap },
    { value: "GiaoVien", label: "Giáo viên", icon: UserCheck }
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

  const handleSelectAll = (e: any) => { if (e.target.checked) setSelectedIds(surveys.map((s: any) => s.id)); else setSelectedIds([]); }
  const handleSelectOne = (id: string) => { if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(x => x !== id)); else setSelectedIds([...selectedIds, id]); }
  const handleDeleteMultiple = async () => { if (!selectedIds.length) return; if (!confirm('Bạn có chắc chắn muốn xóa ' + selectedIds.length + ' đợt khảo sát đã chọn?')) return; try { await deleteMultipleAction(selectedIds); setSurveys(surveys.filter((s: any) => !selectedIds.includes(s.id))); setSelectedIds([]); setSuccessMsg('Đã xóa thành công!'); setTimeout(() => setSuccessMsg(''), 3000); } catch(e) {} }

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
    <div className="space-y-5">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-1">
          <X className="w-4 h-4 flex-shrink-0" />{errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-1">
          <Check className="w-4 h-4 flex-shrink-0" />{successMsg}
        </div>
      )}

      <div className='flex justify-between items-center mb-4'>
        <div>
          {selectedIds.length > 0 && (
            <button onClick={handleDeleteMultiple} className='flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-semibold transition-colors'>
              <Trash2 className='w-4 h-4' /> Xóa {selectedIds.length} mục
            </button>
          )}
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => { setShowCreate(!showCreate); setErrorMsg("") }}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tạo đợt Khảo sát Mới
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-white border-2 border-indigo-100 rounded-2xl p-6 shadow-lg animate-in zoom-in-95 duration-200">
          <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" /> Tạo Đợt Khảo Sát Mới
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3">
              <label className="block text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-500" /> Năm học <span className="text-red-500">*</span>
              </label>
              <select
                value={newForm.academicYearId}
                onChange={e => setNewForm({...newForm, academicYearId: e.target.value})}
                className="w-full border-2 border-indigo-100 rounded-lg px-3 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 outline-none focus:border-indigo-400"
              >
                <option value="">(Chọn Năm học)</option>
                {years.map((y: any) => (
                  <option key={y.id} value={y.id}>{y.name}{y.status === "ACTIVE" ? " (Active)" : ""}</option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-5">
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Tên đợt Khảo sát <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newForm.name}
                onChange={e => setNewForm({...newForm, name: e.target.value})}
                placeholder="Ví dụ: Khảo sát HK1 2026-2027..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="lg:col-span-4">
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Đối tượng Khảo sát <span className="text-red-500">*</span></label>
              <select
                value={newForm.targetAudience}
                onChange={e => setNewForm({...newForm, targetAudience: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-indigo-600 outline-none focus:border-indigo-500"
              >
                {audiences.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div className="lg:col-span-6 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Ngày bắt đầu <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={newForm.startDate}
                  onChange={e => setNewForm({...newForm, startDate: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-2 py-2.5 text-sm focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Ngày kết thúc <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={newForm.endDate}
                  onChange={e => setNewForm({...newForm, endDate: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-2 py-2.5 text-sm focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5 pt-5 border-t border-slate-100">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-md disabled:opacity-60 transition-colors"
            >
              {creating ? "Đang tạo..." : "Xác nhận Tạo Đợt"}
            </button>
            <button
              onClick={() => { setShowCreate(false); setErrorMsg("") }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors"
            >Hủy</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-4 w-10 text-center"><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" checked={surveys.length > 0 && selectedIds.length === surveys.length} onChange={handleSelectAll} /></th>
              <th className="px-6 py-4 font-semibold text-slate-600">Tên đợt khảo sát</th>
              <th className="px-5 py-4 font-semibold text-slate-600 text-center">Năm học</th>
              <th className="px-5 py-4 font-semibold text-slate-600 text-center">Đối tượng</th>
              <th className="px-6 py-4 font-semibold text-slate-600">Thời gian (Bắt đầu - Kết thúc)</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-center">Trạng thái (Active)</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-center">Công cụ</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {surveys.length === 0 && (
              <tr><td colSpan={8} className="p-10 text-center text-slate-400">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>Chưa có đợt khảo sát nào. Nhấn "Tạo đợt Khảo sát Mới" để bắt đầu.</p>
              </td></tr>
            )}
            {surveys.map((s: any) => {
              const isEditing = editingId === s.id
              const aud = getAudienceLabel(s.targetAudience)
              return (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 text-center"><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" checked={selectedIds.includes(s.id)} onChange={() => handleSelectOne(s.id)} /></td>
                  <td className="px-6 py-4 text-slate-900 font-semibold max-w-[240px] truncate">
                    {isEditing ? (
                      <input type="text" value={editForm.name}
                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                        className="border p-1.5 rounded w-full text-sm font-normal" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="bg-indigo-100 p-2 rounded-lg flex-shrink-0">
                          <ClipboardList className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="truncate">{s.name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {s.academicYear ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap uppercase">
                        {s.academicYear.name}
                      </span>
                    ) : <span className="text-slate-300 text-xs">-</span>}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {isEditing ? (
                      <select value={editForm.targetAudience} onChange={e => setEditForm({...editForm, targetAudience: e.target.value})} className="border p-1 rounded text-[10px] font-bold uppercase">
                        {audiences.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase">
                        {aud.label.split("(")[0]}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-[13px]">
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        <input type="date" value={editForm.startDate}
                          onChange={e => setEditForm({...editForm, startDate: e.target.value})}
                          className="border p-1 rounded w-36 text-xs" />
                        <input type="date" value={editForm.endDate}
                          onChange={e => setEditForm({...editForm, endDate: e.target.value})}
                          className="border p-1 rounded w-36 text-xs" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <CalendarClock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        {new Date(s.startDate).toLocaleDateString("vi-VN")} &rarr; {new Date(s.endDate).toLocaleDateString("vi-VN")}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button onClick={() => handleToggleStatus(s.id, s.status)} className="focus:outline-none group">
                        {s.status === "ACTIVE" ? (
                          <ToggleRight className="w-8 h-8 text-green-500 group-hover:text-green-600 transition-colors" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-400 group-hover:text-slate-500 transition-colors" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <Link href={"/admin/surveys/" + s.id + "/questions"}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full font-medium transition-colors text-xs border border-indigo-100 shadow-sm">
                        <Settings2 className="w-4 h-4" /> Bộ câu hỏi
                      </Link>
                      <Link href={"/admin/surveys/" + s.id + "/publish"}
                        className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full font-medium transition-colors text-xs border border-emerald-100 shadow-sm">
                        <Send className="w-4 h-4" /> Phát hành
                      </Link>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {isEditing ? (
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleSaveEdit(s.id)} className="text-green-600 hover:bg-green-50 p-1.5 rounded transition-colors" title="Lưu">
                          <Check className="w-5 h-5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-slate-500 hover:bg-slate-100 p-1.5 rounded transition-colors" title="Hủy">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEditClick(s)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded transition-colors" title="Sửa">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors" title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
