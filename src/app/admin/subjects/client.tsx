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
  const [formData, setFormData] = useState({ code: "", name: "", levels: [] as string[], desc: "", quotaPrimary: 0, quotaMiddle: 0, quotaHigh: 0, studyPrograms: [] as string[] });
  const [loading, setLoading] = useState(false);

  const getQuota = (s: any) => {
    return s.quotas?.find((q: any) => q.academicYearId === selectedYearId) || { quotaPrimary: 0, quotaMiddle: 0, quotaHigh: 0 };
  }

  const startEdit = (s?: any) => {
    if (s) {
      setEditingId(s.id);
      const q = getQuota(s);
      setFormData({ code: s.subjectCode, name: s.subjectName, levels: s.level && s.level !== "ALL" ? s.level.split(', ') : [], desc: s.description || "", quotaPrimary: q.quotaPrimary||0, quotaMiddle: q.quotaMiddle||0, quotaHigh: q.quotaHigh||0, studyPrograms: s.studyPrograms ? s.studyPrograms.split(', ') : [] });
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
    const quotaData = { academicYearId: selectedYearId, quotaPrimary: parseInt(formData.quotaPrimary as any)||0, quotaMiddle: parseInt(formData.quotaMiddle as any)||0, quotaHigh: parseInt(formData.quotaHigh as any)||0 };
    
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
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${selectedYearId === y.id ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
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
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${filterProgram === prog ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
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
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${filterLevel === lvl ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                  {lvl === "ALL_LEVELS" ? "Tất cả các bậc" : levelLabels[lvl]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="font-bold text-slate-700">Danh mục môn học ({displayedSubjects.length})</h3>
            <p className="text-sm text-indigo-600 font-medium mt-1">Tổng số tiết trên tuần: Quy định là 40 Tiết</p>
          </div>
          <button onClick={() => startEdit()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center hover:bg-indigo-700 shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Thêm Môn học
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th colSpan={4} className="px-6 py-3 font-bold text-slate-600 text-sm border-r border-slate-200 text-center">Thông tin Môn Học</th>
                <th colSpan={3} className="px-6 py-3 font-bold text-slate-600 text-sm border-r border-slate-200 text-center text-indigo-700 bg-indigo-50/50">Số tiết (Theo Bậc) / tuần</th>
                <th rowSpan={2} className="px-6 py-4 font-bold text-slate-600 text-sm text-right">Thao tác</th>
              </tr>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-2 font-semibold text-slate-600 text-xs">Mã môn</th>
                <th className="px-4 py-2 font-semibold text-slate-600 text-xs border-r border-slate-200">Tên môn</th>
                <th className="px-4 py-2 font-semibold text-slate-600 text-xs border-r border-slate-200">Hệ học</th>
                <th className="px-4 py-2 font-semibold text-slate-600 text-xs border-r border-slate-200">Ghi chúú</th>
                <th className="px-4 py-2 font-semibold text-blue-800 text-xs text-center border-r border-slate-200 bg-blue-50/50">Tiểu học</th>
                <th className="px-4 py-2 font-semibold text-emerald-800 text-xs text-center border-r border-slate-200 bg-emerald-50/50">THCS</th>
                <th className="px-4 py-2 font-semibold text-amber-800 text-xs text-center border-r border-slate-200 bg-amber-50/50">THPT</th>
              </tr>
            </thead>
            <tbody>
              {editingId === "new" && (
                <tr className="bg-indigo-50/50">
                  <td className="px-4 py-3"><input value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} className="w-24 p-1.5 rounded border text-sm outline-none" placeholder="VD: TOAN"/></td>
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
                  <td className="px-4 py-3 border-r border-slate-200">
                    <div className="flex flex-col gap-1 text-xs">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={formData.levels.includes("PRIMARY")} onChange={(e) => {
                          setFormData({...formData, levels: e.target.checked ? [...formData.levels, "PRIMARY"] : formData.levels.filter(l => l !== "PRIMARY")});
                        }} /> Tiểu học
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={formData.levels.includes("MIDDLE")} onChange={(e) => {
                          setFormData({...formData, levels: e.target.checked ? [...formData.levels, "MIDDLE"] : formData.levels.filter(l => l !== "MIDDLE")});
                        }} /> THCS
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={formData.levels.includes("HIGH")} onChange={(e) => {
                          setFormData({...formData, levels: e.target.checked ? [...formData.levels, "HIGH"] : formData.levels.filter(l => l !== "HIGH")});
                        }} /> THPT
                      </label>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center border-r border-slate-200 bg-white"><input type="number" min={0} value={formData.quota} onChange={e=>setFormData({...formData, quota: parseInt(e.target.value)||0})} className="w-16 p-1 rounded border text-center text-sm font-bold text-indigo-700 outline-none" /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={handleSave} disabled={loading} className="p-2 text-green-600 hover:bg-green-100 rounded-lg mr-2"><CheckCircle2 className="w-5 h-5"/></button>
                    <button onClick={cancelEdit} className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg"><X className="w-5 h-5"/></button>
                  </td>
                </tr>
              )}
              {displayedSubjects.map((s:any) => {
                const q = getQuota(s);
                return editingId === s.id ? (
                  <tr key={s.id} className="bg-indigo-50/50 border-b border-indigo-100">
                    <td className="px-4 py-3"><input value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} className="w-24 p-1.5 rounded border text-sm outline-none"/></td>
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
                    <td className="px-4 py-3 text-center border-r border-slate-200 bg-blue-50/50"><input type="number" min={0} value={formData.quotaPrimary} onChange={e=>setFormData({...formData, quotaPrimary: parseInt(e.target.value)||0})} className="w-16 p-1 rounded border text-center text-sm font-bold text-blue-700 outline-none" /></td>
                    <td className="px-4 py-3 text-center border-r border-slate-200 bg-emerald-50/50"><input type="number" min={0} value={formData.quotaMiddle} onChange={e=>setFormData({...formData, quotaMiddle: parseInt(e.target.value)||0})} className="w-16 p-1 rounded border text-center text-sm font-bold text-emerald-700 outline-none" /></td>
                    <td className="px-4 py-3 text-center border-r border-slate-200 bg-amber-50/50"><input type="number" min={0} value={formData.quotaHigh} onChange={e=>setFormData({...formData, quotaHigh: parseInt(e.target.value)||0})} className="w-16 p-1 rounded border text-center text-sm font-bold text-amber-700 outline-none" /></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={handleSave} disabled={loading} className="p-2 text-green-600 hover:bg-green-100 rounded-lg mr-2"><CheckCircle2 className="w-5 h-5"/></button>
                      <button onClick={cancelEdit} className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg"><X className="w-5 h-5"/></button>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-700 text-sm">{s.subjectCode}</td>
                                        <td className="px-4 py-3 font-bold text-indigo-700 text-sm border-r border-slate-200">{s.subjectName}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs border-r border-slate-200 min-w-[120px]">
                      <div className="flex flex-wrap gap-1">
                        {s.studyPrograms ? s.studyPrograms.split(', ').filter((p: string) => filterProgram === "ALL_PROGRAMS" || p === filterProgram).map((p: string) => (
                          <span key={p} className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-100 rounded px-1.5 py-0.5 whitespace-nowrap font-medium">{p}</span>
                        )) : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-sm border-r border-slate-200 max-w-[150px] truncate">{s.description || '-'}</td>
                    <td className="px-4 py-3 text-center font-bold text-blue-700 text-sm border-r border-slate-200 bg-blue-50/30">{q.quotaPrimary > 0 ? q.quotaPrimary + ' tiết' : '-'}</td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-700 text-sm border-r border-slate-200 bg-emerald-50/30">{q.quotaMiddle > 0 ? q.quotaMiddle + ' tiết' : '-'}</td>
                    <td className="px-4 py-3 text-center font-bold text-amber-700 text-sm border-r border-slate-200 bg-amber-50/30">{q.quotaHigh > 0 ? q.quotaHigh + ' tiết' : '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => startEdit(s)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                      <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td colSpan={4} className="px-6 py-4 font-bold text-slate-700 text-sm text-right border-r border-slate-200">
                  Tổng số tiết {filterProgram !== "ALL_PROGRAMS" ? `theo ${filterProgram}` : "trên hệ thống"}:
                </td>
                <td className="px-2 py-3 text-center border-r border-slate-200">
                  <span className={`px-2 py-1 rounded block text-xs font-bold shadow-sm ${totalPrimary > 40 ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}>
                    {totalPrimary} / 40
                  </span>
                </td>
                <td className="px-2 py-3 text-center border-r border-slate-200">
                  <span className={`px-2 py-1 rounded block text-xs font-bold shadow-sm ${totalMiddle > 40 ? 'bg-red-500 text-white' : 'bg-emerald-600 text-white'}`}>
                    {totalMiddle} / 40
                  </span>
                </td>
                <td className="px-2 py-3 text-center border-r border-slate-200">
                  <span className={`px-2 py-1 rounded block text-xs font-bold shadow-sm ${totalHigh > 40 ? 'bg-red-500 text-white' : 'bg-amber-600 text-white'}`}>
                    {totalHigh} / 40
                  </span>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
