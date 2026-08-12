"use client"
import Link from "next/link"
import { useState, useRef, useMemo } from "react"
import { Upload, Download, UserCircle2, Plus, Trash2, Edit2, X, Save, Send, RefreshCw, ArrowUpDown, Layers, ExternalLink, FileCode } from "lucide-react"
import * as xlsx from "xlsx"
import { importStudentsAction, addStudentAction, updateStudentAction, deleteStudentsAction, assignSurveyToStudentAction, syncClassStudentsWithSurveysAction } from "./actions"
import { sortVietnameseStudents } from "@/lib/vietnameseSort"

export function AdminClassStudentsClient({ classId, initialStudents, activeSurveys = [] }: any) {
  const [students, setStudents] = useState(initialStudents)
  const [uploading, setUploading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [syncingSurveys, setSyncingSurveys] = useState(false)
  const [isAlphaSorted, setIsAlphaSorted] = useState(true)
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedSurveyId, setSelectedSurveyId] = useState("")
  const [assigningStudent, setAssigningStudent] = useState<any>(null)
  const [formData, setFormData] = useState({ studentCode: "", vnEduCode: "", studentName: "", gender: "Nam", dateOfBirth: "", status: "ACTIVE" })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayStudents = useMemo(() => {
    if (!students || students.length === 0) return []
    return isAlphaSorted ? sortVietnameseStudents(students) : students
  }, [students, isAlphaSorted])

  const handleSyncSurveys = async () => {
    if (!confirm("Thực hiện đồng bộ tất cả học sinh trong lớp với Danh sách khảo sát đang mở?")) return
    setSyncingSurveys(true)
    const res = await syncClassStudentsWithSurveysAction(classId)
    if (res.success) {
      alert(res.message)
      window.location.reload()
    } else {
      alert("Lỗi đồng bộ: " + res.error)
    }
    setSyncingSurveys(false)
  }

  const handleDownloadTemplate = () => {
    const ws = xlsx.utils.json_to_sheet([
      { "STT": 1, "Mã học sinh *": "HS-10A1-001", "Mã VNEdu": "2500839484", "Họ và Tên *": "Nguyễn Văn A", "Giới tính": "Nam", "Ngày sinh": "20/05/2010" },
      { "STT": 2, "Mã học sinh *": "HS-10A1-002", "Mã VNEdu": "2500839485", "Họ và Tên *": "Trần Thị B", "Giới tính": "Nữ", "Ngày sinh": "15/12/2010" }
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
              const parts = String(rawDate).split(/[\/\-]/);
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

          const studentCode = String(findVal(row, ["mã học sinh", "mã hs", "ma hs", "studentcode"]) || "").trim() || ("HS-" + Date.now() + "-" + Math.floor(Math.random()*1000));
          const vnEduCode = String(findVal(row, ["mã vnedu", "mã vnedu", "vnedu", "vneducode", "ma vnedu"]) || "").trim();
          const studentName = String(findVal(row, ["họ và tên", "họ tên", "ho ten", "studentname", "full name"]) || "").trim() || "Unnamed";
          const gender = String(findVal(row, ["giới tính", "gioi tinh", "gender"]) || "Nam").trim();

          return {
            studentCode,
            vnEduCode,
            studentName,
            gender,
            dateOfBirth: parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : null
          }
        })
        const res = await importStudentsAction(classId, payload)
        if (res.success) {
          let msg = "[Version 2.1] Đã import thành công " + res.count + " học sinh! Bỏ qua: " + (res.skipped || 0);
          if (res.warnings && res.warnings.length > 0) {
            msg += "\n\nCảnh báo trùng lặp:\n" + res.warnings.join("\n");
          }
          alert(msg);
          window.location.reload();
        } else {
          alert("Lỗi server: " + res.error);
        }
      } catch(e) {
        console.error(e);
        alert("Lỗi khi đọc file Excel.");
      }
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    reader.readAsArrayBuffer(file);
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(displayStudents.map((s: any) => s.id))
    else setSelectedIds([])
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) setSelectedIds([...selectedIds, id])
    else setSelectedIds(selectedIds.filter(x => x !== id))
  }

  const handleDeleteMany = async () => {
    if (!confirm("Xóa " + selectedIds.length + " học sinh đã chọn?")) return
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
      window.location.reload()
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
      vnEduCode: s.vnEduCode !== "—" ? s.vnEduCode || "" : "",
      studentName: s.studentName,
      gender: s.gender || "Nam",
      dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().split("T")[0] : "", status: s.status || "ACTIVE"
    })
    setShowAddModal(true)
  }

  const openAdd = () => {
    setEditingStudent(null)
    setFormData({ studentCode: "", vnEduCode: "", studentName: "", gender: "Nam", dateOfBirth: "" })
    setShowAddModal(true)
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-emerald-100">
      {/* Modal for Assign Survey */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between text-xs font-semibold p-4 border-b border-emerald-100 bg-emerald-50">
               <h3 className="font-bold text-emerald-800">Gán Khảo Sát cho {assigningStudent?.studentName}</h3>
               <button onClick={() => setShowAssignModal(false)} className="p-1 hover:bg-emerald-200 rounded-full transition-colors"><X className="w-5 h-5 text-emerald-500" /></button>
            </div>
            <div className="p-6 space-y-4">
               <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1">Chọn đợt khảo sát *</label>
                 <select value={selectedSurveyId} onChange={e => setSelectedSurveyId(e.target.value)} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 transition-all">
                   <option value="">-- Chọn đợt khảo sát --</option>
                   {activeSurveys.map((s: any) => (
                     <option key={s.id} value={s.id}>{s.name} (Hết hạn: {new Date(s.endDate).toLocaleDateString("vi-VN")})</option>
                   ))}
                 </select>
                 {activeSurveys.length === 0 && <p className="text-xs text-amber-600 mt-1">Không có đợt khảo sát nào đang hoạt động.</p>}
               </div>
               <div className="pt-4 flex gap-3">
                 <button onClick={() => setShowAssignModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all">Hủy</button>
                 <button onClick={handleAssign} disabled={submitting || !selectedSurveyId} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 text-xs">
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
            <div className="flex items-center justify-between text-xs font-semibold p-4 border-b border-slate-100 bg-slate-50">
               <h3 className="font-bold text-slate-800">{editingStudent ? "Sửa Thông Tin" : "Thêm Học Sinh Mới"}</h3>
               <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-1">Mã học sinh *</label>
                   <input required value={formData.studentCode} onChange={e => setFormData({ ...formData, studentCode: e.target.value })} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                 </div>
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-1">Mã VNEdu</label>
                   <input value={formData.vnEduCode} onChange={e => setFormData({ ...formData, vnEduCode: e.target.value })} placeholder="Ví dụ: 2500839484" className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                 </div>
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
                 <button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 text-xs">{submitting ? "Đang xử lý..." : "Lưu Lại"}</button>
               </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center mb-6 border-b border-slate-100 pb-4 gap-4">
        <div className="flex items-center gap-4">
           <h2 className="text-lg font-bold text-slate-800">Danh sách học sinh ({displayStudents.length})</h2>
           {selectedIds.length > 0 && (
             <button onClick={handleDeleteMany} disabled={submitting} className="flex items-center gap-2 text-red-600 hover:bg-red-100 font-semibold text-sm transition-colors text-xs">
                <Trash2 className="w-4 h-4" /> Xóa {selectedIds.length} HS đã chọn
             </button>
           )}
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={() => setIsAlphaSorted(!isAlphaSorted)}
            className={`flex items-center px-3.5 py-2 rounded-md text-xs font-bold transition-all border ${
              isAlphaSorted 
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm" 
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
            title="Sắp xếp học sinh theo Tên A-Z tiếng Việt"
          >
            <ArrowUpDown className="w-4 h-4 mr-1.5 text-emerald-600" />
            {isAlphaSorted ? "Sắp xếp Alpha: Bật" : "Sắp xếp Alpha: Tắt"}
          </button>
          <button
            onClick={handleSyncSurveys}
            disabled={syncingSurveys}
            className="flex items-center bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-3.5 rounded-md transition-colors shadow-sm disabled:opacity-50 text-xs"
            title="Đồng bộ danh sách học sinh với các đợt khảo sát đang mở"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${syncingSurveys ? "animate-spin" : ""}`} />
            {syncingSurveys ? "Đang đồng bộ..." : "Đồng bộ DS Khảo sát"}
          </button>
          <button onClick={openAdd} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3.5 rounded-md transition-colors shadow-sm text-xs">
            <Plus className="w-4 h-4 mr-1.5" /> Thêm Học Sinh
          </button>
          <Link href="/admin/ktdbcl/import-mapping" className="flex items-center bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold py-2 px-3 rounded-md transition-colors border border-purple-200 text-xs" title="Chuyển tới trang Quản lý Ánh xạ Mã Học sinh - Mã vnEdu">
            <FileCode className="w-4 h-4 mr-1.5" /> Import Ánh Xạ
          </Link>
          <button onClick={handleDownloadTemplate} className="flex items-center text-blue-600 hover:text-blue-700 hover:bg-blue-100 font-semibold py-2 px-3 rounded-md transition-colors text-xs">
            <Download className="w-4 h-4 mr-1.5" /> Tải File Mẫu
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3.5 rounded-md transition-colors shadow-sm disabled:opacity-50 text-xs">
            <Upload className="w-4 h-4 mr-1.5" /> {uploading ? "Đang tải..." : "Import Học Sinh"}
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap border-collapse">
          <thead className="uppercase text-[10px] tracking-wider text-slate-500 font-bold">
            <tr>
              <th className="px-4 py-3 border-r border-slate-200 w-10 text-center">
                <input type="checkbox" className="w-4 h-4 rounded" checked={displayStudents.length > 0 && selectedIds.length === displayStudents.length} onChange={handleSelectAll} />
              </th>
              <th className="px-6 py-4 border-r border-slate-200 w-16 text-center">STT</th>
              <th className="px-6 py-4 border-r border-slate-200">Mã HS</th>
              <th className="px-6 py-4 border-r border-slate-200">Mã VNEdu</th>
              <th className="px-6 py-4 border-r border-slate-200 cursor-pointer select-none group" onClick={() => setIsAlphaSorted(!isAlphaSorted)}> 
                <div className="flex items-center gap-1.5">
                  <span>Họ và Tên</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${isAlphaSorted ? "text-emerald-600 font-bold" : "text-slate-400 group-hover:text-slate-600"}`} />
                </div>
              </th>
              <th className="px-6 py-4 border-r border-slate-200">Giới tính</th>
              <th className="px-6 py-4 border-r border-slate-200">Ngày sinh</th>
              <th className="px-6 py-4 border-r border-slate-200 text-center">Đối tượng</th>
              <th className="px-6 py-4 border-r border-slate-200">Trạng thái</th>
              <th className="p-2 text-center border border-slate-200">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {displayStudents.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-10 text-slate-400 font-medium text-xs">
                  <UserCircle2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  Chưa có học sinh nào. Hãy import hoặc thêm mới.
                </td>
              </tr>
            ) : (
              displayStudents.map((student: any, idx: number) => {
                const isSurvey = student.enrollmentType === "KS" || student.isSurveyStudent || (student.studentTransfers && student.studentTransfers.some((t: any) => t.type === 'IN'));
                const enrollmentLabel = isSurvey ? "KS" : (student.enrollmentType || "Trực tiếp");

                return (
                <tr 
                  key={student.id} 
                  className={`border-b border-l border-r border-slate-200 transition-colors ${
                    selectedIds.includes(student.id) 
                      ? "bg-indigo-50/70" 
                      : isSurvey 
                        ? "bg-emerald-50/70 hover:bg-emerald-100/70 font-medium" 
                        : "hover:bg-slate-50"
                  }`}
                >
                  <td className="px-4 py-3 border-r border-slate-200 text-center">
                    <input type="checkbox" className="w-4 h-4 rounded" checked={selectedIds.includes(student.id)} onChange={(e) => handleSelectRow(student.id, e.target.checked)} />
                  </td>
                  <td className="px-6 py-4 text-slate-900 font-bold border-r border-slate-200 text-center">{idx + 1}</td>
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs border-r border-slate-200">{student.studentCode}</td>
                  <td className="px-6 py-4 border-r border-slate-200">
                    {student.vnEduCode ? (
                      <span className="text-slate-700 font-mono text-xs font-semibold">{student.vnEduCode}</span>
                    ) : (
                      <Link 
                        href="/admin/ktdbcl/import-mapping" 
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full transition-colors"
                        title="Chưa có ánh xạ Mã vnEdu trên hệ thống. Nhấp để chuyển sang trang Import Ánh xạ Mã"
                      >
                        <span>Chưa ánh xạ</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    )}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800 border-r border-slate-200 flex items-center justify-between">
                    <div className="flex items-center">
                      <UserCircle2 className="w-5 h-5 text-slate-300 mr-2" />
                      <span>{student.studentName}</span>
                    </div>
                    {student.surveyForms && student.surveyForms.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1" title="Đã đồng bộ bài khảo sát">
                        <Layers className="w-3 h-3 text-teal-500" />
                        {student.surveyForms.length} KS
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600 border-r border-slate-200">
                    {student.gender || "Chưa cập nhật"}
                  </td>
                  <td className="px-6 py-4 text-slate-600 border-r border-slate-200">
                    {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "Chưa cập nhật"}
                  </td>
                  <td className="px-6 py-4 border-r border-slate-200 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                      isSurvey 
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}>
                      {enrollmentLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 border-r border-slate-200">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${(!student.status || student.status === "ACTIVE") ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                      {(!student.status || student.status === "ACTIVE") ? "HOẠT ĐỘNG" : "BỊ KHÓA"}
                    </span>
                  </td>
                  <td className="p-2 text-center border border-slate-200">
                     <div className="flex justify-center gap-1">
                        <button onClick={() => { setAssigningStudent(student); setSelectedSurveyId(""); setShowAssignModal(true); }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors text-xs" title="Gán khảo sát">
                          <Send className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(student)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-xs" title="Sửa">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteOne(student.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs" title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}