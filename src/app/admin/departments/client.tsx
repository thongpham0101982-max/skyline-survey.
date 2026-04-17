"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Check, X, Search, Users } from "lucide-react";

export default function DepartmentsClient() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", description: "" });

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/departments");
      if (r.ok) setDepartments(await r.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchDepartments() }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/departments", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...form } : form)
    });
    if (r.ok) {
      setIsOpen(false);
      fetchDepartments();
    } else alert((await r.json()).error);
  };

  const handleEdit = (d: any) => {
    setEditingId(d.id);
    setForm({ code: d.code, name: d.name, description: d.description || "" });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa Tổ chuyên môn này?")) return;
    await fetch("/api/departments?id=" + id, { method: "DELETE" });
    fetchDepartments();
  };

  const handleDeleteMany = async () => {
    if (!confirm("Xóa " + selectedIds.length + " Tổ đã chọn?")) return;
    await fetch("/api/departments?ids=" + selectedIds.join(","), { method: "DELETE" });
    setSelectedIds([]);
    fetchDepartments();
  };

  const filtered = departments.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Users className="w-7 h-7 text-indigo-500 bg-indigo-50 p-1.5 rounded-lg" />
            Quản lý Tổ chuyên môn
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Thêm, sửa, xóa danh sách Tổ chuyên môn / Phòng ban</p>
        </div>
        <button onClick={() => { setEditingId(null); setForm({ code: "", name: "", description: "" }); setIsOpen(true); }} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 font-semibold flex items-center gap-2"><Plus className="w-5 h-5"/>Thêm Tổ / Phòng</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="relative w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo mã hoặc tên..." className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
          </div>
          {selectedIds.length > 0 && <button onClick={handleDeleteMany} className="px-4 py-2 bg-red-500 text-white rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-red-600"><Trash2 className="w-4 h-4"/> Xóa {selectedIds.length} đã chọn</button>}
        </div>
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
              <tr>
                <th className="w-10 px-4 py-3"><input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={() => setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(d=>d.id))} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" /></th>
                <th className="px-4 py-3">Mã Tổ</th>
                <th className="px-4 py-3 w-1/3">Tên Tổ Chuyên môn</th>
                <th className="px-4 py-3">Mô tả</th>
                <th className="px-4 py-3 text-center w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">Đang tải...</td></tr> : filtered.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">Chưa có Tổ chuyên môn nào.</td></tr> : filtered.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.includes(d.id)} onChange={() => setSelectedIds(p=>p.includes(d.id)?p.filter(x=>x!==d.id):[...p, d.id])} className="w-4 h-4 rounded text-indigo-600" /></td>
                  <td className="px-4 py-3 font-mono font-medium text-indigo-600">{d.code}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{d.name}</td>
                  <td className="px-4 py-3 text-slate-500">{d.description || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => handleEdit(d)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"><Pencil className="w-4 h-4"/></button>
                      <button onClick={() => handleDelete(d.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
        </table>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">{editingId ? "Sửa" : "Thêm"} Tổ chuyên môn</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700">Mã Tổ *</label>
                <input required value={form.code} onChange={e=>setForm({...form, code: e.target.value.toUpperCase().replace(/s+/g, '_')})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-indigo-500 outline-none font-mono" placeholder="VD: TO_TOAN" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700">Tên Tổ *</label>
                <input required value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-indigo-500 outline-none" placeholder="Tổ Toán học" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700">Mô tả</label>
                <textarea rows={3} value={form.description} onChange={e=>setForm({...form, description: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-indigo-500 outline-none" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl">Hủy</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl shadow-sm hover:bg-indigo-700">Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
