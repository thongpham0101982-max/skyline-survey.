"use client"
import { useEffect, useState } from "react"
import { Plus, Edit2, Trash2, X, MapPin, Building2, Search } from "lucide-react"
import { createCampus, updateCampus, deleteCampus } from "./actions"

export function CampusManagerClient({ initialCampuses, gdcsUsers = [] }: any) {
  const [campuses, setCampuses] = useState(initialCampuses || [])
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ code: "", name: "", address: "", managerId: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setCampuses(initialCampuses || [])
  }, [initialCampuses])

  const filtered = (campuses || []).filter((c: any) =>
    (c.campusName || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.campusCode || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.address || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.manager?.fullName || "").toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async () => {
    if (!form.code || !form.name) {
      setError("Vui lòng nhập đầy đủ Mã và Tên cơ sở!")
      return
    }
    setSaving(true)
    setError("")
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
          <input
            type="text"
            placeholder="Tìm kiếm cơ sở, người phụ trách..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 outline-none transition-all bg-white"
          />
        </div>
        <button
          onClick={() => {
            setShowAddForm(true)
            setEditingId(null)
            setError("")
            setForm({ code: "", name: "", address: "", managerId: "" })
          }}
          className="flex items-center gap-2 bg-[#003B3A] text-white px-5 py-2.5 rounded-xl hover:bg-[#00736E] text-sm font-semibold shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> Thêm cơ sở
        </button>
      </div>

      {(showAddForm || editingId) && (
        <div className="bg-white border border-slate-200 border-l-4 border-l-[#003B3A] rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-[#00A19A]" />
            {editingId ? "Cập nhật cơ sở" : "Thêm cơ sở mới"}
          </h3>
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-medium mb-5 flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Mã cơ sở *</label>
              <input
                type="text"
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="VD: CS1"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold tabular-nums outline-none focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Tên cơ sở *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="VD: CS1"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Tên đầy đủ</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="VD: Sky-Line Beach"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Người phụ trách (GĐCS)</label>
              <select
                value={form.managerId}
                onChange={e => setForm({ ...form, managerId: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium tabular-nums outline-none bg-white focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 transition-all"
              >
                <option value="">-- Chưa phân công --</option>
                {gdcsUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#003B3A] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#00736E] disabled:opacity-50 transition-all active:scale-95"
            >
              {saving ? "Đang lưu thay đổi..." : "Lưu thay đổi"}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setEditingId(null)
                setError("")
              }}
              className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all"
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap border-collapse tabular-nums">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">Mã cơ sở</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">Tên cơ sở</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">Tên đầy đủ</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">Người phụ trách (GĐCS)</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">Trạng thái</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 text-sm font-bold text-[#003B3A]">
                    {c.campusCode}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                    {c.campusName}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      {c.address || "Chưa cập nhật"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {c.manager ? (
                      <span className="text-[#00736E] font-semibold">
                        {c.manager.fullName}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">Chưa phân công</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        c.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          c.status === "ACTIVE" ? "bg-emerald-600" : "bg-slate-400"
                        }`}
                      />
                      {c.status === "ACTIVE" ? "Hoạt động" : "Ngưng"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingId(c.id)
                          setError("")
                          setForm({
                            code: c.campusCode,
                            name: c.campusName,
                            address: c.address || "",
                            managerId: c.managerId || ""
                          })
                          setShowAddForm(false)
                        }}
                        title="Chỉnh sửa cơ sở"
                        className="p-2 text-[#008B85] hover:bg-teal-50 rounded-lg transition-all border border-transparent hover:border-teal-200"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.campusName)}
                        title="Xóa cơ sở"
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-transparent hover:border-rose-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Building2 className="w-10 h-10 opacity-30" />
                      <p className="text-sm font-medium">Không tìm thấy cơ sở nào phù hợp</p>
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
