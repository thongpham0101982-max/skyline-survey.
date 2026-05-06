"use client"
import { useState } from "react"
import { Plus, Edit2, Trash2, Check, X, MapPin, Building2, Search } from "lucide-react"
import { createCampus, updateCampus, deleteCampus } from "./actions"

export function CampusManagerClient({ initialCampuses, gdcsUsers = [] }: any) {
  const [campuses, setCampuses] = useState(initialCampuses || [])
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ code: "", name: "", address: "", managerId: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const filtered = (campuses || []).filter((c: any) => 
    (c.campusName || "").toLowerCase().includes(search.toLowerCase()) || 
    (c.campusCode || "").toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async () => {
    if (!form.code || !form.name) {
      setError("Vui lòng nhập đầy đủ Mã và Tên cơ sở!"); return
    }
    setSaving(true); setError("")
    try {
      const res = editingId 
        ? await updateCampus(editingId, form.code, form.name, form.address, undefined, form.managerId)
        : await createCampus(form.code, form.name, form.address, form.managerId)
      
      if (res.success) {
        window.location.reload()
      } else {
        setError(res.error || "Có lỗi xảy ra")
      }
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xác nhận xóa cơ sở "${name}"?`)) return
    const res = await deleteCampus(id)
    if (res.success) {
      setCampuses(campuses.filter((c: any) => c.id !== id))
    } else {
      alert(res.error)
    }
  }

  return (
    <div className="space-y-6 font-outfit">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Tìm kiếm cơ sở..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-50 outline-none transition-all" />
        </div>
        <button onClick={() => { setShowAddForm(true); setEditingId(null); setForm({ code: "", name: "", address: "", managerId: "" }) }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95">
          <Plus className="w-5 h-5" /> Thêm Cơ Sở
        </button>
      </div>

      {(showAddForm || editingId) && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl shadow-slate-200/50 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
            {editingId ? "Cập nhật Cơ sở" : "Thêm Cơ sở Mới"}
          </h3>
          {error && <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm font-semibold mb-6 flex items-center gap-2">
            <X className="w-5 h-5" /> {error}
          </div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Mã Cơ sở *</label>
              <input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
                placeholder="VD: CS1" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Tên Cơ sở *</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="VD: Skyline Central" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Địa chỉ</label>
              <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                placeholder="Tên đầy đủ" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Người phụ trách</label>
              <select value={form.managerId} onChange={e => setForm({...form, managerId: e.target.value})}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all">
                <option value="">-- Chưa phân công --</option>
                {gdcsUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-4 mt-8">
            <button onClick={handleSave} disabled={saving} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95">
              {saving ? "Số liệu đang được lưu..." : "Lưu Thay Đổi"}
            </button>
            <button onClick={() => { setShowAddForm(false); setEditingId(null) }} className="bg-slate-100 text-slate-600 px-8 py-3 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">Hủy bỏ</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Mã Cơ sở</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Tên Cơ sở</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Địa chỉ</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Người phụ trách</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((c: any) => (
                <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg font-black text-xs tracking-wider border border-indigo-100">
                      {c.campusCode}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="font-extrabold text-slate-900">{c.campusName}</div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                      <MapPin className="w-4 h-4 text-slate-300" />
                      {c.address || "Chưa cập nhật"}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="font-semibold text-slate-700 text-sm">
                      {c.manager ? (
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-xs">
                          {c.manager.fullName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Chưa phân công</span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${c.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${c.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                      {c.status === "ACTIVE" ? "Hoạt động" : "Ngưng"}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-100 transition-all ">
                      <button onClick={() => { setEditingId(c.id); setForm({ code: c.campusCode, name: c.campusName, address: c.address || "", managerId: c.managerId || "" }); setShowAddForm(false); }}
                        className="p-2.5 text-indigo-600 hover:bg-white hover:shadow-md rounded-xl transition-all border border-transparent hover:border-indigo-100">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id, c.campusName)}
                        className="p-2.5 text-red-500 hover:bg-white hover:shadow-md rounded-xl transition-all border border-transparent hover:border-red-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Building2 className="w-12 h-12 opacity-20" />
                      <p className="font-bold">Không tìm thấy cơ sở nào phù hợp</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
