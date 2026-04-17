"use client"
import { useState } from "react"
import { Shield, Plus, Edit2, Save, X, CheckCircle2 } from "lucide-react"
import { createRole, updateRole, savePermissions } from "./actions"

const TARGET_MODULES = [
  { code: "SURVEY_CATALOG", name: "Danh mục Khảo sát" },
  { code: "SUBJECTS", name: "Quản lý môn học" },
  { code: "TEACHERS", name: "Quản lý Giáo viên" },
  { code: "ACADEMIC_YEARS", name: "Năm học & Học kỳ" },
  { code: "MANAGE_CLASSES", name: "Quản lý Lớp học" },
  { code: "ASSIGNMENTS", name: "Phân công giảng dạy" }
,
  { code: "INPUT_ASSESSMENTS", name: "Quản lý KSNL đầu vào" },
  { code: "STUDENT_ACHIEVEMENTS", name: "Thành tích Học sinh" },
  { code: "TASKS", name: "Điều hành Công việc" },
  { code: "WEEKLY_REPORTS", name: "Báo cáo Tuần" }
];

export function RolesClient({ initialRoles }: any) {
  const [roles, setRoles] = useState(initialRoles || []);
  const [activeRole, setActiveRole] = useState(roles[0]?.code || "");
  const [editingRole, setEditingRole] = useState("");
  const [roleForm, setRoleForm] = useState({ code: "", name: "", desc: "" });
  
  // local matrix permissions state for active role
  const initialPerms = roles.find((r:any) => r.code === activeRole)?.permissions || [];
  const [permissions, setPermissions] = useState<any[]>(
    TARGET_MODULES.map(m => {
      const existing = initialPerms.find((p:any) => p.module === m.code)
      return existing ? { ...existing } : { module: m.code, canRead: false, canCreate: false, canUpdate: false, canDelete: false }
    })
  );

  const [savingMatrix, setSavingMatrix] = useState(false);

  const switchRole = (code: string) => {
    setActiveRole(code);
    const r = roles.find((r:any) => r.code === code);
    setPermissions(
      TARGET_MODULES.map(m => {
        const existing = r?.permissions?.find((p:any) => p.module === m.code)
        return existing ? { ...existing } : { module: m.code, canRead: false, canCreate: false, canUpdate: false, canDelete: false }
      })
    );
  }

  const handleSavePerms = async () => {
    setSavingMatrix(true);
    const res = await savePermissions(activeRole, permissions);
    if (!res.success) alert("Lỗi: " + res.error);
    else window.location.reload();
    setSavingMatrix(false);
  }

  const togglePerm = (moduleCode: string, field: string) => {
    setPermissions(permissions.map(p => {
      if (p.module === moduleCode) {
        let newP = { ...p, [field]: !(p as any)[field] };
        // if granting write access, automatically grant read
        if((field === 'canCreate' || field === 'canUpdate' || field === 'canDelete') && newP[field]) newP.canRead = true;
        // if revoking read access, automatically revoke write
        if(field === 'canRead' && !newP.canRead) {
          newP.canCreate = false; newP.canUpdate = false; newP.canDelete = false;
        }
        return newP;
      }
      return p;
    }));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Roles List */}
      <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-fit">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-600"/> Nhóm Quyền</h3>
          <button className="text-indigo-600 hover:bg-indigo-100 p-1.5 rounded-lg"><Plus className="w-4 h-4"/></button>
        </div>
        <div className="p-2 space-y-1">
          {roles.map((r:any) => (
            <button key={r.code} onClick={() => switchRole(r.code)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all ${activeRole === r.code ? "bg-indigo-50 border border-indigo-100" : "hover:bg-slate-50 border border-transparent"}`}>
              <div className={`font-semibold text-sm ${activeRole === r.code ? "text-indigo-700" : "text-slate-700"}`}>{r.name}</div>
              <div className="text-xs text-slate-500 mt-1 line-clamp-1">{r.description || r.code}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Ma Trận Phân Quyền</h3>
            <p className="text-sm text-slate-500 mt-1">Tuỳ chỉnh thao tác cho nhóm: <span className="font-semibold text-indigo-600">{roles.find((r:any)=>r.code===activeRole)?.name}</span></p>
          </div>
          <button onClick={handleSavePerms} disabled={savingMatrix} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center hover:bg-indigo-700 shadow-sm transition-all">
            <Save className="w-4 h-4 mr-2" /> Lưu Cấu Hình
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-700 text-sm">Chức năng / Module</th>
                <th className="px-4 py-4 font-semibold text-slate-600 text-sm text-center">Xem (Read)</th>
                <th className="px-4 py-4 font-semibold text-slate-600 text-sm text-center">Thêm (Create)</th>
                <th className="px-4 py-4 font-semibold text-slate-600 text-sm text-center">Sửa (Update)</th>
                <th className="px-4 py-4 font-semibold text-slate-600 text-sm text-center">Xóa (Delete)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TARGET_MODULES.map(m => {
                const p = permissions.find(x => x.module === m.code) || { canRead: false, canCreate: false, canUpdate: false, canDelete: false };
                return (
                  <tr key={m.code} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-700 text-sm">{m.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-1">{m.code}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <input type="checkbox" checked={p.canRead} onChange={()=>togglePerm(m.code, 'canRead')} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600 cursor-pointer"/>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <input type="checkbox" checked={p.canCreate} onChange={()=>togglePerm(m.code, 'canCreate')} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600 cursor-pointer"/>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <input type="checkbox" checked={p.canUpdate} onChange={()=>togglePerm(m.code, 'canUpdate')} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600 cursor-pointer"/>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <input type="checkbox" checked={p.canDelete} onChange={()=>togglePerm(m.code, 'canDelete')} className="w-4 h-4 text-red-500 rounded border-red-300 focus:ring-red-500 cursor-pointer"/>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
