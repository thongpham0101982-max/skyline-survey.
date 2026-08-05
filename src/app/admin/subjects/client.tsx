"use client"
import React, { useState, useMemo } from "react"
import { 
  Plus, Edit2, Trash2, CheckCircle2, X, CalendarDays, Filter, 
  BookOpen, Layers, Search, Award, MessageSquare, 
  CheckSquare, SlidersHorizontal, Hash, Check, Trash, CheckSquare2, Square
} from "lucide-react"
import { createSubject, updateSubject, deleteSubject, deleteMultipleSubjects, bulkUpdateSubjects } from "./actions"

const DEFAULT_QUOTA = {
  quotaPrimary: 0, quotaMiddle: 0, quotaHigh: 0, 
  quotaG1:0, quotaG2:0, quotaG3:0, quotaG4:0, quotaG5:0, 
  quotaG6:0, quotaG7:0, quotaG8:0, quotaG9:0, 
  quotaG10:0, quotaG11:0, quotaG12:0
};

export const EVALUATION_TYPES = [
  {
    id: "SCORE",
    label: "Môn học cho điểm",
    badgeLabel: "Cho điểm",
    description: "Đánh giá bằng điểm số kết hợp nhận xét (Thang điểm 10). Theo TT 27 (Tiểu học) & TT 22 (THCS/THPT).",
    examples: "VD: Toán, Ngữ văn/Tiếng Việt, Ngoại ngữ, KHTN, Vật lí, Hóa học...",
    color: "bg-blue-50 text-blue-700 border-blue-200 icon-blue",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
    icon: Award
  },
  {
    id: "GRADE",
    label: "Môn học đánh giá",
    badgeLabel: "Đánh giá",
    description: "Đánh giá theo mức Đạt / Chưa đạt (hoặc theo chuẩn tiêu chí kỹ năng).",
    examples: "VD: Môn đặc thù SKL, Kỹ năng sống, Câu lạc bộ, Môn Quốc tế...",
    color: "bg-purple-50 text-purple-700 border-purple-200 icon-purple",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300",
    icon: CheckSquare
  },
  {
    id: "COMMENT",
    label: "Môn học nhận xét",
    badgeLabel: "Nhận xét",
    description: "Đánh giá bằng nhận xét định tính về sự tiến bộ và kết quả rèn luyện.",
    examples: "VD: Đạo đức/GDCD, GDTC, Nghệ thuật (Âm nhạc, Mỹ thuật), HĐTN...",
    color: "bg-amber-50 text-amber-700 border-amber-200 icon-amber",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    icon: MessageSquare
  }
];

export function SubjectsClient({ initialSubjects, years, defaultYearId }: any) {
  const [subjects, setSubjects] = useState(initialSubjects || []);
  const safeYears = years || [];
  const [selectedYearId, setSelectedYearId] = useState(defaultYearId || (safeYears[0]?.id || ""));
  
  // Selection state for batch edit/delete
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState("ALL_LEVELS");
  const [filterProgram, setFilterProgram] = useState("ALL_PROGRAMS");
  const [filterCategory, setFilterCategory] = useState("ALL_CATEGORIES");
  const [filterEvalType, setFilterEvalType] = useState("ALL_EVALS");
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    id: "", code: "", name: "", levels: [] as string[], desc: "", 
    studyPrograms: [] as string[],
    parentId: "",
    category: "MOET",
    evaluationType: "SCORE",
    quotasByProgram: {} as Record<string, typeof DEFAULT_QUOTA>
  });
  const [activeTab, setActiveTab] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});

  // Summary counts
  const stats = useMemo(() => {
    const total = subjects.length;
    const scoreCount = subjects.filter((s: any) => (s.evaluationType || "SCORE") === "SCORE").length;
    const gradeCount = subjects.filter((s: any) => s.evaluationType === "GRADE").length;
    const commentCount = subjects.filter((s: any) => s.evaluationType === "COMMENT").length;
    return { total, scoreCount, gradeCount, commentCount };
  }, [subjects]);

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
        parentId: s.parentId || "",
        category: s.category || "MOET",
        evaluationType: s.evaluationType || "SCORE",
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
        parentId: "",
        category: filterCategory !== "ALL_CATEGORIES" ? filterCategory : "MOET",
        evaluationType: filterEvalType !== "ALL_EVALS" ? filterEvalType : "SCORE",
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
    if (!formData.code.trim() || !formData.name.trim()) {
      alert("Vui lòng nhập đầy đủ Mã môn và Tên môn học!");
      return;
    }
    setLoading(true);
    let res;
    const quotasArr = formData.studyPrograms.map(prog => ({
      academicYearId: selectedYearId,
      studyProgram: prog,
      ...(formData.quotasByProgram[prog] || { ...DEFAULT_QUOTA })
    }));
    
    const pId = formData.parentId || null;

    if (formData.id === "new") {
      res = await createSubject(
        formData.code.trim(), formData.name.trim(), 
        formData.levels.length > 0 ? formData.levels.join(', ') : "ALL", 
        formData.desc, undefined, formData.studyPrograms.join(', '), 
        quotasArr, pId, formData.category, formData.evaluationType
      );
    } else {
      res = await updateSubject(
        formData.id, formData.code.trim(), formData.name.trim(), 
        formData.levels.length > 0 ? formData.levels.join(', ') : "ALL", 
        formData.desc, undefined, formData.studyPrograms.join(', '), 
        quotasArr, pId, formData.category, formData.evaluationType
      );
    }
    
    if (res.success) {
      window.location.reload(); 
    } else {
      alert("Lỗi: " + res.error);
    }
    setLoading(false);
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa môn học này? Hành động không thể hoàn tác.")) return;
    const res = await deleteSubject(id);
    if (res.success) {
      setSubjects(subjects.filter((s:any) => s.id !== id));
      setSelectedSubjectIds(prev => prev.filter(item => item !== id));
    }
    else alert("Lỗi: " + res.error);
  }

  // Multi-selection handlers
  const toggleSelectSubject = (id: string) => {
    setSelectedSubjectIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = (visibleSubjectIds: string[]) => {
    const allSelected = visibleSubjectIds.every(id => selectedSubjectIds.includes(id));
    if (allSelected) {
      setSelectedSubjectIds(prev => prev.filter(id => !visibleSubjectIds.includes(id)));
    } else {
      const merged = new Set([...selectedSubjectIds, ...visibleSubjectIds]);
      setSelectedSubjectIds(Array.from(merged));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSubjectIds.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedSubjectIds.length} môn học đã chọn?`)) return;
    
    setLoading(true);
    const res = await deleteMultipleSubjects(selectedSubjectIds);
    if (res.success) {
      setSubjects(subjects.filter((s: any) => !selectedSubjectIds.includes(s.id)));
      setSelectedSubjectIds([]);
    } else {
      alert("Lỗi khi xóa hàng loạt: " + res.error);
    }
    setLoading(false);
  };

  const handleBulkUpdateEvalType = async (evalType: string) => {
    if (selectedSubjectIds.length === 0) return;
    setLoading(true);
    const res = await bulkUpdateSubjects(selectedSubjectIds, { evaluationType: evalType });
    if (res.success) {
      setSubjects(subjects.map((s: any) => selectedSubjectIds.includes(s.id) ? { ...s, evaluationType: evalType } : s));
    } else {
      alert("Lỗi cập nhật hình thức đánh giá: " + res.error);
    }
    setLoading(false);
  };

  const handleBulkUpdateCategory = async (cat: string) => {
    if (selectedSubjectIds.length === 0) return;
    setLoading(true);
    const res = await bulkUpdateSubjects(selectedSubjectIds, { category: cat });
    if (res.success) {
      setSubjects(subjects.map((s: any) => selectedSubjectIds.includes(s.id) ? { ...s, category: cat } : s));
    } else {
      alert("Lỗi cập nhật danh mục: " + res.error);
    }
    setLoading(false);
  };

  const levelLabels: any = { "ALL": "Tất cả", "PRIMARY": "Tiểu học", "MIDDLE": "THCS", "HIGH": "THPT" };

  // Filtered subjects logic
  const displayedSubjects = useMemo(() => {
    return subjects.filter((s: any) => {
      const matchSearch = !searchQuery.trim() || 
        s.subjectCode.toLowerCase().includes(searchQuery.toLowerCase().trim()) || 
        s.subjectName.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchLevel = filterLevel === "ALL_LEVELS" || (s.level && s.level.includes(filterLevel));
      const matchProgram = filterProgram === "ALL_PROGRAMS" || (s.studyPrograms && s.studyPrograms.includes(filterProgram));
      const matchCategory = filterCategory === "ALL_CATEGORIES" || s.category === filterCategory;
      const matchEvalType = filterEvalType === "ALL_EVALS" || (s.evaluationType || "SCORE") === filterEvalType;

      return matchSearch && matchLevel && matchProgram && matchCategory && matchEvalType;
    });
  }, [subjects, searchQuery, filterLevel, filterProgram, filterCategory, filterEvalType]);

  const explodedRows = useMemo(() => {
    return displayedSubjects.flatMap((s: any) => {
      const progs = s.studyPrograms ? s.studyPrograms.split(', ') : ["DEFAULT"];
      return progs
        .filter((p: string) => filterProgram === "ALL_PROGRAMS" || filterProgram === p)
        .map((p: string) => {
          const q = s.quotas?.find((q: any) => q.academicYearId === selectedYearId && (q.studyProgram === p || (!q.studyProgram && p === "DEFAULT"))) || { ...DEFAULT_QUOTA };
          return { subject: s, program: p, quota: q };
        });
    });
  }, [displayedSubjects, filterProgram, selectedYearId]);

  const sortRowsAsTree = (rowsList: any[]) => {
    const rootRows = rowsList.filter(r => !r.subject.parentId);
    const childRows = rowsList.filter(r => r.subject.parentId);
    
    const result: any[] = [];
    rootRows.forEach(root => {
      result.push(root);
      const children = childRows.filter(child => child.subject.parentId === root.subject.id);
      result.push(...children);
    });
    
    const orphanRows = childRows.filter(child => !rootRows.some(root => root.subject.id === child.subject.parentId));
    result.push(...orphanRows);
    
    return result;
  }

  const primaryRows = sortRowsAsTree(explodedRows.filter((r:any) => r.subject.level === "ALL" || (r.subject.level && r.subject.level.includes("PRIMARY"))));
  const middleRows = sortRowsAsTree(explodedRows.filter((r:any) => r.subject.level === "ALL" || (r.subject.level && r.subject.level.includes("MIDDLE"))));
  const highRows = sortRowsAsTree(explodedRows.filter((r:any) => r.subject.level === "ALL" || (r.subject.level && r.subject.level.includes("HIGH"))));

  const renderCategoryBadge = (cat?: string) => {
    const c = cat || "MOET";
    const styles: any = {
      MOET: "bg-slate-100 text-slate-700 border-slate-200",
      SKL: "bg-emerald-50 text-emerald-700 border-emerald-200",
      INTERNATIONAL: "bg-amber-50 text-amber-700 border-amber-200"
    };
    const labels: any = {
      MOET: "MOET",
      SKL: "SKL",
      INTERNATIONAL: "Quốc tế"
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${styles[c] || styles.MOET}`}>
        {labels[c] || c}
      </span>
    );
  };

  const renderEvalBadge = (evalType?: string) => {
    const type = EVALUATION_TYPES.find(t => t.id === (evalType || "SCORE")) || EVALUATION_TYPES[0];
    const IconComp = type.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${type.badgeClass}`}>
        <IconComp className="w-3 h-3 shrink-0" />
        <span>{type.badgeLabel}</span>
      </span>
    );
  };

  const hasActiveFilters = searchQuery !== "" || filterLevel !== "ALL_LEVELS" || filterProgram !== "ALL_PROGRAMS" || filterCategory !== "ALL_CATEGORIES" || filterEvalType !== "ALL_EVALS";

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterLevel("ALL_LEVELS");
    setFilterProgram("ALL_PROGRAMS");
    setFilterCategory("ALL_CATEGORIES");
    setFilterEvalType("ALL_EVALS");
  };

  const renderTable = (title: string, theme: string, rows: any[], grades: number[], totalField: string) => {
    if (rows.length === 0) return null;
    
    const colors: any = {
      blue: { bg: 'bg-blue-50/60', border: 'border-blue-100', text: 'text-blue-700', headerBg: 'bg-gradient-to-r from-blue-50 to-white', totalBg: 'bg-blue-600' },
      emerald: { bg: 'bg-emerald-50/60', border: 'border-emerald-100', text: 'text-emerald-700', headerBg: 'bg-gradient-to-r from-emerald-50 to-white', totalBg: 'bg-emerald-600' },
      amber: { bg: 'bg-amber-50/60', border: 'border-amber-100', text: 'text-amber-700', headerBg: 'bg-gradient-to-r from-amber-50 to-white', totalBg: 'bg-amber-600' }
    };
    const c = colors[theme];
    const totalAll = rows.reduce((acc, r) => acc + (r.quota[totalField] || 0), 0);

    const visibleSubjectIds = Array.from(new Set(rows.map(r => r.subject.id))) as string[];
    const isAllVisibleSelected = visibleSubjectIds.length > 0 && visibleSubjectIds.every(id => selectedSubjectIds.includes(id));

    return (
      <div className={`bg-white rounded-3xl shadow-sm border ${c.border} overflow-hidden mb-6 transition-all hover:shadow-md`}>
        <div className={`p-4 sm:p-5 border-b ${c.border} ${c.headerBg} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 bg-white rounded-2xl shadow-sm ${c.text}`}>
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-extrabold text-base sm:text-lg ${c.text}`}>{title}</h3>
              <p className="text-xs font-semibold text-slate-500">Tổng cộng {rows.length} dòng phân bổ tiết</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng tiết bậc học:</span>
            <span className={`text-sm font-black px-3 py-1 rounded-xl text-white ${c.totalBg} shadow-sm`}>
              {totalAll} tiết
            </span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                <th className="px-4 py-3.5 w-10 text-center">
                  <input 
                    type="checkbox"
                    checked={isAllVisibleSelected}
                    onChange={() => handleSelectAllVisible(visibleSubjectIds)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    title="Chọn tất cả môn trong bậc này"
                  />
                </th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider w-[140px]">Mã môn</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[220px]">Tên môn học</th>
                <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Hình thức đánh giá</th>
                <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Hệ học</th>
                {grades.map(g => (
                  <th key={g} className="px-3 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Khối {g}</th>
                ))}
                <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row:any, idx: number) => {
                const { subject: s, program: p, quota: q } = row;
                const isFirstOfSubject = rows.findIndex(r => r.subject.id === s.id) === idx;
                const isSelected = selectedSubjectIds.includes(s.id);
                
                return (
                  <tr key={`${s.id}-${p}`} className={`transition-colors group ${isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/90'}`}>
                    <td className="px-4 py-3.5 text-center">
                      {isFirstOfSubject ? (
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectSubject(s.id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      ) : null}
                    </td>

                    <td className="px-5 py-3.5">
                      {isFirstOfSubject ? (
                        <div className="flex items-center gap-1.5">
                          {s.parentId && <span className="text-slate-400 font-bold text-xs">└─</span>}
                          <span className={`font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-lg text-xs border border-slate-200 ${s.parentId ? 'opacity-85' : ''}`}>
                            {s.subjectCode}
                          </span>
                        </div>
                      ) : <span className="text-slate-300 ml-6">↳</span>}
                    </td>

                    <td className="px-5 py-3.5">
                      {isFirstOfSubject ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-extrabold text-slate-800 text-sm ${s.parentId ? 'text-slate-600 font-semibold' : ''}`}>
                            {s.subjectName}
                          </span>
                          {renderCategoryBadge(s.category)}
                        </div>
                      ) : ''}
                    </td>

                    <td className="px-4 py-3.5">
                      {isFirstOfSubject ? renderEvalBadge(s.evaluationType) : ''}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        p === 'Hệ Song Bằng' ? 'bg-purple-100 text-purple-700' :
                        p === 'Hệ S Quốc tế' ? 'bg-rose-100 text-rose-700' :
                        'bg-indigo-100 text-indigo-700'
                      }`}>
                        {p === "DEFAULT" ? "Chưa phân hệ" : p}
                      </span>
                    </td>
                    
                    {grades.map(g => (
                      <td key={g} className="px-3 py-3.5 text-center">
                        <span className={`inline-block w-8 h-8 leading-8 text-center rounded-xl text-xs font-black transition-all ${
                          q[`quotaG${g}`] > 0 ? `${c.bg} ${c.text} shadow-sm` : 'text-slate-300'
                        }`}>
                          {q[`quotaG${g}`] || '-'}
                        </span>
                      </td>
                    ))}

                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-xs font-black ${q[totalField] > 0 ? c.text : 'text-slate-300'}`}>
                        {q[totalField] ? `${q[totalField]} tiết` : '-'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      {isFirstOfSubject && (
                        <div className="flex items-center justify-end gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(s)} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Chỉnh sửa môn học">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Xóa môn học">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const parentCandidates = subjects.filter((s: any) => !s.parentId && s.id !== formData.id);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Clean Single Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Quản lý môn học</h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
              Cấu hình hình thức đánh giá (Thông tư 27 & 22 BGD&ĐT) và định mức tiết học đa hệ
            </p>
          </div>
        </div>
        <button onClick={() => startEdit()} 
          className="w-full md:w-auto px-6 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-bold flex items-center justify-center hover:bg-indigo-700 shadow-md hover:shadow-indigo-200 transition-all hover:-translate-y-0.5 active:translate-y-0">
          <Plus className="w-5 h-5 mr-2" /> Thêm Môn học mới
        </button>
      </div>

      {/* Bulk Action Toolbar (Floating / Inline when items are selected) */}
      {selectedSubjectIds.length > 0 && (
        <div className="bg-indigo-900 text-white p-4 sm:p-5 rounded-3xl shadow-xl border border-indigo-700 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-700 text-white rounded-2xl flex items-center justify-center font-black text-sm">
              {selectedSubjectIds.length}
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white">Đã chọn {selectedSubjectIds.length} môn học</h4>
              <p className="text-xs text-indigo-200 font-medium">Thực hiện thao tác cập nhật hoặc xóa hàng loạt</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Bulk Eval Type update */}
            <div className="relative group">
              <select
                onChange={(e) => {
                  if (e.target.value) handleBulkUpdateEvalType(e.target.value);
                  e.target.value = "";
                }}
                className="bg-indigo-800 text-white text-xs font-bold px-3 py-2 rounded-xl outline-none border border-indigo-700 cursor-pointer hover:bg-indigo-700 transition-colors"
              >
                <option value="">-- Đổi Hình thức đánh giá --</option>
                <option value="SCORE">💯 Cho điểm (Thang 10)</option>
                <option value="GRADE">📊 Đánh giá (Đạt/Chưa đạt)</option>
                <option value="COMMENT">💬 Nhận xét định tính</option>
              </select>
            </div>

            {/* Bulk Category update */}
            <div className="relative group">
              <select
                onChange={(e) => {
                  if (e.target.value) handleBulkUpdateCategory(e.target.value);
                  e.target.value = "";
                }}
                className="bg-indigo-800 text-white text-xs font-bold px-3 py-2 rounded-xl outline-none border border-indigo-700 cursor-pointer hover:bg-indigo-700 transition-colors"
              >
                <option value="">-- Đổi Danh mục môn --</option>
                <option value="MOET">Môn MOET (Bộ GD&ĐT)</option>
                <option value="SKL">Môn SKL (Đặc thù)</option>
                <option value="INTERNATIONAL">Môn Quốc tế</option>
              </select>
            </div>

            {/* Bulk Delete */}
            <button 
              onClick={handleBulkDelete}
              disabled={loading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" /> Xóa môn đã chọn
            </button>

            {/* Deselect All */}
            <button 
              onClick={() => setSelectedSubjectIds([])}
              className="px-3 py-2 bg-indigo-800 hover:bg-indigo-700 text-indigo-200 text-xs font-bold rounded-xl transition-colors"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Stats Summary Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center shrink-0">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng môn học</span>
            <div className="text-xl sm:text-2xl font-black text-slate-800">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-blue-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Môn cho điểm</span>
            <div className="text-xl sm:text-2xl font-black text-slate-800">{stats.scoreCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-purple-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Môn đánh giá</span>
            <div className="text-xl sm:text-2xl font-black text-slate-800">{stats.gradeCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-amber-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Môn nhận xét</span>
            <div className="text-xl sm:text-2xl font-black text-slate-800">{stats.commentCount}</div>
          </div>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-4">
        {/* Search input + Clear filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo mã môn hoặc tên môn..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 text-slate-800 text-sm font-bold rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-rose-100">
              <X className="w-3.5 h-3.5" /> Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-500" /> Năm học
            </label>
            <select 
              value={selectedYearId} 
              onChange={e => setSelectedYearId(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 block p-3 outline-none transition-all cursor-pointer hover:bg-slate-50"
            >
              {safeYears.map((y: any) => (
                <option key={y.id} value={y.id}>{y.name} {y.status === "ACTIVE" ? "(Đang học)" : ""}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-blue-500" /> Hình thức đánh giá
            </label>
            <select 
              value={filterEvalType} 
              onChange={e => setFilterEvalType(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 block p-3 outline-none transition-all cursor-pointer hover:bg-slate-50"
            >
              <option value="ALL_EVALS">Tất cả Hình thức</option>
              <option value="SCORE">💯 Cho điểm (Thang 10)</option>
              <option value="GRADE">📊 Đánh giá (Đạt/Chưa đạt)</option>
              <option value="COMMENT">💬 Nhận xét định tính</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-500" /> Hệ đào tạo
            </label>
            <select 
              value={filterProgram} 
              onChange={e => setFilterProgram(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 block p-3 outline-none transition-all cursor-pointer hover:bg-slate-50"
            >
              {["ALL_PROGRAMS", "Hệ S", "Hệ Song Bằng", "Hệ S Quốc tế"].map((prog) => (
                <option key={prog} value={prog}>{prog === "ALL_PROGRAMS" ? "Tất cả Hệ đào tạo" : prog}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-500" /> Cấp bậc
            </label>
            <select 
              value={filterLevel} 
              onChange={e => setFilterLevel(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 block p-3 outline-none transition-all cursor-pointer hover:bg-slate-50"
            >
              {["ALL_LEVELS", "PRIMARY", "MIDDLE", "HIGH"].map((lvl) => (
                <option key={lvl} value={lvl}>{lvl === "ALL_LEVELS" ? "Tất cả Bậc học" : levelLabels[lvl]}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" /> Danh mục
            </label>
            <select 
              value={filterCategory} 
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 block p-3 outline-none transition-all cursor-pointer hover:bg-slate-50"
            >
              {[
                { id: "ALL_CATEGORIES", label: "Tất cả Danh mục" },
                { id: "MOET", label: "Môn MOET (Bộ GD&ĐT)" },
                { id: "SKL", label: "Môn SKL (Đặc thù)" },
                { id: "INTERNATIONAL", label: "Môn Quốc tế" }
              ].map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Tables Container */}
      <div className="space-y-6 pt-2">
        {filterLevel === "ALL_LEVELS" || filterLevel === "PRIMARY" ? renderTable("Bậc Tiểu học", "blue", primaryRows, [1,2,3,4,5], "quotaPrimary") : null}
        {filterLevel === "ALL_LEVELS" || filterLevel === "MIDDLE" ? renderTable("Bậc Trung học cơ sở (THCS)", "emerald", middleRows, [6,7,8,9], "quotaMiddle") : null}
        {filterLevel === "ALL_LEVELS" || filterLevel === "HIGH" ? renderTable("Bậc Trung học phổ thông (THPT)", "amber", highRows, [10,11,12], "quotaHigh") : null}

        {explodedRows.length === 0 && (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center animate-in fade-in">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-base font-extrabold text-slate-700 mb-1">Không tìm thấy môn học thỏa điều kiện</h3>
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">Vui lòng điều chỉnh lại từ khóa tìm kiếm hoặc các bộ lọc ở trên.</p>
            {hasActiveFilters && (
              <button onClick={clearAllFilters} className="mt-4 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors">
                Xóa bộ lọc tìm kiếm
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Subject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="flex items-center justify-between p-5 sm:p-6 bg-white border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">
                    {formData.id === "new" ? "Tạo môn học mới" : "Chỉnh sửa thông tin môn học"}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Cấu hình thông tin chuẩn Thông tư BGD&ĐT và tiết học phân bổ</p>
                </div>
              </div>
              <button onClick={cancelEdit} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 sm:p-7 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/40">
              
              {/* Section 1: Basic Info */}
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" /> Thông tin môn học cơ bản
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Mã môn học <span className="text-rose-500">*</span></label>
                    <input value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value.toUpperCase()})} 
                      className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-mono font-bold text-sm" 
                      placeholder="VD: TOAN, VAN, ANH..." />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Tên môn học <span className="text-rose-500">*</span></label>
                    <input value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} 
                      className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-sm" 
                      placeholder="VD: Toán học, Ngữ văn..." />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Danh mục môn học</label>
                    <select 
                      value={formData.category} 
                      onChange={e=>setFormData({...formData, category: e.target.value})}
                      className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-xs cursor-pointer"
                    >
                      <option value="MOET">Môn học Bộ GD&ĐT (MOET)</option>
                      <option value="SKL">Môn học đặc thù Sky-Line (SKL)</option>
                      <option value="INTERNATIONAL">Môn học Quốc tế</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Thuộc môn học (Môn cha)</label>
                    <select 
                      value={formData.parentId} 
                      onChange={e=>setFormData({...formData, parentId: e.target.value})}
                      className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-xs cursor-pointer"
                    >
                      <option value="">Không có (Môn chính độc lập)</option>
                      {parentCandidates.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.subjectName} ({p.subjectCode})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Evaluation Type Selection (BGD&ĐT Circulars) */}
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-500" /> Hình thức đánh giá môn học (Thông tư 27 & 22 BGD&ĐT)
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {EVALUATION_TYPES.map((type) => {
                    const isSelected = formData.evaluationType === type.id;
                    const Icon = type.icon;
                    return (
                      <div 
                        key={type.id}
                        onClick={() => setFormData({...formData, evaluationType: type.id})}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected ? 'border-indigo-600 bg-indigo-50/40 shadow-sm' : 'border-slate-150 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className={`p-2 rounded-xl border ${type.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                          </div>
                          <h4 className="font-extrabold text-sm text-slate-800 mb-1">{type.label}</h4>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-2">{type.description}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 text-[10px] font-bold text-slate-400">
                          {type.examples}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Programs & Levels */}
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-500" /> Phạm vi áp dụng (Cấp học & Hệ đào tạo)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Study Programs */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">Hệ đào tạo áp dụng</label>
                    <div className="flex flex-wrap gap-2">
                      {["Hệ S", "Hệ Song Bằng", "Hệ S Quốc tế"].map(prog => {
                        const checked = formData.studyPrograms.includes(prog);
                        return (
                          <label key={prog} className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border transition-all text-xs font-bold ${checked ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                            <input type="checkbox" className="hidden" 
                              checked={checked} onChange={(e) => handleProgramToggle(prog, e.target.checked)} /> 
                            <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                              {checked && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span>{prog}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* Levels */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">Cấp học áp dụng</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'PRIMARY', label: 'Tiểu học' },
                        { id: 'MIDDLE', label: 'THCS' },
                        { id: 'HIGH', label: 'THPT' }
                      ].map(lvl => {
                        const checked = formData.levels.includes(lvl.id) || formData.levels.includes("ALL");
                        return (
                          <label key={lvl.id} className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border transition-all text-xs font-bold ${checked ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                            <input type="checkbox" className="hidden" 
                              checked={checked} 
                              onChange={(e) => {
                                const lvls = new Set(formData.levels.filter(l => l !== "ALL"));
                                if (e.target.checked) lvls.add(lvl.id);
                                else lvls.delete(lvl.id);
                                setFormData({...formData, levels: Array.from(lvls)});
                              }} /> 
                            <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all ${checked ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'}`}>
                              {checked && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span>{lvl.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Quota inputs by program */}
              {formData.studyPrograms.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 gap-2">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-500" /> Cấu hình số tiết phân bổ theo Hệ
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {formData.studyPrograms.map(prog => (
                        <button key={prog} onClick={() => setActiveTab(prog)} type="button"
                          className={`px-3 py-1 font-bold text-xs rounded-xl transition-all ${activeTab === prog ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'}`}>
                          {prog}
                        </button>
                      ))}
                    </div>
                  </div>

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
                        <div className={`flex-1 min-w-[220px] rounded-2xl border ${color.border} overflow-hidden bg-white`}>
                          <div className={`px-4 py-2.5 ${color.headerBg} flex items-center justify-between`}>
                            <span className={`font-extrabold text-sm ${color.title}`}>{label}</span>
                            <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${color.badge}`}>
                              Tổng: {total} tiết
                            </span>
                          </div>
                          <div className="px-2 py-2.5 space-y-1">
                            {grades.map((g) => (
                              <div key={g} className={`flex items-center justify-between px-2.5 py-1 rounded-xl ${color.rowHover} transition-colors`}>
                                <span className={`text-xs font-bold ${color.title}`}>Khối {g}</span>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={rawInputs[`${activeTab}-quotaG${g}`] !== undefined
                                      ? rawInputs[`${activeTab}-quotaG${g}`]
                                      : (q[`quotaG${g}`] ? String(q[`quotaG${g}`]) : '')}
                                    onChange={e => {
                                      const raw = e.target.value;
                                      if (raw !== '' && !/^-?[0-9]*[.,]?[0-9]*$/.test(raw)) return;
                                      const key = `${activeTab}-quotaG${g}`;
                                      setRawInputs(prev => ({ ...prev, [key]: raw }));
                                      const parsed = parseFloat(raw.replace(',', '.'));
                                      if (!isNaN(parsed)) updateQuota(`quotaG${g}`, parsed);
                                      else if (raw === '') updateQuota(`quotaG${g}`, 0);
                                    }}
                                    onFocus={e => e.target.select()}
                                    onBlur={e => {
                                      const key = `${activeTab}-quotaG${g}`;
                                      const parsed = parseFloat(e.target.value.replace(',', '.'));
                                      updateQuota(`quotaG${g}`, isNaN(parsed) ? 0 : parsed);
                                      setRawInputs(prev => { const n = {...prev}; delete n[key]; return n; });
                                    }}
                                    placeholder="0"
                                    className={`w-16 text-center text-xs font-black py-1 px-1 rounded-lg border ${color.inputBorder} focus:${color.inputFocus} outline-none bg-slate-50 focus:bg-white transition-all`}
                                  />
                                  <span className="text-[10px] text-slate-400 font-semibold shrink-0">tiết</span>
                                </div>
                              </div>
                            ))}
                            <div className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-between px-2.5">
                              <span className="text-[10px] text-slate-400 font-bold shrink-0">Gán nhanh:</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="nhập → ↵"
                                  className={`w-16 text-center text-[11px] font-bold py-0.5 rounded-lg border ${color.border} focus:${color.inputFocus} outline-none bg-slate-50 focus:bg-white transition-all`}
                                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                    if (e.key === 'Enter') {
                                      const val = parseFloat((e.target as HTMLInputElement).value.replace(',', '.')) || 0;
                                      fillAll(val);
                                      (e.target as HTMLInputElement).value = '';
                                    }
                                  }}
                                />
                                <span className="text-[10px] text-slate-400 font-semibold shrink-0">tiết</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="p-4 flex flex-wrap gap-3">
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
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 sm:p-5 bg-white border-t border-slate-100">
              <button onClick={cancelEdit} className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 bg-white border border-slate-200 rounded-xl transition-all">
                Hủy bỏ
              </button>
              <button onClick={handleSave} disabled={loading || !formData.code || !formData.name || formData.studyPrograms.length === 0} 
                className="px-7 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-indigo-200 transition-all disabled:opacity-50 flex items-center">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang lưu dữ liệu...
                  </span>
                ) : "Lưu môn học"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
