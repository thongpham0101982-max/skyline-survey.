"use client"
import { useState } from "react"
import { Plus, Edit2, Trash2, CheckCircle2, X, CalendarDays, Filter } from "lucide-react"
import { createSubject, updateSubject, deleteSubject } from "./actions"

export function SubjectsClient({ initialSubjects, years, defaultYearId }: any) {
  const [subjects, setSubjects] = useState(initialSubjects || []);
  const safeYears = years || [];
  const [editingId, setEditingId] = useState("");
  const [selectedYearId, setSelectedYearId] = useState(defaultYearId || (safeYears[0]?.id || ""));
  const [filterLevel, setFilterLevel] = useState("ALL_LEVELS"); // Filter Level
  const [filterProgram, setFilterProgram] = useState("ALL_PROGRAMS"); // Filter System
  const [formData, setFormData] = useState({ code: "", name: "", levels: [] as string[], desc: "", quotaPrimary: 0, quotaMiddle: 0, quotaHigh: 0, quotaG1:0, quotaG2:0, quotaG3:0, quotaG4:0, quotaG5:0, quotaG6:0, quotaG7:0, quotaG8:0, quotaG9:0, quotaG10:0, quotaG11:0, quotaG12:0, studyPrograms: [] as string[] });
  const [loading, setLoading] = useState(false);

  const getQuota = (s: any) => {
    return s.quotas?.find((q: any) => q.academicYearId === selectedYearId) || { quotaPrimary: 0, quotaMiddle: 0, quotaHigh: 0, quotaG1:0, quotaG2:0, quotaG3:0, quotaG4:0, quotaG5:0, quotaG6:0, quotaG7:0, quotaG8:0, quotaG9:0, quotaG10:0, quotaG11:0, quotaG12:0 };
  }

  const startEdit = (s?: any) => {
    if (s) {
      setEditingId(s.id);
      const q = getQuota(s);
      setFormData({ code: s.subjectCode, name: s.subjectName, levels: s.level && s.level !== "ALL" ? s.level.split(', ') : [], desc: s.description || "", quotaPrimary: q.quotaPrimary||0, quotaMiddle: q.quotaMiddle||0, quotaHigh: q.quotaHigh||0, quotaG1: q.quotaG1||0, quotaG2: q.quotaG2||0, quotaG3: q.quotaG3||0, quotaG4: q.quotaG4||0, quotaG5: q.quotaG5||0, quotaG6: q.quotaG6||0, quotaG7: q.quotaG7||0, quotaG8: q.quotaG8||0, quotaG9: q.quotaG9||0, quotaG10: q.quotaG10||0, quotaG11: q.quotaG11||0, quotaG12: q.quotaG12||0, studyPrograms: s.studyPrograms ? s.studyPrograms.split(', ') : [] });
    } else {
      setEditingId("new");
      setFormData({ code: "", name: "", levels: filterLevel !== "ALL_LEVELS" ? [filterLevel] : [], desc: "", quota: 0, studyPrograms: [] });
    }
  }

  const cancelEdit = () => {
    setEditingId("");
    setFormData({ code: "", name: "", levels: [], desc: "", quota: 0, studyPrograms: [] });
  }

  const handleSave = async () => {
    setLoading(true);
    let res;
    const quotaData = { academicYearId: selectedYearId, quotaPrimary: parseInt(formData.quotaPrimary as any)||0, quotaMiddle: parseInt(formData.quotaMiddle as any)||0, quotaHigh: parseInt(formData.quotaHigh as any)||0, quotaG1: parseInt(formData.quotaG1 as any)||0, quotaG2: parseInt(formData.quotaG2 as any)||0, quotaG3: parseInt(formData.quotaG3 as any)||0, quotaG4: parseInt(formData.quotaG4 as any)||0, quotaG5: parseInt(formData.quotaG5 as any)||0, quotaG6: parseInt(formData.quotaG6 as any)||0, quotaG7: parseInt(formData.quotaG7 as any)||0, quotaG8: parseInt(formData.quotaG8 as any)||0, quotaG9: parseInt(formData.quotaG9 as any)||0, quotaG10: parseInt(formData.quotaG10 as any)||0, quotaG11: parseInt(formData.quotaG11 as any)||0, quotaG12: parseInt(formData.quotaG12 as any)||0 };
    
    if (editingId === "new") {
      res = await createSubject(formData.code, formData.name, formData.levels.length > 0 ? formData.levels.join(', ') : "ALL", formData.desc, quotaData, formData.studyPrograms.join(', '));
    } else {
      res = await updateSubject(editingId, formData.code, formData.name, formData.levels.length > 0 ? formData.levels.join(', ') : "ALL", formData.desc, quotaData, formData.studyPrograms.join(', '));
    }
    
    if (res.success) {
      window.location.reload(); 
    } else {
      alert("Lỗi: " + res.error);
    }
    setLoading(false);
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa môn học này?")) return;
    const res = await deleteSubject(id);
    if (res.success) setSubjects(subjects.filter((s:any) => s.id !== id));
    else alert("Lỗi: " + res.error);
  }

  const levelLabels: any = { "ALL": "Tất cả", "PRIMARY": "Tiểu học", "MIDDLE": "THCS", "HIGH": "THPT" };

  const displayedSubjects = subjects.filter((s:any) => (filterLevel === "ALL_LEVELS" || (s.level && s.level.includes(filterLevel))) && (filterProgram === "ALL_PROGRAMS" || (s.studyPrograms && s.studyPrograms.includes(filterProgram))));

    const totalPrimary = displayedSubjects.reduce((acc: number, s: any) => acc + (getQuota(s)?.quotaPrimary || 0), 0);
  const totalMiddle = displayedSubjects.reduce((acc: number, s: any) => acc + (getQuota(s)?.quotaMiddle || 0), 0);
  const totalHigh = displayedSubjects.reduce((acc: number, s: any) => acc + (getQuota(s)?.quotaHigh || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Year Filter */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-bold text-slate-700">Qui định số tiết cho Năm học:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {safeYears.map((y: any) => (
                <button key={y.id} onClick={() => setSelectedYearId(y.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${selectedYearId === y.id ? "bg-[#00A99D] text-white border-[#00A99D] shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                  {y.name}{y.status === "ACTIVE" && <span className="ml-1 opacity-75 text-[10px]">Active</span>}
                </button>
              ))}
            </div>
          </div>
        </div>


        {/* Program Filter */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-bold text-slate-700">Lọc theo Hệ học:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {["ALL_PROGRAMS", "Hệ S", "Hệ Song Bằng"].map((prog) => (
                <button key={prog} onClick={() => setFilterProgram(prog)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${filterProgram === prog ? "bg-[#00A99D] text-white border-[#00A99D] shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                  {prog === "ALL_PROGRAMS" ? "Tất cả Hệ" : prog}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Level Filter */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-bold text-slate-700">Lọc theo Bậc học:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {["ALL_LEVELS", "PRIMARY", "MIDDLE", "HIGH"].map((lvl) => (
                <button key={lvl} onClick={() => setFilterLevel(lvl)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${filterLevel === lvl ? "bg-[#00A99D] text-white border-[#00A99D] shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                  {lvl === "ALL_LEVELS" ? "Tất cả các bậc" : levelLabels[lvl]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200/80 animate-in fade-in slide-in-from-bottom-4 duration-500 border-2 border-indigo-100">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="font-bold text-slate-700">Danh mục môn học ({displayedSubjects.length})</h3>
            <p className="text-sm text-[#00A99D] font-medium mt-1">Tổng số tiết trên tuần: Quy định là 40 Tiết</p>
          </div>
          <button onClick={() => startEdit()} className="px-4 py-2 bg-[#00A99D] text-white rounded-lg text-sm font-semibold flex items-center hover:bg-[#009085] shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Thêm Môn học
          </button>
        </div>

        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left whitespace-nowrap border-collapse">
            <thead className="text-xs font-semibold">
              <tr>
                <th colSpan={4} className="px-6 py-3 font-bold text-slate-600 text-sm border-r border-slate-200 text-center">Thông tin Môn Học</th>
                <th colSpan={5} className="font-bold text-slate-600 text-sm text-center text-blue-700 text-xs font-semibold border-r border-slate-200">Tiểu học</th>
   <th colSpan={4} className="font-bold text-slate-600 text-sm text-center text-emerald-700 text-xs font-semibold border-r border-slate-200">THCS</th>
   <th colSpan={3} className="font-bold text-slate-600 text-sm text-center text-amber-700 text-xs font-semibold border-r border-slate-200">THPT</th>
                <th rowSpan={2} className="p-2 p-2 font-bold text-slate-600 text-sm text-right border border-slate-200">Thao tác</th>
              </tr>
              <tr className="hover:bg-slate-50/50 text-xs font-semibold">
                <th className="p-2 p-2 font-semibold text-slate-600 text-xs border border-slate-200">Mã môn</th>
                <th className="px-4 py-2 font-semibold text-slate-600 text-xs border-r border-slate-200">Tên môn</th>
                <th className="px-4 py-2 font-semibold text-slate-600 text-xs border-r border-slate-200">Hệ học</th>
                <th className="px-4 py-2 font-semibold text-slate-600 text-xs border-r border-slate-200">Ghi chúú</th>
                <th className="font-semibold text-blue-800 text-[11px] text-center px-1">K1</th>
   <th className="font-semibold text-blue-800 text-[11px] text-center px-1">K2</th>
   <th className="font-semibold text-blue-800 text-[11px] text-center px-1">K3</th>
   <th className="font-semibold text-blue-800 text-[11px] text-center px-1">K4</th>
   <th className="font-semibold text-blue-800 text-[11px] text-center px-1 border-r border-slate-200">K5</th>
   <th className="font-semibold text-emerald-800 text-[11px] text-center px-1">K6</th>
   <th className="font-semibold text-emerald-800 text-[11px] text-center px-1">K7</th>
   <th className="font-semibold text-emerald-800 text-[11px] text-center px-1">K8</th>
   <th className="font-semibold text-emerald-800 text-[11px] text-center px-1 border-r border-slate-200">K9</th>
   <th className="font-semibold text-amber-800 text-[11px] text-center px-1">K10</th>
   <th className="font-semibold text-amber-800 text-[11px] text-center px-1">K11</th>
   <th className="font-semibold text-amber-800 text-[11px] text-center px-1 border-r border-slate-200">K12</th>
              </tr>
            </thead>
            <tbody>
              {editingId === "new" && (
                <tr className="text-xs font-semibold">
                  <td className="p-2 p-2 border border-slate-200"><input value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} className="w-24 p-1.5 rounded border text-sm outline-none" placeholder="VD: TOAN"/></td>
                                    <td className="px-4 py-3 border-r border-slate-200"><input value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-40 p-1.5 rounded border text-sm outline-none" placeholder="VD: Toán học"/></td>
                  <td className="px-4 py-3 border-r border-slate-200 bg-white">
                    <div className="flex flex-col gap-1 text-xs">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={formData.studyPrograms.includes("Hệ S")} onChange={(e) => {
                          const newPrograms = e.target.checked ? [...formData.studyPrograms, "Hệ S"] : formData.studyPrograms.filter((p: string) => p !== "Hệ S");
                          setFormData({...formData, studyPrograms: newPrograms});
                        }} /> Hệ S
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={formData.studyPrograms.includes("Hệ Song Bằng")} onChange={(e) => {
                          const newPrograms = e.target.checked ? [...formData.studyPrograms, "Hệ Song Bằng"] : formData.studyPrograms.filter((p: string) => p !== "Hệ Song Bằng");
                          setFormData({...formData, studyPrograms: newPrograms});
                        }} /> Hệ Song Bằng
                      </label>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-r border-slate-200"><input value={formData.desc} onChange={e=>setFormData({...formData, desc: e.target.value})} className="w-40 p-1.5 rounded border text-sm outline-none" placeholder="Ghi chúú..."/></td>
                  <td colSpan={12} className="px-4 py-3 text-center border-r border-slate-200 text-slate-500 italic text-xs">Vui lòng lưu để nhập cấu hình số tiết</td>
                  <td className="p-2 p-2 text-right border border-slate-200">
                    <button onClick={handleSave} disabled={loading} className="p-2 text-green-600 hover:bg-green-100 rounded-lg mr-2"><CheckCircle2 className="w-5 h-5"/></button>
                    <button onClick={cancelEdit} className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg"><X className="w-5 h-5"/></button>
                  </td>
                </tr>
              )}
              {displayedSubjects.map((s:any) => {
                const q = getQuota(s);
                return editingId === s.id ? (
                  <tr key={s.id} className="text-xs font-semibold">
                    <td className="p-2 p-2 border border-slate-200"><input value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} className="w-24 p-1.5 rounded border text-sm outline-none"/></td>
                                        <td className="px-4 py-3 border-r border-slate-200"><input value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-40 p-1.5 rounded border text-sm outline-none"/></td>
                    <td className="px-4 py-3 border-r border-slate-200 bg-white">
                      <div className="flex flex-col gap-1 text-xs">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={formData.studyPrograms.includes("Hệ S")} onChange={(e) => {
                            const newPrograms = e.target.checked ? [...formData.studyPrograms, "Hệ S"] : formData.studyPrograms.filter((p: string) => p !== "Hệ S");
                            setFormData({...formData, studyPrograms: newPrograms});
                          }} /> Hệ S
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={formData.studyPrograms.includes("Hệ Song Bằng")} onChange={(e) => {
                            const newPrograms = e.target.checked ? [...formData.studyPrograms, "Hệ Song Bằng"] : formData.studyPrograms.filter((p: string) => p !== "Hệ Song Bằng");
                            setFormData({...formData, studyPrograms: newPrograms});
                          }} /> Hệ Song Bằng
                        </label>
                      </div>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200"><input value={formData.desc} onChange={e=>setFormData({...formData, desc: e.target.value})} className="w-40 p-1.5 rounded border text-sm outline-none"/></td>
                    <td className="text-center text-xs font-semibold"><input type="number" min={0} value={formData.quotaPrimary} onChange={e=>setFormData({...formData, quotaPrimary: parseInt(e.target.value)||0})} className="w-16 p-1 rounded border text-center text-sm font-bold text-blue-700 outline-none" /></td>
                    <td className="text-center text-xs font-semibold"><input type="number" min={0} value={formData.quotaMiddle} onChange={e=>setFormData({...formData, quotaMiddle: parseInt(e.target.value)||0})} className="w-16 p-1 rounded border text-center text-sm font-bold text-emerald-700 outline-none" /></td>
                    <td className="text-center text-xs font-semibold"><input type="number" min={0} value={formData.quotaHigh} onChange={e=>setFormData({...formData, quotaHigh: parseInt(e.target.value)||0})} className="w-16 p-1 rounded border text-center text-sm font-bold text-amber-700 outline-none" /></td>
                    <td className="p-2 p-2 text-right border border-slate-200">
                      <button onClick={handleSave} disabled={loading} className="p-2 text-green-600 hover:bg-green-100 rounded-lg mr-2"><CheckCircle2 className="w-5 h-5"/></button>
                      <button onClick={cancelEdit} className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg"><X className="w-5 h-5"/></button>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id} className="hover:bg-slate-50/50 text-xs font-semibold">
                    <td className="p-2 p-2 font-bold text-slate-700 text-sm border border-slate-200">{s.subjectCode}</td>
                                        <td className="px-4 py-3 font-bold text-indigo-700 text-sm border-r border-slate-200">{s.subjectName}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs border-r border-slate-200 min-w-[120px]">
                      <div className="flex flex-wrap gap-1">
                        {s.studyPrograms ? s.studyPrograms.split(', ').filter((p: string) => filterProgram === "ALL_PROGRAMS" || p === filterProgram).map((p: string) => (
                          <span key={p} className="inline-block text-indigo-700 whitespace-nowrap font-medium text-xs font-semibold">{p}</span>
                        )) : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-sm border-r border-slate-200 max-w-[150px] truncate">{s.description || '-'}</td>
                    <td className="text-center font-bold text-blue-700 text-[11px] font-semibold">{q.quotaG1 > 0 ? q.quotaG1 : '-'}</td>
   <td className="text-center font-bold text-blue-700 text-[11px] font-semibold">{q.quotaG2 > 0 ? q.quotaG2 : '-'}</td>
   <td className="text-center font-bold text-blue-700 text-[11px] font-semibold">{q.quotaG3 > 0 ? q.quotaG3 : '-'}</td>
   <td className="text-center font-bold text-blue-700 text-[11px] font-semibold">{q.quotaG4 > 0 ? q.quotaG4 : '-'}</td>
   <td className="text-center font-bold text-blue-700 text-[11px] font-semibold border-r border-slate-200">{q.quotaG5 > 0 ? q.quotaG5 : '-'}</td>
   <td className="text-center font-bold text-emerald-700 text-[11px] font-semibold">{q.quotaG6 > 0 ? q.quotaG6 : '-'}</td>
   <td className="text-center font-bold text-emerald-700 text-[11px] font-semibold">{q.quotaG7 > 0 ? q.quotaG7 : '-'}</td>
   <td className="text-center font-bold text-emerald-700 text-[11px] font-semibold">{q.quotaG8 > 0 ? q.quotaG8 : '-'}</td>
   <td className="text-center font-bold text-emerald-700 text-[11px] font-semibold border-r border-slate-200">{q.quotaG9 > 0 ? q.quotaG9 : '-'}</td>
   <td className="text-center font-bold text-amber-700 text-[11px] font-semibold">{q.quotaG10 > 0 ? q.quotaG10 : '-'}</td>
   <td className="text-center font-bold text-amber-700 text-[11px] font-semibold">{q.quotaG11 > 0 ? q.quotaG11 : '-'}</td>
   <td className="text-center font-bold text-amber-700 text-[11px] font-semibold border-r border-slate-200">{q.quotaG12 > 0 ? q.quotaG12 : '-'}</td>
                    <td className="p-2 p-2 text-right border border-slate-200">
                      <button onClick={() => startEdit(s)} className="p-2 text-slate-400 hover:text-[#00A99D] rounded-lg"><Edit2 className="w-4 h-4"/></button>
                      <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 className="w-4 h-4"/></button>
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
