"use client"
import { useState } from "react"
import { Edit2, Check, X, Trash2, Star, Calendar, Users, GraduationCap, BookOpen, Plus, Layers } from "lucide-react"

const EDU_SYSTEMS = [
  { code: "HNG", name: "Hội nhập Quốc tế" },
  { code: "SB", name: "Song bằng" },
  { code: "HNS", name: "Hội nhập S" }
];

export function AcademicYearsClient({ initialYears, updateAction, deleteAction, setActiveAction }) {
  const [years, setYears] = useState(initialYears)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  const handleEdit = (y) => {
    setEditingId(y.id)
    setEditForm({
      name: y.name,
      startDate: new Date(y.startDate).toISOString().split("T")[0],
      endDate: new Date(y.endDate).toISOString().split("T")[0]
    })
  }

  const handleSave = async (id) => {
    setSaving(true)
    try {
      await updateAction({ id, name: editForm.name, startDate: new Date(editForm.startDate), endDate: new Date(editForm.endDate) })
      setYears(years.map(y => y.id === id ? {...y, name: editForm.name, startDate: new Date(editForm.startDate), endDate: new Date(editForm.endDate)} : y))
      setEditingId(null)
    } catch(e) {}
    setSaving(false)
  }

  const handleDelete = async (id, name) => {
    if (!confirm("Xóa năm học \"" + name + "\"? Tài khoản GV/PHHS sẽ bị mất liên kết.")) return
    try { await deleteAction(id); setYears(years.filter(y => y.id !== id)) } catch(e) {}
  }

  const handleSetActive = async (id) => {
    setSaving(true)
    try { await setActiveAction(id); setYears(years.map(y => ({...y, status: y.id === id ? "ACTIVE" : "INACTIVE"}))) } catch(e) {}
    setSaving(false)
  }

  const addEduSystem = async (yearId, code, name) => {
    try {
      const res = await fetch("/api/education-systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, academicYearId: yearId })
      });
      if (res.ok) {
        const newItem = await res.json();
        setYears(years.map(y => y.id === yearId ? {...y, educationSystems: [...(y.educationSystems || []), newItem]} : y));
      } else { const err = await res.json(); alert(err.error); }
    } catch(e) { alert("Lỗi: " + e.message); }
  }

  const removeEduSystem = async (yearId, esId) => {
    if (!confirm("Xóa Hệ học này?")) return;
    try {
      await fetch("/api/education-systems?id=" + esId, { method: "DELETE" });
      setYears(years.map(y => y.id === yearId ? {...y, educationSystems: (y.educationSystems || []).filter(e => e.id !== esId)} : y));
    } catch(e) {}
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 font-medium">
        <Star className="inline w-4 h-4 mr-1.5 text-amber-500" />
        Năm học <strong>ACTIVE</strong> sẽ được dùng làm mặc định khi tạo tài khoản GV/PHHS mới.
        Click <strong>&quot;Đặt Active&quot;</strong> để thay đổi năm học hiện tại.
      </div>

      {years.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400">
          <Calendar className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="font-semibold text-lg">Chưa có năm học nào</p>
          <p className="text-sm mt-1">Hãy tạo năm học đầu tiên ở form bên trên.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {years.map(y => {
            const isEditing = editingId === y.id
            const isActive = y.status === "ACTIVE"
            const existingCodes = (y.educationSystems || []).map(e => e.code);
            const availableSystems = EDU_SYSTEMS.filter(s => !existingCodes.includes(s.code));

            return (
              <div key={y.id} className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all ${isActive ? "border-indigo-400 shadow-indigo-100" : "border-slate-200"}`}>
                <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-shrink-0">
                    {isActive ? (
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center"><Star className="w-5 h-5 text-white fill-white" /></div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><Calendar className="w-5 h-5 text-slate-400" /></div>
                    )}
                  </div>

                  <div className="flex-1">
                    {isEditing ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="border border-indigo-300 rounded-lg px-3 py-2 text-sm font-bold outline-none" />
                        <input type="date" value={editForm.startDate} onChange={e => setEditForm({...editForm, startDate: e.target.value})} className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                        <input type="date" value={editForm.endDate} onChange={e => setEditForm({...editForm, endDate: e.target.value})} className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-extrabold text-slate-800 text-xl">{y.name}</h3>
                          {isActive && <span className="text-xs font-bold bg-indigo-600 text-white px-2.5 py-0.5 rounded-full">Đang hoạt động</span>}
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {new Date(y.startDate).toLocaleDateString("vi-VN")} &rarr; {new Date(y.endDate).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center"><GraduationCap className="w-3.5 h-3.5 text-amber-600" /></div>
                        <span className="font-bold text-slate-800">{y.teacherCount ?? 0}</span><span className="text-slate-400 text-xs">GV</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"><Users className="w-3.5 h-3.5 text-blue-600" /></div>
                        <span className="font-bold text-slate-800">{y.parentCount ?? 0}</span><span className="text-slate-400 text-xs">PHHS</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center"><BookOpen className="w-3.5 h-3.5 text-emerald-600" /></div>
                        <span className="font-bold text-slate-800">{y._count?.classes ?? 0}</span><span className="text-slate-400 text-xs">Lớp</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isEditing ? (
                      <>
                        <button onClick={() => handleSave(y.id)} disabled={saving} className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><Check className="w-5 h-5" /></button>
                        <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
                      </>
                    ) : (
                      <>
                        {!isActive && <button onClick={() => handleSetActive(y.id)} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-bold"><Star className="w-3.5 h-3.5" />Đặt Active</button>}
                        <button onClick={() => handleEdit(y)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(y.id, y.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                </div>

                {/* HE HOC SECTION */}
                <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-500" /> Hệ học ({(y.educationSystems || []).length})
                    </h4>
                    {availableSystems.length > 0 && (
                      <div className="flex gap-2">
                        {availableSystems.map(s => (
                          <button key={s.code} onClick={() => addEduSystem(y.id, s.code, s.name)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 text-indigo-600 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors">
                            <Plus className="w-3 h-3" /> {s.code}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {(y.educationSystems || []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Chưa có Hệ học nào. Bấm nút phía trên để thêm.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(y.educationSystems || []).map((es: any) => (
                        <div key={es.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm group">
                          <span className="font-bold text-indigo-700 text-sm">{es.code}</span>
                          <span className="text-slate-500 text-xs">- {es.name}</span>
                          <button onClick={() => removeEduSystem(y.id, es.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}