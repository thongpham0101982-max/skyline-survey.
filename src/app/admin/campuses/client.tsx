"use client"
import { useState } from "react"
import { Plus, Edit2, Trash2, Check, X, MapPin, Building2, Search } from "lucide-react"
import { createCampus, updateCampus, deleteCampus } from "./actions"

export function CampusManagerClient({ initialCampuses }: any) {
  const [campuses, setCampuses] = useState(initialCampuses || [])
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ code: "", name: "", address: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const filtered = campuses.filter((c: any) => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.campusCode.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async () => {
    if (!form.code || !form.name) {
      setError("Vui lòng nhập đầy đủ Mã và Tên cơ sở!"); return
    }
    setSaving(true); setError("")
    try {
      const res = editingId 
        ? await updateCampus(editingId, form.code, form.name, form.address)
        : await createCampus(form.code, form.name, form.address)
      
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Tìm kiếm cơ sở..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" />
        </div>
        <button onClick={() => { setShowAddForm(true); setEditingId(null); setForm({ code: "", name: "", address: "" }) }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 font-semibold shadow-lg shadow-indigo-200">
          <Plus className="w-4 h-4" /> Thêm Cơ Sở
        </button>
      </div>

      {(showAddForm || editingId) && (
        <div className="bg-white border-2 border-indigo-100 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            {editingId ? "Cập nhật Cơ sở" : "Thêm Cơ sở Mới"}
          </h3>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Mã Cơ sở *</label>
              <input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
                placeholder="VD: CS1" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Tên Cơ sở *</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="VD: Skyline Central" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-xs font-bold text-slate-500 mb-1">Địa chỉ</label>
              <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                placeholder="Số 123, đường..." className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleSave} disabled={saving} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
            <button onClick={() => { setShowAddForm(false); setEditingId(null) }} className="bg-slate-100 text-slate-600 px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-200">Hủy</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Mã Cơ sở</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tên Cơ sở</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Địa chỉ</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Trạng thái</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((c: any) => (
              <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4 font-mono font-bold text-indigo-600 text-sm">{c.campusCode}</td>
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{c.name}</div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 opacity-50" />
                  {c.address || "-"}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${c.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {c.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingId(c.id); setForm({ code: c.campusCode, name: c.name, address: c.address || "" }); setShowAddForm(false); }}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(c.id, c.name)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
