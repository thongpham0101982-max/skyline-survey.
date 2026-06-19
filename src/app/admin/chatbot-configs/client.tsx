"use client"
import { useState } from "react"
import { Plus, Edit2, Trash2, Check, X, Search, MessageSquareText, Settings } from "lucide-react"
import { createChatbotConfig, updateChatbotConfig, deleteChatbotConfig } from "./actions"

const AVAILABLE_ROLES = ["ADMIN", "TEACHER", "PARENT", "STUDENT"];

export function ChatbotConfigsClient({ initialConfigs = [] }: any) {
  const [configs, setConfigs] = useState(initialConfigs)
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: "",
    code: "",
    systemInstruction: "",
    allowedRoles: [] as string[],
    isActive: true
  })

  const filtered = (configs || []).filter((c: any) => 
    (c.name || "").toLowerCase().includes(search.toLowerCase()) || 
    (c.code || "").toLowerCase().includes(search.toLowerCase())
  )

  const handleRoleToggle = (role: string) => {
    if (form.allowedRoles.includes(role)) {
      setForm({
        ...form,
        allowedRoles: form.allowedRoles.filter(r => r !== role)
      })
    } else {
      setForm({
        ...form,
        allowedRoles: [...form.allowedRoles, role]
      })
    }
  }

  const handleSave = async () => {
    if (!form.name || !form.code || !form.systemInstruction) {
      setError("Vui lòng nhập đầy đủ Tên, Mã định danh và Câu lệnh chỉ dẫn!");
      return
    }
    if (form.allowedRoles.length === 0) {
      setError("Vui lòng chọn ít nhất một quyền hạn được phép truy cập!");
      return
    }

    setSaving(true); setError("")
    try {
      const rolesStr = form.allowedRoles.join(",")
      const res = editingId 
        ? await updateChatbotConfig(editingId, form.name, form.code, form.systemInstruction, rolesStr, form.isActive)
        : await createChatbotConfig(form.name, form.code, form.systemInstruction, rolesStr)
      
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
    if (!confirm(`Xác nhận xóa cấu hình chatbot "${name}"?`)) return
    const res = await deleteChatbotConfig(id)
    if (res.success) {
      setConfigs(configs.filter((c: any) => c.id !== id))
    } else {
      alert(res.error)
    }
  }

  const startEdit = (c: any) => {
    setEditingId(c.id)
    setShowAddForm(false)
    setForm({
      name: c.name,
      code: c.code,
      systemInstruction: c.systemInstruction,
      allowedRoles: c.allowedRoles ? c.allowedRoles.split(",") : [],
      isActive: c.isActive
    })
    setError("")
  }

  return (
    <div className="space-y-6 font-outfit">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Tìm kiếm chatbot..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-50 outline-none transition-all" />
        </div>
        <button onClick={() => { setShowAddForm(true); setEditingId(null); setForm({ name: "", code: "", systemInstruction: "", allowedRoles: ["TEACHER"], isActive: true }) }}
          className="flex items-center gap-2 bg-[#00A19A] text-white px-6 py-3 rounded-2xl hover:bg-[#008c85] font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95">
          <Plus className="w-5 h-5" /> Thêm Chatbot
        </button>
      </div>

      {(showAddForm || editingId) && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl shadow-slate-200/50 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Settings className="w-6 h-6 text-[#00A19A]" />
            </div>
            {editingId ? "Cập nhật Cấu hình Chatbot" : "Thêm Cấu hình Chatbot Mới"}
          </h3>
          
          {error && <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm font-semibold mb-6 flex items-center gap-2">
            <X className="w-5 h-5" /> {error}
          </div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Tên Chatbot *</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="VD: Trợ Lý Chuyên Môn Giáo Viên" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Mã Định Danh *</label>
              <input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
                disabled={!!editingId}
                placeholder="VD: TEACHER_ASSISTANT" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all disabled:bg-slate-50 disabled:text-slate-400" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 mt-6">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Câu lệnh chỉ dẫn (System Instruction) *</label>
              <textarea value={form.systemInstruction} onChange={e => setForm({...form, systemInstruction: e.target.value})}
                rows={5}
                placeholder="Lời dặn cho AI về vai trò, thông tin dữ liệu, và cách thức trả lời..." 
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Quyền hạn truy cập *</label>
              <div className="flex flex-wrap gap-4 p-4 border border-slate-200 rounded-xl">
                {AVAILABLE_ROLES.map(role => (
                  <label key={role} className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.allowedRoles.includes(role)} onChange={() => handleRoleToggle(role)}
                      className="w-4 h-4 rounded text-[#00A19A] focus:ring-[#00A19A]" />
                    {role}
                  </label>
                ))}
              </div>
            </div>

            {editingId && (
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Trạng thái hoạt động</label>
                <div className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl h-[54px]">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})}
                      className="w-4 h-4 rounded text-[#00A19A] focus:ring-[#00A19A]" />
                    Kích hoạt hoạt động
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 mt-8">
            <button onClick={handleSave} disabled={saving} className="bg-[#00A19A] text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 hover:bg-[#008c85] disabled:opacity-50 transition-all active:scale-95">
              {saving ? "Đang lưu cấu hình..." : "Lưu Cấu Hình"}
            </button>
            <button onClick={() => { setShowAddForm(false); setEditingId(null) }} className="bg-slate-100 text-slate-600 px-8 py-3 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">Hủy bỏ</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left whitespace-nowrap border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Tên Trợ Lý</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Mã định danh</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Quyền hạn truy cập</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((c: any) => (
                <tr key={c.id} className="hover:bg-[#00A19A]/10/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-teal-50 text-[#00A19A] rounded-xl flex items-center justify-center font-bold">
                        <MessageSquareText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">{c.name}</div>
                        <div className="text-xs text-slate-400 font-medium truncate max-w-[280px]" title={c.systemInstruction}>
                          {c.systemInstruction}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-mono text-xs font-bold border border-slate-200">
                      {c.code}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-1">
                      {c.allowedRoles ? c.allowedRoles.split(",").map((role: string) => (
                        <span key={role} className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-[10px]">
                          {role}
                        </span>
                      )) : (
                        <span className="text-slate-400 italic text-xs">Không giới hạn</span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {c.isActive ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-black text-[10px]">
                        Hoạt động
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100 font-black text-[10px]">
                        Đã tắt
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(c)} className="p-2 text-slate-400 hover:text-[#00A19A] hover:bg-slate-50 rounded-xl transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id, c.name)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic text-sm">
                    Không tìm thấy cấu hình chatbot nào.
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
