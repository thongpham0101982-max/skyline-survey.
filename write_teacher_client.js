const fs = require("fs");

const clientContent = `"use client"
import { useState, useRef } from "react"
import {
  Plus, Trash2, Edit2, Check, X, Upload, Download, RefreshCw,
  UserCheck, Key, GraduationCap, Search, Users
} from "lucide-react"
import {
  createTeacherAction, updateTeacherAction, deleteTeacherAction,
  importTeachersAction, resetTeacherPasswordAction
} from "./actions"

export function TeacherManagerClient({ initialTeachers }) {
  const [teachers, setTeachers] = useState(initialTeachers)
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [newForm, setNewForm] = useState({ teacherCode: "", teacherName: "", homeroomClass: "", email: "", phone: "" })
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const fileInputRef = useRef(null)

  const filtered = teachers.filter(t =>
    t.teacherName.toLowerCase().includes(search.toLowerCase()) ||
    t.teacherCode.toLowerCase().includes(search.toLowerCase()) ||
    (t.homeroomClass && t.homeroomClass.toLowerCase().includes(search.toLowerCase()))
  )

  const handleCreate = async () => {
    if (!newForm.teacherCode.trim() || !newForm.teacherName.trim()) {
      setErrorMsg("Vui long nhap Ma SKL va Ho va ten!")
      return
    }
    setSaving(true); setErrorMsg("")
    try {
      await createTeacherAction(newForm)
      setTeachers([...teachers, {
        id: "temp_" + Date.now(),
        teacherCode: newForm.teacherCode,
        teacherName: newForm.teacherName,
        homeroomClass: newForm.homeroomClass || null,
        email: newForm.email || null,
        phone: newForm.phone || null,
        status: "ACTIVE",
        user: { email: newForm.teacherCode, status: "ACTIVE" }
      }])
      setNewForm({ teacherCode: "", teacherName: "", homeroomClass: "", email: "", phone: "" })
      setShowAddForm(false)
      setSuccessMsg("Da tao giao vien va tai khoan dang nhap thanh cong!")
      setTimeout(() => setSuccessMsg(""), 4000)
    } catch(e) {
      setErrorMsg(e.message || "Co loi xay ra khi tao giao vien!")
    }
    setSaving(false)
  }

  const handleEdit = (t) => {
    setEditingId(t.id)
    setEditForm({ teacherName: t.teacherName, homeroomClass: t.homeroomClass || "", email: t.email || "", phone: t.phone || "" })
  }

  const handleSaveEdit = async (id) => {
    setSaving(true)
    try {
      await updateTeacherAction({ id, ...editForm })
      setTeachers(teachers.map(t => t.id === id ? {...t, ...editForm} : t))
      setEditingId(null)
    } catch(e) {}
    setSaving(false)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(\`Xoa giao vien "\${name}"?\\nTai khoan dang nhap cua GV nay cung se bi xoa.\`)) return
    try {
      await deleteTeacherAction(id)
      setTeachers(teachers.filter(t => t.id !== id))
    } catch(e) {}
  }

  const handleResetPassword = async (id, code, name) => {
    if (!confirm(\`Reset mat khau cua "\${name}" ve Ma SKL: \${code}?\`)) return
    try {
      await resetTeacherPasswordAction(id)
      setSuccessMsg(\`Da reset mat khau cua \${name} ve: \${code}\`)
      setTimeout(() => setSuccessMsg(""), 4000)
    } catch(e) {}
  }

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true); setImportResult(null); setErrorMsg("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/admin/teachers/import", { method: "POST", body: formData })
      const parsed = await res.json()
      if (!parsed.success) { setErrorMsg(parsed.error || "Loi doc file Excel"); setImporting(false); return }
      
      // Now import to DB
      const result = await importTeachersAction(parsed.data)
      setImportResult(result)
      if (result.created > 0) {
        // Refresh - show success
        setSuccessMsg(\`Import thanh cong: \${result.created} giao vien duoc tao, \${result.skipped} bo qua.\`)
        setTimeout(() => setSuccessMsg(""), 6000)
        // Reload page to refresh list
        window.location.reload()
      }
    } catch(e) {
      setErrorMsg("Loi xu ly file: " + (e.message || ""))
    }
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const downloadTemplate = () => {
    // Create a CSV template
    const csv = "STT,Ma SKL,Ho va ten,Lop CN,Email,So dien thoai\\n1,GV001,Nguyen Van A,10A1,gv001@school.edu.vn,0901234567\\n2,GV002,Tran Thi B,,gv002@school.edu.vn,"
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "template_giao_vien.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
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

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-800">{teachers.length}</p>
            <p className="text-xs text-slate-500 font-medium">Tong giao vien</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-800">{teachers.filter(t => t.status === "ACTIVE").length}</p>
            <p className="text-xs text-slate-500 font-medium">Dang hoat dong</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-800">{teachers.filter(t => t.homeroomClass).length}</p>
            <p className="text-xs text-slate-500 font-medium">Co Lop CN</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tim kiem theo ten, ma SKL, lop CN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />Template Excel
          </button>
          <label className="flex items-center gap-1.5 px-3 py-2.5 border border-indigo-200 bg-indigo-50 rounded-xl text-indigo-600 hover:bg-indigo-100 text-sm font-medium transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            {importing ? "Dang xu ly..." : "Import Excel"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileImport}
              className="hidden"
              disabled={importing}
            />
          </label>
          <button
            onClick={() => { setShowAddForm(true); setErrorMsg("") }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />Them GV Moi
          </button>
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-bold mb-1">Ket qua Import:</p>
          <p>Da tao: <strong>{importResult.created}</strong> giao vien | Bo qua (da ton tai): <strong>{importResult.skipped}</strong></p>
          {importResult.errors?.length > 0 && (
            <p className="text-red-600 mt-1">Loi: {importResult.errors.slice(0,3).join(", ")}</p>
          )}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white border-2 border-indigo-200 rounded-2xl p-6 shadow-lg">
          <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />Them Giao Vien Moi
          </h3>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 font-medium mb-4">
            Tai khoan dang nhap se tu dong duoc tao: Username = Ma SKL | Password = Ma SKL
          </div>
          {errorMsg && <div className="mb-3 bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm">{errorMsg}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Ma SKL <span className="text-red-500">*</span></label>
              <input type="text" value={newForm.teacherCode}
                onChange={e => setNewForm({...newForm, teacherCode: e.target.value.trim().toUpperCase()})}
                placeholder="Vd: GV001"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Ho va ten <span className="text-red-500">*</span></label>
              <input type="text" value={newForm.teacherName}
                onChange={e => setNewForm({...newForm, teacherName: e.target.value})}
                placeholder="Nguyen Van A"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Lop CN (Chu nhiem)</label>
              <input type="text" value={newForm.homeroomClass}
                onChange={e => setNewForm({...newForm, homeroomClass: e.target.value})}
                placeholder="10A1, 11B2..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Email</label>
              <input type="email" value={newForm.email}
                onChange={e => setNewForm({...newForm, email: e.target.value})}
                placeholder="gv@school.edu.vn"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">So dien thoai</label>
              <input type="text" value={newForm.phone}
                onChange={e => setNewForm({...newForm, phone: e.target.value})}
                placeholder="090xxxxxxx"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5 pt-5 border-t border-slate-100">
            <button onClick={handleCreate} disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-md transition-all disabled:opacity-60">
              {saving ? "Dang luu..." : "Luu Giao Vien"}
            </button>
            <button onClick={() => { setShowAddForm(false); setErrorMsg("") }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm">Huy</button>
          </div>
        </div>
      )}

      {/* Teacher Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <span className="font-bold text-slate-700 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-500" />
            Danh Sach Giao Vien ({filtered.length})
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 w-12">STT</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Ma SKL</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Ho va ten</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Lop CN</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Tai khoan</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Trang thai</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Thao tac</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-semibold">Chua co giao vien nao</p>
                  <p className="text-xs mt-1">Nhan "Them GV Moi" hoac Import Excel de bat dau</p>
                </td></tr>
              ) : filtered.map((t, idx) => {
                const isEditing = editingId === t.id
                return (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs">{t.teacherCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input type="text" value={editForm.teacherName}
                          onChange={e => setEditForm({...editForm, teacherName: e.target.value})}
                          className="border border-indigo-300 rounded px-2 py-1 text-sm w-40 focus:outline-none" />
                      ) : (
                        <span className="font-semibold text-slate-800">{t.teacherName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input type="text" value={editForm.homeroomClass}
                          onChange={e => setEditForm({...editForm, homeroomClass: e.target.value})}
                          className="border border-slate-200 rounded px-2 py-1 text-sm w-24 focus:outline-none"
                          placeholder="10A1..." />
                      ) : (
                        t.homeroomClass ? (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-bold">{t.homeroomClass}</span>
                        ) : <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {isEditing ? (
                        <input type="email" value={editForm.email}
                          onChange={e => setEditForm({...editForm, email: e.target.value})}
                          className="border border-slate-200 rounded px-2 py-1 text-sm w-40 focus:outline-none" />
                      ) : (
                        t.email || <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{t.user?.email || t.teacherCode}</span>
                        <button onClick={() => handleResetPassword(t.id, t.teacherCode, t.teacherName)}
                          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors opacity-0 group-hover:opacity-100" title="Reset mat khau">
                          <Key className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={\`text-xs font-bold px-2.5 py-1 rounded-full border \${
                        t.status === "ACTIVE"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }\`}>{t.status === "ACTIVE" ? "Active" : "Inactive"}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSaveEdit(t.id)} disabled={saving}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleEdit(t)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors opacity-0 group-hover:opacity-100">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(t.id, t.teacherName)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {/* Help Note */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700 flex items-start gap-3">
        <Key className="w-4 h-4 flex-shrink-0 mt-0.5 text-indigo-500" />
        <div>
          <span className="font-bold">Tai khoan dang nhap GV:</span> Username = <code className="bg-indigo-100 px-1 rounded">Ma SKL</code> | 
          Password = <code className="bg-indigo-100 px-1 rounded">Ma SKL</code>. 
          Click bieu tuong <Key className="inline w-3 h-3" /> tren moi dong de reset mat khau ve mac dinh.
        </div>
      </div>
    </div>
  )
}
`;

fs.writeFileSync("src/app/admin/teachers/client.tsx", clientContent, "utf8");
console.log("client.tsx created OK");
