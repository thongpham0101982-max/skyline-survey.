"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Check, X, Search, Users, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function DepartmentsClient() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterBlock, setFilterBlock] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", description: "", blockCM: "", teamsWebhookUrl: "" });

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/departments");
      if (r.ok) {
        setDepartments(await r.json());
      } else {
        toast.error("Không thể tải danh sách Tổ chuyên môn");
      }
    } catch {
      toast.error("Lỗi khi tải dữ liệu Tổ chuyên môn");
    }
    setLoading(false);
  };

  useEffect(() => { fetchDepartments() }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Vui lòng điền đầy đủ Mã Tổ và Tên Tổ");
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch("/api/departments", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form)
      });
      const data = await r.json();
      if (r.ok) {
        toast.success(editingId ? "Cập nhật Tổ chuyên môn thành công!" : "Tạo mới Tổ chuyên môn thành công!");
        setIsOpen(false);
        setEditingId(null);
        setForm({ code: "", name: "", description: "", blockCM: "", teamsWebhookUrl: "" });
        fetchDepartments();
      } else {
        toast.error(data.error || "Có lỗi xảy ra khi lưu thông tin");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (d: any) => {
    setEditingId(d.id);
    setForm({ code: d.code, name: d.name, description: d.description || "", blockCM: d.blockCM || "", teamsWebhookUrl: d.teamsWebhookUrl || "" });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa Tổ chuyên môn này?")) return;
    try {
      const r = await fetch("/api/departments?id=" + id, { method: "DELETE" });
      if (r.ok) {
        toast.success("Đã xóa Tổ chuyên môn");
        fetchDepartments();
      } else {
        const data = await r.json();
        toast.error(data.error || "Không thể xóa Tổ chuyên môn");
      }
    } catch {
      toast.error("Lỗi khi xóa Tổ chuyên môn");
    }
  };

  const handleDeleteMany = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa " + selectedIds.length + " Tổ đã chọn?")) return;
    try {
      const r = await fetch("/api/departments?ids=" + selectedIds.join(","), { method: "DELETE" });
      if (r.ok) {
        toast.success(`Đã xóa ${selectedIds.length} Tổ chuyên môn`);
        setSelectedIds([]);
        fetchDepartments();
      } else {
        const data = await r.json();
        toast.error(data.error || "Không thể xóa các Tổ đã chọn");
      }
    } catch {
      toast.error("Lỗi khi xóa các Tổ chuyên môn");
    }
  };

  const filtered = departments.filter(d => {
    let match = true;
    if (search) {
      match = match && (d.name.toLowerCase().includes(search.toLowerCase()) || d.code.toLowerCase().includes(search.toLowerCase()));
    }
    if (filterBlock) {
      match = match && d.blockCM === filterBlock;
    }
    return match;
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Users className="w-7 h-7 text-indigo-500 p-1.5 text-xs font-semibold" />
            Quản lý Tổ chuyên môn
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Thêm, sửa, xóa danh sách Tổ chuyên môn / Phòng ban</p>
        </div>
        <button onClick={() => { setEditingId(null); setForm({ code: "", name: "", description: "", blockCM: "", teamsWebhookUrl: "" }); setIsOpen(true); }} className="px-4 py-2.5 bg-[#48BFE3] text-white rounded-xl shadow-sm hover:bg-[#009085] font-semibold flex items-center gap-2 transition-colors cursor-pointer"><Plus className="w-5 h-5"/>Thêm Tổ / Phòng</button>
      </div>

      <div className="bg-white rounded-[1.5rem] shadow-sm border-2 border-violet-100/80 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-4 flex flex-wrap gap-3 justify-between items-center text-xs font-semibold">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo mã hoặc tên..." className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" />
            </div>
            <select value={filterBlock} onChange={e => setFilterBlock(e.target.value)} className="w-48 px-4 py-2 rounded-xl text-sm border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-white cursor-pointer text-slate-600 font-medium">
              <option value="">-- Tất cả Khối CM --</option>
              <option value="Mầm Non">Mầm Non</option>
              <option value="Phổ thông">Phổ thông</option>
              <option value="Điều hành">Điều hành</option>
              <option value="Hỗ trợ người học">Hỗ trợ người học</option>
            </select>
          </div>
          {selectedIds.length > 0 && (
            <button onClick={handleDeleteMany} className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3.5 py-2 rounded-xl font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer">
              <Trash2 className="w-4 h-4"/> Xóa {selectedIds.length} đã chọn
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
              <thead className="text-slate-500 uppercase text-xs font-semibold bg-slate-50/50">
                <tr>
                  <th className="w-10 p-3 border border-slate-200 text-center"><input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={() => setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(d=>d.id))} className="w-4 h-4 rounded text-[#48BFE3] focus:ring-indigo-500 cursor-pointer" /></th>
                  <th className="p-3 border border-slate-200">Mã Tổ</th>
                  <th className="p-3 w-1/3 border border-slate-200">Tên Tổ Chuyên môn</th>
                  <th className="p-3 border border-slate-200">Khối CM</th>
                  <th className="p-3 border border-slate-200">Mô tả</th>
                  <th className="p-3 text-center w-24 border border-slate-200">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? <tr><td colSpan={6} className="p-8 text-center text-slate-400 border border-slate-200">Đang tải danh sách Tổ chuyên môn...</td></tr> : filtered.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400 border border-slate-200">Chưa có Tổ chuyên môn nào.</td></tr> : filtered.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 border border-slate-200 text-center"><input type="checkbox" checked={selectedIds.includes(d.id)} onChange={() => setSelectedIds(p=>p.includes(d.id)?p.filter(x=>x!==d.id):[...p, d.id])} className="w-4 h-4 rounded text-[#48BFE3] cursor-pointer" /></td>
                    <td className="p-3 font-mono font-semibold text-[#009085] border border-slate-200">{d.code}</td>
                    <td className="p-3 font-semibold text-slate-800 border border-slate-200">{d.name}</td>
                    <td className="p-3 border border-slate-200">
                      {d.blockCM ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block ${
                          d.blockCM === "Mầm Non" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                          d.blockCM === "Phổ thông" ? "bg-indigo-50 text-[#009085] border border-indigo-200" :
                          d.blockCM === "Điều hành" ? "bg-teal-50 text-teal-600 border border-teal-200" :
                          d.blockCM === "Hỗ trợ người học" ? "bg-rose-50 text-rose-600 border border-rose-200" :
                          "bg-slate-50 text-slate-600 border border-slate-200"
                        }`}>
                          {d.blockCM}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Chưa phân loại</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500 border border-slate-200 text-xs">{d.description || "-"}</td>
                    <td className="p-3 text-center border border-slate-200">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => handleEdit(d)} title="Sửa" className="p-1.5 text-slate-400 hover:text-[#48BFE3] rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"><Pencil className="w-4 h-4"/></button>
                        <button onClick={() => handleDelete(d.id)} title="Xóa" className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
          </table>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800">{editingId ? "Sửa thông tin" : "Thêm mới"} Tổ chuyên môn</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700">Mã Tổ *</label>
                <input required value={form.code} onChange={e=>setForm({...form, code: e.target.value.toUpperCase().replace(/\s+/g, '_')})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-indigo-500 outline-none font-mono text-sm" placeholder="VD: TO_TOAN" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700">Tên Tổ *</label>
                <input required value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-indigo-500 outline-none text-sm" placeholder="VD: Tổ Toán học" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700">Khối Chuyên Môn</label>
                <select value={form.blockCM} onChange={e=>setForm({...form, blockCM: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-indigo-500 outline-none bg-white text-sm cursor-pointer">
                  <option value="">Chọn Khối CM (Không bắt buộc)</option>
                  <option value="Mầm Non">Mầm Non</option>
                  <option value="Phổ thông">Phổ thông</option>
                  <option value="Điều hành">Điều hành</option>
                  <option value="Hỗ trợ người học">Hỗ trợ người học</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700">Microsoft Teams Webhook URL (Kênh Tổ CM - Không bắt buộc)</label>
                <input value={form.teamsWebhookUrl} onChange={e=>setForm({...form, teamsWebhookUrl: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-indigo-500 outline-none text-xs font-mono" placeholder="https://outlook.office.com/webhook/... (Không bắt buộc)" />
                <p className="text-[11px] text-slate-400 mt-1">Dùng để tự động phát thông báo khi có tiết dạy mở mới hoặc nhắc nhở dự giờ đến kênh Microsoft Teams của Tổ này (không bắt buộc nhập).</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700">Mô tả</label>
                <textarea rows={3} value={form.description} onChange={e=>setForm({...form, description: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-indigo-500 outline-none text-sm" placeholder="Mô tả chức năng, nhiệm vụ của tổ..." />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" disabled={submitting} onClick={() => setIsOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl cursor-pointer transition-colors disabled:opacity-50">Hủy</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-[#48BFE3] text-white font-medium rounded-xl shadow-sm hover:bg-[#009085] flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Đang lưu..." : "Lưu thông tin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
