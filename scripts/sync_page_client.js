const fs = require("fs");

// ===== teachers/page.tsx - load classes for dropdown =====
const teacherPage = `import { prisma } from "@/lib/db"
import { TeacherManagerClient } from "./client"

export const metadata = { title: "Quan ly Giao vien | Admin Portal" }

export default async function TeacherManagerPage() {
  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true }
  })
  const defaultYearId = years.find(y => y.status === "ACTIVE")?.id || years[0]?.id || null

  // Query teachers via raw SQL (includes homeroomClassId)
  const rawTeachers = await prisma.$queryRaw\`
    SELECT t.id, t.teacherCode, t.teacherName, t.homeroomClass, t.homeroomClassId,
           t.email, t.phone, t.status, t.academicYearId,
           u.email as userEmail, u.status as userStatus
    FROM Teacher t
    LEFT JOIN User u ON t.userId = u.id
    ORDER BY t.teacherName ASC
  \` as any[]

  // Load all classes (for homeroom dropdown)
  const classes = await prisma.class.findMany({
    orderBy: [{ academicYear: { startDate: "desc" } }, { className: "asc" }],
    include: {
      academicYear: { select: { id: true, name: true } },
      campus: { select: { campusName: true } }
    }
  })

  // Load current homeroom assignments from Class table
  const homeroomAssignments = await prisma.$queryRaw\`
    SELECT id as classId, homeroomTeacherId, className FROM Class WHERE homeroomTeacherId IS NOT NULL
  \` as { classId: string, homeroomTeacherId: string, className: string }[]
  
  const classHomeroomMap = new Map(homeroomAssignments.map(a => [a.homeroomTeacherId, a]))
  const yearsById = new Map(years.map(y => [y.id, y]))

  const teachers = rawTeachers.map(t => ({
    id: t.id,
    teacherCode: t.teacherCode,
    teacherName: t.teacherName,
    homeroomClass: t.homeroomClass || null,
    homeroomClassId: t.homeroomClassId || (classHomeroomMap.get(t.id)?.classId) || null,
    email: t.email || null,
    phone: t.phone || null,
    status: t.status,
    academicYear: t.academicYearId ? (yearsById.get(t.academicYearId) ?? null) : null,
    user: { email: t.userEmail || t.teacherCode, status: t.userStatus || "ACTIVE" }
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quan ly Giao vien</h1>
        <p className="text-slate-500 mt-2 text-sm">Them, chinh sua thong tin giao vien theo Tung Nam hoc. Lop CN dong bo voi Manage Classes.</p>
      </div>
      <TeacherManagerClient initialTeachers={teachers} years={years} defaultYearId={defaultYearId} classes={classes} />
    </div>
  )
}
`;
fs.writeFileSync("src/app/admin/teachers/page.tsx", teacherPage, "utf8");
console.log("teachers/page.tsx OK - loads classes");

// ===== teachers/client.tsx - use class dropdown for Lop CN =====
const clientContent = `"use client"
import { useState, useRef } from "react"
import {
  Plus, Trash2, Edit2, Check, X, Upload, Download,
  Key, GraduationCap, Search, Users, UserCheck, CalendarDays, BookOpen
} from "lucide-react"
import {
  createTeacherAction, updateTeacherAction, deleteTeacherAction,
  importTeachersAction, resetTeacherPasswordAction
} from "./actions"

export function TeacherManagerClient({ initialTeachers, years, defaultYearId, classes }) {
  const [teachers, setTeachers] = useState(initialTeachers)
  const [filterYearId, setFilterYearId] = useState(defaultYearId || "ALL")
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [newForm, setNewForm] = useState({
    teacherCode: "", teacherName: "", homeroomClassId: "",
    email: "", phone: "", academicYearId: defaultYearId || ""
  })
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const fileInputRef = useRef(null)

  // Filter classes by selected year (for form dropdown)
  const filterYearForForm = newForm.academicYearId || defaultYearId || ""
  const classesForForm = filterYearForForm
    ? classes.filter(c => c.academicYear?.id === filterYearForForm)
    : classes

  // Filter classes by edit year
  const classesForEdit = editForm.academicYearId
    ? classes.filter(c => c.academicYear?.id === editForm.academicYearId)
    : classes

  const displayed = teachers.filter(t => {
    const matchYear = filterYearId === "ALL" || t.academicYear?.id === filterYearId
    const matchSearch = !search ||
      t.teacherName.toLowerCase().includes(search.toLowerCase()) ||
      t.teacherCode.toLowerCase().includes(search.toLowerCase()) ||
      (t.homeroomClass && t.homeroomClass.toLowerCase().includes(search.toLowerCase()))
    return matchYear && matchSearch
  })

  const currentYearName = years.find(y => y.id === filterYearId)?.name || "Tat ca"

  const handleCreate = async () => {
    if (!newForm.teacherCode.trim() || !newForm.teacherName.trim()) {
      setErrorMsg("Vui long nhap Ma SKL va Ho va ten!"); return
    }
    if (!newForm.academicYearId) {
      setErrorMsg("Vui long chon Nam hoc!"); return
    }
    setSaving(true); setErrorMsg("")
    try {
      await createTeacherAction(newForm)
      const yearObj = years.find(y => y.id === newForm.academicYearId)
      const classObj = classes.find(c => c.id === newForm.homeroomClassId)
      setTeachers([...teachers, {
        id: "temp_" + Date.now(),
        teacherCode: newForm.teacherCode,
        teacherName: newForm.teacherName,
        homeroomClass: classObj?.className || null,
        homeroomClassId: newForm.homeroomClassId || null,
        email: newForm.email || null,
        phone: newForm.phone || null,
        status: "ACTIVE",
        academicYear: yearObj ? { id: yearObj.id, name: yearObj.name } : null,
        user: { email: newForm.teacherCode, status: "ACTIVE" }
      }])
      setNewForm({ teacherCode: "", teacherName: "", homeroomClassId: "", email: "", phone: "", academicYearId: defaultYearId || "" })
      setShowAddForm(false)
      setSuccessMsg("Da tao giao vien, tai khoan va gan lop CN thanh cong!")
      setTimeout(() => setSuccessMsg(""), 4000)
    } catch(e) {
      setErrorMsg(e.message || "Co loi xay ra!")
    }
    setSaving(false)
  }

  const handleEdit = (t) => {
    setEditingId(t.id)
    setEditForm({
      teacherName: t.teacherName,
      homeroomClassId: t.homeroomClassId || "",
      email: t.email || "",
      academicYearId: t.academicYear?.id || ""
    })
  }

  const handleSaveEdit = async (id) => {
    setSaving(true)
    try {
      await updateTeacherAction({ id, ...editForm })
      const yearObj = years.find(y => y.id === editForm.academicYearId)
      const classObj = classes.find(c => c.id === editForm.homeroomClassId)
      setTeachers(teachers.map(t => t.id === id ? {
        ...t,
        teacherName: editForm.teacherName,
        email: editForm.email,
        homeroomClass: classObj?.className || null,
        homeroomClassId: editForm.homeroomClassId || null,
        academicYear: yearObj ? { id: yearObj.id, name: yearObj.name } : null
      } : t))
      setEditingId(null)
    } catch(e) {}
    setSaving(false)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(\`Xoa giao vien "\${name}"?\\nTai khoan dang nhap va phan cong Lop CN cua GV nay cung se bi xoa.\`)) return
    try {
      await deleteTeacherAction(id)
      setTeachers(teachers.filter(t => t.id !== id))
    } catch(e) {}
  }

  const handleResetPassword = async (id, code, name) => {
    if (!confirm(\`Reset mat khau cua "\${name}" ve: \${code}?\`)) return
    try {
      await resetTeacherPasswordAction(id)
      setSuccessMsg(\`Da reset mat khau cua \${name} ve: \${code}\`)
      setTimeout(() => setSuccessMsg(""), 4000)
    } catch(e) {}
  }

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const importYearId = newForm.academicYearId || defaultYearId
    if (!importYearId) { setErrorMsg("Vui long chon Nam hoc truoc khi import!"); return }
    setImporting(true); setImportResult(null); setErrorMsg("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/admin/teachers/import", { method: "POST", body: formData })
      const parsed = await res.json()
      if (!parsed.success) { setErrorMsg(parsed.error || "Loi doc file"); setImporting(false); return }
      const result = await importTeachersAction(parsed.data, importYearId)
      setImportResult(result)
      if (result.created > 0) {
        setSuccessMsg(\`Import thanh cong: \${result.created} GV, bo qua \${result.skipped}\`)
        setTimeout(() => { setSuccessMsg(""); window.location.reload() }, 2000)
      }
    } catch(e) { setErrorMsg("Loi xu ly file") }
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const downloadTemplate = () => {
    const csv = "STT,Ma SKL,Ho va ten,Lop CN (Ten lop),Email,So dien thoai\\n1,GV001,Nguyen Van A,10A1,gv001@school.edu.vn,0901234567"
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "template_giao_vien.csv"; a.click()
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

      {/* Year Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-slate-700">Loc theo Nam hoc:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setFilterYearId("ALL")}
              className={\`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all \${filterYearId === "ALL" ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}\`}>
              Tat ca ({teachers.length})
            </button>
            {years.map(y => (
              <button key={y.id} onClick={() => setFilterYearId(y.id)}
                className={\`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all \${filterYearId === y.id ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}\`}>
                {y.name}{y.status === "ACTIVE" && <span className="ml-1 opacity-75 text-[10px]">Active</span>}
                ({teachers.filter(t => t.academicYear?.id === y.id).length})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center"><Users className="w-5 h-5 text-indigo-600" /></div>
          <div><p className="text-2xl font-extrabold text-slate-800">{displayed.length}</p><p className="text-xs text-slate-500 font-medium">Hien thi ({currentYearName})</p></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><UserCheck className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-extrabold text-slate-800">{displayed.filter(t => t.status === "ACTIVE").length}</p><p className="text-xs text-slate-500 font-medium">Dang hoat dong</p></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><BookOpen className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-2xl font-extrabold text-slate-800">{displayed.filter(t => t.homeroomClassId).length}</p><p className="text-xs text-slate-500 font-medium">Co Lop CN</p></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Tim theo ten, ma SKL, lop CN..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-medium">
            <Download className="w-4 h-4" />Template
          </button>
          <label className="flex items-center gap-1.5 px-3 py-2.5 border border-indigo-200 bg-indigo-50 rounded-xl text-indigo-600 hover:bg-indigo-100 text-sm font-medium cursor-pointer">
            <Upload className="w-4 h-4" />{importing ? "Dang xu ly..." : "Import Excel"}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv"
              onChange={handleFileImport} className="hidden" disabled={importing} />
          </label>
          <button onClick={() => { setShowAddForm(true); setErrorMsg("") }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25">
            <Plus className="w-4 h-4" />Them GV Moi
          </button>
        </div>
      </div>

      {importResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-bold mb-1">Ket qua Import:</p>
          <p>Da tao: <strong>{importResult.created}</strong> | Bo qua: <strong>{importResult.skipped}</strong></p>
          {importResult.errors?.length > 0 && <p className="text-red-600 mt-1">Loi: {importResult.errors.slice(0,3).join(", ")}</p>}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white border-2 border-indigo-200 rounded-2xl p-6 shadow-lg">
          <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />Them Giao Vien Moi
          </h3>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 font-medium mb-4">
            Tai khoan dang nhap: Username = Ma SKL | Password = Ma SKL. Lop CN se dong bo voi Manage Classes.
          </div>
          {errorMsg && <div className="mb-3 bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm">{errorMsg}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-3">
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Nam hoc <span className="text-red-500">*</span></label>
              <select value={newForm.academicYearId}
                onChange={e => setNewForm({...newForm, academicYearId: e.target.value, homeroomClassId: ""})}
                className="border-2 border-indigo-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 outline-none">
                <option value="">-- Chon Nam hoc --</option>
                {years.map(y => <option key={y.id} value={y.id}>{y.name}{y.status === "ACTIVE" ? " (Active)" : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Ma SKL <span className="text-red-500">*</span></label>
              <input type="text" value={newForm.teacherCode}
                onChange={e => setNewForm({...newForm, teacherCode: e.target.value.trim().toUpperCase()})}
                placeholder="GV001"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none font-mono" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Ho va ten <span className="text-red-500">*</span></label>
              <input type="text" value={newForm.teacherName}
                onChange={e => setNewForm({...newForm, teacherName: e.target.value})}
                placeholder="Nguyen Van A"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />Lop CN (dong bo Manage Classes)
              </label>
              <select value={newForm.homeroomClassId}
                onChange={e => setNewForm({...newForm, homeroomClassId: e.target.value})}
                className="w-full border-2 border-amber-200 rounded-lg px-3 py-2.5 text-sm bg-amber-50 text-amber-800 font-medium outline-none focus:border-amber-400">
                <option value="">-- Chua co Lop CN --</option>
                {classesForForm.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
              </select>
              {classesForForm.length === 0 && newForm.academicYearId && (
                <p className="text-xs text-slate-400 mt-1">Khong co lop trong nam hoc nay. Vui long vao Manage Classes de tao lop truoc.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Email</label>
              <input type="email" value={newForm.email}
                onChange={e => setNewForm({...newForm, email: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 outline-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-5 pt-5 border-t border-slate-100">
            <button onClick={handleCreate} disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-md disabled:opacity-60">
              {saving ? "Dang luu..." : "Luu Giao Vien"}
            </button>
            <button onClick={() => { setShowAddForm(false); setErrorMsg("") }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm">Huy</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
          <span className="font-bold text-slate-700 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-500" />
            Danh Sach Giao Vien - {currentYearName} ({displayed.length})
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 w-10">#</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Ma SKL</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Ho va ten</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-amber-600" />Lop CN</span>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Nam hoc</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Tai khoan</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">TT</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Thao tac</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-semibold">Chua co giao vien nao trong nam hoc nay</p>
                </td></tr>
              ) : displayed.map((t, idx) => {
                const isEditing = editingId === t.id
                const activeYearId = years.find(y => y.status === "ACTIVE")?.id
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
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select value={editForm.homeroomClassId || ""}
                          onChange={e => setEditForm({...editForm, homeroomClassId: e.target.value})}
                          className="border-2 border-amber-200 rounded-lg px-2 py-1 text-sm bg-amber-50 text-amber-800 font-semibold outline-none w-32">
                          <option value="">-- Khong co --</option>
                          {classesForEdit.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                        </select>
                      ) : t.homeroomClass ? (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                          <BookOpen className="w-3 h-3" />{t.homeroomClass}
                        </span>
                      ) : <span className="text-slate-300 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select value={editForm.academicYearId || ""}
                          onChange={e => setEditForm({...editForm, academicYearId: e.target.value, homeroomClassId: ""})}
                          className="border border-indigo-200 rounded px-2 py-1 text-sm outline-none bg-indigo-50 text-indigo-700 w-28">
                          {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                        </select>
                      ) : (
                        t.academicYear ? (
                          <span className={\`text-xs font-medium px-2 py-0.5 rounded-full border \${
                            t.academicYear.id === activeYearId ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-50 text-slate-500 border-slate-200"
                          }\`}>{t.academicYear.name}</span>
                        ) : <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{t.user?.email || t.teacherCode}</span>
                        <button onClick={() => handleResetPassword(t.id, t.teacherCode, t.teacherName)}
                          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded opacity-0 group-hover:opacity-100 transition-opacity" title="Reset mat khau">
                          <Key className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={\`text-xs font-bold px-2 py-0.5 rounded-full border \${t.status==="ACTIVE" ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-400 border-slate-200"}\`}>
                        {t.status==="ACTIVE"?"Active":"Off"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSaveEdit(t.id)} disabled={saving}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingId(null)}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleEdit(t)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(t.id, t.teacherName)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
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

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700 flex items-start gap-3">
        <BookOpen className="w-4 h-4 flex-shrink-0 mt-0.5 text-indigo-500" />
        <div>
          <span className="font-bold">Dong bo Lop CN:</span> Khi gan Lop CN cho GV, he thong tu dong cap nhat <code className="bg-indigo-100 px-1 rounded">homeroomTeacherId</code> ben Manage Classes va nguoc lai. 
          Tai khoan: Username = Ma SKL | Password = Ma SKL.
        </div>
      </div>
    </div>
  )
}
`;

fs.writeFileSync("src/app/admin/teachers/client.tsx", clientContent, "utf8");
console.log("teachers/client.tsx OK - class dropdown synced");
console.log("=== Done ===");
