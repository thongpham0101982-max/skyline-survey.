"use client"
import { useState, Fragment } from "react"
import { Shield, Plus, Save, Edit, Trash2, X } from "lucide-react"
import { savePermissions, createRole, updateRole, deleteRole } from "./actions"
import { APP_CATEGORIES, ALL_APP_MODULES } from "@/config/modules"

const emptyPerm = (code: string) => ({
  module: code, canRead: false, canCreate: false, canUpdate: false, canDelete: false,
});

export function RolesClient({ initialRoles }: any) {
  const [roles, setRoles] = useState(initialRoles || []);
  const [activeRole, setActiveRole] = useState(roles[0]?.code || "");
  const [savingMatrix, setSavingMatrix] = useState(false);

  const buildPerms = (roleCode: string) => {
    const r = roles.find((r: any) => r.code === roleCode);
    return ALL_APP_MODULES.map(m => {
      const existing = r?.permissions?.find((p: any) => p.module === m.code);
      return existing ? { ...existing } : emptyPerm(m.code);
    });
  };

  const [permissions, setPermissions] = useState<any[]>(() => buildPerms(activeRole));
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'ADD'|'EDIT'>('ADD');
  const [formData, setFormData] = useState({ code: '', name: '', description: '' });
  const [loading, setLoading] = useState(false);

  const switchRole = (code: string) => {
    setActiveRole(code);
    setPermissions(buildPerms(code));
  };

  const togglePerm = (moduleCode: string, field: string) => {
    setPermissions(prev => prev.map(p => {
      if (p.module !== moduleCode) return p;
      let newP = { ...p, [field]: !p[field] };
      if ((field === "canCreate" || field === "canUpdate" || field === "canDelete") && newP[field])
        newP.canRead = true;
      if (field === "canRead" && !newP.canRead)
        newP.canCreate = newP.canUpdate = newP.canDelete = false;
      return newP;
    }));
  };

  const handleSavePerms = async () => {
    setSavingMatrix(true);
    const res = await savePermissions(activeRole, permissions);
    if (!res.success) alert("Lỗi: " + res.error);
    else window.location.reload();
    setSavingMatrix(false);
  };

  const colorStyles: Record<string, string> = {
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100"
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Roles List */}
      <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-fit">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600"/> Nhóm Quyền
          </h3>
          <button 
             onClick={() => { setModalMode('ADD'); setFormData({ code: '', name: '', description: '' }); setModalOpen(true); }}
             className="text-indigo-600 hover:bg-indigo-100 p-1.5 rounded-lg transition-colors">
            <Plus className="w-4 h-4"/>
          </button>
        </div>
        <div className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
          {roles.map((r: any) => (
            <div key={r.code} className={`group relative flex items-stretch w-full rounded-xl transition-all duration-200 ${activeRole === r.code ? "bg-indigo-50 border border-indigo-100 shadow-sm" : "hover:bg-slate-50 border border-transparent"}`}>
              <button onClick={() => switchRole(r.code)} className="flex-1 text-left px-4 py-3">
                <div className={`font-semibold text-sm ${activeRole === r.code ? "text-indigo-700" : "text-slate-700"}`}>{r.name}</div>
                <div className="text-xs text-slate-500 mt-1 line-clamp-1">{r.description || r.code}</div>
              </button>
              
              {!r.isSystem && (
                <div className="opacity-0 group-hover:opacity-100 flex flex-col justify-center gap-1 px-2 border-l border-slate-200 transition-opacity">
                  <button onClick={() => { setModalMode('EDIT'); setFormData({ code: r.code, name: r.name, description: r.description || '' }); setModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg"><Edit className="w-3.5 h-3.5" /></button>
                  <button onClick={async () => { 
                      if(confirm('Bạn có chắc muốn xóa nhóm quyền này?')) {
                         const res = await deleteRole(r.code);
                         if(res.success) window.location.reload();
                         else alert("Lỗi: " + res.error);
                      }
                  }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg tracking-tight">Ma Trận Phân Quyền</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Phân quyền chi tiết cho nhóm:{" "}
              <span className="font-semibold text-indigo-600">
                {roles.find((r: any) => r.code === activeRole)?.name}
              </span>
            </p>
          </div>
          <button onClick={handleSavePerms} disabled={savingMatrix}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold flex items-center hover:bg-indigo-700 active:scale-95 shadow-md shadow-indigo-200 transition-all disabled:opacity-60">
            <Save className="w-4 h-4 mr-2"/> Lưu Cấu Hình
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-6 py-4 font-bold text-slate-700 text-xs uppercase tracking-wider w-[40%]">Chức năng / Module</th>
                <th className="px-4 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-widest text-center">Xem</th>
                <th className="px-4 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-widest text-center">Thêm</th>
                <th className="px-4 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-widest text-center">Sửa</th>
                <th className="px-4 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-widest text-center">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {APP_CATEGORIES.map((cat) => (
                <Fragment key={cat.id}>
                  {/* Category Header Row */}
                  <tr className="group">
                    <td colSpan={5} className={`px-6 py-3 border-y font-bold text-[10px] uppercase tracking-[0.2em] transition-colors ${colorStyles[cat.color] || colorStyles.slate}`}>
                      <div className="flex items-center gap-2">
                        <cat.icon className="w-3.5 h-3.5" />
                        {cat.name}
                      </div>
                    </td>
                  </tr>
                  {/* Module Rows */}
                  {cat.modules.map(m => {
                    const p = permissions.find(x => x.module === m.code) || emptyPerm(m.code);
                    return (
                      <tr key={m.code} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                             <div className="p-1.5 rounded-lg bg-slate-50 group-hover:bg-white transition-colors border border-slate-100">
                               <m.icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                             </div>
                             <div>
                               <div className="font-semibold text-slate-700 text-sm">{m.name}</div>
                               <div className="text-[10px] text-slate-400 font-mono mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">{m.code}</div>
                             </div>
                          </div>
                        </td>
                        {(["canRead","canCreate","canUpdate","canDelete"] as const).map(field => (
                          <td key={field} className="px-4 py-4 text-center">
                            <label className="inline-flex items-center justify-center cursor-pointer p-1">
                              <input type="checkbox" checked={!!p[field]}
                                onChange={() => togglePerm(m.code, field)}
                                className={`w-5 h-5 rounded-md transition-all cursor-pointer focus:ring-offset-2 border-slate-300 focus:ring-2 ${
                                  field === "canDelete"
                                    ? "text-red-500 focus:ring-red-400 border-red-200"
                                    : "text-indigo-600 focus:ring-indigo-500 border-slate-200"
                                } shadow-sm`}
                              />
                            </label>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800">{modalMode === 'ADD' ? 'Thêm Nhóm Quyền' : 'Sửa Nhóm Quyền'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mã nhóm (Code) *</label>
                <input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} disabled={modalMode === 'EDIT'} placeholder="VD: NHAN_SU" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tên hiển thị *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="VD: Quản lý Nhân sự" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mô tả</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} placeholder="Mô tả chức năng của nhóm quyền này..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Hủy</button>
              <button disabled={loading || !formData.code || !formData.name} onClick={async () => {
                 setLoading(true);
                 const res = modalMode === 'ADD' ? await createRole(formData.code, formData.name, formData.description) : await updateRole(formData.code, formData.name, formData.description);
                 if (res.success) { setModalOpen(false); window.location.reload(); }
                 else { alert("Lỗi: " + res.error); }
                 setLoading(false);
              }} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors flex items-center">
                {loading ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
