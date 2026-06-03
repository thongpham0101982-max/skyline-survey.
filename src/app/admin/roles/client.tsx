"use client"
import { useState, Fragment } from "react"
import { Shield, Plus, Save, Edit, Trash2, X, ChevronDown, ChevronRight, CornerDownRight } from "lucide-react"
import { savePermissions, createRole, updateRole, deleteRole } from "./actions"
import { APP_CATEGORIES, ALL_APP_MODULES } from "@/config/modules"

const emptyPerm = (code: string) => ({
  module: code, canRead: false, canCreate: false, canUpdate: false, canDelete: false,
});

export function RolesClient({ initialRoles }: any) {
  const [roles, setRoles] = useState(initialRoles || []);
  const [activeRole, setActiveRole] = useState(roles[0]?.code || "");
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  
  const toggleExpand = (code: string) => {
    setExpandedModules(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

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
    setPermissions(prev => {
      const targetMod = ALL_APP_MODULES.find(m => m.code === moduleCode);
      const isParent = targetMod && targetMod.subModules && targetMod.subModules.length > 0;
      
      let nextPerms = prev.map(p => {
        if (p.module !== moduleCode) return p;
        let newP = { ...p, [field]: !p[field] };
        if ((field === "canCreate" || field === "canUpdate" || field === "canDelete") && newP[field])
          newP.canRead = true;
        if (field === "canRead" && !newP.canRead)
          newP.canCreate = newP.canUpdate = newP.canDelete = false;
        return newP;
      });

      if (isParent) {
        const parentPerm = nextPerms.find(p => p.module === moduleCode);
        if (parentPerm) {
          const newVal = parentPerm[field];
          const subCodes = targetMod.subModules.map(sm => sm.code);
          nextPerms = nextPerms.map(p => {
            if (!subCodes.includes(p.module)) return p;
            let newP = { ...p, [field]: newVal };
            if ((field === "canCreate" || field === "canUpdate" || field === "canDelete") && newP[field])
              newP.canRead = true;
            if (field === "canRead" && !newP.canRead)
              newP.canCreate = newP.canUpdate = newP.canDelete = false;
            return newP;
          });
        }
      }
      return nextPerms;
    });
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
      <div className="lg:col-span-1 bg-white rounded-3xl shadow-lg border border-slate-100/90 overflow-hidden flex flex-col h-fit backdrop-blur-md">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-black text-slate-800 text-sm tracking-wide flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#00A19A] animate-pulse"/> NHÓM QUYỀN
          </h3>
          <button 
             onClick={() => { setModalMode('ADD'); setFormData({ code: '', name: '', description: '' }); setModalOpen(true); }}
             className="text-white bg-[#00A19A] hover:bg-[#008c85] p-2 rounded-xl transition-all shadow-md shadow-teal-100 active:scale-90">
            <Plus className="w-4 h-4"/>
          </button>
        </div>
        <div className="p-3 space-y-1.5 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {roles.map((r: any) => (
            <div key={r.code} className={`group relative flex items-stretch w-full rounded-2xl transition-all duration-300 border ${
              activeRole === r.code 
                ? "bg-gradient-to-r from-teal-50/55 to-emerald-50/10 border-teal-200/80 shadow-md shadow-teal-50" 
                : "hover:bg-slate-50/80 border-transparent"
            }`}>
              <button onClick={() => switchRole(r.code)} className="flex-1 text-left px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div className={`font-bold text-sm ${activeRole === r.code ? "text-slate-800" : "text-slate-700"}`}>{r.name}</div>
                  {r.isSystem && (
                    <span className="text-[9px] font-black tracking-widest text-[#00A19A] bg-teal-50 px-2 py-0.5 rounded-full uppercase leading-none select-none">Hệ thống</span>
                  )}
                </div>
                <div className="text-xs font-semibold text-slate-400 mt-1 line-clamp-1 leading-snug">{r.description || r.code}</div>
              </button>
              
              {!r.isSystem && (
                <div className="opacity-0 group-hover:opacity-100 flex flex-col justify-center gap-1.5 px-3 border-l border-slate-100 transition-all duration-200">
                  <button onClick={() => { setModalMode('EDIT'); setFormData({ code: r.code, name: r.name, description: r.description || '' }); setModalOpen(true); }} className="p-2 text-slate-400 hover:text-[#00A19A] hover:bg-slate-100 rounded-lg transition-all"><Edit className="w-3.5 h-3.5" /></button>
                  <button onClick={async () => { 
                      if(confirm('Bạn có chắc muốn xóa nhóm quyền này?')) {
                         const res = await deleteRole(r.code);
                         if(res.success) window.location.reload();
                         else alert("Lỗi: " + res.error);
                      }
                  }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="lg:col-span-3 bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden backdrop-blur-md">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg tracking-tight">Ma Trận Phân Quyền</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Phân quyền chi tiết cho nhóm:{" "}
              <span className="font-semibold text-[#00A19A]">
                {roles.find((r: any) => r.code === activeRole)?.name}
              </span>
            </p>
          </div>
          <button onClick={handleSavePerms} disabled={savingMatrix}
            className="px-5 py-2.5 bg-[#00A19A] text-white rounded-xl text-sm font-semibold flex items-center hover:bg-[#008c85] active:scale-95 shadow-md shadow-indigo-200 transition-all disabled:opacity-60">
            <Save className="w-4 h-4 mr-2"/> Lưu Cấu Hình
          </button>
        </div>

        <div className="overflow-x-auto custom-scrollbar flex-1 relative max-h-[70vh]">
          <table className="w-full text-left whitespace-nowrap border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 sticky top-0 z-30 backdrop-blur-md">
                <th className="px-6 py-4.5 font-bold text-slate-700 text-xs uppercase tracking-wider w-[40%] bg-slate-50/90">Chức năng / Module</th>
                <th className="px-4 py-4.5 font-bold text-slate-600 text-[10px] uppercase tracking-widest text-center bg-slate-50/90 w-[15%]">Xem</th>
                <th className="px-4 py-4.5 font-bold text-slate-600 text-[10px] uppercase tracking-widest text-center bg-slate-50/90 w-[15%]">Thêm</th>
                <th className="px-4 py-4.5 font-bold text-slate-600 text-[10px] uppercase tracking-widest text-center bg-slate-50/90 w-[15%]">Sửa</th>
                <th className="px-4 py-4.5 font-bold text-slate-600 text-[10px] uppercase tracking-widest text-center bg-slate-50/90 w-[15%]">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {APP_CATEGORIES.map((cat) => (
                <Fragment key={cat.id}>
                  {/* Category Header Row */}
                  <tr className="group">
                    <td colSpan={5} className={`px-6 py-3.5 border-y font-bold text-[10px] uppercase tracking-[0.2em] transition-colors shadow-sm ${colorStyles[cat.color] || colorStyles.slate}`}>
                      <div className="flex items-center gap-2">
                        <cat.icon className="w-4 h-4 animate-pulse" />
                        {cat.name}
                      </div>
                    </td>
                  </tr>
                  {/* Module Rows */}
                  {cat.modules.map(m => {
                    const p = permissions.find(x => x.module === m.code) || emptyPerm(m.code);
                    const hasSub = m.subModules && m.subModules.length > 0;
                    const isExpanded = expandedModules.includes(m.code);
                    
                    return (
                      <Fragment key={m.code}>
                        <tr className="hover:bg-slate-50/80 transition-all duration-150 group">
                          <td className="px-8 py-4.5">
                            <div className="flex items-center gap-3">
                               {hasSub ? (
                                 <button onClick={() => toggleExpand(m.code)} className="p-1.5 hover:bg-slate-100/85 rounded-lg transition-all duration-200 text-slate-400 hover:text-slate-800 mr-0.5 active:scale-90">
                                   {isExpanded ? <ChevronDown className="w-4 h-4 text-[#00A19A]" /> : <ChevronRight className="w-4 h-4" />}
                                 </button>
                               ) : (
                                 <div className="w-7 h-7 mr-0.5" />
                               )}
                               <div className="p-2 rounded-xl bg-slate-50 group-hover:bg-white transition-all duration-200 border border-slate-100/80 group-hover:border-indigo-100 group-hover:shadow-md group-hover:shadow-indigo-50/50">
                                 <m.icon className="w-4.5 h-4.5 text-slate-400 group-hover:text-[#00A19A] transition-colors" />
                                </div>
                                <div>
                                  <div className={hasSub ? "font-bold text-slate-850 text-sm cursor-pointer select-none hover:text-[#00A19A] transition-colors" : "font-semibold text-slate-700 text-sm"} onClick={hasSub ? () => toggleExpand(m.code) : undefined}>
                                    {m.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 leading-none">{m.code}</div>
                                </div>
                            </div>
                          </td>
                          {(["canRead","canCreate","canUpdate","canDelete"] as const).map(field => (
                            <td key={field} className="px-4 py-4.5 text-center">
                              <label className="inline-flex items-center justify-center cursor-pointer p-1 active:scale-95 transition-transform select-none">
                                <input type="checkbox" checked={!!p[field]}
                                  onChange={() => togglePerm(m.code, field)}
                                  className="sr-only"
                                />
                                <div className={`w-[22px] h-[22px] rounded-lg border flex items-center justify-center transition-all duration-200 shadow-sm ${
                                  p[field] 
                                    ? field === "canDelete" 
                                      ? "bg-rose-500 border-rose-500 text-white scale-105"
                                      : "bg-[#00A19A] border-[#00A19A] text-white scale-105" 
                                    : "bg-white border-slate-200 hover:border-slate-350 hover:shadow-md"
                                }`}>
                                  {p[field] && (
                                    <svg className="w-4 h-4 stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                              </label>
                            </td>
                          ))}
                        </tr>
                        
                        {/* Render SubModules */}
                        {hasSub && isExpanded && m.subModules.map(sm => {
                          const subP = permissions.find(x => x.module === sm.code) || emptyPerm(sm.code);
                          return (
                            <tr key={sm.code} className="bg-slate-50/40 hover:bg-slate-100/50 transition-all duration-150 group">
                              <td className="pl-16 pr-8 py-3.5 border-l-2 border-indigo-400">
                                <div className="flex items-center gap-3">
                                   <div className="p-1.5 rounded-lg bg-white border border-slate-100 shadow-sm">
                                     <CornerDownRight className="w-3.5 h-3.5 text-indigo-500 animate-bounce" style={{ animationDuration: '3s' }} />
                                   </div>
                                   <div>
                                     <div className="font-semibold text-slate-700 text-xs">{sm.name}</div>
                                     <div className="text-[9px] text-slate-400 font-mono mt-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 leading-none">{sm.code}</div>
                                   </div>
                                </div>
                              </td>
                              {(["canRead","canCreate","canUpdate","canDelete"] as const).map(field => (
                                <td key={field} className="px-4 py-3.5 text-center">
                                  <label className="inline-flex items-center justify-center cursor-pointer p-1 active:scale-95 transition-transform select-none">
                                    <input type="checkbox" checked={!!subP[field]}
                                      onChange={() => togglePerm(sm.code, field)}
                                      className="sr-only"
                                    />
                                    <div className={`w-[19px] h-[19px] rounded-md border flex items-center justify-center transition-all duration-200 shadow-sm ${
                                      subP[field] 
                                        ? field === "canDelete" 
                                          ? "bg-rose-500 border-rose-500 text-white scale-105"
                                          : "bg-[#00A19A] border-[#00A19A] text-white scale-105" 
                                        : "bg-white border-slate-200 hover:border-slate-350 hover:shadow-sm"
                                    }`}>
                                      {subP[field] && (
                                        <svg className="w-3.5 h-3.5 stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                  </label>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </Fragment>
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
              }} className="px-4 py-2 text-sm font-semibold text-white bg-[#00A19A] hover:bg-[#008c85] disabled:opacity-50 rounded-xl transition-colors flex items-center">
                {loading ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
