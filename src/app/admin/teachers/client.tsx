"use client"
import { useState, useRef } from "react"
import {
  Plus, Trash2, Edit2, Check, X, Upload, Download,
  Key, GraduationCap, Search, Users, UserCheck
} from "lucide-react"
import {
  createTeacherAction, updateTeacherAction, deleteTeacherAction,
  importTeachersAction, resetTeacherPasswordAction
} from "./actions"

const EMPTY_NEW = {
  teacherCode: "", teacherName: "",
  email: "", phone: "",
  dateOfBirth: "", department: "", mainSubject: ""
}
const EMPTY_EDIT = { teacherName: "", dateOfBirth: "", department: "", mainSubject: "" }

export function TeacherManagerClient({ initialTeachers, years, defaultYearId, classes, departments, subjects }) {
  const [teachers, setTeachers] = useState(initialTeachers)
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_EDIT)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newForm, setNewForm] = useState(EMPTY_NEW)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const fileInputRef = useRef(null)

  const displayed = teachers.filter(t => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.teacherName.toLowerCase().includes(q) ||
      t.teacherCode.toLowerCase().includes(q) ||
      (t.department || "").toLowerCase().includes(q)
    )
  })

  const handleCreate = async () => {
    if (!newForm.teacherCode.trim() || !newForm.teacherName.trim()) {
      setErrorMsg("Vui lòng nhập Mã GV và Họ và tên!"); return
    }
    setSaving(true); setErrorMsg("")
    try {
      await createTeacherAction(newForm)
      setTeachers([...teachers, {
        id: "temp_" + Date.now(),
        teacherCode: newForm.teacherCode,
        teacherName: newForm.teacherName,
        dateOfBirth: newForm.dateOfBirth || null,
        department: (departments || []).find(d => d.name === newForm.department)?.name || newForm.department || null,
        mainSubject: (subjects || []).find(s => s.subjectName === newForm.mainSubject)?.subjectName || newForm.mainSubject || null,
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
      mainSubject: t.mainSubject || ""
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
    } catch(e) {}
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
    <div className="space-y-5">
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Tìm theo tên, mã GV, tổ chuyên môn..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none" />
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
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25">
            <Plus className="w-4 h-4" />Thêm GV Mới
          </button>
        </div>
      </div>

      {importResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-bold mb-1">Kết quả Import:</p>
          <p>Đã tạo: <strong>{importResult.created}</strong> | Bỏ qua: <strong>{importResult.skipped}</strong></p>
          {importResult.errors?.length > 0 && <p className="text-red-600 mt-1">Lỗi: {importResult.errors.slice(0,3).join(", ")}</p>}
        </div>
      )}

      {/* Form thêm mới */}
      {showAddForm && (
        <div className="bg-white border-2 border-indigo-200 rounded-2xl p-6 shadow-lg">
          <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />Thêm Giáo Viên Mới
          </h3>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 font-medium mb-4">
            Tài khoản đăng nhập: Tên đăng nhập = Mã GV | Mật khẩu mặc định = Mã GV.
          </div>
          {errorMsg && <div className="mb-3 bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm">{errorMsg}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Mã GV <span className="text-red-500">*</span></label>
              <input type="text" value={newForm.teacherCode}
                onChange={e => setNewForm({...newForm, teacherCode: e.target.value.trim().toUpperCase()})}
                placeholder="GV001"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none font-mono" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Họ và tên <span className="text-red-500">*</span></label>
              <input type="text" value={newForm.teacherName}
                onChange={e => setNewForm({...newForm, teacherName: e.target.value})}
                placeholder="Nguyễn Văn A"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Ngày sinh</label>
              <input type="date" value={newForm.dateOfBirth}
                onChange={e => setNewForm({...newForm, dateOfBirth: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Tổ chuyên môn</label>
              <select value={newForm.department}
                onChange={e => setNewForm({...newForm, department: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none bg-white">
                <option value="">-- Chọn Tổ --</option>
                {(departments || []).map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Môn dạy chính</label>
              <select value={newForm.mainSubject}
                onChange={e => setNewForm({...newForm, mainSubject: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none bg-white">
                <option value="">-- Chọn môn --</option>
                {(subjects || []).map(s => (
                  <option key={s.id} value={s.subjectName}>{s.subjectName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Email</label>
              <input type="email" value={newForm.email}
                onChange={e => setNewForm({...newForm, email: e.target.value})}
                placeholder="gv@truong.edu.vn"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-5 pt-5 border-t border-slate-100">
            <button onClick={handleCreate} disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-md disabled:opacity-60">
              {saving ? "Đang lưu..." : "Lưu Giáo Viên"}
            </button>
            <button onClick={() => { setShowAddForm(false); setErrorMsg("") }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm">Hủy</button>
          </div>
        </div>
      )}

      {/* Bảng danh sách */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
          <span className="font-bold text-slate-700 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-500" />
            Danh Sách Giáo Viên — Tất cả ({displayed.length})
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 w-10">#</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Mã GV</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Họ và tên</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Ngày sinh</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Tổ chuyên môn</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Môn dạy</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Tài khoản</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Trạng thái</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-semibold">Chưa có giáo viên nào trong hệ thống</p>
                  <p className="text-xs mt-1">Nhấn "Thêm GV Mới" để bắt đầu</p>
                </td></tr>
              ) : displayed.map((t, idx) => {
                const isEditing = editingId === t.id
                return (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 group">
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs">{t.teacherCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input type="text" value={editForm.teacherName}
                          onChange={e => setEditForm({...editForm, teacherName: e.target.value})}
                          className="border border-indigo-300 rounded px-2 py-1 text-sm w-36 outline-none" />
                      ) : <span className="font-semibold text-slate-800">{t.teacherName}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {isEditing
                        ? <input type="date" value={editForm.dateOfBirth} onChange={e => setEditForm({...editForm, dateOfBirth: e.target.value})} className="border border-indigo-300 rounded px-1 min-w-[110px] outline-none text-sm"/>
                        : (t.dateOfBirth ? new Date(t.dateOfBirth).toLocaleDateString("vi-VN") : "—")}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {isEditing ? (
                        <select value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})}
                          className="border border-indigo-300 rounded px-1 py-1 text-sm outline-none bg-white">
                          <option value="">-- Chọn Tổ --</option>
                          {(departments || []).map(d => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                      ) : (t.department
                          ? <span className="bg-violet-50 text-violet-700 text-xs font-semibold px-2 py-0.5 rounded-full">{t.department}</span>
                          : <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select value={editForm.mainSubject} onChange={e => setEditForm({...editForm, mainSubject: e.target.value})}
                          className="border border-indigo-300 rounded px-1 py-1 text-sm outline-none bg-white">
                          <option value="">-- Chọn môn --</option>
                          {(subjects || []).map(s => (
                            <option key={s.id} value={s.subjectName}>{s.subjectName}</option>
                          ))}
                        </select>
                      ) : (t.mainSubject
                          ? <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">{t.mainSubject}</span>
                          : <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{t.user?.email || t.teacherCode}</span>
                        <button onClick={() => handleResetPassword(t.id, t.teacherCode, t.teacherName)}
                          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded opacity-0 group-hover:opacity-100 transition-opacity" title="Reset mật khẩu">
                          <Key className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${t.status==="ACTIVE" ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                        {t.status==="ACTIVE" ? "Đang dạy" : "Nghỉ"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSaveEdit(t.id)} disabled={saving}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Lưu"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingId(null)}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded" title="Hủy"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleEdit(t)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100" title="Chỉnh sửa"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(t.id, t.teacherName)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100" title="Xóa"><Trash2 className="w-4 h-4" /></button>
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
