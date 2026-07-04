"use client"
import { useState } from "react"
import { Plus, Edit2, Trash2, CheckCircle2, X, CalendarDays, Filter } from "lucide-react"
import { createSubject, updateSubject, deleteSubject } from "./actions"

export function SubjectsClient({ initialSubjects, years, defaultYearId }: any) {
  const [subjects, setSubjects] = useState(initialSubjects || []);
  const safeYears = years || [];
  const [selectedYearId, setSelectedYearId] = useState(defaultYearId || (safeYears[0]?.id || ""));
  const [filterLevel, setFilterLevel] = useState("ALL_LEVELS");
  const [filterProgram, setFilterProgram] = useState("ALL_PROGRAMS");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    id: "", code: "", name: "", levels: [] as string[], desc: "", 
    quotaPrimary: 0, quotaMiddle: 0, quotaHigh: 0, 
    quotaG1:0, quotaG2:0, quotaG3:0, quotaG4:0, quotaG5:0, 
    quotaG6:0, quotaG7:0, quotaG8:0, quotaG9:0, 
    quotaG10:0, quotaG11:0, quotaG12:0, 
    studyPrograms: [] as string[] 
  });
  const [loading, setLoading] = useState(false);

  const getQuota = (s: any) => {
    return s.quotas?.find((q: any) => q.academicYearId === selectedYearId) || { 
      quotaPrimary: 0, quotaMiddle: 0, quotaHigh: 0, 
      quotaG1:0, quotaG2:0, quotaG3:0, quotaG4:0, quotaG5:0, 
      quotaG6:0, quotaG7:0, quotaG8:0, quotaG9:0, 
      quotaG10:0, quotaG11:0, quotaG12:0 
    };
  }

  const renderBreakdown = (q: any, grades: number[], colorClass: string) => {
    const breakdown = grades.filter(g => q["quotaG" + g] > 0).map(g => "K" + g + ":" + q["quotaG" + g]);
    if (breakdown.length === 0) return null;
    return <div className={"text-[10px] font-medium mt-1 opacity-80 " + colorClass}>{breakdown.join(' · ')}</div>;
  }

  const renderBreakdown = (q: any, grades: number[], colorClass: string) => {
    const breakdown = grades.filter(g => q[`quotaG${g}`] > 0).map(g => `K${g}:${q[`quotaG${g}`]}`);
    if (breakdown.length === 0) return null;
    return <div className={`text-[10px] font-medium mt-1 opacity-80 ${colorClass}`}>{breakdown.join(' · ')}</div>;
  }

  const startEdit = (s?: any) => {
    if (s) {
      const q = getQuota(s);
      setFormData({ 
        id: s.id, code: s.subjectCode, name: s.subjectName, 
        levels: s.level && s.level !== "ALL" ? s.level.split(', ') : [], 
        desc: s.description || "", 
        quotaPrimary: q.quotaPrimary||0, quotaMiddle: q.quotaMiddle||0, quotaHigh: q.quotaHigh||0, 
        quotaG1: q.quotaG1||0, quotaG2: q.quotaG2||0, quotaG3: q.quotaG3||0, quotaG4: q.quotaG4||0, quotaG5: q.quotaG5||0, 
        quotaG6: q.quotaG6||0, quotaG7: q.quotaG7||0, quotaG8: q.quotaG8||0, quotaG9: q.quotaG9||0, 
        quotaG10: q.quotaG10||0, quotaG11: q.quotaG11||0, quotaG12: q.quotaG12||0, 
        studyPrograms: s.studyPrograms ? s.studyPrograms.split(', ') : [] 
      });
    } else {
      setFormData({ 
        id: "new", code: "", name: "", 
        levels: filterLevel !== "ALL_LEVELS" ? [filterLevel] : [], 
        desc: "", 
        quotaPrimary:0, quotaMiddle:0, quotaHigh:0,
        quotaG1:0, quotaG2:0, quotaG3:0, quotaG4:0, quotaG5:0, 
        quotaG6:0, quotaG7:0, quotaG8:0, quotaG9:0, 
        quotaG10:0, quotaG11:0, quotaG12:0, 
        studyPrograms: [] 
      });
    }
    setIsModalOpen(true);
  }

  const cancelEdit = () => {
    setIsModalOpen(false);
  }

  const updateQuota = (field: string, val: number) => {
    setFormData(prev => {
      const next = { ...prev, [field]: val };
      next.quotaPrimary = next.quotaG1 + next.quotaG2 + next.quotaG3 + next.quotaG4 + next.quotaG5;
      next.quotaMiddle = next.quotaG6 + next.quotaG7 + next.quotaG8 + next.quotaG9;
      next.quotaHigh = next.quotaG10 + next.quotaG11 + next.quotaG12;
      return next;
    });
  }

  const handleSave = async () => {
    setLoading(true);
    let res;
    const quotaData = { 
      academicYearId: selectedYearId, 
      quotaPrimary: formData.quotaPrimary, quotaMiddle: formData.quotaMiddle, quotaHigh: formData.quotaHigh, 
      quotaG1: formData.quotaG1, quotaG2: formData.quotaG2, quotaG3: formData.quotaG3, quotaG4: formData.quotaG4, quotaG5: formData.quotaG5, 
      quotaG6: formData.quotaG6, quotaG7: formData.quotaG7, quotaG8: formData.quotaG8, quotaG9: formData.quotaG9, 
      quotaG10: formData.quotaG10, quotaG11: formData.quotaG11, quotaG12: formData.quotaG12 
    };
    
    if (formData.id === "new") {
      res = await createSubject(formData.code, formData.name, formData.levels.length > 0 ? formData.levels.join(', ') : "ALL", formData.desc, quotaData, formData.studyPrograms.join(', '));
    } else {
      res = await updateSubject(formData.id, formData.code, formData.name, formData.levels.length > 0 ? formData.levels.join(', ') : "ALL", formData.desc, quotaData, formData.studyPrograms.join(', '));
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
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-bold text-slate-700">Năm học:</span>
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

      <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200/80 animate-in fade-in slide-in-from-bottom-4 duration-500 border-2 border-indigo-100 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
          <div>
            <h3 className="font-bold text-slate-700">Danh mục môn học ({displayedSubjects.length})</h3>
            <p className="text-sm text-[#00A99D] font-medium mt-1">Tổng số tiết trên tuần: Quy định là 40 Tiết</p>
          </div>
          <button onClick={() => startEdit()} className="px-4 py-2 bg-[#00A99D] text-white rounded-lg text-sm font-semibold flex items-center hover:bg-[#009085] shadow-sm transition-colors">
            <Plus className="w-4 h-4 mr-2" /> Thêm Môn học
          </button>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4 border-r border-b border-slate-200" colSpan={4}>Thông tin Môn Học</th>
                <th className="px-6 py-4 text-center border-r border-b border-slate-200" colSpan={3}>Số tiết (Theo Khối) / tuần</th>
                <th className="px-6 py-4 text-right border-b border-slate-200" rowSpan={2}>Thao tác</th>
              </tr>
              <tr className="bg-white">
                <th className="px-6 py-3 border-r border-b border-slate-200 font-medium">Mã môn</th>
                <th className="px-6 py-3 border-r border-b border-slate-200 font-medium">Tên môn</th>
                <th className="px-6 py-3 border-r border-b border-slate-200 font-medium">Hệ học</th>
                <th className="px-6 py-3 border-r border-b border-slate-200 font-medium">Ghi chú</th>
                <th className="px-6 py-3 text-center border-r border-b border-slate-200 text-blue-600 bg-blue-50/30">Tiểu học</th>
                <th className="px-6 py-3 text-center border-r border-b border-slate-200 text-emerald-600 bg-emerald-50/30">THCS</th>
                <th className="px-6 py-3 text-center border-r border-b border-slate-200 text-amber-600 bg-amber-50/30">THPT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedSubjects.map((s:any) => {
                const q = getQuota(s);
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-700 text-sm border-r border-slate-100">{s.subjectCode}</td>
                    <td className="px-6 py-4 font-bold text-indigo-700 text-sm border-r border-slate-100">{s.subjectName}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs border-r border-slate-100">
                      <div className="flex flex-wrap gap-1.5">
                        {s.studyPrograms ? s.studyPrograms.split(', ').map((p: string) => (
                          <span key={p} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">{p}</span>
                        )) : <span className="text-slate-400">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm border-r border-slate-100 max-w-[200px] truncate">{s.description || '-'}</td>
                    
                    <td className="px-6 py-4 text-center border-r border-slate-100 bg-blue-50/10">
                      <span className="font-bold text-blue-700 text-sm">{q.quotaPrimary > 0 ? `${q.quotaPrimary} tiết` : '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-center border-r border-slate-100 bg-emerald-50/10">
                      <span className="font-bold text-emerald-700 text-sm">{q.quotaMiddle > 0 ? `${q.quotaMiddle} tiết` : '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-center border-r border-slate-100 bg-amber-50/10">
                      <span className="font-bold text-amber-700 text-sm">{q.quotaHigh > 0 ? `${q.quotaHigh} tiết` : '-'}</span>
                    </td>

                    <td className="px-6 py-4 text-right space-x-1">
                      <button onClick={() => startEdit(s)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title="Sửa">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {displayedSubjects.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 bg-slate-50/50">
                    Chưa có môn học nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan={4} className="px-6 py-4 text-right font-bold text-slate-700 text-sm">
                  Tổng số tiết trên hệ thống:
                </td>
                <td className="px-6 py-4 text-center border-r border-slate-200">
                  <div className="bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg text-sm inline-block shadow-sm min-w-[80px]">
                    {totalPrimary} / 40
                  </div>
                </td>
                <td className="px-6 py-4 text-center border-r border-slate-200">
                  <div className="bg-[#00A99D] text-white font-bold px-3 py-1.5 rounded-lg text-sm inline-block shadow-sm min-w-[80px]">
                    {totalMiddle} / 40
                  </div>
                </td>
                <td className="px-6 py-4 text-center border-r border-slate-200">
                  <div className="bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg text-sm inline-block shadow-sm min-w-[80px]">
                    {totalHigh} / 40
                  </div>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 bg-white border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                {formData.id === "new" ? "Thêm mới môn học" : "Cập nhật môn học"}
              </h2>
              <button onClick={cancelEdit} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Mã môn học <span className="text-red-500">*</span></label>
                  <input value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} 
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/20 outline-none transition-all font-medium text-sm" 
                    placeholder="VD: TOAN" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Tên môn học <span className="text-red-500">*</span></label>
                  <input value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} 
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/20 outline-none transition-all font-medium text-sm" 
                    placeholder="VD: Toán học" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Hệ học</label>
                  <div className="flex gap-4 p-2.5 bg-slate-50 rounded-xl border border-slate-100 h-[46px] items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-[#00A99D] rounded border-slate-300" 
                        checked={formData.studyPrograms.includes("Hệ S")} 
                        onChange={(e) => {
                          const newPrograms = e.target.checked ? [...formData.studyPrograms, "Hệ S"] : formData.studyPrograms.filter((p) => p !== "Hệ S");
                          setFormData({...formData, studyPrograms: newPrograms});
                        }} /> 
                      <span className="text-sm font-medium text-slate-700">Hệ S</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-[#00A99D] rounded border-slate-300" 
                        checked={formData.studyPrograms.includes("Hệ Song Bằng")} 
                        onChange={(e) => {
                          const newPrograms = e.target.checked ? [...formData.studyPrograms, "Hệ Song Bằng"] : formData.studyPrograms.filter((p) => p !== "Hệ Song Bằng");
                          setFormData({...formData, studyPrograms: newPrograms});
                        }} /> 
                      <span className="text-sm font-medium text-slate-700">Hệ Song Bằng</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Ghi chú</label>
                  <input value={formData.desc} onChange={e=>setFormData({...formData, desc: e.target.value})} 
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/20 outline-none transition-all text-sm" 
                    placeholder="Ghi chú thêm..." />
                </div>
              </div>

              {/* Quotas */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-base font-bold text-slate-800">Cấu hình số tiết theo Khối (Tiết/Tuần)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Tiểu học */}
                  <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-5 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-blue-200">
                      <span className="font-bold text-blue-800">Tiểu học</span>
                      <span className="text-xs font-bold text-white bg-blue-500 px-2.5 py-1 rounded-md shadow-sm">Tổng: {formData.quotaPrimary}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[1,2,3,4,5].map(g => (
                        <div key={g} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-blue-100 shadow-sm hover:border-blue-300 transition-colors">
                          <span className="text-xs font-semibold text-blue-700">Khối {g}</span>
                          <input type="number" min={0} value={(formData as any)[`quotaG${g}`]} 
                            onChange={e => updateQuota(`quotaG${g}`, parseInt(e.target.value)||0)}
                            className="w-12 text-center text-sm font-bold bg-slate-50 border border-slate-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none p-1" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* THCS */}
                  <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-5 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-emerald-200">
                      <span className="font-bold text-emerald-800">THCS</span>
                      <span className="text-xs font-bold text-white bg-emerald-500 px-2.5 py-1 rounded-md shadow-sm">Tổng: {formData.quotaMiddle}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[6,7,8,9].map(g => (
                        <div key={g} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-emerald-100 shadow-sm hover:border-emerald-300 transition-colors">
                          <span className="text-xs font-semibold text-emerald-700">Khối {g}</span>
                          <input type="number" min={0} value={(formData as any)[`quotaG${g}`]} 
                            onChange={e => updateQuota(`quotaG${g}`, parseInt(e.target.value)||0)}
                            className="w-12 text-center text-sm font-bold bg-slate-50 border border-slate-200 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none p-1" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* THPT */}
                  <div className="bg-amber-50/50 rounded-2xl border border-amber-100 p-5 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-amber-200">
                      <span className="font-bold text-amber-800">THPT</span>
                      <span className="text-xs font-bold text-white bg-amber-500 px-2.5 py-1 rounded-md shadow-sm">Tổng: {formData.quotaHigh}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {[10,11,12].map(g => (
                        <div key={g} className="flex items-center justify-between bg-white px-3 py-2.5 rounded-lg border border-amber-100 shadow-sm hover:border-amber-300 transition-colors">
                          <span className="text-xs font-semibold text-amber-700">Khối {g}</span>
                          <input type="number" min={0} value={(formData as any)[`quotaG${g}`]} 
                            onChange={e => updateQuota(`quotaG${g}`, parseInt(e.target.value)||0)}
                            className="w-14 text-center text-sm font-bold bg-slate-50 border border-slate-200 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none p-1.5" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 bg-slate-50 border-t border-slate-100">
              <button onClick={cancelEdit} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors">
                Hủy bỏ
              </button>
              <button onClick={handleSave} disabled={loading || !formData.code || !formData.name} 
                className="px-6 py-2.5 text-sm font-bold text-white bg-[#00A99D] hover:bg-[#009085] rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center">
                {loading ? "Đang xử lý..." : "Lưu cấu hình"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
