"use client"
import { useState, useRef } from "react"
import { Upload, Download, UserCircle2, Plus, Trash2, Edit2, X, Save, Send } from "lucide-react"
import * as xlsx from "xlsx"
import { importStudentsAction, addStudentAction, updateStudentAction, deleteStudentsAction, assignSurveyToStudentAction } from "./actions"

export function AdminClassStudentsClient({ classId, initialStudents, activeSurveys = [] }: any) {
  const [students, setStudents] = useState(initialStudents)
  const [uploading, setUploading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedSurveyId, setSelectedSurveyId] = useState('')
  const [assigningStudent, setAssigningStudent] = useState<any>(null)
  const [formData, setFormData] = useState({ studentCode: "", studentName: "", gender: "Nam", dateOfBirth: "", status: "ACTIVE" })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDownloadTemplate = () => {
    const ws = xlsx.utils.json_to_sheet([
      { "STT": 1, "Mã học sinh *": "HS-10A1-001", "Họ và Tên *": "Nguyễn Văn A", "Giới tính": "Nam", "Ngày sinh": "20/05/2010" },
      { "STT": 2, "Mã học sinh *": "HS-10A1-002", "Họ và Tên *": "Trần Thị B", "Giới tính": "Nữ", "Ngày sinh": "15/12/2010" }
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
        const buffer = evt.target?.result
        const wb = xlsx.read(buffer, { type: "array" })
                let ws = null;
        let data: any[] = [];
        let headerRowIndex = -1;

        // Try all sheets until we find data
        for (const sheetName of wb.SheetNames) {
          const currentWs = wb.Sheets[sheetName];
          const rawData = xlsx.utils.sheet_to_json(currentWs, { header: 1 }) as any[][];
          if (!rawData || rawData.length === 0) continue;

          for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (row.some(cell => {
              const c = String(cell).toLowerCase();
              return c.includes("mã") || c.includes("học sinh") || c.includes("tên") || c.includes("hs") || c.includes("student");
            })) {
              headerRowIndex = i;
              ws = currentWs;
              break;
            }
          }
          if (ws) break;
        }

        if (!ws || headerRowIndex === -1) {
          alert("Không tìm thấy dữ liệu học sinh. Vui lòng kiểm tra lại file Excel (Cột 'Mã HS', 'Họ tên'...).");
          setUploading(false);
          return;
        }

        data = xlsx.utils.sheet_to_json(ws, { range: headerRowIndex }) as any[];

        const payload = data.filter(row => Object.values(row).some(v => v !== null && v !== "")).map((row: any) => {
          const findVal = (row: any, keywords: string[]) => {
            const keys = Object.keys(row);
            for (const key of keys) {
              const k = key.toLowerCase().trim();
              if (keywords.some(kw => k.includes(kw.toLowerCase()))) return row[key];
            }
            return null;
          };

          let parsedDate = null
          const rawDate = findVal(row, ["ngày sinh", "ngay sinh", "dob", "birth"]);
          if (rawDate) {
            if (typeof rawDate === "number") {
              const date = new Date(Math.round((rawDate - 25569)*86400*1000))
              parsedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000)
            } else if (typeof rawDate === "string") {
              const parts = String(rawDate).split(/[\\/\\-]/);
              if (parts.length === 3) {
                const d = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const y = parseInt(parts[2], 10);
                if (parts[0].length === 4) parsedDate = new Date(String(rawDate));
                else parsedDate = new Date(y, m, d);
              } else {
                parsedDate = new Date(String(rawDate));
              }
            } else {
              parsedDate = new Date(rawDate);
            }
          }

          const studentCode = String(findVal(row, ["mã học sinh", "mã hs", "ma hs", "studentcode"]) || "").trim() || `HS-${Date.now()}-${Math.floor(Math.random()*1000)}`;
          const studentName = String(findVal(row, ["họ và tên", "họ tên", "ho ten", "studentname", "full name"]) || "").trim() || "Unnamed";
          const gender = String(findVal(row, ["giới tính", "gioi tinh", "gender"]) || "Nam").trim();

          return {
            studentCode,
            studentName,
            gender,
            dateOfBirth: parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : null
          }
        })
        const res = await importStudentsAction(classId, payload)
        if (res.success) {
          alert(`[Vêrsion 2.1] Đã import thành công ${res.count} học sinh! Skipped: ${res.skipped || 0}`)
          window.location.reload()
        } else {
          alert("Lỗi server: " + res.error)
        }
      } catch(e) {
        console.error(e)
        alert("Lỗi khi đọc file Excel.")
      }
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
    reader.readAsArrayBuffer(file)
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

  
  const handleAssign = async () => {
    if (!selectedSurveyId || !assigningStudent) return
    setSubmitting(true)
    const res = await assignSurveyToStudentAction(assigningStudent.id, selectedSurveyId)
    if (res.success) {
      alert("Đã gán khảo sát thành công!")
      setShowAssignModal(false)
    } else {
      alert("Lỗi: " + res.error)
    }
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
      dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().split("T")[0] : "", status: s.status || "ACTIVE"
    })
    setShowAddModal(true)
  }

  const openAdd = () => {
    setEditingStudent(null)
    setFormData({ studentCode: "", studentName: "", gender: "Nam", dateOfBirth: "" })
    setShowAddModal(true)
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-emerald-100">
      {/* Modal for Add/Edit */}
      
      {/* Modal for Assign Survey */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between text-xs font-semibold">
               <h3 className="font-bold text-emerald-800">Gán Khảo Sát cho {assigningStudent?.studentName}</h3>
               <button onClick={() => setShowAssignModal(false)} className="p-1 hover:bg-emerald-200 transition-colors text-xs font-semibold"><X className="w-5 h-5 text-emerald-500" /></button>
            </div>
            <div className="p-6 space-y-4">
               <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1">Chọn đợt khảo sát *</label>
                 <select value={selectedSurveyId} onChange={e => setSelectedSurveyId(e.target.value)} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 transition-all">
                   <option value="">-- Chọn đợt khảo sát --</option>
                   {activeSurveys.map((s: any) => (
                     <option key={s.id} value={s.id}>{s.name} (Hết hạn: {new Date(s.endDate).toLocaleDateString('vi-VN')})</option>
                   ))}
                 </select>
                 {activeSurveys.length === 0 && <p className="text-xs text-amber-600 mt-1">Không có đợt khảo sát nào đang hoạt động.</p>}
               </div>
               <div className="pt-4 flex gap-3">
                 <button onClick={() => setShowAssignModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all">Hủy</button>
                 <button onClick={handleAssign} disabled={submitting || !selectedSurveyId} className="flex-[2] hover:bg-emerald-700 text-white font-bold transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 text-xs font-semibold">
                   {submitting ? "Đang xử lý..." : "Xác nhận Gán"}
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between text-xs font-semibold">
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
                 {editingStudent && (<div><label className="block text-sm font-semibold text-slate-700 mb-1">Trạng thái</label><select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"><option value="ACTIVE">⚡ Đang hoạt động</option><option value="LOCKED">🔒 Đã khóa</option></select></div>)}
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-1">Ngày sinh</label>
                   <input type="date" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                 </div>
               </div>
               <div className="pt-4 flex gap-3">
                 <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all">Hủy</button>
                 <button type="submit" disabled={submitting} className="flex-1 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 text-xs font-semibold">{submitting ? "Đang xử lý..." : "Lưu Lại"}</button>
               </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center mb-6 border-b border-slate-100 pb-4 gap-4">
        <div className="flex items-center gap-4">
           <h2 className="text-lg font-bold text-slate-800">Danh sách học sinh ({students.length})</h2>
           {selectedIds.length > 0 && (
             <button onClick={handleDeleteMany} disabled={submitting} className="flex items-center gap-2 text-red-600 hover:bg-red-100 font-semibold text-sm transition-colors text-xs font-semibold">
                <Trash2 className="w-4 h-4" /> Xóa {selectedIds.length} HS đã chọn
             </button>
           )}
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={openAdd} className="flex items-center hover:bg-indigo-700 text-white font-semibold transition-colors shadow-sm text-sm text-xs font-semibold">
            <Plus className="w-4 h-4 mr-2" /> Thêm Học Sinh
          </button>
          <button onClick={handleDownloadTemplate} className="flex items-center text-blue-600 hover:text-blue-700 hover:bg-blue-100 font-semibold transition-colors text-sm text-xs font-semibold">
            <Download className="w-4 h-4 mr-2" /> Tải File Mẫu
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors shadow-sm disabled:opacity-50 text-sm">
            <Upload className="w-4 h-4 mr-2" /> {uploading ? "Đang tải..." : "Import Học Sinh"}
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap border-collapse">
          <thead className="uppercase text-[10px] tracking-wider text-slate-500 font-bold text-xs font-semibold">
            <tr>
              <th className="px-4 py-3 border-r border-slate-200 w-10 text-center">
                <input type="checkbox" className="w-4 h-4 rounded" checked={students.length > 0 && selectedIds.length === students.length} onChange={handleSelectAll} />
              </th>
              <th className="px-6 py-4 border-r border-slate-200 w-16">STT</th>
              <th className="px-6 py-4 border-r border-slate-200">Mã HS</th>
              <th className="px-6 py-4 border-r border-slate-200">Họ và Tên</th>
              <th className="px-6 py-4 border-r border-slate-200">Giới tính</th>
              <th className="px-6 py-4 border-r border-slate-200">Ngày sinh</th><th className="px-6 py-4 border-r border-slate-200">Trạng thái</th>
              <th className="p-2 p-2 text-center border border-slate-200">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {students.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-slate-400 font-medium text-xs font-semibold">
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
                  <td className="px-6 py-4 border-r border-slate-200">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${(!student.status || student.status === "ACTIVE") ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                      {(!student.status || student.status === "ACTIVE") ? "HOẠT ĐỘNG" : "BỊ KHÓA"}
                    </span>
                  </td>
                  <td className="p-2 p-2 text-center border border-slate-200">
                     <div className="flex justify-center gap-1">
                        <button onClick={() => { setAssigningStudent(student); setSelectedSurveyId(''); setShowAssignModal(true); }} className="p-2 text-emerald-600 hover:bg-emerald-50 transition-colors text-xs font-semibold" title="Gán khảo sát">
                          <Send className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(student)} className="p-2 text-indigo-600 hover:bg-indigo-50 transition-colors text-xs font-semibold" title="Sửa">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteOne(student.id)} className="p-2 text-red-500 hover:bg-red-50 transition-colors text-xs font-semibold" title="Xóa">
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