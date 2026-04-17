"use client"
import { useState, useRef } from "react"
import { Upload, Download, UserCircle2, Plus, Trash2, Edit2, X, Save } from "lucide-react"
import * as xlsx from "xlsx"
import { importStudentsAction, addStudentAction, updateStudentAction, deleteStudentsAction } from "./actions"

export function AdminClassStudentsClient({ classId, initialStudents }: any) {
  const [students, setStudents] = useState(initialStudents)
  const [uploading, setUploading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({ studentCode: "", studentName: "", gender: "Nam", dateOfBirth: "" })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDownloadTemplate = () => {
    const ws = xlsx.utils.json_to_sheet([
      { "STT": 1, "Mã HS (Bắt buộc)*": "HS-10A1-001", "Họ và Tên (Bắt buộc)*": "Nguyễn Văn A", "Giới tính": "Nam", "Ngày sinh": "2010-05-20" },
      { "STT": 2, "Mã HS (Bắt buộc)*": "HS-10A1-002", "Họ và Tên (Bắt buộc)*": "Trần Thị B", "Giới tính": "Nữ", "Ngày sinh": "2010-12-15" }
    ])
    ws["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 18 }]
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, "Danh_sach_HS")
    xlsx.writeFile(wb, "Form_Mau_Them_Hoc_Sinh.xlsx")
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = xlsx.read(bstr, { type: "binary" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = xlsx.utils.sheet_to_json(ws) as any[]
        const payload = data.map((row: any) => {
          let parsedDate = null
          const rawDate = row["Ngày sinh"] || row["Ngay sinh"]
          if (rawDate) {
            if (typeof rawDate === "number") {
              const date = new Date(Math.round((rawDate - 25569)*86400*1000))
              parsedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000)
            } else { parsedDate = new Date(rawDate) }
          }
          return {
            studentCode: row["Mã HS (Bắt buộc)*"] || row["Mã HS"] || row["Ma HS"] || `HS-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            studentName: row["Họ và Tên (Bắt buộc)*"] || row["Họ và Tên"] || row["Ho va Ten"] || "Unnamed",
            gender: row["Giới tính"] || row["Gioi tinh"] || "Chưa rõ",
            dateOfBirth: parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : null
          }
        })
        const res = await importStudentsAction(classId, payload)
        if (res.success) {
          alert(`Đã import thành công ${res.count} học sinh!`)
          window.location.reload()
        }
      } catch(e) {
        console.error(e)
        alert("Lỗi khi đọc file Excel.")
      }
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
    reader.readAsBinaryString(file)
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(students.map((s: any) => s.id))
    else setSelectedIds([])
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) setSelectedIds([...selectedIds, id])
    else setSelectedIds(selectedIds.filter(x => x !== id))
  }

  const handleDeleteMany = async () => {
    if (!confirm(`Xóa ${selectedIds.length} học sinh đã chọn?`)) return
    setSubmitting(true)
    const res = await deleteStudentsAction(classId, selectedIds)
    if (res.success) {
       setStudents(students.filter((s: any) => !selectedIds.includes(s.id)))
       setSelectedIds([])
    } else { alert("Lỗi: " + res.error) }
    setSubmitting(false)
  }

  const handleDeleteOne = async (id: string) => {
    if (!confirm("Xóa học sinh này?")) return
    setSubmitting(true)
    const res = await deleteStudentsAction(classId, [id])
    if (res.success) {
       setStudents(students.filter((s: any) => s.id !== id))
       setSelectedIds(selectedIds.filter(x => x !== id))
    } else { alert("Lỗi: " + res.error) }
    setSubmitting(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    let res
    if (editingStudent) {
      res = await updateStudentAction(classId, editingStudent.id, formData)
    } else {
      res = await addStudentAction(classId, formData)
    }

    if (res.success) {
      window.location.reload()
    } else {
      alert("Lỗi: " + res.error)
      setSubmitting(false)
    }
  }

  const openEdit = (s: any) => {
    setEditingStudent(s)
    setFormData({
      studentCode: s.studentCode,
      studentName: s.studentName,
      gender: s.gender || "Nam",
      dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().split("T")[0] : ""
    })
    setShowAddModal(true)
  }

  const openAdd = () => {
    setEditingStudent(null)
    setFormData({ studentCode: "", studentName: "", gender: "Nam", dateOfBirth: "" })
    setShowAddModal(true)
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      {/* Modal for Add/Edit */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between">
               <h3 className="font-bold text-slate-800">{editingStudent ? "Sửa Thông Tin" : "Thêm Học Sinh Mới"}</h3>
               <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
               <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1">Mã học sinh *</label>
                 <input required value={formData.studentCode} onChange={e => setFormData({ ...formData, studentCode: e.target.value })} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
               </div>
               <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1">Họ và Tên *</label>
                 <input required value={formData.studentName} onChange={e => setFormData({ ...formData, studentName: e.target.value })} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-1">Giới tính</label>
                   <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                     <option value="Nam">Nam</option>
                     <option value="Nữ">Nữ</option>
                     <option value="Khác">Khác</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-1">Ngày sinh</label>
                   <input type="date" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                 </div>
               </div>
               <div className="pt-4 flex gap-3">
                 <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all">Hủy</button>
                 <button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-200 disabled:opacity-50">{submitting ? "Đang xử lý..." : "Lưu Lại"}</button>
               </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center mb-6 border-b border-slate-100 pb-4 gap-4">
        <div className="flex items-center gap-4">
           <h2 className="text-lg font-bold text-slate-800">Danh sách học sinh ({students.length})</h2>
           {selectedIds.length > 0 && (
             <button onClick={handleDeleteMany} disabled={submitting} className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-semibold text-sm border border-red-100 transition-colors">
                <Trash2 className="w-4 h-4" /> Xóa {selectedIds.length} HS đã chọn
             </button>
           )}
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={openAdd} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-sm text-sm">
            <Plus className="w-4 h-4 mr-2" /> Thêm Học Sinh
          </button>
          <button onClick={handleDownloadTemplate} className="flex items-center text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 font-semibold py-2 px-4 rounded-md transition-colors border border-blue-200 text-sm">
            <Download className="w-4 h-4 mr-2" /> Tải File Mẫu
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors shadow-sm disabled:opacity-50 text-sm">
            <Upload className="w-4 h-4 mr-2" /> {uploading ? "Đang tải..." : "Import Học Sinh"}
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-50 border border-slate-200 uppercase text-[10px] tracking-wider text-slate-500 font-bold">
            <tr>
              <th className="px-4 py-3 border-r border-slate-200 w-10 text-center">
                <input type="checkbox" className="w-4 h-4 rounded" checked={students.length > 0 && selectedIds.length === students.length} onChange={handleSelectAll} />
              </th>
              <th className="px-6 py-4 border-r border-slate-200 w-16">STT</th>
              <th className="px-6 py-4 border-r border-slate-200">Mã HS</th>
              <th className="px-6 py-4 border-r border-slate-200">Họ và Tên</th>
              <th className="px-6 py-4 border-r border-slate-200">Giới tính</th>
              <th className="px-6 py-4 border-r border-slate-200">Ngày sinh</th>
              <th className="px-6 py-4 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {students.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium border border-t-0 border-slate-200 bg-slate-50/50">
                  <UserCircle2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  Chưa có học sinh nào. Hãy import hoặc thêm mới.
                </td>
              </tr>
            ) : (
              students.map((student: any, idx: number) => (
                <tr key={student.id} className={`border-b border-l border-r border-slate-200 hover:bg-slate-50 transition-colors ${selectedIds.includes(student.id) ? "bg-indigo-50/50" : ""}`}>
                  <td className="px-4 py-3 border-r border-slate-200 text-center">
                    <input type="checkbox" className="w-4 h-4 rounded" checked={selectedIds.includes(student.id)} onChange={(e) => handleSelectRow(student.id, e.target.checked)} />
                  </td>
                  <td className="px-6 py-4 text-slate-900 font-bold border-r border-slate-200 text-center">{idx + 1}</td>
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs border-r border-slate-200">{student.studentCode}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800 border-r border-slate-200 flex items-center">
                    <UserCircle2 className="w-5 h-5 text-slate-300 mr-2" />
                    {student.studentName}
                  </td>
                  <td className="px-6 py-4 text-slate-600 border-r border-slate-200">
                    {student.gender || "Chưa cập nhật"}
                  </td>
                  <td className="px-6 py-4 text-slate-600 border-r border-slate-200">
                    {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "Chưa cập nhật"}
                  </td>
                  <td className="px-6 py-4 text-center">
                     <div className="flex justify-center gap-1">
                        <button onClick={() => openEdit(student)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Sửa">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteOne(student.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}