"use client"
import { useState } from "react"
import { Plus, Edit2, Trash2, CheckCircle2, X, Filter, Search } from "lucide-react"

const cleanStr = (s) => 
  (s || "")
   .toLowerCase()
   .normalize("NFD")
   .replace(/[\u0300-\u036f]/g, "")
   .replace(/đ/g, "d")
   .replace(/Đ/g, "d");
import { createUser, updateUser, deleteUser, deleteUsers, changeUserRoles } from "./actions"

export function UsersClient({ initialUsers, roles, campuses = [], isCampusLocked = false, defaultCampusId = null }: any) {
  const [users, setUsers] = useState(initialUsers || []);
  const [editingId, setEditingId] = useState("");
  const [formData, setFormData] = useState({ employeeCode: "", fullName: "", password: "", roleCode: "ADMIN", campusIds: [] as string[] });
  const [loading, setLoading] = useState(false);
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterCampus, setFilterCampus] = useState("ALL");
  const [search, setSearch] = useState("");
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState(false);

  const handleMoveGroup = async (newRoleCode: string) => {
    const roleName = roles.find((r: any) => r.code === newRoleCode)?.name || newRoleCode;
    if (!confirm(`Bạn có chắc chắn muốn chuyển ${selectedIds.length} tài khoản sang Nhóm: ${roleName}?`)) return;
    setMoving(true);
    const res = await changeUserRoles(selectedIds, newRoleCode);
    if (res.success) {
      alert("Đã chuyển nhóm tài khoản thành công!");
      window.location.reload();
    } else {
      alert("Lỗi: " + (res.error || "Không thể chuyển"));
    }
    setMoving(false);
  }

  const startEdit = (u?: any) => {
    if (u) {
      setEditingId(u.id);
      setFormData({ employeeCode: u.email, fullName: u.fullName, password: "", roleCode: u.role || "ADMIN", campusIds: u.campusIds || [] });
    } else {
      setEditingId("new");
      setFormData({ employeeCode: "", fullName: "", password: "", roleCode: filterRole !== "ALL" ? filterRole : (roles[0]?.code || "ADMIN"), campusIds: defaultCampusId ? [defaultCampusId] : [] });
    }
  }

  
  const toggleCampus = (id: string) => {
    const current = formData.campusIds || [];
    if (current.includes(id)) setFormData({ ...formData, campusIds: current.filter(x => x !== id) });
    else setFormData({ ...formData, campusIds: [...current, id] });
  }

  const cancelEdit = () => {
    setEditingId("");
  }

  const handleSave = async () => {
    if (!formData.employeeCode || !formData.fullName) return alert("Vui lòng điền đủ Mã NV và Họ tên!");
    if (editingId === "new" && !formData.password) return alert("Vui lòng đặt Mật khẩu cho tài khoản mới!");
    
    setLoading(true);
    let res;
    if (editingId === "new") res = await createUser(formData);
    else res = await updateUser(editingId, formData);
    
    if (res.success) window.location.reload();
    else alert("Lỗi: " + res.error);
    setLoading(false);
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa tài khoản của ${name}?`)) return;
    const res = await deleteUser(id);
    if (res.success) {
       setUsers(users.filter((u:any) => u.id !== id));
       setSelectedIds(selectedIds.filter(x => x !== id));
    }
    else alert("Lỗi: " + res.error);
  }

  const handleDeleteMultiple = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} tài khoản này không?`)) return;
    setDeleting(true);
    const res = await deleteUsers(selectedIds);
    if (res.success) {
      window.location.reload();
    } else {
      alert("Lỗi: " + (res.error || "Không thể xóa"));
    }
    setDeleting(false);
  }

  const displayedUsers = users.filter((u: any) => {
    const roleMatch = filterRole === "ALL" || u.role === filterRole;
    if (!roleMatch) return false;
    
    if (filterCampus !== "ALL") {
       if (!u.campusIds || u.campusIds.length === 0) return false;
       if (!u.campusIds.includes(filterCampus)) return false;
    }

    if (search) {
      const q = cleanStr(search);
      const fullNameClean = cleanStr(u.fullName || "");
      const emailClean = cleanStr(u.email || "");
      if (!fullNameClean.includes(q) && !emailClean.includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Bộ Lọc */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
        {/* Tìm kiếm */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
            <Filter className="w-4 h-4 text-[#00A19A]" />
            Bộ lọc & Tìm kiếm nhanh
          </div>
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm Họ tên, Mã NV..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-sm border border-slate-200 focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Lọc theo Nhóm */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">Lọc theo Nhóm:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setFilterRole("ALL")} className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${filterRole === "ALL" ? "bg-[#00A19A] text-white border-[#00A19A] shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
              Gộp Tất cả
            </button>
            {roles.map((r: any) => (
              <button key={r.code} onClick={() => setFilterRole(r.code)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${filterRole === r.code ? "bg-[#00A19A] text-white border-[#00A19A] shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                {r.name}
              </button>
            ))}

            {selectedIds.length > 0 && filterRole !== "ALL" && (
              <button
                onClick={() => handleMoveGroup(filterRole)}
                disabled={moving}
                className="ml-4 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                Chuyển {selectedIds.length} tài khoản đã chọn sang Nhóm: {roles.find((r) => r.code === filterRole)?.name}
              </button>
            )}
          </div>
        </div>
        
        {(filterRole === "PARENT" || filterRole === "TEACHER" || filterRole === "ALL") && !isCampusLocked && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-700">Lọc theo Cơ sở:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setFilterCampus("ALL")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterCampus === "ALL" ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                Tất cả Cơ sở
              </button>
              {campuses.map((c: any) => (
                <button key={c.id} onClick={() => setFilterCampus(c.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterCampus === c.id ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                  {c.campusName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>      <div className="bg-white rounded-2xl shadow-sm border-2 border-amber-100">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
             <h3 className="font-bold text-slate-700">Danh sách Tài khoản ({displayedUsers.length})</h3>
             {selectedIds.length > 0 && (
               <div className="flex items-center gap-2.5 flex-wrap">
                 <button onClick={handleDeleteMultiple} disabled={deleting || moving}
                   className="flex items-center text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 font-semibold py-1.5 px-3 rounded-md border border-red-200 text-sm cursor-pointer transition-all">
                   <Trash2 className="w-4 h-4 mr-2" /> {deleting ? "Đang xóa..." : `Xóa ${selectedIds.length} tài khoản`}
                 </button>
                 <select
                   onChange={(e) => {
                     const val = e.target.value;
                     if (val) handleMoveGroup(val);
                     e.target.value = "";
                   }}
                   disabled={deleting || moving}
                   className="p-1.5 rounded-md border text-xs bg-white border-slate-300 font-bold text-slate-700 cursor-pointer outline-none focus:border-[#00A19A]"
                 >
                   <option value="">-- Chuyển sang Nhóm --</option>
                   {roles.map((r) => (
                     <option key={r.code} value={r.code}>{r.name}</option>
                   ))}
                 </select>
                 {filterRole !== "ALL" && (
                   <button
                     onClick={() => handleMoveGroup(filterRole)}
                     disabled={moving}
                     className="flex items-center bg-[#00A19A] text-white hover:bg-[#008c85] font-semibold py-1.5 px-3 rounded-md text-sm cursor-pointer transition-all shadow-sm"
                   >
                     <CheckCircle2 className="w-4 h-4 mr-1.5" /> Chuyển {selectedIds.length} tài khoản sang nhóm {roles.find((r) => r.code === filterRole)?.name}
                   </button>
                 )}
               </div>
             )}
          </div>

        </div>

        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm font-semibold">
              <tr>
                <th className="px-6 py-3 w-12 text-center">
                  <input type="checkbox" className="w-4 h-4 rounded text-[#00A19A]"
                    checked={displayedUsers.length > 0 && selectedIds.length === displayedUsers.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(displayedUsers.map((u: any) => u.id));
                      else setSelectedIds([]);
                    }}
                  />
                </th>
                <th className="px-6 py-3">Mã NV / Tên ĐN</th>
                <th className="px-6 py-3">Họ và Tên</th>
                <th className="px-6 py-3">Nhóm Quyền</th>
                <th className="px-6 py-3 border-l border-slate-200">Mật khẩu</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">

              {displayedUsers.map((u:any) => editingId === u.id ? (
                <tr key={u.id} className="bg-[#00A19A]/10/30">
                  <td className="px-6 py-3"></td>
                  <td className="px-6 py-3"><input value={formData.employeeCode} onChange={e=>setFormData({...formData, employeeCode: e.target.value})} className="w-32 p-1.5 rounded border text-sm font-semibold border-slate-300" /></td>
                  <td className="px-6 py-3"><input value={formData.fullName} onChange={e=>setFormData({...formData, fullName: e.target.value})} className="w-full p-1.5 rounded border text-sm border-slate-300" /></td>
                  
                  <td className="px-6 py-3">
                    <select value={formData.roleCode} onChange={e=>setFormData({...formData, roleCode: e.target.value})} className="p-1.5 rounded border text-sm bg-white border-slate-300">
                      {roles.map((r:any) => <option key={r.code} value={r.code}>{r.name} ({r.code})</option>)}
                    </select>
                    {formData.roleCode === "GDCS" && (
                      <div className="mt-2 p-2 bg-white border rounded-lg space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Gán Cơ sở quản lý:</p>
                        {campuses.map((c: any) => (
                          <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input type="checkbox" checked={formData.campusIds.includes(c.id)} onChange={() => !isCampusLocked && toggleCampus(c.id)} disabled={isCampusLocked} className="w-3 h-3" />
                            <span className="text-[11px] font-medium">{c.campusName}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-3 border-l border-slate-200"><input type="password" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} placeholder="(Bỏ trống nếu giữ nguyên)" className="w-48 p-1.5 rounded border text-sm border-slate-300" /></td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={handleSave} disabled={loading} className="px-2 py-1 text-green-600 hover:bg-green-100 rounded-lg mr-2"><CheckCircle2 className="w-5 h-5"/></button>
                    <button onClick={cancelEdit} className="px-2 py-1 text-slate-400 hover:bg-slate-200 rounded-lg"><X className="w-5 h-5"/></button>
                  </td>
                </tr>
              ) : (
                <tr key={u.id} className={"hover:bg-slate-50/50 transition-colors " + (selectedIds.includes(u.id) ? "bg-[#00A19A]/10/30" : "")}>
                  <td className="px-6 py-3 text-center">
                    <input type="checkbox" className="w-4 h-4 rounded text-[#00A19A]"
                      checked={selectedIds.includes(u.id)}
                      onChange={e => {
                         if (e.target.checked) setSelectedIds([...selectedIds, u.id]);
                         else setSelectedIds(selectedIds.filter(id => id !== u.id));
                      }}
                    />
                  </td>
                  <td className="px-6 py-3 font-semibold text-slate-700 text-sm">{u.email}</td>
                  <td className="px-6 py-3 text-slate-800 text-sm">{u.fullName}</td>
                  
                  <td className="px-6 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#00A19A]/10 text-indigo-700 border border-[#00A19A]/20 w-fit">
                        {roles.find((r:any) => r.code === u.role)?.name || u.role}
                      </span>
                      {u.campusIds && u.campusIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {u.campusIds.map((cid: string) => {
                            const c = campuses.find((cx: any) => cx.id === cid);
                            return c ? <span key={cid} className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100 font-bold uppercase">{c.campusName}</span> : null;
                          })}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-3 border-l border-slate-200 text-xs text-slate-400 italic">*** (Đã mã hóa)</td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => startEdit(u)} className="p-2 text-slate-400 hover:text-[#00A19A] rounded-lg"><Edit2 className="w-4 h-4"/></button>
                    <button onClick={() => handleDelete(u.id, u.fullName)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
