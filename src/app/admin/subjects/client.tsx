"use client"
import React, { useState } from "react"
import { Plus, Edit2, Trash2, CheckCircle2, X, CalendarDays, Filter, BookOpen, Layers } from "lucide-react"
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
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});

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

  const cancelEdit = () => setIsModalOpen(false);

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
      q.quotaPrimary = Math.round((q.quotaG1 + q.quotaG2 + q.quotaG3 + q.quotaG4 + q.quotaG5) * 100) / 100;
      q.quotaMiddle = Math.round((q.quotaG6 + q.quotaG7 + q.quotaG8 + q.quotaG9) * 100) / 100;
      q.quotaHigh = Math.round((q.quotaG10 + q.quotaG11 + q.quotaG12) * 100) / 100;
      return { ...prev, quotasByProgram: { ...prev.quotasByProgram, [activeTab]: q } };
    });
  }

  const handleSave = async () => {
    setLoading(true);
    let res;
    const quotasArr = formData.studyPrograms.map(prog => ({
      academicYearId: selectedYearId,
      studyProgram: prog,
      ...(formData.quotasByProgram[prog] || { ...DEFAULT_QUOTA })
    }));
    
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

  const renderTable = (title: string, theme: string, rows: any[], grades: number[], totalField: string) => {
    if (rows.length === 0) return null;
    
    const colors: any = {
      blue: { bg: 'bg-blue-50/50', border: 'border-blue-100', text: 'text-blue-700', headerBg: 'bg-gradient-to-r from-blue-50 to-white', totalBg: 'bg-blue-500' },
      emerald: { bg: 'bg-emerald-50/50', border: 'border-emerald-100', text: 'text-emerald-700', headerBg: 'bg-gradient-to-r from-emerald-50 to-white', totalBg: 'bg-emerald-500' },
      amber: { bg: 'bg-amber-50/50', border: 'border-amber-100', text: 'text-amber-700', headerBg: 'bg-gradient-to-r from-amber-50 to-white', totalBg: 'bg-amber-500' }
    };
    const c = colors[theme];
    const totalAll = rows.reduce((acc, r) => acc + (r.quota[totalField] || 0), 0);

    return (
      <div className={`bg-white rounded-3xl shadow-sm border ${c.border} overflow-hidden mb-8 transition-all hover:shadow-md`}>
        <div className={`p-5 border-b ${c.border} ${c.headerBg} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 bg-white rounded-xl shadow-sm ${c.text}`}>
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-extrabold text-lg ${c.text}`}>{title}</h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Quản lý {rows.length} phân bổ môn học</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[120px]">Mã môn</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[200px]">Tên môn</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hệ học</th>
                {grades.map(g => (
                  <th key={g} className="px-3 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Khối {g}</th>
                ))}
                <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row:any, idx: number) => {
                const { subject: s, program: p, quota: q } = row;
                const isFirstOfSubject = rows.findIndex(r => r.subject.id === s.id) === idx;
                
                return (
                  <tr key={`${s.id}-${p}`} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      {isFirstOfSubject ? (
                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md text-xs">{s.subjectCode}</span>
                      ) : <span className="text-slate-300 ml-4">↳</span>}
                    </td>
                    <td className="px-6 py-4">
                      {isFirstOfSubject ? <span className="font-bold text-slate-800">{s.subjectName}</span> : ''}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        p === 'Hệ Song Bằng' ? 'bg-purple-100 text-purple-700' :
                        p === 'Hệ S Quốc tế' ? 'bg-rose-100 text-rose-700' :
                        'bg-indigo-100 text-indigo-700'
                      }`}>
                        {p === "DEFAULT" ? "Chưa phân hệ" : p}
                      </span>
                    </td>
                    
                    {grades.map(g => (
                      <td key={g} className="px-3 py-4 text-center">
                        <span className={`inline-block w-8 h-8 leading-8 text-center rounded-lg text-sm font-bold ${
                          q[`quotaG${g}`] > 0 ? `${c.bg} ${c.text}` : 'text-slate-300'
                        }`}>
                          {q[`quotaG${g}`] || '-'}
                        </span>
                      </td>
                    ))}

                    <td className="px-5 py-4 text-center">
                      <span className={`text-sm font-extrabold ${q[totalField] > 0 ? c.text : 'text-slate-300'}`}>
                        {q[totalField] || '-'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      {isFirstOfSubject && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => startEdit(s)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all hover:scale-105" title="Sửa">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all hover:scale-105" title="Xóa">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50/50 border-t border-slate-100">
              <tr>
                <td colSpan={3 + grades.length} className="px-6 py-4 text-right font-bold text-slate-600 text-sm">
                  Tổng quan Bậc học:
                </td>
                <td className="px-5 py-4 text-center">
                  <div className={`${c.totalBg} text-white font-bold px-3 py-1.5 rounded-xl text-sm shadow-sm inline-block`}>
                    {totalAll}
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
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Quản lý môn học</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Hệ thống phân bổ số tiết học đa hệ chuẩn hóa</p>
          </div>
        </div>
        <button onClick={() => startEdit()} className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-2xl text-sm font-bold flex items-center justify-center hover:from-indigo-700 hover:to-indigo-600 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
          <Plus className="w-5 h-5 mr-2" /> Thêm Môn học mới
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-500" /> Năm học áp dụng
          </label>
          <select 
            value={selectedYearId} 
            onChange={e => setSelectedYearId(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 block p-3.5 outline-none transition-all cursor-pointer hover:bg-slate-50"
          >
            {safeYears.map((y: any) => (
              <option key={y.id} value={y.id}>{y.name} {y.status === "ACTIVE" ? "(Đang học)" : ""}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-500" /> Hệ đào tạo
          </label>
          <select 
            value={filterProgram} 
            onChange={e => setFilterProgram(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 block p-3.5 outline-none transition-all cursor-pointer hover:bg-slate-50"
          >
            {["ALL_PROGRAMS", "Hệ S", "Hệ Song Bằng", "Hệ S Quốc tế"].map((prog) => (
              <option key={prog} value={prog}>{prog === "ALL_PROGRAMS" ? "Tất cả Hệ đào tạo" : prog}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-500" /> Cấp bậc
          </label>
          <select 
            value={filterLevel} 
            onChange={e => setFilterLevel(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 block p-3.5 outline-none transition-all cursor-pointer hover:bg-slate-50"
          >
            {["ALL_LEVELS", "PRIMARY", "MIDDLE", "HIGH"].map((lvl) => (
              <option key={lvl} value={lvl}>{lvl === "ALL_LEVELS" ? "Tất cả Bậc học" : levelLabels[lvl]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-8 pt-4">
        {filterLevel === "ALL_LEVELS" || filterLevel === "PRIMARY" ? renderTable("Tiểu học", "blue", primaryRows, [1,2,3,4,5], "quotaPrimary") : null}
        {filterLevel === "ALL_LEVELS" || filterLevel === "MIDDLE" ? renderTable("Trung học cơ sở", "emerald", middleRows, [6,7,8,9], "quotaMiddle") : null}
        {filterLevel === "ALL_LEVELS" || filterLevel === "HIGH" ? renderTable("Trung học phổ thông", "amber", highRows, [10,11,12], "quotaHigh") : null}

        {explodedRows.length === 0 && (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-16 text-center animate-in fade-in">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">Chưa có dữ liệu môn học</h3>
            <p className="text-slate-500 font-medium">Vui lòng điều chỉnh bộ lọc hoặc thêm mới môn học.</p>
            <button onClick={() => startEdit()} className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors">
              Thêm môn học ngay
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ease-out border border-slate-100">
            <div className="flex items-center justify-between p-6 sm:p-8 bg-white border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800">
                  {formData.id === "new" ? "Tạo môn học mới" : "Chỉnh sửa môn học"}
                </h2>
                <p className="text-slate-500 font-medium text-sm mt-1">Cấu hình thông tin cơ bản và số tiết phân bổ</p>
              </div>
              <button onClick={cancelEdit} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 sm:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" /> Thông tin cơ bản
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Mã môn học <span className="text-rose-500">*</span></label>
                    <input value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} 
                      className="w-full p-3.5 bg-slate-50 rounded-2xl border-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-500 outline-none transition-all font-bold text-sm" 
                      placeholder="VD: TOAN" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Tên môn học <span className="text-rose-500">*</span></label>
                    <input value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} 
                      className="w-full p-3.5 bg-slate-50 rounded-2xl border-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-500 outline-none transition-all font-bold text-sm" 
                      placeholder="VD: Toán học" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Hệ đào tạo</label>
                    <div className="flex flex-wrap gap-3">
                      {["Hệ S", "Hệ Song Bằng", "Hệ S Quốc tế"].map(prog => {
                        const checked = formData.studyPrograms.includes(prog);
                        return (
                          <label key={prog} className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border-2 transition-all ${checked ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                            <input type="checkbox" className="hidden" 
                              checked={checked} onChange={(e) => handleProgramToggle(prog, e.target.checked)} /> 
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${checked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`}>
                              {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm font-bold ${checked ? 'text-indigo-700' : 'text-slate-600'}`}>{prog}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Cấp bậc áp dụng</label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { id: 'PRIMARY', label: 'Tiểu học' },
                        { id: 'MIDDLE', label: 'THCS' },
                        { id: 'HIGH', label: 'THPT' }
                      ].map(lvl => {
                        const checked = formData.levels.includes(lvl.id) || formData.levels.includes("ALL");
                        return (
                          <label key={lvl.id} className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border-2 transition-all ${checked ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                            <input type="checkbox" className="hidden" 
                              checked={checked} 
                              onChange={(e) => {
                                const lvls = new Set(formData.levels.filter(l => l !== "ALL"));
                                if (e.target.checked) lvls.add(lvl.id);
                                else lvls.delete(lvl.id);
                                setFormData({...formData, levels: Array.from(lvls)});
                              }} /> 
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                              {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm font-bold ${checked ? 'text-emerald-700' : 'text-slate-600'}`}>{lvl.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {formData.studyPrograms.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* Tab selector */}
                  <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-500" /> Số tiết theo Hệ
                    </h3>
                    <div className="flex gap-2">
                      {formData.studyPrograms.map(prog => (
                        <button key={prog} onClick={() => setActiveTab(prog)} type="button"
                          className={`px-4 py-1.5 font-bold text-xs rounded-lg transition-all ${activeTab === prog ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}>
                          {prog}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grade input grid */}
                  {activeTab && (() => {
                    const q = (formData.quotasByProgram[activeTab] as any) || {};
                    const showPrimary = formData.levels.includes('PRIMARY') || formData.levels.includes('ALL') || formData.levels.length === 0;
                    const showMiddle = formData.levels.includes('MIDDLE') || formData.levels.includes('ALL') || formData.levels.length === 0;
                    const showHigh = formData.levels.includes('HIGH') || formData.levels.includes('ALL') || formData.levels.length === 0;

                    type BlockColor = {
                      border: string; headerBg: string; title: string;
                      badge: string; rowHover: string; inputBorder: string; inputFocus: string;
                    };

                    const GradeBlock = ({ label, grades, color }: { label: string; grades: number[]; color: BlockColor }) => {
                      const total = Math.round(grades.reduce((s, g) => s + (q[`quotaG${g}`] || 0), 0) * 100) / 100;
                      const fillAll = (val: number) => grades.forEach(g => updateQuota(`quotaG${g}`, val));
                      return (
                        <div className={`flex-1 min-w-[190px] rounded-2xl border-2 ${color.border} overflow-hidden`}>
                          <div className={`px-4 py-3 ${color.headerBg} flex items-center justify-between`}>
                            <span className={`font-extrabold text-base ${color.title}`}>{label}</span>
                            <span className={`text-sm font-black px-3 py-1 rounded-lg ${color.badge}`}>
                              Tổng: {total}
                            </span>
                          </div>
                          <div className="px-3 py-3 bg-white space-y-1.5">
                            {grades.map((g) => (
                              <div key={g} className={`flex items-center gap-2 px-2 py-1.5 rounded-xl ${color.rowHover} transition-colors`}>
                                <span className={`text-sm font-bold w-14 shrink-0 ${color.title}`}>Khối {g}</span>
                                <input
                                  type="number" min={0} step="any"
                                  value={rawInputs[`${activeTab}-quotaG${g}`] !== undefined
                                    ? rawInputs[`${activeTab}-quotaG${g}`]
                                    : (q[`quotaG${g}`] ? String(q[`quotaG${g}`]) : '')}
                                  onChange={e => {
                                    const raw = e.target.value;
                                    const key = `${activeTab}-quotaG${g}`;
                                    setRawInputs(prev => ({ ...prev, [key]: raw }));
                                    const parsed = parseFloat(raw);
                                    if (!isNaN(parsed)) updateQuota(`quotaG${g}`, parsed);
                                    else if (raw === '') updateQuota(`quotaG${g}`, 0);
                                  }}
                                  onFocus={e => e.target.select()}
                                  onBlur={e => {
                                    const key = `${activeTab}-quotaG${g}`;
                                    const parsed = parseFloat(e.target.value);
                                    updateQuota(`quotaG${g}`, isNaN(parsed) ? 0 : parsed);
                                    setRawInputs(prev => { const n = {...prev}; delete n[key]; return n; });
                                  }}
                                  placeholder="0"
                                  className={`flex-1 text-center text-base font-black py-2.5 px-1 rounded-xl border-2 ${color.inputBorder} focus:${color.inputFocus} outline-none transition-all bg-slate-50/80 focus:bg-white hover:bg-white`}
                                />
                                <span className="text-xs text-slate-400 font-medium w-8 text-right shrink-0">tiết</span>
                              </div>
                            ))}
                            <div className="pt-2 mt-1 border-t border-slate-100">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400 font-semibold shrink-0 w-14">Đặt tất:</span>
                                <input
                                  type="number" min={0} step="any" placeholder="nhập → Enter"
                                  className={`flex-1 text-center text-xs font-bold py-1.5 px-2 rounded-lg border ${color.border} focus:${color.inputFocus} outline-none bg-slate-50 focus:bg-white transition-all`}
                                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                    if (e.key === 'Enter') {
                                      const val = parseFloat((e.target as HTMLInputElement).value) || 0;
                                      fillAll(val);
                                      (e.target as HTMLInputElement).value = '';
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="p-4 flex flex-wrap gap-4">
                        {showPrimary && <GradeBlock label="Tiểu học" grades={[1,2,3,4,5]} color={{
                          border: 'border-blue-200', headerBg: 'bg-blue-50', title: 'text-blue-800',
                          badge: 'bg-blue-600 text-white', rowHover: 'hover:bg-blue-50/60',
                          inputBorder: 'border-blue-200 hover:border-blue-400', inputFocus: 'border-blue-500'
                        }} />}
                        {showMiddle && <GradeBlock label="THCS" grades={[6,7,8,9]} color={{
                          border: 'border-emerald-200', headerBg: 'bg-emerald-50', title: 'text-emerald-800',
                          badge: 'bg-emerald-600 text-white', rowHover: 'hover:bg-emerald-50/60',
                          inputBorder: 'border-emerald-200 hover:border-emerald-400', inputFocus: 'border-emerald-500'
                        }} />}
                        {showHigh && <GradeBlock label="THPT" grades={[10,11,12]} color={{
                          border: 'border-amber-200', headerBg: 'bg-amber-50', title: 'text-amber-800',
                          badge: 'bg-amber-600 text-white', rowHover: 'hover:bg-amber-50/60',
                          inputBorder: 'border-amber-200 hover:border-amber-400', inputFocus: 'border-amber-500'
                        }} />}
                      </div>
                    );
                  })()}
                </div>
              )}
              {formData.studyPrograms.length === 0 && (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Layers className="w-8 h-8 text-amber-400" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 mb-2">Chưa chọn Hệ đào tạo</h4>
                  <p className="text-slate-500 font-medium">Vui lòng tick chọn ít nhất một hệ ở trên để nhập số tiết.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-4 p-6 sm:p-8 bg-white border-t border-slate-100">
              <button onClick={cancelEdit} className="px-6 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-100 bg-white border border-slate-200 rounded-2xl transition-all">
                Hủy thay đổi
              </button>
              <button onClick={handleSave} disabled={loading || !formData.code || !formData.name || formData.studyPrograms.length === 0} 
                className="px-8 py-3.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang xử lý...
                  </span>
                ) : "Lưu cấu hình Môn học"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
