"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react"

export function CategoriesClient() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", subjectType: "" });

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/input-assessment-categories?type=subject");
      if (res.ok) setItems(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ code: "", name: "", subjectType: "" });
    setIsFormOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({ code: item.code, name: item.name, subjectType: item.subjectType || "" });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = editingId
        ? { type: "subject", id: editingId, data: { name: form.name, subjectType: form.subjectType || null } }
        : { type: "subject", data: { code: form.code, name: form.name, subjectType: form.subjectType || null } };
      const res = await fetch("/api/input-assessment-categories", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) { setIsFormOpen(false); fetchItems(); }
      else { const err = await res.json(); alert(err.error); }
    } catch (e: any) { alert("Error: " + e.message); }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Ban co chac chan muon xoa mon khao sat nay?")) return;
    await fetch("/api/input-assessment-categories?type=subject&id=" + id, { method: "DELETE" });
    fetchItems();
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Danh muc Mon Khao sat ({items.length})
          </h3>
          <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm">
            <Plus className="w-4 h-4" /> Them moi
          </button>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Dang tai...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-slate-400">Chua co mon khao sat nao. Hay them moi.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs uppercase">
                  <th className="px-5 py-3 text-left w-12">STT</th>
                  <th className="px-5 py-3 text-left">Ma mon</th>
                  <th className="px-5 py-3 text-left">Ten mon</th>
                  <th className="px-5 py-3 text-left">Loai</th>
                  <th className="px-5 py-3 text-left">Trang thai</th>
                  <th className="px-5 py-3 text-center w-24">Thao tac</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} className="border-t border-slate-100 hover:bg-indigo-50/30 transition-colors">
                    <td className="px-5 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-5 py-3 font-mono font-bold text-indigo-700">{item.code}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{item.name}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {item.subjectType ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{item.subjectType}</span>
                      ) : '-'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {item.status === 'ACTIVE' ? 'Hoat dong' : 'Ngung'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg">{editingId ? "Sua" : "Them moi"} Mon Khao sat</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-red-500 text-xl">x</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ma mon *</label>
                <input required disabled={!!editingId} value={form.code} onChange={e => setForm({...form, code: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 disabled:bg-slate-100 font-mono"
                  placeholder="VD: TAM_LY, TA_VIET, TOAN" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ten mon *</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500"
                  placeholder="VD: Tam ly, Tieng Anh (viet), Toan" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Loai mon</label>
                <select value={form.subjectType} onChange={e => setForm({...form, subjectType: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 bg-white">
                  <option value="">-- Chon loai --</option>
                  <option value="Viet">Viet</option>
                  <option value="Van dap">Van dap</option>
                  <option value="Trac nghiem">Trac nghiem</option>
                  <option value="Thuc hanh">Thuc hanh</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Huy</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-sm">Luu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}