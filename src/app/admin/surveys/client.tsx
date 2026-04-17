"use client"
import { useState } from "react"
import {
  ClipboardList, Trash2, Edit2, Check, X,
  ToggleLeft, ToggleRight, CalendarClock,
  Settings2, Send, Plus, CalendarDays
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
  })

  const handleCreate = async () => {
    if (!newForm.name.trim()) { setErrorMsg("Vui long nhap ten dot khao sat!"); return }
    if (!newForm.startDate || !newForm.endDate) { setErrorMsg("Vui long chon ngay bat dau va ket thuc!"); return }
    if (!newForm.academicYearId) { setErrorMsg("Vui long chon Nam hoc!"); return }
    setCreating(true); setErrorMsg("")
    try {
      const result = await createAction(newForm)
      if (result?.error) { setErrorMsg(result.error); setCreating(false); return }
      setSuccessMsg("Da tao dot khao sat moi thanh cong!")
      setTimeout(() => setSuccessMsg(""), 4000)
      setShowCreate(false)
      setNewForm({ name: "", startDate: "", endDate: "", academicYearId: defaultYearId })
      window.location.reload()
    } catch(e: any) {
      setErrorMsg(e.message || "Co loi xay ra!")
    }
    setCreating(false)
  }

  const handleEditClick = (s: any) => {
    setEditingId(s.id)
    setEditForm({
      name: s.name,
      startDate: new Date(s.startDate).toISOString().split("T")[0],
      endDate: new Date(s.endDate).toISOString().split("T")[0]
    })
  }

  const handleSaveEdit = async (id: string) => {
    try {
      await updateAction({
        id,
        name: editForm.name,
        startDate: new Date(editForm.startDate),
        endDate: new Date(editForm.endDate)
      })
      setSurveys(surveys.map((s: any) => s.id === id ? {
        ...s, ...editForm,
        startDate: new Date(editForm.startDate),
        endDate: new Date(editForm.endDate)
      } : s))
      setEditingId(null)
      setSuccessMsg("Da luu thay doi!")
      setTimeout(() => setSuccessMsg(""), 3000)
    } catch(e) {}
  }

  const handleSelectAll = (e: any) => { if (e.target.checked) setSelectedIds(surveys.map((s: any) => s.id)); else setSelectedIds([]); }
  const handleSelectOne = (id: string) => { if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(x => x !== id)); else setSelectedIds([...selectedIds, id]); }
  const handleDeleteMultiple = async () => { if (!selectedIds.length) return; if (!confirm('Ban co chac chan muon xoa ' + selectedIds.length + ' dot khao sat da chon?')) return; try { await deleteMultipleAction(selectedIds); setSurveys(surveys.filter((s: any) => !selectedIds.includes(s.id))); setSelectedIds([]); setSuccessMsg('Da xoa thanh cong!'); setTimeout(() => setSuccessMsg(''), 3000); } catch(e) {} }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "DRAFT" : "ACTIVE"
    const newIsActive = newStatus === "ACTIVE"
    try {
      await updateAction({ id, status: newStatus, isActive: newIsActive })
      setSurveys(surveys.map((s: any) => s.id === id ? { ...s, status: newStatus, isActive: newIsActive } : s))
    } catch(e) {}
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Ban co chac chan muon xoa dot khao sat nay?")) return
    try {
      await deleteAction(id)
      setSurveys(surveys.filter((s: any) => s.id !== id))
    } catch(e) {}
  }

  return (
    <div className="space-y-5">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2">
          <X className="w-4 h-4 flex-shrink-0" />{errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />{successMsg}
        </div>
      )}

      {/* Toolbar */}
      <div className='flex justify-between items-center mb-4'>
        <div>
          {selectedIds.length > 0 && (
            <button onClick={handleDeleteMultiple} className='flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-semibold transition-colors'>
              <Trash2 className='w-4 h-4' /> Xoa {selectedIds.length} muc
            </button>
          )}
        </div>
      <div className="flex justify-end">
        <button
          onClick={() => { setShowCreate(!showCreate); setErrorMsg("") }}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-colors"
        >
          <Plus className="w-4 h-4" />Tao dot Khao sat Moi
        </button>
      </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white border-2 border-indigo-200 rounded-2xl p-6 shadow-lg">
          <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />Tao Dot Khao Sat Moi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Nam hoc */}
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />Nam hoc <span className="text-red-500">*</span>
              </label>
              <select
                value={newForm.academicYearId}
                onChange={e => setNewForm({...newForm, academicYearId: e.target.value})}
                className="w-full border-2 border-indigo-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 outline-none focus:border-indigo-400"
              >
                <option value="">(Chon Nam hoc)</option>
                {years.map((y: any) => (
                  <option key={y.id} value={y.id}>{y.name}{y.status === "ACTIVE" ? " (Active)" : ""}</option>
                ))}
              </select>
            </div>
            {/* Ten dot */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Ten dot Khao sat <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newForm.name}
                onChange={e => setNewForm({...newForm, name: e.target.value})}
                placeholder="Khao sat HK1 2026-2027..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
            {/* Ngay */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Bat dau <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={newForm.startDate}
                  onChange={e => setNewForm({...newForm, startDate: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-2 py-2.5 text-sm focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Ket thuc <span className="text-red-500">*</span></label>
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
              {creating ? "Dang tao..." : "Tao Dot Khao Sat"}
            </button>
            <button
              onClick={() => { setShowCreate(false); setErrorMsg("") }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors"
            >Huy</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-4 w-10 text-center"><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" checked={surveys.length > 0 && selectedIds.length === surveys.length} onChange={handleSelectAll} /></th>
              <th className="px-6 py-4 font-semibold text-slate-600">Ten dot khao sat</th>
              <th className="px-5 py-4 font-semibold text-slate-600">Nam hoc</th>
              <th className="px-6 py-4 font-semibold text-slate-600">Thoi gian (Bat dau - Ket thuc)</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-center">Trang thai (Active)</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-center">Cong cu Khao sat</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-center">Hanh dong</th>
            </tr>
          </thead>
          <tbody>
            {surveys.length === 0 && (
              <tr><td colSpan={7} className="p-10 text-center text-slate-400">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>Chua co dot khao sat nao. Nhan "Tao dot Khao sat Moi" de bat dau.</p>
              </td></tr>
            )}
            {surveys.map((s: any) => {
              const isEditing = editingId === s.id
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
                        <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
                          <ClipboardList className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="truncate">{s.name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {s.academicYear ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                        {s.academicYear.name}
                      </span>
                    ) : <span className="text-slate-300 text-xs">-</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm">
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
                      <Link href={`/admin/surveys/${s.id}/questions`}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full font-medium transition-colors text-sm shadow-sm">
                        <Settings2 className="w-4 h-4" />Bo cau hoi
                      </Link>
                      <Link href={`/admin/surveys/${s.id}/publish`}
                        className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full font-medium transition-colors text-sm shadow-sm border border-emerald-100">
                        <Send className="w-4 h-4" />Phat hanh
                      </Link>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {isEditing ? (
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleSaveEdit(s.id)} className="text-green-600 hover:bg-green-50 p-1.5 rounded transition-colors" title="Luu">
                          <Check className="w-5 h-5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-slate-500 hover:bg-slate-100 p-1.5 rounded transition-colors" title="Huy">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEditClick(s)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded transition-colors" title="Sua">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors" title="Xoa">
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
