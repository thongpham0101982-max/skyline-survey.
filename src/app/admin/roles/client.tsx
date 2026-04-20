"use client"
import { useState, Fragment } from "react"
import { Shield, Plus, Save } from "lucide-react"
import { savePermissions } from "./actions"

// Modules grouped by category
const CATEGORY_MODULES = [
  {
    category: "Hệ thống",
    color: "text-violet-700 bg-violet-50 border-violet-200",
    modules: [
      { code: "ROLES",      name: "Quản lý Nhóm quyền" },
      { code: "USERS",      name: "Tài khoản Nhân sự" },
      { code: "FACILITIES", name: "Quản lý Cơ sở" },
    ],
  },
  {
    category: "Quản lý Đào tạo",
    color: "text-blue-700 bg-blue-50 border-blue-200",
    modules: [
      { code: "TEACHERS",      name: "Quản lý Giáo viên" },
      { code: "DEPARTMENTS",   name: "Tổ chuyên môn" },
      { code: "SUBJECTS",      name: "Quản lý môn học" },
      { code: "ACADEMIC_YEARS",name: "Năm học & Học kỳ" },
      { code: "MANAGE_CLASSES",name: "Quản lý Lớp học" },
      { code: "ASSIGNMENTS",   name: "Phân công giảng dạy" },
    ],
  },
  {
    category: "Khảo thí",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    modules: [
      { code: "INPUT_ASSESSMENTS",   name: "Quản lý KSNL Đầu vào" },
      { code: "STUDENT_ACHIEVEMENTS",name: "Thành tích Học sinh" },
    ],
  },
  {
    category: "Khảo sát",
    color: "text-amber-700 bg-amber-50 border-amber-200",
    modules: [
      { code: "MANAGE_SURVEYS", name: "Quản lý Khảo sát" },
      { code: "SURVEY_CATALOG", name: "Danh mục Khảo sát" },
      { code: "PARENTS",        name: "Tài khoản PHHS" },
      { code: "FEEDBACK",       name: "Theo dõi Phản hồi" },
    ],
  },
  {
    category: "Công việc khác",
    color: "text-slate-700 bg-slate-100 border-slate-200",
    modules: [
      { code: "TASKS",         name: "Điều hành Công việc" },
      { code: "WEEKLY_REPORTS",name: "Báo cáo Tuần" },
    ],
  },
];

const ALL_MODULES = CATEGORY_MODULES.flatMap(c => c.modules);

const emptyPerm = (code: string) => ({
  module: code, canRead: false, canCreate: false, canUpdate: false, canDelete: false,
});

export function RolesClient({ initialRoles }: any) {
  const [roles, setRoles] = useState(initialRoles || []);
  const [activeRole, setActiveRole] = useState(roles[0]?.code || "");
  const [savingMatrix, setSavingMatrix] = useState(false);

  const buildPerms = (roleCode: string) => {
    const r = roles.find((r: any) => r.code === roleCode);
    return ALL_MODULES.map(m => {
      const existing = r?.permissions?.find((p: any) => p.module === m.code);
      return existing ? { ...existing } : emptyPerm(m.code);
    });
  };

  const [permissions, setPermissions] = useState<any[]>(() => buildPerms(activeRole));

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Roles List */}
      <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-fit">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600"/> Nhóm Quyền
          </h3>
          <button className="text-indigo-600 hover:bg-indigo-100 p-1.5 rounded-lg"><Plus className="w-4 h-4"/></button>
        </div>
        <div className="p-2 space-y-1">
          {roles.map((r: any) => (
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
            <p className="text-sm text-slate-500 mt-1">
              Tuỳ chỉnh thao tác cho nhóm:{" "}
              <span className="font-semibold text-indigo-600">
                {roles.find((r: any) => r.code === activeRole)?.name}
              </span>
            </p>
          </div>
          <button onClick={handleSavePerms} disabled={savingMatrix}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-60">
            <Save className="w-4 h-4 mr-2"/> Lưu Cấu Hình
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-700 text-sm w-1/2">Chức năng / Module</th>
                <th className="px-4 py-4 font-semibold text-slate-600 text-sm text-center">Xem (Read)</th>
                <th className="px-4 py-4 font-semibold text-slate-600 text-sm text-center">Thêm (Create)</th>
                <th className="px-4 py-4 font-semibold text-slate-600 text-sm text-center">Sửa (Update)</th>
                <th className="px-4 py-4 font-semibold text-slate-600 text-sm text-center">Xóa (Delete)</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORY_MODULES.map(({ category, color, modules }) => (
                <Fragment key={category}>
                  {/* Category Header Row */}
                  <tr>
                    <td colSpan={5} className={`px-6 py-2.5 border-y font-bold text-xs uppercase tracking-widest ${color}`}>
                      {category}
                    </td>
                  </tr>
                  {/* Module Rows */}
                  {modules.map(m => {
                    const p = permissions.find(x => x.module === m.code) || emptyPerm(m.code);
                    return (
                      <tr key={m.code} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100 last:border-0">
                        <td className="px-8 py-3.5">
                          <div className="font-medium text-slate-700 text-sm">{m.name}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{m.code}</div>
                        </td>
                        {(["canRead","canCreate","canUpdate","canDelete"] as const).map(field => (
                          <td key={field} className="px-4 py-3.5 text-center">
                            <input type="checkbox" checked={!!p[field]}
                              onChange={() => togglePerm(m.code, field)}
                              className={`w-4 h-4 rounded cursor-pointer focus:ring-2 border-slate-300 ${
                                field === "canDelete"
                                  ? "text-red-500 focus:ring-red-400 border-red-300"
                                  : "text-indigo-600 focus:ring-indigo-500"
                              }`}
                            />
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
  )
}
