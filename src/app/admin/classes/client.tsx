"use client"
import { useState, useRef, useEffect } from "react"
import { Upload, Users, BookOpen, Download, Calendar, Building2, GraduationCap, Layers, Trash2, Edit, X, Save, CheckSquare } from "lucide-react"
import Link from "next/link"
import * as xlsx from "xlsx"
import { importClassesAction, deleteClasses, updateClass } from "./actions"

const LEVELS = [
  { value: "", label: "Tất cả" },
  { value: "Tieu hoc", label: "Tiểu học" },
  { value: "THCS", label: "THCS" },
  { value: "THPT", label: "THPT" },
]

export function AdminClassesClient({ initialClasses, campuses, academicYears }: any) {
  const [classes, setClasses] = useState(initialClasses)
  const [selectedYearId, setSelectedYearId] = useState<string>(academicYears[0]?.id || "")
  const [selectedCampus, setSelectedCampus] = useState("")
  const [selectedLevel, setSelectedLevel] = useState("")
  const [selectedEduSystem, setSelectedEduSystem] = useState("")
  const [uploading, setUploading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editModal, setEditModal] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedYear = academicYears.find((y: any) => y.id === selectedYearId)
  const eduSystems = selectedYear?.educationSystems || []

  useEffect(() => { setClasses(initialClasses); setSelectedIds([]) }, [initialClasses])

  let filteredClasses = classes.filter((c: any) => c.academicYearId === selectedYearId)
  if (selectedCampus) filteredClasses = filteredClasses.filter((c: any) => c.campusId === selectedCampus)
  if (selectedLevel) filteredClasses = filteredClasses.filter((c: any) => c.level === selectedLevel)
  if (selectedEduSystem) filteredClasses = filteredClasses.filter((c: any) => c.educationSystem === selectedEduSystem)

  const handleDownloadTemplate = () => {
    const ws = xlsx.utils.json_to_sheet([
      { "Mã lớp*": "C-26-1", "Cơ sở": "CS1", "Bậc học": "THCS", "Khối lớp": "6", "Tên lớp*": "6A1", "Hệ học": "HNG", "Sỹ số": 35, "GVCN": "Nguyễn Văn A" },
      { "Mã lớp*": "C-26-2", "Cơ sở": "CS2", "Bậc học": "THPT", "Khối lớp": "10", "Tên lớp*": "10A1", "Hệ học": "SB", "Sỹ số": 32, "GVCN": "Trần Thị B" },
      { "Mã lớp*": "C-26-3", "Cơ sở": "CS1", "Bậc học": "THCS", "Khối lớp": "6", "Tên lớp*": "6B1", "Hệ học": "HNS", "Sỹ số": 30, "GVCN": "" }
    ], { header: ["Mã lớp*", "Cơ sở", "Bậc học", "Khối lớp", "Tên lớp*", "Hệ học", "Sỹ số", "GVCN"] })
    ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 8 }, { wch: 25 }]
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, "Danh_sach_lop")
    xlsx.writeFile(wb, "Form_Mau_Them_Lop.xlsx")
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedYearId) { alert("Vui lòng chọn Năm học!"); return }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = xlsx.read(bstr, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = xlsx.utils.sheet_to_json(ws) as any[]
        const defaultCampus = campuses[0]?.id

        const payload = data.map((row: any) => {
          const excelCampusStr = (row["Cơ sở"] || row["Co so"] || "").toString().trim().toLowerCase()
          let matchedCampus = campuses.find((c: any) => {
             const cName = c.campusName.trim().toLowerCase()
             return cName === excelCampusStr || cName.includes(excelCampusStr) || excelCampusStr.includes(cName)
          })

          return {
            classCode: row["Mã lớp*"] || row["Ma lop*"] || row["Ma lop"] || "C-" + Date.now() + "-" + Math.floor(Math.random()*1000),
            className: row["Tên lớp*"] || row["Ten lop*"] || row["Ten lop"] || "New Class",
            level: (row["Bậc học"] || row["Bac hoc"] || "").toString().trim(),
            grade: (row["Khối lớp"] || row["Khoi lop"] || "").toString().trim(),
            educationSystem: (row["Hệ học"] || row["He hoc"] || "").toString().trim(),
            campusId: matchedCampus ? matchedCampus.id : defaultCampus,
            academicYearId: selectedYearId
          }
        })
        const res = await importClassesAction(payload)
        if (res.success) alert("Đã import " + res.count + " lớp học! Tải lại trang để cập nhật.")
      } catch(e) { console.error(e); alert("Lỗi đọc file Excel!") }
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
    reader.readAsBinaryString(file)
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filteredClasses.map((c: any) => c.id))
    else setSelectedIds([])
  }
  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) setSelectedIds([...selectedIds, id])
    else setSelectedIds(selectedIds.filter(x => x !== id))
  }
  const handleDeleteMany = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa " + selectedIds.length + " lớp?")) return
    setDeleting(true)
    const res = await deleteClasses(selectedIds)
    if (res.success) alert("Xóa thành công!")
    else alert("Có lỗi khi xóa!")
    setDeleting(false)
  }
  const handleDeleteSingle = async (id: string) => {
    if (!confirm("Xóa lớp này?")) return
    const res = await deleteClasses([id])
    if (res.success) alert("Xóa thành công!"); else alert("Không thể xóa!")
  }
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await updateClass(editModal.id, {
      className: editModal.className,
      level: editModal.level,
      grade: editModal.grade,
      campusId: editModal.campusId,
      educationSystem: editModal.educationSystem || ""
    })
    if (res.success) setEditModal(null); else alert("Lỗi khi cập nhật!")
  }

  const getEduBadgeColor = (code: string) => {
    if (code === "HNG") return "bg-purple-100 text-purple-700"
    if (code === "SB") return "bg-teal-100 text-teal-700"
    if (code === "HNS") return "bg-orange-100 text-orange-700"
    return "bg-slate-100 text-slate-600"
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <label className="font-semibold text-slate-700 text-sm">Năm học:</label>
          <select value={selectedYearId} onChange={e => { setSelectedYearId(e.target.value); setSelectedEduSystem("") }}
            className="border rounded-lg p-2 text-sm min-w-[160px] outline-none focus:ring-2 focus:ring-blue-300">
            {academicYears.length === 0 && <option value="">Chưa có</option>}
            {academicYears.map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <label className="font-semibold text-slate-700 text-sm">Cơ sở:</label>
          <select value={selectedCampus} onChange={e => setSelectedCampus(e.target.value)}
            className="border rounded-lg p-2 text-sm min-w-[160px] outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">Tất cả cơ sở</option>
            {campuses.map((cp: any) => <option key={cp.id} value={cp.id}>{cp.campusName}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-emerald-600" />
          <label className="font-semibold text-slate-700 text-sm">Bậc học:</label>
          <select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)}
            className="border rounded-lg p-2 text-sm min-w-[140px] outline-none focus:ring-2 focus:ring-emerald-300">
            {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-600" />
          <label className="font-semibold text-slate-700 text-sm">Hệ học:</label>
          <select value={selectedEduSystem} onChange={e => setSelectedEduSystem(e.target.value)}
            className="border rounded-lg p-2 text-sm min-w-[120px] outline-none focus:ring-2 focus:ring-purple-300">
            <option value="">Tất cả</option>
            {eduSystems.map((es: any) => <option key={es.id} value={es.code}>{es.code} - {es.name}</option>)}
          </select>
        </div>
        <div className="ml-auto text-sm text-slate-500">
          Tổng: <span className="font-bold text-slate-800">{filteredClasses.length}</span> lớp
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white p-5 rounded-xl shadow-sm border">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800">Quản lý lớp học</h2>
            {selectedIds.length > 0 && (
              <button onClick={handleDeleteMany} disabled={deleting}
                className="flex items-center text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 font-semibold py-1.5 px-3 rounded-md border border-red-200 text-sm">
                <Trash2 className="w-4 h-4 mr-2" /> {deleting ? "Đang xóa..." : "Xóa " + selectedIds.length + " lớp"}
              </button>
            )}
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={handleDownloadTemplate} className="flex items-center text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 font-semibold py-2 px-4 rounded-md border border-blue-200 text-sm">
              <Download className="w-4 h-4 mr-2" /> Tải File Mẫu
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading || !selectedYearId}
              className="flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm disabled:opacity-50 text-sm">
              <Upload className="w-4 h-4 mr-2" /> {uploading ? "Đang xử lý..." : "Import File Excel"}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-4 w-12 text-center"><input type="checkbox" className="w-4 h-4 rounded text-blue-600" checked={filteredClasses.length > 0 && selectedIds.length === filteredClasses.length} onChange={handleSelectAll} /></th>
              <th className="px-4 py-4 font-semibold text-slate-500 uppercase text-xs w-12">STT</th>
              <th className="px-4 py-4 font-semibold text-slate-500 uppercase text-xs">Cơ sở</th>
              <th className="px-4 py-4 font-semibold text-slate-500 uppercase text-xs">Bậc học</th>
              <th className="px-4 py-4 font-semibold text-slate-500 uppercase text-xs">Khối</th>
              <th className="px-4 py-4 font-semibold text-slate-500 uppercase text-xs">Tên lớp</th>
              <th className="px-4 py-4 font-semibold text-slate-500 uppercase text-xs">Hệ học</th>
              <th className="px-4 py-4 font-semibold text-slate-500 uppercase text-xs">Sỹ số</th>
              <th className="px-4 py-4 font-semibold text-slate-500 uppercase text-xs">GVCN</th>
              <th className="px-4 py-4 font-semibold text-slate-500 uppercase text-xs text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredClasses.length === 0 && (
              <tr><td colSpan={10} className="p-8 text-center text-slate-400">Chưa có lớp học nào trong năm học này.</td></tr>
            )}
            {filteredClasses.map((c: any, i: number) => (
               <tr key={c.id} className={"hover:bg-slate-50 transition-colors " + (selectedIds.includes(c.id) ? "bg-blue-50/50" : "")}>
                 <td className="px-4 py-3.5 text-center"><input type="checkbox" className="w-4 h-4 rounded text-blue-600" checked={selectedIds.includes(c.id)} onChange={e => handleSelectRow(c.id, e.target.checked)} /></td>
                 <td className="px-4 py-3.5 text-slate-400 text-center">{i + 1}</td>
                 <td className="px-4 py-3.5"><span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-indigo-500" /><span className="text-slate-700">{c.campus}</span></span></td>
                 <td className="px-4 py-3.5">
                   {c.level ? (<span className={"text-xs px-2 py-1 rounded-full font-medium " + (c.level === "Tieu hoc" ? "bg-amber-50 text-amber-700" : c.level === "THCS" ? "bg-blue-50 text-blue-700" : c.level === "THPT" ? "bg-purple-50 text-purple-700" : "bg-slate-100 text-slate-600")}>{c.level}</span>) : <span className="text-slate-300">--</span>}
                 </td>
                 <td className="px-4 py-3.5">
                   {c.grade ? (<span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-emerald-500" /><span className="text-slate-700 font-medium">{c.grade}</span></span>) : <span className="text-slate-300">--</span>}
                 </td>
                 <td className="px-4 py-3.5">
                   <Link href={"/admin/classes/" + c.id} className="text-blue-600 hover:text-blue-800 hover:underline flex items-center font-semibold">
                     <div className="bg-blue-100 p-1.5 rounded-lg mr-2"><BookOpen className="w-3.5 h-3.5 text-blue-600" /></div>{c.className}
                   </Link>
                 </td>
                 <td className="px-4 py-3.5">
                   {c.educationSystem ? (<span className={"text-xs px-2.5 py-1 rounded-full font-bold " + getEduBadgeColor(c.educationSystem)}>{c.educationSystem}</span>) : <span className="text-slate-300">--</span>}
                 </td>
                 <td className="px-4 py-3.5"><span className="flex items-center text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full w-max text-xs font-medium"><Users className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> {c.studentCount}</span></td>
                 <td className="px-4 py-3.5 text-slate-700 font-medium">{c.homeroomTeacher}</td>
                 <td className="px-4 py-3.5 text-right space-x-2">
                    <button onClick={() => setEditModal({...c})} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg" title="Sửa"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteSingle(c.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg" title="Xóa"><Trash2 className="w-4 h-4" /></button>
                 </td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
             <div className="p-5 border-b bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Edit className="w-5 h-5 text-blue-500" /> Sửa thông tin lớp</h3>
                <button onClick={() => setEditModal(null)} className="p-1 rounded-full hover:bg-slate-200 text-slate-500"><X className="w-5 h-5" /></button>
             </div>
             <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Tên lớp</label><input type="text" required value={editModal.className} onChange={e => setEditModal({...editModal, className: e.target.value})} className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm"/></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Cơ sở</label><select required value={editModal.campusId} onChange={e => setEditModal({...editModal, campusId: e.target.value})} className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm">{campuses.map((cp: any) => <option key={cp.id} value={cp.id}>{cp.campusName}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-semibold text-slate-700 mb-1">Bậc học</label><select required value={editModal.level} onChange={e => setEditModal({...editModal, level: e.target.value})} className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm"><option value="">Chọn bậc</option>{LEVELS.filter(l => l.value).map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select></div>
                  <div><label className="block text-sm font-semibold text-slate-700 mb-1">Khối lớp</label><input type="text" required value={editModal.grade} onChange={e => setEditModal({...editModal, grade: e.target.value})} className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm"/></div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Hệ học</label>
                  <select value={editModal.educationSystem || ""} onChange={e => setEditModal({...editModal, educationSystem: e.target.value})} className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                    <option value="">-- Chưa chọn --</option>
                    {eduSystems.map((es: any) => <option key={es.id} value={es.code}>{es.code} - {es.name}</option>)}
                  </select>
                </div>
                <div className="pt-4 flex items-center justify-end gap-3">
                   <button type="button" onClick={() => setEditModal(null)} className="px-4 py-2 font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm">Hủy</button>
                   <button type="submit" className="px-5 py-2 font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl text-sm shadow-sm flex items-center"><Save className="w-4 h-4 mr-2" /> Lưu thay đổi</button>
                </div>
             </form>
           </div>
        </div>
      )}
    </div>
  )
}