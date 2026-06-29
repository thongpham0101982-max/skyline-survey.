"use client"
import { useState, Fragment } from "react"
import { Shield, Plus, Save, Edit, Trash2, X, ChevronDown, ChevronRight, CornerDownRight, Check, Sparkles } from "lucide-react"
import { savePermissions, createRole, updateRole, deleteRole } from "./actions"
import { APP_CATEGORIES, ALL_APP_MODULES } from "@/config/modules"

const emptyPerm = (code: string) => ({
  module: code, canRead: false, canCreate: false, canUpdate: false, canDelete: false,
});

export function RolesClient({ initialRoles }: any) {
  const [roles, setRoles] = useState(initialRoles || []);
  const [activeRole, setActiveRole] = useState(roles[0]?.code || "");
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>(ALL_APP_MODULES.map(m => m.code)); // Default expand all for visibility
  
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

  const setRowPerms = (moduleCode: string, action: 'FULL' | 'READ' | 'CLEAR') => {
    setPermissions(prev => {
      const targetMod = ALL_APP_MODULES.find(m => m.code === moduleCode);
      const isParent = targetMod && targetMod.subModules && targetMod.subModules.length > 0;
      const subCodes = isParent ? targetMod.subModules.map(sm => sm.code) : [];

      return prev.map(p => {
        const isTarget = p.module === moduleCode || subCodes.includes(p.module);
        if (!isTarget) return p;
        return {
          ...p,
          canRead: action === 'FULL' || action === 'READ',
          canCreate: action === 'FULL',
          canUpdate: action === 'FULL',
          canDelete: action === 'FULL'
        };
      });
    });
  };

  const applyPreset = (presetType: string) => {
    const roleRules = {
      ALL_READ: { allRead: true },
      ALL_FULL: { allFull: true },
      ALL_CLEAR: { allClear: true },
      GDCS: {
        PARENTS: { r: true },
        KTDBCL_EXAM_CONFIG: { r: true },
        KTDBCL_EXAMS: { r: true },
        TEACHERS: { r: true },
        DEPARTMENTS: { r: true },
        SUBJECTS: { r: true },
        ACADEMIC_YEARS: { r: true },
        MANAGE_CLASSES: { r: true },
        ASSIGNMENTS: { r: true },
        STUDENT_TRANSFERS: { r: true, c: true, u: true },
        CAU_HINH_KHAO_SAT: { r: true },
        INPUT_ASSESSMENT_REPORTS: { r: true },
        STUDENT_INFO: { r: true, c: true, u: true },
        PHAN_CONG_KHAO_SAT: { r: true },
        XET_DUYET_KET_QUA: { r: true, c: true, u: true },
        MANAGE_SURVEYS: { r: true },
        TASKS: { r: true, c: true, u: true, d: true },
        WEEKLY_REPORTS: { r: true, c: true, u: true, d: true }
      },
      GIAO_VU: {
        PARENTS: { r: true },
        KTDBCL_EXAM_CONFIG: { r: true },
        KTDBCL_EXAMS: { r: true, c: true, u: true, d: true },
        TEACHERS: { r: true, c: true, u: true },
        DEPARTMENTS: { r: true, c: true, u: true },
        SUBJECTS: { r: true, c: true, u: true },
        ACADEMIC_YEARS: { r: true, c: true, u: true },
        MANAGE_CLASSES: { r: true, c: true, u: true, d: true },
        ASSIGNMENTS: { r: true, c: true, u: true, d: true },
        STUDENT_TRANSFERS: { r: true, c: true, u: true, d: true },
        CAU_HINH_KHAO_SAT: { r: true },
        INPUT_ASSESSMENT_REPORTS: { r: true },
        STUDENT_INFO: { r: true, c: true, u: true },
        PHAN_CONG_KHAO_SAT: { r: true },
        XET_DUYET_KET_QUA: { r: true },
        MANAGE_SURVEYS: { r: true },
        TASKS: { r: true, c: true, u: true },
        WEEKLY_REPORTS: { r: true, c: true, u: true }
      },
      TVAN: {
        PARENTS: { r: true },
        STUDENT_TRANSFERS: { r: true },
        CAU_HINH_KHAO_SAT: { r: true },
        INPUT_ASSESSMENT_REPORTS: { r: true },
        STUDENT_INFO: { r: true, c: true, u: true },
        PHAN_CONG_KHAO_SAT: { r: true },
        XET_DUYET_KET_QUA: { r: true },
        TASKS: { r: true, c: true, u: true }
      },
      BGH_MN: {
        CAU_HINH_KHAO_SAT: { r: true, c: true, u: true, d: true },
        INPUT_ASSESSMENT_REPORTS: { r: true, c: true, u: true, d: true },
        STUDENT_INFO: { r: true, c: true, u: true, d: true },
        PHAN_CONG_KHAO_SAT: { r: true, c: true, u: true, d: true },
        XET_DUYET_KET_QUA: { r: true, c: true, u: true, d: true },
        MANAGE_SURVEYS: { r: true },
        TASKS: { r: true, c: true, u: true },
        WEEKLY_REPORTS: { r: true, c: true, u: true }
      },
      GVCN_PT: {
        TASKS: { r: true, c: true, u: true, d: true },
        WEEKLY_REPORTS: { r: true, u: true }
      },
      GVBM_PT: {
        TASKS: { r: true, c: true, u: true, d: true },
        WEEKLY_REPORTS: { r: true, u: true }
      },
      GV_MN: {
        TASKS: { r: true, c: true, u: true, d: true },
        WEEKLY_REPORTS: { r: true, u: true }
      }
    };

    const rules = roleRules[presetType];
    if (!rules) return;

    setPermissions(prev => prev.map(p => {
      if (rules.allFull) {
        return { ...p, canRead: true, canCreate: true, canUpdate: true, canDelete: true };
      }
      if (rules.allRead) {
        return { ...p, canRead: true, canCreate: false, canUpdate: false, canDelete: false };
      }
      if (rules.allClear) {
        return { ...p, canRead: false, canCreate: false, canUpdate: false, canDelete: false };
      }
      const modRules = rules[p.module];
      if (modRules) {
        return {
          ...p,
          canRead: !!modRules.r,
          canCreate: !!modRules.c,
          canUpdate: !!modRules.u,
          canDelete: !!modRules.d
        };
      }
      return { ...p, canRead: false, canCreate: false, canUpdate: false, canDelete: false };
    }));
  };

  const handleSavePerms = async () => {
    setSavingMatrix(true);
    const res = await savePermissions(activeRole, permissions);
    if (!res.success) alert("Lỗi: " + res.error);
    else window.location.reload();
    setSavingMatrix(false);
  };

  const colorStyles: Record<string, { bg: string, text: string, border: string, btn: string }> = {
    violet: { bg: "bg-violet-50/70", text: "text-violet-700", border: "border-violet-100", btn: "hover:bg-violet-100 text-violet-700" },
    blue: { bg: "bg-blue-50/70", text: "text-blue-700", border: "border-blue-100", btn: "hover:bg-blue-100 text-blue-700" },
    sky: { bg: "bg-sky-50/70", text: "text-sky-700", border: "border-sky-100", btn: "hover:bg-sky-100 text-sky-700" },
    emerald: { bg: "bg-emerald-50/70", text: "text-emerald-700", border: "border-emerald-100", btn: "hover:bg-emerald-100 text-emerald-700" },
    amber: { bg: "bg-amber-50/70", text: "text-amber-700", border: "border-amber-100", btn: "hover:bg-amber-100 text-amber-700" },
    slate: { bg: "bg-slate-50/70", text: "text-slate-700", border: "border-slate-100", btn: "hover:bg-slate-100 text-slate-700" }
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Roles List */}
      <div className="lg:col-span-1 bg-white rounded-3xl shadow-lg border border-slate-100/90 overflow-hidden flex flex-col h-fit backdrop-blur-md">
        <div className="p-5 flex justify-between items-center border-b border-slate-50">
          <h3 className="font-extrabold text-slate-800 text-sm tracking-wider flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#00A99D]"/> NHÓM QUYỀN
          </h3>
          <button 
             onClick={() => { setModalMode('ADD'); setFormData({ code: '', name: '', description: '' }); setModalOpen(true); }}
             className="text-white bg-[#00A99D] hover:bg-[#009085] p-2 rounded-xl transition-all shadow-md shadow-teal-100 active:scale-95">
            <Plus className="w-4 h-4"/>
          </button>
        </div>
        <div className="p-3 space-y-1.5 overflow-y-auto max-h-[72vh] custom-scrollbar">
          {roles.map((r: any) => (
            <div key={r.code} className={`group relative flex items-stretch w-full rounded-2xl transition-all duration-300 border ${
              activeRole === r.code 
                ? "bg-gradient-to-r from-teal-50/40 to-emerald-50/5 border-teal-200/60 shadow-sm shadow-teal-50" 
                : "hover:bg-slate-50/60 border-transparent"
            }`}>
              <button onClick={() => switchRole(r.code)} className="flex-1 text-left px-4 py-3">
                <div className="flex items-center justify-between gap-1.5">
                  <div className={`font-bold text-sm ${activeRole === r.code ? "text-slate-800" : "text-slate-700"}`}>{r.name}</div>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0">
                    {r.userCount || 0} tài khoản
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 gap-2">
                  <div className="text-[11px] text-slate-400 font-medium line-clamp-1 leading-snug">{r.description || r.code}</div>
                  {r.isSystem && (
                    <span className="text-[8px] font-black tracking-widest text-[#00A99D] uppercase shrink-0">Hệ thống</span>
                  )}
                </div>
              </button>
              
              {!r.isSystem && (
                <div className="opacity-0 group-hover:opacity-100 flex flex-col justify-center gap-1 px-2.5 border-l border-slate-100 transition-all duration-200">
                  <button onClick={() => { setModalMode('EDIT'); setFormData({ code: r.code, name: r.name, description: r.description || '' }); setModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-[#00A99D] hover:bg-slate-100 rounded-lg transition-all"><Edit className="w-3.5 h-3.5" /></button>
                  <button onClick={async () => { 
                      if(confirm('Bạn có chắc muốn xóa nhóm quyền này?')) {
                         const res = await deleteRole(r.code);
                         if(res.success) window.location.reload();
                         else alert("Lỗi: " + res.error);
                      }
                  }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="lg:col-span-3 bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden flex flex-col backdrop-blur-md">
        {/* Header and Preset Controls */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/40 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">Ma Trận Phân Quyền</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Phân quyền chi tiết cho nhóm: <span className="font-bold text-[#00A99D]">{roles.find((r: any) => r.code === activeRole)?.name}</span>
              </p>
            </div>
            <button onClick={handleSavePerms} disabled={savingMatrix}
              className="px-5 py-2.5 bg-[#00A99D] text-white rounded-xl text-xs font-bold flex items-center hover:bg-[#009085] active:scale-95 shadow-md shadow-teal-50 transition-all disabled:opacity-60 self-start sm:self-auto">
              <Save className="w-4 h-4 mr-2"/> Lưu Cấu Hình
            </button>
          </div>

          {/* Preset Buttons Panel */}
          <div className="bg-white p-3 rounded-2xl border border-slate-100 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#00A99D]" /> MẪU PHÂN QUYỀN NHANH (PRESETS)
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => applyPreset('ALL_FULL')} className="px-2.5 py-1.5 bg-slate-100 hover:bg-[#00A99D] hover:text-white rounded-lg text-[10.5px] font-bold text-slate-700 transition-colors">Toàn quyền</button>
              <button onClick={() => applyPreset('ALL_READ')} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10.5px] font-bold text-slate-700 transition-colors">Chỉ Xem</button>
              <button onClick={() => applyPreset('ALL_CLEAR')} className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-[10.5px] font-bold transition-colors">Dọn dẹp</button>
              <span className="w-px bg-slate-200 my-1 mx-1"></span>
              <button onClick={() => applyPreset('GDCS')} className="px-2.5 py-1.5 border border-teal-100 text-[#00A99D] hover:bg-teal-50 rounded-lg text-[10.5px] font-bold transition-colors">Preset GĐCS</button>
              <button onClick={() => applyPreset('GIAO_VU')} className="px-2.5 py-1.5 border border-blue-100 text-blue-600 hover:bg-blue-50 rounded-lg text-[10.5px] font-bold transition-colors">Preset Giáo vụ</button>
              <button onClick={() => applyPreset('TVAN')} className="px-2.5 py-1.5 border border-amber-100 text-amber-600 hover:bg-amber-50 rounded-lg text-[10.5px] font-bold transition-colors">Preset Tư vấn</button>
              <button onClick={() => applyPreset('BGH_MN')} className="px-2.5 py-1.5 border border-purple-100 text-purple-600 hover:bg-purple-50 rounded-lg text-[10.5px] font-bold transition-colors">Preset BGH Mầm non</button>
              <button onClick={() => applyPreset('GVCN_PT')} className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-[10.5px] font-bold transition-colors">Preset GVCN Phổ thông</button>
              <button onClick={() => applyPreset('GVBM_PT')} className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-[10.5px] font-bold transition-colors">Preset GVBM Phổ thông</button>
              <button onClick={() => applyPreset('GV_MN')} className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-[10.5px] font-bold transition-colors">Preset GV Mầm non</button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar flex-1 relative max-h-[64vh]">
          <table className="w-full text-left whitespace-nowrap border-collapse">
            <thead>
              <tr className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-xs">
                <th className="px-5 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider w-[42%]">Chức năng / Module</th>
                <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center w-[12%]">Xem</th>
                <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center w-[12%]">Thêm</th>
                <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center w-[12%]">Sửa</th>
                <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center w-[12%]">Xóa</th>
                <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center w-[10%]">Thao tác nhanh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {APP_CATEGORIES.map((cat) => {
                const colors = colorStyles[cat.color] || colorStyles.slate;
                return (
                  <Fragment key={cat.id}>
                    {/* Category Header Row */}
                    <tr>
                      <td colSpan={6} className={`px-5 py-2.5 border-y font-black text-[10px] uppercase tracking-[0.15em] transition-colors ${colors.bg} ${colors.text} ${colors.border}`}>
                        <div className="flex items-center gap-2">
                          <cat.icon className="w-3.5 h-3.5" />
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
                          <tr className="hover:bg-slate-50/50 transition-all duration-150 group">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                 {hasSub ? (
                                   <button onClick={() => toggleExpand(m.code)} className="p-1 hover:bg-slate-100 rounded-md transition-all text-slate-400 hover:text-slate-800">
                                     {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#00A99D]" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                   </button>
                                 ) : (
                                   <div className="w-5 h-5" />
                                 )}
                                 <div className="p-1.5 rounded-lg bg-slate-50 group-hover:bg-white transition-all border border-slate-100 group-hover:border-slate-200">
                                   <m.icon className="w-4 h-4 text-slate-400 group-hover:text-[#00A99D] transition-colors" />
                                  </div>
                                  <div>
                                    <div className={`font-semibold text-slate-700 text-sm ${hasSub ? "cursor-pointer select-none hover:text-[#00A99D]" : ""}`} onClick={hasSub ? () => toggleExpand(m.code) : undefined}>
                                      {m.name}
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-mono mt-0.5 opacity-60">{m.code}</div>
                                  </div>
                              </div>
                            </td>
                            {(["canRead","canCreate","canUpdate","canDelete"] as const).map(field => (
                              <td key={field} className="px-4 py-3.5 text-center">
                                <label className="inline-flex items-center justify-center cursor-pointer p-0.5 active:scale-90 transition-transform select-none">
                                  <input type="checkbox" checked={!!p[field]}
                                    onChange={() => togglePerm(m.code, field)}
                                    className="sr-only"
                                  />
                                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 ${
                                    p[field] 
                                      ? field === "canDelete" 
                                        ? "bg-rose-500 border-rose-500 text-white"
                                        : "bg-[#00A99D] border-[#00A99D] text-white" 
                                      : "bg-white border-slate-200 hover:border-slate-300"
                                  }`}>
                                    {p[field] && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  </div>
                                </label>
                              </td>
                            ))}
                            {/* Row Quick Action Cell */}
                            <td className="px-4 py-3.5 text-center">
                              <div className="inline-flex rounded-lg border border-slate-100 overflow-hidden shadow-2xs">
                                <button type="button" onClick={() => setRowPerms(m.code, 'FULL')} className="px-1.5 py-1 bg-slate-50 hover:bg-teal-50 hover:text-teal-700 border-r border-slate-100 text-[9px] font-bold text-slate-500 transition-colors">Full</button>
                                <button type="button" onClick={() => setRowPerms(m.code, 'READ')} className="px-1.5 py-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border-r border-slate-100 text-[9px] font-bold text-slate-500 transition-colors">Xem</button>
                                <button type="button" onClick={() => setRowPerms(m.code, 'CLEAR')} className="px-1.5 py-1 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 text-[9px] font-bold text-slate-500 transition-colors">Tắt</button>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Render SubModules */}
                          {hasSub && isExpanded && m.subModules.map(sm => {
                            const subP = permissions.find(x => x.module === sm.code) || emptyPerm(sm.code);
                            return (
                              <tr key={sm.code} className="bg-slate-50/20 hover:bg-slate-50 transition-all duration-150 group">
                                <td className="pl-14 pr-5 py-3">
                                  <div className="flex items-center gap-2">
                                     <div className="text-slate-300 font-mono select-none text-[11px] leading-none">├──</div>
                                     <div className="font-medium text-slate-600 text-xs">{sm.name}</div>
                                     <div className="text-[8px] text-slate-400 font-mono mt-0.5 opacity-60 leading-none">({sm.code})</div>
                                  </div>
                                </td>
                                {(["canRead","canCreate","canUpdate","canDelete"] as const).map(field => (
                                  <td key={field} className="px-4 py-3 text-center">
                                    <label className="inline-flex items-center justify-center cursor-pointer p-0.5 active:scale-90 transition-transform select-none">
                                      <input type="checkbox" checked={!!subP[field]}
                                        onChange={() => togglePerm(sm.code, field)}
                                        className="sr-only"
                                      />
                                      <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all duration-200 ${
                                        subP[field] 
                                          ? field === "canDelete" 
                                            ? "bg-rose-500 border-rose-500 text-white"
                                            : "bg-[#00A99D] border-[#00A99D] text-white" 
                                          : "bg-white border-slate-200 hover:border-slate-350"
                                      }`}>
                                        {subP[field] && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                      </div>
                                    </label>
                                  </td>
                                ))}
                                <td className="px-4 py-3 text-center">
                                  <div className="inline-flex rounded-md border border-slate-100 overflow-hidden shadow-2xs">
                                    <button type="button" onClick={() => setRowPerms(sm.code, 'FULL')} className="px-1 py-0.5 bg-slate-50 hover:bg-teal-50 hover:text-teal-700 border-r border-slate-100 text-[8px] font-bold text-slate-500 transition-colors">Full</button>
                                    <button type="button" onClick={() => setRowPerms(sm.code, 'READ')} className="px-1 py-0.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border-r border-slate-100 text-[8px] font-bold text-slate-500 transition-colors">Xem</button>
                                    <button type="button" onClick={() => setRowPerms(sm.code, 'CLEAR')} className="px-1 py-0.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 text-[8px] font-bold text-slate-500 transition-colors">Tắt</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 flex justify-between items-center border-b border-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm tracking-wide">{modalMode === 'ADD' ? 'Thêm Nhóm Quyền' : 'Sửa Nhóm Quyền'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mã nhóm (Code) *</label>
                <input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} disabled={modalMode === 'EDIT'} placeholder="VD: NHAN_SU" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] outline-none disabled:bg-slate-50 disabled:text-slate-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tên hiển thị *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="VD: Quản lý Nhân sự" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mô tả</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} placeholder="Mô tả chức năng của nhóm quyền này..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] outline-none resize-none" />
              </div>
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Hủy</button>
              <button disabled={loading || !formData.code || !formData.name} onClick={async () => {
                 setLoading(true);
                 const res = modalMode === 'ADD' ? await createRole(formData.code, formData.name, formData.description) : await updateRole(formData.code, formData.name, formData.description);
                 if (res.success) { setModalOpen(false); window.location.reload(); }
                 else { alert("Lỗi: " + res.error); }
                 setLoading(false);
              }} className="px-4 py-2 text-xs font-bold text-white bg-[#00A99D] hover:bg-[#009085] disabled:opacity-50 rounded-xl transition-colors flex items-center shadow-md shadow-teal-100">
                {loading ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
