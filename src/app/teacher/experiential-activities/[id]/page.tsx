"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, Settings, Save, Search, CheckSquare,
  CheckCircle2, Plus, X, Hash, Edit3, Loader2,
  Square, Users, BookOpen, Calendar, Tag, ChevronDown,
  CheckCheck, Info, FileText, Link as LinkIcon, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ActivityResultInput() {
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsCollapse, setShowDetailsCollapse] = useState(true);
  const [search, setSearch] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState('');
  const [bulkLevel, setBulkLevel] = useState('');
  const [bulkAchievement, setBulkAchievement] = useState('');

  // Data
  const [activity, setActivity] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ role: any[]; result: any[]; achievement: any[] }>({ role: [], result: [], achievement: [] });
  const [teachersList, setTeachersList] = useState<any[]>([]);
  
  // Edit activity states
  const [editData, setEditData] = useState({ 
    name: '', 
    date: '', 
    objectives: '', 
    tasks: '', 
    criteria: '', 
    coTeachers: '' 
  });
  const [coTeacherSearch, setCoTeacherSearch] = useState('');
  const [selectedCoTeachers, setSelectedCoTeachers] = useState<string[]>([]);
  const [showCoTeacherDropdown, setShowCoTeacherDropdown] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [actRes, catRes, teachersRes] = await Promise.all([
        fetch(`/api/experiential-activities/${id}`),
        fetch('/api/activities/categories'),
        fetch('/api/teachers')
      ]);

      if (actRes.ok) {
        const data = await actRes.json();
        
        // Check year mismatch
        const match = document.cookie.match(/(?:^|; )selectedAcademicYear=([^;]*)/);
        const currentYearId = match ? decodeURIComponent(match[1]) : localStorage.getItem("selectedAcademicYear");
        if (currentYearId && data.academicYearId && data.academicYearId !== currentYearId) {
          toast.error("Hoạt động này không thuộc năm học đang chọn. Đang chuyển hướng...");
          setTimeout(() => {
            router.push('/teacher/experiential-activities');
          }, 1500);
          return;
        }

        setActivity(data);
        setEditData({
          name: data.name || data.catalog?.name || '',
          date: data.date ? new Date(data.date).toISOString().substring(0, 10) : '',
          objectives: data.objectives || '',
          tasks: data.tasks || '',
          criteria: data.criteria || '',
          coTeachers: data.coTeachers || ''
        });

        // Initialize coTeachers array from string
        if (data.coTeachers) {
          setSelectedCoTeachers(data.coTeachers.split(',').map((t: string) => t.trim()).filter(Boolean));
        } else {
          setSelectedCoTeachers([]);
        }

        if (data.participants) {
          setStudents(data.participants.map((p: any) => ({
            ...p,
            id: p.id,
            studentId: p.studentId,
            code: p.student?.studentCode || '',
            name: p.student?.studentName || '(Chưa có tên)',
            class: p.student?.class?.className || p.student?.class?.name || '',
            gender: p.student?.gender || '',
            roleId: p.roleId || '',
            evalLevelId: p.evalLevelId || '',
            achievementId: p.achievementId || '',
            absenceReasonId: p.absenceReasonId || '',
            note: p.note || '{}'
          })));
        }
      } else {
        const errText = await actRes.text();
        toast.error('API Error: ' + actRes.status + ' - ' + errText);
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        if (catData.success) {
          setCategories({
            role: catData.data.filter((c: any) => c.type === 'ROLE' && c.status === 'ACTIVE'),
            result: catData.data.filter((c: any) => c.type === 'KQUA' && c.status === 'ACTIVE'),
            achievement: catData.data.filter((c: any) => c.type === 'ACHIEVEMENT' && c.status === 'ACTIVE')
          });
        }
      }

      if (teachersRes.ok) {
        const tData = await teachersRes.json();
        setTeachersList(tData || []);
      }
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.code?.toLowerCase().includes(search.toLowerCase()) ||
    s.class?.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.has(s.id));
  const someSelected = filteredStudents.some(s => selectedIds.has(s.id));

  const toggleAll = () => {
    if (allSelected) {
      const newSet = new Set(selectedIds);
      filteredStudents.forEach(s => newSet.delete(s.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      filteredStudents.forEach(s => newSet.add(s.id));
      setSelectedIds(newSet);
    }
  };

  const toggleStudent = (sid: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(sid)) newSet.delete(sid);
    else newSet.add(sid);
    setSelectedIds(newSet);
  };

  const handleApplyBulk = () => {
    if (selectedIds.size === 0) return;
    setStudents(prev => prev.map(s => {
      if (!selectedIds.has(s.id)) return s;
      return {
        ...s,
        ...(bulkRole ? { roleId: bulkRole } : {}),
        ...(bulkLevel ? { evalLevelId: bulkLevel } : {}),
        ...(bulkAchievement ? { achievementId: bulkAchievement } : {})
      };
    }));
    setBulkRole(''); setBulkLevel(''); setBulkAchievement('');
    setSelectedIds(new Set());
    toast.success(`Đã áp dụng cho ${selectedIds.size} học sinh`);
  };

  const handleChange = (sid: string, field: string, value: string, isCustom = false) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== sid) return s;
      if (isCustom) {
        let obj: any = {};
        try { obj = JSON.parse(s.note || '{}'); } catch {}
        obj[field] = value;
        return { ...s, note: JSON.stringify(obj) };
      }
      return { ...s, [field]: value };
    }));
  };

  const getCustomValue = (note: string, colId: string) => {
    try { return JSON.parse(note || '{}')[colId] || ''; } catch { return ''; }
  };

  const handleSaveResults = async (isConfirm = false) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/experiential-activities/${id}/results`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students, isConfirm })
      });
      if (res.ok) {
        toast.success(isConfirm ? 'Đã xác nhận & Khóa kết quả thành công!' : 'Đã lưu kết quả nháp thành công!');
        fetchData();
      } else toast.error('Lỗi khi lưu kết quả');
    } catch { toast.error('Lỗi kết nối'); }
    finally { setSaving(false); }
  };

  const handleUpdateActivity = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/experiential-activities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date: editData.date, 
          name: editData.name,
          objectives: editData.objectives,
          tasks: editData.tasks,
          criteria: editData.criteria,
          coTeachers: selectedCoTeachers.join(', ')
        })
      });
      if (res.ok) {
        toast.success('Cập nhật thông tin hoạt động thành công!');
        setShowEditModal(false);
        fetchData();
      } else toast.error('Lỗi khi cập nhật');
    } catch { toast.error('Lỗi kết nối'); }
    finally { setSaving(false); }
  };

  const SelectArrow = () => (
    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
  );

  const getSelectClass = (val: string, isLocked = false) => {
    const base = "w-full appearance-none text-xs font-bold rounded-xl pl-3 pr-8 py-2.5 transition-all outline-none border " + 
      (isLocked ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed " : "focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ");
    if (val) {
      return base + (isLocked ? "" : "bg-teal-50/30 border-teal-200 text-teal-700");
    }
    return base + (isLocked ? "" : "bg-slate-50/50 border-slate-200 text-slate-500");
  };

  const getInputClass = (isLocked = false) => {
    return "w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2.5 outline-none transition-all placeholder:text-slate-400 focus:border-teal-500 " + 
      (isLocked ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" : "");
  };

  const gradedCount = students.filter(s => s.roleId || s.evalLevelId || s.achievementId).length;

  const activityName = activity?.name || activity?.catalog?.name || 'Hoạt động trải nghiệm';
  const activityCode = activity?.code || '';
  const isConfirmed = activity?.status === 'SUBMITTED' || activity?.status === 'APPROVED';

  // Filter teachers list
  const filteredTeachers = teachersList.filter(t => 
    t.teacherName.toLowerCase().includes(coTeacherSearch.toLowerCase()) ||
    t.teacherCode.toLowerCase().includes(coTeacherSearch.toLowerCase())
  );

  const toggleCoTeacher = (tName: string) => {
    if (selectedCoTeachers.includes(tName)) {
      setSelectedCoTeachers(selectedCoTeachers.filter(t => t !== tName));
    } else {
      setSelectedCoTeachers([...selectedCoTeachers, tName]);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50/50 flex justify-center items-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-teal-600 animate-spin mx-auto mb-3" />
        <p className="text-slate-400 font-bold text-xs">Đang tải hồ sơ đánh giá...</p>
      </div>
    </div>
  );

  return (
    <div className="w-full font-sans text-slate-600 antialiased pb-12">
      <div className="max-w-[1500px] mx-auto space-y-6">

        {/* HEADER */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/50 overflow-hidden relative">
          <div className={`h-1.5 w-full ${isConfirmed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          
          <div className="p-6 md:p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <button
                onClick={() => router.push('/teacher/experiential-activities')}
                className="text-xs font-black text-slate-400 hover:text-teal-600 flex items-center gap-1 mb-3 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Trở lại danh sách hoạt động
              </button>

              <div className="flex items-center gap-3 flex-wrap">
                {activityCode && (
                  <span className="text-[10px] font-black text-white bg-teal-600 px-2.5 py-1 rounded-lg tracking-wide shadow-2xs">
                    {activityCode}
                  </span>
                )}
                <h1 className="text-xl font-black text-slate-800 tracking-tight">{activityName}</h1>
                
                {isConfirmed ? (
                  <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Đã xác nhận & Khóa kết quả
                  </span>
                ) : (
                  <span className="text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200/60 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Edit3 className="w-3 h-3" /> Bản nháp (Đang chỉnh sửa)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 font-bold flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  Ngày: {activity?.date ? new Date(activity.date).toLocaleDateString('vi-VN') : '--'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-teal-600" />
                  {students.length} học sinh tham gia
                </span>
                {students.length > 0 && students[0].class && (
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                    Lớp: {students[0].class}
                  </span>
                )}
                <span className="flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-150 px-2 py-0.5 rounded-lg font-black text-[10px]">
                  Tiến độ: {gradedCount}/{students.length} HS đã nhập
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 flex-wrap w-full lg:w-auto">
              <button
                onClick={() => setShowEditModal(true)}
                disabled={isConfirmed}
                className="flex-1 lg:flex-none px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-3xs"
              >
                <Edit3 className="w-4 h-4" /> Hiệu chỉnh
              </button>
              
              {!isConfirmed && (
                <>
                  <button
                    onClick={() => handleSaveResults(false)}
                    disabled={saving}
                    className="flex-1 lg:flex-none px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-3xs"
                  >
                    <Save className="w-4 h-4 text-slate-400" /> Lưu nháp
                  </button>
                  
                  <button
                    onClick={() => {
                      if (confirm("Xác nhận & Khóa kết quả? Sau khi xác nhận, kết quả sẽ đồng bộ vào Hồ sơ học sinh gửi phụ huynh và không thể chỉnh sửa tiếp!")) {
                        handleSaveResults(true);
                      }
                    }}
                    disabled={saving}
                    className="flex-1 lg:flex-none px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/10"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Xác nhận kết quả
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* PROJECT RULES & DETAIL INFO COLLAPSIBLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
          <button 
            onClick={() => setShowDetailsCollapse(!showDetailsCollapse)}
            className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-55/40 text-left"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Thông tin quy định & Mục tiêu hoạt động</span>
            </div>
            <span className="text-xs font-black text-teal-600 hover:underline">{showDetailsCollapse ? 'Thu gọn' : 'Xem chi tiết'}</span>
          </button>
          
          {showDetailsCollapse && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 bg-white animate-in fade-in duration-300">
              <div className="space-y-1 md:col-span-1 border-r border-slate-100 pr-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-teal-600" /> Giáo viên phối hợp
                </div>
                <div className="text-xs font-bold text-slate-700 mt-2 line-clamp-3">
                  {activity?.coTeachers || <span className="text-slate-400 italic">Không phân công phối hợp</span>}
                </div>
              </div>

              <div className="space-y-1 md:col-span-1 border-r border-slate-100 pr-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-teal-600" /> Mục tiêu năng lực
                </div>
                <div className="text-xs font-medium text-slate-600 mt-2 whitespace-pre-line leading-relaxed">
                  {activity?.objectives || <span className="text-slate-400 italic">Chưa khai báo mục tiêu</span>}
                </div>
              </div>

              <div className="space-y-1 md:col-span-1 border-r border-slate-100 pr-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-teal-600" /> Nhiệm vụ học tập
                </div>
                <div className="text-xs font-medium text-slate-600 mt-2 whitespace-pre-line leading-relaxed">
                  {activity?.tasks || <span className="text-slate-400 italic">Chưa khai báo nhiệm vụ</span>}
                </div>
              </div>

              <div className="space-y-1 md:col-span-1">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-teal-600" /> Tiêu chí đánh giá
                </div>
                <div className="text-xs font-medium text-slate-600 mt-2 whitespace-pre-line leading-relaxed">
                  {activity?.criteria || <span className="text-slate-400 italic">Chưa khai báo tiêu chí</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SEARCH & FILTERS */}
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm học sinh theo tên, mã số..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all shadow-3xs text-slate-700"
          />
        </div>

        {/* BULK TOOLBAR */}
        {selectedIds.size > 0 && !isConfirmed && (
          <div className="bg-teal-50/50 border border-teal-150 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-3xs animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center">
                <CheckCheck className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-teal-700 text-xs">Đang chọn <span className="text-sm font-extrabold">{selectedIds.size}</span> học sinh</span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-[11px] font-bold text-slate-400 hover:text-red-500 ml-2 underline transition-colors"
              >
                Hủy chọn
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select className="appearance-none bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 pl-3 pr-8 py-2 outline-none focus:border-teal-55" value={bulkRole} onChange={e => setBulkRole(e.target.value)}>
                  <option value="">-- Vai trò --</option>
                  {categories.role.map((o: any) => <option key={o.id} value={o.code}>{o.name}</option>)}
                </select>
                <SelectArrow />
              </div>
              
              <div className="relative">
                <select className="appearance-none bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 pl-3 pr-8 py-2 outline-none focus:border-teal-55" value={bulkLevel} onChange={e => setBulkLevel(e.target.value)}>
                  <option value="">-- Mức đánh giá --</option>
                  {categories.result.map((o: any) => <option key={o.id} value={o.code}>{o.name}</option>)}
                </select>
                <SelectArrow />
              </div>

              <div className="relative">
                <select className="appearance-none bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 pl-3 pr-8 py-2 outline-none focus:border-teal-55" value={bulkAchievement} onChange={e => setBulkAchievement(e.target.value)}>
                  <option value="">-- Thành tích --</option>
                  {categories.achievement.map((o: any) => <option key={o.id} value={o.code}>{o.name}</option>)}
                </select>
                <SelectArrow />
              </div>

              <button onClick={handleApplyBulk} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-lg transition-all flex items-center gap-1.5 shadow-2xs">
                <CheckCheck className="w-4 h-4" /> Áp dụng hàng loạt
              </button>
            </div>
          </div>
        )}

        {/* STUDENT EVALUATION TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-55/20">
            <div className="text-xs text-slate-500 font-bold">
              Danh sách: <span className="font-extrabold text-slate-700">{filteredStudents.length}</span> học sinh 
              {search && <span className="text-slate-400 ml-1">(lọc từ {students.length})</span>}
            </div>
            {!isConfirmed && (
              <button onClick={toggleAll} className="text-[11px] font-black text-slate-500 hover:text-teal-600 flex items-center gap-1.5 transition-colors">
                {allSelected
                  ? <><CheckSquare className="w-4 h-4 text-teal-600" /> Bỏ chọn cả lớp</>
                  : <><Square className="w-4 h-4" /> Chọn cả lớp</>
                }
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-55/10 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {!isConfirmed && <th className="pl-5 pr-2 py-4 w-10"></th>}
                  <th className="px-3 py-4 w-10 text-slate-400">#</th>
                  <th className="px-3 py-4 min-w-[200px]">Học sinh</th>
                  <th className="px-3 py-4 min-w-[150px]">Vai trò tham gia</th>
                  <th className="px-3 py-4 min-w-[150px]">Mức độ hoàn thành</th>
                  <th className="px-3 py-4 min-w-[180px]">Quá trình hoạt động</th>
                  <th className="px-3 py-4 min-w-[180px]">Nhận xét của giáo viên</th>
                  <th className="px-3 py-4 min-w-[180px]">Minh chứng cá nhân</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, idx) => {
                  const isSelected = selectedIds.has(student.id);
                  return (
                    <tr key={student.id} className={`transition-colors ${isSelected ? 'bg-teal-50/20' : 'hover:bg-slate-50/50'}`}>
                      {!isConfirmed && (
                        <td className="pl-5 pr-2 py-3.5">
                          <input 
                            type="checkbox" 
                            checked={isSelected} 
                            onChange={() => toggleStudent(student.id)} 
                            className="w-4 h-4 rounded border-slate-300 text-teal-600 cursor-pointer focus:ring-teal-500" 
                          />
                        </td>
                      )}
                      <td className="px-3 py-3.5 text-xs font-bold text-slate-400">{idx + 1}</td>
                      
                      <td className="px-3 py-3.5">
                        <div>
                          <div className="font-extrabold text-slate-800 text-xs leading-tight">{student.name}</div>
                          <div className="text-[10px] text-slate-400 mt-1 font-bold flex items-center gap-1.5 flex-wrap">
                            <span>{student.code}</span>
                            {student.class && <span className="text-slate-200">•</span>}
                            <span>{student.class}</span>
                            {student.gender && (
                              <span className="text-slate-400">({student.gender === 'male' ? 'Nam' : 'Nữ'})</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Dropdown: Vai trò */}
                      <td className="px-3 py-3.5">
                        <div className="relative">
                          <select 
                            value={student.roleId || ''} 
                            disabled={isConfirmed}
                            onChange={e => handleChange(student.id, 'roleId', e.target.value)}
                            className={getSelectClass(student.roleId, isConfirmed)}
                          >
                            <option value="">-- Chọn vai trò --</option>
                            {categories.role.map(c => <option key={c.id} value={c.code}>{c.name}</option>)}
                          </select>
                          {!isConfirmed && <SelectArrow />}
                        </div>
                      </td>

                      {/* Dropdown: Mức hoàn thành */}
                      <td className="px-3 py-3.5">
                        <div className="relative">
                          <select 
                            value={student.evalLevelId || ''} 
                            disabled={isConfirmed}
                            onChange={e => handleChange(student.id, 'evalLevelId', e.target.value)}
                            className={getSelectClass(student.evalLevelId, isConfirmed)}
                          >
                            <option value="">-- Chọn mức --</option>
                            {categories.result.map(c => <option key={c.id} value={c.code}>{c.name}</option>)}
                          </select>
                          {!isConfirmed && <SelectArrow />}
                        </div>
                      </td>

                      {/* Custom Input: Quá trình */}
                      <td className="px-3 py-3.5">
                        <input 
                          type="text" 
                          placeholder="Ví dụ: Tích cực lắp ráp mô hình..." 
                          disabled={isConfirmed}
                          value={getCustomValue(student.note, 'process')} 
                          onChange={e => handleChange(student.id, 'process', e.target.value, true)}
                          className={getInputClass(isConfirmed)}
                        />
                      </td>

                      {/* Custom Input: Nhận xét */}
                      <td className="px-3 py-3.5">
                        <input 
                          type="text" 
                          placeholder="Nhập nhận xét..." 
                          disabled={isConfirmed}
                          value={getCustomValue(student.note, 'comment')} 
                          onChange={e => handleChange(student.id, 'comment', e.target.value, true)}
                          className={getInputClass(isConfirmed)}
                        />
                      </td>

                      {/* Custom Input: Minh chứng cá nhân */}
                      <td className="px-3 py-3.5">
                        <div className="relative">
                          <LinkIcon className="w-3.5 h-3.5 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input 
                            type="text" 
                            placeholder="Nhập link drive / ảnh..." 
                            disabled={isConfirmed}
                            value={getCustomValue(student.note, 'evidence')} 
                            onChange={e => handleChange(student.id, 'evidence', e.target.value, true)}
                            className={getInputClass(isConfirmed) + " pl-8"}
                          />
                        </div>
                      </td>

                    </tr>
                  );
                })}
                
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-16 text-center">
                      <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 font-bold text-xs">{search ? 'Không tìm thấy học sinh phù hợp' : 'Không có học sinh nào tham gia hoạt động.'}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {students.length > 0 && (
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-400 font-bold">
              <span>Tổng lượt: <strong className="text-slate-700">{students.length}</strong> học sinh</span>
              {selectedIds.size > 0 && <span className="text-teal-700">Đang chọn: {selectedIds.size} học sinh</span>}
            </div>
          )}
        </div>

      </div>

      {/* MODAL: EDIT ACTIVITY HEADER */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Hiệu chỉnh Chi tiết hoạt động</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Tên hoạt động / Tên dự án</label>
                <input 
                  type="text" 
                  value={editData.name} 
                  onChange={e => setEditData({ ...editData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-3 outline-none focus:border-teal-500" 
                  placeholder="Nhập tên hoạt động..." 
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Ngày tổ chức</label>
                <input 
                  type="date" 
                  value={editData.date} 
                  onChange={e => setEditData({ ...editData, date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-850 text-xs font-semibold rounded-xl p-3 outline-none focus:border-teal-500" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Mục tiêu năng lực</label>
                <textarea 
                  rows={2}
                  value={editData.objectives} 
                  onChange={e => setEditData({ ...editData, objectives: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-850 text-xs font-semibold rounded-xl p-3 outline-none focus:border-teal-500" 
                  placeholder="Mục tiêu hoạt động..." 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Nhiệm vụ học tập</label>
                <textarea 
                  rows={2}
                  value={editData.tasks} 
                  onChange={e => setEditData({ ...editData, tasks: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-855 text-xs font-semibold rounded-xl p-3 outline-none focus:border-teal-500" 
                  placeholder="Nhiệm vụ học tập..." 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Tiêu chí đánh giá</label>
                <textarea 
                  rows={2}
                  value={editData.criteria} 
                  onChange={e => setEditData({ ...editData, criteria: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-855 text-xs font-semibold rounded-xl p-3 outline-none focus:border-teal-500" 
                  placeholder="Tiêu chí đánh giá..." 
                />
              </div>

              {/* Edit Co-teachers */}
              <div className="space-y-1 relative">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Giáo viên phối hợp</label>
                <div className="flex flex-wrap gap-1 bg-slate-50 p-2 border border-slate-200 rounded-xl min-h-[36px]">
                  {selectedCoTeachers.map(tName => (
                    <span key={tName} className="inline-flex items-center gap-0.5 bg-teal-50 text-teal-700 border border-teal-150 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                      {tName}
                      <button type="button" onClick={() => toggleCoTeacher(tName)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                
                <input
                  type="text"
                  placeholder="Tìm giáo viên phối hợp..."
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg p-2.5 outline-none mt-2 focus:border-teal-500"
                  value={coTeacherSearch}
                  onChange={e => {
                    setCoTeacherSearch(e.target.value);
                    setShowCoTeacherDropdown(true);
                  }}
                  onFocus={() => setShowCoTeacherDropdown(true)}
                />

                {showCoTeacherDropdown && (
                  <div className="absolute z-30 left-0 right-0 mt-1 max-h-36 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2">
                    {filteredTeachers.map(t => {
                      const isSel = selectedCoTeachers.includes(t.teacherName);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleCoTeacher(t.teacherName)}
                          className={"w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between " + (isSel ? 'bg-teal-50 text-teal-755' : 'hover:bg-slate-50 text-slate-600')}
                        >
                          <span>{t.teacherName}</span>
                          {isSel && <CheckSquare className="w-3.5 h-3.5 text-teal-600" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2.5 bg-slate-50/50">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl text-xs">Hủy bỏ</button>
              <button onClick={handleUpdateActivity} disabled={saving} className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl text-xs shadow-sm flex items-center gap-1.5">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Cập nhật thông tin
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
