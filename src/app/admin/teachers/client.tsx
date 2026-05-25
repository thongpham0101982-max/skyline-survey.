"use client"
import { useState, useRef } from "react"
import {
  Plus, Trash2, Edit2, Check, X, Upload, Download,
  Key, GraduationCap, Search, Users, UserCheck, Building2, Mail
} from "lucide-react"
import {
  createTeacherAction, updateTeacherAction, deleteTeacherAction,
  importTeachersAction, resetTeacherPasswordAction
} from "./actions"

const EMPTY_NEW = {
  teacherCode: "", teacherName: "",
  email: "", phone: "",
  dateOfBirth: "", department: "", mainSubject: "", campus: ""
}
const EMPTY_EDIT = { teacherName: "", dateOfBirth: "", department: "", mainSubject: "", campusId: "", status: "ACTIVE" }

export function TeacherManagerClient({ 
  initialTeachers, years, defaultYearId, classes, departments, subjects, campuses, isCampusLocked = false, defaultCampusId = null 
}) {
  const [teachers, setTeachers] = useState(initialTeachers)
  const [search, setSearch] = useState("")
  const [filterDepartment, setFilterDepartment] = useState("")
  const [filterSubject, setFilterSubject] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_EDIT)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newForm, setNewForm] = useState(() => {
    if (isCampusLocked && defaultCampusId) {
      const campusName = (campuses || []).find(c => c.id === defaultCampusId)?.campusName || "";
      return { ...EMPTY_NEW, campus: campusName };
    }
    return EMPTY_NEW;
  })
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const fileInputRef = useRef(null)

  const displayed = teachers.filter(t => {
    let match = true;
    if (search) {
      const q = search.toLowerCase();
      match = match && (
        t.teacherName.toLowerCase().includes(q) ||
        t.teacherCode.toLowerCase().includes(q) ||
        (t.campus || "").toLowerCase().includes(q)
      );
    }
    if (filterDepartment) {
      match = match && t.department === filterDepartment;
    }
    if (filterSubject) {
      match = match && t.mainSubject === filterSubject;
    }
    return match;
  })

  const handleCreate = async () => {
    if (!newForm.teacherCode.trim() || !newForm.teacherName.trim()) {
      setErrorMsg("Vui lòng nhập Mã GV và Họ và tên!"); return
    }
    setSaving(true); setErrorMsg("")
    try {
      // Find campus ID from name for the action
      const selectedCampus = (campuses || []).find(c => c.campusName === newForm.campus)
      await createTeacherAction({ ...newForm, campusId: selectedCampus?.id })
      
      setTeachers([...teachers, {
        id: "temp_" + Date.now(),
        teacherCode: newForm.teacherCode,
        teacherName: newForm.teacherName,
        dateOfBirth: newForm.dateOfBirth || null,
        department: (departments || []).find(d => d.name === newForm.department)?.name || newForm.department || null,
        mainSubject: (subjects || []).find(s => s.subjectName === newForm.mainSubject)?.subjectName || newForm.mainSubject || null,
        campus: selectedCampus?.campusName || null,
        campusId: selectedCampus?.id || null,
        homeroomClass: null,
        email: newForm.email || null,
        phone: newForm.phone || null,
        status: "ACTIVE",
        user: { email: newForm.teacherCode, status: "ACTIVE" }
      }])
      setNewForm(EMPTY_NEW)
      setShowAddForm(false)
      setSuccessMsg("Đã tạo giáo viên và tài khoản đăng nhập thành công!")
      setTimeout(() => setSuccessMsg(""), 4000)
    } catch(e: any) {
      setErrorMsg(e.message || "Có lỗi xảy ra!")
    }
    setSaving(false)
  }

  const handleEdit = (t) => {
    setEditingId(t.id)
    setEditForm({
      teacherName: t.teacherName,
      dateOfBirth: t.dateOfBirth ? new Date(t.dateOfBirth).toISOString().split("T")[0] : "",
      department: t.department || "",
      mainSubject: t.mainSubject || "",
      campusId: t.campusId || "",
      status: t.status || "ACTIVE",
      email: t.email || ""
    })
  }

  const handleSaveEdit = async (id) => {
    setSaving(true); setErrorMsg("")
    try {
      await updateTeacherAction({ id, ...editForm })
      setTeachers(teachers.map(t => t.id === id ? {
        ...t,
        teacherName: editForm.teacherName,
        dateOfBirth: editForm.dateOfBirth || null,
        department: editForm.department || null,
        mainSubject: editForm.mainSubject || null,
        campusId: editForm.campusId || null,
        email: editForm.email || null,
        campus: (campuses || []).find(c => c.id === editForm.campusId)?.campusName || null,
        status: editForm.status
      } : t))
      setEditingId(null)
      setSuccessMsg("Đã lưu thay đổi thành công!")
      setTimeout(() => setSuccessMsg(""), 3000)
    } catch(e: any) {
      setErrorMsg("Lỗi khi lưu: " + (e.message || "Vui lòng thử lại!"))
    }
    setSaving(false)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Xóa giáo viên "${name}"?\nTài khoản đăng nhập cũng sẽ bị xóa.`)) return
    try {
      await deleteTeacherAction(id)
      setTeachers(teachers.filter(t => t.id !== id))
      setSuccessMsg(`Đã xóa giáo viên ${name}.`)
      setTimeout(() => setSuccessMsg(""), 3000)
    } catch(e: any) {
      setErrorMsg("Lỗi khi xóa: " + e.message)
    }
  }

  const handleResetPassword = async (id, code, name) => {
    if (!confirm(`Reset mật khẩu của "${name}" về: ${code}?`)) return
    try {
      await resetTeacherPasswordAction(id)
      setSuccessMsg(`Đã reset mật khẩu của ${name} về: ${code}`)
      setTimeout(() => setSuccessMsg(""), 4000)
    } catch(e: any) {}
  }

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const importYearId = defaultYearId
    if (!importYearId) { setErrorMsg("Không tìm thấy năm học đang hoạt động!"); return }
    setImporting(true); setImportResult(null); setErrorMsg("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/admin/teachers/import", { method: "POST", body: formData })
      const parsed = await res.json()
      if (!parsed.success) { setErrorMsg(parsed.error || "Lỗi đọc file"); setImporting(false); return }
      const result = await importTeachersAction(parsed.data, importYearId)
      setImportResult(result)
      if (result.created > 0) {
        setSuccessMsg(`Import thành công: ${result.created} giáo viên, bỏ qua ${result.skipped}`)
        setTimeout(() => { setSuccessMsg(""); window.location.reload() }, 2000)
      }
    } catch(e) { setErrorMsg("Lỗi xử lý file") }
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const downloadTemplate = () => {
    const csv = "STT,Ma GV,Ho va ten,Ngay sinh,To chuyen mon,Mon Day\n1,GV001,Nguyen Van A,15/05/1985,To Tu Nhien,Toan"
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "danh_sach_giao_vien.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 font-outfit">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2">
          <X className="w-4 h-4 flex-shrink-0" />{errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />{successMsg}
        </div>
      )}

      {/* Thống kê */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center"><Users className="w-5 h-5 text-indigo-600" /></div>
          <div><p className="text-2xl font-extrabold text-slate-800">{displayed.length}</p><p className="text-xs text-slate-500 font-medium">Hiển thị (Tất cả)</p></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><UserCheck className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-extrabold text-slate-800">{displayed.filter(t => t.status === "ACTIVE").length}</p><p className="text-xs text-slate-500 font-medium">Đang hoạt động</p></div>
        </div>
      </div>

      {/* Thanh công cụ */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center gap-3">
        <div className="flex flex-1 flex-wrap sm:flex-nowrap items-center gap-3 w-full">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Tìm theo tên, mã GV, cơ sở..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
          </div>
          <select 
            value={filterDepartment} 
            onChange={e => setFilterDepartment(e.target.value)}
            className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none bg-white font-medium text-slate-600 max-w-[200px] cursor-pointer"
          >
            <option value="">-- Tất cả Tổ CM --</option>
            {(departments || []).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <select 
            value={filterSubject} 
            onChange={e => setFilterSubject(e.target.value)}
            className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none bg-white font-medium text-slate-600 max-w-[200px] cursor-pointer"
          >
            <option value="">-- Tất cả Môn dạy --</option>
            {(subjects || []).map(s => <option key={s.id} value={s.subjectName}>{s.subjectName}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-medium">
            <Download className="w-4 h-4" />Mẫu
          </button>
          <label className="flex items-center gap-1.5 px-3 py-2.5 border border-indigo-200 bg-indigo-50 rounded-xl text-indigo-600 hover:bg-indigo-100 text-sm font-medium cursor-pointer">
            <Upload className="w-4 h-4" />{importing ? "Đang xử lý..." : "Import Excel"}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv"
              onChange={handleFileImport} className="hidden" disabled={importing} />
          </label>
          <button onClick={() => { setShowAddForm(true); setErrorMsg("") }}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all active:scale-95">
            <Plus className="w-5 h-5" />Thêm GV Mới
          </button>
        </div>
      </div>

      {/* Form thêm mới */}
      {showAddForm && (
        <div className="bg-white border-2 border-indigo-200 rounded-2xl p-6 shadow-lg animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-600" />Thêm Giáo Viên Mới
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-widest pl-1">Mã GV *</label>
              <input type="text" value={newForm.teacherCode}
                onChange={e => setNewForm({...newForm, teacherCode: e.target.value.trim().toUpperCase()})}
                placeholder="GV001"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-500 outline-none font-mono font-bold" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-widest pl-1">Họ và tên *</label>
              <input type="text" value={newForm.teacherName}
                onChange={e => setNewForm({...newForm, teacherName: e.target.value})}
                placeholder="Nguyễn Văn A"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-500 outline-none font-bold" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-widest pl-1">Email (Nhận thông báo)</label>
              <input type="email" value={newForm.email}
                onChange={e => setNewForm({...newForm, email: e.target.value.trim()})}
                placeholder="GV@skylineschool.edu.vn"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-500 outline-none font-bold text-slate-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-widest pl-1">Cơ sở</label>
              <select value={newForm.campus}
                onChange={e => setNewForm({...newForm, campus: e.target.value})}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-500 outline-none bg-white font-bold">
                <option value="">-- Chọn Cơ sở --</option>
                {(campuses || []).map(c => (
                  <option key={c.id} value={c.campusName}>{c.campusName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-widest pl-1">Tổ chuyên môn</label>
              <select value={newForm.department}
                onChange={e => setNewForm({...newForm, department: e.target.value})}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-500 outline-none bg-white font-bold">
                <option value="">-- Chọn Tổ --</option>
                {(departments || []).map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6 pt-5 border-t border-slate-100">
            <button onClick={handleCreate} disabled={saving}
              className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm shadow-xl shadow-indigo-200 transition-all active:scale-95">
              {saving ? "Số liệu đang được lưu..." : "Lưu Giáo Viên"}
            </button>
            <button onClick={() => { setShowAddForm(false); setErrorMsg("") }}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all">Hủy</button>
          </div>
        </div>
      )}

      {/* Bảng danh sách */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-5 py-4 text-left w-12">#</th>
                <th className="px-5 py-4 text-left">Mã GV</th>
                <th className="px-5 py-4 text-left">Họ và tên</th>
                <th className="px-5 py-4 text-left">Cơ sở</th>
                <th className="px-5 py-4 text-left">Tổ / Môn dạy</th>
                <th className="px-5 py-4 text-left">Tài khoản</th>
                <th className="px-5 py-4 text-center">Trạng thái</th>
                <th className="px-5 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-20 text-center text-slate-400">
                  <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="font-bold text-lg">Chưa có giáo viên nào phù hợp</p>
                </td></tr>
              ) : displayed.map((t, idx) => {
                const isEditing = editingId === t.id
                return (
                  <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-indigo-50/30 transition-all group">
                    <td className="px-5 py-4 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                    <td className="px-5 py-4">
                      <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg text-xs tracking-tight border border-indigo-100">{t.teacherCode}</span>
                    </td>
                    <td className="px-5 py-4">
                      {isEditing ? (
                        <div className="flex flex-col gap-1.5">
                          <input type="text" value={editForm.teacherName}
                            onChange={e => setEditForm({...editForm, teacherName: e.target.value})}
                            className="border border-indigo-300 rounded-lg px-2.5 py-1.5 text-sm w-44 outline-none font-bold" placeholder="Tên Giáo Viên" />
                          <input type="email" value={editForm.email || ""}
                            onChange={e => setEditForm({...editForm, email: e.target.value})}
                            className="border border-indigo-300 rounded-lg px-2.5 py-1.5 text-xs w-44 outline-none font-medium text-slate-500 bg-slate-50" placeholder="Email nhận thông báo" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="font-extrabold text-slate-900">{t.teacherName}</span>
                          {t.email && <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md self-start border border-slate-100 flex items-center gap-1"><Mail className="w-3 h-3" />{t.email}</span>}
                          {!t.email && <span className="text-[10px] font-medium text-red-400 self-start italic">Chưa có email</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {isEditing ? (
                        <select value={editForm.campusId} onChange={e => setEditForm({...editForm, campusId: e.target.value})}
                          className="border border-indigo-300 rounded-lg px-1.5 py-1.5 text-xs outline-none bg-white font-bold w-32">
                          <option value="">-- Chọn Cơ sở --</option>
                          {(campuses || []).map(c => (
                            <option key={c.id} value={c.id}>{c.campusName}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-600 font-bold text-xs">
                          <Building2 className="w-3.5 h-3.5 text-slate-300" />
                          {t.campus || "—"}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {isEditing ? (
                        <div className="flex flex-col gap-1.5">
                          <select value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})}
                            className="border border-indigo-300 rounded-lg px-1.5 py-1 text-xs outline-none bg-white font-bold">
                            <option value="">-- Tổ --</option>
                            {(departments || []).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                          </select>
                          <select value={editForm.mainSubject} onChange={e => setEditForm({...editForm, mainSubject: e.target.value})}
                            className="border border-indigo-300 rounded-lg px-1.5 py-1 text-xs outline-none bg-white font-bold">
                            <option value="">-- Môn --</option>
                            {(subjects || []).map(s => <option key={s.id} value={s.subjectName}>{s.subjectName}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {t.department ? <span className="text-violet-600 font-black text-[10px] uppercase">{t.department}</span> : null}
                          {t.mainSubject ? <span className="text-indigo-500 font-bold text-[10px] italic">{t.mainSubject}</span> : null}
                          {!t.department && !t.mainSubject && <span className="text-slate-300">—</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 group/key">
                        <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">{t.user?.email || t.teacherCode}</span>
                        <button onClick={() => handleResetPassword(t.id, t.teacherCode, t.teacherName)}
                          className="p-1.5 text-slate-300 hover:text-amber-500 hover:bg-white hover:shadow-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all" title="Reset mật khẩu">
                          <Key className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {isEditing ? (
                        <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}
                          className="border border-indigo-300 rounded-lg px-1.5 py-1.5 text-xs outline-none bg-white font-bold w-24">
                          <option value="ACTIVE">Đang dạy</option>
                          <option value="INACTIVE">Nghỉ dạy</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${t.status==="ACTIVE" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
                          {t.status==="ACTIVE" ? "Đang dạy" : "Nghỉ dạy"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSaveEdit(t.id)} disabled={saving} className="p-2 text-emerald-600 hover:bg-white hover:shadow-md rounded-xl transition-all"><Check className="w-5 h-5" /></button>
                            <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-white hover:shadow-md rounded-xl transition-all"><X className="w-5 h-5" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleEdit(t)} className="p-2 text-indigo-600 hover:bg-white hover:shadow-md rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(t.id, t.teacherName)} className="p-2 text-red-500 hover:bg-white hover:shadow-md rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
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
