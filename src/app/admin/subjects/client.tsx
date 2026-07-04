"use client"
import { useState } from "react"
import { Plus, Edit2, Trash2, CheckCircle2, X, CalendarDays, Filter } from "lucide-react"
import { createSubject, updateSubject, deleteSubject } from "./actions"

const DEFAULT_QUOTA = {
  quotaPrimary: 0, quotaMiddle: 0, quotaHigh: 0, 
  quotaG1:0, quotaG2:0, quotaG3:0, quotaG4:0, quotaG5:0, 
  quotaG6:0, quotaG7:0, quotaG8:0, quotaG9:0, 
  quotaG10:0, quotaG11:0, quotaG12:0
};

export function SubjectsClient({ initialSubjects, years, defaultYearId }: any) {
  const [subjects, setSubjects] = useState(initialSubjects || []);
  const safeYears = years || [];
  const [selectedYearId, setSelectedYearId] = useState(defaultYearId || (safeYears[0]?.id || ""));
  const [filterLevel, setFilterLevel] = useState("ALL_LEVELS");
  const [filterProgram, setFilterProgram] = useState("ALL_PROGRAMS");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    id: "", code: "", name: "", levels: [] as string[], desc: "", 
    studyPrograms: [] as string[],
    quotasByProgram: {} as Record<string, typeof DEFAULT_QUOTA>
  });
  const [activeTab, setActiveTab] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const startEdit = (s?: any) => {
    if (s) {
      const progs = s.studyPrograms ? s.studyPrograms.split(', ') : ["DEFAULT"];
      const qByProg: any = {};
      progs.forEach((p: string) => {
        const found = s.quotas?.find((q: any) => q.academicYearId === selectedYearId && (q.studyProgram === p || (!q.studyProgram && p === "DEFAULT")));
        qByProg[p] = found ? { ...found } : { ...DEFAULT_QUOTA };
      });
      setFormData({ 
        id: s.id, code: s.subjectCode, name: s.subjectName, 
        levels: s.level && s.level !== "ALL" ? s.level.split(', ') : [], 
        desc: s.description || "", 
        studyPrograms: progs,
        quotasByProgram: qByProg
      });
      setActiveTab(progs[0] || "");
    } else {
      const initialProg = filterProgram !== "ALL_PROGRAMS" ? filterProgram : "Hệ S";
      setFormData({ 
        id: "new", code: "", name: "", 
        levels: filterLevel !== "ALL_LEVELS" ? [filterLevel] : [], 
        desc: "", 
        studyPrograms: [initialProg],
        quotasByProgram: { [initialProg]: { ...DEFAULT_QUOTA } }
      });
      setActiveTab(initialProg);
    }
    setIsModalOpen(true);
  }

  const cancelEdit = () => {
    setIsModalOpen(false);
  }

  const handleProgramToggle = (prog: string, checked: boolean) => {
    setFormData(prev => {
      const newProgs = checked ? [...prev.studyPrograms, prog] : prev.studyPrograms.filter(p => p !== prog);
      const newQuotas = { ...prev.quotasByProgram };
      if (checked && !newQuotas[prog]) {
        newQuotas[prog] = { ...DEFAULT_QUOTA };
      }
      return { ...prev, studyPrograms: newProgs, quotasByProgram: newQuotas };
    });
    if (checked && !formData.studyPrograms.includes(prog)) setActiveTab(prog);
    if (!checked && activeTab === prog) setActiveTab(formData.studyPrograms.filter(p => p !== prog)[0] || "");
  }

  const updateQuota = (field: string, val: number) => {
    if (!activeTab) return;
    setFormData(prev => {
      const q = { ...prev.quotasByProgram[activeTab], [field]: val };
      q.quotaPrimary = q.quotaG1 + q.quotaG2 + q.quotaG3 + q.quotaG4 + q.quotaG5;
      q.quotaMiddle = q.quotaG6 + q.quotaG7 + q.quotaG8 + q.quotaG9;
      q.quotaHigh = q.quotaG10 + q.quotaG11 + q.quotaG12;
      return { ...prev, quotasByProgram: { ...prev.quotasByProgram, [activeTab]: q } };
    });
  }

  const handleSave = async () => {
    setLoading(true);
    let res;
    
    // Prepare quotas array
    const quotasArr = formData.studyPrograms.map(prog => {
      const q = formData.quotasByProgram[prog] || { ...DEFAULT_QUOTA };
      return {
        academicYearId: selectedYearId,
        studyProgram: prog,
        ...q
      };
    });
    
    if (formData.id === "new") {
      res = await createSubject(formData.code, formData.name, formData.levels.length > 0 ? formData.levels.join(', ') : "ALL", formData.desc, undefined, formData.studyPrograms.join(', '), quotasArr);
    } else {
      res = await updateSubject(formData.id, formData.code, formData.name, formData.levels.length > 0 ? formData.levels.join(', ') : "ALL", formData.desc, undefined, formData.studyPrograms.join(', '), quotasArr);
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

  // Explode subjects by program for the table
  const explodedRows = displayedSubjects.flatMap((s: any) => {
    const progs = s.studyPrograms ? s.studyPrograms.split(', ') : ["DEFAULT"];
    return progs
      .filter((p: string) => filterProgram === "ALL_PROGRAMS" || filterProgram === p)
      .map((p: string) => {
        const q = s.quotas?.find((q: any) => q.academicYearId === selectedYearId && (q.studyProgram === p || (!q.studyProgram && p === "DEFAULT"))) || { ...DEFAULT_QUOTA };
        return { subject: s, program: p, quota: q };
      });
  });

  const primaryRows = explodedRows.filter((r:any) => r.subject.level === "ALL" || (r.subject.level && r.subject.level.includes("PRIMARY")));
  const middleRows = explodedRows.filter((r:any) => r.subject.level === "ALL" || (r.subject.level && r.subject.level.includes("MIDDLE")));
  const highRows = explodedRows.filter((r:any) => r.subject.level === "ALL" || (r.subject.level && r.subject.level.includes("HIGH")));

  const renderTable = (title: string, color: string, rows: any[], grades: number[], totalField: string) => {
    if (rows.length === 0) return null;
    
    const colorClass = color === 'blue' ? 'text-blue-700 bg-blue-50 border-blue-200' : 
                       color === 'emerald' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 
                       'text-amber-700 bg-amber-50 border-amber-200';
                       
    const totalAll = rows.reduce((acc, r) => acc + (r.quota[totalField] || 0), 0);

    return (
      <div className={`bg-white rounded-[1.5rem] shadow-sm border border-slate-200/80 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden mb-8`}>
        <div className={`p-4 border-b flex justify-between items-center ${colorClass}`}>
          <div>
            <h3 className="font-bold">{title} ({rows.length} môn)</h3>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr className="bg-white">
                <th className="px-6 py-3 border-r border-b border-slate-200 font-medium w-[100px]">Mã môn</th>
                <th className="px-6 py-3 border-r border-b border-slate-200 font-medium min-w-[150px]">Tên môn</th>
                <th className="px-6 py-3 border-r border-b border-slate-200 font-medium">Hệ học</th>
                {grades.map(g => (
                  <th key={g} className="px-3 py-3 text-center border-r border-b border-slate-200 font-medium">Khối {g}</th>
                ))}
                <th className="px-4 py-3 text-center border-r border-b border-slate-200 font-medium">Tổng</th>
                <th className="px-4 py-3 text-right border-b border-slate-200">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row:any, idx: number) => {
                const { subject: s, program: p, quota: q } = row;
                const isFirstOfSubject = rows.findIndex(r => r.subject.id === s.id) === idx;
                
                return (
                  <tr key={`${s.id}-${p}`} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-700 text-sm border-r border-slate-100">
                      {isFirstOfSubject ? s.subjectCode : <span className="text-slate-300">↳</span>}
                    </td>
                    <td className="px-6 py-4 font-bold text-indigo-700 text-sm border-r border-slate-100">
                      {isFirstOfSubject ? s.subjectName : ''}
                    </td>
                    <td className="px-6 py-4 text-slate-700 text-sm font-semibold border-r border-slate-100">
                      <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md">{p === "DEFAULT" ? "Chưa phân hệ" : p}</span>
                    </td>
                    
                    {grades.map(g => (
                      <td key={g} className="px-3 py-4 text-center border-r border-slate-100">
                        <span className={`text-sm font-semibold ${q[`quotaG${g}`] > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                          {q[`quotaG${g}`] || '-'}
                        </span>
                      </td>
                    ))}

                    <td className={`px-4 py-4 text-center border-r border-slate-100 font-bold ${q[totalField] > 0 ? colorClass.split(' ')[0] : 'text-slate-300'}`}>
                      {q[totalField] || '-'}
                    </td>

                    <td className="px-4 py-4 text-right space-x-1">
                      {isFirstOfSubject && (
                        <>
                          <button onClick={() => startEdit(s)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title="Sửa">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title="Xóa">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan={3 + grades.length} className="px-6 py-4 text-right font-bold text-slate-700 text-sm">
                  Tổng số tiết {title.toLowerCase()} trên hệ thống:
                </td>
                <td className="px-4 py-4 text-center border-r border-slate-200">
                  <div className={`${color === 'blue' ? 'bg-blue-600' : color === 'emerald' ? 'bg-[#00A99D]' : 'bg-amber-600'} text-white font-bold px-3 py-1.5 rounded-lg text-sm inline-block shadow-sm`}>
                    {totalAll} / 40
                  </div>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-200/80 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Filters */}
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-500" /> Năm học
          </label>
          <select 
            value={selectedYearId} 
            onChange={e => setSelectedYearId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] block p-2.5 outline-none transition-all cursor-pointer hover:bg-slate-100"
          >
            {safeYears.map((y: any) => (
              <option key={y.id} value={y.id}>{y.name} {y.status === "ACTIVE" ? "(Active)" : ""}</option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-500" /> Lọc theo Hệ học
          </label>
          <select 
            value={filterProgram} 
            onChange={e => setFilterProgram(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] block p-2.5 outline-none transition-all cursor-pointer hover:bg-slate-100"
          >
            {["ALL_PROGRAMS", "Hệ S", "Hệ Song Bằng", "Hệ S Quốc tế"].map((prog) => (
              <option key={prog} value={prog}>{prog === "ALL_PROGRAMS" ? "Tất cả Hệ" : prog}</option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-500" /> Lọc theo Bậc học
          </label>
          <select 
            value={filterLevel} 
            onChange={e => setFilterLevel(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-[#00A99D]/20 focus:border-[#00A99D] block p-2.5 outline-none transition-all cursor-pointer hover:bg-slate-100"
          >
            {["ALL_LEVELS", "PRIMARY", "MIDDLE", "HIGH"].map((lvl) => (
              <option key={lvl} value={lvl}>{lvl === "ALL_LEVELS" ? "Tất cả các bậc" : levelLabels[lvl]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 mt-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Cấu hình số tiết theo Bậc học</h2>
          <p className="text-sm text-slate-500 mt-1">Quản lý môn học được phân tách chi tiết theo từng Bậc và Khối lớp</p>
        </div>
        <button onClick={() => startEdit()} className="px-5 py-2.5 bg-[#00A99D] text-white rounded-xl text-sm font-semibold flex items-center hover:bg-[#009085] shadow-sm transition-colors">
          <Plus className="w-4 h-4 mr-2" /> Thêm Môn học
        </button>
      </div>

      {filterLevel === "ALL_LEVELS" || filterLevel === "PRIMARY" ? renderTable("Bậc Tiểu học", "blue", primaryRows, [1,2,3,4,5], "quotaPrimary") : null}
      {filterLevel === "ALL_LEVELS" || filterLevel === "MIDDLE" ? renderTable("Bậc Trung học cơ sở", "emerald", middleRows, [6,7,8,9], "quotaMiddle") : null}
      {filterLevel === "ALL_LEVELS" || filterLevel === "HIGH" ? renderTable("Bậc Trung học phổ thông", "amber", highRows, [10,11,12], "quotaHigh") : null}

      {explodedRows.length === 0 && (
        <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-12 text-center">
          <p className="text-slate-500 font-medium">Chưa có môn học nào phù hợp với bộ lọc hiện tại.</p>
        </div>
      )}

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
                        onChange={(e) => handleProgramToggle("Hệ S", e.target.checked)} /> 
                      <span className="text-sm font-medium text-slate-700">Hệ S</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-[#00A99D] rounded border-slate-300" 
                        checked={formData.studyPrograms.includes("Hệ Song Bằng")} 
                        onChange={(e) => handleProgramToggle("Hệ Song Bằng", e.target.checked)} /> 
                      <span className="text-sm font-medium text-slate-700">Hệ Song Bằng</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-[#00A99D] rounded border-slate-300" 
                        checked={formData.studyPrograms.includes("Hệ S Quốc tế")} 
                        onChange={(e) => handleProgramToggle("Hệ S Quốc tế", e.target.checked)} /> 
                      <span className="text-sm font-medium text-slate-700">Hệ S Quốc tế</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Bậc học áp dụng</label>
                  <div className="flex gap-4 p-2.5 bg-slate-50 rounded-xl border border-slate-100 h-[46px] items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-[#00A99D] rounded border-slate-300" 
                        checked={formData.levels.includes("PRIMARY") || formData.levels.includes("ALL")} 
                        onChange={(e) => {
                          const lvls = new Set(formData.levels.filter(l => l !== "ALL"));
                          if (e.target.checked) lvls.add("PRIMARY");
                          else lvls.delete("PRIMARY");
                          setFormData({...formData, levels: Array.from(lvls)});
                        }} /> 
                      <span className="text-sm font-medium text-slate-700">Tiểu học</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-[#00A99D] rounded border-slate-300" 
                        checked={formData.levels.includes("MIDDLE") || formData.levels.includes("ALL")} 
                        onChange={(e) => {
                          const lvls = new Set(formData.levels.filter(l => l !== "ALL"));
                          if (e.target.checked) lvls.add("MIDDLE");
                          else lvls.delete("MIDDLE");
                          setFormData({...formData, levels: Array.from(lvls)});
                        }} /> 
                      <span className="text-sm font-medium text-slate-700">THCS</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-[#00A99D] rounded border-slate-300" 
                        checked={formData.levels.includes("HIGH") || formData.levels.includes("ALL")} 
                        onChange={(e) => {
                          const lvls = new Set(formData.levels.filter(l => l !== "ALL"));
                          if (e.target.checked) lvls.add("HIGH");
                          else lvls.delete("HIGH");
                          setFormData({...formData, levels: Array.from(lvls)});
                        }} /> 
                      <span className="text-sm font-medium text-slate-700">THPT</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Quotas with Tabs */}
              {formData.studyPrograms.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800">Cấu hình số tiết theo Hệ (Tiết/Tuần)</h3>
                  </div>
                  
                  {/* Tabs */}
                  <div className="flex border-b border-slate-200">
                    {formData.studyPrograms.map(prog => (
                      <button key={prog}
                        onClick={() => setActiveTab(prog)}
                        className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === prog ? 'border-[#00A99D] text-[#00A99D]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                        {prog}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  {activeTab && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300 pt-2">
                      {/* Tiểu học */}
                      {(formData.levels.includes("PRIMARY") || formData.levels.includes("ALL") || formData.levels.length === 0) && (
                        <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-5 space-y-4">
                          <div className="flex justify-between items-center pb-3 border-b border-blue-200">
                            <span className="font-bold text-blue-800">Tiểu học</span>
                            <span className="text-xs font-bold text-white bg-blue-500 px-2.5 py-1 rounded-md shadow-sm">Tổng: {formData.quotasByProgram[activeTab]?.quotaPrimary || 0}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {[1,2,3,4,5].map(g => (
                              <div key={g} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-blue-100 shadow-sm hover:border-blue-300 transition-colors">
                                <span className="text-xs font-semibold text-blue-700">Khối {g}</span>
                                <input type="number" min={0} value={(formData.quotasByProgram[activeTab] as any)?.[(`quotaG${g}`)] || 0} 
                                  onChange={e => updateQuota(`quotaG${g}`, parseInt(e.target.value)||0)}
                                  className="w-12 text-center text-sm font-bold bg-slate-50 border border-slate-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none p-1" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* THCS */}
                      {(formData.levels.includes("MIDDLE") || formData.levels.includes("ALL") || formData.levels.length === 0) && (
                        <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-5 space-y-4">
                          <div className="flex justify-between items-center pb-3 border-b border-emerald-200">
                            <span className="font-bold text-emerald-800">THCS</span>
                            <span className="text-xs font-bold text-white bg-emerald-500 px-2.5 py-1 rounded-md shadow-sm">Tổng: {formData.quotasByProgram[activeTab]?.quotaMiddle || 0}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {[6,7,8,9].map(g => (
                              <div key={g} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-emerald-100 shadow-sm hover:border-emerald-300 transition-colors">
                                <span className="text-xs font-semibold text-emerald-700">Khối {g}</span>
                                <input type="number" min={0} value={(formData.quotasByProgram[activeTab] as any)?.[(`quotaG${g}`)] || 0} 
                                  onChange={e => updateQuota(`quotaG${g}`, parseInt(e.target.value)||0)}
                                  className="w-12 text-center text-sm font-bold bg-slate-50 border border-slate-200 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none p-1" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* THPT */}
                      {(formData.levels.includes("HIGH") || formData.levels.includes("ALL") || formData.levels.length === 0) && (
                        <div className="bg-amber-50/50 rounded-2xl border border-amber-100 p-5 space-y-4">
                          <div className="flex justify-between items-center pb-3 border-b border-amber-200">
                            <span className="font-bold text-amber-800">THPT</span>
                            <span className="text-xs font-bold text-white bg-amber-500 px-2.5 py-1 rounded-md shadow-sm">Tổng: {formData.quotasByProgram[activeTab]?.quotaHigh || 0}</span>
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                            {[10,11,12].map(g => (
                              <div key={g} className="flex items-center justify-between bg-white px-3 py-2.5 rounded-lg border border-amber-100 shadow-sm hover:border-amber-300 transition-colors">
                                <span className="text-xs font-semibold text-amber-700">Khối {g}</span>
                                <input type="number" min={0} value={(formData.quotasByProgram[activeTab] as any)?.[(`quotaG${g}`)] || 0} 
                                  onChange={e => updateQuota(`quotaG${g}`, parseInt(e.target.value)||0)}
                                  className="w-14 text-center text-sm font-bold bg-slate-50 border border-slate-200 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none p-1.5" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {formData.studyPrograms.length === 0 && (
                <div className="p-6 text-center text-amber-600 bg-amber-50 rounded-xl border border-amber-200 text-sm font-medium">
                  Vui lòng chọn ít nhất một Hệ học để cấu hình số tiết.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 bg-slate-50 border-t border-slate-100">
              <button onClick={cancelEdit} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors">
                Hủy bỏ
              </button>
              <button onClick={handleSave} disabled={loading || !formData.code || !formData.name || formData.studyPrograms.length === 0} 
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
